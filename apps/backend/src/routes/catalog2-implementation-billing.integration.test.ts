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
async function mkProduct(name: string, o: { tasks: TDef[]; recurring?: boolean; flags?: Record<string, unknown>; variations?: boolean; addons?: boolean; deadline?: number; addonsRaw?: unknown[]; variationsRaw?: unknown[] }) {
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

const postQuote = (productId: string, period?: string, selection: Record<string, unknown> = SEL) =>
  api("/api/catalog2/quotes", { method: "POST", token: CO_A.token, body: { product: productId, selection, ...(period ? { period } : {}) } });
let CO_A: Awaited<ReturnType<typeof mkCompanyUser>>;
let ADMIN: Awaited<ReturnType<typeof mkAdmin>>;
let LEADER: Awaited<ReturnType<typeof mkUser>>;

describe("Estrutura universal · implantação, primeira cobrança e renovação", () => {
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

  it("1. compra avulsa com implantação: implantação + um ciclo operacional, sem renovação", async () => {
    const { product, versionId } = await mkImplProduct();
    const sim = await simulate(versionId);
    const P = priceP(sim);
    const sp = sim.pricing.split;
    assert.equal(sp.implementation.applicable, true);
    near(sp.implementation.price, P, "a implantação tem o seu próprio preço comercial");
    near(sp.avulso_total, Math.round(2 * P * 100) / 100, "avulso = implantação + ciclo operacional");
    near(sp.first_charge, sp.avulso_total);
    near(sim.pricing.lines.commercial_final_price.amount, sp.avulso_total, "o preço comercial do produto avulso é o total avulso");
    const q = await postQuote(product.id);
    near(q.json.commercial_price, sp.avulso_total);
    near(q.json.implementation_price, P);
    assert.equal(q.json.recurring_price, null, "avulso não tem mensalidade");
    const { projectId, pps } = await checkoutAndPay(CO_A.token, [q.json.id]);
    assert.equal(await prisma.catalog2Subscription.count({ where: { project_product_id: pps[0].id } }), 0, "avulso nunca renova");
    assert.deepEqual((await tasksOf(projectId)).map((t) => t.catalog2_task?.key).sort(), ["implantacao", "rotina"]);
    near((await prisma.projectProduct.findUniqueOrThrow({ where: { id: pps[0].id } })).preco_final_cliente_snapshot, sp.avulso_total);
  });

  it("2. assinatura: primeira cobrança = implantação + 1ª mensalidade; a assinatura guarda os valores separados", async () => {
    const { product, versionId } = await mkImplProduct();
    const sp = (await simulate(versionId)).pricing.split;
    const P = r2(sp.schedule.tasks.find((t: any) => t.key === "rotina").price);
    const q = await postQuote(product.id, "mensal");
    assert.equal(q.status, 201, JSON.stringify(q.json));
    near(q.json.first_charge_price, Math.round(2 * P * 100) / 100);
    near(q.json.recurring_price, P, "a mensalidade NÃO carrega a implantação");
    near(q.json.commercial_price, q.json.first_charge_price);
    const { projectId, pps } = await checkoutAndPay(CO_A.token, [q.json.id]);
    const pay = await prisma.payment.findFirstOrThrow({ where: { project_id: projectId } });
    near(pay.amount, q.json.first_charge_price, "o que foi cobrado agora = primeira cobrança");
    const sub = await prisma.catalog2Subscription.findUniqueOrThrow({ where: { project_product_id: pps[0].id } });
    near(sub.monthly_amount, P, "valor recorrente congelado");
    near(sub.implementation_amount, P, "valor da implantação cobrada inicialmente");
    assert.ok(sub.implementation_charged_at, "data da implantação");
    assert.match(sub.implementation_reason ?? "", /Primeira contratação/, "motivo da implantação");
    const first = JSON.parse(sub.first_charge_json!);
    near(first.total, q.json.first_charge_price);
    near(first.parts.implementation, P);
    assert.ok(sub.renewal_components_json, "composição das renovações guardada");
    assert.deepEqual((await tasksOf(projectId, 0)).map((t) => t.catalog2_task?.key).sort(), ["implantacao", "rotina"], "tarefas de implantação e recorrentes no 1º ciclo");
  });

  it("3. renovação: só a mensalidade recorrente; sem implantação; só tarefas recorrentes", async () => {
    const { product, versionId } = await mkImplProduct();
    const P = priceP(await simulate(versionId));
    const { projectId, pps } = await checkoutAndPay(CO_A.token, [(await postQuote(product.id, "mensal")).json.id]);
    const sub = await prisma.catalog2Subscription.findUniqueOrThrow({ where: { project_product_id: pps[0].id } });
    await prisma.catalog2Subscription.update({ where: { id: sub.id }, data: { next_invoice_at: new Date(Date.now() - 1000) } });
    await runSubscriptionsTick();
    const inv = await prisma.invoice.findMany({ where: { project_id: projectId }, orderBy: { created_at: "asc" } });
    assert.equal(inv.length, 2);
    near(inv[1].amount, P, "renovação = mensalidade, sem nova cobrança da implantação");
    near(inv[0].amount, Math.round(2 * P * 100) / 100);
    assert.equal((await api(`/api/catalog2/subscriptions/${sub.id}/pay`, { method: "POST", token: CO_A.token, body: {} })).json.paid, true);
    assert.deepEqual((await tasksOf(projectId, 1)).map((t) => t.catalog2_task?.key), ["rotina"]);
    const view = await api(`/api/catalog2/subscriptions/by-product/${pps[0].id}`, { token: CO_A.token });
    near(view.json.next_renewal_amount, P);
    near(view.json.implementation_amount, P);
  });

  it("4. implantação 'always': é cobrada de novo em toda nova contratação", async () => {
    const { product, versionId } = await mkImplProduct("always");
    const P = priceP(await simulate(versionId));
    const first = await postQuote(product.id, "mensal");
    const a = await checkoutAndPay(CO_A.token, [first.json.id]);
    await prisma.projectTask.updateMany({ where: { project_id: a.projectId, cycle_kind: "implementacao" }, data: { status: "CONCLUIDA", data_conclusao: new Date() } });
    const again = await postQuote(product.id, "mensal");
    near(again.json.first_charge_price, Math.round(2 * P * 100) / 100, "mesmo com implantação já concluída antes");
    const b = await checkoutAndPay(CO_A.token, [again.json.id]);
    assert.ok((await tasksOf(b.projectId, 0)).some((t) => t.catalog2_task?.key === "implantacao"));
  });

  const rehire = async (rule: string) => {
    const { product, versionId } = await mkImplProduct(rule);
    const P = priceP(await simulate(versionId));
    const q1 = await postQuote(product.id, "mensal");
    near(q1.json.first_charge_price, Math.round(2 * P * 100) / 100, `${rule}: 1ª contratação cobra a implantação`);
    const a = await checkoutAndPay(CO_A.token, [q1.json.id]);
    await prisma.projectTask.updateMany({ where: { project_id: a.projectId, cycle_kind: "implementacao" }, data: { status: "CONCLUIDA", data_conclusao: new Date() } });
    return { product, versionId, P };
  };

  it("5. implantação 'on_revalidation': cobrada na 1ª contratação; depois só a mensalidade; a revalidação nunca entra no preço", async () => {
    const { product, versionId, P } = await rehire("on_revalidation");
    const q2 = await postQuote(product.id, "mensal");
    near(q2.json.first_charge_price, P, "nova contratação só cobra a mensalidade");
    near(q2.json.implementation_price, 0);
    const sp = (await simulate(versionId)).pricing.split;
    assert.equal(sp.implementation.rule, "on_revalidation");
    assert.equal(sp.implementation.applicable, true, "sem histórico do cliente a simulação mostra a implantação");
    assert.equal(sp.revalidation.charged, false);
  });

  it("6. recontratação com implantação já concluída (first_only): não cobra nem gera a implantação de novo", async () => {
    const { product, P } = await rehire("first_only");
    const q2 = await postQuote(product.id, "mensal");
    near(q2.json.first_charge_price, P, "recontratação só cobra a mensalidade");
    near(q2.json.implementation_price, 0);
    const b = await checkoutAndPay(CO_A.token, [q2.json.id]);
    assert.deepEqual((await tasksOf(b.projectId, 0)).map((t) => t.catalog2_task?.key), ["rotina"], "não gera a tarefa de implantação de novo");
    const subB = await prisma.catalog2Subscription.findUniqueOrThrow({ where: { project_product_id: b.pps[0].id } });
    near(subB.implementation_amount, 0);
  });

  const mkScopes = () => {
    const addons = [
      { key: "setup", name: "Setup único", base_cost: 100, charge_scope: "one_time" },
      { key: "mensal", name: "Extra mensal", base_cost: 40, charge_scope: "recurring" },
      { key: "janela", name: "Extra 2 meses", base_cost: 20, charge_scope: "per_cycle", charge_start_cycle: 1, charge_end_cycle: 2 },
      { key: "porqtd", name: "Por quantidade", base_cost: 10, charge_scope: "per_quantity", charge_quantity: 3 },
    ];
    const variations = [{ key: "v", name: "V", is_required: true, selection_type: "single", options: { create: [
      { key: "base", label: "Base", is_default: true },
      { key: "rec", label: "Recorrente", effects: { create: [{ effect_type: "add_fixed_amount", effect_value: "30", charge_scope: "recurring" }] } },
      { key: "uni", label: "Única", effects: { create: [{ effect_type: "add_fixed_amount", effect_value: "50", charge_scope: "one_time", source_task_key: "rotina" }] } },
    ] } }];
    return mkProduct("Escopos", { tasks: [ROTINA], recurring: true, flags: { accepts_one_time: true }, addonsRaw: addons, variationsRaw: variations } as never);
  };
  const scopeEnv = async () => {
    const { product, versionId } = await mkScopes();
    const price = async (sel: Record<string, unknown>) => (await simulate(versionId, sel)).pricing.split;
    const base = await price({ ...SEL, variation_option_keys: ["base"] });
    const one = await price({ ...SEL, variation_option_keys: ["base"], addon_keys: ["setup"] });
    const factor = one.one_time_items[0].price / 100; // preço comercial de cada R$ 1 de custo (impostos, comissão, taxa e margem)
    return { product, versionId, price, base, one, factor };
  };

  it("7. adicional de cobrança única: só na primeira cobrança; nunca volta nas renovações; nunca se cobra duas vezes", async () => {
    const { product, price, base, one, factor } = await scopeEnv();
    near(one.first_charge, Math.round((base.first_charge + 100 * factor) * 100) / 100);
    near(one.renewal, base.renewal, "cobrança única nunca volta nas renovações");
    assert.equal(one.one_time_items.length, 1);
    for (const k of [1, 2, 5]) near(one.cycle_prices[k].price, base.cycle_prices[k].price, `ciclo ${k} sem o adicional`);
    // contratação real: cobra uma vez, e a renovação emitida não carrega o adicional
    const q = await api("/api/catalog2/quotes", { method: "POST", token: CO_A.token, body: { product: product.id, selection: { ...SEL, variation_option_keys: ["base"], addon_keys: ["setup"] }, period: "mensal" } });
    const { projectId, pps } = await checkoutAndPay(CO_A.token, [q.json.id]);
    const sub = await prisma.catalog2Subscription.findUniqueOrThrow({ where: { project_product_id: pps[0].id } });
    near(sub.monthly_amount, base.renewal);
    await prisma.catalog2Subscription.update({ where: { id: sub.id }, data: { next_invoice_at: new Date(Date.now() - 1000) } });
    await runSubscriptionsTick();
    const inv = await prisma.invoice.findMany({ where: { project_id: projectId }, orderBy: { created_at: "asc" } });
    near(inv[0].amount, one.first_charge);
    near(inv[1].amount, base.renewal, "a renovação não recobra o adicional único");
    void price;
  });

  it("8. adicional recorrente: entra na primeira cobrança e em todas as renovações; janela de ciclos e por quantidade respeitadas", async () => {
    const { price, base, factor } = await scopeEnv();
    const rec = await price({ ...SEL, variation_option_keys: ["base"], addon_keys: ["mensal"] });
    near(rec.first_charge, Math.round((base.first_charge + 40 * factor) * 100) / 100);
    near(rec.renewal, Math.round((base.renewal + 40 * factor) * 100) / 100);
    near(rec.cycle_prices[5].price, rec.renewal, "continua em todos os ciclos");
    const win = await price({ ...SEL, variation_option_keys: ["base"], addon_keys: ["janela"] });
    near(win.cycle_prices[0].price, base.first_charge, "não cobra no ciclo 0");
    near(win.cycle_prices[1].price, Math.round((base.renewal + 20 * factor) * 100) / 100);
    near(win.cycle_prices[2].price, win.cycle_prices[1].price);
    near(win.cycle_prices[3].price, base.renewal, "acabou a cobrança no fim da janela");
    const qty = await price({ ...SEL, variation_option_keys: ["base"], addon_keys: ["porqtd"] });
    near(qty.first_charge, Math.round((base.first_charge + 30 * factor) * 100) / 100, "valor × quantidade informada (3)");
  });

  it("9. variação com efeito recorrente vai para a mensalidade; variação de cobrança única fica só na primeira cobrança", async () => {
    const { product, price, base, factor } = await scopeEnv();
    const vrec = await price({ ...SEL, variation_option_keys: ["rec"] });
    near(vrec.renewal, Math.round((base.renewal + 30 * factor) * 100) / 100, "variação recorrente vai para a mensalidade");
    near(vrec.first_charge, Math.round((base.first_charge + 30 * factor) * 100) / 100);
    const vuni = await price({ ...SEL, variation_option_keys: ["uni"] });
    near(vuni.renewal, base.renewal, "variação de cobrança única fica só na primeira cobrança");
    near(vuni.first_charge, Math.round((base.first_charge + 50 * factor) * 100) / 100);
    assert.equal(vuni.one_time_items[0].task, "rotina", "referência da tarefa que gerou o custo");
    // a assinatura congela o valor de cada ciclo escolhido
    const q = await api("/api/catalog2/quotes", { method: "POST", token: CO_A.token, body: { product: product.id, selection: { ...SEL, variation_option_keys: ["rec"] }, period: "mensal" } });
    const { pps } = await checkoutAndPay(CO_A.token, [q.json.id]);
    const sub = await prisma.catalog2Subscription.findUniqueOrThrow({ where: { project_product_id: pps[0].id } });
    const { amountForSubscriptionCycle } = await import("../lib/catalog2-subscriptions");
    for (const k of [1, 2, 3]) near(amountForSubscriptionCycle(sub, k), vrec.cycle_prices[k].price, `ciclo ${k}`);
  });

  const mkCycles = () => mkProduct("Ciclos", {
    tasks: [IMPL, ROTINA, { key: "unica", cycle: "recorrente", repeat: "first_only" } as TDef, { key: "trimestral", cycle: "recorrente", repeat: "every_n_cycles", every: 3 } as TDef, { key: "revalida", cycle: "revalidacao" } as TDef],
    recurring: true, flags: { accepts_one_time: true, has_initial_implementation: true },
  } as never);

  it("10. tarefa de implantação fica FORA do preço mensal (paga só na primeira cobrança)", async () => {
    const { versionId } = await mkCycles();
    const sp = (await simulate(versionId)).pricing.split;
    const P = r2(sp.schedule.tasks.find((t: any) => t.key === "rotina").price);
    assert.equal(sp.recurring.tasks.includes("implantacao"), false, "implantação fora da mensalidade");
    assert.deepEqual(sp.implementation.tasks, ["implantacao"]);
    near(sp.renewal, P, "a renovação não tem a implantação");
    assert.ok(sp.first_charge > sp.renewal);
    assert.equal(sp.schedule.tasks.find((t: any) => t.key === "implantacao").kind, "implementation");
  });

  it("11. tarefa recorrente fica DENTRO do preço mensal; 'só na 1ª vez', 'a cada N ciclos' e revalidação seguem o ciclo real", async () => {
    const { versionId } = await mkCycles();
    const sp = (await simulate(versionId)).pricing.split;
    const P = r2(sp.schedule.tasks.find((t: any) => t.key === "rotina").price);
    assert.ok(sp.recurring.tasks.includes("rotina"), "recorrente dentro da mensalidade");
    near(sp.cycle_prices[0].price, Math.round(4 * P * 100) / 100, "ciclo 0: implantação + rotina + 1ª vez + trimestral");
    near(sp.cycle_prices[2].price, P);
    near(sp.cycle_prices[3].price, Math.round(2 * P * 100) / 100, "ciclo 3: rotina + trimestral");
    assert.deepEqual(sp.revalidation.tasks, ["revalida"]);
    assert.equal(sp.revalidation.charged, false);
    assert.ok(sp.not_charged.some((n: any) => n.key === "revalida"));
  });

  it("28. a simulação explica primeira cobrança e renovação por componente (custo, preço, taxas e tarefas)", async () => {
    const { versionId } = await mkImplProduct();
    const sim = await simulate(versionId);
    const sp = sim.pricing.split;
    for (const c of [sp.implementation, sp.first_cycle_operation, sp.recurring]) {
      assert.ok(typeof c.cost === "number" && typeof c.price === "number" && Array.isArray(c.tasks) && c.taxes_and_margins.length > 0, "cada componente traz custo, preço, tarefas e as taxas aplicadas");
      assert.ok(c.price > c.cost, "o preço comercial é maior que o custo (impostos, comissão, taxa e margem)");
    }
    assert.equal(sp.implementation.reason, "Primeira contratação deste cliente.");
    near(sp.first_charge_parts.implementation + sp.first_charge_parts.one_time + sp.first_charge_parts.recurring, sp.first_charge);
    assert.ok(sp.first_charge > sp.renewal);
    near(sp.cycle_prices.length, 6);
    // o cliente vê só preços (nunca custo, imposto ou margem)
    const client = (await api(`/api/catalog2/products/${(await prisma.catalog2ProductVersion.findUniqueOrThrow({ where: { id: versionId } })).product_id}`, { token: CO_A.token })).json;
    assert.ok(!JSON.stringify(client).includes("taxes_and_margins"));
  });
});
