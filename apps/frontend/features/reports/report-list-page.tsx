// @ts-nocheck
import { useState, useEffect, useCallback, useMemo } from "react";
import { useSidebar } from "@/contexts/sidebar-context";
import { usePartner } from "@/contexts/partner-context";
import { apiClient } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
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
  STANDARD_SHELL_PANEL_CLASS,
  StandardPageBanner,
} from "@/components/standard-page-shell";
import { PinToTrayButton } from "@/components/pin-to-tray-button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Search,
  RefreshCw,
  Filter,
  FileText,
  Eye,
  Download,
  Lock,
  BarChart3,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { CATEGORIES } from "./report-catalog";
import type { AvailableReport } from "./types";
import { useBatchIndicators } from "./hooks/use-indicator";
import { IndicatorWidget } from "./components/indicator-widget";
import { periodToDates } from "./types";
import type { IndicatorResult } from "./types";
import { exportReportSummaryPDF } from "./report-export";
import { StandardModalDialog } from "@/components/standard-modal-dialog";

function dateRangeLabel(dateRange: string) {
  return dateRange === "7"   ? "7 dias"
    : dateRange === "30"  ? "30 dias"
    : dateRange === "90"  ? "90 dias"
    : dateRange === "365" ? "1 ano"
    : "Personalizado";
}

// ─── Profile indicator config ─────────────────────────────────────────────────

type ProfileType = "agency" | "company" | "nomades" | "parceiro" | "lider";

const PROFILE_KPIS: Record<
  ProfileType,
  Array<{ id: string; label: string; subtitle: string; gradient: string }>
> = {
  agency: [
    { id: "projetos_ativos",       label: "Projetos Ativos",   subtitle: "Em andamento",       gradient: "from-blue-500 to-blue-700" },
    { id: "tarefas_contratadas",   label: "Tarefas Contratadas", subtitle: "Período atual",    gradient: "from-violet-500 to-purple-700" },
    { id: "tarefas_concluidas",    label: "Tarefas Concluídas", subtitle: "Entregues",          gradient: "from-emerald-500 to-teal-700" },
    { id: "pontuacao_tarefas",     label: "Pontuação Média",   subtitle: "Avaliação das tarefas", gradient: "from-amber-500 to-orange-600" },
  ],
  company: [
    { id: "projetos_ativos",     label: "Projetos Ativos",    subtitle: "Em andamento",   gradient: "from-blue-500 to-blue-700" },
    { id: "tarefas_contratadas", label: "Tarefas Contratadas", subtitle: "Período atual",  gradient: "from-violet-500 to-purple-700" },
    { id: "tarefas_concluidas",  label: "Tarefas Concluídas", subtitle: "Entregues",       gradient: "from-emerald-500 to-teal-700" },
  ],
  nomades: [
    { id: "remuneracao_nomade",       label: "Minha Remuneração", subtitle: "Créditos no período",  gradient: "from-emerald-500 to-teal-700" },
    { id: "pontuacao_nomade_propria", label: "Minha Pontuação",   subtitle: "Score atual",          gradient: "from-amber-500 to-orange-600" },
    { id: "tarefas_concluidas",       label: "Tarefas Entregues", subtitle: "No período",           gradient: "from-blue-500 to-blue-700" },
  ],
  parceiro: [
    { id: "faturamento_lider",         label: "Faturamento",        subtitle: "Agências lideradas",  gradient: "from-emerald-500 to-teal-700" },
    { id: "tarefas_lider",             label: "Tarefas",            subtitle: "Sob liderança",       gradient: "from-blue-500 to-blue-700" },
    { id: "agencias_lideradas_status", label: "Agências Lideradas", subtitle: "Status ativo",        gradient: "from-violet-500 to-purple-700" },
  ],
  lider: [
    { id: "tarefas_lider",             label: "Minhas Tarefas",  subtitle: "Como líder",        gradient: "from-blue-500 to-blue-700" },
    { id: "faturamento_lider",         label: "Faturamento",     subtitle: "Projetos sob lider.", gradient: "from-emerald-500 to-teal-700" },
    { id: "pontuacao_nomade_propria",  label: "Minha Pontuação", subtitle: "Score atual",        gradient: "from-amber-500 to-orange-600" },
    { id: "tarefas_concluidas",        label: "Entregues",       subtitle: "No período",         gradient: "from-indigo-500 to-indigo-700" },
  ],
};

