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
    getCurrentUser: vi.fn(),
    getCatalog2ProductPricingMemory: vi.fn(),
    getCatalog2Readiness: vi.fn(),
    getCatalog2Products: vi.fn(),
    getCatalog2Categories: vi.fn(),
    getCatalog2ProductDetailPreview: vi.fn(),
    simulateCatalog2: vi.fn(),
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
      // Reunião 10/09 ("36 produtos funcionalmente completos para teste").
      effort_data_state: "provisional", functional_for_test: true, functional_for_test_label: "Funcional para teste, pendente de revisão",
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
    { id: "prod1", slug: "p01-site-institucional", category: { id: "c1", name: "Performance" }, summary: "Site institucional completo.", published_version_number: 1, is_new: true, updated_at: new Date().toISOString() },
    { id: "prod2", slug: "p02-landing-page", category: { id: "c2", name: "Marketing" }, summary: null, published_version_number: null, updated_at: new Date().toISOString() },
    { id: "prod3", slug: "p03-consultoria-express", category: { id: "c2", name: "Marketing" }, summary: "Consultoria pontual.", published_version_number: 1, updated_at: new Date().toISOString() },
    { id: "fixture1", slug: "teste-local-demo", category: { id: "c1", name: "Performance" }, summary: "Produto de demonstração.", published_version_number: 1, updated_at: new Date().toISOString() },
  ],
  total: 4, page: 1, page_size: 100,
};
const CATEGORIES = { data: [{ id: "c1", name: "Performance" }, { id: "c2", name: "Marketing" }] };

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  api.getCurrentUser.mockResolvedValue({ id: "u1", account_type: "admin", admin_profile: { is_active: true, is_master: true } });
  api.getCatalog2Readiness.mockResolvedValue(READINESS);
  api.getCatalog2Products.mockResolvedValue(LIST);
  api.getCatalog2Categories.mockResolvedValue(CATEGORIES);
  api.simulateCatalog2.mockResolvedValue({ pricing_simulation: null, pricing: null });
  api.getCatalog2ProductDetailPreview.mockImplementation(async (id: string) => {
    const readiness = READINESS.products.find((item) => item.id === id) ?? READINESS.products[0];
    const list = LIST.data.find((item) => item.id === id) ?? LIST.data[0];
    return {
      product: {
        id,
        slug: list.slug,
        internal_name: readiness.name,
        status: readiness.status,
        category: list.category,
        published_version_id: null,
        versions: [{
          id: `version-${id}`,
          state: "rascunho",
          summary: list.summary,
          full_description: list.summary,
          variations: [{ id: `variation-${id}`, name: "Opção", options: [{ id: `option-${id}`, label: "Padrão" }] }],
          tasks: readiness.task_count > 0 ? [{ id: `task-${id}`, name: "Entrega principal", specialty: { name: "Designer" }, effort_is_provisional: !!readiness.functional_for_test }] : [],
        }],
      },
      readiness: {
        ...readiness,
        provisional: readiness.price_amount == null ? {
          price_amount: 500,
          deadline_days: 5,
          modality: "Avulso",
          highlights: [],
          included_items: [],
          options: [{ name: "Padrão para teste", price: 500, deadline_days: 5, modality: "Avulso", features: [] }],
          portfolio_refs: [],
        } : null,
      },
    };
  });
});

