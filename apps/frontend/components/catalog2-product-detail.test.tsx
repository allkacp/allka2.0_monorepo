import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Catalog2ProductDetail } from "./catalog2-product-detail";

// Reparo 2026-09 ("restaurar o detalhe completo do produto, preços e
// imagens"): este detalhe reproduz a estrutura do componente publicado
// (cabeçalho, abas Detalhes/Portfólio/Nômades, opções com preço/prazo,
// contratação sempre bloqueada aqui) usando dados catalog2 reais +
// provisórios, sempre marcados e nunca contratáveis.

const { api } = vi.hoisted(() => ({
  api: { getCatalog2ProductDetailPreview: vi.fn() },
}));
vi.mock("@/lib/api-client", () => ({ apiClient: api }));

const REAL_DETAIL = {
  product: {
    id: "p1", slug: "site-institucional", internal_name: "Criação de Site Institucional", status: "em_preparacao",
    category: { name: "Presença Digital" }, published_version_id: null,
    versions: [{
      id: "v1", state: "rascunho", summary: "Resumo real do produto.", full_description: "Descrição completa real do produto.",
      variations: [{ id: "var1", name: "Formato", options: [{ id: "opt1", label: "Padrão" }] }],
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
});

describe("Catalog2ProductDetail — dado real", () => {
  it("mostra nome, categoria, código, preço/prazo reais (sem selo provisório) e opções reais", async () => {
    api.getCatalog2ProductDetailPreview.mockResolvedValue(REAL_DETAIL);
    render(<Catalog2ProductDetail productId="p1" onBack={() => {}} />);
    expect(await screen.findByText("Criação de Site Institucional")).toBeInTheDocument();
    expect(screen.getByText("Presença Digital")).toBeInTheDocument();
    expect(screen.getByText("site-institucional")).toBeInTheDocument();
    expect(screen.getAllByText(/R\$\s*750/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/9 dias/).length).toBeGreaterThan(0);
    expect(screen.getByText("Formato — Padrão")).toBeInTheDocument();
  });

  it("botão Contratar SEMPRE desabilitado e com o aviso exato de bloqueio", async () => {
    api.getCatalog2ProductDetailPreview.mockResolvedValue(REAL_DETAIL);
    render(<Catalog2ProductDetail productId="p1" onBack={() => {}} />);
    await screen.findByText("Criação de Site Institucional");
    const btn = screen.getByRole("button", { name: "Contratar" });
    expect(btn).toBeDisabled();
    expect(screen.getByText("Produto em preparação. Dados provisórios precisam ser revisados antes da contratação.")).toBeInTheDocument();
  });

  it("tarefas reais aparecem em 'O que está incluído' sem selo provisório", async () => {
    api.getCatalog2ProductDetailPreview.mockResolvedValue(REAL_DETAIL);
    render(<Catalog2ProductDetail productId="p1" onBack={() => {}} />);
    expect(await screen.findByText("Diagnóstico")).toBeInTheDocument();
    expect(screen.queryByLabelText(/provisório/i)).not.toBeInTheDocument();
  });
});

describe("Catalog2ProductDetail — dado provisório", () => {
  it("preço, prazo, modalidade, opções e destaques provisórios aparecem SEMPRE marcados", async () => {
    api.getCatalog2ProductDetailPreview.mockResolvedValue(PROVISIONAL_DETAIL);
    render(<Catalog2ProductDetail productId="p2" onBack={() => {}} />);
    expect(await screen.findByText("Landing Page de Alta Conversão")).toBeInTheDocument();
    expect(screen.getAllByText(/R\$\s*3\.?050/).length).toBeGreaterThan(0);
    expect(screen.getByText(/provisório — revisar/i)).toBeInTheDocument();
    expect(screen.getByText("Essencial")).toBeInTheDocument();
    expect(screen.getAllByText(/provisóri/i).length).toBeGreaterThan(0);
  });

  it("selecionar uma opção provisória é só visual — não muda o bloqueio de contratação", async () => {
    api.getCatalog2ProductDetailPreview.mockResolvedValue(PROVISIONAL_DETAIL);
    render(<Catalog2ProductDetail productId="p2" onBack={() => {}} />);
    await userEvent.click(await screen.findByText("Essencial"));
    expect(screen.getByRole("button", { name: "Contratar" })).toBeDisabled();
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
