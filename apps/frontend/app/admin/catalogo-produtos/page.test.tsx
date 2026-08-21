import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";

// Lote 2D (ata 2026-08-21): "Escolher" deve abrir uma TELA CHEIA do
// produto (rota /admin/catalogo-produtos/:produtoId), não um painel sobre
// a listagem — e essa tela não pode mostrar o catálogo por trás nem
// repetir o cabeçalho "Catálogo de Produtos".

const { addItemSpy, basketConfig, productsConfig } = vi.hoisted(() => ({
  addItemSpy: vi.fn(),
  basketConfig: { items: [] as any[] },
  productsConfig: {
    loading: false,
    products: [
      { id: "prod-1", name: "Alteração de Materiais Diversos", category: "Design e Criação", finalPrice: 90.72, variations: [] },
    ] as any[],
  },
}));

vi.mock("@/contexts/project-basket-context", () => ({
  useProjectBasket: () => ({
    items: basketConfig.items,
    projectId: null,
    isOpen: false,
    setOpen: vi.fn(),
    setProjectAssociation: vi.fn(),
    addItem: addItemSpy,
    removeItem: vi.fn(),
    updateQuantity: vi.fn(),
    updateCommission: vi.fn(),
    clearBasket: vi.fn(),
    getTotalItems: () => 0,
    getTotalPrice: () => 0,
    getClientTotal: () => 0,
  }),
}));

vi.mock("@/lib/contexts/product-context", () => ({
  useProducts: () => productsConfig,
}));

vi.mock("@/contexts/open-screens-context", () => ({
  usePinnedPage: () => ({ pinned: false, toggle: vi.fn() }),
  usePinEntry: () => ({ pinned: false, toggle: vi.fn() }),
}));

// A listagem real (ProductCatalogView) é gigante e não é o alvo deste
// teste — o que importa aqui é que ela NÃO é renderizada quando existe um
// produtoId na URL. Um stub simples com um texto identificável basta pra
// provar isso (item 6: "catálogo não permanece visível atrás").
vi.mock("@/components/product-catalog-view", () => ({
  ProductCatalogView: () => <div data-testid="catalog-list-stub">Listagem do catálogo (stub)</div>,
}));

import AdminCatalogoProdutos from "@/app/admin/catalogo-produtos/page";

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="current-path">{location.pathname}</div>;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/admin/catalogo-produtos/:produtoId?"
          element={
            <>
              <LocationProbe />
              <AdminCatalogoProdutos />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AdminCatalogoProdutos — rota da tela cheia do produto", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    basketConfig.items = [];
  });

  it("1/6. sem produtoId, mostra a listagem (catálogo), não a tela do produto", () => {
    renderAt("/admin/catalogo-produtos");
    expect(screen.getByTestId("catalog-list-stub")).toBeInTheDocument();
    expect(screen.getByText("Catálogo de Produtos")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Alteração de Materiais Diversos" })).not.toBeInTheDocument();
  });

  it("2/6. com produtoId na URL, mostra a tela cheia do produto e NÃO a listagem por trás", () => {
    renderAt("/admin/catalogo-produtos/prod-1");
    expect(screen.getByRole("heading", { name: "Alteração de Materiais Diversos" })).toBeInTheDocument();
    expect(screen.queryByTestId("catalog-list-stub")).not.toBeInTheDocument();
  });

  it("5. 'Catálogo de Produtos' não aparece repetido na tela do produto", () => {
    renderAt("/admin/catalogo-produtos/prod-1");
    expect(screen.queryByText("Catálogo de Produtos")).not.toBeInTheDocument();
  });

  it("3. atualizar a rota (montar direto na URL com o id) mantém o produto correto", () => {
    // Simula "refresh": monta o componente diretamente nessa URL, sem
    // navegação client-side prévia — a árvore de componentes já nasce
    // sabendo qual produto mostrar, só pela URL.
    renderAt("/admin/catalogo-produtos/prod-1");
    expect(screen.getByRole("heading", { name: "Alteração de Materiais Diversos" })).toBeInTheDocument();
  });

  it("produto inexistente na URL mostra estado de erro com ação de voltar, não quebra", () => {
    renderAt("/admin/catalogo-produtos/produto-que-nao-existe");
    expect(screen.getByText(/produto não encontrado/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /voltar ao catálogo/i })).toBeInTheDocument();
  });

  it("10/17. voltar ao catálogo navega de volta pra listagem, sem alterar a cesta", async () => {
    const user = userEvent.setup();
    renderAt("/admin/catalogo-produtos/prod-1");
    await user.click(screen.getByRole("button", { name: /voltar ao catálogo/i }));
    expect(screen.getByTestId("current-path").textContent).toBe("/admin/catalogo-produtos");
    expect(addItemSpy).not.toHaveBeenCalled();
  });

  it("11. Contratar chama basket.addItem exatamente uma vez, com o produto certo", async () => {
    const user = userEvent.setup();
    renderAt("/admin/catalogo-produtos/prod-1");
    await user.click(screen.getByRole("button", { name: /^contratar$/i }));
    expect(addItemSpy).toHaveBeenCalledTimes(1);
    expect(addItemSpy).toHaveBeenCalledWith(expect.objectContaining({ id: "prod-1" }));
  });

  it("15. item já contratado (presente na cesta) mostra 'Já está na cesta'", () => {
    basketConfig.items = [{ id: "prod-1", productId: "prod-1", productName: "x", finalPrice: 90.72, quantity: 1 }];
    renderAt("/admin/catalogo-produtos/prod-1");
    expect(screen.getByRole("button", { name: /já está na cesta/i })).toBeDisabled();
  });
});
