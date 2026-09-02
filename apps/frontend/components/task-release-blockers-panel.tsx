"use client";

// ─── Bloqueadores de liberação da tarefa (bloco 4/4) ─────────────────────────
// Mostra "Pendente de liberação" com quais bloqueadores faltam/estão
// satisfeitos, pré-requisitos clicáveis, data programada, pagamento/onda e
// histórico de liberação. Nunca ignora bloqueador — as ações aqui só chamam
// as rotas dedicadas (aprovação manual, seleção, exceção administrativa),
// nunca escrevem status diretamente.

import React, { useEffect, useState, useCallback } from "react";
import { Loader2, Lock, CheckCircle2, Circle, Clock, CreditCard, UserCog, ShieldAlert, History } from "lucide-react";
import { apiClient, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface GateStatus {
  dependencies: { dependencyId: string; taskId: string; title: string; satisfied: boolean }[];
  triggers: { id: string; type: string; satisfied: boolean; scheduledAt: string | null }[];
  allSatisfied: boolean;
}

interface ReleaseEvent {
  id: string;
  event_type: string;
  description: string;
  created_at: string;
}

const TRIGGER_LABEL: Record<string, { label: string; icon: React.ElementType }> = {
  scheduled_date: { label: "Data programada", icon: Clock },
  payment: { label: "Pagamento da nova etapa", icon: CreditCard },
  manual_approval: { label: "Aprovação manual do gestor", icon: UserCog },
  specialty_selection: { label: "Especialidade requer seleção humana", icon: UserCog },
  responsible_selection: { label: "Responsável requer seleção humana", icon: UserCog },
};

export function TaskReleaseBlockersPanel({
  taskId,
  onOpenTask,
  canManage,
  isAdmin,
}: {
  taskId: string;
  onOpenTask?: (taskId: string) => void;
  canManage: boolean;
  isAdmin: boolean;
}) {
  const [gate, setGate] = useState<GateStatus | null>(null);
  const [events, setEvents] = useState<ReleaseEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [approvalNote, setApprovalNote] = useState<Record<string, string>>({});
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideOpen, setOverrideOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res: any = await apiClient.getTaskReleaseGates(taskId);
      setGate(res.gate);
      setEvents(res.events ?? []);
    } catch (e: any) {
      setError(e?.message ?? "Não foi possível carregar os bloqueadores.");
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    void load();
  }, [load]);

  const satisfyManual = async (triggerId: string) => {
    const note = (approvalNote[triggerId] ?? "").trim();
    if (!note) {
      setError("Justificativa é obrigatória para liberar manualmente.");
      return;
    }
    setBusyId(triggerId);
    setError(null);
    try {
      await apiClient.satisfyManualApprovalTrigger(triggerId, note);
      await load();
    } catch (e: any) {
      setError(e instanceof ApiError ? e.message : "Não foi possível registrar a aprovação manual.");
    } finally {
      setBusyId(null);
    }
  };

  const applyOverride = async () => {
    const reason = overrideReason.trim();
    if (!reason) {
      setError("Justificativa é obrigatória para a exceção administrativa.");
      return;
    }
    setBusyId("__override__");
    setError(null);
    try {
      await apiClient.applyTaskReleaseAdminOverride(taskId, reason);
      setOverrideOpen(false);
      setOverrideReason("");
      await load();
    } catch (e: any) {
      setError(e instanceof ApiError ? e.message : "Não foi possível aplicar a exceção administrativa.");
    } finally {
      setBusyId(null);
    }
  };

  if (loading && !gate) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando bloqueadores...
      </div>
    );
  }
  if (!gate) return null;

  return (
    <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-900/10 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-amber-600" />
          <span className="text-sm font-bold text-amber-800 dark:text-amber-300">
            {gate.allSatisfied ? "Todos os bloqueadores satisfeitos" : "Pendente de liberação"}
          </span>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-2.5 py-2">{error}</p>
      )}

      {gate.dependencies.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Pré-requisitos</p>
          {gate.dependencies.map((d) => (
            <button
              key={d.dependencyId}
              type="button"
              onClick={() => onOpenTask?.(d.taskId)}
              className="w-full flex items-center gap-2 text-left text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 hover:border-blue-300"
            >
              {d.satisfied ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-slate-400 shrink-0" />
              )}
              <span className={cn("truncate", d.satisfied ? "text-slate-500 line-through" : "text-slate-800 dark:text-slate-200")}>{d.title}</span>
            </button>
          ))}
        </div>
      )}

      {gate.triggers.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Outros gatilhos</p>
          {gate.triggers.map((t) => {
            const cfg = TRIGGER_LABEL[t.type] ?? { label: t.type, icon: Circle };
            const Icon = t.satisfied ? CheckCircle2 : cfg.icon;
            return (
              <div key={t.id} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 space-y-1.5">
                <div className="flex items-center gap-2 text-sm">
                  <Icon className={cn("h-4 w-4 shrink-0", t.satisfied ? "text-emerald-500" : "text-slate-400")} />
                  <span className={cn(t.satisfied ? "text-slate-500 line-through" : "text-slate-800 dark:text-slate-200")}>
                    {cfg.label}
                    {t.scheduledAt ? ` — ${new Date(t.scheduledAt).toLocaleString("pt-BR")}` : ""}
                  </span>
                </div>
                {!t.satisfied && t.type === "manual_approval" && canManage && (
                  <div className="flex items-center gap-2 pl-6">
                    <input
                      type="text"
                      value={approvalNote[t.id] ?? ""}
                      onChange={(e) => setApprovalNote((prev) => ({ ...prev, [t.id]: e.target.value }))}
                      placeholder="Justificativa da aprovação manual"
                      className="flex-1 text-xs rounded-md border border-slate-300 dark:border-slate-600 bg-transparent px-2 py-1"
                    />
                    <Button size="sm" variant="outline" disabled={busyId === t.id} onClick={() => void satisfyManual(t.id)}>
                      {busyId === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Liberar"}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isAdmin && !gate.allSatisfied && (
        <div className="pt-1 border-t border-amber-200 dark:border-amber-800">
          {!overrideOpen ? (
            <button type="button" className="text-xs text-amber-700 hover:underline flex items-center gap-1" onClick={() => setOverrideOpen(true)}>
              <ShieldAlert className="h-3.5 w-3.5" /> Aplicar exceção administrativa
            </button>
          ) : (
            <div className="space-y-2">
              <textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Justificativa obrigatória — libera ignorando bloqueadores pendentes"
                className="w-full text-xs rounded-md border border-amber-300 bg-transparent px-2 py-1.5"
                rows={2}
              />
              <div className="flex gap-2">
                <Button size="sm" variant="destructive" disabled={busyId === "__override__"} onClick={() => void applyOverride()}>
                  {busyId === "__override__" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Confirmar exceção"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setOverrideOpen(false)}>Cancelar</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {events.length > 0 && (
        <details className="pt-1">
          <summary className="text-[11px] font-bold uppercase tracking-wide text-slate-500 cursor-pointer flex items-center gap-1">
            <History className="h-3.5 w-3.5" /> Histórico de liberação ({events.length})
          </summary>
          <div className="mt-1.5 space-y-1">
            {events.map((ev) => (
              <p key={ev.id} className="text-xs text-slate-500">
                <span className="text-slate-400">{new Date(ev.created_at).toLocaleString("pt-BR")}</span> — {ev.description}
              </p>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
