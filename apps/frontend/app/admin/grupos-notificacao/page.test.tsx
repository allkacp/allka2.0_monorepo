import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { SidebarProvider } from "@/contexts/sidebar-context"
import AdminGruposNotificacaoPage from "@/app/admin/grupos-notificacao/page"

// Central do Admin Master para Grupos de Notificação (ata 2026-08, bloco
// 3/5) — a "tela real da solicitação" que o alerta amarelo abre.

const { api } = vi.hoisted(() => ({
  api: {
    getNotificationGroupsList: vi.fn(),
    getNotificationGroup: vi.fn(),
    approveNotificationGroup: vi.fn(),
    rejectNotificationGroup: vi.fn(),
    archiveNotificationGroup: vi.fn(),
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
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }))
vi.mock("@/features/dashboards/shared/dashboard-shell-frame", () => ({
  DashboardShellFrame: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

function renderPage(entry = "/admin/grupos-notificacao") {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <SidebarProvider>
        <AdminGruposNotificacaoPage />
      </SidebarProvider>
    </MemoryRouter>,
  )
}

const pendingGroup = {
  id: "g1",
  name: "Grupo do Líder",
  description: null,
  purpose: "acompanhar entregas",
  status: "pending",
  owner_user_id: "leader",
  requested_by_id: "leader",
  approved_by_id: null,
  approved_at: null,
  rejected_by_id: null,
  rejected_at: null,
  rejection_reason: null,
  archived_at: null,
  conversation_id: null,
  member_count: 2,
  created_at: new Date().toISOString(),
  members: [
    { id: "u1", name: "Ana", email: "a@x.test", account_type: "empresas", is_active: true },
    { id: "u2", name: "Bia", email: "b@x.test", account_type: "nomades", is_active: true },
  ],
}

beforeEach(() => {
  vi.clearAllMocks()
  api.getNotificationGroupsList.mockResolvedValue({ role: "master", data: [pendingGroup] })
  api.getNotificationGroup.mockResolvedValue(pendingGroup)
  api.approveNotificationGroup.mockResolvedValue({ ...pendingGroup, status: "active", conversation_id: "c1" })
  api.rejectNotificationGroup.mockResolvedValue({ ...pendingGroup, status: "rejected" })
})

it("Master vê a lista de pendentes e abre a análise", async () => {
  const user = userEvent.setup()
  renderPage()
  await user.click(await screen.findByText("Grupo do Líder"))
  await screen.findByRole("heading", { name: "Grupo do Líder" })
  expect(screen.getByText("Finalidade")).toBeInTheDocument()
  expect(screen.getByText("Ana")).toBeInTheDocument()
  expect(screen.getByText("Bia")).toBeInTheDocument()
})

it("12. Aprovar chama a API de aprovação", async () => {
  const user = userEvent.setup()
  renderPage("/admin/grupos-notificacao?review=g1")
  await user.click(await screen.findByRole("button", { name: /aprovar/i }))
  await waitFor(() => expect(api.approveNotificationGroup).toHaveBeenCalledWith("g1"))
})

it("8. Rejeitar exige justificativa (botão desabilitado até preencher)", async () => {
  const user = userEvent.setup()
  renderPage("/admin/grupos-notificacao?review=g1")
  await user.click(await screen.findByRole("button", { name: /rejeitar/i }))
  const dialog = await screen.findByRole("dialog")
  const confirm = within(dialog).getByRole("button", { name: /^rejeitar$/i })
  expect(confirm).toBeDisabled()
  await user.type(within(dialog).getByLabelText(/justificativa/i), "escopo muito amplo")
  expect(confirm).toBeEnabled()
  await user.click(confirm)
  await waitFor(() => expect(api.rejectNotificationGroup).toHaveBeenCalledWith("g1", "escopo muito amplo"))
})

it("não-master vê aviso de sem permissão", async () => {
  api.getNotificationGroupsList.mockResolvedValue({ role: "leader", data: [] })
  renderPage()
  expect(await screen.findByText(/exclusiva do Admin Master/i)).toBeInTheDocument()
})
