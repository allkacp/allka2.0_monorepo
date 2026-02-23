// @ts-nocheck
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import {
  Calendar,
  Clock,
  Grid3X3,
  List,
  MessageSquare,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle,
  Play,
  Bot,
  FileText,
  Paperclip,
  Send,
  Zap,
  Award,
  BookOpen,
  ClipboardCheck,
  Eye,
  MessageCircle,
} from "lucide-react"
import type {
  TaskExecution,
  TaskFilters,
  TaskQuestionnaire,
  QualificationChecklistItem,
  LeaderQualificationReview,
  QuestionBankItem,
} from "@/types/task-execution"
import type { UserRole } from "@/types/user"
import { hasPermission } from "@/lib/user-permissions"

// Mock user role - in real app, get from auth context
const currentUserRole: UserRole = "admin"
const currentUserId = "user-1"

const taskStatusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  launched: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  returned: "bg-orange-100 text-orange-800",
  paused: "bg-purple-100 text-purple-800",
  agency_approval: "bg-indigo-100 text-indigo-800",
  client_approval: "bg-cyan-100 text-cyan-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  expired: "bg-gray-100 text-gray-800",
}

const taskStatusLabels: Record<string, string> = {
  draft: "Rascunho",
  launched: "Lançamento",
  in_progress: "Em Execução",
  returned: "Devolvida",
  paused: "Pausada",
  agency_approval: "Aprovação da Agência",
  client_approval: "Aprovação do Cliente",
  approved: "Aprovada",
  rejected: "Reprovada",
  expired: "Expirada",
}

const priorityColors: Record<string, string> = {
  low: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800",
  emergency: "bg-red-500 text-white",
}

const priorityLabels: Record<string, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  urgent: "Urgente",
  emergency: "Emergencial",
}

