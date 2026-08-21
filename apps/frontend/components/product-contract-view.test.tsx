import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setTestViewportWidth } from "@/vitest.setup";
import { ProductContractView } from "@/components/product-contract-view";

// Lote 2D (ata 2026-08-21): a garantia mais importante deste lote — abrir o
// produto, selecionar uma opção, trocar de opção, abrir "Ver informações"
// ou voltar NUNCA podem chamar onContratar (que é o único caminho até
// basket.addItem). Só o clique explícito em "Contratar" pode.

function productFixture(overrides: Record<string, any> = {}): any {
  return {
    id: "prod-1",
    name: "Alteração de Materiais Diversos",
    category: "Design e Criação",
    finalPrice: 90.72,
    deliveryDays: 2,
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
  });

  it("4. cabeçalho é o nome do produto, categoria aparece como informação secundária", () => {
    renderView();
    expect(screen.getByRole("heading", { name: "Alteração de Materiais Diversos" })).toBeInTheDocument();
    expect(screen.getByText("Design e Criação")).toBeInTheDocument();
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

  it("16. 'Ver informações' abre e mostra descrição/destaques, sem chamar onContratar", async () => {
    const user = userEvent.setup();
    const { onContratar } = renderView();
    expect(screen.queryByText("Destaque 1")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /ver informações/i }));
    expect(screen.getByText("Destaque 1")).toBeInTheDocument();
    expect(screen.getByText("Item incluído 1")).toBeInTheDocument();
    expect(onContratar).not.toHaveBeenCalled();
  });

  it("16. 'Ver informações' fecha de novo ao clicar outra vez, por teclado também", async () => {
    const user = userEvent.setup();
    renderView();
    const toggle = screen.getByRole("button", { name: /ver informações/i });
    toggle.focus();
    await user.keyboard("{Enter}");
    expect(screen.getByText("Destaque 1")).toBeInTheDocument();
    await user.keyboard("{Enter}");
    expect(screen.queryByText("Destaque 1")).not.toBeInTheDocument();
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
});
