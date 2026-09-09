import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within, fireEvent, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LayoutGrid } from "lucide-react";

import { setTestViewportWidth } from "@/vitest.setup";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { useDashboardWidgetEditor } from "@/features/dashboards/shared/dashboard-widget-editor";
import {
  DashboardWidgetEditorBody,
  DashboardWidgetEditorModeToggle,
} from "@/features/dashboards/shared/dashboard-widget-editor-panel";
import type { WidgetState } from "@/features/dashboards/shared/dashboard-common";

// Item 4 (reunião 09/09/2026) — acabamento visual da edição de widgets:
// "Salvar"/"Cancelar" no topo (junto de "Remover"/"Adicionar"), contadores
// de visíveis/ocultos ao lado da instrução "Arraste para reordenar", e o
// ajuste de largura mais claro. Nenhum comportamento muda.

const CATALOG = [
  { id: "metrics", name: "Métricas", description: "Indicadores gerais", icon: LayoutGrid, color: "blue" },
  { id: "revenue", name: "Receita", description: "Receita do período", icon: LayoutGrid, color: "green" },
  { id: "tasks", name: "Tarefas", description: "Fila de tarefas", icon: LayoutGrid, color: "amber" },
];

function getWidgetTitle(type: string, customTitle?: string) {
  return customTitle ?? CATALOG.find((c) => c.id === type)?.name ?? type;
}

function widget(overrides: Partial<WidgetState> = {}): WidgetState {
  return { id: "metrics-1", type: "metrics", visible: true, order: 0, colSpan: 1, ...overrides };
}

/** Harness com o hook real + os dois componentes reais montados como no
 *  dashboard (toggle no topo, body abaixo). Expõe estado observável. */
function EditorHarness({
  initial,
  onSave = () => {},
  onCancel = () => {},
  saving = false,
  variant = "dark",
}: {
  initial: WidgetState[];
  onSave?: () => void;
  onCancel?: () => void;
  saving?: boolean;
  variant?: "dark" | "light";
}) {
  const editor = useDashboardWidgetEditor(initial);
  const original = React.useRef(initial);
  return (
    <SidebarProvider>
      <div>
        <span data-testid="ids">{editor.draftWidgets.map((w) => `${w.id}:${w.visible ? "v" : "h"}:${w.colSpan ?? 1}`).join("|")}</span>
        <span data-testid="payload">{JSON.stringify(editor.finalize().map((w) => ({ id: w.id, order: w.order })))}</span>
        <button data-testid="reset" onClick={() => editor.reset(original.current)}>reset</button>
        <div data-testid="top-actions">
          <DashboardWidgetEditorModeToggle
            editor={editor}
            variant={variant}
            onSave={onSave}
            onCancel={onCancel}
            saving={saving}
          />
        </div>
        <DashboardWidgetEditorBody editor={editor} catalog={CATALOG} getWidgetTitle={getWidgetTitle} />
      </div>
    </SidebarProvider>
  );
}

beforeEach(() => {
  cleanup();
  setTestViewportWidth(1280);
});

