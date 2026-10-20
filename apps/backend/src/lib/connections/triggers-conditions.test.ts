import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateActivation, evaluateTrigger, splitMulti, triggerIncompleteReason, describeTrigger, type TriggerContext } from "./triggers";
import { requirementIncompleteReason } from "./requirements";

// Condição do acesso (18/10): várias opções válidas na mesma regra (OU), regras combinadas com E/OU e as origens novas
// (modalidade, primeira execução, renovação, outra conexão, regra comercial). Puro: sem banco.

const ctx = (over: Partial<TriggerContext> = {}, picked: string[] = []): TriggerContext => ({
  selection: { variation_option_keys: picked, addon_keys: [], answers: {} },
  activeTaskKeys: new Set(), activeStepRefs: new Set(), contractedProductIds: new Set(),
  optionsByVariation: new Map([["plat", new Set(["g", "m", "both"])]]),
  ...over,
});

describe("Condição do acesso · avaliação", () => {
  it("exemplo do Produto 1: Google Ads vale com Plataforma = Google OU Ambas; Meta vale com Meta OU Ambas", () => {
    const gads = { kind: "variation", ref_key: "plat", ref_value: "g|both", operator: "eq" };
    const meta = { kind: "variation", ref_key: "plat", ref_value: "m|both", operator: "eq" };
    for (const [picked, g, m] of [[["g"], true, false], [["m"], false, true], [["both"], true, true]] as const) {
      assert.equal(evaluateTrigger(gads, ctx({}, [...picked])), g, `Google com ${picked}`);
      assert.equal(evaluateTrigger(meta, ctx({}, [...picked])), m, `Meta com ${picked}`);
    }
  });

  it("'é diferente de' inverte; 'selecionada' sem valor vale para qualquer opção da variação", () => {
    assert.equal(evaluateTrigger({ kind: "variation", ref_key: "plat", ref_value: "g|both", operator: "neq" }, ctx({}, ["m"])), true);
    assert.equal(evaluateTrigger({ kind: "variation", ref_key: "plat", ref_value: "g|both", operator: "neq" }, ctx({}, ["g"])), false);
    assert.equal(evaluateTrigger({ kind: "variation", ref_key: "plat", operator: "selected" }, ctx({}, ["m"])), true);
    assert.equal(evaluateTrigger({ kind: "variation", ref_key: "plat", operator: "not_selected" }, ctx({}, ["m"])), false);
  });

  it("opção e adicional aceitam vários (OU)", () => {
    assert.equal(evaluateTrigger({ kind: "option", ref_key: "g|m", operator: "selected" }, ctx({}, ["m"])), true);
    assert.equal(evaluateTrigger({ kind: "option", ref_key: "g|m", operator: "not_selected" }, ctx({}, ["both"])), true);
    const c = ctx(); c.selection.addon_keys = ["rel"];
    assert.equal(evaluateTrigger({ kind: "addon", ref_key: "x|rel", operator: "selected" }, c), true);
  });

  it("resposta do questionário: igual a (qualquer dos valores), contém e existe", () => {
    const c = ctx(); c.selection.answers = { site: "sim", obs: "Cliente urgente" };
    assert.equal(evaluateTrigger({ kind: "questionnaire_answer", ref_key: "site", ref_value: "nao|sim", operator: "eq" }, c), true);
    assert.equal(evaluateTrigger({ kind: "questionnaire_answer", ref_key: "site", ref_value: "nao", operator: "neq" }, c), true);
    assert.equal(evaluateTrigger({ kind: "questionnaire_answer", ref_key: "obs", ref_value: "URGENTE", operator: "contains" }, c), true);
    assert.equal(evaluateTrigger({ kind: "questionnaire_answer", ref_key: "obs", operator: "exists" }, c), true);
    assert.equal(evaluateTrigger({ kind: "questionnaire_answer", ref_key: "vazia", operator: "not_exists" }, c), true);
    assert.equal(evaluateTrigger({ kind: "questionnaire_answer", ref_key: "vazia", operator: "exists" }, c), false);
  });

  it("modalidade, primeira execução e renovação", () => {
    assert.equal(evaluateTrigger({ kind: "modality", ref_value: "assinatura", operator: "eq" }, ctx({ modality: "assinatura" })), true);
    assert.equal(evaluateTrigger({ kind: "modality", ref_value: "assinatura", operator: "eq" }, ctx({ modality: null })), false, "sem período = avulso");
    assert.equal(evaluateTrigger({ kind: "modality", ref_value: "avulso", operator: "eq" }, ctx()), true);
    assert.equal(evaluateTrigger({ kind: "modality", ref_value: "avulso", operator: "neq" }, ctx({ modality: "assinatura" })), true);
    assert.equal(evaluateTrigger({ kind: "first_execution", operator: "selected" }, ctx({ firstExecution: true })), true);
    assert.equal(evaluateTrigger({ kind: "first_execution", operator: "selected" }, ctx({ firstExecution: null })), true, "desconhecido vale como primeira");
    assert.equal(evaluateTrigger({ kind: "first_execution", operator: "selected" }, ctx({ firstExecution: false })), false);
    assert.equal(evaluateTrigger({ kind: "renewal", operator: "selected" }, ctx({ firstExecution: false })), true);
    assert.equal(evaluateTrigger({ kind: "renewal", operator: "selected" }, ctx({ firstExecution: null })), false);
    assert.equal(evaluateTrigger({ kind: "first_execution", operator: "not_selected" }, ctx({ firstExecution: false })), true);
  });

  it("outra conexão e regra comercial", () => {
    assert.equal(evaluateTrigger({ kind: "connection", ref_key: "ga", operator: "exists" }, ctx({ activeRequirementKeys: new Set(["ga"]) })), true);
    assert.equal(evaluateTrigger({ kind: "connection", ref_key: "ga", operator: "not_exists" }, ctx({ activeRequirementKeys: new Set() })), true);
    assert.equal(evaluateTrigger({ kind: "commercial_rule", ref_key: "implementation_charge", operator: "exists" }, ctx({ hasImplementationSteps: true, firstExecution: true })), true);
    assert.equal(evaluateTrigger({ kind: "commercial_rule", ref_key: "implementation_charge", operator: "exists" }, ctx({ hasImplementationSteps: true, firstExecution: false })), false);
    assert.equal(evaluateTrigger({ kind: "commercial_rule", ref_key: "recurring_billing", operator: "exists" }, ctx({ modality: "assinatura" })), true);
  });

  it("E (todas) e OU (qualquer) combinam as regras", () => {
    const rules = [{ kind: "first_execution", operator: "selected" }, { kind: "modality", ref_value: "assinatura", operator: "eq" }];
    const c = ctx({ firstExecution: true, modality: "avulso" });
    assert.equal(evaluateActivation("any_trigger", rules, c), true);
    assert.equal(evaluateActivation("all_triggers", rules, c), false);
    assert.equal(evaluateActivation("all_triggers", rules, ctx({ firstExecution: true, modality: "assinatura" })), true);
  });

  it("gatilhos antigos continuam iguais (produto, tarefa, produto vinculado)", () => {
    assert.equal(evaluateTrigger({ kind: "product" }, ctx()), true);
    assert.equal(evaluateTrigger({ kind: "task", ref_key: "t" }, ctx({ activeTaskKeys: new Set(["t"]) })), true);
    assert.equal(evaluateTrigger({ kind: "linked_product", ref_key: "p1|p2" }, ctx({ contractedProductIds: new Set(["p2"]) })), true);
  });
});

