import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { AccessConditionBuilder } from "./access-condition-builder";
import { emptyCondition, sourcesFromVersion, type AccessCondition } from "./access-condition";

const version = {
  variations: [{ key: "plataforma", name: "Plataforma", is_active: true, options: [{ key: "meta", label: "Meta Ads" }, { key: "google_ads", label: "Google Ads" }, { key: "ambas", label: "Ambas" }] }],
  addons: [{ key: "relatorio", name: "Relatório extra", is_active: true }],
  tasks: [{ key: "t1", name: "Gestão", steps: [{ key: "s1", name: "Configurar" }], questionnaire: { questions: [{ key: "tem_site", label: "Tem site?", question_type: "single_choice", options: [{ value: "sim", label: "Sim" }] }, { key: "obs", label: "Observações", question_type: "text" }] } }],
  connection_requirements: [{ key: "ga", label: "Google Ads", connection_type: { name: "Google Ads" } }],
};
const src = sourcesFromVersion(version);

function Harness({ initial = emptyCondition(), spy, showErrors = false, legacy }: { initial?: AccessCondition; spy?: (c: AccessCondition) => void; showErrors?: boolean; legacy?: string }) {
  const [c, setC] = useState(initial);
  return <AccessConditionBuilder value={c} onChange={(x) => { setC(x); spy?.(x); }} sources={src} showErrors={showErrors} legacyText={legacy} accessName="Google Ads" />;
}

describe("Construtor 'Condição quando este acesso passa a ser necessário'", () => {
  it("mostra o título e começa sem regra, pedindo para adicionar", () => {
    render(<Harness />);
    expect(screen.getByText(/Condição quando este acesso passa a ser necessário/)).toBeInTheDocument();
    expect(screen.queryAllByTestId("access-condition-rule")).toHaveLength(0);
    expect(screen.getByTestId("add-condition-rule")).toBeInTheDocument();
  });

  it("monta o exemplo do Produto 1 só com listas: Plataforma é igual a Google Ads OU Ambas", () => {
    const spy = vi.fn();
    render(<Harness spy={spy} />);
    fireEvent.click(screen.getByTestId("add-condition-rule"));
    fireEvent.change(screen.getByLabelText("Origem da regra 1"), { target: { value: "variation" } });
    const ref = screen.getByLabelText("Referência da regra 1") as HTMLSelectElement;
    expect(Array.from(ref.options).map((o) => o.text)).toContain("Plataforma (ID: plataforma)");
    fireEvent.change(ref, { target: { value: "plataforma" } });
    const op = screen.getByLabelText("Operador da regra 1") as HTMLSelectElement;
    expect(Array.from(op.options).map((o) => o.text)).toEqual(["É igual a", "É diferente de", "Está selecionado", "Não está selecionado"]);
    const group = screen.getByRole("group", { name: "Opções da regra 1" });
    fireEvent.click(within(group).getByLabelText("Google Ads"));
    fireEvent.click(within(group).getByLabelText("Ambas"));
    expect(screen.getByTestId("access-condition-summary").textContent).toContain("a variação “Plataforma” é igual a Google Ads ou Ambas");
    const last = spy.mock.calls.at(-1)![0] as AccessCondition;
    expect(last.rules[0]).toMatchObject({ kind: "variation", ref_key: "plataforma", operator: "eq", values: ["google_ads", "ambas"] });
  });

  it("trocar a origem limpa referência e valores (nada fica misturado)", () => {
    render(<Harness />);
    fireEvent.click(screen.getByTestId("add-condition-rule"));
    fireEvent.change(screen.getByLabelText("Origem da regra 1"), { target: { value: "variation" } });
    fireEvent.change(screen.getByLabelText("Referência da regra 1"), { target: { value: "plataforma" } });
    fireEvent.click(within(screen.getByRole("group", { name: "Opções da regra 1" })).getByLabelText("Meta Ads"));
    fireEvent.change(screen.getByLabelText("Origem da regra 1"), { target: { value: "addon" } });
    expect(screen.queryByLabelText("Referência da regra 1")).not.toBeInTheDocument();
    expect((within(screen.getByRole("group", { name: "Adicionais da regra 1" })).getByLabelText("Relatório extra") as HTMLInputElement).checked).toBe(false);
  });

  it("E / OU só aparecem com 2 ou mais regras e mudam a frase", () => {
    render(<Harness />);
    fireEvent.click(screen.getByTestId("add-condition-rule"));
    expect(screen.queryByText("Combinar as regras com:")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Origem da regra 1"), { target: { value: "first_execution" } });
    fireEvent.click(screen.getByTestId("add-condition-rule"));
    fireEvent.change(screen.getByLabelText("Origem da regra 2"), { target: { value: "renewal" } });
    expect(screen.getByText("Combinar as regras com:")).toBeInTheDocument();
    expect(screen.getByTestId("access-condition-summary").textContent).toMatch(/é a primeira execução, ou é uma renovação/);
    fireEvent.click(screen.getByLabelText(/E — todas precisam ocorrer/));
    expect(screen.getByTestId("access-condition-summary").textContent).toMatch(/é a primeira execução, e é uma renovação/);
  });

  it("pergunta com opções oferece as respostas para marcar; pergunta de texto aceita valores digitados", () => {
    render(<Harness />);
    fireEvent.click(screen.getByTestId("add-condition-rule"));
    fireEvent.change(screen.getByLabelText("Origem da regra 1"), { target: { value: "questionnaire_answer" } });
    fireEvent.change(screen.getByLabelText("Referência da regra 1"), { target: { value: "tem_site" } });
    expect(within(screen.getByRole("group", { name: "Respostas da regra 1" })).getByLabelText("Sim")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Referência da regra 1"), { target: { value: "obs" } });
    const input = screen.getByLabelText("Valor da regra 1");
    fireEvent.change(input, { target: { value: "urgente" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByText("urgente")).toBeInTheDocument();
    expect(screen.getByTestId("access-condition-summary").textContent).toContain("a resposta “Observações” é igual a urgente");
  });

  it("com erros ligados, a regra incompleta é destacada e diz o que falta", () => {
    const initial: AccessCondition = { mode: "any_trigger", rules: [{ id: "r1", kind: "variation", ref_key: "", values: [], operator: "eq" }] };
    render(<Harness initial={initial} showErrors />);
    const rule = screen.getByTestId("access-condition-rule");
    expect(rule).toHaveAttribute("data-invalid", "true");
    expect(within(rule).getByRole("alert").textContent).toBe("Falta: escolha a variação.");
  });

  it("sem nenhuma regra e com erros ligados, pede ao menos uma regra citando o acesso", () => {
    render(<Harness showErrors />);
    expect(screen.getByRole("alert").textContent).toContain("adicione ao menos uma regra à condição do acesso “Google Ads”");
  });

  it("condição antiga em texto continua à vista (nada se perde)", () => {
    render(<Harness legacy="se o cliente tiver CRM próprio" />);
    expect(screen.getByTestId("access-condition-legacy").textContent).toContain("se o cliente tiver CRM próprio");
  });

  it("remover regra", () => {
    render(<Harness />);
    fireEvent.click(screen.getByTestId("add-condition-rule"));
    fireEvent.click(screen.getByLabelText("Remover regra 1"));
    expect(screen.queryAllByTestId("access-condition-rule")).toHaveLength(0);
  });
});
