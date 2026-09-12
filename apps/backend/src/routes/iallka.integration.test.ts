import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import app from "../app";
import { prisma } from "../lib/prisma";
import { config } from "../config";

// IAllka — correção de acesso (2026-09-11): o backend só permitia Admin
// Master ou Agency; Company via 403 clicando no ícone (bug real reportado).
// Agora: Admin MASTER (nunca admin comum), Agency (que já cobre Partner —
// upgrade da própria Agency, nunca um 4º tipo de conta) e Company. Léder e
// Nômade continuam de fora (não fazem seleção comercial de produto).
//
// Isolamento por DONO da sessão (user_id), nunca por organização — testado
// entre duas contas do MESMO tipo (Company A × B, Agency A × B, Partner ×
// outra Agency) pra provar que o vínculo organizacional novo (usado só na
// hora de aprovar) não abre nenhuma brecha de acesso cruzado.
//
// Nunca chama o turno com IA de verdade (POST /messages, dependeria da API
// do Gemini) — só criação de sessão, leitura, e o gate de aprovação (que
// nunca chega a chamar a IA quando não há proposta pronta).

let baseUrl = "";
let server: import("node:http").Server;

const users: string[] = [];
const agencies: string[] = [];
const companies: string[] = [];
const partnerProfiles: string[] = [];
const sessions: string[] = [];
const projects: string[] = [];

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

type Kind = "admin_master" | "admin_common" | "agencia" | "company" | "partner" | "lider" | "nomade";

async function mkUser(kind: Kind) {
  const id = `iallka-${crypto.randomBytes(6).toString("hex")}`;
  const roleAccountType: Record<Kind, { role: string; account_type: string }> = {
    admin_master: { role: "admin", account_type: "admin" },
    admin_common: { role: "admin", account_type: "admin" },
    agencia: { role: "agencia_user", account_type: "agencias" },
    company: { role: "company_user", account_type: "empresas" },
    partner: { role: "agencia_user", account_type: "agencias" },
    lider: { role: "lider", account_type: "lider" },
    nomade: { role: "nomade", account_type: "nomades" },
  };
  const { role, account_type } = roleAccountType[kind];

  let admin_profile_id: string | undefined;
  if (kind === "admin_master" || kind === "admin_common") {
    const p = await prisma.adminProfile.create({ data: { name: `Perfil ${id}`, is_master: kind === "admin_master", is_active: true } });
    admin_profile_id = p.id;
  }

  let u = await prisma.user.create({
    data: { id, email: `${id}@example.test`, password_hash: "x", name: `U ${id}`, role, account_type, is_active: true, status: "ativo", admin_profile_id },
  });
  users.push(u.id);

  if (kind === "company") {
    const co = await prisma.company.create({ data: { name: `Empresa ${id}` } });
    companies.push(co.id);
    u = await prisma.user.update({ where: { id: u.id }, data: { company_id: co.id } });
  }
  if (kind === "agencia" || kind === "partner") {
    const ag = await prisma.agency.create({ data: { name: `Agência ${id}`, owner_user_id: u.id } });
    agencies.push(ag.id);
    u = await prisma.user.update({ where: { id: u.id }, data: { agency_id: ag.id } });
    if (kind === "partner") {
      const pp = await prisma.partnerProfile.create({ data: { agency_id: ag.id, status: "active" } });
      partnerProfiles.push(pp.id);
    }
  }
  return u;
}

