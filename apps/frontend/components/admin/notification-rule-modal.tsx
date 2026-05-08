// @ts-nocheck
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { X, Plus } from "lucide-react"
import type { NotificationRule } from "@/types/terms"

interface NotificationRuleModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rule?: NotificationRule
  onSave: (rule: Partial<NotificationRule>) => void
}

export function NotificationRuleModal({ open, onOpenChange, rule, onSave }: NotificationRuleModalProps) {
  const [formData, setFormData] = useState({
    name: rule?.name || "",
    trigger_event: rule?.trigger_event || "",
    conditions: rule?.conditions || ({} as Record<string, any>),
    target_audience: rule?.target_audience || ({} as Record<string, any>),
    delay_minutes: rule?.delay_minutes || 0,
    is_active: rule?.is_active ?? true,
  })

  const [newCondition, setNewCondition] = useState({ field: "", operator: "", value: "" })
  const [newAudience, setNewAudience] = useState({ type: "", value: "" })

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

  const addAudience = () => {
    if (newAudience.type && newAudience.value) {
      setFormData((prev) => ({
        ...prev,
        target_audience: {
          ...prev.target_audience,
          [newAudience.type]: newAudience.value,
        },
      }))
      setNewAudience({ type: "", value: "" })
    }
  }

  const removeAudience = (type: string) => {
    setFormData((prev) => {
      const newAudience = { ...prev.target_audience }
      delete newAudience[type]
      return { ...prev, target_audience: newAudience }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{rule ? "Editar Regra" : "Nova Regra de Disparo"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Regra</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Nome identificador da regra"
            />
          </div>

          <div className="space-y-2">
            <Label>Evento Gatilho</Label>
            <Select
              value={formData.trigger_event}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, trigger_event: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o evento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user_registration">Cadastro de Usuário</SelectItem>
                <SelectItem value="project_created">Projeto Criado</SelectItem>
                <SelectItem value="project_completed">Projeto Concluído</SelectItem>
                <SelectItem value="payment_overdue">Pagamento Atrasado</SelectItem>
                <SelectItem value="task_approved">Tarefa Aprovada</SelectItem>
                <SelectItem value="nomade_qualified">Nômade Qualificado</SelectItem>
                <SelectItem value="agency_upgraded">Agência Promovida</SelectItem>
                <SelectItem value="course_completed">Curso Concluído</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Condições</Label>
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
                    <SelectItem value="project_status">Status do Projeto</SelectItem>
                    <SelectItem value="days_since">Dias Desde</SelectItem>
                    <SelectItem value="project_value">Valor do Projeto</SelectItem>
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
                    <SelectItem value="greater_than">Maior que</SelectItem>
                    <SelectItem value="less_than">Menor que</SelectItem>
                    <SelectItem value="contains">Contém</SelectItem>
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

          <div className="space-y-2">
            <Label>Público-Alvo</Label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Select
                  value={newAudience.type}
                  onValueChange={(value) => setNewAudience((prev) => ({ ...prev, type: value }))}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="account_type">Tipo de Conta</SelectItem>
                    <SelectItem value="account_level">Nível</SelectItem>
                    <SelectItem value="location">Localização</SelectItem>
                    <SelectItem value="segment">Segmento</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  className="flex-1"
                  value={newAudience.value}
                  onChange={(e) => setNewAudience((prev) => ({ ...prev, value: e.target.value }))}
                  placeholder="Valor"
                />
                <Button type="button" onClick={addAudience}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(formData.target_audience).map(([type, value]) => (
                  <Badge key={type} variant="outline" className="flex items-center gap-1">
                    {type}: {value}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => removeAudience(type)} />
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="delay">Atraso (minutos)</Label>
            <Input
              id="delay"
              type="number"
              value={formData.delay_minutes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, delay_minutes: Number.parseInt(e.target.value) || 0 }))
              }
              placeholder="0"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked }))}
            />
            <Label htmlFor="active">Regra Ativa</Label>
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
