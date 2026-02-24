// @ts-nocheck
import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DataTable, type DataTableColumn, type DataTableAction } from "@/components/data-table"
import { type Project, apiClient } from "@/lib/api"
import { ProjectCreateSlidePanel } from "@/components/project-create-slide-panel"
import { useToast } from "@/hooks/use-toast"
import { Plus, Eye, Edit, Trash2, FolderKanban, Clock, CheckCircle2, Download, Filter, TrendingUp, X, Calendar, DollarSign, User, Users, ListChecks, AlertCircle, Settings, Save, Star } from 'lucide-react'
import { ConfirmationDialog } from "@/components/confirmation-dialog"
import { PageHeader } from "@/components/page-header"
import { ProjectSlidePanel } from "@/components/project-slide-panel"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

const statusColors = {
  planning: "bg-blue-500 text-white",
  active: "bg-green-500 text-white",
  on_hold: "bg-yellow-500 text-white",
  completed: "bg-gray-500 text-white",
  cancelled: "bg-red-500 text-white",
}

const statusLabels = {
  planning: "Planejamento",
  active: "Ativo",
  on_hold: "Em Espera",
  completed: "Concluído",
  cancelled: "Cancelado",
}

const mockProjects: Project[] = [
  {
    id: "1",
    name: "Sistema de Gestão Interno",
    description: "Desenvolvimento de sistema de gestão para controle de projetos e equipes",
    client: { id: "c1", name: "Departamento de TI", email: "ti@empresa.com" },
    manager: { id: "m1", name: "Carlos Silva", email: "carlos@empresa.com" },
    status: "active",
    budget: 150000,
    start_date: "2024-01-15",
    end_date: "2024-06-30",
    created_at: "2024-01-10",
  },
  {
    id: "2",
    name: "Plataforma de Treinamento Online",
    description: "Criação de plataforma EAD para capacitação de funcionários",
    client: { id: "c2", name: "RH", email: "rh@empresa.com" },
    manager: { id: "m2", name: "Maria Santos", email: "maria@empresa.com" },
    status: "active",
    budget: 95000,
    start_date: "2024-02-01",
    end_date: "2024-07-15",
    created_at: "2024-01-25",
  },
  {
    id: "3",
    name: "App Mobile de Vendas",
    description: "Desenvolvimento de aplicativo mobile para força de vendas",
    client: { id: "c3", name: "Comercial", email: "vendas@empresa.com" },
    manager: { id: "m3", name: "João Oliveira", email: "joao@empresa.com" },
    status: "planning",
    budget: 120000,
    start_date: "2024-04-01",
    end_date: "2024-09-30",
    created_at: "2024-03-01",
  },
  {
    id: "4",
    name: "Portal do Cliente",
    description: "Renovação completa do portal de atendimento ao cliente",
    client: { id: "c4", name: "Atendimento", email: "atendimento@empresa.com" },
    manager: { id: "m1", name: "Carlos Silva", email: "carlos@empresa.com" },
    status: "completed",
    budget: 85000,
    start_date: "2023-09-01",
    end_date: "2024-01-31",
    created_at: "2023-08-15",
  },
  {
    id: "5",
    name: "Sistema de Relatórios BI",
    description: "Implementação de dashboards e relatórios de business intelligence",
    client: { id: "c5", name: "Diretoria", email: "diretoria@empresa.com" },
    manager: { id: "m2", name: "Maria Santos", email: "maria@empresa.com" },
    status: "on_hold",
    budget: 200000,
    start_date: "2024-03-01",
    end_date: "2024-12-31",
    created_at: "2024-02-15",
  },
]

