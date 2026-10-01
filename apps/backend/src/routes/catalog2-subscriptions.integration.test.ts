import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import app from "../app";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import { seedCatalog2Classifications, seedCatalog2FourFForTests } from "../lib/catalog2-classifications-seed";
import { publishVersion } from "../lib/catalog2-service";
import { addMonths } from "../lib/catalog2-checkout";
import { runSubscriptionsTick } from "../lib/catalog2-subscriptions";


// Pedido 3 · Fase 4 — assinatura mensal contínua, status de assinatura e modalidades de venda.

let baseUrl = "";
let server: import("node:http").Server;
const users: string[] = [];
const adminProfiles: string[] = [];
const companies: string[] = [];
const catProducts: string[] = [];
const projects: string[] = [];

const DAY = 24 * 3600 * 1000;

function tokenFor(u: { id: string; email: string; role: string; account_type: string }) {
  return jwt.sign({ id: u.id, email: u.email, role: u.role, account_type: u.account_type }, config.JWT_SECRET, { expiresIn: "1h" });
}
async function api(path: string, opts: { method?: string; token?: string; body?: unknown } = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: opts.method ?? "GET",
    headers: { "content-type": "application/json", ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}) },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}

async function mkCompanyUser(tag: string) {
  const c = await prisma.company.create({ data: { name: `[TESTE] Co11 ${tag}`, status: "ativo" } });
  companies.push(c.id);
  const id = `c11co-${crypto.randomBytes(5).toString("hex")}`;
  const u = await prisma.user.create({
    data: { id, email: `${id}@example.test`, password_hash: "x", name: `Co11 ${tag}`, role: "company_user", account_type: "empresas", is_active: true, status: "ativo", company_id: c.id },
  });
  users.push(u.id);
  return { user: u, token: tokenFor(u), companyId: c.id };
}
async function mkAdmin(master: boolean) {
  const p = await prisma.adminProfile.create({ data: { name: `C11 ${master ? "M" : "C"} ${crypto.randomBytes(4).toString("hex")}`, is_master: master, is_active: true } });
  adminProfiles.push(p.id);
  const id = `c11ad-${crypto.randomBytes(5).toString("hex")}`;
  const u = await prisma.user.create({
    data: { id, email: `${id}@example.test`, password_hash: "x", name: "Admin", role: "admin", account_type: "admin", is_active: true, status: "ativo", admin_profile_id: p.id },
  });
  users.push(u.id);
  return { user: u, token: tokenFor(u) };
}

async function setPricingSettings(marginPercent = 30) {
  await prisma.catalog2PricingSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default", tax_percent: 6, commission_percent: 10, operational_fee_percent: 5, profit_margin_percent: marginPercent, human_review_percent: 10,
      component_order_json: JSON.stringify(["tax", "commission", "operational", "margin"]),
    },
    update: {
      tax_percent: 6, commission_percent: 10, operational_fee_percent: 5, profit_margin_percent: marginPercent, human_review_percent: 10,
      component_order_json: JSON.stringify(["tax", "commission", "operational", "margin"]),
    },
  });
}

async function mkPublishedProduct(slug: string) {
  const spec = await prisma.catalog2Specialty.findFirstOrThrow({ where: { key: "designer" } });
  await prisma.catalog2Specialty.update({ where: { id: spec.id }, data: { max_hourly_rate: 100 } });
  await setPricingSettings();
  const pillar = await prisma.catalog2Pillar.findFirstOrThrow({ where: { key: "redes_conteudo" } });
  const category = await prisma.catalog2Category.findFirstOrThrow({ where: { key: "design" } });
  const fourF = await prisma.catalog2FourF.findFirstOrThrow({ where: { key: "fluxo" } });
  const product = await prisma.catalog2Product.create({
    data: {
      slug, internal_name: `[TESTE LOCAL] ${slug}`, pillar_id: pillar.id, category_id: category.id, status: "em_preparacao",
      four_f: { create: [{ four_f_id: fourF.id }] },
    },
  });
  catProducts.push(product.id);
  const v = await prisma.catalog2ProductVersion.create({
    data: {
      product_id: product.id, version_number: 1, state: "rascunho",
      title: `Serviço ${slug}`, summary: "resumo", full_description: "descrição do serviço demo",
      base_commercial_deadline_days: 5,
      tasks: { create: [{ key: "t1", name: "Tarefa fixa", execution_mode: "humano", specialty_id: spec.id, estimated_minutes: 60, sort_order: 1,
        steps: { create: [{ key: "s1", name: "Etapa única", sort_order: 1, specialty_id: spec.id, estimated_minutes: 60 }] } }] },
    },
  });
  await publishVersion(v.id, "system", { activate: true, changeSummary: "publicação de teste" });
  return { product: await prisma.catalog2Product.findUniqueOrThrow({ where: { id: product.id } }), versionId: v.id };
}

