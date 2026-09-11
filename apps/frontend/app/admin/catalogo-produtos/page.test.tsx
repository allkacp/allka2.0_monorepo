import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { OpenScreensProvider } from "@/contexts/open-screens-context";

// 2026-09 (consolidação catalog2, reunião "catálogo2 como cadastro
// definitivo"): esta tela deixou de ser a listagem/contratação do catálogo
// ANTIGO (Product/basket). Reparo seguinte (mesma reunião, bloco
// "restaurar layouts aprovados"): recuperou a apresentação visual de
// catálogo (grade de cards, busca, categorias, banner) — perdida quando
// esta rota tinha virado uma tabela administrativa simplificada — mantendo
// a fonte de dados em catalog2 e sem cesta/contratação/edição.

const { api } = vi.hoisted(() => ({
  api: {
    getCatalog2Readiness: vi.fn(),
    getCatalog2Products: vi.fn(),
    getCatalog2Categories: vi.fn(),
  },
}));
vi.mock("@/lib/api-client", () => ({ apiClient: api }));

import AdminCatalogoProdutosPage from "@/app/admin/catalogo-produtos/page";

function renderPage() {
  return render(
    <MemoryRouter>
      <OpenScreensProvider>
        <AdminCatalogoProdutosPage />
      </OpenScreensProvider>
    </MemoryRouter>,
  );
}

const READINESS = {
  products: [
    {
      id: "prod1", name: "Site Institucional", is_test_local: false, status: "disponivel", published: true,
      task_count: 3, step_count: 5,
      items: {
        preco: { level: "pronto", note: "Preço comercial BRL 1200." },
        prazo: { level: "pronto", note: "Prazo comercial 10 dia(s)." },
        variacoes: { level: "pronto", note: "2 variação(ões)." },
        adicionais: { level: "opcional", note: "Sem adicionais (permitido)." },
      },
      blockers: [], pendings: [],
    },
    {
      id: "prod2", name: "Landing Page", is_test_local: false, status: "em_preparacao", published: false,
      task_count: 0, step_count: 0,
      items: {},
      blockers: ["preco", "prazo"], pendings: ["tarefas"],
    },
    {
      id: "fixture1", name: "[TESTE LOCAL] Demo", is_test_local: true, status: "disponivel", published: true,
      task_count: 1, step_count: 1,
      items: { preco: { level: "pronto", note: "Preço comercial BRL 90." }, prazo: { level: "pronto", note: "Prazo comercial 5 dia(s)." } },
      blockers: [], pendings: [],
    },
  ],
};
const LIST = {
  data: [
    { id: "prod1", category: { id: "c1", name: "Performance" }, summary: "Site institucional completo.", published_version_number: 1, is_new: true, updated_at: new Date().toISOString() },
    { id: "prod2", category: { id: "c2", name: "Marketing" }, summary: null, published_version_number: null, updated_at: new Date().toISOString() },
    { id: "fixture1", category: { id: "c1", name: "Performance" }, summary: "Produto de demonstração.", published_version_number: 1, updated_at: new Date().toISOString() },
  ],
  total: 3, page: 1, page_size: 100,
};
const CATEGORIES = { data: [{ id: "c1", name: "Performance" }, { id: "c2", name: "Marketing" }] };

beforeEach(() => {
  vi.clearAllMocks();
  api.getCatalog2Readiness.mockResolvedValue(READINESS);
  api.getCatalog2Products.mockResolvedValue(LIST);
  api.getCatalog2Categories.mockResolvedValue(CATEGORIES);
});

