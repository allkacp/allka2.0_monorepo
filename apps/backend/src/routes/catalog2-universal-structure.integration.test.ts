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

// Estrutura universal v2 · ciclo financeiro: implantação × recorrente, primeira cobrança, renovações e escopo de cobrança.

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

interface TDef { key: string; repeat?: string; every?: number; cycle?: string; continuity?: string; steps?: number; mode?: string; review?: boolean; ai?: { profile_id: string; mode: string } }
async function mkProduct(name: string, o: { tasks: TDef[]; recurring?: boolean; flags?: Record<string, unknown>; variations?: boolean; addons?: boolean; deadline?: number; noPublish?: boolean; addonsRaw?: unknown[]; variationsRaw?: unknown[] }) {
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
          cycle_type: t.cycle ?? "recorrente", repeat_rule: t.repeat ?? "all_cycles", repeat_every_cycles: t.every ?? null, executor_continuity: t.continuity ?? "not_allowed", requires_review: !!t.review, requires_client_approval: true,
          ...(t.ai ? { ai: { create: { profile_id: t.ai.profile_id, ai_mode: t.ai.mode, instructions: "Escreva o texto.", human_review_required: true } } } : {}),
          steps: { create: Array.from({ length: t.steps ?? 1 }, (_, k) => ({ key: `s${k + 1}`, name: `Etapa ${t.key}-${k + 1}`, sort_order: k + 1, specialty_id: spec.id, estimated_minutes: 60 })) },
        })),
      },
      ...(o.variationsRaw ? { variations: { create: o.variationsRaw as never } } : {}),
      ...(o.addonsRaw ? { addons: { create: (o.addonsRaw as { effects?: unknown }[]).map((a) => ({ ...a })) as never } } : {}),
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
  if (!o.noPublish) await publishVersion(v.id, "system", { activate: true, changeSummary: "publicação de teste" });
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

const postQuote = (productId: string, period?: string, selection: Record<string, unknown> = SEL) =>
  api("/api/catalog2/quotes", { method: "POST", token: CO_A.token, body: { product: productId, selection, ...(period ? { period } : {}) } });
let CO_A: Awaited<ReturnType<typeof mkCompanyUser>>;
let ADMIN: Awaited<ReturnType<typeof mkAdmin>>;
let LEADER: Awaited<ReturnType<typeof mkUser>>;

