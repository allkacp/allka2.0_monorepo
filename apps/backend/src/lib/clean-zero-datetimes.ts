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
      // Tudo dentro de UMA transação: garante que o `SET sql_mode` (session-
      // scoped) e as UPDATEs seguintes rodem na MESMA conexão física do pool.
      // Sem isso, o Prisma podia despachar cada $executeRawUnsafe pra uma
      // conexão diferente — o SET "vazava" pra conexão errada e a limpeza
      // falhava silenciosamente com o mesmo erro 1292 que ela tentava corrigir.
      await client.$transaction(
        async (tx) => {
          await tx.$executeRawUnsafe(
            "SET sql_mode = (SELECT REPLACE(REPLACE(@@sql_mode, 'NO_ZERO_IN_DATE,', ''), 'NO_ZERO_DATE,', ''))",
          );
          const dbRows = await tx.$queryRawUnsafe<{ db: string }[]>(
            "SELECT DATABASE() AS db",
          );
          const dbName = dbRows[0]?.db;
          if (!dbName) return;
          const cols = await tx.$queryRawUnsafe<
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
              // Compara via CAST(...AS CHAR) em vez do literal
              // '0000-00-00 00:00:00' direto — evita que o MySQL precise
              // interpretar o literal como DATETIME (o que por si só dispara
              // o erro 1292 em modo estrito, mesmo antes de tocar na coluna).
              const affected = await tx.$executeRawUnsafe(
                `UPDATE \`${c.TABLE_NAME}\` SET \`${c.COLUMN_NAME}\` = ${replacement}
                  WHERE CAST(\`${c.COLUMN_NAME}\` AS CHAR) IN ('0000-00-00 00:00:00', '0000-00-00')`,
              );
              if (affected > 0) {
                fixed += affected;
                console.log(
                  `  🧹 zero-date fix: ${c.TABLE_NAME}.${c.COLUMN_NAME} → ${affected} row(s)`,
                );
              }
            } catch (colErr) {
              // Visível no log (não engolido) — requisito explícito: não
              // esconder erros importantes, mesmo que por coluna.
              console.warn(
                `  ⚠️  zero-date fix falhou em ${c.TABLE_NAME}.${c.COLUMN_NAME}:`,
                (colErr as Error).message,
              );
            }
          }
        },
        { timeout: 30_000, maxWait: 10_000 },
      );
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
