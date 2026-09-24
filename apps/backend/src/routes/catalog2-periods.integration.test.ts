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

// Estas provas exercitam a capacidade preparada para uma liberação futura
// de contratos com mais de um mês. Em ambiente normal, a chave não existe e
// só o período mensal é contratável (decisão da reunião de 18/09/2026).
process.env.CATALOG2_ENABLE_MULTI_PERIOD_CONTRACTS = "true";

// Item 6 (reunião 2026-09-14, "Modalidades de contratação por período") —
// mensal/trimestral/semestral/anual, com desconto progressivo configurado
// pelo admin, pagamento antecipado e proteção de preço durante o período.
// "Configurações fictícias" só em banco descartável, nunca no allka real.

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
  const c = await prisma.company.create({ data: { name: `[TESTE] Co10 ${tag}`, status: "ativo" } });
  companies.push(c.id);
  const id = `c10co-${crypto.randomBytes(5).toString("hex")}`;
  const u = await prisma.user.create({
    data: { id, email: `${id}@example.test`, password_hash: "x", name: `Co10 ${tag}`, role: "company_user", account_type: "empresas", is_active: true, status: "ativo", company_id: c.id },
  });
  users.push(u.id);
  return { user: u, token: tokenFor(u), companyId: c.id };
}
async function mkAdmin(master: boolean) {
  const p = await prisma.adminProfile.create({ data: { name: `C10 ${master ? "M" : "C"} ${crypto.randomBytes(4).toString("hex")}`, is_master: master, is_active: true } });
  adminProfiles.push(p.id);
  const id = `c10ad-${crypto.randomBytes(5).toString("hex")}`;
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
        steps: { create: [{ key: "s1", name: "Etapa única", sort_order: 1 }] } }] },
    },
  });
  await publishVersion(v.id, "system", { changeSummary: "publicação de teste" });
  return { product: await prisma.catalog2Product.findUniqueOrThrow({ where: { id: product.id } }), versionId: v.id };
}

