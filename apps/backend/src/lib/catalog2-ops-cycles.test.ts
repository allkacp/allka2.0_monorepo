import { describe, expect, it } from "vitest";
import { normalizeStepCycles, normalizeStepOps } from "./catalog2-ops";

const week = (from: number, to: number, aw = 2) => ({ from_day: from, to_day: to, approval_window_days: aw });

describe("etapa em ciclos · ops.cycles (lista de ciclos com datas e regras)", () => {
  it("guarda os ciclos cadastrados, cada um com seu período, prazo de aprovação, horas e regra", () => {
    const out = normalizeStepOps({ cycles: { items: [{ ...week(1, 7), hours: 5, rule: "  Relatório da 1ª semana  " }, week(8, 14, 3)] } });
    expect(out?.cycles?.items).toEqual([{ from_day: 1, to_day: 7, approval_window_days: 2, hours: 5, rule: "Relatório da 1ª semana" }, { from_day: 8, to_day: 14, approval_window_days: 3 }]);
  });
  it("aceita o formato antigo (semanal por 30 dias) e gera 1–7, 8–14, 15–21, 22–28, 29–30", () => {
    const c = normalizeStepCycles({ period_days: 7, total_days: 30, approval_window_days: 2 });
    expect(c?.items.map((i) => [i.from_day, i.to_day])).toEqual([[1, 7], [8, 14], [15, 21], [22, 28], [29, 30]]);
  });
  it("rejeita tudo se algum ciclo for inválido (sobreposto, fora de ordem, prazo 0, dia 0) — nada é salvo pela metade", () => {
    expect(normalizeStepCycles({ items: [week(1, 7), week(7, 14)] })).toBeNull(); // sobrepõe
    expect(normalizeStepCycles({ items: [week(8, 14), week(1, 7)] })).toBeNull(); // fora de ordem
    expect(normalizeStepCycles({ items: [week(1, 7, 0)] })).toBeNull();
    expect(normalizeStepCycles({ items: [week(0, 7)] })).toBeNull();
    expect(normalizeStepCycles({ items: [] })).toBeNull();
    expect(normalizeStepOps({ cycles: { items: [week(5, 2)] } })).toBeNull();
  });
  it("permite espaço entre ciclos (ex.: dias 1–7 e 15–21)", () => {
    expect(normalizeStepCycles({ items: [week(1, 7), week(15, 21)] })?.items).toHaveLength(2);
  });
});

import { stepOpsSchema } from "./catalog2-ops";
describe("etapa em ciclos · validação na entrada da API", () => {
  it("aceita ciclos válidos e recusa os inválidos com mensagem clara", () => {
    expect(stepOpsSchema.safeParse({ cycles: { items: [week(1, 7), week(8, 14)] } }).success).toBe(true);
    const bad = stepOpsSchema.safeParse({ cycles: { items: [week(1, 7), week(5, 10)] } });
    expect(bad.success).toBe(false);
    expect(JSON.stringify((bad as any).error.issues)).toMatch(/Ciclos inválidos/);
  });
});
