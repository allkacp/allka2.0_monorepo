// @ts-nocheck
import React, { createContext, useContext, useState, useCallback } from "react"
import type { Conversation, ChatMessage, ChatParticipant } from "@/types/chat"

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_CONTACTS: ChatParticipant[] = [
  {
    id: "user-1",
    name: "Rafael Mendonça",
    email: "rafael@techinova.com.br",
    account_type: "empresas",
    online_status: "online",
    phone: "11999990001",
    last_seen: new Date().toISOString(),
  },
  {
    id: "user-2",
    name: "Carla Dupont",
    email: "carla@dupont.agency",
    account_type: "agencias",
    online_status: "away",
    phone: "21988887777",
    last_seen: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: "user-3",
    name: "Lucas Vieira",
    email: "lucas.vieira@nomade.dev",
    account_type: "nomades",
    online_status: "offline",
    phone: "31977776666",
    last_seen: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: "user-4",
    name: "Fernanda Lima",
    email: "fernanda@construmax.com",
    account_type: "empresas",
    online_status: "busy",
    phone: "11944443333",
    last_seen: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
]

const buildConversation = (
  contact: ChatParticipant,
  messages: Omit<ChatMessage, "conversation_id">[],
  unread = 0,
): Conversation => {
  const convId = `conv-${contact.id}`
  const fullMessages: ChatMessage[] = messages.map((m) => ({ ...m, conversation_id: convId }))
  return {
    id: convId,
    participants: [contact],
    contact,
    messages: fullMessages,
    last_message: fullMessages[fullMessages.length - 1],
    unread_count: unread,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    updated_at: fullMessages[fullMessages.length - 1]?.created_at || new Date().toISOString(),
    is_pinned: false,
    is_archived: false,
  }
}

const MOCK_CONVERSATIONS: Conversation[] = [
  buildConversation(
    MOCK_CONTACTS[0],
    [
      {
        id: "m1",
        sender_id: MOCK_CONTACTS[0].id,
        sender_name: MOCK_CONTACTS[0].name,
        content: "Olá! Precisamos conversar sobre o projeto de integração.",
        created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        status: "read",
        type: "text",
        is_mine: false,
      },
      {
        id: "m2",
        sender_id: "admin",
        sender_name: "Você",
        content: "Claro! Qual ponto está com dificuldade?",
        created_at: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
        status: "read",
        type: "text",
        is_mine: true,
      },
      {
        id: "m3",
        sender_id: MOCK_CONTACTS[0].id,
        sender_name: MOCK_CONTACTS[0].name,
        content: "O fluxo de aprovação de pagamentos estava bloqueando. Já resolvemos localmente, mas precisamos alinhar com a equipe.",
        created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        status: "read",
        type: "text",
        is_mine: false,
      },
    ],
    2,
  ),
  buildConversation(
    MOCK_CONTACTS[1],
    [
      {
        id: "m4",
        sender_id: "admin",
        sender_name: "Você",
        content: "Carla, tudo bem? Precisamos revisar o contrato da agência.",
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
        status: "read",
        type: "text",
        is_mine: true,
      },
      {
        id: "m5",
        sender_id: MOCK_CONTACTS[1].id,
        sender_name: MOCK_CONTACTS[1].name,
        content: "Olá! Sim, posso revisar ainda hoje à tarde.",
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 2.5).toISOString(),
        status: "delivered",
        type: "text",
        is_mine: false,
      },
    ],
    0,
  ),
  buildConversation(
    MOCK_CONTACTS[2],
    [
      {
        id: "m6",
        sender_id: MOCK_CONTACTS[2].id,
        sender_name: MOCK_CONTACTS[2].name,
        content: "Disponível para um projeto de 3 semanas a partir de segunda?",
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
        status: "read",
        type: "text",
        is_mine: false,
      },
    ],
    1,
  ),
  buildConversation(
    MOCK_CONTACTS[3],
    [
      {
        id: "m7",
        sender_id: "admin",
        sender_name: "Você",
        content: "Fernanda, a proposta foi aprovada! Pode prosseguir.",
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
        status: "read",
        type: "text",
        is_mine: true,
      },
    ],
    0,
  ),
]

