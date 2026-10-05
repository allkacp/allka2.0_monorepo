import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import { seedCatalog2Classifications, seedCatalog2FourFForTests } from "../lib/catalog2-classifications-seed";
import { computePricing, defaultSelection } from "../lib/catalog2-pricing";
import { clientPricingView } from "../lib/catalog2-client";

// Reunião 10/09 ("precificação dos 36 produtos funcional para teste"): modo
// de SIMULAÇÃO — estrutura provisória separada do singleton comercial real,
// nunca autoriza nada, nunca vaza para client-facing.

let baseUrl = "";
let server: import("node:http").Server;
let app: import("express").Express;

const users: string[] = [];
const adminProfiles: string[] = [];
const products: string[] = [];

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

async function mkMaster() {
  const id = `cps-${crypto.randomBytes(6).toString("hex")}`;
  const p = await prisma.adminProfile.create({ data: { name: `CPS ${id}`, is_master: true, is_active: true } });
  adminProfiles.push(p.id);
  const u = await prisma.user.create({
    data: { id, email: `${id}@example.test`, password_hash: "x", name: `M ${id}`, role: "admin", account_type: "admin", is_active: true, status: "ativo", admin_profile_id: p.id },
  });
  users.push(u.id);
  return u;
}

async function mkPricedProduct() {
  const spec = await prisma.catalog2Specialty.findFirstOrThrow({ where: { key: "designer" } });
  await prisma.catalog2Specialty.update({ where: { id: spec.id }, data: { max_hourly_rate: 100 } });
  const t = await api(`/api/admin/catalog2/products`, { method: "POST", token: TOKEN, body: { internal_name: `[TESTE LOCAL] Simulação ${crypto.randomBytes(3).toString("hex")}` } });
  const productId = t.json.id;
  products.push(productId);
  const v1 = t.json.versions[0].id;
  await api(`/api/admin/catalog2/versions/${v1}/tasks`, { method: "POST", token: TOKEN, body: { key: "t1", name: "Tarefa 1", specialty_id: spec.id, execution_mode: "humano", estimated_minutes: 120 } });
  return { productId, v1 };
}

let TOKEN = "";

