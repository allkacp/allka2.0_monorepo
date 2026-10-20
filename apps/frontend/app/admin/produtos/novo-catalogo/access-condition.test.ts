import { describe, expect, it } from "vitest";
import {
  conditionFromServer, conditionIssues, describeCondition, emptyCondition, emptyRule, ruleIssue, sourcesFromVersion, triggersFromCondition, OPERATORS_BY_KIND,
  type AccessCondition, type CondRule,
} from "./access-condition";

const version = {
  variations: [{ key: "plataforma", name: "Plataforma", is_active: true, options: [{ key: "meta", label: "Meta Ads" }, { key: "google_ads", label: "Google Ads" }, { key: "ambas", label: "Ambas" }] }],
  addons: [{ key: "relatorio", name: "Relatório extra", is_active: true }],
  tasks: [{ key: "t1", name: "Gestão", steps: [{ key: "s1", name: "Configurar" }], questionnaire: { questions: [{ key: "tem_site", label: "Tem site?", question_type: "single_choice", options: [{ value: "sim", label: "Sim" }, { value: "nao", label: "Não" }] }] } }],
  connection_requirements: [{ key: "ga", label: "Google Ads", connection_type: { name: "Google Ads" } }, { key: "rascunho", label: "Rascunho", draft_incomplete: true, connection_type: { name: "X" } }],
};
const rule = (p: Partial<CondRule>): CondRule => ({ ...emptyRule(), ...p });

