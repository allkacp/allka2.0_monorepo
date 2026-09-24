import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { SidebarProvider } from "@/contexts/sidebar-context"
import { OpenScreensProvider } from "@/contexts/open-screens-context"
import AdminProdutosPage from "@/app/admin/produtos/page"

// 2026-09 (consolidação catalog2): esta é a rota /admin/produtos ("Cadastro
// de Produtos"), antes /admin/produtos/novo-catalogo ("Preparação de
// Produtos") — mesmo componente, mesmos dados (catalog2), nome/rota novos.
// O construtor agora abre dentro do container padrão (EmbeddedSlideScreen +
// bandeja de telas), por isso o OpenScreensProvider.

function renderPage() {
  return render(
    <MemoryRouter>
      <SidebarProvider>
        <OpenScreensProvider>
          <AdminProdutosPage />
        </OpenScreensProvider>
      </SidebarProvider>
    </MemoryRouter>,
  )
}

// Construtor do novo catálogo (sprint de produtos, bloco 3/6).

const { api } = vi.hoisted(() => ({
  api: {
    getCurrentUser: vi.fn(),
    getCatalog2ProductPricingMemory: vi.fn(),
    getCatalog2Overview: vi.fn(),
    getCatalog2Pillars: vi.fn(),
    getCatalog2FourF: vi.fn(),
    getCatalog2Categories: vi.fn(),
    getCatalog2Specialties: vi.fn(),
    addCatalog2Specialty: vi.fn(),
    getCatalog2Questionnaires: vi.fn(),
    getCatalog2Questionnaire: vi.fn(),
    addCatalog2Questionnaire: vi.fn(),
    updateCatalog2Questionnaire: vi.fn(),
    addCatalog2QuestionnaireQuestion: vi.fn(),
    updateCatalog2QuestionnaireQuestion: vi.fn(),
    deleteCatalog2QuestionnaireQuestion: vi.fn(),
    reorderCatalog2QuestionnaireQuestions: vi.fn(),
    setCatalog2TaskQuestionnaire: vi.fn(),
    updateCatalog2TaskQuestionnaireContent: vi.fn(),
    searchCatalog2Tasks: vi.fn(),
    importCatalog2Task: vi.fn(),
    addCatalog2Task: vi.fn(),
    updateCatalog2Task: vi.fn(),
    deleteCatalog2Task: vi.fn(),
    duplicateCatalog2Task: vi.fn(),
    reorderCatalog2Tasks: vi.fn(),
    updateCatalog2TaskAI: vi.fn(),
    addCatalog2Step: vi.fn(),
    updateCatalog2Step: vi.fn(),
    deleteCatalog2Step: vi.fn(),
    reorderCatalog2Steps: vi.fn(),
    getCatalog2Products: vi.fn(),
    getCatalog2Product: vi.fn(),
    createCatalog2Product: vi.fn(),
    newCatalog2Version: vi.fn(),
    setCatalog2ProductStatus: vi.fn(),
    archiveCatalog2Product: vi.fn(),
    previewCatalog2ProductInactivation: vi.fn(),
    scheduleCatalog2ProductInactivation: vi.fn(),
    cancelCatalog2ProductInactivation: vi.fn(),
    getCatalog2ProductPeriods: vi.fn().mockResolvedValue({ data: [
      { period: "mensal", label: "Mensal", months: 1, configured: false, is_active: false, discount_percent: null, updated_at: null },
      { period: "trimestral", label: "Trimestral", months: 3, configured: false, is_active: false, discount_percent: null, updated_at: null },
      { period: "semestral", label: "Semestral", months: 6, configured: false, is_active: false, discount_percent: null, updated_at: null },
      { period: "anual", label: "Anual", months: 12, configured: false, is_active: false, discount_percent: null, updated_at: null },
    ] }),
    updateCatalog2ProductPeriod: vi.fn(),
    removeCatalog2ProductPeriod: vi.fn(),
    updateCatalog2VersionInfo: vi.fn(),
    validateCatalog2Version: vi.fn(),
    publishCatalog2Version: vi.fn(),
    simulateCatalog2: vi.fn(),
    previewCatalog2Version: vi.fn(),
    getCatalog2PricingSettings: vi.fn(),
    updateCatalog2PricingSettings: vi.fn(),
    updateCatalog2Specialty: vi.fn(),
    addCatalog2Variation: vi.fn(),
    deleteCatalog2Variation: vi.fn(),
    getCatalog2ImportSummary: vi.fn(),
    getCatalog2Readiness: vi.fn(),
    getCatalog2ProductReadiness: vi.fn(),
    getCatalog2ProductDetailPreview: vi.fn(),
    getCatalog2ProductOrigin: vi.fn(),
    resolveCatalog2Pendency: vi.fn(),
  },
}))
vi.mock("@/lib/api-client", () => ({ apiClient: api }))

const REFS = {
  pillars: { data: [{ id: "p1", name: "A. Presença" }] },
  fourF: { data: [{ id: "f1", name: "F1 — Fundação" }] },
  categories: { data: [{ id: "c1", name: "Performance" }] },
  specialties: { data: [{ id: "s1", name: "Designer", max_hourly_rate: 90 }] },
}
const OVERVIEW = {
  counts: {
    products: 37, pillars: 5, four_f: 4, categories: 5, specialties: 7, draft_versions: 36,
    imported_products: 36, test_local_products: 1, final_imported_products: 36,
    products_in_preparation: 36, products_published: 1,
    tasks: 2, steps: 3, tasks_in_final_imported: 0, steps_in_final_imported: 0,
    products_with_pendencies: 36,
  },
  import: {
    has_import: true, applied_batch_count: 3, last_applied_at: new Date().toISOString(),
    expected: 36, imported_count: 36, final_imported_count: 36, published_count: 1, in_preparation_count: 36,
    message: "36 produto(s) importado(s) para preparação. Aguardando tarefas, prazos, precificação e revisão para publicação.",
  },
  products_by_status: { em_preparacao: 36, disponivel: 1 },
  is_empty: false,
  empty_message: "O novo catálogo está preparado. Nenhum produto importado ainda.",
}
const LIST = {
  data: [
    { id: "prod1", internal_name: "[TESTE LOCAL] Demo", slug: "demo", pillar: { name: "A. Presença" }, category: { name: "Performance" }, origin: "novo", status: "disponivel", published_version_number: 1, published_at: new Date().toISOString(), has_draft: true, is_new: true, updated_at: new Date().toISOString(), imported: true, rose_reviewed: true, review_state: "price_pending", pendencies: ["price_pending", "portfolio_pending"], human_edited: false, source_index: 3 },
  ],
  total: 1,
  page: 1,
  page_size: 15,
}
const IMPORT_SUMMARY = {
  has_import: true,
  total_imported: 36,
  expected: 36,
  count_matches_expected: true,
  rose_reviewed: 21,
  not_rose_reviewed: 15,
  human_edited: 0,
  decisions_pending: 5,
  published_count: 0,
  by_review_state: { content_review_pending: 36 },
  by_pendency: { price_pending: 36, portfolio_pending: 36, content_review_pending: 36 },
  last_batch: { rule_version: "36-produtos-2", status: "completed", source_main: { name: "Allka_Proposta_Catalogo_Produtos_v9.xlsx", checksum: "dc38d2e90345f32735" } },
}
const ORIGIN = {
  source: { key: "catalogo_v9:3", index: 3, name: "[TESTE LOCAL] Demo" },
  rose_reviewed: true,
  area_rose: "Designer",
  review_state: "price_pending",
  pendencies: ["price_pending", "portfolio_pending"],
  main_fields: { name: "[TESTE LOCAL] Demo", category: "Performance" },
  rose_fields: { descricao_atualizada: "texto da Rose" },
  rose_changed_fields: ["descricao_atualizada"],
  divergences: [{ type: "name_updated_seo_geo", detail: "SEO → SEO + GEO", decision_pending: false }],
  original_texts: { variations_raw: "texto livre preservado" },
  observations: null,
  historical_price: { min: 500, max: 900, note: "Referência histórica da planilha — NÃO é o preço final." },
  human_edited_at: null,
  last_import_checksum: "abc123def456",
  resolutions: [],
}

