import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import app from "../app";
import { prisma } from "../lib/prisma";
import { config } from "../config";

// Lote "Arquivar Projetos" (ata 2026-08) — PATCH /api/projects/:id/archive.
// Arquivamento é um soft state (archived_at/archive_reason/
// archived_by_user_id em Project), nunca exclusão física — os testes abaixo
// provam isso diretamente: o registro e suas relações continuam no banco
// depois de arquivado. Sobe o app real num servidor HTTP local e usa fetch
// de verdade contra um banco descartável (mesmo padrão de
// delete-security.integration.test.ts).

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
const createdCompanyIds: string[] = [];
const createdProjectIds: string[] = [];
const createdProductIds: string[] = [];

async function createUser(overrides: Partial<{
  role: string;
  account_type: string;
  company_id: string | null;
}> = {}) {
  const id = `arch-sec-${crypto.randomBytes(6).toString("hex")}`;
  const user = await prisma.user.create({
    data: {
      id,
      email: `${id}@example.test`,
      password_hash: "unused-test-hash",
      name: `Archive Security Test ${id}`,
      role: overrides.role ?? "admin",
      account_type: overrides.account_type ?? "admin",
      is_active: true,
      status: "ativo",
      company_id: overrides.company_id ?? null,
    },
  });
  createdUserIds.push(user.id);
  return user;
}

async function createCompany() {
  const company = await prisma.company.create({
    data: { name: `Empresa teste arquivamento ${suffix}-${crypto.randomBytes(3).toString("hex")}` },
  });
  createdCompanyIds.push(company.id);
  return company;
}

async function createProject(overrides: { company_id?: string | null; status?: string } = {}) {
  const code = `proj_arch_test_${suffix}_${crypto.randomBytes(3).toString("hex")}`;
  const project = await prisma.project.create({
    data: {
      title: `Projeto teste arquivamento ${code}`,
      project_code: code,
      company_id: overrides.company_id ?? null,
      status: overrides.status ?? "in-progress",
    },
  });
  createdProjectIds.push(project.id);
  return project;
}

