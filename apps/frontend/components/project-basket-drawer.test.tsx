import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import { setTestViewportWidth } from "@/vitest.setup";

// Lotes 2B e 2C (ata 2026-08-20/21): a cesta de projeto é um contexto
// GLOBAL — abre por cima de qualquer página, em qualquer portal. Este
// arquivo prova, com o componente real (ProjectBasketDrawer) e o
// HeaderSlideScreen real (não mockado), que:
//   1. "Ir para o catálogo" (só no estado vazio, 2B) navega pro catálogo
//      certo do portal atual, em vez de só fechar sem sair do lugar.
//   2. Fechar continua funcionando manualmente e ao navegar por qualquer
//      outro lugar (ex.: um link fora da cesta) — a lógica original de
//      "fecha ao trocar de rota" foi preservada de propósito, não removida.
//   3. Nenhum item da cesta é apagado por esses cliques.
//   4. (2C) O resumo com itens não tem mais "Continuar adicionando" —
//      única ação principal é "Criar projeto com estes itens".

const { setOpenSpy, clearBasketSpy, removeItemSpy, basketConfig } = vi.hoisted(() => ({
  setOpenSpy: vi.fn(),
  clearBasketSpy: vi.fn(),
  removeItemSpy: vi.fn(),
  basketConfig: {
    items: [] as Array<{
      id: string;
      productId: string;
      productName: string;
      productCategory: string;
      finalPrice: number;
      quantity: number;
      product: Record<string, unknown>;
    }>,
    isOpen: true,
  },
}));

// Duplo real (com estado de verdade via useState), não um mock estático —
// precisamos que basket.isOpen realmente mude quando setOpen() é chamado
// pra provar que o HeaderSlideScreen real desmonta o painel (sem overlay
// invisível sobrando), não só que a função foi chamada.
vi.mock("@/contexts/project-basket-context", () => ({
  useProjectBasket: () => {
    const [isOpen, setIsOpenState] = React.useState(basketConfig.isOpen);
    const [items, setItemsState] = React.useState(basketConfig.items);
    return {
      items,
      projectId: null,
      isOpen,
      setOpen: (v: boolean) => {
        setOpenSpy(v);
        setIsOpenState(v);
      },
      setProjectAssociation: vi.fn(),
      addItem: vi.fn(),
      removeItem: (id: string) => {
        removeItemSpy(id);
        setItemsState((prev) => prev.filter((i) => i.id !== id));
      },
      updateQuantity: vi.fn(),
      updateCommission: vi.fn(),
      clearBasket: () => {
        clearBasketSpy();
        setItemsState([]);
      },
      getTotalItems: () => items.reduce((s, i) => s + i.quantity, 0),
      getTotalPrice: () => items.reduce((s, i) => s + i.finalPrice * i.quantity, 0),
      getClientTotal: () => items.reduce((s, i) => s + i.finalPrice * i.quantity, 0),
    };
  },
}));

vi.mock("@/contexts/sidebar-context", () => ({
  useSidebar: () => ({ sidebarWidth: 260 }),
}));

vi.mock("@/contexts/open-screens-context", () => ({
  usePinEntry: () => ({ pinned: false, toggle: vi.fn() }),
}));

vi.mock("@/components/project-create-new-panel", () => ({
  ProjectCreateNewPanel: () => null,
}));

vi.mock("@/components/product-detail-sheet", () => ({
  ProductDetailSheet: () => null,
}));

import { ProjectBasketDrawer } from "@/components/project-basket-drawer";

/** Mostra o pathname atual na tela — só pra ler a URL final sem mockar o router. */
function LocationProbe() {
  const location = useLocation();
  return <div data-testid="current-path">{location.pathname}</div>;
}