// ─── Gradient KPI card (platform style) ──────────────────────────────────────

function GradientKpiCard({
  label,
  subtitle,
  gradient,
  result,
  loading,
}: {
  label: string;
  subtitle: string;
  gradient: string;
  result: IndicatorResult | null;
  loading: boolean;
}) {
  function formatVal(r: IndicatorResult): string {
    if (r.value == null) return "—";
    const fmt = (r.meta?.format as string) ?? "number";
    if (fmt === "currency") {
      const v = r.value;
      if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
      if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(1)}k`;
      return r.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    }
    if (r.value >= 1_000_000) return `${(r.value / 1_000_000).toFixed(1)}M`;
    if (r.value >= 1_000) return `${(r.value / 1_000).toFixed(1)}k`;
    return r.value.toLocaleString("pt-BR");
  }

  const displayValue = loading
    ? "—"
    : !result || result.unavailable
    ? "—"
    : formatVal(result);

  const displaySubtitle = result?.warnings?.[0] ?? subtitle;

  return (
    <div className={`relative rounded-xl overflow-hidden shadow-sm bg-gradient-to-br ${gradient} px-3 pt-2 pb-1.5 ${loading ? "animate-pulse" : ""}`}>
      <p className="text-xs font-medium text-white/70 leading-tight mb-1">{result?.title ?? label}</p>
      <p className="text-2xl font-bold text-white leading-none tabular-nums">{displayValue}</p>
      <p className="text-[10px] text-white/60 mt-0.5 truncate">{displaySubtitle}</p>
    </div>
  );
}

// ─── KPI strip for non-admin profiles ────────────────────────────────────────

function ProfileKpiStrip({
  profileType,
  extraKpis = [],
}: {
  profileType: ProfileType;
  /**
   * KPIs extra pra anexar aos do profileType — usado pra agência que
   * também é Partner ativo: em vez de uma tela de Relatórios separada
   * pro Partner, os KPIs do Partner aparecem juntos aqui (ver
   * ReportListPage abaixo, que passa PROFILE_KPIS.parceiro quando
   * profile de Partner existe). Pedido explícito do usuário 2026-07-20:
   * "não separado assim ... o que muda é a página dela mesma".
   */
  extraKpis?: (typeof PROFILE_KPIS)[ProfileType];
}) {
  const { startDate, endDate } = periodToDates(30);
  const kpis = [...(PROFILE_KPIS[profileType] ?? []), ...extraKpis];

  const indicators = useMemo(
    () => kpis.map(({ id }) => ({ indicatorId: id, startDate, endDate })),
    [kpis, startDate, endDate]
  );

  const { data, loading } = useBatchIndicators(indicators, kpis.length > 0);

  if (kpis.length === 0) return null;

  const dataById = useMemo(() => {
    const m: Record<string, IndicatorResult> = {};
    for (const d of data) m[d.indicatorId] = d;
    return m;
  }, [data]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {kpis.map(({ id, label, subtitle, gradient }) => (
        <GradientKpiCard
          key={id}
          label={label}
          subtitle={subtitle}
          gradient={gradient}
          result={dataById[id] ?? null}
          loading={loading}
        />
      ))}
    </div>
  );
}

// ─── Report card (non-admin) ──────────────────────────────────────────────────

function ReportCard({
  report,
  category,
  dateRange,
  permission,
  onView,
}: {
  report: { id: string; name: string; desc: string; icon: any; formats: string[] };
  category: {
    name: string;
    lightBg: string;
    lightText: string;
    border: string;
  };
  dateRange: string;
  permission: AvailableReport | null;
  onView: (v: { report: any; category: any }) => void;
}) {
  const [downloading, setDownloading] = useState(false);
  const canExport = permission?.can_export ?? false;

  async function handleDownload() {
    if (!canExport) return;
    setDownloading(true);
    try {
      await exportReportSummaryPDF(report, {
        categoryName: category.name,
        dateRangeLabel: dateRangeLabel(dateRange),
        generatedAt: new Date().toLocaleDateString("pt-BR"),
      });
    } catch (e) {
      console.error("[ReportListPage] export:", e);
    } finally {
      setDownloading(false);
    }
  }

  if (!permission) {
    return (
      <div className="relative bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4 opacity-60 flex flex-col gap-3">
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-[1px] z-10">
          <div className="flex flex-col items-center gap-1 text-slate-400">
            <Lock className="h-5 w-5" />
            <span className="text-[10px] font-medium">Sem acesso</span>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${category.lightBg} ${category.border} border shrink-0`}>
            <report.icon className={`h-3.5 w-3.5 ${category.lightText}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 leading-snug">{report.name}</p>
            <p className="text-[11px] text-slate-400 mt-1 leading-snug line-clamp-2">{report.desc}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-auto">
          {report.formats.map((f) => (
            <span key={f} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-400">
              <FileText className="h-2.5 w-2.5" />{f}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="group relative bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${category.lightBg} ${category.border} border shrink-0`}>
          <report.icon className={`h-3.5 w-3.5 ${category.lightText}`} />
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
        <span className="ml-auto text-[10px] text-slate-400">
          {dateRangeLabel(dateRange)}
        </span>
      </div>

      <div className="flex gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-700/60">
        <Button size="sm" className="flex-1 h-7 text-[11px] gap-1" onClick={() => onView({ report, category })}>
          <Eye className="h-3 w-3" />
          Visualizar
        </Button>
        {canExport && (
          <Button
            size="sm"
            variant="outline"
            disabled={downloading}
            onClick={handleDownload}
            className="h-7 px-2.5 text-[11px] gap-1"
            title={`Baixar ${report.formats[0]}`}
          >
            {downloading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Category section (non-admin) ─────────────────────────────────────────────

function CategorySection({
  category,
  search,
  dateRange,
  permissionMap,
  showLocked,
  onView,
}: {
  category: typeof CATEGORIES[number];
  search: string;
  dateRange: string;
  permissionMap: Record<string, AvailableReport>;
  showLocked: boolean;
  onView: (v: { report: any; category: any }) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const visibleReports = useMemo(() => {
    let list = category.reports;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) => r.name.toLowerCase().includes(q) || r.desc.toLowerCase().includes(q));
    }
    if (!showLocked) {
      list = list.filter((r) => !!permissionMap[r.id]);
    }
    return list;
  }, [category.reports, search, permissionMap, showLocked]);

  if (visibleReports.length === 0) return null;

  return (
    <div className="space-y-3">
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
        </div>
        {collapsed
          ? <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
          : <ChevronDown className="h-4 w-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
        }
      </button>

      {!collapsed && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {visibleReports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              category={category}
              dateRange={dateRange}
              permission={permissionMap[report.id] || null}
              onView={onView}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main shared page ─────────────────────────────────────────────────────────

export function ReportListPage({ profileType, description }: { profileType?: ProfileType; description?: string }) {
  useSidebar();
  // Agency que também é Partner ativo: os KPIs de Partner aparecem AQUI,
  // dentro da mesma tela — nunca numa segunda tela de Relatórios separada
  // (usePartner() é global, ver PartnerProvider em App.tsx; profile só
  // vem preenchido quando o usuário realmente tem status de Partner).
  const { profile: partnerProfile } = usePartner();
  const showPartnerKpis = profileType === "agency" && !!partnerProfile;

  const [available, setAvailable] = useState<AvailableReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateRange, setDateRange] = useState("30");
  const [showLocked, setShowLocked] = useState(false);
  const [viewingReport, setViewingReport] = useState<{ report: any; category: any } | null>(null);
  const [previewDownloading, setPreviewDownloading] = useState(false);

  const loadAvailable = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.getAvailableReports();
      setAvailable(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("[ReportListPage] load:", err);
      setAvailable([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAvailable(); }, [loadAvailable]);

  const permissionMap: Record<string, AvailableReport> = useMemo(() => {
    const m: Record<string, AvailableReport> = {};
    for (const a of available) m[a.report_key] = a;
    return m;
  }, [available]);

  const canChangeFilters = available.some((a) => a.can_change_filters) || available.length === 0;

  const visibleCategories = useMemo(() => {
    return CATEGORIES.filter((cat) => {
      if (categoryFilter !== "all" && cat.id !== categoryFilter) return false;
      const reportsToCheck = search.trim()
        ? cat.reports.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()) || r.desc.toLowerCase().includes(search.toLowerCase()))
        : cat.reports;
      const filtered = showLocked ? reportsToCheck : reportsToCheck.filter((r) => permissionMap[r.id]);
      return filtered.length > 0;
    });
  }, [categoryFilter, search, showLocked, permissionMap]);

  const accessibleCount = available.length;
  const totalCount = CATEGORIES.reduce((s, c) => s + c.reports.length, 0);

  if (loading) return <PageLoader text="Carregando relatórios…" />;

  return (
    <div className={STANDARD_SHELL_PANEL_CLASS}>
    <div className="h-full min-h-0 flex flex-col overflow-y-auto space-y-6">
      {/* Header */}
      <div className="shrink-0 -mb-[11px]">
      <StandardPageBanner
        icon={BarChart3}
        title="Relatórios"
        description={description ?? `${accessibleCount} de ${totalCount} relatórios disponíveis para o seu perfil`}
        actions={
          <>
            <TooltipProvider delayDuration={400}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={loadAvailable}
                    className="flex items-center justify-center h-8 w-8 rounded-lg border border-white/70 text-white bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={6}>Atualizar</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <PinToTrayButton id="page-relatorios" label="Relatórios" icon={BarChart3} path="/agency/relatorios" />
          </>
        }
      />
      </div>

      {/* Live KPI strip — shows indicators scoped to this profile */}
      {profileType && (
        <ProfileKpiStrip
          profileType={profileType}
          extraKpis={showPartnerKpis ? PROFILE_KPIS.parceiro : []}
        />
      )}

      {/* No access banner */}
      {accessibleCount === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-slate-400 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
          <Lock className="h-10 w-10 opacity-30" />
          <p className="text-sm font-medium">Nenhum relatório disponível</p>
          <p className="text-xs text-slate-400 text-center max-w-xs">
            Seu perfil ainda não tem acesso a relatórios. Entre em contato com o administrador da plataforma.
          </p>
        </div>
      )}

      {accessibleCount > 0 && (
        <>
          {/* Filters bar */}
          <div className="flex flex-wrap items-center gap-2">
            {canChangeFilters && (
              <>
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
              </>
            )}
            <label className="flex items-center gap-1.5 ml-auto cursor-pointer">
              <input
                type="checkbox"
                checked={showLocked}
                onChange={(e) => setShowLocked(e.target.checked)}
                className="w-3.5 h-3.5 rounded accent-slate-500"
              />
              <span className="text-xs text-slate-500">Mostrar sem acesso</span>
            </label>
          </div>

          {/* Categories */}
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
                  search={search}
                  dateRange={dateRange}
                  permissionMap={permissionMap}
                  showLocked={showLocked}
                  onView={(v) => setViewingReport(v)}
                />
              ))
            )}
          </div>
        </>
      )}

      {/* Visualizar — preview do relatório (Popup 1) */}
      <StandardModalDialog
        open={!!viewingReport}
        onClose={() => setViewingReport(null)}
        title={viewingReport?.report?.name}
        subtitle={viewingReport?.category?.name}
        size="compact"
        footer={
          viewingReport && (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-1.5">
                {viewingReport.report.formats.map((f: string) => (
                  <span
                    key={f}
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                  >
                    <FileText className="h-2.5 w-2.5" />
                    {f}
                  </span>
                ))}
              </div>
              {(permissionMap[viewingReport.report.id]?.can_export ?? false) && (
                <Button
                  size="sm"
                  disabled={previewDownloading}
                  onClick={async () => {
                    setPreviewDownloading(true);
                    try {
                      await exportReportSummaryPDF(viewingReport.report, {
                        categoryName: viewingReport.category.name,
                        dateRangeLabel: dateRangeLabel(dateRange),
                        generatedAt: new Date().toLocaleDateString("pt-BR"),
                      });
                    } catch (e) {
                      console.error("[ReportListPage] export:", e);
                    } finally {
                      setPreviewDownloading(false);
                    }
                  }}
                  className="gap-1.5"
                >
                  {previewDownloading ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  Baixar
                </Button>
              )}
            </div>
          )
        }
      >
        {viewingReport && (
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${viewingReport.category.lightBg} ${viewingReport.category.border} border shrink-0`}>
                <viewingReport.report.icon className={`h-4 w-4 ${viewingReport.category.lightText}`} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{viewingReport.report.name}</p>
                <p className="text-xs text-slate-400">{viewingReport.category.name} · {dateRangeLabel(dateRange)}</p>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Descrição</p>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{viewingReport.report.desc}</p>
            </div>
          </div>
        )}
      </StandardModalDialog>
    </div>
    </div>
  );
}
