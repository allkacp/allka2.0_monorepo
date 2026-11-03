import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
const frame = vi.hoisted(() => ({ sidebarWidth: 72 }));
vi.mock("@/hooks/useAppFrameMetrics", () => ({ useAppFrameMetrics: () => frame }));
import { FramedModal, FramedPanel, FRAMED_DARK_OVERLAY_CLASS } from "./framed-panel";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogTitle } from "./ui/alert-dialog";
import { StepBlock } from "@/app/admin/produtos/novo-catalogo/step-blocks";

describe("overlay preto global de painéis, janelas e confirmações", () => {
  it("entregáveis usa o mesmo escuro do Painel Moldura, com sidebar livre e conteúdo acima", () => {
    render(<StepBlock n={5} title="Entregáveis" status="complete" open onToggle={() => {}}><p>Conteúdo preservado</p></StepBlock>);
    const overlay = screen.getByTestId("step-block-5-modal-overlay");
    for (const cls of FRAMED_DARK_OVERLAY_CLASS.split(" ")) expect(overlay).toHaveClass(cls);
    expect(overlay).not.toHaveClass("bg-white/55");
    expect(overlay).toHaveStyle({ left: "72px" });
    expect(overlay).toHaveClass("z-[1250]");
    expect(screen.getByTestId("step-block-5-modal")).toHaveClass("!z-[1251]");
    expect(screen.getByText("Conteúdo preservado")).toBeVisible();
  });
  it("todas as janelas moldura usam preto por padrão, sem opt-in", () => {
    render(<FramedModal open title="Outra janela"><p>Outro conteúdo</p></FramedModal>);
    expect(screen.getByTestId("framed-modal-overlay")).toHaveClass("bg-black/60", "backdrop-blur-[2px]");
    expect(screen.getByTestId("framed-modal-overlay")).not.toHaveClass("bg-white/55");
    expect(screen.getByTestId("framed-modal-overlay")).toHaveStyle({ left: "72px" });
  });
  it("painel acompanha a sidebar, bloqueia clique no fundo sem fechar e mantém as margens", () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(<FramedPanel open title="Painel" onOpenChange={onOpenChange}><p>Cadastro</p></FramedPanel>);
    expect(screen.getByTestId("framed-panel-overlay")).toHaveClass("bg-black/60", "z-[1200]");
    expect(screen.getByTestId("framed-panel")).toHaveStyle({ left: "102px", top: "30px", height: "calc(100dvh - 60px)" });
    fireEvent.pointerDown(screen.getByTestId("framed-panel-overlay"));
    fireEvent.click(screen.getByTestId("framed-panel-overlay"));
    expect(onOpenChange).not.toHaveBeenCalled();
    frame.sidebarWidth = 260;
    rerender(<FramedPanel open title="Painel" onOpenChange={onOpenChange}><p>Cadastro</p></FramedPanel>);
    expect(screen.getByTestId("framed-panel-overlay")).toHaveStyle({ left: "260px" });
    expect(screen.getByTestId("framed-panel")).toHaveStyle({ left: "290px" });
    frame.sidebarWidth = 72;
  });
  it("painel aberto de uma janela permanece acima do fundo preto", () => {
    render(<FramedModal open title="Janela"><FramedPanel open title="Painel interno"><p>Editar</p></FramedPanel></FramedModal>);
    expect(screen.getByTestId("framed-panel-overlay")).toHaveClass("bg-black/60", "z-[1255]");
    expect(screen.getByTestId("framed-panel")).toHaveClass("!z-[1256]");
  });
  it("em molduras aninhadas cada fundo fica acima do painel anterior e abaixo de seu conteúdo", () => {
    render(<FramedPanel open testId="product" title="Produto"><FramedPanel open testId="task" title="Tarefa"><FramedModal open testId="step" title="Etapa"><p>Cadastro</p></FramedModal></FramedPanel></FramedPanel>);
    expect(Number(screen.getByTestId("task-overlay").style.zIndex)).toBeGreaterThan(Number(screen.getByTestId("product").style.zIndex));
    expect(Number(screen.getByTestId("task").style.zIndex)).toBeGreaterThan(Number(screen.getByTestId("task-overlay").style.zIndex));
    expect(Number(screen.getByTestId("step-overlay").style.zIndex)).toBeGreaterThan(Number(screen.getByTestId("task").style.zIndex));
    expect(Number(screen.getByTestId("step").style.zIndex)).toBeGreaterThan(Number(screen.getByTestId("step-overlay").style.zIndex));
  });
  it.each(["dialog", "alert-dialog"])("a base %s também usa fundo preto", (kind) => {
    if (kind === "dialog") render(<Dialog open><DialogContent><DialogTitle>Janela comum</DialogTitle></DialogContent></Dialog>);
    else render(<AlertDialog open><AlertDialogContent><AlertDialogTitle>Confirmar</AlertDialogTitle></AlertDialogContent></AlertDialog>);
    expect(document.querySelector(`[data-slot="${kind}-overlay"]`)).toHaveClass("bg-black/60", "backdrop-blur-[2px]");
  });
});
