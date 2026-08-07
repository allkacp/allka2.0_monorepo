// @ts-nocheck
import { DashboardShellFrame } from "@/features/dashboards/shared/dashboard-shell-frame";
import { useDashboardScrollCompact } from "@/hooks/useDashboardScrollCompact";
import { WIDGETS_BY_ROLE } from "@/lib/dashboard-widget-roles";
import { LEADER_PRESETS, buildWidgets, DASHBOARD_STORAGE_KEY, CURRENT_DASHBOARD_KEY } from "@/lib/dashboard-presets-by-role";
import type React from "react";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
  SlidersHorizontal,
  ImageDown,
  Copy,
  Link2,
  History,
  Database,
  Eye,
  RefreshCw,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert"; // AlertTriangle removed to avoid redeclaration
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
import { apiClient } from "@/lib/api-client";
// Inline fallback — dev-mocks/ é gitignored e não está disponível no build de produção
// NOTA (Leader): este gerador NÃO é a fonte dos números do Dashboard do Leader.
// Para o Leader, os slices são substituídos por dados reais de /lider/* via
// `withLeaderReal()` / `genData()` (ver dentro do componente). Quando não há
// dados reais, os slices do Leader são zerados — nunca mostramos mock.
const generateDashboardData = (from?: Date, to?: Date): any => {
  const now = new Date();
  const f =
    from ?? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
  const t = to ?? now;
  const days = Math.max(1, Math.round((t.getTime() - f.getTime()) / 86400000));
  const m = days / 30; // multiplier relative to 30-day base
  const sc = (base: number) => Math.round(base * m); // scale financial/count
  const scSoft = (base: number) => Math.round(base * (0.5 + m * 0.5)); // softer scale for counts
  return {
    revenue: {
      total: sc(270800),
      growth: 18.1,
      totalGrowth: 18.1,
      series: [],
      trendData: [180000, 205000, 215000, 230000, 248000, sc(270800)].map((v) =>
        Math.round((v * m) / 1),
      ),
      creditPlan: sc(114000),
      creditPlanGrowth: 18,
      recurring: sc(97600),
      recurringGrowth: 8,
      oneTime: sc(59200),
      oneTimeGrowth: 14,
    },
    activeProjects: {
      total: scSoft(127),
      growth: 5.2,
      series: [],
      agencies: scSoft(48),
      agenciesGrowth: 7,
      leadPremium: scSoft(63),
      leadPremiumGrowth: 9,
      nomades: scSoft(16),
      nomadesGrowth: 3,
      newTotal: sc(22),
      newAgencies: sc(9),
      newLeadPremium: sc(10),
      newNomades: sc(3),
    },
    creditPlans: {
      total: sc(114000),
      growth: 18,
      series: [],
      basic: { revenue: sc(38000), newContracts: sc(12), growth: 8 },
      partner: { revenue: sc(45000), newContracts: sc(9), growth: 22 },
      premium: { revenue: sc(31000), newContracts: sc(5), growth: 14 },
    },
    mrr: {
      total: sc(97600),
      growth: 8,
      series: [],
      newMrr: sc(12400),
      expansion: sc(5200),
      contraction: sc(1800),
      churnRevenue: sc(3100),
      baseMrr: sc(89600),
      netChange: sc(12700),
      trendGrowth: 12,
      trendData: [72000, 78000, 82000, 86000, 91000, 97600].map((v) => sc(v)),
    },
    churn: {
      total: 0,
      growth: 0,
      series: [],
      inactiveAccounts: sc(23),
      inactiveGrowth: 4,
      agencies: sc(8),
      leadPremium: sc(5),
      nomades: sc(7),
      free: sc(3),
      cancelledProjects: sc(11),
      cancelledGrowth: 2,
      revenueChurn: sc(9300),
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
      total: sc(187400),
      growth: 12,
      series: [],
      creditPlans: sc(98200),
      postPaid: sc(54700),
      others: sc(34500),
      received: sc(143600),
    },
    platformActivities: {
      activeAgencies: scSoft(34),
      avgSessionMinutes: 47,
      mau: scSoft(1240),
      dau: scSoft(312),
      sessions: sc(8740),
      actionsExecuted: sc(52300),
      trendData: [420, 510, 480, 630, 590, 710, 680].map((v) => sc(v)),
    },
    nomads: {
      total: scSoft(148),
      growth: 6,
      active: scSoft(112),
      activeGrowth: 9,
      inactive: scSoft(36),
      inactiveChange: -3,
      newInPeriod: sc(14),
      churn: sc(5),
      retention30d: 82,
      trendData: [95, 100, 104, 108, 110, 112].map((v) => scSoft(v)),
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
        avatar: "DW",
        rating: 4.9,
        projects: 23,
        contribution: "R$ 48k",
        specialty: "Dev & Design",
        color: "from-blue-500 to-indigo-600",
      },
      {
        id: "2",
        name: "Criativa Lab",
        avatar: "CL",
        rating: 4.8,
        projects: 18,
        contribution: "R$ 37k",
        specialty: "Branding",
        color: "from-pink-500 to-rose-600",
      },
      {
        id: "3",
        name: "Inovax Agency",
        avatar: "IA",
        rating: 4.7,
        projects: 15,
        contribution: "R$ 31k",
        specialty: "Marketing 360",
        color: "from-violet-500 to-purple-600",
      },
      {
        id: "4",
        name: "PixelForge",
        avatar: "PF",
        rating: 4.6,
        projects: 12,
        contribution: "R$ 24k",
        specialty: "UX/UI",
        color: "from-cyan-500 to-teal-600",
      },
      {
        id: "5",
        name: "BluePrint Co.",
        avatar: "BP",
        rating: 4.5,
        projects: 10,
        contribution: "R$ 19k",
        specialty: "Arquitetura",
        color: "from-amber-500 to-orange-600",
      },
    ],
    tasks: {
      total: sc(552),
      items: [],
      completed: sc(412),
      completedGrowth: 8,
      inProgress: scSoft(57),
      inProgressGrowth: 4,
      contracted: scSoft(83),
      contractedGrowth: 12,
      cancelled: sc(14),
      cancelledChange: -2,
      slaCompliance: 91.4,
    },
    activeUsers: {
      total: scSoft(284),
      empresas: scSoft(92),
      empresasGrowth: 5,
      agencias: scSoft(61),
      agenciasGrowth: 7,
      nomades: scSoft(112),
      nomadesGrowth: 9,
      admins: scSoft(19),
      adminsGrowth: 3,
      series: [],
    },
    partnerProgram: {
      total: scSoft(38),
      items: [],
      invitesSent: sc(124),
      pending: scSoft(47),
      accepted: scSoft(38),
      diamond: 3,
      platinum: 6,
      gold: 11,
      silver: 12,
      bronze: 6,
      mrrGenerated: sc(22400),
    },
    cmv: {
      totalCosts: sc(87400),
      revenue: sc(270800),
      cmvPercent: 32.3,
      prevCmvPercent: 34.1,
      nomades: { value: sc(42800), percent: 49 },
      impostos: { value: sc(18200), percent: 21 },
      comissoes: { value: sc(14900), percent: 17 },
      outros: { value: sc(11500), percent: 13 },
      variation: { cmvPercent: -1.8, totalCosts: -2.4, revenue: 5.6 },
    },
    statusOverview: {
      projects: {
        ongoing: scSoft(42),
        approved: scSoft(18),
        completed: sc(156),
        cancelled: sc(7),
        delayed: scSoft(11),
      },
      tasks: {
        contracted: scSoft(83),
        inProgress: scSoft(57),
        completed: sc(412),
        archived: sc(34),
      },
      leads: {
        new: scSoft(29),
        contacted: scSoft(15),
        proposal: scSoft(8),
        won: sc(12),
        lost: sc(5),
      },
    },
    metrics: {},
    activity: [],
    alerts: [],
    performers: [
      {
        id: "1",
        name: "Carlos Mendonça",
        avatar: "CM",
        rating: 4.9,
        projects: sc(34),
        badge: "gold",
        tasks: sc(128),
        revenue: `R$ ${sc(52)}k`,
        specialty: "Dev Full Stack",
      },
      {
        id: "2",
        name: "Ana Beatriz Lima",
        avatar: "AB",
        rating: 4.8,
        projects: sc(29),
        badge: "gold",
        tasks: sc(115),
        revenue: `R$ ${sc(44)}k`,
        specialty: "UI/UX Design",
      },
      {
        id: "3",
        name: "Rafael Torres",
        avatar: "RT",
        rating: 4.7,
        projects: sc(26),
        badge: "gold",
        tasks: sc(98),
        revenue: `R$ ${sc(39)}k`,
        specialty: "Marketing Digital",
      },
      {
        id: "4",
        name: "Juliana Ferreira",
        avatar: "JF",
        rating: 4.6,
        projects: sc(22),
        badge: "silver",
        tasks: sc(84),
        revenue: `R$ ${sc(31)}k`,
        specialty: "Copywriting",
      },
      {
        id: "5",
        name: "Marcos Oliveira",
        avatar: "MO",
        rating: 4.6,
        projects: sc(21),
        badge: "silver",
        tasks: sc(79),
        revenue: `R$ ${sc(28)}k`,
        specialty: "Dev Backend",
      },
      {
        id: "6",
        name: "Priscila Santos",
        avatar: "PS",
        rating: 4.5,
        projects: sc(19),
        badge: "silver",
        tasks: sc(71),
        revenue: `R$ ${sc(24)}k`,
        specialty: "SEO",
      },
      {
        id: "7",
        name: "Diego Cavalcante",
        avatar: "DC",
        rating: 4.4,
        projects: sc(17),
        badge: "bronze",
        tasks: sc(63),
        revenue: `R$ ${sc(19)}k`,
        specialty: "Tráfego Pago",
      },
      {
        id: "8",
        name: "Fernanda Costa",
        avatar: "FC",
        rating: 4.3,
        projects: sc(15),
        badge: "bronze",
        tasks: sc(57),
        revenue: `R$ ${sc(16)}k`,
        specialty: "Social Media",
      },
    ],
    userDistribution: [],
    systemAlerts: [],
    adminProfiles: [],
    permissionMatrix: [],
    managementTools: [],
  };
};
import { Switch } from "@/components/ui/switch"; // Added Switch
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast"; // Added useToast hook
import { ConfirmationDialog } from "@/components/confirmation-dialog";

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
} from "@/features/dashboards/shared/dashboard-common";

type MetricType =
  | "totalUsers"
  | "activeUsers"
  | "companies"
  | "activeProjects"
  | "revenue"
  | "avgRating";
const ROLE_WIDGET_IDS = new Set<string>(WIDGETS_BY_ROLE["LEADER"]);

const METRIC_NAV: Record<string, string> = {
  qualificationTasks: "/leader/qualificacao",
  briefingsToReview: "/leader/tarefas?filter=briefings",
  deliveriesAwaitingAnalysis: "/leader/tarefas?filter=entregas",
  tasksInExecution: "/leader/tarefas",
  tasksReturned: "/leader/devolvidas",
  tasksOverdue: "/leader/tarefas?filter=atrasadas",
  approvalsToday: "/leader/historico?filter=aprovacoes",
  activeNomadsArea: "/leader/nomades",
};

