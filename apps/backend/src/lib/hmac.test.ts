import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeBodyHash,
  normalizeQuery,
  signRequest,
  verifyHmacSignature,
} from "./roadmap-hmac";

const SECRET = "test-shared-secret-not-a-real-one";
const KEY_ID = "test-key-1";
const NOW = 1_700_000_000;

function baseSigned() {
  return signRequest({
    method: "POST",
    pathname: "/api/v1/integrations/allka/work-items",
    rawQuery: "",
    body: JSON.stringify({ title: "hello" }),
    keyId: KEY_ID,
    secret: SECRET,
    timestamp: NOW,
  });
}

describe("normalizeQuery", () => {
  it("returns an empty string for no query", () => {
    assert.equal(normalizeQuery(""), "");
  });

  it("sorts keys regardless of original order", () => {
    assert.equal(normalizeQuery("b=2&a=1"), normalizeQuery("a=1&b=2"));
  });

  it("sorts repeated keys by value", () => {
    assert.equal(normalizeQuery("x=2&x=1"), "x=1&x=2");
  });
});

describe("computeBodyHash", () => {
  it("is deterministic for the same bytes", () => {
    assert.equal(
      computeBodyHash(Buffer.from("same bytes")),
      computeBodyHash(Buffer.from("same bytes")),
    );
  });

  it("hashes an empty buffer the same as undefined", () => {
    assert.equal(computeBodyHash(undefined), computeBodyHash(Buffer.alloc(0)));
  });
});

describe("verifyHmacSignature — accepts", () => {
  it("a validly signed POST with a JSON body", () => {
    const signed = baseSigned();
    const result = verifyHmacSignature({
      method: "POST",
      pathname: "/api/v1/integrations/allka/work-items",
      rawQuery: "",
      rawBody: Buffer.from(JSON.stringify({ title: "hello" }), "utf8"),
      headers: {
        keyId: signed.headers["x-allka-key-id"],
        timestamp: signed.headers["x-allka-timestamp"],
        signature: signed.headers["x-allka-signature"],
      },
      expectedKeyId: KEY_ID,
      secret: SECRET,
      maxSkewSeconds: 300,
      now: NOW,
    });
    assert.deepEqual(result, { ok: true });
  });

  it("a validly signed GET with query params in a different order", () => {
    const signed = signRequest({
      method: "GET",
      pathname: "/api/v1/integrations/allka/work-items",
      rawQuery: "pageSize=20&page=1",
      keyId: KEY_ID,
      secret: SECRET,
      timestamp: NOW,
    });
    const result = verifyHmacSignature({
      method: "GET",
      pathname: "/api/v1/integrations/allka/work-items",
      rawQuery: "page=1&pageSize=20",
      rawBody: undefined,
      headers: {
        keyId: signed.headers["x-allka-key-id"],
        timestamp: signed.headers["x-allka-timestamp"],
        signature: signed.headers["x-allka-signature"],
      },
      expectedKeyId: KEY_ID,
      secret: SECRET,
      maxSkewSeconds: 300,
      now: NOW,
    });
    assert.deepEqual(result, { ok: true });
  });
});

