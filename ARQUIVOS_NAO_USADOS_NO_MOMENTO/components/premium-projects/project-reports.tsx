
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
  Plus,
  FileText,
  Calendar,
  User,
  Star,
  TrendingUp,
  TrendingDown,
  Eye,
  Edit,
  Trash2,
  Clock,
  CheckCircle,
  AlertTriangle,
} from "lucide-react"
import type { PremiumProject, ProjectReport } from "@/types/premium-project"

interface ProjectReportsProps {
  project: PremiumProject
  onAddReport: (projectId: string, report: Omit<ProjectReport, "id" | "project_id">) => void
  onUpdateReport: (projectId: string, reportId: string, report: Partial<ProjectReport>) => void
  onDeleteReport: (projectId: string, reportId: string) => void
}

const budgetStatusConfig = {
  on_track: { label: "No Orçamento", color: "bg-green-100 text-green-800", icon: CheckCircle },
  over_budget: { label: "Acima do Orçamento", color: "bg-red-100 text-red-800", icon: AlertTriangle },
  under_budget: { label: "Abaixo do Orçamento", color: "bg-blue-100 text-blue-800", icon: TrendingDown },
}

const timelineStatusConfig = {
  on_time: { label: "No Prazo", color: "bg-green-100 text-green-800", icon: CheckCircle },
  delayed: { label: "Atrasado", color: "bg-red-100 text-red-800", icon: AlertTriangle },
  ahead: { label: "Adiantado", color: "bg-blue-100 text-blue-800", icon: TrendingUp },
}

