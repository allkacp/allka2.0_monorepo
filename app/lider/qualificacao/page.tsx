// @ts-nocheck
"use client";

import { useState, useEffect, useCallback } from "react";
import { CheckCircle2, RotateCcw, AlertTriangle, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const API_BASE = "/api";
const PAGE_SIZE = 20;

function getToken() {
  try { return localStorage.getItem("allka_token"); } catch { return null; }
}

async function apiFetch(path: string, options?: RequestInit, params?: Record<string, string>) {
  let url = `${API_BASE}${path}`;
  if (params) {
    const qs = new URLSearchParams(params).toString();
    if (qs) url += `?${qs}`;
  }
  const token = getToken();
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
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

function ReturnDialog({
  open,
  saving,
  onClose,
  onConfirm,
}: {
  open: boolean;
  saving: boolean;
  onClose: () => void;
  onConfirm: (motivo: string) => void;
}) {
  const [motivo, setMotivo] = useState("");
  useEffect(() => { if (!open) setMotivo(""); }, [open]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Devolver para a agência</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Label htmlFor="motivo-retorno">Motivo da devolução</Label>
          <Textarea
            id="motivo-retorno"
            placeholder="Descreva o motivo para a agência relançar a tarefa…"
            rows={4}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            disabled={saving}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            className="bg-orange-600 hover:bg-orange-700 text-white"
            disabled={saving || !motivo.trim()}
            onClick={() => onConfirm(motivo.trim())}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RotateCcw className="h-4 w-4 mr-1" />}
            Devolver
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function LiderQualificacaoPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Per-row action state
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [returnDialogTask, setReturnDialogTask] = useState<any | null>(null);
  const [returning, setReturning] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch("/lider/tasks", undefined, {
        status: "PARA_LANCAMENTO",
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

  const handleApprove = async (task: any) => {
    setApprovingId(task.id);
    try {
      await apiFetch(`/lider/tasks/${task.id}/approve`, { method: "PATCH" });
      await load();
    } catch (e: any) {
      alert(e.message ?? "Erro ao aprovar tarefa");
    } finally {
      setApprovingId(null);
    }
  };

  const handleReturn = async (motivo: string) => {
    if (!returnDialogTask) return;
    setReturning(true);
    try {
      await apiFetch(`/lider/tasks/${returnDialogTask.id}/return`, {
        method: "PATCH",
        body: JSON.stringify({ motivo }),
      });
      setReturnDialogTask(null);
      await load();
    } catch (e: any) {
      alert(e.message ?? "Erro ao devolver tarefa");
    } finally {
      setReturning(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Para Qualificar"
        description={`${total} tarefa${total !== 1 ? "s" : ""} aguardando qualificação`}
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
            Nenhuma tarefa para qualificar.
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
                  <th className="px-5 py-3 text-left font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-border">
                {tasks.map((task: any) => {
                  const isApproving = approvingId === task.id;
                  return (
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
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white h-7 px-3 text-xs"
                            disabled={isApproving || !!approvingId}
                            onClick={() => handleApprove(task)}
                          >
                            {isApproving
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : <><CheckCircle2 className="h-3 w-3 mr-1" />Aprovar</>
                            }
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-orange-300 text-orange-600 hover:bg-orange-50 h-7 px-3 text-xs"
                            disabled={isApproving || !!approvingId}
                            onClick={() => setReturnDialogTask(task)}
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Devolver
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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

      <ReturnDialog
        open={!!returnDialogTask}
        saving={returning}
        onClose={() => setReturnDialogTask(null)}
        onConfirm={handleReturn}
      />
    </div>
  );
}
