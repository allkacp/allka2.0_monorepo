// @ts-nocheck
/**
 * ChatWidget — widget de chat flutuante estilo WhatsApp Web + Workana.
 * Posição: fixed bottom-right, z-50.
 * Estado gerido pelo ChatContext.
 */
import { useState, useRef, useEffect } from "react"
import {
  MessageSquare,
  X,
  Minus,
  Search,
  Send,
  Plus,
  MoreVertical,
  Check,
  CheckCheck,
  Circle,
  Building2,
  Briefcase,
  Compass,
  Phone,
  Video,
  Pin,
  Archive,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useChat } from "@/contexts/chat-context"
import { ChatNewConversation } from "@/components/chat-new-conversation"
import type { Conversation, ChatMessage, ChatParticipantType } from "@/types/chat"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<ChatParticipantType, { icon: React.ReactNode; color: string; bg: string }> = {
  admin: { icon: <Circle className="h-3 w-3" />, color: "text-slate-500", bg: "bg-slate-100" },
  empresas: { icon: <Building2 className="h-3 w-3" />, color: "text-purple-600", bg: "bg-purple-100" },
  agencias: { icon: <Briefcase className="h-3 w-3" />, color: "text-orange-500", bg: "bg-orange-100" },
  nomades: { icon: <Compass className="h-3 w-3" />, color: "text-blue-600", bg: "bg-blue-100" },
}

const STATUS_DOT: Record<string, string> = {
  online: "bg-green-500",
  busy: "bg-red-500",
  away: "bg-amber-500",
  offline: "bg-slate-400",
}

const STATUS_LABEL: Record<string, string> = {
  online: "Online",
  busy: "Ocupado",
  away: "Ausente",
  offline: "Offline",
}

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm", lg: "w-12 h-12 text-base" }
  return (
    <div
      className={`${sizes[size]} rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold shrink-0`}
    >
      {name.slice(0, 2).toUpperCase()}
    </div>
  )
}

function MessageStatusIcon({ status }: { status: ChatMessage["status"] }) {
  if (status === "sending") return <Circle className="h-3 w-3 text-slate-400 animate-pulse" />
  if (status === "sent") return <Check className="h-3 w-3 text-slate-400" />
  if (status === "delivered") return <CheckCheck className="h-3 w-3 text-slate-400" />
  if (status === "read") return <CheckCheck className="h-3 w-3 text-blue-400" />
  return null
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  if (diffDays === 1) return "Ontem"
  if (diffDays < 7) return d.toLocaleDateString("pt-BR", { weekday: "short" })
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
}

function formatMessageDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return "Hoje"
  if (diffDays === 1) return "Ontem"
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
}

// ─── Conversation List ────────────────────────────────────────────────────────

