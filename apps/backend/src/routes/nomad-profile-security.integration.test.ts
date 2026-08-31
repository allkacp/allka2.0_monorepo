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

// Lote "remoção/exclusão de perfil de Nômade" (ata 2026-08-25) — antes,
// `GET/PUT/DELETE /api/nomades/:id` só exigiam `verifyToken`: qualquer
// conta autenticada (inclusive um Nômade comum) conseguia ver/editar/
// apagar o perfil de QUALQUER outro nômade por id, e `PUT` aceitava
// `user_id` no payload (re-vincular um perfil pra outra conta). `DELETE`
// apagava o `Nomade` fisicamente sem checar histórico vinculado (carteira,
// conta bancária, qualificações, saques, tarefas) e nunca tocava a conta
// global — a pessoa continuava logando e sendo roteada pro portal Nômade
// sem nenhum perfil por trás. Corrigido: `requireRole("admin")` +
// `requirePermission("nomades", ...)` nas três rotas, `user_id` removido
// do payload de PUT, DELETE bloqueado (409) quando há histórico real, e
// nova ação reversível `PATCH /:id/status` que sincroniza `User.is_active`
// (login não olha `Nomade.status` hoje — só `is_active` bloqueia de
// verdade). Mesma estratégia dos lotes anteriores: app real, servidor HTTP
// local, banco descartável.

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
const createdNomadeIds: string[] = [];

async function createUser(overrides: Partial<{
  role: string;
  account_type: string;
  admin_profile_id: string | null;
  is_active: boolean;
  password: string;
}> = {}) {
  const id = `nps-${crypto.randomBytes(6).toString("hex")}`;
  const password = overrides.password ?? "senha-teste-123";
  const user = await prisma.user.create({
    data: {
      id,
      email: `${id}@example.test`,
      password_hash: await bcrypt.hash(password, 4),
      name: `Nomad Profile Security Test ${id}`,
      role: overrides.role ?? "company_user",
      account_type: overrides.account_type ?? "empresas",
      is_active: overrides.is_active ?? true,
      status: (overrides.is_active ?? true) ? "ativo" : "inativo",
      admin_profile_id: overrides.admin_profile_id ?? null,
    },
  });
  createdUserIds.push(user.id);
  return { ...user, plainPassword: password };
}

async function createFullAdmin() {
  const profile = await prisma.adminProfile.create({
    data: {
      name: `perfil-nps-${suffix}-${crypto.randomBytes(4).toString("hex")}`,
      is_master: false,
      is_active: true,
      permissions: {
        create: [
          { module: "nomades", action: "view" },
          { module: "nomades", action: "edit" },
          { module: "nomades", action: "delete" },
        ],
      },
    },
  });
  createdProfileIds.push(profile.id);
  const user = await createUser({ role: "admin", account_type: "admin", admin_profile_id: profile.id });
  return user;
}

async function createNomadeWithUser(overrides: Partial<{ status: string; withUser: boolean }> = {}) {
  const user = await createUser({ role: "nomad", account_type: "nomades", is_active: true });
  const nomade = await prisma.nomade.create({
    data: {
      id: `nomade-${crypto.randomBytes(6).toString("hex")}`,
      user_id: overrides.withUser === false ? null : user.id,
      name: user.name,
      email: user.email,
      status: overrides.status ?? "ativo",
      terms_accepted: true,
    },
  });
  createdNomadeIds.push(nomade.id);
  return { user, nomade };
}

