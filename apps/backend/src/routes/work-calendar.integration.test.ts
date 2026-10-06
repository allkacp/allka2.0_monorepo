import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { prisma } from "../lib/prisma";
import { api, mkAdmin, mkCompanyUser, startServer, stopServer } from "../test-support/universal-helpers";

// Calendário de trabalho da plataforma (B2): leitura para todos, escrita só do administrador; padrão antigo quando nada foi cadastrado.
let ADMIN: Awaited<ReturnType<typeof mkAdmin>>;
let CO: Awaited<ReturnType<typeof mkCompanyUser>>;

describe("Calendário de trabalho · rotas", () => {
  before(async () => { await startServer(); ADMIN = await mkAdmin(); CO = await mkCompanyUser("CAL"); await prisma.platformHoliday.deleteMany({}); await prisma.platformWorkCalendar.deleteMany({}); });
  after(async () => { await prisma.platformHoliday.deleteMany({}); await prisma.platformWorkCalendar.deleteMany({}); await stopServer(); });

  it("CAL01. sem cadastro devolve o padrão (seg-sex, 09:00–17:00, 8 h por dia) e qualquer usuário consegue ler", async () => {
    const r = await api("/api/work-calendar", { token: CO.token });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    assert.deepEqual(r.json.work_days, [1, 2, 3, 4, 5]);
    assert.deepEqual([r.json.start_time, r.json.end_time, r.json.business_hours_per_day], ["09:00", "17:00", 8]);
    assert.deepEqual(r.json.holidays, []);
  });

  it("CAL02. só o administrador altera; valida dias, horários e expediente mínimo", async () => {
    const body = { work_days: [1, 2, 3, 4, 5, 6], start_time: "08:00", end_time: "12:00" };
    assert.equal((await api("/api/work-calendar", { method: "PUT", token: CO.token, body })).status, 403);
    assert.equal((await api("/api/work-calendar", { method: "PUT", token: ADMIN.token, body: { ...body, work_days: [] } })).status, 400);
    assert.equal((await api("/api/work-calendar", { method: "PUT", token: ADMIN.token, body: { ...body, end_time: "08:30" } })).status, 422);
    const ok = await api("/api/work-calendar", { method: "PUT", token: ADMIN.token, body });
    assert.equal(ok.status, 200, JSON.stringify(ok.json));
    assert.deepEqual([ok.json.work_days, ok.json.business_hours_per_day], [[1, 2, 3, 4, 5, 6], 4]);
    assert.equal((await api("/api/work-calendar", { token: CO.token })).json.start_time, "08:00");
  });

  it("CAL03. feriados: cria, recusa duplicado e data inválida, remove; só administrador", async () => {
    const add = (token: string, body: unknown) => api("/api/work-calendar/holidays", { method: "POST", token, body });
    assert.equal((await add(CO.token, { date: "2026-11-15", name: "Proclamação da República" })).status, 403);
    const ok = await add(ADMIN.token, { date: "2026-11-15", name: "Proclamação da República" });
    assert.equal(ok.status, 201, JSON.stringify(ok.json));
    assert.equal(ok.json.holidays.length, 1);
    assert.equal((await add(ADMIN.token, { date: "2026-11-15", name: "Repetido" })).status, 409);
    assert.equal((await add(ADMIN.token, { date: "15/11/2026", name: "Formato errado" })).status, 400);
    assert.equal((await api(`/api/work-calendar/holidays/${ok.json.holidays[0].id}`, { method: "DELETE", token: CO.token })).status, 403);
    const del = await api(`/api/work-calendar/holidays/${ok.json.holidays[0].id}`, { method: "DELETE", token: ADMIN.token });
    assert.equal(del.status, 200);
    assert.deepEqual(del.json.holidays, []);
  });
});
