import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import jwt from "jsonwebtoken";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import app from "../app";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import { runAlertEngineOnce, runAlertEngineOnceGuarded, computeNextRun, ensureDefaultAlertStandardsAndRules } from "../lib/alert-engine";
import { alertImagePath, deleteAlertImage } from "../lib/alert-image-storage";

// Imagens, Alertas Programados e expiração de ocorrência (ata 2026-08,
// 4º lote). Reaproveita padrões/regras/motor já implementados; preserva
// Alertas Avulsos existentes. Cobre a maior parte da lista pedida —
// alguns itens de UI/mobile ficam pra verificação manual no navegador
// (registrado no encerramento).

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

// Banner real 1200×200 (padrão definitivo — corrigido de 1200×400 num lote
// seguinte). O antigo fixture 1x1 (assinatura válida, mas dimensão
// nenhuma) passou a ser rejeitado pelo endpoint.
const REAL_PNG = fs.readFileSync(path.join(__dirname, "../test-support/fixtures/alert-banner-1200x200.png"));

const createdUserIds: string[] = [];
const createdProfileIds: string[] = [];
const createdImageFileNames: string[] = [];
const createdScheduleIds: string[] = [];
const createdStandardImageIds: string[] = [];

async function createUser(overrides: Partial<{ role: string; account_type: string; admin_profile_id: string | null; is_active: boolean }> = {}) {
  const id = `imgsch-${crypto.randomBytes(6).toString("hex")}`;
  const user = await prisma.user.create({
    data: {
      id,
      email: `${id}@example.test`,
      password_hash: "unused-test-hash",
      name: `ImgSch Test ${id}`,
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
    data: { name: `perfil-imgsch-${suffix}-${crypto.randomBytes(4).toString("hex")}`, is_master: overrides.is_master ?? false, is_active: true },
  });
  createdProfileIds.push(profile.id);
  return profile;
}

async function masterAdmin() {
  const profile = await createProfile({ is_master: true });
  return createUser({ role: "admin", account_type: "admin", admin_profile_id: profile.id });
}

describe("Imagens, Programados e Expiração de Alertas (ata 2026-08, 4º lote)", () => {
  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;

    const listener = app.listen(0);
    server = listener;
    await new Promise<void>((resolve) => listener.once("listening", () => resolve()));
    const address = listener.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;

    await ensureDefaultAlertStandardsAndRules();
  });

  after(async () => {
    // Filtra ids undefined/null: um teste que falhou antes de obter um id
    // (ex.: POST retornou 400) nunca deve derrubar a limpeza inteira e
    // deixar o processo pendurado sem fechar servidor/conexão.
    const scheduleIds = createdScheduleIds.filter((id): id is string => Boolean(id));
    try {
      await prisma.productFeedbackAccessAudit.deleteMany({ where: { action: { startsWith: "alert_" } } });
      await prisma.systemAlert.deleteMany({ where: { schedule_id: { in: scheduleIds } } });
      await prisma.alertSchedule.deleteMany({ where: { id: { in: scheduleIds } } });
      await prisma.alertStandard.deleteMany({ where: { id: { in: createdStandardImageIds } } });
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
      await prisma.adminProfile.deleteMany({ where: { id: { in: createdProfileIds } } });
      for (const fileName of createdImageFileNames) deleteAlertImage(fileName);
    } finally {
      await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
      await prisma.$disconnect();
    }
  });

  // ── Imagem ────────────────────────────────────────────────────────────

  it("1. upload válido (PNG real) é aceito e o arquivo existe em disco", async () => {
    const master = await masterAdmin();
    const res = await uploadImage(tokenFor(master), REAL_PNG, "foto.png");
    assert.equal(res.status, 201);
    const fileName = res.json.file_name as string;
    createdImageFileNames.push(fileName);
    assert.ok(fs.existsSync(alertImagePath(fileName)));
  });

  it("2/3. arquivo disfarçado (extensão .png mas conteúdo não é imagem) é rejeitado por assinatura de bytes", async () => {
    const master = await masterAdmin();
    const fakeImage = Buffer.from("isto nao e uma imagem de verdade, so texto");
    const res = await uploadImage(tokenFor(master), fakeImage, "disfarcado.png");
    assert.equal(res.status, 400);
  });

  it("4. tamanho excessivo é rejeitado", async () => {
    const master = await masterAdmin();
    const big = Buffer.concat([REAL_PNG, Buffer.alloc(6 * 1024 * 1024)]);
    const res = await uploadImage(tokenFor(master), big, "grande.png");
    assert.equal(res.status, 400);
  });

  it("5. caminho malicioso no nome do arquivo servido é rejeitado", async () => {
    const master = await masterAdmin();
    const res = await api("/api/system-alerts/admin/images/..%2F..%2Fetc%2Fpasswd", { token: tokenFor(master) });
    assert.equal(res.status, 400);
  });

  it("permissões: usuário comum não pode enviar imagem", async () => {
    const comum = await createUser();
    const res = await uploadImage(tokenFor(comum), REAL_PNG, "foto.png");
    assert.equal(res.status, 403);
  });

  it("permissões: sem sessão -> 401", async () => {
    const res = await uploadImage("", REAL_PNG, "foto.png");
    assert.equal(res.status, 401);
  });

  it("6. texto alternativo é obrigatório quando há imagem (Avulso)", async () => {
    const master = await masterAdmin();
    const uploaded = await uploadImage(tokenFor(master), REAL_PNG, "foto.png");
    createdImageFileNames.push(uploaded.json.file_name);
    const res = await api("/api/system-alerts/admin", {
      method: "POST",
      token: tokenFor(master),
      body: { title: "Alerta com imagem sem alt", message: "Mensagem", severity: "info", image_file_name: uploaded.json.file_name },
    });
    assert.equal(res.status, 400);
  });

  it("8. prévia de Padrão não cria ocorrência", async () => {
    const master = await masterAdmin();
    const standard = await prisma.alertStandard.findFirstOrThrow({ where: { key: "task.due_soon" } });
    const before = await prisma.systemAlert.count();
    const res = await api(`/api/system-alerts/admin/standards/${standard.id}/preview`, { method: "POST", token: tokenFor(master) });
    assert.equal(res.status, 200);
    const after = await prisma.systemAlert.count();
    assert.equal(after, before);
  });

  it("10. ocorrência histórica não quebra depois de trocar a imagem do Padrão (snapshot próprio)", async () => {
    const master = await masterAdmin();
    const uploaded = await uploadImage(tokenFor(master), REAL_PNG, "padrao.png");
    createdImageFileNames.push(uploaded.json.file_name);

    const standard = await prisma.alertStandard.create({
      data: {
        key: `test.standard.image.${suffix}`,
        name: "Padrão teste imagem",
        title: "Título teste",
        message: "Mensagem teste",
        default_severity: "warning",
        is_active: true,
        is_system: false,
        allowed_variables_json: "[]",
        image_file_name: uploaded.json.file_name,
        image_alt: "Imagem de teste",
      },
    });
    createdStandardImageIds.push(standard.id);

    // Simula uma ocorrência nascida deste padrão com o mesmo mecanismo de
    // snapshot usado pelo motor (cópia física + novo nome).
    const { snapshotAlertImage } = await import("../lib/alert-image-storage");
    const snapshot = snapshotAlertImage(standard.image_file_name!);
    assert.ok(snapshot, "snapshot deve copiar o arquivo com sucesso");
    createdImageFileNames.push(snapshot!);
    assert.notEqual(snapshot, standard.image_file_name, "ocorrência recebe um arquivo PRÓPRIO, nunca o mesmo nome do padrão");

    const occurrence = await prisma.systemAlert.create({
      data: { type: standard.key, title: "Ocorrência histórica", message: "Msg", severity: "warning", category: "alerta", standard_id: standard.id, image_file_name: snapshot, image_alt: "Imagem de teste" },
    });

    // Agora troca a imagem do padrão via API — a ocorrência antiga precisa continuar íntegra.
    const uploaded2 = await uploadImage(tokenFor(master), REAL_PNG, "novo.png");
    createdImageFileNames.push(uploaded2.json.file_name);
    const editRes = await api(`/api/system-alerts/admin/standards/${standard.id}`, {
      method: "PATCH",
      token: tokenFor(master),
      body: { image_file_name: uploaded2.json.file_name, image_alt: "Nova imagem" },
    });
    assert.equal(editRes.status, 200);

    const occurrenceReloaded = await prisma.systemAlert.findUniqueOrThrow({ where: { id: occurrence.id } });
    assert.equal(occurrenceReloaded.image_file_name, snapshot, "a ocorrência histórica manteve seu próprio arquivo");
    assert.ok(fs.existsSync(alertImagePath(occurrenceReloaded.image_file_name!)), "o arquivo da ocorrência continua existindo em disco");
    await prisma.systemAlert.delete({ where: { id: occurrence.id } });
  });

  // ── Programação ───────────────────────────────────────────────────────

  it("permissões: usuário comum não pode criar programação", async () => {
    const comum = await createUser();
    const res = await api("/api/system-alerts/admin/schedules", {
      method: "POST",
      token: tokenFor(comum),
      body: { name: "x", title: "x", message: "xxx", severity: "info", recurrence_type: "daily", time_of_day: "09:00", timezone: "America/Sao_Paulo", start_date: "2026-01-01" },
    });
    assert.equal(res.status, 403);
  });

  it("11/14. envio único (once) calcula o instante certo, respeitando o timezone informado", async () => {
    const master = await masterAdmin();
    const res = await api("/api/system-alerts/admin/schedules", {
      method: "POST",
      token: tokenFor(master),
      body: {
        name: "Envio único teste",
        title: "Título único",
        message: "Mensagem única",
        severity: "info",
        recurrence_type: "once",
        time_of_day: "10:00",
        timezone: "America/Sao_Paulo",
        start_date: "2026-08-30",
      },
    });
    assert.equal(res.status, 201);
    createdScheduleIds.push(res.json.id);
    // 10:00 America/Sao_Paulo (UTC-3, sem horário de verão) = 13:00 UTC.
    assert.equal(res.json.next_run_at, "2026-08-30T13:00:00.000Z");
  });

  it("24. usuário inexistente/inativo como destinatário é rejeitado na criação", async () => {
    const master = await masterAdmin();
    const res = await api("/api/system-alerts/admin/schedules", {
      method: "POST",
      token: tokenFor(master),
      body: {
        name: "x", title: "x", message: "mensagem", severity: "info", user_id: "nao-existe",
        recurrence_type: "once", time_of_day: "09:00", timezone: "America/Sao_Paulo", start_date: "2026-08-30",
      },
    });
    assert.equal(res.status, 400);
  });

  it("13. semanal (segunda e sexta) só dispara nesses dias — computeNextRun pula os outros", () => {
    // segunda=1, sexta=5
    const schedule = {
      id: "x",
      recurrence_type: "weekly",
      weekdays_json: JSON.stringify([1, 5]),
      time_of_day: "14:30",
      timezone: "America/Sao_Paulo",
      starts_at: new Date("2026-08-01T00:00:00.000Z"),
      ends_at: null,
    } as Parameters<typeof computeNextRun>[0];
    // 2026-08-24 é segunda-feira
    const from = new Date("2026-08-24T00:00:00.000Z");
    const next = computeNextRun(schedule, from);
    assert.ok(next);
    assert.equal(next!.toISOString(), "2026-08-24T17:30:00.000Z"); // 14:30 -3 = 17:30 UTC, ainda segunda
  });

  it("15/16. início futuro e término impedem envio fora da janela", () => {
    const schedule = {
      id: "x",
      recurrence_type: "daily",
      weekdays_json: null,
      time_of_day: "09:00",
      timezone: "America/Sao_Paulo",
      starts_at: new Date("2026-09-01T00:00:00.000Z"),
      ends_at: new Date("2026-09-05T23:59:00.000Z"),
    } as Parameters<typeof computeNextRun>[0];
    const before = computeNextRun(schedule, new Date("2026-08-01T00:00:00.000Z"));
    assert.ok(before && before.getTime() >= schedule.starts_at.getTime(), "não dispara antes do início");
    const after = computeNextRun(schedule, new Date("2026-09-10T00:00:00.000Z"));
    assert.equal(after, null, "não dispara depois do término");
  });

  it("17/18. desativar impede novo envio (next_run_at nulo); reativar recalcula", async () => {
    const master = await masterAdmin();
    const create = await api("/api/system-alerts/admin/schedules", {
      method: "POST",
      token: tokenFor(master),
      body: { name: "Diario teste", title: "Título diario", message: "Mensagem diaria", severity: "info", recurrence_type: "daily", time_of_day: "08:00", timezone: "America/Sao_Paulo", start_date: "2026-01-01" },
    });
    createdScheduleIds.push(create.json.id);
    assert.ok(create.json.next_run_at);

    const off = await api(`/api/system-alerts/admin/schedules/${create.json.id}`, { method: "PATCH", token: tokenFor(master), body: { is_active: false } });
    assert.equal(off.json.next_run_at, null);

    const on = await api(`/api/system-alerts/admin/schedules/${create.json.id}`, { method: "PATCH", token: tokenFor(master), body: { is_active: true } });
    assert.ok(on.json.next_run_at, "reativar recalcula a próxima execução");
  });

  it("19. editar horário recalcula a próxima execução sem duplicar", async () => {
    const master = await masterAdmin();
    const create = await api("/api/system-alerts/admin/schedules", {
      method: "POST",
      token: tokenFor(master),
      body: { name: "Editar horario", title: "Título edicao", message: "Mensagem edicao", severity: "info", recurrence_type: "daily", time_of_day: "08:00", timezone: "America/Sao_Paulo", start_date: "2026-01-01" },
    });
    createdScheduleIds.push(create.json.id);
    const original = create.json.next_run_at;

    const edited = await api(`/api/system-alerts/admin/schedules/${create.json.id}`, { method: "PATCH", token: tokenFor(master), body: { time_of_day: "18:00" } });
    assert.notEqual(edited.json.next_run_at, original);
  });

  it("20/21. execução repetida e duas chamadas concorrentes não duplicam ocorrência", async () => {
    const master = await masterAdmin();
    const past = new Date(Date.now() - 5 * 60 * 1000);
    const schedule = await prisma.alertSchedule.create({
      data: {
        name: "Concorrência teste", title: "Titulo concorrencia", message: "Mensagem concorrencia", severity: "warning",
        recurrence_type: "once", time_of_day: "00:00", timezone: "America/Sao_Paulo",
        starts_at: past, next_run_at: past, created_by_id: master.id,
      },
    });
    createdScheduleIds.push(schedule.id);

    await Promise.all([runAlertEngineOnceGuarded(), runAlertEngineOnceGuarded()]);
    await runAlertEngineOnce();

    const alerts = await prisma.systemAlert.findMany({ where: { schedule_id: schedule.id } });
    assert.equal(alerts.length, 1);
  });

  it("22. programação muito atrasada (fora da janela de tolerância) não dispara — evita avalanche", async () => {
    const master = await masterAdmin();
    const wayPast = new Date(Date.now() - 5 * 60 * 60 * 1000); // 5h atrás, além da tolerância de 1h
    const schedule = await prisma.alertSchedule.create({
      data: {
        name: "Atraso grande", title: "Titulo atraso", message: "Mensagem atraso", severity: "warning",
        recurrence_type: "once", time_of_day: "00:00", timezone: "America/Sao_Paulo",
        starts_at: wayPast, next_run_at: wayPast, created_by_id: master.id,
      },
    });
    createdScheduleIds.push(schedule.id);

    const result = await runAlertEngineOnce();
    assert.ok(result.schedulesSkippedStale >= 1);
    const alerts = await prisma.systemAlert.findMany({ where: { schedule_id: schedule.id } });
    assert.equal(alerts.length, 0, "não gera avalanche de alertas antigos");
  });

  it("23. falha numa programação não interrompe as demais", async () => {
    const master = await masterAdmin();
    const past = new Date(Date.now() - 2 * 60 * 1000);
    // Programação com destinatário que será removido no meio do processamento
    // não deve lançar exceção pro restante do lote (o motor já trata usuário
    // inexistente/inativo com skip silencioso, não throw) — aqui confirmamos
    // que uma segunda programação válida no mesmo ciclo continua funcionando.
    const badSchedule = await prisma.alertSchedule.create({
      data: {
        name: "Ruim", title: "T", message: "Mensagem ruim", severity: "warning",
        user_id: "usuario-que-nao-existe-de-verdade",
        recurrence_type: "once", time_of_day: "00:00", timezone: "America/Sao_Paulo",
        starts_at: past, next_run_at: past, created_by_id: master.id,
      },
    });
    createdScheduleIds.push(badSchedule.id);
    const goodSchedule = await prisma.alertSchedule.create({
      data: {
        name: "Boa", title: "T", message: "Mensagem boa", severity: "warning",
        recurrence_type: "once", time_of_day: "00:00", timezone: "America/Sao_Paulo",
        starts_at: past, next_run_at: past, created_by_id: master.id,
      },
    });
    createdScheduleIds.push(goodSchedule.id);

    await runAlertEngineOnce();
    const goodAlerts = await prisma.systemAlert.findMany({ where: { schedule_id: goodSchedule.id } });
    assert.equal(goodAlerts.length, 1, "a programação boa disparou mesmo com a outra sem destinatário válido");
  });

  it("2 recipientes distintos: Geral (user_id null) cria ocorrência endereçada a ninguém específico (mural)", async () => {
    const master = await masterAdmin();
    const past = new Date(Date.now() - 2 * 60 * 1000);
    const schedule = await prisma.alertSchedule.create({
      data: {
        name: "Geral teste", title: "T", message: "Mensagem geral", severity: "info",
        user_id: null,
        recurrence_type: "once", time_of_day: "00:00", timezone: "America/Sao_Paulo",
        starts_at: past, next_run_at: past, created_by_id: master.id,
      },
    });
    createdScheduleIds.push(schedule.id);
    await runAlertEngineOnce();
    const alert = await prisma.systemAlert.findFirstOrThrow({ where: { schedule_id: schedule.id } });
    assert.equal(alert.user_id, null);
  });

  // ── Expiração ─────────────────────────────────────────────────────────

  it("26/27/28/29. ocorrência com expiração: ativa antes do prazo, expira automaticamente, sai da visão ativa, permanece no histórico", async () => {
    const master = await masterAdmin();
    const soon = new Date(Date.now() + 60 * 1000); // expira em 1 minuto
    const created = await api("/api/system-alerts/admin", {
      method: "POST",
      token: tokenFor(master),
      body: { title: "Alerta que expira", message: "Mensagem", severity: "warning", expires_at: soon.toISOString() },
    });
    assert.equal(created.status, 201);
    const alertId = created.json.id as string;

    const beforeExpire = await prisma.systemAlert.findUniqueOrThrow({ where: { id: alertId } });
    assert.equal(beforeExpire.resolved_at, null, "ativa antes do prazo");

    // Força o prazo pro passado (equivalente a esperar) e roda o motor.
    await prisma.systemAlert.update({ where: { id: alertId }, data: { expires_at: new Date(Date.now() - 1000) } });
    await runAlertEngineOnce();

    const afterExpire = await prisma.systemAlert.findUniqueOrThrow({ where: { id: alertId } });
    assert.ok(afterExpire.resolved_at, "expirou automaticamente");
    assert.equal(afterExpire.resolution_reason, "expired");
    assert.equal(afterExpire.is_archived, true, "saiu da visão ativa (arquivada)");
    // Permanece no banco — não foi excluído fisicamente.
    assert.ok(await prisma.systemAlert.findUnique({ where: { id: alertId } }));
  });

  it("30. alerta sem expiração não é encerrado pelo motor", async () => {
    const master = await masterAdmin();
    const created = await api("/api/system-alerts/admin", {
      method: "POST",
      token: tokenFor(master),
      body: { title: "Alerta sem expiração", message: "Mensagem", severity: "info" },
    });
    await runAlertEngineOnce();
    const reloaded = await prisma.systemAlert.findUniqueOrThrow({ where: { id: created.json.id } });
    assert.equal(reloaded.resolved_at, null);
  });

  // ── Regressão ─────────────────────────────────────────────────────────

  it("33/34. Padrões e Regras de tarefa/etapa continuam funcionando (bootstrap idempotente preservado)", async () => {
    const { ensureDefaultAlertStandardsAndRules, STANDARD_KEYS } = await import("../lib/alert-engine");
    await ensureDefaultAlertStandardsAndRules();
    const standards = await prisma.alertStandard.findMany({
      where: { key: { in: [STANDARD_KEYS.DUE_SOON, STANDARD_KEYS.OVERDUE, STANDARD_KEYS.STAGE_DUE_SOON, STANDARD_KEYS.STAGE_OVERDUE] } },
    });
    assert.equal(standards.length, 4);
  });

  it("35. Alertas Avulsos sem imagem continuam funcionando normalmente", async () => {
    const master = await masterAdmin();
    const res = await api("/api/system-alerts/admin", {
      method: "POST",
      token: tokenFor(master),
      body: { title: "Avulso sem imagem", message: "Mensagem simples", severity: "info" },
    });
    assert.equal(res.status, 201);
    assert.equal(res.json.image_url, null);
  });

  it("37. contador de Notificações não é afetado por Alertas Programados/expirados", async () => {
    const master = await masterAdmin();
    const before = await prisma.systemAlert.count({ where: { category: "notificacao" } });
    const past = new Date(Date.now() - 2 * 60 * 1000);
    const schedule = await prisma.alertSchedule.create({
      data: {
        name: "Contador teste", title: "T", message: "Mensagem contador", severity: "info",
        recurrence_type: "once", time_of_day: "00:00", timezone: "America/Sao_Paulo",
        starts_at: past, next_run_at: past, created_by_id: master.id,
      },
    });
    createdScheduleIds.push(schedule.id);
    await runAlertEngineOnce();
    const after = await prisma.systemAlert.count({ where: { category: "notificacao" } });
    assert.equal(after, before, "programação cria categoria 'alerta', nunca 'notificacao'");
  });
});