export function ProjectReports({ project, onAddReport, onUpdateReport, onDeleteReport }: ProjectReportsProps) {
  const [showNewReportDialog, setShowNewReportDialog] = useState(false)
  const [selectedReport, setSelectedReport] = useState<ProjectReport | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const [newReport, setNewReport] = useState({
    reporter_type: "commercial_admin" as "commercial_admin" | "partner_agency",
    status_update: "",
    client_satisfaction: 5,
    challenges: "",
    next_steps: "",
    completion_percentage: 0,
    budget_status: "on_track" as "on_track" | "over_budget" | "under_budget",
    timeline_status: "on_time" as "on_time" | "delayed" | "ahead",
  })

  const reports = project.reports || []
  const sortedReports = [...reports].sort(
    (a, b) => new Date(b.report_date).getTime() - new Date(a.report_date).getTime(),
  )

  const handleCreateReport = async () => {
    if (!newReport.status_update.trim() || !newReport.next_steps.trim()) {
      alert("Por favor, preencha todos os campos obrigatórios")
      return
    }

    setIsLoading(true)

    try {
      const reportData: Omit<ProjectReport, "id" | "project_id"> = {
        ...newReport,
        reporter_id:
          newReport.reporter_type === "commercial_admin" ? project.commercial_admin.id : project.partner_agency.id,
        report_date: new Date().toISOString().split("T")[0],
      }

      await onAddReport(project.id, reportData)

      setNewReport({
        reporter_type: "commercial_admin",
        status_update: "",
        client_satisfaction: 5,
        challenges: "",
        next_steps: "",
        completion_percentage: 0,
        budget_status: "on_track",
        timeline_status: "on_time",
      })

      setShowNewReportDialog(false)
    } catch (error) {
      console.error("Erro ao criar relatório:", error)
      alert("Erro ao criar relatório")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteReport = async (reportId: string) => {
    setIsLoading(true)

    try {
      await onDeleteReport(project.id, reportId)
      setShowDeleteDialog(null)
    } catch (error) {
      console.error("Erro ao deletar relatório:", error)
      alert("Erro ao deletar relatório")
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR")
  }

  const getReporterName = (report: ProjectReport) => {
    return report.reporter_type === "commercial_admin"
      ? project.commercial_admin.name
      : project.partner_agency.contact_person
  }

  const getReporterRole = (report: ProjectReport) => {
    return report.reporter_type === "commercial_admin" ? "Admin Comercial" : "Agência Partner"
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star key={i} className={`h-4 w-4 ${i < rating ? "text-yellow-400 fill-current" : "text-gray-300"}`} />
    ))
  }

  const getNextReportDue = () => {
    if (reports.length === 0) return "Primeiro relatório"

    const lastReport = sortedReports[0]
    const lastReportDate = new Date(lastReport.report_date)
    const nextDue = new Date(lastReportDate)
    nextDue.setDate(nextDue.getDate() + 7) // Relatórios semanais

    const today = new Date()
    const isOverdue = nextDue < today

    return {
      date: nextDue.toLocaleDateString("pt-BR"),
      isOverdue,
      daysOverdue: isOverdue ? Math.floor((today.getTime() - nextDue.getTime()) / (1000 * 60 * 60 * 24)) : 0,
    }
  }

  const nextReportInfo = getNextReportDue()

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Relatórios do Projeto
            </CardTitle>
            <CardDescription>Acompanhamento periódico do progresso e status do projeto</CardDescription>
          </div>
          <Dialog open={showNewReportDialog} onOpenChange={setShowNewReportDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Relatório
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Criar Novo Relatório</DialogTitle>
                <DialogDescription>Adicione um relatório de acompanhamento do projeto</DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                <div>
                  <Label htmlFor="reporter-type">Tipo de Relator</Label>
                  <Select
                    value={newReport.reporter_type}
                    onValueChange={(value) =>
                      setNewReport((prev) => ({
                        ...prev,
                        reporter_type: value as "commercial_admin" | "partner_agency",
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="commercial_admin">Admin Comercial</SelectItem>
                      <SelectItem value="partner_agency">Agência Partner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="status-update">Atualização de Status *</Label>
                  <Textarea
                    id="status-update"
                    placeholder="Descreva o status atual do projeto..."
                    value={newReport.status_update}
                    onChange={(e) => setNewReport((prev) => ({ ...prev, status_update: e.target.value }))}
                    rows={3}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="client-satisfaction">Satisfação do Cliente</Label>
                    <div className="flex items-center gap-2 mt-2">
                      <Select
                        value={newReport.client_satisfaction.toString()}
                        onValueChange={(value) =>
                          setNewReport((prev) => ({
                            ...prev,
                            client_satisfaction: Number.parseInt(value),
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 - Muito Insatisfeito</SelectItem>
                          <SelectItem value="2">2 - Insatisfeito</SelectItem>
                          <SelectItem value="3">3 - Neutro</SelectItem>
                          <SelectItem value="4">4 - Satisfeito</SelectItem>
                          <SelectItem value="5">5 - Muito Satisfeito</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex">{renderStars(newReport.client_satisfaction)}</div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="completion">Percentual de Conclusão</Label>
                    <div className="space-y-2 mt-2">
                      <Input
                        id="completion"
                        type="number"
                        min="0"
                        max="100"
                        value={newReport.completion_percentage}
                        onChange={(e) =>
                          setNewReport((prev) => ({
                            ...prev,
                            completion_percentage: Number.parseInt(e.target.value) || 0,
                          }))
                        }
                      />
                      <Progress value={newReport.completion_percentage} className="h-2" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="budget-status">Status do Orçamento</Label>
                    <Select
                      value={newReport.budget_status}
                      onValueChange={(value) =>
                        setNewReport((prev) => ({
                          ...prev,
                          budget_status: value as "on_track" | "over_budget" | "under_budget",
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="on_track">No Orçamento</SelectItem>
                        <SelectItem value="over_budget">Acima do Orçamento</SelectItem>
                        <SelectItem value="under_budget">Abaixo do Orçamento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="timeline-status">Status do Cronograma</Label>
                    <Select
                      value={newReport.timeline_status}
                      onValueChange={(value) =>
                        setNewReport((prev) => ({
                          ...prev,
                          timeline_status: value as "on_time" | "delayed" | "ahead",
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="on_time">No Prazo</SelectItem>
                        <SelectItem value="delayed">Atrasado</SelectItem>
                        <SelectItem value="ahead">Adiantado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="challenges">Desafios e Obstáculos</Label>
                  <Textarea
                    id="challenges"
                    placeholder="Descreva os principais desafios enfrentados..."
                    value={newReport.challenges}
                    onChange={(e) => setNewReport((prev) => ({ ...prev, challenges: e.target.value }))}
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="next-steps">Próximos Passos *</Label>
                  <Textarea
                    id="next-steps"
                    placeholder="Descreva os próximos passos planejados..."
                    value={newReport.next_steps}
                    onChange={(e) => setNewReport((prev) => ({ ...prev, next_steps: e.target.value }))}
                    rows={2}
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowNewReportDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateReport} disabled={isLoading}>
                  {isLoading ? "Criando..." : "Criar Relatório"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Next Report Due */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-blue-900">Próximo Relatório</span>
          </div>
          {typeof nextReportInfo === "string" ? (
            <p className="text-sm text-blue-700">{nextReportInfo}</p>
          ) : (
            <div>
              <p className="text-sm text-blue-700">
                Vencimento: {nextReportInfo.date}
                {nextReportInfo.isOverdue && (
                  <Badge variant="destructive" className="ml-2">
                    {nextReportInfo.daysOverdue} dias em atraso
                  </Badge>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Reports List */}
        {sortedReports.length > 0 ? (
          <div className="space-y-4">
            {sortedReports.map((report) => {
              const BudgetIcon = budgetStatusConfig[report.budget_status].icon
              const TimelineIcon = timelineStatusConfig[report.timeline_status].icon

              return (
                <Card key={report.id} className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <User className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">{getReporterName(report)}</span>
                          <Badge variant="outline" className="text-xs">
                            {getReporterRole(report)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(report.report_date)}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedReport(report)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setShowDeleteDialog(report.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      {/* Status Update */}
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Atualização de Status</Label>
                        <p className="text-sm text-gray-900 mt-1">{report.status_update}</p>
                      </div>

                      {/* Metrics */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Satisfação</Label>
                          <div className="flex items-center gap-1 mt-1">
                            {renderStars(report.client_satisfaction)}
                            <span className="text-sm text-gray-600 ml-1">({report.client_satisfaction}/5)</span>
                          </div>
                        </div>

                        <div>
                          <Label className="text-sm font-medium text-gray-700">Progresso</Label>
                          <div className="mt-1">
                            <div className="flex items-center gap-2">
                              <Progress value={report.completion_percentage} className="h-2 flex-1" />
                              <span className="text-sm font-medium">{report.completion_percentage}%</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <Label className="text-sm font-medium text-gray-700">Orçamento</Label>
                          <div className="mt-1">
                            <Badge className={budgetStatusConfig[report.budget_status].color}>
                              <BudgetIcon className="h-3 w-3 mr-1" />
                              {budgetStatusConfig[report.budget_status].label}
                            </Badge>
                          </div>
                        </div>

                        <div>
                          <Label className="text-sm font-medium text-gray-700">Cronograma</Label>
                          <div className="mt-1">
                            <Badge className={timelineStatusConfig[report.timeline_status].color}>
                              <TimelineIcon className="h-3 w-3 mr-1" />
                              {timelineStatusConfig[report.timeline_status].label}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Challenges and Next Steps */}
                      {(report.challenges || report.next_steps) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {report.challenges && (
                            <div>
                              <Label className="text-sm font-medium text-gray-700">Desafios</Label>
                              <p className="text-sm text-gray-900 mt-1">{report.challenges}</p>
                            </div>
                          )}
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Próximos Passos</Label>
                            <p className="text-sm text-gray-900 mt-1">{report.next_steps}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum relatório encontrado</h3>
            <p className="text-gray-600 mb-4">Comece criando o primeiro relatório de acompanhamento do projeto</p>
            <Button onClick={() => setShowNewReportDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Relatório
            </Button>
          </div>
        )}

        {/* Report Details Modal */}
        {selectedReport && (
          <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Detalhes do Relatório</DialogTitle>
                <DialogDescription>
                  Relatório de {formatDate(selectedReport.report_date)} por {getReporterName(selectedReport)}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Relator</Label>
                    <div className="mt-1">
                      <p className="font-medium">{getReporterName(selectedReport)}</p>
                      <p className="text-sm text-gray-600">{getReporterRole(selectedReport)}</p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Data do Relatório</Label>
                    <p className="mt-1">{formatDate(selectedReport.report_date)}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700">Atualização de Status</Label>
                  <p className="mt-1 text-gray-900">{selectedReport.status_update}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Satisfação do Cliente</Label>
                    <div className="flex items-center gap-2 mt-1">
                      {renderStars(selectedReport.client_satisfaction)}
                      <span className="text-sm text-gray-600">({selectedReport.client_satisfaction}/5)</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Progresso do Projeto</Label>
                    <div className="mt-1">
                      <div className="flex items-center gap-2">
                        <Progress value={selectedReport.completion_percentage} className="h-3 flex-1" />
                        <span className="font-medium">{selectedReport.completion_percentage}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {selectedReport.challenges && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Desafios e Obstáculos</Label>
                    <p className="mt-1 text-gray-900">{selectedReport.challenges}</p>
                  </div>
                )}

                <div>
                  <Label className="text-sm font-medium text-gray-700">Próximos Passos</Label>
                  <p className="mt-1 text-gray-900">{selectedReport.next_steps}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Status do Orçamento</Label>
                    <div className="mt-1">
                      <Badge className={budgetStatusConfig[selectedReport.budget_status].color}>
                        {budgetStatusConfig[selectedReport.budget_status].label}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Status do Cronograma</Label>
                    <div className="mt-1">
                      <Badge className={timelineStatusConfig[selectedReport.timeline_status].color}>
                        {timelineStatusConfig[selectedReport.timeline_status].label}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Delete Confirmation */}
        <AlertDialog open={!!showDeleteDialog} onOpenChange={() => setShowDeleteDialog(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este relatório? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => showDeleteDialog && handleDeleteReport(showDeleteDialog)}
                disabled={isLoading}
              >
                {isLoading ? "Excluindo..." : "Excluir"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}
