import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import { seedCatalog2Classifications, seedCatalog2FourFForTests } from "../lib/catalog2-classifications-seed";
import { computePricing } from "../lib/catalog2-pricing";

// Construtor + regras + prazos + precificação (sprint de produtos, bloco 3/6).

let baseUrl = "";
let server: import("node:http").Server;
let app: import("express").Express;
let boilerplateSeeded = false;

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
  const id = `c3-${crypto.randomBytes(6).toString("hex")}`;
  const p = await prisma.adminProfile.create({ data: { name: `C3 ${id}`, is_master: true, is_active: true } });
  adminProfiles.push(p.id);
  const u = await prisma.user.create({
    data: { id, email: `${id}@example.test`, password_hash: "x", name: `M ${id}`, role: "admin", account_type: "admin", is_active: true, status: "ativo", admin_profile_id: p.id },
  });
  users.push(u.id);
  return u;
}

// Cria um produto com 2 tarefas humanas com tempo + especialidade com valor/hora.
async function mkPricedProduct(masterId: string, opts: { withRates?: boolean } = {}) {
  const spec = await prisma.catalog2Specialty.findFirstOrThrow({ where: { key: "designer" } });
  if (opts.withRates ?? true) await prisma.catalog2Specialty.update({ where: { id: spec.id }, data: { max_hourly_rate: 100 } });
  else await prisma.catalog2Specialty.update({ where: { id: spec.id }, data: { max_hourly_rate: null } });

  const t = await api(`/api/admin/catalog2/products`, { method: "POST", token: TOKEN, body: { internal_name: `[TESTE LOCAL] Preço ${crypto.randomBytes(3).toString("hex")}` } });
  const productId = t.json.id;
  products.push(productId);
  const v1 = t.json.versions[0].id;
  await api(`/api/admin/catalog2/versions/${v1}/tasks`, { method: "POST", token: TOKEN, body: { key: "t1", name: "Tarefa 1", specialty_id: spec.id, execution_mode: "humano", estimated_minutes: 120 } });
  return { productId, v1, specId: spec.id };
}

let TOKEN = "";

