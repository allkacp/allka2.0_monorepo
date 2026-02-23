// @ts-nocheck
import { useState, useMemo, type CSSProperties } from "react"
import { ProjectManagementModal } from "@/components/project-management-modal"
import { Eye, Copy, FileText, Edit, Ban, ExternalLink, Search, ChevronDown, ChevronUp, Briefcase, CheckCircle2, Clock, XCircle, DollarSign, TrendingUp, Filter, X, Pencil, GripVertical, Settings2, FolderKanban } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { useSidebar } from "@/contexts/sidebar-context"
import { ItemsPerPageSelect } from "@/components/items-per-page-select"

const gradientMap: Record<string, string> = {
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

interface Project {
  id: number
  name: string
  client: string
  clientCNPJ: string
  agency: string
  consultant: string
  consultantEmail: string
  type: string
  status: string
  progress: number
  budget: number
  spent: number
  createdDate: string
  startDate: string
  deadline: string
  team: number
  nomades: string[]
  bitrixSync: boolean
  portfolioPermission: boolean
  overdue: boolean
  value: number
  fromLead: boolean
  companyId?: number
}

interface ProjectsManagementTabProps {
  company: {
    id: string
    name: string
  }
}

// Mock de projetos - em produção viriam da API
const mockAllProjects: Project[] = [
  {
    id: 1,
    name: "Hospedagem Florescer Idosos",
    client: "Florescer",
    clientCNPJ: "12.345.678/0001-90",
    agency: "Lamego Academy",
    consultant: "Equipe Lamego",
    consultantEmail: "contato@lamego.com.vc",
    type: "Marketing Digital",
    status: "awaiting-payment",
    progress: 65,
    budget: 15000,
    spent: 9750,
    createdDate: "19/02/2025",
    startDate: "2024-01-15",
    deadline: "2024-03-30",
    team: 5,
    nomades: ["Ana Santos", "Carlos Lima"],
    bitrixSync: false,
    portfolioPermission: false,
    overdue: false,
    value: 15000,
    fromLead: true,
    companyId: 1,
  },
  {
    id: 2,
    name: "Redesign Website Startup ABC",
    client: "Startup ABC",
    clientCNPJ: "98.765.432/0001-10",
    agency: "Design Studio",
    consultant: "Maria Designer",
    consultantEmail: "maria@designstudio.com",
    type: "Desenvolvimento Web",
    status: "in-progress",
    progress: 45,
    budget: 25000,
    spent: 11250,
    createdDate: "15/01/2025",
    startDate: "2024-02-01",
    deadline: "2024-05-15",
    team: 3,
    nomades: ["Maria Silva", "João Dev"],
    bitrixSync: true,
    portfolioPermission: true,
    overdue: false,
    value: 25000,
    fromLead: false,
    companyId: 1,
  },
  {
    id: 3,
    name: "Identidade Visual FoodCorp",
    client: "FoodCorp",
    clientCNPJ: "11.222.333/0001-44",
    agency: "Creative Partners",
    consultant: "Pedro Criativo",
    consultantEmail: "pedro@creative.com",
    type: "Design",
    status: "completed",
    progress: 100,
    budget: 8000,
    spent: 7800,
    createdDate: "10/12/2024",
    startDate: "2023-12-10",
    deadline: "2024-01-20",
    team: 2,
    nomades: ["Ana Santos"],
    bitrixSync: true,
    portfolioPermission: false,
    overdue: false,
    value: 8000,
    fromLead: true,
    companyId: 1,
  },
  {
    id: 4,
    name: "Campanha Lançamento Produto XYZ",
    client: "Tech Innovations",
    clientCNPJ: "22.333.444/0001-55",
    agency: "Marketing Pro",
    consultant: "Lucas Marketing",
    consultantEmail: "lucas@marketingpro.com",
    type: "Marketing Digital",
    status: "negotiation",
    progress: 20,
    budget: 32000,
    spent: 6400,
    createdDate: "05/02/2025",
    startDate: "2024-03-01",
    deadline: "2024-06-30",
    team: 4,
    nomades: ["Carlos Lima", "Ana Santos"],
    bitrixSync: true,
    portfolioPermission: true,
    overdue: false,
    value: 32000,
    fromLead: true,
    companyId: 1,
  },
  {
    id: 5,
    name: "Desenvolvimento App Mobile E-commerce",
    client: "E-Shop Brasil",
    clientCNPJ: "55.666.777/0001-88",
    agency: "Tech Solutions",
    consultant: "Rafael Dev",
    consultantEmail: "rafael@techsolutions.com",
    type: "Desenvolvimento Mobile",
    status: "planning",
    progress: 10,
    budget: 45000,
    spent: 4500,
    createdDate: "25/01/2025",
    startDate: "2024-03-15",
    deadline: "2024-10-30",
    team: 6,
    nomades: ["João Dev", "Maria Silva", "Carlos Dev"],
    bitrixSync: true,
    portfolioPermission: true,
    overdue: false,
    value: 45000,
    fromLead: true,
    companyId: 1,
  },
  {
    id: 6,
    name: "Consultoria Estratégica Digital Cancelada",
    client: "Old Corp",
    clientCNPJ: "33.444.555/0001-66",
    agency: "Consulting Plus",
    consultant: "Joana Consultora",
    consultantEmail: "joana@consulting.com",
    type: "Consultoria",
    status: "canceled",
    progress: 30,
    budget: 18000,
    spent: 5400,
    createdDate: "01/12/2024",
    startDate: "2024-01-10",
    deadline: "2024-04-10",
    team: 2,
    nomades: ["Ana Santos"],
    bitrixSync: false,
    portfolioPermission: false,
    overdue: true,
    value: 18000,
    fromLead: false,
    companyId: 1,
  },
]

export function ProjectsManagementTab({ company }: ProjectsManagementTabProps) {
  const { sidebarSettings, previewTheme } = useSidebar()
  const appliedTheme = previewTheme ?? sidebarSettings
  const themeBg = appliedTheme.backgroundColor
  const getHeaderStyle = (): CSSProperties => {
    if (!themeBg || themeBg === "bg-slate-900") return { background: "linear-gradient(to right, #0a1628, #1e3a8a, #0a1628)" }
    if (themeBg.startsWith("custom-gradient:")) return { background: themeBg.replace("custom-gradient:", "") }
    if (themeBg.includes("gradient")) return { background: gradientMap[themeBg] || "#0f172a" }
    return {}
  }

  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [colConfigOpen, setColConfigOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<"view" | "edit">("view")
  const [expandedId, setExpandedId] = useState<number | null>(null)

  // Advanced filters modal
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
  const [advancedFilters, setAdvancedFilters] = useState({
    name: "",
    client: "",
    statuses: [] as string[],
    types: [] as string[],
    deadlineFrom: "",
    deadlineTo: "",
    createdFrom: "",
    createdTo: "",
  })
  const [savedFilters, setSavedFilters] = useState<Array<{id: string, name: string, filters: any}>>([])
  const [selectedFilterId, setSelectedFilterId] = useState<string | null>(null)
  const [unsavedChanges, setUnsavedChanges] = useState(false)
  const [showSaveInput, setShowSaveInput] = useState(false)
  const [filterNameInput, setFilterNameInput] = useState("")
  const [editingFilterId, setEditingFilterId] = useState<string | null>(null)
  const [editingFilterName, setEditingFilterName] = useState("")
  const [draggingFilterId, setDraggingFilterId] = useState<string | null>(null)
  const [dragOverFilterId, setDragOverFilterId] = useState<string | null>(null)
  const [visibleFields, setVisibleFields] = useState<string[]>(["nome", "cliente", "status", "tipo", "prazo"])
  const [showFieldPicker, setShowFieldPicker] = useState(false)

  const companyProjects = useMemo(() => {
    return mockAllProjects.filter(
      (p) => p.client.toLowerCase() === company.name.toLowerCase() || p.companyId === parseInt(company.id)
    )
  }, [company.id, company.name])

  const filteredProjects = useMemo(() => {
    return companyProjects.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.client.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesAdvName = !advancedFilters.name || p.name.toLowerCase().includes(advancedFilters.name.toLowerCase())
      const matchesAdvClient = !advancedFilters.client || p.client.toLowerCase().includes(advancedFilters.client.toLowerCase())
      const matchesAdvStatus = advancedFilters.statuses.length === 0 || advancedFilters.statuses.includes(p.status)
      const matchesAdvType = advancedFilters.types.length === 0 || advancedFilters.types.includes(p.type)
      const matchesDeadlineFrom = !advancedFilters.deadlineFrom || new Date(p.deadline) >= new Date(advancedFilters.deadlineFrom)
      const matchesDeadlineTo = !advancedFilters.deadlineTo || new Date(p.deadline) <= new Date(advancedFilters.deadlineTo)
      const matchesCreatedFrom = !advancedFilters.createdFrom || new Date(p.startDate) >= new Date(advancedFilters.createdFrom)
      const matchesCreatedTo = !advancedFilters.createdTo || new Date(p.startDate) <= new Date(advancedFilters.createdTo)
      return matchesSearch && matchesAdvName && matchesAdvClient && matchesAdvStatus && matchesAdvType && matchesDeadlineFrom && matchesDeadlineTo && matchesCreatedFrom && matchesCreatedTo
    })
  }, [companyProjects, searchTerm, advancedFilters])

  const totalProjects = filteredProjects.length
  const totalPages = Math.ceil(totalProjects / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedProjects = filteredProjects.slice(startIndex, startIndex + itemsPerPage)

  const handleItemsPerPageChange = (value: number) => { setItemsPerPage(value); setCurrentPage(1) }

  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisible = 5
    const half = Math.floor(maxVisible / 2)
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else if (currentPage <= half + 1) {
      for (let i = 1; i <= maxVisible; i++) pages.push(i)
      if (totalPages > maxVisible) pages.push("...")
    } else if (currentPage >= totalPages - half) {
      pages.push("...")
      for (let i = totalPages - maxVisible + 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push("...")
      for (let i = currentPage - half; i <= currentPage + half; i++) pages.push(i)
      pages.push("...")
    }
    return pages
  }

  const STATUS_MAP: Record<string, { label: string; color: string; dot: string }> = {
    "awaiting-payment": { label: "Aguard. Pagamento", color: "bg-cyan-100 text-cyan-800",   dot: "bg-cyan-500" },
    "in-progress":      { label: "Em Andamento",      color: "bg-blue-100 text-blue-800",   dot: "bg-blue-500" },
    "completed":        { label: "Concluído",          color: "bg-emerald-100 text-emerald-800", dot: "bg-emerald-500" },
    "negotiation":      { label: "Negociação",         color: "bg-slate-100 text-slate-700", dot: "bg-slate-400" },
    "planning":         { label: "Planejamento",       color: "bg-orange-100 text-orange-800", dot: "bg-orange-500" },
    "canceled":         { label: "Cancelado",          color: "bg-red-100 text-red-800",     dot: "bg-red-500" },
    "draft":            { label: "Rascunho",           color: "bg-slate-100 text-slate-600", dot: "bg-slate-400" },
  }

  const allTypes = ["Marketing Digital", "Desenvolvimento Web", "Design", "Consultoria", "E-commerce", "Desenvolvimento Mobile"]
  const allStatuses = Object.entries(STATUS_MAP).map(([value, { label }]) => ({ value, label }))

  const handleViewProject = (project: Project) => { setSelectedProject(project); setModalMode("view"); setModalOpen(true) }
  const handleEditProject = (project: Project) => { setSelectedProject(project); setModalMode("edit"); setModalOpen(true) }
  const handleCloneProject = (project: Project) => { console.log("Clonando projeto:", project.name) }
  const handleExportProject = (project: Project) => { console.log("Exportando proposta:", project.name) }
  const handleCancelProject = (project: Project) => { console.log("Cancelando projeto:", project.name) }
  const handleSaveProjectChanges = (updatedProject: Project) => { setSelectedProject(updatedProject); setModalMode("view") }

  // Stats
  const stats = {
    total:     companyProjects.length,
    active:    companyProjects.filter(p => p.status === "in-progress").length,
    completed: companyProjects.filter(p => p.status === "completed").length,
    canceled:  companyProjects.filter(p => p.status === "canceled").length,
    pending:   companyProjects.filter(p => p.status === "awaiting-payment").length,
  }

  return (
    <div className="space-y-4">

      {/* ── Stats bar ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-2">
          <div className="h-6 w-6 rounded-md bg-indigo-100 flex items-center justify-center">
            <Briefcase className="h-3.5 w-3.5 text-indigo-600" />
          </div>
          <span className="text-xs font-semibold text-slate-600">Total</span>
          <span className="text-sm font-bold text-slate-900">{stats.total}</span>
        </div>
        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-2">
          <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
          <span className="text-xs font-semibold text-slate-500">Em Andamento</span>
          <span className="text-sm font-bold text-blue-600">{stats.active}</span>
        </div>
        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500 flex-shrink-0" />
          <span className="text-xs font-semibold text-slate-500">Concluídos</span>
          <span className="text-sm font-bold text-emerald-600">{stats.completed}</span>
        </div>
        {stats.pending > 0 && (
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-2">
            <div className="h-2 w-2 rounded-full bg-cyan-500 flex-shrink-0" />
            <span className="text-xs font-semibold text-slate-500">Ag. Pagamento</span>
            <span className="text-sm font-bold text-cyan-600">{stats.pending}</span>
          </div>
        )}
        {stats.canceled > 0 && (
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-2">
            <div className="h-2 w-2 rounded-full bg-red-400 flex-shrink-0" />
            <span className="text-xs font-semibold text-slate-500">Cancelados</span>
            <span className="text-sm font-bold text-red-500">{stats.canceled}</span>
          </div>
        )}
      </div>

      {/* ── Main Table Card ── */}
      <div className="border border-slate-200/70 shadow-sm overflow-hidden rounded-xl bg-white">

        {/* ── Top bar ── */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-200/70 bg-slate-50/60">
          {/* Search */}
          <div className="flex-1 relative min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar projeto ou cliente..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
              className="w-full pl-9 pr-3 h-9 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
            />
          </div>

          {/* Items per page + count */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <ItemsPerPageSelect
              value={itemsPerPage.toString()}
              onValueChange={(v) => handleItemsPerPageChange(parseInt(v))}
            />
            <span className="text-xs text-slate-400 whitespace-nowrap">
              {filteredProjects.length !== companyProjects.length
                ? <>de <span className="font-semibold text-blue-500">{filteredProjects.length}</span> de {companyProjects.length} projeto{companyProjects.length !== 1 ? "s" : ""}</>
                : <>de <span className="font-semibold text-slate-600">{companyProjects.length}</span> projeto{companyProjects.length !== 1 ? "s" : ""}</>
              }
            </span>
          </div>

          {/* Filtros button */}
          {(() => {
            const activeCount =
              (advancedFilters.name ? 1 : 0) +
              (advancedFilters.client ? 1 : 0) +
              advancedFilters.statuses.length +
              advancedFilters.types.length +
              (advancedFilters.deadlineFrom || advancedFilters.deadlineTo ? 1 : 0) +
              (advancedFilters.createdFrom || advancedFilters.createdTo ? 1 : 0)
            return (
              <button
                onClick={() => setIsFilterModalOpen(true)}
                className={`flex items-center gap-1.5 h-9 px-3.5 text-xs font-medium rounded-lg border transition-colors flex-shrink-0 ${activeCount > 0 ? "border-blue-400 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:bg-slate-100"}`}
              >
                <Filter className="h-3.5 w-3.5" />
                Filtros
                {activeCount > 0 && (
                  <span className="ml-0.5 min-w-[16px] h-4 px-1 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center">{activeCount}</span>
                )}
              </button>
            )
          })()}

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
                  className={`h-7 w-7 flex items-center justify-center rounded-full text-xs font-semibold transition-colors ${page === currentPage ? "bg-blue-500 text-white shadow-sm shadow-blue-200" : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"}`}>
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

        {/* ── Table ── */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200/60">
                <th className="py-3 px-5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider" style={{ borderRight: "1px solid rgba(148,163,184,0.25)" }}>Projeto · Tipo</th>
                <th className="py-3 px-5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-36" style={{ borderRight: "1px solid rgba(148,163,184,0.25)" }}>Progresso</th>
                <th className="py-3 px-5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider w-36" style={{ borderRight: "1px solid rgba(148,163,184,0.25)" }}>Orçamento</th>
                <th className="py-3 px-5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider w-32" style={{ borderRight: "1px solid rgba(148,163,184,0.25)" }}>Prazo</th>
                <th className="py-3 px-5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider w-36" style={{ borderRight: "1px solid rgba(148,163,184,0.25)" }}>Ações</th>
                {/* Column config button */}
                <th
                  className="py-3 select-none sticky right-0 bg-white z-10"
                  style={{ width: 36, borderLeft: "1px solid rgba(148,163,184,0.25)" }}
                >
                  <Popover open={colConfigOpen} onOpenChange={setColConfigOpen}>
                    <PopoverTrigger asChild>
                      <button
                        className={`mx-auto flex items-center justify-center h-6 w-6 rounded-md transition-colors ${
                          colConfigOpen
                            ? "bg-blue-100 text-blue-600"
                            : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                        }`}
                        title="Configurar colunas"
                      >
                        <Settings2 className="h-3.5 w-3.5" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="end" sideOffset={8} className="w-[220px] p-0">
                      <div className="px-4 py-3 border-b border-slate-100">
                        <p className="text-xs font-semibold text-slate-700">Colunas visíveis</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Todas as colunas estão ativas</p>
                      </div>
                      <div className="px-4 py-3 space-y-2">
                        {["Projeto · Tipo", "Progresso", "Orçamento", "Prazo", "Ações"].map(col => (
                          <div key={col} className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded flex items-center justify-center bg-blue-500 border-blue-500 border-2">
                              <svg viewBox="0 0 10 8" className="w-2.5 h-2.5 text-white fill-none stroke-current stroke-[2]"><path d="M1 4l3 3 5-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            </div>
                            <span className="text-xs text-slate-600">{col}</span>
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedProjects.map((project) => {
                const st = STATUS_MAP[project.status] ?? { label: project.status, color: "bg-slate-100 text-slate-600", dot: "bg-slate-400" }
                const isExpanded = expandedId === project.id
                const isCanceled = project.status === "canceled"

                return (
                  <>
                    <tr key={project.id}
                      className={`group hover:bg-slate-50 transition-colors cursor-pointer ${isCanceled ? "opacity-60" : ""}`}
                      onClick={() => setExpandedId(isExpanded ? null : project.id)}
                    >
                      {/* Projeto · Tipo */}
                      <td className="px-5 py-3.5" style={{ borderRight: "1px solid rgba(148,163,184,0.15)" }}>
                        <div className="flex items-center gap-3">
                          {/* Project avatar */}
                          <div className="h-9 w-9 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden border border-white/20"
                            style={{ background: ["linear-gradient(135deg,#1e3a8a,#0891b2)","linear-gradient(135deg,#065f46,#10b981)","linear-gradient(135deg,#581c87,#818cf8)","linear-gradient(135deg,#7f1d1d,#f97316)","linear-gradient(135deg,#0f172a,#4f46e5)","linear-gradient(135deg,#064e3b,#06b6d4)","linear-gradient(135deg,#831843,#f43f5e)","linear-gradient(135deg,#451a03,#fbbf24)"][project.id % 8] }}>
                            <FolderKanban className="h-4 w-4 text-white/90" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className={`text-sm font-semibold text-slate-900 ${isCanceled ? "line-through" : ""}`}>{project.name}</p>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 flex items-center gap-1 ${st.color}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                                {st.label}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {project.type} · Cliente: <span className="text-blue-600 font-semibold">{project.client}</span>
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Progresso */}
                      <td className="px-5 py-3.5" style={{ borderRight: "1px solid rgba(148,163,184,0.15)" }}>
                        <div className="flex items-center gap-2 w-full">
                          <div className="flex-1 bg-slate-200 rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full transition-all ${project.progress === 100 ? "bg-emerald-500" : project.status === "canceled" ? "bg-red-400" : "bg-blue-500"}`}
                              style={{ width: `${project.progress}%` }} />
                          </div>
                          <span className="text-xs font-bold text-slate-600 w-8 text-right flex-shrink-0">{project.progress}%</span>
                        </div>
                      </td>

                      {/* Orçamento */}
                      <td className="px-5 py-3.5 text-right" style={{ borderRight: "1px solid rgba(148,163,184,0.15)" }}>
                        <p className="text-sm font-bold text-slate-700">R$ {project.budget.toLocaleString('pt-BR')}</p>
                        <p className="text-xs text-orange-500 font-semibold">R$ {project.spent.toLocaleString('pt-BR')} gasto</p>
                      </td>

                      {/* Prazo */}
                      <td className="px-5 py-3.5 text-center" style={{ borderRight: "1px solid rgba(148,163,184,0.15)" }}>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Prazo</p>
                        <p className="text-sm font-bold text-slate-700">{new Date(project.deadline).toLocaleDateString('pt-BR')}</p>
                      </td>

                      {/* Ações */}
                      <td className="px-5 py-3.5" style={{ borderRight: "1px solid rgba(148,163,184,0.15)" }}>
                        <div className="flex items-center justify-end gap-0" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => handleViewProject(project)} title="Visualizar"
                            className="h-7 w-6 rounded-md flex items-center justify-center text-blue-500 hover:text-blue-700 hover:bg-blue-100 transition-colors">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleCloneProject(project)} title="Clonar"
                            className="h-7 w-6 rounded-md flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-blue-100 transition-colors">
                            <Copy className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleExportProject(project)} title="Exportar proposta"
                            className="h-7 w-6 rounded-md flex items-center justify-center text-slate-500 hover:text-emerald-600 hover:bg-emerald-100 transition-colors">
                            <FileText className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleEditProject(project)} title="Editar"
                            className="h-7 w-6 rounded-md flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-indigo-100 transition-colors">
                            <Edit className="h-4 w-4" />
                          </button>
                          {project.status !== "canceled" && (
                            <button onClick={() => handleCancelProject(project)} title="Cancelar"
                              className="h-7 w-6 rounded-md flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-100 transition-colors">
                              <Ban className="h-4 w-4" />
                            </button>
                          )}
                          <button onClick={(e) => { e.stopPropagation(); setExpandedId(isExpanded ? null : project.id) }}
                            className="h-7 w-6 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                        </div>
                      </td>
                      {/* sticky empty col for column config */}
                      <td className="sticky right-0 bg-white group-hover:bg-slate-50 transition-colors" style={{ borderLeft: "1px solid rgba(148,163,184,0.15)" }} />
                    </tr>

                    {/* Expanded row */}
                    {isExpanded && (
                      <tr key={`${project.id}-expanded`}>
                        <td colSpan={6} className="bg-slate-50/80 px-5 py-4 border-b border-slate-100">
                          <div className="grid grid-cols-3 gap-x-8 gap-y-3 text-xs mb-3">
                            <div>
                              <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mb-0.5">Checkout Agência</p>
                              <a href="#" className="text-blue-600 hover:underline flex items-center gap-1">Acessar <ExternalLink className="h-3 w-3" /></a>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mb-0.5">Checkout Cliente</p>
                              <a href="#" className="text-blue-600 hover:underline flex items-center gap-1">Acessar <ExternalLink className="h-3 w-3" /></a>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mb-0.5">CNPJ Cliente</p>
                              <p className="font-semibold text-slate-700">{project.clientCNPJ}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mb-0.5">Agência</p>
                              <a href="#" className="text-blue-600 hover:underline font-semibold">{project.agency}</a>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mb-0.5">Consultor</p>
                              <p className="font-semibold text-slate-700">{project.consultant}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mb-0.5">E-mail Consultor</p>
                              <p className="font-semibold text-slate-700">{project.consultantEmail}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mb-0.5">Criação</p>
                              <p className="font-semibold text-slate-700">{project.createdDate}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mb-0.5">Início</p>
                              <p className="font-semibold text-slate-700">{new Date(project.startDate).toLocaleDateString('pt-BR')}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mb-0.5">Equipe</p>
                              <p className="font-semibold text-slate-700">{project.team} membros</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 pt-2 border-t border-slate-200 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold">Bitrix</span>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${project.bitrixSync ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
                                {project.bitrixSync ? "Sincronizado" : "Não sincronizado"}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold">Portfólio</span>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${project.portfolioPermission ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                                {project.portfolioPermission ? "Permitido" : "Não permitido"}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold">Nômades</span>
                              <div className="flex gap-1 flex-wrap">
                                {project.nomades.map((n, i) => (
                                  <span key={i} className="text-[9px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">{n}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Empty state */}
        {paginatedProjects.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
              <Briefcase className="h-7 w-7 opacity-40" />
            </div>
            <p className="text-sm font-medium text-slate-500">Nenhum projeto encontrado</p>
            <p className="text-xs text-slate-400 mt-1">Tente ajustar os filtros ou a busca</p>
          </div>
        )}

        {/* Bottom pagination */}
        {filteredProjects.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/40">
            <div className="flex items-center gap-2">
              <ItemsPerPageSelect
                value={itemsPerPage.toString()}
                onValueChange={(v) => handleItemsPerPageChange(parseInt(v))}
                variant="bottom"
              />
              <span className="text-xs text-slate-400 whitespace-nowrap">
                {filteredProjects.length !== companyProjects.length
                  ? <>de <span className="font-semibold text-blue-500">{filteredProjects.length}</span> de {companyProjects.length} projeto{companyProjects.length !== 1 ? "s" : ""}</>
                  : <>de <span className="font-semibold text-slate-600">{companyProjects.length}</span> projeto{companyProjects.length !== 1 ? "s" : ""}</>
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
                    className={`h-7 w-7 flex items-center justify-center rounded-full text-xs font-semibold transition-colors ${page === currentPage ? "bg-blue-500 text-white shadow-sm shadow-blue-200" : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"}`}>
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
      </div>

      {/* ── Modal ── */}
      <ProjectManagementModal
        project={selectedProject}
        open={modalOpen}
        onOpenChange={setModalOpen}
        mode={modalMode}
        onEdit={() => handleEditProject(selectedProject!)}
        onClone={() => handleCloneProject(selectedProject!)}
        onExport={() => handleExportProject(selectedProject!)}
        onSave={handleSaveProjectChanges}
        onCancel={() => handleCancelProject(selectedProject!)}
      />

      {/* ── Advanced Filters Modal ── */}
      {isFilterModalOpen && (() => {
        const allFilterFields = [
          { id: "nome",     label: "Nome do Projeto" },
          { id: "cliente",  label: "Cliente" },
          { id: "status",   label: "Status" },
          { id: "tipo",     label: "Tipo de Projeto" },
          { id: "prazo",    label: "Data do Prazo" },
          { id: "inicio",   label: "Data de Início" },
        ]
        const has = (id: string) => visibleFields.includes(id)
        const hasSection = (...ids: string[]) => ids.some(id => has(id))

        const handleDrop = (targetId: string) => {
          if (!draggingFilterId || draggingFilterId === targetId) return
          const from = savedFilters.findIndex(f => f.id === draggingFilterId)
          const to = savedFilters.findIndex(f => f.id === targetId)
          if (from === -1 || to === -1) return
          const reordered = [...savedFilters]
          const [moved] = reordered.splice(from, 1)
          reordered.splice(to, 0, moved)
          setSavedFilters(reordered)
          setDraggingFilterId(null)
          setDragOverFilterId(null)
        }

        const emptyFilters = { name: "", client: "", statuses: [] as string[], types: [] as string[], deadlineFrom: "", deadlineTo: "", createdFrom: "", createdTo: "" }

        return (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/25 backdrop-blur-[3px]"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                if (unsavedChanges && !window.confirm("Alterações não salvas. Deseja sair?")) return
                setIsFilterModalOpen(false); setSelectedFilterId(null); setUnsavedChanges(false); setShowFieldPicker(false)
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
                    setIsFilterModalOpen(false); setSelectedFilterId(null); setUnsavedChanges(false); setShowFieldPicker(false)
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
                    <div className="absolute top-10 left-3 z-20 bg-white border border-slate-200 rounded-xl shadow-xl p-4 w-[400px] animate-in fade-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
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
                        <button onClick={() => setVisibleFields(["nome","cliente","status","tipo","prazo"])} className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors">Recuperar campos padrão</button>
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
                    {hasSection("nome","cliente") && (
                      <div>
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Identificação</p>
                        <div className="grid grid-cols-2 gap-2">
                          {has("nome") && <Input placeholder="Nome do Projeto" value={advancedFilters.name} onChange={(e) => { setAdvancedFilters({...advancedFilters, name: e.target.value}); if (selectedFilterId) setUnsavedChanges(true) }} className="h-7 text-xs" />}
                          {has("cliente") && <Input placeholder="Cliente" value={advancedFilters.client} onChange={(e) => { setAdvancedFilters({...advancedFilters, client: e.target.value}); if (selectedFilterId) setUnsavedChanges(true) }} className="h-7 text-xs" />}
                        </div>
                      </div>
                    )}

                    {/* Status · Tipo */}
                    {hasSection("status","tipo") && (
                      <div>
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Status · Tipo</p>
                        <div className="space-y-2">
                          {has("status") && (
                            <div className="flex flex-wrap gap-1.5">
                              {Object.entries(STATUS_MAP).map(([v, { label }]) => (
                                <button key={v} onClick={() => { const s = advancedFilters.statuses.includes(v) ? advancedFilters.statuses.filter(x=>x!==v) : [...advancedFilters.statuses,v]; setAdvancedFilters({...advancedFilters, statuses: s}); if (selectedFilterId) setUnsavedChanges(true) }}
                                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${advancedFilters.statuses.includes(v) ? "bg-indigo-500 text-white border-indigo-500" : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"}`}>
                                  {label}
                                </button>
                              ))}
                            </div>
                          )}
                          {has("tipo") && (
                            <div className="flex flex-wrap gap-1.5">
                              {allTypes.map(t => (
                                <button key={t} onClick={() => { const ty = advancedFilters.types.includes(t) ? advancedFilters.types.filter(x=>x!==t) : [...advancedFilters.types,t]; setAdvancedFilters({...advancedFilters, types: ty}); if (selectedFilterId) setUnsavedChanges(true) }}
                                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${advancedFilters.types.includes(t) ? "bg-violet-500 text-white border-violet-500" : "bg-white text-slate-600 border-slate-200 hover:border-violet-300"}`}>
                                  {t}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Data do Prazo */}
                    {has("prazo") && (
                      <div>
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Data do Prazo</p>
                        <div className="flex items-center gap-2">
                          <Input type="date" value={advancedFilters.deadlineFrom} onChange={(e) => { setAdvancedFilters({...advancedFilters, deadlineFrom: e.target.value}); if (selectedFilterId) setUnsavedChanges(true) }} className="h-7 text-xs flex-1" />
                          <span className="text-slate-300 text-xs flex-shrink-0">até</span>
                          <Input type="date" value={advancedFilters.deadlineTo} onChange={(e) => { setAdvancedFilters({...advancedFilters, deadlineTo: e.target.value}); if (selectedFilterId) setUnsavedChanges(true) }} className="h-7 text-xs flex-1" />
                        </div>
                      </div>
                    )}

                    {/* Data de Início */}
                    {has("inicio") && (
                      <div>
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Data de Início</p>
                        <div className="flex items-center gap-2">
                          <Input type="date" value={advancedFilters.createdFrom} onChange={(e) => { setAdvancedFilters({...advancedFilters, createdFrom: e.target.value}); if (selectedFilterId) setUnsavedChanges(true) }} className="h-7 text-xs flex-1" />
                          <span className="text-slate-300 text-xs flex-shrink-0">até</span>
                          <Input type="date" value={advancedFilters.createdTo} onChange={(e) => { setAdvancedFilters({...advancedFilters, createdTo: e.target.value}); if (selectedFilterId) setUnsavedChanges(true) }} className="h-7 text-xs flex-1" />
                        </div>
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
                  <button onClick={() => { setIsFilterModalOpen(false); setUnsavedChanges(false); setShowFieldPicker(false) }}
                    className="h-7 px-3 rounded-md text-[11px] font-medium border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors">
                    Cancelar
                  </button>
                  <button onClick={() => { setIsFilterModalOpen(false); setShowFieldPicker(false); setCurrentPage(1) }}
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

