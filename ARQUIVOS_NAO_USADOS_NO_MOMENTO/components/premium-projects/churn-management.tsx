
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
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
import { AlertTriangle, ArrowRight, Mail, Building, RefreshCw } from "lucide-react"
import type { PremiumProject, ProjectRedistribution, PartnerAgency } from "@/types/premium-project"

interface ChurnManagementProps {
  projects: PremiumProject[]
  agencies: PartnerAgency[]
  onProcessChurn: (churnData: ChurnEventData) => void
  onRedistributeProjects: (redistributions: ProjectRedistribution[]) => void
}

interface ChurnEventData {
  partner_agency_id: string
  reason: string
  affected_projects: string[]
  redistribution_plan: ProjectRedistribution[]
}

const churnReasons = [
  { value: "performance", label: "Baixa Performance" },
  { value: "compliance", label: "Não Conformidade" },
  { value: "financial", label: "Problemas Financeiros" },
  { value: "strategic", label: "Mudança Estratégica" },
  { value: "voluntary", label: "Saída Voluntária" },
  { value: "contract", label: "Fim de Contrato" },
  { value: "other", label: "Outros Motivos" },
]

export function ChurnManagement({ projects, agencies, onProcessChurn, onRedistributeProjects }: ChurnManagementProps) {
  const [selectedAgency, setSelectedAgency] = useState<PartnerAgency | null>(null)
  const [churnReason, setChurnReason] = useState("")
  const [churnReasonDetails, setChurnReasonDetails] = useState("")
  const [affectedProjects, setAffectedProjects] = useState<string[]>([])
  const [redistributionPlan, setRedistributionPlan] = useState<ProjectRedistribution[]>([])
  const [showChurnDialog, setShowChurnDialog] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [notifyClients, setNotifyClients] = useState(true)

  // Filtrar projetos da agência selecionada
  const agencyProjects = selectedAgency
    ? projects.filter((p) => p.partner_agency.id === selectedAgency.id && p.status === "ativo")
    : []

  // Agências disponíveis para redistribuição (excluindo a que está saindo)
  const availableAgencies = agencies.filter(
    (a) => a.id !== selectedAgency?.id && a.partner_level !== "basic", // Apenas agências premium/elite podem receber projetos premium
  )

  const handleAgencySelect = (agency: PartnerAgency) => {
    setSelectedAgency(agency)
    setAffectedProjects([])
    setRedistributionPlan([])
    setChurnReason("")
    setChurnReasonDetails("")
  }

  const handleProjectToggle = (projectId: string, checked: boolean) => {
    if (checked) {
      setAffectedProjects((prev) => [...prev, projectId])
    } else {
      setAffectedProjects((prev) => prev.filter((id) => id !== projectId))
      // Remove from redistribution plan if unchecked
      setRedistributionPlan((prev) => prev.filter((r) => r.project_id !== projectId))
    }
  }

  const handleRedistributionChange = (projectId: string, toAgencyId: string) => {
    if (!selectedAgency) return

    const existingIndex = redistributionPlan.findIndex((r) => r.project_id === projectId)
    const newRedistribution: ProjectRedistribution = {
      project_id: projectId,
      from_agency_id: selectedAgency.id,
      to_agency_id: toAgencyId,
      redistribution_date: new Date().toISOString().split("T")[0],
      reason: `Churn da agência ${selectedAgency.name}`,
      client_notified: notifyClients,
    }

    if (existingIndex >= 0) {
      setRedistributionPlan((prev) => prev.map((r, i) => (i === existingIndex ? newRedistribution : r)))
    } else {
      setRedistributionPlan((prev) => [...prev, newRedistribution])
    }
  }

  const handleAutoDistribute = () => {
    if (!selectedAgency || affectedProjects.length === 0) return

    const newRedistributions: ProjectRedistribution[] = []

    affectedProjects.forEach((projectId, index) => {
      // Distribuir projetos de forma equilibrada entre agências disponíveis
      const targetAgency = availableAgencies[index % availableAgencies.length]

      newRedistributions.push({
        project_id: projectId,
        from_agency_id: selectedAgency.id,
        to_agency_id: targetAgency.id,
        redistribution_date: new Date().toISOString().split("T")[0],
        reason: `Churn da agência ${selectedAgency.name}`,
        client_notified: notifyClients,
      })
    })

    setRedistributionPlan(newRedistributions)
  }

  const handleProcessChurn = async () => {
    if (!selectedAgency || !churnReason || affectedProjects.length === 0) {
      alert("Por favor, preencha todos os campos obrigatórios")
      return
    }

    // Verificar se todos os projetos afetados têm redistribuição definida
    const missingRedistributions = affectedProjects.filter(
      (projectId) => !redistributionPlan.find((r) => r.project_id === projectId),
    )

    if (missingRedistributions.length > 0) {
      alert("Todos os projetos afetados devem ter uma agência de destino definida")
      return
    }

    setIsProcessing(true)

    try {
      const churnData: ChurnEventData = {
        partner_agency_id: selectedAgency.id,
        reason: churnReason === "other" ? churnReasonDetails : churnReason,
        affected_projects: affectedProjects,
        redistribution_plan: redistributionPlan,
      }

      await onProcessChurn(churnData)
      await onRedistributeProjects(redistributionPlan)

      // Reset form
      setSelectedAgency(null)
      setAffectedProjects([])
      setRedistributionPlan([])
      setChurnReason("")
      setChurnReasonDetails("")
      setShowChurnDialog(false)
      setShowConfirmDialog(false)
    } catch (error) {
      console.error("Erro ao processar churn:", error)
      alert("Erro ao processar saída da agência")
    } finally {
      setIsProcessing(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  const getTotalAffectedValue = () => {
    return affectedProjects.reduce((total, projectId) => {
      const project = agencyProjects.find((p) => p.id === projectId)
      return total + (project?.value || 0)
    }, 0)
  }

  const getProjectById = (projectId: string) => {
    return agencyProjects.find((p) => p.id === projectId)
  }

  const getAgencyById = (agencyId: string) => {
    return availableAgencies.find((a) => a.id === agencyId)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Gestão de Churn - Agências Partner
        </CardTitle>
        <CardDescription>Gerencie a saída de agências Partner e redistribuição de projetos</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Agency Selection */}
        <div>
          <Label className="text-sm font-medium text-gray-700">Selecionar Agência</Label>
          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {agencies.map((agency) => {
              const activeProjects = projects.filter(
                (p) => p.partner_agency.id === agency.id && p.status === "ativo",
              ).length

              return (
                <Card
                  key={agency.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedAgency?.id === agency.id ? "ring-2 ring-blue-500 bg-blue-50" : ""
                  }`}
                  onClick={() => handleAgencySelect(agency)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{agency.name}</h4>
                        <p className="text-sm text-gray-600">{agency.contact_person}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {agency.partner_level}
                          </Badge>
                          <span className="text-xs text-gray-500">{activeProjects} projetos ativos</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-medium">{agency.satisfaction_rating}</span>
                          <span className="text-xs text-gray-500">/5</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Churn Process */}
        {selectedAgency && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building className="h-5 w-5" />
                Processar Saída: {selectedAgency.name}
              </CardTitle>
              <CardDescription>{agencyProjects.length} projetos ativos serão afetados</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Churn Reason */}
              <div>
                <Label htmlFor="churn-reason">Motivo da Saída *</Label>
                <Select value={churnReason} onValueChange={setChurnReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    {churnReasons.map((reason) => (
                      <SelectItem key={reason.value} value={reason.value}>
                        {reason.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {churnReason === "other" && (
                  <Textarea
                    placeholder="Descreva o motivo..."
                    value={churnReasonDetails}
                    onChange={(e) => setChurnReasonDetails(e.target.value)}
                    className="mt-2"
                  />
                )}
              </div>

              {/* Affected Projects */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-medium text-gray-700">
                    Projetos Afetados ({affectedProjects.length}/{agencyProjects.length})
                  </Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (affectedProjects.length === agencyProjects.length) {
                        setAffectedProjects([])
                        setRedistributionPlan([])
                      } else {
                        setAffectedProjects(agencyProjects.map((p) => p.id))
                      }
                    }}
                  >
                    {affectedProjects.length === agencyProjects.length ? "Desmarcar Todos" : "Selecionar Todos"}
                  </Button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {agencyProjects.map((project) => (
                    <div key={project.id} className="flex items-center space-x-3 p-3 bg-white rounded-lg border">
                      <Checkbox
                        checked={affectedProjects.includes(project.id)}
                        onCheckedChange={(checked) => handleProjectToggle(project.id, checked as boolean)}
                      />
                      <div className="flex-1">
                        <h4 className="font-medium">{project.title}</h4>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>{project.client.name}</span>
                          <span>{formatCurrency(project.value)}</span>
                          <Badge variant="outline" className="text-xs">
                            {project.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {affectedProjects.length > 0 && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Valor Total Afetado:</span>
                      <span className="font-bold text-blue-600">{formatCurrency(getTotalAffectedValue())}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Redistribution Plan */}
              {affectedProjects.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-sm font-medium text-gray-700">Plano de Redistribuição</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAutoDistribute}
                      disabled={availableAgencies.length === 0}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Distribuir Automaticamente
                    </Button>
                  </div>

                  {availableAgencies.length === 0 ? (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2 text-red-800">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="font-medium">Nenhuma agência disponível</span>
                      </div>
                      <p className="text-sm text-red-700 mt-1">
                        Não há agências Partner Premium/Elite disponíveis para receber os projetos.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {affectedProjects.map((projectId) => {
                        const project = getProjectById(projectId)
                        const redistribution = redistributionPlan.find((r) => r.project_id === projectId)
                        const targetAgency = redistribution ? getAgencyById(redistribution.to_agency_id) : null

                        return (
                          <div key={projectId} className="flex items-center gap-4 p-3 bg-white rounded-lg border">
                            <div className="flex-1">
                              <h4 className="font-medium">{project?.title}</h4>
                              <p className="text-sm text-gray-600">{project?.client.name}</p>
                            </div>
                            <ArrowRight className="h-4 w-4 text-gray-400" />
                            <div className="w-64">
                              <Select
                                value={redistribution?.to_agency_id || ""}
                                onValueChange={(value) => handleRedistributionChange(projectId, value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecionar agência" />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableAgencies.map((agency) => (
                                    <SelectItem key={agency.id} value={agency.id}>
                                      <div className="flex items-center gap-2">
                                        <span>{agency.name}</span>
                                        <Badge variant="outline" className="text-xs">
                                          {agency.partner_level}
                                        </Badge>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Client Notification */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="notify-clients"
                  checked={notifyClients}
                  onCheckedChange={(checked) => setNotifyClients(checked as boolean)}
                />
                <Label htmlFor="notify-clients" className="text-sm">
                  Notificar clientes sobre a mudança de agência
                </Label>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setSelectedAgency(null)}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => setShowConfirmDialog(true)}
                  disabled={
                    !churnReason ||
                    affectedProjects.length === 0 ||
                    redistributionPlan.length !== affectedProjects.length ||
                    availableAgencies.length === 0
                  }
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  Processar Saída da Agência
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Confirmation Dialog */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent className="max-w-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Confirmar Saída da Agência
              </AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação irá processar a saída da agência "{selectedAgency?.name}" e redistribuir todos os projetos
                selecionados. Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Agência:</span>
                  <p>{selectedAgency?.name}</p>
                </div>
                <div>
                  <span className="font-medium">Motivo:</span>
                  <p>{churnReasons.find((r) => r.value === churnReason)?.label}</p>
                </div>
                <div>
                  <span className="font-medium">Projetos Afetados:</span>
                  <p>{affectedProjects.length}</p>
                </div>
                <div>
                  <span className="font-medium">Valor Total:</span>
                  <p className="font-bold text-orange-600">{formatCurrency(getTotalAffectedValue())}</p>
                </div>
              </div>

              <div>
                <span className="font-medium text-sm">Redistribuições:</span>
                <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                  {redistributionPlan.map((redistribution) => {
                    const project = getProjectById(redistribution.project_id)
                    const targetAgency = getAgencyById(redistribution.to_agency_id)

                    return (
                      <div
                        key={redistribution.project_id}
                        className="flex items-center gap-2 text-sm p-2 bg-gray-50 rounded"
                      >
                        <span className="flex-1">{project?.title}</span>
                        <ArrowRight className="h-3 w-3 text-gray-400" />
                        <span className="font-medium">{targetAgency?.name}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {notifyClients && (
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <Mail className="h-4 w-4" />
                  <span>Clientes serão notificados sobre a mudança</span>
                </div>
              )}
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleProcessChurn}
                disabled={isProcessing}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {isProcessing ? "Processando..." : "Confirmar Saída"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}
