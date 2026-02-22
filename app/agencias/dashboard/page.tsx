
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/page-header"
import { Users, DollarSign, Award, Briefcase, CreditCard, Crown, TrendingUp } from "lucide-react"

const agencyStats = [
  {
    title: "MRR Atual",
    value: "R$ 3.2k",
    subtitle: "Receita recorrente",
    change: "+18% vs. mês anterior",
    icon: DollarSign,
    color: "bg-green-500",
    textColor: "text-white",
  },
  {
    title: "Agências Lideradas",
    value: "8",
    subtitle: "Sob sua gestão",
    change: "5% comissão cada",
    icon: Users,
    color: "bg-blue-500",
    textColor: "text-white",
  },
  {
    title: "Projetos Premium",
    value: "12",
    subtitle: "30% comissão",
    change: "+25% vs. mês anterior",
    icon: Briefcase,
    color: "bg-purple-500",
    textColor: "text-white",
  },
  {
    title: "Nível Atual",
    value: "Gold",
    subtitle: "Programa Partner",
    change: "Próximo: Platinum",
    icon: Award,
    color: "bg-yellow-500",
    textColor: "text-white",
  },
]

const partnershipLevels = [
  {
    name: "Bronze",
    mrrRange: "Nível inicial",
    agenciasLideradas: "-",
    mrrLideradas: "-",
    beneficios: "Projetos básicos",
    status: "completed",
  },
  {
    name: "Silver",
    mrrRange: "R$ 1.001 - R$ 2.000",
    agenciasLideradas: "5",
    mrrLideradas: "R$ 2.500",
    beneficios: "Produtos premium até R$ 1.500",
    status: "completed",
  },
  {
    name: "Gold",
    mrrRange: "R$ 2.001 - R$ 4.000",
    agenciasLideradas: "10",
    mrrLideradas: "R$ 5.000",
    beneficios: "Produtos premium até R$ 3.000",
    status: "current",
  },
  {
    name: "Platinum",
    mrrRange: "R$ 4.001 - R$ 8.000",
    agenciasLideradas: "20",
    mrrLideradas: "R$ 10.000",
    beneficios: "Produtos premium até R$ 5.000",
    status: "next",
  },
  {
    name: "Diamond",
    mrrRange: "Acima de R$ 8.000",
    agenciasLideradas: "40",
    mrrLideradas: "R$ 15.000",
    beneficios: "Premium acima R$ 5.000 + Squad",
    status: "locked",
  },
]

const creditPlans = [
  { id: "lite",       value: "R$ 300",   name: "Lite",       discount: "—",   status: "available" },
  { id: "start",      value: "R$ 500",   name: "Start",      discount: "5%",  status: "available" },
  { id: "standard",   value: "R$ 1.000", name: "Standard",   discount: "10%", status: "available" },
  { id: "growth",     value: "R$ 1.500", name: "Growth",     discount: "15%", status: "current" },
  { id: "scale",      value: "R$ 3.000", name: "Scale",      discount: "20%", status: "available" },
  { id: "squad",      value: "R$ 5.000", name: "Squad",      discount: "20%", status: "available" },
  { id: "enterprise", value: "R$ 5.000", name: "Enterprise",  discount: "—",   status: "available" },
]

