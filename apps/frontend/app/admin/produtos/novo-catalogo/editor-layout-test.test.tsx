import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { flowDestination, PRODUCT_FLOW_STEPS, ProductEditorLayoutProvider, ProductFlowProvider, ProductFlowField, ProductFlowWorkspace, TaskEditorSurface } from "./editor-layout-test";

afterEach(cleanup);
describe("fluxo linear opt-in", () => {
  it("agrupa o cadastro em três passos, migrando atalhos antigos para a tarefa e mantendo preço no fechamento", () => {
    expect(PRODUCT_FLOW_STEPS.map(step => step.id)).toEqual(["info", "entrega", "revisao"]);
    expect(flowDestination("precos")).toBe("revisao");
    expect(flowDestination("info", "catalog2-field-full-description")).toBe("info");
    expect(flowDestination("entrega", "catalog2-deadline-base")).toBe("revisao");
    expect(flowDestination("entrega", "catalog2-questionnaire:t1")).toBe("entrega");
    expect(flowDestination("opcoes", "sec-var")).toBe("entrega");
    expect(flowDestination("questionario")).toBe("entrega");
  });
  it("abas internas recebem o mesmo cadastro do produto e preservam dados ao fechar e reabrir a tarefa", async () => {
    const mounts = vi.fn();
    function Field() { const [text, setText] = useState(() => { mounts(); return "Opção inicial"; }); return <><input aria-label="Opção de variação" value={text} onChange={e => setText(e.target.value)} /><ProductFlowWorkspace slot="tasks" label="Configurar etapa da opção" /></>; }
    function Harness() {
      const [open, setOpen] = useState(true);
      return <ProductEditorLayoutProvider value="test"><ProductFlowProvider value="entrega"><div data-editor-layout="test">
        <div data-testid="origem" hidden><ProductFlowField slot="product-variations"><Field /></ProductFlowField></div>
        <button onClick={() => setOpen(!open)}>Alternar tarefa</button>
        {open && <TaskEditorSurface title="Tarefa de teste" onClose={() => setOpen(false)}><p>Cadastro da tarefa</p></TaskEditorSurface>}
      </div></ProductFlowProvider></ProductEditorLayoutProvider>;
    }
    render(<Harness />);
    const editor = screen.getByTestId("test-task-editor");
    expect(within(editor).getAllByRole("tab").map(tab => tab.textContent)).toEqual(["Dados da tarefa", "Etapas e fluxo", "Questionário", "Entregáveis", "Variações", "Adicionais", "Prazos e condições"]);
    fireEvent.click(within(editor).getByRole("tab", { name: "Variações" }));
    const input = await within(editor).findByLabelText("Opção de variação");
    fireEvent.change(input, { target: { value: "Opção revisada" } });
    fireEvent.click(within(editor).getByRole("button", { name: "Configurar etapa da opção" }));
    expect(within(editor).getByRole("tab", { name: "Etapas e fluxo" })).toHaveAttribute("aria-selected", "true");
    fireEvent.click(within(editor).getByRole("tab", { name: "Variações" }));
    fireEvent.click(within(editor).getByRole("tab", { name: "Adicionais" }));
    expect(input).not.toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Alternar tarefa" }));
    await waitFor(() => expect(screen.getByTestId("origem")).toContainElement(input));
    fireEvent.click(screen.getByRole("button", { name: "Alternar tarefa" }));
    fireEvent.click(screen.getByRole("tab", { name: "Variações" }));
    await waitFor(() => expect(input).toBeVisible());
    expect(input).toHaveValue("Opção revisada");
    expect(mounts).toHaveBeenCalledTimes(1);
  });
  it("move o mesmo formulário para apoio em contexto e devolve sem perder dados ou montar de novo", () => {
    const mounts = vi.fn();
    function Field() { const [text, setText] = useState(() => { mounts(); return "Inicial"; }); return <input aria-label="Nome do apoio" value={text} onChange={e => setText(e.target.value)} />; }
    render(<ProductEditorLayoutProvider value="test"><ProductFlowProvider value="opcoes"><div data-editor-layout="test">
      <div data-testid="origem"><ProductFlowField slot="tasks"><Field /></ProductFlowField></div>
      <ProductFlowWorkspace slot="tasks" label="Cadastrar etapa aqui" />
    </div></ProductFlowProvider></ProductEditorLayoutProvider>);
    const input = screen.getByLabelText("Nome do apoio");
    fireEvent.change(input, { target: { value: "Etapa nova" } });
    expect(screen.getByTestId("origem")).toContainElement(input);
    fireEvent.click(screen.getByRole("button", { name: "Cadastrar etapa aqui" }));
    expect(screen.getByTestId("origem")).not.toContainElement(input);
    expect(screen.getByLabelText("Nome do apoio")).toBe(input);
    fireEvent.click(screen.getByRole("button", { name: "Fechar cadastro de apoio" }));
    expect(screen.getByTestId("origem")).toContainElement(input);
    expect(input).toHaveValue("Etapa nova");
    expect(mounts).toHaveBeenCalledTimes(1);
  });
  it("fechar o contexto que contém o apoio devolve o formulário, sem desmontar ou perder texto", () => {
    function Harness() {
      const [open, setOpen] = useState(true);
      return <ProductEditorLayoutProvider value="test"><ProductFlowProvider value="entrega"><div data-editor-layout="test">
        <div data-testid="origem"><ProductFlowField slot="questionnaire:t1"><input aria-label="Pergunta" defaultValue="Preservada" /></ProductFlowField></div>
        <button onClick={() => setOpen(false)}>Fechar etapa</button>
        {open && <ProductFlowWorkspace slot="questionnaire:t1" label="Abrir perguntas" />}
      </div></ProductFlowProvider></ProductEditorLayoutProvider>;
    }
    render(<Harness />);
    const input = screen.getByLabelText("Pergunta");
    fireEvent.click(screen.getByRole("button", { name: "Abrir perguntas" }));
    expect(screen.getByTestId("origem")).not.toContainElement(input);
    fireEvent.click(screen.getByRole("button", { name: "Fechar etapa" }));
    expect(screen.getByTestId("origem")).toContainElement(input);
    expect(input).toHaveValue("Preservada");
  });
  it("layout atual não desloca campos nem acrescenta cadastro de apoio", () => {
    render(<div data-editor-layout="current"><ProductFlowProvider value="info"><div data-testid="origem"><ProductFlowField slot="pricing"><input aria-label="Preço atual" /></ProductFlowField></div><div data-flow-slot="pricing" data-testid="destino" /><ProductFlowWorkspace slot="tasks" label="Apoio" /></ProductFlowProvider></div>);
    expect(screen.getByTestId("origem")).toContainElement(screen.getByLabelText("Preço atual"));
    expect(screen.getByTestId("destino")).toBeEmptyDOMElement();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
