import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom"
import { SidebarProvider } from "@/contexts/sidebar-context"
import { OpenScreensProvider } from "@/contexts/open-screens-context"
import AdminProdutosPage from "@/app/admin/produtos/page"

// 2026-09 (consolidação catalog2): esta é a rota /admin/cadastro-produtos ("Cadastro
// de Produtos"), antes /admin/produtos/novo-catalogo ("Preparação de
// Produtos") — mesmo componente, mesmos dados (catalog2), nome/rota novos.
// O construtor agora abre dentro do container padrão (EmbeddedSlideScreen +
// bandeja de telas), por isso o OpenScreensProvider.

function renderPage(initialEntry = "/") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
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
    // métodos que o editor passou a chamar (calendário, tipos de conexão, prazos e portões de aprovação)
    getConnectionVocabulary: vi.fn().mockResolvedValue({ data: [] }),
    getWorkCalendar: vi.fn().mockResolvedValue({ work_days: "1,2,3,4,5", start_time: "09:00", end_time: "17:00" }),
    getConnectionTypes: vi.fn().mockResolvedValue({ data: [] }),
    getCatalog2SlaOptions: vi.fn().mockResolvedValue({ data: [] }),
    getCatalog2GateOptions: vi.fn().mockResolvedValue({ data: [] }),
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
    getCatalog2ProductIdByNumber: vi.fn(),
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
    // usados pelo editor novo (aba Histórico e catálogo global de modelos de tarefa, 30/09)
    getCatalog2ProductHistory: vi.fn().mockResolvedValue({ data: [] }),
    getCatalog2TaskModels: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    getCatalog2StepModels: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    addCatalog2TaskFromModel: vi.fn(),
    getCatalog2TaskClearSnapshots: vi.fn().mockResolvedValue({ data: [] }),
    // modal da etapa (abre sozinho depois de "Criar nova etapa")
    getCatalog2Leaders: vi.fn().mockResolvedValue({ data: [] }),
  },
}))
vi.mock("@/lib/api-client", () => ({ apiClient: api }))
vi.mock("@/hooks/useAppFrameMetrics", () => ({ useAppFrameMetrics: () => ({ sidebarWidth: 72 }) }))

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

// ── Caminhos do editor padrão (fluxo de 3 passos, desde 03/11) ──────
type User = ReturnType<typeof userEvent.setup>
async function openEditorPanel(user: User) {
  await user.click(await screen.findByRole("button", { name: /editar produto|continuar configuração/i }))
  await screen.findByLabelText("Título comercial")
  return screen.getByTestId("product-editor-panel")
}
/** O editor abre na versão publicada, em leitura: escolhe o rascunho v2 e entra em edição. */
async function editDraft(user: User, panel: HTMLElement) {
  await chooseVersion(user, panel, "v2 — Rascunho")
  await user.click(await within(panel).findByRole("button", { name: /^Editar$/ }))
  await within(panel).findByRole("button", { name: "Travar edição" })
}
/** Escolhe a versão no menu "Versão do produto" (o rótulo também aparece no cabeçalho, por isso o item do menu). */
async function chooseVersion(user: User, panel: HTMLElement, label: string) {
  await user.click(within(panel).getByRole("button", { name: "Versão do produto" }))
  const options = await screen.findAllByText(label)
  const item = options.map((o) => o.closest('[role^="menuitem"],[role="option"]')).find(Boolean) as HTMLElement | undefined
  // a versão já aberta pode vir desabilitada (ou fora da lista) no menu: nesse caso só confere o cabeçalho e fecha
  if (!item || item.hasAttribute("data-disabled") || item.getAttribute("aria-disabled") === "true") {
    expect(within(panel).getAllByText(label).length).toBeGreaterThan(0)
    await user.keyboard("{Escape}")
  } else await user.click(item)
}
async function goToEditorStep(user: User, panel: HTMLElement, label: RegExp) {
  const nav = within(panel).getByRole("navigation", { name: "Passos do produto" })
  await user.click(within(nav).getAllByRole("button").find((b) => label.test(b.textContent ?? ""))!)
}
function editorSubTab(panel: HTMLElement, name: string) {
  return within(panel).getAllByRole("tab").find((t) => t.textContent?.startsWith(name))!
}
/** Campo "Nome da nova tarefa", achado pelo rótulo. O Field envolve o campo no <label> (associação implícita); a busca
 *  é pelo nome acessível porque a camada de ajuda injeta um "i" aria-hidden dentro do rótulo, e getByLabelText compara o
 *  texto bruto ("Nome da nova tarefai"). */
function newTaskInput(panel: HTMLElement) {
  return within(panel).queryByRole("textbox", { name: "Nome da nova tarefa" })
}
async function startNewTask(user: User, panel: HTMLElement, name: string) {
  await user.click(within(panel).getByRole("button", { name: "Adicionar tarefa" }))
  await user.click(await screen.findByRole("menuitem", { name: /Criar nova tarefa/ }))
  // colar em vez de digitar letra a letra: cada tecla re-renderiza o editor inteiro (era o que estourava os 15s na
  // suíte completa); o que se verifica é o nome que chega à API, não a digitação
  await user.click(newTaskInput(panel)!)
  await user.paste(name)
}
/** Os cartões de custo do passo 3 abrem em Painel Moldura pelo botão "Ver". */
async function openCostCard(user: User, panel: HTMLElement, title: string) {
  const card = within(panel).getAllByText(title)[0].closest("details,section,div[class*=rounded]") as HTMLElement
  await user.click(within(card).getByRole("button", { name: /^Ver/ }))
  return screen.findByTestId("cost-card-panel")
}

