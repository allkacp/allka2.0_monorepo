// @ts-nocheck
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, DollarSign, Star, Award, Clock, TrendingUp, Users, Calendar } from "lucide-react"
import { LeaderDashboard } from "./leader-dashboard"

const nomadeStats = [
  {
    title: "Tarefas Completadas",
    value: "45",
    subtitle: "Últimos 90 dias",
    change: "15 restantes para Gold",
    icon: CheckCircle,
    color: "bg-green-500",
    textColor: "text-white",
  },
  {
    title: "Ganhos Mensais",
    value: "R$ 6.8k",
    subtitle: "Faturamento atual",
    change: "+25% bônus Silver",
    icon: DollarSign,
    color: "bg-blue-500",
    textColor: "text-white",
  },
  {
    title: "Rating Médio",
    value: "4.2",
    subtitle: "Avaliação clientes",
    change: "Últimos 90 dias",
    icon: Star,
    color: "bg-yellow-500",
    textColor: "text-white",
  },
  {
    title: "Horas Semanais",
    value: "18h",
    subtitle: "Disponibilidade",
    change: "2h para Platinum",
    icon: Clock,
    color: "bg-purple-500",
    textColor: "text-white",
  },
]

const nomadeLevels = [
  {
    name: "Bronze",
    criteria: "Nível inicial",
    bonus: "Remuneração padrão",
    status: "completed",
    description: "Todos os nômades começam neste nível",
  },
  {
    name: "Silver",
    criteria: "30 tarefas/90 dias + nota 4.0",
    bonus: "+25% remuneração",
    status: "current",
    description: "Remuneração superior por tarefa",
  },
  {
    name: "Gold",
    criteria: "60 tarefas/90 dias + nota 4.5",
    bonus: "+50% remuneração + squads",
    status: "next",
    description: "Acesso a squads especiais",
  },
  {
    name: "Platinum",
    criteria: "Convite + 20h semanais + nota 4.5",
    bonus: "Remuneração mínima mensal",
    status: "locked",
    description: "Garantia de renda mensal",
  },
  {
    name: "Leader",
    criteria: "Convite + 24h semanais + nota 4.5",
    bonus: "Remuneração mínima + gestão",
    status: "locked",
    description: "Líder qualificador com funções de gestão",
  },
]

