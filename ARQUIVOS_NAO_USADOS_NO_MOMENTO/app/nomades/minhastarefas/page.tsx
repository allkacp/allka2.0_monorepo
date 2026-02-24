// @ts-nocheck
import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckSquare, Clock, AlertCircle, Eye, DollarSign, Search, X, Filter } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useNavigate } from "react-router-dom"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PageHeader } from "@/components/page-header"

interface Task {
  id: string
  taskId: string
  title: string
  category: string
  client: string
  payment: number
  bonus: number
  deadline?: string
  progress?: number
  status: "in-progress" | "review" | "completed"
  submittedAt?: string
  completedAt?: string
  rating?: number
}

const taskColors = [
  { bg: "bg-blue-50", border: "border-blue-200", hover: "hover:bg-blue-100" },
  { bg: "bg-purple-50", border: "border-purple-200", hover: "hover:bg-purple-100" },
  { bg: "bg-green-50", border: "border-green-200", hover: "hover:bg-green-100" },
  { bg: "bg-orange-50", border: "border-orange-200", hover: "hover:bg-orange-100" },
  { bg: "bg-pink-50", border: "border-pink-200", hover: "hover:bg-pink-100" },
  { bg: "bg-indigo-50", border: "border-indigo-200", hover: "hover:bg-indigo-100" },
  { bg: "bg-teal-50", border: "border-teal-200", hover: "hover:bg-teal-100" },
  { bg: "bg-cyan-50", border: "border-cyan-200", hover: "hover:bg-cyan-100" },
]

const getTaskColor = (index: number) => taskColors[index % taskColors.length]

