import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import app from "../app";
import { prisma } from "../lib/prisma";
import { config } from "../config";

// Lote "Central de Alertas" (ata 2026-08): Admin Master cria/edita/
// reclassifica/arquiva SystemAlert reais via PATCH/POST /api/system-alerts/
// admin/*. Estritamente Admin Master (nunca a regra do avô de
// requirePermission, nunca outro Admin com permissão granular) — testa
// exatamente essa distinção contra um banco local descartável.

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
const createdAlertIds: string[] = [];

async function createUser(overrides: Partial<{
  role: string;
  account_type: string;
  admin_profile_id: string | null;
  is_active: boolean;
}> = {}) {
  const id = `alerts-admin-${crypto.randomBytes(6).toString("hex")}`;
  const user = await prisma.user.create({
    data: {
      id,
      email: `${id}@example.test`,
      password_hash: "unused-test-hash",
      name: `Alerts Admin Test ${id}`,
      role: overrides.role ?? "company_user",
      account_type: overrides.account_type ?? "empresas",
      is_active: overrides.is_active ?? true,
      status: "ativo",
      admin_profile_id: overrides.admin_profile_id ?? null,
    },
  });
  createdUserIds.push(user.id);
  return user;
}

async function createProfile(overrides: { is_master?: boolean } = {}) {
  const profile = await prisma.adminProfile.create({
    data: {
      name: `perfil-alertas-${suffix}-${crypto.randomBytes(4).toString("hex")}`,
      is_master: overrides.is_master ?? false,
      is_active: true,
    },
  });
  createdProfileIds.push(profile.id);
  return profile;
}

async function masterAdmin() {
  const profile = await createProfile({ is_master: true });
  return createUser({ role: "admin", account_type: "admin", admin_profile_id: profile.id });
}

async function createAlert(overrides: {
  user_id?: string | null;
  severity?: "info" | "warning" | "error";
  category?: "alerta" | "notificacao";
  title?: string;
  message?: string;
  is_archived?: boolean;
}) {
  const alert = await prisma.systemAlert.create({
    data: {
      type: overrides.category === "notificacao" ? `teste_notif_${suffix}` : "alerta_admin_manual",
      title: overrides.title ?? `Alerta teste ${suffix}`,
      message: overrides.message ?? "Mensagem de teste",
      severity: overrides.severity ?? "warning",
      category: overrides.category ?? "alerta",
      user_id: overrides.user_id ?? null,
      is_archived: overrides.is_archived ?? false,
    },
  });
  createdAlertIds.push(alert.id);
  return alert;
}

