import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { SidebarProvider } from "@/contexts/sidebar-context"
import { TaskRotationPanel } from "@/components/task-rotation-panel"

const { api } = vi.hoisted(() => ({
  api: {
    getTaskRotation: vi.fn(), restartTaskRotation: vi.fn(), getCurrentUser: vi.fn(),
    getTaskRoutingSettings: vi.fn(), getTaskRoutingAreas: vi.fn(), getTaskRoutingNomades: vi.fn(),
    updateTaskRouting: vi.fn(), updateTaskRoutingSettings: vi.fn(), updateTaskRoutingArea: vi.fn(),
    sendTaskManualOffer: vi.fn(), assignTaskNomadeDirectly: vi.fn(),
  },
}))
vi.mock("@/lib/api-client", () => ({
  apiClient: api,
  ApiError: class ApiError extends Error {
    status: number
    constructor(m: string, s: number) {
      super(m)
      this.status = s
    }
  },
}))

function rot(over: Partial<any> = {}) {
  return {
    phase: "oferta_enviada",
    pending_offer: { id: "o1", nomade_id: "n1", rotation_order: 1, expires_at: new Date(Date.now() + 200000).toISOString() },
    counts: { offered: 1, declined: 0, expired: 0, pending: 1 },
    offers: [{ id: "o1", nomade_name: "Ana", rotation_order: 1, status: "pendente", offered_at: new Date().toISOString(), expires_at: new Date().toISOString(), decline_reason: null, close_reason: null }],
    escalated: false,
    ...over,
  }
}

function renderPanel() {
  return render(
    <MemoryRouter>
      <SidebarProvider>
        <TaskRotationPanel taskId="t1" />
      </SidebarProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  api.getTaskRotation.mockResolvedValue(rot())
  api.getCurrentUser.mockResolvedValue({ account_type: "admin", admin_profile: { is_active: true, is_master: false } })
  api.getTaskRoutingSettings.mockResolvedValue({ offer_timeout_minutes: 60, mandatory_decline_alerts: true })
  api.getTaskRoutingAreas.mockResolvedValue([])
  api.getTaskRoutingNomades.mockResolvedValue([])
})

it("9. mostra a fase, contagens e a oferta pendente", async () => {
  renderPanel()
  expect(await screen.findByText(/Oferta enviada — aguardando resposta/i)).toBeInTheDocument()
  expect(screen.getByText(/Avaliados: 1/)).toBeInTheDocument()
  expect(screen.getByText(/Ana/)).toBeInTheDocument()
})

it("9. quando escalado, explica que esconder o alerta não resolve e oferece Reiniciar (com confirmação)", async () => {
  api.getTaskRotation.mockResolvedValue(rot({ phase: "escalada", escalated: true, pending_offer: null, counts: { offered: 2, declined: 2, expired: 0, pending: 0 } }))
  api.restartTaskRotation.mockResolvedValue({ ok: true })
  const user = userEvent.setup()
  renderPanel()
  expect(await screen.findByText(/esconder o alerta não resolve/i)).toBeInTheDocument()
  await user.click(screen.getByRole("button", { name: /reiniciar rodízio/i }))
  await screen.findByText(/Reiniciar o rodízio\?/i)
  await user.click(screen.getByRole("button", { name: /^reiniciar$/i }))
  await waitFor(() => expect(api.restartTaskRotation).toHaveBeenCalledWith("t1"))
})

it("erro de carga → botão tentar de novo", async () => {
  api.getTaskRotation.mockRejectedValue(new Error("x"))
  renderPanel()
  expect(await screen.findByText(/Não foi possível carregar o rodízio/i)).toBeInTheDocument()
})

it("Admin Master vê e abre os controles de encaminhamento", async () => {
  const user = userEvent.setup()
  api.getCurrentUser.mockResolvedValue({ account_type: "admin", admin_profile: { is_active: true, is_master: true } })
  renderPanel()
  const button = await screen.findByRole("button", { name: /Controle do Admin Master/i })
  await user.click(button)
  expect(await screen.findByText(/Encaminhamento de Nômades/i)).toBeInTheDocument()
  expect(screen.getByText(/Escolher Nômade manualmente/i)).toBeInTheDocument()
})

it("Admin Master pesquisa Nômades e identifica quem não está habilitado", async () => {
  const user = userEvent.setup()
  api.getCurrentUser.mockResolvedValue({ account_type: "admin", admin_profile: { is_active: true, is_master: true } })
  api.getTaskRoutingNomades.mockResolvedValue([
    { id: "n1", name: "Nômade habilitado", eligible: true },
    { id: "n2", name: "Nômade exceção", eligible: false },
  ])
  renderPanel()
  await user.click(await screen.findByRole("button", { name: /Controle do Admin Master/i }))
  const search = await screen.findByLabelText(/Escolher Nômade manualmente/i)
  await user.type(search, "exceção")
  expect(await screen.findByRole("button", { name: /Nômade exceção.*Não habilitado/i })).toBeInTheDocument()
  expect(screen.queryByText("Nômade habilitado")).not.toBeInTheDocument()
})