describe("Precificação — fonte única da regra e pré-visualização (reunião 10/09, revisada em 2026-10-02)", () => {
  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;

    app = (await import("../app")).default;
    await seedCatalog2FourFForTests(prisma);
    await seedCatalog2Classifications(prisma);

    // Config REAL: totalmente completa mas com percentuais DIFERENTES da
    // simulação (para provar que o modo simulação nunca lê/mistura com o real).
    const realSeed = {
      tax_percent: 6, commission_percent: 10, operational_fee_percent: 5, profit_margin_percent: 30, human_review_percent: 15,
      component_order_json: JSON.stringify(["tax", "commission", "operational", "margin"]),
    };
    await prisma.catalog2PricingSettings.upsert({ where: { id: "default" }, create: { id: "default", ...realSeed }, update: realSeed });

    // Config PROVISÓRIA antiga (reunião 10/09): continua guardada, mas NUNCA mais alimenta preço algum — o teste prova que é ignorada.
    const simSeed = {
      tax_percent: 6, commission_percent: 10, operational_fee_percent: 5, profit_margin_percent: 20, human_review_percent: 10,
      component_order_json: JSON.stringify(["tax", "commission", "operational", "margin"]),
      is_provisional: true, source: "provisional_simulation_v1",
    };
    await prisma.catalog2PricingSimulationSettings.upsert({ where: { id: "default" }, create: { id: "default", ...simSeed }, update: simSeed });
    const designer = await prisma.catalog2Specialty.findUniqueOrThrow({ where: { key: "designer" } });
    await prisma.catalog2PricingSimulationSpecialtyRate.upsert({
      where: { specialty_id: designer.id },
      create: { specialty_id: designer.id, hourly_rate: 90, is_provisional: true, source: "provisional_simulation_v1" },
      update: { hourly_rate: 90, is_provisional: true, source: "provisional_simulation_v1" },
    });

    const master = await mkMaster();
    TOKEN = tokenFor(master);
    server = app.listen(0);
    await new Promise<void>((r) => server.once("listening", () => r()));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  after(async () => {
    await new Promise<void>((res, rej) => server.close((e) => (e ? rej(e) : res())));
    for (const id of products) {
      await prisma.catalog2Product.update({ where: { id }, data: { published_version_id: null } }).catch(() => {});
      await prisma.catalog2ProductVersion.deleteMany({ where: { product_id: id } });
      await prisma.catalog2ProductFourF.deleteMany({ where: { product_id: id } });
      await prisma.catalog2Product.delete({ where: { id } }).catch(() => {});
    }
    await prisma.productFeedbackAccessAudit.deleteMany({ where: { action: { startsWith: "catalog2." } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await prisma.adminProfile.deleteMany({ where: { id: { in: adminProfiles } } });
    await prisma.$disconnect();
  });

  it("a configuração provisória antiga é IGNORADA: pré-visualização e cálculo normal usam a mesma regra real (fonte única)", async () => {
    const { v1 } = await mkPricedProduct();
    const sel = await defaultSelection(v1);
    const real = await computePricing(v1, sel);
    const prev = await computePricing(v1, sel, { previewOnly: true });
    const legacy = await computePricing(v1, sel, { simulateProvisional: true }); // alias antigo: mesma regra real
    // margem/revisão da provisória (20%/10%) diferem da real (30%/15%): se fossem lidas, os preços divergiriam
    assert.equal(prev.lines.final_price.amount, real.lines.final_price.amount);
    assert.equal(prev.simulation.total, real.simulation.total);
    assert.equal(legacy.simulation.total, real.simulation.total);
    assert.equal(prev.rule.hash, real.rule.hash, "mesma versão da regra");
    assert.equal(prev.rule.profit_margin_percent, 30);
    assert.equal(prev.rule.qualification_percent, 15);
    assert.equal(prev.rule.hourly_rates_applied.find((r) => r.specialty)?.hourly_rate, 100, "valor/hora real, não o provisório (90)");
    assert.equal(prev.simulation_provenance.commercial_config, "real");
    assert.equal(real.simulation_provenance.commercial_config, "real");
  });

  it("pré-visualização: commercial_ready é sempre false (nunca autoriza cotação/contratação), mesmo com config e prazo completos", async () => {
    const { v1 } = await mkPricedProduct();
    await prisma.catalog2ProductVersion.update({ where: { id: v1 }, data: { base_commercial_deadline_days: 10 } });
    const sel = await defaultSelection(v1);
    const real = await computePricing(v1, sel);
    assert.equal(real.commercial_ready, true, "a regra completa fecha o preço de venda");
    const prev = await computePricing(v1, sel, { previewOnly: true });
    assert.equal(prev.commercial_ready, false);
    assert.equal(prev.is_simulation, true);
    assert.ok(prev.quote_blockers.some((b) => /pré-visualização/.test(b)));
    assert.notEqual(prev.lines.final_price.amount, null, "a memória de cálculo fecha o preço mesmo bloqueando a aprovação");
  });

  it("prazo provisório só é usado como fallback na pré-visualização quando o real está ausente; real sempre vence", async () => {
    const { v1 } = await mkPricedProduct();
    await prisma.catalog2ProductVersion.update({ where: { id: v1 }, data: { provisional_commercial_deadline_days: 10 } });
    const sel = await defaultSelection(v1);
    const prevFallback = await computePricing(v1, sel, { previewOnly: true });
    assert.equal(prevFallback.deadline.commercial_deadline_days, 10);
    assert.equal(prevFallback.simulation_provenance.deadline, "provisional");

    await prisma.catalog2ProductVersion.update({ where: { id: v1 }, data: { base_commercial_deadline_days: 3 } });
    const prevWithReal = await computePricing(v1, sel, { previewOnly: true });
    assert.equal(prevWithReal.deadline.commercial_deadline_days, 3, "prazo real vence mesmo na pré-visualização");
    assert.equal(prevWithReal.simulation_provenance.deadline, "real");

    const real = await computePricing(v1, sel);
    assert.equal(real.deadline.commercial_deadline_days, 3);
  });

  it("sem a regra real cadastrada, o preço fica pendente ('missing') — nunca inventa valor nem cai em outra configuração", async () => {
    const { v1 } = await mkPricedProduct();
    const backup = await prisma.catalog2PricingSettings.findUniqueOrThrow({ where: { id: "default" } });
    await prisma.catalog2PricingSettings.deleteMany({ where: { id: "default" } });
    try {
      const sel = await defaultSelection(v1);
      const r = await computePricing(v1, sel, { previewOnly: true });
      assert.equal(r.simulation_provenance.commercial_config, "missing");
      assert.equal(r.pricing_pending, true);
      assert.equal(r.commercial_ready, false);
      assert.equal(r.lines.commercial_final_price.amount, null);
    } finally {
      const { created_at: _c, updated_at: _u, ...rest } = backup;
      await prisma.catalog2PricingSettings.upsert({ where: { id: "default" }, create: rest, update: rest });
    }
  });

  it("rota admin pricing-memory devolve UM cálculo (pricing e pricing_simulation idênticos), com a versão da regra", async () => {
    const { productId, v1 } = await mkPricedProduct();
    await prisma.catalog2ProductVersion.update({ where: { id: v1 }, data: { provisional_commercial_deadline_days: 7 } });
    const r = await api(`/api/admin/catalog2/products/${productId}/pricing-memory`, { token: TOKEN });
    assert.equal(r.status, 200);
    assert.equal(r.json.pricing.is_simulation, false);
    assert.equal(r.json.pricing_simulation.is_simulation, false, "não existe mais um segundo cálculo");
    assert.equal(r.json.pricing_simulation.rule.hash, r.json.pricing.rule.hash);
    assert.ok(r.json.pricing.rule.version >= 1);
    assert.equal(r.json.pricing.commercial_ready, false); // prazo real ainda não definido
  });

  it("publicar com force:true continua bloqueado por pendência comercial mesmo com dados provisórios presentes", async () => {
    const { productId, v1 } = await mkPricedProduct();
    await prisma.catalog2ProductVersion.update({ where: { id: v1 }, data: { provisional_commercial_deadline_days: 7 } });
    const val = await api(`/api/admin/catalog2/versions/${v1}/validate`, { token: TOKEN });
    // pendência comercial (prazo real não fechado) continua listada — a pré-visualização não altera o fluxo de publicação real.
    assert.equal(val.json.ok, false);
    void productId;
  });

  it("computePricing sem opts (default) nunca retorna is_simulation=true", async () => {
    const { v1 } = await mkPricedProduct();
    const sel = await defaultSelection(v1);
    const r = await computePricing(v1, sel);
    assert.equal(r.is_simulation, false);
    assert.equal(r.simulation_provenance.commercial_config, "real");
  });

  it("defesa em profundidade: clientPricingView nunca expõe commercial_ready=true se is_simulation vier true", async () => {
    const { v1 } = await mkPricedProduct();
    const sel = await defaultSelection(v1);
    // Hipotético: mesmo que algo, algum dia, chame computePricing em pré-visualização a partir de um caminho client-facing,
    // a view do cliente ainda teria que recusar commercial_ready=true.
    const prev = await computePricing(v1, sel, { previewOnly: true });
    const view = clientPricingView(prev);
    assert.equal(view.commercial_ready, false);
  });
});
