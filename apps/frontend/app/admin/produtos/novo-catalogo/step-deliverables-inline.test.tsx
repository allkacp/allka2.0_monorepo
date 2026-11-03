import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { StepDeliverablesEditor } from "./step-deliverables-editor";
import type { DelivItem } from "./step-deliverables";
const writes = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api-client", () => ({ apiClient: new Proxy({}, { get: () => writes }) }));
vi.mock("@/hooks/useAppFrameMetrics", () => ({ useAppFrameMetrics: () => ({ top: 0, left: 72, sidebarWidth: 72, width: 1200, height: 800 }) }));
afterEach(() => { cleanup(); sessionStorage.clear(); writes.mockClear(); });
function Harness({ inline = true }: { inline?: boolean }) {
  const [items, setItems] = useState<DelivItem[]>([]);
  const [none, setNone] = useState(true);
  return <><StepDeliverablesEditor task={{ id: "t1", name: "Tarefa", steps: [{ id: "s1", name: "Etapa" }], deliverables: [] }} step={{ id: "s1", name: "Etapa" }} stepIndex={1} readOnly={false} items={items} setItems={setItems} declaredNone={none} setDeclaredNone={setNone} issues={[]} showErrors={false} inline={inline} /><output data-testid="rascunho">{JSON.stringify(items)}</output></>;
}
describe("entregável no ponto de necessidade", () => {
  it("Adicionar à etapa aplica ao formulário, mas não grava antecipadamente no servidor", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("radio", { name: /Esta etapa tem entregáveis/ }));
    expect(screen.getByTestId("deliverable-stage-save-note")).toHaveTextContent("Para gravar no servidor, salve a etapa");
    expect(screen.getByTestId("deliverable-save-draft")).toHaveTextContent("Manter incompleto na etapa");
    fireEvent.change(screen.getByLabelText("Nome do entregável"), { target: { value: "Relatório" } });
    fireEvent.change(screen.getByLabelText("Descrição do entregável"), { target: { value: "Diagnóstico documentado" } });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar à etapa" }));
    expect(screen.queryByTestId("inline-deliverable-editor")).not.toBeInTheDocument();
    expect(screen.getByTestId("rascunho")).toHaveTextContent("Relatório");
    expect(writes).not.toHaveBeenCalled();
  });
  it("marcar que tem entregável abre os campos dentro da etapa, todos visíveis, sem gravação antecipada", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("radio", { name: /Esta etapa tem entregáveis/ }));
    const editor = screen.getByTestId("inline-deliverable-editor");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    for (let n = 1; n <= 8; n++) expect(within(editor).getByTestId("deliverable-section-" + n)).toHaveAttribute("data-open", "true");
    fireEvent.change(within(editor).getByLabelText("Nome do entregável"), { target: { value: "Documento final" } });
    expect(screen.getByTestId("rascunho")).toHaveTextContent('"name":"Documento final"');
    expect(screen.getByTestId("rascunho")).toHaveTextContent('"step_id":"s1"');
    fireEvent.click(screen.getByRole("button", { name: "Fechar formulário (manter rascunho)" }));
    expect(screen.queryByTestId("inline-deliverable-editor")).not.toBeInTheDocument();
    expect(screen.getByTestId("rascunho")).toHaveTextContent("Documento final");
    expect(writes).not.toHaveBeenCalled();
  });
  it("concluir incompleto mostra as pendências sem apagar campos ou gravar", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("radio", { name: /Esta etapa tem entregáveis/ }));
    fireEvent.change(screen.getByLabelText("Nome do entregável"), { target: { value: "Incompleto" } });
    fireEvent.click(screen.getByTestId("deliverable-save"));
    expect(screen.getByTestId("deliverable-error-summary")).toBeVisible();
    expect(screen.getByLabelText("Nome do entregável")).toHaveValue("Incompleto");
    expect(writes).not.toHaveBeenCalled();
  });
  it("editor atual continua abrindo o formulário em modal, sem criar item antes de salvar", () => {
    render(<Harness inline={false} />);
    fireEvent.click(screen.getByRole("radio", { name: /Esta etapa tem entregáveis/ }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("add-step-deliverable"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByTestId("rascunho")).toHaveTextContent("[]");
    expect(writes).not.toHaveBeenCalled();
  });
});
