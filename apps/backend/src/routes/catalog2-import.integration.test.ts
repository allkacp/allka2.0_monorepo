import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import app from "../app";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import { seedCatalog2Classifications, seedCatalog2FourFForTests } from "../lib/catalog2-classifications-seed";
import { computePricing } from "../lib/catalog2-pricing";

// Importação auditável dos 36 produtos (sprint de produtos, bloco 4/6):
// rotas de resumo/qualidade/origem, filtros da listagem, resolução de
// pendência, carimbo de edição humana e a separação esforço × prazo
// comercial no motor de preço.

let baseUrl = "";
let server: import("node:http").Server;
const users: string[] = [];
const adminProfiles: string[] = [];
const catProducts: string[] = [];
const batches: string[] = [];

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
async function mkUser(master: boolean) {
  const id = `c4-${crypto.randomBytes(6).toString("hex")}`;
  const p = await prisma.adminProfile.create({ data: { name: `C4 ${id}`, is_master: master, is_active: true } });
  adminProfiles.push(p.id);
  const u = await prisma.user.create({
    data: { id, email: `${id}@example.test`, password_hash: "x", name: `U ${id}`, role: "admin", account_type: "admin", is_active: true, status: "ativo", admin_profile_id: p.id },
  });
  users.push(u.id);
  return u;
}

// Cria um produto do novo catálogo com 1 versão rascunho e, opcionalmente,
// um registro de origem de importação com pendências/divergências.
async function mkImported(opts: {
  index: number;
  roseReviewed?: boolean;
  origin?: string;
  pendencies?: string[];
  divergences?: unknown[];
  reviewState?: string;
}) {
  const slug = `p${String(opts.index).padStart(2, "0")}-teste-import-${crypto.randomBytes(3).toString("hex")}`;
  const product = await prisma.catalog2Product.create({
    data: { slug, internal_name: `[TESTE LOCAL] Import #${opts.index}`, origin: opts.origin ?? "existente", status: "em_preparacao" },
  });
  catProducts.push(product.id);
  const v = await prisma.catalog2ProductVersion.create({
    data: { product_id: product.id, version_number: 1, state: "rascunho", title: `[TESTE LOCAL] Import #${opts.index}` },
  });
  const pend = opts.pendencies ?? ["content_review_pending", "price_pending", "deadline_pending", "portfolio_pending"];
  await prisma.catalog2ProductImportOrigin.create({
    data: {
      product_id: product.id,
      source_key: `catalogo_v9:${opts.index}-${crypto.randomBytes(3).toString("hex")}`,
      source_index: opts.index,
      source_name: `[TESTE LOCAL] Import #${opts.index}`,
      rose_reviewed: opts.roseReviewed ?? false,
      area_rose: opts.roseReviewed ? "Designer" : null,
      review_state: opts.reviewState ?? pend[0] ?? "ready_for_final_review",
      pendencies_json: JSON.stringify(pend),
      last_import_checksum: `chk-${crypto.randomBytes(6).toString("hex")}`,
      main_fields_json: JSON.stringify({ name: `[TESTE LOCAL] Import #${opts.index}`, category: "Redação" }),
      rose_fields_json: JSON.stringify(opts.roseReviewed ? { descricao_atualizada: "texto da Rose" } : {}),
      original_texts_json: JSON.stringify({ variations_raw: "texto livre preservado" }),
      divergences_json: JSON.stringify(opts.divergences ?? []),
      historical_price_min: 500,
      historical_price_max: 900,
      historical_price_note: "Referência histórica da planilha — NÃO é o preço final.",
    },
  });
  return { product, versionId: v.id };
}

