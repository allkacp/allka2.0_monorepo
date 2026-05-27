import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient;
  zeroDateCleanupRunning: boolean;
  zeroDateCleanedAt: number;
};

function isZeroDateError(err: unknown): boolean {
  const msg = (err as Error)?.message ?? "";
  return (
    msg.includes("Value out of range for the type") &&
    msg.includes("day or month set to zero")
  );
}

async function runZeroDateCleanup(client: PrismaClient): Promise<void> {
  if (globalForPrisma.zeroDateCleanupRunning) return;
  const now = Date.now();
  if (now - (globalForPrisma.zeroDateCleanedAt ?? 0) < 60_000) return;
  globalForPrisma.zeroDateCleanupRunning = true;
  try {
    await client.$executeRawUnsafe(
      "SET sql_mode = (SELECT REPLACE(REPLACE(@@sql_mode, 'NO_ZERO_IN_DATE,', ''), 'NO_ZERO_DATE,', ''))",
    );
    const dbRows = await client.$queryRawUnsafe<{ db: string }[]>(
      "SELECT DATABASE() AS db",
    );
    const dbName = dbRows[0]?.db;
    if (!dbName) return;
    const cols = await client.$queryRawUnsafe<
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
      const val = c.IS_NULLABLE === "YES" ? "NULL" : "'1970-01-01 00:00:00'";
      try {
        const n = await client.$executeRawUnsafe(
          `UPDATE \`${c.TABLE_NAME}\` SET \`${c.COLUMN_NAME}\` = ${val}
            WHERE \`${c.COLUMN_NAME}\` = '0000-00-00 00:00:00'
               OR \`${c.COLUMN_NAME}\` = '0000-00-00'`,
        );
        if (n > 0) {
          fixed += n;
          console.log(`  🧹 zero-date fix: ${c.TABLE_NAME}.${c.COLUMN_NAME} → ${n} row(s)`);
        }
      } catch { /* ignore per-column errors */ }
    }
    globalForPrisma.zeroDateCleanedAt = Date.now();
    if (fixed > 0) console.log(`✅ Zero-date cleanup: ${fixed} linhas corrigidas.`);
  } catch (err) {
    console.warn("⚠️  Zero-date cleanup failed:", (err as Error).message);
  } finally {
    globalForPrisma.zeroDateCleanupRunning = false;
  }
}

const dbUrl = process.env.DATABASE_URL ?? "";
const isMySQL = dbUrl.startsWith("mysql");

const client = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
});

// Global middleware: catch zero-date errors from ANY query, fix DB, retry once
if (isMySQL) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (client as any).$use(
    async (
      params: { model?: string; action: string; args: unknown; dataPath: string[]; runInTransaction: boolean },
      next: (params: unknown) => Promise<unknown>,
    ) => {
      try {
        return await next(params);
      } catch (err) {
        if (!isZeroDateError(err)) throw err;
        console.warn(`⚠️  Zero-date error on ${params.model}.${params.action} — cleaning up…`);
        await runZeroDateCleanup(client);
        return await next(params); // retry once after cleanup
      }
    },
  );
}

export const prisma: PrismaClient = client;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = client;
}

