// @ts-nocheck
import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Users,
  UserCheck,
  Building2,
  Briefcase,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  DollarSign,
  Star,
  Award,
  Download,
  GripVertical,
  EyeOff,
  Edit2,
  Plus,
  Trash2,
  FileText,
  Shield,
  Settings,
  AlertTriangle,
  Lock,
  Key,
  LayoutGrid,
  Bell,
  Zap,
  CreditCard,
  ArrowRightIcon,
  FileDown,
  ExternalLink,
  ArrowUp,
  ArrowDown,
  Info,
  Calculator,
  ArrowUpRight,
  CheckSquare,
  Calendar,
  Type,
  Check,
  X,
  MessageSquare,
  ChevronDown,
  ArrowRight,
  Trophy,
  Save,
  Minus,
  Globe,
  Pencil,
  Share2,
} from "lucide-react"
import { Link } from "react-router-dom"
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert" // AlertTriangle removed to avoid redeclaration
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MetricChartModal } from "@/components/admin/metric-chart-modal"
import html2canvas from "html2canvas" // Import html2canvas
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion" // Import Accordion components
import { Input } from "@/components/ui/input" // Added Input
import { Label } from "@/components/ui/label" // Added Label
import { useSidebar } from "@/contexts/sidebar-context" // Added import for sidebar context
import { Switch } from "@/components/ui/switch" // Added Switch
import { useToast } from "@/hooks/use-toast" // Added useToast hook

// Redeclaration of Alert interface removed due to linting issue.
// The original code already had an 'Alert' interface which was correct.
// If there was a need for a distinct interface, it would require renaming.

type WidgetType =
  | "metrics"
  | "activity"
  | "alerts"
  | "performers"
  | "quickActions"
  | "userDistribution"
  | "activeUsers"
  | "systemAlerts"
  | "adminProfiles"
  | "revenue"
  | "activeProjectsWidget"
  | "creditPlans"
  | "mrr"
  | "permissionMatrix"
  | "managementTools"
  | "churn"
  | "averageTicket"
  | "ltv"
  | "cmv"
  | "nomads" // New simplified nomads widget
  | "nomadsIndicators"
  | "tasks"
  | "platformActivities"
  | "nomadsRanking" // Added nomadsRanking widget type
  | "agenciesRanking" // Added agenciesRanking widget type
  | "statusOverview" // Added new status overview widget type
  | "accountsReceivable" // Added new accounts receivable widget type

type MetricType = "totalUsers" | "activeUsers" | "companies" | "activeProjects" | "revenue" | "avgRating"
type ColumnLayout = "1" | "2-equal" | "2-33-66" | "2-66-33" | "3-equal" | "3-25-50-25"
type WidgetSize = "standard" | "compact"

interface Widget {
  id: WidgetType
  order: number
  visible: boolean
  customTitle?: string
  size?: string // Added to store widget size (e.g., "half", "full")
}

// Define the structure for revenue metric with breakdown
interface RevenueMetric {
  value: string
  change: number
  trend: "up" | "down"
  breakdown?: {
    creditPlan: { value: string; change: number }
    recurring: { value: string; change: number }
    oneTime: { value: string; change: number }
  }
}

interface RatingBreakdown {
  nomades: { value: number; change: number; trend: "up" | "down" }
  agencies: { value: number; change: number; trend: "up" | "down" }
  leadPremium: { value: number; change: number; trend: "up" | "down" }
  support: { value: number; change: number; trend: "up" | "down" }
  projects: { value: number; change: number; trend: "up" | "down" }
}

interface MetricCard {
  id: MetricType
  order: number
  visible: boolean
}

// Define WidgetLibraryItem interface
interface WidgetLibraryItem {
  id: WidgetType
  name: string
  description: string
  icon: React.ElementType
  color?: string // Added to store a color for the widget card
}

// Define WidgetState to unify widget types for rendering
interface WidgetState {
  id: string // Unique identifier for each widget instance
  type: WidgetType
  visible: boolean
  order: number
  customTitle?: string
  // size?: WidgetSize; // Keep this if specific widgets can have different sizes
}

interface SystemAlert {
  id: string
  type: "tarefas" | "mensagens" | "financeiro" | "projetos" | "sistema"
  severity: "high" | "medium" | "low"
  title: string
  description: string
  count: number
  link: string
  icon: typeof AlertTriangle
}

const mockAlerts: SystemAlert[] = [
  {
    id: "tarefas_atrasadas",
    type: "tarefas",
    severity: "high",
    title: "Tarefas atrasadas",
    description: "12 tarefas estão com prazo vencido e precisam de atenção imediata.",
    count: 12,
    link: "/admin/tasks?filter=atrasadas",
    icon: AlertTriangle,
  },
  {
    id: "mensagens_sem_resposta",
    type: "mensagens",
    severity: "medium",
    title: "Mensagens sem resposta",
    description: "7 mensagens aguardando resposta há mais de 24 horas.",
    count: 7,
    link: "/admin/messages?filter=sem_resposta",
    icon: MessageSquare,
  },
  {
    id: "projetos_inadimplentes",
    type: "financeiro",
    severity: "high",
    title: "Projetos inadimplentes",
    description: "3 projetos com pagamento atrasado.",
    count: 3,
    link: "/admin/projects?filter=inadimplentes",
    icon: XCircle,
  },
]

