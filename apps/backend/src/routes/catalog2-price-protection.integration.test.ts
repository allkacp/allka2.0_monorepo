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

// Item 4 (reunião 2026-09-14, "Preços e proteção por 30 dias"): valida a
// regra de congelamento de preço, a janela de proteção de 30 dias e o fluxo
// de renovação de cotação vencida. "Relógio controlado" = manipulamos
// diretamente `valid_until` / `price_protection_started_at` já persistidos
// (mesmo padrão usado no resto da suíte catalog2, ver teste "13" em
// catalog2-catalog.integration.test.ts), nunca mockando Date.now().

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
  const c = await prisma.company.create({ data: { name: `[TESTE] Co7 ${tag}`, status: "ativo" } });
  companies.push(c.id);
  const id = `c7co-${crypto.randomBytes(5).toString("hex")}`;
  const u = await prisma.user.create({
    data: { id, email: `${id}@example.test`, password_hash: "x", name: `Co7 ${tag}`, role: "company_user", account_type: "empresas", is_active: true, status: "ativo", company_id: c.id },
  });
  users.push(u.id);
  return { user: u, token: tokenFor(u), companyId: c.id };
}
async function mkAdmin(master: boolean) {
  const p = await prisma.adminProfile.create({ data: { name: `C7 ${master ? "M" : "C"} ${crypto.randomBytes(4).toString("hex")}`, is_master: master, is_active: true } });
  adminProfiles.push(p.id);
  const id = `c7ad-${crypto.randomBytes(5).toString("hex")}`;
  const u = await prisma.user.create({
    data: { id, email: `${id}@example.test`, password_hash: "x", name: "Admin", role: "admin", account_type: "admin", is_active: true, status: "ativo", admin_profile_id: p.id },
  });
  users.push(u.id);
  return { user: u, token: tokenFor(u) };
}