describe("Catálogo de Produtos administrativo (catalog2) — grade de cards", () => {
  it("Admin comum → mensagem de acesso restrito (404)", async () => {
    api.getCatalog2Readiness.mockRejectedValue(Object.assign(new Error("x"), { status: 404 }));
    renderPage();
    expect(await screen.findByText(/exclusiva do Admin Master/i)).toBeInTheDocument();
  });

  it("layout recuperado: banner padrão, busca, categorias reais e grade de cards (não mais tabela administrativa)", async () => {
    renderPage();
    await screen.findByText("Site Institucional");
    expect(screen.getByRole("heading", { name: "Catálogo de Produtos" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Buscar produtos/i)).toBeInTheDocument();
    // categorias reais do catalog2 (não fixas): Performance, Marketing —
    // como pílulas de filtro clicáveis (também aparecem, à parte, no card).
    expect(screen.getByRole("button", { name: /Performance/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Marketing/ })).toBeInTheDocument();
    // não é mais uma <table>
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("lista os produtos catalog2 reais em cards — nunca o catálogo antigo", async () => {
    renderPage();
    expect(await screen.findByText("Site Institucional")).toBeInTheDocument();
    expect(screen.getByText("Landing Page")).toBeInTheDocument();
    expect(screen.getByText("Disponível")).toBeInTheDocument();
    expect(screen.getByText("Em preparação")).toBeInTheDocument();
    expect(screen.getByText(/catálogo antigo, com 162 produtos, não aparece mais aqui/i)).toBeInTheDocument();
  });

  it("a fixture [TESTE LOCAL] fica separada da grade principal e é identificada", async () => {
    renderPage();
    await screen.findByText("Site Institucional");
    expect(screen.queryByText("[TESTE LOCAL] Demo")).not.toBeInTheDocument();
    expect(screen.getByText(/1 produto de demonstração/i)).toBeInTheDocument();
    expect(screen.getByText(/nunca aparece no catálogo do cliente/i)).toBeInTheDocument();
  });

  it("busca filtra a grade pelo nome do produto", async () => {
    renderPage();
    await screen.findByText("Site Institucional");
    await userEvent.type(screen.getByPlaceholderText(/Buscar produtos/i), "landing");
    await waitFor(() => expect(screen.queryByText("Site Institucional")).not.toBeInTheDocument());
    expect(screen.getByText("Landing Page")).toBeInTheDocument();
  });

  it("categoria filtra a grade", async () => {
    renderPage();
    await screen.findByText("Site Institucional");
    await userEvent.click(screen.getByRole("button", { name: /Marketing/ }));
    expect(screen.queryByText("Site Institucional")).not.toBeInTheDocument();
    expect(screen.getByText("Landing Page")).toBeInTheDocument();
  });

  it("card mostra mensagens honestas quando preço/prazo/tarefas ainda não existem, e o valor real quando existe", async () => {
    renderPage();
    await screen.findByText("Landing Page");
    expect(screen.getByText("Preço ainda não configurado.")).toBeInTheDocument();
    expect(screen.getByText("Prazo ainda não definido.")).toBeInTheDocument();
    expect(screen.getByText("Tarefas ainda não cadastradas")).toBeInTheDocument();
    expect(screen.getByText("Preço comercial BRL 1200.")).toBeInTheDocument();
  });

  it("abrir o detalhe de um produto: painel dentro do container padrão, com pendências honestas e sem controle de edição", async () => {
    renderPage();
    await screen.findByText("Site Institucional");
    // "Site Institucional" não tem pendências (blockers/pendings vazios).
    const card = screen.getByText("Site Institucional").closest(".group") as HTMLElement;
    await userEvent.click(within(card).getByRole("button", { name: "Ver detalhes" }));
    expect(await screen.findByText("Nenhuma pendência — pronto para revisão final.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /publicar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /excluir/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /adicionar à cesta/i })).not.toBeInTheDocument();
  });

  it("detalhe de produto com pendências reais mostra os blockers/pendings honestamente", async () => {
    renderPage();
    await screen.findByText("Landing Page");
    const card = screen.getByText("Landing Page").closest(".group") as HTMLElement;
    await userEvent.click(within(card).getByRole("button", { name: "Ver detalhes" }));
    expect(await screen.findByText("preço")).toBeInTheDocument();
    expect(screen.getByText("prazo")).toBeInTheDocument();
    expect(screen.getByText("tarefas")).toBeInTheDocument();
  });
});
