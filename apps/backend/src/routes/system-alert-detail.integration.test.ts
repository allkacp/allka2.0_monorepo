import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import app from "../app";
import { prisma } from "../lib/prisma";
import { config } from "../config";

// Visualização detalhada e histórico real de alerta (ata 2026-08, 8º lote):
// GET /api/system-alerts/:id (detalhes + origem + destino + linha do
// tempo) e POST /api/system-alerts/:id/events (eventos de visualização —
// "detalhes abertos"/"origem clicada"). Cobre isolamento entre contas,
// 404 seguro (nunca revela se o alerta existe pra quem não tem acesso),
// dedupe de eventos administrativos e alerta antigo sem histórico
// inventado.

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
const createdAlertIds: string[] = [];
const createdProjectIds: string[] = [];
const createdProductIds: string[] = [];
const createdTaskIds: string[] = [];

async function createUser(overrides: Partial<{ role: string; account_type: string; admin_profile_id: string | null }> = {}) {
  const id = `alert-detail-${crypto.randomBytes(6).toString("hex")}`;
  const user = await prisma.user.create({
    data: {
      id,
      email: `${id}@example.test`,
      password_hash: "unused-test-hash",
      name: `Alert Detail Test ${id}`,
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

async function createProfile(overrides: { is_master?: boolean } = {}) {
  const profile = await prisma.adminProfile.create({
    data: {
      name: `perfil-detalhe-${suffix}-${crypto.randomBytes(4).toString("hex")}`,
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

async function createProjectAndTask(overrides: { title?: string } = {}) {
  const code = `detail-${crypto.randomBytes(4).toString("hex")}`;
  const project = await prisma.project.create({
    data: { title: `Projeto teste detalhe ${code}`, project_code: `proj_${code}`, status: "in-progress" },
  });
  createdProjectIds.push(project.id);
  const product = await prisma.product.create({ data: { name: `Produto teste detalhe ${code}`, category: "teste" } });
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
      title: overrides.title ?? `Tarefa teste detalhe ${code}`,
      status: "EM_EXECUCAO",
    },
  });
  createdTaskIds.push(task.id);
  return { project, task };
}

// Alerta "antigo" — inserido direto via Prisma (sem passar por POST /admin),
// simulando um registro criado ANTES deste lote: sem created_by_user_id,
// sem nenhum SystemAlertEvent.
async function createLegacyAlert(overrides: { user_id?: string | null } = {}) {
  const alert = await prisma.systemAlert.create({
    data: {
      type: "alerta_admin_manual",
      title: `Alerta legado ${suffix}`,
      message: "Mensagem legada",
      severity: "warning",
      category: "alerta",
      user_id: overrides.user_id ?? null,
    },
  });
  createdAlertIds.push(alert.id);
  return alert;
}

describe("Visualização detalhada e histórico — /api/system-alerts/:id (ata 2026-08, 8º lote)", () => {
  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    const listener = app.listen(0);
    server = listener;
    await new Promise<void>((resolve) => listener.once("listening", () => resolve()));
    const address = listener.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  after(async () => {
    await prisma.systemAlertEvent.deleteMany({ where: { alert_id: { in: createdAlertIds } } });
    await prisma.systemAlert.deleteMany({ where: { id: { in: createdAlertIds } } });
    await prisma.projectTask.deleteMany({ where: { id: { in: createdTaskIds } } });
    await prisma.projectProduct.deleteMany({ where: { project_id: { in: createdProjectIds } } });
    await prisma.project.deleteMany({ where: { id: { in: createdProjectIds } } });
    await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.adminProfile.deleteMany({ where: { id: { in: createdProfileIds } } });
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    await prisma.$disconnect();
  });

  it("1. sem sessão -> 401", async () => {
    const alert = await createLegacyAlert();
    const res = await api(`/api/system-alerts/${alert.id}`);
    assert.equal(res.status, 401);
  });

  it("1b. destinatário autorizado (o próprio) abre detalhes com sucesso", async () => {
    const user = await createUser();
    const alert = await createLegacyAlert({ user_id: user.id });
    const res = await api(`/api/system-alerts/${alert.id}`, { token: tokenFor(user) });
    assert.equal(res.status, 200);
    assert.equal(res.json.title, alert.title);
  });

  it("2/18. usuário sem acesso ao alerta de OUTRO usuário recebe 404 (nunca revela se existe) — isolamento entre contas", async () => {
    const owner = await createUser();
    const stranger = await createUser();
    const alert = await createLegacyAlert({ user_id: owner.id });

    const asStranger = await api(`/api/system-alerts/${alert.id}`, { token: tokenFor(stranger) });
    assert.equal(asStranger.status, 404);

    const asOwner = await api(`/api/system-alerts/${alert.id}`, { token: tokenFor(owner) });
    assert.equal(asOwner.status, 200);
  });

  it("2. id inexistente -> 404 (mesma resposta de 'sem acesso', nunca distingue)", async () => {
    const user = await createUser();
    const res = await api(`/api/system-alerts/id-que-nao-existe`, { token: tokenFor(user) });
    assert.equal(res.status, 404);
  });

  it("3. detalhes exibem os campos reais: título, mensagem, severidade, situação, datas", async () => {
    const master = await masterAdmin();
    const alert = await createLegacyAlert();
    const res = await api(`/api/system-alerts/${alert.id}`, { token: tokenFor(master) });
    assert.equal(res.status, 200);
    assert.equal(res.json.title, alert.title);
    assert.equal(res.json.message, alert.message);
    assert.equal(res.json.severity, "warning");
    assert.equal(res.json.situacao, "ativo");
    assert.ok(res.json.created_at);
  });

  it("4. alerta sem destino (entity_type/entity_id nulos) mostra destination: null, nunca inventa uma entidade", async () => {
    const master = await masterAdmin();
    const alert = await createLegacyAlert();
    const res = await api(`/api/system-alerts/${alert.id}`, { token: tokenFor(master) });
    assert.equal(res.json.destination, null);
    assert.equal(res.json.entity_type, null);
  });

  it("destino disponível: resolve nome real da tarefa vinculada, status 'disponivel'", async () => {
    const master = await masterAdmin();
    const { task } = await createProjectAndTask({ title: "Tarefa alvo do detalhe" });
    const created = await api("/api/system-alerts/admin", {
      method: "POST",
      token: tokenFor(master),
      body: { title: "Avulso com destino pro detalhe", message: "Mensagem", severity: "warning", destination_type: "task", destination_id: task.id },
    });
    createdAlertIds.push(created.json.id);

    const res = await api(`/api/system-alerts/${created.json.id}`, { token: tokenFor(master) });
    assert.equal(res.json.destination.status, "disponivel");
    assert.equal(res.json.destination.name, "Tarefa alvo do detalhe");
  });

  it("origem avulso mostra quem criou (created_by) — só quando o campo existe", async () => {
    const master = await masterAdmin();
    const created = await api("/api/system-alerts/admin", {
      method: "POST",
      token: tokenFor(master),
      body: { title: "Avulso pra checar criador", message: "Mensagem", severity: "info" },
    });
    createdAlertIds.push(created.json.id);

    const res = await api(`/api/system-alerts/${created.json.id}`, { token: tokenFor(master) });
    assert.equal(res.json.origin.type, "avulso");
    assert.equal(res.json.origin.created_by.id, master.id);
  });

  it("9/17. IDs técnicos (entity_id, user_id) não aparecem como rótulo principal — só nome legível", async () => {
    const master = await masterAdmin();
    const { task } = await createProjectAndTask({ title: "Tarefa nunca deve aparecer só por id" });
    const created = await api("/api/system-alerts/admin", {
      method: "POST",
      token: tokenFor(master),
      body: { title: "Avulso pra checar rotulagem", message: "Mensagem", severity: "info", destination_type: "task", destination_id: task.id },
    });
    createdAlertIds.push(created.json.id);

    const res = await api(`/api/system-alerts/${created.json.id}`, { token: tokenFor(master) });
    // destination.name é o rótulo principal — nunca só destination.entity_id
    // exposto como texto de exibição isolado (o campo cru só existe pro
    // frontend montar o link, ver comentário na rota).
    assert.equal(res.json.destination.name, "Tarefa nunca deve aparecer só por id");
    assert.notEqual(res.json.destination.name, task.id);
  });

  it("12. alerta antigo (sem eventos) tem events: [] — nunca inventa histórico", async () => {
    const master = await masterAdmin();
    const alert = await createLegacyAlert();
    const res = await api(`/api/system-alerts/${alert.id}`, { token: tokenFor(master) });
    assert.deepEqual(res.json.events, []);
  });

  it("criação via POST /admin já grava exatamente 1 evento 'created', na mesma operação", async () => {
    const master = await masterAdmin();
    const created = await api("/api/system-alerts/admin", {
      method: "POST",
      token: tokenFor(master),
      body: { title: "Avulso pra checar evento de criação", message: "Mensagem", severity: "info" },
    });
    createdAlertIds.push(created.json.id);

    const res = await api(`/api/system-alerts/${created.json.id}`, { token: tokenFor(master) });
    assert.equal(res.json.events.length, 1);
    assert.equal(res.json.events[0].event_type, "created");
  });

  it("8. linha do tempo vem em ordem cronológica (criação antes de arquivamento antes de restauração)", async () => {
    const master = await masterAdmin();
    const created = await api("/api/system-alerts/admin", {
      method: "POST",
      token: tokenFor(master),
      body: { title: "Avulso pra checar ordem", message: "Mensagem", severity: "info" },
    });
    const id = created.json.id;
    createdAlertIds.push(id);

    await api(`/api/system-alerts/admin/${id}/archive`, { method: "PATCH", token: tokenFor(master) });
    await api(`/api/system-alerts/admin/${id}/unarchive`, { method: "PATCH", token: tokenFor(master) });

    const res = await api(`/api/system-alerts/${id}`, { token: tokenFor(master) });
    const types = res.json.events.map((e: any) => e.event_type);
    assert.deepEqual(types, ["created", "archived", "unarchived"]);
    const timestamps = res.json.events.map((e: any) => new Date(e.created_at).getTime());
    assert.ok(timestamps[0] <= timestamps[1] && timestamps[1] <= timestamps[2]);
  });

  it("11. arquivar duas vezes seguidas grava só 1 evento 'archived' — nunca duplica", async () => {
    const master = await masterAdmin();
    const created = await api("/api/system-alerts/admin", {
      method: "POST",
      token: tokenFor(master),
      body: { title: "Avulso pra checar dedupe de evento", message: "Mensagem", severity: "info" },
    });
    const id = created.json.id;
    createdAlertIds.push(id);

    await api(`/api/system-alerts/admin/${id}/archive`, { method: "PATCH", token: tokenFor(master) });
    await api(`/api/system-alerts/admin/${id}/archive`, { method: "PATCH", token: tokenFor(master) });

    const res = await api(`/api/system-alerts/${id}`, { token: tokenFor(master) });
    const archivedCount = res.json.events.filter((e: any) => e.event_type === "archived").length;
    assert.equal(archivedCount, 1);
  });

  // ── POST /:id/events ──────────────────────────────────────────────────────

  it("10. POST /:id/events com 'details_opened' grava o evento", async () => {
    const master = await masterAdmin();
    const alert = await createLegacyAlert();
    const res = await api(`/api/system-alerts/${alert.id}/events`, {
      method: "POST",
      token: tokenFor(master),
      body: { event_type: "details_opened", client_event_id: crypto.randomUUID() },
    });
    assert.equal(res.status, 201);
    assert.equal(res.json.duplicate, false);

    const detail = await api(`/api/system-alerts/${alert.id}`, { token: tokenFor(master) });
    assert.deepEqual(detail.json.events.map((e: any) => e.event_type), ["details_opened"]);
  });

  it("10b. POST /:id/events com 'origin_clicked' grava o evento", async () => {
    const master = await masterAdmin();
    const alert = await createLegacyAlert();
    const res = await api(`/api/system-alerts/${alert.id}/events`, {
      method: "POST",
      token: tokenFor(master),
      body: { event_type: "origin_clicked", client_event_id: crypto.randomUUID() },
    });
    assert.equal(res.status, 201);
  });

  it("POST /:id/events rejeita event_type fora do allow-list (nunca aceita tipo arbitrário do cliente)", async () => {
    const master = await masterAdmin();
    const alert = await createLegacyAlert();
    const res = await api(`/api/system-alerts/${alert.id}/events`, {
      method: "POST",
      token: tokenFor(master),
      body: { event_type: "archived", client_event_id: crypto.randomUUID() },
    });
    assert.equal(res.status, 400);
  });

  it("20. sem client_event_id -> 400 (obrigatório, nunca opcional — é a garantia real de idempotência)", async () => {
    const master = await masterAdmin();
    const alert = await createLegacyAlert();
    const res = await api(`/api/system-alerts/${alert.id}/events`, {
      method: "POST",
      token: tokenFor(master),
      body: { event_type: "details_opened" },
    });
    assert.equal(res.status, 400);
  });

  it("2/19. POST /:id/events pra alerta de outro usuário -> 404 (mesmo isolamento do GET) — não registra evento", async () => {
    const owner = await createUser();
    const stranger = await createUser();
    const alert = await createLegacyAlert({ user_id: owner.id });
    const res = await api(`/api/system-alerts/${alert.id}/events`, {
      method: "POST",
      token: tokenFor(stranger),
      body: { event_type: "details_opened", client_event_id: crypto.randomUUID() },
    });
    assert.equal(res.status, 404);

    const detail = await api(`/api/system-alerts/${alert.id}`, { token: tokenFor(owner) });
    assert.deepEqual(detail.json.events, []);
  });

  it("16. repetir a MESMA requisição (mesmo client_event_id) grava só 1 evento — retry de rede/clique duplo", async () => {
    const master = await masterAdmin();
    const alert = await createLegacyAlert();
    const clientEventId = crypto.randomUUID();

    const first = await api(`/api/system-alerts/${alert.id}/events`, {
      method: "POST",
      token: tokenFor(master),
      body: { event_type: "details_opened", client_event_id: clientEventId },
    });
    assert.equal(first.status, 201);
    assert.equal(first.json.duplicate, false);

    const retry = await api(`/api/system-alerts/${alert.id}/events`, {
      method: "POST",
      token: tokenFor(master),
      body: { event_type: "details_opened", client_event_id: clientEventId },
    });
    assert.equal(retry.status, 200);
    assert.equal(retry.json.duplicate, true);

    const detail = await api(`/api/system-alerts/${alert.id}`, { token: tokenFor(master) });
    assert.equal(detail.json.events.length, 1);
  });

  it("16b. duas requisições CONCORRENTES com o mesmo client_event_id (corrida real) gravam só 1 evento", async () => {
    const master = await masterAdmin();
    const alert = await createLegacyAlert();
    const clientEventId = crypto.randomUUID();
    const token = tokenFor(master);

    const post = () =>
      api(`/api/system-alerts/${alert.id}/events`, {
        method: "POST",
        token,
        body: { event_type: "origin_clicked", client_event_id: clientEventId },
      });
    const results = await Promise.all([post(), post(), post()]);
    assert.ok(results.every((r) => r.status === 200 || r.status === 201));

    const detail = await api(`/api/system-alerts/${alert.id}`, { token });
    assert.equal(detail.json.events.length, 1);
  });

  it("17. um client_event_id DIFERENTE (nova abertura legítima) grava um evento novo, distinto", async () => {
    const master = await masterAdmin();
    const alert = await createLegacyAlert();

    await api(`/api/system-alerts/${alert.id}/events`, {
      method: "POST",
      token: tokenFor(master),
      body: { event_type: "details_opened", client_event_id: crypto.randomUUID() },
    });
    await api(`/api/system-alerts/${alert.id}/events`, {
      method: "POST",
      token: tokenFor(master),
      body: { event_type: "details_opened", client_event_id: crypto.randomUUID() },
    });

    const detail = await api(`/api/system-alerts/${alert.id}`, { token: tokenFor(master) });
    assert.equal(detail.json.events.length, 2);
  });

  it("18. origin_clicked segue a mesma proteção de idempotência que details_opened", async () => {
    const master = await masterAdmin();
    const alert = await createLegacyAlert();
    const clientEventId = crypto.randomUUID();

    await api(`/api/system-alerts/${alert.id}/events`, {
      method: "POST",
      token: tokenFor(master),
      body: { event_type: "origin_clicked", client_event_id: clientEventId },
    });
    const retry = await api(`/api/system-alerts/${alert.id}/events`, {
      method: "POST",
      token: tokenFor(master),
      body: { event_type: "origin_clicked", client_event_id: clientEventId },
    });
    assert.equal(retry.json.duplicate, true);

    const detail = await api(`/api/system-alerts/${alert.id}`, { token: tokenFor(master) });
    assert.equal(detail.json.events.filter((e: any) => e.event_type === "origin_clicked").length, 1);
  });
});