describe("Item 4 — Salvar/Cancelar no topo, junto de Adicionar/Remover", () => {
  it("os quatro botões ficam no MESMO grupo do topo, sem rodapé separado", () => {
    render(<EditorHarness initial={[widget()]} />);
    const top = screen.getByTestId("top-actions");
    // o próprio contêiner de ações (1 elemento) tem os 4 botões
    const group = top.firstElementChild as HTMLElement;
    for (const name of ["Remover", "Adicionar", "Cancelar", /^salvar$/i]) {
      expect(within(group).getByRole("button", { name })).toBeInTheDocument();
    }
    // ordem no DOM: Remover, Adicionar, ..., Cancelar, Salvar
    const labels = within(group)
      .getAllByRole("button")
      .map((b) => b.textContent?.trim());
    expect(labels[0]).toMatch(/Remover/);
    expect(labels[1]).toMatch(/Adicionar/);
    expect(labels.at(-2)).toMatch(/Cancelar/);
    expect(labels.at(-1)).toMatch(/Salvar/);
  });

  it("Salvar chama onSave; Cancelar chama onCancel; Salvar desativa quando saving", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const onCancel = vi.fn();
    const { rerender } = render(<EditorHarness initial={[widget()]} onSave={onSave} onCancel={onCancel} />);

    await user.click(screen.getByRole("button", { name: /^salvar$/i }));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);

    rerender(<EditorHarness initial={[widget()]} onSave={onSave} onCancel={onCancel} saving />);
    expect(screen.getByRole("button", { name: /^salvar$/i })).toBeDisabled();
  });

  it("sem onSave/onCancel o toggle segue mostrando só Remover/Adicionar (retrocompat)", () => {
    render(
      <SidebarProvider>
        <DashboardWidgetEditorModeToggleStandalone />
      </SidebarProvider>,
    );
    expect(screen.getByRole("button", { name: "Remover" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Adicionar" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^salvar$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancelar" })).not.toBeInTheDocument();
  });

  it("navegação por teclado alcança Remover, Adicionar, Cancelar e Salvar, em ordem", async () => {
    const user = userEvent.setup();
    render(<EditorHarness initial={[widget()]} />);
    // foca o 1º botão do grupo de ações do topo e segue por Tab
    screen.getByRole("button", { name: "Remover" }).focus();
    expect(screen.getByRole("button", { name: "Remover" })).toHaveFocus();
    for (const name of ["Adicionar", "Cancelar", /^salvar$/i]) {
      await user.tab();
      expect(screen.getByRole("button", { name })).toHaveFocus();
    }
  });
});

function DashboardWidgetEditorModeToggleStandalone() {
  const editor = useDashboardWidgetEditor([widget()]);
  return <DashboardWidgetEditorModeToggle editor={editor} />;
}

describe("Item 4 — contadores ao lado da instrução de reordenar", () => {
  it("mostra 'Arraste para reordenar' e os contadores visíveis/ocultos/total juntos, e eles reagem ao ocultar", async () => {
    const user = userEvent.setup();
    render(
      <EditorHarness
        initial={[widget(), widget({ id: "revenue-1", type: "revenue", order: 1 }), widget({ id: "tasks-1", type: "tasks", order: 2, visible: false })]}
      />,
    );

    const hint = screen.getByText("Arraste para reordenar");
    // o bloco que contém a instrução também contém os contadores
    const strip = hint.closest("div")!;
    expect(within(strip).getByText("2 visíveis")).toBeInTheDocument();
    expect(within(strip).getByText("1 ocultos")).toBeInTheDocument();
    expect(within(strip).getByText("3 no total")).toBeInTheDocument();

    // ocultar "Métricas" → 1 visível / 2 ocultos
    await user.click(screen.getByRole("button", { name: /ocultar widget métricas/i }));
    expect(within(strip).getByText("1 visíveis")).toBeInTheDocument();
    expect(within(strip).getByText("2 ocultos")).toBeInTheDocument();
  });
});

