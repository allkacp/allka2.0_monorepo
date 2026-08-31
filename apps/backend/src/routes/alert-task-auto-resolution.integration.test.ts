import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import app from "../app";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import {
  ensureDefaultAlertStandardsAndRules,
  runAlertEngineOnce,
  STANDARD_KEYS,
} from "../lib/alert-engine";

// Resolução AUTOMÁTICA de alertas de TAREFA (ata 2026-08, bloco 1/2 —
// "resolução automática de alertas de tarefa"). Só `task.due_soon` /
// `task.overdue`. Cobre: ciclo da ocorrência, motivos legíveis, transição
// próxima→atrasada, resolução manual durante condição ativa, separação de
// expiração/manual/automática, isolamento por destinatário, concorrência,
// e que etapas/avulsos/programados não são afetados. Banco local descartável.

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
const createdAvulsoIds: string[] = [];

async function createUser(overrides: Partial<{ role: string; account_type: string; admin_profile_id: string | null; is_active: boolean }> = {}) {
  const id = `alert-autores-${crypto.randomBytes(6).toString("hex")}`;
  const user = await prisma.user.create({
    data: {
      id,
      email: `${id}@example.test`,
      password_hash: "unused-test-hash",
      name: `Auto Resolution Test ${id}`,
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
    data: { name: `perfil-autores-${suffix}-${crypto.randomBytes(4).toString("hex")}`, is_master: overrides.is_master ?? false, is_active: true },
  });
  createdProfileIds.push(profile.id);
  return profile;
}

async function masterAdmin() {
  const profile = await createProfile({ is_master: true });
  return createUser({ role: "admin", account_type: "admin", admin_profile_id: profile.id });
}

async function createNomade(): Promise<{ nomadeId: string; userId: string }> {
  const user = await createUser();
  const id = `nomade-${crypto.randomBytes(6).toString("hex")}`;
  const nomade = await prisma.nomade.create({ data: { id, name: `Nômade Teste ${id}`, email: `${id}@example.test`, user_id: user.id } });
  createdNomadeIds.push(nomade.id);
  return { nomadeId: nomade.id, userId: user.id };
}

async function createTaskFixture(overrides: { due_date: Date | null; status?: string; assignee_id?: string | null }) {
  const code = `${suffix}-${crypto.randomBytes(4).toString("hex")}`;
  const project = await prisma.project.create({ data: { title: `Projeto auto-resolução ${code}`, project_code: code, status: "in-progress" } });
  createdProjectIds.push(project.id);
  const product = await prisma.product.create({ data: { name: `Produto auto-resolução ${code}`, category: "teste" } });
  createdProductIds.push(product.id);
  const projectProduct = await prisma.projectProduct.create({
    data: { project_id: project.id, product_id: product.id, product_name_snapshot: product.name, product_category_snapshot: product.category },
  });
  const task = await prisma.projectTask.create({
    data: {
      project_id: project.id,
      project_product_id: projectProduct.id,
      product_id: product.id,
      name_snapshot: product.name,
      title: `Tarefa auto-resolução ${code}`,
      status: overrides.status ?? "EM_EXECUCAO",
      due_date: overrides.due_date,
      assignee_id: overrides.assignee_id ?? null,
    },
  });
  createdTaskIds.push(task.id);
  return { project, task };
}

async function createStageFixture(overrides: { prazo_execucao: Date | null; status?: string; nomade_id?: string | null }) {
  const { task } = await createTaskFixture({ due_date: null });
  const stage = await prisma.projectTaskStage.create({
    data: {
      project_task_id: task.id,
      titulo: `Etapa auto-resolução ${crypto.randomBytes(4).toString("hex")}`,
      status: overrides.status ?? "EM_ANDAMENTO",
      prazo_execucao: overrides.prazo_execucao,
      nomade_id: overrides.nomade_id ?? null,
    },
  });
  createdStageIds.push(stage.id);
  return { task, stage };
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const soonDate = () => new Date(Date.now() + 3 * HOUR); // dentro da janela padrão (24h)
const overdueDate = () => new Date(Date.now() - 2 * HOUR);

async function eventsFor(alertId: string, type?: string) {
  return prisma.systemAlertEvent.findMany({
    where: { alert_id: alertId, ...(type ? { event_type: type } : {}) },
    orderBy: { created_at: "asc" },
  });
}

describe("Motor de alertas — resolução automática de tarefa (ata 2026-08, bloco 1/2)", () => {
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
    await prisma.systemAlert.deleteMany({ where: { id: { in: createdAvulsoIds } } });
    await prisma.systemAlert.deleteMany({ where: { entity_id: { in: [...createdTaskIds, ...createdStageIds] } } });
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

  // ── Ciclo da ocorrência ────────────────────────────────────────────────

  it("1/2. tarefa próxima do prazo cria UMA ocorrência e ciclos seguintes não duplicam", async () => {
    const user = await createUser();
    const { task } = await createTaskFixture({ due_date: soonDate(), assignee_id: user.id });
    await runAlertEngineOnce();
    await runAlertEngineOnce();
    await runAlertEngineOnce();
    const alerts = await prisma.systemAlert.findMany({ where: { entity_id: task.id } });
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0]?.type, STANDARD_KEYS.DUE_SOON);
    assert.equal(alerts[0]?.automatic_resolved_at, null);
  });

  it("3. tarefa concluída resolve automaticamente com motivo legível e evento no histórico", async () => {
    const user = await createUser();
    const { task } = await createTaskFixture({ due_date: soonDate(), assignee_id: user.id });
    await runAlertEngineOnce();
    const before = await prisma.systemAlert.findFirstOrThrow({ where: { entity_id: task.id } });
    await prisma.projectTask.update({ where: { id: task.id }, data: { status: "CONCLUIDA" } });
    await runAlertEngineOnce();

    const alert = await prisma.systemAlert.findUniqueOrThrow({ where: { id: before.id } });
    assert.ok(alert.automatic_resolved_at, "tem data/hora de resolução automática");
    assert.equal(alert.automatic_resolution_reason, "task_completed");
    assert.equal(alert.automatic_resolution_message, "A tarefa foi concluída.");
    assert.ok(alert.condition_cleared_at, "episódio encerrado");
    assert.equal(alert.dedupe_key, null, "chave liberada pra um episódio futuro");
    // Reparo semântico: resolver ≠ arquivar — a resolução automática NÃO arquiva.
    assert.equal(alert.is_archived, false, "resolução automática não arquiva");
    assert.equal(alert.archived_at, null);
    // Distinção de expiração/manual: os campos legados/humanos ficam nulos.
    assert.equal(alert.resolved_at, null);
    assert.equal(alert.resolution_reason, null);
    assert.equal(alert.manual_resolved_at, null);

    const autoEvents = await eventsFor(before.id, "auto_resolved");
    assert.equal(autoEvents.length, 1);
    assert.equal(autoEvents[0]?.description, "Alerta resolvido automaticamente pelo Motor da Allka.");
    assert.equal(autoEvents[0]?.actor_user_id, null, "autor é o Motor da Allka, nunca uma pessoa");
    assert.match(autoEvents[0]?.metadata_json ?? "", /task_completed/);
  });

  it("4. tarefa cancelada resolve automaticamente (motivo próprio)", async () => {
    const user = await createUser();
    const { task } = await createTaskFixture({ due_date: soonDate(), assignee_id: user.id });
    await runAlertEngineOnce();
    await prisma.projectTask.update({ where: { id: task.id }, data: { status: "CANCELADA" } });
    await runAlertEngineOnce();
    const alert = await prisma.systemAlert.findFirstOrThrow({ where: { entity_id: task.id } });
    assert.equal(alert.automatic_resolution_reason, "task_cancelled");
    assert.equal(alert.automatic_resolution_message, "A tarefa foi cancelada.");
  });

  it("5. prazo afastado para fora da janela resolve a ocorrência 'próxima do prazo'", async () => {
    const user = await createUser();
    const { task } = await createTaskFixture({ due_date: soonDate(), assignee_id: user.id });
    await runAlertEngineOnce();
    await prisma.projectTask.update({ where: { id: task.id }, data: { due_date: new Date(Date.now() + 40 * DAY) } });
    await runAlertEngineOnce();
    const alert = await prisma.systemAlert.findFirstOrThrow({ where: { entity_id: task.id, type: STANDARD_KEYS.DUE_SOON } });
    assert.equal(alert.automatic_resolution_reason, "deadline_out_of_window");
    assert.equal(alert.automatic_resolution_message, "O prazo foi alterado para fora da janela de alerta.");
  });

  it("6. prazo corrigido para o futuro resolve a ocorrência 'atrasada'", async () => {
    const user = await createUser();
    const { task } = await createTaskFixture({ due_date: overdueDate(), assignee_id: user.id });
    await runAlertEngineOnce();
    const vermelho = await prisma.systemAlert.findFirstOrThrow({ where: { entity_id: task.id, type: STANDARD_KEYS.OVERDUE } });
    await prisma.projectTask.update({ where: { id: task.id }, data: { due_date: new Date(Date.now() + 40 * DAY) } });
    await runAlertEngineOnce();
    const alert = await prisma.systemAlert.findUniqueOrThrow({ where: { id: vermelho.id } });
    assert.equal(alert.automatic_resolution_reason, "deadline_changed_not_overdue");
    assert.equal(alert.automatic_resolution_message, "O prazo foi alterado e a tarefa não está mais atrasada.");
  });

  it("7/8. transição próxima→atrasada resolve a amarela (superseded_by_overdue) e cria SÓ uma vermelha", async () => {
    const user = await createUser();
    const { task } = await createTaskFixture({ due_date: new Date(Date.now() + 2 * HOUR), assignee_id: user.id });
    await runAlertEngineOnce();
    const amarelo = await prisma.systemAlert.findFirstOrThrow({ where: { entity_id: task.id, type: STANDARD_KEYS.DUE_SOON } });

    await prisma.projectTask.update({ where: { id: task.id }, data: { due_date: overdueDate() } });
    await runAlertEngineOnce();
    await runAlertEngineOnce();

    const amareloAfter = await prisma.systemAlert.findUniqueOrThrow({ where: { id: amarelo.id } });
    assert.equal(amareloAfter.automatic_resolution_reason, "superseded_by_overdue");
    assert.equal(amareloAfter.automatic_resolution_message, "O prazo venceu e a tarefa passou para a condição de atraso.");

    const vermelhos = await prisma.systemAlert.findMany({ where: { entity_id: task.id, type: STANDARD_KEYS.OVERDUE } });
    assert.equal(vermelhos.length, 1);
    assert.equal(vermelhos[0]?.automatic_resolved_at, null, "a vermelha da tarefa realmente atrasada continua ativa");
  });

  it("9/10. tarefa ainda atrasada mantém a MESMA ocorrência e não gera novos eventos a cada ciclo", async () => {
    const user = await createUser();
    const { task } = await createTaskFixture({ due_date: overdueDate(), assignee_id: user.id });
    await runAlertEngineOnce();
    const alerta = await prisma.systemAlert.findFirstOrThrow({ where: { entity_id: task.id, type: STANDARD_KEYS.OVERDUE } });
    const eventosAntes = (await eventsFor(alerta.id)).length;
    await runAlertEngineOnce();
    await runAlertEngineOnce();
    const depois = await prisma.systemAlert.findMany({ where: { entity_id: task.id } });
    assert.equal(depois.length, 1);
    assert.equal(depois[0]?.id, alerta.id, "mesma ocorrência");
    assert.equal(depois[0]?.automatic_resolved_at, null);
    assert.equal((await eventsFor(alerta.id)).length, eventosAntes, "nenhum evento novo enquanto a condição continua");
  });

  it("11. condição encerrada e depois reaparecida cria uma NOVA ocorrência (nunca reaproveita a antiga)", async () => {
    const user = await createUser();
    const { task } = await createTaskFixture({ due_date: overdueDate(), assignee_id: user.id });
    await runAlertEngineOnce();
    const primeira = await prisma.systemAlert.findFirstOrThrow({ where: { entity_id: task.id } });

    await prisma.projectTask.update({ where: { id: task.id }, data: { status: "CONCLUIDA" } });
    await runAlertEngineOnce();
    // condição volta: tarefa reaberta, ainda atrasada
    await prisma.projectTask.update({ where: { id: task.id }, data: { status: "EM_EXECUCAO" } });
    await runAlertEngineOnce();

    const todas = await prisma.systemAlert.findMany({ where: { entity_id: task.id }, orderBy: { created_at: "asc" } });
    assert.equal(todas.length, 2, "episódio novo = ocorrência nova");
    assert.equal(todas[0]?.id, primeira.id);
    assert.ok(todas[0]?.automatic_resolved_at, "a primeira segue resolvida");
    assert.equal(todas[1]?.automatic_resolved_at, null, "a segunda está ativa");
    assert.notEqual(todas[1]?.id, primeira.id);
  });

  // ── Resolução manual bloqueada (ata 2026-08, controle por condição) ────

  it("12. alerta automático de tarefa NÃO pode ser resolvido manualmente (409) e continua em Ativos", async () => {
    const user = await createUser();
    const { task } = await createTaskFixture({ due_date: overdueDate(), assignee_id: user.id });
    await runAlertEngineOnce();
    const alerta = await prisma.systemAlert.findFirstOrThrow({ where: { entity_id: task.id } });

    const resolve = await api(`/api/system-alerts/${alerta.id}/resolve`, {
      method: "POST",
      token: tokenFor(user),
      body: { action: "correcao_aplicada", description: "Tentativa de resolução manual.", client_action_id: `cli-${crypto.randomBytes(6).toString("hex")}` },
    });
    assert.equal(resolve.status, 409);
    assert.equal(resolve.json.condition_controlled, true);
    // Vermelho ativo → mensagem de "acompanhamento obrigatório" (ata 2026-08,
    // lote "não esconder crítico ativo").
    assert.match(resolve.json.error, /continuará ativo até que a situação real da tarefa seja regularizada/i);

    await runAlertEngineOnce();
    await runAlertEngineOnce();

    const todas = await prisma.systemAlert.findMany({ where: { entity_id: task.id } });
    assert.equal(todas.length, 1);
    const only = todas[0]!;
    assert.equal(only.manual_resolved_at, null, "nenhum campo manual gravado");
    assert.equal(only.resolution_action, null);
    assert.equal(only.automatic_resolved_at, null, "condição ainda ativa — segue em Ativos");
    assert.equal(only.condition_cleared_at, null);
    assert.ok(only.dedupe_key);
    assert.equal(await prisma.systemAlertEvent.count({ where: { alert_id: alerta.id, event_type: "resolved" } }), 0);
  });

  it("13. depois do 409, concluir a tarefa encerra o alerta pela via automática normal (auto_resolved)", async () => {
    const user = await createUser();
    const { task } = await createTaskFixture({ due_date: overdueDate(), assignee_id: user.id });
    await runAlertEngineOnce();
    const alerta = await prisma.systemAlert.findFirstOrThrow({ where: { entity_id: task.id } });
    await api(`/api/system-alerts/${alerta.id}/resolve`, {
      method: "POST",
      token: tokenFor(user),
      body: { action: "correcao_aplicada", description: "Tentativa que deve ser recusada.", client_action_id: `cli-${crypto.randomBytes(6).toString("hex")}` },
    });

    await prisma.projectTask.update({ where: { id: task.id }, data: { status: "CONCLUIDA" } });
    await runAlertEngineOnce();
    const encerrado = await prisma.systemAlert.findUniqueOrThrow({ where: { id: alerta.id } });
    assert.ok(encerrado.automatic_resolved_at, "resolvido pela condição real");
    assert.equal(encerrado.automatic_resolution_reason, "task_completed");
    assert.equal(encerrado.manual_resolved_at, null, "nunca houve resolução manual");
    assert.equal((await eventsFor(alerta.id, "auto_resolved")).length, 1);
    assert.equal(encerrado.is_archived, false);
  });

  // ── Concorrência / idempotência ───────────────────────────────────────

  it("14. dois ciclos concorrentes não duplicam a ocorrência nem o evento de resolução automática", async () => {
    const user = await createUser();
    const { task } = await createTaskFixture({ due_date: overdueDate(), assignee_id: user.id });
    await runAlertEngineOnce();
    const alerta = await prisma.systemAlert.findFirstOrThrow({ where: { entity_id: task.id } });
    await prisma.projectTask.update({ where: { id: task.id }, data: { status: "CONCLUIDA" } });

    await Promise.all([runAlertEngineOnce(), runAlertEngineOnce()]);

    const todas = await prisma.systemAlert.findMany({ where: { entity_id: task.id } });
    assert.equal(todas.length, 1);
    const autoEvents = await eventsFor(alerta.id, "auto_resolved");
    assert.equal(autoEvents.length, 1, "CAS transacional garante um único evento");
  });

  // ── Separação automática × manual × expiração ─────────────────────────

  it("17. expiração de ocorrência NÃO aparece como resolução automática", async () => {
    const user = await createUser();
    const avulso = await prisma.systemAlert.create({
      data: {
        type: "alerta_admin_manual",
        title: "[teste] avulso que expira",
        message: "expira em breve",
        severity: "warning",
        category: "alerta",
        user_id: user.id,
        expires_at: new Date(Date.now() - 1 * HOUR),
      },
    });
    createdAvulsoIds.push(avulso.id);
    await runAlertEngineOnce();
    const reloaded = await prisma.systemAlert.findUniqueOrThrow({ where: { id: avulso.id } });
    assert.ok(reloaded.resolved_at, "expiração usa o campo legado do motor");
    assert.equal(reloaded.resolution_reason, "expired");
    assert.equal(reloaded.automatic_resolved_at, null, "expiração nunca é resolução automática");

    const detail = await api(`/api/system-alerts/${avulso.id}`, { token: tokenFor(user) });
    assert.notEqual(detail.json.situacao, "resolvido_automaticamente");
    assert.equal(detail.json.automatic_resolution, null);
  });

  it("18/19. alerta avulso e alerta programado não são tocados pela resolução automática de tarefa", async () => {
    const user = await createUser();
    const avulso = await prisma.systemAlert.create({
      data: {
        type: "alerta_admin_manual", title: "[teste] avulso intacto", message: "sem prazo", severity: "warning",
        category: "alerta", user_id: user.id, entity_type: "project_task", entity_id: `tarefa-inexistente-${suffix}`,
      },
    });
    createdAvulsoIds.push(avulso.id);
    const programado = await prisma.systemAlert.create({
      data: {
        type: "alerta_programado", title: "[teste] programado intacto", message: "disparo programado", severity: "info",
        category: "alerta", user_id: user.id, schedule_id: null, entity_type: "alert_schedule", entity_id: `sched-${suffix}`,
      },
    });
    createdAvulsoIds.push(programado.id);
    await runAlertEngineOnce();
    for (const id of [avulso.id, programado.id]) {
      const r = await prisma.systemAlert.findUniqueOrThrow({ where: { id } });
      assert.equal(r.automatic_resolved_at, null);
      assert.equal(r.condition_cleared_at, null);
      assert.equal(r.resolved_at, null);
    }
  });

  it("20. alerta de ETAPA continua no caminho legado (resolved_at/resolution_reason), fora do escopo deste bloco", async () => {
    const { nomadeId } = await createNomade();
    const { stage } = await createStageFixture({ prazo_execucao: overdueDate(), nomade_id: nomadeId });
    await runAlertEngineOnce();
    const stageAlert = await prisma.systemAlert.findFirst({ where: { entity_id: stage.id, entity_type: "project_task_stage", type: STANDARD_KEYS.STAGE_OVERDUE } });
    assert.ok(stageAlert, "ocorrência de etapa criada");
    await prisma.projectTaskStage.update({ where: { id: stage.id }, data: { status: "CONCLUIDA" } });
    await runAlertEngineOnce();
    const reloaded = await prisma.systemAlert.findUniqueOrThrow({ where: { id: stageAlert!.id } });
    assert.ok(reloaded.resolved_at, "etapa ainda usa o campo legado");
    assert.equal(reloaded.resolution_reason, "task_completed");
    assert.equal(reloaded.automatic_resolved_at, null, "os campos novos são exclusivos de tarefa neste bloco");
  });

  // ── Isolamento e segurança ───────────────────────────────────────────

  it("21. troca de responsável encerra só a ocorrência de quem saiu; o novo responsável recebe a sua", async () => {
    const antigo = await createUser();
    const novo = await createUser();
    const { task } = await createTaskFixture({ due_date: overdueDate(), assignee_id: antigo.id });
    await runAlertEngineOnce();
    const doAntigo = await prisma.systemAlert.findFirstOrThrow({ where: { entity_id: task.id, user_id: antigo.id } });

    await prisma.projectTask.update({ where: { id: task.id }, data: { assignee_id: novo.id } });
    await runAlertEngineOnce();

    const antigoReloaded = await prisma.systemAlert.findUniqueOrThrow({ where: { id: doAntigo.id } });
    assert.equal(antigoReloaded.automatic_resolution_reason, "recipient_changed");
    const doNovo = await prisma.systemAlert.findFirst({ where: { entity_id: task.id, user_id: novo.id, automatic_resolved_at: null } });
    assert.ok(doNovo, "novo responsável tem a própria ocorrência ativa");
    assert.notEqual(doNovo!.id, doAntigo.id);
  });

  it("22. nenhuma rota pública força resolução de um alerta automático de tarefa (rota inventada 404; POST /:id/resolve 409, nada gravado)", async () => {
    const user = await createUser();
    const { task } = await createTaskFixture({ due_date: overdueDate(), assignee_id: user.id });
    await runAlertEngineOnce();
    const alerta = await prisma.systemAlert.findFirstOrThrow({ where: { entity_id: task.id } });

    // Rota inventada: não existe.
    const forged = await api(`/api/system-alerts/${alerta.id}/auto-resolve`, { method: "POST", token: tokenFor(user), body: { reason: "task_completed" } });
    assert.equal(forged.status, 404);

    // Resolução manual recusada — nem campos manuais nem campos do motor.
    const resolve = await api(`/api/system-alerts/${alerta.id}/resolve`, {
      method: "POST",
      token: tokenFor(user),
      body: {
        action: "correcao_aplicada",
        description: "Resolução manual — sem forjar automação.",
        client_action_id: `cli-${crypto.randomBytes(6).toString("hex")}`,
        automatic_resolved_at: new Date().toISOString(),
        automatic_resolution_reason: "task_completed",
      },
    });
    assert.equal(resolve.status, 409);
    const reloaded = await prisma.systemAlert.findUniqueOrThrow({ where: { id: alerta.id } });
    assert.equal(reloaded.manual_resolved_at, null);
    assert.equal(reloaded.automatic_resolved_at, null, "campos do motor nunca aceitos via payload");
    assert.equal(reloaded.automatic_resolution_reason, null);
  });

  // ── Interface: aba Resolvidos + detalhe ──────────────────────────────

  it("15/16. GET /:id de um alerta resolvido automaticamente traz situação, motivo e autor 'Motor da Allka'", async () => {
    const user = await createUser();
    const { task } = await createTaskFixture({ due_date: overdueDate(), assignee_id: user.id });
    await runAlertEngineOnce();
    const alerta = await prisma.systemAlert.findFirstOrThrow({ where: { entity_id: task.id } });
    await prisma.projectTask.update({ where: { id: task.id }, data: { status: "CONCLUIDA" } });
    await runAlertEngineOnce();

    const detail = await api(`/api/system-alerts/${alerta.id}`, { token: tokenFor(user) });
    assert.equal(detail.status, 200);
    assert.equal(detail.json.situacao, "resolvido_automaticamente");
    assert.equal(detail.json.resolution, null, "não é resolução manual");
    assert.ok(detail.json.automatic_resolution);
    assert.equal(detail.json.automatic_resolution.reason, "task_completed");
    assert.equal(detail.json.automatic_resolution.message, "A tarefa foi concluída.");
    assert.equal(detail.json.automatic_resolution.resolved_by_label, "Motor da Allka");
    assert.ok(detail.json.events.some((e: any) => e.event_type === "auto_resolved"));

    const list = await api("/api/system-alerts?category=alerta&resolved=true&is_archived=all", { token: tokenFor(user) });
    assert.ok(list.json.data.some((a: any) => a.id === alerta.id), "aparece na aba Resolvidos");
    const notInAtivos = await api("/api/system-alerts?category=alerta&resolved=false&is_archived=false", { token: tokenFor(user) });
    assert.ok(!notInAtivos.json.data.some((a: any) => a.id === alerta.id), "não aparece mais em Ativos");
    // Reparo semântico: NÃO aparece em Arquivados até alguém arquivar.
    const arquivados = await api("/api/system-alerts?category=alerta&resolved=false&is_archived=true", { token: tokenFor(user) });
    assert.ok(!arquivados.json.data.some((a: any) => a.id === alerta.id), "não aparece em Arquivados");
  });
});