async function setPricingSettings(marginPercent: number) {
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

/** Produto catalog2 publicado, comercialmente completo, sem variação obrigatória. */
async function mkPublishedProduct(slug: string) {
  const spec = await prisma.catalog2Specialty.findFirstOrThrow({ where: { key: "designer" } });
  await prisma.catalog2Specialty.update({ where: { id: spec.id }, data: { max_hourly_rate: 100 } });
  await setPricingSettings(30);
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
      tasks: {
        create: [{ key: "t1", name: "Tarefa fixa", execution_mode: "humano", specialty_id: spec.id, estimated_minutes: 60, sort_order: 1,
          steps: { create: [{ key: "s1", name: "Etapa única", sort_order: 1 }] } }],
      },
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

async function createQuoteViaApi(token: string, productId: string) {
  const r = await api("/api/catalog2/quotes", { method: "POST", token, body: { product: productId, selection: { variation_option_keys: [], addon_keys: [], quantity: 1, answers: {} } } });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  return r.json as { id: string; commercial_price: number; commercial_deadline_days: number };
}

let CO_A: Awaited<ReturnType<typeof mkCompanyUser>>;
let MASTER = "";

describe("Preços e proteção por 30 dias (Item 4, reunião 2026-09-14)", () => {
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
    await setPricingSettings(30);
  });

  after(async () => {
    await new Promise<void>((res, rej) => server.close((e) => (e ? rej(e) : res())));
    for (const id of projects.splice(0)) await purgeProject(id);
    for (const id of catProducts.splice(0)) await purgeProduct(id);
    await prisma.company.deleteMany({ where: { id: { in: companies } } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: { in: users } } }).catch(() => {});
    await prisma.adminProfile.deleteMany({ where: { id: { in: adminProfiles } } }).catch(() => {});
  });

  it("1. cotação nova gerada depois de uma alteração comercial usa o preço ATUAL", async () => {
    const { product } = await mkPublishedProduct(`t7-${crypto.randomBytes(4).toString("hex")}`);
    const q1 = await createQuoteViaApi(CO_A.token, product.id);
    await api(`/api/catalog2/quotes/${q1.id}/cancel`, { method: "POST", token: CO_A.token });

    await setPricingSettings(80); // sobe a margem → preço sobe

    const q2 = await createQuoteViaApi(CO_A.token, product.id);
    assert.notEqual(q2.commercial_price, q1.commercial_price);
    assert.ok(q2.commercial_price > q1.commercial_price);
  });

  it("2. cotação já gerada mantém o preço ANTIGO enquanto está dentro da proteção de 30 dias e da própria validade", async () => {
    const { product } = await mkPublishedProduct(`t7-${crypto.randomBytes(4).toString("hex")}`);
    const q1 = await createQuoteViaApi(CO_A.token, product.id);
    const frozenPrice = q1.commercial_price;

    await setPricingSettings(80); // desvio de preço detectado na próxima revalidação

    const rev = await api(`/api/catalog2/quotes/${q1.id}/revalidate`, { method: "POST", token: CO_A.token });
    assert.equal(rev.status, 200);
    assert.equal(rev.json.status, "valida", "continua válida — protegida, não expira imediatamente");
    assert.equal(rev.json.commercial_price, frozenPrice, "preço da cotação nunca é sobrescrito enquanto protegida");
    assert.equal(rev.json.protected, true);
    assert.ok(rev.json.price_protection_ends_at, "deve expor o prazo até quando está protegida");
    assert.match(rev.json.recalc_reason ?? "", /protegida/i);
    assert.notEqual(rev.json.fresh_pricing?.commercial_price, frozenPrice, "fresh_pricing mostra o valor ATUAL, diferente do congelado");
  });

  it("3. cotação vencida (proteção encerrada) não pode virar pedido sem renovação explícita", async () => {
    const { product } = await mkPublishedProduct(`t7-${crypto.randomBytes(4).toString("hex")}`);
    const q1 = await createQuoteViaApi(CO_A.token, product.id);
    // valid_until bem no futuro para isolar do TTL de 72h — só a proteção de
    // preço é que deve determinar a expiração aqui.
    await prisma.catalog2Quote.update({
      where: { id: q1.id },
      data: { valid_until: new Date(Date.now() + 60 * DAY), price_protection_started_at: new Date(Date.now() - 31 * DAY) },
    });
    await setPricingSettings(80);

    const rev = await api(`/api/catalog2/quotes/${q1.id}/revalidate`, { method: "POST", token: CO_A.token });
    assert.equal(rev.json.status, "expirada");
    assert.equal(rev.json.needs_recalc, true);
    assert.equal(rev.json.protected, false);
    assert.match(rev.json.recalc_reason ?? "", /proteção de 30 dias terminou/i);

    const checkout = await api("/api/catalog2/checkout", { method: "POST", token: CO_A.token, body: { quote_ids: [q1.id], checkout_client_action_id: crypto.randomUUID() } });
    assert.equal(checkout.status, 409);
    assert.equal(checkout.json.code, "quote_stale");
    const count = await prisma.projectProduct.count({ where: { origin_catalog2_quote_id: q1.id } });
    assert.equal(count, 0);
  });

  it("4. renovar uma cotação vencida (proteção encerrada) gera cotação nova com valores atuais e preserva a antiga como histórico", async () => {
    const { product } = await mkPublishedProduct(`t7-${crypto.randomBytes(4).toString("hex")}`);
    const q1 = await createQuoteViaApi(CO_A.token, product.id);
    const oldPrice = q1.commercial_price;
    await prisma.catalog2Quote.update({
      where: { id: q1.id },
      data: { valid_until: new Date(Date.now() + 60 * DAY), price_protection_started_at: new Date(Date.now() - 31 * DAY) },
    });
    await setPricingSettings(80);

    const renew = await api(`/api/catalog2/quotes/${q1.id}/renew`, { method: "POST", token: CO_A.token });
    assert.equal(renew.status, 200, JSON.stringify(renew.json));
    assert.equal(renew.json.renewed, true);
    assert.equal(renew.json.previous.commercial_price, oldPrice);
    assert.equal(renew.json.changed.price, true);
    assert.notEqual(renew.json.quote.commercial_price, oldPrice);
    assert.equal(renew.json.quote.renewed_from_quote_id, q1.id);
    assert.equal(renew.json.quote.status, "valida");

    // a cotação antiga NUNCA é apagada nem tem o preço sobrescrito — vira histórico.
    const oldReloaded = await prisma.catalog2Quote.findUniqueOrThrow({ where: { id: q1.id } });
    assert.equal(oldReloaded.commercial_price, oldPrice);
    assert.equal(oldReloaded.status, "expirada");

    // o checkout agora só aceita a cotação NOVA.
    const checkoutOld = await api("/api/catalog2/checkout", { method: "POST", token: CO_A.token, body: { quote_ids: [q1.id], checkout_client_action_id: crypto.randomUUID() } });
    assert.equal(checkoutOld.status, 409);
    const checkoutNew = await api("/api/catalog2/checkout", { method: "POST", token: CO_A.token, body: { quote_ids: [renew.json.quote.id], checkout_client_action_id: crypto.randomUUID() } });
    assert.equal(checkoutNew.status, 201, JSON.stringify(checkoutNew.json));
    projects.push(checkoutNew.json.project.id);
  });

  it("5. fronteira exata dos 30 dias, e alterações comerciais sucessivas não estendem a proteção", async () => {
    const { product } = await mkPublishedProduct(`t7-${crypto.randomBytes(4).toString("hex")}`);
    const q1 = await createQuoteViaApi(CO_A.token, product.id);
    await prisma.catalog2Quote.update({ where: { id: q1.id }, data: { valid_until: new Date(Date.now() + 60 * DAY) } });

    // Dia 1: primeiro desvio de preço detectado — âncora a proteção agora.
    await setPricingSettings(50);
    const day1 = await api(`/api/catalog2/quotes/${q1.id}/revalidate`, { method: "POST", token: CO_A.token });
    assert.equal(day1.json.status, "valida");
    assert.equal(day1.json.protected, true);
    const anchor = new Date(day1.json.price_protection_started_at);

    // Dia 29 a partir da âncora: MUDA de novo o preço (sucessiva) — a
    // âncora não pode ser reancorada por isso.
    await prisma.catalog2Quote.update({ where: { id: q1.id }, data: { price_protection_started_at: new Date(anchor.getTime() - 29 * DAY) } });
    await setPricingSettings(65);
    const day29 = await api(`/api/catalog2/quotes/${q1.id}/revalidate`, { method: "POST", token: CO_A.token });
    assert.equal(day29.json.status, "valida", "ainda dentro da janela de 30 dias");
    assert.equal(day29.json.protected, true);
    assert.equal(new Date(day29.json.price_protection_started_at).getTime(), new Date(anchor.getTime() - 29 * DAY).getTime(), "âncora não se move com desvios sucessivos");

    // Exatamente 30 dias a partir da âncora original: não está mais protegida.
    await prisma.catalog2Quote.update({ where: { id: q1.id }, data: { price_protection_started_at: new Date(anchor.getTime() - 30 * DAY) } });
    const day30 = await api(`/api/catalog2/quotes/${q1.id}/revalidate`, { method: "POST", token: CO_A.token });
    assert.equal(day30.json.status, "expirada", "no limite exato de 30 dias a proteção já terminou");
    assert.equal(day30.json.protected, false);
  });

  it("6. renovação é bloqueada quando o produto está indisponível ou o preço não é calculável — a cotação vencida permanece intacta", async () => {
    const { product } = await mkPublishedProduct(`t7-${crypto.randomBytes(4).toString("hex")}`);
    const q1 = await createQuoteViaApi(CO_A.token, product.id);
    await prisma.catalog2Quote.update({
      where: { id: q1.id },
      data: { valid_until: new Date(Date.now() + 60 * DAY), price_protection_started_at: new Date(Date.now() - 31 * DAY) },
    });
    await setPricingSettings(80);

    // produto pausado → não contratável.
    await prisma.catalog2Product.update({ where: { id: product.id }, data: { status: "temporariamente_inativo" } });
    const renewBlocked = await api(`/api/catalog2/quotes/${q1.id}/renew`, { method: "POST", token: CO_A.token });
    assert.equal(renewBlocked.status, 409);
    assert.equal(renewBlocked.json.code, "not_quotable");
    await prisma.catalog2Product.update({ where: { id: product.id }, data: { status: "disponivel" } });

    // preço não calculável (ordem dos componentes some).
    await prisma.catalog2PricingSettings.update({ where: { id: "default" }, data: { component_order_json: null } });
    const renewBroken = await api(`/api/catalog2/quotes/${q1.id}/renew`, { method: "POST", token: CO_A.token });
    assert.equal(renewBroken.status, 409);
    await setPricingSettings(80);

    // em nenhum dos dois casos a cotação antiga foi alterada ou uma nova foi criada.
    const stillThere = await prisma.catalog2Quote.findUniqueOrThrow({ where: { id: q1.id } });
    assert.equal(stillThere.status, "expirada");
    assert.equal(stillThere.commercial_price, q1.commercial_price);
    const renewalCount = await prisma.catalog2Quote.count({ where: { renewed_from_quote_id: q1.id } });
    assert.equal(renewalCount, 0);
  });

  it("7. contratação já paga (ProjectProduct/pedido) permanece intacta — não é tocada por alteração comercial nem por proteção/renovação", async () => {
    const { product } = await mkPublishedProduct(`t7-${crypto.randomBytes(4).toString("hex")}`);
    const q1 = await createQuoteViaApi(CO_A.token, product.id);
    const paidPrice = q1.commercial_price;
    const checkout = await api("/api/catalog2/checkout", { method: "POST", token: CO_A.token, body: { quote_ids: [q1.id], checkout_client_action_id: crypto.randomUUID() } });
    assert.equal(checkout.status, 201, JSON.stringify(checkout.json));
    projects.push(checkout.json.project.id);
    assert.equal(checkout.json.project_products[0].preco_final_cliente_snapshot, paidPrice);

    await setPricingSettings(90);

    // renovar/revalidar uma cotação já convertida é recusado — a
    // contratação já paga não é "renovada" por engano.
    const renew = await api(`/api/catalog2/quotes/${q1.id}/renew`, { method: "POST", token: CO_A.token });
    assert.equal(renew.status, 409);
    assert.equal(renew.json.code, "quote_already_converted");

    const pp = await prisma.projectProduct.findUniqueOrThrow({ where: { origin_catalog2_quote_id: q1.id } });
    assert.equal(pp.preco_final_cliente_snapshot, paidPrice, "snapshot do pedido pago nunca muda com alteração comercial posterior");
    const quoteReloaded = await prisma.catalog2Quote.findUniqueOrThrow({ where: { id: q1.id } });
    assert.equal(quoteReloaded.commercial_price, paidPrice);
    assert.equal(quoteReloaded.status, "convertida");
  });

  it("8. valor alterado exige NOVA aceitação — a cotação antiga não pode mais ser usada para checkout depois de renovada", async () => {
    const { product } = await mkPublishedProduct(`t7-${crypto.randomBytes(4).toString("hex")}`);
    const q1 = await createQuoteViaApi(CO_A.token, product.id);
    await prisma.catalog2Quote.update({
      where: { id: q1.id },
      data: { valid_until: new Date(Date.now() + 60 * DAY), price_protection_started_at: new Date(Date.now() - 31 * DAY) },
    });
    await setPricingSettings(80);
    const renew = await api(`/api/catalog2/quotes/${q1.id}/renew`, { method: "POST", token: CO_A.token });
    assert.equal(renew.status, 200);

    // a API nunca reaproveita silenciosamente a aprovação antiga: o
    // checkout com o id antigo continua bloqueado mesmo depois da renovação
    // ter acontecido (idempotência não se aplica entre cotações DIFERENTES).
    const checkoutOld = await api("/api/catalog2/checkout", { method: "POST", token: CO_A.token, body: { quote_ids: [q1.id], checkout_client_action_id: crypto.randomUUID() } });
    assert.equal(checkoutOld.status, 409);
    assert.equal(checkoutOld.json.code, "quote_stale");
  });

  it("9. dado provisório nunca vira preço comercial definitivo via renovação/proteção", async () => {
    const { product } = await mkPublishedProduct(`t7-${crypto.randomBytes(4).toString("hex")}`);
    // preview administrativo provisório do mesmo produto não interfere —
    // garante que renovação sempre recalcula pela regra comercial real
    // (computePricing), nunca herda price_amount de ProvisionalPreview.
    await prisma.catalog2ProvisionalPreview.create({
      data: { product_id: product.id, image_path: "/images/x.svg", price_amount: 999999, deadline_days: 1, modality: "Sob demanda" },
    });
    const q1 = await createQuoteViaApi(CO_A.token, product.id);
    await prisma.catalog2Quote.update({
      where: { id: q1.id },
      data: { valid_until: new Date(Date.now() + 60 * DAY), price_protection_started_at: new Date(Date.now() - 31 * DAY) },
    });
    await setPricingSettings(80);
    const renew = await api(`/api/catalog2/quotes/${q1.id}/renew`, { method: "POST", token: CO_A.token });
    assert.equal(renew.status, 200);
    assert.notEqual(renew.json.quote.commercial_price, 999999);
    await prisma.catalog2ProvisionalPreview.deleteMany({ where: { product_id: product.id } });
  });

  it("10. renovar uma cotação que ainda está válida (nunca expirou) é um no-op — não cria nada novo", async () => {
    const { product } = await mkPublishedProduct(`t7-${crypto.randomBytes(4).toString("hex")}`);
    const q1 = await createQuoteViaApi(CO_A.token, product.id);
    const renew = await api(`/api/catalog2/quotes/${q1.id}/renew`, { method: "POST", token: CO_A.token });
    assert.equal(renew.status, 200);
    assert.equal(renew.json.renewed, false);
    assert.equal(renew.json.quote.id, q1.id);
    const renewalCount = await prisma.catalog2Quote.count({ where: { renewed_from_quote_id: q1.id } });
    assert.equal(renewalCount, 0);
  });
});
