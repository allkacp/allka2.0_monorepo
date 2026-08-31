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

// Governança do Admin Master sobre os Padrões de Alerta (ata 2026-08, bloco
// 2/5). Um padrão OBRIGATÓRIO não pode ser desativado nem ter a criticidade
// reduzida por ninguém abaixo de Admin Master — a proteção é no servidor. A
// camada de preferência pessoal reaplica a mesma regra para os event_types
// governados.

const suffix = `${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
let baseUrl = "";
let server: import("node:http").Server;

function tokenFor(u: { id: string; email: string; role: string; account_type: string }) {
  return jwt.sign(
    { id: u.id, email: u.email, role: u.role, account_type: u.account_type },
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

async function createUser(overrides: Partial<{ role: string; account_type: string; admin_profile_id: string | null }> = {}) {
  const id = `gov-${crypto.randomBytes(6).toString("hex")}`;
  const user = await prisma.user.create({
    data: {
      id,
      email: `${id}@example.test`,
      password_hash: "unused-test-hash",
      name: `Gov Test ${id}`,
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

async function masterAdmin() {
  const profile = await prisma.adminProfile.create({
    data: { name: `gov-master-${suffix}-${crypto.randomBytes(4).toString("hex")}`, is_master: true, is_active: true },
  });
  createdProfileIds.push(profile.id);
  return createUser({ role: "admin", account_type: "admin", admin_profile_id: profile.id });
}

async function plainAdmin() {
  // Admin com perfil NÃO-master e sem nenhuma permissão concedida.
  const profile = await prisma.adminProfile.create({
    data: { name: `gov-plain-${suffix}-${crypto.randomBytes(4).toString("hex")}`, is_master: false, is_active: true },
  });
  createdProfileIds.push(profile.id);
  return createUser({ role: "admin", account_type: "admin", admin_profile_id: profile.id });
}

let master: Awaited<ReturnType<typeof createUser>>;
let masterToken = "";
let standardId = "";
let ruleId = "";

/** Deixa o padrão de teste num estado limpo entre casos. */
async function resetStandard() {
  await prisma.alertStandard.update({
    where: { id: standardId },
    data: {
      is_mandatory: false,
      mandatory_min_severity: null,
      personal_prefs_allowed: true,
      additional_channels_json: null,
      governed_event_types_json: null,
      is_active: true,
      default_severity: "error",
      mandatory_set_by_id: null,
      mandatory_set_at: null,
    },
  });
  await prisma.alertRule.updateMany({ where: { standard_id: standardId }, data: { is_active: true, severity_override: null } });
}

describe("Governança do Admin Master sobre os Padrões de Alerta", () => {
  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    const listener = app.listen(0);
    server = listener;
    await new Promise<void>((resolve) => listener.once("listening", () => resolve()));
    baseUrl = `http://127.0.0.1:${(listener.address() as AddressInfo).port}`;
    await ensureDefaultAlertStandardsAndRules();

    master = await masterAdmin();
    masterToken = tokenFor(master);
    const standards = await api("/api/system-alerts/admin/standards", { token: masterToken });
    assert.equal(standards.status, 200);
    const overdue = standards.json.data.find((s: any) => s.key === "task.overdue");
    assert.ok(overdue, "padrão task.overdue existe");
    standardId = overdue.id;
    const rules = await api("/api/system-alerts/admin/rules", { token: masterToken });
    ruleId = rules.json.data.find((r: any) => r.standard_id === standardId)?.id;
    assert.ok(ruleId, "regra do padrão task.overdue existe");
  });

  after(async () => {
    await resetStandard().catch(() => {});
    await prisma.notificationPreference.deleteMany({ where: { user_id: { in: createdUserIds } } });
    await prisma.productFeedbackAccessAudit.deleteMany({ where: { actor_id: { in: createdUserIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.adminProfile.deleteMany({ where: { id: { in: createdProfileIds } } });
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    await prisma.$disconnect();
  });

  it("1. Admin Master cria/edita um padrão obrigatório", async () => {
    await resetStandard();
    const r = await api(`/api/system-alerts/admin/standards/${standardId}`, {
      method: "PATCH",
      token: masterToken,
      body: { is_mandatory: true, mandatory_min_severity: "error", governed_event_types: ["tarefa_atraso"], additional_channels: ["email"] },
    });
    assert.equal(r.status, 200);
    assert.equal(r.json.is_mandatory, true);
    assert.equal(r.json.mandatory_min_severity, "error");
    assert.deepEqual(r.json.governed_event_types, ["tarefa_atraso"]);
    const fresh = await prisma.alertStandard.findUnique({ where: { id: standardId } });
    assert.equal(fresh?.mandatory_set_by_id, master.id);
    assert.ok(fresh?.mandatory_set_at);
  });

  it("2. Admin comum (perfil não-master, sem grant) é bloqueado no padrão — 403", async () => {
    const admin = await plainAdmin();
    const r = await api(`/api/system-alerts/admin/standards/${standardId}`, {
      method: "PATCH",
      token: tokenFor(admin),
      body: { is_active: false },
    });
    assert.equal(r.status, 403);
  });

  it("3. Líder é bloqueado no padrão global — 403 (chamada direta também)", async () => {
    const lider = await createUser({ role: "lider", account_type: "lider" });
    const r = await api(`/api/system-alerts/admin/standards/${standardId}`, {
      method: "PATCH",
      token: tokenFor(lider),
      body: { default_severity: "info" },
    });
    assert.equal(r.status, 403);
  });

  it("3b. Usuário final é bloqueado no padrão — 403", async () => {
    const user = await createUser();
    const r = await api(`/api/system-alerts/admin/standards/${standardId}`, {
      method: "PATCH",
      token: tokenFor(user),
      body: { is_mandatory: false },
    });
    assert.equal(r.status, 403);
  });

  it("4. Preferência pessoal não reduz o mínimo obrigatório — canais travados", async () => {
    await resetStandard();
    await api(`/api/system-alerts/admin/standards/${standardId}`, {
      method: "PATCH",
      token: masterToken,
      body: { is_mandatory: true, personal_prefs_allowed: false, governed_event_types: ["tarefa_atraso"] },
    });
    const user = await createUser();
    const r = await api("/api/notification-preferences", {
      method: "PUT",
      token: tokenFor(user),
      body: { event_type: "tarefa_atraso", channels: { email: true } },
    });
    assert.equal(r.status, 400);
    assert.match(r.json.error, /obrigatório/i);
  });

  it("5. Criticidade obrigatória não é reduzida — default_severity abaixo do piso é 409", async () => {
    await resetStandard();
    await api(`/api/system-alerts/admin/standards/${standardId}`, {
      method: "PATCH",
      token: masterToken,
      body: { is_mandatory: true, mandatory_min_severity: "error" },
    });
    const r = await api(`/api/system-alerts/admin/standards/${standardId}`, {
      method: "PATCH",
      token: masterToken,
      body: { default_severity: "warning" },
    });
    assert.equal(r.status, 409);
    assert.match(r.json.error, /criticidade abaixo/i);
  });

  it("5b. Padrão obrigatório não pode ser desativado — 409", async () => {
    await resetStandard();
    await api(`/api/system-alerts/admin/standards/${standardId}`, {
      method: "PATCH",
      token: masterToken,
      body: { is_mandatory: true },
    });
    const r = await api(`/api/system-alerts/admin/standards/${standardId}`, {
      method: "PATCH",
      token: masterToken,
      body: { is_active: false },
    });
    assert.equal(r.status, 409);
    assert.match(r.json.error, /não pode ser desativado/i);
  });

  it("6. Regra de padrão obrigatório não pode ser desativada nem rebaixada — 409", async () => {
    await resetStandard();
    await api(`/api/system-alerts/admin/standards/${standardId}`, {
      method: "PATCH",
      token: masterToken,
      body: { is_mandatory: true, mandatory_min_severity: "error" },
    });
    const off = await api(`/api/system-alerts/admin/rules/${ruleId}`, {
      method: "PATCH",
      token: masterToken,
      body: { is_active: false },
    });
    assert.equal(off.status, 409);
    const down = await api(`/api/system-alerts/admin/rules/${ruleId}`, {
      method: "PATCH",
      token: masterToken,
      body: { severity_override: "warning" },
    });
    assert.equal(down.status, 409);
  });

  it("7. GET /notification-preferences explica a trava (governance map + motivo)", async () => {
    await resetStandard();
    await api(`/api/system-alerts/admin/standards/${standardId}`, {
      method: "PATCH",
      token: masterToken,
      body: { is_mandatory: true, personal_prefs_allowed: true, additional_channels: ["email"], governed_event_types: ["tarefa_atraso"] },
    });
    const user = await createUser();
    const prefs = await api("/api/notification-preferences", { token: tokenFor(user) });
    assert.equal(prefs.status, 200);
    const gov = prefs.json.governance?.["tarefa_atraso"];
    assert.ok(gov, "event_type governado aparece no mapa");
    assert.equal(gov.mandatory, true);
    assert.match(gov.reason, /Admin Master/);
    assert.ok(gov.locked_channels.includes("in_app"));
    assert.deepEqual(gov.toggleable_channels, ["email"]);

    // O canal adicional permitido pode ser ligado; um fora da lista, não.
    const ok = await api("/api/notification-preferences", {
      method: "PUT",
      token: tokenFor(user),
      body: { event_type: "tarefa_atraso", channels: { email: true } },
    });
    assert.equal(ok.status, 200);
    const bad = await api("/api/notification-preferences", {
      method: "PUT",
      token: tokenFor(user),
      body: { event_type: "tarefa_atraso", channels: { whatsapp: true } },
    });
    assert.equal(bad.status, 400);
    const inapp = await api("/api/notification-preferences", {
      method: "PUT",
      token: tokenFor(user),
      body: { event_type: "tarefa_atraso", channels: { in_app: false } },
    });
    assert.equal(inapp.status, 400);
  });

  it("8. Toda alteração administrativa gera auditoria (antes/depois)", async () => {
    await resetStandard();
    await prisma.productFeedbackAccessAudit.deleteMany({ where: { actor_id: master.id } });
    await api(`/api/system-alerts/admin/standards/${standardId}`, {
      method: "PATCH",
      token: masterToken,
      body: { is_mandatory: true, mandatory_min_severity: "error" },
    });
    const audits = await prisma.productFeedbackAccessAudit.findMany({ where: { actor_id: master.id } });
    const row = audits.find((a) => a.action === "alert_standard.mandatory_set");
    assert.ok(row, "auditoria alert_standard.mandatory_set gravada");
    const before = JSON.parse(row!.before_json ?? "{}");
    const afterJson = JSON.parse(row!.after_json ?? "{}");
    assert.equal(before.is_mandatory, false);
    assert.equal(afterJson.is_mandatory, true);
  });
});