describe("Condição do acesso · modelo (sem tela)", () => {
  it("exemplo do Produto 1: Google Ads é necessário quando Plataforma = Google Ads OU Ambas", () => {
    const c: AccessCondition = { mode: "any_trigger", rules: [rule({ kind: "variation", ref_key: "plataforma", operator: "eq", values: ["google_ads", "ambas"] })] };
    expect(conditionIssues(c)).toEqual([]);
    expect(triggersFromCondition(c)).toEqual([{ kind: "variation", ref_key: "plataforma", ref_value: "google_ads|ambas", operator: "eq" }]);
    expect(describeCondition(c, sourcesFromVersion(version))).toBe("a variação “Plataforma” é igual a Google Ads ou Ambas");
  });

  it("exemplo do Produto 1: os acessos da Meta valem quando Plataforma = Meta Ads OU Ambas", () => {
    const c: AccessCondition = { mode: "any_trigger", rules: [rule({ kind: "variation", ref_key: "plataforma", operator: "eq", values: ["meta", "ambas"] })] };
    expect(triggersFromCondition(c)[0]).toMatchObject({ ref_value: "meta|ambas" });
  });

  it("ida e volta com o formato do servidor, sem perder nada", () => {
    const server = { mode: "all_triggers", triggers: [
      { kind: "variation", ref_key: "plataforma", ref_value: "meta|ambas", operator: "eq" },
      { kind: "option", ref_key: "meta|google_ads", ref_value: null, operator: "selected" },
      { kind: "questionnaire_answer", ref_key: "tem_site", ref_value: "sim", operator: "eq" },
      { kind: "first_execution", ref_key: null, ref_value: null, operator: "selected" },
    ] };
    const c = conditionFromServer(server);
    expect(c.mode).toBe("all_triggers");
    expect(c.rules.map((r) => r.values)).toEqual([["meta", "ambas"], ["meta", "google_ads"], ["sim"], []]);
    expect(triggersFromCondition(c)).toEqual([
      { kind: "variation", ref_key: "plataforma", ref_value: "meta|ambas", operator: "eq" },
      { kind: "option", ref_key: "meta|google_ads", ref_value: null, operator: "selected" },
      { kind: "questionnaire_answer", ref_key: "tem_site", ref_value: "sim", operator: "eq" },
      { kind: "first_execution", ref_key: null, ref_value: null, operator: "selected" },
    ]);
  });

  it("gatilhos de tipos que a tela não edita (ex.: produto vinculado) são preservados, nunca apagados", () => {
    const c = conditionFromServer({ mode: "any_trigger", triggers: [{ kind: "linked_product", ref_key: "p1", ref_value: null, operator: "selected" }, { kind: "addon", ref_key: "relatorio", operator: "selected" }] });
    expect(c.rules).toHaveLength(1);
    expect(c.preserved).toEqual([{ kind: "linked_product", ref_key: "p1", ref_value: null, operator: "selected" }]);
    expect(triggersFromCondition(c).map((t) => t.kind)).toEqual(["addon", "linked_product"]);
    expect(conditionIssues({ mode: "any_trigger", rules: [], preserved: c.preserved })).toEqual([]);
  });

  it("regra incompleta diz exatamente o que falta; condição vazia pede ao menos uma regra", () => {
    expect(conditionIssues(emptyCondition())).toEqual(["defina a condição: adicione ao menos uma regra"]);
    expect(ruleIssue(rule({ kind: "" }))).toBe("escolha a origem da condição");
    expect(ruleIssue(rule({ kind: "variation", operator: "eq" }))).toBe("escolha a variação");
    expect(ruleIssue(rule({ kind: "variation", ref_key: "plataforma", operator: "eq", values: [] }))).toBe("escolha ao menos uma opção da variação");
    expect(ruleIssue(rule({ kind: "variation", ref_key: "plataforma", operator: "selected" }))).toBeNull();
    expect(ruleIssue(rule({ kind: "questionnaire_answer", ref_key: "tem_site", operator: "eq" }))).toBe("informe o valor da resposta");
    expect(ruleIssue(rule({ kind: "questionnaire_answer", ref_key: "tem_site", operator: "exists" }))).toBeNull();
    expect(ruleIssue(rule({ kind: "option", operator: "selected", values: [] }))).toBe("escolha ao menos uma opção");
    expect(ruleIssue(rule({ kind: "modality", operator: "eq", values: [] }))).toBe("escolha a modalidade");
    expect(ruleIssue(rule({ kind: "first_execution", operator: "selected" }))).toBeNull();
    expect(ruleIssue(rule({ kind: "renewal", operator: "not_selected" }))).toBeNull();
    expect(ruleIssue(rule({ kind: "step", operator: "exists" }))).toBe("escolha a etapa");
    expect(conditionIssues({ mode: "any_trigger", rules: [rule({ kind: "variation", operator: "eq" })] })[0]).toMatch(/^regra 1: escolha a variação$/);
  });

  it("cada origem só oferece operadores que fazem sentido", () => {
    expect(OPERATORS_BY_KIND.variation).toEqual(["eq", "neq", "selected", "not_selected"]);
    expect(OPERATORS_BY_KIND.questionnaire_answer).toEqual(["eq", "neq", "contains", "exists", "not_exists"]);
    expect(OPERATORS_BY_KIND.connection).toEqual(["exists", "not_exists"]);
    expect(OPERATORS_BY_KIND.first_execution).toEqual(["selected", "not_selected"]);
  });

  it("as listas vêm da versão (nome + ID); rascunho e o próprio acesso não aparecem como 'outra conexão'", () => {
    const src = sourcesFromVersion(version, "ga");
    expect(src.variations).toEqual([{ key: "plataforma", label: "Plataforma", options: [{ key: "meta", label: "Meta Ads" }, { key: "google_ads", label: "Google Ads" }, { key: "ambas", label: "Ambas" }] }]);
    expect(src.addons).toEqual([{ key: "relatorio", label: "Relatório extra" }]);
    expect(src.questions[0]).toMatchObject({ key: "tem_site", options: [{ key: "sim", label: "Sim" }, { key: "nao", label: "Não" }] });
    expect(src.steps).toEqual([{ key: "t1:s1", label: "Configurar (Gestão)" }]);
    expect(src.connections).toEqual([]); // "ga" é o próprio; "rascunho" é incompleto
    expect(sourcesFromVersion(version).connections.map((c) => c.key)).toEqual(["ga"]);
  });

  it("E / OU mudam a frase", () => {
    const rules = [rule({ kind: "first_execution", operator: "selected" }), rule({ kind: "modality", operator: "eq", values: ["assinatura"] })];
    const src = sourcesFromVersion(version);
    expect(describeCondition({ mode: "all_triggers", rules }, src)).toBe("é a primeira execução, e a modalidade é igual a Assinatura mensal");
    expect(describeCondition({ mode: "any_trigger", rules }, src)).toBe("é a primeira execução, ou a modalidade é igual a Assinatura mensal");
  });
});
