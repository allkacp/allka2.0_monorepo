
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { History, Calendar, DollarSign, Star, TrendingUp, Award } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/page-header"

const historyData = {
  tasks: [
    {
      id: 1,
      title: "Design de Banner - E-commerce",
      category: "Design Gráfico",
      client: "TechStore Brasil",
      completedAt: "15 Mar 2024",
      payment: 225,
      bonus: 25,
      rating: 4.8,
      feedback: "Excelente trabalho! Superou expectativas.",
    },
    {
      id: 2,
      title: "Artigos para Blog (3x)",
      category: "Redação",
      client: "Marketing Pro",
      completedAt: "14 Mar 2024",
      payment: 225,
      bonus: 25,
      rating: 4.5,
      feedback: "Ótima qualidade de conteúdo.",
    },
    {
      id: 3,
      title: "Logo Design",
      category: "Design Gráfico",
      client: "Startup ABC",
      completedAt: "12 Mar 2024",
      payment: 450,
      bonus: 25,
      rating: 4.9,
      feedback: "Criativo e profissional!",
    },
    {
      id: 4,
      title: "Gestão de Redes Sociais",
      category: "Social Media",
      client: "Restaurante Gourmet",
      completedAt: "10 Mar 2024",
      payment: 680,
      bonus: 25,
      rating: 4.7,
      feedback: "Muito bom engajamento.",
    },
    {
      id: 5,
      title: "Edição de Vídeo",
      category: "Vídeo",
      client: "FoodCorp",
      completedAt: "08 Mar 2024",
      payment: 400,
      bonus: 25,
      rating: 4.6,
      feedback: "Entrega dentro do prazo.",
    },
  ],
  earnings: [
    { month: "Março 2024", total: 6800, tasks: 12, bonus: 1700 },
    { month: "Fevereiro 2024", total: 5200, tasks: 9, bonus: 1300 },
    { month: "Janeiro 2024", total: 4500, tasks: 8, bonus: 1125 },
  ],
  milestones: [
    {
      title: "Alcançou Nível Silver",
      date: "01 Fev 2024",
      description: "Completou 30 tarefas com nota média 4.0+",
      icon: Award,
    },
    {
      title: "100 Tarefas Completadas",
      date: "15 Mar 2024",
      description: "Marco de 100 tarefas concluídas com sucesso",
      icon: TrendingUp,
    },
    {
      title: "Certificação em Design",
      date: "20 Jan 2024",
      description: "Concluiu curso de Design Gráfico na Allkademy",
      icon: Award,
    },
  ],
}

export default function HistoricoPage() {
  return (
    <div className="container mx-auto px-0 py-0">
      <PageHeader
        title="Histórico"
        description="Acompanhe seu progresso e conquistas"
        actions={
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            <History className="h-4 w-4 mr-1" />
            {historyData.tasks.length} tarefas completadas
          </Badge>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Total Ganho</p>
                <p className="text-3xl font-bold mt-1">R$ 16.5k</p>
                <p className="text-xs opacity-75 mt-1">Últimos 3 meses</p>
              </div>
              <DollarSign className="h-10 w-10 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Tarefas Totais</p>
                <p className="text-3xl font-bold mt-1">29</p>
                <p className="text-xs opacity-75 mt-1">Últimos 3 meses</p>
              </div>
              <Calendar className="h-10 w-10 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Avaliação Média</p>
                <p className="text-3xl font-bold mt-1">4.7</p>
                <p className="text-xs opacity-75 mt-1">Todas as tarefas</p>
              </div>
              <Star className="h-10 w-10 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tasks" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tasks">Tarefas</TabsTrigger>
          <TabsTrigger value="earnings">Ganhos</TabsTrigger>
          <TabsTrigger value="milestones">Conquistas</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="space-y-4 mt-6">
          {historyData.tasks.map((task) => (
            <Card key={task.id}>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-blue-500 text-white">{task.category}</Badge>
                      <Badge className="bg-green-500 text-white">Concluída</Badge>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">Cliente: {task.client}</p>
                    <p className="text-sm text-gray-500 mt-2">Concluída em {task.completedAt}</p>

                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        <span className="text-sm font-medium">{task.rating}</span>
                      </div>
                      <p className="text-sm text-gray-700 italic">"{task.feedback}"</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-lg font-semibold text-green-600">R$ {task.payment}</p>
                    <p className="text-xs text-gray-500">+{task.bonus}% bônus</p>
                    <p className="text-sm font-medium text-green-600 mt-1">
                      R$ {Math.round(task.payment * (1 + task.bonus / 100))}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="earnings" className="space-y-4 mt-6">
          {historyData.earnings.map((earning, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{earning.month}</h3>
                    <p className="text-sm text-gray-600 mt-1">{earning.tasks} tarefas completadas</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">R$ {earning.total.toLocaleString()}</p>
                    <p className="text-sm text-gray-600 mt-1">Bônus: R$ {earning.bonus.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="milestones" className="space-y-4 mt-6">
          {historyData.milestones.map((milestone, index) => (
            <Card key={index} className="border-purple-200 bg-purple-50/50">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <milestone.icon className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{milestone.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{milestone.description}</p>
                    <p className="text-sm text-purple-600 mt-2">{milestone.date}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}
