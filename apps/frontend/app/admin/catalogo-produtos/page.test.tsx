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
      task_count: 3, step_count: 5, price_amount: 1200, deadline_days: 10,
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
      task_count: 0, step_count: 0, price_amount: null, deadline_days: null,
      items: {},
      blockers: ["preco", "prazo"], pendings: ["tarefas"],
    },
    {
      id: "prod3", name: "Consultoria Express", is_test_local: false, status: "disponivel", published: true,
      task_count: 1, step_count: 1, price_amount: 300, deadline_days: 3,
      items: { preco: { level: "pronto", note: "Preço comercial BRL 300." }, prazo: { level: "pronto", note: "Prazo comercial 3 dia(s)." } },
      blockers: [], pendings: [],
    },
    {
      id: "fixture1", name: "[TESTE LOCAL] Demo", is_test_local: true, status: "disponivel", published: true,
      task_count: 1, step_count: 1, price_amount: 90, deadline_days: 5,
      items: { preco: { level: "pronto", note: "Preço comercial BRL 90." }, prazo: { level: "pronto", note: "Prazo comercial 5 dia(s)." } },
      blockers: [], pendings: [],
    },
  ],
};
const LIST = {
  data: [
    { id: "prod1", category: { id: "c1", name: "Performance" }, summary: "Site institucional completo.", published_version_number: 1, is_new: true, updated_at: new Date().toISOString() },
    { id: "prod2", category: { id: "c2", name: "Marketing" }, summary: null, published_version_number: null, updated_at: new Date().toISOString() },
    { id: "prod3", category: { id: "c2", name: "Marketing" }, summary: "Consultoria pontual.", published_version_number: 1, updated_at: new Date().toISOString() },
    { id: "fixture1", category: { id: "c1", name: "Performance" }, summary: "Produto de demonstração.", published_version_number: 1, updated_at: new Date().toISOString() },
  ],
  total: 4, page: 1, page_size: 100,
};
const CATEGORIES = { data: [{ id: "c1", name: "Performance" }, { id: "c2", name: "Marketing" }] };

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
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
    expect(screen.getAllByText("Disponível").length).toBeGreaterThan(0);
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

// Reparo 2026-09 seguinte ("recuperação completa dos layouts"): alternador
// Lista/Grade também no Catálogo, com preferência isolada da do Cadastro.
describe("Lista/Grade — alternador de visualização (Catálogo)", () => {
  it("padrão é Grade (cards); alternar pra Lista troca a apresentação sem perder categoria/busca", async () => {
    renderPage();
    await screen.findByText("Site Institucional");
    expect(screen.queryByRole("table")).not.toBeInTheDocument(); // nunca virou tabela administrativa
    expect(document.querySelector(".grid")).toBeTruthy();

    await userEvent.click(screen.getByRole("button", { name: /Marketing/ }));
    await userEvent.click(screen.getByRole("button", { name: "Lista" }));
    expect(screen.queryByText("Site Institucional")).not.toBeInTheDocument(); // filtro de categoria preservado
    expect(screen.getByText("Landing Page")).toBeInTheDocument();
    expect(screen.getByRole("list")).toBeInTheDocument();
  });

  it("preferência de visualização do Catálogo é isolada da do Cadastro (chaves de localStorage distintas)", async () => {
    renderPage();
    await screen.findByText("Site Institucional");
    await userEvent.click(screen.getByRole("button", { name: "Lista" }));
    expect(window.localStorage.getItem("allka:view-mode:admin-catalogo-produtos")).toBe("list");
    expect(window.localStorage.getItem("allka:view-mode:admin-produtos")).toBeNull();
  });

  it("persiste em localStorage e sobrevive a um novo mount (equivalente a F5)", async () => {
    const { unmount } = renderPage();
    await screen.findByText("Site Institucional");
    await userEvent.click(screen.getByRole("button", { name: "Lista" }));
    unmount();

    renderPage();
    await screen.findByText("Site Institucional");
    expect(screen.getByRole("list")).toBeInTheDocument();
  });

  it("botão 'Visualizar como cliente' existe e aponta pro preview do catalog2", async () => {
    renderPage();
    await screen.findByText("Site Institucional");
    const link = screen.getByRole("link", { name: /Visualizar como cliente/i });
    expect(link).toHaveAttribute("href", "/admin/catalog2?preview=1");
  });
});

// Recuperação fiel do layout publicado (verificado via VPS/GHCR: produção
// roda f14e783, cujo product-catalog-view.tsx é byte-idêntico a a809971 —
// mesma referência já usada). SORT_OPTIONS do publicado tinha 7 opções;
// as com dado real (preço/nome) viram sort de verdade, as sem dado real
// (vendas/avaliação) ficam visíveis e desabilitadas — nunca removidas,
// nunca inventadas.
describe("Ordenação — fiel ao layout publicado, nunca com dado inventado", () => {
  it("Menor/Maior preço ordenam por price_amount real; produtos sem preço pronto vão pro fim em 'Menor preço'", async () => {
    renderPage();
    await screen.findByText("Site Institucional");
    await userEvent.click(screen.getByRole("button", { name: /Nome A–Z/ }));
    await userEvent.click(screen.getByText("Menor preço"));
    const names = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    // reais primeiro, por preço crescente (90 fixture não entra na grade);
    // "Landing Page" (sem preço pronto) vai pro fim.
    expect(names.indexOf("Consultoria Express")).toBeLessThan(names.indexOf("Site Institucional"));
    expect(names.indexOf("Landing Page")).toBe(names.length - 1);
  });

  it("Maior preço inverte a ordem, mesma base real", async () => {
    renderPage();
    await screen.findByText("Site Institucional");
    await userEvent.click(screen.getByRole("button", { name: /Nome A–Z/ }));
    await userEvent.click(screen.getByText("Maior preço"));
    const names = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(names.indexOf("Site Institucional")).toBeLessThan(names.indexOf("Consultoria Express"));
  });

  it("'Mais vendidos' e 'Melhor avaliados' aparecem desabilitados com explicação — nunca removidos, nunca com dado inventado", async () => {
    renderPage();
    await screen.findByText("Site Institucional");
    await userEvent.click(screen.getByRole("button", { name: /Nome A–Z/ }));
    const vendidos = screen.getByText("Mais vendidos");
    const avaliados = screen.getByText("Melhor avaliados");
    expect(vendidos.closest('[role="menuitem"]')).toHaveAttribute("aria-disabled", "true");
    expect(avaliados.closest('[role="menuitem"]')).toHaveAttribute("aria-disabled", "true");
    expect(vendidos.closest('[role="menuitem"]')).toHaveAttribute("title", expect.stringContaining("Sem dado real"));
    expect(avaliados.closest('[role="menuitem"]')).toHaveAttribute("title", expect.stringContaining("não tem avaliação"));
  });
});
