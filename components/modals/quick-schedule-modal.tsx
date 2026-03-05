// @ts-nocheck
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CalendarClock, MessageCircle, Mail, Bell, Clock, Check, Send, CalendarDays } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface QuickScheduleModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: {
    id?: string
    name?: string
    email?: string
    phone?: string
  }
}

type Channel = "whatsapp" | "email" | "platform"

const CHANNEL_CONFIG: Record<Channel, { label: string; icon: React.ReactNode; color: string; border: string; bg: string }> = {
  whatsapp: {
    label: "WhatsApp",
    icon: <MessageCircle className="h-4 w-4" />,
    color: "text-green-700",
    border: "border-green-300",
    bg: "bg-green-50",
  },
  email: {
    label: "E-mail",
    icon: <Mail className="h-4 w-4" />,
    color: "text-blue-700",
    border: "border-blue-300",
    bg: "bg-blue-50",
  },
  platform: {
    label: "Plataforma",
    icon: <Bell className="h-4 w-4" />,
    color: "text-amber-700",
    border: "border-amber-300",
    bg: "bg-amber-50",
  },
}

const getMinDateTime = () => {
  const now = new Date()
  now.setMinutes(now.getMinutes() + 5)
  return now.toISOString().slice(0, 16)
}

export function QuickScheduleModal({ open, onOpenChange, user }: QuickScheduleModalProps) {
  const { toast } = useToast()
  const [message, setMessage] = useState("")
  const [channels, setChannels] = useState<Channel[]>(["platform"])
  const [scheduledAt, setScheduledAt] = useState("")
  const [sending, setSending] = useState(false)

  const toggleChannel = (ch: Channel) => {
    setChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch],
    )
  }

  const formatScheduleLabel = () => {
    if (!scheduledAt) return null
    const d = new Date(scheduledAt)
    return d.toLocaleString("pt-BR", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const handleSchedule = async () => {
    setSending(true)
    await new Promise((r) => setTimeout(r, 900))
    setSending(false)

    const channelLabels = channels.map((c) => CHANNEL_CONFIG[c].label).join(", ")
    toast({
      title: "Mensagem agendada com sucesso!",
      description: `Para ${user.name} via ${channelLabels} em ${formatScheduleLabel()}`,
    })
    onOpenChange(false)
  }

  const canSchedule = message.trim() && channels.length > 0 && scheduledAt

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
              <CalendarClock className="h-4 w-4 text-purple-600" />
            </div>
            Agendar Mensagem
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* Destinatário */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {user.name?.slice(0, 2).toUpperCase() || "??"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{user.name || "Usuário"}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>

          {/* Canais de envio */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Canais de Envio</Label>
            <p className="text-xs text-muted-foreground">Selecione um ou mais canais para o envio simultâneo.</p>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(CHANNEL_CONFIG) as [Channel, typeof CHANNEL_CONFIG.whatsapp][]).map(([key, cfg]) => {
                const isSelected = channels.includes(key)
                const isDisabled = key === "whatsapp" && !user.phone

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => !isDisabled && toggleChannel(key)}
                    disabled={isDisabled}
                    className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                      isDisabled
                        ? "opacity-40 cursor-not-allowed border-slate-200"
                        : isSelected
                        ? `${cfg.border} ${cfg.bg} ${cfg.color}`
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {cfg.icon}
                    <span className="text-xs font-medium">{cfg.label}</span>
                    {isSelected && (
                      <span className={`absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center ${cfg.bg} ${cfg.border} border`}>
                        <Check className={`h-2.5 w-2.5 ${cfg.color}`} />
                      </span>
                    )}
                    {isDisabled && (
                      <span className="absolute -bottom-5 left-0 right-0 text-center text-[10px] text-muted-foreground">
                        Sem número
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Mensagem */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Mensagem</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`Olá, ${user.name?.split(" ")[0] || ""}! `}
              rows={4}
              className="resize-none text-sm"
            />
          </div>

          {/* Data e horário */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Data e Horário de Envio</Label>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                type="datetime-local"
                min={getMinDateTime()}
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="flex-1 text-sm"
              />
            </div>
          </div>

          {/* Resumo do agendamento */}
          {canSchedule && (
            <>
              <Separator />
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg space-y-2">
                <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Resumo do Agendamento</p>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-sm">
                    <Clock className="h-3.5 w-3.5 text-purple-600" />
                    <span className="font-medium text-purple-800">{formatScheduleLabel()}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span>Para:</span>
                    <span className="font-medium text-slate-700">{user.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span>Via:</span>
                    <div className="flex gap-1">
                      {channels.map((ch) => (
                        <Badge
                          key={ch}
                          className={`text-[10px] ${CHANNEL_CONFIG[ch].bg} ${CHANNEL_CONFIG[ch].color} border-0`}
                        >
                          {CHANNEL_CONFIG[ch].label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Ações */}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
              Cancelar
            </Button>
            <Button
              className="bg-purple-600 hover:bg-purple-700 text-white"
              onClick={handleSchedule}
              disabled={!canSchedule || sending}
            >
              {sending ? (
                <span className="flex items-center gap-1.5">
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Agendando...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Send className="h-3.5 w-3.5" />
                  Agendar Mensagem
                </span>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
