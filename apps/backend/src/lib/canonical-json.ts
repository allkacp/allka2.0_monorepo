import crypto from "node:crypto";

/**
 * Deterministic JSON serialization (object keys sorted recursively) so two
 * payloads that are semantically identical but arrived with different key
 * ordering hash to the same value. Mirrors allka-roadmap's
 * apps/backend/src/lib/canonical-json.ts exactly.
 */
export function canonicalJsonStringify(value: unknown): string {
  return JSON.stringify(sortKeysDeep(value));
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  if (value !== null && typeof value === "object") {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = sortKeysDeep((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return value;
}

export function hashPayload(value: unknown): string {
  return crypto.createHash("sha256").update(canonicalJsonStringify(value)).digest("hex");
}
