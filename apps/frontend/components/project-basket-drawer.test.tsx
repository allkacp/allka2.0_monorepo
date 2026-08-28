import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import { setTestViewportWidth } from "@/vitest.setup";

// Lotes 2B e 2C (ata 2026-08-20/21): a cesta de projeto abre com o
// componente real (ProjectBasketDrawer) e o HeaderSlideScreen real (não
// mockado). Este arquivo prova que:
//   1. "Ir para o catálogo" (só no estado vazio, 2B) navega pro catálogo
//      certo do portal atual, em vez de só fechar sem sair do lugar.
//   2. Fechar continua funcionando manualmente e ao navegar por qualquer
//      outro lugar (ex.: um link fora da cesta) — a lógica original de
//      "fecha ao trocar de rota" foi preservada de propósito, não removida.
//   3. Nenhum item da cesta é apagado por esses cliques.
//   4. (2C) O resumo com itens não tem mais "Continuar adicionando" —
//      única ação principal é "Criar projeto com estes itens".
//
// Fechamento do bloco 1 (ata 2026-08): a cesta NÃO é mais um painel
// global. Ela só é renderizada nas rotas de catálogo/loja
// (`isCatalogRoute`), mesmo quando há itens salvos. Por isso os testes de
// comportamento interno do painel montam numa rota de catálogo real
// (ex.: `/admin/catalogo-produtos`) e há um bloco dedicado provando que,
// fora do catálogo, o painel não renderiza, fecha em segurança e preserva
// os itens.

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
    renderDrawer("/admin/catalogo-produtos");
    expect(screen.getByRole("button", { name: /ir para o catálogo/i })).toBeInTheDocument();
  });

  it("2/5. Admin: clicar em 'Ir para o catálogo' navega pra /admin/catalogo-produtos e fecha a cesta", async () => {
    const user = userEvent.setup();
    renderDrawer("/admin/catalogo-produtos");
    await user.click(screen.getByRole("button", { name: /ir para o catálogo/i }));
    expect(screen.getByTestId("current-path").textContent).toBe("/admin/catalogo-produtos");
    expect(setOpenSpy).toHaveBeenCalledWith(false);
  });

  it("6. Empresa: do detalhe do produto (/company/produtos/:id) 'Ir para o catálogo' volta pra /company/produtos", async () => {
    const user = userEvent.setup();
    renderDrawer("/company/produtos/prod-9");
    await user.click(screen.getByRole("button", { name: /ir para o catálogo/i }));
    expect(screen.getByTestId("current-path").textContent).toBe("/company/produtos");
  });

  it("6. Agência via /agencia: do detalhe volta pra /agencia/catalogo", async () => {
    const user = userEvent.setup();
    renderDrawer("/agencia/catalogo/prod-9");
    await user.click(screen.getByRole("button", { name: /ir para o catálogo/i }));
    expect(screen.getByTestId("current-path").textContent).toBe("/agencia/catalogo");
  });

  it("6. Agência via /agency: do detalhe volta pra /agency/catalogo (mesmo portal, outro prefixo de URL)", async () => {
    const user = userEvent.setup();
    renderDrawer("/agency/catalogo/prod-9");
    await user.click(screen.getByRole("button", { name: /ir para o catálogo/i }));
    expect(screen.getByTestId("current-path").textContent).toBe("/agency/catalogo");
  });

  it("7. Líder: do detalhe volta pra /leader/catalogo", async () => {
    const user = userEvent.setup();
    renderDrawer("/leader/catalogo/prod-9");
    await user.click(screen.getByRole("button", { name: /ir para o catálogo/i }));
    expect(screen.getByTestId("current-path").textContent).toBe("/leader/catalogo");
    expect(setOpenSpy).toHaveBeenCalledWith(false);
  });

  // Lote 2C (ata 2026-08-21): o resumo da cesta serve pra CONCLUIR a cesta
  // existente — "Continuar adicionando" foi removido daqui de propósito
  // (é redundante com "Ir para o catálogo" do estado vazio). Só deve
  // sobrar UMA ação principal: "Criar projeto com estes itens".
  it("2. Cesta COM itens NÃO mostra 'Continuar adicionando'", () => {
    basketConfig.items = [itemFixture()];
    renderDrawer("/admin/catalogo-produtos");
    expect(screen.queryByRole("button", { name: /ir para o catálogo/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /continuar adicionando/i })).not.toBeInTheDocument();
  });

  it("3. Cesta COM itens mostra somente 'Criar projeto com estes itens' como ação principal", () => {
    basketConfig.items = [itemFixture()];
    renderDrawer("/admin/catalogo-produtos");
    expect(screen.getByRole("button", { name: /criar projeto com estes itens/i })).toBeInTheDocument();
    // "Limpar" continua existindo (ação secundária/destrutiva, não é "continuar comprando").
    expect(screen.getByRole("button", { name: /^limpar$/i })).toBeInTheDocument();
  });

  it("4. Itens e quantidades permanecem intactos ao abrir o resumo com itens", () => {
    basketConfig.items = [itemFixture("prod-1"), { ...itemFixture("prod-2"), quantity: 3 }];
    renderDrawer("/admin/catalogo-produtos");
    // Contagem no cabeçalho soma quantidades (1 + 3 = 4), não produtos distintos.
    expect(screen.getByText(/4 produtos selecionados/i)).toBeInTheDocument();
    expect(screen.getAllByText("3")).not.toHaveLength(0); // quantidade do segundo item visível
    expect(clearBasketSpy).not.toHaveBeenCalled();
    expect(removeItemSpy).not.toHaveBeenCalled();
  });

  it("5. Resumo da cesta não é renderizado duplicado", () => {
    basketConfig.items = [itemFixture()];
    renderDrawer("/admin/catalogo-produtos");
    expect(screen.getAllByRole("button", { name: /criar projeto com estes itens/i })).toHaveLength(1);
    expect(screen.getAllByText("Produto Teste")).toHaveLength(1);
  });

  it("8. Fechar manualmente (X) continua funcionando, sem navegar", async () => {
    const user = userEvent.setup();
    const { container } = renderDrawer("/admin/catalogo-produtos");
    const closeButton = container.querySelector("svg.lucide-x")?.closest("button");
    expect(closeButton).toBeTruthy();
    await user.click(closeButton!);
    expect(setOpenSpy).toHaveBeenCalledWith(false);
    expect(screen.getByTestId("current-path").textContent).toBe("/admin/catalogo-produtos");
  });

  it("9. Navegar por qualquer outro lugar (fora da cesta) continua fechando a cesta — comportamento original preservado", async () => {
    const user = userEvent.setup();
    renderDrawer("/admin/catalogo-produtos", <Link to="/admin/empresas">ir pra empresas</Link>);
    await user.click(screen.getByRole("link", { name: /ir pra empresas/i }));
    expect(screen.getByTestId("current-path").textContent).toBe("/admin/empresas");
    expect(setOpenSpy).toHaveBeenCalledWith(false);
  });

  it("10. Abertura normal (com itens) continua renderizando sem quebrar", () => {
    basketConfig.items = [itemFixture()];
    renderDrawer("/admin/catalogo-produtos");
    expect(screen.getByText("Produto Teste")).toBeInTheDocument();
    expect(screen.getByText(/1 produto selecionado/i)).toBeInTheDocument();
  });

  it("11. Nenhum overlay/painel sobra no DOM depois de fechar (mobile)", async () => {
    setTestViewportWidth(375);
    const user = userEvent.setup();
    renderDrawer("/admin/catalogo-produtos");
    expect(screen.getByText("Cesta do projeto")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /ir para o catálogo/i }));
    await waitFor(() => expect(screen.queryByText("Cesta do projeto")).not.toBeInTheDocument(), {
      timeout: 1000,
    });
  });

  it("11. Nenhum overlay/painel sobra no DOM depois de fechar (desktop)", async () => {
    setTestViewportWidth(1440);
    const user = userEvent.setup();
    renderDrawer("/company/produtos");
    await user.click(screen.getByRole("button", { name: /ir para o catálogo/i }));
    await waitFor(() => expect(screen.queryByText("Cesta do projeto")).not.toBeInTheDocument(), {
      timeout: 1000,
    });
  });
});