function productDetail(over: Partial<any> = {}) {
  return {
    id: "prod1",
    internal_name: "[TESTE LOCAL] Demo",
    slug: "demo",
    status: "disponivel",
    is_new: true,
    published_version_id: "v1",
    pillar: { id: "p1", name: "A. Presença" },
    category: { id: "c1", name: "Performance" },
    four_f: [{ id: "f1", name: "F1 — Fundação" }],
    versions: [
      { id: "v2", version_number: 2, state: "rascunho", title: "Demo v2", summary: "", full_description: "", change_summary: "", variations: [], addons: [], conditions: [], tasks: [], history: [] },
      {
        id: "v1", version_number: 1, state: "publicada", is_published_current: true, published_at: new Date().toISOString(),
        title: "Demo v1", summary: "s", full_description: "d",
        variations: [{ id: "va1", key: "formato", name: "Formato", is_required: true, options: [{ id: "o1", key: "estatico", label: "Estático", is_default: true, effects: [] }] }],
        addons: [{ id: "ad1", key: "extra", name: "Extra", effects: [] }],
        conditions: [{ id: "cd1", key: "u", name: "Urgente", is_active: true, explanation: "Se o atributo \"urgente\" for igual a \"sim\", somar 20% ao valor." }],
        tasks: [{ id: "t1", key: "t1", name: "Tarefa 1", sort_order: 1, execution_mode: "humano", estimated_minutes: 60, is_conditional: false, requires_review: false, steps: [{ id: "st1", key: "a", name: "Passo A", sort_order: 1 }], specialty: null, ai: null, depends_on: [] }],
        history: [{ event_type: "published", note: "Publicação inicial.", at: new Date().toISOString() }],
      },
    ],
    ...over,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  window.localStorage.clear()
  api.getCurrentUser.mockResolvedValue({ id: "u1", account_type: "admin", admin_profile: { is_active: true, is_master: true } })
  api.getCatalog2Overview.mockResolvedValue(OVERVIEW)
  api.getCatalog2Pillars.mockResolvedValue(REFS.pillars)
  api.getCatalog2FourF.mockResolvedValue(REFS.fourF)
  api.getCatalog2Categories.mockResolvedValue(REFS.categories)
  api.getCatalog2Specialties.mockResolvedValue(REFS.specialties)
  api.getCatalog2Questionnaires.mockResolvedValue({ data: [] })
  api.getCatalog2Products.mockResolvedValue(LIST)
  api.getCatalog2ImportSummary.mockResolvedValue(IMPORT_SUMMARY)
  api.getCatalog2Readiness.mockResolvedValue(null)
  api.getCatalog2ProductReadiness.mockResolvedValue({
    id: "prod1", name: "[TESTE LOCAL] Demo", is_test_local: true, imported: true,
    status: "disponivel", published: true, task_count: 1, step_count: 1, has_active_tasks: true,
    items: {
      tarefas: { level: "pronto", note: "1 tarefa(s)." },
      etapas: { level: "pronto", note: "1 etapa(s)." },
      preco: { level: "pronto", note: "Preço comercial BRL 90." },
      prazo: { level: "pronto", note: "Prazo comercial 5 dia(s)." },
      conteudo: { level: "pronto", note: "Conteúdo revisável." },
      portfolio: { level: "pronto", note: "Portfólio ok / não aplicável." },
      classificacao: { level: "pronto", note: "A. Presença / Performance / 1 4F" },
      revisao_rose: { level: "pronto", note: "Revisado pela Rose." },
      publicacao: { level: "pronto", note: "v1 publicada." },
    },
    blockers: [], pendings: [],
  })
  api.getCatalog2ProductDetailPreview.mockResolvedValue({
    product: {
      id: "prod1", slug: "demo", internal_name: "[TESTE LOCAL] Demo", status: "disponivel",
      category: { name: "Performance" }, published_version_id: "v1",
      versions: [{ id: "v1", state: "publicada", summary: "Resumo real", full_description: "Descrição completa real.", variations: [], tasks: [] }],
    },
    readiness: {
      task_count: 1, step_count: 1, price_amount: 90, deadline_days: 5,
      provisional: null,
    },
  })
  api.getCatalog2ProductOrigin.mockResolvedValue(ORIGIN)
  api.resolveCatalog2Pendency.mockResolvedValue({ ok: true, remaining_pendencies: ["portfolio_pending"], review_state: "portfolio_pending" })
  api.getCatalog2Product.mockResolvedValue(productDetail())
  api.validateCatalog2Version.mockResolvedValue({ ok: false, issues: ["Selecione um pilar."], pricing_pending: true })
  api.simulateCatalog2.mockResolvedValue({ pricing: { currency: "BRL", quantity: 1, active_task_keys: ["t1"], warnings: [], applied_conditions: [], deadline_detail: "…", estimated_deadline_days: 1, order_defined: true, applied_order: ["tax", "commission", "operational", "margin"], pending_info: [], deadline: { effort_days: 1, internal_estimate_days: 1, commercial_deadline_days: 5, commercial_deadline_pending: false }, pricing_pending: false, lines: { human_cost: { label: "Custo humano", amount: 90 }, ia_cost: { label: "IA", amount: 0 }, human_review_cost: { label: "Revisão humana", amount: 0 }, addons: { label: "Adicionais", amount: 0 }, variation_impacts: { label: "Impactos de variações", amount: 0 }, condition_impacts: { label: "Impactos de condições", detail: "nenhuma" }, direct_cost: { label: "Custo direto", amount: 90 }, subtotal_cost: { label: "Subtotal", amount: 90 }, taxes_and_margins: [], commercial_final_price: { label: "Preço comercial final", amount: 90 }, final_price: { label: "Preço comercial final", amount: 90 }, minimum_price: { label: "Mínimo", amount: 90 } } } })
  api.previewCatalog2Version.mockResolvedValue({ name: "[TESTE LOCAL] Demo", title: "Demo v1", description: "d", pillar: "A. Presença", category: "Performance", four_f: ["F1 — Fundação"], variations: [{ name: "Formato", options: ["Estático"] }], addons: [{ name: "Extra" }], tasks: [{ name: "Tarefa 1", mode: "humano" }], estimated_deadline_days: 1, commercial_deadline_pending: false, effort_days: 1, price: 90, price_pending: false, pending_info: [], currency: "BRL" })
  api.getCatalog2PricingSettings.mockResolvedValue({ id: "default", tax_percent: 6, commission_percent: 10, operational_fee_percent: 5, profit_margin_percent: 30, human_review_percent: 15, currency: "BRL" })
})

it("Admin comum → mensagem de acesso restrito (404)", async () => {
  api.getCatalog2Overview.mockRejectedValue(Object.assign(new Error("x"), { status: 404 }))
  renderPage()
  expect(await screen.findByText(/exclusiva do Admin Master/i)).toBeInTheDocument()
})

it("título e menu: 'Cadastro de Produtos' (não mais 'Preparação de Produtos'/'Novo Catálogo')", async () => {
  renderPage()
  expect(await screen.findByRole("heading", { name: "Cadastro de Produtos" })).toBeInTheDocument()
  expect(screen.queryByText(/novo cat[áa]logo/i)).not.toBeInTheDocument()
  expect(screen.queryByRole("heading", { name: "Preparação de Produtos" })).not.toBeInTheDocument()
  expect(screen.getByText(/produtos e serviços da plataforma \(catalog2\)/i)).toBeInTheDocument()
})

// Reparo 2026-09 seguinte: layout administrativo aprovado (banner padrão,
// abas de filtro rápido, tabela) restaurado — ver a1 (auditoria pelo
// histórico Git de a809971, commit anterior a c86eaa2).
it("layout recuperado: banner padrão (StandardPageBanner), abas de filtro rápido e tabela (não mais <ul> avulsa)", async () => {
  renderPage()
  await screen.findByText("[TESTE LOCAL] Demo")
  // StandardPageBanner: título dentro de um <h1>, ícone circular com
  // gradiente — mesmo componente usado em /admin/empresas e outras telas.
  const heading = screen.getByRole("heading", { name: "Cadastro de Produtos" })
  expect(heading.className).toMatch(/font-bold/)
  // Abas de filtro rápido — "Todos os produtos"/"Ativos"/"Em preparação"/
  // "Com pendências"/"Categorias", cada uma com contador.
  for (const label of ["Todos os produtos", "Ativos", "Em preparação", "Com pendências", "Categorias"]) {
    expect(screen.getByText(label)).toBeInTheDocument()
  }
  // Tabela de verdade (thead/tbody com colunas), não mais uma lista <ul>.
  expect(screen.getByRole("table")).toBeInTheDocument()
  expect(screen.getByRole("columnheader", { name: "Produto" })).toBeInTheDocument()
  expect(screen.getByRole("columnheader", { name: "Status" })).toBeInTheDocument()
  expect(screen.getByRole("columnheader", { name: "Ações" })).toBeInTheDocument()
})

// Reparo 2026-09 seguinte ("recuperação completa dos layouts"): o
// alternador Lista/Grade (2–5 colunas) tinha sumido na primeira restauração.
describe("Lista/Grade — alternador de visualização (Cadastro)", () => {
  it("padrão é Lista (tabela); alternar pra Grade troca pra cards, preservando busca/filtros/página", async () => {
    renderPage()
    await screen.findByText("[TESTE LOCAL] Demo")
    expect(screen.getByRole("table")).toBeInTheDocument()

    await userEvent.type(screen.getByPlaceholderText(/Buscar por nome/i), "demo")
    await waitFor(() => expect(api.getCatalog2Products).toHaveBeenCalledWith(expect.objectContaining({ q: "demo" })))

    await userEvent.click(screen.getByRole("button", { name: "3 colunas" }))
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
    // busca continua no campo — não foi limpa pela troca de modo
    expect(screen.getByPlaceholderText(/Buscar por nome/i)).toHaveValue("demo")
    // o card em modo grade também abre o construtor
    await userEvent.click(screen.getByRole("button", { name: /abrir\/editar produto|continuar configuração/i }))
    expect(await screen.findByText("Título comercial")).toBeInTheDocument()
  })

  it("ajuste de colunas: 2/3/4/5 colunas produzem classes de grid diferentes", async () => {
    renderPage()
    await screen.findByText("[TESTE LOCAL] Demo")
    await userEvent.click(screen.getByRole("button", { name: "5 colunas" }))
    const grid = document.querySelector(".grid.grid-cols-2") as HTMLElement | null
    expect(grid).toBeTruthy()
    await userEvent.click(screen.getByRole("button", { name: "2 colunas" }))
    const grid2 = document.querySelector(".grid.grid-cols-1.sm\\:grid-cols-2") as HTMLElement | null
    expect(grid2).toBeTruthy()
  })

  it("persiste em localStorage (chave isolada do Cadastro) e sobrevive a um novo mount (equivalente a F5)", async () => {
    const { unmount } = renderPage()
    await screen.findByText("[TESTE LOCAL] Demo")
    await userEvent.click(screen.getByRole("button", { name: "4 colunas" }))
    expect(window.localStorage.getItem("allka:view-mode:admin-produtos")).toBe("4")
    unmount()

    renderPage()
    await screen.findByText("[TESTE LOCAL] Demo")
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
    expect(document.querySelector(".grid")).toBeTruthy()
  })

  it("abrir e fechar o construtor preserva o modo de visualização escolhido", async () => {
    renderPage()
    await screen.findByText("[TESTE LOCAL] Demo")
    await userEvent.click(screen.getByRole("button", { name: "3 colunas" }))
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: /abrir\/editar produto|continuar configuração/i }))
    await screen.findByText("Título comercial")
    await userEvent.click(screen.getByRole("button", { name: "Voltar" }))
    await screen.findByPlaceholderText(/Buscar por nome/i)
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
  })
})

