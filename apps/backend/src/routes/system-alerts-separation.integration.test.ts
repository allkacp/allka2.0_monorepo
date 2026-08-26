import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import app from "../app";
import { prisma } from "../lib/prisma";
import { config } from "../config";

// Lote "Arquivar Projetos... separar alertas de notificações" (ata 2026-08).
// SystemAlert já era a fonte única de dado tanto pra "Notificações" quanto
// pra "Alertas" (distinguidos pelo campo `category`, ver migration
// 20260816120000_categoria_alerta_notificacao) — este arquivo prova, contra
// um banco local descartável, que os dois contadores/coleções continuam de
// fato separados (nunca um vaza no outro) depois do ajuste dos dois
// acionadores no header e da criticidade verde/amarelo/vermelho (derivada
// de `severity`, sem coluna nova).

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
const createdAlertIds: string[] = [];

async function createUser(overrides: Partial<{ role: string; account_type: string }> = {}) {
  const id = `alerts-sep-${crypto.randomBytes(6).toString("hex")}`;
  const user = await prisma.user.create({
    data: {
      id,
      email: `${id}@example.test`,
      password_hash: "unused-test-hash",
      name: `Alerts Separation Test ${id}`,
      role: overrides.role ?? "company_user",
      account_type: overrides.account_type ?? "empresas",
      is_active: true,
      status: "ativo",
    },
  });
  createdUserIds.push(user.id);
  return user;
}

async function createAlert(overrides: {
  user_id?: string | null;
  category?: "notificacao" | "alerta";
  severity?: "info" | "warning" | "error";
  is_read?: boolean;
  is_archived?: boolean;
  type?: string;
}) {
  const alert = await prisma.systemAlert.create({
    data: {
      type: overrides.type ?? `teste_${suffix}`,
      title: `Título teste ${suffix}`,
      message: "Mensagem de teste",
      severity: overrides.severity ?? "warning",
      category: overrides.category ?? "notificacao",
      user_id: overrides.user_id ?? null,
      is_read: overrides.is_read ?? false,
      is_archived: overrides.is_archived ?? false,
    },
  });
  createdAlertIds.push(alert.id);
  return alert;
}