// Fechamento do bloco 1 (ata 2026-08) — a cesta pertence ao ambiente de
// catálogo/loja e NÃO é um painel global. Fora das rotas de catálogo
// (`isCatalogRoute`) ela não é renderizada NEM MESMO com itens salvos e
// `isOpen` verdadeiro (estado antigo, atalho da bandeja). Fechar assim é
// seguro: não navega sozinho e não apaga itens — só `clearBasket` apaga.
describe("ProjectBasketDrawer — só vive no contexto de catálogo/loja", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    basketConfig.items = [itemFixture("prod-1"), { ...itemFixture("prod-2"), quantity: 2 }];
    basketConfig.isOpen = true;
    setTestViewportWidth(1280);
  });

  it("fora do catálogo (dashboard) com isOpen=true e itens salvos: não renderiza, fecha em segurança, preserva itens e não navega", async () => {
    renderDrawer("/admin/dashboard");
    expect(screen.queryByText("Cesta do projeto")).not.toBeInTheDocument();
    expect(screen.queryByText("Produto Teste")).not.toBeInTheDocument();
    await waitFor(() => expect(setOpenSpy).toHaveBeenCalledWith(false));
    expect(clearBasketSpy).not.toHaveBeenCalled();
    expect(removeItemSpy).not.toHaveBeenCalled();
    expect(screen.getByTestId("current-path").textContent).toBe("/admin/dashboard");
  });

  it("telas administrativas/de gestão não renderizam a cesta (gestão de produtos, financeiro, perfil, projetos já criados)", () => {
    for (const path of [
      "/admin/produtos",
      "/admin/financeiro",
      "/admin/perfil",
      "/admin/combos",
      "/company/projetos",
      "/agency/combos",
    ]) {
      const { unmount } = renderDrawer(path);
      expect(screen.queryByText("Cesta do projeto")).not.toBeInTheDocument();
      unmount();
    }
  });

  it("dentro do catálogo — inclusive no detalhe do produto — a cesta renderiza normalmente", () => {
    const { unmount } = renderDrawer("/admin/catalogo-produtos");
    expect(screen.getByText("Cesta do projeto")).toBeInTheDocument();
    unmount();
    renderDrawer("/company/produtos/prod-1");
    expect(screen.getByText("Cesta do projeto")).toBeInTheDocument();
  });

  it("sair do catálogo para o dashboard fecha a cesta sem apagar itens; voltar ao catálogo mostra a cesta de novo com os itens", async () => {
    const user = userEvent.setup();
    renderDrawer("/admin/catalogo-produtos", <Link to="/admin/dashboard">sair</Link>);
    expect(screen.getByText("Cesta do projeto")).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: /^sair$/i }));
    await waitFor(() => expect(screen.queryByText("Cesta do projeto")).not.toBeInTheDocument());
    expect(clearBasketSpy).not.toHaveBeenCalled();
    expect(removeItemSpy).not.toHaveBeenCalled();
  });
});