export default function TasksPage() {
  const { toast } = useToast()
  const [tasks, setTasks] = useState<TaskExecution[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list")
  const [filters, setFilters] = useState<TaskFilters>({})
  const [selectedTask, setSelectedTask] = useState<TaskExecution | null>(null)
  const [showTaskDetail, setShowTaskDetail] = useState(false)
  const [showQuestionnaire, setShowQuestionnaire] = useState(false)
  const [questionnaire, setQuestionnaire] = useState<TaskQuestionnaire | null>(null)
  const [chatMessage, setChatMessage] = useState("")

  const [showLearningCircuit, setShowLearningCircuit] = useState(false)
  const [currentLearningStep, setCurrentLearningStep] = useState(0)
  const [showQualificationChecklist, setShowQualificationChecklist] = useState(false)
  const [checklistItems, setChecklistItems] = useState<QualificationChecklistItem[]>([])
  const [leaderReview, setLeaderReview] = useState<Partial<LeaderQualificationReview>>({})
  const [showQuestionBank, setShowQuestionBank] = useState(false)
  const [questionBank, setQuestionBank] = useState<QuestionBankItem[]>([])

  // AI Chat will be re-implemented later when dependencies are available

  useEffect(() => {
    loadTasks()
    loadQuestionBank()
  }, [filters])

  const loadTasks = async () => {
    try {
      setLoading(true)
      // Mock API call - in real app, fetch from backend with role-based filtering
      const mockTasks: TaskExecution[] = [
        {
          id: "task-1",
          template_id: "template-1",
          template_name: "Logo Design",
          project_id: "project-1",
          project_name: "Rebranding Empresa X",
          client_id: "client-1",
          client_name: "Empresa X",
          agency_id: "agency-1",
          agency_name: "Agência Y",
          nomad_id: "nomad-1",
          nomad_name: "João Designer",
          status: "in_progress",
          priority: "high",
          title: "Criação de Logo para Rebranding",
          description: "Desenvolvimento de nova identidade visual",
          briefing: "Cliente busca modernizar sua marca...",
          instructions: "Seguir guidelines de design...",
          requirements: { format: "vector", colors: "corporate" },
          deliverables: ["Logo principal", "Variações", "Manual de uso"],
          estimated_hours: 16,
          deadline: "2024-12-30T23:59:59Z",
          price: 1500,
          created_at: "2024-12-20T10:00:00Z",
          updated_at: "2024-12-26T14:30:00Z",
          started_at: "2024-12-21T09:00:00Z",
          is_emergency: false,
          is_overdue: false,
          days_until_deadline: 4,
          linked_tasks: ["task-2"],
          auto_trigger_next: true,
          chat_messages: [],
          history: [],
          attachments: [],
          task_type: "regular",
          is_qualification_test: false,
        },
        {
          id: "task-qual-1",
          template_id: "template-qual-1",
          template_name: "Teste de Qualificação - Design",
          client_id: "system",
          client_name: "Sistema",
          nomad_id: "nomad-3",
          nomad_name: "Ana Candidata",
          status: "in_progress",
          priority: "medium",
          title: "TAREFA TESTE - Criação de Identidade Visual",
          description: "Teste prático para qualificação em design de marca",
          briefing: "Desenvolva uma identidade visual completa para uma startup fictícia...",
          instructions: "Complete o circuito de aprendizado antes de iniciar o teste...",
          requirements: { test_duration: "48h", deliverables: ["logo", "manual", "aplicacoes"] },
          deliverables: ["Logo principal", "Manual de marca", "Aplicações"],
          estimated_hours: 24,
          deadline: "2024-12-28T23:59:59Z",
          price: 0,
          created_at: "2024-12-24T10:00:00Z",
          updated_at: "2024-12-26T14:30:00Z",
          started_at: "2024-12-25T09:00:00Z",
          is_emergency: false,
          is_overdue: false,
          days_until_deadline: 2,
          linked_tasks: [],
          auto_trigger_next: false,
          chat_messages: [],
          history: [],
          attachments: [],
          task_type: "qualification_test",
          is_qualification_test: true,
          qualification_category: "Design",
          learning_circuit: [
            {
              id: "step-1",
              type: "text",
              title: "Fundamentos de Identidade Visual",
              content: "Aprenda os conceitos básicos de criação de marca...",
              completed: true,
              completed_at: "2024-12-25T08:30:00Z",
            },
            {
              id: "step-2",
              type: "video",
              title: "Processo Criativo",
              content: "Vídeo explicativo sobre metodologia de design",
              url: "https://example.com/video",
              duration: 15,
              completed: true,
              completed_at: "2024-12-25T08:45:00Z",
            },
            {
              id: "step-3",
              type: "commitment_term",
              title: "Termo de Compromisso",
              content: "Declaro que compreendi as responsabilidades...",
              completed: false,
            },
          ],
          qualification_checklist: [
            {
              id: "check-1",
              criterion: "Criatividade e originalidade",
              description: "Avalie a originalidade das soluções apresentadas",
              weight: 30,
              required: true,
              checked: false,
            },
            {
              id: "check-2",
              criterion: "Aplicação técnica",
              description: "Qualidade técnica da execução",
              weight: 25,
              required: true,
              checked: false,
            },
            {
              id: "check-3",
              criterion: "Adequação ao briefing",
              description: "Atendimento aos requisitos solicitados",
              weight: 25,
              required: true,
              checked: false,
            },
            {
              id: "check-4",
              criterion: "Apresentação e organização",
              description: "Qualidade da apresentação dos materiais",
              weight: 20,
              required: false,
              checked: false,
            },
          ],
        },
        {
          id: "task-2",
          template_id: "template-2",
          template_name: "Website Development",
          client_id: "client-1",
          client_name: "Empresa X",
          status: "agency_approval",
          priority: "medium",
          title: "Desenvolvimento de Website Institucional",
          description: "Site responsivo com CMS",
          briefing: "Website moderno e responsivo...",
          instructions: "Usar tecnologias atuais...",
          requirements: { cms: "required", responsive: true },
          deliverables: ["Website completo", "Painel admin", "Documentação"],
          estimated_hours: 80,
          deadline: "2025-01-15T23:59:59Z",
          price: 8000,
          created_at: "2024-12-20T10:00:00Z",
          updated_at: "2024-12-26T16:00:00Z",
          is_emergency: false,
          is_overdue: false,
          days_until_deadline: 20,
          linked_tasks: [],
          auto_trigger_next: false,
          chat_messages: [],
          history: [],
          attachments: [],
          task_type: "regular",
          is_qualification_test: false,
        },
        {
          id: "task-3",
          template_id: "template-3",
          template_name: "Social Media Content",
          client_id: "client-2",
          client_name: "Startup Z",
          nomad_id: "nomad-2",
          nomad_name: "Maria Social Media",
          status: "returned",
          priority: "urgent",
          title: "Conteúdo para Redes Sociais - Janeiro",
          description: "Posts para Instagram e LinkedIn",
          briefing: "Conteúdo engajador para janeiro...",
          instructions: "Seguir tom de voz da marca...",
          requirements: { platforms: ["instagram", "linkedin"], quantity: 20 },
          deliverables: ["20 posts", "Calendário editorial", "Hashtags"],
          estimated_hours: 24,
          deadline: "2024-12-28T23:59:59Z",
          price: 2000,
          created_at: "2024-12-18T08:00:00Z",
          updated_at: "2024-12-26T11:00:00Z",
          is_emergency: false,
          is_overdue: true,
          days_until_deadline: -2,
          linked_tasks: [],
          auto_trigger_next: false,
          chat_messages: [],
          history: [],
          attachments: [],
          task_type: "regular",
          is_qualification_test: false,
        },
      ]

      let filteredTasks = mockTasks

      if (currentUserRole === "nomad") {
        filteredTasks = mockTasks.filter((task) => task.nomad_id === currentUserId)
      } else if (currentUserRole === "company_admin" || currentUserRole === "company_user") {
        filteredTasks = mockTasks.filter((task) => task.client_id === currentUserId)
      } else if (currentUserRole === "agency_admin" || currentUserRole === "agency_user") {
        filteredTasks = mockTasks.filter((task) => task.agency_id === currentUserId)
      }

      // Apply additional filters
      if (filters.status?.length) {
        filteredTasks = filteredTasks.filter((task) => filters.status!.includes(task.status))
      }
      if (filters.priority?.length) {
        filteredTasks = filteredTasks.filter((task) => filters.priority!.includes(task.priority))
      }
      if (filters.quick_filter) {
        switch (filters.quick_filter) {
          case "overdue":
            filteredTasks = filteredTasks.filter((task) => task.is_overdue)
            break
          case "completed":
            filteredTasks = filteredTasks.filter((task) => task.status === "approved")
            break
          case "due_soon":
            filteredTasks = filteredTasks.filter(
              (task) => task.days_until_deadline <= 3 && task.days_until_deadline > 0,
            )
            break
          case "emergency":
            filteredTasks = filteredTasks.filter((task) => task.is_emergency || task.priority === "emergency")
            break
        }
      }

      setTasks(filteredTasks)
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao carregar tarefas",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadQuestionBank = async () => {
    try {
      const mockQuestionBank: QuestionBankItem[] = [
        {
          id: "q1",
          question: "Qual é o público-alvo do projeto?",
          type: "textarea",
          category: "briefing",
          tags: ["target", "audience"],
          required: true,
          ai_fillable: true,
          usage_count: 45,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-12-01T00:00:00Z",
        },
        {
          id: "q2",
          question: "Quais são as cores preferidas da marca?",
          type: "text",
          category: "design",
          tags: ["colors", "brand"],
          required: false,
          ai_fillable: true,
          usage_count: 32,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-12-01T00:00:00Z",
        },
        {
          id: "q3",
          question: "Estilo de design preferido",
          type: "select",
          category: "design",
          tags: ["style", "preference"],
          options: ["Moderno", "Clássico", "Minimalista", "Criativo"],
          required: true,
          ai_fillable: true,
          usage_count: 28,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-12-01T00:00:00Z",
        },
      ]
      setQuestionBank(mockQuestionBank)
    } catch (error) {
      console.error("Failed to load question bank:", error)
    }
  }

  const startLearningCircuit = (task: TaskExecution) => {
    if (!task.learning_circuit) return
    setSelectedTask(task)
    setCurrentLearningStep(0)
    setShowLearningCircuit(true)
  }

  const completeCurrentStep = () => {
    if (!selectedTask?.learning_circuit) return

    const updatedCircuit = [...selectedTask.learning_circuit]
    updatedCircuit[currentLearningStep].completed = true
    updatedCircuit[currentLearningStep].completed_at = new Date().toISOString()

    setSelectedTask({
      ...selectedTask,
      learning_circuit: updatedCircuit,
    })

    if (currentLearningStep < selectedTask.learning_circuit.length - 1) {
      setCurrentLearningStep(currentLearningStep + 1)
    } else {
      // All steps completed
      toast({
        title: "Circuito Concluído",
        description: "Você pode agora iniciar o teste de qualificação",
      })
      setShowLearningCircuit(false)
    }
  }

  const openQualificationChecklist = (task: TaskExecution) => {
    if (!task.qualification_checklist) return
    setSelectedTask(task)
    setChecklistItems(task.qualification_checklist)
    setShowQualificationChecklist(true)
  }

  const updateChecklistItem = (itemId: string, checked: boolean, notes?: string) => {
    setChecklistItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, checked, leader_notes: notes } : item)),
    )
  }

  const submitQualificationReview = async (decision: "approved" | "rejected" | "needs_adjustment") => {
    try {
      const review: LeaderQualificationReview = {
        id: `review-${Date.now()}`,
        leader_id: currentUserId,
        leader_name: "Líder Qualificador",
        reviewed_at: new Date().toISOString(),
        decision,
        overall_score: checklistItems.reduce((acc, item) => acc + (item.checked ? item.weight : 0), 0),
        checklist_results: checklistItems.reduce((acc, item) => ({ ...acc, [item.id]: item.checked }), {}),
        feedback: leaderReview.feedback || "",
        improvement_suggestions: leaderReview.improvement_suggestions,
        contact_made: leaderReview.contact_made || false,
        contact_notes: leaderReview.contact_notes,
      }

      toast({
        title: "Avaliação Enviada",
        description: `Qualificação ${decision === "approved" ? "aprovada" : decision === "rejected" ? "reprovada" : "necessita ajustes"}`,
      })

      setShowQualificationChecklist(false)
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao enviar avaliação",
        variant: "destructive",
      })
    }
  }

  const fillQuestionnaireWithAI = async (taskId: string) => {
    try {
      // Get relevant questions from bank based on task type and variations
      const relevantQuestions = questionBank.filter(
        (q) => q.ai_fillable && (q.category === "briefing" || q.category === "design"),
      )

      const mockQuestionnaire: TaskQuestionnaire = {
        task_id: taskId,
        fields: relevantQuestions.map((q) => ({
          id: q.id,
          name: q.id,
          label: q.question,
          type: q.type,
          required: q.required,
          options: q.options,
          ai_fillable: q.ai_fillable,
          ai_filled_value:
            q.type === "textarea"
              ? "Empresários de 30-50 anos, setor tecnológico, renda alta"
              : q.type === "select"
                ? q.options?.[0]
                : "Azul corporativo (#1E40AF), Cinza (#6B7280)",
          user_value: null,
        })),
        ai_completion_percentage: 85,
        requires_review: true,
      }

      setQuestionnaire(mockQuestionnaire)
      setShowQuestionnaire(true)

      toast({
        title: "IA AplicADA",
        description: "Questionário preenchido automaticamente pela IA. Revise as informações.",
      })
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao preencher questionário com IA",
        variant: "destructive",
      })
    }
  }

  const sendChatMessage = async () => {
    if (!chatMessage.trim() || !selectedTask) return

    try {
      toast({
        title: "Funcionalidade Temporariamente Indisponível",
        description: "O chat com IA será implementado em breve",
        variant: "destructive",
      })

      setChatMessage("")
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao enviar mensagem",
        variant: "destructive",
      })
    }
  }

  const getQuickFilters = () => {
    const baseFilters = [
      { key: "overdue", label: "Atrasadas", count: tasks.filter((t) => t.is_overdue).length },
      {
        key: "due_soon",
        label: "Prestes a Vencer",
        count: tasks.filter((t) => t.days_until_deadline <= 3 && t.days_until_deadline > 0).length,
      },
      {
        key: "emergency",
        label: "Emergenciais",
        count: tasks.filter((t) => t.is_emergency || t.priority === "emergency").length,
      },
      { key: "completed", label: "Concluídas", count: tasks.filter((t) => t.status === "approved").length },
    ]

    // Hide internal filters for clients
    if (currentUserRole === "company_admin" || currentUserRole === "company_user") {
      return baseFilters.filter((f) => ![].includes(f.key))
    }

    return baseFilters
  }

  const renderTaskCard = (task: TaskExecution) => (
    <Card
      key={task.id}
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => {
        setSelectedTask(task)
        setShowTaskDetail(true)
      }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              {task.title}
              {task.is_qualification_test && (
                <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                  <Award className="h-3 w-3 mr-1" />
                  TAREFA TESTE
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{task.client_name}</span>
              {task.project_name && (
                <>
                  <span>•</span>
                  <span>{task.project_name}</span>
                </>
              )}
              {task.qualification_category && (
                <>
                  <span>•</span>
                  <span className="text-purple-600">{task.qualification_category}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {task.is_emergency && <Zap className="h-4 w-4 text-red-500" />}
            {task.is_overdue && <AlertTriangle className="h-4 w-4 text-orange-500" />}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge className={taskStatusColors[task.status]}>{taskStatusLabels[task.status]}</Badge>
          <Badge className={priorityColors[task.priority]}>{priorityLabels[task.priority]}</Badge>
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{task.estimated_hours}h</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span className={task.is_overdue ? "text-red-500" : task.days_until_deadline <= 3 ? "text-orange-500" : ""}>
              {task.days_until_deadline > 0
                ? `${task.days_until_deadline} dias`
                : `${Math.abs(task.days_until_deadline)} dias atraso`}
            </span>
          </div>
        </div>

        {task.nomad_name && (
          <div className="text-sm">
            <span className="font-medium">Nômade:</span> {task.nomad_name}
          </div>
        )}

        <div className="text-sm">
          <span className="font-medium">Valor:</span>{" "}
          {task.is_qualification_test
            ? "Teste de Qualificação"
            : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(task.price)}
        </div>

        {task.learning_circuit && (
          <div className="text-sm">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="h-4 w-4" />
              <span className="font-medium">Circuito de Aprendizado</span>
            </div>
            <Progress
              value={
                (task.learning_circuit.filter((step) => step.completed).length / task.learning_circuit.length) * 100
              }
              className="h-2"
            />
            <span className="text-xs text-muted-foreground">
              {task.learning_circuit.filter((step) => step.completed).length} de {task.learning_circuit.length}{" "}
              concluídos
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )

  const renderKanbanColumn = (status: string, statusTasks: TaskExecution[]) => (
    <div key={status} className="flex-1 min-w-80">
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">{taskStatusLabels[status]}</h3>
          <Badge variant="secondary">{statusTasks.length}</Badge>
        </div>
        <div className="space-y-3">{statusTasks.map(renderTaskCard)}</div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Carregando tarefas...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tarefas</h1>
          <p className="text-muted-foreground">Gerencie todas as suas tarefas em um só lugar</p>
        </div>
        <div className="flex gap-2">
          {hasPermission(currentUserRole, "create_projects") && (
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nova Tarefa
            </Button>
          )}
          {hasPermission(currentUserRole, "manage_templates") && (
            <Button variant="outline" onClick={() => setShowQuestionBank(true)}>
              <FileText className="w-4 h-4 mr-2" />
              Banco de Perguntas
            </Button>
          )}
        </div>
      </div>

      {/* Quick Filters */}
      <div className="flex gap-2 flex-wrap">
        {getQuickFilters().map((filter) => (
          <Button
            key={filter.key}
            variant={filters.quick_filter === filter.key ? "default" : "outline"}
            size="sm"
            onClick={() =>
              setFilters((prev) => ({
                ...prev,
                quick_filter: prev.quick_filter === filter.key ? undefined : (filter.key as any),
              }))
            }
          >
            {filter.label} ({filter.count})
          </Button>
        ))}
      </div>

      {/* Filters and View Toggle */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar tarefas..."
              className="pl-10 w-64"
              value={filters.search || ""}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            />
          </div>

          <Select
            value={filters.status?.[0] || "all"}
            onValueChange={(value) =>
              setFilters((prev) => ({ ...prev, status: value === "all" ? undefined : [value as any] }))
            }
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {Object.entries(taskStatusLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.priority?.[0] || "all"}
            onValueChange={(value) =>
              setFilters((prev) => ({ ...prev, priority: value === "all" ? undefined : [value as any] }))
            }
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as prioridades</SelectItem>
              {Object.entries(priorityLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button variant={viewMode === "list" ? "default" : "outline"} size="sm" onClick={() => setViewMode("list")}>
            <List className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === "kanban" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("kanban")}
          >
            <Grid3X3 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Tasks Display */}
      {viewMode === "list" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{tasks.map(renderTaskCard)}</div>
      ) : (
        <div className="flex gap-6 overflow-x-auto pb-4">
          {Object.keys(taskStatusLabels).map((status) => {
            const statusTasks = tasks.filter((task) => task.status === status)
            return renderKanbanColumn(status, statusTasks)
          })}
        </div>
      )}

      {tasks.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhuma tarefa encontrada</h3>
          <p className="text-muted-foreground">Ajuste os filtros ou crie uma nova tarefa</p>
        </div>
      )}

      {/* Task Detail Dialog */}
      <Dialog open={showTaskDetail} onOpenChange={setShowTaskDetail}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedTask && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedTask.title}
                  {selectedTask.is_emergency && <Zap className="h-5 w-5 text-red-500" />}
                  {selectedTask.is_qualification_test && (
                    <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                      <Award className="h-4 w-4 mr-1" />
                      TAREFA TESTE
                    </Badge>
                  )}
                </DialogTitle>
              </DialogHeader>

              <Tabs defaultValue="details" className="w-full">
                {/* Removed AI Chat related tabs and adjusted grid cols */}
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="details">Detalhes</TabsTrigger>
                  <TabsTrigger value="chat">Chat</TabsTrigger>
                  <TabsTrigger value="history">Histórico</TabsTrigger>
                  <TabsTrigger value="files">Arquivos</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-2">Informações Gerais</h4>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium">Cliente:</span> {selectedTask.client_name}
                        </div>
                        <div>
                          <span className="font-medium">Projeto:</span> {selectedTask.project_name || "-"}
                        </div>
                        <div>
                          <span className="font-medium">Nômade:</span> {selectedTask.nomad_name || "Não atribuído"}
                        </div>
                        <div>
                          <span className="font-medium">Agência:</span> {selectedTask.agency_name || "-"}
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Status e Prazos</h4>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Badge className={taskStatusColors[selectedTask.status]}>
                            {taskStatusLabels[selectedTask.status]}
                          </Badge>
                          <Badge className={priorityColors[selectedTask.priority]}>
                            {priorityLabels[selectedTask.priority]}
                          </Badge>
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">Prazo:</span>{" "}
                          {new Date(selectedTask.deadline).toLocaleDateString("pt-BR")}
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">Horas estimadas:</span> {selectedTask.estimated_hours}h
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">Valor:</span>{" "}
                          {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                            selectedTask.price,
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Briefing</h4>
                    <p className="text-sm text-muted-foreground bg-gray-50 p-3 rounded">{selectedTask.briefing}</p>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Instruções</h4>
                    <p className="text-sm text-muted-foreground bg-gray-50 p-3 rounded">{selectedTask.instructions}</p>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={() => fillQuestionnaireWithAI(selectedTask.id)}>
                      <Bot className="w-4 h-4 mr-2" />
                      Preencher com IA
                    </Button>
                    {selectedTask.is_qualification_test && selectedTask.learning_circuit && (
                      <Button variant="outline" onClick={() => startLearningCircuit(selectedTask)}>
                        <BookOpen className="w-4 h-4 mr-2" />
                        Circuito de Aprendizado
                      </Button>
                    )}
                    {selectedTask.is_qualification_test && currentUserRole === "leader" && (
                      <Button variant="outline" onClick={() => openQualificationChecklist(selectedTask)}>
                        <ClipboardCheck className="w-4 h-4 mr-2" />
                        Avaliar Qualificação
                      </Button>
                    )}
                    {currentUserRole === "nomad" && (
                      <Button variant="outline">
                        <Play className="w-4 h-4 mr-2" />
                        Iniciar Execução
                      </Button>
                    )}
                  </div>
                </TabsContent>

                {selectedTask.is_qualification_test && (
                  <TabsContent value="learning" className="space-y-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Circuito de Aprendizado</h3>
                        <Badge variant="secondary">
                          {selectedTask.learning_circuit?.filter((step) => step.completed).length || 0} de{" "}
                          {selectedTask.learning_circuit?.length || 0} concluídos
                        </Badge>
                      </div>

                      {selectedTask.learning_circuit?.map((step, index) => (
                        <Card key={step.id} className={step.completed ? "bg-green-50 border-green-200" : ""}>
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0">
                                {step.completed ? (
                                  <CheckCircle className="h-5 w-5 text-green-600" />
                                ) : (
                                  <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                                )}
                              </div>
                              <div className="flex-1">
                                <h4 className="font-medium">{step.title}</h4>
                                <p className="text-sm text-muted-foreground mt-1">{step.content}</p>
                                {step.type === "video" && step.duration && (
                                  <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                                    <Clock className="h-4 w-4" />
                                    <span>{step.duration} minutos</span>
                                  </div>
                                )}
                                {step.completed && step.completed_at && (
                                  <div className="text-xs text-green-600 mt-2">
                                    Concluído em {new Date(step.completed_at).toLocaleString("pt-BR")}
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>
                )}

                {selectedTask.is_qualification_test && currentUserRole === "leader" && (
                  <TabsContent value="checklist" className="space-y-4">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Checklist de Qualificação</h3>

                      {selectedTask.qualification_checklist?.map((item) => (
                        <Card key={item.id}>
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <Checkbox
                                checked={item.checked}
                                onCheckedChange={(checked) => updateChecklistItem(item.id, checked as boolean)}
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium">{item.criterion}</h4>
                                  <Badge variant="outline">{item.weight}%</Badge>
                                  {item.required && (
                                    <Badge variant="destructive" className="text-xs">
                                      Obrigatório
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                                <Textarea
                                  placeholder="Observações do líder..."
                                  className="mt-2"
                                  value={item.leader_notes || ""}
                                  onChange={(e) => updateChecklistItem(item.id, item.checked, e.target.value)}
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}

                      <Card>
                        <CardContent className="p-4 space-y-4">
                          <h4 className="font-medium">Avaliação Final</h4>
                          <Textarea
                            placeholder="Feedback geral para o nômade..."
                            value={leaderReview.feedback || ""}
                            onChange={(e) => setLeaderReview((prev) => ({ ...prev, feedback: e.target.value }))}
                          />
                          <Textarea
                            placeholder="Sugestões de melhoria (opcional)..."
                            value={leaderReview.improvement_suggestions || ""}
                            onChange={(e) =>
                              setLeaderReview((prev) => ({ ...prev, improvement_suggestions: e.target.value }))
                            }
                          />

                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={leaderReview.contact_made || false}
                              onCheckedChange={(checked) =>
                                setLeaderReview((prev) => ({ ...prev, contact_made: checked as boolean }))
                              }
                            />
                            <label className="text-sm">Entrei em contato direto com o nômade</label>
                          </div>

                          {leaderReview.contact_made && (
                            <Textarea
                              placeholder="Notas do contato..."
                              value={leaderReview.contact_notes || ""}
                              onChange={(e) => setLeaderReview((prev) => ({ ...prev, contact_notes: e.target.value }))}
                            />
                          )}

                          <div className="flex gap-2">
                            <Button
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => submitQualificationReview("approved")}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Aprovar
                            </Button>
                            <Button variant="outline" onClick={() => submitQualificationReview("needs_adjustment")}>
                              <MessageCircle className="w-4 h-4 mr-2" />
                              Solicitar Ajustes
                            </Button>
                            <Button variant="destructive" onClick={() => submitQualificationReview("rejected")}>
                              <AlertTriangle className="w-4 h-4 mr-2" />
                              Reprovar
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                )}

                <TabsContent value="chat" className="space-y-4">
                  <div className="border rounded-lg p-4 h-96 overflow-y-auto">
                    <div className="text-center text-muted-foreground py-8">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2" />
                      <p>Chat com IA será implementado em breve</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Chat temporariamente indisponível..."
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      className="flex-1"
                      rows={2}
                      disabled
                    />
                    <Button onClick={sendChatMessage} disabled>
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="history">
                  <div className="text-center text-muted-foreground py-8">
                    <Clock className="h-8 w-8 mx-auto mb-2" />
                    <p>Histórico de alterações aparecerá aqui</p>
                  </div>
                </TabsContent>

                <TabsContent value="files">
                  <div className="text-center text-muted-foreground py-8">
                    <Paperclip className="h-8 w-8 mx-auto mb-2" />
                    <p>Arquivos anexados aparecerão aqui</p>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* AI Questionnaire Dialog */}
      <Dialog open={showQuestionnaire} onOpenChange={setShowQuestionnaire}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Questionário Inteligente
            </DialogTitle>
          </DialogHeader>

          {questionnaire && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">
                    IA preencheu {questionnaire.ai_completion_percentage}% do questionário
                  </span>
                </div>
                <p className="text-xs text-green-700">
                  Revise as informações preenchidas automaticamente e faça ajustes se necessário.
                </p>
              </div>

              <div className="space-y-4">
                {questionnaire.fields.map((field) => (
                  <div key={field.id}>
                    <label className="block text-sm font-medium mb-1">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                      {field.ai_fillable && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          <Bot className="h-3 w-3 mr-1" />
                          IA
                        </Badge>
                      )}
                    </label>

                    {field.type === "textarea" ? (
                      <Textarea
                        defaultValue={field.ai_filled_value || field.user_value || ""}
                        className={field.ai_filled_value ? "bg-green-50 border-green-200" : ""}
                      />
                    ) : field.type === "select" ? (
                      <Select defaultValue={field.ai_filled_value || field.user_value || ""}>
                        <SelectTrigger className={field.ai_filled_value ? "bg-green-50 border-green-200" : ""}>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options?.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        defaultValue={field.ai_filled_value || field.user_value || ""}
                        className={field.ai_filled_value ? "bg-green-50 border-green-200" : ""}
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowQuestionnaire(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => {
                    setShowQuestionnaire(false)
                    toast({
                      title: "Questionário salvo",
                      description: "As informações foram salvas com sucesso",
                    })
                  }}
                >
                  Salvar Questionário
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showLearningCircuit} onOpenChange={setShowLearningCircuit}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Circuito de Aprendizado - {selectedTask?.qualification_category}
            </DialogTitle>
          </DialogHeader>

          {selectedTask?.learning_circuit && (
            <div className="space-y-4">
              <Progress
                value={((currentLearningStep + 1) / selectedTask.learning_circuit.length) * 100}
                className="h-2"
              />

              <div className="text-center text-sm text-muted-foreground">
                Etapa {currentLearningStep + 1} de {selectedTask.learning_circuit.length}
              </div>

              <Card>
                <CardContent className="p-6">
                  {selectedTask.learning_circuit[currentLearningStep] && (
                    <div className="space-y-4">
                      <h3 className="text-xl font-semibold">
                        {selectedTask.learning_circuit[currentLearningStep].title}
                      </h3>

                      <div className="prose max-w-none">
                        <p>{selectedTask.learning_circuit[currentLearningStep].content}</p>
                      </div>

                      {selectedTask.learning_circuit[currentLearningStep].type === "video" && (
                        <div className="bg-gray-100 p-4 rounded-lg text-center">
                          <div className="text-sm text-muted-foreground mb-2">Vídeo Tutorial</div>
                          <div className="text-lg font-medium">
                            {selectedTask.learning_circuit[currentLearningStep].duration} minutos
                          </div>
                        </div>
                      )}

                      {selectedTask.learning_circuit[currentLearningStep].type === "commitment_term" && (
                        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <ClipboardCheck className="h-4 w-4 text-blue-600" />
                            <span className="font-medium text-blue-800">Termo de Compromisso</span>
                          </div>
                          <p className="text-sm text-blue-700">
                            Ao prosseguir, você declara ter compreendido todas as responsabilidades e requisitos para
                            este teste de qualificação.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setCurrentLearningStep(Math.max(0, currentLearningStep - 1))}
                  disabled={currentLearningStep === 0}
                >
                  Anterior
                </Button>

                <Button onClick={completeCurrentStep}>
                  {currentLearningStep === selectedTask.learning_circuit.length - 1
                    ? "Finalizar Circuito"
                    : "Próxima Etapa"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showQuestionBank} onOpenChange={setShowQuestionBank}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Banco de Perguntas
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Input placeholder="Buscar perguntas..." className="w-64" />
                <Select>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="briefing">Briefing</SelectItem>
                    <SelectItem value="design">Design</SelectItem>
                    <SelectItem value="development">Desenvolvimento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nova Pergunta
              </Button>
            </div>

            <div className="grid gap-4">
              {questionBank.map((question) => (
                <Card key={question.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{question.question}</h4>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline">{question.category}</Badge>
                          <Badge variant="secondary">{question.type}</Badge>
                          {question.ai_fillable && (
                            <Badge className="bg-green-100 text-green-800">
                              <Bot className="h-3 w-3 mr-1" />
                              IA
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span>Usado {question.usage_count} vezes</span>
                          <span>Tags: {question.tags.join(", ")}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <FileText className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Simplified main content area */}
      <div className="text-center text-muted-foreground py-8">
        <FileText className="h-8 w-8 mx-auto mb-2" />
        <p>Interface de tarefas simplificada - funcionalidades completas serão implementadas em breve</p>
      </div>
    </div>
  )
}
