
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DollarSign,
  Star,
  Award,
  Clock,
  Users,
  AlertTriangle,
  FileText,
  UserCheck,
  Target,
  Shield,
  Zap,
} from "lucide-react"

const leaderStats = [
  {
    title: "Valor Fixo Mensal",
    value: "R$ 4.5k",
    subtitle: "Remuneração garantida",
    change: "Próximo pagamento: 15/02",
    icon: DollarSign,
    color: "bg-green-500",
    textColor: "text-white",
  },
  {
    title: "Tarefas Supervisionadas",
    value: "28",
    subtitle: "Sob sua liderança",
    change: "12 em andamento",
    icon: Target,
    color: "bg-blue-500",
    textColor: "text-white",
  },
  {
    title: "Rating de Qualidade",
    value: "4.7",
    subtitle: "Padrão Allka",
    change: "Últimos 30 dias",
    icon: Star,
    color: "bg-yellow-500",
    textColor: "text-white",
  },
  {
    title: "Nômades Ativos",
    value: "15",
    subtitle: "Sob supervisão",
    change: "3 novos este mês",
    icon: Users,
    color: "bg-purple-500",
    textColor: "text-white",
  },
]

const criticalTasks = [
  {
    id: 1,
    title: "Design de Identidade Visual - TechCorp",
    reason: "Nômade indisponível",
    deadline: "2h restantes",
    value: "R$ 850",
    urgency: "high",
  },
  {
    id: 2,
    title: "Copywriting Landing Page - StartupXYZ",
    reason: "Reprovada pela 3ª vez",
    deadline: "6h restantes",
    value: "R$ 420",
    urgency: "critical",
  },
  {
    id: 3,
    title: "Edição de Vídeo - FoodBrand",
    reason: "Prazo limite excedido",
    deadline: "Atrasada 4h",
    value: "R$ 650",
    urgency: "critical",
  },
]

const dailyReport = [
  {
    category: "Design Gráfico",
    completed: 8,
    inProgress: 5,
    pending: 2,
    avgRating: 4.6,
  },
  {
    category: "Copywriting",
    completed: 12,
    inProgress: 3,
    pending: 1,
    avgRating: 4.4,
  },
  {
    category: "Social Media",
    completed: 6,
    inProgress: 4,
    pending: 3,
    avgRating: 4.8,
  },
]

const newNomades = [
  {
    name: "Ana Silva",
    area: "Design Gráfico",
    status: "Em treinamento",
    progress: 75,
    nextStep: "Avaliação prática",
  },
  {
    name: "Carlos Santos",
    area: "Copywriting",
    status: "Aguardando aprovação",
    progress: 100,
    nextStep: "Aprovação final",
  },
  {
    name: "Marina Costa",
    area: "Social Media",
    status: "Documentação",
    progress: 45,
    nextStep: "Completar portfólio",
  },
]