describe("PATCH /api/projects/:id/archive (lote Arquivar Projetos, ata 2026-08)", () => {
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
    await prisma.company.deleteMany({ where: { id: { in: createdCompanyIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    await prisma.$disconnect();
  });

  it("1. sem sessão -> 401, projeto permanece intacto", async () => {
    const project = await createProject();
    const res = await api(`/api/projects/${project.id}/archive`, {
      method: "PATCH",
      body: { reason: "Motivo de teste válido" },
    });
    assert.equal(res.status, 401);
    const found = await prisma.project.findUnique({ where: { id: project.id } });
    assert.equal(found?.archived_at, null);
  });

  it("2. usuário líder (lider) -> 403", async () => {
    const project = await createProject();
    const user = await createUser({ role: "lider", account_type: "lider" });
    const res = await api(`/api/projects/${project.id}/archive`, {
      method: "PATCH",
      token: tokenFor(user),
      body: { reason: "Motivo de teste válido" },
    });
    assert.equal(res.status, 403);
    const found = await prisma.project.findUnique({ where: { id: project.id } });
    assert.equal(found?.archived_at, null);
  });

  it("3. usuário de outra organização (empresa diferente) -> 403, projeto permanece", async () => {
    const ownerCompany = await createCompany();
    const otherCompany = await createCompany();
    const project = await createProject({ company_id: ownerCompany.id });
    const user = await createUser({ role: "company_user", account_type: "empresas", company_id: otherCompany.id });
    const res = await api(`/api/projects/${project.id}/archive`, {
      method: "PATCH",
      token: tokenFor(user),
      body: { reason: "Motivo de teste válido" },
    });
    assert.equal(res.status, 403);
    const found = await prisma.project.findUnique({ where: { id: project.id } });
    assert.equal(found?.archived_at, null);
  });

  it("4. projeto inexistente -> 404", async () => {
    const admin = await createUser();
    const res = await api("/api/projects/projeto-que-nao-existe/archive", {
      method: "PATCH",
      token: tokenFor(admin),
      body: { reason: "Motivo de teste válido" },
    });
    assert.equal(res.status, 404);
  });

  it("5. motivo vazio -> 400, projeto permanece", async () => {
    const project = await createProject();
    const admin = await createUser();
    const res = await api(`/api/projects/${project.id}/archive`, {
      method: "PATCH",
      token: tokenFor(admin),
      body: { reason: "" },
    });
    assert.equal(res.status, 400);
    const found = await prisma.project.findUnique({ where: { id: project.id } });
    assert.equal(found?.archived_at, null);
  });

  it("6. motivo só com espaços -> 400", async () => {
    const project = await createProject();
    const admin = await createUser();
    const res = await api(`/api/projects/${project.id}/archive`, {
      method: "PATCH",
      token: tokenFor(admin),
      body: { reason: "      " },
    });
    assert.equal(res.status, 400);
  });

  it("7. motivo abaixo do mínimo (menos de 5 caracteres úteis) -> 400", async () => {
    const project = await createProject();
    const admin = await createUser();
    const res = await api(`/api/projects/${project.id}/archive`, {
      method: "PATCH",
      token: tokenFor(admin),
      body: { reason: "abc" },
    });
    assert.equal(res.status, 400);
  });

  it("7b. motivo acima do máximo (501 caracteres) -> 400", async () => {
    const project = await createProject();
    const admin = await createUser();
    const res = await api(`/api/projects/${project.id}/archive`, {
      method: "PATCH",
      token: tokenFor(admin),
      body: { reason: "a".repeat(501) },
    });
    assert.equal(res.status, 400);
  });

  it("8/9/10. sucesso: 200, archived_at gerado pelo servidor, archived_by = usuário da sessão, motivo salvo aparado", async () => {
    const project = await createProject();
    const admin = await createUser();
    const before = new Date();
    const res = await api(`/api/projects/${project.id}/archive`, {
      method: "PATCH",
      token: tokenFor(admin),
      body: { reason: "  Perda do projeto — cliente cancelou  " },
    });
    assert.equal(res.status, 200);
    assert.equal(res.json.archive_reason, "Perda do projeto — cliente cancelou");
    assert.equal(res.json.archived_by_user_id, admin.id);
    assert.ok(res.json.archived_at);
    const archivedAt = new Date(res.json.archived_at);
    assert.ok(archivedAt.getTime() >= before.getTime() - 1000, "archived_at deve ser gerado agora pelo servidor");
    assert.equal(res.json.archived_by?.id, admin.id);
  });

  it("11/12. projeto permanece fisicamente no banco e relações continuam intactas", async () => {
    const project = await createProject();
    const product = await prisma.product.create({
      data: { name: `Produto teste arquivamento ${suffix}-${crypto.randomBytes(3).toString("hex")}`, category: "teste" },
    });
    createdProductIds.push(product.id);
    const link = await prisma.projectProduct.create({
      data: {
        project_id: project.id,
        product_id: product.id,
        product_name_snapshot: product.name,
        product_category_snapshot: product.category,
      },
    });
    const admin = await createUser();
    const res = await api(`/api/projects/${project.id}/archive`, {
      method: "PATCH",
      token: tokenFor(admin),
      body: { reason: "Motivo de teste válido" },
    });
    assert.equal(res.status, 200);
    const found = await prisma.project.findUnique({ where: { id: project.id } });
    assert.ok(found, "projeto continua no banco — arquivamento não é exclusão física");
    const foundLink = await prisma.projectProduct.findUnique({ where: { id: link.id } });
    assert.ok(foundLink, "vínculo de produto continua existindo");
    assert.equal(foundLink?.project_id, project.id, "vínculo com o projeto não foi corrompido");
  });

  it("13/14. some da listagem padrão de ativos e aparece no filtro de arquivados", async () => {
    const project = await createProject();
    const admin = await createUser();
    const archiveRes = await api(`/api/projects/${project.id}/archive`, {
      method: "PATCH",
      token: tokenFor(admin),
      body: { reason: "Motivo de teste válido" },
    });
    assert.equal(archiveRes.status, 200);

    const defaultList = await api(`/api/projects?limit=500`, { token: tokenFor(admin) });
    assert.equal(defaultList.status, 200);
    assert.ok(
      !defaultList.json.data.some((p: any) => p.id === project.id),
      "projeto arquivado não deve aparecer na listagem padrão",
    );

    const archivedList = await api(`/api/projects?limit=500&archived=true`, { token: tokenFor(admin) });
    assert.equal(archivedList.status, 200);
    assert.ok(
      archivedList.json.data.some((p: any) => p.id === project.id),
      "projeto arquivado deve aparecer no filtro archived=true",
    );

    const allList = await api(`/api/projects?limit=500&archived=all`, { token: tokenFor(admin) });
    assert.ok(
      allList.json.data.some((p: any) => p.id === project.id),
      "archived=all deve incluir o projeto arquivado junto com os ativos",
    );
  });

  it("15. auditoria registra motivo, ator e transição", async () => {
    const project = await createProject();
    const admin = await createUser();
    const res = await api(`/api/projects/${project.id}/archive`, {
      method: "PATCH",
      token: tokenFor(admin),
      body: { reason: "Motivo de teste válido para auditoria" },
    });
    assert.equal(res.status, 200);

    const auditRow = await prisma.productFeedbackAccessAudit.findFirst({
      where: { action: "project.archived", actor_id: admin.id },
      orderBy: { created_at: "desc" },
    });
    assert.ok(auditRow, "deve existir um registro de auditoria para o arquivamento");
    assert.equal(auditRow?.reason, "Motivo de teste válido para auditoria");
    assert.ok(auditRow?.before_json?.includes(project.id));
    assert.ok(auditRow?.after_json?.includes(project.id));
    assert.ok(auditRow?.after_json?.includes("archived_at"));
  });

  it("16. segunda tentativa -> 409, não sobrescreve o arquivamento original", async () => {
    const project = await createProject();
    const admin = await createUser();
    const first = await api(`/api/projects/${project.id}/archive`, {
      method: "PATCH",
      token: tokenFor(admin),
      body: { reason: "Primeiro motivo de arquivamento" },
    });
    assert.equal(first.status, 200);
    const firstArchivedAt = first.json.archived_at;

    const second = await api(`/api/projects/${project.id}/archive`, {
      method: "PATCH",
      token: tokenFor(admin),
      body: { reason: "Segundo motivo — não deveria valer" },
    });
    assert.equal(second.status, 409);

    const found = await prisma.project.findUnique({ where: { id: project.id } });
    assert.equal(found?.archive_reason, "Primeiro motivo de arquivamento");
    assert.equal(found?.archived_at?.toISOString(), firstArchivedAt);
  });

  it("17. usuário da mesma organização (mesma empresa vinculada) consegue arquivar", async () => {
    const company = await createCompany();
    const project = await createProject({ company_id: company.id });
    const user = await createUser({ role: "company_user", account_type: "empresas", company_id: company.id });
    const res = await api(`/api/projects/${project.id}/archive`, {
      method: "PATCH",
      token: tokenFor(user),
      body: { reason: "Motivo de teste válido" },
    });
    assert.equal(res.status, 200);
  });

  it("18. DELETE /api/projects/:id continua fazendo exclusão física — não foi alterado por este lote", async () => {
    const project = await createProject();
    const admin = await createUser();
    const res = await api(`/api/projects/${project.id}`, { method: "DELETE", token: tokenFor(admin) });
    assert.equal(res.status, 204);
    const found = await prisma.project.findUnique({ where: { id: project.id } });
    assert.equal(found, null, "DELETE continua excluindo fisicamente, arquivar é uma rota separada");
    createdProjectIds.splice(createdProjectIds.indexOf(project.id), 1);
  });
});
