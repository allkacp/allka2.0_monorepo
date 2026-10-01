"use client";

// Conexões que a tarefa exige + pausas por dependência externa (SLA suspenso). Só aparece quando há algo a mostrar.
import { useEffect, useState } from "react";
import { PauseCircle, Plug } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { StateBadge } from "./connection-forms";

const KIND: Record<string, string> = { start: "necessária para iniciar", continue: "necessária para continuar", conclude: "necessária para concluir", info: "somente informativa" };
const PARTY: Record<string, string> = { client: "cliente", agency: "agência", provider: "provedor externo", allka: "Allka" };
const dt = (s?: string | null) => (s ? new Date(s).toLocaleString("pt-BR") : "—");

export function TaskConnectionsCard({ taskId, status }: { taskId: string; status?: string }) {
  const [v, setV] = useState<any>(null);
  useEffect(() => {
    let live = true;
    void apiClient.getTaskConnections(taskId).then((r) => live && setV(r)).catch(() => live && setV(null));
    return () => { live = false; };
  }, [taskId, status]);
  if (!v || (v.connections.length === 0 && v.blocks.length === 0)) return null;
  const open = v.blocks.filter((b: any) => !b.resolved_at);
  return (
    <div className="space-y-2 rounded-lg border border-violet-200 bg-violet-50/40 p-3 text-xs dark:border-violet-900 dark:bg-violet-950/20" data-testid="task-connections">
      <h4 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-violet-800 dark:text-violet-200"><Plug className="h-3.5 w-3.5" />Conexões desta tarefa</h4>
      {open.length > 0 && (
        <div className="rounded border border-rose-200 bg-rose-50 p-2 text-rose-900" role="alert">
          <p className="flex items-center gap-1.5 font-semibold"><PauseCircle className="h-4 w-4" />Pausada por dependência externa</p>
          {open.map((b: any) => <p key={b.id}>{b.reason} — responsável: {PARTY[b.party] ?? b.party}; desde {dt(b.started_at)}; {b.reminders_sent} lembrete(s). O prazo (SLA) está suspenso e não conta como atraso do executor.</p>)}
        </div>
      )}
      <ul className="space-y-1">
        {v.connections.map((c: any) => (
          <li key={c.rule_id} className="flex flex-wrap items-center gap-1.5"><strong>{c.label}</strong><span className="text-slate-500">({KIND[c.kind] ?? c.kind})</span><StateBadge status={c.satisfied ? "valid" : c.state} label={c.satisfied ? "Atendida" : "Aguardando"} />{!c.satisfied && <span className="text-slate-600">{c.reason}</span>}{c.released_manually && <span className="text-amber-700">(liberada manualmente)</span>}</li>
        ))}
      </ul>
      {v.blocks.filter((b: any) => b.resolved_at).length > 0 && (
        <details className="text-slate-600"><summary className="cursor-pointer font-semibold">Histórico de bloqueios</summary>
          <ul className="mt-1 space-y-0.5">{v.blocks.filter((b: any) => b.resolved_at).map((b: any) => <li key={b.id}>• {b.reason} — {dt(b.started_at)} → {dt(b.resolved_at)} ({b.blocked_minutes} min; impacto no prazo: {b.deadline_impact_minutes ?? 0} min)</li>)}</ul>
        </details>
      )}
    </div>
  );
}