it("clicar na aba 'Ativos' filtra a listagem (status=disponivel) sem precisar abrir 'Filtros'", async () => {
  renderPage()
  await screen.findByText("[TESTE LOCAL] Demo")
  await userEvent.click(screen.getByText("Ativos"))
  await waitFor(() => expect(api.getCatalog2Products).toHaveBeenCalledWith(expect.objectContaining({ status: "disponivel" })))
})

it("editor: mostra os seis status em português e só persiste a escolha ao clicar em Salvar status", async () => {
  const user = userEvent.setup()
  api.setCatalog2ProductStatus.mockResolvedValue({ ok: true, status: "pre_lancamento" })
  renderPage()
  await screen.findByText("[TESTE LOCAL] Demo")
  await user.click(await screen.findByRole("button", { name: /abrir\/editar produto|continuar configuração/i }))

  const status = await screen.findByRole("combobox", { name: "Status do produto" })
  expect(within(status).getByRole("option", { name: "Em preparação" })).toBeInTheDocument()
  expect(within(status).getByRole("option", { name: "Pré-lançamento" })).toBeInTheDocument()
  expect(within(status).getByRole("option", { name: "Ativo" })).toBeInTheDocument()
  expect(within(status).getByRole("option", { name: "Pausado" })).toBeInTheDocument()
  expect(within(status).getByRole("option", { name: "Esgotado temporariamente" })).toBeInTheDocument()
  expect(within(status).getByRole("option", { name: "Inativo" })).toBeInTheDocument()

  await user.selectOptions(status, "pre_lancamento")
  expect(api.setCatalog2ProductStatus).not.toHaveBeenCalled()
  await user.click(screen.getByRole("button", { name: "Salvar status" }))
  await waitFor(() => expect(api.setCatalog2ProductStatus).toHaveBeenCalledWith("prod1", "pre_lancamento"))
})

it("editor: publicação fica bloqueada quando há pendência estrutural, mesmo que também exista pendência comercial", async () => {
  const user = userEvent.setup()
  api.validateCatalog2Version.mockResolvedValue({
    ok: false,
    issues: ["Selecione um pilar.", "Preço comercial pendente."],
    pricing_pending: true,
    force_allowed: false,
  })
  renderPage()
  await screen.findByText("[TESTE LOCAL] Demo")
  await user.click(await screen.findByRole("button", { name: /abrir\/editar produto|continuar configuração/i }))
  await user.click(screen.getByRole("tab", { name: "Revisão e publicação" }))
  await user.click(screen.getByRole("tab", { name: "Publicação e versões" }))

  expect(await screen.findByText("Selecione um pilar.")).toBeInTheDocument()
  expect(screen.getByRole("button", { name: "Publicar versão" })).toBeDisabled()
})

// Bug real reportado 2026-09-11: "Com pendências" reusava o mesmo estado
// de "Categorias" — clicar nela nunca filtrava nada, só reabria/fechava o
// painel de "Categorias" (a interface "permanecia ou retornava para
// Categorias"). Cada aba agora tem identidade e estado próprios.
it("bug real: 'Com pendências' filtra de verdade (has_pendencies=true), fica visualmente ativa, e 'Categorias' deixa de estar ativa", async () => {
  renderPage()
  await screen.findByText("[TESTE LOCAL] Demo")

  const pendenciasTab = screen.getByText("Com pendências").closest("button") as HTMLElement
  const categoriasTab = screen.getByText("Categorias").closest("button") as HTMLElement

  await userEvent.click(pendenciasTab)
  // filtra de verdade — vai ao backend com has_pendencies=true
  await waitFor(() => expect(api.getCatalog2Products).toHaveBeenCalledWith(expect.objectContaining({ has_pendencies: "true" })))
  // fica visualmente ativa (mesma classe de cor usada nas outras abas ativas)
  expect(pendenciasTab.className).toContain("text-blue-600")
  // "Categorias" não fica ativa junto, e o painel dela não abre sozinho
  expect(categoriasTab.className).not.toContain("text-blue-600")
  expect(screen.queryByLabelText("Pilar")).not.toBeInTheDocument()

  // busca e ordenação continuam funcionando com o filtro ativo
  await userEvent.type(screen.getByPlaceholderText(/Buscar por nome/i), "demo")
  await waitFor(() => expect(api.getCatalog2Products).toHaveBeenCalledWith(expect.objectContaining({ has_pendencies: "true", q: "demo" })))

  // clicar em "Todos os produtos" limpa o filtro de pendências
  await userEvent.click(screen.getByText("Todos os produtos"))
  await waitFor(() => expect(api.getCatalog2Products).toHaveBeenCalledWith(expect.objectContaining({ has_pendencies: undefined })))
  expect(pendenciasTab.className).not.toContain("text-blue-600")
})

// Bug real reportado 2026-09-11: o contador ("36 produtos") vem de
// /overview — uma chamada INDEPENDENTE da listagem (/products) — então ele
// continua certo mesmo quando a listagem falha em mostrar linhas. Isso
// acontece quando `page` fica acima do total de páginas válido pro total
// ATUAL (ex.: o total caiu de um valor maior — como nos 162 antigos — para
// 36, enquanto a página selecionada continuava a mesma): a API responde com
// `total` correto e `data: []`, porque a página pedida não existe mais.
it("bug real: contador mostra 36 produtos mas tabela/grade ficam vazias (página antiga inválida após o total cair) — corrige sozinho, sem F5", async () => {
  // Simula a API real: pagina de verdade por `page`/`page_size`, com um
  // total GRANDE na 1ª chamada (equivalente aos 162 antigos / a um total
  // anterior) e, a partir da 2ª chamada em diante, o total real de 36 —
  // sem que nenhum filtro rastreado (status/busca/ordenação) tenha mudado.
  const ALL_36 = Array.from({ length: 36 }, (_, i) => ({
    id: `real-${i}`, internal_name: `Produto real ${i}`, slug: `produto-${i}`,
    pillar: { name: "A. Presença" }, category: { name: "Performance" }, origin: "novo",
    status: "em_preparacao", published_version_number: null, published_at: null,
    has_draft: true, is_new: false, updated_at: new Date().toISOString(),
    imported: true, rose_reviewed: true, review_state: "content_review_pending",
    pendencies: [], human_edited: false, source_index: i,
  }))
  let call = 0
  api.getCatalog2Products.mockImplementation(async (params: any) => {
    call++
    const pageSize = 15
    const page = Number(params?.page) || 1
    // 1ª chamada (mount, page=1): total "antigo", bem maior que 36 — é o
    // que faz o botão "5" existir e ser clicável.
    if (call === 1) {
      const old = Array.from({ length: 90 }, (_, i) => ({ ...ALL_36[i % 36], id: `old-${i}` }))
      return { data: old.slice(0, pageSize), total: 90, page: 1, page_size: pageSize }
    }
    // Da 2ª chamada em diante o total real (36) já está valendo — SEM
    // nenhum filtro rastreado (status/busca/ordenação) ter mudado. Se a
    // página pedida (5) não existe mais no total novo, vem "total certo,
    // data vazia" — exatamente o bug relatado.
    const total = ALL_36.length
    const start = (page - 1) * pageSize
    return { data: ALL_36.slice(start, start + pageSize), total, page, page_size: pageSize }
  })

  renderPage()
  await screen.findByText("Produto real 0")

  // usuário navega pra uma página só válida no total "antigo" (90 → 6
  // páginas) — a paginação aparece espelhada (topo + rodapé), usa a 1ª.
  await userEvent.click(screen.getAllByRole("button", { name: "5" })[0])
  // reproduz o bug: a API respondeu total=36 (contador bateria com "36"),
  // mas data=[] porque a página 5 não existe mais pro total real (3 páginas).
  await waitFor(() => expect(api.getCatalog2Products).toHaveBeenCalledWith(expect.objectContaining({ page: 5 })))

  // a tela se corrige sozinha — nunca fica "36 produtos, tabela vazia"
  await waitFor(() => {
    expect(screen.getAllByText(/Produto real/).length).toBeGreaterThan(0)
  })
  const calledPages = api.getCatalog2Products.mock.calls.map((c: any[]) => c[0]?.page)
  expect(calledPages[calledPages.length - 1]).toBeLessThanOrEqual(3)
})

