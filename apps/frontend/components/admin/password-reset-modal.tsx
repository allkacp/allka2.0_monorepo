
import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Key, Mail, Copy, Send } from "lucide-react"
import type { User } from "@/types/user"

interface PasswordResetModalProps {
  user: User
  open: boolean
  onOpenChange: (open: boolean) => void
  onReset: () => void
}

export function PasswordResetModal({ user, open, onOpenChange, onReset }: PasswordResetModalProps) {
  const [resetMethod, setResetMethod] = useState<"email" | "link">("email")
  const [resetLink, setResetLink] = useState("")
  const [loading, setLoading] = useState(false)

  const handleGenerateLink = async () => {
    setLoading(true)
    // Simulate API call to generate reset link
    setTimeout(() => {
      const link = `https://allka.com/reset-password?token=abc123xyz789&user=${user.id}`
      setResetLink(link)
      setLoading(false)
    }, 1000)
  }

  const handleSendEmail = async () => {
    setLoading(true)
    // Simulate API call to send reset email
    setTimeout(() => {
      setLoading(false)
      onReset()
    }, 1000)
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(resetLink)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Key className="h-5 w-5" />
            <span>Redefinir Senha</span>
          </DialogTitle>
          <DialogDescription>Escolha como o usuário receberá as instruções para redefinir a senha</DialogDescription>
        </DialogHeader>

        {/* User Info */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-blue-600 text-white">
                  {user.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-medium">{user.name}</h3>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reset Method Selection */}
        <div className="space-y-4">
          <Label>Método de Redefinição</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card
              className={`cursor-pointer transition-colors ${resetMethod === "email" ? "ring-2 ring-blue-600" : ""}`}
              onClick={() => setResetMethod("email")}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-2">
                  <Mail className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-base">Enviar por Email</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Envia automaticamente um link de redefinição para o email cadastrado do usuário
                </CardDescription>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-colors ${resetMethod === "link" ? "ring-2 ring-blue-600" : ""}`}
              onClick={() => setResetMethod("link")}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-2">
                  <Copy className="h-5 w-5 text-green-600" />
                  <CardTitle className="text-base">Gerar Link</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Gera um link de redefinição que você pode enviar manualmente para o usuário
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Email Method */}
        {resetMethod === "email" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Envio Automático</CardTitle>
              <CardDescription>O usuário receberá um email com instruções para redefinir a senha</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Email de Destino</Label>
                <Input value={user.email} disabled />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Link Method */}
        {resetMethod === "link" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Link de Redefinição</CardTitle>
              <CardDescription>Gere um link único que pode ser enviado manualmente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!resetLink ? (
                <Button onClick={handleGenerateLink} disabled={loading} className="w-full">
                  {loading ? "Gerando..." : "Gerar Link de Redefinição"}
                </Button>
              ) : (
                <div className="space-y-2">
                  <Label>Link Gerado</Label>
                  <div className="flex space-x-2">
                    <Input value={resetLink} readOnly />
                    <Button variant="outline" size="sm" onClick={copyToClipboard}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Este link expira em 24 horas</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          {resetMethod === "email" ? (
            <Button onClick={handleSendEmail} disabled={loading}>
              <Send className="h-4 w-4 mr-2" />
              {loading ? "Enviando..." : "Enviar Email"}
            </Button>
          ) : (
            <Button onClick={() => onOpenChange(false)} disabled={!resetLink}>
              Concluído
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