const mockTasks = {
  "1": [
    { 
      id: "t1", 
      title: "Definir arquitetura do sistema", 
      description: "Criar documentação da arquitetura e escolher tecnologias",
      status: "completed", 
      priority: "high", 
      assignee: "Carlos Silva", 
      dueDate: "2024-02-15",
      items: [
        { id: "i1-1", title: "Escolher stack de tecnologia", completed: true, deliverable: "tech_stack.pdf", approvedAt: "2024-02-10" },
        { id: "i1-2", title: "Desenhar diagrama de arquitetura", completed: true, deliverable: "architecture_diagram.png", approvedAt: "2024-02-12" },
        { id: "i1-3", title: "Documentar padrões de código", completed: true, deliverable: "code_standards.md", approvedAt: "2024-02-14" },
      ],
      files: [
        { id: "f1", name: "arquitetura_v2.pdf", size: "3.2 MB", uploadedAt: "2024-02-14" },
        { id: "f2", name: "diagrama_sistema.png", size: "850 KB", uploadedAt: "2024-02-14" },
      ],
    },
    { 
      id: "t2", 
      title: "Desenvolver módulo de autenticação", 
      description: "Implementar sistema de login e controle de acesso",
      status: "completed", 
      priority: "high", 
      assignee: "Ana Paula", 
      dueDate: "2024-03-01",
      items: [
        { id: "i2-1", title: "Implementar JWT", completed: true },
        { id: "i2-2", title: "Criar tela de login", completed: true },
        { id: "i2-3", title: "Sistema de recuperação de senha", completed: true },
      ],
      files: [
        { id: "f3", name: "auth_documentation.pdf", size: "1.5 MB", uploadedAt: "2024-03-01" },
      ],
    },
    { 
      id: "t3", 
      title: "Criar interface de gestão de projetos", 
      description: "Desenvolver telas de CRUD de projetos",
      status: "in_progress", 
      priority: "medium", 
      assignee: "Roberto Costa", 
      dueDate: "2024-04-10",
      items: [
        { id: "i3-1", title: "Listagem de projetos", completed: true },
        { id: "i3-2", title: "Formulário de criação", completed: true },
        { id: "i3-3", title: "Edição de projetos", completed: false },
        { id: "i3-4", title: "Visualização de detalhes", completed: false },
      ],
    },
    { 
      id: "t4", 
      title: "Implementar dashboard de métricas", 
      description: "Criar visualizações de dados e gráficos",
      status: "pending", 
      priority: "medium", 
      assignee: "Maria Santos", 
      dueDate: "2024-05-01",
      items: [
        { id: "i4-1", title: "Integrar biblioteca de gráficos", completed: false },
        { id: "i4-2", title: "Criar cards de métricas", completed: false },
        { id: "i4-3", title: "Gráficos de progresso", completed: false },
      ],
    },
    { 
      id: "t5", 
      title: "Testes de integração", 
      description: "Realizar testes end-to-end do sistema",
      status: "pending", 
      priority: "low", 
      assignee: "João Oliveira", 
      dueDate: "2024-06-15" 
    },
  ],
  "2": [
    { 
      id: "t6", 
      title: "Configurar plataforma EAD", 
      description: "Setup inicial da plataforma de aprendizado",
      status: "completed", 
      priority: "high", 
      assignee: "Maria Santos", 
      dueDate: "2024-02-20",
      items: [
        { id: "i6-1", title: "Instalar e configurar LMS", completed: true },
        { id: "i6-2", title: "Criar estrutura de cursos", completed: true },
      ],
      files: [
        { id: "f4", name: "manual_plataforma.pdf", size: "5.8 MB", uploadedAt: "2024-02-19" },
      ],
    },
    { 
      id: "t7", 
      title: "Criar conteúdo de treinamento", 
      description: "Desenvolver módulos de treinamento",
      status: "in_progress", 
      priority: "high", 
      assignee: "Paula Ferreira", 
      dueDate: "2024-04-01",
      items: [
        { id: "i7-1", title: "Módulo 1 - Introdução", completed: true, deliverable: "modulo1.pdf" },
        { id: "i7-2", title: "Módulo 2 - Conceitos", completed: false },
        { id: "i7-3", title: "Módulo 3 - Práticas", completed: false },
      ],
    },
    { 
      id: "t8", 
      title: "Desenvolver sistema de avaliação", 
      description: "Criar quizzes e avaliações",
      status: "in_progress", 
      priority: "medium", 
      assignee: "Carlos Silva", 
      dueDate: "2024-05-15" 
    },
    { 
      id: "t9", 
      title: "Integrar com sistema de RH", 
      description: "Sincronizar dados com sistema de RH",
      status: "pending", 
      priority: "medium", 
      assignee: "Roberto Costa", 
      dueDate: "2024-06-01" 
    },
  ],
  "3": [
    { 
      id: "t10", 
      title: "Definir requisitos do app", 
      description: "Levantar todas as funcionalidades necessárias",
      status: "pending", 
      priority: "high", 
      assignee: "João Oliveira", 
      dueDate: "2024-04-15" 
    },
    { 
      id: "t11", 
      title: "Design de interface mobile", 
      description: "Criar protótipos das telas do app",
      status: "pending", 
      priority: "high", 
      assignee: "Ana Design", 
      dueDate: "2024-05-01" 
    },
  ],
}