// Remove um produto do novo catálogo e tudo que aponta para ele, sem
// depender de ON DELETE CASCADE (o `prisma db push` de teste nem sempre o
// aplica em todas as relações).
async function purgeProduct(id: string) {
  const versions = await prisma.catalog2ProductVersion.findMany({ where: { product_id: id }, select: { id: true } });
  const vids = versions.map((v) => v.id);
  if (vids.length) {
    await prisma.catalog2VersionEvent.deleteMany({ where: { version_id: { in: vids } } }).catch(() => {});
    await prisma.catalog2Variation.deleteMany({ where: { version_id: { in: vids } } }).catch(() => {});
    await prisma.catalog2Addon.deleteMany({ where: { version_id: { in: vids } } }).catch(() => {});
    await prisma.catalog2Task.deleteMany({ where: { version_id: { in: vids } } }).catch(() => {});
  }
  const origin = await prisma.catalog2ProductImportOrigin.findUnique({ where: { product_id: id } }).catch(() => null);
  if (origin) {
    await prisma.catalog2ReviewResolution.deleteMany({ where: { origin_id: origin.id } }).catch(() => {});
    await prisma.catalog2ProductImportOrigin.delete({ where: { id: origin.id } }).catch(() => {});
  }
  await prisma.catalog2ImportRecord.deleteMany({ where: { product_id: id } }).catch(() => {});
  await prisma.catalog2ProductFourF.deleteMany({ where: { product_id: id } }).catch(() => {});
  await prisma.catalog2ProductVersion.deleteMany({ where: { product_id: id } }).catch(() => {});
  await prisma.catalog2Product.delete({ where: { id } }).catch(() => {});
}

let TOKEN = "";
let PLAIN_TOKEN = "";

