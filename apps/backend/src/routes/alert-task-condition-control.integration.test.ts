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

// Alerta automático de tarefa = controlado pela CONDIÇÃO REAL (ata 2026-08):
// não pode ser resolvido por comentário, por abrir a tarefa, por marcar como
// lido, nem por "Resolver alerta" (nem pelo Admin Master). Só uma mudança
// real e verificável na tarefa encerra a ocorrência. O formulário de
// resolução humana continua valendo para alertas avulsos/críticos.

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

async function createUser(overrides: Partial<{ role: string; account_type: string; admin_profile_id: string | null }> = {}) {
  const id = `alert-cc-${crypto.randomBytes(6).toString("hex")}`;
  const user = await prisma.user.create({
    data: {
      id,
      email: `${id}@example.test`,
      password_hash: "unused-test-hash",
      name: `Condition Control Test ${id}`,
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
    data: { name: `perfil-cc-${suffix}-${crypto.randomBytes(4).toString("hex")}`, is_master: true, is_active: true },
  });
  createdProfileIds.push(profile.id);
  return createUser({ role: "admin", account_type: "admin", admin_profile_id: profile.id });
}

async function createTaskFixture(overrides: {
  due_date: Date | null;
  assignee_id?: string | null;
  stages?: { obrigatoria: boolean; status: string }[];
  legacy_model?: boolean;
}) {
  const code = `${suffix}-${crypto.randomBytes(4).toString("hex")}`;
  const project = await prisma.project.create({ data: { title: `Projeto cc ${code}`, project_code: code, status: "in-progress" } });
  createdProjectIds.push(project.id);
  const product = await prisma.product.create({ data: { name: `Produto cc ${code}`, category: "teste" } });
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
      title: `Tarefa cc ${code}`,
      status: "EM_EXECUCAO",
      due_date: overrides.due_date,
      assignee_id: overrides.assignee_id ?? null,
      legacy_model: overrides.legacy_model ?? false,
    },
  });
  createdTaskIds.push(task.id);
  for (const [i, s] of (overrides.stages ?? []).entries()) {
    const stage = await prisma.projectTaskStage.create({
      data: { project_task_id: task.id, titulo: `Etapa ${i + 1}`, ordem: i, obrigatoria: s.obrigatoria, status: s.status },
    });
    createdStageIds.push(stage.id);
  }
  return { task };
}

const overdueDate = () => new Date(Date.now() - 2 * 60 * 60 * 1000);
const soonDate = () => new Date(Date.now() + 3 * 60 * 60 * 1000);

async function resolveBody() {
  return { action: "correcao_aplicada", description: "Tentativa de resolução manual no teste.", client_action_id: `cli-${crypto.randomBytes(6).toString("hex")}` };
}

