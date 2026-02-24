
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Building2,
  TrendingUp,
  Users,
  DollarSign,
  Clock,
  CheckCircle,
  Eye,
  ShoppingCart,
  CreditCard,
  FileText,
  Download,
  Filter,
  Calendar,
} from "lucide-react"
import { useAccountType } from "@/contexts/account-type-context"
import { useState } from "react"
import { useNavigate } from "react-router-dom"

const companyStats = [
  {
    title: "Campanhas Ativas",
    value: "12",
    subtitle: "Em andamento",
    change: "+18% vs. mês anterior",
    icon: TrendingUp,
    color: "bg-blue-500",
    textColor: "text-white",
  },
  {
    title: "ROI Médio",
    value: "340%",
    subtitle: "Este trimestre",
    change: "+25% vs. trimestre anterior",
    icon: DollarSign,
    color: "bg-green-500",
    textColor: "text-white",
  },
  {
    title: "Leads Gerados",
    value: "1.2k",
    subtitle: "Este mês",
    change: "+32% vs. mês anterior",
    icon: Users,
    color: "bg-purple-500",
    textColor: "text-white",
  },
  {
    title: "Projetos Concluídos",
    value: "8",
    subtitle: "Este mês",
    change: "+12% vs. mês anterior",
    icon: CheckCircle,
    color: "bg-orange-500",
    textColor: "text-white",
  },
]

const inHouseStats = [
  {
    title: "Serviços Contratados",
    value: "6",
    subtitle: "Este mês",
    change: "+20% vs. mês anterior",
    icon: Building2,
    color: "bg-indigo-500",
    textColor: "text-white",
  },
  {
    title: "Economia Gerada",
    value: "R$ 28k",
    subtitle: "vs. agência tradicional",
    change: "+15% vs. mês anterior",
    icon: DollarSign,
    color: "bg-green-500",
    textColor: "text-white",
  },
  {
    title: "Especialistas Ativos",
    value: "4",
    subtitle: "Trabalhando",
    change: "+33% vs. mês anterior",
    icon: Users,
    color: "bg-blue-500",
    textColor: "text-white",
  },
  {
    title: "Tempo Médio",
    value: "3.2 dias",
    subtitle: "Para entrega",
    change: "-18% vs. mês anterior",
    icon: Clock,
    color: "bg-purple-500",
    textColor: "text-white",
  },
]