describe("Importação dos 36 — rotas, filtros e carimbo humano", () => {
  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    await seedCatalog2FourFForTests(prisma);
    await seedCatalog2Classifications(prisma);
    TOKEN = tokenFor(await mkUser(true));
    PLAIN_TOKEN = tokenFor(await mkUser(false));
    server = app.listen(0);
    await new Promise<void>((r) => server.once("listening", () => r()));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  after(async () => {
    await new Promise<void>((res, rej) => server.close((e) => (e ? rej(e) : res())));
    for (const id of catProducts.splice(0)) await purgeProduct(id);
    for (const id of batches) await prisma.catalog2ImportBatch.delete({ where: { id } }).catch(() => {});
    for (const id of users) await prisma.user.delete({ where: { id } }).catch(() => {});
    for (const id of adminProfiles) await prisma.adminProfile.delete({ where: { id } }).catch(() => {});
  });

  it("25. /import/summary — só Admin Master (404 para os demais)", async () => {
    const forbidden = await api("/api/admin/catalog2/import/summary", { token: PLAIN_TOKEN });
    assert.equal(forbidden.status, 404);
    const ok = await api("/api/admin/catalog2/import/summary", { token: TOKEN });
    assert.equal(ok.status, 200);
    assert.equal(typeof ok.json.total_imported, "number");
    assert.equal(ok.json.expected, 36);
  });

  it("26. /import/summary agrega pendências e decisões pendentes", async () => {
    await mkImported({ index: 101, pendencies: ["price_pending", "deadline_pending"] });
    await mkImported({
      index: 102,
      roseReviewed: true,
      pendencies: ["classification_decision_pending"],
      divergences: [{ type: "area_vs_category", detail: "…", decision_pending: true }],
    });
    const r = await api("/api/admin/catalog2/import/summary", { token: TOKEN });
    assert.equal(r.status, 200);
    assert.ok(r.json.total_imported >= 2);
    assert.ok((r.json.by_pendency.price_pending ?? 0) >= 1);
    assert.ok(r.json.decisions_pending >= 1);
    assert.equal(r.json.published_count, 0);
  });

  it("27. /import/batches lista lotes; /import/quality responde", async () => {
    const b = await prisma.catalog2ImportBatch.create({
      data: {
        mode: "apply", rule_version: "36-produtos-2", status: "completed",
        source_main_name: "Allka_Proposta_Catalogo_Produtos_v9.xlsx", source_main_checksum: "abc123",
        source_rose_name: "Review Rose.xlsx", source_rose_checksum: "def456",
        expected_products: 36, created_count: 36, finished_at: new Date(),
        report_json: JSON.stringify({ quality: { expected_products: 36, found_products: 36 } }),
      },
    });
    batches.push(b.id);
    const list = await api("/api/admin/catalog2/import/batches", { token: TOKEN });
    assert.equal(list.status, 200);
    assert.ok(list.json.data.some((x: any) => x.id === b.id));
    const q = await api("/api/admin/catalog2/import/quality", { token: TOKEN });
    assert.equal(q.status, 200);
    assert.equal(q.json.has_import, true);
    assert.equal(q.json.batch_id, b.id);
  });

  it("28. /products/:id/origin traz planilha, Rose, divergências e preço histórico", async () => {
    const { product } = await mkImported({
      index: 103,
      roseReviewed: true,
      divergences: [{ type: "name_updated_seo_geo", detail: "SEO → SEO + GEO", decision_pending: false }],
    });
    const r = await api(`/api/admin/catalog2/products/${product.id}/origin`, { token: TOKEN });
    assert.equal(r.status, 200);
    assert.equal(r.json.source.index, 103);
    assert.equal(r.json.rose_reviewed, true);
    assert.deepEqual(r.json.rose_changed_fields, ["descricao_atualizada"]);
    assert.equal(r.json.historical_price.min, 500);
    assert.match(r.json.historical_price.note, /NÃO é o preço final/);
    assert.ok(r.json.divergences.some((d: any) => d.type === "name_updated_seo_geo"));
  });

  it("29. /products/:id/origin → 404 para produto não importado", async () => {
    const p = await prisma.catalog2Product.create({ data: { slug: `manual-${crypto.randomBytes(4).toString("hex")}`, internal_name: "[TESTE LOCAL] Manual", status: "em_preparacao" } });
    catProducts.push(p.id);
    const r = await api(`/api/admin/catalog2/products/${p.id}/origin`, { token: TOKEN });
    assert.equal(r.status, 404);
    assert.equal(r.json.code, "not_imported");
  });

  it("30. listagem filtra por importado / revisão da Rose / estado / pendência / origem", async () => {
    await mkImported({ index: 110, roseReviewed: true, origin: "novo", pendencies: ["price_pending"], reviewState: "price_pending" });
    const imported = await api("/api/admin/catalog2/products?imported=true&page_size=100", { token: TOKEN });
    assert.ok(imported.json.data.length >= 1);
    assert.ok(imported.json.data.every((p: any) => p.imported === true));

    const roseYes = await api("/api/admin/catalog2/products?rose_reviewed=true&page_size=100", { token: TOKEN });
    assert.ok(roseYes.json.data.every((p: any) => p.rose_reviewed === true));

    const byPend = await api("/api/admin/catalog2/products?pendency=price_pending&page_size=100", { token: TOKEN });
    assert.ok(byPend.json.data.every((p: any) => (p.pendencies ?? []).includes("price_pending")));

    const byOrigin = await api("/api/admin/catalog2/products?origin=novo&page_size=100", { token: TOKEN });
    assert.ok(byOrigin.json.data.every((p: any) => p.origin === "novo"));

    const byState = await api("/api/admin/catalog2/products?review_state=price_pending&page_size=100", { token: TOKEN });
    assert.ok(byState.json.data.every((p: any) => p.review_state === "price_pending"));
  });

  it("31. resolver pendência: remove a pendência, recalcula estado, registra decisão e preserva a divergência", async () => {
    const { product } = await mkImported({
      index: 120,
      roseReviewed: true,
      pendencies: ["classification_decision_pending", "price_pending"],
      reviewState: "classification_decision_pending",
      divergences: [{ type: "area_vs_category", detail: "Área Rose ≠ categoria", decision_pending: true }],
    });
    const r = await api(`/api/admin/catalog2/products/${product.id}/resolve-pendency`, {
      method: "POST",
      token: TOKEN,
      body: { pendency_key: "classification_decision_pending", decision: "Mantida a categoria Redação; área da Rose registrada como especialidade." },
    });
    assert.equal(r.status, 200);
    assert.deepEqual(r.json.remaining_pendencies, ["price_pending"]);
    assert.equal(r.json.review_state, "price_pending");

    const origin = await prisma.catalog2ProductImportOrigin.findUnique({
      where: { product_id: product.id },
      include: { resolutions: true },
    });
    assert.equal(origin!.resolutions.length, 1);
    assert.equal(origin!.resolutions[0].pendency_key, "classification_decision_pending");
    assert.match(origin!.resolutions[0].original_divergence_json ?? "", /area_vs_category/);
    // divergência original permanece intacta no snapshot da origem
    assert.match(origin!.divergences_json ?? "", /area_vs_category/);
    // decisão humana registrada → importador não sobrescreve mais
    assert.ok(origin!.human_edited_at);
  });

  it("32. resolver pendência inexistente → 422", async () => {
    const { product } = await mkImported({ index: 121, pendencies: ["price_pending"] });
    const r = await api(`/api/admin/catalog2/products/${product.id}/resolve-pendency`, {
      method: "POST",
      token: TOKEN,
      body: { pendency_key: "portfolio_pending", decision: "x" },
    });
    assert.equal(r.status, 422);
    assert.equal(r.json.code, "pendency_not_open");
  });

  it("33. editar o rascunho de um produto importado carimba human_edited_at (uma vez)", async () => {
    const { product, versionId } = await mkImported({ index: 130 });
    let origin = await prisma.catalog2ProductImportOrigin.findUnique({ where: { product_id: product.id } });
    assert.equal(origin!.human_edited_at, null);

    const put = await api(`/api/admin/catalog2/versions/${versionId}`, {
      method: "PUT",
      token: TOKEN,
      body: { summary: "ajuste humano no rascunho" },
    });
    assert.equal(put.status, 200);
    origin = await prisma.catalog2ProductImportOrigin.findUnique({ where: { product_id: product.id } });
    assert.ok(origin!.human_edited_at, "human_edited_at deve ficar preenchido");
    assert.equal(origin!.human_edited_by_user_id, users[0]);

    const stampedAt = origin!.human_edited_at!.getTime();
    await api(`/api/admin/catalog2/versions/${versionId}`, { method: "PUT", token: TOKEN, body: { summary: "segundo ajuste" } });
    const again = await prisma.catalog2ProductImportOrigin.findUnique({ where: { product_id: product.id } });
    assert.equal(again!.human_edited_at!.getTime(), stampedAt, "carimbo não muda na segunda edição");
  });
});