it("configuração normal abre o novo fluxo sem botão ou aviso de teste", async () => {
  api.getCatalog2Product.mockResolvedValue(productDetail({ sequence_number: 2 }));
  renderPage();
  // A lista só começa a carregar depois do bootstrap e do timer de loadList.
  // Neste primeiro cenário a montagem fria excedeu o waitFor padrão de 1s nas
  // duas suítes completas de 04/11, mas passou isolada. Esperar a linha real
  // (limite local de 5s), sem afrouxar as verificações nem o timeout da suíte.
  await screen.findByText("[TESTE LOCAL] Demo", {}, { timeout: 5000 });
  const configButton = screen.getByRole("button", { name: /editar produto|continuar configuração/i });
  expect(screen.queryByRole("button", { name: "Produto teste" })).not.toBeInTheDocument();
  await userEvent.click(configButton);
  expect(await screen.findByLabelText("Título comercial")).toHaveValue("Demo v1");
  expect(within(screen.getByRole("navigation", { name: "Passos do produto" })).getAllByRole("button")).toHaveLength(3);
  expect(screen.queryByTestId("product-test-notice")).not.toBeInTheDocument();
  expect(api.getCatalog2Product).toHaveBeenCalledWith("prod1");
  expect(api.createCatalog2Product).not.toHaveBeenCalled();
  expect(api.updateCatalog2VersionInfo).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole("button", { name: /^Fechar$/ }));
  await waitFor(() => expect(screen.queryByTestId("product-editor-panel")).not.toBeInTheDocument());
  await userEvent.click(screen.getByRole("button", { name: /editar produto|continuar configuração/i }));
  expect(await screen.findByTestId("product-editor-panel")).toBeInTheDocument();
  expect(await screen.findByLabelText("Título comercial")).toBeInTheDocument();
});

it("link antigo editor=teste continua abrindo o novo fluxo sem aviso", async () => {
  renderPage("/admin/cadastro-produtos?produto=prod1&editor=teste");
  expect(await screen.findByLabelText("Título comercial")).toBeInTheDocument();
  expect(screen.queryByTestId("product-test-notice")).not.toBeInTheDocument();
  expect(api.getCatalog2Product).toHaveBeenCalledWith("prod1");
  expect(api.createCatalog2Product).not.toHaveBeenCalled();
});

it("URL numérica e canonicalização preservam editor=teste e o ID real", async () => {
  api.getCatalog2ProductIdByNumber.mockResolvedValue({ id: "prod1" });
  api.getCatalog2Product.mockResolvedValue(productDetail({ sequence_number: 2 }));
  function Location() { const location = useLocation(); return <output data-testid="route">{location.pathname}{location.search}</output>; }
  render(<MemoryRouter initialEntries={["/admin/cadastro-produtos/2?editor=teste"]}><SidebarProvider><OpenScreensProvider><Location /><Routes><Route path="/admin/cadastro-produtos/:produtoId?" element={<AdminProdutosPage />} /></Routes></OpenScreensProvider></SidebarProvider></MemoryRouter>);
  expect(await screen.findByLabelText("Título comercial")).toBeInTheDocument();
  expect(screen.getByTestId("route")).toHaveTextContent("/admin/cadastro-produtos/2?editor=teste");
  expect(api.getCatalog2ProductIdByNumber).toHaveBeenCalledWith("2");
  expect(api.getCatalog2Product).toHaveBeenCalledWith("prod1");
  expect(api.createCatalog2Product).not.toHaveBeenCalled();
});

it("editor antigo fica guardado e acessível apenas por URL explícita", async () => {
  renderPage("/admin/cadastro-produtos?produto=prod1&editor=antigo");
  expect(await screen.findByTestId("product-editor-panel")).toBeInTheDocument();
  const archivedNav = await screen.findByRole("navigation", { name: "Passos do produto" });
  expect(within(archivedNav).getAllByRole("button")).toHaveLength(5);
  expect(within(archivedNav).getByRole("button", { name: /Informações do produto/ })).toBeInTheDocument();
  expect(screen.queryByLabelText("Título comercial")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Produto teste" })).not.toBeInTheDocument();
  expect(api.createCatalog2Product).not.toHaveBeenCalled();
  expect(api.updateCatalog2VersionInfo).not.toHaveBeenCalled();
});

beforeEach(() => {
  vi.clearAllMocks()
  window.localStorage.clear()
  // o editor guarda rascunho/edição por sessão em sessionStorage (editor-session.ts): sem limpar, um teste herdava o anterior
  window.sessionStorage.clear()
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
  const heading = screen.getByRole("heading", { name: "Cadastro de Produtos" })
  expect(heading.className).toMatch(/font-bold/)
  for (const label of ["Todos os produtos", "Ativos", "Em preparação", "Com pendências", "Categorias"]) {
    expect(screen.getAllByText(label).length).toBeGreaterThan(0)
  }
  // Tabela de verdade. O nome acessível do cabeçalho inclui a alça "Redimensionar coluna …" (colunas com largura
  // ajustável desde 10/2026), por isso a comparação é pelo começo do nome.
  expect(screen.getByRole("table")).toBeInTheDocument()
  expect(screen.getByRole("columnheader", { name: /^Produto/ })).toBeInTheDocument()
  expect(screen.getByRole("columnheader", { name: /^Status/ })).toBeInTheDocument()
  expect(screen.getByRole("columnheader", { name: /^Ações/ })).toBeInTheDocument()
})

// Reparo 2026-09 seguinte ("recuperação completa dos layouts"): o
// alternador Lista/Grade (2–5 colunas) tinha sumido na primeira restauração.
describe("Lista/Grade — alternador de visualização (Cadastro)", () => {
  it("padrão é Lista (tabela); alternar pra Grade troca pra cards, preservando busca/filtros/página", async () => {
    renderPage()
    await screen.findByText("[TESTE LOCAL] Demo")
    expect(screen.getByRole("table")).toBeInTheDocument()

    // A busca se chama "Pesquisar produtos" desde 04/10.
    await userEvent.type(screen.getByPlaceholderText(/Pesquisar produtos/i), "demo")
    await waitFor(() => expect(api.getCatalog2Products).toHaveBeenCalledWith(expect.objectContaining({ q: "demo" })))

    await userEvent.click(screen.getByRole("button", { name: "3 colunas" }))
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Pesquisar produtos/i)).toHaveValue("demo")
    // o card em modo grade também abre o construtor
    await userEvent.click(screen.getByRole("button", { name: /editar produto|continuar configuração/i }))
    expect(await screen.findByLabelText("Título comercial")).toBeInTheDocument()
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
    await userEvent.click(screen.getByRole("button", { name: /editar produto|continuar configuração/i }))
    await screen.findByLabelText("Título comercial")
    await userEvent.click(within(screen.getByTestId("product-editor-panel")).getByRole("button", { name: /^Fechar$/ }))
    await waitFor(() => expect(screen.queryByTestId("product-editor-panel")).not.toBeInTheDocument())
    expect(screen.getByPlaceholderText(/Pesquisar produtos/i)).toBeInTheDocument()
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
  })
})

