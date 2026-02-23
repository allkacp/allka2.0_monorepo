
import { useState, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Eye, Filter, List, LayoutGrid, ArrowUp, ArrowDown, User, Users, Calendar } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Task {
  id: string
  uniqueId: string
  nome: string
  produtoNome: string
  executor: string
  lider: string
  prazo: string
  status: string
  projectId: number
  projectName: string
  dataInicio?: string
  prioridade?: "Alta" | "Média" | "Baixa"
}

interface CompanyTasksTabProps {
  company: {
    id: number
    name: string
  }
}

// Mock tasks para todos os projetos da empresa
const mockCompanyTasks: Task[] = [
  // Projeto 1: Hospedagem Florescer Idosos
  {
    id: "1",
    uniqueId: "5001",
    nome: "Design UI/UX",
    produtoNome: "App Mobile",
    executor: "Lucas Martins",
    lider: "Ana Oliveira",
    prazo: "20/02/2025",
    status: "Aprovada",
    projectId: 1,
    projectName: "Hospedagem Florescer Idosos",
    dataInicio: "15/02/2025",
  },
  {
    id: "2",
    uniqueId: "5002",
    nome: "Desenvolvimento iOS",
    produtoNome: "App Mobile",
    executor: "Camila Ferreira",
    lider: "Lucas Martins",
    prazo: "05/03/2025",
    status: "Em Execução",
    projectId: 1,
    projectName: "Hospedagem Florescer Idosos",
    dataInicio: "25/02/2025",
  },
  {
    id: "3",
    uniqueId: "5003",
    nome: "Desenvolvimento Android",
    produtoNome: "App Mobile",
    executor: "Rafael Gomes",
    lider: "Lucas Martins",
    prazo: "05/03/2025",
    status: "Em Execução",
    projectId: 1,
    projectName: "Hospedagem Florescer Idosos",
    dataInicio: "25/02/2025",
  },
  {
    id: "4",
    uniqueId: "5004",
    nome: "Testes Beta",
    produtoNome: "App Mobile",
    executor: "Patricia Cunha",
    lider: "Camila Ferreira",
    prazo: "15/03/2025",
    status: "Entregue",
    projectId: 1,
    projectName: "Hospedagem Florescer Idosos",
    dataInicio: "10/03/2025",
  },
  // Projeto 2: Redesign Website Startup ABC
  {
    id: "5",
    uniqueId: "5005",
    nome: "Setup Backend",
    produtoNome: "App Mobile",
    executor: "Carlos Lima",
    lider: "Rafael Gomes",
    prazo: "25/02/2025",
    status: "Aprovada",
    projectId: 2,
    projectName: "Redesign Website Startup ABC",
    dataInicio: "18/02/2025",
  },
  {
    id: "6",
    uniqueId: "5006",
    nome: "API Integration",
    produtoNome: "App Mobile",
    executor: "Maria Santos",
    lider: "Carlos Lima",
    prazo: "01/03/2025",
    status: "Em Execução",
    projectId: 2,
    projectName: "Redesign Website Startup ABC",
    dataInicio: "22/02/2025",
  },
  {
    id: "7",
    uniqueId: "5007",
    nome: "Push Notifications",
    produtoNome: "App Mobile",
    executor: "Pedro Costa",
    lider: "Maria Santos",
    prazo: "10/03/2025",
    status: "Aprovada",
    projectId: 2,
    projectName: "Redesign Website Startup ABC",
    dataInicio: "05/03/2025",
  },
  {
    id: "8",
    uniqueId: "5008",
    nome: "Auth System",
    produtoNome: "App Mobile",
    executor: "João Silva",
    lider: "Carlos Lima",
    prazo: "08/03/2025",
    status: "Para Aprovação",
    projectId: 2,
    projectName: "Redesign Website Startup ABC",
    dataInicio: "01/03/2025",
  },
  // Projeto 3: Identidade Visual FoodCorp
  {
    id: "9",
    uniqueId: "5009",
    nome: "Logo Design",
    produtoNome: "Design",
    executor: "Ana Santos",
    lider: "Pedro Criativo",
    prazo: "15/02/2025",
    status: "Aprovada",
    projectId: 3,
    projectName: "Identidade Visual FoodCorp",
    dataInicio: "08/02/2025",
  },
  {
    id: "10",
    uniqueId: "5010",
    nome: "Brand Guidelines",
    produtoNome: "Design",
    executor: "Maria Silva",
    lider: "Pedro Criativo",
    prazo: "20/02/2025",
    status: "Atrasada",
    projectId: 3,
    projectName: "Identidade Visual FoodCorp",
    dataInicio: "16/02/2025",
  },
  // Projeto 4: Campanha Lançamento Produto XYZ
  {
    id: "11",
    uniqueId: "5011",
    nome: "Pesquisa de Mercado",
    produtoNome: "Marketing",
    executor: "Lucas Marketing",
    lider: "Ana Marketing",
    prazo: "28/02/2025",
    status: "Para Aprovação",
    projectId: 4,
    projectName: "Campanha Lançamento Produto XYZ",
    dataInicio: "20/02/2025",
  },
  {
    id: "12",
    uniqueId: "5012",
    nome: "Criação de Conteúdo",
    produtoNome: "Marketing",
    executor: "Carolina Content",
    lider: "Lucas Marketing",
    prazo: "10/03/2025",
    status: "Em Execução",
    projectId: 4,
    projectName: "Campanha Lançamento Produto XYZ",
    dataInicio: "01/03/2025",
  },
]

