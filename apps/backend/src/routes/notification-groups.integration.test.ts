import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import app from "../app";
import { prisma } from "../lib/prisma";
import { config } from "../config";

// Grupos de Notificação com ciclo de aprovação (ata 2026-08, bloco 3/5).
// Admin Master cria ATIVO direto (com sala); Líder SOLICITA (pending) →
// alerta amarelo → Master aprova (transação: ativo + sala + participantes +
// resolve o alerta) ou rejeita (com justificativa).

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

async function api(path: string, opts: { method?: string; token?: string; body?: unknown } = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: opts.method ?? "GET",
    headers: { "content-type": "application/json", ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}) },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

const createdUserIds: string[] = [];
const createdProfileIds: string[] = [];
const createdProjectIds: string[] = [];
const createdProductIds: string[] = [];
const createdTaskIds: string[] = [];
const createdGroupIds: string[] = [];
const createdConversationIds: string[] = [];

async function mkUser(over: Partial<{ role: string; account_type: string; admin_profile_id: string | null; is_active: boolean }> = {}) {
  const id = `ng-${crypto.randomBytes(6).toString("hex")}`;
  const u = await prisma.user.create({
    data: {
      id,
      email: `${id}@example.test`,
      password_hash: "x",
      name: `NG ${id}`,
      role: over.role ?? "company_user",
      account_type: over.account_type ?? "empresas",
      is_active: over.is_active ?? true,
      status: "ativo",
      admin_profile_id: over.admin_profile_id ?? null,
    },
  });
  createdUserIds.push(u.id);
  return u;
}

async function mkMaster() {
  const p = await prisma.adminProfile.create({ data: { name: `ng-master-${suffix}-${crypto.randomBytes(3).toString("hex")}`, is_master: true, is_active: true } });
  createdProfileIds.push(p.id);
  return mkUser({ role: "admin", account_type: "admin", admin_profile_id: p.id });
}

/** Cria uma tarefa que coloca `assigneeId` sob a responsabilidade de `leaderId`. */
async function mkTaskUnderLeader(leaderId: string, assigneeId: string) {
  const code = `${suffix}-${crypto.randomBytes(4).toString("hex")}`;
  const project = await prisma.project.create({ data: { title: `Proj ${code}`, project_code: code, status: "in-progress" } });
  createdProjectIds.push(project.id);
  const product = await prisma.product.create({ data: { name: `Prod ${code}`, category: "t" } });
  createdProductIds.push(product.id);
  const pp = await prisma.projectProduct.create({
    data: { project_id: project.id, product_id: product.id, product_name_snapshot: product.name, product_category_snapshot: product.category },
  });
  const task = await prisma.projectTask.create({
    data: {
      project_id: project.id,
      project_product_id: pp.id,
      product_id: product.id,
      name_snapshot: product.name,
      title: `Task ${code}`,
      status: "EM_EXECUCAO",
      lider_responsavel_id: leaderId,
      assignee_id: assigneeId,
    },
  });
  createdTaskIds.push(task.id);
}

let master: Awaited<ReturnType<typeof mkUser>>;
let masterToken = "";
let leader: Awaited<ReturnType<typeof mkUser>>;
let leaderToken = "";
let memberA: Awaited<ReturnType<typeof mkUser>>;
let memberB: Awaited<ReturnType<typeof mkUser>>;
let outsider: Awaited<ReturnType<typeof mkUser>>;

