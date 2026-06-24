// @ts-nocheck
import { useState, useMemo } from "react";
import { useSidebar } from "@/contexts/sidebar-context";
import { useEmpresa } from "@/contexts/empresa-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageLoader } from "@/components/ui/loading";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DateRange } from "react-day-picker";
import {
  DollarSign,
  FolderKanban,
  CheckSquare,
  BarChart3,
  TrendingUp,
  Activity,
  ReceiptText,
  FileText,
  Eye,
  Download,
  Search,
  RefreshCw,
  Filter,
  Users,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CircleCheck,
  ListChecks,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useBatchIndicators } from "@/features/reports/hooks/use-indicator";
import { periodToDates } from "@/features/reports/types";

// ─── Report categories for company ────────────────────────────────────────────

const COMPANY_CATEGORIES = [
  {
    id: "financeiro",
    name: "Financeiro",
    icon: DollarSign,
    gradient: "from-emerald-500 to-emerald-600",
    lightBg: "bg-emerald-50 dark:bg-emerald-950/30",
    lightText: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-700/40",
    reports: [
      {
        id: "my_invoices",
        name: "Minhas Faturas",
        desc: "Histórico completo de faturas, pagamentos e status por período",
        icon: ReceiptText,
        formats: ["PDF", "XLSX"],
      },
      {
        id: "investments",
        name: "Investimentos por Projeto",
        desc: "Total investido por projeto, categoria e comparativo de períodos",
        icon: TrendingUp,
        formats: ["PDF", "XLSX"],
      },
      {
        id: "payment_flow",
        name: "Fluxo de Pagamentos",
        desc: "Entradas, pagamentos realizados e pendências financeiras",
        icon: BarChart3,
        formats: ["PDF"],
      },
    ],
  },
  {
    id: "projetos",
    name: "Projetos e Entregas",
    icon: FolderKanban,
    gradient: "from-blue-500 to-blue-600",
    lightBg: "bg-blue-50 dark:bg-blue-950/30",
    lightText: "text-blue-700 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-700/40",
    reports: [
      {
        id: "project_status",
        name: "Status dos Projetos",
        desc: "Visão geral do andamento, marcos e situação de cada projeto",
        icon: Activity,
        formats: ["PDF"],
      },
      {
        id: "deliveries",
        name: "Entregas e Progresso",
        desc: "Taxa de conclusão, tarefas entregues e qualidade das entregas",
        icon: CheckSquare,
        formats: ["PDF", "XLSX"],
      },
      {
        id: "timeline",
        name: "Timeline e Prazos",
        desc: "Projetos por prazo de entrega, atrasos e cronograma previsto",
        icon: CalendarDays,
        formats: ["PDF"],
      },
    ],
  },
  {
    id: "tarefas",
    name: "Tarefas e Atividades",
    icon: ListChecks,
    gradient: "from-violet-500 to-violet-600",
    lightBg: "bg-violet-50 dark:bg-violet-950/30",
    lightText: "text-violet-700 dark:text-violet-400",
    border: "border-violet-200 dark:border-violet-700/40",
    reports: [
      {
        id: "task_status",
        name: "Tarefas por Status",
        desc: "Distribuição de tarefas ativas, em revisão, concluídas e canceladas",
        icon: BarChart3,
        formats: ["PDF", "XLSX"],
      },
      {
        id: "delivery_performance",
        name: "Performance das Entregas",
        desc: "Velocidade de entrega, qualidade e taxa de aprovação",
        icon: CircleCheck,
        formats: ["PDF"],
      },
      {
        id: "team_activity",
        name: "Atividade da Equipe",
        desc: "Tarefas por nômade, categorias mais contratadas e produtividade",
        icon: Users,
        formats: ["XLSX"],
      },
    ],
  },
];

// ─── Live indicators for Indicadores tab ──────────────────────────────────────

