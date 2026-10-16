import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BriefingQuestionField, conditionMet, emptyBriefingValue, isVisible, pendingMessage, type BriefingValue } from "./briefing-question-field";

// Campo de resposta do cliente: serve aos 22 tipos do construtor universal, com "Outro", escala, anexos e mensagens claras.
const q = (over: Record<string, any> = {}) => ({ question_key: "k", question_text: "Pergunta", question_type: "texto_curto", required: false, options: [], settings: {}, ...over });
const opts = [{ value: "a", label: "A" }, { value: "b", label: "B" }, { value: "c", label: "C" }];
function Harness({ question, initial = emptyBriefingValue(), upload }: { question: any; initial?: BriefingValue; upload?: any }) {
  const [v, setV] = useState<BriefingValue>(initial);
  return <><BriefingQuestionField q={question} value={v} onChange={setV} onUploadFile={upload} onRemoveFile={async () => {}} /><output data-testid="out">{JSON.stringify(v)}</output></>;
}
const out = () => JSON.parse(screen.getByTestId("out").textContent!);

describe("Campo do cliente · um tipo de entrada para cada tipo de pergunta", () => {
  const cases: [string, () => HTMLElement | null][] = [
    ["texto_curto", () => document.querySelector("input[type=text], input:not([type])")],
    ["texto_longo", () => document.querySelector("textarea")],
    ["numero", () => document.querySelector("input[inputmode=decimal]")],
    ["moeda", () => screen.getByText("R$")],
    ["data", () => document.querySelector("input[type=date]")],
    ["hora", () => document.querySelector("input[type=time]")],
    ["data_hora", () => document.querySelector("input[type=datetime-local]")],
    ["sim_nao", () => screen.getByRole("radiogroup", { name: "Sim ou não" })],
    ["selecao_unica", () => screen.getAllByRole("radio")[0]],
    ["selecao_multipla", () => screen.getAllByRole("checkbox")[0]],
    ["lista_suspensa", () => screen.getByRole("combobox")],
    ["escala", () => screen.getByRole("radiogroup", { name: "Nota" })],
    ["telefone", () => document.querySelector("input[type=tel]")],
    ["email", () => document.querySelector("input[type=email]")],
    ["url", () => document.querySelector("input[type=url]")],
    ["endereco", () => document.querySelector("textarea")],
    ["aceite", () => screen.getByText("Li e confirmo")],
    ["arquivo", () => screen.getByLabelText("Escolher arquivo")],
    ["imagem", () => screen.getByLabelText("Escolher arquivo")],
    ["video", () => screen.getByLabelText("Escolher arquivo")],
    ["audio", () => screen.getByLabelText("Escolher arquivo")],
    ["documento", () => screen.getByLabelText("Escolher arquivo")],
  ];
  for (const [type, finder] of cases) {
    it(`renderiza o campo certo para ${type}`, () => {
      render(<Harness question={q({ question_type: type, options: ["selecao_unica", "selecao_multipla", "lista_suspensa"].includes(type) ? opts : [] })} />);
      expect(finder()).toBeTruthy();
    });
  }

  it("seleção única, múltipla, lista, escala, sim/não e aceite gravam a resposta no formato que o servidor valida", () => {
    const { unmount } = render(<Harness question={q({ question_type: "selecao_unica", options: opts })} />);
    fireEvent.click(screen.getByLabelText("B")); expect(out().answer).toBe("b"); unmount();
    const m = render(<Harness question={q({ question_type: "selecao_multipla", options: opts })} />);
    fireEvent.click(screen.getByLabelText("A")); fireEvent.click(screen.getByLabelText("C")); expect(JSON.parse(out().answer)).toEqual(["a", "c"]);
    fireEvent.click(screen.getByLabelText("A")); expect(JSON.parse(out().answer)).toEqual(["c"]); m.unmount();
    const l = render(<Harness question={q({ question_type: "lista_suspensa", options: opts })} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "c" } }); expect(out().answer).toBe("c"); l.unmount();
    const e = render(<Harness question={q({ question_type: "escala", settings: { scale: { min: 1, max: 10 } } })} />);
    expect(screen.getAllByRole("radio")).toHaveLength(10); fireEvent.click(screen.getByRole("radio", { name: "7" })); expect(out().answer).toBe("7"); e.unmount();
    const s = render(<Harness question={q({ question_type: "sim_nao" })} />);
    fireEvent.click(screen.getByLabelText("Não")); expect(out().answer).toBe("nao"); s.unmount();
    render(<Harness question={q({ question_type: "aceite" })} />);
    fireEvent.click(screen.getByRole("checkbox")); expect(out().answer).toBe("sim");
  });

  it("“Outro” com texto livre e limites de escolha aparecem quando habilitados", () => {
    render(<Harness question={q({ question_type: "selecao_multipla", options: opts, settings: { allow_other: true, min_choices: 1, max_choices: 2 } })} />);
    expect(screen.getByText(/ao menos 1 e no máximo 2/)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Outro"));
    fireEvent.change(screen.getByLabelText("Outro: descreva"), { target: { value: "Algo diferente" } });
    expect(JSON.parse(out().answer)).toEqual(["outro:Algo diferente"]);
  });

  it("anexo complementar em qualquer tipo: descrição obrigatória, tipo permitido, tamanho e quantidade", async () => {
    const upload = vi.fn(async (f: File, d: string) => ({ id: "f" + upload.mock.calls.length, name: f.name, size: f.size, description: d }));
    render(<Harness upload={upload} question={q({ question_type: "texto_longo", settings: { attachments: { allowed: true, accept: [".pdf", ".png"], max_files: 2, max_size_mb: 1, require_description: true } } })} />);
    const input = screen.getByLabelText("Escolher arquivo") as HTMLInputElement;
    const file = (name: string, size = 10) => new File([new Uint8Array(size)], name);
    // sem descrição
    fireEvent.change(input, { target: { files: [file("a.pdf")] } });
    expect(await screen.findByText(/Descreva o arquivo antes de enviar/)).toBeInTheDocument();
    expect(upload).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Descrição do arquivo"), { target: { value: "Briefing assinado" } });
    // extensão fora da lista
    fireEvent.change(input, { target: { files: [file("a.exe")] } });
    expect(await screen.findByText(/Tipo não permitido/)).toBeInTheDocument();
    // grande demais
    fireEvent.change(input, { target: { files: [file("a.pdf", 2 * 1024 * 1024)] } });
    expect(await screen.findByText(/no máximo 1 MB/)).toBeInTheDocument();
    // ok
    fireEvent.change(input, { target: { files: [file("a.pdf")] } });
    await waitFor(() => expect(upload).toHaveBeenCalledWith(expect.any(File), "Briefing assinado"));
    expect(await screen.findByText("a.pdf")).toBeInTheDocument();
    expect(out().files[0]).toMatchObject({ id: "f1", description: "Briefing assinado" });
    fireEvent.change(screen.getByLabelText("Descrição do arquivo"), { target: { value: "Segundo" } });
    fireEvent.change(input, { target: { files: [file("b.png")] } });
    await waitFor(() => expect(upload).toHaveBeenCalledTimes(2));
    // limite de 2
    fireEvent.change(screen.getByLabelText("Descrição do arquivo"), { target: { value: "Terceiro" } });
    fireEvent.change(input, { target: { files: [file("c.png")] } });
    expect(await screen.findByText(/no máximo 2 arquivo/)).toBeInTheDocument();
    // remover
    fireEvent.click(screen.getByLabelText("Remover a.pdf"));
    await waitFor(() => expect(out().files).toHaveLength(1));
  });

  it("o servidor recusar o arquivo mostra a mensagem dele (nunca falha em silêncio)", async () => {
    const upload = vi.fn(async () => { throw new Error("O conteúdo do arquivo não corresponde à extensão informada."); });
    render(<Harness upload={upload} question={q({ question_type: "imagem" })} />);
    fireEvent.change(screen.getByLabelText("Escolher arquivo"), { target: { files: [new File([new Uint8Array(5)], "falso.png")] } });
    expect(await screen.findByText(/não corresponde à extensão/)).toBeInTheDocument();
    expect(out().files).toHaveLength(0);
  });
});

