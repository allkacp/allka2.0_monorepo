"use client";

// Orientações da tarefa contratada (Pedido 3, fase 1): o que o perfil logado pode ver das instruções,
// entradas, saída esperada, critérios e evidências. O servidor só devolve o que a visibilidade permite.
import { useEffect, useState } from "react";
import { BookOpen, ChevronDown, Paperclip } from "lucide-react";
import { apiClient } from "@/lib/api-client";

type Visibility = "internal" | "leader" | "executor" | "agency" | "client";

interface GuideItem { key: string; label: string; value: string }
interface GuideData {
  viewer: Visibility;
  task: { items: GuideItem[] };
  stages: { stage_id: string; titulo: string; ordem: number; status: string; items: GuideItem[]; evidence_required: boolean; checklist?: { id: string; text: string; kind: "execucao" | "aprovacao" | "qualificacao"; required: boolean }[] }[];
}

/** Mostra o que o perfil logado pode ver das orientações da tarefa. Não mostra nada se não houver conteúdo. */
export function TaskGuideCard({ taskId, onlyStageId, defaultOpen = false, className = "" }: { taskId: string; onlyStageId?: string; defaultOpen?: boolean; className?: string }) {
  const [data, setData] = useState<GuideData | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setData(null);
    setFailed(false);
    apiClient
      .getTaskOperational(taskId)
      .then((r: GuideData) => { if (!cancelled) setData(r); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [taskId]);
  if (failed || !data) return null;
  const stages = data.stages.filter((s) => (onlyStageId ? s.stage_id === onlyStageId : true) && (s.items.length > 0 || s.evidence_required || (s.checklist?.length ?? 0) > 0));
  const taskItems = onlyStageId ? [] : data.task.items;
  if (taskItems.length === 0 && stages.length === 0) return null;
  return (
    <details open={defaultOpen || undefined} className={`group rounded-xl border border-violet-200 bg-violet-50/50 dark:border-violet-900/50 dark:bg-violet-950/20 ${className}`}>
      <summary className="flex cursor-pointer select-none list-none items-center gap-2 px-3 py-2 text-xs font-semibold text-violet-800 dark:text-violet-200 [&::-webkit-details-marker]:hidden">
        <BookOpen className="h-4 w-4" /> Orientações da tarefa
        <ChevronDown className="ml-auto h-4 w-4 transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-3 border-t border-violet-100 px-3 py-2.5 text-xs dark:border-violet-900/40">
        {taskItems.length > 0 && (
          <dl className="space-y-2">
            {taskItems.map((i) => (
              <div key={i.key}>
                <dt className="text-[10px] font-bold uppercase tracking-wide text-violet-600 dark:text-violet-300">{i.label}</dt>
                <dd className="whitespace-pre-line text-slate-700 dark:text-slate-200">{i.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {stages.map((s) => (
          <div key={s.stage_id} className="rounded-lg border border-sky-200 bg-white/70 p-2 dark:border-sky-900/50 dark:bg-slate-900/40">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-sky-800 dark:text-sky-200">
              Etapa {s.ordem}: {s.titulo}
              {s.evidence_required && <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800"><Paperclip className="h-3 w-3" /> exige evidência</span>}
            </p>
            <dl className="mt-1 space-y-1.5">
              {s.items.map((i) => (
                <div key={i.key}>
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{i.label}</dt>
                  <dd className="whitespace-pre-line text-slate-700 dark:text-slate-200">{i.value}</dd>
                </div>
              ))}
            </dl>
            {(s.checklist?.length ?? 0) > 0 && (
              <div className="mt-1.5" data-testid="stage-checklist">
                {(["execucao", "qualificacao", "aprovacao"] as const).map((kind) => {
                  const list = s.checklist!.filter((c) => c.kind === kind);
                  if (list.length === 0) return null;
                  return (
                    <div key={kind} className="mt-1">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{kind === "execucao" ? "Checklist de execução" : kind === "qualificacao" ? "Checklist de qualificação" : "Checklist de aprovação"}</p>
                      <ul className="ml-4 list-disc text-slate-700 dark:text-slate-200">{list.map((c) => <li key={c.id}>{c.text}{c.required ? <span className="text-red-600"> *</span> : null}</li>)}</ul>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </details>
  );
}
