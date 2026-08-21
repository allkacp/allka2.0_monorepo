import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setTestViewportWidth } from "@/vitest.setup";

// Lote 2D (ata 2026-08-21): "Escolher" deve abrir uma tela cheia do produto,
// e SÓ o clique explícito em "Contratar" pode chamar onContratar (o único
// caminho até basket.addItem) — abrir, selecionar, trocar de opção, trocar
// de aba ou voltar nunca podem disparar isso.
//
// Lote 2E (ata 2026-08-21, corretivo): a primeira versão desta tela
// simplificou demais o conteúdo em relação ao antigo ProductDetailSheet
// (modal). Este arquivo também prova que o conteúdo rico foi recuperado:
// abas (Detalhes/Portfólio/Nômades), descrição expansível, portfólio real,
// profissionais relacionados, produtos complementares — sem que nada disso
// jamais adicione à cesta sozinho.

const { accountConfig, productsConfig } = vi.hoisted(() => ({
  accountConfig: { accountType: "empresas" as string },
  productsConfig: { products: [] as any[] },
}));

vi.mock("@/contexts/account-type-context", () => ({
  useAccountType: () => ({ accountType: accountConfig.accountType, accountSubType: null }),
}));

vi.mock("@/lib/contexts/product-context", () => ({
  useProducts: () => productsConfig,
}));

vi.mock("@/components/admin/product-nomads-tab", () => ({
  ProductNomadsTab: ({ productId }: { productId: string }) => (
    <div data-testid="nomads-tab-stub">Nômades do produto {productId}</div>
  ),
}));

vi.mock("@/components/product-rating-display", () => ({
  ProductRatingDisplay: () => <span data-testid="rating-stub" />,
}));

vi.mock("@/components/copy-link-button", () => ({
  CopyLinkButton: () => <button type="button">Copiar link</button>,
}));

import { ProductContractView } from "@/components/product-contract-view";

const LONG_DESCRIPTION =
  "Este é um serviço completo de gestão de mídias sociais, incluindo criação de conteúdo, agendamento de posts, resposta a comentários, relatórios mensais de desempenho, análise de concorrência, sugestões de melhoria contínua e acompanhamento próximo com o time de marketing do cliente ao longo de todo o contrato.";

function productFixture(overrides: Record<string, any> = {}): any {
  return {
    id: "prod-1",
    name: "Alteração de Materiais Diversos",
    category: "Design e Criação",
    finalPrice: 90.72,
    deliveryDays: 2,
    description: "",
    variations: [],
    presentation: {
      tagline: "Resumo curto do produto",
      highlights: ["Destaque 1", "Destaque 2"],
      whatIsIncluded: [{ title: "Item incluído 1" }],
      notIncluded: ["Item não incluído"],
      deliverables: ["Entregável 1"],
    },
    ...overrides,
  };
}

function renderView(props: Partial<React.ComponentProps<typeof ProductContractView>> = {}) {
  const onContratar = vi.fn();
  const onBack = vi.fn();
  const isItemInBasket = vi.fn().mockReturnValue(false);
  const utils = render(
    <ProductContractView
      product={productFixture()}
      isItemInBasket={isItemInBasket}
      onContratar={onContratar}
      onBack={onBack}
      {...props}
    />,
  );
  return { ...utils, onContratar, onBack, isItemInBasket };
}

