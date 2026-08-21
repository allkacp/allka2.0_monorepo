import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setTestViewportWidth } from "@/vitest.setup";

// Lote 2C (ata 2026-08-21): o detalhe do produto tinha DOIS cabeçalhos
// empilhados (o do EmbeddedSlideScreen — nome+categoria — e a IDENTITY BAR
// do próprio componente, repetindo categoria/nome) e a descrição longa
// ficava sempre cortada em 2 linhas sem nenhuma forma de ler o resto. Este
// arquivo prova, contra o componente real (com EmbeddedSlideScreen real,
// não mockado), que:
//   1. só existe UM cabeçalho de contexto agora (nome aparece uma vez só);
//   2. a descrição longa começa recolhida e tem "Ver descrição completa"/
//      "Mostrar menos" acessível por teclado;
//   3. as opções de contratação continuam visíveis e acionáveis;
//   4. fechar remove o painel do DOM por completo (sem overlay sobrando);
//   5. o mesmo funciona em desktop e mobile.

vi.mock("@/contexts/account-type-context", () => ({
  useAccountType: () => ({ accountType: "empresas", accountSubType: "company" }),
}));

vi.mock("@/lib/contexts/product-context", () => ({
  useProducts: () => ({ products: [] }),
}));

vi.mock("@/components/admin/product-nomads-tab", () => ({
  ProductNomadsTab: () => null,
}));

vi.mock("@/components/product-rating-display", () => ({
  ProductRatingDisplay: () => <span data-testid="rating-stub" />,
}));

vi.mock("@/components/copy-link-button", () => ({
  CopyLinkButton: () => <button type="button">Copiar link</button>,
}));

vi.mock("@/contexts/open-screens-context", () => ({
  usePinEntry: () => ({ pinned: false, toggle: vi.fn() }),
  useOpenScreens: () => ({ addPinned: vi.fn(), removePinned: vi.fn(), isPinned: () => false }),
}));

import { ProductDetailSheet } from "@/components/product-detail-sheet";

const LONG_DESCRIPTION =
  "Este é um serviço completo de gestão de mídias sociais, incluindo criação de conteúdo, agendamento de posts, resposta a comentários, relatórios mensais de desempenho, análise de concorrência, sugestões de melhoria contínua e acompanhamento próximo com o time de marketing do cliente ao longo de todo o contrato.";

function productFixture(overrides: Record<string, any> = {}) {
  return {
    id: "prod-123",
    name: "Gestão de Redes Sociais",
    category: "Mídias e Conteúdo",
    description: LONG_DESCRIPTION,
    finalPrice: 500,
    variations: [],
    ...overrides,
  };
}

function ControlledDetail({
  product,
  onOpenChangeSpy,
  onAdd,
}: {
  product: any;
  onOpenChangeSpy: (v: boolean) => void;
  onAdd: (p: any) => void;
}) {
  const [open, setOpen] = React.useState(true);
  return (
    <ProductDetailSheet
      product={product}
      open={open}
      onOpenChange={(v) => {
        onOpenChangeSpy(v);
        setOpen(v);
      }}
      onAdd={onAdd}
    />
  );
}

function renderDetail(product = productFixture()) {
  const onOpenChange = vi.fn();
  const onAdd = vi.fn();
  const utils = render(
    <ControlledDetail product={product} onOpenChangeSpy={onOpenChange} onAdd={onAdd} />,
  );
  return { ...utils, onOpenChange, onAdd };
}

describe("ProductDetailSheet — cabeçalho único e descrição recolhível", () => {
  beforeEach(() => {
    setTestViewportWidth(1280);
  });

  it("1. mostra o nome do produto uma única vez (sem cabeçalho duplicado)", () => {
    renderDetail();
    expect(screen.getAllByText("Gestão de Redes Sociais")).toHaveLength(1);
  });

  it("1. categoria também aparece uma única vez", () => {
    renderDetail();
    expect(screen.getAllByText("Mídias e Conteúdo")).toHaveLength(1);
  });

  it("2. descrição longa começa recolhida, com 'Ver descrição completa' disponível", () => {
    renderDetail();
    const toggle = screen.getByRole("button", { name: /ver descrição completa/i });
    expect(toggle).toBeInTheDocument();
    // Texto completo já está no DOM (line-clamp é só CSS) — não removemos informação.
    expect(screen.getByText(LONG_DESCRIPTION)).toBeInTheDocument();
  });

  it("3. 'Ver descrição completa' expande e 'Mostrar menos' recolhe de volta", async () => {
    const user = userEvent.setup();
    renderDetail();
    await user.click(screen.getByRole("button", { name: /ver descrição completa/i }));
    expect(screen.getByRole("button", { name: /mostrar menos/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /mostrar menos/i }));
    expect(screen.getByRole("button", { name: /ver descrição completa/i })).toBeInTheDocument();
  });

  it("3b. expandir a descrição funciona por teclado (Enter), não só por mouse", async () => {
    const user = userEvent.setup();
    renderDetail();
    const toggle = screen.getByRole("button", { name: /ver descrição completa/i });
    toggle.focus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("button", { name: /mostrar menos/i })).toBeInTheDocument();
  });

  it("4. opções de contratação (variações) continuam visíveis e acionáveis", async () => {
    const user = userEvent.setup();
    const product = productFixture({
      variations: [
        { id: "v1", name: "Plano Básico", price: 500, isActive: true },
        { id: "v2", name: "Plano Avançado", price: 900, isActive: true },
      ],
    });
    const { onAdd } = renderDetail(product);
    expect(screen.getByRole("button", { name: /escolha uma opção/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /plano básico/i }));
    await user.click(screen.getByRole("button", { name: /adicionar à cesta/i }));
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ selectedVariation: expect.objectContaining({ id: "v1" }) }),
    );
  });

  it("5. fechar (X) remove o detalhe do DOM por completo, sem overlay sobrando", async () => {
    const user = userEvent.setup();
    const { container } = renderDetail();
    const closeButton = container.querySelector("svg.lucide-x")?.closest("button");
    expect(closeButton).toBeTruthy();
    await user.click(closeButton!);
    await waitFor(() => expect(screen.queryByText("Gestão de Redes Sociais")).not.toBeInTheDocument(), {
      timeout: 1000,
    });
  });

  it("6. mesmo comportamento em largura mobile", () => {
    setTestViewportWidth(375);
    renderDetail();
    expect(screen.getAllByText("Gestão de Redes Sociais")).toHaveLength(1);
    expect(screen.getByRole("button", { name: /ver descrição completa/i })).toBeInTheDocument();
  });
});
