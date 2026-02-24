
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  ArrowRight,
  CheckCircle,
  Clock,
  AlertTriangle,
  DollarSign,
  FileText,
  Calendar,
  User,
  MessageSquare,
} from "lucide-react"
import type { PremiumProject, PremiumProjectStatus, ProjectHistory } from "@/types/premium-project"

interface StatusFlowManagerProps {
  project: PremiumProject
  onStatusChange: (projectId: string, newStatus: PremiumProjectStatus, data: any) => void
  onAddHistory: (projectId: string, history: Omit<ProjectHistory, "id" | "project_id">) => void
}

const statusFlow: Record<PremiumProjectStatus, PremiumProjectStatus[]> = {
  elaborado: ["em_negociacao", "perdido"],
  em_negociacao: ["aguardando_pagamento", "perdido"],
  perdido: [], // Status final
  aguardando_pagamento: ["ativo", "inadimplente"],
  ativo: ["concluido", "cancelado", "inadimplente"],
  inadimplente: ["ativo", "cancelado"],
  cancelado: [], // Status final
  concluido: [], // Status final
}

const statusConfig = {
  elaborado: {
    label: "Elaborado",
    color: "bg-blue-100 text-blue-800",
    icon: FileText,
    description: "Proposta em elaboração",
  },
  em_negociacao: {
    label: "Em Negociação",
    color: "bg-yellow-100 text-yellow-800",
    icon: Clock,
    description: "Negociando termos e condições",
  },
  perdido: {
    label: "Perdido",
    color: "bg-red-100 text-red-800",
    icon: AlertTriangle,
    description: "Projeto não foi fechado",
  },
  aguardando_pagamento: {
    label: "Aguardando Pagamento",
    color: "bg-orange-100 text-orange-800",
    icon: DollarSign,
    description: "Aguardando confirmação de pagamento",
  },
  ativo: {
    label: "Ativo",
    color: "bg-green-100 text-green-800",
    icon: CheckCircle,
    description: "Projeto em execução",
  },
  inadimplente: {
    label: "Inadimplente",
    color: "bg-red-100 text-red-800",
    icon: AlertTriangle,
    description: "Pagamento em atraso",
  },
  cancelado: {
    label: "Cancelado",
    color: "bg-gray-100 text-gray-800",
    icon: AlertTriangle,
    description: "Projeto cancelado",
  },
  concluido: {
    label: "Concluído",
    color: "bg-purple-100 text-purple-800",
    icon: CheckCircle,
    description: "Projeto finalizado com sucesso",
  },
}

const statusRequiredFields: Record<PremiumProjectStatus, string[]> = {
  elaborado: [],
  em_negociacao: ["negotiation_start"],
  perdido: ["loss_reason"],
  aguardando_pagamento: ["payment_due_date"],
  ativo: ["start_date"],
  inadimplente: ["overdue_days"],
  cancelado: ["cancellation_reason"],
  concluido: ["completion_date"],
}

