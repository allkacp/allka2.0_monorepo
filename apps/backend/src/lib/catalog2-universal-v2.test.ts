import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeAddonSelections, type AddonLike } from "./catalog2-addon-types";
import { effortActiveAt, effortMinutesOf, validateEffortEffect } from "./catalog2-effort";
import { normalizeAvailability, strongestRequirement } from "./catalog2-availability";
import { canDecide, isActionable } from "./approval-gates";
import { evaluateActivation, evaluateTrigger, type TriggerContext } from "./connections/triggers";

describe("Estrutura universal v2 · funções puras", () => {
  it("V-U01. esforço: horas viram minutos, valores inválidos viram 0 e o escopo decide em que ciclo entra", () => {
    assert.equal(effortMinutesOf("add_effort_minutes", "30"), 30);
    assert.equal(effortMinutesOf("add_effort_hours", "1,5"), 90);
    assert.equal(effortMinutesOf("add_effort_minutes", "-3"), 0);
    assert.equal(effortMinutesOf("add_effort_minutes", "abc"), 0);
    assert.equal(effortActiveAt({ scope: "implementation", start: 0, end: null }, 0), true);
    assert.equal(effortActiveAt({ scope: "implementation", start: 0, end: null }, 1), false);
    assert.equal(effortActiveAt({ scope: "implementation", start: 0, end: null }, 0, false), false, "implantação já concluída: não entra");
    assert.equal(effortActiveAt({ scope: "first_cycle", start: 0, end: null }, 0), true);
    assert.equal(effortActiveAt({ scope: "first_cycle", start: 0, end: null }, 1), false);
    assert.equal(effortActiveAt({ scope: "recurring", start: 0, end: null }, 7), true);
    assert.equal(effortActiveAt({ scope: "recurring", start: 2, end: 4 }, 1), false);
    assert.equal(effortActiveAt({ scope: "recurring", start: 2, end: 4 }, 3), true);
    assert.equal(effortActiveAt({ scope: "recurring", start: 2, end: 4 }, 5), false);
    assert.equal(effortActiveAt({ scope: "per_cycle", start: 2, end: 2 }, 2), true, "ciclo específico");
    assert.equal(effortActiveAt({ scope: "per_cycle", start: 2, end: 2 }, 3), false);
  });

  it("V-U02. validação do alvo do esforço", () => {
    const ctx = { taskKeys: new Set(["t1"]), stepRefs: new Set(["t1:s1"]) };
    assert.equal(validateEffortEffect("add_effort_minutes", "30", { source_task_key: "t1", source_step_key: "s1" }, ctx), null);
    assert.match(validateEffortEffect("add_effort_minutes", "30", {}, ctx)!, /Escolha a tarefa/);
    assert.match(validateEffortEffect("add_effort_minutes", "30", { source_task_key: "x" }, ctx)!, /não existe/);
    assert.match(validateEffortEffect("add_effort_minutes", "30", { source_task_key: "t1", source_step_key: "x" }, ctx)!, /etapa/);
    assert.match(validateEffortEffect("add_effort_hours", "-1", { source_task_key: "t1" }, ctx)!, /número/);
    assert.match(validateEffortEffect("replace_effort_minutes", "10", { source_task_key: "t1", charge_scope: "one_time" }, ctx)!, /todos os ciclos/);
    assert.equal(validateEffortEffect("add_deadline_days", "x", {}, ctx), null, "outros efeitos não passam por aqui");
  });

  it("V-U03. disponibilidade: padrão 'auto' e o mais restritivo vence", () => {
    assert.equal(normalizeAvailability(undefined), "auto");
    assert.equal(normalizeAvailability("lixo"), "auto");
    assert.equal(normalizeAvailability("custom_quote"), "custom_quote");
    const r = (kind: string) => ({ kind, from: "x", label: "x", message: "x" });
    assert.equal(strongestRequirement([]), null);
    assert.equal(strongestRequirement([r("commercial_review"), r("assisted_only")]), "assisted_only");
    assert.equal(strongestRequirement([r("assisted_only"), r("custom_quote"), r("commercial_review")]), "custom_quote");
  });

  it("V-U04. adicionais tipados: limites, incremento, faixa, valor informado e escolhas", () => {
    const A: AddonLike[] = [
      { key: "q", name: "Q", is_active: true, addon_type: "quantity", qty_min: 2, qty_max: 10, qty_step: 2, auto_quote_limit: 8, unit_label: "un" },
      { key: "r", name: "R", is_active: true, addon_type: "range", choices: [{ key: "a", label: "1–5", is_active: true, qty_from: 1, qty_to: 5 }, { key: "b", label: "6+", is_active: true, qty_from: 6, requires_quote: true }] },
      { key: "v", name: "V", is_active: true, addon_type: "quoted_value" },
      { key: "s", name: "S", is_active: true, addon_type: "single_select", choices: [{ key: "x", label: "X", is_active: true, is_default: true }, { key: "y", label: "Y", is_active: true }] },
      { key: "m", name: "M", is_active: true, addon_type: "multi_select", choices: [{ key: "x", label: "X", is_active: true }, { key: "y", label: "Y", is_active: true }] },
      { key: "c", name: "C", is_active: true },
      { key: "off", name: "Off", is_active: false },
    ];
    const run = (sel: Parameters<typeof normalizeAddonSelections>[1]) => normalizeAddonSelections(A, sel);
    assert.equal(run({ addon_keys: ["q"] }).chosen[0].quantity, 2, "sem quantidade informada vale o mínimo");
    assert.equal(run({ addon_selections: { q: { quantity: 6 } } }).chosen[0].quantity, 6);
    assert.equal(run({ addon_selections: { q: { quantity: 5 } } }).issues[0].code, "addon_quantity_step");
    assert.equal(run({ addon_selections: { q: { quantity: 12 } } }).issues[0].code, "addon_quantity_max");
    assert.equal(run({ addon_selections: { q: { quantity: 1 } } }).issues[0].code, "addon_quantity_min");
    assert.match(run({ addon_selections: { q: { quantity: 10 } } }).chosen[0].requiresQuote!, /acima de 8 un/);
    assert.equal(run({ addon_selections: { q: { quantity: 8 } } }).chosen[0].requiresQuote, null);
    assert.equal(run({ addon_selections: { r: { quantity: 3 } } }).chosen[0].choices[0].key, "a");
    assert.match(run({ addon_selections: { r: { quantity: 9 } } }).chosen[0].requiresQuote!, /orçamento/);
    assert.equal(run({ addon_selections: { v: { value: 1000 } } }).chosen[0].value, 1000);
    assert.ok(run({ addon_selections: { v: { value: 1000 } } }).chosen[0].requiresQuote);
    assert.equal(run({ addon_keys: ["s"] }).chosen[0].choices[0].key, "x", "escolha padrão");
    assert.equal(run({ addon_selections: { s: { choice_keys: ["x", "y"] } } }).issues[0].code, "addon_choice_many");
    assert.equal(run({ addon_selections: { m: { choice_keys: ["x", "y"] } } }).chosen[0].choices.length, 2);
    assert.equal(run({ addon_keys: ["c"] }).chosen[0].quantity, 1, "checkbox = 1");
    assert.equal(run({ addon_keys: ["off"] }).issues[0].code, "addon_inactive");
    assert.equal(run({ addon_keys: ["nao_existe"] }).issues[0].code, "addon_unknown");
  });

  it("V-U05. portões: sequência libera um de cada vez; paralelo libera todos; quem decide cada tipo", () => {
    const g = (status: string, group_key: string | null, seq: number, mode = "sequence") => ({ id: "x", project_id: "p", project_task_id: "t", gate_key: `g${seq}`, name: "G", position: "before_step", approver_kind: "client", group_key, sequence_no: seq, group_mode: mode, anchor_stage_key: null, return_stage_key: null, requires_comment: false, is_required: true, status, round: 0 });
    const seq = [g("pendente", "a", 1), g("pendente", "a", 2), g("pendente", "a", 3)];
    assert.deepEqual(seq.map((x) => isActionable(x, seq)), [true, false, false]);
    const seq2 = [g("aprovada", "a", 1), g("pendente", "a", 2), g("pendente", "a", 3)];
    assert.deepEqual(seq2.map((x) => isActionable(x, seq2)), [false, true, false]);
    const par = [g("pendente", "p", 1, "parallel"), g("pendente", "p", 2, "parallel")];
    assert.deepEqual(par.map((x) => isActionable(x, par)), [true, true]);
    const solo = [g("pendente", null, 0)];
    assert.equal(isActionable(solo[0], solo), true);
    assert.equal(canDecide({ approver_kind: "client" }, { id: "u", kind: "company" }).ok, true);
    assert.equal(canDecide({ approver_kind: "client" }, { id: "u", kind: "agency" }).ok, true);
    assert.deepEqual(canDecide({ approver_kind: "client" }, { id: "u", kind: "admin" }), { ok: true, onBehalf: true });
    assert.equal(canDecide({ approver_kind: "client" }, { id: "u", kind: "leader" }).ok, false);
    assert.equal(canDecide({ approver_kind: "internal" }, { id: "u", kind: "company" }).ok, false);
    assert.equal(canDecide({ approver_kind: "internal" }, { id: "u", kind: "leader" }).ok, true);
    assert.equal(canDecide({ approver_kind: "leader" }, { id: "u", kind: "leader", isTaskLeader: false }).ok, false);
    assert.equal(canDecide({ approver_kind: "leader" }, { id: "u", kind: "leader", isTaskLeader: true }).ok, true);
    assert.equal(canDecide({ approver_kind: "leader" }, { id: "u", kind: "nomad" }).ok, false);
  });

  it("V-U06. gatilhos de conexão: cada tipo, operadores e modos de ativação", () => {
    const ctx: TriggerContext = {
      selection: { variation_option_keys: ["g"], addon_keys: ["ga4"], quantity: 1, answers: { site: "sim", nome: "Loja Azul" } },
      activeTaskKeys: new Set(["a", "extra"]), activeStepRefs: new Set(["a:s1", "a:b"]), contractedProductIds: new Set(["P1", "P2"]),
      optionsByVariation: new Map([["plat", new Set(["g", "m", "both"])]]),
    };
    const t = (kind: string, ref_key?: string, ref_value?: string, operator?: string) => evaluateTrigger({ kind, ref_key, ref_value, operator }, ctx);
    assert.equal(t("product"), true);
    assert.equal(t("option", "g"), true);
    assert.equal(t("option", "m"), false);
    assert.equal(t("option", "m", undefined, "not_selected"), true);
    assert.equal(t("variation", "plat"), true, "qualquer opção da variação");
    assert.equal(t("variation", "plat", "g"), true);
    assert.equal(t("variation", "plat", "m"), false);
    assert.equal(t("variation", "inexistente"), false);
    assert.equal(t("addon", "ga4"), true);
    assert.equal(t("addon", "outro"), false);
    assert.equal(t("task", "extra"), true);
    assert.equal(t("task", "nao"), false);
    assert.equal(t("step", "a:b"), true);
    assert.equal(t("linked_product", "P2"), true);
    assert.equal(t("linked_product", "P9"), false);
    assert.equal(t("questionnaire_answer", "site"), true);
    assert.equal(t("questionnaire_answer", "site", "sim", "eq"), true);
    assert.equal(t("questionnaire_answer", "site", "nao", "eq"), false);
    assert.equal(t("questionnaire_answer", "site", "nao", "neq"), true);
    assert.equal(t("questionnaire_answer", "nome", "azul", "contains"), true);
    assert.equal(t("questionnaire_answer", "vazia"), false);
    assert.equal(t("questionnaire_answer", "vazia", undefined, "not_selected"), true);
    assert.equal(t("inventado", "x"), false);
    const trg = [{ kind: "option", ref_key: "g" }, { kind: "option", ref_key: "m" }];
    assert.equal(evaluateActivation("any_trigger", trg, ctx), true);
    assert.equal(evaluateActivation("all_triggers", trg, ctx), false);
    assert.equal(evaluateActivation("all_triggers", [trg[0], { kind: "addon", ref_key: "ga4" }], ctx), true);
  });
});
