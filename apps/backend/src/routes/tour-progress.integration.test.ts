import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import app from "../app";
import { prisma } from "../lib/prisma";
import { config } from "../config";

// ─── Onboarding: progresso de tour guiado (sprint de onboarding, bloco 1/3) ─
// Escopo SEMPRE por req.user!.id — nunca aceita user_id do corpo. Uma conta
// nunca vê/altera o progresso de outra. Idempotente sob retry/corrida.

let baseUrl = "";
let server: import("node:http").Server;

function tokenFor(u: { id: string; email: string; role: string; account_type: string }) {
  return jwt.sign({ id: u.id, email: u.email, role: u.role, account_type: u.account_type }, config.JWT_SECRET, { expiresIn: "1h" });
}

async function api(path: string, options: { method?: string; token?: string; body?: unknown } = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: { "content-type": "application/json", ...(options.token ? { authorization: `Bearer ${options.token}` } : {}) },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

const userIds: string[] = [];

async function mkUser() {
  const id = `onboard-${crypto.randomBytes(6).toString("hex")}`;
  const user = await prisma.user.create({
    data: { id, email: `${id}@example.test`, password_hash: "x", name: `Onboarding Test ${id}`, role: "company_user", account_type: "empresas", is_active: true, status: "ativo" },
  });
  userIds.push(user.id);
  return user;
}

describe("Progresso de tour guiado (onboarding, bloco 1/3)", () => {
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
    await prisma.tourProgress.deleteMany({ where: { user_id: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  });

  it("401 sem sessão", async () => {
    const res = await api("/api/tour-progress");
    assert.equal(res.status, 401);
  });

  it("usuário sem progresso: lista vazia e consulta de um tour específico retorna null", async () => {
    const user = await mkUser();
    const token = tokenFor(user);
    const list = await api("/api/tour-progress", { token });
    assert.equal(list.status, 200);
    assert.deepEqual(list.json.data, []);

    const single = await api("/api/tour-progress/primeiros-passos?version=1", { token });
    assert.equal(single.status, 200);
    assert.equal(single.json.data, null);
  });

  it("iniciar, salvar passo, retomar (idempotente) e concluir", async () => {
    const user = await mkUser();
    const token = tokenFor(user);

    const start = await api("/api/tour-progress/primeiros-passos/start", { method: "POST", token, body: { version: 1 } });
    assert.equal(start.status, 200);
    assert.equal(start.json.data.status, "em_andamento");
    const startedAt = start.json.data.started_at;

    const step = await api("/api/tour-progress/primeiros-passos/step", { method: "PATCH", token, body: { version: 1, step_key: "notifications-button" } });
    assert.equal(step.status, 200);
    assert.equal(step.json.data.last_step_key, "notifications-button");

    // retomar: chamar /start de novo não reseta o passo salvo nem o started_at
    const resume = await api("/api/tour-progress/primeiros-passos/start", { method: "POST", token, body: { version: 1 } });
    assert.equal(resume.status, 200);
    assert.equal(resume.json.data.last_step_key, "notifications-button");
    assert.equal(resume.json.data.started_at, startedAt);

    const complete = await api("/api/tour-progress/primeiros-passos/complete", { method: "POST", token, body: { version: 1 } });
    assert.equal(complete.status, 200);
    assert.equal(complete.json.data.status, "concluido");
    assert.ok(complete.json.data.completed_at);

    const count = await prisma.tourProgress.count({ where: { user_id: user.id, tour_key: "primeiros-passos", version: 1 } });
    assert.equal(count, 1); // nunca duplica linha
  });

  it("adiar ('Agora não') nunca marca como concluído, e usa um adiamento de 24h fixo no servidor", async () => {
    const user = await mkUser();
    const token = tokenFor(user);
    const before = Date.now();
    const res = await api("/api/tour-progress/primeiros-passos/postpone", { method: "POST", token, body: { version: 1, hours: 999999 } }); // tenta forjar duração maior — ignorado
    assert.equal(res.status, 200);
    assert.equal(res.json.data.status, "adiado");
    assert.equal(res.json.data.completed_at, null);
    const until = new Date(res.json.data.postponed_until).getTime();
    const expected24h = before + 24 * 60 * 60 * 1000;
    assert.ok(Math.abs(until - expected24h) < 60_000); // margem de 1 min pra latência do teste
  });

  it("dispensar ('Não quero ver') permite reabertura manual (restart) sem apagar o histórico anterior", async () => {
    const user = await mkUser();
    const token = tokenFor(user);
    const dismiss = await api("/api/tour-progress/primeiros-passos/dismiss", { method: "POST", token, body: { version: 1 } });
    assert.equal(dismiss.status, 200);
    assert.equal(dismiss.json.data.status, "dispensado");
    const dismissedAt = dismiss.json.data.dismissed_at;

    const restart = await api("/api/tour-progress/primeiros-passos/restart", { method: "POST", token, body: { version: 1 } });
    assert.equal(restart.status, 200);
    assert.equal(restart.json.data.status, "em_andamento");
    assert.equal(restart.json.data.last_step_key, null);
    assert.equal(restart.json.data.dismissed_at, dismissedAt); // histórico anterior preservado, nunca apagado

    const count = await prisma.tourProgress.count({ where: { user_id: user.id, tour_key: "primeiros-passos", version: 1 } });
    assert.equal(count, 1); // mesma linha, nunca uma segunda
  });

  it("uma versão nova pode ser oferecida mesmo com a versão anterior concluída — linhas independentes", async () => {
    const user = await mkUser();
    const token = tokenFor(user);
    await api("/api/tour-progress/primeiros-passos/start", { method: "POST", token, body: { version: 1 } });
    await api("/api/tour-progress/primeiros-passos/complete", { method: "POST", token, body: { version: 1 } });

    const startV2 = await api("/api/tour-progress/primeiros-passos/start", { method: "POST", token, body: { version: 2 } });
    assert.equal(startV2.status, 200);
    assert.equal(startV2.json.data.status, "em_andamento");

    const v1 = await api("/api/tour-progress/primeiros-passos?version=1", { token });
    assert.equal(v1.json.data.status, "concluido"); // v1 continua concluída, intocada

    const rows = await prisma.tourProgress.count({ where: { user_id: user.id, tour_key: "primeiros-passos" } });
    assert.equal(rows, 2);
  });

  it("idempotência: completar duas vezes nunca sobrescreve completed_at nem duplica linha", async () => {
    const user = await mkUser();
    const token = tokenFor(user);
    await api("/api/tour-progress/primeiros-passos/start", { method: "POST", token, body: { version: 1 } });
    const first = await api("/api/tour-progress/primeiros-passos/complete", { method: "POST", token, body: { version: 1 } });
    await new Promise((r) => setTimeout(r, 20));
    const second = await api("/api/tour-progress/primeiros-passos/complete", { method: "POST", token, body: { version: 1 } });
    assert.equal(first.json.data.completed_at, second.json.data.completed_at);
    assert.equal(await prisma.tourProgress.count({ where: { user_id: user.id, tour_key: "primeiros-passos", version: 1 } }), 1);
  });

  it("concorrência: chamadas simultâneas de /start nunca criam duas linhas", async () => {
    const user = await mkUser();
    const token = tokenFor(user);
    const results = await Promise.all(
      Array.from({ length: 5 }, () => api("/api/tour-progress/primeiros-passos/start", { method: "POST", token, body: { version: 1 } })),
    );
    assert.ok(results.every((r) => r.status === 200));
    const count = await prisma.tourProgress.count({ where: { user_id: user.id, tour_key: "primeiros-passos", version: 1 } });
    assert.equal(count, 1);
  });

  it("isolamento entre duas contas: uma nunca vê nem altera o progresso da outra", async () => {
    const userA = await mkUser();
    const userB = await mkUser();
    await api("/api/tour-progress/primeiros-passos/start", { method: "POST", token: tokenFor(userA), body: { version: 1 } });

    const listB = await api("/api/tour-progress", { token: tokenFor(userB) });
    assert.deepEqual(listB.json.data, []); // B não vê o progresso de A

    const singleB = await api("/api/tour-progress/primeiros-passos?version=1", { token: tokenFor(userB) });
    assert.equal(singleB.json.data, null);

    // B "completa" o mesmo tour/versão — nunca deveria afetar a linha de A
    await api("/api/tour-progress/primeiros-passos/complete", { method: "POST", token: tokenFor(userB), body: { version: 1 } });
    const aAfter = await api("/api/tour-progress/primeiros-passos?version=1", { token: tokenFor(userA) });
    assert.equal(aAfter.json.data.status, "em_andamento"); // continua intocada
  });

  it("payload tentando forjar usuário é sempre ignorado — a linha real pertence a quem está autenticado", async () => {
    const user = await mkUser();
    const victim = await mkUser();
    const token = tokenFor(user);
    const res = await api("/api/tour-progress/primeiros-passos/start", {
      method: "POST",
      token,
      body: { version: 1, user_id: victim.id }, // tentativa de forjar
    });
    assert.equal(res.status, 200);
    assert.equal(res.json.data.user_id, user.id); // nunca a vítima

    const victimRows = await prisma.tourProgress.count({ where: { user_id: victim.id } });
    assert.equal(victimRows, 0);
  });
});