describe("IAllka — nova matriz de acesso (Admin Master, Company, Agency, Partner)", () => {
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
    await prisma.project.deleteMany({ where: { OR: [{ created_by_user_id: { in: users } }, { id: { in: projects } }] } });
    await prisma.partnerProfile.deleteMany({ where: { id: { in: partnerProfiles } } });
    await prisma.user.updateMany({ where: { id: { in: users } }, data: { agency_id: null, company_id: null } });
    await prisma.agency.deleteMany({ where: { id: { in: agencies } } });
    await prisma.company.deleteMany({ where: { id: { in: companies } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await prisma.$disconnect();
  });

  it("sem token → 401", async () => {
    const r = await api("/api/iallka/sessions", { method: "POST" });
    assert.equal(r.status, 401);
  });

  it("1. Admin Master permitido", async () => {
    const u = await mkUser("admin_master");
    const r = await api("/api/iallka/sessions", { method: "POST", token: tokenFor(u) });
    assert.equal(r.status, 201);
    sessions.push(r.json.id);
  });

  it("2. Company permitido (bug corrigido — antes dava 403)", async () => {
    const u = await mkUser("company");
    const r = await api("/api/iallka/sessions", { method: "POST", token: tokenFor(u) });
    assert.equal(r.status, 201);
    sessions.push(r.json.id);
  });

  it("3. Agency permitida", async () => {
    const u = await mkUser("agencia");
    const r = await api("/api/iallka/sessions", { method: "POST", token: tokenFor(u) });
    assert.equal(r.status, 201);
    sessions.push(r.json.id);
  });

  it("4. Partner (Agency com PartnerProfile ativo) permitido pelo mesmo vínculo de Agency", async () => {
    const u = await mkUser("partner");
    const r = await api("/api/iallka/sessions", { method: "POST", token: tokenFor(u) });
    assert.equal(r.status, 201);
    sessions.push(r.json.id);
  });

  it("9. Admin comum continua bloqueado (só Admin Master)", async () => {
    const u = await mkUser("admin_common");
    const r = await api("/api/iallka/sessions", { method: "POST", token: tokenFor(u) });
    assert.equal(r.status, 403);
  });

  it("10. Leader e Nomad continuam bloqueados (não fazem seleção comercial de produto)", async () => {
    const leader = await mkUser("lider");
    const nomade = await mkUser("nomade");
    assert.equal((await api("/api/iallka/sessions", { method: "POST", token: tokenFor(leader) })).status, 403);
    assert.equal((await api("/api/iallka/sessions", { method: "POST", token: tokenFor(nomade) })).status, 403);
  });

  it("5. Company A não lê, nem envia mensagem, nem aprova a sessão de Company B", async () => {
    const companyA = await mkUser("company");
    const companyB = await mkUser("company");
    const created = await api("/api/iallka/sessions", { method: "POST", token: tokenFor(companyA) });
    sessions.push(created.json.id);

    assert.equal((await api(`/api/iallka/sessions/${created.json.id}`, { token: tokenFor(companyB) })).status, 403);
    assert.equal((await api(`/api/iallka/sessions/${created.json.id}/messages`, { method: "POST", token: tokenFor(companyB), body: { message: "oi" } })).status, 403);
    assert.equal((await api(`/api/iallka/sessions/${created.json.id}/approve`, { method: "POST", token: tokenFor(companyB) })).status, 403);
    assert.equal((await api(`/api/iallka/sessions/${created.json.id}`, { token: tokenFor(companyA) })).status, 200);
  });

  it("6. Agency A não acessa sessão de Agency B", async () => {
    const agenciaA = await mkUser("agencia");
    const agenciaB = await mkUser("agencia");
    const created = await api("/api/iallka/sessions", { method: "POST", token: tokenFor(agenciaA) });
    sessions.push(created.json.id);
    assert.equal((await api(`/api/iallka/sessions/${created.json.id}`, { token: tokenFor(agenciaB) })).status, 403);
  });

  it("7. Partner não acessa sessão de outra Agency", async () => {
    const partner = await mkUser("partner");
    const outraAgencia = await mkUser("agencia");
    const created = await api("/api/iallka/sessions", { method: "POST", token: tokenFor(partner) });
    sessions.push(created.json.id);
    assert.equal((await api(`/api/iallka/sessions/${created.json.id}`, { token: tokenFor(outraAgencia) })).status, 403);
  });

  it("Admin Master pode ler qualquer sessão pra suporte — nunca o caminho inverso", async () => {
    const master = await mkUser("admin_master");
    const company = await mkUser("company");
    const created = await api("/api/iallka/sessions", { method: "POST", token: tokenFor(company) });
    sessions.push(created.json.id);
    assert.equal((await api(`/api/iallka/sessions/${created.json.id}`, { token: tokenFor(master) })).status, 200);
  });

  it("11. nenhum projeto criado sem proposta aprovada (Company, Agency e Admin Master)", async () => {
    for (const kind of ["company", "agencia", "admin_master"] as const) {
      const u = await mkUser(kind);
      const created = await api("/api/iallka/sessions", { method: "POST", token: tokenFor(u) });
      sessions.push(created.json.id);
      const projectsBefore = await prisma.project.count();
      const approve = await api(`/api/iallka/sessions/${created.json.id}/approve`, { method: "POST", token: tokenFor(u) });
      assert.equal(approve.status, 400);
      assert.equal(await prisma.project.count(), projectsBefore);
    }
  });

  it("8. Company sem vínculo (company_id nulo) nunca cria projeto solto ao aprovar", async () => {
    // Simula uma conta "empresas" sem company_id (usuário nunca vinculado a
    // uma Company de verdade) — resolveProjectNewScope devolveria kind
    // "none" se chegasse até lá. Sem uma proposta real e contratável (fora
    // do escopo deste bloco simular produto real + assertProductContractable),
    // o gate de "sem proposta pronta" (400) já barra antes — o que importa
    // aqui é a garantia observável: em nenhum caso um projeto é criado.
    const id = `iallka-${crypto.randomBytes(6).toString("hex")}`;
    const u = await prisma.user.create({
      data: { id, email: `${id}@example.test`, password_hash: "x", name: `U ${id}`, role: "company_user", account_type: "empresas", is_active: true, status: "ativo" },
    });
    users.push(u.id);
    const created = await api("/api/iallka/sessions", { method: "POST", token: tokenFor(u) });
    sessions.push(created.json.id);

    const projectsBefore = await prisma.project.count();
    const approve = await api(`/api/iallka/sessions/${created.json.id}/approve`, { method: "POST", token: tokenFor(u) });
    assert.notEqual(approve.status, 201);
    assert.equal(await prisma.project.count(), projectsBefore);
  });

  it("sessão inexistente → 404", async () => {
    const u = await mkUser("company");
    const r = await api("/api/iallka/sessions/nao-existe-123", { token: tokenFor(u) });
    assert.equal(r.status, 404);
  });

  it("8. projeto fora da conta é recusado antes de qualquer chamada de IA (briefing privado nunca vaza pra outra conta)", async () => {
    const companyA = await mkUser("company");
    const companyB = await mkUser("company");
    const created = await api("/api/iallka/sessions", { method: "POST", token: tokenFor(companyA) });
    sessions.push(created.json.id);

    // projeto pertence à Company B (nunca a companyA, que é dona da sessão).
    const project = await prisma.project.create({
      data: {
        title: "Projeto fora da conta",
        project_code: `proj-fora-${crypto.randomBytes(4).toString("hex")}`,
        status: "draft",
        lifecycle: "avulso",
        company_id: (await prisma.user.findUnique({ where: { id: companyB.id }, select: { company_id: true } }))!.company_id,
      },
    });
    projects.push(project.id);

    const r = await api(`/api/iallka/sessions/${created.json.id}/messages`, {
      method: "POST",
      token: tokenFor(companyA),
      body: { message: "me ajude com este projeto", project_id: project.id },
    });
    assert.equal(r.status, 403);
  });
});