export function LeaderDashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Líder</h1>
          <p className="text-gray-600 mt-1">Gerencie sua categoria e garanta a qualidade padrão Allka.</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            <Shield className="h-4 w-4 mr-1" />
            Líder - Design Gráfico
          </Badge>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <DollarSign className="h-4 w-4 mr-1" />
            Salário + Comissão
          </Badge>
        </div>
      </div>

      {/* Enhanced Stats Cards with Category Focus */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-green-500 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium opacity-90">Remuneração Total</p>
                <p className="text-3xl font-bold mt-2">R$ 8.2k</p>
                <p className="text-sm opacity-75 mt-1">Fixo: R$ 4.5k + Comissão: R$ 3.7k</p>
                <p className="text-xs opacity-75 mt-2">15% sobre custo base das tarefas</p>
              </div>
              <div className="ml-4">
                <DollarSign className="h-8 w-8 opacity-80" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-500 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium opacity-90">Categoria: Design Gráfico</p>
                <p className="text-3xl font-bold mt-2">28</p>
                <p className="text-sm opacity-75 mt-1">Tarefas supervisionadas</p>
                <p className="text-xs opacity-75 mt-2">12 em andamento</p>
              </div>
              <div className="ml-4">
                <Target className="h-8 w-8 opacity-80" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-yellow-500 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium opacity-90">Qualidade da Categoria</p>
                <p className="text-3xl font-bold mt-2">4.7</p>
                <p className="text-sm opacity-75 mt-1">Padrão Allka</p>
                <p className="text-xs opacity-75 mt-2">Meta: 4.5+ (Atingida)</p>
              </div>
              <div className="ml-4">
                <Star className="h-8 w-8 opacity-80" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-500 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium opacity-90">Nômades da Categoria</p>
                <p className="text-3xl font-bold mt-2">15</p>
                <p className="text-sm opacity-75 mt-1">Sob sua liderança</p>
                <p className="text-xs opacity-75 mt-2">3 novos qualificados</p>
              </div>
              <div className="ml-4">
                <Users className="h-8 w-8 opacity-80" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Critical Tasks Section - Enhanced */}
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center text-red-800">
            <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
            Execução Direta - Responsabilidade do Líder
          </h3>
          <div className="space-y-4">
            {criticalTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-4 bg-white rounded-lg border border-red-200"
              >
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{task.title}</h4>
                  <p className="text-sm text-red-600 mt-1">
                    <strong>Motivo:</strong> {task.reason}
                  </p>
                  <div className="flex items-center mt-2">
                    <Clock className="h-4 w-4 text-gray-400 mr-1" />
                    <span
                      className={`text-sm ${task.urgency === "critical" ? "text-red-600 font-medium" : "text-orange-600"}`}
                    >
                      {task.deadline}
                    </span>
                    <span className="text-sm text-gray-600 ml-4">Valor: {task.value}</span>
                    <span className="text-sm text-green-600 ml-4">
                      Comissão: R$ {(Number.parseInt(task.value.replace(/[^\d]/g, "")) * 0.15).toFixed(0)}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className={`${task.urgency === "critical" ? "bg-red-500 hover:bg-red-600" : "bg-orange-500 hover:bg-orange-600"} text-white`}
                  >
                    <Zap className="h-4 w-4 mr-1" />
                    Assumir Tarefa
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-red-100 rounded-lg border border-red-200">
            <p className="text-sm text-red-800">
              <strong>Responsabilidade do Líder:</strong> Assumir tarefas quando nenhum nômade está disponível, quando o
              prazo é excedido ou após 3 reprovações por erro grave. Você receberá sua comissão normal (15%) sobre o
              valor da tarefa.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Daily Report */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Report */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-blue-500" />
              Relatório Diário de Atividades
            </h3>
            <div className="space-y-4">
              {dailyReport.map((category, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900">{category.category}</h4>
                    <div className="flex items-center">
                      <Star className="h-4 w-4 text-yellow-400 mr-1" />
                      <span className="text-sm font-medium">{category.avgRating}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-green-600">{category.completed}</p>
                      <p className="text-xs text-gray-600">Concluídas</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-600">{category.inProgress}</p>
                      <p className="text-xs text-gray-600">Em Progresso</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-orange-600">{category.pending}</p>
                      <p className="text-xs text-gray-600">Pendentes</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* New Nomades Management */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <UserCheck className="h-5 w-5 mr-2 text-green-500" />
              Captação de Talentos
            </h3>
            <div className="space-y-4">
              {newNomades.map((nomade, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{nomade.name}</h4>
                    <Badge
                      variant="outline"
                      className={
                        nomade.status === "Aguardando aprovação"
                          ? "bg-green-50 text-green-700 border-green-200"
                          : nomade.status === "Em treinamento"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-orange-50 text-orange-700 border-orange-200"
                      }
                    >
                      {nomade.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{nomade.area}</p>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Progresso</span>
                    <span className="text-sm font-medium">{nomade.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${nomade.progress}%` }}></div>
                  </div>
                  <p className="text-sm text-gray-700">
                    <strong>Próximo passo:</strong> {nomade.nextStep}
                  </p>
                  {nomade.status === "Aguardando aprovação" && (
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white">
                        Aprovar
                      </Button>
                      <Button size="sm" variant="outline">
                        Solicitar Revisão
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Função de Qualificador:</strong> Treinar e aprovar novos nômades para expandir a equipe de
                profissionais qualificados da plataforma.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quality Management */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Award className="h-5 w-5 mr-2 text-purple-500" />
            Gestão da Qualidade - Padrão Allka
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h4 className="font-semibold text-purple-800 mb-2">Qualificação de Tarefas</h4>
              <p className="text-2xl font-bold text-purple-700">96%</p>
              <p className="text-sm text-purple-600">Taxa de aprovação</p>
              <p className="text-xs text-purple-600 mt-2">Últimos 30 dias</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-800 mb-2">Padrão de Qualidade</h4>
              <p className="text-2xl font-bold text-green-700">4.7/5.0</p>
              <p className="text-sm text-green-600">Média geral</p>
              <p className="text-xs text-green-600 mt-2">Acima da meta (4.5)</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-2">Tempo de Resposta</h4>
              <p className="text-2xl font-bold text-blue-700">2.3h</p>
              <p className="text-sm text-blue-600">Média de revisão</p>
              <p className="text-xs text-blue-600 mt-2">Meta: 4h</p>
            </div>
          </div>
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold text-gray-800 mb-3">Ações Recentes de Qualidade</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700">Design aprovado - Logo TechStart</span>
                <span className="text-green-600 font-medium">Aprovado</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700">Copy revisado - Landing FoodCorp</span>
                <span className="text-orange-600 font-medium">Revisão solicitada</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700">Vídeo aprovado - Social MediaBrand</span>
                <span className="text-green-600 font-medium">Aprovado</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
