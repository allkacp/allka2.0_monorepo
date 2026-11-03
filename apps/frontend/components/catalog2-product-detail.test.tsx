import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Catalog2ProductDetail } from "./catalog2-product-detail";

// Reparo 2026-09 ("restaurar o detalhe completo do produto, preços e
// imagens"): este detalhe reproduz a estrutura do componente publicado
// (cabeçalho, abas Detalhes/Portfólio/Nômades, opções com preço/prazo,
// contratação sempre bloqueada aqui) usando dados catalog2 reais +
// provisórios, sempre marcados e nunca contratáveis.

const { api } = vi.hoisted(() => ({
  api: { getCatalog2ProductDetailPreview: vi.fn(), getCatalog2ProductPricingMemory: vi.fn(), simulateCatalog2: vi.fn() },
}));
vi.mock("@/lib/api-client", () => ({ apiClient: api }));

const REAL_DETAIL = {
  product: {
    id: "p1", slug: "site-institucional", internal_name: "Criação de Site Institucional", status: "em_preparacao",
    category: { name: "Presença Digital" }, published_version_id: null,
    versions: [{
      id: "v1", state: "rascunho", summary: "Resumo real do produto.", full_description: "Descrição completa real do produto.",
      variations: [{ id: "var1", name: "Formato", options: [
        { id: "opt1", key: "padrao", label: "Padrão", is_default: true },
        { id: "opt2", key: "premium", label: "Premium", is_default: false },
      ] }],
      addons: [{ id: "addon1", key: "urgencia", name: "Entrega urgente", description: "Prioridade na fila.", base_cost: 200, is_active: true, is_default_selected: false }],
      tasks: [{ id: "t1", name: "Diagnóstico", description: "Levantamento inicial.", specialty: { name: "UX Writer" } }],
    }],
  },
  readiness: {
    task_count: 1, step_count: 2, price_amount: 750, deadline_days: 9,
    provisional: null,
  },
};

const PROVISIONAL_DETAIL = {
  product: {
    id: "p2", slug: "landing-page", internal_name: "Landing Page de Alta Conversão", status: "em_preparacao",
    category: { name: "Marketing" }, published_version_id: null,
    versions: [{ id: "v2", state: "rascunho", summary: null, full_description: null, variations: [], tasks: [] }],
  },
  readiness: {
    task_count: 0, step_count: 0, price_amount: null, deadline_days: null,
    // sinal do servidor (computeProductReadiness) para produto com dados provisórios
    ready_for_client: false, blockers: ["price_pending", "deadline_pending"],
    provisional: {
      is_provisional: true, needs_review: true,
      image_path: "/images/products/alk-web-004.svg", image_source_note: "teste",
      price_amount: 3050, deadline_days: 4, modality: "Recorrente mensal", contract_note: "Renovação mensal — provisória.",
      highlights: ["Equipe especializada dedicada ao escopo", "Prazo de entrega comprometido"],
      included_items: [{ title: "Diagnóstico inicial", description: "..." }],
      options: [{ name: "Essencial", price: 3050, deadline_days: 4, modality: "Recorrente mensal", features: ["Revisão incluída"] }],
      portfolio_refs: ["/images/products/alk-web-004-portfolio-01.svg"],
    },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  api.simulateCatalog2.mockResolvedValue({ pricing_simulation: null, pricing: null });
});

