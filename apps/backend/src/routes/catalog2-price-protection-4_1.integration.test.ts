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

// Item 4.1 (reunião 2026-09-14, "Ajustar a proteção comercial") — cobre os
// 3 ajustes pedidos sobre o Item 4:
//   1. a proteção de 30 dias conta da data REAL da alteração comercial
//      (Catalog2CommercialChangeEvent), não da data da primeira consulta;
//   2. trocar de versão publicada com o MESMO escopo (só preço diferente)
//      não é mais tratado como quebra estrutural — só quando a seleção
//      congelada fica incompatível de verdade;
//   3. renovar dentro da proteção reemite o MESMO preço; só recalcula
//      depois que a proteção termina de verdade; e um aditivo aprovado com
//      o preço antigo é revinculado/desaprovado quando o preço muda.
// "Relógio controlado" = manipulação direta de datas já persistidas
// (created_at da cotação, occurred_at do evento) — nunca mock de Date.now().

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
  const c = await prisma.company.create({ data: { name: `[TESTE] Co8 ${tag}`, status: "ativo" } });
  companies.push(c.id);
  const id = `c8co-${crypto.randomBytes(5).toString("hex")}`;
  const u = await prisma.user.create({
    data: { id, email: `${id}@example.test`, password_hash: "x", name: `Co8 ${tag}`, role: "company_user", account_type: "empresas", is_active: true, status: "ativo", company_id: c.id },
  });
  users.push(u.id);
  return { user: u, token: tokenFor(u), companyId: c.id };
}
async function mkAdmin(master: boolean) {
  const p = await prisma.adminProfile.create({ data: { name: `C8 ${master ? "M" : "C"} ${crypto.randomBytes(4).toString("hex")}`, is_master: master, is_active: true } });
  adminProfiles.push(p.id);
  const id = `c8ad-${crypto.randomBytes(5).toString("hex")}`;
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

/** Produto catalog2 publicado, sem variação obrigatória, com 1 variação
 * OPCIONAL "formato" (estatico default / carrossel com custo extra) — usada
 * pra montar uma v2 compatível (mesmas chaves) ou incompatível (chave removida). */
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
  await prisma.catalog2Variation.create({
    data: {
      version_id: v.id, key: "formato", name: "Formato", is_required: false, sort_order: 1,
      options: { create: [{ key: "estatico", label: "Estático", is_default: true, sort_order: 1 }, { key: "carrossel", label: "Carrossel", sort_order: 2 }] },
    },
  });
  await publishVersion(v.id, "system", { changeSummary: "publicação de teste" });
  return { product: await prisma.catalog2Product.findUniqueOrThrow({ where: { id: product.id } }), versionId: v.id, specialtyId: spec.id };
}

/** Cria e publica uma v2 do MESMO produto, com o mesmo conjunto de tarefas
 * e a MESMA variação/chaves de opção do v1 — mudança "só de preço" (via
 * `extraFixedCost` no efeito da opção "carrossel"), nunca de escopo. */
async function publishCompatibleV2(productId: string, extraFixedCost: number) {
  const spec = await prisma.catalog2Specialty.findFirstOrThrow({ where: { key: "designer" } });
  const v2 = await prisma.catalog2ProductVersion.create({
    data: {
      product_id: productId, version_number: 2, state: "rascunho",
      title: "Serviço v2", summary: "resumo v2", full_description: "descrição v2",
      base_commercial_deadline_days: 5,
      tasks: { create: [{ key: "t1", name: "Tarefa fixa", execution_mode: "humano", specialty_id: spec.id, estimated_minutes: 60, sort_order: 1,
        steps: { create: [{ key: "s1", name: "Etapa única", sort_order: 1 }] } }] },
    },
  });
  const varFormato = await prisma.catalog2Variation.create({
    data: {
      version_id: v2.id, key: "formato", name: "Formato", is_required: false, sort_order: 1,
      options: { create: [{ key: "estatico", label: "Estático", is_default: true, sort_order: 1 }, { key: "carrossel", label: "Carrossel", sort_order: 2 }] },
    },
    include: { options: true },
  });
  const carrossel = varFormato.options.find((o) => o.key === "carrossel")!;
  await prisma.catalog2OptionEffect.create({ data: { variation_option_id: carrossel.id, effect_type: "add_fixed_amount", effect_value: String(extraFixedCost), sort_order: 1 } });
  await publishVersion(v2.id, "system", { changeSummary: "v2 — reajuste de preço" });
  return v2;
}