const mockProjectFiles = {
  "1": [
    { id: "pf1", name: "briefing_projeto.pdf", type: "application/pdf", size: "2.5 MB", uploadedAt: "2024-01-10", uploadedBy: "Carlos Silva", approved: true, approvedAt: "2024-01-12" },
    { id: "pf2", name: "requisitos_funcionais.docx", type: "application/doc", size: "1.8 MB", uploadedAt: "2024-01-12", uploadedBy: "Ana Paula", approved: true, approvedAt: "2024-01-15" },
    { id: "pf3", name: "proposta_comercial.pdf", type: "application/pdf", size: "950 KB", uploadedAt: "2024-01-15", uploadedBy: "Comercial", approved: false },
    { id: "pf4", name: "cronograma.xlsx", type: "application/excel", size: "450 KB", uploadedAt: "2024-01-20", uploadedBy: "Carlos Silva", approved: true, approvedAt: "2024-01-22" },
  ],
  "2": [
    { id: "pf5", name: "plano_pedagogico.pdf", type: "application/pdf", size: "4.2 MB", uploadedAt: "2024-01-25", uploadedBy: "Maria Santos", approved: true, approvedAt: "2024-01-28" },
    { id: "pf6", name: "conteudo_base.zip", type: "application/zip", size: "15.8 MB", uploadedAt: "2024-02-01", uploadedBy: "Paula Ferreira", approved: false },
  ],
  "3": [
    { id: "pf7", name: "wireframes_mobile.fig", type: "application/fig", size: "8.5 MB", uploadedAt: "2024-03-01", uploadedBy: "Ana Design", approved: false },
  ],
  "4": [
    { id: "pf8", name: "relatorio_final.pdf", type: "application/pdf", size: "3.7 MB", uploadedAt: "2024-01-31", uploadedBy: "Carlos Silva", approved: true, approvedAt: "2024-02-01" },
  ],
  "5": [
    { id: "pf9", name: "especificacao_bi.pdf", type: "application/pdf", size: "2.1 MB", uploadedAt: "2024-02-15", uploadedBy: "Maria Santos", approved: false },
  ],
}

// Types for saved filters and column visibility
type SavedFilter = {
  id: string
  name: string
  status?: string
  client?: string
  manager?: string
  budgetMin?: number
  budgetMax?: number
}

type ColumnVisibility = {
  id: boolean
  project: boolean
  responsible: boolean
  recurring: boolean
  status: boolean
  archived: boolean
}

