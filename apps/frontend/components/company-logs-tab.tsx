// @ts-nocheck
import { useState, useMemo, type CSSProperties } from "react"
import { ConfirmationDialog } from "@/components/confirmation-dialog"
import {
  Filter, X, Search, ChevronDown, GripVertical, Activity,
  Users, Clock, CheckSquare, DollarSign, Shield, TrendingUp,
  TrendingDown, Minus, Globe, Smartphone, MonitorCheck, AlertTriangle,
  LogIn, LogOut, Eye, EyeOff, RefreshCw, Crown, Zap, Award,
  Calendar, BarChart2, MapPin, Info, ChevronRight, Download,
} from "lucide-react"
import { ItemsPerPageSelect } from "@/components/items-per-page-select"
import { useSidebar } from "@/contexts/sidebar-context"

// ─── Theme gradient map ────────────────────────────────────────────────────────
const logGradientMap: Record<string, string> = {
  "bg-linear-to-br from-blue-900 via-blue-800 to-cyan-900": "linear-gradient(to bottom right, #1e3a8a, #1e40af, #164e63)",
  "bg-gradient-to-b from-slate-900 via-blue-900 to-indigo-900": "linear-gradient(to bottom, #0f172a, #1e3a8a, #312e81)",
  "bg-gradient-to-tr from-indigo-900 via-purple-800 to-blue-800": "linear-gradient(to top right, #312e81, #6b21a8, #1e40af)",
  "bg-linear-to-br from-purple-900 via-violet-800 to-indigo-900": "linear-gradient(to bottom right, #581c87, #5b21b6, #312e81)",
  "bg-linear-to-br from-red-900 via-orange-800 to-amber-900": "linear-gradient(to bottom right, #7f1d1d, #9a3412, #78350f)",
  "bg-linear-to-br from-slate-900 via-gray-800 to-zinc-900": "linear-gradient(to bottom right, #0f172a, #1f2937, #18181b)",
}

// ─── Type/Status colors ────────────────────────────────────────────────────────
const TYPE_BORDER: Record<string, string> = {
  Usuários: "#3b82f6", Projetos: "#a855f7", Tarefas: "#10b981",
  Financeiro: "#f59e0b", Plano: "#6366f1", Termos: "#06b6d4",
  Segurança: "#ef4444", Sistema: "#6b7280",
}
const TYPE_BADGE: Record<string, string> = {
  Usuários: "bg-blue-50 text-blue-700 border-blue-200",
  Projetos: "bg-purple-50 text-purple-700 border-purple-200",
  Tarefas: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Financeiro: "bg-amber-50 text-amber-700 border-amber-200",
  Plano: "bg-indigo-50 text-indigo-700 border-indigo-200",
  Termos: "bg-cyan-50 text-cyan-700 border-cyan-200",
  Segurança: "bg-red-50 text-red-700 border-red-200",
  Sistema: "bg-slate-100 text-slate-600 border-slate-200",
}
const STATUS_BADGE: Record<string, string> = {
  Sucesso: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Erro: "bg-red-100 text-red-700 border-red-200",
  Alerta: "bg-amber-100 text-amber-700 border-amber-200",
}
const STATUS_DOT: Record<string, string> = {
  Sucesso: "bg-emerald-500", Erro: "bg-red-500", Alerta: "bg-amber-400",
}

interface LogEntry {
  id: string
  timestamp: string
  type: "Usuários"|"Projetos"|"Tarefas"|"Financeiro"|"Plano"|"Termos"|"Segurança"|"Sistema"
  action: string
  user: string
  role: "Admin"|"Usuário da empresa"|"Sistema"
  origin: "Web"|"Sistema"|"API"|"Mobile"
  status: "Sucesso"|"Erro"|"Alerta"
  description: string
  ip?: string
  duration?: number // seconds
  dataAnterior?: Record<string, any>
  dadosNovos?: Record<string, any>
  ids?: { usuarioId?: string; projetoId?: string; tarefaId?: string; empresaId?: string }
}

