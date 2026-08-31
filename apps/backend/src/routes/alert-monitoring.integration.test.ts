import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import app from "../app";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import { ensureDefaultAlertStandardsAndRules } from "../lib/alert-engine";

// Monitoramento da liderança (ata 2026-08, bloco 2/5): aba separada que
// mostra alertas CRÍTICOS de TERCEIROS dentro da autoridade real de quem
// pergunta. Só leitura — nunca resolve/dispensa alerta de outra pessoa.

const suffix = `${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
let baseUrl = "";
let server: import("node:http").Server;

function tokenFor(u: { id: string; email: string; role: string; account_type: string }) {
  return jwt.sign(
    { id: u.id, email: u.email, role: u.role, account_type: u.account_type },
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
const createdAlertIds: string[] = [];

async function createUser(overrides: Partial<{ role: string; account_type: string; admin_profile_id: string | null }> = {}) {
  const id = `mon-${crypto.randomBytes(6).toString("hex")}`;
  const user = await prisma.user.create({
    data: {
      id,
      email: `${id}@example.test`,
      password_hash: "unused-test-hash",
      name: `Mon Test ${id}`,
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
    data: { name: `mon-master-${suffix}-${crypto.randomBytes(4).toString("hex")}`, is_master: true, is_active: true },
  });
  createdProfileIds.push(profile.id);
  return createUser({ role: "admin", account_type: "admin", admin_profile_id: profile.id });
}

async function createTask(liderId: string | null, assigneeId: string) {
  const code = `${suffix}-${crypto.randomBytes(4).toString("hex")}`;
  const project = await prisma.project.create({ data: { title: `Projeto mon ${code}`, project_code: code, status: "in-progress" } });
  createdProjectIds.push(project.id);
  const product = await prisma.product.create({ data: { name: `Produto mon ${code}`, category: "teste" } });
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
      title: `Tarefa mon ${code}`,
      status: "EM_EXECUCAO",
      due_date: new Date(Date.now() - 2 * 60 * 60 * 1000),
      assignee_id: assigneeId,
      lider_responsavel_id: liderId,
    },
  });
  createdTaskIds.push(task.id);
  return { task, project };
}

let overdueStandardId = "";
let overdueRuleId = "";

async function createOverdueAlert(opts: {
  taskId: string;
  userId: string | null;
  severity?: string;
  automatic?: boolean;
  createdAt?: Date;
}) {
  const a = await prisma.systemAlert.create({
    data: {
      type: "task.overdue",
      title: "[TESTE LOCAL] Tarefa atrasada",
      message: "A tarefa está atrasada.",
      severity: opts.severity ?? "error",
      category: "alerta",
      entity_type: "project_task",
      entity_id: opts.taskId,
      user_id: opts.userId,
      standard_id: overdueStandardId,
      rule_id: overdueRuleId,
      dedupe_key: `test-${crypto.randomBytes(8).toString("hex")}`,
      ...(opts.createdAt ? { created_at: opts.createdAt } : {}),
      ...(opts.automatic
        ? { automatic_resolved_at: new Date(), automatic_resolution_reason: "task_completed", automatic_resolution_message: "A tarefa foi concluída." }
        : {}),
    },
  });
  createdAlertIds.push(a.id);
  return a;
}

describe("Monitoramento da liderança", () => {
  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    const listener = app.listen(0);
    server = listener;
    await new Promise<void>((resolve) => listener.once("listening", () => resolve()));
    baseUrl = `http://127.0.0.1:${(listener.address() as AddressInfo).port}`;
    await ensureDefaultAlertStandardsAndRules();
    const std = await prisma.alertStandard.findFirst({ where: { key: "task.overdue" } });
    overdueStandardId = std!.id;
    const rule = await prisma.alertRule.findFirst({ where: { standard_id: overdueStandardId } });
    overdueRuleId = rule!.id;
  });

  after(async () => {
    await prisma.systemAlert.deleteMany({ where: { id: { in: createdAlertIds } } });
    await prisma.systemAlert.deleteMany({ where: { entity_id: { in: createdTaskIds } } });
    await prisma.projectTask.deleteMany({ where: { id: { in: createdTaskIds } } });
    await prisma.projectProduct.deleteMany({ where: { project_id: { in: createdProjectIds } } });
    await prisma.project.deleteMany({ where: { id: { in: createdProjectIds } } });
    await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.adminProfile.deleteMany({ where: { id: { in: createdProfileIds } } });
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    await prisma.$disconnect();
  });

  it("9. Admin Master vê alertas críticos de terceiros no escopo global", async () => {
    const master = await masterAdmin();
    const assignee = await createUser();
    const { task } = await createTask(null, assignee.id);
    const alert = await createOverdueAlert({ taskId: task.id, userId: assignee.id });

    const r = await api("/api/system-alerts/monitoring", { token: tokenFor(master) });
    assert.equal(r.status, 200);
    assert.equal(r.json.scope_level, "master");
    const row = r.json.data.find((a: any) => a.id === alert.id);
    assert.ok(row, "Master enxerga o alerta de terceiro");
    assert.equal(row.recipient.id, assignee.id);
    assert.equal(row.severity, "error");
    assert.equal(row.origin, "automatico");
    assert.equal(row.condition_controlled, true);
    assert.ok(typeof row.open_ms === "number" && row.open_ms >= 0);
  });

  it("11/13. Líder vê SÓ os alertas das tarefas sob sua responsabilidade — query manipulada não amplia", async () => {
    const lider = await createUser({ role: "lider", account_type: "lider" });
    const other = await createUser();
    const mine = await createTask(lider.id, other.id);
    const notMine = await createTask(null, other.id);
    const seen = await createOverdueAlert({ taskId: mine.task.id, userId: other.id });
    const hidden = await createOverdueAlert({ taskId: notMine.task.id, userId: other.id });

    const r = await api("/api/system-alerts/monitoring?limit=200", { token: tokenFor(lider) });
    assert.equal(r.status, 200);
    assert.equal(r.json.scope_level, "leader");
    const ids = r.json.data.map((a: any) => a.id);
    assert.ok(ids.includes(seen.id), "vê alerta da tarefa dele");
    assert.ok(!ids.includes(hidden.id), "não vê alerta de tarefa de outro líder");

    // Tentar forçar o alerta escondido via recipient_user_id não amplia.
    const forced = await api(`/api/system-alerts/monitoring?recipient_user_id=${other.id}&limit=200`, { token: tokenFor(lider) });
    assert.ok(!forced.json.data.map((a: any) => a.id).includes(hidden.id));
  });

  it("12. Usuário final não tem acesso ao Monitoramento — 403", async () => {
    const user = await createUser();
    const r = await api("/api/system-alerts/monitoring", { token: tokenFor(user) });
    assert.equal(r.status, 403);
    const s = await api("/api/system-alerts/monitoring/summary", { token: tokenFor(user) });
    assert.equal(s.status, 403);
  });

  it("10. Líder sem nenhuma tarefa sob responsabilidade não recebe a aba — 403", async () => {
    const lonelyLeader = await createUser({ role: "lider", account_type: "lider" });
    const r = await api("/api/system-alerts/monitoring", { token: tokenFor(lonelyLeader) });
    assert.equal(r.status, 403);
  });

  it("15. Monitoramento é só leitura — líder não resolve alerta de terceiro (rota de resolver ignora terceiros)", async () => {
    const lider = await createUser({ role: "lider", account_type: "lider" });
    const other = await createUser();
    const { task } = await createTask(lider.id, other.id);
    const alert = await createOverdueAlert({ taskId: task.id, userId: other.id });

    // A rota de resolver usa escopoDoUsuario — o alerta é de `other`, então
    // o líder recebe 404 (fora do escopo dele), nunca 200.
    const resolveRes = await api(`/api/system-alerts/${alert.id}/resolve`, {
      method: "POST",
      token: tokenFor(lider),
      body: { action: "correcao_aplicada", description: "não deveria funcionar", client_action_id: `cli-${crypto.randomBytes(5).toString("hex")}` },
    });
    assert.ok(resolveRes.status === 404 || resolveRes.status === 403, `esperado 404/403, veio ${resolveRes.status}`);
    // E arquivar também não.
    const archiveRes = await api(`/api/system-alerts/${alert.id}/archive`, { method: "PATCH", token: tokenFor(lider) });
    assert.ok(archiveRes.status === 404 || archiveRes.status === 403);
  });

  it("16/18. summary bate com a listagem; resolvidos mostram autor/motor", async () => {
    const master = await masterAdmin();
    const assignee = await createUser();
    const { task } = await createTask(null, assignee.id);
    const ativo = await createOverdueAlert({ taskId: task.id, userId: assignee.id });
    const resolvidoAuto = await createOverdueAlert({ taskId: task.id, userId: assignee.id, automatic: true });

    const list = await api("/api/system-alerts/monitoring?situacao=resolvido&limit=200", { token: tokenFor(master) });
    const resolvedRow = list.json.data.find((a: any) => a.id === resolvidoAuto.id);
    assert.ok(resolvedRow, "resolvido automático aparece no filtro de resolvidos");
    assert.equal(resolvedRow.resolution_kind, "automatica");
    assert.equal(resolvedRow.resolved_by.name, "Motor da Allka");

    const summary = await api("/api/system-alerts/monitoring/summary", { token: tokenFor(master) });
    assert.equal(summary.status, 200);
    assert.ok(summary.json.criticos_ativos >= 1, "conta pelo menos o ativo criado");
    assert.ok(summary.json.resolvidos_no_periodo >= 1);
    assert.ok(summary.json.oldest_open_at, "tem alerta mais antigo em aberto");
    void ativo;
  });

  it("17. tempo em aberto: alerta antigo tem open_ms coerente com created_at", async () => {
    const master = await masterAdmin();
    const assignee = await createUser();
    const { task } = await createTask(null, assignee.id);
    const old = await createOverdueAlert({
      taskId: task.id,
      userId: assignee.id,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    });
    const r = await api("/api/system-alerts/monitoring?limit=200", { token: tokenFor(master) });
    const row = r.json.data.find((a: any) => a.id === old.id);
    assert.ok(row.open_ms >= 4 * 24 * 60 * 60 * 1000, "aberto há ~5 dias");
  });

  it("14. detalhe/origem respeitam o escopo — GET /:id de alerta fora do escopo do líder é 404", async () => {
    const lider = await createUser({ role: "lider", account_type: "lider" });
    await createTask(lider.id, lider.id); // dá acesso à aba
    const other = await createUser();
    const notMine = await createTask(null, other.id);
    const hidden = await createOverdueAlert({ taskId: notMine.task.id, userId: other.id });
    const detail = await api(`/api/system-alerts/${hidden.id}`, { token: tokenFor(lider) });
    assert.equal(detail.status, 404);
  });
});
