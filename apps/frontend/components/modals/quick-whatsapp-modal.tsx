// @ts-nocheck
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { MessageCircle, ExternalLink, Send, Phone } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface QuickWhatsAppModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: {
    id?: string
    name?: string
    phone?: string
    email?: string
  }
}

const QUICK_MESSAGES = [
  "Olá! Temos uma atualização importante para você na plataforma.",
  "Preciso de alguns minutos para conversar sobre seu projeto.",
  "Por favor, acesse a plataforma para verificar uma pendência.",
  "Tudo certo com você? Notamos que você ainda não acessou esta semana.",
]

export function QuickWhatsAppModal({ open, onOpenChange, user }: QuickWhatsAppModalProps) {
  const { toast } = useToast()
  const [phone, setPhone] = useState(user.phone || "")
  const [message, setMessage] = useState("")

  const formatPhone = (raw: string) => raw.replace(/\D/g, "")

  const handleOpenWhatsApp = () => {
    const cleaned = formatPhone(phone)
    if (!cleaned) return
    const encoded = encodeURIComponent(message)
    window.open(`https://wa.me/55${cleaned}?text=${encoded}`, "_blank")
  }

  const handleSendViaPlatform = () => {
    toast({
      title: "Mensagem enviada via plataforma",
      description: `WhatsApp agendado para ${user.name} — número ${phone}`,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <MessageCircle className="h-4 w-4 text-green-600" />
            </div>
            WhatsApp Rápido
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
            <Badge variant="outline" className="text-green-700 border-green-300 text-xs shrink-0">
              WhatsApp
            </Badge>
          </div>

          {/* Número */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Número de WhatsApp</Label>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-2 border rounded-md bg-slate-50 text-sm text-muted-foreground shrink-0">
                <Phone className="h-3.5 w-3.5" />
                +55
              </div>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="11 99999-0000"
                className="flex-1"
              />
            </div>
          </div>

          {/* Mensagem rápida */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Sugestões rápidas</Label>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_MESSAGES.map((msg) => (
                <button
                  key={msg}
                  onClick={() => setMessage(msg)}
                  className="text-xs px-2 py-1 rounded-full border border-dashed border-slate-300 hover:border-green-400 hover:bg-green-50 hover:text-green-700 transition-colors text-left"
                >
                  {msg.slice(0, 40)}…
                </button>
              ))}
            </div>
          </div>

          {/* Mensagem */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Mensagem</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Digite sua mensagem..."
              rows={3}
              className="resize-none text-sm"
            />
            <p className="text-xs text-muted-foreground text-right">{message.length} caracteres</p>
          </div>

          {/* Ações */}
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              className="flex-1 border-green-300 text-green-700 hover:bg-green-50"
              onClick={handleOpenWhatsApp}
              disabled={!phone}
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Abrir WhatsApp Web
            </Button>
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              onClick={handleSendViaPlatform}
              disabled={!phone || !message}
            >
              <Send className="h-3.5 w-3.5 mr-1.5" />
              Enviar pela Plataforma
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
