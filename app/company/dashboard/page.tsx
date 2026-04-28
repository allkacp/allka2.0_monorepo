// @ts-nocheck
import type React from "react";

import { useState, useEffect, useMemo } from "react";
import { PageLoadingSkeleton } from "@/components/ui/page-loading-skeleton";
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
} from "lucide-react";
import { Link } from "react-router-dom";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MetricChartModal } from "@/components/admin/metric-chart-modal";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";
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
// Inline fallback — dev-mocks/ é gitignored e não está disponível no build de produção
const generateDashboardData = (_from?: any, _to?: any): any => ({
  revenue: {
    total: 270800, growth: 18.1, totalGrowth: 18.1, series: [],
    trendData: [180000, 205000, 215000, 230000, 248000, 270800],
    creditPlan: 114000, creditPlanGrowth: 18,
    recurring: 97600, recurringGrowth: 8,
    oneTime: 59200, oneTimeGrowth: 14,
  },
  activeProjects: {
    total: 127, growth: 5.2, series: [],
    agencies: 48, agenciesGrowth: 7,
    leadPremium: 63, leadPremiumGrowth: 9,
    nomades: 16, nomadesGrowth: 3,
    newTotal: 22, newAgencies: 9, newLeadPremium: 10, newNomades: 3,
  },
  creditPlans: {
    total: 114000, growth: 18, series: [],
    basic:   { revenue: 38000, newContracts: 12, growth: 8 },
    partner: { revenue: 45000, newContracts: 9,  growth: 22 },
    premium: { revenue: 31000, newContracts: 5,  growth: 14 },
  },
  mrr: {
    total: 97600, growth: 8, series: [],
    newMrr: 12400, expansion: 5200, contraction: 1800,
    churnRevenue: 3100, baseMrr: 89600, netChange: 12700,
    trendData: [72000, 78000, 82000, 86000, 91000, 97600],
  },
  churn: {
    total: 0, growth: 0, series: [],
    inactiveAccounts: 23, inactiveGrowth: 4,
    agencies: 8, leadPremium: 5, nomades: 7, free: 3,
    cancelledProjects: 11, cancelledGrowth: 2,
    revenueChurn: 9300, revenueChurnRate: 3.2,
  },
  averageTicket: {
    total: 0, growth: 5, series: [],
    general: 1213, generalGrowth: 5,
    perProject: 2840, perProjectGrowth: 7,
    trendData: [980, 1050, 1100, 1180, 1210, 1213],
  },
  ltv: {
    total: 0, growth: 12, series: [],
    value: 8740,
    agencies: 14200, agenciesGrowth: 9,
    leadPremium: 11500, leadPremiumGrowth: 15,
    nomades: 3800, nomadesGrowth: 6,
    hist0to1k: 120, hist1kto5k: 280, hist5kto15k: 95, hist15kplus: 30,
  },
  accountsReceivable: {
    total: 187400, growth: 12, series: [],
    creditPlans: 98200, postPaid: 54700, others: 34500, received: 143600,
  },
  platformActivities: {
    activeAgencies: 34, avgSessionMinutes: 47, mau: 1240, dau: 312,
    sessions: 8740, actionsExecuted: 52300,
    trendData: [420, 510, 480, 630, 590, 710, 680],
  },
  nomads: {
    total: 148, growth: 6, active: 112, activeGrowth: 9,
    inactive: 36, inactiveChange: -3, newInPeriod: 14, churn: 5, retention30d: 82,
    trendData: [95, 100, 104, 108, 110, 112],
  },
  nomadsIndicators: {
    deliveryRate: 94.3, avgRating: 4.7, avgTimePerTask: 3.2, certified: 68, retention90d: 79,
  },
  nomadsRanking: { items: [] },
  agenciesRanking: [
    { id: "1", name: "Digital Works",  rating: 4.9, projects: 23, contribution: "R$ 48k" },
    { id: "2", name: "Criativa Lab",   rating: 4.8, projects: 18, contribution: "R$ 37k" },
    { id: "3", name: "Inovax Agency",  rating: 4.7, projects: 15, contribution: "R$ 31k" },
    { id: "4", name: "PixelForge",     rating: 4.6, projects: 12, contribution: "R$ 24k" },
    { id: "5", name: "BluePrint Co.",  rating: 4.5, projects: 10, contribution: "R$ 19k" },
  ],
  statusOverview: {
    projects: { ongoing: 42, approved: 18, completed: 156, cancelled: 7, delayed: 11 },
    tasks:    { contracted: 83, inProgress: 57, completed: 412, archived: 34 },
    leads:    { new: 29, contacted: 15, proposal: 8, won: 12, lost: 5 },
  },
  tasks: {
    total: 552, items: [],
    completed: 412, completedGrowth: 8,
    inProgress: 57, inProgressGrowth: 4,
    contracted: 83, contractedGrowth: 12,
    cancelled: 14, cancelledChange: -2,
    slaCompliance: 91.4,
  },
  activeUsers: {
    total: 284,
    empresas: 92, empresasGrowth: 5,
    agencias: 61, agenciasGrowth: 7,
    nomades: 112, nomadesGrowth: 9,
    admins: 19, adminsGrowth: 3,
    series: [],
  },
  partnerProgram: {
    total: 38, items: [],
    invitesSent: 124, pending: 47, accepted: 38,
    diamond: 3, platinum: 6, gold: 11, silver: 12, bronze: 6,
    mrrGenerated: 22400,
  },
  cmv: {
    totalCosts: 87400, revenue: 270800,
    cmvPercent: 32.3, prevCmvPercent: 34.1,
    nomades:   { value: 42800, percent: 49 },
    impostos:  { value: 18200, percent: 21 },
    comissoes: { value: 14900, percent: 17 },
    outros:    { value: 11500, percent: 13 },
    variation: { cmvPercent: -1.8, totalCosts: -2.4, revenue: 5.6 },
  },
  metrics: {}, activity: [], alerts: [], performers: [], userDistribution: [],
  systemAlerts: [], adminProfiles: [], permissionMatrix: [], managementTools: [],
});
import { Switch } from "@/components/ui/switch"; // Added Switch
import { useToast } from "@/hooks/use-toast"; // Added useToast hook
import { ConfirmationDialog } from "@/components/confirmation-dialog";

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
  | "partnerProgram"; // Partner Program metrics widget

type MetricType =
  | "totalUsers"
  | "activeUsers"
  | "companies"
  | "activeProjects"
  | "revenue"
  | "avgRating";
type WidgetSize = "standard" | "compact";

interface Widget {
  id: WidgetType;
  order: number;
  visible: boolean;
  customTitle?: string;
  size?: string; // Added to store widget size (e.g., "half", "full")
}

// Define the structure for revenue metric with breakdown
interface RevenueMetric {
  value: string;
  change: number;
  trend: "up" | "down";
  breakdown?: {
    creditPlan: { value: string; change: number };
    recurring: { value: string; change: number };
    oneTime: { value: string; change: number };
  };
}

interface RatingBreakdown {
  nomades: { value: number; change: number; trend: "up" | "down" };
  agencies: { value: number; change: number; trend: "up" | "down" };
  leadPremium: { value: number; change: number; trend: "up" | "down" };
  support: { value: number; change: number; trend: "up" | "down" };
  projects: { value: number; change: number; trend: "up" | "down" };
}

interface MetricCard {
  id: MetricType;
  order: number;
  visible: boolean;
}

// Define WidgetLibraryItem interface
interface WidgetLibraryItem {
  id: WidgetType;
  name: string;
  description: string;
  icon: React.ElementType;
  color?: string; // Added to store a color for the widget card
}

// Define WidgetState to unify widget types for rendering
interface WidgetState {
  id: string; // Unique identifier for each widget instance
  type: WidgetType;
  visible: boolean;
  order: number;
  customTitle?: string;
  colSpan?: 1 | 2 | 3; // How many of the 3 dashboard columns this widget occupies
}

interface SystemAlert {
  id: string;
  type: "tarefas" | "mensagens" | "financeiro" | "projetos" | "sistema";
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  count: number;
  link: string;
  icon: typeof AlertTriangle;
}

// Alerts loaded from API below

const AlertsCenter = ({ alerts }: { alerts: SystemAlert[] }) => {
  const [dismissed, setDismissed] = useState<string[]>([]);

  if (alerts.length === 0 || dismissed.length === alerts.length) {
    return null;
  }

  const activeAlerts = alerts.filter((alert) => !dismissed.includes(alert.id));
  const highPriorityCount = activeAlerts.filter(
    (a) => a.severity === "high",
  ).length;

  const getSeverityColor = (severity: SystemAlert["severity"]) => {
    switch (severity) {
      case "high":
        return "text-red-700 bg-red-50 border-red-300";
      case "medium":
        return "text-amber-700 bg-amber-50 border-amber-300";
      case "low":
        return "text-blue-700 bg-blue-50 border-blue-300";
      default:
        return "text-blue-700 bg-blue-50 border-blue-300";
    }
  };

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem
        value="alerts"
        className="border-2 border-red-300 bg-red-50 rounded-xl shadow-sm"
      >
        <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-red-100/50 rounded-t-xl transition-colors">
          <div className="flex items-center gap-3 w-full">
            <div className="p-2 rounded-lg bg-red-100">
              <Bell className="h-5 w-5 text-red-600" />
            </div>
            <div className="flex items-center justify-between flex-1">
              <div className="text-left">
                <h3 className="font-semibold text-red-800 flex items-center gap-2">
                  Alertas do Sistema
                  <Badge className="ml-2 bg-red-600 text-white hover:bg-red-700">
                    {activeAlerts.length}
                  </Badge>
                  {highPriorityCount > 0 && (
                    <span className="text-xs text-red-600 font-medium">
                      ({highPriorityCount} críticos)
                    </span>
                  )}
                </h3>
                <p className="text-xs text-red-600/80 mt-1">
                  Itens que requerem sua atenção imediata
                </p>
              </div>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4">
          <div className="space-y-2 pt-2">
            {activeAlerts.map((alert) => {
              const Icon = alert.icon;
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
                      <p className="text-xs opacity-80 mt-0.5 line-clamp-1">
                        {alert.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link to={alert.link}>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1 text-xs"
                      >
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
              );
            })}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

const formatDate = (date: Date, formatStr: string) => {
  const pad = (n: number) => n.toString().padStart(2, "0");
  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());

  const formatMap: Record<string, string> = {
    "dd/MM/yyyy 'às' HH:mm": `${day}/${month}/${year} às ${hours}:${minutes}`,
    "yyyy-MM-dd-HHmm": `${year}-${month}-${day}-${hours}${minutes}`,
    PPP: `${day} de ${["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"][date.getMonth()]} de ${year}`,
  };

  return formatMap[formatStr] || `${day}/${month}/${year}`;
};

// const PageHeader = ({ title, description }: { title: string; description: string }) => (
//   <div className="mb-6">
//     <h1 className="text-3xl font-bold text-blue-600">{title}</h1>
//     <p className="text-sm text-gray-500">{description}</p>
//   </div>
// )