async function purgeProject(id: string) {
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

async function configurePeriod(token: string, productId: string, period: string, discount: number) {
  const r = await api(`/api/admin/catalog2/products/${productId}/periods/${period}`, { method: "PUT", token, body: { discount_percent: discount, is_active: true } });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  return r.json;
}

// Item 6.1 (reunião 2026-09-14, "Completar a execução dos períodos"): a
// formula preço×meses só vale — e o período só fica contratável — quando o
// produto é explicitamente marcado como entrega mensal recorrente. Testes
// deste arquivo (Item 6) precisam disso pra continuarem exercitando compra
// por período de verdade; a AUSÊNCIA dessa marcação é coberta à parte no
// arquivo catalog2-delivery-cycles.integration.test.ts (Item 6.1).
async function setDeliveryRecurrence(token: string, productId: string, value: string | null) {
  const r = await api(`/api/admin/catalog2/products/${productId}/delivery-recurrence`, { method: "PUT", token, body: { delivery_recurrence: value } });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  return r.json;
}

async function createQuoteViaApi(token: string, productId: string, period?: string) {
  const r = await api("/api/catalog2/quotes", { method: "POST", token, body: { product: productId, selection: { variation_option_keys: [], addon_keys: [], quantity: 1, answers: {} }, ...(period ? { period } : {}) } });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  return r.json;
}

let CO_A: Awaited<ReturnType<typeof mkCompanyUser>>;
let MASTER = "";

describe("Modalidades de contratação por período (Item 6, reunião 2026-09-14)", () => {
  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    await seedCatalog2FourFForTests(prisma);
    await seedCatalog2Classifications(prisma);
    CO_A = await mkCompanyUser("A");
    MASTER = (await mkAdmin(true)).token;
    server = app.listen(0);
    await new Promise<void>((r) => server.once("listening", () => r()));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  beforeEach(async () => {
    await setPricingSettings();
  });
  after(async () => {
    await new Promise<void>((res, rej) => server.close((e) => (e ? rej(e) : res())));
    for (const id of projects.splice(0)) await purgeProject(id);
    for (const id of catProducts.splice(0)) await purgeProduct(id);
    await prisma.company.deleteMany({ where: { id: { in: companies } } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: { in: users } } }).catch(() => {});
    await prisma.adminProfile.deleteMany({ where: { id: { in: adminProfiles } } }).catch(() => {});
  });

  it("1. cada período calcula total/desconto corretamente a partir do MESMO motor (computePricing)", async () => {
    const { product } = await mkPublishedProduct(`t10-${crypto.randomBytes(4).toString("hex")}`);
    await setDeliveryRecurrence(MASTER, product.id, "mensal");
    await configurePeriod(MASTER, product.id, "mensal", 5);
    await configurePeriod(MASTER, product.id, "trimestral", 10);
    await configurePeriod(MASTER, product.id, "semestral", 15);
    await configurePeriod(MASTER, product.id, "anual", 20);

    const adminList = await api(`/api/admin/catalog2/products/${product.id}/periods`, { token: MASTER });
    assert.equal(adminList.status, 200);
    assert.equal(adminList.json.data.length, 4);
    for (const row of adminList.json.data) {
      assert.equal(row.configured, true);
      assert.equal(row.is_active, true);
    }

    const detail = await api(`/api/catalog2/products/${product.slug}`, { token: CO_A.token });
    assert.equal(detail.status, 200);
    assert.equal(detail.json.available_periods.length, 4);
    const referenceMonthly = detail.json.pricing.commercial_price;
    assert.ok(referenceMonthly > 0);

    const expectedMonths: Record<string, number> = { mensal: 1, trimestral: 3, semestral: 6, anual: 12 };
    const expectedDiscount: Record<string, number> = { mensal: 5, trimestral: 10, semestral: 15, anual: 20 };
    for (const pp of detail.json.available_periods) {
      assert.equal(pp.available, true);
      assert.equal(pp.months, expectedMonths[pp.period]);
      assert.equal(pp.discount_percent, expectedDiscount[pp.period]);
      assert.equal(pp.reference_monthly_price, referenceMonthly);
      const expectedTotal = Math.round(referenceMonthly * pp.months * (1 - pp.discount_percent / 100) * 100) / 100;
      assert.equal(pp.total_price, expectedTotal);
      assert.equal(pp.monthly_equivalent_price, Math.round((expectedTotal / pp.months) * 100) / 100);
      assert.ok(pp.total_price < referenceMonthly * pp.months, "total com desconto deve ser menor que sem desconto");
    }
    // progressivo: anual tem o MAIOR desconto relativo configurado aqui.
    const anual = detail.json.available_periods.find((p: any) => p.period === "anual");
    const mensal = detail.json.available_periods.find((p: any) => p.period === "mensal");
    assert.ok(anual.monthly_equivalent_price < mensal.reference_monthly_price);
  });

  it("2. produto avulso continua preservado — cotação/configuração sem período funcionam exatamente como antes", async () => {
    const { product } = await mkPublishedProduct(`t10-${crypto.randomBytes(4).toString("hex")}`);
    await configurePeriod(MASTER, product.id, "anual", 20); // configurado, mas não pedido

    const cfg = await api(`/api/catalog2/products/${product.slug}/configure`, { method: "POST", token: CO_A.token, body: { variation_option_keys: [], addon_keys: [] } });
    assert.equal(cfg.status, 200);
    assert.equal(cfg.json.period, null);
    assert.equal(cfg.json.period_pricing, null);
    assert.ok(cfg.json.pricing.commercial_price > 0);

    const quote = await createQuoteViaApi(CO_A.token, product.id); // sem period
    assert.equal(quote.contract_period, null);
    assert.equal(quote.commercial_price, cfg.json.pricing.commercial_price);
  });

  it("3. período SEM configuração é bloqueado pela API — cotação, cesta e detalhe nunca inventam desconto", async () => {
    const { product } = await mkPublishedProduct(`t10-${crypto.randomBytes(4).toString("hex")}`);
    // entrega recorrente definida (Item 6.1) — o que falta aqui é só o
    // desconto do período em si, propósito original deste teste (Item 6).
    await setDeliveryRecurrence(MASTER, product.id, "mensal");
    // nenhum período configurado.
    const detail = await api(`/api/catalog2/products/${product.slug}`, { token: CO_A.token });
    assert.equal(detail.json.available_periods.length, 0, "nenhum período aparece disponível sem configuração");

    const q = await api("/api/catalog2/quotes", { method: "POST", token: CO_A.token, body: { product: product.id, selection: { variation_option_keys: [], addon_keys: [] }, period: "anual" } });
    assert.equal(q.status, 409);
    assert.equal(q.json.code, "not_commercial_ready");
    assert.match(q.json.error, /não está configurado/);

    const cart = await api("/api/catalog2/cart/items", { method: "POST", token: CO_A.token, body: { product: product.id, selection: { variation_option_keys: [], addon_keys: [] }, period: "mensal" } });
    assert.equal(cart.status, 409);
    assert.equal(cart.json.code, "period_not_available");

    // configura só mensal — trimestral continua bloqueado.
    await configurePeriod(MASTER, product.id, "mensal", 5);
    const stillBlocked = await api("/api/catalog2/quotes", { method: "POST", token: CO_A.token, body: { product: product.id, selection: { variation_option_keys: [], addon_keys: [] }, period: "trimestral" } });
    assert.equal(stillBlocked.status, 409);
    const nowOk = await api("/api/catalog2/quotes", { method: "POST", token: CO_A.token, body: { product: product.id, selection: { variation_option_keys: [], addon_keys: [] }, period: "mensal" } });
    assert.equal(nowOk.status, 201);
  });

  it("4. alteração de preço/desconto após o pagamento não modifica o contrato já pago", async () => {
    const { product } = await mkPublishedProduct(`t10-${crypto.randomBytes(4).toString("hex")}`);
    await setDeliveryRecurrence(MASTER, product.id, "mensal");
    await configurePeriod(MASTER, product.id, "anual", 20);
    const quote = await createQuoteViaApi(CO_A.token, product.id, "anual");
    const paidTotal = quote.commercial_price;
    const paidMonths = quote.contract_period_months;
    const paidDiscount = quote.contract_period_discount_percent;

    const checkout = await api("/api/catalog2/checkout", { method: "POST", token: CO_A.token, body: { quote_ids: [quote.id], checkout_client_action_id: crypto.randomUUID() } });
    assert.equal(checkout.status, 201, JSON.stringify(checkout.json));
    const projectId = checkout.json.project.id;
    projects.push(projectId);
    assert.equal(checkout.json.project_products[0].preco_final_cliente_snapshot, paidTotal);

    // alteração comercial DEPOIS do pagamento — margem sobe e o desconto do período muda.
    await setPricingSettings(90);
    await configurePeriod(MASTER, product.id, "anual", 50);

    const pp = await prisma.projectProduct.findUniqueOrThrow({ where: { origin_catalog2_quote_id: quote.id } });
    assert.equal(pp.preco_final_cliente_snapshot, paidTotal);
    assert.equal(pp.catalog2_period, "anual");
    assert.equal(pp.catalog2_period_months, paidMonths);
    assert.equal(pp.catalog2_period_discount_percent, paidDiscount);
    assert.ok(pp.catalog2_period_ends_at, "prazo de proteção do preço (fim do período) deve estar gravado");
    await setPricingSettings();
    await configurePeriod(MASTER, product.id, "anual", 20);
  });

  it("5. renovação de proposta com período vencida respeita a proteção e exige nova aceitação", async () => {
    const { product } = await mkPublishedProduct(`t10-${crypto.randomBytes(4).toString("hex")}`);
    await setDeliveryRecurrence(MASTER, product.id, "mensal");
    await configurePeriod(MASTER, product.id, "trimestral", 10);
    const quote = await createQuoteViaApi(CO_A.token, product.id, "trimestral");
    const oldTotal = quote.commercial_price;

    // Ainda dentro da proteção (só a validade própria venceu) — reemite o MESMO total.
    await prisma.catalog2Quote.update({
      where: { id: quote.id },
      data: { valid_until: new Date(Date.now() - 1000), price_protection_started_at: new Date(Date.now() - 5 * DAY), price_protection_anchor_source: "event_log" },
    });
    await configurePeriod(MASTER, product.id, "trimestral", 40); // desvio detectável, mas ainda protegido
    const renewA = await api(`/api/catalog2/quotes/${quote.id}/renew`, { method: "POST", token: CO_A.token });
    assert.equal(renewA.status, 200, JSON.stringify(renewA.json));
    assert.equal(renewA.json.mode, "reissued");
    assert.equal(renewA.json.quote.commercial_price, oldTotal);
    assert.equal(renewA.json.quote.contract_period, "trimestral");

    // Nova cotação de teste com período: proteção JÁ terminou de verdade → recalcula.
    const quote2 = await createQuoteViaApi(CO_A.token, product.id, "trimestral");
    await prisma.catalog2Quote.update({
      where: { id: quote2.id },
      data: { valid_until: new Date(Date.now() + 60 * DAY), price_protection_started_at: new Date(Date.now() - 31 * DAY), price_protection_anchor_source: "event_log" },
    });
    const renewB = await api(`/api/catalog2/quotes/${quote2.id}/renew`, { method: "POST", token: CO_A.token });
    assert.equal(renewB.status, 200, JSON.stringify(renewB.json));
    assert.equal(renewB.json.mode, "recomputed");
    assert.notEqual(renewB.json.quote.commercial_price, quote2.commercial_price);
    assert.equal(renewB.json.quote.contract_period, "trimestral");
    assert.equal(renewB.json.quote.contract_period_discount_percent, 40);

    // a cotação antiga nunca é usada pra checkout depois de renovada — nova aceitação exigida.
    const checkoutOld = await api("/api/catalog2/checkout", { method: "POST", token: CO_A.token, body: { quote_ids: [quote2.id], checkout_client_action_id: crypto.randomUUID() } });
    assert.equal(checkoutOld.status, 409);
    const checkoutNew = await api("/api/catalog2/checkout", { method: "POST", token: CO_A.token, body: { quote_ids: [renewB.json.quote.id], checkout_client_action_id: crypto.randomUUID() } });
    assert.equal(checkoutNew.status, 201, JSON.stringify(checkoutNew.json));
    projects.push(checkoutNew.json.project.id);
    await configurePeriod(MASTER, product.id, "trimestral", 10);
  });

  it("6. pagamento repetido (retry) não duplica contratação nem tarefas, com período contratado", async () => {
    const { product } = await mkPublishedProduct(`t10-${crypto.randomBytes(4).toString("hex")}`);
    await setDeliveryRecurrence(MASTER, product.id, "mensal");
    await configurePeriod(MASTER, product.id, "semestral", 12);
    const quote = await createQuoteViaApi(CO_A.token, product.id, "semestral");
    const checkout = await api("/api/catalog2/checkout", { method: "POST", token: CO_A.token, body: { quote_ids: [quote.id], checkout_client_action_id: crypto.randomUUID() } });
    assert.equal(checkout.status, 201);
    const projectId = checkout.json.project.id;
    projects.push(projectId);

    const pay1 = await api("/api/payments/fake-checkout", { method: "POST", token: CO_A.token, body: { project_id: projectId } });
    assert.equal(pay1.status, 201, JSON.stringify(pay1.json));
    const taskCount1 = await prisma.projectTask.count({ where: { project_id: projectId } });
    const paymentCount1 = await prisma.payment.count({ where: { project_id: projectId } });

    const pay2 = await api("/api/payments/fake-checkout", { method: "POST", token: CO_A.token, body: { project_id: projectId } });
    assert.equal(pay2.status, 201); // idempotente — já processado, retorna o mesmo resultado
    assert.equal(pay2.json.alreadyProcessed, true);
    assert.equal(await prisma.projectTask.count({ where: { project_id: projectId } }), taskCount1);
    assert.equal(await prisma.payment.count({ where: { project_id: projectId } }), paymentCount1);
    assert.equal(await prisma.projectProduct.count({ where: { project_id: projectId } }), 1);
  });

  it("7. coerência entre carrinho, cotação e valor efetivamente cobrado", async () => {
    const { product } = await mkPublishedProduct(`t10-${crypto.randomBytes(4).toString("hex")}`);
    await setDeliveryRecurrence(MASTER, product.id, "mensal");
    await configurePeriod(MASTER, product.id, "anual", 8);

    const cartAdd = await api("/api/catalog2/cart/items", { method: "POST", token: CO_A.token, body: { product: product.id, selection: { variation_option_keys: [], addon_keys: [] }, period: "anual" } });
    assert.equal(cartAdd.status, 201);
    const cart = await api("/api/catalog2/cart", { token: CO_A.token });
    const cartItem = cart.json.items.find((i: any) => i.id === cartAdd.json.item_id);
    assert.equal(cartItem.period, "anual");
    const cartTotal = cartItem.period_pricing.total_price;

    const quote = await createQuoteViaApi(CO_A.token, product.id, "anual");
    assert.equal(quote.commercial_price, cartTotal, "cesta e cotação devem coincidir pra mesma seleção/período");

    const checkout = await api("/api/catalog2/checkout", { method: "POST", token: CO_A.token, body: { quote_ids: [quote.id], checkout_client_action_id: crypto.randomUUID() } });
    assert.equal(checkout.status, 201, JSON.stringify(checkout.json));
    projects.push(checkout.json.project.id);
    assert.equal(checkout.json.project_products[0].preco_final_cliente_snapshot, cartTotal, "valor cobrado no checkout deve coincidir com cesta/cotação");

    await api("/api/catalog2/cart/clear", { method: "POST", token: CO_A.token });
  });

  it("8. regra existente (Item 5) respeitada: inativação programada bloqueia contratação de QUALQUER período, mesmo já configurado", async () => {
    const { product } = await mkPublishedProduct(`t10-${crypto.randomBytes(4).toString("hex")}`);
    await configurePeriod(MASTER, product.id, "mensal", 5);
    await api(`/api/admin/catalog2/products/${product.id}/inactivation/schedule`, { method: "POST", token: MASTER, body: {} });

    const q = await api("/api/catalog2/quotes", { method: "POST", token: CO_A.token, body: { product: product.id, selection: { variation_option_keys: [], addon_keys: [] }, period: "mensal" } });
    assert.equal(q.status, 409);
    assert.equal(q.json.code, "not_quotable");

    const detail = await api(`/api/catalog2/products/${product.slug}`, { token: CO_A.token });
    assert.equal(detail.json.can_contract, false);
    assert.match(detail.json.contract_blocked_reason ?? "", /Inativação programada/);
  });
});
