import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
const frame = vi.hoisted(() => ({ sidebarWidth: 72 }));
vi.mock("@/hooks/useAppFrameMetrics", () => ({ useAppFrameMetrics: () => frame }));
import { FRAMED_DARK_OVERLAY_CLASS } from "@/components/framed-panel";
import { WalletWindow } from "./wallet-window";

// Cabeçalho global da plataforma fica em z-90 (components/header.tsx): a janela precisa ficar acima dele.
const GLOBAL_HEADER_Z = 90;

function Comissoes({ onOpenChange }: { onOpenChange?: (open: boolean) => void }) {
  const [open, setOpen] = useState(false);
  const change = (value: boolean) => { setOpen(value); onOpenChange?.(value); };
  return (
    <div>
      <p>Financeiro → Carteiras (tela de origem)</p>
      <button type="button" onClick={() => change(true)}>Comissões</button>
      <WalletWindow open={open} onOpenChange={change} testId="wallet-global-ledger-window" title="Comissões recebidas"
        header={<h2>Comissões recebidas</h2>}
        toolbar={<div data-testid="toolbar">1 movimentação</div>}
        footer={<div data-testid="footer">1 / 1</div>}>
        <p>Comissão da contratação proj_956</p>
      </WalletWindow>
    </div>
  );
}

describe("Financeiro → Carteiras → Comissões abre em Janela Moldura (não mais slide lateral)", () => {
  it("fundo preto depois da sidebar, janela acima do cabeçalho global, cabeçalho e X dentro dela e só o corpo rola", () => {
    render(<Comissoes />);
    fireEvent.click(screen.getByRole("button", { name: "Comissões" }));
    const overlay = screen.getByTestId("wallet-global-ledger-window-overlay");
    for (const cls of FRAMED_DARK_OVERLAY_CLASS.split(" ")) expect(overlay).toHaveClass(cls);
    expect(overlay).toHaveStyle({ left: "72px" });
    const win = screen.getByTestId("wallet-global-ledger-window");
    expect(Number(overlay.style.zIndex)).toBeGreaterThan(GLOBAL_HEADER_Z);
    expect(Number(win.style.zIndex)).toBeGreaterThan(Number(overlay.style.zIndex));
    expect(win).not.toHaveAttribute("data-slot", "sheet-content");
    const header = within(win).getByTestId("wallet-global-ledger-window-header");
    expect(within(header).getByRole("button", { name: "Fechar Comissões recebidas" })).toBeVisible();
    const scroll = within(win).getByTestId("wallet-global-ledger-window-scroll");
    expect(scroll).toHaveClass("overflow-y-auto", "min-h-0", "flex-1");
    expect(within(scroll).getByText("Comissão da contratação proj_956")).toBeVisible();
    expect(scroll).not.toContainElement(screen.getByTestId("toolbar"));
    expect(scroll).not.toContainElement(screen.getByTestId("footer"));
    expect(header).not.toContainElement(scroll);
  });

  it("acompanha a sidebar recolhida/aberta (sidebar e seus botões ficam livres)", () => {
    const { rerender } = render(<WalletWindow open onOpenChange={() => {}} testId="w" title="Extrato" header={<p>Extrato</p>}><p>Lista</p></WalletWindow>);
    expect(screen.getByTestId("w-overlay")).toHaveStyle({ left: "72px" });
    frame.sidebarWidth = 260;
    rerender(<WalletWindow open onOpenChange={() => {}} testId="w" title="Extrato" header={<p>Extrato</p>}><p>Lista</p></WalletWindow>);
    expect(screen.getByTestId("w-overlay")).toHaveStyle({ left: "260px" });
    frame.sidebarWidth = 72;
  });

  it("clique no fundo bloqueia sem fechar; X e Escape fecham; reabre e a tela de origem continua lá", () => {
    const onOpenChange = vi.fn();
    render(<Comissoes onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Comissões" }));
    const overlay = screen.getByTestId("wallet-global-ledger-window-overlay");
    fireEvent.pointerDown(overlay);
    fireEvent.click(overlay);
    expect(screen.getByTestId("wallet-global-ledger-window")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Fechar Comissões recebidas" }));
    expect(screen.queryByTestId("wallet-global-ledger-window")).not.toBeInTheDocument();
    expect(screen.getByText("Financeiro → Carteiras (tela de origem)")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Comissões" }));
    expect(screen.getByTestId("wallet-global-ledger-window")).toBeInTheDocument();
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(screen.queryByTestId("wallet-global-ledger-window")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Comissões" })).toBeVisible();
    expect(onOpenChange.mock.calls.map((c) => c[0])).toEqual([true, false, true, false]);
  });

  it("ajuste aberto de dentro do extrato fica POR CIMA dele e o Escape fecha só o ajuste", () => {
    function Extrato() {
      const [ledger, setLedger] = useState(true);
      const [adjust, setAdjust] = useState(false);
      return (
        <WalletWindow open={ledger} onOpenChange={setLedger} testId="wallet-ledger-window" title="Extrato da Carteira" header={<p>Extrato</p>}
          toolbar={<button type="button" onClick={() => setAdjust(true)}>Ajuste</button>}>
          <p>Movimentações</p>
          {ledger && (
            <WalletWindow open={adjust} onOpenChange={setAdjust} testId="wallet-adjust-window" title="Ajuste Manual de Saldo" fitContent header={<p>Ajuste</p>}>
              <p>Formulário do ajuste</p>
            </WalletWindow>
          )}
        </WalletWindow>
      );
    }
    render(<Extrato />);
    fireEvent.click(screen.getByRole("button", { name: "Ajuste" }));
    const ledgerWin = screen.getByTestId("wallet-ledger-window");
    const adjustOverlay = screen.getByTestId("wallet-adjust-window-overlay");
    expect(Number(adjustOverlay.style.zIndex)).toBeGreaterThan(Number(ledgerWin.style.zIndex));
    expect(Number(screen.getByTestId("wallet-adjust-window").style.zIndex)).toBeGreaterThan(Number(adjustOverlay.style.zIndex));
    expect(screen.getByTestId("wallet-adjust-window")).not.toHaveClass("h-[calc(100dvh-4rem)]");
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(screen.queryByTestId("wallet-adjust-window")).not.toBeInTheDocument();
    expect(screen.getByTestId("wallet-ledger-window")).toBeInTheDocument();
  });
});
