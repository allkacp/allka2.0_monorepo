import { describe, expect, it, vi, afterEach } from "vitest";

vi.mock("@/hooks/useAppFrameMetrics", () => ({ useAppFrameMetrics: () => ({ sidebarWidth: 72 }) }));
import { fireEvent, render, screen } from "@testing-library/react";
import { StepBlock, useBlocks } from "./step-blocks";
import type { StepBlockId } from "./step-completeness";

function Demo({ narrow = false }: { narrow?: boolean }) {
  const b = useBlocks([1, 2], narrow, undefined, true); // modo lista (acordeão na página)
  return (
    <div>
      <button onClick={b.expandAll}>Expandir todos</button>
      <button onClick={b.collapseAll}>Recolher todos</button>
      <button onClick={() => b.reveal(5)}>Abrir o 5</button>
      {([1, 2, 3, 4, 5] as StepBlockId[]).map((n) => (
        <StepBlock key={n} n={n} title={`Bloco ${n}`} status={n === 3 ? "error" : n === 4 ? "optional" : n === 2 ? "incomplete" : "complete"} summary={`Resumo ${n}`} open={b.open.has(n)} onToggle={() => b.toggle(n)} inline={b.list}>
          <input aria-label={`campo ${n}`} defaultValue="" />
        </StepBlock>
      ))}
    </div>
  );
}
afterEach(() => vi.unstubAllGlobals());

describe("Os 6 blocos da etapa como acordeões", () => {
  it("cada bloco abre e fecha sozinho (aria-expanded) e o cabeçalho mostra o botão por teclado", () => {
    render(<Demo />);
    const h3 = screen.getByRole("button", { name: /Bloco 3/ });
    expect(h3).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(h3);
    expect(h3).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: /Bloco 1/ })).toHaveAttribute("aria-expanded", "true"); // os outros não mudam
    fireEvent.click(h3);
    expect(h3).toHaveAttribute("aria-expanded", "false");
    expect(h3.tagName).toBe("BUTTON"); // Enter/Espaço funcionam nativamente
  });

  it("fechado mostra o resumo compacto; aberto esconde o resumo", () => {
    render(<Demo />);
    expect(screen.getByTestId("step-block-3-summary").textContent).toBe("Resumo 3");
    expect(screen.queryByTestId("step-block-1-summary")).not.toBeInTheDocument();
  });

  it("fechar NÃO apaga o que foi digitado (o conteúdo continua montado, só escondido)", () => {
    render(<Demo />);
    const input = screen.getByLabelText("campo 1") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "texto digitado" } });
    fireEvent.click(screen.getByRole("button", { name: /Bloco 1/ }));
    expect(screen.getByTestId("step-block-1").querySelector("[role=region]")).toHaveAttribute("hidden");
    fireEvent.click(screen.getByRole("button", { name: /Bloco 1/ }));
    expect((screen.getByLabelText("campo 1") as HTMLInputElement).value).toBe("texto digitado");
  });

  it("Expandir todos e Recolher todos", () => {
    render(<Demo />);
    fireEvent.click(screen.getByText("Expandir todos"));
    for (const n of [1, 2, 3, 4, 5]) expect(screen.getByTestId(`step-block-${n}`)).toHaveAttribute("data-open", "true");
    fireEvent.click(screen.getByText("Recolher todos"));
    for (const n of [1, 2, 3, 4, 5]) expect(screen.getByTestId(`step-block-${n}`)).toHaveAttribute("data-open", "false");
  });

  it("o cabeçalho diz: completo, incompleto, com erro ou opcional", () => {
    render(<Demo />);
    expect(screen.getByTestId("step-block-1-status").textContent).toBe("Completo");
    expect(screen.getByTestId("step-block-2-status").textContent).toBe("Incompleto");
    expect(screen.getByTestId("step-block-3-status").textContent).toBe("Com erro");
    expect(screen.getByTestId("step-block-4-status").textContent).toBe("Opcional");
    expect(screen.getByTestId("step-block-3")).toHaveAttribute("data-status", "error");
  });

  it("reveal abre o bloco sem fechar os outros (usado quando há erro)", () => {
    render(<Demo />);
    fireEvent.click(screen.getByText("Abrir o 5"));
    expect(screen.getByTestId("step-block-5")).toHaveAttribute("data-open", "true");
    expect(screen.getByTestId("step-block-1")).toHaveAttribute("data-open", "true");
  });

  it("em tela estreita só um bloco fica aberto por vez", () => {
    render(<Demo narrow />);
    expect(screen.getByTestId("step-block-1")).toHaveAttribute("data-open", "true");
    expect(screen.getByTestId("step-block-2")).toHaveAttribute("data-open", "false"); // começa só com o primeiro
    fireEvent.click(screen.getByRole("button", { name: /Bloco 3/ }));
    expect(screen.getByTestId("step-block-3")).toHaveAttribute("data-open", "true");
    expect(screen.getByTestId("step-block-1")).toHaveAttribute("data-open", "false");
    fireEvent.click(screen.getByText("Abrir o 5"));
    expect(screen.getByTestId("step-block-5")).toHaveAttribute("data-open", "true");
    expect(screen.getByTestId("step-block-3")).toHaveAttribute("data-open", "false");
    fireEvent.click(screen.getByText("Expandir todos"));
    expect(screen.getAllByTestId(/^step-block-\d$/).filter((e) => e.getAttribute("data-open") === "true")).toHaveLength(1);
  });
});

