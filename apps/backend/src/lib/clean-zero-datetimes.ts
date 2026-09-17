/**
 * Cleans MySQL zero-date rows (`0000-00-00 00:00:00`) that Prisma cannot read.
 * Idempotent. Safe to call multiple times. No-op on non-MySQL databases.
 *
 * Única implementação desta lógica no backend — antes existia triplicada
 * (aqui, no middleware de src/lib/prisma.ts, e no script avulso
 * src/scripts/fix-zero-datetimes.ts), cada uma com seu próprio cooldown
 * independente mesmo operando no mesmo banco. Recebe o client por parâmetro
 * (em vez de importar o singleton `prisma` daqui) de propósito: isso é o que
 * permite o middleware em prisma.ts chamar esta função sem criar um import
 * circular (prisma.ts → clean-zero-datetimes.ts → prisma.ts).
 */
import type { PrismaClient } from "@prisma/client";

let cleanupInFlight: Promise<number> | null = null;
let lastCleanupAt = 0;
const COOLDOWN_MS = 60_000;

export async function cleanZeroDatetimes(
  client: PrismaClient,
  force = false,
): Promise<number> {
  const dbUrl = process.env.DATABASE_URL ?? "";
  if (!dbUrl.startsWith("mysql")) return 0;

  if (!force && Date.now() - lastCleanupAt < COOLDOWN_MS) return 0;
  if (cleanupInFlight) return cleanupInFlight;

  cleanupInFlight = (async () => {
    try {
      let fixed = 0;

      // Item 17 (continuação da publicação, 2026-09-17) — achado real em
      // produção: a versão anterior rodava TUDO (a listagem de colunas e o
      // UPDATE de CADA UMA) dentro de UMA ÚNICA transação interativa com
      // limite de 30s. Contra o banco de desenvolvimento local (poucas
      // tabelas, poucas linhas) isso sempre coube no limite; contra o banco
      // REAL de produção — 174 tabelas depois desta entrega, com volume de
      // linha real — a SOMA de todas as colunas passou de 88s, e o Prisma
      // encerra a transação inteira aos 30s: tudo que ainda não tinha
      // rodado (inclusive UPDATEs em tabelas sem nenhuma linha zerada)
      // falhava com "Transaction already closed", derrubando o boot do
      // servidor inteiro (a chamada em index.ts é aguardada antes de
      // `app.listen`).
      //
      // Correção: descobrir as colunas é só leitura, sem risco real de
      // timeout (information_schema é rápido independente do volume de
      // dado nas tabelas do usuário) — fica FORA de qualquer transação.
      // Cada coluna ganha sua PRÓPRIA transação curta (SET sql_mode +
      // UPDATE, na mesma conexão física — preserva a garantia original que
      // motivou usar transação aqui) com seu PRÓPRIO limite de 30s. Uma
      // tabela grande/lenta/travada estoura sozinha (log, segue pra
      // próxima) — nunca mais um limite ACUMULADO cobrindo o banco
      // inteiro, então o número de tabelas/colunas deixa de importar pra
      // esse limite. A finalidade (corrigir zero-dates, idempotente,
      // visível no log) é idêntica à versão anterior — só a fronteira da
      // transação mudou.
      const dbRows = await client.$queryRawUnsafe<{ db: string }[]>(
        "SELECT DATABASE() AS db",
      );
      const dbName = dbRows[0]?.db;
      if (dbName) {
        const cols = await client.$queryRawUnsafe<
          { TABLE_NAME: string; COLUMN_NAME: string; IS_NULLABLE: string }[]
        >(
          `SELECT TABLE_NAME, COLUMN_NAME, IS_NULLABLE
             FROM information_schema.columns
            WHERE TABLE_SCHEMA = ?
              AND DATA_TYPE IN ('datetime','timestamp','date')`,
          dbName,
        );
        for (const c of cols) {
          const replacement =
            c.IS_NULLABLE === "YES" ? "NULL" : "'1970-01-01 00:00:00'";
          try {
            const affected = await client.$transaction(
              async (tx) => {
                await tx.$executeRawUnsafe(
                  "SET sql_mode = (SELECT REPLACE(REPLACE(@@sql_mode, 'NO_ZERO_IN_DATE,', ''), 'NO_ZERO_DATE,', ''))",
                );
                // Compara via CAST(...AS CHAR) em vez do literal
                // '0000-00-00 00:00:00' direto — evita que o MySQL precise
                // interpretar o literal como DATETIME (o que por si só
                // dispara o erro 1292 em modo estrito, mesmo antes de tocar
                // na coluna).
                //
                // Item 17 (continuação da publicação, 2026-09-17) — achado
                // real, SEPARADO do timeout: `CAST(col AS CHAR)` numa
                // coluna `datetime(3)` (o tipo que toda `DateTime` do
                // Prisma usa, a maioria das colunas datetime deste banco)
                // devolve "0000-00-00 00:00:00.000" — COM os 3 dígitos
                // fracionários. A comparação exata `IN ('0000-00-00
                // 00:00:00', '0000-00-00')` NUNCA batia com isso — ou seja,
                // esta função, do jeito que estava, rodava a varredura
                // inteira (é isso que consumia o tempo) mas nunca corrigia
                // de fato nenhuma coluna `datetime(3)` zerada, só
                // `datetime`/`date` sem precisão fracionária (bem mais
                // raras aqui). `LIKE '0000-00-00%'` casa com qualquer
                // precisão fracionária (ou nenhuma) — corrige a finalidade
                // real da função, não só a transação.
                return tx.$executeRawUnsafe(
                  `UPDATE \`${c.TABLE_NAME}\` SET \`${c.COLUMN_NAME}\` = ${replacement}
                    WHERE CAST(\`${c.COLUMN_NAME}\` AS CHAR) LIKE '0000-00-00%'`,
                );
              },
              { timeout: 30_000, maxWait: 10_000 },
            );
            if (affected > 0) {
              fixed += affected;
              console.log(
                `  🧹 zero-date fix: ${c.TABLE_NAME}.${c.COLUMN_NAME} → ${affected} row(s)`,
              );
            }
          } catch (colErr) {
            // Visível no log (não engolido) — requisito explícito: não
            // esconder erros importantes, mesmo que por coluna. Uma coluna
            // falhando (timeout, lock, o que for) nunca impede as demais —
            // essa é exatamente a propriedade que faltava antes.
            console.warn(
              `  ⚠️  zero-date fix falhou em ${c.TABLE_NAME}.${c.COLUMN_NAME}:`,
              (colErr as Error).message,
            );
          }
        }
      }
      lastCleanupAt = Date.now();
      return fixed;
    } catch (err) {
      console.warn(
        "⚠️  cleanZeroDatetimes failed:",
        (err as Error).message,
      );
      return 0;
    } finally {
      cleanupInFlight = null;
    }
  })();

  return cleanupInFlight;
}

/**
 * Detects whether an error is the Prisma "zero date out of range" error.
 */
export function isZeroDateError(err: unknown): boolean {
  const msg = (err as Error)?.message ?? "";
  return (
    msg.includes("Value out of range for the type") &&
    msg.includes("day or month set to zero")
  );
}

/**
 * Runs a Prisma operation; if it fails with the zero-date error, cleans the
 * data (using `client`) and retries once. Otherwise re-throws.
 */
export async function withZeroDateRecovery<T>(
  client: PrismaClient,
  op: () => Promise<T>,
): Promise<T> {
  try {
    return await op();
  } catch (err) {
    if (!isZeroDateError(err)) throw err;
    console.warn("⚠️  Zero-date detected in query result. Running cleanup...");
    await cleanZeroDatetimes(client, true);
    return await op();
  }
}
