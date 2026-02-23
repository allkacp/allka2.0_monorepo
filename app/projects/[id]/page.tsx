// @ts-nocheck
import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { type Project, type Task, apiClient } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Edit, Plus, Target, History, ShoppingBag } from "lucide-react"
import { Link } from "react-router-dom"
import ProjectConfigurationModal from "@/components/project-configuration/project-configuration-modal"
import TacticalPlanModal from "@/components/tactical-plan/tactical-plan-modal"
import ProjectHistoryTab from "@/components/project-history/project-history-tab"
import ProjectPurchasesTab from "@/components/project-purchases/project-purchases-tab"
import { Settings } from "lucide-react"

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

const taskStatusColors = {
  todo: "bg-gray-100 text-gray-800",
  in_progress: "bg-blue-100 text-blue-800",
  review: "bg-yellow-100 text-yellow-800",
  done: "bg-green-100 text-green-800",
}

const taskStatusLabels = {
  todo: "A Fazer",
  in_progress: "Em Progresso",
  review: "Em Revisão",
  done: "Concluído",
}

const priorityColors = {
  low: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800",
}

const priorityLabels = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  urgent: "Urgente",
}

export default function ProjectDetailPage() {
  const params = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [tasksLoading, setTasksLoading] = useState(false)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [showTacticalPlanModal, setShowTacticalPlanModal] = useState(false)

  const projectId = Number.parseInt(params.id as string)

  useEffect(() => {
    if (projectId) {
      loadProject()
      loadTasks()
    }
  }, [projectId])

  const loadProject = async () => {
    try {
      setLoading(true)
      const data = await apiClient.getProject(projectId)
      setProject(data)
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao carregar projeto",
        variant: "destructive",
      })
      navigate("/projects")
    } finally {
      setLoading(false)
    }
  }

  const loadTasks = async () => {
    try {
      setTasksLoading(true)
      const data = await apiClient.getProjectTasks(projectId)
      setTasks(data)
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao carregar tarefas",
        variant: "destructive",
      })
    } finally {
      setTasksLoading(false)
    }
  }

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

  const canCreateTacticalPlan = () => {
    // Check if project has been paid for
    return project?.status === "active" && project?.payment_status === "paid"
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Carregando projeto...</div>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Projeto não encontrado</div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/projects">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">{project.name}</h1>
          <Badge className={statusColors[project.status]}>{statusLabels[project.status]}</Badge>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setShowTacticalPlanModal(true)}
            disabled={!canCreateTacticalPlan()}
            className={canCreateTacticalPlan() ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100" : ""}
          >
            <Target className="w-4 h-4 mr-2" />
            {canCreateTacticalPlan() ? "Criar Plano Tático" : "Plano Tático (Pague o projeto)"}
          </Button>
          <Button variant="outline" onClick={() => setShowConfigModal(true)}>
            <Settings className="w-4 h-4 mr-2" />
            Configurações
          </Button>
          <Button>
            <Edit className="w-4 h-4 mr-2" />
            Editar Projeto
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            Histórico
          </TabsTrigger>
          <TabsTrigger value="purchases">
            <ShoppingBag className="h-4 w-4 mr-2" />
            Compras
          </TabsTrigger>
          <TabsTrigger value="tasks">Tarefas</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Project Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informações Gerais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <span className="font-medium">Cliente:</span> {project.client?.name || "-"}
                </div>
                <div>
                  <span className="font-medium">Gerente:</span> {project.manager?.name || "-"}
                </div>
                <div>
                  <span className="font-medium">Orçamento:</span> {formatCurrency(project.budget)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Cronograma</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <span className="font-medium">Data de Início:</span> {formatDate(project.start_date)}
                </div>
                <div>
                  <span className="font-medium">Data de Fim:</span> {formatDate(project.end_date)}
                </div>
                <div>
                  <span className="font-medium">Criado em:</span> {formatDate(project.created_at)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Estatísticas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <span className="font-medium">Total de Tarefas:</span> {tasks.length}
                </div>
                <div>
                  <span className="font-medium">Concluídas:</span> {tasks.filter((t) => t.status === "done").length}
                </div>
                <div>
                  <span className="font-medium">Em Progresso:</span>{" "}
                  {tasks.filter((t) => t.status === "in_progress").length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Description */}
          {project.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Descrição</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">{project.description}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history">
          <ProjectHistoryTab projectId={projectId.toString()} />
        </TabsContent>

        <TabsContent value="purchases">
          <ProjectPurchasesTab projectId={projectId.toString()} />
        </TabsContent>

        <TabsContent value="tasks">
          {/* Tasks */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Tarefas</CardTitle>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Tarefa
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {tasksLoading ? (
                <div className="text-center py-8">Carregando tarefas...</div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Título</TableHead>
                        <TableHead>Responsável</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Prioridade</TableHead>
                        <TableHead>Prazo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tasks.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            Nenhuma tarefa cadastrada
                          </TableCell>
                        </TableRow>
                      ) : (
                        tasks.map((task) => (
                          <TableRow key={task.id}>
                            <TableCell className="font-medium">{task.title}</TableCell>
                            <TableCell>{task.assignee?.name || "-"}</TableCell>
                            <TableCell>
                              <Badge className={taskStatusColors[task.status]}>{taskStatusLabels[task.status]}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={priorityColors[task.priority]}>{priorityLabels[task.priority]}</Badge>
                            </TableCell>
                            <TableCell>{formatDate(task.due_date)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Configuration Modal */}
      <ProjectConfigurationModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        projectId={projectId}
        projectName={project.name}
      />

      <TacticalPlanModal
        isOpen={showTacticalPlanModal}
        onClose={() => setShowTacticalPlanModal(false)}
        projectId={projectId.toString()}
        projectData={{
          name: project.name,
          description: project.description || "",
          products: [], // Will be loaded from API
          files: [], // Will be loaded from API
          budget: project.budget,
        }}
      />
    </div>
  )
}
