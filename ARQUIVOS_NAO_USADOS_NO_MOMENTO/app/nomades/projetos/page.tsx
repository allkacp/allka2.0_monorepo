
import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/page-header"
import {
  Briefcase,
  Clock,
  CheckCircle,
  Search,
  Download,
  Eye,
  Calendar,
  DollarSign,
  Users,
  TrendingUp,
  AlertCircle,
  Star,
} from "lucide-react"

const projects = [
  {
    id: "1",
    name: "Redesign E-commerce TechStore",
    client: "TechStore Brasil",
    category: "Design",
    status: "em_andamento",
    progress: 65,
    startDate: "2024-01-15",
    deadline: "2024-02-28",
    budget: 4500,
    earned: 2925,
    tasksTotal: 12,
    tasksCompleted: 8,
    rating: 4.5,
    team: ["Ana Silva", "Carlos Santos"],
  },
  {
    id: "2",
    name: "Campanha Social Media FoodCorp",
    client: "FoodCorp",
    category: "Marketing",
    status: "em_andamento",
    progress: 40,
    startDate: "2024-02-01",
    deadline: "2024-03-15",
    budget: 3200,
    earned: 1280,
    tasksTotal: 10,
    tasksCompleted: 4,
    rating: 4.8,
    team: ["Ana Silva"],
  },
  {
    id: "3",
    name: "Desenvolvimento Landing Page StartupXYZ",
    client: "StartupXYZ",
    category: "Desenvolvimento",
    status: "concluido",
    progress: 100,
    startDate: "2023-12-01",
    deadline: "2024-01-15",
    budget: 5500,
    earned: 5500,
    tasksTotal: 15,
    tasksCompleted: 15,
    rating: 4.9,
    team: ["Ana Silva", "Carlos Santos", "Maria Oliveira"],
  },
  {
    id: "4",
    name: "Identidade Visual Café Aroma",
    client: "Café Aroma",
    category: "Design",
    status: "concluido",
    progress: 100,
    startDate: "2023-11-10",
    deadline: "2023-12-20",
    budget: 2800,
    earned: 2800,
    tasksTotal: 8,
    tasksCompleted: 8,
    rating: 5.0,
    team: ["Ana Silva"],
  },
  {
    id: "5",
    name: "Estratégia de Conteúdo Blog Tech",
    client: "Blog Tech",
    category: "Copywriting",
    status: "planejamento",
    progress: 10,
    startDate: "2024-02-10",
    deadline: "2024-04-30",
    budget: 6000,
    earned: 600,
    tasksTotal: 20,
    tasksCompleted: 2,
    rating: null,
    team: ["Ana Silva", "João Pedro"],
  },
]

export default function NomadesProjetos() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [selectedCategory, setSelectedCategory] = useState("all")

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.client.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = selectedStatus === "all" || project.status === selectedStatus
    const matchesCategory = selectedCategory === "all" || project.category === selectedCategory

    return matchesSearch && matchesStatus && matchesCategory
  })

  const stats = {
    total: projects.length,
    active: projects.filter((p) => p.status === "em_andamento").length,
    completed: projects.filter((p) => p.status === "concluido").length,
    planning: projects.filter((p) => p.status === "planejamento").length,
    totalEarned: projects.reduce((sum, p) => sum + p.earned, 0),
    totalBudget: projects.reduce((sum, p) => sum + p.budget, 0),
  }

  const getStatusColor = (status: string) => {
    const colors = {
      em_andamento: "bg-blue-100 text-blue-800 border-blue-200",
      concluido: "bg-green-100 text-green-800 border-green-200",
      planejamento: "bg-yellow-100 text-yellow-800 border-yellow-200",
      pausado: "bg-gray-100 text-gray-800 border-gray-200",
    }
    return colors[status as keyof typeof colors] || colors.planejamento
  }

  const getStatusLabel = (status: string) => {
    const labels = {
      em_andamento: "Em Andamento",
      concluido: "Concluído",
      planejamento: "Planejamento",
      pausado: "Pausado",
    }
    return labels[status as keyof typeof labels] || status
  }

  return (
    <div className="container mx-auto px-0 py-0 space-y-6">
      {/* Header */}
      <PageHeader
        title="Meus Projetos"
        description="Acompanhe seus projetos ativos e histórico de trabalhos"
        actions={
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        }
      />

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Briefcase className="h-6 w-6 text-gray-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Em Andamento</p>
                <p className="text-2xl font-bold text-blue-600">{stats.active}</p>
              </div>
              <Clock className="h-6 w-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Planejamento</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.planning}</p>
              </div>
              <AlertCircle className="h-6 w-6 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Concluídos</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Ganhos</p>
                <p className="text-2xl font-bold text-green-600">R$ {(stats.totalEarned / 1000).toFixed(1)}k</p>
              </div>
              <DollarSign className="h-6 w-6 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Orçamento Total</p>
                <p className="text-2xl font-bold text-purple-600">R$ {(stats.totalBudget / 1000).toFixed(1)}k</p>
              </div>
              <TrendingUp className="h-6 w-6 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por nome ou cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">Todos os Status</option>
                <option value="em_andamento">Em Andamento</option>
                <option value="planejamento">Planejamento</option>
                <option value="concluido">Concluído</option>
                <option value="pausado">Pausado</option>
              </select>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">Todas as Categorias</option>
                <option value="Design">Design</option>
                <option value="Marketing">Marketing</option>
                <option value="Desenvolvimento">Desenvolvimento</option>
                <option value="Copywriting">Copywriting</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Projects List */}
      <div className="space-y-4">
        {filteredProjects.map((project) => (
          <Card key={project.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
                    <Badge className={getStatusColor(project.status)}>{getStatusLabel(project.status)}</Badge>
                    {project.rating && (
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-yellow-400 fill-yellow-400 mr-1" />
                        <span className="text-sm font-medium text-gray-700">{project.rating}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-3">Cliente: {project.client}</p>

                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600">Progresso</span>
                      <span className="font-medium text-gray-900">{project.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${project.progress}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Project Details */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600 flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        Início
                      </p>
                      <p className="font-medium text-gray-900">{new Date(project.startDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        Prazo
                      </p>
                      <p className="font-medium text-gray-900">{new Date(project.deadline).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 flex items-center">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Tarefas
                      </p>
                      <p className="font-medium text-gray-900">
                        {project.tasksCompleted}/{project.tasksTotal}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 flex items-center">
                        <Users className="h-4 w-4 mr-1" />
                        Equipe
                      </p>
                      <p className="font-medium text-gray-900">{project.team.length} membros</p>
                    </div>
                  </div>
                </div>

                {/* Financial Info */}
                <div className="ml-6 text-right">
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">Ganho Atual</p>
                    <p className="text-2xl font-bold text-green-600">R$ {project.earned.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">de R$ {project.budget.toLocaleString()}</p>
                  </div>
                  <Button size="sm" className="bg-blue-500 hover:bg-blue-600 text-white">
                    <Eye className="h-4 w-4 mr-1" />
                    Ver Detalhes
                  </Button>
                </div>
              </div>

              {/* Team Members */}
              <div className="flex items-center gap-2 pt-3 border-t border-gray-200">
                <Users className="h-4 w-4 text-gray-400" />
                <div className="flex flex-wrap gap-2">
                  {project.team.map((member, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {member}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProjects.length === 0 && (
        <Card>
          <CardContent className="p-12">
            <div className="text-center text-gray-500">
              <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhum projeto encontrado</p>
              <p className="text-sm mt-1">Tente ajustar os filtros de busca</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