// Bug real reportado 2026-09-11 (evidência real de tela): aba "Todos os
// produtos" mostrava 36, busca vazia, "página 1 de 1", mas a listagem vinha
// com 0 itens e nenhum produto renderizado. Diagnóstico com execução local
// real (container Docker do backend) mostrou que /api/admin/catalog2/products
// respondia 500 (Prisma Client do container desatualizado, sem o campo
// `provisional_preview` adicionado numa fase anterior) — corrigido
// regenerando o Prisma Client e reiniciando o container. O bug de CÓDIGO
// remanescente: essa falha virava silenciosamente "Nenhum produto
// encontrado", indistinguível de um filtro que realmente não bate com nada
// — o contador ("36", vindo de /overview, uma chamada separada que não
// falha junto) continuava certo, escondendo que a listagem tinha quebrado.
it("bug real: falha real na listagem (ex.: erro 500 do backend) aparece como ERRO, nunca como 'Nenhum produto encontrado' silencioso", async () => {
  // mesma chamada exata que a aba 'Todos' envia (sem filtro nenhum ativo)
  api.getCatalog2Products.mockRejectedValueOnce(new Error("Erro interno do servidor"))
  renderPage()

  expect(await screen.findByText(/Erro ao carregar a lista de produtos/i)).toBeInTheDocument()
  expect(screen.queryByText("Nenhum produto encontrado")).not.toBeInTheDocument()

  // "Tentar novamente" refaz a MESMA chamada e, com o backend saudável,
  // os produtos aparecem — sem precisar de F5.
  api.getCatalog2Products.mockResolvedValueOnce(LIST)
  await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }))
  expect(await screen.findByText("[TESTE LOCAL] Demo")).toBeInTheDocument()
  expect(screen.queryByText(/Erro ao carregar a lista de produtos/i)).not.toBeInTheDocument()
})

it("listagem: mostra produtos catalog2, situação, etiqueta Novo, e nunca os 162 antigos", async () => {
  renderPage()
  expect(await screen.findByText("[TESTE LOCAL] Demo")).toBeInTheDocument()
  expect(screen.getByText(/não conta os 162 operacionais/i)).toBeInTheDocument()
  expect(screen.getByText(/catálogo antigo, com 162 produtos, não aparece mais aqui/i)).toBeInTheDocument()
  expect(screen.getByText("Novo")).toBeInTheDocument()
  expect(screen.getAllByText("Ativo").length).toBeGreaterThan(0)
  // busca é passada ao backend
  await userEvent.type(screen.getByPlaceholderText(/Buscar por nome/i), "demo")
  await waitFor(() => expect(api.getCatalog2Products).toHaveBeenCalledWith(expect.objectContaining({ q: "demo" })))
})

it("resumo de status único: um só bloco descreve 'em preparação' e o que falta", async () => {
  renderPage()
  await screen.findByText("[TESTE LOCAL] Demo")
  expect(screen.getByText(/produtos da plataforma, ainda/i)).toBeInTheDocument()
  expect(screen.getAllByText(/em prepara/i).length).toBeGreaterThan(0)
  expect(screen.getByText(/catálogo antigo, com 162 produtos, não aparece mais aqui/i)).toBeInTheDocument()
})

it("construtor abre dentro do container padrão (EmbeddedSlideScreen, com botão de fixar na bandeja) e Voltar fecha sem sair da lista", async () => {
  const user = userEvent.setup()
  renderPage()
  await screen.findByText("[TESTE LOCAL] Demo")
  await user.click(await screen.findByRole("button", { name: /abrir\/editar produto|continuar configuração/i }))
  expect(await screen.findByText("Título comercial")).toBeInTheDocument()
  expect(screen.getByRole("button", { name: /adicionar à bandeja de telas/i })).toBeInTheDocument()
  await user.click(screen.getByRole("button", { name: "Voltar" }))
  expect(await screen.findByPlaceholderText(/Buscar por nome/i)).toBeInTheDocument()
})

it("construtor: mostra aviso de campos provisórios quando o produto ainda não tem preço/tarefas reais", async () => {
  api.getCatalog2Readiness.mockResolvedValue({
    ready_for_client: 0, total: 1, client_visible_now: 0, with_blockers: 1, note: "",
    products: [{ id: "prod1", name: "[TESTE LOCAL] Demo", task_count: 0, price_amount: null, blockers: [], pendings: [] }],
  })
  renderPage()
  await screen.findByText("[TESTE LOCAL] Demo")
  await userEvent.click(screen.getByRole("button", { name: /abrir\/editar produto|continuar configuração/i }))
  await screen.findByText("Título comercial")
  expect(await screen.findByText(/campos provisórios/i)).toBeInTheDocument()
})

it("reunião 10/09: produto com esforço provisório mostra 'Especialidade e tempo provisórios para teste' na listagem", async () => {
  api.getCatalog2Readiness.mockResolvedValue({
    ready_for_client: 0, total: 1, client_visible_now: 0, with_blockers: 1, note: "",
    products: [{ id: "prod1", name: "[TESTE LOCAL] Demo", task_count: 1, price_amount: null, blockers: [], pendings: [], functional_for_test: true }],
  })
  renderPage()
  await screen.findByText("[TESTE LOCAL] Demo")
  expect(await screen.findByLabelText(/Especialidade e tempo provisórios para teste/i)).toBeInTheDocument()
})

it("editor: as 10 seções seguem acessíveis, reagrupadas em 5 etapas + Origem", async () => {
  const user = userEvent.setup()
  renderPage()
  await screen.findByText("[TESTE LOCAL] Demo")
  await user.click(await screen.findByRole("button", { name: /abrir\/editar produto|continuar configuração/i }))

  // 5 etapas de trabalho + área secundária de origem
  expect(await screen.findByRole("tab", { name: "Informações do produto" })).toBeInTheDocument()
  expect(screen.getByRole("tab", { name: "Classificação e opções" })).toBeInTheDocument()
  expect(screen.getByRole("tab", { name: "Entrega: tarefas, etapas e prazos" })).toBeInTheDocument()
  expect(screen.getByRole("tab", { name: "Custos e preço" })).toBeInTheDocument()
  expect(screen.getByRole("tab", { name: "Revisão e publicação" })).toBeInTheDocument()
  expect(screen.getByRole("tab", { name: "Origem e importação" })).toBeInTheDocument()

  // Informações do produto (ex-"1. Geral") abre por padrão
  expect(await screen.findByText("Título comercial")).toBeInTheDocument()

  // Classificação e opções → 3 sub-abas, cada painel renderiza
  await user.click(screen.getByRole("tab", { name: "Classificação e opções" }))
  await user.click(await screen.findByRole("tab", { name: /^Classificação$/ }))
  // "Classificações 4F" também é o rótulo de um card na LISTAGEM por trás
  // (agora sempre montada — o construtor abre em overlay, não mais troca de
  // tela cheia) — desambiguar pelo <span> do campo do editor.
  expect(await screen.findByText("Classificações 4F", { selector: "span" })).toBeInTheDocument()
  await user.click(screen.getByRole("tab", { name: /^Variações$/ }))
  expect(await screen.findByText(/Escolhas OBRIGATÓRIAS/i)).toBeInTheDocument()
  await user.click(screen.getByRole("tab", { name: /^Adicionais$/ }))
  expect(await screen.findByText(/Escolhas OPCIONAIS/i)).toBeInTheDocument()

  // Entrega → tarefas/etapas + prazos/condições, cada painel renderiza
  await user.click(screen.getByRole("tab", { name: "Entrega: tarefas, etapas e prazos" }))
  await user.click(await screen.findByRole("tab", { name: /^Tarefas e etapas$/ }))
  expect(await screen.findByText(/Modelos do catálogo/i)).toBeInTheDocument()
  await user.click(screen.getByRole("tab", { name: /^Prazos e condições$/ }))
  expect(await screen.findByText(/Regras tipadas/i)).toBeInTheDocument()

  // Revisão e publicação → pré-visualização + publicação/versões
  await user.click(screen.getByRole("tab", { name: "Revisão e publicação" }))
  expect(await screen.findByRole("tab", { name: /^Pré-visualização$/ })).toBeInTheDocument()
  expect(screen.getByRole("tab", { name: /^Publicação e versões$/ })).toBeInTheDocument()
})

// Reunião 2026-09-14 (Item 3 — "Cadastro integrado do produto"): o admin
// precisa criar/vincular tarefa, etapas, questionário e especialidade SEM
// sair do cadastro. Mock STATEFUL de getCatalog2Product — cada ação muta um
// "banco" em memória e o próximo load() devolve o estado atualizado, pra
// provar que "salvar, fechar e reabrir" preserva os vínculos de verdade
// (não só que os métodos da API foram chamados).
function statefulDraftProduct() {
  const base = productDetail()
  const draft = base.versions.find((v: any) => v.id === "v2")
  draft.tasks = []
  return base
}