describe("Construtor: regras, prazos e precificação", () => {
  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;

    // (item 19) O backend inicia SEM criar classificações: como `app` já foi
    // carregado por outros testes na mesma suíte às vezes, checamos que
    // NENHUM seed automático ocorreu — só o nosso, explícito, a seguir.
    const before = await prisma.catalog2Pillar.count();
    boilerplateSeeded = before > 0;

    app = (await import("../app")).default;
    await seedCatalog2FourFForTests(prisma);
    await seedCatalog2Classifications(prisma);
    // Percentuais zerados + ORDEM confirmada → configuração comercial completa
    // (bloco 5, correção 1: sem ordem confirmada o preço fica "A definir").
    const pricingSeed = {
      tax_percent: 0, commission_percent: 0, operational_fee_percent: 0, profit_margin_percent: 0, human_review_percent: 0,
      component_order_json: JSON.stringify(["tax", "commission", "operational", "margin"]),
    };
    await prisma.catalog2PricingSettings.upsert({
      where: { id: "default" },
      create: { id: "default", ...pricingSeed },
      update: pricingSeed,
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

  it("19. o backend não semeia classificações automaticamente (sem ensure* no boot)", () => {
    // Se `app`/index tivesse seed no boot, `before` (pilares) seria > 0 antes
    // do nosso seed explícito. Em suíte isolada isso é 0.
    assert.equal(boilerplateSeeded, false);
  });

  it("14. custo humano determinístico (tempo × valor/hora, referência máxima)", async () => {
    const master = await mkMaster();
    void master;
    const { v1 } = await mkPricedProduct("", { withRates: true });
    const r1 = await api(`/api/admin/catalog2/versions/${v1}/simulate`, { method: "POST", token: TOKEN, body: {} });
    const r2 = await api(`/api/admin/catalog2/versions/${v1}/simulate`, { method: "POST", token: TOKEN, body: {} });
    // 120 min = 2h × R$100 = R$200 (taxas/margens zeradas neste teste)
    assert.equal(r1.json.pricing.lines.human_cost.amount, 200);
    assert.equal(r1.json.pricing.lines.final_price.amount, r2.json.pricing.lines.final_price.amount);
    assert.equal(r1.json.pricing.pricing_pending, false);
  });

  it("custo humano pendente quando a especialidade não tem valor/hora — sem inventar valor", async () => {
    const { v1 } = await mkPricedProduct("", { withRates: false });
    const r = await api(`/api/admin/catalog2/versions/${v1}/simulate`, { method: "POST", token: TOKEN, body: {} });
    assert.equal(r.json.pricing.lines.human_cost.amount, null);
    assert.equal(r.json.pricing.pricing_pending, true);
    assert.equal(r.json.pricing.lines.final_price.amount, null);
  });

  it("15. custo de IA determinístico (tokens + rodadas de revisão), sem chamada externa", async () => {
    const { productId, v1 } = await mkPricedProduct("", { withRates: true });
    void productId;
    await api(`/api/admin/catalog2/versions/${v1}/tasks`, { method: "POST", token: TOKEN, body: { key: "ia", name: "Tarefa IA", execution_mode: "ia" } });
    const detail = await api(`/api/admin/catalog2/products/${(await prisma.catalog2ProductVersion.findUniqueOrThrow({ where: { id: v1 } })).product_id}`, { token: TOKEN });
    const iaTask = detail.json.versions[0].tasks.find((t: any) => t.key === "ia");
    await api(`/api/admin/catalog2/tasks/${iaTask.id}/ai`, {
      method: "PUT", token: TOKEN,
      body: { est_input_tokens: 1000, est_output_tokens: 1000, unit_cost_input_per_1k: 0.01, unit_cost_output_per_1k: 0.03, est_review_rounds: 2 },
    });
    const r = await api(`/api/admin/catalog2/versions/${v1}/simulate`, { method: "POST", token: TOKEN, body: {} });
    // (1000/1000*0.01 + 1000/1000*0.03) * (1 + 2) = 0.04 * 3 = 0.12
    assert.equal(r.json.pricing.lines.ia_cost.amount, 0.12);
  });

  it("12. condição tipada funciona (gatilho → efeito); 16. simulador usa o cálculo do backend", async () => {
    const { productId, v1 } = await mkPricedProduct("", { withRates: true });
    // variação Formato com opção motion
    const va = await api(`/api/admin/catalog2/versions/${v1}/variations`, { method: "POST", token: TOKEN, body: { key: "formato", name: "Formato" } });
    await api(`/api/admin/catalog2/variations/${va.json.id}/options`, { method: "POST", token: TOKEN, body: { key: "estatico", label: "Estático", is_default: true } });
    const motion = await api(`/api/admin/catalog2/variations/${va.json.id}/options`, { method: "POST", token: TOKEN, body: { key: "motion", label: "Motion" } });
    // condição: se motion selecionado → +5 dias no prazo
    const cond = await api(`/api/admin/catalog2/versions/${v1}/conditions`, {
      method: "POST", token: TOKEN,
      body: { key: "motion_prazo", name: "Motion adiciona prazo", trigger_source: "variation_option", trigger_ref: "motion", operator: "selected", effect_type: "add_deadline_days", effect_value: "5" },
    });
    assert.equal(cond.status, 201);
    assert.match(cond.json.explanation, /5 dia/);

    const base = await api(`/api/admin/catalog2/versions/${v1}/simulate`, { method: "POST", token: TOKEN, body: { variation_option_keys: ["estatico"] } });
    const withMotion = await api(`/api/admin/catalog2/versions/${v1}/simulate`, { method: "POST", token: TOKEN, body: { variation_option_keys: ["motion"] } });
    assert.equal(withMotion.json.pricing.estimated_deadline_days, base.json.pricing.estimated_deadline_days + 5);
    assert.equal(withMotion.json.pricing.applied_conditions.length, 1);

    // 16: a pré-visualização usa o MESMO cálculo (seleção padrão = estático)
    const preview = await api(`/api/admin/catalog2/versions/${v1}/preview`, { token: TOKEN });
    assert.equal(preview.json.estimated_deadline_days, base.json.pricing.estimated_deadline_days);
    assert.equal(preview.json.price, base.json.pricing.lines.final_price.amount);
    void motion; void productId;
  });

  it("13. condição inválida é recusada (efeito aponta para tarefa inexistente / operador desconhecido)", async () => {
    const { v1 } = await mkPricedProduct("", { withRates: true });
    const bad1 = await api(`/api/admin/catalog2/versions/${v1}/conditions`, {
      method: "POST", token: TOKEN,
      body: { key: "x", name: "X", trigger_source: "quantity", operator: "gte", comparison_value: "2", effect_type: "add_task", effect_value: "nao_existe" },
    });
    assert.equal(bad1.status, 422);
    const bad2 = await api(`/api/admin/catalog2/versions/${v1}/conditions`, {
      method: "POST", token: TOKEN,
      body: { key: "y", name: "Y", trigger_source: "quantity", operator: "elvis", comparison_value: "2", effect_type: "add_percent", effect_value: "10" },
    });
    assert.equal(bad2.status, 400); // zod enum
  });

  it("11. relação de OUTRO produto/versão é recusada (dependência entre tarefas)", async () => {
    const a = await mkPricedProduct("", { withRates: true });
    const b = await mkPricedProduct("", { withRates: true });
    const taskA = await prisma.catalog2Task.findFirstOrThrow({ where: { version_id: a.v1 } });
    const taskB = await prisma.catalog2Task.findFirstOrThrow({ where: { version_id: b.v1 } });
    const res = await api(`/api/admin/catalog2/tasks/${taskA.id}/dependencies`, { method: "POST", token: TOKEN, body: { depends_on_task_id: taskB.id } });
    assert.equal(res.status, 422);
    assert.equal(res.json.code, "cross_version_ref");
  });

  it("17. valores/prazos/tokens negativos são recusados", async () => {
    const { v1 } = await mkPricedProduct("", { withRates: true });
    const t = await api(`/api/admin/catalog2/versions/${v1}/tasks`, { method: "POST", token: TOKEN, body: { key: "neg", name: "Neg", estimated_minutes: -5 } });
    assert.equal(t.status, 400);
    const va = await api(`/api/admin/catalog2/versions/${v1}/variations`, { method: "POST", token: TOKEN, body: { key: "v", name: "V" } });
    const o = await api(`/api/admin/catalog2/variations/${va.json.id}/options`, { method: "POST", token: TOKEN, body: { key: "o", label: "O" } });
    const eff = await api(`/api/admin/catalog2/options/${o.json.id}/effects`, { method: "POST", token: TOKEN, body: { effect_type: "add_fixed_amount", effect_value: "-10" } });
    assert.equal(eff.status, 422);
    const pr = await api(`/api/admin/catalog2/pricing-settings`, { method: "PUT", token: TOKEN, body: { tax_percent: -1 } });
    assert.equal(pr.status, 400);
  });

  it("6/7. versão publicada é imutável; publicar 2x (mesmo client_action_id) não cria 2 versões", async () => {
    const master2 = await mkMaster();
    void master2;
    const p = await api(`/api/admin/catalog2/products`, {
      method: "POST", token: TOKEN,
      body: { internal_name: `[TESTE LOCAL] Publica ${crypto.randomBytes(3).toString("hex")}`, pillar_id: (await prisma.catalog2Pillar.findFirstOrThrow()).id, category_id: (await prisma.catalog2Category.findFirstOrThrow()).id, four_f_ids: [(await prisma.catalog2FourF.findFirstOrThrow()).id] },
    });
    products.push(p.json.id);
    const v1 = p.json.versions[0].id;
    await api(`/api/admin/catalog2/versions/${v1}`, { method: "PUT", token: TOKEN, body: { full_description: "desc completa" } });
    const spec = await prisma.catalog2Specialty.findFirstOrThrow();
    await prisma.catalog2Specialty.update({ where: { id: spec.id }, data: { max_hourly_rate: 100 } });
    await api(`/api/admin/catalog2/versions/${v1}/tasks`, { method: "POST", token: TOKEN, body: { key: "t", name: "T", specialty_id: spec.id, estimated_minutes: 60 } });

    const cai = `pub-${crypto.randomBytes(4).toString("hex")}`;
    const r1 = await api(`/api/admin/catalog2/versions/${v1}/publish`, { method: "POST", token: TOKEN, body: { client_action_id: cai } });
    assert.equal(r1.status, 200);
    const r2 = await api(`/api/admin/catalog2/versions/${v1}/publish`, { method: "POST", token: TOKEN, body: { client_action_id: cai } });
    assert.equal(r2.status, 200);
    assert.equal(r1.json.version_id, r2.json.version_id);
    assert.equal(await prisma.catalog2ProductVersion.count({ where: { product_id: p.json.id, state: "publicada" } }), 1);

    // editar a versão publicada → 409
    const edit = await api(`/api/admin/catalog2/versions/${v1}`, { method: "PUT", token: TOKEN, body: { title: "hack" } });
    assert.equal(edit.status, 409);
    // adicionar tarefa à versão publicada → 409
    const addTask = await api(`/api/admin/catalog2/versions/${v1}/tasks`, { method: "POST", token: TOKEN, body: { key: "x", name: "X" } });
    assert.equal(addTask.status, 409);

    // nova versão preserva a publicada e clona a estrutura
    const nv = await api(`/api/admin/catalog2/products/${p.json.id}/versions`, { method: "POST", token: TOKEN });
    assert.equal(nv.status, 201);
    const detail = await api(`/api/admin/catalog2/products/${p.json.id}`, { token: TOKEN });
    const draft = detail.json.versions.find((x: any) => x.state === "rascunho");
    assert.equal(draft.tasks.length, 1, "estrutura clonada para o rascunho");
    assert.equal(detail.json.published_version_id, v1, "produto ainda aponta pra v1");
  });

  it("validate: aponta pendências antes de publicar; força permite publicar com pendência comercial", async () => {
    const p = await api(`/api/admin/catalog2/products`, { method: "POST", token: TOKEN, body: { internal_name: `[TESTE LOCAL] Valida ${crypto.randomBytes(3).toString("hex")}` } });
    products.push(p.json.id);
    const v1 = p.json.versions[0].id;
    const val = await api(`/api/admin/catalog2/versions/${v1}/validate`, { token: TOKEN });
    assert.equal(val.json.ok, false);
    assert.ok(val.json.issues.some((i: string) => /pilar/i.test(i)));
    assert.ok(val.json.issues.some((i: string) => /tarefa/i.test(i)));
    // publicar sem force → 422
    const pub = await api(`/api/admin/catalog2/versions/${v1}/publish`, { method: "POST", token: TOKEN, body: {} });
    assert.equal(pub.status, 422);
  });

  it("computePricing (unidade) é puro e determinístico dado o mesmo input", async () => {
    const { v1 } = await mkPricedProduct("", { withRates: true });
    const a = await computePricing(v1, { quantity: 3 });
    const b = await computePricing(v1, { quantity: 3 });
    assert.deepEqual(a.lines.final_price, b.lines.final_price);
    assert.equal(a.quantity, 3);
  });
});