it("clicar na aba 'Ativos' filtra a listagem (status=disponivel) sem precisar abrir 'Filtros'", async () => {
  renderPage()
  await screen.findByText("[TESTE LOCAL] Demo")
  await userEvent.click(screen.getByText("Ativos"))
  await waitFor(() => expect(api.getCatalog2Products).toHaveBeenCalledWith(expect.objectContaining({ status: "disponivel" })))
})

// Desde 30/09 o status muda pelo selo da lista (só Admin Master) e pede confirmação com o resumo do produto; o
// antigo "Salvar status" do editor saiu. O que continua: seis status em português e nada gravado antes de confirmar.
it("status: mostra os seis status em português e só persiste a escolha depois de confirmar", async () => {
  const user = userEvent.setup()
  api.setCatalog2ProductStatus.mockResolvedValue({ ok: true, status: "pre_lancamento" })
  renderPage()
  await screen.findByText("[TESTE LOCAL] Demo")
  await user.click(await screen.findByRole("button", { name: "Mudar o status do produto" }))
  const items = (await screen.findAllByRole("menuitem")).map((item) => item.textContent ?? "")
  for (const label of ["Em preparação", "Pré-lançamento", "Ativo", "Pausado", "Esgotado temporariamente", "Inativo"]) {
    expect(items.some((text) => text.startsWith(label))).toBe(true)
  }
  await user.click(screen.getAllByRole("menuitem").find((item) => item.textContent?.startsWith("Pré-lançamento"))!)
  expect(await screen.findByText(/Mudar o status para “Pré-lançamento”\?/)).toBeInTheDocument()
  expect(api.setCatalog2ProductStatus).not.toHaveBeenCalled()
  await user.click(screen.getByTestId("status-change-confirm"))
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
  const panel = await openEditorPanel(user)
  await editDraft(user, panel)
  await goToEditorStep(user, panel, /Conferência, preço e publicação/)
  await user.click(editorSubTab(panel, "Publicação e versões"))
  expect(await within(panel).findByText("2 bloqueio(s)")).toBeInTheDocument()
  expect(within(panel).getByRole("button", { name: "Publicar versão" })).toBeDisabled()
  expect(api.validateCatalog2Version).toHaveBeenCalledWith("v2")
  expect(api.publishCatalog2Version).not.toHaveBeenCalled()
})

// Bug real reportado 2026-09-11: "Com pendências" reusava o mesmo estado
// de "Categorias" — clicar nela nunca filtrava nada, só reabria/fechava o
// painel de "Categorias" (a interface "permanecia ou retornava para
// Categorias"). Cada aba agora tem identidade e estado próprios.
it("bug real: 'Com pendências' filtra de verdade (has_pendencies=true), fica visualmente ativa, e 'Categorias' deixa de estar ativa", async () => {
  renderPage()
  await screen.findByText("[TESTE LOCAL] Demo")

  // A faixa visível é a compacta da barra (botões com aria-label; a faixa larga antiga está oculta). Cada aba tem a sua
  // cor sempre visível e a selecionada fica mais forte (QUICK_TAB_TONE: rosa e violeta "-200").
  const pendenciasTab = screen.getByRole("button", { name: "Com pendências" })
  const categoriasTab = screen.getByRole("button", { name: "Categorias" })

  await userEvent.click(pendenciasTab)
  await waitFor(() => expect(api.getCatalog2Products).toHaveBeenCalledWith(expect.objectContaining({ has_pendencies: "true" })))
  expect(pendenciasTab.className).toContain("bg-rose-200")
  expect(categoriasTab.className).not.toContain("bg-violet-200")
  expect(screen.queryByLabelText("Pilar")).not.toBeInTheDocument()

  await userEvent.type(screen.getByPlaceholderText(/Pesquisar produtos/i), "demo")
  await waitFor(() => expect(api.getCatalog2Products).toHaveBeenCalledWith(expect.objectContaining({ has_pendencies: "true", q: "demo" })))

  await userEvent.click(screen.getByRole("button", { name: "Todos os produtos" }))
  await waitFor(() => expect(api.getCatalog2Products).toHaveBeenLastCalledWith(expect.objectContaining({ has_pendencies: undefined })))
  expect(pendenciasTab.className).not.toContain("bg-rose-200")
})

