// @ts-nocheck
/**
 * ChatNewConversation — picker de usuário para iniciar nova conversa no chat.
 */
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, ArrowLeft, Building2, Briefcase, Compass, Circle } from "lucide-react"
import { useChat } from "@/contexts/chat-context"
import type { ChatParticipant, ChatParticipantType } from "@/types/chat"

const TYPE_CONFIG: Record<ChatParticipantType, { label: string; icon: React.ReactNode; color: string }> = {
  admin: { label: "Admin", icon: <Circle className="h-3 w-3" />, color: "text-slate-500" },
  empresas: { label: "Empresa", icon: <Building2 className="h-3 w-3" />, color: "text-purple-600" },
  agencias: { label: "Agência", icon: <Briefcase className="h-3 w-3" />, color: "text-orange-600" },
  nomades: { label: "Nômade", icon: <Compass className="h-3 w-3" />, color: "text-blue-600" },
}

const STATUS_DOT: Record<ChatParticipant["online_status"], string> = {
  online: "bg-green-500",
  busy: "bg-red-500",
  away: "bg-amber-500",
  offline: "bg-slate-400",
}

interface ChatNewConversationProps {
  onBack: () => void
}

export function ChatNewConversation({ onBack }: ChatNewConversationProps) {
  const { allContacts, openConversationWithUser } = useChat()
  const [query, setQuery] = useState("")

  const filtered = allContacts.filter(
    (c) =>
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.email.toLowerCase().includes(query.toLowerCase()),
  )

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-3 border-b bg-white">
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-semibold flex-1">Nova conversa</p>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b bg-slate-50">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar usuário..."
            className="pl-8 h-8 text-sm bg-white"
            autoFocus
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
            <Search className="h-8 w-8 mb-2 opacity-30" />
            <p className="text-sm">Nenhum usuário encontrado</p>
          </div>
        ) : (
          filtered.map((contact) => {
            const type = TYPE_CONFIG[contact.account_type]
            return (
              <button
                key={contact.id}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                onClick={() => openConversationWithUser(contact.id, contact)}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-sm font-bold">
                    {contact.name.slice(0, 2).toUpperCase()}
                  </div>
                  <span
                    className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${STATUS_DOT[contact.online_status]}`}
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{contact.name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className={`flex items-center gap-0.5 text-xs ${type.color}`}>
                      {type.icon}
                      {type.label}
                    </span>
                    <span className="text-muted-foreground text-xs">·</span>
                    <span className="text-xs text-muted-foreground truncate">{contact.email}</span>
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
