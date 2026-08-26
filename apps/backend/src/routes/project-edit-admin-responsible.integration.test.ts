import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import app from "../app";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import { ensureDefaultAlertStandardsAndRules, runAlertEngineOnce, STANDARD_KEYS } from "../lib/alert-engine";

// Reparo "editar Admin responsável de projeto já existente" (ata 2026-08).
// O lote anterior só permitia escolher o Admin responsável NA CRIAÇÃO — os
// ~231 projetos antigos ficaram sem forma funcional de receber um. Este
// arquivo prova que PUT /api/projects/:id (reaproveitado, sem rota nova)
// atualiza o Admin responsável de um projeto JÁ EXISTENTE com segurança —
// sem tocar em nenhum outro campo — e que o motor reage corretamente no
// ciclo seguinte.

const suffix = `${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
let baseUrl = "";
let server: import("node:http").Server;

function tokenFor(user: { id: string; email: string; role: string; account_type: string }) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, account_type: user.account_type },
    config.JWT_SECRET,
    { expiresIn: "1h" },
  );
}

async function api(path: string, options: { method?: string; token?: string; body?: unknown } = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "content-type": "application/json",
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

const createdUserIds: string[] = [];
const createdProfileIds: string[] = [];
const createdProjectIds: string[] = [];
const createdProductIds: string[] = [];
const createdTaskIds: string[] = [];
const createdStageIds: string[] = [];
const createdCompanyIds: string[] = [];

async function createUser(overrides: Partial<{ role: string; account_type: string; admin_profile_id: string | null; is_active: boolean; company_id: string | null }> = {}) {
  const id = `padmin-edit-${crypto.randomBytes(6).toString("hex")}`;
  const user = await prisma.user.create({
    data: {
      id,
      email: `${id}@example.test`,
      password_hash: "unused-test-hash",
      name: `Edit Admin Test ${id}`,
      role: overrides.role ?? "company_user",
      account_type: overrides.account_type ?? "empresas",
      is_active: overrides.is_active ?? true,
      status: "ativo",
      admin_profile_id: overrides.admin_profile_id ?? null,
      company_id: overrides.company_id ?? null,
    },
  });
  createdUserIds.push(user.id);
  return user;
}

async function createProfile(overrides: { is_master?: boolean } = {}) {
  const profile = await prisma.adminProfile.create({
    data: { name: `perfil-padmin-edit-${suffix}-${crypto.randomBytes(4).toString("hex")}`, is_master: overrides.is_master ?? false, is_active: true },
  });
  createdProfileIds.push(profile.id);
  return profile;
}

async function masterAdmin() {
  const profile = await createProfile({ is_master: true });
  return createUser({ role: "admin", account_type: "admin", admin_profile_id: profile.id });
}

async function internalAdmin(overrides: { is_active?: boolean } = {}) {
  return createUser({ role: "admin", account_type: "admin", admin_profile_id: null, is_active: overrides.is_active ?? true });
}

async function createCompany() {
  const company = await prisma.company.create({ data: { name: `Empresa teste edit admin ${suffix}-${crypto.randomBytes(3).toString("hex")}` } });
  createdCompanyIds.push(company.id);
  return company;
}

// Projeto "já existente" — nasce SEM Admin responsável, exatamente como os
// ~231 projetos reais que motivaram este lote.
async function createExistingProject(overrides: { company_id?: string | null; title?: string } = {}) {
  const code = `${suffix}-${crypto.randomBytes(4).toString("hex")}`;
  const project = await prisma.project.create({
    data: {
      title: overrides.title ?? `Projeto já existente ${code}`,
      project_code: code,
      status: "in-progress",
      company_id: overrides.company_id ?? null,
      admin_responsible_user_id: null,
    },
  });
  createdProjectIds.push(project.id);
  return project;
}

async function createTaskInProject(projectId: string, overrides: { due_date: Date | null; assignee_id?: string | null }) {
  const code = `${suffix}-${crypto.randomBytes(4).toString("hex")}`;
  const product = await prisma.product.create({ data: { name: `Produto teste edit admin ${code}`, category: "teste" } });
  createdProductIds.push(product.id);
  const projectProduct = await prisma.projectProduct.create({
    data: { project_id: projectId, product_id: product.id, product_name_snapshot: product.name, product_category_snapshot: product.category },
  });
  const task = await prisma.projectTask.create({
    data: {
      project_id: projectId,
      project_product_id: projectProduct.id,
      product_id: product.id,
      name_snapshot: product.name,
      title: `Tarefa teste edit admin ${code}`,
      status: "EM_EXECUCAO",
      due_date: overrides.due_date,
      assignee_id: overrides.assignee_id ?? null,
    },
  });
  createdTaskIds.push(task.id);
  return task;
}

describe("PUT /api/projects/:id — editar Admin responsável de projeto já existente (ata 2026-08)", () => {
  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;

    const listener = app.listen(0);
    server = listener;
    await new Promise<void>((resolve) => listener.once("listening", () => resolve()));
    const address = listener.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;

    await ensureDefaultAlertStandardsAndRules();
  });

  after(async () => {
    await prisma.productFeedbackAccessAudit.deleteMany({ where: { action: { in: ["project.admin_responsible_changed"] } } });
    await prisma.productFeedbackAccessAudit.deleteMany({ where: { action: { startsWith: "alert_" } } });
    await prisma.systemAlert.deleteMany({ where: { entity_id: { in: [...createdTaskIds, ...createdStageIds] } } });
    await prisma.projectTaskStage.deleteMany({ where: { id: { in: createdStageIds } } });
    await prisma.projectTask.deleteMany({ where: { id: { in: createdTaskIds } } });
    await prisma.projectProduct.deleteMany({ where: { project_id: { in: createdProjectIds } } });
    await prisma.project.deleteMany({ where: { id: { in: createdProjectIds } } });
    await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.adminProfile.deleteMany({ where: { id: { in: createdProfileIds } } });
    await prisma.company.deleteMany({ where: { id: { in: createdCompanyIds } } });
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    await prisma.$disconnect();
  });

  it("1. Admin autorizado atribui Admin responsável a um projeto já existente (sem Admin desde a criação)", async () => {
    const master = await masterAdmin();
    const admin = await internalAdmin();
    const project = await createExistingProject();
    assert.equal(project.admin_responsible_user_id, null, "nasce sem Admin, como os projetos reais antigos");

    const res = await api(`/api/projects/${project.id}`, { method: "PUT", token: tokenFor(master), body: { admin_responsible_user_id: admin.id } });
    assert.equal(res.status, 200);
    assert.equal((res.json as any).admin_responsible_user_id, admin.id);
    assert.equal((res.json as any).admin_responsible?.name, admin.name, "resposta já traz nome/e-mail resolvidos, sem 2º fetch");
  });

  it("2. troca de Admin responsável (já tinha um, muda para outro)", async () => {
    const master = await masterAdmin();
    const adminA = await internalAdmin();
    const adminB = await internalAdmin();
    const project = await createExistingProject({});
    await prisma.project.update({ where: { id: project.id }, data: { admin_responsible_user_id: adminA.id } });

    const res = await api(`/api/projects/${project.id}`, { method: "PUT", token: tokenFor(master), body: { admin_responsible_user_id: adminB.id } });
    assert.equal(res.status, 200);
    assert.equal((res.json as any).admin_responsible_user_id, adminB.id);
  });

  it("3. remoção com null (deixar sem responsável)", async () => {
    const master = await masterAdmin();
    const admin = await internalAdmin();
    const project = await createExistingProject({});
    await prisma.project.update({ where: { id: project.id }, data: { admin_responsible_user_id: admin.id } });

    const res = await api(`/api/projects/${project.id}`, { method: "PUT", token: tokenFor(master), body: { admin_responsible_user_id: null } });
    assert.equal(res.status, 200);
    assert.equal((res.json as any).admin_responsible_user_id, null);
  });

  it("4. usuário comum autenticado não consegue alterar (campo ignorado)", async () => {
    const comum = await createUser({ role: "company_user", account_type: "empresas" });
    const admin = await internalAdmin();
    const company = await createCompany();
    const project = await createExistingProject({ company_id: company.id });
    // usuário comum sem vínculo com a company não teria nem visibilidade —
    // usamos um vinculado à mesma company só pra isolar exatamente o
    // comportamento do campo admin_responsible_user_id (não confundir com
    // 403 de escopo, testado à parte no item 8).
    const linked = await createUser({ role: "company_user", account_type: "empresas", company_id: company.id });
    const res = await api(`/api/projects/${project.id}`, { method: "PUT", token: tokenFor(linked), body: { admin_responsible_user_id: admin.id, title: project.title } });
    void comum;
    const reloaded = await prisma.project.findUniqueOrThrow({ where: { id: project.id } });
    assert.equal(reloaded.admin_responsible_user_id, null, "usuário comum nunca consegue setar o campo, mesmo com acesso de edição ao projeto");
    void res;
  });

  it("5. Nômade rejeitado", async () => {
    const master = await masterAdmin();
    const nomadeUser = await createUser();
    await prisma.nomade.create({ data: { name: "Nomade Teste Edit", email: `nomade-edit-${suffix}@example.test`, user_id: nomadeUser.id } });
    const project = await createExistingProject();
    const res = await api(`/api/projects/${project.id}`, { method: "PUT", token: tokenFor(master), body: { admin_responsible_user_id: nomadeUser.id } });
    assert.equal(res.status, 400);
  });

  it("6. usuário inativo rejeitado", async () => {
    const master = await masterAdmin();
    const inactiveAdmin = await internalAdmin({ is_active: false });
    const project = await createExistingProject();
    const res = await api(`/api/projects/${project.id}`, { method: "PUT", token: tokenFor(master), body: { admin_responsible_user_id: inactiveAdmin.id } });
    assert.equal(res.status, 400);
  });

  it("7. ID inexistente rejeitado", async () => {
    const master = await masterAdmin();
    const project = await createExistingProject();
    const res = await api(`/api/projects/${project.id}`, { method: "PUT", token: tokenFor(master), body: { admin_responsible_user_id: "id-fantasma-nao-existe" } });
    assert.equal(res.status, 400);
  });

  it("8. organização/escopo incorreto rejeitado — usuário de outra empresa não pode nem chegar a alterar", async () => {
    const admin = await internalAdmin();
    const companyA = await createCompany();
    const companyB = await createCompany();
    const project = await createExistingProject({ company_id: companyA.id });
    const userFromB = await createUser({ role: "company_user", account_type: "empresas", company_id: companyB.id });

    const res = await api(`/api/projects/${project.id}`, { method: "PUT", token: tokenFor(userFromB), body: { admin_responsible_user_id: admin.id } });
    assert.equal(res.status, 403, "escopo do projeto (projectVisibleToUser) barra antes mesmo de chegar na validação do Admin responsável");
    const reloaded = await prisma.project.findUniqueOrThrow({ where: { id: project.id } });
    assert.equal(reloaded.admin_responsible_user_id, null);
  });

  it("9. outros campos do projeto permanecem idênticos depois de editar só o Admin responsável", async () => {
    const master = await masterAdmin();
    const admin = await internalAdmin();
    const project = await createExistingProject({ title: "Título original — não deve mudar" });
    await prisma.project.update({ where: { id: project.id }, data: { budget: 12345, description: "Descrição original" } });

    const res = await api(`/api/projects/${project.id}`, { method: "PUT", token: tokenFor(master), body: { admin_responsible_user_id: admin.id } });
    assert.equal(res.status, 200);
    const reloaded = await prisma.project.findUniqueOrThrow({ where: { id: project.id } });
    assert.equal(reloaded.title, "Título original — não deve mudar");
    assert.equal(reloaded.budget, 12345);
    assert.equal(reloaded.description, "Descrição original");
  });

  it("10. auditoria contém valor anterior e novo", async () => {
    const master = await masterAdmin();
    const adminA = await internalAdmin();
    const adminB = await internalAdmin();
    const project = await createExistingProject({});
    await prisma.project.update({ where: { id: project.id }, data: { admin_responsible_user_id: adminA.id } });

    await api(`/api/projects/${project.id}`, { method: "PUT", token: tokenFor(master), body: { admin_responsible_user_id: adminB.id } });

    const audit = await prisma.productFeedbackAccessAudit.findFirst({
      where: { action: "project.admin_responsible_changed" },
      orderBy: { created_at: "desc" },
    });
    assert.ok(audit);
    const before = JSON.parse(audit!.before_json ?? "{}");
    const after = JSON.parse(audit!.after_json ?? "{}");
    assert.equal(before.admin_responsible_user_id, adminA.id);
    assert.equal(after.admin_responsible_user_id, adminB.id);
    assert.equal(audit!.actor_id, master.id);
  });

  // ── Motor — efeito da edição em ciclo seguinte ───────────────────────

  it("21. atribuir Admin durante atraso cria ocorrência no ciclo seguinte", async () => {
    const master = await masterAdmin();
    const admin = await internalAdmin();
    const responsavel = await createUser();
    const project = await createExistingProject();
    const past = new Date(Date.now() - 60 * 60 * 1000);
    const task = await createTaskInProject(project.id, { due_date: past, assignee_id: responsavel.id });

    await runAlertEngineOnce();
    let alerts = await prisma.systemAlert.findMany({ where: { entity_id: task.id } });
    assert.ok(alerts.every((a) => a.user_id !== admin.id), "antes de atribuir, admin não recebe nada");

    await api(`/api/projects/${project.id}`, { method: "PUT", token: tokenFor(master), body: { admin_responsible_user_id: admin.id } });
    await runAlertEngineOnce();

    alerts = await prisma.systemAlert.findMany({ where: { entity_id: task.id, user_id: admin.id, resolved_at: null } });
    assert.equal(alerts.length, 1, "no ciclo seguinte, o admin recém-atribuído recebe a ocorrência");
  });

  it("22. trocar Admin (via PUT) encerra a ocorrência antiga e cria uma nova para o novo Admin", async () => {
    const master = await masterAdmin();
    const adminA = await internalAdmin();
    const adminB = await internalAdmin();
    const project = await createExistingProject();
    await prisma.project.update({ where: { id: project.id }, data: { admin_responsible_user_id: adminA.id } });
    const past = new Date(Date.now() - 60 * 60 * 1000);
    const task = await createTaskInProject(project.id, { due_date: past, assignee_id: (await createUser()).id });

    await runAlertEngineOnce();
    const oldAlert = await prisma.systemAlert.findFirstOrThrow({ where: { entity_id: task.id, user_id: adminA.id } });

    await api(`/api/projects/${project.id}`, { method: "PUT", token: tokenFor(master), body: { admin_responsible_user_id: adminB.id } });
    await runAlertEngineOnce();

    const oldReloaded = await prisma.systemAlert.findUniqueOrThrow({ where: { id: oldAlert.id } });
    assert.ok(oldReloaded.resolved_at);
    assert.equal(oldReloaded.resolution_reason, "recipient_changed");
    const newAlert = await prisma.systemAlert.findFirst({ where: { entity_id: task.id, user_id: adminB.id, resolved_at: null } });
    assert.ok(newAlert);
  });

  it("23. remover Admin (via PUT, null) encerra a ocorrência ativa sem escolher substituto", async () => {
    const master = await masterAdmin();
    const admin = await internalAdmin();
    const project = await createExistingProject();
    await prisma.project.update({ where: { id: project.id }, data: { admin_responsible_user_id: admin.id } });
    const past = new Date(Date.now() - 60 * 60 * 1000);
    const responsavel = await createUser();
    const task = await createTaskInProject(project.id, { due_date: past, assignee_id: responsavel.id });

    await runAlertEngineOnce();
    const before = await prisma.systemAlert.count({ where: { entity_id: task.id, user_id: admin.id, resolved_at: null } });
    assert.equal(before, 1);

    await api(`/api/projects/${project.id}`, { method: "PUT", token: tokenFor(master), body: { admin_responsible_user_id: null } });
    await runAlertEngineOnce();

    const after = await prisma.systemAlert.count({ where: { entity_id: task.id, user_id: admin.id, resolved_at: null } });
    assert.equal(after, 0);
    const remaining = (await prisma.systemAlert.findMany({ where: { entity_id: task.id, type: STANDARD_KEYS.OVERDUE, resolved_at: null } })).map((a) => a.user_id);
    assert.deepEqual(remaining, [responsavel.id], "só o responsável continua recebendo — nenhum substituto pro admin removido");
  });

  it("24. execução repetida do motor após a edição não duplica", async () => {
    const master = await masterAdmin();
    const admin = await internalAdmin();
    const project = await createExistingProject();
    const past = new Date(Date.now() - 60 * 60 * 1000);
    const task = await createTaskInProject(project.id, { due_date: past, assignee_id: (await createUser()).id });

    await api(`/api/projects/${project.id}`, { method: "PUT", token: tokenFor(master), body: { admin_responsible_user_id: admin.id } });
    await runAlertEngineOnce();
    await runAlertEngineOnce();
    await runAlertEngineOnce();

    const adminAlerts = await prisma.systemAlert.findMany({ where: { entity_id: task.id, user_id: admin.id } });
    assert.equal(adminAlerts.length, 1);
  });

  it("25. Nômade/Líder permanecem intactos ao editar o Admin responsável do projeto", async () => {
    const master = await masterAdmin();
    const admin = await internalAdmin();
    const nomadeUser = await createUser();
    const nomade = await prisma.nomade.create({ data: { name: "Nomade Etapa Edit", email: `nomade-etapa-edit-${suffix}@example.test`, user_id: nomadeUser.id } });
    const lider = await createUser();
    const project = await createExistingProject();
    const past = new Date(Date.now() - 60 * 60 * 1000);
    const taskForStage = await createTaskInProject(project.id, { due_date: null });
    const stage = await prisma.projectTaskStage.create({
      data: { project_task_id: taskForStage.id, titulo: "Etapa teste edit admin", status: "EM_ANDAMENTO", prazo_execucao: past, nomade_id: nomade.id, lider_id: lider.id },
    });
    createdStageIds.push(stage.id);

    await runAlertEngineOnce();
    const nomadeAlertBefore = await prisma.systemAlert.findFirstOrThrow({ where: { entity_id: stage.id, user_id: nomadeUser.id } });
    const liderAlertBefore = await prisma.systemAlert.findFirstOrThrow({ where: { entity_id: stage.id, user_id: lider.id } });

    await api(`/api/projects/${project.id}`, { method: "PUT", token: tokenFor(master), body: { admin_responsible_user_id: admin.id } });
    await runAlertEngineOnce();

    const nomadeAlertAfter = await prisma.systemAlert.findUniqueOrThrow({ where: { id: nomadeAlertBefore.id } });
    const liderAlertAfter = await prisma.systemAlert.findUniqueOrThrow({ where: { id: liderAlertBefore.id } });
    assert.equal(nomadeAlertAfter.resolved_at, null, "ocorrência do nômade não foi tocada");
    assert.equal(liderAlertAfter.resolved_at, null, "ocorrência do líder não foi tocada");
    const adminAlert = await prisma.systemAlert.findFirst({ where: { entity_id: stage.id, user_id: admin.id, resolved_at: null } });
    assert.ok(adminAlert, "admin recém-atribuído recebe sua própria ocorrência");
  });
});