describe("Catalog2ProductDetail — dado real", () => {
  it("mostra nome, categoria, código, preço/prazo reais (sem selo provisório) e opções reais", async () => {
    api.getCatalog2ProductDetailPreview.mockResolvedValue(REAL_DETAIL);
    render(<Catalog2ProductDetail productId="p1" onBack={() => {}} />);
    // o nome aparece no caminho de navegação e no título; o título (h1) é o que identifica o produto
    expect(await screen.findByRole("heading", { level: 1, name: "Criação de Site Institucional" })).toBeInTheDocument();
    expect(screen.getByText("Presença Digital")).toBeInTheDocument();
    expect(screen.getByText("site-institucional")).toBeInTheDocument();
    expect(screen.getAllByText(/R\$\s*750/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/9 dias/).length).toBeGreaterThan(0);
    expect(screen.getByText("Padrão")).toBeInTheDocument();
  });

  // Regra desde 24/09 (commit 6771aba): admin comum nunca contrata pelo detalhe; o Admin Master contrata
  // EM NOME de empresa/agência quando o servidor diz que o produto está pronto; produto incompleto não contrata.
  it("admin comum: contratação desabilitada, com o aviso exato de bloqueio", async () => {
    api.getCatalog2ProductDetailPreview.mockResolvedValue(REAL_DETAIL);
    render(<Catalog2ProductDetail productId="p1" onBack={() => {}} />);
    await screen.findByRole("heading", { level: 1, name: "Criação de Site Institucional" });
    expect(screen.getByRole("button", { name: /contratação bloqueada/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Contratar" })).toBeDisabled();
    expect(screen.getByText("Você está vendo como administrador — a contratação acontece pelo perfil da empresa/agência, não por aqui.")).toBeInTheDocument();
  });

  it("produto incompleto (ready_for_client=false no servidor): aviso exato e nunca contratável, nem pelo Admin Master", async () => {
    api.getCatalog2ProductDetailPreview.mockResolvedValue({ ...REAL_DETAIL, readiness: { ...REAL_DETAIL.readiness, ready_for_client: false, blockers: ["price_pending"] } });
    render(<Catalog2ProductDetail productId="p1" onBack={() => {}} isAdminMaster />);
    await screen.findByRole("heading", { level: 1, name: "Criação de Site Institucional" });
    expect(screen.getByText("Produto em preparação. Dados provisórios precisam ser revisados antes da contratação.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /contratação bloqueada/i })).toBeDisabled();
    expect(screen.queryByRole("button", { name: /Contratar em nome de empresa\/agência/ })).not.toBeInTheDocument();
  });

  it("tarefas reais aparecem em 'O que está incluído' sem selo provisório", async () => {
    api.getCatalog2ProductDetailPreview.mockResolvedValue(REAL_DETAIL);
    render(<Catalog2ProductDetail productId="p1" onBack={() => {}} />);
    expect(await screen.findByText("Diagnóstico")).toBeInTheDocument();
    expect(screen.queryByLabelText(/provisório/i)).not.toBeInTheDocument();
  });

  it("5. memória de cálculo do preço: sem isAdminMaster (padrão), o ícone não aparece", async () => {
    api.getCatalog2ProductDetailPreview.mockResolvedValue(REAL_DETAIL);
    render(<Catalog2ProductDetail productId="p1" onBack={() => {}} />);
    await screen.findByRole("heading", { level: 1, name: "Criação de Site Institucional" });
    expect(screen.queryByRole("button", { name: "Como o preço foi calculado" })).not.toBeInTheDocument();
  });

  // A memória de cálculo saiu do detalhe em 24/09 (cabeçalho novo, commit 6771aba) e fica no Catálogo/Cadastro
  // de produtos (coberta em catalog2-pricing-memory-popover.test.tsx). No detalhe, o Master contrata em nome da conta.
  it("5. Admin Master no detalhe: sem memória de cálculo aqui; contrata em nome de empresa/agência quando o produto está pronto", async () => {
    api.getCatalog2ProductDetailPreview.mockResolvedValue(REAL_DETAIL);
    render(<Catalog2ProductDetail productId="p1" onBack={() => {}} isAdminMaster />);
    await screen.findByRole("heading", { level: 1, name: "Criação de Site Institucional" });
    expect(screen.queryByRole("button", { name: "Como o preço foi calculado" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Contratar em nome de empresa\/agência/ })).toBeEnabled();
  });

  it("recalcula preço e prazo com a opção e o adicional selecionados", async () => {
    api.getCatalog2ProductDetailPreview.mockResolvedValue(REAL_DETAIL);
    // fonte única: o servidor devolve o preço real + o resumo dizendo de onde ele vem
    api.simulateCatalog2.mockResolvedValue({
      pricing: {
        lines: { commercial_final_price: { amount: 1234.56 } },
        deadline: { commercial_deadline_days: 5 },
      },
      price_summary: { amount: 1234.56, source: "comercial", explanation: "Preço de venda do cenário padrão." },
    });
    render(<Catalog2ProductDetail productId="p1" onBack={() => {}} />);

    await userEvent.click(await screen.findByText("Premium"));
    await userEvent.click(screen.getByRole("checkbox", { name: /Entrega urgente/i }));

    await waitFor(() => expect(api.simulateCatalog2).toHaveBeenLastCalledWith("v1", {
      variation_option_keys: ["premium"],
      addon_keys: ["urgencia"],
      // adicionais por quantidade também vão na simulação (vazio quando não há nenhum)
      addon_selections: {},
      quantity: 1,
      answers: {},
    }));
    expect(screen.getAllByText(/R\$\s*1\.234,56/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/5 dias/).length).toBeGreaterThan(0);
  });
});

describe("Catalog2ProductDetail — dado provisório", () => {
  it("preço, prazo, modalidade, opções e destaques provisórios aparecem SEMPRE marcados", async () => {
    api.getCatalog2ProductDetailPreview.mockResolvedValue(PROVISIONAL_DETAIL);
    render(<Catalog2ProductDetail productId="p2" onBack={() => {}} />);
    expect(await screen.findByRole("heading", { level: 1, name: "Landing Page de Alta Conversão" })).toBeInTheDocument();
    expect(screen.getAllByText(/R\$\s*3\.?050/).length).toBeGreaterThan(0);
    // marcas atuais (o "(provisório — revisar)" ao lado do preço saiu do cabeçalho em 24/09, commit 6771aba):
    expect(screen.getByText("Este produto ainda tem campos provisórios (marcados ao longo da tela). Nenhum valor provisório entra em cotação, cesta ou checkout.")).toBeInTheDocument();
    expect(screen.getByText("Dados provisórios - revise antes de contratar")).toBeInTheDocument();
    expect(screen.getByText("Essencial")).toBeInTheDocument();
    expect(screen.getAllByText("provisória").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/provisóri/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /contratação bloqueada|Selecione uma opção/i })).toBeDisabled();
  });

  it("selecionar uma opção provisória é só visual — não muda o bloqueio de contratação", async () => {
    api.getCatalog2ProductDetailPreview.mockResolvedValue(PROVISIONAL_DETAIL);
    render(<Catalog2ProductDetail productId="p2" onBack={() => {}} />);
    await userEvent.click(await screen.findByText("Essencial"));
    expect(screen.getByRole("button", { name: /contratação bloqueada/i })).toBeDisabled();
  });

  it("aba Portfólio mostra o aviso de portfólio provisório quando há referências", async () => {
    api.getCatalog2ProductDetailPreview.mockResolvedValue(PROVISIONAL_DETAIL);
    render(<Catalog2ProductDetail productId="p2" onBack={() => {}} />);
    await userEvent.click(await screen.findByRole("tab", { name: /Portfólio/i }));
    expect(await screen.findByText(/Portfólio provisório/i)).toBeInTheDocument();
  });

  it("aba Nômades nunca inventa profissionais elegíveis — mostra 'a definir'", async () => {
    api.getCatalog2ProductDetailPreview.mockResolvedValue(PROVISIONAL_DETAIL);
    render(<Catalog2ProductDetail productId="p2" onBack={() => {}} />);
    await userEvent.click(await screen.findByRole("tab", { name: /Nômades/i }));
    expect((await screen.findAllByText(/a definir/i)).length).toBeGreaterThan(0);
  });
});

describe("Catalog2ProductDetail — reunião 10/09 (esforço provisório para teste)", () => {
  const PROVISIONAL_EFFORT_DETAIL = {
    product: {
      id: "p3", slug: "produto-provisorio", internal_name: "Produto Com Esforço Provisório", status: "em_preparacao",
      category: { name: "Presença Digital" }, published_version_id: null,
      versions: [{
        id: "v3", state: "rascunho", summary: "Resumo real.", full_description: "Descrição real.",
        variations: [], tasks: [{ id: "t1", name: "Tarefa provisória", description: null, specialty: { name: "Designer" }, effort_is_provisional: true }],
      }],
    },
    readiness: {
      task_count: 1, step_count: 0, price_amount: null, deadline_days: null,
      functional_for_test: true, functional_for_test_label: "Funcional para teste, pendente de revisão",
      provisional: null,
    },
  };

  // O rótulo de produto "Funcional para teste" saiu do cabeçalho do detalhe em 24/09 (commit 6771aba, ajuste de layout);
  // o aviso que continua valendo é o selo por TAREFA com esforço provisório — é ele que este teste exige.
  it("mostra o aviso de especialidade/tempo provisórios na tarefa com esforço provisório", async () => {
    api.getCatalog2ProductDetailPreview.mockResolvedValue(PROVISIONAL_EFFORT_DETAIL);
    render(<Catalog2ProductDetail productId="p3" onBack={() => {}} />);
    expect(await screen.findByText("Tarefa provisória")).toBeInTheDocument();
    expect(screen.getByLabelText(/Especialidade e tempo provisórios para teste — revisão humana pendente/)).toBeInTheDocument();
    expect(screen.getAllByText(/provisório/i).length).toBeGreaterThan(0);
  });
});