describe("Alerta automático de tarefa — controle por condição (ata 2026-08)", () => {
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
    await prisma.productFeedbackAccessAudit.deleteMany({ where: { action: { startsWith: "alert_" } } });
    await prisma.systemAlert.deleteMany({ where: { entity_id: { in: [...createdTaskIds, ...createdStageIds] } } });
    await prisma.systemAlert.deleteMany({ where: { user_id: { in: createdUserIds } } });
    await prisma.projectTaskStage.deleteMany({ where: { id: { in: createdStageIds } } });
    await prisma.projectTask.deleteMany({ where: { id: { in: createdTaskIds } } });
    await prisma.projectProduct.deleteMany({ where: { project_id: { in: createdProjectIds } } });
    await prisma.project.deleteMany({ where: { id: { in: createdProjectIds } } });
    await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.adminProfile.deleteMany({ where: { id: { in: createdProfileIds } } });
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    await prisma.$disconnect();
  });

  // ── Identificação + UI ───────────────────────────────────────────────

  it("1/2. GET / e GET /:id marcam automático atrasado e próximo do prazo como condition_controlled", async () => {
    const u1 = await createUser();
    const u2 = await createUser();
    await createTaskFixture({ due_date: overdueDate(), assignee_id: u1.id });
    await createTaskFixture({ due_date: soonDate(), assignee_id: u2.id });
    await runAlertEngineOnce();

    for (const [u, tipo] of [[u1, STANDARD_KEYS.OVERDUE], [u2, STANDARD_KEYS.DUE_SOON]] as const) {
      const list = await api("/api/system-alerts?category=alerta&is_archived=all&limit=100", { token: tokenFor(u) });
      const row = list.json.data.find((a: any) => a.type === tipo);
      assert.ok(row, `ocorrência ${tipo} listada`);
      assert.equal(row.condition_controlled, true);
      const detail = await api(`/api/system-alerts/${row.id}`, { token: tokenFor(u) });
      assert.equal(detail.json.condition_controlled, true);
      assert.equal(detail.json.type, tipo);
    }
  });

  it("3/17. alerta AVULSO vermelho continua resolvível manualmente (não é condition_controlled)", async () => {
    const user = await createUser();
    const avulso = await prisma.systemAlert.create({
      data: { type: "alerta_admin_manual", title: "[teste] avulso", message: "manual", severity: "error", category: "alerta", user_id: user.id },
    });
    const list = await api("/api/system-alerts?category=alerta&is_archived=all&limit=100", { token: tokenFor(user) });
    assert.equal(list.json.data.find((a: any) => a.id === avulso.id)?.condition_controlled, false);
    const r = await api(`/api/system-alerts/${avulso.id}/resolve`, { method: "POST", token: tokenFor(user), body: await resolveBody() });
    assert.equal(r.status, 201);
    const reloaded = await prisma.systemAlert.findUniqueOrThrow({ where: { id: avulso.id } });
    assert.ok(reloaded.manual_resolved_at);
    await prisma.systemAlertEvent.deleteMany({ where: { alert_id: avulso.id } });
    await prisma.systemAlert.delete({ where: { id: avulso.id } });
  });

  // ── Bloqueio da resolução manual ─────────────────────────────────────

  it("4/6. POST /:id/resolve num automático de tarefa → 409, sem gravar campo/evento manual", async () => {
    const user = await createUser();
    const { task } = await createTaskFixture({ due_date: overdueDate(), assignee_id: user.id });
    await runAlertEngineOnce();
    const alerta = await prisma.systemAlert.findFirstOrThrow({ where: { entity_id: task.id } });

    const r = await api(`/api/system-alerts/${alerta.id}/resolve`, { method: "POST", token: tokenFor(user), body: await resolveBody() });
    assert.equal(r.status, 409);
    assert.equal(r.json.condition_controlled, true);
    assert.ok(r.json.detail, "mensagem complementar de orientação");

    const reloaded = await prisma.systemAlert.findUniqueOrThrow({ where: { id: alerta.id } });
    assert.equal(reloaded.manual_resolved_at, null);
    assert.equal(reloaded.resolved_by_user_id, null);
    assert.equal(reloaded.resolution_action, null);
    assert.equal(reloaded.condition_cleared_at, null);
    assert.equal(reloaded.is_archived, false);
    assert.equal(await prisma.systemAlertEvent.count({ where: { alert_id: alerta.id, event_type: "resolved" } }), 0);
  });

  it("5. Admin Master também é bloqueado (409) — mesmo endereçado a outra pessoa", async () => {
    const master = await masterAdmin();
    const outra = await createUser();
    const { task } = await createTaskFixture({ due_date: overdueDate(), assignee_id: outra.id });
    await runAlertEngineOnce();
    const alerta = await prisma.systemAlert.findFirstOrThrow({ where: { entity_id: task.id } });
    const r = await api(`/api/system-alerts/${alerta.id}/resolve`, { method: "POST", token: tokenFor(master), body: await resolveBody() });
    assert.equal(r.status, 409);
    const reloaded = await prisma.systemAlert.findUniqueOrThrow({ where: { id: alerta.id } });
    assert.equal(reloaded.manual_resolved_at, null);
  });

  it("18. idempotência: repetir o POST /:id/resolve continua 409 e nada muda", async () => {
    const user = await createUser();
    const { task } = await createTaskFixture({ due_date: overdueDate(), assignee_id: user.id });
    await runAlertEngineOnce();
    const alerta = await prisma.systemAlert.findFirstOrThrow({ where: { entity_id: task.id } });
    const body = await resolveBody();
    const a = await api(`/api/system-alerts/${alerta.id}/resolve`, { method: "POST", token: tokenFor(user), body });
    const b = await api(`/api/system-alerts/${alerta.id}/resolve`, { method: "POST", token: tokenFor(user), body });
    assert.equal(a.status, 409);
    assert.equal(b.status, 409);
    assert.equal(await prisma.systemAlert.count({ where: { entity_id: task.id } }), 1);
  });

  // ── O que NÃO resolve ────────────────────────────────────────────────

  it("7/8/9/10. abrir origem, abrir detalhes, marcar como lido e editar campo sem relação NÃO resolvem", async () => {
    const user = await createUser();
    const { task } = await createTaskFixture({ due_date: overdueDate(), assignee_id: user.id });
    await runAlertEngineOnce();
    const alerta = await prisma.systemAlert.findFirstOrThrow({ where: { entity_id: task.id } });

    await api(`/api/system-alerts/${alerta.id}/events`, { method: "POST", token: tokenFor(user), body: { event_type: "origin_clicked", client_event_id: `ev-${crypto.randomBytes(6).toString("hex")}` } });
    await api(`/api/system-alerts/${alerta.id}/events`, { method: "POST", token: tokenFor(user), body: { event_type: "details_opened", client_event_id: `ev-${crypto.randomBytes(6).toString("hex")}` } });
    await api(`/api/system-alerts/${alerta.id}`, { token: tokenFor(user) }); // abrir detalhes (GET)
    // marcar como lido/dispensar agora é BLOQUEADO enquanto a condição está ativa
    const readRes = await api(`/api/system-alerts/${alerta.id}/read`, { method: "PATCH", token: tokenFor(user) });
    assert.equal(readRes.status, 409);
    // editar um campo sem relação com a condição de prazo
    await prisma.projectTask.update({ where: { id: task.id }, data: { observations: "anotação qualquer" } });

    await runAlertEngineOnce();
    await runAlertEngineOnce();

    const reloaded = await prisma.systemAlert.findUniqueOrThrow({ where: { id: alerta.id } });
    assert.equal(reloaded.automatic_resolved_at, null, "condição persiste → não resolvido");
    assert.equal(reloaded.manual_resolved_at, null);
    assert.equal(reloaded.condition_cleared_at, null);
    assert.equal(await prisma.systemAlertEvent.count({ where: { alert_id: alerta.id, event_type: "resolved" } }), 0);
    assert.equal(await prisma.systemAlertEvent.count({ where: { alert_id: alerta.id, event_type: "auto_resolved" } }), 0);
  });

  // ── Entrega real da tarefa ───────────────────────────────────────────

  it("12/16. entregar a tarefa INTEIRA (todas as etapas obrigatórias concluídas) resolve como task_delivered, sem arquivar", async () => {
    const user = await createUser();
    const { task } = await createTaskFixture({
      due_date: overdueDate(),
      assignee_id: user.id,
      stages: [{ obrigatoria: true, status: "EM_ANDAMENTO" }, { obrigatoria: true, status: "EM_ANDAMENTO" }, { obrigatoria: false, status: "PENDENTE" }],
    });
    await runAlertEngineOnce();
    const alerta = await prisma.systemAlert.findFirstOrThrow({ where: { entity_id: task.id } });

    // conclui todas as etapas OBRIGATÓRIAS
    await prisma.projectTaskStage.updateMany({ where: { project_task_id: task.id, obrigatoria: true }, data: { status: "CONCLUIDA" } });
    await runAlertEngineOnce();

    const reloaded = await prisma.systemAlert.findUniqueOrThrow({ where: { id: alerta.id } });
    assert.equal(reloaded.automatic_resolution_reason, "task_delivered");
    assert.equal(reloaded.automatic_resolution_message, "A tarefa foi entregue pelo responsável.");
    assert.ok(reloaded.automatic_resolved_at);
    assert.ok(reloaded.condition_cleared_at);
    assert.equal(reloaded.is_archived, false, "resolver não arquiva");
    const ev = await prisma.systemAlertEvent.findMany({ where: { alert_id: alerta.id, event_type: "auto_resolved" } });
    assert.equal(ev.length, 1);
    assert.equal(ev[0]?.actor_user_id, null, "autor: Motor da Allka");

    const resolvidos = await api("/api/system-alerts?category=alerta&resolved=true&is_archived=all", { token: tokenFor(user) });
    assert.ok(resolvidos.json.data.some((a: any) => a.id === alerta.id));
    const arquivados = await api("/api/system-alerts?category=alerta&resolved=false&is_archived=true", { token: tokenFor(user) });
    assert.ok(!arquivados.json.data.some((a: any) => a.id === alerta.id));
  });

  it("13. concluir APENAS uma de várias etapas obrigatórias NÃO resolve a tarefa inteira", async () => {
    const user = await createUser();
    const { task } = await createTaskFixture({
      due_date: overdueDate(),
      assignee_id: user.id,
      stages: [{ obrigatoria: true, status: "EM_ANDAMENTO" }, { obrigatoria: true, status: "EM_ANDAMENTO" }],
    });
    await runAlertEngineOnce();
    const alerta = await prisma.systemAlert.findFirstOrThrow({ where: { entity_id: task.id } });

    const primeira = await prisma.projectTaskStage.findFirstOrThrow({ where: { project_task_id: task.id }, orderBy: { ordem: "asc" } });
    await prisma.projectTaskStage.update({ where: { id: primeira.id }, data: { status: "CONCLUIDA" } });
    await runAlertEngineOnce();
    await runAlertEngineOnce();

    const reloaded = await prisma.systemAlert.findUniqueOrThrow({ where: { id: alerta.id } });
    assert.equal(reloaded.automatic_resolved_at, null, "ainda falta etapa obrigatória → não entregue");
  });

  it("13b. tarefa sem etapas não tem sinal de entrega — segue só resolvendo por conclusão/cancelamento", async () => {
    const user = await createUser();
    const { task } = await createTaskFixture({ due_date: overdueDate(), assignee_id: user.id });
    await runAlertEngineOnce();
    const alerta = await prisma.systemAlert.findFirstOrThrow({ where: { entity_id: task.id } });
    // move pra EM_APROVACAO manualmente — sem etapas, não conta como entrega
    await prisma.projectTask.update({ where: { id: task.id }, data: { status: "EM_APROVACAO" } });
    await runAlertEngineOnce();
    assert.equal((await prisma.systemAlert.findUniqueOrThrow({ where: { id: alerta.id } })).automatic_resolved_at, null);
  });

  it("14/15. conclusão e cancelamento continuam resolvendo automaticamente", async () => {
    for (const [status, reason] of [["CONCLUIDA", "task_completed"], ["CANCELADA", "task_cancelled"]] as const) {
      const user = await createUser();
      const { task } = await createTaskFixture({ due_date: overdueDate(), assignee_id: user.id });
      await runAlertEngineOnce();
      const alerta = await prisma.systemAlert.findFirstOrThrow({ where: { entity_id: task.id } });
      await prisma.projectTask.update({ where: { id: task.id }, data: { status } });
      await runAlertEngineOnce();
      const reloaded = await prisma.systemAlert.findUniqueOrThrow({ where: { id: alerta.id } });
      assert.equal(reloaded.automatic_resolution_reason, reason);
      assert.equal(reloaded.is_archived, false);
    }
  });

  it("11b. tarefa ainda atrasada permanece em Ativos após vários ciclos", async () => {
    const user = await createUser();
    const { task } = await createTaskFixture({ due_date: overdueDate(), assignee_id: user.id });
    await runAlertEngineOnce();
    await runAlertEngineOnce();
    await runAlertEngineOnce();
    const ativos = await api("/api/system-alerts?category=alerta&resolved=false&is_archived=false&limit=100", { token: tokenFor(user) });
    assert.ok(ativos.json.data.some((a: any) => a.entity_id === task.id), "segue em Ativos");
  });
});
