// @ts-nocheck
import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import {
  Eye,
  Search,
  Filter,
  Calendar,
  Repeat,
  Zap,
  Building2,
  CheckCircle2,
  Clock,
  AlertCircle,
  User,
  DollarSign,
} from "lucide-react"
import type { Agency } from "@/types/agency"

const mockTasks = [
  {
    id: 1,
    project_id: 1,
    name: "Design Homepage",
    status: "completed",
    assignee: "João Silva",
    due_date: "2024-01-20",
  },
  {
    id: 2,
    project_id: 1,
    name: "Develop Frontend",
    status: "in_progress",
    assignee: "Maria Santos",
    due_date: "2024-02-15",
  },
  {
    id: 3,
    project_id: 1,
    name: "Backend Integration",
    status: "in_progress",
    assignee: "Pedro Costa",
    due_date: "2024-02-28",
  },
  { id: 4, project_id: 1, name: "Testing & QA", status: "pending", assignee: "Ana Lima", due_date: "2024-03-10" },
  {
    id: 5,
    project_id: 1,
    name: "Deploy to Production",
    status: "pending",
    assignee: "Carlos Souza",
    due_date: "2024-03-15",
  },
  { id: 6, project_id: 2, name: "UI/UX Design", status: "completed", assignee: "João Silva", due_date: "2023-11-15" },
  {
    id: 7,
    project_id: 2,
    name: "Mobile Development",
    status: "completed",
    assignee: "Maria Santos",
    due_date: "2023-12-20",
  },
  {
    id: 8,
    project_id: 2,
    name: "App Store Submission",
    status: "completed",
    assignee: "Pedro Costa",
    due_date: "2024-01-30",
  },
  { id: 9, project_id: 3, name: "Brand Research", status: "pending", assignee: "Ana Lima", due_date: "2024-02-10" },
  { id: 10, project_id: 3, name: "Logo Design", status: "pending", assignee: "Carlos Souza", due_date: "2024-02-20" },
]

const mockProjects = [
  {
    id: 1,
    name: "Website Redesign - TechCorp",
    client: "TechCorp Solutions",
    status: "active",
    value: 15000,
    commission: 2250,
    start_date: "2024-01-15",
    end_date: "2024-03-15",
    progress: 65,
    project_type: "monthly",
    description: "Complete redesign of corporate website with modern UI/UX and responsive design.",
  },
  {
    id: 2,
    name: "Mobile App Development",
    client: "StartupXYZ",
    status: "completed",
    value: 25000,
    commission: 3750,
    start_date: "2023-11-01",
    end_date: "2024-01-30",
    progress: 100,
    project_type: "one-time",
    description: "Native mobile application for iOS and Android with real-time features.",
  },
  {
    id: 3,
    name: "Brand Identity Package",
    client: "Fashion Brand Co",
    status: "pending",
    value: 8000,
    commission: 1200,
    start_date: "2024-02-01",
    end_date: "2024-04-01",
    progress: 0,
    project_type: "both",
    description: "Complete brand identity including logo, color palette, and brand guidelines.",
  },
]

const mockLedAgencies = [
  {
    id: 1,
    name: "Digital Creators Hub",
    status: "active",
    total_spent: 45000,
    mrr: 3500,
    projects_count: 12,
    last_access: "2024-01-25T10:00:00Z",
    join_date: "2023-06-15",
  },
  {
    id: 2,
    name: "Creative Solutions Ltd",
    status: "active",
    total_spent: 32000,
    mrr: 2800,
    projects_count: 8,
    last_access: "2024-01-24T15:30:00Z",
    join_date: "2023-08-20",
  },
  {
    id: 3,
    name: "Marketing Pro Agency",
    status: "overdue",
    total_spent: 18000,
    mrr: 1500,
    projects_count: 5,
    last_access: "2024-01-10T09:00:00Z",
    join_date: "2023-10-05",
  },
]

interface AgencyProjectsProps {
  agency: Agency
  showLedAgencies?: boolean
}

