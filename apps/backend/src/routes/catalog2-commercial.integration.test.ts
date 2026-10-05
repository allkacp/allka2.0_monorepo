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
import { concluirEtapa } from "../lib/stage-engine";
import { reevaluateProjectDependencies } from "../lib/project-dependencies";
import { runSubscriptionsTick } from "../lib/catalog2-subscriptions";
import { releaseCatalog2DeliveryCycle } from "../lib/generate-tasks-catalog2";
import { iniciarEtapasDaTarefa } from "../lib/stage-engine";
import { startTaskRotation } from "../lib/task-rotation-engine";
import { reopenAccessValidationOnExecutorChange } from "../lib/client-assets";
import { setTaskAIAdapter, resetTaskAIAdapter } from "../lib/task-ai";
import { computePricing, defaultSelection } from "../lib/catalog2-pricing";
import { priceSummary } from "../lib/catalog2-price-summary";

// Correção de 2026-09-30: modalidade de compra x entrega recorrente x implantação x período x preço (fonte única).

let baseUrl = "";
let server: import("node:http").Server;
const users: string[] = [];
const adminProfiles: string[] = [];
const companies: string[] = [];
const catProducts: string[] = [];
const projects: string[] = [];
const extra: (() => Promise<void>)[] = [];
const DAY = 24 * 3600 * 1000;
const uid = () => crypto.randomBytes(4).toString("hex");
const SEL = { variation_option_keys: [], addon_keys: [], quantity: 1, answers: {} };

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
async function mkUser(role: string, account_type: string, ex: Record<string, unknown> = {}) {
  const id = `e2e-${uid()}${uid()}`;
  const u = await prisma.user.create({ data: { id, email: `${id}@example.test`, password_hash: "x", name: `U ${id}`, role, account_type, is_active: true, status: "ativo", ...ex } });
  users.push(u.id);
  return u;
}
async function mkCompanyUser(tag: string) {
  const c = await prisma.company.create({ data: { name: `[TESTE] E2E ${tag} ${uid()}`, status: "ativo" } });
  companies.push(c.id);
  const user = await mkUser("company_user", "empresas", { company_id: c.id });
  return { user, token: tokenFor(user), companyId: c.id };
}
async function mkAdmin() {
  const p = await prisma.adminProfile.create({ data: { name: `E2E ${uid()}`, is_master: true, is_active: true } });
  adminProfiles.push(p.id);
  const user = await mkUser("admin", "admin", { admin_profile_id: p.id });
  return { user, token: tokenFor(user) };
}
async function mkNomad(skillText: string) {
  const user = await mkUser("nomad", "nomades");
  const nomade = await prisma.nomade.create({ data: { user_id: user.id, name: user.name, email: `${user.id}-n@example.test`, status: "ativo" } });
  const h = await prisma.nomadeHabilidade.create({ data: { nomade_id: nomade.id, area: "Qualquer", categoria_produto: skillText, disponibilidade: "disponivel", ativo: true, nota_media: 4 } });
  extra.push(async () => {
    await prisma.taskAssignmentHistory.deleteMany({ where: { nomade_id: nomade.id } });
    await prisma.nomadeHabilidade.deleteMany({ where: { id: h.id } });
    await prisma.nomade.delete({ where: { id: nomade.id } }).catch(() => {});
  });
  return { user, nomade };
}
async function setPricingSettings() {
  const d = { tax_percent: 6, commission_percent: 10, operational_fee_percent: 5, profit_margin_percent: 30, human_review_percent: 10, component_order_json: JSON.stringify(["tax", "commission", "operational", "margin"]) };
  await prisma.catalog2PricingSettings.upsert({ where: { id: "default" }, create: { id: "default", ...d }, update: d });
}