async function purgeProject(id: string) {
  await prisma.catalog2ProjectDeliveryCycle.deleteMany({ where: { project_product: { project_id: id } } }).catch(() => {});
  await prisma.catalog2ChangeOrder.deleteMany({ where: { project_id: id } }).catch(() => {});
  await prisma.projectTaskStage.deleteMany({ where: { project_task: { project_id: id } } }).catch(() => {});
  await prisma.projectTask.deleteMany({ where: { project_id: id } }).catch(() => {});
  await prisma.paymentItem.deleteMany({ where: { payment: { project_id: id } } }).catch(() => {});
  await prisma.payment.deleteMany({ where: { project_id: id } }).catch(() => {});
  await prisma.projectProduct.deleteMany({ where: { project_id: id } }).catch(() => {});
  await prisma.project.deleteMany({ where: { id } }).catch(() => {});
}
async function purgeProduct(id: string) {
  await prisma.catalog2ProductPeriod.deleteMany({ where: { product_id: id } }).catch(() => {});
  await prisma.catalog2CartItem.deleteMany({ where: { product_id: id } }).catch(() => {});
  await prisma.catalog2Quote.deleteMany({ where: { product_id: id } }).catch(() => {});
  const vs = await prisma.catalog2ProductVersion.findMany({ where: { product_id: id }, select: { id: true } });
  const vids = vs.map((x) => x.id);
  await prisma.catalog2Product.update({ where: { id }, data: { published_version_id: null } }).catch(() => {});
  await prisma.catalog2VersionEvent.deleteMany({ where: { version_id: { in: vids } } }).catch(() => {});
  await prisma.catalog2Task.deleteMany({ where: { version_id: { in: vids } } }).catch(() => {});
  await prisma.catalog2ProductVersion.deleteMany({ where: { product_id: id } }).catch(() => {});
  await prisma.catalog2ProductFourF.deleteMany({ where: { product_id: id } }).catch(() => {});
  await prisma.catalog2Product.delete({ where: { id } }).catch(() => {});
}

async function setDeliveryRecurrence(token: string, productId: string, value: string | null) {
  const r = await api(`/api/admin/catalog2/products/${productId}/delivery-recurrence`, { method: "PUT", token, body: { delivery_recurrence: value } });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  // entrega mensal recorrente e assinatura mensal andam juntas (regra de consistência comercial): quem marca uma, habilita a outra
  await prisma.catalog2ProductVersion.updateMany({ where: { product_id: productId }, data: { accepts_recurring: value === "mensal" } });
  if (value === "mensal") {
    await prisma.catalog2ProductPeriod.upsert({ where: { product_id_period: { product_id: productId, period: "mensal" } }, create: { product_id: productId, period: "mensal", months: 1, discount_percent: 0, is_active: true }, update: {} });
  }
  return r.json;
}
async function configurePeriod(token: string, productId: string, period: string, discount: number) {
  const r = await api(`/api/admin/catalog2/products/${productId}/periods/${period}`, { method: "PUT", token, body: { discount_percent: discount, is_active: true } });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  return r.json;
}
async function createQuoteViaApi(token: string, productId: string, period?: string) {
  const r = await api("/api/catalog2/quotes", { method: "POST", token, body: { product: productId, selection: { variation_option_keys: [], addon_keys: [], quantity: 1, answers: {} }, ...(period ? { period } : {}) } });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  return r.json;
}
async function checkoutAndPay(token: string, quoteId: string) {
  const checkout = await api("/api/catalog2/checkout", { method: "POST", token, body: { quote_ids: [quoteId], checkout_client_action_id: crypto.randomUUID() } });
  assert.equal(checkout.status, 201, JSON.stringify(checkout.json));
  const projectId = checkout.json.project.id;
  const pay = await api("/api/payments/fake-checkout", { method: "POST", token, body: { project_id: projectId } });
  assert.equal(pay.status, 201, JSON.stringify(pay.json));
  return { projectId, projectProductId: checkout.json.project_products[0].id, pay };
}