describe("ProductContractView", () => {
  beforeEach(() => {
    setTestViewportWidth(1280);
    accountConfig.accountType = "empresas";
    productsConfig.products = [];
  });

  it("4. cabeçalho é o nome do produto, categoria aparece como informação secundária", () => {
    renderView();
    expect(screen.getByRole("heading", { name: "Alteração de Materiais Diversos" })).toBeInTheDocument();
    expect(screen.getByText("Design e Criação")).toBeInTheDocument();
  });

  it("4. só existe um único cabeçalho (h1) na tela", () => {
    renderView();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("7. abrir a tela (montar o componente) não chama onContratar", () => {
    const { onContratar } = renderView();
    expect(onContratar).not.toHaveBeenCalled();
  });

  it("8/9. selecionar e trocar de opção não chama onContratar", async () => {
    const user = userEvent.setup();
    const { onContratar } = renderView({
      product: productFixture({
        variations: [
          { id: "v1", name: "Plano Básico", price: 90.72, isActive: true },
          { id: "v2", name: "Plano Avançado", price: 150, isActive: true },
        ],
      }),
    });
    await user.click(screen.getByRole("button", { name: /plano básico/i }));
    expect(onContratar).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: /plano avançado/i }));
    expect(onContratar).not.toHaveBeenCalled();
  });

  it("10. voltar (onBack) não chama onContratar nem altera nada da cesta", async () => {
    const user = userEvent.setup();
    const { onContratar, onBack } = renderView();
    await user.click(screen.getByRole("button", { name: /voltar ao catálogo/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onContratar).not.toHaveBeenCalled();
  });

  it("12. botão 'Contratar' fica desabilitado sem uma opção válida selecionada", () => {
    renderView({
      product: productFixture({
        variations: [{ id: "v1", name: "Plano Básico", price: 90.72, isActive: true }],
      }),
    });
    const btn = screen.getByRole("button", { name: /selecione uma opção para continuar/i });
    expect(btn).toBeDisabled();
  });

  it("11. somente clicar em 'Contratar' chama onContratar — produto sem variações", async () => {
    const user = userEvent.setup();
    const { onContratar } = renderView();
    const btn = screen.getByRole("button", { name: /^contratar$/i });
    expect(btn).toBeEnabled();
    await user.click(btn);
    expect(onContratar).toHaveBeenCalledTimes(1);
    expect(onContratar).toHaveBeenCalledWith(
      expect.objectContaining({ selectedVariation: null, finalPrice: 90.72 }),
    );
  });

  it("11. com variações, precisa selecionar antes — só então 'Contratar' funciona", async () => {
    const user = userEvent.setup();
    const { onContratar } = renderView({
      product: productFixture({
        variations: [{ id: "v1", name: "Plano Básico", price: 90.72, isActive: true }],
      }),
    });
    await user.click(screen.getByRole("button", { name: /plano básico/i }));
    expect(onContratar).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: /^contratar$/i }));
    expect(onContratar).toHaveBeenCalledTimes(1);
    expect(onContratar).toHaveBeenCalledWith(
      expect.objectContaining({ selectedVariation: expect.objectContaining({ id: "v1" }), finalPrice: 90.72 }),
    );
  });

  it("13. clique duplicado rápido só chama onContratar uma vez (botão desabilita ao clicar)", async () => {
    const user = userEvent.setup();
    const { onContratar } = renderView();
    const btn = screen.getByRole("button", { name: /^contratar$/i });
    await user.dblClick(btn);
    expect(onContratar).toHaveBeenCalledTimes(1);
  });

  it("14. confirmação amigável aparece depois de contratar", async () => {
    const user = userEvent.setup();
    renderView();
    await user.click(screen.getByRole("button", { name: /^contratar$/i }));
    expect(screen.getByRole("status")).toHaveTextContent(/adicionado à cesta/i);
  });

  it("15. 'Já está na cesta' só aparece quando isItemInBasket retorna true pra essa opção", () => {
    renderView({ isItemInBasket: vi.fn().mockReturnValue(true) });
    expect(screen.getByRole("button", { name: /já está na cesta/i })).toBeDisabled();
  });

  it("15. sem estar na cesta, mostra 'Contratar' normalmente (nunca 'Remover' aqui — essa tela não remove)", () => {
    renderView();
    expect(screen.queryByText(/remover/i)).not.toBeInTheDocument();
  });

  it("18. não renderiza nenhuma barra flutuante de cesta nesta tela", () => {
    renderView();
    expect(screen.queryByRole("button", { name: /criar projeto com estes itens/i })).not.toBeInTheDocument();
  });

  it("19. mesmo comportamento em largura mobile", async () => {
    setTestViewportWidth(375);
    const user = userEvent.setup();
    const { onContratar } = renderView();
    expect(screen.getByRole("heading", { name: "Alteração de Materiais Diversos" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^contratar$/i }));
    expect(onContratar).toHaveBeenCalledTimes(1);
  });

  // ── Conteúdo recuperado (Lote 2E) ─────────────────────────────────────

  it("6. aba Detalhes é a padrão e mostra o conteúdo da apresentação", () => {
    renderView();
    expect(screen.getByRole("tab", { name: /detalhes/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Item incluído 1")).toBeInTheDocument();
  });

  it("7. aba Portfólio funciona — troca de aba não chama onContratar", async () => {
    const user = userEvent.setup();
    const { onContratar } = renderView({
      product: productFixture({ demonstrations: ["/images/a.png", "/images/b.png"] }),
    });
    await user.click(screen.getByRole("tab", { name: /portfólio/i }));
    expect(screen.getByRole("tab", { name: /portfólio/i })).toHaveAttribute("aria-selected", "true");
    expect(onContratar).not.toHaveBeenCalled();
  });

  it("8. aba Nômades aparece para admin e funciona; não aparece para outros perfis", async () => {
    accountConfig.accountType = "admin";
    const user = userEvent.setup();
    const first = renderView();
    await user.click(screen.getByRole("tab", { name: /nômades/i }));
    expect(screen.getByTestId("nomads-tab-stub")).toHaveTextContent("prod-1");
    first.unmount();

    accountConfig.accountType = "empresas";
    renderView();
    expect(screen.queryByRole("tab", { name: /nômades/i })).not.toBeInTheDocument();
  });

  it("9. estado vazio do portfólio aparece quando não há imagens", async () => {
    const user = userEvent.setup();
    renderView({ product: productFixture({ demonstrations: [] }) });
    await user.click(screen.getByRole("tab", { name: /portfólio/i }));
    expect(screen.getByText(/nenhuma imagem de portfólio ainda/i)).toBeInTheDocument();
  });

  it("9. estado vazio de 'O que você recebe' aparece pra empresas sem deliverables cadastrados", () => {
    accountConfig.accountType = "empresas";
    renderView({
      product: productFixture({
        presentation: { highlights: [], whatIsIncluded: [], deliverables: [] },
      }),
    });
    expect(screen.getByText(/entregas não especificadas/i)).toBeInTheDocument();
  });

  it("10. descrição completa (sem presentation estruturada) pode ser expandida e recolhida", async () => {
    const user = userEvent.setup();
    renderView({ product: productFixture({ presentation: null, description: LONG_DESCRIPTION }) });
    const toggle = screen.getByRole("button", { name: /ver descrição completa/i });
    await user.click(toggle);
    expect(screen.getByRole("button", { name: /mostrar menos/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /mostrar menos/i }));
    expect(screen.getByRole("button", { name: /ver descrição completa/i })).toBeInTheDocument();
  });

  it("11. portfólio real é renderizado quando existem imagens (demonstrations)", async () => {
    const user = userEvent.setup();
    renderView({
      product: productFixture({ demonstrations: ["/images/alk-des-002-01.svg", "/images/alk-des-002-02.svg"] }),
    });
    await user.click(screen.getByRole("tab", { name: /portfólio/i }));
    const images = screen.getAllByRole("img");
    expect(images.length).toBeGreaterThan(0);
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
  });

  it("12. profissionais (nômades) reais são renderizados quando existem, dentro da aba", async () => {
    accountConfig.accountType = "admin";
    const user = userEvent.setup();
    renderView({ product: productFixture({ id: "prod-com-nomades" }) });
    await user.click(screen.getByRole("tab", { name: /nômades/i }));
    expect(screen.getByText(/nômades do produto prod-com-nomades/i)).toBeInTheDocument();
  });

  it("15. navegar entre abas nunca chama onContratar", async () => {
    accountConfig.accountType = "admin";
    const user = userEvent.setup();
    const { onContratar } = renderView({ product: productFixture({ demonstrations: ["/images/a.png"] }) });
    await user.click(screen.getByRole("tab", { name: /portfólio/i }));
    await user.click(screen.getByRole("tab", { name: /nômades/i }));
    await user.click(screen.getByRole("tab", { name: /detalhes/i }));
    expect(onContratar).not.toHaveBeenCalled();
  });

  it("produtos complementares com opções navegam via onViewComplementaryProduct, sem adicionar nada sozinhos", async () => {
    const user = userEvent.setup();
    productsConfig.products = [
      { id: "comp-1", name: "Produto Complementar", category: "Design", finalPrice: 50, variations: [{ id: "cv1", isActive: true, price: 50 }] },
    ];
    const onViewComplementaryProduct = vi.fn();
    const { onContratar } = renderView({
      product: productFixture({ complementaryProductIds: ["comp-1"] }),
      onViewComplementaryProduct,
    });
    await user.click(screen.getByRole("button", { name: /ver opções/i }));
    expect(onViewComplementaryProduct).toHaveBeenCalledWith("comp-1");
    expect(onContratar).not.toHaveBeenCalled();
  });

  it("produto complementar sem opções soma via onAddComplementaryProduct (ação própria, distinta do produto principal)", async () => {
    const user = userEvent.setup();
    productsConfig.products = [
      { id: "comp-2", name: "Produto Complementar Simples", category: "Design", finalPrice: 30, variations: [] },
    ];
    const onAddComplementaryProduct = vi.fn();
    const { onContratar } = renderView({
      product: productFixture({ complementaryProductIds: ["comp-2"] }),
      onAddComplementaryProduct,
    });
    await user.click(screen.getByRole("button", { name: /^adicionar$/i }));
    expect(onAddComplementaryProduct).toHaveBeenCalledTimes(1);
    expect(onAddComplementaryProduct).toHaveBeenCalledWith(expect.objectContaining({ id: "comp-2" }));
    expect(onContratar).not.toHaveBeenCalled();
  });

  it("13. opções mostram nome, preço e prazo com clareza", () => {
    renderView({
      product: productFixture({
        variations: [{ id: "v1", name: "Plano Básico", price: 123.45, deadlineDays: 5, isActive: true }],
      }),
    });
    expect(screen.getByText("Plano Básico")).toBeInTheDocument();
    expect(screen.getAllByText(/123,45/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/5 dias/).length).toBeGreaterThan(0);
  });
});