describe("Regras de exibição e pendência (espelham o servidor)", () => {
  const A = (answer: string, files: any[] = []) => ({ base: { answer, files } });
  const c = (operator: string, value?: string) => ({ source: "answer", ref: "base", operator, ...(value != null ? { value } : {}) });
  it("operadores: igual, diferente, contém, selecionado, maior, menor, anexado", () => {
    expect(conditionMet(c("eq", "sim"), A("sim"))).toBe(true); expect(conditionMet(c("eq", "sim"), A("nao"))).toBe(false);
    expect(conditionMet(c("neq", "sim"), A("nao"))).toBe(true);
    expect(conditionMet(c("contains", "meta"), A("Uso Meta"))).toBe(true);
    expect(conditionMet(c("selected"), A("x"))).toBe(true); expect(conditionMet(c("not_selected"), A(""))).toBe(true);
    expect(conditionMet(c("gt", "10"), A("15"))).toBe(true); expect(conditionMet(c("lt", "10"), A("15"))).toBe(false);
    expect(conditionMet(c("attached"), A("", [{ name: "a.pdf" }]))).toBe(true); expect(conditionMet(c("not_attached"), A(""))).toBe(true);
  });
  it("pergunta inativa ou com condição não atendida some; obrigatória só pesa se visível", () => {
    const base = q({ question_key: "base" });
    const dep = q({ question_key: "dep", required: true, condition: c("eq", "sim") });
    expect(isVisible(dep, { base: { answer: "nao", files: [] } })).toBe(false);
    expect(isVisible(dep, { base: { answer: "sim", files: [] } })).toBe(true);
    expect(isVisible(q({ settings: { is_active: false } }), {})).toBe(false);
    expect(pendingMessage(dep, undefined)).toBe("Resposta obrigatória.");
    expect(pendingMessage(base, undefined)).toBeNull();
    expect(pendingMessage(q({ settings: { attachments: { allowed: true, required: true } } }), { answer: "x", files: [] })).toBe("Anexo obrigatório.");
    expect(pendingMessage(q({ question_type: "arquivo", required: true }), undefined)).toBe("Envie o arquivo.");
  });
});
