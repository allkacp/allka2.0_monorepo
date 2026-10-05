import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { addBusinessMinutes, businessMinutesBetween, clockDisplay, computeDue, dueAfterResume, nextBusinessInstant, remainingMinutes } from "./sla";

// 2026-10-02 é sexta-feira. Horário local; janela comercial 09:00–17:00 (8h), segunda a sexta.
const d = (day: number, h = 9, m = 0) => new Date(2026, 9, day, h, m, 0, 0); // outubro/2026
const FRI = 2, MON = 5, TUE = 6;

describe("SLA · aritmética de tempo", () => {
  it("S-U01. horas úteis: sexta 16h + 2h = segunda 10h (pula o fim de semana)", () => {
    assert.equal(computeDue(d(FRI, 16), 2, "business_hours").getTime(), d(MON, 10).getTime());
    assert.equal(businessMinutesBetween(d(FRI, 16), d(MON, 10)), 120);
  });
  it("S-U02. dias úteis: sexta 10h + 1 dia útil = segunda 10h; 7 dias úteis a partir de sexta 9h = segunda da semana seguinte, 17h", () => {
    assert.equal(computeDue(d(FRI, 10), 1, "business_days").getTime(), d(MON, 10).getTime());
    assert.equal(computeDue(d(FRI, 9), 7, "business_days").getTime(), d(12, 17).getTime());
  });
  it("S-U03. dias corridos: soma exata de 24h por dia, inclusive fim de semana", () => {
    assert.equal(computeDue(d(FRI, 10), 30, "calendar_days").getTime(), d(FRI, 10).getTime() + 30 * 86400000);
    assert.equal(computeDue(d(FRI, 10), 3, "calendar_days").getTime(), d(5, 10).getTime(), "sexta + 3 corridos = segunda");
  });
  it("S-U04. âncora fora da janela comercial: fim de semana, antes das 9h e depois das 17h", () => {
    assert.equal(nextBusinessInstant(d(3, 12)).getTime(), d(MON, 9).getTime(), "sábado → segunda 9h");
    assert.equal(nextBusinessInstant(d(4, 15)).getTime(), d(MON, 9).getTime(), "domingo → segunda 9h");
    assert.equal(nextBusinessInstant(d(TUE, 7)).getTime(), d(TUE, 9).getTime(), "antes das 9h");
    assert.equal(nextBusinessInstant(d(TUE, 18)).getTime(), d(7, 9).getTime(), "depois das 17h → dia seguinte");
    assert.equal(addBusinessMinutes(d(3, 12), 60).getTime(), d(MON, 10).getTime());
  });
  it("S-U05. pausa e retomada: o que faltava continua a contar a partir de agora (mesma quantidade de tempo útil)", () => {
    const due = computeDue(d(TUE, 9), 3, "business_days"); // terça 9h + 3 dias úteis
    const pausedAt = d(7, 10); // quarta 10h
    const remaining = remainingMinutes(pausedAt, due, "business_days");
    assert.ok(remaining > 0);
    const resumeAt = d(12, 11); // segunda seguinte 11h
    const newDue = dueAfterResume(resumeAt, remaining, "business_days");
    assert.equal(businessMinutesBetween(resumeAt, newDue), remaining, "mesmo tempo útil restante");
    assert.ok(newDue.getTime() > due.getTime(), "o prazo andou para frente");
    // dias corridos: o restante em milissegundos se preserva
    const dueC = computeDue(d(TUE, 9), 10, "calendar_days");
    const remC = remainingMinutes(d(7, 10), dueC, "calendar_days");
    assert.equal(dueAfterResume(resumeAt, remC, "calendar_days").getTime() - resumeAt.getTime(), dueC.getTime() - d(7, 10).getTime());
  });
  it("S-U06. estado exibido: aguardando, correndo, pausado, estourado e concluído", () => {
    const now = d(TUE, 12);
    assert.equal(clockDisplay({ status: "aguardando", due_at: null }, now), "aguardando");
    assert.equal(clockDisplay({ status: "correndo", due_at: d(7, 12) }, now), "correndo");
    assert.equal(clockDisplay({ status: "correndo", due_at: d(TUE, 8) }, now), "estourado");
    assert.equal(clockDisplay({ status: "pausado", due_at: d(TUE, 8) }, now), "pausado", "pausado nunca estoura");
    assert.equal(clockDisplay({ status: "concluido", due_at: d(TUE, 8) }, now), "concluido");
  });
});
