// @ts-nocheck
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import {
  FileText,
  Download,
  Play,
  Plus,
  BarChart3,
  TrendingUp,
  DollarSign,
  Users,
  Calendar,
  Settings,
  Eye,
  Edit,
} from "lucide-react"
import type { ReportTemplate, ReportExecution } from "@/types/reports"

const reportCategories = [
  { value: "performance", label: "Performance", icon: TrendingUp, color: "bg-blue-500" },
  { value: "financial", label: "Financeiro", icon: DollarSign, color: "bg-green-500" },
  { value: "operational", label: "Operacional", icon: Users, color: "bg-purple-500" },
  { value: "analytics", label: "Analytics", icon: BarChart3, color: "bg-orange-500" },
]

const standardReports: ReportTemplate[] = [
  {
    id: "agency_performance",
    name: "Relatório de Performance de Agências",
    description: "Análise detalhada da performance das agências parceiras",
    category: "performance",
    type: "standard",
    columns: [
      { id: "agency_name", name: "Agência", field: "agency_name", type: "text", sortable: true, filterable: true },
      {
        id: "projects_count",
        name: "Projetos",
        field: "projects_count",
        type: "number",
        sortable: true,
        filterable: false,
        aggregation: "sum",
      },
      {
        id: "revenue",
        name: "Receita",
        field: "revenue",
        type: "currency",
        sortable: true,
        filterable: false,
        aggregation: "sum",
      },
      {
        id: "completion_rate",
        name: "Taxa de Conclusão",
        field: "completion_rate",
        type: "percentage",
        sortable: true,
        filterable: false,
        aggregation: "avg",
      },
    ],
    filters: [
      { id: "date_range", name: "Período", field: "date_range", type: "date_range", required: true },
      {
        id: "agency_level",
        name: "Nível da Agência",
        field: "agency_level",
        type: "select",
        options: [
          { value: "basic", label: "Básico" },
          { value: "partner", label: "Partner" },
          { value: "premium", label: "Premium" },
        ],
        required: false,
      },
    ],
    charts: [
      {
        id: "revenue_chart",
        type: "bar",
        title: "Receita por Agência",
        x_axis: "agency_name",
        y_axis: "revenue",
        data_source: "main",
        config: {},
      },
    ],
    export_formats: ["excel", "pdf", "csv"],
    access_levels: ["admin", "comercial"],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "sales_billing",
    name: "Relatório de Vendas e Faturamento",
    description: "Análise de vendas, receitas e faturamento da plataforma",
    category: "financial",
    type: "standard",
    columns: [
      { id: "period", name: "Período", field: "period", type: "date", sortable: true, filterable: true },
      {
        id: "total_sales",
        name: "Vendas Totais",
        field: "total_sales",
        type: "currency",
        sortable: true,
        filterable: false,
        aggregation: "sum",
      },
      {
        id: "recurring_revenue",
        name: "Receita Recorrente",
        field: "recurring_revenue",
        type: "currency",
        sortable: true,
        filterable: false,
        aggregation: "sum",
      },
      {
        id: "new_customers",
        name: "Novos Clientes",
        field: "new_customers",
        type: "number",
        sortable: true,
        filterable: false,
        aggregation: "sum",
      },
    ],
    filters: [
      { id: "date_range", name: "Período", field: "date_range", type: "date_range", required: true },
      {
        id: "customer_type",
        name: "Tipo de Cliente",
        field: "customer_type",
        type: "multiselect",
        options: [
          { value: "empresas", label: "Empresas" },
          { value: "agencias", label: "Agências" },
        ],
        required: false,
      },
    ],
    charts: [
      {
        id: "sales_trend",
        type: "line",
        title: "Tendência de Vendas",
        x_axis: "period",
        y_axis: "total_sales",
        data_source: "main",
        config: {},
      },
    ],
    export_formats: ["excel", "pdf"],
    access_levels: ["admin", "financeiro"],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportTemplate[]>(standardReports)
  const [executions, setExecutions] = useState<ReportExecution[]>([])
  const [selectedReport, setSelectedReport] = useState<ReportTemplate | null>(null)
  const [showExecuteDialog, setShowExecuteDialog] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<Record<string, any>>({})

  useEffect(() => {
    loadReportExecutions()
  }, [])

  const loadReportExecutions = async () => {
    try {
      // Simulated data - replace with actual API call
      const mockExecutions: ReportExecution[] = [
        {
          id: "1",
          template_id: "agency_performance",
          name: "Performance Agências - Janeiro 2024",
          filters: { date_range: { from: "2024-01-01", to: "2024-01-31" } },
          status: "completed",
          executed_by: "admin",
          executed_at: "2024-01-31T10:00:00Z",
          completed_at: "2024-01-31T10:02:00Z",
          file_url: "/reports/agency_performance_jan2024.xlsx",
        },
      ]
      setExecutions(mockExecutions)
    } catch (error) {
      console.error("Error loading report executions:", error)
    }
  }

  const handleExecuteReport = async () => {
    if (!selectedReport) return

    setLoading(true)
    try {
      const execution: ReportExecution = {
        id: `exec_${Date.now()}`,
        template_id: selectedReport.id,
        name: `${selectedReport.name} - ${new Date().toLocaleDateString()}`,
        filters,
        status: "running",
        executed_by: "current_user",
        executed_at: new Date().toISOString(),
      }

      setExecutions((prev) => [execution, ...prev])
      setShowExecuteDialog(false)
      setFilters({})

      // Simulate report execution
      setTimeout(() => {
        setExecutions((prev) =>
          prev.map((exec) =>
            exec.id === execution.id
              ? {
                  ...exec,
                  status: "completed",
                  completed_at: new Date().toISOString(),
                  file_url: `/reports/${selectedReport.id}_${Date.now()}.xlsx`,
                }
              : exec,
          ),
        )
      }, 3000)
    } catch (error) {
      console.error("Error executing report:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: ReportExecution["status"]) => {
    const statusConfig = {
      pending: { color: "bg-gray-500", label: "Pendente" },
      running: { color: "bg-blue-500", label: "Executando" },
      completed: { color: "bg-green-500", label: "Concluído" },
      failed: { color: "bg-red-500", label: "Falhou" },
    }

    const config = statusConfig[status]
    return <Badge className={`${config.color} text-white`}>{config.label}</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Relatórios</h1>
          <p className="text-gray-600 mt-1">Análise detalhada de dados da plataforma</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Configurações
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Criar Relatório
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Criar Novo Relatório</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-gray-600">
                  Funcionalidade de criação de relatórios personalizados em desenvolvimento.
                </p>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList>
          <TabsTrigger value="templates">Modelos de Relatório</TabsTrigger>
          <TabsTrigger value="executions">Execuções</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-6">
          {/* Report Categories */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {reportCategories.map((category) => {
              const categoryReports = reports.filter((r) => r.category === category.value)
              return (
                <Card key={category.value} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className={`p-2 ${category.color} rounded-lg`}>
                        <category.icon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{category.label}</h3>
                        <p className="text-sm text-gray-600">{categoryReports.length} relatórios</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Standard Reports */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Relatórios Padrão
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reports
                  .filter((r) => r.type === "standard")
                  .map((report) => (
                    <Card key={report.id} className="border border-gray-200">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h4 className="font-semibold">{report.name}</h4>
                              <Badge
                                variant="outline"
                                className={
                                  reportCategories
                                    .find((c) => c.value === report.category)
                                    ?.color.replace("bg-", "text-") + " border-current"
                                }
                              >
                                {reportCategories.find((c) => c.value === report.category)?.label}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-3">{report.description}</p>
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span>{report.columns.length} colunas</span>
                              <span>{report.filters.length} filtros</span>
                              <span>{report.charts.length} gráficos</span>
                              <span>Exporta: {report.export_formats.join(", ")}</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedReport(report)
                                setShowExecuteDialog(true)
                              }}
                            >
                              <Play className="h-4 w-4 mr-1" />
                              Executar
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="executions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Histórico de Execuções
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {executions.map((execution) => (
                  <Card key={execution.id} className="border border-gray-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="font-semibold">{execution.name}</h4>
                            {getStatusBadge(execution.status)}
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span>Executado por: {execution.executed_by}</span>
                            <span>Em: {new Date(execution.executed_at).toLocaleString()}</span>
                            {execution.completed_at && (
                              <span>Concluído: {new Date(execution.completed_at).toLocaleString()}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {execution.status === "completed" && execution.file_url && (
                            <Button variant="outline" size="sm">
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </Button>
                          )}
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {executions.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma execução de relatório encontrada</p>
                    <p className="text-sm">Execute um relatório para ver o histórico aqui</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Execute Report Dialog */}
      <Dialog open={showExecuteDialog} onOpenChange={setShowExecuteDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Executar Relatório</DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">{selectedReport.name}</h4>
                <p className="text-sm text-gray-600">{selectedReport.description}</p>
              </div>

              <div className="space-y-4">
                <h5 className="font-medium">Filtros</h5>
                {selectedReport.filters.map((filter) => (
                  <div key={filter.id}>
                    <Label htmlFor={filter.id}>{filter.name}</Label>
                    {filter.type === "date_range" && (
                      <DatePickerWithRange
                        value={filters[filter.id]}
                        onChange={(value) => setFilters((prev) => ({ ...prev, [filter.id]: value }))}
                      />
                    )}
                    {filter.type === "select" && (
                      <Select
                        value={filters[filter.id]}
                        onValueChange={(value) => setFilters((prev) => ({ ...prev, [filter.id]: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {filter.options?.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowExecuteDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleExecuteReport} disabled={loading}>
                  {loading ? "Executando..." : "Executar Relatório"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