// ─── Context ──────────────────────────────────────────────────────────────────

interface ChatContextValue {
  conversations: Conversation[]
  activeConversationId: string | null
  isOpen: boolean
  isMinimized: boolean
  showNewConversation: boolean
  totalUnread: number
  openChat: () => void
  closeChat: () => void
  minimizeChat: () => void
  setActiveConversation: (id: string | null) => void
  openConversationWithUser: (userId: string, user?: Partial<ChatParticipant>) => void
  sendMessage: (conversationId: string, content: string) => void
  startNewConversation: () => void
  cancelNewConversation: () => void
  allContacts: ChatParticipant[]
}

const ChatContext = createContext<ChatContextValue | null>(null)

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>(MOCK_CONVERSATIONS)
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [showNewConversation, setShowNewConversation] = useState(false)

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0)

  const openChat = useCallback(() => {
    setIsOpen(true)
    setIsMinimized(false)
  }, [])

  const closeChat = useCallback(() => {
    setIsOpen(false)
    setActiveConversationId(null)
  }, [])

  const minimizeChat = useCallback(() => {
    setIsMinimized(true)
    setIsOpen(false)
  }, [])

  const setActiveConversation = useCallback(
    (id: string | null) => {
      setActiveConversationId(id)
      if (id) {
        // Mark messages as read
        setConversations((prev) =>
          prev.map((c) => (c.id === id ? { ...c, unread_count: 0 } : c)),
        )
      }
    },
    [],
  )

  const openConversationWithUser = useCallback(
    (userId: string, user?: Partial<ChatParticipant>) => {
      const convId = `conv-${userId}`
      const existing = conversations.find((c) => c.id === convId)

      if (!existing && user) {
        // Create a new conversation
        const contact: ChatParticipant = {
          id: userId,
          name: user.name || "Usuário",
          email: user.email || "",
          account_type: user.account_type || "empresas",
          online_status: user.online_status || "offline",
          phone: user.phone,
          last_seen: new Date().toISOString(),
        }
        const newConv: Conversation = {
          id: convId,
          participants: [contact],
          contact,
          messages: [],
          unread_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_pinned: false,
          is_archived: false,
        }
        setConversations((prev) => [newConv, ...prev])
      }

      setActiveConversationId(convId)
      setIsOpen(true)
      setIsMinimized(false)
      setShowNewConversation(false)

      // Mark as read
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, unread_count: 0 } : c)),
      )
    },
    [conversations],
  )

  const sendMessage = useCallback((conversationId: string, content: string) => {
    const msg: ChatMessage = {
      id: `msg-${Date.now()}`,
      conversation_id: conversationId,
      sender_id: "admin",
      sender_name: "Você",
      content,
      created_at: new Date().toISOString(),
      status: "sending",
      type: "text",
      is_mine: true,
    }

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== conversationId) return c
        const updatedMessages = [...c.messages, msg]
        return {
          ...c,
          messages: updatedMessages,
          last_message: msg,
          updated_at: msg.created_at,
        }
      }),
    )

    // Simulate "sent" status after 500ms
    setTimeout(() => {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== conversationId) return c
          return {
            ...c,
            messages: c.messages.map((m) =>
              m.id === msg.id ? { ...m, status: "sent" } : m,
            ),
          }
        }),
      )
    }, 500)
  }, [])

  const startNewConversation = useCallback(() => {
    setShowNewConversation(true)
    setActiveConversationId(null)
  }, [])

  const cancelNewConversation = useCallback(() => {
    setShowNewConversation(false)
  }, [])

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConversationId,
        isOpen,
        isMinimized,
        showNewConversation,
        totalUnread,
        openChat,
        closeChat,
        minimizeChat,
        setActiveConversation,
        openConversationWithUser,
        sendMessage,
        startNewConversation,
        cancelNewConversation,
        allContacts: MOCK_CONTACTS,
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error("useChat must be used inside ChatProvider")
  return ctx
}
