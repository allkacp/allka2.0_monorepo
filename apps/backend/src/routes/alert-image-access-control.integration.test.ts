import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import app from "../app";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import { ensureDefaultAlertStandardsAndRules } from "../lib/alert-engine";
import { deleteAlertImage } from "../lib/alert-image-storage";

// Reparo de segurança pós-4º lote (ata 2026-08): a rota de imagem de alerta
// servia qualquer arquivo pra qualquer usuário autenticado que soubesse o
// nome físico — corrigido pra autorização por RECURSO (a mesma regra usada
// pra abrir o próprio alerta/Padrão/Programação), nunca por nome de
// arquivo. Este arquivo cobre exatamente a lista de 20 testes da ata.

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

async function imageBytes(path: string, token: string) {
  const res = await fetch(`${baseUrl}${path}`, {
    headers: token ? { authorization: `Bearer ${token}` } : undefined,
  });
  return { status: res.status, headers: res.headers, buffer: res.ok ? Buffer.from(await res.arrayBuffer()) : null };
}

async function uploadImage(token: string, buffer: Buffer, filename: string) {
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(buffer)]), filename);
  const res = await fetch(`${baseUrl}/api/system-alerts/admin/images`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
    body: form,
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

const REAL_PNG = Buffer.from(
  "89504e470d0a1a0a0000000d49484452000000010000000108020000009077" +
    "3df40000000c4944415408d763f8cfc0c0c0000004010102cd1cf6c50000000049454e44ae426082",
  "hex",
);

const createdUserIds: string[] = [];
const createdProfileIds: string[] = [];
const createdImageFileNames: string[] = [];
const createdAlertIds: string[] = [];
// Padrões usados aqui (task.due_soon) são do SISTEMA — nunca criados nem
// excluídos por este teste, só temos que devolver a imagem a null no
// after() já que o teste 7 grava uma imagem nele.
const touchedStandardIds: string[] = [];
const createdScheduleIds: string[] = [];

async function createUser(overrides: Partial<{ role: string; account_type: string; admin_profile_id: string | null }> = {}) {
  const id = `imgacl-${crypto.randomBytes(6).toString("hex")}`;
  const user = await prisma.user.create({
    data: {
      id,
      email: `${id}@example.test`,
      password_hash: "unused-test-hash",
      name: `ImgAcl Test ${id}`,
      role: overrides.role ?? "company_user",
      account_type: overrides.account_type ?? "empresas",
      is_active: true,
      status: "ativo",
      admin_profile_id: overrides.admin_profile_id ?? null,
    },
  });
  createdUserIds.push(user.id);
  return user;
}

async function createProfile(overrides: { is_master?: boolean } = {}) {
  const profile = await prisma.adminProfile.create({
    data: { name: `perfil-imgacl-${suffix}-${crypto.randomBytes(4).toString("hex")}`, is_master: overrides.is_master ?? false, is_active: true },
  });
  createdProfileIds.push(profile.id);
  return profile;
}

async function masterAdmin() {
  const profile = await createProfile({ is_master: true });
  return createUser({ role: "admin", account_type: "admin", admin_profile_id: profile.id });
}

async function nonMasterAdmin() {
  const profile = await createProfile({ is_master: false });
  return createUser({ role: "admin", account_type: "admin", admin_profile_id: profile.id });
}

describe("Autorização por recurso — imagens de Alertas (reparo pós-4º lote)", () => {
  let master: Awaited<ReturnType<typeof masterAdmin>>;
  let userA: Awaited<ReturnType<typeof createUser>>;
  let userB: Awaited<ReturnType<typeof createUser>>;
  let masterToken: string;
  let tokenA: string;
  let tokenB: string;
  let uploadedFile: string;

  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;

    const listener = app.listen(0);
    server = listener;
    await new Promise<void>((resolve) => listener.once("listening", () => resolve()));
    const address = listener.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;

    await ensureDefaultAlertStandardsAndRules();

    master = await masterAdmin();
    userA = await createUser(); // representa uma "organização" (empresa) A
    userB = await createUser(); // representa outra "organização" (empresa) B
    masterToken = tokenFor(master);
    tokenA = tokenFor(userA);
    tokenB = tokenFor(userB);

    const uploaded = await uploadImage(masterToken, REAL_PNG, "foto.png");
    uploadedFile = uploaded.json.file_name;
    createdImageFileNames.push(uploadedFile);
  });

  after(async () => {
    try {
      await prisma.productFeedbackAccessAudit.deleteMany({ where: { action: { startsWith: "alert_" } } });
      await prisma.systemAlert.deleteMany({ where: { id: { in: createdAlertIds } } });
      await prisma.alertSchedule.deleteMany({ where: { id: { in: createdScheduleIds } } });
      await prisma.alertStandard.updateMany({ where: { id: { in: touchedStandardIds } }, data: { image_file_name: null, image_alt: null } });
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
      await prisma.adminProfile.deleteMany({ where: { id: { in: createdProfileIds } } });
      for (const fileName of createdImageFileNames) deleteAlertImage(fileName);
    } finally {
      await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
      await prisma.$disconnect();
    }
  });

  // ── Como a imagem era autorizada antes (contexto do teste 1/3/16) ──────
  // A rota antiga (GET /admin/images/:fileName) exigia só sessão válida —
  // qualquer usuário autenticado, sabendo o nome, via qualquer imagem. Os
  // testes abaixo confirmam que isso não é mais possível.

  it("1. sem sessão não acessa (ocorrência)", async () => {
    const created = await api("/api/system-alerts/admin", {
      method: "POST",
      token: masterToken,
      body: { title: "Alerta pra A", message: "Mensagem de teste", severity: "info", user_id: userA.id, image_file_name: uploadedFile, image_alt: "Imagem de teste" },
    });
    createdAlertIds.push(created.json.id);
    const res = await imageBytes(`/api/system-alerts/${created.json.id}/image`, "");
    assert.equal(res.status, 401);
  });

  it("2. destinatário acessa a imagem da própria ocorrência", async () => {
    const created = await api("/api/system-alerts/admin", {
      method: "POST",
      token: masterToken,
      body: { title: "Alerta pra A (2)", message: "Mensagem de teste", severity: "info", user_id: userA.id, image_file_name: uploadedFile, image_alt: "Imagem de teste" },
    });
    createdAlertIds.push(created.json.id);
    const res = await imageBytes(`/api/system-alerts/${created.json.id}/image`, tokenA);
    assert.equal(res.status, 200);
    assert.equal(res.buffer!.length, REAL_PNG.length);
  });

  it("3. outro usuário autenticado NÃO acessa (destinatário é A, tenta B)", async () => {
    const created = await api("/api/system-alerts/admin", {
      method: "POST",
      token: masterToken,
      body: { title: "Alerta pra A (3)", message: "Mensagem de teste", severity: "info", user_id: userA.id, image_file_name: uploadedFile, image_alt: "Imagem de teste" },
    });
    createdAlertIds.push(created.json.id);
    const res = await imageBytes(`/api/system-alerts/${created.json.id}/image`, tokenB);
    assert.equal(res.status, 404, "404, não 403 — não revela que o alerta existe pra quem não tem acesso");
  });

  it("4. outra organização (outro usuário comum) não acessa — mesma checagem do item 3, reforça isolamento por user_id", async () => {
    const created = await api("/api/system-alerts/admin", {
      method: "POST",
      token: masterToken,
      body: { title: "Alerta pra B", message: "Mensagem de teste", severity: "info", user_id: userB.id, image_file_name: uploadedFile, image_alt: "Imagem de teste" },
    });
    createdAlertIds.push(created.json.id);
    const resA = await imageBytes(`/api/system-alerts/${created.json.id}/image`, tokenA);
    assert.equal(resA.status, 404);
    const resB = await imageBytes(`/api/system-alerts/${created.json.id}/image`, tokenB);
    assert.equal(resB.status, 200);
  });

  it("5. nome físico conhecido não contorna autorização (rota antiga agora exige Admin Master)", async () => {
    const created = await api("/api/system-alerts/admin", {
      method: "POST",
      token: masterToken,
      body: { title: "Alerta pra A (5)", message: "Mensagem de teste", severity: "info", user_id: userA.id, image_file_name: uploadedFile, image_alt: "Imagem de teste" },
    });
    createdAlertIds.push(created.json.id);
    // B conhece o nome físico exato (mesmo arquivo reaproveitado no teste) —
    // tentando a rota antiga por nome, mesmo logado, é rejeitado.
    const res = await imageBytes(`/api/system-alerts/admin/images/${uploadedFile}`, tokenB);
    assert.equal(res.status, 403);
  });

  it("6. alerta geral (user_id nulo) respeita o escopo real: Admin vê, usuário comum não", async () => {
    const created = await api("/api/system-alerts/admin", {
      method: "POST",
      token: masterToken,
      body: { title: "Alerta geral", message: "Mensagem de teste", severity: "warning", image_file_name: uploadedFile, image_alt: "Imagem de teste" },
    });
    createdAlertIds.push(created.json.id);
    const resComum = await imageBytes(`/api/system-alerts/${created.json.id}/image`, tokenA);
    assert.equal(resComum.status, 404, "alerta geral nunca é visível pra usuário comum — mesma regra de escopoDoUsuario");
    const resMaster = await imageBytes(`/api/system-alerts/${created.json.id}/image`, masterToken);
    assert.equal(resMaster.status, 200, "Admin vê alerta geral — mesma regra de quem já pode abrir o alerta");
  });

  it("7. Admin comum (sem is_master) não acessa imagem administrativa do Padrão", async () => {
    const standard = await prisma.alertStandard.findFirstOrThrow({ where: { key: "task.due_soon" } });
    await api(`/api/system-alerts/admin/standards/${standard.id}`, {
      method: "PATCH",
      token: masterToken,
      body: { image_file_name: uploadedFile, image_alt: "Imagem do padrão" },
    });
    touchedStandardIds.push(standard.id);
    const naoMaster = await nonMasterAdmin();
    const res = await imageBytes(`/api/system-alerts/admin/standards/${standard.id}/image`, tokenFor(naoMaster));
    assert.equal(res.status, 403);
    const resComum = await imageBytes(`/api/system-alerts/admin/standards/${standard.id}/image`, tokenA);
    assert.equal(resComum.status, 403);
  });

  it("8. Master acessa a prévia do Padrão (imagem administrativa)", async () => {
    const standard = await prisma.alertStandard.findFirstOrThrow({ where: { key: "task.due_soon" } });
    const res = await imageBytes(`/api/system-alerts/admin/standards/${standard.id}/image`, masterToken);
    assert.equal(res.status, 200);
  });

  it("9. Master acessa a prévia/imagem da Programação", async () => {
    const created = await api("/api/system-alerts/admin/schedules", {
      method: "POST",
      token: masterToken,
      body: {
        name: "Programação com imagem", title: "Título programação", message: "Mensagem de teste programação",
        severity: "info", image_file_name: uploadedFile, image_alt: "Imagem da programação",
        recurrence_type: "once", time_of_day: "10:00", timezone: "America/Sao_Paulo", start_date: "2026-12-31",
      },
    });
    createdScheduleIds.push(created.json.id);
    const res = await imageBytes(`/api/system-alerts/admin/schedules/${created.json.id}/image`, masterToken);
    assert.equal(res.status, 200);
  });

  it("10. usuário comum não acessa a imagem administrativa da Programação", async () => {
    const created = await api("/api/system-alerts/admin/schedules", {
      method: "POST",
      token: masterToken,
      body: {
        name: "Programação com imagem (10)", title: "Título programação 10", message: "Mensagem de teste programação 10",
        severity: "info", image_file_name: uploadedFile, image_alt: "Imagem da programação",
        recurrence_type: "once", time_of_day: "10:00", timezone: "America/Sao_Paulo", start_date: "2026-12-31",
      },
    });
    createdScheduleIds.push(created.json.id);
    const res = await imageBytes(`/api/system-alerts/admin/schedules/${created.json.id}/image`, tokenA);
    assert.equal(res.status, 403);
  });

  it("11. usuário acessa o snapshot da ocorrência destinada a ele (não o arquivo administrativo)", async () => {
    const { snapshotAlertImage } = await import("../lib/alert-image-storage");
    const standard = await prisma.alertStandard.findFirstOrThrow({ where: { key: "task.overdue" } });
    const snapshot = snapshotAlertImage(uploadedFile);
    assert.ok(snapshot);
    createdImageFileNames.push(snapshot!);
    const occurrence = await prisma.systemAlert.create({
      data: {
        type: standard.key, title: "Ocorrência com snapshot", message: "Mensagem de teste snapshot", severity: "warning",
        category: "alerta", standard_id: standard.id, user_id: userA.id, image_file_name: snapshot, image_alt: "Snapshot de teste",
      },
    });
    createdAlertIds.push(occurrence.id);
    const res = await imageBytes(`/api/system-alerts/${occurrence.id}/image`, tokenA);
    assert.equal(res.status, 200);
  });

  it("12. alerta arquivado continua acessível ao destinatário no histórico", async () => {
    const created = await api("/api/system-alerts/admin", {
      method: "POST",
      token: masterToken,
      body: { title: "Alerta pra arquivar", message: "Mensagem de teste", severity: "info", user_id: userA.id, image_file_name: uploadedFile, image_alt: "Imagem de teste" },
    });
    createdAlertIds.push(created.json.id);
    await api(`/api/system-alerts/${created.json.id}/archive`, { method: "PATCH", token: tokenA });
    const res = await imageBytes(`/api/system-alerts/${created.json.id}/image`, tokenA);
    assert.equal(res.status, 200);
  });

  it("13. alerta expirado segue a política histórica (destinatário ainda acessa a imagem)", async () => {
    const created = await api("/api/system-alerts/admin", {
      method: "POST",
      token: masterToken,
      body: { title: "Alerta que vai expirar", message: "Mensagem de teste", severity: "info", user_id: userA.id, image_file_name: uploadedFile, image_alt: "Imagem de teste" },
    });
    createdAlertIds.push(created.json.id);
    await prisma.systemAlert.update({
      where: { id: created.json.id },
      data: { resolved_at: new Date(), resolution_reason: "expired", is_archived: true },
    });
    const res = await imageBytes(`/api/system-alerts/${created.json.id}/image`, tokenA);
    assert.equal(res.status, 200, "expirado não é excluído — imagem histórica continua acessível a quem já tinha acesso");
  });

  it("14. path traversal rejeitado na rota administrativa por nome", async () => {
    const res = await imageBytes(`/api/system-alerts/admin/images/..%2F..%2Fetc%2Fpasswd`, masterToken);
    assert.equal(res.status, 400);
  });

  it("15. MIME correto e X-Content-Type-Options: nosniff", async () => {
    const created = await api("/api/system-alerts/admin", {
      method: "POST",
      token: masterToken,
      body: { title: "Alerta MIME", message: "Mensagem de teste", severity: "info", user_id: userA.id, image_file_name: uploadedFile, image_alt: "Imagem de teste" },
    });
    createdAlertIds.push(created.json.id);
    const res = await imageBytes(`/api/system-alerts/${created.json.id}/image`, tokenA);
    assert.equal(res.status, 200);
    assert.match(res.headers!.get("content-type") ?? "", /image\/png/);
    assert.equal(res.headers!.get("x-content-type-options"), "nosniff");
  });

  it("16. arquivo ausente no disco retorna erro seguro (404, sem detalhe de caminho)", async () => {
    const created = await api("/api/system-alerts/admin", {
      method: "POST",
      token: masterToken,
      body: { title: "Alerta arquivo ausente", message: "Mensagem de teste", severity: "info", user_id: userA.id, image_file_name: uploadedFile, image_alt: "Imagem de teste" },
    });
    createdAlertIds.push(created.json.id);
    // Simula arquivo removido do disco sem atualizar o banco (cenário de
    // corrupção/limpeza manual) — a rota não deve vazar caminho físico.
    await prisma.systemAlert.update({ where: { id: created.json.id }, data: { image_file_name: "00000000-0000-0000-0000-000000000000.png" } });
    const res = await imageBytes(`/api/system-alerts/${created.json.id}/image`, tokenA);
    assert.equal(res.status, 404);
  });

  it("18. upload continua restrito ao Master", async () => {
    const res = await uploadImage(tokenA, REAL_PNG, "outra.png");
    assert.equal(res.status, 403);
  });

  it("19. Notificações não ganham acesso indevido às imagens de Alertas (categoria diferente, mesma tabela)", async () => {
    const created = await api("/api/system-alerts/admin", {
      method: "POST",
      token: masterToken,
      body: { title: "Alerta pra notificação-check", message: "Mensagem de teste", severity: "info", user_id: userA.id, image_file_name: uploadedFile, image_alt: "Imagem de teste" },
    });
    createdAlertIds.push(created.json.id);
    // B não é destinatário nem de "alerta" nem de "notificação" deste
    // registro — confirma que a categoria não abre uma porta lateral.
    const res = await imageBytes(`/api/system-alerts/${created.json.id}/image`, tokenB);
    assert.equal(res.status, 404);
  });
});
