// @ts-nocheck
import type React from "react";

import { useState, useEffect, useMemo } from "react";
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
const generateDashboardData = (from?: Date, to?: Date): any => {
  const now = new Date();
  const f = from ?? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
  const t = to ?? now;
  const days = Math.max(1, Math.round((t.getTime() - f.getTime()) / 86400000));
  const m = days / 30; // multiplier relative to 30-day base
  const sc = (base: number) => Math.round(base * m); // scale financial/count
  const scSoft = (base: number) => Math.round(base * (0.5 + m * 0.5)); // softer scale for counts
  return ({
  revenue: {
    total: sc(270800),
    growth: 18.1,
    totalGrowth: 18.1,
    series: [],
    trendData: [180000, 205000, 215000, 230000, 248000, sc(270800)].map(v => Math.round(v * m / 1)),
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
    trendData: [72000, 78000, 82000, 86000, 91000, 97600].map(v => sc(v)),
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
    trendData: [420, 510, 480, 630, 590, 710, 680].map(v => sc(v)),
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
    trendData: [95, 100, 104, 108, 110, 112].map(v => scSoft(v)),
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
    { id: "1", name: "Digital Works",  avatar: "DW", rating: 4.9, projects: 23, contribution: "R$ 48k", specialty: "Dev & Design",    color: "from-blue-500 to-indigo-600" },
    { id: "2", name: "Criativa Lab",   avatar: "CL", rating: 4.8, projects: 18, contribution: "R$ 37k", specialty: "Branding",         color: "from-pink-500 to-rose-600" },
    { id: "3", name: "Inovax Agency",  avatar: "IA", rating: 4.7, projects: 15, contribution: "R$ 31k", specialty: "Marketing 360",    color: "from-violet-500 to-purple-600" },
    { id: "4", name: "PixelForge",     avatar: "PF", rating: 4.6, projects: 12, contribution: "R$ 24k", specialty: "UX/UI",            color: "from-cyan-500 to-teal-600" },
    { id: "5", name: "BluePrint Co.",  avatar: "BP", rating: 4.5, projects: 10, contribution: "R$ 19k", specialty: "Arquitetura",      color: "from-amber-500 to-orange-600" },
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
    tasks: { contracted: scSoft(83), inProgress: scSoft(57), completed: sc(412), archived: sc(34) },
    leads: { new: scSoft(29), contacted: scSoft(15), proposal: scSoft(8), won: sc(12), lost: sc(5) },
  },
  metrics: {},
  activity: [],
  alerts: [],
  performers: [
    { id: "1", name: "Carlos Mendonça",  avatar: "CM", rating: 4.9, projects: sc(34),   badge: "gold",   tasks: sc(128), revenue: `R$ ${sc(52)}k`, specialty: "Dev Full Stack" },
    { id: "2", name: "Ana Beatriz Lima",  avatar: "AB", rating: 4.8, projects: sc(29),   badge: "gold",   tasks: sc(115), revenue: `R$ ${sc(44)}k`, specialty: "UI/UX Design" },
    { id: "3", name: "Rafael Torres",     avatar: "RT", rating: 4.7, projects: sc(26),   badge: "gold",   tasks: sc(98),  revenue: `R$ ${sc(39)}k`, specialty: "Marketing Digital" },
    { id: "4", name: "Juliana Ferreira",  avatar: "JF", rating: 4.6, projects: sc(22),   badge: "silver", tasks: sc(84),  revenue: `R$ ${sc(31)}k`, specialty: "Copywriting" },
    { id: "5", name: "Marcos Oliveira",   avatar: "MO", rating: 4.6, projects: sc(21),   badge: "silver", tasks: sc(79),  revenue: `R$ ${sc(28)}k`, specialty: "Dev Backend" },
    { id: "6", name: "Priscila Santos",   avatar: "PS", rating: 4.5, projects: sc(19),   badge: "silver", tasks: sc(71),  revenue: `R$ ${sc(24)}k`, specialty: "SEO" },
    { id: "7", name: "Diego Cavalcante",  avatar: "DC", rating: 4.4, projects: sc(17),   badge: "bronze", tasks: sc(63),  revenue: `R$ ${sc(19)}k`, specialty: "Tráfego Pago" },
    { id: "8", name: "Fernanda Costa",    avatar: "FC", rating: 4.3, projects: sc(15),   badge: "bronze", tasks: sc(57),  revenue: `R$ ${sc(16)}k`, specialty: "Social Media" },
  ],
  userDistribution: [],
  systemAlerts: [],
  adminProfiles: [],
  permissionMatrix: [],
  managementTools: [],
});
};
import { Switch } from "@/components/ui/switch"; // Added Switch
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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

// ─── Historical (manual) data system ────────────────────────────────────────
type ManualDataEntry = {
  // Financeiro
  revenue_total?: number;
  mrr_total?: number;
  creditPlans_total?: number;
  accountsReceivable_total?: number;
  cmv_totalCosts?: number;
  // Projetos & Tarefas
  activeProjects_total?: number;
  tasks_total?: number;
  tasks_completed?: number;
  tasks_inProgress?: number;
  tasks_slaCompliance?: number;
  // Nômades & Parceiros
  nomads_total?: number;
  nomads_active?: number;
  partnerProgram_total?: number;
  partnerProgram_invitesSent?: number;
  partnerProgram_mrrGenerated?: number;
  // Churn, Ticket & LTV
  churn_revenueChurnRate?: number;
  churn_revenueChurn?: number;
  averageTicket_general?: number;
  ltv_value?: number;
};

const MANUAL_WIDGET_MAP: Record<keyof ManualDataEntry, string> = {
  revenue_total: "revenue",
  mrr_total: "mrr",
  creditPlans_total: "creditPlans",
  accountsReceivable_total: "accountsReceivable",
  cmv_totalCosts: "cmv",
  activeProjects_total: "activeProjectsWidget",
  tasks_total: "tasks",
  tasks_completed: "tasks",
  tasks_inProgress: "tasks",
  tasks_slaCompliance: "tasks",
  nomads_total: "nomads",
  nomads_active: "nomads",
  partnerProgram_total: "partnerProgram",
  partnerProgram_invitesSent: "partnerProgram",
  partnerProgram_mrrGenerated: "partnerProgram",
  churn_revenueChurnRate: "churn",
  churn_revenueChurn: "churn",
  averageTicket_general: "averageTicket",
  ltv_value: "ltv",
};

const mergeManualData = (base: any, entry: ManualDataEntry): any => {
  const m = { ...base };
  if (entry.revenue_total != null) m.revenue = { ...m.revenue, total: entry.revenue_total };
  if (entry.mrr_total != null) m.mrr = { ...m.mrr, total: entry.mrr_total };
  if (entry.creditPlans_total != null) m.creditPlans = { ...m.creditPlans, total: entry.creditPlans_total };
  if (entry.accountsReceivable_total != null) m.accountsReceivable = { ...m.accountsReceivable, total: entry.accountsReceivable_total };
  if (entry.cmv_totalCosts != null) m.cmv = { ...m.cmv, totalCosts: entry.cmv_totalCosts };
  if (entry.activeProjects_total != null) m.activeProjects = { ...m.activeProjects, total: entry.activeProjects_total };
  const tasksOverride: any = {};
  if (entry.tasks_total != null) tasksOverride.total = entry.tasks_total;
  if (entry.tasks_completed != null) tasksOverride.completed = entry.tasks_completed;
  if (entry.tasks_inProgress != null) tasksOverride.inProgress = entry.tasks_inProgress;
  if (entry.tasks_slaCompliance != null) tasksOverride.slaCompliance = entry.tasks_slaCompliance;
  if (Object.keys(tasksOverride).length) m.tasks = { ...m.tasks, ...tasksOverride };
  if (entry.nomads_total != null) m.nomads = { ...m.nomads, total: entry.nomads_total };
  if (entry.nomads_active != null) m.nomads = { ...m.nomads, active: entry.nomads_active };
  const ppOverride: any = {};
  if (entry.partnerProgram_total != null) ppOverride.total = entry.partnerProgram_total;
  if (entry.partnerProgram_invitesSent != null) ppOverride.invitesSent = entry.partnerProgram_invitesSent;
  if (entry.partnerProgram_mrrGenerated != null) ppOverride.mrrGenerated = entry.partnerProgram_mrrGenerated;
  if (Object.keys(ppOverride).length) m.partnerProgram = { ...m.partnerProgram, ...ppOverride };
  if (entry.churn_revenueChurnRate != null) m.churn = { ...m.churn, revenueChurnRate: entry.churn_revenueChurnRate };
  if (entry.churn_revenueChurn != null) m.churn = { ...m.churn, revenueChurn: entry.churn_revenueChurn };
  if (entry.averageTicket_general != null) m.averageTicket = { ...m.averageTicket, general: entry.averageTicket_general };
  if (entry.ltv_value != null) m.ltv = { ...m.ltv, value: entry.ltv_value };
  return m;
};
// ─────────────────────────────────────────────────────────────────────────────

// ─── Share system ──────────────────────────────────────────────────────────────
type ShareConfig = {
  target: { id: string; title: string; type: "widget" | "dashboard" };
  permission: "view" | "comment";
  pin?: string;
  expiry?: Date;
};

