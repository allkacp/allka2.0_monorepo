import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import app from "../app";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import { isOnline, onlineUserIds } from "../lib/presence-service";

// Presença online mínima e segura (ata 2026-08, bloco 4/5).

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
  return { status: res.status, json: await res.json().catch(() => null) };
}

const createdUserIds: string[] = [];
async function mkUser(over: Partial<{ is_active: boolean }> = {}) {
  const id = `pres-${crypto.randomBytes(6).toString("hex")}`;
  const u = await prisma.user.create({
    data: { id, email: `${id}@example.test`, password_hash: "x", name: `Pres ${id}`, role: "nomad", account_type: "nomades", is_active: over.is_active ?? true, status: "ativo" },
  });
  createdUserIds.push(u.id);
  return u;
}

describe("Presença online", () => {
  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    const l = app.listen(0);
    server = l;
    await new Promise<void>((r) => l.once("listening", () => r()));
    baseUrl = `http://127.0.0.1:${(l.address() as AddressInfo).port}`;
  });
  after(async () => {
    await prisma.userPresence.deleteMany({ where: { user_id: { in: createdUserIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await new Promise<void>((res, rej) => server.close((e) => (e ? rej(e) : res())));
    await prisma.$disconnect();
  });

  it("heartbeat marca o usuário como online; GET /me reflete", async () => {
    const u = await mkUser();
    const hb = await api("/api/presence/heartbeat", { method: "POST", token: tokenFor(u) });
    assert.equal(hb.status, 200);
    assert.equal(hb.json.heartbeat_ms, config.PRESENCE_HEARTBEAT_MS);
    const me = await api("/api/presence/me", { token: tokenFor(u) });
    assert.equal(me.json.online, true);
    assert.ok(me.json.last_seen_at);
  });

  it("expiração: last_seen_at fora da janela → offline", async () => {
    const u = await mkUser();
    const old = new Date(Date.now() - config.PRESENCE_OFFLINE_AFTER_MS - 60_000);
    await prisma.userPresence.create({ data: { user_id: u.id, last_seen_at: old } });
    assert.equal(isOnline(old), false);
    const online = await onlineUserIds(prisma, [u.id]);
    assert.equal(online.has(u.id), false);
    const me = await api("/api/presence/me", { token: tokenFor(u) });
    assert.equal(me.json.online, false);
  });

  it("isolamento: uma conta não atualiza a presença de outra (identidade só da sessão)", async () => {
    const a = await mkUser();
    const b = await mkUser();
    // 'a' bate o heartbeat mandando o id de 'b' no corpo — deve ser ignorado.
    await api("/api/presence/heartbeat", { method: "POST", token: tokenFor(a), body: { user_id: b.id } });
    const bPresence = await prisma.userPresence.findUnique({ where: { user_id: b.id } });
    assert.equal(bPresence, null, "'b' não ficou online por causa do heartbeat de 'a'");
    const aPresence = await prisma.userPresence.findUnique({ where: { user_id: a.id } });
    assert.ok(aPresence, "'a' ficou online (a própria sessão)");
  });

  it("conta inativa nunca fica online — heartbeat responde 403 e limpa presença", async () => {
    const u = await mkUser();
    await api("/api/presence/heartbeat", { method: "POST", token: tokenFor(u) }); // online
    await prisma.user.update({ where: { id: u.id }, data: { is_active: false } });
    const hb = await api("/api/presence/heartbeat", { method: "POST", token: tokenFor(u) });
    assert.equal(hb.status, 403);
    const p = await prisma.userPresence.findUnique({ where: { user_id: u.id } });
    assert.equal(p, null, "presença apagada");
    const online = await onlineUserIds(prisma, [u.id]);
    assert.equal(online.has(u.id), false);
  });

  it("logout (/offline) encerra a presença imediatamente", async () => {
    const u = await mkUser();
    await api("/api/presence/heartbeat", { method: "POST", token: tokenFor(u) });
    const off = await api("/api/presence/offline", { method: "POST", token: tokenFor(u) });
    assert.equal(off.status, 200);
    const me = await api("/api/presence/me", { token: tokenFor(u) });
    assert.equal(me.json.online, false);
  });

  it("sem sessão → 401", async () => {
    assert.equal((await api("/api/presence/heartbeat", { method: "POST" })).status, 401);
  });
});
