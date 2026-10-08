import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { prisma } from "../lib/prisma";
import { api, mkAdmin, mkCompanyUser, startServer, stopServer } from "../test-support/universal-helpers";

// Recarga de crédito da carteira pelo cliente, via gateway fake de teste (cartão e Pix).
let CO: Awaited<ReturnType<typeof mkCompanyUser>>;
let ADMIN: Awaited<ReturnType<typeof mkAdmin>>;
const post = (p: string, body: unknown, token = CO.token) => api(`/api/wallet-topup${p}`, { method: "POST", token, body });
async function saldo() { return (await prisma.wallet.findUnique({ where: { owner_type_owner_id: { owner_type: "company", owner_id: CO.companyId } } }))?.balance ?? 0; }

describe("Recarga de crédito da carteira (gateway fake)", () => {
  before(async () => { await startServer(); CO = await mkCompanyUser("TOP"); ADMIN = await mkAdmin(); });
  after(async () => { await stopServer(); });

  it("TOP01. cartão aprovado credita o valor, registra no extrato e aparece no resumo", async () => {
    const antes = await saldo();
    const r = await post("/card", { amount: 50, card_number: "4242 4242 4242 4242", holder: "Fulano" });
    assert.equal(r.status, 201, JSON.stringify(r.json));
    assert.equal(await saldo(), antes + 50);
    const l = await prisma.walletLedger.findFirstOrThrow({ where: { id: r.json.entry.id } });
    assert.deepEqual([l.direction, l.amount, l.status], ["credit", 50, "confirmed"]);
    assert.equal(JSON.stringify(l.metadata).includes("4242 4242"), false, "número completo nunca é guardado");
    const s = await api("/api/wallet-topup/summary", { token: CO.token });
    assert.equal(s.status, 200);
    assert.deepEqual([s.json.balance_brl, s.json.is_sandbox], [antes + 50, true]);
  });

  it("TOP02. cartão de teste recusado (final 0002) não credita nada e explica o motivo", async () => {
    const antes = await saldo();
    const r = await post("/card", { amount: 30, card_number: "4000000000000002" });
    assert.equal(r.status, 402, JSON.stringify(r.json));
    assert.equal(r.json.code, "insufficient_funds");
    assert.equal(await saldo(), antes);
  });

  it("TOP03. valor fora do limite é recusado", async () => {
    assert.equal((await post("/card", { amount: 1, card_number: "4242424242424242" })).status, 422);
    assert.equal((await post("/card", { amount: 999999, card_number: "4242424242424242" })).status, 422);
  });

  it("TOP04. Pix: gera código; só credita ao simular o pagamento, e simular duas vezes não duplica", async () => {
    const antes = await saldo();
    const p = await post("/pix", { amount: 20 });
    assert.equal(p.status, 201, JSON.stringify(p.json));
    assert.match(p.json.copyPaste, /FAKE/);
    assert.equal(await saldo(), antes, "gerar o Pix ainda não credita");
    const c1 = await post("/pix/confirm-sandbox", { transaction_id: p.json.transactionId });
    assert.equal(c1.status, 201, JSON.stringify(c1.json));
    const c2 = await post("/pix/confirm-sandbox", { transaction_id: p.json.transactionId });
    assert.equal(c2.status, 201);
    assert.equal(await saldo(), antes + 20, "idempotente: credita uma vez só");
    assert.equal((await post("/pix/confirm-sandbox", { transaction_id: "QUALQUER_COISA" })).status, 422);
  });

  it("TOP05. admin não usa a recarga do cliente", async () => {
    const r = await post("/card", { amount: 10, card_number: "4242424242424242" }, ADMIN.token);
    assert.equal(r.status, 403, JSON.stringify(r.json));
  });
});
