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

  it("card mostra o valor real quando existe, e um valor provisório MARCADO (nunca a mensagem antiga de ausência) quando não existe", async () => {
    renderPage();
    await screen.findByText("Landing Page");
    // real (Site Institucional)
    expect(screen.getByText("Preço comercial BRL 1200.")).toBeInTheDocument();
    // "Landing Page" não tem preço/prazo/tarefas reais — mostra valor
    // provisório determinístico, sempre com o selo "provisório" ao lado.
    const card = screen.getByText("Landing Page").closest(".group") as HTMLElement;
    expect(within(card).getByText(/^R\$ \d+\.\d{2}$/)).toBeInTheDocument();
    expect(within(card).getAllByLabelText(/provisóri[ao]/i).length).toBeGreaterThan(0);
    expect(within(card).getByText(/^\d+ tarefa\(s\)$/)).toBeInTheDocument();
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
  it("Menor/Maior preço ordenam por price_amount REAL quando existe (produtos com preço real ficam em ordem crescente/decrescente entre si)", async () => {
    renderPage();
    await screen.findByText("Site Institucional");
    await userEvent.click(screen.getByRole("button", { name: /Nome A–Z/ }));
    await userEvent.click(screen.getByText("Menor preço"));
    const namesAsc = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    // Consultoria Express (300) sempre antes de Site Institucional (1200) —
    // preço real, nunca depende de hash provisório.
    expect(namesAsc.indexOf("Consultoria Express")).toBeLessThan(namesAsc.indexOf("Site Institucional"));

    await userEvent.click(screen.getByRole("button", { name: /Menor preço/ }));
    await userEvent.click(screen.getByText("Maior preço"));
    const namesDesc = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(namesDesc.indexOf("Site Institucional")).toBeLessThan(namesDesc.indexOf("Consultoria Express"));
  });

  it("'Menor preço' inclui produtos sem preço real na ordenação, usando um valor provisório determinístico (nunca ficam soltos/sem posição)", async () => {
    renderPage();
    await screen.findByText("Site Institucional");
    await userEvent.click(screen.getByRole("button", { name: /Nome A–Z/ }));
    await userEvent.click(screen.getByText("Menor preço"));
    const names = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    // "Landing Page" (sem preço real) aparece na grade, ordenado junto com
    // os demais — nunca ausente, nunca com posição aleatória entre F5s
    // (mesmo hash, mesma posição sempre).
    expect(names).toContain("Landing Page");
    expect(names.length).toBe(3); // fixture nunca entra
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

// Reunião 10/09 ("Cabeçalho e filtros do Catálogo de Produtos"): busca em
// destaque + Filtros + ordenação + alternador numa única linha; categorias
// em badges logo abaixo, com contador e seleção clara; painel de filtros
// só com filtros catalog2 reais (Aplicar/Limpar/Fechar, contagem e badges
// de ativos); nada duplicado; contratação nunca liberada aqui.
describe("Cabeçalho e filtros reorganizados (Catálogo)", () => {
  it("badges de categorias reais mostram contador correto, incluindo 'Todos'", async () => {
    renderPage();
    await screen.findByText("Site Institucional");
    const todos = screen.getByRole("button", { name: /Todos/ });
    const performance = screen.getByRole("button", { name: /Performance/ });
    const marketing = screen.getByRole("button", { name: /Marketing/ });
    expect(within(todos).getByText("3")).toBeInTheDocument(); // 3 reais — fixture nunca conta
    expect(within(performance).getByText("1")).toBeInTheDocument();
    expect(within(marketing).getByText("2")).toBeInTheDocument();
  });

  it("categoria selecionada fica visualmente clara (só uma ativa por vez)", async () => {
    renderPage();
    await screen.findByText("Site Institucional");
    const todos = screen.getByRole("button", { name: /Todos/ });
    const marketing = screen.getByRole("button", { name: /Marketing/ });
    expect(todos.className).toContain("text-white");
    expect(marketing.className).not.toContain("text-white");

    await userEvent.click(marketing);
    expect(marketing.className).toContain("text-white");
    expect(todos.className).not.toContain("text-white");
  });

  it("painel de filtros abre com apenas filtros catalog2 reais (status + com preço/prazo/tarefas/etapas/pendências/provisórios) e Aplicar/Limpar/Fechar", async () => {
    renderPage();
    await screen.findByText("Site Institucional");
    await userEvent.click(screen.getByRole("button", { name: /^Filtros$/ }));
    expect(await screen.findByText("Com preço")).toBeInTheDocument();
    expect(screen.getByText("Com prazo")).toBeInTheDocument();
    expect(screen.getByText("Com tarefas")).toBeInTheDocument();
    expect(screen.getByText("Com etapas")).toBeInTheDocument();
    expect(screen.getByText("Com pendências")).toBeInTheDocument();
    expect(screen.getByText("Campos provisórios")).toBeInTheDocument();
    expect(screen.getByLabelText("Status")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aplicar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Limpar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fechar" })).toBeInTheDocument();
    // nenhum filtro herdado do catálogo antigo sem equivalente catalog2
    expect(screen.queryByText(/avaliação|recorrência|código legado/i)).not.toBeInTheDocument();
  });

  it("aplicar 'Com pendências' filtra a grade; Limpar restaura tudo e some a contagem de ativos", async () => {
    renderPage();
    await screen.findByText("Site Institucional");
    await userEvent.click(screen.getByRole("button", { name: /^Filtros$/ }));
    await userEvent.click(screen.getByText("Com pendências"));
    await userEvent.click(screen.getByRole("button", { name: "Aplicar" }));

    expect(screen.queryByText("Site Institucional")).not.toBeInTheDocument();
    expect(screen.getByText("Landing Page")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Com pendências/ })).toBeInTheDocument(); // badge de filtro ativo

    await userEvent.click(screen.getByRole("button", { name: /Limpar filtros/i }));
    expect(screen.getByText("Site Institucional")).toBeInTheDocument();
    expect(screen.getByText("Landing Page")).toBeInTheDocument();
    expect(screen.getByText("Consultoria Express")).toBeInTheDocument();
  });

  it("filtros ativos aparecem como badges removíveis (X remove só aquele filtro)", async () => {
    renderPage();
    await screen.findByText("Site Institucional");
    await userEvent.click(screen.getByRole("button", { name: /^Filtros$/ }));
    await userEvent.click(screen.getByText("Com tarefas"));
    await userEvent.click(screen.getByRole("button", { name: "Aplicar" }));

    const chip = screen.getByRole("button", { name: /Com tarefas/ });
    expect(chip).toBeInTheDocument();
    expect(screen.queryByText("Landing Page")).not.toBeInTheDocument(); // sem tarefas — filtrado

    await userEvent.click(chip);
    expect(screen.getByText("Landing Page")).toBeInTheDocument(); // filtro removido, volta a aparecer
  });

  it("nenhum controle duplicado: só uma busca, um botão Filtros, um controle de ordenação e uma linha de categorias", async () => {
    renderPage();
    await screen.findByText("Site Institucional");
    expect(screen.getAllByPlaceholderText(/Buscar produtos/i).length).toBe(1);
    expect(screen.getAllByRole("button", { name: /^Filtros$/ }).length).toBe(1);
    expect(screen.getAllByRole("button", { name: /Nome A–Z|Nome Z–A|Menor preço|Maior preço|Alterado recentemente/ }).length).toBe(1);
    expect(screen.getAllByRole("button", { name: /^Todos/ }).length).toBe(1);
  });

  it("busca + categoria + filtro combinados funcionam juntos", async () => {
    renderPage();
    await screen.findByText("Site Institucional");
    await userEvent.click(screen.getByRole("button", { name: /Marketing/ }));
    await userEvent.type(screen.getByPlaceholderText(/Buscar produtos/i), "landing");
    await userEvent.click(screen.getByRole("button", { name: /^Filtros$/ }));
    await userEvent.click(screen.getByText("Com pendências"));
    await userEvent.click(screen.getByRole("button", { name: "Aplicar" }));
    expect(screen.getByText("Landing Page")).toBeInTheDocument();
    expect(screen.queryByText("Consultoria Express")).not.toBeInTheDocument();
    expect(screen.queryByText("Site Institucional")).not.toBeInTheDocument();
  });

  it("abrir e fechar o detalhe de um produto preserva busca, categoria, filtro e modo de visualização", async () => {
    renderPage();
    await screen.findByText("Site Institucional");
    await userEvent.click(screen.getByRole("button", { name: "Lista" }));
    await userEvent.type(screen.getByPlaceholderText(/Buscar produtos/i), "consultoria");
    await userEvent.click(screen.getByRole("button", { name: "Ver detalhes" }));
    await screen.findByText("Nenhuma pendência — pronto para revisão final.");
    // botão fechar do painel (EmbeddedSlideScreen) é só ícone, sem rótulo
    // acessível próprio — identificado pela classe do container padrão.
    const closeBtn = Array.from(document.querySelectorAll("button")).find((b) => b.className.includes("text-white/80")) as HTMLElement;
    await userEvent.click(closeBtn);

    expect(screen.getByPlaceholderText(/Buscar produtos/i)).toHaveValue("consultoria");
    expect(screen.getByRole("list")).toBeInTheDocument(); // continua em Lista
    expect(screen.getAllByText("Consultoria Express").length).toBeGreaterThan(0);
  });

  it("5 colunas aplica a classe de grade correspondente sem cortar cards", async () => {
    renderPage();
    await screen.findByText("Site Institucional");
    await userEvent.click(screen.getByRole("button", { name: "5 colunas" }));
    expect(document.querySelector(".grid")).toBeTruthy();
    expect(screen.getByText("Site Institucional")).toBeInTheDocument();
  });

  it("nenhuma ação de contratação/checkout aparece nesta tela (só leitura/conferência)", async () => {
    renderPage();
    await screen.findByText("Site Institucional");
    expect(screen.queryByRole("button", { name: /contratar|adicionar à cesta|finalizar compra/i })).not.toBeInTheDocument();
    await userEvent.click(screen.getAllByRole("button", { name: "Ver detalhes" })[0]);
    await screen.findByText(/Campos reais/i);
    expect(screen.queryByRole("button", { name: /contratar|adicionar à cesta|finalizar compra/i })).not.toBeInTheDocument();
  });
});
