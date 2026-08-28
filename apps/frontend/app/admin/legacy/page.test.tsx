import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import AdminConsultaLegadoPage from "@/app/admin/legacy/page"

// Consulta da Plataforma Anterior (sprint de produtos, bloco 1/6).

const { api } = vi.hoisted(() => ({
  api: {
    getLegacySummary: vi.fn(),
    getLegacyProducts: vi.fn(),
    getLegacyRecord: vi.fn(),
  },
}))
vi.mock("@/lib/api-client", () => ({
  apiClient: api,
  ApiError: class ApiError extends Error {
    status: number
    data?: any
    constructor(m: string, s: number, d?: any) {
      super(m)
      this.status = s
      this.data = d
    }
  },
}))

function summaryFixture(over: Partial<any> = {}) {
  return {
    configured: true,
    batch: {
      id: "b1",
      source_name: "[TESTE LOCAL] Fotografia de produtos anteriores",
      source_environment: "local",
      snapshot_at: new Date().toISOString(),
      imported_at: new Date().toISOString(),
      importer_version: "products-foundation-1",
      status: "completed",
      expected_count: 924,
      imported_count: 924,
      checksum: "abc123def456",
      is_preview: true,
      reconciliation: { product: { expected_source: 162, imported: 162, divergence: 0 } },
      notes: "0 sanitizado(s).",
    },
    counts: { product: 162, product_variation: 172 },
    product_by_status: { ativo: 78, inativo: 84 },
    tabs: {
      resumo: { status: "ready" },
      produtos: { status: "ready", count: 162 },
      contas: { status: "awaiting_import" },
      compras: { status: "awaiting_import" },
      projetos: { status: "awaiting_import" },
      tarefas: { status: "awaiting_import" },
      financeiro: { status: "awaiting_import" },
    },
    ...over,
  }
}

function productsFixture(over: Partial<any> = {}) {
  return {
    data: [
      { id: "r1", original_id: "p1", original_code: "prod_1", title: "Logo e Identidade", subtitle: "resumo", original_status: "ativo", search_category: "Design", search_active: true, sanitized: false },
      { id: "r2", original_id: "p3", original_code: "prod_3", title: "Produto Antigo", subtitle: null, original_status: "inativo", search_category: "Design", search_active: false, sanitized: false },
    ],
    total: 2,
    page: 1,
    page_size: 20,
    batch_id: "b1",
    available_categories: ["Design", "Performance"],
    read_only: true,
    ...over,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  api.getLegacySummary.mockResolvedValue(summaryFixture())
  api.getLegacyProducts.mockResolvedValue(productsFixture())
  api.getLegacyRecord.mockResolvedValue({
    record: {
      id: "r1",
      entity_type: "product",
      original_id: "p1",
      original_code: "prod_1",
      title: "Logo e Identidade",
      original_status: "ativo",
      content: { description: "Descrição do Logo", category: "Design", base_price: 100, counts: { variations: 1 } },
      dates: {},
      sanitized: false,
      sanitized_fields: [],
    },
    batch: { source_name: "[TESTE LOCAL] Fotografia de produtos anteriores", source_environment: "local", snapshot_at: new Date().toISOString() },
    relations_by_type: {
      has_variation: [{ to_original_id: "v1", record: { title: "Plano A", original_status: "ativo" } }],
      in_category: [{ to_original_id: "Design", description: 'Categoria "Design"', record: null }],
    },
    read_only: true,
  })
})

it("Admin comum → mensagem de acesso restrito (404)", async () => {
  api.getLegacySummary.mockRejectedValue(Object.assign(new Error("x"), { status: 404 }))
  render(<AdminConsultaLegadoPage />)
  expect(await screen.findByText(/exclusiva do Admin Master/i)).toBeInTheDocument()
})

it("legado não configurado (503) → mensagem honesta", async () => {
  api.getLegacySummary.mockRejectedValue(Object.assign(new Error("x"), { status: 503, data: { code: "legacy_not_configured" } }))
  render(<AdminConsultaLegadoPage />)
  expect(await screen.findByText(/não está configurada neste ambiente/i)).toBeInTheDocument()
})

