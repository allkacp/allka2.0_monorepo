
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Target, Clock, DollarSign, Star, Filter, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/page-header"

const availableTasks = [
  {
    id: 1,
    title: "Logo + Identidade Visual Completa",
    category: "Design Gráfico",
    client: "TechStart Brasil",
    payment: 562,
    bonus: 25,
    deadline: "24h",
    difficulty: "Média",
    rating: 4.8,
    urgent: true,
    description: "Criação de logo e manual de identidade visual para startup de tecnologia",
  },
  {
    id: 2,
    title: "Artigos para Blog (5 unidades)",
    category: "Redação",
    client: "Marketing Digital Pro",
    payment: 375,
    bonus: 25,
    deadline: "3 dias",
    difficulty: "Fácil",
    rating: 4.5,
    urgent: false,
    description: "5 artigos de 800 palavras sobre marketing digital e SEO",
  },
  {
    id: 3,
    title: "Edição de Vídeo para Redes Sociais",
    category: "Vídeo",
    client: "FoodCorp",
    payment: 450,
    bonus: 25,
    deadline: "48h",
    difficulty: "Média",
    rating: 4.7,
    urgent: true,
    description: "Edição de 10 vídeos curtos para Instagram e TikTok",
  },
  {
    id: 4,
    title: "Copywriting para Landing Page",
    category: "Copywriting",
    client: "E-commerce Plus",
    payment: 312,
    bonus: 25,
    deadline: "2 dias",
    difficulty: "Fácil",
    rating: 4.6,
    urgent: false,
    description: "Textos persuasivos para landing page de produto",
  },
  {
    id: 5,
    title: "Design de Banner para Campanha",
    category: "Design Gráfico",
    client: "Varejo Online",
    payment: 225,
    bonus: 25,
    deadline: "12h",
    difficulty: "Fácil",
    rating: 4.4,
    urgent: true,
    description: "3 banners para campanha de Black Friday",
  },
  {
    id: 6,
    title: "Gestão de Redes Sociais (1 semana)",
    category: "Social Media",
    client: "Restaurante Gourmet",
    payment: 680,
    bonus: 25,
    deadline: "7 dias",
    difficulty: "Média",
    rating: 4.9,
    urgent: false,
    description: "Planejamento e postagens para Instagram e Facebook",
  },
]

export default function TarefasDisponiveisPage() {
  return (
    <div className="container mx-auto px-0 py-0">
      <PageHeader
        title="Tarefas Disponíveis"
        description="Escolha tarefas que combinam com suas habilidades"
        actions={
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Target className="h-4 w-4 mr-1" />
            {availableTasks.length} tarefas disponíveis
          </Badge>
        }
      />

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="Buscar tarefas..." className="pl-10" />
          </div>
        </div>
        <Button variant="outline" className="flex items-center gap-2 bg-transparent">
          <Filter className="h-4 w-4" />
          Filtros
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {availableTasks.map((task) => (
          <Card key={task.id} className={task.urgent ? "border-orange-300 border-2" : ""}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-blue-500 text-white">{task.category}</Badge>
                    {task.urgent && <Badge className="bg-orange-500 text-white">Urgente</Badge>}
                    <Badge variant="outline">{task.difficulty}</Badge>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{task.client}</p>
                </div>
              </div>

              <p className="text-sm text-gray-700 mb-4">{task.description}</p>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-sm font-semibold text-green-600">R$ {task.payment}</p>
                    <p className="text-xs text-gray-500">+{task.bonus}% bônus</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <div>
                    <p className="text-sm font-semibold text-blue-600">{task.deadline}</p>
                    <p className="text-xs text-gray-500">Prazo</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                  <span className="text-sm font-medium">{task.rating}</span>
                  <span className="text-xs text-gray-500">Cliente</span>
                </div>
                <Button className="bg-blue-600 hover:bg-blue-700">Aceitar Tarefa</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
