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

// Pedido 3 · Fase 8 — 10 cenários ponta a ponta: compra real (cotação → pedido → pagamento) e execução até o resultado.

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

describe("Pedido 3 · Fase 8 — cenários ponta a ponta", () => {
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

  it("1. produto avulso: cotação → pedido → pagamento; preço congelado = cobrado = faturado; tarefas de entrega única; sem assinatura", async () => {
    const { product } = await mkProduct("Avulso", { tasks: [{ key: "entrega", cycle: "avulso" }] });
    const q = await quote(CO_A.token, product.id);
    const { projectId, pps } = await checkoutAndPay(CO_A.token, [q.id]);
    const pp = await prisma.projectProduct.findUniqueOrThrow({ where: { id: pps[0].id } });
    assert.equal(pp.preco_final_cliente_snapshot, q.commercial_price, "preço do pedido = preço da cotação");
    assert.equal(pp.status, "EM_EXECUCAO");
    const inv = await prisma.invoice.findMany({ where: { project_id: projectId } });
    assert.equal(inv.length, 1);
    assert.equal(inv[0].status, "paid");
    assert.equal(inv[0].amount, q.commercial_price);
    const tasks = await tasksOf(projectId);
    assert.equal(tasks.length, 1);
    assert.equal(tasks[0].cycle_kind, "avulso");
    assert.equal(tasks[0].occurrence_index, 0);
    assert.equal(await prisma.catalog2Subscription.count({ where: { project_product_id: pp.id } }), 0);
    assert.equal(await prisma.catalog2ProjectDeliveryCycle.count({ where: { project_product_id: pp.id } }), 0);
  });

  it("2. assinatura mensal: 1º mês pago na compra; fatura do mês 2 emitida e paga; tarefas do mês 2; trimestral travado", async () => {
    const { product } = await mkProduct("Assinatura", { tasks: [{ key: "rotina" }], recurring: true });
    await configurePeriod(ADMIN.token, product.id, "mensal");
    await configurePeriod(ADMIN.token, product.id, "trimestral", 10);
    const tri = await api("/api/catalog2/quotes", { method: "POST", token: CO_A.token, body: { product: product.id, selection: SEL, period: "trimestral" } });
    assert.ok(tri.status >= 400 && tri.status < 500, "trimestral está pronto mas travado: " + tri.status);
    const q = await quote(CO_A.token, product.id, { period: "mensal" });
    const { projectId, pps } = await checkoutAndPay(CO_A.token, [q.id]);
    const sub = await prisma.catalog2Subscription.findUniqueOrThrow({ where: { project_product_id: pps[0].id } });
    assert.equal(sub.status, "ativa");
    assert.equal(sub.monthly_amount, q.commercial_price);
    await prisma.catalog2Subscription.update({ where: { id: sub.id }, data: { next_invoice_at: new Date(Date.now() - 1000) } });
    assert.equal((await runSubscriptionsTick()).invoiced, 1);
    assert.equal((await prisma.catalog2Subscription.findUniqueOrThrow({ where: { id: sub.id } })).status, "aguardando_renovacao");
    const paid = await api(`/api/catalog2/subscriptions/${sub.id}/pay`, { method: "POST", token: CO_A.token, body: {} });
    assert.equal(paid.json.paid, true);
    assert.equal((await tasksOf(projectId, 1)).length, 1, "tarefa do 2º mês criada");
    const invs = await prisma.invoice.findMany({ where: { project_id: projectId }, orderBy: { created_at: "asc" } });
    assert.deepEqual(invs.map((i) => i.status), ["paid", "paid"], "uma fatura por mês");
    assert.equal((await prisma.catalog2Subscription.findUniqueOrThrow({ where: { id: sub.id } })).status, "ativa");
  });

  it("3. implementação inicial: operação espera a implementação; ao concluir libera; o mês seguinte só gera a rotina (implantação não repete)", async () => {
    const { product } = await mkProduct("Com implantação", {
      tasks: [{ key: "implantacao", cycle: "implementacao" }, { key: "rotina", cycle: "recorrente" }], recurring: true,
      flags: { has_initial_implementation: true, implementation_blocks_operation: true, accepts_recurring: true, implementation_rule: "first_only" },
    });
    await configurePeriod(ADMIN.token, product.id, "mensal");
    const q = await quote(CO_A.token, product.id, { period: "mensal" });
    const { projectId, pps } = await checkoutAndPay(CO_A.token, [q.id]);
    let t = byKey(await tasksOf(projectId, 0));
    assert.equal(t["implantacao"].cycle_kind, "implementacao");
    assert.notEqual(t["implantacao"].status, "PENDENTE_DE_LIBERACAO");
    assert.equal(t["rotina"].status, "PENDENTE_DE_LIBERACAO", "a operação espera a implementação");
    const flow = await api(`/api/project-tasks/${t["rotina"].id}/flow`, { token: CO_A.token });
    assert.equal(flow.json.state, "aguardando_implementacao", "o cliente enxerga o motivo");
    await prisma.projectTask.update({ where: { id: t["implantacao"].id }, data: { status: "CONCLUIDA", data_conclusao: new Date() } });
    await reevaluateProjectDependencies(prisma, projectId);
    t = byKey(await tasksOf(projectId, 0));
    assert.notEqual(t["rotina"].status, "PENDENTE_DE_LIBERACAO", "implementação concluída libera a operação");
    // mês 2: só a rotina
    const sub = await prisma.catalog2Subscription.findUniqueOrThrow({ where: { project_product_id: pps[0].id } });
    await prisma.catalog2Subscription.update({ where: { id: sub.id }, data: { next_invoice_at: new Date(Date.now() - 1000) } });
    await runSubscriptionsTick();
    assert.equal((await api(`/api/catalog2/subscriptions/${sub.id}/pay`, { method: "POST", token: CO_A.token, body: {} })).json.paid, true);
    const m2 = await tasksOf(projectId, 1);
    assert.deepEqual(m2.map((x) => x.catalog2_task?.key), ["rotina"], "a implantação não se repete");
    assert.equal(m2[0].cycle_kind, "recorrencia_mensal");
  });

  it("4. continuidade: no mês seguinte o cliente escolhe manter o executor; ele volta para o mesmo profissional com o contexto", async () => {
    const { product } = await mkProduct("Continuidade", { tasks: [{ key: "rotina", continuity: "allowed" }], recurring: true });
    await configurePeriod(ADMIN.token, product.id, "mensal");
    const q = await quote(CO_A.token, product.id, { period: "mensal" });
    const { projectId, pps } = await checkoutAndPay(CO_A.token, [q.id]);
    const n1 = await mkNomad("Tarefa rotina");
    const m1 = byKey(await tasksOf(projectId, 0));
    await prisma.projectTask.update({ where: { id: m1["rotina"].id }, data: { status: "CONCLUIDA", nomade_responsavel_id: n1.nomade.id, data_conclusao: new Date(), lider_responsavel_id: LEADER.id } });
    await prisma.taskBriefingAnswer.create({ data: { project_task_id: m1["rotina"].id, question_key: "site", question_text: "Qual o site?", answer: "https://exemplo.com" } });
    const sub = await prisma.catalog2Subscription.findUniqueOrThrow({ where: { project_product_id: pps[0].id } });
    await prisma.catalog2Subscription.update({ where: { id: sub.id }, data: { next_invoice_at: new Date(Date.now() - 1000) } });
    await runSubscriptionsTick();
    assert.equal((await api(`/api/catalog2/subscriptions/${sub.id}/pay`, { method: "POST", token: CO_A.token, body: {} })).json.paid, true);
    const m2 = byKey(await tasksOf(projectId, 1));
    const t2 = m2["rotina"];
    assert.equal(t2.continuity_status, "pending_choice");
    assert.equal(t2.continuity_prev_nomade_id, n1.nomade.id);
    const info = await api(`/api/project-tasks/${t2.id}/continuity`, { token: CO_A.token });
    assert.equal(info.json.can_choose, true);
    assert.equal(info.json.previous_executor.name, "Especialista responsável", "o cliente escolhe manter sem ver o nome");
    assert.equal((await api(`/api/project-tasks/${t2.id}/continuity`, { method: "POST", token: CO_A.token, body: { choice: "keep" } })).status, 200);
    await prisma.projectTask.update({ where: { id: t2.id }, data: { status: "LIBERADA_PARA_EXECUCAO" } });
    await iniciarEtapasDaTarefa(prisma, t2.id);
    await startTaskRotation(t2.id);
    const after = await prisma.projectTask.findUniqueOrThrow({ where: { id: t2.id }, include: { briefing_answers: true } });
    assert.equal(after.nomade_responsavel_id, n1.nomade.id, "voltou ao mesmo executor");
    assert.equal(after.briefing_answers[0]?.answer, "https://exemplo.com", "contexto preservado");
  });

  it("5. troca de executor e revalidação: acesso validado deixa de valer quando o executor muda; o cliente informa mudança e a equipe revalida", async () => {
    const code = uid();
    const prod = await prisma.catalog2Product.create({ data: { slug: `e2e-ast-${code}`, internal_name: `[TESTE] Troca ${code}`, status: "disponivel" } });
    catProducts.push(prod.id);
    const ver = await prisma.catalog2ProductVersion.create({ data: { product_id: prod.id, version_number: 1, state: "publicada", title: "T" } });
    await prisma.catalog2VersionAccess.createMany({ data: [{ version_id: ver.id, access_type: "google_ads", label: "Google Ads", is_required: true, sort_order: 1 }] });
    const sm = await prisma.catalog2StepModel.create({ data: { name: `Acessos ${code}`, purpose: "coleta_informacao", is_access_validation: true, signature: `sig-${code}` } });
    extra.push(async () => { await prisma.catalog2StepModel.delete({ where: { id: sm.id } }).catch(() => {}); });
    const task = await prisma.catalog2Task.create({ data: { version_id: ver.id, key: "gestao", name: "Gestão", asset_rule: "on_executor_change" } });
    await prisma.catalog2TaskStep.create({ data: { task_id: task.id, key: "acessos", name: "Validação dos acessos", sort_order: 1, step_model_id: sm.id } });
    await prisma.catalog2TaskStep.create({ data: { task_id: task.id, key: "executar", name: "Executar", sort_order: 2 } });
    const { gerarTarefasCatalog2DoProjeto } = await import("../lib/generate-tasks-catalog2");
    const project = await prisma.project.create({ data: { title: `Projeto Troca ${code}`, project_code: code, company_id: CO_A.companyId } });
    projects.push(project.id);
    const pp = await prisma.projectProduct.create({ data: { project_id: project.id, catalog2_product_id: prod.id, catalog2_version_id: ver.id, product_name_snapshot: "P", product_category_snapshot: "C" } });
    const payment = await prisma.payment.create({ data: { project_id: project.id, amount: 1, status: "PAGO", paid_at: new Date() } });
    // o cliente já tem o acesso validado ANTES da contratação → a etapa de acessos é dispensada
    const asset = await prisma.clientAsset.create({ data: { company_id: CO_A.companyId, asset_type: "google_ads", label: "Google Ads", status: "validado", last_validated_at: new Date(), scope_confirmed: "Administrador" } });
    extra.push(async () => { await prisma.clientAsset.deleteMany({ where: { company_id: CO_A.companyId } }); });
    await prisma.$transaction((tx) => gerarTarefasCatalog2DoProjeto(tx, project.id, { paymentId: payment.id, paidAt: new Date(), billingCycleKey: "c0", projectProductIds: [pp.id] }));
    const ptask = await prisma.projectTask.findFirstOrThrow({ where: { project_id: project.id }, include: { stages: { orderBy: { ordem: "asc" } } } });
    assert.equal(ptask.stages[0].status, "CONCLUIDA", "acesso já validado: etapa dispensada");
    // troca de executor → o acesso precisa ser revalidado por quem assumir
    assert.equal(await reopenAccessValidationOnExecutorChange(prisma, ptask.id), true);
    assert.equal((await prisma.projectTaskStage.findUniqueOrThrow({ where: { id: ptask.stages[0].id } })).status, "PENDENTE");
    assert.ok(await prisma.projectDecisionLog.findFirst({ where: { project_id: project.id, kind: "asset_revalidation" } }));
    // o cliente avisa que mudou o acesso; o líder é avisado; a equipe revalida
    await prisma.projectTask.update({ where: { id: ptask.id }, data: { lider_responsavel_id: LEADER.id, status: "EM_EXECUCAO" } });
    const links = await prisma.clientAssetLink.findMany({ where: { project_task_id: ptask.id } });
    assert.ok(links.length > 0, "a tarefa está ligada ao ativo");
    const rep = await api(`/api/client-assets/${asset.id}/report-change`, { method: "POST", token: CO_A.token, body: { identifier: "777-000-1111", note: "Troquei de conta" } });
    assert.equal(rep.status, 200, JSON.stringify(rep.json));
    assert.equal((await prisma.clientAsset.findUniqueOrThrow({ where: { id: asset.id } })).status, "revalidar");
    assert.equal(await prisma.systemAlert.count({ where: { entity_id: ptask.id, user_id: LEADER.id, type: "ativo_alterado" } }), 1);
    assert.equal((await api(`/api/client-assets/${asset.id}/validate`, { method: "POST", token: ADMIN.token, body: { scope_confirmed: "Administrador" } })).status, 200);
    assert.equal((await prisma.clientAsset.findUniqueOrThrow({ where: { id: asset.id } })).status, "validado");
  });

  it("6. IA com revisão humana: a IA executa, a saída vira entregável rastreável, o revisor aprova e só então segue para a aprovação de quem contratou", async () => {
    const prof = await prisma.catalog2AIProfile.create({ data: { name: `[TESTE] E2E ${uid()}`, unit_cost_input_per_1k: 0.002, unit_cost_output_per_1k: 0.01, allowed_actors: "leader" } });
    extra.push(async () => { await prisma.catalog2TaskAI.updateMany({ where: { profile_id: prof.id }, data: { profile_id: null } }); await prisma.catalog2AIProfile.delete({ where: { id: prof.id } }).catch(() => {}); });
    setTaskAIAdapter(async () => ({ text: "Texto final escrito pela IA.", missing_information: [], promptTokens: 1000, completionTokens: 300 }), "simulado");
    const { product } = await mkProduct("Com IA", { tasks: [{ key: "texto", mode: "ia", ai: { profile_id: prof.id, mode: "autonoma" } }] });
    const q = await quote(CO_A.token, product.id);
    const { projectId } = await checkoutAndPay(CO_A.token, [q.id]);
    const task = byKey(await tasksOf(projectId))["texto"];
    assert.equal(task.requires_review, true, "tarefa com IA exige revisão humana");
    await prisma.projectTask.update({ where: { id: task.id }, data: { lider_responsavel_id: LEADER.id } });
    const run = await api(`/api/project-tasks/${task.id}/ai/run`, { method: "POST", token: ADMIN.token, body: {} });
    assert.equal(run.status, 201, JSON.stringify(run.json));
    assert.equal((await prisma.projectTask.findUniqueOrThrow({ where: { id: task.id } })).status, "AGUARDANDO_REVISAO", "a IA não entrega direto ao cliente");
    const d = await prisma.projectTaskDeliverable.findFirstOrThrow({ where: { project_task_id: task.id, source: "ia" } });
    assert.equal(d.ai_run_id, run.json.run_id);
    assert.equal(d.content_text, "Texto final escrito pela IA.");
    // o cliente ainda não sabe da revisão interna
    assert.equal((await api(`/api/project-tasks/${task.id}/flow`, { token: CO_A.token })).json.state, "em_execucao");
    const rev = await api(`/api/project-tasks/${task.id}/revisao`, { method: "POST", token: tokenFor(LEADER), body: { decisao: "aprovar", comentario: "Texto ok.", minutos: 6 } });
    assert.equal(rev.status, 200, JSON.stringify(rev.json));
    const after = await prisma.projectTask.findUniqueOrThrow({ where: { id: task.id } });
    assert.notEqual(after.status, "AGUARDANDO_REVISAO");
    assert.notEqual(after.status, "CONCLUIDA", "ainda falta a aprovação de quem contratou");
    const costs = await api(`/api/project-tasks/${task.id}/costs`, { token: tokenFor(LEADER) });
    assert.equal(costs.json.ai.runs, 1);
    assert.equal(costs.json.ai.cost, 0.005, "1000/1000×0,002 + 300/1000×0,01");
    assert.equal(costs.json.review.spent_minutes, 6);
  });

  it("7. dependência entre tarefas: a publicação espera o entregável da arte ser APROVADO; aprovado, libera sozinha", async () => {
    const { product, versionId } = await mkProduct("Dependência", { tasks: [{ key: "arte" }, { key: "publicar" }] });
    const arte = await prisma.catalog2Task.findFirstOrThrow({ where: { version_id: versionId, key: "arte" } });
    await prisma.catalog2TaskDeliverable.create({ data: { task_id: arte.id, key: "arte-final", name: "Arte final", type: "link", responsible: "executor" } });
    const rule = await api(`/api/admin/catalog2/products/${product.id}/prerequisites`, {
      method: "POST", token: ADMIN.token,
      body: { dependent_task_key: "publicar", target_kind: "deliverable", target_product_id: product.id, target_task_key: "arte", target_deliverable_key: "arte-final", behavior: "block_start" },
    });
    assert.equal(rule.status, 201, JSON.stringify(rule.json));
    const q = await quote(CO_A.token, product.id);
    const { projectId } = await checkoutAndPay(CO_A.token, [q.id]);
    const t = byKey(await tasksOf(projectId));
    assert.equal(t["publicar"].status, "PENDENTE_DE_LIBERACAO");
    const flow = await api(`/api/project-tasks/${t["publicar"].id}/flow`, { token: CO_A.token });
    assert.match(flow.json.reason, /./, "o cliente vê o motivo da espera");
    await prisma.projectTask.update({ where: { id: t["arte"].id }, data: { lider_responsavel_id: LEADER.id } });
    const item = await prisma.projectTaskDeliverable.findFirstOrThrow({ where: { project_task_id: t["arte"].id, key: "arte-final" } });
    assert.equal((await api(`/api/project-tasks/${t["arte"].id}/deliverables/${item.id}/submit`, { method: "POST", token: tokenFor(LEADER), body: { content_url: "https://drive.example/arte.png" } })).status, 200);
    await reevaluateProjectDependencies(prisma, projectId);
    assert.equal((await prisma.projectTask.findUniqueOrThrow({ where: { id: t["publicar"].id } })).status, "PENDENTE_DE_LIBERACAO", "enviado não basta");
    assert.equal((await api(`/api/project-tasks/${t["arte"].id}/deliverables/${item.id}/review`, { method: "POST", token: ADMIN.token, body: { decisao: "aprovar" } })).status, 200);
    await reevaluateProjectDependencies(prisma, projectId);
    assert.notEqual((await prisma.projectTask.findUniqueOrThrow({ where: { id: t["publicar"].id } })).status, "PENDENTE_DE_LIBERACAO");
  });

  it("8. pacote com dependência entre produtos: dois produtos no mesmo pedido; o segundo espera a aprovação do primeiro", async () => {
    const a = await mkProduct("Pacote A", { tasks: [{ key: "criativos" }] });
    const b = await mkProduct("Pacote B", { tasks: [{ key: "publicacao" }] });
    const pkg = await api("/api/admin/catalog2/packages", { method: "POST", token: ADMIN.token, body: { name: `[TESTE E2E] Pacote ${uid()}`, product_ids: [a.product.id, b.product.id] } });
    assert.equal(pkg.status, 201, JSON.stringify(pkg.json));
    const r = await api(`/api/admin/catalog2/packages/${pkg.json.id}/rules`, { method: "POST", token: ADMIN.token, body: { dependent_product_id: b.product.id, dependent_task_key: "publicacao", target_product_id: a.product.id, target_kind: "client_approval", target_task_key: "criativos", behavior: "block_start" } });
    assert.equal(r.status, 201, JSON.stringify(r.json));
    const qa = await quote(CO_A.token, a.product.id);
    const qb = await quote(CO_A.token, b.product.id);
    const { projectId } = await checkoutAndPay(CO_A.token, [qa.id, qb.id]);
    const t = byKey(await tasksOf(projectId));
    assert.notEqual(t["criativos"].status, "PENDENTE_DE_LIBERACAO", "o primeiro produto começa");
    assert.equal(t["publicacao"].status, "PENDENTE_DE_LIBERACAO", "o segundo espera");
    const deps = await api(`/api/project-tasks/${t["publicacao"].id}/dependencies`, { token: CO_A.token });
    assert.equal(deps.json.blocked, true);
    // o líder entrega, a agência e o cliente aprovam os criativos → a publicação libera sozinha
    await leaderExecutes(t["criativos"].id, LEADER.id);
    assert.equal((await api(`/api/project-tasks/${t["criativos"].id}/aprovar`, { method: "PATCH", token: ADMIN.token, body: { nivel: "agencia" } })).status, 200);
    assert.equal((await api(`/api/project-tasks/${t["criativos"].id}/aprovar`, { method: "PATCH", token: CO_A.token, body: {} })).status, 200);
    await reevaluateProjectDependencies(prisma, projectId);
    assert.notEqual((await prisma.projectTask.findUniqueOrThrow({ where: { id: t["publicacao"].id } })).status, "PENDENTE_DE_LIBERACAO", "aprovados os criativos, a publicação libera");
  });

  it("9. aprovação, reprovação e ajustes: executor entrega → agência aprova → cliente REPROVA com motivo → ajustes → nova entrega → aprovação final", async () => {
    const { product } = await mkProduct("Aprovação", { tasks: [{ key: "peca" }] });
    const q = await quote(CO_A.token, product.id);
    const { projectId } = await checkoutAndPay(CO_A.token, [q.id]);
    const task = byKey(await tasksOf(projectId))["peca"];
    await leaderExecutes(task.id, LEADER.id);
    let row = await prisma.projectTask.findUniqueOrThrow({ where: { id: task.id } });
    assert.equal(row.status, "EM_APROVACAO");
    assert.equal((await api(`/api/project-tasks/${task.id}/aprovar`, { method: "PATCH", token: CO_A.token, body: {} })).status >= 400, true, "o cliente não aprova antes da agência");
    assert.equal((await api(`/api/project-tasks/${task.id}/aprovar`, { method: "PATCH", token: ADMIN.token, body: { nivel: "agencia" } })).status, 200);
    const rej = await api(`/api/project-tasks/${task.id}/reprovar`, { method: "PATCH", token: CO_A.token, body: { motivo: "Trocar a cor do título." } });
    assert.equal(rej.status, 200, JSON.stringify(rej.json));
    row = await prisma.projectTask.findUniqueOrThrow({ where: { id: task.id } });
    assert.equal(row.status, "EM_EXECUCAO", "voltou para o executor");
    assert.equal(row.reprovacoes, 1);
    const stagesNow = await prisma.projectTaskStage.findMany({ where: { project_task_id: task.id }, orderBy: { ordem: "asc" } });
    assert.notEqual(stagesNow[stagesNow.length - 1].status, "CONCLUIDA", "a última etapa foi reaberta");
    // segunda entrega e aprovação final
    const again = await prisma.projectTaskStage.findFirstOrThrow({ where: { project_task_id: task.id, status: { not: "CONCLUIDA" } }, orderBy: { ordem: "asc" } });
    await prisma.projectTaskStage.update({ where: { id: again.id }, data: { status: "EM_ANDAMENTO", executor_type: "leader", lider_id: LEADER.id } });
    await concluirEtapa(prisma, again.id, { userId: LEADER.id });
    assert.equal((await prisma.projectTask.findUniqueOrThrow({ where: { id: task.id } })).status, "EM_APROVACAO");
    assert.equal((await api(`/api/project-tasks/${task.id}/aprovar`, { method: "PATCH", token: ADMIN.token, body: { nivel: "agencia" } })).status, 200);
    assert.equal((await api(`/api/project-tasks/${task.id}/aprovar`, { method: "PATCH", token: CO_A.token, body: {} })).status, 200);
    row = await prisma.projectTask.findUniqueOrThrow({ where: { id: task.id } });
    assert.ok(["CONCLUIDA", "APROVADA"].includes(row.status), "status final: " + row.status);
  });

  it("10. preço e prazo com variação, adicional e período: a cotação, o pedido e a fatura carregam exatamente o que foi escolhido", async () => {
    const { product } = await mkProduct("Preço e prazo", { tasks: [{ key: "t" }], recurring: true, variations: true, addons: true, deadline: 5, flags: { accepts_recurring: true } });
    await configurePeriod(ADMIN.token, product.id, "mensal", 0);
    const base = await quote(CO_A.token, product.id, { selection: { ...SEL, variation_option_keys: ["basico"] } });
    const full = await quote(CO_A.token, product.id, { selection: { ...SEL, variation_option_keys: ["plus"], addon_keys: ["urgente"] } });
    assert.ok(full.commercial_price > base.commercial_price, "variação Plus + adicional custam mais");
    assert.equal(base.commercial_deadline_days, 5);
    assert.equal(full.commercial_deadline_days, 5 + 3 + 2, "prazo soma variação (3) e adicional (2)");
    assert.notEqual(full.config_checksum, base.config_checksum, "configuração diferente = cotação diferente");
    // o que o cliente vê na cotação não expõe custo interno
    assert.ok(!JSON.stringify(full.pricing_snapshot_json ?? "").includes("human_cost"));
    // período mensal sobre a configuração completa
    const monthly = await quote(CO_A.token, product.id, { period: "mensal", selection: { ...SEL, variation_option_keys: ["plus"], addon_keys: ["urgente"] } });
    const { projectId, pps } = await checkoutAndPay(CO_A.token, [monthly.id]);
    const pp = await prisma.projectProduct.findUniqueOrThrow({ where: { id: pps[0].id } });
    assert.equal(pp.preco_final_cliente_snapshot, monthly.commercial_price);
    assert.equal(pp.catalog2_period, "mensal");
    assert.equal((await prisma.invoice.findFirstOrThrow({ where: { project_id: projectId } })).amount, monthly.commercial_price);
    const sub = await prisma.catalog2Subscription.findUniqueOrThrow({ where: { project_product_id: pp.id } });
    assert.equal(sub.monthly_amount, monthly.commercial_price, "a assinatura cobra todo mês o valor escolhido");
    // o pedido congela a seleção: mudar o produto depois não muda o que foi vendido
    const frozen = await prisma.catalog2Quote.findUniqueOrThrow({ where: { id: monthly.id } });
    assert.deepEqual(JSON.parse(frozen.selection_json).variation_option_keys, ["plus"]);
    assert.deepEqual(JSON.parse(frozen.selection_json).addon_keys, ["urgente"]);
  });
});
