import React from "react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom"
import { setTestViewportWidth } from "@/vitest.setup"

// Aba "Monitoramento" da Central (ata 2026-08, bloco 2/5): alertas críticos
// de terceiros, só leitura, filtros + paginação server-side, estados
// (loading/vazio/erro/403).

const { apiMock } = vi.hoisted(() => ({
  apiMock: {
    getAlertMonitoring: vi.fn(),
    getAlertMonitoringSummary: vi.fn(),
  },
}))

vi.mock("@/lib/api-client", () => ({
  apiClient: apiMock,
  ApiError: class ApiError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  },
}))

vi.mock("@/contexts/account-type-context", () => ({
  useAccountType: () => ({ accountType: "admin" }),
}))

vi.mock("@/components/alert-detail-drawer", () => ({
  AlertDetailDrawer: ({ open }: { open: boolean }) => (open ? <div>detail-drawer</div> : null),
}))

import { AlertsMonitoringView } from "@/components/alerts-monitoring-view"
import { ApiError } from "@/lib/api-client"

function LocationProbe() {
  const loc = useLocation()
  return <div data-testid="loc">{loc.search}</div>
}

function renderView(initialEntries = ["/alertas"]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route
          path="*"
          element={
            <>
              <LocationProbe />
              <AlertsMonitoringView />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

const summaryFixture = {
  criticos_ativos: 3,
  resolvidos_no_periodo: 1,
  automaticos_pendentes: 2,
  manuais_pendentes: 1,
  oldest_open_at: new Date().toISOString(),
  oldest_open_ms: 5 * 24 * 60 * 60 * 1000,
  filtered: false,
}

function rowFixture(over: Partial<any> = {}) {
  return {
    id: "a1",
    title: "Tarefa atrasada de terceiro",
    severity: "error",
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    open_ms: 3 * 24 * 60 * 60 * 1000,
    situacao: "ativo",
    recipient: { id: "u2", name: "Fulana de Tal", email: "f@x.test" },
    is_general: false,
    project: { id: "p1", name: "Projeto X" },
    task: { id: "t1", title: "Arte final" },
    origin: "automatico",
    rule: { id: "r1", name: "Regra atraso", trigger_type: "task.overdue", standard: "Tarefa atrasada" },
    condition_controlled: true,
    disposal_blocked: true,
    resolved_at: null,
    resolution_kind: null,
    resolved_by: null,
    automatic_resolution_message: null,
    ...over,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  setTestViewportWidth(1280)
  apiMock.getAlertMonitoringSummary.mockResolvedValue(summaryFixture)
  apiMock.getAlertMonitoring.mockResolvedValue({
    data: [rowFixture()],
    total: 1,
    page: 1,
    page_size: 20,
    total_pages: 1,
    scope_level: "master",
    scope_note: null,
  })
})

it("9/7. renderiza indicadores e a linha do alerta de terceiro (destinatário, projeto, tarefa, tempo em aberto)", async () => {
  renderView()
  expect(await screen.findByText("Tarefa atrasada de terceiro")).toBeInTheDocument()
  expect(screen.getByText("Fulana de Tal")).toBeInTheDocument()
  expect(screen.getByText(/Projeto X/)).toBeInTheDocument()
  expect(screen.getByText(/Arte final/)).toBeInTheDocument()
  expect(screen.getByText("Críticos ativos")).toBeInTheDocument()
  expect(screen.getByText("3")).toBeInTheDocument()
  expect(screen.getByText(/Em aberto há/)).toBeInTheDocument()
})

it("8. é só leitura — nenhum botão de resolver/dispensar/arquivar, só Detalhes e Ver origem", async () => {
  renderView()
  await screen.findByText("Tarefa atrasada de terceiro")
  expect(screen.getByRole("button", { name: /detalhes/i })).toBeInTheDocument()
  expect(screen.getByRole("link", { name: /ver origem/i })).toBeInTheDocument()
  expect(screen.queryByRole("button", { name: /resolver/i })).not.toBeInTheDocument()
  expect(screen.queryByRole("button", { name: /arquivar/i })).not.toBeInTheDocument()
  expect(screen.queryByRole("button", { name: /dispensar/i })).not.toBeInTheDocument()
})

it("18. resolvido automaticamente mostra o Motor da Allka como autor", async () => {
  apiMock.getAlertMonitoring.mockResolvedValue({
    data: [rowFixture({ situacao: "resolvido", resolved_at: new Date().toISOString(), resolution_kind: "automatica", resolved_by: { id: null, name: "Motor da Allka" }, disposal_blocked: false })],
    total: 1, page: 1, page_size: 20, total_pages: 1, scope_level: "master", scope_note: null,
  })
  renderView()
  expect(await screen.findByText(/Resolvido pelo Motor da Allka/)).toBeInTheDocument()
})

it("19/20/26. aplicar busca e datas escreve nos parâmetros da URL e re-consulta o servidor", async () => {
  const user = userEvent.setup()
  renderView()
  await screen.findByText("Tarefa atrasada de terceiro")
  await user.type(screen.getByRole("searchbox", { name: /buscar/i }), "contrato")
  await waitFor(() => expect(screen.getByTestId("loc").textContent).toContain("q=contrato"))
  await waitFor(() =>
    expect(apiMock.getAlertMonitoring).toHaveBeenLastCalledWith(expect.objectContaining({ q: "contrato", page: "1" })),
  )
})

it("27. 'Limpar filtros' remove os parâmetros da URL", async () => {
  const user = userEvent.setup()
  renderView(["/alertas?q=abc&situacao=resolvido"])
  await screen.findByText("Tarefa atrasada de terceiro")
  await user.click(screen.getByRole("button", { name: /limpar filtros/i }))
  await waitFor(() => {
    const s = screen.getByTestId("loc").textContent ?? ""
    expect(s).not.toContain("q=abc")
    expect(s).not.toContain("situacao=resolvido")
  })
})

it("28. estado vazio", async () => {
  apiMock.getAlertMonitoring.mockResolvedValue({ data: [], total: 0, page: 1, page_size: 20, total_pages: 1, scope_level: "master", scope_note: null })
  renderView()
  expect(await screen.findByText(/Nenhum alerta crítico no escopo/)).toBeInTheDocument()
})

it("29. estado de erro com 'Tentar novamente'", async () => {
  apiMock.getAlertMonitoring.mockRejectedValue(new Error("boom"))
  renderView()
  expect(await screen.findByText(/Não foi possível carregar o Monitoramento/)).toBeInTheDocument()
  expect(screen.getByRole("button", { name: /tentar novamente/i })).toBeInTheDocument()
})

it("12. 403 → mensagem de sem acesso, sem quebrar a Central", async () => {
  apiMock.getAlertMonitoring.mockRejectedValue(new ApiError("forbidden", 403))
  renderView()
  expect(await screen.findByText(/não tem função de acompanhamento/i)).toBeInTheDocument()
})

it("30. mobile (375px) continua renderizando a lista e os filtros", async () => {
  setTestViewportWidth(375)
  renderView()
  expect(await screen.findByText("Tarefa atrasada de terceiro")).toBeInTheDocument()
  expect(screen.getByRole("searchbox", { name: /buscar/i })).toBeInTheDocument()
})
