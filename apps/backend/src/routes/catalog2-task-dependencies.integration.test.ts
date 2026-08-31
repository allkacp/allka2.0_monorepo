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

// Fechamento técnico do sprint de produtos — dependência REAL entre tarefas
// do catalog2: tarefa dependente não pode iniciar (release) enquanto a
// anterior obrigatória não estiver concluída. Cobre o gate tanto na rota
// dedicada (/release) quanto na genérica (PATCH /:id, usada pelo modo de
// edição do admin) — "chamada direta à API também deve ser bloqueada".

let baseUrl = "";
let server: import("node:http").Server;
const users: string[] = [];
const adminProfiles: string[] = [];
const companies: string[] = [];
const catProducts: string[] = [];
const projects: string[] = [];

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

async function mkCompanyUser(tag: string) {
  const c = await prisma.company.create({ data: { name: `[TESTE] Dep ${tag}`, status: "ativo" } });
  companies.push(c.id);
  const id = `c6dep-${crypto.randomBytes(5).toString("hex")}`;
  const u = await prisma.user.create({
    data: { id, email: `${id}@example.test`, password_hash: "x", name: `Dep ${tag}`, role: "company_user", account_type: "empresas", is_active: true, status: "ativo", company_id: c.id },
  });
  users.push(u.id);
  return { user: u, token: tokenFor(u), companyId: c.id };
}
async function mkAdmin(master: boolean) {
  const p = await prisma.adminProfile.create({ data: { name: `Dep ${master ? "M" : "C"} ${crypto.randomBytes(4).toString("hex")}`, is_master: master, is_active: true } });
  adminProfiles.push(p.id);
  const id = `c6depad-${crypto.randomBytes(5).toString("hex")}`;
  const u = await prisma.user.create({
    data: { id, email: `${id}@example.test`, password_hash: "x", name: "Admin", role: "admin", account_type: "admin", is_active: true, status: "ativo", admin_profile_id: p.id },
  });
  users.push(u.id);
  return { user: u, token: tokenFor(u) };
}

/** Produto publicado com DUAS tarefas fixas, a segunda dependente da primeira. */
async function mkProductWithDependency(slug: string) {
  const spec = await prisma.catalog2Specialty.findFirstOrThrow({ where: { key: "designer" } });
  await prisma.catalog2Specialty.update({ where: { id: spec.id }, data: { max_hourly_rate: 100 } });
  await prisma.catalog2PricingSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default", tax_percent: 6, commission_percent: 10, operational_fee_percent: 5, profit_margin_percent: 30, human_review_percent: 10,
      component_order_json: JSON.stringify(["tax", "commission", "operational", "margin"]),
    },
    update: {},
  });
  const pillar = await prisma.catalog2Pillar.findFirstOrThrow({ where: { key: "redes_conteudo" } });
  const category = await prisma.catalog2Category.findFirstOrThrow({ where: { key: "design" } });
  const fourF = await prisma.catalog2FourF.findFirstOrThrow({ where: { key: "fluxo" } });
  const product = await prisma.catalog2Product.create({
    data: { slug, internal_name: `[TESTE] ${slug}`, pillar_id: pillar.id, category_id: category.id, status: "em_preparacao", four_f: { create: [{ four_f_id: fourF.id }] } },
  });
  catProducts.push(product.id);
  const version = await prisma.catalog2ProductVersion.create({
    data: {
      product_id: product.id, version_number: 1, state: "rascunho", title: `Serviço ${slug}`, summary: "r", full_description: "d",
      base_commercial_deadline_days: 5,
    },
  });
  const t1 = await prisma.catalog2Task.create({ data: { version_id: version.id, key: "briefing", name: "Briefing", execution_mode: "humano", specialty_id: spec.id, estimated_minutes: 30, sort_order: 1 } });
  const t2 = await prisma.catalog2Task.create({ data: { version_id: version.id, key: "arte", name: "Arte final", execution_mode: "humano", specialty_id: spec.id, estimated_minutes: 60, sort_order: 2 } });
  await prisma.catalog2TaskDependency.create({ data: { task_id: t2.id, depends_on_task_id: t1.id } });
  await publishVersion(version.id, "system", { changeSummary: "pub" });
  return { product: await prisma.catalog2Product.findUniqueOrThrow({ where: { id: product.id } }), t1, t2 };
}

