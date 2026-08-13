import crypto from "node:crypto";

/**
 * Server-to-server request signing shared between this Allka platform
 * (caller, signs outgoing requests to the Roadmap) and allka-roadmap
 * (verifier). Mirrors allka-roadmap's apps/backend/src/lib/hmac.ts exactly
 * — same canonical string, same header names, same algorithm. See
 * docs/roadmap-integration-contract-v1.md for the full narrative.
 *
 * Canonical string signed (newline-joined, in this exact order):
 *   timestamp \n METHOD \n pathname \n normalizedQuery \n bodyHashHex
 */

export const HMAC_HEADER_KEY_ID = "x-allka-key-id";
export const HMAC_HEADER_TIMESTAMP = "x-allka-timestamp";
export const HMAC_HEADER_SIGNATURE = "x-allka-signature";

export const EMPTY_BODY_SHA256 = crypto
  .createHash("sha256")
  .update(Buffer.alloc(0))
  .digest("hex");

export function computeBodyHash(rawBody: Buffer | string | undefined): string {
  if (rawBody === undefined) return EMPTY_BODY_SHA256;
  const buf = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody, "utf8");
  if (buf.length === 0) return EMPTY_BODY_SHA256;
  return crypto.createHash("sha256").update(buf).digest("hex");
}

export function normalizeQuery(rawQuery: string): string {
  const cleaned = rawQuery.startsWith("?") ? rawQuery.slice(1) : rawQuery;
  if (!cleaned) return "";
  const params = new URLSearchParams(cleaned);
  const pairs = Array.from(params.entries());
  pairs.sort(([ka, va], [kb, vb]) =>
    ka === kb ? va.localeCompare(vb) : ka.localeCompare(kb),
  );
  const sorted = new URLSearchParams();
  for (const [key, value] of pairs) sorted.append(key, value);
  return sorted.toString();
}

export function buildCanonicalString(input: {
  timestamp: string;
  method: string;
  pathname: string;
  normalizedQuery: string;
  bodyHash: string;
}): string {
  return [
    input.timestamp,
    input.method.toUpperCase(),
    input.pathname,
    input.normalizedQuery,
    input.bodyHash,
  ].join("\n");
}

export function computeSignatureHex(secret: string, canonicalString: string): string {
  return crypto.createHmac("sha256", secret).update(canonicalString).digest("hex");
}

/** Used by the outgoing client that calls the Roadmap. */
export function signRequest(input: {
  method: string;
  pathname: string;
  rawQuery?: string;
  body?: Buffer | string;
  keyId: string;
  secret: string;
  timestamp?: number;
}): { headers: Record<string, string>; timestamp: number; canonicalString: string } {
  const timestamp = input.timestamp ?? Math.floor(Date.now() / 1000);
  const bodyBuffer =
    input.body === undefined
      ? Buffer.alloc(0)
      : Buffer.isBuffer(input.body)
        ? input.body
        : Buffer.from(input.body, "utf8");
  const normalizedQuery = normalizeQuery(input.rawQuery ?? "");
  const bodyHash = computeBodyHash(bodyBuffer);
  const canonicalString = buildCanonicalString({
    timestamp: String(timestamp),
    method: input.method,
    pathname: input.pathname,
    normalizedQuery,
    bodyHash,
  });
  const signatureHex = computeSignatureHex(input.secret, canonicalString);

  return {
    timestamp,
    canonicalString,
    headers: {
      [HMAC_HEADER_KEY_ID]: input.keyId,
      [HMAC_HEADER_TIMESTAMP]: String(timestamp),
      [HMAC_HEADER_SIGNATURE]: `v1=${signatureHex}`,
    },
  };
}

export type HmacVerifyFailureReason =
  | "MISSING_HEADERS"
  | "MALFORMED_SIGNATURE"
  | "WRONG_KEY_ID"
  | "TIMESTAMP_MALFORMED"
  | "TIMESTAMP_EXPIRED"
  | "TIMESTAMP_FUTURE"
  | "SIGNATURE_MISMATCH";

export type HmacVerifyResult =
  | { ok: true }
  | { ok: false; reason: HmacVerifyFailureReason };

const SIGNATURE_PATTERN = /^v1=([0-9a-f]{64})$/i;

/**
 * Not used server-side in this batch (the Roadmap doesn't call back into
 * Allka yet), but kept in parity with the Roadmap's verifier so both sides
 * can share the exact same test fixtures and so a future webhook receiver
 * doesn't need to reinvent this.
 */
export function verifyHmacSignature(input: {
  method: string;
  pathname: string;
  rawQuery: string;
  rawBody: Buffer | undefined;
  headers: {
    keyId?: string;
    timestamp?: string;
    signature?: string;
  };
  expectedKeyId: string;
  secret: string;
  maxSkewSeconds: number;
  now?: number;
}): HmacVerifyResult {
  const { keyId, timestamp, signature } = input.headers;
  if (!keyId || !timestamp || !signature) {
    return { ok: false, reason: "MISSING_HEADERS" };
  }

  if (!timingSafeEqualStrings(keyId, input.expectedKeyId)) {
    return { ok: false, reason: "WRONG_KEY_ID" };
  }

  const match = SIGNATURE_PATTERN.exec(signature.trim());
  if (!match) {
    return { ok: false, reason: "MALFORMED_SIGNATURE" };
  }

  if (!/^\d+$/.test(timestamp)) {
    return { ok: false, reason: "TIMESTAMP_MALFORMED" };
  }
  const ts = Number(timestamp);
  if (!Number.isSafeInteger(ts) || ts <= 0) {
    return { ok: false, reason: "TIMESTAMP_MALFORMED" };
  }

  const now = input.now ?? Math.floor(Date.now() / 1000);
  if (ts < now - input.maxSkewSeconds) {
    return { ok: false, reason: "TIMESTAMP_EXPIRED" };
  }
  if (ts > now + input.maxSkewSeconds) {
    return { ok: false, reason: "TIMESTAMP_FUTURE" };
  }

  const normalizedQuery = normalizeQuery(input.rawQuery);
  const bodyHash = computeBodyHash(input.rawBody);
  const canonicalString = buildCanonicalString({
    timestamp,
    method: input.method,
    pathname: input.pathname,
    normalizedQuery,
    bodyHash,
  });
  const expectedHex = computeSignatureHex(input.secret, canonicalString);
  const providedHex = match[1].toLowerCase();

  const expectedBuf = Buffer.from(expectedHex, "hex");
  const providedBuf = Buffer.from(providedHex, "hex");
  if (
    expectedBuf.length !== providedBuf.length ||
    !crypto.timingSafeEqual(expectedBuf, providedBuf)
  ) {
    return { ok: false, reason: "SIGNATURE_MISMATCH" };
  }

  return { ok: true };
}

function timingSafeEqualStrings(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}
