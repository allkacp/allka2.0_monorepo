// @ts-nocheck
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, Clock, Eye, Download, Filter, AlertTriangle, Search, X } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PageHeader } from "@/components/page-header"

interface Task {
  id: string
  taskId: string
  title: string
  project: string
  client: string
  overallStatus: "pending" | "approved" | "rejected" | "in-progress"
  pendingStages: number
  totalStages: number
  isEmergency?: boolean
  isOverdue?: boolean
  nextDeadline: string
}

const taskColors = [
  { bg: "bg-blue-50", border: "border-blue-200", hover: "hover:bg-blue-100", gradient: "from-blue-500 to-blue-600" },
  {
    bg: "bg-purple-50",
    border: "border-purple-200",
    hover: "hover:bg-purple-100",
    gradient: "from-purple-500 to-purple-600",
  },
  {
    bg: "bg-green-50",
    border: "border-green-200",
    hover: "hover:bg-green-100",
    gradient: "from-green-500 to-green-600",
  },
  {
    bg: "bg-orange-50",
    border: "border-orange-200",
    hover: "hover:bg-orange-100",
    gradient: "from-orange-500 to-orange-600",
  },
  { bg: "bg-pink-50", border: "border-pink-200", hover: "hover:bg-pink-100", gradient: "from-pink-500 to-pink-600" },
  {
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    hover: "hover:bg-indigo-100",
    gradient: "from-indigo-500 to-indigo-600",
  },
  { bg: "bg-teal-50", border: "border-teal-200", hover: "hover:bg-teal-100", gradient: "from-teal-500 to-teal-600" },
  { bg: "bg-cyan-50", border: "border-cyan-200", hover: "hover:bg-cyan-100", gradient: "from-cyan-500 to-cyan-600" },
]

const getTaskColor = (index: number) => taskColors[index % taskColors.length]