let CO_A: Awaited<ReturnType<typeof mkCompanyUser>>;
let MASTER = "";


async function mkSubscription(opts: { flags?: Record<string, unknown>; noRecurringDelivery?: boolean } = {}) {
  const { product, versionId } = await mkPublishedProduct(`t12-${crypto.randomBytes(4).toString("hex")}`);
  await setDeliveryRecurrence(MASTER, product.id, "mensal");
  await configurePeriod(MASTER, product.id, "mensal", 0);
  if (opts.flags) await prisma.catalog2ProductVersion.update({ where: { id: versionId }, data: opts.flags });
  // versão só-avulso coerente: sem entrega mensal recorrente (senão a configuração é inconsistente e nada é vendido)
  if (opts.noRecurringDelivery) await prisma.catalog2Product.update({ where: { id: product.id }, data: { delivery_recurrence: null } });
  return { product, versionId };
}
async function buySubscription(token: string, productId: string) {
  const quote = await createQuoteViaApi(token, productId, "mensal");
  const r = await checkoutAndPay(token, quote.id);
  projects.push(r.projectId);
  const sub = await prisma.catalog2Subscription.findUniqueOrThrow({ where: { project_product_id: r.projectProductId } });
  return { ...r, sub };
}
const subOf = (id: string) => prisma.catalog2Subscription.findUniqueOrThrow({ where: { id } });
const tick = async () => runSubscriptionsTick();
const SEL = { variation_option_keys: [], addon_keys: [], quantity: 1, answers: {} };

let CO_B: Awaited<ReturnType<typeof mkCompanyUser>>;

