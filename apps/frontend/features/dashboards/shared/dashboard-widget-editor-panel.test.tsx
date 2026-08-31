import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setTestViewportWidth } from "@/vitest.setup";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { useDashboardWidgetEditor } from "@/features/dashboards/shared/dashboard-widget-editor";
import { DashboardWidgetEditorBody } from "@/features/dashboards/shared/dashboard-widget-editor-panel";
import type { WidgetState } from "@/features/dashboards/shared/dashboard-common";
import { LayoutGrid } from "lucide-react";

// Lote 4 (ata 2026-08-24) — a remoção de widget (ícone de lixeira, modo
// "remover" do editor) removia direto de `draftWidgets`, sem confirmação,
// e o aviso do modo dizia "remover permanentemente" — o que não é verdade:
// é só o RASCUNHO da edição (draftWidgets) que muda; nada é salvo até o
// clique em "Salvar" no rodapé (fora deste componente), e "Cancelar"
// descarta a sessão inteira. Este arquivo cobre o comportamento do NOVO
// fluxo de confirmação dupla (variante "attention", não vermelha).

const CATALOG = [
  { id: "metrics", name: "Métricas", description: "Indicadores gerais", icon: LayoutGrid, color: "blue" },
  { id: "revenue", name: "Receita", description: "Receita do período", icon: LayoutGrid, color: "green" },
];

function getWidgetTitle(type: string, customTitle?: string) {
  return customTitle ?? CATALOG.find((c) => c.id === type)?.name ?? type;
}

function widgetFixture(overrides: Partial<WidgetState> = {}): WidgetState {
  return { id: "metrics-1", type: "metrics", visible: true, order: 0, colSpan: 1, ...overrides };
}

/** Expõe o hook real (useDashboardWidgetEditor) — precisamos do estado de
 * verdade pra provar que remover só reflete em draftWidgets depois da
 * confirmação final, não no clique do ícone de lixeira. */
function Harness({ initial, mode = "remover" }: { initial: WidgetState[]; mode?: "remover" | "adicionar" | "none" }) {
  const editor = useDashboardWidgetEditor(initial);
  React.useEffect(() => {
    editor.setMode(mode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <SidebarProvider>
      <div>
        <span data-testid="draft-count">{editor.draftWidgets.length}</span>
        <span data-testid="draft-ids">{editor.draftWidgets.map((w) => w.id).join(",")}</span>
        <DashboardWidgetEditorBody editor={editor} catalog={CATALOG} getWidgetTitle={getWidgetTitle} />
      </div>
    </SidebarProvider>
  );
}

beforeEach(() => {
  setTestViewportWidth(1280);
});

describe("DashboardWidgetEditorBody — remoção de widget (confirmação dupla)", () => {
  it("abrir a confirmação não remove o widget do rascunho", async () => {
    const user = userEvent.setup();
    render(<Harness initial={[widgetFixture()]} />);
    await user.click(screen.getByRole("button", { name: /remover widget métricas/i }));
    expect(await screen.findByText(/personalização de painel/i)).toBeInTheDocument();
    expect(screen.getByTestId("draft-count").textContent).toBe("1");
  });

  it("a mensagem descreve corretamente que é remoção da personalização, não apagar dado", async () => {
    const user = userEvent.setup();
    render(<Harness initial={[widgetFixture()]} />);
    await user.click(screen.getByRole("button", { name: /remover widget métricas/i }));
    expect(
      await screen.findByText("Isso remove o widget desta personalização de painel — nenhum dado apresentado por ele é apagado."),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Métricas").length).toBeGreaterThan(0);
  });

  it("cancelar mantém o widget no rascunho", async () => {
    const user = userEvent.setup();
    render(<Harness initial={[widgetFixture()]} />);
    await user.click(screen.getByRole("button", { name: /remover widget métricas/i }));
    await user.click(screen.getByRole("button", { name: /^cancelar$/i }));
    expect(screen.getByTestId("draft-count").textContent).toBe("1");
  });

  it("primeira confirmação ('Continuar') ainda não remove", async () => {
    const user = userEvent.setup();
    render(<Harness initial={[widgetFixture()]} />);
    await user.click(screen.getByRole("button", { name: /remover widget métricas/i }));
    await user.click(screen.getByRole("button", { name: /continuar para confirmação/i }));
    expect(screen.getByRole("button", { name: /remover widget do painel/i })).toBeInTheDocument();
    expect(screen.getByTestId("draft-count").textContent).toBe("1");
  });

  it("confirmação final remove do rascunho, sem afetar outro widget", async () => {
    const user = userEvent.setup();
    render(
      <Harness
        initial={[widgetFixture(), widgetFixture({ id: "revenue-1", type: "revenue", order: 1 })]}
      />,
    );
    await user.click(screen.getByRole("button", { name: /remover widget métricas/i }));
    await user.click(screen.getByRole("button", { name: /continuar para confirmação/i }));
    await user.click(screen.getByRole("button", { name: /remover widget do painel/i }));
    expect(screen.getByTestId("draft-count").textContent).toBe("1");
    expect(screen.getByTestId("draft-ids").textContent).toBe("revenue-1");
  });

  it("widget removido pode ser restaurado pelo modo 'Adicionar' (mesmo mecanismo já existente)", async () => {
    const user = userEvent.setup();
    render(<Harness initial={[widgetFixture()]} />);
    await user.click(screen.getByRole("button", { name: /remover widget métricas/i }));
    await user.click(screen.getByRole("button", { name: /continuar para confirmação/i }));
    await user.click(screen.getByRole("button", { name: /remover widget do painel/i }));
    expect(screen.getByTestId("draft-count").textContent).toBe("0");

    // Sem widgets no rascunho, o catálogo de "adicionar" mostra Métricas de novo.
    render(<Harness initial={[]} mode="adicionar" />);
    expect(await screen.findByText("Métricas")).toBeInTheDocument();
  });

  it("Escape mantém o widget", async () => {
    const user = userEvent.setup();
    render(<Harness initial={[widgetFixture()]} />);
    await user.click(screen.getByRole("button", { name: /remover widget métricas/i }));
    await user.keyboard("{Escape}");
    expect(screen.getByTestId("draft-count").textContent).toBe("1");
  });

  it("funciona em viewport estreito (celular) — botão de remover continua acessível", async () => {
    setTestViewportWidth(375);
    const user = userEvent.setup();
    render(<Harness initial={[widgetFixture()]} mode="none" />);
    // No celular, o botão de remover aparece mesmo fora do modo "remover".
    await user.click(screen.getByRole("button", { name: /remover widget métricas/i }));
    expect(await screen.findByText(/personalização de painel/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /continuar para confirmação/i }));
    expect(screen.getByRole("button", { name: /remover widget do painel/i })).toBeInTheDocument();
  });
});
