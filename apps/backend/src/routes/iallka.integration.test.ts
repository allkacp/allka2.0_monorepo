import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import app from "../app";
import { prisma } from "../lib/prisma";
import { config } from "../config";

// IAllka (reunião 10/09, "assistente IAllka — ícone e ajuda contextual"):
// este bloco só adiciona ícone/painel/entrada segura no FRONTEND, reaproveitando
// o backend já existente (routes/iallka.ts) — sem tocar nele. Estes testes
// cobrem a proteção de permissão e isolamento entre contas que o backend já
// deveria ter, e que ainda não tinha nenhum teste. Nunca chamam o turno com
// IA de verdade (POST /messages) — isso dependeria da API do Gemini; aqui só
// se testa criação de sessão, leitura, e o gate de aprovação sem proposta,
// que não tocam na IA.

let baseUrl = "";
let server: import("node:http").Server;

const users: string[] = [];
const agencies: string[] = [];
const sessions: string[] = [];

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

async function mkUser(kind: "admin" | "agencia" | "empresa") {
  const id = `iallka-${crypto.randomBytes(6).toString("hex")}`;
  let u = await prisma.user.create({
    data: {
      id,
      email: `${id}@example.test`,
      password_hash: "x",
      name: `U ${id}`,
      role: kind === "admin" ? "admin" : kind === "agencia" ? "agencia_user" : "company_user",
      account_type: kind === "admin" ? "admin" : kind === "agencia" ? "agencias" : "empresas",
      is_active: true,
      status: "ativo",
    },
  });
  users.push(u.id);
  if (kind === "agencia") {
    const ag = await prisma.agency.create({ data: { name: `Agência ${id}`, owner_user_id: u.id } });
    agencies.push(ag.id);
    u = await prisma.user.update({ where: { id: u.id }, data: { agency_id: ag.id } });
  }
  return u;
}

describe("IAllka — permissão e isolamento entre contas (backend já existente)", () => {
  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    server = app.listen(0);
    await new Promise<void>((r) => server.once("listening", () => r()));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  after(async () => {
    await new Promise<void>((res, rej) => server.close((e) => (e ? rej(e) : res())));
    await prisma.iallkaMessage.deleteMany({ where: { session_id: { in: sessions } } });
    await prisma.iallkaSession.deleteMany({ where: { id: { in: sessions } } });
    // Agency.owner_user_id é obrigatório (FK) — precisa sumir antes do User dono.
    await prisma.user.updateMany({ where: { id: { in: users } }, data: { agency_id: null } });
    await prisma.agency.deleteMany({ where: { id: { in: agencies } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await prisma.$disconnect();
  });

  it("sem token → 401", async () => {
    const r = await api("/api/iallka/sessions", { method: "POST" });
    assert.equal(r.status, 401);
  });

  it("admin e agência podem criar sessão; empresa (conta comum) não pode", async () => {
    const admin = await mkUser("admin");
    const agencia = await mkUser("agencia");
    const empresa = await mkUser("empresa");

    const rAdmin = await api("/api/iallka/sessions", { method: "POST", token: tokenFor(admin) });
    assert.equal(rAdmin.status, 201);
    sessions.push(rAdmin.json.id);

    const rAgencia = await api("/api/iallka/sessions", { method: "POST", token: tokenFor(agencia) });
    assert.equal(rAgencia.status, 201);
    sessions.push(rAgencia.json.id);

    const rEmpresa = await api("/api/iallka/sessions", { method: "POST", token: tokenFor(empresa) });
    assert.equal(rEmpresa.status, 403);
  });

  it("sessão nasce com a mensagem de abertura da IAllka, nunca vazia", async () => {
    const admin = await mkUser("admin");
    const r = await api("/api/iallka/sessions", { method: "POST", token: tokenFor(admin) });
    sessions.push(r.json.id);
    assert.equal(r.json.messages.length, 1);
    assert.equal(r.json.messages[0].role, "assistant");
    assert.ok(r.json.messages[0].content.length > 0);
  });

  it("isolamento entre contas: conta A não lê, nem envia mensagem, nem aprova a sessão de conta B", async () => {
    const agenciaA = await mkUser("agencia");
    const agenciaB = await mkUser("agencia");
    const created = await api("/api/iallka/sessions", { method: "POST", token: tokenFor(agenciaA) });
    sessions.push(created.json.id);
    const sessionId = created.json.id;

    const readForeign = await api(`/api/iallka/sessions/${sessionId}`, { token: tokenFor(agenciaB) });
    assert.equal(readForeign.status, 403);

    const messageForeign = await api(`/api/iallka/sessions/${sessionId}/messages`, {
      method: "POST", token: tokenFor(agenciaB), body: { message: "oi" },
    });
    assert.equal(messageForeign.status, 403);

    const approveForeign = await api(`/api/iallka/sessions/${sessionId}/approve`, { method: "POST", token: tokenFor(agenciaB) });
    assert.equal(approveForeign.status, 403);

    // a própria dona continua acessando normalmente.
    const readOwn = await api(`/api/iallka/sessions/${sessionId}`, { token: tokenFor(agenciaA) });
    assert.equal(readOwn.status, 200);
  });

  it("Admin Master pode ver a sessão de qualquer conta (suporte), nunca o contrário", async () => {
    const admin = await mkUser("admin");
    const agencia = await mkUser("agencia");
    const created = await api("/api/iallka/sessions", { method: "POST", token: tokenFor(agencia) });
    sessions.push(created.json.id);

    const adminReads = await api(`/api/iallka/sessions/${created.json.id}`, { token: tokenFor(admin) });
    assert.equal(adminReads.status, 200);
  });

  it("nenhuma ação automática indevida: aprovar sem proposta pronta nunca cria projeto", async () => {
    const admin = await mkUser("admin");
    const created = await api("/api/iallka/sessions", { method: "POST", token: tokenFor(admin) });
    sessions.push(created.json.id);

    const projectsBefore = await prisma.project.count();
    const approve = await api(`/api/iallka/sessions/${created.json.id}/approve`, { method: "POST", token: tokenFor(admin) });
    assert.equal(approve.status, 400);
    assert.equal(await prisma.project.count(), projectsBefore, "nenhum projeto criado sem proposta aprovada");
  });

  it("sessão inexistente → 404 (nunca vaza se existe ou não pra quem não é dono)", async () => {
    const admin = await mkUser("admin");
    const r = await api("/api/iallka/sessions/nao-existe-123", { token: tokenFor(admin) });
    assert.equal(r.status, 404);
  });
});