describe("Pedido 3 · Fase 4 — assinatura mensal contínua e modalidades de venda", () => {
  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    await seedCatalog2FourFForTests(prisma);
    await seedCatalog2Classifications(prisma);
    CO_A = await mkCompanyUser("A");
    CO_B = await mkCompanyUser("B");
    MASTER = (await mkAdmin(true)).token;
    server = app.listen(0);
    await new Promise<void>((r) => server.once("listening", () => r()));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  beforeEach(async () => { await setPricingSettings(); });
  after(async () => {
    await new Promise<void>((res, rej) => server.close((e) => (e ? rej(e) : res())));
    for (const id of projects.splice(0)) {
      await prisma.catalog2SubscriptionEvent.deleteMany({ where: { subscription: { project_id: id } } }).catch(() => {});
      await prisma.catalog2Subscription.deleteMany({ where: { project_id: id } }).catch(() => {});
      await prisma.invoice.deleteMany({ where: { project_id: id } }).catch(() => {});
      await purgeProject(id);
    }
    for (const id of catProducts.splice(0)) await purgeProduct(id);
    await prisma.company.deleteMany({ where: { id: { in: companies } } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: { in: users } } }).catch(() => {});
    await prisma.adminProfile.deleteMany({ where: { id: { in: adminProfiles } } }).catch(() => {});
  });

  it("1. assinatura nasce no pagamento do 1º mês (ativa, 1 mês pago, próxima fatura agendada); avulso não cria assinatura", async () => {
    const { product } = await mkSubscription();
    const { sub, projectId } = await buySubscription(CO_A.token, product.id);
    assert.equal(sub.status, "ativa");
    assert.equal(sub.current_cycle_index, 0);
    assert.ok(sub.next_invoice_at && sub.next_invoice_at < sub.current_period_end);
    assert.equal(sub.current_period_end.getTime(), addMonths(sub.current_period_start, 1).getTime());
    assert.equal(await prisma.invoice.count({ where: { project_id: projectId, status: "paid" } }), 1, "a fatura do 1º mês já nasce paga");
    const tasks = await prisma.projectTask.findMany({ where: { project_id: projectId }, select: { occurrence_index: true, cycle_kind: true } });
    assert.ok(tasks.length > 0 && tasks.every((t) => t.occurrence_index === 0));
    assert.ok(tasks.every((t) => t.cycle_kind === "recorrencia_mensal"), "o 1º mês já é ciclo recorrente: " + JSON.stringify(tasks));
    const other = await mkPublishedProduct(`t12-${crypto.randomBytes(4).toString("hex")}`);
    const q = await createQuoteViaApi(CO_A.token, other.product.id);
    const r = await checkoutAndPay(CO_A.token, q.id);
    projects.push(r.projectId);
    assert.equal(await prisma.catalog2Subscription.count({ where: { project_product_id: r.projectProductId } }), 0);
  });

  it("2. fatura do mês seguinte: só sai perto do vencimento, nasce pendente e nunca duplica; estado vira 'aguardando renovação'", async () => {
    const { product } = await mkSubscription();
    const { sub, projectId } = await buySubscription(CO_A.token, product.id);
    let r = await tick();
    assert.equal(r.invoiced, 0, "ainda falta muito para vencer");
    await prisma.catalog2Subscription.update({ where: { id: sub.id }, data: { next_invoice_at: new Date(Date.now() - 1000) } });
    r = await tick();
    assert.equal(r.invoiced, 1);
    r = await tick();
    assert.equal(r.invoiced, 0, "rodar de novo não emite outra");
    const s = await subOf(sub.id);
    assert.equal(s.status, "aguardando_renovacao");
    assert.ok(s.pending_payment_id);
    const inv = await prisma.invoice.findMany({ where: { project_id: projectId }, orderBy: { created_at: "asc" } });
    assert.deepEqual(inv.map((i) => i.status), ["paid", "pending"], "uma fatura por mês");
    assert.equal(inv[1].due_date!.getTime(), s.current_period_end.getTime());
    assert.equal(await prisma.projectTask.count({ where: { project_id: projectId, occurrence_index: 1 } }), 0);
  });

  it("3. pagar: cartão recusado não libera nada; aprovado gera as tarefas do mês, renova o período e volta para 'ativa'", async () => {
    const { product } = await mkSubscription();
    const { sub, projectId } = await buySubscription(CO_A.token, product.id);
    await prisma.catalog2Subscription.update({ where: { id: sub.id }, data: { next_invoice_at: new Date(Date.now() - 1000) } });
    await tick();
    const denied = await api(`/api/catalog2/subscriptions/${sub.id}/pay`, { method: "POST", token: CO_A.token, body: { card_last_digits: "0002" } });
    assert.equal(denied.status, 200);
    assert.equal(denied.json.paid, false);
    assert.equal((await subOf(sub.id)).status, "aguardando_renovacao");
    assert.equal(await prisma.projectTask.count({ where: { project_id: projectId, occurrence_index: 1 } }), 0);

    const before = await subOf(sub.id);
    const ok = await api(`/api/catalog2/subscriptions/${sub.id}/pay`, { method: "POST", token: CO_A.token, body: {} });
    assert.equal(ok.json.paid, true, JSON.stringify(ok.json));
    const s = await subOf(sub.id);
    assert.equal(s.status, "ativa");
    assert.equal(s.current_cycle_index, 1);
    assert.equal(s.pending_payment_id, null);
    assert.equal(s.current_period_start.getTime(), before.current_period_end.getTime(), "o mês novo começa onde o anterior terminou");
    assert.equal(s.current_period_end.getTime(), addMonths(before.current_period_end, 1).getTime());
    assert.ok((await prisma.projectTask.count({ where: { project_id: projectId, occurrence_index: 1 } })) > 0, "tarefas do 2º mês criadas");
    assert.equal(await prisma.invoice.count({ where: { project_id: projectId, status: "paid" } }), 2);
    assert.equal((await api(`/api/catalog2/subscriptions/${sub.id}/pay`, { method: "POST", token: CO_A.token, body: {} })).status, 409);
    const hist = await api(`/api/catalog2/subscriptions/by-product/${sub.project_product_id}`, { token: CO_A.token });
    assert.equal(hist.json.months_paid, 2);
    assert.ok(hist.json.history.length >= 3, "histórico de estados registrado");
  });

  it("4. inadimplente: fatura vencida (com tolerância) marca a assinatura e a fatura; pagar normaliza", async () => {
    const { product } = await mkSubscription();
    const { sub, projectId } = await buySubscription(CO_A.token, product.id);
    await prisma.catalog2Subscription.update({ where: { id: sub.id }, data: { next_invoice_at: new Date(Date.now() - 1000) } });
    await tick();
    await prisma.catalog2Subscription.update({ where: { id: sub.id }, data: { current_period_end: new Date(Date.now() - DAY) } });
    assert.equal((await tick()).overdue, 0);
    assert.equal((await subOf(sub.id)).status, "aguardando_renovacao");
    await prisma.catalog2Subscription.update({ where: { id: sub.id }, data: { current_period_end: new Date(Date.now() - 10 * DAY) } });
    assert.equal((await tick()).overdue, 1);
    assert.equal((await subOf(sub.id)).status, "inadimplente");
    assert.equal((await prisma.invoice.findMany({ where: { project_id: projectId }, orderBy: { created_at: "desc" }, take: 1 }))[0].status, "overdue");
    const ok = await api(`/api/catalog2/subscriptions/${sub.id}/pay`, { method: "POST", token: CO_A.token, body: {} });
    assert.equal(ok.json.paid, true);
    const s = await subOf(sub.id);
    assert.equal(s.status, "ativa");
    assert.ok(s.current_period_end > new Date());
  });

  it("5. pausar e retomar (devolve o tempo já pago); pausada não recebe fatura", async () => {
    const { product } = await mkSubscription();
    const { sub } = await buySubscription(CO_A.token, product.id);
    const p = await api(`/api/catalog2/subscriptions/${sub.id}/pause`, { method: "POST", token: CO_A.token, body: { reason: "viagem" } });
    assert.equal(p.json.status, "pausada");
    await prisma.catalog2Subscription.update({ where: { id: sub.id }, data: { next_invoice_at: new Date(Date.now() - 1000) } });
    assert.equal((await tick()).invoiced, 0, "pausada nunca é cobrada");
    assert.equal((await api(`/api/catalog2/subscriptions/${sub.id}/pause`, { method: "POST", token: CO_A.token, body: {} })).status, 409, "já pausada");
    const r = await api(`/api/catalog2/subscriptions/${sub.id}/resume`, { method: "POST", token: CO_A.token, body: {} });
    assert.equal(r.json.status, "ativa");
    const s = await subOf(sub.id);
    assert.ok(s.current_period_end.getTime() - Date.now() > 25 * DAY, "o mês pago foi devolvido");
    assert.equal((await api(`/api/catalog2/subscriptions/${sub.id}/resume`, { method: "POST", token: CO_A.token, body: {} })).status, 409);
  });

  it("6. cancelar: para de cobrar, vale até o fim do mês pago e só então encerra; isolamento entre empresas", async () => {
    const { product } = await mkSubscription();
    const { sub } = await buySubscription(CO_A.token, product.id);
    await prisma.catalog2Subscription.update({ where: { id: sub.id }, data: { next_invoice_at: new Date(Date.now() - 1000) } });
    await tick();
    assert.equal((await api(`/api/catalog2/subscriptions/${sub.id}/cancel`, { method: "POST", token: CO_B.token, body: {} })).status, 404, "outra empresa não mexe");
    const c = await api(`/api/catalog2/subscriptions/${sub.id}/cancel`, { method: "POST", token: CO_A.token, body: { reason: "custo" } });
    assert.equal(c.json.status, "cancelada");
    assert.equal((await subOf(sub.id)).pending_payment_id, null);
    assert.equal(await prisma.invoice.count({ where: { project_id: sub.project_id, status: "cancelled" } }), 1, "a fatura aberta foi cancelada");
    assert.equal((await tick()).ended, 0, "o mês pago ainda vale");
    await prisma.catalog2Subscription.update({ where: { id: sub.id }, data: { current_period_end: new Date(Date.now() - 1000) } });
    assert.equal((await tick()).ended, 1);
    const e = await subOf(sub.id);
    assert.equal(e.status, "encerrada");
    assert.ok(e.ended_at);
    assert.equal((await api(`/api/catalog2/subscriptions/${sub.id}/cancel`, { method: "POST", token: CO_A.token, body: {} })).status, 409);
    const list = await api("/api/catalog2/subscriptions", { token: CO_B.token });
    assert.ok(!list.json.data.some((x: any) => x.id === sub.id));
    assert.equal((await api(`/api/catalog2/subscriptions/${sub.id}/issue-invoice`, { method: "POST", token: CO_A.token, body: {} })).status, 403);
  });

  it("7. modalidades: versão nova respeita avulso/recorrente; versão já publicada segue como antes", async () => {
    const legacy = await mkSubscription({ flags: { sale_modes_enforced: false, accepts_recurring: false } });
    assert.equal((await api("/api/catalog2/quotes", { method: "POST", token: CO_A.token, body: { product: legacy.product.id, selection: SEL, period: "mensal" } })).status, 201);
    const onlyOneTime = await mkSubscription({ flags: { sale_modes_enforced: true, accepts_one_time: true, accepts_recurring: false }, noRecurringDelivery: true });
    const a = await api("/api/catalog2/quotes", { method: "POST", token: CO_A.token, body: { product: onlyOneTime.product.id, selection: SEL, period: "mensal" } });
    assert.equal(a.status, 409, JSON.stringify(a.json));
    assert.equal(a.json.code, "sale_mode_not_accepted");
    assert.equal((await api("/api/catalog2/cart/items", { method: "POST", token: CO_A.token, body: { product: onlyOneTime.product.id, selection: SEL, period: "mensal" } })).status, 409);
    assert.equal((await api("/api/catalog2/quotes", { method: "POST", token: CO_A.token, body: { product: onlyOneTime.product.id, selection: SEL } })).status, 201, "avulso segue liberado");
    const onlyRec = await mkSubscription({ flags: { sale_modes_enforced: true, accepts_one_time: false, accepts_recurring: true } });
    assert.equal((await api("/api/catalog2/quotes", { method: "POST", token: CO_A.token, body: { product: onlyRec.product.id, selection: SEL } })).status, 409);
    assert.equal((await api("/api/catalog2/quotes", { method: "POST", token: CO_A.token, body: { product: onlyRec.product.id, selection: SEL, period: "mensal" } })).status, 201);
    const view = await api(`/api/catalog2/products/${onlyOneTime.product.id}`, { token: CO_A.token });
    assert.equal(view.json.sale_modes.recurring, false);
    assert.equal(view.json.available_periods.length, 0);
  });

  it("8. 'só em pacote': não fecha sozinho; fecha quando o pedido leva o pacote ativo inteiro", async () => {
    const solo = await mkSubscription({ flags: { sale_modes_enforced: true, sell_mode: "package_only", accepts_one_time: true } });
    const partner = await mkPublishedProduct(`t12-${crypto.randomBytes(4).toString("hex")}`);
    await prisma.catalog2ProductVersion.update({ where: { id: partner.versionId }, data: { sale_modes_enforced: true } });
    const q1 = (await api("/api/catalog2/quotes", { method: "POST", token: CO_A.token, body: { product: solo.product.id, selection: SEL } })).json;
    const c1 = await api("/api/catalog2/checkout", { method: "POST", token: CO_A.token, body: { quote_ids: [q1.id], checkout_client_action_id: crypto.randomUUID() } });
    assert.equal(c1.status, 409);
    assert.equal(c1.json.code, "package_only");
    const pkg = await prisma.catalog2Package.create({ data: { name: `[TESTE] Pacote ${crypto.randomBytes(3).toString("hex")}`, items: { create: [{ catalog2_product_id: solo.product.id }, { catalog2_product_id: partner.product.id }] } } });
    const c2 = await api("/api/catalog2/checkout", { method: "POST", token: CO_A.token, body: { quote_ids: [q1.id], checkout_client_action_id: crypto.randomUUID() } });
    assert.equal(c2.status, 409, "só com um dos itens ainda não vale");
    const q2 = (await api("/api/catalog2/quotes", { method: "POST", token: CO_A.token, body: { product: partner.product.id, selection: SEL } })).json;
    const c3 = await api("/api/catalog2/checkout", { method: "POST", token: CO_A.token, body: { quote_ids: [q1.id, q2.id], checkout_client_action_id: crypto.randomUUID() } });
    assert.equal(c3.status, 201, JSON.stringify(c3.json));
    projects.push(c3.json.project.id);
    await prisma.catalog2Package.delete({ where: { id: pkg.id } });
  });
});