export function StatusFlowManager({ project, onStatusChange, onAddHistory }: StatusFlowManagerProps) {
  const [selectedStatus, setSelectedStatus] = useState<PremiumProjectStatus | null>(null)
  const [statusData, setStatusData] = useState<Record<string, any>>({})
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const currentStatus = project.status
  const availableTransitions = statusFlow[currentStatus] || []
  const CurrentStatusIcon = statusConfig[currentStatus].icon

  const handleStatusSelect = (newStatus: PremiumProjectStatus) => {
    setSelectedStatus(newStatus)
    setStatusData({})
    setShowConfirmation(true)
  }

  const handleConfirmStatusChange = async () => {
    if (!selectedStatus) return

    setIsLoading(true)

    try {
      // Validar campos obrigatórios
      const requiredFields = statusRequiredFields[selectedStatus]
      const missingFields = requiredFields.filter((field) => !statusData[field])

      if (missingFields.length > 0) {
        alert(`Campos obrigatórios não preenchidos: ${missingFields.join(", ")}`)
        return
      }

      // Atualizar status do projeto
      await onStatusChange(project.id, selectedStatus, statusData)

      // Adicionar ao histórico
      const historyEntry: Omit<ProjectHistory, "id" | "project_id"> = {
        action: "status_change",
        description: `Status alterado de "${statusConfig[currentStatus].label}" para "${statusConfig[selectedStatus].label}"`,
        user_id: "current-user-id", // Seria obtido do contexto de autenticação
        user_name: "Usuário Atual", // Seria obtido do contexto de autenticação
        user_type: "admin", // Seria obtido do contexto de autenticação
        timestamp: new Date().toISOString(),
        metadata: {
          from_status: currentStatus,
          to_status: selectedStatus,
          ...statusData,
        },
      }

      await onAddHistory(project.id, historyEntry)

      setShowConfirmation(false)
      setSelectedStatus(null)
      setStatusData({})
    } catch (error) {
      console.error("Erro ao alterar status:", error)
      alert("Erro ao alterar status do projeto")
    } finally {
      setIsLoading(false)
    }
  }

  const renderStatusField = (field: string) => {
    switch (field) {
      case "negotiation_start":
        return (
          <div key={field}>
            <Label htmlFor={field}>Data de Início da Negociação</Label>
            <Input
              id={field}
              type="date"
              value={statusData[field] || ""}
              onChange={(e) => setStatusData((prev) => ({ ...prev, [field]: e.target.value }))}
              required
            />
          </div>
        )

      case "loss_reason":
        return (
          <div key={field}>
            <Label htmlFor={field}>Motivo da Perda</Label>
            <Select
              value={statusData[field] || ""}
              onValueChange={(value) => setStatusData((prev) => ({ ...prev, [field]: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o motivo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="price">Preço muito alto</SelectItem>
                <SelectItem value="timeline">Prazo inadequado</SelectItem>
                <SelectItem value="competitor">Escolheu concorrente</SelectItem>
                <SelectItem value="budget">Sem orçamento</SelectItem>
                <SelectItem value="scope">Escopo não atendido</SelectItem>
                <SelectItem value="other">Outros motivos</SelectItem>
              </SelectContent>
            </Select>
            {statusData[field] === "other" && (
              <Textarea
                placeholder="Descreva o motivo..."
                value={statusData.loss_reason_details || ""}
                onChange={(e) => setStatusData((prev) => ({ ...prev, loss_reason_details: e.target.value }))}
                className="mt-2"
              />
            )}
          </div>
        )

      case "payment_due_date":
        return (
          <div key={field}>
            <Label htmlFor={field}>Data de Vencimento do Pagamento</Label>
            <Input
              id={field}
              type="date"
              value={statusData[field] || ""}
              onChange={(e) => setStatusData((prev) => ({ ...prev, [field]: e.target.value }))}
              required
            />
          </div>
        )

      case "start_date":
        return (
          <div key={field}>
            <Label htmlFor={field}>Data de Início do Projeto</Label>
            <Input
              id={field}
              type="date"
              value={statusData[field] || ""}
              onChange={(e) => setStatusData((prev) => ({ ...prev, [field]: e.target.value }))}
              required
            />
          </div>
        )

      case "overdue_days":
        return (
          <div key={field}>
            <Label htmlFor={field}>Dias em Atraso</Label>
            <Input
              id={field}
              type="number"
              min="1"
              value={statusData[field] || ""}
              onChange={(e) => setStatusData((prev) => ({ ...prev, [field]: e.target.value }))}
              required
            />
          </div>
        )

      case "cancellation_reason":
        return (
          <div key={field}>
            <Label htmlFor={field}>Motivo do Cancelamento</Label>
            <Textarea
              id={field}
              placeholder="Descreva o motivo do cancelamento..."
              value={statusData[field] || ""}
              onChange={(e) => setStatusData((prev) => ({ ...prev, [field]: e.target.value }))}
              required
            />
          </div>
        )

      case "completion_date":
        return (
          <div key={field}>
            <Label htmlFor={field}>Data de Conclusão</Label>
            <Input
              id={field}
              type="date"
              value={statusData[field] || ""}
              onChange={(e) => setStatusData((prev) => ({ ...prev, [field]: e.target.value }))}
              required
            />
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CurrentStatusIcon className="h-5 w-5" />
          Gestão de Status
        </CardTitle>
        <CardDescription>Gerencie o fluxo de status do projeto premium</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Atual */}
        <div>
          <Label className="text-sm font-medium text-gray-700">Status Atual</Label>
          <div className="mt-2">
            <Badge className={`${statusConfig[currentStatus].color} text-sm px-3 py-1`}>
              <CurrentStatusIcon className="h-4 w-4 mr-2" />
              {statusConfig[currentStatus].label}
            </Badge>
            <p className="text-sm text-gray-600 mt-1">{statusConfig[currentStatus].description}</p>
          </div>
        </div>

        {/* Transições Disponíveis */}
        {availableTransitions.length > 0 && (
          <div>
            <Label className="text-sm font-medium text-gray-700">Próximos Status Disponíveis</Label>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {availableTransitions.map((status) => {
                const StatusIcon = statusConfig[status].icon
                return (
                  <Button
                    key={status}
                    variant="outline"
                    className="justify-start h-auto p-4 bg-transparent"
                    onClick={() => handleStatusSelect(status)}
                  >
                    <div className="flex items-center gap-3">
                      <StatusIcon className="h-5 w-5" />
                      <div className="text-left">
                        <div className="font-medium">{statusConfig[status].label}</div>
                        <div className="text-xs text-gray-500">{statusConfig[status].description}</div>
                      </div>
                      <ArrowRight className="h-4 w-4 ml-auto" />
                    </div>
                  </Button>
                )
              })}
            </div>
          </div>
        )}

        {/* Status Final */}
        {availableTransitions.length === 0 && (
          <div className="text-center py-6">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900">Status Final</h3>
            <p className="text-gray-600">Este projeto atingiu um status final e não pode ser alterado.</p>
          </div>
        )}

        {/* Histórico Recente */}
        {project.history && project.history.length > 0 && (
          <div>
            <Label className="text-sm font-medium text-gray-700">Histórico Recente</Label>
            <div className="mt-2 space-y-2">
              {project.history.slice(-3).map((entry) => (
                <div key={entry.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <MessageSquare className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{entry.description}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                      <User className="h-3 w-3" />
                      <span>{entry.user_name}</span>
                      <Calendar className="h-3 w-3 ml-2" />
                      <span>{new Date(entry.timestamp).toLocaleString("pt-BR")}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal de Confirmação */}
        <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
          <AlertDialogContent className="max-w-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>
                Alterar Status para "{selectedStatus ? statusConfig[selectedStatus].label : ""}"
              </AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação irá alterar o status do projeto e será registrada no histórico.
                {selectedStatus &&
                  statusRequiredFields[selectedStatus].length > 0 &&
                  " Preencha os campos obrigatórios abaixo."}
              </AlertDialogDescription>
            </AlertDialogHeader>

            {selectedStatus && statusRequiredFields[selectedStatus].length > 0 && (
              <div className="space-y-4 py-4">{statusRequiredFields[selectedStatus].map(renderStatusField)}</div>
            )}

            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="notes">Observações (Opcional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Adicione observações sobre esta alteração..."
                  value={statusData.notes || ""}
                  onChange={(e) => setStatusData((prev) => ({ ...prev, notes: e.target.value }))}
                />
              </div>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmStatusChange} disabled={isLoading}>
                {isLoading ? "Alterando..." : "Confirmar Alteração"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}
