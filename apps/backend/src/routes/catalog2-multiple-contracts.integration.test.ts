import assert from "node:assert/strict";
import crypto from "node:crypto";
import { after, before, describe, it } from "node:test";
import { prisma } from "../lib/prisma";
import { attachCatalog2QuoteToProject } from "../lib/catalog2-checkout";
import { publishVersion } from "../lib/catalog2-service";
import { api, startServer, stopServer, mkAdmin, mkCompanyUser, mkProduct, SEL, checkoutAndPay, tasksOf } from "../test-support/universal-helpers";

let admin: Awaited<ReturnType<typeof mkAdmin>>;
let buyer: Awaited<ReturnType<typeof mkCompanyUser>>;
async function quote(product: string, quantity = 1) {
  const r = await api("/api/catalog2/quotes", { method: "POST", token: buyer.token, body: { product, selection: { ...SEL, quantity, delivery_groups: [quantity] } } });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  return r.json;
}
async function project() {
  const r = await api("/api/projects", { method: "POST", token: buyer.token, body: { title: `[TESTE] Múltiplas ${crypto.randomUUID()}`, status: "draft" } });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  return r.json.id as string;
}
const attach = (projectId: string, quoteId: string) => prisma.$transaction((tx) => attachCatalog2QuoteToProject(tx, { projectId, quoteId, origin: "CATALOG2", pagadorSnapshot: "AGENCIA" }));
async function fixture(enabled = false) {
  return mkProduct({ name: "Múltiplas contratações", publish: true, flags: { accepts_multiple_contracts: enabled }, tasks: [{ key: "main", steps: [{ key: "s1" }] }] });
}
async function additive(projectId: string, quoteId: string) {
  const requested = await api("/api/catalog2/change-orders", { method: "POST", token: buyer.token, body: { project_id: projectId, quote_id: quoteId } });
  assert.equal(requested.status, 201, JSON.stringify(requested.json));
  const approved = await api(`/api/catalog2/change-orders/${requested.json.id}/approve`, { method: "POST", token: admin.token, body: { approval_client_action_id: crypto.randomUUID() } });
  assert.equal(approved.status, 200, JSON.stringify(approved.json));
  return api(`/api/catalog2/change-orders/${requested.json.id}/checkout`, { method: "POST", token: buyer.token });
}

