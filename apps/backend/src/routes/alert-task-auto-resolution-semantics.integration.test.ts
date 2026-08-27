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

// Reparo semântico da resolução automática de tarefa (ata 2026-08):
//   1. resolver automaticamente NÃO arquiva;
//   2. mudar o prazo mantendo a mesma condição NÃO cria episódio novo nem
//      resolve/recria a ocorrência;
//   3. `dedupe_key` de tarefa não depende do dia do prazo (compat com a
//      chave antiga);
//   4. desativar uma regra NÃO marca o alerta como resolvido.

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

async function createUser(overrides: Partial<{ role: string; account_type: string; admin_profile_id: string | null }> = {}) {
  const id = `alert-sem-${crypto.randomBytes(6).toString("hex")}`;
  const user = await prisma.user.create({
    data: {
      id,
      email: `${id}@example.test`,
      password_hash: "unused-test-hash",
      name: `Semantics Test ${id}`,
      role: overrides.role ?? "company_user",
      account_type: overrides.account_type ?? "empresas",
      is_active: true,
      status: "ativo",
      admin_profile_id: overrides.admin_profile_id ?? null,
    },
  });
  createdUserIds.push(user.id);
  return user;
}

async function masterAdmin() {
  const profile = await prisma.adminProfile.create({
    data: { name: `perfil-sem-${suffix}-${crypto.randomBytes(4).toString("hex")}`, is_master: true, is_active: true },
  });
  createdProfileIds.push(profile.id);
  return createUser({ role: "admin", account_type: "admin", admin_profile_id: profile.id });
}

async function createNomade(): Promise<{ nomadeId: string }> {
  const user = await createUser();
  const id = `nomade-${crypto.randomBytes(6).toString("hex")}`;
  const nomade = await prisma.nomade.create({ data: { id, name: `Nômade ${id}`, email: `${id}@example.test`, user_id: user.id } });
  createdNomadeIds.push(nomade.id);
  return { nomadeId: nomade.id };
}

async function createTaskFixture(overrides: { due_date: Date | null; assignee_id?: string | null }) {
  const code = `${suffix}-${crypto.randomBytes(4).toString("hex")}`;
  const project = await prisma.project.create({ data: { title: `Projeto sem ${code}`, project_code: code, status: "in-progress" } });
  createdProjectIds.push(project.id);
  const product = await prisma.product.create({ data: { name: `Produto sem ${code}`, category: "teste" } });
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
      title: `Tarefa sem ${code}`,
      status: "EM_EXECUCAO",
      due_date: overrides.due_date,
      assignee_id: overrides.assignee_id ?? null,
    },
  });
  createdTaskIds.push(task.id);
  return { task };
}