describe("Selo de situação do bloco (19/10): real, com a quantidade de pendências", () => {
  it("incompleto e com erro mostram N pendências; 'não se aplica' e 'completo' não; expandir todos abre os 6", () => {
    render(<>
      <StepBlock n={5} title="Entregáveis" status="incomplete" count={2} open onToggle={() => {}} inline>.</StepBlock>
      <StepBlock n={4} title="Checklist" status="error" count={1} open onToggle={() => {}} inline>.</StepBlock>
      <StepBlock n={6} title="Acessos" status="na" open onToggle={() => {}} inline>.</StepBlock>
      <StepBlock n={1} title="O que é" status="complete" open onToggle={() => {}} inline>.</StepBlock>
    </>);
    expect(screen.getByTestId("step-block-5-status").textContent).toBe("Incompleto · 2 pendências");
    expect(screen.getByTestId("step-block-4-status").textContent).toBe("Com erro · 1 pendência");
    expect(screen.getByTestId("step-block-6-status").textContent).toBe("Não se aplica");
    expect(screen.getByTestId("step-block-1-status").textContent).toBe("Completo");
  });
  it("expandAll abre os 6 blocos", () => {
    function Six() {
      const b = useBlocks([], false, undefined, true);
      return <div><button onClick={b.expandAll}>abrir tudo</button>{([1, 2, 3, 4, 5, 6] as StepBlockId[]).map((n) => <StepBlock key={n} n={n} title={`B${n}`} status="complete" open={b.open.has(n)} inline onToggle={() => b.toggle(n)}>.</StepBlock>)}</div>;
    }
    render(<Six />);
    fireEvent.click(screen.getByText("abrir tudo"));
    for (const n of [1, 2, 3, 4, 5, 6]) expect(screen.getByTestId(`step-block-${n}`)).toHaveAttribute("data-open", "true");
  });
});

function Cards() {
  const b = useBlocks([]);
  return (
    <div>
      {([1, 2, 3] as StepBlockId[]).map((n) => (
        <StepBlock key={n} n={n} title={`Bloco ${n}`} status="complete" summary={`Resumo ${n}`} open={b.open.has(n)} onToggle={() => b.toggle(n)} onGo={(t) => b.reveal(t)} inline={b.list}>
          <input aria-label={`campo ${n}`} defaultValue="" />
        </StepBlock>
      ))}
      <button onClick={b.expandAll}>Expandir todos</button>
    </div>
  );
}

describe("Blocos da etapa: cartão + janela moldura", () => {
  it("fechado é só um cartão com resumo e botão Editar; clicar abre a janela com o conteúdo", () => {
    render(<Cards />);
    expect(screen.getByTestId("step-block-1-summary").textContent).toBe("Resumo 1");
    expect(screen.queryByTestId("step-block-1-modal")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Bloco 1/ }));
    const modal = screen.getByTestId("step-block-1-modal");
    expect(modal).toBeInTheDocument();
    expect(modal.contains(screen.getByLabelText("campo 1"))).toBe(true);
  });

  it("fechar a janela NÃO apaga o que foi digitado; só um bloco por vez; anterior/próximo trocam a janela", () => {
    render(<Cards />);
    fireEvent.click(screen.getByRole("button", { name: /Bloco 1/ }));
    fireEvent.change(screen.getByLabelText("campo 1"), { target: { value: "digitei" } });
    fireEvent.click(screen.getByText("Próximo bloco"));
    expect(screen.queryByTestId("step-block-1-modal")).not.toBeInTheDocument();
    expect(screen.getByTestId("step-block-2-modal")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("step-block-2-close"));
    expect(screen.queryByTestId("step-block-2-modal")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Bloco 1/ }));
    expect((screen.getByLabelText("campo 1") as HTMLInputElement).value).toBe("digitei");
  });

  it("Expandir todos volta ao modo lista (acordeão na página, sem janelas)", () => {
    render(<Cards />);
    fireEvent.click(screen.getByText("Expandir todos"));
    expect(screen.queryByTestId("step-block-1-modal")).not.toBeInTheDocument();
    expect(screen.getByTestId("step-block-1")).toHaveAttribute("data-open", "true");
    expect(screen.getByTestId("step-block-3")).toHaveAttribute("data-open", "true");
  });
});