export default function AdminDashboardPage() {
  const { sidebarCollapsed } = useSidebar(); // Get sidebar collapse state
  const { toast } = useToast(); // Get toast function
  const navigate = useNavigate();
  const {
    stats: apiStats,
    activities: apiActivities,
    loading: dashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard,
  } = useDashboard();

  // ─── Dados reais do Leader (área-scoped) — substituem o mock por /lider/* ────
  // Fonte única de verdade dos números do Dashboard do Leader. Nunca usa mock:
  // enquanto carrega ou se vier vazio, os slices do Leader ficam zerados.
  const [leaderReal, setLeaderReal] = useState<any>(null);
  const [leaderLoading, setLeaderLoading] = useState(true);
  const [leaderError, setLeaderError] = useState<string | null>(null);

  const loadLeaderReal = useCallback(async () => {
    setLeaderLoading(true);
    setLeaderError(null);
    try {
      const [countsRes, briefRes, entrRes, apprRes, recentRes, nomRes]: any =
        await Promise.all([
          apiClient.getLiderTaskCounts(),
          apiClient.getLiderTasks({ status: "LANCAMENTO_ENVIADO_PARA_ANALISE", limit: "1" }),
          apiClient.getLiderTasks({ status: "ENTREGA_PENDENTE", limit: "1" }),
          apiClient.getLiderTasks({ status: "APROVADA", limit: "100" }),
          apiClient.getLiderTasks({ limit: "20" }),
          apiClient.getLiderNomades({ limit: "100" }),
        ]);
      const counts = {
        paraLancamento: countsRes?.paraLancamento ?? 0,
        emExecucao: countsRes?.emExecucao ?? 0,
        atrasadas: countsRes?.atrasadas ?? 0,
        aprovadas: countsRes?.aprovadas ?? 0,
        devolvidas: countsRes?.devolvidas ?? 0,
      };
      const approvedList = apprRes?.tasks ?? [];
      const startToday = new Date();
      startToday.setHours(0, 0, 0, 0);
      const approvalsToday = approvedList.filter((t: any) => {
        const d = t.completed_at || t.data_conclusao || t.updated_at;
        return d && new Date(d) >= startToday;
      }).length;
      const nomList = nomRes?.nomades ?? [];
      const nomTotal = nomRes?.total ?? nomList.length;
      const avg = (arr: number[]) =>
        arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
      setLeaderReal({
        counts,
        briefings: briefRes?.total ?? 0,
        entregas: entrRes?.total ?? 0,
        approvalsToday,
        recentTasks: recentRes?.tasks ?? [],
        nomades: { total: nomTotal, active: nomList.length },
        indicators: {
          deliveryRate:
            Math.round(avg(nomList.map((n: any) => (n.performance_on_time ?? 0) * 100)) * 10) / 10,
          avgRating:
            Math.round(avg(nomList.map((n: any) => n.performance_avg_rating ?? 0)) * 10) / 10,
          avgTimePerTask: 0,
          certified: nomList.filter((n: any) =>
            ["gold", "platinum", "diamond"].includes(n.level),
          ).length,
          retention90d: 0,
        },
        performers: [...nomList]
          .sort((a: any, b: any) => (b.score ?? 0) - (a.score ?? 0))
          .map((n: any) => ({
            id: String(n.id),
            name: n.name ?? "—",
            avatar: String(n.name ?? "?")
              .split(" ")
              .map((p: string) => p[0])
              .slice(0, 2)
              .join("")
              .toUpperCase(),
            rating: n.performance_avg_rating ?? 0,
            projects: n.tasks_completed_total ?? 0,
            tasks: n.tasks_completed_total ?? 0,
            specialty: n.level
              ? String(n.level).charAt(0).toUpperCase() + String(n.level).slice(1)
              : "Nômade",
            badge: n.level ?? "bronze",
            revenue: "",
          })),
        slaCompliance:
          counts.aprovadas + counts.devolvidas > 0
            ? Math.round((counts.aprovadas / (counts.aprovadas + counts.devolvidas)) * 1000) / 10
            : 0,
      });
    } catch (e: any) {
      setLeaderError(e?.message ?? "Erro ao carregar dados do líder");
      setLeaderReal(null);
    } finally {
      setLeaderLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLeaderReal();
  }, [loadLeaderReal]);

  // Aplica os dados reais do Leader sobre o shape esperado pelos widgets do motor.
  // Sem dados reais → slices do Leader zerados (jamais expõe números mock).
  const withLeaderReal = (base: any) => {
    const r = leaderReal;
    const c = r?.counts;
    const z = (v: number) => (r ? v : 0);
    return {
      ...base,
      tasks: {
        ...base.tasks,
        total: z(
          (c?.paraLancamento ?? 0) +
            (c?.emExecucao ?? 0) +
            (c?.aprovadas ?? 0) +
            (c?.devolvidas ?? 0) +
            (c?.atrasadas ?? 0),
        ),
        completed: z(c?.aprovadas ?? 0),
        completedGrowth: 0,
        inProgress: z(c?.emExecucao ?? 0),
        inProgressGrowth: 0,
        contracted: z(c?.paraLancamento ?? 0),
        contractedGrowth: 0,
        cancelled: z(c?.devolvidas ?? 0),
        cancelledChange: 0,
        slaCompliance: r?.slaCompliance ?? 0,
        items: r?.recentTasks ?? [],
      },
      nomads: {
        ...base.nomads,
        total: z(r?.nomades.total ?? 0),
        growth: 0,
        active: z(r?.nomades.active ?? 0),
        activeGrowth: 0,
        inactive: z((r?.nomades.total ?? 0) - (r?.nomades.active ?? 0)),
        inactiveChange: 0,
        newInPeriod: 0,
        churn: 0,
      },
      nomadsIndicators: r
        ? r.indicators
        : { deliveryRate: 0, avgRating: 0, avgTimePerTask: 0, certified: 0, retention90d: 0 },
      performers: r ? r.performers : [],
      statusOverview: {
        ...base.statusOverview,
        projects: {
          ongoing: z(c?.emExecucao ?? 0),
          approved: z(r?.approvalsToday ?? 0),
          completed: z(c?.aprovadas ?? 0),
          cancelled: z(c?.devolvidas ?? 0),
          delayed: z(c?.atrasadas ?? 0),
        },
        tasks: {
          contracted: z(c?.paraLancamento ?? 0),
          inProgress: z(c?.emExecucao ?? 0),
          completed: z(c?.aprovadas ?? 0),
          archived: z(c?.devolvidas ?? 0),
        },
        leads: { new: 0, contacted: 0, proposal: 0, won: 0, lost: 0 },
      },
    };
  };

  const genData = (from?: Date, to?: Date) =>
    withLeaderReal(generateDashboardData(from, to));

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

  const [widgetPeriods, setWidgetPeriods] = useState<WidgetPeriodOverride[]>(
    [],
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
    const base = genData(from, to);
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
  }, [globalPeriod.type, globalPeriod.from, globalPeriod.to, historicalData, leaderReal]);

  // Convenience aliases used throughout widget JSX
  const rv = dashboardData.revenue;
  const apW = dashboardData.activeProjects;
  const cpW = dashboardData.creditPlans;
  const mrrW = dashboardData.mrr;
  const churnW = dashboardData.churn;
  const atW = dashboardData.averageTicket;
  const ltvW = dashboardData.ltv;
  const paW = dashboardData.platformActivities;
  const nmW = dashboardData.nomads;
  const agRankW = dashboardData.agenciesRanking;
  const soW = dashboardData.statusOverview;
  const arW = dashboardData.accountsReceivable;
  const tasksW = dashboardData.tasks;
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
    { id: "qualificationTasks", order: 0, visible: true },
    { id: "briefingsToReview", order: 1, visible: true },
    { id: "deliveriesAwaitingAnalysis", order: 2, visible: true },
    { id: "tasksInExecution", order: 3, visible: true },
    { id: "tasksReturned", order: 4, visible: true },
    { id: "tasksOverdue", order: 5, visible: true },
    { id: "approvalsToday", order: 6, visible: true },
    { id: "activeNomadsArea", order: 7, visible: true },
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
  const [draftWidgets, setDraftWidgets] = useState<WidgetState[]>([]);
  const [modalDraggedId, setModalDraggedId] = useState<string | null>(null);
  const [modalDragOverId, setModalDragOverId] = useState<string | null>(null);
  const [editModalMode, setEditModalMode] = useState<
    "none" | "remover" | "adicionar"
  >("none");
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
    setIsCustomizeMode(!isCustomizeMode);
  };

  // Define WidgetPeriodOverride interface
  interface WidgetPeriodOverride {
    widgetId: string;
    mode: "global" | "custom";
    customPeriod?: {
      from: string;
      to: string;
      label: string;
      periodKey?: string;
    };
  }

  const getWidgetPeriod = (widgetId: string) => {
    const override = widgetPeriods.find((wp) => wp.widgetId === widgetId);
    if (override && override.mode === "custom" && override.customPeriod) {
      // Backward-compat: derive periodKey from label if not stored (old localStorage data)
      const labelToKey: Record<string, string> = {
        Hoje: "today",
        "Últimos 7 dias": "7days",
        "Últimos 30 dias": "30days",
        "Este mês": "thisMonth",
        "Mês passado": "lastMonth",
        "Últimos 90 dias": "90days",
        "Último ano": "365days",
      };
      const periodKey =
        override.customPeriod.periodKey ??
        labelToKey[override.customPeriod.label];
      return {
        from: new Date(override.customPeriod.from),
        periodKey,
        to: new Date(override.customPeriod.to),
        label: override.customPeriod.label,
      };
    }
    // Fallback to global period if no override or global mode is selected
    return {
      from: globalPeriod.from || new Date(0), // Use a default if from is undefined
      to: globalPeriod.to || new Date(), // Use a default if to is undefined
      label: globalPeriod.label,
    };
  };

  const setWidgetCustomPeriod = (widgetId: string, period: string) => {
    const now = new Date();
    let from = "";
    let to = format(now, "yyyy-MM-dd");
    let label = period;

    switch (period) {
      case "global":
        setWidgetPeriods((prev) =>
          prev.filter((wp) => wp.widgetId !== widgetId),
        );
        return;
      case "today":
        from = format(now, "yyyy-MM-dd");
        label = "Hoje";
        break;
      case "7days":
        from = format(subDays(now, 7), "yyyy-MM-dd");
        label = "Últimos 7 dias";
        break;
      case "30days":
        from = format(subDays(now, 30), "yyyy-MM-dd");
        label = "Últimos 30 dias";
        break;
      case "thisMonth":
        from = format(startOfMonth(now), "yyyy-MM-dd");
        label = "Este mês";
        break;
      case "lastMonth":
        from = format(startOfMonth(subMonths(now, 1)), "yyyy-MM-dd");
        to = format(endOfMonth(subMonths(now, 1)), "yyyy-MM-dd");
        label = "Mês passado";
        break;
      case "90days":
        from = format(subDays(now, 90), "yyyy-MM-dd");
        label = "Últimos 90 dias";
        break;
      case "365days":
        from = format(subDays(now, 365), "yyyy-MM-dd");
        label = "Último ano";
        break;
      default:
        return;
    }

    setWidgetPeriods((prev) => {
      const filtered = prev.filter((wp) => wp.widgetId !== widgetId);
      return [
        ...filtered,
        {
          widgetId,
          mode: "custom",
          customPeriod: { from, to, label, periodKey: period },
        },
      ];
    });
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
        pixelRatio: 2,
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
        pixelRatio: 2,
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
    [
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
    ].filter((w) => ROLE_WIDGET_IDS.has(w.type)),
  );

  const [draggedWidget, setDraggedWidget] = useState<string | null>(null); // Use string for widget id
  const [dragOverWidget, setDragOverWidget] = useState<string | null>(null); // Use string for widget id

  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [selectedWidgetsForExport, setSelectedWidgetsForExport] = useState<
    WidgetType[]
  >([]);
  const [isExporting, setIsExporting] = useState(false);

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
    setGeneratedShareLink("");
    setShareActiveTab("permission");
    setShareAllowFilterChanges(false);
    setShowPublicShareDialog(true);
  };

  const openDashboardPublicShare = () => {
    const currentDb = savedDashboards.find((d) => d.id === currentDashboardId);
    setShareTarget({
      id: currentDashboardId ?? "default",
      title: currentDb?.name ?? "Dashboard",
      type: "dashboard",
    });
    setSharePermission("view");
    setSharePinEnabled(false);
    setSharePin("");
    setShareExpiryEnabled(false);
    setShareExpiry("");
    setGeneratedShareLink("");
    setShareActiveTab("permission");
    setShareAllowFilterChanges(false);
    setShowPublicShareDialog(true);
  };

  const handleGenerateShareLink = () => {
    if (!shareTarget) return;
    const config: ShareConfig = {
      target: shareTarget,
      permission: sharePermission,
      pin: sharePinEnabled && sharePin.length === 4 ? sharePin : undefined,
      expiry:
        shareExpiryEnabled && shareExpiry ? new Date(shareExpiry) : undefined,
    };
    const token = generatePublicToken(config, {
      profile: "leader",
      period: {
        type: globalPeriod.type,
        from: globalPeriod.from?.toISOString(),
        to: globalPeriod.to?.toISOString(),
        label: globalPeriod.label,
      },
      allowFilterChanges: shareAllowFilterChanges,
    });
    setGeneratedShareLink(`${window.location.origin}/dashboard/share/${token}`);
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
    localStorage.setItem(DASHBOARD_STORAGE_KEY["LEADER"], JSON.stringify(updatedDashboards));
    setShowEditDialog(false);
    setEditingDashboardId(null);
    setEditingDashboardName("");
  };

  const handleCloseEditPanel = () => {
    setIsEditPanelClosing(true);
    setTimeout(() => {
      setIsEditPanelClosing(false);
      setIsEditDashboardModalOpen(false);
      setEditModalMode("none");
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
        DASHBOARD_STORAGE_KEY["LEADER"],
        JSON.stringify(updatedDashboards),
      );
    }
    setIsEditingHeaderName(false);
  };

  const handleConfirmSave = () => {
    const updated = draftWidgets.map((w, i) => ({ ...w, order: i }));
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
        DASHBOARD_STORAGE_KEY["LEADER"],
        JSON.stringify(updatedDashboards),
      );
      localStorage.setItem(CURRENT_DASHBOARD_KEY["LEADER"], newDashboard.id);
      setCurrentDashboardId(newDashboard.id);
      setWidgets(updated);
      localStorage.setItem("dashboard-widget-config", JSON.stringify(updated));
      setShowSaveConfirmDialog(false);
      handleCloseEditPanel();
      toast({
        title: "Dashboard criado",
        description: `"${name}" foi criado com sucesso.`,
      });
    } else {
      setWidgets(updated);
      localStorage.setItem("dashboard-widget-config", JSON.stringify(updated));
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
          DASHBOARD_STORAGE_KEY["LEADER"],
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
    const METRIC_CARDS_KEY = "dashboard-metric-cards-leader";
    const WIDGET_SIZE_KEY = "dashboard-widget-size-leader";
    const WIDGET_PERIODS_KEY = "dashboard-widget-periods-leader";

    const savedConfig = localStorage.getItem("dashboard-widget-config");
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

    const savedMetrics = localStorage.getItem(METRIC_CARDS_KEY);
    if (savedMetrics) {
      try {
        setMetricCards(JSON.parse(savedMetrics));
      } catch (e) {
        console.error("Failed to parse saved metric cards:", e);
      }
    }

    const savedSize = localStorage.getItem(WIDGET_SIZE_KEY);
    if (savedSize) {
      setWidgetSize(savedSize as WidgetSize);
    }

    // Load widget period overrides from localStorage
    const savedWidgetPeriods = localStorage.getItem(WIDGET_PERIODS_KEY);
    if (savedWidgetPeriods) {
      try {
        setWidgetPeriods(JSON.parse(savedWidgetPeriods));
      } catch (e) {
        console.error("Failed to parse saved widget periods:", e);
      }
    }

    // Load saved dashboards — role-scoped presets (Leader)
    const STORAGE_KEY = DASHBOARD_STORAGE_KEY["LEADER"];
    const CURRENT_KEY = CURRENT_DASHBOARD_KEY["LEADER"];
    const builtinPresets: SavedDashboard[] = LEADER_PRESETS.map((p) => ({
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
    );
    localStorage.setItem("dashboard-metric-cards-leader", JSON.stringify(metricCards));
    localStorage.setItem("dashboard-widget-size-leader", widgetSize);
    // Save widget period overrides to localStorage
    localStorage.setItem(
      "dashboard-widget-periods-leader",
      JSON.stringify(widgetPeriods),
    );

    // Save dashboards to localStorage whenever they change
    localStorage.setItem(DASHBOARD_STORAGE_KEY["LEADER"], JSON.stringify(savedDashboards));
    localStorage.setItem(CURRENT_DASHBOARD_KEY["LEADER"], currentDashboardId);
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
      description:
        "Valores garantidos a receber por tipo (Planos, Pós-pagos, Outros)",
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
      description:
        "Custos diretos (nômades, impostos, comissões) vs faturamento",
      icon: Calculator,
      color: "orange",
    },
    {
      id: "ltv",
      name: "LTV (Lifetime Value)",
      description:
        "Valor médio que um cliente gera durante todo o relacionamento",
      icon: TrendingUp,
      color: "purple",
    },
    {
      id: "mrr",
      name: "MRR (Receita Recorrente)",
      description:
        "Monthly Recurring Revenue com New, Expansion, Contraction e Churn",
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
      description:
        "Projetos ativos por tipo (Agências e Lead Premium) com novos projetos",
      icon: Briefcase,
      color: "indigo",
    },
    {
      id: "creditPlans",
      name: "Planos de Crédito",
      description:
        "Entrada de receita por tipo de plano com novas contratações",
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
    {
      id: "partnerProgram",
      name: "Programa Partner",
      description:
        "Convites enviados, partners ativos e distribuição por nível",
      icon: Award,
      color: "amber",
    },
  ];

  const getMetricsForPeriod = (
    periodTypeOverride?: string,
    widgetPeriodKey?: string,
  ) => {
    // ── KPIs reais do Leader (/lider/tasks/counts + /lider/tasks + /lider/nomades) ──
    // Os counts são estado atual da área (o backend não expõe recorte por período),
    // por isso os deltas ficam neutros (0) — nunca inventamos variação fake.
    {
      const r = leaderReal;
      const v = (n: any) => String(n ?? 0);
      const flat = { change: 0, trend: "up" as const };
      return {
        qualificationTasks: { value: v(r?.counts.paraLancamento), ...flat },
        briefingsToReview: { value: v(r?.briefings), ...flat },
        deliveriesAwaitingAnalysis: { value: v(r?.entregas), ...flat },
        tasksInExecution: { value: v(r?.counts.emExecucao), ...flat },
        tasksReturned: { value: v(r?.counts.devolvidas), ...flat },
        tasksOverdue: { value: v(r?.counts.atrasadas), ...flat },
        approvalsToday: { value: v(r?.approvalsToday), ...flat },
        activeNomadsArea: { value: v(r?.nomades.active), ...flat },
      } as any;
    }
    // ── Código legado (mock) mantido inerte — inalcançável após o return acima. ──
    const tasks = dashboardData.tasks;
    const nomads = dashboardData.nomads;
    const statusOverview = dashboardData.statusOverview;
    const baseMetrics = {
      "7d": {
        qualificationTasks: {
          value: String(Math.max(tasks.total - tasks.completed - tasks.inProgress - tasks.contracted - tasks.cancelled, 0)),
          change: 4.2,
          trend: "up" as const,
        },
        briefingsToReview: {
          value: String(tasks.contracted),
          change: 3.1,
          trend: "up" as const,
        },
        deliveriesAwaitingAnalysis: {
          value: String(tasks.inProgress),
          change: -1.4,
          trend: "down" as const,
        },
        tasksInExecution: {
          value: String(tasks.inProgress),
          change: 2.6,
          trend: "up" as const,
        },
        tasksReturned: {
          value: String(tasks.cancelled),
          change: 0.8,
          trend: "up" as const,
        },
        tasksOverdue: {
          value: String(statusOverview.projects.delayed),
          change: -0.6,
          trend: "down" as const,
        },
        approvalsToday: {
          value: String(statusOverview.projects.approved),
          change: 1.2,
          trend: "up" as const,
        },
        activeNomadsArea: {
          value: String(nomads.active),
          change: 2.4,
          trend: "up" as const,
        },
      },
      "30d": {
        qualificationTasks: {
          value: String(Math.max(tasks.total - tasks.completed - tasks.inProgress - tasks.contracted - tasks.cancelled, 0)),
          change: 6.8,
          trend: "up" as const,
        },
        briefingsToReview: {
          value: String(tasks.contracted),
          change: 4.7,
          trend: "up" as const,
        },
        deliveriesAwaitingAnalysis: {
          value: String(tasks.inProgress),
          change: -0.9,
          trend: "down" as const,
        },
        tasksInExecution: {
          value: String(tasks.inProgress),
          change: 3.4,
          trend: "up" as const,
        },
        tasksReturned: {
          value: String(tasks.cancelled),
          change: 1.1,
          trend: "up" as const,
        },
        tasksOverdue: {
          value: String(statusOverview.projects.delayed),
          change: -0.3,
          trend: "down" as const,
        },
        approvalsToday: {
          value: String(statusOverview.projects.approved),
          change: 2.0,
          trend: "up" as const,
        },
        activeNomadsArea: {
          value: String(nomads.active),
          change: 3.1,
          trend: "up" as const,
        },
      },
      "90d": {
        qualificationTasks: {
          value: String(Math.max(tasks.total - tasks.completed - tasks.inProgress - tasks.contracted - tasks.cancelled, 0)),
          change: 9.4,
          trend: "up" as const,
        },
        briefingsToReview: {
          value: String(tasks.contracted),
          change: 6.5,
          trend: "up" as const,
        },
        deliveriesAwaitingAnalysis: {
          value: String(tasks.inProgress),
          change: -0.2,
          trend: "down" as const,
        },
        tasksInExecution: {
          value: String(tasks.inProgress),
          change: 4.1,
          trend: "up" as const,
        },
        tasksReturned: {
          value: String(tasks.cancelled),
          change: 1.8,
          trend: "up" as const,
        },
        tasksOverdue: {
          value: String(statusOverview.projects.delayed),
          change: -0.1,
          trend: "down" as const,
        },
        approvalsToday: {
          value: String(statusOverview.projects.approved),
          change: 3.2,
          trend: "up" as const,
        },
        activeNomadsArea: {
          value: String(nomads.active),
          change: 4.0,
          trend: "up" as const,
        },
      },
      custom: {
        qualificationTasks: {
          value: String(Math.max(tasks.total - tasks.completed - tasks.inProgress - tasks.contracted - tasks.cancelled, 0)),
          change: 5.0,
          trend: "up" as const,
        },
        briefingsToReview: {
          value: String(tasks.contracted),
          change: 3.5,
          trend: "up" as const,
        },
        deliveriesAwaitingAnalysis: {
          value: String(tasks.inProgress),
          change: -0.5,
          trend: "down" as const,
        },
        tasksInExecution: {
          value: String(tasks.inProgress),
          change: 2.2,
          trend: "up" as const,
        },
        tasksReturned: {
          value: String(tasks.cancelled),
          change: 1.0,
          trend: "up" as const,
        },
        tasksOverdue: {
          value: String(statusOverview.projects.delayed),
          change: -0.4,
          trend: "down" as const,
        },
        approvalsToday: {
          value: String(statusOverview.projects.approved),
          change: 2.4,
          trend: "up" as const,
        },
        activeNomadsArea: {
          value: String(nomads.active),
          change: 3.0,
          trend: "up" as const,
        },
      },
    };
    // @ts-ignore
    // Widget period keys ("7days", "30days", etc.) take priority, then global period type
    let key: string;
    if (widgetPeriodKey) {
      key =
        widgetPeriodKey === "today" || widgetPeriodKey === "7days"
          ? "7d"
          : widgetPeriodKey === "90days" || widgetPeriodKey === "365days"
            ? "90d"
            : "30d";
    } else {
      const resolvedType = periodTypeOverride ?? globalPeriod.type;
      key =
        resolvedType === "last_7_days" ||
        resolvedType === "today" ||
        resolvedType === "yesterday"
          ? "7d"
          : resolvedType === "this_quarter"
            ? "90d"
            : resolvedType === "custom"
              ? "custom"
              : "30d";
    }
    return baseMetrics[key as keyof typeof baseMetrics];
  };

  const metrics = (() => {
    return getMetricsForPeriod();
  })();

  // ── Atividades recentes REAIS — derivadas de /lider/tasks (leaderReal.recentTasks) ──
  // Nunca usa apiActivities (admin) nem mock. Vazio → estado vazio real no widget.
  const recentActivities = (() => {
    const STATUS_ACTIVITY: Record<
      string,
      { label: string; icon: any; color: string; bgColor: string; to: string }
    > = {
      PARA_LANCAMENTO: { label: "Tarefa para qualificação", icon: FileText, color: "text-info", bgColor: "bg-info/10", to: "/leader/qualificacao" },
      LANCAMENTO_ENVIADO_PARA_ANALISE: { label: "Briefing para revisar", icon: FileText, color: "text-info", bgColor: "bg-info/10", to: "/leader/tarefas?filter=briefings" },
      EM_EXECUCAO: { label: "Tarefa em execução", icon: Activity, color: "text-primary", bgColor: "bg-primary/10", to: "/leader/tarefas" },
      ENTREGA_PENDENTE: { label: "Entrega aguardando análise", icon: CheckCircle2, color: "text-success", bgColor: "bg-success/10", to: "/leader/tarefas?filter=entregas" },
      ENTREGA_ATRASADA: { label: "Tarefa atrasada", icon: AlertCircle, color: "text-warning", bgColor: "bg-warning/10", to: "/leader/tarefas?filter=atrasadas" },
      REPROVADA: { label: "Tarefa devolvida", icon: AlertCircle, color: "text-warning", bgColor: "bg-warning/10", to: "/leader/devolvidas" },
      APROVADA: { label: "Tarefa aprovada", icon: UserCheck, color: "text-primary", bgColor: "bg-primary/10", to: "/leader/historico" },
    };
    return (leaderReal?.recentTasks ?? []).map((t: any, i: number) => {
      const cfg = STATUS_ACTIVITY[t.status] ?? {
        label: "Atividade da área",
        icon: Activity,
        color: "text-muted-foreground",
        bgColor: "bg-muted",
        to: "/leader/tarefas",
      };
      const when = t.updated_at || t.created_at || t.due_date;
      return {
        id: t.id ?? i + 1,
        type: t.status,
        title: cfg.label,
        description:
          [t.task_code ?? t.code_snapshot, t.title ?? t.name_snapshot]
            .filter(Boolean)
            .join(" · ") || "—",
        time: when ? new Date(when).toLocaleDateString("pt-BR") : "",
        icon: cfg.icon,
        color: cfg.color,
        bgColor: cfg.bgColor,
        to: cfg.to,
      };
    });
  })();

  // ── Alertas REAIS — derivados de /lider/tasks/counts + /lider/nomades ──────────
  // Sem fonte mock. Sem alerta real → array vazio → estado vazio no widget.
  const systemAlerts = (
    leaderReal
      ? [
          leaderReal.counts.atrasadas > 0 && {
            id: "alert-atrasadas",
            type: "warning",
            title: "Tarefas atrasadas",
            description: `${leaderReal.counts.atrasadas} tarefa(s) com entrega atrasada na sua área`,
            priority: "high",
          },
          leaderReal.entregas > 0 && {
            id: "alert-entregas",
            type: "warning",
            title: "Entregas aguardando análise",
            description: `${leaderReal.entregas} entrega(s) aguardam sua avaliação`,
            priority: "high",
          },
          leaderReal.briefings > 0 && {
            id: "alert-briefings",
            type: "warning",
            title: "Briefings para revisar",
            description: `${leaderReal.briefings} briefing(s) aguardando revisão`,
            priority: "medium",
          },
          leaderReal.counts.devolvidas > 0 && {
            id: "alert-devolvidas",
            type: "info",
            title: "Tarefas devolvidas",
            description: `${leaderReal.counts.devolvidas} tarefa(s) devolvida(s) para correção`,
            priority: "medium",
          },
          leaderReal.nomades.active === 0 && {
            id: "alert-sem-nomades",
            type: "info",
            title: "Sem nômades ativos",
            description: "Nenhum nômade ativo encontrado na sua área",
            priority: "medium",
          },
        ].filter(Boolean)
      : []
  ) as Array<{ id: string; type: string; title: string; description: string; priority: string }>;

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

  const permissionMatrixData = [
    {
      module: "Usuários",
      master: true,
      financeiro: false,
      comercial: true,
      operacional: false,
    },
    {
      module: "Financeiro",
      master: true,
      financeiro: true,
      comercial: false,
      operacional: false,
    },
    {
      module: "Projetos",
      master: true,
      financeiro: false,
      comercial: true,
      operacional: true,
    },
    {
      module: "Relatórios",
      master: true,
      financeiro: true,
      comercial: true,
      operacional: true,
    },
    {
      module: "Configurações",
      master: true,
      financeiro: false,
      comercial: false,
      operacional: false,
    },
    {
      module: "Disputas",
      master: true,
      financeiro: false,
      comercial: false,
      operacional: true,
    },
  ];

  const managementToolsData = [
    {
      title: "Gerenciar Permissões",
      description: "Criar e editar perfis administrativos",
      color:
        "from-destructive/10 to-destructive/20 dark:from-destructive/5 dark:to-destructive/10",
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
      hoverColor:
        "hover:from-info/20 hover:to-info/30 dark:hover:from-info/10 dark:hover:to-info/15",
      textColor: "text-info-foreground",
      subTextColor: "text-info",
      href: "/admin/usuarios",
    },
    {
      title: "Relatórios Financeiros",
      description: "Visualizar receitas e pagamentos",
      color:
        "from-success/10 to-success/20 dark:from-success/5 dark:to-success/10",
      hoverColor:
        "hover:from-success/20 hover:to-success/30 dark:hover:from-success/10 dark:hover:to-success/15",
      textColor: "text-success-foreground",
      subTextColor: "text-success",
      href: "/admin/relatorios",
    },
    {
      title: "Configurações da Plataforma",
      description: "Ajustar parâmetros do sistema",
      color:
        "from-primary/10 to-primary/20 dark:from-primary/5 dark:to-primary/10",
      hoverColor:
        "hover:from-primary/20 hover:to-primary/30 dark:hover:from-primary/10 dark:hover:to-primary/15",
      textColor: "text-primary-foreground",
      subTextColor: "text-primary",
      href: "/admin/configuracoes",
    },
    {
      title: "Resolver Disputas",
      description: "Mediar conflitos entre usuários",
      color:
        "from-warning/10 to-warning/20 dark:from-warning/5 dark:to-warning/10",
      hoverColor:
        "hover:from-warning/20 hover:to-warning/30 dark:hover:from-warning/10 dark:hover:to-warning/15",
      textColor: "text-warning-foreground",
      subTextColor: "text-warning",
      href: "/admin/disputas",
    },
    {
      title: "Logs do Sistema",
      description: "Monitorar atividades e erros",
      color: "from-muted to-muted/50 dark:from-muted/50 dark:to-muted/30",
      hoverColor:
        "hover:from-muted/80 hover:to-muted/60 dark:hover:from-muted/60 dark:hover:to-muted/40",
      textColor: "text-foreground",
      subTextColor: "text-muted-foreground",
      href: "/admin/logs",
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

  const handleExportAs = async (exportFormat: "pdf" | "png") => {
    const area = document.getElementById("dashboard-export-area");
    if (!area) {
      alert("Nenhum conteúdo encontrado para exportar.");
      return;
    }

    setIsExporting(true);

    try {
      const timestamp = format(new Date(), "yyyy-MM-dd-HHmm");

      // html-to-image handles modern CSS (oklch, etc.) natively
      const dataUrl = await toPng(area, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: "#f1f5f9",
        cacheBust: true,
        skipAutoScale: true,
        filter: (node: HTMLElement) => {
          // Skip customize-mode controls if any are present
          if (node?.dataset?.customizeControl) return false;
          return true;
        },
      });

      if (exportFormat === "png") {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `dashboard-allka-${timestamp}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        // Load image to get dimensions
        const img = new Image();
        img.src = dataUrl;
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
        });

        // jsPDF (385 KB) so e necessario ao exportar; carregado sob demanda
        const { default: jsPDF } = await import("jspdf");
        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
        });
        const marginMm = 10;
        const usableWidth = 210 - marginMm * 2;
        const imgHeight = (img.height * usableWidth) / img.width;
        const pageHeight = 297 - marginMm * 2;
        let heightLeft = imgHeight;
        let currentY = marginMm;

        // First page
        pdf.addImage(
          dataUrl,
          "PNG",
          marginMm,
          currentY,
          usableWidth,
          imgHeight,
        );
        heightLeft -= pageHeight;

        // Additional pages if content overflows
        while (heightLeft > 0) {
          pdf.addPage();
          currentY = marginMm - (imgHeight - heightLeft);
          pdf.addImage(
            dataUrl,
            "PNG",
            marginMm,
            currentY,
            usableWidth,
            imgHeight,
          );
          heightLeft -= pageHeight;
        }

        pdf.save(`dashboard-allka-${timestamp}.pdf`);
      }
    } catch (error) {
      console.error("Export error:", error);
      alert("Erro ao exportar. Tente novamente.");
    } finally {
      setIsExporting(false);
    }
  };

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
    const titles: Record<WidgetType, string> = {
      metrics: "Métricas da Área",
      activity: "Atividade Recente da Área",
      alerts: "Alertas do Leader",
      performers: "Nômades em Destaque",
      quickActions: "Ações Rápidas do Leader",
      userDistribution: "Distribuição da Área",
      activeUsers: "Usuários Ativos",
      systemAlerts: "Alertas da Área",
      adminProfiles: "Perfis Administrativos",
      revenue: "Receita",
      activeProjectsWidget: "Tarefas da Área",
      creditPlans: "Briefings e Entregas",
      mrr: "MRR (Receita Recorrente)",
      permissionMatrix: "Matriz de Permissões",
      managementTools: "Ferramentas de Gestão",
      churn: "CHURN",
      averageTicket: "Ticket Médio",
      ltv: "LTV (Lifetime Value)",
      cmv: "CMV (Custo de Mercadoria Vendida)",
      nomads: "Nômades da Área",
      nomadsIndicators: "Indicadores dos Nômades da Área",
      tasks: "Tarefas da Área",
      platformActivities: "Atividades da Área",
      nomadsRanking: "Ranking de Nômades da Área",
      agenciesRanking: "Ranking da Área",
      statusOverview: "Entregas e Aprovações",
      accountsReceivable: "À Receber",
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
    qualificationTasks: CheckSquare,
    briefingsToReview: FileText,
    deliveriesAwaitingAnalysis: Eye,
    tasksInExecution: Activity,
    tasksReturned: XCircle,
    tasksOverdue: AlertCircle,
    approvalsToday: CheckCircle2,
    activeNomadsArea: Users,
  };

  const metricNames: Record<MetricType, string> = {
    qualificationTasks: "Tarefas para qualificação",
    briefingsToReview: "Briefings para revisar",
    deliveriesAwaitingAnalysis: "Entregas aguardando análise",
    tasksInExecution: "Tarefas em execução da área",
    tasksReturned: "Tarefas devolvidas",
    tasksOverdue: "Tarefas atrasadas",
    approvalsToday: "Aprovações feitas hoje",
    activeNomadsArea: "Nômades ativos da área",
  };

  const metricDescriptions: Partial<Record<MetricType, string>> = {
    qualificationTasks: "Tarefas aguardando qualificação — prontas para serem lançadas pelo líder. Clique para gerenciar.",
    briefingsToReview: "Briefings enviados pelos nômades aguardando revisão e aprovação do líder.",
    deliveriesAwaitingAnalysis: "Entregas submetidas pelos nômades aguardando análise e aprovação da área.",
    tasksInExecution: "Tarefas atualmente em andamento ativo pelos nômades da área.",
    tasksReturned: "Tarefas reprovadas e devolvidas para correção pelos nômades. Clique para revisar.",
    tasksOverdue: "Tarefas com prazo de entrega vencido na área — requerem atenção imediata.",
    approvalsToday: "Total de tarefas aprovadas pelo líder no dia de hoje.",
    activeNomadsArea: "Total de nômades com projetos ativos vinculados a esta área.",
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
      case "qualificationTasks":
        bgColor = "from-blue-400 to-blue-600";
        gradientFrom = "from-blue-600/10";
        cardBgGradient = "from-blue-500 to-blue-700";
        borderClass = "border-2 border-blue-300/70 dark:border-blue-300/50";
        shadowClass = "";
        break;
      case "briefingsToReview":
        bgColor = "from-violet-400 to-violet-600";
        gradientFrom = "from-violet-600/10";
        cardBgGradient = "from-violet-500 to-purple-700";
        borderClass =
          "border-2 border-violet-300/70 dark:border-violet-300/50";
        shadowClass = "";
        break;
      case "deliveriesAwaitingAnalysis":
        bgColor = "from-amber-400 to-amber-600";
        gradientFrom = "from-amber-600/10";
        cardBgGradient = "from-amber-500 to-orange-600";
        borderClass = "border-2 border-amber-300/70 dark:border-amber-300/50";
        shadowClass = "";
        break;
      case "tasksInExecution":
        bgColor = "from-emerald-400 to-emerald-600";
        gradientFrom = "from-emerald-600/10";
        cardBgGradient = "from-emerald-500 to-teal-600";
        borderClass = "border-2 border-emerald-300/70 dark:border-emerald-300/50";
        shadowClass = "";
        break;
      case "tasksReturned":
        bgColor = "from-red-400 to-rose-600";
        gradientFrom = "from-red-600/10";
        cardBgGradient = "from-red-500 to-rose-700";
        borderClass = "border-2 border-red-300/70 dark:border-red-300/50";
        shadowClass = "";
        break;
      case "tasksOverdue":
        bgColor = "from-orange-400 to-orange-600";
        gradientFrom = "from-orange-600/10";
        cardBgGradient = "from-orange-500 to-rose-600";
        borderClass = "border-2 border-orange-300/70 dark:border-orange-300/50";
        shadowClass = "";
        break;
      case "approvalsToday":
        bgColor = "from-cyan-400 to-cyan-600";
        gradientFrom = "from-cyan-600/10";
        cardBgGradient = "from-cyan-500 to-sky-700";
        borderClass = "border-2 border-cyan-300/70 dark:border-cyan-300/50";
        shadowClass = "";
        break;
      case "activeNomadsArea":
        bgColor = "from-purple-400 to-purple-600";
        gradientFrom = "from-purple-600/10";
        cardBgGradient = "from-purple-500 to-fuchsia-700";
        borderClass = "border-2 border-purple-300/70 dark:border-purple-300/50";
        shadowClass = "";
        break;
      default:
        bgColor = "from-muted to-muted-foreground";
        gradientFrom = "from-muted/5";
        cardBgGradient = "from-slate-500 to-slate-700";
        borderClass = "border-2 border-slate-400/50 dark:border-slate-300/40";
        shadowClass = "";
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
        isDragOver &&
          "ring-2 ring-primary ring-offset-2 scale-[1.02] shadow-lg",
        !isDragging &&
          !isDragOver &&
          !isEditing &&
          "hover:shadow-lg hover:-translate-y-0.5",
      ),
    };

    const cardDescription = metricDescriptions[metricType];

    if (metricType === "activeNomadsArea") {
      return (
        <div
          key={metricType}
          draggable={isEditing}
          onDragStart={(e: React.DragEvent) =>
            handleMetricDragStart(e, metricType)
          }
          onDragOver={(e: React.DragEvent) =>
            handleMetricDragOver(e, metricType)
          }
          onDragLeave={handleMetricDragLeave}
          onDrop={(e: React.DragEvent) => handleMetricDrop(e, metricType)}
          onDragEnd={handleMetricDragEnd}
          onClick={!isEditing && METRIC_NAV[metricType] ? () => navigate(METRIC_NAV[metricType]) : undefined}
          role={!isEditing && METRIC_NAV[metricType] ? "button" : undefined}
          tabIndex={!isEditing && METRIC_NAV[metricType] ? 0 : undefined}
          aria-label={METRIC_NAV[metricType] ? `Abrir ${metricName}` : undefined}
          onKeyDown={
            !isEditing && METRIC_NAV[metricType]
              ? (e: React.KeyboardEvent) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate(METRIC_NAV[metricType]);
                  }
                }
              : undefined
          }
          className={cn(
            `relative rounded-2xl overflow-hidden shadow-lg transition-all duration-200 bg-gradient-to-br ${cardBgGradient} ${borderClass} ${shadowClass}`,
            isEditing && "cursor-grab active:cursor-grabbing",
            isDragging && "opacity-40 scale-95",
            isDragOver && "ring-2 ring-white ring-offset-2 scale-[1.02]",
            !isDragging &&
              !isDragOver &&
              !isEditing &&
              "hover:shadow-xl hover:scale-[1.02]",
            !isEditing && !!METRIC_NAV[metricType] && "cursor-pointer",
          )}
        >
          {isEditing && (
            <div className="absolute top-1.5 right-1.5 z-10">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMetricVisibility(metricType);
                }}
                className="bg-white/25 hover:bg-white/40 rounded-md p-0.5 transition-colors"
              >
                <EyeOff className="h-3 w-3 text-white" />
              </button>
            </div>
          )}
          <div className="px-4 pt-2 pb-2">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-semibold text-white/80 uppercase tracking-wider">
                {metricName}
              </p>
              <div className="bg-white/20 rounded-lg p-1 flex-shrink-0 ml-2">
                <Icon className="h-4 w-4 text-white" />
              </div>
            </div>
            <p className="text-xl font-bold text-white leading-none mb-1.5">
              {metric.value}
            </p>
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-white/20 text-white">
                {metric.trend === "up" ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {metric.trend === "up" ? "+" : "-"}
                {Math.abs(metric.change)}%
              </div>
              <span className="text-[10px] text-white/60">
                {metricType === "activeNomadsArea" ? "nômades da área" : "vs. anterior"}
              </span>
            </div>
          </div>
          {!isEditing && cardDescription && (
            <div className="absolute bottom-2 right-2 z-20">
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center justify-center w-5 h-5 rounded-full bg-white/20 hover:bg-white/40 transition-colors cursor-help"
                    >
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

    // Adicionar botão de ver gráfico
    return (
      <div
        key={metricType}
        draggable={isEditing}
        onDragStart={(e: React.DragEvent) =>
          handleMetricDragStart(e, metricType)
        }
        onDragOver={(e: React.DragEvent) => handleMetricDragOver(e, metricType)}
        onDragLeave={handleMetricDragLeave}
        onDrop={(e: React.DragEvent) => handleMetricDrop(e, metricType)}
        onDragEnd={handleMetricDragEnd}
        onClick={!isEditing && METRIC_NAV[metricType] ? () => navigate(METRIC_NAV[metricType]) : undefined}
        role={!isEditing && METRIC_NAV[metricType] ? "button" : undefined}
        tabIndex={!isEditing && METRIC_NAV[metricType] ? 0 : undefined}
        aria-label={METRIC_NAV[metricType] ? `Abrir ${metricName}` : undefined}
        onKeyDown={
          !isEditing && METRIC_NAV[metricType]
            ? (e: React.KeyboardEvent) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigate(METRIC_NAV[metricType]);
                }
              }
            : undefined
        }
        className={cn(
          `relative rounded-2xl overflow-hidden shadow-lg transition-all duration-200 bg-gradient-to-br ${cardBgGradient} ${borderClass} ${shadowClass}`,
          isEditing && "cursor-grab active:cursor-grabbing",
          isDragging && "opacity-40 scale-95",
          isDragOver && "ring-2 ring-white ring-offset-2 scale-[1.02]",
          !isDragging &&
            !isDragOver &&
            !isEditing &&
            "hover:shadow-xl hover:scale-[1.02]",
          !isEditing && !!METRIC_NAV[metricType] && "cursor-pointer",
        )}
      >
        {isEditing && (
          <div className="absolute top-1.5 right-1.5 z-10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleMetricVisibility(metricType);
              }}
              className="bg-white/25 hover:bg-white/40 rounded-md p-0.5 transition-colors"
            >
              <EyeOff className="h-3 w-3 text-white" />
            </button>
          </div>
        )}
        <div className="px-4 pt-2 pb-2">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-semibold text-white/80 uppercase tracking-wider">
              {metricName}
            </p>
            <div className="bg-white/20 rounded-lg p-1 flex-shrink-0 ml-2">
              <Icon className="h-4 w-4 text-white" />
            </div>
          </div>
          <p className="text-xl font-bold text-white leading-none mb-1.5">
            {typeof metric.value === "number"
              ? metric.value.toLocaleString()
              : metric.value}
          </p>
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-white/20 text-white">
              {metric.trend === "up" ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {metric.trend === "up" ? "+" : "-"}
              {Math.abs(metric.change)}
              {metricType === "activeNomadsArea" ? "" : "%"}
            </div>
            <span className="text-[10px] text-white/60">
              {metricType === "activeNomadsArea" ? "da área" : "vs. anterior"}
            </span>
          </div>
        </div>
        {!isEditing && cardDescription && (
          <div className="absolute bottom-2 right-2 z-20">
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center justify-center w-5 h-5 rounded-full bg-white/20 hover:bg-white/40 transition-colors cursor-help"
                  >
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
    const title = getWidgetTitle(detailsWidgetId);

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
    // genData aplica os dados reais do Leader (withLeaderReal) também no modal de
    // detalhes — assim nenhuma seção de widget do Leader exibe número mock.
    const mData = genData(modalPeriod.from, modalPeriod.to);
    const mPaW = mData.platformActivities;
    const mArW = mData.accountsReceivable;

    const cfgMap: Record<string, { icon: React.ReactNode; subtitle: string }> =
      {
        metrics: {
          icon: <LayoutGrid className="h-6 w-6" />,
          subtitle: "Resumo das tarefas, entregas e nômades da área",
        },
        tasks: {
          icon: <CheckSquare className="h-6 w-6" />,
          subtitle: "Tarefas da área com status e execução",
        },
        statusOverview: {
          icon: <LayoutGrid className="h-6 w-6" />,
          subtitle: "Visão geral das entregas e aprovações da área",
        },
        nomadsIndicators: {
          icon: <Users className="h-6 w-6" />,
          subtitle: "Indicadores de desempenho dos nômades da área",
        },
        nomadsRanking: {
          icon: <Trophy className="h-6 w-6" />,
          subtitle: "Ranking dos nômades da área",
        },
        activity: {
          icon: <Activity className="h-6 w-6" />,
          subtitle: "Atividade recente da área",
        },
        alerts: {
          icon: <Bell className="h-6 w-6" />,
          subtitle: "Alertas que pedem ação do Leader",
        },
        quickActions: {
          icon: <Zap className="h-6 w-6" />,
          subtitle: "Ações rápidas do Leader",
        },
        platformActivities: {
          icon: <Activity className="h-6 w-6" />,
          subtitle: "Engajamento e atividades da área",
        },
        statusOverview: {
          icon: <LayoutGrid className="h-6 w-6" />,
          subtitle: "Status de projetos e tarefas",
        },
        tasks: {
          icon: <CheckSquare className="h-6 w-6" />,
          subtitle: "Tarefas e execução",
        },
        nomadsIndicators: {
          icon: <Users className="h-6 w-6" />,
          subtitle: "KPIs de desempenho e qualidade",
        },
        activity: {
          icon: <Activity className="h-6 w-6" />,
          subtitle: "Atividades recentes",
        },
        alerts: {
          icon: <Bell className="h-6 w-6" />,
          subtitle: "Alertas e notificações",
        },
        performers: {
          icon: <Award className="h-6 w-6" />,
          subtitle: "Top performers",
        },
        quickActions: {
          icon: <Zap className="h-6 w-6" />,
          subtitle: "Ações rápidas",
        },
        partnerProgram: {
          icon: <Award className="h-6 w-6" />,
          subtitle: "Convites e partners por nível",
        },
      };
    const cfg = cfgMap[detailsWidgetId] ?? {
      icon: <Settings className="h-6 w-6" />,
      subtitle: "Detalhes do widget",
    };

    const renderContent = () => {
      switch (detailsWidgetId) {
        case "metrics": {
          const mp = getMetricsForPeriod(undefined, modalPeriodKey);
          const items: Array<{
            key: string;
            label: string;
            value: string | number;
            change?: number;
            trend?: "up" | "down";
            suffix?: string;
          }> = [
            {
              key: "qualificationTasks",
              label: "Tarefas para qualificação",
              value: mp.qualificationTasks.value,
              change: mp.qualificationTasks.change,
              trend: mp.qualificationTasks.trend,
            },
            {
              key: "briefingsToReview",
              label: "Briefings para revisar",
              value: mp.briefingsToReview.value,
              change: mp.briefingsToReview.change,
              trend: mp.briefingsToReview.trend,
            },
            {
              key: "deliveriesAwaitingAnalysis",
              label: "Entregas aguardando análise",
              value: mp.deliveriesAwaitingAnalysis.value,
              change: mp.deliveriesAwaitingAnalysis.change,
              trend: mp.deliveriesAwaitingAnalysis.trend,
            },
            {
              key: "tasksInExecution",
              label: "Tarefas em execução",
              value: mp.tasksInExecution.value,
              change: mp.tasksInExecution.change,
              trend: mp.tasksInExecution.trend,
            },
            {
              key: "tasksReturned",
              label: "Tarefas devolvidas",
              value: mp.tasksReturned.value,
              change: mp.tasksReturned.change,
              trend: mp.tasksReturned.trend,
            },
            {
              key: "tasksOverdue",
              label: "Tarefas atrasadas",
              value: mp.tasksOverdue.value,
              change: mp.tasksOverdue.change,
              trend: mp.tasksOverdue.trend,
            },
            {
              key: "approvalsToday",
              label: "Aprovações hoje",
              value: mp.approvalsToday.value,
              change: mp.approvalsToday.change,
              trend: mp.approvalsToday.trend,
            },
            {
              key: "activeNomadsArea",
              label: "Nômades ativos",
              value: mp.activeNomadsArea.value,
              change: mp.activeNomadsArea.change,
              trend: mp.activeNomadsArea.trend,
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
                            {it.key === "activeNomadsArea" ? "" : "%"}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                            {it.key === "activeNomadsArea" ? "da área" : "vs. anterior"}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                    <p className="text-sm font-semibold mb-2">Tarefas da área</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between gap-3">
                        <span className="text-muted-foreground">Em execução</span>
                        <span className="font-medium">{mData.tasks.inProgress.toLocaleString("pt-BR")}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-muted-foreground">Concluídas</span>
                        <span className="font-medium">{mData.tasks.completed.toLocaleString("pt-BR")}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-muted-foreground">Contratadas</span>
                        <span className="font-medium">{mData.tasks.contracted.toLocaleString("pt-BR")}</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                    <p className="text-sm font-semibold mb-2">Nômades da área</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between gap-3">
                        <span className="text-muted-foreground">Ativos</span>
                        <span className="font-medium">{mData.nomads.active.toLocaleString("pt-BR")}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-muted-foreground">Certificados</span>
                        <span className="font-medium">{mData.nomadsIndicators.certified.toLocaleString("pt-BR")}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-muted-foreground">Retenção 30d</span>
                        <span className="font-medium">{mData.nomads.retention30d}%</span>
                      </div>
                    </div>
                  </div>
                </div>
            </div>
          );
        }

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

        case "nomadsIndicators": {
          const ni = mData.nomadsIndicators;
          return (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800">
                <p className="text-sm text-muted-foreground">
                  Tempo Médio por Tarefa
                </p>
                <p className="text-3xl font-bold text-violet-700 dark:text-violet-300">
                  {ni.avgTimePerTask.toFixed(1)} dias
                </p>
              </div>
              <div className="space-y-3">
                {[
                  {
                    label: "Taxa de Entrega",
                    display: `${ni.deliveryRate.toFixed(1)}%`,
                    pct: ni.deliveryRate,
                    color: "bg-green-500",
                    chip: "text-green-700 dark:text-green-300",
                    bg: "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800",
                  },
                  {
                    label: "Avaliação Média",
                    display: `${ni.avgRating.toFixed(1)} / 5.0`,
                    pct: (ni.avgRating / 5) * 100,
                    color: "bg-amber-500",
                    chip: "text-amber-700 dark:text-amber-300",
                    bg: "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800",
                  },
                  {
                    label: "Certificados",
                    display: `${ni.certified}%`,
                    pct: ni.certified,
                    color: "bg-violet-500",
                    chip: "text-violet-700 dark:text-violet-300",
                    bg: "bg-violet-50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-800",
                  },
                  {
                    label: "Retenção 90 dias",
                    display: `${ni.retention90d}%`,
                    pct: ni.retention90d,
                    color: "bg-teal-500",
                    chip: "text-teal-700 dark:text-teal-300",
                    bg: "bg-teal-50 dark:bg-teal-950/20 border-teal-200 dark:border-teal-800",
                  },
                ].map((kpi) => (
                  <div
                    key={kpi.label}
                    className={`p-4 rounded-xl border ${kpi.bg}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        {kpi.label}
                      </span>
                      <span className={`text-base font-bold ${kpi.chip}`}>
                        {kpi.display}
                      </span>
                    </div>
                    <div className="h-2 bg-secondary/60 rounded-full overflow-hidden">
                      <div
                        className={`h-2 ${kpi.color} rounded-full`}
                        style={{ width: `${kpi.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        }

        case "nomadsRanking": {
          const perfList = mData.performers;
          const medals = [
            "text-yellow-500",
            "text-slate-400",
            "text-amber-600",
          ];
          return (
            <div className="space-y-3">
              {perfList.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <Trophy className="h-8 w-8 text-warning mx-auto opacity-40" />
                  <p className="text-sm text-muted-foreground">
                    Nenhum nômade no ranking ainda.
                  </p>
                </div>
              ) : (
                perfList.map(
                  (
                    performer: {
                      id: string;
                      name: string;
                      rating: number;
                      projects: number;
                      badge: string;
                    },
                    index: number,
                  ) => (
                    <div
                      key={performer.id}
                      className="flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors"
                    >
                      <div className="relative shrink-0">
                        <div className="h-11 w-11 rounded-full bg-gradient-to-br from-warning to-orange-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
                          {index + 1}
                        </div>
                        <Award
                          className={`absolute -bottom-1 -right-1 h-4 w-4 ${medals[index] ?? "text-chart-4"}`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">
                          {performer.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="flex items-center gap-0.5 text-xs">
                            <Star className="h-3 w-3 text-warning fill-warning" />
                            {performer.rating}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            • {performer.projects} proj.
                          </span>
                          <span
                            className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${performer.badge === "gold" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" : performer.badge === "silver" ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"}`}
                          >
                            {performer.badge === "gold"
                              ? "Ouro"
                              : performer.badge === "silver"
                                ? "Prata"
                                : "Bronze"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ),
                )
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
                      to: "/admin/usuarios",
                      icon: Users,
                      label: "Gerenciar Usuários",
                      desc: "Criar, editar e desativar contas",
                      border: "border-info/20",
                      bg: "bg-info/5",
                      text: "text-info",
                    },
                    {
                      to: "/leader/nomades",
                      icon: UserCheck,
                      label: "Gerenciar Nômades",
                      desc: "Ver e gerenciar a base de nômades",
                      border: "border-success/20",
                      bg: "bg-success/5",
                      text: "text-success",
                    },
                    {
                      to: "/leader/projetos",
                      icon: Briefcase,
                      label: "Ver Projetos",
                      desc: "Todos os projetos ativos",
                      border: "border-chart-4/20",
                      bg: "bg-chart-4/5",
                      text: "text-chart-4",
                    },
                    {
                      to: "/admin/configuracoes",
                      icon: Settings,
                      label: "Configurações",
                      desc: "Ajustar parâmetros do sistema",
                      border: "border-warning/20",
                      bg: "bg-warning/5",
                      text: "text-warning",
                    },
                    {
                      to: "/admin/permissoes",
                      icon: Key,
                      label: "Permissões",
                      desc: "Perfis e acessos administrativos",
                      border: "border-violet-200 dark:border-violet-800",
                      bg: "bg-violet-50 dark:bg-violet-950/20",
                      text: "text-violet-600 dark:text-violet-400",
                    },
                    {
                      to: "/leader/relatorios",
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
                  // Quando o widget herda o período global, espelha o label real
                  // do topo (ex.: "Últimos 90 dias") em vez de "Período global",
                  // evitando o conflito visual topo × card.
                  const activeLabel = isCustom
                    ? wp!.customPeriod!.label
                    : globalPeriod.label;
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
                      Métricas da área
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
                          const metricNames: Record<MetricType, string> = {
                            qualificationTasks: "Tarefas para qualificação",
                            briefingsToReview: "Briefings para revisar",
                            deliveriesAwaitingAnalysis: "Entregas aguardando análise",
                            tasksInExecution: "Tarefas em execução da área",
                            tasksReturned: "Tarefas devolvidas",
                            tasksOverdue: "Tarefas atrasadas",
                            approvalsToday: "Aprovações feitas hoje",
                            activeNomadsArea: "Nômades ativos da área",
                          };
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
                    const widgetBase = getMetricsForPeriod(
                      undefined,
                      wp.periodKey,
                    );
                    const widgetMetrics = widgetBase;
                    return (
                      <>
                        {metricCards
                          .filter((m) => m.visible)
                          .sort((a, b) => a.order - b.order)
                          .map((metricCard) =>
                            renderMetricCard(metricCard.id, widgetMetrics),
                          )}

                        {/* Sub-bloco "Agências/Nômades/Admins" removido do Leader:
                            era distribuição de contas (mock/admin), não métrica de
                            área. Os KPIs do Leader acima já vêm de /lider/*. */}
                      </>
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
                      Atividades recentes da área
                    </p>
                  </div>
                  <Link to="/leader/historico" className="shrink-0">
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
                {recentActivities.map((activity) => {
                  const inner = (
                    <>
                      <div
                        className={`p-2 rounded-xl ${activity.bgColor} shadow-sm`}
                      >
                        <activity.icon
                          className={`h-4 w-4 ${activity.color}`}
                        />
                      </div>
                      <div className="flex-1 space-y-1 min-w-0">
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
                      {(activity as any).to && !isCustomizeMode && (
                        <ArrowRightIcon className="h-3.5 w-3.5 text-muted-foreground self-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </>
                  );
                  const baseCls =
                    "group flex items-start space-x-3 p-3 rounded-xl hover:bg-muted/50 transition-all duration-200 hover:shadow-md border border-transparent hover:border-border/50";
                  return (activity as any).to && !isCustomizeMode ? (
                    <Link
                      key={activity.id}
                      to={(activity as any).to}
                      className={cn(baseCls, "cursor-pointer")}
                    >
                      {inner}
                    </Link>
                  ) : (
                    <div key={activity.id} className={baseCls}>
                      {inner}
                    </div>
                  );
                })}
                {recentActivities.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <Activity className="h-7 w-7 text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {leaderError
                        ? "Não foi possível carregar a atividade da área."
                        : leaderLoading
                          ? "Carregando atividade…"
                          : "Nenhuma atividade recente na sua área."}
                    </p>
                  </div>
                )}
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
                      Alertas da área
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
                  {systemAlerts.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <CheckCircle2 className="h-7 w-7 text-success/60 mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {leaderError
                          ? "Não foi possível carregar os alertas da área."
                          : leaderLoading
                            ? "Carregando alertas…"
                            : "Nenhum alerta no momento. Tudo em dia! 🎉"}
                      </p>
                    </div>
                  )}
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
                      Atalhos do leader
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
                        to: "/leader/qualificacao",
                        icon: CheckCircle2,
                        label: "Qualificar Tarefa",
                        border: "border-info/20",
                        bg: "bg-info/5 hover:bg-info/10",
                        text: "text-info",
                      },
                      {
                        to: "/leader/tarefas",
                        icon: Briefcase,
                        label: "Ver Tarefas da Área",
                        border: "border-success/20",
                        bg: "bg-success/5 hover:bg-success/10",
                        text: "text-success",
                      },
                      {
                        to: "/leader/devolvidas",
                        icon: AlertCircle,
                        label: "Tarefas Devolvidas",
                        border: "border-warning/20",
                        bg: "bg-warning/5 hover:bg-warning/10",
                        text: "text-warning",
                      },
                      {
                        to: "/leader/nomades",
                        icon: Users,
                        label: "Nômades da Área",
                        border: "border-chart-4/20",
                        bg: "bg-chart-4/5 hover:bg-chart-4/10",
                        text: "text-chart-4",
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

      case "nomadsRanking": {
        const wPerfW = genData(
          effectivePeriod.from,
          effectivePeriod.to,
        ).performers;
        const top3 = wPerfW.slice(0, 3);
        const rest = wPerfW.slice(3);
        const podiumOrder =
          top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3;
        const podiumIdx = top3.length >= 3 ? [1, 0, 2] : [0, 1, 2];
        const medalColors = [
          {
            ring: "ring-yellow-400",
            bg: "from-yellow-400 to-amber-500",
            shadow: "shadow-yellow-400/40",
            crown: "text-yellow-400",
            label: "bg-yellow-400/20 text-yellow-700 dark:text-yellow-400",
            barH: "h-20",
          },
          {
            ring: "ring-slate-400",
            bg: "from-slate-400 to-slate-500",
            shadow: "shadow-slate-400/40",
            crown: "text-slate-400",
            label:
              "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
            barH: "h-16",
          },
          {
            ring: "ring-amber-600",
            bg: "from-amber-600 to-orange-600",
            shadow: "shadow-amber-600/40",
            crown: "text-amber-600",
            label:
              "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
            barH: "h-14",
          },
        ];
        const posLabels = ["🥇 1º Lugar", "🥈 2º Lugar", "🥉 3º Lugar"];
        return (
          <Card className="overflow-hidden" data-widget-id={widget.type}>
            <CardHeader className="pb-3 relative">
              <div className="flex items-center gap-3 pr-20">
                <div className="p-2 bg-warning/10 rounded-lg shrink-0">
                  <Trophy className="h-4 w-4 text-warning" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base font-semibold leading-tight">
                    Ranking de Nômades
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Os melhores nômades da plataforma
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
              {/* Podium — top 3 */}
              {top3.length > 0 && (
                <div className="flex items-end justify-center gap-3 pt-2">
                  {podiumOrder.map((performer, pIdx) => {
                    const rank = podiumIdx[pIdx];
                    const mc = medalColors[rank];
                    return (
                      <div
                        key={performer.id}
                        className={`flex flex-col items-center gap-1.5 ${rank === 0 ? "scale-110 z-10" : ""}`}
                      >
                        {/* Crown for #1 */}
                        {rank === 0 && (
                          <Trophy className="h-5 w-5 text-yellow-400 drop-shadow" />
                        )}
                        {/* Avatar */}
                        <div
                          className={`relative ring-2 ${mc.ring} rounded-full shadow-lg ${mc.shadow}`}
                        >
                          <div
                            className={`h-14 w-14 rounded-full bg-gradient-to-br ${mc.bg} flex items-center justify-center text-white font-bold text-lg`}
                          >
                            {performer.avatar}
                          </div>
                          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-background rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none border">
                            {rank + 1}
                          </div>
                        </div>
                        {/* Name */}
                        <p className="text-xs font-semibold text-center leading-tight max-w-[72px] truncate">
                          {performer.name.split(" ")[0]}
                        </p>
                        <p className="text-[10px] text-muted-foreground text-center max-w-[72px] truncate">
                          {performer.specialty}
                        </p>
                        {/* Rating */}
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`h-2.5 w-2.5 ${s <= Math.round(performer.rating) ? "text-warning fill-warning" : "text-muted-foreground"}`}
                            />
                          ))}
                        </div>
                        <span className="text-[10px] font-bold">
                          {performer.rating}
                        </span>
                        {/* Podium bar */}
                        <div
                          className={`w-14 ${mc.barH} bg-gradient-to-b ${mc.bg} rounded-t-lg opacity-80 flex items-start justify-center pt-1`}
                        >
                          <span className="text-white text-[9px] font-bold">
                            {performer.projects} proj.
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {/* Rest of ranking — compact list */}
              {rest.length > 0 && (
                <div className="space-y-1.5 pt-1 border-t">
                  {rest.map((performer, idx) => {
                    const rank = idx + 3;
                    return (
                      <div
                        key={performer.id}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <span className="text-sm font-bold text-muted-foreground w-5 text-center">
                          {rank + 1}
                        </span>
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                          {performer.avatar}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">
                            {performer.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {performer.specialty}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Star className="h-3 w-3 text-warning fill-warning" />
                          <span className="text-xs font-medium">
                            {performer.rating}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {performer.projects} proj.
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
              {wPerfW.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Trophy className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhum nômade no ranking ainda.</p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      }

      case "statusOverview": {
        const wSoW = genData(
          effectivePeriod.from,
          effectivePeriod.to,
        ).statusOverview;
        const soSections = [
          {
            label: "Projetos",
            icon: <Briefcase className="h-4 w-4" />,
            iconBg: "bg-blue-500/10",
            iconColor: "text-blue-500",
            href: "/admin/projects",
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
            href: "/admin/tasks",
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
            href: "/admin/leads",
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
        const wTasksW = genData(
          effectivePeriod.from,
          effectivePeriod.to,
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

      case "nomadsIndicators": {
        const wNiW = genData(
          effectivePeriod.from,
          effectivePeriod.to,
        ).nomadsIndicators;
        return (
          <Card className="overflow-hidden" data-widget-id={widget.type}>
            <CardHeader className="pb-4 relative">
              <div className="flex items-center gap-3 pr-20">
                <div className="p-2 bg-chart-4/10 rounded-lg shrink-0">
                  <Users className="h-4 w-4 text-chart-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base font-semibold leading-tight">
                    Indicadores dos Nômades
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    KPIs de desempenho e qualidade
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
                  label: "Taxa de Entrega",
                  value: `${wNiW.deliveryRate.toFixed(1).replace(".", ",")}%`,
                  icon: CheckSquare,
                  color: "text-success",
                },
                {
                  label: "Qualidade Média",
                  value: `${wNiW.avgRating.toFixed(1).replace(".", ",")} ★`,
                  icon: Star,
                  color: "text-warning",
                },
                {
                  label: "Tempo Médio / Tarefa",
                  value: `${wNiW.avgTimePerTask.toFixed(1).replace(".", ",")} dias`,
                  icon: Clock,
                  color: "text-info",
                },
                {
                  label: "Nômades Certificados",
                  value: `${wNiW.certified}%`,
                  icon: Award,
                  color: "text-chart-4",
                },
                {
                  label: "Retenção 90 dias",
                  value: `${wNiW.retention90d}%`,
                  icon: TrendingUp,
                  color: "text-success",
                },
              ].map((kpi) => (
                <div
                  key={kpi.label}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <kpi.icon className={`h-4 w-4 shrink-0 ${kpi.color}`} />
                    <span className="text-sm font-medium text-muted-foreground truncate">
                      {kpi.label}
                    </span>
                  </div>
                  <span
                    className={`text-base font-bold shrink-0 ml-2 ${kpi.color}`}
                  >
                    {kpi.value}
                  </span>
                </div>
              ))}
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
    localStorage.setItem(DASHBOARD_STORAGE_KEY["LEADER"], JSON.stringify(updatedDashboards));
    localStorage.setItem(CURRENT_DASHBOARD_KEY["LEADER"], newDashboard.id);

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
    localStorage.setItem(DASHBOARD_STORAGE_KEY["LEADER"], JSON.stringify(updatedDashboards));

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
        "dashboard-widget-config",
        JSON.stringify(dashboard.widgets),
      );
      localStorage.setItem(CURRENT_DASHBOARD_KEY["LEADER"], dashboardId);
    }
  };

  const handleDeleteDashboard = (dashboardId: string) => {
    const updatedDashboards = savedDashboards.filter(
      (d) => d.id !== dashboardId,
    );
    setSavedDashboards(updatedDashboards);
    localStorage.setItem(DASHBOARD_STORAGE_KEY["LEADER"], JSON.stringify(updatedDashboards));
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
    localStorage.setItem(DASHBOARD_STORAGE_KEY["LEADER"], JSON.stringify(updatedDashboards));
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
    <DashboardShellFrame ref={dashboardScrollRef}>
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
                    <p className="font-semibold text-xs mb-1.5">Dashboard do Líder</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Acompanhe as tarefas, qualificações e entregas da área em tempo real.
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
                            {savedDashboards.find((d) => d.id === currentDashboardId)?.name ?? "Selecionar dashboard"}
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
                          {savedDashboards.length === 0 && (
                            <p className="px-3 py-3 text-xs text-muted-foreground text-center">Nenhum dashboard salvo</p>
                          )}
                        </div>
                        {/* Footer action */}
                        <div className="border-t border-border/50 p-1">
                          <DropdownMenuItem
                            onSelect={() => {
                              setDraftWidgets([]);
                              setEditHeaderName("");
                              setIsEditingHeaderName(true);
                              setEditModalMode("adicionar");
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

            {/* Ações (Export/Histórico/Compartilhar/Editar) — colam à direita no desktop, quebram no mobile */}
            <div className="flex items-center gap-1 shrink-0 xl:ml-auto">

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
                      setDraftWidgets([...widgets].sort((a, b) => a.order - b.order));
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
      </div>
      {/* Export capture area: metrics + widgets */}
      <div id="dashboard-export-area" className="flex flex-col gap-4">
        {/* Metrics Cards */}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
          {metricCards
            .filter((m) => m.visible)
            .sort((a, b) => a.order - b.order)
            .map((metric) => renderMetricCard(metric.id))}
        </div>

        {/* Estado dos dados reais do Leader (/lider/*) — erro / carregando */}
        {leaderError ? (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span className="text-sm font-medium">
                Não foi possível carregar os dados do líder agora.
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadLeaderReal()}
              className="h-8 gap-1.5 text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Tentar novamente
            </Button>
          </div>
        ) : leaderLoading ? (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-border/60 bg-muted/40 px-4 py-2.5 text-muted-foreground">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            <span className="text-xs">Atualizando dados da área…</span>
          </div>
        ) : null}

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
              <TabsList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 w-full">
                <TabsTrigger value="permission">Permissão</TabsTrigger>
                <TabsTrigger value="pin">PIN</TabsTrigger>
                <TabsTrigger value="expiry">Expiração</TabsTrigger>
              </TabsList>

              {/* Permissão */}
              <TabsContent value="permission" className="space-y-3 pt-2">
                <p className="text-sm text-muted-foreground">
                  Quem acessar o link poderá:
                </p>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setSharePermission("view")}
                    className={cn(
                      "w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-all",
                      sharePermission === "view"
                        ? "border-violet-400 bg-violet-50 dark:bg-violet-950/25 dark:border-violet-600"
                        : "border-border hover:bg-muted/50",
                    )}
                  >
                    <div
                      className={cn(
                        "mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0",
                        sharePermission === "view"
                          ? "border-violet-500"
                          : "border-muted-foreground",
                      )}
                    >
                      {sharePermission === "view" && (
                        <div className="h-2 w-2 rounded-full bg-violet-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">Somente Visualizar</p>
                      <p className="text-xs text-muted-foreground">
                        Acesso de leitura aos dados do dashboard
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSharePermission("comment")}
                    className={cn(
                      "w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-all",
                      sharePermission === "comment"
                        ? "border-violet-400 bg-violet-50 dark:bg-violet-950/25 dark:border-violet-600"
                        : "border-border hover:bg-muted/50",
                    )}
                  >
                    <div
                      className={cn(
                        "mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0",
                        sharePermission === "comment"
                          ? "border-violet-500"
                          : "border-muted-foreground",
                      )}
                    >
                      {sharePermission === "comment" && (
                        <div className="h-2 w-2 rounded-full bg-violet-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        Visualizar + Comentar
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Pode adicionar comentários e anotações
                      </p>
                    </div>
                  </button>
                </div>
                {/* Period being shared */}
                <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs border border-border/50 flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Este link abrirá com:</span>
                  <strong className="text-foreground">{globalPeriod.label}</strong>
                </div>
                {/* Allow filter changes */}
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Permitir alterar filtros</p>
                    <p className="text-xs text-muted-foreground">
                      Quem receber pode mudar período e datas
                    </p>
                  </div>
                  <Switch
                    checked={shareAllowFilterChanges}
                    onCheckedChange={(v) => {
                      setShareAllowFilterChanges(v);
                      setGeneratedShareLink("");
                    }}
                  />
                </div>
              </TabsContent>

              {/* PIN */}
              <TabsContent value="pin" className="space-y-3 pt-2">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Proteger com PIN</p>
                    <p className="text-xs text-muted-foreground">
                      Solicitar um PIN de 4 dígitos para acessar
                    </p>
                  </div>
                  <Switch
                    checked={sharePinEnabled}
                    onCheckedChange={(v) => {
                      setSharePinEnabled(v);
                      if (!v) setSharePin("");
                      setGeneratedShareLink("");
                    }}
                  />
                </div>
                {sharePinEnabled && (
                  <div className="space-y-1.5">
                    <Label htmlFor="share-pin" className="text-sm">
                      PIN (4 dígitos)
                    </Label>
                    <Input
                      id="share-pin"
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={sharePin}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                        setSharePin(v);
                        setGeneratedShareLink("");
                      }}
                      placeholder="••••"
                      className="text-center tracking-[0.5em] text-lg w-28"
                    />
                    {sharePinEnabled &&
                      sharePin.length > 0 &&
                      sharePin.length < 4 && (
                        <p className="text-xs text-destructive">
                          Digite exatamente 4 dígitos
                        </p>
                      )}
                  </div>
                )}
              </TabsContent>

              {/* Expiração */}
              <TabsContent value="expiry" className="space-y-3 pt-2">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Definir Expiração</p>
                    <p className="text-xs text-muted-foreground">
                      O link deixa de funcionar após essa data
                    </p>
                  </div>
                  <Switch
                    checked={shareExpiryEnabled}
                    onCheckedChange={(v) => {
                      setShareExpiryEnabled(v);
                      if (!v) setShareExpiry("");
                      setGeneratedShareLink("");
                    }}
                  />
                </div>
                {shareExpiryEnabled && (
                  <div className="space-y-1.5">
                    <Label htmlFor="share-expiry" className="text-sm">
                      Data de expiração
                    </Label>
                    <Input
                      id="share-expiry"
                      type="date"
                      value={shareExpiry}
                      min={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => {
                        setShareExpiry(e.target.value);
                        setGeneratedShareLink("");
                      }}
                    />
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Generated Link */}
            <div className="space-y-2 pt-1">
              <div className="flex gap-2">
                <Button
                  className="flex-1 btn-brand"
                  onClick={handleGenerateShareLink}
                  disabled={sharePinEnabled && sharePin.length !== 4}
                >
                  <Link2 className="h-4 w-4 mr-1.5" />
                  Gerar Link
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
          };
          const availableWidgets = widgetLibrary
            .filter((lib) => ROLE_WIDGET_IDS.has(lib.id))
            .filter((lib) => !draftWidgets.some((dw) => dw.type === lib.id));
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
                  <div className="flex items-center justify-between">
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
                            : `Arraste para reordenar · ${draftWidgets.filter((w) => w.visible).length} widgets ativos`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Mode buttons */}
                      <button
                        onClick={() =>
                          setEditModalMode((m) =>
                            m === "remover" ? "none" : "remover",
                          )
                        }
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                          editModalMode === "remover"
                            ? "bg-red-500 text-white shadow-md"
                            : "bg-white/15 hover:bg-white/25 text-white/90",
                        )}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remover
                      </button>
                      <button
                        onClick={() =>
                          setEditModalMode((m) =>
                            m === "adicionar" ? "none" : "adicionar",
                          )
                        }
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                          editModalMode === "adicionar"
                            ? "bg-emerald-500 text-white shadow-md"
                            : "bg-white/15 hover:bg-white/25 text-white/90",
                        )}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Adicionar
                      </button>
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

                {/* Body */}
                <div className="flex flex-1 overflow-hidden">
                  {/* Main widgets grid */}
                  <div
                    className={cn(
                      "flex-1 overflow-y-auto p-6 transition-all duration-300",
                      editModalMode === "adicionar" && "border-r border-border",
                    )}
                  >
                    {editModalMode === "remover" && (
                      <div className="mb-5 flex items-center gap-2.5 px-4 py-2.5 bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-800">
                        <Trash2 className="h-3.5 w-3.5 text-red-500 shrink-0" />
                        <p className="text-xs text-red-700 dark:text-red-300 font-medium">
                          Modo remoção ativo — clique no &#128465; para remover
                          um widget permanentemente do dashboard
                        </p>
                      </div>
                    )}
                    {editModalMode === "adicionar" && (
                      <div className="mb-5 flex items-center gap-2.5 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800">
                        <Plus className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                          Clique em um widget disponível à direita para
                          adicioná-lo ao dashboard
                        </p>
                      </div>
                    )}
                    {/* Section header */}
                    <div className="flex items-center gap-2 mb-4">
                      <LayoutGrid className="h-3.5 w-3.5 text-muted-foreground/60" />
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Widgets do dashboard
                      </p>
                      <span className="ml-auto text-[10px] font-medium text-muted-foreground bg-muted/60 rounded-full px-2 py-0.5">
                        {draftWidgets.length}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {draftWidgets.map((widget) => {
                        const libItem = widgetLibrary.find(
                          (l) => l.id === widget.type,
                        );
                        const WIcon = libItem?.icon ?? LayoutGrid;
                        const color = libItem?.color ?? "blue";
                        const title = getWidgetTitle(
                          widget.type,
                          widget.customTitle,
                        );
                        const isDraggingThis = modalDraggedId === widget.id;
                        const isDragOver =
                          modalDragOverId === widget.id &&
                          modalDraggedId !== widget.id;
                        const gradient =
                          modalGradientMap[color] ?? modalGradientMap.blue;
                        const widgetColSpan = widget.colSpan ?? 1;
                        const posNum =
                          draftWidgets.findIndex((w) => w.id === widget.id) + 1;

                        return (
                          <div
                            key={widget.id}
                            draggable={editModalMode !== "remover"}
                            onDragStart={() => setModalDraggedId(widget.id)}
                            onDragOver={(e) => {
                              e.preventDefault();
                              setModalDragOverId(widget.id);
                            }}
                            onDragLeave={() => setModalDragOverId(null)}
                            onDrop={() => {
                              if (
                                !modalDraggedId ||
                                modalDraggedId === widget.id
                              ) {
                                setModalDraggedId(null);
                                setModalDragOverId(null);
                                return;
                              }
                              const from = draftWidgets.findIndex(
                                (w) => w.id === modalDraggedId,
                              );
                              const to = draftWidgets.findIndex(
                                (w) => w.id === widget.id,
                              );
                              const next = [...draftWidgets];
                              const [moved] = next.splice(from, 1);
                              next.splice(to, 0, moved);
                              next.forEach((w, i) => {
                                w.order = i;
                              });
                              setDraftWidgets(next);
                              setModalDraggedId(null);
                              setModalDragOverId(null);
                            }}
                            onDragEnd={() => {
                              setModalDraggedId(null);
                              setModalDragOverId(null);
                            }}
                            className={cn(
                              "group relative rounded-xl border overflow-hidden select-none transition-all duration-150",
                              widgetColSpan === 3
                                ? "col-span-3"
                                : widgetColSpan === 2
                                  ? "col-span-2"
                                  : "col-span-1",
                              editModalMode !== "remover" &&
                                "cursor-grab active:cursor-grabbing",
                              widget.visible
                                ? "border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600"
                                : "border-dashed border-slate-200 dark:border-slate-700 opacity-50",
                              isDraggingThis && "opacity-30 scale-95",
                              isDragOver &&
                                "ring-2 ring-blue-500 ring-offset-2 scale-[1.02]",
                            )}
                          >
                            {/* Top gradient band with prominent position number */}
                            <div
                              className={cn(
                                "h-10 w-full bg-gradient-to-r flex items-center gap-2.5 px-3",
                                gradient,
                              )}
                            >
                              {/* Number badge */}
                              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white shadow-md text-[11px] font-extrabold text-slate-800 shrink-0 leading-none">
                                {posNum}
                              </div>
                              {/* Widget title in band */}
                              <span className="flex-1 min-w-0 text-white text-[11px] font-semibold leading-tight truncate">
                                {title}
                              </span>
                              {/* Drag handle */}
                              {editModalMode !== "remover" && (
                                <GripVertical className="h-4 w-4 text-white/50 group-hover:text-white/90 transition-colors shrink-0" />
                              )}
                            </div>

                            <div className="px-3 py-2.5 bg-card">
                              <div className="flex items-center gap-2 mb-2.5">
                                {/* Icon */}
                                <div
                                  className={cn(
                                    "shrink-0 rounded-md p-1.5 bg-gradient-to-br text-white shadow-sm",
                                    gradient,
                                  )}
                                >
                                  <WIcon className="h-3.5 w-3.5" />
                                </div>
                                {/* Width indicator */}
                                <p className="text-[10px] text-muted-foreground font-medium leading-snug">
                                  {widgetColSpan === 1
                                    ? "1/3 da largura"
                                    : widgetColSpan === 2
                                      ? "2/3 da largura"
                                      : "Largura total"}
                                </p>
                              </div>

                              {/* Col-span selector */}
                              <div className="flex items-center gap-1.5 mb-2">
                                <span className="text-[10px] text-muted-foreground font-medium shrink-0">
                                  Largura:
                                </span>
                                {([1, 2, 3] as const).map((n) => (
                                  <button
                                    key={n}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDraftWidgets((prev) =>
                                        prev.map((w) =>
                                          w.id === widget.id
                                            ? { ...w, colSpan: n }
                                            : w,
                                        ),
                                      );
                                    }}
                                    title={
                                      n === 1
                                        ? "1 coluna (1/3)"
                                        : n === 2
                                          ? "2 colunas (2/3)"
                                          : "3 colunas (100%)"
                                    }
                                    className={cn(
                                      "flex-1 h-5 text-[10px] font-bold rounded transition-colors border",
                                      widgetColSpan === n
                                        ? "bg-blue-600 text-white border-blue-600"
                                        : "bg-muted/50 text-muted-foreground border-border hover:bg-muted",
                                    )}
                                  >
                                    {n}
                                  </button>
                                ))}
                              </div>

                              {/* Action row */}
                              <div className="flex items-center justify-between pt-2 border-t border-border/60">
                                {/* Visibility toggle */}
                                <button
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDraftWidgets((prev) =>
                                      prev.map((w) =>
                                        w.id === widget.id
                                          ? { ...w, visible: !w.visible }
                                          : w,
                                      ),
                                    );
                                  }}
                                  className={cn(
                                    "flex items-center gap-1 text-[10px] font-medium rounded-md px-2 py-1 transition-colors",
                                    widget.visible
                                      ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100"
                                      : "text-muted-foreground bg-muted/60 hover:bg-muted",
                                  )}
                                >
                                  {widget.visible ? (
                                    <Activity className="h-3 w-3" />
                                  ) : (
                                    <EyeOff className="h-3 w-3" />
                                  )}
                                  {widget.visible ? "Visível" : "Oculto"}
                                </button>

                                {/* Remove button - only in remover mode */}
                                {editModalMode === "remover" && (
                                  <button
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDraftWidgets((prev) =>
                                        prev.filter((w) => w.id !== widget.id),
                                      );
                                    }}
                                    className="flex items-center gap-1 text-[10px] font-semibold text-red-600 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 rounded-md px-2 py-1 transition-colors"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                    Remover
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right panel: available widgets to add */}
                  {editModalMode === "adicionar" && (
                    <div className="w-80 shrink-0 overflow-y-auto bg-muted/30 border-l border-border flex flex-col">
                      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <Plus className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                            Widgets disponíveis
                          </h3>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          {availableWidgets.length === 0
                            ? "Todos os widgets já estão no dashboard"
                            : `${availableWidgets.length} widget${availableWidgets.length !== 1 ? "s" : ""} para adicionar`}
                        </p>
                      </div>
                      <div className="p-4 flex flex-col gap-2.5">
                        {availableWidgets.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-14 text-center">
                            <div className="bg-emerald-100 dark:bg-emerald-950/40 rounded-full p-3.5 mb-3">
                              <Check className="h-5 w-5 text-emerald-600" />
                            </div>
                            <p className="text-sm font-semibold text-foreground">
                              Tudo adicionado!
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Todos os widgets já estão no dashboard
                            </p>
                          </div>
                        ) : (
                          availableWidgets.map((lib) => {
                            const WIcon = lib.icon;
                            const gradient =
                              modalGradientMap[lib.color ?? "blue"] ??
                              modalGradientMap.blue;
                            return (
                              <button
                                key={lib.id}
                                onClick={() => {
                                  const maxOrder = Math.max(
                                    ...draftWidgets.map((w) => w.order),
                                    -1,
                                  );
                                  setDraftWidgets((prev) => [
                                    ...prev,
                                    {
                                      id: `${lib.id}-${Date.now()}`,
                                      type: lib.id as WidgetType,
                                      visible: true,
                                      order: maxOrder + 1,
                                      colSpan: 1,
                                    },
                                  ]);
                                }}
                                className="w-full text-left group flex items-center gap-3 px-3.5 py-3 rounded-xl border border-border bg-card hover:border-emerald-400 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 hover:shadow-sm active:scale-[0.98] transition-all duration-150"
                              >
                                <div
                                  className={cn(
                                    "shrink-0 rounded-lg p-2 bg-gradient-to-br text-white shadow-sm",
                                    gradient,
                                  )}
                                >
                                  <WIcon className="h-3.5 w-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-foreground leading-snug">
                                    {lib.name}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                                    {lib.description}
                                  </p>
                                </div>
                                <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <div className="bg-emerald-500 rounded-full p-0.5">
                                    <Plus className="h-3 w-3 text-white" />
                                  </div>
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex-shrink-0 border-t bg-muted/20 px-6 py-3 flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-4 text-sm"
                      onClick={() => setShowCancelConfirmDialog(true)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 px-5 text-sm btn-brand shadow-sm gap-1.5"
                      onClick={() => setShowSaveConfirmDialog(true)}
                    >
                      <Save className="h-3.5 w-3.5" />
                      {isNewDashboardMode ? "Criar" : "Salvar"}
                    </Button>
                  </div>
                  <div className="w-px h-5 bg-border" />
                  <span className="text-xs text-muted-foreground">
                    {draftWidgets.filter((w) => w.visible).length} visíveis ·{" "}
                    {draftWidgets.filter((w) => !w.visible).length} ocultos ·{" "}
                    {draftWidgets.length} total
                  </span>
                </div>
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
            ? `Deseja criar o dashboard "${editHeaderName.trim() || "Novo Dashboard"}" com ${draftWidgets.length} widget(s)?`
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
    // </CHANGE>
  );
}