// ─── Rich mock data ─────────────────────────────────────────────────────────────
function buildMockLogs(company: any): LogEntry[] {
  const now = Date.now()
  const users = ["Ana Paula", "Roberta Lima", "João Silva", "Fernanda Costa", "Sistema"]
  const roles: LogEntry["role"][] = ["Admin","Usuário da empresa","Usuário da empresa","Usuário da empresa","Sistema"]
  const origins: LogEntry["origin"][] = ["Web","Web","Mobile","API","Sistema"]

  const events: Array<Partial<LogEntry>> = [
    { type:"Usuários",  action:"Login realizado",           status:"Sucesso", description:"Acesso autenticado via e-mail e senha.",                   duration:2  },
    { type:"Tarefas",   action:"Tarefa criada",             status:"Sucesso", description:"Nova tarefa adicionada ao projeto ativo.",                  duration:5  },
    { type:"Financeiro",action:"Pagamento processado",      status:"Sucesso", description:"Cobrança mensal processada com sucesso.",                   duration:3  },
    { type:"Usuários",  action:"Perfil atualizado",         status:"Sucesso", description:"Nome e cargo atualizados pelo usuário.",                    duration:4  },
    { type:"Projetos",  action:"Projeto iniciado",          status:"Sucesso", description:"Projeto marcado como em andamento.",                        duration:6  },
    { type:"Segurança", action:"Tentativa de login falha",  status:"Erro",    description:"Credenciais inválidas — acesso negado.",                    duration:1  },
    { type:"Plano",     action:"Plano atualizado",          status:"Sucesso", description:"Upgrade de plano realizado com sucesso.",                   duration:8  },
    { type:"Tarefas",   action:"Tarefa concluída",          status:"Sucesso", description:"Tarefa finalizada e marcada como entregue.",                duration:2  },
    { type:"Financeiro",action:"Nota fiscal gerada",        status:"Sucesso", description:"NF-e emitida e enviada por e-mail.",                        duration:7  },
    { type:"Usuários",  action:"Usuário adicionado",        status:"Sucesso", description:"Novo usuário vinculado à empresa.",                         duration:3  },
    { type:"Sistema",   action:"Backup automático",         status:"Sucesso", description:"Backup realizado com sucesso às 03h00.",                    duration:45 },
    { type:"Segurança", action:"Senha alterada",            status:"Alerta",  description:"Alteração de senha detectada fora do horário comercial.",   duration:2  },
    { type:"Projetos",  action:"Projeto concluído",         status:"Sucesso", description:"Projeto entregue dentro do prazo.",                         duration:5  },
    { type:"Tarefas",   action:"Comentário adicionado",     status:"Sucesso", description:"Usuário adicionou comentário em tarefa.",                   duration:1  },
    { type:"Usuários",  action:"Logout",                    status:"Sucesso", description:"Sessão encerrada normalmente.",                             duration:1  },
    { type:"Financeiro",action:"Saldo recarregado",         status:"Sucesso", description:"Crédito adicionado via PIX.",                              duration:4  },
    { type:"Sistema",   action:"Erro de integração",        status:"Erro",    description:"Falha na sincronização com API externa.",                   duration:12 },
    { type:"Termos",    action:"Termos aceitos",            status:"Sucesso", description:"Usuário aceitou os novos termos de uso.",                   duration:2  },
    { type:"Tarefas",   action:"Prazo alterado",            status:"Alerta",  description:"Data de entrega postergada por solicitação.",               duration:3  },
    { type:"Projetos",  action:"Arquivo enviado",           status:"Sucesso", description:"Documento anexado ao projeto.",                             duration:6  },
  ]

  return events.map((ev, i) => {
    const userIdx = i % users.length
    const ago = (i + 1) * 47 * 60 * 1000 // stagger by ~47 min
    const d = new Date(now - ago)
    const ts = `${d.toLocaleDateString("pt-BR")} ${d.toLocaleTimeString("pt-BR", {hour:"2-digit",minute:"2-digit"})}`
    return {
      id: `log-${i+1}`,
      timestamp: ts,
      user: users[userIdx],
      role: roles[userIdx],
      origin: origins[i % origins.length],
      ip: `192.168.${Math.floor(i/5)+1}.${(i*7+10) % 255}`,
      ...ev,
    } as LogEntry
  })
}

// ─── Spark line (tiny SVG) ─────────────────────────────────────────────────────
function SparkLine({ values, color = "#3b82f6" }: { values: number[]; color?: string }) {
  const max = Math.max(...values, 1)
  const w = 80, h = 28
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - (v / max) * (h - 4) - 2}`).join(" ")
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={`0,${h} ${pts} ${w},${h}`} fill={color} fillOpacity="0.12" stroke="none" />
    </svg>
  )
}

// ─── Mini bar ─────────────────────────────────────────────────────────────────
function MiniBar({ pct, color = "bg-blue-500" }: { pct: number; color?: string }) {
  return (
    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  )
}

// ─── Account badge ────────────────────────────────────────────────────────────
function AccountBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; cls: string; icon: any }> = {
    premium:    { label: "Premium",    cls: "from-amber-400 to-orange-500",   icon: Crown },
    enterprise: { label: "Enterprise", cls: "from-violet-500 to-purple-600",  icon: Award },
    growth:     { label: "Growth",     cls: "from-blue-500 to-cyan-500",      icon: TrendingUp },
    starter:    { label: "Starter",    cls: "from-slate-400 to-slate-600",    icon: Zap },
    partner:    { label: "Partner",    cls: "from-emerald-400 to-teal-600",   icon: Shield },
  }
  const cfg = map[(type || "starter").toLowerCase()] || map.starter
  const Icon = cfg.icon
  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-linear-to-r ${cfg.cls} text-white text-xs font-bold shadow-sm`}>
      <Icon style={{ width: 12, height: 12 }} />
      {cfg.label}
    </div>
  )
}

