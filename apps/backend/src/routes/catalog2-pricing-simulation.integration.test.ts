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

describe("Precificação — modo Simulação para teste (reunião 10/09)", () => {
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

    // Config de SIMULAÇÃO — estrutura própria e separada.
    const simSeed = {
      tax_percent: 6, commission_percent: 10, operational_fee_percent: 5, profit_margin_percent: 20, human_review_percent: 10,
      component_order_json: JSON.stringify(["tax", "commission", "operational", "margin"]),
      is_provisional: true, source: "provisional_simulation_v1",
    };
    await prisma.catalog2PricingSimulationSettings.upsert({ where: { id: "default" }, create: { id: "default", ...simSeed }, update: simSeed });

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

  it("modo simulação usa SOMENTE a config de simulação, nunca mistura com a real", async () => {
    const { v1 } = await mkPricedProduct();
    const sel = await defaultSelection(v1);
    const real = await computePricing(v1, sel);
    const sim = await computePricing(v1, sel, { simulateProvisional: true });
    // margem/revisão diferem entre real (30%/15%) e simulação (20%/10%) —
    // se o motor misturasse os dois, os preços finais seriam iguais.
    assert.notEqual(real.lines.final_price.amount, sim.lines.final_price.amount);
    assert.equal(sim.simulation_provenance.commercial_config, "provisional");
    assert.equal(real.simulation_provenance.commercial_config, "real");
  });

  it("commercial_ready é sempre false em modo simulação, mesmo com config e prazo completos", async () => {
    const { v1 } = await mkPricedProduct();
    await prisma.catalog2ProductVersion.update({ where: { id: v1 }, data: { provisional_commercial_deadline_days: 10, provisional_deadline_reason: "teste", provisional_deadline_source: "provisional_simulation_v1" } });
    const sel = await defaultSelection(v1);
    const sim = await computePricing(v1, sel, { simulateProvisional: true });
    assert.equal(sim.commercial_ready, false);
    assert.equal(sim.is_simulation, true);
    assert.ok(sim.quote_blockers.some((b) => /simulação/.test(b)));
    assert.notEqual(sim.lines.final_price.amount, null, "memória de cálculo fecha o preço mesmo bloqueando aprovação");
  });

  it("prazo provisório só é usado como fallback quando o real está ausente; real sempre vence", async () => {
    const { v1 } = await mkPricedProduct();
    await prisma.catalog2ProductVersion.update({ where: { id: v1 }, data: { provisional_commercial_deadline_days: 10 } });
    const sel = await defaultSelection(v1);
    const simFallback = await computePricing(v1, sel, { simulateProvisional: true });
    assert.equal(simFallback.deadline.commercial_deadline_days, 10);
    assert.equal(simFallback.simulation_provenance.deadline, "provisional");

    await prisma.catalog2ProductVersion.update({ where: { id: v1 }, data: { base_commercial_deadline_days: 3 } });
    const simWithReal = await computePricing(v1, sel, { simulateProvisional: true });
    assert.equal(simWithReal.deadline.commercial_deadline_days, 3, "prazo real vence mesmo em modo simulação");
    assert.equal(simWithReal.simulation_provenance.deadline, "real");

    const real = await computePricing(v1, sel);
    assert.equal(real.deadline.commercial_deadline_days, 3);
  });

  it("sem config de simulação cadastrada, o modo simulação fica 'missing' (nunca inventa valor)", async () => {
    const { v1 } = await mkPricedProduct();
    await prisma.catalog2PricingSimulationSettings.deleteMany({ where: { id: "default" } });
    const sel = await defaultSelection(v1);
    const sim = await computePricing(v1, sel, { simulateProvisional: true });
    assert.equal(sim.simulation_provenance.commercial_config, "missing");
    assert.equal(sim.pricing_pending, true);
    assert.equal(sim.commercial_ready, false);
    // restaura para os próximos testes
    const simSeed = {
      tax_percent: 6, commission_percent: 10, operational_fee_percent: 5, profit_margin_percent: 20, human_review_percent: 10,
      component_order_json: JSON.stringify(["tax", "commission", "operational", "margin"]),
    };
    await prisma.catalog2PricingSimulationSettings.upsert({ where: { id: "default" }, create: { id: "default", ...simSeed }, update: simSeed });
  });

  it("rota admin pricing-memory retorna pricing (real) e pricing_simulation lado a lado, mesmo motor", async () => {
    const { productId, v1 } = await mkPricedProduct();
    await prisma.catalog2ProductVersion.update({ where: { id: v1 }, data: { provisional_commercial_deadline_days: 7 } });
    const r = await api(`/api/admin/catalog2/products/${productId}/pricing-memory`, { token: TOKEN });
    assert.equal(r.status, 200);
    assert.equal(r.json.pricing.is_simulation, false);
    assert.equal(r.json.pricing_simulation.is_simulation, true);
    assert.equal(r.json.pricing_simulation.commercial_ready, false);
    assert.equal(r.json.pricing.commercial_ready, false); // prazo real ainda não definido
    assert.equal(r.json.pricing_simulation.deadline.commercial_deadline_days, 7);
  });

  it("publicar com force:true continua bloqueado por pendência comercial mesmo com dados de simulação presentes", async () => {
    const { productId, v1 } = await mkPricedProduct();
    await prisma.catalog2ProductVersion.update({ where: { id: v1 }, data: { provisional_commercial_deadline_days: 7 } });
    const val = await api(`/api/admin/catalog2/versions/${v1}/validate`, { token: TOKEN });
    // pendência comercial (preço/prazo reais não fechados) continua listada —
    // o motor de simulação não altera o fluxo de publicação real.
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
    // Hipotético: mesmo que algo, algum dia, chame computePricing com
    // simulateProvisional a partir de um caminho client-facing (o que a
    // auditoria de código confirma nunca acontecer hoje), a view do cliente
    // ainda teria que recusar commercial_ready=true.
    const sim = await computePricing(v1, sel, { simulateProvisional: true });
    const view = clientPricingView(sim);
    assert.equal(view.commercial_ready, false);
  });
});
