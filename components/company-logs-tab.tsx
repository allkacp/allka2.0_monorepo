// @ts-nocheck
import { useState, useMemo, type CSSProperties } from "react"
import { ConfirmationDialog } from "@/components/confirmation-dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Filter, X, Search, ChevronDown, GripVertical, Pencil, Activity } from "lucide-react"
import { ItemsPerPageSelect } from "@/components/items-per-page-select"
import { useSidebar } from "@/contexts/sidebar-context"

const logGradientMap: Record<string, string> = {
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

const TYPE_BORDER: Record<string, string> = {
  "Usuários":   "#3b82f6",
  "Projetos":   "#a855f7",
  "Tarefas":    "#10b981",
  "Financeiro": "#f59e0b",
  "Plano":      "#6366f1",
  "Termos":     "#06b6d4",
  "Segurança":  "#ef4444",
  "Sistema":    "#6b7280",
}

const TYPE_BADGE: Record<string, string> = {
  "Usuários":   "bg-blue-50 text-blue-700 border-blue-200",
  "Projetos":   "bg-purple-50 text-purple-700 border-purple-200",
  "Tarefas":    "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Financeiro": "bg-amber-50 text-amber-700 border-amber-200",
  "Plano":      "bg-indigo-50 text-indigo-700 border-indigo-200",
  "Termos":     "bg-cyan-50 text-cyan-700 border-cyan-200",
  "Segurança":  "bg-red-50 text-red-700 border-red-200",
  "Sistema":    "bg-slate-100 text-slate-600 border-slate-200",
}

const STATUS_BADGE: Record<string, string> = {
  "Sucesso": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Erro":    "bg-red-100 text-red-700 border-red-200",
  "Alerta":  "bg-amber-100 text-amber-700 border-amber-200",
}

const STATUS_DOT: Record<string, string> = {
  "Sucesso": "bg-emerald-500",
  "Erro":    "bg-red-500",
  "Alerta":  "bg-amber-400",
}

interface LogEntry {
  id: string
  timestamp: string
  type: "Usuários" | "Projetos" | "Tarefas" | "Financeiro" | "Plano" | "Termos" | "Segurança" | "Sistema"
  action: string
  user: string
  role: "Admin" | "Usuário da empresa" | "Sistema"
  origin: "Web" | "Sistema" | "API"
  status: "Sucesso" | "Erro" | "Alerta"
  description: string
  ip?: string
  dataAnterior?: Record<string, any>
  dadosNovos?: Record<string, any>
  ids?: {
    usuarioId?: string
    projetoId?: string
    tarefaId?: string
    empresaId?: string
  }
}

interface CompanyLogsTabProps {
  company: any
}

// Mock data de logs
const mockLogs: LogEntry[] = [
  {
    id: "1",
    timestamp: "2025-02-05 14:32:18",
    type: "Usuários",
    action: "Usuário criado",
    user: "Admin Sistema",
    role: "Admin",
    origin: "Web",
    status: "Sucesso",
    description: "Novo usuário João da Silva criado com permissões de Editor",
    ip: "192.168.1.102",
    ids: { usuarioId: "USR-001", empresaId: "EMP-001" },
  },
  {
    id: "2",
    timestamp: "2025-02-05 13:45:22",
    type: "Projetos",
    action: "Projeto criado",
    user: "Admin Sistema",
    role: "Admin",
    origin: "Web",
    status: "Sucesso",
    description: "Projeto 'Redesign Website Startup ABC' criado com orçamento de R$ 25.000",
    ip: "192.168.1.102",
    ids: { projetoId: "PRJ-002", empresaId: "EMP-001" },
  },
  {
    id: "3",
    timestamp: "2025-02-05 12:15:45",
    type: "Tarefas",
    action: "Tarefa aprovada",
    user: "Maria Santos",
    role: "Usuário da empresa",
    origin: "Web",
    status: "Sucesso",
    description: "Tarefa #5001 'Design UI/UX' foi aprovada",
    ip: "192.168.1.105",
    ids: { tarefaId: "TRF-5001", projetoId: "PRJ-001", empresaId: "EMP-001" },
  },
  {
    id: "4",
    timestamp: "2025-02-05 11:20:30",
    type: "Financeiro",
    action: "Pagamento confirmado",
    user: "Sistema",
    role: "Sistema",
    origin: "API",
    status: "Sucesso",
    description: "Pagamento de R$ 9.750 confirmado para Projeto 'Hospedagem Florescer Idosos'",
    ids: { projetoId: "PRJ-001", empresaId: "EMP-001" },
  },
  {
    id: "5",
    timestamp: "2025-02-05 10:05:12",
    type: "Termos",
    action: "Termo assinado",
    user: "Carlos Lima",
    role: "Usuário da empresa",
    origin: "Web",
    status: "Sucesso",
    description: "Termos de Uso v2.1 assinados pela empresa",
    ip: "192.168.1.108",
    ids: { empresaId: "EMP-001" },
  },
  {
    id: "6",
    timestamp: "2025-02-04 16:30:45",
    type: "Usuários",
    action: "Permissões alteradas",
    user: "Admin Sistema",
    role: "Admin",
    origin: "Web",
    status: "Sucesso",
    description: "Permissões do usuário Ana Santos alteradas: Leitor �?' Editor",
    dataAnterior: { permissao: "Leitor" },
    dadosNovos: { permissao: "Editor" },
    ip: "192.168.1.102",
    ids: { usuarioId: "USR-003", empresaId: "EMP-001" },
  },
  {
    id: "7",
    timestamp: "2025-02-04 14:12:00",
    type: "Segurança",
    action: "Tentativa de acesso",
    user: "Sistema",
    role: "Sistema",
    origin: "Sistema",
    status: "Alerta",
    description: "Tentativa de acesso com credenciais inválidas detectada",
    ip: "203.0.113.45",
    ids: { empresaId: "EMP-001" },
  },
  {
    id: "8",
    timestamp: "2025-02-04 11:45:30",
    type: "Projetos",
    action: "Projeto editado",
    user: "Admin Sistema",
    role: "Admin",
    origin: "Web",
    status: "Sucesso",
    description: "Status do Projeto 'Identidade Visual FoodCorp' alterado para Concluído",
    dataAnterior: { status: "Em Andamento" },
    dadosNovos: { status: "Concluído" },
    ip: "192.168.1.102",
    ids: { projetoId: "PRJ-003", empresaId: "EMP-001" },
  },
  {
    id: "9",
    timestamp: "2025-02-03 15:22:18",
    type: "Tarefas",
    action: "Tarefa atrasada",
    user: "Sistema",
    role: "Sistema",
    origin: "Sistema",
    status: "Alerta",
    description: "Tarefa #5010 'Brand Guidelines' foi marcada como atrasada",
    ids: { tarefaId: "TRF-5010", projetoId: "PRJ-003", empresaId: "EMP-001" },
  },
  {
    id: "10",
    timestamp: "2025-02-03 10:00:00",
    type: "Plano",
    action: "Alteração de plano de crédito",
    user: "Admin Sistema",
    role: "Admin",
    origin: "Web",
    status: "Sucesso",
    description: "Plano de crédito alterado de Basic para Premium (500 créditos)",
    dataAnterior: { plano: "Basic", creditos: 100 },
    dadosNovos: { plano: "Premium", creditos: 500 },
    ip: "192.168.1.102",
    ids: { empresaId: "EMP-001" },
  },
  {
    id: "11",
    timestamp: "2025-02-02 09:30:45",
    type: "Usuários",
    action: "Usuário bloqueado",
    user: "Admin Sistema",
    role: "Admin",
    origin: "Web",
    status: "Sucesso",
    description: "Usuário Pedro Costa foi bloqueado por inatividade prolongada",
    ip: "192.168.1.102",
    ids: { usuarioId: "USR-005", empresaId: "EMP-001" },
  },
  {
    id: "12",
    timestamp: "2025-02-02 08:15:22",
    type: "Financeiro",
    action: "Pagamento recusado",
    user: "Sistema",
    role: "Sistema",
    origin: "API",
    status: "Erro",
    description: "Pagamento de R$ 5.000 recusado - Cartão expirado",
    ids: { projetoId: "PRJ-004", empresaId: "EMP-001" },
  },
]

export function CompanyLogsTab({ company }: CompanyLogsTabProps) {
  const { sidebarSettings, previewTheme } = useSidebar()
  const appliedTheme = previewTheme ?? sidebarSettings
  const themeBg = appliedTheme.backgroundColor
  const getHeaderStyle = (): CSSProperties => {
    if (!themeBg || themeBg === "bg-slate-900") return { background: "linear-gradient(to right, #0a1628, #1e3a8a, #0a1628)" }
    if (themeBg.startsWith("custom-gradient:")) return { background: themeBg.replace("custom-gradient:", "") }
    if (themeBg.includes("gradient")) return { background: logGradientMap[themeBg] || "#0f172a" }
    return {}
  }

  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [expandedLog, setExpandedLog] = useState<string | null>(null)

  // Advanced filter modal state
  const [isLogFilterModalOpen, setIsLogFilterModalOpen] = useState(false)
  const [advancedFilters, setAdvancedFilters] = useState({
    types:    [] as string[],
    statuses: [] as string[],
    roles:    [] as string[],
    dateFrom: "",
    dateTo:   "",
  })
  const [savedFilters, setSavedFilters] = useState<Array<{ id: string; name: string; filters: typeof advancedFilters }>>([])
  const [selectedFilterId, setSelectedFilterId] = useState<string | null>(null)
  const [editingFilterId, setEditingFilterId] = useState<string | null>(null)
  const [editingFilterName, setEditingFilterName] = useState("")
  const [draggingFilterId, setDraggingFilterId] = useState<string | null>(null)
  const [dragOverFilterId, setDragOverFilterId] = useState<string | null>(null)
  const [showFieldPicker, setShowFieldPicker] = useState(false)
  const [visibleFields, setVisibleFields] = useState<string[]>(["tipo","status","papel","data"])
  const [filterNameInput, setFilterNameInput] = useState("")
  const [showSaveInput, setShowSaveInput] = useState(false)
  const [unsavedChanges, setUnsavedChanges] = useState(false)
  const [pendingClose, setPendingClose] = useState<(() => void) | null>(null)

  const filteredLogs = useMemo(() => {
    return mockLogs.filter((log) => {
      if (advancedFilters.types.length > 0 && !advancedFilters.types.includes(log.type)) return false
      if (advancedFilters.statuses.length > 0 && !advancedFilters.statuses.includes(log.status)) return false
      if (advancedFilters.roles.length > 0 && !advancedFilters.roles.includes(log.role)) return false
      if (advancedFilters.dateFrom) { const d = log.timestamp.split(" ")[0]; if (d < advancedFilters.dateFrom) return false }
      if (advancedFilters.dateTo)   { const d = log.timestamp.split(" ")[0]; if (d > advancedFilters.dateTo)   return false }
      if (searchTerm) {
        const s = searchTerm.toLowerCase()
        if (!log.action.toLowerCase().includes(s) && !log.user.toLowerCase().includes(s) && !log.description.toLowerCase().includes(s)) return false
      }
      return true
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }, [advancedFilters, searchTerm])

  const totalLogs   = filteredLogs.length
  const totalPages  = Math.ceil(totalLogs / itemsPerPage)
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const activeFilterCount =
    advancedFilters.types.length +
    advancedFilters.statuses.length +
    advancedFilters.roles.length +
    (advancedFilters.dateFrom || advancedFilters.dateTo ? 1 : 0)

  const stats = {
    total:   mockLogs.length,
    sucesso: mockLogs.filter(l => l.status === "Sucesso").length,
    alerta:  mockLogs.filter(l => l.status === "Alerta").length,
    erro:    mockLogs.filter(l => l.status === "Erro").length,
  }

  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    if (totalPages <= 7) { for (let i = 1; i <= totalPages; i++) pages.push(i) }
    else {
      pages.push(1)
      if (currentPage > 3) pages.push("...")
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i)
      if (currentPage < totalPages - 2) pages.push("...")
      pages.push(totalPages)
    }
    return pages
  }

  return (
    <div className="space-y-4">

      {/* �"?�"? Stats bar �"?�"? */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-2">
          <div className="h-6 w-6 rounded-md bg-indigo-100 flex items-center justify-center">
            <Activity className="h-3.5 w-3.5 text-indigo-600" />
          </div>
          <span className="text-xs font-semibold text-slate-600">Total</span>
          <span className="text-sm font-bold text-slate-900">{stats.total}</span>
        </div>
        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500 flex-shrink-0" />
          <span className="text-xs font-semibold text-slate-500">Sucesso</span>
          <span className="text-sm font-bold text-emerald-600">{stats.sucesso}</span>
        </div>
        {stats.alerta > 0 && (
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-2">
            <div className="h-2 w-2 rounded-full bg-amber-400 flex-shrink-0" />
            <span className="text-xs font-semibold text-slate-500">Alertas</span>
            <span className="text-sm font-bold text-amber-500">{stats.alerta}</span>
          </div>
        )}
        {stats.erro > 0 && (
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-2">
            <div className="h-2 w-2 rounded-full bg-red-500 flex-shrink-0" />
            <span className="text-xs font-semibold text-slate-500">Erros</span>
            <span className="text-sm font-bold text-red-500">{stats.erro}</span>
          </div>
        )}
      </div>

      {/* �"?�"? Main Card �"?�"? */}
      <div className="border border-slate-200/70 shadow-sm overflow-hidden rounded-xl bg-white">

        {/* �"?�"? Top bar �"?�"? */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-200/70 bg-slate-50/60">
          <div className="flex-1 relative min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar ação, usuário ou descrição..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
              className="w-full pl-9 pr-3 h-9 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
            />
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <ItemsPerPageSelect
              value={itemsPerPage.toString()}
              onValueChange={(v) => { setItemsPerPage(parseInt(v)); setCurrentPage(1) }}
            />
            <span className="text-xs text-slate-400 whitespace-nowrap">
              {filteredLogs.length !== mockLogs.length
                ? <>de <span className="font-semibold text-blue-500">{filteredLogs.length}</span> de {mockLogs.length} logs</>
                : <>de <span className="font-semibold text-slate-600">{mockLogs.length}</span> logs</>
              }
            </span>
          </div>
          <button
            onClick={() => setIsLogFilterModalOpen(true)}
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
                  }`}>{page}</button>
              )
            )}
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0}
              className="h-7 w-7 flex items-center justify-center rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors">
              <ChevronDown className="h-3.5 w-3.5 -rotate-90" />
            </button>
          </div>
        </div>

        {/* �"?�"? Content �"?�"? */}
        <div className="overflow-hidden">
          {paginatedLogs.length > 0 ? (
            paginatedLogs.map((log, idx) => {
              const isExpanded = expandedLog === log.id
              return (
                <div
                  key={log.id}
                  className={`group transition-all ${idx % 2 === 0 ? "bg-white" : "bg-slate-200/50"}`}
                  style={{ borderLeft: `3px solid ${TYPE_BORDER[log.type] || "#6b7280"}` }}
                >
                  <div
                    className={`flex items-center gap-4 px-5 py-4 cursor-pointer transition-colors ${idx % 2 === 0 ? "hover:bg-slate-50" : "hover:bg-slate-200/70"}`}
                    onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                  >
                    {/* Timestamp */}
                    <span className="text-[11px] font-mono text-slate-400 shrink-0 w-[130px] leading-relaxed">{log.timestamp}</span>

                    {/* Type badge */}
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border shrink-0 ${TYPE_BADGE[log.type] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
                      {log.type}
                    </span>

                    {/* Action + description (two lines) */}
                    <div className="flex-1 min-w-0 leading-snug">
                      <p className="text-[13px] font-semibold text-slate-800 truncate">{log.action}</p>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">{log.description}</p>
                    </div>

                    {/* User / origin / IP badges */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-medium">{log.user}</span>
                      <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200">{log.origin}</span>
                      {log.ip && (
                        <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-50 text-slate-400 border border-slate-200 hidden lg:inline">{log.ip}</span>
                      )}
                    </div>

                    {/* Status pill */}
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border shrink-0 ${STATUS_BADGE[log.status] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
                      <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[log.status] || "bg-slate-400"}`} />
                      {log.status}
                    </div>

                    {/* Expand */}
                    <button className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors shrink-0">
                      <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="px-6 pb-5 pt-2 border-t border-slate-200/60 space-y-3 ml-[3px]">
                      <p className="text-[12px] text-slate-600 leading-relaxed">{log.description}</p>
                      {log.dataAnterior && log.dadosNovos && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Dados Anteriores</p>
                            <pre className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-[11px] overflow-x-auto text-slate-600 leading-relaxed">{JSON.stringify(log.dataAnterior, null, 2)}</pre>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Dados Novos</p>
                            <pre className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-[11px] overflow-x-auto text-slate-600 leading-relaxed">{JSON.stringify(log.dadosNovos, null, 2)}</pre>
                          </div>
                        </div>
                      )}
                      {log.ids && (
                        <div>
                          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">IDs Relacionados</p>
                          <div className="flex gap-2 flex-wrap">
                            {Object.entries(log.ids).map(([key, value]) =>
                              value ? (
                                <span key={key} className="text-[11px] px-3 py-1 rounded-full border border-slate-200 bg-white text-slate-600">{key}: {value}</span>
                              ) : null
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                <Activity className="h-7 w-7 opacity-40" />
              </div>
              <p className="text-sm font-medium text-slate-500">Nenhum log encontrado</p>
              <p className="text-xs text-slate-400 mt-1">Tente ajustar os filtros ou a busca</p>
            </div>
          )}
        </div>

        {/* �"?�"? Bottom bar �"?�"? */}
        {filteredLogs.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/40">
            <div className="flex items-center gap-2">
              <ItemsPerPageSelect
                value={itemsPerPage.toString()}
                onValueChange={(v) => { setItemsPerPage(parseInt(v)); setCurrentPage(1) }}
                variant="bottom"
              />
              <span className="text-xs text-slate-400 whitespace-nowrap">
                {filteredLogs.length !== mockLogs.length
                  ? <>de <span className="font-semibold text-blue-500">{filteredLogs.length}</span> de {mockLogs.length} logs</>
                  : <>de <span className="font-semibold text-slate-600">{mockLogs.length}</span> logs</>
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
                    }`}>{page}</button>
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

      {/* �"?�"? Advanced Filter Modal �"?�"? */}
      {isLogFilterModalOpen && (() => {
        const allFilterFields = [
          { id: "tipo",   label: "Tipo de Evento" },
          { id: "status", label: "Status" },
          { id: "papel",  label: "Papel / Origem" },
          { id: "data",   label: "Data" },
        ]
        const has = (id: string) => visibleFields.includes(id)

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

        const emptyFilters = { types: [] as string[], statuses: [] as string[], roles: [] as string[], dateFrom: "", dateTo: "" }
        const allTypes    = ["Usuários","Projetos","Tarefas","Financeiro","Plano","Termos","Segurança","Sistema"]
        const allStatuses = ["Sucesso","Erro","Alerta"]
        const allRoles    = ["Admin","Usuário da empresa","Sistema"]

        return (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/25 backdrop-blur-[3px]"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                if (unsavedChanges) {
                  setPendingClose(() => () => { setIsLogFilterModalOpen(false); setSelectedFilterId(null); setUnsavedChanges(false); setShowFieldPicker(false) })
                  return
                }
                setIsLogFilterModalOpen(false); setSelectedFilterId(null); setUnsavedChanges(false); setShowFieldPicker(false)
              }
            }}
          >
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-[820px] max-h-[82vh] border border-slate-200 animate-in fade-in zoom-in duration-200 flex flex-col overflow-hidden">

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 flex-shrink-0" style={getHeaderStyle()}>
                <div>
                  <h2 className="text-sm font-bold text-white">Filtros Avançados</h2>
                  <p className="text-[11px] text-white/60 mt-0.5">
                    {unsavedChanges ? "�?� Alterações não salvas" : selectedFilterId ? "Filtro carregado" : "Configure e aplique filtros"}
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (unsavedChanges) {
                      setPendingClose(() => () => { setIsLogFilterModalOpen(false); setSelectedFilterId(null); setUnsavedChanges(false); setShowFieldPicker(false) })
                      return
                    }
                    setIsLogFilterModalOpen(false); setSelectedFilterId(null); setUnsavedChanges(false); setShowFieldPicker(false)
                  }}
                  className="text-white/70 hover:text-white hover:bg-white/20 rounded-lg p-1.5 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body */}
              <div className="flex flex-1 overflow-hidden min-h-0">

                {/* Left �?" Saved Filters */}
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
                              autoFocus type="text" value={editingFilterName}
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

                {/* Right �?" Filter fields */}
                <div className="flex-1 min-h-0 flex flex-col relative">

                  {/* Field picker dropdown */}
                  {showFieldPicker && (
                    <div className="absolute top-10 left-3 z-20 bg-white border border-slate-200 rounded-xl shadow-xl p-4 w-[340px] animate-in fade-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
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
                        <button onClick={() => setVisibleFields(["tipo","status","papel","data"])} className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors">Recuperar campos padrão</button>
                        <button onClick={() => setShowFieldPicker(false)} className="h-7 px-3 rounded-md text-[11px] font-medium btn-brand">Confirmar</button>
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

                    {has("tipo") && (
                      <div>
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Tipo de Evento</p>
                        <div className="flex flex-wrap gap-1.5">
                          {allTypes.map(t => (
                            <button key={t}
                              onClick={() => {
                                const updated = advancedFilters.types.includes(t) ? advancedFilters.types.filter(x => x !== t) : [...advancedFilters.types, t]
                                setAdvancedFilters({ ...advancedFilters, types: updated }); if (selectedFilterId) setUnsavedChanges(true)
                              }}
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${advancedFilters.types.includes(t) ? "bg-indigo-500 text-white border-indigo-500" : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"}`}>
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {has("status") && (
                      <div>
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Status</p>
                        <div className="flex flex-wrap gap-1.5">
                          {allStatuses.map(s => (
                            <button key={s}
                              onClick={() => {
                                const updated = advancedFilters.statuses.includes(s) ? advancedFilters.statuses.filter(x => x !== s) : [...advancedFilters.statuses, s]
                                setAdvancedFilters({ ...advancedFilters, statuses: updated }); if (selectedFilterId) setUnsavedChanges(true)
                              }}
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${advancedFilters.statuses.includes(s) ? "bg-indigo-500 text-white border-indigo-500" : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"}`}>
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {has("papel") && (
                      <div>
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Papel / Origem</p>
                        <div className="flex flex-wrap gap-1.5">
                          {allRoles.map(r => (
                            <button key={r}
                              onClick={() => {
                                const updated = advancedFilters.roles.includes(r) ? advancedFilters.roles.filter(x => x !== r) : [...advancedFilters.roles, r]
                                setAdvancedFilters({ ...advancedFilters, roles: updated }); if (selectedFilterId) setUnsavedChanges(true)
                              }}
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${advancedFilters.roles.includes(r) ? "bg-indigo-500 text-white border-indigo-500" : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"}`}>
                              {r}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {has("data") && (
                      <div>
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Data</p>
                        <div className="flex items-center gap-2">
                          <Input type="date" value={advancedFilters.dateFrom} onChange={(e) => { setAdvancedFilters({ ...advancedFilters, dateFrom: e.target.value }); if (selectedFilterId) setUnsavedChanges(true) }} className="h-7 text-xs flex-1" />
                          <span className="text-slate-300 text-xs flex-shrink-0">até</span>
                          <Input type="date" value={advancedFilters.dateTo} onChange={(e) => { setAdvancedFilters({ ...advancedFilters, dateTo: e.target.value }); if (selectedFilterId) setUnsavedChanges(true) }} className="h-7 text-xs flex-1" />
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
                <button onClick={() => { setAdvancedFilters(emptyFilters); setUnsavedChanges(false) }}
                  className="text-[11px] text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1">
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
                        className="h-7 px-3 rounded-md text-[11px] font-medium btn-brand disabled:opacity-40 transition-all">OK</button>
                      <button onClick={() => { setShowSaveInput(false); setFilterNameInput("") }}
                        className="h-7 w-7 flex items-center justify-center rounded-md border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-300 transition-colors">
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
                      className="h-7 px-3 rounded-md text-[11px] font-medium btn-brand transition-all">
                      Salvar filtro
                    </button>
                  )}
                  <div className="w-px h-5 bg-slate-200" />
                  <button onClick={() => { setIsLogFilterModalOpen(false); setUnsavedChanges(false); setShowFieldPicker(false) }}
                    className="h-7 px-3 rounded-md text-[11px] font-medium border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors">
                    Cancelar
                  </button>
                  <button onClick={() => { setIsLogFilterModalOpen(false); setShowFieldPicker(false); setCurrentPage(1) }}
                    className="h-7 px-4 rounded-md text-[11px] font-semibold bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white transition-all shadow-sm shadow-blue-200">
                    Aplicar Filtros
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}
      <ConfirmationDialog
        open={pendingClose !== null}
        onClose={() => setPendingClose(null)}
        onConfirm={() => { pendingClose?.(); setPendingClose(null) }}
        title="Alterações não salvas"
        message="Você tem alterações não salvas. Deseja sair sem salvar?"
        confirmText="Sair sem salvar"
        destructive={false}
      />
    </div>
  )
}
