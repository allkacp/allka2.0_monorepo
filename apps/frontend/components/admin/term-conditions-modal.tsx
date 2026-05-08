// @ts-nocheck
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { TermCondition } from "@/types/terms"

interface TermConditionsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  condition?: TermCondition
  onSave: (condition: Partial<TermCondition>) => void
}

export function TermConditionsModal({ open, onOpenChange, condition, onSave }: TermConditionsModalProps) {
  const [formData, setFormData] = useState({
    name: condition?.name || "",
    field: condition?.field || "",
    operator: condition?.operator || ("equals" as const),
    value: condition?.value || "",
    description: condition?.description || "",
  })

  const handleSave = () => {
    onSave(formData)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{condition ? "Editar Condição" : "Nova Condição"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Condição</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Nome identificador"
            />
          </div>

          <div className="space-y-2">
            <Label>Campo</Label>
            <Select
              value={formData.field}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, field: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o campo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="account_type">Tipo de Conta</SelectItem>
                <SelectItem value="account_level">Nível da Conta</SelectItem>
                <SelectItem value="feature_access">Acesso a Funcionalidade</SelectItem>
                <SelectItem value="registration_date">Data de Cadastro</SelectItem>
                <SelectItem value="location">Localização</SelectItem>
                <SelectItem value="project_count">Número de Projetos</SelectItem>
                <SelectItem value="subscription_plan">Plano de Assinatura</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Operador</Label>
            <Select
              value={formData.operator}
              onValueChange={(value: any) => setFormData((prev) => ({ ...prev, operator: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="equals">Igual a</SelectItem>
                <SelectItem value="not_equals">Diferente de</SelectItem>
                <SelectItem value="contains">Contém</SelectItem>
                <SelectItem value="not_contains">Não contém</SelectItem>
                <SelectItem value="greater_than">Maior que</SelectItem>
                <SelectItem value="less_than">Menor que</SelectItem>
                <SelectItem value="greater_equal">Maior ou igual</SelectItem>
                <SelectItem value="less_equal">Menor ou igual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="value">Valor</Label>
            <Input
              id="value"
              value={formData.value}
              onChange={(e) => setFormData((prev) => ({ ...prev, value: e.target.value }))}
              placeholder="Valor para comparação"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Descrição da condição (opcional)"
            />
          </div>

          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>Exemplo:</strong>{" "}
              {formData.field && formData.operator && formData.value
                ? `${formData.field} ${formData.operator} "${formData.value}"`
                : "Configure os campos acima para ver o exemplo"}
            </p>
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