export function EmpresasDashboard() {
  const { accountSubType } = useAccountType()
  const navigate = useNavigate()
  const [exportingReport, setExportingReport] = useState(false)

  const stats = accountSubType === "in-house" ? inHouseStats : companyStats
  const dashboardTitle = accountSubType === "in-house" ? "Dashboard In-House" : "Dashboard Company"
  const dashboardSubtitle =
    accountSubType === "in-house"
      ? "Gerencie seus serviços pontuais e equipe interna com acesso completo à plataforma."
      : "Acompanhe suas campanhas e resultados. Sua agência parceira gerencia a estratégia."

  const handleExportReport = async () => {
    setExportingReport(true)
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setExportingReport(false)
    alert("Relatório exportado com sucesso!")
  }

  const handleViewProject = (projectName: string) => {
    navigate("/company/projetos")
  }

  const handleApproveProject = (projectName: string) => {
    alert(`Projeto "${projectName}" aprovado com sucesso!`)
  }

  const handleViewService = (serviceName: string) => {
    alert(`Visualizando detalhes do serviço: ${serviceName}`)
  }

  const handleReviewApprovals = () => {
    navigate("/company/aprovacoes")
  }

  const handleViewHistory = () => {
    navigate("/company/aprovacoes")
  }

  const handleViewExtracts = () => {
    navigate("/company/pagamentos")
  }

  const handleViewAllServices = () => {
    alert("Navegando para catálogo completo de serviços...")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent text-2xl">
              {dashboardTitle}
            </h1>
            <Badge
              variant={accountSubType === "in-house" ? "default" : "secondary"}
              className="bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0"
            >
              {accountSubType === "in-house" ? "Independente" : "Dependente"}
            </Badge>
          </div>
          <p className="text-gray-600 mt-1">{dashboardSubtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate("/company/relatorios")}>
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
          <Button
            onClick={handleExportReport}
            disabled={exportingReport}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <Download className="h-4 w-4 mr-2" />
            {exportingReport ? "Exportando..." : "Exportar Relatório"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card
            key={index}
            className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer group"
          >
            <div className={`${stat.color} h-full`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white/90">{stat.title}</p>
                    <p className="text-3xl font-bold mt-2 text-white">{stat.value}</p>
                    <p className="text-sm text-white/75 mt-1">{stat.subtitle}</p>
                    <p className="text-xs text-white/75 mt-2 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {stat.change}
                    </p>
                  </div>
                  <div className="ml-4 bg-white/20 p-3 rounded-lg">
                    <stat.icon className="h-8 w-8 text-white" />
                  </div>
                </div>
              </CardContent>
            </div>
          </Card>
        ))}
      </div>

      {accountSubType === "company" && (
        <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="bg-orange-100 p-2 rounded-lg">
                <Eye className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h3 className="font-medium text-orange-800">Acesso Limitado</h3>
                <p className="text-sm text-orange-700">
                  Sua agência parceira gerencia o catálogo de produtos e estratégia. Você tem acesso a acompanhamento,
                  aprovações e pagamentos.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="shadow-lg border-0 bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  {accountSubType === "in-house" ? "Serviços Recentes" : "Projetos Ativos"}
                </h3>
                <Button variant="outline" size="sm" onClick={() => navigate("/company/projetos")}>
                  Ver Todos
                </Button>
              </div>
              <div className="space-y-4">
                {accountSubType === "in-house" ? (
                  <>
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100 hover:shadow-md transition-shadow">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">Design de Landing Page</h4>
                          <Badge variant="outline" className="bg-white">
                            R$ 2.500
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">Especialista: Maria Silva</p>
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full"
                            style={{ width: "80%" }}
                          ></div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-blue-600">80% Concluído</span>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewService("Design de Landing Page")}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Ver Detalhes
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-100 hover:shadow-md transition-shadow">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">Otimização SEO</h4>
                          <Badge variant="outline" className="bg-white">
                            R$ 1.800
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">Especialista: João Santos</p>
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                          <div
                            className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full"
                            style={{ width: "100%" }}
                          ></div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-green-600 flex items-center gap-1">
                            <CheckCircle className="h-4 w-4" />
                            Concluído
                          </span>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleViewService("Otimização SEO")}>
                              <FileText className="h-3 w-3 mr-1" />
                              Relatório
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-100 hover:shadow-md transition-shadow">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">Campanha Black Friday</h4>
                          <Badge className="bg-yellow-500 text-white">Aguardando Aprovação</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">Agência: TechCorp Marketing</p>
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                          <div
                            className="bg-gradient-to-r from-yellow-500 to-orange-500 h-2 rounded-full"
                            style={{ width: "75%" }}
                          ></div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewProject("Campanha Black Friday")}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Visualizar
                          </Button>
                          <Button
                            size="sm"
                            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                            onClick={() => handleApproveProject("Campanha Black Friday")}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Aprovar
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100 hover:shadow-md transition-shadow">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">Rebranding Completo</h4>
                          <Badge variant="secondary">Em Desenvolvimento</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">Agência: Creative Partners</p>
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                            style={{ width: "45%" }}
                          ></div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleViewProject("Rebranding Completo")}>
                            <Eye className="h-4 w-4 mr-1" />
                            Acompanhar
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => navigate("/company/relatorios")}>
                            <Calendar className="h-4 w-4 mr-1" />
                            Timeline
                          </Button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {accountSubType === "in-house" ? (
            <>
              <Card className="shadow-lg border-0 bg-white">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-2 rounded-lg mr-2">
                      <ShoppingCart className="h-5 w-5 text-white" />
                    </div>
                    Catálogo de Serviços
                  </h3>
                  <div className="space-y-3">
                    <div className="p-3 border rounded-lg hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 cursor-pointer transition-all hover:shadow-md group">
                      <h4 className="font-medium text-sm group-hover:text-blue-600 transition-colors">
                        Design & Criação
                      </h4>
                      <p className="text-xs text-gray-500">Landing pages, banners, identidade visual</p>
                      <p className="text-sm font-medium text-green-600 mt-1">A partir de R$ 800</p>
                    </div>
                    <div className="p-3 border rounded-lg hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 cursor-pointer transition-all hover:shadow-md group">
                      <h4 className="font-medium text-sm group-hover:text-blue-600 transition-colors">
                        Marketing Digital
                      </h4>
                      <p className="text-xs text-gray-500">SEO, Google Ads, redes sociais</p>
                      <p className="text-sm font-medium text-green-600 mt-1">A partir de R$ 1.200</p>
                    </div>
                    <div className="p-3 border rounded-lg hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 cursor-pointer transition-all hover:shadow-md group">
                      <h4 className="font-medium text-sm group-hover:text-blue-600 transition-colors">
                        Desenvolvimento
                      </h4>
                      <p className="text-xs text-gray-500">Sites, apps, integrações</p>
                      <p className="text-sm font-medium text-green-600 mt-1">A partir de R$ 2.500</p>
                    </div>
                  </div>
                  <Button
                    className="w-full mt-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    onClick={handleViewAllServices}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Ver Todos os Serviços
                  </Button>
                </CardContent>
              </Card>
              <Card className="shadow-lg border-0 bg-white">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Próximos Serviços</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-red-50 to-pink-50 rounded-lg border border-red-100">
                      <div>
                        <p className="font-medium text-sm">Análise de Concorrência</p>
                        <p className="text-xs text-gray-500">Por: Ana Costa</p>
                      </div>
                      <span className="text-xs bg-red-500 text-white px-2 py-1 rounded font-medium">2024-01-15</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg border border-yellow-100">
                      <div>
                        <p className="font-medium text-sm">Criação de Conteúdo</p>
                        <p className="text-xs text-gray-500">Por: Carlos Lima</p>
                      </div>
                      <span className="text-xs bg-yellow-500 text-white px-2 py-1 rounded font-medium">2024-01-18</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <Card className="shadow-lg border-0 bg-white">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-2 rounded-lg mr-2">
                      <CheckCircle className="h-5 w-5 text-white" />
                    </div>
                    Sistema de Aprovação
                  </h3>
                  <div className="space-y-3">
                    <div className="p-3 bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">3 itens aguardando</p>
                          <p className="text-xs text-gray-600">Campanhas e materiais</p>
                        </div>
                        <Button
                          size="sm"
                          className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white"
                          onClick={handleReviewApprovals}
                        >
                          Revisar
                        </Button>
                      </div>
                    </div>
                    <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">5 itens aprovados</p>
                          <p className="text-xs text-gray-600">Esta semana</p>
                        </div>
                        <Button size="sm" variant="outline" onClick={handleViewHistory}>
                          Ver Histórico
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-lg border-0 bg-white">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-2 rounded-lg mr-2">
                      <CreditCard className="h-5 w-5 text-white" />
                    </div>
                    Pagamentos
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                      <div>
                        <p className="font-medium text-sm">Próximo Pagamento</p>
                        <p className="text-xs text-gray-500">TechCorp Marketing</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-sm">R$ 8.500</p>
                        <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded font-medium">15/01</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-100">
                      <div>
                        <p className="font-medium text-sm">Último Pagamento</p>
                        <p className="text-xs text-gray-500">Creative Partners</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-sm">R$ 12.300</p>
                        <span className="text-xs bg-green-500 text-white px-2 py-1 rounded font-medium">Pago</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full mt-4 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 bg-transparent"
                    onClick={handleViewExtracts}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Ver Extratos
                  </Button>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
