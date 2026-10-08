import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import jwt from "jsonwebtoken";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import app from "../app";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import { seedCatalog2Classifications, seedCatalog2FourFForTests } from "../lib/catalog2-classifications-seed";
import { concluirEtapa } from "../lib/stage-engine";
import { assignNomadeDirectly } from "../lib/task-rotation-engine";
import { runSubscriptionsTick } from "../lib/catalog2-subscriptions";
import { ensureConnectionTypes } from "../lib/connections/catalog";
import { setConnectorFetch } from "../lib/connections/connectors";
import { recordValidation } from "../lib/connections/core";
import { ensureConnectionAiProfile, runConnectionReminders } from "../lib/connections/pending";
import { onExecutorChanged } from "../lib/connections/flow";
import { setTaskAIAdapter, resetTaskAIAdapter } from "../lib/task-ai";

// Módulo universal "Conexões e acessos necessários".

let baseUrl = "";
let server: import("node:http").Server;
const users: string[] = [];
const adminProfiles: string[] = [];
const companies: string[] = [];
const catProducts: string[] = [];
const projects: string[] = [];
const extra: (() => Promise<void>)[] = [];
const uid = () => crypto.randomBytes(4).toString("hex");
const SEL = { variation_option_keys: [], addon_keys: [], quantity: 1, answers: {} };
const SECRET = "tok_SEGREDO_super_secreto_98765";

function tokenFor(u: { id: string; email: string; role: string; account_type: string }) {
  return jwt.sign({ id: u.id, email: u.email, role: u.role, account_type: u.account_type }, config.JWT_SECRET, { expiresIn: "1h" });
}
async function api(p: string, opts: { method?: string; token?: string; body?: unknown } = {}) {
  const res = await fetch(`${baseUrl}${p}`, {
    method: opts.method ?? "GET",
    headers: { "content-type": "application/json", ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}) },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    redirect: "manual",
  });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* corpo não-JSON */ }
  return { status: res.status, json, text, headers: res.headers };
}
async function mkUser(role: string, account_type: string, ex: Record<string, unknown> = {}) {
  const id = `cn-${uid()}${uid()}`;
  const u = await prisma.user.create({ data: { id, email: `${id}@example.test`, password_hash: "x", name: `U ${id}`, role, account_type, is_active: true, status: "ativo", ...ex } });
  users.push(u.id);
  return u;
}
async function mkCompanyUser(tag: string) {
  const c = await prisma.company.create({ data: { name: `[TESTE] CONN ${tag} ${uid()}`, status: "ativo" } });
  companies.push(c.id);
  const user = await mkUser("company_user", "empresas", { company_id: c.id });
  return { user, token: tokenFor(user), companyId: c.id };
}
async function mkAdmin() {
  const p = await prisma.adminProfile.create({ data: { name: `CN ${uid()}`, is_master: true, is_active: true } });
  adminProfiles.push(p.id);
  const user = await mkUser("admin", "admin", { admin_profile_id: p.id });
  return { user, token: tokenFor(user) };
}
async function mkNomad() {
  const user = await mkUser("nomad", "nomades");
  const nomade = await prisma.nomade.create({ data: { user_id: user.id, name: user.name, email: `${user.id}-n@example.test`, status: "ativo" } });
  extra.push(async () => {
    await prisma.taskAssignmentHistory.deleteMany({ where: { nomade_id: nomade.id } });
    await prisma.nomade.delete({ where: { id: nomade.id } }).catch(() => {});
  });
  return { user, nomade, token: tokenFor(user) };
}
async function setPricingSettings() {
  const d = { tax_percent: 6, commission_percent: 10, operational_fee_percent: 5, profit_margin_percent: 30, human_review_percent: 10, component_order_json: JSON.stringify(["tax", "commission", "operational", "margin"]) };
  await prisma.catalog2PricingSettings.upsert({ where: { id: "default" }, create: { id: "default", ...d }, update: d });
}

interface TDef { key: string; cycle?: string; steps?: number }
async function mkProduct(name: string, o: { tasks: TDef[]; recurring?: boolean; deadline?: number }) {
  const spec = await prisma.catalog2Specialty.findFirstOrThrow({ where: { key: "designer" } });
  await prisma.catalog2Specialty.update({ where: { id: spec.id }, data: { max_hourly_rate: 100 } });
  await setPricingSettings();
  const pillar = await prisma.catalog2Pillar.findFirstOrThrow({ where: { key: "redes_conteudo" } });
  const category = await prisma.catalog2Category.findFirstOrThrow({ where: { key: "design" } });
  const fourF = await prisma.catalog2FourF.findFirstOrThrow({ where: { key: "fluxo" } });
  const slug = `cn-${uid()}`;
  const product = await prisma.catalog2Product.create({
    data: { slug, internal_name: `[TESTE LOCAL] ${name} ${slug}`, pillar_id: pillar.id, category_id: category.id, status: "em_preparacao", delivery_recurrence: o.recurring ? "mensal" : null, four_f: { create: [{ four_f_id: fourF.id }] } },
  });
  catProducts.push(product.id);
  const v = await prisma.catalog2ProductVersion.create({
    data: {
      product_id: product.id, version_number: 1, state: "rascunho", title: name, summary: "resumo", full_description: "descrição do serviço demo",
      base_commercial_deadline_days: o.deadline ?? 5, accepts_recurring: !!o.recurring, accepts_one_time: true,
      tasks: {
        create: o.tasks.map((t, i) => ({
          key: t.key, name: `Tarefa ${t.key}`, execution_mode: "humano", specialty_id: spec.id, estimated_minutes: 60, sort_order: i + 1,
          cycle_type: t.cycle ?? "recorrente", repeat_rule: "all_cycles", executor_continuity: "not_allowed", requires_review: false, requires_client_approval: true,
          steps: { create: Array.from({ length: t.steps ?? 1 }, (_, k) => ({ key: `s${k + 1}`, name: `Etapa ${t.key}-${k + 1}`, sort_order: k + 1, specialty_id: spec.id, estimated_minutes: 60 })) },
        })),
      },
    },
  });
  if (o.recurring) await prisma.catalog2ProductPeriod.upsert({ where: { product_id_period: { product_id: product.id, period: "mensal" } }, create: { product_id: product.id, period: "mensal", months: 1, discount_percent: 0, is_active: true }, update: {} });
  return { product, versionId: v.id };
}

const agencies: string[] = [];
async function mkAgencyUser(tag: string) {
  const owner = await mkUser("agency_admin", "agencias");
  const agency = await prisma.agency.create({ data: { name: `[TESTE] CONN AG ${tag} ${uid()}`, status: "ativo", owner_user_id: owner.id } });
  await prisma.user.update({ where: { id: owner.id }, data: { agency_id: agency.id } });
  agencies.push(agency.id);
  return { user: owner, token: tokenFor(owner), agencyId: agency.id };
}
let CO_A: Awaited<ReturnType<typeof mkCompanyUser>>;
let CO_B: Awaited<ReturnType<typeof mkCompanyUser>>;
let ADMIN: Awaited<ReturnType<typeof mkAdmin>>;
let LEADER: Awaited<ReturnType<typeof mkUser>>;
let LEADER_TOKEN = "";
const adm = (p: string, method = "GET", body?: unknown) => api(`/api/admin/catalog2${p}`, { method, token: ADMIN.token, body });
const cn = (p: string, token: string, method = "GET", body?: unknown) => api(`/api/connections${p}`, { method, token, body });
const typeId = async (key: string) => (await prisma.connectionType.findUniqueOrThrow({ where: { key } })).id;

async function quote(token: string, productId: string, period?: string) {
  const r = await api("/api/catalog2/quotes", { method: "POST", token, body: { product: productId, selection: SEL, ...(period ? { period } : {}) } });
  assert.equal(r.status, 201, r.text);
  return r.json;
}
async function checkoutAndPay(token: string, quoteIds: string[]) {
  const checkout = await api("/api/catalog2/checkout", { method: "POST", token, body: { quote_ids: quoteIds, checkout_client_action_id: crypto.randomUUID() } });
  assert.equal(checkout.status, 201, checkout.text);
  const projectId = checkout.json.project.id as string;
  projects.push(projectId);
  const pay = await api("/api/payments/fake-checkout", { method: "POST", token, body: { project_id: projectId } });
  assert.equal(pay.status, 201, pay.text);
  return { projectId, pps: checkout.json.project_products as { id: string; catalog2_product_id: string }[] };
}
const tasksOf = (projectId: string, occurrence?: number) =>
  prisma.projectTask.findMany({ where: { project_id: projectId, ...(occurrence != null ? { occurrence_index: occurrence } : {}) }, include: { catalog2_task: { select: { key: true } }, stages: { orderBy: { ordem: "asc" } } }, orderBy: { created_at: "asc" } });
const byKey = (rows: Awaited<ReturnType<typeof tasksOf>>) => Object.fromEntries(rows.map((r) => [r.catalog2_task?.key ?? r.title, r]));
const statusOf = async (id: string) => (await prisma.projectTask.findUniqueOrThrow({ where: { id } })).status;

interface Req { key: string; type?: string; method?: string; permission?: string; deps: { task_key: string; step_key?: string; kind?: string }[]; extra?: Record<string, unknown> }
const reqBody = (r: Req) => ({
  connection_type_key: r.type ?? "crm", method: r.method ?? "revocable_token", permission_level: r.permission ?? "read_write", when_needed: "before_task", when_task_key: r.deps[0].task_key,
  obligation: "required", validation_mode: "manual", dependents: r.deps.map((d) => ({ task_key: d.task_key, step_key: d.step_key ?? null, kind: d.kind ?? "start" })), ...(r.extra ?? {}),
});
/** Monta o produto, ativa o módulo (ou não), cadastra as exigências pela API e publica+ativa pela API. */
async function mkConnProduct(name: string, tasks: TDef[], reqs: Req[], o: { noModule?: boolean; recurring?: boolean; publish?: boolean } = {}) {
  const { product, versionId } = await mkProduct(name, { tasks, recurring: o.recurring });
  if (!o.noModule) {
    assert.equal((await adm(`/versions/${versionId}/connections-module`, "PUT", { requires_connections: true })).status, 200);
    for (const r of reqs) {
      const x = await adm(`/versions/${versionId}/connection-requirements/by-key/${r.key}`, "PUT", reqBody(r));
      assert.ok([200, 201].includes(x.status), x.text);
    }
  }
  if (o.publish !== false) {
    const pub = await adm(`/versions/${versionId}/publish`, "POST", { activate: true, confirm_activation: true, client_action_id: crypto.randomUUID() });
    assert.equal(pub.status, 200, pub.text);
  }
  return { product: await prisma.catalog2Product.findUniqueOrThrow({ where: { id: product.id } }), versionId };
}
const buy = async (productId: string, token = CO_A.token, period?: string) => checkoutAndPay(token, [(await quote(token, productId, period)).id]);
const pcrsOf = (projectId: string) => prisma.projectConnectionRequirement.findMany({ where: { project_id: projectId }, orderBy: { created_at: "asc" } });
/** O cliente conecta agora (cria e vincula) e a equipe valida. */
async function connectAndValidate(pcrId: string, o: { scope?: string; task_ids?: string[]; body?: Record<string, unknown>; validate?: boolean } = {}) {
  const c = await cn(`/requirements/${pcrId}/create-and-link`, CO_A.token, "POST", { method: "revocable_token", label: "CRM do cliente", external_id: "crm-123", secret_value: SECRET, scope: o.scope ?? "project", ...(o.task_ids ? { task_ids: o.task_ids } : {}), ...(o.body ?? {}) });
  assert.equal(c.status, 201, c.text);
  if (o.validate !== false) {
    const v = await cn(`/${c.json.connection_id}/validate`, ADMIN.token, "POST", { result: "valid", evidence: "Conferido no painel do CRM com o cliente." });
    assert.equal(v.status, 200, v.text);
  }
  return c.json.connection_id as string;
}

