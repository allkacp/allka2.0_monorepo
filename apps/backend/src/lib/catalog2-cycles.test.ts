import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deriveContractMode, planTaskForCycle, type CycleContext, type CycleTaskInput } from "./catalog2-cycles";

const task = (over: Partial<CycleTaskInput> = {}): CycleTaskInput => ({
  key: "t", name: "T", cycle_type: "recorrente", repeat_rule: "all_cycles", repeat_every_cycles: null, task_model_id: 1, ...over,
});
const ctx = (over: Partial<CycleContext> = {}): CycleContext => ({
  cycleIndex: 0, contractMode: "mensal_implementacao", hasImplementation: true, implementationRule: "first_only", isFirstContract: true,
  completedImplementation: { modelIds: new Set(), keys: new Set() }, revalidationReason: null, ...over,
});

describe("modalidade do contrato", () => {
  it("avulso quando não há período mensal recorrente; mensal ou mensal+implementação conforme o produto", () => {
    assert.equal(deriveContractMode({ periodMonths: null, deliveryRecurrence: null, hasImplementation: true }), "avulso");
    assert.equal(deriveContractMode({ periodMonths: 1, deliveryRecurrence: "mensal", hasImplementation: false }), "avulso");
    assert.equal(deriveContractMode({ periodMonths: 3, deliveryRecurrence: "mensal", hasImplementation: false }), "mensal");
    assert.equal(deriveContractMode({ periodMonths: 6, deliveryRecurrence: "mensal", hasImplementation: true }), "mensal_implementacao");
    assert.equal(deriveContractMode({ periodMonths: 6, deliveryRecurrence: null, hasImplementation: true }), "avulso");
  });
});

describe("quais tarefas nascem em cada ciclo", () => {
  it("1º ciclo da 1ª contratação: implementação + operação recorrente", () => {
    const impl = planTaskForCycle(task({ cycle_type: "implementacao" }), ctx());
    assert.deepEqual(impl, { generate: true, cycleKind: "implementacao" });
    const op = planTaskForCycle(task(), ctx());
    assert.deepEqual(op, { generate: true, cycleKind: "recorrencia_mensal" });
  });

  it("ciclos seguintes: só recorrentes; implementação e avulsas não se repetem", () => {
    const next = ctx({ cycleIndex: 1 });
    assert.equal(planTaskForCycle(task({ cycle_type: "implementacao" }), next).generate, false);
    assert.equal(planTaskForCycle(task({ cycle_type: "avulso" }), next).generate, false);
    assert.equal(planTaskForCycle(task(), next).generate, true);
  });

  it("regras de repetição: só na 1ª vez, a cada N ciclos, manual, por condição", () => {
    assert.equal(planTaskForCycle(task({ repeat_rule: "first_only" }), ctx({ cycleIndex: 0 })).generate, true);
    assert.equal(planTaskForCycle(task({ repeat_rule: "first_only" }), ctx({ cycleIndex: 1 })).generate, false);
    const every2 = task({ repeat_rule: "every_n_cycles", repeat_every_cycles: 2 });
    assert.deepEqual([0, 1, 2, 3, 4].map((k) => planTaskForCycle(every2, ctx({ cycleIndex: k })).generate), [true, false, true, false, true]);
    assert.equal(planTaskForCycle(task({ repeat_rule: "manual" }), ctx()).generate, false);
    assert.equal(planTaskForCycle(task({ repeat_rule: "on_condition" }), ctx()).generate, false);
    assert.equal(planTaskForCycle(task({ cycle_type: "sob_demanda" }), ctx()).generate, false);
  });

  it("implementação já concluída para o cliente NÃO se repete — salvo regra 'sempre' ou revalidação", () => {
    const done = { modelIds: new Set([1]), keys: new Set<string>() };
    const impl = task({ cycle_type: "implementacao" });
    const second = planTaskForCycle(impl, ctx({ isFirstContract: false, completedImplementation: done }));
    assert.equal(second.generate, false);
    assert.equal((second as { code: string }).code, "implementation_done");
    assert.equal(planTaskForCycle(impl, ctx({ isFirstContract: false, completedImplementation: done, implementationRule: "always" })).generate, true);
    const reval = planTaskForCycle(impl, ctx({ isFirstContract: false, completedImplementation: done, revalidationReason: "acesso expirado" }));
    assert.equal(reval.generate, true);
    assert.equal((reval as { cycleKind: string }).cycleKind, "revalidacao");
  });

  it("regra 'somente revalidação': roda na 1ª vez; depois só com motivo", () => {
    const impl = task({ cycle_type: "implementacao" });
    assert.equal(planTaskForCycle(impl, ctx({ implementationRule: "on_revalidation", isFirstContract: true })).generate, true);
    assert.equal(planTaskForCycle(impl, ctx({ implementationRule: "on_revalidation", isFirstContract: false })).generate, false);
    assert.equal(planTaskForCycle(impl, ctx({ implementationRule: "on_revalidation", isFirstContract: false, revalidationReason: "novo ambiente" })).generate, true);
  });

  it("implementação ainda não concluída (contrato anterior sem terminar) roda de novo no 'first_only'", () => {
    const impl = task({ cycle_type: "implementacao" });
    assert.equal(planTaskForCycle(impl, ctx({ isFirstContract: false })).generate, true);
  });

  it("produto avulso: tarefas viram 'avulso'", () => {
    assert.deepEqual(planTaskForCycle(task(), ctx({ contractMode: "avulso" })), { generate: true, cycleKind: "avulso" });
  });
});
