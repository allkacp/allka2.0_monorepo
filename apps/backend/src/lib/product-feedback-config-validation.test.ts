import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { envSchema } from "../config";

// The base fields every parse needs regardless of the product-feedback
// block under test.
const baseEnv = {
  DATABASE_URL: "mysql://user:pass@localhost:3306/db",
  JWT_SECRET: "a-secret-that-is-long-enough",
};

const validRoadmapBlock = {
  PRODUCT_FEEDBACK_ENABLED: "true",
  PRODUCT_FEEDBACK_ENVIRONMENT: "local",
  ROADMAP_API_URL: "http://localhost:3002",
  ROADMAP_HMAC_KEY_ID: "local-dev-key",
  ROADMAP_HMAC_SECRET: "a".repeat(32), // exactly 32 bytes
};

describe("config.ts envSchema — product-feedback cross-field validation", () => {
  it("allows the integration to stay fully off with nothing configured", () => {
    const result = envSchema.safeParse({ ...baseEnv, PRODUCT_FEEDBACK_ENABLED: "false" });
    assert.equal(result.success, true);
  });

  it("accepts a fully valid enabled configuration", () => {
    const result = envSchema.safeParse({ ...baseEnv, ...validRoadmapBlock });
    assert.equal(result.success, true);
  });

  it("refuses to boot when enabled but PRODUCT_FEEDBACK_ENVIRONMENT is missing", () => {
    const { PRODUCT_FEEDBACK_ENVIRONMENT: _drop, ...rest } = validRoadmapBlock;
    const result = envSchema.safeParse({ ...baseEnv, ...rest });
    assert.equal(result.success, false);
    if (!result.success) {
      assert.ok(result.error.issues.some((issue) => issue.path.includes("PRODUCT_FEEDBACK_ENVIRONMENT")));
    }
  });

  it("refuses an invalid PRODUCT_FEEDBACK_ENVIRONMENT value (never silently falls back)", () => {
    const result = envSchema.safeParse({ ...baseEnv, ...validRoadmapBlock, PRODUCT_FEEDBACK_ENVIRONMENT: "homolog" });
    assert.equal(result.success, false);
  });

  it("refuses to boot when ROADMAP_API_URL is missing", () => {
    const { ROADMAP_API_URL: _drop, ...rest } = validRoadmapBlock;
    const result = envSchema.safeParse({ ...baseEnv, ...rest });
    assert.equal(result.success, false);
  });

  it("refuses a non-http(s) ROADMAP_API_URL", () => {
    const result = envSchema.safeParse({ ...baseEnv, ...validRoadmapBlock, ROADMAP_API_URL: "not-a-url" });
    assert.equal(result.success, false);
  });

  it("refuses an empty ROADMAP_HMAC_KEY_ID", () => {
    const result = envSchema.safeParse({ ...baseEnv, ...validRoadmapBlock, ROADMAP_HMAC_KEY_ID: "   " });
    assert.equal(result.success, false);
  });

  it("refuses a secret shorter than 32 bytes", () => {
    const result = envSchema.safeParse({ ...baseEnv, ...validRoadmapBlock, ROADMAP_HMAC_SECRET: "too-short" });
    assert.equal(result.success, false);
  });

  it("accepts a secret at exactly the 32-byte boundary", () => {
    const result = envSchema.safeParse({ ...baseEnv, ...validRoadmapBlock, ROADMAP_HMAC_SECRET: "b".repeat(32) });
    assert.equal(result.success, true);
  });
});