describe("Condição do acesso · o que falta", () => {
  it("regra incompleta diz o que falta; regra completa devolve nulo", () => {
    assert.equal(triggerIncompleteReason({ kind: "variation", ref_key: "", operator: "eq" }), "escolha a referência da regra");
    assert.equal(triggerIncompleteReason({ kind: "variation", ref_key: "plat", operator: "eq" }), "escolha ao menos uma opção da variação");
    assert.equal(triggerIncompleteReason({ kind: "variation", ref_key: "plat", operator: "selected" }), null);
    assert.equal(triggerIncompleteReason({ kind: "questionnaire_answer", ref_key: "q", operator: "contains" }), "informe o valor da resposta");
    assert.equal(triggerIncompleteReason({ kind: "modality", operator: "eq" }), "escolha a modalidade");
    assert.equal(triggerIncompleteReason({ kind: "first_execution", operator: "selected" }), null);
    assert.equal(triggerIncompleteReason({ kind: "inventado" }), "escolha a origem da condição");
  });

  it("acesso: condicional sem condição é incompleto; com regras completas ou texto antigo, não", () => {
    const base = { obligation: "conditional", when_needed: "before_step", condition_text: null, activation_mode: "manual", triggers: [] as { kind: string; ref_key?: string }[] };
    assert.match(requirementIncompleteReason(base)!, /defina a condição/);
    assert.equal(requirementIncompleteReason({ ...base, condition_text: "se tiver CRM" }), null);
    assert.equal(requirementIncompleteReason({ ...base, activation_mode: "any_trigger", triggers: [{ kind: "addon", ref_key: "rel" }] }), null);
    assert.match(requirementIncompleteReason({ ...base, activation_mode: "any_trigger", triggers: [{ kind: "variation", ref_key: "" }] })!, /condição incompleta/);
    assert.equal(requirementIncompleteReason({ ...base, obligation: "required" }), null);
  });

  it("valores múltiplos viram texto legível ('a ou b')", () => {
    assert.deepEqual(splitMulti("g| both |"), ["g", "both"]);
    assert.match(describeTrigger({ kind: "variation", ref_key: "plat", ref_value: "g|both" }), /g ou both/);
  });
});