describe("Separação Notificações × Alertas (SystemAlert.category) — ata 2026-08", () => {
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
    await prisma.systemAlert.deleteMany({ where: { id: { in: createdAlertIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    await prisma.$disconnect();
  });

  it("1. notificações e alertas retornam em coleções separadas", async () => {
    const user = await createUser();
    const notif = await createAlert({ user_id: user.id, category: "notificacao" });
    const alerta = await createAlert({ user_id: user.id, category: "alerta" });

    const notifList = await api("/api/system-alerts?category=notificacao", { token: tokenFor(user) });
    assert.equal(notifList.status, 200);
    assert.ok(notifList.json.data.some((a: any) => a.id === notif.id));
    assert.ok(!notifList.json.data.some((a: any) => a.id === alerta.id));

    const alertaList = await api("/api/system-alerts?category=alerta", { token: tokenFor(user) });
    assert.equal(alertaList.status, 200);
    assert.ok(alertaList.json.data.some((a: any) => a.id === alerta.id));
    assert.ok(!alertaList.json.data.some((a: any) => a.id === notif.id));
  });

  it("2. contador de notificações exclui alertas", async () => {
    const user = await createUser();
    await createAlert({ user_id: user.id, category: "notificacao", is_read: false });
    await createAlert({ user_id: user.id, category: "alerta", is_read: false });

    const res = await api("/api/system-alerts/unread-count?category=notificacao", { token: tokenFor(user) });
    assert.equal(res.status, 200);
    assert.equal(res.json.count, 1);
  });

  it("3. contador de alertas exclui notificações", async () => {
    const user = await createUser();
    await createAlert({ user_id: user.id, category: "notificacao", is_read: false });
    await createAlert({ user_id: user.id, category: "alerta", is_read: false });

    const res = await api("/api/system-alerts/unread-count?category=alerta", { token: tokenFor(user) });
    assert.equal(res.status, 200);
    assert.equal(res.json.count, 1);
  });

  it("4. alerta possui criticidade válida (severity dentro do conjunto conhecido, base da criticidade verde/amarelo/vermelho)", async () => {
    const user = await createUser();
    const info = await createAlert({ user_id: user.id, category: "alerta", severity: "info" });
    const warning = await createAlert({ user_id: user.id, category: "alerta", severity: "warning" });
    const error = await createAlert({ user_id: user.id, category: "alerta", severity: "error" });

    const res = await api("/api/system-alerts?category=alerta", { token: tokenFor(user) });
    const byId = new Map(res.json.data.map((a: any) => [a.id, a]));
    for (const id of [info.id, warning.id, error.id]) {
      const row: any = byId.get(id);
      assert.ok(row, "alerta deve aparecer na listagem");
      assert.ok(["info", "warning", "error"].includes(row.severity), "severity deve ser um valor conhecido (mapeia 1:1 pra verde/amarelo/vermelho no frontend)");
    }
  });

  it("5. registro antigo (sem severity explícito) recebe comportamento padrão seguro", async () => {
    const user = await createUser();
    // Não passa severity — usa o default do schema ("warning"), simulando
    // uma linha antiga que nunca precisou pensar em criticidade.
    const alerta = await prisma.systemAlert.create({
      data: {
        type: `legado_${suffix}`,
        title: "Alerta legado",
        message: "Sem severity explícito",
        category: "alerta",
        user_id: user.id,
      },
    });
    createdAlertIds.push(alerta.id);

    assert.equal(alerta.severity, "warning", "default do schema deve se aplicar — mapeia pra 'amarelo', nunca undefined/crash");

    const res = await api("/api/system-alerts?category=alerta", { token: tokenFor(user) });
    const row = res.json.data.find((a: any) => a.id === alerta.id);
    assert.ok(row);
    assert.equal(row.severity, "warning");
  });

  it("6. usuário não vê nem altera dados de outro usuário", async () => {
    const owner = await createUser();
    const other = await createUser();
    const alerta = await createAlert({ user_id: owner.id, category: "alerta" });

    const listAsOther = await api("/api/system-alerts?category=alerta", { token: tokenFor(other) });
    assert.ok(!listAsOther.json.data.some((a: any) => a.id === alerta.id));

    const readAsOther = await api(`/api/system-alerts/${alerta.id}/read`, { method: "PATCH", token: tokenFor(other) });
    assert.equal(readAsOther.status, 404);

    const stillUnread = await prisma.systemAlert.findUnique({ where: { id: alerta.id } });
    assert.equal(stillUnread?.is_read, false, "outro usuário não pode ter marcado como lido");
  });

  it("7. usuário comum não enxerga alerta geral (user_id nulo) de outro escopo — só o Admin vê o mural geral", async () => {
    const commonUser = await createUser({ role: "company_user", account_type: "empresas" });
    const admin = await createUser({ role: "admin", account_type: "admin" });
    const geral = await createAlert({ user_id: null, category: "alerta" });

    const listAsCommon = await api("/api/system-alerts?category=alerta", { token: tokenFor(commonUser) });
    assert.ok(!listAsCommon.json.data.some((a: any) => a.id === geral.id), "usuário comum não deve ver alerta geral do sistema");

    const listAsAdmin = await api("/api/system-alerts?category=alerta", { token: tokenFor(admin) });
    assert.ok(listAsAdmin.json.data.some((a: any) => a.id === geral.id), "admin deve ver o mural geral");
  });

  it("8. sem sessão -> 401", async () => {
    const res = await api("/api/system-alerts?category=alerta");
    assert.equal(res.status, 401);
    const countRes = await api("/api/system-alerts/unread-count");
    assert.equal(countRes.status, 401);
  });

  it("9. não é possível forjar destinatário pelo corpo da requisição (isolamento não depende do frontend)", async () => {
    // Não existe endpoint público de criação de SystemAlert arbitrário —
    // a única superfície de escrita do usuário comum é marcar como
    // lido/arquivar o que já é seu (validado no item 6). Confirma aqui que
    // um PATCH tentando id de outro usuário continua 404 mesmo variando o
    // corpo enviado.
    const owner = await createUser();
    const attacker = await createUser();
    const alerta = await createAlert({ user_id: owner.id, category: "alerta" });

    const res = await api(`/api/system-alerts/${alerta.id}/archive`, {
      method: "PATCH",
      token: tokenFor(attacker),
      body: { user_id: attacker.id },
    });
    assert.equal(res.status, 404);
  });

  it("10. contador por criticidade (bySeverity) bate com a contagem real", async () => {
    const user = await createUser();
    await createAlert({ user_id: user.id, category: "alerta", severity: "info" });
    await createAlert({ user_id: user.id, category: "alerta", severity: "warning" });
    await createAlert({ user_id: user.id, category: "alerta", severity: "warning" });
    await createAlert({ user_id: user.id, category: "alerta", severity: "error" });
    // notificação não deve contaminar a quebra por criticidade do alerta.
    await createAlert({ user_id: user.id, category: "notificacao", severity: "error" });

    const res = await api("/api/system-alerts/unread-count?category=alerta", { token: tokenFor(user) });
    assert.equal(res.status, 200);
    assert.equal(res.json.count, 4);
    assert.deepEqual(res.json.bySeverity, { info: 1, warning: 2, error: 1 });
  });

  it("10b. bySeverity não aparece quando a categoria não é filtrada como 'alerta' (não sugere criticidade pra notificação)", async () => {
    const user = await createUser();
    await createAlert({ user_id: user.id, category: "notificacao" });

    const noFilter = await api("/api/system-alerts/unread-count", { token: tokenFor(user) });
    assert.equal(noFilter.json.bySeverity, undefined);

    const notifFilter = await api("/api/system-alerts/unread-count?category=notificacao", { token: tokenFor(user) });
    assert.equal(notifFilter.json.bySeverity, undefined);
  });

  it("11. marcar notificação como lida não altera o alerta correspondente", async () => {
    const user = await createUser();
    const notif = await createAlert({ user_id: user.id, category: "notificacao", is_read: false });
    const alerta = await createAlert({ user_id: user.id, category: "alerta", is_read: false });

    const res = await api(`/api/system-alerts/${notif.id}/read`, { method: "PATCH", token: tokenFor(user) });
    assert.equal(res.status, 200);

    const alertaAfter = await prisma.systemAlert.findUnique({ where: { id: alerta.id } });
    assert.equal(alertaAfter?.is_read, false, "alerta não deve ter sido afetado");
  });

  it("12. operação em alerta (arquivar) não altera a notificação correspondente", async () => {
    const user = await createUser();
    const notif = await createAlert({ user_id: user.id, category: "notificacao", is_read: false, is_archived: false });
    const alerta = await createAlert({ user_id: user.id, category: "alerta", is_read: false, is_archived: false });

    const res = await api(`/api/system-alerts/${alerta.id}/archive`, { method: "PATCH", token: tokenFor(user) });
    assert.equal(res.status, 200);

    const notifAfter = await prisma.systemAlert.findUnique({ where: { id: notif.id } });
    assert.equal(notifAfter?.is_archived, false, "notificação não deve ter sido afetada");
    assert.equal(notifAfter?.is_read, false);
  });

  it("13. read-all filtrado por categoria só afeta a categoria pedida", async () => {
    const user = await createUser();
    const notif = await createAlert({ user_id: user.id, category: "notificacao", is_read: false });
    const alerta = await createAlert({ user_id: user.id, category: "alerta", is_read: false });

    const res = await api("/api/system-alerts/read-all?category=alerta", { method: "PATCH", token: tokenFor(user) });
    assert.equal(res.status, 200);
    assert.equal(res.json.updated, 1);

    const notifAfter = await prisma.systemAlert.findUnique({ where: { id: notif.id } });
    const alertaAfter = await prisma.systemAlert.findUnique({ where: { id: alerta.id } });
    assert.equal(notifAfter?.is_read, false, "notificação não deve ter sido marcada como lida por um read-all de alerta");
    assert.equal(alertaAfter?.is_read, true);
  });
});
