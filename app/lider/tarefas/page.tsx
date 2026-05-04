// @ts-nocheck
"use client";

import { useState, useEffect, useCallback } from "react";
import { Eye, AlertTriangle, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { TarefaDetailDrawer } from "@/components/tarefa-detail-drawer";

const API_BASE = "/api";
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

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  EM_EXECUCAO:            { label: "Em Execução",       color: "bg-yellow-100 text-yellow-700" },
  EM_REVISAO:             { label: "Em Revisão",        color: "bg-purple-100 text-purple-700" },
  AGUARDANDO_INFORMACOES: { label: "Aguardando Info",   color: "bg-amber-100 text-amber-700" },
  LIBERADA_PARA_EXECUCAO: { label: "Liberada",          color: "bg-teal-100 text-teal-700" },
  ENTREGA_PENDENTE:       { label: "Entrega Pendente",  color: "bg-orange-100 text-orange-700" },
  ENTREGA_ATRASADA:       { label: "Entrega Atrasada",  color: "bg-red-100 text-red-700" },
  EM_APROVACAO:           { label: "Em Aprovação",      color: "bg-indigo-100 text-indigo-700" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_LABELS[status] ?? { label: status, color: "bg-slate-100 text-slate-600" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function buildDrawerTask(task: any) {
  return {
    id: task.id,
    title: task.title ?? task.name_snapshot ?? "",
    code_snapshot: task.task_code ?? task.code_snapshot ?? null,
    task_code: task.task_code ?? null,
    status: task.status ?? "EM_EXECUCAO",
    priority: task.priority ?? "medium",
    due_date: task.due_date ?? null,
    lancamento_expires_at: task.lancamento_expires_at ?? null,
    project: task.project
      ? {
          id: String(task.project.id),
          title: task.project.name,
          client: { name: task.project?.client?.name ?? "" },
        }
      : null,
    project_product: {
      product_name_snapshot:
        task.project_product?.product_name_snapshot ??
        task.project_product?.product?.name ??
        "",
    },
  };
}

export default function LiderTarefasPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTask, setDrawerTask] = useState<any | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch("/lider/tasks", {
        status: "EM_EXECUCAO",
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

  const openDrawer = (task: any) => {
    setDrawerTask(buildDrawerTask(task));
    setDrawerOpen(true);
  };

  return (
    <div>
      <PageHeader
        title="Em Execução"
        description={`${total} tarefa${total !== 1 ? "s" : ""} em execução`}
      />

      {error && (
        <div className="flex items-center gap-2 text-red-500 text-sm mb-4">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-card rounded-xl border border-slate-200 dark:border-border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48 gap-2 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Carregando…</span>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
            Nenhuma tarefa em execução.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-400 uppercase tracking-wide border-b border-slate-100 dark:border-border">
                  <th className="px-5 py-3 text-left font-medium">Código</th>
                  <th className="px-5 py-3 text-left font-medium">Tarefa</th>
                  <th className="px-5 py-3 text-left font-medium">Produto</th>
                  <th className="px-5 py-3 text-left font-medium">Projeto</th>
                  <th className="px-5 py-3 text-left font-medium">Cliente</th>
                  <th className="px-5 py-3 text-left font-medium">Prazo</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                  <th className="px-5 py-3 text-left font-medium">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-border">
                {tasks.map((task: any) => (
                  <tr key={task.id} className="hover:bg-slate-50 dark:hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">
                      {task.task_code ?? task.code_snapshot ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-slate-800 dark:text-slate-100 max-w-[180px] truncate">
                      {task.title ?? task.name_snapshot ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-slate-500 whitespace-nowrap max-w-[140px] truncate">
                      {task.project_product?.product_name_snapshot ??
                        task.project_product?.product?.name ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-slate-500 whitespace-nowrap">
                      {task.project?.name ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-slate-500 whitespace-nowrap">
                      {task.project?.client?.name ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-slate-500 whitespace-nowrap">
                      {fmtDate(task.due_date)}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={task.status} />
                    </td>
                    <td className="px-5 py-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 w-7 p-0"
                        title="Ver detalhes"
                        onClick={() => openDrawer(task)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-border">
            <span className="text-xs text-slate-400">
              Página {page} de {totalPages} · {total} tarefa{total !== 1 ? "s" : ""}
            </span>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                className="h-7 w-7 p-0"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 w-7 p-0"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <TarefaDetailDrawer
        tarefa={drawerTask}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onStatusChange={() => load()}
        updatingId={null}
      />
    </div>
  );
}
