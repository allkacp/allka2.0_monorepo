import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
vi.mock("@/hooks/useAppFrameMetrics", () => ({ useAppFrameMetrics: () => ({ sidebarWidth: 72 }) }));
import { FramedModal, FRAMED_DARK_OVERLAY_CLASS } from "./framed-panel";
import { StepBlock } from "@/app/admin/produtos/novo-catalogo/step-blocks";

describe("teste de overlay escuro dos blocos da etapa", () => {
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
  it("não muda o overlay das outras janelas sem opt-in", () => {
    render(<FramedModal open title="Outra janela"><p>Outro conteúdo</p></FramedModal>);
    expect(screen.getByTestId("framed-modal-overlay")).toHaveClass("bg-white/55");
    expect(screen.getByTestId("framed-modal-overlay")).toHaveStyle({ left: "72px" });
  });
});
