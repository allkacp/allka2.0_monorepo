
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  FileText,
  Plus,
  BarChart3,
  TrendingUp,
  DollarSign,
  Users,
  Settings,
  Download,
  Eye,
  Calendar,
  Filter,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PageHeader } from "@/components/page-header"

interface Report {
  id: string
  title: string
  category: "performance" | "financial" | "operational" | "analytics"
  createdDate: string
  period: string
  status: "ready" | "generating" | "scheduled"
}

export default function CompanyRelatoriosPage() {
  const [reports, setReports] = useState<Report[]>([
    {
      id: "1",
      title: "Relatório de Performance Q4 2023",
      category: "performance",
      createdDate: "2024-01-05",
      period: "Q4 2023",
      status: "ready",
    },
    {
      id: "2",
      title: "Análise Financeira - Dezembro",
      category: "financial",
      createdDate: "2024-01-03",
      period: "Dezembro 2023",
      status: "ready",
    },
    {
      id: "3",
      title: "Métricas Operacionais - Anual",
      category: "operational",
      createdDate: "2024-01-01",
      period: "2023",
      status: "ready",
    },
  ])

  const [newReportDialog, setNewReportDialog] = useState(false)
  const [reportType, setReportType] = useState("")
  const [reportPeriod, setReportPeriod] = useState("")

  const handleViewReport = (report: Report) => {
    alert(`Abrindo relatório: ${report.title}`)
  }

  const handleDownloadReport = (report: Report) => {
    alert(`Baixando relatório: ${report.title}`)
  }

  const handleCreateReport = () => {
    if (reportType && reportPeriod) {
      const newReport: Report = {
        id: Date.now().toString(),
        title: `Novo Relatório ${reportType} - ${reportPeriod}`,
        category: reportType as any,
        createdDate: new Date().toISOString().split("T")[0],
        period: reportPeriod,
        status: "generating",
      }
      setReports([newReport, ...reports])
      setNewReportDialog(false)
      setReportType("")
      setReportPeriod("")
      alert("Relatório criado com sucesso! Ele estará disponível em breve.")
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "performance":
        return TrendingUp
      case "financial":
        return DollarSign
      case "operational":
        return Users
      case "analytics":
        return BarChart3
      default:
        return FileText
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "performance":
        return "from-blue-500 to-blue-600"
      case "financial":
        return "from-green-500 to-green-600"
      case "operational":
        return "from-purple-500 to-purple-600"
      case "analytics":
        return "from-orange-500 to-orange-600"
      default:
        return "from-gray-500 to-gray-600"
    }
  }

  const getCategoryBg = (category: string) => {
    switch (category) {
      case "performance":
        return "from-blue-50 to-indigo-50"
      case "financial":
        return "from-green-50 to-emerald-50"
      case "operational":
        return "from-purple-50 to-pink-50"
      case "analytics":
        return "from-orange-50 to-amber-50"
      default:
        return "from-gray-50 to-gray-100"
    }
  }

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "performance":
        return "Performance"
      case "financial":
        return "Financeiro"
      case "operational":
        return "Operacional"
      case "analytics":
        return "Analytics"
      default:
        return "Outro"
    }
  }

  const performanceCount = reports.filter((r) => r.category === "performance").length
  const financialCount = reports.filter((r) => r.category === "financial").length
  const operationalCount = reports.filter((r) => r.category === "operational").length
  const analyticsCount = reports.filter((r) => r.category === "analytics").length

  return (
    <div className="min-h-screen p-6 px-0 py-0 bg-slate-200">
      <div className="max-w-7xl bg-slate-200 mx-0 my-0 px-0 py-0 space-y-6">
        <PageHeader
          title="Relatórios"
          description="Análise detalhada de dados dos seus projetos"
          actions={
            <div className="flex items-center gap-3">
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filtros
              </Button>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Configurações
              </Button>
              <Button
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                onClick={() => setNewReportDialog(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo Relatório
              </Button>
            </div>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Performance</h3>
                    <p className="text-sm text-white/80">{performanceCount} relatórios</p>
                  </div>
                </div>
              </CardContent>
            </div>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 h-full">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <DollarSign className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Financeiro</h3>
                    <p className="text-sm text-white/80">{financialCount} relatórios</p>
                  </div>
                </div>
              </CardContent>
            </div>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-full">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Operacional</h3>
                    <p className="text-sm text-white/80">{operationalCount} relatórios</p>
                  </div>
                </div>
              </CardContent>
            </div>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 h-full">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <BarChart3 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Analytics</h3>
                    <p className="text-sm text-white/80">{analyticsCount} relatórios</p>
                  </div>
                </div>
              </CardContent>
            </div>
          </Card>
        </div>

        <Card className="shadow-lg border-0 bg-white">
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Relatórios Disponíveis
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reports.length > 0 ? (
              <div className="space-y-4">
                {reports.map((report) => {
                  const Icon = getCategoryIcon(report.category)
                  return (
                    <div
                      key={report.id}
                      className={`p-4 border rounded-lg hover:shadow-md transition-all bg-gradient-to-r ${getCategoryBg(report.category)}`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`bg-gradient-to-r ${getCategoryColor(report.category)} p-2 rounded-lg`}>
                              <Icon className="h-4 w-4 text-white" />
                            </div>
                            <h3 className="font-semibold text-lg">{report.title}</h3>
                            <Badge variant="outline">{getCategoryLabel(report.category)}</Badge>
                            <Badge
                              className={
                                report.status === "ready"
                                  ? "bg-green-500 text-white"
                                  : report.status === "generating"
                                    ? "bg-yellow-500 text-white"
                                    : "bg-blue-500 text-white"
                              }
                            >
                              {report.status === "ready"
                                ? "Pronto"
                                : report.status === "generating"
                                  ? "Gerando"
                                  : "Agendado"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              Período: {report.period}
                            </span>
                            <span>•</span>
                            <span>Criado em: {new Date(report.createdDate).toLocaleDateString("pt-BR")}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewReport(report)}
                          disabled={report.status !== "ready"}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Visualizar
                        </Button>
                        <Button
                          size="sm"
                          className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
                          onClick={() => handleDownloadReport(report)}
                          disabled={report.status !== "ready"}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Baixar PDF
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum relatório disponível</p>
                <p className="text-sm">Crie seu primeiro relatório para começar</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={newReportDialog} onOpenChange={setNewReportDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Criar Novo Relatório</DialogTitle>
              <DialogDescription>Selecione o tipo e período do relatório que deseja gerar</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Tipo de Relatório</Label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="performance">Performance</SelectItem>
                    <SelectItem value="financial">Financeiro</SelectItem>
                    <SelectItem value="operational">Operacional</SelectItem>
                    <SelectItem value="analytics">Analytics</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Período</Label>
                <Select value={reportPeriod} onValueChange={setReportPeriod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last-week">Última Semana</SelectItem>
                    <SelectItem value="last-month">Último Mês</SelectItem>
                    <SelectItem value="last-quarter">Último Trimestre</SelectItem>
                    <SelectItem value="last-year">Último Ano</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNewReportDialog(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleCreateReport}
                disabled={!reportType || !reportPeriod}
                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
              >
                Gerar Relatório
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
