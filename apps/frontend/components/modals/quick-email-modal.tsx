// @ts-nocheck
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Mail, Send } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface QuickEmailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: {
    id?: string
    name?: string
    email?: string
  }
}

const QUICK_SUBJECTS = [
  "Atualização importante sobre sua conta",
  "Pendência no seu perfil da plataforma",
  "Novo projeto disponível para você",
  "Convite para reunião de alinhamento",
]

export function QuickEmailModal({ open, onOpenChange, user }: QuickEmailModalProps) {
  const { toast } = useToast()
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    setSending(true)
    await new Promise((r) => setTimeout(r, 800))
    setSending(false)
    toast({
      title: "E-mail enviado",
      description: `Mensagem enviada para ${user.name} <${user.email}>`,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <Mail className="h-4 w-4 text-blue-600" />
            </div>
            E-mail Rápido
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
            <Badge variant="outline" className="text-blue-700 border-blue-300 text-xs shrink-0">
              E-mail
            </Badge>
          </div>

          {/* Para */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Para</Label>
            <Input value={user.email || ""} readOnly className="bg-slate-50 text-sm" />
          </div>

          {/* Assuntos rápidos */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Assuntos rápidos</Label>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_SUBJECTS.map((s) => (
                <button
                  key={s}
                  onClick={() => setSubject(s)}
                  className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                    subject === s
                      ? "border-blue-400 bg-blue-50 text-blue-700"
                      : "border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Assunto */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Assunto</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Assunto do e-mail..."
            />
          </div>

          {/* Corpo */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Mensagem</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={`Olá, ${user.name?.split(" ")[0] || ""}!\n\n`}
              rows={5}
              className="resize-none text-sm"
            />
          </div>

          {/* Ações */}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
              Cancelar
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleSend}
              disabled={!subject || !body || sending}
            >
              {sending ? (
                <span className="flex items-center gap-1.5">
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Enviando...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Send className="h-3.5 w-3.5" />
                  Enviar E-mail
                </span>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
