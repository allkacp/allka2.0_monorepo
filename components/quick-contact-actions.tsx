// @ts-nocheck
/**
 * QuickContactActions — grupo de 4 botões de ação rápida de comunicação.
 * Renderiza no header do UserViewSlidePanel.
 */
import { useState } from "react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { MessageCircle, Mail, Bell, CalendarClock, MessageSquare } from "lucide-react"
import { QuickWhatsAppModal } from "@/components/modals/quick-whatsapp-modal"
import { QuickEmailModal } from "@/components/modals/quick-email-modal"
import { QuickNotificationModal } from "@/components/modals/quick-notification-modal"
import { QuickScheduleModal } from "@/components/modals/quick-schedule-modal"
import { useChat } from "@/contexts/chat-context"

interface QuickContactActionsProps {
  user: {
    id?: string | number
    name?: string
    email?: string
    phone?: string
    account_type?: string
    online_status?: string
  }
  /** Variant determines button styling context (dark header bg vs light) */
  variant?: "dark" | "light"
}

type ActiveModal = "whatsapp" | "email" | "notification" | "schedule" | null

export function QuickContactActions({ user, variant = "dark" }: QuickContactActionsProps) {
  const [activeModal, setActiveModal] = useState<ActiveModal>(null)
  const { openConversationWithUser } = useChat()

  const btnClass =
    variant === "dark"
      ? "text-blue-300 hover:text-blue-200 hover:bg-blue-800/50 p-2 rounded-lg transition-colors"
      : "text-slate-500 hover:text-slate-700 hover:bg-slate-100 p-2 rounded-lg transition-colors"

  const userForModal = {
    id: String(user.id || ""),
    name: user.name || "Usuário",
    email: user.email || "",
    phone: user.phone || "",
  }

  const handleOpenChat = () => {
    openConversationWithUser(String(user.id || ""), {
      id: String(user.id || ""),
      name: user.name || "Usuário",
      email: user.email || "",
      phone: user.phone,
      account_type: (user.account_type || "empresas") as any,
      online_status: (user.online_status || "offline") as any,
    })
  }

  return (
    <>
      <TooltipProvider>
        <div className="flex items-center gap-0.5">
          {/* Separador visual */}
          <div className={`w-px h-6 mx-1 ${variant === "dark" ? "bg-blue-700/50" : "bg-slate-200"}`} />

          {/* Chat interno */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button className={btnClass} onClick={handleOpenChat}>
                <MessageSquare className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-slate-900 text-white text-xs border-slate-700">
              Chat interno da plataforma
            </TooltipContent>
          </Tooltip>

          {/* WhatsApp */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button className={btnClass} onClick={() => setActiveModal("whatsapp")}>
                <MessageCircle className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-slate-900 text-white text-xs border-slate-700">
              WhatsApp rápido
            </TooltipContent>
          </Tooltip>

          {/* E-mail */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button className={btnClass} onClick={() => setActiveModal("email")}>
                <Mail className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-slate-900 text-white text-xs border-slate-700">
              E-mail rápido
            </TooltipContent>
          </Tooltip>

          {/* Notificação */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button className={btnClass} onClick={() => setActiveModal("notification")}>
                <Bell className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-slate-900 text-white text-xs border-slate-700">
              Notificação na plataforma
            </TooltipContent>
          </Tooltip>

          {/* Agendar */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button className={btnClass} onClick={() => setActiveModal("schedule")}>
                <CalendarClock className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-slate-900 text-white text-xs border-slate-700">
              Agendar mensagem
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>

      {/* Modais */}
      <QuickWhatsAppModal
        open={activeModal === "whatsapp"}
        onOpenChange={(o) => !o && setActiveModal(null)}
        user={userForModal}
      />
      <QuickEmailModal
        open={activeModal === "email"}
        onOpenChange={(o) => !o && setActiveModal(null)}
        user={userForModal}
      />
      <QuickNotificationModal
        open={activeModal === "notification"}
        onOpenChange={(o) => !o && setActiveModal(null)}
        user={userForModal}
      />
      <QuickScheduleModal
        open={activeModal === "schedule"}
        onOpenChange={(o) => !o && setActiveModal(null)}
        user={userForModal}
      />
    </>
  )
}
