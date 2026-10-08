import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { prisma } from "../lib/prisma";
import { ensureDefaultAIServices } from "../lib/ai-usage-tracker";
import { api, mkAdmin, mkCompanyUser, mkProduct, startServer, stopServer, checkoutAndPay, SEL } from "../test-support/universal-helpers";

// P-11 (reunião 07/10): alteração por IA — N grátis (global ou do produto); depois, debitada do SALDO da carteira.
let ADMIN: Awaited<ReturnType<typeof mkAdmin>>;
let CO: Awaited<ReturnType<typeof mkCompanyUser>>;
let OUTRA: Awaited<ReturnType<typeof mkCompanyUser>>;
const post = (p: string, body: unknown, token = CO.token) => api(`/api/ai-changes${p}`, { method: "POST", token, body });

async function contratacao(tag: string) {
  const p = await mkProduct({ name: `Produto ${tag}`, tasks: [{ key: "t" }], publish: true });
  const q = await api("/api/catalog2/quotes", { method: "POST", token: CO.token, body: { product: p.product.id, selection: SEL } });
  assert.equal(q.status, 201, JSON.stringify(q.json));
  const { pps } = await checkoutAndPay(CO.token, [q.json.id]);
  return { product: p.product, ppId: pps[0].id };
}
async function saldo() { return (await prisma.wallet.findUnique({ where: { owner_type_owner_id: { owner_type: "company", owner_id: CO.companyId } } }))?.balance ?? 0; }
async function credita(valor: number) {
  const w = await prisma.wallet.upsert({ where: { owner_type_owner_id: { owner_type: "company", owner_id: CO.companyId } }, update: {}, create: { owner_type: "company", owner_id: CO.companyId, balance: 0 } });
  await prisma.wallet.update({ where: { id: w.id }, data: { balance: valor } });
}

describe("Cobrança das alterações por IA no saldo da carteira (P-11)", () => {
  before(async () => {
    await startServer(); ADMIN = await mkAdmin(); CO = await mkCompanyUser("CHG"); OUTRA = await mkCompanyUser("CHG2");
    await ensureDefaultAIServices(); await prisma.aIUsageLog.deleteMany({});
    const svc = await prisma.aIServiceConfig.findUniqueOrThrow({ where: { key: "gemini" } });
    // 30 chamadas de US$ 0,01 → com dólar 5,5 e margem 100% → R$ 0,11 → arredonda para R$ 0,20 (mínimo configurado abaixo = 2,00).
    await prisma.aIUsageLog.createMany({ data: Array.from({ length: 30 }, () => ({ service_id: svc.id, model: "gemini-2.5-flash", feature: "improve-product-field", prompt_tokens: 1000, completion_tokens: 400, total_tokens: 1400, estimated_cost_usd: 0.01 })) });
    await api("/api/ai-usage/change-pricing", { method: "PUT", token: ADMIN.token, body: { usd_brl_rate: 5, margin_percent: 100, free_changes: 1, min_price_brl: 2, basis: "average", features: null } });
  });
  after(async () => { await prisma.aIUsageLog.deleteMany({}); await stopServer(); });

  it("CHG01. a 1ª alteração é grátis (regra global); a 2ª custa o preço calculado e sai do saldo; o extrato registra", async () => {
    const c = await contratacao("A");
    await credita(10);
    const q0 = await post("/quote", { project_product_id: c.ppId });
    assert.equal(q0.status, 200, JSON.stringify(q0.json));
    assert.deepEqual([q0.json.free_total, q0.json.used, q0.json.is_free, q0.json.price_brl], [1, 0, true, 0]);
    const g1 = await post("/charge", { project_product_id: c.ppId, feature: "improve-product-field" });
    assert.equal(g1.status, 201, JSON.stringify(g1.json));
    assert.equal(g1.json.charge.is_free, true);
    assert.equal(await saldo(), 10, "grátis não mexe no saldo");
    const q1 = await post("/quote", { project_product_id: c.ppId });
    assert.deepEqual([q1.json.is_free, q1.json.price_brl, q1.json.enough_balance], [false, 2, true], "mínimo de R$ 2,00 vale");
    const g2 = await post("/charge", { project_product_id: c.ppId });
    assert.equal(g2.status, 201, JSON.stringify(g2.json));
    assert.equal(g2.json.charge.amount_brl, 2);
    assert.equal(await saldo(), 8, "R$ 2,00 debitados do saldo");
    const ledger = await prisma.walletLedger.findFirstOrThrow({ where: { id: g2.json.charge.ledger_id } });
    assert.deepEqual([ledger.direction, ledger.amount, ledger.balance_before, ledger.balance_after, ledger.reference_id], ["debit", 2, 10, 8, c.ppId]);
  });

  it("CHG02. sem saldo a alteração é recusada (402), nada é gravado e o aviso diz quanto falta; depois de recarregar passa", async () => {
    const c = await contratacao("B");
    await credita(0);
    await post("/charge", { project_product_id: c.ppId }); // a grátis
    const sem = await post("/charge", { project_product_id: c.ppId });
    assert.equal(sem.status, 402, JSON.stringify(sem.json));
    assert.equal(sem.json.code, "insufficient_balance");
    assert.equal(sem.json.details.missing_brl, 2);
    assert.match(sem.json.error, /Adicione crédito/);
    assert.equal(await prisma.aiChangeCharge.count({ where: { project_product_id: c.ppId } }), 1, "só a grátis ficou registrada");
    await credita(5);
    assert.equal((await post("/charge", { project_product_id: c.ppId })).status, 201);
    assert.equal(await saldo(), 3);
  });

  it("CHG03. o produto pode ter sua própria cota grátis (sobrescreve a global); vazio volta a valer a global", async () => {
    const c = await contratacao("C");
    await credita(0);
    assert.equal((await api(`/api/admin/catalog2/products/${c.product.id}/ai-free-changes`, { method: "PATCH", token: ADMIN.token, body: { ai_free_changes: 3 } })).status, 200);
    for (let i = 0; i < 3; i++) assert.equal((await post("/charge", { project_product_id: c.ppId })).json.charge.is_free, true, `grátis ${i + 1}`);
    assert.equal((await post("/charge", { project_product_id: c.ppId })).status, 402, "4ª já é cobrada");
    assert.equal((await api(`/api/admin/catalog2/products/${c.product.id}/ai-free-changes`, { method: "PATCH", token: ADMIN.token, body: { ai_free_changes: null } })).status, 200);
    const q = await post("/quote", { project_product_id: c.ppId });
    assert.equal(q.json.free_total, 1, "voltou para a regra global");
    assert.equal((await api(`/api/admin/catalog2/products/${c.product.id}/ai-free-changes`, { method: "PATCH", token: ADMIN.token, body: { ai_free_changes: -1 } })).status >= 400, true);
  });

  it("CHG04. outra empresa não consulta nem cobra a contratação alheia", async () => {
    const c = await contratacao("D");
    assert.equal((await post("/quote", { project_product_id: c.ppId }, OUTRA.token)).status, 404);
    assert.equal((await post("/charge", { project_product_id: c.ppId }, OUTRA.token)).status, 404);
    assert.equal(await prisma.aiChangeCharge.count({ where: { project_product_id: c.ppId } }), 0);
  });
});
