// @ts-nocheck
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Building2, User, Info } from "lucide-react"
import type { Term } from "@/types/terms"

interface TermManagementModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  term?: Term | null
  onSave: (term: Partial<Term>) => void
  mode?: "create" | "edit"
}

const ACCOUNT_TYPE_OPTIONS: { value: "empresas" | "agencias" | "nomades"; label: string }[] = [
  { value: "empresas", label: "Empresas" },
  { value: "agencias", label: "Agências" },
  { value: "nomades", label: "Nômades" },
]

export function TermManagementModal({ open, onOpenChange, term, onSave, mode = "create" }: TermManagementModalProps) {
  const [formData, setFormData] = useState<{
    name: string
    content: string
    version: string
    type: string
    acceptance_level: "empresa" | "usuario"
    target_account_types: ("empresas" | "agencias" | "nomades")[]
    is_mandatory: boolean
    is_active: boolean
  }>({
    name: term?.name || "",
    content: term?.content || "",
    version: term?.version || "1.0",
    type: term?.type || "terms_of_service",
    acceptance_level: term?.acceptance_level || "empresa",
    target_account_types: term?.target_account_types || ["empresas"],
    is_mandatory: term?.is_mandatory ?? true,
    is_active: term?.is_active ?? true,
  })

  const toggleAccountType = (value: "empresas" | "agencias" | "nomades") => {
    setFormData((prev) => {
      const already = prev.target_account_types.includes(value)
      return {
        ...prev,
        target_account_types: already
          ? prev.target_account_types.filter((t) => t !== value)
          : [...prev.target_account_types, value],
      }
    })
  }

  const handleSave = () => {
    onSave({
      ...formData,
      conditions: term?.conditions || [],
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Editar Termo" : "Novo Termo"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Nome e versão */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Termo</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Termos de Uso da Plataforma"
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

          {/* Tipo */}
          <div className="space-y-2">
            <Label>Tipo de Documento</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, type: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="terms_of_service">Termos de Serviço</SelectItem>
                <SelectItem value="privacy_policy">Política de Privacidade</SelectItem>
                <SelectItem value="data_processing">Processamento de Dados</SelectItem>
                <SelectItem value="service_agreement">Acordo de Serviços</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Público-alvo: Nível de aceite */}
          <div className="space-y-3">
            <div>
              <Label className="text-base font-semibold">Nível de Aceite</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Define quem deve aceitar este termo ao acessar a plataforma.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, acceptance_level: "empresa" }))}
                className={`flex items-start gap-3 p-4 rounded-lg border-2 text-left transition-colors ${
                  formData.acceptance_level === "empresa"
                    ? "border-blue-600 bg-blue-50"
                    : "border-border hover:border-muted-foreground"
                }`}
              >
                <Building2 className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                  formData.acceptance_level === "empresa" ? "text-blue-600" : "text-muted-foreground"
                }`} />
                <div>
                  <p className="font-medium text-sm">Empresa</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Apenas o usuário master/inicial da conta. Obrigatório antes de liberar acesso à empresa.
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, acceptance_level: "usuario" }))}
                className={`flex items-start gap-3 p-4 rounded-lg border-2 text-left transition-colors ${
                  formData.acceptance_level === "usuario"
                    ? "border-blue-600 bg-blue-50"
                    : "border-border hover:border-muted-foreground"
                }`}
              >
                <User className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                  formData.acceptance_level === "usuario" ? "text-blue-600" : "text-muted-foreground"
                }`} />
                <div>
                  <p className="font-medium text-sm">Usuário</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Todos os usuários cadastrados. Cada pessoa aceita individualmente ao entrar.
                  </p>
                </div>
              </button>
            </div>
            {formData.acceptance_level === "empresa" && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800">
                <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>O aceite de <strong>Empresa</strong> bloqueia toda a plataforma até que o user master assine. Após isso, a empresa tem acesso liberado.</span>
              </div>
            )}
            {formData.acceptance_level === "usuario" && (
              <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800">
                <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>O aceite de <strong>Usuário</strong> é solicitado individualmente para cada pessoa ao fazer login pela primeira vez ou quando uma nova versão for publicada.</span>
              </div>
            )}
          </div>

          {/* Tipos de conta */}
          <div className="space-y-3">
            <div>
              <Label className="text-base font-semibold">Tipos de Conta</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Selecione para quais tipos de conta este termo será exibido. (Admins nunca recebem termos de aceite.)
              </p>
            </div>
            <div className="flex gap-6">
              {ACCOUNT_TYPE_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={formData.target_account_types.includes(opt.value)}
                    onCheckedChange={() => toggleAccountType(opt.value)}
                  />
                  <span className="text-sm font-medium">{opt.label}</span>
                </label>
              ))}
            </div>
            {formData.target_account_types.length === 0 && (
              <p className="text-xs text-red-500">Selecione ao menos um tipo de conta.</p>
            )}
          </div>

          <Separator />

          {/* Conteúdo */}
          <div className="space-y-2">
            <Label htmlFor="content">Conteúdo do Termo</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
              placeholder="Digite o conteúdo completo do termo..."
              rows={10}
              className="font-mono text-sm"
            />
          </div>

          {/* Toggles */}
          <div className="flex items-center gap-6 pt-2">
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

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={!formData.name || !formData.content || formData.target_account_types.length === 0}
          >
            {mode === "edit" ? "Salvar Alterações" : "Criar Termo"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
