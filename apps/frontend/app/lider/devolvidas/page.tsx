// @ts-nocheck
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  AlertTriangle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  X,
  RotateCcw,
  Clock,
  Package,
  FolderOpen,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const API_BASE =
  (typeof import.meta !== "undefined" &&
    (import.meta as any).env?.VITE_API_URL) ||
  "/api";
const PAGE_SIZE = 20;

function getToken() {
  try { return localStorage.getItem("allka_token"); } catch { return null; }
}

async function apiFetch(path: string, params?: Record<string, string>) {
  let url = `${API_BASE}${path}`;
  if (params) {
    const qs = new URLSearchParams(params).toString();
    if (qs) url += `?${qs}`;
  }
  const token = getToken();
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

function fmtDate(d: string | null, compact = false) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR",
    compact
      ? { day: "2-digit", month: "2-digit" }
      : { day: "2-digit", month: "2-digit", year: "numeric" }
  );
}

// ── StatCard (igual ao Admin / Para Qualificar) ─────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  gradient,
}: {
  label: string;
  value: number;
  icon: any;
  gradient: string;
}) {
  return (
    <div
      className={cn(
        "relative rounded-xl bg-linear-to-br text-white shadow-sm text-left px-3 pt-2 pb-1.5 overflow-hidden",
        gradient,
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-medium text-white/70 leading-tight">{label}</p>
        <div className="bg-white/20 rounded-md p-1 shrink-0 ml-1">
          <Icon className="h-3 w-3 text-white" />
        </div>
      </div>
      <p className="text-2xl font-bold text-white leading-none">{value}</p>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function LiderDevolvidasPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch("/lider/tasks", {
        status: "REPROVADA",
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      setTasks(data.tasks ?? []);
      setTotal(data.total ?? 0);
    } catch (e: any) {
      setError(e.message ?? "Erro ao carregar tarefas");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return tasks;
    const q = search.toLowerCase();
    return tasks.filter((t) =>
      (t.title ?? t.name_snapshot ?? "").toLowerCase().includes(q) ||
      (t.task_code ?? t.code_snapshot ?? "").toLowerCase().includes(q) ||
      (t.project?.name ?? "").toLowerCase().includes(q) ||
      (t.project?.client?.name ?? "").toLowerCase().includes(q) ||
      (t.project_product?.product_name_snapshot ?? "").toLowerCase().includes(q) ||
      (t.observations ?? "").toLowerCase().includes(q)
    );
  }, [tasks, search]);

  const getPageNumbers = () => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 3) return [1, 2, 3, 4, "...", totalPages];
    if (page >= totalPages - 2) return [1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, "...", page - 1, page, page + 1, "...", totalPages];
  };

  return (
    <div className="space-y-5 p-4 md:p-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Devolvidas
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Tarefas devolvidas para a agência corrigir e relançar.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={load}
          disabled={loading}
          className="h-9 gap-2 shrink-0"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          Atualizar
        </Button>
      </div>

      {/* ── Stat cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Devolvidas"
          value={total}
          icon={RotateCcw}
          gradient="from-orange-500 to-orange-700"
        />
        <StatCard
          label="Nesta página"
          value={tasks.length}
          icon={Clock}
          gradient="from-slate-500 to-slate-700"
        />
        <StatCard
          label="Filtradas"
          value={search ? filtered.length : tasks.length}
          icon={Search}
          gradient="from-violet-500 to-purple-700"
        />
        <StatCard
          label="Total na área"
          value={total}
          icon={AlertTriangle}
          gradient="from-amber-500 to-orange-600"
        />
      </div>

      {/* ── Error banner ────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm px-4 py-3">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* ── Main Card ───────────────────────────────────────────────────── */}
      <Card className="border border-slate-200/70 dark:border-slate-700/60 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 px-5 py-3.5 border-b border-slate-200/70 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-900/30">
          <div className="relative flex-1 min-w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              placeholder="Buscar tarefa, código, projeto, cliente, motivo…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg w-full"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">
            {search
              ? `Mostrando ${filtered.length} de ${tasks.length}`
              : `${total} tarefa${total !== 1 ? "s" : ""}`
            }
          </span>
          {/* Pagination (top) */}
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="h-7 w-7 flex items-center justify-center rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            {getPageNumbers().map((pg, i) =>
              pg === "..." ? (
                <span key={i} className="text-xs text-slate-300 px-0.5">·</span>
              ) : (
                <button
                  key={i}
                  onClick={() => setPage(Number(pg))}
                  className={cn(
                    "h-7 w-7 flex items-center justify-center rounded-full text-xs font-semibold transition-colors",
                    pg === page
                      ? "btn-brand text-white shadow-sm"
                      : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400",
                  )}
                >
                  {pg}
                </button>
              )
            )}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="h-7 w-7 flex items-center justify-center rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
            <span className="text-sm">Carregando tarefas…</span>
          </div>
        )}

        {/* Empty — no data */}
        {!loading && tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="h-16 w-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <RotateCcw className="h-8 w-8 text-slate-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nenhuma tarefa devolvida
              </h2>
              <p className="text-sm text-slate-400 max-w-sm">
                As tarefas que você devolver para a agência aparecerão aqui.
              </p>
            </div>
          </div>
        )}

        {/* Empty — filter cleared results */}
        {!loading && tasks.length > 0 && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <Search className="h-8 w-8 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Nenhuma tarefa com os termos buscados.
            </p>
            <button
              onClick={() => setSearch("")}
              className="text-xs text-blue-600 dark:text-blue-400 underline hover:no-underline"
            >
              Limpar busca
            </button>
          </div>
        )}

        {/* Table */}
        {!loading && filtered.length > 0 && (
          <div
            className="overflow-auto allka-table-scroll"
            style={{ maxHeight: "calc(100vh - 18rem)" }}
          >
            <table
              className="text-sm"
              style={{ tableLayout: "fixed", width: "100%", minWidth: 960 }}
            >
              <colgroup>
                <col style={{ width: 120 }} />
                <col style={{ width: 220 }} />
                <col style={{ width: 150 }} />
                <col style={{ width: 150 }} />
                <col style={{ width: 150 }} />
                <col style={{ width: 280 }} />
                <col style={{ width: 110 }} />
              </colgroup>
              <thead>
                <tr className="border-b border-slate-200/60 dark:border-slate-700/60">
                  {["Código", "Tarefa", "Produto", "Projeto", "Cliente", "Motivo", "Data"].map((label, i) => (
                    <th
                      key={label}
                      className="py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none"
                      style={{
                        paddingLeft: 20,
                        paddingRight: 20,
                        textAlign: "left",
                        borderRight: i < 6 ? "1px solid rgba(148,163,184,0.2)" : undefined,
                        position: "sticky",
                        top: 0,
                        zIndex: 2,
                        background: "var(--table-head)",
                        boxShadow: "0 1px 0 rgba(148,163,184,0.3)",
                      }}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((task: any, rowIdx) => {
                  const code = task.task_code ?? task.code_snapshot ?? null;
                  const title = task.title ?? task.name_snapshot ?? "—";
                  const product =
                    task.project_product?.product_name_snapshot ??
                    task.project_product?.product?.name ?? "—";
                  const project = task.project?.name ?? "—";
                  const client = task.project?.client?.name ?? null;
                  const motivo = task.observations ?? null;

                  return (
                    <tr
                      key={task.id}
                      className={cn(
                        "border-b border-slate-100 dark:border-slate-700/50 transition-colors",
                        rowIdx % 2 === 0
                          ? "bg-table-row hover:bg-table-row-hover"
                          : "bg-table-row-alt hover:bg-table-row-hover",
                      )}
                    >
                      {/* Código */}
                      <td className="px-5 py-3.5" style={{ borderRight: "1px solid rgba(148,163,184,0.15)", overflow: "hidden" }}>
                        {code ? (
                          <span className="text-[11px] font-mono font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 border border-blue-100 dark:border-blue-800 px-1.5 py-0.5 rounded">
                            {code}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">—</span>
                        )}
                      </td>

                      {/* Tarefa */}
                      <td className="px-5 py-3.5" style={{ borderRight: "1px solid rgba(148,163,184,0.15)", overflow: "hidden" }}>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate leading-snug" title={title}>
                          {title}
                        </p>
                      </td>

                      {/* Produto */}
                      <td className="px-5 py-3.5" style={{ borderRight: "1px solid rgba(148,163,184,0.15)", overflow: "hidden" }}>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Package className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                          <span className="text-sm text-slate-700 dark:text-slate-300 truncate" title={product}>{product}</span>
                        </div>
                      </td>

                      {/* Projeto */}
                      <td className="px-5 py-3.5" style={{ borderRight: "1px solid rgba(148,163,184,0.15)", overflow: "hidden" }}>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <FolderOpen className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="text-sm text-slate-700 dark:text-slate-300 truncate" title={project}>{project}</span>
                        </div>
                      </td>

                      {/* Cliente */}
                      <td className="px-5 py-3.5" style={{ borderRight: "1px solid rgba(148,163,184,0.15)", overflow: "hidden" }}>
                        {client ? (
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="text-sm text-slate-700 dark:text-slate-300 truncate" title={client}>{client}</span>
                          </div>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">—</span>
                        )}
                      </td>

                      {/* Motivo */}
                      <td className="px-5 py-3.5" style={{ borderRight: "1px solid rgba(148,163,184,0.15)", overflow: "hidden" }}>
                        {motivo ? (
                          <span className="block text-sm text-slate-600 dark:text-slate-400 truncate" title={motivo}>
                            {motivo}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">—</span>
                        )}
                      </td>

                      {/* Data */}
                      <td className="px-5 py-3.5" style={{ overflow: "hidden" }}>
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {fmtDate(task.updated_at ?? task.created_at, true)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