export function AgencyProjects({ agency, showLedAgencies = false }: AgencyProjectsProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedProject, setSelectedProject] = useState<(typeof mockProjects)[0] | null>(null)

  console.log("[v0] AgencyProjects rendered", {
    showLedAgencies,
    agencyId: agency.id,
    projectsCount: mockProjects.length,
  })

  if (showLedAgencies && !agency.is_partner) {
    console.log("[v0] Not showing led agencies - agency is not a partner")
    return null
  }

  const data = showLedAgencies ? mockLedAgencies : mockProjects
  const filteredData = data.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || item.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const projectTasks = selectedProject ? mockTasks.filter((t) => t.project_id === selectedProject.id) : []
  const completedTasks = projectTasks.filter((t) => t.status === "completed").length

  console.log("[v0] Filtered data count:", filteredData.length)

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-100 text-emerald-700 border-emerald-200"
      case "completed":
        return "bg-blue-100 text-blue-700 border-blue-200"
      case "pending":
        return "bg-amber-100 text-amber-700 border-amber-200"
      case "overdue":
        return "bg-rose-100 text-rose-700 border-rose-200"
      case "in_progress":
        return "bg-blue-100 text-blue-700 border-blue-200"
      default:
        return "bg-slate-100 text-slate-700 border-slate-200"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "Ativo"
      case "completed":
        return "Concluído"
      case "pending":
        return "Pendente"
      case "overdue":
        return "Inadimplente"
      case "in_progress":
        return "Em Andamento"
      default:
        return status
    }
  }

  const getProjectTypeIcon = (projectType?: string) => {
    switch (projectType) {
      case "monthly":
        return <Repeat className="h-4 w-4 text-blue-500" />
      case "one-time":
        return <Zap className="h-4 w-4 text-purple-500" />
      case "both":
        return <Calendar className="h-4 w-4 text-emerald-500" />
      default:
        return <Calendar className="h-4 w-4 text-slate-500" />
    }
  }

  const getProjectTypeLabel = (projectType?: string) => {
    switch (projectType) {
      case "monthly":
        return "Mensal"
      case "one-time":
        return "Avulso"
      case "both":
        return "Mensal + Avulso"
      default:
        return "Não definido"
    }
  }

  const getTaskStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      case "in_progress":
        return <Clock className="h-4 w-4 text-blue-500" />
      case "pending":
        return <AlertCircle className="h-4 w-4 text-amber-500" />
      default:
        return <Clock className="h-4 w-4 text-slate-500" />
    }
  }

  return (
    <div className="space-y-6 px-0">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
          <Input
            placeholder={`Buscar ${showLedAgencies ? "agências" : "projetos"}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border-slate-300 dark:border-slate-700"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48 border-slate-300 dark:border-slate-700">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="completed">Concluído</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            {showLedAgencies && <SelectItem value="overdue">Inadimplente</SelectItem>}
          </SelectContent>
        </Select>
      </div>

      {/* Data Grid */}
      <div className="grid gap-3 w-full">
        {filteredData.map((item) => (
          <Card
            key={item.id}
            className="hover:shadow-lg transition-all border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 w-full"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-md">
                    {showLedAgencies ? <Building2 className="h-6 w-6" /> : item.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">{item.name}</h3>
                      {!showLedAgencies && (
                        <Badge variant="outline" className="gap-1 text-xs flex-shrink-0">
                          {getProjectTypeIcon(item.project_type)}
                          <span className="hidden sm:inline">{getProjectTypeLabel(item.project_type)}</span>
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
                      {showLedAgencies
                        ? `Membro desde ${new Date(item.join_date).toLocaleDateString()}`
                        : `Cliente: ${item.client}`}
                    </p>
                  </div>
                </div>

                <div className="hidden md:flex items-center gap-6 flex-shrink-0">
                  {showLedAgencies ? (
                    <>
                      <div className="text-center">
                        <div className="text-xs text-slate-500 dark:text-slate-400">Total Gasto</div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          R$ {item.total_spent.toLocaleString()}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-slate-500 dark:text-slate-400">MRR</div>
                        <div className="font-semibold text-emerald-600">R$ {item.mrr.toLocaleString()}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-slate-500 dark:text-slate-400">Projetos</div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{item.projects_count}</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-center">
                        <div className="text-xs text-slate-500 dark:text-slate-400">Valor</div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          R$ {item.value.toLocaleString()}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-slate-500 dark:text-slate-400">Comissão</div>
                        <div className="font-semibold text-emerald-600">R$ {item.commission.toLocaleString()}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-slate-500 dark:text-slate-400">Progresso</div>
                        <div className="font-semibold text-blue-600">{item.progress}%</div>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge className={getStatusColor(item.status)}>{getStatusLabel(item.status)}</Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 bg-transparent"
                    onClick={() => !showLedAgencies && setSelectedProject(item)}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Ver</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredData.length === 0 && (
        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="text-center py-12">
            <div className="text-slate-500 dark:text-slate-400">
              {showLedAgencies ? "Nenhuma agência liderada encontrada" : "Nenhum projeto encontrado"}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={selectedProject !== null} onOpenChange={() => setSelectedProject(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                {selectedProject?.name.charAt(0)}
              </div>
              {selectedProject?.name}
            </DialogTitle>
            <DialogDescription>{selectedProject?.description}</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Project Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                <Building2 className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Cliente</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{selectedProject?.client}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                <div className="p-1.5 rounded bg-slate-200 dark:bg-slate-800">
                  {selectedProject && getProjectTypeIcon(selectedProject.project_type)}
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Tipo</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {selectedProject && getProjectTypeLabel(selectedProject.project_type)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                <DollarSign className="h-5 w-5 text-emerald-500" />
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Valor do Projeto</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    R$ {selectedProject?.value.toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                <DollarSign className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Comissão</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    R$ {selectedProject?.commission.toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                <Calendar className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Data de Início</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {selectedProject && new Date(selectedProject.start_date).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                <Calendar className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Data de Término</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {selectedProject && new Date(selectedProject.end_date).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
            </div>

            {/* Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-slate-900 dark:text-slate-100">Progresso do Projeto</h4>
                <span className="text-sm font-medium text-blue-600">{selectedProject?.progress}%</span>
              </div>
              <Progress value={selectedProject?.progress || 0} className="h-2" />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {completedTasks} de {projectTasks.length} tarefas concluídas
              </p>
            </div>

            {/* Tasks */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-blue-500" />
                Tarefas do Projeto ({projectTasks.length})
              </h3>
              {projectTasks.length > 0 ? (
                <div className="space-y-2">
                  {projectTasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="mt-0.5">{getTaskStatusIcon(task.status)}</div>
                          <div className="flex-1">
                            <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-1">{task.name}</h4>
                            <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                              <span className="flex items-center gap-1">
                                <User className="h-3.5 w-3.5" />
                                {task.assignee}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                {new Date(task.due_date).toLocaleDateString("pt-BR")}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Badge className={getStatusColor(task.status)}>{getStatusLabel(task.status)}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma tarefa cadastrada</p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedProject(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