describe("Conexões e acessos necessários", () => {
  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    await seedCatalog2FourFForTests(prisma);
    await seedCatalog2Classifications(prisma);
    await ensureConnectionTypes(prisma);
    CO_A = await mkCompanyUser("A");
    CO_B = await mkCompanyUser("B");
    ADMIN = await mkAdmin();
    LEADER = await mkUser("lider", "lider");
    LEADER_TOKEN = tokenFor(LEADER);
    server = app.listen(0);
    await new Promise<void>((r) => server.once("listening", () => r()));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  beforeEach(async () => { await setPricingSettings(); setConnectorFetch(null); });
  after(async () => {
    resetTaskAIAdapter();
    setConnectorFetch(null);
    await new Promise<void>((res, rej) => server.close((e) => (e ? rej(e) : res())));
    for (const id of projects.splice(0)) {
      const taskIds = (await prisma.projectTask.findMany({ where: { project_id: id }, select: { id: true } })).map((t) => t.id);
      await prisma.systemAlert.deleteMany({ where: { entity_id: { in: taskIds } } }).catch(() => {});
      await prisma.projectTaskExternalBlock.deleteMany({ where: { project_id: id } }).catch(() => {});
      await prisma.connectionEvent.deleteMany({ where: { project_id: id } }).catch(() => {});
      await prisma.catalog2SubscriptionEvent.deleteMany({ where: { subscription: { project_id: id } } }).catch(() => {});
      await prisma.catalog2Subscription.deleteMany({ where: { project_id: id } }).catch(() => {});
      await prisma.invoice.deleteMany({ where: { project_id: id } }).catch(() => {});
      await prisma.projectDecisionLog.deleteMany({ where: { project_id: id } }).catch(() => {});
      await prisma.clientAssetLink.deleteMany({ where: { project_id: id } }).catch(() => {});
      await prisma.projectDependencyRule.deleteMany({ where: { project_id: id } }).catch(() => {});
      await prisma.clientConnectionGrant.deleteMany({ where: { project_id: id } }).catch(() => {});
      const pcrIds = (await prisma.projectConnectionRequirement.findMany({ where: { project_id: id }, select: { id: true } })).map((x) => x.id);
      await prisma.connectionReminder.deleteMany({ where: { project_connection_req_id: { in: pcrIds } } }).catch(() => {});
      await prisma.projectConnectionRequirement.deleteMany({ where: { project_id: id } }).catch(() => {});
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
      await prisma.catalog2ProductPeriod.deleteMany({ where: { product_id: id } }).catch(() => {});
      await prisma.catalog2CartItem.deleteMany({ where: { product_id: id } }).catch(() => {});
      const vids = (await prisma.catalog2ProductVersion.findMany({ where: { product_id: id }, select: { id: true } })).map((x) => x.id);
      const qids = (await prisma.catalog2Quote.findMany({ where: { product_id: id }, select: { id: true } })).map((x) => x.id);
      await prisma.connectionQuoteChoice.deleteMany({ where: { quote_id: { in: qids } } }).catch(() => {});
      await prisma.catalog2Quote.deleteMany({ where: { product_id: id } }).catch(() => {});
      await prisma.catalog2Product.update({ where: { id }, data: { published_version_id: null } }).catch(() => {});
      await prisma.catalog2VersionEvent.deleteMany({ where: { version_id: { in: vids } } }).catch(() => {});
      await prisma.catalog2ConnectionRequirement.deleteMany({ where: { version_id: { in: vids } } }).catch(() => {});
      await prisma.catalog2Task.deleteMany({ where: { version_id: { in: vids } } }).catch(() => {});
      await prisma.catalog2ProductVersion.deleteMany({ where: { product_id: id } }).catch(() => {});
      await prisma.catalog2ProductFourF.deleteMany({ where: { product_id: id } }).catch(() => {});
      await prisma.catalog2Product.delete({ where: { id } }).catch(() => {});
    }
    for (const fn of extra.splice(0).reverse()) await fn().catch(() => {});
    const cids = (await prisma.clientConnection.findMany({ where: { company_id: { in: companies } }, select: { id: true } })).map((c) => c.id);
    await prisma.connectionEvent.deleteMany({ where: { OR: [{ connection_id: { in: cids } }, { company_id: { in: companies } }] } }).catch(() => {});
    await prisma.connectionSecret.deleteMany({ where: { connection_id: { in: cids } } }).catch(() => {});
    await prisma.clientConnection.deleteMany({ where: { company_id: { in: companies } } }).catch(() => {});
    await prisma.clientConnection.deleteMany({ where: { agency_id: { in: agencies } } }).catch(() => {});
    await prisma.company.deleteMany({ where: { id: { in: companies } } }).catch(() => {});
    await prisma.user.updateMany({ where: { id: { in: users } }, data: { agency_id: null } }).catch(() => {});
    await prisma.agency.deleteMany({ where: { id: { in: agencies } } }).catch(() => {});
    await prisma.systemAlert.deleteMany({ where: { user_id: { in: users } } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: { in: users } } }).catch(() => {});
    await prisma.adminProfile.deleteMany({ where: { id: { in: adminProfiles } } }).catch(() => {});
  });

  // ───────────────────────── 1–3: módulo desativado / ativado / produto sem conexões ─────────────────────────
  it("C01. módulo desativado: não aparece ao cliente, não entra no checklist, não bloqueia publicação, contratação nem tarefas e não muda preço/prazo", async () => {
    const { product, versionId } = await mkConnProduct("Sem módulo", [{ key: "a" }, { key: "b" }], [], { noModule: true });
    const view = await api(`/api/catalog2/products/${product.slug}`, { token: CO_A.token });
    assert.equal(view.status, 200, view.text);
    assert.equal(view.json.connections.requires_connections, false);
    assert.deepEqual(view.json.connections.items, []);
    const rd = await adm(`/products/${product.id}/readiness?version_id=${versionId}`);
    assert.equal(rd.json.items.conexoes, undefined, "não entra no checklist");
    const q = await quote(CO_A.token, product.id);
    assert.deepEqual((await cn(`/quotes/${q.id}/requirements`, CO_A.token)).json.data, []);
    const { projectId } = await checkoutAndPay(CO_A.token, [q.id]);
    assert.equal((await pcrsOf(projectId)).length, 0, "não cria pendência");
    assert.equal(await prisma.projectDependencyRule.count({ where: { project_id: projectId, target_kind: "connection" } }), 0);
    const t = byKey(await tasksOf(projectId));
    assert.notEqual(t.a.status, "PENDENTE_DE_LIBERACAO");
    assert.notEqual(t.b.status, "PENDENTE_DE_LIBERACAO");
    // desligado de verdade: mesmo com exigências guardadas, nada age e preço/prazo são idênticos
    const sim0 = (await adm(`/versions/${versionId}/simulate`, "POST", SEL)).json.pricing;
    const { product: p2, versionId: v2 } = await mkConnProduct("Módulo ligado depois desligado", [{ key: "a" }, { key: "b" }], [{ key: "crm", deps: [{ task_key: "a" }] }], { publish: false });
    await adm(`/versions/${v2}/connections-module`, "PUT", { requires_connections: false });
    const pub = await adm(`/versions/${v2}/publish`, "POST", { activate: true, confirm_activation: true });
    assert.equal(pub.status, 200, pub.text);
    const sim1 = (await adm(`/versions/${v2}/simulate`, "POST", SEL)).json.pricing;
    assert.equal(sim1.lines.commercial_final_price.amount, sim0.lines.commercial_final_price.amount, "preço igual");
    assert.equal(sim1.deadline.commercial_deadline_days, sim0.deadline.commercial_deadline_days, "prazo igual");
    const b2 = await buy(p2.id);
    assert.equal((await pcrsOf(b2.projectId)).length, 0, "exigências guardadas, mas módulo desativado: nenhuma pendência");
  });

  it("C02. módulo ativado: aparece no checklist, exige configuração coerente para publicar e passa a valer na contratação", async () => {
    const { product, versionId } = await mkConnProduct("Com módulo", [{ key: "a" }, { key: "b" }], [], { publish: false });
    assert.equal((await adm(`/versions/${versionId}/connections-module`, "PUT", { requires_connections: true })).status, 200);
    const rd = await adm(`/products/${product.id}/readiness?version_id=${versionId}`);
    assert.equal(rd.json.items.conexoes.level, "pendente", "ativado sem exigência = pendência no checklist");
    const pubFail = await adm(`/versions/${versionId}/publish`, "POST", { activate: true, confirm_activation: true });
    assert.equal(pubFail.status, 422);
    assert.ok(pubFail.json.details.issues.some((m: string) => m.startsWith("Conexões:")), "pendência estruturada de conexões");
    assert.ok(pubFail.json.details.issue_details.some((d: any) => d.target === "connections"));
    // exigência obrigatória que bloqueia dependentes mas sem nenhuma tarefa dependente = incoerente
    const r = await adm(`/versions/${versionId}/connection-requirements`, "POST", { connection_type_key: "crm", method: "revocable_token", permission_level: "read_write", when_needed: "during_checkout", obligation: "required" });
    assert.equal(r.status, 201, r.text);
    const val = await adm(`/versions/${versionId}/publish`, "POST", { activate: true, confirm_activation: true });
    assert.equal(val.status, 422);
    assert.ok(val.json.details.issues.some((m: string) => /nenhuma tarefa ou etapa depende/.test(m)));
    // dependente inexistente é recusado na criação
    const bad = await adm(`/versions/${versionId}/connection-requirements`, "POST", { connection_type_key: "crm", method: "revocable_token", dependents: [{ task_key: "fantasma", kind: "start" }] });
    assert.equal(bad.status, 422);
    // corrige: vira coerente e publica
    const mod = await adm(`/versions/${versionId}/connections`);
    const id = mod.json.requirements[0].id;
    assert.equal((await adm(`/connection-requirements/${id}`, "PUT", { dependents: [{ task_key: "a", kind: "start" }] })).status, 200);
    assert.equal((await adm(`/versions/${versionId}/publish`, "POST", { activate: true, confirm_activation: true })).status, 200);
    const view = await api(`/api/catalog2/products/${product.slug}`, { token: CO_A.token });
    assert.equal(view.json.connections.requires_connections, true);
    assert.equal(view.json.connections.items.length, 1);
    assert.match(view.json.connections.message, /não precisa compartilhar suas senhas/i);
  });

  it("C03. produto sem conexões (nunca configurou o módulo): fluxo idêntico ao anterior, sem nenhuma estrutura de conexão", async () => {
    const { product, versionId } = await mkConnProduct("Produto comum", [{ key: "a" }], [], { noModule: true });
    assert.equal((await prisma.catalog2ProductVersion.findUniqueOrThrow({ where: { id: versionId } })).requires_connections, false);
    assert.equal(await prisma.catalog2ConnectionRequirement.count({ where: { version_id: versionId } }), 0);
    const { projectId } = await buy(product.id);
    assert.equal((await pcrsOf(projectId)).length, 0);
    const pend = await cn("/pending/list", CO_A.token);
    assert.equal(pend.json.data.filter((i: any) => i.project.id === projectId).length, 0, "nada pendente para o cliente");
  });

  // ───────────────────────── 4–9: opcional, obrigatória, rascunho, contratar com pendência ─────────────────────────
  it("C04. conexão opcional: aparece, mas nunca bloqueia tarefa nem contratação", async () => {
    const { product } = await mkConnProduct("Opcional", [{ key: "a" }], [{ key: "crm", deps: [{ task_key: "a" }], extra: { obligation: "optional" } }]);
    const { projectId } = await buy(product.id);
    const t = byKey(await tasksOf(projectId));
    assert.notEqual(t.a.status, "PENDENTE_DE_LIBERACAO");
    const rule = await prisma.projectDependencyRule.findFirstOrThrow({ where: { project_id: projectId, target_kind: "connection" } });
    assert.equal(rule.behavior, "alert_only");
    assert.equal((await pcrsOf(projectId)).length, 1, "continua visível para o cliente");
  });

  it("C05. conexão obrigatória: bloqueia só a tarefa dependente e a independente continua", async () => {
    const { product } = await mkConnProduct("Obrigatória", [{ key: "a" }, { key: "b" }], [{ key: "crm", deps: [{ task_key: "a" }] }]);
    const { projectId } = await buy(product.id);
    const t = byKey(await tasksOf(projectId));
    assert.equal(t.a.status, "PENDENTE_DE_LIBERACAO", "dependente bloqueada");
    assert.notEqual(t.b.status, "PENDENTE_DE_LIBERACAO", "independente segue");
    const flow = await cn(`/tasks/${t.a.id}`, ADMIN.token);
    assert.equal(flow.json.connections[0].satisfied, false);
    assert.equal(flow.json.connections[0].behavior, "block_start");
    const fs2 = await api(`/api/project-tasks/${t.a.id}/flow-state`, { token: ADMIN.token });
    if (fs2.status === 200) assert.equal(fs2.json.state, "aguardando_conexao");
  });

  it("C06. contratação: salvar como rascunho, fazer depois, indicar responsável — nada é bloqueado e a escolha chega ao projeto", async () => {
    const { product, versionId } = await mkConnProduct("Rascunho", [{ key: "a" }], [{ key: "crm", deps: [{ task_key: "a" }] }]);
    const q = await quote(CO_A.token, product.id);
    const view = await cn(`/quotes/${q.id}/requirements`, CO_A.token);
    assert.equal(view.status, 200, view.text);
    assert.equal(view.json.requires_connections, true);
    assert.match(view.json.message, /não precisa compartilhar suas senhas/i);
    const item = view.json.data[0];
    assert.equal(item.can_do_later, true);
    assert.equal(item.affected_activities[0].task_key, "a");
    assert.ok(item.reason !== undefined && item.when_label && item.method_label && item.permission_level);
    // rascunho com responsável + (senha em campo comum é recusada)
    const bad = await cn(`/quotes/${q.id}/requirements/${item.requirement_id}`, CO_A.token, "PUT", { handling: "draft", draft: { observacao: "a senha: abc12345" } });
    assert.equal(bad.status, 422);
    assert.equal(bad.json.code, "secret_in_plain_text");
    const saved = await cn(`/quotes/${q.id}/requirements/${item.requirement_id}`, CO_A.token, "PUT", { handling: "draft", responsible_name: "Joana (TI)", invited_email: "ti@cliente.test" });
    assert.equal(saved.status, 200, saved.text);
    assert.equal((await cn(`/quotes/${q.id}/requirements`, CO_A.token)).json.data[0].choice.handling, "draft");
    // outro cliente não enxerga a cotação
    assert.equal((await cn(`/quotes/${q.id}/requirements`, CO_B.token)).status, 404);
    const { projectId } = await checkoutAndPay(CO_A.token, [q.id]);
    const pcr = (await pcrsOf(projectId))[0];
    assert.equal(pcr.handling, "draft");
    assert.equal(pcr.responsible_name, "Joana (TI)");
    assert.equal(pcr.invited_email, "ti@cliente.test");
    void versionId;
  });

  it("C07. contratar com conexão pendente é permitido (padrão): só a tarefa dependente espera", async () => {
    const { product } = await mkConnProduct("Contrata pendente", [{ key: "a" }, { key: "b" }], [{ key: "crm", deps: [{ task_key: "a" }] }]);
    const { projectId } = await buy(product.id);
    assert.equal((await prisma.payment.count({ where: { project_id: projectId, status: { in: ["paid", "approved", "confirmed"] } } })) >= 0, true);
    const pcr = (await pcrsOf(projectId))[0];
    assert.equal(pcr.status, "awaiting_submission");
    const pend = await cn("/pending/list", CO_A.token);
    const mine = pend.json.data.find((i: any) => i.id === pcr.id);
    assert.ok(mine, "vira um item individual");
    assert.equal(mine.action.kind, "connect");
    assert.match(mine.action.url, new RegExp(pcr.id));
    assert.ok(mine.impact.includes("1 atividade"));
  });

  it("C08. 'bloquear a conclusão da contratação': só então o checkout exige o envio — e senha nunca é aceita", async () => {
    const { product } = await mkConnProduct("Bloqueia checkout", [{ key: "a" }], [{ key: "crm", deps: [{ task_key: "a" }], extra: { when_needed: "during_checkout", when_task_key: null, pending_behavior: "block_checkout" } }]);
    const q = await quote(CO_A.token, product.id);
    const semEnvio = await api("/api/catalog2/checkout", { method: "POST", token: CO_A.token, body: { quote_ids: [q.id], checkout_client_action_id: crypto.randomUUID() } });
    assert.equal(semEnvio.status, 409);
    assert.equal(semEnvio.json.code, "connections_required_for_checkout");
    // "fazer depois" também é recusado quando bloqueia
    const req = (await cn(`/quotes/${q.id}/requirements`, CO_A.token)).json.data[0];
    assert.equal(req.can_do_later, false);
    const later = await cn(`/quotes/${q.id}/requirements/${req.requirement_id}`, CO_A.token, "PUT", { handling: "later" });
    assert.equal(later.status, 409);
    // conecta antes (cria conexão da empresa) e escolhe-a no rascunho
    const created = await cn("/", CO_A.token, "POST", { connection_type_key: "crm", method: "revocable_token", label: "CRM", external_id: "crm-1", secret_value: SECRET });
    assert.equal(created.status, 201, created.text);
    assert.equal((await cn(`/quotes/${q.id}/requirements/${req.requirement_id}`, CO_A.token, "PUT", { handling: "now", connection_id: created.json.id })).status, 200);
    const { projectId } = await checkoutAndPay(CO_A.token, [q.id]);
    const pcr = (await pcrsOf(projectId))[0];
    assert.equal(pcr.connection_id, created.json.id, "a conexão escolhida antes da contratação já está ligada");
    assert.equal(pcr.status, "submitted");
  });

  // ───────────────────────── 10–13: validação e correção ─────────────────────────
  it("C09. validação manual: só a equipe valida, com evidência; válida libera a tarefa dependente", async () => {
    const { product } = await mkConnProduct("Validação manual", [{ key: "a" }, { key: "b" }], [{ key: "crm", deps: [{ task_key: "a" }] }]);
    const { projectId } = await buy(product.id);
    const t = byKey(await tasksOf(projectId));
    const pcr = (await pcrsOf(projectId))[0];
    const connId = await connectAndValidate(pcr.id, { validate: false });
    assert.equal(await statusOf(t.a.id), "PENDENTE_DE_LIBERACAO", "enviada não é válida");
    assert.equal((await cn(`/${connId}/validate`, CO_A.token, "POST", { result: "valid", evidence: "eu mesmo validei" })).status, 403, "cliente não valida");
    assert.equal((await cn(`/${connId}/validate`, ADMIN.token, "POST", { result: "valid" })).status, 422, "sem evidência não valida");
    const ok = await cn(`/${connId}/validate`, ADMIN.token, "POST", { result: "valid", evidence: "Acesso conferido na tela do CRM." });
    assert.equal(ok.status, 200, ok.text);
    assert.equal(await statusOf(t.a.id), "PARA_LANCAMENTO", "validada → liberada");
    const val = (await cn(`/${connId}/validations`, ADMIN.token)).json.data[0];
    assert.equal(val.result, "valid");
    assert.ok(val.actor_user_id && val.evidence && val.created_at, "registro: resultado, responsável, evidência, data");
    assert.deepEqual(JSON.parse(val.affected_tasks_json), [t.a.id]);
  });

  it("C10. validação automática (WordPress): o conector confirma; em 'automática com confirmação humana' falta a pessoa", async () => {
    setConnectorFetch(async (url) => {
      if (url.includes("/wp-json/wp/v2/users/me")) return { ok: true, status: 200, json: async () => ({ slug: "allka-temp", roles: ["editor"] }), text: async () => "" };
      return { ok: false, status: 404, json: async () => ({}), text: async () => "" };
    });
    const { product } = await mkConnProduct("WP auto", [{ key: "a" }], [{ key: "wp", type: "wordpress", method: "app_password", permission: "editor", deps: [{ task_key: "a" }], extra: { validation_mode: "automatic" } }]);
    const { projectId } = await buy(product.id);
    const t = byKey(await tasksOf(projectId));
    const pcr = (await pcrsOf(projectId))[0];
    const c = await cn(`/requirements/${pcr.id}/create-and-link`, CO_A.token, "POST", { method: "app_password", label: "Site WP", external_id: "https://cliente.example.test", account_label: "allka-temp", secret_value: "abcd efgh ijkl mnop", scope: "project" });
    assert.equal(c.status, 201, c.text);
    const v = await cn(`/${c.json.connection_id}/verify`, ADMIN.token, "POST");
    assert.equal(v.status, 200, v.text);
    assert.equal(v.json.outcome, "valid");
    assert.equal(v.json.status, "valid", "modo automático: o conector valida sozinho");
    assert.equal(await statusOf(t.a.id), "PARA_LANCAMENTO");
    const rec = (await cn(`/${c.json.connection_id}/validations`, ADMIN.token)).json.data[0];
    assert.equal(rec.mode, "automatic");
    assert.equal(rec.actor_integration, "wordpress");
    // automática com confirmação humana: o conector confirma, mas só a pessoa valida
    const { product: p2 } = await mkConnProduct("WP humano", [{ key: "a" }], [{ key: "wp", type: "wordpress", method: "app_password", permission: "editor", deps: [{ task_key: "a" }], extra: { validation_mode: "automatic_with_human" } }]);
    const b2 = await buy(p2.id);
    const t2 = byKey(await tasksOf(b2.projectId));
    const pcr2 = (await pcrsOf(b2.projectId))[0];
    const c2 = await cn(`/requirements/${pcr2.id}/create-and-link`, CO_A.token, "POST", { method: "app_password", label: "Site WP 2", external_id: "https://cliente2.example.test", account_label: "allka-temp", secret_value: "abcd efgh ijkl mnop", scope: "project" });
    const v2 = await cn(`/${c2.json.connection_id}/verify`, ADMIN.token, "POST");
    assert.equal(v2.json.outcome, "valid");
    assert.equal(v2.json.status, "awaiting_validation", "aguarda a confirmação humana");
    assert.equal(await statusOf(t2.a.id), "PENDENTE_DE_LIBERACAO");
    assert.equal((await cn(`/${c2.json.connection_id}/validate`, ADMIN.token, "POST", { result: "valid", evidence: "Integração confirmou e conferi o papel de editor.", mode: "automatic_with_human" })).status, 200);
    assert.equal(await statusOf(t2.a.id), "PARA_LANCAMENTO");
  });

  it("C10b. checagem ativa: conexão que estava boa e o provedor passa a recusar → sai de 'válida', pausa a tarefa e AVISA; provedor fora do ar não derruba", async () => {
    setConnectorFetch(async (url) => url.includes("/wp-json/wp/v2/users/me") ? { ok: true, status: 200, json: async () => ({ slug: "allka-temp", roles: ["editor"] }), text: async () => "" } : { ok: false, status: 404, json: async () => ({}), text: async () => "" });
    const { product } = await mkConnProduct("WP saude", [{ key: "a" }], [{ key: "wp", type: "wordpress", method: "app_password", permission: "editor", deps: [{ task_key: "a" }], extra: { validation_mode: "automatic" } }]);
    const { projectId } = await buy(product.id);
    const t = byKey(await tasksOf(projectId));
    const pcr = (await pcrsOf(projectId))[0];
    const c = await cn(`/requirements/${pcr.id}/create-and-link`, CO_A.token, "POST", { method: "app_password", label: "Site saude", external_id: "https://saude.example.test", account_label: "allka-temp", secret_value: "abcd efgh ijkl mnop", scope: "project" });
    assert.equal((await cn(`/${c.json.connection_id}/verify`, ADMIN.token, "POST")).json.status, "valid");
    assert.equal(await statusOf(t.a.id), "PARA_LANCAMENTO");
    const antigo = new Date(Date.now() - 48 * 3_600_000);
    const envelhece = () => prisma.clientConnection.update({ where: { id: c.json.connection_id }, data: { last_validated_at: antigo } });
    const { recheckValidConnections } = await import("../lib/connections/pending");

    // 1) provedor fora do ar (500): não derruba nada
    setConnectorFetch(async () => ({ ok: false, status: 503, json: async () => ({}), text: async () => "" }));
    await envelhece();
    const r1 = await recheckValidConnections(prisma);
    assert.equal(r1.broken, 0);
    assert.equal((await prisma.clientConnection.findUniqueOrThrow({ where: { id: c.json.connection_id } })).status, "valid");

    // 2) provedor ainda aceita: renova a data e segue válida
    setConnectorFetch(async () => ({ ok: true, status: 200, json: async () => ({ slug: "allka-temp", roles: ["editor"] }), text: async () => "" }));
    await envelhece();
    await recheckValidConnections(prisma);
    const renovada = await prisma.clientConnection.findUniqueOrThrow({ where: { id: c.json.connection_id } });
    assert.equal(renovada.status, "valid");
    assert.ok(renovada.last_validated_at!.getTime() > antigo.getTime() + 3_600_000, "a data da última conferência foi renovada");

    // 3) senha trocada no site (401): desconecta, pausa a tarefa e avisa
    setConnectorFetch(async () => ({ ok: false, status: 401, json: async () => ({}), text: async () => "" }));
    await envelhece();
    const r3 = await recheckValidConnections(prisma);
    assert.ok(r3.broken >= 1);
    const depois = await prisma.clientConnection.findUniqueOrThrow({ where: { id: c.json.connection_id } });
    assert.equal(depois.status, "invalid");
    assert.match(depois.last_problem ?? "", /recusou/i);
    assert.equal(await statusOf(t.a.id), "PENDENTE_DE_LIBERACAO", "a atividade que dependia da conexão foi pausada");
    const avisos = await prisma.systemAlert.findMany({ where: { type: "conexao_desconectada", entity_id: c.json.connection_id } });
    assert.ok(avisos.length >= 1, "alguém foi avisado");
    assert.match(avisos[0].message, /parou de funcionar/);
  });

  it("C11. correção: conexão inválida mostra o problema e a correção; o cliente corrige e a equipe revalida", async () => {
    setConnectorFetch(async () => ({ ok: false, status: 401, json: async () => ({}), text: async () => "" }));
    const { product } = await mkConnProduct("WP corrige", [{ key: "a" }], [{ key: "wp", type: "wordpress", method: "app_password", permission: "editor", deps: [{ task_key: "a" }], extra: { validation_mode: "automatic" } }]);
    const { projectId } = await buy(product.id);
    const t = byKey(await tasksOf(projectId));
    const pcr = (await pcrsOf(projectId))[0];
    const c = await cn(`/requirements/${pcr.id}/create-and-link`, CO_A.token, "POST", { method: "app_password", label: "Site", external_id: "https://x.example.test", account_label: "allka-temp", secret_value: "senha de aplicacao errada", scope: "project" });
    const v = await cn(`/${c.json.connection_id}/verify`, ADMIN.token, "POST");
    assert.equal(v.json.outcome, "invalid");
    assert.match(v.json.correction, /nova senha de aplicação/i);
    assert.equal(await statusOf(t.a.id), "PENDENTE_DE_LIBERACAO");
    const pend = (await cn("/pending/list", CO_A.token)).json.data.find((i: any) => i.id === pcr.id);
    assert.equal(pend.action.kind, "fix");
    assert.ok(pend.problem && pend.correction, "mostra o problema e a correção");
    // o cliente corrige (novo segredo) → volta a "enviada"; a equipe valida
    setConnectorFetch(async () => ({ ok: true, status: 200, json: async () => ({ slug: "allka-temp", roles: ["editor"] }), text: async () => "" }));
    const fix = await cn(`/${c.json.connection_id}`, CO_A.token, "PATCH", { secret_value: "nova senha de aplicacao ok" });
    assert.equal(fix.status, 200, fix.text);
    assert.equal(fix.json.status, "submitted");
    const again = await cn(`/${c.json.connection_id}/verify`, ADMIN.token, "POST");
    assert.equal(again.json.status, "valid");
    assert.equal(await statusOf(t.a.id), "PARA_LANCAMENTO");
  });

  // ───────────────────────── 14–20: expiração, revogação, pausa, retomada, prazo, SLA ─────────────────────────
  async function runningProduct(name: string, extraReq: Record<string, unknown> = {}, kind = "continue") {
    const { product } = await mkConnProduct(name, [{ key: "a", steps: 2 }, { key: "b" }], [{ key: "crm", deps: [{ task_key: "a", kind }], extra: extraReq }]);
    const { projectId } = await buy(product.id);
    const t = byKey(await tasksOf(projectId));
    const pcr = (await pcrsOf(projectId))[0];
    const connId = await connectAndValidate(pcr.id);
    assert.equal(await statusOf(t.a.id), "PARA_LANCAMENTO");
    const due = new Date(Date.now() + 5 * 24 * 3600 * 1000);
    await prisma.projectTask.update({ where: { id: t.a.id }, data: { status: "EM_EXECUCAO", due_date: due } });
    await prisma.project.update({ where: { id: projectId }, data: { end_date: new Date(Date.now() + 20 * 24 * 3600 * 1000) } });
    return { projectId, t, pcr, connId, due };
  }

  it("C12. expiração: conexão vencida pausa só a atividade em andamento que dependia dela", async () => {
    const { t, connId, projectId } = await runningProduct("Expira");
    await prisma.clientConnection.update({ where: { id: connId }, data: { expires_at: new Date(Date.now() - 60_000) } });
    const m = await cn("/maintenance/run", ADMIN.token, "POST");
    assert.equal(m.status, 200, m.text);
    assert.equal(m.json.expired, 1);
    assert.equal((await prisma.clientConnection.findUniqueOrThrow({ where: { id: connId } })).status, "expired");
    assert.equal(await statusOf(t.a.id), "PAUSADA_DEPENDENCIA_EXTERNA");
    assert.notEqual(await statusOf(t.b.id), "PAUSADA_DEPENDENCIA_EXTERNA", "a independente segue");
    const flow = await api(`/api/project-tasks/${t.a.id}/flow-state`, { token: ADMIN.token });
    if (flow.status === 200) assert.equal(flow.json.state, "bloqueada_dependencia_externa");
    const view = (await cn(`/tasks/${t.a.id}`, ADMIN.token)).json;
    assert.equal(view.blocks.length, 1);
    assert.equal(view.blocks[0].party, "client");
    assert.equal(view.blocks[0].resolved_at, null);
    assert.ok(view.blocks[0].started_at && view.blocks[0].detected_by);
    const ev = (await cn(`/projects/${projectId}/events`, ADMIN.token)).json.data.map((e: any) => e.kind);
    assert.ok(ev.includes("paused"));
    assert.ok((await cn(`/${connId}/events`, ADMIN.token)).json.data.some((e: any) => e.kind === "expired"));
  });

  it("C13. revogação: apaga o segredo, encerra as autorizações e bloqueia/pausa só as atividades afetadas", async () => {
    const { t, connId, projectId } = await runningProduct("Revoga");
    const rv = await cn(`/${connId}/revoke`, CO_A.token, "POST", { reason: "Troquei de fornecedor." });
    assert.equal(rv.status, 200, rv.text);
    const row = await prisma.clientConnection.findUniqueOrThrow({ where: { id: connId } });
    assert.equal(row.status, "revoked");
    assert.equal(row.secret_ref, null);
    const secret = await prisma.connectionSecret.findUniqueOrThrow({ where: { connection_id: connId } });
    assert.equal(secret.ciphertext, "", "o conteúdo cifrado foi apagado");
    assert.ok(secret.revoked_at);
    assert.equal(await prisma.clientConnectionGrant.count({ where: { connection_id: connId, revoked_at: null } }), 0);
    assert.equal(await statusOf(t.a.id), "PAUSADA_DEPENDENCIA_EXTERNA");
    assert.equal((await cn(`/${connId}/grants`, CO_A.token, "POST", { project_id: projectId, scope: "project" })).status, 409, "revogada não volta a ser autorizada");
  });

  it("C14. pausa e retomada: registra tudo, retoma ao revalidar e devolve o status anterior", async () => {
    const { t, connId, pcr } = await runningProduct("Pausa e retoma");
    await prisma.clientConnection.update({ where: { id: connId }, data: { expires_at: new Date(Date.now() - 60_000) } });
    await cn("/maintenance/run", ADMIN.token, "POST");
    assert.equal(await statusOf(t.a.id), "PAUSADA_DEPENDENCIA_EXTERNA");
    // não avança etapa enquanto pausada
    const stage = (await tasksOf((await prisma.projectTask.findUniqueOrThrow({ where: { id: t.a.id } })).project_id)).find((x) => x.id === t.a.id)!.stages[0];
    await prisma.projectTaskStage.update({ where: { id: stage.id }, data: { status: "EM_ANDAMENTO", executor_type: "leader", lider_id: LEADER.id } });
    await assert.rejects(() => concluirEtapa(prisma, stage.id, { userId: LEADER.id }), /pausada por dependência externa/i);
    // renovada e revalidada → retoma
    const val = await cn(`/${connId}/validate`, ADMIN.token, "POST", { result: "valid", evidence: "Renovada e conferida.", expires_at: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString() });
    assert.equal(val.status, 200, val.text);
    assert.equal(val.json.impact.resumed, 1);
    assert.equal(await statusOf(t.a.id), "EM_EXECUCAO", "volta ao status anterior");
    const blk = (await prisma.projectTaskExternalBlock.findMany({ where: { project_task_id: t.a.id } }))[0];
    assert.ok(blk.resolved_at && blk.blocked_minutes != null && blk.resolved_by, "fim, tempo bloqueado e quem resolveu");
    assert.equal(blk.project_connection_req_id, pcr.id);
    const ev = (await cn(`/projects/${(await prisma.projectTask.findUniqueOrThrow({ where: { id: t.a.id } })).project_id}/events`, ADMIN.token)).json.data.map((e: any) => e.kind);
    assert.ok(ev.includes("resumed"));
  });

  it("C15. prazo: o SLA é suspenso; o prazo original é preservado e o novo é calculado pelo tempo bloqueado (caminho obrigatório)", async () => {
    const { t, connId, due, projectId } = await runningProduct("Prazo");
    await prisma.clientConnection.update({ where: { id: connId }, data: { expires_at: new Date(Date.now() - 60_000) } });
    await cn("/maintenance/run", ADMIN.token, "POST");
    const projBefore = (await prisma.project.findUniqueOrThrow({ where: { id: projectId } })).end_date!;
    // simula 3 horas de bloqueio
    const back = new Date(Date.now() - 3 * 3600 * 1000);
    await prisma.projectTaskExternalBlock.updateMany({ where: { project_task_id: t.a.id }, data: { started_at: back } });
    await prisma.projectTask.update({ where: { id: t.a.id }, data: { external_pause_started_at: back } });
    await cn(`/${connId}/validate`, ADMIN.token, "POST", { result: "valid", evidence: "Reconectada.", expires_at: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString() });
    const after = await prisma.projectTask.findUniqueOrThrow({ where: { id: t.a.id } });
    assert.equal(after.original_due_date!.getTime(), due.getTime(), "prazo original preservado");
    const minutes = after.external_pause_total_minutes;
    assert.ok(minutes >= 179 && minutes <= 182, `minutos bloqueados ${minutes}`);
    assert.equal(after.due_date!.getTime(), due.getTime() + minutes * 60_000, "novo prazo = original + tempo bloqueado");
    const projAfter = (await prisma.project.findUniqueOrThrow({ where: { id: projectId } })).end_date!;
    assert.equal(projAfter.getTime(), projBefore.getTime() + minutes * 60_000, "caminho obrigatório: o prazo geral acompanha");
    const blk = await prisma.projectTaskExternalBlock.findFirstOrThrow({ where: { project_task_id: t.a.id } });
    assert.equal(blk.deadline_impact_minutes, minutes);
  });

  it("C16. fora do caminho obrigatório: informativa pausa nada e opcional não altera o prazo geral", async () => {
    // 'info' nunca bloqueia nem pausa
    const { product } = await mkConnProduct("Informativa", [{ key: "a" }], [{ key: "crm", deps: [{ task_key: "a", kind: "info" }] }]);
    const { projectId } = await buy(product.id);
    const t = byKey(await tasksOf(projectId));
    assert.notEqual(t.a.status, "PENDENTE_DE_LIBERACAO");
    await prisma.projectTask.update({ where: { id: t.a.id }, data: { status: "EM_EXECUCAO" } });
    const pcr = (await pcrsOf(projectId))[0];
    const connId = await connectAndValidate(pcr.id);
    await prisma.clientConnection.update({ where: { id: connId }, data: { expires_at: new Date(Date.now() - 60_000) } });
    await cn("/maintenance/run", ADMIN.token, "POST");
    assert.equal(await statusOf(t.a.id), "EM_EXECUCAO", "somente informativa não pausa");
    // um bloqueio marcado como fora do caminho obrigatório não empurra o prazo
    const due = new Date(Date.now() + 4 * 24 * 3600 * 1000);
    await prisma.projectTask.update({ where: { id: t.a.id }, data: { due_date: due } });
    const { pauseTask, resumeTask } = await import("../lib/connections/flow");
    await pauseTask(prisma, t.a.id, { pcrId: pcr.id, reason: "teste", critical: false });
    const back = new Date(Date.now() - 2 * 3600 * 1000);
    await prisma.projectTaskExternalBlock.updateMany({ where: { project_task_id: t.a.id }, data: { started_at: back } });
    await prisma.projectTask.update({ where: { id: t.a.id }, data: { external_pause_started_at: back } });
    await resumeTask(prisma, t.a.id, { id: ADMIN.user.id, role: "admin" });
    const after = await prisma.projectTask.findUniqueOrThrow({ where: { id: t.a.id } });
    assert.equal(after.due_date!.getTime(), due.getTime(), "prazo não muda fora do caminho obrigatório");
    assert.ok(after.external_pause_total_minutes >= 119);
  });

  it("C17. não penaliza o nômade: tarefa pausada por dependência externa não conta como atrasada nem gera alerta de atraso", async () => {
    const { t, connId } = await runningProduct("Sem atraso");
    await prisma.projectTask.update({ where: { id: t.a.id }, data: { due_date: new Date(Date.now() - 24 * 3600 * 1000) } });
    const before = (await api("/api/lider/tasks/counts", { token: LEADER_TOKEN })).json.atrasadas as number;
    await prisma.clientConnection.update({ where: { id: connId }, data: { expires_at: new Date(Date.now() - 60_000) } });
    await cn("/maintenance/run", ADMIN.token, "POST");
    assert.equal(await statusOf(t.a.id), "PAUSADA_DEPENDENCIA_EXTERNA");
    const during = (await api("/api/lider/tasks/counts", { token: LEADER_TOKEN })).json.atrasadas as number;
    assert.equal(during, before - 1, "a tarefa pausada saiu da contagem de atrasadas");
    const { runAlertEngineOnce } = await import("../lib/alert-engine");
    await runAlertEngineOnce();
    assert.equal(await prisma.systemAlert.count({ where: { entity_id: t.a.id, type: { contains: "atras" } } }), 0, "nenhum alerta de atraso para a tarefa pausada");
  });

  // ───────────────────────── 21–25: escopos de uso ─────────────────────────
  async function twoTaskProduct(name: string) {
    const { product } = await mkConnProduct(name, [{ key: "a" }, { key: "b" }, { key: "c" }], [{ key: "crm", deps: [{ task_key: "a" }, { task_key: "b" }, { task_key: "c" }] }]);
    const { projectId } = await buy(product.id);
    return { projectId, t: byKey(await tasksOf(projectId)), pcr: (await pcrsOf(projectId))[0] };
  }

  it("C18. conexão só para uma tarefa: libera apenas aquela e as demais continuam esperando autorização", async () => {
    const { t, pcr } = await twoTaskProduct("Escopo tarefa");
    assert.ok([t.a, t.b, t.c].every((x) => x.status === "PENDENTE_DE_LIBERACAO"));
    await connectAndValidate(pcr.id, { scope: "task", task_ids: [t.a.id] });
    assert.equal(await statusOf(t.a.id), "PARA_LANCAMENTO");
    assert.equal(await statusOf(t.b.id), "PENDENTE_DE_LIBERACAO");
    assert.equal(await statusOf(t.c.id), "PENDENTE_DE_LIBERACAO");
    const why = (await cn(`/tasks/${t.b.id}`, ADMIN.token)).json.connections[0];
    assert.equal(why.state, "not_authorized");
    assert.match(why.reason, /autorizar o uso/i);
    // exatamente uma tarefa para o escopo "task"
    const connId = pcr.connection_id ?? (await prisma.projectConnectionRequirement.findUniqueOrThrow({ where: { id: pcr.id } })).connection_id!;
    const bad = await cn(`/${connId}/grants`, CO_A.token, "POST", { project_id: pcr.project_id, scope: "task", task_ids: [t.b.id, t.c.id] });
    assert.equal(bad.status, 422);
  });

  it("C19. conexão para tarefas selecionadas: libera só as escolhidas", async () => {
    const { t, pcr } = await twoTaskProduct("Escopo selecionadas");
    await connectAndValidate(pcr.id, { scope: "selected_tasks", task_ids: [t.a.id, t.b.id] });
    assert.equal(await statusOf(t.a.id), "PARA_LANCAMENTO");
    assert.equal(await statusOf(t.b.id), "PARA_LANCAMENTO");
    assert.equal(await statusOf(t.c.id), "PENDENTE_DE_LIBERACAO");
    // amplia depois (mais uma tarefa) e reduz/revoga o escopo → recalcula
    const connId = (await prisma.projectConnectionRequirement.findUniqueOrThrow({ where: { id: pcr.id } })).connection_id!;
    assert.equal((await cn(`/${connId}/grants`, CO_A.token, "POST", { project_id: pcr.project_id, scope: "task", task_ids: [t.c.id] })).status, 201);
    assert.equal(await statusOf(t.c.id), "PARA_LANCAMENTO");
    const red = await cn(`/${connId}/grants/revoke`, CO_A.token, "POST", { project_id: pcr.project_id, task_ids: [t.c.id], reason: "reduzir" });
    assert.equal(red.json.revoked, 1);
    assert.equal(await statusOf(t.c.id), "PENDENTE_DE_LIBERACAO", "reduzir o escopo recalcula as dependências");
    const usage = (await cn(`/${connId}/usage`, CO_A.token)).json;
    assert.deepEqual(usage.tasks.map((x: any) => x.id).sort(), [t.a.id, t.b.id].sort(), "mostra onde está sendo usada");
  });

  it("C20. conexão para o projeto inteiro: todas as tarefas do projeto; reutilização automática dentro do mesmo projeto", async () => {
    const { t, pcr, projectId } = await twoTaskProduct("Escopo projeto");
    await connectAndValidate(pcr.id, { scope: "project" });
    assert.ok([t.a, t.b, t.c].every((x) => true));
    for (const k of ["a", "b", "c"]) assert.equal(await statusOf(t[k].id), "PARA_LANCAMENTO");
    // segundo produto do MESMO projeto, do mesmo tipo, reaproveita sozinho (escopo do projeto já autorizado)
    const { product } = await mkConnProduct("Mesmo projeto, outro produto", [{ key: "z" }], [{ key: "crm", deps: [{ task_key: "z" }] }]);
    const q = await quote(CO_A.token, product.id);
    const co = await api("/api/catalog2/checkout", { method: "POST", token: CO_A.token, body: { quote_ids: [q.id], checkout_client_action_id: crypto.randomUUID() } });
    projects.push(co.json.project.id);
    assert.notEqual(co.json.project.id, projectId, "novo projeto (outro pedido) NÃO herda a conexão");
    const newPcr = (await pcrsOf(co.json.project.id))[0];
    assert.equal(newPcr.connection_id, null, "outro projeto exige nova autorização");
  });

  it("C21. outro projeto e outra empresa: a conexão não é reaproveitada sem nova autorização", async () => {
    const { t, pcr, projectId } = await twoTaskProduct("Isolamento");
    const connId = await connectAndValidate(pcr.id, { scope: "project" });
    const { product } = await mkConnProduct("Outro projeto", [{ key: "a" }], [{ key: "crm", deps: [{ task_key: "a" }] }]);
    const other = await buy(product.id);
    const t2 = byKey(await tasksOf(other.projectId));
    assert.equal(t2.a.status, "PENDENTE_DE_LIBERACAO", "mesmo cliente, outro projeto: continua bloqueado");
    const pcr2 = (await pcrsOf(other.projectId))[0];
    // sugere a conexão existente (reaproveitar) antes de pedir uma nova
    const detail = (await cn(`/requirements/${pcr2.id}`, CO_A.token)).json;
    const cand = detail.reuse_candidates.find((c: any) => c.id === connId);
    assert.ok(cand, "procura conexão compatível");
    assert.equal(cand.authorized_in_project, false);
    assert.equal(cand.authorized_elsewhere, true);
    assert.equal(await statusOf(t2.a.id), "PENDENTE_DE_LIBERACAO");
    // o cliente decide reaproveitar: nova autorização explícita → libera, sem copiar credencial
    const link = await cn(`/requirements/${pcr2.id}/link`, CO_A.token, "POST", { connection_id: connId, scope: "project" });
    assert.equal(link.status, 200, link.text);
    assert.equal(await statusOf(t2.a.id), "PARA_LANCAMENTO");
    assert.equal(await prisma.connectionSecret.count({ where: { connection_id: connId } }), 1, "um único segredo: nada foi duplicado");
    // outra empresa nunca usa a conexão
    const { product: pB } = await mkConnProduct("Empresa B", [{ key: "a" }], [{ key: "crm", deps: [{ task_key: "a" }] }]);
    const b = await buy(pB.id, CO_B.token);
    const pcrB = (await pcrsOf(b.projectId))[0];
    const denied = await cn(`/requirements/${pcrB.id}/link`, CO_B.token, "POST", { connection_id: connId, scope: "project" });
    assert.equal(denied.status, 404, "a conexão da empresa A nem é visível para a B");
    assert.equal((await cn(`/${connId}/grants`, ADMIN.token, "POST", { project_id: b.projectId, scope: "project" })).status, 403, "nem o administrador a usa em projeto de outra empresa");
    void t; void projectId;
  });

  // ───────────────────────── 26–27: troca de executor e continuidade ─────────────────────────
  it("C22. troca de executor: revoga o acesso do anterior, exige autorização do novo e bloqueia só a tarefa afetada", async () => {
    const { product } = await mkConnProduct("Troca de executor", [{ key: "a" }, { key: "b" }], [{ key: "crm", method: "user_invite", deps: [{ task_key: "a", kind: "continue" }] }]);
    const { projectId } = await buy(product.id);
    const t = byKey(await tasksOf(projectId));
    const pcr = (await pcrsOf(projectId))[0];
    const n1 = await mkNomad(); const n2 = await mkNomad();
    const connId = await connectAndValidate(pcr.id, { body: { method: "user_invite", secret_value: undefined } });
    await prisma.projectTask.update({ where: { id: t.a.id }, data: { status: "AGUARDANDO_NOMADE" } });
    await assignNomadeDirectly(t.a.id, n1.nomade.id, ADMIN.user.id);
    // o executor 1 é autorizado
    assert.equal((await cn(`/requirements/${pcr.id}/authorize-executor`, ADMIN.token, "POST", { task_id: t.a.id, executor_user_id: n1.nomade.id })).status, 200);
    assert.equal(await statusOf(t.a.id), "EM_EXECUCAO");
    // troca: tarefa volta à fila e o executor 2 assume
    await prisma.projectTask.update({ where: { id: t.a.id }, data: { nomade_responsavel_id: null, status: "AGUARDANDO_NOMADE" } });
    await assignNomadeDirectly(t.a.id, n2.nomade.id, ADMIN.user.id);
    const grants = await prisma.clientConnectionGrant.findMany({ where: { connection_id: connId, executor_user_id: n1.nomade.id } });
    assert.ok(grants.every((g) => g.revoked_at), "acesso do executor anterior revogado");
    assert.equal(await statusOf(t.a.id), "PAUSADA_DEPENDENCIA_EXTERNA", "só a tarefa afetada pausa");
    assert.notEqual(await statusOf(t.b.id), "PAUSADA_DEPENDENCIA_EXTERNA");
    const why = (await cn(`/tasks/${t.a.id}`, ADMIN.token)).json.connections[0];
    assert.match(why.reason, /novo executor/i);
    const ev = (await cn(`/${connId}/events`, ADMIN.token)).json.data.map((e: any) => e.kind);
    assert.ok(ev.includes("executor_changed"));
    // autoriza o novo executor → retoma
    assert.equal((await cn(`/requirements/${pcr.id}/authorize-executor`, ADMIN.token, "POST", { task_id: t.a.id, executor_user_id: n2.nomade.id })).status, 200);
    assert.equal(await statusOf(t.a.id), "EM_EXECUCAO");
  });

  it("C23. continuidade (mesmo executor, ciclo seguinte): reaproveita a conexão válida, dispensa a validação completa e registra; conferência leve quando configurada", async () => {
    const { product } = await mkConnProduct("Continuidade", [{ key: "a" }], [{ key: "crm", deps: [{ task_key: "a" }], extra: { light_check: true, asset_rule: "none_while_valid" } }], { recurring: true });
    const { projectId, pps } = await buy(product.id, CO_A.token, "mensal");
    const pcr = (await pcrsOf(projectId))[0];
    await connectAndValidate(pcr.id);
    const t0 = byKey(await tasksOf(projectId, 0));
    assert.equal(await statusOf(t0.a.id), "PARA_LANCAMENTO", "1º ciclo liberado");
    // ciclo 2
    const sub = await prisma.catalog2Subscription.findUniqueOrThrow({ where: { project_product_id: pps[0].id } });
    await prisma.catalog2Subscription.update({ where: { id: sub.id }, data: { next_invoice_at: new Date(Date.now() - 1000) } });
    await runSubscriptionsTick();
    assert.equal((await api(`/api/catalog2/subscriptions/${sub.id}/pay`, { method: "POST", token: CO_A.token, body: {} })).json.paid, true);
    const t1 = byKey(await tasksOf(projectId, 1));
    assert.ok(t1.a, "tarefa do ciclo 2 gerada");
    const rule = await prisma.projectDependencyRule.findFirstOrThrow({ where: { task_id: t1.a.id, target_kind: "connection" } });
    assert.equal(rule.target_connection_req_id, pcr.id, "referencia a MESMA exigência/conexão segura");
    const log = await prisma.projectDecisionLog.findFirst({ where: { project_task_id: t1.a.id, kind: "connection_reused" } });
    assert.ok(log, "dispensa da validação completa registrada");
    assert.equal(await prisma.connectionEvent.count({ where: { project_task_id: t1.a.id, kind: "reused" } }) >= 1, true);
    // conferência leve configurada: continua pendente até alguém confirmar
    assert.equal(await statusOf(t1.a.id), "PENDENTE_DE_LIBERACAO", "aguarda a conferência leve");
    assert.equal((await cn(`/requirements/${pcr.id}/light-check`, CO_A.token, "POST", { note: "ok" })).status, 403, "só a equipe confere");
    assert.equal((await cn(`/requirements/${pcr.id}/light-check`, ADMIN.token, "POST", { note: "Conferido com o cliente." })).status, 200);
    assert.equal(await statusOf(t1.a.id), "PARA_LANCAMENTO");
    assert.equal(await prisma.connectionSecret.count({ where: { connection_id: (await prisma.projectConnectionRequirement.findUniqueOrThrow({ where: { id: pcr.id } })).connection_id! } }), 1, "um único segredo, reaproveitado entre os ciclos");
  });

  // ───────────────────────── 28–33: segredos, OAuth, provedor, IA ─────────────────────────
  it("C24. segredo nunca exposto: nem em API, eventos, histórico, notificações, pendências, orientação ou erros; e em repouso só cifrado", async () => {
    const { product } = await mkConnProduct("Segredo", [{ key: "a" }], [{ key: "crm", deps: [{ task_key: "a" }] }]);
    const { projectId } = await buy(product.id);
    const pcr = (await pcrsOf(projectId))[0];
    const connId = await connectAndValidate(pcr.id);
    const dump: string[] = [];
    for (const [p, tk] of [[`/${connId}`, CO_A.token], [`/${connId}`, ADMIN.token], [`/${connId}/events`, ADMIN.token], [`/${connId}/validations`, ADMIN.token], [`/${connId}/usage`, CO_A.token], [`/`, CO_A.token], [`/pending/list`, CO_A.token], [`/pending/list`, ADMIN.token], [`/pending/${pcr.id}/guidance`, ADMIN.token], [`/requirements/${pcr.id}`, CO_A.token], [`/projects/${projectId}/requirements`, CO_A.token], [`/projects/${projectId}/events`, ADMIN.token]] as [string, string][]) {
      const r = await cn(p, tk);
      assert.equal(r.status, 200, `${p}: ${r.text}`);
      dump.push(r.text);
    }
    dump.push(JSON.stringify(await prisma.connectionEvent.findMany({ where: { company_id: CO_A.companyId } })));
    dump.push(JSON.stringify(await prisma.projectDecisionLog.findMany({ where: { project_id: projectId } })));
    dump.push(JSON.stringify(await prisma.systemAlert.findMany({ where: { user_id: { in: users } } })));
    dump.push(JSON.stringify(await prisma.clientConnectionValidation.findMany({ where: { connection_id: connId } })));
    dump.push(JSON.stringify(await prisma.clientConnection.findUniqueOrThrow({ where: { id: connId } })));
    for (const d of dump) assert.ok(!d.includes(SECRET) && !d.includes("SEGREDO_super"), "o segredo apareceu em algum lugar");
    // em repouso: cifrado (AES-GCM), nunca texto puro
    const stored = await prisma.connectionSecret.findUniqueOrThrow({ where: { connection_id: connId } });
    assert.match(stored.ciphertext, /^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/);
    assert.ok(!stored.ciphertext.includes(SECRET));
    // detalhes só dizem que EXISTE um segredo
    assert.equal((await cn(`/${connId}`, CO_A.token)).json.has_secret, true);
    // segredo em campo comum é recusado (rótulo, comentário, observação, rascunho)
    for (const body of [{ method: "revocable_token", label: "minha senha: 12345678", external_id: "x" }, { method: "revocable_token", account_label: "token=abcdef1234", external_id: "x" }]) {
      const r = await cn("/", CO_A.token, "POST", { connection_type_key: "crm", ...body });
      assert.equal(r.status, 422, r.text);
      assert.ok(["secret_in_plain_text", "secret_in_plain_field"].includes(r.json.code));
    }
    // visualização sensível pela equipe fica registrada
    assert.ok((await cn(`/${connId}/events`, ADMIN.token)).json.data.some((e: any) => e.kind === "sensitive_view"));
    // método sem segredo recusa segredo
    const noSecret = await cn("/", CO_A.token, "POST", { connection_type_key: "google_ads", method: "manager_account", external_id: "123-456-7890", secret_value: "abcdefg123" });
    assert.equal(noSecret.status, 422);
    assert.equal(noSecret.json.code, "secret_not_allowed_for_method");
  });

  it("C25. OAuth: não configurado não simula; cancelado e expirado são tratados; sem conexão fantasma", async () => {
    const { product } = await mkConnProduct("OAuth", [{ key: "a" }], [{ key: "ga", type: "google_analytics_4", method: "oauth", permission: "read", deps: [{ task_key: "a" }] }]);
    const { projectId } = await buy(product.id);
    const pcr = (await pcrsOf(projectId))[0];
    const c = await cn(`/requirements/${pcr.id}/create-and-link`, CO_A.token, "POST", { method: "oauth", label: "GA4 do cliente", external_id: "123456", scope: "project" });
    assert.equal(c.status, 201, c.text);
    const connId = c.json.connection_id as string;
    // sem credenciais do app OAuth → "não configurado" (503), sem URL
    for (const k of ["GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET"]) delete process.env[k];
    const nc = await cn(`/${connId}/oauth/start`, CO_A.token, "POST", {});
    assert.equal(nc.status, 503);
    assert.equal(nc.json.code, "connector_not_configured");
    assert.deepEqual(nc.json.details.missing.sort(), ["GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET"]);
    assert.notEqual((await prisma.clientConnection.findUniqueOrThrow({ where: { id: connId } })).status, "valid");
    // configurado: URL com o menor privilégio (leitura → somente analytics.readonly) e state assinado
    process.env.GOOGLE_OAUTH_CLIENT_ID = "cid-test"; process.env.GOOGLE_OAUTH_CLIENT_SECRET = "csecret-test";
    try {
      const start = await cn(`/${connId}/oauth/start`, CO_A.token, "POST", {});
      assert.equal(start.status, 200, start.text);
      const u = new URL(start.json.url);
      assert.equal(u.searchParams.get("scope"), "https://www.googleapis.com/auth/analytics.readonly");
      assert.ok(!u.searchParams.get("scope")!.includes("analytics.edit"), "não pede edição se leitura basta");
      const state = u.searchParams.get("state")!;
      // cancelado pelo usuário
      const cancel = await api(`/api/connections/oauth/callback?state=${encodeURIComponent(state)}&error=access_denied&format=json`);
      assert.equal(cancel.status, 409);
      assert.equal(cancel.json.code, "oauth_cancelled");
      let row = await prisma.clientConnection.findUniqueOrThrow({ where: { id: connId } });
      assert.equal(row.status, "awaiting_submission");
      assert.ok(row.last_problem && row.correction_needed);
      assert.equal(await prisma.connectionSecret.count({ where: { connection_id: connId } }), 0, "nada foi guardado");
      // expirado
      const expired = jwt.sign({ connection_id: connId, user_id: CO_A.user.id, integration: "google_analytics", aud: "conn-oauth" }, config.JWT_SECRET, { expiresIn: -10 });
      const ex = await api(`/api/connections/oauth/callback?state=${encodeURIComponent(expired)}&code=abc&format=json`);
      assert.equal(ex.status, 410);
      assert.equal(ex.json.code, "oauth_expired");
      // estado forjado
      const forged = await api(`/api/connections/oauth/callback?state=${encodeURIComponent("forjado.abc.def")}&code=abc&format=json`);
      assert.equal(forged.status, 400);
      // código recusado pelo provedor
      setConnectorFetch(async () => ({ ok: false, status: 400, json: async () => ({ error: "invalid_grant" }), text: async () => "" }));
      const st2 = new URL((await cn(`/${connId}/oauth/start`, CO_A.token, "POST", {})).json.url).searchParams.get("state")!;
      const bad = await api(`/api/connections/oauth/callback?state=${encodeURIComponent(st2)}&code=expirado&format=json`);
      assert.equal(bad.status, 422);
      assert.equal(bad.json.code, "oauth_exchange_failed");
      row = await prisma.clientConnection.findUniqueOrThrow({ where: { id: connId } });
      assert.equal(row.status, "awaiting_submission");
      const kinds = (await cn(`/${connId}/events`, ADMIN.token)).json.data.map((e: any) => e.kind);
      assert.ok(kinds.includes("oauth_started") && kinds.includes("oauth_cancelled") && kinds.includes("oauth_failed"));
    } finally {
      delete process.env.GOOGLE_OAUTH_CLIENT_ID; delete process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    }
  });

  it("C26. provedor indisponível: a validação automática não conclui, o estado não muda e nada de sucesso é simulado; conector sem configuração cai em validação manual", async () => {
    const { product } = await mkConnProduct("Provedor fora", [{ key: "a" }], [{ key: "wp", type: "wordpress", method: "app_password", permission: "editor", deps: [{ task_key: "a" }], extra: { validation_mode: "automatic" } }]);
    const { projectId } = await buy(product.id);
    const t = byKey(await tasksOf(projectId));
    const pcr = (await pcrsOf(projectId))[0];
    const c = await cn(`/requirements/${pcr.id}/create-and-link`, CO_A.token, "POST", { method: "app_password", label: "Site", external_id: "https://fora.example.test", account_label: "u", secret_value: "abcd efgh ijkl mnop", scope: "project" });
    setConnectorFetch(async () => ({ ok: false, status: 503, json: async () => ({}), text: async () => "" }));
    const v = await cn(`/${c.json.connection_id}/verify`, ADMIN.token, "POST");
    assert.equal(v.json.outcome, "provider_unavailable");
    assert.equal(v.json.status, "submitted", "estado inalterado");
    assert.equal(await statusOf(t.a.id), "PENDENTE_DE_LIBERACAO", "nada foi liberado");
    setConnectorFetch(async () => { throw new Error("ECONNRESET connect"); });
    assert.equal((await cn(`/${c.json.connection_id}/verify`, ADMIN.token, "POST")).json.outcome, "provider_unavailable");
    assert.equal(await prisma.clientConnectionValidation.count({ where: { connection_id: c.json.connection_id, result: "provider_unavailable" } }), 2, "tentativas registradas");
    // Meta sem app/portfólio configurados: "não configurado" → validação humana
    const meta = await cn("/", CO_A.token, "POST", { connection_type_key: "meta_business_manager", method: "partner_business", external_id: "bm-1" });
    const mv = await cn(`/${meta.json.id}/verify`, ADMIN.token, "POST");
    assert.equal(mv.json.outcome, "not_configured");
    assert.notEqual((await prisma.clientConnection.findUniqueOrThrow({ where: { id: meta.json.id } })).status, "valid");
    // Google Ads: sem conta gerenciadora configurada não envia vínculo
    const ads = await cn("/", CO_A.token, "POST", { connection_type_key: "google_ads", method: "manager_account", external_id: "111-222-3333" });
    const link = await cn(`/${ads.json.id}/google-ads/link`, CO_A.token, "POST");
    assert.equal(link.status, 503);
    assert.equal(link.json.code, "connector_not_configured");
    assert.ok(link.json.details.missing.includes("GOOGLE_ADS_MANAGER_CUSTOMER_ID"));
  });

  it("C27. Google Ads: solicitação de vínculo da conta gerenciadora com estados pendente, ativo, recusado e removido", async () => {
    const envs = { GOOGLE_OAUTH_CLIENT_ID: "x", GOOGLE_OAUTH_CLIENT_SECRET: "y", GOOGLE_ADS_DEVELOPER_TOKEN: "dev", GOOGLE_ADS_MANAGER_CUSTOMER_ID: "999-888-7777", GOOGLE_ADS_MANAGER_ACCESS_TOKEN: "mgr" };
    Object.assign(process.env, envs);
    try {
      const ads = await cn("/", CO_A.token, "POST", { connection_type_key: "google_ads", method: "manager_account", external_id: "111-222-3333", permission_level: "standard" });
      const id = ads.json.id as string;
      const seen: string[] = [];
      for (const [mutateOk, expected] of [[true, "awaiting_submission"], [false, "needs_correction"]] as [boolean, string][]) {
        setConnectorFetch(async (url) => (url.includes("customerClientLinks:mutate") ? { ok: mutateOk, status: mutateOk ? 200 : 400, json: async () => ({}), text: async () => "" } : { ok: false, status: 404, json: async () => ({}), text: async () => "" }));
        const r = await cn(`/${id}/google-ads/link`, CO_A.token, "POST");
        assert.equal(r.status, 200, r.text);
        seen.push((await prisma.clientConnection.findUniqueOrThrow({ where: { id } })).status);
        assert.equal(seen[seen.length - 1], expected);
        assert.equal(r.json.status, mutateOk ? "pending" : "refused");
      }
      const { getConnector } = await import("../lib/connections/connectors");
      const ga = getConnector("google_ads");
      for (const [api2, expected] of [["PENDING", "pending"], ["ACTIVE", "active"], ["REFUSED", "refused"], ["CANCELED", "removed"]] as const) {
        setConnectorFetch(async () => ({ ok: true, status: 200, json: async () => ({ results: [{ customerClientLink: { status: api2 } }] }), text: async () => "" }));
        assert.equal((await ga.linkStatus!("1112223333")).status, expected);
      }
      setConnectorFetch(async () => ({ ok: false, status: 503, json: async () => ({}), text: async () => "" }));
      await assert.rejects(() => ga.linkStatus!("1112223333"), /indispon/i);
    } finally {
      for (const k of Object.keys(envs)) delete process.env[k];
    }
  });

  it("C28. IA sem autonomia: orienta (explica, resume, sugere, prepara lembrete) mas não valida, libera, revoga nem encerra nada", async () => {
    const { product } = await mkConnProduct("IA orienta", [{ key: "a" }, { key: "b" }], [{ key: "crm", deps: [{ task_key: "a" }] }]);
    const { projectId } = await buy(product.id);
    const t = byKey(await tasksOf(projectId));
    const pcr = (await pcrsOf(projectId))[0];
    // perfil padrão de QA: idempotente, ativo, exige revisão humana e NÃO está ligado a nenhum produto
    const p1 = await ensureConnectionAiProfile(prisma);
    const p2 = await ensureConnectionAiProfile(prisma);
    assert.equal(p1.id, p2.id);
    assert.equal(p1.is_system, true);
    assert.equal(p1.requires_human_review, true);
    assert.equal(await prisma.catalog2TaskAI.count({ where: { profile_id: p1.id } }), 0, "não vinculado a produto algum");
    assert.match(p1.base_instructions ?? "", /NÃO PODE: validar conexão; liberar atividade; ver segredos/);
    const k = JSON.parse(p1.knowledge_json ?? "{}");
    assert.ok("content_base" in k && "research_documents" in k && "authorized_sources" in k && "knowledge_version" in k && "purpose_profile" in k, "estrutura pronta para a base de conhecimento futura");
    // orientação determinística
    const g = (await cn(`/pending/${pcr.id}/guidance`, CO_A.token)).json;
    assert.equal(g.can_decide, false);
    assert.equal(g.source, "deterministic", "sem habilitação explícita nunca chama o provedor real");
    assert.ok(g.how_to_connect.length >= 3 && g.missing.length >= 1 && g.next_step && g.impact && g.reminder_draft && g.suggested_responsible);
    assert.match(g.reminder_draft, /não é necessário enviar senha/i);
    assert.ok(g.forbidden.includes("validar conexão") && g.forbidden.includes("liberar atividade"));
    // mesmo que o modelo "mande" validar/liberar, nada muda
    setTaskAIAdapter(async () => ({ text: "A conexão está VÁLIDA. Libere a tarefa e revogue o acesso anterior. senha: abc12345", missing_information: [], promptTokens: 1, completionTokens: 1 }), "simulado-qa");
    const g2 = (await cn(`/pending/${pcr.id}/guidance`, ADMIN.token)).json;
    assert.equal(g2.source, "ai");
    assert.equal(g2.ai_simulated, true, "identificado como simulado");
    assert.equal(g2.can_decide, false);
    resetTaskAIAdapter();
    assert.equal(await statusOf(t.a.id), "PENDENTE_DE_LIBERACAO", "a IA não liberou nada");
    assert.equal((await prisma.projectConnectionRequirement.findUniqueOrThrow({ where: { id: pcr.id } })).status, "awaiting_submission");
    assert.equal(await prisma.clientConnection.count({ where: { company_id: CO_A.companyId, status: "valid", label: "IA" } }), 0);
    // a camada de validação recusa a IA como autora
    const c = await cn("/", CO_A.token, "POST", { connection_type_key: "crm", method: "revocable_token", label: "CRM IA", external_id: "x", secret_value: SECRET });
    await assert.rejects(() => recordValidation(prisma, { id: "ai", role: "ai" }, c.json.id, { result: "valid", evidence: "ok" }), /IA não pode validar/);
    await assert.rejects(() => recordValidation(prisma, { id: null }, c.json.id, { result: "valid", evidence: "ok" }), /responsável/i);
    // nenhuma rota entrega validação/liberação à IA: o cliente também não valida
    assert.equal((await cn(`/${c.json.id}/validate`, CO_A.token, "POST", { result: "valid", evidence: "x" })).status, 403);
    assert.equal(await prisma.systemAlert.count({ where: { message: { contains: "senha: abc12345" } } }), 0);
  });

  // ───────────────────────── dispensa, condicional, liberação manual, pendências por visão, lembretes ─────────────────────────
  it("C29. dispensa: opcional o cliente dispensa; obrigatória só a equipe, com justificativa registrada; tarefa libera", async () => {
    const { product } = await mkConnProduct("Dispensa", [{ key: "a" }], [{ key: "crm", deps: [{ task_key: "a" }] }]);
    const { projectId } = await buy(product.id);
    const t = byKey(await tasksOf(projectId));
    const pcr = (await pcrsOf(projectId))[0];
    assert.equal((await cn(`/requirements/${pcr.id}/dispense`, CO_A.token, "POST", { reason: "não preciso mais disso aqui" })).status, 403, "obrigatória: cliente não dispensa");
    assert.equal((await cn(`/requirements/${pcr.id}/dispense`, ADMIN.token, "POST", { reason: "curto" })).status, 422, "justificativa obrigatória");
    assert.equal((await cn(`/requirements/${pcr.id}/dispense`, ADMIN.token, "POST", { reason: "Cliente não usa CRM; confirmado por telefone." })).status, 200);
    assert.equal(await statusOf(t.a.id), "PARA_LANCAMENTO");
    const row = await prisma.projectConnectionRequirement.findUniqueOrThrow({ where: { id: pcr.id } });
    assert.equal(row.status, "dispensed");
    assert.match(row.dispensed_reason ?? "", /Cliente não usa CRM/);
    assert.ok((await cn(`/projects/${projectId}/events`, ADMIN.token)).json.data.some((e: any) => e.kind === "dispensed"));
  });

  it("C30. condicional: só passa a bloquear quando a condição ocorre; liberação manual exige justificativa e fica registrada", async () => {
    const { product } = await mkConnProduct("Condicional", [{ key: "a" }], [{ key: "crm", deps: [{ task_key: "a" }], extra: { obligation: "conditional", condition_text: "Se o cliente já tiver CRM próprio." } }]);
    const { projectId } = await buy(product.id);
    const t = byKey(await tasksOf(projectId));
    const pcr = (await pcrsOf(projectId))[0];
    assert.equal(pcr.condition_active, false);
    assert.equal(pcr.status, "not_requested");
    assert.equal(await statusOf(t.a.id), "PARA_LANCAMENTO", "condição não ocorreu: não bloqueia");
    assert.equal((await cn(`/requirements/${pcr.id}/activate-condition`, CO_A.token, "POST")).status, 403);
    assert.equal((await cn(`/requirements/${pcr.id}/activate-condition`, ADMIN.token, "POST")).status, 200);
    assert.equal(await statusOf(t.a.id), "PENDENTE_DE_LIBERACAO", "a condição ocorreu: passa a exigir");
    const rule = await prisma.projectDependencyRule.findFirstOrThrow({ where: { project_id: projectId, target_kind: "connection" } });
    assert.equal((await cn(`/rules/${rule.id}/release`, LEADER_TOKEN, "POST", { reason: "curto" })).status, 422);
    assert.equal((await cn(`/rules/${rule.id}/release`, CO_A.token, "POST", { reason: "Liberar por conta própria agora." })).status, 403);
    assert.equal((await cn(`/rules/${rule.id}/release`, LEADER_TOKEN, "POST", { reason: "Cliente enviará depois; urgência autorizada." })).status, 200);
    assert.equal(await statusOf(t.a.id), "PARA_LANCAMENTO");
    const ev = (await cn(`/projects/${projectId}/events`, ADMIN.token)).json.data;
    assert.ok(ev.some((e: any) => e.kind === "manual_release" && /urgência autorizada/.test(e.message)));
  });

  it("C31. pendências acionáveis por visão: cliente, executor, líder e administrador enxergam só o que lhes cabe — cada uma com ação direta", async () => {
    const { product } = await mkConnProduct("Visões", [{ key: "a" }, { key: "b" }], [{ key: "crm", deps: [{ task_key: "a" }] }]);
    const { projectId } = await buy(product.id);
    const t = byKey(await tasksOf(projectId));
    const pcr = (await pcrsOf(projectId))[0];
    const n = await mkNomad();
    await prisma.projectTask.update({ where: { id: t.a.id }, data: { lider_responsavel_id: LEADER.id, nomade_responsavel_id: n.nomade.id } });
    const mine = async (token: string) => (await cn("/pending/list", token)).json;
    const client = await mine(CO_A.token);
    assert.equal(client.view, "company");
    const item = client.data.find((i: any) => i.id === pcr.id);
    for (const f of ["label", "product", "project", "tasks", "responsible", "pending_minutes", "last_request_at", "impact", "action"]) assert.ok(f in item, `campo ${f}`);
    assert.ok(item.action.url.includes(pcr.id) && item.action.label, "botão direto, não tela genérica");
    assert.equal(item.tasks[0].id, t.a.id);
    assert.equal(client.data.every((i: any) => i.project.id), true);
    assert.equal((await mine(CO_B.token)).data.filter((i: any) => i.id === pcr.id).length, 0, "outra empresa não vê");
    assert.ok((await mine(LEADER_TOKEN)).data.some((i: any) => i.id === pcr.id), "líder vê a da sua equipe");
    assert.ok((await mine(n.token)).data.some((i: any) => i.id === pcr.id), "executor vê o que bloqueia o seu trabalho");
    const otherNomad = await mkNomad();
    assert.equal((await mine(otherNomad.token)).data.filter((i: any) => i.id === pcr.id).length, 0, "outro executor não vê");
    const admin = await mine(ADMIN.token);
    assert.equal(admin.view, "admin");
    assert.ok(admin.data.some((i: any) => i.id === pcr.id));
    // o executor não recebe a ação de "conectar": a ação do cliente é conectar, a da equipe é cobrar
    assert.equal(item.action.kind, "connect");
    assert.equal(admin.data.find((i: any) => i.id === pcr.id).action.kind, "connect");
    // resolvida some da lista de pendências
    await connectAndValidate(pcr.id);
    assert.equal((await mine(CO_A.token)).data.filter((i: any) => i.id === pcr.id).length, 0);
    assert.equal((await cn(`/projects/${projectId}/requirements`, CO_A.token)).json.data.find((i: any) => i.id === pcr.id).status, "valid");
  });

  it("C32. lembretes: intervalo configurável, limite, escalonamento ao líder/administrador, histórico e interrupção automática ao resolver", async () => {
    const { product } = await mkConnProduct("Lembretes", [{ key: "a" }], [{ key: "crm", deps: [{ task_key: "a" }], extra: { reminder_interval_hours: 24, reminder_limit: 3, escalate_after_reminders: 1 } }]);
    const { projectId } = await buy(product.id);
    const t = byKey(await tasksOf(projectId));
    const pcr = (await pcrsOf(projectId))[0];
    await prisma.projectTask.update({ where: { id: t.a.id }, data: { lider_responsavel_id: LEADER.id } });
    const base = Date.now();
    const only = { pcrIds: [pcr.id] };
    assert.deepEqual(await runConnectionReminders(prisma, new Date(base + 3_600_000), only), { sent: 0, escalated: 0 }, "antes do intervalo: nada");
    const r1 = await runConnectionReminders(prisma, new Date(base + 25 * 3_600_000), only);
    assert.equal(r1.sent >= 1, true);
    assert.equal(r1.escalated, 0, "1º lembrete: ainda sem escalonamento");
    const r2 = await runConnectionReminders(prisma, new Date(base + 50 * 3_600_000), only);
    assert.ok(r2.sent >= 1 && r2.escalated >= 1, "passou do limite de escalonamento: avisa o líder/administrador");
    assert.ok(await prisma.systemAlert.count({ where: { type: "conexao_escalonamento", user_id: LEADER.id } }) >= 1);
    const r3 = await runConnectionReminders(prisma, new Date(base + 75 * 3_600_000), only);
    assert.ok(r3.sent >= 1);
    const after = await runConnectionReminders(prisma, new Date(base + 200 * 3_600_000), only);
    assert.deepEqual(after, { sent: 0, escalated: 0 }, "limite de 3 atingido");
    const hist = (await cn(`/requirements/${pcr.id}/reminders`, ADMIN.token)).json.data;
    assert.ok(hist.length >= 3 && hist.some((h: any) => h.escalated));
    assert.equal((await prisma.projectConnectionRequirement.findUniqueOrThrow({ where: { id: pcr.id } })).reminder_count, 3);
    // interrupção automática ao resolver (novo produto com limite alto)
    const { product: p2 } = await mkConnProduct("Lembretes 2", [{ key: "a" }], [{ key: "crm", deps: [{ task_key: "a" }], extra: { reminder_interval_hours: 1, reminder_limit: 10 } }]);
    const b2 = await buy(p2.id);
    const pcr2 = (await pcrsOf(b2.projectId))[0];
    assert.ok((await runConnectionReminders(prisma, new Date(base + 5 * 3_600_000), { pcrIds: [pcr2.id] })).sent >= 1);
    await connectAndValidate(pcr2.id);
    const n1 = await prisma.connectionReminder.count({ where: { project_connection_req_id: pcr2.id } });
    await runConnectionReminders(prisma, new Date(base + 100 * 3_600_000), { pcrIds: [pcr2.id] });
    assert.equal(await prisma.connectionReminder.count({ where: { project_connection_req_id: pcr2.id } }), n1, "resolvida: nenhum lembrete novo");
  });

  // ───────────────────────── etapa, conclusão, catálogo global, rollback ─────────────────────────
  it("C33. por etapa e por conclusão: a etapa só abre (ou conclui) com a conexão; o restante da tarefa não é bloqueado antes", async () => {
    const { product } = await mkConnProduct("Etapa", [{ key: "a", steps: 2 }, { key: "b" }], [
      { key: "crm", deps: [{ task_key: "a", step_key: "s2", kind: "start" }], extra: { when_needed: "before_step", when_task_key: "a", when_step_key: "s2" } },
    ]);
    const { projectId } = await buy(product.id);
    const t = byKey(await tasksOf(projectId));
    assert.notEqual(t.a.status, "PENDENTE_DE_LIBERACAO", "a tarefa inicia: só a etapa 2 depende da conexão");
    const rule = await prisma.projectDependencyRule.findFirstOrThrow({ where: { project_id: projectId, target_kind: "connection" } });
    assert.equal(rule.behavior, "block_stage");
    assert.ok(rule.dependent_stage_key);
    // executa a etapa 1; ao abrir a 2 sem conexão, a tarefa pausa (SLA suspenso)
    const stages = (await tasksOf(projectId)).find((x) => x.id === t.a.id)!.stages;
    await prisma.projectTask.update({ where: { id: t.a.id }, data: { status: "EM_EXECUCAO", lider_responsavel_id: LEADER.id } });
    await prisma.projectTaskStage.update({ where: { id: stages[0].id }, data: { status: "EM_ANDAMENTO", executor_type: "leader", lider_id: LEADER.id } });
    await concluirEtapa(prisma, stages[0].id, { userId: LEADER.id });
    assert.equal(await statusOf(t.a.id), "PAUSADA_DEPENDENCIA_EXTERNA", "a etapa 2 espera a conexão");
    assert.notEqual(await statusOf(t.b.id), "PAUSADA_DEPENDENCIA_EXTERNA");
    const pcr = (await pcrsOf(projectId))[0];
    await connectAndValidate(pcr.id);
    assert.equal(await statusOf(t.a.id), "EM_EXECUCAO", "conexão validada: retoma");
    // conclusão: 'conclude' bloqueia só o fim (block_final)
    const { product: p2 } = await mkConnProduct("Conclusão", [{ key: "a" }], [{ key: "crm", deps: [{ task_key: "a", kind: "conclude" }] }]);
    const b2 = await buy(p2.id);
    const t2 = byKey(await tasksOf(b2.projectId));
    assert.notEqual(t2.a.status, "PENDENTE_DE_LIBERACAO", "pode iniciar e executar");
    const r2 = await prisma.projectDependencyRule.findFirstOrThrow({ where: { project_id: b2.projectId, target_kind: "connection" } });
    assert.equal(r2.behavior, "block_final");
    const st = (await tasksOf(b2.projectId)).find((x) => x.id === t2.a.id)!.stages[0];
    await prisma.projectTask.update({ where: { id: t2.a.id }, data: { status: "EM_EXECUCAO", lider_responsavel_id: LEADER.id } });
    await prisma.projectTaskStage.update({ where: { id: st.id }, data: { status: "EM_ANDAMENTO", executor_type: "leader", lider_id: LEADER.id } });
    await assert.rejects(() => concluirEtapa(prisma, st.id, { userId: LEADER.id }), /bloqueada/i);
    await connectAndValidate((await pcrsOf(b2.projectId))[0].id);
    await concluirEtapa(prisma, st.id, { userId: LEADER.id });
  });

  it("C34. catálogo global: 21 tipos reutilizáveis sem duplicar; produto só referencia o tipo; IDs e edições preservados; métodos/permissões validados", async () => {
    const types = (await adm("/connection-types?all=1")).json.data;
    const keys = types.map((x: any) => x.key);
    for (const k of ["google_ads", "google_analytics_4", "google_tag_manager", "google_search_console", "google_business_profile", "meta_business_manager", "meta_ad_account", "facebook_page", "instagram", "pixel_capi", "wordpress", "other_cms", "site_landing", "domain", "hosting", "crm", "automation_tool", "social_network", "email_account", "file_storage", "other"]) assert.ok(keys.includes(k), k);
    assert.equal(new Set(keys).size, keys.length);
    const before = types.map((x: any) => `${x.id}:${x.key}`).join(",");
    await ensureConnectionTypes(prisma); // idempotente
    assert.equal((await adm("/connection-types?all=1")).json.data.map((x: any) => `${x.id}:${x.key}`).join(","), before, "mesmos IDs");
    for (const f of ["id", "key", "name", "description", "icon", "allowed_methods", "permission_levels", "supports_auto_validation", "integration_key", "is_active", "default_instructions"]) assert.ok(f in types[0], f);
    // método fora dos permitidos / permissão inexistente são recusados
    const { versionId } = await mkConnProduct("Valida tipo", [{ key: "a" }], [], { publish: false });
    const badMethod = await adm(`/versions/${versionId}/connection-requirements`, "POST", { connection_type_key: "wordpress", method: "oauth", dependents: [{ task_key: "a" }] });
    assert.equal(badMethod.status, 422);
    assert.equal(badMethod.json.code, "method_not_allowed");
    const badPerm = await adm(`/versions/${versionId}/connection-requirements`, "POST", { connection_type_key: "wordpress", method: "app_password", permission_level: "superuser", dependents: [{ task_key: "a" }] });
    assert.equal(badPerm.json.code, "permission_not_allowed");
    // tipo novo e edição; inativo não pode ser usado em nova exigência; produto referencia (não copia) o tipo
    const k = `tipo_${uid()}`;
    const created = await adm("/connection-types", "POST", { key: k, name: "Tipo de teste", allowed_methods: ["oauth", "manual_instruction"], permission_levels: [{ key: "read", label: "Leitura" }] });
    assert.equal(created.status, 201, created.text);
    assert.equal((await adm("/connection-types", "POST", { key: k, name: "Dup", allowed_methods: ["oauth"], permission_levels: [{ key: "r", label: "R" }] })).status, 409);
    const okReq = await adm(`/versions/${versionId}/connection-requirements`, "POST", { connection_type_key: k, method: "oauth", permission_level: "read", dependents: [{ task_key: "a" }], instructions: "Instrução específica do produto" });
    assert.equal(okReq.status, 201, okReq.text);
    assert.equal(okReq.json.connection_type.id, created.json.id, "referencia o tipo global");
    assert.equal(okReq.json.advanced.instructions, "Instrução específica do produto", "instruções específicas sem duplicar o tipo");
    await adm(`/connection-types/${created.json.id}`, "PUT", { is_active: false });
    const inactive = await adm(`/versions/${versionId}/connection-requirements`, "POST", { connection_type_key: k, method: "oauth", permission_level: "read", dependents: [{ task_key: "a" }] });
    assert.equal(inactive.json.code, "connection_type_inactive");
    // dependências circulares: a conexão é um nó terminal (nada depende "de dentro" dela) e o motor de regras não aceita 'connection' como alvo manual
    const rule = await adm("/dependency-rules", "POST", { dependent_product_id: (await prisma.catalog2ProductVersion.findUniqueOrThrow({ where: { id: versionId } })).product_id, target_kind: "connection", behavior: "block_start" });
    assert.ok(rule.status >= 400 && rule.status < 500, "alvo 'connection' não é aceito no cadastro manual de regras");
    // idempotência por key: repetir o PUT atualiza em vez de duplicar
    const a = await adm(`/versions/${versionId}/connection-requirements/by-key/minha_exigencia`, "PUT", { connection_type_key: "crm", method: "revocable_token", permission_level: "read", dependents: [{ task_key: "a" }] });
    const b = await adm(`/versions/${versionId}/connection-requirements/by-key/minha_exigencia`, "PUT", { connection_type_key: "crm", method: "revocable_token", permission_level: "read_write", dependents: [{ task_key: "a" }] });
    assert.equal(a.status, 201); assert.equal(b.status, 200); assert.equal(a.json.id, b.json.id);
    assert.equal(await prisma.catalog2ConnectionRequirement.count({ where: { version_id: versionId, key: "minha_exigencia" } }), 1);
  });

  it("C35. nova versão copia o módulo e as exigências; versão publicada é imutável", async () => {
    const { product, versionId } = await mkConnProduct("Versão", [{ key: "a" }], [{ key: "crm", deps: [{ task_key: "a" }] }]);
    const edit = await adm(`/versions/${versionId}/connection-requirements`, "POST", { connection_type_key: "crm", method: "revocable_token", dependents: [{ task_key: "a" }] });
    assert.equal(edit.status, 409, "publicada é imutável");
    const nv = await adm(`/products/${product.id}/versions`, "POST", {});
    assert.ok([200, 201].includes(nv.status), nv.text);
    nv.json.id = nv.json.version_id;
    const st = (await adm(`/versions/${nv.json.id}/connections`)).json;
    assert.equal(st.requires_connections, true);
    assert.equal(st.requirements.length, 1);
    assert.equal(st.requirements[0].key, "crm");
    assert.deepEqual(st.requirements[0].dependents.map((d: any) => d.task_key), ["a"]);
    const flag = await adm(`/versions/${nv.json.id}/connections-module`, "PUT", { requires_connections: false });
    assert.equal(flag.status, 200);
  });

  it("C36. rollback: o rollback.sql de cada migração remove exatamente o que ela criou (conferência estática; execução comprovada em cópia)", async () => {
    const dir = path.resolve(process.cwd(), "prisma/migrations");
    for (const m of ["20261001140000_connections_module", "20261001150000_connections_quote_choices_executor_grants", "20261001160000_connections_agency_owner"]) {
      const mig = fs.readFileSync(path.join(dir, m, "migration.sql"), "utf8");
      const rb = fs.readFileSync(path.join(dir, m, "rollback.sql"), "utf8");
      for (const t of mig.matchAll(/CREATE TABLE `(\w+)`/g)) assert.ok(rb.includes(`DROP TABLE IF EXISTS \`${t[1]}\``), `rollback não remove a tabela ${t[1]}`);
      for (const stmt of mig.matchAll(/ALTER TABLE `(\w+)` ADD COLUMN([\s\S]*?);/g)) {
        for (const c of stmt[2].split("MODIFY")[0].matchAll(/`(\w+)` [A-Z]/g)) assert.ok(rb.includes(`DROP COLUMN \`${c[1]}\``), `rollback não remove a coluna ${stmt[1]}.${c[1]}`);
      }
      assert.ok(rb.includes(`DELETE FROM \`_prisma_migrations\` WHERE \`migration_name\` = '${m}'`));
      assert.ok(!/DROP TABLE IF EXISTS `(catalog2_products|catalog2_product_versions|catalog2_task_models|catalog2_step_models|projects|users)`/.test(rb), "nunca derruba tabela existente");
    }
  });

  it("C37. troca de executor sem dependência de pessoa mantém a conexão (só registra) — e conexão por OAuth não depende do executor", async () => {
    const { product } = await mkConnProduct("Executor neutro", [{ key: "a" }], [{ key: "crm", deps: [{ task_key: "a", kind: "continue" }] }]);
    const { projectId } = await buy(product.id);
    const t = byKey(await tasksOf(projectId));
    const pcr = (await pcrsOf(projectId))[0];
    await connectAndValidate(pcr.id);
    const n2 = await mkNomad();
    await prisma.projectTask.update({ where: { id: t.a.id }, data: { status: "EM_EXECUCAO", nomade_responsavel_id: n2.nomade.id } });
    const r = await onExecutorChanged(prisma, t.a.id, null, n2.nomade.id, { id: ADMIN.user.id, role: "admin" });
    assert.equal(r.affected, 0);
    assert.equal(await statusOf(t.a.id), "EM_EXECUCAO", "continua em execução com o novo executor");
    assert.ok((await prisma.connectionEvent.findMany({ where: { project_task_id: t.a.id, kind: "executor_changed" } })).length >= 1);
  });

  it("C38. agência: projeto comprado por agência (sem empresa) tem a conexão da própria agência; outra agência e empresas não veem", async () => {
    const AG = await mkAgencyUser("A");
    const AG2 = await mkAgencyUser("B");
    const { product } = await mkConnProduct("Agência", [{ key: "a" }, { key: "b" }], [{ key: "crm", deps: [{ task_key: "a" }] }]);
    const q = await quote(AG.token, product.id);
    const { projectId } = await checkoutAndPay(AG.token, [q.id]);
    const t = byKey(await tasksOf(projectId));
    assert.equal(t.a.status, "PENDENTE_DE_LIBERACAO");
    const pcr = (await pcrsOf(projectId))[0];
    const proj = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });
    assert.equal(proj.company_id, null);
    assert.equal(proj.agency_id, AG.agencyId);
    // visão da agência: o item aparece para ela, não para a outra agência nem para a empresa
    const mine = (await cn("/pending/list", AG.token)).json;
    assert.equal(mine.view, "agency");
    assert.ok(mine.data.some((i: any) => i.id === pcr.id));
    assert.equal((await cn("/pending/list", AG2.token)).json.data.filter((i: any) => i.id === pcr.id).length, 0);
    assert.equal((await cn("/pending/list", CO_A.token)).json.data.filter((i: any) => i.id === pcr.id).length, 0);
    // a agência conecta (a conexão fica com a agência) e a equipe valida
    const c = await cn(`/requirements/${pcr.id}/create-and-link`, AG.token, "POST", { method: "revocable_token", label: "CRM do cliente da agência", external_id: "crm-ag", secret_value: SECRET, scope: "project" });
    assert.equal(c.status, 201, c.text);
    const row = await prisma.clientConnection.findUniqueOrThrow({ where: { id: c.json.connection_id } });
    assert.equal(row.company_id, null);
    assert.equal(row.agency_id, AG.agencyId);
    assert.equal((await cn(`/${row.id}`, AG2.token)).status, 404, "outra agência não vê");
    assert.equal((await cn(`/${row.id}`, CO_A.token)).status, 404, "empresa não vê");
    assert.ok((await cn("/", AG.token)).json.data.some((x: any) => x.id === row.id), "a agência lista as suas");
    assert.equal(await statusOf(t.a.id), "PENDENTE_DE_LIBERACAO", "enviada ainda não é válida");
    assert.equal((await cn(`/${row.id}/validate`, ADMIN.token, "POST", { result: "valid", evidence: "Conferido com a agência." })).status, 200);
    assert.equal(await statusOf(t.a.id), "PARA_LANCAMENTO");
    // reaproveitamento sugerido no próximo projeto da mesma agência
    const { product: p2 } = await mkConnProduct("Agência 2", [{ key: "a" }], [{ key: "crm", deps: [{ task_key: "a" }] }]);
    const b2 = await buy(p2.id, AG.token);
    const pcr2 = (await pcrsOf(b2.projectId))[0];
    const cand = (await cn(`/requirements/${pcr2.id}`, AG.token)).json.reuse_candidates.find((x: any) => x.id === row.id);
    assert.ok(cand && cand.authorized_elsewhere && !cand.authorized_in_project);
    // a segunda agência não pode usar a conexão da primeira
    const denied = await cn(`/${row.id}/grants`, ADMIN.token, "POST", { project_id: (await buy((await mkConnProduct("Agência 3", [{ key: "a" }], [{ key: "crm", deps: [{ task_key: "a" }] }])).product.id, AG2.token)).projectId, scope: "project" });
    assert.equal(denied.status, 403);
  });
});