describe("Item 4 — comportamentos preservados (adicionar/remover/ocultar/exibir/arrastar)", () => {
  it("Adicionar: entrar no modo e clicar num widget disponível adiciona ao rascunho", async () => {
    const user = userEvent.setup();
    render(<EditorHarness initial={[widget()]} />);
    await user.click(screen.getByRole("button", { name: "Adicionar" }));
    await user.click(await screen.findByText("Receita"));
    expect(screen.getByTestId("ids").textContent).toMatch(/revenue-\d+:v:1/);
  });

  it("Ocultar/Exibir: o toggle inverte a visibilidade do widget", async () => {
    const user = userEvent.setup();
    render(<EditorHarness initial={[widget()]} />);
    expect(screen.getByTestId("ids").textContent).toBe("metrics-1:v:1");
    await user.click(screen.getByRole("button", { name: /ocultar widget métricas/i }));
    expect(screen.getByTestId("ids").textContent).toBe("metrics-1:h:1");
    await user.click(screen.getByRole("button", { name: /exibir widget métricas/i }));
    expect(screen.getByTestId("ids").textContent).toBe("metrics-1:v:1");
  });

  it("Remover: confirmação dupla e então some do rascunho", async () => {
    const user = userEvent.setup();
    render(<EditorHarness initial={[widget(), widget({ id: "revenue-1", type: "revenue", order: 1 })]} />);
    await user.click(screen.getByRole("button", { name: "Remover" }));
    await user.click(screen.getByRole("button", { name: /remover widget métricas/i }));
    await user.click(await screen.findByRole("button", { name: /continuar para confirmação/i }));
    await user.click(screen.getByRole("button", { name: /remover widget do painel/i }));
    expect(screen.getByTestId("ids").textContent).toBe("revenue-1:v:1");
  });

  it("Arrastar: soltar o 1º card sobre o 2º troca a ordem e reindexa o payload", () => {
    render(
      <EditorHarness initial={[widget({ id: "a" }), widget({ id: "b", type: "revenue", order: 1 }), widget({ id: "c", type: "tasks", order: 2 })]} />,
    );
    const cards = screen.getAllByText(/^Métricas$|^Receita$|^Tarefas$/).map((el) => el.closest("[draggable]")!);
    fireEvent.dragStart(cards[0]);
    fireEvent.dragOver(cards[1]);
    fireEvent.drop(cards[1]);
    expect(screen.getByTestId("ids").textContent).toBe("b:v:1|a:v:1|c:v:1");
    expect(screen.getByTestId("payload").textContent).toBe(
      JSON.stringify([{ id: "b", order: 0 }, { id: "a", order: 1 }, { id: "c", order: 2 }]),
    );
  });
});

describe("Item 4 — larguras continuam selecionáveis e identificáveis", () => {
  it("as três larguras têm rótulo, aria-pressed e mudam o colSpan; a selecionada tem destaque não só de cor", async () => {
    const user = userEvent.setup();
    render(<EditorHarness initial={[widget({ colSpan: 1 })]} />);

    const oneThird = screen.getByRole("button", { name: /largura: um terço da linha/i });
    const twoThird = screen.getByRole("button", { name: /largura: dois terços da linha/i });
    const full = screen.getByRole("button", { name: /largura: a linha inteira/i });

    expect(oneThird).toHaveTextContent("1/3");
    expect(twoThird).toHaveTextContent("2/3");
    expect(full).toHaveTextContent("Total");

    expect(oneThird).toHaveAttribute("aria-pressed", "true");
    expect(twoThird).toHaveAttribute("aria-pressed", "false");
    // destaque complementar à cor: anel + borda
    expect(oneThird.className).toMatch(/ring-1 ring-primary/);

    await user.click(twoThird);
    expect(screen.getByTestId("ids").textContent).toBe("metrics-1:v:2");
    expect(twoThird).toHaveAttribute("aria-pressed", "true");
    expect(oneThird).toHaveAttribute("aria-pressed", "false");

    await user.click(full);
    expect(screen.getByTestId("ids").textContent).toBe("metrics-1:v:3");

    // explicação curta do efeito acompanha a seleção
    expect(screen.getByText("Ocupa a linha inteira")).toBeInTheDocument();
  });
});

describe("Item 4 — mesmo componente nos portais claro e escuro", () => {
  it("variant dark e light rendem o mesmo conjunto de ações no topo", () => {
    const { rerender } = render(<EditorHarness initial={[widget()]} variant="dark" />);
    for (const name of ["Remover", "Adicionar", "Cancelar", /^salvar$/i]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
    rerender(<EditorHarness initial={[widget()]} variant="light" />);
    for (const name of ["Remover", "Adicionar", "Cancelar", /^salvar$/i]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
  });
});
