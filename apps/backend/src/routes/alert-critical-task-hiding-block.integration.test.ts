import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import app from "../app";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import { ensureDefaultAlertStandardsAndRules, runAlertEngineOnce } from "../lib/alert-engine";

// Alerta automático VERMELHO de tarefa com condição AINDA ATIVA (ata
// 2026-08): não pode ser dispensado, arquivado nem escondido de "Dispensar
// todos" — nem pelo Admin Master. Só a situação real da tarefa o encerra.
// Depois da resolução automática, o arquivamento explícito volta a valer.

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
const createdAvulsoIds: string[] = [];

async function createUser(overrides: Partial<{ role: string; account_type: string; admin_profile_id: string | null }> = {}) {
  const id = `alert-hide-${crypto.randomBytes(6).toString("hex")}`;
  const user = await prisma.user.create({
    data: {
      id,
      email: `${id}@example.test`,
      password_hash: "unused-test-hash",
      name: `Hiding Block Test ${id}`,
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
    data: { name: `perfil-hide-${suffix}-${crypto.randomBytes(4).toString("hex")}`, is_master: true, is_active: true },
  });
  createdProfileIds.push(profile.id);
  return createUser({ role: "admin", account_type: "admin", admin_profile_id: profile.id });
}

async function createTaskFixture(overrides: {
  due_date: Date | null;
  assignee_id?: string | null;
  stages?: { obrigatoria: boolean; status: string }[];
}) {
  const code = `${suffix}-${crypto.randomBytes(4).toString("hex")}`;
  const project = await prisma.project.create({ data: { title: `Projeto hb ${code}`, project_code: code, status: "in-progress" } });
  createdProjectIds.push(project.id);
  const product = await prisma.product.create({ data: { name: `Produto hb ${code}`, category: "teste" } });
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
      title: `Tarefa hb ${code}`,
      status: "EM_EXECUCAO",
      due_date: overrides.due_date,
      assignee_id: overrides.assignee_id ?? null,
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

async function overdueAlertFor(taskAssignee: { id: string }) {
  const { task } = await createTaskFixture({ due_date: overdueDate(), assignee_id: taskAssignee.id });
  await runAlertEngineOnce();
  const alerta = await prisma.systemAlert.findFirstOrThrow({ where: { entity_id: task.id, type: "task.overdue" } });
  return { task, alerta };
}

describe("Não esconder alerta crítico automático de tarefa com condição ativa (ata 2026-08)", () => {
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
    await prisma.systemAlert.deleteMany({ where: { id: { in: createdAvulsoIds } } });
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

  // ── Bloqueio das rotas individuais ───────────────────────────────────

  it("4/5/6/17. resolve, read e archive num automático vermelho ativo → 409 com a mensagem de acompanhamento, sem eventos", async () => {
    const user = await createUser();
    const { alerta } = await overdueAlertFor(user);

    for (const [path, method] of [["/resolve", "POST"], ["/read", "PATCH"], ["/archive", "PATCH"]] as const) {
      const body = path === "/resolve"
        ? { action: "correcao_aplicada", description: "tentativa manual no teste", client_action_id: `cli-${crypto.randomBytes(6).toString("hex")}` }
        : undefined;
      const r = await api(`/api/system-alerts/${alerta.id}${path}`, { method, token: tokenFor(user), body });
      assert.equal(r.status, 409, `${path} deve ser 409`);
      assert.match(r.json.error, /continuará ativo até que a situação real da tarefa seja regularizada/i);
    }

    const reloaded = await prisma.systemAlert.findUniqueOrThrow({ where: { id: alerta.id } });
    assert.equal(reloaded.is_read, false);
    assert.equal(reloaded.is_archived, false);
    assert.equal(reloaded.manual_resolved_at, null);
    assert.equal(reloaded.automatic_resolved_at, null);
    for (const t of ["dismissed", "archived", "resolved"]) {
      assert.equal(await prisma.systemAlertEvent.count({ where: { alert_id: alerta.id, event_type: t } }), 0, `nenhum evento ${t}`);
    }
  });

  it("7. Admin Master é bloqueado: no próprio read/archive e na rota administrativa /admin/:id/archive de qualquer alerta", async () => {
    const master = await masterAdmin();
    // (a) alerta endereçado ao próprio Master → read/archive pessoais dão 409
    const proprio = await overdueAlertFor(master);
    for (const [path, method] of [["/read", "PATCH"], ["/archive", "PATCH"]] as const) {
      const r = await api(`/api/system-alerts/${proprio.alerta.id}${path}`, { method, token: tokenFor(master) });
      assert.equal(r.status, 409, `${path} do próprio Master deve ser 409`);
    }

    // (b) alerta endereçado a OUTRA pessoa → a rota administrativa também dá 409
    const outra = await createUser();
    const deOutra = await overdueAlertFor(outra);
    const admRes = await api(`/api/system-alerts/admin/${deOutra.alerta.id}/archive`, { method: "PATCH", token: tokenFor(master) });
    assert.equal(admRes.status, 409, "admin/:id/archive para Master deve ser 409");

    for (const id of [proprio.alerta.id, deOutra.alerta.id]) {
      const reloaded = await prisma.systemAlert.findUniqueOrThrow({ where: { id } });
      assert.equal(reloaded.is_archived, false);
      assert.equal(reloaded.is_read, false);
    }
  });

  // ── "Dispensar todos" ────────────────────────────────────────────────

  it("8/9/10. read-all dispensa os permitidos, preserva o vermelho automático e informa a quantidade preservada", async () => {
    const user = await createUser();
    // permitidos: um amarelo automático + um avulso verde
    await createTaskFixture({ due_date: soonDate(), assignee_id: user.id });
    const verde = await prisma.systemAlert.create({
      data: { type: "alerta_admin_manual", title: "[teste] verde", message: "informativo", severity: "info", category: "alerta", user_id: user.id },
    });
    createdAvulsoIds.push(verde.id);
    // protegido: vermelho automático ativo
    const { alerta: vermelho } = await overdueAlertFor(user);
    await runAlertEngineOnce();

    const r = await api("/api/system-alerts/read-all?category=alerta", { method: "PATCH", token: tokenFor(user) });
    assert.equal(r.status, 200);
    assert.ok(r.json.updated >= 2, "dispensou os permitidos (amarelo + verde)");
    assert.equal(r.json.preserved, 1, "1 crítico preservado");
    assert.match(r.json.message, /permaneceu ativo porque ainda precisa ser regularizado/i);

    assert.equal((await prisma.systemAlert.findUniqueOrThrow({ where: { id: vermelho.id } })).is_read, false, "vermelho não foi dispensado");
    assert.equal((await prisma.systemAlert.findUniqueOrThrow({ where: { id: verde.id } })).is_read, true, "verde foi dispensado");
  });

  it("read-all sem crítico ativo não retorna mensagem de preservação", async () => {
    const user = await createUser();
    const amarelo = await prisma.systemAlert.create({
      data: { type: "alerta_admin_manual", title: "[teste] amarelo", message: "aviso", severity: "warning", category: "alerta", user_id: user.id },
    });
    createdAvulsoIds.push(amarelo.id);
    const r = await api("/api/system-alerts/read-all?category=alerta", { method: "PATCH", token: tokenFor(user) });
    assert.equal(r.json.preserved, 0);
    assert.equal(r.json.message, undefined);
  });

  // ── O que NÃO altera estado ─────────────────────────────────────────

  it("11/12. abrir detalhes (GET) e registrar origin_clicked não alteram o alerta", async () => {
    const user = await createUser();
    const { alerta } = await overdueAlertFor(user);
    const antes = await prisma.systemAlert.findUniqueOrThrow({ where: { id: alerta.id } });

    await api(`/api/system-alerts/${alerta.id}`, { token: tokenFor(user) });
    await api(`/api/system-alerts/${alerta.id}/events`, { method: "POST", token: tokenFor(user), body: { event_type: "origin_clicked", client_event_id: `ev-${crypto.randomBytes(6).toString("hex")}` } });

    const depois = await prisma.systemAlert.findUniqueOrThrow({ where: { id: alerta.id } });
    assert.equal(depois.is_read, antes.is_read);
    assert.equal(depois.is_archived, antes.is_archived);
    assert.equal(depois.automatic_resolved_at, null);
    // detalhe expõe os flags de UI
    const detail = await api(`/api/system-alerts/${alerta.id}`, { token: tokenFor(user) });
    assert.equal(detail.json.condition_controlled, true);
    assert.equal(detail.json.disposal_blocked, true);
  });

  // ── Depois da resolução automática ──────────────────────────────────

  it("13/14. entregar a tarefa resolve automaticamente e, DEPOIS, o arquivamento explícito volta a funcionar (evento próprio)", async () => {
    const user = await createUser();
    const { task } = await createTaskFixture({
      due_date: overdueDate(),
      assignee_id: user.id,
      stages: [{ obrigatoria: true, status: "EM_ANDAMENTO" }, { obrigatoria: true, status: "EM_ANDAMENTO" }],
    });
    await runAlertEngineOnce();
    const alerta = await prisma.systemAlert.findFirstOrThrow({ where: { entity_id: task.id } });

    // antes: read/archive bloqueados
    assert.equal((await api(`/api/system-alerts/${alerta.id}/archive`, { method: "PATCH", token: tokenFor(user) })).status, 409);

    // entrega real: todas as etapas obrigatórias concluídas
    await prisma.projectTaskStage.updateMany({ where: { project_task_id: task.id, obrigatoria: true }, data: { status: "CONCLUIDA" } });
    await runAlertEngineOnce();

    const resolvido = await prisma.systemAlert.findUniqueOrThrow({ where: { id: alerta.id } });
    assert.equal(resolvido.automatic_resolution_reason, "task_delivered");
    assert.equal(resolvido.is_archived, false, "resolver não arquiva");

    // agora o arquivamento explícito funciona
    const arch = await api(`/api/system-alerts/${alerta.id}/archive`, { method: "PATCH", token: tokenFor(user) });
    assert.equal(arch.status, 200);
    const arquivado = await prisma.systemAlert.findUniqueOrThrow({ where: { id: alerta.id } });
    assert.equal(arquivado.is_archived, true);
    assert.ok(arquivado.automatic_resolved_at, "resolução automática preservada");
    const evts = (await prisma.systemAlertEvent.findMany({ where: { alert_id: alerta.id }, orderBy: { created_at: "asc" } })).map((e) => e.event_type);
    assert.ok(evts.includes("auto_resolved"));
    assert.ok(evts.includes("archived"));
  });

  // ── Preservações ────────────────────────────────────────────────────

  it("15. alerta AMARELO automático continua dispensável/arquivável", async () => {
    const user = await createUser();
    await createTaskFixture({ due_date: soonDate(), assignee_id: user.id });
    await runAlertEngineOnce();
    const amarelo = await prisma.systemAlert.findFirstOrThrow({ where: { user_id: user.id, type: "task.due_soon" } });
    assert.equal((await api(`/api/system-alerts/${amarelo.id}/read`, { method: "PATCH", token: tokenFor(user) })).status, 200);
    assert.equal((await api(`/api/system-alerts/${amarelo.id}/archive`, { method: "PATCH", token: tokenFor(user) })).status, 200);
  });

  it("16. alerta vermelho MANUAL/avulso mantém a resolução formal (não vira acompanhamento obrigatório)", async () => {
    const user = await createUser();
    const avulso = await prisma.systemAlert.create({
      data: { type: "alerta_admin_manual", title: "[teste] vermelho manual", message: "crítico manual", severity: "error", category: "alerta", user_id: user.id },
    });
    createdAvulsoIds.push(avulso.id);
    // sem resolver: read/archive dão o 409 "precisa resolver" (fluxo do 10º lote), NÃO o de acompanhamento
    const r = await api(`/api/system-alerts/${avulso.id}/read`, { method: "PATCH", token: tokenFor(user) });
    assert.equal(r.status, 409);
    assert.equal(r.json.requires_resolution, true);
    // resolve formal funciona
    const resolve = await api(`/api/system-alerts/${avulso.id}/resolve`, {
      method: "POST", token: tokenFor(user),
      body: { action: "correcao_aplicada", description: "resolvido formalmente no teste", client_action_id: `cli-${crypto.randomBytes(6).toString("hex")}` },
    });
    assert.equal(resolve.status, 201);
    // e depois arquiva
    assert.equal((await api(`/api/system-alerts/${avulso.id}/archive`, { method: "PATCH", token: tokenFor(user) })).status, 200);
  });
});
