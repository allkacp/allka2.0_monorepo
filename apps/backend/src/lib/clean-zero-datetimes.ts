/**
 * Cleans MySQL zero-date rows (`0000-00-00 00:00:00`) that Prisma cannot read.
 * Idempotent. Safe to call multiple times. No-op on non-MySQL databases.
 */
import { prisma } from "./prisma";

let cleanupInFlight: Promise<number> | null = null;
let lastCleanupAt = 0;
const COOLDOWN_MS = 60_000;

export async function cleanZeroDatetimes(force = false): Promise<number> {
  const dbUrl = process.env.DATABASE_URL ?? "";
  if (!dbUrl.startsWith("mysql")) return 0;

  if (!force && Date.now() - lastCleanupAt < COOLDOWN_MS) return 0;
  if (cleanupInFlight) return cleanupInFlight;

  cleanupInFlight = (async () => {
    try {
      await prisma.$executeRawUnsafe(
        "SET sql_mode = (SELECT REPLACE(REPLACE(@@sql_mode, 'NO_ZERO_IN_DATE,', ''), 'NO_ZERO_DATE,', ''))",
      );
      const dbRows = await prisma.$queryRawUnsafe<{ db: string }[]>(
        "SELECT DATABASE() AS db",
      );
      const dbName = dbRows[0]?.db;
      if (!dbName) return 0;
      const cols = await prisma.$queryRawUnsafe<
        { TABLE_NAME: string; COLUMN_NAME: string; IS_NULLABLE: string }[]
      >(
        `SELECT TABLE_NAME, COLUMN_NAME, IS_NULLABLE
           FROM information_schema.columns
          WHERE TABLE_SCHEMA = ?
            AND DATA_TYPE IN ('datetime','timestamp','date')`,
        dbName,
      );
      let fixed = 0;
      for (const c of cols) {
        const replacement =
          c.IS_NULLABLE === "YES" ? "NULL" : "'1970-01-01 00:00:00'";
        try {
          const affected = await prisma.$executeRawUnsafe(
            `UPDATE \`${c.TABLE_NAME}\` SET \`${c.COLUMN_NAME}\` = ${replacement}
              WHERE \`${c.COLUMN_NAME}\` = '0000-00-00 00:00:00'
                 OR \`${c.COLUMN_NAME}\` = '0000-00-00'`,
          );
          if (affected > 0) {
            fixed += affected;
            console.log(
              `  🧹 zero-date fix: ${c.TABLE_NAME}.${c.COLUMN_NAME} → ${affected} row(s)`,
            );
          }
        } catch {
          /* ignore individual column failures */
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
 * data and retries once. Otherwise re-throws.
 */
export async function withZeroDateRecovery<T>(op: () => Promise<T>): Promise<T> {
  try {
    return await op();
  } catch (err) {
    if (!isZeroDateError(err)) throw err;
    console.warn("⚠️  Zero-date detected in query result. Running cleanup...");
    await cleanZeroDatetimes(true);
    return await op();
  }
}
