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
import { setTaskAIAdapter, resetTaskAIAdapter, runAutoTriggerTick } from "../lib/task-ai";

// Decisões de produto (2026-09-30): pacotes configuráveis, aviso/tolerância de fatura, nome do executor, gatilho da IA, sem efeito retroativo, períodos longos inativos.

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

describe("Decisões de produto — padrões configuráveis", () => {
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

  it("A. pacote: exigir TODOS, exigir itens ESPECÍFICOS ou exigir PELO MENOS UM", async () => {
    const solo = await mkProduct("Só em pacote", { tasks: [{ key: "a" }], flags: { sell_mode: "package_only", accepts_one_time: true, sale_modes_enforced: true } });
    const p2 = await mkProduct("Par 2", { tasks: [{ key: "b" }] });
    const p3 = await mkProduct("Par 3", { tasks: [{ key: "c" }] });
    const q = async (productId: string) => (await quote(CO_A.token, productId)).id as string;
    const tryCheckout = async (ids: string[]) => api("/api/catalog2/checkout", { method: "POST", token: CO_A.token, body: { quote_ids: ids, checkout_client_action_id: crypto.randomUUID() } });
    const mk = async (body: Record<string, unknown>) => {
      const r = await api("/api/admin/catalog2/packages", { method: "POST", token: ADMIN.token, body: { name: `[TESTE E2E] Pct ${uid()}`, product_ids: [solo.product.id, p2.product.id, p3.product.id], ...body } });
      return r;
    };
    // específico sem escolher itens / item de fora: recusado
    assert.equal((await mk({ requirement_mode: "specific" })).status, 422);
    assert.equal((await mk({ requirement_mode: "specific", required_product_ids: ["nao-existe"] })).status, 422);
    // "todos": só com os 3
    const all = await mk({ requirement_mode: "all" });
    assert.equal(all.status, 201);
    const qa = await q(solo.product.id), qb = await q(p2.product.id), qc = await q(p3.product.id);
    assert.equal((await tryCheckout([qa, qb])).json.code, "package_only", "faltou o terceiro");
    await api(`/api/admin/catalog2/packages/${all.json.id}`, { method: "PUT", token: ADMIN.token, body: { is_active: false } });
    // "pelo menos um": basta outro item
    const any = await mk({ requirement_mode: "any" });
    assert.equal(any.status, 201);
    assert.equal((await tryCheckout([qa])).json.code, "package_only", "sozinho não vale");
    const ok = await tryCheckout([qa, qb]);
    assert.equal(ok.status, 201, JSON.stringify(ok.json));
    projects.push(ok.json.project.id);
    await api(`/api/admin/catalog2/packages/${any.json.id}`, { method: "PUT", token: ADMIN.token, body: { is_active: false } });
    // "específicos": só o item obrigatório (p3) importa
    const spec = await mk({ requirement_mode: "specific", required_product_ids: [p3.product.id] });
    assert.equal(spec.status, 201, JSON.stringify(spec.json));
    const qa2 = await q(solo.product.id);
    assert.equal((await tryCheckout([qa2, await q(p2.product.id)])).json.code, "package_only", "p2 não é o item exigido");
    const ok2 = await tryCheckout([qa2, await q(p3.product.id)]);
    assert.equal(ok2.status, 201, JSON.stringify(ok2.json));
    projects.push(ok2.json.project.id);
    const pkgRow = await prisma.catalog2Package.findUniqueOrThrow({ where: { id: spec.json.id }, include: { items: true } });
    assert.equal(pkgRow.requirement_mode, "specific");
    assert.deepEqual(pkgRow.items.filter((i) => i.is_required).map((i) => i.catalog2_product_id), [p3.product.id]);
    void qc;
  });

  it("B. aviso de fatura (5) e tolerância (3) são padrão, configuráveis, e cada assinatura guarda o que valia ao nascer", async () => {
    const d = await api("/api/admin/catalog2/subscription-settings", { token: ADMIN.token });
    assert.deepEqual(d.json, { invoice_lead_days: 5, grace_days: 3 });
    assert.equal((await api("/api/admin/catalog2/subscription-settings", { method: "PUT", token: ADMIN.token, body: { invoice_lead_days: 0, grace_days: 3 } })).status, 400);
    const { product } = await mkProduct("Assinatura cfg", { tasks: [{ key: "rotina" }], recurring: true });
    await configurePeriod(ADMIN.token, product.id, "mensal");
    const old = await checkoutAndPay(CO_A.token, [(await quote(CO_A.token, product.id, { period: "mensal" })).id]);
    try {
      assert.equal((await api("/api/admin/catalog2/subscription-settings", { method: "PUT", token: ADMIN.token, body: { invoice_lead_days: 10, grace_days: 7 } })).status, 200);
      const fresh = await checkoutAndPay(CO_A.token, [(await quote(CO_A.token, product.id, { period: "mensal" })).id]);
      const sOld = await prisma.catalog2Subscription.findUniqueOrThrow({ where: { project_product_id: old.pps[0].id } });
      const sNew = await prisma.catalog2Subscription.findUniqueOrThrow({ where: { project_product_id: fresh.pps[0].id } });
      assert.equal(sOld.invoice_lead_days, 5, "contrato antigo NÃO muda retroativamente");
      assert.equal(sOld.grace_days, 3);
      assert.equal(sNew.invoice_lead_days, 10);
      assert.equal(sNew.grace_days, 7);
      assert.equal(Math.round((sNew.current_period_end.getTime() - sNew.next_invoice_at!.getTime()) / DAY), 10);
      assert.equal(Math.round((sOld.current_period_end.getTime() - sOld.next_invoice_at!.getTime()) / DAY), 5);
      // tolerância de cada uma: vencida há 5 dias → a antiga (3) fica inadimplente, a nova (7) ainda não
      for (const s of [sOld, sNew]) await prisma.catalog2Subscription.update({ where: { id: s.id }, data: { status: "aguardando_renovacao", current_period_end: new Date(Date.now() - 5 * DAY) } });
      await runSubscriptionsTick();
      assert.equal((await prisma.catalog2Subscription.findUniqueOrThrow({ where: { id: sOld.id } })).status, "inadimplente");
      assert.equal((await prisma.catalog2Subscription.findUniqueOrThrow({ where: { id: sNew.id } })).status, "aguardando_renovacao");
    } finally {
      await api("/api/admin/catalog2/subscription-settings", { method: "PUT", token: ADMIN.token, body: { invoice_lead_days: 5, grace_days: 3 } });
    }
  });

  it("C. nome do nômade: cliente vê 'Especialista responsável' por padrão; a versão pode liberar a identificação nominal", async () => {
    const { product, versionId } = await mkProduct("Nome", { tasks: [{ key: "rotina", continuity: "allowed" }], recurring: true });
    await configurePeriod(ADMIN.token, product.id, "mensal");
    const { projectId, pps } = await checkoutAndPay(CO_A.token, [(await quote(CO_A.token, product.id, { period: "mensal" })).id]);
    const n1 = await mkNomad("Tarefa rotina");
    const m1 = byKey(await tasksOf(projectId, 0));
    await prisma.projectTask.update({ where: { id: m1["rotina"].id }, data: { status: "CONCLUIDA", nomade_responsavel_id: n1.nomade.id, data_conclusao: new Date(), lider_responsavel_id: LEADER.id } });
    const sub = await prisma.catalog2Subscription.findUniqueOrThrow({ where: { project_product_id: pps[0].id } });
    await prisma.catalog2Subscription.update({ where: { id: sub.id }, data: { next_invoice_at: new Date(Date.now() - 1000) } });
    await runSubscriptionsTick();
    await api(`/api/catalog2/subscriptions/${sub.id}/pay`, { method: "POST", token: CO_A.token, body: {} });
    const t2 = byKey(await tasksOf(projectId, 1))["rotina"];
    await prisma.projectTask.update({ where: { id: t2.id }, data: { lider_responsavel_id: LEADER.id } });
    const view = async (token: string) => (await api(`/api/project-tasks/${t2.id}/continuity`, { token })).json.previous_executor;
    assert.equal((await view(CO_A.token)).name, "Especialista responsável");
    assert.equal((await view(CO_A.token)).id, null);
    assert.equal((await view(tokenFor(LEADER))).name, n1.nomade.name, "a equipe vê o nome");
    await prisma.catalog2ProductVersion.update({ where: { id: versionId }, data: { show_executor_name: true } });
    assert.equal((await view(CO_A.token)).name, n1.nomade.name, "identificação nominal liberada nesta versão");
  });

  it("D. IA: gatilho manual (padrão), automática após pré-requisitos e só rascunho", async () => {
    const prof = await prisma.catalog2AIProfile.create({ data: { name: `[TESTE] Gatilho ${uid()}`, allowed_actors: "leader", unit_cost_input_per_1k: 0.001, unit_cost_output_per_1k: 0.002 } });
    extra.push(async () => { await prisma.catalog2TaskAI.updateMany({ where: { profile_id: prof.id }, data: { profile_id: null } }); await prisma.catalog2AIProfile.delete({ where: { id: prof.id } }).catch(() => {}); });
    setTaskAIAdapter(async () => ({ text: "Texto da IA.", missing_information: [], promptTokens: 100, completionTokens: 50 }), "simulado");
    const setTrigger = (versionId: string, trigger: string | null, mode = "autonoma") =>
      prisma.catalog2Task.findFirstOrThrow({ where: { version_id: versionId } }).then((t) =>
        prisma.catalog2TaskAI.update({ where: { task_id: t.id }, data: { ...(trigger ? { ai_trigger: trigger } : {}), ai_mode: mode } }));
    // padrão = manual: o gatilho automático não mexe em nada
    const manual = await mkProduct("IA manual", { tasks: [{ key: "t", mode: "ia", ai: { profile_id: prof.id, mode: "autonoma" } }] });
    const rm = await checkoutAndPay(CO_A.token, [(await quote(CO_A.token, manual.product.id)).id]);
    assert.equal((await prisma.catalog2TaskAI.findFirstOrThrow({ where: { task: { version_id: manual.versionId } } })).ai_trigger, "manual");
    await runAutoTriggerTick();
    assert.equal(await prisma.projectTaskAIRun.count({ where: { project_task: { project_id: rm.projectId } } }), 0, "manual: nada roda sozinho");
    // automática: roda depois dos pré-requisitos, uma vez só
    const auto = await mkProduct("IA automática", { tasks: [{ key: "t", mode: "ia", ai: { profile_id: prof.id, mode: "autonoma" } }] });
    await setTrigger(auto.versionId, "automatica");
    const ra = await checkoutAndPay(CO_A.token, [(await quote(CO_A.token, auto.product.id)).id]);
    const ta = byKey(await tasksOf(ra.projectId))["t"];
    await prisma.projectTask.update({ where: { id: ta.id }, data: { lider_responsavel_id: LEADER.id } });
    assert.equal((await runAutoTriggerTick()).started, 0, "tarefa ainda em lançamento: não é pré-requisito cumprido");
    await prisma.projectTask.update({ where: { id: ta.id }, data: { status: "LIBERADA_PARA_EXECUCAO" } });
    assert.ok((await runAutoTriggerTick()).started >= 1);
    assert.equal(await prisma.projectTaskAIRun.count({ where: { project_task_id: ta.id } }), 1);
    assert.equal((await prisma.projectTask.findUniqueOrThrow({ where: { id: ta.id } })).status, "AGUARDANDO_REVISAO", "automática também passa pela revisão humana");
    await runAutoTriggerTick();
    assert.equal(await prisma.projectTaskAIRun.count({ where: { project_task_id: ta.id } }), 1, "não repete");
    // automática com dependência pendente: espera
    const dep = await mkProduct("IA depende", { tasks: [{ key: "base" }, { key: "t", mode: "ia", ai: { profile_id: prof.id, mode: "autonoma" } }] });
    await prisma.catalog2Task.findFirstOrThrow({ where: { version_id: dep.versionId, key: "t" } }).then((t) => prisma.catalog2TaskAI.update({ where: { task_id: t.id }, data: { ai_trigger: "automatica" } }));
    assert.equal((await api(`/api/admin/catalog2/products/${dep.product.id}/prerequisites`, { method: "POST", token: ADMIN.token, body: { dependent_task_key: "t", target_kind: "task", target_product_id: dep.product.id, target_task_key: "base", behavior: "block_start" } })).status, 201);
    const rd = await checkoutAndPay(CO_A.token, [(await quote(CO_A.token, dep.product.id)).id]);
    await runAutoTriggerTick();
    const td = byKey(await tasksOf(rd.projectId))["t"];
    await prisma.projectTask.update({ where: { id: td.id }, data: { status: "LIBERADA_PARA_EXECUCAO" } }); // mesmo liberada à força, a dependência pendente segura a IA
    await runAutoTriggerTick();
    assert.equal(await prisma.projectTaskAIRun.count({ where: { project_task_id: td.id } }), 0, "espera a dependência");
    // só rascunho: mesmo configurada como "executa sozinha", nunca conclui
    const draft = await mkProduct("IA rascunho", { tasks: [{ key: "t", mode: "ia", ai: { profile_id: prof.id, mode: "autonoma" } }] });
    await setTrigger(draft.versionId, "so_rascunho");
    const rr = await checkoutAndPay(CO_A.token, [(await quote(CO_A.token, draft.product.id)).id]);
    const tr = byKey(await tasksOf(rr.projectId))["t"];
    const run = await api(`/api/project-tasks/${tr.id}/ai/run`, { method: "POST", token: ADMIN.token, body: {} });
    assert.equal(run.json.status, "gerada", "continua aguardando decisão humana");
    assert.ok((await prisma.projectTaskStage.findMany({ where: { project_task_id: tr.id } })).every((s) => s.status !== "CONCLUIDA"));
    assert.equal(await prisma.projectTaskDeliverable.count({ where: { project_task_id: tr.id, source: "ia" } }), 0);
  });

  it("E. trimestral/semestral/anual seguem inativos; regras novas não mudam contrato existente", async () => {
    const { product } = await mkProduct("Períodos", { tasks: [{ key: "t" }], recurring: true });
    for (const per of ["mensal", "trimestral", "semestral", "anual"]) await configurePeriod(ADMIN.token, product.id, per, 5);
    for (const per of ["trimestral", "semestral", "anual"]) {
      const r = await api("/api/catalog2/quotes", { method: "POST", token: CO_A.token, body: { product: product.id, selection: SEL, period: per } });
      assert.ok(r.status >= 400 && r.status < 500, `${per} deveria estar travado (status ${r.status})`);
    }
    const view = await api(`/api/catalog2/products/${product.id}`, { token: CO_A.token });
    assert.deepEqual(view.json.available_periods.map((p: any) => p.period), ["mensal"]);
    // contrato já existente guarda sua própria fotografia: mudar a versão depois não muda o que foi vendido
    const { pps } = await checkoutAndPay(CO_A.token, [(await quote(CO_A.token, product.id, { period: "mensal" })).id]);
    const before = await prisma.projectProduct.findUniqueOrThrow({ where: { id: pps[0].id } });
    await prisma.catalog2ProductVersion.updateMany({ where: { product_id: product.id }, data: { show_executor_name: true, sale_modes_enforced: true, accepts_recurring: false } });
    const after = await prisma.projectProduct.findUniqueOrThrow({ where: { id: pps[0].id } });
    assert.equal(after.preco_final_cliente_snapshot, before.preco_final_cliente_snapshot);
    assert.equal(after.catalog2_period, "mensal");
    assert.equal((await prisma.catalog2Subscription.findUniqueOrThrow({ where: { project_product_id: pps[0].id } })).status, "ativa");
  });
});