export default function EmpresaDashboard() {
  const { sidebarCollapsed } = useSidebar(); // Get sidebar collapse state
  const { toast } = useToast(); // Get toast function
  const {
    stats: apiStats,
    activities: apiActivities,
    loading: dashboardLoading,
  } = useDashboard();

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
    const savedPeriod = localStorage.getItem("empresa-dashboard_global_period");
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
      "empresa-dashboard_global_period",
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

  // Period-aware dashboard data — recomputed whenever the selected period changes
  const dashboardData = useMemo(() => {
    const { from, to } = getDateRangeFromPeriod(
      globalPeriod.type,
      globalPeriod.from,
      globalPeriod.to,
    );
    return generateDashboardData(from, to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalPeriod.type, globalPeriod.from, globalPeriod.to]);

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
    { id: "totalUsers", order: 0, visible: true },
    { id: "activeUsers", order: 1, visible: true },
    { id: "companies", order: 2, visible: true },
    { id: "activeProjects", order: 3, visible: true },
    { id: "revenue", order: 4, visible: true },
    { id: "avgRating", order: 5, visible: true },
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
    };
  }

  const getWidgetPeriod = (widgetId: string) => {
    const override = widgetPeriods.find((wp) => wp.widgetId === widgetId);
    if (override && override.mode === "custom" && override.customPeriod) {
      return {
        from: new Date(override.customPeriod.from),
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
          customPeriod: { from, to, label },
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

  // Reusable export button component for widget headers
  const WidgetExportButton = ({
    widgetId,
    widgetTitle,
  }: {
    widgetId: string;
    widgetTitle: string;
  }) => (
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
  );

  const WidgetPeriodSelector = ({ widgetId }: { widgetId: string }) => {
    const widgetPeriod = widgetPeriods.find((wp) => wp.widgetId === widgetId);
    const isCustom = widgetPeriod?.mode === "custom";
    const displayLabel = isCustom ? widgetPeriod.customPeriod?.label : "Global";

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 px-2 text-xs gap-1.5",
              isCustom && "bg-primary/10 text-primary hover:bg-primary/20",
            )}
          >
            <Calendar className="h-3 w-3" />
            <span className="hidden sm:inline">Período:</span>
            {displayLabel}
            {isCustom && (
              <span className="text-[10px] opacity-70">(custom)</span>
            )}
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-xs">
            Período do Widget
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setWidgetCustomPeriod(widgetId, "global")}
            className="text-xs"
          >
            <Check
              className={cn(
                "mr-2 h-3 w-3",
                !isCustom ? "opacity-100" : "opacity-0",
              )}
            />
            Usar período global
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setWidgetCustomPeriod(widgetId, "today")}
            className="text-xs"
          >
            <Check
              className={cn(
                "mr-2 h-3 w-3",
                widgetPeriod?.mode === "custom" &&
                  widgetPeriod?.customPeriod?.label === "Hoje"
                  ? "opacity-100"
                  : "opacity-0",
              )}
            />
            Hoje
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setWidgetCustomPeriod(widgetId, "7days")}
            className="text-xs"
          >
            <Check
              className={cn(
                "mr-2 h-3 w-3",
                widgetPeriod?.mode === "custom" &&
                  widgetPeriod?.customPeriod?.label === "Últimos 7 dias"
                  ? "opacity-100"
                  : "opacity-0",
              )}
            />
            Últimos 7 dias
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setWidgetCustomPeriod(widgetId, "30days")}
            className="text-xs"
          >
            <Check
              className={cn(
                "mr-2 h-3 w-3",
                widgetPeriod?.mode === "custom" &&
                  widgetPeriod?.customPeriod?.label === "Últimos 30 dias"
                  ? "opacity-100"
                  : "opacity-0",
              )}
            />
            Últimos 30 dias
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setWidgetCustomPeriod(widgetId, "thisMonth")}
            className="text-xs"
          >
            <Check
              className={cn(
                "mr-2 h-3 w-3",
                widgetPeriod?.mode === "custom" &&
                  widgetPeriod?.customPeriod?.label === "Este mês"
                  ? "opacity-100"
                  : "opacity-0",
              )}
            />
            Este mês
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setWidgetCustomPeriod(widgetId, "lastMonth")}
            className="text-xs"
          >
            <Check
              className={cn(
                "mr-2 h-3 w-3",
                widgetPeriod?.mode === "custom" &&
                  widgetPeriod?.customPeriod?.label === "Mês passado"
                  ? "opacity-100"
                  : "opacity-0",
              )}
            />
            Mês passado
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setWidgetCustomPeriod(widgetId, "90days")}
            className="text-xs"
          >
            <Check
              className={cn(
                "mr-2 h-3 w-3",
                widgetPeriod?.mode === "custom" &&
                  widgetPeriod?.customPeriod?.label === "Últimos 90 dias"
                  ? "opacity-100"
                  : "opacity-0",
              )}
            />
            Últimos 90 dias
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setWidgetCustomPeriod(widgetId, "365days")}
            className="text-xs"
          >
            <Check
              className={cn(
                "mr-2 h-3 w-3",
                widgetPeriod?.mode === "custom" &&
                  widgetPeriod?.customPeriod?.label === "Último ano"
                  ? "opacity-100"
                  : "opacity-0",
              )}
            />
            Último ano
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  // Define WidgetConfig type, as the original `Widget` type had `size` property that is no longer relevant for the state
  type WidgetConfig = Omit<Widget, "size">;

  const [widgets, setWidgets] = useState<WidgetState[]>([
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
    { id: "statusOverview", type: "statusOverview", visible: true, order: 26 },
    { id: "partnerProgram", type: "partnerProgram", visible: true, order: 27 },
  ]);

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

  // Undeclared Variables Fixes
  const handleOpenShareDialog = (dashboardId: string) => {
    setSharingDashboardId(dashboardId);
    const dashboard = savedDashboards.find((d) => d.id === dashboardId);
    if (dashboard) {
      setShareGlobal(dashboard.isGlobal ?? false);
      setShareWithProfessionals(dashboard.sharedWith ?? []);
    }
    setShowShareDialog(true);
  };

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
    localStorage.setItem("empresa-saved-dashboards", JSON.stringify(updatedDashboards));
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
        "empresa-saved-dashboards",
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
        "empresa-saved-dashboards",
        JSON.stringify(updatedDashboards),
      );
      localStorage.setItem("empresa-current-dashboard-id", newDashboard.id);
      setCurrentDashboardId(newDashboard.id);
      setWidgets(updated);
      localStorage.setItem("empresa-dashboard-widget-config", JSON.stringify(updated));
      setShowSaveConfirmDialog(false);
      handleCloseEditPanel();
      toast({
        title: "Dashboard criado",
        description: `"${name}" foi criado com sucesso.`,
      });
    } else {
      setWidgets(updated);
      localStorage.setItem("empresa-dashboard-widget-config", JSON.stringify(updated));
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
          "empresa-saved-dashboards",
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
    const savedConfig = localStorage.getItem("empresa-dashboard-widget-config");
    if (savedConfig) {
      try {
        // Ensure the loaded config matches the WidgetState type
        const parsedConfig: WidgetState[] = JSON.parse(savedConfig);
        setWidgets(
          parsedConfig.map((w) => ({
            ...w,
            id: w.id || `${w.type}-${Math.random().toString(36).substr(2, 9)}`,
          })),
        ); // Ensure id exists
      } catch (e) {
        console.error("Failed to parse saved widget config:", e);
      }
    }

    const savedMetrics = localStorage.getItem("empresa-dashboard-metric-cards");
    if (savedMetrics) {
      try {
        setMetricCards(JSON.parse(savedMetrics));
      } catch (e) {
        console.error("Failed to parse saved metric cards:", e);
      }
    }

    const savedSize = localStorage.getItem("empresa-dashboard-widget-size");
    if (savedSize) {
      setWidgetSize(savedSize as WidgetSize);
    }

    // Load widget period overrides from localStorage
    const savedWidgetPeriods = localStorage.getItem("empresa-dashboard-widget-periods");
    if (savedWidgetPeriods) {
      try {
        setWidgetPeriods(JSON.parse(savedWidgetPeriods));
      } catch (e) {
        console.error("Failed to parse saved widget periods:", e);
      }
    }

    // Load saved dashboards from localStorage, always ensuring the 3 built-in presets exist
    const mk = (type: string, order: number) => ({
      id: `preset-${type}-${order}`,
      type,
      visible: true,
      order,
    });
    const builtinPresets: SavedDashboard[] = [
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
    ] as SavedDashboard[];

    const savedDashboardsData = localStorage.getItem("empresa-saved-dashboards");
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
        "empresa-saved-dashboards",
        JSON.stringify(parsedDashboards),
      );
    }
    setSavedDashboards(parsedDashboards);
    const storedId = localStorage.getItem("empresa-current-dashboard-id");
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
    // Ensure consistent structure when saving
    localStorage.setItem(
      "empresa-dashboard-widget-config",
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
    localStorage.setItem("empresa-dashboard-metric-cards", JSON.stringify(metricCards));
    localStorage.setItem("empresa-dashboard-widget-size", widgetSize);
    // Save widget period overrides to localStorage
    localStorage.setItem(
      "empresa-dashboard-widget-periods",
      JSON.stringify(widgetPeriods),
    );

    // Save dashboards to localStorage whenever they change
    localStorage.setItem("empresa-saved-dashboards", JSON.stringify(savedDashboards));
    if (currentDashboardId) {
      localStorage.setItem("empresa-current-dashboard-id", currentDashboardId);
    }
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
    };
    // @ts-ignore
    const key =
      globalPeriod.type === "last_7_days" ||
      globalPeriod.type === "today" ||
      globalPeriod.type === "yesterday"
        ? "7d"
        : globalPeriod.type === "this_quarter"
          ? "90d"
          : globalPeriod.type === "custom"
            ? "custom"
            : "30d";
    return baseMetrics[key as keyof typeof baseMetrics];
  };

  const metrics = (() => {
    const base = getMetricsForPeriod();
    if (!apiStats) return base;
    const s = apiStats;
    return {
      ...base,
      totalUsers: {
        ...base.totalUsers,
        value: (s.nomades?.total ?? 0).toLocaleString("pt-BR"),
      },
      activeUsers: {
        ...base.activeUsers,
        value: (s.nomades?.active ?? 0).toLocaleString("pt-BR"),
      },
      companies: {
        ...base.companies,
        value: (s.companies?.total ?? 0).toLocaleString("pt-BR"),
      },
      activeProjects: {
        ...base.activeProjects,
        value: (s.projects?.active ?? 0).toLocaleString("pt-BR"),
      },
      revenue: {
        ...base.revenue,
        value: `R$ ${((s.financial?.totalRevenue ?? 0) / 1000).toFixed(1)}k`,
      },
    };
  })();

  // Recent activities from API (fallback to empty)
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
        ];

  // Mock data for system alerts
  const systemAlerts = [
    {
      id: 1,
      type: "warning",
      title: "Atualização de segurança disponível",
      description:
        "Recomendamos atualizar o sistema para a versão mais recente",
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
    totalUsers: Users,
    activeUsers: UserCheck,
    companies: Building2,
    activeProjects: Briefcase,
    revenue: DollarSign,
    avgRating: Star,
  };

  const metricNames: Record<MetricType, string> = {
    totalUsers: "Total de Usuários",
    activeUsers: "Usuários Ativos",
    companies: "Empresas",
    activeProjects: "Projetos Ativos",
    revenue: "Receita",
    avgRating: "Avaliação Média",
  };

  const renderMetricCard = (metricType: MetricType) => {
    const metric = metrics[metricType];
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
      case "totalUsers":
        bgColor = "from-blue-400 to-blue-600";
        gradientFrom = "from-blue-600/10";
        cardBgGradient = "from-blue-500 to-blue-700";
        borderClass = "border-2 border-blue-300/70 dark:border-blue-300/50";
        shadowClass = "";
        break;
      case "activeUsers":
        bgColor = "from-emerald-400 to-emerald-600";
        gradientFrom = "from-emerald-600/10";
        cardBgGradient = "from-emerald-500 to-teal-600";
        borderClass = "border-2 border-emerald-300/70 dark:border-emerald-300/50";
        shadowClass = "";
        break;
      case "companies":
        bgColor = "from-violet-400 to-violet-600";
        gradientFrom = "from-violet-600/10";
        cardBgGradient = "from-violet-500 to-purple-700";
        borderClass = "border-2 border-violet-300/70 dark:border-violet-300/50";
        shadowClass = "";
        break;
      case "activeProjects":
        bgColor = "from-orange-400 to-orange-600";
        gradientFrom = "from-orange-600/10";
        cardBgGradient = "from-orange-500 to-rose-600";
        borderClass = "border-2 border-orange-300/70 dark:border-orange-300/50";
        shadowClass = "";
        break;
      case "revenue":
        bgColor = "from-green-400 to-green-600";
        gradientFrom = "from-green-600/10";
        cardBgGradient = "from-green-500 to-emerald-700";
        borderClass = "border-2 border-green-300/70 dark:border-green-300/50";
        shadowClass = "";
        break;
      case "avgRating":
        bgColor = "from-amber-400 to-amber-600";
        gradientFrom = "from-amber-600/10";
        cardBgGradient = "from-amber-500 to-orange-600";
        borderClass = "border-2 border-amber-300/70 dark:border-amber-300/50";
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

    if (metricType === "revenue") {
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
          className={cn(
            `relative rounded-2xl overflow-hidden shadow-lg transition-all duration-200 bg-gradient-to-br ${cardBgGradient} ${borderClass} ${shadowClass}`,
            isEditing && "cursor-grab active:cursor-grabbing",
            isDragging && "opacity-40 scale-95",
            isDragOver && "ring-2 ring-white ring-offset-2 scale-[1.02]",
            !isDragging &&
              !isDragOver &&
              !isEditing &&
              "hover:shadow-xl hover:scale-[1.02]",
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
              <span className="text-[10px] text-white/60">vs. anterior</span>
            </div>
          </div>
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
        className={cn(
          `relative rounded-2xl overflow-hidden shadow-lg transition-all duration-200 bg-gradient-to-br ${cardBgGradient} ${borderClass} ${shadowClass}`,
          isEditing && "cursor-grab active:cursor-grabbing",
          isDragging && "opacity-40 scale-95",
          isDragOver && "ring-2 ring-white ring-offset-2 scale-[1.02]",
          !isDragging &&
            !isDragOver &&
            !isEditing &&
            "hover:shadow-xl hover:scale-[1.02]",
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
              {metricType === "avgRating" ? " pts" : "%"}
            </div>
            <span className="text-[10px] text-white/60">
              {metricType === "avgRating" ? "/ 5.0" : "vs. anterior"}
            </span>
          </div>
        </div>
      </div>
    );
  };

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
                    {isCustomizeMode && (
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                    )}
                    <CardTitle className="text-lg font-semibold">
                      {getWidgetTitle(widget.type)}
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <WidgetExportButton
                      widgetId={widget.type}
                      widgetTitle={getWidgetTitle(widget.type)}
                    />
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
                <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
                  {metricCards
                    .filter((m) => m.visible)
                    .sort((a, b) => a.order - b.order)
                    .map((metricCard) => renderMetricCard(metricCard.id))}
                </div>
              </CardContent>
            </Card>
          </div>
        );

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
                    {isCustomizeMode && (
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                    )}
                    <CardTitle className="text-lg font-semibold">
                      {getWidgetTitle(widget.type)}
                    </CardTitle>
                  </div>
                  <WidgetExportButton
                    widgetId={widget.type}
                    widgetTitle={getWidgetTitle(widget.type)}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4">
                  {usersByType.map((userType, index) => (
                    <div
                      key={index}
                      className="group p-5 rounded-xl border-0 bg-gradient-to-br from-background to-background/50 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
                    >
                      <div className="flex items-center justify-between">
                        <Badge
                          className={cn(
                            "text-xs font-semibold bg-gradient-to-r text-white shadow-sm",
                            userType.color,
                          )}
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
                      <p className="text-3xl font-bold text-foreground">
                        {userType.count.toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {userType.percentage}% do total
                      </p>
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden mt-2">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            userType.color,
                          )}
                          style={{ width: `${userType.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        );

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
                    {isCustomizeMode && (
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                    )}
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      {getWidgetTitle(widget.type)}
                    </CardTitle>
                  </div>
                  <WidgetExportButton
                    widgetId={widget.type}
                    widgetTitle={getWidgetTitle(widget.type)}
                  />
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
                      alert.type === "info" &&
                        "bg-info-muted border-info/20 dark:bg-info/5 dark:border-info/30",
                    )}
                  >
                    <div className="mt-0.5">{getAlertIcon(alert.type)}</div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium leading-none">
                          {alert.message}
                        </p>
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
        );

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
                    {isCustomizeMode && (
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                    )}
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <Shield className="h-5 w-5 text-chart-4" />
                      {getWidgetTitle(widget.type)}
                    </CardTitle>
                  </div>
                  <WidgetExportButton
                    widgetId={widget.type}
                    widgetTitle={getWidgetTitle(widget.type)}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
                  {adminProfilesData.map((profile, index) => (
                    <div
                      key={index}
                      className="group p-5 rounded-xl border-0 bg-gradient-to-br from-background to-background/50 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
                    >
                      <div className="flex items-center justify-between">
                        <Badge
                          className={cn(
                            "text-xs font-semibold bg-gradient-to-r text-white shadow-sm",
                            profile.color,
                          )}
                        >
                          {profile.name}
                        </Badge>
                        <span className="text-sm font-semibold text-muted-foreground">
                          {profile.users} usuário{profile.users > 1 ? "s" : ""}
                        </span>
                      </div>
                      <h4 className="font-semibold text-base text-foreground">
                        {profile.permissions}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {profile.description}
                      </p>
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
        );

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
                    {isCustomizeMode && (
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                    )}
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <Lock className="h-5 w-5 text-warning" />
                      {getWidgetTitle(widget.type)}
                    </CardTitle>
                  </div>
                  <WidgetExportButton
                    widgetId={widget.type}
                    widgetTitle={getWidgetTitle(widget.type)}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-xl border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr className="border-b">
                        <th className="text-left py-4 px-4 font-semibold">
                          Módulo
                        </th>
                        <th className="text-center py-4 px-4 font-semibold text-destructive">
                          Master
                        </th>
                        <th className="text-center py-4 px-4 font-semibold text-success">
                          Financeiro
                        </th>
                        <th className="text-center py-4 px-4 font-semibold text-info">
                          Comercial
                        </th>
                        <th className="text-center py-4 px-4 font-semibold text-chart-4">
                          Operacional
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {permissionMatrixData.map((row, index) => (
                        <tr
                          key={index}
                          className="border-b hover:bg-muted/30 transition-colors"
                        >
                          <td className="py-4 px-4 font-medium">
                            {row.module}
                          </td>
                          <td className="text-center py-4 px-4">
                            {row.master ? (
                              <CheckCircle2 className="h-5 w-5 text-success mx-auto" />
                            ) : (
                              <span className="text-muted-foreground/30">
                                —
                              </span>
                            )}
                          </td>
                          <td className="text-center py-4 px-4">
                            {row.financeiro ? (
                              <CheckCircle2 className="h-5 w-5 text-success mx-auto" />
                            ) : (
                              <span className="text-muted-foreground/30">
                                —
                              </span>
                            )}
                          </td>
                          <td className="text-center py-4 px-4">
                            {row.comercial ? (
                              <CheckCircle2 className="h-5 w-5 text-success mx-auto" />
                            ) : (
                              <span className="text-muted-foreground/30">
                                —
                              </span>
                            )}
                          </td>
                          <td className="text-center py-4 px-4">
                            {row.operacional ? (
                              <CheckCircle2 className="h-5 w-5 text-success mx-auto" />
                            ) : (
                              <span className="text-muted-foreground/30">
                                —
                              </span>
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
                      <strong>Nota:</strong> Apenas o usuário Master pode criar
                      e gerenciar outros perfis administrativos. O sistema de
                      permissões será detalhado em uma tela específica de
                      gerenciamento.
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        );

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
                    {isCustomizeMode && (
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                    )}
                    <CardTitle className="text-lg font-semibold">
                      <Settings className="h-5 w-5 text-muted-foreground" />
                      {getWidgetTitle(widget.type)}
                    </CardTitle>
                  </div>
                  <WidgetExportButton
                    widgetId={widget.type}
                    widgetTitle={getWidgetTitle(widget.type)}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
                  <Link to="/admin/usuarios">
                    <button
                      className={cn(
                        "w-full p-4 text-left rounded-xl border-0 shadow-md transition-all hover:shadow-lg",
                        "bg-gradient-to-br from-info/5 to-info/10 hover:from-info/10 hover:to-info/20 dark:from-info/10 dark:to-info/5 dark:hover:from-info/20 dark:hover:to-info/10",
                      )}
                    >
                      <p
                        className={cn(
                          "font-semibold mb-1 text-info-foreground",
                        )}
                      >
                        Gerenciar Usuários
                      </p>
                      <p className={cn("text-sm text-info")}>
                        Criar, editar e desativar contas
                      </p>
                    </button>
                  </Link>
                  <Link to="/admin/permissoes">
                    <button
                      className={cn(
                        "w-full p-4 text-left rounded-xl border-0 shadow-md transition-all hover:shadow-lg",
                        "bg-gradient-to-br from-destructive/5 to-destructive/10 hover:from-destructive/10 hover:to-destructive/20 dark:from-destructive/10 dark:to-destructive/5 dark:hover:from-destructive/20 dark:hover:to-destructive/10",
                      )}
                    >
                      <p
                        className={cn(
                          "font-semibold mb-1 text-destructive-foreground",
                        )}
                      >
                        Gerenciar Permissões
                      </p>
                      <p className={cn("text-sm text-destructive")}>
                        Criar e editar perfis administrativos
                      </p>
                    </button>
                  </Link>
                  <Link to="/admin/relatorios">
                    <button
                      className={cn(
                        "w-full p-4 text-left rounded-xl border-0 shadow-md transition-all hover:shadow-lg",
                        "bg-gradient-to-br from-success/5 to-success/10 hover:from-success/10 hover:to-success/20 dark:from-success/10 dark:to-success/5 dark:hover:from-success/20 dark:hover:to-success/10",
                      )}
                    >
                      <p
                        className={cn(
                          "font-semibold mb-1 text-success-foreground",
                        )}
                      >
                        Relatórios Financeiros
                      </p>
                      <p className={cn("text-sm text-success")}>
                        Visualizar receitas e pagamentos
                      </p>
                    </button>
                  </Link>
                  <Link to="/admin/configuracoes">
                    <button
                      className={cn(
                        "w-full p-4 text-left rounded-xl border-0 shadow-md transition-all hover:shadow-lg",
                        "bg-gradient-to-br from-chart-4/5 to-chart-4/10 hover:from-chart-4/10 hover:to-chart-4/20 dark:from-chart-4/10 dark:to-chart-4/5 dark:hover:from-chart-4/20 dark:hover:to-chart-4/10",
                      )}
                    >
                      <p className={cn("font-semibold mb-1 text-chart-4")}>
                        Configurações da Plataforma
                      </p>
                      <p className={cn("text-sm text-chart-4")}>
                        Ajustar parâmetros do sistema
                      </p>
                    </button>
                  </Link>
                  <Link to="/admin/disputas">
                    <button
                      className={cn(
                        "w-full p-4 text-left rounded-xl border-0 shadow-md transition-all hover:shadow-lg",
                        "bg-gradient-to-br from-warning/5 to-warning/10 hover:from-warning/10 hover:to-warning/20 dark:from-warning/10 dark:to-warning/5 dark:hover:from-warning/20 dark:hover:to-warning/10",
                      )}
                    >
                      <p
                        className={cn(
                          "font-semibold mb-1 text-warning-foreground",
                        )}
                      >
                        Resolver Disputas
                      </p>
                      <p className={cn("text-sm text-warning")}>
                        Mediar conflitos entre usuários
                      </p>
                    </button>
                  </Link>
                  <Link to="/admin/logs">
                    <button
                      className={cn(
                        "w-full p-4 text-left rounded-xl border-0 shadow-md transition-all hover:shadow-lg",
                        "bg-gradient-to-br from-muted/5 to-muted/10 hover:from-muted/10 hover:to-muted/20 dark:from-muted/10 dark:to-muted/5 dark:hover:from-muted/20 dark:hover:to-muted/10",
                      )}
                    >
                      <p className={cn("font-semibold mb-1 text-foreground")}>
                        Logs do Sistema
                      </p>
                      <p className={cn("text-sm text-muted-foreground")}>
                        Monitorar atividades e erros
                      </p>
                    </button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        );

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
                    {isCustomizeMode && (
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                    )}
                    <CardTitle className="text-lg font-semibold">
                      {getWidgetTitle(widget.type)}
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <WidgetExportButton
                      widgetId={widget.type}
                      widgetTitle={getWidgetTitle(widget.type)}
                    />
                    <Link to="/admin/activity">
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
                </div>
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
            <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isCustomizeMode && (
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                    )}
                    <CardTitle className="text-lg font-semibold">
                      {getWidgetTitle(widget.type)}
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <WidgetExportButton
                      widgetId={widget.type}
                      widgetTitle={getWidgetTitle(widget.type)}
                    />
                    <Badge
                      variant="outline"
                      className="text-xs backdrop-blur-sm"
                    >
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
                        <p className="text-sm font-medium leading-none">
                          {alert.title}
                        </p>
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
        );

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
                    {isCustomizeMode && (
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                    )}
                    <CardTitle className="text-lg font-semibold">
                      {getWidgetTitle(widget.type)}
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <WidgetExportButton
                      widgetId={widget.type}
                      widgetTitle={getWidgetTitle(widget.type)}
                    />
                    <Link to="/admin/nomades">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs hover:bg-primary/10"
                      >
                        Ver todos
                        <ArrowRightIcon className="h-3 w-3 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4">
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
                        <p className="text-sm font-semibold leading-none">
                          {performer.name}
                        </p>
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-1">
                            <Star className="h-3 w-3 text-warning fill-warning" />
                            <span className="text-xs font-medium">
                              {performer.rating}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            •
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {performer.projects} projetos
                          </span>
                        </div>
                        <Badge
                          className={`text-xs ${getBadgeColor(performer.badge)}`}
                        >
                          {performer.badge === "gold"
                            ? "Ouro"
                            : performer.badge === "silver"
                              ? "Prata"
                              : "Bronze"}
                        </Badge>
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
            <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isCustomizeMode && (
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                    )}
                    <CardTitle className="text-lg font-semibold">
                      {getWidgetTitle(widget.type)}
                    </CardTitle>
                  </div>
                  <WidgetExportButton
                    widgetId={widget.type}
                    widgetTitle={getWidgetTitle(widget.type)}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-3">
                  <Link to="/admin/usuarios">
                    <Button
                      variant="outline"
                      className="w-full h-auto flex-col space-y-2 py-4 border-0 bg-gradient-to-br from-info/5 to-info/10 hover:from-info/10 hover:to-info/20 dark:from-info/10 dark:to-info/5 dark:hover:from-info/20 dark:hover:to-info/10"
                    >
                      <Users className="h-5 w-5 text-info" />
                      <span className="text-xs font-medium text-info-foreground">
                        Gerenciar Usuários
                      </span>
                    </Button>
                  </Link>
                  <Link to="/admin/nomades">
                    <Button
                      variant="outline"
                      className="w-full h-auto flex-col space-y-2 py-4 border-0 bg-gradient-to-br from-success/5 to-success/10 hover:from-success/10 hover:to-success/20 dark:from-success/10 dark:to-success/5 dark:hover:from-success/20 dark:hover:to-success/10"
                    >
                      <UserCheck className="h-5 w-5 text-success" />
                      <span className="text-xs font-medium text-success-foreground">
                        Gerenciar Nômades
                      </span>
                    </Button>
                  </Link>
                  <Link to="/admin/projetos">
                    <Button
                      variant="outline"
                      className="w-full h-auto flex-col space-y-2 py-4 border-0 bg-gradient-to-br from-chart-4/5 to-chart-4/10 hover:from-chart-4/10 hover:to-chart-4/20 dark:from-chart-4/10 dark:to-chart-4/5 dark:hover:from-chart-4/20 dark:hover:to-chart-4/10"
                    >
                      <Briefcase className="h-5 w-5 text-chart-4" />
                      <span className="text-xs font-medium text-chart-4">
                        Ver Projetos
                      </span>
                    </Button>
                  </Link>
                  <Link to="/admin/configuracoes">
                    <Button
                      variant="outline"
                      className="w-full h-auto flex-col space-y-2 py-4 border-0 bg-gradient-to-br from-warning/5 to-warning/10 hover:from-warning/10 hover:to-warning/20 dark:from-warning/10 dark:to-warning/5 dark:hover:from-warning/20 dark:hover:to-warning/10"
                    >
                      <Activity className="h-5 w-5 text-warning" />
                      <span className="text-xs font-medium text-warning-foreground">
                        Configurações
                      </span>
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "revenue":
        return (
          <Card
            className="overflow-hidden border-destructive/20"
            key={widget.id}
            data-widget-id={widget.type}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-destructive/10">
                    <DollarSign className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Receita</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Total e por tipo de plano
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <WidgetExportButton
                    widgetId={widget.type}
                    widgetTitle="Receita"
                  />
                  <Badge
                    variant="outline"
                    className="text-destructive border-destructive/30"
                  >
                    {globalPeriod.label}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Revenue Total */}
              <div className="pb-4 border-b">
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-bold">R$ {(rv.total / 1000).toFixed(1)}k</h3>
                  <span className="flex items-center gap-1 text-sm text-success font-semibold">
                    <TrendingUp className="h-3.5 w-3.5" />
                    +{rv.totalGrowth}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Receita total no período
                </p>
              </div>

              {/* Breakdown by Type */}
              <div className="space-y-3">
                {/* Credit Plan Revenue */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-info-muted border border-info/50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-2 w-2 rounded-full bg-info" />
                      <span className="text-sm font-medium">
                        Plano de Crédito
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-semibold text-info-foreground">
                        R$ {(rv.creditPlan / 1000).toFixed(1)}k
                      </span>
                      <span className="text-xs font-medium text-success">
                        +{rv.creditPlanGrowth}%
                      </span>
                    </div>
                  </div>
                  {/* Mini bar chart */}
                  <div className="flex items-end gap-0.5 h-8">
                    <div
                      className="w-1 bg-info/60 rounded-t"
                      style={{ height: "45%" }}
                    />
                    <div
                      className="w-1 bg-info/70 rounded-t"
                      style={{ height: "60%" }}
                    />
                    <div
                      className="w-1 bg-info/80 rounded-t"
                      style={{ height: "75%" }}
                    />
                    <div
                      className="w-1 bg-info rounded-t"
                      style={{ height: "100%" }}
                    />
                  </div>
                </div>

                {/* Recurring Revenue */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-chart-4/10 border border-chart-4/50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-2 w-2 rounded-full bg-chart-4" />
                      <span className="text-sm font-medium">
                        Compra Recorrente
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-semibold text-chart-4">
                        R$ {(rv.recurring / 1000).toFixed(1)}k
                      </span>
                      <span className="text-xs font-medium text-success">
                        +{rv.recurringGrowth}%
                      </span>
                    </div>
                  </div>
                  {/* Mini bar chart */}
                  <div className="flex items-end gap-0.5 h-8">
                    <div
                      className="w-1 bg-chart-4/60 rounded-t"
                      style={{ height: "50%" }}
                    />
                    <div
                      className="w-1 bg-chart-4/70 rounded-t"
                      style={{ height: "65%" }}
                    />
                    <div
                      className="w-1 bg-chart-4/80 rounded-t"
                      style={{ height: "80%" }}
                    />
                    <div
                      className="w-1 bg-chart-4 rounded-t"
                      style={{ height: "90%" }}
                    />
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
                      <span className="text-lg font-semibold text-success-foreground">
                        R$ {(rv.oneTime / 1000).toFixed(1)}k
                      </span>
                      <span className="text-xs font-medium text-success">
                        +{rv.oneTimeGrowth}%
                      </span>
                    </div>
                  </div>
                  {/* Mini bar chart */}
                  <div className="flex items-end gap-0.5 h-8">
                    <div
                      className="w-1 bg-success/60 rounded-t"
                      style={{ height: "40%" }}
                    />
                    <div
                      className="w-1 bg-success/70 rounded-t"
                      style={{ height: "55%" }}
                    />
                    <div
                      className="w-1 bg-success/80 rounded-t"
                      style={{ height: "65%" }}
                    />
                    <div
                      className="w-1 bg-success rounded-t"
                      style={{ height: "70%" }}
                    />
                  </div>
                </div>
              </div>

              {/* Info note */}
              <div className="mt-2 p-2 rounded-lg bg-muted/30 border border-border/50">
                <p className="text-xs text-muted-foreground text-center">
                  Comparado ao mesmo período anterior
                </p>
              </div>
            </CardContent>
          </Card>
        );

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
                    {isCustomizeMode && (
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                    )}
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
                    <h3 className="text-3xl font-bold">{apW.total}</h3>
                    <span className="text-sm font-medium flex items-center gap-1 text-success">
                      <TrendingUp className="h-3.5 w-3.5" />
                      {apW.growth}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Projetos ativos no período
                  </p>
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
                        <span className="text-lg font-semibold text-indigo-700 dark:text-indigo-300">
                          {apW.agencies}
                        </span>
                        <span className="text-xs font-medium text-success">
                          +{apW.agenciesGrowth}%
                        </span>
                      </div>
                    </div>
                    {/* Mini bar chart */}
                    <div className="flex items-end gap-0.5 h-8">
                      <div
                        className="w-1 bg-indigo-400/60 rounded-t"
                        style={{ height: "55%" }}
                      />
                      <div
                        className="w-1 bg-indigo-400/70 rounded-t"
                        style={{ height: "70%" }}
                      />
                      <div
                        className="w-1 bg-indigo-500/80 rounded-t"
                        style={{ height: "85%" }}
                      />
                      <div
                        className="w-1 bg-indigo-600 rounded-t"
                        style={{ height: "100%" }}
                      />
                    </div>
                  </div>

                  {/* Lead Premium Projects */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 to-transparent dark:from-amber-950/30 border border-amber-200 dark:border-amber-800">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="h-2 w-2 rounded-full bg-amber-500" />
                        <span className="text-sm font-medium">
                          Lead Premium
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-semibold text-amber-700 dark:text-amber-300">
                          {apW.leadPremium}
                        </span>
                        <span className="text-xs font-medium text-success">
                          +{apW.leadPremiumGrowth}%
                        </span>
                      </div>
                    </div>
                    {/* Mini bar chart */}
                    <div className="flex items-end gap-0.5 h-8">
                      <div
                        className="w-1 bg-amber-400/60 rounded-t"
                        style={{ height: "45%" }}
                      />
                      <div
                        className="w-1 bg-amber-400/70 rounded-t"
                        style={{ height: "65%" }}
                      />
                      <div
                        className="w-1 bg-amber-500/80 rounded-t"
                        style={{ height: "85%" }}
                      />
                      <div
                        className="w-1 bg-amber-600 rounded-t"
                        style={{ height: "100%" }}
                      />
                    </div>
                  </div>
                </div>

                {/* New Projects Section */}
                <div className="p-3 rounded-lg bg-teal-50 to-transparent dark:from-teal-950/30 border border-teal-200/50 dark:border-teal-800/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Plus className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                    <span className="text-sm font-semibold text-teal-900 dark:text-teal-100">
                      Novos no período: {apW.newTotal}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                        Agências:
                      </span>{" "}
                      {apW.newAgencies}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <span className="text-amber-600 dark:text-amber-400 font-medium">
                        Lead Premium:
                      </span>{" "}
                      {apW.newLeadPremium}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
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

                {/* Info note */}
                <div className="mt-2 p-2 rounded-lg bg-muted/30 border border-border/50">
                  <p className="text-xs text-muted-foreground text-center">
                    Comparado ao mesmo período anterior
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        );

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
                    {isCustomizeMode && (
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                    )}
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
                    <h3 className="text-3xl font-bold">R$ {cpW.total.toLocaleString('pt-BR')}</h3>
                    <span className="text-sm font-medium flex items-center gap-1 text-success">
                      <TrendingUp className="h-3.5 w-3.5" />
                      {cpW.growth}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total de entrada no período
                  </p>
                </div>

                {/* Plans Breakdown */}
                <div className="space-y-3">
                  {/* Basic Plan */}
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                        <span className="font-medium">Básico</span>
                        <Badge
                          variant="outline"
                          className="text-xs ml-auto mr-2"
                        >
                          Novos: {cpW.basic.newContracts}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-foreground">
                        R$ {cpW.basic.revenue.toLocaleString('pt-BR')}
                      </div>
                      <div className="flex items-center gap-1 text-xs justify-end">
                        <TrendingUp className="h-3 w-3 text-success" />
                        <span className="text-xs font-medium text-success">
                          +{cpW.basic.growth}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Partner Plan */}
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                        <span className="font-medium">Partner</span>
                        <Badge
                          variant="outline"
                          className="text-xs ml-auto mr-2"
                        >
                          Novos: {cpW.partner.newContracts}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">R$ {cpW.partner.revenue.toLocaleString('pt-BR')}</div>
                      <div className="flex items-center gap-1 text-xs justify-end">
                        <TrendingUp className="h-3 w-3 text-success" />
                        <span className="text-xs font-medium text-success">
                          +{cpW.partner.growth}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Premium Plan */}
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                        <span className="font-medium">Premium</span>
                        <Badge
                          variant="outline"
                          className="text-xs ml-auto mr-2"
                        >
                          Novos: {cpW.premium.newContracts}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">R$ {cpW.premium.revenue.toLocaleString('pt-BR')}</div>
                      <div className="flex items-center gap-1 text-xs justify-end">
                        <TrendingDown className="h-3 w-3 text-destructive" />
                        <span className="text-xs font-medium text-destructive">
                          {cpW.premium.growth}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1 bg-transparent"
                  >
                    <FileText className="h-3.5 w-3.5 mr-1" />
                    Ver contratos
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1 bg-transparent"
                  >
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
        );

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
                    {isCustomizeMode && (
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                    )}
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
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-muted/60 dark:to-muted/40 border border-blue-200 dark:border-border rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-blue-900 dark:text-foreground">
                        O que é MRR?
                      </p>
                      <p className="text-xs text-blue-800 dark:text-muted-foreground leading-relaxed">
                        MRR (Monthly Recurring Revenue) é a receita previsível
                        gerada mensalmente. Inclui New (novos contratos),
                        Expansion (aumentos), Base (receita existente),
                        Contraction (reduções) e Churn (cancelamentos).
                      </p>
                    </div>
                  </div>
                </div>

                {/* MRR Total */}
                <div className="pb-4 border-b">
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-3xl font-bold">R$ {mrrW.total.toLocaleString('pt-BR')}</h3>
                    <div className="flex items-center gap-2 text-sm font-medium text-success">
                      <ArrowUpRight className="w-4 h-4" />
                      +{mrrW.growth}%
                    </div>
                    <span className="text-sm text-muted-foreground">
                      vs período anterior
                    </span>
                  </div>
                </div>

                {/* MRR Breakdown */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                  <div className="space-y-1 bg-green-50 p-2.5 rounded-lg border border-green-200">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-success rounded-full" />
                      <div className="text-xs text-muted-foreground font-medium">
                        New
                        <span
                          className="text-green-700"
                          title="Novos contratos adquiridos neste período"
                        >
                          {" "}
                          (novos)
                        </span>
                      </div>
                    </div>
                    <div className="text-lg font-semibold text-success">
                      +R$ {mrrW.newMrr.toLocaleString('pt-BR')}
                    </div>
                  </div>

                  <div className="space-y-1 bg-blue-50 p-2.5 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-info rounded-full" />
                      <div className="text-xs text-muted-foreground font-medium">
                        Expansion
                        <span
                          className="text-blue-700"
                          title="Aumento de valor em contratos existentes"
                        >
                          {" "}
                          (crescimento)
                        </span>
                      </div>
                    </div>
                    <div className="text-lg font-semibold text-info">
                      +R$ {mrrW.expansion.toLocaleString('pt-BR')}
                    </div>
                  </div>

                  <div className="space-y-1 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-warning rounded-full" />
                      <div className="text-xs text-muted-foreground font-medium">
                        Contraction
                        <span
                          className="text-amber-700"
                          title="Redução de valor em contratos existentes"
                        >
                          {" "}
                          (redução)
                        </span>
                      </div>
                    </div>
                    <div className="text-lg font-semibold text-warning">
                      -R$ {mrrW.contraction.toLocaleString('pt-BR')}
                    </div>
                  </div>

                  <div className="space-y-1 bg-red-50 p-2.5 rounded-lg border border-red-200">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-destructive rounded-full" />
                      <div className="text-xs text-muted-foreground font-medium">
                        Churn (R$)
                        <span
                          className="text-red-700"
                          title="Contratos cancelados neste período"
                        >
                          {" "}
                          (cancelado)
                        </span>
                      </div>
                    </div>
                    <div className="text-lg font-semibold text-destructive">
                      -R$ {mrrW.churnRevenue.toLocaleString('pt-BR')}
                    </div>
                  </div>
                </div>

                {/* Churn Percentage */}
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Churn Rate
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="text-base font-semibold text-destructive">
                        {mrrW.churnRate}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        (revenue churn)
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Metrics */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">
                      Contratações recorrentes
                    </div>
                    <div className="text-xl font-bold">{mrrW.newContracts}</div>
                    <div className="text-xs text-muted-foreground">
                      (novas no período)
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">
                      ARR estimado
                    </div>
                    <div className="text-xl font-bold">R$ {(mrrW.total * 12).toLocaleString('pt-BR')}</div>
                    <div className="text-xs text-muted-foreground">
                      (MRR × 12)
                    </div>
                  </div>
                </div>

                {/* MRR Composition Visualization */}
                <div className="pt-2 border-t">
                  <div className="text-sm font-medium mb-2">
                    Composição do MRR
                  </div>
                  <div className="flex h-3 rounded-full overflow-hidden bg-muted">
                    <div
                      className="bg-success transition-all"
                      style={{ width: "11.5%" }}
                      title="New: R$ 9.000"
                    />
                    <div
                      className="bg-info transition-all"
                      style={{ width: "5.3%" }}
                      title="Expansion: R$ 4.200"
                    />
                    <div
                      className="bg-muted transition-all"
                      style={{ width: "78.4%" }}
                      title="Base MRR: R$ 61.520"
                    />
                    <div
                      className="bg-warning transition-all"
                      style={{ width: "1.9%" }}
                      title="Contraction: R$ 1.500"
                    />
                    <div
                      className="bg-destructive transition-all"
                      style={{ width: "4.8%" }}
                      title="Churn: R$ 3.800"
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                    <span>Base: R$ {mrrW.baseMrr.toLocaleString('pt-BR')}</span>
                    <span>Net Change: {mrrW.netChange >= 0 ? '+' : ''}R$ {mrrW.netChange.toLocaleString('pt-BR')}</span>
                  </div>
                </div>

                {/* Mini Trend Chart */}
                <div className="pt-2 border-t">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">
                          Tendência de MRR
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Últimos 6 meses - Crescimento consistente
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="bg-green-50 text-green-700 border-green-200 text-xs"
                      >
                        <TrendingUp className="h-3 w-3 mr-1" />
                        +{mrrW.trendGrowth}%
                      </Badge>
                    </div>

                    {/* Enhanced Bar Chart */}
                    <div className="flex items-end justify-between gap-1.5 h-20 bg-gradient-to-b from-blue-50 to-transparent p-3 rounded-lg border border-blue-100">
                      {mrrW.trendData.map((data, idx) => {
                        const maxValue = mrrW.trendData[mrrW.trendData.length - 1];
                        const height = (data / Math.max(1, maxValue)) * 100;
                        const isLast = idx === 5;
                        return (
                          <div
                            key={idx}
                            className="flex-1 flex flex-col items-center gap-1 group cursor-pointer"
                          >
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
                              {["Jun","Jul","Ago","Set","Out","Nov"][idx]}
                            </span>
                            <span className="text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity absolute -top-6">
                              R$ {(data / 1000).toFixed(0)}k
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Trend Summary */}
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="bg-green-50 border border-green-200 rounded p-2">
                        <p className="text-muted-foreground">Menor</p>
                        <p className="font-semibold">R$ {(Math.min(...mrrW.trendData) / 1000).toFixed(0)}k</p>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded p-2">
                        <p className="text-muted-foreground">Médio</p>
                        <p className="font-semibold">R$ {(mrrW.trendData.reduce((a, b) => a + b, 0) / mrrW.trendData.length / 1000).toFixed(1)}k</p>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded p-2">
                        <p className="text-muted-foreground">Atual</p>
                        <p className="font-semibold text-blue-600">R$ {(mrrW.total / 1000).toFixed(1)}k</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

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
                    <p className="text-sm text-muted-foreground">
                      Perda de clientes e receita
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="text-destructive border-destructive/30"
                >
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
                    <span className="font-semibold text-lg">
                      Clientes Inativados
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">{churnW.inactiveAccounts}</span>
                    <Badge variant="destructive" className="gap-1">
                      <TrendingUp className="h-3 w-3" />
                      +{churnW.inactiveGrowth}%
                    </Badge>
                  </div>
                </div>

                {/* Breakdown by account type */}
                <div className="grid grid-cols-2 gap-2 pl-6">
                  <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                    <span className="text-sm text-muted-foreground">
                      Agências
                    </span>
                    <span className="font-semibold">{churnW.agencies}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                    <span className="text-sm text-muted-foreground">
                      Lead Premium
                    </span>
                    <span className="font-semibold">{churnW.leadPremium}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                    <span className="text-sm text-muted-foreground">
                      Nômades
                    </span>
                    <span className="font-semibold">{churnW.nomades}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                    <span className="text-sm text-muted-foreground">Free</span>
                    <span className="font-semibold">{churnW.free}</span>
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
                    <span className="text-xl font-bold">{churnW.cancelledProjects}</span>
                    <Badge variant="destructive" className="gap-1">
                      <TrendingUp className="h-3 w-3" />
                      +{churnW.cancelledGrowth}%
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
                    <div className="text-xl font-bold text-destructive">
                      R$ {churnW.revenueChurn.toLocaleString('pt-BR')}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Churn Rate:{" "}
                      <span className="font-semibold text-destructive">
                        {churnW.revenueChurnRate}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Visual bar showing churn percentage */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Perda de MRR</span>
                    <span>{churnW.revenueChurnRate}% do total</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-destructive"
                      style={{ width: `${churnW.revenueChurnRate}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 bg-transparent"
                  onClick={() => {}}
                >
                  <FileText className="h-3 w-3" />
                  Ver Detalhes
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 bg-transparent"
                  onClick={() => {}}
                >
                  <Download className="h-3 w-3" />
                  Exportar
                </Button>
              </div>

              {/* Warning if churn increased significantly */}
              <Alert variant="destructive" className="border-destructive/30">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Churn de clientes aumentou 5% vs período anterior. Considere
                  ações de retenção.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        );

      case "averageTicket":
        return (
          <Card className="overflow-hidden">
            <CardHeader className="border-b bg-gradient-to-r from-success/10 to-chart-3/10">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-success/20 rounded-lg shrink-0">
                    <DollarSign className="h-5 w-5 text-success" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-base">Ticket Médio</CardTitle>
                    <p className="text-xs text-muted-foreground truncate">
                      Valor médio por cliente e projeto
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <FileDown className="h-4 w-4" />
                    <span className="hidden sm:inline">Exportar</span>
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <ExternalLink className="h-4 w-4" />
                    <span className="hidden sm:inline">Detalhes</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {/* Ticket Médio Geral */}
              <div className="mb-6 p-4 bg-success/10 rounded-lg border border-success/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Ticket Médio Geral
                    </p>
                    <p className="text-3xl font-bold text-success">R$ {atW.general.toLocaleString('pt-BR')}</p>
                  </div>
                  <div className="flex items-center gap-2 text-success">
                    <TrendingUp className="h-5 w-5" />
                    <span className="text-lg font-semibold">+{atW.generalGrowth}%</span>
                  </div>
                </div>
              </div>

              {/* Ticket Médio por Tipo de Conta */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-muted-foreground mb-3">
                  Por Tipo de Conta
                </h4>
                <div className="space-y-3">
                  {[
                    {
                      type: "Agências",
                      value: "R$ 1.750",
                      change: 6,
                      color: "info",
                    },
                    {
                      type: "Lead Premium",
                      value: "R$ 1.120",
                      change: 2,
                      color: "chart_4",
                    },
                    {
                      type: "Nômades",
                      value: "R$ 680",
                      change: 1,
                      color: "warning",
                    },
                    { type: "Free", value: "R$ 0", change: 0, color: "muted" },
                  ].map((item) => {
                    const colorClasses = {
                      info: "bg-info-muted border-info/20 text-info-foreground",
                      chart_4: "bg-chart-4/10 border-chart-4/20 text-chart-4",
                      warning:
                        "bg-warning-muted border-warning/20 text-warning-foreground",
                      muted: "bg-muted border-border text-muted-foreground",
                    };

                    return (
                      <div
                        key={item.type}
                        className={`flex items-center justify-between p-3 rounded-lg border ${colorClasses[item.color as keyof typeof colorClasses]}`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {item.type}
                          </p>
                          <p className="text-base font-bold leading-tight">
                            {item.value}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 ml-3 shrink-0">
                          {item.change > 0 ? (
                            <>
                              <TrendingUp className="h-4 w-4 text-success" />
                              <span className="text-sm font-semibold text-success">
                                +{item.change}%
                              </span>
                            </>
                          ) : item.change === 0 ? (
                            <span className="text-sm text-muted-foreground">
                              —
                            </span>
                          ) : (
                            <>
                              <TrendingDown className="h-4 w-4 text-destructive" />
                              <span className="text-sm font-semibold text-destructive">
                                {item.change}%
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Ticket Médio por Projeto */}
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-3">
                  Por Projeto
                </h4>
                <div className="flex items-center justify-between p-4 rounded-lg border bg-gradient-to-r from-success/10 to-chart-3/10 border-success/30">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Ticket Médio por Projeto
                    </p>
                    <p className="text-2xl font-bold text-success">R$ {atW.perProject.toLocaleString('pt-BR')}</p>
                  </div>
                  <div className="flex items-center gap-2 text-success">
                    <TrendingUp className="h-5 w-5" />
                    <span className="text-lg font-semibold">+{atW.perProjectGrowth}%</span>
                  </div>
                </div>
              </div>

              {/* Mini Trend Chart */}
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Tendência (últimos 6 meses)
                </p>
                <div className="flex items-end justify-between gap-1 h-16">
                  {atW.trendData.map((val, idx) => {
                    const maxVal = Math.max(...atW.trendData);
                    const height = (val / maxVal) * 100;
                    return (
                      <div
                        key={idx}
                        className="flex-1 flex flex-col items-center gap-1"
                      >
                        <div
                          className="w-full bg-gradient-to-t from-success to-success/80 rounded-sm transition-all hover:opacity-80"
                          style={{ height: `${height}%` }}
                          title={`R$ ${val}`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case "ltv":
        return (
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-chart-4" />
                <CardTitle className="text-base font-semibold">
                  LTV (Lifetime Value)
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Tempo médio × Ticket médio
                </p>
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
                  <div className="text-3xl font-bold">R$ {ltvW.value.toLocaleString('pt-BR')}</div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <span>Tempo médio: 24 meses</span>
                    <span>•</span>
                    <span>Ticket médio: R$ 420/mês</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <ArrowUp className="h-4 w-4 text-success" />
                  <span className="text-success font-semibold">+{ltvW.growth}%</span>
                </div>
              </div>

              {/* Confiança */}
              <div className="flex items-center gap-2 px-3 py-2 bg-info-muted rounded-lg">
                <Info className="h-4 w-4 text-info" />
                <span className="text-xs text-info-foreground">
                  Confiança: 78% (baseado em {Math.floor(2847 * 0.78)} clientes
                  com histórico completo)
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
                    <div className="text-xs text-muted-foreground mt-1">
                      28 meses × R$ 507/mês
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">R$ {ltvW.agencies.toLocaleString('pt-BR')}</div>
                    <div className="flex items-center gap-1 text-xs justify-end">
                      <ArrowUp className="h-3 w-3 text-success" />
                      <span className="text-success font-semibold">+{ltvW.agenciesGrowth}%</span>
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
                    <div className="text-xs text-muted-foreground mt-1">
                      22 meses × R$ 414/mês
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">R$ {ltvW.leadPremium.toLocaleString('pt-BR')}</div>
                    <div className="flex items-center gap-1 text-xs justify-end">
                      <ArrowUp className="h-3 w-3 text-success" />
                      <span className="text-success font-semibold">+{ltvW.leadPremiumGrowth}%</span>
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
                    <div className="text-xs text-muted-foreground mt-1">
                      12 meses × R$ 350/mês
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">R$ {ltvW.nomades.toLocaleString('pt-BR')}</div>
                    <div className="flex items-center gap-1 text-xs justify-end">
                      <ArrowDown className="h-3 w-3 text-warning" />
                      <span className="text-warning">{ltvW.nomadesGrowth}%</span>
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
                    <div className="text-xs text-muted-foreground mt-1">
                      Excluído do cálculo
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-muted-foreground">
                      R$ 0
                    </div>
                  </div>
                </div>
              </div>

              {/* Mini histograma visual */}
              <div className="space-y-2 pt-2">
                <div className="text-sm font-semibold">
                  Distribuição de LTVs:
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-muted-foreground w-24">
                      R$ 0 - 1k
                    </div>
                    <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-muted-foreground h-full"
                        style={{ width: `${Math.min(100, (ltvW.hist0to1k / 400) * 100)}%` }}
                      />
                    </div>
                    <div className="text-xs font-medium w-12 text-right">
                      {ltvW.hist0to1k}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-muted-foreground w-24">
                      R$ 1k - 5k
                    </div>
                    <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-info h-full"
                        style={{ width: `${Math.min(100, (ltvW.hist1kto5k / 400) * 100)}%` }}
                      />
                    </div>
                    <div className="text-xs font-medium w-12 text-right">
                      {ltvW.hist1kto5k}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-muted-foreground w-24">
                      R$ 5k - 15k
                    </div>
                    <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-chart-4 h-full"
                        style={{ width: `${Math.min(100, (ltvW.hist5kto15k / 400) * 100)}%` }}
                      />
                    </div>
                    <div className="text-xs font-medium w-12 text-right">
                      {ltvW.hist5kto15k}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-muted-foreground w-24">
                      R$ 15k+
                    </div>
                    <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-success h-full"
                        style={{ width: `${Math.min(100, (ltvW.hist15kplus / 400) * 100)}%` }}
                      />
                    </div>
                    <div className="text-xs font-medium w-12 text-right">
                      {ltvW.hist15kplus}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case "cmv":
        const cmvData = {
          totalCosts: dashboardData.cmv.totalCosts,
          revenue: dashboardData.cmv.revenue,
          cmvPercent: dashboardData.cmv.cmvPercent,
          previousCmvPercent: dashboardData.cmv.prevCmvPercent,
          breakdown: {
            nomades: dashboardData.cmv.nomades,
            impostos: dashboardData.cmv.impostos,
            comissoes: dashboardData.cmv.comissoes,
            outros: dashboardData.cmv.outros,
          },
          variation: dashboardData.cmv.variation,
        };

        return (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-warning" />
                <CardTitle className="text-base font-medium">
                  CMV (Custo de Mercadoria Vendida)
                </CardTitle>
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
                  <span className="text-3xl font-bold">
                    {cmvData.cmvPercent.toFixed(1)}%
                  </span>
                  <span
                    className={cn(
                      "flex items-center text-sm font-medium",
                      cmvData.variation.cmvPercent < 0
                        ? "text-success"
                        : "text-destructive",
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
                  <span className="font-semibold text-foreground">
                    R$ {(cmvData.totalCosts / 1000).toFixed(1)}k
                  </span>
                  <span className="mx-1">/</span>
                  Receita:{" "}
                  <span className="font-semibold text-foreground">
                    R$ {(cmvData.revenue / 1000).toFixed(1)}k
                  </span>
                </div>
              </div>

              {/* Breakdown by Category */}
              <div className="space-y-3 pt-2 border-t">
                <div className="text-xs font-medium text-muted-foreground">
                  Breakdown por Categoria:
                </div>
                <div className="space-y-2">
                  {Object.entries(cmvData.breakdown).map(([key, data]) => {
                    const categoryNames: Record<string, string> = {
                      nomades: "Nômades",
                      impostos: "Impostos",
                      comissoes: "Comissões",
                      outros: "Outros",
                    };
                    const categoryColors: Record<string, string> = {
                      nomades: "bg-info",
                      impostos: "bg-warning",
                      comissoes: "bg-chart-4",
                      outros: "bg-muted-foreground",
                    };

                    return (
                      <div key={key} className="flex items-center gap-2">
                        <div
                          className={cn(
                            "h-2 w-2 rounded-full",
                            categoryColors[key],
                          )}
                        />
                        <div className="flex-1 flex items-baseline justify-between text-sm">
                          <span className="text-muted-foreground">
                            {categoryNames[key]}
                          </span>
                          <div className="flex items-baseline gap-2">
                            <span className="font-medium">
                              R$ {(data.value / 1000).toFixed(1)}k
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ({data.percent.toFixed(1)}%)
                            </span>
                          </div>
                        </div>
                        {/* Mini bar */}
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn("h-full", categoryColors[key])}
                            style={{ width: `${data.percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Visual Composition Bar */}
              <div className="space-y-2 pt-2 border-t">
                <div className="text-xs font-medium text-muted-foreground">
                  Composição do CMV:
                </div>
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
                    <span className="font-medium">CMV Alto:</span> Custos
                    diretos acima de 30% podem impactar a margem de lucro.
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 bg-transparent"
                >
                  <FileText className="h-3 w-3 mr-1" />
                  Ver Detalhes
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 bg-transparent"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Exportar CSV
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case "platformActivities":
        return (
          <Card key={widget.id} className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-info" />
                <CardTitle className="text-base font-semibold">
                  Atividades da Plataforma
                </CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => alert("Ver detalhes")}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Main metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Agências Ativas
                    </p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-2xl font-bold">{paW.activeAgencies}</span>
                      <span className="flex items-center text-xs text-success font-medium">
                        <TrendingUp className="h-3 w-3" />
                        +7%
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Tempo médio/dia
                    </p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-2xl font-bold">{paW.avgSessionMinutes} min</span>
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
                    <span className="text-lg font-semibold">{paW.mau}</span>
                    <span className="text-xs text-success">+5%</span>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">DAU</p>
                    <span className="text-lg font-semibold">{paW.dau}</span>
                    <span className="text-xs text-success">+3%</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Sessões</p>
                    <span className="text-lg font-semibold">{paW.sessions.toLocaleString('pt-BR')}</span>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Ações executadas
                    </p>
                    <span className="text-lg font-semibold">{paW.actionsExecuted.toLocaleString('pt-BR')}</span>
                  </div>
                </div>

                {/* Activity trend chart */}
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground mb-2">
                    Atividade (últimos 7 dias)
                  </p>
                  <div className="flex items-end gap-1 h-16">
                    {paW.trendData.map((value, idx) => (
                      <div
                        key={idx}
                        className="flex-1 bg-info rounded-t"
                        style={{ height: `${(value / Math.max(1, Math.max(...paW.trendData))) * 100}%` }}
                        title={`Dia ${idx + 1}: ${value} ações`}
                      />
                    ))}
                  </div>
                </div>

                {widget.size === "large" && (
                  <div className="pt-4 border-t space-y-3">
                    <h4 className="text-sm font-semibold">
                      Tipos de Atividade
                    </h4>
                    {[
                      { label: "Tarefas", value: 4200, color: "bg-info" },
                      { label: "Projetos", value: 3100, color: "bg-chart-4" },
                      { label: "Mensagens", value: 4500, color: "bg-success" },
                      { label: "Uploads", value: 2400, color: "bg-warning" },
                    ].map((item) => (
                      <div key={item.label} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {item.label}
                          </span>
                          <span className="font-medium">
                            {item.value.toLocaleString()}
                          </span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className={`h-2 ${item.color}`}
                            style={{ width: `${(item.value / 4500) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 bg-transparent"
                  >
                    Ver detalhes
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 bg-transparent"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Exportar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );

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
                    <p className="text-sm text-muted-foreground">
                      Visão rápida da base de nômades
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <span className="hidden min-[380px]:inline">Ver lista</span>
                    <span className="min-[380px]:hidden text-xs">Lista</span>
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Download className="h-4 w-4" />
                    <span className="hidden min-[380px]:inline">Exportar</span>
                  </Button>
                </div>
              </div>

              {/* Total em cima - Destaque grande */}
              <div className="rounded-lg border-2 border-chart-2/30 bg-chart-2/5 p-4 text-center">
                <p className="text-xs font-medium text-chart-2 mb-1">
                  TOTAL DE NÔMADES
                </p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-4xl font-bold text-chart-2">{nmW.total}</span>
                  <span className="flex items-center gap-1 text-base text-success font-semibold">
                    <TrendingUp className="h-4 w-4" />
                    +{nmW.growth}%
                  </span>
                </div>
              </div>

              {/* Ativos e Inativos lado a lado */}
              <div className="grid grid-cols-2 gap-4">
                {/* Ativos */}
                <div className="rounded-lg border bg-success-muted border-success/20 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-2 w-2 rounded-full bg-success" />
                    <p className="text-sm font-medium text-success-foreground">
                      Ativos
                    </p>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-success-foreground">
                      {nmW.active}
                    </span>
                    <span className="flex items-center text-sm text-success font-semibold">
                      <TrendingUp className="h-3 w-3" />
                      +{nmW.activeGrowth}%
                    </span>
                  </div>
                  <p className="text-xs text-success mt-1">
                    vs período anterior
                  </p>
                </div>

                {/* Inativos */}
                <div className="rounded-lg border bg-muted border-border p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                    <p className="text-sm font-medium text-muted-foreground">
                      Inativos
                    </p>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-foreground">
                      {nmW.inactive}
                    </span>
                    <span className="flex items-center text-sm text-destructive font-semibold">
                      <TrendingDown className="h-3 w-3" />
                      {nmW.inactiveChange}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    vs período anterior
                  </p>
                </div>
              </div>

              {/* Métricas adicionais */}
              <div className="rounded-lg border bg-card p-4">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1 leading-tight">
                      Novos no período
                    </p>
                    <p className="text-xl font-bold text-info">{nmW.newInPeriod}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1 leading-tight">
                      Churn
                    </p>
                    <p className="text-xl font-bold text-destructive">{nmW.churn}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1 leading-tight">
                      Retenção 30d
                    </p>
                    <p className="text-xl font-bold text-success">{nmW.retention30d}%</p>
                  </div>
                </div>
              </div>

              {/* Mini gráfico de tendência */}
              <div className="rounded-lg border bg-card p-4">
                <p className="text-xs font-medium text-muted-foreground mb-3">
                  Evolução de nômades ativos
                </p>
                <div className="flex items-end justify-between gap-1 h-16">
                  {nmW.trendData.map((value, idx) => {
                    const percentage = (value / Math.max(1, Math.max(...nmW.trendData))) * 100;
                    return (
                      <div
                        key={idx}
                        className="flex-1 flex flex-col items-center gap-1"
                      >
                        <div
                          className="w-full bg-gradient-to-t from-chart-2 to-chart-2/80 rounded-t transition-all hover:bg-chart-2/80"
                          style={{ height: `${percentage}%` }}
                          title={`${value} ativos`}
                        />
                        <span className="text-[10px] text-muted-foreground">
                          D{idx + 1}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Botão de ação adicional */}
              <Button
                variant="outline"
                className="w-full bg-transparent"
                size="sm"
              >
                <Award className="h-4 w-4 mr-2" />
                Ver ranking de nômades
              </Button>
            </div>
          </Card>
        );

      case "nomadsRanking":
        return (
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-warning-muted rounded-lg shrink-0">
                    <Trophy className="h-5 w-5 text-warning" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-base">
                      Ranking de Nômades
                    </CardTitle>
                    <p className="text-xs text-muted-foreground truncate">
                      Os melhores nômades da plataforma
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="outline" size="sm" className="gap-1">
                    <span className="hidden sm:inline">Ver todos</span>
                    <ArrowRightIcon className="h-3 w-3" />
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline">Exportar</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
                {topPerformers.map((performer, index) => (
                  <div
                    key={performer.id}
                    className="group flex items-center gap-3 p-3 rounded-xl border-0 bg-gradient-to-br from-background to-background/50 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 min-w-0"
                  >
                    <div className="flex-shrink-0">
                      <div className="relative">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-warning to-warning flex items-center justify-center text-white font-bold text-base shadow-lg group-hover:shadow-warning/50 transition-shadow duration-300">
                          {index + 1}
                        </div>
                        <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5">
                          <Award
                            className={`h-4 w-4 ${index === 0 ? "text-warning" : index === 1 ? "text-muted-foreground" : "text-chart-5"}`}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 space-y-1 min-w-0">
                      <p className="text-sm font-semibold leading-none truncate">
                        {performer.name}
                      </p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <div className="flex items-center gap-0.5">
                          <Star className="h-3 w-3 text-warning fill-warning" />
                          <span className="text-xs font-medium">
                            {performer.rating}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">
                          {performer.projects} proj.
                        </span>
                      </div>
                      <Badge
                        className={`text-xs ${getBadgeColor(performer.badge)}`}
                      >
                        {performer.badge === "gold"
                          ? "Ouro"
                          : performer.badge === "silver"
                            ? "Prata"
                            : "Bronze"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );

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
                    {isCustomizeMode && (
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                    )}
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-cyan-500 shrink-0" />
                      <span className="truncate">
                        {getWidgetTitle(widget.type)}
                      </span>
                    </CardTitle>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Link to="/admin/agencias">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs bg-transparent gap-1"
                      >
                        <span className="hidden sm:inline">Ver todos</span>
                        <ArrowRightIcon className="h-3 w-3" />
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs bg-transparent gap-1.5"
                    >
                      <Download className="h-4 w-4" />
                      <span className="hidden sm:inline">Exportar</span>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
                  {agRankW.map((agency, index) => (
                    <div
                      key={agency.id}
                      className="group flex items-center gap-3 p-3 rounded-xl border-0 bg-gradient-to-br from-background to-background/50 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 min-w-0"
                    >
                      <div className="flex-shrink-0">
                        <div className="relative">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center text-white font-bold text-base shadow-lg group-hover:shadow-cyan-500/50 transition-shadow duration-300">
                            {index + 1}
                          </div>
                        </div>
                      </div>
                      <div className="flex-1 space-y-1 min-w-0">
                        <p className="text-sm font-semibold leading-none truncate">
                          {agency.name}
                        </p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <div className="flex items-center gap-0.5">
                            <Star className="h-3 w-3 text-warning fill-warning" />
                            <span className="text-xs font-medium">
                              {agency.rating}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            •
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {agency.projects} proj.
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground truncate">
                            {agency.contribution}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        );

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
                    {isCustomizeMode && (
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                    )}
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
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
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-2">
                    {[
                      {
                        label: "Em andamento",
                        count: soW.projects.ongoing,
                        status: "ongoing",
                        color: "blue",
                      },
                      {
                        label: "Aprovados",
                        count: soW.projects.approved,
                        status: "approved",
                        color: "green",
                      },
                      {
                        label: "Concluídos",
                        count: soW.projects.completed,
                        status: "completed",
                        color: "emerald",
                      },
                      {
                        label: "Cancelados",
                        count: soW.projects.cancelled,
                        status: "cancelled",
                        color: "red",
                      },
                      {
                        label: "Em atraso",
                        count: soW.projects.delayed,
                        status: "delayed",
                        color: "amber",
                      },
                    ].map((item) => (
                      <button
                        key={item.status}
                        onClick={() => {
                          window.location.href = `/admin/projects?status=${item.status}`;
                        }}
                        className="p-2.5 rounded-lg border bg-card hover:bg-accent hover:shadow-md transition-all duration-200 text-left group"
                      >
                        <div className="text-[10px] leading-tight text-muted-foreground mb-1 group-hover:text-foreground transition-colors line-clamp-2">
                          {item.label}
                        </div>
                        <div
                          className={`text-xl font-bold text-${item.color}-600`}
                        >
                          {item.count}
                        </div>
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
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(85px,1fr))] gap-2">
                    {[
                      {
                        label: "Contratadas",
                        count: soW.tasks.contracted,
                        status: "contracted",
                        color: "purple",
                      },
                      {
                        label: "Em execução",
                        count: soW.tasks.inProgress,
                        status: "inprogress",
                        color: "blue",
                      },
                      {
                        label: "Concluídas",
                        count: soW.tasks.completed,
                        status: "completed",
                        color: "green",
                      },
                      {
                        label: "Arquivadas",
                        count: soW.tasks.archived,
                        status: "archived",
                        color: "gray",
                      },
                    ].map((item) => (
                      <button
                        key={item.status}
                        onClick={() => {
                          window.location.href = `/admin/tasks?status=${item.status}`;
                        }}
                        className="p-2.5 rounded-lg border bg-card hover:bg-accent hover:shadow-md transition-all duration-200 text-left group"
                      >
                        <div className="text-[10px] leading-tight text-muted-foreground mb-1 group-hover:text-foreground transition-colors line-clamp-2">
                          {item.label}
                        </div>
                        <div
                          className={`text-xl font-bold text-${item.color}-600`}
                        >
                          {item.count}
                        </div>
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
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-2">
                    {[
                      {
                        label: "Novos",
                        count: soW.leads.new,
                        status: "new",
                        color: "cyan",
                      },
                      {
                        label: "Em contato",
                        count: soW.leads.contacted,
                        status: "contacted",
                        color: "blue",
                      },
                      {
                        label: "Proposta enviada",
                        count: soW.leads.proposal,
                        status: "proposal",
                        color: "purple",
                      },
                      {
                        label: "Fechado",
                        count: soW.leads.won,
                        status: "won",
                        color: "green",
                      },
                      {
                        label: "Perdido",
                        count: soW.leads.lost,
                        status: "lost",
                        color: "red",
                      },
                    ].map((item) => (
                      <button
                        key={item.status}
                        onClick={() => {
                          window.location.href = `/admin/leads?status=${item.status}`;
                        }}
                        className="p-2.5 rounded-lg border bg-card hover:bg-accent hover:shadow-md transition-all duration-200 text-left group"
                      >
                        <div className="text-[10px] leading-tight text-muted-foreground mb-1 group-hover:text-foreground transition-colors line-clamp-2">
                          {item.label}
                        </div>
                        <div
                          className={`text-xl font-bold text-${item.color}-600`}
                        >
                          {item.count}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

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
                    {isCustomizeMode && (
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                    )}
                    <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <CardTitle className="text-lg font-semibold">
                      {getWidgetTitle(widget.type)}
                    </CardTitle>
                  </div>
                  <WidgetPeriodSelector widgetId={widget.id} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Total a Receber */}
                <div className="p-4 rounded-lg bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      Total a Receber
                    </span>
                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                      +{arW.growth}%
                    </Badge>
                  </div>
                  <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                    R$ {arW.total.toLocaleString('pt-BR')},00
                  </div>
                </div>

                {/* Breakdown por categoria */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground">
                    Composição por Tipo
                  </h3>

                  {/* Planos de Crédito */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-950/30 transition-colors">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                        Planos de Crédito
                      </span>
                    </div>
                    <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
                      R$ {arW.creditPlans.toLocaleString('pt-BR')},00
                    </span>
                  </div>

                  {/* Pós-pagos */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-950/30 transition-colors">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                        Pós-pagos
                      </span>
                    </div>
                    <span className="text-sm font-bold text-purple-700 dark:text-purple-300">
                      R$ {arW.postPaid.toLocaleString('pt-BR')},00
                    </span>
                  </div>

                  {/* Outros Contratos */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-950/30 transition-colors">
                    <div className="flex items-center gap-2">
                      <FileDown className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                        Outros Contratos
                      </span>
                    </div>
                    <span className="text-sm font-bold text-amber-700 dark:text-amber-300">
                      R$ {arW.others.toLocaleString('pt-BR')},00
                    </span>
                  </div>
                </div>

                {/* Total Recebido no Período */}
                <div className="pt-3 border-t border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
                    <span className="text-sm font-medium text-muted-foreground">
                      Recebido no período
                    </span>
                    <span className="text-sm font-bold text-green-600 dark:text-green-400">
                      R$ {arW.received.toLocaleString('pt-BR')},00
                    </span>
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
        );

      case "tasks":
        return (
          <Card className="overflow-hidden">
            <CardHeader className="pb-2 border-b bg-gradient-to-r from-success/10 to-chart-3/10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success/20 rounded-lg shrink-0">
                  <CheckSquare className="h-5 w-5 text-success" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-base">Tarefas (Resumo)</CardTitle>
                  <p className="text-xs text-muted-foreground truncate">
                    Executadas, em execução e contratadas
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {[
                {
                  label: "Concluídas",
                  value: tasksW.completed,
                  change: tasksW.completedGrowth,
                  color: "text-success",
                },
                {
                  label: "Em Execução",
                  value: tasksW.inProgress,
                  change: tasksW.inProgressGrowth,
                  color: "text-info",
                },
                {
                  label: "Contratadas",
                  value: tasksW.contracted,
                  change: tasksW.contractedGrowth,
                  color: "text-warning",
                },
                {
                  label: "Canceladas",
                  value: tasksW.cancelled,
                  change: tasksW.cancelledChange,
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
                      {item.value.toLocaleString()}
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
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    SLA — dentro do prazo
                  </p>
                  <span className="text-sm font-bold text-success">{tasksW.slaCompliance.toFixed(1).replace('.', ',')}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case "nomadsIndicators":
        return (
          <Card className="overflow-hidden">
            <CardHeader className="pb-2 border-b bg-gradient-to-r from-chart-4/10 to-chart-3/10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-chart-4/20 rounded-lg shrink-0">
                  <Users className="h-5 w-5 text-chart-4" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-base">
                    Indicadores dos Nômades
                  </CardTitle>
                  <p className="text-xs text-muted-foreground truncate">
                    KPIs de desempenho e qualidade
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {[
                {
                  label: "Taxa de Entrega",
                  value: `${niW.deliveryRate.toFixed(1).replace('.', ',')}%`,
                  icon: CheckSquare,
                  color: "text-success",
                },
                {
                  label: "Avaliação Média",
                  value: `${niW.avgRating.toFixed(1).replace('.', ',')} ★`,
                  icon: Star,
                  color: "text-warning",
                },
                {
                  label: "Tempo Médio / Tarefa",
                  value: `${niW.avgTimePerTask.toFixed(1).replace('.', ',')} dias`,
                  icon: Clock,
                  color: "text-info",
                },
                {
                  label: "Nômades Certificados",
                  value: `${niW.certified}%`,
                  icon: Award,
                  color: "text-chart-4",
                },
                {
                  label: "Retenção 90 dias",
                  value: `${niW.retention90d}%`,
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

      case "activeUsers":
        return (
          <Card className="overflow-hidden">
            <CardHeader className="pb-2 border-b bg-gradient-to-r from-success/10 to-info/10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success/20 rounded-lg shrink-0">
                  <UserCheck className="h-5 w-5 text-success" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-base">Usuários Ativos</CardTitle>
                  <p className="text-xs text-muted-foreground truncate">
                    Ativos por tipo de conta no período
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {[
                {
                  type: "Empresas",
                  count: auW.empresas,
                  growth: `+${auW.empresasGrowth}%`,
                  color: "text-info",
                },
                {
                  type: "Agências",
                  count: auW.agencias,
                  growth: `+${auW.agenciasGrowth}%`,
                  color: "text-success",
                },
                {
                  type: "Nômades",
                  count: auW.nomades,
                  growth: `+${auW.nomadesGrowth}%`,
                  color: "text-chart-4",
                },
                {
                  type: "Admins",
                  count: auW.admins,
                  growth: `+${auW.adminsGrowth}%`,
                  color: "text-warning",
                },
              ].map((item) => (
                <div
                  key={item.type}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <span className="text-sm font-medium text-muted-foreground">
                    {item.type}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-lg font-bold ${item.color}`}>
                      {item.count.toLocaleString()}
                    </span>
                    <span className="text-xs font-medium text-success">
                      {item.growth}
                    </span>
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Total ativo hoje
                </p>
                <p className="text-sm font-bold">{auW.total.toLocaleString('pt-BR')}</p>
              </div>
            </CardContent>
          </Card>
        );

      case "partnerProgram":
        return (
          <Card className="overflow-hidden">
            <CardHeader className="pb-2 border-b bg-linear-to-r from-amber-500/10 to-yellow-400/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/20 rounded-lg shrink-0">
                    <Award className="h-5 w-5 text-amber-500" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-base">
                      Programa Partner
                    </CardTitle>
                    <p className="text-xs text-muted-foreground truncate">
                      Convites e partners ativos por nível
                    </p>
                  </div>
                </div>
                <Link
                  to="/admin/programa-partner"
                  className="text-xs text-primary hover:underline shrink-0 flex items-center gap-1"
                >
                  Gerenciar
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {/* Invite stats row */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    label: "Convites Enviados",
                    value: ppW.invitesSent,
                    color: "text-foreground",
                  },
                  { label: "Pendentes", value: ppW.pending, color: "text-warning" },
                  { label: "Aceitos", value: ppW.accepted, color: "text-success" },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="flex flex-col items-center p-2 rounded-lg bg-muted/50 text-center"
                  >
                    <span className={`text-xl font-bold ${stat.color}`}>
                      {stat.value}
                    </span>
                    <span className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                      {stat.label}
                    </span>
                  </div>
                ))}
              </div>
              {/* Active partners by level */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                  Partners Ativos por Nível
                </p>
                <div className="space-y-1.5">
                  {[
                    {
                      level: "Diamond",
                      count: ppW.diamond,
                      total: Math.max(ppW.diamond, 1),
                      color: "bg-sky-500",
                    },
                    {
                      level: "Platinum",
                      count: ppW.platinum,
                      total: Math.max(ppW.platinum, 1),
                      color: "bg-violet-500",
                    },
                    {
                      level: "Gold",
                      count: ppW.gold,
                      total: Math.max(ppW.gold, 1),
                      color: "bg-yellow-500",
                    },
                    {
                      level: "Silver",
                      count: ppW.silver,
                      total: Math.max(ppW.silver, 1),
                      color: "bg-slate-400",
                    },
                    {
                      level: "Bronze",
                      count: ppW.bronze,
                      total: Math.max(ppW.bronze, 1),
                      color: "bg-orange-500",
                    },
                  ].map((item) => (
                    <div key={item.level} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-16 shrink-0">
                        {item.level}
                      </span>
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${item.color}`}
                          style={{
                            width:
                              item.total > 0
                                ? `${(item.count / item.total) * 100}%`
                                : "0%",
                          }}
                        />
                      </div>
                      <span className="text-xs font-medium w-3 shrink-0 text-right">
                        {item.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              {/* MRR from partners */}
              <div className="pt-2 border-t flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  MRR gerado por Partners
                </p>
                <span className="text-sm font-bold text-success">
                  R$ {ppW.mrrGenerated.toLocaleString('pt-BR')}
                </span>
              </div>
            </CardContent>
          </Card>
        );

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
    localStorage.setItem("empresa-saved-dashboards", JSON.stringify(updatedDashboards));
    localStorage.setItem("empresa-current-dashboard-id", newDashboard.id);

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
    localStorage.setItem("empresa-saved-dashboards", JSON.stringify(updatedDashboards));

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
        "empresa-dashboard-widget-config",
        JSON.stringify(dashboard.widgets),
      );
      localStorage.setItem("empresa-current-dashboard-id", dashboardId);
    }
  };

  const handleDeleteDashboard = (dashboardId: string) => {
    const updatedDashboards = savedDashboards.filter(
      (d) => d.id !== dashboardId,
    );
    setSavedDashboards(updatedDashboards);
    localStorage.setItem("empresa-saved-dashboards", JSON.stringify(updatedDashboards));
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
    localStorage.setItem("empresa-saved-dashboards", JSON.stringify(updatedDashboards));
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
    return (
      <div className="container mx-auto space-y-4 px-0 py-0">
        <PageLoadingSkeleton
          statCards={4}
          tableRows={6}
          tableColumns={5}
          showTable={false}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-4 px-0 py-0">
      {/* Dashboard Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Painel Administrativo
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Visão geral da plataforma em tempo real
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Dashboard selector dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 gap-1.5 text-xs font-medium max-w-52 border-violet-200 dark:border-violet-600 hover:border-violet-400 dark:hover:border-violet-300 dark:hover:bg-violet-950/40"
              >
                <LayoutGrid className="h-3.5 w-3.5 shrink-0 text-violet-500" />
                <span className="truncate">
                  {savedDashboards.find((d) => d.id === currentDashboardId)
                    ?.name ?? "Selecionar dashboard"}
                </span>
                <ChevronDown className="h-3 w-3 shrink-0 opacity-50 ml-auto" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel className="text-xs text-muted-foreground pb-1">
                Dashboards salvos
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {savedDashboards.map((db) => (
                <div
                  key={db.id}
                  className="flex items-center px-1 py-0.5 rounded hover:bg-muted/60 group"
                >
                  <button
                    className="flex items-center gap-2 flex-1 text-left px-2 py-1.5 rounded text-xs"
                    onClick={() => {
                      handleLoadDashboard(db.id);
                      toast({
                        title: `Dashboard carregado`,
                        description: db.name,
                      });
                    }}
                  >
                    <LayoutGrid
                      className={cn(
                        "h-3.5 w-3.5 shrink-0",
                        currentDashboardId === db.id
                          ? "text-violet-500"
                          : "text-muted-foreground",
                      )}
                    />
                    <span
                      className={cn(
                        "truncate font-medium",
                        currentDashboardId === db.id &&
                          "text-violet-600 dark:text-violet-400",
                      )}
                    >
                      {db.name}
                    </span>
                    {currentDashboardId === db.id && (
                      <Check className="h-3 w-3 text-violet-500 shrink-0 ml-auto" />
                    )}
                  </button>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity pr-1">
                    <button
                      onClick={() => handleSetDefaultDashboard(db.id)}
                      className="p-1 rounded hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                      title={
                        db.isDefault
                          ? "Dashboard padrão"
                          : "Definir como padrão"
                      }
                    >
                      <Star
                        className={cn(
                          "h-3.5 w-3.5",
                          db.isDefault
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground hover:text-amber-400",
                        )}
                      />
                    </button>
                    <button
                      onClick={() => {
                        setDeletingDashboardId(db.id);
                        setShowDeleteDashboardDialog(true);
                      }}
                      className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      title="Excluir dashboard"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
              {savedDashboards.length === 0 && (
                <p className="px-3 py-3 text-xs text-muted-foreground text-center">
                  Nenhum dashboard salvo
                </p>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => {
                  setDraftWidgets([]);
                  setEditHeaderName("");
                  setIsEditingHeaderName(true);
                  setEditModalMode("adicionar");
                  setIsNewDashboardMode(true);
                  setIsEditDashboardModalOpen(true);
                }}
                className="text-xs text-violet-600 dark:text-violet-400 font-medium cursor-pointer gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Criar novo dashboard
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Export dropdown */}
          <Popover open={showExportMenu} onOpenChange={setShowExportMenu}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 gap-1.5 text-xs font-medium border-violet-200 dark:border-violet-600 hover:border-violet-400 dark:hover:border-violet-300 dark:hover:bg-violet-950/40"
                disabled={isExporting}
              >
                {isExporting ? (
                  <>
                    <Download className="h-3.5 w-3.5 animate-pulse" />
                    Exportando...
                  </>
                ) : (
                  <>
                    <Download className="h-3.5 w-3.5" />
                    Exportar
                    <ChevronDown className="h-2.5 w-2.5" />
                  </>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-1.5" align="end">
              <button
                onClick={() => {
                  setShowExportMenu(false);
                  handleExportAs("pdf");
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg hover:bg-accent transition-all text-left"
              >
                <FileText className="h-3.5 w-3.5 text-red-500" />
                Exportar como PDF
              </button>
              <button
                onClick={() => {
                  setShowExportMenu(false);
                  handleExportAs("png");
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg hover:bg-accent transition-all text-left"
              >
                <ImageDown className="h-3.5 w-3.5 text-blue-500" />
                Exportar como PNG
              </button>
            </PopoverContent>
          </Popover>

          {/* Editar Dashboard */}
          <Button
            onClick={() => {
              setDraftWidgets([...widgets].sort((a, b) => a.order - b.order));
              const currentDb = savedDashboards.find(
                (d) => d.id === currentDashboardId,
              );
              setEditHeaderName(currentDb?.name ?? "Dashboard Padrão");
              setIsEditingHeaderName(false);
              setIsEditDashboardModalOpen(true);
            }}
            className="h-8 px-3 gap-1.5 text-xs font-medium btn-brand shadow-sm rounded-lg"
          >
            <Edit2 className="h-3.5 w-3.5" />
            Editar
          </Button>
        </div>
      </div>

      {/* Compact Controls Bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Period selector */}
        <div className="flex items-center gap-0.5 bg-muted/60 rounded-xl p-1 border border-border/40">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground ml-1.5 mr-0.5" />
          {(
            [
              {
                type: "last_7_days" as const,
                label: "7d",
                fullLabel: "Últimos 7 dias",
              },
              {
                type: "last_30_days" as const,
                label: "30d",
                fullLabel: "Últimos 30 dias",
              },
            ] as const
          ).map(({ type, label, fullLabel }) => (
            <button
              key={type}
              onClick={() => {
                const { from, to } = getDateRangeFromPeriod(type);
                setGlobalPeriod({ type, from, to, label: fullLabel });
              }}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
                globalPeriod.type === type
                  ? "bg-background shadow-sm text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => {
              const today = new Date();
              const ninetyDaysAgo = new Date(today);
              ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
              setGlobalPeriod({
                type: "custom",
                from: ninetyDaysAgo,
                to: today,
                label: "Últimos 90 dias",
              });
            }}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
              globalPeriod.label === "Últimos 90 dias"
                ? "bg-background shadow-sm text-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            90d
          </button>
          <Popover
            open={isPeriodPickerOpen}
            onOpenChange={setIsPeriodPickerOpen}
          >
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5",
                  !["last_7_days", "last_30_days"].includes(
                    globalPeriod.type,
                  ) && globalPeriod.label !== "Últimos 90 dias"
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {!["last_7_days", "last_30_days"].includes(globalPeriod.type) &&
                globalPeriod.label !== "Últimos 90 dias" ? (
                  <span className="max-w-[130px] truncate">
                    {globalPeriod.label}
                  </span>
                ) : (
                  <>
                    <SlidersHorizontal className="h-3 w-3" />
                    Personalizar
                  </>
                )}
                <ChevronDown className="h-2.5 w-2.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0 overflow-hidden" align="start">
              <div className="px-3 py-2.5 border-b bg-muted/30">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Período de dados
                </p>
              </div>
              <div className="p-1.5">
                {periodOptions
                  .filter((o) => o.type !== "custom")
                  .map((option) => (
                    <button
                      key={option.type}
                      onClick={() =>
                        handlePeriodChange(option.type, option.label)
                      }
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-all hover:bg-accent text-left",
                        globalPeriod.type === option.type &&
                          globalPeriod.label !== "Últimos 90 dias" &&
                          "bg-primary/10 text-primary font-medium",
                      )}
                    >
                      {option.label}
                      {globalPeriod.type === option.type &&
                        globalPeriod.label !== "Últimos 90 dias" && (
                          <Check className="h-3.5 w-3.5 flex-shrink-0" />
                        )}
                    </button>
                  ))}
              </div>
              <div className="border-t p-3 space-y-2.5 bg-muted/20">
                <p className="text-xs font-semibold">Intervalo personalizado</p>
                <div className="flex gap-2">
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] text-muted-foreground font-medium">
                      De
                    </label>
                    <input
                      type="date"
                      value={
                        customPeriodFrom
                          ? format(customPeriodFrom, "yyyy-MM-dd")
                          : ""
                      }
                      onChange={(e) =>
                        setCustomPeriodFrom(
                          e.target.value
                            ? new Date(e.target.value + "T00:00:00")
                            : undefined,
                        )
                      }
                      className="w-full h-7 px-2 text-xs border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] text-muted-foreground font-medium">
                      Até
                    </label>
                    <input
                      type="date"
                      value={
                        customPeriodTo
                          ? format(customPeriodTo, "yyyy-MM-dd")
                          : ""
                      }
                      onChange={(e) =>
                        setCustomPeriodTo(
                          e.target.value
                            ? new Date(e.target.value + "T00:00:00")
                            : undefined,
                        )
                      }
                      className="w-full h-7 px-2 text-xs border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
                <Button
                  size="sm"
                  className="w-full h-7 text-xs"
                  disabled={!customPeriodFrom || !customPeriodTo}
                  onClick={applyCustomPeriod}
                >
                  Aplicar período
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Period label badge */}
        <span className="text-xs text-muted-foreground hidden sm:inline-flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-primary/60 inline-block" />
          {globalPeriod.label}
        </span>

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
          const availableWidgets = widgetLibrary.filter(
            (lib) => !draftWidgets.some((dw) => dw.type === lib.id),
          );
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
                    <div className="grid grid-cols-3 gap-3">
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
    </div>
    // </CHANGE>
  );
}