describe("Grupos de Notificação — ciclo de aprovação", () => {
  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    const listener = app.listen(0);
    server = listener;
    await new Promise<void>((r) => listener.once("listening", () => r()));
    baseUrl = `http://127.0.0.1:${(listener.address() as AddressInfo).port}`;

    master = await mkMaster();
    masterToken = tokenFor(master);
    leader = await mkUser({ role: "lider", account_type: "lider" });
    leaderToken = tokenFor(leader);
    memberA = await mkUser();
    memberB = await mkUser();
    outsider = await mkUser();
    await mkTaskUnderLeader(leader.id, memberA.id);
    await mkTaskUnderLeader(leader.id, memberB.id);
  });

  after(async () => {
    await prisma.chatParticipant.deleteMany({ where: { conversation_id: { in: createdConversationIds } } });
    await prisma.chatMessage.deleteMany({ where: { conversation_id: { in: createdConversationIds } } });
    await prisma.notificationGroupMember.deleteMany({ where: { group_id: { in: createdGroupIds } } });
    await prisma.notificationGroup.deleteMany({ where: { id: { in: createdGroupIds } } });
    await prisma.conversation.deleteMany({ where: { id: { in: createdConversationIds } } });
    await prisma.systemAlert.deleteMany({ where: { type: "notification_group.approval_pending", entity_id: { in: createdGroupIds } } });
    await prisma.productFeedbackAccessAudit.deleteMany({ where: { actor_id: { in: createdUserIds } } });
    await prisma.projectTask.deleteMany({ where: { id: { in: createdTaskIds } } });
    await prisma.projectProduct.deleteMany({ where: { project_id: { in: createdProjectIds } } });
    await prisma.project.deleteMany({ where: { id: { in: createdProjectIds } } });
    await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.adminProfile.deleteMany({ where: { id: { in: createdProfileIds } } });
    await new Promise<void>((res, rej) => server.close((e) => (e ? rej(e) : res())));
    await prisma.$disconnect();
  });

  it("1. Master cria grupo ativo diretamente (já com sala)", async () => {
    const r = await api("/api/notification-groups", {
      method: "POST",
      token: masterToken,
      body: { name: "Grupo do Master", purpose: "coordenação", member_user_ids: [memberA.id] },
    });
    assert.equal(r.status, 201);
    assert.equal(r.json.status, "active");
    assert.ok(r.json.conversation_id, "sala criada junto");
    createdGroupIds.push(r.json.id);
    createdConversationIds.push(r.json.conversation_id);
    const parts = await prisma.chatParticipant.count({ where: { conversation_id: r.json.conversation_id, left_at: null } });
    assert.equal(parts, 2, "master + memberA na sala");
  });

  it("2/10. Líder cria PENDENTE e a solicitação gera exatamente um alerta amarelo", async () => {
    const r = await api("/api/notification-groups/requests", {
      method: "POST",
      token: leaderToken,
      body: { name: "Grupo do Líder", purpose: "acompanhar entregas", member_user_ids: [memberA.id, memberB.id] },
    });
    assert.equal(r.status, 201);
    assert.equal(r.json.status, "pending");
    assert.equal(r.json.conversation_id, null, "sem sala ainda");
    createdGroupIds.push(r.json.id);

    const alerts = await prisma.systemAlert.findMany({
      where: { type: "notification_group.approval_pending", entity_id: r.json.id },
    });
    assert.equal(alerts.length, 1, "exatamente um alerta");
    assert.equal(alerts[0].severity, "warning");
    assert.equal(alerts[0].user_id, null, "Geral — todo admin vê");
    assert.match(alerts[0].message, /Grupo do Líder/);
    assert.match(alerts[0].action_url ?? "", /grupos-notificacao\?review=/);
  });

  it("3. Líder não cria grupo ATIVO direto (POST /) — 403", async () => {
    const r = await api("/api/notification-groups", {
      method: "POST",
      token: leaderToken,
      body: { name: "x", purpose: "y", member_user_ids: [memberA.id] },
    });
    assert.equal(r.status, 403);
  });

  it("4. Líder não inclui usuário fora do escopo — 400 com a lista", async () => {
    const r = await api("/api/notification-groups/requests", {
      method: "POST",
      token: leaderToken,
      body: { name: "Fora do escopo", purpose: "teste", member_user_ids: [memberA.id, outsider.id] },
    });
    assert.equal(r.status, 400);
    assert.deepEqual(r.json.out_of_scope_user_ids, [outsider.id]);
  });

  it("5. Usuário comum não cria nem solicita — 403", async () => {
    const t = tokenFor(memberA);
    assert.equal((await api("/api/notification-groups", { method: "POST", token: t, body: { name: "a", purpose: "b", member_user_ids: [] } })).status, 403);
    assert.equal((await api("/api/notification-groups/requests", { method: "POST", token: t, body: { name: "a", purpose: "bbb", member_user_ids: [leader.id] } })).status, 403);
  });

  it("6/11. Retry/clique duplo não duplica grupo nem alerta", async () => {
    const body = { name: "Grupo idempotente", purpose: "sem duplicar", member_user_ids: [memberA.id] };
    const r1 = await api("/api/notification-groups/requests", { method: "POST", token: leaderToken, body });
    const r2 = await api("/api/notification-groups/requests", { method: "POST", token: leaderToken, body });
    createdGroupIds.push(r1.json.id);
    assert.equal(r2.json.id, r1.json.id, "mesmo grupo devolvido");
    assert.equal(r2.json.deduped, true);
    const groups = await prisma.notificationGroup.count({ where: { requested_by_id: leader.id, name: "Grupo idempotente" } });
    assert.equal(groups, 1);
    const alerts = await prisma.systemAlert.count({ where: { type: "notification_group.approval_pending", entity_id: r1.json.id } });
    assert.equal(alerts, 1);
  });

  it("7. Seletor de membros é paginado e pesquisável, escopado ao líder", async () => {
    const all = await api("/api/notification-groups/eligible-members?page=1&page_size=1", { token: leaderToken });
    assert.equal(all.status, 200);
    assert.equal(all.json.data.length, 1);
    assert.ok(all.json.total >= 2, "líder tem >= 2 pessoas no escopo");
    // outsider nunca aparece
    const search = await api(`/api/notification-groups/eligible-members?q=${encodeURIComponent(outsider.name)}`, { token: leaderToken });
    assert.equal(search.json.data.length, 0);
  });

  it("8/14. Rejeição exige justificativa; não cria sala; resolve o alerta", async () => {
    const req = await api("/api/notification-groups/requests", {
      method: "POST",
      token: leaderToken,
      body: { name: "Para rejeitar", purpose: "motivo", member_user_ids: [memberA.id] },
    });
    createdGroupIds.push(req.json.id);

    const noReason = await api(`/api/notification-groups/${req.json.id}/reject`, { method: "POST", token: masterToken, body: {} });
    assert.equal(noReason.status, 400);

    const ok = await api(`/api/notification-groups/${req.json.id}/reject`, {
      method: "POST",
      token: masterToken,
      body: { reason: "Escopo muito amplo — refaça." },
    });
    assert.equal(ok.status, 200);
    assert.equal(ok.json.status, "rejected");
    assert.equal(ok.json.rejection_reason, "Escopo muito amplo — refaça.");
    assert.equal(ok.json.conversation_id, null);

    const alert = await prisma.systemAlert.findFirst({ where: { entity_id: req.json.id, type: "notification_group.approval_pending" } });
    assert.ok(alert?.manual_resolved_at, "alerta resolvido após decisão");
  });

  it("12/15/17. Aprovação: sala + participantes na MESMA transação, alerta resolvido, auditoria", async () => {
    const req = await api("/api/notification-groups/requests", {
      method: "POST",
      token: leaderToken,
      body: { name: "Para aprovar", purpose: "vamos aprovar", member_user_ids: [memberA.id, memberB.id] },
    });
    createdGroupIds.push(req.json.id);

    const r = await api(`/api/notification-groups/${req.json.id}/approve`, { method: "POST", token: masterToken });
    assert.equal(r.status, 200);
    assert.equal(r.json.status, "active");
    assert.ok(r.json.conversation_id);
    createdConversationIds.push(r.json.conversation_id);

    const parts = await prisma.chatParticipant.findMany({ where: { conversation_id: r.json.conversation_id, left_at: null } });
    assert.equal(parts.length, 3, "líder + 2 membros");

    const alert = await prisma.systemAlert.findFirst({ where: { entity_id: req.json.id, type: "notification_group.approval_pending" } });
    assert.ok(alert?.manual_resolved_at, "alerta resolvido");
    assert.equal(alert?.resolved_by_user_id, master.id);

    const audit = await prisma.productFeedbackAccessAudit.findFirst({
      where: { action: "notification_group.approved", after_json: { contains: req.json.id } },
    });
    assert.ok(audit, "auditoria before/after gravada");
  });

  it("13. Aprovar algo que não é pendente → 409 (grupo não fica ativo sem sala)", async () => {
    const already = await prisma.notificationGroup.findFirst({ where: { name: "Para aprovar", requested_by_id: leader.id } });
    const r = await api(`/api/notification-groups/${already!.id}/approve`, { method: "POST", token: masterToken });
    assert.equal(r.status, 409);
  });

  it("16. Líder vê o resultado e a justificativa; cancela a própria pendente", async () => {
    const list = await api("/api/notification-groups", { token: leaderToken });
    assert.equal(list.json.role, "leader");
    const rejected = list.json.data.find((g: any) => g.name === "Para rejeitar");
    assert.equal(rejected.status, "rejected");
    assert.match(rejected.rejection_reason, /Escopo muito amplo/);

    const pend = await api("/api/notification-groups/requests", {
      method: "POST",
      token: leaderToken,
      body: { name: "Vou cancelar", purpose: "mudei de ideia", member_user_ids: [memberA.id] },
    });
    createdGroupIds.push(pend.json.id);
    const cancel = await api(`/api/notification-groups/${pend.json.id}/cancel`, { method: "POST", token: leaderToken });
    assert.equal(cancel.status, 200);
    assert.equal(cancel.json.status, "archived");
    const alert = await prisma.systemAlert.findFirst({ where: { entity_id: pend.json.id, type: "notification_group.approval_pending" } });
    assert.ok(alert?.manual_resolved_at, "alerta encerrado ao cancelar");
  });

  it("9. Arquivar grupo ativo deixa a sala somente-leitura, sem apagar mensagens", async () => {
    const g = await prisma.notificationGroup.findFirst({ where: { name: "Para aprovar", status: "active" }, select: { id: true, conversation_id: true } });
    // deixa uma mensagem na sala
    await prisma.chatMessage.create({ data: { conversation_id: g!.conversation_id!, sender_id: leader.id, content: "oi equipe" } });
    const r = await api(`/api/notification-groups/${g!.id}/archive`, { method: "PATCH", token: masterToken });
    assert.equal(r.status, 200);
    assert.equal(r.json.status, "archived");
    const conv = await prisma.conversation.findUnique({ where: { id: g!.conversation_id! } });
    assert.equal(conv?.status, "archived");
    const msgs = await prisma.chatMessage.count({ where: { conversation_id: g!.conversation_id! } });
    assert.ok(msgs >= 1, "mensagens preservadas");
  });

  it("segurança: manipular ID não amplia — outro líder não vê/aprova solicitação alheia", async () => {
    const otherLeader = await mkUser({ role: "lider", account_type: "lider" });
    const req = await prisma.notificationGroup.findFirst({ where: { name: "Para rejeitar" } });
    const detail = await api(`/api/notification-groups/${req!.id}`, { token: tokenFor(otherLeader) });
    assert.equal(detail.status, 404);
    const approve = await api(`/api/notification-groups/${req!.id}/approve`, { method: "POST", token: tokenFor(otherLeader) });
    assert.equal(approve.status, 403);
  });
});