// ─── Dashboard cards ──────────────────────────────────────────────────────────
interface DashCardProps {
  label: string; value: string; sub?: string
  icon: any; gradient: string; spark?: number[]; trend?: number
}
function DashCard({ label, value, sub, icon: Icon, gradient, spark, trend }: DashCardProps) {
  return (
    <div className={`relative rounded-2xl overflow-hidden bg-linear-to-br ${gradient} border border-white/20 shadow-md`}>
      <div className="px-4 pt-3 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-white/70 uppercase tracking-wider leading-tight">{label}</p>
            <p className="text-2xl font-bold text-white leading-none mt-1">{value}</p>
            {sub && <p className="text-[10px] text-white/55 mt-1 leading-tight">{sub}</p>}
          </div>
          <div className="bg-white/20 rounded-xl p-2 shrink-0 mt-0.5">
            <Icon className="text-white" style={{ width: 16, height: 16 }} />
          </div>
        </div>
        {(spark || trend !== undefined) && (
          <div className="flex items-end justify-between mt-2">
            {spark && <SparkLine values={spark} color="rgba(255,255,255,0.7)" />}
            {trend !== undefined && (
              <span className={`text-[10px] font-semibold flex items-center gap-0.5 ${trend > 0 ? "text-green-200" : trend < 0 ? "text-red-200" : "text-white/50"}`}>
                {trend > 0 ? <TrendingUp style={{width:10,height:10}} /> : trend < 0 ? <TrendingDown style={{width:10,height:10}} /> : <Minus style={{width:10,height:10}} />}
                {trend > 0 ? "+" : ""}{trend}%
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── User activity row ─────────────────────────────────────────────────────────
function UserActivityRow({ user, sessions, tasks, lastSeen, avgMin, status }: {
  user: string; sessions: number; tasks: number; lastSeen: string; avgMin: number; status: "online"|"away"|"offline"
}) {
  const dot = status === "online" ? "bg-green-400" : status === "away" ? "bg-amber-400" : "bg-slate-300"
  const initials = user.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase()
  return (
    <div className="flex items-center gap-3 py-2.5 px-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
      <div className="relative shrink-0">
        <div className="w-8 h-8 rounded-full bg-linear-to-br from-slate-700 to-slate-500 flex items-center justify-center text-white text-[11px] font-bold">{initials}</div>
        <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ${dot} border-2 border-white`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-700 truncate">{user}</p>
        <p className="text-[10px] text-slate-400">Último acesso: {lastSeen}</p>
      </div>
      <div className="flex items-center gap-4 shrink-0">
        <div className="text-center">
          <p className="text-xs font-bold text-slate-700">{sessions}</p>
          <p className="text-[9px] text-slate-400">sessões</p>
        </div>
        <div className="text-center">
          <p className="text-xs font-bold text-slate-700">{tasks}</p>
          <p className="text-[9px] text-slate-400">tarefas</p>
        </div>
        <div className="text-center">
          <p className="text-xs font-bold text-slate-700">{avgMin}m</p>
          <p className="text-[9px] text-slate-400">média</p>
        </div>
      </div>
    </div>
  )
}

// ─── Recent alerts row ─────────────────────────────────────────────────────────
function AlertRow({ icon: Icon, title, sub, time, color }: {
  icon: any; title: string; sub: string; time: string; color: string
}) {
  return (
    <div className="flex items-start gap-3 py-2.5 px-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${color}`}>
        <Icon style={{ width: 13, height: 13 }} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-700">{title}</p>
        <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>
      </div>
      <p className="text-[10px] text-slate-400 shrink-0">{time}</p>
    </div>
  )
}

interface CompanyLogsTabProps { company: any }

export function CompanyLogsTab({ company }: CompanyLogsTabProps) {
  const { sidebarSettings, previewTheme } = useSidebar()
  const appliedTheme = previewTheme ?? sidebarSettings
  const themeBg = appliedTheme.backgroundColor

  const getHeaderStyle = (): CSSProperties => {
    if (!themeBg || themeBg === "bg-slate-900") return { background: "linear-gradient(to right, #0a1628, #1e3a8a, #0a1628)" }
    if (themeBg.startsWith("custom-gradient:")) return { background: themeBg.replace("custom-gradient:", "") }
    if (themeBg.includes("gradient")) return { background: logGradientMap[themeBg] || "#0f172a" }
    return { background: "var(--app-brand-gradient, linear-gradient(135deg,#000 0%,#1a2a6f 45%,#c81a7f 100%))" }
  }

  const mockLogs = useMemo(() => buildMockLogs(company), [company?.id])

  // ── Active section tab ──────────────────────────────────────────────────────
  const [section, setSection] = useState<"dashboard"|"logs">("dashboard")

  // ── Logs state ──────────────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm]     = useState("")
  const [currentPage, setCurrentPage]   = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(15)
  const [expandedLog, setExpandedLog]   = useState<string | null>(null)
  const [isLogFilterModalOpen, setIsLogFilterModalOpen] = useState(false)
  const [advancedFilters, setAdvancedFilters] = useState({
    types: [] as string[], statuses: [] as string[], roles: [] as string[], dateFrom: "", dateTo: "",
  })
  const [savedFilters, setSavedFilters] = useState<Array<{ id: string; name: string; filters: typeof advancedFilters }>>([])
  const [selectedFilterId, setSelectedFilterId] = useState<string | null>(null)
  const [editingFilterId, setEditingFilterId]   = useState<string | null>(null)
  const [editingFilterName, setEditingFilterName] = useState("")
  const [draggingFilterId, setDraggingFilterId]   = useState<string | null>(null)
  const [dragOverFilterId, setDragOverFilterId]   = useState<string | null>(null)
  const [visibleFields, setVisibleFields]         = useState<string[]>(["tipo","status","papel","data"])
  const [filterNameInput, setFilterNameInput]     = useState("")
  const [showSaveInput, setShowSaveInput]         = useState(false)
  const [unsavedChanges, setUnsavedChanges]       = useState(false)
  const [pendingClose, setPendingClose]           = useState<(() => void) | null>(null)

  const filteredLogs = useMemo(() => {
    return mockLogs.filter((log) => {
      if (advancedFilters.types.length > 0    && !advancedFilters.types.includes(log.type))     return false
      if (advancedFilters.statuses.length > 0 && !advancedFilters.statuses.includes(log.status)) return false
      if (advancedFilters.roles.length > 0    && !advancedFilters.roles.includes(log.role))      return false
      if (advancedFilters.dateFrom) { const d = log.timestamp.split(" ")[0]; if (d < advancedFilters.dateFrom) return false }
      if (advancedFilters.dateTo)   { const d = log.timestamp.split(" ")[0]; if (d > advancedFilters.dateTo)   return false }
      if (searchTerm) {
        const s = searchTerm.toLowerCase()
        if (!log.action.toLowerCase().includes(s) && !log.user.toLowerCase().includes(s) && !log.description.toLowerCase().includes(s)) return false
      }
      return true
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }, [advancedFilters, searchTerm, mockLogs])

  const totalLogs     = filteredLogs.length
  const totalPages    = Math.ceil(totalLogs / itemsPerPage)
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  const activeFilterCount =
    advancedFilters.types.length + advancedFilters.statuses.length + advancedFilters.roles.length +
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

  // ── Dashboard data (derived from mockLogs + company) ─────────────────────────
  const totalTasksContracted = 1247
  const totalInvested = 48320
  const avgSessionMin = 24
  const lastAccess = mockLogs.find(l => l.action === "Login realizado")?.timestamp ?? "—"
  const successRate = Math.round((stats.sucesso / Math.max(stats.total,1)) * 100)
  const activeUsersCount = 4

  // Sessions by day (last 7 days — mock)
  const sessionSpark = [3,5,4,7,6,9,8]
  // Tasks by week
  const taskSpark = [12,18,15,22,19,28,31]
  // Revenue last 6 months
  const revSpark = [4200,5800,5200,7100,6800,9400]

  // Per-user stats mock
  const userStats = [
    { user:"Ana Paula",     sessions:38, tasks:312, lastSeen:"Hoje, 14h30", avgMin:32, status:"online"  as const },
    { user:"Roberta Lima",  sessions:27, tasks:218, lastSeen:"Hoje, 11h00", avgMin:21, status:"away"    as const },
    { user:"João Silva",    sessions:19, tasks:145, lastSeen:"Ontem, 17h45",avgMin:18, status:"offline" as const },
    { user:"Fernanda Costa",sessions:12, tasks:89,  lastSeen:"Ontem, 09h20",avgMin:14, status:"offline" as const },
  ]

  // Type distribution
  const typeDist = Object.entries(
    mockLogs.reduce<Record<string,number>>((acc, l) => { acc[l.type] = (acc[l.type]||0)+1; return acc }, {})
  ).sort((a,b) => b[1]-a[1])
  const maxTypeCnt = typeDist[0]?.[1] ?? 1

  // Recent security/alert events
  const alertLogs = mockLogs.filter(l => l.status !== "Sucesso").slice(0,5)

  return (
    <div className="space-y-4">

      {/* ── Section switcher ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit shadow-sm">
        <button
          onClick={() => setSection("dashboard")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${section==="dashboard" ? "text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          style={section==="dashboard" ? getHeaderStyle() : {}}
        >
          <BarChart2 style={{width:13,height:13}} /> Dashboard
        </button>
        <button
          onClick={() => setSection("logs")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${section==="logs" ? "text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          style={section==="logs" ? getHeaderStyle() : {}}
        >
          <Activity style={{width:13,height:13}} />
          Logs de Atividade
          {stats.erro > 0 && (
            <span className="ml-0.5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">{stats.erro}</span>
          )}
        </button>
      </div>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/*  DASHBOARD SECTION                                                  */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {section === "dashboard" && (
        <div className="space-y-4">

          {/* ── Banner: Account type + last access ─────────────────────────── */}
          <div className="rounded-2xl overflow-hidden shadow-md" style={getHeaderStyle()}>
            <div className="px-6 py-5 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AccountBadge type={company?.plan_type || company?.planType || "starter"} />
                  <span className="text-white/50 text-xs">|</span>
                  <span className="text-white/70 text-xs">{company?.name || "Empresa"}</span>
                </div>
                <p className="text-white font-bold text-lg leading-tight">Visão Analítica da Empresa</p>
                <p className="text-white/60 text-xs mt-0.5">Monitoramento de acessos, investimentos e engajamento</p>
              </div>
              <div className="flex items-center gap-6 shrink-0">
                <div className="text-right">
                  <p className="text-[10px] text-white/50 uppercase tracking-wider">Último acesso</p>
                  <p className="text-white font-semibold text-sm">{lastAccess}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-white/50 uppercase tracking-wider">Taxa de sucesso</p>
                  <p className="text-white font-bold text-xl">{successRate}%</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-white/50 uppercase tracking-wider">Usuários ativos</p>
                  <p className="text-white font-bold text-xl">{activeUsersCount}</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── KPI cards row ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <DashCard
              label="Tarefas Contratadas" value={totalTasksContracted.toLocaleString("pt-BR")}
              sub="total acumulado" icon={CheckSquare}
              gradient="from-blue-500 to-blue-700"
              spark={taskSpark} trend={14}
            />
            <DashCard
              label="Valor Investido" value={`R$ ${totalInvested.toLocaleString("pt-BR")}`}
              sub="desde o cadastro" icon={DollarSign}
              gradient="from-emerald-500 to-teal-600"
              spark={revSpark} trend={8}
            />
            <DashCard
              label="Tempo Médio / Sessão" value={`${avgSessionMin} min`}
              sub="últimos 30 dias" icon={Clock}
              gradient="from-violet-500 to-purple-700"
              spark={sessionSpark} trend={-5}
            />
            <DashCard
              label="Sessões este mês" value={sessionSpark.reduce((a,b)=>a+b,0).toString()}
              sub="total de logins" icon={LogIn}
              gradient="from-amber-500 to-orange-500"
              spark={sessionSpark} trend={12}
            />
          </div>

          {/* ── Middle row: user activity + event distribution ─────────────── */}
          <div className="grid grid-cols-5 gap-3">

            {/* User activity table */}
            <div className="col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Users style={{width:14,height:14}} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Atividade por Usuário</p>
                    <p className="text-[10px] text-slate-400">Engajamento individual</p>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400">{userStats.length} usuários</span>
              </div>
              <div>
                {/* Header */}
                <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 border-b border-slate-100">
                  <p className="flex-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Usuário</p>
                  <div className="flex items-center gap-4 text-[10px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">
                    <span>Sessões</span><span>Tarefas</span><span>Média</span>
                  </div>
                </div>
                {userStats.map(u => <UserActivityRow key={u.user} {...u} />)}
              </div>
            </div>

            {/* Event type distribution */}
            <div className="col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
                <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
                  <BarChart2 style={{width:14,height:14}} className="text-violet-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Tipos de Evento</p>
                  <p className="text-[10px] text-slate-400">Distribuição de ações</p>
                </div>
              </div>
              <div className="px-4 py-3 space-y-2.5">
                {typeDist.map(([type, count]) => (
                  <div key={type}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${TYPE_BADGE[type]||"bg-slate-100 text-slate-600 border-slate-200"}`}>{type}</span>
                      <span className="text-[10px] font-bold text-slate-600">{count}</span>
                    </div>
                    <MiniBar pct={(count/maxTypeCnt)*100} color={`bg-[${TYPE_BORDER[type]||"#6b7280"}]`} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Bottom row: origin chart + security alerts + quick stats ──── */}
          <div className="grid grid-cols-3 gap-3">

            {/* Origin breakdown */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
                <div className="w-7 h-7 rounded-lg bg-cyan-100 flex items-center justify-center">
                  <Globe style={{width:14,height:14}} className="text-cyan-600" />
                </div>
                <p className="text-xs font-bold text-slate-800">Origem dos Acessos</p>
              </div>
              <div className="p-4 space-y-3">
                {[
                  { label:"Web",     pct:62, icon:MonitorCheck, color:"text-blue-500",   bar:"bg-blue-500" },
                  { label:"Mobile",  pct:24, icon:Smartphone,   color:"text-emerald-500",bar:"bg-emerald-500" },
                  { label:"API",     pct:10, icon:Zap,          color:"text-amber-500",  bar:"bg-amber-500" },
                  { label:"Sistema", pct:4,  icon:RefreshCw,    color:"text-slate-400",  bar:"bg-slate-400" },
                ].map(o => (
                  <div key={o.label} className="flex items-center gap-2">
                    <o.icon style={{width:13,height:13}} className={`shrink-0 ${o.color}`} />
                    <span className="text-xs text-slate-600 w-14 shrink-0">{o.label}</span>
                    <div className="flex-1"><MiniBar pct={o.pct} color={o.bar} /></div>
                    <span className="text-[10px] font-bold text-slate-500 w-8 text-right">{o.pct}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Security / alerts */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
                <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center">
                  <Shield style={{width:14,height:14}} className="text-red-500" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Alertas Recentes</p>
                  <p className="text-[10px] text-slate-400">{alertLogs.length} eventos de atenção</p>
                </div>
              </div>
              {alertLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-slate-300">
                  <Shield style={{width:28,height:28}} />
                  <p className="text-xs mt-2 text-slate-400">Sem alertas</p>
                </div>
              ) : (
                alertLogs.map(l => (
                  <AlertRow key={l.id}
                    icon={l.status==="Erro" ? AlertTriangle : Info}
                    title={l.action} sub={l.description}
                    time={l.timestamp.split(" ")[1] || ""}
                    color={l.status==="Erro" ? "bg-red-500" : "bg-amber-400"}
                  />
                ))
              )}
            </div>

            {/* Quick stats */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <TrendingUp style={{width:14,height:14}} className="text-emerald-600" />
                </div>
                <p className="text-xs font-bold text-slate-800">Resumo Rápido</p>
              </div>
              <div className="p-4 space-y-3">
                {[
                  { label:"Taxa de conclusão de tarefas",   value:"87%",   color:"bg-emerald-500" },
                  { label:"Projetos em andamento",          value:"3",     color:"bg-blue-500" },
                  { label:"NPS estimado",                   value:"72",    color:"bg-violet-500" },
                  { label:"Ticket médio mensal",            value:"R$ 1.240", color:"bg-amber-500" },
                  { label:"Meses como cliente",             value:"14",    color:"bg-cyan-500" },
                  { label:"Documentos assinados",           value:"8",     color:"bg-slate-400" },
                ].map(s => (
                  <div key={s.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${s.color}`} />
                      <p className="text-[11px] text-slate-500 truncate">{s.label}</p>
                    </div>
                    <p className="text-xs font-bold text-slate-700 shrink-0 ml-2">{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/*  LOGS SECTION                                                       */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {section === "logs" && (
        <div className="space-y-4">

          {/* Stats bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-2">
              <div className="h-6 w-6 rounded-md bg-indigo-100 flex items-center justify-center">
                <Activity style={{width:12,height:12}} className="text-indigo-600" />
              </div>
              <span className="text-xs font-semibold text-slate-600">Total</span>
              <span className="text-sm font-bold text-slate-900">{stats.total}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-xs font-semibold text-slate-500">Sucesso</span>
              <span className="text-sm font-bold text-emerald-600">{stats.sucesso}</span>
            </div>
            {stats.alerta > 0 && (
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-2">
                <div className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
                <span className="text-xs font-semibold text-slate-500">Alertas</span>
                <span className="text-sm font-bold text-amber-500">{stats.alerta}</span>
              </div>
            )}
            {stats.erro > 0 && (
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-2">
                <div className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
                <span className="text-xs font-semibold text-slate-500">Erros</span>
                <span className="text-sm font-bold text-red-500">{stats.erro}</span>
              </div>
            )}
            <div className="ml-auto shrink-0">
              <button className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors">
                <Download style={{width:12,height:12}} /> Exportar
              </button>
            </div>
          </div>

          {/* Main card */}
          <div className="border border-slate-200/70 shadow-sm overflow-hidden rounded-xl bg-white">

            {/* Top bar */}
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
              <div className="flex items-center gap-2 shrink-0">
                <ItemsPerPageSelect
                  value={itemsPerPage.toString()}
                  onValueChange={(v) => { setItemsPerPage(parseInt(v)); setCurrentPage(1) }}
                />
                <span className="text-xs text-slate-400 whitespace-nowrap">
                  {filteredLogs.length !== mockLogs.length
                    ? <><span className="font-semibold text-blue-500">{filteredLogs.length}</span> de {mockLogs.length}</>
                    : <><span className="font-semibold text-slate-600">{mockLogs.length}</span> logs</>
                  }
                </span>
              </div>
              <button
                onClick={() => setIsLogFilterModalOpen(true)}
                className={`flex items-center gap-1.5 h-9 px-3.5 text-xs font-medium rounded-lg border transition-colors shrink-0 ${
                  activeFilterCount > 0 ? "border-blue-400 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Filter style={{width:12,height:12}} />
                Filtros
                {activeFilterCount > 0 && (
                  <span className="ml-0.5 min-w-4 h-4 px-1 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center">{activeFilterCount}</span>
                )}
              </button>
              <div className="flex items-center gap-0.5 shrink-0">
                <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage===1}
                  className="h-7 w-7 flex items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition-colors">
                  <ChevronDown style={{width:12,height:12}} className="rotate-90" />
                </button>
                {getPageNumbers().map((page, idx) =>
                  page === "..." ? <span key={idx} className="text-xs text-slate-300 px-0.5">·</span> : (
                    <button key={idx} onClick={() => setCurrentPage(Number(page))}
                      className={`h-7 w-7 flex items-center justify-center rounded-full text-xs font-semibold transition-colors ${page===currentPage?"bg-blue-500 text-white shadow-sm":"text-slate-500 hover:bg-slate-100"}`}>{page}</button>
                  )
                )}
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage===totalPages||totalPages===0}
                  className="h-7 w-7 flex items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition-colors">
                  <ChevronDown style={{width:12,height:12}} className="-rotate-90" />
                </button>
              </div>
            </div>

            {/* Log rows */}
            <div className="overflow-hidden">
              {paginatedLogs.length > 0 ? paginatedLogs.map((log, idx) => {
                const isExpanded = expandedLog === log.id
                return (
                  <div key={log.id} className={`group transition-all ${idx%2===0?"bg-white":"bg-slate-50/60"}`}
                    style={{ borderLeft: `3px solid ${TYPE_BORDER[log.type]||"#6b7280"}` }}>
                    <div
                      className={`flex items-center gap-4 px-5 py-3.5 cursor-pointer transition-colors ${idx%2===0?"hover:bg-slate-50":"hover:bg-slate-100/60"}`}
                      onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                    >
                      <span className="text-[10px] font-mono text-slate-400 shrink-0 w-30 leading-relaxed">{log.timestamp}</span>
                      <span className={`text-[10px] font-semibold px-2 py-1 rounded-full border shrink-0 ${TYPE_BADGE[log.type]||"bg-slate-100 text-slate-600 border-slate-200"}`}>{log.type}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-slate-800 truncate">{log.action}</p>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">{log.description}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] px-2 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-medium">{log.user}</span>
                        <span className="text-[10px] px-2 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200 hidden xl:inline">{log.origin}</span>
                        {log.ip && <span className="text-[10px] px-2 py-1 rounded-full bg-slate-50 text-slate-400 border border-slate-200 hidden 2xl:inline">{log.ip}</span>}
                      </div>
                      <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-semibold border shrink-0 ${STATUS_BADGE[log.status]||"bg-slate-100"}`}>
                        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${STATUS_DOT[log.status]||"bg-slate-400"}`} />
                        {log.status}
                      </div>
                      <button className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors shrink-0">
                        <ChevronDown style={{width:13,height:13}} className={`transition-transform duration-200 ${isExpanded?"rotate-180":""}`} />
                      </button>
                    </div>
                    {isExpanded && (
                      <div className="px-6 pb-4 pt-2 border-t border-slate-100 space-y-3 ml-0.75">
                        <p className="text-[12px] text-slate-600 leading-relaxed">{log.description}</p>
                        <div className="flex flex-wrap gap-2 text-[11px]">
                          <span className="px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-500"><strong>Papel:</strong> {log.role}</span>
                          <span className="px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-500"><strong>Origem:</strong> {log.origin}</span>
                          {log.ip && <span className="px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-500"><strong>IP:</strong> {log.ip}</span>}
                          {log.duration && <span className="px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-500"><strong>Duração:</strong> {log.duration}s</span>}
                        </div>
                        {log.dataAnterior && log.dadosNovos && (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Dados Anteriores</p>
                              <pre className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-[10px] overflow-x-auto text-slate-600">{JSON.stringify(log.dataAnterior, null, 2)}</pre>
                            </div>
                            <div>
                              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Dados Novos</p>
                              <pre className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-[10px] overflow-x-auto text-slate-600">{JSON.stringify(log.dadosNovos, null, 2)}</pre>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              }) : (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                    <Activity style={{width:24,height:24}} className="opacity-40" />
                  </div>
                  <p className="text-sm font-medium text-slate-500">Nenhum log encontrado</p>
                  <p className="text-xs text-slate-400 mt-1">Tente ajustar os filtros ou a busca</p>
                </div>
              )}
            </div>

            {/* Bottom pagination */}
            {filteredLogs.length > 0 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/40">
                <div className="flex items-center gap-2">
                  <ItemsPerPageSelect value={itemsPerPage.toString()} onValueChange={(v) => { setItemsPerPage(parseInt(v)); setCurrentPage(1) }} variant="bottom" />
                  <span className="text-xs text-slate-400">
                    {filteredLogs.length !== mockLogs.length
                      ? <><span className="font-semibold text-blue-500">{filteredLogs.length}</span> de {mockLogs.length}</>
                      : <><span className="font-semibold text-slate-600">{mockLogs.length}</span> logs</>
                    }
                  </span>
                </div>
                <div className="flex items-center gap-0.5">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage===1} className="h-7 w-7 flex items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition-colors">
                    <ChevronDown style={{width:12,height:12}} className="rotate-90" />
                  </button>
                  {getPageNumbers().map((page, idx) =>
                    page==="..." ? <span key={idx} className="text-xs text-slate-300 px-0.5">·</span> : (
                      <button key={idx} onClick={() => setCurrentPage(Number(page))} className={`h-7 w-7 flex items-center justify-center rounded-full text-xs font-semibold transition-colors ${page===currentPage?"bg-blue-500 text-white shadow-sm":"text-slate-500 hover:bg-slate-100"}`}>{page}</button>
                    )
                  )}
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage===totalPages||totalPages===0} className="h-7 w-7 flex items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition-colors">
                    <ChevronDown style={{width:12,height:12}} className="-rotate-90" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Advanced Filter Modal ─────────────────────────────────────────── */}
      {isLogFilterModalOpen && (() => {
        const allTypes    = ["Usuários","Projetos","Tarefas","Financeiro","Plano","Termos","Segurança","Sistema"]
        const allStatuses = ["Sucesso","Erro","Alerta"]
        const allRoles    = ["Admin","Usuário da empresa","Sistema"]

        const handleDrop = (targetId: string) => {
          if (!draggingFilterId || draggingFilterId === targetId) return
          const from = savedFilters.findIndex(f => f.id === draggingFilterId)
          const to   = savedFilters.findIndex(f => f.id === targetId)
          if (from === -1 || to === -1) return
          const reordered = [...savedFilters]; const [moved] = reordered.splice(from, 1); reordered.splice(to, 0, moved)
          setSavedFilters(reordered); setDraggingFilterId(null); setDragOverFilterId(null)
        }

        const toggle = (key: "types"|"statuses"|"roles", val: string) => {
          setAdvancedFilters(prev => {
            const arr = prev[key]; const next = arr.includes(val) ? arr.filter(v=>v!==val) : [...arr, val]
            return { ...prev, [key]: next }
          }); setUnsavedChanges(true)
        }

        const Chip = ({ val, active, onClick }: { val: string; active: boolean; onClick: ()=>void }) => (
          <button type="button" onClick={onClick}
            className={`h-7 px-3 rounded-full border text-[11px] font-medium transition-all ${active?"border-blue-500 bg-blue-50 text-blue-700 shadow-sm":"border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"}`}>
            {val}
          </button>
        )

        return (
          <div className="fixed inset-0 z-200 flex items-center justify-center p-4 bg-black/25 backdrop-blur-[3px]"
            onClick={(e) => {
              if (e.target !== e.currentTarget) return
              if (unsavedChanges) { setPendingClose(() => () => { setIsLogFilterModalOpen(false); setSelectedFilterId(null); setUnsavedChanges(false) }); return }
              setIsLogFilterModalOpen(false)
            }}>
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-190 max-h-[80vh] border border-slate-200 flex flex-col overflow-hidden">

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3.5 shrink-0" style={getHeaderStyle()}>
                <div>
                  <h2 className="text-sm font-bold text-white">Filtros Avançados</h2>
                  <p className="text-[11px] text-white/60 mt-0.5">{unsavedChanges ? "⚠ Alterações não salvas" : "Configure e aplique filtros"}</p>
                </div>
                <button onClick={() => setIsLogFilterModalOpen(false)} className="text-white/70 hover:text-white hover:bg-white/20 rounded-lg p-1.5 transition-colors">
                  <X style={{width:14,height:14}} />
                </button>
              </div>

              {/* Body */}
              <div className="flex flex-1 overflow-hidden min-h-0">

                {/* Saved filters sidebar */}
                <div className="w-44 border-r border-slate-200 shrink-0 bg-slate-50 flex flex-col overflow-hidden">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3 pt-3 pb-2 flex items-center gap-1">
                    <Filter style={{width:10,height:10}} /> Filtros Salvos
                  </p>
                  <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-1">
                    {savedFilters.length === 0 ? (
                      <div className="text-center py-8">
                        <Filter style={{width:20,height:20}} className="mx-auto text-slate-300 mb-1.5" />
                        <p className="text-[10px] text-slate-400">Nenhum filtro salvo</p>
                      </div>
                    ) : savedFilters.map(filter => (
                      <div key={filter.id} draggable
                        onDragStart={() => setDraggingFilterId(filter.id)}
                        onDragOver={(e) => { e.preventDefault(); setDragOverFilterId(filter.id) }}
                        onDrop={() => handleDrop(filter.id)}
                        onDragEnd={() => { setDraggingFilterId(null); setDragOverFilterId(null) }}
                        className={`group flex items-center gap-1 p-2 rounded-lg cursor-pointer transition-all ${selectedFilterId===filter.id?"bg-blue-50 border border-blue-200":"hover:bg-white border border-transparent"} ${dragOverFilterId===filter.id?"border-blue-300":""}`}
                        onClick={() => { if(editingFilterId) return; setAdvancedFilters(filter.filters); setSelectedFilterId(filter.id); setUnsavedChanges(false) }}>
                        <GripVertical style={{width:10,height:10}} className="text-slate-300 shrink-0 group-hover:text-slate-400" />
                        {editingFilterId===filter.id ? (
                          <input autoFocus value={editingFilterName} onChange={e=>setEditingFilterName(e.target.value)}
                            onBlur={() => { if(editingFilterName.trim()) setSavedFilters(savedFilters.map(f=>f.id===filter.id?{...f,name:editingFilterName.trim()}:f)); setEditingFilterId(null) }}
                            onKeyDown={e => { if(e.key==="Enter") (e.target as any).blur(); if(e.key==="Escape") setEditingFilterId(null) }}
                            className="text-[11px] w-full bg-transparent border-b border-blue-400 focus:outline-none text-blue-700 font-medium" />
                        ) : (
                          <span className="text-[11px] flex-1 truncate text-slate-600 font-medium">{filter.name}</span>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); setEditingFilterId(filter.id); setEditingFilterName(filter.name) }}
                          className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-blue-500 transition-all">
                          <ChevronRight style={{width:9,height:9}} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Filter fields */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5">

                  {/* Types */}
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">Tipo de Evento</p>
                    <div className="flex flex-wrap gap-1.5">
                      {allTypes.map(t => <Chip key={t} val={t} active={advancedFilters.types.includes(t)} onClick={() => toggle("types", t)} />)}
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">Status</p>
                    <div className="flex flex-wrap gap-1.5">
                      {allStatuses.map(s => <Chip key={s} val={s} active={advancedFilters.statuses.includes(s)} onClick={() => toggle("statuses", s)} />)}
                    </div>
                  </div>

                  {/* Roles */}
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">Papel / Origem</p>
                    <div className="flex flex-wrap gap-1.5">
                      {allRoles.map(r => <Chip key={r} val={r} active={advancedFilters.roles.includes(r)} onClick={() => toggle("roles", r)} />)}
                    </div>
                  </div>

                  {/* Date range */}
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">Período</p>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="text-[10px] text-slate-400 mb-1 block">De</label>
                        <input type="date" value={advancedFilters.dateFrom}
                          onChange={e => { setAdvancedFilters(p => ({...p, dateFrom: e.target.value})); setUnsavedChanges(true) }}
                          className="w-full h-8 px-3 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 bg-slate-50" />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] text-slate-400 mb-1 block">Até</label>
                        <input type="date" value={advancedFilters.dateTo}
                          onChange={e => { setAdvancedFilters(p => ({...p, dateTo: e.target.value})); setUnsavedChanges(true) }}
                          className="w-full h-8 px-3 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 bg-slate-50" />
                      </div>
                    </div>
                  </div>

                  {/* Clear */}
                  {activeFilterCount > 0 && (
                    <button onClick={() => { setAdvancedFilters({types:[],statuses:[],roles:[],dateFrom:"",dateTo:""}); setUnsavedChanges(false); setSelectedFilterId(null) }}
                      className="flex items-center gap-1.5 text-[11px] text-red-500 hover:text-red-600 font-medium transition-colors">
                      <X style={{width:11,height:11}} /> Limpar todos os filtros
                    </button>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-200 bg-slate-50/60 shrink-0">
                <div className="flex items-center gap-2">
                  {showSaveInput ? (
                    <div className="flex items-center gap-1.5">
                      <input autoFocus placeholder="Nome do filtro..." value={filterNameInput} onChange={e => setFilterNameInput(e.target.value)}
                        onKeyDown={e => { if(e.key==="Enter" && filterNameInput.trim()) { const id=`filter-${Date.now()}`; setSavedFilters([...savedFilters,{id,name:filterNameInput.trim(),filters:advancedFilters}]); setSelectedFilterId(id); setUnsavedChanges(false); setShowSaveInput(false); setFilterNameInput("") }}}
                        className="h-7 px-3 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 w-36" />
                      <button disabled={!filterNameInput.trim()}
                        onClick={() => { const id=`filter-${Date.now()}`; setSavedFilters([...savedFilters,{id,name:filterNameInput.trim(),filters:advancedFilters}]); setSelectedFilterId(id); setUnsavedChanges(false); setShowSaveInput(false); setFilterNameInput("") }}
                        className="h-7 px-3 rounded-md text-[11px] font-medium bg-blue-600 text-white disabled:opacity-40">OK</button>
                      <button onClick={() => { setShowSaveInput(false); setFilterNameInput("") }} className="h-7 w-7 flex items-center justify-center rounded-md border border-slate-200 text-slate-400 hover:text-red-500 transition-colors"><X style={{width:10,height:10}} /></button>
                    </div>
                  ) : (
                    <button onClick={() => { setFilterNameInput(`Filtro ${savedFilters.length+1}`); setShowSaveInput(true) }}
                      className="h-7 px-3 rounded-md text-[11px] font-medium border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors">
                      Salvar filtro
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setIsLogFilterModalOpen(false); setUnsavedChanges(false) }}
                    className="h-8 px-4 rounded-lg text-[11px] font-medium border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors">
                    Cancelar
                  </button>
                  <button onClick={() => { setIsLogFilterModalOpen(false); setCurrentPage(1) }}
                    className="h-8 px-4 rounded-lg text-[11px] font-semibold text-white transition-all shadow-sm"
                    style={{ background: "var(--app-brand-gradient, linear-gradient(135deg,#1a2a6f,#c81a7f))" }}>
                    Aplicar Filtros {activeFilterCount > 0 && `(${activeFilterCount})`}
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