const generatePublicToken = (config: ShareConfig): string => {
  const payload = {
    target: config.target,
    permission: config.permission,
    pin: config.pin ?? null,
    expiry: config.expiry ? config.expiry.toISOString() : null,
    issued: new Date().toISOString(),
  };
  return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
};
// ───────────────────────────────────────────────────────────────────────────────

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
  const [historicalData, setHistoricalData] = useState<Record<string, ManualDataEntry>>(() => {
    try {
      const saved = localStorage.getItem("dashboard_historical_data");
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
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
    if (from.getFullYear() === to.getFullYear() && from.getMonth() === to.getMonth()) {
      const key = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, "0")}`;
      const entry = historicalData[key];
      if (entry) return mergeManualData(base, entry);
    }
    return base;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalPeriod.type, globalPeriod.from, globalPeriod.to, historicalData]);

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
  const [isHeaderCompact, setIsHeaderCompact] = useState(false);
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
        "Hoje": "today",
        "Últimos 7 dias": "7days",
        "Últimos 30 dias": "30days",
        "Este mês": "thisMonth",
        "Mês passado": "lastMonth",
        "Últimos 90 dias": "90days",
        "Último ano": "365days",
      };
      const periodKey = override.customPeriod.periodKey ?? labelToKey[override.customPeriod.label];
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
      toast({ title: "Erro ao exportar", description: "Widget não encontrado", variant: "destructive" });
      return;
    }
    try {
      const exportButtons = widgetElement.querySelectorAll("[data-export-button],[data-share-button]");
      exportButtons.forEach((btn) => { (btn as HTMLElement).style.display = "none"; });

      const dataUrl = await toPng(widgetElement, { quality: 1, pixelRatio: 2, backgroundColor: "#f1f5f9", cacheBust: true });

      exportButtons.forEach((btn) => { (btn as HTMLElement).style.display = ""; });

      const img = new Image();
      img.src = dataUrl;
      await new Promise((res) => { img.onload = res; });

      const ratio = img.height / img.width;
      const pdfW = 210; // A4 mm
      const pdfH = Math.min(pdfW * ratio, 297);
      const pdf = new jsPDF({ orientation: pdfH > pdfW ? "portrait" : "landscape", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW - 16;
      const imgH = imgW * ratio;
      pdf.addImage(dataUrl, "PNG", 8, 8, imgW, Math.min(imgH, pageH - 16));

      const dateStr = format(new Date(), "yyyy-MM-dd-HHmm");
      const sanitizedTitle = widgetTitle.replace(/[^a-zA-Z0-9]/g, "_");
      pdf.save(`widget_${sanitizedTitle}_${dateStr}.pdf`);

      toast({ title: "Widget exportado", description: `O widget "${widgetTitle}" foi exportado como PDF` });
    } catch (error) {
      console.error("Error exporting widget to PDF:", error);
      toast({ title: "Erro ao exportar", description: "Não foi possível exportar como PDF", variant: "destructive" });
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
          onClick={() => setShowExportDropdown(showExportDropdown === widgetId ? null : widgetId)}
          className="flex items-center justify-center h-7 w-7 cursor-pointer text-muted-foreground hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/40 active:scale-90 transition-all duration-150 rounded-r-lg"
          title="Exportar widget"
          data-export-button
        >
          <Download className="h-3.5 w-3.5" />
        </button>
        {showExportDropdown === widgetId && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowExportDropdown(null)} />
            <div className="absolute right-0 top-full mt-1 z-50 min-w-[120px] rounded-lg border border-border/60 bg-background shadow-lg overflow-hidden">
              <button
                onClick={() => { exportWidgetToPng(widgetId, widgetTitle); setShowExportDropdown(null); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs cursor-pointer hover:bg-violet-100 dark:hover:bg-violet-900/40 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
              >
                <ImageDown className="h-3.5 w-3.5 text-muted-foreground" />
                Exportar PNG
              </button>
              <div className="h-px bg-border/50" />
              <button
                onClick={() => { exportWidgetToPdf(widgetId, widgetTitle); setShowExportDropdown(null); }}
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

  // ── Public share dialog state ──────────────────────────────────────────────
  const [showPublicShareDialog, setShowPublicShareDialog] = useState(false);
  const [shareTarget, setShareTarget] = useState<ShareConfig["target"] | null>(null);
  const [sharePermission, setSharePermission] = useState<"view" | "comment">("view");
  const [sharePinEnabled, setSharePinEnabled] = useState(false);
  const [sharePin, setSharePin] = useState("");
  const [shareExpiryEnabled, setShareExpiryEnabled] = useState(false);
  const [shareExpiry, setShareExpiry] = useState("");
  const [generatedShareLink, setGeneratedShareLink] = useState("");
  const [shareActiveTab, setShareActiveTab] = useState("permission");
  // ──────────────────────────────────────────────────────────────────────────

  // ── Historical modal states ──────────────────────────────────────────────────
  const [showExportDropdown, setShowExportDropdown] = useState<string | null>(null);
  const [detailsWidgetId, setDetailsWidgetId] = useState<string | null>(null);
  const [showHistoricalModal, setShowHistoricalModal] = useState(false);
  const [histModalKey, setHistModalKey] = useState<string>(""); // "YYYY-MM"
  const [histFormData, setHistFormData] = useState<Partial<ManualDataEntry>>({});
  const setHistField = (key: keyof ManualDataEntry, value: string) => {
    const num = value === "" ? undefined : Number(value);
    setHistFormData((prev) => ({ ...prev, [key]: num }));
  };

  // Active manual entry for current period
  const activeManualKey = useMemo(() => {
    const { from, to } = getDateRangeFromPeriod(
      globalPeriod.type, globalPeriod.from, globalPeriod.to,
    );
    if (from.getFullYear() === to.getFullYear() && from.getMonth() === to.getMonth()) {
      return `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, "0")}`;
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalPeriod.type, globalPeriod.from, globalPeriod.to]);

  const activeManualEntry = activeManualKey ? (historicalData[activeManualKey] ?? null) : null;

  const manualAffectedWidgets = useMemo<Set<string>>(() => {
    if (!activeManualEntry) return new Set();
    const s = new Set<string>();
    (Object.keys(activeManualEntry) as Array<keyof ManualDataEntry>).forEach((k) => {
      if (activeManualEntry[k] != null && MANUAL_WIDGET_MAP[k]) s.add(MANUAL_WIDGET_MAP[k]);
    });
    return s;
  }, [activeManualEntry]);

  // Historical handlers
  const MONTH_NAMES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

  const openHistoricalModal = (key?: string) => {
    const k = key ?? (() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    })();
    setHistModalKey(k);
    setHistFormData(historicalData[k] ?? {});
    setShowHistoricalModal(true);
  };

  const saveHistoricalEntry = () => {
    const updated = { ...historicalData, [histModalKey]: histFormData as ManualDataEntry };
    setHistoricalData(updated);
    localStorage.setItem("dashboard_historical_data", JSON.stringify(updated));
    setShowHistoricalModal(false);
    const [y, m] = histModalKey.split("-").map(Number);
    toast({ title: "Dados históricos salvos", description: `Dados de ${MONTH_NAMES[m - 1]}/${y} registrados com sucesso.` });
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
    setShowPublicShareDialog(true);
  };

  const handleGenerateShareLink = () => {
    if (!shareTarget) return;
    const config: ShareConfig = {
      target: shareTarget,
      permission: sharePermission,
      pin: sharePinEnabled && sharePin.length === 4 ? sharePin : undefined,
      expiry: shareExpiryEnabled && shareExpiry ? new Date(shareExpiry) : undefined,
    };
    const token = generatePublicToken(config);
    setGeneratedShareLink(`${window.location.origin}/dashboard/share/${token}`);
  };

  const handleCopyShareLink = () => {
    if (!generatedShareLink) return;
    navigator.clipboard.writeText(generatedShareLink);
    toast({ title: "Link copiado!", description: "O link foi copiado para a área de transferência." });
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
    localStorage.setItem("saved-dashboards", JSON.stringify(updatedDashboards));
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
        "saved-dashboards",
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
        "saved-dashboards",
        JSON.stringify(updatedDashboards),
      );
      localStorage.setItem("current-dashboard-id", newDashboard.id);
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
          "saved-dashboards",
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
    const savedConfig = localStorage.getItem("dashboard-widget-config");
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

    const savedMetrics = localStorage.getItem("dashboard-metric-cards");
    if (savedMetrics) {
      try {
        setMetricCards(JSON.parse(savedMetrics));
      } catch (e) {
        console.error("Failed to parse saved metric cards:", e);
      }
    }

    const savedSize = localStorage.getItem("dashboard-widget-size");
    if (savedSize) {
      setWidgetSize(savedSize as WidgetSize);
    }

    // Load widget period overrides from localStorage
    const savedWidgetPeriods = localStorage.getItem("dashboard-widget-periods");
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

    const savedDashboardsData = localStorage.getItem("saved-dashboards");
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
        "saved-dashboards",
        JSON.stringify(parsedDashboards),
      );
    }
    setSavedDashboards(parsedDashboards);
    const storedId = localStorage.getItem("current-dashboard-id");
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
    localStorage.setItem("dashboard-metric-cards", JSON.stringify(metricCards));
    localStorage.setItem("dashboard-widget-size", widgetSize);
    // Save widget period overrides to localStorage
    localStorage.setItem(
      "dashboard-widget-periods",
      JSON.stringify(widgetPeriods),
    );

    // Save dashboards to localStorage whenever they change
    localStorage.setItem("saved-dashboards", JSON.stringify(savedDashboards));
    localStorage.setItem("current-dashboard-id", currentDashboardId);
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

  useEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;
    const handleScroll = () => setIsHeaderCompact(main.scrollTop > 48);
    main.addEventListener("scroll", handleScroll, { passive: true });
    return () => main.removeEventListener("scroll", handleScroll);
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

  const getMetricsForPeriod = (periodTypeOverride?: string, widgetPeriodKey?: string) => {
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

  const renderMetricCard = (metricType: MetricType, metricsSource?: typeof metrics) => {
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
        borderClass =
          "border-2 border-emerald-300/70 dark:border-emerald-300/50";
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
    const mData = generateDashboardData(modalPeriod.from, modalPeriod.to);
    const mPaW = mData.platformActivities;
    const mArW = mData.accountsReceivable;

    const cfgMap: Record<string, { icon: React.ReactNode; subtitle: string }> = {
      metrics:              { icon: <LayoutGrid className="h-6 w-6" />,    subtitle: "Métricas principais da plataforma" },
      revenue:              { icon: <DollarSign className="h-6 w-6" />,    subtitle: "Receita total e breakdown" },
      platformActivities:   { icon: <Activity className="h-6 w-6" />,      subtitle: "Engajamento e atividades" },
      accountsReceivable:   { icon: <DollarSign className="h-6 w-6" />,    subtitle: "Contas a receber por categoria" },
      mrr:                  { icon: <TrendingUp className="h-6 w-6" />,    subtitle: "Receita recorrente mensal" },
      churn:                { icon: <TrendingDown className="h-6 w-6" />,  subtitle: "Análise de cancelamentos" },
      creditPlans:          { icon: <CreditCard className="h-6 w-6" />,    subtitle: "Planos de crédito ativos" },
      activeProjectsWidget: { icon: <Briefcase className="h-6 w-6" />,     subtitle: "Projetos ativos por tipo" },
      averageTicket:        { icon: <Calculator className="h-6 w-6" />,    subtitle: "Ticket médio por cliente" },
      ltv:                  { icon: <Star className="h-6 w-6" />,          subtitle: "Valor vitalício do cliente" },
      cmv:                  { icon: <Calculator className="h-6 w-6" />,    subtitle: "Custo de mercadoria vendida" },
      nomads:               { icon: <Users className="h-6 w-6" />,         subtitle: "Visão geral dos nômades" },
      nomadsRanking:        { icon: <Trophy className="h-6 w-6" />,        subtitle: "Ranking de performance" },
      agenciesRanking:      { icon: <Building2 className="h-6 w-6" />,     subtitle: "Ranking das agências da plataforma" },
      statusOverview:       { icon: <LayoutGrid className="h-6 w-6" />,    subtitle: "Status de projetos e tarefas" },
      tasks:                { icon: <CheckSquare className="h-6 w-6" />,   subtitle: "Tarefas e execução" },
      nomadsIndicators:     { icon: <Users className="h-6 w-6" />,         subtitle: "KPIs de desempenho e qualidade" },
      activity:             { icon: <Activity className="h-6 w-6" />,      subtitle: "Atividades recentes" },
      alerts:               { icon: <Bell className="h-6 w-6" />,          subtitle: "Alertas e notificações" },
      performers:           { icon: <Award className="h-6 w-6" />,         subtitle: "Top performers" },
      quickActions:         { icon: <Zap className="h-6 w-6" />,           subtitle: "Ações rápidas" },
    };
    const cfg = cfgMap[detailsWidgetId] ?? { icon: <Settings className="h-6 w-6" />, subtitle: "Detalhes do widget" };

    const renderContent = () => {
      switch (detailsWidgetId) {
        case "metrics": {
          const mp = getMetricsForPeriod(undefined, modalPeriodKey);
          const items: Array<{ key: string; label: string; value: string | number; change?: number; trend?: "up" | "down"; suffix?: string }> = [
            { key: "totalUsers",     label: "Total de Usuários", value: mp.totalUsers.value,     change: mp.totalUsers.change,     trend: mp.totalUsers.trend },
            { key: "activeUsers",    label: "Usuários Ativos",   value: mp.activeUsers.value,    change: mp.activeUsers.change,    trend: mp.activeUsers.trend },
            { key: "companies",      label: "Empresas",          value: mp.companies.value,      change: mp.companies.change,      trend: mp.companies.trend },
            { key: "activeProjects", label: "Projetos Ativos",   value: mp.activeProjects.value, change: mp.activeProjects.change, trend: mp.activeProjects.trend },
            { key: "revenue",        label: "Receita",           value: mp.revenue.value, change: mp.revenue.change, trend: mp.revenue.trend },
            { key: "avgRating",      label: "Avaliação Média",   value: Number(mp.avgRating.value).toFixed(1), change: mp.avgRating.change, trend: mp.avgRating.trend, suffix: " / 5.0" },
          ];
          return (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {items.map((it) => (
                  <div key={it.key} className="p-3 rounded-lg border border-border/50 bg-muted/20">
                    <p className="text-xs text-muted-foreground">{it.label}</p>
                    <p className="text-xl font-bold mt-0.5">
                      {typeof it.value === "number" ? it.value.toLocaleString("pt-BR") : it.value}
                      {it.suffix && <span className="text-xs font-normal text-muted-foreground">{it.suffix}</span>}
                    </p>
                    {it.change != null && (
                      <div className="flex items-center justify-between mt-1">
                        <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${it.trend === "up" ? "text-success" : "text-destructive"}`}>
                          {it.trend === "up" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {it.trend === "up" ? "+" : "-"}{Math.abs(it.change)}{it.key === "avgRating" ? " pts" : "%"}
                        </span>
                        <span className="text-[10px] text-muted-foreground">vs. anterior</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {mp.revenue.breakdown && (() => {
                const parseKVal = (s: string | number) => {
                  if (typeof s === "number") return s;
                  const cleaned = String(s).replace(/[R$\s]/g, "");
                  const num = parseFloat(cleaned);
                  return cleaned.toLowerCase().includes("k") ? num * 1000 : (isNaN(num) ? 0 : num);
                };
                const cpNum = parseKVal((mp.revenue.breakdown.creditPlan as any)?.value ?? mp.revenue.breakdown.creditPlan);
                const rcNum = parseKVal((mp.revenue.breakdown.recurring as any)?.value ?? mp.revenue.breakdown.recurring);
                const otNum = parseKVal((mp.revenue.breakdown.oneTime as any)?.value ?? mp.revenue.breakdown.oneTime);
                const total = cpNum + rcNum + otNum;
                const cpDisp = (mp.revenue.breakdown.creditPlan as any)?.value ?? `R$ ${cpNum.toLocaleString("pt-BR")}`;
                const rcDisp = (mp.revenue.breakdown.recurring as any)?.value ?? `R$ ${rcNum.toLocaleString("pt-BR")}`;
                const otDisp = (mp.revenue.breakdown.oneTime as any)?.value ?? `R$ ${otNum.toLocaleString("pt-BR")}`;
                return (
                  <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                    <p className="text-sm font-semibold mb-3">Composição da Receita</p>
                    {[
                      { label: "Planos de Crédito", display: cpDisp, numeric: cpNum, color: "bg-blue-500" },
                      { label: "Recorrente",        display: rcDisp, numeric: rcNum, color: "bg-purple-500" },
                      { label: "Avulso",            display: otDisp, numeric: otNum, color: "bg-amber-500" },
                    ].map((item) => {
                      const pct = total > 0 ? (item.numeric / total) * 100 : 0;
                      return (
                        <div key={item.label} className="mb-2 last:mb-0">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">{item.label}</span>
                            <span className="font-medium">{item.display}</span>
                          </div>
                          <div className="h-2 bg-secondary rounded-full overflow-hidden">
                            <div className={`h-2 ${item.color} rounded-full`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
              {mp.avgRating.breakdown && (
                <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                  <p className="text-sm font-semibold mb-3">Avaliação por Segmento</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    {[
                      { label: "Nômades",       value: Number((mp.avgRating.breakdown.nomades as any)?.value ?? mp.avgRating.breakdown.nomades) },
                      { label: "Agências",      value: Number((mp.avgRating.breakdown.agencies as any)?.value ?? mp.avgRating.breakdown.agencies) },
                      { label: "Lead Premium",  value: Number((mp.avgRating.breakdown.leadPremium as any)?.value ?? mp.avgRating.breakdown.leadPremium) },
                      { label: "Suporte",       value: Number((mp.avgRating.breakdown.support as any)?.value ?? mp.avgRating.breakdown.support) },
                      { label: "Projetos",      value: Number((mp.avgRating.breakdown.projects as any)?.value ?? mp.avgRating.breakdown.projects) },
                    ].map((s) => (
                      <div key={s.label} className="flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground truncate">{s.label}</span>
                        <div className="flex items-center gap-1.5">
                          <div className="h-1.5 w-16 bg-secondary rounded-full overflow-hidden">
                            <div className="h-1.5 bg-amber-500 rounded-full" style={{ width: `${(s.value / 5) * 100}%` }} />
                          </div>
                          <span className="text-xs font-semibold w-7 text-right">{s.value.toFixed(1)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        }

        case "revenue":
          return (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Total", value: `R$ ${rv.total.toLocaleString("pt-BR")}`, change: `+${rv.growth}%`, bg: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800", text: "text-emerald-700 dark:text-emerald-300" },
                  { label: "Planos de Crédito", value: `R$ ${rv.creditPlan.toLocaleString("pt-BR")}`, change: `+${rv.creditPlanGrowth}%`, bg: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800", text: "text-blue-700 dark:text-blue-300" },
                  { label: "Recorrente", value: `R$ ${rv.recurring.toLocaleString("pt-BR")}`, change: `+${rv.recurringGrowth}%`, bg: "bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800", text: "text-purple-700 dark:text-purple-300" },
                ].map(item => (
                  <div key={item.label} className={`p-3 rounded-lg border text-center ${item.bg}`}>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className={`text-base font-bold ${item.text}`}>{item.value}</p>
                    <p className="text-xs text-success">{item.change}</p>
                  </div>
                ))}
              </div>
              <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                <p className="text-sm font-semibold mb-3">Distribuição da Receita</p>
                {[
                  { label: "Planos de Crédito", value: rv.creditPlan, color: "bg-blue-500" },
                  { label: "Recorrente", value: rv.recurring, color: "bg-purple-500" },
                  { label: "Avulso", value: rv.oneTime, color: "bg-amber-500" },
                ].map(item => (
                  <div key={item.label} className="mb-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-medium">R$ {item.value.toLocaleString("pt-BR")}</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div className={`h-2 ${item.color} rounded-full`} style={{ width: `${(item.value / rv.total) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );

        case "platformActivities": {
          const engagementRate = mPaW.mau > 0 ? Math.round((mPaW.dau / mPaW.mau) * 100) : 0;
          const actionsPerSession = mPaW.sessions > 0 ? (mPaW.actionsExecuted / mPaW.sessions).toFixed(1) : "0";
          const activityTypes = [
            { label: "Mensagens", pct: 35, color: "bg-info" },
            { label: "Tarefas",   pct: 27, color: "bg-success" },
            { label: "Projetos",  pct: 19, color: "bg-chart-4" },
            { label: "Uploads",   pct: 12, color: "bg-warning" },
            { label: "Outros",    pct: 7,  color: "bg-muted-foreground" },
          ];
          const maxTrend = Math.max(1, ...mPaW.trendData);
          return (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "MAU",       value: mPaW.mau.toLocaleString("pt-BR") },
                  { label: "DAU",       value: mPaW.dau.toLocaleString("pt-BR") },
                  { label: "Agências",  value: mPaW.activeAgencies },
                  { label: "Sessões",   value: mPaW.sessions.toLocaleString("pt-BR") },
                  { label: "Ações",     value: mPaW.actionsExecuted.toLocaleString("pt-BR") },
                  { label: "Tempo méd.", value: `${mPaW.avgSessionMinutes} min` },
                ].map((k) => (
                  <div key={k.label} className="p-3 rounded-lg bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800">
                    <p className="text-[11px] text-muted-foreground">{k.label}</p>
                    <p className="text-base font-bold text-sky-700 dark:text-sky-300 mt-0.5">{k.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border/50 bg-muted/20">
                  <p className="text-xs text-muted-foreground">Taxa de Engajamento</p>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-lg font-bold">{engagementRate}%</span>
                    <span className="text-[10px] text-muted-foreground">DAU / MAU</span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden mt-1.5">
                    <div className="h-1.5 bg-info rounded-full" style={{ width: `${engagementRate}%` }} />
                  </div>
                </div>
                <div className="p-3 rounded-lg border border-border/50 bg-muted/20">
                  <p className="text-xs text-muted-foreground">Ações por Sessão</p>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-lg font-bold">{actionsPerSession}</span>
                    <span className="text-[10px] text-muted-foreground">ações/sessão</span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden mt-1.5">
                    <div className="h-1.5 bg-success rounded-full" style={{ width: `${Math.min(100, parseFloat(actionsPerSession) * 10)}%` }} />
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-2">
                <p className="text-sm font-semibold">Tipos de Atividade</p>
                {activityTypes.map((t) => (
                  <div key={t.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{t.label}</span>
                      <span className="font-medium">{t.pct}%</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div className={`h-2 ${t.color} rounded-full`} style={{ width: `${t.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                <p className="text-sm font-semibold mb-3">Tendência — Últimos 7 dias</p>
                <div className="flex items-end gap-1.5 h-28">
                  {mPaW.trendData.map((value, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full bg-sky-400 dark:bg-sky-500 rounded-t transition-all" style={{ height: `${(value / maxTrend) * 100}%` }} title={`Dia ${idx + 1}: ${value}`} />
                      <span className="text-[9px] text-muted-foreground">{idx + 1}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        }

        case "accountsReceivable": {
          const outstanding = mArW.creditPlans + mArW.postPaid + mArW.others;
          const collectionTotal = outstanding + mArW.received;
          const collectionRate = collectionTotal > 0 ? Math.round((mArW.received / collectionTotal) * 100) : 0;
          const categories = [
            { label: "Planos de Crédito", value: mArW.creditPlans, color: "bg-blue-500",    chip: "text-blue-700 dark:text-blue-300",     bg: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800" },
            { label: "Pós-pagos",         value: mArW.postPaid,    color: "bg-purple-500",  chip: "text-purple-700 dark:text-purple-300", bg: "bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800" },
            { label: "Outros",            value: mArW.others,      color: "bg-amber-500",   chip: "text-amber-700 dark:text-amber-300",   bg: "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800" },
            { label: "Recebido",          value: mArW.received,    color: "bg-green-500",   chip: "text-green-700 dark:text-green-300",   bg: "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800" },
          ];
          const aging = [
            { label: "0-30 dias",  pct: 55, color: "bg-emerald-500" },
            { label: "31-60 dias", pct: 25, color: "bg-amber-500" },
            { label: "61-90 dias", pct: 12, color: "bg-orange-500" },
            { label: "90+ dias",   pct: 8,  color: "bg-rose-500" },
          ];
          return (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Total a Receber</p>
                    <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">R$ {mArW.total.toLocaleString("pt-BR")},00</p>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 shrink-0">+{mArW.growth}%</Badge>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-border/50 bg-muted/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">Taxa de Cobrança</span>
                  <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">{collectionRate}%</span>
                </div>
                <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                  <div className="h-2.5 bg-emerald-500 rounded-full" style={{ width: `${collectionRate}%` }} />
                </div>
                <div className="flex justify-between text-[11px] text-muted-foreground mt-1.5">
                  <span>Recebido: R$ {mArW.received.toLocaleString("pt-BR")}</span>
                  <span>Pendente: R$ {outstanding.toLocaleString("pt-BR")}</span>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold mb-2">Composição</p>
                <div className="grid grid-cols-2 gap-3">
                  {categories.map((c) => {
                    const pct = collectionTotal > 0 ? Math.round((c.value / collectionTotal) * 100) : 0;
                    return (
                      <div key={c.label} className={`p-3 rounded-lg border ${c.bg}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-medium ${c.chip}`}>{c.label}</span>
                          <span className="text-[10px] text-muted-foreground">{pct}%</span>
                        </div>
                        <p className={`text-sm font-bold ${c.chip}`}>R$ {c.value.toLocaleString("pt-BR")}</p>
                        <div className="h-1.5 bg-secondary/60 rounded-full overflow-hidden mt-1.5">
                          <div className={`h-1.5 ${c.color} rounded-full`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-2">
                <p className="text-sm font-semibold">Aging (em aberto)</p>
                {aging.map((a) => (
                  <div key={a.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{a.label}</span>
                      <span className="font-medium">{a.pct}%{" · "}R$ {Math.round((outstanding * a.pct) / 100).toLocaleString("pt-BR")}</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div className={`h-2 ${a.color} rounded-full`} style={{ width: `${a.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        }

        case "mrr":
          return (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-muted-foreground">MRR Total</p>
                <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">R$ {mrrW.total.toLocaleString("pt-BR")}</p>
                <p className="text-xs text-success mt-1">+{mrrW.growth}%</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Novo MRR", value: mrrW.newMrr, bg: "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800", text: "text-success" },
                  { label: "Expansão", value: mrrW.expansion, bg: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800", text: "text-blue-600 dark:text-blue-400" },
                  { label: "Contração", value: mrrW.contraction, bg: "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800", text: "text-destructive" },
                ].map(item => (
                  <div key={item.label} className={`p-3 rounded-lg border text-center ${item.bg}`}>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className={`text-base font-bold ${item.text}`}>R$ {item.value.toLocaleString("pt-BR")}</p>
                  </div>
                ))}
              </div>
            </div>
          );

        case "churn":
          return (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 text-center">
                  <p className="text-xs text-muted-foreground">Taxa de Churn</p>
                  <p className="text-3xl font-bold text-rose-700 dark:text-rose-300">{churnW.rate}%</p>
                </div>
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-center">
                  <p className="text-xs text-muted-foreground">Clientes Perdidos</p>
                  <p className="text-3xl font-bold text-red-700 dark:text-red-300">{churnW.lost}</p>
                </div>
              </div>
            </div>
          );

        case "creditPlans":
          return (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800">
                <p className="text-sm text-muted-foreground">Total em Planos</p>
                <p className="text-3xl font-bold text-violet-700 dark:text-violet-300">R$ {cpW.total.toLocaleString("pt-BR")}</p>
                <p className="text-xs text-success mt-1">+{cpW.growth}%</p>
              </div>
              <div className="space-y-2">
                {[
                  { label: "Básico", data: cpW.basic, color: "bg-violet-500" },
                  { label: "Parceiro", data: cpW.partner, color: "bg-blue-500" },
                  { label: "Premium", data: cpW.premium, color: "bg-amber-500" },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/20">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${item.color}`} />
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">R$ {item.data.revenue.toLocaleString("pt-BR")}</p>
                      <p className="text-xs text-muted-foreground">{item.data.newContracts} contratos{" · "}+{item.data.growth}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );

        case "activeProjectsWidget":
          return (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                <p className="text-sm text-muted-foreground">Total de Projetos Ativos</p>
                <p className="text-3xl font-bold text-amber-700 dark:text-amber-300">{apW.total}</p>
                <p className="text-xs text-success mt-1">+{apW.growth}%</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Agências", value: apW.agencies, change: apW.agenciesGrowth, bg: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800", text: "text-blue-700 dark:text-blue-300" },
                  { label: "Lead Premium", value: apW.leadPremium, change: apW.leadPremiumGrowth, bg: "bg-violet-50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-800", text: "text-violet-700 dark:text-violet-300" },
                  { label: "Nômades", value: apW.nomades, change: apW.nomadesGrowth, bg: "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800", text: "text-amber-700 dark:text-amber-300" },
                ].map(item => (
                  <div key={item.label} className={`p-3 rounded-lg border text-center ${item.bg}`}>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className={`text-xl font-bold ${item.text}`}>{item.value}</p>
                    <p className="text-xs text-success">+{item.change}%</p>
                  </div>
                ))}
              </div>
            </div>
          );

        case "averageTicket":
          return (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                <p className="text-sm text-muted-foreground">Ticket Médio</p>
                <p className="text-3xl font-bold text-amber-700 dark:text-amber-300">R$ {atW.average?.toLocaleString("pt-BR") ?? "—"}</p>
                {atW.growth != null && <p className="text-xs text-success mt-1">+{atW.growth}%</p>}
              </div>
            </div>
          );

        case "ltv":
          return (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800">
                <p className="text-sm text-muted-foreground">LTV Médio</p>
                <p className="text-3xl font-bold text-teal-700 dark:text-teal-300">R$ {ltvW.average?.toLocaleString("pt-BR") ?? "—"}</p>
                {ltvW.growth != null && <p className="text-xs text-success mt-1">+{ltvW.growth}%</p>}
              </div>
            </div>
          );

        case "tasks": {
          const mt = mData.tasks;
          const tTotal = mt.completed + mt.inProgress + mt.contracted + mt.cancelled;
          return (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                <p className="text-sm text-muted-foreground">Total de Tarefas no Período</p>
                <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">{mt.total.toLocaleString("pt-BR")}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Concluídas",  value: mt.completed,  change: mt.completedGrowth,  bg: "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800",  text: "text-green-700 dark:text-green-300" },
                  { label: "Em Execução", value: mt.inProgress,  change: mt.inProgressGrowth, bg: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800",    text: "text-blue-700 dark:text-blue-300" },
                  { label: "Contratadas", value: mt.contracted,  change: mt.contractedGrowth, bg: "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800",  text: "text-amber-700 dark:text-amber-300" },
                  { label: "Canceladas",  value: mt.cancelled,   change: mt.cancelledChange,  bg: "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800",          text: "text-red-700 dark:text-red-300" },
                ].map(item => (
                  <div key={item.label} className={`p-4 rounded-xl border text-center ${item.bg}`}>
                    <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                    <p className={`text-2xl font-bold ${item.text}`}>{item.value.toLocaleString("pt-BR")}</p>
                    <p className={`text-xs font-medium mt-1 ${item.change >= 0 ? "text-success" : "text-destructive"}`}>{item.change >= 0 ? "+" : ""}{item.change}%</p>
                  </div>
                ))}
              </div>
              <div className="p-4 rounded-xl border border-border/50 bg-muted/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">SLA — Dentro do prazo</span>
                  <span className="text-base font-bold text-success">{mt.slaCompliance.toFixed(1)}%</span>
                </div>
                <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                  <div className="h-2.5 bg-success rounded-full" style={{ width: `${mt.slaCompliance}%` }} />
                </div>
              </div>
              {tTotal > 0 && (
                <div className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-2">
                  <p className="text-sm font-semibold">Distribuição</p>
                  {[
                    { label: "Concluídas",  value: mt.completed,  color: "bg-green-500" },
                    { label: "Em Execução", value: mt.inProgress,  color: "bg-blue-500" },
                    { label: "Contratadas", value: mt.contracted,  color: "bg-amber-500" },
                    { label: "Canceladas",  value: mt.cancelled,   color: "bg-red-500" },
                  ].map(item => (
                    <div key={item.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="font-medium">{item.value.toLocaleString("pt-BR")} ({Math.round((item.value / tTotal) * 100)}%)</span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div className={`h-2 ${item.color} rounded-full`} style={{ width: `${(item.value / tTotal) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        }

        case "nomads": {
          const mn = mData.nomads;
          const maxTrend = Math.max(1, ...mn.trendData);
          return (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800">
                <p className="text-sm text-muted-foreground">Total de Nômades</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <p className="text-3xl font-bold text-teal-700 dark:text-teal-300">{mn.total}</p>
                  <span className="text-sm text-success font-semibold">+{mn.growth}%</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="h-2 w-2 rounded-full bg-success" />
                    <p className="text-xs font-medium text-muted-foreground">Ativos</p>
                  </div>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">{mn.active}</p>
                  <p className="text-xs text-success mt-1">+{mn.activeGrowth}% vs anterior</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                    <p className="text-xs font-medium text-muted-foreground">Inativos</p>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{mn.inactive}</p>
                  <p className="text-xs text-destructive mt-1">{mn.inactiveChange}% vs anterior</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Novos no período", value: String(mn.newInPeriod), color: "text-info" },
                  { label: "Churn",            value: String(mn.churn),       color: "text-destructive" },
                  { label: "Retenção 30d",     value: `${mn.retention30d}%`,  color: "text-success" },
                ].map(item => (
                  <div key={item.label} className="p-3 rounded-lg border border-border/50 bg-muted/20 text-center">
                    <p className="text-[11px] text-muted-foreground">{item.label}</p>
                    <p className={`text-xl font-bold mt-0.5 ${item.color}`}>{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                <p className="text-sm font-semibold mb-3">Evolução de ativos</p>
                <div className="flex items-end gap-1.5 h-24">
                  {mn.trendData.map((value, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full rounded-t bg-teal-400 dark:bg-teal-500 transition-all" style={{ height: `${(value / maxTrend) * 100}%` }} title={String(value)} />
                      <span className="text-[9px] text-muted-foreground">D{idx + 1}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        }

        case "nomadsIndicators": {
          const ni = mData.nomadsIndicators;
          return (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800">
                <p className="text-sm text-muted-foreground">Tempo Médio por Tarefa</p>
                <p className="text-3xl font-bold text-violet-700 dark:text-violet-300">{ni.avgTimePerTask.toFixed(1)} dias</p>
              </div>
              <div className="space-y-3">
                {[
                  { label: "Taxa de Entrega",  display: `${ni.deliveryRate.toFixed(1)}%`,   pct: ni.deliveryRate,          color: "bg-green-500",  chip: "text-green-700 dark:text-green-300",    bg: "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800" },
                  { label: "Avaliação Média",  display: `${ni.avgRating.toFixed(1)} / 5.0`, pct: (ni.avgRating / 5) * 100, color: "bg-amber-500",  chip: "text-amber-700 dark:text-amber-300",    bg: "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800" },
                  { label: "Certificados",     display: `${ni.certified}%`,                 pct: ni.certified,             color: "bg-violet-500", chip: "text-violet-700 dark:text-violet-300",  bg: "bg-violet-50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-800" },
                  { label: "Retenção 90 dias", display: `${ni.retention90d}%`,              pct: ni.retention90d,          color: "bg-teal-500",   chip: "text-teal-700 dark:text-teal-300",      bg: "bg-teal-50 dark:bg-teal-950/20 border-teal-200 dark:border-teal-800" },
                ].map(kpi => (
                  <div key={kpi.label} className={`p-4 rounded-xl border ${kpi.bg}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-muted-foreground">{kpi.label}</span>
                      <span className={`text-base font-bold ${kpi.chip}`}>{kpi.display}</span>
                    </div>
                    <div className="h-2 bg-secondary/60 rounded-full overflow-hidden">
                      <div className={`h-2 ${kpi.color} rounded-full`} style={{ width: `${kpi.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        }

        case "nomadsRanking": {
          const perfList = mData.performers;
          const medals = ["text-yellow-500", "text-slate-400", "text-amber-600"];
          return (
            <div className="space-y-3">
              {perfList.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <Trophy className="h-8 w-8 text-warning mx-auto opacity-40" />
                  <p className="text-sm text-muted-foreground">Nenhum nômade no ranking ainda.</p>
                </div>
              ) : (
                perfList.map((performer: { id: string; name: string; rating: number; projects: number; badge: string }, index: number) => (
                  <div key={performer.id} className="flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors">
                    <div className="relative shrink-0">
                      <div className="h-11 w-11 rounded-full bg-gradient-to-br from-warning to-orange-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
                        {index + 1}
                      </div>
                      <Award className={`absolute -bottom-1 -right-1 h-4 w-4 ${medals[index] ?? "text-chart-4"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{performer.name}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="flex items-center gap-0.5 text-xs"><Star className="h-3 w-3 text-warning fill-warning" />{performer.rating}</span>
                        <span className="text-xs text-muted-foreground">• {performer.projects} proj.</span>
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${performer.badge === "gold" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" : performer.badge === "silver" ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"}`}>
                          {performer.badge === "gold" ? "Ouro" : performer.badge === "silver" ? "Prata" : "Bronze"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          );
        }

        case "agenciesRanking": {
          const agList = mData.agenciesRanking;
          const agMedals = ["text-yellow-500", "text-slate-400", "text-amber-600"];
          return (
            <div className="space-y-3">
              {agList.map((agency: { id: string; name: string; rating: number; projects: number; contribution: string }, index: number) => (
                <div key={agency.id} className="flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors">
                  <div className="relative shrink-0">
                    <div className="h-11 w-11 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                      {index + 1}
                    </div>
                    {index < 3 && <Award className={`absolute -bottom-1 -right-1 h-4 w-4 ${agMedals[index]}`} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{agency.name}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="flex items-center gap-0.5 text-xs"><Star className="h-3 w-3 text-warning fill-warning" />{agency.rating}</span>
                      <span className="text-xs text-muted-foreground">• {agency.projects} proj.</span>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold text-cyan-600 dark:text-cyan-400">{agency.contribution}</p>
                    <p className="text-[10px] text-muted-foreground">faturamento</p>
                  </div>
                </div>
              ))}
            </div>
          );
        }

        case "statusOverview": {
          const so = mData.statusOverview;
          const sections = [
            {
              title: "Projetos", icon: Briefcase,
              items: [
                { label: "Em andamento", value: so.projects.ongoing,   color: "bg-blue-500",    chip: "text-blue-600" },
                { label: "Aprovados",    value: so.projects.approved,  color: "bg-green-500",   chip: "text-green-600" },
                { label: "Concluídos",   value: so.projects.completed, color: "bg-emerald-500", chip: "text-emerald-600" },
                { label: "Cancelados",   value: so.projects.cancelled, color: "bg-red-500",     chip: "text-red-600" },
                { label: "Em atraso",    value: so.projects.delayed,   color: "bg-amber-500",   chip: "text-amber-600" },
              ],
            },
            {
              title: "Tarefas", icon: CheckSquare,
              items: [
                { label: "Contratadas", value: so.tasks.contracted, color: "bg-purple-500", chip: "text-purple-600" },
                { label: "Em execução", value: so.tasks.inProgress, color: "bg-blue-500",   chip: "text-blue-600" },
                { label: "Concluídas",  value: so.tasks.completed,  color: "bg-green-500",  chip: "text-green-600" },
                { label: "Arquivadas",  value: so.tasks.archived,   color: "bg-slate-400",  chip: "text-slate-500" },
              ],
            },
            {
              title: "Leads", icon: Users,
              items: [
                { label: "Novos",             value: so.leads.new,       color: "bg-cyan-500",  chip: "text-cyan-600" },
                { label: "Em contato",        value: so.leads.contacted, color: "bg-blue-500",  chip: "text-blue-600" },
                { label: "Proposta enviada",  value: so.leads.proposal,  color: "bg-violet-500",chip: "text-violet-600" },
                { label: "Fechado",           value: so.leads.won,       color: "bg-green-500", chip: "text-green-600" },
                { label: "Perdido",           value: so.leads.lost,      color: "bg-red-500",   chip: "text-red-600" },
              ],
            },
          ];
          return (
            <div className="space-y-5">
              {sections.map(section => {
                const total = section.items.reduce((s, i) => s + i.value, 0);
                return (
                  <div key={section.title} className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <section.icon className="h-4 w-4 text-muted-foreground" />
                      {section.title}
                    </h3>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {section.items.map(item => (
                        <div key={item.label} className="p-3 rounded-lg border border-border/30 bg-background/60 text-center">
                          <p className={`text-xl font-bold ${item.chip}`}>{item.value.toLocaleString("pt-BR")}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{item.label}</p>
                        </div>
                      ))}
                    </div>
                    {total > 0 && (
                      <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
                        {section.items.filter(i => i.value > 0).map(item => (
                          <div key={item.label} className={`${item.color} h-2`} style={{ width: `${(item.value / total) * 100}%` }} title={`${item.label}: ${item.value}`} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        }

        default:
          return (
            <div className="text-center py-8 space-y-2">
              <div className="p-3 bg-muted/30 rounded-full w-fit mx-auto">
                <Settings className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Detalhes detalhados em breve para este widget.</p>
            </div>
          );
      }
    };

    return (
      <Dialog open={!!detailsWidgetId} onOpenChange={() => setDetailsWidgetId(null)}>
        <DialogContent className="!max-w-[1000px] w-[calc(100vw-2rem)] p-0 overflow-hidden" showCloseButton={false}>
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
                <h2 className="text-base font-bold leading-tight truncate">{title}</h2>
                <p className="text-xs text-white/70 mt-0.5 truncate">{cfg.subtitle}</p>
              </div>
              {/* Period selector dropdown — white-themed for the gradient header */}
              {widgetInstance && (() => {
                const wp = widgetPeriods.find((p) => p.widgetId === widgetInstance.id);
                const isCustom = wp?.mode === "custom";
                const periodOptions = [
                  { key: "global",    label: "Período global" },
                  { key: "today",     label: "Hoje" },
                  { key: "7days",     label: "Últimos 7 dias" },
                  { key: "30days",    label: "Últimos 30 dias" },
                  { key: "thisMonth", label: "Este mês" },
                  { key: "lastMonth", label: "Mês passado" },
                  { key: "90days",    label: "Últimos 90 dias" },
                  { key: "365days",   label: "Último ano" },
                ];
                const activeLabel = isCustom ? wp!.customPeriod!.label : "Período global";
                return (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="inline-flex items-center gap-1.5 text-[11px] font-medium bg-white/20 hover:bg-white/30 text-white rounded-full px-3 py-1.5 whitespace-nowrap transition-colors shrink-0">
                        <Calendar className="h-3 w-3 opacity-80" />
                        {activeLabel}
                        <ChevronDown className="h-3 w-3 opacity-70" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52 z-[9999]">
                      <DropdownMenuLabel className="text-xs text-muted-foreground">Período do widget</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {periodOptions.map((opt) => {
                        const isSelected =
                          opt.key === "global"
                            ? !isCustom
                            : isCustom && wp!.customPeriod!.label === opt.label;
                        return (
                          <DropdownMenuItem
                            key={opt.key}
                            onClick={() => setWidgetCustomPeriod(widgetInstance.id, opt.key === "global" ? "global" : opt.key)}
                            className="text-xs"
                          >
                            <Check className={cn("mr-2 h-3 w-3", isSelected ? "opacity-100" : "opacity-0")} />
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
          <div className="px-6 py-5 space-y-4 max-h-[68vh] overflow-y-scroll transition-opacity duration-150" key={`${detailsWidgetId}-${modalPeriod.label}`}>
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
                      Métricas principais da plataforma
                    </p>
                  </div>
                </div>
                {/* Controls row */}
                <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => setIsEditingMetrics(!isEditingMetrics)}
                      title={isEditingMetrics ? "Concluir Edição" : "Editar Widgets"}
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
                <div className="grid grid-cols-2 gap-4">
                  {(() => {
                    // Compute widget-specific metrics based on per-widget period override
                    const wp = effectivePeriod as { periodKey?: string };
                    const widgetBase = getMetricsForPeriod(undefined, wp.periodKey);
                    const widgetMetrics = !apiStats ? widgetBase : {
                      ...widgetBase,
                      totalUsers: { ...widgetBase.totalUsers, value: (apiStats.nomades?.total ?? 0).toLocaleString("pt-BR") },
                      activeUsers: { ...widgetBase.activeUsers, value: (apiStats.nomades?.active ?? 0).toLocaleString("pt-BR") },
                      companies: { ...widgetBase.companies, value: (apiStats.companies?.total ?? 0).toLocaleString("pt-BR") },
                      activeProjects: { ...widgetBase.activeProjects, value: (apiStats.projects?.active ?? 0).toLocaleString("pt-BR") },
                      revenue: { ...widgetBase.revenue, value: `R$ ${((apiStats.financial?.totalRevenue ?? 0) / 1000).toFixed(1)}k` },
                    };
                    return metricCards
                      .filter((m) => m.visible)
                      .sort((a, b) => a.order - b.order)
                      .map((metricCard) => renderMetricCard(metricCard.id, widgetMetrics));
                  })()}
                </div>
              </CardContent>
            </Card>
          </div>
        );
      }

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
              <CardHeader className="pb-4 relative">
                <div className="flex items-center gap-3 pr-20">
                  {isCustomizeMode && (
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <div className="p-2 bg-chart-2/10 rounded-lg shrink-0">
                    <Users className="h-4 w-4 text-chart-2" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base font-semibold leading-tight">
                      {getWidgetTitle(widget.type)}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Distribuição por tipo de conta
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
              <CardHeader className="pb-4 relative">
                <div className="flex items-center gap-3 pr-20">
                  {isCustomizeMode && (
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <div className="p-2 bg-destructive/10 rounded-lg shrink-0">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base font-semibold leading-tight">
                      {getWidgetTitle(widget.type)}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Alertas e notificações do sistema
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
              <CardHeader className="pb-4 relative">
                <div className="flex items-center gap-3 pr-20">
                  {isCustomizeMode && (
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <div className="p-2 bg-chart-4/10 rounded-lg shrink-0">
                    <Shield className="h-4 w-4 text-chart-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base font-semibold leading-tight">
                      {getWidgetTitle(widget.type)}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Perfis de acesso e permissões
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
              <CardHeader className="pb-4 relative">
                <div className="flex items-center gap-3 pr-20">
                  {isCustomizeMode && (
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <div className="p-2 bg-warning/10 rounded-lg shrink-0">
                    <Lock className="h-4 w-4 text-warning" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base font-semibold leading-tight">
                      {getWidgetTitle(widget.type)}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Matriz de acesso por módulo
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
              <CardHeader className="pb-4 relative">
                <div className="flex items-center gap-3 pr-20">
                  {isCustomizeMode && (
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <div className="p-2 bg-muted rounded-lg shrink-0">
                    <Settings className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base font-semibold leading-tight">
                      {getWidgetTitle(widget.type)}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Ferramentas de gerenciamento
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
                      Atividades recentes na plataforma
                    </p>
                  </div>
                  <Link to="/admin/activity" className="shrink-0">
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
            <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50">
              <CardHeader className="pb-4 relative">
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
                      Alertas ativos e prioridades
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-xs backdrop-blur-sm shrink-0"
                  >
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
              <CardHeader className="pb-4 relative">
                <div className="flex items-center gap-3 pr-20">
                  {isCustomizeMode && (
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <div className="p-2 bg-warning/10 rounded-lg shrink-0">
                    <Star className="h-4 w-4 text-warning" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base font-semibold leading-tight">
                      {getWidgetTitle(widget.type)}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Top nômades por desempenho
                    </p>
                  </div>
                  <Link to="/admin/nomades" className="shrink-0">
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
                <div className="mt-2">
                  <WidgetPeriodSelector widgetId={widget.id} />
                </div>
                <WidgetExportButton
                  widgetId={widget.type}
                  widgetTitle={getWidgetTitle(widget.type)}
                />
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
              <CardHeader className="pb-4 relative">
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
                      Atalhos de administração
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
            <CardHeader className="pb-4 relative">
              <div className="flex items-center gap-3 pr-20">
                <div className="p-2 bg-destructive/10 rounded-lg shrink-0">
                  <DollarSign className="h-4 w-4 text-destructive" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base font-semibold leading-tight">Receita</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Total e por tipo de plano
                  </p>
                </div>
              </div>
              <div className="mt-2">
                <WidgetPeriodSelector widgetId={widget.id} />
              </div>
              {/* ── Action buttons — floating top-right ── */}
              <div className="absolute top-3 right-3 flex items-center rounded-lg border border-border/60 bg-background shadow-sm overflow-visible">
                {manualAffectedWidgets.has(widget.type) && (
                  <span className="px-2 text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-r border-border/60 h-7 flex items-center gap-1 rounded-l-lg">
                    <Database className="h-3 w-3" />
                    Manual
                  </span>
                )}
                <button
                  onClick={() => openWidgetShareDialog(widget.type, "Receita")}
                  className="flex items-center justify-center h-7 w-8 cursor-pointer text-muted-foreground hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/40 active:scale-90 transition-all duration-150 rounded-l-lg"
                  title="Compartilhar widget"
                >
                  <Share2 className="h-3.5 w-3.5" />
                </button>
                <div className="w-px h-4 bg-border/60 shrink-0" />
                {/* Export dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowExportDropdown(showExportDropdown === widget.type ? null : widget.type)}
                    className="flex items-center justify-center h-7 w-8 cursor-pointer text-muted-foreground hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/40 active:scale-90 transition-all duration-150 rounded-r-lg"
                    title="Exportar widget"
                    data-export-button
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                  {showExportDropdown === widget.type && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowExportDropdown(null)} />
                      <div className="absolute right-0 top-full mt-1 z-50 min-w-[120px] rounded-lg border border-border/60 bg-background shadow-lg overflow-hidden">
                        <button
                          onClick={() => { exportWidgetToPng(widget.type, "Receita"); setShowExportDropdown(null); }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-xs cursor-pointer hover:bg-violet-100 dark:hover:bg-violet-900/40 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
                        >
                          <ImageDown className="h-3.5 w-3.5 text-muted-foreground" />
                          Exportar PNG
                        </button>
                        <div className="h-px bg-border/50" />
                        <button
                          onClick={() => { exportWidgetToPdf(widget.type, "Receita"); setShowExportDropdown(null); }}
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
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Revenue Total */}
              <div className="pb-4 border-b">
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-bold">
                    R$ {(rv.total / 1000).toFixed(1)}k
                  </h3>
                  <span className="flex items-center gap-1 text-sm text-success font-semibold">
                    <TrendingUp className="h-3.5 w-3.5" />+{rv.totalGrowth}%
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
              <CardHeader className="pb-4 relative">
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
              <CardHeader className="pb-4 relative">
                <div className="flex items-center gap-3 pr-20">
                  {isCustomizeMode && (
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                    <CreditCard className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base font-semibold leading-tight">
                      {getWidgetTitle(widget.type)}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Receita por plano de crédito
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
              <CardContent className="space-y-4">
                {/* Total Revenue from Credit Plans */}
                <div className="pb-4 border-b">
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-3xl font-bold">
                      R$ {cpW.total.toLocaleString("pt-BR")}
                    </h3>
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
                        R$ {cpW.basic.revenue.toLocaleString("pt-BR")}
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
                      <div className="text-lg font-bold">
                        R$ {cpW.partner.revenue.toLocaleString("pt-BR")}
                      </div>
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
                      <div className="text-lg font-bold">
                        R$ {cpW.premium.revenue.toLocaleString("pt-BR")}
                      </div>
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
              <CardHeader className="pb-4 relative">
                <div className="flex items-center gap-3 pr-20">
                  {isCustomizeMode && (
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base font-semibold leading-tight">
                      {getWidgetTitle(widget.type)}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Receita recorrente mensal
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
                    <h3 className="text-3xl font-bold">
                      R$ {mrrW.total.toLocaleString("pt-BR")}
                    </h3>
                    <div className="flex items-center gap-2 text-sm font-medium text-success">
                      <ArrowUpRight className="w-4 h-4" />+{mrrW.growth}%
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
                      +R$ {mrrW.newMrr.toLocaleString("pt-BR")}
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
                      +R$ {mrrW.expansion.toLocaleString("pt-BR")}
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
                      -R$ {mrrW.contraction.toLocaleString("pt-BR")}
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
                      -R$ {mrrW.churnRevenue.toLocaleString("pt-BR")}
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
                    <div className="text-xl font-bold">
                      R$ {(mrrW.total * 12).toLocaleString("pt-BR")}
                    </div>
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
                    <span>Base: R$ {mrrW.baseMrr.toLocaleString("pt-BR")}</span>
                    <span>
                      Net Change: {mrrW.netChange >= 0 ? "+" : ""}R${" "}
                      {mrrW.netChange.toLocaleString("pt-BR")}
                    </span>
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
                        <TrendingUp className="h-3 w-3 mr-1" />+
                        {mrrW.trendGrowth}%
                      </Badge>
                    </div>

                    {/* Enhanced Bar Chart */}
                    <div className="flex items-end justify-between gap-1.5 h-20 bg-gradient-to-b from-blue-50 to-transparent p-3 rounded-lg border border-blue-100">
                      {mrrW.trendData.map((data, idx) => {
                        const maxValue =
                          mrrW.trendData[mrrW.trendData.length - 1];
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
                              {["Jun", "Jul", "Ago", "Set", "Out", "Nov"][idx]}
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
                        <p className="font-semibold">
                          R$ {(Math.min(...mrrW.trendData) / 1000).toFixed(0)}k
                        </p>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded p-2">
                        <p className="text-muted-foreground">Médio</p>
                        <p className="font-semibold">
                          R${" "}
                          {(
                            mrrW.trendData.reduce((a, b) => a + b, 0) /
                            mrrW.trendData.length /
                            1000
                          ).toFixed(1)}
                          k
                        </p>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded p-2">
                        <p className="text-muted-foreground">Atual</p>
                        <p className="font-semibold text-blue-600">
                          R$ {(mrrW.total / 1000).toFixed(1)}k
                        </p>
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
          <Card className="overflow-hidden border-destructive/20" data-widget-id={widget.type}>
            <CardHeader className="pb-4 relative">
              <div className="flex items-center gap-3 pr-20">
                <div className="p-2 bg-destructive/10 rounded-lg shrink-0">
                  <TrendingDown className="h-4 w-4 text-destructive" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base font-semibold leading-tight">CHURN</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Perda de clientes e receita
                  </p>
                </div>
              </div>
              <div className="mt-2">
                <WidgetPeriodSelector widgetId={widget.id} />
              </div>
              <WidgetExportButton
                widgetId={widget.type}
                widgetTitle="CHURN"
              />
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
                    <span className="text-2xl font-bold">
                      {churnW.inactiveAccounts}
                    </span>
                    <Badge variant="destructive" className="gap-1">
                      <TrendingUp className="h-3 w-3" />+{churnW.inactiveGrowth}
                      %
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
                    <span className="text-xl font-bold">
                      {churnW.cancelledProjects}
                    </span>
                    <Badge variant="destructive" className="gap-1">
                      <TrendingUp className="h-3 w-3" />+
                      {churnW.cancelledGrowth}%
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
                      R$ {churnW.revenueChurn.toLocaleString("pt-BR")}
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
                  onClick={() =>
                    openChartModal(
                      widget.type,
                      "CHURN — Tendência",
                      "bar",
                      [
                        { date: "Inativados", value: churnW.inactiveAccounts },
                        { date: "Proj. Cancel.", value: churnW.cancelledProjects },
                        { date: "Rev. Churn (k)", value: Math.round(churnW.revenueChurn / 1000) },
                      ],
                    )
                  }
                >
                  <FileText className="h-3 w-3" />
                  Ver Detalhes
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 bg-transparent"
                  onClick={() => exportWidgetToPng(widget.type, "CHURN")}
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
          <Card className="overflow-hidden" data-widget-id={widget.type}>
            <CardHeader className="pb-4 relative">
              <div className="flex items-center gap-3 pr-20">
                <div className="p-2 bg-success/10 rounded-lg shrink-0">
                  <DollarSign className="h-4 w-4 text-success" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base font-semibold leading-tight">Ticket Médio</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Valor médio por cliente e projeto
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
            <CardContent className="p-6">
              {/* Ticket Médio Geral */}
              <div className="mb-6 p-4 bg-success/10 rounded-lg border border-success/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Ticket Médio Geral
                    </p>
                    <p className="text-3xl font-bold text-success">
                      R$ {atW.general.toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-success">
                    <TrendingUp className="h-5 w-5" />
                    <span className="text-lg font-semibold">
                      +{atW.generalGrowth}%
                    </span>
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
                    <p className="text-2xl font-bold text-success">
                      R$ {atW.perProject.toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-success">
                    <TrendingUp className="h-5 w-5" />
                    <span className="text-lg font-semibold">
                      +{atW.perProjectGrowth}%
                    </span>
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
          <Card className="overflow-hidden" data-widget-id={widget.type}>
            <CardHeader className="pb-4 relative">
              <div className="flex items-center gap-3 pr-20">
                <div className="p-2 bg-chart-4/10 rounded-lg shrink-0">
                  <TrendingUp className="h-4 w-4 text-chart-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base font-semibold leading-tight">
                    LTV (Lifetime Value)
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Valor vitalício do cliente
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
            <CardContent className="space-y-4">
              {/* LTV Geral */}
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-3xl font-bold">
                    R$ {ltvW.value.toLocaleString("pt-BR")}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <span>Tempo médio: 24 meses</span>
                    <span>•</span>
                    <span>Ticket médio: R$ 420/mês</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <ArrowUp className="h-4 w-4 text-success" />
                  <span className="text-success font-semibold">
                    +{ltvW.growth}%
                  </span>
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
                    <div className="text-lg font-bold">
                      R$ {ltvW.agencies.toLocaleString("pt-BR")}
                    </div>
                    <div className="flex items-center gap-1 text-xs justify-end">
                      <ArrowUp className="h-3 w-3 text-success" />
                      <span className="text-success font-semibold">
                        +{ltvW.agenciesGrowth}%
                      </span>
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
                    <div className="text-lg font-bold">
                      R$ {ltvW.leadPremium.toLocaleString("pt-BR")}
                    </div>
                    <div className="flex items-center gap-1 text-xs justify-end">
                      <ArrowUp className="h-3 w-3 text-success" />
                      <span className="text-success font-semibold">
                        +{ltvW.leadPremiumGrowth}%
                      </span>
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
                    <div className="text-lg font-bold">
                      R$ {ltvW.nomades.toLocaleString("pt-BR")}
                    </div>
                    <div className="flex items-center gap-1 text-xs justify-end">
                      <ArrowDown className="h-3 w-3 text-warning" />
                      <span className="text-warning">
                        {ltvW.nomadesGrowth}%
                      </span>
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
                        style={{
                          width: `${Math.min(100, (ltvW.hist0to1k / 400) * 100)}%`,
                        }}
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
                        style={{
                          width: `${Math.min(100, (ltvW.hist1kto5k / 400) * 100)}%`,
                        }}
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
                        style={{
                          width: `${Math.min(100, (ltvW.hist5kto15k / 400) * 100)}%`,
                        }}
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
                        style={{
                          width: `${Math.min(100, (ltvW.hist15kplus / 400) * 100)}%`,
                        }}
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
          <Card data-widget-id={widget.type}>
            <CardHeader className="pb-4 relative">
              <div className="flex items-center gap-3 pr-20">
                <div className="p-2 bg-warning/10 rounded-lg shrink-0">
                  <Calculator className="h-4 w-4 text-warning" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base font-semibold leading-tight">
                    CMV (Custo de Mercadoria Vendida)
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Custos vs. receita da plataforma
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

      case "platformActivities": {
        const wPaW = generateDashboardData(effectivePeriod.from, effectivePeriod.to).platformActivities;
        return (
          <Card key={widget.id} className="overflow-hidden" data-widget-id={widget.type}>
            <CardHeader className="pb-4 relative">
              <div className="flex items-center gap-3 pr-20">
                <div className="p-2 bg-info/10 rounded-lg shrink-0">
                  <Activity className="h-4 w-4 text-info" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base font-semibold leading-tight">
                    Atividades da Plataforma
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Engajamento e tempo na plataforma
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
            <CardContent>
              <div className="space-y-4">
                {/* Main metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Agências Ativas
                    </p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-2xl font-bold">
                        {wPaW.activeAgencies}
                      </span>
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
                      <span className="text-2xl font-bold">
                        {wPaW.avgSessionMinutes} min
                      </span>
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
                    <span className="text-lg font-semibold">{wPaW.mau}</span>
                    <span className="text-xs text-success">+5%</span>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">DAU</p>
                    <span className="text-lg font-semibold">{wPaW.dau}</span>
                    <span className="text-xs text-success">+3%</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Sessões</p>
                    <span className="text-lg font-semibold">
                      {wPaW.sessions.toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Ações executadas
                    </p>
                    <span className="text-lg font-semibold">
                      {wPaW.actionsExecuted.toLocaleString("pt-BR")}
                    </span>
                  </div>
                </div>

                {/* Activity trend chart */}
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground mb-2">
                    Atividade (últimos 7 dias)
                  </p>
                  <div className="flex items-end gap-1 h-16">
                    {wPaW.trendData.map((value, idx) => (
                      <div
                        key={idx}
                        className="flex-1 bg-info rounded-t"
                        style={{
                          height: `${(value / Math.max(1, Math.max(...wPaW.trendData))) * 100}%`,
                        }}
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
              </div>
            </CardContent>
          </Card>
        );
      }

      case "nomads": {
        const wNmW = generateDashboardData(effectivePeriod.from, effectivePeriod.to).nomads;
        return (
          <Card className="overflow-hidden" data-widget-id={widget.type}>
            <CardHeader className="pb-4 relative">
              <div className="flex items-center gap-3 pr-20">
                <div className="p-2 bg-chart-2/10 rounded-lg shrink-0">
                  <Users className="h-4 w-4 text-chart-2" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base font-semibold leading-tight">Nômades</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Visão rápida da base de nômades
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
            <CardContent className="space-y-4">

              {/* Total em cima - Destaque grande */}
              <div className="rounded-lg border-2 border-chart-2/30 bg-chart-2/5 p-4 text-center">
                <p className="text-xs font-medium text-chart-2 mb-1">
                  TOTAL DE NÔMADES
                </p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-4xl font-bold text-chart-2">
                    {wNmW.total}
                  </span>
                  <span className="flex items-center gap-1 text-base text-success font-semibold">
                    <TrendingUp className="h-4 w-4" />+{wNmW.growth}%
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
                      {wNmW.active}
                    </span>
                    <span className="flex items-center text-sm text-success font-semibold">
                      <TrendingUp className="h-3 w-3" />+{wNmW.activeGrowth}%
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
                      {wNmW.inactive}
                    </span>
                    <span className="flex items-center text-sm text-destructive font-semibold">
                      <TrendingDown className="h-3 w-3" />
                      {wNmW.inactiveChange}%
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
                    <p className="text-xl font-bold text-info">
                      {wNmW.newInPeriod}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1 leading-tight">
                      Churn
                    </p>
                    <p className="text-xl font-bold text-destructive">
                      {wNmW.churn}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1 leading-tight">
                      Retenção 30d
                    </p>
                    <p className="text-xl font-bold text-success">
                      {wNmW.retention30d}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Mini gráfico de tendência */}
              <div className="rounded-lg border bg-card p-4">
                <p className="text-xs font-medium text-muted-foreground mb-3">
                  Evolução de nômades ativos
                </p>
                <div className="flex items-end justify-between gap-1 h-16">
                  {wNmW.trendData.map((value, idx) => {
                    const percentage =
                      (value / Math.max(1, Math.max(...wNmW.trendData))) * 100;
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
            </CardContent>
          </Card>
        );
      }

      case "nomadsRanking": {
        const wPerfW = generateDashboardData(effectivePeriod.from, effectivePeriod.to).performers;
        const top3 = wPerfW.slice(0, 3);
        const rest = wPerfW.slice(3);
        const podiumOrder = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3;
        const podiumIdx   = top3.length >= 3 ? [1, 0, 2] : [0, 1, 2];
        const medalColors = [
          { ring: "ring-yellow-400", bg: "from-yellow-400 to-amber-500", shadow: "shadow-yellow-400/40", crown: "text-yellow-400", label: "bg-yellow-400/20 text-yellow-700 dark:text-yellow-400", barH: "h-20" },
          { ring: "ring-slate-400",  bg: "from-slate-400 to-slate-500",  shadow: "shadow-slate-400/40",  crown: "text-slate-400",  label: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",    barH: "h-16" },
          { ring: "ring-amber-600",  bg: "from-amber-600 to-orange-600", shadow: "shadow-amber-600/40",  crown: "text-amber-600",  label: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", barH: "h-14" },
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
                  <CardTitle className="text-base font-semibold leading-tight">Ranking de Nômades</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Os melhores nômades da plataforma</p>
                </div>
              </div>
              <div className="mt-2">
                <WidgetPeriodSelector widgetId={widget.id} />
              </div>
              <WidgetExportButton widgetId={widget.type} widgetTitle={getWidgetTitle(widget.type)} />
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-4">
              {/* Podium — top 3 */}
              {top3.length > 0 && (
                <div className="flex items-end justify-center gap-3 pt-2">
                  {podiumOrder.map((performer, pIdx) => {
                    const rank = podiumIdx[pIdx];
                    const mc = medalColors[rank];
                    return (
                      <div key={performer.id} className={`flex flex-col items-center gap-1.5 ${rank === 0 ? "scale-110 z-10" : ""}`}>
                        {/* Crown for #1 */}
                        {rank === 0 && <Trophy className="h-5 w-5 text-yellow-400 drop-shadow" />}
                        {/* Avatar */}
                        <div className={`relative ring-2 ${mc.ring} rounded-full shadow-lg ${mc.shadow}`}>
                          <div className={`h-14 w-14 rounded-full bg-gradient-to-br ${mc.bg} flex items-center justify-center text-white font-bold text-lg`}>
                            {performer.avatar}
                          </div>
                          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-background rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none border">
                            {rank + 1}
                          </div>
                        </div>
                        {/* Name */}
                        <p className="text-xs font-semibold text-center leading-tight max-w-[72px] truncate">{performer.name.split(" ")[0]}</p>
                        <p className="text-[10px] text-muted-foreground text-center max-w-[72px] truncate">{performer.specialty}</p>
                        {/* Rating */}
                        <div className="flex items-center gap-0.5">
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} className={`h-2.5 w-2.5 ${s <= Math.round(performer.rating) ? "text-warning fill-warning" : "text-muted-foreground"}`} />
                          ))}
                        </div>
                        <span className="text-[10px] font-bold">{performer.rating}</span>
                        {/* Podium bar */}
                        <div className={`w-14 ${mc.barH} bg-gradient-to-b ${mc.bg} rounded-t-lg opacity-80 flex items-start justify-center pt-1`}>
                          <span className="text-white text-[9px] font-bold">{performer.projects} proj.</span>
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
                      <div key={performer.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors">
                        <span className="text-sm font-bold text-muted-foreground w-5 text-center">{rank + 1}</span>
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                          {performer.avatar}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{performer.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{performer.specialty}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Star className="h-3 w-3 text-warning fill-warning" />
                          <span className="text-xs font-medium">{performer.rating}</span>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">{performer.projects} proj.</span>
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

      case "agenciesRanking": {
        const wAgRankW = generateDashboardData(effectivePeriod.from, effectivePeriod.to).agenciesRanking;
        const agTop3 = wAgRankW.slice(0, 3);
        const agRest = wAgRankW.slice(3);
        const agMedalIcons = ["🥇", "🥈", "🥉"];
        const agMedalRings = ["ring-yellow-400 shadow-yellow-400/30", "ring-slate-400 shadow-slate-400/30", "ring-amber-600 shadow-amber-600/30"];
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
                  <div className="p-2 bg-cyan-500/10 rounded-lg shrink-0">
                    <Building2 className="h-4 w-4 text-cyan-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base font-semibold leading-tight">{getWidgetTitle(widget.type)}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">Ranking das agências da plataforma</p>
                  </div>
                </div>
                <div className="mt-2">
                  <WidgetPeriodSelector widgetId={widget.id} />
                </div>
                <WidgetExportButton widgetId={widget.type} widgetTitle={getWidgetTitle(widget.type)} />
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-4">
                {/* Top 3 — large cards */}
                <div className="grid grid-cols-3 gap-2">
                  {agTop3.map((agency, idx) => (
                    <div key={agency.id} className="relative flex flex-col items-center gap-2 p-3 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors text-center">
                      <span className="absolute top-1.5 left-2 text-sm leading-none">{agMedalIcons[idx]}</span>
                      {/* Logo */}
                      <div className={`ring-2 ${agMedalRings[idx]} rounded-full shadow-md mt-3`}>
                        <div className={`h-12 w-12 rounded-full bg-gradient-to-br ${agency.color} flex items-center justify-center text-white font-bold text-base`}>
                          {agency.avatar}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-bold leading-tight truncate w-full">{agency.name}</p>
                        <p className="text-[10px] text-muted-foreground">{agency.specialty}</p>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} className={`h-2.5 w-2.5 ${s <= Math.round(agency.rating) ? "text-warning fill-warning" : "text-muted-foreground/30"}`} />
                        ))}
                      </div>
                      <div className="flex gap-2 text-[10px]">
                        <span className="font-semibold text-foreground">{agency.projects} proj.</span>
                        <span className="font-bold text-emerald-600">{agency.contribution}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Rest — compact */}
                {agRest.length > 0 && (
                  <div className="space-y-1.5 pt-1 border-t">
                    {agRest.map((agency, idx) => (
                      <div key={agency.id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted/50 transition-colors">
                        <span className="text-xs font-bold text-muted-foreground w-5 text-center">{idx + 4}</span>
                        <div className={`h-8 w-8 rounded-full bg-gradient-to-br ${agency.color} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                          {agency.avatar}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{agency.name}</p>
                          <p className="text-[10px] text-muted-foreground">{agency.specialty}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Star className="h-3 w-3 text-warning fill-warning" />
                          <span className="text-xs font-medium">{agency.rating}</span>
                        </div>
                        <span className="text-xs font-bold text-emerald-600 shrink-0">{agency.contribution}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );
      }

      case "statusOverview": {
        const wSoW = generateDashboardData(effectivePeriod.from, effectivePeriod.to).statusOverview;
        const soSections = [
          {
            label: "Projetos",
            icon: <Briefcase className="h-4 w-4" />,
            iconBg: "bg-blue-500/10",
            iconColor: "text-blue-500",
            href: "/admin/projects",
            items: [
              { label: "Andamento", count: wSoW.projects.ongoing,   status: "ongoing",   bg: "bg-blue-500/10",   text: "text-blue-600 dark:text-blue-400",   dot: "bg-blue-500" },
              { label: "Aprovados",  count: wSoW.projects.approved,  status: "approved",  bg: "bg-green-500/10",  text: "text-green-600 dark:text-green-400",  dot: "bg-green-500" },
              { label: "Concluídos", count: wSoW.projects.completed, status: "completed", bg: "bg-emerald-500/10",text: "text-emerald-600 dark:text-emerald-400",dot: "bg-emerald-500" },
              { label: "Cancelados", count: wSoW.projects.cancelled, status: "cancelled", bg: "bg-red-500/10",    text: "text-red-600 dark:text-red-400",      dot: "bg-red-500" },
              { label: "Atraso",     count: wSoW.projects.delayed,   status: "delayed",   bg: "bg-amber-500/10",  text: "text-amber-600 dark:text-amber-400",  dot: "bg-amber-500" },
            ],
          },
          {
            label: "Tarefas",
            icon: <CheckSquare className="h-4 w-4" />,
            iconBg: "bg-violet-500/10",
            iconColor: "text-violet-500",
            href: "/admin/tasks",
            items: [
              { label: "Contratadas", count: wSoW.tasks.contracted, status: "contracted", bg: "bg-purple-500/10",  text: "text-purple-600 dark:text-purple-400", dot: "bg-purple-500" },
              { label: "Execução",    count: wSoW.tasks.inProgress, status: "inprogress", bg: "bg-blue-500/10",   text: "text-blue-600 dark:text-blue-400",     dot: "bg-blue-500" },
              { label: "Concluídas",  count: wSoW.tasks.completed,  status: "completed",  bg: "bg-green-500/10",  text: "text-green-600 dark:text-green-400",   dot: "bg-green-500" },
              { label: "Arquivadas",  count: wSoW.tasks.archived,   status: "archived",   bg: "bg-slate-500/10",  text: "text-slate-600 dark:text-slate-400",   dot: "bg-slate-500" },
            ],
          },
          {
            label: "Leads",
            icon: <Users className="h-4 w-4" />,
            iconBg: "bg-cyan-500/10",
            iconColor: "text-cyan-500",
            href: "/admin/leads",
            items: [
              { label: "Novos",     count: wSoW.leads.new,       status: "new",      bg: "bg-cyan-500/10",   text: "text-cyan-600 dark:text-cyan-400",    dot: "bg-cyan-500" },
              { label: "Contato",   count: wSoW.leads.contacted, status: "contacted",bg: "bg-blue-500/10",   text: "text-blue-600 dark:text-blue-400",    dot: "bg-blue-500" },
              { label: "Proposta",  count: wSoW.leads.proposal,  status: "proposal", bg: "bg-violet-500/10", text: "text-violet-600 dark:text-violet-400", dot: "bg-violet-500" },
              { label: "Fechados",  count: wSoW.leads.won,       status: "won",      bg: "bg-green-500/10",  text: "text-green-600 dark:text-green-400",   dot: "bg-green-500" },
              { label: "Perdidos",  count: wSoW.leads.lost,      status: "lost",     bg: "bg-red-500/10",    text: "text-red-600 dark:text-red-400",       dot: "bg-red-500" },
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
                    <CardTitle className="text-base font-semibold leading-tight whitespace-nowrap">Visão Geral por Status</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">Status de projetos, tarefas e leads</p>
                  </div>
                </div>
                <div className="mt-2">
                  <WidgetPeriodSelector widgetId={widget.id} />
                </div>
                <WidgetExportButton widgetId={widget.type} widgetTitle={getWidgetTitle(widget.type)} />
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-4">
                {soSections.map((section) => (
                  <div key={section.label}>
                    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md ${section.iconBg} mb-2`}>
                      <span className={section.iconColor}>{section.icon}</span>
                      <span className={`text-xs font-semibold ${section.iconColor}`}>{section.label}</span>
                    </div>
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-1.5">
                      {section.items.map((item) => (
                        <button
                          key={item.status}
                          onClick={() => { window.location.href = `${section.href}?status=${item.status}`; }}
                          className={`p-2.5 rounded-lg ${item.bg} hover:brightness-90 transition-all duration-200 text-left group`}
                        >
                          <div className={`text-base font-bold leading-none ${item.text}`}>{item.count}</div>
                          <div className="text-[10px] leading-tight text-muted-foreground mt-1 truncate">{item.label}</div>
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

      case "accountsReceivable": {
        const wArW = generateDashboardData(effectivePeriod.from, effectivePeriod.to).accountsReceivable;
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
              <CardHeader className="pb-3 relative">
                <div className="flex items-center gap-3 pr-20">
                  {isCustomizeMode && (
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <div className="p-2 bg-emerald-600/10 rounded-lg shrink-0">
                    <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base font-semibold leading-tight">
                      {getWidgetTitle(widget.type)}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Contas a receber por categoria
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
              <CardContent className="space-y-4">
                {/* Total a Receber */}
                <div className="p-4 rounded-lg bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      Total a Receber
                    </span>
                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                      +{wArW.growth}%
                    </Badge>
                  </div>
                  <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                    R$ {wArW.total.toLocaleString("pt-BR")},00
                  </div>
                </div>

                {/* Breakdown por categoria */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground">
                    Composição por Tipo
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                  {/* Planos de Crédito */}
                  <div className="flex flex-col gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-950/30 transition-colors">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                        Planos de Crédito
                      </span>
                    </div>
                    <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
                      R$ {wArW.creditPlans.toLocaleString("pt-BR")},00
                    </span>
                  </div>

                  {/* Pós-pagos */}
                  <div className="flex flex-col gap-2 p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-950/30 transition-colors">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />
                      <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                        Pós-pagos
                      </span>
                    </div>
                    <span className="text-sm font-bold text-purple-700 dark:text-purple-300">
                      R$ {wArW.postPaid.toLocaleString("pt-BR")},00
                    </span>
                  </div>

                  {/* Outros Contratos */}
                  <div className="flex flex-col gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-950/30 transition-colors">
                    <div className="flex items-center gap-2">
                      <FileDown className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                        Outros Contratos
                      </span>
                    </div>
                    <span className="text-sm font-bold text-amber-700 dark:text-amber-300">
                      R$ {wArW.others.toLocaleString("pt-BR")},00
                    </span>
                  </div>

                  {/* Recebido no período */}
                  <div className="flex flex-col gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 cursor-pointer hover:bg-green-100 dark:hover:bg-green-950/30 transition-colors">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                      <span className="text-xs font-medium text-green-700 dark:text-green-300">
                        Recebido
                      </span>
                    </div>
                    <span className="text-sm font-bold text-green-700 dark:text-green-300">
                      R$ {wArW.received.toLocaleString("pt-BR")},00
                    </span>
                  </div>
                </div>
                </div>

                {/* Ver Detalhes Button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 bg-transparent"
                  onClick={() =>
                    openChartModal(
                      widget.type,
                      "Contas a Receber — Composição",
                      "bar",
                      [
                        { date: "Planos de Crédito", value: wArW.creditPlans },
                        { date: "Pós-pagos", value: wArW.postPaid },
                        { date: "Outros", value: wArW.others },
                        { date: "Recebido", value: wArW.received },
                      ],
                    )
                  }
                >
                  Ver Detalhes
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        );
      }

      case "tasks": {
        const wTasksW = generateDashboardData(effectivePeriod.from, effectivePeriod.to).tasks;
        return (
          <Card className="overflow-hidden" data-widget-id={widget.type}>
            <CardHeader className="pb-4 relative">
              <div className="flex items-center gap-3 pr-20">
                <div className="p-2 bg-success/10 rounded-lg shrink-0">
                  <CheckSquare className="h-4 w-4 text-success" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base font-semibold leading-tight">Tarefas (Resumo)</CardTitle>
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
                { label: "Concluídas",  value: wTasksW.completed,  change: wTasksW.completedGrowth,  color: "text-success" },
                { label: "Em Execução", value: wTasksW.inProgress,  change: wTasksW.inProgressGrowth, color: "text-info" },
                { label: "Contratadas", value: wTasksW.contracted,  change: wTasksW.contractedGrowth, color: "text-warning" },
                { label: "Canceladas",  value: wTasksW.cancelled,   change: wTasksW.cancelledChange,  color: "text-destructive" },
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
                  <div className="h-2 bg-success rounded-full" style={{ width: `${wTasksW.slaCompliance}%` }} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      }

      case "nomadsIndicators": {
        const wNiW = generateDashboardData(effectivePeriod.from, effectivePeriod.to).nomadsIndicators;
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
                { label: "Taxa de Entrega",      value: `${wNiW.deliveryRate.toFixed(1).replace(".", ",")}%`,       icon: CheckSquare, color: "text-success" },
                { label: "Avaliação Média",      value: `${wNiW.avgRating.toFixed(1).replace(".", ",")} ★`,         icon: Star,        color: "text-warning" },
                { label: "Tempo Médio / Tarefa", value: `${wNiW.avgTimePerTask.toFixed(1).replace(".", ",")} dias`,  icon: Clock,       color: "text-info" },
                { label: "Nômades Certificados", value: `${wNiW.certified}%`,                                       icon: Award,       color: "text-chart-4" },
                { label: "Retenção 90 dias",     value: `${wNiW.retention90d}%`,                                    icon: TrendingUp,  color: "text-success" },
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

      case "activeUsers":
        return (
          <Card className="overflow-hidden" data-widget-id={widget.type}>
            <CardHeader className="pb-4 relative">
              <div className="flex items-center gap-3 pr-20">
                <div className="p-2 bg-success/10 rounded-lg shrink-0">
                  <UserCheck className="h-4 w-4 text-success" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base font-semibold leading-tight">Usuários Ativos</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Ativos por tipo de conta no período
                  </p>
                </div>
              </div>
              <WidgetExportButton
                widgetId={widget.type}
                widgetTitle={getWidgetTitle(widget.type)}
              />
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
                <p className="text-sm font-bold">
                  {auW.total.toLocaleString("pt-BR")}
                </p>
              </div>
            </CardContent>
          </Card>
        );

      case "partnerProgram":
        return (
          <Card className="overflow-hidden" data-widget-id={widget.type}>
            <CardHeader className="pb-4 relative">
              <div className="flex items-center gap-3 pr-20">
                <div className="p-2 bg-amber-500/10 rounded-lg shrink-0">
                  <Award className="h-4 w-4 text-amber-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base font-semibold leading-tight">
                    Programa Partner
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Convites e partners ativos por nível
                  </p>
                </div>
              </div>
              <WidgetExportButton
                widgetId={widget.type}
                widgetTitle={getWidgetTitle(widget.type)}
              />
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
                  {
                    label: "Pendentes",
                    value: ppW.pending,
                    color: "text-warning",
                  },
                  {
                    label: "Aceitos",
                    value: ppW.accepted,
                    color: "text-success",
                  },
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
                  R$ {ppW.mrrGenerated.toLocaleString("pt-BR")}
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
    localStorage.setItem("saved-dashboards", JSON.stringify(updatedDashboards));
    localStorage.setItem("current-dashboard-id", newDashboard.id);

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
    localStorage.setItem("saved-dashboards", JSON.stringify(updatedDashboards));

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
      localStorage.setItem("current-dashboard-id", dashboardId);
    }
  };

  const handleDeleteDashboard = (dashboardId: string) => {
    const updatedDashboards = savedDashboards.filter(
      (d) => d.id !== dashboardId,
    );
    setSavedDashboards(updatedDashboards);
    localStorage.setItem("saved-dashboards", JSON.stringify(updatedDashboards));
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
    localStorage.setItem("saved-dashboards", JSON.stringify(updatedDashboards));
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
    <div className="container mx-auto space-y-4 px-0 py-0">
      {/* Sticky Dashboard Header */}
      <div
        className={cn(
          "sticky top-[-3rem] z-20 -mx-14 px-14 transition-all duration-300",
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
          <div className="overflow-hidden shrink-0">
            <h1
              className={cn(
                "font-bold text-slate-900 dark:text-white tracking-tight transition-all duration-300",
                isHeaderCompact ? "text-base" : "text-3xl",
              )}
            >
              Painel Administrativo
            </h1>
            <p
              className={cn(
                "text-sm text-slate-500 dark:text-slate-400 transition-all duration-300 overflow-hidden",
                isHeaderCompact
                  ? "max-h-0 opacity-0 mt-0 mb-0"
                  : "max-h-[24px] opacity-100 mt-0.5",
              )}
            >
              Visão geral da plataforma em tempo real
            </p>
          </div>

          {/* Period Controls */}
          <div className="flex items-center gap-2 mx-3">
            <div className="flex items-center gap-0.5 bg-muted/50 dark:bg-muted/30 rounded-xl p-1 border border-border/50 shadow-sm">
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
                    {!["last_7_days", "last_30_days"].includes(
                      globalPeriod.type,
                    ) && globalPeriod.label !== "Últimos 90 dias" ? (
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
                <PopoverContent
                  className="w-72 p-0 overflow-hidden"
                  align="start"
                >
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
                    <p className="text-xs font-semibold">
                      Intervalo personalizado
                    </p>
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

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 ml-auto">
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

          {/* Dados Históricos */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => openHistoricalModal()}
            className="h-8 px-3 gap-1.5 text-xs font-medium border-amber-200 dark:border-amber-700 hover:border-amber-400 dark:hover:border-amber-500 dark:hover:bg-amber-950/30 text-amber-700 dark:text-amber-400"
          >
            <History className="h-3.5 w-3.5" />
            Histórico
            {Object.keys(historicalData).length > 0 && (
              <span className="ml-0.5 bg-amber-500 text-white rounded-full text-[9px] h-4 w-4 flex items-center justify-center shrink-0">
                {Object.keys(historicalData).length}
              </span>
            )}
          </Button>

          {/* Compartilhar Dashboard */}
          <Button
            variant="outline"
            size="sm"
            onClick={openDashboardPublicShare}
            className="h-8 px-3 gap-1.5 text-xs font-medium border-violet-200 dark:border-violet-600 hover:border-violet-400 dark:hover:border-violet-300 dark:hover:bg-violet-950/40"
          >
            <Share2 className="h-3.5 w-3.5" />
            Compartilhar
          </Button>

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

      {/* ── Public Share Dialog ───────────────────────────────────────────── */}
      <Dialog open={showPublicShareDialog} onOpenChange={setShowPublicShareDialog}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          {/* Brand gradient header strip */}
          <div
            className="px-6 pt-5 pb-4"
            style={{ background: "linear-gradient(135deg, #000000 0%, #1a2a6f 45%, #c81a7f 100%)" }}
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
          <Tabs value={shareActiveTab} onValueChange={setShareActiveTab} className="w-full">
            <TabsList className="grid grid-cols-3 w-full">
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
                  <div className={cn(
                    "mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0",
                    sharePermission === "view" ? "border-violet-500" : "border-muted-foreground",
                  )}>
                    {sharePermission === "view" && (
                      <div className="h-2 w-2 rounded-full bg-violet-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">Somente Visualizar</p>
                    <p className="text-xs text-muted-foreground">Acesso de leitura aos dados do dashboard</p>
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
                  <div className={cn(
                    "mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0",
                    sharePermission === "comment" ? "border-violet-500" : "border-muted-foreground",
                  )}>
                    {sharePermission === "comment" && (
                      <div className="h-2 w-2 rounded-full bg-violet-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">Visualizar + Comentar</p>
                    <p className="text-xs text-muted-foreground">Pode adicionar comentários e anotações</p>
                  </div>
                </button>
              </div>
            </TabsContent>

            {/* PIN */}
            <TabsContent value="pin" className="space-y-3 pt-2">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-sm font-medium">Proteger com PIN</p>
                  <p className="text-xs text-muted-foreground">Solicitar um PIN de 4 dígitos para acessar</p>
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
                  <Label htmlFor="share-pin" className="text-sm">PIN (4 dígitos)</Label>
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
                  {sharePinEnabled && sharePin.length > 0 && sharePin.length < 4 && (
                    <p className="text-xs text-destructive">Digite exatamente 4 dígitos</p>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Expiração */}
            <TabsContent value="expiry" className="space-y-3 pt-2">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-sm font-medium">Definir Expiração</p>
                  <p className="text-xs text-muted-foreground">O link deixa de funcionar após essa data</p>
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
                  <Label htmlFor="share-expiry" className="text-sm">Data de expiração</Label>
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
            <Button variant="ghost" size="sm" onClick={() => setShowPublicShareDialog(false)}>
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
              Insira dados reais para um mês específico. Serão aplicados sobre os dados gerados quando o período do dashboard corresponder a esse mês.
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
          <Accordion type="multiple" defaultValue={["financeiro"]} className="space-y-1">

            {/* Group 1: Financeiro */}
            <AccordionItem value="financeiro" className="border rounded-lg px-3">
              <AccordionTrigger className="text-sm font-semibold py-3">
                💰 Financeiro
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-2 gap-3 pb-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Receita Total (R$)</Label>
                    <Input type="number" placeholder="ex: 85000" value={histFormData.revenue_total ?? ""} onChange={(e) => setHistField("revenue_total", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">MRR (R$)</Label>
                    <Input type="number" placeholder="ex: 42000" value={histFormData.mrr_total ?? ""} onChange={(e) => setHistField("mrr_total", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Planos de Crédito (qtd)</Label>
                    <Input type="number" placeholder="ex: 120" value={histFormData.creditPlans_total ?? ""} onChange={(e) => setHistField("creditPlans_total", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Contas a Receber (R$)</Label>
                    <Input type="number" placeholder="ex: 15000" value={histFormData.accountsReceivable_total ?? ""} onChange={(e) => setHistField("accountsReceivable_total", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">CMV — Custo Total (R$)</Label>
                    <Input type="number" placeholder="ex: 18000" value={histFormData.cmv_totalCosts ?? ""} onChange={(e) => setHistField("cmv_totalCosts", e.target.value)} />
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
                    <Label className="text-xs text-muted-foreground">Projetos Ativos (qtd)</Label>
                    <Input type="number" placeholder="ex: 38" value={histFormData.activeProjects_total ?? ""} onChange={(e) => setHistField("activeProjects_total", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Tarefas Totais (qtd)</Label>
                    <Input type="number" placeholder="ex: 540" value={histFormData.tasks_total ?? ""} onChange={(e) => setHistField("tasks_total", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Tarefas Concluídas (qtd)</Label>
                    <Input type="number" placeholder="ex: 312" value={histFormData.tasks_completed ?? ""} onChange={(e) => setHistField("tasks_completed", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Tarefas Em Progresso (qtd)</Label>
                    <Input type="number" placeholder="ex: 95" value={histFormData.tasks_inProgress ?? ""} onChange={(e) => setHistField("tasks_inProgress", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">SLA Compliance (%)</Label>
                    <Input type="number" placeholder="ex: 89" min="0" max="100" value={histFormData.tasks_slaCompliance ?? ""} onChange={(e) => setHistField("tasks_slaCompliance", e.target.value)} />
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
                    <Label className="text-xs text-muted-foreground">Nômades Total (qtd)</Label>
                    <Input type="number" placeholder="ex: 210" value={histFormData.nomads_total ?? ""} onChange={(e) => setHistField("nomads_total", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Nômades Ativos (qtd)</Label>
                    <Input type="number" placeholder="ex: 178" value={histFormData.nomads_active ?? ""} onChange={(e) => setHistField("nomads_active", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Parceiros Ativos (qtd)</Label>
                    <Input type="number" placeholder="ex: 45" value={histFormData.partnerProgram_total ?? ""} onChange={(e) => setHistField("partnerProgram_total", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Convites Enviados (qtd)</Label>
                    <Input type="number" placeholder="ex: 90" value={histFormData.partnerProgram_invitesSent ?? ""} onChange={(e) => setHistField("partnerProgram_invitesSent", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">MRR Gerado Parceiros (R$)</Label>
                    <Input type="number" placeholder="ex: 6200" value={histFormData.partnerProgram_mrrGenerated ?? ""} onChange={(e) => setHistField("partnerProgram_mrrGenerated", e.target.value)} />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Group 4: Churn, Ticket & LTV */}
            <AccordionItem value="indicadores" className="border rounded-lg px-3">
              <AccordionTrigger className="text-sm font-semibold py-3">
                📊 Churn, Ticket &amp; LTV
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-2 gap-3 pb-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Churn de Receita (%)</Label>
                    <Input type="number" placeholder="ex: 3.2" step="0.1" value={histFormData.churn_revenueChurnRate ?? ""} onChange={(e) => setHistField("churn_revenueChurnRate", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Receita Perdida — Churn (R$)</Label>
                    <Input type="number" placeholder="ex: 1800" value={histFormData.churn_revenueChurn ?? ""} onChange={(e) => setHistField("churn_revenueChurn", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Ticket Médio Geral (R$)</Label>
                    <Input type="number" placeholder="ex: 950" value={histFormData.averageTicket_general ?? ""} onChange={(e) => setHistField("averageTicket_general", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">LTV (R$)</Label>
                    <Input type="number" placeholder="ex: 11400" value={histFormData.ltv_value ?? ""} onChange={(e) => setHistField("ltv_value", e.target.value)} />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Saved entries list */}
          {Object.keys(historicalData).length > 0 && (
            <div className="border-t border-border/40 pt-3 space-y-2">
              <p className="text-xs text-muted-foreground font-medium">Meses com dados salvos:</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(historicalData)
                  .sort(([a], [b]) => b.localeCompare(a))
                  .map(([key]) => {
                    const [y, m] = key.split("-").map(Number);
                    return (
                      <div key={key} className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md px-2 py-0.5">
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
            <Button variant="outline" onClick={() => setShowHistoricalModal(false)}>
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
