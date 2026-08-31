import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import app from "../app";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import { ensureDefaultAlertStandardsAndRules, runAlertEngineOnce, runAlertEngineOnceGuarded, STANDARD_KEYS } from "../lib/alert-engine";

// Lote "Padrões/Regras" (ata 2026-08, 2º lote): Padrão -> Regra ->
// Verificação automática -> Ocorrência. Cobre o bootstrap idempotente, as
// rotas administrativas de Padrões/Regras, e o motor automático de tarefa
// próxima do prazo / atrasada contra um banco local descartável.

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
const createdNomadeIds: string[] = [];

async function createUser(overrides: Partial<{
  role: string;
  account_type: string;
  admin_profile_id: string | null;
  is_active: boolean;
}> = {}) {
  const id = `alert-engine-${crypto.randomBytes(6).toString("hex")}`;
  const user = await prisma.user.create({
    data: {
      id,
      email: `${id}@example.test`,
      password_hash: "unused-test-hash",
      name: `Alert Engine Test ${id}`,
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
    data: {
      name: `perfil-alert-engine-${suffix}-${crypto.randomBytes(4).toString("hex")}`,
      is_master: overrides.is_master ?? false,
      is_active: true,
    },
  });
  createdProfileIds.push(profile.id);
  return profile;
}

async function masterAdmin() {
  const profile = await createProfile({ is_master: true });
  return createUser({ role: "admin", account_type: "admin", admin_profile_id: profile.id });
}

async function createTaskFixture(overrides: {
  due_date: Date | null;
  status?: string;
  assignee_id?: string | null;
}) {
  const code = `${suffix}-${crypto.randomBytes(4).toString("hex")}`;
  const project = await prisma.project.create({
    data: { title: `Projeto teste motor de alertas ${code}`, project_code: code, status: "in-progress" },
  });
  createdProjectIds.push(project.id);

  const product = await prisma.product.create({
    data: { name: `Produto teste motor ${code}`, category: "teste" },
  });
  createdProductIds.push(product.id);

  const projectProduct = await prisma.projectProduct.create({
    data: {
      project_id: project.id,
      product_id: product.id,
      product_name_snapshot: product.name,
      product_category_snapshot: product.category,
    },
  });

  const task = await prisma.projectTask.create({
    data: {
      project_id: project.id,
      project_product_id: projectProduct.id,
      product_id: product.id,
      name_snapshot: product.name,
      title: `Tarefa teste ${code}`,
      status: overrides.status ?? "EM_EXECUCAO",
      due_date: overrides.due_date,
      assignee_id: overrides.assignee_id ?? null,
    },
  });
  createdTaskIds.push(task.id);
  return { project, product, projectProduct, task };
}

describe("Motor de alertas automáticos — Padrões/Regras/Ocorrências (ata 2026-08, 2º lote)", () => {
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
    await prisma.systemAlert.deleteMany({ where: { entity_id: { in: createdTaskIds } } });
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

  // ── Bootstrap idempotente ────────────────────────────────────────────────

  it("1. os dois padrões obrigatórios existem uma única vez", async () => {
    const standards = await prisma.alertStandard.findMany({
      where: { key: { in: [STANDARD_KEYS.DUE_SOON, STANDARD_KEYS.OVERDUE] } },
    });
    assert.equal(standards.length, 2);
    const rules = await prisma.alertRule.findMany({
      where: { trigger_type: { in: [STANDARD_KEYS.DUE_SOON, STANDARD_KEYS.OVERDUE] } },
    });
    assert.equal(rules.length, 2);
  });

  it("2. rodar o bootstrap de novo não duplica", async () => {
    await ensureDefaultAlertStandardsAndRules();
    await ensureDefaultAlertStandardsAndRules();
    const standards = await prisma.alertStandard.findMany({
      where: { key: { in: [STANDARD_KEYS.DUE_SOON, STANDARD_KEYS.OVERDUE] } },
    });
    assert.equal(standards.length, 2);
    const rules = await prisma.alertRule.findMany({
      where: { trigger_type: { in: [STANDARD_KEYS.DUE_SOON, STANDARD_KEYS.OVERDUE] } },
    });
    assert.equal(rules.length, 2);
  });

  // ── Permissões e validação — Padrões ─────────────────────────────────────

  it("3. usuário comum recebe 403 ao tentar editar um padrão", async () => {
    const user = await createUser();
    const standard = await prisma.alertStandard.findFirstOrThrow({ where: { key: STANDARD_KEYS.DUE_SOON } });
    const res = await api(`/api/system-alerts/admin/standards/${standard.id}`, {
      method: "PATCH",
      token: tokenFor(user),
      body: { name: "Tentativa não autorizada" },
    });
    assert.equal(res.status, 403);
  });

  it("4. Master pode editar nome/título/mensagem/criticidade/ativo — mas nunca a key", async () => {
    const master = await masterAdmin();
    const standard = await prisma.alertStandard.findFirstOrThrow({ where: { key: STANDARD_KEYS.DUE_SOON } });
    const res = await api(`/api/system-alerts/admin/standards/${standard.id}`, {
      method: "PATCH",
      token: tokenFor(master),
      body: { name: "Prazo próximo (editado)", key: "hack.tentativa" },
    });
    assert.equal(res.status, 200);
    const reloaded = await prisma.alertStandard.findUniqueOrThrow({ where: { id: standard.id } });
    assert.equal(reloaded.name, "Prazo próximo (editado)");
    assert.equal(reloaded.key, STANDARD_KEYS.DUE_SOON, "chave estável não pode ser alterada, mesmo enviada no corpo");
  });

  it("5. título/mensagem vazios são rejeitados", async () => {
    const master = await masterAdmin();
    const standard = await prisma.alertStandard.findFirstOrThrow({ where: { key: STANDARD_KEYS.DUE_SOON } });
    const res = await api(`/api/system-alerts/admin/standards/${standard.id}`, {
      method: "PATCH",
      token: tokenFor(master),
      body: { title: "" },
    });
    assert.equal(res.status, 400);
  });

  it("6. variável desconhecida na mensagem é rejeitada", async () => {
    const master = await masterAdmin();
    const standard = await prisma.alertStandard.findFirstOrThrow({ where: { key: STANDARD_KEYS.DUE_SOON } });
    const res = await api(`/api/system-alerts/admin/standards/${standard.id}`, {
      method: "PATCH",
      token: tokenFor(master),
      body: { message: "Tarefa {{tarefa}} com {{campo_inexistente}}" },
    });
    assert.equal(res.status, 400);
  });

  it("7. prévia nunca cria alerta real", async () => {
    const master = await masterAdmin();
    const standard = await prisma.alertStandard.findFirstOrThrow({ where: { key: STANDARD_KEYS.DUE_SOON } });
    const before = await prisma.systemAlert.count();
    const res = await api(`/api/system-alerts/admin/standards/${standard.id}/preview`, {
      method: "POST",
      token: tokenFor(master),
    });
    assert.equal(res.status, 200);
    assert.equal((res.json as any).fictitious, true);
    const after = await prisma.systemAlert.count();
    assert.equal(after, before);
  });

  // ── Permissões e validação — Regras ──────────────────────────────────────

  it("8. usuário comum recebe 403 ao tentar editar uma regra", async () => {
    const user = await createUser();
    const rule = await prisma.alertRule.findFirstOrThrow({ where: { trigger_type: STANDARD_KEYS.DUE_SOON } });
    const res = await api(`/api/system-alerts/admin/rules/${rule.id}`, {
      method: "PATCH",
      token: tokenFor(user),
      body: { is_active: false },
    });
    assert.equal(res.status, 403);
  });

  it("9. Master pode ativar/desativar uma regra", async () => {
    const master = await masterAdmin();
    const rule = await prisma.alertRule.findFirstOrThrow({ where: { trigger_type: STANDARD_KEYS.OVERDUE } });
    const off = await api(`/api/system-alerts/admin/rules/${rule.id}`, {
      method: "PATCH", token: tokenFor(master), body: { is_active: false },
    });
    assert.equal(off.status, 200);
    assert.equal((off.json as any).is_active, false);
    const on = await api(`/api/system-alerts/admin/rules/${rule.id}`, {
      method: "PATCH", token: tokenFor(master), body: { is_active: true },
    });
    assert.equal(on.status, 200);
    assert.equal((on.json as any).is_active, true);
  });

  it("10. antecedência inválida (<=0) é rejeitada", async () => {
    const master = await masterAdmin();
    const rule = await prisma.alertRule.findFirstOrThrow({ where: { trigger_type: STANDARD_KEYS.DUE_SOON } });
    const res = await api(`/api/system-alerts/admin/rules/${rule.id}`, {
      method: "PATCH", token: tokenFor(master), body: { lead_time_minutes: 0 },
    });
    assert.equal(res.status, 400);
  });

  it("11. editar a antecedência persiste", async () => {
    const master = await masterAdmin();
    const rule = await prisma.alertRule.findFirstOrThrow({ where: { trigger_type: STANDARD_KEYS.DUE_SOON } });
    const res = await api(`/api/system-alerts/admin/rules/${rule.id}`, {
      method: "PATCH", token: tokenFor(master), body: { lead_time_minutes: 1440 },
    });
    assert.equal(res.status, 200);
    const reloaded = await prisma.alertRule.findUniqueOrThrow({ where: { id: rule.id } });
    assert.equal(reloaded.lead_time_minutes, 1440);
  });

  // ── Automação: criação ───────────────────────────────────────────────────

  it("12. tarefa fora da janela (prazo distante) não cria alerta", async () => {
    const responsavel = await createUser({ is_active: true });
    const farFuture = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const { task } = await createTaskFixture({ due_date: farFuture, assignee_id: responsavel.id });
    await runAlertEngineOnce();
    const alerts = await prisma.systemAlert.findMany({ where: { entity_id: task.id } });
    assert.equal(alerts.length, 0);
  });

  it("13. tarefa dentro da janela cria ocorrência Amarela (warning) para o responsável", async () => {
    const responsavel = await createUser({ is_active: true });
    const soon = new Date(Date.now() + 6 * 60 * 60 * 1000); // 6h — dentro das 24h padrão
    const { task } = await createTaskFixture({ due_date: soon, assignee_id: responsavel.id });
    await runAlertEngineOnce();
    const alerts = await prisma.systemAlert.findMany({ where: { entity_id: task.id, resolved_at: null } });
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0]?.severity, "warning");
    assert.equal(alerts[0]?.user_id, responsavel.id);
    assert.equal(alerts[0]?.type, STANDARD_KEYS.DUE_SOON);
  });

  it("14. tarefa atrasada cria ocorrência Vermelha (error)", async () => {
    const responsavel = await createUser({ is_active: true });
    const past = new Date(Date.now() - 60 * 60 * 1000);
    const { task } = await createTaskFixture({ due_date: past, assignee_id: responsavel.id });
    await runAlertEngineOnce();
    const alerts = await prisma.systemAlert.findMany({ where: { entity_id: task.id, resolved_at: null, type: STANDARD_KEYS.OVERDUE } });
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0]?.severity, "error");
  });

  it("15. segunda execução não duplica a mesma ocorrência", async () => {
    const responsavel = await createUser({ is_active: true });
    const soon = new Date(Date.now() + 3 * 60 * 60 * 1000);
    const { task } = await createTaskFixture({ due_date: soon, assignee_id: responsavel.id });
    await runAlertEngineOnce();
    await runAlertEngineOnce();
    await runAlertEngineOnce();
    const alerts = await prisma.systemAlert.findMany({ where: { entity_id: task.id } });
    assert.equal(alerts.length, 1);
  });

  it("16. tarefas de usuários diferentes permanecem isoladas", async () => {
    const respA = await createUser({ is_active: true });
    const respB = await createUser({ is_active: true });
    const soon = new Date(Date.now() + 3 * 60 * 60 * 1000);
    const { task: taskA } = await createTaskFixture({ due_date: soon, assignee_id: respA.id });
    const { task: taskB } = await createTaskFixture({ due_date: soon, assignee_id: respB.id });
    await runAlertEngineOnce();
    const alertsA = await prisma.systemAlert.findMany({ where: { entity_id: taskA.id } });
    const alertsB = await prisma.systemAlert.findMany({ where: { entity_id: taskB.id } });
    assert.equal(alertsA[0]?.user_id, respA.id);
    assert.equal(alertsB[0]?.user_id, respB.id);
    assert.notEqual(alertsA[0]?.id, alertsB[0]?.id);
  });

  it("17. tarefa sem nenhum responsável não dispara para pessoa errada (fica sem ocorrência)", async () => {
    const soon = new Date(Date.now() + 3 * 60 * 60 * 1000);
    const { task } = await createTaskFixture({ due_date: soon, assignee_id: null });
    await runAlertEngineOnce();
    const alerts = await prisma.systemAlert.findMany({ where: { entity_id: task.id } });
    assert.equal(alerts.length, 0);
  });

  // ── Automação: encerramento ───────────────────────────────────────────────

  it("18. tarefa concluída resolve a ocorrência automática", async () => {
    const responsavel = await createUser({ is_active: true });
    const soon = new Date(Date.now() + 3 * 60 * 60 * 1000);
    const { task } = await createTaskFixture({ due_date: soon, assignee_id: responsavel.id });
    await runAlertEngineOnce();
    await prisma.projectTask.update({ where: { id: task.id }, data: { status: "CONCLUIDA" } });
    await runAlertEngineOnce();
    const alert = await prisma.systemAlert.findFirstOrThrow({ where: { entity_id: task.id } });
    // Resolução AUTOMÁTICA de tarefa (bloco 1/2) usa os campos novos —
    // `resolved_at`/`resolution_reason` ficam pra expiração/etapas.
    assert.ok(alert.automatic_resolved_at, "deve ter data de resolução automática");
    assert.equal(alert.resolved_at, null, "resolução automática nunca preenche resolved_at (campo da expiração)");
    assert.equal(alert.automatic_resolution_reason, "task_completed");
    assert.equal(alert.automatic_resolution_message, "A tarefa foi concluída.");
    assert.ok(alert.condition_cleared_at, "episódio encerrado");
    // Reparo semântico: resolver ≠ arquivar — sai da visão ativa por estar
    // resolvido (filtro `resolved`), não por arquivamento.
    assert.equal(alert.is_archived, false, "resolução automática não arquiva");
  });

  it("19. tarefa cancelada resolve a ocorrência automática", async () => {
    const responsavel = await createUser({ is_active: true });
    const soon = new Date(Date.now() + 3 * 60 * 60 * 1000);
    const { task } = await createTaskFixture({ due_date: soon, assignee_id: responsavel.id });
    await runAlertEngineOnce();
    await prisma.projectTask.update({ where: { id: task.id }, data: { status: "CANCELADA" } });
    await runAlertEngineOnce();
    const alert = await prisma.systemAlert.findFirstOrThrow({ where: { entity_id: task.id } });
    assert.equal(alert.automatic_resolution_reason, "task_cancelled");
    assert.equal(alert.automatic_resolution_message, "A tarefa foi cancelada.");
  });

  it("20. mudança de prazo pra fora da janela limpa a condição (Amarelo resolvido)", async () => {
    const responsavel = await createUser({ is_active: true });
    const soon = new Date(Date.now() + 3 * 60 * 60 * 1000);
    const { task } = await createTaskFixture({ due_date: soon, assignee_id: responsavel.id });
    await runAlertEngineOnce();
    const farFuture = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
    await prisma.projectTask.update({ where: { id: task.id }, data: { due_date: farFuture } });
    await runAlertEngineOnce();
    const alert = await prisma.systemAlert.findFirstOrThrow({ where: { entity_id: task.id, type: STANDARD_KEYS.DUE_SOON } });
    assert.equal(alert.automatic_resolution_reason, "deadline_out_of_window");
    assert.equal(alert.automatic_resolution_message, "O prazo foi alterado para fora da janela de alerta.");
  });

  it("21. transição de prazo próximo para atrasada encerra o Amarelo e cria o Vermelho, sem duplicar", async () => {
    const responsavel = await createUser({ is_active: true });
    const soon = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const { task } = await createTaskFixture({ due_date: soon, assignee_id: responsavel.id });
    await runAlertEngineOnce();
    const amareloBefore = await prisma.systemAlert.findFirstOrThrow({ where: { entity_id: task.id, type: STANDARD_KEYS.DUE_SOON } });
    assert.equal(amareloBefore.automatic_resolved_at, null);

    const past = new Date(Date.now() - 60 * 60 * 1000);
    await prisma.projectTask.update({ where: { id: task.id }, data: { due_date: past } });
    await runAlertEngineOnce();
    await runAlertEngineOnce();

    const amareloAfter = await prisma.systemAlert.findUniqueOrThrow({ where: { id: amareloBefore.id } });
    assert.ok(amareloAfter.automatic_resolved_at, "amarelo deve ter sido encerrado na transição");
    assert.equal(amareloAfter.automatic_resolution_reason, "superseded_by_overdue");

    const vermelhos = await prisma.systemAlert.findMany({ where: { entity_id: task.id, type: STANDARD_KEYS.OVERDUE } });
    assert.equal(vermelhos.length, 1, "vermelho não pode duplicar em execuções repetidas");
    assert.equal(vermelhos[0]?.automatic_resolved_at, null, "o vermelho da tarefa realmente atrasada continua ativo");
  });

  it("22. alerta avulso (manual) não é resolvido pela automação", async () => {
    const responsavel = await createUser({ is_active: true });
    const avulso = await prisma.systemAlert.create({
      data: {
        type: "alerta_admin_manual",
        title: "Avulso de teste",
        message: "Mensagem avulsa",
        severity: "warning",
        category: "alerta",
        user_id: responsavel.id,
        entity_type: "project_task",
        entity_id: `tarefa-inexistente-${suffix}`,
      },
    });
    await runAlertEngineOnce();
    const reloaded = await prisma.systemAlert.findUniqueOrThrow({ where: { id: avulso.id } });
    assert.equal(reloaded.resolved_at, null, "avulso (standard_id nulo) nunca é tocado pela automação");
    await prisma.systemAlert.delete({ where: { id: avulso.id } });
  });

  it("23. concorrência (duas varreduras simultâneas) não cria duas ocorrências para a mesma tarefa", async () => {
    // Usa a versão com trava (a mesma que roda em produção, ver index.ts) —
    // é a trava em memória do processo único (instances: 1) que protege
    // contra sobreposição real, não o dedupe_key sozinho (que só evita
    // duplicar entre CICLOS, não dentro do mesmo instante).
    const responsavel = await createUser({ is_active: true });
    const soon = new Date(Date.now() + 3 * 60 * 60 * 1000);
    const { task } = await createTaskFixture({ due_date: soon, assignee_id: responsavel.id });
    await Promise.all([runAlertEngineOnceGuarded(), runAlertEngineOnceGuarded()]);
    const alerts = await prisma.systemAlert.findMany({ where: { entity_id: task.id } });
    assert.equal(alerts.length, 1);
  });
});
