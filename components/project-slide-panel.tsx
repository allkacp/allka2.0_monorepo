
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { X, User, Users, DollarSign, Calendar, ListChecks, AlertCircle, FolderKanban, Clock, Download, FileText, CheckCircle2, ChevronRight, Star, Edit } from 'lucide-react'
import { type Project } from "@/lib/api"
import { cn } from "@/lib/utils"
import React from "react"
import { TaskDetailSlidePanel } from "@/components/task-detail-slide-panel"
import { useSidebar } from "@/contexts/sidebar-context"
import { PaymentConfiguration } from "@/components/payment-configuration"

interface TaskItem {
  id: string
  title: string
  completed: boolean
  deliverable?: string
  approved?: boolean
  approvedAt?: string
}

interface TaskFile {
  id: string
  name: string
  size: string
  uploadedAt: string
}

interface Task {
  id: string
  title: string
  description?: string
  status: string
  priority: string
  assignee: string
  dueDate: string
  items?: TaskItem[]
  files?: TaskFile[]
}

interface ProjectFile {
  id: string
  name: string
  type: string
  size: string
  uploadedAt: string
  uploadedBy: string
  approved?: boolean
  approvedAt?: string
}

interface ProjectSlidePanelProps {
  open: boolean
  onClose: () => void
  onEdit?: () => void
  project?: Project
  tasks?: Task[]
  files?: ProjectFile[]
}

const statusColors = {
  planning: "bg-blue-100 text-blue-800",
  active: "bg-green-100 text-green-800",
  on_hold: "bg-yellow-100 text-yellow-800",
  completed: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
}

const statusLabels = {
  planning: "Planejamento",
  active: "Ativo",
  on_hold: "Em Espera",
  completed: "Concluído",
  cancelled: "Cancelado",
}

const priorityColors = {
  high: "text-red-600 bg-red-50",
  medium: "text-yellow-600 bg-yellow-50",
  low: "text-blue-600 bg-blue-50",
}

const priorityLabels = {
  high: "Alta",
  medium: "Média",
  low: "Baixa",
}

const taskStatusColors = {
  pending: "text-gray-600 bg-gray-100",
  in_progress: "text-blue-600 bg-blue-100",
  completed: "text-green-600 bg-green-100",
}

const taskStatusLabels = {
  pending: "Pendente",
  in_progress: "Em Progresso",
  completed: "Concluída",
}