// Bug real reportado 2026-09-11: o contador ("36 produtos") vem de
// /overview — uma chamada INDEPENDENTE da listagem (/products) — então ele
// continua certo mesmo quando a listagem falha em mostrar linhas. Isso
// acontece quando `page` fica acima do total de páginas válido pro total
// ATUAL (ex.: o total caiu de um valor maior — como nos 162 antigos — para
// 36, enquanto a página selecionada continuava a mesma): a API responde com
// `total` correto e `data: []`, porque a página pedida não existe mais.
it("bug real: contador mostra 36 produtos mas tabela/grade ficam vazias (página antiga inválida após o total cair) — corrige sozinho, sem F5", async () => {
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
    // Como a API real: respeita o page_size pedido pela tela (o padrão da barra é 10 por página; antes a simulação
    // fixava 15 e a página "corrigida" pela tela continuava vazia só na simulação).
    const pageSize = Number(params?.page_size) || 15
    const page = Number(params?.page) || 1
    if (call === 1) {
      const old = Array.from({ length: 90 }, (_, i) => ({ ...ALL_36[i % 36], id: `old-${i}` }))
      return { data: old.slice(0, pageSize), total: 90, page: 1, page_size: pageSize }
    }
    const total = ALL_36.length
    const start = (page - 1) * pageSize
    return { data: ALL_36.slice(start, start + pageSize), total, page, page_size: pageSize }
  })

  renderPage()
  await screen.findByText("Produto real 0")

  // A paginação compacta da barra tem o campo "Ir para a página" (desde 10/2026); vai pra uma página que só existia
  // no total "antigo" (90 → 6 páginas).
  await userEvent.type(screen.getByRole("spinbutton", { name: "Ir para a página" }), "5")
  await userEvent.click(screen.getByRole("button", { name: "Ir" }))
  await waitFor(() => expect(api.getCatalog2Products).toHaveBeenCalledWith(expect.objectContaining({ page: 5 })))

  // a tela se corrige sozinha — nunca fica "36 produtos, tabela vazia"
  await waitFor(() => {
    expect(screen.getAllByText(/Produto real/).length).toBeGreaterThan(0)
  })
  const lastCall = api.getCatalog2Products.mock.calls.at(-1)![0]
  expect(lastCall.page).toBeLessThanOrEqual(Math.ceil(36 / lastCall.page_size))
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

