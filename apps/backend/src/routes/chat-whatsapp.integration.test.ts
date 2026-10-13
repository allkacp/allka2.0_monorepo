import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import crypto from "node:crypto";
import fs from "node:fs";
import jwt from "jsonwebtoken";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import app from "../app";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import { uploadedFilePath } from "../lib/file-storage";
import { DEFAULT_CHAT_SETTINGS, extensionAllowed, mergeChatSettings, withinWindow } from "../lib/chat-settings";

// Chat estilo WhatsApp Web (2026-10-12): configurações do Admin Master,
// responder, editar, apagar para todos, anexos (foto, documento, áudio) e
// confirmação de leitura. Roda num banco descartável:
//   TEST_DATABASE_URL=mysql://…/allka_test npx tsx scripts/run-db-tests.ts src/routes/chat-whatsapp.integration.test.ts
// As configurações do chat são uma linha global — este arquivo deve rodar
// sozinho (como os demais scripts test:*), não em paralelo com outro arquivo.

let baseUrl = "";
let server: import("node:http").Server;

type U = { id: string; email: string; role: string; account_type: string };

function tokenFor(u: U) {
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

async function upload(roomId: string, token: string, file: { bytes: Uint8Array | string; name: string; type: string }, fields: Record<string, string>) {
  const fd = new FormData();
  const part = typeof file.bytes === "string" ? file.bytes : new Uint8Array(file.bytes);
  fd.append("file", new Blob([part], { type: file.type }), file.name);
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  const res = await fetch(`${baseUrl}/api/chat/conversations/${roomId}/attachments`, { method: "POST", headers: { authorization: `Bearer ${token}` }, body: fd });
  return { status: res.status, json: await res.json().catch(() => null) };
}

// PNG 1×1 transparente
const PNG = Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64"));

const createdUserIds: string[] = [];
const createdConvIds: string[] = [];
const createdProfileIds: string[] = [];

async function mkUser(kind: "empresa" | "admin" | "master" | "nomade" = "empresa") {
  const id = `cw-${crypto.randomBytes(6).toString("hex")}`;
  let admin_profile_id: string | undefined;
  if (kind === "master") {
    const p = await prisma.adminProfile.create({ data: { name: `Chat master ${id}`, is_master: true, is_active: true } });
    createdProfileIds.push(p.id);
    admin_profile_id = p.id;
  }
  const isAdmin = kind === "admin" || kind === "master";
  const u = await prisma.user.create({
    data: {
      id,
      email: `${id}@example.test`,
      password_hash: "x",
      name: `Chat ${kind} ${id}`,
      role: isAdmin ? "admin" : kind === "nomade" ? "nomad" : "company_user",
      account_type: isAdmin ? "admin" : kind === "nomade" ? "nomades" : "empresas",
      is_active: true,
      status: "ativo",
      ...(admin_profile_id ? { admin_profile_id } : {}),
    },
  });
  createdUserIds.push(u.id);
  return u as unknown as U;
}

async function mkRoom(participantIds: string[], opts: { status?: string } = {}) {
  const conv = await prisma.conversation.create({
    data: {
      type: "group",
      status: opts.status ?? "active",
      title: "Sala WhatsApp",
      participants: { create: participantIds.map((uid) => ({ user_id: uid, role: "member" })) },
    },
  });
  createdConvIds.push(conv.id);
  return conv;
}

async function setSettings(patch: Partial<typeof DEFAULT_CHAT_SETTINGS>) {
  const r = await api("/api/chat/settings", { method: "PUT", token: tokenFor(master), body: { settings: { ...DEFAULT_CHAT_SETTINGS, ...patch } } });
  assert.equal(r.status, 200, JSON.stringify(r.json));
}

let a: U;
let b: U;
let outsider: U;
let admin: U;
let master: U;

describe("Chat estilo WhatsApp Web", () => {
  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    const listener = app.listen(0);
    server = listener;
    await new Promise<void>((r) => listener.once("listening", () => r()));
    baseUrl = `http://127.0.0.1:${(listener.address() as AddressInfo).port}`;
    a = await mkUser();
    b = await mkUser();
    outsider = await mkUser("nomade");
    admin = await mkUser("admin");
    master = await mkUser("master");
  });

  beforeEach(async () => {
    await prisma.platformChatSettings.deleteMany({});
  });

  after(async () => {
    await prisma.platformChatSettings.deleteMany({});
    await prisma.chatMessage.deleteMany({ where: { conversation_id: { in: createdConvIds } } });
    await prisma.chatParticipant.deleteMany({ where: { conversation_id: { in: createdConvIds } } });
    await prisma.conversation.deleteMany({ where: { id: { in: createdConvIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.adminProfile.deleteMany({ where: { id: { in: createdProfileIds } } });
    for (const id of createdConvIds) fs.rmSync(uploadedFilePath("chat", id), { recursive: true, force: true });
    await new Promise<void>((res, rej) => server.close((e) => (e ? rej(e) : res())));
    await prisma.$disconnect();
  });

  it("configurações: campo inválido volta ao padrão; prazo 0 = sem limite; extensão confere", () => {
    const s = mergeChatSettings({ allow_audio: false, max_audio_seconds: 5, compact_width: 999, extra: 1 });
    assert.equal(s.allow_audio, false);
    assert.equal(s.max_audio_seconds, DEFAULT_CHAT_SETTINGS.max_audio_seconds);
    assert.equal(s.compact_width, DEFAULT_CHAT_SETTINGS.compact_width);
    assert.equal("extra" in s, false);
    assert.equal(withinWindow(new Date(Date.now() - 10 * 86400_000), 0), true);
    assert.equal(withinWindow(new Date(Date.now() - 20 * 60_000), 15), false);
    assert.equal(extensionAllowed(DEFAULT_CHAT_SETTINGS, "Proposta.PDF"), true);
    assert.equal(extensionAllowed(DEFAULT_CHAT_SETTINGS, "script.exe"), false);
    assert.equal(extensionAllowed(DEFAULT_CHAT_SETTINGS, "pdf"), false);
  });

  it("só o Admin Master grava as configurações; os outros leem", async () => {
    const read = await api("/api/chat/settings", { token: tokenFor(a) });
    assert.equal(read.status, 200);
    assert.equal(read.json.can_manage, false);
    assert.equal(read.json.can_use, true);
    assert.equal(read.json.settings.allow_audio, true);

    for (const who of [a, admin]) {
      const r = await api("/api/chat/settings", { method: "PUT", token: tokenFor(who), body: { settings: { ...DEFAULT_CHAT_SETTINGS, allow_audio: false } } });
      assert.equal(r.status, 403);
    }
    const bad = await api("/api/chat/settings", { method: "PUT", token: tokenFor(master), body: { settings: { ...DEFAULT_CHAT_SETTINGS, max_file_mb: 500 } } });
    assert.equal(bad.status, 400);

    await setSettings({ allow_audio: false, compact_width: 420 });
    const after = await api("/api/chat/settings", { token: tokenFor(master) });
    assert.equal(after.json.can_manage, true);
    assert.equal(after.json.settings.allow_audio, false);
    assert.equal(after.json.settings.compact_width, 420);
  });

  it("chat desligado ou perfil fora da lista: 403 chat_disabled; a administração continua entrando", async () => {
    await setSettings({ enabled: false });
    const off = await api("/api/chat/conversations", { token: tokenFor(a) });
    assert.equal(off.status, 403);
    assert.equal(off.json.code, "chat_disabled");
    assert.equal((await api("/api/chat/settings", { token: tokenFor(a) })).json.can_use, false);
    assert.equal((await api("/api/chat/conversations", { token: tokenFor(admin) })).status, 200);

    await setSettings({ allowed_profiles: ["admin", "agencias"] });
    assert.equal((await api("/api/chat/conversations", { token: tokenFor(a) })).status, 403);
    assert.equal((await api("/api/chat/conversations", { token: tokenFor(outsider) })).status, 403);
  });

  it("responder: a citação vem junto; citar mensagem de outra sala é recusado", async () => {
    const room = await mkRoom([a.id, b.id]);
    const other = await mkRoom([a.id, outsider.id]);
    const orig = await api(`/api/chat/conversations/${room.id}/messages`, { method: "POST", token: tokenFor(b), body: { content: "Pode ser quinta?" } });
    const reply = await api(`/api/chat/conversations/${room.id}/messages`, { method: "POST", token: tokenFor(a), body: { content: "Pode!", reply_to_id: orig.json.id } });
    assert.equal(reply.status, 201);
    assert.equal(reply.json.reply_to.id, orig.json.id);
    assert.equal(reply.json.reply_to.content, "Pode ser quinta?");

    const foreign = await api(`/api/chat/conversations/${other.id}/messages`, { method: "POST", token: tokenFor(a), body: { content: "x", reply_to_id: orig.json.id } });
    assert.equal(foreign.status, 400);

    await setSettings({ allow_reply: false });
    const blocked = await api(`/api/chat/conversations/${room.id}/messages`, { method: "POST", token: tokenFor(a), body: { content: "y", reply_to_id: orig.json.id } });
    assert.equal(blocked.status, 400);
  });

  it("limite de caracteres das configurações vale no envio", async () => {
    const room = await mkRoom([a.id, b.id]);
    await setSettings({ max_message_chars: 100 });
    const long = await api(`/api/chat/conversations/${room.id}/messages`, { method: "POST", token: tokenFor(a), body: { content: "x".repeat(150) } });
    assert.equal(long.status, 400);
  });

  it("editar: só quem enviou, só texto, dentro do prazo; marca editada", async () => {
    const room = await mkRoom([a.id, b.id]);
    const m = await api(`/api/chat/conversations/${room.id}/messages`, { method: "POST", token: tokenFor(a), body: { content: "versão 1" } });
    const edited = await api(`/api/chat/messages/${m.json.id}`, { method: "PATCH", token: tokenFor(a), body: { content: "versão 2" } });
    assert.equal(edited.status, 200);
    assert.equal(edited.json.content, "versão 2");
    assert.ok(edited.json.edited_at);

    assert.equal((await api(`/api/chat/messages/${m.json.id}`, { method: "PATCH", token: tokenFor(b), body: { content: "hack" } })).status, 403);
    assert.equal((await api(`/api/chat/messages/${m.json.id}`, { method: "PATCH", token: tokenFor(outsider), body: { content: "hack" } })).status, 404);

    await prisma.chatMessage.update({ where: { id: m.json.id }, data: { created_at: new Date(Date.now() - 60 * 60_000) } });
    assert.equal((await api(`/api/chat/messages/${m.json.id}`, { method: "PATCH", token: tokenFor(a), body: { content: "tarde" } })).status, 403);

    await setSettings({ edit_window_minutes: 0 });
    assert.equal((await api(`/api/chat/messages/${m.json.id}`, { method: "PATCH", token: tokenFor(a), body: { content: "sem prazo" } })).status, 200);
    await setSettings({ allow_edit: false });
    assert.equal((await api(`/api/chat/messages/${m.json.id}`, { method: "PATCH", token: tokenFor(a), body: { content: "desligado" } })).status, 403);
  });

  it("foto: envia, só participante baixa, apagar para todos tira do disco", async () => {
    const room = await mkRoom([a.id, b.id]);
    const sent = await upload(room.id, tokenFor(a), { bytes: PNG, name: "pixel.png", type: "image/png" }, { kind: "image", caption: "olha" });
    assert.equal(sent.status, 201, JSON.stringify(sent.json));
    assert.equal(sent.json.type, "image");
    assert.equal(sent.json.content, "olha");
    assert.equal(sent.json.attachment.name, "pixel.png");

    const res = await fetch(`${baseUrl}/api/chat/messages/${sent.json.id}/attachment`, { headers: { authorization: `Bearer ${tokenFor(b)}` } });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("content-type"), "image/png");
    assert.equal(res.headers.get("x-content-type-options"), "nosniff");
    assert.equal(Buffer.from(await res.arrayBuffer()).length, PNG.length);

    const stranger = await fetch(`${baseUrl}/api/chat/messages/${sent.json.id}/attachment`, { headers: { authorization: `Bearer ${tokenFor(outsider)}` } });
    assert.equal(stranger.status, 404);

    const row = await prisma.chatMessage.findUnique({ where: { id: sent.json.id } });
    const onDisk = uploadedFilePath(`chat/${room.id}`, row!.attachment_file!);
    assert.equal(fs.existsSync(onDisk), true);

    const del = await api(`/api/chat/messages/${sent.json.id}`, { method: "DELETE", token: tokenFor(a) });
    assert.equal(del.status, 200);
    assert.ok(del.json.deleted_at);
    assert.equal(del.json.content, "");
    assert.equal(del.json.attachment, null);
    assert.equal(fs.existsSync(onDisk), false);

    const list = await api(`/api/chat/conversations/${room.id}/messages`, { token: tokenFor(b) });
    const shown = list.json.data.find((x: any) => x.id === sent.json.id);
    assert.ok(shown.deleted_at);
    assert.equal(shown.content, "");
    const rooms = await api("/api/chat/conversations", { token: tokenFor(b) });
    assert.equal(rooms.json.data.find((r: any) => r.id === room.id).last_message.deleted, true);
  });

  it("documento: extensão fora da lista é recusada; tipo perigoso baixa como binário", async () => {
    const room = await mkRoom([a.id, b.id]);
    const exe = await upload(room.id, tokenFor(a), { bytes: "MZ", name: "setup.exe", type: "application/octet-stream" }, { kind: "file" });
    assert.equal(exe.status, 400);

    const disguised = await upload(room.id, tokenFor(a), { bytes: "<script>alert(1)</script>", name: "relatorio.pdf", type: "text/html" }, { kind: "file" });
    assert.equal(disguised.status, 201);
    const res = await fetch(`${baseUrl}/api/chat/messages/${disguised.json.id}/attachment`, { headers: { authorization: `Bearer ${tokenFor(b)}` } });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("content-type"), "application/octet-stream");
    assert.match(res.headers.get("content-disposition") ?? "", /^attachment/);

    await setSettings({ allow_files: false });
    const off = await upload(room.id, tokenFor(a), { bytes: "%PDF", name: "a.pdf", type: "application/pdf" }, { kind: "file" });
    assert.equal(off.status, 403);
  });

  it("áudio: respeita liberar/limite de duração; imagem com tipo errado é recusada", async () => {
    const room = await mkRoom([a.id, b.id]);
    const ok = await upload(room.id, tokenFor(a), { bytes: "OggS", name: "audio.webm", type: "audio/webm" }, { kind: "audio", duration_sec: "12" });
    assert.equal(ok.status, 201);
    assert.equal(ok.json.attachment.duration_sec, 12);

    await setSettings({ max_audio_seconds: 30 });
    const long = await upload(room.id, tokenFor(a), { bytes: "OggS", name: "audio.webm", type: "audio/webm" }, { kind: "audio", duration_sec: "90" });
    assert.equal(long.status, 400);

    await setSettings({ allow_audio: false });
    const off = await upload(room.id, tokenFor(a), { bytes: "OggS", name: "audio.webm", type: "audio/webm" }, { kind: "audio", duration_sec: "5" });
    assert.equal(off.status, 403);

    const fakeImage = await upload(room.id, tokenFor(a), { bytes: "<svg/>", name: "x.svg", type: "image/svg+xml" }, { kind: "image" });
    assert.equal(fakeImage.status, 400);
  });

  it("anexo em sala arquivada ou de quem não participa é recusado", async () => {
    const archived = await mkRoom([a.id, b.id], { status: "archived" });
    assert.equal((await upload(archived.id, tokenFor(a), { bytes: PNG, name: "p.png", type: "image/png" }, { kind: "image" })).status, 403);
    const room = await mkRoom([a.id, b.id]);
    assert.equal((await upload(room.id, tokenFor(outsider), { bytes: PNG, name: "p.png", type: "image/png" }, { kind: "image" })).status, 404);
  });

  it("confirmação de leitura: read_all_until só quando todos leram e se estiver ligada", async () => {
    const room = await mkRoom([a.id, b.id]);
    await api(`/api/chat/conversations/${room.id}/messages`, { method: "POST", token: tokenFor(a), body: { content: "leu?" } });
    let msgs = await api(`/api/chat/conversations/${room.id}/messages`, { token: tokenFor(a) });
    assert.equal(msgs.json.read_all_until, null);
    await api(`/api/chat/conversations/${room.id}/read`, { method: "POST", token: tokenFor(b) });
    msgs = await api(`/api/chat/conversations/${room.id}/messages`, { token: tokenFor(a) });
    assert.ok(msgs.json.read_all_until);
    await setSettings({ show_read_receipts: false });
    msgs = await api(`/api/chat/conversations/${room.id}/messages`, { token: tokenFor(a) });
    assert.equal(msgs.json.read_all_until, null);
  });

  it("contatos: quem não é admin vê a administração e quem já conversa; desligado não começa conversa", async () => {
    const stranger = await mkUser("nomade");
    await mkRoom([a.id, b.id]);
    const list = await api("/api/chat/contacts", { token: tokenFor(a) });
    assert.equal(list.status, 200);
    const ids = list.json.data.map((u: any) => u.id);
    assert.ok(ids.includes(b.id));
    assert.ok(ids.includes(admin.id));
    assert.ok(!ids.includes(stranger.id), "não vê a base inteira de usuários");
    assert.ok(list.json.data.every((u: any) => u.email === undefined), "e-mail só para a administração");

    const adminList = await api(`/api/chat/contacts?q=${encodeURIComponent(stranger.id)}`, { token: tokenFor(admin) });
    assert.ok(adminList.json.data.some((u: any) => u.id === stranger.id));

    await setSettings({ allow_new_conversations: false });
    assert.deepEqual((await api("/api/chat/contacts", { token: tokenFor(a) })).json.data, []);
    const create = await api("/api/chat/conversations", { method: "POST", token: tokenFor(a), body: { type: "direct", participant_ids: [admin.id] } });
    assert.equal(create.status, 403);
    const adminCreate = await api("/api/chat/conversations", { method: "POST", token: tokenFor(admin), body: { type: "direct", participant_ids: [stranger.id] } });
    assert.ok([200, 201].includes(adminCreate.status), JSON.stringify(adminCreate.json));
    if (adminCreate.json?.id) createdConvIds.push(adminCreate.json.id);
  });
});
