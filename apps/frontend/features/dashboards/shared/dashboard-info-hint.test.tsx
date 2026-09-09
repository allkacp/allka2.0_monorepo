import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DashboardInfoHint } from "@/features/dashboards/shared/dashboard-info-hint";

// Item 2 (reunião 09/09/2026) — o tooltip informativo tem que estar ligado só
// ao ícone "i", nunca ao card/cluster inteiro, e tem que funcionar por
// teclado. Este arquivo cobre o componente compartilhado no ponto real.

beforeEach(() => {
  cleanup();
});

/** Reproduz o cenário do bug: um "cluster" (aqui um dropdown falso) e o "i"
 *  lado a lado. Passar o mouse no cluster NÃO pode abrir o tooltip. */
function ClusterWithHint({ label = "Mais informações sobre os dashboards salvos" }) {
  return (
    <div data-testid="cluster" style={{ padding: 40 }}>
      <button type="button" data-testid="dropdown-btn">
        Selecionar dashboard
      </button>
      <DashboardInfoHint label={label} delayDuration={0}>
        <p>Escolha entre os dashboards salvos para alternar a visão da área.</p>
      </DashboardInfoHint>
    </div>
  );
}

describe("DashboardInfoHint — acionamento", () => {
  it("(a) passar o mouse pelo card/cluster (fora do ícone) NÃO abre o tooltip", async () => {
    const user = userEvent.setup();
    render(<ClusterWithHint />);

    await user.hover(screen.getByTestId("cluster"));
    await user.hover(screen.getByTestId("dropdown-btn"));
    // pequena espera pra garantir que nada abriu de forma assíncrona
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("(b) hover diretamente no ícone 'i' abre o tooltip com o conteúdo certo", async () => {
    const user = userEvent.setup();
    render(<ClusterWithHint />);

    await user.hover(screen.getByRole("button", { name: /mais informações sobre os dashboards salvos/i }));

    const tip = await screen.findByRole("tooltip");
    expect(tip).toHaveTextContent("Escolha entre os dashboards salvos");
  });

  it("(c) foco por teclado (Tab) no ícone expõe a explicação", async () => {
    const user = userEvent.setup();
    render(
      <>
        <button type="button">antes</button>
        <DashboardInfoHint label="Mais informações sobre Receita" delayDuration={0}>
          Receita confirmada no período.
        </DashboardInfoHint>
      </>,
    );

    await user.tab(); // foca "antes"
    await user.tab(); // foca o ícone "i"
    const icon = screen.getByRole("button", { name: "Mais informações sobre Receita" });
    expect(icon).toHaveFocus();

    const tip = await screen.findByRole("tooltip");
    expect(tip).toHaveTextContent("Receita confirmada no período.");
    // associação acessível: quando aberto, o gatilho aponta pro conteúdo
    expect(icon).toHaveAttribute("aria-describedby", tip.id);
  });

  it("(d) o ícone é um <button> com nome acessível e o <Info> é decorativo (aria-hidden)", () => {
    render(
      <DashboardInfoHint label="Mais informações sobre Churn" delayDuration={0}>
        texto
      </DashboardInfoHint>,
    );
    const icon = screen.getByRole("button", { name: "Mais informações sobre Churn" });
    expect(icon.tagName).toBe("BUTTON");
    expect(icon).toHaveAttribute("type", "button");
    // o SVG interno não deve ser exposto a leitores de tela
    expect(icon.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("(e) retirar o hover e o foco fecha o tooltip; Escape também fecha", async () => {
    const user = userEvent.setup();
    render(
      <DashboardInfoHint label="Mais informações sobre MRR" delayDuration={0}>
        MRR do período.
      </DashboardInfoHint>,
    );
    const icon = screen.getByRole("button", { name: "Mais informações sobre MRR" });

    await user.hover(icon);
    expect(await screen.findByRole("tooltip")).toBeInTheDocument();
    await user.unhover(icon);
    await waitFor(() => expect(screen.queryByRole("tooltip")).not.toBeInTheDocument());

    // por foco
    icon.focus();
    expect(await screen.findByRole("tooltip")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("tooltip")).not.toBeInTheDocument());
  });

  it("(f) dois ícones próximos: abrir um fecha o outro (nunca ambos abertos)", async () => {
    const user = userEvent.setup();
    render(
      <div style={{ display: "flex", gap: 8 }}>
        <DashboardInfoHint label="Mais informações sobre Receita" delayDuration={0}>
          conteúdo A — receita
        </DashboardInfoHint>
        <DashboardInfoHint label="Mais informações sobre Ticket" delayDuration={0}>
          conteúdo B — ticket
        </DashboardInfoHint>
      </div>,
    );

    await user.hover(screen.getByRole("button", { name: "Mais informações sobre Receita" }));
    expect(await screen.findByRole("tooltip")).toHaveTextContent("conteúdo A — receita");

    await user.hover(screen.getByRole("button", { name: "Mais informações sobre Ticket" }));
    await waitFor(() => {
      const tips = screen.queryAllByRole("tooltip");
      expect(tips).toHaveLength(1);
      expect(tips[0]).toHaveTextContent("conteúdo B — ticket");
    });
  });

  it("(g) o tooltip não fica preso depois que o painel/widget que o contém é desmontado", async () => {
    const user = userEvent.setup();
    function Panel({ open }: { open: boolean }) {
      return open ? (
        <DashboardInfoHint label="Mais informações sobre o widget" delayDuration={0}>
          detalhe do widget
        </DashboardInfoHint>
      ) : (
        <div>painel fechado</div>
      );
    }
    const { rerender } = render(<Panel open />);
    await user.hover(screen.getByRole("button", { name: "Mais informações sobre o widget" }));
    expect(await screen.findByRole("tooltip")).toBeInTheDocument();

    rerender(<Panel open={false} />); // "trocar de widget" / fechar painel
    await waitFor(() => expect(screen.queryByRole("tooltip")).not.toBeInTheDocument());
    expect(screen.getByText("painel fechado")).toBeInTheDocument();
  });

  it("(a') o clique num elemento irmão (ex.: o dropdown ao lado) não é interceptado pelo hint", async () => {
    const user = userEvent.setup();
    let clicks = 0;
    render(
      <div data-testid="cluster">
        <button type="button" onClick={() => (clicks += 1)}>
          Abrir dashboards
        </button>
        <DashboardInfoHint label="Mais informações sobre os dashboards salvos" delayDuration={0}>
          texto
        </DashboardInfoHint>
      </div>,
    );
    await user.click(screen.getByRole("button", { name: "Abrir dashboards" }));
    expect(clicks).toBe(1);
  });
});