describe("Estrutura universal v2 · cadastro universal", () => {
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
    const simulate = async (versionId: string, selection: Record<string, unknown> = SEL) => { const r = await api(`/api/admin/catalog2/versions/${versionId}/simulate`, { method: "POST", token: ADMIN.token, body: selection }); assert.equal(r.status, 200, JSON.stringify(r.json)); return { pricing: r.json.pricing, split: r.json.pricing.split }; };
  const IMPL = { key: "implantacao", cycle: "implementacao" } as TDef;
  const ROTINA = { key: "rotina", cycle: "recorrente" } as TDef;
  const mkImplProduct = async (rule = "first_only", extraTasks: TDef[] = [], o: Record<string, unknown> = {}) =>
    mkProduct("Com implantação", { tasks: [IMPL, ROTINA, ...extraTasks], recurring: true, flags: { accepts_one_time: true, has_initial_implementation: true, implementation_blocks_operation: false, implementation_rule: rule }, ...o } as never);
  const near = (a: unknown, b: unknown, msg?: string) => assert.ok(typeof a === "number" && typeof b === "number" && Math.abs(a - b) <= 0.03, `${msg ?? ""} ${a} != ${b}`);
  const r2 = (x: number) => Math.round(x * 100) / 100;
  const priceP = (sim: any) => r2(sim.pricing.split.schedule.tasks.find((t: any) => t.key === "rotina").price as number); // preço de UMA tarefa de 60 min

  const adminPut = (versionId: string, body: unknown) => api(`/api/admin/catalog2/versions/${versionId}`, { method: "PUT", token: ADMIN.token, body });
  const activationJobs = (productId: string) => prisma.catalog2NotificationJob.count({ where: { entity_type: "catalog2_product", entity_id: productId, event_type: "activation" } });

  it("M12. publicar sem ativar: o produto continua Em preparação e nenhum aviso de ativação é criado", async () => {
    const { product, versionId } = await mkProduct("Publicar sem ativar", { tasks: [{ key: "t1" }], noPublish: true });
    const pub = await api(`/api/admin/catalog2/versions/${versionId}/publish`, { method: "POST", token: ADMIN.token, body: { client_action_id: crypto.randomUUID() } });
    assert.equal(pub.status, 200, JSON.stringify(pub.json));
    assert.equal(pub.json.activated, false);
    assert.equal(pub.json.product_status, "em_preparacao");
    const p = await prisma.catalog2Product.findUniqueOrThrow({ where: { id: product.id } });
    assert.equal(p.status, "em_preparacao", "publicar NÃO ativa");
    assert.equal(p.published_version_id, versionId, "mas a versão fica publicada e congelada");
    assert.equal((await prisma.catalog2ProductVersion.findUniqueOrThrow({ where: { id: versionId } })).state, "publicada");
    assert.equal(await activationJobs(product.id), 0, "nenhum aviso de ativação");
    const hd = (await adm(`/products/${product.id}`, "GET")).json.header;
    assert.deepEqual({ s: hd.product_status, p: hd.published, a: hd.activated, w: hd.awaiting_activation, n: hd.published_version_number, st: hd.current_version_state }, { s: "em_preparacao", p: true, a: false, w: true, n: 1, st: "publicada" }, "cabeçalho separa status, publicação e ativação");
    // ativar depois pelo cabeçalho (status) continua funcionando
    const st = await api(`/api/admin/catalog2/products/${product.id}/status`, { method: "PATCH", token: ADMIN.token, body: { status: "disponivel" } });
    assert.equal(st.status, 200, JSON.stringify(st.json));
    assert.equal((await prisma.catalog2Product.findUniqueOrThrow({ where: { id: product.id } })).status, "disponivel");
  });

  it("M13. publicar e ativar: exige confirmação explícita e só então ativa e cria o aviso", async () => {
    const { product, versionId } = await mkProduct("Publicar e ativar", { tasks: [{ key: "t1" }], noPublish: true });
    const semConfirmar = await api(`/api/admin/catalog2/versions/${versionId}/publish`, { method: "POST", token: ADMIN.token, body: { activate: true } });
    assert.equal(semConfirmar.status, 422);
    assert.equal(semConfirmar.json.code, "activation_not_confirmed");
    assert.equal((await prisma.catalog2ProductVersion.findUniqueOrThrow({ where: { id: versionId } })).state, "rascunho", "sem confirmação nada muda");
    const pub = await api(`/api/admin/catalog2/versions/${versionId}/publish`, { method: "POST", token: ADMIN.token, body: { activate: true, confirm_activation: true, client_action_id: crypto.randomUUID() } });
    assert.equal(pub.status, 200, JSON.stringify(pub.json));
    assert.equal(pub.json.activated, true);
    assert.equal((await prisma.catalog2Product.findUniqueOrThrow({ where: { id: product.id } })).status, "disponivel");
    assert.equal(await activationJobs(product.id), 1);
  });

  it("M14. campos comerciais persistem, voltam no GET, entram na nova versão e respeitam a visibilidade", async () => {
    const { product, versionId } = await mkProduct("Campos comerciais", { tasks: [{ key: "t1" }], noPublish: true });
    const body = {
      summary: "Resumo curto", full_description: "Descrição completa do serviço",
      target_audience: "Pequenas empresas", commercial_objective: "Organizar a operação", scope: "Escopo detalhado",
      included_items: ["Item A", " Item B ", "Item A", ""], excluded_items: ["Fora 1"], client_requirements: ["Acesso à conta"],
      deliverables: "Relatório mensal\nPlano de ação", client_info: "Logo e acessos", internal_notes: "Margem apertada",
      results_disclaimer: "Resultados dependem do mercado", change_policy: "Mudanças de escopo geram novo orçamento",
    };
    const put = await adminPut(versionId, body);
    assert.equal(put.status, 200, JSON.stringify(put.json));
    assert.ok(put.json.saved_fields.includes("client_info") && put.json.saved_fields.includes("internal_notes"), "a resposta diz exatamente o que foi gravado");
    assert.deepEqual(put.json.included_items, ["Item A", "Item B"], "aparada, sem vazios e sem duplicados; a ordem é mantida");
    const detail = (await api(`/api/admin/catalog2/products/${product.id}`, { token: ADMIN.token })).json;
    const v = detail.versions.find((x: { id: string }) => x.id === versionId);
    assert.equal(v.client_info, "Logo e acessos");
    assert.equal(v.internal_notes, "Margem apertada");
    assert.deepEqual(v.deliverables_summary, ["Relatório mensal", "Plano de ação"]);
    assert.equal(v.target_audience, "Pequenas empresas");
    assert.equal(v.field_visibility.internal_notes, "internal");
    // histórico registra o que mudou
    const ev = await prisma.catalog2VersionEvent.findMany({ where: { version_id: versionId, event_type: "updated" }, orderBy: { created_at: "desc" } });
    assert.match(ev[0].note ?? "", /campos comerciais atualizados/);
    // visibilidade: cliente vê o público-alvo, nunca as observações internas; ocultar vale de verdade
    await adminPut(versionId, { field_visibility: { scope: "team" } });
    await publishVersion(versionId, "system", { activate: true, changeSummary: "publicação de teste" });
    const client = (await api(`/api/catalog2/products/${product.id}`, { token: CO_A.token })).json;
    assert.equal(client.commercial.target_audience, "Pequenas empresas");
    assert.deepEqual(client.commercial.included_items, ["Item A", "Item B"]);
    assert.equal("internal_notes" in client.commercial, false);
    assert.equal("scope" in client.commercial, false, "campo marcado como equipe não vai ao cliente");
    assert.ok(!JSON.stringify(client).includes("Margem apertada"));
    // publicada é imutável
    const blocked = await adminPut(versionId, { scope: "outro" });
    assert.ok(blocked.status >= 400, "versão publicada não aceita edição");
    // nova versão copia tudo
    const nv = await api(`/api/admin/catalog2/products/${product.id}/versions`, { method: "POST", token: ADMIN.token, body: {} });
    assert.ok(nv.status === 201 || nv.status === 200, JSON.stringify(nv.json));
    const row = await prisma.catalog2ProductVersion.findFirstOrThrow({ where: { product_id: product.id, state: "rascunho" } });
    assert.equal(row.client_info, "Logo e acessos");
    assert.equal(row.internal_notes, "Margem apertada");
    assert.equal(row.change_policy, "Mudanças de escopo geram novo orçamento");
    assert.deepEqual(JSON.parse(row.included_items_json!), ["Item A", "Item B"]);
    assert.equal(JSON.parse(row.field_visibility_json!).scope, "team");
  });

  it("M15. campo inválido é rejeitado com mensagem clara; limites 500/4000; conteúdo antigo nunca é cortado", async () => {
    const { versionId } = await mkProduct("Limites", { tasks: [{ key: "t1" }], noPublish: true });
    const r1 = await adminPut(versionId, { summary: "x".repeat(501) });
    assert.equal(r1.status, 422, "descrição curta passa de 500");
    assert.match(r1.json.error, /500/);
    const r2 = await adminPut(versionId, { full_description: "x".repeat(4001) });
    assert.equal(r2.status, 422);
    assert.match(r2.json.error, /4000/);
    assert.equal((await adminPut(versionId, { summary: "x".repeat(500), full_description: "y".repeat(4000) })).status, 200, "exatamente no limite vale");
    assert.equal((await adminPut(versionId, { internal_notes: "n".repeat(4001) })).status, 422);
    assert.equal((await adminPut(versionId, { included_items: ["a".repeat(301)] })).json.code, "list_item_too_long");
    assert.equal((await adminPut(versionId, { included_items: Array.from({ length: 51 }, (_, i) => `i${i}`) })).json.code, "list_too_long");
    assert.equal((await adminPut(versionId, { included_items: "não é lista" })).status, 400, "tipo errado → erro de validação");
    assert.equal((await adminPut(versionId, { field_visibility: { internal_notes: "client" } })).json.code, "internal_notes_always_internal");
    assert.equal((await adminPut(versionId, { field_visibility: { scope: "publico" } })).json.code, "visibility_invalid");
    assert.equal((await adminPut(versionId, { field_visibility: { inventado: "client" } })).json.code, "visibility_unknown_field");
    // conteúdo já salvo acima do limite (legado) fica intacto e não impede salvar outros campos
    await prisma.catalog2ProductVersion.update({ where: { id: versionId }, data: { summary: "L".repeat(900) } });
    const ok = await adminPut(versionId, { title: "Novo título", summary: "L".repeat(900) });
    assert.equal(ok.status, 200, JSON.stringify(ok.json));
    assert.equal((await prisma.catalog2ProductVersion.findUniqueOrThrow({ where: { id: versionId } })).summary?.length, 900, "nada foi cortado em silêncio");
    assert.equal((await adminPut(versionId, { summary: "L".repeat(901) })).status, 422, "aumentar o legado acima do limite é barrado");
  });
  const inClientCatalog = async (productId: string) => {
    const r = await api("/api/catalog2/products?limit=500", { token: CO_A.token });
    const rows = (r.json?.data ?? r.json?.products ?? r.json ?? []) as { id: string }[];
    return Array.isArray(rows) && rows.some((p) => p.id === productId);
  };
  const historyTypes = async (productId: string) => ((await adm(`/products/${productId}/history?page_size=100`, "GET")).json.data as { event_type: string; description: string }[]);

  it("X8. publicar não ativa: produto publicado em preparação não aparece nem contrata; só a ativação libera; histórico separa os dois eventos", async () => {
    const { product, versionId } = await mkProduct("Ciclo publicar e ativar", { tasks: [{ key: "t1" }], noPublish: true });
    const jobs = () => prisma.catalog2NotificationJob.count({ where: { entity_type: "catalog2_product", entity_id: product.id, event_type: "activation" } });
    // publicar versão (sem ativar)
    const pub = await publishRaw(versionId, { client_action_id: crypto.randomUUID() });
    assert.equal(pub.status, 200, JSON.stringify(pub.json));
    assert.equal(pub.json.activated, false);
    assert.equal((await prisma.catalog2Product.findUniqueOrThrow({ where: { id: product.id } })).status, "em_preparacao");
    assert.equal(await jobs(), 0, "nenhum aviso de ativação ao só publicar");
    assert.equal(await inClientCatalog(product.id), false, "publicado e em preparação NÃO aparece no catálogo do cliente");
    assert.equal((await api(`/api/catalog2/products/${product.id}`, { token: CO_A.token })).status, 404);
    const q1 = await postQuote(product.id);
    assert.ok(q1.status >= 400, "e não pode ser cotado/contratado antes da ativação");
    let types = await historyTypes(product.id);
    assert.ok(types.some((e) => e.event_type === "version_published"), "a publicação fica no histórico");
    assert.equal(types.some((e) => e.event_type === "status_changed" && /ativado/i.test(e.description)), false, "sem evento de ativação");
    // ativar exige confirmação (pelo status do cabeçalho ou por 'publicar e ativar')
    const st = await api(`/api/admin/catalog2/products/${product.id}/status`, { method: "PATCH", token: ADMIN.token, body: { status: "disponivel" } });
    assert.equal(st.status, 200, JSON.stringify(st.json));
    assert.equal(await jobs(), 1, "o aviso nasce na ativação");
    assert.equal(await inClientCatalog(product.id), true, "ativado, aparece");
    const q2 = await postQuote(product.id);
    assert.equal(q2.status, 201, JSON.stringify(q2.json));
    types = await historyTypes(product.id);
    assert.ok(types.some((e) => e.event_type === "status_changed"), "a ativação é outro evento");
    // publicar e ativar numa só ação: dois eventos distintos no histórico
    const b = await mkProduct("Publicar e ativar junto", { tasks: [{ key: "t1" }], noPublish: true });
    assert.equal((await publishRaw(b.versionId, { activate: true })).status, 422, "sem confirmação não ativa");
    assert.equal(await inClientCatalog(b.product.id), false);
    assert.equal((await publishRaw(b.versionId, { activate: true, confirm_activation: true })).status, 200);
    const tb = await historyTypes(b.product.id);
    assert.ok(tb.some((e) => e.event_type === "version_published"));
    assert.ok(tb.some((e) => e.event_type === "status_changed" && /ativado/i.test(e.description)), "ativação registrada à parte");
    assert.equal(await inClientCatalog(b.product.id), true);
  });

  it("X9. perfis de IA: nenhuma chave vaza (API, erros, logs, histórico); teste de conexão não persiste nada; teste de execução exige confirmar o custo", async () => {
    const SECRET = "sk-TESTE-SEGREDO-0123456789abcdef0123456789";
    const antes = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = SECRET;
    const logs: string[] = [];
    const orig = { log: console.log, error: console.error, warn: console.warn };
    console.log = (...a) => { logs.push(a.map(String).join(" ")); }; console.error = (...a) => { logs.push(a.map(String).join(" ")); }; console.warn = (...a) => { logs.push(a.map(String).join(" ")); };
    try {
      resetTaskAIAdapter();
      const p = await mkProfile({ base_instructions: "Responda curto." });
      // endpoints de provedor/perfil: só indicador de configuração, nunca a chave
      const prov = await adm("/ai-providers", "GET");
      assert.equal(prov.json.data.find((x: { key: string }) => x.key === "gemini").configured, true);
      for (const r of [prov, await adm("/ai-profiles", "GET"), await adm(`/ai-profiles/${p.id}`, "GET")]) assert.ok(!JSON.stringify(r.json).includes(SECRET), "a chave não pode aparecer");
      assert.ok(!JSON.stringify((await adm(`/ai-profiles/${p.id}`, "GET")).json).match(/api_?key|secret/i));
      // falha do provedor com a chave dentro da mensagem: sai oculta
      setTaskAIAdapter(async () => { throw new Error(`401 invalid key ${SECRET} (Authorization: Bearer ${SECRET})`); }, "simulado");
      const conn = await adm(`/ai-profiles/${p.id}/test-connection`, "POST");
      assert.equal(conn.json.ok, false);
      assert.ok(!JSON.stringify(conn.json).includes(SECRET), JSON.stringify(conn.json));
      assert.match(conn.json.message, /oculta|oculto/);
      // teste de execução: sem confirmar o custo, não chama o provedor
      let chamadas = 0;
      setTaskAIAdapter(async () => { chamadas++; return { text: "ok", missing_information: [], promptTokens: 10, completionTokens: 5 }; }, "simulado");
      const semConfirmar = await adm(`/ai-profiles/${p.id}/test-run`, "POST", { sample_input: "texto" });
      assert.equal(semConfirmar.status, 422);
      assert.equal(semConfirmar.json.code, "cost_confirmation_required");
      assert.ok(semConfirmar.json.details.estimated_input_tokens > 0);
      assert.equal(chamadas, 0, "nenhuma chamada (nenhum custo) sem confirmação");
      // teste de conexão e de execução não persistem prompt, resposta nem execução
      const runs = await prisma.projectTaskAIRun.count();
      const usage = await prisma.aIUsageLog.count();
      const ok = await adm(`/ai-profiles/${p.id}/test-connection`, "POST");
      assert.equal(ok.json.ok, true);
      assert.ok(!("sample" in ok.json), "a resposta do teste de conexão não volta nem é guardada");
      const run = await adm(`/ai-profiles/${p.id}/test-run`, "POST", { sample_input: "texto sigiloso do teste", confirm_cost: true });
      assert.equal(run.json.persisted, false);
      assert.equal(chamadas, 2);
      assert.equal(await prisma.projectTaskAIRun.count(), runs);
      assert.equal(await prisma.aIUsageLog.count(), usage);
    } finally {
      console.log = orig.log; console.error = orig.error; console.warn = orig.warn;
      if (antes === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = antes;
      resetTaskAIAdapter();
    }
    assert.ok(!logs.join("\n").includes(SECRET), "a chave não pode aparecer em log");
    const stored = await prisma.projectTaskAIRun.findMany({ select: { error_message: true, instructions: true, context_text: true } });
    assert.ok(!JSON.stringify(stored).includes(SECRET), "histórico de execuções sem credenciais");
  });
  it("M26. revisão técnica → qualificação do líder → aprovação do cliente → conclusão → liberação da dependência, em sequência (caminho feliz)", async () => {
    const { product, versionId } = await mkProduct("Sequência de aceite", { tasks: [{ key: "peca", review: true }, { key: "depois" }], noPublish: true });
    await prisma.catalog2Task.updateMany({ where: { version_id: versionId, key: "peca" }, data: { requires_qualification: true, requires_client_approval: true } });
    await publishVersion(versionId, "system", { activate: true, changeSummary: "publicação de teste" });
    assert.equal((await api(`/api/admin/catalog2/products/${product.id}/prerequisites`, { method: "POST", token: ADMIN.token, body: { dependent_task_key: "depois", target_kind: "client_approval", target_product_id: product.id, target_task_key: "peca", behavior: "block_start" } })).status, 201);
    const { projectId } = await checkoutAndPay(CO_A.token, [(await postQuote(product.id)).json.id]);
    const t = byKey(await tasksOf(projectId));
    const peca = t["peca"];
    const status = async () => (await prisma.projectTask.findUniqueOrThrow({ where: { id: peca.id } })).status;
    const admin = tokenFor(ADMIN.user);
    const trilha: string[] = [];
    // execução → entregas
    await leaderExecutes(peca.id, LEADER.id);
    trilha.push(await status());
    // revisão técnica
    assert.equal((await api(`/api/project-tasks/${peca.id}/revisao`, { method: "POST", token: admin, body: { decisao: "aprovar", comentario: "Conferido." } })).status, 200);
    trilha.push(await status());
    // qualificação pelo líder
    assert.equal((await api(`/api/project-tasks/${peca.id}/qualificacao`, { method: "POST", token: admin, body: { decisao: "aprovar" } })).status, 200);
    trilha.push(await status());
    // aprovação da agência e do cliente
    assert.equal((await api(`/api/project-tasks/${peca.id}/aprovar`, { method: "PATCH", token: admin, body: { nivel: "agencia" } })).status, 200);
    assert.equal((await prisma.projectTask.findUniqueOrThrow({ where: { id: t["depois"].id } })).status, "PENDENTE_DE_LIBERACAO", "antes do cliente aprovar, a dependência segue travada");
    assert.equal((await api(`/api/project-tasks/${peca.id}/aprovar`, { method: "PATCH", token: CO_A.token, body: {} })).status, 200);
    trilha.push(await status());
    assert.deepEqual(trilha, ["AGUARDANDO_REVISAO", "AGUARDANDO_QUALIFICACAO", "EM_APROVACAO", "CONCLUIDA"], "cada passo vem depois do anterior, sem pular nenhum");
    // conclusão libera a dependência
    await reevaluateProjectDependencies(prisma, projectId);
    assert.notEqual((await prisma.projectTask.findUniqueOrThrow({ where: { id: t["depois"].id } })).status, "PENDENTE_DE_LIBERACAO");
    // cada papel tem o seu registro: revisão técnica ≠ qualificação ≠ aprovação do cliente
    const rev = await prisma.projectTaskReview.findMany({ where: { project_task_id: peca.id } });
    const qual = await prisma.projectTaskQualification.findMany({ where: { project_task_id: peca.id } });
    assert.ok(rev.some((r) => r.decision === "aprovada") && qual.some((q) => q.decision === "aprovada"));
    const done = await prisma.projectTask.findUniqueOrThrow({ where: { id: peca.id } });
    assert.ok(done.reviewed_at && done.qualified_at && done.aprovado_agencia_em && done.aprovado_cliente_em, "revisão, qualificação, aceite da agência e do cliente carimbados separadamente");
  });

  it("X10. o questionário reabre no editor com TODOS os tipos e configurações (nada vira texto longo ao salvar de novo)", async () => {
    const { versionId } = await mkProduct("Questionário ida e volta", { tasks: [{ key: "t1" }], noPublish: true });
    const q = await adm("/questionnaires", "POST", { name: "Ida e volta" });
    const mk = (body: Record<string, unknown>) => adm(`/questionnaires/${q.json.id}/questions`, "POST", { is_required: false, ...body });
    assert.equal((await mk({ key: "valor", label: "Verba", question_type: "moeda", help_text: "Em reais", validation: { min: 100 }, visibility: "team", answer_usage: "ai" })).status, 201);
    assert.equal((await mk({ key: "esc", label: "Canal", question_type: "selecao_unica", options: ["Google", "Meta"], default_value: "Google" })).status, 201);
    const task = await prisma.catalog2Task.findFirstOrThrow({ where: { version_id: versionId } });
    await adm(`/tasks/${task.id}/questionnaire`, "PUT", { questionnaire_id: q.json.id });
    const productId = (await prisma.catalog2ProductVersion.findUniqueOrThrow({ where: { id: versionId } })).product_id;
    const detail = (await adm(`/products/${productId}`, "GET")).json;
    const v = detail.versions.find((x: { id: string }) => x.id === versionId);
    const qs = v.tasks[0].questionnaire.questions as { key: string; question_type: string; help_text: string | null; options: { value: string }[]; default_value: string | null; validation: { min?: number }; visibility: string; answer_usage: string }[];
    const valor = qs.find((x) => x.key === "valor")!;
    assert.equal(valor.question_type, "moeda");
    assert.equal(valor.help_text, "Em reais");
    assert.equal(valor.validation.min, 100);
    assert.equal(valor.visibility, "team");
    assert.equal(valor.answer_usage, "ai");
    const esc = qs.find((x) => x.key === "esc")!;
    assert.deepEqual(esc.options.map((o) => o.value), ["Google", "Meta"]);
    assert.equal(esc.default_value, "Google");
    // regravar exatamente o que a tela devolveu não muda nada
    const back = await adm(`/tasks/${task.id}/questionnaire/content`, "PUT", { name: "Ida e volta", questions: qs.map((x) => ({ key: x.key, label: x.key, is_required: false, question_type: x.question_type, help_text: x.help_text, options: x.options.length ? x.options.map((o) => o.value) : null, default_value: x.default_value, validation: Object.keys(x.validation ?? {}).length ? x.validation : null, visibility: x.visibility, answer_usage: x.answer_usage })) });
    assert.equal(back.status, 200, JSON.stringify(back.json));
    const again = back.json.questionnaire.questions as { key: string; question_type: string }[];
    assert.equal(again.find((x) => x.key === "valor")!.question_type, "moeda");
    assert.equal(again.find((x) => x.key === "esc")!.question_type, "selecao_unica");
  });
  const adm = (path: string, method: string, body?: unknown) => api(`/api/admin/catalog2${path}`, { method, token: ADMIN.token, body });

  it("X1. escopo de cobrança nos adicionais, efeitos e condições: grava, devolve, valida e acompanha a nova versão", async () => {
    const { product, versionId } = await mkProduct("Escopo API", { tasks: [{ key: "t1" }], recurring: true, noPublish: true });
    const add = await adm(`/versions/${versionId}/addons`, "POST", { key: "setup", name: "Setup", base_cost: 100, charge_scope: "one_time", source_task_key: "t1" });
    assert.equal(add.status, 201, JSON.stringify(add.json));
    assert.equal(add.json.charge_scope, "one_time");
    const janela = await adm(`/versions/${versionId}/addons`, "POST", { key: "janela", name: "Janela", base_cost: 10, charge_scope: "per_cycle", charge_start_cycle: 1, charge_end_cycle: 3 });
    assert.equal(janela.status, 201, JSON.stringify(janela.json));
    assert.equal((await adm(`/versions/${versionId}/addons`, "POST", { key: "ruim", name: "Ruim", base_cost: 1, charge_scope: "per_cycle", charge_start_cycle: 5, charge_end_cycle: 2 })).json.code, "invalid_charge_window");
    assert.equal((await adm(`/versions/${versionId}/addons`, "POST", { key: "ruim2", name: "Ruim", base_cost: 1, charge_scope: "one_time", source_task_key: "nao_existe" })).json.code, "invalid_charge_task");
    assert.equal((await adm(`/versions/${versionId}/addons`, "POST", { key: "ruim3", name: "Ruim", base_cost: 1, charge_scope: "de_vez_em_quando" })).status, 400, "escopo fora da lista é barrado");
    const ef = await adm(`/addons/${add.json.id}/effects`, "POST", { effect_type: "add_fixed_amount", effect_value: "20", charge_scope: "per_quantity", charge_quantity: 4 });
    assert.equal(ef.status, 201, JSON.stringify(ef.json));
    assert.equal(ef.json.charge_quantity, 4);
    // troca de escopo de um adicional existente
    const put = await adm(`/addons/${janela.json.id}`, "PUT", { charge_scope: "recurring", charge_start_cycle: 0, charge_end_cycle: null });
    assert.equal(put.status, 200, JSON.stringify(put.json));
    const detail = (await adm(`/products/${product.id}`, "GET")).json;
    const v = detail.versions.find((x: { id: string }) => x.id === versionId);
    const s = v.addons.find((a: { key: string }) => a.key === "setup");
    assert.equal(s.charge_scope, "one_time");
    assert.equal(s.source_task_key, "t1");
    assert.equal(s.effects[0].charge_scope, "per_quantity");
    assert.equal(v.addons.find((a: { key: string }) => a.key === "janela").charge_scope, "recurring");
    // sem escopo informado, o comportamento de sempre (recorrente) é preservado
    const legado = await adm(`/versions/${versionId}/addons`, "POST", { key: "velho", name: "Velho", base_cost: 5 });
    assert.equal(legado.json.charge_scope, "recurring");
    // nova versão copia o escopo
    await publishVersion(versionId, "system", { activate: true, changeSummary: "publicação de teste" });
    const nv = await adm(`/products/${product.id}/versions`, "POST", {});
    assert.ok([200, 201].includes(nv.status), JSON.stringify(nv.json));
    const draft = await prisma.catalog2ProductVersion.findFirstOrThrow({ where: { product_id: product.id, state: "rascunho" }, include: { addons: { include: { effects: true } } } });
    const cp = draft.addons.find((a) => a.key === "setup")!;
    assert.equal(cp.charge_scope, "one_time");
    assert.equal(cp.source_task_key, "t1");
    assert.equal(cp.effects[0].charge_scope, "per_quantity");
    assert.equal(cp.effects[0].charge_quantity, 4);
  });

  it("M16. questionários com os tipos novos: cadastro validado, cópia na tarefa e validação das respostas do cliente", async () => {
    const { versionId, product } = await mkProduct("Questionário", { tasks: [{ key: "t1" }], noPublish: true });
    const types = await adm("/question-types", "GET");
    assert.equal(types.json.data.length, 13, "13 tipos disponíveis");
    const q = await adm("/questionnaires", "POST", { name: "Briefing completo" });
    const qid = q.json.id as string;
    const mk = (body: Record<string, unknown>) => adm(`/questionnaires/${qid}/questions`, "POST", { is_required: false, ...body });
    const created: Record<string, number> = {};
    const cases: [string, Record<string, unknown>][] = [
      ["curto", { question_type: "texto_curto" }], ["longo", { question_type: "texto_longo" }],
      ["num", { question_type: "numero", validation: { min: 1, max: 10 } }], ["valor", { question_type: "moeda", validation: { min: 100 } }],
      ["dia", { question_type: "data" }], ["sn", { question_type: "sim_nao", default_value: "sim" }],
      ["unica", { question_type: "selecao_unica", options: ["A", "B"], default_value: "A" }],
      ["varias", { question_type: "selecao_multipla", options: [{ value: "x", label: "X" }, { value: "y", label: "Y" }] }],
      ["link", { question_type: "url" }], ["mail", { question_type: "email" }], ["fone", { question_type: "telefone" }],
      ["anexo", { question_type: "arquivo", validation: { max_files: 2, max_size_mb: 1 } }], ["ativo", { question_type: "acesso_ativo" }],
    ];
    for (const [key, extra] of cases) {
      const r = await mk({ key, label: `Pergunta ${key}`, help_text: `Ajuda ${key}`, visibility: "client", answer_usage: "both", ...extra });
      assert.equal(r.status, 201, `${key}: ${JSON.stringify(r.json)}`);
      created[key] = 1;
    }
    // cadastro inválido
    assert.equal((await mk({ key: "e1", label: "x", question_type: "selecao_unica", options: ["so uma"] })).json.code, "question_options_required");
    assert.equal((await mk({ key: "e2", label: "x", question_type: "texto_curto", options: ["a", "b"] })).json.code, "question_options_not_allowed");
    assert.equal((await mk({ key: "e3", label: "x", question_type: "numero", default_value: "abc" })).json.code, "question_default_invalid");
    assert.equal((await mk({ key: "e4", label: "x", question_type: "numero", validation: { min: 9, max: 1 } })).json.code, "question_validation_invalid");
    assert.equal((await mk({ key: "e5", label: "x", question_type: "numero", validation: { pattern: "(" } })).json.code, "question_validation_invalid");
    assert.equal((await mk({ key: "e6", label: "x", question_type: "inventado" })).status, 400);
    // pergunta antiga (sem tipo) continua sendo texto longo
    const velha = await mk({ key: "velha", label: "Pergunta antiga" });
    assert.equal(velha.json.question_type, "texto_longo");
    const full = (await adm(`/questionnaires/${qid}`, "GET")).json;
    assert.equal(full.questions.find((x: { key: string }) => x.key === "varias").options.length, 2);
    assert.equal(full.questions.find((x: { key: string }) => x.key === "sn").default_value, "sim");
    await adm(`/questions/${full.questions.find((x: { key: string }) => x.key === "velha").id}`, "DELETE");
    // obrigatórias na hora de enviar
    for (const k of ["num", "link"]) await adm(`/questions/${full.questions.find((x: { key: string }) => x.key === k).id}`, "PUT", { is_required: true });
    const task = await prisma.catalog2Task.findFirstOrThrow({ where: { version_id: versionId } });
    assert.equal((await adm(`/tasks/${task.id}/questionnaire`, "PUT", { questionnaire_id: qid })).status, 200);
    await publishVersion(versionId, "system", { activate: true, changeSummary: "publicação de teste" });
    const { projectId } = await checkoutAndPay(CO_A.token, [(await postQuote(product.id)).json.id]);
    const pt = await prisma.projectTask.findFirstOrThrow({ where: { project_id: projectId } });
    const snap = JSON.parse(pt.briefing_snapshot!) as { question_key: string; type: string; options?: unknown[]; question_type: string }[];
    assert.equal(snap.length, 13);
    assert.equal(snap.find((x) => x.question_key === "curto")!.type, "text_short", "tela antiga continua reconhecendo os tipos clássicos");
    assert.equal(snap.find((x) => x.question_key === "email" || x.question_key === "mail")!.question_type, "email");
    assert.equal(snap.find((x) => x.question_key === "unica")!.options!.length, 2);
    await prisma.projectTask.update({ where: { id: pt.id }, data: { status: "EM_LANCAMENTO" } });
    const put = (answers: { question_key: string; answer?: string; files?: string }[]) =>
      api(`/api/project-tasks/${pt.id}/briefing`, { method: "PUT", token: CO_A.token, body: { answers: answers.map((a) => ({ question_text: a.question_key, ...a })) } });
    const bad: [string, string][] = [["num", "abc"], ["num", "99"], ["valor", "50"], ["dia", "2026-02-31"], ["sn", "talvez"], ["unica", "Z"], ["varias", "[\"x\",\"z\"]"], ["link", "site.com"], ["mail", "nao-e-email"], ["fone", "123"]];
    for (const [k, val] of bad) {
      const r = await put([{ question_key: k, answer: val }]);
      assert.equal(r.status, 422, `${k}="${val}" deveria ser rejeitado: ${JSON.stringify(r.json)}`);
      assert.equal(r.json.errors[0].key, k);
    }
    const tooMany = await put([{ question_key: "anexo", files: JSON.stringify([{ name: "a", size: 1 }, { name: "b", size: 1 }, { name: "c", size: 1 }]) }]);
    assert.equal(tooMany.status, 422);
    assert.equal((await put([{ question_key: "anexo", files: JSON.stringify([{ name: "a", size: 5 * 1024 * 1024 }]) }])).status, 422, "arquivo grande demais");
    assert.equal((await put([{ question_key: "ativo", answer: "id-que-nao-existe" }])).status, 422, "ativo de outra empresa/inexistente");
    const asset = await prisma.clientAsset.create({ data: { company_id: CO_A.companyId, asset_type: "other", label: "Conta de anúncios", status: "validado" } });
    extra.push(async () => { await prisma.clientAsset.deleteMany({ where: { id: asset.id } }); });
    const good = await put([
      { question_key: "num", answer: "5" }, { question_key: "valor", answer: "R$ 1.500,00" }, { question_key: "dia", answer: "2026-10-01" },
      { question_key: "sn", answer: "sim" }, { question_key: "unica", answer: "B" }, { question_key: "varias", answer: "[\"x\",\"y\"]" },
      { question_key: "link", answer: "https://exemplo.com/pagina" }, { question_key: "mail", answer: "a@b.com" }, { question_key: "fone", answer: "(11) 99999-0000" },
      { question_key: "ativo", answer: asset.id }, { question_key: "anexo", files: JSON.stringify([{ name: "logo.png", size: 1000 }]) },
    ]);
    assert.equal(good.status, 200, JSON.stringify(good.json));
    // enviar exige as obrigatórias (num e link)
    await prisma.taskBriefingAnswer.deleteMany({ where: { project_task_id: pt.id, question_key: "link" } });
    const submit = (answers: { question_key: string; answer: string }[]) => api(`/api/project-tasks/${pt.id}/submit-briefing`, { method: "PATCH", token: CO_A.token, body: { answers: answers.map((a) => ({ question_text: a.question_key, ...a })) } });
    const falta = await submit([{ question_key: "curto", answer: "oi" }]);
    assert.equal(falta.status, 422);
    assert.deepEqual(falta.json.errors.map((e: { key: string }) => e.key), ["link"], "só falta a obrigatória ainda não respondida");
    const ok = await submit([{ question_key: "link", answer: "https://exemplo.com" }]);
    assert.equal(ok.status, 200, JSON.stringify(ok.json));
  });
  const aiProfiles: string[] = [];
  extra.push(async () => { await prisma.catalog2AIProfile.deleteMany({ where: { id: { in: aiProfiles } } }); });
  const mkProfile = async (o: Record<string, unknown> = {}) => {
    const r = await adm("/ai-profiles", "POST", { name: `[TESTE] Perfil ${uid()}`, provider: "gemini", model: "gemini-2.5-flash", base_instructions: "Escreva em tom profissional.", unit_cost_input_per_1k: 0.01, unit_cost_output_per_1k: 0.04, ...o });
    assert.equal(r.status, 201, JSON.stringify(r.json));
    aiProfiles.push(r.json.id);
    return r.json as { id: string; prompt_version: number };
  };
  const issuesOf = async (versionId: string) => (await adm(`/versions/${versionId}/validate`, "GET")).json.issues as string[];

  it("X2. perfil de IA: cria, edita, versiona o prompt, testa conexão e execução sem gravar nada, inativa", async () => {
    const prov = await adm("/ai-providers", "GET");
    assert.ok(prov.json.data.find((p: { key: string }) => p.key === "gemini").models.length >= 1);
    assert.equal((await adm("/ai-profiles", "POST", { name: "x", provider: "inventado" })).json.code, "ai_provider_unknown");
    assert.equal((await adm("/ai-profiles", "POST", { name: "x", provider: "gemini", model: "modelo-que-nao-existe" })).json.code, "ai_model_unavailable");
    const p = await mkProfile({ input_format: "Texto livre", output_format: "Até 3 parágrafos", max_tokens_per_run: 4000, max_runs_per_task: 3, on_failure: "retry_once", fallback_human: true, requires_human_review: true });
    assert.equal(p.prompt_version, 1);
    const detail1 = (await adm(`/ai-profiles/${p.id}`, "GET")).json;
    assert.equal(detail1.prompt_versions.length, 1);
    assert.equal(detail1.max_runs_per_task, 3);
    assert.equal(detail1.on_failure, "retry_once");
    // mudar só o nome não cria versão de prompt; mudar a instrução cria
    assert.equal((await adm(`/ai-profiles/${p.id}`, "PUT", { name: "[TESTE] Renomeado" })).json.prompt_version, 1);
    const v2 = await adm(`/ai-profiles/${p.id}`, "PUT", { base_instructions: "Nova instrução, mais objetiva." });
    assert.equal(v2.json.prompt_version, 2);
    const hist = (await adm(`/ai-profiles/${p.id}`, "GET")).json.prompt_versions as { version: number; base_instructions: string }[];
    assert.deepEqual(hist.map((h) => h.version), [2, 1]);
    assert.equal(hist[1].base_instructions, "Escreva em tom profissional.", "a versão antiga do prompt fica guardada");
    // conexão: sem provedor configurado o teste explica; com o adaptador simulado funciona
    resetTaskAIAdapter();
    const semChave = await adm(`/ai-profiles/${p.id}/test-connection`, "POST");
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "CHANGE_ME") {
      assert.equal(semChave.json.ok, false);
      assert.equal(semChave.json.stage, "configuracao");
    }
    const vistos: string[] = [];
    setTaskAIAdapter(async (i) => { vistos.push(i.systemInstruction); return { text: "OK", missing_information: [], promptTokens: 100, completionTokens: 50 }; }, "simulado");
    const conn = await adm(`/ai-profiles/${p.id}/test-connection`, "POST");
    assert.equal(conn.json.ok, true, JSON.stringify(conn.json));
    // execução de teste: devolve saída, tokens e custo, e NÃO grava execução
    const runsBefore = await prisma.projectTaskAIRun.count();
    const test = await adm(`/ai-profiles/${p.id}/test-run`, "POST", { sample_input: "Cliente vende bolo caseiro.", confirm_cost: true });
    assert.equal(test.json.ok, true, JSON.stringify(test.json));
    assert.equal(test.json.persisted, false);
    assert.equal(test.json.output_text, "OK");
    assert.equal(test.json.cost, 0.003, "100×0,01/1000 + 50×0,04/1000");
    assert.ok(vistos.at(-1)!.includes("Nova instrução"), "usa a versão atual do prompt");
    assert.equal(await prisma.projectTaskAIRun.count(), runsBefore, "execução de teste não entra no histórico de execuções");
    // falha do provedor é explicada, não vira erro 500
    setTaskAIAdapter(async () => { throw new Error("quota estourada"); }, "simulado");
    const falha = await adm(`/ai-profiles/${p.id}/test-connection`, "POST");
    assert.equal(falha.json.ok, false);
    assert.match(falha.json.message, /quota/);
    // inativar
    await adm(`/ai-profiles/${p.id}`, "PUT", { is_active: false });
    assert.equal((await adm(`/ai-profiles/${p.id}`, "GET")).json.is_active, false);
    assert.equal((await adm(`/ai-profiles/${p.id}/runs`, "GET")).status, 200);
    resetTaskAIAdapter();
  });

  it("M24. tarefa de IA ou híbrida sem perfil utilizável NÃO publica (perfil, provedor, modelo, instruções, revisão, custo)", async () => {
    resetTaskAIAdapter();
    // sem perfil nenhum
    const a = await mkProduct("IA sem perfil", { tasks: [{ key: "ia1", mode: "ia" }], noPublish: true });
    assert.ok((await issuesOf(a.versionId)).some((m) => /perfil de IA/.test(m)), "sem perfil bloqueia");
    const pub = await adm(`/versions/${a.versionId}/publish`, "POST", {});
    assert.equal(pub.status, 422);
    // perfil inativo
    const inativo = await mkProfile({ is_active: false });
    const b = await mkProduct("IA perfil inativo", { tasks: [{ key: "ia1", mode: "hibrido", ai: { profile_id: inativo.id, mode: "rascunho" } }], noPublish: true });
    assert.ok((await issuesOf(b.versionId)).some((m) => /perfil de IA ativo/.test(m)));
    // provedor sem chave (nenhum adaptador simulado)
    const ok = await mkProfile();
    const c = await mkProduct("IA provedor", { tasks: [{ key: "ia1", mode: "ia", ai: { profile_id: ok.id, mode: "rascunho" } }], noPublish: true });
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "CHANGE_ME") assert.ok((await issuesOf(c.versionId)).some((m) => /não está configurado/.test(m)), "provedor sem chave bloqueia");
    // agora o provedor "responde"; ainda pode faltar custo
    setTaskAIAdapter(async () => ({ text: "x", missing_information: [], promptTokens: 1, completionTokens: 1 }), "simulado");
    const semCusto = await mkProfile({ unit_cost_input_per_1k: null, unit_cost_output_per_1k: null });
    const d = await mkProduct("IA sem custo", { tasks: [{ key: "ia1", mode: "ia", ai: { profile_id: semCusto.id, mode: "rascunho" } }], noPublish: true });
    assert.ok((await issuesOf(d.versionId)).some((m) => /custo da IA não pode ser calculado/.test(m)), "custo indeterminado bloqueia");
    // sem instruções em lugar nenhum
    const semInstr = await mkProfile({ base_instructions: null });
    const e = await mkProduct("IA sem instruções", { tasks: [{ key: "ia1", mode: "ia", ai: { profile_id: semInstr.id, mode: "rascunho" } }], noPublish: true });
    await prisma.catalog2TaskAI.updateMany({ where: { task: { version_id: e.versionId } }, data: { instructions: null } });
    assert.ok((await issuesOf(e.versionId)).some((m) => /precisa de instruções/.test(m)));
    // perfil exige revisão humana e a tarefa não configura
    const f = await mkProduct("IA sem revisão", { tasks: [{ key: "ia1", mode: "ia", ai: { profile_id: ok.id, mode: "rascunho" } }], noPublish: true });
    await prisma.catalog2TaskAI.updateMany({ where: { task: { version_id: f.versionId } }, data: { human_review_required: false } });
    assert.ok((await issuesOf(f.versionId)).some((m) => /exige revisão humana/.test(m)));
    resetTaskAIAdapter();
  });

  it("M25. tarefa de IA com perfil válido publica", async () => {
    setTaskAIAdapter(async () => ({ text: "x", missing_information: [], promptTokens: 1, completionTokens: 1 }), "simulado");
    const ok = await mkProfile();
    const a = await mkProduct("IA válida", { tasks: [{ key: "ia1", mode: "ia", ai: { profile_id: ok.id, mode: "rascunho" } }, { key: "h1" }], noPublish: true });
    assert.deepEqual(await issuesOf(a.versionId), []);
    const pub = await adm(`/versions/${a.versionId}/publish`, "POST", { client_action_id: crypto.randomUUID() });
    assert.equal(pub.status, 200, JSON.stringify(pub.json));
    assert.equal(pub.json.activated, false);
    resetTaskAIAdapter();
  });
  it("M17. modelos por ID: buscar por ID/nome/especialidade, reutilizar sem duplicar, alertar nomes parecidos e confirmar antes de criar novo ou alterar o modelo global", async () => {
    const spec = await prisma.catalog2Specialty.findFirstOrThrow({ where: { key: "designer" } });
    const { versionId, product } = await mkProduct("Modelos por ID", { tasks: [{ key: "base" }], noPublish: true });
    const mkTask = (body: Record<string, unknown>) => adm(`/versions/${versionId}/tasks`, "POST", { estimated_minutes: 60, specialty_id: spec.id, ...body });
    // 1ª criação: nenhum modelo parecido → cria modelo novo (ID novo)
    const nome = `Relatório quinzenal de resultados ${uid()}`;
    const t1 = await mkTask({ name: nome });
    assert.equal(t1.status, 201, JSON.stringify(t1.json));
    const modelId = t1.json.task_model_id as number;
    assert.ok(modelId > 0);
    // tentar criar de novo com nome igual ou parecido: o sistema avisa e mostra o modelo existente
    const dup = await mkTask({ name: nome, key: "dup" });
    assert.equal(dup.status, 409);
    assert.equal(dup.json.code, "duplicate_model_candidates");
    assert.equal(dup.json.details.candidates[0].id, modelId);
    assert.equal(dup.json.details.candidates[0].label, `Modelo de tarefa #${modelId}`);
    const parecido = await mkTask({ name: `relatorio quinzenal de resultado ${nome.slice(-8)}`, key: "par" });
    assert.equal(parecido.status, 409, "nome parecido (sem acento, plural) também avisa");
    assert.equal((await prisma.catalog2TaskModel.count({ where: { name: nome } })), 1, "nada foi criado por descuido");
    // a tela consulta os parecidos antes de criar
    const sim = await adm(`/task-models/similar?name=${encodeURIComponent(nome)}`, "GET");
    assert.equal(sim.json.data[0].id, modelId);
    assert.equal(sim.json.data[0].match.includes("nome"), true);
    // confirmou que quer mesmo um novo: cria outro modelo, com ID diferente
    const novo = await mkTask({ name: nome, key: "novo", duplicate_resolution: "create_anyway", duplicate_justification: "variante intencional para o teste" });
    assert.equal(novo.status, 201, JSON.stringify(novo.json));
    assert.notEqual(novo.json.task_model_id, modelId);
    // nome realmente diferente não é barrado
    assert.equal((await mkTask({ name: `Criação de banner ${uid()}`, key: "banner" })).status, 201);
    // selecionar modelo existente por ID reaproveita o MESMO modelo (não cria outro)
    const before = await prisma.catalog2TaskModel.count();
    const usado = await adm(`/versions/${versionId}/tasks/from-model`, "POST", { model_id: modelId });
    assert.equal(usado.status, 201, JSON.stringify(usado.json));
    assert.equal(usado.json.task_model_id, modelId);
    assert.equal(await prisma.catalog2TaskModel.count(), before, "reaproveitar não cria modelo");
    // busca: por #ID, por ID puro, por nome, por especialidade, status e ciclo
    const byHash = await adm(`/task-models?q=${encodeURIComponent(`#${modelId}`)}`, "GET");
    assert.ok(byHash.json.data.some((m: { id: number }) => m.id === modelId));
    const byName = await adm(`/task-models?q=${encodeURIComponent("quinzenal")}&specialty_id=${spec.id}&execution_mode=humano&cycle_type=recorrente&status=active`, "GET");
    const row = byName.json.data.find((m: { id: number }) => m.id === modelId);
    assert.ok(row);
    assert.equal(row.label, `Modelo de tarefa #${modelId}`);
    assert.equal(row.product_count, 1);
    assert.equal(row.usage_count, 2, "usado 2 vezes neste produto (1ª criação + reaproveitado)");
    assert.equal(row.revision, 1);
    assert.ok(typeof row.step_count === "number");
    // alterar SÓ este produto é o padrão e não mexe no modelo global
    const taskRow = await prisma.catalog2Task.findFirstOrThrow({ where: { version_id: versionId, task_model_id: modelId } });
    const soAqui = await adm(`/tasks/${taskRow.id}`, "PUT", { estimated_minutes: 45 });
    assert.equal(soAqui.status, 200, JSON.stringify(soAqui.json));
    assert.equal((await prisma.catalog2TaskModel.findUniqueOrThrow({ where: { id: modelId } })).estimated_minutes, 60, "modelo global intacto");
    // alterar o MODELO exige confirmação clara
    const semConfirmar = await adm(`/tasks/${taskRow.id}`, "PUT", { estimated_minutes: 30, scope: "model" });
    assert.equal(semConfirmar.status, 422);
    assert.equal(semConfirmar.json.code, "model_update_not_confirmed");
    assert.match(semConfirmar.json.error, /1 produto/);
    assert.equal((await prisma.catalog2TaskModel.findUniqueOrThrow({ where: { id: modelId } })).estimated_minutes, 60);
    const confirmado = await adm(`/tasks/${taskRow.id}`, "PUT", { estimated_minutes: 30, scope: "model", confirm_model_update: true });
    assert.equal(confirmado.status, 200, JSON.stringify(confirmado.json));
    const m = await prisma.catalog2TaskModel.findUniqueOrThrow({ where: { id: modelId } });
    assert.equal(m.estimated_minutes, 30);
    assert.equal(m.revision, 2);
    // modelo inativo não pode ser escolhido
    await adm(`/task-models/${modelId}/active`, "PATCH", { is_active: false });
    assert.equal((await adm(`/versions/${versionId}/tasks/from-model`, "POST", { model_id: modelId })).json.code, "model_inactive");
    // etapas: mesmo comportamento
    const tk = await prisma.catalog2Task.findFirstOrThrow({ where: { version_id: versionId } });
    const etapa = `Aprovar roteiro com o cliente ${uid()}`;
    const e1 = await adm(`/tasks/${tk.id}/steps`, "POST", { name: etapa, specialty_id: spec.id, estimated_minutes: 20 });
    assert.equal(e1.status, 201, JSON.stringify(e1.json));
    const e2 = await adm(`/tasks/${tk.id}/steps`, "POST", { name: etapa, specialty_id: spec.id, estimated_minutes: 20 });
    assert.equal(e2.status, 409);
    assert.equal(e2.json.code, "duplicate_model_candidates");
    assert.match(e2.json.details.candidates[0].label, /^Modelo de etapa #\d+$/);
    const reuse = await adm(`/tasks/${tk.id}/steps/from-model`, "POST", { step_model_id: e2.json.details.candidates[0].id });
    assert.equal(reuse.status, 201, JSON.stringify(reuse.json));
    assert.equal(reuse.json.step_model_id, e2.json.details.candidates[0].id);
    void product;
  });
  it("X3. integridade: classificação nunca é apagada por omissão; ciclo, auto-dependência, modelo inativo, cobrança órfã e prazo indeterminado bloqueiam a publicação", async () => {
    const { product, versionId } = await mkProduct("Integridade", { tasks: [{ key: "a" }, { key: "b" }, { key: "c" }], noPublish: true });
    const before = await prisma.catalog2Product.findUniqueOrThrow({ where: { id: product.id }, include: { four_f: true } });
    assert.ok(before.pillar_id && before.category_id);
    // PUT sem pilar/categoria: NÃO apaga
    const put = await adm(`/products/${product.id}/classifications`, "PUT", { four_f_ids: before.four_f.map((f) => f.four_f_id) });
    assert.equal(put.status, 200, JSON.stringify(put.json));
    let after = await prisma.catalog2Product.findUniqueOrThrow({ where: { id: product.id } });
    assert.equal(after.pillar_id, before.pillar_id);
    assert.equal(after.category_id, before.category_id);
    assert.deepEqual(put.json.changed, { pillar: false, category: false, four_f: true });
    // PATCH só da categoria: pilar intacto
    const novaCat = await prisma.catalog2Category.findFirstOrThrow({ where: { id: { not: before.category_id! } } });
    assert.equal((await adm(`/products/${product.id}/classifications`, "PATCH", { category_id: novaCat.id })).status, 200);
    after = await prisma.catalog2Product.findUniqueOrThrow({ where: { id: product.id } });
    assert.equal(after.pillar_id, before.pillar_id);
    assert.equal(after.category_id, novaCat.id);
    // limpar de propósito (null explícito) continua possível
    assert.equal((await adm(`/products/${product.id}/classifications`, "PATCH", { category_id: null })).status, 200);
    assert.equal((await prisma.catalog2Product.findUniqueOrThrow({ where: { id: product.id } })).category_id, null);
    await adm(`/products/${product.id}/classifications`, "PATCH", { category_id: before.category_id });
    // ids que não existem são recusados
    assert.equal((await adm(`/products/${product.id}/classifications`, "PATCH", { pillar_id: "nao-existe" })).json.code, "pillar_not_found");
    assert.equal((await adm(`/products/${product.id}/classifications`, "PATCH", { four_f_ids: ["nao-existe"] })).json.code, "four_f_not_found");
    assert.equal((await prisma.catalog2Product.findUniqueOrThrow({ where: { id: product.id } })).pillar_id, before.pillar_id, "recusado = nada mudou");

    const tk = Object.fromEntries((await prisma.catalog2Task.findMany({ where: { version_id: versionId } })).map((t) => [t.key, t]));
    const issues = async () => (await adm(`/versions/${versionId}/validate`, "GET")).json.issues as string[];
    assert.deepEqual(await issues(), [], "versão íntegra");
    // auto-dependência e ciclo (A→B→C→A) recusados na API
    assert.equal((await adm(`/tasks/${tk.a.id}/dependencies`, "POST", { depends_on_task_id: tk.a.id })).json.code, "self_dependency");
    assert.equal((await adm(`/tasks/${tk.a.id}/dependencies`, "POST", { depends_on_task_id: tk.b.id })).status, 201);
    assert.equal((await adm(`/tasks/${tk.b.id}/dependencies`, "POST", { depends_on_task_id: tk.c.id })).status, 201);
    assert.equal((await adm(`/tasks/${tk.c.id}/dependencies`, "POST", { depends_on_task_id: tk.a.id })).json.code, "dependency_cycle");
    // se um ciclo entrar por outro caminho (dado importado), a publicação barra
    await prisma.catalog2TaskDependency.create({ data: { task_id: tk.c.id, depends_on_task_id: tk.a.id } });
    assert.ok((await issues()).some((m) => /Dependência circular/.test(m)));
    assert.equal((await adm(`/versions/${versionId}/publish`, "POST", {})).status, 422);
    await prisma.catalog2TaskDependency.deleteMany({ where: { task_id: tk.c.id } });
    // modelo global inativo em uso
    const modelId = tk.a.task_model_id;
    if (modelId != null) {
      await prisma.catalog2TaskModel.update({ where: { id: modelId }, data: { is_active: false } });
      assert.ok((await issues()).some((m) => /modelo Tarefa #\d+, que está inativo/.test(m)));
      await prisma.catalog2TaskModel.update({ where: { id: modelId }, data: { is_active: true } });
    }
    // cobrança apontando para tarefa que não existe
    const ad = await prisma.catalog2Addon.create({ data: { version_id: versionId, key: "orfao", name: "Órfão", base_cost: 5, source_task_key: "fantasma" } });
    assert.ok((await issues()).some((m) => /aponta para a tarefa "fantasma"/.test(m)));
    await prisma.catalog2Addon.delete({ where: { id: ad.id } });
    // prazo indeterminado
    await prisma.catalog2Task.updateMany({ where: { version_id: versionId }, data: { estimated_minutes: null } });
    await prisma.catalog2TaskStep.updateMany({ where: { task: { version_id: versionId } }, data: { estimated_minutes: null } });
    assert.ok((await issues()).length > 0, "sem horas estimadas não publica");
    await prisma.catalog2Task.updateMany({ where: { version_id: versionId }, data: { estimated_minutes: 60 } });
    await prisma.catalog2TaskStep.updateMany({ where: { task: { version_id: versionId } }, data: { estimated_minutes: 60 } });
    assert.deepEqual(await issues(), []);
  });

  it("X4. dependência: liberação manual só por líder/admin, com justificativa e histórico; a tela vê o que bloqueia e por quê", async () => {
    const { product, versionId } = await mkProduct("Liberação manual", { tasks: [{ key: "arte" }, { key: "publicar" }] });
    const arte = await prisma.catalog2Task.findFirstOrThrow({ where: { version_id: versionId, key: "arte" } });
    await prisma.catalog2TaskDeliverable.create({ data: { task_id: arte.id, key: "arte-final", name: "Arte final", type: "link", responsible: "executor" } });
    const rule = await api(`/api/admin/catalog2/products/${product.id}/prerequisites`, { method: "POST", token: ADMIN.token, body: { dependent_task_key: "publicar", target_kind: "deliverable", target_product_id: product.id, target_task_key: "arte", target_deliverable_key: "arte-final", behavior: "block_start" } });
    assert.equal(rule.status, 201, JSON.stringify(rule.json));
    const { projectId } = await checkoutAndPay(CO_A.token, [(await postQuote(product.id)).json.id]);
    const t = byKey(await tasksOf(projectId));
    assert.equal(t["publicar"].status, "PENDENTE_DE_LIBERACAO");
    const deps = await api(`/api/project-tasks/${t["publicar"].id}/dependencies`, { token: tokenFor(ADMIN.user) });
    assert.equal(deps.json.blocked, true);
    assert.equal(deps.json.auto_update, true);
    assert.equal(deps.json.can_release, true);
    const r0 = deps.json.rules[0];
    assert.equal(r0.blocks, "o início da tarefa");
    assert.equal(r0.expected_deliverable, "arte-final");
    assert.equal(r0.target_task.title.length > 0, true);
    assert.equal(r0.state, "bloqueada");
    assert.equal(r0.can_release, true);
    // o cliente vê só o essencial (sem detalhes internos)
    const cli = await api(`/api/project-tasks/${t["publicar"].id}/dependencies`, { token: CO_A.token });
    assert.equal(cli.json.rules[0].origin, undefined);
    const release = (token: string, reason?: string) => api(`/api/project-tasks/${t["publicar"].id}/dependencies/${r0.ruleId}/release`, { method: "POST", token, body: { reason } });
    assert.equal((await release(CO_A.token, "Pode liberar, combinado com o cliente.")).status >= 400, true, "cliente não libera");
    assert.equal((await release(tokenFor(ADMIN.user))).json.code, "release_reason_required", "sem justificativa não libera");
    assert.equal((await release(tokenFor(ADMIN.user), "curto")).status, 422);
    const ok = await release(tokenFor(ADMIN.user), "Arte aprovada por fora, em reunião com o cliente.");
    assert.equal(ok.status, 200, JSON.stringify(ok.json));
    assert.equal((await release(tokenFor(ADMIN.user), "Tentando liberar de novo pela segunda vez.")).status, 409);
    await reevaluateProjectDependencies(prisma, projectId);
    assert.notEqual((await prisma.projectTask.findUniqueOrThrow({ where: { id: t["publicar"].id } })).status, "PENDENTE_DE_LIBERACAO", "liberada à mão, a tarefa segue");
    const after = await api(`/api/project-tasks/${t["publicar"].id}/dependencies`, { token: tokenFor(ADMIN.user) });
    assert.equal(after.json.blocked, false);
    assert.equal(after.json.rules[0].released.reason, "Arte aprovada por fora, em reunião com o cliente.");
    assert.ok(after.json.rules[0].released.by, "quem liberou fica registrado");
    // a regra NÃO some: continua ali, marcada como liberada manualmente, e há registro no histórico do projeto
    assert.equal(await prisma.projectDependencyRule.count({ where: { task_id: t["publicar"].id } }), 1);
    const log = await prisma.projectDecisionLog.findFirst({ where: { project_id: projectId, kind: "dependency_released_manually" } });
    assert.ok(log);
    assert.match(log!.message, /Arte aprovada por fora/);
  });
  it("M27. rejeição e retrabalho: revisão técnica → qualificação do líder → aprovação do cliente → conclusão; cada rejeição volta ao passo certo, guarda o motivo, não conclui, não libera dependência e não cobra de novo", async () => {
    const { product, versionId } = await mkProduct("Fluxo de aceite", { tasks: [{ key: "peca", review: true }, { key: "depois" }], noPublish: true });
    await prisma.catalog2Task.updateMany({ where: { version_id: versionId, key: "peca" }, data: { requires_qualification: true, requires_client_approval: true } });
    await publishVersion(versionId, "system", { activate: true, changeSummary: "publicação de teste" });
    const rule = await api(`/api/admin/catalog2/products/${product.id}/prerequisites`, { method: "POST", token: ADMIN.token, body: { dependent_task_key: "depois", target_kind: "client_approval", target_product_id: product.id, target_task_key: "peca", behavior: "block_start" } });
    assert.equal(rule.status, 201, JSON.stringify(rule.json));
    const { projectId } = await checkoutAndPay(CO_A.token, [(await postQuote(product.id)).json.id]);
    const payments = await prisma.payment.count({ where: { project_id: projectId } });
    const t = byKey(await tasksOf(projectId));
    const peca = t["peca"];
    const status = async () => (await prisma.projectTask.findUniqueOrThrow({ where: { id: peca.id } })).status;
    const depoisPendente = async () => (await prisma.projectTask.findUniqueOrThrow({ where: { id: t["depois"].id } })).status === "PENDENTE_DE_LIBERACAO";
    const admin = tokenFor(ADMIN.user);
    assert.equal(await depoisPendente(), true);

    // 1) execução → entrega → REVISÃO TÉCNICA
    await leaderExecutes(peca.id, LEADER.id);
    assert.equal(await status(), "AGUARDANDO_REVISAO");
    // a revisão precisa de motivo para reprovar e cliente nenhum mexe nela
    assert.equal((await api(`/api/project-tasks/${peca.id}/revisao`, { method: "POST", token: CO_A.token, body: { decisao: "aprovar" } })).status, 403);
    assert.equal((await api(`/api/project-tasks/${peca.id}/revisao`, { method: "POST", token: admin, body: { decisao: "reprovar" } })).status >= 400, true, "sem motivo não reprova");
    const rev1 = await api(`/api/project-tasks/${peca.id}/revisao`, { method: "POST", token: admin, body: { decisao: "reprovar", comentario: "Faltou o rodapé padrão." } });
    assert.equal(rev1.status, 200, JSON.stringify(rev1.json));
    assert.equal(rev1.json.status, "EM_AJUSTES", "revisão reprovada volta ao executor");
    assert.equal(await depoisPendente(), true, "rejeição não libera dependência");
    // 2) refaz → nova revisão → aprova → QUALIFICAÇÃO do líder
    await leaderExecutes(peca.id, LEADER.id);
    assert.equal(await status(), "AGUARDANDO_REVISAO");
    const rev2 = await api(`/api/project-tasks/${peca.id}/revisao`, { method: "POST", token: admin, body: { decisao: "aprovar", comentario: "Ok tecnicamente." } });
    assert.equal(rev2.json.proximo, "qualificacao");
    assert.equal(await status(), "AGUARDANDO_QUALIFICACAO");
    const qualOutro = await api(`/api/project-tasks/${peca.id}/qualificacao`, { method: "POST", token: CO_A.token, body: { decisao: "aprovar" } });
    assert.equal(qualOutro.status, 403, "qualificação é do líder/administração, nunca do cliente");
    // qualificação reprova → volta ao executor (não conta como alteração do cliente)
    const q1 = await api(`/api/project-tasks/${peca.id}/qualificacao`, { method: "POST", token: admin, body: { decisao: "reprovar", comentario: "Não atende ao briefing." } });
    assert.equal(q1.status, 200, JSON.stringify(q1.json));
    assert.equal(await status(), "EM_AJUSTES");
    assert.equal((await prisma.projectTask.findUniqueOrThrow({ where: { id: peca.id } })).reprovacoes, 0, "ajuste interno não gasta as alterações do cliente");
    assert.equal(await depoisPendente(), true);
    // 3) refaz → revisão aprova → qualificação aprova → APROVAÇÃO do cliente
    await leaderExecutes(peca.id, LEADER.id);
    await api(`/api/project-tasks/${peca.id}/revisao`, { method: "POST", token: admin, body: { decisao: "aprovar" } });
    assert.equal((await api(`/api/project-tasks/${peca.id}/qualificacao`, { method: "POST", token: admin, body: { decisao: "aprovar", comentario: "Qualificada." } })).status, 200);
    assert.equal(await status(), "EM_APROVACAO");
    assert.equal(await depoisPendente(), true, "qualificada ainda não libera: falta o cliente");
    // cliente REPROVA com motivo → volta para ajustes e fica registrado
    assert.equal((await api(`/api/project-tasks/${peca.id}/aprovar`, { method: "PATCH", token: admin, body: { nivel: "agencia" } })).status, 200);
    const rej = await api(`/api/project-tasks/${peca.id}/reprovar`, { method: "PATCH", token: CO_A.token, body: { motivo: "Trocar a cor do título." } });
    assert.equal(rej.status, 200, JSON.stringify(rej.json));
    assert.notEqual(await status(), "CONCLUIDA");
    assert.equal(await depoisPendente(), true, "rejeição do cliente não libera a dependência");
    assert.equal((await prisma.projectTask.findUniqueOrThrow({ where: { id: peca.id } })).reprovacoes, 1, "a reprovação do cliente conta como alteração dele");
    // 4) retrabalho completo: a entrega volta por TODO o fluxo (nova rodada de revisão e qualificação)
    await leaderExecutes(peca.id, LEADER.id);
    assert.equal(await status(), "AGUARDANDO_REVISAO");
    await api(`/api/project-tasks/${peca.id}/revisao`, { method: "POST", token: admin, body: { decisao: "aprovar" } });
    await api(`/api/project-tasks/${peca.id}/qualificacao`, { method: "POST", token: admin, body: { decisao: "aprovar" } });
    assert.equal((await api(`/api/project-tasks/${peca.id}/aprovar`, { method: "PATCH", token: admin, body: { nivel: "agencia" } })).status, 200);
    assert.equal((await api(`/api/project-tasks/${peca.id}/aprovar`, { method: "PATCH", token: CO_A.token, body: {} })).status, 200);
    assert.equal(await status(), "CONCLUIDA", "só agora conclui");
    await reevaluateProjectDependencies(prisma, projectId);
    assert.equal(await depoisPendente(), false, "concluída e aprovada pelo cliente, a dependência libera");
    // histórico completo e sem cobrança duplicada
    const reviews = (await api(`/api/project-tasks/${peca.id}/revisao`, { token: admin })).json.historico as { decision: string; comment: string | null }[];
    assert.ok(reviews.some((r) => r.decision === "reprovada" && r.comment === "Faltou o rodapé padrão."));
    assert.ok(reviews.filter((r) => r.decision === "aprovada").length >= 3);
    const quals = (await api(`/api/project-tasks/${peca.id}/qualificacao`, { token: admin })).json.historico as { decision: string; comment: string | null }[];
    assert.ok(quals.some((r) => r.decision === "reprovada" && r.comment === "Não atende ao briefing."));
    assert.equal(await prisma.payment.count({ where: { project_id: projectId } }), payments, "nenhuma cobrança nova por causa dos retrabalhos");
  });
  it("X5. entregável estruturado: versão, histórico de substituições, motivo de rejeição, tarefa produtora, consumidora e bloqueio do obrigatório", async () => {
    const { product, versionId } = await mkProduct("Entregável", { tasks: [{ key: "arte" }, { key: "publicar" }], noPublish: true });
    const arte = await prisma.catalog2Task.findFirstOrThrow({ where: { version_id: versionId, key: "arte" } });
    const step = await prisma.catalog2TaskStep.findFirstOrThrow({ where: { task_id: arte.id } });
    await prisma.catalog2TaskDeliverable.create({ data: { task_id: arte.id, step_id: step.id, key: "arte-final", name: "Arte final", type: "link", responsible: "executor", is_required: true } });
    await publishVersion(versionId, "system", { activate: true, changeSummary: "publicação de teste" });
    await api(`/api/admin/catalog2/products/${product.id}/prerequisites`, { method: "POST", token: ADMIN.token, body: { dependent_task_key: "publicar", target_kind: "deliverable", target_product_id: product.id, target_task_key: "arte", target_deliverable_key: "arte-final", behavior: "block_start" } });
    const { projectId } = await checkoutAndPay(CO_A.token, [(await postQuote(product.id)).json.id]);
    const t = byKey(await tasksOf(projectId));
    await prisma.projectTask.update({ where: { id: t["arte"].id }, data: { lider_responsavel_id: LEADER.id } });
    const leader = tokenFor(LEADER);
    const admin = tokenFor(ADMIN.user);
    const list = async (token = admin) => (await api(`/api/project-tasks/${t["arte"].id}/deliverables`, { token })).json;
    let item = (await list()).data?.[0] ?? (await list())[0];
    assert.ok(item, "o item nasce com a tarefa");
    assert.equal(item.version, 1);
    assert.equal(item.status, "pendente");
    // obrigatório bloqueia a conclusão da etapa
    const stage = await prisma.projectTaskStage.findFirstOrThrow({ where: { project_task_id: t["arte"].id }, orderBy: { ordem: "asc" } });
    await prisma.projectTask.update({ where: { id: t["arte"].id }, data: { status: "EM_EXECUCAO" } });
    await prisma.projectTaskStage.update({ where: { id: stage.id }, data: { status: "EM_ANDAMENTO", executor_type: "leader", lider_id: LEADER.id } });
    await assert.rejects(() => concluirEtapa(prisma, stage.id, { userId: LEADER.id }), /Arte final/, "sem o entregável obrigatório a etapa não conclui");
    // 1ª entrega
    assert.equal((await api(`/api/project-tasks/${t["arte"].id}/deliverables/${item.id}/submit`, { method: "POST", token: leader, body: { content_url: "https://drive.example/v1.png" } })).status, 200);
    item = (await list()).data?.[0] ?? (await list())[0];
    assert.equal(item.version, 1, "primeira entrega continua na versão 1");
    assert.equal(item.history.length, 0);
    assert.equal(item.producer_task.key, "arte");
    assert.equal(item.producer_stage.id, stage.id);
    assert.equal(item.consumers.length, 1);
    assert.equal(item.consumers[0].task_id, t["publicar"].id, "quem consome o item aparece");
    assert.ok(item.submitted_by_name);
    // rejeição com motivo
    assert.equal((await api(`/api/project-tasks/${t["arte"].id}/deliverables/${item.id}/review`, { method: "POST", token: admin, body: { decisao: "reprovar" } })).status >= 400, true, "rejeitar sem motivo não vale");
    assert.equal((await api(`/api/project-tasks/${t["arte"].id}/deliverables/${item.id}/review`, { method: "POST", token: admin, body: { decisao: "reprovar", comentario: "Logo cortada." } })).status, 200);
    item = (await list()).data?.[0] ?? (await list())[0];
    assert.equal(item.status, "reprovado");
    assert.equal(item.rejection_reason, "Logo cortada.");
    // substituição: a versão 1 vai para o histórico e a nova é a versão 2
    assert.equal((await api(`/api/project-tasks/${t["arte"].id}/deliverables/${item.id}/submit`, { method: "POST", token: leader, body: { content_url: "https://drive.example/v2.png" } })).status, 200);
    item = (await list()).data?.[0] ?? (await list())[0];
    assert.equal(item.version, 2);
    assert.equal(item.content_url, "https://drive.example/v2.png");
    assert.equal(item.history.length, 1);
    assert.equal(item.history[0].version, 1);
    assert.equal(item.history[0].content_url, "https://drive.example/v1.png", "a versão antiga nunca se perde");
    assert.equal(item.history[0].review_comment, "Logo cortada.");
    assert.equal(item.history[0].status, "reprovado");
    assert.equal(item.rejection_reason, null, "a versão nova começa sem rejeição");
    // aprovação
    assert.equal((await api(`/api/project-tasks/${t["arte"].id}/deliverables/${item.id}/review`, { method: "POST", token: admin, body: { decisao: "aprovar" } })).status, 200);
    item = (await list()).data?.[0] ?? (await list())[0];
    assert.equal(item.approved, true);
    assert.ok(item.approved_at);
    assert.ok(item.reviewed_by_name);
    // o cliente não vê histórico interno nem consumidores
    const cli = await list(CO_A.token);
    const cItem = cli.data?.[0] ?? cli[0];
    if (cItem) { assert.deepEqual(cItem.history, []); assert.deepEqual(cItem.consumers, []); }
    // versão única no banco: duas linhas de histórico não duplicam o registro principal
    assert.equal(await prisma.projectTaskDeliverable.count({ where: { project_task_id: t["arte"].id } }), 1);
    assert.equal(await prisma.projectTaskDeliverableVersion.count({ where: { deliverable_id: item.id } }), 1);
  });
  const publishRaw = (versionId: string, body: Record<string, unknown> = {}) => api(`/api/admin/catalog2/versions/${versionId}/publish`, { method: "POST", token: ADMIN.token, body });
  const codesOf = (r: { json: any }) => (r.json?.details?.issue_details ?? []).map((d: { code?: string }) => d.code);

  it("X6. publicar bloqueia custo, preço e prazo indefinidos — com erro estruturado e sem escape por `force`", async () => {
    const spec = await prisma.catalog2Specialty.findFirstOrThrow({ where: { key: "designer" } });
    const { versionId } = await mkProduct("Preço indefinido", { tasks: [{ key: "t1" }], noPublish: true });
    // 1) valor/hora da especialidade ausente → custo humano indeterminado
    await prisma.catalog2Specialty.update({ where: { id: spec.id }, data: { max_hourly_rate: null } });
    try {
      const r = await publishRaw(versionId);
      assert.equal(r.status, 422);
      assert.equal(r.json.code, "validation_failed");
      assert.ok(Array.isArray(r.json.details.issues) && r.json.details.issues.length >= 1, "cada pendência vem listada");
      assert.ok(r.json.details.issues.some((m: string) => /valor\/hora/i.test(m)), JSON.stringify(r.json.details.issues));
      assert.ok(codesOf(r).includes("pricing_pending"));
      // `force` nunca ignora preço/prazo indefinido
      const forced = await publishRaw(versionId, { force: true });
      assert.equal(forced.status, 422);
      assert.equal(forced.json.code, "validation_force_not_allowed");
      assert.equal((await prisma.catalog2ProductVersion.findUniqueOrThrow({ where: { id: versionId } })).state, "rascunho");
      const val = (await adm(`/versions/${versionId}/validate`, "GET")).json;
      assert.equal(val.force_allowed, false);
      assert.equal(val.ok, false);
    } finally {
      await prisma.catalog2Specialty.update({ where: { id: spec.id }, data: { max_hourly_rate: 100 } });
    }
    // 2) prazo comercial base indefinido
    await prisma.catalog2ProductVersion.update({ where: { id: versionId }, data: { base_commercial_deadline_days: null } });
    const semPrazo = await publishRaw(versionId);
    assert.equal(semPrazo.status, 422);
    assert.ok(codesOf(semPrazo).includes("deadline_undefined"), JSON.stringify(semPrazo.json.details));
    await prisma.catalog2ProductVersion.update({ where: { id: versionId }, data: { base_commercial_deadline_days: 5 } });
    // 3) nenhuma modalidade habilitada
    await prisma.catalog2ProductVersion.update({ where: { id: versionId }, data: { accepts_one_time: false, accepts_recurring: false } });
    const semModalidade = await publishRaw(versionId);
    assert.equal(semModalidade.status, 422);
    assert.ok(semModalidade.json.details.issues.some((m: string) => /modalidade/i.test(m)));
    await prisma.catalog2ProductVersion.update({ where: { id: versionId }, data: { accepts_one_time: true } });
    // 4) etapa sem tempo
    await prisma.catalog2TaskStep.updateMany({ where: { task: { version_id: versionId } }, data: { estimated_minutes: null } });
    const semTempo = await publishRaw(versionId);
    assert.equal(semTempo.status, 422);
    assert.ok(semTempo.json.details.issues.some((m: string) => /especialidade e horas/i.test(m)));
    await prisma.catalog2TaskStep.updateMany({ where: { task: { version_id: versionId } }, data: { estimated_minutes: 60 } });
    // 5) percentuais comerciais indefinidos (preço não calculável)
    await prisma.catalog2PricingSettings.update({ where: { id: "default" }, data: { profit_margin_percent: null } });
    try {
      const semPreco = await publishRaw(versionId);
      assert.equal(semPreco.status, 422, JSON.stringify(semPreco.json));
      assert.ok(semPreco.json.details.issues.some((m: string) => /percentual|preço/i.test(m)));
    } finally { await setPricingSettings(); }
    // 6) tudo definido → publica (modo calculado)
    const ok = await publishRaw(versionId);
    assert.equal(ok.status, 200, JSON.stringify(ok.json));
  });

  it("X7. pricing_mode: preço fixo exige preço e prazo; sob consulta publica sem preço público mas nunca gera cotação nem contratação", async () => {
    // preço fixo
    const a = await mkProduct("Preço fixo", { tasks: [{ key: "t1" }], noPublish: true });
    await adminPut(a.versionId, { pricing_mode: "manual_fixed" });
    const sem = await publishRaw(a.versionId);
    assert.equal(sem.status, 422);
    assert.ok(codesOf(sem).includes("manual_price_missing") && codesOf(sem).includes("manual_deadline_missing"));
    assert.equal((await adminPut(a.versionId, { pricing_mode: "manual_fixed", manual_price: -5 })).status, 400, "preço negativo é recusado");
    assert.equal((await adminPut(a.versionId, { pricing_mode: "inventado" })).status, 400);
    assert.equal((await adminPut(a.versionId, { manual_price: 1500, manual_deadline_days: 12 })).status, 200);
    const sim = (await simulate(a.versionId)).pricing;
    assert.equal(sim.pricing_mode, "manual_fixed");
    assert.equal(sim.lines.commercial_final_price.amount, 1500);
    assert.equal(sim.split.first_charge, 1500);
    assert.equal(sim.deadline.commercial_deadline_days, 12);
    assert.equal((await publishRaw(a.versionId, { activate: true, confirm_activation: true })).status, 200);
    const q = await postQuote(a.product.id);
    assert.equal(q.status, 201, JSON.stringify(q.json));
    assert.equal(q.json.commercial_price, 1500, "o cliente paga o preço fixo informado");
    assert.equal(q.json.commercial_deadline_days, 12);
    // sob consulta
    const b = await mkProduct("Sob consulta", { tasks: [{ key: "t1" }], noPublish: true });
    await adminPut(b.versionId, { pricing_mode: "on_request" });
    await prisma.catalog2Specialty.updateMany({ where: { key: "designer" }, data: { max_hourly_rate: null } });
    try {
      const pub = await publishRaw(b.versionId, { activate: true, confirm_activation: true });
      assert.equal(pub.status, 200, "sob consulta publica mesmo sem preço calculável: " + JSON.stringify(pub.json));
      const view = (await api(`/api/catalog2/products/${b.product.id}`, { token: CO_A.token })).json;
      assert.equal(view.pricing?.pricing_mode ?? view.pricing_mode, "on_request", JSON.stringify(view).slice(0, 600));
      assert.equal(view.pricing?.commercial_price ?? null, null, "sem preço público");
      assert.equal(view.pricing?.commercial_price_label ?? "Sob consulta", "Sob consulta");
      const quote = await postQuote(b.product.id);
      assert.equal(quote.status, 409, "sob consulta não gera cotação");
      assert.equal(quote.json.code, "not_quotable");
      assert.match(quote.json.error ?? "", /sob consulta/i);
      const cart = await api("/api/catalog2/cart", { method: "POST", token: CO_A.token, body: { product: b.product.id, selection: SEL } });
      assert.ok(cart.status >= 400, "nem entra na cesta");
    } finally { await prisma.catalog2Specialty.updateMany({ where: { key: "designer" }, data: { max_hourly_rate: 100 } }); }
    // `on_request` não esconde problemas estruturais
    const c = await mkProduct("Sob consulta incompleto", { tasks: [], noPublish: true });
    await adminPut(c.versionId, { pricing_mode: "on_request" });
    assert.equal((await publishRaw(c.versionId)).status, 422, "sem tarefas continua bloqueado");
  });
  it("M18a. a API protege contra modelo duplicado: candidatos estruturados, use_existing, create_anyway com justificativa e autoria", async () => {
    const spec = await prisma.catalog2Specialty.findFirstOrThrow({ where: { key: "designer" } });
    const { versionId } = await mkProduct("Duplicidade API", { tasks: [{ key: "base" }], noPublish: true });
    const body = (extra: Record<string, unknown>) => ({ estimated_minutes: 60, specialty_id: spec.id, ...extra });
    const nome = `Relatório mensal de campanhas ${uid()}`;
    // 1ª criação: sem parecido → cria (sem precisar de nada além do nome)
    const t1 = await adm(`/versions/${versionId}/tasks`, "POST", body({ name: nome, key: "rel", client_action_id: `a-${uid()}` }));
    assert.equal(t1.status, 201, JSON.stringify(t1.json));
    const modelId = t1.json.task_model_id as number;
    const modelsBefore = await prisma.catalog2TaskModel.count();
    // 2ª criação com o mesmo nome (sem declarar nada) → PARA, devolvendo os candidatos
    const dup = await adm(`/versions/${versionId}/tasks`, "POST", body({ name: nome, key: "rel2" }));
    assert.equal(dup.status, 409);
    assert.equal(dup.json.code, "duplicate_model_candidates");
    assert.equal(dup.json.details.candidates[0].id, modelId);
    assert.equal(dup.json.details.candidates[0].compatible, true, "mesma especialidade, ciclo e executor");
    assert.equal(dup.json.details.prefer, modelId);
    assert.deepEqual(dup.json.details.resolutions, ["use_existing", "create_anyway"]);
    // variações de escrita (acento, caixa, plural, pontuação) também param
    for (const n of [nome.toUpperCase(), nome.normalize("NFD").replace(/[̀-ͯ]/g, ""), `${nome}!!`]) {
      assert.equal((await adm(`/versions/${versionId}/tasks`, "POST", body({ name: n, key: `v${uid()}` }))).status, 409, n);
    }
    // mesma KEY já usada por outro modelo também é candidata, mesmo com nome diferente
    const porKey = await adm(`/versions/${versionId}/tasks`, "POST", body({ name: `Algo totalmente diferente ${uid()}`, key: "rel" }));
    assert.equal(porKey.status, 409);
    assert.ok(porKey.json.details.candidates.some((c: { id: number; match: string[] }) => c.id === modelId && c.match.includes("key")));
    // especialidade diferente: ainda é candidato, mas marcado como NÃO compatível
    const outra = await prisma.catalog2Specialty.findFirstOrThrow({ where: { key: "redator" } });
    const difSpec = await adm(`/versions/${versionId}/tasks`, "POST", { ...body({ name: nome, key: "x1" }), specialty_id: outra.id });
    assert.equal(difSpec.status, 409);
    assert.equal(difSpec.json.details.candidates[0].compatible, false);
    assert.equal(difSpec.json.details.candidates[0].same_specialty, false);
    assert.equal(await prisma.catalog2TaskModel.count(), modelsBefore, "nada foi criado nas tentativas barradas");
    // create_anyway exige justificativa
    assert.equal((await adm(`/versions/${versionId}/tasks`, "POST", body({ name: nome, key: "c1", duplicate_resolution: "create_anyway" }))).json.code, "duplicate_justification_required");
    assert.equal((await adm(`/versions/${versionId}/tasks`, "POST", body({ name: nome, key: "c2", duplicate_resolution: "create_anyway", duplicate_justification: "curto" }))).status, 422);
    // use_existing sem id / com id inexistente / com id inativo
    assert.equal((await adm(`/versions/${versionId}/tasks`, "POST", body({ name: nome, key: "u0", duplicate_resolution: "use_existing" }))).json.code, "duplicate_model_id_required");
    assert.equal((await adm(`/versions/${versionId}/tasks`, "POST", body({ name: nome, key: "u1", duplicate_resolution: "use_existing", duplicate_model_id: 99999999 }))).status, 404);
    // use_existing correto: reaproveita o modelo, não cria outro, e registra quem autorizou
    const cid = `use-${uid()}`;
    const use = await adm(`/versions/${versionId}/tasks`, "POST", body({ name: nome, key: "u2", duplicate_resolution: "use_existing", duplicate_model_id: modelId, client_action_id: cid }));
    assert.equal(use.status, 201, JSON.stringify(use.json));
    assert.equal(use.json.task_model_id, modelId);
    assert.equal(await prisma.catalog2TaskModel.count(), modelsBefore, "reaproveitar não consome ID");
    const log = await prisma.catalog2ModelAction.findUniqueOrThrow({ where: { client_action_id: cid } });
    assert.equal(log.duplicate_resolution, "use_existing");
    assert.equal(log.authorized_by_user_id, ADMIN.user.id);
    // create_anyway com justificativa: cria modelo novo (ID novo) e registra autoria + motivo
    const cid2 = `any-${uid()}`;
    const anyway = await adm(`/versions/${versionId}/tasks`, "POST", body({ name: nome, key: "c3", duplicate_resolution: "create_anyway", duplicate_justification: "Variante com formato diferente de relatório.", client_action_id: cid2 }));
    assert.equal(anyway.status, 201, JSON.stringify(anyway.json));
    assert.notEqual(anyway.json.task_model_id, modelId);
    const log2 = await prisma.catalog2ModelAction.findUniqueOrThrow({ where: { client_action_id: cid2 } });
    assert.equal(log2.duplicate_resolution, "create_anyway");
    assert.equal(log2.justification, "Variante com formato diferente de relatório.");
    assert.equal(log2.authorized_by_user_id, ADMIN.user.id);
    assert.ok(JSON.parse(log2.similar_ids_json!).includes(modelId), "guarda quais candidatos existiam");
    // etapas: mesma proteção
    const tk = await prisma.catalog2Task.findFirstOrThrow({ where: { version_id: versionId, key: "base" } });
    const etapa = `Conferir cronograma de entrega ${uid()}`;
    const e1 = await adm(`/tasks/${tk.id}/steps`, "POST", body({ name: etapa, key: "e1" }));
    assert.equal(e1.status, 201, JSON.stringify(e1.json));
    const e2 = await adm(`/tasks/${tk.id}/steps`, "POST", body({ name: etapa, key: "e2" }));
    assert.equal(e2.status, 409);
    assert.equal(e2.json.code, "duplicate_model_candidates");
    const e3 = await adm(`/tasks/${tk.id}/steps`, "POST", body({ name: etapa, key: "e3", duplicate_resolution: "use_existing", duplicate_model_id: e2.json.details.candidates[0].id }));
    assert.equal(e3.status, 201, JSON.stringify(e3.json));
    assert.equal(e3.json.step_model_id, e2.json.details.candidates[0].id);
    // criação direta no catálogo global também protegida
    const g1 = await adm("/task-models", "POST", { name: nome, specialty_id: spec.id });
    assert.equal(g1.status, 409);
    const g2 = await adm("/task-models", "POST", { name: nome, specialty_id: spec.id, duplicate_resolution: "use_existing", duplicate_model_id: modelId });
    assert.equal(g2.status, 200);
    assert.equal(g2.json.id, modelId);
    assert.equal(g2.json.created, false);
    const s1 = await adm("/step-models", "POST", { name: etapa });
    assert.equal(s1.status, 409);
  });

  it("M18b. criação de modelo é idempotente (client_action_id) e segura contra chamadas concorrentes", async () => {
    const spec = await prisma.catalog2Specialty.findFirstOrThrow({ where: { key: "designer" } });
    const { versionId } = await mkProduct("Concorrência", { tasks: [{ key: "base" }], noPublish: true });
    // repetição com o mesmo client_action_id: devolve a MESMA tarefa e o MESMO modelo, sem consumir ID
    const nome = `Auditoria de pixel ${uid()}`;
    const cid = `idem-${uid()}`;
    const antes = await prisma.catalog2TaskModel.aggregate({ _max: { id: true }, _count: true });
    const r1 = await adm(`/versions/${versionId}/tasks`, "POST", { name: nome, key: "pix", specialty_id: spec.id, estimated_minutes: 30, client_action_id: cid });
    const r2 = await adm(`/versions/${versionId}/tasks`, "POST", { name: nome, key: "pix", specialty_id: spec.id, estimated_minutes: 30, client_action_id: cid });
    const r3 = await adm(`/versions/${versionId}/tasks`, "POST", { name: nome, key: "pix", specialty_id: spec.id, estimated_minutes: 30, client_action_id: cid });
    assert.equal(r1.status, 201, JSON.stringify(r1.json));
    assert.equal(r2.status, 200, "repetição devolve o resultado anterior");
    assert.equal(r3.status, 200);
    assert.equal(r2.json.id, r1.json.id);
    assert.equal(r3.json.task_model_id, r1.json.task_model_id);
    const depois = await prisma.catalog2TaskModel.aggregate({ _max: { id: true }, _count: true });
    assert.equal(depois._count, antes._count + 1, "um único modelo criado");
    assert.equal(depois._max.id, (antes._max.id ?? 0) + 1, "um único ID consumido");
    assert.equal(await prisma.catalog2Task.count({ where: { version_id: versionId, key: "pix" } }), 1, "uma única tarefa");
    // concorrência: 8 chamadas simultâneas com o MESMO nome e client_action_ids diferentes → exatamente 1 cria; as demais veem o candidato e param
    const nomeC = `Relatório de conversões ${uid()}`;
    const modelsBefore = await prisma.catalog2TaskModel.count();
    const rs = await Promise.all(Array.from({ length: 8 }, (_, i) => adm("/task-models", "POST", { name: nomeC, specialty_id: spec.id, client_action_id: `conc-${uid()}-${i}` })));
    const created = rs.filter((r) => r.status === 201);
    const blocked = rs.filter((r) => r.status === 409);
    assert.equal(created.length, 1, JSON.stringify(rs.map((r) => r.status)));
    assert.equal(blocked.length, 7);
    assert.ok(blocked.every((r) => r.json.code === "duplicate_model_candidates"));
    assert.equal(await prisma.catalog2TaskModel.count(), modelsBefore + 1, "só um modelo existe");
    // concorrência com o MESMO client_action_id: um cria, os outros recebem o mesmo resultado
    const nomeD = `Painel de métricas ${uid()}`;
    const cidD = `same-${uid()}`;
    const before2 = await prisma.catalog2TaskModel.count();
    const rd = await Promise.all(Array.from({ length: 6 }, () => adm("/step-models", "POST", { name: nomeD, client_action_id: cidD })));
    assert.ok(rd.every((r) => r.status === 200 || r.status === 201), JSON.stringify(rd.map((r) => r.status)));
    assert.equal(new Set(rd.map((r) => r.json.id)).size, 1, "todas devolvem o mesmo modelo");
    assert.equal(rd.filter((r) => r.status === 201).length, 1);
    assert.equal(await prisma.catalog2StepModel.count({ where: { name: nomeD } }), 1);
    void before2;
  });
});
