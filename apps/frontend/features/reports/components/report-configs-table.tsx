// @ts-nocheck
import { useState, useMemo } from "react";
import {
  Settings2, Trash2, Plus, Check, X, LayoutGrid, Search, Filter,
  RefreshCw, Download, FileText, Activity, Users, Award, Megaphone,
  Cpu, DollarSign, BarChart3, CheckSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { SlidePanel } from "@/components/slide-panel";
import { IconToolbarButton } from "@/components/icon-toolbar-button";
import { NeonBadge } from "@/components/neon-badge";
import { useTableScrollSync } from "@/hooks/useTableScrollSync";
import { apiClient } from "@/lib/api-client";
import type { ReportConfig } from "../types";

// ─── Mapa: report_key → nome em português ────────────────────────────────────

const REPORT_NAMES: Record<string, { name: string; category: string; icon: React.ElementType }> = {
  // Financeiro
  revenue:      { name: "Receitas e Faturamento",   category: "Financeiro",          icon: DollarSign },
  invoices:     { name: "Faturas e Cobranças",       category: "Financeiro",          icon: FileText },
  cashflow:     { name: "Fluxo de Caixa",            category: "Financeiro",          icon: BarChart3 },
  withdrawals:  { name: "Saques de Parceiros",       category: "Financeiro",          icon: DollarSign },
  // Operações
  projects:     { name: "Projetos e Entregas",       category: "Operações",           icon: Activity },
  tasks:        { name: "Tarefas e Atividades",      category: "Operações",           icon: Check },
  availability: { name: "Disponibilidade de Nômades",category: "Operações",           icon: Users },
  performance:  { name: "Performance Operacional",   category: "Operações",           icon: BarChart3 },
  // Usuários
  companies:    { name: "Empresas Clientes",         category: "Usuários e Clientes", icon: Users },
  nomades:      { name: "Nômades e Freelancers",     category: "Usuários e Clientes", icon: Users },
  engagement:   { name: "Engajamento de Usuários",   category: "Usuários e Clientes", icon: Activity },
  satisfaction: { name: "Satisfação e NPS",          category: "Usuários e Clientes", icon: Award },
  // Gamificação
  levels:       { name: "Níveis e Progressão",       category: "Gamificação",         icon: Award },
  achievements: { name: "Conquistas e Badges",       category: "Gamificação",         icon: Award },
  leaderboard:  { name: "Ranking e Performance",     category: "Gamificação",         icon: Award },
  // Marketing
  campaigns:    { name: "Campanhas de Marketing",    category: "Marketing",           icon: Megaphone },
  referrals:    { name: "Indicações e Referrals",    category: "Marketing",           icon: Users },
  promotions:   { name: "Promoções e Cupons",        category: "Marketing",           icon: Megaphone },
  conversion:   { name: "Conversão e Funil",         category: "Marketing",           icon: BarChart3 },
  // Sistema
  audit:        { name: "Auditoria e Logs",          category: "Sistema",             icon: Cpu },
  security:     { name: "Segurança e Acessos",       category: "Sistema",             icon: Cpu },
  integrations: { name: "Integrações e APIs",        category: "Sistema",             icon: Cpu },
  "perf-sys":   { name: "Performance do Sistema",    category: "Sistema",             icon: Cpu },
};

// ─── Cores por categoria (dot indicator na coluna Relatório) ─────────────────

const CATEGORY_COLORS: Record<string, string> = {
  "Financeiro":          "bg-emerald-500",
  "Operações":           "bg-blue-500",
  "Usuários e Clientes": "bg-violet-500",
  "Gamificação":         "bg-amber-500",
  "Marketing":           "bg-pink-500",
  "Sistema":             "bg-slate-500",
};

// ─── Labels + cores (NeonBadge) de escopo e perfis ───────────────────────────

const SCOPE_LABELS: Record<string, string> = {
  GLOBAL:                "Global",
  OWN_PROFILE_SCOPE:     "Próprio perfil",
  OWN_COMPANY_SCOPE:     "Empresa",
  OWN_AGENCY_SCOPE:      "Agência",
  OWN_NOMAD_SCOPE:       "Nômade",
  OWN_PARTNER_SCOPE:     "Parceiro",
  OWN_LEADER_SCOPE:      "Líder",
  CUSTOM_USERS:          "Usuários específicos",
};

const SCOPE_COLORS: Record<string, import("@/lib/badge-styles").BadgeColor> = {
  GLOBAL:                "blue",
  OWN_PROFILE_SCOPE:     "violet",
  OWN_COMPANY_SCOPE:     "cyan",
  OWN_AGENCY_SCOPE:      "indigo",
  OWN_NOMAD_SCOPE:       "emerald",
  OWN_PARTNER_SCOPE:     "amber",
  OWN_LEADER_SCOPE:      "pink",
  CUSTOM_USERS:          "orange",
};

const AT_LABELS: Record<string, { label: string; color: import("@/lib/badge-styles").BadgeColor }> = {
  agencias: { label: "Agências",  color: "blue" },
  empresas: { label: "Empresas",  color: "violet" },
  nomades:  { label: "Nômades",   color: "emerald" },
  parceiro: { label: "Parceiros", color: "amber" },
  admin:    { label: "Admin",     color: "slate" },
  lider:    { label: "Líderes",   color: "pink" },
};

// ─── Gradient stat cards (real aggregate counts, no fabricated trends) ──────

const STAT_COLOR_MAP: Record<string, { gradient: string; darkGradient: string; borderClass: string }> = {
  blue: {
    gradient: "from-blue-500 to-blue-700",
    darkGradient: "dark:from-blue-800 dark:to-blue-950",
    borderClass: "border-2 border-blue-300/70 dark:border-blue-800/70",
  },
  emerald: {
    gradient: "from-emerald-500 to-teal-600",
    darkGradient: "dark:from-emerald-800 dark:to-teal-900",
    borderClass: "border-2 border-emerald-300/70 dark:border-emerald-800/70",
  },
  violet: {
    gradient: "from-violet-500 to-purple-700",
    darkGradient: "dark:from-violet-800 dark:to-purple-950",
    borderClass: "border-2 border-violet-300/70 dark:border-violet-800/70",
  },
  orange: {
    gradient: "from-orange-500 to-rose-600",
    darkGradient: "dark:from-orange-800 dark:to-rose-900",
    borderClass: "border-2 border-orange-300/70 dark:border-orange-800/70",
  },
};

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: keyof typeof STAT_COLOR_MAP;
}) {
  const colors = STAT_COLOR_MAP[color];
  return (
    <div
      className={`relative rounded-xl overflow-hidden cursor-default transition-all duration-200 bg-gradient-to-br ${colors.gradient} ${colors.darkGradient} ${colors.borderClass} shadow-lg hover:shadow-xl`}
    >
      <div className="px-4 py-3.5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-semibold text-white/80 uppercase tracking-wide">{label}</span>
          <div className="bg-white/20 rounded-md p-1">
            <Icon className="h-3.5 w-3.5 text-white" />
          </div>
        </div>
        <div className="text-2xl font-bold text-white">{value}</div>
      </div>
    </div>
  );
}