async function purgeProject(id: string) {
  await prisma.projectTaskStage.deleteMany({ where: { project_task: { project_id: id } } }).catch(() => {});
  await prisma.projectTask.deleteMany({ where: { project_id: id } }).catch(() => {});
  await prisma.paymentItem.deleteMany({ where: { payment: { project_id: id } } }).catch(() => {});
  await prisma.payment.deleteMany({ where: { project_id: id } }).catch(() => {});
  await prisma.projectProduct.deleteMany({ where: { project_id: id } }).catch(() => {});
  await prisma.project.deleteMany({ where: { id } }).catch(() => {});
}
async function purgeProduct(id: string) {
  const vs = await prisma.catalog2ProductVersion.findMany({ where: { product_id: id }, select: { id: true } });
  const vids = vs.map((x) => x.id);
  await prisma.catalog2Product.update({ where: { id }, data: { published_version_id: null } }).catch(() => {});
  await prisma.catalog2VersionEvent.deleteMany({ where: { version_id: { in: vids } } }).catch(() => {});
  await prisma.catalog2TaskDependency.deleteMany({ where: { task: { version_id: { in: vids } } } }).catch(() => {});
  await prisma.catalog2Task.deleteMany({ where: { version_id: { in: vids } } }).catch(() => {});
  await prisma.catalog2ProductVersion.deleteMany({ where: { product_id: id } }).catch(() => {});
  await prisma.catalog2ProductFourF.deleteMany({ where: { product_id: id } }).catch(() => {});
  await prisma.catalog2Product.delete({ where: { id } }).catch(() => {});
}

let CO: Awaited<ReturnType<typeof mkCompanyUser>>;
let MASTER = "";