describe("Central de Alertas — /api/system-alerts/admin (ata 2026-08)", () => {
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
    await prisma.productFeedbackAccessAudit.deleteMany({ where: { action: { startsWith: "system_alert." } } });
    await prisma.systemAlert.deleteMany({ where: { id: { in: createdAlertIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.adminProfile.deleteMany({ where: { id: { in: createdProfileIds } } });
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    await prisma.$disconnect();
  });

  it("1. sem sessão -> 401", async () => {
    const res = await api("/api/system-alerts/admin", {
      method: "POST",
      body: { title: "Título válido", message: "Mensagem válida", severity: "info" },
    });
    assert.equal(res.status, 401);
  });

  it("2. usuário comum -> 403", async () => {
    const user = await createUser({ role: "company_user", account_type: "empresas" });
    const res = await api("/api/system-alerts/admin", {
      method: "POST",
      token: tokenFor(user),
      body: { title: "Título válido", message: "Mensagem válida", severity: "info" },
    });
    assert.equal(res.status, 403);
  });

  it("3. admin SEM perfil atribuído (regra do avô de requirePermission) -> 403 — a central é estritamente Master, não usa o avô", async () => {
    const user = await createUser({ role: "admin", account_type: "admin", admin_profile_id: null });
    const res = await api("/api/system-alerts/admin", {
      method: "POST",
      token: tokenFor(user),
      body: { title: "Título válido", message: "Mensagem válida", severity: "info" },
    });
    assert.equal(res.status, 403);
  });

  it("3b. admin com perfil NÃO master -> 403", async () => {
    const profile = await createProfile({ is_master: false });
    const user = await createUser({ role: "admin", account_type: "admin", admin_profile_id: profile.id });
    const res = await api("/api/system-alerts/admin", {
      method: "POST",
      token: tokenFor(user),
      body: { title: "Título válido", message: "Mensagem válida", severity: "info" },
    });
    assert.equal(res.status, 403);
  });

  it("4. sucesso para Admin Master", async () => {
    const master = await masterAdmin();
    const res = await api("/api/system-alerts/admin", {
      method: "POST",
      token: tokenFor(master),
      body: { title: "Alerta de teste", message: "Mensagem de teste", severity: "info" },
    });
    assert.equal(res.status, 201);
    createdAlertIds.push(res.json.id);
  });

  it("5. título vazio -> 400", async () => {
    const master = await masterAdmin();
    const res = await api("/api/system-alerts/admin", {
      method: "POST",
      token: tokenFor(master),
      body: { title: "  ", message: "Mensagem válida", severity: "info" },
    });
    assert.equal(res.status, 400);
  });

  it("6. mensagem vazia -> 400", async () => {
    const master = await masterAdmin();
    const res = await api("/api/system-alerts/admin", {
      method: "POST",
      token: tokenFor(master),
      body: { title: "Título válido", message: "  ", severity: "info" },
    });
    assert.equal(res.status, 400);
  });

  it("7. criticidade inválida -> 400", async () => {
    const master = await masterAdmin();
    const res = await api("/api/system-alerts/admin", {
      method: "POST",
      token: tokenFor(master),
      body: { title: "Título válido", message: "Mensagem válida", severity: "roxo" },
    });
    assert.equal(res.status, 400);
  });

  it("8. destinatário inexistente -> 400", async () => {
    const master = await masterAdmin();
    const res = await api("/api/system-alerts/admin", {
      method: "POST",
      token: tokenFor(master),
      body: { title: "Título válido", message: "Mensagem válida", severity: "info", user_id: "usuario-que-nao-existe" },
    });
    assert.equal(res.status, 400);
  });

  it("9. destinatário inativo (fora do escopo permitido) -> 400", async () => {
    const master = await masterAdmin();
    const inactive = await createUser({ is_active: false });
    const res = await api("/api/system-alerts/admin", {
      method: "POST",
      token: tokenFor(master),
      body: { title: "Título válido", message: "Mensagem válida", severity: "info", user_id: inactive.id },
    });
    assert.equal(res.status, 400);
  });

  it("10/11/12. criação Verde (info), Amarela (warning) e Vermelha (error)", async () => {
    const master = await masterAdmin();
    for (const severity of ["info", "warning", "error"] as const) {
      const res = await api("/api/system-alerts/admin", {
        method: "POST",
        token: tokenFor(master),
        body: { title: `Alerta ${severity}`, message: "Mensagem de teste", severity },
      });
      assert.equal(res.status, 201);
      assert.equal(res.json.severity, severity);
      assert.equal(res.json.category, "alerta");
      createdAlertIds.push(res.json.id);
    }
  });

  it("destinatário específico válido é aceito e retornado no campo destinatario", async () => {
    const master = await masterAdmin();
    const target = await createUser();
    const res = await api("/api/system-alerts/admin", {
      method: "POST",
      token: tokenFor(master),
      body: { title: "Alerta pessoal", message: "Só pra você", severity: "warning", user_id: target.id },
    });
    assert.equal(res.status, 201);
    assert.equal(res.json.user_id, target.id);
    assert.equal(res.json.destinatario?.id, target.id);
    createdAlertIds.push(res.json.id);
  });

  it("13. edição mantém campos não alterados (edita só a mensagem, título permanece)", async () => {
    const master = await masterAdmin();
    const alert = await createAlert({ title: "Título original", message: "Mensagem original" });
    const res = await api(`/api/system-alerts/admin/${alert.id}`, {
      method: "PATCH",
      token: tokenFor(master),
      body: { message: "Mensagem editada" },
    });
    assert.equal(res.status, 200);
    assert.equal(res.json.title, "Título original");
    assert.equal(res.json.message, "Mensagem editada");
  });

  it("14/15. reclassificação atualiza o MESMO registro, sem duplicar", async () => {
    const master = await masterAdmin();
    const alert = await createAlert({ severity: "info" });
    const before = await prisma.systemAlert.count({ where: { category: "alerta" } });

    const res = await api(`/api/system-alerts/admin/${alert.id}/severity`, {
      method: "PATCH",
      token: tokenFor(master),
      body: { severity: "error" },
    });
    assert.equal(res.status, 200);
    assert.equal(res.json.id, alert.id, "reclassificar atualiza o mesmo id, nunca cria outro");
    assert.equal(res.json.severity, "error");

    const after = await prisma.systemAlert.count({ where: { category: "alerta" } });
    assert.equal(after, before, "reclassificar não deve criar uma ocorrência nova");
  });

  it("16. arquivamento administrativo não exclui fisicamente", async () => {
    const master = await masterAdmin();
    const alert = await createAlert({});
    const res = await api(`/api/system-alerts/admin/${alert.id}/archive`, {
      method: "PATCH",
      token: tokenFor(master),
    });
    assert.equal(res.status, 200);
    assert.equal(res.json.is_archived, true);
    const stillThere = await prisma.systemAlert.findUnique({ where: { id: alert.id } });
    assert.ok(stillThere, "o registro precisa continuar existindo no banco");
  });

  it("unarchive administrativo reverte o arquivamento", async () => {
    const master = await masterAdmin();
    const alert = await createAlert({ is_archived: true });
    const res = await api(`/api/system-alerts/admin/${alert.id}/unarchive`, {
      method: "PATCH",
      token: tokenFor(master),
    });
    assert.equal(res.status, 200);
    assert.equal(res.json.is_archived, false);
  });

  it("17. auditoria registra a criação", async () => {
    const master = await masterAdmin();
    const res = await api("/api/system-alerts/admin", {
      method: "POST",
      token: tokenFor(master),
      body: { title: "Alerta auditado", message: "Mensagem auditada", severity: "info" },
    });
    createdAlertIds.push(res.json.id);
    const auditRow = await prisma.productFeedbackAccessAudit.findFirst({
      where: { action: "system_alert.created", actor_id: master.id },
      orderBy: { created_at: "desc" },
    });
    assert.ok(auditRow);
    assert.ok(auditRow?.after_json?.includes(res.json.id));
  });

  it("18. auditoria registra a edição", async () => {
    const master = await masterAdmin();
    const alert = await createAlert({ title: "Antes de editar" });
    await api(`/api/system-alerts/admin/${alert.id}`, {
      method: "PATCH",
      token: tokenFor(master),
      body: { title: "Depois de editar" },
    });
    const auditRow = await prisma.productFeedbackAccessAudit.findFirst({
      where: { action: "system_alert.updated", actor_id: master.id },
      orderBy: { created_at: "desc" },
    });
    assert.ok(auditRow);
    assert.ok(auditRow?.before_json?.includes("Antes de editar"));
    assert.ok(auditRow?.after_json?.includes("Depois de editar"));
  });

  it("19. auditoria registra a reclassificação com criticidade anterior e nova", async () => {
    const master = await masterAdmin();
    const alert = await createAlert({ severity: "warning" });
    await api(`/api/system-alerts/admin/${alert.id}/severity`, {
      method: "PATCH",
      token: tokenFor(master),
      body: { severity: "error" },
    });
    const auditRow = await prisma.productFeedbackAccessAudit.findFirst({
      where: { action: "system_alert.severity_changed", actor_id: master.id },
      orderBy: { created_at: "desc" },
    });
    assert.ok(auditRow);
    assert.ok(auditRow?.before_json?.includes("warning"));
    assert.ok(auditRow?.after_json?.includes("error"));
  });

  it("20. auditoria registra o arquivamento", async () => {
    const master = await masterAdmin();
    const alert = await createAlert({});
    await api(`/api/system-alerts/admin/${alert.id}/archive`, { method: "PATCH", token: tokenFor(master) });
    const auditRow = await prisma.productFeedbackAccessAudit.findFirst({
      where: { action: "system_alert.archived", actor_id: master.id },
      orderBy: { created_at: "desc" },
    });
    assert.ok(auditRow);
  });

  it("21. operação em alerta não altera uma notificação existente", async () => {
    const master = await masterAdmin();
    const notif = await createAlert({ category: "notificacao", title: "Notificação intocada" });
    const alert = await createAlert({});

    await api(`/api/system-alerts/admin/${alert.id}/severity`, {
      method: "PATCH",
      token: tokenFor(master),
      body: { severity: "error" },
    });

    const notifAfter = await prisma.systemAlert.findUnique({ where: { id: notif.id } });
    assert.equal(notifAfter?.title, "Notificação intocada");
    assert.equal(notifAfter?.category, "notificacao");
  });

  it("22. isolamento: a listagem administrativa (GET /admin) enxerga alertas endereçados a qualquer usuário, mas a rota de edição também exige Master mesmo para um alerta de outro usuário", async () => {
    const master = await masterAdmin();
    const someoneElse = await createUser();
    const alert = await createAlert({ user_id: someoneElse.id, title: "Alerta de outra pessoa" });

    const listRes = await api("/api/system-alerts/admin", { token: tokenFor(master) });
    assert.equal(listRes.status, 200);
    assert.ok(listRes.json.data.some((a: any) => a.id === alert.id));

    const commonUser = await createUser({ role: "company_user", account_type: "empresas" });
    const editAsCommon = await api(`/api/system-alerts/admin/${alert.id}`, {
      method: "PATCH",
      token: tokenFor(commonUser),
      body: { title: "Tentativa não autorizada" },
    });
    assert.equal(editAsCommon.status, 403);
  });

  it("23. título/mensagem com HTML/script são armazenados como texto simples (sem quebrar), seguros porque o frontend nunca usa dangerouslySetInnerHTML pra este campo", async () => {
    const master = await masterAdmin();
    const payload = { title: "<script>alert(1)</script>", message: "<img src=x onerror=alert(1)>", severity: "warning" as const };
    const res = await api("/api/system-alerts/admin", {
      method: "POST",
      token: tokenFor(master),
      body: payload,
    });
    assert.equal(res.status, 201);
    // Armazenado literalmente — a segurança vem do React escapar
    // automaticamente ao renderizar {alert.title}/{alert.message} como
    // texto puro (padrão já confirmado em alerts-panel.tsx), não de
    // stripping no servidor.
    assert.equal(res.json.title, payload.title);
    assert.equal(res.json.message, payload.message);
    createdAlertIds.push(res.json.id);
  });
});