describe("Catálogo de Produtos administrativo (catalog2) — grade de cards", () => {
  it("Admin comum → mensagem de acesso restrito (404)", async () => {
    api.getCatalog2Readiness.mockRejectedValue(Object.assign(new Error("x"), { status: 404 }));
    renderPage();
    expect(await screen.findByText(/exclusiva do Admin Master/i)).toBeInTheDocument();
  });

  it("falha real da API (não-404) mostra erro visível com opção de tentar novamente, nunca vira silenciosamente lista vazia", async () => {
    api.getCatalog2Readiness.mockRejectedValueOnce(new Error("erro 500"));
    renderPage();
    expect(await screen.findByText(/Erro ao carregar o catálogo/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tentar novamente/i })).toBeInTheDocument();
    // nunca deve parecer "nenhum produto encontrado" — o card real não aparece,
    // mas a mensagem é claramente de erro, não de resultado vazio.
    expect(screen.queryByText("Site Institucional")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Tentar novamente/i }));
    expect(await screen.findByText("Site Institucional")).toBeInTheDocument();
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

  // 04/11: o texto informativo sobre os 162 produtos do catálogo antigo saiu da tela em 24/09 (mudança aceita pelo
  // usuário em 04/11). O que continua valendo: só produtos catalog2 reais, com situação, e nenhum produto antigo.
  it("lista os produtos catalog2 reais em cards — nunca o catálogo antigo", async () => {
    renderPage();
    expect(await screen.findByText("Site Institucional")).toBeInTheDocument();
    expect(screen.getByText("Landing Page")).toBeInTheDocument();
    expect(screen.getAllByText("Ativo").length).toBeGreaterThan(0);
    expect(screen.getByText("Em preparação")).toBeInTheDocument();
    expect(api.getCatalog2Products).toHaveBeenCalled();
    expect(screen.queryByText(/ANTIGA #|catálogo antigo/i)).not.toBeInTheDocument();
  });

  // Decisão do usuário de 23/09 (comentário em page.tsx): o produto "[TESTE LOCAL]" aparece igual aos outros, porque
  // é o mesmo que company/agency/líder usam para testar a compra. Ele só nunca recebe selo comercial.
  it("a fixture [TESTE LOCAL] aparece na grade como os demais, mas sem selo comercial", async () => {
    renderPage();
    await screen.findByText("Site Institucional");
    const fixture = screen.getByRole("button", { name: "[TESTE LOCAL] Demo — ver detalhes" });
    expect(within(fixture).queryByText(/^Novo$|Lançamento|Promoção|Destaque/)).not.toBeInTheDocument();
    expect(within(fixture).getByText("Ativo")).toBeInTheDocument();
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

  // Regra dura (RETOMAR-AQUI, "nunca inventar preço, hora ou prazo"): o card não mostra mais um preço "provisório"
  // calculado por hash. Sem preço real, o card fica sem preço — nunca um valor inventado.
  it("card mostra o valor real quando existe e, sem preço real, não inventa um valor", async () => {
    renderPage();
    await screen.findByText("Landing Page");
    const real = screen.getByRole("button", { name: "Site Institucional — ver detalhes" });
    expect(within(real).getByText("R$ 1.200,00")).toBeInTheDocument();
    expect(within(real).getByText("10 dia(s)")).toBeInTheDocument();
    const semPreco = screen.getByRole("button", { name: "Landing Page — ver detalhes" });
    expect(within(semPreco).queryByText(/R\$/)).not.toBeInTheDocument();
    expect(within(semPreco).getByText("Tarefas a definir")).toBeInTheDocument();
    expect(within(semPreco).getByText("3 pendências")).toBeInTheDocument();
  });

  // Desde 24/09 o clique abre o detalhe comercial completo (mesma tela que company/agency/líder veem) e o Admin
  // Master pode contratar em nome de empresa/agência (deploy-log, 24/09). Nunca há edição/publicação/exclusão aqui.
  it("abrir o detalhe de um produto: tela comercial completa, sem controle de edição, com a contratação em nome do cliente", async () => {
    renderPage();
    await screen.findByText("Site Institucional");
    const card = screen.getByRole("button", { name: "Site Institucional — ver detalhes" });
    await userEvent.click(within(card).getByRole("button", { name: /Ver detalhes/ }));
    expect(await screen.findByRole("button", { name: "Voltar ao catálogo" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { level: 1, name: "Site Institucional" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Contratar em nome de empresa\/agência/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /publicar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /excluir/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /adicionar à cesta/i })).not.toBeInTheDocument();
  });

  // Regressão 04/11 (erro real): o preço que só existe na prévia provisória aparecia "R$ 500,00" sem marca no
  // detalhe do admin, enquanto o prazo ao lado vinha "(provisório)".
  it("detalhe de produto sem preço/prazo reais marca o preço E o prazo provisórios", async () => {
    renderPage();
    await screen.findByText("Landing Page");
    await userEvent.click(screen.getByRole("button", { name: "Landing Page — ver detalhes" }));
    await screen.findByRole("button", { name: "Voltar ao catálogo" });
    const preco = await screen.findByText(/R\$ 500,00/);
    expect(preco.closest("p")).toHaveTextContent("(provisório)");
    expect(screen.getByText(/5 dias/, { selector: "span" })).toHaveTextContent("(provisório)");
    expect(screen.getByText("Nenhuma tarefa cadastrada ainda.")).toBeInTheDocument();
  });

  it("o preço real no detalhe nunca recebe a marca de provisório", async () => {
    renderPage();
    await screen.findByText("Site Institucional");
    await userEvent.click(screen.getByRole("button", { name: "Site Institucional — ver detalhes" }));
    const preco = await screen.findByText(/R\$ 1\.200,00/, { selector: "p.text-lg" });
    expect(preco).not.toHaveTextContent(/provisório/);
  });

  it("reunião 10/09: produto com esforço provisório mostra o aviso no card e no detalhe", async () => {
    renderPage();
    const card = await screen.findByRole("button", { name: "Consultoria Express — ver detalhes" });
    expect(within(card).getByLabelText(/Especialidade e tempo provisórios para teste/i)).toBeInTheDocument();

    await userEvent.click(within(card).getByRole("button", { name: /Ver detalhes/ }));
    expect(await screen.findByText("Entrega principal")).toBeInTheDocument();
    expect(screen.getAllByText("provisório").length).toBeGreaterThan(0);
  });
});

// Reparo 2026-09 seguinte ("recuperação completa dos layouts"): alternador
// Lista/Grade também no Catálogo, com preferência isolada da do Cadastro.
describe("Lista/Grade — alternador de visualização (Catálogo)", () => {
  // Desde 24/09 o padrão é Grade de 3 colunas (antes Lista, reunião 10/09); o usuário aceitou o estado atual em 04/11.
  it("padrão é Grade (3 colunas) para quem ainda não tem preferência salva; alternar pra Lista troca a apresentação sem perder categoria", async () => {
    renderPage();
    await screen.findByText("Site Institucional");
    expect(screen.queryByRole("table")).not.toBeInTheDocument(); // nunca virou tabela administrativa
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(document.querySelector(".grid")).toBeTruthy();

    await userEvent.click(screen.getByRole("button", { name: /Marketing/ }));
    await userEvent.click(screen.getByRole("button", { name: "Lista" }));
    expect(screen.getByRole("list")).toBeInTheDocument();
    expect(screen.queryByText("Site Institucional")).not.toBeInTheDocument(); // filtro de categoria preservado
    expect(screen.getByText("Landing Page")).toBeInTheDocument();
  });

  it("preferência já existente (Lista) é respeitada — não volta pra Grade por padrão", async () => {
    window.localStorage.setItem("allka:view-mode:admin-catalogo-produtos", "list");
    renderPage();
    await screen.findByText("Site Institucional");
    expect(screen.getByRole("list")).toBeInTheDocument();
  });

  it("preferência de visualização do Catálogo é isolada da do Cadastro (chaves de localStorage distintas)", async () => {
    renderPage();
    await screen.findByText("Site Institucional");
    await userEvent.click(screen.getByRole("button", { name: "4 colunas" }));
    expect(window.localStorage.getItem("allka:view-mode:admin-catalogo-produtos")).toBe("4");
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

// Desde 25/09 a ordenação fica DENTRO do botão de filtros (deploy-log: "botão Filtros só com ícone (a ordenação foi
// para dentro dele)"). "Mais vendidos"/"Melhor avaliados" desabilitados saíram nessa mudança (aceito em 04/11).
async function openFilters() {
  await userEvent.click(screen.getByRole("button", { name: "Filtros e ordenação" }));
  return screen.findByLabelText("Ordenar por");
}

describe("Ordenação — por dado real, nunca inventado", () => {
  it("Menor/Maior preço ordenam por price_amount REAL quando existe", async () => {
    renderPage();
    await screen.findByText("Site Institucional");
    await userEvent.selectOptions(await openFilters(), "Menor preço");
    const namesAsc = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(namesAsc.indexOf("Consultoria Express")).toBeLessThan(namesAsc.indexOf("Site Institucional"));

    await userEvent.selectOptions(screen.getByLabelText("Ordenar por"), "Maior preço");
    const namesDesc = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(namesDesc.indexOf("Site Institucional")).toBeLessThan(namesDesc.indexOf("Consultoria Express"));
  });

  it("'Menor preço' mantém na grade os produtos sem preço real (nunca somem)", async () => {
    renderPage();
    await screen.findByText("Site Institucional");
    await userEvent.selectOptions(await openFilters(), "Menor preço");
    // conta os cards (o painel de filtros aberto também tem um <h3> "Filtros")
    const names = screen.getAllByRole("button", { name: / — ver detalhes$/ }).map((c) => c.getAttribute("aria-label"));
    expect(names).toContain("Landing Page — ver detalhes");
    expect(names.length).toBe(4); // a fixture entra como os demais (decisão de 23/09)
  });

  it("as opções de ordenação usam só dados que existem no catalog2", async () => {
    renderPage();
    await screen.findByText("Site Institucional");
    const select = await openFilters();
    const labels = within(select).getAllByRole("option").map((o) => o.textContent);
    expect(labels).toEqual(expect.arrayContaining(["Nome A–Z", "Menor preço", "Maior preço", "Mais pendências"]));
    expect(labels.some((l) => /vendidos|avaliad/i.test(l ?? ""))).toBe(false);
  });
});

// Reunião 10/09 ("Cabeçalho e filtros do Catálogo de Produtos"), na versão de 25/09: busca, categorias com cor e
// contador, filtros+ordenação num único botão, badges de filtros ativos; nada duplicado.
describe("Cabeçalho e filtros reorganizados (Catálogo)", () => {
  it("badges de categorias reais mostram contador correto, incluindo 'Todos'", async () => {
    renderPage();
    await screen.findByText("Site Institucional");
    const todos = screen.getByRole("button", { name: /Todos/ });
    const performance = screen.getByRole("button", { name: /Performance/ });
    const marketing = screen.getByRole("button", { name: /Marketing/ });
    expect(within(todos).getByText("4")).toBeInTheDocument(); // a fixture conta como os demais (23/09)
    expect(within(performance).getByText("2")).toBeInTheDocument();
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

  it("painel de filtros abre com apenas filtros catalog2 reais (status + com preço/prazo/tarefas/etapas/pendências/faltando) e Aplicar/Limpar/Fechar", async () => {
    renderPage();
    await screen.findByText("Site Institucional");
    await openFilters();
    expect(screen.getByText("Com preço")).toBeInTheDocument();
    expect(screen.getByText("Com prazo")).toBeInTheDocument();
    expect(screen.getByText("Com tarefas")).toBeInTheDocument();
    expect(screen.getByText("Com etapas")).toBeInTheDocument();
    expect(screen.getByText("Com pendências")).toBeInTheDocument();
    expect(screen.getByText("Campos faltando")).toBeInTheDocument();
    expect(screen.getByLabelText("Status")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aplicar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Limpar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fechar" })).toBeInTheDocument();
    // nenhum filtro herdado do catálogo antigo sem equivalente catalog2
    expect(screen.queryByText(/avaliação|recorrência|código legado/i)).not.toBeInTheDocument();
  });

  it("aplicar 'Com pendências' filtra a grade; Limpar filtros restaura tudo", async () => {
    renderPage();
    await screen.findByText("Site Institucional");
    await openFilters();
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
    await openFilters();
    await userEvent.click(screen.getByText("Com tarefas"));
    await userEvent.click(screen.getByRole("button", { name: "Aplicar" }));

    const chip = screen.getByRole("button", { name: /Com tarefas/ });
    expect(chip).toBeInTheDocument();
    expect(screen.queryByText("Landing Page")).not.toBeInTheDocument(); // sem tarefas — filtrado

    await userEvent.click(chip);
    expect(screen.getByText("Landing Page")).toBeInTheDocument(); // filtro removido, volta a aparecer
  });

  it("nenhum controle duplicado: só uma busca, um botão de filtros/ordenação e uma linha de categorias", async () => {
    renderPage();
    await screen.findByText("Site Institucional");
    expect(screen.getAllByPlaceholderText(/Buscar produtos/i).length).toBe(1);
    expect(screen.getAllByRole("button", { name: "Filtros e ordenação" }).length).toBe(1);
    expect(screen.getAllByRole("button", { name: /^Todos/ }).length).toBe(1);
    await openFilters();
    expect(screen.getAllByLabelText("Ordenar por").length).toBe(1);
  });

  it("busca + categoria + filtro combinados funcionam juntos", async () => {
    renderPage();
    await screen.findByText("Site Institucional");
    await userEvent.click(screen.getByRole("button", { name: /Marketing/ }));
    await userEvent.type(screen.getByPlaceholderText(/Buscar produtos/i), "landing");
    await openFilters();
    await userEvent.click(screen.getByText("Com pendências"));
    await userEvent.click(screen.getByRole("button", { name: "Aplicar" }));
    expect(screen.getByText("Landing Page")).toBeInTheDocument();
    expect(screen.queryByText("Consultoria Express")).not.toBeInTheDocument();
    expect(screen.queryByText("Site Institucional")).not.toBeInTheDocument();
  });

  it("abrir e voltar do detalhe de um produto preserva busca, categoria e modo de visualização", async () => {
    renderPage();
    await screen.findByText("Site Institucional");
    await userEvent.click(screen.getByRole("button", { name: "Lista" }));
    await userEvent.click(screen.getByRole("button", { name: /Marketing/ }));
    await userEvent.type(screen.getByPlaceholderText(/Buscar produtos/i), "consultoria");
    await userEvent.click(screen.getByRole("button", { name: "Consultoria Express — ver detalhes" }));
    await userEvent.click(await screen.findByRole("button", { name: "Voltar ao catálogo" }));

    expect(await screen.findByPlaceholderText(/Buscar produtos/i)).toHaveValue("consultoria");
    expect(screen.getByRole("button", { name: /Marketing/ }).className).toContain("text-white");
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

  // A contratação aqui é só a do Admin Master em nome de empresa/agência (24/09); nunca cesta/checkout próprio.
  it("nenhuma cesta/checkout próprio aparece nesta tela — só a contratação em nome do cliente, no detalhe", async () => {
    renderPage();
    await screen.findByText("Site Institucional");
    expect(screen.queryByRole("button", { name: /contratar|adicionar à cesta|finalizar compra/i })).not.toBeInTheDocument();
    await userEvent.click(screen.getAllByRole("button", { name: /Ver detalhes/ })[0]);
    await screen.findByRole("button", { name: "Voltar ao catálogo" });
    expect(screen.queryByRole("button", { name: /adicionar à cesta|finalizar compra/i })).not.toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /Contratar em nome de empresa\/agência/ })).toBeInTheDocument();
  });
});

// Reunião 10/09 ("Cards e interação do catálogo"): card/linha inteiros clicáveis (mouse, Enter, Espaço), sem textos
// repetidos, badges comerciais reais sobre a imagem, fixture nunca com badge.
describe("Cards e interação (reunião 10/09)", () => {
  it("clicar em qualquer área livre do card (Grade) abre o detalhe completo", async () => {
    renderPage();
    await screen.findByText("Site Institucional");
    const card = screen.getByRole("button", { name: "Site Institucional — ver detalhes" });
    await userEvent.click(within(card).getByText("Site institucional completo."));
    expect(await screen.findByRole("button", { name: "Voltar ao catálogo" })).toBeInTheDocument();
  });

  it("Enter e Espaço no card focado abrem o detalhe", async () => {
    for (const key of ["{Enter}", " "]) {
      const { unmount } = renderPage();
      await screen.findByText("Site Institucional");
      const card = screen.getByRole("button", { name: "Site Institucional — ver detalhes" });
      card.focus();
      await userEvent.keyboard(key);
      expect(await screen.findByRole("button", { name: "Voltar ao catálogo" })).toBeInTheDocument();
      unmount();
    }
  });

  it("botão interno 'Ver detalhes' não dispara a abertura duas vezes (não propaga pro card)", async () => {
    renderPage();
    await screen.findByText("Site Institucional");
    const card = screen.getByRole("button", { name: "Site Institucional — ver detalhes" });
    await userEvent.click(within(card).getByRole("button", { name: /Ver detalhes/ }));
    expect(await screen.findByRole("button", { name: "Voltar ao catálogo" })).toBeInTheDocument();
    await screen.findByRole("heading", { level: 1, name: "Site Institucional" });
    expect(api.getCatalog2ProductDetailPreview).toHaveBeenCalledTimes(1);
  });

  it("ação principal do card é 'Ver detalhes'", async () => {
    renderPage();
    await screen.findByText("Site Institucional");
    expect(screen.getAllByRole("button", { name: /^Ver detalhes/ }).length).toBe(4);
  });

  it("código interno (slug/id) não ocupa espaço fixo no card — nunca 'ANTIGA #'", async () => {
    renderPage();
    await screen.findByText("Site Institucional");
    expect(screen.queryByText("p01-site-institucional")).not.toBeInTheDocument();
    expect(screen.queryByText(/ANTIGA #/i)).not.toBeInTheDocument();
  });

  it("cada informação (categoria, status, preço) aparece uma única vez por card — nada repetido", async () => {
    renderPage();
    await screen.findByText("Site Institucional");
    const card = screen.getByRole("button", { name: "Site Institucional — ver detalhes" });
    expect(within(card).getAllByText("Performance").length).toBe(1);
    expect(within(card).getAllByText("Ativo").length).toBe(1);
    expect(within(card).getAllByText("R$ 1.200,00").length).toBe(1);
  });

  it("badge comercial real ('Novo') aparece sobre a imagem quando o produto tem o dado real", async () => {
    renderPage();
    await screen.findByText("Site Institucional");
    const card = screen.getByRole("button", { name: "Site Institucional — ver detalhes" });
    const badge = within(card).getByText("Novo");
    const thumbWrapper = badge.closest(".relative");
    expect(thumbWrapper?.querySelector("img, svg")).toBeTruthy();
  });

  it("produto sem badge real não recebe badge comercial limpo — nunca finge dado comercial real", async () => {
    renderPage();
    await screen.findByText("Consultoria Express");
    const card = screen.getByRole("button", { name: "Consultoria Express — ver detalhes" });
    expect(within(card).queryByText(/^(Novo|Lançamento|Promoção|Destaque)$/)).not.toBeInTheDocument();
  });

  it("fixture '[TESTE LOCAL]' nunca recebe badge comercial", async () => {
    renderPage();
    const card = await screen.findByRole("button", { name: "[TESTE LOCAL] Demo — ver detalhes" });
    expect(within(card).queryByText(/^(Novo|Lançamento|Promoção|Destaque)/)).not.toBeInTheDocument();
  });

  it("texto cortado (nome/resumo) mostra o conteúdo completo via atributo acessível (title)", async () => {
    renderPage();
    await screen.findByText("Site Institucional");
    const card = screen.getByRole("button", { name: "Site Institucional — ver detalhes" });
    expect(within(card).getByText("Site Institucional")).toHaveAttribute("title", "Site Institucional");
    expect(within(card).getByText("Site institucional completo.")).toHaveAttribute("title", "Site institucional completo.");
  });

  it("Lista: a linha inteira é clicável (mouse e teclado) e preserva preço/prazo/status", async () => {
    renderPage();
    await screen.findByText("Site Institucional");
    await userEvent.click(screen.getByRole("button", { name: "Lista" }));
    const row = screen.getByRole("button", { name: /Site Institucional — ver detalhes/i });
    expect(row.tagName).toBe("LI");
    expect(within(row).getByText("R$ 1.200,00")).toBeInTheDocument();
    expect(within(row).getByText("10 dia(s)")).toBeInTheDocument();
    expect(within(row).getByText("Ativo")).toBeInTheDocument();
    row.focus();
    await userEvent.keyboard(" ");
    expect(await screen.findByRole("button", { name: "Voltar ao catálogo" })).toBeInTheDocument();
  });

  it("detalhe comercial completo: mostra erro claro quando a API falha (nunca tela em branco), com opção de tentar novamente", async () => {
    api.getCatalog2ProductDetailPreview.mockRejectedValueOnce(new Error());
    renderPage();
    await screen.findByText("Site Institucional");
    await userEvent.click(screen.getByRole("button", { name: "Site Institucional — ver detalhes" }));
    expect(await screen.findByText(/não foi possível carregar o detalhe/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Tentar novamente/i }));
    expect(await screen.findByRole("heading", { level: 1, name: "Site Institucional" })).toBeInTheDocument();
  });

  it("detalhe comercial completo: produto inexistente (404) mostra 'não encontrado' sem oferecer tentar novamente (repetir nunca resolveria)", async () => {
    api.getCatalog2ProductDetailPreview.mockRejectedValue(
      Object.assign(new Error("Produto não encontrado."), { status: 404 }),
    );
    renderPage();
    await screen.findByText("Site Institucional");
    await userEvent.click(screen.getByRole("button", { name: "Site Institucional — ver detalhes" }));
    expect(await screen.findByText("Produto não encontrado.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Tentar novamente/i })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Voltar" }));
    expect(await screen.findByPlaceholderText(/Buscar produtos/i)).toBeInTheDocument();
  });
});