export default function MinhasTarefasPage() {
  const navigate = useNavigate()
  const [tasks] = useState<Task[]>([
    {
      id: "1",
      taskId: "T19572",
      title: "Copywriting - Landing Page",
      category: "Copywriting",
      client: "StartupXYZ",
      payment: 312,
      bonus: 25,
      deadline: "6h restantes",
      progress: 65,
      status: "in-progress",
    },
    {
      id: "2",
      taskId: "T19580",
      title: "Design de Posts - Instagram",
      category: "Design Gráfico",
      client: "Fashion Store",
      payment: 280,
      bonus: 25,
      deadline: "1 dia restante",
      progress: 40,
      status: "in-progress",
    },
    {
      id: "3",
      taskId: "T19565",
      title: "Edição de Vídeo - Social Media",
      category: "Vídeo",
      client: "FoodCorp",
      payment: 400,
      bonus: 25,
      submittedAt: "Há 2 horas",
      status: "review",
    },
    {
      id: "4",
      taskId: "T19550",
      title: "Design de Banner - E-commerce",
      category: "Design Gráfico",
      client: "TechStore Brasil",
      payment: 225,
      bonus: 25,
      completedAt: "Há 2 horas",
      rating: 4.8,
      status: "completed",
    },
  ])

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500 text-white"
      case "review":
        return "bg-orange-500 text-white"
      case "in-progress":
        return "bg-blue-500 text-white"
      default:
        return "bg-gray-500 text-white"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed":
        return "CONCLUÍDA"
      case "review":
        return "EM REVISÃO"
      case "in-progress":
        return "EM PROGRESSO"
      default:
        return status.toUpperCase()
    }
  }

  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [showFilters, setShowFilters] = useState(false)

  const filterTasks = (taskList: Task[]) => {
    return taskList.filter((task) => {
      const matchesSearch =
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.taskId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.client.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesCategory = categoryFilter === "all" || task.category === categoryFilter

      return matchesSearch && matchesCategory
    })
  }

  const inProgressTasks = filterTasks(tasks.filter((t) => t.status === "in-progress"))
  const reviewTasks = filterTasks(tasks.filter((t) => t.status === "review"))
  const completedTasks = filterTasks(tasks.filter((t) => t.status === "completed"))

  const allCategories = Array.from(new Set(tasks.map((t) => t.category)))

  const renderTaskCard = (task: Task, index: number) => {
    const bgColor = index % 2 === 0 ? "bg-blue-50" : "bg-gray-50"
    const borderColor = index % 2 === 0 ? "border-blue-200" : "border-gray-200"
    const hoverColor = index % 2 === 0 ? "hover:bg-blue-100" : "hover:bg-gray-100"

    return (
      <Card
        key={task.id}
        className={`shadow-lg border-2 ${borderColor} ${bgColor} ${hoverColor} transition-all cursor-pointer group`}
        onClick={() => navigate(`/nomades/minhastarefas/${task.id}`)}
      >
        <CardContent className="p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="text-sm font-semibold group-hover:text-blue-600 transition-colors truncate">
                  [{task.taskId}] {task.title}
                </h3>
                <Badge className={getStatusBadgeClass(task.status)} size="sm">
                  {getStatusLabel(task.status)}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600 flex-wrap">
                <Badge variant="outline" className="text-xs px-1.5 py-0">
                  {task.category}
                </Badge>
                <span>•</span>
                <span>{task.client}</span>
                {task.deadline && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {task.deadline}
                    </span>
                  </>
                )}
              </div>
              {task.progress !== undefined && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs text-gray-600">Progresso</span>
                    <span className="text-xs font-medium text-blue-600">{task.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1">
                    <div
                      className="bg-blue-500 h-1 rounded-full transition-all"
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
              <div className="text-right">
                <p className="text-sm font-semibold text-green-600 flex items-center gap-0.5">
                  <DollarSign className="h-3 w-3" />
                  R$ {task.payment}
                </p>
                <p className="text-xs text-gray-500">+{task.bonus}%</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="group-hover:bg-blue-600 group-hover:text-white bg-transparent text-xs h-6"
              >
                <Eye className="h-3 w-3 mr-1" />
                Ver
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="container mx-auto px-0 py-0">
      <PageHeader
        title="Minhas Tarefas"
        description="Gerencie suas tarefas em andamento e concluídas"
        actions={
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-4 w-4 mr-2" />
            Filtros
            {(categoryFilter !== "all" || searchTerm) && <Badge className="ml-2 bg-blue-500 text-white">Ativos</Badge>}
          </Button>
        }
      />

      {showFilters && (
        <Card className="shadow-lg border-0 bg-white">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar tarefas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    >
                      <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Categoria</label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as categorias" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as categorias</SelectItem>
                    {allCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  className="w-full bg-transparent"
                  onClick={() => {
                    setSearchTerm("")
                    setCategoryFilter("all")
                  }}
                >
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-full">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white/90">Em Progresso</p>
                  <p className="text-3xl font-bold text-white">{inProgressTasks.length}</p>
                </div>
                <div className="bg-white/20 p-3 rounded-lg">
                  <Clock className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </div>
        </Card>

        <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 h-full">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white/90">Em Revisão</p>
                  <p className="text-3xl font-bold text-white">{reviewTasks.length}</p>
                </div>
                <div className="bg-white/20 p-3 rounded-lg">
                  <AlertCircle className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </div>
        </Card>

        <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 h-full">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white/90">Concluídas</p>
                  <p className="text-3xl font-bold text-white">{completedTasks.length}</p>
                </div>
                <div className="bg-white/20 p-3 rounded-lg">
                  <CheckSquare className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="in-progress" className="w-full">
        <TabsList className="grid w-full grid-cols-3 text-xs">
          <TabsTrigger value="in-progress" className="text-xs">
            Em Progresso ({inProgressTasks.length})
          </TabsTrigger>
          <TabsTrigger value="review" className="text-xs">
            Em Revisão ({reviewTasks.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="text-xs">
            Concluídas ({completedTasks.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="in-progress" className="space-y-3 mt-6">
          {inProgressTasks.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">Nenhuma tarefa encontrada com os filtros aplicados</p>
            </div>
          ) : (
            inProgressTasks.map((task, index) => renderTaskCard(task, index))
          )}
        </TabsContent>

        <TabsContent value="review" className="space-y-3 mt-6">
          {reviewTasks.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">Nenhuma tarefa encontrada com os filtros aplicados</p>
            </div>
          ) : (
            reviewTasks.map((task, index) => renderTaskCard(task, index))
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-3 mt-6">
          {completedTasks.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">Nenhuma tarefa encontrada com os filtros aplicados</p>
            </div>
          ) : (
            completedTasks.map((task, index) => renderTaskCard(task, index))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
