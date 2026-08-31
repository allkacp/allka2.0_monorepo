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

// Catálogo do CLIENTE do catalog2 (sprint de produtos, bloco 5/6):
// visibilidade, configurador, pré-cotação e cesta. O servidor recalcula
// tudo; nada de preço vindo do navegador. Os 36 seguem rascunhos.

let baseUrl = "";
let server: import("node:http").Server;
const users: string[] = [];
const adminProfiles: string[] = [];
const companies: string[] = [];
const agencies: string[] = [];
const catProducts: string[] = [];

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
  const c = await prisma.company.create({ data: { name: `[TESTE] Co ${tag}`, status: "ativo" } });
  companies.push(c.id);
  const id = `c5co-${crypto.randomBytes(5).toString("hex")}`;
  const u = await prisma.user.create({
    data: { id, email: `${id}@example.test`, password_hash: "x", name: `Co ${tag}`, role: "company_user", account_type: "empresas", is_active: true, status: "ativo", company_id: c.id },
  });
  users.push(u.id);
  return { user: u, token: tokenFor(u), companyId: c.id };
}
async function mkAgencyUser(tag: string) {
  const id = `c5ag-${crypto.randomBytes(5).toString("hex")}`;
  const u = await prisma.user.create({
    data: { id, email: `${id}@example.test`, password_hash: "x", name: `Ag ${tag}`, role: "agency_admin", account_type: "agencias", is_active: true, status: "ativo" },
  });
  users.push(u.id);
  const a = await prisma.agency.create({ data: { name: `[TESTE] Ag ${tag}`, status: "ativo", owner_user_id: u.id } });
  agencies.push(a.id);
  await prisma.user.update({ where: { id: u.id }, data: { agency_id: a.id } });
  return { user: u, token: tokenFor(u), agencyId: a.id };
}
async function mkAdmin(master: boolean) {
  const p = await prisma.adminProfile.create({ data: { name: `C5 ${master ? "M" : "C"} ${crypto.randomBytes(4).toString("hex")}`, is_master: master, is_active: true } });
  adminProfiles.push(p.id);
  const id = `c5ad-${crypto.randomBytes(5).toString("hex")}`;
  const u = await prisma.user.create({
    data: { id, email: `${id}@example.test`, password_hash: "x", name: "Admin", role: "admin", account_type: "admin", is_active: true, status: "ativo", admin_profile_id: p.id },
  });
  users.push(u.id);
  return { user: u, token: tokenFor(u) };
}
async function mkLeaderUser() {
  const id = `c5ld-${crypto.randomBytes(5).toString("hex")}`;
  const u = await prisma.user.create({
    data: { id, email: `${id}@example.test`, password_hash: "x", name: "Lider", role: "lider", account_type: "lider", is_active: true, status: "ativo" },
  });
  users.push(u.id);
  return { user: u, token: tokenFor(u) };
}

