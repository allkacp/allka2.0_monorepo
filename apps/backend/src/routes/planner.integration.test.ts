import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import app from "../app";
import { prisma } from "../lib/prisma";
import { config } from "../config";

// Lote 6 (ata 2026-08-24) — Planejador persistente (Admin → Projetos).
// Sobe o app real num servidor HTTP local contra um banco descartável —
// mesma estratégia de delete-security.integration.test.ts, chamadas reais
// ao endpoint, não mocks da regra de autorização/isolamento.

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
const createdProjectIds: string[] = [];

async function createUser(overrides: Partial<{ admin_profile_id: string | null }> = {}) {
  const id = `planner-test-${crypto.randomBytes(6).toString("hex")}`;
  const user = await prisma.user.create({
    data: {
      id,
      email: `${id}@example.test`,
      password_hash: "unused-test-hash",
      name: `Planner Test ${id}`,
      role: "admin",
      account_type: "admin",
      is_active: true,
      status: "ativo",
      admin_profile_id: overrides.admin_profile_id ?? null,
    },
  });
  createdUserIds.push(user.id);
  return user;
}

async function createProfile(overrides: { is_master?: boolean; permissions?: { module: string; action: string }[] }) {
  const profile = await prisma.adminProfile.create({
    data: {
      name: `perfil-planner-${suffix}-${crypto.randomBytes(4).toString("hex")}`,
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

async function createProject() {
  const code = `proj_planner_test_${suffix}_${crypto.randomBytes(3).toString("hex")}`;
  const project = await prisma.project.create({
    data: { title: `Projeto teste ${code}`, project_code: code },
  });
  createdProjectIds.push(project.id);
  return project;
}

describe("planner routes (persistência, isolamento e concorrência — lote 6)", () => {
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
    await prisma.plannerCard.deleteMany({ where: { owner_user_id: { in: createdUserIds } } });
    await prisma.plannerColumn.deleteMany({ where: { owner_user_id: { in: createdUserIds } } });
    await prisma.project.deleteMany({ where: { id: { in: createdProjectIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.adminProfile.deleteMany({ where: { id: { in: createdProfileIds } } });
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    await prisma.$disconnect();
  });

  // ─── 1. 401 sem sessão ───────────────────────────────────────────────────
  it("1. GET /api/planner/board sem token retorna 401", async () => {
    const res = await api("/api/planner/board");
    assert.equal(res.status, 401);
  });

  // ─── 2. 403 sem permissão ────────────────────────────────────────────────
  it("2. usuário com perfil sem a permissão 'projetos:view' recebe 403", async () => {
    const profile = await createProfile({ permissions: [{ module: "outraCoisa", action: "view" }] });
    const user = await createUser({ admin_profile_id: profile.id });
    const res = await api("/api/planner/board", { token: tokenFor(user) });
    assert.equal(res.status, 403);
  });

  // ─── 3. usuário autorizado lista ────────────────────────────────────────
  it("3. usuário sem perfil (grandfathered) lista o board e recebe as 5 colunas padrão na primeira visita", async () => {
    const user = await createUser();
    const res = await api("/api/planner/board", { token: tokenFor(user) });
    assert.equal(res.status, 200);
    assert.equal(res.json.columns.length, 5);
    assert.deepEqual(res.json.cards, []);
  });

  // ─── 4. conta A não vê cards de B ────────────────────────────────────────
  it("4. conta A não vê cards nem colunas de B", async () => {
    const userA = await createUser();
    const userB = await createUser();
    const boardA = await api("/api/planner/board", { token: tokenFor(userA) });
    const columnA = boardA.json.columns[0];
    const createRes = await api("/api/planner/cards", {
      method: "POST",
      token: tokenFor(userA),
      body: { columnId: columnA.id, title: "Card só de A" },
    });
    assert.equal(createRes.status, 201);

    const boardB = await api("/api/planner/board", { token: tokenFor(userB) });
    assert.equal(boardB.json.cards.length, 0);
    assert.notDeepEqual(
      boardB.json.columns.map((c: any) => c.id),
      boardA.json.columns.map((c: any) => c.id),
    );
  });

  // ─── 5. criar persiste / 14. GET de novo reflete o mesmo estado ─────────
  it("5/14. criar card persiste — uma nova chamada GET /board reflete o card criado", async () => {
    const user = await createUser();
    const board = await api("/api/planner/board", { token: tokenFor(user) });
    const columnId = board.json.columns[0].id;

    const created = await api("/api/planner/cards", {
      method: "POST",
      token: tokenFor(user),
      body: { columnId, title: "Briefing com cliente", priority: "high" },
    });
    assert.equal(created.status, 201);
    assert.equal(created.json.card.title, "Briefing com cliente");

    const boardAgain = await api("/api/planner/board", { token: tokenFor(user) });
    assert.equal(boardAgain.json.cards.length, 1);
    assert.equal(boardAgain.json.cards[0].id, created.json.card.id);
    assert.equal(boardAgain.json.cards[0].title, "Briefing com cliente");
  });

  // ─── 6. payload não consegue trocar proprietário ────────────────────────
  it("6. payload com ownerUserId/ownerId não consegue trocar o dono do card", async () => {
    const user = await createUser();
    const otherUser = await createUser();
    const board = await api("/api/planner/board", { token: tokenFor(user) });
    const columnId = board.json.columns[0].id;

    const created = await api("/api/planner/cards", {
      method: "POST",
      token: tokenFor(user),
      body: { columnId, title: "Card", ownerUserId: otherUser.id, ownerId: otherUser.id } as any,
    });
    assert.equal(created.status, 201);

    const row = await prisma.plannerCard.findUnique({ where: { id: created.json.card.id } });
    assert.equal(row?.owner_user_id, user.id);
    assert.notEqual(row?.owner_user_id, otherUser.id);
  });

  // ─── 7. editar persiste ──────────────────────────────────────────────────
  it("7. editar card persiste", async () => {
    const user = await createUser();
    const board = await api("/api/planner/board", { token: tokenFor(user) });
    const columnId = board.json.columns[0].id;
    const created = await api("/api/planner/cards", {
      method: "POST",
      token: tokenFor(user),
      body: { columnId, title: "Original" },
    });

    const edited = await api(`/api/planner/cards/${created.json.card.id}`, {
      method: "PUT",
      token: tokenFor(user),
      body: { title: "Editado", priority: "urgent" },
    });
    assert.equal(edited.status, 200);
    assert.equal(edited.json.card.title, "Editado");
    assert.equal(edited.json.card.priority, "urgent");

    const boardAgain = await api("/api/planner/board", { token: tokenFor(user) });
    assert.equal(boardAgain.json.cards[0].title, "Editado");
  });

  // ─── 8. mover persiste ───────────────────────────────────────────────────
  it("8. mover card para outra coluna persiste", async () => {
    const user = await createUser();
    const board = await api("/api/planner/board", { token: tokenFor(user) });
    const [colA, colB] = board.json.columns;
    const created = await api("/api/planner/cards", {
      method: "POST",
      token: tokenFor(user),
      body: { columnId: colA.id, title: "Card móvel" },
    });

    const moved = await api(`/api/planner/cards/${created.json.card.id}/position`, {
      method: "PUT",
      token: tokenFor(user),
      body: { columnId: colB.id, position: 0 },
    });
    assert.equal(moved.status, 200);
    assert.equal(moved.json.card.columnId, colB.id);

    const boardAgain = await api("/api/planner/board", { token: tokenFor(user) });
    assert.equal(boardAgain.json.cards.find((c: any) => c.id === created.json.card.id).columnId, colB.id);
  });

  // ─── 9. ordenar persiste ─────────────────────────────────────────────────
  it("9. reordenar cards dentro da mesma coluna persiste", async () => {
    const user = await createUser();
    const board = await api("/api/planner/board", { token: tokenFor(user) });
    const columnId = board.json.columns[0].id;
    const c1 = await api("/api/planner/cards", { method: "POST", token: tokenFor(user), body: { columnId, title: "Um" } });
    const c2 = await api("/api/planner/cards", { method: "POST", token: tokenFor(user), body: { columnId, title: "Dois" } });

    // Move o segundo card para a posição 0 (na frente do primeiro).
    const moved = await api(`/api/planner/cards/${c2.json.card.id}/position`, {
      method: "PUT",
      token: tokenFor(user),
      body: { columnId, position: 0 },
    });
    assert.equal(moved.status, 200);

    const boardAgain = await api("/api/planner/board", { token: tokenFor(user) });
    const ordered = boardAgain.json.cards
      .filter((c: any) => c.columnId === columnId)
      .sort((a: any, b: any) => a.position - b.position);
    assert.equal(ordered[0].id, c2.json.card.id);
    assert.equal(ordered[1].id, c1.json.card.id);
  });

  // ─── 10. arquivar/remover persiste ──────────────────────────────────────
  it("10. remover (arquivar) card persiste — some do board depois de recarregar", async () => {
    const user = await createUser();
    const board = await api("/api/planner/board", { token: tokenFor(user) });
    const columnId = board.json.columns[0].id;
    const created = await api("/api/planner/cards", {
      method: "POST",
      token: tokenFor(user),
      body: { columnId, title: "Vai ser removido" },
    });

    const removed = await api(`/api/planner/cards/${created.json.card.id}`, {
      method: "DELETE",
      token: tokenFor(user),
    });
    assert.equal(removed.status, 200);

    const boardAgain = await api("/api/planner/board", { token: tokenFor(user) });
    assert.equal(boardAgain.json.cards.find((c: any) => c.id === created.json.card.id), undefined);

    const row = await prisma.plannerCard.findUnique({ where: { id: created.json.card.id } });
    assert.notEqual(row?.archived_at, null);
  });

  // ─── 11. restaurar funciona ──────────────────────────────────────────────
  it("11. restaurar card arquivado volta a aparecer no board", async () => {
    const user = await createUser();
    const board = await api("/api/planner/board", { token: tokenFor(user) });
    const columnId = board.json.columns[0].id;
    const created = await api("/api/planner/cards", {
      method: "POST",
      token: tokenFor(user),
      body: { columnId, title: "Arquivo e volto" },
    });
    await api(`/api/planner/cards/${created.json.card.id}`, { method: "DELETE", token: tokenFor(user) });

    const restored = await api(`/api/planner/cards/${created.json.card.id}/restore`, {
      method: "POST",
      token: tokenFor(user),
    });
    assert.equal(restored.status, 200);
    assert.equal(restored.json.card.archivedAt, null);

    const boardAgain = await api("/api/planner/board", { token: tokenFor(user) });
    assert.notEqual(boardAgain.json.cards.find((c: any) => c.id === created.json.card.id), undefined);
  });

  // ─── 12. conflito concorrente é tratado ──────────────────────────────────
  it("12. editar com updatedAt desatualizado retorna 409", async () => {
    const user = await createUser();
    const board = await api("/api/planner/board", { token: tokenFor(user) });
    const columnId = board.json.columns[0].id;
    const created = await api("/api/planner/cards", {
      method: "POST",
      token: tokenFor(user),
      body: { columnId, title: "Card concorrente" },
    });
    const staleUpdatedAt = created.json.card.updatedAt;

    // Primeira edição, bem-sucedida — muda updated_at no banco.
    const firstEdit = await api(`/api/planner/cards/${created.json.card.id}`, {
      method: "PUT",
      token: tokenFor(user),
      body: { title: "Primeira edição", updatedAt: staleUpdatedAt },
    });
    assert.equal(firstEdit.status, 200);

    // Segunda edição, com o updatedAt ANTIGO (simula duas abas/sessões
    // editando ao mesmo tempo) — deve ser recusada com 409, não sobrescrever.
    const secondEdit = await api(`/api/planner/cards/${created.json.card.id}`, {
      method: "PUT",
      token: tokenFor(user),
      body: { title: "Segunda edição (deveria falhar)", updatedAt: staleUpdatedAt },
    });
    assert.equal(secondEdit.status, 409);

    const row = await prisma.plannerCard.findUnique({ where: { id: created.json.card.id } });
    assert.equal(row?.title, "Primeira edição");
  });

  // ─── 13. registro inexistente retorna 404 ────────────────────────────────
  it("13. editar/mover/remover card inexistente retorna 404", async () => {
    const user = await createUser();
    const fakeId = "does-not-exist";
    const edit = await api(`/api/planner/cards/${fakeId}`, { method: "PUT", token: tokenFor(user), body: { title: "x" } });
    assert.equal(edit.status, 404);
    const del = await api(`/api/planner/cards/${fakeId}`, { method: "DELETE", token: tokenFor(user) });
    assert.equal(del.status, 404);
  });

  // ─── vínculo opcional com Project ────────────────────────────────────────
  it("card pode se referenciar a um Project real via projectId; projectId inexistente é rejeitado (400)", async () => {
    const user = await createUser();
    const project = await createProject();
    const board = await api("/api/planner/board", { token: tokenFor(user) });
    const columnId = board.json.columns[0].id;

    const linked = await api("/api/planner/cards", {
      method: "POST",
      token: tokenFor(user),
      body: { columnId, title: "Ligado a projeto", projectId: project.id },
    });
    assert.equal(linked.status, 201);
    assert.equal(linked.json.card.projectId, project.id);

    const invalid = await api("/api/planner/cards", {
      method: "POST",
      token: tokenFor(user),
      body: { columnId, title: "Projeto inválido", projectId: "does-not-exist" },
    });
    assert.equal(invalid.status, 400);
  });

  // ─── excluir coluna com cards ativos é bloqueado (409) ───────────────────
  it("excluir coluna com cards ativos retorna 409; coluna vazia é excluída", async () => {
    const user = await createUser();
    const board = await api("/api/planner/board", { token: tokenFor(user) });
    const columnId = board.json.columns[0].id;
    await api("/api/planner/cards", { method: "POST", token: tokenFor(user), body: { columnId, title: "Ocupando a coluna" } });

    const blocked = await api(`/api/planner/columns/${columnId}`, { method: "DELETE", token: tokenFor(user) });
    assert.equal(blocked.status, 409);

    const emptyColumn = await api("/api/planner/columns", {
      method: "POST",
      token: tokenFor(user),
      body: { label: "Coluna vazia" },
    });
    const deleted = await api(`/api/planner/columns/${emptyColumn.json.column.id}`, { method: "DELETE", token: tokenFor(user) });
    assert.equal(deleted.status, 200);
  });
});

// Lote seguinte (mesma ata, "completar o arquivamento") — tela de "Cards
// arquivados": GET /api/planner/cards/archived (paginado) e o fallback de
// coluna no restore quando a coluna original não existe mais.
//
// `before`/`after` próprios (não reaproveita os do describe anterior): o
// `after()` de cima já fechou o server e desconectou o prisma — reabre os
// dois aqui, mesma estratégia, pra este describe rodar isolado mesmo
// quando só este arquivo é executado.
describe("planner — cards arquivados (listagem, restauração, fallback de coluna)", () => {
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
    await prisma.plannerCard.deleteMany({ where: { owner_user_id: { in: createdUserIds } } });
    await prisma.plannerColumn.deleteMany({ where: { owner_user_id: { in: createdUserIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.adminProfile.deleteMany({ where: { id: { in: createdProfileIds } } });
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    await prisma.$disconnect();
  });

  // ─── 1/2. listar somente arquivados, nunca ativos ─────────────────────
  it("1/2. GET /cards/archived só retorna cards arquivados do usuário — nunca ativos", async () => {
    const user = await createUser();
    const board = await api("/api/planner/board", { token: tokenFor(user) });
    const columnId = board.json.columns[0].id;
    const active = await api("/api/planner/cards", { method: "POST", token: tokenFor(user), body: { columnId, title: "Ativo" } });
    const toArchive = await api("/api/planner/cards", { method: "POST", token: tokenFor(user), body: { columnId, title: "Vai arquivar" } });
    await api(`/api/planner/cards/${toArchive.json.card.id}`, { method: "DELETE", token: tokenFor(user) });

    const archived = await api("/api/planner/cards/archived", { token: tokenFor(user) });
    assert.equal(archived.status, 200);
    assert.equal(archived.json.data.length, 1);
    assert.equal(archived.json.data[0].id, toArchive.json.card.id);
    assert.ok(!archived.json.data.some((c: any) => c.id === active.json.card.id));
  });

  // ─── 3. isolamento entre contas ────────────────────────────────────────
  it("3. conta A não vê nem restaura os cards arquivados de B", async () => {
    const userA = await createUser();
    const userB = await createUser();
    const boardA = await api("/api/planner/board", { token: tokenFor(userA) });
    const cardA = await api("/api/planner/cards", {
      method: "POST",
      token: tokenFor(userA),
      body: { columnId: boardA.json.columns[0].id, title: "Card de A" },
    });
    await api(`/api/planner/cards/${cardA.json.card.id}`, { method: "DELETE", token: tokenFor(userA) });

    const archivedForB = await api("/api/planner/cards/archived", { token: tokenFor(userB) });
    assert.equal(archivedForB.json.data.length, 0);

    const restoreAttempt = await api(`/api/planner/cards/${cardA.json.card.id}/restore`, { method: "POST", token: tokenFor(userB) });
    assert.equal(restoreAttempt.status, 404);
  });

  // ─── 4. 401 ──────────────────────────────────────────────────────────
  it("4. GET /cards/archived sem token retorna 401", async () => {
    const res = await api("/api/planner/cards/archived");
    assert.equal(res.status, 401);
  });

  // ─── 5. 403 ──────────────────────────────────────────────────────────
  it("5. usuário sem a permissão 'projetos:view' recebe 403 em /cards/archived", async () => {
    const profile = await createProfile({ permissions: [{ module: "outraCoisa", action: "view" }] });
    const user = await createUser({ admin_profile_id: profile.id });
    const res = await api("/api/planner/cards/archived", { token: tokenFor(user) });
    assert.equal(res.status, 403);
  });

  // ─── 6. 404 seguro ───────────────────────────────────────────────────
  it("6. restaurar card inexistente retorna 404", async () => {
    const user = await createUser();
    const res = await api("/api/planner/cards/does-not-exist/restore", { method: "POST", token: tokenFor(user) });
    assert.equal(res.status, 404);
  });

  // ─── 7/8. restaurar card, mantém proprietário ──────────────────────────
  it("7/8. restaurar volta o card pra lista ativa mantendo o mesmo owner", async () => {
    const user = await createUser();
    const board = await api("/api/planner/board", { token: tokenFor(user) });
    const columnId = board.json.columns[0].id;
    const created = await api("/api/planner/cards", { method: "POST", token: tokenFor(user), body: { columnId, title: "Vai e volta" } });
    await api(`/api/planner/cards/${created.json.card.id}`, { method: "DELETE", token: tokenFor(user) });

    const restored = await api(`/api/planner/cards/${created.json.card.id}/restore`, { method: "POST", token: tokenFor(user) });
    assert.equal(restored.status, 200);
    assert.equal(restored.json.card.archivedAt, null);
    assert.equal(restored.json.usedFallbackColumn, false);

    const row = await prisma.plannerCard.findUnique({ where: { id: created.json.card.id } });
    assert.equal(row?.owner_user_id, user.id);

    const boardAgain = await api("/api/planner/board", { token: tokenFor(user) });
    assert.ok(boardAgain.json.cards.some((c: any) => c.id === created.json.card.id));

    const archivedAfter = await api("/api/planner/cards/archived", { token: tokenFor(user) });
    assert.ok(!archivedAfter.json.data.some((c: any) => c.id === created.json.card.id));
  });

  // ─── 9. restaurar quando a coluna original ainda existe ────────────────
  it("9. restaurar com a coluna original intacta volta pra ela (sem fallback)", async () => {
    const user = await createUser();
    const board = await api("/api/planner/board", { token: tokenFor(user) });
    const targetColumn = board.json.columns[2]; // "Em Andamento", não é o Backlog
    const created = await api("/api/planner/cards", { method: "POST", token: tokenFor(user), body: { columnId: targetColumn.id, title: "Fica na mesma coluna" } });
    await api(`/api/planner/cards/${created.json.card.id}`, { method: "DELETE", token: tokenFor(user) });

    const restored = await api(`/api/planner/cards/${created.json.card.id}/restore`, { method: "POST", token: tokenFor(user) });
    assert.equal(restored.json.usedFallbackColumn, false);
    assert.equal(restored.json.card.columnId, targetColumn.id);
  });

  // ─── 10. fallback quando a coluna não existe mais ──────────────────────
  it("10. coluna original excluída (column_id vira null via ON DELETE SET NULL) — restaura pro Backlog e avisa o fallback", async () => {
    const user = await createUser();
    const board = await api("/api/planner/board", { token: tokenFor(user) });
    const columnId = board.json.columns[2].id; // "Em Andamento"
    const created = await api("/api/planner/cards", { method: "POST", token: tokenFor(user), body: { columnId, title: "Coluna vai sumir" } });
    await api(`/api/planner/cards/${created.json.card.id}`, { method: "DELETE", token: tokenFor(user) });

    // A coluna só tem o card ARQUIVADO agora (0 ativos) — a API permite
    // excluí-la; graças ao ON DELETE SET NULL, o card sobrevive com
    // column_id nulo em vez de ser destruído em cascata.
    const del = await api(`/api/planner/columns/${columnId}`, { method: "DELETE", token: tokenFor(user) });
    assert.equal(del.status, 200);

    const stillThere = await prisma.plannerCard.findUnique({ where: { id: created.json.card.id } });
    assert.ok(stillThere, "o card arquivado deveria sobreviver à exclusão da coluna");
    assert.equal(stillThere?.column_id, null);

    const restored = await api(`/api/planner/cards/${created.json.card.id}/restore`, { method: "POST", token: tokenFor(user) });
    assert.equal(restored.status, 200);
    assert.equal(restored.json.usedFallbackColumn, true);
    const backlog = board.json.columns.find((c: any) => c.label === "Backlog");
    assert.equal(restored.json.card.columnId, backlog.id);
  });

  // ─── 11. clique/requisição repetida não duplica ────────────────────────
  it("11. duas chamadas de restore seguidas não duplicam nem falham na segunda", async () => {
    const user = await createUser();
    const board = await api("/api/planner/board", { token: tokenFor(user) });
    const columnId = board.json.columns[0].id;
    const created = await api("/api/planner/cards", { method: "POST", token: tokenFor(user), body: { columnId, title: "Restaurado 2x" } });
    await api(`/api/planner/cards/${created.json.card.id}`, { method: "DELETE", token: tokenFor(user) });

    const first = await api(`/api/planner/cards/${created.json.card.id}/restore`, { method: "POST", token: tokenFor(user) });
    const second = await api(`/api/planner/cards/${created.json.card.id}/restore`, { method: "POST", token: tokenFor(user) });
    assert.equal(first.status, 200);
    assert.equal(second.status, 200);

    const boardAgain = await api("/api/planner/board", { token: tokenFor(user) });
    const matches = boardAgain.json.cards.filter((c: any) => c.id === created.json.card.id);
    assert.equal(matches.length, 1);
  });

  // ─── 12. card ativo não é restaurado indevidamente ─────────────────────
  it("12. restaurar um card que já está ativo não o move nem reposiciona", async () => {
    const user = await createUser();
    const board = await api("/api/planner/board", { token: tokenFor(user) });
    const columnId = board.json.columns[1].id; // "A Fazer"
    const created = await api("/api/planner/cards", { method: "POST", token: tokenFor(user), body: { columnId, title: "Sempre ativo" } });

    const restoreOnActive = await api(`/api/planner/cards/${created.json.card.id}/restore`, { method: "POST", token: tokenFor(user) });
    assert.equal(restoreOnActive.status, 200);
    assert.equal(restoreOnActive.json.usedFallbackColumn, false);
    assert.equal(restoreOnActive.json.card.columnId, columnId);
  });

  // ─── 13. paginação e total corretos ────────────────────────────────────
  it("13. paginação: total correto, página cheia respeitando o limit", async () => {
    const user = await createUser();
    const board = await api("/api/planner/board", { token: tokenFor(user) });
    const columnId = board.json.columns[0].id;
    for (let i = 0; i < 5; i++) {
      const c = await api("/api/planner/cards", { method: "POST", token: tokenFor(user), body: { columnId, title: `Arquivo ${i}` } });
      await api(`/api/planner/cards/${c.json.card.id}`, { method: "DELETE", token: tokenFor(user) });
    }

    const page1 = await api("/api/planner/cards/archived?page=1&limit=2", { token: tokenFor(user) });
    assert.equal(page1.json.total, 5);
    assert.equal(page1.json.data.length, 2);
    assert.equal(page1.json.page, 1);
    assert.equal(page1.json.limit, 2);

    const page3 = await api("/api/planner/cards/archived?page=3&limit=2", { token: tokenFor(user) });
    assert.equal(page3.json.data.length, 1);
    assert.equal(page3.json.total, 5);
  });
});
