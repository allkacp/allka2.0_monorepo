import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { FramedEditorScope, clearFramedEditorDrafts, useFramedEditorDraft, useFramedEditorOpen } from "./framed-editor-context";
import { FramedModal, FramedPanel } from "./framed-panel";
vi.mock("@/hooks/useAppFrameMetrics", () => ({ useAppFrameMetrics: () => ({ sidebarWidth: 72 }) }));

const scope = { product: { id: "p1", number: 2, name: "Website" }, version: { id: "v2", number: 2, state: "rascunho" }, task: { id: "t1", number: 12, name: "Alteração" } };
function Form({ readOnly = false, server = "Original" }: { readOnly?: boolean; server?: string }) {
  const [open, setOpen] = useFramedEditorOpen("commercial");
  const [value, setValue] = useFramedEditorDraft("name", server, !readOnly);
  return <><button onClick={() => setOpen(true)}>Abrir</button>{open && <FramedPanel open testId="editor-test" title="Cadastro">
    <div className="overflow-y-auto" data-testid="body"><input aria-label="Campo" value={value} disabled={readOnly} onChange={e => setValue(e.target.value)} /><button onClick={() => setOpen(false)}>Fechar</button></div>
  </FramedPanel>}</>;
}
beforeEach(() => { cleanup(); sessionStorage.clear(); localStorage.clear(); });
describe("contexto e recuperação das molduras do editor", () => {
  it("layout teste mantém rascunho/abertura separados e descartar não apaga o rascunho do editor atual", () => {
    const first = render(<FramedEditorScope {...scope}><Form /></FramedEditorScope>);
    fireEvent.click(screen.getByText("Abrir")); fireEvent.change(screen.getByLabelText("Campo"), { target: { value: "Atual pendente" } });
    first.unmount();
    const second = render(<FramedEditorScope {...scope} workspace="test"><Form /></FramedEditorScope>);
    expect(screen.queryByTestId("editor-test")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Abrir"));
    expect(screen.getByLabelText("Campo")).toHaveValue("Original");
    fireEvent.change(screen.getByLabelText("Campo"), { target: { value: "Teste pendente" } });
    clearFramedEditorDrafts("p1", "v2", "test");
    second.unmount();
    render(<FramedEditorScope {...scope}><Form /></FramedEditorScope>);
    expect(screen.getByLabelText("Campo")).toHaveValue("Atual pendente");
  });
  it("mostra IDs públicos, produto, versão, tarefa e etapa também através dos portais", () => {
    render(<FramedEditorScope {...scope}><FramedEditorScope step={{ id: "cuid-interno", number: 167, name: "Briefing" }}><FramedModal open title="Etapa"><p>Dados</p></FramedModal></FramedEditorScope></FramedEditorScope>);
    const trail = screen.getByTestId("framed-editor-context");
    expect(trail).toHaveTextContent("Produto ID 02 · Website");
    expect(trail).toHaveTextContent("v2 · Rascunho");
    expect(trail).toHaveTextContent("Tarefa ID 12 · Alteração");
    expect(trail).toHaveTextContent("Etapa ID 167 · Briefing");
    expect(trail).not.toHaveTextContent("cuid-interno");
  });
  it("não inventa tarefa/etapa nem adiciona cabeçalho em telas fora do editor", () => {
    const { rerender } = render(<FramedPanel open title="Sem editor"><p>Dados</p></FramedPanel>);
    expect(screen.queryByTestId("framed-editor-context")).not.toBeInTheDocument();
    rerender(<FramedEditorScope product={scope.product} version={scope.version}><FramedPanel open title="Produto"><p>Dados</p></FramedPanel></FramedEditorScope>);
    expect(screen.getByTestId("framed-editor-context")).not.toHaveTextContent("Tarefa");
  });
  it("F5 recupera abertura, texto e rolagem; fechar explicitamente não reabre", () => {
    const view = () => <FramedEditorScope {...scope}><Form /></FramedEditorScope>;
    const first = render(view()); fireEvent.click(screen.getByText("Abrir"));
    fireEvent.change(screen.getByLabelText("Campo"), { target: { value: "Pendente" } });
    fireEvent.scroll(screen.getByTestId("body"), { target: { scrollTop: 240 } });
    first.unmount(); const second = render(view());
    expect(screen.getByLabelText("Campo")).toHaveValue("Pendente");
    expect(screen.getByTestId("body").scrollTop).toBe(240);
    fireEvent.click(screen.getByText("Fechar")); second.unmount(); render(view());
    expect(screen.queryByTestId("editor-test")).not.toBeInTheDocument();
  });
  it("isola abertura e preenchimento por usuário e versão; publicada não recupera edição", () => {
    localStorage.setItem("allka_user", JSON.stringify({ id: "admin1" }));
    const { rerender } = render(<FramedEditorScope {...scope}><Form /></FramedEditorScope>);
    fireEvent.click(screen.getByText("Abrir")); fireEvent.change(screen.getByLabelText("Campo"), { target: { value: "Só V2" } });
    rerender(<FramedEditorScope {...scope} version={{ id: "v3", number: 3 }}><Form /></FramedEditorScope>);
    expect(screen.queryByTestId("editor-test")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Abrir")); expect(screen.getByLabelText("Campo")).toHaveValue("Original");
    rerender(<FramedEditorScope {...scope}><Form readOnly /></FramedEditorScope>);
    expect(screen.getByLabelText("Campo")).toHaveValue("Original"); expect(screen.getByLabelText("Campo")).toBeDisabled();
    localStorage.setItem("allka_user", JSON.stringify({ id: "admin2" }));
    rerender(<FramedEditorScope {...scope}><Form /></FramedEditorScope>);
    expect(screen.queryByTestId("editor-test")).not.toBeInTheDocument();
  });
  it("descartar apaga só rascunhos do produto/versão atual; servidor atualizado não ressuscita texto antigo", () => {
    const { rerender } = render(<FramedEditorScope {...scope}><Form /></FramedEditorScope>);
    fireEvent.click(screen.getByText("Abrir")); fireEvent.change(screen.getByLabelText("Campo"), { target: { value: "Pendente" } });
    rerender(<FramedEditorScope {...scope}><Form server="Salvo novo" /></FramedEditorScope>);
    expect(screen.getByLabelText("Campo")).toHaveValue("Salvo novo");
    clearFramedEditorDrafts("p1", "v2");
    cleanup(); render(<FramedEditorScope {...scope}><Form /></FramedEditorScope>);
    expect(screen.getByLabelText("Campo")).toHaveValue("Original");
  });
});
