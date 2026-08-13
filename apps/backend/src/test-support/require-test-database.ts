import { URL } from "node:url";

/**
 * Every test that touches a real database must call this before doing
 * anything else. It throws instead of returning whenever the target isn't
 * unambiguously a disposable, local, throwaway database — this is the one
 * gate standing between a test suite and accidentally running destructive
 * setup/teardown against the real local dev database (or, if someone
 * fat-fingers an env var, QA or production).
 *
 * Mirrors allka-roadmap's apps/backend/src/test-support/require-test-database.ts
 * (same shape, denylist adapted to this repo's real database name: "allka").
 */
export function requireTestDatabaseUrl(): string {
  const raw = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!raw) {
    throw new Error("TEST_DATABASE_URL is required for tests that touch a real database.");
  }

  const url = new URL(raw);
  const dbName = url.pathname.replace(/^\//, "");
  const hasTestMarker = /(?:^|_)(?:test|ci)(?:_|$)/.test(dbName);

  if (!hasTestMarker) {
    throw new Error(
      `TEST_DATABASE_URL must target a disposable test database with a _test or _ci marker. Received: ${dbName}`,
    );
  }

  if (!["localhost", "127.0.0.1", "::1"].includes(url.hostname)) {
    throw new Error(
      `TEST_DATABASE_URL host must be local only. Received: ${url.hostname}`,
    );
  }

  const forbiddenExact = new Set([
    "allka",
    "allka_roadmap",
    "allka_2026",
    "allka_platform",
  ]);
  const forbiddenPatterns = [
    /^allka(?:_roadmap|_2026|_platform)?_(?:prod|production|qa|dev|development)$/i,
    /^allka(?:_roadmap|_2026|_platform)?_ci$/i,
  ];

  if (
    forbiddenExact.has(dbName) ||
    forbiddenPatterns.some((pattern) => pattern.test(dbName))
  ) {
    throw new Error(
      "TEST_DATABASE_URL cannot target the production or main Allka database names.",
    );
  }

  return raw;
}