export function CompanyTasksTab({ company }: CompanyTasksTabProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterProject, setFilterProject] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterDateStart, setFilterDateStart] = useState("")
  const [filterDateEnd, setFilterDateEnd] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [tasksViewMode, setTasksViewMode] = useState<"list" | "kanban">("list")
  const [showTaskFilters, setShowTaskFilters] = useState(false)
  const [taskSortBy, setTaskSortBy] = useState("projectName")
  const [taskSortOrder, setTaskSortOrder] = useState<"asc" | "desc">("asc")

  // Filtrar tarefas
  const filteredTasks = useMemo(() => {
    let result = mockCompanyTasks

    // Filtro por projeto
    if (filterProject !== "all") {
      result = result.filter((task) => task.projectId.toString() === filterProject)
    }

    // Filtro por status
    if (filterStatus !== "all") {
      result = result.filter((task) => task.status === filterStatus)
    }

    // Filtro por busca (nome ou ID)
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      result = result.filter(
        (task) =>
          task.nome.toLowerCase().includes(search) ||
          task.uniqueId.toLowerCase().includes(search)
      )
    }

    // Ordenação
    result.sort((a, b) => {
      let compareA: string | number = ""
      let compareB: string | number = ""

      switch (taskSortBy) {
        case "projectName":
          compareA = a.projectName
          compareB = b.projectName
          break
        case "nome":
          compareA = a.nome
          compareB = b.nome
          break
        case "status":
          compareA = a.status
          compareB = b.status
          break
        case "prazo":
          compareA = a.prazo
          compareB = b.prazo
          break
        case "executor":
          compareA = a.executor
          compareB = b.executor
          break
        case "lider":
          compareA = a.lider
          compareB = b.lider
          break
        default:
          compareA = a.projectName
          compareB = b.projectName
      }

      if (typeof compareA === "string") {
        return taskSortOrder === "asc" 
          ? compareA.localeCompare(compareB as string) 
          : (compareB as string).localeCompare(compareA)
      }
      return 0
    })

    return result
  }, [filterProject, filterStatus, searchTerm, taskSortBy, taskSortOrder])

  // Paginação
  const totalTasks = filteredTasks.length
  const totalPages = Math.ceil(totalTasks / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedTasks = filteredTasks.slice(startIndex, endIndex)

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value)
    setCurrentPage(1)
  }

  const getStatusBadgeColor = (status: string): string => {
    const statusColors: Record<string, string> = {
      "Aprovada": "bg-green-100 text-green-700 border-green-300",
      "Em Execução": "bg-blue-100 text-blue-700 border-blue-300",
      "Entregue": "bg-purple-100 text-purple-700 border-purple-300",
      "Aguardando": "bg-yellow-100 text-yellow-700 border-yellow-300",
      "Bloqueada": "bg-red-100 text-red-700 border-red-300",
    }
    return statusColors[status] || "bg-gray-100 text-gray-700 border-gray-300"
  }

  const getStatusBorderColor = (status: string): string => {
    const borderColors: Record<string, string> = {
      "Aprovada": "#22c55e",
      "Em Execução": "#3b82f6",
      "Entregue": "#a855f7",
      "Aguardando": "#eab308",
      "Bloqueada": "#ef4444",
    }
    return borderColors[status] || "#6b7280"
  }

  // Obter lista única de projetos
  const projects = useMemo(() => {
    const uniqueProjects = Array.from(
      new Map(mockCompanyTasks.map((task) => [task.projectId, task])).values()
    ).map((task) => ({
      id: task.projectId,
      name: task.projectName,
    }))
    return uniqueProjects.sort((a, b) => a.name.localeCompare(b.name))
  }, [])

  const allStatuses = ["Aprovada", "Em Execução", "Para Aprovação", "Entregue", "Atrasada"]

  return (
    <div className="space-y-4 px-[50px] pt-[25px]">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Tarefas da Empresa</h3>
          <p className="text-xs text-muted-foreground">
            {filteredTasks.length} tarefa(s) encontrada(s).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-md">
            <Button
              size="sm"
              variant={tasksViewMode === "list" ? "default" : "ghost"}
              onClick={() => setTasksViewMode("list")}
              className="h-8 rounded-r-none"
            >
              <List className="h-3.5 w-3.5 mr-1.5" />
              Lista
            </Button>
            <Button
              size="sm"
              variant={tasksViewMode === "kanban" ? "default" : "ghost"}
              onClick={() => setTasksViewMode("kanban")}
              className="h-8 rounded-l-none"
            >
              <LayoutGrid className="h-3.5 w-3.5 mr-1.5" />
              Kanban
            </Button>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowTaskFilters(!showTaskFilters)}
            className="h-8"
          >
            <Filter className="h-3.5 w-3.5 mr-1.5" />
            {showTaskFilters ? "Ocultar" : "Filtros"}
          </Button>
        </div>
      </div>

      {/* Filtros */}
      {showTaskFilters && (
        <Card className="p-3 bg-gray-50 border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Projeto</label>
              <Select value={filterProject} onValueChange={setFilterProject}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Projetos</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Status</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {allStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Ordenar por</label>
              <div className="flex gap-1.5">
                <Select value={taskSortBy} onValueChange={setTaskSortBy}>
                  <SelectTrigger className="h-8 text-xs flex-1">
                    <SelectValue placeholder="Campo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="projectName">Projeto</SelectItem>
                    <SelectItem value="nome">Nome</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="prazo">Prazo</SelectItem>
                    <SelectItem value="executor">Executor</SelectItem>
                    <SelectItem value="lider">Líder</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0 bg-transparent"
                  onClick={() => setTaskSortOrder(taskSortOrder === "asc" ? "desc" : "asc")}
                >
                  {taskSortOrder === "asc" ? (
                    <ArrowUp className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowDown className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Buscar</label>
              <Input
                type="text"
                placeholder="Nome ou ID da tarefa..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200">
            <div className="text-xs text-gray-600">
              Exibindo <span className="font-semibold">{startIndex + 1}</span> a{" "}
              <span className="font-semibold">{Math.min(endIndex, totalTasks)}</span> de{" "}
              <span className="font-semibold">{totalTasks}</span> tarefas
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600">Itens por página:</span>
              <Select value={itemsPerPage.toString()} onValueChange={(value) => handleItemsPerPageChange(parseInt(value))}>
                <SelectTrigger className="w-16 h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
      )}

      {/* Paginação no Topo */}
      {totalTasks > 0 && (
        <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200">
          <div className="text-xs text-gray-600">
            Exibindo <span className="font-semibold">{startIndex + 1}</span> a{" "}
            <span className="font-semibold">{Math.min(endIndex, totalTasks)}</span> de{" "}
            <span className="font-semibold">{totalTasks}</span> tarefas
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">Itens por página:</span>
            <Select value={itemsPerPage.toString()} onValueChange={(value) => handleItemsPerPageChange(parseInt(value))}>
              <SelectTrigger className="w-20 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Lista de Tarefas */}
      {tasksViewMode === "list" ? (
        <div className="space-y-2">
          {paginatedTasks.length > 0 ? (
            paginatedTasks.map((tarefa) => (
              <Card
                key={tarefa.id}
                className="p-3 hover:shadow-md transition-all border-l-4"
                style={{
                  borderLeftColor: getStatusBorderColor(tarefa.status),
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <div className="flex items-center justify-center bg-blue-50 rounded px-2 py-0.5 shrink-0">
                      <span className="text-[11px] text-blue-600 font-bold">#{tarefa.uniqueId}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <h4 className="font-semibold text-xs text-gray-900">
                          {tarefa.nome}
                        </h4>
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1.5 py-0 border-gray-200 text-gray-600 shrink-0"
                        >
                          {tarefa.produtoNome}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1.5 py-0 border-blue-200 bg-blue-50 text-blue-600 shrink-0"
                          title={`Projeto: ${tarefa.projectName}`}
                        >
                          {tarefa.projectName}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2.5 text-[10px] text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <User className="h-2.5 w-2.5" />
                          <span className="font-medium text-gray-700">{tarefa.executor}</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Users className="h-2.5 w-2.5" />
                          <span className="font-medium text-gray-700">{tarefa.lider}</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-2.5 w-2.5" />
                          <span className="font-medium text-gray-700">{tarefa.prazo}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      className={`text-xs px-3 py-1.5 border font-medium ${getStatusBadgeColor(tarefa.status)}`}
                    >
                      {tarefa.status}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 w-6 p-0 bg-transparent"
                      title="Visualizar Tarefa"
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <Card className="p-6 text-center">
              <p className="text-sm text-muted-foreground">Nenhuma tarefa encontrada.</p>
            </Card>
          )}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {["Aprovada", "Em Execução", "Para Aprovação", "Entregue", "Atrasada"].map((status) => {
            const statusTasks = filteredTasks.filter((t) => t.status === status)
            const columnColor = getStatusBorderColor(status)

            return (
              <div key={status} className="flex-shrink-0 w-64">
                <div
                  className="rounded-t-lg p-2 mb-2"
                  style={{
                    background: `linear-gradient(135deg, ${columnColor}15, ${columnColor}30)`,
                    borderBottom: `3px solid ${columnColor}`,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-xs" style={{ color: columnColor }}>
                      {status}
                    </h3>
                    <Badge
                      variant="outline"
                      className="text-[9px] px-1.5 py-0"
                      style={{ borderColor: columnColor, color: columnColor }}
                    >
                      {statusTasks.length}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {statusTasks.length > 0 ? (
                    statusTasks.map((tarefa) => (
                      <Card
                        key={tarefa.uniqueId}
                        className="p-2 hover:shadow-md transition-all border-l-4 bg-white"
                        style={{
                          borderLeftColor: columnColor,
                        }}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center justify-center bg-blue-50 rounded px-1.5 py-0.5">
                              <span className="text-[9px] text-blue-600 font-bold">#{tarefa.uniqueId}</span>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-5 w-5 p-0 bg-transparent"
                              title="Visualizar Tarefa"
                            >
                              <Eye className="h-2.5 w-2.5" />
                            </Button>
                          </div>
                          <h4 className="font-semibold text-xs text-gray-900 line-clamp-2">
                            {tarefa.nome}
                          </h4>
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1.5 py-0 border-gray-200 text-gray-600 w-full justify-center"
                          >
                            {tarefa.produtoNome}
                          </Badge>
                          <div className="space-y-0.5 text-[9px] text-muted-foreground pt-1 border-t">
                            <div className="flex items-center gap-1">
                              <User className="h-2.5 w-2.5" />
                              <span className="font-medium text-gray-700">{tarefa.executor}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="h-2.5 w-2.5" />
                              <span className="font-medium text-gray-700">{tarefa.lider}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-2.5 w-2.5" />
                              <span className="font-medium text-gray-700">{tarefa.prazo}</span>
                            </div>
                          </div>
                          {/* Badge com nome do projeto */}
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1.5 py-0 border-blue-200 bg-blue-50 text-blue-600 w-full justify-center mt-1"
                            title={`Projeto: ${tarefa.projectName}`}
                          >
                            {tarefa.projectName}
                          </Badge>
                        </div>
                      </Card>
                    ))
                  ) : (
                    <div className="flex items-center justify-center h-20 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                      <p className="text-[10px] text-muted-foreground">Vazio</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Paginação no Rodapé */}
      {totalTasks > 0 && (
        <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200">
          <div className="text-xs text-gray-600">
            Página <span className="font-semibold">{currentPage}</span> de{" "}
            <span className="font-semibold">{totalPages || 1}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              Anterior
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = i + 1
              return (
                <Button
                  key={pageNum}
                  size="sm"
                  variant={currentPage === pageNum ? "default" : "outline"}
                  className="h-8 w-8 p-0 text-xs"
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </Button>
              )
            })}
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
