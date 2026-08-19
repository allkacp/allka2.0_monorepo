import { WIDGETS_BY_ROLE } from "@/lib/dashboard-widget-roles";
import { COMPANY_PRESETS, buildWidgets, DASHBOARD_STORAGE_KEY, CURRENT_DASHBOARD_KEY } from "@/lib/dashboard-presets-by-role";
import { DashboardShellFrame } from "@/features/dashboards/shared/dashboard-shell-frame";
import { useDashboardScrollCompact } from "@/hooks/useDashboardScrollCompact";
import type React from "react";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { PageLoader } from "@/components/ui/loading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  UserCheck,
  Building2,
  Briefcase,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  Info,
  CheckCircle2,
  AlertCircle,
  XCircle,
  DollarSign,
  Star,
  Award,
  Download,
  RotateCcw,
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
  Eye,
  ArrowUp,
  ArrowDown,
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
  Link2,
  History,
  Trophy,
  Save,
  Minus,
  Globe,
  Pencil,
  Share2,
  SlidersHorizontal,
  ImageDown,
  // Faltavam: <Database /> no selo "Manual" do widget e <Copy /> no painel
  // de compartilhamento. Renderizar qualquer um dos dois quebrava a tela com
  // "Database is not defined" — escondido pelo @ts-nocheck do arquivo.
  Database,
  Copy,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert"; // AlertTriangle removed to avoid redeclaration
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MetricChartModal } from "@/components/admin/metric-chart-modal";
import { toPng } from "html-to-image";
import { computeSafePixelRatio } from "@/features/dashboards/shared/dashboard-export";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"; // Import Accordion components
import { Input } from "@/components/ui/input"; // Added Input
import { Label } from "@/components/ui/label"; // Added Label
import { useSidebar } from "@/contexts/sidebar-context"; // Added import for sidebar context
import { useDashboard } from "@/hooks/useDashboard";
import { useEmpresa } from "@/contexts/empresa-context";
// Inline fallback — dev-mocks/ é gitignored e não está disponível no build de produção
const generateDashboardData = (_from?: any, _to?: any): any => ({
  revenue: {
    total: 270800,
    growth: 18.1,
    totalGrowth: 18.1,
    series: [],
    trendData: [180000, 205000, 215000, 230000, 248000, 270800],
    creditPlan: 114000,
    creditPlanGrowth: 18,
    recurring: 97600,
    recurringGrowth: 8,
    oneTime: 59200,
    oneTimeGrowth: 14,
  },
  activeProjects: {
    total: 127,
    growth: 5.2,
    series: [],
    agencies: 48,
    agenciesGrowth: 7,
    leadPremium: 63,
    leadPremiumGrowth: 9,
    nomades: 16,
    nomadesGrowth: 3,
    newTotal: 22,
    newAgencies: 9,
    newLeadPremium: 10,
    newNomades: 3,
  },
  creditPlans: {
    total: 114000,
    growth: 18,
    series: [],
    basic: { revenue: 38000, newContracts: 12, growth: 8 },
    partner: { revenue: 45000, newContracts: 9, growth: 22 },
    premium: { revenue: 31000, newContracts: 5, growth: 14 },
  },
  mrr: {
    total: 97600,
    growth: 8,
    series: [],
    newMrr: 12400,
    expansion: 5200,
    contraction: 1800,
    churnRevenue: 3100,
    baseMrr: 89600,
    netChange: 12700,
    trendData: [72000, 78000, 82000, 86000, 91000, 97600],
  },
  churn: {
    total: 0,
    growth: 0,
    series: [],
    inactiveAccounts: 23,
    inactiveGrowth: 4,
    agencies: 8,
    leadPremium: 5,
    nomades: 7,
    free: 3,
    cancelledProjects: 11,
    cancelledGrowth: 2,
    revenueChurn: 9300,
    revenueChurnRate: 3.2,
  },
  averageTicket: {
    total: 0,
    growth: 5,
    series: [],
    general: 1213,
    generalGrowth: 5,
    perProject: 2840,
    perProjectGrowth: 7,
    trendData: [980, 1050, 1100, 1180, 1210, 1213],
  },
  ltv: {
    total: 0,
    growth: 12,
    series: [],
    value: 8740,
    agencies: 14200,
    agenciesGrowth: 9,
    leadPremium: 11500,
    leadPremiumGrowth: 15,
    nomades: 3800,
    nomadesGrowth: 6,
    hist0to1k: 120,
    hist1kto5k: 280,
    hist5kto15k: 95,
    hist15kplus: 30,
  },
  accountsReceivable: {
    total: 187400,
    growth: 12,
    series: [],
    creditPlans: 98200,
    postPaid: 54700,
    others: 34500,
    received: 143600,
  },
  platformActivities: {
    activeAgencies: 34,
    avgSessionMinutes: 47,
    mau: 1240,
    dau: 312,
    sessions: 8740,
    actionsExecuted: 52300,
    trendData: [420, 510, 480, 630, 590, 710, 680],
  },
  nomads: {
    total: 148,
    growth: 6,
    active: 112,
    activeGrowth: 9,
    inactive: 36,
    inactiveChange: -3,
    newInPeriod: 14,
    churn: 5,
    retention30d: 82,
    trendData: [95, 100, 104, 108, 110, 112],
  },
  nomadsIndicators: {
    deliveryRate: 94.3,
    avgRating: 4.7,
    avgTimePerTask: 3.2,
    certified: 68,
    retention90d: 79,
  },
  nomadsRanking: { items: [] },
  agenciesRanking: [
    {
      id: "1",
      name: "Digital Works",
      rating: 4.9,
      projects: 23,
      contribution: "R$ 48k",
    },
    {
      id: "2",
      name: "Criativa Lab",
      rating: 4.8,
      projects: 18,
      contribution: "R$ 37k",
    },
    {
      id: "3",
      name: "Inovax Agency",
      rating: 4.7,
      projects: 15,
      contribution: "R$ 31k",
    },
    {
      id: "4",
      name: "PixelForge",
      rating: 4.6,
      projects: 12,
      contribution: "R$ 24k",
    },
    {
      id: "5",
      name: "BluePrint Co.",
      rating: 4.5,
      projects: 10,
      contribution: "R$ 19k",
    },
  ],
  statusOverview: {
    projects: {
      ongoing: 42,
      approved: 18,
      completed: 156,
      cancelled: 7,
      delayed: 11,
    },
    tasks: { contracted: 83, inProgress: 57, completed: 412, archived: 34 },
    leads: { new: 29, contacted: 15, proposal: 8, won: 12, lost: 5 },
  },
  tasks: {
    total: 552,
    items: [],
    completed: 412,
    completedGrowth: 8,
    inProgress: 57,
    inProgressGrowth: 4,
    contracted: 83,
    contractedGrowth: 12,
    cancelled: 14,
    cancelledChange: -2,
    slaCompliance: 91.4,
  },
  activeUsers: {
    total: 284,
    empresas: 92,
    empresasGrowth: 5,
    agencias: 61,
    agenciasGrowth: 7,
    nomades: 112,
    nomadesGrowth: 9,
    admins: 19,
    adminsGrowth: 3,
    series: [],
  },
  partnerProgram: {
    total: 38,
    items: [],
    invitesSent: 124,
    pending: 47,
    accepted: 38,
    diamond: 3,
    platinum: 6,
    gold: 11,
    silver: 12,
    bronze: 6,
    mrrGenerated: 22400,
  },
  cmv: {
    totalCosts: 87400,
    revenue: 270800,
    cmvPercent: 32.3,
    prevCmvPercent: 34.1,
    nomades: { value: 42800, percent: 49 },
    impostos: { value: 18200, percent: 21 },
    comissoes: { value: 14900, percent: 17 },
    outros: { value: 11500, percent: 13 },
    variation: { cmvPercent: -1.8, totalCosts: -2.4, revenue: 5.6 },
  },
  metrics: {},
  activity: [],
  alerts: [],
  performers: [],
  userDistribution: [],
  systemAlerts: [],
  adminProfiles: [],
  permissionMatrix: [],
  managementTools: [],
});
import { Switch } from "@/components/ui/switch"; // Added Switch
import { useToast } from "@/hooks/use-toast"; // Added useToast hook
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { apiClient, type DashboardShareLink } from "@/lib/api-client";
import { ShareLinksPanel } from "@/features/dashboards/shared/share-links-panel";
import { ShareSlugField, previewNormalizeSlug, suggestAvailableSlug } from "@/features/dashboards/shared/share-slug-field";
import { ShareCreateForm } from "@/features/dashboards/shared/share-create-form";
import { useDashboardExport } from "@/features/dashboards/shared/use-dashboard-export";
import { DashboardExportOverlay } from "@/features/dashboards/shared/dashboard-export-overlay";
import { useDashboardTemplate, TEMPLATE_DASHBOARD_ID } from "@/features/dashboards/shared/use-dashboard-template";
import { useDashboardWidgetEditor } from "@/features/dashboards/shared/dashboard-widget-editor";
import { useWidgetPeriodOverrides } from "@/features/dashboards/shared/use-dashboard-period";
import { DashboardWidgetEditorModeToggle, DashboardWidgetEditorBody, DashboardWidgetEditorFooter } from "@/features/dashboards/shared/dashboard-widget-editor-panel";
import { DashboardTemplateContentList } from "@/features/dashboards/shared/dashboard-template-content";

// Redeclaration of Alert interface removed due to linting issue.
// The original code already had an 'Alert' interface which was correct.
// If there was a need for a distinct interface, it would require renaming.

// Tipos, AlertsCenter e utilitários que as cinco telas de dashboard
// compartilham — ver features/dashboards/shared/dashboard-common.tsx.
import {
  type WidgetType,
  type WidgetSize,
  type Widget,
  type RevenueMetric,
  type RatingBreakdown,
  type MetricCard,
  type WidgetLibraryItem,
  type WidgetState,
  type SystemAlert,
  type ManualDataEntry,
  type ShareConfig,
  MANUAL_WIDGET_MAP,
  AlertsCenter,
  formatDate,
  mergeManualData,
  generatePublicToken,
  buildShareUrl,
} from "@/features/dashboards/shared/dashboard-common";

type MetricType =
  | "activeProjects"
  | "tasksToLaunch"
  | "tasksInProgress"
  | "approvalsPending"
  | "proposalsAwaitingClient"
  | "contractedValueMonth"
  | "estimatedMargin"
  | "pendingPayments";
const ROLE_WIDGET_IDS = new Set<string>(WIDGETS_BY_ROLE["COMPANY"]);

// Catálogo real de widgets da Company, pra reuso no editor de template
// (Admin > Dashboards Padrão) — mesma fonte, nunca uma segunda lista.
export const COMPANY_WIDGET_LIBRARY: WidgetLibraryItem[] = [
  {
    id: "metrics",
    name: "Cards de Métricas",
    description: "Métricas da agency logada",
    icon: LayoutGrid,
    color: "blue",
  },
  {
    id: "activeProjectsWidget",
    name: "Projetos da Agency",
    description: "Projetos ativos e em andamento da agency",
    icon: Briefcase,
    color: "indigo",
  },
  {
    id: "tasks",
    name: "Tarefas dos Projetos",
    description: "Tarefas contratadas, em execução e concluídas",
    icon: CheckSquare,
    color: "green",
  },
  {
    id: "statusOverview",
    name: "Aprovações Pendentes",
    description: "Status de projetos, tarefas e leads da agency",
    icon: LayoutGrid,
    color: "blue",
  },
  {
    id: "accountsReceivable",
    name: "Financeiro da Agency",
    description: "Valores a receber e saldos pendentes da agency",
    icon: DollarSign,
    color: "green",
  },
  {
    id: "creditPlans",
    name: "Catálogo / Produtos Contratados",
    description: "Planos e produtos contratados pela agency",
    icon: CreditCard,
    color: "slate",
  },
  {
    id: "activity",
    name: "Atividade Recente da Agency",
    description: "Últimas ações e eventos da agency",
    icon: Activity,
    color: "amber",
  },
  {
    id: "alerts",
    name: "Alertas da Agency",
    description: "Alertas relevantes para a agency logada",
    icon: Bell,
    color: "orange",
  },
  {
    id: "quickActions",
    name: "Ações Rápidas da Agency",
    description: "Atalhos para ações operacionais da agency",
    icon: Zap,
    color: "sky",
  },
  {
    id: "averageTicket",
    name: "Ticket Médio",
    description: "Ticket médio da operação da agency",
    icon: DollarSign,
    color: "teal",
  },
];

