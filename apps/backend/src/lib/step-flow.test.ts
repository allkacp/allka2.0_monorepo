import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { criticalPathMinutes, directDeps, effectiveDeps, flowWaves, hasConfiguredFlow, parseDepends, validateStepFlow, type FlowStep } from "./step-flow";

const S = (key: string, sort: number, deps: string[] | null | undefined, min = 60, extra: Partial<FlowStep> = {}): FlowStep => ({ key, name: key.toUpperCase(), sort_order: sort, depends_on: deps, estimated_minutes: min, ...extra });

describe("Fluxo das etapas · funções puras (A8)", () => {
  it("FL01. sem configuração = sequência antiga (cada etapa depende da anterior); não conta como fluxo configurado", () => {
    const steps = [S("a", 1, null), S("b", 2, null), S("c", 3, null)];
    assert.equal(hasConfiguredFlow(steps), false);
    assert.equal(hasConfiguredFlow(steps.map((s) => (s.key === "c" ? { ...s, executor_policy: "same_as_step", executor_same_as_key: "a" } : s))), true, "só a regra de executor já ativa o fluxo");
    assert.deepEqual([...directDeps(steps)], [["a", []], ["b", ["a"]], ["c", ["b"]]]);
    assert.deepEqual(flowWaves(steps), [["a"], ["b"], ["c"]]);
  });

  it("FL02. 1, 2 e 3 juntas; 4 só depois da 3; 5 só depois de todas — e a duração mínima conta só o caminho mais longo", () => {
    const steps = [S("e1", 1, [], 60), S("e2", 2, [], 120), S("e3", 3, [], 30), S("e4", 4, ["e3"], 45), S("e5", 5, ["e1", "e2", "e3", "e4"], 15)];
    assert.equal(hasConfiguredFlow(steps), true);
    assert.deepEqual(flowWaves(steps), [["e1", "e2", "e3"], ["e4"], ["e5"]]);
    assert.equal(criticalPathMinutes(steps), 120 + 15, "e2 (120) é a mais demorada; e5 depende de todas");
    assert.equal(steps.reduce((a, s) => a + (s.estimated_minutes ?? 0), 0), 270, "o esforço total continua sendo a soma");
    assert.deepEqual(validateStepFlow(steps), []);
  });

  it("FL03. valida: etapa inexistente, dependência de si mesma, círculo e falta de etapa inicial", () => {
    assert.match(validateStepFlow([S("a", 1, ["x"])])[0], /não existe/);
    assert.match(validateStepFlow([S("a", 1, ["a"])])[0], /dela mesma/);
    const circle = validateStepFlow([S("a", 1, ["b"]), S("b", 2, ["a"])]);
    assert.match(circle.join(" "), /círculo|Pelo menos uma etapa/);
    assert.match(validateStepFlow([S("a", 1, ["b"]), S("b", 2, ["c"]), S("c", 3, ["a"])]).join(" "), /círculo/);
    assert.deepEqual(validateStepFlow([S("a", 1, []), S("b", 2, ["a"])]), []);
  });

  it("FL04. 'mesmo executor': a etapa de origem precisa existir, não ser ela mesma e terminar ANTES", () => {
    const base = [S("a", 1, []), S("b", 2, ["a"]), S("c", 3, [])];
    assert.deepEqual(validateStepFlow(base.map((s) => (s.key === "b" ? { ...s, executor_policy: "same_as_step", executor_same_as_key: "a" } : s))), []);
    assert.match(validateStepFlow(base.map((s) => (s.key === "b" ? { ...s, executor_policy: "same_as_step", executor_same_as_key: null } : s)))[0], /falta dizer de qual/);
    assert.match(validateStepFlow(base.map((s) => (s.key === "b" ? { ...s, executor_policy: "same_as_step", executor_same_as_key: "b" } : s)))[0], /dela mesma/);
    assert.match(validateStepFlow(base.map((s) => (s.key === "b" ? { ...s, executor_policy: "same_as_step", executor_same_as_key: "c" } : s)))[0], /termina ANTES/, "c roda em paralelo: não é ancestral de b");
    assert.match(validateStepFlow(base.map((s) => (s.key === "b" ? { ...s, executor_policy: "outro" } : s)))[0], /inválida/);
  });

  it("FL05. etapa removida do cenário passa adiante as dependências dela (ninguém fica esperando uma etapa que não existe)", () => {
    const all = [S("a", 1, []), S("b", 2, ["a"]), S("c", 3, ["b"])];
    const eff = effectiveDeps(all, new Set(["a", "c"]));
    assert.deepEqual(eff.get("c"), ["a"]);
    assert.deepEqual(eff.get("a"), []);
    assert.equal(eff.has("b"), false);
  });

  it("FL06. parseDepends tolera JSON, lixo e valores repetidos", () => {
    assert.equal(parseDepends(null), null);
    assert.equal(parseDepends("não é json"), null);
    assert.deepEqual(parseDepends("[]"), []);
    assert.deepEqual(parseDepends('["a","a","b",3,""]'), ["a", "b"]);
    assert.deepEqual(parseDepends(["x"]), ["x"]);
  });
});
