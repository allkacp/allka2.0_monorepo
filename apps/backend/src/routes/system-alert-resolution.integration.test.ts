import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import app from "../app";
import { prisma } from "../lib/prisma";
import { config } from "../config";

// Resolução formal de alerta crítico (ata 2026-08, 10º lote): um alerta
// vermelho/crítico não pode desaparecer só por dispensa/arquivamento — só
// por POST /:id/resolve, com autor/ação/descrição registrados e
// transacionais/idempotentes. Verde/amarelo continuam com o comportamento
// anterior.

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

async function createUser(overrides: Partial<{ role: string; account_type: string; admin_profile_id: string | null; name: string }> = {}) {
  const id = `alert-resolve-${crypto.randomBytes(6).toString("hex")}`;
  const user = await prisma.user.create({
    data: {
      id,
      email: `${id}@example.test`,
      password_hash: "unused-test-hash",
      name: overrides.name ?? `Alert Resolve Test ${id}`,
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
    data: {
      name: `perfil-resolve-${suffix}-${crypto.randomBytes(4).toString("hex")}`,
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

async function createAlert(overrides: { severity?: "info" | "warning" | "error"; user_id?: string | null } = {}) {
  const alert = await prisma.systemAlert.create({
    data: {
      type: "alerta_admin_manual",
      title: `Alerta teste resolução ${suffix}-${crypto.randomBytes(3).toString("hex")}`,
      message: "Mensagem de teste",
      severity: overrides.severity ?? "error",
      category: "alerta",
      user_id: overrides.user_id ?? null,
    },
  });
  createdAlertIds.push(alert.id);
  return alert;
}

const validBody = () => ({
  action: "correcao_aplicada",
  description: "Descrição de teste com mais de dez caracteres.",
  client_action_id: crypto.randomUUID(),
});

describe("Resolução formal de alerta crítico — POST /:id/resolve (ata 2026-08, 10º lote)", () => {
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
    await prisma.systemAlertEvent.deleteMany({ where: { alert_id: { in: createdAlertIds } } });
    await prisma.systemAlert.deleteMany({ where: { id: { in: createdAlertIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.adminProfile.deleteMany({ where: { id: { in: createdProfileIds } } });
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    await prisma.$disconnect();
  });

  // ── Regra principal: bloqueio de arquivar/dispensar ──────────────────────

  it("1. vermelho não resolvido não pode ser arquivado (PATCH /:id/archive -> 409)", async () => {
    const master = await masterAdmin();
    const alert = await createAlert({ user_id: master.id });
    const res = await api(`/api/system-alerts/${alert.id}/archive`, { method: "PATCH", token: tokenFor(master) });
    assert.equal(res.status, 409);
    assert.equal(res.json.requires_resolution, true);
  });

  it("2. vermelho não resolvido não pode ser dispensado (PATCH /:id/read -> 409)", async () => {
    const master = await masterAdmin();
    const alert = await createAlert({ user_id: master.id });
    const res = await api(`/api/system-alerts/${alert.id}/read`, { method: "PATCH", token: tokenFor(master) });
    assert.equal(res.status, 409);
    assert.equal(res.json.requires_resolution, true);
  });

  it("vermelho não resolvido não pode ser arquivado pela rota administrativa também", async () => {
    const master = await masterAdmin();
    const alert = await createAlert({});
    const res = await api(`/api/system-alerts/admin/${alert.id}/archive`, { method: "PATCH", token: tokenFor(master) });
    assert.equal(res.status, 409);
    assert.equal(res.json.requires_resolution, true);
  });

  it("PATCH /read-all nunca dispensa vermelho sem resolução, mesmo em lote", async () => {
    const master = await masterAdmin();
    const alert = await createAlert({ user_id: master.id });
    await api("/api/system-alerts/read-all", { method: "PATCH", token: tokenFor(master) });
    const stillUnread = await prisma.systemAlert.findUnique({ where: { id: alert.id }, select: { is_read: true } });
    assert.equal(stillUnread?.is_read, false);
  });

  it("22. verde/amarelo continuam arquivando/dispensando normalmente", async () => {
    const master = await masterAdmin();
    const green = await createAlert({ severity: "info", user_id: master.id });
    const yellow = await createAlert({ severity: "warning", user_id: master.id });
    const archiveRes = await api(`/api/system-alerts/${green.id}/archive`, { method: "PATCH", token: tokenFor(master) });
    assert.equal(archiveRes.status, 200);
    const readRes = await api(`/api/system-alerts/${yellow.id}/read`, { method: "PATCH", token: tokenFor(master) });
    assert.equal(readRes.status, 200);
  });

  // ── Formulário / validação ────────────────────────────────────────────────

  it("5. ação ausente -> 400", async () => {
    const master = await masterAdmin();
    const alert = await createAlert({ user_id: master.id });
    const body = validBody();
    const res = await api(`/api/system-alerts/${alert.id}/resolve`, { method: "POST", token: tokenFor(master), body: { description: body.description, client_action_id: body.client_action_id } });
    assert.equal(res.status, 400);
  });

  it("6/7. descrição ausente ou só espaços -> 400", async () => {
    const master = await masterAdmin();
    const alert = await createAlert({ user_id: master.id });
    const body = validBody();
    const res = await api(`/api/system-alerts/${alert.id}/resolve`, { method: "POST", token: tokenFor(master), body: { action: body.action, description: "     ", client_action_id: body.client_action_id } });
    assert.equal(res.status, 400);
  });

  it("8. descrição menor que 10 caracteres reais -> 400; maior que 2000 -> 400", async () => {
    const master = await masterAdmin();
    const alertA = await createAlert({ user_id: master.id });
    const shortRes = await api(`/api/system-alerts/${alertA.id}/resolve`, {
      method: "POST", token: tokenFor(master),
      body: { action: "correcao_aplicada", description: "curta", client_action_id: crypto.randomUUID() },
    });
    assert.equal(shortRes.status, 400);

    const alertB = await createAlert({ user_id: master.id });
    const longRes = await api(`/api/system-alerts/${alertB.id}/resolve`, {
      method: "POST", token: tokenFor(master),
      body: { action: "correcao_aplicada", description: "x".repeat(2001), client_action_id: crypto.randomUUID() },
    });
    assert.equal(longRes.status, 400);
  });

  it("só alertas vermelhos passam por resolução formal — verde/amarelo -> 400", async () => {
    const master = await masterAdmin();
    const alert = await createAlert({ severity: "warning", user_id: master.id });
    const res = await api(`/api/system-alerts/${alert.id}/resolve`, { method: "POST", token: tokenFor(master), body: validBody() });
    assert.equal(res.status, 400);
  });

  // ── Sucesso, autoria, horário ─────────────────────────────────────────────

  it("9/10. resolução grava autor pelo token (nunca o nome enviado pelo corpo) e horário do servidor", async () => {
    const master = await masterAdmin();
    const alert = await createAlert({ user_id: master.id });
    const before = Date.now();
    const res = await api(`/api/system-alerts/${alert.id}/resolve`, {
      method: "POST", token: tokenFor(master),
      body: { ...validBody(), resolved_by_user_id: "forjado-no-corpo", resolved_by_name: "Nome Forjado" },
    });
    assert.equal(res.status, 201);
    const after = Date.now();

    const stored = await prisma.systemAlert.findUnique({ where: { id: alert.id } });
    assert.equal(stored?.resolved_by_user_id, master.id);
    assert.ok(stored?.manual_resolved_at);
    const ts = stored!.manual_resolved_at!.getTime();
    assert.ok(ts >= before - 2000 && ts <= after + 2000);
  });

  it("11. resolução e evento são transacionais — GET detalhe mostra o evento 'resolved' imediatamente", async () => {
    const master = await masterAdmin();
    const alert = await createAlert({ user_id: master.id });
    await api(`/api/system-alerts/${alert.id}/resolve`, { method: "POST", token: tokenFor(master), body: validBody() });
    const detail = await api(`/api/system-alerts/${alert.id}`, { token: tokenFor(master) });
    assert.equal(detail.json.situacao, "resolvido");
    assert.ok(detail.json.events.some((e: any) => e.event_type === "resolved"));
  });

  // ── Idempotência ──────────────────────────────────────────────────────────

  it("12. retry com o mesmo client_action_id não duplica — devolve o resultado existente", async () => {
    const master = await masterAdmin();
    const alert = await createAlert({ user_id: master.id });
    const body = validBody();
    const first = await api(`/api/system-alerts/${alert.id}/resolve`, { method: "POST", token: tokenFor(master), body });
    assert.equal(first.status, 201);
    const retry = await api(`/api/system-alerts/${alert.id}/resolve`, { method: "POST", token: tokenFor(master), body });
    assert.equal(retry.status, 200);
    assert.equal(retry.json.duplicate, true);

    const events = await prisma.systemAlertEvent.findMany({ where: { alert_id: alert.id, event_type: "resolved" } });
    assert.equal(events.length, 1);
  });

  it("resolver um alerta JÁ resolvido com um client_action_id DIFERENTE -> 409, nunca sobrescreve", async () => {
    const master = await masterAdmin();
    const alert = await createAlert({ user_id: master.id });
    const first = await api(`/api/system-alerts/${alert.id}/resolve`, { method: "POST", token: tokenFor(master), body: validBody() });
    assert.equal(first.status, 201);

    const secondAttempt = await api(`/api/system-alerts/${alert.id}/resolve`, {
      method: "POST", token: tokenFor(master),
      body: { action: "falso_positivo", description: "Uma segunda tentativa, deveria ser recusada.", client_action_id: crypto.randomUUID() },
    });
    assert.equal(secondAttempt.status, 409);
    assert.equal(secondAttempt.json.already_resolved, true);

    const stored = await prisma.systemAlert.findUnique({ where: { id: alert.id } });
    assert.equal(stored?.resolution_action, "correcao_aplicada");
  });

  it("13. duas requisições CONCORRENTES (client_action_id diferentes) resolvendo o MESMO alerta -> só uma vence", async () => {
    const master = await masterAdmin();
    const alert = await createAlert({ user_id: master.id });
    const token = tokenFor(master);
    const resolveOnce = (desc: string) =>
      api(`/api/system-alerts/${alert.id}/resolve`, {
        method: "POST", token,
        body: { action: "correcao_aplicada", description: desc, client_action_id: crypto.randomUUID() },
      });
    const results = await Promise.all([
      resolveOnce("Tentativa concorrente A com descrição válida."),
      resolveOnce("Tentativa concorrente B com descrição válida."),
      resolveOnce("Tentativa concorrente C com descrição válida."),
    ]);
    const winners = results.filter((r) => r.status === 201);
    const losers = results.filter((r) => r.status === 409);
    assert.equal(winners.length, 1);
    assert.equal(losers.length, 2);

    const events = await prisma.systemAlertEvent.findMany({ where: { alert_id: alert.id, event_type: "resolved" } });
    assert.equal(events.length, 1, "corrida real não pode gravar duas resoluções");
  });

  // ── Segurança / isolamento ────────────────────────────────────────────────

  it("14. usuário de OUTRA conta não resolve alerta de outra pessoa (404, não revela existência)", async () => {
    const owner = await createUser();
    const stranger = await createUser();
    const alert = await createAlert({ user_id: owner.id });
    const res = await api(`/api/system-alerts/${alert.id}/resolve`, { method: "POST", token: tokenFor(stranger), body: validBody() });
    assert.equal(res.status, 404);
  });

  it("15. admin comum SEM perfil master não resolve alerta Geral (visível, mas 403 — não 404)", async () => {
    const commonAdmin = await createUser({ role: "admin", account_type: "admin", admin_profile_id: null });
    const alert = await createAlert({ user_id: null }); // Geral
    const res = await api(`/api/system-alerts/${alert.id}/resolve`, { method: "POST", token: tokenFor(commonAdmin), body: validBody() });
    assert.equal(res.status, 403);
  });

  it("o próprio destinatário direto resolve seu alerta, mesmo sem ser admin", async () => {
    const recipient = await createUser({ role: "company_user", account_type: "empresas" });
    const alert = await createAlert({ user_id: recipient.id });
    const res = await api(`/api/system-alerts/${alert.id}/resolve`, { method: "POST", token: tokenFor(recipient), body: validBody() });
    assert.equal(res.status, 201);
  });

  it("Admin Master resolve QUALQUER alerta, mesmo endereçado a outra pessoa", async () => {
    const master = await masterAdmin();
    const someone = await createUser();
    const alert = await createAlert({ user_id: someone.id });
    const res = await api(`/api/system-alerts/${alert.id}/resolve`, { method: "POST", token: tokenFor(master), body: validBody() });
    assert.equal(res.status, 201);
  });

  it("sem sessão -> 401", async () => {
    const master = await masterAdmin();
    const alert = await createAlert({ user_id: master.id });
    const res = await api(`/api/system-alerts/${alert.id}/resolve`, { method: "POST", body: validBody() });
    assert.equal(res.status, 401);
  });

  // ── Depois de resolvido ──────────────────────────────────────────────────

  it("depois de resolvido, o alerta PODE ser arquivado normalmente", async () => {
    const master = await masterAdmin();
    const alert = await createAlert({ user_id: master.id });
    await api(`/api/system-alerts/${alert.id}/resolve`, { method: "POST", token: tokenFor(master), body: validBody() });
    const archiveRes = await api(`/api/system-alerts/${alert.id}/archive`, { method: "PATCH", token: tokenFor(master) });
    assert.equal(archiveRes.status, 200);
  });

  // ── Situação / listagem ───────────────────────────────────────────────────

  it("16/17. GET / com resolved=true lista o alerta resolvido, com resolved_by preenchido", async () => {
    const master = await masterAdmin();
    const alert = await createAlert({ user_id: master.id });
    await api(`/api/system-alerts/${alert.id}/resolve`, { method: "POST", token: tokenFor(master), body: validBody() });

    const list = await api("/api/system-alerts?category=alerta&resolved=true&is_archived=all", { token: tokenFor(master) });
    const found = list.json.data.find((a: any) => a.id === alert.id);
    assert.ok(found, "alerta resolvido deveria aparecer com resolved=true");
    assert.equal(found.resolved_by?.id, master.id);
  });

  it("16. GET / com resolved=false NÃO lista o alerta já resolvido", async () => {
    const master = await masterAdmin();
    const alert = await createAlert({ user_id: master.id });
    await api(`/api/system-alerts/${alert.id}/resolve`, { method: "POST", token: tokenFor(master), body: validBody() });

    const list = await api("/api/system-alerts?category=alerta&resolved=false", { token: tokenFor(master) });
    assert.ok(!list.json.data.some((a: any) => a.id === alert.id));
  });

  it("expiração automática não é apresentada como 'resolvido' (situações distintas)", async () => {
    const master = await masterAdmin();
    const alert = await prisma.systemAlert.create({
      data: {
        type: "alerta_admin_manual",
        title: `Alerta teste expirado ${suffix}`,
        message: "Mensagem de teste",
        severity: "error",
        category: "alerta",
        user_id: master.id,
        // Simula o que o motor de expiração grava — resolved_at/reason do
        // MOTOR, nunca confundido com manual_resolved_at.
        resolved_at: new Date(),
        resolution_reason: "expired",
        is_archived: true,
        archived_at: new Date(),
      },
    });
    createdAlertIds.push(alert.id);

    const detail = await api(`/api/system-alerts/${alert.id}`, { token: tokenFor(master) });
    assert.equal(detail.json.situacao, "arquivado");
    assert.notEqual(detail.json.situacao, "resolvido");
  });

  it("19. detalhes mostram a resolução completa (ação, descrição, autor, data)", async () => {
    const master = await masterAdmin();
    const alert = await createAlert({ user_id: master.id });
    const body = validBody();
    await api(`/api/system-alerts/${alert.id}/resolve`, { method: "POST", token: tokenFor(master), body });

    const detail = await api(`/api/system-alerts/${alert.id}`, { token: tokenFor(master) });
    assert.equal(detail.json.resolution.action, body.action);
    assert.equal(detail.json.resolution.description, body.description);
    assert.equal(detail.json.resolution.resolved_by.id, master.id);
    assert.ok(detail.json.resolution.resolved_at);
  });

  it("20. histórico mostra o evento 'resolved' com a ação escolhida", async () => {
    const master = await masterAdmin();
    const alert = await createAlert({ user_id: master.id });
    await api(`/api/system-alerts/${alert.id}/resolve`, { method: "POST", token: tokenFor(master), body: validBody() });
    const detail = await api(`/api/system-alerts/${alert.id}`, { token: tokenFor(master) });
    const resolvedEvent = detail.json.events.find((e: any) => e.event_type === "resolved");
    assert.ok(resolvedEvent);
    assert.match(resolvedEvent.description, /Correção aplicada/);
  });

  // ── Reparo "ações conclusivas" (ata 2026-08, 11º lote) ────────────────────
  // "Responsável acionado" é encaminhamento, não conclusão — removida das
  // ações aceitas em NOVAS resoluções, mas registros históricos que já a
  // usem continuam legíveis (não migrados, não apagados).

  it("4. API rejeita diretamente 'responsavel_acionado' com mensagem amigável (chamada direta, sem depender do frontend)", async () => {
    const master = await masterAdmin();
    const alert = await createAlert({ user_id: master.id });
    const res = await api(`/api/system-alerts/${alert.id}/resolve`, {
      method: "POST", token: tokenFor(master),
      body: { action: "responsavel_acionado", description: "Descrição de teste com mais de dez caracteres.", client_action_id: crypto.randomUUID() },
    });
    assert.equal(res.status, 400);
    assert.match(res.json.error, /representa apenas um encaminhamento/i);

    const stored = await prisma.systemAlert.findUnique({ where: { id: alert.id } });
    assert.equal(stored?.manual_resolved_at, null, "nunca deve resolver com a ação removida");
  });

  it("5. resolução válida (ação conclusiva) continua funcionando normalmente", async () => {
    const master = await masterAdmin();
    const alert = await createAlert({ user_id: master.id });
    const res = await api(`/api/system-alerts/${alert.id}/resolve`, {
      method: "POST", token: tokenFor(master),
      body: { action: "processo_ajustado", description: "Processo revisado e corrigido com sucesso.", client_action_id: crypto.randomUUID() },
    });
    assert.equal(res.status, 201);
  });

  it("6. registro histórico com 'responsavel_acionado' continua sendo exibido normalmente (nunca apagado/alterado)", async () => {
    const master = await masterAdmin();
    // Simula um registro ANTERIOR a este lote — inserido direto, nunca via
    // POST /:id/resolve (que já rejeita o valor).
    const legacyAlert = await prisma.systemAlert.create({
      data: {
        type: "alerta_admin_manual",
        title: `Alerta legado responsavel_acionado ${suffix}`,
        message: "Mensagem de teste",
        severity: "error",
        category: "alerta",
        user_id: master.id,
        manual_resolved_at: new Date(),
        resolved_by_user_id: master.id,
        resolution_action: "responsavel_acionado",
        resolution_description: "Resolução legada de teste.",
      },
    });
    createdAlertIds.push(legacyAlert.id);

    const detail = await api(`/api/system-alerts/${legacyAlert.id}`, { token: tokenFor(master) });
    assert.equal(detail.status, 200);
    assert.equal(detail.json.situacao, "resolvido");
    assert.equal(detail.json.resolution.action, "responsavel_acionado");
    assert.equal(detail.json.resolution.description, "Resolução legada de teste.");

    const list = await api("/api/system-alerts?category=alerta&resolved=true&is_archived=all", { token: tokenFor(master) });
    assert.ok(list.json.data.some((a: any) => a.id === legacyAlert.id), "registro legado precisa continuar aparecendo em Resolvidos");
  });

  it("7. descrição continua obrigatória mesmo tentando usar a ação removida", async () => {
    const master = await masterAdmin();
    const alert = await createAlert({ user_id: master.id });
    const res = await api(`/api/system-alerts/${alert.id}/resolve`, {
      method: "POST", token: tokenFor(master),
      body: { action: "responsavel_acionado", description: "  ", client_action_id: crypto.randomUUID() },
    });
    // A checagem da ação removida roda ANTES da validação de schema — mas
    // o resultado final continua sendo uma rejeição segura (400), nunca
    // uma resolução parcial.
    assert.equal(res.status, 400);
  });

  it("8. isolamento e idempotência continuam intactos com a lista de ações reduzida", async () => {
    const owner = await createUser();
    const stranger = await createUser();
    const alert = await createAlert({ severity: "error", user_id: owner.id });

    const strangerAttempt = await api(`/api/system-alerts/${alert.id}/resolve`, { method: "POST", token: tokenFor(stranger), body: validBody() });
    assert.equal(strangerAttempt.status, 404);

    const clientActionId = crypto.randomUUID();
    const first = await api(`/api/system-alerts/${alert.id}/resolve`, {
      method: "POST", token: tokenFor(owner),
      body: { action: "correcao_aplicada", description: "Descrição de teste com mais de dez caracteres.", client_action_id: clientActionId },
    });
    assert.equal(first.status, 201);
    const retry = await api(`/api/system-alerts/${alert.id}/resolve`, {
      method: "POST", token: tokenFor(owner),
      body: { action: "correcao_aplicada", description: "Descrição de teste com mais de dez caracteres.", client_action_id: clientActionId },
    });
    assert.equal(retry.status, 200);
    assert.equal(retry.json.duplicate, true);
  });
});
