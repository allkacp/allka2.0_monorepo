import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import app from "../app";
import { prisma } from "../lib/prisma";
import { config } from "../config";

// Filtros + paginação server-side da lista de alertas (ata 2026-08, bloco
// 2/5). Tudo opera no servidor, ANTES da paginação. A mesma rota serve o
// feed pessoal de Alertas e o de Notificações (category), sem misturar os
// dois.

let baseUrl = "";
let server: import("node:http").Server;

function tokenFor(u: { id: string; email: string; role: string; account_type: string }) {
  return jwt.sign(
    { id: u.id, email: u.email, role: u.role, account_type: u.account_type },
    config.JWT_SECRET,
    { expiresIn: "1h" },
  );
}

async function api(path: string, token: string) {
  const res = await fetch(`${baseUrl}${path}`, { headers: { authorization: `Bearer ${token}` } });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

const createdUserIds: string[] = [];
const createdAlertIds: string[] = [];
let user: { id: string; email: string; role: string; account_type: string };
let token = "";

type AlertData = Partial<Parameters<typeof prisma.systemAlert.create>[0]["data"]> & { title: string };

async function mkAlert(data: AlertData) {
  const { type, message, severity, category, ...rest } = data;
  const a = await prisma.systemAlert.create({
    data: {
      type: type ?? "custom",
      message: (message as string) ?? "corpo padrão",
      severity: (severity as string) ?? "warning",
      category: (category as string) ?? "alerta",
      user_id: user.id,
      ...rest,
    },
  });
  createdAlertIds.push(a.id);
  return a;
}

describe("Filtros e paginação da lista de alertas", () => {
  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    const listener = app.listen(0);
    server = listener;
    await new Promise<void>((resolve) => listener.once("listening", () => resolve()));
    baseUrl = `http://127.0.0.1:${(listener.address() as AddressInfo).port}`;

    const id = `flt-${crypto.randomBytes(6).toString("hex")}`;
    const u = await prisma.user.create({
      data: {
        id,
        email: `${id}@example.test`,
        password_hash: "x",
        name: "Filter Test",
        role: "company_user",
        account_type: "empresas",
        is_active: true,
        status: "ativo",
      },
    });
    createdUserIds.push(u.id);
    user = u;
    token = tokenFor(u);

    // Fixtures determinísticas.
    await mkAlert({ title: "Contrato vencendo em breve", severity: "warning", type: "custom", created_at: new Date("2026-08-10T12:00:00Z") });
    await mkAlert({ title: "Contrato já vencido — regularize", severity: "error", type: "custom", created_at: new Date("2026-08-20T12:00:00Z") });
    await mkAlert({ title: "Aviso administrativo geral", severity: "info", type: "custom", created_at: new Date("2026-08-25T12:00:00Z") });
    await mkAlert({ title: "Alerta automático de regra", severity: "error", type: "task.overdue", rule_id: null, created_at: new Date("2026-08-26T12:00:00Z") });
    // origem manual (Avulso): created_by_user_id preenchido
    await mkAlert({ title: "Avulso do admin sobre pagamento", severity: "error", created_by_user_id: user.id, created_at: new Date("2026-08-27T09:00:00Z") });
    // resolvido manualmente
    await mkAlert({ title: "Já resolvido manualmente", severity: "error", manual_resolved_at: new Date("2026-08-27T10:00:00Z"), resolved_by_user_id: user.id, created_at: new Date("2026-08-27T08:00:00Z") });
    // arquivado
    await mkAlert({ title: "Alerta arquivado antigo", severity: "warning", is_archived: true, archived_at: new Date(), created_at: new Date("2026-07-01T12:00:00Z") });
    // dispensado (lido, não resolvido, não arquivado)
    await mkAlert({ title: "Alerta dispensado", severity: "warning", is_read: true, read_at: new Date(), created_at: new Date("2026-08-15T12:00:00Z") });
    // expirado
    await mkAlert({ title: "Alerta expirado", severity: "warning", resolved_at: new Date(), resolution_reason: "expired", created_at: new Date("2026-08-05T12:00:00Z") });
    // NOTIFICAÇÃO (não deve aparecer em category=alerta)
    await mkAlert({ title: "Notificação de boas-vindas", category: "notificacao", severity: "info", type: "welcome", created_at: new Date("2026-08-22T12:00:00Z") });
    // 30 notificações pra paginar
    for (let i = 0; i < 30; i++) {
      await mkAlert({ title: `Notificação em lote ${i}`, category: "notificacao", severity: "info", type: "batch", created_at: new Date(`2026-08-01T00:${String(i).padStart(2, "0")}:00Z`) });
    }
  });

  after(async () => {
    await prisma.systemAlert.deleteMany({ where: { id: { in: createdAlertIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    await prisma.$disconnect();
  });

  it("19. busca textual no título e na mensagem", async () => {
    const r = await api("/api/system-alerts?category=alerta&q=contrato&is_archived=all", token);
    assert.equal(r.status, 200);
    const titles = r.json.data.map((a: any) => a.title);
    assert.ok(titles.every((t: string) => /contrato/i.test(t)));
    assert.equal(titles.length, 2);
  });

  it("20. intervalo de datas (date_from/date_to, só-dia no fuso da plataforma)", async () => {
    const r = await api("/api/system-alerts?category=alerta&is_archived=all&date_from=2026-08-19&date_to=2026-08-21", token);
    const titles = r.json.data.map((a: any) => a.title);
    assert.deepEqual(titles, ["Contrato já vencido — regularize"]);
  });

  it("21. severidade", async () => {
    const r = await api("/api/system-alerts?category=alerta&is_archived=all&severity=info", token);
    assert.ok(r.json.data.every((a: any) => a.severity === "info"));
    assert.ok(r.json.data.some((a: any) => a.title === "Aviso administrativo geral"));
  });

  it("22. situação — arquivado / dispensado / expirado / resolvido", async () => {
    const arq = await api("/api/system-alerts?category=alerta&situacao=arquivado", token);
    assert.ok(arq.json.data.some((a: any) => a.title === "Alerta arquivado antigo"));
    const disp = await api("/api/system-alerts?category=alerta&situacao=dispensado", token);
    assert.deepEqual(disp.json.data.map((a: any) => a.title), ["Alerta dispensado"]);
    const exp = await api("/api/system-alerts?category=alerta&situacao=expirado", token);
    assert.deepEqual(exp.json.data.map((a: any) => a.title), ["Alerta expirado"]);
    const res = await api("/api/system-alerts?category=alerta&situacao=resolvido&is_archived=all", token);
    assert.ok(res.json.data.some((a: any) => a.title === "Já resolvido manualmente"));
  });

  it("23. origem — manual / automatico", async () => {
    const manual = await api("/api/system-alerts?category=alerta&is_archived=all&origem=manual", token);
    assert.deepEqual(manual.json.data.map((a: any) => a.title), ["Avulso do admin sobre pagamento"]);
  });

  it("25/16. filtros aplicam ANTES da paginação — total reflete o filtro, não o universo", async () => {
    const r = await api("/api/system-alerts?category=alerta&is_archived=all&q=contrato&page=1&page_size=1", token);
    assert.equal(r.json.total, 2, "total = itens que casam o filtro");
    assert.equal(r.json.data.length, 1, "página traz 1");
    assert.equal(r.json.total_pages, 2);
    assert.equal(r.json.page, 1);
    assert.equal(r.json.page_size, 1);
  });

  it("26. paginação estável — página 2 traz o item restante, sem repetir", async () => {
    const p1 = await api("/api/system-alerts?category=alerta&is_archived=all&q=contrato&page=1&page_size=1", token);
    const p2 = await api("/api/system-alerts?category=alerta&is_archived=all&q=contrato&page=2&page_size=1", token);
    assert.notEqual(p1.json.data[0].id, p2.json.data[0].id);
  });

  it("28. estado vazio — filtro sem resultado devolve total 0 e lista vazia (não erro)", async () => {
    const r = await api("/api/system-alerts?category=alerta&q=xyzinexistente123", token);
    assert.equal(r.status, 200);
    assert.equal(r.json.total, 0);
    assert.deepEqual(r.json.data, []);
    assert.equal(r.json.total_pages, 1);
  });

  it("29. parâmetro inválido → 400 com detalhes (não 500)", async () => {
    const r = await api("/api/system-alerts?category=alerta&severity=roxo", token);
    assert.equal(r.status, 400);
  });

  it("31/33. Notificações usam a mesma rota por category — não misturam Alertas", async () => {
    const notif = await api("/api/system-alerts?category=notificacao&q=boas-vindas", token);
    assert.deepEqual(notif.json.data.map((a: any) => a.title), ["Notificação de boas-vindas"]);
    // busca por termo de alerta em category=notificacao não traz alerta nenhum
    const cross = await api("/api/system-alerts?category=notificacao&q=contrato", token);
    assert.equal(cross.json.total, 0);
  });

  it("35. Notificações paginam server-side", async () => {
    const p1 = await api("/api/system-alerts?category=notificacao&type=batch&page=1&page_size=10", token);
    assert.equal(p1.json.total, 30);
    assert.equal(p1.json.total_pages, 3);
    assert.equal(p1.json.data.length, 10);
  });

  it("compat: limit/offset continuam funcionando", async () => {
    const r = await api("/api/system-alerts?category=notificacao&type=batch&limit=5&offset=0", token);
    assert.equal(r.json.data.length, 5);
    assert.equal(r.json.total, 30);
  });
});
