import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import app from "../app";
import { prisma } from "../lib/prisma";
import { config } from "../config";

// Lote 2A (ata 2026-08-20) — prova de autorização real para os dois
// endpoints corrigidos (DELETE /api/products/:id e DELETE /api/levels/:id)
// e uma prova mínima de isolamento entre contas para DELETE
// /api/projects/:id. Sobe o app real (src/app.ts) num servidor HTTP local
// e usa fetch de verdade contra um banco descartável — não são mocks da
// regra de autorização, são chamadas reais ao endpoint.

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
const createdProductIds: string[] = [];
const createdLevelIds: string[] = [];
const createdNomadeLevelIds: string[] = [];
const createdProjectIds: string[] = [];

async function createUser(overrides: Partial<{
  role: string;
  account_type: string;
  admin_profile_id: string | null;
  agency_id: string | null;
  company_id: string | null;
}> = {}) {
  const id = `del-sec-${crypto.randomBytes(6).toString("hex")}`;
  const user = await prisma.user.create({
    data: {
      id,
      email: `${id}@example.test`,
      password_hash: "unused-test-hash",
      name: `Delete Security Test ${id}`,
      role: overrides.role ?? "company_user",
      account_type: overrides.account_type ?? "empresas",
      is_active: true,
      status: "ativo",
      admin_profile_id: overrides.admin_profile_id ?? null,
      agency_id: overrides.agency_id ?? null,
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
      name: `perfil-${suffix}-${crypto.randomBytes(4).toString("hex")}`,
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

async function createProduct() {
  const product = await prisma.product.create({
    data: { name: `Produto teste ${suffix}-${crypto.randomBytes(3).toString("hex")}`, category: "teste" },
  });
  createdProductIds.push(product.id);
  return product;
}

async function createLevel() {
  const level = await prisma.partnerLevel.create({
    data: { name: `Nível teste ${suffix}-${crypto.randomBytes(3).toString("hex")}` },
  });
  createdLevelIds.push(level.id);
  return level;
}

async function createNomadeLevel() {
  const level = await prisma.nomadeLevel.create({
    data: {
      slug: `nivel-teste-${suffix}-${crypto.randomBytes(3).toString("hex")}`,
      name: `Nível nômade teste ${suffix}`,
      min_score: 0,
    },
  });
  createdNomadeLevelIds.push(level.id);
  return level;
}

async function createProject(overrides: { agency_id?: string | null } = {}) {
  const code = `proj_test_${suffix}_${crypto.randomBytes(3).toString("hex")}`;
  const project = await prisma.project.create({
    data: {
      title: `Projeto teste ${code}`,
      project_code: code,
      agency_id: overrides.agency_id ?? null,
    },
  });
  createdProjectIds.push(project.id);
  return project;
}

describe("segurança de exclusão — produtos, níveis e projetos (lote 2A, ata 2026-08-20)", () => {
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
    await prisma.projectProduct.deleteMany({ where: { project_id: { in: createdProjectIds } } });
    await prisma.project.deleteMany({ where: { id: { in: createdProjectIds } } });
    await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
    await prisma.partnerLevel.deleteMany({ where: { id: { in: createdLevelIds } } });
    await prisma.nomadeLevel.deleteMany({ where: { id: { in: createdNomadeLevelIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.adminProfile.deleteMany({ where: { id: { in: createdProfileIds } } });
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    await prisma.$disconnect();
  });

  // ─── DELETE /api/products/:id ───────────────────────────────────────────

  describe("DELETE /api/products/:id", () => {
    it("1. sem sessão -> 401, registro permanece", async () => {
      const product = await createProduct();
      const res = await api(`/api/products/${product.id}`, { method: "DELETE" });
      assert.equal(res.status, 401);
      assert.ok(await prisma.product.findUnique({ where: { id: product.id } }));
    });

    it("2. usuário comum (empresas) -> 403, registro permanece", async () => {
      const product = await createProduct();
      const user = await createUser({ role: "company_user", account_type: "empresas" });
      const res = await api(`/api/products/${product.id}`, { method: "DELETE", token: tokenFor(user) });
      assert.equal(res.status, 403);
      assert.ok(await prisma.product.findUnique({ where: { id: product.id } }));
    });

    it("3. usuário autenticado de outro tipo de conta (nômade) -> 403, registro permanece", async () => {
      const product = await createProduct();
      const user = await createUser({ role: "nomad", account_type: "nomades" });
      const res = await api(`/api/products/${product.id}`, { method: "DELETE", token: tokenFor(user) });
      assert.equal(res.status, 403);
      assert.ok(await prisma.product.findUnique({ where: { id: product.id } }));
    });

    it("4. admin com perfil SEM a permissão sistema/delete -> 403, registro permanece", async () => {
      const product = await createProduct();
      const profile = await createProfile({ permissions: [{ module: "financeiro", action: "view" }] });
      const user = await createUser({ role: "admin", account_type: "admin", admin_profile_id: profile.id });
      const res = await api(`/api/products/${product.id}`, { method: "DELETE", token: tokenFor(user) });
      assert.equal(res.status, 403);
      assert.ok(await prisma.product.findUnique({ where: { id: product.id } }));
    });

    it("5. admin com perfil COM sistema/delete -> exclusão funciona, 204", async () => {
      const product = await createProduct();
      const profile = await createProfile({ permissions: [{ module: "sistema", action: "delete" }] });
      const user = await createUser({ role: "admin", account_type: "admin", admin_profile_id: profile.id });
      const res = await api(`/api/products/${product.id}`, { method: "DELETE", token: tokenFor(user) });
      assert.equal(res.status, 204);
      assert.equal(await prisma.product.findUnique({ where: { id: product.id } }), null);
      createdProductIds.splice(createdProductIds.indexOf(product.id), 1);
    });

    it("6. Admin Master -> exclusão funciona independente de permissão granular", async () => {
      const product = await createProduct();
      const profile = await createProfile({ is_master: true });
      const user = await createUser({ role: "admin", account_type: "admin", admin_profile_id: profile.id });
      const res = await api(`/api/products/${product.id}`, { method: "DELETE", token: tokenFor(user) });
      assert.equal(res.status, 204);
      assert.equal(await prisma.product.findUnique({ where: { id: product.id } }), null);
      createdProductIds.splice(createdProductIds.indexOf(product.id), 1);
    });

    it("7. produto inexistente -> 404", async () => {
      const profile = await createProfile({ is_master: true });
      const user = await createUser({ role: "admin", account_type: "admin", admin_profile_id: profile.id });
      const res = await api("/api/products/produto-que-nao-existe", { method: "DELETE", token: tokenFor(user) });
      assert.equal(res.status, 404);
    });

    it("8. produto vinculado a um projeto -> bloqueado com mensagem clara, nada corrompido", async () => {
      const product = await createProduct();
      const project = await createProject();
      await prisma.projectProduct.create({
        data: {
          project_id: project.id,
          product_id: product.id,
          product_name_snapshot: product.name,
          product_category_snapshot: product.category,
        },
      });
      const profile = await createProfile({ is_master: true });
      const user = await createUser({ role: "admin", account_type: "admin", admin_profile_id: profile.id });
      const res = await api(`/api/products/${product.id}`, { method: "DELETE", token: tokenFor(user) });
      assert.equal(res.status, 409);
      assert.ok(res.json?.error);
      assert.ok(await prisma.product.findUnique({ where: { id: product.id } }), "produto não pode ter sido apagado");
      assert.ok(
        await prisma.projectProduct.findFirst({ where: { project_id: project.id, product_id: product.id } }),
        "vínculo não pode ter sido corrompido",
      );
    });

    it("9. identificador inválido (vazio) -> erro de validação, não acessa outro registro", async () => {
      const other = await createProduct();
      const profile = await createProfile({ is_master: true });
      const user = await createUser({ role: "admin", account_type: "admin", admin_profile_id: profile.id });
      // path com id vazio cai fora da rota /:id -> 404 do próprio Express;
      // usamos um id claramente inválido (espaço/whitespace) para exercitar
      // a validação do handler sem depender de roteamento.
      const res = await api(`/api/products/${encodeURIComponent("   ")}`, {
        method: "DELETE",
        token: tokenFor(user),
      });
      assert.ok([400, 404].includes(res.status));
      assert.ok(await prisma.product.findUnique({ where: { id: other.id } }), "outro registro não foi tocado");
    });

    it("10. tentativa repetida -> segunda chamada retorna 404, não crasha", async () => {
      const product = await createProduct();
      const profile = await createProfile({ is_master: true });
      const user = await createUser({ role: "admin", account_type: "admin", admin_profile_id: profile.id });
      const token = tokenFor(user);
      const first = await api(`/api/products/${product.id}`, { method: "DELETE", token });
      assert.equal(first.status, 204);
      createdProductIds.splice(createdProductIds.indexOf(product.id), 1);
      const second = await api(`/api/products/${product.id}`, { method: "DELETE", token });
      assert.equal(second.status, 404);
    });
  });

  // ─── DELETE /api/levels/:id (PartnerLevel) ──────────────────────────────

  describe("DELETE /api/levels/:id", () => {
    it("1. sem sessão -> 401, registro permanece", async () => {
      const level = await createLevel();
      const res = await api(`/api/levels/${level.id}`, { method: "DELETE" });
      assert.equal(res.status, 401);
      assert.ok(await prisma.partnerLevel.findUnique({ where: { id: level.id } }));
    });

    it("2. usuário comum -> 403, registro permanece", async () => {
      const level = await createLevel();
      const user = await createUser({ role: "agency_user", account_type: "agencias" });
      const res = await api(`/api/levels/${level.id}`, { method: "DELETE", token: tokenFor(user) });
      assert.equal(res.status, 403);
      assert.ok(await prisma.partnerLevel.findUnique({ where: { id: level.id } }));
    });

    it("3. admin com perfil SEM sistema/delete -> 403", async () => {
      const level = await createLevel();
      const profile = await createProfile({ permissions: [{ module: "usuarios", action: "delete" }] });
      const user = await createUser({ role: "admin", account_type: "admin", admin_profile_id: profile.id });
      const res = await api(`/api/levels/${level.id}`, { method: "DELETE", token: tokenFor(user) });
      assert.equal(res.status, 403);
      assert.ok(await prisma.partnerLevel.findUnique({ where: { id: level.id } }));
    });

    it("4. admin com sistema/delete -> exclusão funciona", async () => {
      const level = await createLevel();
      const profile = await createProfile({ permissions: [{ module: "sistema", action: "delete" }] });
      const user = await createUser({ role: "admin", account_type: "admin", admin_profile_id: profile.id });
      const res = await api(`/api/levels/${level.id}`, { method: "DELETE", token: tokenFor(user) });
      assert.equal(res.status, 204);
      assert.equal(await prisma.partnerLevel.findUnique({ where: { id: level.id } }), null);
      createdLevelIds.splice(createdLevelIds.indexOf(level.id), 1);
    });

    it("5. Admin Master -> exclusão funciona", async () => {
      const level = await createLevel();
      const profile = await createProfile({ is_master: true });
      const user = await createUser({ role: "admin", account_type: "admin", admin_profile_id: profile.id });
      const res = await api(`/api/levels/${level.id}`, { method: "DELETE", token: tokenFor(user) });
      assert.equal(res.status, 204);
      createdLevelIds.splice(createdLevelIds.indexOf(level.id), 1);
    });

    it("6. nível inexistente -> 404", async () => {
      const profile = await createProfile({ is_master: true });
      const user = await createUser({ role: "admin", account_type: "admin", admin_profile_id: profile.id });
      const res = await api("/api/levels/nivel-que-nao-existe", { method: "DELETE", token: tokenFor(user) });
      assert.equal(res.status, 404);
    });

    it("7. identificador inválido -> erro de validação", async () => {
      const other = await createLevel();
      const profile = await createProfile({ is_master: true });
      const user = await createUser({ role: "admin", account_type: "admin", admin_profile_id: profile.id });
      const res = await api(`/api/levels/${encodeURIComponent("   ")}`, {
        method: "DELETE",
        token: tokenFor(user),
      });
      assert.ok([400, 404].includes(res.status));
      assert.ok(await prisma.partnerLevel.findUnique({ where: { id: other.id } }));
    });

    it("8. tentativa repetida -> segunda chamada é tratada (404), não crasha", async () => {
      const level = await createLevel();
      const profile = await createProfile({ is_master: true });
      const user = await createUser({ role: "admin", account_type: "admin", admin_profile_id: profile.id });
      const token = tokenFor(user);
      const first = await api(`/api/levels/${level.id}`, { method: "DELETE", token });
      assert.equal(first.status, 204);
      createdLevelIds.splice(createdLevelIds.indexOf(level.id), 1);
      const second = await api(`/api/levels/${level.id}`, { method: "DELETE", token });
      assert.equal(second.status, 404);
    });
  });

  // ─── DELETE /api/nomade-levels/:id — mesmo padrão, verificação compacta ─

  describe("DELETE /api/nomade-levels/:id (mesma correção aplicada)", () => {
    it("sem sessão -> 401; usuário comum -> 403; admin com sistema/delete -> 204", async () => {
      const level1 = await createNomadeLevel();
      const anon = await api(`/api/nomade-levels/${level1.id}`, { method: "DELETE" });
      assert.equal(anon.status, 401);

      const commonUser = await createUser({ role: "nomad", account_type: "nomades" });
      const level2 = await createNomadeLevel();
      const commonRes = await api(`/api/nomade-levels/${level2.id}`, { method: "DELETE", token: tokenFor(commonUser) });
      assert.equal(commonRes.status, 403);

      const profile = await createProfile({ permissions: [{ module: "sistema", action: "delete" }] });
      const admin = await createUser({ role: "admin", account_type: "admin", admin_profile_id: profile.id });
      const level3 = await createNomadeLevel();
      const okRes = await api(`/api/nomade-levels/${level3.id}`, { method: "DELETE", token: tokenFor(admin) });
      assert.equal(okRes.status, 204);
      createdNomadeLevelIds.splice(createdNomadeLevelIds.indexOf(level3.id), 1);

      assert.ok(await prisma.nomadeLevel.findUnique({ where: { id: level1.id } }));
      assert.ok(await prisma.nomadeLevel.findUnique({ where: { id: level2.id } }));
    });
  });

  // ─── DELETE /api/projects/:id — prova mínima de isolamento entre contas ─
  //
  // Não consolidamos aqui se "o dono pode apagar o próprio projeto" é a
  // regra definitiva (isso é decisão de negócio do Lote 3). Provamos
  // apenas a garantia que já é parte clara do contrato hoje: um usuário de
  // uma agência não consegue apagar projeto de outra agência.

  describe("DELETE /api/projects/:id — isolamento entre contas", () => {
    it("usuário de uma agência não consegue apagar projeto de outra agência (403), projeto permanece", async () => {
      // Agency.owner_user_id é obrigatório e único (1 dono por agência) —
      // cria-se o dono antes, depois a agência, depois liga-se o dono como
      // membro (mesmo padrão que getProjectScope() lê: User.agency_id).
      // Criados via prisma direto (não pelo helper createUser/createdUserIds)
      // de propósito: a limpeza global do after() apaga User antes de
      // Agency, o que quebraria a FK Agency.owner_user_id -> User. O banco
      // inteiro é descartável e cai junto no DROP DATABASE final.
      const idA = `del-sec-owner-a-${crypto.randomBytes(4).toString("hex")}`;
      const idB = `del-sec-owner-b-${crypto.randomBytes(4).toString("hex")}`;
      const ownerA = await prisma.user.create({
        data: { id: idA, email: `${idA}@example.test`, password_hash: "x", name: "Owner A", role: "agency_admin", account_type: "agencias", is_active: true, status: "ativo" },
      });
      const ownerB = await prisma.user.create({
        data: { id: idB, email: `${idB}@example.test`, password_hash: "x", name: "Owner B", role: "agency_admin", account_type: "agencias", is_active: true, status: "ativo" },
      });
      const agencyA = await prisma.agency.create({ data: { name: `Agência A ${suffix}`, owner_user_id: ownerA.id } });
      const agencyB = await prisma.agency.create({ data: { name: `Agência B ${suffix}`, owner_user_id: ownerB.id } });
      const idMember = `del-sec-member-a-${crypto.randomBytes(4).toString("hex")}`;
      const userOfAgencyA = await prisma.user.create({
        data: { id: idMember, email: `${idMember}@example.test`, password_hash: "x", name: "Member A", role: "agency_user", account_type: "agencias", is_active: true, status: "ativo", agency_id: agencyA.id },
      });
      const projectOfAgencyB = await createProject({ agency_id: agencyB.id });

      const res = await api(`/api/projects/${projectOfAgencyB.id}`, {
        method: "DELETE",
        token: tokenFor(userOfAgencyA),
      });
      assert.equal(res.status, 403);
      assert.ok(await prisma.project.findUnique({ where: { id: projectOfAgencyB.id } }));

      // Agências/usuários deste teste não são apagados individualmente aqui
      // (deletar a Agency antes do User que a referencia via agency_id
      // quebraria a FK) — o banco inteiro é descartável e é derrubado no
      // fim da suíte inteira por scripts/run-db-tests.ts.
    });

    it("sem sessão -> 401, projeto permanece", async () => {
      const project = await createProject();
      const res = await api(`/api/projects/${project.id}`, { method: "DELETE" });
      assert.equal(res.status, 401);
      assert.ok(await prisma.project.findUnique({ where: { id: project.id } }));
    });
  });

  // ─── Regressão (Parte 9) ─────────────────────────────────────────────────
  //
  // Não existia suíte automatizada cobrindo estes fluxos antes deste lote.
  // GET/POST/PUT de produtos e níveis não foram tocados pela correção (só
  // DELETE ganhou requireRole/requirePermission), mas provamos aqui, contra
  // o app real, que continuam funcionando exatamente como antes.

  describe("regressão — listagem, detalhe, criação e edição continuam funcionando", () => {
    it("produtos: listar, detalhar, criar e editar continuam liberados só com sessão (sem requireRole novo)", async () => {
      const user = await createUser({ role: "company_user", account_type: "empresas" });
      const token = tokenFor(user);

      const list = await api("/api/products", { token });
      assert.equal(list.status, 200);

      const created = await api("/api/products", {
        method: "POST",
        token,
        body: { name: `Produto regressão ${suffix}`, category: "teste" },
      });
      assert.equal(created.status, 201);
      createdProductIds.push(created.json.id);

      const detail = await api(`/api/products/${created.json.id}`, { token });
      assert.equal(detail.status, 200);

      const edited = await api(`/api/products/${created.json.id}`, {
        method: "PUT",
        token,
        body: { description: "Editado no teste de regressão" },
      });
      assert.equal(edited.status, 200);
      assert.equal(edited.json.description, "Editado no teste de regressão");
    });

    it("níveis (partner): listar, criar e editar continuam liberados só com sessão", async () => {
      const user = await createUser({ role: "agency_user", account_type: "agencias" });
      const token = tokenFor(user);

      const list = await api("/api/levels", { token });
      assert.equal(list.status, 200);

      const created = await api("/api/levels", {
        method: "POST",
        token,
        body: { name: `Nível regressão ${suffix}` },
      });
      assert.equal(created.status, 201);
      createdLevelIds.push(created.json.id);

      const edited = await api(`/api/levels/${created.json.id}`, {
        method: "PUT",
        token,
        body: { commission_rate: 0.2 },
      });
      assert.equal(edited.status, 200);
    });

    it("projetos: listagem continua liberada com escopo normal (não tocamos GET)", async () => {
      const user = await createUser({ role: "company_user", account_type: "empresas" });
      const res = await api("/api/projects", { token: tokenFor(user) });
      assert.equal(res.status, 200);
    });

    it("autenticação: token ausente/ inválido continua 401 em rota protegida qualquer", async () => {
      const noToken = await api("/api/products");
      assert.equal(noToken.status, 401);
      const badToken = await api("/api/products", { token: "token-invalido" });
      assert.equal(badToken.status, 401);
    });

    it("Admin Master continua com acesso irrestrito em ação administrativa já existente (perfis)", async () => {
      const profile = await createProfile({ is_master: true });
      const user = await createUser({ role: "admin", account_type: "admin", admin_profile_id: profile.id });
      const res = await api("/api/permissions/profiles", { token: tokenFor(user) });
      assert.equal(res.status, 200);
    });

    it("permissão granular existente (sistema/delete em /api/permissions/profiles/:id) continua com a mesma regra de antes", async () => {
      const targetProfile = await createProfile({});
      const noPerm = await createProfile({ permissions: [{ module: "sistema", action: "view" }] });
      const user = await createUser({ role: "admin", account_type: "admin", admin_profile_id: noPerm.id });
      const res = await api(`/api/permissions/profiles/${targetProfile.id}`, {
        method: "DELETE",
        token: tokenFor(user),
      });
      assert.equal(res.status, 403);
    });
  });
});
