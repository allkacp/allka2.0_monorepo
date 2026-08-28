import assert from "node:assert/strict";
import { test } from "node:test";
import { isBlockedKey, sanitizeForLegacy, scrubSecretValues } from "./sanitize";
import { hashPayload } from "../lib/canonical-json";

// Política de campos bloqueados do legado (sprint de produtos, bloco 1/6).

test("isBlockedKey reconhece credenciais e segredos, mas não campos legítimos parecidos", () => {
  for (const k of [
    "password",
    "password_hash",
    "senha",
    "reset_token",
    "api_key",
    "apiKey",
    "client_secret",
    "session_id",
    "cookie",
    "jwt",
    "authorization",
    "pix_key",
    "card_number",
    "vapid_private_key",
    "recovery_code",
    "access_token",
  ]) {
    assert.equal(isBlockedKey(k), true, `${k} deveria ser bloqueado`);
  }
  for (const k of ["author", "authored_at", "name", "description", "category", "price", "created_at", "title"]) {
    assert.equal(isBlockedKey(k), false, `${k} NÃO deveria ser bloqueado`);
  }
});

test("sanitizeForLegacy remove chaves proibidas recursivamente e lista os caminhos (nunca os valores)", () => {
  const input = {
    id: "p1",
    name: "Produto",
    password_hash: "$2b$10$aaaaaaaaaaaaaaaaaaaaaa",
    nested: { token: "abc", ok: 1, deep: [{ secret: "x", keep: "y" }] },
  };
  const { clean, removedFields } = sanitizeForLegacy(input);
  assert.deepEqual(clean, { id: "p1", name: "Produto", nested: { ok: 1, deep: [{ keep: "y" }] } });
  assert.ok(removedFields.includes("password_hash"));
  assert.ok(removedFields.includes("nested.token"));
  assert.ok(removedFields.includes("nested.deep[0].secret"));
  // nunca vaza o valor
  assert.ok(!JSON.stringify(removedFields).includes("$2b$10"));
});

test("scrubSecretValues neutraliza segredos escondidos como VALOR em campo de nome inocente", () => {
  const jwt =
    "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const input = { note: jwt, hexkey: "a".repeat(64), fine: "texto normal" };
  const { clean, scrubbed } = scrubSecretValues(input);
  assert.equal((clean as any).note, "[removido: possível segredo]");
  assert.equal((clean as any).hexkey, "[removido: possível segredo]");
  assert.equal((clean as any).fine, "texto normal");
  assert.deepEqual(scrubbed.sort(), ["hexkey", "note"]);
});

test("checksum é determinístico independente da ordem das chaves", () => {
  const a = { x: 1, y: { b: 2, a: [3, 4] } };
  const b = { y: { a: [3, 4], b: 2 }, x: 1 };
  assert.equal(hashPayload(a), hashPayload(b));
  assert.notEqual(hashPayload(a), hashPayload({ x: 1, y: { b: 2, a: [3, 5] } }));
});
