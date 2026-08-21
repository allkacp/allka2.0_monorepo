import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import app from "../app";
import { prisma } from "../lib/prisma";
import { config } from "../config";

// Lote de segurança 2A-2 (continuação da ata 2026-08-20): auditoria
// profunda de PUT/DELETE em saques (financial.ts) e faturas (billing.ts).
// A varredura anterior só olhou a assinatura da rota; este arquivo prova
// com o app real + banco descartável que, antes desta correção, qualquer
// usuário autenticado (sem checagem de papel nenhuma) conseguia excluir OU
// alterar status financeiro — inclusive disparar o crédito/débito real na
// carteira (recordWalletEvent) sem ser admin.

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
  const id = `fin-sec-${crypto.randomBytes(6).toString("hex")}`;
  const user = await prisma.user.create({
    data: {
      id,
      email: `${id}@example.test`,
      password_hash: "unused-test-hash",
      name: `Financial Security Test ${id}`,
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
      name: `perfil-fin-${suffix}-${crypto.randomBytes(4).toString("hex")}`,
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
    data: { name: `Empresa teste ${suffix}-${crypto.randomBytes(3).toString("hex")}` },
  });
  createdCompanyIds.push(company.id);
  return company;
}

async function createNomade() {
  const id = `fin-sec-nomade-${crypto.randomBytes(4).toString("hex")}`;
  const nomade = await prisma.nomade.create({
    data: { name: `Nômade teste ${id}`, email: `${id}@example.test` },
  });
  createdNomadeIds.push(nomade.id);
  return nomade;
}

async function createInvoice(companyId: string, overrides: { status?: string } = {}) {
  const invoice = await prisma.invoice.create({
    data: { company_id: companyId, amount: 500, status: overrides.status ?? "pending" },
  });
  createdInvoiceIds.push(invoice.id);
  return invoice;
}

async function createWithdrawal(nomadeId: string, overrides: { status?: string } = {}) {
  const withdrawal = await prisma.withdrawalRequest.create({
    data: { nomade_id: nomadeId, amount: 300, status: overrides.status ?? "aguardando_analise" },
  });
  createdWithdrawalIds.push(withdrawal.id);
  return withdrawal;
}