describe("Cadastro integrado do produto (Item 3, reunião 2026-09-14)", () => {
  it("criar tarefa nova, adicionar e editar etapa, criar especialidade nova, criar e vincular questionário — tudo fica visível ao reabrir", async () => {
    const user = userEvent.setup()
    let db = statefulDraftProduct()
    api.getCatalog2Product.mockImplementation(async () => JSON.parse(JSON.stringify(db)))

    let taskSeq = 0
    api.addCatalog2Task.mockImplementation(async (versionId: string, body: any) => {
      const v = db.versions.find((x: any) => x.id === versionId)
      const task = { id: `t-new-${++taskSeq}`, key: body.key, name: body.name, sort_order: 99, execution_mode: "humano", estimated_minutes: null, is_conditional: false, requires_review: false, specialty: null, questionnaire: null, ai: null, depends_on: [], steps: [] }
      v.tasks.push(task)
      return task
    })
    api.addCatalog2Step.mockImplementation(async (taskId: string, body: any) => {
      const task = db.versions.flatMap((v: any) => v.tasks).find((t: any) => t.id === taskId)
      const step = { id: `s-new-${task.steps.length + 1}`, key: body.key, name: body.name, sort_order: task.steps.length + 1, estimated_minutes: body.estimated_minutes ?? null, is_conditional: false }
      task.steps.push(step)
      return step
    })
    api.updateCatalog2Step.mockImplementation(async (stepId: string, body: any) => {
      const step = db.versions.flatMap((v: any) => v.tasks).flatMap((t: any) => t.steps).find((s: any) => s.id === stepId)
      Object.assign(step, body)
      return step
    })
    // Cópia LOCAL da lista de especialidades — nunca muta o fixture
    // REFS.specialties.data compartilhado entre testes (evitaria "vazar"
    // a especialidade criada aqui pros demais testes do arquivo).
    const specialtiesList = [...REFS.specialties.data]
    api.getCatalog2Specialties.mockImplementation(async () => ({ data: specialtiesList }))
    api.addCatalog2Specialty.mockImplementation(async (body: any) => {
      const specialty = { id: "sp-new-1", key: body.key, name: body.name, max_hourly_rate: body.max_hourly_rate ?? null }
      specialtiesList.push(specialty)
      return specialty
    })
    api.updateCatalog2Task.mockImplementation(async (taskId: string, body: any) => {
      const task = db.versions.flatMap((v: any) => v.tasks).find((t: any) => t.id === taskId)
      if ("specialty_id" in body) task.specialty = body.specialty_id ? specialtiesList.find((s: any) => s.id === body.specialty_id) : null
      Object.assign(task, body)
      return task
    })
    let questionnaireSeq = 0
    const questionnaireDb: any[] = []
    api.addCatalog2Questionnaire.mockImplementation(async (body: any) => {
      const q = { id: `q-new-${++questionnaireSeq}`, name: body.name, description: body.description ?? null, questions: [] }
      questionnaireDb.push(q)
      return q
    })
    api.addCatalog2QuestionnaireQuestion.mockImplementation(async (questionnaireId: string, body: any) => {
      const q = questionnaireDb.find((x) => x.id === questionnaireId)
      const question = { id: `qq-${q.questions.length + 1}`, key: body.key, label: body.label, is_required: body.is_required, sort_order: body.sort_order }
      q.questions.push(question)
      return question
    })
    api.setCatalog2TaskQuestionnaire.mockImplementation(async (taskId: string, questionnaireId: string | null) => {
      const task = db.versions.flatMap((v: any) => v.tasks).find((t: any) => t.id === taskId)
      task.questionnaire = questionnaireId ? questionnaireDb.find((q) => q.id === questionnaireId) : null
      return { ok: true, questionnaire_id: questionnaireId }
    })

    renderPage()
    await screen.findByText("[TESTE LOCAL] Demo")
    await user.click(await screen.findByRole("button", { name: /abrir\/editar produto|continuar configuração/i }))
    await user.click(await screen.findByRole("tab", { name: "Entrega: tarefas, etapas e prazos" }))
    await user.click(await screen.findByRole("tab", { name: /^Tarefas e etapas$/ }))
    await screen.findByText(/Modelos do catálogo/i)

    // 1. Criar uma tarefa nova (fluxo "Criar nova").
    await user.click(screen.getByRole("button", { name: /Criar nova/i }))
    await user.type(screen.getByLabelText("key"), "briefing-inicial")
    await user.type(screen.getByLabelText("nome"), "Briefing inicial")
    await user.click(screen.getByRole("button", { name: "Criar tarefa" }))
    expect(await screen.findByText(/Briefing inicial/)).toBeInTheDocument()
    expect(api.addCatalog2Task).toHaveBeenCalledWith("v2", { key: "briefing-inicial", name: "Briefing inicial" })

    // 2. Adicionar uma etapa dentro da tarefa. Nesse ponto o formulário de
    // "Criar nova" tarefa continua aberto (abaixo da lista), então "key"/
    // "nome" aparecem duas vezes na tela — o da ETAPA vem primeiro no DOM
    // (dentro da lista de tarefas), o da tarefa nova vem depois.
    const stepKeyInputs = screen.getAllByLabelText("key")
    await user.type(stepKeyInputs[0], "coleta-dados")
    const stepNameInputs = screen.getAllByLabelText("nome")
    await user.type(stepNameInputs[0], "Coletar dados do cliente")
    await user.click(screen.getByRole("button", { name: "Adicionar etapa" }))
    expect(await screen.findByText(/Coletar dados do cliente/)).toBeInTheDocument()

    // 3. Editar a etapa recém-criada.
    await user.click(screen.getByText("editar"))
    const editNameInput = screen.getByDisplayValue("Coletar dados do cliente")
    await user.clear(editNameInput)
    await user.type(editNameInput, "Coletar briefing completo")
    await user.click(screen.getByRole("button", { name: "Salvar" }))
    expect(await screen.findByText(/Coletar briefing completo/)).toBeInTheDocument()
    expect(api.updateCatalog2Step).toHaveBeenCalledWith("s-new-1", { name: "Coletar briefing completo", estimated_minutes: null })

    // 4. Criar uma especialidade nova durante a configuração da tarefa.
    await user.click(screen.getByText("+ nova especialidade"))
    await user.type(screen.getAllByLabelText("key")[0], "copywriter")
    await user.type(screen.getAllByLabelText("nome")[0], "Copywriter")
    await user.click(screen.getByRole("button", { name: "Criar especialidade" }))
    await waitFor(() => expect(api.addCatalog2Specialty).toHaveBeenCalledWith({ key: "copywriter", name: "Copywriter", max_hourly_rate: null }))
    expect(await screen.findByRole("option", { name: "Copywriter" })).toBeInTheDocument()

    // 5. Criar e vincular um questionário (perguntas + obrigatoriedade).
    await user.click(screen.getByRole("button", { name: /Criar novo questionário/i }))
    await user.type(screen.getByLabelText("nome do questionário"), "Briefing de conteúdo")
    await user.type(screen.getByLabelText("nova pergunta"), "Qual o objetivo da campanha?")
    await user.click(screen.getByRole("button", { name: "Adicionar pergunta" }))
    expect(screen.getByText(/Qual o objetivo da campanha\?/)).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Criar e vincular" }))
    await waitFor(() => expect(api.setCatalog2TaskQuestionnaire).toHaveBeenCalledWith("t-new-1", "q-new-1"))
    expect(await screen.findByText(/Questionário: Briefing de conteúdo/)).toBeInTheDocument()
    expect(screen.getByText(/Qual o objetivo da campanha\?/)).toBeInTheDocument()

    // 6. Fechar (Voltar) e reabrir o editor — tudo continua vinculado e visível.
    await user.click(screen.getByRole("button", { name: /^Voltar$/i }))
    await user.click(await screen.findByRole("button", { name: /abrir\/editar produto|continuar configuração/i }))
    await user.click(await screen.findByRole("tab", { name: "Entrega: tarefas, etapas e prazos" }))
    await user.click(await screen.findByRole("tab", { name: /^Tarefas e etapas$/ }))
    expect(await screen.findByText(/Briefing inicial/)).toBeInTheDocument()
    expect(screen.getByText(/Coletar briefing completo/)).toBeInTheDocument()
    expect(screen.getByText(/questionário: Briefing de conteúdo/)).toBeInTheDocument()
  })

  it("selecionar tarefa existente (de outro produto) IMPORTA uma cópia pra esta versão, sem alterar a tarefa de origem", async () => {
    const user = userEvent.setup()
    const db = statefulDraftProduct()
    api.getCatalog2Product.mockImplementation(async () => JSON.parse(JSON.stringify(db)))
    api.searchCatalog2Tasks.mockResolvedValue({
      data: [{ id: "t-other", key: "revisao-seo", name: "Revisão de SEO", execution_mode: "humano", estimated_minutes: 30, specialty_name: "SEO", step_count: 2, questionnaire: null, product_name: "Outro Produto", version_label: "v1 (publicada)" }],
    })
    api.importCatalog2Task.mockImplementation(async (versionId: string, sourceTaskId: string) => {
      const v = db.versions.find((x: any) => x.id === versionId)
      v.tasks.push({ id: "t-imported-1", key: "revisao-seo", name: "Revisão de SEO", sort_order: 99, execution_mode: "humano", estimated_minutes: 30, is_conditional: false, requires_review: false, specialty: null, questionnaire: null, ai: null, depends_on: [], steps: [] } as any)
      return { ok: true, task_id: "t-imported-1" }
    })

    renderPage()
    await screen.findByText("[TESTE LOCAL] Demo")
    await user.click(await screen.findByRole("button", { name: /abrir\/editar produto|continuar configuração/i }))
    await user.click(await screen.findByRole("tab", { name: "Entrega: tarefas, etapas e prazos" }))
    await user.click(await screen.findByRole("tab", { name: /^Tarefas e etapas$/ }))
    await user.click(screen.getByRole("button", { name: /Selecionar existente/i }))
    await user.type(screen.getByPlaceholderText(/Buscar tarefa por nome ou key/i), "seo")
    expect(await screen.findByText("Revisão de SEO")).toBeInTheDocument()
    expect(screen.getByText(/Outro Produto/)).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Importar cópia" }))
    await waitFor(() => expect(api.importCatalog2Task).toHaveBeenCalledWith("v2", "t-other"))
    // "Revisão de SEO" aparece 2x agora (resultado da busca + a tarefa
    // recém-importada na lista) — confirma a cópia sem depender de o
    // painel de busca ainda estar aberto ou não.
    expect(await screen.findByText("#99 Revisão de SEO")).toBeInTheDocument()
  })

  it("cancelar a criação (fechar sem salvar) preserva o produto e as tarefas já existentes", async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText("[TESTE LOCAL] Demo")
    await user.click(await screen.findByRole("button", { name: /abrir\/editar produto|continuar configuração/i }))
    await user.click(await screen.findByRole("tab", { name: "Entrega: tarefas, etapas e prazos" }))
    await user.click(await screen.findByRole("tab", { name: /^Tarefas e etapas$/ }))
    await user.click(screen.getByRole("button", { name: /Criar nova/i }))
    await user.type(screen.getByLabelText("key"), "rascunho-abandonado")
    // Fecha sem clicar em "Criar tarefa".
    await user.click(screen.getByRole("button", { name: /^Voltar$/i }))
    expect(api.addCatalog2Task).not.toHaveBeenCalled()
    // Produto continua acessível e intacto (nenhuma chamada de escrita disparada).
    expect(await screen.findByText("[TESTE LOCAL] Demo")).toBeInTheDocument()
  })

  it("erro ao salvar a tarefa mostra mensagem visível e não fecha o formulário de criação", async () => {
    const user = userEvent.setup()
    api.addCatalog2Task.mockRejectedValueOnce(new Error("Situação inválida."))
    renderPage()
    await screen.findByText("[TESTE LOCAL] Demo")
    await user.click(await screen.findByRole("button", { name: /abrir\/editar produto|continuar configuração/i }))
    await user.click(await screen.findByRole("tab", { name: "Entrega: tarefas, etapas e prazos" }))
    await user.click(await screen.findByRole("tab", { name: /^Tarefas e etapas$/ }))
    await user.click(screen.getByRole("button", { name: /Criar nova/i }))
    await user.type(screen.getByLabelText("key"), "tarefa-com-erro")
    await user.type(screen.getByLabelText("nome"), "Tarefa com erro")
    await user.click(screen.getByRole("button", { name: "Criar tarefa" }))
    expect(await screen.findByText("Situação inválida.")).toBeInTheDocument()
    expect(screen.queryByText(/Tarefa com erro/)).not.toBeInTheDocument()
  })

  it("clique repetido em 'Criar e vincular' (questionário) não dispara duas criações — botão fica desabilitado enquanto salva", async () => {
    const user = userEvent.setup()
    const db = statefulDraftProduct()
    db.versions.find((v: any) => v.id === "v2").tasks = [{ id: "t1", key: "t1", name: "Tarefa 1", sort_order: 1, execution_mode: "humano", estimated_minutes: 60, is_conditional: false, requires_review: false, steps: [], specialty: null, questionnaire: null, ai: null, depends_on: [] }]
    api.getCatalog2Product.mockImplementation(async () => JSON.parse(JSON.stringify(db)))
    let createCalls = 0
    let resolveCreate: (v: any) => void = () => {}
    api.addCatalog2Questionnaire.mockImplementation(() => {
      createCalls++
      return new Promise((resolve) => { resolveCreate = resolve })
    })

    renderPage()
    await screen.findByText("[TESTE LOCAL] Demo")
    await user.click(await screen.findByRole("button", { name: /abrir\/editar produto|continuar configuração/i }))
    await user.click(await screen.findByRole("tab", { name: "Entrega: tarefas, etapas e prazos" }))
    await user.click(await screen.findByRole("tab", { name: /^Tarefas e etapas$/ }))
    await user.click(screen.getByRole("button", { name: /Criar novo questionário/i }))
    await user.type(screen.getByLabelText("nome do questionário"), "Briefing X")
    await user.type(screen.getByLabelText("nova pergunta"), "Pergunta 1")
    await user.click(screen.getByRole("button", { name: "Adicionar pergunta" }))
    const saveBtn = screen.getByRole("button", { name: "Criar e vincular" })
    await user.click(saveBtn)
    // Segundo clique enquanto a primeira chamada ainda não resolveu.
    await user.click(screen.getByRole("button", { name: /Salvando/i }))
    expect(createCalls).toBe(1)
    resolveCreate({ id: "q-x", name: "Briefing X", description: null, questions: [] })
  })

  // Item 3.1 (reunião 2026-09-14, "Edição e preservação dos questionários").
  it("editar título, perguntas e reordenar um questionário já vinculado pela interface — avisa quando cria cópia, e persiste ao fechar e reabrir", async () => {
    const user = userEvent.setup()
    const db = statefulDraftProduct()
    const draftV = db.versions.find((v: any) => v.id === "v2")
    draftV.tasks = [{
      id: "t1", key: "t1", name: "Tarefa 1", sort_order: 1, execution_mode: "humano", estimated_minutes: 60,
      is_conditional: false, requires_review: false, specialty: null, ai: null, depends_on: [], steps: [],
      questionnaire: { id: "q1", name: "Briefing original", description: "desc original", questions: [
        { id: "qq1", key: "objetivo", label: "Qual o objetivo?", is_required: true, sort_order: 1 },
        { id: "qq2", key: "publico", label: "Qual o público?", is_required: false, sort_order: 2 },
      ] },
    }]
    api.getCatalog2Product.mockImplementation(async () => JSON.parse(JSON.stringify(db)))
    api.updateCatalog2TaskQuestionnaireContent.mockImplementation(async (taskId: string, body: any) => {
      const task = draftV.tasks.find((t: any) => t.id === taskId)
      const forked = true // simula que era compartilhado — backend decidiu copiar
      const newQuestionnaire = { id: "q1-copy", name: body.name, description: body.description, questions: body.questions.map((q: any, i: number) => ({ id: `qq-copy-${i + 1}`, ...q, sort_order: i + 1 })) }
      task.questionnaire = newQuestionnaire
      return { ok: true, forked, questionnaire: newQuestionnaire }
    })

    renderPage()
    await screen.findByText("[TESTE LOCAL] Demo")
    await user.click(await screen.findByRole("button", { name: /abrir\/editar produto|continuar configuração/i }))
    await user.click(await screen.findByRole("tab", { name: "Entrega: tarefas, etapas e prazos" }))
    await user.click(await screen.findByRole("tab", { name: /^Tarefas e etapas$/ }))
    expect(await screen.findByText(/Questionário: Briefing original/)).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Editar" }))
    const nameInput = screen.getByDisplayValue("Briefing original")
    await user.clear(nameInput)
    await user.type(nameInput, "Briefing revisado")
    // edita a 2ª pergunta e reordena pra 1º lugar
    const labelInputs = screen.getAllByDisplayValue(/Qual o (objetivo|público)\?/)
    await user.clear(labelInputs[1])
    await user.type(labelInputs[1], "Qual é o público-alvo?")
    const upButtons = screen.getAllByRole("button").filter((b) => b.querySelector(".lucide-chevron-up"))
    await user.click(upButtons[upButtons.length - 1]) // sobe a última pergunta editável (a 2ª)
    // adiciona uma pergunta nova
    await user.type(screen.getByLabelText("nova pergunta"), "Prazo desejado?")
    await user.click(screen.getByRole("button", { name: "Adicionar pergunta" }))

    await user.click(screen.getByRole("button", { name: "Salvar" }))
    await waitFor(() => expect(api.updateCatalog2TaskQuestionnaireContent).toHaveBeenCalledTimes(1))
    const [, savedBody] = api.updateCatalog2TaskQuestionnaireContent.mock.calls[0]
    expect(savedBody.name).toBe("Briefing revisado")
    expect(savedBody.questions.map((q: any) => q.label)).toEqual(["Qual é o público-alvo?", "Qual o objetivo?", "Prazo desejado?"])

    // avisa que uma cópia foi criada (era compartilhado)
    expect(await screen.findByText(/uma cópia própria foi criada/i)).toBeInTheDocument()
    expect(await screen.findByText(/Questionário: Briefing revisado/)).toBeInTheDocument()

    // fecha e reabre — continua persistido
    await user.click(screen.getByRole("button", { name: /^Voltar$/i }))
    await user.click(await screen.findByRole("button", { name: /abrir\/editar produto|continuar configuração/i }))
    await user.click(await screen.findByRole("tab", { name: "Entrega: tarefas, etapas e prazos" }))
    await user.click(await screen.findByRole("tab", { name: /^Tarefas e etapas$/ }))
    expect(await screen.findByText(/Questionário: Briefing revisado/)).toBeInTheDocument()
    expect(screen.getByText(/Qual é o público-alvo\?/)).toBeInTheDocument()
    expect(screen.getByText(/Prazo desejado\?/)).toBeInTheDocument()
  })

  it("cancelar a edição do questionário preserva o conteúdo anterior (nenhuma chamada à API, nada muda)", async () => {
    const user = userEvent.setup()
    const db = statefulDraftProduct()
    const draftV = db.versions.find((v: any) => v.id === "v2")
    draftV.tasks = [{
      id: "t1", key: "t1", name: "Tarefa 1", sort_order: 1, execution_mode: "humano", estimated_minutes: 60,
      is_conditional: false, requires_review: false, specialty: null, ai: null, depends_on: [], steps: [],
      questionnaire: { id: "q1", name: "Briefing original", description: null, questions: [{ id: "qq1", key: "objetivo", label: "Qual o objetivo?", is_required: true, sort_order: 1 }] },
    }]
    api.getCatalog2Product.mockImplementation(async () => JSON.parse(JSON.stringify(db)))

    renderPage()
    await screen.findByText("[TESTE LOCAL] Demo")
    await user.click(await screen.findByRole("button", { name: /abrir\/editar produto|continuar configuração/i }))
    await user.click(await screen.findByRole("tab", { name: "Entrega: tarefas, etapas e prazos" }))
    await user.click(await screen.findByRole("tab", { name: /^Tarefas e etapas$/ }))
    await user.click(screen.getByRole("button", { name: "Editar" }))
    const nameInput = screen.getByDisplayValue("Briefing original")
    await user.clear(nameInput)
    await user.type(nameInput, "Alteração que será descartada")
    await user.click(screen.getByRole("button", { name: "Cancelar" }))

    expect(api.updateCatalog2TaskQuestionnaireContent).not.toHaveBeenCalled()
    expect(await screen.findByText(/Questionário: Briefing original/)).toBeInTheDocument()
    expect(screen.queryByText(/Alteração que será descartada/)).not.toBeInTheDocument()
  })

  it("erro ao salvar a edição do questionário mostra mensagem visível e preserva o conteúdo anterior", async () => {
    const user = userEvent.setup()
    const db = statefulDraftProduct()
    const draftV = db.versions.find((v: any) => v.id === "v2")
    draftV.tasks = [{
      id: "t1", key: "t1", name: "Tarefa 1", sort_order: 1, execution_mode: "humano", estimated_minutes: 60,
      is_conditional: false, requires_review: false, specialty: null, ai: null, depends_on: [], steps: [],
      questionnaire: { id: "q1", name: "Briefing original", description: null, questions: [{ id: "qq1", key: "objetivo", label: "Qual o objetivo?", is_required: true, sort_order: 1 }] },
    }]
    api.getCatalog2Product.mockImplementation(async () => JSON.parse(JSON.stringify(db)))
    api.updateCatalog2TaskQuestionnaireContent.mockRejectedValueOnce(new Error("Este questionário é usado por mais de uma tarefa — edite pelo formulário da tarefa."))

    renderPage()
    await screen.findByText("[TESTE LOCAL] Demo")
    await user.click(await screen.findByRole("button", { name: /abrir\/editar produto|continuar configuração/i }))
    await user.click(await screen.findByRole("tab", { name: "Entrega: tarefas, etapas e prazos" }))
    await user.click(await screen.findByRole("tab", { name: /^Tarefas e etapas$/ }))
    await user.click(screen.getByRole("button", { name: "Editar" }))
    const nameInput = screen.getByDisplayValue("Briefing original")
    await user.clear(nameInput)
    await user.type(nameInput, "Tentativa com erro")
    await user.click(screen.getByRole("button", { name: "Salvar" }))

    expect(await screen.findByText(/usado por mais de uma tarefa/i)).toBeInTheDocument()
    // formulário de edição continua aberto, com o texto digitado preservado (não fechou nem reverteu).
    expect(screen.getByDisplayValue("Tentativa com erro")).toBeInTheDocument()
    // o card read-only (fora de edição) não voltou a aparecer com o nome antigo por cima do form.
    expect(screen.queryByText(/^Questionário: Briefing original$/)).not.toBeInTheDocument()
  })
})