// Fundação de confirmação dupla (ata 2026-08-22) — "Limpar" não apaga mais
// a cesta direto no clique; abre o mesmo ConfirmationDialog (twoStep) usado
// pela exclusão de produto no Admin.
describe("ProjectBasketDrawer — 'Limpar' com confirmação dupla", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    basketConfig.items = [itemFixture("prod-1"), { ...itemFixture("prod-2"), quantity: 2 }];
    basketConfig.isOpen = true;
    setTestViewportWidth(1280);
  });

  it("clicar em 'Limpar' abre a 1ª etapa e ainda não limpa nada", async () => {
    const user = userEvent.setup();
    renderDrawer("/admin/catalogo-produtos");
    await user.click(screen.getByRole("button", { name: /^limpar$/i }));
    expect(await screen.findByText(/Isso remove todos os itens da cesta/i)).toBeInTheDocument();
    expect(screen.getByText(/3 itens na cesta/i)).toBeInTheDocument();
    expect(clearBasketSpy).not.toHaveBeenCalled();
  });

  it("cancelar mantém todos os itens", async () => {
    const user = userEvent.setup();
    renderDrawer("/admin/catalogo-produtos");
    await user.click(screen.getByRole("button", { name: /^limpar$/i }));
    await user.click(screen.getByRole("button", { name: /^cancelar$/i }));
    expect(clearBasketSpy).not.toHaveBeenCalled();
    expect(screen.getAllByText("Produto Teste").length).toBeGreaterThan(0);
  });

  it("voltar (da 2ª pra 1ª etapa) mantém todos os itens", async () => {
    const user = userEvent.setup();
    renderDrawer("/admin/catalogo-produtos");
    await user.click(screen.getByRole("button", { name: /^limpar$/i }));
    await user.click(screen.getByRole("button", { name: /continuar para confirmação/i }));
    await user.click(screen.getByRole("button", { name: /voltar/i }));
    expect(clearBasketSpy).not.toHaveBeenCalled();
    expect(screen.getAllByText("Produto Teste").length).toBeGreaterThan(0);
  });

  it("primeira confirmação ('Continuar') ainda não limpa a cesta", async () => {
    const user = userEvent.setup();
    renderDrawer("/admin/catalogo-produtos");
    await user.click(screen.getByRole("button", { name: /^limpar$/i }));
    await user.click(screen.getByRole("button", { name: /continuar para confirmação/i }));
    expect(clearBasketSpy).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /limpar todos os itens da cesta/i })).toBeInTheDocument();
  });

  it("confirmação final limpa a cesta — quantidade e total zeram só nesse momento", async () => {
    const user = userEvent.setup();
    renderDrawer("/admin/catalogo-produtos");
    await user.click(screen.getByRole("button", { name: /^limpar$/i }));
    await user.click(screen.getByRole("button", { name: /continuar para confirmação/i }));
    await user.click(screen.getByRole("button", { name: /limpar todos os itens da cesta/i }));
    await waitFor(() => expect(clearBasketSpy).toHaveBeenCalledTimes(1));
    // Com a cesta vazia, o resumo com itens some (volta pro estado vazio).
    await waitFor(() => expect(screen.queryByText("Produto Teste")).not.toBeInTheDocument());
    expect(await screen.findByRole("button", { name: /ir para o catálogo/i })).toBeInTheDocument();
  });

  it("abrir novamente não recupera os itens já apagados", async () => {
    const user = userEvent.setup();
    renderDrawer("/admin/catalogo-produtos");
    await user.click(screen.getByRole("button", { name: /^limpar$/i }));
    await user.click(screen.getByRole("button", { name: /continuar para confirmação/i }));
    await user.click(screen.getByRole("button", { name: /limpar todos os itens da cesta/i }));
    await waitFor(() => expect(clearBasketSpy).toHaveBeenCalledTimes(1));

    const catalogButton = await screen.findByRole("button", { name: /ir para o catálogo/i });
    await user.click(catalogButton);
    expect(setOpenSpy).toHaveBeenCalledWith(false);
    // Reabrir (setOpen(true) simulado) continua vazio — nada foi recuperado.
    expect(screen.queryByText("Produto Teste")).not.toBeInTheDocument();
  });
});
