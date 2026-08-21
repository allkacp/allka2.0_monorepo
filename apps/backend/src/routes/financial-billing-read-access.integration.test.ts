import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import app from "../app";
import { prisma } from "../lib/prisma";
import { config } from "../config";

// Lote de segurança 2A-3 (continuação da ata 2026-08-20): controle de
// acesso de LEITURA e CRIAÇÃO de saques (financial.ts) e faturas
// (billing.ts) — não mexe em PUT/DELETE, já corrigidos no lote anterior.
//
// Confirmado por leitura de código antes de qualquer alteração:
// - GET /api/billing/invoices era chamado de verdade, sem filtro nenhum,
//   por apps/frontend/contexts/agencia-context.tsx — todo usuário de
//   agência baixava, no carregamento normal da tela, as faturas de TODAS
//   as empresas da plataforma (não é um teórico "e se alguém trocar o
//   parâmetro" — o app já fazia essa chamada sozinho).
// - GET /api/financial/withdrawals só tinha escopo pra role nomad/nomad_admin;
//   qualquer outra sessão válida (empresa, agência) recebia a lista
//   inteira de saques (nome, e-mail, chave PIX, valor) de todos os nômades.
// - POST em ambas as rotas aceitava nomade_id/company_id direto do corpo,
//   sem checar se pertencia a quem fez a requisição.

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
const createdCompanyIds: string[] = [];
const createdNomadeIds: string[] = [];
const createdInvoiceIds: string[] = [];
const createdWithdrawalIds: string[] = [];

async function createUser(overrides: Partial<{
  role: string;
  account_type: string;
  admin_profile_id: string | null;
  company_id: string | null;
}> = {}) {
  const id = `fin-ra-${crypto.randomBytes(6).toString("hex")}`;
  const user = await prisma.user.create({
    data: {
      id,
      email: `${id}@example.test`,
      password_hash: "unused-test-hash",
      name: `Read Access Test ${id}`,
      role: overrides.role ?? "company_user",
      account_type: overrides.account_type ?? "empresas",
      is_active: true,
      status: "ativo",
      admin_profile_id: overrides.admin_profile_id ?? null,
      company_id: overrides.company_id ?? null,
    },
  });
  createdUserIds.push(user.id);
  return user;
}

async function createProfile(overrides: {
  is_master?: boolean;
  permissions?: { module: string; action: string }[];
}) {
  const profile = await prisma.adminProfile.create({
    data: {
      name: `perfil-ra-${suffix}-${crypto.randomBytes(4).toString("hex")}`,
      is_master: overrides.is_master ?? false,
      is_active: true,
      permissions: overrides.permissions
        ? { create: overrides.permissions.map((p) => ({ module: p.module, action: p.action })) }
        : undefined,
    },
  });
  createdProfileIds.push(profile.id);
  return profile;
}

async function createCompany() {
  const company = await prisma.company.create({
    data: { name: `Empresa RA teste ${suffix}-${crypto.randomBytes(3).toString("hex")}` },
  });
  createdCompanyIds.push(company.id);
  return company;
}

async function createNomade(userId?: string) {
  const id = `fin-ra-nomade-${crypto.randomBytes(4).toString("hex")}`;
  const nomade = await prisma.nomade.create({
    data: { name: `Nômade RA teste ${id}`, email: `${id}@example.test`, user_id: userId ?? undefined },
  });
  createdNomadeIds.push(nomade.id);
  return nomade;
}

async function createInvoice(companyId: string) {
  const invoice = await prisma.invoice.create({ data: { company_id: companyId, amount: 500, status: "pending" } });
  createdInvoiceIds.push(invoice.id);
  return invoice;
}

async function createWithdrawal(nomadeId: string) {
  const withdrawal = await prisma.withdrawalRequest.create({
    data: { nomade_id: nomadeId, amount: 300, status: "aguardando_analise" },
  });
  createdWithdrawalIds.push(withdrawal.id);
  return withdrawal;
}

