import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import app from "../app";
import { prisma } from "../lib/prisma";
import { config } from "../config";

// Lote "ações destrutivas de conta" (ata 2026-08-25) — audita e corrige:
//   - PUT /api/users/:id, que não tinha NENHUMA checagem de autorização
//     (qualquer conta autenticada, de qualquer account_type, conseguia
//     desativar/promover qualquer outro usuário, incluindo se
//     auto-escalar pra admin via role/admin_profile_id);
//   - DELETE /api/users/:id, que apagava fisicamente sem proteção contra
//     "último Admin Master", sem checagem de "Admin comum excluindo Admin
//     Master", e sem mensagem amigável quando o usuário é dono de uma
//     Agency/Company (violação de FK crua virando 500);
//   - DELETE /api/permissions/profiles/:id, que não olhava se o perfil
//     ainda tinha usuários vinculados antes de apagar (o que na prática
//     escala privilégio: User.admin_profile_id -> SetNull faz esses
//     usuários caírem na regra do avô = acesso irrestrito).
// Mesma estratégia dos lotes anteriores: app real, servidor HTTP local,
// banco descartável, chamadas reais via fetch — não mocks de autorização.

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
const createdAgencyIds: string[] = [];

async function createUser(overrides: Partial<{
  role: string;
  account_type: string;
  admin_profile_id: string | null;
  agency_id: string | null;
  company_id: string | null;
  is_active: boolean;
  password: string;
}> = {}) {
  const id = `uas-${crypto.randomBytes(6).toString("hex")}`;
  const password = overrides.password ?? "senha-teste-123";
  const user = await prisma.user.create({
    data: {
      id,
      email: `${id}@example.test`,
      password_hash: await bcrypt.hash(password, 4),
      name: `User Account Security Test ${id}`,
      role: overrides.role ?? "company_user",
      account_type: overrides.account_type ?? "empresas",
      is_active: overrides.is_active ?? true,
      status: (overrides.is_active ?? true) ? "ativo" : "inativo",
      admin_profile_id: overrides.admin_profile_id ?? null,
      agency_id: overrides.agency_id ?? null,
      company_id: overrides.company_id ?? null,
    },
  });
  createdUserIds.push(user.id);
  return { ...user, plainPassword: password };
}

