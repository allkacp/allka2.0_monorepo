import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { SidebarProvider } from "@/contexts/sidebar-context"
import AdminNovoCatalogoPage from "@/app/admin/produtos/novo-catalogo/page"

function renderPage() {
  return render(
    <MemoryRouter>
      <SidebarProvider>
        <AdminNovoCatalogoPage />
      </SidebarProvider>
    </MemoryRouter>,
  )
}

// Construtor do novo catálogo (sprint de produtos, bloco 3/6).

const { api } = vi.hoisted(() => ({
  api: {
    getCatalog2Overview: vi.fn(),
    getCatalog2Pillars: vi.fn(),
    getCatalog2FourF: vi.fn(),
    getCatalog2Categories: vi.fn(),
    getCatalog2Specialties: vi.fn(),
    getCatalog2Products: vi.fn(),
    getCatalog2Product: vi.fn(),
    createCatalog2Product: vi.fn(),
    newCatalog2Version: vi.fn(),
    setCatalog2ProductStatus: vi.fn(),
    archiveCatalog2Product: vi.fn(),
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
  api.getCatalog2Overview.mockResolvedValue(OVERVIEW)
  api.getCatalog2Pillars.mockResolvedValue(REFS.pillars)
  api.getCatalog2FourF.mockResolvedValue(REFS.fourF)
  api.getCatalog2Categories.mockResolvedValue(REFS.categories)
  api.getCatalog2Specialties.mockResolvedValue(REFS.specialties)
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

it("listagem: mostra produtos do NOVO catálogo, situação, etiqueta Novo, e nunca os 162", async () => {
  renderPage()
  expect(await screen.findByText("[TESTE LOCAL] Demo")).toBeInTheDocument()
  expect(screen.getByText(/não conta os 162 operacionais/i)).toBeInTheDocument()
  expect(screen.getByText(/catálogo operacional atual, com 162 produtos, não é afetado/i)).toBeInTheDocument()
  expect(screen.getByText("Novo")).toBeInTheDocument()
  expect(screen.getAllByText("Disponível").length).toBeGreaterThan(0)
  // busca é passada ao backend
  await userEvent.type(screen.getByPlaceholderText(/Buscar por nome/i), "demo")
  await waitFor(() => expect(api.getCatalog2Products).toHaveBeenCalledWith(expect.objectContaining({ q: "demo" })))
})

it("banner deixa claro que os produtos estão 'Em preparação' e o que falta para publicar", async () => {
  renderPage()
  await screen.findByText("[TESTE LOCAL] Demo")
  expect(screen.getByText(/produtos importados estão/i)).toBeInTheDocument()
  expect(screen.getAllByText(/em prepara/i).length).toBeGreaterThan(0)
  expect(screen.getByText(/cadastrar tarefas, etapas e prazos, definir a precificação e passar pela revisão final/i)).toBeInTheDocument()
})

it("editor: as 10 seções seguem acessíveis, reagrupadas em 5 etapas + Origem", async () => {
  const user = userEvent.setup()
  renderPage()
  await user.click(await screen.findByText("[TESTE LOCAL] Demo"))

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
  expect(await screen.findByText("Classificações 4F")).toBeInTheDocument()
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

it("versão publicada é somente leitura (a UI bloqueia edição)", async () => {
  api.getCatalog2Product.mockResolvedValue(
    productDetail({ versions: [productDetail().versions[1]] }), // só a v1 publicada
  )
  const user = userEvent.setup()
  renderPage()
  await user.click(await screen.findByText("[TESTE LOCAL] Demo"))
  expect(await screen.findByText(/Versão publicada — somente leitura/i)).toBeInTheDocument()
})

it("etapa Custos e preço: simulador usa o cálculo do backend e mostra o resumo detalhado", async () => {
  const user = userEvent.setup()
  renderPage()
  await user.click(await screen.findByText("[TESTE LOCAL] Demo"))
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
  await user.click(await screen.findByText("[TESTE LOCAL] Demo"))
  await user.click(await screen.findByRole("tab", { name: "Revisão e publicação" }))
  await user.click(await screen.findByRole("tab", { name: /^Pré-visualização$/ }))
  await waitFor(() => expect(api.previewCatalog2Version).toHaveBeenCalledWith("v2"))
  expect(await screen.findByText(/mesmo cálculo do backend/i)).toBeInTheDocument()
})

it("etapa Revisão: Publicação e versões mostra as pendências de validação antes de publicar", async () => {
  const user = userEvent.setup()
  renderPage()
  await user.click(await screen.findByText("[TESTE LOCAL] Demo"))
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
  expect(card("Em preparação")).toHaveTextContent("36")
  expect(card("Publicados")).toHaveTextContent("1")
  expect(card("Com pendências")).toHaveTextContent("36")
})

it("não usa mensagem falsa 'ainda não foram importados' quando há importação", async () => {
  renderPage()
  await screen.findByText("[TESTE LOCAL] Demo")
  expect(screen.queryByText(/ainda não foram importados/i)).not.toBeInTheDocument()
  expect(screen.getByText(/catálogo operacional atual, com 162 produtos, não é afetado/i)).toBeInTheDocument()
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
  await user.click(await screen.findByText("[TESTE LOCAL] Demo"))
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
  await user.click(await screen.findByText("[TESTE LOCAL] Demo"))
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
  await user.click(await screen.findByText("[TESTE LOCAL] Demo"))
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
  await user.click(await screen.findByText("[TESTE LOCAL] Demo"))
  await user.click(await screen.findByRole("button", { name: /Prontidão deste produto/i }))
  expect(await screen.findByText(/Sem tarefas cadastradas — base de custo indefinida/i)).toBeInTheDocument()
  expect(screen.getByText("Prazo comercial base não definido.")).toBeInTheDocument()
  expect(screen.getByText(/3 bloqueador\(es\) · 1 pendência\(s\)/)).toBeInTheDocument()
  expect(api.getCatalog2ProductReadiness).toHaveBeenCalledWith("prod1")
})

it("listagem: filtros avançados vão ao backend; detalhes técnicos saem da linha principal", async () => {
  const user = userEvent.setup()
  renderPage()
  await screen.findByText("[TESTE LOCAL] Demo")
  // filtros avançados ficam atrás de "Mais filtros" — abrir e usar
  await user.click(screen.getByText(/^Mais filtros/))
  await userEvent.selectOptions(screen.getByDisplayValue("Revisão da Rose (todas)"), "true")
  await waitFor(() => expect(api.getCatalog2Products).toHaveBeenCalledWith(expect.objectContaining({ rose_reviewed: "true" })))
  await userEvent.selectOptions(screen.getByDisplayValue("Tipo de pendência (todas)"), "price_pending")
  await waitFor(() => expect(api.getCatalog2Products).toHaveBeenCalledWith(expect.objectContaining({ pendency: "price_pending" })))
  // pendências aparecem como badge na linha (texto de negócio, não código)
  expect(screen.getAllByText("preço").length).toBeGreaterThan(0)
  // slug / origem / #index NÃO poluem a linha — ficam em "Detalhes técnicos"
  expect(screen.queryByText(/slug demo/)).not.toBeInTheDocument()
  await user.click(screen.getAllByText("Detalhes técnicos")[0])
  expect(screen.getByText(/slug demo · origem #3/)).toBeInTheDocument()
})

it("aba Origem e importação: planilha, Rose, divergência, preço histórico e resolver pendência", async () => {
  const user = userEvent.setup()
  renderPage()
  await user.click(await screen.findByText("[TESTE LOCAL] Demo"))
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