function ConversationList({
  onSelect,
}: {
  onSelect: (id: string) => void
}) {
  const { conversations, activeConversationId, startNewConversation } = useChat()
  const [search, setSearch] = useState("")

  const filtered = conversations.filter((c) =>
    c.contact.name.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-center justify-between mb-2">
          <p className="font-semibold text-sm text-slate-800">Conversas</p>
          <button
            onClick={startNewConversation}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-700"
            title="Nova conversa"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="pl-8 h-8 text-xs bg-slate-100 border-0 focus-visible:ring-1"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <p className="text-xs">Nenhuma conversa</p>
          </div>
        ) : (
          filtered.map((conv) => {
            const isActive = conv.id === activeConversationId
            const type = TYPE_CONFIG[conv.contact.account_type]
            return (
              <button
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 transition-colors hover:bg-slate-50 text-left ${
                  isActive ? "bg-blue-50 border-r-2 border-blue-500" : ""
                }`}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <Avatar name={conv.contact.name} size="md" />
                  <span
                    className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${STATUS_DOT[conv.contact.online_status]}`}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className={`text-sm font-medium truncate ${isActive ? "text-blue-700" : "text-slate-800"}`}>
                      {conv.contact.name}
                    </p>
                    {conv.last_message && (
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {formatTime(conv.last_message.created_at)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-1 mt-0.5">
                    <p className="text-xs text-muted-foreground truncate flex-1">
                      {conv.last_message?.is_mine && (
                        <span className="text-slate-400 mr-0.5">
                          <MessageStatusIcon status={conv.last_message.status} />
                        </span>
                      )}
                      {conv.last_message?.content || "—"}
                    </p>
                    {conv.unread_count > 0 && (
                      <span className="shrink-0 min-w-[18px] h-[18px] rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center px-1">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                  <div className={`flex items-center gap-0.5 mt-0.5 text-[10px] ${type.color}`}>
                    {type.icon}
                    <span className="capitalize">{conv.contact.account_type}</span>
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

// ─── Message Window ───────────────────────────────────────────────────────────

function MessageWindow({ conversationId }: { conversationId: string }) {
  const { conversations, sendMessage } = useChat()
  const [input, setInput] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const conv = conversations.find((c) => c.id === conversationId)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [conv?.messages.length])

  if (!conv) return null

  const contact = conv.contact
  const type = TYPE_CONFIG[contact.account_type]

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed) return
    sendMessage(conversationId, trimmed)
    setInput("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Group messages by date
  const groupedMessages: { date: string; messages: typeof conv.messages }[] = []
  conv.messages.forEach((msg) => {
    const dateLabel = formatMessageDate(msg.created_at)
    const lastGroup = groupedMessages[groupedMessages.length - 1]
    if (!lastGroup || lastGroup.date !== dateLabel) {
      groupedMessages.push({ date: dateLabel, messages: [msg] })
    } else {
      lastGroup.messages.push(msg)
    }
  })

  return (
    <div className="flex flex-col h-full">
      {/* Conversation header */}
      <div className="flex items-center gap-2.5 px-3 py-2.5 border-b bg-white shrink-0">
        <div className="relative shrink-0">
          <Avatar name={contact.name} size="sm" />
          <span
            className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border-2 border-white ${STATUS_DOT[contact.online_status]}`}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate text-slate-800">{contact.name}</p>
          <div className={`flex items-center gap-1 text-[10px] ${type.color}`}>
            {type.icon}
            <span>{STATUS_LABEL[contact.online_status]}</span>
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <MoreVertical className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-3 py-3 space-y-1"
        style={{ background: "linear-gradient(135deg, #f0f4ff 0%, #f8faff 100%)" }}
      >
        {conv.messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-3">
              <MessageSquare className="h-6 w-6 text-blue-500" />
            </div>
            <p className="text-xs font-medium text-slate-600">Inicie a conversa</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Envie uma mensagem para {contact.name.split(" ")[0]}
            </p>
          </div>
        ) : (
          groupedMessages.map(({ date, messages }) => (
            <div key={date}>
              {/* Date divider */}
              <div className="flex items-center gap-2 my-3">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-[10px] text-muted-foreground bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
                  {date}
                </span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              {/* Messages of this date */}
              <div className="space-y-1">
                {messages.map((msg, i) => {
                  const prevMsg = messages[i - 1]
                  const showAvatar = !msg.is_mine && (!prevMsg || prevMsg.is_mine)

                  return (
                    <div
                      key={msg.id}
                      className={`flex items-end gap-1.5 ${msg.is_mine ? "justify-end" : "justify-start"}`}
                    >
                      {/* Avatar for received messages */}
                      {!msg.is_mine && (
                        <div className="w-6 shrink-0">
                          {showAvatar && <Avatar name={contact.name} size="sm" />}
                        </div>
                      )}

                      {/* Bubble */}
                      <div
                        className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm shadow-sm ${
                          msg.is_mine
                            ? "bg-blue-600 text-white rounded-br-sm"
                            : "bg-white text-slate-800 rounded-bl-sm border border-slate-100"
                        }`}
                      >
                        <p className="text-xs leading-relaxed break-words">{msg.content}</p>
                        <div
                          className={`flex items-center gap-1 mt-1 justify-end ${
                            msg.is_mine ? "text-blue-200" : "text-muted-foreground"
                          }`}
                        >
                          <span className="text-[10px]">
                            {formatTime(msg.created_at)}
                          </span>
                          {msg.is_mine && <MessageStatusIcon status={msg.status} />}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex items-end gap-2 px-3 py-2.5 border-t bg-white shrink-0">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Digite uma mensagem..."
          className="flex-1 text-xs resize-none min-h-[36px] max-h-[80px]"
        />
        <Button
          size="sm"
          className="shrink-0 h-9 w-9 p-0 bg-blue-600 hover:bg-blue-700 rounded-full"
          onClick={handleSend}
          disabled={!input.trim()}
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

// ─── Main Widget ──────────────────────────────────────────────────────────────

const FAB_SIZE = 44   // px — tamanho do botão
const PANEL_W_SINGLE = 300
const PANEL_W_SPLIT  = 540
const PANEL_H        = 520
const EDGE_MARGIN    = 16 // distância mínima das bordas da tela

export function ChatWidget() {
  const {
    isOpen,
    isMinimized,
    totalUnread,
    openChat,
    closeChat,
    minimizeChat,
    activeConversationId,
    setActiveConversation,
    showNewConversation,
    cancelNewConversation,
    conversations,
  } = useChat()

  // ── Posição do FAB (canto superior-esquerdo do botão) ──────────────────────
  const [pos, setPos] = useState<{ x: number; y: number }>(() => ({
    x: window.innerWidth  - FAB_SIZE - 24,
    y: window.innerHeight - FAB_SIZE - 24,
  }))

  // ── Drag ──────────────────────────────────────────────────────────────────
  const dragRef    = useRef<{ startMouseX: number; startMouseY: number; startPosX: number; startPosY: number } | null>(null)
  const dragging   = useRef(false)
  const hasMoved   = useRef(false)

  const onMouseDown = (e: React.MouseEvent) => {
    // só botão esquerdo
    if (e.button !== 0) return
    e.preventDefault()
    dragRef.current = { startMouseX: e.clientX, startMouseY: e.clientY, startPosX: pos.x, startPosY: pos.y }
    dragging.current = true
    hasMoved.current = false

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current || !dragRef.current) return
      const dx = ev.clientX - dragRef.current.startMouseX
      const dy = ev.clientY - dragRef.current.startMouseY
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) hasMoved.current = true

      const newX = Math.max(EDGE_MARGIN, Math.min(window.innerWidth  - FAB_SIZE - EDGE_MARGIN, dragRef.current.startPosX + dx))
      const newY = Math.max(EDGE_MARGIN, Math.min(window.innerHeight - FAB_SIZE - EDGE_MARGIN, dragRef.current.startPosY + dy))
      setPos({ x: newX, y: newY })
    }

    const onUp = () => {
      dragging.current = false
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup",   onUp)
    }

    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup",   onUp)
  }

  const handleFabClick = () => {
    // ignora click se foi drag
    if (hasMoved.current) { hasMoved.current = false; return }
    if (isOpen) minimizeChat()
    else        openChat()
  }

  // ── Layout do painel (abre para cima ou para baixo / esquerda ou direita) ──
  const showSplit  = isOpen && activeConversationId && !showNewConversation
  const panelW     = showSplit ? PANEL_W_SPLIT : PANEL_W_SINGLE

  const openBelow  = pos.y < window.innerHeight / 2
  const openRight  = pos.x > window.innerWidth  / 2

  const panelStyle: React.CSSProperties = {
    position : "fixed",
    zIndex   : 49,
    width    : panelW,
    height   : PANEL_H,
    // horizontal: alinha a direita do painel com a direita do FAB (ou esquerda)
    ...(openRight
      ? { right: window.innerWidth  - pos.x - FAB_SIZE }
      : { left: pos.x }),
    // vertical
    ...(openBelow
      ? { top: pos.y + FAB_SIZE + 8 }
      : { bottom: window.innerHeight - pos.y + 8 }),
  }

  const handleSelectConversation = (id: string) => {
    setActiveConversation(id)
    cancelNewConversation()
  }

  return (
    <>
      {/* Expanded panel — fora do wrapper do FAB para não ser arrastado junto */}
      {isOpen && (
        <div
          className="bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
          style={panelStyle}
        >
          {/* Top bar */}
          <div className="flex items-center justify-between px-3 py-2.5 shrink-0"
               style={{ background: "linear-gradient(90deg, #0f172a 0%, #1a3a8f 100%)" }}>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-300" />
              <span className="text-sm font-semibold text-white">Mensagens</span>
              {totalUnread > 0 && (
                <span className="min-w-4.5 h-4.5 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
                  {totalUnread}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={minimizeChat}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={closeChat}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex flex-1 overflow-hidden">
            <div
              className={`border-r border-slate-100 flex flex-col overflow-hidden transition-all duration-200 ${
                showSplit ? "w-[200px]" : "w-full"
              }`}
            >
              {showNewConversation ? (
                <ChatNewConversation onBack={cancelNewConversation} />
              ) : (
                <ConversationList onSelect={handleSelectConversation} />
              )}
            </div>

            {showSplit && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <MessageWindow conversationId={activeConversationId} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* FAB — arrastável */}
      <button
        onMouseDown={onMouseDown}
        onClick={handleFabClick}
        title={isOpen ? "Minimizar chat" : "Abrir chat"}
        className="fixed z-50 rounded-full shadow-lg flex items-center justify-center select-none"
        style={{
          left      : pos.x,
          top       : pos.y,
          width     : FAB_SIZE,
          height    : FAB_SIZE,
          cursor    : dragging.current ? "grabbing" : "grab",
          background: "linear-gradient(135deg, #0f172a 0%, #1a2a6f 55%, #c81a7f 100%)",
          touchAction: "none",
        }}
      >
        {isOpen
          ? <Minus className="h-4 w-4 text-white pointer-events-none" />
          : <MessageSquare className="h-4 w-4 text-white pointer-events-none" />
        }

        {/* Unread badge */}
        {!isOpen && totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1 border-2 border-white pointer-events-none">
            {totalUnread > 99 ? "99+" : totalUnread}
          </span>
        )}
      </button>
    </>
  )
}
