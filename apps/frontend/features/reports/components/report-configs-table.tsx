// @ts-nocheck
import { useState, useMemo } from "react";
import {
  Settings2, Trash2, Plus, Check, X, LayoutGrid, Search, Filter,
  RefreshCw, Download, FileText, Activity, Users, Award, Megaphone,
  Cpu, DollarSign, BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
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

// ─── Cores por categoria ──────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  "Financeiro":          "bg-emerald-500",
  "Operações":           "bg-blue-500",
  "Usuários e Clientes": "bg-violet-500",
  "Gamificação":         "bg-amber-500",
  "Marketing":           "bg-pink-500",
  "Sistema":             "bg-slate-500",
};

// ─── Labels de escopo e perfis ────────────────────────────────────────────────

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

const AT_LABELS: Record<string, { label: string; color: string }> = {
  agencias: { label: "Agências",   color: "bg-blue-100 text-blue-800 border-blue-200" },
  empresas: { label: "Empresas",   color: "bg-violet-100 text-violet-800 border-violet-200" },
  nomades:  { label: "Nômades",    color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  parceiro: { label: "Parceiros",  color: "bg-amber-100 text-amber-800 border-amber-200" },
  admin:    { label: "Admin",      color: "bg-slate-100 text-slate-700 border-slate-200" },
  lider:    { label: "Líderes",    color: "bg-pink-100 text-pink-800 border-pink-200" },
};

// ─── Config row ───────────────────────────────────────────────────────────────

function ConfigRow({ config, onEdit, onDelete, onToggle }) {
  const [toggling, setToggling] = useState(false);
  const meta = REPORT_NAMES[config.report_key];
  const ptName = meta?.name ?? config.report_key;
  const catColor = CATEGORY_COLORS[meta?.category ?? ""] ?? "bg-slate-400";
  const Icon = meta?.icon ?? FileText;

  async function handleToggle(checked: boolean) {
    setToggling(true);
    try { await onToggle(config.report_key, checked); }
    finally { setToggling(false); }
  }

  return (
    <TableRow className={`group transition-colors hover:bg-slate-50/60 ${!config.is_active ? "opacity-50" : ""}`}>

      {/* Nome em português + key como tooltip */}
      <TableCell className="py-3">
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2.5 cursor-default">
                <div className={`h-2 w-2 rounded-full shrink-0 ${catColor}`} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 leading-tight">{ptName}</p>
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
      </TableCell>

      {/* Status */}
      <TableCell className="py-3">
        <div className="flex items-center gap-2">
          <Switch checked={config.is_active} disabled={toggling} onCheckedChange={handleToggle} />
          <span className={`text-xs font-medium ${config.is_active ? "text-emerald-600" : "text-slate-400"}`}>
            {config.is_active ? "Ativo" : "Inativo"}
          </span>
        </div>
      </TableCell>

      {/* Escopo */}
      <TableCell className="py-3">
        <Badge variant="outline" className="text-xs font-normal whitespace-nowrap">
          {SCOPE_LABELS[config.data_scope] ?? config.data_scope}
        </Badge>
      </TableCell>

      {/* Perfis */}
      <TableCell className="py-3">
        {config.allowed_account_types.length === 0 ? (
          <span className="text-xs text-slate-400 italic">Nenhum</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {config.allowed_account_types.map((at) => {
              const info = AT_LABELS[at];
              return (
                <span key={at} className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${info?.color ?? "bg-slate-100 text-slate-700 border-slate-200"}`}>
                  {info?.label ?? at}
                </span>
              );
            })}
          </div>
        )}
      </TableCell>

      {/* Permissões */}
      <TableCell className="py-3">
        <div className="flex flex-wrap gap-1.5">
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border cursor-default ${config.can_export ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-400 border-slate-200"}`}>
                  {config.can_export ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  Export
                </span>
              </TooltipTrigger>
              <TooltipContent className="text-xs">{config.can_export ? "Exportação permitida" : "Exportação bloqueada"}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border cursor-default ${config.can_change_filters ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-slate-50 text-slate-400 border-slate-200"}`}>
                  {config.can_change_filters ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  Filtros
                </span>
              </TooltipTrigger>
              <TooltipContent className="text-xs">{config.can_change_filters ? "Filtros editáveis" : "Filtros fixos"}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </TableCell>

      {/* Ações */}
      <TableCell className="py-3 text-right">
        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-slate-100" onClick={() => onEdit(config)}>
                  <Settings2 className="h-3.5 w-3.5 text-slate-500" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Editar permissões</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-red-50 text-red-400 hover:text-red-600" onClick={() => onDelete(config.report_key)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Remover configuração</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </TableCell>
    </TableRow>
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

  // ── Estados especiais ────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col items-center gap-3 py-16 text-slate-400">
          <RefreshCw className="h-6 w-6 animate-spin opacity-40" />
          <p className="text-sm">Carregando configurações…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 py-10 text-center">
        <p className="text-sm text-red-600 mb-3">{error}</p>
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Tentar novamente
        </Button>
      </div>
    );
  }

  if (configs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 py-16 flex flex-col items-center gap-4 text-center">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <Settings2 className="h-8 w-8 text-slate-300" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-700">Nenhuma configuração cadastrada</p>
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

      {/* Barra de filtros */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-50 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar relatório…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm bg-white border-slate-200 rounded-lg"
          />
        </div>

        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <SelectTrigger className="h-9 w-36 text-sm border-slate-200 bg-white rounded-lg">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="active">Somente ativos</SelectItem>
            <SelectItem value="inactive">Somente inativos</SelectItem>
          </SelectContent>
        </Select>

        <Select value={scopeFilter} onValueChange={setScopeFilter}>
          <SelectTrigger className="h-9 w-44 text-sm border-slate-200 bg-white rounded-lg">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os escopos</SelectItem>
            {Object.entries(SCOPE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-9 text-xs text-slate-500 hover:bg-slate-100"
            onClick={() => { setSearch(""); setStatusFilter("all"); setScopeFilter("all"); }}>
            <X className="h-3.5 w-3.5 mr-1" /> Limpar
          </Button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-slate-400">{filtered.length} de {configs.length}</span>
          <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs border-slate-200" onClick={onRefresh}>
            <RefreshCw className="h-3.5 w-3.5" /> Atualizar
          </Button>
        </div>
      </div>

      {/* Tabela */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
              <TableHead className="text-xs font-semibold text-slate-600 py-3 w-70">Relatório</TableHead>
              <TableHead className="text-xs font-semibold text-slate-600 py-3 w-27.5">Status</TableHead>
              <TableHead className="text-xs font-semibold text-slate-600 py-3 w-35">Escopo</TableHead>
              <TableHead className="text-xs font-semibold text-slate-600 py-3">Perfis com acesso</TableHead>
              <TableHead className="text-xs font-semibold text-slate-600 py-3 w-35">Permissões</TableHead>
              <TableHead className="text-xs font-semibold text-slate-600 py-3 w-20 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-slate-400 text-sm">
                  Nenhum relatório encontrado com os filtros aplicados.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((cfg) => (
                <ConfigRow
                  key={cfg.report_key}
                  config={cfg}
                  onEdit={onEdit}
                  onDelete={handleDelete}
                  onToggle={handleToggle}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
