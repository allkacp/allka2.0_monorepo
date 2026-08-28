import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import AdminNovoCatalogoPage from "@/app/admin/produtos/novo-catalogo/page"

// Novo catálogo — tela de validação (sprint de produtos, bloco 2/6).

const { api } = vi.hoisted(() => ({
  api: {
    getCatalog2Overview: vi.fn(),
    getCatalog2Pillars: vi.fn(),
    getCatalog2FourF: vi.fn(),
    getCatalog2Categories: vi.fn(),
    getCatalog2Specialties: vi.fn(),
    getCatalog2Products: vi.fn(),
    getCatalog2Product: vi.fn(),
  },
}))
vi.mock("@/lib/api-client", () => ({ apiClient: api }))

const REFS = {
  pillars: { data: [{ id: "p1", name: "A. Presença Digital" }, { id: "p2", name: "B. Captação" }] },
  fourF: { data: [{ id: "f1", name: "F1 — Fundação" }] },
  categories: { data: [{ id: "c1", name: "Performance" }] },
  specialties: { data: [{ id: "s1", name: "Designer" }] },
}

function overview(over: Partial<any> = {}) {
  return {
    counts: { products: 0, pillars: 5, four_f: 4, categories: 5, specialties: 7, draft_versions: 0 },
    products_by_status: {},
    is_empty: true,
    empty_message: "O novo catálogo está preparado. Os 36 produtos serão importados em um próximo bloco.",
    ...over,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  api.getCatalog2Overview.mockResolvedValue(overview())
  api.getCatalog2Pillars.mockResolvedValue(REFS.pillars)
  api.getCatalog2FourF.mockResolvedValue(REFS.fourF)
  api.getCatalog2Categories.mockResolvedValue(REFS.categories)
  api.getCatalog2Specialties.mockResolvedValue(REFS.specialties)
  api.getCatalog2Products.mockResolvedValue({ data: [] })
})

it("Admin comum → mensagem de acesso restrito (404)", async () => {
  api.getCatalog2Overview.mockRejectedValue(Object.assign(new Error("x"), { status: 404 }))
  render(<AdminNovoCatalogoPage />)
  expect(await screen.findByText(/exclusiva do Admin Master/i)).toBeInTheDocument()
})

it("catálogo vazio → estado vazio honesto + contagens não misturam os 162", async () => {
  render(<AdminNovoCatalogoPage />)
  expect(await screen.findByText(/Os 36 produtos serão importados em um próximo bloco/i)).toBeInTheDocument()
  expect(screen.getByText(/nunca os 162 atuais/i)).toBeInTheDocument()
  expect(screen.getByText(/162 produtos.*continuam intactos/i)).toBeInTheDocument()
  // ref lists
  expect(screen.getByText(/Pilares \(2\)/)).toBeInTheDocument()
  expect(screen.getByText("A. Presença Digital")).toBeInTheDocument()
})

it("catálogo com produto → lista, situação, e abre a estrutura (versões, variações≠adicionais, tarefas/etapas ordenadas)", async () => {
  const user = userEvent.setup()
  api.getCatalog2Overview.mockResolvedValue(
    overview({ counts: { products: 1, pillars: 5, four_f: 4, categories: 5, specialties: 7, draft_versions: 1 }, is_empty: false }),
  )
  api.getCatalog2Products.mockResolvedValue({
    data: [
      {
        id: "prod1",
        internal_name: "[TESTE LOCAL] Produto Demonstrativo",
        status: "disponivel",
        pillar: { name: "C. Redes" },
        category: { name: "Design" },
        four_f: ["fluxo", "forca"],
        version_count: 2,
        draft_count: 1,
        published_version_id: "v1",
      },
    ],
  })
  api.getCatalog2Product.mockResolvedValue({
    internal_name: "[TESTE LOCAL] Produto Demonstrativo",
    status: "disponivel",
    pillar: { name: "C. Redes" },
    category: { name: "Design" },
    four_f: ["fluxo", "forca"],
    is_new: true,
    versions: [
      {
        id: "v2",
        version_number: 2,
        state: "rascunho",
        summary: "rascunho",
        variations: [],
        addons: [],
        conditions: [],
        tasks: [],
      },
      {
        id: "v1",
        version_number: 1,
        state: "publicada",
        is_published_current: true,
        published_at: new Date().toISOString(),
        summary: "publicada",
        variations: [{ id: "va1", name: "Formato", options: [{ id: "o1", label: "Estático" }] }],
        addons: [{ id: "ad1", name: "Legenda extra" }],
        conditions: [{ id: "cd1", name: "Prazo urgente", applies_to: "prazo" }],
        tasks: [
          { id: "t1", name: "Alinhar briefing", sort_order: 1, execution_mode: "humano", steps: [{ id: "s1", name: "Coletar" }, { id: "s2", name: "Validar" }] },
          { id: "t2", name: "Criar a arte", sort_order: 2, execution_mode: "hibrido", ai: { human_review_required: true }, steps: [] },
        ],
      },
    ],
  })

  render(<AdminNovoCatalogoPage />)
  await user.click(await screen.findByText("[TESTE LOCAL] Produto Demonstrativo"))

  expect(await screen.findByText(/Estrutura do produto/i)).toBeInTheDocument()
  expect(screen.getByText(/Versão 1/)).toBeInTheDocument()
  expect(screen.getByText(/publicada \(atual\)/i)).toBeInTheDocument()
  expect(screen.getByText(/Versão 2/)).toBeInTheDocument()
  expect(screen.getAllByText(/rascunho/i).length).toBeGreaterThan(0)
  expect(screen.getByText(/Variações — obrigatórias \(1\)/)).toBeInTheDocument()
  expect(screen.getByText(/Adicionais — opcionais \(1\)/)).toBeInTheDocument()
  expect(screen.getByText(/#1 Alinhar briefing/)).toBeInTheDocument()
  expect(screen.getByText(/#2 Criar a arte/)).toBeInTheDocument()
  expect(screen.getByText(/IA preparada/i)).toBeInTheDocument()
})
