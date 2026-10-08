import { describe, expect, it } from "vitest";
import { draftFromSuggestion, payloadFromDraft } from "./catalog2-questions-ui";

describe("pergunta sugerida pela IA (D-7)", () => {
  it("vira rascunho editável e volta para o formato da API sem perder tipo, ajuda e opções", () => {
    const d = draftFromSuggestion({ key: "p2-plataformas", label: "Quais plataformas já usam pixel?", is_required: false, question_type: "selecao_multipla", help_text: "Marque as que já têm pixel.", options: ["Meta", "Google"] });
    expect(d).toMatchObject({ key: "p2-plataformas", is_required: false, question_type: "selecao_multipla", options_text: "Meta\nGoogle", visibility: "client", answer_usage: "both" });
    const api = payloadFromDraft({ ...d, label: "Quais plataformas já têm pixel instalado?" });
    expect(api).toMatchObject({ label: "Quais plataformas já têm pixel instalado?", question_type: "selecao_multipla", options: ["Meta", "Google"], help_text: "Marque as que já têm pixel.", is_required: false });
  });
  it("padrões: obrigatória e texto longo quando a IA não informa", () => {
    const d = draftFromSuggestion({ key: "p1-x", label: "Qual é o objetivo da campanha?" });
    expect([d.is_required, d.question_type, d.options_text]).toEqual([true, "texto_longo", ""]);
  });
});