interface TDef { key: string; cycle?: string; continuity?: string; steps?: number; mode?: string; review?: boolean; ai?: { profile_id: string; mode: string } }
async function mkProduct(name: string, o: { tasks: TDef[]; recurring?: boolean; flags?: Record<string, unknown>; variations?: boolean; addons?: boolean; deadline?: number }) {
  const spec = await prisma.catalog2Specialty.findFirstOrThrow({ where: { key: "designer" } });
  await prisma.catalog2Specialty.update({ where: { id: spec.id }, data: { max_hourly_rate: 100 } });
  await setPricingSettings();
  const pillar = await prisma.catalog2Pillar.findFirstOrThrow({ where: { key: "redes_conteudo" } });
  const category = await prisma.catalog2Category.findFirstOrThrow({ where: { key: "design" } });
  const fourF = await prisma.catalog2FourF.findFirstOrThrow({ where: { key: "fluxo" } });
  const slug = `e2e-${uid()}`;
  const product = await prisma.catalog2Product.create({
    data: { slug, internal_name: `[TESTE LOCAL] ${name} ${slug}`, pillar_id: pillar.id, category_id: category.id, status: "em_preparacao", delivery_recurrence: o.recurring ? "mensal" : null, four_f: { create: [{ four_f_id: fourF.id }] } },
  });
  catProducts.push(product.id);
  const v = await prisma.catalog2ProductVersion.create({
    data: {
      product_id: product.id, version_number: 1, state: "rascunho", title: name, summary: "resumo", full_description: "descrição do serviço demo",
      base_commercial_deadline_days: o.deadline ?? 5, implementation_blocks_operation: false, accepts_recurring: !!o.recurring, ...(o.flags ?? {}),
      tasks: {
        create: o.tasks.map((t, i) => ({
          key: t.key, name: `Tarefa ${t.key}`, execution_mode: t.mode ?? "humano", specialty_id: spec.id, estimated_minutes: 60, sort_order: i + 1,
          cycle_type: t.cycle ?? "recorrente", executor_continuity: t.continuity ?? "not_allowed", requires_review: !!t.review, requires_client_approval: true,
          ...(t.ai ? { ai: { create: { profile_id: t.ai.profile_id, ai_mode: t.ai.mode, instructions: "Escreva o texto.", human_review_required: true } } } : {}),
          steps: { create: Array.from({ length: t.steps ?? 1 }, (_, k) => ({ key: `s${k + 1}`, name: `Etapa ${t.key}-${k + 1}`, sort_order: k + 1, specialty_id: spec.id, estimated_minutes: 60 })) },
        })),
      },
      ...(o.variations
        ? { variations: { create: [{ key: "porte", name: "Porte", is_required: true, selection_type: "single", options: { create: [
            { key: "basico", label: "Básico", is_default: true },
            { key: "plus", label: "Plus", effects: { create: [{ effect_type: "add_fixed_amount", effect_value: "100" }, { effect_type: "add_deadline_days", effect_value: "3" }] } },
          ] } }] } }
        : {}),
      ...(o.addons ? { addons: { create: [{ key: "urgente", name: "Entrega urgente", base_cost: 50, effects: { create: [{ effect_type: "add_deadline_days", effect_value: "2" }] } }] } } : {}),
    },
  });
  // assinatura mensal exige o período Mensal ativo (regra de consistência comercial)
  if (o.recurring) await prisma.catalog2ProductPeriod.upsert({ where: { product_id_period: { product_id: product.id, period: "mensal" } }, create: { product_id: product.id, period: "mensal", months: 1, discount_percent: 0, is_active: true }, update: {} });
  await publishVersion(v.id, "system", { activate: true, changeSummary: "publicação de teste" });
  return { product: await prisma.catalog2Product.findUniqueOrThrow({ where: { id: product.id } }), versionId: v.id };
}

async function configurePeriod(token: string, productId: string, period: string, discount = 0) {
  const r = await api(`/api/admin/catalog2/products/${productId}/periods/${period}`, { method: "PUT", token, body: { discount_percent: discount, is_active: true } });
  assert.equal(r.status, 200, JSON.stringify(r.json));
}
async function quote(token: string, productId: string, o: { period?: string; selection?: Record<string, unknown> } = {}) {
  const r = await api("/api/catalog2/quotes", { method: "POST", token, body: { product: productId, selection: o.selection ?? SEL, ...(o.period ? { period: o.period } : {}) } });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  return r.json;
}
async function checkoutAndPay(token: string, quoteIds: string[]) {
  const checkout = await api("/api/catalog2/checkout", { method: "POST", token, body: { quote_ids: quoteIds, checkout_client_action_id: crypto.randomUUID() } });
  assert.equal(checkout.status, 201, JSON.stringify(checkout.json));
  const projectId = checkout.json.project.id as string;
  projects.push(projectId);
  const pay = await api("/api/payments/fake-checkout", { method: "POST", token, body: { project_id: projectId } });
  assert.equal(pay.status, 201, JSON.stringify(pay.json));
  return { projectId, pps: checkout.json.project_products as { id: string; catalog2_product_id: string }[] };
}
const tasksOf = (projectId: string, occurrence?: number) =>
  prisma.projectTask.findMany({ where: { project_id: projectId, ...(occurrence != null ? { occurrence_index: occurrence } : {}) }, include: { catalog2_task: { select: { key: true } }, stages: { orderBy: { ordem: "asc" } } }, orderBy: { created_at: "asc" } });
