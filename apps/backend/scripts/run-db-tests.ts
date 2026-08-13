import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import path from "node:path";
import { URL, fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

// Mirrors allka-roadmap/apps/backend/scripts/run-integration.ts: creates a
// disposable, uniquely-named database, points DATABASE_URL/TEST_DATABASE_URL
// at it, applies migrations, runs the given test files with node's built-in
// test runner (this repo has no other test framework wired into its
// backend), and drops the database afterward no matter how the run ends.
// The real local dev database ("allka") is never touched.

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const backendRoot = path.resolve(__dirname, "..");

type AdminDatabaseConfig = {
  user: string;
  password: string;
  host: string;
  port: number;
};

function parseAdminDatabaseUrl(raw: string | undefined): AdminDatabaseConfig {
  if (!raw) {
    throw new Error("TEST_DATABASE_ADMIN_URL is required for database tests.");
  }
  const url = new URL(raw);
  const dbName = url.pathname.replace(/^\//, "");
  const hasTestMarker = /(?:^|_)(?:test|ci)(?:_|$)/.test(dbName);
  if (!dbName || !hasTestMarker) {
    throw new Error(
      `TEST_DATABASE_ADMIN_URL must point to a disposable test database with a _test or _ci marker. Received: ${dbName}`,
    );
  }
  if (!["localhost", "127.0.0.1", "::1"].includes(url.hostname)) {
    throw new Error(
      `TEST_DATABASE_ADMIN_URL host must be local only. Received: ${url.hostname}`,
    );
  }
  return {
    user: decodeURIComponent(url.username || "root"),
    password: decodeURIComponent(url.password || ""),
    host: url.hostname,
    port: Number(url.port || 3306),
  };
}

function run(command: string, args: string[], env: NodeJS.ProcessEnv, cwd: string) {
  execFileSync(command, args, { cwd, env, stdio: "inherit" });
}

async function createDatabase(databaseName: string, config: AdminDatabaseConfig) {
  const connection = await mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
  });
  try {
    await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\`;`);
  } finally {
    await connection.end();
  }
}

async function dropDatabase(databaseName: string, config: AdminDatabaseConfig) {
  const connection = await mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
  });
  try {
    await connection.execute(`DROP DATABASE IF EXISTS \`${databaseName}\`;`);
    const [rows] = await connection.query<any[]>(
      "SELECT COUNT(*) AS count FROM information_schema.schemata WHERE schema_name = ?",
      [databaseName],
    );
    if (Number((rows[0] as { count?: number }).count ?? 0) !== 0) {
      throw new Error("Cleanup failed to remove the disposable test database.");
    }
  } finally {
    await connection.end();
  }
}

async function main() {
  const testFiles = process.argv.slice(2);
  if (testFiles.length === 0) {
    throw new Error("Usage: tsx scripts/run-db-tests.ts <test-file> [more test files...]");
  }

  const testDatabaseUrl = process.env.TEST_DATABASE_URL;
  if (!testDatabaseUrl) {
    throw new Error("TEST_DATABASE_URL is required for database tests.");
  }

  const url = new URL(testDatabaseUrl);
  const baseName = url.pathname
    .replace(/^\//, "")
    .replace(/(?:_test|_ci)(?:_[A-Za-z0-9]+)?$/, "");
  const suffix = `${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  const databaseName = `${baseName}_test_${suffix}`;
  const tempUrl = new URL(url.toString());
  tempUrl.pathname = `/${databaseName}`;
  const config = parseAdminDatabaseUrl(process.env.TEST_DATABASE_ADMIN_URL ?? testDatabaseUrl);

  await createDatabase(databaseName, config);

  const childEnv: NodeJS.ProcessEnv = {
    ...process.env,
    DATABASE_URL: tempUrl.toString(),
    TEST_DATABASE_URL: tempUrl.toString(),
  };

  try {
    // db push (not migrate deploy) on purpose: this repo's very first
    // migration (prisma/migrations/0_baseline/migration.sql) carries a
    // UTF-8 BOM byte at the top of the file, which MySQL rejects as a
    // syntax error when the SQL is actually executed from scratch — that
    // migration was originally introduced via `migrate resolve --applied`
    // against an already-existing real database, so this bug had never
    // been exercised before. Editing that file isn't safe here: its
    // checksum is already recorded as applied in the real local dev
    // database's _prisma_migrations table, and changing the file would
    // make a future `migrate deploy` against that real database fail on a
    // checksum mismatch. db push sidesteps the whole migration-history
    // chain for this disposable database — it just syncs the current
    // schema.prisma shape directly, which is all a throwaway test database
    // needs.
    run(
      process.execPath,
      [
        path.resolve(repoRoot, "node_modules", "prisma", "build", "index.js"),
        "db",
        "push",
        "--skip-generate",
        "--accept-data-loss",
        "--schema",
        "apps/backend/prisma/schema.prisma",
      ],
      childEnv,
      repoRoot,
    );

    run(
      process.execPath,
      ["--import", "tsx", "--test", ...testFiles.map((f) => path.resolve(backendRoot, f))],
      childEnv,
      backendRoot,
    );
  } finally {
    await dropDatabase(databaseName, config);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