describe("segurança de remoção/desativação de perfil de Nômade (ata 2026-08-25)", () => {
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
    await prisma.walletTransaction.deleteMany({ where: { nomade_id: { in: createdNomadeIds } } });
    await prisma.bankAccount.deleteMany({ where: { nomade_id: { in: createdNomadeIds } } });
    await prisma.qualification.deleteMany({ where: { nomade_id: { in: createdNomadeIds } } });
    await prisma.nomade.deleteMany({ where: { id: { in: createdNomadeIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.adminProfile.deleteMany({ where: { id: { in: createdProfileIds } } });
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    await prisma.$disconnect();
  });

  describe("DELETE /api/nomades/:id — remove só o perfil, nunca a conta", () => {
    it("1. sem token retorna 401", async () => {
      const res = await api("/api/nomades/whatever-id", { method: "DELETE" });
      assert.equal(res.status, 401);
    });

    it("2. admin sem a permissão 'nomades:delete' recebe 403", async () => {
      const profile = await prisma.adminProfile.create({
        data: {
          name: `perfil-nps-sem-delete-${suffix}`,
          is_master: false,
          is_active: true,
          permissions: { create: [{ module: "nomades", action: "view" }] },
        },
      });
      createdProfileIds.push(profile.id);
      const admin = await createUser({ role: "admin", account_type: "admin", admin_profile_id: profile.id });
      const { nomade } = await createNomadeWithUser();

      const res = await api(`/api/nomades/${nomade.id}`, { method: "DELETE", token: tokenFor(admin) });
      assert.equal(res.status, 403);

      const row = await prisma.nomade.findUnique({ where: { id: nomade.id } });
      assert.ok(row);
    });

    it("3. um Nômade comum não consegue remover outro (403), o perfil sobrevive", async () => {
      const attacker = await createUser({ role: "nomad", account_type: "nomades" });
      const { nomade } = await createNomadeWithUser();

      const res = await api(`/api/nomades/${nomade.id}`, { method: "DELETE", token: tokenFor(attacker) });
      assert.equal(res.status, 403);

      const row = await prisma.nomade.findUnique({ where: { id: nomade.id } });
      assert.ok(row);
    });

    it("4. isolamento: um Nômade comum não acessa (GET) o perfil de outro por id (403)", async () => {
      const attacker = await createUser({ role: "nomad", account_type: "nomades" });
      const { nomade } = await createNomadeWithUser();

      const res = await api(`/api/nomades/${nomade.id}`, { token: tokenFor(attacker) });
      assert.equal(res.status, 403);
    });

    it("5. admin autorizado remove um perfil sem histórico (204), some do banco", async () => {
      const admin = await createFullAdmin();
      const { nomade } = await createNomadeWithUser();

      const res = await api(`/api/nomades/${nomade.id}`, { method: "DELETE", token: tokenFor(admin) });
      assert.equal(res.status, 204);

      const row = await prisma.nomade.findUnique({ where: { id: nomade.id } });
      assert.equal(row, null);
      createdNomadeIds.splice(createdNomadeIds.indexOf(nomade.id), 1);
    });

    it("6/7. perfil com carteira vinculada retorna 409 (relação impeditiva) e não apaga o histórico", async () => {
      const admin = await createFullAdmin();
      const { nomade } = await createNomadeWithUser();
      await prisma.walletTransaction.create({
        data: {
          nomade_id: nomade.id,
          type: "credit",
          amount: 100,
          description: "Lançamento de teste",
        },
      });

      const res = await api(`/api/nomades/${nomade.id}`, { method: "DELETE", token: tokenFor(admin) });
      assert.equal(res.status, 409);
      assert.match(res.json.error, /histórico|carteira/i);

      const nomadeRow = await prisma.nomade.findUnique({ where: { id: nomade.id } });
      assert.ok(nomadeRow, "409 deveria ter preservado o perfil");
      const txCount = await prisma.walletTransaction.count({ where: { nomade_id: nomade.id } });
      assert.equal(txCount, 1, "409 deveria ter preservado o histórico de carteira");
    });

    it("8. após remoção bem-sucedida, a conta global sobrevive só desativada (nunca apagada)", async () => {
      const admin = await createFullAdmin();
      const { user, nomade } = await createNomadeWithUser();

      const res = await api(`/api/nomades/${nomade.id}`, { method: "DELETE", token: tokenFor(admin) });
      assert.equal(res.status, 204);
      createdNomadeIds.splice(createdNomadeIds.indexOf(nomade.id), 1);

      const userRow = await prisma.user.findUnique({ where: { id: user.id } });
      assert.ok(userRow, "a conta global não deveria ter sido apagada");
      assert.equal(userRow?.is_active, false);
    });

    it("10. após remoção do perfil, o login continua bloqueado (nunca entra num portal sem perfil)", async () => {
      const admin = await createFullAdmin();
      const { user, nomade } = await createNomadeWithUser({});
      const withPassword = await createUser({ role: "nomad", account_type: "nomades", password: "senha-pos-remocao-1" });
      await prisma.nomade.update({ where: { id: nomade.id }, data: { user_id: withPassword.id } });

      await api(`/api/nomades/${nomade.id}`, { method: "DELETE", token: tokenFor(admin) });
      createdNomadeIds.splice(createdNomadeIds.indexOf(nomade.id), 1);

      const login = await api("/api/auth/login", {
        method: "POST",
        body: { email: withPassword.email, password: "senha-pos-remocao-1" },
      });
      assert.equal(login.status, 401);
      void user;
    });

    it("12. duas chamadas DELETE seguidas: 1ª apaga (204), 2ª não encontra nada (404) — nunca 500", async () => {
      const admin = await createFullAdmin();
      const { nomade } = await createNomadeWithUser();

      const first = await api(`/api/nomades/${nomade.id}`, { method: "DELETE", token: tokenFor(admin) });
      const second = await api(`/api/nomades/${nomade.id}`, { method: "DELETE", token: tokenFor(admin) });
      assert.equal(first.status, 204);
      assert.equal(second.status, 404);
      createdNomadeIds.splice(createdNomadeIds.indexOf(nomade.id), 1);
    });

    it("motivo (reason) é gravado na auditoria da remoção bem-sucedida", async () => {
      const admin = await createFullAdmin();
      const { user, nomade } = await createNomadeWithUser();

      await api(`/api/nomades/${nomade.id}`, {
        method: "DELETE",
        token: tokenFor(admin),
        body: { reason: "Teste de auditoria — remoção de perfil" },
      });
      createdNomadeIds.splice(createdNomadeIds.indexOf(nomade.id), 1);

      const auditRow = await prisma.productFeedbackAccessAudit.findFirst({
        where: { target_user_id: user.id, action: "nomad_profile.removed" },
      });
      assert.ok(auditRow);
      assert.equal(auditRow?.reason, "Teste de auditoria — remoção de perfil");
    });
  });

  describe("PATCH /api/nomades/:id/status — desativar/reativar (reversível)", () => {
    it("9. desativar bloqueia o login (com senha correta)", async () => {
      const admin = await createFullAdmin();
      const targetUser = await createUser({ role: "nomad", account_type: "nomades", password: "senha-nomad-1" });
      const nomade = await prisma.nomade.create({
        data: {
          id: `nomade-${crypto.randomBytes(6).toString("hex")}`,
          user_id: targetUser.id,
          name: targetUser.name,
          email: targetUser.email,
          status: "ativo",
          terms_accepted: true,
        },
      });
      createdNomadeIds.push(nomade.id);

      const res = await api(`/api/nomades/${nomade.id}/status`, {
        method: "PATCH",
        token: tokenFor(admin),
        body: { status: "inativo" },
      });
      assert.equal(res.status, 200);

      const login = await api("/api/auth/login", {
        method: "POST",
        body: { email: targetUser.email, password: "senha-nomad-1" },
      });
      assert.equal(login.status, 401);
    });

    it("11. reativar restaura o acesso (login volta a funcionar) — o perfil nunca saiu do banco", async () => {
      const admin = await createFullAdmin();
      const targetUser = await createUser({ role: "nomad", account_type: "nomades", password: "senha-nomad-2", is_active: false });
      const nomade = await prisma.nomade.create({
        data: {
          id: `nomade-${crypto.randomBytes(6).toString("hex")}`,
          user_id: targetUser.id,
          name: targetUser.name,
          email: targetUser.email,
          status: "inativo",
          terms_accepted: true,
        },
      });
      createdNomadeIds.push(nomade.id);

      const res = await api(`/api/nomades/${nomade.id}/status`, {
        method: "PATCH",
        token: tokenFor(admin),
        body: { status: "ativo" },
      });
      assert.equal(res.status, 200);

      const login = await api("/api/auth/login", {
        method: "POST",
        body: { email: targetUser.email, password: "senha-nomad-2" },
      });
      assert.equal(login.status, 200);
      assert.ok(login.json.token);

      const nomadeRow = await prisma.nomade.findUnique({ where: { id: nomade.id } });
      assert.ok(nomadeRow, "o perfil nunca deveria ter sido apagado por uma desativação/reativação");
    });

    it("12b. duas chamadas PATCH .../status (inativo) seguidas não geram erro — idempotente", async () => {
      const admin = await createFullAdmin();
      const { nomade } = await createNomadeWithUser();

      const first = await api(`/api/nomades/${nomade.id}/status`, { method: "PATCH", token: tokenFor(admin), body: { status: "inativo" } });
      const second = await api(`/api/nomades/${nomade.id}/status`, { method: "PATCH", token: tokenFor(admin), body: { status: "inativo" } });
      assert.equal(first.status, 200);
      assert.equal(second.status, 200);
    });

    it("um Nômade comum não consegue desativar/reativar seu próprio perfil por chamada direta (403)", async () => {
      const { user, nomade } = await createNomadeWithUser();

      const res = await api(`/api/nomades/${nomade.id}/status`, {
        method: "PATCH",
        token: tokenFor(user),
        body: { status: "inativo" },
      });
      assert.equal(res.status, 403);
    });
  });

  describe("PUT /api/nomades/:id — payload não altera proprietário", () => {
    it("13. enviar user_id no payload não move o vínculo do perfil pra outra conta", async () => {
      const admin = await createFullAdmin();
      const { user: originalOwner, nomade } = await createNomadeWithUser();
      const otherUser = await createUser({ role: "nomad", account_type: "nomades" });

      const res = await api(`/api/nomades/${nomade.id}`, {
        method: "PUT",
        token: tokenFor(admin),
        body: { user_id: otherUser.id, level: "silver" },
      });
      assert.equal(res.status, 200);
      // level foi aplicado (prova que o resto do payload passa normalmente)...
      assert.equal(res.json.level, "silver");
      // ...mas user_id não muda.
      assert.equal(res.json.user_id, originalOwner.id);

      const row = await prisma.nomade.findUnique({ where: { id: nomade.id } });
      assert.equal(row?.user_id, originalOwner.id);
    });

    it("um Nômade comum não consegue editar o perfil de outro via PUT direto (403)", async () => {
      const attacker = await createUser({ role: "nomad", account_type: "nomades" });
      const { nomade } = await createNomadeWithUser();

      const res = await api(`/api/nomades/${nomade.id}`, {
        method: "PUT",
        token: tokenFor(attacker),
        body: { level: "diamond" },
      });
      assert.equal(res.status, 403);

      const row = await prisma.nomade.findUnique({ where: { id: nomade.id } });
      assert.equal(row?.level, "bronze");
    });
  });
});
