import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import app from "../app";
import { prisma } from "../lib/prisma";
import { config } from "../config";

// Chat interno restaurado (ata 2026-08, bloco 3/5). Só participante ativo
// acessa; sala arquivada é somente leitura; usuário inativo não envia;
// mensagem idempotente (client_message_id); não lidas por participante.

let baseUrl = "";
let server: import("node:http").Server;

function tokenFor(u: { id: string; email: string; role: string; account_type: string }) {
  return jwt.sign({ id: u.id, email: u.email, role: u.role, account_type: u.account_type }, config.JWT_SECRET, { expiresIn: "1h" });
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
const createdConvIds: string[] = [];

async function mkUser(over: Partial<{ is_active: boolean }> = {}) {
  const id = `chat-${crypto.randomBytes(6).toString("hex")}`;
  const u = await prisma.user.create({
    data: { id, email: `${id}@example.test`, password_hash: "x", name: `Chat ${id}`, role: "company_user", account_type: "empresas", is_active: over.is_active ?? true, status: "ativo" },
  });
  createdUserIds.push(u.id);
  return u;
}

async function mkRoom(participantIds: string[], opts: { status?: string; type?: string } = {}) {
  const conv = await prisma.conversation.create({
    data: {
      type: opts.type ?? "group",
      status: opts.status ?? "active",
      title: "Sala de teste",
      participants: { create: participantIds.map((uid) => ({ user_id: uid, role: "member" })) },
    },
  });
  createdConvIds.push(conv.id);
  return conv;
}

let a: Awaited<ReturnType<typeof mkUser>>;
let b: Awaited<ReturnType<typeof mkUser>>;
let c: Awaited<ReturnType<typeof mkUser>>;
let inactive: Awaited<ReturnType<typeof mkUser>>;

describe("Chat interno", () => {
  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    const listener = app.listen(0);
    server = listener;
    await new Promise<void>((r) => listener.once("listening", () => r()));
    baseUrl = `http://127.0.0.1:${(listener.address() as AddressInfo).port}`;
    a = await mkUser();
    b = await mkUser();
    c = await mkUser();
    inactive = await mkUser({ is_active: false });
  });

  after(async () => {
    await prisma.chatMessage.deleteMany({ where: { conversation_id: { in: createdConvIds } } });
    await prisma.chatParticipant.deleteMany({ where: { conversation_id: { in: createdConvIds } } });
    await prisma.conversation.deleteMany({ where: { id: { in: createdConvIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await new Promise<void>((res, rej) => server.close((e) => (e ? rej(e) : res())));
    await prisma.$disconnect();
  });

  it("18. participante lista e abre a sala", async () => {
    const room = await mkRoom([a.id, b.id]);
    const list = await api("/api/chat/conversations", { token: tokenFor(a) });
    assert.equal(list.status, 200);
    assert.ok(list.json.data.some((r: any) => r.id === room.id));
    const detail = await api(`/api/chat/conversations/${room.id}`, { token: tokenFor(a) });
    assert.equal(detail.status, 200);
    assert.equal(detail.json.participants.length, 2);
  });

  it("19/29. não participante recebe 404 seguro — trocar o id na URL não entra", async () => {
    const room = await mkRoom([a.id, b.id]);
    for (const path of [`/api/chat/conversations/${room.id}`, `/api/chat/conversations/${room.id}/messages`]) {
      const r = await api(path, { token: tokenFor(c) });
      assert.equal(r.status, 404, path);
    }
    const send = await api(`/api/chat/conversations/${room.id}/messages`, { method: "POST", token: tokenFor(c), body: { content: "invasão" } });
    assert.equal(send.status, 404);
  });

  it("20/21. envia mensagem; clique duplo com o MESMO client_message_id não duplica", async () => {
    const room = await mkRoom([a.id, b.id]);
    const cid = `cli-${crypto.randomBytes(6).toString("hex")}`;
    const r1 = await api(`/api/chat/conversations/${room.id}/messages`, { method: "POST", token: tokenFor(a), body: { content: "olá", client_message_id: cid } });
    assert.equal(r1.status, 201);
    const r2 = await api(`/api/chat/conversations/${room.id}/messages`, { method: "POST", token: tokenFor(a), body: { content: "olá", client_message_id: cid } });
    assert.equal(r2.status, 200);
    assert.equal(r2.json.deduped, true);
    const count = await prisma.chatMessage.count({ where: { conversation_id: room.id } });
    assert.equal(count, 1);
  });

  it("22/23. marca leitura zera as não lidas do participante", async () => {
    const room = await mkRoom([a.id, b.id]);
    await api(`/api/chat/conversations/${room.id}/messages`, { method: "POST", token: tokenFor(b), body: { content: "m1" } });
    await api(`/api/chat/conversations/${room.id}/messages`, { method: "POST", token: tokenFor(b), body: { content: "m2" } });
    let list = await api("/api/chat/conversations", { token: tokenFor(a) });
    assert.equal(list.json.data.find((r: any) => r.id === room.id).unread_count, 2);
    const unread = await api("/api/chat/unread-count", { token: tokenFor(a) });
    assert.ok(unread.json.count >= 2);
    await api(`/api/chat/conversations/${room.id}/read`, { method: "POST", token: tokenFor(a) });
    list = await api("/api/chat/conversations", { token: tokenFor(a) });
    assert.equal(list.json.data.find((r: any) => r.id === room.id).unread_count, 0);
  });

  it("25/27. sala arquivada é somente leitura — POST 403, mensagens preservadas", async () => {
    const room = await mkRoom([a.id, b.id]);
    await prisma.chatMessage.create({ data: { conversation_id: room.id, sender_id: a.id, content: "antiga" } });
    await prisma.conversation.update({ where: { id: room.id }, data: { status: "archived", archived_at: new Date() } });
    const send = await api(`/api/chat/conversations/${room.id}/messages`, { method: "POST", token: tokenFor(a), body: { content: "nova" } });
    assert.equal(send.status, 403);
    const msgs = await api(`/api/chat/conversations/${room.id}/messages`, { token: tokenFor(a) });
    assert.equal(msgs.status, 200);
    assert.equal(msgs.json.read_only, true);
    assert.equal(msgs.json.data.length, 1, "mensagem antiga preservada");
  });

  it("26. participante removido do grupo perde acesso futuro; histórico permanece", async () => {
    const room = await mkRoom([a.id, b.id]);
    await api(`/api/chat/conversations/${room.id}/messages`, { method: "POST", token: tokenFor(b), body: { content: "antes de sair" } });
    // remove b da sala (sync do grupo)
    await prisma.chatParticipant.update({
      where: { conversation_id_user_id: { conversation_id: room.id, user_id: b.id } },
      data: { left_at: new Date() },
    });
    const list = await api("/api/chat/conversations", { token: tokenFor(b) });
    assert.ok(!list.json.data.some((r: any) => r.id === room.id), "sala some da lista de quem saiu");
    const send = await api(`/api/chat/conversations/${room.id}/messages`, { method: "POST", token: tokenFor(b), body: { content: "depois de sair" } });
    assert.equal(send.status, 404);
    const msgs = await prisma.chatMessage.count({ where: { conversation_id: room.id } });
    assert.equal(msgs, 1, "mensagem dele continua no histórico");
  });

  it("31. usuário inativo não envia mensagem — 403", async () => {
    const room = await mkRoom([a.id, inactive.id]);
    const r = await api(`/api/chat/conversations/${room.id}/messages`, { method: "POST", token: tokenFor(inactive), body: { content: "estou inativo" } });
    assert.equal(r.status, 403);
  });

  it("33. isolamento entre duas salas — mensagem de uma não vaza para a outra", async () => {
    const room1 = await mkRoom([a.id, b.id]);
    const room2 = await mkRoom([a.id, c.id]);
    await api(`/api/chat/conversations/${room1.id}/messages`, { method: "POST", token: tokenFor(a), body: { content: "segredo do room1" } });
    const m2 = await api(`/api/chat/conversations/${room2.id}/messages`, { token: tokenFor(a) });
    assert.equal(m2.json.data.length, 0);
    const cFromRoom1 = await api(`/api/chat/conversations/${room1.id}/messages`, { token: tokenFor(c) });
    assert.equal(cFromRoom1.status, 404, "c não participa do room1");
  });

  it("30. Conversa direta 1:1 é reusada (não duplica por retry)", async () => {
    const r1 = await api("/api/chat/conversations", { method: "POST", token: tokenFor(a), body: { type: "direct", participant_ids: [b.id] } });
    assert.equal(r1.status, 201);
    createdConvIds.push(r1.json.id);
    const r2 = await api("/api/chat/conversations", { method: "POST", token: tokenFor(a), body: { type: "direct", participant_ids: [b.id] } });
    assert.equal(r2.status, 200);
    assert.equal(r2.json.id, r1.json.id);
    assert.equal(r2.json.reused, true);
  });
});