export function NomadesDashboard() {
  const currentLevel = "Silver" // This would come from user context/API
  const isLeader = currentLevel === "Leader"

  if (isLeader) {
    return <LeaderDashboard />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Nômade</h1>
          <p className="text-gray-600 mt-1">Gerencie suas tarefas e evolua no programa de níveis.</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            <Award className="h-4 w-4 mr-1" />
            Silver
          </Badge>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <DollarSign className="h-4 w-4 mr-1" />
            +25% Bônus
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {nomadeStats.map((stat, index) => (
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

      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-purple-500" />
            Programa de Níveis Nômades Allka
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {nomadeLevels.map((level, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-2 ${
                  level.status === "current"
                    ? "border-blue-400 bg-blue-50"
                    : level.status === "completed"
                      ? "border-green-400 bg-green-50"
                      : level.status === "next"
                        ? "border-orange-400 bg-orange-50"
                        : "border-gray-200 bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">{level.name}</h4>
                  {level.status === "current" && <Badge className="bg-blue-500 text-white">Atual</Badge>}
                  {level.status === "completed" && <Badge className="bg-green-500 text-white">✓</Badge>}
                  {level.status === "next" && <Badge className="bg-orange-500 text-white">Próximo</Badge>}
                  {level.status === "locked" && (
                    <Badge variant="outline" className="text-gray-500">
                      Bloqueado
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-gray-600 mb-2">{level.criteria}</p>
                <p className="text-sm font-medium text-gray-800 mb-2">{level.bonus}</p>
                <p className="text-xs text-gray-500">{level.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-800 mb-2">Progresso para Gold</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-blue-700">Tarefas (últimos 90 dias)</span>
                <span className="font-medium text-blue-800">45/60</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: "75%" }}></div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-700">Nota média</span>
                <span className="font-medium text-blue-800">4.2/4.5</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: "93%" }}></div>
              </div>
            </div>
            <p className="text-sm text-blue-700 mt-3">
              <strong>Para alcançar Gold:</strong> Complete mais 15 tarefas e mantenha nota média acima de 4.5 para
              desbloquear +50% de remuneração e acesso a squads especiais.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Users className="h-5 w-5 mr-2 text-green-500" />
              Allkademy - Habilitações
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                <div>
                  <h4 className="font-medium text-green-800">Design Gráfico</h4>
                  <p className="text-sm text-green-600">Certificado ativo</p>
                </div>
                <Badge className="bg-green-500 text-white">Habilitado</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                <div>
                  <h4 className="font-medium text-green-800">Copywriting</h4>
                  <p className="text-sm text-green-600">Certificado ativo</p>
                </div>
                <Badge className="bg-green-500 text-white">Habilitado</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div>
                  <h4 className="font-medium text-blue-800">Social Media</h4>
                  <p className="text-sm text-blue-600">Curso em progresso - 70%</p>
                </div>
                <Badge className="bg-blue-500 text-white">Em Progresso</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                  <h4 className="font-medium text-gray-800">Desenvolvimento Web</h4>
                  <p className="text-sm text-gray-600">Disponível para inscrição</p>
                </div>
                <Badge variant="outline">Disponível</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-purple-500" />
              Disponibilidade Semanal
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <h4 className="font-semibold text-purple-800">Horas Atuais</h4>
                <p className="text-2xl font-bold text-purple-700 mt-2">18h/semana</p>
                <p className="text-sm text-purple-600">2h restantes para Platinum</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Segunda a Sexta</span>
                  <span className="font-medium">3h/dia</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Fins de Semana</span>
                  <span className="font-medium">1.5h/dia</span>
                </div>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                <p className="text-sm text-orange-800">
                  <strong>Dica:</strong> Aumente para 20h semanais para ser elegível ao convite Platinum com garantia de
                  renda mensal.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Tarefas Recentes</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">Design de Banner - E-commerce</h4>
                    <p className="text-sm text-gray-600">Cliente: TechStore Brasil</p>
                    <div className="flex items-center mt-2">
                      <Clock className="h-4 w-4 text-gray-400 mr-1" />
                      <span className="text-sm text-gray-600">Entregue há 2 horas</span>
                      <Star className="h-4 w-4 text-yellow-400 ml-3 mr-1" />
                      <span className="text-sm text-gray-600">4.8</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-green-500 text-white mb-2">Concluída</Badge>
                    <p className="text-sm font-semibold text-green-600">R$ 225</p>
                    <p className="text-xs text-gray-500">+25% Silver</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">Copywriting - Landing Page</h4>
                    <p className="text-sm text-gray-600">Cliente: StartupXYZ</p>
                    <div className="flex items-center mt-2">
                      <Clock className="h-4 w-4 text-blue-400 mr-1" />
                      <span className="text-sm text-blue-600">Em progresso - 6h restantes</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-blue-500 text-white mb-2">Em Progresso</Badge>
                    <p className="text-sm font-semibold text-blue-600">R$ 312</p>
                    <p className="text-xs text-gray-500">+25% Silver</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">Edição de Vídeo - Social Media</h4>
                    <p className="text-sm text-gray-600">Cliente: FoodCorp</p>
                    <div className="flex items-center mt-2">
                      <Clock className="h-4 w-4 text-orange-400 mr-1" />
                      <span className="text-sm text-orange-600">Aguardando aprovação</span>
                      <Star className="h-4 w-4 text-yellow-400 ml-3 mr-1" />
                      <span className="text-sm text-gray-600">Pendente</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-orange-500 text-white mb-2">Revisão</Badge>
                    <p className="text-sm font-semibold text-orange-600">R$ 400</p>
                    <p className="text-xs text-gray-500">+25% Silver</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <div>
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Oportunidades Disponíveis</h3>
              <div className="space-y-3">
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-sm text-green-800">Design Gráfico</p>
                    <Badge className="bg-green-500 text-white text-xs">Urgente</Badge>
                  </div>
                  <p className="text-sm text-green-700">Logo + Identidade Visual</p>
                  <p className="text-xs text-green-600 mt-1">Pagamento: R$ 562 (+25%)</p>
                  <p className="text-xs text-green-600">Prazo: 24h</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-sm text-blue-800">Redação</p>
                    <Badge className="bg-blue-500 text-white text-xs">Disponível</Badge>
                  </div>
                  <p className="text-sm text-blue-700">Artigos para Blog (5x)</p>
                  <p className="text-xs text-blue-600 mt-1">Pagamento: R$ 375 (+25%)</p>
                  <p className="text-xs text-blue-600">Prazo: 3 dias</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-sm text-purple-800">Squad Especial</p>
                    <Badge className="bg-gray-500 text-white text-xs">Gold+</Badge>
                  </div>
                  <p className="text-sm text-purple-700">Projeto Premium</p>
                  <p className="text-xs text-purple-600 mt-1">Requer nível Gold</p>
                  <p className="text-xs text-purple-600">Pagamento: R$ 1.200+</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