const COMPANY_INDICATORS = [
  { id: "projetos_ativos",     label: "Projetos Ativos",     subtitle: "Em andamento",   gradient: "from-blue-500 to-blue-700" },
  { id: "tarefas_contratadas", label: "Tarefas Contratadas", subtitle: "No período",     gradient: "from-violet-500 to-purple-700" },
  { id: "tarefas_concluidas",  label: "Tarefas Concluídas",  subtitle: "Entregues",      gradient: "from-emerald-500 to-teal-700" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtBRL(v: number) {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(1)}k`;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function pct(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, gradient }: {
  label: string; value: string | number; sub?: string; gradient: string;
}) {
  return (
    <div className={cn("relative rounded-xl overflow-hidden shadow-sm px-4 pt-3 pb-2.5 bg-gradient-to-br", gradient)}>
      <p className="text-[11px] font-medium text-white/75 leading-tight mb-1 truncate">{label}</p>
      <p className="text-2xl font-bold text-white leading-none tabular-nums">{value}</p>
      {sub && <p className="text-[10px] text-white/60 mt-0.5 truncate">{sub}</p>}
    </div>
  );
}

function DistributionBar({ title, total, items }: {
  title: string;
  total: number;
  items: { label: string; count: number; color: string; textColor?: string }[];
}) {
  return (
    <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{title}</p>
        <span className="text-xs text-slate-400">{total} total</span>
      </div>
      {total === 0 ? (
        <p className="text-[11px] text-slate-400 text-center py-2">Sem dados</p>
      ) : (
        <>
          <div className="flex h-2 rounded-full overflow-hidden gap-px">
            {items.map((item) =>
              item.count > 0 ? (
                <div
                  key={item.label}
                  className={cn("h-full transition-all", item.color)}
                  style={{ width: `${pct(item.count, total)}%` }}
                  title={`${item.label}: ${item.count}`}
                />
              ) : null,
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            {items.map((item) => (
              <div key={item.label} className="flex items-center gap-1.5 min-w-0">
                <span className={cn("h-2 w-2 rounded-full shrink-0", item.color)} />
                <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{item.label}</span>
                <span className={cn("text-[10px] font-semibold ml-auto", item.textColor ?? "text-slate-700 dark:text-slate-300")}>
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ReportCard({ report, category, periodLabel }: {
  report: { id: string; name: string; desc: string; icon: any; formats: string[] };
  category: { lightBg: string; lightText: string; border: string };
  periodLabel: string;
}) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    await new Promise((r) => setTimeout(r, 800));
    setDownloading(false);
  }

  return (
    <div className="group bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className={cn("p-2 rounded-lg shrink-0 border", category.lightBg, category.border)}>
          <report.icon className={cn("h-3.5 w-3.5", category.lightText)} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 leading-snug">{report.name}</p>
          <p className="text-[11px] text-slate-400 mt-1 leading-snug line-clamp-2">{report.desc}</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 mt-auto">
        {report.formats.map((f) => (
          <span key={f} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
            <FileText className="h-2.5 w-2.5" />{f}
          </span>
        ))}
        <span className="ml-auto text-[10px] text-slate-400">{periodLabel}</span>
      </div>
      <div className="flex gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-700/60">
        <Button size="sm" className="flex-1 h-7 text-[11px] gap-1">
          <Eye className="h-3 w-3" />Visualizar
        </Button>
        <Button size="sm" variant="outline" disabled={downloading} onClick={handleDownload} className="h-7 px-2.5 text-[11px] gap-1" title={`Baixar ${report.formats[0]}`}>
          {downloading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
        </Button>
      </div>
    </div>
  );
}

function CategorySection({ category, search, periodLabel }: {
  category: typeof COMPANY_CATEGORIES[number]; search: string; periodLabel: string;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const visible = useMemo(() => {
    if (!search.trim()) return category.reports;
    const q = search.toLowerCase();
    return category.reports.filter((r) => r.name.toLowerCase().includes(q) || r.desc.toLowerCase().includes(q));
  }, [category.reports, search]);

  if (visible.length === 0) return null;

  return (
    <div className="space-y-3">
      <button className="w-full flex items-center gap-3 group text-left" onClick={() => setCollapsed((c) => !c)}>
        <div className={cn("p-2.5 rounded-lg text-white shadow-sm bg-gradient-to-br", category.gradient)}>
          <category.icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">{category.name}</h2>
            <span className="text-[11px] text-slate-400 font-normal">{visible.length} relatório{visible.length !== 1 ? "s" : ""}</span>
          </div>
        </div>
        {collapsed
          ? <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
          : <ChevronDown className="h-4 w-4 text-slate-400 group-hover:text-slate-600 transition-colors" />}
      </button>
      {!collapsed && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {visible.map((report) => (
            <ReportCard key={report.id} report={report} category={category} periodLabel={periodLabel} />
          ))}
        </div>
      )}
    </div>
  );
}

function IndicatorKpiCard({ label, subtitle, gradient, value, loading }: {
  label: string; subtitle: string; gradient: string; value: number | null; loading: boolean;
}) {
  const display = loading || value === null ? "—"
    : value >= 1_000_000 ? `${(value / 1_000_000).toFixed(1)}M`
    : value >= 1_000 ? `${(value / 1_000).toFixed(1)}k`
    : value.toLocaleString("pt-BR");

  return (
    <div className={cn("relative rounded-xl overflow-hidden shadow-sm px-4 pt-3 pb-2.5 bg-gradient-to-br", gradient, loading && "animate-pulse")}>
      <p className="text-[11px] font-medium text-white/75 leading-tight mb-1">{label}</p>
      <p className="text-2xl font-bold text-white leading-none tabular-nums">{display}</p>
      <p className="text-[10px] text-white/60 mt-0.5">{subtitle}</p>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CompanyRelatoriosPage() {
  useSidebar();

  const { profile, projects, tasks, invoices, loading, refetch } = useEmpresa();

  const [activeTab, setActiveTab] = useState<"overview" | "indicators">("overview");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateRange, setDateRange] = useState<"7" | "30" | "90" | "365" | "custom">("30");
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined);
  const [pickerOpen, setPickerOpen] = useState(false);

  // ── Period bounds ──────────────────────────────────────────────────────────
  const { periodStart, periodEnd } = useMemo(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    if (dateRange === "custom") {
      if (customRange?.from) {
        const start = new Date(customRange.from);
        start.setHours(0, 0, 0, 0);
        const customEnd = customRange.to ? new Date(customRange.to) : new Date();
        customEnd.setHours(23, 59, 59, 999);
        return { periodStart: start, periodEnd: customEnd };
      }
      // Custom clicado mas nenhuma data selecionada ainda → fallback 30d
      const start = new Date();
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      return { periodStart: start, periodEnd: end };
    }

    const days = Number(dateRange);
    const start = new Date();
    start.setDate(start.getDate() - (isNaN(days) ? 30 : days));
    start.setHours(0, 0, 0, 0);
    return { periodStart: start, periodEnd: end };
  }, [dateRange, customRange]);

  const periodLabel = useMemo(() => {
    if (dateRange === "custom" && customRange?.from) {
      const fmt = (d: Date) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      return customRange.to
        ? `${fmt(customRange.from)} – ${fmt(customRange.to)}`
        : fmt(customRange.from);
    }
    return dateRange === "7" ? "7 dias" : dateRange === "30" ? "30 dias" : dateRange === "90" ? "90 dias" : "1 ano";
  }, [dateRange, customRange]);

  function inPeriod(date: string | undefined) {
    if (!date) return false;
    const d = new Date(date);
    return d >= periodStart && d <= periodEnd;
  }

  // ── Filtered datasets ──────────────────────────────────────────────────────
  // Projects: by startDate
  const filteredProjects = useMemo(
    () => projects.filter((p) => inPeriod(p.startDate)),
    [projects, periodStart, periodEnd],
  );
  // Tasks: by dueDate (for distribution); by deliveredAt for "done" KPI
  const filteredTasks = useMemo(
    () => tasks.filter((t) => inPeriod(t.dueDate)),
    [tasks, periodStart, periodEnd],
  );
  // Invoices: by issuedAt (for distribution)
  const filteredInvoices = useMemo(
    () => invoices.filter((i) => inPeriod(i.issuedAt)),
    [invoices, periodStart, periodEnd],
  );

  // ── KPIs (each uses the most meaningful date for that metric) ─────────────
  const activeProjects = useMemo(
    () => filteredProjects.filter((p) => ["briefing", "producao", "revisao"].includes(p.status)).length,
    [filteredProjects],
  );
  const tasksInProgress = useMemo(
    () => filteredTasks.filter((t) => ["in_progress", "review"].includes(t.status)).length,
    [filteredTasks],
  );
  // Tarefas concluídas: usa deliveredAt (data real de entrega)
  const tasksDone = useMemo(
    () => tasks.filter((t) => t.status === "done" && inPeriod(t.deliveredAt || t.dueDate)).length,
    [tasks, periodStart, periodEnd],
  );
  // Total pago: usa paidAt (data do pagamento efetivo)
  const paidAmount = useMemo(
    () => invoices
      .filter((i) => i.status === "paid" && inPeriod(i.paidAt || i.issuedAt))
      .reduce((s, i) => s + i.amount, 0),
    [invoices, periodStart, periodEnd],
  );
  // Pendentes e em atraso: por issuedAt (emitidas no período)
  const pendingCount = useMemo(() => filteredInvoices.filter((i) => i.status === "pending").length, [filteredInvoices]);
  const overdueCount = useMemo(() => filteredInvoices.filter((i) => i.status === "overdue").length, [filteredInvoices]);

  // ── Status distributions (filtered) ───────────────────────────────────────
  const projectDist = useMemo(() => {
    const c = (s: string) => filteredProjects.filter((p) => p.status === s).length;
    return [
      { label: "Briefing",  count: c("briefing"),  color: "bg-amber-400",   textColor: "text-amber-600" },
      { label: "Produção",  count: c("producao"),  color: "bg-blue-400",    textColor: "text-blue-600" },
      { label: "Revisão",   count: c("revisao"),   color: "bg-violet-400",  textColor: "text-violet-600" },
      { label: "Entregue",  count: c("entregue"),  color: "bg-emerald-400", textColor: "text-emerald-600" },
      { label: "Cancelado", count: c("cancelado"), color: "bg-red-400",     textColor: "text-red-500" },
    ];
  }, [filteredProjects]);

  const taskDist = useMemo(() => {
    const c = (s: string) => filteredTasks.filter((t) => t.status === s).length;
    return [
      { label: "Disponível",   count: c("available"),   color: "bg-slate-300",   textColor: "text-slate-500" },
      { label: "Em andamento", count: c("in_progress"), color: "bg-blue-400",    textColor: "text-blue-600" },
      { label: "Em revisão",   count: c("review"),      color: "bg-amber-400",   textColor: "text-amber-600" },
      { label: "Concluída",    count: c("done"),        color: "bg-emerald-400", textColor: "text-emerald-600" },
      { label: "Cancelada",    count: c("cancelled"),   color: "bg-red-400",     textColor: "text-red-500" },
    ];
  }, [filteredTasks]);

  const invoiceDist = useMemo(() => {
    const c = (s: string) => filteredInvoices.filter((i) => i.status === s).length;
    return [
      { label: "Pendente",  count: c("pending"),   color: "bg-amber-400",   textColor: "text-amber-600" },
      { label: "Paga",      count: c("paid"),      color: "bg-emerald-400", textColor: "text-emerald-600" },
      { label: "Em atraso", count: c("overdue"),   color: "bg-red-400",     textColor: "text-red-500" },
      { label: "Cancelada", count: c("cancelled"), color: "bg-slate-300",   textColor: "text-slate-500" },
    ];
  }, [filteredInvoices]);

  // ── Live indicators ────────────────────────────────────────────────────────
  const { startDate, endDate } = useMemo(() => ({
    startDate: periodStart.toISOString().slice(0, 10),
    endDate: periodEnd.toISOString().slice(0, 10),
  }), [periodStart, periodEnd]);
  const indicatorRequests = useMemo(
    () => COMPANY_INDICATORS.map(({ id }) => ({ indicatorId: id, startDate, endDate })),
    [startDate, endDate],
  );
  const { data: indData, loading: indLoading } = useBatchIndicators(
    indicatorRequests,
    activeTab === "indicators",
  );
  const indById = useMemo(() => {
    const m: Record<string, any> = {};
    for (const d of indData) m[d.indicatorId] = d;
    return m;
  }, [indData]);

  // ── Filtered categories ────────────────────────────────────────────────────
  const visibleCategories = useMemo(() => {
    return COMPANY_CATEGORIES.filter((cat) => {
      if (categoryFilter !== "all" && cat.id !== categoryFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return cat.reports.some((r) => r.name.toLowerCase().includes(q) || r.desc.toLowerCase().includes(q));
    });
  }, [categoryFilter, search]);

  if (loading) return <PageLoader text="Carregando relatórios…" />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Relatórios</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {profile?.name ?? "Empresa"} · dados do seu painel
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            {(["7", "30", "90", "365"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setDateRange(v)}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-medium transition-all",
                  dateRange === v
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300",
                )}
              >
                {v === "365" ? "1a" : `${v}d`}
              </button>
            ))}
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <button
                  onClick={() => setDateRange("custom")}
                  className={cn(
                    "flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium transition-all",
                    dateRange === "custom"
                      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300",
                  )}
                >
                  <CalendarDays className="h-3 w-3" />
                  {dateRange === "custom" && customRange?.from ? periodLabel : "Custom"}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={customRange}
                  onSelect={(range) => {
                    setCustomRange(range);
                    setDateRange("custom");
                    if (range?.from && range?.to) setPickerOpen(false);
                  }}
                  numberOfMonths={2}
                  toDate={new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>
          <Button variant="outline" size="sm" onClick={refetch} className="h-8 gap-1.5 text-xs">
            <RefreshCw className="h-3.5 w-3.5" />Atualizar
          </Button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard label="Projetos Ativos"  value={activeProjects}       sub={`de ${projects.length} projetos`}  gradient="from-blue-500 to-blue-700" />
        <KpiCard label="Em Andamento"     value={tasksInProgress}      sub="tarefas ativas"                    gradient="from-violet-500 to-purple-700" />
        <KpiCard label="Tarefas Concluídas" value={tasksDone}          sub={`de ${tasks.length} tarefas`}      gradient="from-emerald-500 to-teal-700" />
        <KpiCard label="Total Pago"       value={fmtBRL(paidAmount)}   sub="faturas quitadas"                  gradient="from-teal-500 to-teal-700" />
        <KpiCard label="Aguardando Pag."  value={pendingCount}         sub={pendingCount ? "faturas pendentes" : "nenhuma pendência"} gradient="from-amber-500 to-orange-600" />
        <KpiCard
          label="Em Atraso"
          value={overdueCount}
          sub={overdueCount ? "faturas vencidas" : "sem atrasos"}
          gradient={overdueCount > 0 ? "from-red-500 to-red-700" : "from-slate-400 to-slate-600"}
        />
      </div>

      {/* Overdue alert */}
      {overdueCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-xl">
          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-400">
            Você tem <strong>{overdueCount} fatura{overdueCount > 1 ? "s" : ""} em atraso</strong>. Regularize para evitar suspensão dos serviços.
          </p>
          <Button size="sm" variant="destructive" className="ml-auto h-7 text-xs shrink-0">
            Ver faturas
          </Button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-700">
        {(["overview", "indicators"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium transition-colors relative",
              activeTab === tab
                ? "text-primary"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300",
            )}
          >
            {tab === "overview" ? "Visão Geral" : "Indicadores"}
            {activeTab === tab && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {/* ══ VISÃO GERAL ════════════════════════════════════════════════════ */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Distribution panels */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <DistributionBar title="Projetos por Status" total={filteredProjects.length} items={projectDist} />
            <DistributionBar title="Tarefas por Status"  total={filteredTasks.length}    items={taskDist} />
            <DistributionBar title="Faturas por Status"  total={filteredInvoices.length} items={invoiceDist} />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-45 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input placeholder="Buscar relatório…" className="pl-9 h-8 text-xs" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-8 w-52 text-xs">
                <Filter className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {COMPANY_CATEGORIES.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {(search || categoryFilter !== "all") && (
              <Button variant="ghost" size="sm" className="h-8 text-xs text-slate-500" onClick={() => { setSearch(""); setCategoryFilter("all"); }}>
                Limpar filtros
              </Button>
            )}
            <span className="ml-auto text-xs text-slate-400">
              {COMPANY_CATEGORIES.reduce((s, c) => s + c.reports.length, 0)} relatórios disponíveis
            </span>
          </div>

          {/* Report categories */}
          {visibleCategories.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-slate-400 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
              <BarChart3 className="h-10 w-10 opacity-30" />
              <p className="text-sm">Nenhum relatório encontrado</p>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { setSearch(""); setCategoryFilter("all"); }}>
                Limpar filtros
              </Button>
            </div>
          ) : (
            <div className="space-y-8">
              {visibleCategories.map((cat) => (
                <CategorySection key={cat.id} category={cat} search={search} periodLabel={periodLabel} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ INDICADORES ════════════════════════════════════════════════════ */}
      {activeTab === "indicators" && (
        <div className="space-y-6">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Indicadores ao vivo calculados com base nos dados do período selecionado.
          </p>

          {/* Live indicators from API */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {COMPANY_INDICATORS.map(({ id, label, subtitle, gradient }) => (
              <IndicatorKpiCard
                key={id}
                label={label}
                subtitle={subtitle}
                gradient={gradient}
                value={indById[id]?.value ?? null}
                loading={indLoading}
              />
            ))}
          </div>

          {/* Detailed breakdown panels from empresa context */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Projects breakdown */}
            <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-700/40">
                  <FolderKanban className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Projetos</p>
                  <p className="text-[11px] text-slate-400">{filteredProjects.length} projetos no período</p>
                </div>
              </div>
              <div className="space-y-2">
                {projectDist.filter((d) => d.count > 0).map((d) => (
                  <div key={d.label} className="flex items-center gap-2">
                    <span className={cn("h-2 w-2 rounded-full shrink-0", d.color)} />
                    <span className="text-xs text-slate-600 dark:text-slate-300 flex-1">{d.label}</span>
                    <span className={cn("text-xs font-semibold", d.textColor)}>{d.count}</span>
                    <span className="text-[10px] text-slate-400 w-8 text-right">{pct(d.count, filteredProjects.length)}%</span>
                  </div>
                ))}
                {filteredProjects.length === 0 && <p className="text-[11px] text-slate-400 text-center py-1">Sem projetos no período</p>}
              </div>
            </div>

            {/* Tasks breakdown */}
            <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-700/40">
                  <ListChecks className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Tarefas</p>
                  <p className="text-[11px] text-slate-400">{filteredTasks.length} tarefas no período</p>
                </div>
              </div>
              <div className="space-y-2">
                {taskDist.filter((d) => d.count > 0).map((d) => (
                  <div key={d.label} className="flex items-center gap-2">
                    <span className={cn("h-2 w-2 rounded-full shrink-0", d.color)} />
                    <span className="text-xs text-slate-600 dark:text-slate-300 flex-1">{d.label}</span>
                    <span className={cn("text-xs font-semibold", d.textColor)}>{d.count}</span>
                    <span className="text-[10px] text-slate-400 w-8 text-right">{pct(d.count, filteredTasks.length)}%</span>
                  </div>
                ))}
                {filteredTasks.length === 0 && <p className="text-[11px] text-slate-400 text-center py-1">Sem tarefas no período</p>}
              </div>
            </div>

            {/* Financial breakdown */}
            <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-700/40">
                  <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Financeiro</p>
                  <p className="text-[11px] text-slate-400">{filteredInvoices.length} faturas no período</p>
                </div>
              </div>
              <div className="space-y-2">
                {invoiceDist.filter((d) => d.count > 0).map((d) => (
                  <div key={d.label} className="flex items-center gap-2">
                    <span className={cn("h-2 w-2 rounded-full shrink-0", d.color)} />
                    <span className="text-xs text-slate-600 dark:text-slate-300 flex-1">{d.label}</span>
                    <span className={cn("text-xs font-semibold", d.textColor)}>{d.count}</span>
                    <span className="text-[10px] text-slate-400 w-8 text-right">{pct(d.count, filteredInvoices.length)}%</span>
                  </div>
                ))}
                {filteredInvoices.length === 0 && <p className="text-[11px] text-slate-400 text-center py-1">Sem faturas no período</p>}
              </div>
              {paidAmount > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">Total pago</span>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{fmtBRL(paidAmount)}</span>
                  </div>
                  {profile?.totalInvested ? (
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">Total investido</span>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{fmtBRL(profile.totalInvested)}</span>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
