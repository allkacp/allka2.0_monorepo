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

  it("validate: aponta pendências antes de publicar; force não ignora pendências estruturais", async () => {
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
    // Force não pode mascarar título/classificação/tarefas ausentes. Só é
    // aceito quando a validação reporta exclusivamente pendência comercial.
    const forced = await api(`/api/admin/catalog2/versions/${v1}/publish`, { method: "POST", token: TOKEN, body: { force: true } });
    assert.equal(forced.status, 422);
    assert.equal(forced.json.code, "validation_force_not_allowed");
  });

  it("computePricing (unidade) é puro e determinístico dado o mesmo input", async () => {
    const { v1 } = await mkPricedProduct("", { withRates: true });
    const a = await computePricing(v1, { quantity: 3 });
    const b = await computePricing(v1, { quantity: 3 });
    assert.deepEqual(a.lines.final_price, b.lines.final_price);
    assert.equal(a.quantity, 3);
  });

  // Item 3 (reunião 2026-09-14, "Cadastro integrado do produto") — daqui pra
  // baixo: tarefas reutilizáveis, especialidade nova durante a tarefa, e
  // questionário (biblioteca compartilhada, vínculo por referência).
  describe("Cadastro integrado do produto (Item 3)", () => {
    it("questionário: criar, listar, editar, adicionar/editar/remover perguntas, reordenar", async () => {
      const created = await api("/api/admin/catalog2/questionnaires", { method: "POST", token: TOKEN, body: { name: "[TESTE] Briefing básico", description: "desc" } });
      assert.equal(created.status, 201);
      assert.deepEqual(created.json.questions, []);
      const qId = created.json.id;

      const list = await api("/api/admin/catalog2/questionnaires", { token: TOKEN });
      assert.equal(list.status, 200);
      assert.ok(list.json.data.some((q: any) => q.id === qId && q.question_count === 0));

      const q1 = await api(`/api/admin/catalog2/questionnaires/${qId}/questions`, { method: "POST", token: TOKEN, body: { key: "objetivo", label: "Qual o objetivo?", is_required: true } });
      assert.equal(q1.status, 201);
      const q2 = await api(`/api/admin/catalog2/questionnaires/${qId}/questions`, { method: "POST", token: TOKEN, body: { key: "publico", label: "Qual o público?", is_required: false } });
      assert.equal(q2.status, 201);

      const detail = await api(`/api/admin/catalog2/questionnaires/${qId}`, { token: TOKEN });
      assert.equal(detail.json.questions.length, 2);
      assert.equal(detail.json.questions[0].is_required, true);
      assert.equal(detail.json.questions[1].is_required, false);

      // editar pergunta
      const upd = await api(`/api/admin/catalog2/questions/${q1.json.id}`, { method: "PUT", token: TOKEN, body: { label: "Qual é o objetivo da campanha?" } });
      assert.equal(upd.status, 200);
      assert.equal(upd.json.label, "Qual é o objetivo da campanha?");

      // reordenar (inverte)
      const reorder = await api(`/api/admin/catalog2/questionnaires/${qId}/questions/order`, { method: "PUT", token: TOKEN, body: { order: [q2.json.id, q1.json.id] } });
      assert.equal(reorder.status, 200);
      const afterReorder = await api(`/api/admin/catalog2/questionnaires/${qId}`, { token: TOKEN });
      assert.equal(afterReorder.json.questions[0].id, q2.json.id);

      // remover pergunta
      const del = await api(`/api/admin/catalog2/questions/${q2.json.id}`, { method: "DELETE", token: TOKEN });
      assert.equal(del.status, 200);
      const afterDel = await api(`/api/admin/catalog2/questionnaires/${qId}`, { token: TOKEN });
      assert.equal(afterDel.json.questions.length, 1);

      // editar metadado do questionário
      const editQ = await api(`/api/admin/catalog2/questionnaires/${qId}`, { method: "PUT", token: TOKEN, body: { name: "[TESTE] Briefing renomeado" } });
      assert.equal(editQ.status, 200);
      assert.equal(editQ.json.name, "[TESTE] Briefing renomeado");
    });

    it("vincular questionário a uma tarefa é REFERÊNCIA, não cópia: editar o questionário afeta as DUAS tarefas que o vinculam", async () => {
      const q = await api("/api/admin/catalog2/questionnaires", { method: "POST", token: TOKEN, body: { name: "[TESTE] Compartilhado" } });
      const qId = q.json.id;
      await api(`/api/admin/catalog2/questionnaires/${qId}/questions`, { method: "POST", token: TOKEN, body: { key: "p1", label: "Pergunta original" } });

      const pA = await api("/api/admin/catalog2/products", { method: "POST", token: TOKEN, body: { internal_name: `[TESTE LOCAL] QA ${crypto.randomBytes(3).toString("hex")}` } });
      products.push(pA.json.id);
      const vA = pA.json.versions[0].id;
      const taskA = await api(`/api/admin/catalog2/versions/${vA}/tasks`, { method: "POST", token: TOKEN, body: { key: "ta", name: "Tarefa A" } });

      const pB = await api("/api/admin/catalog2/products", { method: "POST", token: TOKEN, body: { internal_name: `[TESTE LOCAL] QB ${crypto.randomBytes(3).toString("hex")}` } });
      products.push(pB.json.id);
      const vB = pB.json.versions[0].id;
      const taskB = await api(`/api/admin/catalog2/versions/${vB}/tasks`, { method: "POST", token: TOKEN, body: { key: "tb", name: "Tarefa B" } });

      const linkA = await api(`/api/admin/catalog2/tasks/${taskA.json.id}/questionnaire`, { method: "PUT", token: TOKEN, body: { questionnaire_id: qId } });
      assert.equal(linkA.status, 200);
      const linkB = await api(`/api/admin/catalog2/tasks/${taskB.json.id}/questionnaire`, { method: "PUT", token: TOKEN, body: { questionnaire_id: qId } });
      assert.equal(linkB.status, 200);

      // Vínculo confirmado: as duas tarefas apontam pro MESMO registro.
      const detailA = await api(`/api/admin/catalog2/products/${pA.json.id}`, { token: TOKEN });
      const detailB = await api(`/api/admin/catalog2/products/${pB.json.id}`, { token: TOKEN });
      const qOnA = detailA.json.versions[0].tasks.find((t: any) => t.id === taskA.json.id).questionnaire;
      const qOnB = detailB.json.versions[0].tasks.find((t: any) => t.id === taskB.json.id).questionnaire;
      assert.equal(qOnA.id, qId);
      assert.equal(qOnB.id, qId);
      assert.equal(qOnA.questions[0].label, "Pergunta original");
      assert.equal(qOnB.questions[0].label, "Pergunta original");

      // Item 3.1: exatamente PORQUE é vínculo (2 tarefas o usam agora), editar
      // a pergunta pela rota genérica direto no registro compartilhado é
      // bloqueado — a proteção do conteúdo compartilhado é o assunto do
      // Item 3.1, testada em detalhe (com cópia automática) no describe
      // "Edição e preservação dos questionários" logo abaixo.
      const questionId = (await api(`/api/admin/catalog2/questionnaires/${qId}`, { token: TOKEN })).json.questions[0].id;
      const directEdit = await api(`/api/admin/catalog2/questions/${questionId}`, { method: "PUT", token: TOKEN, body: { label: "Pergunta editada" } });
      assert.equal(directEdit.status, 409);
      assert.equal(directEdit.json.code, "questionnaire_shared_use_task_edit");

      // desvincular de A não afeta B
      await api(`/api/admin/catalog2/tasks/${taskA.json.id}/questionnaire`, { method: "PUT", token: TOKEN, body: { questionnaire_id: null } });
      const detailA2 = await api(`/api/admin/catalog2/products/${pA.json.id}`, { token: TOKEN });
      const detailB2 = await api(`/api/admin/catalog2/products/${pB.json.id}`, { token: TOKEN });
      assert.equal(detailA2.json.versions[0].tasks.find((t: any) => t.id === taskA.json.id).questionnaire, null);
      assert.ok(detailB2.json.versions[0].tasks.find((t: any) => t.id === taskB.json.id).questionnaire, "B continua vinculado");
    });

    it("vincular questionário numa versão PUBLICADA é bloqueado (versão imutável)", async () => {
      const q = await api("/api/admin/catalog2/questionnaires", { method: "POST", token: TOKEN, body: { name: "[TESTE] X" } });
      const p = await api("/api/admin/catalog2/products", {
        method: "POST", token: TOKEN,
        body: { internal_name: `[TESTE LOCAL] Pub questionário ${crypto.randomBytes(3).toString("hex")}`, pillar_id: (await prisma.catalog2Pillar.findFirstOrThrow()).id, category_id: (await prisma.catalog2Category.findFirstOrThrow()).id, four_f_ids: [(await prisma.catalog2FourF.findFirstOrThrow()).id] },
      });
      products.push(p.json.id);
      const v1 = p.json.versions[0].id;
      await api(`/api/admin/catalog2/versions/${v1}`, { method: "PUT", token: TOKEN, body: { full_description: "desc" } });
      const spec = await prisma.catalog2Specialty.findFirstOrThrow();
      await prisma.catalog2Specialty.update({ where: { id: spec.id }, data: { max_hourly_rate: 100 } });
      const task = await api(`/api/admin/catalog2/versions/${v1}/tasks`, { method: "POST", token: TOKEN, body: { key: "t", name: "T", specialty_id: spec.id, estimated_minutes: 60 } });
      await api(`/api/admin/catalog2/versions/${v1}/publish`, { method: "POST", token: TOKEN, body: { client_action_id: `pub-q-${crypto.randomBytes(4).toString("hex")}` } });

      const blocked = await api(`/api/admin/catalog2/tasks/${task.json.id}/questionnaire`, { method: "PUT", token: TOKEN, body: { questionnaire_id: q.json.id } });
      assert.equal(blocked.status, 409);
      assert.equal(blocked.json.code, "version_published_immutable");
    });

    it("especialidade nova criada durante a configuração da tarefa (POST /specialties) fica disponível e pode ser usada numa tarefa", async () => {
      const key = `copywriter_${crypto.randomBytes(3).toString("hex")}`;
      const created = await api("/api/admin/catalog2/specialties", { method: "POST", token: TOKEN, body: { key, name: "Copywriter de teste", max_hourly_rate: 80 } });
      assert.equal(created.status, 201);
      const list = await api("/api/admin/catalog2/specialties", { token: TOKEN });
      assert.ok(list.json.data.some((s: any) => s.id === created.json.id));

      const p = await api("/api/admin/catalog2/products", { method: "POST", token: TOKEN, body: { internal_name: `[TESTE LOCAL] Esp ${crypto.randomBytes(3).toString("hex")}` } });
      products.push(p.json.id);
      const v1 = p.json.versions[0].id;
      const task = await api(`/api/admin/catalog2/versions/${v1}/tasks`, { method: "POST", token: TOKEN, body: { key: "t", name: "T", specialty_id: created.json.id, estimated_minutes: 30 } });
      assert.equal(task.status, 201);
      const detail = await api(`/api/admin/catalog2/products/${p.json.id}`, { token: TOKEN });
      assert.equal(detail.json.versions[0].tasks[0].specialty.id, created.json.id);
    });

    it("selecionar tarefa existente (GET /tasks/search + POST .../tasks/import): COPIA a tarefa (com etapas) pra outra versão, nunca altera o produto de origem", async () => {
      const pSrc = await api("/api/admin/catalog2/products", { method: "POST", token: TOKEN, body: { internal_name: `[TESTE LOCAL] Origem ${crypto.randomBytes(3).toString("hex")}` } });
      products.push(pSrc.json.id);
      const vSrc = pSrc.json.versions[0].id;
      const spec = await prisma.catalog2Specialty.findFirstOrThrow();
      const srcTask = await api(`/api/admin/catalog2/versions/${vSrc}/tasks`, { method: "POST", token: TOKEN, body: { key: "revisao-seo", name: "Revisão de SEO", specialty_id: spec.id, estimated_minutes: 45 } });
      await api(`/api/admin/catalog2/tasks/${srcTask.json.id}/steps`, { method: "POST", token: TOKEN, body: { key: "s1", name: "Checar meta tags", estimated_minutes: 15 } });

      const search = await api(`/api/admin/catalog2/tasks/search?q=SEO`, { token: TOKEN });
      assert.equal(search.status, 200);
      const found = search.json.data.find((t: any) => t.id === srcTask.json.id);
      assert.ok(found, "tarefa de origem aparece na busca");
      assert.equal(found.step_count, 1);
      assert.equal(found.product_name, pSrc.json.internal_name);

      const pDest = await api("/api/admin/catalog2/products", { method: "POST", token: TOKEN, body: { internal_name: `[TESTE LOCAL] Destino ${crypto.randomBytes(3).toString("hex")}` } });
      products.push(pDest.json.id);
      const vDest = pDest.json.versions[0].id;
      const imp = await api(`/api/admin/catalog2/versions/${vDest}/tasks/import`, { method: "POST", token: TOKEN, body: { source_task_id: srcTask.json.id } });
      assert.equal(imp.status, 201, JSON.stringify(imp.json));

      const destDetail = await api(`/api/admin/catalog2/products/${pDest.json.id}`, { token: TOKEN });
      const importedTask = destDetail.json.versions[0].tasks.find((t: any) => t.id === imp.json.task_id);
      assert.ok(importedTask, "tarefa copiada aparece na versão de destino");
      assert.equal(importedTask.name, "Revisão de SEO");
      assert.equal(importedTask.steps.length, 1);
      assert.equal(importedTask.steps[0].name, "Checar meta tags");

      // editar a CÓPIA nunca deve alterar a ORIGEM.
      await api(`/api/admin/catalog2/tasks/${importedTask.id}`, { method: "PUT", token: TOKEN, body: { name: "Revisão de SEO (editada no destino)" } });
      const srcDetailAfter = await api(`/api/admin/catalog2/products/${pSrc.json.id}`, { token: TOKEN });
      const srcTaskAfter = srcDetailAfter.json.versions[0].tasks.find((t: any) => t.id === srcTask.json.id);
      assert.equal(srcTaskAfter.name, "Revisão de SEO", "produto de origem intacto");
      assert.equal(srcTaskAfter.steps.length, 1, "etapas de origem intactas");
    });

    it("importar tarefa numa versão PUBLICADA (destino) é bloqueado (versão imutável)", async () => {
      const pSrc = await api("/api/admin/catalog2/products", { method: "POST", token: TOKEN, body: { internal_name: `[TESTE LOCAL] Origem2 ${crypto.randomBytes(3).toString("hex")}` } });
      products.push(pSrc.json.id);
      const srcTask = await api(`/api/admin/catalog2/versions/${pSrc.json.versions[0].id}/tasks`, { method: "POST", token: TOKEN, body: { key: "t", name: "T" } });

      const pDest = await api("/api/admin/catalog2/products", {
        method: "POST", token: TOKEN,
        body: { internal_name: `[TESTE LOCAL] Destino pub ${crypto.randomBytes(3).toString("hex")}`, pillar_id: (await prisma.catalog2Pillar.findFirstOrThrow()).id, category_id: (await prisma.catalog2Category.findFirstOrThrow()).id, four_f_ids: [(await prisma.catalog2FourF.findFirstOrThrow()).id] },
      });
      products.push(pDest.json.id);
      const vDest = pDest.json.versions[0].id;
      await api(`/api/admin/catalog2/versions/${vDest}`, { method: "PUT", token: TOKEN, body: { full_description: "desc" } });
      const spec = await prisma.catalog2Specialty.findFirstOrThrow();
      await prisma.catalog2Specialty.update({ where: { id: spec.id }, data: { max_hourly_rate: 100 } });
      await api(`/api/admin/catalog2/versions/${vDest}/tasks`, { method: "POST", token: TOKEN, body: { key: "t2", name: "T2", specialty_id: spec.id, estimated_minutes: 60 } });
      await api(`/api/admin/catalog2/versions/${vDest}/publish`, { method: "POST", token: TOKEN, body: { client_action_id: `pub-imp-${crypto.randomBytes(4).toString("hex")}` } });

      const blocked = await api(`/api/admin/catalog2/versions/${vDest}/tasks/import`, { method: "POST", token: TOKEN, body: { source_task_id: srcTask.json.id } });
      assert.equal(blocked.status, 409);
      assert.equal(blocked.json.code, "version_published_immutable");
    });

    it("admin comum (não Admin Master) não acessa nenhum dos endpoints novos (404)", async () => {
      const commonProfile = await prisma.adminProfile.create({ data: { name: `C3 comum ${crypto.randomBytes(4).toString("hex")}`, is_master: false, is_active: true } });
      adminProfiles.push(commonProfile.id);
      const commonId = `c3common-${crypto.randomBytes(5).toString("hex")}`;
      const commonUser = await prisma.user.create({ data: { id: commonId, email: `${commonId}@example.test`, password_hash: "x", name: "Comum", role: "admin", account_type: "admin", is_active: true, status: "ativo", admin_profile_id: commonProfile.id } });
      users.push(commonUser.id);
      const commonToken = tokenFor(commonUser);

      assert.equal((await api("/api/admin/catalog2/questionnaires", { token: commonToken })).status, 404);
      assert.equal((await api("/api/admin/catalog2/tasks/search?q=ab", { token: commonToken })).status, 404);
      assert.equal((await api("/api/admin/catalog2/specialties", { method: "POST", token: commonToken, body: { key: "x", name: "X" } })).status, 404);
    });
  });

  // Item 3.1 (reunião 2026-09-14, "Edição e preservação dos questionários") —
  // regra final: vínculo por referência enquanto só 1 tarefa usa; a partir
  // da 2ª tarefa (outro produto OU o clone de uma nova versão a partir da
  // publicada), o conteúdo é efetivamente compartilhado e só pode ser
  // editado via PUT /tasks/:id/questionnaire/content, que cria uma cópia
  // própria automaticamente sem tocar o original.
  describe("Edição e preservação dos questionários (Item 3.1)", () => {
    async function mkTaskWithQuestionnaire(internalName: string) {
      const p = await api("/api/admin/catalog2/products", { method: "POST", token: TOKEN, body: { internal_name: internalName } });
      products.push(p.json.id);
      const v = p.json.versions[0].id;
      const task = await api(`/api/admin/catalog2/versions/${v}/tasks`, { method: "POST", token: TOKEN, body: { key: "t", name: "T" } });
      return { productId: p.json.id, versionId: v, taskId: task.json.id };
    }

    it("dois produtos usam o mesmo questionário: editar pelo formulário de UM cria cópia própria e preserva o conteúdo do OUTRO", async () => {
      const q = await api("/api/admin/catalog2/questionnaires", { method: "POST", token: TOKEN, body: { name: "[TESTE] Compartilhado 3.1" } });
      const qId = q.json.id;
      await api(`/api/admin/catalog2/questionnaires/${qId}/questions`, { method: "POST", token: TOKEN, body: { key: "p1", label: "Pergunta original", is_required: true } });

      const A = await mkTaskWithQuestionnaire(`[TESTE LOCAL] 3.1 A ${crypto.randomBytes(3).toString("hex")}`);
      const B = await mkTaskWithQuestionnaire(`[TESTE LOCAL] 3.1 B ${crypto.randomBytes(3).toString("hex")}`);
      await api(`/api/admin/catalog2/tasks/${A.taskId}/questionnaire`, { method: "PUT", token: TOKEN, body: { questionnaire_id: qId } });
      await api(`/api/admin/catalog2/tasks/${B.taskId}/questionnaire`, { method: "PUT", token: TOKEN, body: { questionnaire_id: qId } });

      // Editar pelo formulário da tarefa A.
      const edit = await api(`/api/admin/catalog2/tasks/${A.taskId}/questionnaire/content`, {
        method: "PUT", token: TOKEN,
        body: { name: "[TESTE] Editado em A", description: null, questions: [{ key: "p1", label: "Pergunta editada em A", is_required: true }] },
      });
      assert.equal(edit.status, 200, JSON.stringify(edit.json));
      assert.equal(edit.json.forked, true, "era usado por 2 tarefas — precisa copiar, não pode editar o original");
      assert.notEqual(edit.json.questionnaire.id, qId, "A passou a apontar pra uma cópia nova");

      const detailA = await api(`/api/admin/catalog2/products/${A.productId}`, { token: TOKEN });
      const detailB = await api(`/api/admin/catalog2/products/${B.productId}`, { token: TOKEN });
      const qOnA = detailA.json.versions[0].tasks.find((t: any) => t.id === A.taskId).questionnaire;
      const qOnB = detailB.json.versions[0].tasks.find((t: any) => t.id === B.taskId).questionnaire;
      assert.equal(qOnA.name, "[TESTE] Editado em A");
      assert.equal(qOnA.questions[0].label, "Pergunta editada em A");
      assert.equal(qOnB.id, qId, "B continua apontando pro original");
      assert.equal(qOnB.name, "[TESTE] Compartilhado 3.1", "conteúdo de B intacto");
      assert.equal(qOnB.questions[0].label, "Pergunta original", "pergunta de B intacta");
    });

    it("versão publicada mantém as perguntas originais após editar o rascunho clonado (fork acontece no primeiro edit do rascunho)", async () => {
      const q = await api("/api/admin/catalog2/questionnaires", { method: "POST", token: TOKEN, body: { name: "[TESTE] Publicado 3.1" } });
      const qId = q.json.id;
      await api(`/api/admin/catalog2/questionnaires/${qId}/questions`, { method: "POST", token: TOKEN, body: { key: "p1", label: "Pergunta publicada", is_required: true } });

      const p = await api("/api/admin/catalog2/products", {
        method: "POST", token: TOKEN,
        body: { internal_name: `[TESTE LOCAL] 3.1 Pub ${crypto.randomBytes(3).toString("hex")}`, pillar_id: (await prisma.catalog2Pillar.findFirstOrThrow()).id, category_id: (await prisma.catalog2Category.findFirstOrThrow()).id, four_f_ids: [(await prisma.catalog2FourF.findFirstOrThrow()).id] },
      });
      products.push(p.json.id);
      const v1 = p.json.versions[0].id;
      await api(`/api/admin/catalog2/versions/${v1}`, { method: "PUT", token: TOKEN, body: { full_description: "desc" } });
      const spec = await prisma.catalog2Specialty.findFirstOrThrow();
      await prisma.catalog2Specialty.update({ where: { id: spec.id }, data: { max_hourly_rate: 100 } });
      const task1 = await api(`/api/admin/catalog2/versions/${v1}/tasks`, { method: "POST", token: TOKEN, body: { key: "t", name: "T", specialty_id: spec.id, estimated_minutes: 60 } });
      await api(`/api/admin/catalog2/tasks/${task1.json.id}/questionnaire`, { method: "PUT", token: TOKEN, body: { questionnaire_id: qId } });
      await api(`/api/admin/catalog2/versions/${v1}/publish`, { method: "POST", token: TOKEN, body: { client_action_id: `pub-31-${crypto.randomBytes(4).toString("hex")}` } });

      // Nova versão rascunho — clona a estrutura, incluindo o vínculo do questionário (por referência).
      const nv = await api(`/api/admin/catalog2/products/${p.json.id}/versions`, { method: "POST", token: TOKEN });
      assert.equal(nv.status, 201);
      const detailAfterClone = await api(`/api/admin/catalog2/products/${p.json.id}`, { token: TOKEN });
      const draftVersion = detailAfterClone.json.versions.find((v: any) => v.state === "rascunho");
      const draftTask = draftVersion.tasks[0];
      assert.equal(draftTask.questionnaire.id, qId, "rascunho clonado começa apontando pro MESMO questionário (referência)");

      // Editar pelo rascunho.
      const edit = await api(`/api/admin/catalog2/tasks/${draftTask.id}/questionnaire/content`, {
        method: "PUT", token: TOKEN,
        body: { name: "[TESTE] Editado no rascunho", description: null, questions: [{ key: "p1", label: "Pergunta editada no rascunho", is_required: true }] },
      });
      assert.equal(edit.status, 200, JSON.stringify(edit.json));
      assert.equal(edit.json.forked, true, "publicada + rascunho == 2 referências no momento do edit");

      const detailAfterEdit = await api(`/api/admin/catalog2/products/${p.json.id}`, { token: TOKEN });
      const publishedTaskAfter = detailAfterEdit.json.versions.find((v: any) => v.id === v1).tasks[0];
      const draftTaskAfter = detailAfterEdit.json.versions.find((v: any) => v.state === "rascunho").tasks[0];
      assert.equal(publishedTaskAfter.questionnaire.id, qId, "versão publicada continua no questionário original");
      assert.equal(publishedTaskAfter.questionnaire.questions[0].label, "Pergunta publicada", "conteúdo original intacto");
      assert.equal(draftTaskAfter.questionnaire.name, "[TESTE] Editado no rascunho");
      assert.notEqual(draftTaskAfter.questionnaire.id, qId);
    });

    it("editar/excluir diretamente um questionário COMPARTILHADO (rotas genéricas) é bloqueado — só o formulário da tarefa pode, porque só ele sabe copiar", async () => {
      const q = await api("/api/admin/catalog2/questionnaires", { method: "POST", token: TOKEN, body: { name: "[TESTE] Bloqueio direto" } });
      const qId = q.json.id;
      const question = await api(`/api/admin/catalog2/questionnaires/${qId}/questions`, { method: "POST", token: TOKEN, body: { key: "p1", label: "P1" } });

      const A = await mkTaskWithQuestionnaire(`[TESTE LOCAL] 3.1 Direct A ${crypto.randomBytes(3).toString("hex")}`);
      const B = await mkTaskWithQuestionnaire(`[TESTE LOCAL] 3.1 Direct B ${crypto.randomBytes(3).toString("hex")}`);
      await api(`/api/admin/catalog2/tasks/${A.taskId}/questionnaire`, { method: "PUT", token: TOKEN, body: { questionnaire_id: qId } });
      await api(`/api/admin/catalog2/tasks/${B.taskId}/questionnaire`, { method: "PUT", token: TOKEN, body: { questionnaire_id: qId } });

      const editQuestionnaire = await api(`/api/admin/catalog2/questionnaires/${qId}`, { method: "PUT", token: TOKEN, body: { name: "Tentativa direta" } });
      assert.equal(editQuestionnaire.status, 409);
      assert.equal(editQuestionnaire.json.code, "questionnaire_shared_use_task_edit");

      const addQuestion = await api(`/api/admin/catalog2/questionnaires/${qId}/questions`, { method: "POST", token: TOKEN, body: { key: "p2", label: "P2" } });
      assert.equal(addQuestion.status, 409);

      const editQuestion = await api(`/api/admin/catalog2/questions/${question.json.id}`, { method: "PUT", token: TOKEN, body: { label: "Tentativa direta" } });
      assert.equal(editQuestion.status, 409);

      const deleteQuestion = await api(`/api/admin/catalog2/questions/${question.json.id}`, { method: "DELETE", token: TOKEN });
      assert.equal(deleteQuestion.status, 409, "excluir pergunta ainda usada por outra tarefa é bloqueado — nunca perde conteúdo referenciado");

      const reorder = await api(`/api/admin/catalog2/questionnaires/${qId}/questions/order`, { method: "PUT", token: TOKEN, body: { order: [question.json.id] } });
      assert.equal(reorder.status, 409);

      // conteúdo permanece intocado após todas as tentativas bloqueadas.
      const stillIntact = await api(`/api/admin/catalog2/questionnaires/${qId}`, { token: TOKEN });
      assert.equal(stillIntact.json.name, "[TESTE] Bloqueio direto");
      assert.equal(stillIntact.json.questions.length, 1);
      assert.equal(stillIntact.json.questions[0].label, "P1");
    });

    it("questionário usado por só 1 tarefa: edição direta continua permitida (não força cópia à toa)", async () => {
      const q = await api("/api/admin/catalog2/questionnaires", { method: "POST", token: TOKEN, body: { name: "[TESTE] Não compartilhado" } });
      const qId = q.json.id;
      const A = await mkTaskWithQuestionnaire(`[TESTE LOCAL] 3.1 Solo ${crypto.randomBytes(3).toString("hex")}`);
      await api(`/api/admin/catalog2/tasks/${A.taskId}/questionnaire`, { method: "PUT", token: TOKEN, body: { questionnaire_id: qId } });

      const editDirect = await api(`/api/admin/catalog2/questionnaires/${qId}`, { method: "PUT", token: TOKEN, body: { name: "Editado direto, sem problema" } });
      assert.equal(editDirect.status, 200);
      assert.equal(editDirect.json.name, "Editado direto, sem problema");
    });

    it("editar pelo formulário da tarefa com erro de validação (nome vazio) não altera o conteúdo existente", async () => {
      const q = await api("/api/admin/catalog2/questionnaires", { method: "POST", token: TOKEN, body: { name: "[TESTE] Erro validação" } });
      const qId = q.json.id;
      await api(`/api/admin/catalog2/questionnaires/${qId}/questions`, { method: "POST", token: TOKEN, body: { key: "p1", label: "Original" } });
      const A = await mkTaskWithQuestionnaire(`[TESTE LOCAL] 3.1 Err ${crypto.randomBytes(3).toString("hex")}`);
      await api(`/api/admin/catalog2/tasks/${A.taskId}/questionnaire`, { method: "PUT", token: TOKEN, body: { questionnaire_id: qId } });

      const bad = await api(`/api/admin/catalog2/tasks/${A.taskId}/questionnaire/content`, { method: "PUT", token: TOKEN, body: { name: "", description: null, questions: [{ key: "p1", label: "X" }] } });
      assert.equal(bad.status, 400);

      const stillIntact = await api(`/api/admin/catalog2/questionnaires/${qId}`, { token: TOKEN });
      assert.equal(stillIntact.json.name, "[TESTE] Erro validação");
      assert.equal(stillIntact.json.questions[0].label, "Original");
    });

    it("editar questionário numa versão PUBLICADA (sem rascunho novo) continua bloqueado pela imutabilidade da versão", async () => {
      const q = await api("/api/admin/catalog2/questionnaires", { method: "POST", token: TOKEN, body: { name: "[TESTE] Pub imutável" } });
      const qId = q.json.id;
      const p = await api("/api/admin/catalog2/products", {
        method: "POST", token: TOKEN,
        body: { internal_name: `[TESTE LOCAL] 3.1 Imut ${crypto.randomBytes(3).toString("hex")}`, pillar_id: (await prisma.catalog2Pillar.findFirstOrThrow()).id, category_id: (await prisma.catalog2Category.findFirstOrThrow()).id, four_f_ids: [(await prisma.catalog2FourF.findFirstOrThrow()).id] },
      });
      products.push(p.json.id);
      const v1 = p.json.versions[0].id;
      await api(`/api/admin/catalog2/versions/${v1}`, { method: "PUT", token: TOKEN, body: { full_description: "desc" } });
      const spec = await prisma.catalog2Specialty.findFirstOrThrow();
      await prisma.catalog2Specialty.update({ where: { id: spec.id }, data: { max_hourly_rate: 100 } });
      const task = await api(`/api/admin/catalog2/versions/${v1}/tasks`, { method: "POST", token: TOKEN, body: { key: "t", name: "T", specialty_id: spec.id, estimated_minutes: 60 } });
      await api(`/api/admin/catalog2/tasks/${task.json.id}/questionnaire`, { method: "PUT", token: TOKEN, body: { questionnaire_id: qId } });
      await api(`/api/admin/catalog2/versions/${v1}/publish`, { method: "POST", token: TOKEN, body: { client_action_id: `pub-31b-${crypto.randomBytes(4).toString("hex")}` } });

      const blocked = await api(`/api/admin/catalog2/tasks/${task.json.id}/questionnaire/content`, { method: "PUT", token: TOKEN, body: { name: "X", description: null, questions: [] } });
      assert.equal(blocked.status, 409);
      assert.equal(blocked.json.code, "version_published_immutable");
    });
  });
});
