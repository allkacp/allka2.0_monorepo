import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChatProvider, useChat } from "@/contexts/chat-context"

// Chat interno restaurado (ata 2026-08, bloco 3/5) — o contexto usa a API
// real. Este teste cobre: carga de salas, abrir sala + marcar lida,
// envio otimista + idempotência (mesmo client_message_id no retry),
// tratamento de falha (marca "failed" e permite retry).

const { api } = vi.hoisted(() => ({
  api: {
    getCurrentUser: vi.fn(),
    getConversations: vi.fn(),
    getMessages: vi.fn(),
    markConversationRead: vi.fn(),
    sendMessage: vi.fn(),
    createConversation: vi.fn(),
    getChatUnreadCount: vi.fn(),
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

function Harness() {
  const chat = useChat()
  return (
    <div>
      <span data-testid="rooms">{chat.rooms.length}</span>
      <span data-testid="unread">{chat.totalUnread}</span>
      <span data-testid="active">{chat.activeRoomId ?? "none"}</span>
      <span data-testid="msgs">{chat.messages.map((m) => `${m.content}:${m.pending ? "P" : m.failed ? "F" : "OK"}`).join("|")}</span>
      <button onClick={() => chat.openRoom("r1")}>open</button>
      <button onClick={() => chat.sendMessage("r1", "olá mundo")}>send</button>
      <button onClick={() => { const f = chat.messages.find((m) => m.failed); if (f?.client_message_id) chat.retrySend("r1", f.client_message_id) }}>retry</button>
    </div>
  )
}

function renderChat() {
  return render(
    <ChatProvider>
      <Harness />
    </ChatProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  api.getCurrentUser.mockResolvedValue({ id: "me" })
  api.getConversations.mockResolvedValue({
    data: [
      { id: "r1", title: "Sala 1", type: "group", status: "active", read_only: false, participants: [{ id: "me", name: "Eu", role: "member" }], last_message: null, unread_count: 3, updated_at: new Date().toISOString() },
    ],
    total: 1,
  })
  api.getMessages.mockResolvedValue({ data: [{ id: "m0", conversation_id: "r1", sender_id: "other", sender: { id: "other", name: "Outro" }, content: "oi", created_at: new Date().toISOString() }], total: 1 })
  api.markConversationRead.mockResolvedValue({ ok: true })
})

it("carrega salas e o total de não lidas", async () => {
  renderChat()
  await waitFor(() => expect(screen.getByTestId("rooms").textContent).toBe("1"))
  expect(screen.getByTestId("unread").textContent).toBe("3")
})

it("abrir sala carrega mensagens e marca como lida (zera não lidas)", async () => {
  const user = userEvent.setup()
  renderChat()
  await waitFor(() => expect(screen.getByTestId("rooms").textContent).toBe("1"))
  await user.click(screen.getByText("open"))
  await waitFor(() => expect(screen.getByTestId("active").textContent).toBe("r1"))
  await waitFor(() => expect(api.getMessages).toHaveBeenCalledWith("r1", expect.anything()))
  await waitFor(() => expect(api.markConversationRead).toHaveBeenCalledWith("r1"))
  await waitFor(() => expect(screen.getByTestId("unread").textContent).toBe("0"))
})

it("21. enviar é otimista e o retry reusa o MESMO client_message_id (idempotente)", async () => {
  const user = userEvent.setup()
  api.sendMessage.mockRejectedValueOnce(new Error("rede")).mockResolvedValueOnce({
    id: "m1",
    conversation_id: "r1",
    sender_id: "me",
    sender: { id: "me", name: "Eu" },
    content: "olá mundo",
    created_at: new Date().toISOString(),
  })
  renderChat()
  await waitFor(() => expect(screen.getByTestId("rooms").textContent).toBe("1"))
  await user.click(screen.getByText("open"))
  await waitFor(() => expect(screen.getByTestId("msgs").textContent).toContain("oi:OK"))

  await user.click(screen.getByText("send"))
  await waitFor(() => expect(screen.getByTestId("msgs").textContent).toContain("olá mundo:F"))

  await user.click(screen.getByText("retry"))
  await waitFor(() => expect(screen.getByTestId("msgs").textContent).toContain("olá mundo:OK"))

  const firstCid = (api.sendMessage.mock.calls[0][1] as any).client_message_id
  const retryCid = (api.sendMessage.mock.calls[1][1] as any).client_message_id
  expect(firstCid).toBeTruthy()
  expect(retryCid).toBe(firstCid)
})
