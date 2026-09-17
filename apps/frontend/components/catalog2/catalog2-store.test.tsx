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
    await waitFor(() => expect(api.addClientCatalog2CartItem).toHaveBeenCalledWith("servico-demo", expect.any(Object), null));
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

  // Reparo 2026-09 seguinte ("recuperação completa dos layouts"): o preview
  // não mostrava os 36 reais na GRADE (só no detalhe de um produto já
  // aberto) — a listagem nunca pedia preview=1. Corrigido.
  it("preview: a LISTAGEM pede preview=1 ao backend e mostra produtos incompletos com selo 'Em preparação'", async () => {
    api.getClientCatalog2Products.mockResolvedValue({
      data: [
        { ...LIST.data[0] },
        {
          id: "prod2", slug: "produto-incompleto", name: "Produto Incompleto", short_description: null,
          pillar: null, category: null, four_f: [], is_new: false, starting_price: null, commercial_deadline_days: null,
          currency: "BRL", has_variations: false, has_addons: false,
          is_preview: true, status: "em_preparacao", pendencies: ["price_pending", "deadline_pending"],
        },
      ],
      total: 2, page: 1, page_size: 12,
    });
    render(
      <MemoryRouter initialEntries={["/admin/catalog2?preview=1"]}>
        <Catalog2Store portal="admin" />
      </MemoryRouter>,
    );
    await waitFor(() => expect(api.getClientCatalog2Products).toHaveBeenCalledWith(expect.objectContaining({ preview: "1" })));
    expect(await screen.findByText("Produto Incompleto")).toBeInTheDocument();
    expect(screen.getByText("Em preparação")).toBeInTheDocument();
    expect(screen.getByText(/Falta: price_pending, deadline_pending/)).toBeInTheDocument();
    // preço nunca inventado — "A definir" quando ausente (helper money())
    expect(screen.getByText(/a partir de A definir/)).toBeInTheDocument();
  });

  // Item 16.2 (reunião 2026-09-14, "Checkout demonstrativo") — corrigido:
  // antes o portal "company"/"agency" NUNCA repassava preview=1 ao backend,
  // mesmo já existindo (Item 16.1) uma conta comercial autorizada via
  // CATALOG2_DEMO_PREVIEW_EMAILS que o backend aceitaria — a autorização de
  // verdade é sempre do backend (can_preview_drafts), então o frontend
  // repassar o parâmetro não abre nada; quem não estiver na allowlist
  // recebe 404 do próprio backend (coberto pelo teste de integração
  // "25. admin comum não pré-visualiza rascunho..." e por evidência real de
  // navegador desta etapa).
  it("cliente comum (company/agency) REPASSA preview=1 ao backend — a autorização real é sempre do backend, nunca do frontend", async () => {
    api.getClientCatalog2Products.mockResolvedValue({ data: [{ ...LIST.data[0] }], total: 1, page: 1, page_size: 12 });
    render(
      <MemoryRouter initialEntries={["/company/catalog2?preview=1"]}>
        <Catalog2Store portal="company" />
      </MemoryRouter>,
    );
    await waitFor(() => expect(api.getClientCatalog2Products).toHaveBeenCalledWith(expect.objectContaining({ preview: "1" })));
  });

  // Item 2 (reunião 2026-09-14, "Status e disponibilidade dos produtos"):
  // pré-lançamento/pausado/esgotado aparecem no catálogo REAL (fora do
  // preview admin) com etiqueta própria — diferente de "em_preparacao", que
  // nunca chega até aqui (o backend já filtra fora da listagem do cliente).
  it("produto pausado (fora do preview) aparece na listagem com etiqueta de status e motivo de indisponibilidade", async () => {
    api.getClientCatalog2Products.mockResolvedValue({
      data: [{
        ...LIST.data[0],
        status: "temporariamente_inativo",
        status_label: "Pausado",
        contractable: false,
        unavailable_reason: "oferta pausada temporariamente",
      }],
      total: 1, page: 1, page_size: 12,
    });
    renderStore();
    expect(await screen.findByText("Serviço Demo")).toBeInTheDocument();
    expect(screen.getByText("Pausado")).toBeInTheDocument();
    expect(screen.getByText(/Oferta pausada temporariamente\./)).toBeInTheDocument();
  });

  it("produto em pré-lançamento no detalhe: mostra etiqueta e motivo, e desabilita 'Adicionar à cesta'", async () => {
    const user = userEvent.setup();
    api.getClientCatalog2Product.mockResolvedValue({
      ...DETAIL,
      status: "pre_lancamento",
      status_label: "Pré-lançamento",
      contract_blocked_reason: "produto em pré-lançamento — contratação ainda não liberada",
      can_contract: false,
    });
    api.configureClientCatalog2.mockResolvedValue({ ...CONFIG, can_generate_quote: false, quote_blockers: ["produto em pré-lançamento — contratação ainda não liberada"] });
    renderStore();
    await user.click(await screen.findByText("Serviço Demo"));
    expect(await screen.findByRole("heading", { name: "Serviço Demo" })).toBeInTheDocument();
    expect(screen.getByText("Pré-lançamento")).toBeInTheDocument();
    expect(screen.getByText(/Contratação bloqueada: produto em pré-lançamento/)).toBeInTheDocument();
    const addBtn = await screen.findByRole("button", { name: /Adicionar à cesta/i });
    expect(addBtn).toBeDisabled();
    const quoteBtn = screen.getByRole("button", { name: /Gerar pré-cotação/i });
    expect(quoteBtn).toBeDisabled();
  });
});