// Os textos informativos sobre os 162 produtos do catálogo antigo saíram da tela em 24/09 (aceito pelo usuário em
// 04/11); a lista continua vindo só do catalog2.
it("listagem: mostra produtos catalog2, situação, etiqueta Novo, e nunca os 162 antigos", async () => {
  renderPage()
  expect(await screen.findByText("[TESTE LOCAL] Demo")).toBeInTheDocument()
  expect(api.getCatalog2Products).toHaveBeenCalled()
  expect(screen.getAllByText("Ativo").length).toBeGreaterThan(0)
  // a etiqueta "Novo" fica no selo da imagem, que só existe nos cards (modo Grade)
  await userEvent.click(screen.getByRole("button", { name: "3 colunas" }))
  expect(screen.getByText("Novo")).toBeInTheDocument()
  expect(screen.queryByText(/ANTIGA #/i)).not.toBeInTheDocument()
  await userEvent.type(screen.getByPlaceholderText(/Pesquisar produtos/i), "demo")
  await waitFor(() => expect(api.getCatalog2Products).toHaveBeenCalledWith(expect.objectContaining({ q: "demo" })))
})

// O bloco de texto do resumo saiu com o painel de importação (24/09, aceito em 04/11): o resumo por situação são as
// próprias abas da barra, cada uma com o seu número, sem repetir os estados em outro painel.
it("resumo de status único: as abas da barra mostram cada situação uma vez, com o número real", async () => {
  renderPage()
  await screen.findByText("[TESTE LOCAL] Demo")
  expect(within(screen.getByRole("button", { name: "Em preparação" })).getByText("36")).toBeInTheDocument()
  expect(within(screen.getByRole("button", { name: "Ativos" })).getByText("1")).toBeInTheDocument()
  expect(screen.getAllByRole("button", { name: "Em preparação" })).toHaveLength(1)
})

it("construtor abre dentro do container padrão (com botão de fixar na bandeja) e Fechar volta pra lista", async () => {
  const user = userEvent.setup()
  renderPage()
  await screen.findByText("[TESTE LOCAL] Demo")
  await user.click(await screen.findByRole("button", { name: /editar produto|continuar configuração/i }))
  expect(await screen.findByLabelText("Título comercial")).toBeInTheDocument()
  const panel = screen.getByTestId("product-editor-panel")
  // a página também tem o seu botão de bandeja — o do construtor fica dentro do painel
  expect(within(panel).getByRole("button", { name: /adicionar à bandeja de telas/i })).toBeInTheDocument()
  await user.click(within(panel).getByRole("button", { name: /^Fechar$/ }))
  await waitFor(() => expect(screen.queryByTestId("product-editor-panel")).not.toBeInTheDocument())
  expect(screen.getByPlaceholderText(/Pesquisar produtos/i)).toBeInTheDocument()
})

// O aviso fixo de "campos provisórios" do construtor saiu (aceito em 04/11). Quem diz o que falta é o indicador de
// preenchimento do cabeçalho e a lista de bloqueios da conferência.
it("construtor: produto sem preço mostra o que falta no preenchimento e nos bloqueios", async () => {
  renderPage()
  await screen.findByText("[TESTE LOCAL] Demo")
  await userEvent.click(screen.getByRole("button", { name: /editar produto|continuar configuração/i }))
  await screen.findByLabelText("Título comercial")
  const panel = screen.getByTestId("product-editor-panel")
  expect(within(panel).getByRole("button", { name: "Ver preenchimento do produto" })).toBeInTheDocument()
  expect(within(panel).getByText("Preço a definir")).toBeInTheDocument()
  expect(within(panel).getByText("Precificação")).toBeInTheDocument()
})

it("reunião 10/09: produto com esforço provisório mostra 'Especialidade e tempo provisórios para teste' na listagem", async () => {
  api.getCatalog2Readiness.mockResolvedValue({
    ready_for_client: 0, total: 1, client_visible_now: 0, with_blockers: 1, note: "",
    products: [{ id: "prod1", name: "[TESTE LOCAL] Demo", task_count: 1, price_amount: null, blockers: [], pendings: [], functional_for_test: true }],
  })
  renderPage()
  await screen.findByText("[TESTE LOCAL] Demo")
  // Desde 10/2026 o aviso fica no ícone de saúde da linha ("Dados provisórios") e o motivo aparece ao passar o mouse.
  const icon = await screen.findByLabelText("Dados provisórios")
  await userEvent.hover(icon)
  expect((await screen.findAllByText("Especialidade e tempo provisórios para teste.")).length).toBeGreaterThan(0)
})

// Editor padrão desde 03/11 (fluxo de 3 passos): abre na versão publicada, em leitura; editar pede escolher o
// rascunho e clicar em "Editar".
it("editor: as seções do cadastro seguem acessíveis no fluxo de 3 passos", async () => {
  const user = userEvent.setup()
  renderPage()
  await screen.findByText("[TESTE LOCAL] Demo")
  const panel = await openEditorPanel(user)
  const nav = within(panel).getByRole("navigation", { name: "Passos do produto" })
  const labels = within(nav).getAllByRole("button").map((b) => b.textContent ?? "")
  expect(labels).toHaveLength(3)
  expect(labels[0]).toMatch(/Produto/)
  expect(labels[1]).toMatch(/Configurações da tarefa e etapas/)
  expect(labels[2]).toMatch(/Conferência, preço e publicação/)

  // Passo 1: dados, classificação, público, descrição, comercial, itens, requisitos e resumo da mudança
  for (const section of ["Dados principais", "Classificação do produto", "Quem pode ver este produto", "Descrição completa", "Informações comerciais", "Requisitos e resumo dos entregáveis", "Resumo da mudança"]) {
    expect(within(panel).getAllByText(section).length).toBeGreaterThan(0)
  }
  expect(within(panel).getByText("Classificações 4F")).toBeInTheDocument()

  // Passo 2: variações do produto e as tarefas com as suas etapas
  await goToEditorStep(user, panel, /Configurações da tarefa e etapas/)
  expect(within(panel).getAllByText("Formato").length).toBeGreaterThan(0)
  expect(within(panel).getByRole("button", { name: "Ver tarefa 1: Tarefa 1" })).toBeInTheDocument()

  // Passo 3: conferência final, publicação/versões e histórico
  await goToEditorStep(user, panel, /Conferência, preço e publicação/)
  for (const tab of ["Conferência final", "Publicação e versões", "Histórico"]) expect(editorSubTab(panel, tab)).toBeTruthy()
  expect(within(panel).getAllByText("Composição do preço").length).toBeGreaterThan(0)
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
  // No editor novo a tarefa nasce pelo botão "Adicionar tarefa" → "Criar nova tarefa" (só o nome; ela entra no catálogo
  // global de modelos). Etapas e questionário são editados nos modais próprios, cobertos nos testes do editor
  // (step-row-*, catalog2-questionnaire-builder.test.tsx); aqui fica o caminho de ponta a ponta da tarefa.
  it("criar tarefa nova no rascunho — continua visível ao fechar e reabrir", async () => {
    const user = userEvent.setup()
    const db = statefulDraftProduct()
    api.getCatalog2Product.mockImplementation(async () => JSON.parse(JSON.stringify(db)))
    api.addCatalog2Task.mockImplementation(async (versionId: string, body: any) => {
      const v = db.versions.find((x: any) => x.id === versionId)
      const task = { id: "t-new-1", key: "briefing-inicial", name: body.name, sort_order: 1, execution_mode: "humano", estimated_minutes: null, is_conditional: false, requires_review: false, specialty: null, questionnaire: null, ai: null, depends_on: [], steps: [] }
      v.tasks.push(task)
      return task
    })

    renderPage()
    await screen.findByText("[TESTE LOCAL] Demo")
    let panel = await openEditorPanel(user)
    await editDraft(user, panel)
    await startNewTask(user, panel, "Briefing inicial")
    await user.click(within(panel).getByRole("button", { name: "Criar tarefa" }))
    await waitFor(() => expect(api.addCatalog2Task).toHaveBeenCalledWith("v2", expect.objectContaining({ name: "Briefing inicial" })))
    expect(await within(panel).findByRole("button", { name: /Ver tarefa 1: Briefing inicial/ })).toBeInTheDocument()
    expect(api.addCatalog2Task).toHaveBeenCalledTimes(1)

    // em edição, sair pede confirmação ("Deseja salvar antes de sair?"); a tarefa já foi gravada no servidor
    await user.click(within(panel).getByRole("button", { name: /^Fechar$/ }))
    await user.click(await screen.findByRole("button", { name: "Salvar rascunho e sair" }))
    await waitFor(() => expect(screen.queryByTestId("product-editor-panel")).not.toBeInTheDocument())
    panel = await openEditorPanel(user)
    await chooseVersion(user, panel, "v2 — Rascunho")
    expect(await within(panel).findByRole("button", { name: /Ver tarefa 1: Briefing inicial/ })).toBeInTheDocument()
  // Monta o editor completo duas vezes (criar e reabrir): ~10s medidos com só 2 arquivos rodando (04/11), então os 15s
  // padrão estouram na suíte completa. Folga só neste teste.
  }, 45_000)

  // Desde 30/09 ("catálogo global de modelos") a tarefa existente vem do catálogo de modelos, e não mais copiada de
  // outro produto: "Selecionar modelo existente" → "Usar" adiciona a tarefa nesta versão sem mexer no modelo.
  // A parte "adicionar etapa" do antigo teste integrado (setembro): no editor atual a etapa nasce por "Ver tarefa" →
  // "Adicionar etapa" → "Criar nova etapa" → pergunta se é em ciclos. A edição da etapa abre o modal de 6 blocos, coberto
  // em step-row-*.test.tsx e catalog2-questionnaire-builder.test.tsx ("modal da etapa preserva seis formulários").
  it("adicionar etapa a uma tarefa do rascunho grava a etapa nessa tarefa, uma única vez", async () => {
    const user = userEvent.setup()
    const db = productDetail()
    ;(db.versions[0] as any).tasks = [{ id: "t-draft", key: "t-draft", name: "Tarefa do rascunho", sort_order: 1, execution_mode: "humano", estimated_minutes: null, is_conditional: false, requires_review: false, specialty: null, questionnaire: null, ai: null, depends_on: [], steps: [] }]
    api.getCatalog2Product.mockImplementation(async () => JSON.parse(JSON.stringify(db)))
    api.addCatalog2Step.mockImplementation(async (taskId: string, body: any) => {
      const step = { id: "s-new-1", key: "nova-etapa", name: body.name, sort_order: 1, estimated_minutes: null, is_conditional: false }
      ;((db.versions[0] as any).tasks.find((t: any) => t.id === taskId).steps as any[]).push(step)
      return step
    })

    renderPage()
    await screen.findByText("[TESTE LOCAL] Demo")
    const panel = await openEditorPanel(user)
    await editDraft(user, panel)
    await user.click(within(panel).getByRole("button", { name: /Ver tarefa 1: Tarefa do rascunho/ }))
    await user.click(await within(panel).findByRole("tab", { name: "Etapas e fluxo" }))
    await user.click(await within(panel).findByRole("button", { name: /Adicionar etapa/ }))
    await user.click(await screen.findByTestId("create-new-step"))
    await user.click(await screen.findByTestId("step-ask-cycles-no"))

    await waitFor(() => expect(api.addCatalog2Step).toHaveBeenCalledWith("t-draft", expect.objectContaining({ name: "Nova etapa" })))
    expect(api.addCatalog2Step).toHaveBeenCalledTimes(1)
    expect((await within(panel).findAllByText("Nova etapa")).length).toBeGreaterThan(0)
    // 700 ms depois de criar, o editor abre sozinho o modal da etapa nova (OPEN_STEP_EVENT); ele precisa abrir sem erro
    expect(await screen.findByTestId("step-edit-panel", {}, { timeout: 3000 })).toBeInTheDocument()
  // editor completo + painel da tarefa: ~5,6s sozinho (04/11); folga só neste teste para a suíte completa
  }, 45_000)

  it("selecionar modelo de tarefa existente adiciona a tarefa nesta versão, sem alterar o modelo de origem", async () => {
    const user = userEvent.setup()
    const db = statefulDraftProduct()
    api.getCatalog2Product.mockImplementation(async () => JSON.parse(JSON.stringify(db)))
    api.getCatalog2TaskModels.mockResolvedValue({
      data: [{ id: 12, name: "Revisão de SEO", is_active: true, execution_mode: "humano", specialty: { name: "SEO" }, estimated_minutes: 30, cycle_type: "avulso", step_count: 2, product_count: 1 }],
      total: 1,
    })
    api.addCatalog2TaskFromModel.mockImplementation(async (versionId: string) => {
      (db.versions.find((x: any) => x.id === versionId).tasks as any[]).push({ id: "t-from-model", key: "revisao-seo", name: "Revisão de SEO", sort_order: 1, execution_mode: "humano", estimated_minutes: 30, is_conditional: false, requires_review: false, specialty: null, questionnaire: null, ai: null, depends_on: [], steps: [] })
      return { ok: true }
    })

    renderPage()
    await screen.findByText("[TESTE LOCAL] Demo")
    const panel = await openEditorPanel(user)
    await editDraft(user, panel)
    await user.click(within(panel).getByRole("button", { name: "Adicionar tarefa" }))
    await user.click(await screen.findByRole("menuitem", { name: /Selecionar modelo existente/ }))
    expect(await screen.findByText("Revisão de SEO")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Usar" }))

    await waitFor(() => expect(api.addCatalog2TaskFromModel).toHaveBeenCalledWith("v2", 12))
    expect(await within(panel).findByRole("button", { name: /Ver tarefa 1: Revisão de SEO/ })).toBeInTheDocument()
    // o modelo de origem não é alterado nem duplicado
    expect(api.updateCatalog2Task).not.toHaveBeenCalled()
    expect(api.addCatalog2Task).not.toHaveBeenCalled()
  })

  it("cancelar a criação da tarefa preserva o produto e as tarefas já existentes", async () => {
    const user = userEvent.setup()
    const db = productDetail()
    db.versions[0].tasks = [{ id: "t-existing", key: "existente", name: "Tarefa existente", sort_order: 1, execution_mode: "humano", estimated_minutes: null, is_conditional: false, requires_review: false, specialty: null, questionnaire: null, ai: null, depends_on: [], steps: [] }]
    api.getCatalog2Product.mockImplementation(async () => JSON.parse(JSON.stringify(db)))

    renderPage()
    await screen.findByText("[TESTE LOCAL] Demo")
    const panel = await openEditorPanel(user)
    await editDraft(user, panel)
    await startNewTask(user, panel, "Não deveria existir")
    await user.click(within(panel).getByRole("button", { name: "Cancelar" }))
    expect(newTaskInput(panel)).not.toBeInTheDocument()
    expect(api.addCatalog2Task).not.toHaveBeenCalled()
    expect(within(panel).getByRole("button", { name: /Ver tarefa 1: Tarefa existente/ })).toBeInTheDocument()
    expect(within(panel).queryByText("Não deveria existir")).not.toBeInTheDocument()
  })

  it("erro ao salvar a tarefa mostra mensagem visível e não fecha o formulário de criação", async () => {
    const user = userEvent.setup()
    api.addCatalog2Task.mockRejectedValue(new Error("Falha simulada ao criar a tarefa."))
    renderPage()
    await screen.findByText("[TESTE LOCAL] Demo")
    const panel = await openEditorPanel(user)
    await editDraft(user, panel)
    await startNewTask(user, panel, "Tarefa com erro")
    await user.click(within(panel).getByRole("button", { name: "Criar tarefa" }))
    expect((await screen.findAllByText(/Falha simulada ao criar a tarefa\./)).length).toBeGreaterThan(0)
    expect(newTaskInput(panel)).toHaveValue("Tarefa com erro")
    expect(within(panel).getByRole("button", { name: "Criar tarefa" })).toBeInTheDocument()
  })


  // Item 3.1 (reunião 2026-09-14, "Edição e preservação dos questionários").


})

it("versão publicada é somente leitura (a UI bloqueia edição)", async () => {
  api.getCatalog2Product.mockResolvedValue(
    productDetail({ versions: [productDetail().versions[1]] }), // só a v1 publicada
  )
  const user = userEvent.setup()
  renderPage()
  await screen.findByText("[TESTE LOCAL] Demo")
  const panel = await openEditorPanel(user)
  expect(within(panel).getAllByText("v1 — Publicada").length).toBeGreaterThan(0)
  expect(within(panel).getByLabelText("Título comercial")).toBeDisabled()
  // em leitura não há o que salvar nem como criar tarefa
  expect(within(panel).queryByRole("button", { name: "Travar edição" })).not.toBeInTheDocument()
  expect(within(panel).queryByRole("button", { name: "Adicionar tarefa" })).not.toBeInTheDocument()
  expect(api.updateCatalog2VersionInfo).not.toHaveBeenCalled()
})

it("passo Conferência: o preço usa o cálculo do backend e mostra a composição detalhada", async () => {
  const user = userEvent.setup()
  renderPage()
  await screen.findByText("[TESTE LOCAL] Demo")
  const panel = await openEditorPanel(user)
  await goToEditorStep(user, panel, /Conferência, preço e publicação/)
  await waitFor(() => expect(api.simulateCatalog2).toHaveBeenCalled())
  const composition = await openCostCard(user, panel, "Composição do preço")
  expect(within(composition).getByText("Preço comercial final")).toBeInTheDocument()
  expect(within(composition).getAllByText(/BRL 90,00/).length).toBeGreaterThan(0)
  expect(within(composition).getByText("Custo humano")).toBeInTheDocument()
})

// A "Pré-visualização" saiu; quem confere é a "Conferência final", que pede a validação ao backend (a mesma usada para
// publicar) em vez de recalcular no navegador.
it("Conferência final usa a validação do backend (não recalcula no front)", async () => {
  const user = userEvent.setup()
  api.validateCatalog2Version.mockResolvedValue({ ok: false, issues: ["Custo de IA não definido."], pricing_pending: true })
  renderPage()
  await screen.findByText("[TESTE LOCAL] Demo")
  const panel = await openEditorPanel(user)
  await goToEditorStep(user, panel, /Conferência, preço e publicação/)
  await user.click(editorSubTab(panel, "Conferência final"))
  expect(await within(panel).findByText("Pronto para publicar?")).toBeInTheDocument()
  expect(within(panel).getAllByText("1 bloqueio").length).toBeGreaterThan(0)
  expect(api.validateCatalog2Version).toHaveBeenCalledWith("v1")
})

it("Publicação e versões mostra as pendências de validação antes de publicar", async () => {
  const user = userEvent.setup()
  renderPage()
  await screen.findByText("[TESTE LOCAL] Demo")
  const panel = await openEditorPanel(user)
  await editDraft(user, panel)
  await goToEditorStep(user, panel, /Conferência, preço e publicação/)
  await user.click(editorSubTab(panel, "Publicação e versões"))
  expect(await within(panel).findByText("1 bloqueio(s)")).toBeInTheDocument()
  expect(within(panel).getByText("1 pendência(s) a revisar")).toBeInTheDocument()
  expect(within(panel).getByRole("button", { name: "Publicar versão" })).toBeDisabled()
  await user.click(editorSubTab(panel, "Histórico"))
  expect(await within(panel).findByText(/Histórico da versão/i)).toBeInTheDocument()
})

// ── Importação dos 36 (sprint de produtos, bloco 4/6) ────────────────
// O painel de importação (resumo, checksum da planilha, 36/36) saiu da tela em 24/09; o usuário aceitou o estado atual
// em 04/11. Os dados continuam no backend (getCatalog2ImportSummary); a tela não os mostra mais.

// ── Bloco 2 (10/09/2026): transparência e prontidão ─────────────────

// Os cartões "Importados (finais)/Tarefas/Etapas (nos importados)" saíram com o painel de importação (aceito em 04/11).
// O que continua: os números das abas vêm de overview.counts, nunca de um número fixo.
it("contagens das abas vêm de overview.counts (dados reais), não de literal", async () => {
  api.getCatalog2Overview.mockResolvedValue({
    ...OVERVIEW,
    counts: { ...OVERVIEW.counts, products: 9, products_in_preparation: 7, products_published: 2, products_with_pendencies: 5 },
    products_by_status: { em_preparacao: 7, disponivel: 2 },
  })
  renderPage()
  await screen.findByText("[TESTE LOCAL] Demo")
  expect(within(screen.getByRole("button", { name: "Em preparação" })).getByText("7")).toBeInTheDocument()
  expect(within(screen.getByRole("button", { name: "Ativos" })).getByText("2")).toBeInTheDocument()
  expect(within(screen.getByRole("button", { name: "Com pendências" })).getByText("5")).toBeInTheDocument()
  for (const tab of ["Em preparação", "Ativos", "Com pendências"]) {
    expect(within(screen.getByRole("button", { name: tab })).queryByText("36")).not.toBeInTheDocument()
  }
})

it("não usa mensagem falsa 'ainda não foram importados' quando há importação", async () => {
  renderPage()
  await screen.findByText("[TESTE LOCAL] Demo")
  expect(screen.queryByText(/ainda não foram importados/i)).not.toBeInTheDocument()
})

// Regressão 04/11 (erro real): a composição do preço do editor novo voltou a mostrar "Preço comercial final BRL 0,00"
// e "Sem pendências" para produto sem nenhuma tarefa.
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
  const panel = await openEditorPanel(user)
  await goToEditorStep(user, panel, /Conferência, preço e publicação/)
  await waitFor(() => expect(api.simulateCatalog2).toHaveBeenCalled())
  const composition = await openCostCard(user, panel, "Composição do preço")
  expect(within(composition).getByText("Sem tarefas cadastradas — base de custo indefinida")).toBeInTheDocument()
  expect(within(composition).getByText(/Cadastre tarefas, especialidades, tempos e prazo/i)).toBeInTheDocument()
  expect(within(composition).queryByText("Preço comercial final")).not.toBeInTheDocument()
  expect(within(composition).queryByText("Sem pendências")).not.toBeInTheDocument()
  expect(within(composition).getByText("Sem tarefas ativas — base de custo indefinida")).toBeInTheDocument()
})

it("passo Conferência: produto COM tarefas válidas mantém a composição detalhada normal", async () => {
  const user = userEvent.setup()
  renderPage()
  await screen.findByText("[TESTE LOCAL] Demo")
  const panel = await openEditorPanel(user)
  await goToEditorStep(user, panel, /Conferência, preço e publicação/)
  await waitFor(() => expect(api.simulateCatalog2).toHaveBeenCalled())
  const composition = await openCostCard(user, panel, "Composição do preço")
  expect(within(composition).getByText("Preço comercial final")).toBeInTheDocument()
  expect(within(composition).getByText("Sem pendências")).toBeInTheDocument()
  expect(within(composition).queryByText(/base de custo indefinida/i)).not.toBeInTheDocument()
})


// O atalho de prontidão virou o indicador "Preenchimento" do cabeçalho do editor (25/09).
it("prontidão por produto: o indicador de preenchimento abre e mostra os itens reais do backend", async () => {
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
  const panel = await openEditorPanel(user)
  await user.click(within(panel).getByRole("button", { name: "Ver preenchimento do produto" }))
  expect((await screen.findAllByText(/Sem tarefas cadastradas — base de custo indefinida/i)).length).toBeGreaterThan(0)
  expect(screen.getAllByText("Prazo comercial base não definido.").length).toBeGreaterThan(0)
  expect(api.getCatalog2ProductReadiness).toHaveBeenCalledWith("prod1", expect.anything())
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
  // slug/origem/#index crus não poluem a leitura principal da linha.
  expect(screen.queryByText(/slug demo/)).not.toBeInTheDocument()
})

// Auditoria forense 2026-09-11 (trabalho de 10/09/2026, commits 9539f94/823b18c) recuperou "Detalhes técnicos" por
// linha e o selo "editado por humano"; os dois saíram de novo em 24/09 e o usuário aceitou o estado atual em 04/11 —
// por isso os testes deles foram retirados. O slug cru continua fora da linha (teste acima).

it("banner: link 'Pré-visualizar como cliente' existe e aponta pro preview do catalog2", async () => {
  renderPage()
  await screen.findByText("[TESTE LOCAL] Demo")
  const link = screen.getByRole("link", { name: /Pré-visualizar como cliente/i })
  expect(link).toHaveAttribute("href", "/admin/catalog2?preview=1")
})

// A aba "Origem e importação" foi removida do editor em 25/09 (deploy-log: os produtos são novos, sem vínculo com a
// plataforma antiga). Ela não pode voltar escondida em nenhum passo.
it("editor não tem mais a aba Origem e importação (removida em 25/09)", async () => {
  renderPage()
  await screen.findByText("[TESTE LOCAL] Demo")
  await userEvent.click(screen.getByRole("button", { name: /editar produto|continuar configuração/i }))
  await screen.findByLabelText("Título comercial")
  expect(screen.queryByRole("tab", { name: /Origem e importação/i })).not.toBeInTheDocument()
  expect(screen.queryByText(/Planilha principal/i)).not.toBeInTheDocument()
  expect(api.getCatalog2ProductOrigin).not.toHaveBeenCalled()
})
