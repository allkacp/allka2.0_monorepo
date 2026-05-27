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
  // Make this session tolerant of zero dates while we read/write.
  await prisma.$executeRawUnsafe(
    "SET sql_mode = (SELECT REPLACE(REPLACE(@@sql_mode, 'NO_ZERO_IN_DATE,', ''), 'NO_ZERO_DATE,', ''))",
  );

  const dbRows = await prisma.$queryRawUnsafe<{ db: string }[]>(
    "SELECT DATABASE() AS db",
  );
  const dbName = dbRows[0]?.db;
  if (!dbName) throw new Error("Could not resolve current database name.");

  console.log(`[fix-zero-datetimes] target database: ${dbName}`);

  const cols = await prisma.$queryRawUnsafe<
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

  let totalFixed = 0;
  for (const c of cols) {
    const replacement =
      c.IS_NULLABLE === "YES" ? "NULL" : "'1970-01-01 00:00:00'";
    const sql = `UPDATE \`${c.TABLE_NAME}\`
                    SET \`${c.COLUMN_NAME}\` = ${replacement}
                  WHERE \`${c.COLUMN_NAME}\` = '0000-00-00 00:00:00'
                     OR \`${c.COLUMN_NAME}\` = '0000-00-00'`;
    try {
      const affected = await prisma.$executeRawUnsafe(sql);
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

  console.log(`\n[fix-zero-datetimes] done. Total rows fixed: ${totalFixed}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