const AlertsCenter = ({ alerts }: { alerts: SystemAlert[] }) => {
  const [dismissed, setDismissed] = useState<string[]>([])

  if (alerts.length === 0 || dismissed.length === alerts.length) {
    return null
  }

  const activeAlerts = alerts.filter((alert) => !dismissed.includes(alert.id))
  const highPriorityCount = activeAlerts.filter((a) => a.severity === "high").length

  const getSeverityColor = (severity: SystemAlert["severity"]) => {
    switch (severity) {
      case "high":
        return "text-red-700 bg-red-50 border-red-300"
      case "medium":
        return "text-amber-700 bg-amber-50 border-amber-300"
      case "low":
        return "text-blue-700 bg-blue-50 border-blue-300"
      default:
        return "text-blue-700 bg-blue-50 border-blue-300"
    }
  }

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="alerts" className="border-2 border-red-300 bg-red-50 rounded-xl shadow-sm">
        <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-red-100/50 rounded-t-xl transition-colors">
          <div className="flex items-center gap-3 w-full">
            <div className="p-2 rounded-lg bg-red-100">
              <Bell className="h-5 w-5 text-red-600" />
            </div>
            <div className="flex items-center justify-between flex-1">
              <div className="text-left">
                <h3 className="font-semibold text-red-800 flex items-center gap-2">
                  Alertas do Sistema
                  <Badge className="ml-2 bg-red-600 text-white hover:bg-red-700">{activeAlerts.length}</Badge>
                  {highPriorityCount > 0 && (
                    <span className="text-xs text-red-600 font-medium">({highPriorityCount} críticos)</span>
                  )}
                </h3>
                <p className="text-xs text-red-600/80 mt-1">Itens que requerem sua atenção imediata</p>
              </div>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4">
          <div className="space-y-2 pt-2">
            {activeAlerts.map((alert) => {
              const Icon = alert.icon
              return (
                <div
                  key={alert.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border-2 transition-all shadow-sm hover:shadow-md",
                    getSeverityColor(alert.severity),
                  )}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{alert.title}</p>
                        <Badge variant="outline" className="text-xs">
                          {alert.count}
                        </Badge>
                      </div>
                      <p className="text-xs opacity-80 mt-0.5 line-clamp-1">{alert.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link to={alert.link}>
                      <Button size="sm" variant="ghost" className="gap-1 text-xs">
                        Ver
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDismissed([...dismissed, alert.id])}
                      className="h-7 w-7 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

const formatDate = (date: Date, formatStr: string) => {
  const pad = (n: number) => n.toString().padStart(2, "0")
  const day = pad(date.getDate())
  const month = pad(date.getMonth() + 1)
  const year = date.getFullYear()
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())

  const formatMap: Record<string, string> = {
    "dd/MM/yyyy 'às' HH:mm": `${day}/${month}/${year} às ${hours}:${minutes}`,
    "yyyy-MM-dd-HHmm": `${year}-${month}-${day}-${hours}${minutes}`,
    PPP: `${day} de ${["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"][date.getMonth()]} de ${year}`,
  }

  return formatMap[formatStr] || `${day}/${month}/${year}`
}

// const PageHeader = ({ title, description }: { title: string; description: string }) => (
//   <div className="mb-6">
//     <h1 className="text-3xl font-bold text-blue-600">{title}</h1>
//     <p className="text-sm text-gray-500">{description}</p>
//   </div>
// )

export default function AdminDashboardPage() {
  console.log("[v0] AdminDashboardPage component rendering")

  const { sidebarCollapsed } = useSidebar() // Get sidebar collapse state
  const { toast } = useToast() // Get toast function

  const [globalPeriod, setGlobalPeriod] = useState<{
    type:
      | "today"
      | "yesterday"
      | "last_7_days"
      | "last_30_days"
      | "this_month"
      | "last_month"
      | "this_quarter"
      | "custom"
    from?: Date
    to?: Date
    label: string
  }>({
    type: "last_30_days",
    label: "Últimos 30 dias",
  })

  const [isPeriodPickerOpen, setIsPeriodPickerOpen] = useState(false)
  const [customPeriodFrom, setCustomPeriodFrom] = useState<Date>()
  const [customPeriodTo, setCustomPeriodTo] = useState<Date>()

  const [widgetPeriods, setWidgetPeriods] = useState<WidgetPeriodOverride[]>([])

  useEffect(() => {
    const savedPeriod = localStorage.getItem("dashboard_global_period")
    if (savedPeriod) {
      try {
        const parsed = JSON.parse(savedPeriod)
        setGlobalPeriod({
          type: parsed.type,
          from: parsed.from ? new Date(parsed.from) : undefined,
          to: parsed.to ? new Date(parsed.to) : undefined,
          label: parsed.label,
        })
      } catch (e) {
        console.error("Failed to parse saved period:", e)
      }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(
      "dashboard_global_period",
      JSON.stringify({
        type: globalPeriod.type,
        from: globalPeriod.from?.toISOString(),
        to: globalPeriod.to?.toISOString(),
        label: globalPeriod.label,
      }),
    )
  }, [globalPeriod])

  const getDateRangeFromPeriod = (
    periodType: typeof globalPeriod.type,
    customFrom?: Date,
    customTo?: Date,
  ): { from: Date; to: Date } => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    switch (periodType) {
      case "today":
        return { from: today, to: today }
      case "yesterday":
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        return { from: yesterday, to: yesterday }
      case "last_7_days":
        const sevenDaysAgo = new Date(today)
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        return { from: sevenDaysAgo, to: today }
      case "last_30_days":
        const thirtyDaysAgo = new Date(today)
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        return { from: thirtyDaysAgo, to: today }
      case "this_month":
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        return { from: firstDayOfMonth, to: today }
      case "last_month":
        const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
        return { from: firstDayOfLastMonth, to: lastDayOfLastMonth }
      case "this_quarter":
        const quarter = Math.floor(now.getMonth() / 3)
        const firstDayOfQuarter = new Date(now.getFullYear(), quarter * 3, 1)
        return { from: firstDayOfQuarter, to: today }
      case "custom":
        return {
          from: customFrom || today,
          to: customTo || today,
        }
      default:
        return { from: thirtyDaysAgo, to: today }
    }
  }

  const periodOptions = [
    { type: "today" as const, label: "Hoje" },
    { type: "yesterday" as const, label: "Ontem" },
    { type: "last_7_days" as const, label: "Últimos 7 dias" },
    { type: "last_30_days" as const, label: "Últimos 30 dias" },
    { type: "this_month" as const, label: "Este mês" },
    { type: "last_month" as const, label: "Mês passado" },
    { type: "this_quarter" as const, label: "Trimestre atual" },
    { type: "custom" as const, label: "Intervalo personalizado" },
  ]

  const handlePeriodChange = (periodType: typeof globalPeriod.type, label: string) => {
    if (periodType === "custom") {
      setIsPeriodPickerOpen(true)
    } else {
      const { from, to } = getDateRangeFromPeriod(periodType)
      setGlobalPeriod({
        type: periodType,
        from,
        to,
        label,
      })
      setIsPeriodPickerOpen(false)
    }
  }

  const applyCustomPeriod = () => {
    if (customPeriodFrom && customPeriodTo) {
      setGlobalPeriod({
        type: "custom",
        from: customPeriodFrom,
        to: customPeriodTo,
        label: `${customPeriodFrom.toLocaleDateString("pt-BR")} - ${customPeriodTo.toLocaleDateString("pt-BR")}`,
      })
      setIsPeriodPickerOpen(false)
    }
  }

  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "custom">("30d")
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  })
  const [isCustomDialogOpen, setIsCustomDialogOpen] = useState(false)
  const [isCustomizeMode, setIsCustomizeMode] = useState(false)
  const [metricCards, setMetricCards] = useState<Array<{ id: MetricType; order: number; visible: boolean }>>([
    { id: "totalUsers", order: 0, visible: true },
    { id: "activeUsers", order: 1, visible: true },
    { id: "companies", order: 2, visible: true },
    { id: "activeProjects", order: 3, visible: true },
    { id: "revenue", order: 4, visible: true },
    { id: "avgRating", order: 5, visible: true },
  ])
  const [draggedMetric, setDraggedMetric] = useState<MetricType | null>(null)
  const [dragOverMetric, setDragOverMetric] = useState<MetricType | null>(null)
  const [isEditingMetrics, setIsEditingMetrics] = useState(false)
  const [showWidgetLibrary, setShowWidgetLibrary] = useState(false) // Changed from isWidgetLibraryOpen
  const [editingWidget, setEditingWidget] = useState<WidgetType | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [columnLayout, setColumnLayout] = useState<ColumnLayout>("1")
  const [isColumnDialogOpen, setIsColumnDialogOpen] = useState(false)
  const [viewMode, setViewMode] = useState<"conclude" | "default">("default")
  const [showColumns, setShowColumns] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState<string>("30 dias")
  const [layoutMode, setLayoutMode] = useState<"padrao" | "compacto">("padrao")
  const [isAddWidgetOpen, setIsAddWidgetOpen] = useState(false) // New state for the add widget sheet
  const [saveDashboardOpen, setSaveDashboardOpen] = useState(false) // State for the save dashboard dialog
  const [isEditDashboardModalOpen, setIsEditDashboardModalOpen] = useState(false)
  const [draftWidgets, setDraftWidgets] = useState<WidgetState[]>([])
  const [modalDraggedId, setModalDraggedId] = useState<string | null>(null)
  const [modalDragOverId, setModalDragOverId] = useState<string | null>(null)
  const [editModalMode, setEditModalMode] = useState<"none" | "remover" | "adicionar">("none")

  const [chartModalOpen, setChartModalOpen] = useState(false)
  const [selectedMetric, setSelectedMetric] = useState<{
    key: string
    title: string
    type: "line" | "bar"
    data: Array<{ date: string; value: number }>
  } | null>(null)

  const openChartModal = (
    key: string,
    title: string,
    type: "line" | "bar",
    data: Array<{ date: string; value: number }>,
  ) => {
    setSelectedMetric({ key, title, type, data })
    setChartModalOpen(true)
  }

  const generateTimeSeriesData = (baseValue: number, days = 30) => {
    const data = []
    const today = new Date()
    for (let i = days; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const variance = Math.random() * 0.2 - 0.1 // -10% a +10%
      const value = Math.round(baseValue * (1 + variance))
      data.push({
        date: date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        value,
      })
    }
    return data
  }

  const toggleCustomizeMode = () => {
    setIsCustomizeMode(!isCustomizeMode)
  }

  // Define WidgetPeriodOverride interface
  interface WidgetPeriodOverride {
    widgetId: string
    mode: "global" | "custom"
    customPeriod?: {
      from: string
      to: string
      label: string
    }
  }

  const getWidgetPeriod = (widgetId: string) => {
    const override = widgetPeriods.find((wp) => wp.widgetId === widgetId)
    if (override && override.mode === "custom" && override.customPeriod) {
      return {
        from: new Date(override.customPeriod.from),
        to: new Date(override.customPeriod.to),
        label: override.customPeriod.label,
      }
    }
    // Fallback to global period if no override or global mode is selected
    return {
      from: globalPeriod.from || new Date(0), // Use a default if from is undefined
      to: globalPeriod.to || new Date(), // Use a default if to is undefined
      label: globalPeriod.label,
    }
  }

  const setWidgetCustomPeriod = (widgetId: string, period: string) => {
    const now = new Date()
    let from = ""
    let to = format(now, "yyyy-MM-dd")
    let label = period

    switch (period) {
      case "global":
        setWidgetPeriods((prev) => prev.filter((wp) => wp.widgetId !== widgetId))
        return
      case "today":
        from = format(now, "yyyy-MM-dd")
        label = "Hoje"
        break
      case "7days":
        from = format(subDays(now, 7), "yyyy-MM-dd")
        label = "Últimos 7 dias"
        break
      case "30days":
        from = format(subDays(now, 30), "yyyy-MM-dd")
        label = "Últimos 30 dias"
        break
      case "thisMonth":
        from = format(startOfMonth(now), "yyyy-MM-dd")
        label = "Este mês"
        break
      case "lastMonth":
        from = format(startOfMonth(subMonths(now, 1)), "yyyy-MM-dd")
        to = format(endOfMonth(subMonths(now, 1)), "yyyy-MM-dd")
        label = "Mês passado"
        break
      case "90days":
        from = format(subDays(now, 90), "yyyy-MM-dd")
        label = "Últimos 90 dias"
        break
      case "365days":
        from = format(subDays(now, 365), "yyyy-MM-dd")
        label = "Último ano"
        break
      default:
        return
    }

    setWidgetPeriods((prev) => {
      const filtered = prev.filter((wp) => wp.widgetId !== widgetId)
      return [
        ...filtered,
        {
          widgetId,
          mode: "custom",
          customPeriod: { from, to, label },
        },
      ]
    })
  }

  // Function to export a widget as PNG
  const exportWidgetToPng = async (widgetId: string, widgetTitle: string) => {
    const widgetElement = document.querySelector(`[data-widget-id="${widgetId}"]`) as HTMLElement
    if (!widgetElement) {
      toast({
        title: "Erro ao exportar",
        description: "Widget não encontrado",
        variant: "destructive",
      })
      return
    }

    try {
      // Hide export buttons temporarily
      const exportButtons = widgetElement.querySelectorAll('[data-export-button]')
      exportButtons.forEach((btn) => {
        ;(btn as HTMLElement).style.display = 'none'
      })

      const canvas = await html2canvas(widgetElement, {
        backgroundColor: null,
        scale: 2, // Higher quality
        useCORS: true,
        logging: false,
      })

      // Show export buttons again
      exportButtons.forEach((btn) => {
        ;(btn as HTMLElement).style.display = ''
      })

      const link = document.createElement("a")
      const dateStr = format(new Date(), "yyyy-MM-dd-HHmm")
      const sanitizedTitle = widgetTitle.replace(/[^a-zA-Z0-9]/g, "_")
      link.download = `widget_${sanitizedTitle}_${dateStr}.png`
      link.href = canvas.toDataURL("image/png")
      link.click()

      toast({
        title: "Widget exportado",
        description: `O widget "${widgetTitle}" foi exportado como PNG`,
      })
    } catch (error) {
      console.error("[v0] Error exporting widget:", error)
      toast({
        title: "Erro ao exportar",
        description: "Não foi possível exportar o widget",
        variant: "destructive",
      })
    }
  }

  // Reusable export button component for widget headers
  const WidgetExportButton = ({ widgetId, widgetTitle }: { widgetId: string; widgetTitle: string }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => exportWidgetToPng(widgetId, widgetTitle)}
      className="h-7 w-7 p-0 hover:bg-primary/10"
      title="Exportar widget como PNG"
      data-export-button
    >
      <Download className="h-3.5 w-3.5" />
    </Button>
  )

  const WidgetPeriodSelector = ({ widgetId }: { widgetId: string }) => {
    const widgetPeriod = widgetPeriods.find((wp) => wp.widgetId === widgetId)
    const isCustom = widgetPeriod?.mode === "custom"
    const displayLabel = isCustom ? widgetPeriod.customPeriod?.label : "Global"

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-7 px-2 text-xs gap-1.5", isCustom && "bg-primary/10 text-primary hover:bg-primary/20")}
          >
            <Calendar className="h-3 w-3" />
            <span className="hidden sm:inline">Período:</span>
            {displayLabel}
            {isCustom && <span className="text-[10px] opacity-70">(custom)</span>}
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-xs">Período do Widget</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setWidgetCustomPeriod(widgetId, "global")} className="text-xs">
            <Check className={cn("mr-2 h-3 w-3", !isCustom ? "opacity-100" : "opacity-0")} />
            Usar período global
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setWidgetCustomPeriod(widgetId, "today")} className="text-xs">
            <Check
              className={cn(
                "mr-2 h-3 w-3",
                widgetPeriod?.mode === "custom" && widgetPeriod?.customPeriod?.label === "Hoje"
                  ? "opacity-100"
                  : "opacity-0",
              )}
            />
            Hoje
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setWidgetCustomPeriod(widgetId, "7days")} className="text-xs">
            <Check
              className={cn(
                "mr-2 h-3 w-3",
                widgetPeriod?.mode === "custom" && widgetPeriod?.customPeriod?.label === "Últimos 7 dias"
                  ? "opacity-100"
                  : "opacity-0",
              )}
            />
            Últimos 7 dias
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setWidgetCustomPeriod(widgetId, "30days")} className="text-xs">
            <Check
              className={cn(
                "mr-2 h-3 w-3",
                widgetPeriod?.mode === "custom" && widgetPeriod?.customPeriod?.label === "Últimos 30 dias"
                  ? "opacity-100"
                  : "opacity-0",
              )}
            />
            Últimos 30 dias
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setWidgetCustomPeriod(widgetId, "thisMonth")} className="text-xs">
            <Check
              className={cn(
                "mr-2 h-3 w-3",
                widgetPeriod?.mode === "custom" && widgetPeriod?.customPeriod?.label === "Este mês"
                  ? "opacity-100"
                  : "opacity-0",
              )}
            />
            Este mês
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setWidgetCustomPeriod(widgetId, "lastMonth")} className="text-xs">
            <Check
              className={cn(
                "mr-2 h-3 w-3",
                widgetPeriod?.mode === "custom" && widgetPeriod?.customPeriod?.label === "Mês passado"
                  ? "opacity-100"
                  : "opacity-0",
              )}
            />
            Mês passado
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setWidgetCustomPeriod(widgetId, "90days")} className="text-xs">
            <Check
              className={cn(
                "mr-2 h-3 w-3",
                widgetPeriod?.mode === "custom" && widgetPeriod?.customPeriod?.label === "Últimos 90 dias"
                  ? "opacity-100"
                  : "opacity-0",
              )}
            />
            Últimos 90 dias
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setWidgetCustomPeriod(widgetId, "365days")} className="text-xs">
            <Check
              className={cn(
                "mr-2 h-3 w-3",
                widgetPeriod?.mode === "custom" && widgetPeriod?.customPeriod?.label === "Último ano"
                  ? "opacity-100"
                  : "opacity-0",
              )}
            />
            Último ano
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  // Define WidgetConfig type, as the original `Widget` type had `size` property that is no longer relevant for the state
  type WidgetConfig = Omit<Widget, "size">

  const [widgets, setWidgets] = useState<WidgetState[]>([
    { id: "metrics", type: "metrics", visible: true, order: 0 },
    { id: "ltv", type: "ltv", visible: true, order: 1 }, // Added LTV widget visible by default
    { id: "mrr", type: "mrr", visible: true, order: 2 },
    { id: "churn", type: "churn", visible: true, order: 3 },
    { id: "revenue", type: "revenue", visible: true, order: 4 },
    { id: "averageTicket", type: "averageTicket", visible: true, order: 5 },
    { id: "activeProjectsWidget", type: "activeProjectsWidget", visible: true, order: 6 },
    { id: "creditPlans", type: "creditPlans", visible: true, order: 7 },
    { id: "accountsReceivable", type: "accountsReceivable", visible: true, order: 8 },
    { id: "activity", type: "activity", visible: true, order: 9 },
    { id: "alerts", type: "alerts", visible: true, order: 10 },
    { id: "performers", type: "performers", visible: true, order: 11 },
    { id: "quickActions", type: "quickActions", visible: true, order: 12 },
    { id: "userDistribution", type: "userDistribution", visible: true, order: 13 },
    { id: "activeUsers", type: "activeUsers", visible: true, order: 14 },
    { id: "systemAlerts", type: "systemAlerts", visible: true, order: 15 },
    { id: "adminProfiles", type: "adminProfiles", visible: true, order: 16 },
    { id: "permissionMatrix", type: "permissionMatrix", visible: true, order: 17 },
    { id: "managementTools", type: "managementTools", visible: true, order: 18 },
    { id: "cmv", type: "cmv", visible: true, order: 19 }, // Added CMV widget
    { id: "nomadsIndicators", type: "nomadsIndicators", visible: true, order: 20 }, // Added nomadsIndicators widget
    { id: "tasks", type: "tasks", visible: true, order: 21 }, // Added tasks widget
    // Added platformActivities widget to default state
    { id: "platformActivities", type: "platformActivities", visible: true, order: 22 },
    {
      id: "nomades",
      type: "nomades",
      visible: true,
      order: 23, // This order seems duplicated, might need adjustment
    },
    // Added nomadsRanking and agenciesRanking widgets to default state
    { id: "nomadsRanking", type: "nomadsRanking", visible: true, order: 24 },
    { id: "agenciesRanking", type: "agenciesRanking", visible: true, order: 25 },
    { id: "statusOverview", type: "statusOverview", visible: true, order: 26 },
  ])

  const [draggedWidget, setDraggedWidget] = useState<string | null>(null) // Use string for widget id
  const [dragOverWidget, setDragOverWidget] = useState<string | null>(null) // Use string for widget id

  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
  const [selectedWidgetsForExport, setSelectedWidgetsForExport] = useState<WidgetType[]>([])
  const [isExporting, setIsExporting] = useState(false)

  const [widgetSize, setWidgetSize] = useState<WidgetSize>("standard")

  interface SavedDashboard {
    id: string
    name: string
    widgets: WidgetState[]
    createdAt: string
    updatedAt?: string // Added
    isGlobal?: boolean // Added
    sharedWith?: string[] // Added
    createdBy?: string // Added
  }

  const [savedDashboards, setSavedDashboards] = useState<SavedDashboard[]>([])
  const [currentDashboardId, setCurrentDashboardId] = useState<string | null>(null)
  const [showSaveDashboardDialog, setShowSaveDashboardDialog] = useState(false)
  const [newDashboardName, setNewDashboardName] = useState("")
  const [showDashboardSelector, setShowDashboardSelector] = useState(false)

  const [editingDashboardId, setEditingDashboardId] = useState<string | null>(null)
  const [editingDashboardName, setEditingDashboardName] = useState("")
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [sharingDashboardId, setSharingDashboardId] = useState<string | null>(null)
  const [shareGlobal, setShareGlobal] = useState(false)
  const [shareWithProfessionals, setShareWithProfessionals] = useState<string[]>([])
  const [professionalSearch, setProfessionalSearch] = useState("")

  // Undeclared Variables Fixes
  const handleOpenShareDialog = (dashboardId: string) => {
    setSharingDashboardId(dashboardId)
    const dashboard = savedDashboards.find((d) => d.id === dashboardId)
    if (dashboard) {
      setShareGlobal(dashboard.isGlobal ?? false)
      setShareWithProfessionals(dashboard.sharedWith ?? [])
    }
    setShowShareDialog(true)
  }

  const handleSaveEditedDashboard = () => {
    if (!editingDashboardId || !editingDashboardName.trim()) return

    const updatedDashboards = savedDashboards.map((d) =>
      d.id === editingDashboardId
        ? { ...d, name: editingDashboardName.trim(), updatedAt: new Date().toISOString() }
        : d,
    )
    setSavedDashboards(updatedDashboards)
    localStorage.setItem("saved-dashboards", JSON.stringify(updatedDashboards))
    setShowEditDialog(false)
    setEditingDashboardId(null)
    setEditingDashboardName("")
  }
  // End Undeclared Variables Fixes

  useEffect(() => {
    const savedConfig = localStorage.getItem("dashboard-widget-config")
    if (savedConfig) {
      try {
        // Ensure the loaded config matches the WidgetState type
        const parsedConfig: WidgetState[] = JSON.parse(savedConfig)
        setWidgets(
          parsedConfig.map((w) => ({ ...w, id: w.id || `${w.type}-${Math.random().toString(36).substr(2, 9)}` })),
        ) // Ensure id exists
      } catch (e) {
        console.error("[v0] Failed to parse saved widget config:", e)
      }
    }

    const savedMetrics = localStorage.getItem("dashboard-metric-cards")
    if (savedMetrics) {
      try {
        setMetricCards(JSON.parse(savedMetrics))
      } catch (e) {
        console.error("[v0] Failed to parse saved metric cards:", e)
      }
    }

    const savedLayout = localStorage.getItem("dashboard-column-layout")
    if (savedLayout) {
      setColumnLayout(savedLayout as ColumnLayout)
    }

    const savedSize = localStorage.getItem("dashboard-widget-size")
    if (savedSize) {
      setWidgetSize(savedSize as WidgetSize)
    }

    // Load widget period overrides from localStorage
    const savedWidgetPeriods = localStorage.getItem("dashboard-widget-periods")
    if (savedWidgetPeriods) {
      try {
        setWidgetPeriods(JSON.parse(savedWidgetPeriods))
      } catch (e) {
        console.error("[v0] Failed to parse saved widget periods:", e)
      }
    }

    // Load saved dashboards from localStorage
    const savedDashboardsData = localStorage.getItem("saved-dashboards")
    if (savedDashboardsData) {
      const parsedDashboards = JSON.parse(savedDashboardsData)
      setSavedDashboards(parsedDashboards)
      // Try to find the currently active dashboard
      const currentDashboard = parsedDashboards.find(
        (d: SavedDashboard) => d.id === localStorage.getItem("current-dashboard-id"),
      )
      if (currentDashboard) {
        setCurrentDashboardId(currentDashboard.id)
        setWidgets(currentDashboard.widgets)
      }
    }
  }, [])

  useEffect(() => {
    // Ensure consistent structure when saving
    localStorage.setItem(
      "dashboard-widget-config",
      JSON.stringify(
        widgets.map((w) => ({
          id: w.id,
          type: w.type,
          visible: w.visible,
          order: w.order,
          customTitle: w.customTitle,
        })),
      ),
    )
    localStorage.setItem("dashboard-metric-cards", JSON.stringify(metricCards))
    localStorage.setItem("dashboard-column-layout", columnLayout)
    localStorage.setItem("dashboard-widget-size", widgetSize)
    // Save widget period overrides to localStorage
    localStorage.setItem("dashboard-widget-periods", JSON.stringify(widgetPeriods))

    // Save dashboards to localStorage whenever they change
    localStorage.setItem("saved-dashboards", JSON.stringify(savedDashboards))
    if (currentDashboardId) {
      localStorage.setItem("current-dashboard-id", currentDashboardId)
    }
  }, [widgets, metricCards, columnLayout, widgetSize, widgetPeriods, savedDashboards, currentDashboardId]) // Added savedDashboards and currentDashboardId to dependencies

  useEffect(() => {
    console.log("[v0] AdminDashboardPage mounted successfully")
    console.log("[v0] Widgets count:", widgets.length)
    console.log("[v0] MetricCards count:", metricCards.length)
  }, [])

  const widgetLibrary: WidgetLibraryItem[] = [
    {
      id: "metrics",
      name: "Cards de Métricas",
      description: "Principais métricas (Usuários, Empresas, Projetos, etc.)",
      icon: LayoutGrid,
      color: "blue",
    },
    {
      id: "accountsReceivable",
      name: "À Receber",
      description: "Valores garantidos a receber por tipo (Planos, Pós-pagos, Outros)",
      icon: DollarSign,
      color: "green",
    },
    {
      id: "platformActivities",
      name: "Atividades da Plataforma",
      description: "Agências ativas, tempo de uso, MAU e DAU com crescimento",
      icon: Activity,
      color: "blue",
    },
    {
      id: "tasks",
      name: "Tarefas (Resumo)",
      description: "Tarefas executadas, em execução e contratadas com SLA",
      icon: CheckSquare,
      color: "green",
    },
    {
      id: "nomads",
      name: "Nômades",
      description: "Total, ativos e inativos com variações percentuais",
      icon: Users,
      color: "indigo",
    },
    {
      id: "nomadsIndicators",
      name: "Indicadores dos Nômades",
      description: "KPIs de desempenho, atividade e qualidade dos nômades",
      icon: Users,
      color: "purple",
    },
    {
      id: "nomadsRanking",
      name: "Ranking de Nômades",
      description: "Top 10 nômades por avaliação e projetos concluídos",
      icon: Trophy,
      color: "yellow",
    },
    {
      id: "agenciesRanking",
      name: "Ranking de Agências",
      description: "Top 10 agências por projetos e contribuição",
      icon: Building2,
      color: "cyan",
    },
    {
      id: "statusOverview",
      name: "Visão Geral por Status",
      description: "Quantidade de Projetos, Tarefas e Leads por status",
      icon: LayoutGrid,
      color: "blue",
    },
    {
      id: "cmv",
      name: "CMV (Custo de Mercadoria Vendida)",
      description: "Custos diretos (nômades, impostos, comissões) vs faturamento",
      icon: Calculator,
      color: "orange",
    },
    {
      id: "ltv",
      name: "LTV (Lifetime Value)",
      description: "Valor médio que um cliente gera durante todo o relacionamento",
      icon: TrendingUp,
      color: "purple",
    },
    {
      id: "mrr",
      name: "MRR (Receita Recorrente)",
      description: "Monthly Recurring Revenue com New, Expansion, Contraction e Churn",
      icon: TrendingUp,
      color: "red",
    },
    {
      id: "churn",
      name: "CHURN",
      description: "Inativações de contas por tipo e projetos cancelados",
      icon: TrendingDown,
      color: "red",
    },
    {
      id: "revenue",
      name: "Receita",
      description: "Receita total por tipo (Plano, Recorrente, Avulsa)",
      icon: DollarSign,
      color: "emerald",
    },
    {
      id: "averageTicket",
      name: "Ticket Médio",
      description: "Ticket médio geral, por tipo de conta e por projeto",
      icon: DollarSign,
      color: "teal",
    },
    {
      id: "activeProjectsWidget",
      name: "Projetos Ativos",
      description: "Projetos ativos por tipo (Agências e Lead Premium) com novos projetos",
      icon: Briefcase,
      color: "indigo",
    },
    {
      id: "creditPlans",
      name: "Planos de Crédito",
      description: "Entrada de receita por tipo de plano com novas contratações",
      icon: CreditCard,
      color: "slate",
    },
    {
      id: "activity",
      name: "Atividade Recente",
      description: "Últimas ações e eventos no sistema",
      icon: Activity,
      color: "amber",
    },
    {
      id: "alerts",
      name: "Alertas Rápidos",
      description: "Notificações importantes que requerem atenção",
      icon: Bell,
      color: "orange",
    },
    {
      id: "performers",
      name: "Melhores Nômades",
      description: "Top performers baseado em avaliações e projetos",
      icon: Award,
      color: "yellow",
    },
    {
      id: "quickActions",
      name: "Ações Rápidas",
      description: "Atalhos para tarefas administrativas comuns",
      icon: Zap,
      color: "sky",
    },
    {
      id: "userDistribution",
      name: "Distribuição de Usuários",
      description: "Breakdown por tipo de conta",
      icon: Users,
      color: "blue",
    },
    {
      id: "activeUsers",
      name: "Usuários Ativos",
      description: "Usuários ativos por tipo de conta no período",
      icon: UserCheck,
      color: "green",
    },
    {
      id: "systemAlerts",
      name: "Alertas do Sistema",
      description: "Avisos importantes sobre o sistema",
      icon: AlertTriangle,
      color: "red",
    },
    {
      id: "adminProfiles",
      name: "Perfis Admin",
      description: "Membros da equipe administrativa",
      icon: Shield,
      color: "purple",
    },
    {
      id: "permissionMatrix",
      name: "Matriz de Permissões",
      description: "Visualização das permissões por módulo e perfil",
      icon: Lock,
      color: "orange",
    },
    {
      id: "managementTools",
      name: "Ferramentas de Gestão",
      description: "Acesso rápido a ferramentas administrativas essenciais",
      icon: Settings,
      color: "gray",
    },
  ]

  const getMetricsForPeriod = () => {
    const baseMetrics = {
      "7d": {
        totalUsers: { value: "2,847", change: 8.5, trend: "up" as const },
        activeUsers: { value: "1,984", change: 7.2, trend: "up" as const },
        companies: { value: "89", change: 3.5, trend: "up" as const },
        activeProjects: { value: "378", change: -4.2, trend: "down" as const },
        revenue: {
          value: "R$ 94.9k",
          change: 10.5,
          trend: "up" as const,
          breakdown: {
            creditPlan: { value: "R$ 39.7k", change: 14.2 },
            recurring: { value: "R$ 33.1k", change: 8.9 },
            oneTime: { value: "R$ 22.1k", change: 7.3 },
          },
        },
        avgRating: {
          value: 4.6,
          change: 0.1,
          trend: "up" as const,
          breakdown: {
            nomades: { value: 4.7, change: 0.2, trend: "up" as const },
            agencies: { value: 4.5, change: -0.1, trend: "down" as const },
            leadPremium: { value: 4.3, change: 0.1, trend: "up" as const },
            support: { value: 4.8, change: 0.3, trend: "up" as const },
            projects: { value: 4.4, change: 0.0, trend: "up" as const },
          },
        },
      },
      "30d": {
        totalUsers: { value: "2,847", change: 12.5, trend: "up" as const },
        activeUsers: { value: "2,134", change: 8.3, trend: "up" as const },
        companies: { value: "89", change: 5.6, trend: "up" as const },
        activeProjects: { value: "456", change: -2.1, trend: "down" as const },
        revenue: {
          value: "R$ 284.7k",
          change: 15.2,
          trend: "up" as const,
          breakdown: {
            creditPlan: { value: "R$ 119.1k", change: 18.7 },
            recurring: { value: "R$ 99.1k", change: 13.4 },
            oneTime: { value: "R$ 66.5k", change: 10.9 },
          },
        },
        avgRating: {
          value: 4.8,
          change: 0.3,
          trend: "up" as const,
          breakdown: {
            nomades: { value: 4.9, change: 0.4, trend: "up" as const },
            agencies: { value: 4.7, change: 0.2, trend: "up" as const },
            leadPremium: { value: 4.6, change: 0.3, trend: "up" as const },
            support: { value: 4.9, change: 0.4, trend: "up" as const },
            projects: { value: 4.7, change: 0.2, trend: "up" as const },
          },
        },
      },
      "90d": {
        totalUsers: { value: "2,847", change: 28.7, trend: "up" as const },
        activeUsers: { value: "2,456", change: 18.9, trend: "up" as const },
        companies: { value: "89", change: 15.3, trend: "up" as const },
        activeProjects: { value: "512", change: 7.8, trend: "up" as const },
        revenue: {
          value: "R$ 854.1k",
          change: 32.4,
          trend: "up" as const,
          breakdown: {
            creditPlan: { value: "R$ 357.2k", change: 35.8 },
            recurring: { value: "R$ 297.4k", change: 31.2 },
            oneTime: { value: "R$ 199.5k", change: 28.9 },
          },
        },
        avgRating: {
          value: 4.9,
          change: 0.5,
          trend: "up" as const,
          breakdown: {
            nomades: { value: 5.0, change: 0.6, trend: "up" as const },
            agencies: { value: 4.8, change: 0.4, trend: "up" as const },
            leadPremium: { value: 4.7, change: 0.5, trend: "up" as const },
            support: { value: 5.0, change: 0.6, trend: "up" as const },
            projects: { value: 4.8, change: 0.4, trend: "up" as const },
          },
        },
      },
      custom: {
        totalUsers: { value: "2,847", change: 10.0, trend: "up" as const },
        activeUsers: { value: "2,000", change: 7.5, trend: "up" as const },
        companies: { value: "89", change: 4.2, trend: "up" as const },
        activeProjects: { value: "440", change: 1.5, trend: "up" as const },
        revenue: {
          value: "R$ 148.9k",
          change: 12.0,
          trend: "up" as const,
          breakdown: {
            creditPlan: { value: "R$ 62.3k", change: 18.0 },
            recurring: { value: "R$ 51.8k", change: 9.0 },
            oneTime: { value: "R$ 34.8k", change: 4.0 },
          },
        },
        avgRating: {
          value: 4.6,
          change: 0.2,
          trend: "up" as const,
          breakdown: {
            nomades: { value: 4.7, change: 0.2, trend: "up" as const },
            agencies: { value: 4.5, change: 0.1, trend: "up" as const },
            leadPremium: { value: 4.3, change: 0.0, trend: "up" as const },
            support: { value: 4.8, change: 0.3, trend: "up" as const },
            projects: { value: 4.4, change: 0.1, trend: "up" as const },
          },
        },
      },
    }
    // @ts-ignore
    return baseMetrics[timeRange as keyof typeof baseMetrics]
  }

  const metrics = getMetricsForPeriod()

  // Mock data for recent activities
  const recentActivities = [
    {
      id: 1,
      type: "user_registered",
      title: "Novo usuário cadastrado",
      description: "Maria Silva se cadastrou como Nômade",
      time: "5 minutos atrás",
      icon: Users,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      id: 2,
      type: "project_created",
      title: "Novo projeto criado",
      description: "TechCorp criou o projeto 'Desenvolvimento Mobile'",
      time: "15 minutos atrás",
      icon: Briefcase,
      color: "text-info",
      bgColor: "bg-info/10",
    },
    {
      id: 3,
      type: "user_updated",
      title: "Perfil atualizado",
      description: "João Costa atualizou suas informações",
      time: "1 hora atrás",
      icon: UserCheck,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      id: 4,
      type: "company_registered",
      title: "Nova empresa cadastrada",
      description: "InnovaTech se registrou na plataforma",
      time: "2 horas atrás",
      icon: Building2,
      color: "text-chart-4",
      bgColor: "bg-chart-4/10",
    },
  ]

  // Mock data for system alerts
  const systemAlerts = [
    {
      id: 1,
      type: "warning",
      title: "Atualização de segurança disponível",
      description: "Recomendamos atualizar o sistema para a versão mais recente",
      priority: "high",
    },
    {
      id: 2,
      type: "info",
      title: "Manutenção programada",
      description: "Manutenção agendada para domingo, 28/01 às 02:00",
      priority: "medium",
    },
    {
      id: 3,
      type: "warning",
      title: "Espaço de armazenamento",
      description: "85% do espaço de armazenamento está sendo utilizado",
      priority: "medium",
    },
  ]

  // Mock data for top performers
  const topPerformers = [
    { id: 1, name: "Ana Santos", rating: 4.9, projects: 45, badge: "gold" },
    { id: 2, name: "Pedro Costa", rating: 4.8, projects: 38, badge: "silver" },
    { id: 3, name: "Maria Oliveira", rating: 4.7, projects: 32, badge: "bronze" },
  ]

  const usersByType = [
    { type: "Empresas", count: 847, percentage: 29.8, growth: "+15%", color: "from-info to-info-foreground" },
    { type: "Agências", count: 623, percentage: 21.9, growth: "+22%", color: "from-success to-success-foreground" },
    { type: "Nômades", count: 1247, percentage: 43.8, growth: "+8%", color: "from-chart-4 to-chart-4" },
    { type: "Admins", count: 130, percentage: 4.5, growth: "+3%", color: "from-warning to-warning-foreground" },
  ]

  const systemAlertsData = [
    { message: "Sistema de pagamentos funcionando normalmente", type: "success", time: "Agora" },
    { message: "Pico de tráfego detectado (+45%)", type: "info", time: "5 min atrás" },
    { message: "Backup automático concluído", type: "success", time: "1h atrás" },
    { message: "2 disputas pendentes de resolução", type: "warning", time: "3h atrás" },
  ]

  const adminProfilesData = [
    {
      name: "Master Admin",
      permissions: "Acesso Total",
      users: 1,
      color: "from-destructive/10 to-destructive/20 dark:from-destructive/5 dark:to-destructive/10",
      description: "Controle completo da plataforma",
    },
    {
      name: "Gestão Financeira",
      permissions: "Financeiro",
      users: 3,
      color: "from-success/10 to-success/20 dark:from-success/5 dark:to-success/10",
      description: "Relatórios, pagamentos e receitas",
    },
    {
      name: "Comercial",
      permissions: "Vendas & Marketing",
      users: 5,
      color: "from-info/10 to-info/20 dark:from-info/5 dark:to-info/10",
      description: "Gestão de clientes e campanhas",
    },
    {
      name: "Gestão de Tarefas",
      permissions: "Operacional",
      users: 4,
      color: "from-primary/10 to-primary/20 dark:from-primary/5 dark:to-primary/10",
      description: "Projetos, nômades e qualidade",
    },
  ]

  const permissionMatrixData = [
    { module: "Usuários", master: true, financeiro: false, comercial: true, operacional: false },
    { module: "Financeiro", master: true, financeiro: true, comercial: false, operacional: false },
    { module: "Projetos", master: true, financeiro: false, comercial: true, operacional: true },
    { module: "Relatórios", master: true, financeiro: true, comercial: true, operacional: true },
    { module: "Configurações", master: true, financeiro: false, comercial: false, operacional: false },
    { module: "Disputas", master: true, financeiro: false, comercial: false, operacional: true },
  ]

  const managementToolsData = [
    {
      title: "Gerenciar Permissões",
      description: "Criar e editar perfis administrativos",
      color: "from-destructive/10 to-destructive/20 dark:from-destructive/5 dark:to-destructive/10",
      hoverColor:
        "hover:from-destructive/20 hover:to-destructive/30 dark:hover:from-destructive/10 dark:hover:to-destructive/15",
      textColor: "text-destructive-foreground",
      subTextColor: "text-destructive",
      href: "/admin/permissoes",
    },
    {
      title: "Gerenciar Usuários",
      description: "Criar, editar e desativar contas",
      color: "from-info/10 to-info/20 dark:from-info/5 dark:to-info/10",
      hoverColor: "hover:from-info/20 hover:to-info/30 dark:hover:from-info/10 dark:hover:to-info/15",
      textColor: "text-info-foreground",
      subTextColor: "text-info",
      href: "/admin/usuarios",
    },
    {
      title: "Relatórios Financeiros",
      description: "Visualizar receitas e pagamentos",
      color: "from-success/10 to-success/20 dark:from-success/5 dark:to-success/10",
      hoverColor: "hover:from-success/20 hover:to-success/30 dark:hover:from-success/10 dark:hover:to-success/15",
      textColor: "text-success-foreground",
      subTextColor: "text-success",
      href: "/admin/relatorios",
    },
    {
      title: "Configurações da Plataforma",
      description: "Ajustar parâmetros do sistema",
      color: "from-primary/10 to-primary/20 dark:from-primary/5 dark:to-primary/10",
      hoverColor: "hover:from-primary/20 hover:to-primary/30 dark:hover:from-primary/10 dark:hover:to-primary/15",
      textColor: "text-primary-foreground",
      subTextColor: "text-primary",
      href: "/admin/configuracoes",
    },
    {
      title: "Resolver Disputas",
      description: "Mediar conflitos entre usuários",
      color: "from-warning/10 to-warning/20 dark:from-warning/5 dark:to-warning/10",
      hoverColor: "hover:from-warning/20 hover:to-warning/30 dark:hover:from-warning/10 dark:hover:to-warning/15",
      textColor: "text-warning-foreground",
      subTextColor: "text-warning",
      href: "/admin/disputas",
    },
    {
      title: "Logs do Sistema",
      description: "Monitorar atividades e erros",
      color: "from-muted to-muted/50 dark:from-muted/50 dark:to-muted/30",
      hoverColor: "hover:from-muted/80 hover:to-muted/60 dark:hover:from-muted/60 dark:hover:to-muted/40",
      textColor: "text-foreground",
      subTextColor: "text-muted-foreground",
      href: "/admin/logs",
    },
  ]

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "error":
        return <XCircle className="h-4 w-4" />
      case "warning":
        return <AlertCircle className="h-4 w-4" />
      case "success":
        return <CheckCircle2 className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  const getAlertColor = (type: string) => {
    switch (type) {
      case "error":
        return "text-destructive-foreground bg-destructive/10 border-destructive"
      case "warning":
        return "text-warning-foreground bg-warning-muted border-warning"
      case "success":
        return "text-success-foreground bg-success-muted border-success"
      default:
        return "text-info-foreground bg-info-muted border-info"
    }
  }

  const getBadgeColor = (badge: string) => {
    switch (badge) {
      case "gold":
        return "bg-warning/20 text-warning-foreground dark:bg-warning/10 dark:text-warning"
      case "silver":
        return "bg-muted text-muted-foreground dark:bg-muted/30 dark:text-muted-foreground"
      case "bronze":
        return "bg-orange-500/20 text-orange-500 dark:bg-orange-500/10 dark:text-orange-500"
      default:
        return "bg-muted text-muted-foreground dark:bg-muted/30 dark:text-muted-foreground"
    }
  }

  const handleCustomDateRange = () => {
    if (customDateRange.from && customDateRange.to) {
      setTimeRange("custom")
      setIsCustomDialogOpen(false)
    }
  }

  const convertOklchToRgb = (element: HTMLElement) => {
    const computedStyle = window.getComputedStyle(element)
    const properties = [
      "color",
      "backgroundColor",
      "borderColor",
      "borderTopColor",
      "borderRightColor",
      "borderBottomColor",
      "borderLeftColor",
      "fill",
      "stroke",
    ]

    properties.forEach((prop) => {
      const value = computedStyle.getPropertyValue(prop)
      if (value && value.includes("oklch")) {
        // Get computed RGB value by creating temporary element
        const tempDiv = document.createElement("div")
        tempDiv.style[prop as any] = value
        document.body.appendChild(tempDiv)
        const computedValue = window.getComputedStyle(tempDiv).getPropertyValue(prop)
        document.body.removeChild(tempDiv)
        element.style[prop as any] = computedValue
      }
    })

    // Recursively process all child elements
    Array.from(element.children).forEach((child) => {
      convertOklchToRgb(child as HTMLElement)
    })
  }

  const handleExportPDF = async () => {
    const visibleWidgets = widgets.filter((w) => w.visible).map((w) => w.type)

    if (visibleWidgets.length === 0) {
      console.log("[v0] No visible widgets to export")
      return
    }

    console.log("[v0] Starting PDF export with widgets:", visibleWidgets)
    setIsExporting(true)

    try {
      // Create a temporary container with only selected widgets
      const tempContainer = document.createElement("div")
      tempContainer.style.position = "absolute"
      tempContainer.style.left = "-9999px"
      tempContainer.style.top = "0"
      tempContainer.style.width = "1200px"
      tempContainer.style.backgroundColor = "#f1f5f9"
      tempContainer.style.padding = "40px"
      document.body.appendChild(tempContainer)

      // Add header
      const header = document.createElement("div")
      header.style.marginBottom = "30px"
      header.innerHTML = `
        <h1 style="font-size: 32px; font-weight: bold; color: #1e293b; margin-bottom: 8px;">Painel de Administração - Allka</h1>
        <p style="font-size: 16px; color: #64748b;">Relatório gerado em ${formatDate(new Date(), "dd/MM/yyyy 'às' HH:mm")}</p>
        <p style="font-size: 14px; color: #64748b; margin-top: 4px;">Período: ${globalPeriod.label}</p>
      `
      tempContainer.appendChild(header)

      for (const widgetId of visibleWidgets) {
        const widgetElement = document.querySelector(`[data-widget-id="${widgetId}"]`)
        if (widgetElement) {
          console.log("[v0] Cloning widget:", widgetId)
          const clone = widgetElement.cloneNode(true) as HTMLElement
          // Remove customize mode controls
          const controls = clone.querySelectorAll("[data-customize-control]")
          controls.forEach((control) => control.remove())
          clone.style.marginBottom = "24px"
          convertOklchToRgb(clone)
          tempContainer.appendChild(clone)
        }
      }

      console.log("[v0] Generating canvas with html2canvas")
      // Generate canvas
      const canvas = await html2canvas(tempContainer, {
        scale: 2,
        logging: false,
        useCORS: true,
        backgroundColor: "#f1f5f9",
      })

      // Remove temporary container
      document.body.removeChild(tempContainer)

      const imgData = canvas.toDataURL("image/png")
      const jsPDF = (await import("jspdf")).default
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      })

      const imgWidth = 210
      const pageHeight = 297
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight
      let position = 0

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      while (heightLeft > 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      const filename = `dashboard-allka-${formatDate(new Date(), "yyyy-MM-dd-HHmm")}.pdf`
      console.log("[v0] Saving PDF:", filename)
      pdf.save(filename)
    } catch (error) {
      console.error("[v0] Error exporting PDF:", error)
      alert("Erro ao gerar PDF. Por favor, tente novamente.")
    } finally {
      setIsExporting(false)
    }
  }

  const handleMetricDragStart = (e: React.DragEvent, metricId: MetricType) => {
    if (!isEditingMetrics) return

    e.stopPropagation()
    setDraggedMetric(metricId)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", metricId)
  }

  const handleMetricDragOver = (e: React.DragEvent, targetMetricId: MetricType) => {
    if (!isEditingMetrics || !draggedMetric) return

    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = "move"
    setDragOverMetric(targetMetricId)
  }

  const handleMetricDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverMetric(null)
  }

  const handleMetricDrop = (e: React.DragEvent, targetMetricId: MetricType) => {
    e.preventDefault()
    e.stopPropagation()

    if (!draggedMetric || draggedMetric === targetMetricId || !isEditingMetrics) {
      setDraggedMetric(null)
      setDragOverMetric(null)
      return
    }

    const draggedIndex = metricCards.findIndex((m) => m.id === draggedMetric)
    const targetIndex = metricCards.findIndex((m) => m.id === targetMetricId)

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedMetric(null)
      setDragOverMetric(null)
      return
    }

    const newMetrics = [...metricCards]
    const [removed] = newMetrics.splice(draggedIndex, 1)
    newMetrics.splice(targetIndex, 0, removed)

    newMetrics.forEach((metric, index) => {
      metric.order = index
    })

    setMetricCards(newMetrics)
    setDraggedMetric(null)
    setDragOverMetric(null)
  }

  const handleMetricDragEnd = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDraggedMetric(null)
    setDragOverMetric(null)
  }

  const handleDragStart = (e: React.DragEvent, widgetId: string) => {
    setDraggedWidget(widgetId)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/html", widgetId)
  }

  const handleDragOver = (e: React.DragEvent, targetWidgetId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragOverWidget(targetWidgetId)
  }

  const handleDragLeave = () => {
    setDragOverWidget(null)
  }

  const handleDrop = (e: React.DragEvent, targetWidgetId: string) => {
    e.preventDefault()

    if (!draggedWidget || draggedWidget === targetWidgetId) {
      setDraggedWidget(null)
      setDragOverWidget(null)
      return
    }

    const draggedIndex = widgets.findIndex((w) => w.id === draggedWidget)
    const targetIndex = widgets.findIndex((w) => w.id === targetWidgetId)

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedWidget(null)
      setDragOverWidget(null)
      return
    }

    const newWidgets = [...widgets]
    const [removed] = newWidgets.splice(draggedIndex, 1)
    newWidgets.splice(targetIndex, 0, removed)

    // Update order values
    newWidgets.forEach((widget, index) => {
      widget.order = index
    })

    setWidgets(newWidgets)
    setDraggedWidget(null)
    setDragOverWidget(null)
  }

  const handleDragEnd = () => {
    setDraggedWidget(null)
    setDragOverWidget(null)
  }

  const toggleWidgetVisibility = (widgetId: string) => {
    setWidgets((prev) =>
      prev.map((widget) => (widget.id === widgetId ? { ...widget, visible: !widget.visible } : widget)),
    )
  }

  const toggleMetricVisibility = (metricId: MetricType) => {
    setMetricCards((prev) => prev.map((card) => (card.id === metricId ? { ...card, visible: !card.visible } : card)))
  }

  const addWidget = (widgetType: WidgetType) => {
    const existingWidget = widgets.find((w) => w.type === widgetType)
    if (existingWidget) {
      // If widget exists but is hidden, make it visible
      setWidgets((prev) => prev.map((widget) => (widget.type === widgetType ? { ...widget, visible: true } : widget)))
    } else {
      // Add new widget at the end
      const maxOrder = Math.max(...widgets.map((w) => w.order), -1)
      setWidgets((prev) => [
        ...prev,
        {
          id: `${widgetType}-${Math.random().toString(36).substr(2, 9)}`, // Generate unique ID
          type: widgetType,
          order: maxOrder + 1,
          visible: true,
          customTitle: "", // Default empty custom title
        },
      ])
    }
    // setIsAddWidgetOpen(false) // Modal stays open now - only closes when user clicks X or outside
  }

  // Helper function to add widget in the library
  const handleAddWidget = (widgetType: WidgetType) => {
    addWidget(widgetType)
    // Modal stays open now - only closes when user clicks X or outside
  }

  const removeWidget = (widgetId: string) => {
    setWidgets((prev) => prev.filter((widget) => widget.id !== widgetId))
  }

  // Added handleRemoveWidget for specific widget removal cases
  const handleRemoveWidget = (widgetId: string) => {
    setWidgets((prev) => prev.filter((widget) => widget.id !== widgetId))
  }

  const handleEditWidget = (widgetId: string) => {
    const widget = widgets.find((w) => w.id === widgetId)
    setEditTitle(widget?.customTitle || "")
    setEditingWidget(widget?.type || null) // Use widget.type for editingWidget state
  }

  const saveWidgetTitle = () => {
    if (editingWidget) {
      setWidgets((prev) =>
        prev.map((widget) => (widget.type === editingWidget ? { ...widget, customTitle: editTitle } : widget)),
      )
      setEditingWidget(null)
      setEditTitle("")
    }
  }

  // Helper function to get widget titles, now uses a record for direct mapping
  const getWidgetTitle = (widgetType: WidgetType, customTitle?: string): string => {
    if (customTitle) return customTitle
    const titles: Record<WidgetType, string> = {
      metrics: "Métricas Principais",
      activity: "Atividade Recente",
      alerts: "Alertas Rápidos",
      performers: "Melhores Nômades",
      quickActions: "Ações Rápidas",
      userDistribution: "Distribuição de Usuários",
      activeUsers: "Usuários Ativos",
      systemAlerts: "Alertas do Sistema",
      adminProfiles: "Perfis Administrativos",
      revenue: "Receita",
      activeProjectsWidget: "Projetos Ativos",
      creditPlans: "Planos de Crédito",
      mrr: "MRR (Receita Recorrente)",
      permissionMatrix: "Matriz de Permissões",
      managementTools: "Ferramentas de Gestão",
      churn: "CHURN",
      averageTicket: "Ticket Médio",
      ltv: "LTV (Lifetime Value)",
      cmv: "CMV (Custo de Mercadoria Vendida)",
      nomads: "Nômades",
      nomadsIndicators: "Indicadores dos Nômades",
      tasks: "Tarefas (Resumo)",
      platformActivities: "Atividades da Plataforma",
      nomadsRanking: "Ranking de Nômades",
      agenciesRanking: "Ranking de Agências",
      statusOverview: "Visão Geral por Status",
      accountsReceivable: "À Receber", // Added title for accounts receivable widget
    }
    return titles[widgetType] || widgetType
  }

  const toggleWidgetForExport = (widgetId: WidgetType) => {
    setSelectedWidgetsForExport((prev) =>
      prev.includes(widgetId) ? prev.filter((id) => id !== widgetId) : [...prev, widgetId],
    )
  }

  const selectAllWidgetsForExport = () => {
    const visibleWidgetIds = widgets.filter((w) => w.visible).map((w) => w.type)
    setSelectedWidgetsForExport(visibleWidgetIds)
  }

  const getColumnClasses = () => {
    switch (columnLayout) {
      case "1":
        return "grid-cols-1"
      case "2-equal":
        return "grid-cols-1 lg:grid-cols-2"
      case "2-33-66":
        return "grid-cols-1 lg:grid-cols-[33%_66%]"
      case "2-66-33":
        return "grid-cols-1 lg:grid-cols-[66%_33%]"
      case "3-equal":
        return "grid-cols-1 lg:grid-cols-3"
      case "3-25-50-25":
        return "grid-cols-1 lg:grid-cols-[25%_50%_25%]"
      default:
        return "grid-cols-1"
    }
  }

  const columnLayouts = [
    { id: "1" as ColumnLayout, label: "100", description: "Uma coluna" },
    { id: "2-equal" as ColumnLayout, label: "50 / 50", description: "Duas colunas iguais" },
    { id: "2-33-66" as ColumnLayout, label: "33 / 66", description: "Duas colunas (1/3 - 2/3)" },
    { id: "2-66-33" as ColumnLayout, label: "66 / 33", description: "Duas colunas (2/3 - 1/3)" },
    { id: "3-equal" as ColumnLayout, label: "33 / 33 / 33", description: "Três colunas iguais" },
    { id: "3-25-50-25" as ColumnLayout, label: "25 / 50 / 25", description: "Três colunas variadas" },
  ]

  // Helper to get drag over classes for conditional styling
  const getDragOverClasses = (widgetId: string) => {
    return dragOverWidget === widgetId && draggedWidget !== widgetId
      ? "border-2 border-success shadow-lg shadow-success/50 scale-105 rounded-lg"
      : ""
  }

  // Define mappings for icons and names for metric cards
  const metricIcons: Record<MetricType, React.ElementType> = {
    totalUsers: Users,
    activeUsers: UserCheck,
    companies: Building2,
    activeProjects: Briefcase,
    revenue: DollarSign,
    avgRating: Star,
  }

  const metricNames: Record<MetricType, string> = {
    totalUsers: "Total de Usuários",
    activeUsers: "Usuários Ativos",
    companies: "Empresas",
    activeProjects: "Projetos Ativos",
    revenue: "Receita",
    avgRating: "Avaliação Média",
  }

  const renderMetricCard = (metricType: MetricType) => {
    const metric = metrics[metricType]
    if (!metric || !metricCards.find((m) => m.id === metricType)?.visible) return null

    const Icon = metricIcons[metricType]
    const metricName = metricNames[metricType]

    const cardPadding = widgetSize === "compact" ? "p-3" : "p-5"
    const titleSize = widgetSize === "compact" ? "text-xs" : "text-sm"
    const valueSize = widgetSize === "compact" ? "text-2xl" : "text-3xl"
    const iconSize = widgetSize === "compact" ? "h-5 w-5" : "h-6 w-6"
    const iconPadding = widgetSize === "compact" ? "p-3" : "p-3"
    const badgeSize = widgetSize === "compact" ? "text-[10px]" : "text-xs"
    const spacingY = widgetSize === "compact" ? "space-y-1" : "space-y-2"

    const isEditing = isEditingMetrics
    const isDragging = draggedMetric === metricType
    const isDragOver = dragOverMetric === metricType

    let bgColor: string
    let gradientFrom: string
    let cardBgGradient: string

    switch (metricType) {
      case "totalUsers":
        bgColor = "from-blue-400 to-blue-600"
        gradientFrom = "from-blue-600/10"
        cardBgGradient = "from-blue-500 to-blue-700"
        break
      case "activeUsers":
        bgColor = "from-emerald-400 to-emerald-600"
        gradientFrom = "from-emerald-600/10"
        cardBgGradient = "from-emerald-500 to-teal-600"
        break
      case "companies":
        bgColor = "from-violet-400 to-violet-600"
        gradientFrom = "from-violet-600/10"
        cardBgGradient = "from-violet-500 to-purple-700"
        break
      case "activeProjects":
        bgColor = "from-orange-400 to-orange-600"
        gradientFrom = "from-orange-600/10"
        cardBgGradient = "from-orange-500 to-rose-600"
        break
      case "revenue":
        bgColor = "from-green-400 to-green-600"
        gradientFrom = "from-green-600/10"
        cardBgGradient = "from-green-500 to-emerald-700"
        break
      case "avgRating":
        bgColor = "from-amber-400 to-amber-600"
        gradientFrom = "from-amber-600/10"
        cardBgGradient = "from-amber-500 to-orange-600"
        break
      default:
        bgColor = "from-muted to-muted-foreground"
        gradientFrom = "from-muted/5"
        cardBgGradient = "from-slate-500 to-slate-700"
    }

    const cardProps = {
      draggable: isEditing,
      onDragStart: (e: React.DragEvent) => handleMetricDragStart(e, metricType),
      onDragOver: (e: React.DragEvent) => handleMetricDragOver(e, metricType),
      onDragLeave: handleMetricDragLeave,
      onDrop: (e: React.DragEvent) => handleMetricDrop(e, metricType),
      onDragEnd: handleMetricDragEnd,
      className: cn(
        "group relative overflow-hidden border-0 shadow-md transition-all duration-200",
        isEditing && "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-40 scale-95 shadow-xl",
        isDragOver && "ring-2 ring-primary ring-offset-2 scale-[1.02] shadow-lg",
        !isDragging && !isDragOver && !isEditing && "hover:shadow-lg hover:-translate-y-0.5",
      ),
    }

    if (metricType === "revenue") {
      return (
        <div
          key={metricType}
          draggable={isEditing}
          onDragStart={(e: React.DragEvent) => handleMetricDragStart(e, metricType)}
          onDragOver={(e: React.DragEvent) => handleMetricDragOver(e, metricType)}
          onDragLeave={handleMetricDragLeave}
          onDrop={(e: React.DragEvent) => handleMetricDrop(e, metricType)}
          onDragEnd={handleMetricDragEnd}
          className={cn(
            `relative rounded-xl overflow-hidden shadow-sm transition-all duration-200 bg-gradient-to-br ${cardBgGradient}`,
            isEditing && "cursor-grab active:cursor-grabbing",
            isDragging && "opacity-40 scale-95",
            isDragOver && "ring-2 ring-white ring-offset-2 scale-[1.02]",
            !isDragging && !isDragOver && !isEditing && "hover:shadow-md hover:scale-[1.02]",
          )}
        >
          {isEditing && (
            <div className="absolute top-1.5 right-1.5 z-10">
              <button
                onClick={(e) => { e.stopPropagation(); toggleMetricVisibility(metricType) }}
                className="bg-white/25 hover:bg-white/40 rounded-md p-0.5 transition-colors"
              >
                <EyeOff className="h-3 w-3 text-white" />
              </button>
            </div>
          )}
          <div className="px-3.5 pt-2.5 pb-2.5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-semibold text-white/70 uppercase tracking-wider truncate">{metricName}</p>
              <div className="bg-white/20 rounded-lg p-1.5 flex-shrink-0 ml-1">
                <Icon className="h-3.5 w-3.5 text-white" />
              </div>
            </div>
            <p className="text-xl font-bold text-white leading-none mb-2">{metric.value}</p>
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white/20 text-white">
                {metric.trend === "up" ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                {metric.trend === "up" ? "+" : "-"}{Math.abs(metric.change)}%
              </div>
              <span className="text-[9px] text-white/60">vs. anterior</span>
            </div>
          </div>
        </div>
      )
    }

    // Adicionar botão de ver gráfico
    return (
      <div
        key={metricType}
        draggable={isEditing}
        onDragStart={(e: React.DragEvent) => handleMetricDragStart(e, metricType)}
        onDragOver={(e: React.DragEvent) => handleMetricDragOver(e, metricType)}
        onDragLeave={handleMetricDragLeave}
        onDrop={(e: React.DragEvent) => handleMetricDrop(e, metricType)}
        onDragEnd={handleMetricDragEnd}
        className={cn(
          `relative rounded-xl overflow-hidden shadow-sm transition-all duration-200 bg-gradient-to-br ${cardBgGradient}`,
          isEditing && "cursor-grab active:cursor-grabbing",
          isDragging && "opacity-40 scale-95",
          isDragOver && "ring-2 ring-white ring-offset-2 scale-[1.02]",
          !isDragging && !isDragOver && !isEditing && "hover:shadow-md hover:scale-[1.02]",
        )}
      >
        {isEditing && (
          <div className="absolute top-1.5 right-1.5 z-10">
            <button
              onClick={(e) => { e.stopPropagation(); toggleMetricVisibility(metricType) }}
              className="bg-white/25 hover:bg-white/40 rounded-md p-0.5 transition-colors"
            >
              <EyeOff className="h-3 w-3 text-white" />
            </button>
          </div>
        )}
        <div className="px-3.5 pt-2.5 pb-2.5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold text-white/70 uppercase tracking-wider truncate">{metricName}</p>
            <div className="bg-white/20 rounded-lg p-1.5 flex-shrink-0 ml-1">
              <Icon className="h-3.5 w-3.5 text-white" />
            </div>
          </div>
          <p className="text-xl font-bold text-white leading-none mb-2">
            {typeof metric.value === "number" ? metric.value.toLocaleString() : metric.value}
          </p>
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white/20 text-white">
              {metric.trend === "up" ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
              {metric.trend === "up" ? "+" : "-"}{Math.abs(metric.change)}{metricType === "avgRating" ? " pts" : "%"}
            </div>
            <span className="text-[9px] text-white/60">{metricType === "avgRating" ? "/ 5.0" : "vs. anterior"}</span>
          </div>
        </div>
      </div>
    )
  }

  const renderWidget = (widget: WidgetState) => {
    const effectivePeriod = getWidgetPeriod(widget.id)

    const renderCustomizeControls = (widget: WidgetState) => (
      <>
        <div
          className="absolute top-2 left-2 z-10 p-1.5 bg-background/95 rounded-lg backdrop-blur-sm shadow-md border cursor-grab active:cursor-grabbing"
          data-customize-control
        >
          <GripVertical className="h-4 w-4 text-primary" />
        </div>
        <div
          className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-background/95 border rounded-lg shadow-lg p-1 backdrop-blur-sm"
          data-customize-control
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleWidgetVisibility(widget.id)}
            className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive"
            title="Ocultar widget"
          >
            <EyeOff className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEditWidget(widget.id)}
            className="h-7 w-7 p-0 hover:bg-primary/10"
            title="Editar widget"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => removeWidget(widget.id)}
            className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
            title="Remover widget"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </>
    )

    switch (widget.type) {
      case "metrics":
        return (
          <div
            key={widget.id}
            data-widget-id={widget.type}
            draggable={isCustomizeMode}
            onDragStart={(e) => handleDragStart(e, widget.id)}
            onDragOver={(e) => handleDragOver(e, widget.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, widget.id)}
            onDragEnd={handleDragEnd}
            className={cn(
              "relative transition-all duration-200",
              isCustomizeMode && "cursor-move",
              draggedWidget === widget.id && "opacity-50 scale-95",
              getDragOverClasses(widget.id),
              !draggedWidget && !dragOverWidget && "hover:scale-[1.01]",
            )}
          >
            {isCustomizeMode && renderCustomizeControls(widget)}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isCustomizeMode && <GripVertical className="h-4 w-4 text-muted-foreground" />}
                    <CardTitle className="text-lg font-semibold">{getWidgetTitle(widget.type)}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <WidgetExportButton widgetId={widget.type} widgetTitle={getWidgetTitle(widget.type)} />
                    <WidgetPeriodSelector widgetId={widget.id} />
                    <Button
                      variant={isEditingMetrics ? "default" : "outline"}
                      size="sm"
                      onClick={() => setIsEditingMetrics(!isEditingMetrics)}
                      className={cn(
                        "text-xs transition-all duration-300",
                        isEditingMetrics && "shadow-lg shadow-primary/30",
                      )}
                    >
                      <Edit2 className="h-3 w-3 mr-1" />
                      {isEditingMetrics ? "Concluir Edição" : "Editar Widgets"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isEditingMetrics && metricCards.some((m) => !m.visible) && (
                  <div className="mb-4 p-3 bg-muted/50 rounded-lg border-2 border-dashed">
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <EyeOff className="h-4 w-4" />
                      Métricas Ocultas
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {metricCards
                        .filter((m) => !m.visible)
                        .map((metricCard) => {
                          const metricNames: Record<MetricType, string> = {
                            totalUsers: "Total de Usuários",
                            activeUsers: "Usuários Ativos",
                            companies: "Empresas",
                            activeProjects: "Projetos Ativos",
                            revenue: "Receita",
                            avgRating: "Avaliação Média",
                          }
                          return (
                            <Button
                              key={metricCard.id}
                              variant="outline"
                              size="sm"
                              onClick={() => toggleMetricVisibility(metricCard.id)}
                              className="text-xs"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              {metricNames[metricCard.id]}
                            </Button>
                          )
                        })}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {metricCards
                    .filter((m) => m.visible)
                    .sort((a, b) => a.order - b.order)
                    .map((metricCard) => renderMetricCard(metricCard.id))}
                </div>
              </CardContent>
            </Card>
          </div>
        )

      case "userDistribution":
        return (
          <div
            key={widget.id}
            data-widget-id={widget.type}
            draggable={isCustomizeMode}
            onDragStart={(e) => handleDragStart(e, widget.id)}
            onDragOver={(e) => handleDragOver(e, widget.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, widget.id)}
            onDragEnd={handleDragEnd}
            className={cn(
              "relative transition-all duration-200",
              isCustomizeMode && "cursor-move",
              draggedWidget === widget.id && "opacity-50 scale-95",
              getDragOverClasses(widget.id),
              !draggedWidget && !dragOverWidget && "hover:scale-[1.01]",
            )}
          >
            {isCustomizeMode && renderCustomizeControls(widget)}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isCustomizeMode && <GripVertical className="h-4 w-4 text-muted-foreground" />}
                    <CardTitle className="text-lg font-semibold">{getWidgetTitle(widget.type)}</CardTitle>
                  </div>
                  <WidgetExportButton widgetId={widget.type} widgetTitle={getWidgetTitle(widget.type)} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {usersByType.map((userType, index) => (
                    <div
                      key={index}
                      className="group p-5 rounded-xl border-0 bg-gradient-to-br from-background to-background/50 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
                    >
                      <div className="flex items-center justify-between">
                        <Badge
                          className={cn("text-xs font-semibold bg-gradient-to-r text-white shadow-sm", userType.color)}
                        >
                          {userType.type}
                        </Badge>
                        <Badge
                          className={cn(
                            "text-xs font-semibold",
                            userType.growth.startsWith("+")
                              ? "bg-success-muted/80 text-success-foreground border-success/50"
                              : "bg-destructive/10 text-destructive border-destructive/50",
                          )}
                        >
                          {userType.growth}
                        </Badge>
                      </div>
                      <p className="text-3xl font-bold text-foreground">{userType.count.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">{userType.percentage}% do total</p>
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden mt-2">
                        <div
                          className={cn("h-full rounded-full transition-all duration-500", userType.color)}
                          style={{ width: `${userType.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )

      case "systemAlerts":
        return (
          <div
            key={widget.id}
            data-widget-id={widget.type}
            draggable={isCustomizeMode}
            onDragStart={(e) => handleDragStart(e, widget.id)}
            onDragOver={(e) => handleDragOver(e, widget.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, widget.id)}
            onDragEnd={handleDragEnd}
            className={cn(
              "relative transition-all duration-200",
              isCustomizeMode && "cursor-move",
              draggedWidget === widget.id && "opacity-50 scale-95",
              getDragOverClasses(widget.id),
              !draggedWidget && !dragOverWidget && "hover:scale-[1.01]",
            )}
          >
            {isCustomizeMode && renderCustomizeControls(widget)}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isCustomizeMode && <GripVertical className="h-4 w-4 text-muted-foreground" />}
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      {getWidgetTitle(widget.type)}
                    </CardTitle>
                  </div>
                  <WidgetExportButton widgetId={widget.type} widgetTitle={getWidgetTitle(widget.type)} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {systemAlertsData.map((alert, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex items-start space-x-3 p-3 rounded-xl border-2 shadow-sm hover:shadow-md transition-all duration-200",
                      alert.type === "success" &&
                        "bg-success-muted border-success/20 dark:bg-success/5 dark:border-success/30",
                      alert.type === "warning" &&
                        "bg-warning-muted border-warning/20 dark:bg-warning/5 dark:border-warning/30",
                      alert.type === "info" && "bg-info-muted border-info/20 dark:bg-info/5 dark:border-info/30",
                    )}
                  >
                    <div className="mt-0.5">{getAlertIcon(alert.type)}</div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium leading-none">{alert.message}</p>
                        <Badge
                          variant="outline"
                          className={`text-xs backdrop-blur-sm ${
                            alert.type === "success"
                              ? "bg-success-muted border-success/50 text-success-foreground"
                              : alert.type === "warning"
                                ? "bg-warning-muted border-warning/50 text-warning-foreground"
                                : "bg-info-muted border-info/50 text-info-foreground"
                          }`}
                        >
                          {alert.time}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )

      case "adminProfiles":
        return (
          <div
            key={widget.id}
            data-widget-id={widget.type}
            draggable={isCustomizeMode}
            onDragStart={(e) => handleDragStart(e, widget.id)}
            onDragOver={(e) => handleDragOver(e, widget.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, widget.id)}
            onDragEnd={handleDragEnd}
            className={cn(
              "relative transition-all duration-200",
              isCustomizeMode && "cursor-move",
              draggedWidget === widget.id && "opacity-50 scale-95",
              getDragOverClasses(widget.id),
              !draggedWidget && !dragOverWidget && "hover:scale-[1.01]",
            )}
          >
            {isCustomizeMode && renderCustomizeControls(widget)}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isCustomizeMode && <GripVertical className="h-4 w-4 text-muted-foreground" />}
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <Shield className="h-5 w-5 text-chart-4" />
                      {getWidgetTitle(widget.type)}
                    </CardTitle>
                  </div>
                  <WidgetExportButton widgetId={widget.type} widgetTitle={getWidgetTitle(widget.type)} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {adminProfilesData.map((profile, index) => (
                    <div
                      key={index}
                      className="group p-5 rounded-xl border-0 bg-gradient-to-br from-background to-background/50 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
                    >
                      <div className="flex items-center justify-between">
                        <Badge
                          className={cn("text-xs font-semibold bg-gradient-to-r text-white shadow-sm", profile.color)}
                        >
                          {profile.name}
                        </Badge>
                        <span className="text-sm font-semibold text-muted-foreground">
                          {profile.users} usuário{profile.users > 1 ? "s" : ""}
                        </span>
                      </div>
                      <h4 className="font-semibold text-base text-foreground">{profile.permissions}</h4>
                      <p className="text-sm text-muted-foreground">{profile.description}</p>
                      <div className="pt-3 border-t">
                        <Link to="/admin/permissoes">
                          <button className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors">
                            Gerenciar Permissões
                            <ArrowRightIcon className="h-3 w-3" />
                          </button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )

      case "permissionMatrix":
        return (
          <div
            key={widget.id}
            data-widget-id={widget.type}
            draggable={isCustomizeMode}
            onDragStart={(e) => handleDragStart(e, widget.id)}
            onDragOver={(e) => handleDragOver(e, widget.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, widget.id)}
            onDragEnd={handleDragEnd}
            className={cn(
              "relative transition-all duration-200",
              isCustomizeMode && "cursor-move",
              draggedWidget === widget.id && "opacity-50 scale-95",
              getDragOverClasses(widget.id),
              !draggedWidget && !dragOverWidget && "hover:scale-[1.01]",
            )}
          >
            {isCustomizeMode && renderCustomizeControls(widget)}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isCustomizeMode && <GripVertical className="h-4 w-4 text-muted-foreground" />}
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <Lock className="h-5 w-5 text-warning" />
                      {getWidgetTitle(widget.type)}
                    </CardTitle>
                  </div>
                  <WidgetExportButton widgetId={widget.type} widgetTitle={getWidgetTitle(widget.type)} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-xl border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr className="border-b">
                        <th className="text-left py-4 px-4 font-semibold">Módulo</th>
                        <th className="text-center py-4 px-4 font-semibold text-destructive">Master</th>
                        <th className="text-center py-4 px-4 font-semibold text-success">Financeiro</th>
                        <th className="text-center py-4 px-4 font-semibold text-info">Comercial</th>
                        <th className="text-center py-4 px-4 font-semibold text-chart-4">Operacional</th>
                      </tr>
                    </thead>
                    <tbody>
                      {permissionMatrixData.map((row, index) => (
                        <tr key={index} className="border-b hover:bg-muted/30 transition-colors">
                          <td className="py-4 px-4 font-medium">{row.module}</td>
                          <td className="text-center py-4 px-4">
                            {row.master ? (
                              <CheckCircle2 className="h-5 w-5 text-success mx-auto" />
                            ) : (
                              <span className="text-muted-foreground/30">—</span>
                            )}
                          </td>
                          <td className="text-center py-4 px-4">
                            {row.financeiro ? (
                              <CheckCircle2 className="h-5 w-5 text-success mx-auto" />
                            ) : (
                              <span className="text-muted-foreground/30">—</span>
                            )}
                          </td>
                          <td className="text-center py-4 px-4">
                            {row.comercial ? (
                              <CheckCircle2 className="h-5 w-5 text-success mx-auto" />
                            ) : (
                              <span className="text-muted-foreground/30">—</span>
                            )}
                          </td>
                          <td className="text-center py-4 px-4">
                            {row.operacional ? (
                              <CheckCircle2 className="h-5 w-5 text-success mx-auto" />
                            ) : (
                              <span className="text-muted-foreground/30">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 p-4 bg-info-muted rounded-xl border-2 border-info/20">
                  <p className="text-sm text-info-foreground flex items-start gap-2">
                    <Key className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>Nota:</strong> Apenas o usuário Master pode criar e gerenciar outros perfis
                      administrativos. O sistema de permissões será detalhado em uma tela específica de gerenciamento.
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )

      case "managementTools":
        return (
          <div
            key={widget.id}
            data-widget-id={widget.type}
            draggable={isCustomizeMode}
            onDragStart={(e) => handleDragStart(e, widget.id)}
            onDragOver={(e) => handleDragOver(e, widget.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, widget.id)}
            onDragEnd={handleDragEnd}
            className={cn(
              "relative transition-all duration-200",
              isCustomizeMode && "cursor-move",
              draggedWidget === widget.id && "opacity-50 scale-95",
              getDragOverClasses(widget.id),
              !draggedWidget && !dragOverWidget && "hover:scale-[1.01]",
            )}
          >
            {isCustomizeMode && renderCustomizeControls(widget)}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isCustomizeMode && <GripVertical className="h-4 w-4 text-muted-foreground" />}
                    <CardTitle className="text-lg font-semibold">
                      <Settings className="h-5 w-5 text-muted-foreground" />
                      {getWidgetTitle(widget.type)}
                    </CardTitle>
                  </div>
                  <WidgetExportButton widgetId={widget.type} widgetTitle={getWidgetTitle(widget.type)} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  <Link to="/admin/usuarios">
                    <button
                      className={cn(
                        "w-full p-4 text-left rounded-xl border-0 shadow-md transition-all hover:shadow-lg",
                        "bg-gradient-to-br from-info/5 to-info/10 hover:from-info/10 hover:to-info/20 dark:from-info/10 dark:to-info/5 dark:hover:from-info/20 dark:hover:to-info/10",
                      )}
                    >
                      <p className={cn("font-semibold mb-1 text-info-foreground")}>Gerenciar Usuários</p>
                      <p className={cn("text-sm text-info")}>Criar, editar e desativar contas</p>
                    </button>
                  </Link>
                  <Link to="/admin/permissoes">
                    <button
                      className={cn(
                        "w-full p-4 text-left rounded-xl border-0 shadow-md transition-all hover:shadow-lg",
                        "bg-gradient-to-br from-destructive/5 to-destructive/10 hover:from-destructive/10 hover:to-destructive/20 dark:from-destructive/10 dark:to-destructive/5 dark:hover:from-destructive/20 dark:hover:to-destructive/10",
                      )}
                    >
                      <p className={cn("font-semibold mb-1 text-destructive-foreground")}>Gerenciar Permissões</p>
                      <p className={cn("text-sm text-destructive")}>Criar e editar perfis administrativos</p>
                    </button>
                  </Link>
                  <Link to="/admin/relatorios">
                    <button
                      className={cn(
                        "w-full p-4 text-left rounded-xl border-0 shadow-md transition-all hover:shadow-lg",
                        "bg-gradient-to-br from-success/5 to-success/10 hover:from-success/10 hover:to-success/20 dark:from-success/10 dark:to-success/5 dark:hover:from-success/20 dark:hover:to-success/10",
                      )}
                    >
                      <p className={cn("font-semibold mb-1 text-success-foreground")}>Relatórios Financeiros</p>
                      <p className={cn("text-sm text-success")}>Visualizar receitas e pagamentos</p>
                    </button>
                  </Link>
                  <Link to="/admin/configuracoes">
                    <button
                      className={cn(
                        "w-full p-4 text-left rounded-xl border-0 shadow-md transition-all hover:shadow-lg",
                        "bg-gradient-to-br from-chart-4/5 to-chart-4/10 hover:from-chart-4/10 hover:to-chart-4/20 dark:from-chart-4/10 dark:to-chart-4/5 dark:hover:from-chart-4/20 dark:hover:to-chart-4/10",
                      )}
                    >
                      <p className={cn("font-semibold mb-1 text-chart-4")}>Configurações da Plataforma</p>
                      <p className={cn("text-sm text-chart-4")}>Ajustar parâmetros do sistema</p>
                    </button>
                  </Link>
                  <Link to="/admin/disputas">
                    <button
                      className={cn(
                        "w-full p-4 text-left rounded-xl border-0 shadow-md transition-all hover:shadow-lg",
                        "bg-gradient-to-br from-warning/5 to-warning/10 hover:from-warning/10 hover:to-warning/20 dark:from-warning/10 dark:to-warning/5 dark:hover:from-warning/20 dark:hover:to-warning/10",
                      )}
                    >
                      <p className={cn("font-semibold mb-1 text-warning-foreground")}>Resolver Disputas</p>
                      <p className={cn("text-sm text-warning")}>Mediar conflitos entre usuários</p>
                    </button>
                  </Link>
                  <Link to="/admin/logs">
                    <button
                      className={cn(
                        "w-full p-4 text-left rounded-xl border-0 shadow-md transition-all hover:shadow-lg",
                        "bg-gradient-to-br from-muted/5 to-muted/10 hover:from-muted/10 hover:to-muted/20 dark:from-muted/10 dark:to-muted/5 dark:hover:from-muted/20 dark:hover:to-muted/10",
                      )}
                    >
                      <p className={cn("font-semibold mb-1 text-foreground")}>Logs do Sistema</p>
                      <p className={cn("text-sm text-muted-foreground")}>Monitorar atividades e erros</p>
                    </button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        )

      case "activity":
        return (
          <div
            key={widget.id}
            data-widget-id={widget.type}
            draggable={isCustomizeMode}
            onDragStart={(e) => handleDragStart(e, widget.id)}
            onDragOver={(e) => handleDragOver(e, widget.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, widget.id)}
            onDragEnd={handleDragEnd}
            className={cn(
              "relative transition-all duration-200",
              isCustomizeMode && "cursor-move",
              draggedWidget === widget.id && "opacity-50 scale-95",
              getDragOverClasses(widget.id),
              !draggedWidget && !dragOverWidget && "hover:scale-[1.01]",
            )}
          >
            {isCustomizeMode && renderCustomizeControls(widget)}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isCustomizeMode && <GripVertical className="h-4 w-4 text-muted-foreground" />}
                    <CardTitle className="text-lg font-semibold">{getWidgetTitle(widget.type)}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <WidgetExportButton widgetId={widget.type} widgetTitle={getWidgetTitle(widget.type)} />
                    <Link to="/admin/activity">
                      <Button variant="ghost" size="sm" className="text-xs hover:bg-primary/10">
                        Ver todas
                        <ArrowRightIcon className="h-3 w-3 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start space-x-3 p-3 rounded-xl hover:bg-muted/50 transition-all duration-200 hover:shadow-md border border-transparent hover:border-border/50"
                  >
                    <div className={`p-2 rounded-xl ${activity.bgColor} shadow-sm`}>
                      <activity.icon className={`h-4 w-4 ${activity.color}`} />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">{activity.title}</p>
                      <p className="text-xs text-muted-foreground">{activity.description}</p>
                      <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{activity.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )

      case "alerts":
        return (
          <div
            key={widget.id}
            data-widget-id={widget.type}
            draggable={isCustomizeMode}
            onDragStart={(e) => handleDragStart(e, widget.id)}
            onDragOver={(e) => handleDragOver(e, widget.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, widget.id)}
            onDragEnd={handleDragEnd}
            className={cn(
              "relative transition-all duration-200",
              isCustomizeMode && "cursor-move",
              draggedWidget === widget.id && "opacity-50 scale-95",
              getDragOverClasses(widget.id),
              !draggedWidget && !dragOverWidget && "hover:scale-[1.01]",
            )}
          >
            {isCustomizeMode && renderCustomizeControls(widget)}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isCustomizeMode && <GripVertical className="h-4 w-4 text-muted-foreground" />}
                    <CardTitle className="text-lg font-semibold">{getWidgetTitle(widget.type)}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <WidgetExportButton widgetId={widget.type} widgetTitle={getWidgetTitle(widget.type)} />
                    <Badge variant="outline" className="text-xs backdrop-blur-sm">
                      {systemAlerts.length} alertas
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {systemAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`flex items-start space-x-3 p-3 rounded-xl border-2 shadow-sm hover:shadow-md transition-all duration-200 ${getAlertColor(alert.type)}`}
                  >
                    <div className="mt-0.5">{getAlertIcon(alert.type)}</div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium leading-none">{alert.title}</p>
                        <Badge
                          variant="outline"
                          className={`text-xs backdrop-blur-sm ${
                            alert.priority === "high"
                              ? "bg-destructive/10 text-destructive border-destructive/50"
                              : "bg-warning-muted text-warning-foreground border-warning/50"
                          }`}
                        >
                          {alert.priority === "high" ? "Alta" : "Média"}
                        </Badge>
                      </div>
                      <p className="text-xs opacity-90">{alert.description}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )

      case "performers":
        return (
          <div
            key={widget.id}
            data-widget-id={widget.type}
            draggable={isCustomizeMode}
            onDragStart={(e) => handleDragStart(e, widget.id)}
            onDragOver={(e) => handleDragOver(e, widget.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, widget.id)}
            onDragEnd={handleDragEnd}
            className={cn(
              "relative transition-all duration-200",
              isCustomizeMode && "cursor-move",
              draggedWidget === widget.id && "opacity-50 scale-95",
              getDragOverClasses(widget.id),
              !draggedWidget && !dragOverWidget && "hover:scale-[1.01]",
            )}
          >
            {isCustomizeMode && renderCustomizeControls(widget)}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isCustomizeMode && <GripVertical className="h-4 w-4 text-muted-foreground" />}
                    <CardTitle className="text-lg font-semibold">{getWidgetTitle(widget.type)}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <WidgetExportButton widgetId={widget.type} widgetTitle={getWidgetTitle(widget.type)} />
                    <Link to="/admin/nomades">
                      <Button variant="ghost" size="sm" className="text-xs hover:bg-primary/10">
                        Ver todos
                        <ArrowRightIcon className="h-3 w-3 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {topPerformers.map((performer, index) => (
                    <div
                      key={performer.id}
                      className="group flex items-center space-x-3 p-4 rounded-xl border-0 bg-gradient-to-br from-background to-background/50 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
                    >
                      <div className="flex-shrink-0">
                        <div className="relative">
                          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-warning to-warning flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:shadow-warning/50 transition-shadow duration-300">
                            {index + 1}
                          </div>
                          <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5">
                            <Award
                              className={`h-5 w-5 ${index === 0 ? "text-warning" : index === 1 ? "text-muted-foreground" : "text-chart-5"}`}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-semibold leading-none">{performer.name}</p>
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-1">
                            <Star className="h-3 w-3 text-warning fill-warning" />
                            <span className="text-xs font-medium">{performer.rating}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">{performer.projects} projetos</span>
                        </div>
                        <Badge className={`text-xs ${getBadgeColor(performer.badge)}`}>
                          {performer.badge === "gold" ? "Ouro" : performer.badge === "silver" ? "Prata" : "Bronze"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )

      case "quickActions":
        return (
          <div
            key={widget.id}
            data-widget-id={widget.type}
            draggable={isCustomizeMode}
            onDragStart={(e) => handleDragStart(e, widget.id)}
            onDragOver={(e) => handleDragOver(e, widget.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, widget.id)}
            onDragEnd={handleDragEnd}
            className={cn(
              "relative transition-all duration-200",
              isCustomizeMode && "cursor-move",
              draggedWidget === widget.id && "opacity-50 scale-95",
              getDragOverClasses(widget.id),
              !draggedWidget && !dragOverWidget && "hover:scale-[1.01]",
            )}
          >
            {isCustomizeMode && renderCustomizeControls(widget)}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isCustomizeMode && <GripVertical className="h-4 w-4 text-muted-foreground" />}
                    <CardTitle className="text-lg font-semibold">{getWidgetTitle(widget.type)}</CardTitle>
                  </div>
                  <WidgetExportButton widgetId={widget.type} widgetTitle={getWidgetTitle(widget.type)} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Link to="/admin/usuarios">
                    <Button
                      variant="outline"
                      className="w-full h-auto flex-col space-y-2 py-4 border-0 bg-gradient-to-br from-info/5 to-info/10 hover:from-info/10 hover:to-info/20 dark:from-info/10 dark:to-info/5 dark:hover:from-info/20 dark:hover:to-info/10"
                    >
                      <Users className="h-5 w-5 text-info" />
                      <span className="text-xs font-medium text-info-foreground">Gerenciar Usuários</span>
                    </Button>
                  </Link>
                  <Link to="/admin/nomades">
                    <Button
                      variant="outline"
                      className="w-full h-auto flex-col space-y-2 py-4 border-0 bg-gradient-to-br from-success/5 to-success/10 hover:from-success/10 hover:to-success/20 dark:from-success/10 dark:to-success/5 dark:hover:from-success/20 dark:hover:to-success/10"
                    >
                      <UserCheck className="h-5 w-5 text-success" />
                      <span className="text-xs font-medium text-success-foreground">Gerenciar Nômades</span>
                    </Button>
                  </Link>
                  <Link to="/admin/projetos">
                    <Button
                      variant="outline"
                      className="w-full h-auto flex-col space-y-2 py-4 border-0 bg-gradient-to-br from-chart-4/5 to-chart-4/10 hover:from-chart-4/10 hover:to-chart-4/20 dark:from-chart-4/10 dark:to-chart-4/5 dark:hover:from-chart-4/20 dark:hover:to-chart-4/10"
                    >
                      <Briefcase className="h-5 w-5 text-chart-4" />
                      <span className="text-xs font-medium text-chart-4">Ver Projetos</span>
                    </Button>
                  </Link>
                  <Link to="/admin/configuracoes">
                    <Button
                      variant="outline"
                      className="w-full h-auto flex-col space-y-2 py-4 border-0 bg-gradient-to-br from-warning/5 to-warning/10 hover:from-warning/10 hover:to-warning/20 dark:from-warning/10 dark:to-warning/5 dark:hover:from-warning/20 dark:hover:to-warning/10"
                    >
                      <Activity className="h-5 w-5 text-warning" />
                      <span className="text-xs font-medium text-warning-foreground">Configurações</span>
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        )

      case "revenue":
        return (
          <Card className="overflow-hidden border-destructive/20" key={widget.id} data-widget-id={widget.type}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-destructive/10">
                    <DollarSign className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Receita</CardTitle>
                    <p className="text-sm text-muted-foreground">Total e por tipo de plano</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <WidgetExportButton widgetId={widget.type} widgetTitle="Receita" />
                  <Badge variant="outline" className="text-destructive border-destructive/30">
                    {globalPeriod.label}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Revenue Total */}
              <div className="pb-4 border-b">
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-bold">R$ 284.7k</h3>
                  <span className="flex items-center gap-1 text-sm text-success font-semibold">
                    <TrendingUp className="h-3.5 w-3.5" />
                    +15.2%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Receita total no período</p>
              </div>

              {/* Breakdown by Type */}
              <div className="space-y-3">
                {/* Credit Plan Revenue */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-info-muted border border-info/50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-2 w-2 rounded-full bg-info" />
                      <span className="text-sm font-medium">Plano de Crédito</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-semibold text-info-foreground">R$ 119.1k</span>
                      <span className="text-xs font-medium text-success">+18.7%</span>
                    </div>
                  </div>
                  {/* Mini bar chart */}
                  <div className="flex items-end gap-0.5 h-8">
                    <div className="w-1 bg-info/60 rounded-t" style={{ height: "45%" }} />
                    <div className="w-1 bg-info/70 rounded-t" style={{ height: "60%" }} />
                    <div className="w-1 bg-info/80 rounded-t" style={{ height: "75%" }} />
                    <div className="w-1 bg-info rounded-t" style={{ height: "100%" }} />
                  </div>
                </div>

                {/* Recurring Revenue */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-chart-4/10 border border-chart-4/50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-2 w-2 rounded-full bg-chart-4" />
                      <span className="text-sm font-medium">Compra Recorrente</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-semibold text-chart-4">R$ 99.1k</span>
                      <span className="text-xs font-medium text-success">+13.4%</span>
                    </div>
                  </div>
                  {/* Mini bar chart */}
                  <div className="flex items-end gap-0.5 h-8">
                    <div className="w-1 bg-chart-4/60 rounded-t" style={{ height: "50%" }} />
                    <div className="w-1 bg-chart-4/70 rounded-t" style={{ height: "65%" }} />
                    <div className="w-1 bg-chart-4/80 rounded-t" style={{ height: "80%" }} />
                    <div className="w-1 bg-chart-4 rounded-t" style={{ height: "90%" }} />
                  </div>
                </div>

                {/* One-Time Revenue */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-success-muted border border-success/50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-2 w-2 rounded-full bg-success" />
                      <span className="text-sm font-medium">Compra Avulsa</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-semibold text-success-foreground">R$ 66.5k</span>
                      <span className="text-xs font-medium text-success">+10.9%</span>
                    </div>
                  </div>
                  {/* Mini bar chart */}
                  <div className="flex items-end gap-0.5 h-8">
                    <div className="w-1 bg-success/60 rounded-t" style={{ height: "40%" }} />
                    <div className="w-1 bg-success/70 rounded-t" style={{ height: "55%" }} />
                    <div className="w-1 bg-success/80 rounded-t" style={{ height: "65%" }} />
                    <div className="w-1 bg-success rounded-t" style={{ height: "70%" }} />
                  </div>
                </div>
              </div>

              {/* Info note */}
              <div className="mt-2 p-2 rounded-lg bg-muted/30 border border-border/50">
                <p className="text-xs text-muted-foreground text-center">Comparado ao mesmo período anterior</p>
              </div>
            </CardContent>
          </Card>
        )

      case "activeProjectsWidget":
        return (
          <div
            key={widget.id}
            data-widget-id={widget.type}
            draggable={isCustomizeMode}
            onDragStart={(e) => handleDragStart(e, widget.id)}
            onDragOver={(e) => handleDragOver(e, widget.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, widget.id)}
            onDragEnd={handleDragEnd}
            className={cn(
              "relative transition-all duration-200",
              isCustomizeMode && "cursor-move",
              draggedWidget === widget.id && "opacity-50 scale-95",
              getDragOverClasses(widget.id),
              !draggedWidget && !dragOverWidget && "hover:scale-[1.01]",
            )}
          >
            {isCustomizeMode && renderCustomizeControls(widget)}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isCustomizeMode && <GripVertical className="h-4 w-4 text-muted-foreground" />}
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-primary" />
                      {getWidgetTitle(widget.type)}
                    </CardTitle>
                  </div>
                  <Badge variant="outline" className="text-xs backdrop-blur-sm">
                    {globalPeriod.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Total Active Projects */}
                <div className="pb-4 border-b">
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-3xl font-bold">312</h3>
                    <span className="text-sm font-medium flex items-center gap-1 text-success">
                      <TrendingUp className="h-3.5 w-3.5" />
                      10%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Projetos ativos no período</p>
                </div>

                {/* Projects Breakdown by Type */}
                <div className="space-y-3">
                  {/* Agency Projects */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-indigo-50 to-transparent dark:from-indigo-950/30 border border-indigo-200 dark:border-indigo-800">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="h-2 w-2 rounded-full bg-indigo-500" />
                        <span className="text-sm font-medium">Agências</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-semibold text-indigo-700 dark:text-indigo-300">210</span>
                        <span className="text-xs font-medium text-success">+8%</span>
                      </div>
                    </div>
                    {/* Mini bar chart */}
                    <div className="flex items-end gap-0.5 h-8">
                      <div className="w-1 bg-indigo-400/60 rounded-t" style={{ height: "55%" }} />
                      <div className="w-1 bg-indigo-400/70 rounded-t" style={{ height: "70%" }} />
                      <div className="w-1 bg-indigo-500/80 rounded-t" style={{ height: "85%" }} />
                      <div className="w-1 bg-indigo-600 rounded-t" style={{ height: "100%" }} />
                    </div>
                  </div>

                  {/* Lead Premium Projects */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 to-transparent dark:from-amber-950/30 border border-amber-200 dark:border-amber-800">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="h-2 w-2 rounded-full bg-amber-500" />
                        <span className="text-sm font-medium">Lead Premium</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-semibold text-amber-700 dark:text-amber-300">102</span>
                        <span className="text-xs font-medium text-success">+15%</span>
                      </div>
                    </div>
                    {/* Mini bar chart */}
                    <div className="flex items-end gap-0.5 h-8">
                      <div className="w-1 bg-amber-400/60 rounded-t" style={{ height: "45%" }} />
                      <div className="w-1 bg-amber-400/70 rounded-t" style={{ height: "65%" }} />
                      <div className="w-1 bg-amber-500/80 rounded-t" style={{ height: "85%" }} />
                      <div className="w-1 bg-amber-600 rounded-t" style={{ height: "100%" }} />
                    </div>
                  </div>
                </div>

                {/* New Projects Section */}
                <div className="p-3 rounded-lg bg-teal-50 to-transparent dark:from-teal-950/30 border border-teal-200/50 dark:border-teal-800/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Plus className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                    <span className="text-sm font-semibold text-teal-900 dark:text-teal-100">Novos no período: 47</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span className="text-indigo-600 dark:text-indigo-400 font-medium">Agências:</span> 32
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <span className="text-amber-600 dark:text-amber-400 font-medium">Lead Premium:</span> 15
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1 text-xs bg-transparent">
                    <FileText className="h-3.5 w-3.5 mr-1" />
                    Ver detalhes
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 text-xs bg-transparent">
                    <Download className="h-3.5 w-3.5 mr-1" />
                    Exportar gráfico
                  </Button>
                </div>

                {/* Info note */}
                <div className="mt-2 p-2 rounded-lg bg-muted/30 border border-border/50">
                  <p className="text-xs text-muted-foreground text-center">Comparado ao mesmo período anterior</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )

      case "creditPlans":
        return (
          <div
            key={widget.id}
            data-widget-id={widget.type}
            draggable={isCustomizeMode}
            onDragStart={(e) => handleDragStart(e, widget.id)}
            onDragOver={(e) => handleDragOver(e, widget.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, widget.id)}
            onDragEnd={handleDragEnd}
            className={cn(
              "relative transition-all duration-200",
              isCustomizeMode && "cursor-move",
              draggedWidget === widget.id && "opacity-50 scale-95",
              getDragOverClasses(widget.id),
              !draggedWidget && !dragOverWidget && "hover:scale-[1.01]",
            )}
          >
            {isCustomizeMode && renderCustomizeControls(widget)}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isCustomizeMode && <GripVertical className="h-4 w-4 text-muted-foreground" />}
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-primary" />
                      {getWidgetTitle(widget.type)}
                    </CardTitle>
                  </div>
                  <Badge variant="outline" className="text-xs backdrop-blur-sm">
                    {globalPeriod.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Total Revenue from Credit Plans */}
                <div className="pb-4 border-b">
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-3xl font-bold">R$ 123.450</h3>
                    <span className="text-sm font-medium flex items-center gap-1 text-success">
                      <TrendingUp className="h-3.5 w-3.5" />
                      12%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Total de entrada no período</p>
                </div>

                {/* Plans Breakdown */}
                <div className="space-y-3">
                  {/* Basic Plan */}
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                        <span className="font-medium">Básico</span>
                        <Badge variant="outline" className="text-xs ml-auto mr-2">
                          Novos: 12
                        </Badge>
                      </div>
                      
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-foreground">R$ 32.000</div>
                      <div className="flex items-center gap-1 text-xs justify-end">
                        <TrendingUp className="h-3 w-3 text-success" />
                        <span className="text-xs font-medium text-success">+5%</span>
                      </div>
                    </div>
                  </div>

                  {/* Partner Plan */}
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                        <span className="font-medium">Partner</span>
                        <Badge variant="outline" className="text-xs ml-auto mr-2">
                          Novos: 24
                        </Badge>
                      </div>
                      
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">R$ 45.500</div>
                      <div className="flex items-center gap-1 text-xs justify-end">
                        <TrendingUp className="h-3 w-3 text-success" />
                        <span className="text-xs font-medium text-success">+18%</span>
                      </div>
                    </div>
                  </div>

                  {/* Premium Plan */}
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                        <span className="font-medium">Premium</span>
                        <Badge variant="outline" className="text-xs ml-auto mr-2">
                          Novos: 8
                        </Badge>
                      </div>
                      
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">R$ 45.950</div>
                      <div className="flex items-center gap-1 text-xs justify-end">
                        <TrendingDown className="h-3 w-3 text-destructive" />
                        <span className="text-xs font-medium text-destructive">-2%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1 gap-1 bg-transparent">
                    <FileText className="h-3.5 w-3.5 mr-1" />
                    Ver contratos
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 gap-1 bg-transparent">
                    <Download className="h-3.5 w-3.5 mr-1" />
                    Exportar relatório
                  </Button>
                </div>

                {/* Info note */}
                <div className="mt-2 p-2 rounded-lg bg-muted/30 border border-border/50">
                  <p className="text-xs text-muted-foreground text-center">
                    Entrada = soma das primeiras cobranças no período
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )

      case "mrr":
        return (
          <div
            key={widget.id}
            data-widget-id={widget.type}
            draggable={isCustomizeMode}
            onDragStart={(e) => handleDragStart(e, widget.id)}
            onDragOver={(e) => handleDragOver(e, widget.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, widget.id)}
            onDragEnd={handleDragEnd}
            className={cn(
              "relative transition-all duration-200",
              isCustomizeMode && "cursor-move",
              draggedWidget === widget.id && "opacity-50 scale-95",
              getDragOverClasses(widget.id),
              !draggedWidget && !dragOverWidget && "hover:scale-[1.01]",
            )}
          >
            {isCustomizeMode && renderCustomizeControls(widget)}
            <Card className="h-full border-0 shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isCustomizeMode && <GripVertical className="h-4 w-4 text-muted-foreground" />}
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      {getWidgetTitle(widget.type)}
                    </CardTitle>
                  </div>
                  <Badge variant="outline" className="text-xs backdrop-blur-sm">
                    {globalPeriod.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* MRR Explanation Info */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-blue-900">O que é MRR?</p>
                      <p className="text-xs text-blue-800 leading-relaxed">
                        MRR (Monthly Recurring Revenue) é a receita previsível gerada mensalmente. Inclui New (novos contratos), Expansion (aumentos), Base (receita existente), Contraction (reduções) e Churn (cancelamentos).
                      </p>
                    </div>
                  </div>
                </div>

                {/* MRR Total */}
                <div className="pb-4 border-b">
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-3xl font-bold">R$ 78.420</h3>
                    <div className="flex items-center gap-2 text-sm font-medium text-success">
                      <ArrowUpRight className="w-4 h-4" />
                      +8%
                    </div>
                    <span className="text-sm text-muted-foreground">vs período anterior</span>
                  </div>
                </div>

                {/* MRR Breakdown */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                  <div className="space-y-1 bg-green-50 p-2.5 rounded-lg border border-green-200">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-success rounded-full" />
                      <div className="text-xs text-muted-foreground font-medium">New
                        <span className="text-green-700" title="Novos contratos adquiridos neste período"> (novos)</span>
                      </div>
                    </div>
                    <div className="text-lg font-semibold text-success">+R$ 9.000</div>
                  </div>

                  <div className="space-y-1 bg-blue-50 p-2.5 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-info rounded-full" />
                      <div className="text-xs text-muted-foreground font-medium">Expansion
                        <span className="text-blue-700" title="Aumento de valor em contratos existentes"> (crescimento)</span>
                      </div>
                    </div>
                    <div className="text-lg font-semibold text-info">+R$ 4.200</div>
                  </div>

                  <div className="space-y-1 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-warning rounded-full" />
                      <div className="text-xs text-muted-foreground font-medium">Contraction
                        <span className="text-amber-700" title="Redução de valor em contratos existentes"> (redução)</span>
                      </div>
                    </div>
                    <div className="text-lg font-semibold text-warning">-R$ 1.500</div>
                  </div>

                  <div className="space-y-1 bg-red-50 p-2.5 rounded-lg border border-red-200">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-destructive rounded-full" />
                      <div className="text-xs text-muted-foreground font-medium">Churn (R$)
                        <span className="text-red-700" title="Contratos cancelados neste período"> (cancelado)</span>
                      </div>
                    </div>
                    <div className="text-lg font-semibold text-destructive">-R$ 3.800</div>
                  </div>
                </div>

                {/* Churn Percentage */}
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Churn Rate</span>
                    <div className="flex items-center gap-2">
                      <div className="text-base font-semibold text-destructive">4.5%</div>
                      <div className="text-xs text-muted-foreground">(revenue churn)</div>
                    </div>
                  </div>
                </div>

                {/* Additional Metrics */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Contratações recorrentes</div>
                    <div className="text-xl font-bold">48</div>
                    <div className="text-xs text-muted-foreground">(novas no período)</div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">ARR estimado</div>
                    <div className="text-xl font-bold">R$ 940.040</div>
                    <div className="text-xs text-muted-foreground">(MRR × 12)</div>
                  </div>
                </div>

                {/* MRR Composition Visualization */}
                <div className="pt-2 border-t">
                  <div className="text-sm font-medium mb-2">Composição do MRR</div>
                  <div className="flex h-3 rounded-full overflow-hidden bg-muted">
                    <div className="bg-success transition-all" style={{ width: "11.5%" }} title="New: R$ 9.000" />
                    <div className="bg-info transition-all" style={{ width: "5.3%" }} title="Expansion: R$ 4.200" />
                    <div className="bg-muted transition-all" style={{ width: "78.4%" }} title="Base MRR: R$ 61.520" />
                    <div
                      className="bg-warning transition-all"
                      style={{ width: "1.9%" }}
                      title="Contraction: R$ 1.500"
                    />
                    <div className="bg-destructive transition-all" style={{ width: "4.8%" }} title="Churn: R$ 3.800" />
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                    <span>Base: R$ 61.520</span>
                    <span>Net Change: +R$ 7.920</span>
                  </div>
                </div>

                {/* Mini Trend Chart */}
                <div className="pt-2 border-t">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">Tendência de MRR</p>
                        <p className="text-xs text-muted-foreground">Últimos 6 meses - Crescimento consistente</p>
                      </div>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        +20%
                      </Badge>
                    </div>
                    
                    {/* Enhanced Bar Chart */}
                    <div className="flex items-end justify-between gap-1.5 h-20 bg-gradient-to-b from-blue-50 to-transparent p-3 rounded-lg border border-blue-100">
                      {[
                        { value: 65000, month: "Jun" },
                        { value: 68000, month: "Jul" },
                        { value: 70000, month: "Ago" },
                        { value: 72500, month: "Set" },
                        { value: 75000, month: "Out" },
                        { value: 78420, month: "Nov" },
                      ].map((data, idx) => {
                        const maxValue = 78420
                        const height = (data.value / maxValue) * 100
                        const isLast = idx === 5
                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center gap-1 group cursor-pointer">
                            <div
                              className={cn(
                                "w-full rounded-t transition-all duration-300 group-hover:opacity-100",
                                isLast 
                                  ? "bg-gradient-to-t from-blue-600 to-blue-400 opacity-100" 
                                  : "bg-gradient-to-t from-blue-400 to-blue-200 opacity-60 group-hover:opacity-80",
                              )}
                              style={{ height: `${height}%` }}
                            />
                            <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                              {data.month}
                            </span>
                            <span className="text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity absolute -top-6">
                              R$ {(data.value / 1000).toFixed(0)}k
                            </span>
                          </div>
                        )
                      })}
                    </div>

                    {/* Trend Summary */}
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="bg-green-50 border border-green-200 rounded p-2">
                        <p className="text-muted-foreground">Menor</p>
                        <p className="font-semibold">R$ 65k</p>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded p-2">
                        <p className="text-muted-foreground">Médio</p>
                        <p className="font-semibold">R$ 71.5k</p>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded p-2">
                        <p className="text-muted-foreground">Atual</p>
                        <p className="font-semibold text-blue-600">R$ 78.4k</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )

      case "churn":
        return (
          <Card className="overflow-hidden border-destructive/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-destructive/10">
                    <TrendingDown className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">CHURN</CardTitle>
                    <p className="text-sm text-muted-foreground">Perda de clientes e receita</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-destructive border-destructive/30">
                  {globalPeriod.label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Customer Churn Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold text-lg">Clientes Inativados</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">24</span>
                    <Badge variant="destructive" className="gap-1">
                      <TrendingUp className="h-3 w-3" />
                      +5%
                    </Badge>
                  </div>
                </div>

                {/* Breakdown by account type */}
                <div className="grid grid-cols-2 gap-2 pl-6">
                  <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                    <span className="text-sm text-muted-foreground">Agências</span>
                    <span className="font-semibold">6</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                    <span className="text-sm text-muted-foreground">Lead Premium</span>
                    <span className="font-semibold">3</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                    <span className="text-sm text-muted-foreground">Nômades</span>
                    <span className="font-semibold">8</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                    <span className="text-sm text-muted-foreground">Free</span>
                    <span className="font-semibold">7</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Project Churn Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold">Projetos Cancelados</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold">11</span>
                    <Badge variant="destructive" className="gap-1">
                      <TrendingUp className="h-3 w-3" />
                      +10%
                    </Badge>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Revenue Churn Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold">Revenue Churn</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-destructive">R$ 14.200</div>
                    <div className="text-sm text-muted-foreground">
                      Churn Rate: <span className="font-semibold text-destructive">3.2%</span>
                    </div>
                  </div>
                </div>

                {/* Visual bar showing churn percentage */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Perda de MRR</span>
                    <span>3.2% do total</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-destructive" style={{ width: "3.2%" }} />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 bg-transparent"
                  onClick={() => {
                    console.log("[v0] Ver detalhes de churn")
                  }}
                >
                  <FileText className="h-3 w-3" />
                  Ver Detalhes
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 bg-transparent"
                  onClick={() => {
                    console.log("[v0] Exportar relatório de churn")
                  }}
                >
                  <Download className="h-3 w-3" />
                  Exportar
                </Button>
              </div>

              {/* Warning if churn increased significantly */}
              <Alert variant="destructive" className="border-destructive/30">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Churn de clientes aumentou 5% vs período anterior. Considere ações de retenção.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )

      case "averageTicket":
        return (
          <Card className="overflow-hidden">
            <CardHeader className="border-b bg-gradient-to-r from-success/10 to-chart-3/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-success/20 rounded-lg">
                    <DollarSign className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Ticket Médio</CardTitle>
                    <p className="text-sm text-muted-foreground">Valor médio por cliente e projeto</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <FileDown className="h-4 w-4 mr-2" />
                    Exportar
                  </Button>
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Ver Detalhes
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {/* Ticket Médio Geral */}
              <div className="mb-6 p-4 bg-success/10 rounded-lg border border-success/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Ticket Médio Geral</p>
                    <p className="text-3xl font-bold text-success">R$ 1.280</p>
                  </div>
                  <div className="flex items-center gap-2 text-success">
                    <TrendingUp className="h-5 w-5" />
                    <span className="text-lg font-semibold">+4%</span>
                  </div>
                </div>
              </div>

              {/* Ticket Médio por Tipo de Conta */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-muted-foreground mb-3">Por Tipo de Conta</h4>
                <div className="space-y-3">
                  {[
                    { type: "Agências", value: "R$ 1.750", change: 6, color: "info" },
                    { type: "Lead Premium", value: "R$ 1.120", change: 2, color: "chart_4" },
                    { type: "Nômades", value: "R$ 680", change: 1, color: "warning" },
                    { type: "Free", value: "R$ 0", change: 0, color: "muted" },
                  ].map((item) => {
                    const colorClasses = {
                      info: "bg-info-muted border-info/20 text-info-foreground",
                      chart_4: "bg-chart-4/10 border-chart-4/20 text-chart-4",
                      warning: "bg-warning-muted border-warning/20 text-warning-foreground",
                      muted: "bg-muted border-border text-muted-foreground",
                    }

                    return (
                      <div
                        key={item.type}
                        className={`flex items-center justify-between p-3 rounded-lg border ${colorClasses[item.color as keyof typeof colorClasses]}`}
                      >
                        <div className="flex-1 flex items-center gap-3 flex-1">
                          <div className="min-w-[130px]">
                            <p className="text-sm font-medium">{item.type}</p>
                          </div>
                          <div className="flex-1">
                            <p className="text-lg font-bold">{item.value}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.change > 0 ? (
                            <>
                              <TrendingUp className="h-4 w-4 text-success" />
                              <span className="text-sm font-semibold text-success">+{item.change}%</span>
                            </>
                          ) : item.change === 0 ? (
                            <span className="text-sm text-muted-foreground">—</span>
                          ) : (
                            <>
                              <TrendingDown className="h-4 w-4 text-destructive" />
                              <span className="text-sm font-semibold text-destructive">{item.change}%</span>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Ticket Médio por Projeto */}
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-3">Por Projeto</h4>
                <div className="flex items-center justify-between p-4 rounded-lg border bg-gradient-to-r from-success/10 to-chart-3/10 border-success/30">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Ticket Médio por Projeto</p>
                    <p className="text-2xl font-bold text-success">R$ 940</p>
                  </div>
                  <div className="flex items-center gap-2 text-success">
                    <TrendingUp className="h-5 w-5" />
                    <span className="text-lg font-semibold">+3%</span>
                  </div>
                </div>
              </div>

              {/* Mini Trend Chart */}
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <p className="text-xs font-medium text-muted-foreground mb-2">Tendência (últimos 6 meses)</p>
                <div className="flex items-end justify-between gap-1 h-16">
                  {[920, 980, 1050, 1120, 1210, 1280].map((val, idx) => {
                    const maxVal = 1280
                    const height = (val / maxVal) * 100
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className="w-full bg-gradient-to-t from-success to-success/80 rounded-sm transition-all hover:opacity-80"
                          style={{ height: `${height}%` }}
                          title={`R$ ${val}`}
                        />
                        <span className="text-[10px] text-muted-foreground">{val}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        )

      case "ltv":
        return (
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-chart-4" />
                <CardTitle className="text-base font-semibold">LTV (Lifetime Value)</CardTitle>
                <p className="text-sm text-muted-foreground">Tempo médio × Ticket médio</p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="h-8 px-2">
                  <FileText className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 px-2">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* LTV Geral */}
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-3xl font-bold">R$ 10.080</div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <span>Tempo médio: 24 meses</span>
                    <span>•</span>
                    <span>Ticket médio: R$ 420/mês</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <ArrowUp className="h-4 w-4 text-success" />
                  <span className="text-success font-semibold">+6%</span>
                </div>
              </div>

              {/* Confiança */}
              <div className="flex items-center gap-2 px-3 py-2 bg-info-muted rounded-lg">
                <Info className="h-4 w-4 text-info" />
                <span className="text-xs text-info-foreground">
                  Confiança: 78% (baseado em {Math.floor(2847 * 0.78)} clientes com histórico completo)
                </span>
              </div>

              {/* Fórmula */}
              <div className="px-3 py-2 bg-muted/50 rounded-lg">
                <div className="text-xs font-mono text-muted-foreground">
                  LTV = Tempo médio de vida (meses) × Ticket médio mensal
                </div>
              </div>

              {/* Breakdown por tipo */}
              <div className="space-y-3">
                <div className="text-sm font-semibold">Por tipo de conta:</div>

                {/* Agências */}
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Agências</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">28 meses × R$ 507/mês</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">R$ 14.200</div>
                    <div className="flex items-center gap-1 text-xs justify-end">
                      <ArrowUp className="h-3 w-3 text-success" />
                      <span className="text-success font-semibold">+8%</span>
                    </div>
                  </div>
                </div>

                {/* Lead Premium */}
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Lead Premium</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">22 meses × R$ 414/mês</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">R$ 9.100</div>
                    <div className="flex items-center gap-1 text-xs justify-end">
                      <ArrowUp className="h-3 w-3 text-success" />
                      <span className="text-success font-semibold">+4%</span>
                    </div>
                  </div>
                </div>

                {/* Nômades */}
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Nômades</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">12 meses × R$ 350/mês</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">R$ 4.200</div>
                    <div className="flex items-center gap-1 text-xs justify-end">
                      <ArrowDown className="h-3 w-3 text-warning" />
                      <span className="text-warning">-1%</span>
                    </div>
                  </div>
                </div>

                {/* Free */}
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg opacity-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Free</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Excluído do cálculo</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-muted-foreground">R$ 0</div>
                  </div>
                </div>
              </div>

              {/* Mini histograma visual */}
              <div className="space-y-2 pt-2">
                <div className="text-sm font-semibold">Distribuição de LTVs:</div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-muted-foreground w-24">R$ 0 - 1k</div>
                    <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                      <div className="bg-muted-foreground h-full" style={{ width: "34%" }} />
                    </div>
                    <div className="text-xs font-medium w-12 text-right">342</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-muted-foreground w-24">R$ 1k - 5k</div>
                    <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                      <div className="bg-info h-full" style={{ width: "21%" }} />
                    </div>
                    <div className="text-xs font-medium w-12 text-right">210</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-muted-foreground w-24">R$ 5k - 15k</div>
                    <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                      <div className="bg-chart-4 h-full" style={{ width: "8%" }} />
                    </div>
                    <div className="text-xs font-medium w-12 text-right">83</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-muted-foreground w-24">R$ 15k+</div>
                    <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                      <div className="bg-success h-full" style={{ width: "3%" }} />
                    </div>
                    <div className="text-xs font-medium w-12 text-right">28</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )

      case "cmv":
        const cmvData = {
          totalCosts: 124320,
          revenue: 482400,
          cmvPercent: 25.8,
          previousCmvPercent: 26.8,
          breakdown: {
            nomades: { value: 62000, percent: 49.9 },
            impostos: { value: 28320, percent: 22.8 },
            comissoes: { value: 24000, percent: 19.3 },
            outros: { value: 10000, percent: 8.0 },
          },
          variation: {
            totalCosts: 4, // +4%
            cmvPercent: -1.0, // -1.0 pp (percentage points)
          },
        }

        return (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-warning" />
                <CardTitle className="text-base font-medium">CMV (Custo de Mercadoria Vendida)</CardTitle>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm">
                  <FileText className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Main CMV Display */}
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">{cmvData.cmvPercent.toFixed(1)}%</span>
                  <span
                    className={cn(
                      "flex items-center text-sm font-medium",
                      cmvData.variation.cmvPercent < 0 ? "text-success" : "text-destructive",
                    )}
                  >
                    {cmvData.variation.cmvPercent < 0 ? (
                      <TrendingDown className="h-3 w-3 mr-1" />
                    ) : (
                      <TrendingUp className="h-3 w-3 mr-1" />
                    )}
                    {Math.abs(cmvData.variation.cmvPercent).toFixed(1)}pp
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Custos{" "}
                  <span className="font-semibold text-foreground">R$ {(cmvData.totalCosts / 1000).toFixed(1)}k</span>
                  <span className="mx-1">/</span>
                  Receita:{" "}
                  <span className="font-semibold text-foreground">R$ {(cmvData.revenue / 1000).toFixed(1)}k</span>
                </div>
              </div>

              {/* Breakdown by Category */}
              <div className="space-y-3 pt-2 border-t">
                <div className="text-xs font-medium text-muted-foreground">Breakdown por Categoria:</div>
                <div className="space-y-2">
                  {Object.entries(cmvData.breakdown).map(([key, data]) => {
                    const categoryNames: Record<string, string> = {
                      nomades: "Nômades",
                      impostos: "Impostos",
                      comissoes: "Comissões",
                      outros: "Outros",
                    }
                    const categoryColors: Record<string, string> = {
                      nomades: "bg-info",
                      impostos: "bg-warning",
                      comissoes: "bg-chart-4",
                      outros: "bg-muted-foreground",
                    }

                    return (
                      <div key={key} className="flex items-center gap-2">
                        <div className={cn("h-2 w-2 rounded-full", categoryColors[key])} />
                        <div className="flex-1 flex items-baseline justify-between text-sm">
                          <span className="text-muted-foreground">{categoryNames[key]}</span>
                          <div className="flex items-baseline gap-2">
                            <span className="font-medium">R$ {(data.value / 1000).toFixed(1)}k</span>
                            <span className="text-xs text-muted-foreground">({data.percent.toFixed(1)}%)</span>
                          </div>
                        </div>
                        {/* Mini bar */}
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className={cn("h-full", categoryColors[key])} style={{ width: `${data.percent}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Visual Composition Bar */}
              <div className="space-y-2 pt-2 border-t">
                <div className="text-xs font-medium text-muted-foreground">Composição do CMV:</div>
                <div className="h-3 w-full bg-muted rounded-full overflow-hidden flex">
                  <div
                    className="bg-info"
                    style={{
                      width: `${cmvData.breakdown.nomades.percent}%`,
                    }}
                    title="Nômades"
                  />
                  <div
                    className="bg-warning"
                    style={{
                      width: `${cmvData.breakdown.impostos.percent}%`,
                    }}
                    title="Impostos"
                  />
                  <div
                    className="bg-chart-4"
                    style={{
                      width: `${cmvData.breakdown.comissoes.percent}%`,
                    }}
                    title="Comissões"
                  />
                  <div
                    className="bg-muted-foreground"
                    style={{
                      width: `${cmvData.breakdown.outros.percent}%`,
                    }}
                    title="Outros"
                  />
                </div>
              </div>

              {/* Alert if CMV is high */}
              {cmvData.cmvPercent > 30 && (
                <div className="flex items-start gap-2 p-2 bg-warning-muted border border-warning/20 rounded-md">
                  <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
                  <div className="text-xs text-warning-foreground">
                    <span className="font-medium">CMV Alto:</span> Custos diretos acima de 30% podem impactar a margem
                    de lucro.
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                  <FileText className="h-3 w-3 mr-1" />
                  Ver Detalhes
                </Button>
                <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                  <Download className="h-3 w-3 mr-1" />
                  Exportar CSV
                </Button>
              </div>
            </CardContent>
          </Card>
        )

      case "platformActivities":
        return (
          <Card key={widget.id} className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-info" />
                <CardTitle className="text-base font-semibold">Atividades da Plataforma</CardTitle>
              </div>
              <Button variant="ghost" size="sm" onClick={() => alert("Ver detalhes")}>
                <ExternalLink className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Main metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Agências Ativas</p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-2xl font-bold">182</span>
                      <span className="flex items-center text-xs text-success font-medium">
                        <TrendingUp className="h-3 w-3" />
                        +7%
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tempo médio/dia</p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-2xl font-bold">42 min</span>
                      <span className="flex items-center text-xs text-success font-medium">
                        <TrendingUp className="h-3 w-3" />
                        +4%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Additional metrics */}
                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground">MAU</p>
                    <span className="text-lg font-semibold">528</span>
                    <span className="text-xs text-success">+5%</span>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">DAU</p>
                    <span className="text-lg font-semibold">128</span>
                    <span className="text-xs text-success">+3%</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Sessões</p>
                    <span className="text-lg font-semibold">3.820</span>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Ações executadas</p>
                    <span className="text-lg font-semibold">14.200</span>
                  </div>
                </div>

                {/* Activity trend chart */}
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground mb-2">Atividade (últimos 7 dias)</p>
                  <div className="flex items-end gap-1 h-16">
                    {[120, 135, 128, 142, 156, 138, 165].map((value, idx) => (
                      <div
                        key={idx}
                        className="flex-1 bg-info rounded-t"
                        style={{ height: `${(value / 165) * 100}%` }}
                        title={`Dia ${idx + 1}: ${value} ações`}
                      />
                    ))}
                  </div>
                </div>

                {widget.size === "large" && (
                  <div className="pt-4 border-t space-y-3">
                    <h4 className="text-sm font-semibold">Tipos de Atividade</h4>
                    {[
                      { label: "Tarefas", value: 4200, color: "bg-info" },
                      { label: "Projetos", value: 3100, color: "bg-chart-4" },
                      { label: "Mensagens", value: 4500, color: "bg-success" },
                      { label: "Uploads", value: 2400, color: "bg-warning" },
                    ].map((item) => (
                      <div key={item.label} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{item.label}</span>
                          <span className="font-medium">{item.value.toLocaleString()}</span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div className={`h-2 ${item.color}`} style={{ width: `${(item.value / 4500) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                    Ver detalhes
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                    <Download className="h-3 w-3 mr-1" />
                    Exportar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )

      case "nomads":
        return (
          <Card className="p-6">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-2/10">
                    <Users className="h-5 w-5 text-chart-2" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Nômades</h3>
                    <p className="text-sm text-muted-foreground">Visão rápida da base de nômades</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    Ver lista
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-1" />
                    Exportar
                  </Button>
                </div>
              </div>

              {/* Total em cima - Destaque grande */}
              <div className="rounded-lg border-2 border-chart-2/30 bg-chart-2/5 p-6 text-center">
                <p className="text-sm font-medium text-chart-2 mb-2">TOTAL DE NÔMADES</p>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-5xl font-bold text-chart-2">316</span>
                  <span className="flex items-center gap-1 text-lg text-success font-semibold">
                    <TrendingUp className="h-5 w-5" />
                    +4%
                  </span>
                </div>
              </div>

              {/* Ativos e Inativos lado a lado */}
              <div className="grid grid-cols-2 gap-4">
                {/* Ativos */}
                <div className="rounded-lg border bg-success-muted border-success/20 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-2 w-2 rounded-full bg-success" />
                    <p className="text-sm font-medium text-success-foreground">Ativos</p>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-success-foreground">248</span>
                    <span className="flex items-center text-sm text-success font-semibold">
                      <TrendingUp className="h-3 w-3" />
                      +6%
                    </span>
                  </div>
                  <p className="text-xs text-success mt-1">vs período anterior</p>
                </div>

                {/* Inativos */}
                <div className="rounded-lg border bg-muted border-border p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                    <p className="text-sm font-medium text-muted-foreground">Inativos</p>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-foreground">68</span>
                    <span className="flex items-center text-sm text-destructive font-semibold">
                      <TrendingDown className="h-3 w-3" />
                      -2%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">vs período anterior</p>
                </div>
              </div>

              {/* Métricas adicionais */}
              <div className="rounded-lg border bg-card p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Novos no período</p>
                    <p className="text-2xl font-bold text-info">24</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Churn</p>
                    <p className="text-2xl font-bold text-destructive">8</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Retenção 30d</p>
                    <p className="text-2xl font-bold text-success">78%</p>
                  </div>
                </div>
              </div>

              {/* Mini gráfico de tendência */}
              <div className="rounded-lg border bg-card p-4">
                <p className="text-xs font-medium text-muted-foreground mb-3">Evolução de nômades ativos</p>
                <div className="flex items-end justify-between gap-1 h-16">
                  {[220, 225, 230, 235, 238, 242, 248].map((value, idx) => {
                    const percentage = (value / 250) * 100
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className="w-full bg-gradient-to-t from-chart-2 to-chart-2/80 rounded-t transition-all hover:bg-chart-2/80"
                          style={{ height: `${percentage}%` }}
                          title={`${value} ativos`}
                        />
                        <span className="text-[10px] text-muted-foreground">D{idx + 1}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Botão de ação adicional */}
              <Button variant="outline" className="w-full bg-transparent" size="sm">
                <Award className="h-4 w-4 mr-2" />
                Ver ranking de nômades
              </Button>
            </div>
          </Card>
        )

      case "nomadsRanking":
        return (
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-warning-muted rounded-lg">
                    <Trophy className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Ranking de Nômades</CardTitle>
                    <p className="text-sm text-muted-foreground">Os melhores nômades da plataforma</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    Ver todos
                    <ArrowRightIcon className="h-3 w-3 ml-1" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-1" />
                    Exportar
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {topPerformers.map((performer, index) => (
                  <div
                    key={performer.id}
                    className="group flex items-center space-x-3 p-4 rounded-xl border-0 bg-gradient-to-br from-background to-background/50 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
                  >
                    <div className="flex-shrink-0">
                      <div className="relative">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-warning to-warning flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:shadow-warning/50 transition-shadow duration-300">
                          {index + 1}
                        </div>
                        <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5">
                          <Award
                            className={`h-5 w-5 ${index === 0 ? "text-warning" : index === 1 ? "text-muted-foreground" : "text-chart-5"}`}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-semibold leading-none">{performer.name}</p>
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1">
                          <Star className="h-3 w-3 text-warning fill-warning" />
                          <span className="text-xs font-medium">{performer.rating}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">{performer.projects} projetos</span>
                      </div>
                      <Badge className={`text-xs ${getBadgeColor(performer.badge)}`}>
                        {performer.badge === "gold" ? "Ouro" : performer.badge === "silver" ? "Prata" : "Bronze"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )

      case "agenciesRanking":
        return (
          <div
            key={widget.id}
            data-widget-id={widget.type}
            draggable={isCustomizeMode}
            onDragStart={(e) => handleDragStart(e, widget.id)}
            onDragOver={(e) => handleDragOver(e, widget.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, widget.id)}
            onDragEnd={handleDragEnd}
            className={cn(
              "relative transition-all duration-200",
              isCustomizeMode && "cursor-move",
              draggedWidget === widget.id && "opacity-50 scale-95",
              getDragOverClasses(widget.id),
              !draggedWidget && !dragOverWidget && "hover:scale-[1.01]",
            )}
          >
            {isCustomizeMode && renderCustomizeControls(widget)}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isCustomizeMode && <GripVertical className="h-4 w-4 text-muted-foreground" />}
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-cyan-500" />
                      {getWidgetTitle(widget.type)}
                    </CardTitle>
                  </div>
                  <div className="flex gap-2">
                    <Link to="/admin/agencias">
                      <Button variant="outline" size="sm" className="text-xs bg-transparent">
                        Ver todos
                        <ArrowRightIcon className="h-3 w-3 ml-1" />
                      </Button>
                    </Link>
                    <Button variant="outline" size="sm" className="text-xs bg-transparent">
                      <Download className="h-4 w-4 mr-1" />
                      Exportar
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { id: 1, name: "Alpha Solutions", projects: 55, rating: 4.8, contribution: "R$ 150k" },
                    { id: 2, name: "Beta Innovations", projects: 48, rating: 4.7, contribution: "R$ 120k" },
                    { id: 3, name: "Gamma Marketing", projects: 42, rating: 4.6, contribution: "R$ 100k" },
                  ].map((agency, index) => (
                    <div
                      key={agency.id}
                      className="group flex items-center space-x-3 p-4 rounded-xl border-0 bg-gradient-to-br from-background to-background/50 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
                    >
                      <div className="flex-shrink-0">
                        <div className="relative">
                          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:shadow-cyan-500/50 transition-shadow duration-300">
                            {index + 1}
                          </div>
                        </div>
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-semibold leading-none">{agency.name}</p>
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-1">
                            <Star className="h-3 w-3 text-warning fill-warning" />
                            <span className="text-xs font-medium">{agency.rating}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">{agency.projects} projetos</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Contribuição</span>
                          <span className="font-medium">{agency.contribution}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )

      case "statusOverview":
        return (
          <div
            key={widget.id}
            data-widget-id={widget.type}
            draggable={isCustomizeMode}
            onDragStart={(e) => handleDragStart(e, widget.id)}
            onDragOver={(e) => handleDragOver(e, widget.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, widget.id)}
            onDragEnd={handleDragEnd}
            className={cn(
              "relative transition-all duration-200",
              isCustomizeMode && "cursor-move",
              draggedWidget === widget.id && "opacity-50 scale-95",
              getDragOverClasses(widget.id),
              !draggedWidget && !dragOverWidget && "hover:scale-[1.01]",
            )}
          >
            {isCustomizeMode && renderCustomizeControls(widget)}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isCustomizeMode && <GripVertical className="h-4 w-4 text-muted-foreground" />}
                    <CardTitle className="text-lg font-semibold">
                      <LayoutGrid className="h-5 w-5" />
                      Visão Geral por Status
                    </CardTitle>
                  </div>
                  <WidgetPeriodSelector widgetId={widget.id} />
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Projects Section */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 text-muted-foreground flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Projetos
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    {[
                      { label: "Em andamento", count: 45, status: "ongoing", color: "blue" },
                      { label: "Aprovados", count: 18, status: "approved", color: "green" },
                      { label: "Concluídos", count: 73, status: "completed", color: "emerald" },
                      { label: "Cancelados", count: 5, status: "cancelled", color: "red" },
                      { label: "Em atraso", count: 8, status: "delayed", color: "amber" },
                    ].map((item) => (
                      <button
                        key={item.status}
                        onClick={() => {
                          window.location.href = `/admin/projects?status=${item.status}`
                        }}
                        className="p-4 rounded-lg border bg-card hover:bg-accent hover:shadow-md transition-all duration-200 text-left group"
                      >
                        <div className="text-xs text-muted-foreground mb-1 group-hover:text-foreground transition-colors">
                          {item.label}
                        </div>
                        <div className={`text-2xl font-bold text-${item.color}-600`}>{item.count}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tasks Section */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 text-muted-foreground flex items-center gap-2">
                    <CheckSquare className="h-4 w-4" />
                    Tarefas
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                      { label: "Contratadas", count: 87, status: "contracted", color: "purple" },
                      { label: "Em execução", count: 34, status: "inprogress", color: "blue" },
                      { label: "Concluídas", count: 456, status: "completed", color: "green" },
                      { label: "Arquivadas", count: 23, status: "archived", color: "gray" },
                    ].map((item) => (
                      <button
                        key={item.status}
                        onClick={() => {
                          window.location.href = `/admin/tasks?status=${item.status}`
                        }}
                        className="p-4 rounded-lg border bg-card hover:bg-accent hover:shadow-md transition-all duration-200 text-left group"
                      >
                        <div className="text-xs text-muted-foreground mb-1 group-hover:text-foreground transition-colors">
                          {item.label}
                        </div>
                        <div className={`text-2xl font-bold text-${item.color}-600`}>{item.count}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Leads Section */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Leads
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    {[
                      { label: "Novos", count: 56, status: "new", color: "cyan" },
                      { label: "Em contato", count: 32, status: "contacted", color: "blue" },
                      { label: "Proposta enviada", count: 15, status: "proposal", color: "purple" },
                      { label: "Fechado", count: 9, status: "won", color: "green" },
                      { label: "Perdido", count: 21, status: "lost", color: "red" },
                    ].map((item) => (
                      <button
                        key={item.status}
                        onClick={() => {
                          window.location.href = `/admin/leads?status=${item.status}`
                        }}
                        className="p-4 rounded-lg border bg-card hover:bg-accent hover:shadow-md transition-all duration-200 text-left group"
                      >
                        <div className="text-xs text-muted-foreground mb-1 group-hover:text-foreground transition-colors">
                          {item.label}
                        </div>
                        <div className={`text-2xl font-bold text-${item.color}-600`}>{item.count}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )

      case "accountsReceivable":
        return (
          <div
            key={widget.id}
            data-widget-id={widget.type}
            draggable={isCustomizeMode}
            onDragStart={(e) => handleDragStart(e, widget.id)}
            onDragOver={(e) => handleDragOver(e, widget.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, widget.id)}
            onDragEnd={handleDragEnd}
            className={cn(
              "relative transition-all duration-200",
              isCustomizeMode && "cursor-move",
              draggedWidget === widget.id && "opacity-50 scale-95",
              getDragOverClasses(widget.id),
              !draggedWidget && !dragOverWidget && "hover:scale-[1.01]",
            )}
          >
            {isCustomizeMode && renderCustomizeControls(widget)}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isCustomizeMode && <GripVertical className="h-4 w-4 text-muted-foreground" />}
                    <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <CardTitle className="text-lg font-semibold">{getWidgetTitle(widget.type)}</CardTitle>
                  </div>
                  <WidgetPeriodSelector widgetId={widget.id} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Total a Receber */}
                <div className="p-4 rounded-lg bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Total a Receber</span>
                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                      +6%
                    </Badge>
                  </div>
                  <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">R$ 182.450,00</div>
                </div>

                {/* Breakdown por categoria */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground">Composição por Tipo</h3>

                  {/* Planos de Crédito */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-950/30 transition-colors">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Planos de Crédito</span>
                    </div>
                    <span className="text-sm font-bold text-blue-700 dark:text-blue-300">R$ 98.200,00</span>
                  </div>

                  {/* Pós-pagos */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-950/30 transition-colors">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Pós-pagos</span>
                    </div>
                    <span className="text-sm font-bold text-purple-700 dark:text-purple-300">R$ 72.600,00</span>
                  </div>

                  {/* Outros Contratos */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-950/30 transition-colors">
                    <div className="flex items-center gap-2">
                      <FileDown className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      <span className="text-sm font-medium text-amber-700 dark:text-amber-300">Outros Contratos</span>
                    </div>
                    <span className="text-sm font-bold text-amber-700 dark:text-amber-300">R$ 11.650,00</span>
                  </div>
                </div>

                {/* Total Recebido no Período */}
                <div className="pt-3 border-t border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
                    <span className="text-sm font-medium text-muted-foreground">Recebido no período</span>
                    <span className="text-sm font-bold text-green-600 dark:text-green-400">R$ 167.000,00</span>
                  </div>
                </div>

                {/* Ver Detalhes Button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 bg-transparent"
                >
                  Ver Detalhes
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        )

      default:
        return null
    }
  }

  // Updated floating button position
  // Completely redesigned widget modal - side panel without overlay
  const handleSaveDashboard = () => {
    if (!newDashboardName.trim()) return

    const newDashboard: SavedDashboard = {
      id: `dashboard-${Date.now()}`,
      name: newDashboardName.trim(),
      widgets: widgets,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(), // Added
      isGlobal: false, // Added
      sharedWith: [], // Added
      createdBy: "current-user", // Added, replace with actual user ID
    }

    const updatedDashboards = [...savedDashboards, newDashboard]
    setSavedDashboards(updatedDashboards)
    localStorage.setItem("saved-dashboards", JSON.stringify(updatedDashboards))

    setCurrentDashboardId(newDashboard.id)
    setNewDashboardName("")
    setShowSaveDashboardDialog(false)
    setIsAddWidgetOpen(false)
  }

  const handleEditDashboard = (dashboardId: string) => {
    const dashboard = savedDashboards.find((d) => d.id === dashboardId)
    if (dashboard) {
      // Carregar os widgets do dashboard selecionado
      setWidgets(dashboard.widgets)
      setCurrentDashboardId(dashboardId)
      toast({
        title: "Modo de edição ativado",
        description: `Editando dashboard: ${dashboard.name}`,
      })
    }
  }

  const handleSaveSharing = () => {
    if (!sharingDashboardId) return

    const updatedDashboards = savedDashboards.map((d) =>
      d.id === sharingDashboardId
        ? {
            ...d,
            isGlobal: shareGlobal,
            sharedWith: shareWithProfessionals,
            updatedAt: new Date().toISOString(),
          }
        : d,
    )

    setSavedDashboards(updatedDashboards)
    localStorage.setItem("saved-dashboards", JSON.stringify(updatedDashboards))

    setSharingDashboardId(null)
    setShareGlobal(false)
    setShareWithProfessionals([])
    setProfessionalSearch("")
    setShowShareDialog(false)
  }

  const handleToggleProfessional = (professionalId: string) => {
    setShareWithProfessionals((prev) =>
      prev.includes(professionalId) ? prev.filter((id) => id !== professionalId) : [...prev, professionalId],
    )
  }

  const handleLoadDashboard = (dashboardId: string) => {
    const dashboard = savedDashboards.find((d) => d.id === dashboardId)
    if (dashboard) {
      setWidgets(dashboard.widgets)
      setCurrentDashboardId(dashboardId)
      localStorage.setItem("dashboard-widget-config", JSON.stringify(dashboard.widgets))
    }
  }

  const handleDeleteDashboard = (dashboardId: string) => {
    const updatedDashboards = savedDashboards.filter((d) => d.id !== dashboardId)
    setSavedDashboards(updatedDashboards)
    localStorage.setItem("saved-dashboards", JSON.stringify(updatedDashboards))

    if (currentDashboardId === dashboardId) {
      setCurrentDashboardId(null)
    }
  }

  return (
    <div className="container mx-auto space-y-4 px-0 py-0">
      {/* Dashboard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 bg-clip-text text-transparent tracking-tight">
            Painel Administrativo
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Visão geral da plataforma em tempo real</p>
        </div>
        <Button
          onClick={() => {
            setDraftWidgets([...widgets].sort((a, b) => a.order - b.order))
            setIsEditDashboardModalOpen(true)
          }}
          className="h-8 px-3 gap-1.5 text-xs font-medium bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 shadow-sm shadow-blue-200 dark:shadow-blue-900/40 border-0 text-white rounded-lg"
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          Editar Dashboard
        </Button>
      </div>

      <AlertsCenter alerts={mockAlerts} />

      {/* Compact Controls Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Calendar className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        <div className="flex items-center gap-0.5 bg-muted/60 rounded-lg p-0.5">
          {[
            { value: "7 dias", label: "7d" },
            { value: "30 dias", label: "30d" },
            { value: "90 dias", label: "90d" },
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setSelectedPeriod(value)}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-md transition-all",
                selectedPeriod === value
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
          <Popover open={isPeriodPickerOpen} onOpenChange={setIsPeriodPickerOpen}>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1",
                  "text-muted-foreground hover:text-foreground"
                )}
              >
                Personalizar
                <ChevronDown className="h-2.5 w-2.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="start">
              <div className="space-y-1.5">
                <h4 className="text-sm font-semibold mb-2">Período</h4>
                {periodOptions.map((option) => (
                  <button
                    key={option.type}
                    onClick={() => handlePeriodChange(option.type, option.label)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg border transition-all hover:border-primary text-left",
                      globalPeriod.type === option.type && "border-primary bg-primary/5",
                    )}
                  >
                    {option.label}
                    {globalPeriod.type === option.type && <Check className="h-3 w-3 text-primary" />}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <Popover open={showColumns} onOpenChange={setShowColumns}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2.5 text-xs gap-1.5">
                <LayoutGrid className="h-3 w-3" />
                Colunas
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="end">
              <div className="space-y-1.5">
                <h4 className="text-sm font-semibold mb-2">Layout</h4>
                {columnLayouts.map((layout) => (
                  <button
                    key={layout.id}
                    onClick={() => { setColumnLayout(layout.id); setShowColumns(false) }}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-lg border text-xs transition-all hover:border-primary text-left",
                      columnLayout === layout.id && "border-primary bg-primary/5",
                    )}
                  >
                    <div>
                      <span className="font-medium">{layout.label}</span>
                      <span className="text-muted-foreground ml-2">{layout.description}</span>
                    </div>
                    {columnLayout === layout.id && <Check className="h-3 w-3 text-primary flex-shrink-0" />}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2.5 text-xs gap-1.5 bg-transparent"
            onClick={handleExportPDF}
            disabled={isExporting}
          >
            <FileText className="h-3 w-3" />
            {isExporting ? "Exportando..." : "Exportar PDF"}
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {metricCards
          .filter((m) => m.visible)
          .sort((a, b) => a.order - b.order)
          .map((metric) => renderMetricCard(metric.id))}
      </div>



      {/* Widgets Grid */}
      <div id="dashboard-content" className={cn("grid gap-4 auto-rows-auto", getColumnClasses())}>
        {widgets
          .filter((w) => w.visible)
          .sort((a, b) => a.order - b.order)
          .map((widget) => renderWidget(widget))}
      </div>

      {/* Floating Add Widget Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          size="default"
          onClick={() => setIsAddWidgetOpen(true)}
          className="gap-2 shadow-lg rounded-full h-12 px-5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          <Plus className="h-4 w-4" />
          Adicionar Widget
        </Button>
      </div>

      {isAddWidgetOpen && (
        <>
          {/* Custom overlay without dark background */}
          <div className="fixed inset-0 z-40" onClick={() => setIsAddWidgetOpen(false)} />

          <div
            className={cn(
              "fixed top-0 right-0 h-screen bg-background z-50",
              sidebarCollapsed ? "w-[calc(100vw-4rem)]" : "w-[calc(100vw-16rem)]",
              "shadow-[rgba(0,0,0,0.2)_-8px_0px_32px_0px,rgba(0,0,0,0.1)_-4px_0px_16px_0px]",
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
              "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
              "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-100",
              "duration-300 ease-in-out overflow-hidden flex flex-col",
            )}
            style={{
              left: sidebarCollapsed ? "4rem" : "16rem",
            }}
          >
            {/* Header */}
            <div className="flex-shrink-0 p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Biblioteca de Widgets
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1.5">
                    Adicione widgets ao seu dashboard com um clique
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setIsAddWidgetOpen(false)} className="h-8 w-8 p-0">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary" className="bg-white/80 dark:bg-gray-900/80">
                  {widgets.filter((w) => w.visible).length} widgets ativos
                </Badge>
              </div>
            </div>

            {/* Widgets Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-2 gap-2">
                {widgetLibrary.map((widget) => {
                  const existingWidget = widgets.find((w) => w.type === widget.id)
                  const isVisible = existingWidget?.visible ?? false
                  const Icon = widget.icon

                  const colorClasses = {
                    blue: "from-blue-500/10 to-blue-600/5 border-blue-200 dark:border-blue-800",
                    green: "from-green-500/10 to-green-600/5 border-green-200 dark:border-green-800",
                    purple: "from-purple-500/10 to-purple-600/5 border-purple-200 dark:border-purple-800",
                    indigo: "from-indigo-500/10 to-indigo-600/5 border-indigo-200 dark:border-indigo-800",
                    orange: "from-orange-500/10 to-orange-600/5 border-orange-200 dark:border-orange-800",
                    emerald: "from-emerald-500/10 to-emerald-600/5 border-emerald-200 dark:border-emerald-800",
                    teal: "from-teal-500/10 to-teal-600/5 border-teal-200 dark:border-teal-800",
                    amber: "from-amber-500/10 to-amber-600/5 border-amber-200 dark:border-amber-800",
                    yellow: "from-yellow-500/10 to-yellow-600/5 border-yellow-200 dark:border-yellow-800",
                    sky: "from-sky-500/10 to-sky-600/5 border-sky-200 dark:border-sky-800",
                    red: "from-red-500/10 to-red-600/5 border-red-200 dark:border-red-800",
                    cyan: "from-cyan-500/10 to-cyan-600/5 border-cyan-200 dark:border-cyan-800",
                    slate: "from-slate-500/10 to-slate-600/5 border-slate-200 dark:border-slate-800",
                  }

                  const iconColorClasses = {
                    blue: "text-blue-600 dark:text-blue-400",
                    green: "text-green-600 dark:text-green-400",
                    purple: "text-purple-600 dark:text-purple-400",
                    indigo: "text-indigo-600 dark:text-indigo-400",
                    orange: "text-orange-600 dark:text-orange-400",
                    emerald: "text-emerald-600 dark:text-emerald-400",
                    teal: "text-teal-600 dark:text-teal-400",
                    amber: "text-amber-600 dark:text-amber-400",
                    yellow: "text-yellow-600 dark:text-yellow-400",
                    sky: "text-sky-600 dark:text-sky-400",
                    red: "text-red-600 dark:text-red-400",
                    cyan: "text-cyan-600 dark:text-cyan-400",
                    slate: "text-slate-600 dark:text-slate-400",
                  }

                  const bgClass = colorClasses[widget.color as keyof typeof colorClasses] || colorClasses.blue
                  const iconClass =
                    iconColorClasses[widget.color as keyof typeof iconColorClasses] || iconColorClasses.blue

                  return (
                    <div
                      key={widget.id}
                      className={cn(
                        "relative p-2.5 rounded-lg border-2 transition-all hover:shadow-md cursor-pointer group",
                        bgClass,
                        isVisible ? "shadow-sm" : "opacity-60",
                      )}
                      onClick={() => {
                        if (isVisible) {
                          handleRemoveWidget(widget.id)
                        } else {
                          handleAddWidget(widget.id)
                        }
                      }}
                    >
                      <div className="flex items-start gap-2">
                        <div
                          className={cn("flex-shrink-0 p-1.5 rounded-lg bg-white/50 dark:bg-gray-900/50", iconClass)}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm leading-tight mb-0.5">{widget.name}</h3>
                          <p className="text-xs text-muted-foreground leading-tight">{widget.description}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px] h-4 px-1.5",
                            isVisible
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
                          )}
                        >
                          {isVisible ? "Ativo" : "Inativo"}
                        </Badge>

                        <Button
                          variant={isVisible ? "ghost" : "default"}
                          size="sm"
                          className={cn(
                            "h-6 px-2 text-xs",
                            isVisible
                              ? "hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30"
                              : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700",
                          )}
                          onClick={(e) => {
                            e.stopPropagation()
                            if (isVisible) {
                              handleRemoveWidget(widget.id)
                            } else {
                              handleAddWidget(widget.id)
                            }
                          }}
                        >
                          {isVisible ? (
                            <>
                              <Minus className="h-3 w-3 mr-1" />
                              Remover
                            </>
                          ) : (
                            <>
                              <Plus className="h-3 w-3 mr-1" />
                              Adicionar
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 p-4 border-t bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20">
              <Button
                onClick={() => setShowSaveDashboardDialog(true)}
                className="w-full h-9 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <Save className="h-4 w-4 mr-2" />
                Salvar Dashboard
              </Button>
            </div>
          </div>
        </>
      )}

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Dashboard</DialogTitle>
            <DialogDescription>Altere o nome do dashboard</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-dashboard-name">Nome do Dashboard</Label>
              <Input
                id="edit-dashboard-name"
                value={editingDashboardName}
                onChange={(e) => setEditingDashboardName(e.target.value)}
                placeholder="Digite o nome do dashboard"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSaveEditedDashboard()
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEditedDashboard} disabled={!editingDashboardName.trim()}>
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Compartilhar Dashboard</DialogTitle>
            <DialogDescription>Escolha como deseja compartilhar este dashboard</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Global Sharing */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-blue-500" />
                  <Label htmlFor="share-global" className="font-medium">
                    Compartilhar Globalmente
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground">Disponível para todas as contas</p>
              </div>
              <Switch id="share-global" checked={shareGlobal} onCheckedChange={setShareGlobal} />
            </div>

            {/* Professional Sharing */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-green-500" />
                <Label className="font-medium">Compartilhar com Profissionais</Label>
              </div>

              <Input
                placeholder="Buscar profissional..."
                value={professionalSearch}
                onChange={(e) => setProfessionalSearch(e.target.value)}
                className="w-full"
              />

              <div className="border rounded-lg max-h-[200px] overflow-y-auto">
                {/* Mock professional list - replace with real data */}
                {[
                  { id: "prof-1", name: "Dr. João Silva", specialty: "Psicólogo" },
                  { id: "prof-2", name: "Dra. Maria Santos", specialty: "Nutricionista" },
                  { id: "prof-3", name: "Dr. Pedro Costa", specialty: "Personal Trainer" },
                  { id: "prof-4", name: "Dra. Ana Lima", specialty: "Terapeuta" },
                ]
                  .filter((prof) =>
                    professionalSearch ? prof.name.toLowerCase().includes(professionalSearch.toLowerCase()) : true,
                  )
                  .map((professional) => (
                    <div
                      key={professional.id}
                      className="flex items-center justify-between p-3 hover:bg-muted/50 border-b last:border-b-0"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">{professional.name}</p>
                        <p className="text-xs text-muted-foreground">{professional.specialty}</p>
                      </div>
                      <Switch
                        checked={shareWithProfessionals.includes(professional.id)}
                        onCheckedChange={() => handleToggleProfessional(professional.id)}
                      />
                    </div>
                  ))}
              </div>

              {shareWithProfessionals.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {shareWithProfessionals.length} profissional(is) selecionado(s)
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowShareDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveSharing}>Salvar Compartilhamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSaveDashboardDialog} onOpenChange={setShowSaveDashboardDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Salvar Dashboard</DialogTitle>
            <DialogDescription>Dê um nome ao seu dashboard personalizado</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dashboard-name">Nome do Dashboard</Label>
              <Input
                id="dashboard-name"
                value={newDashboardName}
                onChange={(e) => setNewDashboardName(e.target.value)}
                placeholder="Ex: Meu Dashboard Financeiro"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSaveDashboard()
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDashboardDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveDashboard} disabled={!newDashboardName.trim()}>
              Salvar Dashboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedMetric && (
        <MetricChartModal
          open={chartModalOpen}
          onOpenChange={setChartModalOpen}
          metricKey={selectedMetric.key}
          metricTitle={selectedMetric.title}
          chartType={selectedMetric.type}
          data={selectedMetric.data}
        />
      )}

      {/* Edit Dashboard Panel */}
      {isEditDashboardModalOpen && (() => {
        const modalGradientMap: Record<string, string> = {
          blue: "from-blue-500 to-blue-700",
          green: "from-green-500 to-green-700",
          purple: "from-purple-500 to-purple-700",
          indigo: "from-indigo-500 to-indigo-700",
          orange: "from-orange-500 to-rose-600",
          emerald: "from-emerald-500 to-teal-600",
          teal: "from-teal-500 to-teal-700",
          amber: "from-amber-500 to-orange-600",
          yellow: "from-yellow-400 to-amber-600",
          sky: "from-sky-500 to-blue-600",
          red: "from-red-500 to-rose-700",
          cyan: "from-cyan-500 to-sky-600",
          slate: "from-slate-500 to-slate-700",
        }
        const availableWidgets = widgetLibrary.filter(
          (lib) => !draftWidgets.some((dw) => dw.type === lib.id)
        )
        return (
          <>
            <div className="fixed top-0 bottom-0 right-0 z-40 bg-black/30 backdrop-blur-[1px]" style={{ left: "var(--sidebar-width)" }} onClick={() => { setIsEditDashboardModalOpen(false); setEditModalMode("none") }} />
            <div
              className="fixed top-0 bg-background z-50 flex flex-col shadow-2xl"
              style={{ left: "var(--sidebar-width)", right: 0, bottom: "var(--footer-height, 0px)" }}
            >
              {/* Header */}
              <div className="flex-shrink-0 px-6 py-3.5 text-white" style={{ background: "var(--app-brand-gradient)" }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 rounded-lg p-1.5">
                      <LayoutGrid className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold leading-tight">Editar Dashboard</h2>
                      <p className="text-white/70 text-[11px] mt-0.5">Arraste para reordenar · {draftWidgets.filter((w) => w.visible).length} widgets ativos</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Mode buttons */}
                    <button
                      onClick={() => setEditModalMode((m) => m === "remover" ? "none" : "remover")}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                        editModalMode === "remover"
                          ? "bg-red-500 text-white shadow-md"
                          : "bg-white/15 hover:bg-white/25 text-white/90"
                      )}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remover
                    </button>
                    <button
                      onClick={() => setEditModalMode((m) => m === "adicionar" ? "none" : "adicionar")}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                        editModalMode === "adicionar"
                          ? "bg-emerald-500 text-white shadow-md"
                          : "bg-white/15 hover:bg-white/25 text-white/90"
                      )}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Adicionar
                    </button>
                    <div className="w-px h-5 bg-white/25 mx-1" />
                    <button
                      onClick={() => { setIsEditDashboardModalOpen(false); setEditModalMode("none") }}
                      className="bg-white/15 hover:bg-white/30 rounded-lg p-1.5 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="flex flex-1 overflow-hidden">
                {/* Main widgets grid */}
                <div className={cn(
                  "flex-1 overflow-y-auto p-5 transition-all duration-300",
                  editModalMode === "adicionar" && "border-r border-border"
                )}>
                  {editModalMode === "remover" && (
                    <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
                      <Trash2 className="h-3.5 w-3.5 text-red-500 shrink-0" />
                      <p className="text-xs text-red-700 dark:text-red-300 font-medium">Modo remoção ativo — clique no &#128465; para remover um widget permanentemente do dashboard</p>
                    </div>
                  )}
                  {editModalMode === "adicionar" && (
                    <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      <Plus className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">Clique em um widget disponível à direita para adicioná-lo ao dashboard</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                    {draftWidgets.map((widget) => {
                      const libItem = widgetLibrary.find((l) => l.id === widget.type)
                      const WIcon = libItem?.icon ?? LayoutGrid
                      const color = libItem?.color ?? "blue"
                      const title = getWidgetTitle(widget.type, widget.customTitle)
                      const isDraggingThis = modalDraggedId === widget.id
                      const isDragOver = modalDragOverId === widget.id && modalDraggedId !== widget.id
                      const gradient = modalGradientMap[color] ?? modalGradientMap.blue

                      return (
                        <div
                          key={widget.id}
                          draggable={editModalMode !== "remover"}
                          onDragStart={() => setModalDraggedId(widget.id)}
                          onDragOver={(e) => { e.preventDefault(); setModalDragOverId(widget.id) }}
                          onDragLeave={() => setModalDragOverId(null)}
                          onDrop={() => {
                            if (!modalDraggedId || modalDraggedId === widget.id) { setModalDraggedId(null); setModalDragOverId(null); return }
                            const from = draftWidgets.findIndex((w) => w.id === modalDraggedId)
                            const to = draftWidgets.findIndex((w) => w.id === widget.id)
                            const next = [...draftWidgets]
                            const [moved] = next.splice(from, 1)
                            next.splice(to, 0, moved)
                            next.forEach((w, i) => { w.order = i })
                            setDraftWidgets(next)
                            setModalDraggedId(null)
                            setModalDragOverId(null)
                          }}
                          onDragEnd={() => { setModalDraggedId(null); setModalDragOverId(null) }}
                          className={cn(
                            "group relative rounded-xl border-2 overflow-hidden select-none transition-all duration-150",
                            editModalMode !== "remover" && "cursor-grab active:cursor-grabbing",
                            widget.visible
                              ? "border-transparent shadow-sm hover:shadow-md"
                              : "opacity-50",
                            isDraggingThis && "opacity-30 scale-95",
                            isDragOver && "ring-2 ring-blue-500 ring-offset-2 scale-[1.02]",
                          )}
                        >
                          {/* Top gradient strip */}
                          <div className={cn("h-1.5 w-full bg-gradient-to-r", gradient)} />

                          <div className="px-3 py-2.5 bg-card">
                            <div className="flex items-start gap-2.5">
                              {/* Icon */}
                              <div className={cn("shrink-0 rounded-lg p-2 bg-gradient-to-br text-white mt-0.5 shadow-sm", gradient)}>
                                <WIcon className="h-3.5 w-3.5" />
                              </div>
                              {/* Title + position */}
                              <div className="flex-1 min-w-0 pr-1">
                                <p className="text-xs font-semibold text-foreground leading-snug">{title}</p>
                                <p className="text-[10px] text-muted-foreground mt-1">Posição #{draftWidgets.findIndex((w) => w.id === widget.id) + 1}</p>
                              </div>
                            </div>

                            {/* Action row */}
                            <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-border/60">
                              {/* Visibility toggle */}
                              <button
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => { e.stopPropagation(); setDraftWidgets((prev) => prev.map((w) => w.id === widget.id ? { ...w, visible: !w.visible } : w)) }}
                                className={cn(
                                  "flex items-center gap-1 text-[10px] font-medium rounded-md px-2 py-1 transition-colors",
                                  widget.visible
                                    ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100"
                                    : "text-muted-foreground bg-muted/60 hover:bg-muted"
                                )}
                              >
                                {widget.visible ? <Activity className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                                {widget.visible ? "Visível" : "Oculto"}
                              </button>

                              {/* Remove button - only in remover mode */}
                              {editModalMode === "remover" && (
                                <button
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setDraftWidgets((prev) => prev.filter((w) => w.id !== widget.id))
                                  }}
                                  className="flex items-center gap-1 text-[10px] font-semibold text-red-600 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 rounded-md px-2 py-1 transition-colors"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  Remover
                                </button>
                              )}

                              {/* Drag hint */}
                              {editModalMode !== "remover" && (
                                <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground/70 transition-colors" />
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Right panel: available widgets to add */}
                {editModalMode === "adicionar" && (
                  <div className="w-80 shrink-0 overflow-y-auto bg-muted/20 border-l border-border flex flex-col">
                    <div className="sticky top-0 bg-muted/40 backdrop-blur-sm border-b border-border px-4 py-3">
                      <h3 className="text-sm font-semibold">Widgets disponíveis</h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{availableWidgets.length} para adicionar</p>
                    </div>
                    <div className="p-3 flex flex-col gap-2">
                      {availableWidgets.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <div className="bg-emerald-100 dark:bg-emerald-950/40 rounded-full p-3 mb-3">
                            <Check className="h-5 w-5 text-emerald-600" />
                          </div>
                          <p className="text-sm font-medium text-muted-foreground">Todos os widgets já foram adicionados!</p>
                        </div>
                      ) : availableWidgets.map((lib) => {
                        const WIcon = lib.icon
                        const gradient = modalGradientMap[lib.color ?? "blue"] ?? modalGradientMap.blue
                        return (
                          <button
                            key={lib.id}
                            onClick={() => {
                              const maxOrder = Math.max(...draftWidgets.map((w) => w.order), -1)
                              setDraftWidgets((prev) => [
                                ...prev,
                                { id: `${lib.id}-${Date.now()}`, type: lib.id as WidgetType, visible: true, order: maxOrder + 1 }
                              ])
                            }}
                            className="w-full text-left group flex items-start gap-3 p-3 rounded-xl border border-border bg-card hover:border-emerald-400 hover:shadow-sm transition-all duration-150"
                          >
                            <div className={cn("shrink-0 rounded-lg p-2 bg-gradient-to-br text-white shadow-sm", gradient)}>
                              <WIcon className="h-3.5 w-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-foreground leading-snug">{lib.name}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{lib.description}</p>
                            </div>
                            <div className="shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Plus className="h-4 w-4 text-emerald-500" />
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex-shrink-0 border-t bg-muted/20 px-6 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {draftWidgets.filter((w) => w.visible).length} visíveis · {draftWidgets.filter((w) => !w.visible).length} ocultos · {draftWidgets.length} total
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-8 px-4 text-sm" onClick={() => { setIsEditDashboardModalOpen(false); setEditModalMode("none") }}>
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 px-5 text-sm bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 border-0 text-white shadow-sm gap-1.5"
                    onClick={() => {
                      const updated = draftWidgets.map((w, i) => ({ ...w, order: i }))
                      setWidgets(updated)
                      localStorage.setItem("dashboard-widget-config", JSON.stringify(updated))
                      setIsEditDashboardModalOpen(false)
                      setEditModalMode("none")
                      toast({ title: "Dashboard salvo", description: "Widgets atualizados com sucesso." })
                    }}
                  >
                    <Save className="h-3.5 w-3.5" />
                    Salvar
                  </Button>
                </div>
              </div>
            </div>
          </>
        )
      })()}
    </div>
    // </CHANGE>
  )
}