before(async () => { await startServer(); admin = await mkAdmin(); buyer = await mkCompanyUser("multiple-contracts"); });
after(async () => { await stopServer(); await prisma.$disconnect(); });
describe("Múltiplas contratações por versão e projeto (banco descartável)", () => {
  it("salva pelo cadastro e copia a regra ao criar outra versão", async () => {
    const p = await mkProduct({ name: "Rascunho", tasks: [{ key: "main" }] });
    assert.equal((await prisma.catalog2ProductVersion.findUniqueOrThrow({ where: { id: p.versionId } })).accepts_multiple_contracts, true);
    const saved = await api(`/api/admin/catalog2/versions/${p.versionId}`, { method: "PUT", token: admin.token, body: { accepts_multiple_contracts: false } });
    assert.equal(saved.status, 200, JSON.stringify(saved.json));
    assert.equal((await prisma.catalog2ProductVersion.findUniqueOrThrow({ where: { id: p.versionId } })).accepts_multiple_contracts, false);
    await publishVersion(p.versionId, admin.user.id, { activate: true, changeSummary: "Teste da regra salva" });
    const copy = await api(`/api/admin/catalog2/products/${p.product.id}/versions`, { method: "POST", token: admin.token, body: {} });
    assert.equal(copy.status, 201, JSON.stringify(copy.json));
    assert.equal((await prisma.catalog2ProductVersion.findUniqueOrThrow({ where: { id: copy.json.version_id } })).accepts_multiple_contracts, false);
  });
  it("expõe a regra publicada e recusa quantidade maior que um na cotação", async () => {
    const p = await fixture();
    const detail = await api(`/api/catalog2/products/${p.product.id}`, { token: buyer.token });
    assert.equal(detail.status, 200, JSON.stringify(detail.json));
    assert.equal(detail.json.sale_modes.multiple_contracts, false);
    const r = await api("/api/catalog2/quotes", { method: "POST", token: buyer.token, body: { product: p.product.id, selection: { ...SEL, quantity: 2 } } });
    assert.equal(r.status, 422, JSON.stringify(r.json));
    const cart = await api("/api/catalog2/cart/items", { method: "POST", token: buyer.token, body: { product: p.product.id, selection: { ...SEL, quantity: 2 } } });
    assert.equal(cart.status, 422, JSON.stringify(cart.json));
    const edit = await api(`/api/admin/catalog2/versions/${p.versionId}`, { method: "PUT", token: admin.token, body: { accepts_multiple_contracts: true } });
    assert.equal(edit.status, 409, JSON.stringify(edit.json));
  });
  it("protege a conversão mesmo com quantidade adulterada depois de gerar a cotação", async () => {
    const p = await fixture(), q = await quote(p.product.id), id = await project();
    await prisma.catalog2Quote.update({ where: { id: q.id }, data: { quantity: 2 } });
    await assert.rejects(attach(id, q.id), /não permite múltiplas unidades/);
    assert.equal(await prisma.projectProduct.count({ where: { project_id: id } }), 0);
  });
  it("não duplica no retry e bloqueia outra contratação vigente, mas não outro projeto", async () => {
    const p = await fixture(), q1 = await quote(p.product.id), id = await project();
    const first = await attach(id, q1.id);
    assert.equal((await attach(id, q1.id)).id, first.id);
    const q2 = await quote(p.product.id);
    assert.notEqual(q2.id, q1.id);
    await assert.rejects(attach(id, q2.id), /já tem uma contratação vigente/);
    const other = await fixture();
    assert.ok((await attach(id, (await quote(other.product.id)).id)).id);
    assert.ok((await attach(await project(), q2.id)).id);
  });
  it("cancelamento, transferência e conclusão avulsa permitem nova contratação", async () => {
    for (const status of ["CANCELADO", "TRANSFERIDO", "CONCLUIDO"]) {
      const p = await fixture(), id = await project(), first = await attach(id, (await quote(p.product.id)).id);
      await prisma.projectProduct.update({ where: { id: first.id }, data: { status } });
      assert.notEqual((await attach(id, (await quote(p.product.id)).id)).id, first.id, status);
    }
  });
  it("assinatura ainda vigente bloqueia mesmo com entrega concluída; encerrada libera", async () => {
    const p = await fixture(), id = await project(), first = await attach(id, (await quote(p.product.id)).id);
    await prisma.projectProduct.update({ where: { id: first.id }, data: { status: "CONCLUIDO" } });
    const now = new Date(), end = new Date(Date.now() + 86400000);
    const s = await prisma.catalog2Subscription.create({ data: { project_product_id: first.id, project_id: id, company_id: buyer.companyId, status: "ativa", monthly_amount: 1, started_at: now, current_period_start: now, current_period_end: end } });
    const q = await quote(p.product.id);
    await assert.rejects(attach(id, q.id), /já tem uma contratação vigente/);
    await prisma.catalog2Subscription.update({ where: { id: s.id }, data: { status: "cancelada" } });
    await assert.rejects(attach(id, q.id), /já tem uma contratação vigente/);
    await prisma.catalog2Subscription.update({ where: { id: s.id }, data: { status: "encerrada" } });
    assert.ok((await attach(id, q.id)).id);
  });
  it("transação com duas compras bloqueadas não deixa pedido parcial", async () => {
    const p = await fixture(), id = await project(), q1 = await quote(p.product.id);
    // As duas cotações independentes precisam existir antes da mesma transação.
    const original = await prisma.catalog2Quote.findUniqueOrThrow({ where: { id: q1.id } });
    const q2 = await prisma.catalog2Quote.create({ data: { ...original, id: crypto.randomUUID(), config_checksum: crypto.randomUUID() } });
    await assert.rejects(prisma.$transaction(async (tx) => {
      for (const q of [q1, q2]) await attachCatalog2QuoteToProject(tx, { projectId: id, quoteId: q.id, origin: "CATALOG2", pagadorSnapshot: "AGENCIA" });
    }), /já tem uma contratação vigente/);
    assert.equal(await prisma.projectProduct.count({ where: { project_id: id } }), 0);
    assert.equal((await prisma.catalog2Quote.findUniqueOrThrow({ where: { id: q1.id } })).status, "valida");
  });
  it("compras concorrentes não furam o limite", async () => {
    const p = await fixture(), id = await project(), q1 = await quote(p.product.id);
    const original = await prisma.catalog2Quote.findUniqueOrThrow({ where: { id: q1.id } });
    const q2 = await prisma.catalog2Quote.create({ data: { ...original, id: crypto.randomUUID(), config_checksum: crypto.randomUUID() } });
    const results = await Promise.allSettled([attach(id, q1.id), attach(id, q2.id)]);
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(await prisma.projectProduct.count({ where: { project_id: id } }), 1);
  });
  it("ligado: compra e aditivo iguais geram IDs próprios e preservam a matriz e tarefas anteriores", async () => {
    const p = await fixture(true), q1 = await quote(p.product.id);
    const order = await checkoutAndPay(buyer.token, [q1.id]);
    const oldTasks = await tasksOf(order.projectId);
    const matrix = await prisma.catalog2TaskStep.findMany({ where: { task: { version_id: p.versionId } } });
    const second = await additive(order.projectId, (await quote(p.product.id)).id);
    assert.equal(second.status, 201, JSON.stringify(second.json));
    const tasks = await tasksOf(order.projectId);
    assert.equal(tasks.length, oldTasks.length * 2);
    const newTasks = tasks.filter((t) => !oldTasks.some((old) => old.id === t.id));
    assert.ok(newTasks.length > 0);
    for (const t of newTasks) {
      assert.equal(t.status, "PARA_LANCAMENTO");
      assert.ok(t.stages.every((s) => !oldTasks.some((old) => old.stages.some((os) => os.id === s.id))));
    }
    assert.deepEqual(tasks.filter((t) => oldTasks.some((old) => old.id === t.id)), oldTasks);
    assert.deepEqual(await prisma.catalog2TaskStep.findMany({ where: { task: { version_id: p.versionId } } }), matrix);
    assert.equal(await prisma.projectProduct.count({ where: { project_id: order.projectId } }), 2);
    assert.ok((await quote(p.product.id, 2)).id);
  });
  it("desligado: aditivo real não cria pagamento nem tarefa extra no mesmo projeto", async () => {
    const p = await fixture(), first = await checkoutAndPay(buyer.token, [(await quote(p.product.id)).id]);
    const beforeTasks = await tasksOf(first.projectId);
    const payments = await prisma.payment.count({ where: { project_id: first.projectId } });
    const result = await additive(first.projectId, (await quote(p.product.id)).id);
    assert.equal(result.status, 409, JSON.stringify(result.json));
    assert.deepEqual(await tasksOf(first.projectId), beforeTasks);
    assert.equal(await prisma.payment.count({ where: { project_id: first.projectId } }), payments);
    assert.equal(await prisma.projectProduct.count({ where: { project_id: first.projectId } }), 1);
  });
});
