/**
 * Linha do tempo de uma ocorrência de alerta (ata 2026-08, 8º lote). Só
 * exibe eventos reais vindos do servidor (SystemAlertEvent) — nunca infere
 * "lido"/"entregue"/"visualizado". Alerta antigo (sem eventos registrados,
 * criado antes desta feature) mostra o aviso explicativo abaixo em vez de
 * uma lista vazia sem contexto.
 */
import { Circle } from "lucide-react";

export interface AlertTimelineEvent {
  id: string;
  event_type: string;
  description: string;
  created_at: string;
}

export function AlertTimeline({ events }: { events: AlertTimelineEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="text-xs text-slate-400 dark:text-slate-500 italic">
        O histórico detalhado deste alerta começou a ser registrado após a atualização da Central de Alertas.
      </p>
    );
  }

  return (
    <ol className="space-y-3" aria-label="Histórico do alerta">
      {events.map((event, idx) => (
        <li key={event.id} className="flex items-start gap-2.5">
          <div className="flex flex-col items-center pt-0.5">
            <Circle className="h-2 w-2 fill-slate-400 text-slate-400 shrink-0" aria-hidden="true" />
            {idx < events.length - 1 && <div className="w-px flex-1 min-h-4 bg-slate-200 dark:bg-slate-700 mt-1" />}
          </div>
          <div className="min-w-0 flex-1 pb-0.5">
            <p className="text-xs text-slate-700 dark:text-slate-200">{event.description}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {new Date(event.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