describe("verifyHmacSignature — rejects", () => {
  it("a wrong secret", () => {
    const signed = baseSigned();
    const result = verifyHmacSignature({
      method: "POST",
      pathname: "/api/v1/integrations/allka/work-items",
      rawQuery: "",
      rawBody: Buffer.from(JSON.stringify({ title: "hello" }), "utf8"),
      headers: {
        keyId: signed.headers["x-allka-key-id"],
        timestamp: signed.headers["x-allka-timestamp"],
        signature: signed.headers["x-allka-signature"],
      },
      expectedKeyId: KEY_ID,
      secret: "wrong-secret",
      maxSkewSeconds: 300,
      now: NOW,
    });
    assert.deepEqual(result, { ok: false, reason: "SIGNATURE_MISMATCH" });
  });

  it("a wrong key id", () => {
    const signed = baseSigned();
    const result = verifyHmacSignature({
      method: "POST",
      pathname: "/api/v1/integrations/allka/work-items",
      rawQuery: "",
      rawBody: Buffer.from(JSON.stringify({ title: "hello" }), "utf8"),
      headers: {
        keyId: signed.headers["x-allka-key-id"],
        timestamp: signed.headers["x-allka-timestamp"],
        signature: signed.headers["x-allka-signature"],
      },
      expectedKeyId: "wrong-key-id",
      secret: SECRET,
      maxSkewSeconds: 300,
      now: NOW,
    });
    assert.deepEqual(result, { ok: false, reason: "WRONG_KEY_ID" });
  });

  it("an expired timestamp", () => {
    const signed = baseSigned();
    const result = verifyHmacSignature({
      method: "POST",
      pathname: "/api/v1/integrations/allka/work-items",
      rawQuery: "",
      rawBody: Buffer.from(JSON.stringify({ title: "hello" }), "utf8"),
      headers: {
        keyId: signed.headers["x-allka-key-id"],
        timestamp: signed.headers["x-allka-timestamp"],
        signature: signed.headers["x-allka-signature"],
      },
      expectedKeyId: KEY_ID,
      secret: SECRET,
      maxSkewSeconds: 300,
      now: NOW + 301,
    });
    assert.deepEqual(result, { ok: false, reason: "TIMESTAMP_EXPIRED" });
  });

  it("a timestamp too far in the future", () => {
    const signed = baseSigned();
    const result = verifyHmacSignature({
      method: "POST",
      pathname: "/api/v1/integrations/allka/work-items",
      rawQuery: "",
      rawBody: Buffer.from(JSON.stringify({ title: "hello" }), "utf8"),
      headers: {
        keyId: signed.headers["x-allka-key-id"],
        timestamp: signed.headers["x-allka-timestamp"],
        signature: signed.headers["x-allka-signature"],
      },
      expectedKeyId: KEY_ID,
      secret: SECRET,
      maxSkewSeconds: 300,
      now: NOW - 301,
    });
    assert.deepEqual(result, { ok: false, reason: "TIMESTAMP_FUTURE" });
  });

  it("a tampered body", () => {
    const signed = baseSigned();
    const result = verifyHmacSignature({
      method: "POST",
      pathname: "/api/v1/integrations/allka/work-items",
      rawQuery: "",
      rawBody: Buffer.from(JSON.stringify({ title: "TAMPERED" }), "utf8"),
      headers: {
        keyId: signed.headers["x-allka-key-id"],
        timestamp: signed.headers["x-allka-timestamp"],
        signature: signed.headers["x-allka-signature"],
      },
      expectedKeyId: KEY_ID,
      secret: SECRET,
      maxSkewSeconds: 300,
      now: NOW,
    });
    assert.deepEqual(result, { ok: false, reason: "SIGNATURE_MISMATCH" });
  });

  it("a tampered route", () => {
    const signed = baseSigned();
    const result = verifyHmacSignature({
      method: "POST",
      pathname: "/api/v1/integrations/allka/work-items/ALK-999",
      rawQuery: "",
      rawBody: Buffer.from(JSON.stringify({ title: "hello" }), "utf8"),
      headers: {
        keyId: signed.headers["x-allka-key-id"],
        timestamp: signed.headers["x-allka-timestamp"],
        signature: signed.headers["x-allka-signature"],
      },
      expectedKeyId: KEY_ID,
      secret: SECRET,
      maxSkewSeconds: 300,
      now: NOW,
    });
    assert.deepEqual(result, { ok: false, reason: "SIGNATURE_MISMATCH" });
  });

  it("a missing signature header", () => {
    const signed = baseSigned();
    const result = verifyHmacSignature({
      method: "POST",
      pathname: "/api/v1/integrations/allka/work-items",
      rawQuery: "",
      rawBody: Buffer.from(JSON.stringify({ title: "hello" }), "utf8"),
      headers: {
        keyId: signed.headers["x-allka-key-id"],
        timestamp: signed.headers["x-allka-timestamp"],
      },
      expectedKeyId: KEY_ID,
      secret: SECRET,
      maxSkewSeconds: 300,
      now: NOW,
    });
    assert.deepEqual(result, { ok: false, reason: "MISSING_HEADERS" });
  });
});

describe("secrecy", () => {
  it("never includes the secret in the signed headers", () => {
    const signed = baseSigned();
    assert.ok(!JSON.stringify(signed.headers).includes(SECRET));
  });
});