function renderDrawer(initialPath: string, extra?: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path="*"
          element={
            <>
              <LocationProbe />
              {extra}
              <ProjectBasketDrawer />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

function itemFixture(id = "prod-1") {
  return {
    id,
    productId: id,
    productName: "Produto Teste",
    productCategory: "Design",
    finalPrice: 100,
    quantity: 1,
    product: {},
  };
}

describe("ProjectBasketDrawer — navegação do botão de catálogo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    basketConfig.items = [];
    basketConfig.isOpen = true;
    setTestViewportWidth(1280);
  });

  it("1. cesta vazia mostra o botão 'Ir para o catálogo'", () => {
    renderDrawer("/admin/dashboard");
    expect(screen.getByRole("button", { name: /ir para o catálogo/i })).toBeInTheDocument();
  });

  it("2/5. Admin: clicar em 'Ir para o catálogo' navega pra /admin/catalogo-produtos e fecha a cesta", async () => {
    const user = userEvent.setup();
    renderDrawer("/admin/dashboard");
    await user.click(screen.getByRole("button", { name: /ir para o catálogo/i }));
    expect(screen.getByTestId("current-path").textContent).toBe("/admin/catalogo-produtos");
    expect(setOpenSpy).toHaveBeenCalledWith(false);
  });

  it("6. Empresa (/company/...): navega pra /company/produtos", async () => {
    const user = userEvent.setup();
    renderDrawer("/company/dashboard");
    await user.click(screen.getByRole("button", { name: /ir para o catálogo/i }));
    expect(screen.getByTestId("current-path").textContent).toBe("/company/produtos");
  });

  it("6. Agência via /agencia: navega pra /agencia/catalogo", async () => {
    const user = userEvent.setup();
    renderDrawer("/agencia/dashboard");
    await user.click(screen.getByRole("button", { name: /ir para o catálogo/i }));
    expect(screen.getByTestId("current-path").textContent).toBe("/agencia/catalogo");
  });

  it("6. Agência via /agency: navega pra /agency/catalogo (mesmo portal, outro prefixo de URL)", async () => {
    const user = userEvent.setup();
    renderDrawer("/agency/dashboard");
    await user.click(screen.getByRole("button", { name: /ir para o catálogo/i }));
    expect(screen.getByTestId("current-path").textContent).toBe("/agency/catalogo");
  });

  it("7. Portal sem catálogo próprio (ex.: nômade) não navega pra rota nenhuma, mas ainda fecha a cesta", async () => {
    const user = userEvent.setup();
    renderDrawer("/nomades/tarefasdisponiveis");
    await user.click(screen.getByRole("button", { name: /ir para o catálogo/i }));
    // Continua no mesmo lugar — nenhuma rota inventada foi acessada.
    expect(screen.getByTestId("current-path").textContent).toBe("/nomades/tarefasdisponiveis");
    expect(setOpenSpy).toHaveBeenCalledWith(false);
  });

  // Lote 2C (ata 2026-08-21): o resumo da cesta serve pra CONCLUIR a cesta
  // existente — "Continuar adicionando" foi removido daqui de propósito
  // (é redundante com "Ir para o catálogo" do estado vazio). Só deve
  // sobrar UMA ação principal: "Criar projeto com estes itens".
  it("2. Cesta COM itens NÃO mostra 'Continuar adicionando'", () => {
    basketConfig.items = [itemFixture()];
    renderDrawer("/admin/dashboard");
    expect(screen.queryByRole("button", { name: /ir para o catálogo/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /continuar adicionando/i })).not.toBeInTheDocument();
  });

  it("3. Cesta COM itens mostra somente 'Criar projeto com estes itens' como ação principal", () => {
    basketConfig.items = [itemFixture()];
    renderDrawer("/admin/dashboard");
    expect(screen.getByRole("button", { name: /criar projeto com estes itens/i })).toBeInTheDocument();
    // "Limpar" continua existindo (ação secundária/destrutiva, não é "continuar comprando").
    expect(screen.getByRole("button", { name: /^limpar$/i })).toBeInTheDocument();
  });

  it("4. Itens e quantidades permanecem intactos ao abrir o resumo com itens", () => {
    basketConfig.items = [itemFixture("prod-1"), { ...itemFixture("prod-2"), quantity: 3 }];
    renderDrawer("/admin/dashboard");
    // Contagem no cabeçalho soma quantidades (1 + 3 = 4), não produtos distintos.
    expect(screen.getByText(/4 produtos selecionados/i)).toBeInTheDocument();
    expect(screen.getAllByText("3")).not.toHaveLength(0); // quantidade do segundo item visível
    expect(clearBasketSpy).not.toHaveBeenCalled();
    expect(removeItemSpy).not.toHaveBeenCalled();
  });

  it("5. Resumo da cesta não é renderizado duplicado", () => {
    basketConfig.items = [itemFixture()];
    renderDrawer("/admin/dashboard");
    expect(screen.getAllByRole("button", { name: /criar projeto com estes itens/i })).toHaveLength(1);
    expect(screen.getAllByText("Produto Teste")).toHaveLength(1);
  });

  it("8. Fechar manualmente (X) continua funcionando, sem navegar", async () => {
    const user = userEvent.setup();
    const { container } = renderDrawer("/admin/dashboard");
    const closeButton = container.querySelector("svg.lucide-x")?.closest("button");
    expect(closeButton).toBeTruthy();
    await user.click(closeButton!);
    expect(setOpenSpy).toHaveBeenCalledWith(false);
    expect(screen.getByTestId("current-path").textContent).toBe("/admin/dashboard");
  });

  it("9. Navegar por qualquer outro lugar (fora da cesta) continua fechando a cesta — comportamento original preservado", async () => {
    const user = userEvent.setup();
    renderDrawer("/admin/dashboard", <Link to="/admin/empresas">ir pra empresas</Link>);
    await user.click(screen.getByRole("link", { name: /ir pra empresas/i }));
    expect(screen.getByTestId("current-path").textContent).toBe("/admin/empresas");
    expect(setOpenSpy).toHaveBeenCalledWith(false);
  });

  it("10. Abertura normal (com itens) continua renderizando sem quebrar", () => {
    basketConfig.items = [itemFixture()];
    renderDrawer("/admin/dashboard");
    expect(screen.getByText("Produto Teste")).toBeInTheDocument();
    expect(screen.getByText(/1 produto selecionado/i)).toBeInTheDocument();
  });

  it("11. Nenhum overlay/painel sobra no DOM depois de fechar (mobile)", async () => {
    setTestViewportWidth(375);
    const user = userEvent.setup();
    renderDrawer("/admin/dashboard");
    expect(screen.getByText("Cesta do projeto")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /ir para o catálogo/i }));
    await waitFor(() => expect(screen.queryByText("Cesta do projeto")).not.toBeInTheDocument(), {
      timeout: 1000,
    });
  });

  it("11. Nenhum overlay/painel sobra no DOM depois de fechar (desktop)", async () => {
    setTestViewportWidth(1440);
    const user = userEvent.setup();
    renderDrawer("/company/dashboard");
    await user.click(screen.getByRole("button", { name: /ir para o catálogo/i }));
    await waitFor(() => expect(screen.queryByText("Cesta do projeto")).not.toBeInTheDocument(), {
      timeout: 1000,
    });
  });
});
