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

// Reparo "Admin responsável" (ata 2026-08) — a categoria admin_responsavel
// do motor de alertas existia na interface mas nunca resolvia ninguém.
// Este arquivo cobre: (1) Project.admin_responsible_user_id — atribuição,
// validação e isolamento via POST/PUT /api/projects; (2) o motor
// realmente enviando ao Admin do projeto em atraso, com dedup/isolamento/
// troca/desativação corretos.

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
const createdNomadeIds: string[] = [];

async function createUser(overrides: Partial<{ role: string; account_type: string; admin_profile_id: string | null; is_active: boolean }> = {}) {
  const id = `padmin-${crypto.randomBytes(6).toString("hex")}`;
  const user = await prisma.user.create({
    data: {
      id,
      email: `${id}@example.test`,
      password_hash: "unused-test-hash",
      name: `Project Admin Test ${id}`,
      role: overrides.role ?? "company_user",
      account_type: overrides.account_type ?? "empresas",
      is_active: overrides.is_active ?? true,
      status: "ativo",
      admin_profile_id: overrides.admin_profile_id ?? null,
    },
  });
  createdUserIds.push(user.id);
  return user;
}

async function createProfile(overrides: { is_master?: boolean } = {}) {
  const profile = await prisma.adminProfile.create({
    data: { name: `perfil-padmin-${suffix}-${crypto.randomBytes(4).toString("hex")}`, is_master: overrides.is_master ?? false, is_active: true },
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

async function createNomade(): Promise<{ nomadeId: string; userId: string }> {
  const user = await createUser();
  const id = `padmin-nomade-${crypto.randomBytes(6).toString("hex")}`;
  const nomade = await prisma.nomade.create({ data: { id, name: `Nômade Teste ${id}`, email: `${id}@example.test`, user_id: user.id } });
  createdNomadeIds.push(nomade.id);
  return { nomadeId: nomade.id, userId: user.id };
}

async function createProjectFixture(overrides: { admin_responsible_user_id?: string | null } = {}) {
  const code = `${suffix}-${crypto.randomBytes(4).toString("hex")}`;
  const project = await prisma.project.create({
    data: {
      title: `Projeto teste admin responsável ${code}`,
      project_code: code,
      status: "in-progress",
      admin_responsible_user_id: overrides.admin_responsible_user_id ?? null,
    },
  });
  createdProjectIds.push(project.id);
  return project;
}

async function createProductAndLink(projectId: string) {
  const code = `${suffix}-${crypto.randomBytes(4).toString("hex")}`;
  const product = await prisma.product.create({ data: { name: `Produto teste admin resp ${code}`, category: "teste" } });
  createdProductIds.push(product.id);
  const projectProduct = await prisma.projectProduct.create({
    data: { project_id: projectId, product_id: product.id, product_name_snapshot: product.name, product_category_snapshot: product.category },
  });
  return { product, projectProduct };
}

async function createTaskInProject(projectId: string, overrides: { due_date: Date | null; assignee_id?: string | null; status?: string }) {
  const { product, projectProduct } = await createProductAndLink(projectId);
  const task = await prisma.projectTask.create({
    data: {
      project_id: projectId,
      project_product_id: projectProduct.id,
      product_id: product.id,
      name_snapshot: product.name,
      title: `Tarefa teste admin resp ${crypto.randomBytes(4).toString("hex")}`,
      status: overrides.status ?? "EM_EXECUCAO",
      due_date: overrides.due_date,
      assignee_id: overrides.assignee_id ?? null,
    },
  });
  createdTaskIds.push(task.id);
  return task;
}

async function createStageInProject(projectId: string, overrides: { prazo_execucao: Date | null; nomade_id?: string | null; lider_id?: string | null; status?: string }) {
  const task = await createTaskInProject(projectId, { due_date: null });
  const stage = await prisma.projectTaskStage.create({
    data: {
      project_task_id: task.id,
      titulo: `Etapa teste admin resp ${crypto.randomBytes(4).toString("hex")}`,
      status: overrides.status ?? "EM_ANDAMENTO",
      prazo_execucao: overrides.prazo_execucao,
      nomade_id: overrides.nomade_id ?? null,
      lider_id: overrides.lider_id ?? null,
    },
  });
  createdStageIds.push(stage.id);
  return { task, stage };
}

describe("Admin responsável do projeto (ata 2026-08, reparo 'categoria sem efeito')", () => {
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
    await prisma.productFeedbackAccessAudit.deleteMany({ where: { action: { startsWith: "alert_" } } });
    await prisma.productFeedbackAccessAudit.deleteMany({ where: { action: "project.admin_responsible_changed" } });
    await prisma.systemAlert.deleteMany({ where: { OR: [{ entity_id: { in: createdTaskIds } }, { entity_id: { in: createdStageIds } }] } });
    await prisma.projectTaskStage.deleteMany({ where: { id: { in: createdStageIds } } });
    await prisma.projectTask.deleteMany({ where: { id: { in: createdTaskIds } } });
    await prisma.projectProduct.deleteMany({ where: { project_id: { in: createdProjectIds } } });
    await prisma.project.deleteMany({ where: { id: { in: createdProjectIds } } });
    await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
    await prisma.nomade.deleteMany({ where: { id: { in: createdNomadeIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.adminProfile.deleteMany({ where: { id: { in: createdProfileIds } } });
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    await prisma.$disconnect();
  });

  // ── Projeto: atribuição/validação/isolamento ─────────────────────────

  it("1. migration aceita projetos antigos sem Admin (nulo por padrão)", async () => {
    const project = await createProjectFixture();
    assert.equal(project.admin_responsible_user_id, null);
  });

  it("2. Admin interno ativo pode ser atribuído (não precisa ser Master)", async () => {
    const master = await masterAdmin();
    const admin = await internalAdmin();
    const project = await createProjectFixture();
    const res = await api(`/api/projects/${project.id}`, { method: "PUT", token: tokenFor(master), body: { admin_responsible_user_id: admin.id } });
    assert.equal(res.status, 200);
    assert.equal((res.json as any).admin_responsible_user_id, admin.id);
  });

  it("3. usuário comum não pode ser atribuído", async () => {
    const master = await masterAdmin();
    const comum = await createUser({ role: "company_user", account_type: "empresas" });
    const project = await createProjectFixture();
    const res = await api(`/api/projects/${project.id}`, { method: "PUT", token: tokenFor(master), body: { admin_responsible_user_id: comum.id } });
    assert.equal(res.status, 400);
  });

  it("4. Nômade (mesmo com usuário vinculado) não pode ser atribuído", async () => {
    const master = await masterAdmin();
    const { userId } = await createNomade();
    const project = await createProjectFixture();
    const res = await api(`/api/projects/${project.id}`, { method: "PUT", token: tokenFor(master), body: { admin_responsible_user_id: userId } });
    assert.equal(res.status, 400);
  });

  it("5. Admin inativo não pode ser atribuído", async () => {
    const master = await masterAdmin();
    const inactiveAdmin = await internalAdmin({ is_active: false });
    const project = await createProjectFixture();
    const res = await api(`/api/projects/${project.id}`, { method: "PUT", token: tokenFor(master), body: { admin_responsible_user_id: inactiveAdmin.id } });
    assert.equal(res.status, 400);
  });

  it("6. usuário inexistente é rejeitado", async () => {
    const master = await masterAdmin();
    const project = await createProjectFixture();
    const res = await api(`/api/projects/${project.id}`, { method: "PUT", token: tokenFor(master), body: { admin_responsible_user_id: "nao-existe-de-verdade" } });
    assert.equal(res.status, 400);
  });

  it("7. troca preserva demais campos do projeto (erro não apaga a seleção anterior)", async () => {
    const master = await masterAdmin();
    const admin = await internalAdmin();
    const project = await createProjectFixture({ admin_responsible_user_id: admin.id });
    const res = await api(`/api/projects/${project.id}`, { method: "PUT", token: tokenFor(master), body: { admin_responsible_user_id: "id-invalido", title: "Novo título" } });
    assert.equal(res.status, 400);
    const reloaded = await prisma.project.findUniqueOrThrow({ where: { id: project.id } });
    assert.equal(reloaded.admin_responsible_user_id, admin.id, "erro na validação não apaga o Admin já atribuído");
    assert.notEqual(reloaded.title, "Novo título", "nada foi salvo — erro rejeita a requisição inteira, não só o campo inválido");
  });

  it("8. remoção do usuário usa SET NULL (projeto não é apagado)", async () => {
    const admin = await internalAdmin();
    const project = await createProjectFixture({ admin_responsible_user_id: admin.id });
    await prisma.user.delete({ where: { id: admin.id } });
    createdUserIds.splice(createdUserIds.indexOf(admin.id), 1);
    const reloaded = await prisma.project.findUniqueOrThrow({ where: { id: project.id } });
    assert.equal(reloaded.admin_responsible_user_id, null);
  });

  it("usuário comum autenticado não consegue atribuir admin_responsible_user_id (campo é ignorado, não erro)", async () => {
    const comum = await createUser({ role: "company_user", account_type: "empresas" });
    const admin = await internalAdmin();
    const project = await createProjectFixture();
    const res = await api(`/api/projects/${project.id}`, { method: "PUT", token: tokenFor(comum), body: { admin_responsible_user_id: admin.id, title: project.title } });
    // Não é dono do projeto (sem escopo) -> pode dar 403 de visibilidade;
    // o que importa é que em NENHUM caminho o campo é aceito de quem não é Admin.
    const reloaded = await prisma.project.findUniqueOrThrow({ where: { id: project.id } });
    assert.equal(reloaded.admin_responsible_user_id, null);
    void res;
  });

  // ── Motor: resolução via projeto ──────────────────────────────────────

  it("9/10. tarefa atrasada envia ao executor E ao Admin do projeto", async () => {
    const responsavel = await createUser();
    const admin = await internalAdmin();
    const project = await createProjectFixture({ admin_responsible_user_id: admin.id });
    const past = new Date(Date.now() - 60 * 60 * 1000);
    const task = await createTaskInProject(project.id, { due_date: past, assignee_id: responsavel.id });

    await runAlertEngineOnce();

    const alerts = await prisma.systemAlert.findMany({ where: { entity_id: task.id, type: STANDARD_KEYS.OVERDUE } });
    const recipients = alerts.map((a) => a.user_id).sort();
    assert.deepEqual(recipients, [admin.id, responsavel.id].sort());
  });

  it("11/12. etapa atrasada envia a Nômade/Líder E ao Admin do projeto", async () => {
    const { nomadeId, userId: nomadeUserId } = await createNomade();
    const lider = await createUser();
    const admin = await internalAdmin();
    const project = await createProjectFixture({ admin_responsible_user_id: admin.id });
    const past = new Date(Date.now() - 60 * 60 * 1000);
    const { stage } = await createStageInProject(project.id, { prazo_execucao: past, nomade_id: nomadeId, lider_id: lider.id });

    await runAlertEngineOnce();

    const alerts = await prisma.systemAlert.findMany({ where: { entity_id: stage.id, type: STANDARD_KEYS.STAGE_OVERDUE } });
    const recipients = alerts.map((a) => a.user_id).sort();
    assert.deepEqual(recipients, [admin.id, lider.id, nomadeUserId].sort());
  });

  it("13. prazo próximo não envia ao Admin (a regra de due_soon não inclui essa categoria por padrão)", async () => {
    const responsavel = await createUser();
    const admin = await internalAdmin();
    const project = await createProjectFixture({ admin_responsible_user_id: admin.id });
    const soon = new Date(Date.now() + 3 * 60 * 60 * 1000);
    const task = await createTaskInProject(project.id, { due_date: soon, assignee_id: responsavel.id });

    await runAlertEngineOnce();

    const alerts = await prisma.systemAlert.findMany({ where: { entity_id: task.id } });
    assert.ok(alerts.every((a) => a.user_id !== admin.id), "Admin não recebe aviso prévio automaticamente sem estar configurado nessa regra");
  });

  it("14/15. projeto sem Admin não faz broadcast — registra a lacuna", async () => {
    const responsavel = await createUser();
    const project = await createProjectFixture({ admin_responsible_user_id: null });
    const past = new Date(Date.now() - 60 * 60 * 1000);
    const task = await createTaskInProject(project.id, { due_date: past, assignee_id: responsavel.id });

    const result = await runAlertEngineOnce();

    const alerts = await prisma.systemAlert.findMany({ where: { entity_id: task.id } });
    assert.deepEqual(alerts.map((a) => a.user_id), [responsavel.id], "só o executor recebeu — nenhum admin aleatório");
    assert.ok(result.skippedNoAdminResponsavel >= 1);
  });

  it("16. organização diferente (outro projeto) não recebe o alerta do primeiro", async () => {
    const adminA = await internalAdmin();
    const adminB = await internalAdmin();
    const projectA = await createProjectFixture({ admin_responsible_user_id: adminA.id });
    const projectB = await createProjectFixture({ admin_responsible_user_id: adminB.id });
    const past = new Date(Date.now() - 60 * 60 * 1000);
    const respA = await createUser();
    const respB = await createUser();
    const taskA = await createTaskInProject(projectA.id, { due_date: past, assignee_id: respA.id });
    const taskB = await createTaskInProject(projectB.id, { due_date: past, assignee_id: respB.id });

    await runAlertEngineOnce();

    const alertsA = await prisma.systemAlert.findMany({ where: { entity_id: taskA.id } });
    const alertsB = await prisma.systemAlert.findMany({ where: { entity_id: taskB.id } });
    assert.ok(alertsA.every((a) => a.user_id !== adminB.id));
    assert.ok(alertsB.every((a) => a.user_id !== adminA.id));
  });

  it("17. execução repetida não duplica a ocorrência do Admin", async () => {
    const admin = await internalAdmin();
    const project = await createProjectFixture({ admin_responsible_user_id: admin.id });
    const past = new Date(Date.now() - 60 * 60 * 1000);
    const task = await createTaskInProject(project.id, { due_date: past, assignee_id: (await createUser()).id });

    await runAlertEngineOnce();
    await runAlertEngineOnce();
    await runAlertEngineOnce();

    const adminAlerts = await prisma.systemAlert.findMany({ where: { entity_id: task.id, user_id: admin.id } });
    assert.equal(adminAlerts.length, 1);
  });

  it("18. o mesmo Admin em duas categorias (ex.: também é o executor) recebe só uma ocorrência", async () => {
    const admin = await internalAdmin();
    const project = await createProjectFixture({ admin_responsible_user_id: admin.id });
    const past = new Date(Date.now() - 60 * 60 * 1000);
    // O próprio Admin é o assignee da tarefa (categoria "responsavel" cai
    // na cadeia até assignee_id) — e também é o admin_responsavel do
    // projeto. Ele existe nas duas categorias, mas só recebe UMA ocorrência.
    const task = await createTaskInProject(project.id, { due_date: past, assignee_id: admin.id });

    await runAlertEngineOnce();

    const adminAlerts = await prisma.systemAlert.findMany({ where: { entity_id: task.id, user_id: admin.id } });
    assert.equal(adminAlerts.length, 1);
  });

  it("19/20. trocar o Admin do projeto encerra a ocorrência anterior e cria uma nova para o novo Admin", async () => {
    const adminOld = await internalAdmin();
    const adminNew = await internalAdmin();
    const project = await createProjectFixture({ admin_responsible_user_id: adminOld.id });
    const past = new Date(Date.now() - 60 * 60 * 1000);
    const task = await createTaskInProject(project.id, { due_date: past, assignee_id: (await createUser()).id });

    await runAlertEngineOnce();
    const oldAlert = await prisma.systemAlert.findFirstOrThrow({ where: { entity_id: task.id, user_id: adminOld.id } });

    await prisma.project.update({ where: { id: project.id }, data: { admin_responsible_user_id: adminNew.id } });
    await runAlertEngineOnce();

    const oldReloaded = await prisma.systemAlert.findUniqueOrThrow({ where: { id: oldAlert.id } });
    assert.ok(oldReloaded.resolved_at, "ocorrência do admin anterior é encerrada");
    assert.equal(oldReloaded.resolution_reason, "recipient_changed");

    const newAlert = await prisma.systemAlert.findFirst({ where: { entity_id: task.id, user_id: adminNew.id, resolved_at: null } });
    assert.ok(newAlert, "o novo admin recebe ocorrência própria");
  });

  it("21. desativar o Admin impede novo envio (sem escolher substituto)", async () => {
    const admin = await internalAdmin();
    const otherAdmin = await internalAdmin();
    const project = await createProjectFixture({ admin_responsible_user_id: admin.id });
    const past = new Date(Date.now() - 60 * 60 * 1000);
    const responsavel = await createUser();
    const task = await createTaskInProject(project.id, { due_date: past, assignee_id: responsavel.id });

    await runAlertEngineOnce();
    const activeBefore = await prisma.systemAlert.count({ where: { entity_id: task.id, user_id: admin.id, resolved_at: null } });
    assert.equal(activeBefore, 1);

    await prisma.user.update({ where: { id: admin.id }, data: { is_active: false } });
    await runAlertEngineOnce();

    const activeAfter = await prisma.systemAlert.count({ where: { entity_id: task.id, user_id: admin.id, resolved_at: null } });
    assert.equal(activeAfter, 0, "a ocorrência do admin desativado é encerrada");
    // Nenhum OUTRO admin (nem `otherAdmin`, que não tem nenhum vínculo com
    // este projeto) recebeu o alerta como substituto — só o responsável
    // legítimo da tarefa continua recebendo o dele.
    const remainingRecipients = (await prisma.systemAlert.findMany({ where: { entity_id: task.id, type: STANDARD_KEYS.OVERDUE, resolved_at: null } })).map((a) => a.user_id);
    assert.deepEqual(remainingRecipients, [responsavel.id]);
    assert.ok(!remainingRecipients.includes(otherAdmin.id), "nenhum substituto aleatório recebeu o alerta");
  });

  it("22. concluir a tarefa resolve todas as ocorrências relacionadas (executor e Admin)", async () => {
    const responsavel = await createUser();
    const admin = await internalAdmin();
    const project = await createProjectFixture({ admin_responsible_user_id: admin.id });
    const past = new Date(Date.now() - 60 * 60 * 1000);
    const task = await createTaskInProject(project.id, { due_date: past, assignee_id: responsavel.id });

    await runAlertEngineOnce();
    await prisma.projectTask.update({ where: { id: task.id }, data: { status: "CONCLUIDA" } });
    await runAlertEngineOnce();

    const alerts = await prisma.systemAlert.findMany({ where: { entity_id: task.id } });
    assert.equal(alerts.length, 2);
    assert.ok(alerts.every((a) => a.resolved_at !== null));
  });

  it("23. Alerta Avulso permanece intocado mesmo endereçado a um Admin com projeto configurado", async () => {
    const admin = await internalAdmin();
    const avulso = await prisma.systemAlert.create({
      data: { type: "alerta_admin_manual", title: "Avulso intacto", message: "Mensagem", severity: "warning", category: "alerta", user_id: admin.id },
    });
    await runAlertEngineOnce();
    const reloaded = await prisma.systemAlert.findUniqueOrThrow({ where: { id: avulso.id } });
    assert.equal(reloaded.resolved_at, null);
    await prisma.systemAlert.delete({ where: { id: avulso.id } });
  });

  it("bootstrap idempotente inclui admin_responsavel nas regras de atraso sem duplicar nem remover outras categorias", async () => {
    const before = await prisma.alertRule.findFirstOrThrow({ where: { trigger_type: STANDARD_KEYS.OVERDUE } });
    const before2 = await prisma.alertRule.findFirstOrThrow({ where: { trigger_type: STANDARD_KEYS.STAGE_OVERDUE } });
    await ensureDefaultAlertStandardsAndRules();
    await ensureDefaultAlertStandardsAndRules();
    const after = await prisma.alertRule.findUniqueOrThrow({ where: { id: before.id } });
    const after2 = await prisma.alertRule.findUniqueOrThrow({ where: { id: before2.id } });
    const roles = JSON.parse(after.recipient_roles_json) as string[];
    const roles2 = JSON.parse(after2.recipient_roles_json) as string[];
    assert.equal(roles.filter((r) => r === "admin_responsavel").length, 1);
    assert.equal(roles2.filter((r) => r === "admin_responsavel").length, 1);
    assert.ok(roles.includes("responsavel"), "categorias já configuradas antes são preservadas");
  });
});
