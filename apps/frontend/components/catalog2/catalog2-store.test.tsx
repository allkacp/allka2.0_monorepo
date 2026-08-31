import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Catalog2Store } from "@/components/catalog2/catalog2-store";

// Loja do novo catálogo do cliente (sprint de produtos, bloco 5/6).

const { api } = vi.hoisted(() => ({
  api: {
    getClientCatalog2Refs: vi.fn(),
    getClientCatalog2Products: vi.fn(),
    getClientCatalog2Product: vi.fn(),
    configureClientCatalog2: vi.fn(),
    createClientCatalog2Quote: vi.fn(),
    getClientCatalog2Cart: vi.fn(),
    addClientCatalog2CartItem: vi.fn(),
    removeClientCatalog2CartItem: vi.fn(),
    clearClientCatalog2Cart: vi.fn(),
  },
}));
vi.mock("@/lib/api-client", () => ({ apiClient: api }));

const REFS = { pillars: [{ id: "p1", key: "x", name: "Pilar A" }], categories: [{ id: "c1", key: "y", name: "Cat A" }], four_f: [{ id: "f1", key: "z", name: "F1" }] };
const LIST = {
  data: [{
    id: "prod1", slug: "servico-demo", name: "Serviço Demo", short_description: "resumo curto",
    pillar: { name: "Pilar A" }, category: { name: "Cat A" }, four_f: [{ key: "z", name: "F1" }],
    is_new: true, starting_price: 300, commercial_deadline_days: 5, currency: "BRL", has_variations: true, has_addons: true,
  }],
  total: 1, page: 1, page_size: 12,
};
const DETAIL = {
  id: "prod1", slug: "servico-demo", name: "Serviço Demo", description: "descrição do serviço demo",
  pillar: { key: "x", name: "Pilar A" }, category: { key: "y", name: "Cat A" }, four_f: [{ key: "z", name: "F1" }],
  version_id: "v1", version_state: "publicada", is_preview: false, preview_notice: null, pendencies: [], visibility_reasons: [],
  variations: [
    { key: "formato", name: "Formato", is_required: true, selection_type: "single", notes: null, options: [{ key: "estatico", label: "Estático", is_default: true }, { key: "carrossel", label: "Carrossel", is_default: false }] },
    { key: "uso_ia", name: "Uso de IA na produção", is_required: true, selection_type: "single", notes: "Escolha obrigatória.", options: [{ key: "autorizado", label: "Autorizado", is_default: true }, { key: "nao_autorizado", label: "Não autorizado", is_default: false }] },
  ],
  addons: [{ key: "extra", name: "Legendas extra", description: "3 variações", is_default_selected: false }],
  required_info: [],
  default_selection: { variation_option_keys: ["estatico", "autorizado"], addon_keys: [], quantity: 1, answers: {} },
  pricing: { currency: "BRL", quantity: 1, commercial_price: 300, commercial_deadline_days: 5, commercial_deadline_pending: false, commercial_ready: true, notices: [], applied_options: [] },
  can_configure: true, can_contract: true,
};
const CONFIG = {
  product_id: "prod1", slug: "servico-demo", version_id: "v1", is_preview: false,
  selection: { variation_option_keys: ["estatico", "autorizado"], addon_keys: [], quantity: 1, answers: {} },
  selection_errors: [], config_checksum: "abc", deliverables: [],
  pricing: DETAIL.pricing, can_generate_quote: true, quote_blockers: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  api.getClientCatalog2Refs.mockResolvedValue(REFS);
  api.getClientCatalog2Products.mockResolvedValue(LIST);
  api.getClientCatalog2Product.mockResolvedValue(DETAIL);
  api.configureClientCatalog2.mockResolvedValue(CONFIG);
  api.getClientCatalog2Cart.mockResolvedValue({ items: [], count: 0, needs_revalidation: false });
  api.addClientCatalog2CartItem.mockResolvedValue({ created: true, item_id: "i1", already_in_cart: false });
  api.createClientCatalog2Quote.mockResolvedValue({ id: "q1", status: "valida", commercial_price: 300, commercial_deadline_days: 5, currency: "BRL", valid_until: new Date(Date.now() + 86400000).toISOString() });
});

function renderStore(initialEntry = "/company/catalog2") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Catalog2Store portal="company" />
    </MemoryRouter>,
  );
}

describe("Catálogo do cliente", () => {
  it("lista produtos disponíveis com preço inicial e prazo", async () => {
    renderStore();
    expect(await screen.findByText("Serviço Demo")).toBeInTheDocument();
    expect(screen.getByText(/a partir de BRL 300\.00/)).toBeInTheDocument();
    expect(screen.getByText(/5 dia\(s\)/)).toBeInTheDocument();
  });

  it("filtro por pilar vai para a URL/backend e há botão de limpar", async () => {
    renderStore();
    await screen.findByText("Serviço Demo");
    await userEvent.selectOptions(screen.getByDisplayValue("Todos os pilares"), "p1");
    await waitFor(() => expect(api.getClientCatalog2Products).toHaveBeenCalledWith(expect.objectContaining({ pillar_id: "p1" })));
    expect(screen.getByRole("button", { name: /Limpar filtros/i })).toBeInTheDocument();
  });

  it("abrir o produto NÃO adiciona à cesta; configurador recalcula no backend", async () => {
    const user = userEvent.setup();
    renderStore();
    await user.click(await screen.findByText("Serviço Demo"));
    expect(await screen.findByRole("heading", { name: "Serviço Demo" })).toBeInTheDocument();
    await waitFor(() => expect(api.configureClientCatalog2).toHaveBeenCalled());
    expect(api.addClientCatalog2CartItem).not.toHaveBeenCalled();
    // preço vem do backend
    expect(screen.getByText("Preço comercial")).toBeInTheDocument();
    expect(screen.getAllByText(/BRL 300\.00/).length).toBeGreaterThan(0);
  });

  it("adiciona à cesta e mostra 'Já está na cesta' na repetição", async () => {
    const user = userEvent.setup();
    renderStore();
    await user.click(await screen.findByText("Serviço Demo"));
    const addBtn = await screen.findByRole("button", { name: /Adicionar à cesta/i });
    await user.click(addBtn);
    await waitFor(() => expect(api.addClientCatalog2CartItem).toHaveBeenCalledWith("servico-demo", expect.any(Object)));
    expect(await screen.findByText(/Adicionado à cesta/i)).toBeInTheDocument();

    api.addClientCatalog2CartItem.mockResolvedValueOnce({ created: false, item_id: "i1", already_in_cart: true });
    await new Promise((r) => setTimeout(r, 650)); // solta o anti-duplo-clique
    await user.click(screen.getByRole("button", { name: /Adicionar à cesta/i }));
    expect(await screen.findByText(/Já está na cesta/i)).toBeInTheDocument();
  });

  it("gera pré-cotação pelo backend", async () => {
    const user = userEvent.setup();
    renderStore();
    await user.click(await screen.findByText("Serviço Demo"));
    await user.click(await screen.findByRole("button", { name: /Gerar pré-cotação/i }));
    await waitFor(() => expect(api.createClientCatalog2Quote).toHaveBeenCalled());
    expect(await screen.findByText(/Pré-cotação valida gerada/i)).toBeInTheDocument();
  });

  it("preview como cliente aparece só no portal admin com ?preview=1", async () => {
    render(
      <MemoryRouter initialEntries={["/admin/catalog2?preview=1"]}>
        <Catalog2Store portal="admin" />
      </MemoryRouter>,
    );
    expect(await screen.findByText(/Pré-visualização como cliente/i)).toBeInTheDocument();
  });
});