it("versão publicada é somente leitura (a UI bloqueia edição)", async () => {
  api.getCatalog2Product.mockResolvedValue(
    productDetail({ versions: [productDetail().versions[1]] }), // só a v1 publicada
  )
  const user = userEvent.setup()
  renderPage()
  await screen.findByText("[TESTE LOCAL] Demo")
  await user.click(await screen.findByRole("button", { name: /abrir\/editar produto|continuar configuração/i }))
  expect(await screen.findByText(/Versão publicada — somente leitura/i)).toBeInTheDocument()
})

it("etapa Custos e preço: simulador usa o cálculo do backend e mostra o resumo detalhado", async () => {
  const user = userEvent.setup()
  renderPage()
  await screen.findByText("[TESTE LOCAL] Demo")
  await user.click(await screen.findByRole("button", { name: /abrir\/editar produto|continuar configuração/i }))
  await user.click(await screen.findByRole("tab", { name: "Custos e preço" }))
  await waitFor(() => expect(api.simulateCatalog2).toHaveBeenCalled())
  expect(await screen.findByText("Custo humano")).toBeInTheDocument()
  expect(screen.getByText("Preço comercial final")).toBeInTheDocument()
  // esforço interno e prazo comercial aparecem separados (reparo 2.1)
  expect(screen.getByText(/Esforço interno estimado/)).toBeInTheDocument()
  expect(screen.getByText(/Prazo comercial/)).toBeInTheDocument()
})

