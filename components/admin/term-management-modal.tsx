// @ts-nocheck
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { X, Plus } from "lucide-react"
import type { Term } from "@/types/terms"

interface TermManagementModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  term?: Term
  onSave: (term: Partial<Term>) => void
}

export function TermManagementModal({ open, onOpenChange, term, onSave }: TermManagementModalProps) {
  const [formData, setFormData] = useState({
    title: term?.title || "",
    content: term?.content || "",
    version: term?.version || "1.0",
    type: term?.type || ("terms_of_service" as const),
    is_mandatory: term?.is_mandatory ?? true,
    is_active: term?.is_active ?? true,
    conditions: term?.conditions || ({} as Record<string, any>),
  })

  const [newCondition, setNewCondition] = useState({ field: "", operator: "", value: "" })

  const handleSave = () => {
    onSave(formData)
    onOpenChange(false)
  }

  const addCondition = () => {
    if (newCondition.field && newCondition.operator && newCondition.value) {
      setFormData((prev) => ({
        ...prev,
        conditions: {
          ...prev.conditions,
          [newCondition.field]: {
            operator: newCondition.operator,
            value: newCondition.value,
          },
        },
      }))
      setNewCondition({ field: "", operator: "", value: "" })
    }
  }

  const removeCondition = (field: string) => {
    setFormData((prev) => {
      const newConditions = { ...prev.conditions }
      delete newConditions[field]
      return { ...prev, conditions: newConditions }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{term ? "Editar Termo" : "Novo Termo"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Título do termo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="version">Versão</Label>
              <Input
                id="version"
                value={formData.version}
                onChange={(e) => setFormData((prev) => ({ ...prev, version: e.target.value }))}
                placeholder="1.0"
              />
            </div>
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
                <SelectItem value="terms_of_service">Termos de Serviço</SelectItem>
                <SelectItem value="privacy_policy">Política de Privacidade</SelectItem>
                <SelectItem value="data_processing">Processamento de Dados</SelectItem>
                <SelectItem value="cookie_policy">Política de Cookies</SelectItem>
                <SelectItem value="user_agreement">Acordo de Usuário</SelectItem>
                <SelectItem value="partner_agreement">Acordo de Parceiro</SelectItem>
                <SelectItem value="nomade_agreement">Acordo de Nômade</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Conteúdo</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
              placeholder="Conteúdo do termo..."
              rows={10}
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label>Condições de Exibição</Label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Select
                  value={newCondition.field}
                  onValueChange={(value) => setNewCondition((prev) => ({ ...prev, field: value }))}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Campo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="account_type">Tipo de Conta</SelectItem>
                    <SelectItem value="account_level">Nível da Conta</SelectItem>
                    <SelectItem value="feature_access">Acesso a Funcionalidade</SelectItem>
                    <SelectItem value="registration_date">Data de Cadastro</SelectItem>
                    <SelectItem value="location">Localização</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={newCondition.operator}
                  onValueChange={(value) => setNewCondition((prev) => ({ ...prev, operator: value }))}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Operador" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equals">Igual a</SelectItem>
                    <SelectItem value="not_equals">Diferente de</SelectItem>
                    <SelectItem value="contains">Contém</SelectItem>
                    <SelectItem value="greater_than">Maior que</SelectItem>
                    <SelectItem value="less_than">Menor que</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  className="flex-1"
                  value={newCondition.value}
                  onChange={(e) => setNewCondition((prev) => ({ ...prev, value: e.target.value }))}
                  placeholder="Valor"
                />
                <Button type="button" onClick={addCondition}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(formData.conditions).map(([field, condition]) => (
                  <Badge key={field} variant="secondary" className="flex items-center gap-1">
                    {field} {condition.operator} {condition.value}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => removeCondition(field)} />
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="mandatory"
                checked={formData.is_mandatory}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_mandatory: checked }))}
              />
              <Label htmlFor="mandatory">Aceite Obrigatório</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked }))}
              />
              <Label htmlFor="active">Ativo</Label>
            </div>
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
