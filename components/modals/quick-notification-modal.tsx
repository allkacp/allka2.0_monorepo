// @ts-nocheck
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Bell, Send, Zap, Info, CheckCircle, AlertTriangle, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface QuickNotificationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: {
    id?: string
    name?: string
    email?: string
  }
}

type NotifType = "info" | "success" | "warning" | "error"

const TYPE_CONFIG: Record<NotifType, { label: string; icon: React.ReactNode; bg: string; border: string; text: string }> = {
  info: {
    label: "Informação",
    icon: <Info className="h-3.5 w-3.5" />,
    bg: "bg-blue-50",
    border: "border-blue-300",
    text: "text-blue-700",
  },
  success: {
    label: "Sucesso",
    icon: <CheckCircle className="h-3.5 w-3.5" />,
    bg: "bg-green-50",
    border: "border-green-300",
    text: "text-green-700",
  },
  warning: {
    label: "Atenção",
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
    bg: "bg-amber-50",
    border: "border-amber-300",
    text: "text-amber-700",
  },
  error: {
    label: "Alerta",
    icon: <X className="h-3.5 w-3.5" />,
    bg: "bg-red-50",
    border: "border-red-300",
    text: "text-red-700",
  },
}

const QUICK_TITLES = [
  "Pendência em aberto",
  "Ação necessária na sua conta",
  "Novo projeto disponível!",
  "Atualização de status do projeto",
]

export function QuickNotificationModal({ open, onOpenChange, user }: QuickNotificationModalProps) {
  const { toast } = useToast()
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [type, setType] = useState<NotifType>("info")
  const [isUrgent, setIsUrgent] = useState(false)
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    setSending(true)
    await new Promise((r) => setTimeout(r, 700))
    setSending(false)
    toast({
      title: "Notificação enviada",
      description: `"${title}" enviado para ${user.name}${isUrgent ? " (URGENTE)" : ""}`,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
              <Bell className="h-4 w-4 text-amber-600" />
            </div>
            Notificação da Plataforma
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Destinatário */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {user.name?.slice(0, 2).toUpperCase() || "??"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{user.name || "Usuário"}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
            <Badge variant="outline" className="text-amber-700 border-amber-300 text-xs shrink-0">
              Plataforma
            </Badge>
          </div>

          {/* Tipo */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Tipo de Notificação</Label>
            <div className="grid grid-cols-4 gap-2">
              {(Object.entries(TYPE_CONFIG) as [NotifType, typeof TYPE_CONFIG.info][]).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setType(key)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-colors text-xs font-medium ${
                    type === key
                      ? `${cfg.border} ${cfg.bg} ${cfg.text}`
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {cfg.icon}
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Títulos rápidos */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Títulos rápidos</Label>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_TITLES.map((t) => (
                <button
                  key={t}
                  onClick={() => setTitle(t)}
                  className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                    title === t
                      ? "border-amber-400 bg-amber-50 text-amber-700"
                      : "border-dashed border-slate-300 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Título */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Título</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título da notificação..."
            />
          </div>

          {/* Mensagem */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Mensagem</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Detalhe da notificação..."
              rows={3}
              className="resize-none text-sm"
            />
          </div>

          {/* Urgente */}
          <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-sm font-semibold text-red-700">Notificação Urgente</p>
                <p className="text-xs text-red-500">Aparece em destaque no topo para o usuário</p>
              </div>
            </div>
            <Switch checked={isUrgent} onCheckedChange={setIsUrgent} />
          </div>

          {/* Prévia */}
          {title && (
            <div className={`p-3 rounded-lg border ${TYPE_CONFIG[type].bg} ${TYPE_CONFIG[type].border}`}>
              <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${TYPE_CONFIG[type].text}`}>
                Prévia da notificação
              </p>
              <p className={`text-sm font-bold ${TYPE_CONFIG[type].text}`}>{title}</p>
              {message && <p className="text-xs text-muted-foreground mt-0.5">{message}</p>}
            </div>
          )}

          {/* Ações */}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
              Cancelar
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={handleSend}
              disabled={!title || !message || sending}
            >
              {sending ? (
                <span className="flex items-center gap-1.5">
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Enviando...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Send className="h-3.5 w-3.5" />
                  Enviar Notificação
                </span>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