export function ProjectSlidePanel({ open, onClose, onEdit, project, tasks = [], files = [] }: ProjectSlidePanelProps) {
  const { sidebarCollapsed } = useSidebar()
  const [activeTab, setActiveTab] = React.useState<"overview" | "tasks" | "approved" | "files" | "payments">("overview")
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null)
  const [selectedProductFilter, setSelectedProductFilter] = React.useState<string>("all")
  const [selectedTaskFilter, setSelectedTaskFilter] = React.useState<string>("all")
  const [expandedProducts, setExpandedProducts] = React.useState<Record<string, boolean>>({})
  const [expandedTasks, setExpandedTasks] = React.useState<Record<string, boolean>>({})

  const formatCurrency = (value?: number) => {
    if (!value) return "-"
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-"
    return new Date(dateString).toLocaleDateString("pt-BR")
  }

  const getTaskStats = () => {
    const completed = tasks.filter(t => t.status === "completed").length
    const total = tasks.length
    const progress = total > 0 ? (completed / total) * 100 : 0
    return { completed, total, progress }
  }

  const getFileIcon = (type: string) => {
    if (type.includes("pdf")) return "📄"
    if (type.includes("image")) return "🖼️"
    if (type.includes("doc")) return "📝"
    return "📎"
  }

  const toggleTaskExpansion = (taskId: string) => {
    setExpandedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }))
  }

  const getTaskRating = (status: string) => {
    return status === "completed" ? 5 : 0
  }

  const getApprovalStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-green-500 text-white hover:bg-green-600"
      case "pending": return "bg-yellow-500 text-white hover:bg-yellow-600"
      case "rejected": return "bg-red-500 text-white hover:bg-red-600"
      default: return "bg-blue-500 text-white hover:bg-blue-600"
    }
  }

  const getApprovalStatusLabel = (status: string) => {
    switch (status) {
      case "approved": return "APROVADO"
      case "pending": return "PENDENTE"
      case "rejected": return "REJEITADO"
      default: return "ARQUIVO"
    }
  }

  const approvedFilesByTask = React.useMemo(() => {
    const result: Record<string, any[]> = {}
    
    tasks.forEach(task => {
      if (task.items) {
        task.items.forEach(item => {
          if (item.completed && item.deliverable) {
            if (!result[task.id]) {
              result[task.id] = []
            }
            result[task.id].push({
              taskTitle: task.title,
              itemTitle: item.title,
              fileName: item.deliverable,
              approvedAt: item.approvedAt,
            })
          }
        })
      }
    })
    
    return result
  }, [tasks])

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task)
    // Don't close the project panel, just layer the task panel on top
  }

  const handleTaskPanelClose = () => {
    setSelectedTask(null)
  }

  const leftPosition = sidebarCollapsed ? "left-16" : "left-64"

  const getProductsWithTasks = () => {
    const products = [
      {
        id: "prod1",
        name: "Desenvolvimento de Landing Page",
        tasks: tasks.filter(t => t.priority === "high"),
      },
      {
        id: "prod2", 
        name: "Sistema de Gestão",
        tasks: tasks.filter(t => t.priority === "medium"),
      },
      {
        id: "prod3",
        name: "App Mobile",
        tasks: tasks.filter(t => t.priority === "low"),
      },
    ].filter(p => p.tasks.length > 0)
    
    return products
  }

  const getProductProgress = (productTasks: Task[]) => {
    if (productTasks.length === 0) return 0
    const completed = productTasks.filter(t => t.status === "completed").length
    return (completed / productTasks.length) * 100
  }

  const getTaskProgress = (task: Task) => {
    if (!task.items || task.items.length === 0) return task.status === "completed" ? 100 : 0
    const completed = task.items.filter(i => i.completed).length
    return (completed / task.items.length) * 100
  }

  const getStepStatusBadge = (item: TaskItem) => {
    if (item.completed) {
      return <Badge className="bg-green-500 text-white text-xs px-2 py-0.5">Finalizada</Badge>
    }
    return <Badge className="bg-blue-500 text-white text-xs px-2 py-0.5">Em Execução</Badge>
  }

  const toggleProduct = (productId: string) => {
    setExpandedProducts(prev => ({ ...prev, [productId]: !prev[productId] }))
  }

  const toggleTaskInProgress = (taskId: string) => {
    setExpandedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }))
  }

  if (!project) return null

  return (
    <>
      <div
        className={cn(
          "fixed top-0 right-0 bottom-0 bg-black/60 backdrop-blur-sm transition-all duration-300 z-40",
          open && !selectedTask ? "opacity-100" : "opacity-0 pointer-events-none",
          leftPosition
        )}
        onClick={onClose}
      />

      <div
        className={cn(
          "fixed top-0 right-0 h-[calc(100%-32px)] bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-gray-200 dark:border-gray-800 z-50",
          "transition-transform duration-500 ease-in-out",
          leftPosition,
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-blue-50/50 via-purple-50/30 to-pink-50/50 dark:from-blue-950/20 dark:via-purple-950/10 dark:to-pink-950/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
              <FolderKanban className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{project.name}</h2>
                <Badge className={statusColors[project.status as keyof typeof statusColors]}>
                  {statusLabels[project.status as keyof typeof statusLabels]}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{project.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={onEdit}
                className="flex items-center gap-2 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 bg-transparent"
              >
                <Edit className="h-4 w-4" />
                <span className="text-sm font-medium">Editar</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="shrink-0 hover:bg-white/50 dark:hover:bg-gray-800"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="flex border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
          <button
            onClick={() => setActiveTab("overview")}
            className={cn(
              "flex-1 px-3 py-3 text-sm font-semibold transition-all relative",
              activeTab === "overview"
                ? "text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100/50 dark:hover:bg-gray-800/50",
            )}
          >
            <div className="flex items-center justify-center gap-2">
              <FolderKanban className="h-4 w-4" />
              Visão Geral
            </div>
            {activeTab === "overview" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-600" />}
          </button>
          <button
            onClick={() => setActiveTab("tasks")}
            className={cn(
              "flex-1 px-3 py-3 text-sm font-semibold transition-all relative",
              activeTab === "tasks"
                ? "text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100/50 dark:hover:bg-gray-800/50",
            )}
          >
            <div className="flex items-center justify-center gap-2">
              <ListChecks className="h-4 w-4" />
              Tarefas {tasks.length > 0 && `(${tasks.length})`}
            </div>
            {activeTab === "tasks" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-600" />}
          </button>
          <button
            onClick={() => setActiveTab("approved")}
            className={cn(
              "flex-1 px-3 py-3 text-sm font-semibold transition-all relative",
              activeTab === "approved"
                ? "text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100/50 dark:hover:bg-gray-800/50",
            )}
          >
            <div className="flex items-center justify-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Aprovados
            </div>
            {activeTab === "approved" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-600" />}
          </button>
          <button
            onClick={() => setActiveTab("files")}
            className={cn(
              "flex-1 px-3 py-3 text-sm font-semibold transition-all relative",
              activeTab === "files"
                ? "text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100/50 dark:hover:bg-gray-800/50",
            )}
          >
            <div className="flex items-center justify-center gap-2">
              <FileText className="h-4 w-4" />
              Arquivos
            </div>
            {activeTab === "files" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-600" />}
          </button>
          <button
            onClick={() => setActiveTab("payments")}
            className={cn(
              "flex-1 px-3 py-3 text-sm font-semibold transition-all relative",
              activeTab === "payments"
                ? "text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100/50 dark:hover:bg-gray-800/50",
            )}
          >
            <div className="flex items-center justify-center gap-2">
              <DollarSign className="h-4 w-4" />
              Pagamentos
            </div>
            {activeTab === "payments" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-600" />}
          </button>
        </div>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="p-5">
            {activeTab === "overview" && (
              <div className="space-y-4">
                <Card className="border-l-4 border-l-blue-500 shadow-sm">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <User className="w-4 h-4 text-blue-600" />
                          <span className="text-xs text-gray-600 font-medium">Cliente</span>
                        </div>
                        <p className="font-semibold text-sm">{project.client?.name}</p>
                        <p className="text-xs text-gray-500">{project.client?.email}</p>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Users className="w-4 h-4 text-purple-600" />
                          <span className="text-xs text-gray-600 font-medium">Gerente</span>
                        </div>
                        <p className="font-semibold text-sm">{project.manager?.name}</p>
                        <p className="text-xs text-gray-500">{project.manager?.email}</p>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <DollarSign className="w-4 h-4 text-green-600" />
                          <span className="text-xs text-gray-600 font-medium">Orçamento</span>
                        </div>
                        <p className="text-lg font-bold text-green-600">
                          {formatCurrency(project.budget)}
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Calendar className="w-4 h-4 text-orange-600" />
                          <span className="text-xs text-gray-600 font-medium">Período</span>
                        </div>
                        <p className="text-xs">
                          {formatDate(project.start_date)} - {formatDate(project.end_date)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {tasks.length > 0 && (
                  <>
                    <Separator className="dark:bg-gray-800" />
                    <Card className="border-l-4 border-l-indigo-500 shadow-sm">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          <ListChecks className="w-5 h-5 text-indigo-600" />
                          <CardTitle className="text-base">Progresso do Projeto</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {getProductsWithTasks().map((product) => {
                          const productProgress = getProductProgress(product.tasks)
                          const isExpanded = expandedProducts[product.id]

                          return (
                            <div key={product.id} className="border rounded-lg overflow-hidden">
                              {/* Product Header */}
                              <button
                                onClick={() => toggleProduct(product.id)}
                                className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 transition-colors"
                              >
                                <div className="flex items-center gap-3 flex-1">
                                  <div className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                                    <ChevronRight className="w-4 h-4 text-indigo-600" />
                                  </div>
                                  <div className="flex-1 text-left">
                                    <h4 className="font-semibold text-sm text-gray-900">{product.name}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                      <Progress value={productProgress} className="h-1.5 flex-1 max-w-[200px]" />
                                      <span className="text-xs font-medium text-indigo-600">{productProgress.toFixed(0)}%</span>
                                    </div>
                                  </div>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {product.tasks.filter(t => t.status === "completed").length}/{product.tasks.length} tarefas
                                </Badge>
                              </button>

                              {/* Product Tasks */}
                              {isExpanded && (
                                <div className="p-3 space-y-2 bg-white">
                                  {product.tasks.map((task) => {
                                    const taskProgress = getTaskProgress(task)
                                    const isTaskExpanded = expandedTasks[task.id]

                                    return (
                                      <div key={task.id} className="border rounded-md overflow-hidden">
                                        {/* Task Header */}
                                        <button
                                          onClick={() => toggleTaskInProgress(task.id)}
                                          className="w-full flex items-center justify-between p-2.5 bg-gray-50 hover:bg-gray-100 transition-colors"
                                        >
                                          <div className="flex items-center gap-2 flex-1">
                                            <div className={`transform transition-transform ${isTaskExpanded ? 'rotate-90' : ''}`}>
                                              <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                                            </div>
                                            <div className="flex-1 text-left">
                                              <p className="font-medium text-sm text-gray-900">{task.title}</p>
                                              <div className="flex items-center gap-2 mt-1">
                                                <Progress value={taskProgress} className="h-1 flex-1 max-w-[150px]" />
                                                <span className="text-xs text-gray-600">{taskProgress.toFixed(0)}%</span>
                                              </div>
                                            </div>
                                          </div>
                                          <Badge className={taskStatusColors[task.status as keyof typeof taskStatusColors]}>
                                            {taskStatusLabels[task.status as keyof typeof taskStatusLabels]}
                                          </Badge>
                                        </button>

                                        {/* Task Steps/Items */}
                                        {isTaskExpanded && task.items && task.items.length > 0 && (
                                          <div className="p-2 bg-white space-y-1.5">
                                            <p className="text-xs font-semibold text-gray-500 uppercase px-2">Etapas</p>
                                            {task.items.map((item) => (
                                              <div
                                                key={item.id}
                                                className="flex items-center justify-between p-2 rounded hover:bg-gray-50 transition-colors"
                                              >
                                                <div className="flex items-center gap-2 flex-1">
                                                  {item.completed ? (
                                                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                                                  ) : (
                                                    <Clock className="w-4 h-4 text-blue-500 shrink-0" />
                                                  )}
                                                  <span className="text-sm text-gray-700">{item.title}</span>
                                                </div>
                                                {getStepStatusBadge(item)}
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            )}

            {activeTab === "tasks" && (
              <div className="space-y-3">
                {tasks.length > 0 ? (
                  <>
                    {tasks.map((task) => (
                      <Card 
                        key={task.id} 
                        className="hover:shadow-md transition-all border-l-4 border-l-blue-400 shadow-sm cursor-pointer"
                        onClick={() => handleTaskClick(task)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                {task.title}
                                {task.status === "completed" && (
                                  <div className="flex gap-0.5">
                                    {[...Array(5)].map((_, i) => (
                                      <Star key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                                    ))}
                                  </div>
                                )}
                                <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
                              </h4>
                              <div className="flex flex-wrap items-center gap-4">
                                <Badge className={`${taskStatusColors[task.status as keyof typeof taskStatusColors]} text-4xl px-9 py-7 rounded-lg font-semibold`}>
                                  {taskStatusLabels[task.status as keyof typeof taskStatusLabels]}
                                </Badge>
                                <Badge className={`${priorityColors[task.priority as keyof typeof priorityColors]} text-4xl px-9 py-7 rounded-lg font-semibold`}>
                                  {priorityLabels[task.priority as keyof typeof priorityLabels]}
                                </Badge>
                                <span className="text-gray-600 flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {task.assignee}
                                </span>
                                <span className="text-gray-600 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {formatDate(task.dueDate)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </>
                ) : (
                  <Card className="border-2 border-dashed shadow-sm">
                    <CardContent className="p-8 text-center">
                      <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 font-semibold mb-1">Nenhuma tarefa cadastrada</p>
                      <p className="text-xs text-gray-500">
                        As tarefas deste projeto aparecerão aqui quando forem criadas
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {activeTab === "approved" && (
              <div>
                {Object.keys(approvedFilesByTask).length > 0 ? (
                  <Card className="border-l-4 border-l-emerald-500 shadow-sm">
                    <CardContent className="p-4">
                      <div className="space-y-3 mb-4">
                        <div>
                          <label className="text-xs font-medium text-gray-600 mb-2 block">Filtrar por Tarefa (Produto)</label>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant={selectedTaskFilter === "all" ? "default" : "outline"}
                              size="sm"
                              onClick={() => setSelectedTaskFilter("all")}
                              className={selectedTaskFilter === "all" ? "bg-emerald-500 hover:bg-emerald-600" : ""}
                            >
                              Todas
                            </Button>
                            {Object.keys(approvedFilesByTask).map((taskId) => {
                              const taskTitle = approvedFilesByTask[taskId][0]?.taskTitle
                              return (
                                <Button
                                  key={taskId}
                                  variant={selectedTaskFilter === taskId ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setSelectedTaskFilter(taskId)}
                                  className={selectedTaskFilter === taskId ? "bg-emerald-500 hover:bg-emerald-600" : ""}
                                >
                                  {taskTitle}
                                </Button>
                              )
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {selectedTaskFilter === "all" ? (
                          Object.entries(approvedFilesByTask).map(([taskId, taskFiles]) => (
                            <div key={taskId} className="space-y-2">
                              <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-md mt-2">
                                Produto: {taskFiles[0].taskTitle}
                              </p>
                              {taskFiles.map((file, idx) => (
                                <div 
                                  key={idx}
                                  className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors border border-emerald-200"
                                >
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">{file.fileName}</p>
                                      <p className="text-xs text-gray-500">
                                        <span className="font-medium">Etapa:</span> {file.itemTitle}
                                        {file.approvedAt && ` • Aprovado em ${formatDate(file.approvedAt)}`}
                                      </p>
                                    </div>
                                  </div>
                                  <Button size="sm" variant="ghost" className="shrink-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100">
                                    <Download className="w-4 h-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ))
                        ) : (
                          <>
                            {approvedFilesByTask[selectedTaskFilter] && (
                              <>
                                <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-md mb-2">
                                  Produto: {approvedFilesByTask[selectedTaskFilter][0].taskTitle}
                                </p>
                                {approvedFilesByTask[selectedTaskFilter].map((file, idx) => (
                                  <div 
                                    key={idx}
                                    className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors border border-emerald-200"
                                  >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{file.fileName}</p>
                                        <p className="text-xs text-gray-500">
                                          <span className="font-medium">Etapa:</span> {file.itemTitle}
                                          {file.approvedAt && ` • Aprovado em ${formatDate(file.approvedAt)}`}
                                        </p>
                                      </div>
                                    </div>
                                    <Button size="sm" variant="ghost" className="shrink-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100">
                                      <Download className="w-4 h-4" />
                                    </Button>
                                  </div>
                                ))}
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-2 border-dashed shadow-sm">
                    <CardContent className="p-8 text-center">
                      <CheckCircle2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 font-semibold mb-1">Nenhum arquivo aprovado</p>
                      <p className="text-xs text-gray-500">
                        Os arquivos aprovados aparecerão aqui
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {activeTab === "files" && (
              <div>
                {files.length > 0 ? (
                  <Card className="border-l-4 border-l-pink-500 shadow-sm">
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        {files.map((file) => (
                          <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <span className="text-2xl">{getFileIcon(file.type)}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{file.name}</p>
                                <p className="text-xs text-gray-500">
                                  {file.size} • {formatDate(file.uploadedAt)} • {file.uploadedBy}
                                </p>
                              </div>
                            </div>
                            <Button size="sm" variant="ghost" className="shrink-0">
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-2 border-dashed shadow-sm">
                    <CardContent className="p-8 text-center">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 font-semibold mb-1">Nenhum arquivo do projeto</p>
                      <p className="text-xs text-gray-500">
                        Os arquivos do projeto aparecerão aqui
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {activeTab === "payments" && (
              <PaymentConfiguration projectId={project.id} projectName={project.name} />
            )}
          </div>
        </ScrollArea>
      </div>

      <TaskDetailSlidePanel
        open={!!selectedTask}
        onClose={handleTaskPanelClose}
        task={selectedTask || undefined}
      />
    </>
  )
}