it("etapa Revisão: Pré-visualização usa o mesmo endpoint do backend (não recalcula no front)", async () => {
  const user = userEvent.setup()
  renderPage()
  await screen.findByText("[TESTE LOCAL] Demo")
  await user.click(await screen.findByRole("button", { name: /abrir\/editar produto|continuar configuração/i }))
  await user.click(await screen.findByRole("tab", { name: "Revisão e publicação" }))
  await user.click(await screen.findByRole("tab", { name: /^Pré-visualização$/ }))
  await waitFor(() => expect(api.previewCatalog2Version).toHaveBeenCalledWith("v2"))
  expect(await screen.findByText(/mesmo cálculo do backend/i)).toBeInTheDocument()
})

it("etapa Revisão: Publicação e versões mostra as pendências de validação antes de publicar", async () => {
  const user = userEvent.setup()
  renderPage()
  await screen.findByText("[TESTE LOCAL] Demo")
  await user.click(await screen.findByRole("button", { name: /abrir\/editar produto|continuar configuração/i }))
  await user.click(await screen.findByRole("tab", { name: "Revisão e publicação" }))
  await user.click(await screen.findByRole("tab", { name: /^Publicação e versões$/ }))
  expect(await screen.findByText("Selecione um pilar.")).toBeInTheDocument()
  expect(screen.getByText(/Validação para publicar/i)).toBeInTheDocument()
  expect(screen.getByText(/Histórico da versão/i)).toBeInTheDocument()
})

// ── Importação dos 36 (sprint de produtos, bloco 4/6) ────────────────

it("painel de importação: resumo, checksum da planilha e contagem real (sem '36' fixo)", async () => {
  renderPage()
  expect(await screen.findByRole("heading", { name: "Importação de produtos definitivos" })).toBeInTheDocument()
  // total/esperado vêm do importSummary (36/36 aqui), não de literal
  expect(screen.getByText(/36\/36 importados/)).toBeInTheDocument()
  // entre os IMPORTADOS, nenhum publicado (o demo não é importado)
  expect(screen.getByText(/0 publicado\(s\)/)).toBeInTheDocument()
  expect(screen.getByText(/importado\(s\) para preparação\. Aguardando tarefas, prazos, precificação e revisão/i)).toBeInTheDocument()
  expect(screen.getByText(/Allka_Proposta_Catalogo_Produtos_v9\.xlsx/)).toBeInTheDocument()
  expect(screen.getByText(/Os 162 produtos operacionais seguem intactos/i)).toBeInTheDocument()
})

// ── Bloco 2 (10/09/2026): transparência e prontidão ─────────────────

it("contagens do resumo vêm de overview.counts (dados reais), não de literal", async () => {
  renderPage()
  await screen.findByText("[TESTE LOCAL] Demo")
  // rótulo do Stat = <div class="text-xs">…</div> (distingue do <option> do filtro)
  const card = (label: string) => screen.getByText(label, { selector: "div.text-xs" }).parentElement as HTMLElement
  // produtos importados finais = 36 (o demo NÃO infla)
  expect(within(card("Importados (finais)")).getByText("36")).toBeInTheDocument()
  expect(within(card("Importados (finais)")).getByText(/de demonstração, fora da contagem/i)).toBeInTheDocument()
  // tarefas/etapas cadastradas NOS importados = 0 (não fingir completo)
  expect(within(card("Tarefas (nos importados)")).getByText("0")).toBeInTheDocument()
  expect(within(card("Etapas (nos importados)")).getByText("0")).toBeInTheDocument()
  // "Em preparação"/"Ativos"/"Com pendências" viraram abas de filtro
  // rápido (layout restaurado) — o número vem no <span> badge da aba.
  const tab = (label: string) => screen.getByText(label).closest("button") as HTMLElement
  expect(within(tab("Em preparação")).getByText("36")).toBeInTheDocument()
  expect(within(tab("Ativos")).getByText("1")).toBeInTheDocument()
  expect(within(tab("Com pendências")).getByText("36")).toBeInTheDocument()
})

it("não usa mensagem falsa 'ainda não foram importados' quando há importação", async () => {
  renderPage()
  await screen.findByText("[TESTE LOCAL] Demo")
  expect(screen.queryByText(/ainda não foram importados/i)).not.toBeInTheDocument()
  expect(screen.getByText(/catálogo antigo, com 162 produtos, não aparece mais aqui/i)).toBeInTheDocument()
})

