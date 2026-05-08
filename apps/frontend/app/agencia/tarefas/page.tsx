// @ts-nocheck
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  CheckSquare2, Search, RefreshCw, AlertTriangle, X,
  Clock, SendHorizonal, MessageSquare, ArrowRight, PlayCircle,
  Eye, CheckCircle2, XCircle, UserSearch, ChevronDown, ChevronUp,
  ChevronsUpDown, Rocket, AlertCircle, FolderOpen, Building2,
  Send, RotateCcw,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { PageLoader } from "@/components/ui/loading";
import { TaskLaunchDrawer } from "@/components/task-launch-drawer";

// ─── Types ────────────────────────────────────────────────────────────────────

type TaskStatus =
  | "PARA_LANCAMENTO" | "EM_LANCAMENTO" | "AGUARDANDO_INFORMACOES"
  | "LIBERADA_PARA_EXECUCAO" | "EM_EXECUCAO" | "EM_REVISAO" | "EM_APROVACAO"
  | "CONCLUIDA" | "CANCELADA" | "AGUARDANDO_NOMADE"
  | "LANCAMENTO_ENVIADO_PARA_ANALISE" | "DEVOLVIDA_PARA_AGENCIA" | "LIBERADA_PELO_LIDER";

interface TarefaRow {
  id: string;
  task_code: string | null;
  code_snapshot: string | null;
  title: string;
  category_snapshot: string | null;
  status: TaskStatus;
  due_date: string | null;
  completed_at: string | null;
  briefing_snapshot: any;
  steps_snapshot: any;
  checklist_snapshot: any;
  observations: string | null;
  fase: string | null;
  nomade_responsavel: { id: string; name: string } | null;
  responsavel_agencia: { id: string; name: string } | null;
  project: {
    id: string;
    title: string;
    client: { id: string; name: string } | null;
  };
  project_product: { product_name_snapshot: string };
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bg: string; border: string; icon: any }> = {
  PARA_LANCAMENTO:        { label: "Para lançamento",   color: "text-slate-600",  bg: "bg-slate-100",  border: "border-slate-200",  icon: Clock },
  EM_LANCAMENTO:          { label: "Em lançamento",     color: "text-indigo-700", bg: "bg-indigo-50",  border: "border-indigo-200", icon: SendHorizonal },
  AGUARDANDO_INFORMACOES: { label: "Ag. Informações",   color: "text-orange-700", bg: "bg-orange-50",  border: "border-orange-200", icon: MessageSquare },
  LIBERADA_PARA_EXECUCAO: { label: "Liberada p/ Exec.", color: "text-cyan-700",   bg: "bg-cyan-50",    border: "border-cyan-200",   icon: ArrowRight },
  EM_EXECUCAO:            { label: "Em execução",       color: "text-blue-700",   bg: "bg-blue-50",    border: "border-blue-200",   icon: PlayCircle },
  EM_REVISAO:             { label: "Em revisão",        color: "text-amber-700",  bg: "bg-amber-50",   border: "border-amber-200",  icon: Eye },
  EM_APROVACAO:           { label: "Em aprovação",      color: "text-violet-700", bg: "bg-violet-50",  border: "border-violet-200", icon: CheckCircle2 },
  CONCLUIDA:              { label: "Concluída",         color: "text-emerald-700",bg: "bg-emerald-50", border: "border-emerald-200",icon: CheckCircle2 },
  CANCELADA:              { label: "Cancelada",         color: "text-red-600",    bg: "bg-red-50",     border: "border-red-200",    icon: XCircle },
  AGUARDANDO_NOMADE:             { label: "Ag. Nômade",          color: "text-purple-700", bg: "bg-purple-50",  border: "border-purple-200", icon: UserSearch },
  LANCAMENTO_ENVIADO_PARA_ANALISE: { label: "Briefing em análise",  color: "text-violet-700", bg: "bg-violet-50", border: "border-violet-200", icon: Send },
  DEVOLVIDA_PARA_AGENCIA:          { label: "Correção solicitada",  color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200", icon: RotateCcw },
  LIBERADA_PELO_LIDER:             { label: "Liberada pelo Líder",  color: "text-emerald-700",bg: "bg-emerald-50",border: "border-emerald-200",icon: CheckCircle2 },
};

const STATUS_TABS: TaskStatus[] = [
  "PARA_LANCAMENTO", "EM_LANCAMENTO", "AGUARDANDO_INFORMACOES",
  "LANCAMENTO_ENVIADO_PARA_ANALISE", "DEVOLVIDA_PARA_AGENCIA",
  "LIBERADA_PARA_EXECUCAO", "LIBERADA_PELO_LIDER", "EM_EXECUCAO", "EM_REVISAO", "EM_APROVACAO",
  "CONCLUIDA", "AGUARDANDO_NOMADE",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(s?: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function isOverdue(t: TarefaRow) {
  if (!t.due_date) return false;
  if (t.status === "CONCLUIDA" || t.status === "CANCELADA") return false;
  return new Date(t.due_date) < new Date();
}

// ─── Sort Header ─────────────────────────────────────────────────────────────

function Th({ label, field, sortKey, sortDir, onSort, className }: {
  label: string; field: string; sortKey: string | null; sortDir: "asc" | "desc";
  onSort: (f: string) => void; className?: string;
}) {
  const active = sortKey === field;
  return (
    <th onClick={() => onSort(field)}
      className={cn("px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 cursor-pointer select-none hover:text-slate-800 whitespace-nowrap", className)}>
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ChevronsUpDown className="h-3 w-3 opacity-30" />}
      </span>
    </th>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AgenciaTarefas() {
  const [tarefas, setTarefas] = useState<TarefaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Launch drawer
  const [launchTask, setLaunchTask] = useState<TarefaRow | null>(null);

  const fetchTarefas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.getOperationalTasks();
      setTarefas(res?.data ?? []);
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar tarefas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTarefas(); }, [fetchTarefas]);

  // ── Stats chips
  const stats = useMemo(() => {
    const counts: Partial<Record<TaskStatus, number>> = {};
    tarefas.forEach((t) => { counts[t.status] = (counts[t.status] ?? 0) + 1; });
    return counts;
  }, [tarefas]);

  // ── Filter + sort
  const filtered = useMemo(() => tarefas.filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!t.title.toLowerCase().includes(q) &&
        !t.project.title.toLowerCase().includes(q) &&
        !(t.project.client?.name.toLowerCase().includes(q) ?? false) &&
        !(t.nomade_responsavel?.name.toLowerCase().includes(q) ?? false) &&
        !(t.code_snapshot?.toLowerCase().includes(q) ?? false)
      ) return false;
    }
    return true;
  }), [tarefas, search, statusFilter]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      let av: any, bv: any;
      switch (sortKey) {
        case "code":    av = a.code_snapshot ?? ""; bv = b.code_snapshot ?? ""; break;
        case "title":   av = a.title; bv = b.title; break;
        case "project": av = a.project.title; bv = b.project.title; break;
        case "client":  av = a.project.client?.name ?? ""; bv = b.project.client?.name ?? ""; break;
        case "status":  av = a.status; bv = b.status; break;
        case "nomade":  av = a.nomade_responsavel?.name ?? ""; bv = b.nomade_responsavel?.name ?? ""; break;
        case "due":     av = a.due_date ?? ""; bv = b.due_date ?? ""; break;
        default:        av = ""; bv = ""; break;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortDir]);

  const toggleSort = (f: string) => {
    if (sortKey === f) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(f); setSortDir("asc"); }
  };

  const handleReleased = useCallback((taskId: string) => {
    setTarefas((prev) => prev.map((t) =>
      t.id === taskId ? { ...t, status: "LANCAMENTO_ENVIADO_PARA_ANALISE" as TaskStatus } : t));
    setLaunchTask(null);
  }, []);

  if (loading) return <PageLoader text="Carregando tarefas…" />;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-md shrink-0">
          <CheckSquare2 className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-slate-900">Tarefas</h1>
          <p className="text-sm text-slate-500 mt-0.5">Acompanhe todas as tarefas operacionais da sua agência</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchTarefas} className="shrink-0 gap-2 h-9">
          <RefreshCw className="h-3.5 w-3.5" /> Atualizar
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="text-sm flex-1">{error}</p>
          <Button variant="ghost" size="sm" onClick={fetchTarefas} className="text-red-700">Tentar novamente</Button>
        </div>
      )}

      {/* Status chips */}
      {!error && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter("all")}
            className={cn("flex items-center gap-2 rounded-lg px-3 py-1.5 border text-sm font-medium transition-colors",
              statusFilter === "all" ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50")}>
            Todas <span className="font-bold">{tarefas.length}</span>
          </button>
          {STATUS_TABS.map((s) => {
            const cfg = STATUS_CONFIG[s];
            const count = stats[s] ?? 0;
            if (count === 0) return null;
            return (
              <button key={s} onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
                className={cn("flex items-center gap-2 rounded-lg px-3 py-1.5 border text-xs font-medium transition-colors",
                  statusFilter === s ? `${cfg.bg} ${cfg.color} ${cfg.border}` : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50")}>
                {cfg.label} <span className="font-bold">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Search */}
      {!error && (
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar tarefa, projeto ou cliente..." className="pl-9 h-9 text-sm" />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Empty */}
      {!error && tarefas.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 flex flex-col items-center text-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center">
            <CheckSquare2 className="h-6 w-6 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-600">Nenhuma tarefa operacional encontrada.</p>
          <p className="text-xs text-slate-400">Tarefas são geradas quando produtos são vinculados a projetos ativos.</p>
        </div>
      )}

      {/* Table */}
      {!error && sorted.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <Th label="Código" field="code" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="pl-4 w-24" />
                  <Th label="Tarefa" field="title" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="min-w-[200px]" />
                  <Th label="Projeto" field="project" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="min-w-[140px]" />
                  <Th label="Cliente" field="client" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="min-w-[130px]" />
                  <Th label="Status" field="status" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="w-44" />
                  <Th label="Nômade" field="nomade" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="min-w-[120px]" />
                  <Th label="Prazo" field="due" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="w-24" />
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 w-24 pr-4">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sorted.map((t) => {
                  const sc = STATUS_CONFIG[t.status] ?? STATUS_CONFIG.PARA_LANCAMENTO;
                  const Icon = sc.icon;
                  const overdue = isOverdue(t);
                  const canLaunch = ["PARA_LANCAMENTO", "EM_LANCAMENTO", "AGUARDANDO_INFORMACOES", "DEVOLVIDA_PARA_AGENCIA"].includes(t.status);
                  return (
                    <tr key={t.id} className={cn("hover:bg-slate-50/50 transition-colors", overdue && "bg-red-50/20")}>
                      <td className="px-4 py-3 pl-4">
                        {(t.task_code || t.code_snapshot)
                          ? <span className="text-[11px] font-mono font-bold text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded">{t.task_code ?? t.code_snapshot}</span>
                          : <span className="text-xs text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900 line-clamp-1">{t.title}</p>
                        {t.category_snapshot && <p className="text-xs text-slate-400 mt-0.5">{t.category_snapshot}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <FolderOpen className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="text-sm text-slate-700 line-clamp-1">{t.project.title}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {t.project.client
                          ? <div className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" /><span className="text-sm text-slate-600 line-clamp-1">{t.project.client.name}</span></div>
                          : <span className="text-xs text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border", sc.bg, sc.color, sc.border)}>
                          <Icon className="h-3 w-3 shrink-0" /> {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {t.nomade_responsavel
                          ? <div className="flex items-center gap-1.5">
                              <div className="h-5 w-5 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                                <span className="text-[9px] font-bold text-purple-700">{t.nomade_responsavel.name[0]?.toUpperCase()}</span>
                              </div>
                              <span className="text-xs text-purple-800 line-clamp-1">{t.nomade_responsavel.name}</span>
                            </div>
                          : <span className="text-xs text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("text-sm", overdue ? "text-red-600 font-semibold" : "text-slate-600")}>{fmtDate(t.due_date)}</span>
                        {overdue && <span className="block text-[10px] text-red-500">atrasada</span>}
                      </td>
                      <td className="px-4 py-3 text-right pr-4">
                        {canLaunch && (
                          <Button size="sm" variant="outline"
                            onClick={() => setLaunchTask(t)}
                            className="h-7 text-xs gap-1.5 border-indigo-300 text-indigo-700 hover:bg-indigo-50">
                            <Rocket className="h-3 w-3" /> Lançar
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400">
            {sorted.length} tarefa{sorted.length !== 1 ? "s" : ""}
            {filtered.length < tarefas.length ? ` (de ${tarefas.length} total)` : ""}
          </div>
        </div>
      )}

      {/* No results (after filter) */}
      {!error && tarefas.length > 0 && sorted.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-10 flex flex-col items-center text-center gap-3">
          <Search className="h-7 w-7 text-slate-300" />
          <p className="text-sm font-medium text-slate-600">Nenhuma tarefa encontrada com os filtros aplicados.</p>
          <button onClick={() => { setSearch(""); setStatusFilter("all"); }} className="text-xs text-blue-600 underline hover:no-underline">Limpar filtros</button>
        </div>
      )}

      {/* Launch drawer */}
      {launchTask && (
        <TaskLaunchDrawer
          task={launchTask}
          onClose={() => setLaunchTask(null)}
          onReleased={handleReleased}
          onTaskUpdated={(updated) => {
            setTarefas((prev) => prev.map((t) => t.id === updated.id ? { ...t, ...updated } : t));
          }}
        />
      )}
    </div>
  );
}
