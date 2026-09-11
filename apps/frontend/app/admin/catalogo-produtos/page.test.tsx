import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { OpenScreensProvider } from "@/contexts/open-screens-context";

// 2026-09 (consolidação catalog2, reunião "catálogo2 como cadastro
// definitivo"): esta tela deixou de ser a listagem/contratação do catálogo
// ANTIGO (Product/basket) e passou a ser a visão comercial ADMINISTRATIVA
// dos produtos catalog2 — sem cesta, sem "Adicionar à cesta", sem tela
// cheia de produto (isso é papel do Cadastro de Produtos e do catálogo do
// cliente, não deste painel).

const { api } = vi.hoisted(() => ({
  api: {
    getCatalog2Readiness: vi.fn(),
    getCatalog2Products: vi.fn(),
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
    { id: "prod1", category: { name: "Performance" }, summary: "Site institucional completo.", published_version_number: 1 },
    { id: "prod2", category: { name: "Marketing" }, summary: null, published_version_number: null },
    { id: "fixture1", category: { name: "Performance" }, summary: "Produto de demonstração.", published_version_number: 1 },
  ],
  total: 3, page: 1, page_size: 100,
};

beforeEach(() => {
  vi.clearAllMocks();
  api.getCatalog2Readiness.mockResolvedValue(READINESS);
  api.getCatalog2Products.mockResolvedValue(LIST);
});

describe("Catálogo de Produtos administrativo (catalog2)", () => {
  it("Admin comum → mensagem de acesso restrito (404)", async () => {
    api.getCatalog2Readiness.mockRejectedValue(Object.assign(new Error("x"), { status: 404 }));
    renderPage();
    expect(await screen.findByText(/exclusiva do Admin Master/i)).toBeInTheDocument();
  });

  it("lista os produtos catalog2 reais, com categoria, status e versão — nunca o catálogo antigo", async () => {
    renderPage();
    expect(await screen.findByText("Site Institucional")).toBeInTheDocument();
    expect(screen.getByText("Landing Page")).toBeInTheDocument();
    expect(screen.getByText("Performance")).toBeInTheDocument();
    expect(screen.getByText("Marketing")).toBeInTheDocument();
    expect(screen.getByText("Disponível")).toBeInTheDocument();
    expect(screen.getByText("Em preparação")).toBeInTheDocument();
    expect(screen.getByText("v1 publicada")).toBeInTheDocument();
    expect(screen.getByText(/catálogo antigo, com 162 produtos, não aparece mais aqui/i)).toBeInTheDocument();
  });

  it("a fixture [TESTE LOCAL] fica separada da lista principal e é identificada", async () => {
    renderPage();
    await screen.findByText("Site Institucional");
    expect(screen.queryByText("[TESTE LOCAL] Demo")).not.toBeInTheDocument();
    expect(screen.getByText(/1 produto de demonstração/i)).toBeInTheDocument();
  });

  it("preço/prazo/tarefas ausentes mostram mensagem honesta, nunca um valor inventado", async () => {
    renderPage();
    await screen.findByText("Landing Page");
    expect(screen.getByText("Preço ainda não configurado.")).toBeInTheDocument();
    expect(screen.getByText("Prazo ainda não definido.")).toBeInTheDocument();
    expect(screen.getByText("Tarefas ainda não cadastradas")).toBeInTheDocument();
    expect(screen.getByText("Preço comercial BRL 1200.")).toBeInTheDocument();
    expect(screen.getByText("Prazo comercial 10 dia(s).")).toBeInTheDocument();
  });

  it("descrição ausente mostra mensagem honesta, nunca texto vazio ou inventado", async () => {
    renderPage();
    await screen.findByText("Site Institucional");
    expect(screen.getByText("Site institucional completo.")).toBeInTheDocument();
    expect(screen.getByText(/descrição ainda não escrita/i)).toBeInTheDocument();
  });

  it("pendências/bloqueadores aparecem por produto; sem nenhum, mostra 'nenhuma'", async () => {
    renderPage();
    await screen.findByText("Landing Page");
    expect(screen.getByText("preco")).toBeInTheDocument();
    expect(screen.getByText("prazo")).toBeInTheDocument();
    expect(screen.getByText("tarefas")).toBeInTheDocument();
    expect(screen.getByText("nenhuma")).toBeInTheDocument();
  });

  it("nenhum botão de publicar/editar/excluir existe nesta tela (somente leitura)", async () => {
    renderPage();
    await screen.findByText("Site Institucional");
    expect(screen.queryByRole("button", { name: /publicar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /excluir/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /adicionar à cesta/i })).not.toBeInTheDocument();
  });
});