export default function InHouseProjetosPage() {
  const { toast } = useToast()
  const [projects, setProjects] = useState<Project[]>(mockProjects)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | undefined>()
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; project?: Project }>({
    open: false,
  })
  
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [clientFilter, setClientFilter] = useState<string>("all")
  const [managerFilter, setManagerFilter] = useState<string>("all")
  const [budgetMinFilter, setBudgetMinFilter] = useState<string>("")
  const [budgetMaxFilter, setBudgetMaxFilter] = useState<string>("")
  
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([
    { id: "1", name: "Projetos Ativos", status: "active" },
    { id: "2", name: "Alto Orçamento", budgetMin: 100000 },
  ])
  const [showSaveFilterDialog, setShowSaveFilterDialog] = useState(false)
  const [filterName, setFilterName] = useState("")
  
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>({
    id: true,
    project: true,
    responsible: true,
    recurring: true,
    status: true,
    archived: true,
  })
  const [showColumnSettings, setShowColumnSettings] = useState(false)
  
  const [viewDialog, setViewDialog] = useState<{ open: boolean; project?: Project }>({
    open: false,
  })

  useEffect(() => {
    // loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiClient.getProjects()
      setProjects(data)
    } catch (error) {
      const errorMessage = "Falha ao carregar projetos"
      setError(errorMessage)
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProject = () => {
    setEditingProject(undefined)
    setShowForm(true)
  }

  const handleEditProject = (project: Project) => {
    setEditingProject(project)
    setShowForm(true)
  }

  const handleDeleteProject = (project: Project) => {
    setDeleteDialog({ open: true, project })
  }

  const handleViewProject = (project: Project) => {
    setViewDialog({ open: true, project })
  }

  const confirmDeleteProject = async () => {
    const project = deleteDialog.project
    if (!project) return

    try {
      setProjects(projects.filter(p => p.id !== project.id))
      toast({
        title: "Sucesso",
        description: "Projeto excluído com sucesso",
      })
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao excluir projeto",
        variant: "destructive",
      })
    } finally {
      setDeleteDialog({ open: false })
    }
  }

  const handleFormSubmit = (project: Project) => {
    if (editingProject) {
      setProjects(projects.map(p => p.id === project.id ? project : p))
    } else {
      setProjects([...projects, { ...project, id: Date.now().toString() }])
    }
    toast({
      title: "Sucesso",
      description: editingProject ? "Projeto atualizado com sucesso" : "Projeto criado com sucesso",
    })
  }

  const handleFormClose = () => {
    setShowForm(false)
    setEditingProject(undefined)
  }

  const handleExport = () => {
    const csv = [
      ["Nome", "Cliente", "Gerente", "Status", "Orçamento", "Data de Início"].join(","),
      ...projects.map((p) =>
        [
          p.name,
          p.client?.name || "-",
          p.manager?.name || "-",
          statusLabels[p.status as keyof typeof statusLabels],
          p.budget || "-",
          formatDate(p.start_date),
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `projetos-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)

    toast({
      title: "Sucesso",
      description: "Projetos exportados com sucesso",
    })
  }

  // Save filter logic
  const handleSaveCurrentFilter = () => {
    if (!filterName.trim()) {
      toast({
        title: "Erro",
        description: "Digite um nome para o filtro",
        variant: "destructive",
      })
      return
    }

    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name: filterName,
      status: statusFilter !== "all" ? statusFilter : undefined,
      client: clientFilter !== "all" ? clientFilter : undefined,
      manager: managerFilter !== "all" ? managerFilter : undefined,
      budgetMin: budgetMinFilter ? parseFloat(budgetMinFilter) : undefined,
      budgetMax: budgetMaxFilter ? parseFloat(budgetMaxFilter) : undefined,
    }

    setSavedFilters([...savedFilters, newFilter])
    setFilterName("")
    setShowSaveFilterDialog(false)
    toast({
      title: "Sucesso",
      description: "Filtro salvo com sucesso",
    })
  }

  const handleLoadFilter = (filter: SavedFilter) => {
    setStatusFilter(filter.status || "all")
    setClientFilter(filter.client || "all")
    setManagerFilter(filter.manager || "all")
    setBudgetMinFilter(filter.budgetMin?.toString() || "")
    setBudgetMaxFilter(filter.budgetMax?.toString() || "")
    toast({
      title: "Filtro Aplicado",
      description: `Filtro "${filter.name}" foi aplicado`,
    })
  }

  const handleDeleteFilter = (filterId: string) => {
    setSavedFilters(savedFilters.filter(f => f.id !== filterId))
    toast({
      title: "Sucesso",
      description: "Filtro removido",
    })
  }

  const handleClearFilters = () => {
    setStatusFilter("all")
    setClientFilter("all")
    setManagerFilter("all")
    setBudgetMinFilter("")
    setBudgetMaxFilter("")
  }


  const stats = {
    total: projects.length,
    active: projects.filter((p) => p.status === "active").length,
    completed: projects.filter((p) => p.status === "completed").length,
    planning: projects.filter((p) => p.status === "planning").length,
    totalBudget: projects.reduce((sum, p) => sum + (p.budget || 0), 0),
  }

  // Updated filteredProjects logic to include new filter states
  const filteredProjects = projects.filter(project => {
    if (statusFilter !== "all" && project.status !== statusFilter) return false
    if (clientFilter !== "all" && project.client?.name !== clientFilter) return false
    if (managerFilter !== "all" && project.manager?.name !== managerFilter) return false
    if (budgetMinFilter && (project.budget || 0) < parseFloat(budgetMinFilter)) return false
    if (budgetMaxFilter && (project.budget || 0) > parseFloat(budgetMaxFilter)) return false
    return true
  })

  const uniqueClients = Array.from(new Set(projects.map(p => p.client?.name).filter(Boolean)))
  const uniqueManagers = Array.from(new Set(projects.map(p => p.manager?.name).filter(Boolean)))


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

  const allColumns: DataTableColumn<Project>[] = [
    {
      field: "id",
      headerName: "ID",
      width: 70,
      renderCell: (value) => (
        <div className="text-xs font-mono text-gray-600">{value}</div>
      ),
    },
    {
      field: "name",
      headerName: "PROJETO",
      width: 280,
      renderCell: (value, row) => (
        <div className="py-1">
          <div className="font-medium text-sm text-gray-900">{value}</div>
        </div>
      ),
    },
    {
      field: "manager",
      headerName: "RESPONSÁVEL",
      width: 180,
      renderCell: (value) => (
        <span className="text-sm text-gray-700">{value?.name || "-"}</span>
      ),
    },
    {
      field: "budget",
      headerName: "RECORRENTE",
      width: 110,
      renderCell: () => (
        <Badge variant="outline" className="text-xs px-2 py-0.5">NÃO</Badge>
      ),
    },
    {
      field: "status",
      headerName: "STATUS",
      width: 130,
      renderCell: (value) => {
        const badges: Record<string, { label: string; color: string }> = {
          active: { label: "ATIVO", color: "bg-green-500 text-white" },
          planning: { label: "PLANEJAMENTO", color: "bg-blue-500 text-white" },
          completed: { label: "CONCLUÍDO", color: "bg-gray-500 text-white" },
          on_hold: { label: "EM ESPERA", color: "bg-yellow-500 text-white" },
          cancelled: { label: "CANCELADO", color: "bg-red-500 text-white" },
        }
        const badge = badges[value as string] || badges.planning
        return (
          <Badge className={`${badge.color} text-xs px-2 py-0.5`}>
            {badge.label}
          </Badge>
        )
      },
    },
    {
      field: "created_at",
      headerName: "ARQUIVADO",
      width: 110,
      renderCell: () => (
        <Badge variant="outline" className="text-xs px-2 py-0.5">NÃO</Badge>
      ),
    },
  ]

  // Filter columns based on visibility (excluding agency)
  const visibleColumns = allColumns.filter((col) => {
    const key = col.field.toString() as keyof ColumnVisibility
    if (key === "id") return columnVisibility.id
    if (key === "name") return columnVisibility.project
    if (key === "manager") return columnVisibility.responsible
    if (key === "budget") return columnVisibility.recurring
    if (key === "status") return columnVisibility.status
    if (key === "created_at") return columnVisibility.archived
    return true
  })

  const actions: DataTableAction<Project>[] = [
    {
      label: "Visualizar",
      icon: <Eye className="w-4 h-4" />,
      onClick: handleViewProject,
      variant: "ghost",
    },
    {
      label: "Editar",
      icon: <Edit className="w-4 h-4" />,
      onClick: handleEditProject,
      variant: "ghost",
    },
  ]

  const getTaskStats = (projectId: string) => {
    const tasks = mockTasks[projectId as keyof typeof mockTasks] || []
    const completed = tasks.filter(t => t.status === "completed").length
    const total = tasks.length
    const progress = total > 0 ? (completed / total) * 100 : 0
    return { completed, total, progress }
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        <PageHeader
          title="Projetos"
          // Updated description to show filtered count
          description={`${filteredProjects.length} registros encontrados.`}
        />

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2 pt-3 px-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-100 rounded-lg">
                  <FolderKanban className="w-4 h-4 text-blue-600" />
                </div>
                <CardTitle className="text-xs text-gray-600 font-semibold">Total</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2 pt-3 px-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-green-100 rounded-lg">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </div>
                <CardTitle className="text-xs text-gray-600 font-semibold">Ativos</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-400 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2 pt-3 px-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-100 rounded-lg">
                  <Clock className="w-4 h-4 text-blue-600" />
                </div>
                <CardTitle className="text-xs text-gray-600 font-semibold">Planejando</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="text-2xl font-bold text-blue-600">{stats.planning}</div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-gray-400 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2 pt-3 px-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-gray-100 rounded-lg">
                  <CheckCircle2 className="w-4 h-4 text-gray-600" />
                </div>
                <CardTitle className="text-xs text-gray-600 font-semibold">Concluídos</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="text-2xl font-bold text-gray-600">{stats.completed}</div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500 shadow-sm hover:shadow-md transition-shadow col-span-2 sm:col-span-3 lg:col-span-1">
            <CardHeader className="pb-2 pt-3 px-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-purple-100 rounded-lg">
                  <DollarSign className="w-4 h-4 text-purple-600" />
                </div>
                <CardTitle className="text-xs text-gray-600 font-semibold">Orçamento</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="text-xl font-bold text-purple-600">{formatCurrency(stats.totalBudget)}</div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center justify-between gap-3 bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <Popover open={showColumnSettings} onOpenChange={setShowColumnSettings}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Settings className="w-4 h-4" />
                  Colunas
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64" align="end">
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm">Colunas Visíveis</h4>
                  <div className="space-y-3">
                    {[
                      { key: "id" as const, label: "ID" },
                      { key: "project" as const, label: "Projeto" },
                      { key: "responsible" as const, label: "Responsável" },
                      { key: "recurring" as const, label: "Recorrente" },
                      { key: "status" as const, label: "Status" },
                      { key: "archived" as const, label: "Arquivado" },
                    ].map((col) => (
                      <div key={col.key} className="flex items-center space-x-2">
                        <Checkbox
                          id={col.key}
                          checked={columnVisibility[col.key]}
                          onCheckedChange={(checked) =>
                            setColumnVisibility({ ...columnVisibility, [col.key]: checked })
                          }
                        />
                        <label
                          htmlFor={col.key}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {col.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={() => setShowAdvancedFilter(true)}
            >
              <Filter className="w-4 h-4" />
              Filtrar
            </Button>
            
            <Button variant="outline" onClick={handleExport} size="sm" className="gap-2">
              <Download className="w-4 h-4" />
              Exportar
            </Button>
            
            <Button
              onClick={handleCreateProject}
              size="sm"
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4" />
              Novo Projeto
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <DataTable
              title=""
              columns={visibleColumns}
              rows={filteredProjects}
              isLoading={loading}
              error={error}
              actions={actions}
              searchable={true}
              searchPlaceholder="Buscar projetos..."
              emptyMessage={
                statusFilter === "all" && clientFilter === "all" && managerFilter === "all" && budgetMinFilter === "" && budgetMaxFilter === ""
                  ? "Nenhum projeto cadastrado"
                  : `Nenhum projeto encontrado com os filtros aplicados`
              }
              onRowClick={handleViewProject}
              rowClassName={(row, index) => 
                index % 2 === 0 
                  ? "bg-white hover:bg-blue-50/30 cursor-pointer transition-colors h-12" 
                  : "bg-slate-50/50 hover:bg-blue-50/30 cursor-pointer transition-colors h-12"
              }
            />
          </CardContent>
        </Card>
      </div>

      <Dialog open={showAdvancedFilter} onOpenChange={setShowAdvancedFilter}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Filtros Avançados</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Saved Filters */}
            {savedFilters.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Filtros Salvos</Label>
                <div className="flex flex-wrap gap-2">
                  {savedFilters.map((filter) => (
                    <div key={filter.id} className="flex items-center gap-1 bg-gray-100 rounded-md pl-3 pr-1 py-1">
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => handleLoadFilter(filter)}
                      >
                        {filter.name}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleDeleteFilter(filter.id)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Filter Options */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status-filter">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger id="status-filter">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="planning">Planejamento</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="on_hold">Em Espera</SelectItem>
                    <SelectItem value="completed">Concluído</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="client-filter">Cliente</Label>
                <Select value={clientFilter} onValueChange={setClientFilter}>
                  <SelectTrigger id="client-filter">
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {uniqueClients.map((client) => (
                      <SelectItem key={client} value={client as string}>
                        {client}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="manager-filter">Gerente</Label>
                <Select value={managerFilter} onValueChange={setManagerFilter}>
                  <SelectTrigger id="manager-filter">
                    <SelectValue placeholder="Selecione o gerente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {uniqueManagers.map((manager) => (
                      <SelectItem key={manager} value={manager as string}>
                        {manager}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Orçamento</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    placeholder="Mínimo"
                    value={budgetMinFilter}
                    onChange={(e) => setBudgetMinFilter(e.target.value)}
                  />
                  <span className="text-gray-500">até</span>
                  <Input
                    type="number"
                    placeholder="Máximo"
                    value={budgetMaxFilter}
                    onChange={(e) => setBudgetMaxFilter(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={handleClearFilters} className="gap-2">
              <X className="w-4 h-4" />
              Limpar Filtros
            </Button>
            <Button variant="outline" onClick={() => setShowSaveFilterDialog(true)} className="gap-2">
              <Save className="w-4 h-4" />
              Salvar Filtro
            </Button>
            <Button onClick={() => setShowAdvancedFilter(false)}>
              Aplicar Filtros
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSaveFilterDialog} onOpenChange={setShowSaveFilterDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar Filtro</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="filter-name">Nome do Filtro</Label>
              <Input
                id="filter-name"
                placeholder="Ex: Projetos Ativos de TI"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveFilterDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveCurrentFilter}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ProjectCreateSlidePanel
        open={showForm}
        onClose={handleFormClose}
        onSubmit={handleFormSubmit}
        initialData={editingProject}
      />

      <ConfirmationDialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false })}
        onConfirm={confirmDeleteProject}
        title="Confirmar Exclusão"
        message={`Tem certeza que deseja excluir o projeto "${deleteDialog.project?.name}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
      />

      <ProjectSlidePanel
        open={viewDialog.open}
        onClose={() => setViewDialog({ open: false })}
        project={viewDialog.project}
        tasks={viewDialog.project ? mockTasks[viewDialog.project.id as keyof typeof mockTasks] : []}
        files={viewDialog.project ? mockProjectFiles[viewDialog.project.id as keyof typeof mockProjectFiles] : []}
      />
    </div>
  )
}