async function createStageFixture(overrides: { prazo_execucao: Date; nomade_id: string }) {
  const { task } = await createTaskFixture({ due_date: null });
  const stage = await prisma.projectTaskStage.create({
    data: {
      project_task_id: task.id,
      titulo: `Etapa sem ${crypto.randomBytes(4).toString("hex")}`,
      status: "EM_ANDAMENTO",
      prazo_execucao: overrides.prazo_execucao,
      nomade_id: overrides.nomade_id,
    },
  });
  createdStageIds.push(stage.id);
  return { stage };
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

async function eventsFor(alertId: string, type?: string) {
  return prisma.systemAlertEvent.findMany({ where: { alert_id: alertId, ...(type ? { event_type: type } : {}) }, orderBy: { created_at: "asc" } });
}

async function setTaskRulesActive(active: boolean) {
  await prisma.alertRule.updateMany({
    where: { trigger_type: { in: [STANDARD_KEYS.DUE_SOON, STANDARD_KEYS.OVERDUE] } },
    data: { is_active: active },
  });
}

describe("Motor — reparo semântico da resolução automática de tarefa (ata 2026-08)", () => {
  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    const listener = app.listen(0);
    server = listener;
    await new Promise<void>((resolve) => listener.once("listening", () => resolve()));
    baseUrl = `http://127.0.0.1:${(listener.address() as AddressInfo).port}`;
    await ensureDefaultAlertStandardsAndRules();
  });

  after(async () => {
    await setTaskRulesActive(true);
    await prisma.productFeedbackAccessAudit.deleteMany({ where: { action: { startsWith: "alert_" } } });
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

  // ── 1. resolver ≠ arquivar ───────────────────────────────────────────

  it("1/2/3. resolução automática não seta is_archived; aparece em Resolvidos, não em Arquivados", async () => {
    const user = await createUser();
    const { task } = await createTaskFixture({ due_date: new Date(Date.now() - 2 * HOUR), assignee_id: user.id });
    await runAlertEngineOnce();
    const alerta = await prisma.systemAlert.findFirstOrThrow({ where: { entity_id: task.id } });
    await prisma.projectTask.update({ where: { id: task.id }, data: { status: "CONCLUIDA" } });
    await runAlertEngineOnce();

    const reloaded = await prisma.systemAlert.findUniqueOrThrow({ where: { id: alerta.id } });
    assert.ok(reloaded.automatic_resolved_at);
    assert.equal(reloaded.is_archived, false, "resolver não arquiva");
    assert.equal(reloaded.archived_at, null);

    const resolvidos = await api("/api/system-alerts?category=alerta&resolved=true&is_archived=all", { token: tokenFor(user) });
    assert.ok(resolvidos.json.data.some((a: any) => a.id === alerta.id), "está em Resolvidos");
    const arquivados = await api("/api/system-alerts?category=alerta&resolved=false&is_archived=true", { token: tokenFor(user) });
    assert.ok(!arquivados.json.data.some((a: any) => a.id === alerta.id), "não está em Arquivados");
    const ativos = await api("/api/system-alerts?category=alerta&resolved=false&is_archived=false", { token: tokenFor(user) });
    assert.ok(!ativos.json.data.some((a: any) => a.id === alerta.id), "não está em Ativos");
  });

  it("4. arquivamento explícito posterior continua funcionando (evento 'archived' distinto de 'auto_resolved')", async () => {
    const user = await createUser();
    const { task } = await createTaskFixture({ due_date: new Date(Date.now() - 2 * HOUR), assignee_id: user.id });
    await runAlertEngineOnce();
    const alerta = await prisma.systemAlert.findFirstOrThrow({ where: { entity_id: task.id } });
    await prisma.projectTask.update({ where: { id: task.id }, data: { status: "CONCLUIDA" } });
    await runAlertEngineOnce();

    const res = await api(`/api/system-alerts/${alerta.id}/archive`, { method: "PATCH", token: tokenFor(user) });
    assert.equal(res.status, 200);
    const reloaded = await prisma.systemAlert.findUniqueOrThrow({ where: { id: alerta.id } });
    assert.equal(reloaded.is_archived, true, "arquivado por ação explícita");
    assert.ok(reloaded.automatic_resolved_at, "continua resolvido automaticamente");
    const types = (await eventsFor(alerta.id)).map((e) => e.event_type);
    assert.ok(types.includes("auto_resolved"));
    assert.ok(types.includes("archived"));
  });

  it("resolução MANUAL de um alerta AVULSO vermelho também não arquiva automaticamente", async () => {
    const user = await createUser();
    // Avulso (sem standard_id/rule_id) — este SIM passa por resolução manual.
    const avulso = await prisma.systemAlert.create({
      data: {
        type: "alerta_admin_manual", title: "[teste] avulso vermelho", message: "requer resolução manual",
        severity: "error", category: "alerta", user_id: user.id,
      },
    });
    const r = await api(`/api/system-alerts/${avulso.id}/resolve`, {
      method: "POST",
      token: tokenFor(user),
      body: { action: "correcao_aplicada", description: "Resolvido manualmente no teste.", client_action_id: `cli-${crypto.randomBytes(6).toString("hex")}` },
    });
    assert.equal(r.status, 201);
    const reloaded = await prisma.systemAlert.findUniqueOrThrow({ where: { id: avulso.id } });
    assert.ok(reloaded.manual_resolved_at);
    assert.equal(reloaded.is_archived, false);
    await prisma.systemAlertEvent.deleteMany({ where: { alert_id: avulso.id } });
    await prisma.systemAlert.delete({ where: { id: avulso.id } });
  });

  // ── 2. prazo alterado, condição continua ─────────────────────────────

  it("5/6/7. atrasada + prazo alterado para OUTRO prazo vencido → mesma ocorrência, mesmo ID, sem evento de resolução", async () => {
    const user = await createUser();
    const { task } = await createTaskFixture({ due_date: new Date(Date.now() - 5 * DAY), assignee_id: user.id });
    await runAlertEngineOnce();
    const antes = await prisma.systemAlert.findFirstOrThrow({ where: { entity_id: task.id, type: STANDARD_KEYS.OVERDUE } });
    const eventosAntes = (await eventsFor(antes.id)).length;

    // prazo muda de dia, mas continua vencido
    await prisma.projectTask.update({ where: { id: task.id }, data: { due_date: new Date(Date.now() - 1 * DAY) } });
    await runAlertEngineOnce();
    await runAlertEngineOnce();

    const todas = await prisma.systemAlert.findMany({ where: { entity_id: task.id } });
    assert.equal(todas.length, 1, "não recriou");
    assert.equal(todas[0]?.id, antes.id, "mesmo ID");
    assert.equal(todas[0]?.automatic_resolved_at, null, "não resolveu");
    assert.equal(todas[0]?.condition_cleared_at, null, "episódio não encerrado");
    assert.ok(todas[0]?.dedupe_key, "chave não foi zerada");
    assert.equal(todas[0]?.created_at.getTime(), antes.created_at.getTime(), "data de criação preservada");
    assert.equal((await eventsFor(antes.id)).length, eventosAntes, "nenhum evento novo (nem de resolução)");
  });

  it("8. próxima do prazo + prazo alterado ainda dentro da janela → mesma ocorrência", async () => {
    const user = await createUser();
    const { task } = await createTaskFixture({ due_date: new Date(Date.now() + 2 * HOUR), assignee_id: user.id });
    await runAlertEngineOnce();
    const antes = await prisma.systemAlert.findFirstOrThrow({ where: { entity_id: task.id, type: STANDARD_KEYS.DUE_SOON } });

    await prisma.projectTask.update({ where: { id: task.id }, data: { due_date: new Date(Date.now() + 10 * HOUR) } });
    await runAlertEngineOnce();
    await runAlertEngineOnce();

    const todas = await prisma.systemAlert.findMany({ where: { entity_id: task.id } });
    assert.equal(todas.length, 1);
    assert.equal(todas[0]?.id, antes.id);
    assert.equal(todas[0]?.automatic_resolved_at, null);
    assert.equal(todas[0]?.condition_cleared_at, null);
  });

  it("9. transição próxima → atrasada continua correta (amarela resolvida, uma vermelha)", async () => {
    const user = await createUser();
    const { task } = await createTaskFixture({ due_date: new Date(Date.now() + 2 * HOUR), assignee_id: user.id });
    await runAlertEngineOnce();
    const amarelo = await prisma.systemAlert.findFirstOrThrow({ where: { entity_id: task.id, type: STANDARD_KEYS.DUE_SOON } });
    await prisma.projectTask.update({ where: { id: task.id }, data: { due_date: new Date(Date.now() - 2 * HOUR) } });
    await runAlertEngineOnce();
    await runAlertEngineOnce();

    const amareloAfter = await prisma.systemAlert.findUniqueOrThrow({ where: { id: amarelo.id } });
    assert.equal(amareloAfter.automatic_resolution_reason, "superseded_by_overdue");
    const vermelhos = await prisma.systemAlert.findMany({ where: { entity_id: task.id, type: STANDARD_KEYS.OVERDUE } });
    assert.equal(vermelhos.length, 1);
    assert.equal(vermelhos[0]?.automatic_resolved_at, null);
  });

  it("10. prazo corrigido para o futuro resolve o alerta atrasado", async () => {
    const user = await createUser();
    const { task } = await createTaskFixture({ due_date: new Date(Date.now() - 3 * DAY), assignee_id: user.id });
    await runAlertEngineOnce();
    const vermelho = await prisma.systemAlert.findFirstOrThrow({ where: { entity_id: task.id, type: STANDARD_KEYS.OVERDUE } });
    await prisma.projectTask.update({ where: { id: task.id }, data: { due_date: new Date(Date.now() + 40 * DAY) } });
    await runAlertEngineOnce();
    const reloaded = await prisma.systemAlert.findUniqueOrThrow({ where: { id: vermelho.id } });
    assert.equal(reloaded.automatic_resolution_reason, "deadline_changed_not_overdue");
  });

  // ── 3. chave do episódio ─────────────────────────────────────────────

  it("11. dedupe_key de ocorrência de tarefa NÃO inclui o dia do prazo", async () => {
    const user = await createUser();
    const { task } = await createTaskFixture({ due_date: new Date(Date.now() - 2 * HOUR), assignee_id: user.id });
    await runAlertEngineOnce();
    const alerta = await prisma.systemAlert.findFirstOrThrow({ where: { entity_id: task.id } });
    const rule = await prisma.alertRule.findFirstOrThrow({ where: { trigger_type: STANDARD_KEYS.OVERDUE } });
    assert.equal(alerta.dedupe_key, `${rule.id}:project_task:${task.id}:${user.id}`);
    assert.ok(!/\d{4}-\d{2}-\d{2}/.test(alerta.dedupe_key ?? ""), "sem data na chave");
  });

  it("12. ocorrência gravada com a CHAVE ANTIGA (com dia) não duplica — o motor normaliza a chave", async () => {
    const user = await createUser();
    const dueDate = new Date(Date.now() - 4 * DAY);
    const { task } = await createTaskFixture({ due_date: dueDate, assignee_id: user.id });
    const rule = await prisma.alertRule.findFirstOrThrow({ where: { trigger_type: STANDARD_KEYS.OVERDUE }, include: { standard: true } });
    const legacyKey = `${rule.id}:project_task:${task.id}:${user.id}:${dueDate.toISOString().slice(0, 10)}`;
    const legacy = await prisma.systemAlert.create({
      data: {
        type: rule.standard.key, title: "legado", message: "ocorrência com chave antiga", severity: "error",
        category: "alerta", entity_type: "project_task", entity_id: task.id, user_id: user.id,
        standard_id: rule.standard_id, rule_id: rule.id, dedupe_key: legacyKey,
      },
    });

    await runAlertEngineOnce();
    await runAlertEngineOnce();

    const todas = await prisma.systemAlert.findMany({ where: { entity_id: task.id } });
    assert.equal(todas.length, 1, "não criou uma segunda ocorrência ativa");
    assert.equal(todas[0]?.id, legacy.id);
    assert.equal(todas[0]?.dedupe_key, `${rule.id}:project_task:${task.id}:${user.id}`, "chave normalizada, sem data");
    assert.equal(todas[0]?.automatic_resolved_at, null, "não resolveu — a tarefa continua atrasada");
  });

  // ── 4. regra desativada ≠ resolvido ──────────────────────────────────

  it("13/14. desativar a regra NÃO marca o alerta como resolvido e NÃO cria novas ocorrências", async () => {
    const user = await createUser();
    const { task } = await createTaskFixture({ due_date: new Date(Date.now() - 2 * HOUR), assignee_id: user.id });
    await runAlertEngineOnce();
    const alerta = await prisma.systemAlert.findFirstOrThrow({ where: { entity_id: task.id } });

    try {
      await setTaskRulesActive(false);
      await runAlertEngineOnce();
      await runAlertEngineOnce();

      const reloaded = await prisma.systemAlert.findUniqueOrThrow({ where: { id: alerta.id } });
      assert.equal(reloaded.automatic_resolved_at, null, "regra desativada não afirma resolução");
      assert.equal(reloaded.condition_cleared_at, null, "episódio não encerrado");
      assert.equal(reloaded.automatic_resolution_reason, null);
      assert.equal((await eventsFor(alerta.id, "auto_resolved")).length, 0);

      // Nova tarefa atrasada enquanto a regra está desativada → nenhuma ocorrência.
      const { task: nova } = await createTaskFixture({ due_date: new Date(Date.now() - 2 * HOUR), assignee_id: user.id });
      await runAlertEngineOnce();
      assert.equal(await prisma.systemAlert.count({ where: { entity_id: nova.id } }), 0, "regra desativada não cria ocorrência");
    } finally {
      await setTaskRulesActive(true);
    }
  });

  // ── 5. preservações ──────────────────────────────────────────────────

  it("15. concorrência continua protegida (dois ciclos simultâneos → 1 ocorrência, 1 evento)", async () => {
    const user = await createUser();
    const { task } = await createTaskFixture({ due_date: new Date(Date.now() - 2 * HOUR), assignee_id: user.id });
    await runAlertEngineOnce();
    const alerta = await prisma.systemAlert.findFirstOrThrow({ where: { entity_id: task.id } });
    await prisma.projectTask.update({ where: { id: task.id }, data: { status: "CONCLUIDA" } });
    await Promise.all([runAlertEngineOnce(), runAlertEngineOnce()]);
    assert.equal(await prisma.systemAlert.count({ where: { entity_id: task.id } }), 1);
    assert.equal((await eventsFor(alerta.id, "auto_resolved")).length, 1);
  });

  it("16. tentativa de resolução manual (recusada com 409) não recria nem altera a ocorrência a cada ciclo", async () => {
    const user = await createUser();
    const { task } = await createTaskFixture({ due_date: new Date(Date.now() - 2 * HOUR), assignee_id: user.id });
    await runAlertEngineOnce();
    const alerta = await prisma.systemAlert.findFirstOrThrow({ where: { entity_id: task.id } });
    const r = await api(`/api/system-alerts/${alerta.id}/resolve`, {
      method: "POST", token: tokenFor(user),
      body: { action: "correcao_aplicada", description: "Tentativa recusada, condição segue.", client_action_id: `cli-${crypto.randomBytes(6).toString("hex")}` },
    });
    assert.equal(r.status, 409);
    await runAlertEngineOnce();
    await runAlertEngineOnce();
    const todas = await prisma.systemAlert.findMany({ where: { entity_id: task.id } });
    assert.equal(todas.length, 1);
    assert.equal(todas[0]?.manual_resolved_at, null);
    assert.equal(todas[0]?.automatic_resolved_at, null);
    assert.ok(todas[0]?.dedupe_key, "chave mantida");
  });

  it("17. alertas de ETAPA continuam intocados (caminho legado arquiva ao resolver)", async () => {
    const { nomadeId } = await createNomade();
    const { stage } = await createStageFixture({ prazo_execucao: new Date(Date.now() - 2 * HOUR), nomade_id: nomadeId });
    await runAlertEngineOnce();
    const stageAlert = await prisma.systemAlert.findFirstOrThrow({ where: { entity_id: stage.id, entity_type: "project_task_stage", type: STANDARD_KEYS.STAGE_OVERDUE } });
    // chave de etapa ainda inclui o dia do prazo (legado, bloco 2)
    assert.match(stageAlert.dedupe_key ?? "", /\d{4}-\d{2}-\d{2}$/);
    await prisma.projectTaskStage.update({ where: { id: stage.id }, data: { status: "CONCLUIDA" } });
    await runAlertEngineOnce();
    const reloaded = await prisma.systemAlert.findUniqueOrThrow({ where: { id: stageAlert.id } });
    assert.ok(reloaded.resolved_at, "etapa usa o campo legado");
    assert.equal(reloaded.resolution_reason, "task_completed");
    assert.equal(reloaded.is_archived, true, "caminho legado de etapa ainda arquiva ao resolver");
    assert.equal(reloaded.automatic_resolved_at, null);
  });
});