it("aba Custos: produto SEM tarefas ativas mostra 'base de custo indefinida', nunca R$ 0,00 como preço válido", async () => {
  api.getCatalog2Product.mockResolvedValue(
    productDetail({
      versions: [{ id: "v2", version_number: 2, state: "rascunho", title: "Sem tarefas", summary: "", full_description: "", change_summary: "", variations: [], addons: [], conditions: [], tasks: [], history: [] }],
    }),
  )
  api.simulateCatalog2.mockResolvedValue({
    pricing: {
      currency: "BRL", quantity: 1, active_task_keys: [], warnings: [{ message: "A tarefa … não tem duração." }],
      applied_conditions: [], deadline_detail: "…", estimated_deadline_days: 0, order_defined: true,
      applied_order: ["tax"], pending_info: [], deadline: { effort_days: 0, internal_estimate_days: 0, commercial_deadline_days: null, commercial_deadline_pending: true },
      pricing_pending: false,
      lines: {
        human_cost: { label: "Custo humano", amount: 0 }, ia_cost: { label: "IA", amount: 0 },
        human_review_cost: { label: "Revisão humana", amount: 0 }, addons: { label: "Adicionais", amount: 0 },
        variation_impacts: { label: "Impactos de variações", amount: 0 }, condition_impacts: { label: "Impactos de condições", detail: "nenhuma" },
        direct_cost: { label: "Custo direto", amount: 0 }, subtotal_cost: { label: "Subtotal", amount: 0 },
        taxes_and_margins: [], commercial_final_price: { label: "Preço comercial final", amount: 0 },
        final_price: { label: "Preço comercial final", amount: 0 }, minimum_price: { label: "Mínimo", amount: 0 },
      },
    },
  })
  const user = userEvent.setup()
  renderPage()
  await screen.findByText("[TESTE LOCAL] Demo")
  await user.click(await screen.findByRole("button", { name: /abrir\/editar produto|continuar configuração/i }))
  await user.click(await screen.findByRole("tab", { name: "Custos e preço" }))
  await waitFor(() => expect(api.simulateCatalog2).toHaveBeenCalled())
  expect(await screen.findByText(/base de custo indefinida/i)).toBeInTheDocument()
  expect(screen.getByText(/Cadastre tarefas, especialidades, tempos e prazo/i)).toBeInTheDocument()
  // NÃO apresenta "Preço comercial final" com valor
  expect(screen.queryByText("Preço comercial final")).not.toBeInTheDocument()
  expect(screen.queryByText(/BRL 0\.00/)).not.toBeInTheDocument()
})

it("etapa Custos e preço: produto COM tarefas válidas mantém a composição detalhada normal", async () => {
  const user = userEvent.setup()
  renderPage()
  await screen.findByText("[TESTE LOCAL] Demo")
  await user.click(await screen.findByRole("button", { name: /abrir\/editar produto|continuar configuração/i }))
  await user.click(await screen.findByRole("tab", { name: "Custos e preço" }))
  await waitFor(() => expect(api.simulateCatalog2).toHaveBeenCalled())
  expect(await screen.findByText("Custo humano")).toBeInTheDocument()
  expect(screen.getByText("Preço comercial final")).toBeInTheDocument()
  expect(screen.queryByText(/base de custo indefinida/i)).not.toBeInTheDocument()
})

it("etapa Custos e preço: avisos de configuração provisória/seed e valor/hora de teste", async () => {
  api.getCatalog2PricingSettings.mockResolvedValue({
    id: "default", tax_percent: 6, commission_percent: 10, operational_fee_percent: 5, profit_margin_percent: 30,
    human_review_percent: 15, currency: "BRL",
    updated_by_user_id: null, component_base_json: null, component_order_json: '["tax","commission","operational","margin"]',
  })
  api.getCatalog2Specialties.mockResolvedValue({
    data: [
      { id: "s1", name: "Redator", max_hourly_rate: 70, hourly_rate_note: "[TESTE LOCAL]" },
      { id: "s2", name: "Editor de Vídeo", max_hourly_rate: null, hourly_rate_note: null },
    ],
  })
  const user = userEvent.setup()
  renderPage()
  await screen.findByText("[TESTE LOCAL] Demo")
  await user.click(await screen.findByRole("button", { name: /abrir\/editar produto|continuar configuração/i }))
  await user.click(await screen.findByRole("tab", { name: "Custos e preço" }))
  expect(await screen.findByText(/sem responsável comercial registrado/i)).toBeInTheDocument()
  expect(screen.getByText(/Base de incidência dos componentes ainda não definida/i)).toBeInTheDocument()
  expect(screen.getByText(/valor de teste — não é decisão comercial/i)).toBeInTheDocument()
  expect(screen.getAllByText(/aguardando definição comercial/i).length).toBeGreaterThan(0)
})

it("prontidão por produto: atalho abre e mostra os itens reais do backend", async () => {
  api.getCatalog2ProductReadiness.mockResolvedValue({
    id: "prod1", name: "Produto X", is_test_local: false, imported: true, task_count: 0, step_count: 0, has_active_tasks: false,
    items: {
      tarefas: { level: "pendente", note: "Nenhuma tarefa — não vira operação sem tarefas (bloco 6)." },
      preco: { level: "bloqueador", note: "Sem tarefas cadastradas — base de custo indefinida; a precificação não pode ser calculada." },
      prazo: { level: "bloqueador", note: "Prazo comercial base não definido." },
      publicacao: { level: "bloqueador", note: "Nunca publicado — invisível para o cliente (bloco 5 não publica)." },
      conteudo: { level: "pronto", note: "Conteúdo revisável." },
    },
    blockers: ["preco", "prazo", "publicacao"], pendings: ["tarefas"],
  })
  const user = userEvent.setup()
  renderPage()
  await screen.findByText("[TESTE LOCAL] Demo")
  await user.click(await screen.findByRole("button", { name: /abrir\/editar produto|continuar configuração/i }))
  await user.click(await screen.findByRole("button", { name: /Prontidão deste produto/i }))
  expect(await screen.findByText(/Sem tarefas cadastradas — base de custo indefinida/i)).toBeInTheDocument()
  expect(screen.getByText("Prazo comercial base não definido.")).toBeInTheDocument()
  expect(screen.getByText(/3 bloqueador\(es\) · 1 pendência\(s\)/)).toBeInTheDocument()
  expect(api.getCatalog2ProductReadiness).toHaveBeenCalledWith("prod1")
})

it("listagem: filtros avançados vão ao backend; linha da tabela fica limpa (sem slug/origem crus)", async () => {
  renderPage()
  await screen.findByText("[TESTE LOCAL] Demo")
  // filtros avançados (layout restaurado): botão "Filtros" abre o painel
  await userEvent.click(screen.getByRole("button", { name: /^Filtros/ }))
  await userEvent.selectOptions(screen.getByDisplayValue("Revisão da Rose (todas)"), "true")
  await waitFor(() => expect(api.getCatalog2Products).toHaveBeenCalledWith(expect.objectContaining({ rose_reviewed: "true" })))
  await userEvent.selectOptions(screen.getByDisplayValue("Tipo de pendência (todas)"), "price_pending")
  await waitFor(() => expect(api.getCatalog2Products).toHaveBeenCalledWith(expect.objectContaining({ pendency: "price_pending" })))
  // pendências aparecem como badge na linha (texto de negócio, não código)
  expect(screen.getAllByText("preço").length).toBeGreaterThan(0)
  // slug/origem/#index crus não poluem a leitura principal da linha —
  // ficam atrás do toggle "Detalhes técnicos" (ver teste dedicado abaixo).
  expect(screen.queryByText(/slug demo/)).not.toBeInTheDocument()
})

// Auditoria forense 2026-09-11 (trabalho de 10/09/2026, commits
// 9539f94/823b18c): "Detalhes técnicos" por linha e o badge "editado por
// humano" existiam na reformulação do construtor/lista e tinham sumido
// quando a lista virou tabela no reparo de layout — recuperados.
it("Detalhes técnicos: toggle por linha revela slug/origem/versão/datas, escondido por padrão", async () => {
  renderPage()
  await screen.findByText("[TESTE LOCAL] Demo")
  expect(screen.queryByText(/slug demo/)).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole("button", { name: "Detalhes técnicos" }))
  expect(screen.getByText(/slug demo · origem #3/)).toBeInTheDocument()
})

it("badge 'editado por humano' aparece na linha quando o produto foi editado manualmente", async () => {
  api.getCatalog2Products.mockResolvedValue({
    ...LIST,
    data: [{ ...LIST.data[0], human_edited: true }],
  })
  renderPage()
  await screen.findByText("[TESTE LOCAL] Demo")
  expect(screen.getByText("editado por humano")).toBeInTheDocument()
})

it("banner: link 'Pré-visualizar como cliente' existe e aponta pro preview do catalog2", async () => {
  renderPage()
  await screen.findByText("[TESTE LOCAL] Demo")
  const link = screen.getByRole("link", { name: /Pré-visualizar como cliente/i })
  expect(link).toHaveAttribute("href", "/admin/catalog2?preview=1")
})

it("aba Origem e importação: planilha, Rose, divergência, preço histórico e resolver pendência", async () => {
  const user = userEvent.setup()
  renderPage()
  await screen.findByText("[TESTE LOCAL] Demo")
  await user.click(await screen.findByRole("button", { name: /abrir\/editar produto|continuar configuração/i }))
  await user.click(await screen.findByRole("tab", { name: "Origem e importação" }))
  expect(await screen.findByRole("heading", { name: /Planilha principal/i })).toBeInTheDocument()
  expect(screen.getByRole("heading", { name: /Referência histórica de preço/i })).toBeInTheDocument()
  expect(screen.getAllByText(/preço final/i).length).toBeGreaterThan(0)
  expect(screen.getByText(/name_updated_seo_geo/)).toBeInTheDocument()
  // resolver a pendência de preço
  const box = screen.getAllByPlaceholderText(/Descreva a decisão tomada/i)[0]
  await user.type(box, "Preço comercial definido em R$ 1200.")
  await user.click(screen.getAllByRole("button", { name: /Concluir pendência/i })[0])
  await waitFor(() => expect(api.resolveCatalog2Pendency).toHaveBeenCalledWith("prod1", expect.objectContaining({ pendency_key: "price_pending" })))
})
