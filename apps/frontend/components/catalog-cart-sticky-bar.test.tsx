import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { setTestViewportWidth } from "@/vitest.setup";

// Lote 2C (ata 2026-08-21): a barra de resumo do catálogo (diferente do
// painel global da cesta) usava `fixed bottom-0` com só o offset da
// sidebar via prop — ignorava o padding do container branco padrão
// (STANDARD_SHELL_PANEL_CLASS) e por isso "vazava" pra fora dele. Agora
// calcula sozinha via useAppFrameMetrics/isStandardShellRoute, o mesmo
// mecanismo já usado por HeaderSlideScreen.

vi.mock("@/contexts/sidebar-context", () => ({
  useSidebar: () => ({ sidebarWidth: 240 }),
}));

import { CatalogCartStickyBar } from "@/components/catalog-cart-sticky-bar";

function itemFixture(id = "p1") {
  return { id, productId: id, productName: "Produto X", finalPrice: 100, quantity: 1 };
}

function renderBar(props: Partial<React.ComponentProps<typeof CatalogCartStickyBar>> = {}, path = "/admin/catalogo-produtos") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <CatalogCartStickyBar
        items={[itemFixture()]}
        total={100}
        onPrimaryAction={vi.fn()}
        onClearCart={vi.fn()}
        {...props}
      />
    </MemoryRouter>,
  );
}

describe("CatalogCartStickyBar", () => {
  beforeEach(() => {
    setTestViewportWidth(1440);
  });

  it("não renderiza nada com a cesta vazia", () => {
    const { container } = renderBar({ items: [] });
    expect(container).toBeEmptyDOMElement();
  });

  it("mostra só 'Criar projeto com estes itens' como ação principal, sem 'Continuar'", () => {
    renderBar();
    expect(screen.getByRole("button", { name: /criar projeto com estes itens/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^continuar$/i })).not.toBeInTheDocument();
  });

  it("mostra 'Ver projeto' quando já existe um projeto associado", () => {
    renderBar({ projectId: "proj-1" });
    expect(screen.getByRole("button", { name: /ver projeto/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /criar projeto com estes itens/i })).not.toBeInTheDocument();
  });

  it("posiciona respeitando a largura da sidebar em rota de container padrão (desktop)", () => {
    const { container } = renderBar({}, "/admin/catalogo-produtos");
    const outer = container.firstElementChild as HTMLElement;
    expect(outer.style.left).toBe("240px");
    expect(outer.className).toContain("lg:pb-[25px]");
  });

  it("continua funcionando em largura mobile", () => {
    setTestViewportWidth(375);
    renderBar();
    expect(screen.getByRole("button", { name: /criar projeto com estes itens/i })).toBeInTheDocument();
  });

  it("'Limpar' continua acionável", () => {
    const onClearCart = vi.fn();
    renderBar({ onClearCart });
    screen.getByRole("button", { name: /limpar/i }).click();
    expect(onClearCart).toHaveBeenCalled();
  });
});
