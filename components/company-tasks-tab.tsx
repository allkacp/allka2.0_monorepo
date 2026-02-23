
import { useState, useMemo, type CSSProperties } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Eye, Filter, X, List, LayoutGrid, ArrowUp, ArrowDown, User, Users, Calendar, Search, CheckSquare, ChevronDown, GripVertical, Pencil } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ItemsPerPageSelect } from "@/components/items-per-page-select"
import { useSidebar } from "@/contexts/sidebar-context"

const taskGradientMap: Record<string, string> = {
  "bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-900": "linear-gradient(to bottom right, #1e3a8a, #1e40af, #164e63)",
  "bg-gradient-to-b from-slate-900 via-blue-900 to-indigo-900": "linear-gradient(to bottom, #0f172a, #1e3a8a, #312e81)",
  "bg-gradient-to-tr from-indigo-900 via-purple-800 to-blue-800": "linear-gradient(to top right, #312e81, #6b21a8, #1e40af)",
  "bg-gradient-to-br from-green-900 via-emerald-800 to-teal-900": "linear-gradient(to bottom right, #14532d, #065f46, #134e4a)",
  "bg-gradient-to-b from-emerald-900 via-green-800 to-cyan-900": "linear-gradient(to bottom, #064e3b, #166534, #164e63)",
  "bg-gradient-to-tr from-teal-900 via-emerald-800 to-green-800": "linear-gradient(to top right, #134e4a, #065f46, #166534)",
  "bg-gradient-to-br from-purple-900 via-violet-800 to-indigo-900": "linear-gradient(to bottom right, #581c87, #5b21b6, #312e81)",
  "bg-gradient-to-b from-indigo-900 via-purple-800 to-fuchsia-900": "linear-gradient(to bottom, #312e81, #6b21a8, #701a75)",
  "bg-gradient-to-tr from-violet-900 via-purple-800 to-pink-900": "linear-gradient(to top right, #4c1d95, #6b21a8, #831843)",
  "bg-gradient-to-br from-red-900 via-orange-800 to-amber-900": "linear-gradient(to bottom right, #7f1d1d, #9a3412, #78350f)",
  "bg-gradient-to-b from-orange-900 via-red-800 to-rose-900": "linear-gradient(to bottom, #7c2d12, #991b1b, #881337)",
  "bg-gradient-to-tr from-rose-900 via-red-800 to-pink-900": "linear-gradient(to top right, #881337, #991b1b, #831843)",
  "bg-gradient-to-br from-slate-900 via-gray-800 to-zinc-900": "linear-gradient(to bottom right, #0f172a, #1f2937, #18181b)",
  "bg-gradient-to-b from-neutral-900 via-stone-800 to-slate-900": "linear-gradient(to bottom, #171717, #292524, #0f172a)",
  "bg-gradient-to-tr from-black via-slate-900 to-gray-900": "linear-gradient(to top right, #000000, #0f172a, #111827)",
}

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
  const { sidebarSettings, previewTheme } = useSidebar()
  const appliedTheme = previewTheme ?? sidebarSettings
  const themeBg = appliedTheme.backgroundColor
  const getHeaderStyle = (): CSSProperties => {
    if (!themeBg || themeBg === "bg-slate-900") return { background: "linear-gradient(to right, #0a1628, #1e3a8a, #0a1628)" }
    if (themeBg.startsWith("custom-gradient:")) return { background: themeBg.replace("custom-gradient:", "") }
    if (themeBg.includes("gradient")) return { background: taskGradientMap[themeBg] || "#0f172a" }
    return {}
  }

  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [tasksViewMode, setTasksViewMode] = useState<"list" | "kanban">("list")
  const [taskSortBy, setTaskSortBy] = useState("projectName")
  const [taskSortOrder, setTaskSortOrder] = useState<"asc" | "desc">("asc")

  // Advanced filter modal state
  const [isTaskFilterModalOpen, setIsTaskFilterModalOpen] = useState(false)
  const [advancedFilters, setAdvancedFilters] = useState({
    project: "all",
    statuses: [] as string[],
    deadlineFrom: "",
    deadlineTo: "",
    executor: "",
    lider: "",
  })
  const [savedFilters, setSavedFilters] = useState<Array<{ id: string; name: string; filters: typeof advancedFilters }>>([])
  const [selectedFilterId, setSelectedFilterId] = useState<string | null>(null)
  const [editingFilterId, setEditingFilterId] = useState<string | null>(null)
  const [editingFilterName, setEditingFilterName] = useState("")
  const [draggingFilterId, setDraggingFilterId] = useState<string | null>(null)
  const [dragOverFilterId, setDragOverFilterId] = useState<string | null>(null)
  const [showFieldPicker, setShowFieldPicker] = useState(false)
  const [visibleFields, setVisibleFields] = useState<string[]>(["projeto", "status", "prazo"])
  const [filterNameInput, setFilterNameInput] = useState("")
  const [showSaveInput, setShowSaveInput] = useState(false)
  const [unsavedChanges, setUnsavedChanges] = useState(false)

  // Filtrar tarefas
  const filteredTasks = useMemo(() => {
    let result = mockCompanyTasks

    // Filtro por projeto
    if (advancedFilters.project !== "all") {
      result = result.filter((task) => task.projectId.toString() === advancedFilters.project)
    }

    // Filtro por status (multi-select)
    if (advancedFilters.statuses.length > 0) {
      result = result.filter((task) => advancedFilters.statuses.includes(task.status))
    }

    // Filtro por executor
    if (advancedFilters.executor) {
      result = result.filter((task) => task.executor.toLowerCase().includes(advancedFilters.executor.toLowerCase()))
    }

    // Filtro por líder
    if (advancedFilters.lider) {
      result = result.filter((task) => task.lider.toLowerCase().includes(advancedFilters.lider.toLowerCase()))
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
  }, [advancedFilters, searchTerm, taskSortBy, taskSortOrder])

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
      "Aprovada":        "bg-emerald-100 text-emerald-700 border-emerald-300",
      "Em Execução":    "bg-blue-100 text-blue-700 border-blue-300",
      "Entregue":        "bg-purple-100 text-purple-700 border-purple-300",
      "Aguardando":      "bg-yellow-100 text-yellow-700 border-yellow-300",
      "Bloqueada":       "bg-red-100 text-red-700 border-red-300",
      "Para Aprovação": "bg-amber-100 text-amber-700 border-amber-300",
      "Para Lançamento": "bg-slate-100 text-slate-600 border-slate-300",
      "Atrasada":        "bg-red-100 text-red-700 border-red-300",
    }
    return statusColors[status] || "bg-gray-100 text-gray-700 border-gray-300"
  }

  const getStatusBorderColor = (status: string): string => {
    const borderColors: Record<string, string> = {
      "Aprovada":        "#22c55e",
      "Em Execução":    "#3b82f6",
      "Entregue":        "#a855f7",
      "Aguardando":      "#eab308",
      "Bloqueada":       "#ef4444",
      "Para Aprovação": "#f59e0b",
      "Para Lançamento": "#94a3b8",
      "Atrasada":        "#ef4444",
    }
    return borderColors[status] || "#6b7280"
  }

  const getStatusDotClass = (status: string): string => {
    const dots: Record<string, string> = {
      "Aprovada":        "bg-emerald-500",
      "Em Execução":    "bg-blue-500",
      "Entregue":        "bg-purple-500",
      "Aguardando":      "bg-yellow-400",
      "Bloqueada":       "bg-red-500",
      "Para Aprovação": "bg-amber-400",
      "Para Lançamento": "bg-slate-400",
      "Atrasada":        "bg-red-500 animate-pulse",
    }
    return dots[status] || "bg-gray-400"
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

  const allStatuses = ["Aprovada", "Em Execução", "Para Aprovação", "Entregue", "Atrasada", "Bloqueada", "Aguardando"]

  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (currentPage > 3) pages.push("...")
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i)
      if (currentPage < totalPages - 2) pages.push("...")
      pages.push(totalPages)
    }
    return pages
  }

  const stats = {
    total:      filteredTasks.length,
    aprovada:   mockCompanyTasks.filter(t => t.status === "Aprovada").length,
    execucao:   mockCompanyTasks.filter(t => t.status === "Em Execução").length,
    aprovacao:  mockCompanyTasks.filter(t => t.status === "Para Aprovação").length,
    entregue:   mockCompanyTasks.filter(t => t.status === "Entregue").length,
    atrasada:   mockCompanyTasks.filter(t => t.status === "Atrasada").length,
  }

  const activeFilterCount =
    (advancedFilters.project !== "all" ? 1 : 0) +
    advancedFilters.statuses.length +
    (advancedFilters.executor ? 1 : 0) +
    (advancedFilters.lider ? 1 : 0) +
    (advancedFilters.deadlineFrom || advancedFilters.deadlineTo ? 1 : 0)

  return (
    <div className="space-y-4">
      {/* ── Stats bar ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-2">
          <div className="h-6 w-6 rounded-md bg-indigo-100 flex items-center justify-center">
            <CheckSquare className="h-3.5 w-3.5 text-indigo-600" />
          </div>
          <span className="text-xs font-semibold text-slate-600">Total</span>
          <span className="text-sm font-bold text-slate-900">{mockCompanyTasks.length}</span>
        </div>
        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-2">
          <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
          <span className="text-xs font-semibold text-slate-500">Em Execução</span>
          <span className="text-sm font-bold text-blue-600">{stats.execucao}</span>
        </div>
        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500 flex-shrink-0" />
          <span className="text-xs font-semibold text-slate-500">Aprovadas</span>
          <span className="text-sm font-bold text-emerald-600">{stats.aprovada}</span>
        </div>
        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-2">
          <div className="h-2 w-2 rounded-full bg-amber-400 flex-shrink-0" />
          <span className="text-xs font-semibold text-slate-500">Para Aprovação</span>
          <span className="text-sm font-bold text-amber-500">{stats.aprovacao}</span>
        </div>
        {stats.entregue > 0 && (
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-2">
            <div className="h-2 w-2 rounded-full bg-purple-500 flex-shrink-0" />
            <span className="text-xs font-semibold text-slate-500">Entregues</span>
            <span className="text-sm font-bold text-purple-600">{stats.entregue}</span>
          </div>
        )}
        {stats.atrasada > 0 && (
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-2">
            <div className="h-2 w-2 rounded-full bg-red-400 flex-shrink-0" />
            <span className="text-xs font-semibold text-slate-500">Atrasadas</span>
            <span className="text-sm font-bold text-red-500">{stats.atrasada}</span>
          </div>
        )}
      </div>

      {/* ── Main Card ── */}
      <div className="border border-slate-200/70 shadow-sm overflow-hidden rounded-xl bg-white">

        {/* ── Top bar ── */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-200/70 bg-slate-50/60">
          {/* Search */}
          <div className="flex-1 relative min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar tarefa ou ID..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
              className="w-full pl-9 pr-3 h-9 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
            />
          </div>

          {/* Lista / Kanban toggle */}
          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden flex-shrink-0">
            <button
              onClick={() => setTasksViewMode("list")}
              className={`flex items-center gap-1.5 h-9 px-3 text-xs font-medium transition-colors ${
                tasksViewMode === "list" ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <List className="h-3.5 w-3.5" />
              Lista
            </button>
            <button
              onClick={() => setTasksViewMode("kanban")}
              className={`flex items-center gap-1.5 h-9 px-3 text-xs font-medium transition-colors border-l border-slate-200 ${
                tasksViewMode === "kanban" ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Kanban
            </button>
          </div>

          {/* Items per page + count */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <ItemsPerPageSelect
              value={itemsPerPage.toString()}
              onValueChange={(v) => handleItemsPerPageChange(parseInt(v))}
            />
            <span className="text-xs text-slate-400 whitespace-nowrap">
              {filteredTasks.length !== mockCompanyTasks.length
                ? <>de <span className="font-semibold text-blue-500">{filteredTasks.length}</span> de {mockCompanyTasks.length} tarefa{mockCompanyTasks.length !== 1 ? "s" : ""}</>
                : <>de <span className="font-semibold text-slate-600">{mockCompanyTasks.length}</span> tarefa{mockCompanyTasks.length !== 1 ? "s" : ""}</>
              }
            </span>
          </div>

          {/* Filtros button */}
          <button
            onClick={() => setIsTaskFilterModalOpen(true)}
            className={`flex items-center gap-1.5 h-9 px-3.5 text-xs font-medium rounded-lg border transition-colors flex-shrink-0 ${
              activeFilterCount > 0 ? "border-blue-400 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            Filtros
            {activeFilterCount > 0 && (
              <span className="ml-0.5 min-w-[16px] h-4 px-1 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center">{activeFilterCount}</span>
            )}
          </button>

          {/* Pagination */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
              className="h-7 w-7 flex items-center justify-center rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors">
              <ChevronDown className="h-3.5 w-3.5 rotate-90" />
            </button>
            {getPageNumbers().map((page, idx) =>
              page === "..." ? (
                <span key={idx} className="text-xs text-slate-300 px-0.5">·</span>
              ) : (
                <button key={idx} onClick={() => setCurrentPage(Number(page))}
                  className={`h-7 w-7 flex items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                    page === currentPage ? "bg-blue-500 text-white shadow-sm shadow-blue-200" : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                  }`}>
                  {page}
                </button>
              )
            )}
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0}
              className="h-7 w-7 flex items-center justify-center rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors">
              <ChevronDown className="h-3.5 w-3.5 -rotate-90" />
            </button>
          </div>
        </div>



        {/* ── Content ── */}
        <div>

      {/* Lista de Tarefas */}
      {tasksViewMode === "list" ? (
        <div className="overflow-hidden">
          {paginatedTasks.length > 0 ? (
            paginatedTasks.map((tarefa, idx) => (
              <div
                key={tarefa.id}
                className={`flex items-center gap-4 px-5 py-3 group hover:brightness-95 transition-all ${
                  idx % 2 === 0 ? "bg-white" : "bg-slate-50/70"
                }`}
                style={{ borderLeft: `3px solid ${getStatusBorderColor(tarefa.status)}` }}
              >
                {/* ID */}
                <div className="flex items-center justify-center bg-blue-50 rounded px-2 py-0.5 shrink-0">
                  <span className="text-[11px] text-blue-600 font-bold">#{tarefa.uniqueId}</span>
                </div>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="text-sm font-semibold text-slate-900">{tarefa.nome}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium border border-slate-200">{tarefa.produtoNome}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium border border-blue-200">{tarefa.projectName}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-[11px] text-slate-400 flex-wrap">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span className="font-medium text-slate-600">{tarefa.executor}</span>
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span className="font-medium text-slate-600">{tarefa.lider}</span>
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span className="font-medium text-slate-600">{tarefa.prazo}</span>
                    </span>
                  </div>
                </div>

                {/* Status pill */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border ${getStatusBadgeColor(tarefa.status)}`}>
                    <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${getStatusDotClass(tarefa.status)}`} />
                    {tarefa.status}
                  </div>
                  <button
                    className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    title="Visualizar Tarefa"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                <CheckSquare className="h-7 w-7 opacity-40" />
              </div>
              <p className="text-sm font-medium text-slate-500">Nenhuma tarefa encontrada</p>
              <p className="text-xs text-slate-400 mt-1">Tente ajustar os filtros ou a busca</p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto px-5 pb-4 pt-4">
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

        </div>{/* end Content */}

        {/* ── Bottom bar ── */}
        {filteredTasks.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/40">
            <div className="flex items-center gap-2">
              <ItemsPerPageSelect
                value={itemsPerPage.toString()}
                onValueChange={(v) => handleItemsPerPageChange(parseInt(v))}
                variant="bottom"
              />
              <span className="text-xs text-slate-400 whitespace-nowrap">
                {filteredTasks.length !== mockCompanyTasks.length
                  ? <>de <span className="font-semibold text-blue-500">{filteredTasks.length}</span> de {mockCompanyTasks.length} tarefa{mockCompanyTasks.length !== 1 ? "s" : ""}</>
                  : <>de <span className="font-semibold text-slate-600">{mockCompanyTasks.length}</span> tarefa{mockCompanyTasks.length !== 1 ? "s" : ""}</>
                }
              </span>
            </div>
            <div className="flex items-center gap-0.5">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                className="h-7 w-7 flex items-center justify-center rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors">
                <ChevronDown className="h-3.5 w-3.5 rotate-90" />
              </button>
              {getPageNumbers().map((page, idx) =>
                page === "..." ? (
                  <span key={idx} className="text-xs text-slate-300 px-0.5">·</span>
                ) : (
                  <button key={idx} onClick={() => setCurrentPage(Number(page))}
                    className={`h-7 w-7 flex items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                      page === currentPage ? "bg-blue-500 text-white shadow-sm shadow-blue-200" : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                    }`}>
                    {page}
                  </button>
                )
              )}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0}
                className="h-7 w-7 flex items-center justify-center rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors">
                <ChevronDown className="h-3.5 w-3.5 -rotate-90" />
              </button>
            </div>
          </div>
        )}

      </div>{/* end Main Card */}

      {/* ── Advanced Filter Modal ── */}
      {isTaskFilterModalOpen && (() => {
        const allFilterFields = [
          { id: "projeto",   label: "Projeto" },
          { id: "status",    label: "Status" },
          { id: "prazo",     label: "Data do Prazo" },
          { id: "executor",  label: "Executor" },
          { id: "lider",     label: "Líder" },
        ]
        const has = (id: string) => visibleFields.includes(id)
        const hasSection = (...ids: string[]) => ids.some(id => has(id))

        const handleDrop = (targetId: string) => {
          if (!draggingFilterId || draggingFilterId === targetId) return
          const from = savedFilters.findIndex(f => f.id === draggingFilterId)
          const to   = savedFilters.findIndex(f => f.id === targetId)
          if (from === -1 || to === -1) return
          const reordered = [...savedFilters]
          const [moved] = reordered.splice(from, 1)
          reordered.splice(to, 0, moved)
          setSavedFilters(reordered)
          setDraggingFilterId(null)
          setDragOverFilterId(null)
        }

        const emptyFilters = { project: "all", statuses: [] as string[], deadlineFrom: "", deadlineTo: "", executor: "", lider: "" }

        return (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/25 backdrop-blur-[3px]"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                if (unsavedChanges && !window.confirm("Alterações não salvas. Deseja sair?")) return
                setIsTaskFilterModalOpen(false); setSelectedFilterId(null); setUnsavedChanges(false); setShowFieldPicker(false)
              }
            }}
          >
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-[820px] max-h-[82vh] border border-slate-200 animate-in fade-in zoom-in duration-200 flex flex-col overflow-hidden">

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 flex-shrink-0" style={getHeaderStyle()}>
                <div>
                  <h2 className="text-sm font-bold text-white">Filtros Avançados</h2>
                  <p className="text-[11px] text-white/60 mt-0.5">
                    {unsavedChanges ? "• Alterações não salvas" : selectedFilterId ? "Filtro carregado" : "Configure e aplique filtros"}
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (unsavedChanges && !window.confirm("Alterações não salvas. Deseja sair?")) return
                    setIsTaskFilterModalOpen(false); setSelectedFilterId(null); setUnsavedChanges(false); setShowFieldPicker(false)
                  }}
                  className="text-white/70 hover:text-white hover:bg-white/20 rounded-lg p-1.5 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body */}
              <div className="flex flex-1 overflow-hidden min-h-0">

                {/* Left — Saved Filters */}
                <div className="w-44 border-r border-slate-200 flex-shrink-0 bg-slate-50 flex flex-col overflow-hidden">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-3 pt-3 pb-2 flex items-center gap-1 flex-shrink-0">
                    <Filter className="h-3 w-3" /> Filtros Salvos
                  </p>
                  <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-1">
                    {savedFilters.length === 0 ? (
                      <div className="text-center py-8">
                        <Filter className="h-6 w-6 mx-auto text-slate-300 mb-1.5" />
                        <p className="text-[10px] text-slate-400">Nenhum filtro salvo</p>
                      </div>
                    ) : (
                      savedFilters.map((filter) => (
                        <div
                          key={filter.id}
                          draggable
                          onDragStart={() => setDraggingFilterId(filter.id)}
                          onDragOver={(e) => { e.preventDefault(); setDragOverFilterId(filter.id) }}
                          onDrop={() => handleDrop(filter.id)}
                          onDragEnd={() => { setDraggingFilterId(null); setDragOverFilterId(null) }}
                          onClick={() => {
                            if (editingFilterId) return
                            setAdvancedFilters(filter.filters)
                            setSelectedFilterId(filter.id)
                            setUnsavedChanges(false)
                          }}
                          className={`group relative flex items-center gap-1 p-2 rounded-lg border text-[11px] cursor-pointer transition-all select-none ${
                            dragOverFilterId === filter.id && draggingFilterId !== filter.id ? "border-blue-400 bg-blue-50" :
                            draggingFilterId === filter.id ? "opacity-40" :
                            selectedFilterId === filter.id
                              ? "bg-blue-50 border-blue-300 text-blue-700 font-semibold"
                              : "bg-white border-slate-200 text-slate-700 hover:border-blue-300"
                          }`}
                        >
                          <GripVertical className="h-3 w-3 text-slate-300 flex-shrink-0 cursor-grab active:cursor-grabbing" />
                          {editingFilterId === filter.id ? (
                            <input
                              autoFocus
                              type="text"
                              value={editingFilterName}
                              onChange={(e) => setEditingFilterName(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => {
                                e.stopPropagation()
                                if (e.key === "Enter" && editingFilterName.trim()) {
                                  setSavedFilters(savedFilters.map(f => f.id === filter.id ? { ...f, name: editingFilterName.trim() } : f))
                                  setEditingFilterId(null)
                                } else if (e.key === "Escape") setEditingFilterId(null)
                              }}
                              onBlur={() => {
                                if (editingFilterName.trim())
                                  setSavedFilters(savedFilters.map(f => f.id === filter.id ? { ...f, name: editingFilterName.trim() } : f))
                                setEditingFilterId(null)
                              }}
                              className="flex-1 min-w-0 text-[11px] bg-white border border-blue-400 rounded px-1 py-0 outline-none focus:ring-1 focus:ring-blue-400 text-slate-700"
                            />
                          ) : (
                            <span className="flex-1 truncate">{filter.name}</span>
                          )}
                          {editingFilterId !== filter.id && (
                            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity flex-shrink-0">
                              <button onClick={(e) => { e.stopPropagation(); setEditingFilterId(filter.id); setEditingFilterName(filter.name) }}
                                title="Renomear" className="p-0.5 rounded hover:bg-blue-100 hover:text-blue-500 text-slate-400 transition-all">
                                <Pencil className="h-2.5 w-2.5" />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); setSavedFilters(savedFilters.filter(f => f.id !== filter.id)); if (selectedFilterId === filter.id) setSelectedFilterId(null) }}
                                title="Excluir" className="p-0.5 rounded hover:bg-red-100 hover:text-red-500 text-slate-400 transition-all">
                                <X className="h-2.5 w-2.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Right — Filter fields */}
                <div className="flex-1 min-h-0 flex flex-col relative">

                  {/* Field picker dropdown */}
                  {showFieldPicker && (
                    <div className="absolute top-10 left-3 z-20 bg-white border border-slate-200 rounded-xl shadow-xl p-4 w-[360px] animate-in fade-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold text-slate-700">Campos disponíveis</p>
                        <div className="flex items-center gap-3">
                          <button onClick={() => setVisibleFields(allFilterFields.map(f => f.id))} className="text-[11px] text-blue-500 hover:text-blue-700 font-medium transition-colors">Selecionar todos</button>
                          <button onClick={() => setVisibleFields([])} className="text-[11px] text-slate-400 hover:text-red-500 transition-colors">Limpar</button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                        {allFilterFields.map(field => {
                          const checked = visibleFields.includes(field.id)
                          return (
                            <label key={field.id} className="flex items-center gap-2 py-1 cursor-pointer group">
                              <div onClick={() => setVisibleFields(checked ? visibleFields.filter(f => f !== field.id) : [...visibleFields, field.id])}
                                className={`w-4 h-4 rounded flex items-center justify-center border-2 transition-colors flex-shrink-0 ${checked ? "bg-blue-500 border-blue-500" : "border-slate-300 group-hover:border-blue-400"}`}>
                                {checked && <svg viewBox="0 0 10 8" className="w-2.5 h-2.5 text-white fill-none stroke-current stroke-[2]"><path d="M1 4l3 3 5-6" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                              </div>
                              <span className="text-[12px] text-slate-600 group-hover:text-slate-900 transition-colors select-none">{field.label}</span>
                            </label>
                          )
                        })}
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <button onClick={() => setVisibleFields(["projeto", "status", "prazo"])} className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors">Recuperar campos padrão</button>
                        <button onClick={() => setShowFieldPicker(false)} className="h-7 px-3 rounded-md text-[11px] font-medium bg-gradient-to-r from-blue-600 to-violet-600 text-white">Confirmar</button>
                      </div>
                    </div>
                  )}

                  {/* "Adicionar campo" bar */}
                  <div className="flex items-center gap-3 px-4 pt-2.5 pb-2 border-b border-slate-100 flex-shrink-0">
                    <button onClick={() => setShowFieldPicker(!showFieldPicker)}
                      className={`text-[12px] font-medium transition-colors ${showFieldPicker ? "text-blue-600" : "text-blue-500 hover:text-blue-700"}`}>
                      + Adicionar campo
                    </button>
                    {visibleFields.length > 0 && (
                      <span className="text-[11px] text-slate-400">{visibleFields.length} campo{visibleFields.length !== 1 ? "s" : ""} ativo{visibleFields.length !== 1 ? "s" : ""}</span>
                    )}
                    {showFieldPicker && (
                      <button onClick={() => setShowFieldPicker(false)} className="ml-auto text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Filter fields */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">

                    {/* Identificação */}
                    {hasSection("projeto") && (
                      <div>
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Identificação</p>
                        <div className="grid grid-cols-2 gap-2">
                          {has("projeto") && (
                            <Select value={advancedFilters.project} onValueChange={(v) => { setAdvancedFilters({ ...advancedFilters, project: v }); if (selectedFilterId) setUnsavedChanges(true) }}>
                              <SelectTrigger className="h-7 text-xs">
                                <SelectValue placeholder="Todos os Projetos" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Todos os Projetos</SelectItem>
                                {projects.map((p) => (
                                  <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Status */}
                    {has("status") && (
                      <div>
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Status · Tipo</p>
                        <div className="flex flex-wrap gap-1.5">
                          {allStatuses.map((s) => (
                            <button key={s}
                              onClick={() => {
                                const updated = advancedFilters.statuses.includes(s)
                                  ? advancedFilters.statuses.filter(x => x !== s)
                                  : [...advancedFilters.statuses, s]
                                setAdvancedFilters({ ...advancedFilters, statuses: updated })
                                if (selectedFilterId) setUnsavedChanges(true)
                              }}
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${advancedFilters.statuses.includes(s) ? "bg-indigo-500 text-white border-indigo-500" : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"}`}>
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Data do Prazo */}
                    {has("prazo") && (
                      <div>
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Data do Prazo</p>
                        <div className="flex items-center gap-2">
                          <Input type="date" value={advancedFilters.deadlineFrom} onChange={(e) => { setAdvancedFilters({ ...advancedFilters, deadlineFrom: e.target.value }); if (selectedFilterId) setUnsavedChanges(true) }} className="h-7 text-xs flex-1" />
                          <span className="text-slate-300 text-xs flex-shrink-0">até</span>
                          <Input type="date" value={advancedFilters.deadlineTo} onChange={(e) => { setAdvancedFilters({ ...advancedFilters, deadlineTo: e.target.value }); if (selectedFilterId) setUnsavedChanges(true) }} className="h-7 text-xs flex-1" />
                        </div>
                      </div>
                    )}

                    {/* Executor */}
                    {has("executor") && (
                      <div>
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Executor</p>
                        <Input placeholder="Nome do executor" value={advancedFilters.executor} onChange={(e) => { setAdvancedFilters({ ...advancedFilters, executor: e.target.value }); if (selectedFilterId) setUnsavedChanges(true) }} className="h-7 text-xs" />
                      </div>
                    )}

                    {/* Líder */}
                    {has("lider") && (
                      <div>
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Líder</p>
                        <Input placeholder="Nome do líder" value={advancedFilters.lider} onChange={(e) => { setAdvancedFilters({ ...advancedFilters, lider: e.target.value }); if (selectedFilterId) setUnsavedChanges(true) }} className="h-7 text-xs" />
                      </div>
                    )}

                    {visibleFields.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                        <Filter className="h-8 w-8 mb-2 opacity-30" />
                        <p className="text-xs text-center">Nenhum campo ativo.<br/>Clique em <span className="text-blue-500">+ Adicionar campo</span> para configurar.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-200 bg-slate-50/50 flex-shrink-0">
                <button
                  onClick={() => { setAdvancedFilters(emptyFilters); setUnsavedChanges(false) }}
                  className="text-[11px] text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1"
                >
                  <X className="h-3 w-3" /> Limpar filtros
                </button>
                <div className="flex items-center gap-2">
                  {showSaveInput ? (
                    <div className="flex items-center gap-1.5">
                      <input autoFocus type="text" value={filterNameInput}
                        onChange={(e) => setFilterNameInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && filterNameInput.trim()) {
                            const newId = `filter-${Date.now()}`
                            setSavedFilters([...savedFilters, { id: newId, name: filterNameInput.trim(), filters: advancedFilters }])
                            setSelectedFilterId(newId); setUnsavedChanges(false); setShowSaveInput(false); setFilterNameInput("")
                          }
                          if (e.key === "Escape") { setShowSaveInput(false); setFilterNameInput("") }
                        }}
                        placeholder={`Filtro ${savedFilters.length + 1}`}
                        className="h-7 px-2 rounded-md text-[11px] border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400 w-36"
                      />
                      <button disabled={!filterNameInput.trim()}
                        onClick={() => { const newId = `filter-${Date.now()}`; setSavedFilters([...savedFilters, { id: newId, name: filterNameInput.trim(), filters: advancedFilters }]); setSelectedFilterId(newId); setUnsavedChanges(false); setShowSaveInput(false); setFilterNameInput("") }}
                        className="h-7 px-3 rounded-md text-[11px] font-medium bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-40 text-white transition-all shadow-sm">OK</button>
                      <button onClick={() => { setShowSaveInput(false); setFilterNameInput("") }}
                        className="h-7 w-7 flex items-center justify-center rounded-md text-[11px] border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-300 transition-colors">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : selectedFilterId && unsavedChanges ? (
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => { setSavedFilters(savedFilters.map(f => f.id === selectedFilterId ? { ...f, filters: advancedFilters } : f)); setUnsavedChanges(false) }}
                        className="h-7 px-3 rounded-md text-[11px] font-medium bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white transition-all shadow-sm">
                        Atualizar filtro
                      </button>
                      <button onClick={() => { setFilterNameInput(`Filtro ${savedFilters.length + 1}`); setShowSaveInput(true) }}
                        className="h-7 px-3 rounded-md text-[11px] font-medium border border-emerald-400 text-emerald-600 hover:bg-emerald-50 transition-colors">
                        Salvar como novo
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => { setFilterNameInput(`Filtro ${savedFilters.length + 1}`); setShowSaveInput(true) }}
                      className="h-7 px-3 rounded-md text-[11px] font-medium bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white transition-all shadow-sm">
                      Salvar filtro
                    </button>
                  )}
                  <div className="w-px h-5 bg-slate-200" />
                  <button onClick={() => { setIsTaskFilterModalOpen(false); setUnsavedChanges(false); setShowFieldPicker(false) }}
                    className="h-7 px-3 rounded-md text-[11px] font-medium border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors">
                    Cancelar
                  </button>
                  <button onClick={() => { setIsTaskFilterModalOpen(false); setShowFieldPicker(false); setCurrentPage(1) }}
                    className="h-7 px-4 rounded-md text-[11px] font-semibold bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white transition-all shadow-sm shadow-blue-200">
                    Aplicar Filtros
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