describe("Motor de preço — esforço interno × prazo comercial (bloco 4/6)", () => {
  const specKey = "designer";
  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    // As classificações já foram semeadas pelo describe anterior (mesmo banco).
  });
  after(async () => {
    for (const id of catProducts.splice(0)) await purgeProduct(id);
  });

  async function mkPriceVersion() {
    const spec = await prisma.catalog2Specialty.findFirstOrThrow({ where: { key: specKey } });
    await prisma.catalog2Specialty.update({ where: { id: spec.id }, data: { max_hourly_rate: 120 } });
    const product = await prisma.catalog2Product.create({
      data: { slug: `p99-preco-${crypto.randomBytes(3).toString("hex")}`, internal_name: "[TESTE LOCAL] Preço prazo", status: "em_preparacao" },
    });
    catProducts.push(product.id);
    const v = await prisma.catalog2ProductVersion.create({
      data: { product_id: product.id, version_number: 1, state: "rascunho", title: "v" },
    });
    await prisma.catalog2Task.create({
      data: { version_id: v.id, key: "t1", name: "Tarefa humana", specialty_id: spec.id, execution_mode: "humano", estimated_minutes: 960 },
    });
    return v.id;
  }

  it("34. sem prazo comercial base: esforço é calculado mas o prazo comercial fica pendente e NÃO bloqueia o preço", async () => {
    const vId = await mkPriceVersion();
    const r = await computePricing(vId, {});
    assert.ok(r.deadline.effort_days >= 2, "2 dias de esforço (960 min ÷ 480)");
    assert.equal(r.deadline.base_commercial_deadline_days, null);
    assert.equal(r.deadline.commercial_deadline_days, null);
    assert.equal(r.deadline.commercial_deadline_pending, true);
    // a estimativa INTERNA existe (esforço + efeitos); só não é "o prazo comercial"
    assert.equal(r.estimated_deadline_days, r.deadline.internal_estimate_days);
    assert.ok(r.estimated_deadline_days! >= 2);
    // prazo comercial pendente não entra em pending_info (isso é só de PREÇO)
    assert.ok(!r.pending_info.includes("prazo comercial base"));
  });

  it("35. com prazo comercial base definido: prazo comercial = base + dias de efeitos; esforço continua à parte", async () => {
    const vId = await mkPriceVersion();
    await prisma.catalog2ProductVersion.update({ where: { id: vId }, data: { base_commercial_deadline_days: 5 } });
    const r = await computePricing(vId, {});
    assert.equal(r.deadline.base_commercial_deadline_days, 5);
    assert.equal(r.deadline.commercial_deadline_days, 5);
    assert.equal(r.deadline.commercial_deadline_pending, false);
    assert.ok(r.deadline.effort_days >= 2);
    // esforço interno e prazo comercial são grandezas distintas
    assert.notEqual(r.deadline.effort_days, r.deadline.commercial_deadline_days);
  });

  it("36. ordem de incidência não confirmada → calcula pela ordem-padrão, mas sinaliza (nunca em silêncio)", async () => {
    const vId = await mkPriceVersion();
    await prisma.catalog2PricingSettings.upsert({
      where: { id: "default" },
      create: { id: "default", tax_percent: 10, commission_percent: 5, operational_fee_percent: 3, profit_margin_percent: 20, human_review_percent: 0, component_order_json: null },
      update: { tax_percent: 10, commission_percent: 5, operational_fee_percent: 3, profit_margin_percent: 20, human_review_percent: 0, component_order_json: null },
    });
    const r = await computePricing(vId, {});
    assert.equal(r.order_defined, false);
    assert.deepEqual(r.applied_order, ["tax", "commission", "operational", "margin"]);
    assert.ok(r.warnings.some((w) => w.code === "tax_order_not_confirmed"));
    // preço fecha (não fica em silêncio nem trava), acima do mínimo
    assert.ok((r.lines.commercial_final_price.amount ?? 0) > (r.lines.minimum_price.amount ?? 0));
    assert.equal(r.lines.minimum_price.amount, r.lines.direct_cost.amount);
  });

  it("37. com ordem definida e todas as taxas: fecha o preço comercial final acima do mínimo", async () => {
    const vId = await mkPriceVersion();
    await prisma.catalog2PricingSettings.upsert({
      where: { id: "default" },
      create: { id: "default", tax_percent: 10, commission_percent: 5, operational_fee_percent: 3, profit_margin_percent: 20, human_review_percent: 0, component_order_json: JSON.stringify(["tax", "commission", "operational", "margin"]) },
      update: { tax_percent: 10, commission_percent: 5, operational_fee_percent: 3, profit_margin_percent: 20, human_review_percent: 0, component_order_json: JSON.stringify(["tax", "commission", "operational", "margin"]) },
    });
    const r = await computePricing(vId, {});
    assert.equal(r.order_defined, true);
    assert.equal(r.pricing_pending, false);
    assert.ok(r.lines.commercial_final_price.amount! > r.lines.minimum_price.amount!);
  });
});