// ─── Config row ───────────────────────────────────────────────────────────────

function ConfigRow({ config, index, onEdit, onDelete, onToggle }) {
  const [toggling, setToggling] = useState(false);
  const meta = REPORT_NAMES[config.report_key];
  const ptName = meta?.name ?? config.report_key;
  const catColor = CATEGORY_COLORS[meta?.category ?? ""] ?? "bg-slate-400";

  async function handleToggle(checked: boolean) {
    setToggling(true);
    try { await onToggle(config.report_key, checked); }
    finally { setToggling(false); }
  }

  const zebra =
    index % 2 === 0
      ? "bg-[#F1F4F9] dark:bg-[oklch(0.14_0.026_258)] hover:bg-[#D9E1ED] dark:hover:bg-[oklch(0.21_0.024_258)]"
      : "bg-[#DCE3EE] dark:bg-[oklch(0.185_0.024_258)] hover:bg-[#C7D2E3] dark:hover:bg-[oklch(0.21_0.024_258)]";
  const pinnedBg =
    index % 2 === 0
      ? "bg-[#ECEFF4] group-hover:bg-[#D9E1ED] dark:bg-[oklch(0.14_0.026_258)] dark:group-hover:bg-[oklch(0.21_0.024_258)]"
      : "bg-[#D6DCE8] group-hover:bg-[#C7D2E3] dark:bg-[oklch(0.185_0.024_258)] dark:group-hover:bg-[oklch(0.21_0.024_258)]";

  return (
    <tr className={`group transition-colors ${zebra} ${!config.is_active ? "opacity-50" : ""}`}>
      {/* Ações — pinned, standard icon-button recipe */}
      <td
        className={`px-1 py-2 transition-colors ${pinnedBg}`}
        style={{ position: "sticky", left: 0, zIndex: 1, minWidth: 76, borderRight: "1px solid rgba(100,116,139,0.18)" }}
      >
        <div className="flex items-center justify-center gap-1">
          <TooltipProvider delayDuration={400}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onEdit(config)}
                  className="h-[26px] w-[26px] flex items-center justify-center rounded-[8px] bg-white dark:bg-slate-800 border border-[#e8edf5] dark:border-slate-700 text-[#2558FF] dark:text-slate-500 shadow-[0_4px_10px_rgba(15,23,42,0.06)] hover:bg-gradient-to-br hover:from-[#2558FF] hover:via-[#6E2C96] hover:to-[#D92293] hover:text-white dark:hover:text-[#0a1628] hover:border-transparent hover:shadow-[0_8px_18px_rgba(15,23,42,0.18)] hover:-translate-y-px transition-all duration-150"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="text-xs font-medium">Editar permissões</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider delayDuration={400}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onDelete(config.report_key)}
                  className="h-[26px] w-[26px] flex items-center justify-center rounded-[8px] bg-white dark:bg-slate-800 border border-[#e8edf5] dark:border-slate-700 text-red-400 dark:text-slate-500 shadow-[0_4px_10px_rgba(15,23,42,0.06)] hover:bg-gradient-to-br hover:from-[#2558FF] hover:via-[#6E2C96] hover:to-[#D92293] hover:text-white dark:hover:text-[#0a1628] hover:border-transparent hover:shadow-[0_8px_18px_rgba(15,23,42,0.18)] hover:-translate-y-px transition-all duration-150"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="text-xs font-medium">Remover configuração</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </td>

      {/* Nome em português + key como tooltip */}
      <td className="py-3 px-4" style={{ borderRight: "1px solid rgba(148,163,184,0.15)" }}>
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2.5 cursor-default">
                <div className={`h-2 w-2 rounded-full shrink-0 ${catColor}`} />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight truncate">{ptName}</p>
                  {meta?.category && (
                    <p className="text-[11px] text-slate-400 mt-0.5">{meta.category}</p>
                  )}
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-mono text-xs">
              {config.report_key}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </td>

      {/* Status */}
      <td className="py-3 px-4" style={{ borderRight: "1px solid rgba(148,163,184,0.15)" }}>
        <div className="flex items-center gap-2">
          <Switch checked={config.is_active} disabled={toggling} onCheckedChange={handleToggle} />
          <span className={`text-xs font-medium ${config.is_active ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`}>
            {config.is_active ? "Ativo" : "Inativo"}
          </span>
        </div>
      </td>

      {/* Escopo */}
      <td className="py-3 px-4" style={{ borderRight: "1px solid rgba(148,163,184,0.15)" }}>
        <NeonBadge color={SCOPE_COLORS[config.data_scope] ?? "slate"}>
          {SCOPE_LABELS[config.data_scope] ?? config.data_scope}
        </NeonBadge>
      </td>

      {/* Perfis */}
      <td className="py-3 px-4" style={{ borderRight: "1px solid rgba(148,163,184,0.15)" }}>
        {config.allowed_account_types.length === 0 ? (
          <span className="text-xs text-slate-400 italic">Nenhum</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {config.allowed_account_types.map((at) => {
              const info = AT_LABELS[at];
              return (
                <NeonBadge key={at} color={info?.color ?? "slate"}>
                  {info?.label ?? at}
                </NeonBadge>
              );
            })}
          </div>
        )}
      </td>

      {/* Permissões */}
      <td className="py-3 px-4">
        <div className="flex flex-wrap gap-1.5">
          <NeonBadge
            color={config.can_export ? "emerald" : "slate"}
            tooltip={config.can_export ? "Exportação permitida" : "Exportação bloqueada"}
          >
            <span className="inline-flex items-center gap-1">
              {config.can_export ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
              Export
            </span>
          </NeonBadge>
          <NeonBadge
            color={config.can_change_filters ? "blue" : "slate"}
            tooltip={config.can_change_filters ? "Filtros editáveis" : "Filtros fixos"}
          >
            <span className="inline-flex items-center gap-1">
              {config.can_change_filters ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
              Filtros
            </span>
          </NeonBadge>
        </div>
      </td>
    </tr>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ReportConfigsTableProps {
  configs: (ReportConfig & { id?: string })[];
  loading: boolean;
  error: string | null;
  onEdit: (config: ReportConfig) => void;
  onCreate: () => void;
  onRefresh: () => void;
  onSeedDefaults?: () => Promise<void>;
}

export function ReportConfigsTable({
  configs,
  loading,
  error,
  onEdit,
  onCreate,
  onRefresh,
  onSeedDefaults,
}: ReportConfigsTableProps) {
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [scopeFilter, setScopeFilter] = useState("all");
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);

  const {
    tableScrollRef,
    topScrollRef,
    bottomScrollRef,
    handleTopBarScroll,
    handleTableScroll,
    handleBottomBarScroll,
    hasHorizontalOverflow,
  } = useTableScrollSync([loading]);

  async function handleSeed() {
    if (!onSeedDefaults) return;
    setSeeding(true);
    try { await onSeedDefaults(); }
    finally { setSeeding(false); }
  }

  async function handleDelete(reportKey: string) {
    const ptName = REPORT_NAMES[reportKey]?.name ?? reportKey;
    if (!confirm(`Remover "${ptName}"? O relatório ficará inacessível para todos os perfis.`)) return;
    setDeletingKey(reportKey);
    try {
      await apiClient.deleteAdminReport(reportKey);
      onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao remover configuração.");
    } finally {
      setDeletingKey(null);
    }
  }

  async function handleToggle(reportKey: string, isActive: boolean) {
    try {
      await apiClient.updateAdminReport(reportKey, { is_active: isActive });
      onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao atualizar status.");
    }
  }

  // ── Filtros aplicados ─────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return configs.filter((c) => {
      const meta = REPORT_NAMES[c.report_key];
      const ptName = meta?.name ?? c.report_key;
      const q = search.toLowerCase();

      if (q && !ptName.toLowerCase().includes(q) && !c.report_key.toLowerCase().includes(q) && !(meta?.category ?? "").toLowerCase().includes(q)) {
        return false;
      }
      if (statusFilter === "active" && !c.is_active) return false;
      if (statusFilter === "inactive" && c.is_active) return false;
      if (scopeFilter !== "all" && c.data_scope !== scopeFilter) return false;
      return true;
    });
  }, [configs, search, statusFilter, scopeFilter]);

  const hasFilters = search || statusFilter !== "all" || scopeFilter !== "all";

  // ── Estatísticas reais agregadas ─────────────────────────────────────────

  const totalCount = configs.length;
  const activeCount = configs.filter((c) => c.is_active).length;
  const inactiveCount = totalCount - activeCount;
  const exportCount = configs.filter((c) => c.can_export).length;

  // ── Estados especiais ────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-[#e8edf5] dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
        <div className="flex flex-col items-center gap-3 py-16 text-slate-400">
          <RefreshCw className="h-6 w-6 animate-spin opacity-40" />
          <p className="text-sm">Carregando configurações…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 py-10 text-center">
        <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Tentar novamente
        </Button>
      </div>
    );
  }

  if (configs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 py-16 flex flex-col items-center gap-4 text-center">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <Settings2 className="h-8 w-8 text-slate-300 dark:text-slate-600" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Nenhuma configuração cadastrada</p>
          <p className="text-xs text-slate-400 max-w-xs">Crie configurações individuais ou importe todos os relatórios do catálogo de uma vez.</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-center">
          <Button size="sm" variant="outline" className="h-9 gap-1.5" onClick={onCreate}>
            <Plus className="h-3.5 w-3.5" /> Nova configuração
          </Button>
          {onSeedDefaults && (
            <Button size="sm" className="h-9 gap-1.5 btn-brand border-0 shadow-md" onClick={handleSeed} disabled={seeding}>
              <LayoutGrid className="h-3.5 w-3.5" />
              {seeding ? "Importando…" : "Importar catálogo (23 relatórios)"}
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ── Tabela com filtros ───────────────────────────────────────────────────

  return (
    <div className="space-y-3">

      {/* Cards de estatística — gradiente, contagens reais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Configurações" value={totalCount} icon={Settings2} color="blue" />
        <StatCard label="Ativas" value={activeCount} icon={CheckSquare} color="emerald" />
        <StatCard label="Inativas" value={inactiveCount} icon={X} color="orange" />
        <StatCard label="Exportação liberada" value={exportCount} icon={Download} color="violet" />
      </div>

      {/* Card externo — toolbar + tabela */}
      <div className="bg-white dark:bg-slate-900 border border-[#e8edf5] dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
        {/* Linha 1 — busca + botões de ícone */}
        <div className="flex items-center gap-2 flex-wrap px-[18px] py-3">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8 h-9 text-sm"
              placeholder="Nome do relatório ou categoria..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={() => { setSearch(""); setStatusFilter("all"); setScopeFilter("all"); }}
              >
                <X className="h-3.5 w-3.5 mr-1" /> Limpar
              </Button>
            )}
            <IconToolbarButton icon={Filter} tooltip="Filtros" onClick={() => setFilterPanelOpen(true)} />
            <IconToolbarButton icon={RefreshCw} tooltip="Atualizar" onClick={onRefresh} />
          </div>
        </div>

        {/* Linha 2 (topo) — contagem + espelho de rolagem */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-[18px] py-2 border-y border-[#e8edf5] dark:border-slate-800 bg-white dark:bg-slate-900/30">
          <TooltipProvider delayDuration={400}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap cursor-default">
                  <span className="font-semibold text-slate-600 dark:text-slate-300">{filtered.length}</span> de {configs.length} relatório{configs.length !== 1 ? "s" : ""}
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={6}>
                Configurações exibidas com os filtros aplicados, do total cadastrado
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {hasHorizontalOverflow && (
            <div
              ref={topScrollRef}
              onScroll={handleTopBarScroll}
              title="Arraste para rolar a tabela na horizontal e ver as colunas que não couberem na tela"
              className="hidden md:block flex-1 min-w-[80px] overflow-x-scroll allka-table-scroll self-center"
              style={{ height: 12 }}
            >
              <div style={{ minWidth: 780, height: 1 }} />
            </div>
          )}
        </div>

        {/* Tabela */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
            <Settings2 className="h-8 w-8 opacity-40" />
            <span className="text-sm">Nenhum relatório encontrado com os filtros aplicados.</span>
          </div>
        ) : (
          <div ref={tableScrollRef} onScroll={handleTableScroll} className="overflow-x-auto allka-table-scroll-body">
            <table className="w-full text-xs min-w-[780px]">
              <thead>
                <tr className="border-b border-slate-200/60 dark:border-slate-700/60">
                  <th
                    className="py-3.5 px-2 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.04em] text-center"
                    style={{ position: "sticky", left: 0, top: 0, zIndex: 3, minWidth: 76, background: "var(--table-head)", boxShadow: "0 1px 0 rgba(148,163,184,0.22)", borderRight: "1px solid rgba(100,116,139,0.18)" }}
                  >
                    Ações
                  </th>
                  {[
                    { label: "Relatório", info: "Nome do relatório e categoria a que pertence no catálogo." },
                    { label: "Status", info: "Se a configuração está ativa e acessível aos perfis autorizados." },
                    { label: "Escopo", info: "Abrangência dos dados exibidos: global ou restrito ao próprio contexto do usuário." },
                    { label: "Perfis com acesso", info: "Tipos de conta autorizados a visualizar este relatório." },
                    { label: "Permissões", info: "Se exportação e alteração de filtros são permitidas para este relatório." },
                  ].map((col) => (
                    <th
                      key={col.label}
                      className="py-3.5 px-4 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.04em] select-none text-left"
                      style={{
                        position: "sticky",
                        top: 0,
                        zIndex: 2,
                        background: "var(--table-head)",
                        boxShadow: "0 1px 0 rgba(148,163,184,0.22)",
                        borderRight: "1px solid rgba(148,163,184,0.16)",
                      }}
                    >
                      <div className="inline-flex items-center gap-1">
                        {col.label}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-slate-300 dark:text-slate-600 cursor-help text-[10px]">ⓘ</span>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs max-w-[200px]">{col.info}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((cfg, i) => (
                  <ConfigRow
                    key={cfg.report_key}
                    config={cfg}
                    index={i}
                    onEdit={onEdit}
                    onDelete={handleDelete}
                    onToggle={handleToggle}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Linha 3 (rodapé) — espelho da linha 2 */}
        {filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-[18px] py-2 border-t border-[#e8edf5] dark:border-slate-800 bg-white dark:bg-slate-900/20">
            <TooltipProvider delayDuration={400}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap cursor-default">
                    <span className="font-semibold text-slate-600 dark:text-slate-300">{filtered.length}</span> de {configs.length} relatório{configs.length !== 1 ? "s" : ""}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={6}>
                  Configurações exibidas com os filtros aplicados, do total cadastrado
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {hasHorizontalOverflow && (
              <div
                ref={bottomScrollRef}
                onScroll={handleBottomBarScroll}
                title="Arraste para rolar a tabela na horizontal e ver as colunas que não couberem na tela"
                className="hidden md:block flex-1 min-w-[80px] overflow-x-scroll allka-table-scroll self-center"
                style={{ height: 12 }}
              >
                <div style={{ minWidth: 780, height: 1 }} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Painel de filtros */}
      <SlidePanel
        open={filterPanelOpen}
        onClose={() => setFilterPanelOpen(false)}
        title="Filtros"
        subtitle="Filtre as configurações por status e escopo de dados"
        widthMode="compact"
        compactWidth={360}
      >
        <div className="p-5 flex-1 overflow-y-auto space-y-5">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Status</p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { key: "all", label: "Todos" },
                  { key: "active", label: "Somente ativos" },
                  { key: "inactive", label: "Somente inativos" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setStatusFilter(opt.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    statusFilter === opt.key
                      ? "border-transparent text-white"
                      : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                  style={statusFilter === opt.key ? { background: "linear-gradient(135deg, #111A4D 0%, #6E2C96 55%, #D92293 100%)" } : undefined}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Escopo</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setScopeFilter("all")}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  scopeFilter === "all"
                    ? "border-transparent text-white"
                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
                style={scopeFilter === "all" ? { background: "linear-gradient(135deg, #111A4D 0%, #6E2C96 55%, #D92293 100%)" } : undefined}
              >
                Todos os escopos
              </button>
              {Object.entries(SCOPE_LABELS).map(([key, label]) => (
                <button key={key} onClick={() => setScopeFilter(key)} className="cursor-pointer">
                  <NeonBadge
                    color={SCOPE_COLORS[key] ?? "slate"}
                    className={scopeFilter === key ? "ring-2 ring-offset-1 ring-slate-400 dark:ring-slate-500" : ""}
                  >
                    {label}
                  </NeonBadge>
                </button>
              ))}
            </div>
          </div>
        </div>
      </SlidePanel>
    </div>
  );
}