it("cabeçalho: título Legacy — Plataforma Anterior + aviso Somente consulta", async () => {
  render(<AdminConsultaLegadoPage />)
  expect(await screen.findByText("Legacy — Plataforma Anterior")).toBeInTheDocument()
  expect(screen.getByText(/Somente consulta/i)).toBeInTheDocument()
  expect(screen.getByText(/Consulta somente leitura dos dados preservados/i)).toBeInTheDocument()
})

it("Resumo: lote, prévia local, data da fotografia, quantidades e conferência", async () => {
  render(<AdminConsultaLegadoPage />)
  expect(await screen.findByText(/Fotografia de produtos anteriores/)).toBeInTheDocument()
  expect(screen.getByText(/prévia local/i)).toBeInTheDocument()
  expect(screen.getByText(/importação concluída/i)).toBeInTheDocument()
  expect(screen.getAllByText(/Nenhuma alteração feita aqui modifica a plataforma atual/i).length).toBeGreaterThan(0)
  expect(screen.getByText(/coerente/i)).toBeInTheDocument()
})

it("abas ainda não importadas são honestas (Aguardando importação histórica)", async () => {
  const user = userEvent.setup()
  render(<AdminConsultaLegadoPage />)
  await screen.findByText(/Fotografia de produtos anteriores/)
  await user.click(screen.getByRole("tab", { name: "Contas" }))
  expect(await screen.findByText(/Aguardando importação histórica/i)).toBeInTheDocument()
})

it("Produtos: lista, busca, filtro e SEM ações de escrita; abre detalhe", async () => {
  const user = userEvent.setup()
  render(<AdminConsultaLegadoPage />)
  await screen.findByText(/Fotografia de produtos anteriores/)
  await user.click(screen.getByRole("tab", { name: "Produtos" }))

  expect(await screen.findByText("Logo e Identidade")).toBeInTheDocument()
  expect(screen.getByText("Produto Antigo")).toBeInTheDocument()
  expect(screen.getAllByText(/Somente leitura/i).length).toBeGreaterThan(0)

  // nenhum botão de escrita
  for (const label of [/editar/i, /excluir/i, /reativar/i, /copiar para o catálogo/i, /salvar/i]) {
    expect(screen.queryByRole("button", { name: label })).not.toBeInTheDocument()
  }

  await user.type(screen.getByPlaceholderText(/Buscar por código/i), "Logo")
  await waitFor(() => expect(api.getLegacyProducts).toHaveBeenCalledWith(expect.objectContaining({ q: "Logo" })))

  await user.click(screen.getByText("Logo e Identidade"))
  expect(await screen.findByText(/Detalhe do registro histórico/i)).toBeInTheDocument()
  expect(screen.getByText(/Descrição do Logo/)).toBeInTheDocument()
  expect(screen.getByText(/Plano A/)).toBeInTheDocument()
  expect(screen.getByText(/id original/i)).toBeInTheDocument()
})

it("detalhe mostra 'Não disponível na fotografia' quando o dado não existe (nunca texto fictício)", async () => {
  const user = userEvent.setup()
  api.getLegacyRecord.mockResolvedValue({
    record: { id: "r1", entity_type: "product", original_id: "p1", original_code: "prod_1", title: "Logo", original_status: "ativo", content: {}, dates: {}, sanitized: false, sanitized_fields: [] },
    batch: { source_name: "x", source_environment: "local", snapshot_at: new Date().toISOString() },
    relations_by_type: {},
    read_only: true,
  })
  render(<AdminConsultaLegadoPage />)
  await screen.findByText(/Fotografia de produtos anteriores/)
  await user.click(screen.getByRole("tab", { name: "Produtos" }))
  await user.click(await screen.findByText("Logo e Identidade"))
  expect(await screen.findAllByText(/Não disponível na fotografia/i)).not.toHaveLength(0)
})