/** Cria um produto catalog2 publicado e COMERCIALMENTE completo. */
async function mkPublishedProduct(opts: { slug: string; withOrder?: boolean; withDeadline?: boolean; requiredIaVariation?: boolean }) {
  const spec = await prisma.catalog2Specialty.findFirstOrThrow({ where: { key: "designer" } });
  await prisma.catalog2Specialty.update({ where: { id: spec.id }, data: { max_hourly_rate: 100 } });
  await prisma.catalog2PricingSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default", tax_percent: 6, commission_percent: 10, operational_fee_percent: 5, profit_margin_percent: 30, human_review_percent: 10,
      component_order_json: opts.withOrder === false ? null : JSON.stringify(["tax", "commission", "operational", "margin"]),
    },
    update: {
      tax_percent: 6, commission_percent: 10, operational_fee_percent: 5, profit_margin_percent: 30, human_review_percent: 10,
      component_order_json: opts.withOrder === false ? null : JSON.stringify(["tax", "commission", "operational", "margin"]),
    },
  });

  const pillar = await prisma.catalog2Pillar.findFirstOrThrow({ where: { key: "redes_conteudo" } });
  const category = await prisma.catalog2Category.findFirstOrThrow({ where: { key: "design" } });
  const fourF = await prisma.catalog2FourF.findFirstOrThrow({ where: { key: "fluxo" } });
  const product = await prisma.catalog2Product.create({
    data: {
      slug: opts.slug, internal_name: `[TESTE LOCAL] ${opts.slug}`, pillar_id: pillar.id, category_id: category.id, status: "em_preparacao",
      four_f: { create: [{ four_f_id: fourF.id }] },
    },
  });
  catProducts.push(product.id);
  const v = await prisma.catalog2ProductVersion.create({
    data: {
      product_id: product.id, version_number: 1, state: "rascunho",
      title: `Serviço ${opts.slug}`, summary: "resumo", full_description: "descrição do serviço demo",
      base_commercial_deadline_days: opts.withDeadline === false ? null : 5,
      tasks: {
        create: [{ key: "t1", name: "Fazer a arte", execution_mode: "humano", specialty_id: spec.id, estimated_minutes: 120, sort_order: 1 }],
      },
    },
  });
  const varFormato = await prisma.catalog2Variation.create({
    data: {
      version_id: v.id, key: "formato", name: "Formato", is_required: true, sort_order: 1,
      options: { create: [
        { key: "estatico", label: "Estático", is_default: true, sort_order: 1 },
        { key: "carrossel", label: "Carrossel", sort_order: 2 },
      ] },
    },
    include: { options: true },
  });
  const carrossel = varFormato.options.find((o) => o.key === "carrossel")!;
  await prisma.catalog2OptionEffect.create({ data: { variation_option_id: carrossel.id, effect_type: "add_fixed_amount", effect_value: "100", sort_order: 1 } });
  await prisma.catalog2OptionEffect.create({ data: { variation_option_id: carrossel.id, effect_type: "add_deadline_days", effect_value: "3", sort_order: 2 } });
  if (opts.requiredIaVariation) {
    await prisma.catalog2Variation.create({
      data: {
        version_id: v.id, key: "uso_ia", name: "Uso de IA na produção", is_required: true, sort_order: 2,
        options: { create: [{ key: "autorizado", label: "Autorizado", is_default: false, sort_order: 1 }, { key: "nao_autorizado", label: "Não autorizado", sort_order: 2 }] },
      },
    });
  }
  await prisma.catalog2Addon.create({ data: { version_id: v.id, key: "extra", name: "Legendas extra", base_cost: 30, is_active: true, sort_order: 1 } });

  await publishVersion(v.id, "system", { changeSummary: "publicação de teste" });
  return { product, versionId: v.id };
}

async function purge(id: string) {
  await prisma.catalog2CartItem.deleteMany({ where: { product_id: id } }).catch(() => {});
  await prisma.catalog2Quote.deleteMany({ where: { product_id: id } }).catch(() => {});
  const vs = await prisma.catalog2ProductVersion.findMany({ where: { product_id: id }, select: { id: true } });
  const vids = vs.map((x) => x.id);
  await prisma.catalog2Product.update({ where: { id }, data: { published_version_id: null } }).catch(() => {});
  await prisma.catalog2VersionEvent.deleteMany({ where: { version_id: { in: vids } } }).catch(() => {});
  await prisma.catalog2Variation.deleteMany({ where: { version_id: { in: vids } } }).catch(() => {});
  await prisma.catalog2Addon.deleteMany({ where: { version_id: { in: vids } } }).catch(() => {});
  await prisma.catalog2Task.deleteMany({ where: { version_id: { in: vids } } }).catch(() => {});
  await prisma.catalog2ProductVersion.deleteMany({ where: { product_id: id } }).catch(() => {});
  await prisma.catalog2ProductFourF.deleteMany({ where: { product_id: id } }).catch(() => {});
  await prisma.catalog2Product.delete({ where: { id } }).catch(() => {});
}