export default function AdminDashboardPage() {
  const { sidebarCollapsed } = useSidebar(); // Get sidebar collapse state
  const { toast } = useToast(); // Get toast function
  const {
    stats: apiStats,
    activities: apiActivities,
    loading: dashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard,
  } = useDashboard();

  const navigate = useNavigate();

  // Real company data from context
  const {
    projects: empresaProjects,
    tasks: empresaTasks,
    invoices: empresaInvoices,
  } = useEmpresa();

  const [globalPeriod, setGlobalPeriod] = useState<{
    type:
      | "today"
      | "yesterday"
      | "last_7_days"
      | "last_30_days"
      | "this_month"
      | "last_month"
      | "this_quarter"
      | "custom";
    from?: Date;
    to?: Date;
    label: string;
  }>({
    type: "last_30_days",
    label: "Últimos 30 dias",
  });

  const [isPeriodPickerOpen, setIsPeriodPickerOpen] = useState(false);
  const [customPeriodFrom, setCustomPeriodFrom] = useState<Date>();
  const [customPeriodTo, setCustomPeriodTo] = useState<Date>();

  const {
    widgetPeriods,
    setWidgetPeriods,
    getWidgetPeriod: sharedGetWidgetPeriod,
    setWidgetCustomPeriod,
  } = useWidgetPeriodOverrides("dashboard-widget-periods-company");
  const getWidgetPeriod = useCallback(
    (widgetId: string) => sharedGetWidgetPeriod(globalPeriod, widgetId),
    [sharedGetWidgetPeriod, globalPeriod],
  );

  useEffect(() => {
    const savedPeriod = localStorage.getItem("dashboard_global_period");
    if (savedPeriod) {
      try {
        const parsed = JSON.parse(savedPeriod);
        setGlobalPeriod({
          type: parsed.type,
          from: parsed.from ? new Date(parsed.from) : undefined,
          to: parsed.to ? new Date(parsed.to) : undefined,
          label: parsed.label,
        });
      } catch (e) {
        console.error("Failed to parse saved period:", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "dashboard_global_period",
      JSON.stringify({
        type: globalPeriod.type,
        from: globalPeriod.from?.toISOString(),
        to: globalPeriod.to?.toISOString(),
        label: globalPeriod.label,
      }),
    );
  }, [globalPeriod]);

  const getDateRangeFromPeriod = (
    periodType: typeof globalPeriod.type,
    customFrom?: Date,
    customTo?: Date,
  ): { from: Date; to: Date } => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (periodType) {
      case "today":
        return { from: today, to: today };
      case "yesterday":
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return { from: yesterday, to: yesterday };
      case "last_7_days":
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return { from: sevenDaysAgo, to: today };
      case "last_30_days":
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return { from: thirtyDaysAgo, to: today };
      case "this_month":
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return { from: firstDayOfMonth, to: today };
      case "last_month":
        const firstDayOfLastMonth = new Date(
          now.getFullYear(),
          now.getMonth() - 1,
          1,
        );
        const lastDayOfLastMonth = new Date(
          now.getFullYear(),
          now.getMonth(),
          0,
        );
        return { from: firstDayOfLastMonth, to: lastDayOfLastMonth };
      case "this_quarter":
        const quarter = Math.floor(now.getMonth() / 3);
        const firstDayOfQuarter = new Date(now.getFullYear(), quarter * 3, 1);
        return { from: firstDayOfQuarter, to: today };
      case "custom":
        return {
          from: customFrom || today,
          to: customTo || today,
        };
      default:
        return { from: thirtyDaysAgo, to: today };
    }
  };

  // ── Real company data scoped to a date range ────────────────────────────
  const getCompanyData = (from: Date, to: Date) => {
    const inR = (d?: string) => {
      if (!d) return false;
      const dt = new Date(d);
      return dt >= from && dt <= to;
    };
    const periodMs = to.getTime() - from.getTime();
    const prevFrom = new Date(from.getTime() - periodMs);
    const prevTo   = new Date(from.getTime() - 1);
    const inPrev = (d?: string) => {
      if (!d) return false;
      const dt = new Date(d);
      return dt >= prevFrom && dt <= prevTo;
    };
    const pct = (c: number, p: number) => p === 0 ? 0 : Math.round(((c - p) / p) * 100);
    const ACTIVE = ["briefing", "producao", "revisao"];

    // Projects
    const projCur = empresaProjects.filter(p => inR(p.startDate));
    const projPrev = empresaProjects.filter(p => inPrev(p.startDate));
    const activeCur = projCur.filter(p => ACTIVE.includes(p.status));
    const activePrev = projPrev.filter(p => ACTIVE.includes(p.status));
    const deliveredCur = projCur.filter(p => p.status === "entregue");

    // Tasks
    const tasksCur = empresaTasks.filter(t => inR(t.dueDate));
    const tasksPrev = empresaTasks.filter(t => inPrev(t.dueDate));
    const doneCur = tasksCur.filter(t => t.status === "done");
    const donePrev = tasksPrev.filter(t => t.status === "done");
    const inProgCur = tasksCur.filter(t => t.status === "in_progress");
    const inProgPrev = tasksPrev.filter(t => t.status === "in_progress");
    const availCur = tasksCur.filter(t => t.status === "available");
    const availPrev = tasksPrev.filter(t => t.status === "available");
    const cancelledCur = tasksCur.filter(t => t.status === "cancelled");

    // SLA: tasks done on time (deliveredAt <= dueDate)
    const doneWithDate = doneCur.filter(t => t.deliveredAt && t.dueDate);
    const onTime = doneWithDate.filter(t => new Date(t.deliveredAt!) <= new Date(t.dueDate));
    const sla = doneWithDate.length > 0 ? (onTime.length / doneWithDate.length) * 100 : 100;

    // Financeiro
    const paidCur = empresaInvoices.filter(i => i.status === "paid" && inR(i.paidAt || i.issuedAt));
    const paidPrev = empresaInvoices.filter(i => i.status === "paid" && inPrev(i.paidAt || i.issuedAt));
    const paidAmtCur = paidCur.reduce((s, i) => s + i.amount, 0);
    const paidAmtPrev = paidPrev.reduce((s, i) => s + i.amount, 0);
    const pendingCur = empresaInvoices.filter(i => ["pending","overdue"].includes(i.status) && inR(i.issuedAt));
    const pendingAmt = pendingCur.reduce((s, i) => s + i.amount, 0);
    const contractedAmt = projCur.reduce((s, p) => s + (p.value || 0), 0);
    const contractedPrev = projPrev.reduce((s, p) => s + (p.value || 0), 0);

    return {
      activeProjects: {
        total: activeCur.length,
        growth: pct(activeCur.length, activePrev.length),
        byStatus: {
          briefing: projCur.filter(p => p.status === "briefing").length,
          producao: projCur.filter(p => p.status === "producao").length,
          revisao: projCur.filter(p => p.status === "revisao").length,
          entregue: deliveredCur.length,
          cancelado: projCur.filter(p => p.status === "cancelado").length,
        },
        newTotal: projCur.length,
      },
      tasks: {
        completed:       doneCur.length,
        completedGrowth: pct(doneCur.length, donePrev.length),
        inProgress:      inProgCur.length,
        inProgressGrowth: pct(inProgCur.length, inProgPrev.length),
        contracted:      availCur.length,
        contractedGrowth: pct(availCur.length, availPrev.length),
        cancelled:       cancelledCur.length,
        cancelledChange: 0,
        slaCompliance:   sla,
      },
      revenue: {
        total:       contractedAmt,
        totalGrowth: pct(contractedAmt, contractedPrev),
        paid:        paidAmtCur,
        paidGrowth:  pct(paidAmtCur, paidAmtPrev),
        pending:     pendingAmt,
      },
    };
  };

  // ── Historical data (persisted in localStorage) ──────────────────────────
  const [historicalData, setHistoricalData] = useState<
    Record<string, ManualDataEntry>
  >(() => {
    try {
      const saved = localStorage.getItem("dashboard_historical_data");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Period-aware dashboard data — recomputed whenever the selected period changes
  const dashboardData = useMemo(() => {
    const { from, to } = getDateRangeFromPeriod(
      globalPeriod.type,
      globalPeriod.from,
      globalPeriod.to,
    );
    const base = generateDashboardData(from, to);
    // Merge manual data if the period covers exactly one calendar month
    if (
      from.getFullYear() === to.getFullYear() &&
      from.getMonth() === to.getMonth()
    ) {
      const key = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, "0")}`;
      const entry = historicalData[key];
      if (entry) return mergeManualData(base, entry);
    }
    return base;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalPeriod.type, globalPeriod.from, globalPeriod.to, historicalData]);

  // ── Dados reais escopados (POST /api/dashboard/widgets) ──────────────────
  // Mesma função/consulta usada pelo dashboard compartilhado desta empresa
  // (POST /api/share/data) — o backend resolve o escopo (company_id) a
  // partir de quem está logado, nunca aceita um id vindo daqui. `null` =
  // ainda carregando ou falhou (ver widgetDataError abaixo); nunca um
  // número fabricado tomando o lugar de um erro real.
  const [widgetData, setWidgetData] = useState<any>(null);
  const [widgetDataError, setWidgetDataError] = useState(false);

  useEffect(() => {
    if (typeof (apiClient as any).getDashboardWidgets !== "function") return;
    let cancelled = false;
    setWidgetDataError(false);
    const { from, to } = getDateRangeFromPeriod(globalPeriod.type, globalPeriod.from, globalPeriod.to);
    (apiClient as any)
      .getDashboardWidgets(from, to)
      .then((d: any) => { if (!cancelled) setWidgetData(d); })
      .catch((err: any) => {
        if (cancelled) return;
        console.error("[CompanyDashboard] Falha ao carregar /dashboard/widgets:", err);
        setWidgetDataError(true);
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalPeriod]);

  // Convenience aliases used throughout widget JSX — sobrepõe dado real por
  // cima do mock só nos campos que o backend de fato calcula pra este
  // escopo. Os demais permanecem mock nesta rodada (limitação documentada).
  const rv = widgetData ? { ...dashboardData.revenue, ...widgetData.revenue } : dashboardData.revenue;
  const apW = widgetData ? { ...dashboardData.activeProjects, ...widgetData.activeProjects } : dashboardData.activeProjects;
  const cpW = dashboardData.creditPlans;
  const mrrW = dashboardData.mrr;
  const churnW = dashboardData.churn;
  const atW = dashboardData.averageTicket;
  const ltvW = dashboardData.ltv;
  const paW = dashboardData.platformActivities;
  const nmW = dashboardData.nomads;
  const agRankW = dashboardData.agenciesRanking;
  const soW = dashboardData.statusOverview;
  const arW = widgetData ? { ...dashboardData.accountsReceivable, ...widgetData.accountsReceivable } : dashboardData.accountsReceivable;
  const tasksW = widgetData ? { ...dashboardData.tasks, ...widgetData.tasks } : dashboardData.tasks;
  const niW = dashboardData.nomadsIndicators;
  const auW = dashboardData.activeUsers;
  const ppW = dashboardData.partnerProgram;

  const periodOptions = [
    { type: "today" as const, label: "Hoje" },
    { type: "yesterday" as const, label: "Ontem" },
    { type: "last_7_days" as const, label: "Últimos 7 dias" },
    { type: "last_30_days" as const, label: "Últimos 30 dias" },
    { type: "this_month" as const, label: "Este mês" },
    { type: "last_month" as const, label: "Mês passado" },
    { type: "this_quarter" as const, label: "Trimestre atual" },
    { type: "custom" as const, label: "Intervalo personalizado" },
  ];

  const handlePeriodChange = (
    periodType: typeof globalPeriod.type,
    label: string,
  ) => {
    if (periodType === "custom") {
      setIsPeriodPickerOpen(true);
    } else {
      const { from, to } = getDateRangeFromPeriod(periodType);
      setGlobalPeriod({
        type: periodType,
        from,
        to,
        label,
      });
      setIsPeriodPickerOpen(false);
    }
  };

  const applyCustomPeriod = () => {
    if (customPeriodFrom && customPeriodTo) {
      setGlobalPeriod({
        type: "custom",
        from: customPeriodFrom,
        to: customPeriodTo,
        label: `${customPeriodFrom.toLocaleDateString("pt-BR")} - ${customPeriodTo.toLocaleDateString("pt-BR")}`,
      });
      setIsPeriodPickerOpen(false);
    }
  };

  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "custom">(
    "30d",
  );
  const [customDateRange, setCustomDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });
  const [isCustomDialogOpen, setIsCustomDialogOpen] = useState(false);
  const [isCustomizeMode, setIsCustomizeMode] = useState(false);
  const [metricCards, setMetricCards] = useState<
    Array<{ id: MetricType; order: number; visible: boolean }>
  >([
    { id: "activeProjects", order: 0, visible: true },
    { id: "tasksToLaunch", order: 1, visible: true },
    { id: "approvalsPending", order: 2, visible: true },
    { id: "contractedValueMonth", order: 3, visible: true },
    { id: "pendingPayments", order: 4, visible: true },
    { id: "tasksInProgress", order: 5, visible: false },
    { id: "proposalsAwaitingClient", order: 6, visible: false },
    { id: "estimatedMargin", order: 7, visible: false },
  ]);
  const [draggedMetric, setDraggedMetric] = useState<MetricType | null>(null);
  const [dragOverMetric, setDragOverMetric] = useState<MetricType | null>(null);
  const [isEditingMetrics, setIsEditingMetrics] = useState(false);
  const [showWidgetLibrary, setShowWidgetLibrary] = useState(false); // Changed from isWidgetLibraryOpen
  const [editingWidget, setEditingWidget] = useState<WidgetType | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [viewMode, setViewMode] = useState<"conclude" | "default">("default");
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [layoutMode, setLayoutMode] = useState<"padrao" | "compacto">("padrao");
  const { isHeaderCompact, dashboardScrollRef } = useDashboardScrollCompact();
  const [saveDashboardOpen, setSaveDashboardOpen] = useState(false); // State for the save dashboard dialog
  const [isEditDashboardModalOpen, setIsEditDashboardModalOpen] =
    useState(false);
  const [isEditPanelMounted, setIsEditPanelMounted] = useState(false);
  const [isEditPanelClosing, setIsEditPanelClosing] = useState(false);
  // Núcleo do editor de widgets — compartilhado com o editor de template
  // (ver features/dashboards/shared/dashboard-widget-editor.ts).
  const editor = useDashboardWidgetEditor([]);
  const [showCancelConfirmDialog, setShowCancelConfirmDialog] = useState(false);
  const [showSaveConfirmDialog, setShowSaveConfirmDialog] = useState(false);
  const [showDeleteDashboardDialog, setShowDeleteDashboardDialog] =
    useState(false);
  const [deletingDashboardId, setDeletingDashboardId] = useState<string | null>(
    null,
  );
  const [editHeaderName, setEditHeaderName] = useState("");
  const [isEditingHeaderName, setIsEditingHeaderName] = useState(false);
  const [isNewDashboardMode, setIsNewDashboardMode] = useState(false);

  const [chartModalOpen, setChartModalOpen] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<{
    key: string;
    title: string;
    type: "line" | "bar";
    data: Array<{ date: string; value: number }>;
  } | null>(null);

  const openChartModal = (
    key: string,
    title: string,
    type: "line" | "bar",
    data: Array<{ date: string; value: number }>,
  ) => {
    setSelectedMetric({ key, title, type, data });
    setChartModalOpen(true);
  };

  const generateTimeSeriesData = (baseValue: number, days = 30) => {
    const data = [];
    const today = new Date();
    for (let i = days; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const variance = Math.random() * 0.2 - 0.1; // -10% a +10%
      const value = Math.round(baseValue * (1 + variance));
      data.push({
        date: date.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
        }),
        value,
      });
    }
    return data;
  };

  const toggleCustomizeMode = () => {
    if (!isCustomizeMode && isViewingTemplateDefault) {
      if (
        confirm(
          "Este é o dashboard padrão definido pelo Admin e não pode ser editado diretamente. Deseja criar uma visão pessoal a partir dele para personalizar?",
        )
      ) {
        createPersonalViewFromTemplate();
        setIsCustomizeMode(true);
      }
      return;
    }
    setIsCustomizeMode(!isCustomizeMode);
  };


  // Function to export a widget as PNG
  const exportWidgetToPng = async (widgetId: string, widgetTitle: string) => {
    const widgetElement = document.querySelector(
      `[data-widget-id="${widgetId}"]`,
    ) as HTMLElement;
    if (!widgetElement) {
      toast({
        title: "Erro ao exportar",
        description: "Widget não encontrado",
        variant: "destructive",
      });
      return;
    }

    try {
      // Hide export buttons temporarily
      const exportButtons = widgetElement.querySelectorAll(
        "[data-export-button]",
      );
      exportButtons.forEach((btn) => {
        (btn as HTMLElement).style.display = "none";
      });

      const dataUrl = await toPng(widgetElement as HTMLElement, {
        quality: 1,
        pixelRatio: computeSafePixelRatio(
          widgetElement.getBoundingClientRect().width,
          widgetElement.getBoundingClientRect().height,
        ),
        backgroundColor: "#f1f5f9",
        cacheBust: true,
      });

      // Show export buttons again
      exportButtons.forEach((btn) => {
        (btn as HTMLElement).style.display = "";
      });

      const link = document.createElement("a");
      const dateStr = format(new Date(), "yyyy-MM-dd-HHmm");
      const sanitizedTitle = widgetTitle.replace(/[^a-zA-Z0-9]/g, "_");
      link.download = `widget_${sanitizedTitle}_${dateStr}.png`;
      link.href = dataUrl;
      link.click();

      toast({
        title: "Widget exportado",
        description: `O widget "${widgetTitle}" foi exportado como PNG`,
      });
    } catch (error) {
      console.error("Error exporting widget:", error);
      toast({
        title: "Erro ao exportar",
        description: "Não foi possível exportar o widget",
        variant: "destructive",
      });
    }
  };

  const exportWidgetToPdf = async (widgetId: string, widgetTitle: string) => {
    const widgetElement = document.querySelector(
      `[data-widget-id="${widgetId}"]`,
    ) as HTMLElement;
    if (!widgetElement) {
      toast({
        title: "Erro ao exportar",
        description: "Widget não encontrado",
        variant: "destructive",
      });
      return;
    }
    try {
      const exportButtons = widgetElement.querySelectorAll(
        "[data-export-button],[data-share-button]",
      );
      exportButtons.forEach((btn) => {
        (btn as HTMLElement).style.display = "none";
      });

      const dataUrl = await toPng(widgetElement, {
        quality: 1,
        pixelRatio: computeSafePixelRatio(
          widgetElement.getBoundingClientRect().width,
          widgetElement.getBoundingClientRect().height,
        ),
        backgroundColor: "#f1f5f9",
        cacheBust: true,
      });

      exportButtons.forEach((btn) => {
        (btn as HTMLElement).style.display = "";
      });

      const img = new Image();
      img.src = dataUrl;
      await new Promise((res) => {
        img.onload = res;
      });

      const ratio = img.height / img.width;
      const pdfW = 210; // A4 mm
      const pdfH = Math.min(pdfW * ratio, 297);
      // jsPDF (385 KB) so e necessario ao exportar; carregado sob demanda
      const { default: jsPDF } = await import("jspdf");
      const pdf = new jsPDF({
        orientation: pdfH > pdfW ? "portrait" : "landscape",
        unit: "mm",
        format: "a4",
      });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW - 16;
      const imgH = imgW * ratio;
      pdf.addImage(dataUrl, "PNG", 8, 8, imgW, Math.min(imgH, pageH - 16));

      const dateStr = format(new Date(), "yyyy-MM-dd-HHmm");
      const sanitizedTitle = widgetTitle.replace(/[^a-zA-Z0-9]/g, "_");
      pdf.save(`widget_${sanitizedTitle}_${dateStr}.pdf`);

      toast({
        title: "Widget exportado",
        description: `O widget "${widgetTitle}" foi exportado como PDF`,
      });
    } catch (error) {
      console.error("Error exporting widget to PDF:", error);
      toast({
        title: "Erro ao exportar",
        description: "Não foi possível exportar como PDF",
        variant: "destructive",
      });
    }
  };

  // Reusable export button component for widget headers
  const WidgetExportButton = ({
    widgetId,
    widgetTitle,
  }: {
    widgetId: string;
    widgetTitle: string;
  }) => (
    <div className="absolute top-3 right-3 z-10 flex items-center rounded-lg border border-border/60 bg-background shadow-sm overflow-visible">
      {manualAffectedWidgets.has(widgetId) && (
        <span className="px-2 text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-r border-border/60 h-7 flex items-center gap-1 rounded-l-lg">
          <Database className="h-3 w-3" />
          Manual
        </span>
      )}
      <button
        onClick={() => setDetailsWidgetId(widgetId)}
        className="flex items-center justify-center h-7 w-7 cursor-pointer text-muted-foreground hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-900/40 active:scale-90 transition-all duration-150 rounded-l-lg"
        title="Ver detalhes do widget"
      >
        <Eye className="h-3.5 w-3.5" />
      </button>
      <div className="w-px h-4 bg-border/60 shrink-0" />
      <button
        onClick={() => openWidgetShareDialog(widgetId, widgetTitle)}
        className="flex items-center justify-center h-7 w-7 cursor-pointer text-muted-foreground hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/40 active:scale-90 transition-all duration-150"
        title="Compartilhar widget"
      >
        <Share2 className="h-3.5 w-3.5" />
      </button>
      <div className="w-px h-4 bg-border/60 shrink-0" />
      <div className="relative">
        <button
          onClick={() =>
            setShowExportDropdown(
              showExportDropdown === widgetId ? null : widgetId,
            )
          }
          className="flex items-center justify-center h-7 w-7 cursor-pointer text-muted-foreground hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/40 active:scale-90 transition-all duration-150 rounded-r-lg"
          title="Exportar widget"
          data-export-button
        >
          <Download className="h-3.5 w-3.5" />
        </button>
        {showExportDropdown === widgetId && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowExportDropdown(null)}
            />
            <div className="absolute right-0 top-full mt-1 z-50 min-w-[120px] rounded-lg border border-border/60 bg-background shadow-lg overflow-hidden">
              <button
                onClick={() => {
                  exportWidgetToPng(widgetId, widgetTitle);
                  setShowExportDropdown(null);
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs cursor-pointer hover:bg-violet-100 dark:hover:bg-violet-900/40 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
              >
                <ImageDown className="h-3.5 w-3.5 text-muted-foreground" />
                Exportar PNG
              </button>
              <div className="h-px bg-border/50" />
              <button
                onClick={() => {
                  exportWidgetToPdf(widgetId, widgetTitle);
                  setShowExportDropdown(null);
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs cursor-pointer hover:bg-violet-100 dark:hover:bg-violet-900/40 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
              >
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                Exportar PDF
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  const WidgetPeriodSelector = ({ widgetId }: { widgetId: string }) => {
    const widgetPeriod = widgetPeriods.find((wp) => wp.widgetId === widgetId);
    const isCustom = widgetPeriod?.mode === "custom";
    const displayLabel = isCustom ? widgetPeriod.customPeriod?.label : globalPeriod.label;

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 px-2 text-xs gap-1.5 transition-all",
              isCustom
                ? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/50"
                : "bg-primary/8 text-primary border border-primary/20 hover:bg-primary/15",
            )}
          >
            {isCustom ? (
              <Calendar className="h-3 w-3" />
            ) : (
              <Globe className="h-3 w-3" />
            )}
            <span className="hidden sm:inline font-medium">
              {isCustom ? "Período:" : "Global ·"}
            </span>
            {displayLabel}
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <div className="px-3 py-2 border-b bg-muted/30">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Período deste widget
            </p>
          </div>
          {/* Global option */}
          <div className="p-1">
            <DropdownMenuItem
              onClick={() => setWidgetCustomPeriod(widgetId, "global")}
              className={cn(
                "text-xs rounded-md flex-col items-start gap-0.5 py-2",
                !isCustom && "bg-primary/8 text-primary",
              )}
            >
              <div className="flex items-center gap-2 w-full">
                <Globe className={cn("h-3.5 w-3.5 shrink-0", !isCustom ? "text-primary" : "text-muted-foreground")} />
                <span className="font-medium">Seguir período global</span>
                {!isCustom && <Check className="h-3 w-3 ml-auto text-primary" />}
              </div>
              <span className="text-[10px] text-muted-foreground pl-5 font-normal">
                Usa automaticamente: {globalPeriod.label}
              </span>
            </DropdownMenuItem>
          </div>
          <div className="px-3 py-1.5 border-t border-b bg-muted/20">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Ou escolha um período específico
            </p>
          </div>
          <div className="p-1">
            {([
              { key: "today", label: "Hoje" },
              { key: "7days", label: "Últimos 7 dias" },
              { key: "30days", label: "Últimos 30 dias" },
              { key: "thisMonth", label: "Este mês" },
              { key: "lastMonth", label: "Mês passado" },
              { key: "90days", label: "Últimos 90 dias" },
              { key: "365days", label: "Último ano" },
            ] as const).map(({ key, label }) => {
              const isActive = widgetPeriod?.mode === "custom" && widgetPeriod?.customPeriod?.label === label;
              return (
                <DropdownMenuItem
                  key={key}
                  onClick={() => setWidgetCustomPeriod(widgetId, key)}
                  className={cn("text-xs rounded-md", isActive && "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400")}
                >
                  <Check className={cn("mr-2 h-3 w-3", isActive ? "opacity-100" : "opacity-0")} />
                  {label}
                  {isActive && <span className="ml-auto text-[10px] opacity-60">ativo</span>}
                </DropdownMenuItem>
              );
            })}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  // Define WidgetConfig type, as the original `Widget` type had `size` property that is no longer relevant for the state
  type WidgetConfig = Omit<Widget, "size">;

  const [widgets, setWidgets] = useState<WidgetState[]>(() =>
    ([
      { id: "metrics", type: "metrics", visible: true, order: 0 },
      { id: "ltv", type: "ltv", visible: true, order: 1 }, // Added LTV widget visible by default
      { id: "mrr", type: "mrr", visible: true, order: 2 },
      { id: "churn", type: "churn", visible: true, order: 3 },
      { id: "revenue", type: "revenue", visible: true, order: 4 },
      { id: "averageTicket", type: "averageTicket", visible: true, order: 5 },
      {
        id: "activeProjectsWidget",
        type: "activeProjectsWidget",
        visible: true,
        order: 6,
      },
      { id: "creditPlans", type: "creditPlans", visible: true, order: 7 },
      {
        id: "accountsReceivable",
        type: "accountsReceivable",
        visible: true,
        order: 8,
      },
      { id: "activity", type: "activity", visible: true, order: 9 },
      { id: "alerts", type: "alerts", visible: true, order: 10 },
      { id: "performers", type: "performers", visible: true, order: 11 },
      { id: "quickActions", type: "quickActions", visible: true, order: 12 },
      {
        id: "userDistribution",
        type: "userDistribution",
        visible: true,
        order: 13,
      },
      { id: "activeUsers", type: "activeUsers", visible: true, order: 14 },
      { id: "systemAlerts", type: "systemAlerts", visible: true, order: 15 },
      { id: "adminProfiles", type: "adminProfiles", visible: true, order: 16 },
      {
        id: "permissionMatrix",
        type: "permissionMatrix",
        visible: true,
        order: 17,
      },
      {
        id: "managementTools",
        type: "managementTools",
        visible: true,
        order: 18,
      },
      { id: "cmv", type: "cmv", visible: true, order: 19 }, // Added CMV widget
      {
        id: "nomadsIndicators",
        type: "nomadsIndicators",
        visible: true,
        order: 20,
      }, // Added nomadsIndicators widget
      { id: "tasks", type: "tasks", visible: true, order: 21 }, // Added tasks widget
      // Added platformActivities widget to default state
      {
        id: "platformActivities",
        type: "platformActivities",
        visible: true,
        order: 22,
      },
      {
        id: "nomades",
        type: "nomades",
        visible: true,
        order: 23, // This order seems duplicated, might need adjustment
      },
      // Added nomadsRanking and agenciesRanking widgets to default state
      { id: "nomadsRanking", type: "nomadsRanking", visible: true, order: 24 },
      {
        id: "agenciesRanking",
        type: "agenciesRanking",
        visible: true,
        order: 25,
      },
      {
        id: "statusOverview",
        type: "statusOverview",
        visible: true,
        order: 26,
      },
      {
        id: "partnerProgram",
        type: "partnerProgram",
        visible: true,
        order: 27,
      },
    ] as WidgetState[]).filter((w) => ROLE_WIDGET_IDS.has(w.type)),
  );

  const [draggedWidget, setDraggedWidget] = useState<string | null>(null); // Use string for widget id
  const [dragOverWidget, setDragOverWidget] = useState<string | null>(null); // Use string for widget id

  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [selectedWidgetsForExport, setSelectedWidgetsForExport] = useState<
    WidgetType[]
  >([]);
  const [widgetSize, setWidgetSize] = useState<WidgetSize>("standard");

  interface SavedDashboard {
    id: string;
    name: string;
    widgets: WidgetState[];
    createdAt: string;
    updatedAt?: string;
    isGlobal?: boolean;
    isDefault?: boolean;
    sharedWith?: string[];
    createdBy?: string;
  }

  const [savedDashboards, setSavedDashboards] = useState<SavedDashboard[]>([]);
  const [currentDashboardId, setCurrentDashboardId] = useState<string | null>(
    null,
  );
  // Exportação — ponto único reutilizado pelas 6 telas (ver
  // features/dashboards/shared/use-dashboard-export.ts).
  const exportDashboardTitle = savedDashboards.find((d) => d.id === currentDashboardId)?.name ?? "Company";
  const { state: exportState, exportAs: handleExportAs, reset: resetExportState } = useDashboardExport(
    "dashboard-export-area",
    exportDashboardTitle,
  );
  const isExporting = exportState.stage !== "idle" && exportState.stage !== "success" && exportState.stage !== "error";
  const { template: profileTemplate, visibleContents: templateContents, dismissContent: dismissTemplateContent, reload: reloadTemplate } =
    useDashboardTemplate("COMPANY");
  const appliedTemplateRef = useRef<string | null>(null);
  const [showSaveDashboardDialog, setShowSaveDashboardDialog] = useState(false);
  const [newDashboardName, setNewDashboardName] = useState("");
  const [showDashboardSelector, setShowDashboardSelector] = useState(false);

  const [editingDashboardId, setEditingDashboardId] = useState<string | null>(
    null,
  );
  const [editingDashboardName, setEditingDashboardName] = useState("");
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [sharingDashboardId, setSharingDashboardId] = useState<string | null>(
    null,
  );
  const [shareGlobal, setShareGlobal] = useState(false);
  const [shareWithProfessionals, setShareWithProfessionals] = useState<
    string[]
  >([]);
  const [professionalSearch, setProfessionalSearch] = useState("");

  // ── Public share dialog state ──────────────────────────────────────────────
  const [showPublicShareDialog, setShowPublicShareDialog] = useState(false);
  const [shareTarget, setShareTarget] = useState<ShareConfig["target"] | null>(
    null,
  );
  const [sharePermission, setSharePermission] = useState<"view" | "comment">(
    "view",
  );
  const [sharePinEnabled, setSharePinEnabled] = useState(false);
  const [sharePin, setSharePin] = useState("");
  const [shareExpiryEnabled, setShareExpiryEnabled] = useState(false);
  const [shareExpiry, setShareExpiry] = useState("");
  const [generatedShareLink, setGeneratedShareLink] = useState("");
  const [shareActiveTab, setShareActiveTab] = useState("permission");
  const [shareAllowFilterChanges, setShareAllowFilterChanges] = useState(false);
  const [shareGenerating, setShareGenerating] = useState(false);
  const [shareRefreshSignal, setShareRefreshSignal] = useState(0);
  const [shareSlug, setShareSlug] = useState("");
  // Link recém-criado, repassado pro ShareLinksPanel pra aparecer na lista
  // na hora — não depende só do refetch por refreshSignal (ver comentário
  // em share-links-panel.tsx sobre a causa da regressão original).
  const [sharePendingLink, setSharePendingLink] = useState<DashboardShareLink | null>(null);
  // ──────────────────────────────────────────────────────────────────────────

  // ── Historical modal states ──────────────────────────────────────────────────
  const [showExportDropdown, setShowExportDropdown] = useState<string | null>(
    null,
  );
  const [detailsWidgetId, setDetailsWidgetId] = useState<string | null>(null);
  const [showHistoricalModal, setShowHistoricalModal] = useState(false);
  const [histModalKey, setHistModalKey] = useState<string>(""); // "YYYY-MM"
  const [histFormData, setHistFormData] = useState<Partial<ManualDataEntry>>(
    {},
  );
  const setHistField = (key: keyof ManualDataEntry, value: string) => {
    const num = value === "" ? undefined : Number(value);
    setHistFormData((prev) => ({ ...prev, [key]: num }));
  };

  // Active manual entry for current period
  const activeManualKey = useMemo(() => {
    const { from, to } = getDateRangeFromPeriod(
      globalPeriod.type,
      globalPeriod.from,
      globalPeriod.to,
    );
    if (
      from.getFullYear() === to.getFullYear() &&
      from.getMonth() === to.getMonth()
    ) {
      return `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, "0")}`;
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalPeriod.type, globalPeriod.from, globalPeriod.to]);

  const activeManualEntry = activeManualKey
    ? (historicalData[activeManualKey] ?? null)
    : null;

  const manualAffectedWidgets = useMemo<Set<string>>(() => {
    if (!activeManualEntry) return new Set();
    const s = new Set<string>();
    (Object.keys(activeManualEntry) as Array<keyof ManualDataEntry>).forEach(
      (k) => {
        if (activeManualEntry[k] != null && MANUAL_WIDGET_MAP[k])
          s.add(MANUAL_WIDGET_MAP[k]);
      },
    );
    return s;
  }, [activeManualEntry]);

  // Historical handlers
  const MONTH_NAMES = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ];

  const openHistoricalModal = (key?: string) => {
    const k =
      key ??
      (() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      })();
    setHistModalKey(k);
    setHistFormData(historicalData[k] ?? {});
    setShowHistoricalModal(true);
  };

  const saveHistoricalEntry = () => {
    const updated = {
      ...historicalData,
      [histModalKey]: histFormData as ManualDataEntry,
    };
    setHistoricalData(updated);
    localStorage.setItem("dashboard_historical_data", JSON.stringify(updated));
    setShowHistoricalModal(false);
    const [y, m] = histModalKey.split("-").map(Number);
    toast({
      title: "Dados históricos salvos",
      description: `Dados de ${MONTH_NAMES[m - 1]}/${y} registrados com sucesso.`,
    });
  };

  const deleteHistoricalEntry = (key: string) => {
    const updated = { ...historicalData };
    delete updated[key];
    setHistoricalData(updated);
    localStorage.setItem("dashboard_historical_data", JSON.stringify(updated));
  };
  const handleOpenShareDialog = (dashboardId: string) => {
    setSharingDashboardId(dashboardId);
    const dashboard = savedDashboards.find((d) => d.id === dashboardId);
    if (dashboard) {
      setShareGlobal(dashboard.isGlobal ?? false);
      setShareWithProfessionals(dashboard.sharedWith ?? []);
    }
    setShowShareDialog(true);
  };

  // ── Public share handlers ─────────────────────────────────────────────────
  const openWidgetShareDialog = (widgetId: string, widgetTitle: string) => {
    setShareTarget({ id: widgetId, title: widgetTitle, type: "widget" });
    setSharePermission("view");
    setSharePinEnabled(false);
    setSharePin("");
    setShareExpiryEnabled(false);
    setShareExpiry("");
    setShareSlug(previewNormalizeSlug(widgetTitle));
    setGeneratedShareLink("");
    setSharePendingLink(null);
    setShareActiveTab("permission");
    setShareAllowFilterChanges(false);
    setShowPublicShareDialog(true);
  };

  const openDashboardPublicShare = () => {
    const currentDb = savedDashboards.find((d) => d.id === currentDashboardId);
    const title = currentDb?.name ?? "Dashboard";
    setShareTarget({
      id: currentDashboardId ?? "default",
      title,
      type: "dashboard",
    });
    setSharePermission("view");
    setSharePinEnabled(false);
    setSharePin("");
    setShareExpiryEnabled(false);
    setShareExpiry("");
    setShareSlug(previewNormalizeSlug(title));
    setGeneratedShareLink("");
    setSharePendingLink(null);
    setShareActiveTab("permission");
    setShareAllowFilterChanges(false);
    setShowPublicShareDialog(true);
  };

  const handleGenerateShareLink = async () => {
    if (!shareTarget) return;
    const config: ShareConfig = {
      target: shareTarget,
      permission: sharePermission,
      pin: sharePinEnabled && sharePin.length === 4 ? sharePin : undefined,
      expiry:
        shareExpiryEnabled && shareExpiry ? new Date(shareExpiry) : undefined,
      slug: shareSlug.trim() || undefined,
    };
    setShareGenerating(true);
    try {
      const { token, slug, link } = await generatePublicToken(config, {
        profile: "company",
        period: {
          type: globalPeriod.type,
          from: globalPeriod.from?.toISOString(),
          to: globalPeriod.to?.toISOString(),
          label: globalPeriod.label,
        },
        allowFilterChanges: shareAllowFilterChanges,
      });
      setGeneratedShareLink(buildShareUrl({ token, slug }));
      setSharePendingLink(link);
      setShareRefreshSignal((n) => n + 1);
      // O slug que acabou de ser usado não está mais livre — sugere o
      // próximo disponível pro caso de o usuário gerar outro link em
      // seguida sem fechar o painel.
      suggestAvailableSlug(shareTarget.title).then(setShareSlug);
    } catch (err: any) {
      toast({
        title: "Não foi possível gerar o link",
        description: err?.message ?? "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      setShareGenerating(false);
    }
  };

  const handleCopyShareLink = () => {
    if (!generatedShareLink) return;
    navigator.clipboard.writeText(generatedShareLink);
    toast({
      title: "Link copiado!",
      description: "O link foi copiado para a área de transferência.",
    });
  };
  // ──────────────────────────────────────────────────────────────────────────

  const handleSaveEditedDashboard = () => {
    if (!editingDashboardId || !editingDashboardName.trim()) return;

    const updatedDashboards = savedDashboards.map((d) =>
      d.id === editingDashboardId
        ? {
            ...d,
            name: editingDashboardName.trim(),
            updatedAt: new Date().toISOString(),
          }
        : d,
    );
    setSavedDashboards(updatedDashboards);
    localStorage.setItem(DASHBOARD_STORAGE_KEY["COMPANY"], JSON.stringify(updatedDashboards));
    setShowEditDialog(false);
    setEditingDashboardId(null);
    setEditingDashboardName("");
  };

  const handleCloseEditPanel = () => {
    setIsEditPanelClosing(true);
    setTimeout(() => {
      setIsEditPanelClosing(false);
      setIsEditDashboardModalOpen(false);
      editor.setMode("none");
      setIsNewDashboardMode(false);
      setIsEditingHeaderName(false);
    }, 420);
  };

  const handleSaveHeaderName = () => {
    if (!editHeaderName.trim()) {
      setIsEditingHeaderName(false);
      return;
    }
    if (currentDashboardId) {
      const updatedDashboards = savedDashboards.map((d) =>
        d.id === currentDashboardId
          ? {
              ...d,
              name: editHeaderName.trim(),
              updatedAt: new Date().toISOString(),
            }
          : d,
      );
      setSavedDashboards(updatedDashboards);
      localStorage.setItem(
        DASHBOARD_STORAGE_KEY["COMPANY"],
        JSON.stringify(updatedDashboards),
      );
    }
    setIsEditingHeaderName(false);
  };

  const handleConfirmSave = () => {
    const updated = editor.finalize();
    if (isNewDashboardMode) {
      const name = editHeaderName.trim() || "Novo Dashboard";
      const newDashboard: SavedDashboard = {
        id: `dashboard-${Date.now()}`,
        name,
        widgets: updated,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isGlobal: false,
        isDefault: false,
        sharedWith: [],
        createdBy: "current-user",
      };
      const updatedDashboards = [...savedDashboards, newDashboard];
      setSavedDashboards(updatedDashboards);
      localStorage.setItem(
        DASHBOARD_STORAGE_KEY["COMPANY"],
        JSON.stringify(updatedDashboards),
      );
      localStorage.setItem(CURRENT_DASHBOARD_KEY["COMPANY"], newDashboard.id);
      setCurrentDashboardId(newDashboard.id);
      setWidgets(updated);
      localStorage.setItem("dashboard-widget-config-company", JSON.stringify(updated));
      setShowSaveConfirmDialog(false);
      handleCloseEditPanel();
      toast({
        title: "Dashboard criado",
        description: `"${name}" foi criado com sucesso.`,
      });
    } else {
      setWidgets(updated);
      localStorage.setItem("dashboard-widget-config-company", JSON.stringify(updated));
      if (currentDashboardId) {
        const updatedDashboards = savedDashboards.map((d) =>
          d.id === currentDashboardId
            ? {
                ...d,
                name: editHeaderName.trim() || d.name,
                widgets: updated,
                updatedAt: new Date().toISOString(),
              }
            : d,
        );
        setSavedDashboards(updatedDashboards);
        localStorage.setItem(
          DASHBOARD_STORAGE_KEY["COMPANY"],
          JSON.stringify(updatedDashboards),
        );
      }
      setShowSaveConfirmDialog(false);
      handleCloseEditPanel();
      toast({
        title: "Dashboard salvo",
        description: "Widgets atualizados com sucesso.",
      });
    }
  };

  const handleConfirmCancel = () => {
    setShowCancelConfirmDialog(false);
    handleCloseEditPanel();
  };
  // End Undeclared Variables Fixes

  useEffect(() => {
    const savedConfig = localStorage.getItem("dashboard-widget-config-company");
    if (savedConfig) {
      try {
        // Ensure the loaded config matches the WidgetState type
        const parsedConfig: WidgetState[] = JSON.parse(savedConfig);
        setWidgets(
          parsedConfig
            .map((w) => ({
              ...w,
              id:
                w.id || `${w.type}-${Math.random().toString(36).substr(2, 9)}`,
            }))
            .filter((w) => ROLE_WIDGET_IDS.has(w.type)),
        );
      } catch (e) {
        console.error("Failed to parse saved widget config:", e);
      }
    }

    const savedMetrics = localStorage.getItem("dashboard-metric-cards-company");
    if (savedMetrics) {
      try {
        const parsed = JSON.parse(savedMetrics);
        // Migration: if old default had all 8 visible, reset to new 5-card default
        const wasOldDefault =
          parsed.length === 8 && parsed.every((m: any) => m.visible === true);
        if (!wasOldDefault) {
          setMetricCards(parsed);
        } else {
          localStorage.removeItem("dashboard-metric-cards-company");
        }
      } catch (e) {
        console.error("Failed to parse saved metric cards:", e);
      }
    }

    const savedSize = localStorage.getItem("dashboard-widget-size-company");
    if (savedSize) {
      setWidgetSize(savedSize as WidgetSize);
    }

    // Load widget period overrides from localStorage
    const savedWidgetPeriods = localStorage.getItem("dashboard-widget-periods-company");
    if (savedWidgetPeriods) {
      try {
        setWidgetPeriods(JSON.parse(savedWidgetPeriods));
      } catch (e) {
        console.error("Failed to parse saved widget periods:", e);
      }
    }

    // Load saved dashboards — role-scoped presets (Company)
    const STORAGE_KEY = DASHBOARD_STORAGE_KEY["COMPANY"];
    const CURRENT_KEY = CURRENT_DASHBOARD_KEY["COMPANY"];
    const builtinPresets: SavedDashboard[] = COMPANY_PRESETS.map((p) => ({
      id: p.id,
      name: p.name,
      isDefault: p.isDefault,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "system",
      sharedWith: [],
      widgets: buildWidgets(p.widgetTypes),
    })) as SavedDashboard[];

    const savedDashboardsData = localStorage.getItem(STORAGE_KEY);
    let parsedDashboards: SavedDashboard[] = savedDashboardsData
      ? JSON.parse(savedDashboardsData)
      : [];
    // Merge: add any missing presets (by id) at the front
    const missingPresets = builtinPresets.filter(
      (p) => !parsedDashboards.some((d) => d.id === p.id),
    );
    if (missingPresets.length > 0) {
      parsedDashboards = [...missingPresets, ...parsedDashboards];
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(parsedDashboards),
      );
    }
    setSavedDashboards(parsedDashboards);
    // Fallback só usado quando não há template configurado — ver efeito
    // logo abaixo, que sobrescreve isso sempre que houver um template.
    const storedId = localStorage.getItem(CURRENT_KEY);
    const currentDashboard =
      parsedDashboards.find((d) => d.id === storedId) ??
      parsedDashboards.find((d) => d.isDefault) ??
      parsedDashboards[0];
    if (currentDashboard) {
      setCurrentDashboardId(currentDashboard.id);
      setWidgets(currentDashboard.widgets);
    }
  }, []);

  // Item 9 (revisado) — o template padrão do Admin é a visão inicial de
  // toda entrada, sempre (não uma semente aplicada uma vez).
  useEffect(() => {
    if (!profileTemplate) return;
    const marker = `${profileTemplate.id}:${profileTemplate.updated_at}`;
    if (appliedTemplateRef.current === marker) return;
    appliedTemplateRef.current = marker;
    setCurrentDashboardId(TEMPLATE_DASHBOARD_ID);
    setWidgets(profileTemplate.widgets as WidgetState[]);
  }, [profileTemplate]);

  const isViewingTemplateDefault = currentDashboardId === TEMPLATE_DASHBOARD_ID;

  function createPersonalViewFromTemplate() {
    if (!profileTemplate) return;
    const id = `personal-${Date.now()}`;
    const widgetsCopy = (profileTemplate.widgets as WidgetState[]).map((w) => ({ ...w }));
    const newDashboard: SavedDashboard = {
      id,
      name: "Minha visão",
      widgets: widgetsCopy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDefault: false,
      sharedWith: [],
    } as SavedDashboard;
    setSavedDashboards((prev) => {
      const next = [...prev, newDashboard];
      localStorage.setItem(DASHBOARD_STORAGE_KEY["COMPANY"], JSON.stringify(next));
      return next;
    });
    localStorage.setItem(CURRENT_DASHBOARD_KEY["COMPANY"], id);
    setCurrentDashboardId(id);
    setWidgets(widgetsCopy);
    return id;
  }

  useEffect(() => {
    if (isEditDashboardModalOpen) {
      const id = requestAnimationFrame(() => setIsEditPanelMounted(true));
      return () => cancelAnimationFrame(id);
    } else {
      setIsEditPanelMounted(false);
    }
  }, [isEditDashboardModalOpen]);

  useEffect(() => {
    // Guard: skip saving until the initial load effect has populated state.
    // currentDashboardId is null on the initial render and is only set
    // after the load effect runs, so this prevents the save effect from
    // overwriting localStorage with empty/default state on mount.
    if (!currentDashboardId) return;
    if (currentDashboardId === TEMPLATE_DASHBOARD_ID) return;

    // Ensure consistent structure when saving
    localStorage.setItem(
      "dashboard-widget-config-company",
      JSON.stringify(
        widgets.map((w) => ({
          id: w.id,
          type: w.type,
          visible: w.visible,
          order: w.order,
          customTitle: w.customTitle,
        })),
      ),
    );
    localStorage.setItem("dashboard-metric-cards-company", JSON.stringify(metricCards));
    localStorage.setItem("dashboard-widget-size-company", widgetSize);
    // Save widget period overrides to localStorage
    localStorage.setItem(
      "dashboard-widget-periods-company",
      JSON.stringify(widgetPeriods),
    );

    // Save dashboards to localStorage whenever they change
    localStorage.setItem(DASHBOARD_STORAGE_KEY["COMPANY"], JSON.stringify(savedDashboards));
    localStorage.setItem(CURRENT_DASHBOARD_KEY["COMPANY"], currentDashboardId);
  }, [
    widgets,
    metricCards,
    widgetSize,
    widgetPeriods,
    savedDashboards,
    currentDashboardId,
  ]);

  useEffect(() => {
    // intentionally empty - mounted
  }, []);

  const widgetLibrary: WidgetLibraryItem[] = COMPANY_WIDGET_LIBRARY;

  // ── Company real metrics computed from empresa context + globalPeriod ────
  const metrics = useMemo(() => {
    const { from, to } = getDateRangeFromPeriod(
      globalPeriod.type,
      globalPeriod.from,
      globalPeriod.to,
    );
    // Previous period (same length, shifted back)
    const periodMs = to.getTime() - from.getTime();
    const prevFrom = new Date(from.getTime() - periodMs);
    const prevTo = new Date(from.getTime() - 1);

    const inRange = (dateStr: string | undefined, f: Date, t: Date) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return d >= f && d <= t;
    };
    const pct = (cur: number, prev: number) =>
      prev === 0 ? 0 : Math.round(((cur - prev) / prev) * 100);

    // Active projects in period (by startDate, active status)
    const ACTIVE = ["briefing", "producao", "revisao"];
    const activeCur = empresaProjects.filter(
      (p) => ACTIVE.includes(p.status) && inRange(p.startDate, from, to)
    ).length;
    const activePrev = empresaProjects.filter(
      (p) => ACTIVE.includes(p.status) && inRange(p.startDate, prevFrom, prevTo)
    ).length;

    // Tasks available in period (by dueDate)
    const availCur = empresaTasks.filter(
      (t) => t.status === "available" && inRange(t.dueDate, from, to)
    ).length;
    const availPrev = empresaTasks.filter(
      (t) => t.status === "available" && inRange(t.dueDate, prevFrom, prevTo)
    ).length;

    // Tasks in progress/review in period
    const inProgCur = empresaTasks.filter(
      (t) => ["in_progress", "review"].includes(t.status) && inRange(t.dueDate, from, to)
    ).length;
    const inProgPrev = empresaTasks.filter(
      (t) => ["in_progress", "review"].includes(t.status) && inRange(t.dueDate, prevFrom, prevTo)
    ).length;

    // Tasks in review (aprovações pendentes)
    const reviewCur = empresaTasks.filter(
      (t) => t.status === "review" && inRange(t.dueDate, from, to)
    ).length;

    // Contracted value: sum of project budgets started in period
    const contractedCur = empresaProjects
      .filter((p) => inRange(p.startDate, from, to))
      .reduce((s, p) => s + (p.value || 0), 0);
    const contractedPrev = empresaProjects
      .filter((p) => inRange(p.startDate, prevFrom, prevTo))
      .reduce((s, p) => s + (p.value || 0), 0);

    // Pending payments: invoices pending/overdue issued in period
    const pendingCur = empresaInvoices
      .filter((i) => ["pending", "overdue"].includes(i.status) && inRange(i.issuedAt, from, to))
      .reduce((s, i) => s + i.amount, 0);
    const pendingPrev = empresaInvoices
      .filter((i) => ["pending", "overdue"].includes(i.status) && inRange(i.issuedAt, prevFrom, prevTo))
      .reduce((s, i) => s + i.amount, 0);

    const fmtK = (v: number) => v >= 1000 ? `R$ ${(v / 1000).toFixed(1)}k` : `R$ ${v.toLocaleString("pt-BR")}`;

    // "Aguardando o cliente" é a fila do segundo nível de aprovação: a
    // agência já aprovou e a tarefa espera o aceite desta empresa. O contexto
    // expõe o status real em `rawStatus` (ver contexts/empresa-context.tsx).
    const aguardandoClienteCur = empresaTasks.filter(
      (t) =>
        t.rawStatus === "APROVACAO_PENDENTE_CLIENTE" &&
        inRange(t.dueDate, from, to),
    ).length;
    const aguardandoClientePrev = empresaTasks.filter(
      (t) =>
        t.rawStatus === "APROVACAO_PENDENTE_CLIENTE" &&
        inRange(t.dueDate, prevFrom, prevTo),
    ).length;

    return {
      activeProjects: {
        value: activeCur.toLocaleString("pt-BR"),
        change: pct(activeCur, activePrev),
        trend: (activeCur >= activePrev ? "up" : "down") as "up" | "down",
      },
      tasksToLaunch: {
        value: availCur.toLocaleString("pt-BR"),
        change: pct(availCur, availPrev),
        trend: (availCur >= availPrev ? "up" : "down") as "up" | "down",
      },
      tasksInProgress: {
        value: inProgCur.toLocaleString("pt-BR"),
        change: pct(inProgCur, inProgPrev),
        trend: (inProgCur >= inProgPrev ? "up" : "down") as "up" | "down",
      },
      approvalsPending: {
        value: reviewCur.toLocaleString("pt-BR"),
        change: 0,
        trend: "up" as const,
      },
      proposalsAwaitingClient: {
        value: aguardandoClienteCur.toLocaleString("pt-BR"),
        change: pct(aguardandoClienteCur, aguardandoClientePrev),
        trend: (aguardandoClienteCur <= aguardandoClientePrev
          ? "up"
          : "down") as "up" | "down",
      },
      contractedValueMonth: {
        value: fmtK(contractedCur),
        change: pct(contractedCur, contractedPrev),
        trend: (contractedCur >= contractedPrev ? "up" : "down") as "up" | "down",
      },
      estimatedMargin: {
        value: "—",
        change: 0,
        trend: "up" as const,
        /**
         * Sem origem por definição: margem é a diferença entre o que a
         * plataforma cobra e o que paga aos nômades — dado do Admin. Esta é
         * a visão de quem contrata, que não tem esse custo. O card fica com
         * a explicação em vez de um número inventado.
         */
        indisponivel: "Indicador do Admin; a empresa não tem o custo interno",
      },
      pendingPayments: {
        value: fmtK(pendingCur),
        change: pct(pendingCur, pendingPrev),
        trend: (pendingCur <= pendingPrev ? "up" : "down") as "up" | "down",
      },
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaProjects, empresaTasks, empresaInvoices, globalPeriod]);

  // Recent activities from API (fallback to empty)
  // Recent activities (company-scoped mock)
  const recentActivities =
    apiActivities.length > 0
      ? apiActivities.map((a, i) => ({
          id: i + 1,
          type: a.type || "info",
          title: a.title,
          description: a.subtitle || "",
          time: a.date ? new Date(a.date).toLocaleDateString("pt-BR") : "",
          icon:
            a.type === "project"
              ? Briefcase
              : a.type === "user"
                ? Users
                : a.type === "client"
                  ? Building2
                  : Activity,
          color: "text-primary",
          bgColor: "bg-primary/10",
        }))
      : [
          {
            id: 1,
            type: "project_created",
            title: "Projeto criado",
            description: 'Projeto "Redesign Website" foi iniciado com sucesso',
            time: "20 minutos atrás",
            icon: Briefcase,
            color: "text-info",
            bgColor: "bg-info/10",
          },
          {
            id: 2,
            type: "proposal_sent",
            title: "Proposta enviada",
            description:
              'Proposta para "Campanha de Mídia" aguarda sua aprovação',
            time: "1 hora atrás",
            icon: FileText,
            color: "text-primary",
            bgColor: "bg-primary/10",
          },
          {
            id: 3,
            type: "delivery_available",
            title: "Entrega disponível",
            description:
              'Nova entrega do projeto "Blog Corporativo" pronta para revisão',
            time: "3 horas atrás",
            icon: CheckCircle2,
            color: "text-success",
            bgColor: "bg-success/10",
          },
          {
            id: 4,
            type: "payment_approved",
            title: "Pagamento aprovado",
            description: "Fatura #198 de R$ 4.800 foi confirmada",
            time: "6 horas atrás",
            icon: DollarSign,
            color: "text-chart-4",
            bgColor: "bg-chart-4/10",
          },
        ];

  // Company-scoped alerts
  const systemAlerts = [
    {
      id: 1,
      type: "warning",
      title: "Proposta aguardando aprovação",
      description:
        'Proposta "Campanha de Mídia" está aguardando sua resposta há 2 dias',
      priority: "high",
    },
    {
      id: 2,
      type: "warning",
      title: "Entrega aguardando aprovação",
      description:
        'Projeto "Blog Corporativo" tem 1 entrega pronta para revisão',
      priority: "high",
    },
    {
      id: 3,
      type: "info",
      title: "Pagamento pendente",
      description: "Fatura #201 de R$ 2.600 vence em 3 dias",
      priority: "medium",
    },
    {
      id: 4,
      type: "info",
      title: "Tarefa aguardando feedback",
      description: 'Tarefa "Revisão de layout" aguarda seu feedback há 1 dia',
      priority: "medium",
    },
  ];

  // Period-aware top performers
  const topPerformers = dashboardData.performers;

  // Period-aware user distribution
  const usersByType = dashboardData.userDistribution;

  const systemAlertsData = [
    {
      message: "Sistema de pagamentos funcionando normalmente",
      type: "success",
      time: "Agora",
    },
    {
      message: "Pico de tráfego detectado (+45%)",
      type: "info",
      time: "5 min atrás",
    },
    {
      message: "Backup automático concluído",
      type: "success",
      time: "1h atrás",
    },
    {
      message: "2 disputas pendentes de resolução",
      type: "warning",
      time: "3h atrás",
    },
  ];

  const adminProfilesData = [
    {
      name: "Master Admin",
      permissions: "Acesso Total",
      users: 1,
      color:
        "from-destructive/10 to-destructive/20 dark:from-destructive/5 dark:to-destructive/10",
      description: "Controle completo da plataforma",
    },
    {
      name: "Gestão Financeira",
      permissions: "Financeiro",
      users: 3,
      color:
        "from-success/10 to-success/20 dark:from-success/5 dark:to-success/10",
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
      color:
        "from-primary/10 to-primary/20 dark:from-primary/5 dark:to-primary/10",
      description: "Projetos, nômades e qualidade",
    },
  ];



  const getAlertIcon = (type: string) => {
    switch (type) {
      case "error":
        return <XCircle className="h-4 w-4" />;
      case "warning":
        return <AlertCircle className="h-4 w-4" />;
      case "success":
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case "error":
        return "text-destructive-foreground bg-destructive/10 border-destructive";
      case "warning":
        return "text-warning-foreground bg-warning-muted border-warning";
      case "success":
        return "text-success-foreground bg-success-muted border-success";
      default:
        return "text-info-foreground bg-info-muted border-info";
    }
  };

  const getBadgeColor = (badge: string) => {
    switch (badge) {
      case "gold":
        return "bg-warning/20 text-warning-foreground dark:bg-warning/10 dark:text-warning";
      case "silver":
        return "bg-muted text-muted-foreground dark:bg-muted/30 dark:text-muted-foreground";
      case "bronze":
        return "bg-orange-500/20 text-orange-500 dark:bg-orange-500/10 dark:text-orange-500";
      default:
        return "bg-muted text-muted-foreground dark:bg-muted/30 dark:text-muted-foreground";
    }
  };

  const handleCustomDateRange = () => {
    if (customDateRange.from && customDateRange.to) {
      setTimeRange("custom");
      setIsCustomDialogOpen(false);
    }
  };

  const convertOklchToRgb = (element: HTMLElement) => {
    const computedStyle = window.getComputedStyle(element);
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
    ];

    properties.forEach((prop) => {
      const value = computedStyle.getPropertyValue(prop);
      if (value && value.includes("oklch")) {
        // Get computed RGB value by creating temporary element
        const tempDiv = document.createElement("div");
        tempDiv.style[prop as any] = value;
        document.body.appendChild(tempDiv);
        const computedValue = window
          .getComputedStyle(tempDiv)
          .getPropertyValue(prop);
        document.body.removeChild(tempDiv);
        element.style[prop as any] = computedValue;
      }
    });

    // Recursively process all child elements
    Array.from(element.children).forEach((child) => {
      convertOklchToRgb(child as HTMLElement);
    });
  };

  // handleExportAs agora vem de useDashboardExport — ver
  // features/dashboards/shared/use-dashboard-export.ts.

  const handleMetricDragStart = (e: React.DragEvent, metricId: MetricType) => {
    if (!isEditingMetrics) return;

    e.stopPropagation();
    setDraggedMetric(metricId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", metricId);
  };

  const handleMetricDragOver = (
    e: React.DragEvent,
    targetMetricId: MetricType,
  ) => {
    if (!isEditingMetrics || !draggedMetric) return;

    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    setDragOverMetric(targetMetricId);
  };

  const handleMetricDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverMetric(null);
  };

  const handleMetricDrop = (e: React.DragEvent, targetMetricId: MetricType) => {
    e.preventDefault();
    e.stopPropagation();

    if (
      !draggedMetric ||
      draggedMetric === targetMetricId ||
      !isEditingMetrics
    ) {
      setDraggedMetric(null);
      setDragOverMetric(null);
      return;
    }

    const draggedIndex = metricCards.findIndex((m) => m.id === draggedMetric);
    const targetIndex = metricCards.findIndex((m) => m.id === targetMetricId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedMetric(null);
      setDragOverMetric(null);
      return;
    }

    const newMetrics = [...metricCards];
    const [removed] = newMetrics.splice(draggedIndex, 1);
    newMetrics.splice(targetIndex, 0, removed);

    newMetrics.forEach((metric, index) => {
      metric.order = index;
    });

    setMetricCards(newMetrics);
    setDraggedMetric(null);
    setDragOverMetric(null);
  };

  const handleMetricDragEnd = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedMetric(null);
    setDragOverMetric(null);
  };

  const handleDragStart = (e: React.DragEvent, widgetId: string) => {
    setDraggedWidget(widgetId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", widgetId);
  };

  const handleDragOver = (e: React.DragEvent, targetWidgetId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverWidget(targetWidgetId);
  };

  const handleDragLeave = () => {
    setDragOverWidget(null);
  };

  const handleDrop = (e: React.DragEvent, targetWidgetId: string) => {
    e.preventDefault();

    if (!draggedWidget || draggedWidget === targetWidgetId) {
      setDraggedWidget(null);
      setDragOverWidget(null);
      return;
    }

    const draggedIndex = widgets.findIndex((w) => w.id === draggedWidget);
    const targetIndex = widgets.findIndex((w) => w.id === targetWidgetId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedWidget(null);
      setDragOverWidget(null);
      return;
    }

    const newWidgets = [...widgets];
    const [removed] = newWidgets.splice(draggedIndex, 1);
    newWidgets.splice(targetIndex, 0, removed);

    // Update order values
    newWidgets.forEach((widget, index) => {
      widget.order = index;
    });

    setWidgets(newWidgets);
    setDraggedWidget(null);
    setDragOverWidget(null);
  };

  const handleDragEnd = () => {
    setDraggedWidget(null);
    setDragOverWidget(null);
  };

  const toggleWidgetVisibility = (widgetId: string) => {
    setWidgets((prev) =>
      prev.map((widget) =>
        widget.id === widgetId
          ? { ...widget, visible: !widget.visible }
          : widget,
      ),
    );
  };

  const toggleMetricVisibility = (metricId: MetricType) => {
    setMetricCards((prev) =>
      prev.map((card) =>
        card.id === metricId ? { ...card, visible: !card.visible } : card,
      ),
    );
  };

  const addWidget = (widgetType: WidgetType) => {
    const existingWidget = widgets.find((w) => w.type === widgetType);
    if (existingWidget) {
      // If widget exists but is hidden, make it visible
      setWidgets((prev) =>
        prev.map((widget) =>
          widget.type === widgetType ? { ...widget, visible: true } : widget,
        ),
      );
    } else {
      // Add new widget at the end
      const maxOrder = Math.max(...widgets.map((w) => w.order), -1);
      setWidgets((prev) => [
        ...prev,
        {
          id: `${widgetType}-${Math.random().toString(36).substr(2, 9)}`, // Generate unique ID
          type: widgetType,
          order: maxOrder + 1,
          visible: true,
          customTitle: "", // Default empty custom title
        },
      ]);
    }
  };

  // Helper function to add widget in the library
  const handleAddWidget = (widgetType: WidgetType) => {
    addWidget(widgetType);
    // Modal stays open now - only closes when user clicks X or outside
  };

  const removeWidget = (widgetId: string) => {
    setWidgets((prev) => prev.filter((widget) => widget.id !== widgetId));
  };

  // Added handleRemoveWidget for specific widget removal cases
  const handleRemoveWidget = (widgetId: string) => {
    setWidgets((prev) => prev.filter((widget) => widget.id !== widgetId));
  };

  const handleEditWidget = (widgetId: string) => {
    const widget = widgets.find((w) => w.id === widgetId);
    setEditTitle(widget?.customTitle || "");
    setEditingWidget(widget?.type || null); // Use widget.type for editingWidget state
  };

  const saveWidgetTitle = () => {
    if (editingWidget) {
      setWidgets((prev) =>
        prev.map((widget) =>
          widget.type === editingWidget
            ? { ...widget, customTitle: editTitle }
            : widget,
        ),
      );
      setEditingWidget(null);
      setEditTitle("");
    }
  };

  // Helper function to get widget titles, now uses a record for direct mapping
  const getWidgetTitle = (
    widgetType: WidgetType,
    customTitle?: string,
  ): string => {
    if (customTitle) return customTitle;
    // Partial: cada tela so titula os widgets do proprio papel; o acesso
    // abaixo cai em `|| widgetType` para qualquer outro.
    const titles: Partial<Record<WidgetType, string>> = {
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
      partnerProgram: "Programa Partner",
    };
    return titles[widgetType] || widgetType;
  };

  const toggleWidgetForExport = (widgetId: WidgetType) => {
    setSelectedWidgetsForExport((prev) =>
      prev.includes(widgetId)
        ? prev.filter((id) => id !== widgetId)
        : [...prev, widgetId],
    );
  };

  const selectAllWidgetsForExport = () => {
    const visibleWidgetIds = widgets
      .filter((w) => w.visible)
      .map((w) => w.type);
    setSelectedWidgetsForExport(visibleWidgetIds);
  };

  // Helper to get drag over classes for conditional styling
  const getDragOverClasses = (widgetId: string) => {
    return dragOverWidget === widgetId && draggedWidget !== widgetId
      ? "border-2 border-success shadow-lg shadow-success/50 scale-105 rounded-lg"
      : "";
  };

  // Define mappings for icons and names for metric cards
  const metricIcons: Record<MetricType, React.ElementType> = {
    activeProjects: Briefcase,
    tasksToLaunch: CheckSquare,
    tasksInProgress: Activity,
    approvalsPending: Clock,
    proposalsAwaitingClient: FileText,
    contractedValueMonth: DollarSign,
    estimatedMargin: Calculator,
    pendingPayments: DollarSign,
  };

  const metricNames: Record<MetricType, string> = {
    activeProjects: "Projetos ativos",
    tasksToLaunch: "Tarefas para lançamento",
    tasksInProgress: "Tarefas em execução",
    approvalsPending: "Aprovações pendentes",
    proposalsAwaitingClient: "Propostas aguardando cliente",
    contractedValueMonth: "Valor contratado no mês",
    estimatedMargin: "Comissão / margem estimada",
    pendingPayments: "Pagamentos pendentes",
  };

  const renderMetricCard = (
    metricType: MetricType,
    metricsSource?: typeof metrics,
  ) => {
    const metricsData = metricsSource ?? metrics;
    const metric = metricsData[metricType];
    if (!metric || !metricCards.find((m) => m.id === metricType)?.visible)
      return null;

    const Icon = metricIcons[metricType];
    const metricName = metricNames[metricType];

    const cardPadding = widgetSize === "compact" ? "p-3" : "p-5";
    const titleSize = widgetSize === "compact" ? "text-xs" : "text-sm";
    const valueSize = widgetSize === "compact" ? "text-2xl" : "text-3xl";
    const iconSize = widgetSize === "compact" ? "h-5 w-5" : "h-6 w-6";
    const iconPadding = widgetSize === "compact" ? "p-3" : "p-3";
    const badgeSize = widgetSize === "compact" ? "text-[10px]" : "text-xs";
    const spacingY = widgetSize === "compact" ? "space-y-1" : "space-y-2";

    const isEditing = isEditingMetrics;
    const isDragging = draggedMetric === metricType;
    const isDragOver = dragOverMetric === metricType;

    let bgColor: string;
    let gradientFrom: string;
    let cardBgGradient: string;
    let borderClass: string;
    let shadowClass: string;

    switch (metricType) {
      case "activeProjects":
        bgColor = "from-blue-400 to-blue-600";
        gradientFrom = "from-blue-600/10";
        cardBgGradient = "from-blue-500 to-indigo-600";
        borderClass = "border-2 border-blue-300/70 dark:border-blue-300/50";
        shadowClass = "";
        break;
      case "tasksToLaunch":
        bgColor = "from-violet-400 to-violet-600";
        gradientFrom = "from-violet-600/10";
        cardBgGradient = "from-violet-500 to-purple-700";
        borderClass = "border-2 border-violet-300/70 dark:border-violet-300/50";
        shadowClass = "";
        break;
      case "tasksInProgress":
        bgColor = "from-teal-400 to-teal-600";
        gradientFrom = "from-teal-600/10";
        cardBgGradient = "from-teal-500 to-cyan-600";
        borderClass = "border-2 border-teal-300/70 dark:border-teal-300/50";
        shadowClass = "";
        break;
      case "approvalsPending":
        bgColor = "from-amber-400 to-amber-600";
        gradientFrom = "from-amber-600/10";
        cardBgGradient = "from-amber-500 to-orange-600";
        borderClass = "border-2 border-amber-300/70 dark:border-amber-300/50";
        shadowClass = "";
        break;
      case "proposalsAwaitingClient":
        bgColor = "from-sky-400 to-sky-600";
        gradientFrom = "from-sky-600/10";
        cardBgGradient = "from-sky-500 to-blue-600";
        borderClass = "border-2 border-sky-300/70 dark:border-sky-300/50";
        shadowClass = "";
        break;
      case "estimatedMargin":
        bgColor = "from-emerald-400 to-emerald-600";
        gradientFrom = "from-emerald-600/10";
        cardBgGradient = "from-emerald-500 to-teal-600";
        borderClass = "border-2 border-emerald-300/70 dark:border-emerald-300/50";
        shadowClass = "";
        break;
      case "pendingPayments":
        bgColor = "from-orange-400 to-orange-600";
        gradientFrom = "from-orange-600/10";
        cardBgGradient = "from-orange-500 to-amber-600";
        borderClass = "border-2 border-orange-300/70 dark:border-orange-300/50";
        shadowClass = "";
        break;
      default:
        bgColor = "from-muted to-muted-foreground";
        gradientFrom = "from-muted/5";
        cardBgGradient = "from-slate-500 to-slate-700";
        borderClass = "border-2 border-slate-400/50 dark:border-slate-300/40";
        shadowClass = "";
    }

    const metricNav: Partial<Record<MetricType, string>> = {
      activeProjects: "/company/projetos",
      tasksToLaunch: "/company/tarefas",
      tasksInProgress: "/company/tarefas",
      approvalsPending: "/company/tarefas",
      contractedValueMonth: "/company/faturas",
      pendingPayments: "/company/faturas",
      estimatedMargin: "/company/relatorios",
      proposalsAwaitingClient: "/company/projetos",
    };

    const metricDescriptions: Partial<Record<MetricType, string>> = {
      activeProjects: "Projetos ativos no período. Clique para ver todos os projetos.",
      tasksToLaunch: "Tarefas contratadas aguardando lançamento. Clique para gerenciar as tarefas.",
      tasksInProgress: "Tarefas em execução ativa. Clique para acompanhar o andamento.",
      approvalsPending: "Projetos com entrega aguardando aprovação. Clique para ver pendências.",
      proposalsAwaitingClient: "Propostas enviadas aguardando resposta do cliente. Clique para ver negociações.",
      contractedValueMonth: "Valor total contratado no período. Clique para ver o financeiro.",
      estimatedMargin: "Margem bruta estimada = Receita − CMV. Indica a rentabilidade. Clique para ver relatórios.",
      pendingPayments: "Total a receber das faturas em aberto. Clique para ver o financeiro detalhado.",
    };

    const navDest = metricNav[metricType];
    const cardDescription = metricDescriptions[metricType];

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
        isDragOver &&
          "ring-2 ring-primary ring-offset-2 scale-[1.02] shadow-lg",
        !isDragging &&
          !isDragOver &&
          !isEditing &&
          "hover:shadow-lg hover:-translate-y-0.5",
      ),
    };

    if (metricType === "contractedValueMonth") {
      const cardInner = (
        <div className="flex flex-col h-full px-4 pt-3 pb-3">
          <div className="flex items-start justify-between mb-1.5">
            <p className="text-[10px] font-bold text-white/80 uppercase tracking-wider leading-tight flex-1 min-w-0 pr-1 line-clamp-2">
              {metricName}
            </p>
            <div className="bg-white/20 rounded-md p-1 shrink-0 ml-1">
              <Icon className="h-4 w-4 text-white" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white leading-none flex-1 flex items-center">
            {metric.value}
          </p>
          <div className="flex items-center gap-2 pr-7">
            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-white/20 text-white">
              {metric.trend === "up" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {metric.trend === "up" ? "+" : "-"}{Math.abs(metric.change)}{"%"}
            </div>
            <span className="text-[10px] text-white/60">vs. anterior</span>
          </div>
        </div>
      );
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
            `relative h-full rounded-2xl overflow-hidden shadow-lg transition-all duration-200 bg-gradient-to-br ${cardBgGradient} ${borderClass} ${shadowClass}`,
            isEditing && "cursor-grab active:cursor-grabbing",
            isDragging && "opacity-40 scale-95",
            isDragOver && "ring-2 ring-white ring-offset-2 scale-[1.02]",
            !isDragging && !isDragOver && !isEditing && "hover:shadow-xl hover:scale-[1.02]",
          )}
        >
          {isEditing && (
            <div className="absolute top-1.5 right-1.5 z-10">
              <button onClick={(e) => { e.stopPropagation(); toggleMetricVisibility(metricType); }}
                className="bg-white/25 hover:bg-white/40 rounded-md p-0.5 transition-colors">
                <EyeOff className="h-3 w-3 text-white" />
              </button>
            </div>
          )}
          {!isEditing && navDest ? (
            <Link to={navDest} className="block h-full">{cardInner}</Link>
          ) : cardInner}
          {!isEditing && cardDescription && (
            <div className="absolute bottom-2 right-2 z-20">
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="flex items-center justify-center w-5 h-5 rounded-full bg-white/20 hover:bg-white/40 transition-colors cursor-help">
                      <Info className="h-3 w-3 text-white" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" align="end" className="max-w-[240px] bg-slate-900 text-white border-slate-700 text-[11px] leading-relaxed">
                    {cardDescription}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>
      );
    }

    const genericCardInner = (
      <div className="flex flex-col h-full px-4 pt-3 pb-3">
        <div className="flex items-start justify-between mb-1.5">
          <p className="text-[10px] font-bold text-white/80 uppercase tracking-wider leading-tight flex-1 min-w-0 pr-1 line-clamp-2">
            {metricName}
          </p>
          <div className="bg-white/20 rounded-md p-1 shrink-0 ml-1">
            <Icon className="h-4 w-4 text-white" />
          </div>
        </div>
        <p className="text-2xl font-bold text-white leading-none flex-1 flex items-center">
          {metric.value}
        </p>
        <div className="flex items-center gap-2 pr-7">
          <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-white/20 text-white">
            {metric.trend === "up" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {metric.trend === "up" ? "+" : "-"}{Math.abs(metric.change)}{"%"}
          </div>
          <span className="text-[10px] text-white/60">
            vs. anterior
          </span>
        </div>
      </div>
    );
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
          `relative h-full rounded-2xl overflow-hidden shadow-lg transition-all duration-200 bg-gradient-to-br ${cardBgGradient} ${borderClass} ${shadowClass}`,
          isEditing && "cursor-grab active:cursor-grabbing",
          isDragging && "opacity-40 scale-95",
          isDragOver && "ring-2 ring-white ring-offset-2 scale-[1.02]",
          !isDragging && !isDragOver && !isEditing && "hover:shadow-xl hover:scale-[1.02]",
        )}
      >
        {isEditing && (
          <div className="absolute top-1.5 right-1.5 z-10">
            <button onClick={(e) => { e.stopPropagation(); toggleMetricVisibility(metricType); }}
              className="bg-white/25 hover:bg-white/40 rounded-md p-0.5 transition-colors">
              <EyeOff className="h-3 w-3 text-white" />
            </button>
          </div>
        )}
        {!isEditing && navDest ? (
          <Link to={navDest} className="block h-full">{genericCardInner}</Link>
        ) : genericCardInner}
        {!isEditing && cardDescription && (
          <div className="absolute bottom-2 right-2 z-20">
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="flex items-center justify-center w-5 h-5 rounded-full bg-white/20 hover:bg-white/40 transition-colors cursor-help">
                    <Info className="h-3 w-3 text-white" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" align="end" className="max-w-[240px] bg-slate-900 text-white border-slate-700 text-[11px] leading-relaxed">
                  {cardDescription}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>
    );
  };

  // ── Widget Details Modal ───────────────────────────────────────────────────
  const WidgetDetailsModal = () => {
    if (!detailsWidgetId) return null;
    const title = getWidgetTitle(detailsWidgetId as WidgetType);

    // Resolve effective period for this widget (uses per-widget override if any)
    const widgetInstance = widgets.find((w) => w.type === detailsWidgetId);
    const modalPeriod = widgetInstance
      ? getWidgetPeriod(widgetInstance.id)
      : {
          from: globalPeriod.from || new Date(0),
          to: globalPeriod.to || new Date(),
          label: globalPeriod.label,
          periodKey: undefined as string | undefined,
        };
    const modalPeriodKey = (modalPeriod as any).periodKey as string | undefined;
    const mData = generateDashboardData(modalPeriod.from, modalPeriod.to);
    const mPaW = mData.platformActivities;
    const mArW = mData.accountsReceivable;

    const cfgMap: Record<string, { icon: React.ReactNode; subtitle: string }> =
      {
        metrics: {
          icon: <LayoutGrid className="h-6 w-6" />,
          subtitle: "Projetos, tarefas, aprovações e financeiro da agency",
        },
        accountsReceivable: {
          icon: <DollarSign className="h-6 w-6" />,
          subtitle: "Pagamentos pendentes e valores a receber",
        },
        activeProjectsWidget: {
          icon: <Briefcase className="h-6 w-6" />,
          subtitle: "Projetos ativos da agency",
        },
        averageTicket: {
          icon: <Calculator className="h-6 w-6" />,
          subtitle: "Ticket médio da operação da agency",
        },
        cmv: {
          icon: <Calculator className="h-6 w-6" />,
          subtitle: "Comissão e margem estimada",
        },
        statusOverview: {
          icon: <LayoutGrid className="h-6 w-6" />,
          subtitle: "Projetos, tarefas e aprovações da agency",
        },
        tasks: {
          icon: <CheckSquare className="h-6 w-6" />,
          subtitle: "Tarefas e execuções da agency",
        },
        activity: {
          icon: <Activity className="h-6 w-6" />,
          subtitle: "Atividades recentes da agency",
        },
        alerts: {
          icon: <Bell className="h-6 w-6" />,
          subtitle: "Alertas relevantes da agency",
        },
        quickActions: {
          icon: <Zap className="h-6 w-6" />,
          subtitle: "Ações rápidas da agency",
        },
      };
    const cfg = cfgMap[detailsWidgetId] ?? {
      icon: <Settings className="h-6 w-6" />,
      subtitle: "Detalhes do widget",
    };

    const renderContent = () => {
      switch (detailsWidgetId) {
        case "metrics": {
          const mp = metrics;
          const items: Array<{
            key: string;
            label: string;
            value: string | number;
            change?: number;
            trend?: "up" | "down";
            suffix?: string;
          }> = [
            {
              key: "activeProjects",
              label: "Projetos ativos",
              value: mp.activeProjects.value,
              change: mp.activeProjects.change,
              trend: mp.activeProjects.trend,
            },
            {
              key: "tasksToLaunch",
              label: "Tarefas para lançamento",
              value: mp.tasksToLaunch.value,
              change: mp.tasksToLaunch.change,
              trend: mp.tasksToLaunch.trend,
            },
            {
              key: "tasksInProgress",
              label: "Tarefas em execução",
              value: mp.tasksInProgress.value,
              change: mp.tasksInProgress.change,
              trend: mp.tasksInProgress.trend,
            },
            {
              key: "approvalsPending",
              label: "Aprovações pendentes",
              value: mp.approvalsPending.value,
              change: mp.approvalsPending.change,
              trend: mp.approvalsPending.trend,
            },
            {
              key: "proposalsAwaitingClient",
              label: "Propostas aguardando cliente",
              value: mp.proposalsAwaitingClient.value,
              change: mp.proposalsAwaitingClient.change,
              trend: mp.proposalsAwaitingClient.trend,
            },
            {
              key: "contractedValueMonth",
              label: "Valor contratado no mês",
              value: mp.contractedValueMonth.value,
              change: mp.contractedValueMonth.change,
              trend: mp.contractedValueMonth.trend,
            },
            {
              key: "estimatedMargin",
              label: "Comissão / margem estimada",
              value: mp.estimatedMargin.value,
              change: mp.estimatedMargin.change,
              trend: mp.estimatedMargin.trend,
            },
            {
              key: "pendingPayments",
              label: "Pagamentos pendentes",
              value: mp.pendingPayments.value,
              change: mp.pendingPayments.change,
              trend: mp.pendingPayments.trend,
            },
          ];
          return (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {items.map((it) => (
                  <div
                    key={it.key}
                    className="p-3 rounded-lg border border-border/50 bg-muted/20"
                  >
                    <p className="text-xs text-muted-foreground">{it.label}</p>
                    <p className="text-xl font-bold mt-0.5">
                      {typeof it.value === "number"
                        ? it.value.toLocaleString("pt-BR")
                        : it.value}
                      {it.suffix && (
                        <span className="text-xs font-normal text-muted-foreground">
                          {it.suffix}
                        </span>
                      )}
                    </p>
                    {it.change != null && (
                      <div className="flex items-center justify-between mt-1">
                        <span
                          className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${it.trend === "up" ? "text-success" : "text-destructive"}`}
                        >
                          {it.trend === "up" ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          {it.trend === "up" ? "+" : "-"}
                          {Math.abs(it.change)}
                          %
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          vs. anterior
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                    <p className="text-sm font-semibold mb-2">Projetos e tarefas</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between gap-3">
                        <span className="text-muted-foreground">Projetos ativos</span>
                        <span className="font-medium">{mData.statusOverview.projects.ongoing}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-muted-foreground">Lançamentos</span>
                        <span className="font-medium">{mData.statusOverview.tasks.contracted}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-muted-foreground">Em execução</span>
                        <span className="font-medium">{mData.statusOverview.tasks.inProgress}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-muted-foreground">Propostas</span>
                        <span className="font-medium">{mData.statusOverview.leads.proposal}</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                    <p className="text-sm font-semibold mb-2">Financeiro</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between gap-3">
                        <span className="text-muted-foreground">Valor contratado</span>
                        <span className="font-medium">{mp.contractedValueMonth.value}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-muted-foreground">Comissão / margem</span>
                        <span className="font-medium">{mp.estimatedMargin.value}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-muted-foreground">Pagamentos pendentes</span>
                        <span className="font-medium">{mp.pendingPayments.value}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-muted-foreground">Recebido</span>
                        <span className="font-medium">R$ {(mData.accountsReceivable.received / 1000).toFixed(1)}k</span>
                      </div>
                    </div>
                  </div>
                </div>
            </div>
          );

        }

        case "activeProjectsWidget":
          return (
            <div className="space-y-4">
              {/* Hero */}
              <div className="flex items-end justify-between p-4 rounded-xl bg-primary/5 border border-primary/20">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Total de Projetos Ativos
                  </p>
                  <p className="text-3xl font-bold mt-0.5">{apW.total}</p>
                </div>
                <div className="text-right">
                  <span className="flex items-center gap-1 text-sm font-semibold text-success justify-end">
                    <TrendingUp className="h-4 w-4" />+{apW.growth}%
                  </span>
                  <p className="text-xs text-muted-foreground">vs anterior</p>
                </div>
              </div>
              {/* 2x2 type grid */}
              <div>
                <p className="text-sm font-semibold mb-2">Por Tipo de Conta</p>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    {
                      label: "Agências",
                      value: apW.agencies,
                      growth: apW.agenciesGrowth,
                      bg: "bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800",
                      text: "text-indigo-700 dark:text-indigo-300",
                    },
                    {
                      label: "Lead Premium",
                      value: apW.leadPremium,
                      growth: apW.leadPremiumGrowth,
                      bg: "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800",
                      text: "text-amber-700 dark:text-amber-300",
                    },
                    {
                      label: "Nômades",
                      value: apW.nomades,
                      growth: apW.nomadesGrowth,
                      bg: "bg-teal-50 dark:bg-teal-950/20 border-teal-200 dark:border-teal-800",
                      text: "text-teal-700 dark:text-teal-300",
                    },
                  ].map((t) => (
                    <div
                      key={t.label}
                      className={`p-3 rounded-xl border ${t.bg}`}
                    >
                      <p className="text-xs text-muted-foreground">{t.label}</p>
                      <p className={`text-xl font-bold mt-0.5 ${t.text}`}>
                        {t.value}
                      </p>
                      <p className="text-[10px] text-success">+{t.growth}%</p>
                    </div>
                  ))}
                  {/* Novos no período */}
                  <div className="p-3 rounded-xl border border-teal-200/60 dark:border-teal-800/60 bg-teal-50/50 dark:bg-teal-950/10">
                    <p className="text-xs text-muted-foreground">
                      Novos no período
                    </p>
                    <p className="text-xl font-bold mt-0.5 text-teal-700 dark:text-teal-300">
                      {apW.newTotal}
                    </p>
                    <div className="flex gap-2 text-[10px] mt-0.5">
                      <span className="text-indigo-600 dark:text-indigo-400">
                        Ag: {apW.newAgencies}
                      </span>
                      <span className="text-amber-600 dark:text-amber-400">
                        LP: {apW.newLeadPremium}
                      </span>
                      <span className="text-teal-600 dark:text-teal-400">
                        Nm: {apW.newNomades}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              {/* Distribution bar */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground">
                  Distribuição
                </p>
                <div className="flex gap-0.5 h-2.5 rounded-full overflow-hidden">
                  {[
                    { value: apW.agencies, color: "bg-indigo-500" },
                    { value: apW.leadPremium, color: "bg-amber-500" },
                    { value: apW.nomades, color: "bg-teal-500" },
                  ].map((s, i) => {
                    const pct =
                      apW.total > 0 ? (s.value / apW.total) * 100 : 33;
                    return (
                      <div
                        key={i}
                        className={s.color}
                        style={{ width: `${pct}%` }}
                      />
                    );
                  })}
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  {[
                    { label: "Agências", c: "bg-indigo-500" },
                    { label: "Lead Premium", c: "bg-amber-500" },
                    { label: "Nômades", c: "bg-teal-500" },
                  ].map((l) => (
                    <div key={l.label} className="flex items-center gap-1">
                      <div className={`h-1.5 w-1.5 rounded-full ${l.c}`} />
                      {l.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );

        case "tasks": {
          const mt = mData.tasks;
          const tTotal =
            mt.completed + mt.inProgress + mt.contracted + mt.cancelled;
          return (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                <p className="text-sm text-muted-foreground">
                  Total de Tarefas no Período
                </p>
                <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">
                  {mt.total.toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    label: "Concluídas",
                    value: mt.completed,
                    change: mt.completedGrowth,
                    bg: "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800",
                    text: "text-green-700 dark:text-green-300",
                  },
                  {
                    label: "Em Execução",
                    value: mt.inProgress,
                    change: mt.inProgressGrowth,
                    bg: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800",
                    text: "text-blue-700 dark:text-blue-300",
                  },
                  {
                    label: "Contratadas",
                    value: mt.contracted,
                    change: mt.contractedGrowth,
                    bg: "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800",
                    text: "text-amber-700 dark:text-amber-300",
                  },
                  {
                    label: "Canceladas",
                    value: mt.cancelled,
                    change: mt.cancelledChange,
                    bg: "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800",
                    text: "text-red-700 dark:text-red-300",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={`p-4 rounded-xl border text-center ${item.bg}`}
                  >
                    <p className="text-xs text-muted-foreground mb-1">
                      {item.label}
                    </p>
                    <p className={`text-2xl font-bold ${item.text}`}>
                      {item.value.toLocaleString("pt-BR")}
                    </p>
                    <p
                      className={`text-xs font-medium mt-1 ${item.change >= 0 ? "text-success" : "text-destructive"}`}
                    >
                      {item.change >= 0 ? "+" : ""}
                      {item.change}%
                    </p>
                  </div>
                ))}
              </div>
              <div className="p-4 rounded-xl border border-border/50 bg-muted/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">
                    SLA — Dentro do prazo
                  </span>
                  <span className="text-base font-bold text-success">
                    {mt.slaCompliance.toFixed(1)}%
                  </span>
                </div>
                <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-2.5 bg-success rounded-full"
                    style={{ width: `${mt.slaCompliance}%` }}
                  />
                </div>
              </div>
              {tTotal > 0 && (
                <div className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-2">
                  <p className="text-sm font-semibold">Distribuição</p>
                  {[
                    {
                      label: "Concluídas",
                      value: mt.completed,
                      color: "bg-green-500",
                    },
                    {
                      label: "Em Execução",
                      value: mt.inProgress,
                      color: "bg-blue-500",
                    },
                    {
                      label: "Contratadas",
                      value: mt.contracted,
                      color: "bg-amber-500",
                    },
                    {
                      label: "Canceladas",
                      value: mt.cancelled,
                      color: "bg-red-500",
                    },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">
                          {item.label}
                        </span>
                        <span className="font-medium">
                          {item.value.toLocaleString("pt-BR")} (
                          {Math.round((item.value / tTotal) * 100)}%)
                        </span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className={`h-2 ${item.color} rounded-full`}
                          style={{ width: `${(item.value / tTotal) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        }

        case "statusOverview": {
          const so = mData.statusOverview;
          const sections = [
            {
              title: "Projetos",
              icon: Briefcase,
              items: [
                {
                  label: "Em andamento",
                  value: so.projects.ongoing,
                  color: "bg-blue-500",
                  chip: "text-blue-600",
                },
                {
                  label: "Aprovados",
                  value: so.projects.approved,
                  color: "bg-green-500",
                  chip: "text-green-600",
                },
                {
                  label: "Concluídos",
                  value: so.projects.completed,
                  color: "bg-emerald-500",
                  chip: "text-emerald-600",
                },
                {
                  label: "Cancelados",
                  value: so.projects.cancelled,
                  color: "bg-red-500",
                  chip: "text-red-600",
                },
                {
                  label: "Em atraso",
                  value: so.projects.delayed,
                  color: "bg-amber-500",
                  chip: "text-amber-600",
                },
              ],
            },
            {
              title: "Tarefas",
              icon: CheckSquare,
              items: [
                {
                  label: "Contratadas",
                  value: so.tasks.contracted,
                  color: "bg-purple-500",
                  chip: "text-purple-600",
                },
                {
                  label: "Em execução",
                  value: so.tasks.inProgress,
                  color: "bg-blue-500",
                  chip: "text-blue-600",
                },
                {
                  label: "Concluídas",
                  value: so.tasks.completed,
                  color: "bg-green-500",
                  chip: "text-green-600",
                },
                {
                  label: "Arquivadas",
                  value: so.tasks.archived,
                  color: "bg-slate-400",
                  chip: "text-slate-500",
                },
              ],
            },
            {
              title: "Leads",
              icon: Users,
              items: [
                {
                  label: "Novos",
                  value: so.leads.new,
                  color: "bg-cyan-500",
                  chip: "text-cyan-600",
                },
                {
                  label: "Em contato",
                  value: so.leads.contacted,
                  color: "bg-blue-500",
                  chip: "text-blue-600",
                },
                {
                  label: "Proposta enviada",
                  value: so.leads.proposal,
                  color: "bg-violet-500",
                  chip: "text-violet-600",
                },
                {
                  label: "Fechado",
                  value: so.leads.won,
                  color: "bg-green-500",
                  chip: "text-green-600",
                },
                {
                  label: "Perdido",
                  value: so.leads.lost,
                  color: "bg-red-500",
                  chip: "text-red-600",
                },
              ],
            },
          ];
          return (
            <div className="space-y-5">
              {sections.map((section) => {
                const total = section.items.reduce((s, i) => s + i.value, 0);
                return (
                  <div
                    key={section.title}
                    className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-3"
                  >
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <section.icon className="h-4 w-4 text-muted-foreground" />
                      {section.title}
                    </h3>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {section.items.map((item) => (
                        <div
                          key={item.label}
                          className="p-3 rounded-lg border border-border/30 bg-background/60 text-center"
                        >
                          <p className={`text-xl font-bold ${item.chip}`}>
                            {item.value.toLocaleString("pt-BR")}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {item.label}
                          </p>
                        </div>
                      ))}
                    </div>
                    {total > 0 && (
                      <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
                        {section.items
                          .filter((i) => i.value > 0)
                          .map((item) => (
                            <div
                              key={item.label}
                              className={`${item.color} h-2`}
                              style={{
                                width: `${(item.value / total) * 100}%`,
                              }}
                              title={`${item.label}: ${item.value}`}
                            />
                          ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        }

        case "alerts":
          return (
            <div className="space-y-4">
              {/* Priority summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/5 text-center">
                  <AlertCircle className="h-6 w-6 text-destructive mx-auto mb-1" />
                  <p className="text-2xl font-bold text-destructive">
                    {systemAlerts.filter((a) => a.priority === "high").length}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Alta prioridade
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-warning/20 bg-warning/5 text-center">
                  <AlertTriangle className="h-6 w-6 text-warning mx-auto mb-1" />
                  <p className="text-2xl font-bold text-warning">
                    {systemAlerts.filter((a) => a.priority === "medium").length}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Média prioridade
                  </p>
                </div>
              </div>
              {/* Full alert list */}
              <div className="space-y-2.5">
                {systemAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border ${getAlertColor(alert.type)}`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {getAlertIcon(alert.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-sm font-semibold">{alert.title}</p>
                        <Badge
                          variant="outline"
                          className={`text-xs shrink-0 ${alert.priority === "high" ? "bg-destructive/10 text-destructive border-destructive/40" : "bg-warning/10 text-warning-foreground border-warning/40"}`}
                        >
                          {alert.priority === "high" ? "Alta" : "Média"}
                        </Badge>
                      </div>
                      <p className="text-xs opacity-80">{alert.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              {/* System log */}
              <div className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-2">
                <p className="text-sm font-semibold">Registro do sistema</p>
                {systemAlertsData.map((a, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="text-muted-foreground truncate">
                      {a.message}
                    </span>
                    <span className="text-muted-foreground shrink-0 ml-2">
                      {a.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );

        case "quickActions":
          return (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Acesse rapidamente as principais áreas de administração.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    {
                      to: "/company/usuarios",
                      icon: Users,
                      label: "Gerenciar Usuários",
                      desc: "Criar, editar e desativar contas",
                      border: "border-info/20",
                      bg: "bg-info/5",
                      text: "text-info",
                    },
                    {
                      to: "/company/tarefas",
                      icon: UserCheck,
                      label: "Tarefas em Execução",
                      desc: "Acompanhar o que os nômades estão fazendo",
                      border: "border-success/20",
                      bg: "bg-success/5",
                      text: "text-success",
                    },
                    {
                      to: "/company/projetos",
                      icon: Briefcase,
                      label: "Ver Projetos",
                      desc: "Todos os projetos ativos",
                      border: "border-chart-4/20",
                      bg: "bg-chart-4/5",
                      text: "text-chart-4",
                    },
                    {
                      to: "/company/clientes",
                      icon: Settings,
                      label: "Clientes",
                      desc: "Cadastro e histórico dos seus clientes",
                      border: "border-warning/20",
                      bg: "bg-warning/5",
                      text: "text-warning",
                    },
                    {
                      to: "/company/usuarios",
                      icon: Key,
                      label: "Usuários",
                      desc: "Quem tem acesso e com qual função",
                      border: "border-violet-200 dark:border-violet-800",
                      bg: "bg-violet-50 dark:bg-violet-950/20",
                      text: "text-violet-600 dark:text-violet-400",
                    },
                    {
                      to: "/company/relatorios",
                      icon: FileText,
                      label: "Relatórios",
                      desc: "Financeiro e operacional",
                      border: "border-emerald-200 dark:border-emerald-800",
                      bg: "bg-emerald-50 dark:bg-emerald-950/20",
                      text: "text-emerald-600 dark:text-emerald-400",
                    },
                  ] as const
                ).map((action) => {
                  const Icon = action.icon;
                  return (
                    <Link key={action.to} to={action.to}>
                      <div
                        className={`p-3 rounded-xl border ${action.border} ${action.bg} hover:opacity-80 transition-opacity`}
                      >
                        <Icon className={`h-5 w-5 ${action.text} mb-1.5`} />
                        <p className={`text-xs font-semibold ${action.text}`}>
                          {action.label}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {action.desc}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          );

        default:
          return (
            <div className="text-center py-8 space-y-2">
              <div className="p-3 bg-muted/30 rounded-full w-fit mx-auto">
                <Settings className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                Detalhes detalhados em breve para este widget.
              </p>
            </div>
          );
      }
    };

    return (
      <Dialog
        open={!!detailsWidgetId}
        onOpenChange={() => setDetailsWidgetId(null)}
      >
        <DialogContent
          className="!max-w-[1000px] w-[calc(100vw-2rem)] p-0 overflow-hidden"
          showCloseButton={false}
        >
          {/* Brand-gradient header */}
          <div className="app-brand-header px-5 py-4 text-white">
            {/* Top row: icon + title/subtitle | period badge + action buttons */}
            <div className="flex items-center gap-3">
              {/* Icon */}
              <div className="p-2.5 bg-white/20 rounded-xl shrink-0">
                {cfg.icon}
              </div>
              {/* Title + subtitle — grows but never forces other items to wrap */}
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-bold leading-tight truncate">
                  {title}
                </h2>
                <p className="text-xs text-white/70 mt-0.5 truncate">
                  {cfg.subtitle}
                </p>
              </div>
              {/* Period selector dropdown — white-themed for the gradient header */}
              {widgetInstance &&
                (() => {
                  const wp = widgetPeriods.find(
                    (p) => p.widgetId === widgetInstance.id,
                  );
                  const isCustom = wp?.mode === "custom";
                  const periodOptions = [
                    { key: "global", label: "Período global" },
                    { key: "today", label: "Hoje" },
                    { key: "7days", label: "Últimos 7 dias" },
                    { key: "30days", label: "Últimos 30 dias" },
                    { key: "thisMonth", label: "Este mês" },
                    { key: "lastMonth", label: "Mês passado" },
                    { key: "90days", label: "Últimos 90 dias" },
                    { key: "365days", label: "Último ano" },
                  ];
                  const activeLabel = isCustom
                    ? wp!.customPeriod!.label
                    : "Período global";
                  return (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="inline-flex items-center gap-1.5 text-[11px] font-medium bg-white/20 hover:bg-white/30 text-white rounded-full px-3 py-1.5 whitespace-nowrap transition-colors shrink-0">
                          <Calendar className="h-3 w-3 opacity-80" />
                          {activeLabel}
                          <ChevronDown className="h-3 w-3 opacity-70" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-52 z-[9999]"
                      >
                        <DropdownMenuLabel className="text-xs text-muted-foreground">
                          Período do widget
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {periodOptions.map((opt) => {
                          const isSelected =
                            opt.key === "global"
                              ? !isCustom
                              : isCustom &&
                                wp!.customPeriod!.label === opt.label;
                          return (
                            <DropdownMenuItem
                              key={opt.key}
                              onClick={() =>
                                setWidgetCustomPeriod(
                                  widgetInstance.id,
                                  opt.key === "global" ? "global" : opt.key,
                                )
                              }
                              className="text-xs"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-3 w-3",
                                  isSelected ? "opacity-100" : "opacity-0",
                                )}
                              />
                              {opt.label}
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  );
                })()}
              {/* Divider */}
              <div className="h-6 w-px bg-white/20 shrink-0" />
              {/* Action icon buttons */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => openWidgetShareDialog(detailsWidgetId!, title)}
                  title="Compartilhar"
                  className="flex items-center justify-center h-8 w-8 rounded-lg bg-white/10 hover:bg-white/30 active:scale-90 transition-all duration-150"
                >
                  <Share2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => exportWidgetToPng(detailsWidgetId!, title)}
                  title="Exportar PNG"
                  className="flex items-center justify-center h-8 w-8 rounded-lg bg-white/10 hover:bg-white/30 active:scale-90 transition-all duration-150"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setDetailsWidgetId(null)}
                  title="Fechar"
                  className="flex items-center justify-center h-8 w-8 rounded-lg bg-white/10 hover:bg-red-500/60 active:scale-90 transition-all duration-150"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
          {/* Scrollable content — overflow-y-scroll keeps scrollbar always visible */}
          <div
            className="px-6 py-5 space-y-4 max-h-[68vh] overflow-y-scroll transition-opacity duration-150"
            key={`${detailsWidgetId}-${modalPeriod.label}`}
          >
            {renderContent()}
          </div>
        </DialogContent>
      </Dialog>
    );
  };
  // ─────────────────────────────────────────────────────────────────────────

  const renderWidget = (widget: WidgetState) => {
    const effectivePeriod = getWidgetPeriod(widget.id);

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
    );

    switch (widget.type) {
      case "metrics": {
        const visibleCount = metricCards.filter((m) => m.visible).length;
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
              <CardHeader className="pb-3 relative">
                {/* Title row */}
                <div className="flex items-center gap-3 pr-20">
                  {isCustomizeMode && (
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                    <LayoutGrid className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base font-semibold leading-tight">
                      {getWidgetTitle(widget.type)}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Projetos, tarefas, aprovações e financeiro da agency
                    </p>
                  </div>
                </div>
                {/* Controls row */}
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => setIsEditingMetrics(!isEditingMetrics)}
                    title={
                      isEditingMetrics ? "Concluir Edição" : "Editar Widgets"
                    }
                    className={cn(
                      "flex items-center justify-center h-7 w-7 rounded-md border shrink-0 transition-all duration-200",
                      isEditingMetrics
                        ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/30"
                        : "border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/50",
                    )}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <WidgetPeriodSelector widgetId={widget.id} />
                </div>
                <WidgetExportButton
                  widgetId={widget.type}
                  widgetTitle={getWidgetTitle(widget.type)}
                />
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
                          // Havia aqui um `metricNames` local com as metricas
                          // do ADMIN (totalUsers, companies, revenue...), que
                          // sombreava o do escopo externo. Como as chaves nao
                          // batem com as metricas da empresa, a lista de
                          // metricas ocultas saia com nome vazio. Agora usa o
                          // metricNames de cima, que tem os nomes certos.
                          return (
                            <Button
                              key={metricCard.id}
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                toggleMetricVisibility(metricCard.id)
                              }
                              className="text-xs"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              {metricNames[metricCard.id]}
                            </Button>
                          );
                        })}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  {(() => {
                    // Compute widget-specific metrics based on per-widget period override
                    const wp = effectivePeriod as { periodKey?: string };
                    const widgetBase = metrics;
                    const widgetMetrics = !apiStats
                      ? widgetBase
                      : {
                          ...widgetBase,
                           // Havia aqui sobrescritas para totalUsers,
                           // activeUsers, companies e revenue — metricas do
                           // ADMIN, que nao existem no MetricType da empresa.
                           // Escreviam dado real da API em chaves que nenhum
                           // card lia, enquanto as metricas da empresa seguiam
                           // com valor gerado. Removidas.
                           //
                           // PENDENTE: so `activeProjects` recebe valor da API.
                           // As outras 7 metricas da empresa ainda nao tem
                           // origem definida no endpoint de stats.
                          activeProjects: {
                            ...widgetBase.activeProjects,
                            value: (
                              apiStats.projects?.active ?? 0
                            ).toLocaleString("pt-BR"),
                          },
                        };
                    return metricCards
                      .filter((m) => m.visible)
                      .sort((a, b) => a.order - b.order)
                      .map((metricCard) =>
                        renderMetricCard(metricCard.id, widgetMetrics),
                      );
                  })()}
                </div>
              </CardContent>
            </Card>
          </div>
        );
      }

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
              <CardHeader className="pb-4 relative">
                <div className="flex items-center gap-3 pr-20">
                  {isCustomizeMode && (
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <div className="p-2 bg-info/10 rounded-lg shrink-0">
                    <Activity className="h-4 w-4 text-info" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base font-semibold leading-tight">
                      {getWidgetTitle(widget.type)}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Atividades recentes da empresa
                    </p>
                  </div>
                  <Link to="/company/atividades" className="shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs hover:bg-primary/10"
                    >
                      Ver todas
                      <ArrowRightIcon className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                </div>
                <div className="mt-2">
                  <WidgetPeriodSelector widgetId={widget.id} />
                </div>
                <WidgetExportButton
                  widgetId={widget.type}
                  widgetTitle={getWidgetTitle(widget.type)}
                />
              </CardHeader>
              <CardContent className="space-y-3">
                {recentActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start space-x-3 p-3 rounded-xl hover:bg-muted/50 transition-all duration-200 hover:shadow-md border border-transparent hover:border-border/50"
                  >
                    <div
                      className={`p-2 rounded-xl ${activity.bgColor} shadow-sm`}
                    >
                      <activity.icon className={`h-4 w-4 ${activity.color}`} />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {activity.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {activity.description}
                      </p>
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
        );

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
            <Card className="border-0 shadow-lg overflow-hidden">
              <CardHeader className="pb-3 relative">
                <div className="flex items-center gap-3 pr-20">
                  {isCustomizeMode && (
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <div className="p-2 bg-warning/10 rounded-lg shrink-0">
                    <Bell className="h-4 w-4 text-warning" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base font-semibold leading-tight">
                      {getWidgetTitle(widget.type)}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Alertas da empresa
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {systemAlerts.length} alertas
                  </Badge>
                </div>
                <div className="mt-2">
                  <WidgetPeriodSelector widgetId={widget.id} />
                </div>
                <WidgetExportButton
                  widgetId={widget.type}
                  widgetTitle={getWidgetTitle(widget.type)}
                />
              </CardHeader>
              <CardContent className="space-y-2.5 px-4 pb-4">
                {/* Priority summary 2-per-row */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 p-2.5 rounded-xl border border-destructive/20 bg-destructive/5">
                    <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">
                        Alta prioridade
                      </p>
                      <p className="text-sm font-bold text-destructive">
                        {
                          systemAlerts.filter((a) => a.priority === "high")
                            .length
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl border border-warning/20 bg-warning/5">
                    <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">
                        Média prioridade
                      </p>
                      <p className="text-sm font-bold text-warning">
                        {
                          systemAlerts.filter((a) => a.priority === "medium")
                            .length
                        }
                      </p>
                    </div>
                  </div>
                </div>
                {/* Compact alert list */}
                <div className="space-y-2">
                  {systemAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border ${getAlertColor(alert.type)} transition-all duration-200 hover:shadow-sm`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {getAlertIcon(alert.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <p className="text-xs font-semibold truncate">
                            {alert.title}
                          </p>
                          <Badge
                            variant="outline"
                            className={`text-[10px] shrink-0 h-4 px-1.5 ${alert.priority === "high" ? "bg-destructive/10 text-destructive border-destructive/40" : "bg-warning/10 text-warning-foreground border-warning/40"}`}
                          >
                            {alert.priority === "high" ? "Alta" : "Média"}
                          </Badge>
                        </div>
                        <p className="text-[10px] opacity-80 line-clamp-1">
                          {alert.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        );

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
            <Card className="border-0 shadow-lg overflow-hidden">
              <CardHeader className="pb-3 relative">
                <div className="flex items-center gap-3 pr-20">
                  {isCustomizeMode && (
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                    <Zap className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base font-semibold leading-tight">
                      {getWidgetTitle(widget.type)}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Atalhos da empresa
                    </p>
                  </div>
                </div>
                <div className="mt-2">
                  <WidgetPeriodSelector widgetId={widget.id} />
                </div>
                <WidgetExportButton
                  widgetId={widget.type}
                  widgetTitle={getWidgetTitle(widget.type)}
                />
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="grid grid-cols-2 gap-2.5">
                  {(
                    [
                      {
                        to: "/company/projetos",
                        icon: Briefcase,
                        label: "Ver Projetos",
                        border: "border-info/20",
                        bg: "bg-info/5 hover:bg-info/10",
                        text: "text-info",
                      },
                      {
                        to: "/company/aprovacoes",
                        icon: UserCheck,
                        label: "Ver Aprovações",
                        border: "border-success/20",
                        bg: "bg-success/5 hover:bg-success/10",
                        text: "text-success",
                      },
                      {
                        to: "/company/entregas",
                        icon: CheckCircle2,
                        label: "Aprovar Entrega",
                        border: "border-chart-4/20",
                        bg: "bg-chart-4/5 hover:bg-chart-4/10",
                        text: "text-chart-4",
                      },
                      {
                        to: "/company/propostas",
                        icon: FileText,
                        label: "Ver Propostas",
                        border: "border-warning/20",
                        bg: "bg-warning/5 hover:bg-warning/10",
                        text: "text-warning",
                      },
                      {
                        to: "/company/financeiro",
                        icon: DollarSign,
                        label: "Acessar Financeiro",
                        border: "border-violet-200 dark:border-violet-800",
                        bg: "bg-violet-50 dark:bg-violet-950/20 hover:bg-violet-100 dark:hover:bg-violet-950/40",
                        text: "text-violet-600 dark:text-violet-400",
                      },
                    ] as const
                  ).map((action) => {
                    const Icon = action.icon;
                    return (
                      <Link key={action.to} to={action.to}>
                        <button
                          className={`w-full p-3 rounded-xl border ${action.border} ${action.bg} transition-colors text-center space-y-1.5`}
                        >
                          <Icon className={`h-5 w-5 ${action.text} mx-auto`} />
                          <p className={`text-xs font-medium ${action.text}`}>
                            {action.label}
                          </p>
                        </button>
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "activeProjectsWidget": {
        const effectivePeriod = getWidgetPeriod(widget.id);
        const _compAp = getCompanyData(
          effectivePeriod.from ?? getDateRangeFromPeriod(globalPeriod.type, globalPeriod.from, globalPeriod.to).from,
          effectivePeriod.to   ?? getDateRangeFromPeriod(globalPeriod.type, globalPeriod.from, globalPeriod.to).to,
        );
        const wApW = {
          ..._compAp.activeProjects,
          agencies: _compAp.activeProjects.byStatus.briefing,
          agenciesGrowth: 0,
          newAgencies: 0,
          leadPremium: _compAp.activeProjects.byStatus.producao,
          leadPremiumGrowth: 0,
          newLeadPremium: 0,
          nomades: _compAp.activeProjects.byStatus.revisao,
          nomadesGrowth: 0,
          newNomades: _compAp.activeProjects.byStatus.entregue,
        };
        const apTypes = [
          {
            label: "Agências",
            value: wApW.agencies,
            growth: wApW.agenciesGrowth,
            newVal: wApW.newAgencies,
            bg: "bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800",
            text: "text-indigo-700 dark:text-indigo-300",
            bar: [
              "bg-indigo-400/50",
              "bg-indigo-400/65",
              "bg-indigo-500/80",
              "bg-indigo-600",
            ],
          },
          {
            label: "Lead Premium",
            value: wApW.leadPremium,
            growth: wApW.leadPremiumGrowth,
            newVal: wApW.newLeadPremium,
            bg: "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800",
            text: "text-amber-700 dark:text-amber-300",
            bar: [
              "bg-amber-400/50",
              "bg-amber-400/65",
              "bg-amber-500/80",
              "bg-amber-600",
            ],
          },
          {
            label: "Nômades",
            value: wApW.nomades,
            growth: wApW.nomadesGrowth,
            newVal: wApW.newNomades,
            bg: "bg-teal-50 dark:bg-teal-950/20 border-teal-200 dark:border-teal-800",
            text: "text-teal-700 dark:text-teal-300",
            bar: [
              "bg-teal-400/50",
              "bg-teal-400/65",
              "bg-teal-500/80",
              "bg-teal-600",
            ],
          },
        ];
        const apBarHeights = [55, 70, 85, 100];
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
            <Card className="border-0 shadow-lg overflow-hidden">
              <CardHeader className="pb-3 relative">
                <div className="flex items-center gap-3 pr-20">
                  {isCustomizeMode && (
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                    <Briefcase className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base font-semibold leading-tight">
                      {getWidgetTitle(widget.type)}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Projetos ativos no período
                    </p>
                  </div>
                </div>
                <div className="mt-2">
                  <WidgetPeriodSelector widgetId={widget.id} />
                </div>
                <WidgetExportButton
                  widgetId={widget.type}
                  widgetTitle={getWidgetTitle(widget.type)}
                />
              </CardHeader>
              <CardContent className="space-y-3 px-4 pb-4">
                {/* Hero */}
                <div className="flex items-end justify-between p-4 rounded-xl bg-primary/5 border border-primary/20">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Total de Projetos Ativos
                    </p>
                    <p className="text-3xl font-bold mt-0.5">{wApW.total}</p>
                  </div>
                  <div className="text-right">
                    <span className="flex items-center gap-1 text-sm font-semibold text-success justify-end">
                      <TrendingUp className="h-4 w-4" />+{wApW.growth}%
                    </span>
                    <p className="text-xs text-muted-foreground">vs anterior</p>
                  </div>
                </div>
                {/* 2-per-row compact cards */}
                <div className="grid grid-cols-2 gap-2.5">
                  {apTypes.map((t) => (
                    <div
                      key={t.label}
                      className={`p-2.5 rounded-xl border ${t.bg}`}
                    >
                      <div className="flex items-start justify-between">
                        <p className="text-xs text-muted-foreground">
                          {t.label}
                        </p>
                        <div className="flex items-end gap-0.5 h-6">
                          {apBarHeights.map((h, i) => (
                            <div
                              key={i}
                              className={`w-1 ${t.bar[i]} rounded-t`}
                              style={{ height: `${h}%` }}
                            />
                          ))}
                        </div>
                      </div>
                      <p className={`text-xl font-bold mt-0.5 ${t.text}`}>
                        {t.value}
                      </p>
                      <p className="text-[10px] text-success">+{t.growth}%</p>
                    </div>
                  ))}
                  {/* Novos no período — full width */}
                  <div className="col-span-2 flex items-center justify-between p-2.5 rounded-xl border border-teal-200/60 dark:border-teal-800/60 bg-teal-50/50 dark:bg-teal-950/10">
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                      <span className="text-sm font-semibold">
                        Novos no período:
                      </span>
                      <span className="text-sm font-bold text-teal-700 dark:text-teal-300">
                        {wApW.newTotal}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>
                        <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                          Agências:{" "}
                        </span>
                        {wApW.newAgencies}
                      </span>
                      <span>•</span>
                      <span>
                        <span className="text-amber-600 dark:text-amber-400 font-medium">
                          LP:{" "}
                        </span>
                        {wApW.newLeadPremium}
                      </span>
                    </div>
                  </div>
                </div>
                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs bg-transparent"
                  >
                    <FileText className="h-3.5 w-3.5 mr-1" />
                    Ver detalhes
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs bg-transparent"
                  >
                    <Download className="h-3.5 w-3.5 mr-1" />
                    Exportar gráfico
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Comparado ao mesmo período anterior
                </p>
              </CardContent>
            </Card>
          </div>
        );
      }

      case "statusOverview": {
        const wSoW = generateDashboardData(
          effectivePeriod.from,
          effectivePeriod.to,
        ).statusOverview;
        const soSections = [
          {
            label: "Projetos",
            icon: <Briefcase className="h-4 w-4" />,
            iconBg: "bg-blue-500/10",
            iconColor: "text-blue-500",
            href: "/company/projetos",
            items: [
              {
                label: "Andamento",
                count: wSoW.projects.ongoing,
                status: "ongoing",
                bg: "bg-blue-500/10",
                text: "text-blue-600 dark:text-blue-400",
                dot: "bg-blue-500",
              },
              {
                label: "Aprovados",
                count: wSoW.projects.approved,
                status: "approved",
                bg: "bg-green-500/10",
                text: "text-green-600 dark:text-green-400",
                dot: "bg-green-500",
              },
              {
                label: "Concluídos",
                count: wSoW.projects.completed,
                status: "completed",
                bg: "bg-emerald-500/10",
                text: "text-emerald-600 dark:text-emerald-400",
                dot: "bg-emerald-500",
              },
              {
                label: "Cancelados",
                count: wSoW.projects.cancelled,
                status: "cancelled",
                bg: "bg-red-500/10",
                text: "text-red-600 dark:text-red-400",
                dot: "bg-red-500",
              },
              {
                label: "Atraso",
                count: wSoW.projects.delayed,
                status: "delayed",
                bg: "bg-amber-500/10",
                text: "text-amber-600 dark:text-amber-400",
                dot: "bg-amber-500",
              },
            ],
          },
          {
            label: "Tarefas",
            icon: <CheckSquare className="h-4 w-4" />,
            iconBg: "bg-violet-500/10",
            iconColor: "text-violet-500",
            href: "/company/tarefas",
            items: [
              {
                label: "Contratadas",
                count: wSoW.tasks.contracted,
                status: "contracted",
                bg: "bg-purple-500/10",
                text: "text-purple-600 dark:text-purple-400",
                dot: "bg-purple-500",
              },
              {
                label: "Execução",
                count: wSoW.tasks.inProgress,
                status: "inprogress",
                bg: "bg-blue-500/10",
                text: "text-blue-600 dark:text-blue-400",
                dot: "bg-blue-500",
              },
              {
                label: "Concluídas",
                count: wSoW.tasks.completed,
                status: "completed",
                bg: "bg-green-500/10",
                text: "text-green-600 dark:text-green-400",
                dot: "bg-green-500",
              },
              {
                label: "Arquivadas",
                count: wSoW.tasks.archived,
                status: "archived",
                bg: "bg-slate-500/10",
                text: "text-slate-600 dark:text-slate-400",
                dot: "bg-slate-500",
              },
            ],
          },
          {
            label: "Leads",
            icon: <Users className="h-4 w-4" />,
            iconBg: "bg-cyan-500/10",
            iconColor: "text-cyan-500",
            href: "/company/projetos",
            items: [
              {
                label: "Novos",
                count: wSoW.leads.new,
                status: "new",
                bg: "bg-cyan-500/10",
                text: "text-cyan-600 dark:text-cyan-400",
                dot: "bg-cyan-500",
              },
              {
                label: "Contato",
                count: wSoW.leads.contacted,
                status: "contacted",
                bg: "bg-blue-500/10",
                text: "text-blue-600 dark:text-blue-400",
                dot: "bg-blue-500",
              },
              {
                label: "Proposta",
                count: wSoW.leads.proposal,
                status: "proposal",
                bg: "bg-violet-500/10",
                text: "text-violet-600 dark:text-violet-400",
                dot: "bg-violet-500",
              },
              {
                label: "Fechados",
                count: wSoW.leads.won,
                status: "won",
                bg: "bg-green-500/10",
                text: "text-green-600 dark:text-green-400",
                dot: "bg-green-500",
              },
              {
                label: "Perdidos",
                count: wSoW.leads.lost,
                status: "lost",
                bg: "bg-red-500/10",
                text: "text-red-600 dark:text-red-400",
                dot: "bg-red-500",
              },
            ],
          },
        ];
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
            <Card className="border-0 shadow-lg overflow-hidden">
              <CardHeader className="pb-3 relative">
                <div className="flex items-center gap-3 pr-20">
                  {isCustomizeMode && (
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                    <LayoutGrid className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base font-semibold leading-tight whitespace-nowrap">
                      Visão Geral por Status
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Status de projetos, tarefas e leads
                    </p>
                  </div>
                </div>
                <div className="mt-2">
                  <WidgetPeriodSelector widgetId={widget.id} />
                </div>
                <WidgetExportButton
                  widgetId={widget.type}
                  widgetTitle={getWidgetTitle(widget.type)}
                />
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-4">
                {soSections.map((section) => (
                  <div key={section.label}>
                    <div
                      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md ${section.iconBg} mb-2`}
                    >
                      <span className={section.iconColor}>{section.icon}</span>
                      <span
                        className={`text-xs font-semibold ${section.iconColor}`}
                      >
                        {section.label}
                      </span>
                    </div>
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-1.5">
                      {section.items.map((item) => (
                        <button
                          key={item.status}
                          onClick={() => {
                            window.location.href = `${section.href}?status=${item.status}`;
                          }}
                          className={`p-2.5 rounded-lg ${item.bg} hover:brightness-90 transition-all duration-200 text-left group`}
                        >
                          <div
                            className={`text-base font-bold leading-none ${item.text}`}
                          >
                            {item.count}
                          </div>
                          <div className="text-[10px] leading-tight text-muted-foreground mt-1 truncate">
                            {item.label}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        );
      }

      case "tasks": {
        const wTasksW = getCompanyData(
          effectivePeriod.from ?? getDateRangeFromPeriod(globalPeriod.type, globalPeriod.from, globalPeriod.to).from,
          effectivePeriod.to   ?? getDateRangeFromPeriod(globalPeriod.type, globalPeriod.from, globalPeriod.to).to,
        ).tasks;
        return (
          <Card className="overflow-hidden" data-widget-id={widget.type}>
            <CardHeader className="pb-4 relative">
              <div className="flex items-center gap-3 pr-20">
                <div className="p-2 bg-success/10 rounded-lg shrink-0">
                  <CheckSquare className="h-4 w-4 text-success" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base font-semibold leading-tight">
                    Tarefas (Resumo)
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Executadas, em execução e contratadas
                  </p>
                </div>
              </div>
              <div className="mt-2">
                <WidgetPeriodSelector widgetId={widget.id} />
              </div>
              <WidgetExportButton
                widgetId={widget.type}
                widgetTitle={getWidgetTitle(widget.type)}
              />
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {[
                {
                  label: "Concluídas",
                  value: wTasksW.completed,
                  change: wTasksW.completedGrowth,
                  color: "text-success",
                },
                {
                  label: "Em Execução",
                  value: wTasksW.inProgress,
                  change: wTasksW.inProgressGrowth,
                  color: "text-info",
                },
                {
                  label: "Contratadas",
                  value: wTasksW.contracted,
                  change: wTasksW.contractedGrowth,
                  color: "text-warning",
                },
                {
                  label: "Canceladas",
                  value: wTasksW.cancelled,
                  change: wTasksW.cancelledChange,
                  color: "text-destructive",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <span className="text-sm font-medium text-muted-foreground">
                    {item.label}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-lg font-bold ${item.color}`}>
                      {item.value.toLocaleString("pt-BR")}
                    </span>
                    <span
                      className={`text-xs font-medium ${item.change >= 0 ? "text-success" : "text-destructive"}`}
                    >
                      {item.change >= 0 ? "+" : ""}
                      {item.change}%
                    </span>
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs text-muted-foreground">
                    SLA — dentro do prazo
                  </p>
                  <span className="text-sm font-bold text-success">
                    {wTasksW.slaCompliance.toFixed(1).replace(".", ",")}%
                  </span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-2 bg-success rounded-full"
                    style={{ width: `${wTasksW.slaCompliance}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      }

      default:
        return null;
    }
  };

  // Updated floating button position
  // Completely redesigned widget modal - side panel without overlay
  const handleSaveDashboard = () => {
    if (!newDashboardName.trim()) return;

    const newDashboard: SavedDashboard = {
      id: `dashboard-${Date.now()}`,
      name: newDashboardName.trim(),
      widgets: widgets,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isGlobal: false,
      isDefault: false,
      sharedWith: [],
      createdBy: "current-user",
    };

    const updatedDashboards = [...savedDashboards, newDashboard];
    setSavedDashboards(updatedDashboards);
    localStorage.setItem(DASHBOARD_STORAGE_KEY["COMPANY"], JSON.stringify(updatedDashboards));
    localStorage.setItem(CURRENT_DASHBOARD_KEY["COMPANY"], newDashboard.id);

    setCurrentDashboardId(newDashboard.id);
    setNewDashboardName("");
    setShowSaveDashboardDialog(false);
    toast({
      title: "Dashboard criado",
      description: `"${newDashboard.name}" foi salvo com sucesso.`,
    });
  };

  const handleEditDashboard = (dashboardId: string) => {
    const dashboard = savedDashboards.find((d) => d.id === dashboardId);
    if (dashboard) {
      // Carregar os widgets do dashboard selecionado
      setWidgets(dashboard.widgets);
      setCurrentDashboardId(dashboardId);
      toast({
        title: "Modo de edição ativado",
        description: `Editando dashboard: ${dashboard.name}`,
      });
    }
  };

  const handleSaveSharing = () => {
    if (!sharingDashboardId) return;

    const updatedDashboards = savedDashboards.map((d) =>
      d.id === sharingDashboardId
        ? {
            ...d,
            isGlobal: shareGlobal,
            sharedWith: shareWithProfessionals,
            updatedAt: new Date().toISOString(),
          }
        : d,
    );

    setSavedDashboards(updatedDashboards);
    localStorage.setItem(DASHBOARD_STORAGE_KEY["COMPANY"], JSON.stringify(updatedDashboards));

    setSharingDashboardId(null);
    setShareGlobal(false);
    setShareWithProfessionals([]);
    setProfessionalSearch("");
    setShowShareDialog(false);
  };

  const handleToggleProfessional = (professionalId: string) => {
    setShareWithProfessionals((prev) =>
      prev.includes(professionalId)
        ? prev.filter((id) => id !== professionalId)
        : [...prev, professionalId],
    );
  };

  const handleLoadDashboard = (dashboardId: string) => {
    const dashboard = savedDashboards.find((d) => d.id === dashboardId);
    if (dashboard) {
      setWidgets(dashboard.widgets);
      setCurrentDashboardId(dashboardId);
      localStorage.setItem(
        "dashboard-widget-config-company",
        JSON.stringify(dashboard.widgets),
      );
      localStorage.setItem(CURRENT_DASHBOARD_KEY["COMPANY"], dashboardId);
    }
  };

  const handleDeleteDashboard = (dashboardId: string) => {
    const updatedDashboards = savedDashboards.filter(
      (d) => d.id !== dashboardId,
    );
    setSavedDashboards(updatedDashboards);
    localStorage.setItem(DASHBOARD_STORAGE_KEY["COMPANY"], JSON.stringify(updatedDashboards));
    if (currentDashboardId === dashboardId) {
      const fallback =
        updatedDashboards.find((d) => d.isDefault) ?? updatedDashboards[0];
      if (fallback) {
        setCurrentDashboardId(fallback.id);
        setWidgets(fallback.widgets);
      } else setCurrentDashboardId(null);
    }
  };

  const handleSetDefaultDashboard = (dashboardId: string) => {
    const updatedDashboards = savedDashboards.map((d) => ({
      ...d,
      isDefault: d.id === dashboardId,
    }));
    setSavedDashboards(updatedDashboards);
    localStorage.setItem(DASHBOARD_STORAGE_KEY["COMPANY"], JSON.stringify(updatedDashboards));
    toast({
      title: "Dashboard padrão definido",
      description: "Este dashboard será carregado automaticamente.",
    });
  };

  const getPresetDashboards = (): SavedDashboard[] => {
    const mk = (type: WidgetType, order: number): WidgetState => ({
      id: `preset-${type}-${order}`,
      type,
      visible: true,
      order,
    });
    return [
      {
        id: "preset-financeiro",
        name: "Visão Financeira",
        isDefault: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: "system",
        sharedWith: [],
        widgets: [
          mk("revenue", 0),
          mk("mrr", 1),
          mk("averageTicket", 2),
          mk("ltv", 3),
          mk("churn", 4),
          mk("cmv", 5),
          mk("accountsReceivable", 6),
          mk("creditPlans", 7),
        ],
      },
      {
        id: "preset-vendas",
        name: "Visão de Vendas",
        isDefault: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: "system",
        sharedWith: [],
        widgets: [
          mk("metrics", 0),
          mk("activeProjectsWidget", 1),
          mk("statusOverview", 2),
          mk("agenciesRanking", 3),
          mk("tasks", 4),
          mk("platformActivities", 5),
          mk("alerts", 6),
          mk("quickActions", 7),
        ],
      },
      {
        id: "preset-nomades",
        name: "Visão de Nômades",
        isDefault: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: "system",
        sharedWith: [],
        widgets: [
          mk("nomads", 0),
          mk("nomadsIndicators", 1),
          mk("nomadsRanking", 2),
          mk("performers", 3),
          mk("userDistribution", 4),
          mk("activeUsers", 5),
        ],
      },
    ];
  };

  if (dashboardLoading) {
    return <PageLoader text="Carregando painel…" />;
  }

  if (dashboardError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[420px] gap-6 text-center px-6">
        <div className="rounded-full bg-red-50 dark:bg-red-950/40 p-4">
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">
            Erro ao carregar o painel
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
            {dashboardError}
          </p>
        </div>
        <Button onClick={refetchDashboard} className="btn-brand">
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <>
    <DashboardShellFrame ref={dashboardScrollRef}>
      {/* Aviso de erro de carregamento — distinto de "zero real"/"sem
          dados". Se a busca real falhar, os números seguem no mock de
          fallback local, então o aviso é essencial pra não passar a
          impressão de dado real (ver widgetData/widgetDataError acima). */}
      {widgetDataError && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="flex-1">
            Não foi possível carregar alguns dados do dashboard. Os números afetados podem não refletir a realidade atual.
          </span>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs shrink-0"
            onClick={() => setGlobalPeriod((p) => ({ ...p }))}
          >
            Tentar novamente
          </Button>
        </div>
      )}
      {/* Sticky Dashboard Header */}
      <div
        className={cn(
          "sticky top-0 z-20 transition-all duration-300",
          isHeaderCompact
            ? "bg-background/95 backdrop-blur-sm border-b border-border/40 shadow-sm"
            : "bg-transparent",
        )}
      >
        {/* Dashboard Header */}
        <div
          className={cn(
            "flex items-center gap-3",
            isHeaderCompact ? "py-2" : "pt-0 pb-5",
          )}
        >
          {/* ── Unified toolbar (inclui o título) ───────────────────────────── */}
          <div className="flex-1 min-w-0 flex flex-wrap items-center gap-x-1 gap-y-2 bg-background border border-border/70 rounded-xl px-[13px] py-[10px] shadow-[0_4px_24px_-4px_rgba(0,0,0,0.10),0_1px_6px_-2px_rgba(0,0,0,0.06)]">

            {/* Título + info */}
            <div className="flex items-center gap-1 shrink-0 mr-2">
              <div className="overflow-hidden">
                <h1
                  className={cn(
                    "font-bold text-slate-900 dark:text-white tracking-tight transition-all duration-300",
                    isHeaderCompact ? "text-base" : "text-2xl sm:text-3xl lg:text-4xl xl:text-[46px]",
                  )}
                >
                  Dashboard
                </h1>
              </div>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="flex items-center justify-center h-5 w-5 rounded-full hover:bg-muted transition-colors shrink-0 self-center">
                      <Info className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2.5} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[220px] p-3" sideOffset={6}>
                    <p className="font-semibold text-xs mb-1.5">Dashboard da Empresa</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Resumo dos seus projetos, tarefas, aprovações e contratações.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Divider */}
            <div className="hidden xl:block w-px h-5 bg-border/60 mx-1 shrink-0" />

            {/* GLOBAL pill — hover shows gradient; hovering badge or info shows tooltip */}
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 shrink-0 cursor-default">
                    <div className="group relative flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border/60 hover:border-transparent overflow-hidden transition-all">
                      <span className="absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: "linear-gradient(135deg,#000000 0%,#1a2a6f 45%,#c81a7f 100%)" }} />
                      <Globe className="relative z-10 h-3.5 w-3.5 shrink-0 text-[#7d1b6a] group-hover:text-white transition-colors" />
                      <span className="relative z-10 text-[11px] font-medium uppercase tracking-wider leading-none bg-clip-text text-transparent [background-image:linear-gradient(135deg,#1a2a6f_0%,#7d1b6a_55%,#c81a7f_100%)] group-hover:[background-image:none] group-hover:text-white transition-colors">
                        GLOBAL
                      </span>
                    </div>
                    <Info className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2.5} />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[240px] p-3" sideOffset={6}>
                  <p className="font-semibold text-xs mb-1.5">Período global do dashboard</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    O período selecionado aqui é aplicado automaticamente a <strong>todos os widgets</strong> do dashboard.
                  </p>
                  <div className="mt-2 pt-2 border-t border-border/50">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Para ajustar o período de um widget específico, clique em <strong>"Global"</strong> no cabeçalho de cada widget.
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Divider */}
            <div className="hidden xl:block w-px h-5 bg-border/60 mx-1 shrink-0" />

            {/* Período: label + pill + info tooltip */}
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 shrink-0 cursor-default">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Período:</span>
                      <Popover open={isPeriodPickerOpen} onOpenChange={setIsPeriodPickerOpen}>
                <PopoverTrigger asChild>
                  <button className="group relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border/60 hover:border-transparent overflow-hidden transition-all">
                    <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: "linear-gradient(135deg,#000000 0%,#1a2a6f 45%,#c81a7f 100%)" }} />
                    <Calendar className="relative z-10 h-3 w-3 shrink-0 text-[#7d1b6a] group-hover:text-white transition-colors" />
                    <span className="relative z-10 text-xs font-semibold max-w-[140px] truncate bg-clip-text text-transparent [background-image:linear-gradient(135deg,#1a2a6f_0%,#7d1b6a_55%,#c81a7f_100%)] group-hover:[background-image:none] group-hover:text-white transition-colors">
                      {globalPeriod.label}
                    </span>
                    <ChevronDown className="relative z-10 h-3 w-3 shrink-0 text-[#c81a7f] group-hover:text-white transition-colors" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-0 overflow-hidden rounded-xl shadow-[0_8px_32px_-4px_rgba(0,0,0,0.18),0_2px_8px_-2px_rgba(0,0,0,0.10)] border border-border/60" align="start">
                  {/* Header */}
                  <div className="px-3 py-2 border-b border-border/50">
                    <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest">Período</p>
                  </div>
                  {/* Options */}
                  <div className="p-1">
                    {periodOptions
                      .filter((o) => o.type !== "custom")
                      .map((option) => {
                        const isActive = globalPeriod.type === option.type && globalPeriod.label !== "Últimos 90 dias";
                        return (
                          <button
                            key={option.type}
                            onClick={() => handlePeriodChange(option.type, option.label)}
                            className="group w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all text-left hover:bg-muted/50"
                          >
                            <span className={cn(
                              "text-xs font-medium transition-colors",
                              isActive
                                ? "bg-clip-text text-transparent [background-image:linear-gradient(135deg,#1a2a6f_0%,#7d1b6a_55%,#c81a7f_100%)]"
                                : "text-foreground group-hover:bg-clip-text group-hover:text-transparent group-hover:[background-image:linear-gradient(135deg,#1a2a6f_0%,#7d1b6a_55%,#c81a7f_100%)]"
                            )}>
                              {option.label}
                            </span>
                            {isActive && <Check className="h-3 w-3 flex-shrink-0 text-[#c81a7f]" />}
                          </button>
                        );
                      })}
                    {(() => {
                      const isActive = globalPeriod.label === "Últimos 90 dias";
                      return (
                        <button
                          onClick={() => {
                            const today = new Date();
                            const d = new Date(today);
                            d.setDate(d.getDate() - 90);
                            setGlobalPeriod({ type: "custom", from: d, to: today, label: "Últimos 90 dias" });
                            setIsPeriodPickerOpen(false);
                          }}
                          className="group w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all text-left hover:bg-muted/50"
                        >
                          <span className={cn(
                            "text-xs font-medium transition-colors",
                            isActive
                              ? "bg-clip-text text-transparent [background-image:linear-gradient(135deg,#1a2a6f_0%,#7d1b6a_55%,#c81a7f_100%)]"
                              : "text-foreground group-hover:bg-clip-text group-hover:text-transparent group-hover:[background-image:linear-gradient(135deg,#1a2a6f_0%,#7d1b6a_55%,#c81a7f_100%)]"
                          )}>
                            Últimos 90 dias
                          </span>
                          {isActive && <Check className="h-3 w-3 flex-shrink-0 text-[#c81a7f]" />}
                        </button>
                      );
                    })()}
                  </div>
                  {/* Custom interval */}
                  <div className="border-t border-border/50 p-2.5 space-y-2 bg-muted/20">
                    <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest">Personalizado</p>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] text-muted-foreground font-medium w-6 shrink-0">De</label>
                        <input
                          type="date"
                          value={customPeriodFrom ? format(customPeriodFrom, "yyyy-MM-dd") : ""}
                          onChange={(e) => setCustomPeriodFrom(e.target.value ? new Date(e.target.value + "T00:00:00") : undefined)}
                          className="flex-1 h-7 px-2 text-xs border border-border/60 rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-[#7d1b6a]/40"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] text-muted-foreground font-medium w-6 shrink-0">Até</label>
                        <input
                          type="date"
                          value={customPeriodTo ? format(customPeriodTo, "yyyy-MM-dd") : ""}
                          onChange={(e) => setCustomPeriodTo(e.target.value ? new Date(e.target.value + "T00:00:00") : undefined)}
                          className="flex-1 h-7 px-2 text-xs border border-border/60 rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-[#7d1b6a]/40"
                        />
                      </div>
                    </div>
                    <button
                      disabled={!customPeriodFrom || !customPeriodTo}
                      onClick={applyCustomPeriod}
                      className="relative w-full h-7 rounded-lg overflow-hidden text-[11px] font-semibold text-white transition-opacity disabled:opacity-40"
                    >
                      <span className="absolute inset-0" style={{ background: "linear-gradient(135deg,#000000 0%,#1a2a6f 45%,#c81a7f 100%)" }} />
                      <span className="relative z-10">Aplicar</span>
                    </button>
                  </div>
                </PopoverContent>
                      </Popover>
                    </div>
                    <Info className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2.5} />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[240px] p-3" sideOffset={6}>
                  <p className="font-semibold text-xs mb-1.5">Período global do dashboard</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    O período selecionado aqui é aplicado a <strong>todos os widgets</strong> do dashboard.
                  </p>
                  <div className="mt-2 pt-2 border-t border-border/50">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Para ajustar um widget específico, clique em <strong>"Global"</strong> no cabeçalho do widget.
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Divider */}
            <div className="hidden xl:block w-px h-5 bg-border/60 mx-1 shrink-0" />

            {/* Dashboard selector */}
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 shrink-0 cursor-default">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="group relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border/60 hover:border-transparent overflow-hidden transition-all max-w-[200px]">
                          <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: "linear-gradient(135deg,#000000 0%,#1a2a6f 45%,#c81a7f 100%)" }} />
                          <LayoutGrid className="relative z-10 h-3.5 w-3.5 shrink-0 text-[#7d1b6a] group-hover:text-white transition-colors" />
                          <span className="relative z-10 text-xs font-semibold truncate bg-clip-text text-transparent [background-image:linear-gradient(135deg,#1a2a6f_0%,#7d1b6a_55%,#c81a7f_100%)] group-hover:[background-image:none] group-hover:text-white transition-colors">
                            {isViewingTemplateDefault
                              ? `${profileTemplate?.name ?? "Padrão"} (Padrão)`
                              : savedDashboards.find((d) => d.id === currentDashboardId)?.name ?? "Selecionar dashboard"}
                          </span>
                          <ChevronDown className="relative z-10 h-3 w-3 shrink-0 ml-auto text-[#c81a7f] group-hover:text-white transition-colors" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-auto min-w-48 max-w-72 p-0 overflow-hidden rounded-xl shadow-[0_8px_32px_-4px_rgba(0,0,0,0.18),0_2px_8px_-2px_rgba(0,0,0,0.10)] border border-border/60">
                        {/* Header */}
                        <div className="px-3 py-2 border-b border-border/50">
                          <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest">Dashboards salvos</p>
                        </div>
                        {/* Dashboard list */}
                        <div className="p-1">
                          {profileTemplate && (
                            <div className="group flex items-center gap-1 rounded-lg hover:bg-muted/50 transition-all">
                              <button
                                className="flex items-center gap-2 flex-1 text-left px-2.5 py-1.5 min-w-0"
                                onClick={() => {
                                  setCurrentDashboardId(TEMPLATE_DASHBOARD_ID);
                                  setWidgets(profileTemplate.widgets as WidgetState[]);
                                  toast({ title: "Dashboard carregado", description: `${profileTemplate.name} (Padrão)` });
                                }}
                              >
                                <Lock className={cn("h-3.5 w-3.5 shrink-0 transition-colors", isViewingTemplateDefault ? "text-[#7d1b6a]" : "text-muted-foreground group-hover:text-[#7d1b6a]")} />
                                <span className={cn(
                                  "text-xs font-medium transition-colors truncate",
                                  isViewingTemplateDefault
                                    ? "bg-clip-text text-transparent [background-image:linear-gradient(135deg,#1a2a6f_0%,#7d1b6a_55%,#c81a7f_100%)]"
                                    : "text-foreground group-hover:bg-clip-text group-hover:text-transparent group-hover:[background-image:linear-gradient(135deg,#1a2a6f_0%,#7d1b6a_55%,#c81a7f_100%)]"
                                )}>
                                  {profileTemplate.name} (Padrão)
                                </span>
                                {isViewingTemplateDefault && <Check className="h-3 w-3 shrink-0 ml-auto text-[#c81a7f]" />}
                              </button>
                            </div>
                          )}
                          {profileTemplate && savedDashboards.length > 0 && (
                            <div className="my-1 h-px bg-border/50" />
                          )}
                          {savedDashboards.map((db) => {
                            const isActive = currentDashboardId === db.id;
                            return (
                              <div key={db.id} className="group flex items-center gap-1 rounded-lg hover:bg-muted/50 transition-all">
                                <button
                                  className="flex items-center gap-2 flex-1 text-left px-2.5 py-1.5 min-w-0"
                                  onClick={() => {
                                    handleLoadDashboard(db.id);
                                    toast({ title: "Dashboard carregado", description: db.name });
                                  }}
                                >
                                  <LayoutGrid className={cn("h-3.5 w-3.5 shrink-0 transition-colors", isActive ? "text-[#7d1b6a]" : "text-muted-foreground group-hover:text-[#7d1b6a]")} />
                                  <span className={cn(
                                    "text-xs font-medium transition-colors",
                                    isActive
                                      ? "bg-clip-text text-transparent [background-image:linear-gradient(135deg,#1a2a6f_0%,#7d1b6a_55%,#c81a7f_100%)]"
                                      : "text-foreground group-hover:bg-clip-text group-hover:text-transparent group-hover:[background-image:linear-gradient(135deg,#1a2a6f_0%,#7d1b6a_55%,#c81a7f_100%)]"
                                  )}>
                                    {db.name}
                                  </span>
                                  {isActive && <Check className="h-3 w-3 shrink-0 ml-auto text-[#c81a7f]" />}
                                </button>
                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity pr-1.5 shrink-0">
                                  <button
                                    onClick={() => handleSetDefaultDashboard(db.id)}
                                    className="p-1 rounded hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                                    title={db.isDefault ? "Dashboard padrão" : "Definir como padrão"}
                                  >
                                    <Star className={cn("h-3 w-3", db.isDefault ? "fill-amber-400 text-amber-400" : "text-muted-foreground hover:text-amber-400")} />
                                  </button>
                                  <button
                                    onClick={() => { setDeletingDashboardId(db.id); setShowDeleteDashboardDialog(true); }}
                                    className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                                    title="Excluir dashboard"
                                  >
                                    <Trash2 className="h-3 w-3 text-muted-foreground hover:text-red-500" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                          {savedDashboards.length === 0 && !profileTemplate && (
                            <p className="px-3 py-3 text-xs text-muted-foreground text-center">Nenhum dashboard salvo</p>
                          )}
                        </div>
                        {/* Footer action */}
                        <div className="border-t border-border/50 p-1">
                          <DropdownMenuItem
                            onSelect={() => {
                              editor.reset([]);
                              editor.setMode("adicionar");
                              setEditHeaderName("");
                              setIsEditingHeaderName(true);
                              setIsNewDashboardMode(true);
                              setIsEditDashboardModalOpen(true);
                            }}
                            className="group flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer hover:bg-muted/50 transition-all"
                          >
                            <Plus className="h-3.5 w-3.5 text-[#7d1b6a]" />
                            <span className="bg-clip-text text-transparent [background-image:linear-gradient(135deg,#1a2a6f_0%,#7d1b6a_55%,#c81a7f_100%)]">
                              Criar novo dashboard
                            </span>
                          </DropdownMenuItem>
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Info className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2.5} />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[220px] p-3" sideOffset={6}>
                  <p className="font-semibold text-xs mb-1.5">Selecionar dashboard</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Escolha entre os dashboards salvos para alternar a <strong>visão geral da área</strong>.
                  </p>
                  <div className="mt-2 pt-2 border-t border-border/50">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Use <strong>"Criar novo dashboard"</strong> para organizar diferentes configurações de widgets.
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Divider */}
            <div className="hidden xl:block w-px h-5 bg-border/60 mx-1 shrink-0" />

            {/* Ações (Export/Histórico/Compartilhar/Editar) — colam à direita no desktop, quebram no mobile.
                data-export-ignore: nenhum desses controles deve aparecer no PDF/PNG exportado. */}
            <div className="flex items-center gap-1 shrink-0 xl:ml-auto" data-export-ignore="">

            {/* Item 8/9 — o padrão do Admin não se edita direto. */}
            {profileTemplate && (
            <TooltipProvider delayDuration={400}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      if (isViewingTemplateDefault) {
                        createPersonalViewFromTemplate();
                        toast({ title: "Visão pessoal criada a partir do padrão" });
                      } else if (
                        confirm("Restaurar esta visão para o template padrão atual? Isso substitui os widgets dela.")
                      ) {
                        const seeded = (profileTemplate.widgets as WidgetState[]).map((w) => ({ ...w }));
                        setWidgets(seeded);
                        setSavedDashboards((prev) => {
                          const next = prev.map((d) => (d.id === currentDashboardId ? { ...d, widgets: seeded } : d));
                          localStorage.setItem(DASHBOARD_STORAGE_KEY["COMPANY"], JSON.stringify(next));
                          return next;
                        });
                      }
                    }}
                    className="group relative flex items-center justify-center h-8 w-8 rounded-lg border border-border/60 hover:border-transparent overflow-hidden transition-all"
                  >
                    <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: "linear-gradient(135deg,#000000 0%,#1a2a6f 45%,#c81a7f 100%)" }} />
                    <RotateCcw className="relative z-10 h-4 w-4 text-[#7d1b6a] group-hover:text-white transition-colors" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={6}>
                  {isViewingTemplateDefault ? "Criar visão personalizada" : "Restaurar para o padrão"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            )}

            {/* Export */}
            <TooltipProvider delayDuration={400}>
              <Tooltip>
                <Popover open={showExportMenu} onOpenChange={setShowExportMenu}>
                  <PopoverTrigger asChild>
                    <TooltipTrigger asChild>
                      <button
                        disabled={isExporting}
                        className="group relative flex items-center justify-center h-8 w-8 rounded-lg border border-border/60 hover:border-transparent overflow-hidden transition-all disabled:opacity-50"
                      >
                        <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: "linear-gradient(135deg,#000000 0%,#1a2a6f 45%,#c81a7f 100%)" }} />
                        <Download className={cn("relative z-10 h-4 w-4 text-[#7d1b6a] group-hover:text-white transition-colors", isExporting && "animate-pulse")} />
                      </button>
                    </TooltipTrigger>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-1.5" align="end">
                    <button
                      onClick={() => { setShowExportMenu(false); handleExportAs("pdf"); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg hover:bg-accent transition-all text-left"
                    >
                      <FileText className="h-3.5 w-3.5 text-red-500" />
                      Exportar como PDF
                    </button>
                    <button
                      onClick={() => { setShowExportMenu(false); handleExportAs("png"); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg hover:bg-accent transition-all text-left"
                    >
                      <ImageDown className="h-3.5 w-3.5 text-blue-500" />
                      Exportar como PNG
                    </button>
                  </PopoverContent>
                </Popover>
                <TooltipContent side="bottom" sideOffset={6}>Exportar</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Histórico */}
            <TooltipProvider delayDuration={400}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => openHistoricalModal()}
                    className="group relative flex items-center justify-center h-8 w-8 rounded-lg border border-border/60 hover:border-transparent overflow-hidden transition-all"
                  >
                    <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: "linear-gradient(135deg,#000000 0%,#1a2a6f 45%,#c81a7f 100%)" }} />
                    <History className="relative z-10 h-4 w-4 text-[#7d1b6a] group-hover:text-white transition-colors" />
                    {Object.keys(historicalData).length > 0 && (
                      <span className="absolute top-0.5 right-0.5 bg-amber-500 text-white rounded-full text-[8px] h-3.5 w-3.5 flex items-center justify-center">
                        {Object.keys(historicalData).length}
                      </span>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={6}>Histórico</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Compartilhar */}
            <TooltipProvider delayDuration={400}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={openDashboardPublicShare}
                    className="group relative flex items-center justify-center h-8 w-8 rounded-lg border border-border/60 hover:border-transparent overflow-hidden transition-all"
                  >
                    <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: "linear-gradient(135deg,#000000 0%,#1a2a6f 45%,#c81a7f 100%)" }} />
                    <Share2 className="relative z-10 h-4 w-4 text-[#7d1b6a] group-hover:text-white transition-colors" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={6}>Compartilhar</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Editar */}
            <TooltipProvider delayDuration={400}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      if (isViewingTemplateDefault) {
                        if (
                          !confirm(
                            "Este é o dashboard padrão definido pelo Admin e não pode ser editado diretamente. Deseja criar uma visão pessoal a partir dele para personalizar?",
                          )
                        ) {
                          return;
                        }
                        createPersonalViewFromTemplate();
                        const seeded = (profileTemplate?.widgets as WidgetState[] ?? []).map((w) => ({ ...w })).sort((a, b) => a.order - b.order);
                        editor.reset(seeded);
                        setEditHeaderName("Minha visão");
                        setIsEditingHeaderName(false);
                        setIsEditDashboardModalOpen(true);
                        return;
                      }
                      editor.reset([...widgets].sort((a, b) => a.order - b.order));
                      const currentDb = savedDashboards.find((d) => d.id === currentDashboardId);
                      setEditHeaderName(currentDb?.name ?? "Dashboard Padrão");
                      setIsEditingHeaderName(false);
                      setIsEditDashboardModalOpen(true);
                    }}
                    className="group relative flex items-center gap-1.5 px-3 py-1.5 ml-1 rounded-lg border border-border/60 hover:border-transparent overflow-hidden transition-all"
                  >
                    <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: "linear-gradient(135deg,#000000 0%,#1a2a6f 45%,#c81a7f 100%)" }} />
                    <Pencil className="relative z-10 h-3.5 w-3.5 shrink-0 text-[#7d1b6a] group-hover:text-white transition-colors" />
                    <span className="relative z-10 text-xs font-semibold bg-clip-text text-transparent [background-image:linear-gradient(135deg,#1a2a6f_0%,#7d1b6a_55%,#c81a7f_100%)] group-hover:[background-image:none] group-hover:text-white transition-colors">
                      Editar
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={6}>Personalizar widgets</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            </div>{/* fim ações */}

          </div>{/* fim toolbar */}
        </div>
      </div>{/* end sticky header */}
      {/* Export capture area: metrics + widgets */}
      <div id="dashboard-export-area" className="flex flex-col gap-4">
        {/* Banners/avisos do template padrão (item 10) */}
        <DashboardTemplateContentList contents={templateContents} onDismiss={dismissTemplateContent} />
        {/* Metrics Cards */}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3" style={{ gridAutoRows: '130px' }}>
          {metricCards
            .filter((m) => m.visible)
            .sort((a, b) => a.order - b.order)
            .map((metric) => renderMetricCard(metric.id))}
        </div>

        {/* Pontos de atenção */}
        {(() => {
          const attentionItems: Array<{
            id: string;
            label: string;
            value: string | number;
            severity: "high" | "medium";
            dest: string;
            icon: React.ElementType;
          }> = [];

          const projectsDelayed = soW?.projects?.delayed ?? 0;
          if (projectsDelayed > 0) {
            attentionItems.push({
              id: "projects-delayed",
              label: `${projectsDelayed} projeto${projectsDelayed > 1 ? "s" : ""} em atraso`,
              value: projectsDelayed,
              severity: "high",
              dest: "/company/projetos",
              icon: AlertTriangle,
            });
          }

          const tasksToLaunch = tasksW.contracted ?? 0;
          if (tasksToLaunch > 0) {
            attentionItems.push({
              id: "tasks-to-launch",
              label: `${tasksToLaunch} tarefa${tasksToLaunch > 1 ? "s" : ""} aguardando lançamento`,
              value: tasksToLaunch,
              severity: "high",
              dest: "/company/tarefas",
              icon: Clock,
            });
          }

          const pendingPaymentsValue =
            Math.max(0, arW.total - arW.received);
          if (pendingPaymentsValue > 0) {
            attentionItems.push({
              id: "pending-payments",
              label: `R$ ${(pendingPaymentsValue / 1000).toFixed(1)}k em pagamentos pendentes`,
              value: pendingPaymentsValue,
              severity: "medium",
              dest: "/company/faturas",
              icon: DollarSign,
            });
          }

          const pendingApprovals = soW?.leads?.proposal ?? 0;
          if (pendingApprovals > 0) {
            attentionItems.push({
              id: "approvals-pending",
              label: `${pendingApprovals} proposta${pendingApprovals > 1 ? "s" : ""} aguardando sua resposta`,
              value: pendingApprovals,
              severity: "medium",
              dest: "/company/projetos",
              icon: FileText,
            });
          }

          if (attentionItems.length === 0) return null;

          return (
            <div className="rounded-2xl border border-amber-200/70 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-800/50 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/40">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  Pontos de atenção
                </h3>
                <span className="ml-auto text-xs text-amber-700/70 dark:text-amber-400/70">
                  {attentionItems.length} item{attentionItems.length > 1 ? "s" : ""} requer{attentionItems.length === 1 ? "" : "em"} atenção
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {attentionItems.map((item) => {
                  const ItemIcon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => navigate(item.dest)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-150 hover:scale-[1.02] cursor-pointer border",
                        item.severity === "high"
                          ? "bg-red-50 border-red-200 hover:bg-red-100 dark:bg-red-950/30 dark:border-red-800/50 dark:hover:bg-red-950/50"
                          : "bg-orange-50 border-orange-200 hover:bg-orange-100 dark:bg-orange-950/30 dark:border-orange-800/50 dark:hover:bg-orange-950/50",
                      )}
                    >
                      <div
                        className={cn(
                          "p-1.5 rounded-lg shrink-0",
                          item.severity === "high"
                            ? "bg-red-100 dark:bg-red-900/40"
                            : "bg-orange-100 dark:bg-orange-900/40",
                        )}
                      >
                        <ItemIcon
                          className={cn(
                            "h-3.5 w-3.5",
                            item.severity === "high"
              ? "text-red-600 dark:text-red-400"
                              : "text-orange-600 dark:text-orange-400",
                          )}
                        />
                      </div>
                      <span
                        className={cn(
                          "text-xs font-medium leading-tight",
                          item.severity === "high"
                            ? "text-red-800 dark:text-red-200"
                            : "text-orange-800 dark:text-orange-200",
                        )}
                      >
                        {item.label}
                      </span>
                      <ArrowRight
                        className={cn(
                          "h-3 w-3 shrink-0 ml-auto",
                          item.severity === "high"
                            ? "text-red-400"
                            : "text-orange-400",
                        )}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Widgets Grid */}
        <div
          id="dashboard-content"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch"
        >
          {widgets
            .filter((w) => w.visible)
            .sort((a, b) => a.order - b.order)
            .map((widget) => (
              <div
                key={`wrap-${widget.id}`}
                className={cn(
                  // col-span based on widget config
                  widget.colSpan === 3
                    ? "lg:col-span-3 md:col-span-2"
                    : widget.colSpan === 2
                      ? "lg:col-span-2 md:col-span-2"
                      : "col-span-1",
                  // propagate height through: grid cell → outer widget div → Card
                  "flex flex-col",
                  "[&>*]:flex-1 [&>*]:flex [&>*]:flex-col",
                  "[&>*>*:last-child]:flex-1",
                )}
              >
                {renderWidget(widget)}
              </div>
            ))}
        </div>
        {/* end dashboard-export-area */}
      </div>

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
                    handleSaveEditedDashboard();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveEditedDashboard}
              disabled={!editingDashboardName.trim()}
            >
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Compartilhar Dashboard</DialogTitle>
            <DialogDescription>
              Escolha como deseja compartilhar este dashboard
            </DialogDescription>
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
                <p className="text-sm text-muted-foreground">
                  Disponível para todas as contas
                </p>
              </div>
              <Switch
                id="share-global"
                checked={shareGlobal}
                onCheckedChange={setShareGlobal}
              />
            </div>

            {/* Professional Sharing */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-green-500" />
                <Label className="font-medium">
                  Compartilhar com Profissionais
                </Label>
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
                  {
                    id: "prof-1",
                    name: "Dr. João Silva",
                    specialty: "Psicólogo",
                  },
                  {
                    id: "prof-2",
                    name: "Dra. Maria Santos",
                    specialty: "Nutricionista",
                  },
                  {
                    id: "prof-3",
                    name: "Dr. Pedro Costa",
                    specialty: "Personal Trainer",
                  },
                  {
                    id: "prof-4",
                    name: "Dra. Ana Lima",
                    specialty: "Terapeuta",
                  },
                ]
                  .filter((prof) =>
                    professionalSearch
                      ? prof.name
                          .toLowerCase()
                          .includes(professionalSearch.toLowerCase())
                      : true,
                  )
                  .map((professional) => (
                    <div
                      key={professional.id}
                      className="flex items-center justify-between p-3 hover:bg-muted/50 border-b last:border-b-0"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {professional.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {professional.specialty}
                        </p>
                      </div>
                      <Switch
                        checked={shareWithProfessionals.includes(
                          professional.id,
                        )}
                        onCheckedChange={() =>
                          handleToggleProfessional(professional.id)
                        }
                      />
                    </div>
                  ))}
              </div>

              {shareWithProfessionals.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {shareWithProfessionals.length} profissional(is)
                  selecionado(s)
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

      <Dialog
        open={showSaveDashboardDialog}
        onOpenChange={setShowSaveDashboardDialog}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Salvar Dashboard</DialogTitle>
            <DialogDescription>
              Dê um nome ao seu dashboard personalizado
            </DialogDescription>
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
                    handleSaveDashboard();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSaveDashboardDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveDashboard}
              disabled={!newDashboardName.trim()}
            >
              Salvar Dashboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Public Share Dialog ───────────────────────────────────────────── */}
      <Dialog
        open={showPublicShareDialog}
        onOpenChange={setShowPublicShareDialog}
      >
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          {/* Brand gradient header strip */}
          <div
            className="px-6 pt-5 pb-4"
            style={{
              background:
                "linear-gradient(135deg, #000000 0%, #1a2a6f 45%, #c81a7f 100%)",
            }}
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-white/15 shrink-0">
                <Share2 className="h-4.5 w-4.5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white leading-tight">
                  Compartilhar via Link
                </h2>
                <p className="text-xs text-white/70 mt-0.5">
                  {shareTarget
                    ? `${shareTarget.type === "widget" ? "Widget" : "Dashboard"}: ${shareTarget.title}`
                    : "Configure as opções e gere um link público"}
                </p>
              </div>
            </div>
          </div>

          <div className="px-6 pt-4 pb-6 space-y-4">
            <Tabs
              value={shareActiveTab}
              onValueChange={setShareActiveTab}
              className="w-full"
            >
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="permission">Configuração</TabsTrigger>
                <TabsTrigger value="links">Links criados</TabsTrigger>
              </TabsList>

              {/* Configuração do novo link — Permissão, URL personalizada,
                  PIN e Expiração vivem juntos aqui porque pertencem ao
                  MESMO link (não faz sentido espalhar em abas separadas,
                  ver item 7 revisado). */}
              <TabsContent value="permission" className="pt-2">
                <ShareCreateForm
                  permission={sharePermission}
                  onPermissionChange={(v) => { setSharePermission(v); setGeneratedShareLink(""); }}
                  slug={shareSlug}
                  onSlugChange={(v) => { setShareSlug(v); setGeneratedShareLink(""); }}
                  pinEnabled={sharePinEnabled}
                  onPinEnabledChange={(v) => { setSharePinEnabled(v); setGeneratedShareLink(""); }}
                  pin={sharePin}
                  onPinChange={(v) => { setSharePin(v); setGeneratedShareLink(""); }}
                  expiryEnabled={shareExpiryEnabled}
                  onExpiryEnabledChange={(v) => { setShareExpiryEnabled(v); setGeneratedShareLink(""); }}
                  expiry={shareExpiry}
                  onExpiryChange={(v) => { setShareExpiry(v); setGeneratedShareLink(""); }}
                  periodLabel={globalPeriod.label}
                  allowFilterChanges={shareAllowFilterChanges}
                  onAllowFilterChangesChange={(v) => { setShareAllowFilterChanges(v); setGeneratedShareLink(""); }}
                  disabled={shareGenerating}
                />
              </TabsContent>

              {/* Links já criados pra este dashboard/widget — sempre
                  filtrado por targetId no backend (routes/dashboard-shares.ts),
                  nunca mistura com links de outro dashboard. */}
              {/* forceMount: este painel precisa ficar montado mesmo com a
                  aba "Configuração" ativa, senão a inserção otimista do
                  link recém-criado (pendingLink) e o refetch por
                  refreshSignal não têm componente nenhum pra reagir —
                  era a causa da regressão "link novo não aparece sem F5". */}
              <TabsContent value="links" className="pt-2 data-[state=inactive]:hidden" forceMount>
                <ShareLinksPanel
                  targetId={shareTarget?.id}
                  refreshSignal={shareRefreshSignal}
                  pendingLink={sharePendingLink}
                />
              </TabsContent>
            </Tabs>

            {/* Generated Link */}
            <div className="space-y-2 pt-1">
              <div className="flex gap-2">
                <Button
                  className="flex-1 btn-brand"
                  onClick={handleGenerateShareLink}
                  disabled={(sharePinEnabled && sharePin.length !== 4) || shareGenerating}
                >
                  <Link2 className="h-4 w-4 mr-1.5" />
                  {shareGenerating ? "Gerando..." : "Gerar Link"}
                </Button>
              </div>
              {generatedShareLink && (
                <div className="flex gap-2 items-center">
                  <Input
                    readOnly
                    value={generatedShareLink}
                    className="text-xs font-mono bg-muted/40"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1.5 border-violet-200 dark:border-violet-700 hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30 text-violet-700 dark:text-violet-400"
                    onClick={handleCopyShareLink}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copiar
                  </Button>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPublicShareDialog(false)}
              >
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* ──────────────────────────────────────────────────────────────────── */}

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

      {/* ── Widget Details Modal ──────────────────────────────────────────── */}
      {WidgetDetailsModal()}

      {/* ── Historical Data Modal ─────────────────────────────────────────── */}
      <Dialog open={showHistoricalModal} onOpenChange={setShowHistoricalModal}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-4 w-4 text-amber-500" />
              Dados Históricos Manuais
            </DialogTitle>
            <DialogDescription>
              Insira dados reais para um mês específico. Serão aplicados sobre
              os dados gerados quando o período do dashboard corresponder a esse
              mês.
            </DialogDescription>
          </DialogHeader>

          {/* Month picker + saved entries count */}
          <div className="flex items-center gap-3 py-2 border-b border-border/40">
            <Label className="text-sm font-medium shrink-0">Mês / Ano:</Label>
            <Input
              type="month"
              value={histModalKey}
              onChange={(e) => {
                setHistModalKey(e.target.value);
                setHistFormData(historicalData[e.target.value] ?? {});
              }}
              className="w-44"
            />
            {historicalData[histModalKey] && (
              <Badge className="text-[10px] bg-amber-100 text-amber-700 border border-amber-300 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-700">
                Dados salvos
              </Badge>
            )}
          </div>

          {/* 4 collapsible groups */}
          <Accordion
            type="multiple"
            defaultValue={["financeiro"]}
            className="space-y-1"
          >
            {/* Group 1: Financeiro */}
            <AccordionItem
              value="financeiro"
              className="border rounded-lg px-3"
            >
              <AccordionTrigger className="text-sm font-semibold py-3">
                💰 Financeiro
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-2 gap-3 pb-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Receita Total (R$)
                    </Label>
                    <Input
                      type="number"
                      placeholder="ex: 85000"
                      value={histFormData.revenue_total ?? ""}
                      onChange={(e) =>
                        setHistField("revenue_total", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      MRR (R$)
                    </Label>
                    <Input
                      type="number"
                      placeholder="ex: 42000"
                      value={histFormData.mrr_total ?? ""}
                      onChange={(e) =>
                        setHistField("mrr_total", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Planos de Crédito (qtd)
                    </Label>
                    <Input
                      type="number"
                      placeholder="ex: 120"
                      value={histFormData.creditPlans_total ?? ""}
                      onChange={(e) =>
                        setHistField("creditPlans_total", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Contas a Receber (R$)
                    </Label>
                    <Input
                      type="number"
                      placeholder="ex: 15000"
                      value={histFormData.accountsReceivable_total ?? ""}
                      onChange={(e) =>
                        setHistField("accountsReceivable_total", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      CMV — Custo Total (R$)
                    </Label>
                    <Input
                      type="number"
                      placeholder="ex: 18000"
                      value={histFormData.cmv_totalCosts ?? ""}
                      onChange={(e) =>
                        setHistField("cmv_totalCosts", e.target.value)
                      }
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Group 2: Projetos & Tarefas */}
            <AccordionItem value="projetos" className="border rounded-lg px-3">
              <AccordionTrigger className="text-sm font-semibold py-3">
                📋 Projetos &amp; Tarefas
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-2 gap-3 pb-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Projetos Ativos (qtd)
                    </Label>
                    <Input
                      type="number"
                      placeholder="ex: 38"
                      value={histFormData.activeProjects_total ?? ""}
                      onChange={(e) =>
                        setHistField("activeProjects_total", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Tarefas Totais (qtd)
                    </Label>
                    <Input
                      type="number"
                      placeholder="ex: 540"
                      value={histFormData.tasks_total ?? ""}
                      onChange={(e) =>
                        setHistField("tasks_total", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Tarefas Concluídas (qtd)
                    </Label>
                    <Input
                      type="number"
                      placeholder="ex: 312"
                      value={histFormData.tasks_completed ?? ""}
                      onChange={(e) =>
                        setHistField("tasks_completed", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Tarefas Em Progresso (qtd)
                    </Label>
                    <Input
                      type="number"
                      placeholder="ex: 95"
                      value={histFormData.tasks_inProgress ?? ""}
                      onChange={(e) =>
                        setHistField("tasks_inProgress", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      SLA Compliance (%)
                    </Label>
                    <Input
                      type="number"
                      placeholder="ex: 89"
                      min="0"
                      max="100"
                      value={histFormData.tasks_slaCompliance ?? ""}
                      onChange={(e) =>
                        setHistField("tasks_slaCompliance", e.target.value)
                      }
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Group 3: Nômades & Parceiros */}
            <AccordionItem value="nomades" className="border rounded-lg px-3">
              <AccordionTrigger className="text-sm font-semibold py-3">
                🌍 Nômades &amp; Parceiros
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-2 gap-3 pb-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Nômades Total (qtd)
                    </Label>
                    <Input
                      type="number"
                      placeholder="ex: 210"
                      value={histFormData.nomads_total ?? ""}
                      onChange={(e) =>
                        setHistField("nomads_total", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Nômades Ativos (qtd)
                    </Label>
                    <Input
                      type="number"
                      placeholder="ex: 178"
                      value={histFormData.nomads_active ?? ""}
                      onChange={(e) =>
                        setHistField("nomads_active", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Parceiros Ativos (qtd)
                    </Label>
                    <Input
                      type="number"
                      placeholder="ex: 45"
                      value={histFormData.partnerProgram_total ?? ""}
                      onChange={(e) =>
                        setHistField("partnerProgram_total", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Convites Enviados (qtd)
                    </Label>
                    <Input
                      type="number"
                      placeholder="ex: 90"
                      value={histFormData.partnerProgram_invitesSent ?? ""}
                      onChange={(e) =>
                        setHistField(
                          "partnerProgram_invitesSent",
                          e.target.value,
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      MRR Gerado Parceiros (R$)
                    </Label>
                    <Input
                      type="number"
                      placeholder="ex: 6200"
                      value={histFormData.partnerProgram_mrrGenerated ?? ""}
                      onChange={(e) =>
                        setHistField(
                          "partnerProgram_mrrGenerated",
                          e.target.value,
                        )
                      }
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Group 4: Churn, Ticket & LTV */}
            <AccordionItem
              value="indicadores"
              className="border rounded-lg px-3"
            >
              <AccordionTrigger className="text-sm font-semibold py-3">
                📊 Churn, Ticket &amp; LTV
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-2 gap-3 pb-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Churn de Receita (%)
                    </Label>
                    <Input
                      type="number"
                      placeholder="ex: 3.2"
                      step="0.1"
                      value={histFormData.churn_revenueChurnRate ?? ""}
                      onChange={(e) =>
                        setHistField("churn_revenueChurnRate", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Receita Perdida — Churn (R$)
                    </Label>
                    <Input
                      type="number"
                      placeholder="ex: 1800"
                      value={histFormData.churn_revenueChurn ?? ""}
                      onChange={(e) =>
                        setHistField("churn_revenueChurn", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Ticket Médio Geral (R$)
                    </Label>
                    <Input
                      type="number"
                      placeholder="ex: 950"
                      value={histFormData.averageTicket_general ?? ""}
                      onChange={(e) =>
                        setHistField("averageTicket_general", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      LTV (R$)
                    </Label>
                    <Input
                      type="number"
                      placeholder="ex: 11400"
                      value={histFormData.ltv_value ?? ""}
                      onChange={(e) =>
                        setHistField("ltv_value", e.target.value)
                      }
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Saved entries list */}
          {Object.keys(historicalData).length > 0 && (
            <div className="border-t border-border/40 pt-3 space-y-2">
              <p className="text-xs text-muted-foreground font-medium">
                Meses com dados salvos:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(historicalData)
                  .sort(([a], [b]) => b.localeCompare(a))
                  .map(([key]) => {
                    const [y, m] = key.split("-").map(Number);
                    return (
                      <div
                        key={key}
                        className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md px-2 py-0.5"
                      >
                        <button
                          onClick={() => {
                            setHistModalKey(key);
                            setHistFormData(historicalData[key] ?? {});
                          }}
                          className="text-xs text-amber-700 dark:text-amber-400 hover:underline"
                        >
                          {MONTH_NAMES[m - 1]}/{y}
                        </button>
                        <button
                          onClick={() => deleteHistoricalEntry(key)}
                          className="text-amber-400 hover:text-red-500 ml-0.5"
                          title="Remover"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowHistoricalModal(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={saveHistoricalEntry}
              disabled={!histModalKey}
              className="btn-brand"
            >
              <Save className="h-4 w-4 mr-1.5" />
              Salvar Dados
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dashboard Panel */}
      {(isEditDashboardModalOpen || isEditPanelClosing) &&
        (() => {
          return (
            <>
              <div
                className={cn(
                  "fixed top-0 bottom-0 right-0 z-40 bg-black/30 backdrop-blur-[1px] transition-opacity duration-300",
                  isEditPanelClosing ? "opacity-0" : "opacity-100",
                )}
                style={{ left: "var(--sidebar-width)" }}
                onClick={handleCloseEditPanel}
              />
              <div
                data-slot="sheet-content"
                data-state={isEditPanelClosing ? "closed" : "open"}
                className="fixed top-0 bg-background z-50 flex flex-col shadow-2xl data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=closed]:fade-out-0"
                style={{
                  left: "var(--sidebar-width)",
                  right: 0,
                  bottom: "var(--footer-height, 0px)",
                }}
              >
                {/* Header */}
                <div
                  className="flex-shrink-0 px-6 py-4 text-white"
                  style={{ background: "var(--app-brand-gradient)" }}
                >
                  <div className="flex items-center justify-between flex-wrap gap-y-2">
                    <div className="flex items-center gap-3">
                      <div className="bg-white/20 rounded-lg p-1.5">
                        <LayoutGrid className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-white/60 text-[10px] font-medium uppercase tracking-wide leading-tight">
                          {isNewDashboardMode
                            ? "Novo Dashboard"
                            : "Editar Dashboard"}
                        </p>
                        {isEditingHeaderName ? (
                          <div className="flex items-center gap-2 mt-0.5">
                            <input
                              autoFocus
                              value={editHeaderName}
                              onChange={(e) =>
                                setEditHeaderName(e.target.value)
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveHeaderName();
                                if (e.key === "Escape")
                                  setIsEditingHeaderName(false);
                              }}
                              placeholder={
                                isNewDashboardMode ? "Nome do dashboard..." : ""
                              }
                              className="bg-white/20 text-white placeholder-white/50 text-sm font-bold leading-tight rounded-md px-2.5 py-1 border border-white/30 focus:outline-none focus:border-white/60 w-48"
                            />
                            <button
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={handleSaveHeaderName}
                              className="flex items-center gap-1 bg-white text-blue-700 hover:bg-white/90 active:scale-95 rounded-md px-2.5 py-1 text-xs font-semibold transition-all shadow-sm"
                            >
                              <Check className="h-3 w-3" />
                              Salvar
                            </button>
                            <button
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => setIsEditingHeaderName(false)}
                              className="bg-white/15 hover:bg-white/30 rounded-md p-1 transition-colors"
                              title="Cancelar edição"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <h2 className="text-base font-bold leading-tight">
                              {editHeaderName ||
                                (isNewDashboardMode
                                  ? "Novo Dashboard"
                                  : "Dashboard Padrão")}
                            </h2>
                            <button
                              onClick={() => setIsEditingHeaderName(true)}
                              className="bg-white/15 hover:bg-white/30 rounded p-0.5 transition-colors"
                              title="Renomear dashboard"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                        <p className="text-white/70 text-[11px] mt-0.5">
                          {isNewDashboardMode
                            ? "Adicione widgets à direita e dê um nome ao dashboard"
                            : `Arraste para reordenar · ${editor.draftWidgets.filter((w) => w.visible).length} widgets ativos`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <DashboardWidgetEditorModeToggle editor={editor} />
                      <div className="w-px h-5 bg-white/25 mx-1" />
                      <button
                        onClick={handleCloseEditPanel}
                        className="bg-white/15 hover:bg-white/30 rounded-lg p-1.5 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <DashboardWidgetEditorBody editor={editor} catalog={widgetLibrary.filter((lib) => ROLE_WIDGET_IDS.has(lib.id))} getWidgetTitle={getWidgetTitle} />
                <DashboardWidgetEditorFooter
                  editor={editor}
                  onCancel={() => setShowCancelConfirmDialog(true)}
                  onSave={() => setShowSaveConfirmDialog(true)}
                  saveLabel={isNewDashboardMode ? "Criar" : "Salvar"}
                />
              </div>
            </>
          );
        })()}
      <ConfirmationDialog
        open={showCancelConfirmDialog}
        onClose={() => setShowCancelConfirmDialog(false)}
        onConfirm={handleConfirmCancel}
        title={isNewDashboardMode ? "Cancelar criação" : "Cancelar edição"}
        message={
          isNewDashboardMode
            ? "Tem certeza que deseja cancelar? O novo dashboard não será criado."
            : "Tem certeza que deseja cancelar? Todas as alterações não salvas serão perdidas."
        }
        confirmText="Sim, cancelar"
        cancelText="Voltar"
        destructive={true}
      />
      <ConfirmationDialog
        open={showSaveConfirmDialog}
        onClose={() => setShowSaveConfirmDialog(false)}
        onConfirm={handleConfirmSave}
        title={isNewDashboardMode ? "Criar dashboard" : "Salvar dashboard"}
        message={
          isNewDashboardMode
            ? `Deseja criar o dashboard "${editHeaderName.trim() || "Novo Dashboard"}" com ${editor.draftWidgets.length} widget(s)?`
            : "Deseja salvar as alterações feitas no dashboard? As mudanças serão aplicadas imediatamente."
        }
        confirmText={isNewDashboardMode ? "Criar" : "Salvar"}
        cancelText="Voltar"
        destructive={false}
      />
      <ConfirmationDialog
        open={showDeleteDashboardDialog}
        onClose={() => {
          setShowDeleteDashboardDialog(false);
          setDeletingDashboardId(null);
        }}
        onConfirm={() => {
          if (deletingDashboardId) handleDeleteDashboard(deletingDashboardId);
          setShowDeleteDashboardDialog(false);
          setDeletingDashboardId(null);
        }}
        title="Excluir dashboard"
        message={
          <>
            Tem certeza que deseja excluir o dashboard{" "}
            <strong>
              "
              {savedDashboards.find((d) => d.id === deletingDashboardId)
                ?.name ?? ""}
              "
            </strong>
            ?
            <br />
            <span className="text-muted-foreground text-xs">
              Esta ação não pode ser desfeita.
            </span>
          </>
        }
        confirmText="Sim, excluir"
        cancelText="Cancelar"
        destructive={true}
      />
    </DashboardShellFrame>
    <DashboardExportOverlay state={exportState} onDismiss={resetExportState} onRetry={handleExportAs} />
    </>
  );
}