async function createProfile(overrides: {
  is_master?: boolean;
  permissions?: { module: string; action: string }[];
}) {
  const profile = await prisma.adminProfile.create({
    data: {
      name: `perfil-uas-${suffix}-${crypto.randomBytes(4).toString("hex")}`,
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

async function createCompanyOwnedBy(ownerUserId: string) {
  const code = `co_uas_${suffix}_${crypto.randomBytes(3).toString("hex")}`;
  const company = await prisma.company.create({
    data: { name: `Empresa teste ${code}`, owner_user_id: ownerUserId },
  });
  createdCompanyIds.push(company.id);
  return company;
}

async function createAgencyOwnedBy(ownerUserId: string) {
  const code = `ag_uas_${suffix}_${crypto.randomBytes(3).toString("hex")}`;
  const agency = await prisma.agency.create({
    data: { name: `Agência teste ${code}`, owner_user_id: ownerUserId },
  });
  createdAgencyIds.push(agency.id);
  return agency;
}

// Perfil com todas as permissões de admin usadas nestes testes — evita
// depender do "sem perfil = acesso total" grandfather na maioria dos casos
// (só os testes que testam explicitamente o grandfather usam admin sem
// perfil), o que deixa cada teste mais claro sobre o que está garantindo.
// Testes de "último responsável" precisam que o BANCO TODO não tenha
// nenhum outro admin master/grandfathered ativo além do que o teste está
// criando — mas os testes deste arquivo rodam contra o mesmo banco
// descartável e não se limpam entre si, então masters criados por testes
// anteriores (ex.: os de "Admin Master consegue...") continuariam ativos e
// mascarariam o bloqueio (a contagem encontraria "sobra" e liberaria a
// ação). Neutraliza (desativa direto via Prisma, sem passar pela API) todo
// admin responsável já existente antes de montar o cenário de "só resta
// um".
async function neutralizeOtherResponsibleAdmins(excludeId?: string) {
  const admins = await prisma.user.findMany({
    where: { role: "admin", is_active: true, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true, admin_profile: { select: { is_master: true, is_active: true } } },
  });
  const responsibleIds = admins
    .filter((a) => !a.admin_profile || !a.admin_profile.is_active || a.admin_profile.is_master)
    .map((a) => a.id);
  if (responsibleIds.length > 0) {
    await prisma.user.updateMany({ where: { id: { in: responsibleIds } }, data: { is_active: false } });
  }
}

async function createFullAdmin(overrides: { is_master?: boolean; extra?: { module: string; action: string }[] } = {}) {
  const profile = await createProfile({
    is_master: overrides.is_master ?? false,
    permissions: [
      { module: "usuarios", action: "view" },
      { module: "usuarios", action: "edit" },
      { module: "usuarios", action: "delete" },
      { module: "sistema", action: "delete" },
      ...(overrides.extra ?? []),
    ],
  });
  const user = await createUser({ role: "admin", account_type: "admin", admin_profile_id: profile.id });
  return { user, profile };
}

describe("segurança de ações destrutivas de conta (ata 2026-08-25)", () => {
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
    await prisma.company.deleteMany({ where: { id: { in: createdCompanyIds } } });
    await prisma.agency.deleteMany({ where: { id: { in: createdAgencyIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.adminProfile.deleteMany({ where: { id: { in: createdProfileIds } } });
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    await prisma.$disconnect();
  });

  describe("PUT /api/users/:id — buraco de autorização corrigido", () => {
    it("1. sem token retorna 401", async () => {
      const res = await api("/api/users/whatever-id", { method: "PUT", body: { is_active: false } });
      assert.equal(res.status, 401);
    });

    it("2. usuário admin sem a permissão 'usuarios:edit' recebe 403", async () => {
      const profile = await createProfile({ permissions: [{ module: "outraCoisa", action: "view" }] });
      const admin = await createUser({ role: "admin", account_type: "admin", admin_profile_id: profile.id });
      const target = await createUser();

      const res = await api(`/api/users/${target.id}`, {
        method: "PUT",
        token: tokenFor(admin),
        body: { is_active: false },
      });
      assert.equal(res.status, 403);
    });

    it("3. conta não-admin (ex.: company_user) NÃO consegue mais chamar este endpoint — a vulnerabilidade de auto-escalada está fechada", async () => {
      const attacker = await createUser({ role: "company_user", account_type: "empresas" });

      // Tentativa de auto-promoção: um usuário comum tentando virar admin.
      const res = await api(`/api/users/${attacker.id}`, {
        method: "PUT",
        token: tokenFor(attacker),
        body: { role: "admin", admin_profile_id: null },
      });
      assert.equal(res.status, 403);

      const row = await prisma.user.findUnique({ where: { id: attacker.id } });
      assert.equal(row?.role, "company_user", "a auto-escalada não deveria ter funcionado");
    });

    it("4. admin autorizado consegue editar/desativar um usuário comum normalmente", async () => {
      const { user: admin } = await createFullAdmin();
      const target = await createUser();

      const res = await api(`/api/users/${target.id}`, {
        method: "PUT",
        token: tokenFor(admin),
        body: { is_active: false },
      });
      assert.equal(res.status, 200);
      assert.equal(res.json.is_active, false);
    });

    it("5. Admin Master consegue desativar um Admin comum", async () => {
      const { user: master } = await createFullAdmin({ is_master: true });
      const { user: commonAdmin } = await createFullAdmin();

      const res = await api(`/api/users/${commonAdmin.id}`, {
        method: "PUT",
        token: tokenFor(master),
        body: { is_active: false },
      });
      assert.equal(res.status, 200);
    });

    it("6. Admin comum NÃO consegue desativar um Admin Master (403), e o Master permanece intacto", async () => {
      // Garante que existe outro Master ativo, senão o bloqueio seria pela
      // regra de "último responsável" (409), não pela de autoridade (403) —
      // este teste quer isolar especificamente a checagem de autoridade.
      await createFullAdmin({ is_master: true });
      const { user: master } = await createFullAdmin({ is_master: true });
      const { user: commonAdmin } = await createFullAdmin();

      const res = await api(`/api/users/${master.id}`, {
        method: "PUT",
        token: tokenFor(commonAdmin),
        body: { is_active: false },
      });
      assert.equal(res.status, 403);

      const row = await prisma.user.findUnique({ where: { id: master.id } });
      assert.equal(row?.is_active, true);
    });

    it("7. não desativa o último Admin Master responsável do sistema (409), e nada muda", async () => {
      await neutralizeOtherResponsibleAdmins();
      const { user: onlyMaster } = await createFullAdmin({ is_master: true });

      const res = await api(`/api/users/${onlyMaster.id}`, {
        method: "PUT",
        token: tokenFor(onlyMaster),
        body: { is_active: false },
      });
      assert.equal(res.status, 409);

      const row = await prisma.user.findUnique({ where: { id: onlyMaster.id } });
      assert.equal(row?.is_active, true, "409 deveria ter preservado o estado do usuário");
    });

    it("9. desativação bloqueia login (com senha correta)", async () => {
      const { user: admin } = await createFullAdmin();
      const target = await createUser({ password: "senha-conhecida-456" });

      await api(`/api/users/${target.id}`, { method: "PUT", token: tokenFor(admin), body: { is_active: false } });

      const login = await api("/api/auth/login", {
        method: "POST",
        body: { email: target.email, password: "senha-conhecida-456" },
      });
      assert.equal(login.status, 401);
    });

    it("10. reativação restaura o acesso (login volta a funcionar)", async () => {
      const { user: admin } = await createFullAdmin();
      const target = await createUser({ password: "senha-conhecida-789", is_active: false });

      await api(`/api/users/${target.id}`, { method: "PUT", token: tokenFor(admin), body: { is_active: true } });

      const login = await api("/api/auth/login", {
        method: "POST",
        body: { email: target.email, password: "senha-conhecida-789" },
      });
      assert.equal(login.status, 200);
      assert.ok(login.json.token);
    });

    it("13. duas chamadas PUT (is_active:false) seguidas não geram erro — idempotente", async () => {
      const { user: admin } = await createFullAdmin();
      const target = await createUser();

      const first = await api(`/api/users/${target.id}`, { method: "PUT", token: tokenFor(admin), body: { is_active: false } });
      const second = await api(`/api/users/${target.id}`, { method: "PUT", token: tokenFor(admin), body: { is_active: false } });
      assert.equal(first.status, 200);
      assert.equal(second.status, 200);
      assert.equal(second.json.is_active, false);
    });

    it("14. bloqueio 409 (último responsável) grava auditoria só da tentativa bem-sucedida anterior, nunca da bloqueada", async () => {
      await neutralizeOtherResponsibleAdmins();
      const { user: onlyMaster } = await createFullAdmin({ is_master: true });
      const before = await prisma.productFeedbackAccessAudit.count({ where: { target_user_id: onlyMaster.id } });

      await api(`/api/users/${onlyMaster.id}`, { method: "PUT", token: tokenFor(onlyMaster), body: { is_active: false } });

      const after = await prisma.productFeedbackAccessAudit.count({ where: { target_user_id: onlyMaster.id } });
      assert.equal(after, before, "uma tentativa bloqueada (409) não deveria gerar registro de auditoria");
    });

    it("o motivo enviado no corpo (reason) é gravado no log de auditoria quando a desativação é bem-sucedida", async () => {
      const { user: admin } = await createFullAdmin();
      const target = await createUser();

      await api(`/api/users/${target.id}`, {
        method: "PUT",
        token: tokenFor(admin),
        body: { is_active: false, reason: "Teste de auditoria — motivo de exemplo" },
      });

      const audit = await prisma.productFeedbackAccessAudit.findFirst({
        where: { target_user_id: target.id, action: "user.deactivated" },
        orderBy: { created_at: "desc" },
      });
      assert.ok(audit);
      assert.equal(audit?.reason, "Teste de auditoria — motivo de exemplo");
      assert.equal(audit?.actor_id, admin.id);
    });
  });

  describe("DELETE /api/users/:id — exclusão física protegida", () => {
    it("1. sem token retorna 401", async () => {
      const res = await api("/api/users/whatever-id", { method: "DELETE" });
      assert.equal(res.status, 401);
    });

    it("2. admin sem a permissão 'usuarios:delete' recebe 403, usuário sobrevive", async () => {
      const profile = await createProfile({ permissions: [{ module: "usuarios", action: "view" }] });
      const admin = await createUser({ role: "admin", account_type: "admin", admin_profile_id: profile.id });
      const target = await createUser();

      const res = await api(`/api/users/${target.id}`, { method: "DELETE", token: tokenFor(admin) });
      assert.equal(res.status, 403);

      const row = await prisma.user.findUnique({ where: { id: target.id } });
      assert.ok(row);
    });

    it("3. conta não-admin não consegue chamar o endpoint (403) — requireRole('admin') bloqueia antes de qualquer outra checagem", async () => {
      const attacker = await createUser({ role: "company_user", account_type: "empresas" });
      const target = await createUser();

      const res = await api(`/api/users/${target.id}`, { method: "DELETE", token: tokenFor(attacker) });
      assert.equal(res.status, 403);
    });

    it("4. admin autorizado exclui um usuário comum com sucesso (204), a linha some do banco", async () => {
      const { user: admin } = await createFullAdmin();
      const target = await createUser();

      const res = await api(`/api/users/${target.id}`, { method: "DELETE", token: tokenFor(admin) });
      assert.equal(res.status, 204);

      const row = await prisma.user.findUnique({ where: { id: target.id } });
      assert.equal(row, null);
      createdUserIds.splice(createdUserIds.indexOf(target.id), 1);
    });

    it("5. Admin Master consegue excluir um Admin comum", async () => {
      const { user: master } = await createFullAdmin({ is_master: true });
      const { user: commonAdmin } = await createFullAdmin();

      const res = await api(`/api/users/${commonAdmin.id}`, { method: "DELETE", token: tokenFor(master) });
      assert.equal(res.status, 204);
      createdUserIds.splice(createdUserIds.indexOf(commonAdmin.id), 1);
    });

    it("6. Admin comum NÃO consegue excluir um Admin Master (403), Master sobrevive", async () => {
      await createFullAdmin({ is_master: true });
      const { user: master } = await createFullAdmin({ is_master: true });
      const { user: commonAdmin } = await createFullAdmin();

      const res = await api(`/api/users/${master.id}`, { method: "DELETE", token: tokenFor(commonAdmin) });
      assert.equal(res.status, 403);

      const row = await prisma.user.findUnique({ where: { id: master.id } });
      assert.ok(row);
    });

    it("7. não exclui o último Admin Master responsável do sistema (409)", async () => {
      await neutralizeOtherResponsibleAdmins();
      const { user: onlyMaster } = await createFullAdmin({ is_master: true });

      const res = await api(`/api/users/${onlyMaster.id}`, { method: "DELETE", token: tokenFor(onlyMaster) });
      assert.equal(res.status, 409);

      const row = await prisma.user.findUnique({ where: { id: onlyMaster.id } });
      assert.ok(row, "409 deveria ter preservado o usuário");
    });

    it("8. excluir um usuário dono de uma Agency retorna 409 amigável (não 500), e nada é apagado", async () => {
      // Agency.owner_user_id é obrigatório (relação sem onDelete explícito
      // -> Restrict é o default do Prisma pra relação obrigatória), então
      // excluir o dono estoura uma violação de FK de verdade — exatamente o
      // cenário que a mensagem amigável (em vez de um 500 cru) precisa
      // cobrir.
      const { user: admin } = await createFullAdmin();
      const owner = await createUser({ role: "agency_admin", account_type: "agencias" });
      const agency = await createAgencyOwnedBy(owner.id);

      const res = await api(`/api/users/${owner.id}`, { method: "DELETE", token: tokenFor(admin) });
      assert.equal(res.status, 409);
      assert.match(res.json.error, /organiza|vinculad/i);

      const userRow = await prisma.user.findUnique({ where: { id: owner.id } });
      assert.ok(userRow);
      const agencyRow = await prisma.agency.findUnique({ where: { id: agency.id } });
      assert.ok(agencyRow);
    });

    it("13. duas chamadas DELETE seguidas: 1ª apaga (204), 2ª não encontra nada (404) — nunca 500", async () => {
      const { user: admin } = await createFullAdmin();
      const target = await createUser();

      const first = await api(`/api/users/${target.id}`, { method: "DELETE", token: tokenFor(admin) });
      const second = await api(`/api/users/${target.id}`, { method: "DELETE", token: tokenFor(admin) });
      assert.equal(first.status, 204);
      assert.equal(second.status, 404);
      createdUserIds.splice(createdUserIds.indexOf(target.id), 1);
    });

    it("14. bloqueio por FK (409) preserva usuário, agência e todos os vínculos intactos", async () => {
      const { user: admin } = await createFullAdmin();
      const owner = await createUser({ role: "agency_admin", account_type: "agencias" });
      const agency = await createAgencyOwnedBy(owner.id);

      await api(`/api/users/${owner.id}`, { method: "DELETE", token: tokenFor(admin) });

      const userRow = await prisma.user.findUnique({ where: { id: owner.id } });
      const agencyRow = await prisma.agency.findUnique({ where: { id: agency.id } });
      assert.equal(userRow?.id, owner.id);
      assert.equal(agencyRow?.owner_user_id, owner.id);
    });

    it("motivo (reason) enviado no corpo é gravado na auditoria da exclusão bem-sucedida", async () => {
      const { user: admin } = await createFullAdmin();
      const target = await createUser();

      await api(`/api/users/${target.id}`, {
        method: "DELETE",
        token: tokenFor(admin),
        body: { reason: "Motivo de teste para exclusão" },
      });
      createdUserIds.splice(createdUserIds.indexOf(target.id), 1);

      const audit = await prisma.productFeedbackAccessAudit.findFirst({
        where: { target_user_id: target.id, action: "user.deleted" },
      });
      assert.ok(audit);
      assert.equal(audit?.reason, "Motivo de teste para exclusão");
    });
  });

  describe("DELETE /api/permissions/profiles/:id — não escala privilégio silenciosamente", () => {
    it("1. sem token retorna 401", async () => {
      const res = await api("/api/permissions/profiles/whatever-id", { method: "DELETE" });
      assert.equal(res.status, 401);
    });

    it("2. admin sem a permissão 'sistema:delete' recebe 403", async () => {
      const profile = await createProfile({ permissions: [{ module: "sistema", action: "view" }] });
      const admin = await createUser({ role: "admin", account_type: "admin", admin_profile_id: profile.id });
      const target = await createProfile({});

      const res = await api(`/api/permissions/profiles/${target.id}`, { method: "DELETE", token: tokenFor(admin) });
      assert.equal(res.status, 403);
    });

    it("4. admin autorizado exclui um perfil SEM usuários vinculados (204), some do banco", async () => {
      const { user: admin } = await createFullAdmin();
      const target = await createProfile({});

      const res = await api(`/api/permissions/profiles/${target.id}`, { method: "DELETE", token: tokenFor(admin) });
      assert.equal(res.status, 204);

      const row = await prisma.adminProfile.findUnique({ where: { id: target.id } });
      assert.equal(row, null);
      createdProfileIds.splice(createdProfileIds.indexOf(target.id), 1);
    });

    it("8. perfil com usuário ativo vinculado retorna 409 (relação impeditiva) e nada é apagado", async () => {
      const { user: admin } = await createFullAdmin();
      const target = await createProfile({});
      const linkedUser = await createUser({ role: "admin", account_type: "admin", admin_profile_id: target.id });

      const res = await api(`/api/permissions/profiles/${target.id}`, { method: "DELETE", token: tokenFor(admin) });
      assert.equal(res.status, 409);
      assert.match(res.json.error, /vinculad/i);

      const profileRow = await prisma.adminProfile.findUnique({ where: { id: target.id } });
      assert.ok(profileRow);
      const userRow = await prisma.user.findUnique({ where: { id: linkedUser.id } });
      assert.equal(userRow?.admin_profile_id, target.id, "o vínculo do usuário não deveria ter mudado");
    });

    it("13. duas chamadas DELETE seguidas: 1ª apaga (204), 2ª não encontra nada (404)", async () => {
      const { user: admin } = await createFullAdmin();
      const target = await createProfile({});

      const first = await api(`/api/permissions/profiles/${target.id}`, { method: "DELETE", token: tokenFor(admin) });
      const second = await api(`/api/permissions/profiles/${target.id}`, { method: "DELETE", token: tokenFor(admin) });
      assert.equal(first.status, 204);
      assert.equal(second.status, 404);
      createdProfileIds.splice(createdProfileIds.indexOf(target.id), 1);
    });
  });

  describe("PUT /api/company/users/:id e /api/agency/users/:id — regressão + auditoria", () => {
    it("bloquear o usuário principal (owner) da empresa continua proibido (403)", async () => {
      const owner = await createUser({ role: "company_admin", account_type: "empresas" });
      const company = await createCompanyOwnedBy(owner.id);
      await prisma.user.update({ where: { id: owner.id }, data: { company_id: company.id } });

      const res = await api(`/api/company/users/${owner.id}`, {
        method: "PUT",
        token: tokenFor(owner),
        body: { is_active: false },
      });
      assert.equal(res.status, 403);
    });

    it("desativar um colaborador comum da empresa persiste e grava auditoria", async () => {
      const owner = await createUser({ role: "company_admin", account_type: "empresas" });
      const company = await createCompanyOwnedBy(owner.id);
      await prisma.user.update({ where: { id: owner.id }, data: { company_id: company.id } });
      const collaborator = await createUser({ role: "company_user", account_type: "empresas", company_id: company.id });

      const res = await api(`/api/company/users/${collaborator.id}`, {
        method: "PUT",
        token: tokenFor(owner),
        body: { is_active: false },
      });
      assert.equal(res.status, 200);

      const audit = await prisma.productFeedbackAccessAudit.findFirst({
        where: { target_user_id: collaborator.id, action: "user.deactivated" },
      });
      assert.ok(audit);
      assert.equal(audit?.actor_id, owner.id);
    });

    it("isolamento entre empresas: admin da empresa A não edita usuário da empresa B (404)", async () => {
      const ownerA = await createUser({ role: "company_admin", account_type: "empresas" });
      const companyA = await createCompanyOwnedBy(ownerA.id);
      await prisma.user.update({ where: { id: ownerA.id }, data: { company_id: companyA.id } });

      const ownerB = await createUser({ role: "company_admin", account_type: "empresas" });
      const companyB = await createCompanyOwnedBy(ownerB.id);
      await prisma.user.update({ where: { id: ownerB.id }, data: { company_id: companyB.id } });
      const userB = await createUser({ role: "company_user", account_type: "empresas", company_id: companyB.id });

      const res = await api(`/api/company/users/${userB.id}`, {
        method: "PUT",
        token: tokenFor(ownerA),
        body: { is_active: false },
      });
      assert.equal(res.status, 404);

      const row = await prisma.user.findUnique({ where: { id: userB.id } });
      assert.equal(row?.is_active, true);
    });

    it("bloquear o usuário principal (owner) da agência continua proibido (403)", async () => {
      const owner = await createUser({ role: "agency_admin", account_type: "agencias" });
      const agency = await createAgencyOwnedBy(owner.id);
      await prisma.user.update({ where: { id: owner.id }, data: { agency_id: agency.id } });

      const res = await api(`/api/agency/users/${owner.id}`, {
        method: "PUT",
        token: tokenFor(owner),
        body: { is_active: false },
      });
      assert.equal(res.status, 403);
    });
  });
});
