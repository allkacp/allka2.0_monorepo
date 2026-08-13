import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { requireTestDatabaseUrl } from "./require-test-database.js";

function withUrl(url: string | undefined) {
  if (url === undefined) delete process.env.TEST_DATABASE_URL;
  else process.env.TEST_DATABASE_URL = url;
  delete process.env.DATABASE_URL;
}

describe("requireTestDatabaseUrl", () => {
  beforeEach(() => {
    delete process.env.TEST_DATABASE_URL;
    delete process.env.DATABASE_URL;
  });

  afterEach(() => {
    delete process.env.TEST_DATABASE_URL;
    delete process.env.DATABASE_URL;
  });

  it("throws when no URL is set at all", () => {
    assert.throws(() => requireTestDatabaseUrl(), /required/i);
  });

  it("accepts a disposable database with a _test marker", () => {
    withUrl("mysql://root:pass@localhost:3306/allka_test_1699999999_ab12");
    assert.match(requireTestDatabaseUrl(), /_test_/);
  });

  it("accepts a disposable database with a _ci marker plus a disambiguating suffix", () => {
    withUrl("mysql://root:pass@127.0.0.1:3306/allka_ci_12345");
    assert.ok(requireTestDatabaseUrl());
  });

  it("rejects the bare allka_ci name (looks like a permanent CI database, not a disposable one)", () => {
    withUrl("mysql://root:pass@127.0.0.1:3306/allka_ci");
    assert.throws(() => requireTestDatabaseUrl());
  });

  it("rejects the real local dev database name outright", () => {
    withUrl("mysql://allka:pass@localhost:3306/allka");
    assert.throws(() => requireTestDatabaseUrl(), /_test or _ci marker/i);
  });

  it("rejects production/QA-looking names even if someone appended a marker incorrectly", () => {
    withUrl("mysql://root:pass@localhost:3306/allka_production");
    assert.throws(() => requireTestDatabaseUrl());
  });

  it("rejects a non-local host even with a valid-looking test database name", () => {
    withUrl("mysql://root:pass@db.internal.example.com:3306/allka_test_1");
    assert.throws(() => requireTestDatabaseUrl(), /local only/i);
  });

  it("falls back to DATABASE_URL only when TEST_DATABASE_URL is absent", () => {
    delete process.env.TEST_DATABASE_URL;
    process.env.DATABASE_URL = "mysql://root:pass@localhost:3306/allka_test_fallback";
    assert.match(requireTestDatabaseUrl(), /_test_fallback/);
  });
});
