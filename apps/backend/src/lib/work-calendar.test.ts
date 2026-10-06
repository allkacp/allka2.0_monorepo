import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { addBusinessMinutes, businessMinutesBetween, computeDue } from "./sla";
import { DEFAULT_CALENDAR, fmtTime, isNonWorkday, parseTime, parseWorkDays, setBusinessCalendar, validateCalendarInput } from "./work-calendar";

// 2026-10-05 é segunda-feira. Horário local.
const d = (day: number, h = 9, m = 0) => new Date(2026, 9, day, h, m, 0, 0);

describe("Calendário de trabalho (B2)", () => {
  afterEach(() => setBusinessCalendar(null));

  it("WC01. sem configuração vale o padrão antigo (seg-sex, 09-17, sem feriados)", () => {
    setBusinessCalendar(null);
    assert.equal(addBusinessMinutes(d(9, 16), 120).getTime(), d(12, 10).getTime(), "sexta 16h + 2h = segunda 10h");
    assert.equal(isNonWorkday(d(10, 12)), true, "sábado");
  });

  it("WC02. feriado é pulado: segunda 12/10 feriado → sexta 9/10 16h + 2h = terça 13/10 10h", () => {
    setBusinessCalendar({ ...DEFAULT_CALENDAR, holidays: ["2026-10-12"] });
    assert.equal(addBusinessMinutes(d(9, 16), 120).getTime(), d(13, 10).getTime());
    assert.equal(businessMinutesBetween(d(9, 16), d(13, 10)), 120);
    assert.equal(computeDue(d(9, 10), 1, "business_days").getTime(), d(13, 10).getTime(), "1 dia útil a partir de sexta 10h pulando fim de semana e feriado");
  });

  it("WC03. expediente e dias configuráveis: 08:00–12:00 de segunda a sábado (4 h por dia)", () => {
    setBusinessCalendar({ startMin: 8 * 60, endMin: 12 * 60, workDays: [1, 2, 3, 4, 5, 6], holidays: [] });
    assert.equal(computeDue(d(5, 8), 1, "business_days").getTime(), d(5, 12).getTime(), "um dia útil = 4 h");
    assert.equal(addBusinessMinutes(d(10, 11), 120).getTime(), d(12, 9).getTime(), "sábado 11h + 2h = 1h no sábado + 1h na segunda (domingo não trabalha)");
    assert.equal(isNonWorkday(d(11, 10)), true, "domingo");
    assert.equal(isNonWorkday(d(10, 10)), false, "sábado agora é útil");
  });

  it("WC04. validação e conversões", () => {
    assert.equal(validateCalendarInput({ work_days: [], start_time: "09:00", end_time: "17:00" }), "Escolha ao menos um dia útil.");
    assert.match(validateCalendarInput({ work_days: [1], start_time: "09:00", end_time: "09:30" })!, /pelo menos 1 hora/);
    assert.match(validateCalendarInput({ work_days: [1], start_time: "xx", end_time: "17:00" })!, /inválidos/);
    assert.equal(validateCalendarInput({ work_days: [1, 2], start_time: "08:30", end_time: "18:00" }), null);
    assert.equal(parseTime("08:30", 0), 510);
    assert.equal(fmtTime(510), "08:30");
    assert.deepEqual(parseWorkDays("3,1,1,9,x"), [1, 3]);
    assert.deepEqual(parseWorkDays(""), [1, 2, 3, 4, 5]);
  });
});
