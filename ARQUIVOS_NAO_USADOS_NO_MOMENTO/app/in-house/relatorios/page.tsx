
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/page-header" // Fixed import path from ui/page-header to page-header
import {
  FileText,
  Plus,
  BarChart3,
  TrendingUp,
  DollarSign,
  Users,
  Settings,
  Download,
  Calendar,
  Filter,
  Eye,
  Clock,
} from "lucide-react"
import { useState } from "react"

export default function InHouseRelatoriosPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("month")

  const reportCategories = [
    {
      title: "Performance",
      count: 3,
      icon: TrendingUp,
      color: "bg-blue-500",
      reports: ["Análise de Produtividade", "Métricas de Qualidade", "Tempo de Entrega"],
    },
    {
      title: "Financeiro",
      count: 2,
      icon: DollarSign,
      color: "bg-green-500",
      reports: ["Custos por Projeto", "ROI de Serviços"],
    },
    {
      title: "Operacional",
      count: 4,
      icon: Users,
      color: "bg-purple-500",
      reports: ["Utilização de Equipe", "Distribuição de Tarefas", "Capacidade", "Eficiência"],
    },
    {
      title: "Analytics",
      count: 5,
      icon: BarChart3,
      color: "bg-orange-500",
      reports: ["Dashboard Executivo", "KPIs Mensais", "Comparativo Trimestral", "Tendências", "Previsões"],
    },
  ]

  const recentReports = [
    {
      name: "Relatório Mensal - Dezembro 2024",
      type: "Performance",
      date: "2024-12-31",
      size: "2.4 MB",
      status: "Concluído",
    },
    {
      name: "Análise de Custos Q4 2024",
      type: "Financeiro",
      date: "2024-12-28",
      size: "1.8 MB",
      status: "Concluído",
    },
    {
      name: "Dashboard Executivo - Anual",
      type: "Analytics",
      date: "2024-12-20",
      size: "3.2 MB",
      status: "Concluído",
    },
  ]

  const quickStats = [
    { label: "Relatórios Gerados", value: "24", change: "+12%", icon: FileText },
    { label: "Tempo Médio", value: "2.3h", change: "-8%", icon: Clock },
    { label: "Exportações", value: "156", change: "+24%", icon: Download },
    { label: "Visualizações", value: "892", change: "+18%", icon: Eye },
  ]

  return (
    <div className="min-h-screen bg-slate-200 px-0 py-0">
      <div className="max-w-7xl mx-auto bg-slate-200 px-0 py-0 space-y-6">
        <div className="px-0">
          <PageHeader
            title="Relatórios"
            description="Análise detalhada de dados dos seus projetos e operações"
            actions={
              <div className="flex items-center gap-3">
                <Button variant="outline" className="bg-white hover:bg-gray-50">
                  <Settings className="h-4 w-4 mr-2" />
                  Configurações
                </Button>
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Relatório
                </Button>
              </div>
            }
          />
        </div>

        <div className="space-y-6 px-0">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickStats.map((stat, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                      <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                      <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {stat.change} vs. mês anterior
                      </p>
                    </div>
                    <div className="bg-blue-100 p-3 rounded-lg">
                      <stat.icon className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Report Categories */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {reportCategories.map((category, index) => (
              <Card
                key={index}
                className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group bg-white"
              >
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className={`${category.color} p-3 rounded-lg group-hover:scale-110 transition-transform`}>
                      <category.icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{category.title}</h3>
                      <p className="text-sm text-gray-600">{category.count} relatórios</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {category.reports.slice(0, 3).map((report, idx) => (
                      <p key={idx} className="text-xs text-gray-500">
                        • {report}
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters and Period Selector */}
          <Card className="border-0 shadow-lg bg-white">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">Filtrar por período:</span>
                  <div className="flex gap-2">
                    {["week", "month", "quarter", "year"].map((period) => (
                      <Button
                        key={period}
                        variant={selectedPeriod === period ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedPeriod(period)}
                        className={
                          selectedPeriod === period
                            ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                            : "bg-white"
                        }
                      >
                        {period === "week" && "Semana"}
                        {period === "month" && "Mês"}
                        {period === "quarter" && "Trimestre"}
                        {period === "year" && "Ano"}
                      </Button>
                    ))}
                  </div>
                </div>
                <Button variant="outline" size="sm" className="bg-white hover:bg-gray-50">
                  <Calendar className="h-4 w-4 mr-2" />
                  Período Personalizado
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Reports */}
          <Card className="border-0 shadow-lg bg-white">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center text-xl">
                  <FileText className="h-5 w-5 mr-2 text-blue-600" />
                  Relatórios Recentes
                </CardTitle>
                <Button variant="outline" size="sm" className="bg-white hover:bg-gray-50">
                  Ver Todos
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentReports.map((report, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100 hover:shadow-md transition-all duration-300 cursor-pointer group"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="bg-white p-3 rounded-lg shadow-sm">
                        <FileText className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                          {report.name}
                        </h4>
                        <div className="flex items-center gap-3 mt-1">
                          <Badge variant="outline" className="text-xs bg-white">
                            {report.type}
                          </Badge>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(report.date).toLocaleDateString("pt-BR")}
                          </span>
                          <span className="text-xs text-gray-500">{report.size}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-gradient-to-r from-green-500 to-green-600 text-white">{report.status}</Badge>
                      <Button size="sm" variant="outline" className="bg-white hover:bg-gray-50">
                        <Eye className="h-4 w-4 mr-1" />
                        Visualizar
                      </Button>
                      <Button
                        size="sm"
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Baixar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Empty State for Custom Reports */}
          <Card className="border-0 shadow-lg bg-white">
            <CardHeader>
              <CardTitle className="flex items-center text-xl">
                <BarChart3 className="h-5 w-5 mr-2 text-purple-600" />
                Relatórios Personalizados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <div className="bg-gradient-to-r from-blue-100 to-purple-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-10 w-10 text-blue-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Crie relatórios personalizados</h3>
                <p className="text-gray-600 mb-4 max-w-md mx-auto">
                  Configure relatórios sob medida com as métricas e visualizações que você precisa para tomar decisões
                  estratégicas.
                </p>
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeiro Relatório
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
