/**
 * Fix invalid '0000-00-00' datetimes in MySQL.
 *
 * Prisma's MySQL driver throws "Value out of range for the type. The column ...
 * contained an invalid datetime value with either day or month set to zero."
 * when it encounters '0000-00-00 00:00:00' values (legacy MySQL behavior).
 *
 * This script scans ALL DATETIME columns across ALL tables in the current
 * database and converts zero-dates to NULL (when the column is nullable) or
 * to '1970-01-01 00:00:00' (when NOT NULL).
 *
 * Run:
 *   npx tsx apps/backend/src/scripts/fix-zero-datetimes.ts
 *   # or (from apps/backend): npx tsx src/scripts/fix-zero-datetimes.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  let totalFixed = 0;
  let dbName = "";

  // Tudo numa transação: garante que o `SET sql_mode` (session-scoped) e as
  // UPDATEs seguintes rodem na MESMA conexão do pool. Sem isso, cada
  // $executeRawUnsafe podia ir pra uma conexão diferente e o SET não tinha
  // efeito nas UPDATEs — mesmo bug corrigido em src/lib/prisma.ts e
  // src/lib/clean-zero-datetimes.ts.
  await prisma.$transaction(
    async (tx) => {
      // Make this session tolerant of zero dates while we read/write.
      await tx.$executeRawUnsafe(
        "SET sql_mode = (SELECT REPLACE(REPLACE(@@sql_mode, 'NO_ZERO_IN_DATE,', ''), 'NO_ZERO_DATE,', ''))",
      );

      const dbRows = await tx.$queryRawUnsafe<{ db: string }[]>(
        "SELECT DATABASE() AS db",
      );
      dbName = dbRows[0]?.db ?? "";
      if (!dbName) throw new Error("Could not resolve current database name.");

      console.log(`[fix-zero-datetimes] target database: ${dbName}`);

      const cols = await tx.$queryRawUnsafe<
        {
          TABLE_NAME: string;
          COLUMN_NAME: string;
          IS_NULLABLE: string;
          DATA_TYPE: string;
        }[]
      >(
        `SELECT TABLE_NAME, COLUMN_NAME, IS_NULLABLE, DATA_TYPE
           FROM information_schema.columns
          WHERE TABLE_SCHEMA = ?
            AND DATA_TYPE IN ('datetime','timestamp','date')`,
        dbName,
      );

      for (const c of cols) {
        const replacement =
          c.IS_NULLABLE === "YES" ? "NULL" : "'1970-01-01 00:00:00'";
        // CAST(...AS CHAR): compara como string, evitando que o MySQL
        // precise interpretar o literal '0000-00-00...' como DATETIME (o
        // que sozinho dispara o erro 1292 em modo estrito).
        const sql = `UPDATE \`${c.TABLE_NAME}\`
                        SET \`${c.COLUMN_NAME}\` = ${replacement}
                      WHERE CAST(\`${c.COLUMN_NAME}\` AS CHAR) IN ('0000-00-00 00:00:00', '0000-00-00')`;
        try {
          const affected = await tx.$executeRawUnsafe(sql);
          if (affected > 0) {
            totalFixed += affected;
            console.log(
              `  ✔ ${c.TABLE_NAME}.${c.COLUMN_NAME} (${c.DATA_TYPE}, nullable=${c.IS_NULLABLE}) → ${affected} row(s) fixed`,
            );
          }
        } catch (err) {
          console.error(
            `  ✘ ${c.TABLE_NAME}.${c.COLUMN_NAME}:`,
            (err as Error).message,
          );
        }
      }
    },
    { timeout: 60_000, maxWait: 10_000 },
  );

  console.log(`\n[fix-zero-datetimes] done. Total rows fixed: ${totalFixed}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
