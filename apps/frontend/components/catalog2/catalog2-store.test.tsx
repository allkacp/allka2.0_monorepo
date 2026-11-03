import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
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

// Endereço real do catálogo da empresa (PORTAL_BASE_PATH) com a rota do produto:
// o detalhe só abre quando /:produtoId existe — o caminho antigo "/company/catalog2"
// sem rota fazia o produto nunca abrir no teste.
function renderStore(initialEntry = "/company/catalogo-produtos", portal: "company" | "admin" = "company") {
  const base = portal === "admin" ? "/admin/catalog2" : "/company/catalogo-produtos";
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path={base} element={<Catalog2Store portal={portal} />} />
        <Route path={`${base}/:produtoId`} element={<Catalog2Store portal={portal} />} />
      </Routes>
    </MemoryRouter>,
  );
}

async function openDemo(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByText("Serviço Demo"));
  expect(await screen.findByRole("heading", { level: 1, name: "Serviço Demo" })).toBeInTheDocument();
}
// O detalhe chama configure(slug, seleção, preview, período, versão-prévia).
const configuredWith = (selection: Record<string, unknown>) => ["servico-demo", expect.objectContaining(selection), false, null, undefined];

describe("Catálogo do cliente", () => {
  it("lista produtos disponíveis com preço inicial e prazo", async () => {
    renderStore();
    expect(await screen.findByText("Serviço Demo")).toBeInTheDocument();
    // Preço do produto na vitrine: em reais ("R$ 300,00"); o valor em Allkoins aparece ao passar o mouse.
    expect(screen.getAllByText(/R\$\s300,00/).length).toBeGreaterThan(0);
    expect(screen.getByText(/5 dia\(s\)/)).toBeInTheDocument();
  });

  // A tela trocou o seletor "Todos os pilares" por abas de categoria (filtro na própria lista);
  // o pilar continua indo ao backend quando vem no endereço (?pilar=).
  it("filtros: pilar do endereço vai ao backend; abas de categoria filtram a lista e 'Todos' volta tudo", async () => {
    const user = userEvent.setup();
    api.getClientCatalog2Products.mockResolvedValue({
      data: [{ ...LIST.data[0] }, { ...LIST.data[0], id: "prod3", slug: "outro-servico", name: "Outro Serviço", category: { name: "Cat B" } }],
      total: 2, page: 1, page_size: 12,
    });
    renderStore("/company/catalogo-produtos?pilar=p1");
    expect(await screen.findByText("Serviço Demo")).toBeInTheDocument();
    expect(api.getClientCatalog2Products).toHaveBeenCalledWith(expect.objectContaining({ pillar_id: "p1" }));
    await user.click(screen.getByRole("button", { name: /^Cat B/ }));
    expect(screen.queryByText("Serviço Demo")).not.toBeInTheDocument();
    expect(screen.getByText("Outro Serviço")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^Todos/ }));
    expect(screen.getByText("Serviço Demo")).toBeInTheDocument();
    expect(screen.getByText("Outro Serviço")).toBeInTheDocument();
  });

  it("abrir o produto NÃO adiciona à cesta; configurador recalcula no backend", async () => {
    const user = userEvent.setup();
    renderStore();
    await openDemo(user);
    await waitFor(() => expect(api.configureClientCatalog2).toHaveBeenCalled());
    expect(api.addClientCatalog2CartItem).not.toHaveBeenCalled();
    // preço vem do backend
    expect(screen.getByText("Prazo · Preço comercial")).toBeInTheDocument();
    expect(screen.getAllByText(/R\$\s300,00/).length).toBeGreaterThan(0);
  });

  // Configuração num painel único ("Configure sua contratação"), no lugar das etapas 1/2/3 clicáveis.
  it("painel de configuração recalcula no backend ao alterar opção ou quantidade", async () => {
    const user = userEvent.setup();
    renderStore();
    await openDemo(user);
    expect(screen.getByRole("heading", { name: "Configure sua contratação" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Adicionar à cesta/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Carrossel/ }));
    await waitFor(() => expect(api.configureClientCatalog2).toHaveBeenLastCalledWith(
      ...configuredWith({ variation_option_keys: expect.arrayContaining(["carrossel", "autorizado"]) }),
    ));
    expect(api.configureClientCatalog2.mock.calls.at(-1)![1].variation_option_keys).not.toContain("estatico");

    const quantity = screen.getByRole("spinbutton", { name: "Quantidade do produto" });
    await user.clear(quantity);
    await user.type(quantity, "3");
    await waitFor(() => expect(api.configureClientCatalog2).toHaveBeenLastCalledWith(...configuredWith({ quantity: 3 })));
  });

  it("guarda a distribuição: uma tarefa com todas as unidades gera um lote; tarefas separadas permitem 1 + 1 + 3", async () => {
    const user = userEvent.setup();
    renderStore();
    await openDemo(user);
    const quantity = screen.getByRole("spinbutton", { name: "Quantidade do produto" });
    await user.clear(quantity);
    await user.type(quantity, "5");
    await waitFor(() => expect(api.configureClientCatalog2).toHaveBeenLastCalledWith(...configuredWith({ quantity: 5, delivery_groups: [5] })));

    await user.click(screen.getByRole("button", { name: "Tarefas separadas" }));
    await user.click(screen.getByRole("button", { name: "Adicionar tarefa" }));
    const groups = screen.getAllByRole("spinbutton", { name: /Unidades da tarefa/i });
    expect(groups).toHaveLength(3);
    await user.clear(groups[1]);
    await user.type(groups[1], "1");
    await user.clear(groups[2]);
    await user.type(groups[2], "3");
    await waitFor(() => expect(api.configureClientCatalog2).toHaveBeenLastCalledWith(...configuredWith({ quantity: 5, delivery_groups: [1, 1, 3] })));
    // o texto "Total distribuído" saiu da tela no redesenho; a soma enviada ao servidor continua igual à quantidade
    const last = api.configureClientCatalog2.mock.calls.at(-1)![1];
    expect(last.delivery_groups.reduce((a: number, b: number) => a + b, 0)).toBe(last.quantity);
  });

  it("adiciona à cesta e mostra 'Já está na cesta' na repetição", async () => {
    const user = userEvent.setup();
    renderStore();
    await openDemo(user);
    const addBtn = await screen.findByRole("button", { name: /Adicionar à cesta/i });
    await waitFor(() => expect(addBtn).toBeEnabled());
    await user.click(addBtn);
    await waitFor(() => expect(api.addClientCatalog2CartItem).toHaveBeenCalledWith("servico-demo", expect.any(Object), null));
    expect(await screen.findByText(/Adicionado à cesta/i)).toBeInTheDocument();

    api.addClientCatalog2CartItem.mockResolvedValueOnce({ created: false, item_id: "i1", already_in_cart: true });
    await new Promise((r) => setTimeout(r, 650)); // solta o anti-duplo-clique
    await user.click(screen.getByRole("button", { name: /Adicionar à cesta/i }));
    expect(await screen.findByText(/Já está na cesta/i)).toBeInTheDocument();
    expect(api.addClientCatalog2CartItem).toHaveBeenCalledTimes(2);
  });

  it("gera pré-cotação pelo backend", async () => {
    const user = userEvent.setup();
    renderStore();
    await openDemo(user);
    const quoteBtn = await screen.findByRole("button", { name: /Gerar pré-cotação/i });
    await waitFor(() => expect(quoteBtn).toBeEnabled());
    await user.click(quoteBtn);
    await waitFor(() => expect(api.createClientCatalog2Quote).toHaveBeenCalled());
    expect(await screen.findByText(/Pré-cotação valida gerada/i)).toBeInTheDocument();
    expect(api.addClientCatalog2CartItem).not.toHaveBeenCalled();
  });

  it("preview como cliente aparece só no portal admin com ?preview=1", async () => {
    renderStore("/admin/catalog2?preview=1", "admin");
    expect(await screen.findByText(/Pré-visualização como cliente/i)).toBeInTheDocument();
  });

  // Reparo 2026-09 seguinte ("recuperação completa dos layouts"): o preview
  // não mostrava os 36 reais na GRADE (só no detalhe de um produto já
  // aberto) — a listagem nunca pedia preview=1. Corrigido.
  it("preview: a LISTAGEM pede preview=1 ao backend e mostra produtos incompletos com selo 'Em preparação' e o que falta", async () => {
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
    renderStore("/admin/catalog2?preview=1", "admin");
    await waitFor(() => expect(api.getClientCatalog2Products).toHaveBeenCalledWith(expect.objectContaining({ preview: "1" })));
    expect(await screen.findByText("Produto Incompleto")).toBeInTheDocument();
    const row = screen.getByRole("button", { name: "Produto Incompleto — ver detalhes" });
    expect(within(row).getByText("Em preparação")).toBeInTheDocument();
    expect(within(row).getByText("Falta: price_pending, deadline_pending")).toBeInTheDocument();
    // preço e prazo nunca inventados: sem valor, a linha mostra "—" (nada de R$)
    expect(within(row).queryByText(/R\$/)).not.toBeInTheDocument();
    expect(within(row).getAllByText("—").length).toBeGreaterThanOrEqual(2);
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
    renderStore("/company/catalogo-produtos?preview=1");
    await waitFor(() => expect(api.getClientCatalog2Products).toHaveBeenCalledWith(expect.objectContaining({ preview: "1" })));
  });

  // Item 2 (reunião 2026-09-14, "Status e disponibilidade dos produtos"):
  // pré-lançamento/pausado/esgotado aparecem no catálogo REAL (fora do
  // preview admin) com etiqueta própria — diferente de "em_preparacao", que
  // nunca chega até aqui (o backend já filtra fora da listagem do cliente).
  // 01/11: na visão em lista (padrão) a etiqueta "Novo" escondia "Pausado" e o motivo não aparecia — corrigido.
  it("produto pausado (fora do preview) aparece na listagem com etiqueta de status e motivo de indisponibilidade, mesmo sendo novo", async () => {
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
    const row = screen.getByRole("button", { name: "Serviço Demo — ver detalhes" });
    expect(within(row).getByText("Pausado")).toBeInTheDocument();
    expect(within(row).getByText("Oferta pausada temporariamente")).toBeInTheDocument();
    expect(within(row).queryByText("Novo")).not.toBeInTheDocument();
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
    await openDemo(user);
    expect(screen.getByText("Pré-lançamento")).toBeInTheDocument();
    expect(screen.queryByText("Em preparação")).not.toBeInTheDocument();
    expect(screen.getByText(/Contratação bloqueada: produto em pré-lançamento/)).toBeInTheDocument();
    const addBtn = await screen.findByRole("button", { name: /Adicionar à cesta/i });
    expect(addBtn).toBeDisabled();
    const quoteBtn = screen.getByRole("button", { name: /Gerar pré-cotação/i });
    expect(quoteBtn).toBeDisabled();
  });
});
