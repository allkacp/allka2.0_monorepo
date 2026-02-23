// @ts-nocheck
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { X, Upload, ImageIcon, Video } from "lucide-react"
import type { NotificationMessage } from "@/types/terms"

interface NotificationMessageModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  message?: NotificationMessage
  onSave: (message: Partial<NotificationMessage>) => void
}

export function NotificationMessageModal({ open, onOpenChange, message, onSave }: NotificationMessageModalProps) {
  const [formData, setFormData] = useState({
    title: message?.title || "",
    content: message?.content || "",
    type: message?.type || ("info" as const),
    channels: message?.channels || ([] as string[]),
    media_urls: message?.media_urls || ([] as string[]),
    variables: message?.variables || ([] as string[]),
  })

  const [newVariable, setNewVariable] = useState("")

  const handleSave = () => {
    onSave(formData)
    onOpenChange(false)
  }

  const addVariable = () => {
    if (newVariable && !formData.variables.includes(newVariable)) {
      setFormData((prev) => ({
        ...prev,
        variables: [...prev.variables, newVariable],
      }))
      setNewVariable("")
    }
  }

  const removeVariable = (variable: string) => {
    setFormData((prev) => ({
      ...prev,
      variables: prev.variables.filter((v) => v !== variable),
    }))
  }

  const toggleChannel = (channel: string) => {
    setFormData((prev) => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter((c) => c !== channel)
        : [...prev.channels, channel],
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{message ? "Editar Mensagem" : "Nova Mensagem"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Título da mensagem"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Conteúdo</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
              placeholder="Conteúdo da mensagem..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select
              value={formData.type}
              onValueChange={(value: any) => setFormData((prev) => ({ ...prev, type: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="info">Informativo</SelectItem>
                <SelectItem value="warning">Aviso</SelectItem>
                <SelectItem value="success">Sucesso</SelectItem>
                <SelectItem value="error">Erro</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Canais de Envio</Label>
            <div className="flex flex-wrap gap-2">
              {["email", "whatsapp", "in_app", "push"].map((channel) => (
                <Button
                  key={channel}
                  type="button"
                  variant={formData.channels.includes(channel) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleChannel(channel)}
                >
                  {channel === "email" && "E-mail"}
                  {channel === "whatsapp" && "WhatsApp"}
                  {channel === "in_app" && "In-App"}
                  {channel === "push" && "Push"}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Variáveis Dinâmicas</Label>
            <div className="flex gap-2">
              <Input
                value={newVariable}
                onChange={(e) => setNewVariable(e.target.value)}
                placeholder="Ex: {{nome_usuario}}"
                onKeyPress={(e) => e.key === "Enter" && addVariable()}
              />
              <Button type="button" onClick={addVariable}>
                Adicionar
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.variables.map((variable) => (
                <Badge key={variable} variant="secondary" className="flex items-center gap-1">
                  {variable}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => removeVariable(variable)} />
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Mídia</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              <div className="text-center">
                <Upload className="mx-auto h-8 w-8 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">Arraste arquivos aqui ou clique para selecionar</p>
                <p className="text-xs text-gray-500">Suporte para imagens e vídeos</p>
              </div>
            </div>
            {formData.media_urls.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {formData.media_urls.map((url, index) => (
                  <div key={index} className="relative">
                    <div className="aspect-video bg-gray-100 rounded flex items-center justify-center">
                      {url.includes("video") ? (
                        <Video className="h-8 w-8 text-gray-400" />
                      ) : (
                        <ImageIcon className="h-8 w-8 text-gray-400" />
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="absolute top-1 right-1 h-6 w-6 p-0"
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          media_urls: prev.media_urls.filter((_, i) => i !== index),
                        }))
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Salvar</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
