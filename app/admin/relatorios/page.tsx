// @ts-nocheck
import { useState, useEffect, useCallback, useMemo } from "react";
import { useSidebar } from "@/contexts/sidebar-context";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageLoader } from "@/components/ui/loading";
import {
  Users,
  DollarSign,
  Download,
  FileText,
  Eye,
  Activity,
  Settings,
  Award,
  Tag,
  Search,
  RefreshCw,
  TrendingUp,
  Building2,
  FolderKanban,
  CheckSquare,
  Banknote,
  BarChart3,
  Shield,
  ChevronDown,
  ChevronRight,
  ReceiptText,
  Star,
  Megaphone,
  Cpu,
  Lock,
  Filter,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(value) {
  return (value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtNum(n) {
  return (n || 0).toLocaleString("pt-BR");
}

// ─── Report catalog data ───────────────────────────────────────────────────────

const CATEGORIES = [
  {
    id: "financial",
    name: "Financeiro",
    icon: DollarSign,
    gradient: "from-emerald-500 to-emerald-600",
    lightBg: "bg-emerald-50 dark:bg-emerald-950/30",
    lightText: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-700/40",
    reports: [
      { id: "revenue",   name: "Receitas e Faturamento",   desc: "Análise detalhada de receitas por período, empresa e projeto", icon: TrendingUp, formats: ["PDF", "XLSX"] },
      { id: "invoices",  name: "Faturas e Cobranças",       desc: "Gestão de faturas, inadimplência e histórico de pagamentos",    icon: ReceiptText, formats: ["PDF", "XLSX"] },
      { id: "cashflow",  name: "Fluxo de Caixa",            desc: "Movimentações financeiras, entradas e saídas",                  icon: BarChart3, formats: ["PDF"] },
      { id: "withdrawals",name: "Saques de Parceiros",      desc: "Solicitações, aprovações e pagamentos de saques",               icon: Banknote, formats: ["XLSX"] },
    ],
  },
  {
    id: "operations",
    name: "Operações",
    icon: Activity,
    gradient: "from-blue-500 to-blue-600",
    lightBg: "bg-blue-50 dark:bg-blue-950/30",
    lightText: "text-blue-700 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-700/40",
    reports: [
      { id: "projects",   name: "Projetos e Entregas",        desc: "Status, progresso e métricas de projetos ativos",             icon: FolderKanban, formats: ["PDF", "XLSX"] },
      { id: "tasks",      name: "Tarefas e Atividades",       desc: "Acompanhamento de execução, aprovação e rejeição de tarefas", icon: CheckSquare, formats: ["PDF", "XLSX"] },
      { id: "availability",name: "Disponibilidade de Nômades",desc: "Capacidade, alocação e agenda dos profissionais",             icon: Users, formats: ["PDF"] },
      { id: "performance",name: "Performance Operacional",    desc: "KPIs operacionais, SLAs e indicadores de qualidade",          icon: BarChart3, formats: ["PDF"] },
    ],
  },
  {
    id: "users",
    name: "Usuários e Clientes",
    icon: Users,
    gradient: "from-violet-500 to-violet-600",
    lightBg: "bg-violet-50 dark:bg-violet-950/30",
    lightText: "text-violet-700 dark:text-violet-400",
    border: "border-violet-200 dark:border-violet-700/40",
    reports: [
      { id: "companies",   name: "Empresas Clientes",      desc: "Cadastro, status e histórico de empresas parceiras",            icon: Building2, formats: ["PDF", "XLSX"] },
      { id: "nomades",     name: "Nômades e Freelancers",  desc: "Profissionais cadastrados, níveis, performance e atividade",   icon: Users, formats: ["PDF", "XLSX"] },
      { id: "engagement",  name: "Engajamento de Usuários",desc: "Atividade, retenção e padrões de uso da plataforma",           icon: Activity, formats: ["PDF"] },
      { id: "satisfaction",name: "Satisfação e NPS",       desc: "Feedback, avaliações e Net Promoter Score",                   icon: Star, formats: ["PDF"] },
    ],
  },
  {
    id: "gamification",
    name: "Gamificação",
    icon: Award,
    gradient: "from-amber-500 to-amber-600",
    lightBg: "bg-amber-50 dark:bg-amber-950/30",
    lightText: "text-amber-700 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-700/40",
    reports: [
      { id: "levels",      name: "Níveis e Progressão",  desc: "Evolução de níveis, pontos e histórico de upgrades",    icon: Award, formats: ["PDF", "XLSX"] },
      { id: "achievements",name: "Conquistas e Badges",  desc: "Sistema de recompensas e conquistas desbloqueadas",     icon: Star, formats: ["PDF"] },
      { id: "leaderboard", name: "Ranking e Performance",desc: "Top performers, classificação e competições internas",  icon: TrendingUp, formats: ["PDF"] },
    ],
  },
  {
    id: "marketing",
    name: "Marketing",
    icon: Megaphone,
    gradient: "from-pink-500 to-rose-600",
    lightBg: "bg-pink-50 dark:bg-pink-950/30",
    lightText: "text-pink-700 dark:text-pink-400",
    border: "border-pink-200 dark:border-pink-700/40",
    reports: [
      { id: "campaigns",  name: "Campanhas de Marketing",desc: "Performance de campanhas, alcance e conversão",          icon: Megaphone, formats: ["PDF", "XLSX"] },
      { id: "referrals",  name: "Indicações e Referrals",desc: "Programa de indicação, conversões e recompensas",        icon: Users, formats: ["XLSX"] },
      { id: "promotions", name: "Promoções e Cupons",    desc: "Uso de descontos, cupons e impacto no faturamento",      icon: Tag, formats: ["PDF", "XLSX"] },
      { id: "conversion", name: "Conversão e Funil",     desc: "Jornada do cliente, drop-off e taxa de conversão",      icon: BarChart3, formats: ["PDF"] },
    ],
  },
  {
    id: "system",
    name: "Sistema",
    icon: Cpu,
    gradient: "from-slate-500 to-slate-600",
    lightBg: "bg-slate-100 dark:bg-slate-800/50",
    lightText: "text-slate-700 dark:text-slate-300",
    border: "border-slate-200 dark:border-slate-600/40",
    reports: [
      { id: "audit",      name: "Auditoria e Logs",       desc: "Histórico completo de ações, alterações e eventos",       icon: Shield, formats: ["PDF", "XLSX"] },
      { id: "security",   name: "Segurança e Acessos",    desc: "Tentativas de acesso, permissões e controle de sessões",  icon: Lock, formats: ["PDF"] },
      { id: "integrations",name:"Integrações e APIs",     desc: "Status, uso e erros das integrações externas",           icon: Settings, formats: ["XLSX"] },
      { id: "perf-sys",   name: "Performance do Sistema", desc: "Tempo de resposta, disponibilidade e uso de recursos",    icon: Cpu, formats: ["PDF"] },
    ],
  },
];

// ─── Stat badge tied to dashboard data ────────────────────────────────────────

function StatBadge({ value, label, loading }) {
  if (loading) return <span className="text-slate-400 text-xs">—</span>;
  return (
    <span className="text-xs text-slate-500 dark:text-slate-400">
      {fmtNum(value)} {label}
    </span>
  );
}

// ─── Category section ────────────────────────────────────────────────────────

function CategorySection({ category, stats, statsLoading, search, dateRange }) {
  const [collapsed, setCollapsed] = useState(false);

  const visibleReports = useMemo(() => {
    if (!search.trim()) return category.reports;
    const q = search.toLowerCase();
    return category.reports.filter(
      (r) => r.name.toLowerCase().includes(q) || r.desc.toLowerCase().includes(q)
    );
  }, [category.reports, search]);

  if (visibleReports.length === 0) return null;

  // Pick a relevant counter from dashboard stats for this category
  function getCategoryMeta() {
    if (!stats) return null;
    if (category.id === "financial")    return `${fmtNum(stats.financial?.totalInvoices)} faturas · ${fmt(stats.financial?.totalRevenue)} arrecadados`;
    if (category.id === "operations")   return `${fmtNum(stats.projects?.total)} projetos · ${fmtNum(stats.tasks?.total)} tarefas`;
    if (category.id === "users")        return `${fmtNum(stats.companies?.total)} empresas · ${fmtNum(stats.nomades?.total)} nômades`;
    if (category.id === "gamification") return `${fmtNum(stats.nomades?.total)} participantes`;
    return null;
  }

  const meta = getCategoryMeta();

  return (
    <div className="space-y-3">
      {/* category header */}
      <button
        className="w-full flex items-center gap-3 group text-left"
        onClick={() => setCollapsed((c) => !c)}
      >
        <div className={`p-2.5 rounded-lg bg-gradient-to-br ${category.gradient} text-white shadow-sm`}>
          <category.icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">{category.name}</h2>
            <span className="text-[11px] text-slate-400 font-normal">
              {visibleReports.length} relatório{visibleReports.length !== 1 ? "s" : ""}
            </span>
          </div>
          {!statsLoading && meta && (
            <p className="text-xs text-slate-400 mt-0.5">{meta}</p>
          )}
        </div>
        {collapsed
          ? <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
          : <ChevronDown className="h-4 w-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
        }
      </button>

      {/* cards grid */}
      {!collapsed && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 pl-0">
          {visibleReports.map((report) => (
            <ReportCard key={report.id} report={report} category={category} dateRange={dateRange} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Report card ──────────────────────────────────────────────────────────────

function ReportCard({ report, category, dateRange }) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload(format) {
    setDownloading(true);
    // Simulate — in a real scenario this would call an export endpoint
    await new Promise((r) => setTimeout(r, 800));
    setDownloading(false);
  }

  return (
    <div className="group relative bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all flex flex-col gap-3">
      {/* icon + title */}
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${category.lightBg} ${category.border} border shrink-0`}>
          <report.icon className={`h-3.5 w-3.5 ${category.lightText}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 leading-snug">{report.name}</p>
          <p className="text-[11px] text-slate-400 mt-1 leading-snug line-clamp-2">{report.desc}</p>
        </div>
      </div>

      {/* format badges */}
      <div className="flex items-center gap-1.5 mt-auto">
        {report.formats.map((fmt) => (
          <span
            key={fmt}
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
          >
            <FileText className="h-2.5 w-2.5" />
            {fmt}
          </span>
        ))}
        <span className="ml-auto text-[10px] text-slate-400">
          {dateRange === "7"   ? "7 dias"
          : dateRange === "30"  ? "30 dias"
          : dateRange === "90"  ? "90 dias"
          : dateRange === "365" ? "1 ano"
          : "Personalizado"}
        </span>
      </div>

      {/* actions */}
      <div className="flex gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-700/60">
        <Button
          size="sm"
          className="flex-1 h-7 text-[11px] gap-1"
        >
          <Eye className="h-3 w-3" />
          Visualizar
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={downloading}
          onClick={() => handleDownload(report.formats[0])}
          className="h-7 px-2.5 text-[11px] gap-1"
          title={`Baixar ${report.formats[0]}`}
        >
          {downloading
            ? <RefreshCw className="h-3 w-3 animate-spin" />
            : <Download className="h-3 w-3" />
          }
        </Button>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function AdminRelatoriosPage() {
  useSidebar();

  const [stats, setStats] = useState(null);
  const [summary, setSummary] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateRange, setDateRange] = useState("30");

  // ── load data ──────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setStatsLoading(true);
    try {
      const [dashStats, rptSummary] = await Promise.all([
        apiClient.getDashboardStats(),
        apiClient.getReportSummary(),
      ]);
      setStats(dashStats);
      setSummary(rptSummary);
    } catch (err) {
      console.error("[Relatorios] load:", err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── filtered categories ───────────────────────────────────────────────────
  const visibleCategories = useMemo(() => {
    return CATEGORIES.filter((cat) => {
      if (categoryFilter !== "all" && cat.id !== categoryFilter) return false;
      if (search.trim()) {
        return cat.reports.some(
          (r) =>
            r.name.toLowerCase().includes(search.toLowerCase()) ||
            r.desc.toLowerCase().includes(search.toLowerCase())
        );
      }
      return true;
    });
  }, [categoryFilter, search]);

  // ── total reports visible ──────────────────────────────────────────────────
  const totalReports = useMemo(
    () => CATEGORIES.reduce((s, c) => s + c.reports.length, 0),
    []
  );

  if (statsLoading && !stats) {
    return <PageLoader text="Carregando relatórios…" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Relatórios</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {totalReports} relatórios disponíveis em {CATEGORIES.length} categorias
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} className="h-8 gap-1.5 text-xs">
          <RefreshCw className="h-3.5 w-3.5" /> Atualizar dados
        </Button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: "Empresas",       value: stats?.companies?.total,            icon: Building2,   color: "text-violet-500" },
          { label: "Projetos",       value: stats?.projects?.total,             icon: FolderKanban, color: "text-blue-500" },
          { label: "Nômades",        value: stats?.nomades?.total,              icon: Users,        color: "text-indigo-500" },
          { label: "Tarefas",        value: stats?.tasks?.total,                icon: CheckSquare,  color: "text-amber-500" },
          { label: "Faturas",        value: stats?.financial?.totalInvoices,    icon: ReceiptText,  color: "text-emerald-500" },
          { label: "Receita Paga",   value: fmt(stats?.financial?.totalRevenue), icon: DollarSign,  color: "text-emerald-600", isText: true },
        ].map(({ label, value, icon: Icon, color, isText }) => (
          <div key={label} className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-3 flex items-center gap-2.5">
            <div className={`p-1.5 rounded-lg bg-slate-50 dark:bg-slate-700`}>
              <Icon className={`h-3.5 w-3.5 ${color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium leading-none mb-0.5">{label}</p>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100 tabular-nums truncate">
                {statsLoading ? "—" : isText ? value : fmtNum(value)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Buscar relatório…"
            className="pl-9 h-8 text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="h-8 w-44 text-xs">
            <Filter className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="h-8 w-40 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
            <SelectItem value="365">Último ano</SelectItem>
          </SelectContent>
        </Select>
        {(search || categoryFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-slate-500"
            onClick={() => { setSearch(""); setCategoryFilter("all"); }}
          >
            Limpar filtros
          </Button>
        )}
      </div>

      {/* Summary metrics from reports/summary */}
      {summary && !statsLoading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Top performers teaser */}
          <div className="col-span-2 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/20 dark:to-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Award className="h-4 w-4 text-amber-600" />
              <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">Top Nômades</p>
            </div>
            <div className="space-y-2">
              {(summary.nomades?.topPerformers || []).slice(0, 3).map((n, i) => (
                <div key={n.id} className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold w-4 shrink-0 ${i === 0 ? "text-amber-500" : i === 1 ? "text-slate-400" : "text-amber-700/60"}`}>
                    #{i + 1}
                  </span>
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate flex-1">{n.name}</p>
                  <span className="text-[10px] text-slate-400 tabular-nums">{fmtNum(n.score)} pts</span>
                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 capitalize">{n.level}</Badge>
                </div>
              ))}
              {(!summary.nomades?.topPerformers?.length) && (
                <p className="text-xs text-slate-400">Nenhum dado disponível</p>
              )}
            </div>
          </div>

          {/* Task status breakdown */}
          <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckSquare className="h-4 w-4 text-blue-500" />
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">Tarefas</p>
            </div>
            <div className="space-y-1.5">
              {(summary.tasks?.byStatus || []).map((s) => (
                <div key={s.status} className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">{s.status.replace("_", " ")}</span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 tabular-nums">{fmtNum(s._count)}</span>
                </div>
              ))}
              {(!summary.tasks?.byStatus?.length) && (
                <p className="text-xs text-slate-400">Nenhum dado</p>
              )}
            </div>
          </div>

          {/* Project status breakdown */}
          <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <FolderKanban className="h-4 w-4 text-violet-500" />
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">Projetos</p>
            </div>
            <div className="space-y-1.5">
              {(summary.projects?.byStatus || []).map((s) => (
                <div key={s.status} className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">{s.status.replace("-", " ")}</span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 tabular-nums">{fmtNum(s._count)}</span>
                </div>
              ))}
              {(!summary.projects?.byStatus?.length) && (
                <p className="text-xs text-slate-400">Nenhum dado</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Report categories */}
      <div className="space-y-8">
        {visibleCategories.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-slate-400">
            <BarChart3 className="h-10 w-10 opacity-30" />
            <p className="text-sm">Nenhum relatório encontrado</p>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { setSearch(""); setCategoryFilter("all"); }}>
              Limpar filtros
            </Button>
          </div>
        ) : (
          visibleCategories.map((cat) => (
            <CategorySection
              key={cat.id}
              category={cat}
              stats={stats}
              statsLoading={statsLoading}
              search={search}
              dateRange={dateRange}
            />
          ))
        )}
      </div>
    </div>
  );
}