let CO: Awaited<ReturnType<typeof mkCompanyUser>>;
let CO2: Awaited<ReturnType<typeof mkCompanyUser>>;
let AG: Awaited<ReturnType<typeof mkAgencyUser>>;
let MASTER = "";
let COMMON_ADMIN = "";
let LEADER = "";
let SLUG = "";
let DRAFT_SLUG = "";

describe("Catálogo do cliente — visibilidade, configurador, cotação e cesta", () => {
  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    await seedCatalog2FourFForTests(prisma);
    await seedCatalog2Classifications(prisma);

    SLUG = `t5-pub-${crypto.randomBytes(4).toString("hex")}`;
    await mkPublishedProduct({ slug: SLUG, requiredIaVariation: true });

    // Um produto que NUNCA foi publicado (rascunho).
    DRAFT_SLUG = `t5-draft-${crypto.randomBytes(4).toString("hex")}`;
    const p = await prisma.catalog2Product.create({ data: { slug: DRAFT_SLUG, internal_name: `[TESTE LOCAL] ${DRAFT_SLUG}`, status: "em_preparacao" } });
    catProducts.push(p.id);
    await prisma.catalog2ProductVersion.create({ data: { product_id: p.id, version_number: 1, state: "rascunho", title: "rascunho" } });

    CO = await mkCompanyUser("A");
    CO2 = await mkCompanyUser("B");
    AG = await mkAgencyUser("X");
    MASTER = (await mkAdmin(true)).token;
    COMMON_ADMIN = (await mkAdmin(false)).token;
    LEADER = (await mkLeaderUser()).token;

    server = app.listen(0);
    await new Promise<void>((r) => server.once("listening", () => r()));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  // `catalog2_pricing_settings` é um singleton (id:"default") compartilhado
  // por todas as suítes catalog2 que rodam em paralelo contra o mesmo banco
  // de teste. Reafirmamos a config COMPLETA antes de cada teste para que a
  // visibilidade do nosso fixture seja determinística.
  beforeEach(async () => {
    await prisma.catalog2PricingSettings.upsert({
      where: { id: "default" },
      create: {
        id: "default", tax_percent: 6, commission_percent: 10, operational_fee_percent: 5, profit_margin_percent: 30, human_review_percent: 10,
        component_order_json: JSON.stringify(["tax", "commission", "operational", "margin"]),
      },
      update: {
        tax_percent: 6, commission_percent: 10, operational_fee_percent: 5, profit_margin_percent: 30, human_review_percent: 10,
        component_order_json: JSON.stringify(["tax", "commission", "operational", "margin"]),
      },
    }).catch(() => {});
  });

  after(async () => {
    await new Promise<void>((res, rej) => server.close((e) => (e ? rej(e) : res())));
    for (const id of catProducts.splice(0)) await purge(id);
    await prisma.catalog2Quote.deleteMany({ where: { user_id: { in: users } } }).catch(() => {});
    await prisma.catalog2CartItem.deleteMany({ where: { user_id: { in: users } } }).catch(() => {});
    await prisma.agency.deleteMany({ where: { id: { in: agencies } } }).catch(() => {});
    await prisma.company.deleteMany({ where: { id: { in: companies } } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: { in: users } } }).catch(() => {});
    await prisma.adminProfile.deleteMany({ where: { id: { in: adminProfiles } } }).catch(() => {});
  });

  it("1. cliente não vê rascunho — some da lista e o detalhe responde 404", async () => {
    const list = await api("/api/catalog2/products?page_size=100", { token: CO.token });
    assert.equal(list.status, 200);
    assert.ok(list.json.data.some((p: any) => p.slug === SLUG));
    assert.ok(!list.json.data.some((p: any) => p.slug === DRAFT_SLUG));
    const det = await api(`/api/catalog2/products/${DRAFT_SLUG}`, { token: CO.token });
    assert.equal(det.status, 404);
  });

  it("2. cliente não vê produto suspenso nem arquivado", async () => {
    const p = await prisma.catalog2Product.findFirstOrThrow({ where: { slug: SLUG } });
    await prisma.catalog2Product.update({ where: { id: p.id }, data: { status: "temporariamente_inativo" } });
    let list = await api("/api/catalog2/products?page_size=100", { token: CO.token });
    assert.ok(!list.json.data.some((x: any) => x.slug === SLUG));
    assert.equal((await api(`/api/catalog2/products/${SLUG}`, { token: CO.token })).status, 404);
    await prisma.catalog2Product.update({ where: { id: p.id }, data: { status: "arquivado" } });
    assert.equal((await api(`/api/catalog2/products/${SLUG}`, { token: CO.token })).status, 404);
    await prisma.catalog2Product.update({ where: { id: p.id }, data: { status: "disponivel" } });
    list = await api("/api/catalog2/products?page_size=100", { token: CO.token });
    assert.ok(list.json.data.some((x: any) => x.slug === SLUG));
  });

  it("3. Admin Master pré-visualiza o rascunho (preview=1)", async () => {
    const det = await api(`/api/catalog2/products/${DRAFT_SLUG}?preview=1`, { token: MASTER });
    assert.equal(det.status, 200);
    assert.equal(det.json.is_preview, true);
    assert.match(det.json.preview_notice ?? "", /não gera cotação/i);
  });

  it("4. cliente NÃO acessa preview de rascunho manipulando a URL (?preview=1)", async () => {
    assert.equal((await api(`/api/catalog2/products/${DRAFT_SLUG}?preview=1`, { token: CO.token })).status, 404);
    assert.equal((await api(`/api/catalog2/products/${DRAFT_SLUG}?preview=1`, { token: COMMON_ADMIN })).status, 404);
  });

  it("5. abrir o produto NÃO adiciona nada à cesta", async () => {
    await api(`/api/catalog2/products/${SLUG}`, { token: CO.token });
    await api(`/api/catalog2/products/${SLUG}/configure`, { method: "POST", token: CO.token, body: { variation_option_keys: ["estatico", "autorizado"] } });
    const cart = await api("/api/catalog2/cart", { token: CO.token });
    assert.equal(cart.json.count, 0);
  });

  it("6/8. variação obrigatória (incl. autorização de IA) bloqueia configuração incompleta", async () => {
    const bad = await api(`/api/catalog2/products/${SLUG}/configure`, { method: "POST", token: CO.token, body: { variation_option_keys: ["estatico"] } });
    assert.equal(bad.status, 200);
    assert.ok(bad.json.selection_errors.some((e: string) => /Uso de IA/i.test(e)));
    assert.equal(bad.json.can_generate_quote, false);
    const noFormat = await api(`/api/catalog2/products/${SLUG}/configure`, { method: "POST", token: CO.token, body: { variation_option_keys: ["autorizado"] } });
    assert.ok(noFormat.json.selection_errors.some((e: string) => /Formato/i.test(e)));
  });

  it("7. adicional é opcional — configurar sem adicional continua válido", async () => {
    const ok = await api(`/api/catalog2/products/${SLUG}/configure`, { method: "POST", token: CO.token, body: { variation_option_keys: ["estatico", "autorizado"], addon_keys: [] } });
    assert.deepEqual(ok.json.selection_errors, []);
    assert.equal(ok.json.can_generate_quote, true);
  });

  it("9/10. backend recalcula o preço e ignora qualquer preço enviado pelo navegador", async () => {
    const a = await api(`/api/catalog2/products/${SLUG}/configure`, {
      method: "POST", token: CO.token,
      body: { variation_option_keys: ["estatico", "autorizado"], quantity: 1, commercial_price: 999999, pricing: { commercial_price: 1 } },
    });
    const b = await api(`/api/catalog2/products/${SLUG}/configure`, {
      method: "POST", token: CO.token,
      body: { variation_option_keys: ["carrossel", "autorizado"], quantity: 2 },
    });
    assert.equal(typeof a.json.pricing.commercial_price, "number");
    assert.notEqual(a.json.pricing.commercial_price, 999999);
    assert.ok(b.json.pricing.commercial_price > a.json.pricing.commercial_price, "carrossel + qtd 2 custa mais");
    assert.equal(b.json.pricing.commercial_deadline_days, a.json.pricing.commercial_deadline_days + 3);
  });

  it("11. sem preço/prazo comercial não há cotação válida", async () => {
    const noDeadlineSlug = `t5-nodl-${crypto.randomBytes(4).toString("hex")}`;
    await mkPublishedProduct({ slug: noDeadlineSlug, withDeadline: false });
    // não fica nem visível na lista
    const list = await api("/api/catalog2/products?page_size=100", { token: CO.token });
    assert.ok(!list.json.data.some((p: any) => p.slug === noDeadlineSlug));
    const q = await api("/api/catalog2/quotes", { method: "POST", token: CO.token, body: { product: noDeadlineSlug, selection: { variation_option_keys: ["estatico"] } } });
    assert.equal(q.status, 409);

    const noOrderSlug = `t5-noord-${crypto.randomBytes(4).toString("hex")}`;
    await mkPublishedProduct({ slug: noOrderSlug, withOrder: false });
    const q2 = await api("/api/catalog2/quotes", { method: "POST", token: CO.token, body: { product: noOrderSlug, selection: { variation_option_keys: ["estatico"] } } });
    assert.equal(q2.status, 409);
    // volta a ordem para os próximos testes
    await prisma.catalog2PricingSettings.update({ where: { id: "default" }, data: { component_order_json: JSON.stringify(["tax", "commission", "operational", "margin"]) } });
  });

  it("12. a cotação CONGELA versão, preço e prazo — mudança posterior não altera a cotação", async () => {
    const created = await api("/api/catalog2/quotes", { method: "POST", token: CO.token, body: { product: SLUG, selection: { variation_option_keys: ["estatico", "autorizado"] } } });
    assert.equal(created.status, 201);
    assert.equal(created.json.status, "valida");
    const frozenPrice = created.json.commercial_price;
    const frozenVersion = created.json.version_id;
    // muda a configuração comercial
    await prisma.catalog2PricingSettings.update({ where: { id: "default" }, data: { profit_margin_percent: 80 } });
    const again = await api(`/api/catalog2/quotes/${created.json.id}`, { token: CO.token });
    assert.equal(again.json.commercial_price, frozenPrice);
    assert.equal(again.json.version_id, frozenVersion);
    await prisma.catalog2PricingSettings.update({ where: { id: "default" }, data: { profit_margin_percent: 30 } });
  });

  it("13. cotação expirada exige recálculo", async () => {
    const created = await api("/api/catalog2/quotes", { method: "POST", token: CO.token, body: { product: SLUG, selection: { variation_option_keys: ["carrossel", "autorizado"] } } });
    await prisma.catalog2Quote.update({ where: { id: created.json.id }, data: { valid_until: new Date(Date.now() - 1000) } });
    const rev = await api(`/api/catalog2/quotes/${created.json.id}/revalidate`, { method: "POST", token: CO.token });
    assert.equal(rev.json.needs_recalc, true);
    assert.equal(rev.json.status, "expirada");
    assert.match(rev.json.recalc_reason ?? "", /expirou/i);
  });

  it("14. clique duplo não duplica — cotação e cesta", async () => {
    const q1 = await api("/api/catalog2/quotes", { method: "POST", token: AG.token, body: { product: SLUG, selection: { variation_option_keys: ["estatico", "autorizado"] } } });
    const q2 = await api("/api/catalog2/quotes", { method: "POST", token: AG.token, body: { product: SLUG, selection: { variation_option_keys: ["estatico", "autorizado"] } } });
    assert.equal(q1.json.id, q2.json.id);
    const c1 = await api("/api/catalog2/cart/items", { method: "POST", token: AG.token, body: { product: SLUG, selection: { variation_option_keys: ["carrossel", "autorizado"] } } });
    const c2 = await api("/api/catalog2/cart/items", { method: "POST", token: AG.token, body: { product: SLUG, selection: { variation_option_keys: ["carrossel", "autorizado"] } } });
    assert.equal(c1.json.created, true);
    assert.equal(c2.json.created, false);
    assert.equal(c2.json.already_in_cart, true);
    assert.equal(c1.json.item_id, c2.json.item_id);
  });

  it("15. conta A não acessa cotação da conta B", async () => {
    const mine = await api("/api/catalog2/quotes", { method: "POST", token: CO.token, body: { product: SLUG, selection: { variation_option_keys: ["carrossel", "autorizado"], quantity: 3 } } });
    const asOther = await api(`/api/catalog2/quotes/${mine.json.id}`, { token: CO2.token });
    assert.equal(asOther.status, 404);
    const asAgency = await api(`/api/catalog2/quotes/${mine.json.id}`, { token: AG.token });
    assert.equal(asAgency.status, 404);
  });

  it("16/17. cesta persiste após F5 e é isolada por conta", async () => {
    await api("/api/catalog2/cart/items", { method: "POST", token: CO.token, body: { product: SLUG, selection: { variation_option_keys: ["estatico", "autorizado"] } } });
    const reload = await api("/api/catalog2/cart", { token: CO.token }); // "F5"
    assert.ok(reload.json.count >= 1);
    const otherCompany = await api("/api/catalog2/cart", { token: CO2.token });
    assert.equal(otherCompany.json.count, 0);
  });

  it("18/19. editar item altera só aquele; remover e limpar funcionam", async () => {
    await api("/api/catalog2/cart/clear", { method: "POST", token: CO.token });
    const add1 = await api("/api/catalog2/cart/items", { method: "POST", token: CO.token, body: { product: SLUG, selection: { variation_option_keys: ["estatico", "autorizado"] } } });
    await api("/api/catalog2/cart/items", { method: "POST", token: CO.token, body: { product: SLUG, selection: { variation_option_keys: ["carrossel", "autorizado"] } } });
    let cart = await api("/api/catalog2/cart", { token: CO.token });
    assert.equal(cart.json.count, 2);
    const upd = await api(`/api/catalog2/cart/items/${add1.json.item_id}`, { method: "PUT", token: CO.token, body: { variation_option_keys: ["estatico", "autorizado"], quantity: 4 } });
    assert.equal(upd.status, 200);
    cart = await api("/api/catalog2/cart", { token: CO.token });
    assert.equal(cart.json.items.find((i: any) => i.id === add1.json.item_id).quantity, 4);
    assert.equal(cart.json.items.filter((i: any) => i.quantity === 1).length, 1); // o outro não mudou
    await api(`/api/catalog2/cart/items/${add1.json.item_id}`, { method: "DELETE", token: CO.token });
    cart = await api("/api/catalog2/cart", { token: CO.token });
    assert.equal(cart.json.count, 1);
    await api("/api/catalog2/cart/clear", { method: "POST", token: CO.token });
    cart = await api("/api/catalog2/cart", { token: CO.token });
    assert.equal(cart.json.count, 0);
  });

  it("20. filtros e paginação da listagem", async () => {
    const refs = await api("/api/catalog2/refs", { token: CO.token });
    const pillar = refs.json.pillars.find((p: any) => p.key === "redes_conteudo");
    const other = refs.json.pillars.find((p: any) => p.key !== "redes_conteudo");
    const hit = await api(`/api/catalog2/products?pillar_id=${pillar.id}&page_size=100`, { token: CO.token });
    assert.ok(hit.json.data.some((p: any) => p.slug === SLUG));
    const miss = await api(`/api/catalog2/products?pillar_id=${other.id}&page_size=100`, { token: CO.token });
    assert.ok(!miss.json.data.some((p: any) => p.slug === SLUG));
    const paged = await api("/api/catalog2/products?page_size=1&page=1", { token: CO.token });
    assert.equal(paged.json.data.length <= 1, true);
    assert.equal(paged.json.page_size, 1);
  });

  it("21. custos internos NUNCA aparecem para o cliente", async () => {
    const det = await api(`/api/catalog2/products/${SLUG}`, { token: CO.token });
    const cfg = await api(`/api/catalog2/products/${SLUG}/configure`, { method: "POST", token: CO.token, body: { variation_option_keys: ["estatico", "autorizado"] } });
    const blob = JSON.stringify(det.json) + JSON.stringify(cfg.json);
    for (const forbidden of ["human_cost", "direct_cost", "minimum_price", "taxes_and_margins", "ia_cost", "historical_price", "profit_margin", "commission", "subtotal_cost", "human_cost_breakdown"]) {
      assert.equal(blob.includes(forbidden), false, `campo interno "${forbidden}" vazou para o cliente`);
    }
  });

  it("22. os 36 produtos importados continuam RASCUNHOS (nenhum publicado neste bloco)", async () => {
    const published = await prisma.catalog2ProductVersion.count({
      where: { state: "publicada", product: { import_origin: { isNot: null } } },
    });
    assert.equal(published, 0);
  });

  it("23. o catálogo do cliente NUNCA escreve na tabela de produtos operacionais", async () => {
    // No banco de teste não há os 162 seedados; o invariante checável aqui é
    // que um ciclo completo do cliente (configurar → cotar → cesta → limpar)
    // não cria nem apaga nenhum `product` operacional. (Os 162 do ambiente
    // local ficam intactos — validado à parte pela migração/importador.)
    const before = await prisma.product.count();
    await api(`/api/catalog2/products/${SLUG}/configure`, { method: "POST", token: CO.token, body: { variation_option_keys: ["carrossel", "autorizado"] } });
    await api("/api/catalog2/quotes", { method: "POST", token: CO.token, body: { product: SLUG, selection: { variation_option_keys: ["carrossel", "autorizado"] } } });
    await api("/api/catalog2/cart/items", { method: "POST", token: CO.token, body: { product: SLUG, selection: { variation_option_keys: ["estatico", "autorizado"] } } });
    await api("/api/catalog2/cart/clear", { method: "POST", token: CO.token });
    assert.equal(await prisma.product.count(), before);
    // e nenhuma versão publicada nova no catalog2 (bloco 5 não publica nada).
    const importedPublished = await prisma.catalog2ProductVersion.count({ where: { state: "publicada", product: { import_origin: { isNot: null } } } });
    assert.equal(importedPublished, 0);
  });

  it("24. leader visualiza mas não contrata; nomad nem enxerga o catálogo", async () => {
    const leaderList = await api("/api/catalog2/products?page_size=100", { token: LEADER });
    assert.equal(leaderList.status, 200);
    const leaderDet = await api(`/api/catalog2/products/${SLUG}`, { token: LEADER });
    assert.equal(leaderDet.json.can_contract, false);
    const q = await api("/api/catalog2/quotes", { method: "POST", token: LEADER, body: { product: SLUG, selection: { variation_option_keys: ["estatico", "autorizado"] } } });
    assert.equal(q.status, 403);

    const nomadId = `c5nm-${crypto.randomBytes(5).toString("hex")}`;
    const nomad = await prisma.user.create({ data: { id: nomadId, email: `${nomadId}@example.test`, password_hash: "x", name: "Nomad", role: "nomad", account_type: "nomades", is_active: true, status: "ativo" } });
    users.push(nomad.id);
    const nomadList = await api("/api/catalog2/products", { token: tokenFor(nomad) });
    assert.equal(nomadList.status, 404);
  });

  it("25. admin comum não pré-visualiza rascunho, mas a lista pública responde", async () => {
    const draft = await api(`/api/catalog2/products/${DRAFT_SLUG}?preview=1`, { token: COMMON_ADMIN });
    assert.equal(draft.status, 404);
    const list = await api("/api/catalog2/products?page_size=100", { token: COMMON_ADMIN });
    assert.equal(list.status, 200);
    assert.ok(!list.json.data.some((p: any) => p.slug === DRAFT_SLUG));
  });
});