describe("Dependência real entre tarefas do catalog2 (fechamento técnico)", () => {
  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    await seedCatalog2FourFForTests(prisma);
    await seedCatalog2Classifications(prisma);
    CO = await mkCompanyUser("A");
    MASTER = (await mkAdmin(true)).token;
    server = app.listen(0);
    await new Promise<void>((r) => server.once("listening", () => r()));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  // `catalog2_pricing_settings` é um singleton (id:"default") compartilhado
  // por todas as suítes catalog2 que rodam em paralelo contra o mesmo banco
  // de teste (mesmo cuidado já documentado em catalog2-catalog.integration.
  // test.ts) — reafirmamos a config COMPLETA antes de cada teste.
  beforeEach(async () => {
    await prisma.catalog2PricingSettings.upsert({
      where: { id: "default" },
      create: {
        id: "default", tax_percent: 6, commission_percent: 10, operational_fee_percent: 5, profit_margin_percent: 30, human_review_percent: 10,
        component_order_json: JSON.stringify(["tax", "commission", "operational", "margin"]),
      },
      update: {
        tax_percent: 6, commission_percent: 10, operational_fee_percent: 5, profit_margin_percent: 30, human_review_percent: 10,
        component_order_json: JSON.stringify(["tax", "commission", "operational", "margin"]),
      },
    }).catch(() => {});
  });
  after(async () => {
    await new Promise<void>((res, rej) => server.close((e) => (e ? rej(e) : res())));
    for (const id of projects.splice(0)) await purgeProject(id);
    for (const id of catProducts.splice(0)) await purgeProduct(id);
    await prisma.company.deleteMany({ where: { id: { in: companies } } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: { in: users } } }).catch(() => {});
    await prisma.adminProfile.deleteMany({ where: { id: { in: adminProfiles } } }).catch(() => {});
  });

  it("tarefa dependente é bloqueada em /release, liberada após a anterior concluir, e o bypass genérico PATCH /:id também é bloqueado", async () => {
    const { product, t1, t2 } = await mkProductWithDependency(`t6dep-${crypto.randomBytes(4).toString("hex")}`);

    const quoteRes = await api("/api/catalog2/quotes", { method: "POST", token: CO.token, body: { product: product.id, selection: { variation_option_keys: [], addon_keys: [], quantity: 1, answers: {} } } });
    assert.equal(quoteRes.status, 201, JSON.stringify(quoteRes.json));
    const checkout = await api("/api/catalog2/checkout", { method: "POST", token: CO.token, body: { quote_ids: [quoteRes.json.id], checkout_client_action_id: crypto.randomUUID() } });
    assert.equal(checkout.status, 201, JSON.stringify(checkout.json));
    const projectId = checkout.json.project.id;
    projects.push(projectId);

    const pay = await api("/api/payments/fake-checkout", { method: "POST", token: CO.token, body: { project_id: projectId } });
    assert.equal(pay.status, 201, JSON.stringify(pay.json));

    const tasks = await prisma.projectTask.findMany({ where: { project_id: projectId } });
    const pt1 = tasks.find((t) => t.catalog2_task_id === t1.id)!;
    const pt2 = tasks.find((t) => t.catalog2_task_id === t2.id)!;
    assert.ok(pt1 && pt2, "as duas tarefas foram materializadas");

    // Lança as duas (PARA_LANCAMENTO -> EM_LANCAMENTO), pré-requisito de /release.
    await api(`/api/project-tasks/${pt1.id}/launch`, { method: "PATCH", token: CO.token });
    await api(`/api/project-tasks/${pt2.id}/launch`, { method: "PATCH", token: CO.token });

    // 1. Tarefa dependente (pt2) não pode ser liberada via /release.
    const blockedRelease = await api(`/api/project-tasks/${pt2.id}/release`, { method: "PATCH", token: MASTER });
    assert.equal(blockedRelease.status, 409);
    assert.equal(blockedRelease.json.code, "dependency_not_met");
    assert.equal(blockedRelease.json.blocked_by.task_id, pt1.id);

    // 2. Chamada direta à API genérica (PATCH /:id, o "bypass" do modo de
    // edição do admin) também é bloqueada.
    const blockedGeneric = await api(`/api/project-tasks/${pt2.id}`, { method: "PATCH", token: MASTER, body: { status: "LIBERADA_PARA_EXECUCAO" } });
    assert.equal(blockedGeneric.status, 409);
    assert.equal(blockedGeneric.json.code, "dependency_not_met");

    // 3. GET do detalhe já expõe a razão do bloqueio proativamente.
    const detail = await api(`/api/project-tasks/${pt2.id}`, { token: MASTER });
    assert.equal(detail.status, 200);
    assert.equal(detail.json.dependency_blocked_by.task_id, pt1.id);

    // 4. Conclui a dependência (pt1) — outra tarefa qualquer não é afetada.
    const conclude = await api(`/api/project-tasks/${pt1.id}`, { method: "PATCH", token: MASTER, body: { status: "CONCLUIDA" } });
    assert.equal(conclude.status, 200);

    // 5. Agora pt2 já não aparece bloqueada e /release funciona.
    const detailAfter = await api(`/api/project-tasks/${pt2.id}`, { token: MASTER });
    assert.equal(detailAfter.json.dependency_blocked_by, null);
    const releaseOk = await api(`/api/project-tasks/${pt2.id}/release`, { method: "PATCH", token: MASTER });
    assert.equal(releaseOk.status, 200, JSON.stringify(releaseOk.json));
    assert.equal(releaseOk.json.status, "LIBERADA_PARA_EXECUCAO");
  });

  it("exceção administrativa: só admin, com motivo, libera mesmo com dependência pendente, e fica auditada", async () => {
    const { product, t2 } = await mkProductWithDependency(`t6dep2-${crypto.randomBytes(4).toString("hex")}`);
    const quoteRes = await api("/api/catalog2/quotes", { method: "POST", token: CO.token, body: { product: product.id, selection: { variation_option_keys: [], addon_keys: [], quantity: 1, answers: {} } } });
    assert.equal(quoteRes.status, 201, JSON.stringify(quoteRes.json));
    const checkout = await api("/api/catalog2/checkout", { method: "POST", token: CO.token, body: { quote_ids: [quoteRes.json.id], checkout_client_action_id: crypto.randomUUID() } });
    assert.equal(checkout.status, 201, JSON.stringify(checkout.json));
    const projectId = checkout.json.project.id;
    projects.push(projectId);
    const pay = await api("/api/payments/fake-checkout", { method: "POST", token: CO.token, body: { project_id: projectId } });
    assert.equal(pay.status, 201, JSON.stringify(pay.json));
    const tasks = await prisma.projectTask.findMany({ where: { project_id: projectId } });
    const pt2 = tasks.find((t) => t.catalog2_task_id === t2.id)!;
    assert.ok(pt2, "tarefa dependente foi materializada");
    await api(`/api/project-tasks/${pt2.id}/launch`, { method: "PATCH", token: CO.token });

    // Empresa (não-admin) não pode usar a exceção mesmo informando motivo.
    const companyAttempt = await api(`/api/project-tasks/${pt2.id}/release`, { method: "PATCH", token: CO.token, body: { dependency_override_reason: "urgente" } });
    assert.equal(companyAttempt.status, 409);

    // Admin sem motivo também é recusado.
    const noReason = await api(`/api/project-tasks/${pt2.id}/release`, { method: "PATCH", token: MASTER, body: {} });
    assert.equal(noReason.status, 409);

    // Admin COM motivo: passa.
    const override = await api(`/api/project-tasks/${pt2.id}/release`, { method: "PATCH", token: MASTER, body: { dependency_override_reason: "cliente pediu para adiantar por contrato" } });
    assert.equal(override.status, 200, JSON.stringify(override.json));

    const audit = await prisma.productFeedbackAccessAudit.findFirst({ where: { action: "project_task.dependency_override" }, orderBy: { created_at: "desc" } });
    assert.ok(audit, "override foi auditado");
    assert.ok(audit!.reason?.includes("cliente pediu"));
  });
});