const byKey = (rows: Awaited<ReturnType<typeof tasksOf>>) => Object.fromEntries(rows.map((r) => [r.catalog2_task?.key ?? r.title, r]));

/** O líder executa: a etapa aberta vira "do líder" e é concluída pelo motor (sem depender da fila de nômades). */
async function leaderExecutes(taskId: string, leaderId: string) {
  const task = await prisma.projectTask.update({ where: { id: taskId }, data: { lider_responsavel_id: leaderId, status: "EM_EXECUCAO" }, include: { stages: { orderBy: { ordem: "asc" } } } });
  let last;
  for (const st of task.stages.filter((s) => s.status !== "CONCLUIDA")) {
    await prisma.projectTaskStage.update({ where: { id: st.id }, data: { status: "EM_ANDAMENTO", executor_type: "leader", lider_id: leaderId } });
    last = await concluirEtapa(prisma, st.id, { userId: leaderId });
  }
  return last;
}

let CO_A: Awaited<ReturnType<typeof mkCompanyUser>>;
let ADMIN: Awaited<ReturnType<typeof mkAdmin>>;
let LEADER: Awaited<ReturnType<typeof mkUser>>;

describe("Consistência comercial — modalidade, recorrência, prévia e preço", () => {
  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    await seedCatalog2FourFForTests(prisma);
    await seedCatalog2Classifications(prisma);
    CO_A = await mkCompanyUser("A");
    ADMIN = await mkAdmin();
    LEADER = await mkUser("lider", "lider");
    server = app.listen(0);
    await new Promise<void>((r) => server.once("listening", () => r()));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  beforeEach(async () => { await setPricingSettings(); });
  after(async () => {
    resetTaskAIAdapter();
    await new Promise<void>((res, rej) => server.close((e) => (e ? rej(e) : res())));
    for (const id of projects.splice(0)) {
      const taskIds = (await prisma.projectTask.findMany({ where: { project_id: id }, select: { id: true } })).map((t) => t.id);
      await prisma.systemAlert.deleteMany({ where: { entity_id: { in: taskIds } } }).catch(() => {});
      await prisma.catalog2SubscriptionEvent.deleteMany({ where: { subscription: { project_id: id } } }).catch(() => {});
      await prisma.catalog2Subscription.deleteMany({ where: { project_id: id } }).catch(() => {});
      await prisma.invoice.deleteMany({ where: { project_id: id } }).catch(() => {});
      await prisma.projectTaskAIRun.deleteMany({ where: { project_task_id: { in: taskIds } } }).catch(() => {});
      await prisma.projectTaskReview.deleteMany({ where: { project_task_id: { in: taskIds } } }).catch(() => {});
      await prisma.projectDecisionLog.deleteMany({ where: { project_id: id } }).catch(() => {});
      await prisma.clientAssetLink.deleteMany({ where: { project_id: id } }).catch(() => {});
      await prisma.projectDependencyRule.deleteMany({ where: { project_id: id } }).catch(() => {});
      await prisma.taskDependency.deleteMany({ where: { project_id: id } }).catch(() => {});
      await prisma.catalog2ProjectDeliveryCycle.deleteMany({ where: { project_product: { project_id: id } } }).catch(() => {});
      await prisma.projectTaskStage.deleteMany({ where: { project_task: { project_id: id } } }).catch(() => {});
      await prisma.projectTask.deleteMany({ where: { project_id: id } }).catch(() => {});
      await prisma.paymentItem.deleteMany({ where: { payment: { project_id: id } } }).catch(() => {});
      await prisma.payment.deleteMany({ where: { project_id: id } }).catch(() => {});
      await prisma.projectProduct.deleteMany({ where: { project_id: id } }).catch(() => {});
      await prisma.project.deleteMany({ where: { id } }).catch(() => {});
    }
    for (const id of catProducts.splice(0)) {
      await prisma.catalog2DependencyRule.deleteMany({ where: { OR: [{ dependent_product_id: id }, { target_product_id: id }] } }).catch(() => {});
      await prisma.catalog2PackageItem.deleteMany({ where: { catalog2_product_id: id } }).catch(() => {});
      await prisma.catalog2ProductPeriod.deleteMany({ where: { product_id: id } }).catch(() => {});
      await prisma.catalog2CartItem.deleteMany({ where: { product_id: id } }).catch(() => {});
      await prisma.catalog2Quote.deleteMany({ where: { product_id: id } }).catch(() => {});
      const vids = (await prisma.catalog2ProductVersion.findMany({ where: { product_id: id }, select: { id: true } })).map((x) => x.id);
      await prisma.catalog2Product.update({ where: { id }, data: { published_version_id: null } }).catch(() => {});
      await prisma.catalog2VersionEvent.deleteMany({ where: { version_id: { in: vids } } }).catch(() => {});
      await prisma.catalog2Task.deleteMany({ where: { version_id: { in: vids } } }).catch(() => {});
      await prisma.catalog2ProductVersion.deleteMany({ where: { product_id: id } }).catch(() => {});
      await prisma.catalog2ProductFourF.deleteMany({ where: { product_id: id } }).catch(() => {});
      await prisma.catalog2Product.delete({ where: { id } }).catch(() => {});
    }
    for (const fn of extra.splice(0).reverse()) await fn().catch(() => {});
    await prisma.catalog2Package.deleteMany({ where: { name: { startsWith: "[TESTE E2E]" } } }).catch(() => {});
    await prisma.company.deleteMany({ where: { id: { in: companies } } }).catch(() => {});
    await prisma.systemAlert.deleteMany({ where: { user_id: { in: users } } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: { in: users } } }).catch(() => {});
    await prisma.adminProfile.deleteMany({ where: { id: { in: adminProfiles } } }).catch(() => {});
  });

  const periodsOn = (productId: string) => prisma.catalog2ProductPeriod.upsert({ where: { product_id_period: { product_id: productId, period: "mensal" } }, create: { product_id: productId, period: "mensal", months: 1, discount_percent: 0, is_active: true }, update: { is_active: true } });
  const clientView = async (productId: string) => (await api(`/api/catalog2/products/${productId}`, { token: CO_A.token })).json;
  const postQuote = (productId: string, period?: string) => api("/api/catalog2/quotes", { method: "POST", token: CO_A.token, body: { product: productId, selection: SEL, ...(period ? { period } : {}) } });
  const adminVersion = async (productId: string, versionId: string) => ((await api(`/api/admin/catalog2/products/${productId}`, { token: ADMIN.token })).json.versions as any[]).find((v) => v.id === versionId);

  it("1. só avulso: compra um único ciclo; assinatura é recusada; a ficha mostra 'Avulso disponível'", async () => {
    const { product } = await mkProduct("Só avulso", { tasks: [{ key: "t" }], flags: { accepts_one_time: true } });
    assert.equal((await clientView(product.id)).sale_label, "Avulso disponível");
    assert.equal((await clientView(product.id)).available_periods.length, 0);
    const bad = await postQuote(product.id, "mensal");
    assert.equal(bad.status, 409);
    assert.equal(bad.json.code, "sale_mode_not_accepted");
    const q = await postQuote(product.id);
    assert.equal(q.status, 201);
    const { pps } = await checkoutAndPay(CO_A.token, [q.json.id]);
    assert.equal(await prisma.catalog2Subscription.count({ where: { project_product_id: pps[0].id } }), 0);
  });

  it("2. só assinatura mensal: avulso é recusado; a ficha mostra 'Assinatura mensal recorrente'; compra gera assinatura", async () => {
    const { product } = await mkProduct("Só assinatura", { tasks: [{ key: "t" }], recurring: true, flags: { accepts_one_time: false } });
    assert.equal((await clientView(product.id)).sale_label, "Assinatura mensal recorrente");
    const bad = await postQuote(product.id);
    assert.equal(bad.status, 409);
    assert.equal(bad.json.code, "sale_mode_not_accepted");
    const q = await postQuote(product.id, "mensal");
    assert.equal(q.status, 201, JSON.stringify(q.json));
    const { pps } = await checkoutAndPay(CO_A.token, [q.json.id]);
    assert.equal((await prisma.catalog2Subscription.findUniqueOrThrow({ where: { project_product_id: pps[0].id } })).status, "ativa");
  });

  it("3. avulso E assinatura ao mesmo tempo: a mesma ficha diz 'avulso ou assinatura mensal'; avulso = 1 ciclo sem renovação, assinatura renova", async () => {
    const { product } = await mkProduct("Os dois", { tasks: [{ key: "t" }], recurring: true, flags: { accepts_one_time: true } });
    const view = await clientView(product.id);
    assert.equal(view.sale_label, "Disponível avulso ou em assinatura mensal");
    assert.deepEqual(view.available_periods.map((p: any) => p.period), ["mensal"]);
    const avulso = await postQuote(product.id);
    const mensal = await postQuote(product.id, "mensal");
    assert.equal(avulso.status, 201);
    assert.equal(mensal.status, 201);
    assert.equal(avulso.json.commercial_price, mensal.json.commercial_price, "mensal sem desconto custa o mesmo que 1 ciclo avulso");
    const a = await checkoutAndPay(CO_A.token, [avulso.json.id]);
    assert.equal(await prisma.catalog2Subscription.count({ where: { project_product_id: a.pps[0].id } }), 0, "avulso: sem renovação");
    assert.equal(await prisma.catalog2ProjectDeliveryCycle.count({ where: { project_product_id: a.pps[0].id } }), 0);
    assert.equal((await tasksOf(a.projectId)).length, 1);
    assert.equal((await tasksOf(a.projectId))[0].cycle_kind, "avulso");
    const m = await checkoutAndPay(CO_A.token, [mensal.json.id]);
    const sub = await prisma.catalog2Subscription.findUniqueOrThrow({ where: { project_product_id: m.pps[0].id } });
    assert.equal((await tasksOf(m.projectId))[0].cycle_kind, "recorrencia_mensal");
    await prisma.catalog2Subscription.update({ where: { id: sub.id }, data: { next_invoice_at: new Date(Date.now() - 1000) } });
    await runSubscriptionsTick();
    assert.equal((await api(`/api/catalog2/subscriptions/${sub.id}/pay`, { method: "POST", token: CO_A.token, body: {} })).json.paid, true);
    assert.equal((await tasksOf(m.projectId, 1)).length, 1, "assinatura: novo lote no mês seguinte");
  });

  it("4. implementação inicial + recorrência: a implantação tem a SUA regra e não se confunde com pagamento", async () => {
    const { product } = await mkProduct("Impl + rec", {
      tasks: [{ key: "implantacao", cycle: "implementacao" }, { key: "rotina" }], recurring: true,
      flags: { accepts_one_time: true, has_initial_implementation: true, implementation_blocks_operation: true, implementation_rule: "first_only" },
    });
    // avulso também passa pela implantação, mas não renova
    const av = await checkoutAndPay(CO_A.token, [(await postQuote(product.id)).json.id]);
    const t1 = byKey(await tasksOf(av.projectId, 0));
    assert.equal(t1["implantacao"].cycle_kind, "implementacao");
    assert.equal(t1["rotina"].status, "PENDENTE_DE_LIBERACAO");
    assert.equal(await prisma.catalog2Subscription.count({ where: { project_id: av.projectId } }), 0);
    // assinatura: implantação só no 1º mês
    const as = await checkoutAndPay(CO_A.token, [(await postQuote(product.id, "mensal")).json.id]);
    const sub = await prisma.catalog2Subscription.findUniqueOrThrow({ where: { project_product_id: as.pps[0].id } });
    await prisma.catalog2Subscription.update({ where: { id: sub.id }, data: { next_invoice_at: new Date(Date.now() - 1000) } });
    await runSubscriptionsTick();
    await api(`/api/catalog2/subscriptions/${sub.id}/pay`, { method: "POST", token: CO_A.token, body: {} });
    assert.deepEqual((await tasksOf(as.projectId, 1)).map((x) => x.catalog2_task?.key), ["rotina"]);
  });

  it("5. entrega única com período maior: nunca cria ciclos mensais repetidos por engano", async () => {
    process.env.CATALOG2_ENABLE_MULTI_PERIOD_CONTRACTS = "true";
    try {
      const { product, versionId } = await mkProduct("Entrega única", { tasks: [{ key: "t" }], flags: { accepts_one_time: true } });
      const code = uid();
      const project = await prisma.project.create({ data: { title: `Projeto ${code}`, project_code: code, company_id: CO_A.companyId } });
      projects.push(project.id);
      const pp = await prisma.projectProduct.create({ data: { project_id: project.id, catalog2_product_id: product.id, catalog2_version_id: versionId, product_name_snapshot: "P", product_category_snapshot: "C", catalog2_period: "trimestral", catalog2_period_months: 3 } });
      const payment = await prisma.payment.create({ data: { project_id: project.id, amount: 1, status: "PAGO", paid_at: new Date() } });
      const { gerarTarefasCatalog2DoProjeto } = await import("../lib/generate-tasks-catalog2");
      await prisma.$transaction((tx) => gerarTarefasCatalog2DoProjeto(tx, project.id, { paymentId: payment.id, paidAt: new Date(), billingCycleKey: "c0", projectProductIds: [pp.id] }));
      assert.equal(await prisma.catalog2ProjectDeliveryCycle.count({ where: { project_product_id: pp.id } }), 0, "sem entrega recorrente, nenhum ciclo futuro");
      assert.equal(await prisma.catalog2Subscription.count({ where: { project_product_id: pp.id } }), 0);
      assert.equal((await tasksOf(project.id)).length, 1);
    } finally { delete process.env.CATALOG2_ENABLE_MULTI_PERIOD_CONTRACTS; }
  });

  it("6. configuração inconsistente: aviso claro, publicação e cotação bloqueadas (sem mudar nada sozinho)", async () => {
    // versão NOVA (segue as regras) com entrega recorrente e SEM assinatura
    const { product, versionId } = await mkProduct("Inconsistente", { tasks: [{ key: "t" }], recurring: true, flags: { accepts_one_time: true } });
    await prisma.catalog2ProductVersion.update({ where: { id: versionId }, data: { accepts_recurring: false, sale_modes_enforced: true } });
    const v = await adminVersion(product.id, versionId);
    const issue = v.commercial_consistency.find((i: any) => i.code === "recurring_delivery_without_subscription");
    assert.ok(issue && issue.severity === "blocker");
    assert.match(issue.message, /entrega mensal recorrente/i);
    assert.match(issue.message, /assinatura mensal/i);
    const q = await postQuote(product.id);
    assert.equal(q.status, 409, "cotação bloqueada");
    assert.equal(q.json.code, "sale_mode_not_accepted");
    assert.equal((await clientView(product.id)).sale_label, "Avulso disponível", "o cliente não recebe o diagnóstico interno");
    assert.ok(!JSON.stringify(await clientView(product.id)).includes("commercial_consistency"));
    // nada foi alterado sozinho
    const after = await prisma.catalog2ProductVersion.findUniqueOrThrow({ where: { id: versionId } });
    assert.equal(after.accepts_recurring, false);
    assert.equal((await prisma.catalog2Product.findUniqueOrThrow({ where: { id: product.id } })).delivery_recurrence, "mensal");
    // publicar um rascunho com o mesmo conflito é recusado com a mensagem
    const draft = await prisma.catalog2ProductVersion.create({ data: { product_id: product.id, version_number: 2, state: "rascunho", title: "v2", summary: "r", full_description: "d", base_commercial_deadline_days: 5, accepts_recurring: false } });
    const t = await prisma.catalog2Task.create({ data: { version_id: draft.id, key: "t", name: "T", sort_order: 1, specialty_id: (await prisma.catalog2Specialty.findFirstOrThrow({ where: { key: "designer" } })).id, estimated_minutes: 60 } });
    await prisma.catalog2TaskStep.create({ data: { task_id: t.id, key: "s1", name: "E", sort_order: 1, specialty_id: t.specialty_id, estimated_minutes: 60 } });
    const pub = await api(`/api/admin/catalog2/versions/${draft.id}/publish`, { method: "POST", token: ADMIN.token, body: { client_action_id: crypto.randomUUID() } });
    assert.equal(pub.status, 422);
    const { validateVersionForPublish } = await import("../lib/catalog2-service");
    assert.ok((await validateVersionForPublish(draft.id)).issues.some((m) => /entrega mensal recorrente/i.test(m)), "a mensagem de bloqueio explica o conflito");
  });

  it("7. produtos antigos: só aviso interno; nenhuma ação sem decisão; ações explícitas só em versão em edição e registradas", async () => {
    // versão ANTIGA (não segue as regras novas) com o conflito: continua vendendo como sempre, mas mostra o aviso
    const { product, versionId } = await mkProduct("Antigo", { tasks: [{ key: "t" }], recurring: true, flags: { accepts_one_time: true } });
    await prisma.catalog2ProductVersion.update({ where: { id: versionId }, data: { accepts_recurring: false, sale_modes_enforced: false } });
    const v = await adminVersion(product.id, versionId);
    assert.ok(v.commercial_consistency.some((i: any) => i.severity === "blocker"), "aviso interno existe");
    assert.equal((await postQuote(product.id)).status, 201, "a versão antiga continua vendendo como antes");
    const opts = await api("/api/admin/catalog2/commercial-resolution-options", { token: ADMIN.token });
    assert.deepEqual(opts.json.data.map((o: any) => o.action), ["only_one_time", "one_time_and_monthly", "only_monthly", "unmark_recurring_delivery", "manual_review"]);
    assert.ok(opts.json.data.every((o: any) => o.effects.length > 0), "cada ação diz o que vai mudar");
    // versão publicada não muda
    const onPublished = await api(`/api/admin/catalog2/versions/${versionId}/commercial-resolution`, { method: "POST", token: ADMIN.token, body: { action: "only_one_time" } });
    assert.ok(onPublished.status >= 400, "versão publicada é imutável");
    assert.equal((await prisma.catalog2Product.findUniqueOrThrow({ where: { id: product.id } })).delivery_recurrence, "mensal");
    // em rascunho: revisar manualmente não altera nada
    const draft = await prisma.catalog2ProductVersion.create({ data: { product_id: product.id, version_number: 2, state: "rascunho", title: "v2", accepts_one_time: true, accepts_recurring: false } });
    const man = await api(`/api/admin/catalog2/versions/${draft.id}/commercial-resolution`, { method: "POST", token: ADMIN.token, body: { action: "manual_review" } });
    assert.equal(man.status, 200);
    assert.deepEqual(man.json.before, man.json.after);
    // habilitar os dois (período mensal já ativo)
    await periodsOn(product.id);
    const both = await api(`/api/admin/catalog2/versions/${draft.id}/commercial-resolution`, { method: "POST", token: ADMIN.token, body: { action: "one_time_and_monthly" } });
    assert.equal(both.status, 200, JSON.stringify(both.json));
    assert.deepEqual(both.json.after, { accepts_one_time: true, accepts_recurring: true, delivery_recurrence: "mensal" });
    assert.deepEqual((await adminVersion(product.id, draft.id)).commercial_consistency.filter((i: any) => i.severity === "blocker"), []);
    assert.equal((await adminVersion(product.id, draft.id)).sale_label, "Disponível avulso ou em assinatura mensal");
    // somente avulso: também desmarca a entrega recorrente (efeito mostrado antes)
    const one = await api(`/api/admin/catalog2/versions/${draft.id}/commercial-resolution`, { method: "POST", token: ADMIN.token, body: { action: "only_one_time" } });
    assert.deepEqual(one.json.after, { accepts_one_time: true, accepts_recurring: false, delivery_recurrence: null });
    assert.deepEqual((await adminVersion(product.id, draft.id)).commercial_consistency.filter((i: any) => i.severity === "blocker"), []);
    // histórico registrado
    assert.ok((await prisma.catalog2ProductHistoryEvent.count({ where: { product_id: product.id, event_type: "commercial_resolution" } })) >= 3);
    // a versão ANTIGA publicada continuou exatamente como estava
    const old = await prisma.catalog2ProductVersion.findUniqueOrThrow({ where: { id: versionId } });
    assert.equal(old.accepts_recurring, false);
    assert.equal(old.sale_modes_enforced, false);
  });

  it("8. preço idêntico: cadastro, simulação, prévia, memória de cálculo, cotação, pedido e fatura — e a origem explicada quando não é preço de venda", async () => {
    const { product, versionId } = await mkProduct("Preço único", { tasks: [{ key: "t" }], recurring: true, variations: true, addons: true, flags: { accepts_one_time: true } });
    const sel = await defaultSelection(versionId);
    const real = await computePricing(versionId, sel);
    const amount = real.lines.commercial_final_price.amount;
    assert.ok(amount != null && amount > 0);
    const sim = await api(`/api/admin/catalog2/versions/${versionId}/simulate`, { method: "POST", token: ADMIN.token, body: sel });
    assert.equal(sim.json.pricing.lines.commercial_final_price.amount, amount, "simulação (preço real)");
    assert.equal(sim.json.price_summary.amount, amount, "resumo único do servidor");
    assert.equal(sim.json.price_summary.source, "comercial");
    assert.ok(sim.json.price_summary.explanation.length > 10);
    const prev = await api(`/api/admin/catalog2/versions/${versionId}/preview`, { token: ADMIN.token });
    assert.equal(prev.json.price, amount, "prévia do cadastro");
    const mem = await api(`/api/admin/catalog2/products/${product.id}/pricing-memory`, { token: ADMIN.token });
    assert.equal(mem.json.pricing.lines.commercial_final_price.amount, amount, "memória de cálculo");
    const cfg = await api(`/api/catalog2/products/${product.id}/configure`, { method: "POST", token: CO_A.token, body: sel });
    assert.equal(cfg.json.pricing.commercial_price, amount, "configurador do cliente");
    const q = await api("/api/catalog2/quotes", { method: "POST", token: CO_A.token, body: { product: product.id, selection: sel } });
    assert.equal(q.status, 201, JSON.stringify(q.json));
    assert.equal(q.json.commercial_price, amount, "cotação");
    const { projectId, pps } = await checkoutAndPay(CO_A.token, [q.json.id]);
    assert.equal((await prisma.projectProduct.findUniqueOrThrow({ where: { id: pps[0].id } })).preco_final_cliente_snapshot, amount, "pedido/contrato");
    assert.equal((await prisma.invoice.findFirstOrThrow({ where: { project_id: projectId } })).amount, amount, "fatura");
    // quando o cálculo real NÃO fecha, o servidor só mostra valor ilustrativo da MESMA regra real e diz o que falta (fonte única, 2026-10-02)
    const fakeReal = { ...real, lines: { ...real.lines, commercial_final_price: { label: "x", amount: null } }, simulation: { ...real.simulation, total: 848.44 }, commercial_ready: false, pending_info: ["custo por token de IA"] } as typeof real;
    const s = priceSummary(fakeReal);
    assert.equal(s.amount, 848.44);
    assert.equal(s.source, "simulacao");
    assert.match(s.explanation, /regras reais de preço/i);
    assert.match(s.explanation, /custo por token de IA/);
    assert.equal(s.rule_version, real.rule.version);
    const pend = priceSummary({ ...real, commercial_ready: false } as typeof real);
    assert.equal(pend.amount, amount, "com pendência comercial mostra o cálculo real, nunca o simulado");
    assert.equal(pend.source, "calculado");
  });

  it("9. produtos e contratos antigos preservados: conferir que rodar diagnóstico/consulta não altera nada", async () => {
    const { product, versionId } = await mkProduct("Preservar", { tasks: [{ key: "t" }], recurring: true, flags: { accepts_one_time: true } });
    const q = await postQuote(product.id, "mensal");
    const { pps } = await checkoutAndPay(CO_A.token, [q.json.id]);
    const snap = async () => JSON.stringify([
      await prisma.catalog2ProductVersion.findUniqueOrThrow({ where: { id: versionId } }),
      await prisma.catalog2Product.findUniqueOrThrow({ where: { id: product.id } }),
      await prisma.projectProduct.findUniqueOrThrow({ where: { id: pps[0].id } }),
      await prisma.catalog2Subscription.findUniqueOrThrow({ where: { project_product_id: pps[0].id } }),
      await prisma.catalog2ProductPeriod.findMany({ where: { product_id: product.id }, orderBy: { period: "asc" } }),
    ]);
    const before = await snap();
    await adminVersion(product.id, versionId);
    await api(`/api/admin/catalog2/products/${product.id}/pricing-memory`, { token: ADMIN.token });
    await api(`/api/admin/catalog2/versions/${versionId}/simulate`, { method: "POST", token: ADMIN.token, body: SEL });
    await clientView(product.id);
    await api("/api/admin/catalog2/commercial-resolution-options", { token: ADMIN.token });
    assert.equal(await snap(), before, "consultar/diagnosticar não altera nada");
    // mudar a versão depois não muda o que o contrato guardou
    const pp0 = await prisma.projectProduct.findUniqueOrThrow({ where: { id: pps[0].id } });
    await prisma.catalog2ProductVersion.update({ where: { id: versionId }, data: { accepts_recurring: false, accepts_one_time: false, sale_modes_enforced: true } });
    const pp1 = await prisma.projectProduct.findUniqueOrThrow({ where: { id: pps[0].id } });
    assert.equal(pp1.preco_final_cliente_snapshot, pp0.preco_final_cliente_snapshot);
    assert.equal(pp1.catalog2_period, pp0.catalog2_period);
    assert.equal((await prisma.catalog2Subscription.findUniqueOrThrow({ where: { project_product_id: pps[0].id } })).status, "ativa");
  });
});