export default function CompanyAprovacoesPage() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [dateFilter, setDateFilter] = useState<string>("all")
  const [showFilters, setShowFilters] = useState(false)

  const [tasks] = useState<Task[]>([
    {
      id: "1",
      taskId: "T19572",
      title: "Card Post Estático ou Motion (8 criativos + 8 copy)",
      project: "Sebrae CE",
      client: "Outros",
      overallStatus: "in-progress",
      pendingStages: 1,
      totalStages: 2,
      isEmergency: true,
      isOverdue: true,
      nextDeadline: "2025-10-07T18:00:00",
    },
    {
      id: "2",
      taskId: "T19580",
      title: "Desenvolvimento de Landing Page Responsiva",
      project: "Marketing Digital Pro",
      client: "TechStart",
      overallStatus: "pending",
      pendingStages: 3,
      totalStages: 3,
      isEmergency: false,
      isOverdue: false,
      nextDeadline: "2025-10-15T23:59:00",
    },
    {
      id: "3",
      taskId: "T19565",
      title: "Criação de Identidade Visual Completa",
      project: "Branding Solutions",
      client: "Fashion Store",
      overallStatus: "approved",
      pendingStages: 0,
      totalStages: 4,
      isEmergency: false,
      isOverdue: false,
      nextDeadline: "2025-10-20T23:59:00",
    },
  ])

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-500 text-white"
      case "rejected":
        return "bg-red-500 text-white"
      case "pending":
        return "bg-yellow-500 text-white"
      case "in-progress":
        return "bg-blue-500 text-white"
      default:
        return "bg-gray-500 text-white"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "approved":
        return "APROVADA"
      case "rejected":
        return "REJEITADA"
      case "pending":
        return "PENDENTE"
      case "in-progress":
        return "EM ANDAMENTO"
      default:
        return status.toUpperCase()
    }
  }

  const formatDeadline = (deadline: string) => {
    return new Date(deadline).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const isOverdue = (deadline: string) => {
    return new Date(deadline) < new Date()
  }

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.taskId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.project.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || task.overallStatus === statusFilter

    let matchesDate = true
    if (dateFilter === "overdue") {
      matchesDate = task.isOverdue === true
    } else if (dateFilter === "today") {
      const today = new Date().toDateString()
      matchesDate = new Date(task.nextDeadline).toDateString() === today
    } else if (dateFilter === "week") {
      const weekFromNow = new Date()
      weekFromNow.setDate(weekFromNow.getDate() + 7)
      matchesDate = new Date(task.nextDeadline) <= weekFromNow
    }

    return matchesSearch && matchesStatus && matchesDate
  })

  const totalPending = filteredTasks.filter((t) => t.pendingStages > 0).length
  const totalApproved = filteredTasks.filter((t) => t.overallStatus === "approved").length
  const totalRejected = filteredTasks.filter((t) => t.overallStatus === "rejected").length

  return (
    <div className="min-h-screen p-6 px-0 py-0 bg-slate-200">
      <div className="max-w-7xl bg-slate-200 mx-0 my-0 px-0 py-0 space-y-6">
        <PageHeader
          title="Aprovações"
          description="Gerencie aprovações de entregas e projetos"
          actions={
            <div className="flex items-center gap-3">
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
              <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="h-4 w-4 mr-2" />
                Filtros
                {(statusFilter !== "all" || dateFilter !== "all" || searchTerm) && (
                  <Badge className="ml-2 bg-blue-500 text-white">Ativos</Badge>
                )}
              </Button>
            </div>
          }
        />

        {showFilters && (
          <Card className="shadow-lg border-0 bg-white">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  <label className="text-sm font-medium">Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os status</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="in-progress">Em Andamento</SelectItem>
                      <SelectItem value="approved">Aprovada</SelectItem>
                      <SelectItem value="rejected">Rejeitada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Prazo</label>
                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os prazos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os prazos</SelectItem>
                      <SelectItem value="overdue">Atrasadas</SelectItem>
                      <SelectItem value="today">Hoje</SelectItem>
                      <SelectItem value="week">Próximos 7 dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button
                    variant="outline"
                    className="w-full bg-transparent"
                    onClick={() => {
                      setSearchTerm("")
                      setStatusFilter("all")
                      setDateFilter("all")
                    }}
                  >
                    Limpar Filtros
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
            <div className="bg-gradient-to-r from-yellow-500 to-orange-500 h-full">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white/90">Pendentes</p>
                    <p className="text-3xl font-bold text-white">{totalPending}</p>
                  </div>
                  <div className="bg-white/20 p-3 rounded-lg">
                    <Clock className="h-8 w-8 text-white" />
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
                    <p className="text-sm font-medium text-white/90">Aprovadas</p>
                    <p className="text-3xl font-bold text-white">{totalApproved}</p>
                  </div>
                  <div className="bg-white/20 p-3 rounded-lg">
                    <CheckCircle className="h-8 w-8 text-white" />
                  </div>
                </div>
              </CardContent>
            </div>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
            <div className="bg-gradient-to-r from-red-500 to-pink-500 h-full">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white/90">Rejeitadas</p>
                    <p className="text-3xl font-bold text-white">{totalRejected}</p>
                  </div>
                  <div className="bg-white/20 p-3 rounded-lg">
                    <XCircle className="h-8 w-8 text-white" />
                  </div>
                </div>
              </CardContent>
            </div>
          </Card>
        </div>

        <Card className="shadow-lg border-0 bg-white">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center text-sm">
                <Clock className="h-4 w-4 mr-2" />
                Lista de Tarefas
              </span>
              <span className="text-xs font-normal text-gray-500">
                {filteredTasks.length} {filteredTasks.length === 1 ? "tarefa" : "tarefas"}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {filteredTasks.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-xs">Nenhuma tarefa encontrada com os filtros aplicados</p>
              </div>
            ) : (
              filteredTasks.map((task, index) => {
                const bgColor = index % 2 === 0 ? "bg-blue-50" : "bg-gray-50"
                const borderColor = index % 2 === 0 ? "border-blue-200" : "border-gray-200"
                const hoverColor = index % 2 === 0 ? "hover:bg-blue-100" : "hover:bg-gray-100"

                return (
                  <div
                    key={task.id}
                    className={`flex items-center justify-between p-3 border ${borderColor} ${bgColor} ${hoverColor} rounded-lg transition-all cursor-pointer group`}
                    onClick={() => navigate(`/company/aprovacoes/${task.id}`)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-sm group-hover:text-blue-600 transition-colors truncate">
                            [{task.taskId}] {task.title}
                          </h3>
                          {task.isEmergency && (
                            <Badge className="bg-red-500 text-white text-xs px-1.5 py-0">EMERGENCIAL</Badge>
                          )}
                          {task.isOverdue && (
                            <div className="flex items-center gap-1 text-red-600 text-xs">
                              <AlertTriangle className="h-3 w-3" />
                              <span>Atrasado</span>
                            </div>
                          )}
                          <Badge className={getStatusBadgeClass(task.overallStatus)} size="sm">
                            {getStatusLabel(task.overallStatus)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600 mt-0.5 flex-wrap">
                          <span>{task.project}</span>
                          <span>•</span>
                          <span>{task.client}</span>
                          <span>•</span>
                          <span>
                            {task.pendingStages}/{task.totalStages} etapas
                          </span>
                          {task.nextDeadline && (
                            <>
                              <span>•</span>
                              <span className={isOverdue(task.nextDeadline) ? "text-red-600 font-medium" : ""}>
                                {formatDeadline(task.nextDeadline)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="group-hover:bg-blue-600 group-hover:text-white bg-transparent text-xs ml-3 flex-shrink-0"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Ver
                    </Button>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