/** Cria e publica uma v2 do MESMO produto SEM a chave "carrossel" — quebra
 * de escopo real pra quem tinha selecionado "carrossel". */
async function publishIncompatibleV2(productId: string) {
  const spec = await prisma.catalog2Specialty.findFirstOrThrow({ where: { key: "designer" } });
  const v2 = await prisma.catalog2ProductVersion.create({
    data: {
      product_id: productId, version_number: 2, state: "rascunho",
      title: "Serviço v2 (escopo reduzido)", summary: "resumo v2", full_description: "descrição v2",
      base_commercial_deadline_days: 5,
      tasks: { create: [{ key: "t1", name: "Tarefa fixa", execution_mode: "humano", specialty_id: spec.id, estimated_minutes: 60, sort_order: 1,
        steps: { create: [{ key: "s1", name: "Etapa única", sort_order: 1 }] } }] },
    },
  });
  await prisma.catalog2Variation.create({
    data: {
      version_id: v2.id, key: "formato", name: "Formato", is_required: false, sort_order: 1,
      // "carrossel" não existe mais nesta versão.
      options: { create: [{ key: "estatico", label: "Estático", is_default: true, sort_order: 1 }] },
    },
  });
  await publishVersion(v2.id, "system", { changeSummary: "v2 — escopo reduzido" });
  return v2;
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

async function createQuoteViaApi(token: string, productId: string, selection: Record<string, unknown> = {}) {
  const r = await api("/api/catalog2/quotes", { method: "POST", token, body: { product: productId, selection: { variation_option_keys: [], addon_keys: [], quantity: 1, answers: {}, ...selection } } });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  return r.json as { id: string; commercial_price: number; commercial_deadline_days: number };
}

let CO_A: Awaited<ReturnType<typeof mkCompanyUser>>;
let MASTER = "";

describe("Ajustar a proteção comercial (Item 4.1, reunião 2026-09-14)", () => {
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

  it("1. primeira consulta vários dias depois da alteração: a proteção conta da data REAL do evento, não da consulta", async () => {
    const { product } = await mkPublishedProduct(`t8-${crypto.randomBytes(4).toString("hex")}`);
    const q1 = await createQuoteViaApi(CO_A.token, product.id);
    // A cotação foi criada há 25 dias (antes da alteração) — precisa ser
    // ANTERIOR ao evento pra ele contar como um desvio detectável.
    await prisma.catalog2Quote.update({
      where: { id: q1.id },
      data: { valid_until: new Date(Date.now() + 60 * DAY), created_at: new Date(Date.now() - 25 * DAY) },
    });

    // A alteração comercial "aconteceu" há 20 dias (evento logado com essa
    // data) — a config atual já reflete o novo valor.
    await prisma.catalog2CommercialChangeEvent.create({ data: { scope: "global_settings", occurred_at: new Date(Date.now() - 20 * DAY), note: "teste" } });
    await setPricingSettings(80);

    // Primeira consulta só agora (20 dias depois do evento).
    const rev = await api(`/api/catalog2/quotes/${q1.id}/revalidate`, { method: "POST", token: CO_A.token });
    assert.equal(rev.status, 200);
    assert.equal(rev.json.status, "valida");
    assert.equal(rev.json.protected, true);
    assert.equal(rev.json.price_protection_anchor_source, "event_log");
    const anchor = new Date(rev.json.price_protection_started_at);
    assert.ok(Math.abs(anchor.getTime() - (Date.now() - 20 * DAY)) < 60_000, "âncora deve ser a data do EVENTO, não a da consulta");
    const endsAt = new Date(rev.json.price_protection_ends_at);
    assert.ok(Math.abs(endsAt.getTime() - (Date.now() + 10 * DAY)) < 60_000, "termina 30 dias depois do evento (10 dias a partir de agora)");
  });

  it("2. limite exato de 30 dias e alterações sucessivas contados a partir do PRIMEIRO evento, via log real", async () => {
    const { product } = await mkPublishedProduct(`t8-${crypto.randomBytes(4).toString("hex")}`);
    const q1 = await createQuoteViaApi(CO_A.token, product.id);
    await prisma.catalog2Quote.update({
      where: { id: q1.id },
      data: { valid_until: new Date(Date.now() + 60 * DAY), created_at: new Date(Date.now() - 31 * DAY) },
    });
    // Primeiro evento: 30 dias atrás (1 dia depois da criação da cotação).
    await prisma.catalog2CommercialChangeEvent.create({ data: { scope: "global_settings", occurred_at: new Date(Date.now() - 30 * DAY), note: "1ª alteração" } });
    // Alteração SUCESSIVA, mais recente — nunca deveria mover a âncora.
    await prisma.catalog2CommercialChangeEvent.create({ data: { scope: "global_settings", occurred_at: new Date(Date.now() - 10 * DAY), note: "2ª alteração" } });
    await setPricingSettings(80);

    const rev = await api(`/api/catalog2/quotes/${q1.id}/revalidate`, { method: "POST", token: CO_A.token });
    assert.equal(rev.json.protected, false, "âncora no evento mais antigo (30 dias atrás) → exatamente no limite, já não protegida");
    assert.equal(rev.json.status, "expirada");
    const anchor = new Date(rev.json.price_protection_started_at);
    assert.ok(Math.abs(anchor.getTime() - (Date.now() - 30 * DAY)) < 60_000, "âncora é o PRIMEIRO evento, não o mais recente");
  });

  it("3. mudança de preço por configuração global: a rota de admin só registra evento quando um campo que afeta o cálculo muda de valor", async () => {
    const before = await prisma.catalog2CommercialChangeEvent.count({ where: { scope: "global_settings" } });

    // Mesmos valores (30) — não deveria logar nada.
    const s = await api("/api/admin/catalog2/pricing-settings", { token: MASTER });
    const r1 = await api("/api/admin/catalog2/pricing-settings", {
      method: "PUT", token: MASTER,
      body: { tax_percent: s.json.tax_percent, commission_percent: s.json.commission_percent, operational_fee_percent: s.json.operational_fee_percent, profit_margin_percent: s.json.profit_margin_percent, human_review_percent: s.json.human_review_percent, notes: "sem mudança de preço" },
    });
    assert.equal(r1.status, 200);
    assert.equal(await prisma.catalog2CommercialChangeEvent.count({ where: { scope: "global_settings" } }), before);

    // Muda de verdade a margem — deve logar 1 evento novo.
    const r2 = await api("/api/admin/catalog2/pricing-settings", { method: "PUT", token: MASTER, body: { profit_margin_percent: (s.json.profit_margin_percent ?? 30) + 15 } });
    assert.equal(r2.status, 200);
    assert.equal(await prisma.catalog2CommercialChangeEvent.count({ where: { scope: "global_settings" } }), before + 1);
    await setPricingSettings(30);
  });

  it("4. nova versão publicada com o MESMO escopo e preço diferente: protegida como desvio de preço, nunca quebra estrutural", async () => {
    const { product } = await mkPublishedProduct(`t8-${crypto.randomBytes(4).toString("hex")}`);
    const q1 = await createQuoteViaApi(CO_A.token, product.id, { variation_option_keys: ["carrossel"] });
    await prisma.catalog2Quote.update({ where: { id: q1.id }, data: { valid_until: new Date(Date.now() + 60 * DAY) } });

    await publishCompatibleV2(product.id, 500); // mesma chave "carrossel", custo extra maior

    const rev = await api(`/api/catalog2/quotes/${q1.id}/revalidate`, { method: "POST", token: CO_A.token });
    assert.equal(rev.status, 200);
    assert.equal(rev.json.status, "valida", "protegida, não expira por causa da troca de versão");
    assert.equal(rev.json.protected, true);
    assert.equal(rev.json.price_protection_anchor_source, "event_log", "a publicação da v2 é o próprio evento que ancora a proteção");
    assert.notEqual(rev.json.fresh_pricing.commercial_price, rev.json.commercial_price, "preço atual (v2) é diferente do congelado (v1)");
  });

  it("5. nova versão publicada com seleção INCOMPATÍVEL: quebra estrutural de verdade — nunca protegida, renovação recusa com o motivo exato", async () => {
    const { product } = await mkPublishedProduct(`t8-${crypto.randomBytes(4).toString("hex")}`);
    const q1 = await createQuoteViaApi(CO_A.token, product.id, { variation_option_keys: ["carrossel"] });
    await prisma.catalog2Quote.update({ where: { id: q1.id }, data: { valid_until: new Date(Date.now() + 60 * DAY) } });

    await publishIncompatibleV2(product.id); // "carrossel" não existe mais

    const rev = await api(`/api/catalog2/quotes/${q1.id}/revalidate`, { method: "POST", token: CO_A.token });
    assert.equal(rev.json.status, "expirada");
    assert.equal(rev.json.protected, false, "quebra estrutural nunca é protegida, mesmo recém detectada");
    assert.match(rev.json.recalc_reason ?? "", /não é compatível/i);

    const renew = await api(`/api/catalog2/quotes/${q1.id}/renew`, { method: "POST", token: CO_A.token });
    assert.equal(renew.status, 409);
    assert.equal(renew.json.code, "incompatible_version");
  });

  it("6. renovação DENTRO da proteção reemite o MESMO preço (nunca recalcula); fora da proteção, recalcula pela regra atual", async () => {
    const { product } = await mkPublishedProduct(`t8-${crypto.randomBytes(4).toString("hex")}`);

    // Cenário A: só a validade própria (72h) venceu, mas a proteção (30
    // dias, ancorada num evento de 5 dias atrás) ainda está de pé.
    const qA = await createQuoteViaApi(CO_A.token, product.id);
    await prisma.catalog2Quote.update({ where: { id: qA.id }, data: { valid_until: new Date(Date.now() - 1000) } }); // já venceu
    await prisma.catalog2CommercialChangeEvent.create({ data: { scope: "global_settings", occurred_at: new Date(Date.now() - 5 * DAY) } });
    await setPricingSettings(80);

    const renewA = await api(`/api/catalog2/quotes/${qA.id}/renew`, { method: "POST", token: CO_A.token });
    assert.equal(renewA.status, 200, JSON.stringify(renewA.json));
    assert.equal(renewA.json.renewed, true);
    assert.equal(renewA.json.mode, "reissued");
    assert.equal(renewA.json.quote.commercial_price, qA.commercial_price, "reemite o MESMO preço — não recalcula enquanto protegida");
    assert.equal(renewA.json.changed.price, false);
    const reissued = await prisma.catalog2Quote.findUniqueOrThrow({ where: { id: renewA.json.quote.id } });
    assert.ok(reissued.price_protection_started_at, "carrega a âncora original, não reseta");
    assert.ok(reissued.valid_until! < new Date(Date.now() + 30 * DAY), "validade nova é capada pelo que resta da proteção, não um TTL cheio novo");

    await setPricingSettings(30); // volta ao normal pro próximo cenário

    // Cenário B: a proteção JÁ terminou de verdade (evento há 31 dias) — aí sim recalcula.
    const qB = await createQuoteViaApi(CO_A.token, product.id);
    await prisma.catalog2Quote.update({
      where: { id: qB.id },
      data: { valid_until: new Date(Date.now() + 60 * DAY), price_protection_started_at: new Date(Date.now() - 31 * DAY), price_protection_anchor_source: "event_log" },
    });
    await setPricingSettings(80);
    const renewB = await api(`/api/catalog2/quotes/${qB.id}/renew`, { method: "POST", token: CO_A.token });
    assert.equal(renewB.status, 200);
    assert.equal(renewB.json.mode, "recomputed");
    assert.notEqual(renewB.json.quote.commercial_price, qB.commercial_price);
    await setPricingSettings(30);
  });

  it("7. aditivo aprovado com preço antigo não finaliza o novo preço sem nova aceitação — a renovação revincula e revoga a aprovação anterior", async () => {
    const { product } = await mkPublishedProduct(`t8-${crypto.randomBytes(4).toString("hex")}`);

    const purchaseQuote = await createQuoteViaApi(CO_A.token, product.id);
    const checkout = await api("/api/catalog2/checkout", { method: "POST", token: CO_A.token, body: { quote_ids: [purchaseQuote.id], checkout_client_action_id: crypto.randomUUID() } });
    assert.equal(checkout.status, 201, JSON.stringify(checkout.json));
    const projectId = checkout.json.project.id;
    projects.push(projectId);

    // Cotação do aditivo (quantidade diferente pra não colidir de checksum).
    const addonQuote = await createQuoteViaApi(CO_A.token, product.id, { quantity: 2 });
    const reqRes = await api("/api/catalog2/change-orders", { method: "POST", token: CO_A.token, body: { project_id: projectId, quote_id: addonQuote.id } });
    assert.equal(reqRes.status, 201, JSON.stringify(reqRes.json));
    const changeOrderId = reqRes.json.id;

    const approve = await api(`/api/catalog2/change-orders/${changeOrderId}/approve`, { method: "POST", token: MASTER, body: { approval_client_action_id: crypto.randomUUID() } });
    assert.equal(approve.status, 200, JSON.stringify(approve.json));
    assert.equal(approve.json.status, "aprovado");
    const oldPriceImpact = approve.json.price_impact_snapshot;

    // A proteção da cotação do aditivo termina de verdade (evento há 31 dias).
    await prisma.catalog2Quote.update({
      where: { id: addonQuote.id },
      data: { valid_until: new Date(Date.now() + 60 * DAY), price_protection_started_at: new Date(Date.now() - 31 * DAY), price_protection_anchor_source: "event_log" },
    });
    await setPricingSettings(90);

    const renew = await api(`/api/catalog2/quotes/${addonQuote.id}/renew`, { method: "POST", token: CO_A.token });
    assert.equal(renew.status, 200, JSON.stringify(renew.json));
    assert.equal(renew.json.mode, "recomputed");
    assert.equal(renew.json.changed.price, true);
    const newQuoteId = renew.json.quote.id;

    // O aditivo foi REVINCULADO à cotação nova e voltou a "solicitado" — a
    // aprovação antiga NUNCA finaliza o preço novo sem nova aceitação.
    const coReloaded = await api(`/api/catalog2/change-orders?project_id=${projectId}`, { token: CO_A.token });
    const co = coReloaded.json.data.find((c: any) => c.id === changeOrderId);
    assert.equal(co.quote_id, newQuoteId);
    assert.equal(co.status, "solicitado", "aprovação anterior foi revogada — precisa de nova aceitação");
    assert.equal(co.price_impact_snapshot, null);

    // checkout continua bloqueado até re-aprovar.
    const checkoutBlocked = await api(`/api/catalog2/change-orders/${changeOrderId}/checkout`, { method: "POST", token: CO_A.token });
    assert.equal(checkoutBlocked.status, 409);

    // Nova aceitação (re-aprovação) com o preço ATUAL, e checkout finaliza com o preço novo.
    const reapprove = await api(`/api/catalog2/change-orders/${changeOrderId}/approve`, { method: "POST", token: MASTER, body: { approval_client_action_id: crypto.randomUUID() } });
    assert.equal(reapprove.status, 200, JSON.stringify(reapprove.json));
    assert.notEqual(reapprove.json.price_impact_snapshot, oldPriceImpact);

    const finalCheckout = await api(`/api/catalog2/change-orders/${changeOrderId}/checkout`, { method: "POST", token: CO_A.token });
    assert.equal(finalCheckout.status, 201, JSON.stringify(finalCheckout.json));
    await setPricingSettings(30);
  });

  it("8. contratação já paga e bloqueios de dado provisório continuam intactos com a nova lógica de âncora/versão", async () => {
    const { product } = await mkPublishedProduct(`t8-${crypto.randomBytes(4).toString("hex")}`);
    const q1 = await createQuoteViaApi(CO_A.token, product.id);
    const paidPrice = q1.commercial_price;
    const checkout = await api("/api/catalog2/checkout", { method: "POST", token: CO_A.token, body: { quote_ids: [q1.id], checkout_client_action_id: crypto.randomUUID() } });
    assert.equal(checkout.status, 201);
    projects.push(checkout.json.project.id);

    await prisma.catalog2CommercialChangeEvent.create({ data: { scope: "global_settings", occurred_at: new Date(Date.now() - 40 * DAY) } });
    await setPricingSettings(80);

    const renew = await api(`/api/catalog2/quotes/${q1.id}/renew`, { method: "POST", token: CO_A.token });
    assert.equal(renew.status, 409);
    assert.equal(renew.json.code, "quote_already_converted");
    const pp = await prisma.projectProduct.findUniqueOrThrow({ where: { origin_catalog2_quote_id: q1.id } });
    assert.equal(pp.preco_final_cliente_snapshot, paidPrice);
    await setPricingSettings(30);

    // dado provisório continua isolado do recálculo, mesmo com o novo caminho de versão/escopo.
    await prisma.catalog2ProvisionalPreview.create({ data: { product_id: product.id, image_path: "/x.svg", price_amount: 123456, deadline_days: 1, modality: "Sob demanda" } });
    const q2 = await createQuoteViaApi(CO_A.token, product.id, { variation_option_keys: ["carrossel"] });
    assert.notEqual(q2.commercial_price, 123456);
    await prisma.catalog2ProvisionalPreview.deleteMany({ where: { product_id: product.id } });
  });
});
