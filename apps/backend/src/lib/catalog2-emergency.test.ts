import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeEmergency, validateEmergencyStepInput, type EmergencyStepInput } from "./catalog2-emergency";

const S = (step_key: string, sort_order: number, minutes: number, extra: Partial<EmergencyStepInput> = {}): EmergencyStepInput => ({ task_key: "t", step_key, name: step_key, sort_order, minutes, reduction_minutes: null, extra_kind: null, extra_value: null, exact_cost: minutes, ...extra });
const base = { selected: true, priceRatio: 2, reviewPercent: 10, baseCommercialDays: 10, hoursPerDay: 8 };

describe("Entrega emergencial (B3)", () => {
  it("EM01. desligada ou sem etapa configurada: não está disponível e não muda nada", () => {
    const steps = [S("a", 1, 120), S("b", 2, 120)];
    assert.equal(computeEmergency({ ...base, enabled: false, steps: steps.map((s) => ({ ...s, reduction_minutes: 60, extra_kind: "fixed", extra_value: 50 })) }).available, false);
    const r = computeEmergency({ ...base, enabled: true, steps });
    assert.equal(r.available, false);
    assert.equal(r.extra_price, 0);
    assert.equal(r.minutes_after, r.minutes_before);
  });

  it("EM02. em sequência: o prazo cai pela soma das reduções e o preço sobe pela soma dos adicionais (fixo + percentual)", () => {
    const steps = [S("a", 1, 240, { reduction_minutes: 120, extra_kind: "fixed", extra_value: 100 }), S("b", 2, 240, { reduction_minutes: 60, extra_kind: "percent", extra_value: 50, exact_cost: 100 }), S("c", 3, 240)];
    const r = computeEmergency({ ...base, enabled: true, steps });
    assert.equal(r.available, true);
    assert.equal(r.minutes_before, 720);
    assert.equal(r.minutes_after, 540);
    assert.equal(r.reduction_days, 1, "180 min = 3 h → 1 dia útil de 8 h");
    assert.equal(r.commercial_days_after, 9);
    // percentual: 50% × custo 100 × (1+10%) × razão 2 = 110
    assert.equal(r.items.find((i) => i.step_key === "b")!.extra_price, 110);
    assert.equal(r.extra_price, 210);
  });

  it("EM03. em paralelo: reduzir a etapa mais curta não encurta o prazo; reduzir a mais longa encurta só até a segunda mais longa", () => {
    const flow = (deps: string[] | null) => deps === null ? null : JSON.stringify(deps);
    const mk = (redA: number, redB: number) => [S("a", 1, 300, { depends_on_json: flow([]), reduction_minutes: redA, extra_kind: "fixed", extra_value: 10 }), S("b", 2, 120, { depends_on_json: flow([]), reduction_minutes: redB, extra_kind: "fixed", extra_value: 10 })];
    assert.equal(computeEmergency({ ...base, enabled: true, steps: mk(0, 60) }).reduction_minutes, 0, "a etapa curta não está no caminho mais longo");
    assert.equal(computeEmergency({ ...base, enabled: true, steps: mk(240, 0) }).reduction_minutes, 180, "300→60 mas a outra etapa tem 120: o prazo cai de 300 para 120");
  });

  it("EM04. percentual sem preço calculável fica pendente (nunca inventa valor); não selecionada = só mostra o que custaria", () => {
    const steps = [S("a", 1, 60, { reduction_minutes: 30, extra_kind: "percent", extra_value: 20, exact_cost: 50 })];
    const r = computeEmergency({ ...base, priceRatio: null, enabled: true, steps });
    assert.equal(r.extra_pending, true);
    assert.equal(r.extra_price, null);
    const nao = computeEmergency({ ...base, selected: false, enabled: true, steps });
    assert.equal(nao.selected, false);
    assert.equal(nao.minutes_after, nao.minutes_before, "sem escolher, o prazo não muda");
    assert.ok(nao.extra_price != null && nao.extra_price > 0, "mas o valor possível é informado");
  });

  it("EM05. validação da etapa", () => {
    assert.match(validateEmergencyStepInput({ reduction_minutes: -1 })!, /negativa/);
    assert.match(validateEmergencyStepInput({ reduction_minutes: 90, estimated_minutes: 60 })!, /maior que o tempo/);
    assert.match(validateEmergencyStepInput({ extra_kind: "xx", extra_value: 1 })!, /inválido/);
    assert.match(validateEmergencyStepInput({ extra_kind: "fixed" })!, /juntos/);
    assert.match(validateEmergencyStepInput({ extra_kind: "percent", extra_value: 5000 })!, /alto demais/);
    assert.equal(validateEmergencyStepInput({ reduction_minutes: 30, estimated_minutes: 60, extra_kind: "percent", extra_value: 20 }), null);
  });
});
