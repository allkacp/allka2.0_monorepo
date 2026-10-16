import { describe, expect, it } from "vitest";
import { draftFromServer, draftFromSuggestion, payloadFromDraft } from "./catalog2-questions-ui";

describe("pergunta sugerida pela IA (D-7)", () => {
  it("vira rascunho editável e volta para o formato da API sem perder tipo, ajuda e opções", () => {
    const d = draftFromSuggestion({ key: "p2-plataformas", label: "Quais plataformas já usam pixel?", is_required: false, question_type: "selecao_multipla", help_text: "Marque as que já têm pixel.", options: ["Meta", "Google"] });
    expect(d).toMatchObject({ key: "p2-plataformas", is_required: false, question_type: "selecao_multipla", opts: [{ label: "Meta", is_default: false }, { label: "Google", is_default: false }], visibility: "client", answer_usage: "both" });
    const api = payloadFromDraft({ ...d, label: "Quais plataformas já têm pixel instalado?" });
    expect(api).toMatchObject({ label: "Quais plataformas já têm pixel instalado?", question_type: "selecao_multipla", options: ["Meta", "Google"], help_text: "Marque as que já têm pixel.", is_required: false });
  });
  it("padrões: obrigatória e texto longo quando a IA não informa", () => {
    const d = draftFromSuggestion({ key: "p1-x", label: "Qual é o objetivo da campanha?" });
    expect([d.is_required, d.question_type, d.opts]).toEqual([true, "texto_longo", []]);
  });
});

describe("pergunta do questionário · destino por etapa e condição (16/10)", () => {
  const base = { key: "verba", label: "Qual a verba mensal?", is_required: true, question_type: "texto_curto", visibility: "client", answer_usage: "both" };
  it("a pergunta que veio do servidor volta com a etapa de destino e a condição preenchidas", () => {
    const d = draftFromServer({ ...base, target_step_key: "s2", condition: { source: "variation_option", ref: "plus", operator: "selected" } });
    expect(d).toMatchObject({ target_step_key: "s2", cond_source: "variation_option", cond_ref: "plus", cond_operator: "selected" });
  });
  it("o corpo enviado à API leva a etapa e a condição (variação/adicional) — e nada quando a pergunta é 'sempre'", () => {
    const withCond = payloadFromDraft({ ...draftFromServer(base), target_step_key: "s2", cond_source: "addon", cond_ref: "relatorio", cond_operator: "not_selected" });
    expect(withCond).toMatchObject({ target_step_key: "s2", condition: { source: "addon", ref: "relatorio", operator: "not_selected" } });
    expect((withCond.condition as any).value).toBeUndefined();
    const always = payloadFromDraft(draftFromServer(base));
    expect(always.target_step_key).toBeNull();
    expect(always.condition).toBeNull();
  });
  it("condição por resposta anterior (igual/diferente) leva o valor comparado", () => {
    const api = payloadFromDraft({ ...draftFromServer(base), cond_source: "answer", cond_ref: "tem-site", cond_operator: "eq", cond_value: "sim" });
    expect(api.condition).toEqual({ source: "answer", ref: "tem-site", operator: "eq", value: "sim" });
  });
  it("condição sem referência é ignorada (não grava condição pela metade)", () => {
    expect(payloadFromDraft({ ...draftFromServer(base), cond_source: "variation_option", cond_ref: "" }).condition).toBeNull();
  });
});