export default function AgenciasDashboardPage() {
  return (
    <div className="min-h-screen bg-slate-200 px-0 py-0">
      <div className="max-w-7xl mx-auto bg-slate-200 space-y-6 px-0 py-0">
        <PageHeader
          title="Dashboard Agência Partner"
          description="Escale suas operações com privilégios exclusivos do programa Partner."
          actions={
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                <Crown className="h-4 w-4 mr-1" />
                Partner Gold
              </Badge>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <CreditCard className="h-4 w-4 mr-1" />
                Plano R$ 1.000 (15% OFF)
              </Badge>
            </div>
          }
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {agencyStats.map((stat, index) => (
            <Card key={index} className={`${stat.color} ${stat.textColor} border-0`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium opacity-90">{stat.title}</p>
                    <p className="text-3xl font-bold mt-2">{stat.value}</p>
                    <p className="text-sm opacity-75 mt-1">{stat.subtitle}</p>
                    <p className="text-xs opacity-75 mt-2">{stat.change}</p>
                  </div>
                  <div className="ml-4">
                    <stat.icon className="h-8 w-8 opacity-80" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Credit Plan & Partner Status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <CreditCard className="h-5 w-5 mr-2 text-blue-500" />
                Plano de Crédito Ativo
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {creditPlans.map((plan, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border-2 text-center ${
                      plan.status === "current" ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-gray-50"
                    }`}
                  >
                    <p className="font-bold text-base text-gray-900">{plan.name}</p>
                    <p className="font-semibold text-sm text-blue-600">{plan.value}/mês</p>
                    <p className="text-xs text-gray-600 mt-1">{plan.discount !== "—" ? `${plan.discount} desconto` : "Sem desconto"}</p>
                    {plan.status === "current" && <Badge className="bg-blue-500 text-white mt-2">Ativo</Badge>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Crown className="h-5 w-5 mr-2 text-yellow-500" />
                Benefícios Partner
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-sm font-medium">Projetos Premium</span>
                  <Badge className="bg-green-500 text-white">30% Comissão</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm font-medium">Gestão de Agências</span>
                  <Badge className="bg-blue-500 text-white">5% Comissão</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <span className="text-sm font-medium">Treinamento Exclusivo</span>
                  <Badge className="bg-purple-500 text-white">Incluído</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Partnership Gamification Levels */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-yellow-500" />
              Níveis de Gamificação - Programa Partner
            </h3>
            <div className="space-y-4">
              {partnershipLevels.map((level, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-2 ${
                    level.status === "current"
                      ? "border-yellow-400 bg-yellow-50"
                      : level.status === "completed"
                        ? "border-green-400 bg-green-50"
                        : level.status === "next"
                          ? "border-blue-400 bg-blue-50"
                          : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-lg">{level.name}</h4>
                      {level.status === "current" && <Badge className="bg-yellow-500 text-white">Atual</Badge>}
                      {level.status === "completed" && <Badge className="bg-green-500 text-white">✓</Badge>}
                      {level.status === "next" && <Badge className="bg-blue-500 text-white">Próximo</Badge>}
                      {level.status === "locked" && <Badge variant="outline">Bloqueado</Badge>}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-gray-700">MRR da Agência</p>
                      <p className="text-gray-600">{level.mrrRange}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Agências Lideradas</p>
                      <p className="text-gray-600">{level.agenciasLideradas}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">MRR das Lideradas</p>
                      <p className="text-gray-600">{level.mrrLideradas}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Benefícios</p>
                      <p className="text-gray-600">{level.beneficios}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Progresso para Platinum:</strong> Você precisa aumentar seu MRR para R$ 4.001+ e liderar 20
                agências com MRR total de R$ 10.000 para alcançar o próximo nível.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Projetos Premium Recentes</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">Campanha Nacional - MegaCorp</h4>
                      <p className="text-sm text-gray-600">Projeto Premium • Comissão: 30%</p>
                      <div className="flex items-center mt-2">
                        <div className="w-full bg-gray-200 rounded-full h-2 mr-3">
                          <div className="bg-green-600 h-2 rounded-full" style={{ width: "95%" }}></div>
                        </div>
                        <span className="text-sm font-medium text-green-600">95%</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-green-500 text-white">Finalizando</Badge>
                      <p className="text-sm text-gray-600 mt-1">R$ 15k comissão</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">Rebranding Completo - TechStart</h4>
                      <p className="text-sm text-gray-600">Projeto Premium • Comissão: 30%</p>
                      <div className="flex items-center mt-2">
                        <div className="w-full bg-gray-200 rounded-full h-2 mr-3">
                          <div className="bg-blue-600 h-2 rounded-full" style={{ width: "70%" }}></div>
                        </div>
                        <span className="text-sm font-medium text-blue-600">70%</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-blue-500 text-white">Em Progresso</Badge>
                      <p className="text-sm text-gray-600 mt-1">R$ 9k comissão</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          <div>
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Agências Lideradas</h3>
                <div className="space-y-3">
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-sm text-green-800">Digital Solutions</p>
                      <Badge className="bg-green-500 text-white text-xs">Ativa</Badge>
                    </div>
                    <p className="text-sm text-green-700">MRR: R$ 850</p>
                    <p className="text-xs text-green-600 mt-1">Sua comissão: R$ 42,50/mês</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-sm text-blue-800">Creative Hub</p>
                      <Badge className="bg-blue-500 text-white text-xs">Ativa</Badge>
                    </div>
                    <p className="text-sm text-blue-700">MRR: R$ 1.200</p>
                    <p className="text-xs text-blue-600 mt-1">Sua comissão: R$ 60/mês</p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-sm text-purple-800">Growth Marketing</p>
                      <Badge className="bg-purple-500 text-white text-xs">Ativa</Badge>
                    </div>
                    <p className="text-sm text-purple-700">MRR: R$ 950</p>
                    <p className="text-xs text-purple-600 mt-1">Sua comissão: R$ 47,50/mês</p>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium">Total de Comissões</p>
                  <p className="text-lg font-bold text-green-600">R$ 150/mês</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
