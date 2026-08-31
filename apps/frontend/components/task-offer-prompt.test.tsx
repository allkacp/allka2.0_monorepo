import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { setTestViewportWidth } from "@/vitest.setup"
import { TaskOfferPrompt } from "@/components/task-offer-prompt"

// Oferta de tarefa para o Nômade (ata 2026-08, bloco 4/5).

const { api, navigate } = vi.hoisted(() => ({
  api: {
    getMyTaskOffers: vi.fn(),
    acceptTaskOffer: vi.fn(),
    declineTaskOffer: vi.fn(),
  },
  navigate: vi.fn(),
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
vi.mock("react-router-dom", async (orig) => ({ ...(await orig<any>()), useNavigate: () => navigate }))

function offerFixture(over: Partial<any> = {}) {
  return {
    offer_id: "of1",
    rotation_order: 1,
    offered_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
    seconds_left: 300,
    already_taken: false,
    task: {
      id: "t1",
      title: "Criar campanha de performance",
      description: "Montar 3 conjuntos de anúncios",
      due_date: new Date(Date.now() + 3 * 86400000).toISOString(),
      project: { id: "p1", name: "Projeto X" },
      product: "Anúncios Patrocinados",
      category: "Performance",
    },
    ...over,
  }
}

function renderPrompt() {
  return render(
    <MemoryRouter>
      <TaskOfferPrompt />
    </MemoryRouter>,
  )
}

vi.mock("@/contexts/account-type-context", () => ({ useAccountType: () => ({ accountType: "nomades" }) }))

beforeEach(() => {
  vi.clearAllMocks()
  setTestViewportWidth(1280)
  api.getMyTaskOffers.mockResolvedValue({ data: [offerFixture()], offer_ttl_ms: 300000 })
})

it("10. mostra a oferta com tarefa, projeto/produto, prazo, contagem e botões", async () => {
  renderPrompt()
  expect(await screen.findByText("Criar campanha de performance")).toBeInTheDocument()
  expect(screen.getByText(/Projeto X/)).toBeInTheDocument()
  expect(screen.getByText(/Anúncios Patrocinados/)).toBeInTheDocument()
  expect(screen.getByText(/5:0\d/)).toBeInTheDocument()
  expect(screen.getByRole("button", { name: /aceitar tarefa/i })).toBeInTheDocument()
  expect(screen.getByRole("button", { name: /recusar/i })).toBeInTheDocument()
})

it("5. aceitar chama a API e leva para Minhas Tarefas", async () => {
  const user = userEvent.setup()
  api.acceptTaskOffer.mockResolvedValue({ ok: true, task_id: "t1" })
  renderPrompt()
  await user.click(await screen.findByRole("button", { name: /aceitar tarefa/i }))
  await waitFor(() => expect(api.acceptTaskOffer).toHaveBeenCalledWith("of1"))
  await waitFor(() => expect(navigate).toHaveBeenCalledWith("/nomades/minhastarefas"))
})

it("6. recusar chama a API e some a oferta (será oferecida a outro)", async () => {
  const user = userEvent.setup()
  api.declineTaskOffer.mockResolvedValue({ ok: true })
  api.getMyTaskOffers.mockResolvedValueOnce({ data: [offerFixture()], offer_ttl_ms: 300000 }).mockResolvedValue({ data: [], offer_ttl_ms: 300000 })
  renderPrompt()
  await user.click(await screen.findByRole("button", { name: /recusar/i }))
  await waitFor(() => expect(api.declineTaskOffer).toHaveBeenCalledWith("of1"))
  await waitFor(() => expect(screen.queryByText("Criar campanha de performance")).not.toBeInTheDocument())
})

it("8. mensagem clara quando a tarefa já foi assumida por outra pessoa", async () => {
  const user = userEvent.setup()
  const { ApiError } = await import("@/lib/api-client")
  api.acceptTaskOffer.mockRejectedValue(new ApiError("x", 409, { code: "task_already_assigned" }))
  renderPrompt()
  await user.click(await screen.findByRole("button", { name: /aceitar tarefa/i }))
  expect(await screen.findByText(/já foi assumida por outra pessoa/i)).toBeInTheDocument()
})

it("processamento isolado nos botões — clicar de novo enquanto processa não dispara segunda chamada", async () => {
  const user = userEvent.setup()
  let resolve: (v: any) => void = () => {}
  api.acceptTaskOffer.mockImplementation(() => new Promise((r) => { resolve = r }))
  renderPrompt()
  const btn = await screen.findByRole("button", { name: /aceitar tarefa/i })
  await user.click(btn)
  await user.click(btn)
  resolve({ ok: true, task_id: "t1" })
  await waitFor(() => expect(api.acceptTaskOffer).toHaveBeenCalledTimes(1))
})

it("28. mobile (375px) — a oferta e os botões continuam acessíveis", async () => {
  setTestViewportWidth(375)
  renderPrompt()
  expect(await screen.findByRole("button", { name: /aceitar tarefa/i })).toBeInTheDocument()
})

it("não renderiza para quem não é Nômade", async () => {
  vi.resetModules()
  vi.doMock("@/contexts/account-type-context", () => ({ useAccountType: () => ({ accountType: "admin" }) }))
  const { TaskOfferPrompt: AdminPrompt } = await import("@/components/task-offer-prompt")
  render(<MemoryRouter><AdminPrompt /></MemoryRouter>)
  expect(api.getMyTaskOffers).not.toHaveBeenCalled()
  vi.doUnmock("@/contexts/account-type-context")
})