describe("segurança financeira profunda — saques e faturas (lote 2A-2, ata 2026-08-20)", () => {
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
    // Ordem importa: User.company_id -> Company e Nomade.user_id -> User
    // não têm onDelete em cascata (Restrict por padrão), então a ordem
    // precisa desfazer as referências de trás pra frente. Banco inteiro é
    // descartável e cai junto no DROP DATABASE final de qualquer forma —
    // isto é só pra não deixar o after() falhar em plena execução.
    await prisma.walletLedger.deleteMany({
      where: { reference_id: { in: [...createdWithdrawalIds, ...createdInvoiceIds] } },
    });
    await prisma.wallet.deleteMany({ where: { owner_id: { in: [...createdNomadeIds, ...createdCompanyIds] } } });
    await prisma.withdrawalRequest.deleteMany({ where: { id: { in: createdWithdrawalIds } } });
    await prisma.invoice.deleteMany({ where: { id: { in: createdInvoiceIds } } });
    await prisma.nomade.deleteMany({ where: { id: { in: createdNomadeIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.company.deleteMany({ where: { id: { in: createdCompanyIds } } });
    await prisma.adminProfile.deleteMany({ where: { id: { in: createdProfileIds } } });
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    await prisma.$disconnect();
  });

  // ─── PUT /api/financial/withdrawals/:id ─────────────────────────────────

  describe("PUT /api/financial/withdrawals/:id — aprovar/rejeitar/cancelar saque", () => {
    it("sem sessão -> 401, registro permanece intocado", async () => {
      const nomade = await createNomade();
      const withdrawal = await createWithdrawal(nomade.id);
      const res = await api(`/api/financial/withdrawals/${withdrawal.id}`, {
        method: "PUT",
        body: { status: "pagamento_efetuado" },
      });
      assert.equal(res.status, 401);
      const after1 = await prisma.withdrawalRequest.findUnique({ where: { id: withdrawal.id } });
      assert.equal(after1?.status, "aguardando_analise");
    });

    it("nômade comum (dono do próprio saque) -> 403, não consegue se autoaprovar", async () => {
      const nomade = await createNomade();
      const user = await createUser({ role: "nomad", account_type: "nomades" });
      const withdrawal = await createWithdrawal(nomade.id);
      const res = await api(`/api/financial/withdrawals/${withdrawal.id}`, {
        method: "PUT",
        token: tokenFor(user),
        body: { status: "pagamento_efetuado" },
      });
      assert.equal(res.status, 403);
      const after1 = await prisma.withdrawalRequest.findUnique({ where: { id: withdrawal.id } });
      assert.equal(after1?.status, "aguardando_analise");
    });

    it("usuário de outra organização (empresa) -> 403, saque de nômade permanece intocado", async () => {
      const nomade = await createNomade();
      const withdrawal = await createWithdrawal(nomade.id);
      const outsider = await createUser({ role: "company_user", account_type: "empresas" });
      const res = await api(`/api/financial/withdrawals/${withdrawal.id}`, {
        method: "PUT",
        token: tokenFor(outsider),
        body: { status: "reprovado" },
      });
      assert.equal(res.status, 403);
      const after1 = await prisma.withdrawalRequest.findUnique({ where: { id: withdrawal.id } });
      assert.equal(after1?.status, "aguardando_analise");
    });

    it("admin com perfil SEM sistema/edit -> 403", async () => {
      const nomade = await createNomade();
      const withdrawal = await createWithdrawal(nomade.id);
      const profile = await createProfile({ permissions: [{ module: "usuarios", action: "edit" }] });
      const admin = await createUser({ role: "admin", account_type: "admin", admin_profile_id: profile.id });
      const res = await api(`/api/financial/withdrawals/${withdrawal.id}`, {
        method: "PUT",
        token: tokenFor(admin),
        body: { status: "pagamento_efetuado" },
      });
      assert.equal(res.status, 403);
    });

    it("admin com sistema/edit -> aprova o saque, debita a carteira do nômade (log de auditoria intacto)", async () => {
      const nomade = await createNomade();
      const withdrawal = await createWithdrawal(nomade.id);
      const profile = await createProfile({ permissions: [{ module: "sistema", action: "edit" }] });
      const admin = await createUser({ role: "admin", account_type: "admin", admin_profile_id: profile.id });
      const res = await api(`/api/financial/withdrawals/${withdrawal.id}`, {
        method: "PUT",
        token: tokenFor(admin),
        body: { status: "pagamento_efetuado" },
      });
      assert.equal(res.status, 200);
      assert.equal(res.json.status, "pagamento_efetuado");

      const ledgerKey = `wd_debit_${withdrawal.id}`;
      const ledger = await prisma.walletLedger.findUnique({ where: { idempotency_key: ledgerKey } });
      assert.ok(ledger, "o débito na carteira do nômade deve ter sido registrado no ledger");
      assert.equal(ledger?.direction, "debit");
      assert.equal(ledger?.amount, 300);
    });

    it("Admin Master -> aprova o saque independente de permissão granular", async () => {
      const nomade = await createNomade();
      const withdrawal = await createWithdrawal(nomade.id);
      const profile = await createProfile({ is_master: true });
      const admin = await createUser({ role: "admin", account_type: "admin", admin_profile_id: profile.id });
      const res = await api(`/api/financial/withdrawals/${withdrawal.id}`, {
        method: "PUT",
        token: tokenFor(admin),
        body: { status: "cancelado" },
      });
      assert.equal(res.status, 200);
      assert.equal(res.json.status, "cancelado");
    });
  });

  // ─── DELETE /api/financial/withdrawals/:id ──────────────────────────────

  describe("DELETE /api/financial/withdrawals/:id", () => {
    it("sem sessão -> 401, registro permanece", async () => {
      const nomade = await createNomade();
      const withdrawal = await createWithdrawal(nomade.id);
      const res = await api(`/api/financial/withdrawals/${withdrawal.id}`, { method: "DELETE" });
      assert.equal(res.status, 401);
      assert.ok(await prisma.withdrawalRequest.findUnique({ where: { id: withdrawal.id } }));
    });

    it("nômade autenticado (mesmo dono) -> 403, registro financeiro não é apagado", async () => {
      const nomade = await createNomade();
      const withdrawal = await createWithdrawal(nomade.id);
      const user = await createUser({ role: "nomad", account_type: "nomades" });
      const res = await api(`/api/financial/withdrawals/${withdrawal.id}`, {
        method: "DELETE",
        token: tokenFor(user),
      });
      assert.equal(res.status, 403);
      assert.ok(await prisma.withdrawalRequest.findUnique({ where: { id: withdrawal.id } }));
    });

    it("admin com sistema/delete -> exclusão funciona", async () => {
      const nomade = await createNomade();
      const withdrawal = await createWithdrawal(nomade.id);
      const profile = await createProfile({ permissions: [{ module: "sistema", action: "delete" }] });
      const admin = await createUser({ role: "admin", account_type: "admin", admin_profile_id: profile.id });
      const res = await api(`/api/financial/withdrawals/${withdrawal.id}`, {
        method: "DELETE",
        token: tokenFor(admin),
      });
      assert.equal(res.status, 204);
      createdWithdrawalIds.splice(createdWithdrawalIds.indexOf(withdrawal.id), 1);
    });
  });

  // ─── PUT /api/billing/invoices/:id ───────────────────────────────────────

  describe("PUT /api/billing/invoices/:id — marcar como paga/cancelada", () => {
    it("sem sessão -> 401, fatura permanece intocada", async () => {
      const company = await createCompany();
      const invoice = await createInvoice(company.id);
      const res = await api(`/api/billing/invoices/${invoice.id}`, {
        method: "PUT",
        body: { status: "paid" },
      });
      assert.equal(res.status, 401);
      const after1 = await prisma.invoice.findUnique({ where: { id: invoice.id } });
      assert.equal(after1?.status, "pending");
    });

    it("usuário da PRÓPRIA empresa dona da fatura -> 403, não consegue se autoaprovar pagamento", async () => {
      const company = await createCompany();
      const invoice = await createInvoice(company.id);
      const user = await createUser({ role: "company_admin", account_type: "empresas", company_id: company.id });
      const res = await api(`/api/billing/invoices/${invoice.id}`, {
        method: "PUT",
        token: tokenFor(user),
        body: { status: "paid" },
      });
      assert.equal(res.status, 403);
      const after1 = await prisma.invoice.findUnique({ where: { id: invoice.id } });
      assert.equal(after1?.status, "pending", "fatura não pode ter sido marcada como paga pelo próprio cliente");
    });

    it("usuário de OUTRA empresa -> 403, isolamento entre organizações preservado", async () => {
      const companyA = await createCompany();
      const companyB = await createCompany();
      const invoiceOfB = await createInvoice(companyB.id);
      const userOfA = await createUser({ role: "company_admin", account_type: "empresas", company_id: companyA.id });
      const res = await api(`/api/billing/invoices/${invoiceOfB.id}`, {
        method: "PUT",
        token: tokenFor(userOfA),
        body: { status: "cancelled" },
      });
      assert.equal(res.status, 403);
      const after1 = await prisma.invoice.findUnique({ where: { id: invoiceOfB.id } });
      assert.equal(after1?.status, "pending");
    });

    it("admin com perfil SEM sistema/edit -> 403", async () => {
      const company = await createCompany();
      const invoice = await createInvoice(company.id);
      const profile = await createProfile({ permissions: [{ module: "usuarios", action: "delete" }] });
      const admin = await createUser({ role: "admin", account_type: "admin", admin_profile_id: profile.id });
      const res = await api(`/api/billing/invoices/${invoice.id}`, {
        method: "PUT",
        token: tokenFor(admin),
        body: { status: "paid" },
      });
      assert.equal(res.status, 403);
    });

    it("admin com sistema/edit -> marca como paga, credita a carteira da empresa (log de auditoria intacto)", async () => {
      const company = await createCompany();
      const invoice = await createInvoice(company.id);
      const profile = await createProfile({ permissions: [{ module: "sistema", action: "edit" }] });
      const admin = await createUser({ role: "admin", account_type: "admin", admin_profile_id: profile.id });
      const res = await api(`/api/billing/invoices/${invoice.id}`, {
        method: "PUT",
        token: tokenFor(admin),
        body: { status: "paid" },
      });
      assert.equal(res.status, 200);
      assert.equal(res.json.status, "paid");

      const ledgerKey = `inv_credit_${invoice.id}`;
      const ledger = await prisma.walletLedger.findUnique({ where: { idempotency_key: ledgerKey } });
      assert.ok(ledger, "o crédito na carteira da empresa deve ter sido registrado no ledger");
      assert.equal(ledger?.direction, "credit");
      assert.equal(ledger?.amount, 500);
    });

    it("Admin Master -> marca como cancelada independente de permissão granular", async () => {
      const company = await createCompany();
      const invoice = await createInvoice(company.id);
      const profile = await createProfile({ is_master: true });
      const admin = await createUser({ role: "admin", account_type: "admin", admin_profile_id: profile.id });
      const res = await api(`/api/billing/invoices/${invoice.id}`, {
        method: "PUT",
        token: tokenFor(admin),
        body: { status: "cancelled" },
      });
      assert.equal(res.status, 200);
      assert.equal(res.json.status, "cancelled");
    });
  });

  // ─── DELETE /api/billing/invoices/:id ────────────────────────────────────

  describe("DELETE /api/billing/invoices/:id", () => {
    it("sem sessão -> 401, fatura permanece", async () => {
      const company = await createCompany();
      const invoice = await createInvoice(company.id);
      const res = await api(`/api/billing/invoices/${invoice.id}`, { method: "DELETE" });
      assert.equal(res.status, 401);
      assert.ok(await prisma.invoice.findUnique({ where: { id: invoice.id } }));
    });

    it("usuário da própria empresa dona da fatura -> 403, fatura não é apagada", async () => {
      const company = await createCompany();
      const invoice = await createInvoice(company.id);
      const user = await createUser({ role: "company_admin", account_type: "empresas", company_id: company.id });
      const res = await api(`/api/billing/invoices/${invoice.id}`, {
        method: "DELETE",
        token: tokenFor(user),
      });
      assert.equal(res.status, 403);
      assert.ok(await prisma.invoice.findUnique({ where: { id: invoice.id } }));
    });

    it("admin com sistema/delete -> exclusão funciona", async () => {
      const company = await createCompany();
      const invoice = await createInvoice(company.id);
      const profile = await createProfile({ permissions: [{ module: "sistema", action: "delete" }] });
      const admin = await createUser({ role: "admin", account_type: "admin", admin_profile_id: profile.id });
      const res = await api(`/api/billing/invoices/${invoice.id}`, {
        method: "DELETE",
        token: tokenFor(admin),
      });
      assert.equal(res.status, 204);
      createdInvoiceIds.splice(createdInvoiceIds.indexOf(invoice.id), 1);
    });
  });

  // ─── Regressão: leitura continua igual (não tocamos GET) ────────────────

  describe("regressão — leitura de saques e faturas continua funcionando", () => {
    it("GET /api/financial/withdrawals continua liberado só com sessão, e nômade só vê os próprios", async () => {
      const nomadeA = await createNomade();
      const nomadeB = await createNomade();
      const withdrawalA = await createWithdrawal(nomadeA.id);
      await createWithdrawal(nomadeB.id);
      const userA = await createUser({ role: "nomad", account_type: "nomades" });
      // Vincula o usuário nômade ao registro Nomade correspondente, do
      // jeito que a rota espera (where: { nomade: { user_id } }).
      await prisma.nomade.update({ where: { id: nomadeA.id }, data: { user_id: userA.id } });

      const res = await api("/api/financial/withdrawals", { token: tokenFor(userA) });
      assert.equal(res.status, 200);
      const ids = (res.json.data as Array<{ id: string }>).map((w) => w.id);
      assert.ok(ids.includes(withdrawalA.id));
      assert.equal(ids.length, 1, "nômade não deve ver saques de outro nômade na listagem");
    });

    it("GET /api/billing/invoices continua liberado só com sessão", async () => {
      const company = await createCompany();
      await createInvoice(company.id);
      const user = await createUser({ role: "company_admin", account_type: "empresas", company_id: company.id });
      const res = await api("/api/billing/invoices", { token: tokenFor(user) });
      assert.equal(res.status, 200);
    });

    it("criação de fatura (POST) continua funcionando para admin autorizado", async () => {
      // Neste lote (2A-2) o POST ainda era aberto a qualquer sessão válida
      // — só precisava de ALGUM admin, por isso o perfil de teste original
      // tinha só "edit". O lote seguinte (2A-3) passou a exigir também
      // "sistema/create" em POST /invoices (mesma falha de controle de
      // acesso na criação, corrigida à parte) — o perfil aqui precisa das
      // duas permissões pra continuar provando "admin autorizado consegue".
      const company = await createCompany();
      const profile = await createProfile({
        permissions: [
          { module: "sistema", action: "edit" },
          { module: "sistema", action: "create" },
        ],
      });
      const admin = await createUser({ role: "admin", account_type: "admin", admin_profile_id: profile.id });
      const res = await api("/api/billing/invoices", {
        method: "POST",
        token: tokenFor(admin),
        body: { company_id: company.id, amount: 100 },
      });
      assert.equal(res.status, 201);
      createdInvoiceIds.push(res.json.id);
    });
  });
});