describe("controle de acesso de leitura/criação — saques e faturas (lote 2A-3, ata 2026-08-20)", () => {
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
    await prisma.withdrawalRequest.deleteMany({ where: { id: { in: createdWithdrawalIds } } });
    await prisma.invoice.deleteMany({ where: { id: { in: createdInvoiceIds } } });
    await prisma.nomade.deleteMany({ where: { id: { in: createdNomadeIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.company.deleteMany({ where: { id: { in: createdCompanyIds } } });
    await prisma.adminProfile.deleteMany({ where: { id: { in: createdProfileIds } } });
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    await prisma.$disconnect();
  });

  // ─── GET /api/financial/withdrawals (lista) ──────────────────────────────

  describe("GET /api/financial/withdrawals — leitura", () => {
    it("sem sessão -> 401", async () => {
      const res = await api("/api/financial/withdrawals");
      assert.equal(res.status, 401);
    });

    it("nômade só vê o próprio saque, mesmo pedindo ?nomade_id de outro", async () => {
      const userA = await createUser({ role: "nomad", account_type: "nomades" });
      const nomadeA = await createNomade(userA.id);
      const nomadeB = await createNomade();
      const withdrawalA = await createWithdrawal(nomadeA.id);
      const withdrawalB = await createWithdrawal(nomadeB.id);

      const res = await api(`/api/financial/withdrawals?nomade_id=${nomadeB.id}`, { token: tokenFor(userA) });
      assert.equal(res.status, 200);
      const ids = (res.json.data as Array<{ id: string }>).map((w) => w.id);
      assert.ok(!ids.includes(withdrawalB.id), "não pode ver saque de outro nômade");
      assert.equal(res.json.total, ids.length, "total deve bater com o que é retornado (sem contar ocultos)");

      // Sem o filtro malicioso de nomade_id, o mesmo usuário deve ver o
      // próprio saque normalmente — prova que o escopo por dono continua
      // funcionando pro caso legítimo, não só bloqueando o abuso.
      const legit = await api("/api/financial/withdrawals", { token: tokenFor(userA) });
      assert.ok((legit.json.data as Array<{ id: string }>).some((w) => w.id === withdrawalA.id));
    });

    it("empresa/agência autenticada -> lista vazia (não erro), sem vazar saques de nômades", async () => {
      const company = await createCompany();
      const user = await createUser({ role: "company_admin", account_type: "empresas", company_id: company.id });
      const nomade = await createNomade();
      await createWithdrawal(nomade.id);

      const res = await api("/api/financial/withdrawals", { token: tokenFor(user) });
      assert.equal(res.status, 200);
      assert.deepEqual(res.json.data, []);
      assert.equal(res.json.total, 0);
    });

    it("admin continua vendo todos os saques (comportamento da tela admin/financeiro preservado)", async () => {
      const profile = await createProfile({ is_master: true });
      const admin = await createUser({ role: "admin", account_type: "admin", admin_profile_id: profile.id });
      const nomade = await createNomade();
      const withdrawal = await createWithdrawal(nomade.id);

      const res = await api("/api/financial/withdrawals", { token: tokenFor(admin) });
      assert.equal(res.status, 200);
      const ids = (res.json.data as Array<{ id: string }>).map((w) => w.id);
      assert.ok(ids.includes(withdrawal.id));
    });
  });

  // ─── GET /api/financial/withdrawals/:id (detalhe) ───────────────────────

  describe("GET /api/financial/withdrawals/:id — detalhe", () => {
    it("sem sessão -> 401", async () => {
      const nomade = await createNomade();
      const withdrawal = await createWithdrawal(nomade.id);
      const res = await api(`/api/financial/withdrawals/${withdrawal.id}`);
      assert.equal(res.status, 401);
    });

    it("dono (nômade) consegue ver o próprio saque", async () => {
      const user = await createUser({ role: "nomad", account_type: "nomades" });
      const nomade = await createNomade(user.id);
      const withdrawal = await createWithdrawal(nomade.id);
      const res = await api(`/api/financial/withdrawals/${withdrawal.id}`, { token: tokenFor(user) });
      assert.equal(res.status, 200);
      assert.equal(res.json.id, withdrawal.id);
    });

    it("outro nômade -> 404 (não confirma existência)", async () => {
      const owner = await createNomade();
      const withdrawal = await createWithdrawal(owner.id);
      const otherUser = await createUser({ role: "nomad", account_type: "nomades" });
      await createNomade(otherUser.id);
      const res = await api(`/api/financial/withdrawals/${withdrawal.id}`, { token: tokenFor(otherUser) });
      assert.equal(res.status, 404);
    });

    it("empresa autenticada -> 404", async () => {
      const owner = await createNomade();
      const withdrawal = await createWithdrawal(owner.id);
      const user = await createUser({ role: "company_user", account_type: "empresas" });
      const res = await api(`/api/financial/withdrawals/${withdrawal.id}`, { token: tokenFor(user) });
      assert.equal(res.status, 404);
    });

    it("admin -> vê qualquer saque", async () => {
      const owner = await createNomade();
      const withdrawal = await createWithdrawal(owner.id);
      const profile = await createProfile({ is_master: true });
      const admin = await createUser({ role: "admin", account_type: "admin", admin_profile_id: profile.id });
      const res = await api(`/api/financial/withdrawals/${withdrawal.id}`, { token: tokenFor(admin) });
      assert.equal(res.status, 200);
    });
  });

  // ─── POST /api/financial/withdrawals (criação) ──────────────────────────

  describe("POST /api/financial/withdrawals — criação", () => {
    it("sem sessão -> 401", async () => {
      const res = await api("/api/financial/withdrawals", { method: "POST", body: { amount: 100 } });
      assert.equal(res.status, 401);
    });

    it("nômade cria saque só pra si — nomade_id do corpo é ignorado", async () => {
      const user = await createUser({ role: "nomad", account_type: "nomades" });
      const own = await createNomade(user.id);
      const outroNomade = await createNomade(); // conta de terceiro, id válido de verdade

      const res = await api("/api/financial/withdrawals", {
        method: "POST",
        token: tokenFor(user),
        body: { nomade_id: outroNomade.id, amount: 150 }, // tenta usar o id de outra pessoa
      });
      assert.equal(res.status, 201);
      createdWithdrawalIds.push(res.json.id);
      assert.equal(res.json.nomade.id, own.id, "o saque deve ter sido criado em nome do próprio nômade, não do id enviado");

      const inThirdPartyName = await prisma.withdrawalRequest.findFirst({ where: { nomade_id: outroNomade.id } });
      assert.equal(inThirdPartyName, null, "nenhum saque deve ter sido criado em nome do terceiro");
    });

    it("nômade sem cadastro de Nomade vinculado -> 403, nada criado", async () => {
      const user = await createUser({ role: "nomad", account_type: "nomades" }); // sem Nomade.user_id apontando pra ele
      const marker = `sem-vinculo-${crypto.randomBytes(4).toString("hex")}`;
      const res = await api("/api/financial/withdrawals", {
        method: "POST",
        token: tokenFor(user),
        // nomade_id continua exigido pelo schema de validação (createSchema)
        // mesmo pro fluxo de nômade — na prática é ignorado/sobrescrito
        // pela sessão (ver POST em financial.ts); o valor aqui só precisa
        // existir pra passar o validate() e chegar na checagem real.
        body: { nomade_id: marker, amount: 100 },
      });
      assert.equal(res.status, 403);
      assert.equal(await prisma.withdrawalRequest.count({ where: { nomade_id: marker } }), 0);
    });

    it("empresa/agência -> 403, nada criado", async () => {
      const user = await createUser({ role: "company_user", account_type: "empresas" });
      const nomade = await createNomade();
      const res = await api("/api/financial/withdrawals", {
        method: "POST",
        token: tokenFor(user),
        body: { nomade_id: nomade.id, amount: 100 },
      });
      assert.equal(res.status, 403);
      // Contagem por nomade_id (não global) — outras suítes rodando no
      // mesmo banco descartável podem criar saques concorrentemente.
      assert.equal(await prisma.withdrawalRequest.count({ where: { nomade_id: nomade.id } }), 0);
    });

    it("admin SEM sistema/create -> 403, nada criado", async () => {
      const nomade = await createNomade();
      const profile = await createProfile({ permissions: [{ module: "sistema", action: "edit" }] });
      const admin = await createUser({ role: "admin", account_type: "admin", admin_profile_id: profile.id });
      const res = await api("/api/financial/withdrawals", {
        method: "POST",
        token: tokenFor(admin),
        body: { nomade_id: nomade.id, amount: 100 },
      });
      assert.equal(res.status, 403);
      assert.equal(await prisma.withdrawalRequest.count({ where: { nomade_id: nomade.id } }), 0);
    });

    it("admin com sistema/create -> cria em nome do nômade informado (uso legítimo administrativo)", async () => {
      const nomade = await createNomade();
      const profile = await createProfile({ permissions: [{ module: "sistema", action: "create" }] });
      const admin = await createUser({ role: "admin", account_type: "admin", admin_profile_id: profile.id });
      const res = await api("/api/financial/withdrawals", {
        method: "POST",
        token: tokenFor(admin),
        body: { nomade_id: nomade.id, amount: 100 },
      });
      assert.equal(res.status, 201);
      assert.equal(res.json.nomade.id, nomade.id);
      createdWithdrawalIds.push(res.json.id);
    });
  });

  // ─── GET /api/billing/invoices (lista) ───────────────────────────────────

  describe("GET /api/billing/invoices — leitura", () => {
    it("sem sessão -> 401", async () => {
      const res = await api("/api/billing/invoices");
      assert.equal(res.status, 401);
    });

    it("empresa só vê as próprias faturas, mesmo pedindo ?company_id de outra empresa real", async () => {
      const companyA = await createCompany();
      const companyB = await createCompany();
      const userA = await createUser({ role: "company_admin", account_type: "empresas", company_id: companyA.id });
      const invoiceA = await createInvoice(companyA.id);
      const invoiceB = await createInvoice(companyB.id);

      const res = await api(`/api/billing/invoices?company_id=${companyB.id}`, { token: tokenFor(userA) });
      assert.equal(res.status, 200);
      const ids = (res.json.data as Array<{ id: string }>).map((i) => i.id);
      assert.ok(!ids.includes(invoiceB.id), "não pode ver fatura de outra empresa mesmo pedindo o company_id dela");
      assert.equal(res.json.total, ids.length);

      // Sem o parâmetro malicioso, a mesma empresa deve continuar vendo a
      // própria fatura normalmente.
      const legit = await api("/api/billing/invoices", { token: tokenFor(userA) });
      assert.ok((legit.json.data as Array<{ id: string }>).some((i) => i.id === invoiceA.id));
    });

    it("agência autenticada -> lista vazia, sem vazar faturas de empresa nenhuma (bug real do contexto de agência corrigido)", async () => {
      const company = await createCompany();
      await createInvoice(company.id);
      const agencyUser = await createUser({ role: "agency_user", account_type: "agencias" });

      const res = await api("/api/billing/invoices", { token: tokenFor(agencyUser) });
      assert.equal(res.status, 200);
      assert.deepEqual(res.json.data, []);
      assert.equal(res.json.total, 0);
    });

    it("admin continua vendo todas as faturas, com filtro por company_id funcionando normalmente", async () => {
      const company = await createCompany();
      const invoice = await createInvoice(company.id);
      const profile = await createProfile({ is_master: true });
      const admin = await createUser({ role: "admin", account_type: "admin", admin_profile_id: profile.id });

      const all = await api("/api/billing/invoices", { token: tokenFor(admin) });
      assert.equal(all.status, 200);
      assert.ok((all.json.data as Array<{ id: string }>).some((i) => i.id === invoice.id));

      const filtered = await api(`/api/billing/invoices?company_id=${company.id}`, { token: tokenFor(admin) });
      assert.equal(filtered.status, 200);
      assert.ok((filtered.json.data as Array<{ id: string }>).every((i: any) => i.company.id === company.id));
    });
  });

  // ─── GET /api/billing/invoices/:id (detalhe) ─────────────────────────────

  describe("GET /api/billing/invoices/:id — detalhe", () => {
    it("sem sessão -> 401", async () => {
      const company = await createCompany();
      const invoice = await createInvoice(company.id);
      const res = await api(`/api/billing/invoices/${invoice.id}`);
      assert.equal(res.status, 401);
    });

    it("empresa dona -> vê a própria fatura", async () => {
      const company = await createCompany();
      const invoice = await createInvoice(company.id);
      const user = await createUser({ role: "company_admin", account_type: "empresas", company_id: company.id });
      const res = await api(`/api/billing/invoices/${invoice.id}`, { token: tokenFor(user) });
      assert.equal(res.status, 200);
      assert.equal(res.json.id, invoice.id);
    });

    it("empresa de outra organização -> 404 (não confirma existência)", async () => {
      const companyB = await createCompany();
      const invoiceOfB = await createInvoice(companyB.id);
      const companyA = await createCompany();
      const userOfA = await createUser({ role: "company_admin", account_type: "empresas", company_id: companyA.id });
      const res = await api(`/api/billing/invoices/${invoiceOfB.id}`, { token: tokenFor(userOfA) });
      assert.equal(res.status, 404);
    });

    it("agência autenticada -> 404", async () => {
      const company = await createCompany();
      const invoice = await createInvoice(company.id);
      const agencyUser = await createUser({ role: "agency_user", account_type: "agencias" });
      const res = await api(`/api/billing/invoices/${invoice.id}`, { token: tokenFor(agencyUser) });
      assert.equal(res.status, 404);
    });

    it("admin -> vê qualquer fatura", async () => {
      const company = await createCompany();
      const invoice = await createInvoice(company.id);
      const profile = await createProfile({ is_master: true });
      const admin = await createUser({ role: "admin", account_type: "admin", admin_profile_id: profile.id });
      const res = await api(`/api/billing/invoices/${invoice.id}`, { token: tokenFor(admin) });
      assert.equal(res.status, 200);
    });
  });

  // ─── POST /api/billing/invoices (criação) ────────────────────────────────

  describe("POST /api/billing/invoices — criação", () => {
    it("sem sessão -> 401", async () => {
      const res = await api("/api/billing/invoices", { method: "POST", body: { amount: 100 } });
      assert.equal(res.status, 401);
    });

    it("empresa não consegue criar fatura nem pra si mesma, nada é criado", async () => {
      const company = await createCompany();
      const user = await createUser({ role: "company_admin", account_type: "empresas", company_id: company.id });
      const res = await api("/api/billing/invoices", {
        method: "POST",
        token: tokenFor(user),
        body: { company_id: company.id, amount: 100 },
      });
      assert.equal(res.status, 403);
      // Contagem por company_id (não global) — outras suítes rodando no
      // mesmo banco descartável podem criar faturas concorrentemente.
      assert.equal(await prisma.invoice.count({ where: { company_id: company.id } }), 0);
    });

    it("empresa tentando criar fatura em nome de OUTRA empresa (id válido de terceiro) -> 403, nada criado", async () => {
      const companyA = await createCompany();
      const companyB = await createCompany();
      const userOfA = await createUser({ role: "company_admin", account_type: "empresas", company_id: companyA.id });
      const res = await api("/api/billing/invoices", {
        method: "POST",
        token: tokenFor(userOfA),
        body: { company_id: companyB.id, amount: 999 },
      });
      assert.equal(res.status, 403);
      assert.equal(await prisma.invoice.count({ where: { company_id: companyB.id } }), 0);
    });

    it("admin SEM sistema/create -> 403, nada criado", async () => {
      const company = await createCompany();
      const profile = await createProfile({ permissions: [{ module: "sistema", action: "edit" }] });
      const admin = await createUser({ role: "admin", account_type: "admin", admin_profile_id: profile.id });
      const res = await api("/api/billing/invoices", {
        method: "POST",
        token: tokenFor(admin),
        body: { company_id: company.id, amount: 100 },
      });
      assert.equal(res.status, 403);
      assert.equal(await prisma.invoice.count({ where: { company_id: company.id } }), 0);
    });

    it("admin com sistema/create -> cria fatura normalmente (uso legítimo, tela admin/financeiro preservada)", async () => {
      const company = await createCompany();
      const profile = await createProfile({ permissions: [{ module: "sistema", action: "create" }] });
      const admin = await createUser({ role: "admin", account_type: "admin", admin_profile_id: profile.id });
      const res = await api("/api/billing/invoices", {
        method: "POST",
        token: tokenFor(admin),
        body: { company_id: company.id, amount: 250 },
      });
      assert.equal(res.status, 201);
      assert.equal(res.json.company.id, company.id);
      createdInvoiceIds.push(res.json.id);
    });
  });
});
