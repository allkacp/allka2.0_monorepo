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
  counts: { products: 1, pillars: 5, four_f: 4, categories: 5, specialties: 7, draft_versions: 1 },
  is_empty: false,
  empty_message: "O novo catálogo está preparado. Os 36 produtos serão importados em um próximo bloco.",
}
const LIST = {
  data: [
    { id: "prod1", internal_name: "[TESTE LOCAL] Demo", slug: "demo", pillar: { name: "A. Presença" }, category: { name: "Performance" }, status: "disponivel", published_version_number: 1, published_at: new Date().toISOString(), has_draft: true, is_new: true, updated_at: new Date().toISOString() },
  ],
  total: 1,
  page: 1,
  page_size: 15,
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
  api.getCatalog2Product.mockResolvedValue(productDetail())
  api.validateCatalog2Version.mockResolvedValue({ ok: false, issues: ["Selecione um pilar."], pricing_pending: true })
  api.simulateCatalog2.mockResolvedValue({ pricing: { currency: "BRL", quantity: 1, active_task_keys: ["t1"], warnings: [], applied_conditions: [], deadline_detail: "…", estimated_deadline_days: 1, pricing_pending: false, lines: { human_cost: { label: "Custo humano", amount: 90 }, ia_cost: { label: "IA", amount: 0 }, human_review_cost: { label: "Revisão humana", amount: 0 }, addons: { label: "Adicionais", amount: 0 }, variation_impacts: { label: "Impactos de variações", amount: 0 }, condition_impacts: { label: "Impactos de condições", detail: "nenhuma" }, subtotal_cost: { label: "Subtotal", amount: 90 }, taxes_and_margins: [], final_price: { label: "Preço final", amount: 90 }, minimum_price: { label: "Mínimo", amount: 90 } } } })
  api.previewCatalog2Version.mockResolvedValue({ name: "[TESTE LOCAL] Demo", title: "Demo v1", description: "d", pillar: "A. Presença", category: "Performance", four_f: ["F1 — Fundação"], variations: [{ name: "Formato", options: ["Estático"] }], addons: [{ name: "Extra" }], tasks: [{ name: "Tarefa 1", mode: "humano" }], estimated_deadline_days: 1, price: 90, price_pending: false, currency: "BRL" })
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
  expect(screen.getByText(/nunca os 162 atuais/i)).toBeInTheDocument()
  expect(screen.getByText(/162 produtos de hoje continuam intactos/i)).toBeInTheDocument()
  expect(screen.getByText("Novo")).toBeInTheDocument()
  expect(screen.getAllByText("Disponível").length).toBeGreaterThan(0)
  // busca é passada ao backend
  await userEvent.type(screen.getByPlaceholderText(/Buscar por nome/i), "demo")
  await waitFor(() => expect(api.getCatalog2Products).toHaveBeenCalledWith(expect.objectContaining({ q: "demo" })))
})

it("abre o produto: as 9 seções aparecem; variação e adicional têm abas separadas", async () => {
  const user = userEvent.setup()
  renderPage()
  await user.click(await screen.findByText("[TESTE LOCAL] Demo"))

  expect(await screen.findByRole("tab", { name: /1\. Geral/ })).toBeInTheDocument()
  expect(screen.getByRole("tab", { name: /3\. Variações/ })).toBeInTheDocument()
  expect(screen.getByRole("tab", { name: /4\. Adicionais/ })).toBeInTheDocument()
  expect(screen.getByRole("tab", { name: /5\. Tarefas e etapas/ })).toBeInTheDocument()
  expect(screen.getByRole("tab", { name: /6\. Prazos e condições/ })).toBeInTheDocument()
  expect(screen.getByRole("tab", { name: /7\. Custos e preço/ })).toBeInTheDocument()
  expect(screen.getByRole("tab", { name: /9\. Versões e histórico/ })).toBeInTheDocument()
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

it("aba Custos: simulador usa o cálculo do backend e mostra o resumo detalhado", async () => {
  const user = userEvent.setup()
  renderPage()
  await user.click(await screen.findByText("[TESTE LOCAL] Demo"))
  await user.click(await screen.findByRole("tab", { name: /7\. Custos e preço/ }))
  await waitFor(() => expect(api.simulateCatalog2).toHaveBeenCalled())
  expect(await screen.findByText("Custo humano")).toBeInTheDocument()
  expect(screen.getByText("Preço final")).toBeInTheDocument()
  expect(screen.getByText(/Prazo estimado/)).toBeInTheDocument()
})

it("aba Pré-visualização usa o mesmo endpoint do backend (não recalcula no front)", async () => {
  const user = userEvent.setup()
  renderPage()
  await user.click(await screen.findByText("[TESTE LOCAL] Demo"))
  await user.click(await screen.findByRole("tab", { name: /8\. Pré-visualização/ }))
  await waitFor(() => expect(api.previewCatalog2Version).toHaveBeenCalledWith("v2"))
  expect(await screen.findByText(/mesmo cálculo do backend/i)).toBeInTheDocument()
})

it("aba Versões: mostra as pendências de validação antes de publicar", async () => {
  const user = userEvent.setup()
  renderPage()
  await user.click(await screen.findByText("[TESTE LOCAL] Demo"))
  await user.click(await screen.findByRole("tab", { name: /9\. Versões e histórico/ }))
  expect(await screen.findByText("Selecione um pilar.")).toBeInTheDocument()
  expect(screen.getByText(/Validação para publicar/i)).toBeInTheDocument()
  expect(screen.getByText(/Histórico da versão/i)).toBeInTheDocument()
})
