"use client";
import { useEffect, useState } from "react";
import { Repeat } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { apiClient } from "@/lib/api-client";

// Continuidade do executor (decisão de 16/10): configuração SIMPLES, visível no Passo 2, sem recuperar o painel antigo da tarefa.
// Cada alteração é salva na hora (como "Execução por etapa"). Tudo é regra da TAREFA; produto individual tem uma só.

export const CONTINUITY_OPTIONS: { value: string; label: string; help: string }[] = [
  { value: "not_allowed", label: "Não permitida", help: "Em todo ciclo a tarefa vai para a distribuição normal. Etapas “dispensáveis com o mesmo executor” continuam sendo executadas e cobradas." },
  { value: "allowed", label: "Permitida", help: "Nos ciclos seguintes o cliente ou o líder pode escolher manter o mesmo executor. Se ninguém escolher, a tarefa espera a escolha." },
  { value: "recommended", label: "Recomendada", help: "O sistema sugere manter o mesmo executor (o cliente ou o líder pode trocar). Se mantido, o executor recebe a oferta primeiro e tem um prazo para aceitar." },
  { value: "required", label: "Obrigatória", help: "A tarefa vai direto para o mesmo executor do ciclo anterior, salvo se ele estiver indisponível, bloqueado ou sem a qualificação exigida." },
];
export const ASSET_RULE_OPTIONS: { value: string; label: string }[] = [
  { value: "first_only", label: "Só na primeira execução (padrão)" },
  { value: "on_client_change", label: "Quando o cliente avisar uma mudança" },
  { value: "on_executor_change", label: "Quando o executor mudar" },
  { value: "every_x_days", label: "A cada X dias" },
  { value: "always", label: "Antes de todo novo ciclo" },
  { value: "light_check", label: "Só uma conferência leve enquanto válidos" },
  { value: "none_while_valid", label: "Não exigir enquanto estiverem válidos" },
];
const sel = "h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900 disabled:opacity-60";
const info = (text: string) => <span className="field-info" data-help={text} aria-hidden="true">i</span>;

export function ContinuityCard({ task, readOnly, act }: { task: any; readOnly: boolean; act: (fn: () => Promise<any>, ok?: string) => Promise<any> }) {
  const mode: string = task.executor_continuity ?? "not_allowed";
  const [hours, setHours] = useState<string>(task.continuity_accept_hours == null ? "" : String(task.continuity_accept_hours));
  const [days, setDays] = useState<string>(task.asset_revalidate_days == null ? "" : String(task.asset_revalidate_days));
  useEffect(() => { setHours(task.continuity_accept_hours == null ? "" : String(task.continuity_accept_hours)); }, [task.continuity_accept_hours]);
  useEffect(() => { setDays(task.asset_revalidate_days == null ? "" : String(task.asset_revalidate_days)); }, [task.asset_revalidate_days]);
  const save = (patch: Record<string, unknown>, ok = "Continuidade do executor salva.") => void act(() => apiClient.updateCatalog2Task(task.id, { ...patch, scope: "product" }), ok);
  const current = CONTINUITY_OPTIONS.find((o) => o.value === mode) ?? CONTINUITY_OPTIONS[0];
  const on = mode !== "not_allowed";
  const afterDeadlineNormal = (task.continuity_after_deadline ?? "normal_queue") === "normal_queue";
  const commitHours = () => {
    const n = hours.trim() === "" ? null : Math.trunc(Number(hours));
    if (n !== null && (!Number.isFinite(n) || n < 1 || n > 168)) return;
    if (n !== (task.continuity_accept_hours ?? null)) save({ continuity_accept_hours: n }, "Prazo de aceite salvo.");
  };
  return (
    <section className="mt-2 space-y-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/60" data-testid="continuity-card" aria-label="Continuidade do executor">
      <div className="flex items-start gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-950/40"><Repeat className="h-4 w-4" /></span>
        <span className="min-w-0">
          <span className="block text-[14px] font-bold text-slate-900 dark:text-slate-100" data-no-info="">Continuidade do executor nos próximos ciclos{info("Define se, nos ciclos seguintes (ou numa nova contratação do mesmo cliente), a tarefa tenta voltar para o MESMO executor.\n• Não permitida: sempre distribuição normal.\n• Permitida: o cliente/líder escolhe manter.\n• Recomendada: o sistema sugere manter; o executor tem um prazo para aceitar.\n• Obrigatória: vai direto ao mesmo executor, salvo indisponibilidade.\nEtapas marcadas “Dispensável quando o mesmo executor continua” só são dispensadas se a continuidade estiver permitida, recomendada ou obrigatória.")}</span>
          <span className="block text-[11px] text-slate-500">Vale para a tarefa; salva na hora.</span>
        </span>
      </div>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300" data-no-info="">Continuidade{info(current.help)}</span>
        <select aria-label="Continuidade do executor nos próximos ciclos" className={sel} disabled={readOnly} value={mode} onChange={(e) => {
          const v = e.target.value;
          // Recomendada/permitida pedem um prazo de aceite: sugere 2 h na primeira vez (editável).
          save({ executor_continuity: v, ...((v === "recommended" || v === "allowed") && task.continuity_accept_hours == null ? { continuity_accept_hours: 2 } : {}) });
        }}>
          {CONTINUITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>
      <p className="text-[11px] leading-snug text-slate-500" data-testid="continuity-help">{current.help}</p>
      {on && (
        <div className="grid gap-3 md:grid-cols-2" data-testid="continuity-details">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300" data-no-info="">Prazo de aceite do executor preferido (horas){info("Quantas horas o executor do ciclo anterior tem para ACEITAR a tarefa. Sem resposta nesse prazo, vale a opção “Depois do prazo”. Vazio = sem prazo: a tarefa é atribuída direto a ele (se estiver elegível). Na continuidade obrigatória não há prazo: vai direto.")}</span>
            <input type="number" min={1} max={168} step={1} aria-label="Prazo de aceite do executor preferido (horas)" className={sel} disabled={readOnly || mode === "required"} value={hours} placeholder="sem prazo" onChange={(e) => setHours(e.target.value)} onBlur={commitHours} onKeyDown={(e) => { if (e.key === "Enter") commitHours(); }} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300" data-no-info="">Se o executor estiver indisponível{info("Indisponível = inativo, bloqueado ou sem a qualificação exigida. “Usar a distribuição normal” manda a tarefa para a fila inteligente (e avisa o líder). “Pedir decisão do líder” segura a tarefa até ele escolher.")}</span>
            <select aria-label="Se o executor estiver indisponível" className={sel} disabled={readOnly} value={task.continuity_if_unavailable ?? "normal_queue"} onChange={(e) => save({ continuity_if_unavailable: e.target.value })}>
              <option value="normal_queue">Usar a distribuição normal</option>
              <option value="ask_leader">Pedir decisão do líder</option>
            </select>
          </label>
          <label className="flex items-center gap-2.5 text-sm font-medium">
            <Switch aria-label="Depois do prazo, usar a distribuição normal" checked={afterDeadlineNormal} disabled={readOnly || mode === "required"} onCheckedChange={(v) => save({ continuity_after_deadline: v ? "normal_queue" : "ask_leader" })} />
            <span data-no-info="">Depois do prazo, usar a distribuição normal{info("Ligado: se o executor não responder no prazo de aceite, a tarefa segue para a fila normal. Desligado: o líder é avisado e decide.")}</span>
          </label>
          <label className="flex items-center gap-2.5 text-sm font-medium">
            <Switch aria-label="Reutilizar conexões só no mesmo projeto" checked={!!task.reuse_connections_same_project} disabled={readOnly} onCheckedChange={(v) => save({ reuse_connections_same_project: !!v })} />
            <span data-no-info="">Reutilizar conexões só no mesmo projeto{info("Ligado: os acessos/conexões já validados e as etapas “dispensáveis” só são reaproveitados quando a execução anterior foi NO MESMO PROJETO (com a autorização que o cliente já deu nele). Desligado: vale para qualquer projeto do mesmo cliente, como sempre foi.")}</span>
          </label>
        </div>
      )}
      <div className="grid gap-3 md:grid-cols-2">
          <label className="block md:col-span-2">
            <span className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300" data-no-info="">Revalidação dos acessos antes do novo ciclo{info("Quando os acessos do cliente precisam ser conferidos de novo. Padrão: só na primeira execução (e quando houver mudança).")}</span>
            <div className="flex flex-wrap items-center gap-2">
              <select aria-label="Revalidação dos acessos antes do novo ciclo" className={`${sel} max-w-sm`} disabled={readOnly} value={task.asset_rule ?? "first_only"} onChange={(e) => save({ asset_rule: e.target.value }, "Regra de acessos salva.")}>
                {ASSET_RULE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {(task.asset_rule ?? "first_only") === "every_x_days" && (
                <label className="inline-flex items-center gap-1 text-xs">a cada
                  <input type="number" min={1} max={730} aria-label="Dias para revalidar os acessos" className="h-9 w-20 rounded-lg border border-slate-200 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={days} disabled={readOnly} onChange={(e) => setDays(e.target.value)} onBlur={() => { const n = days.trim() === "" ? null : Math.trunc(Number(days)); if (n !== (task.asset_revalidate_days ?? null) && (n === null || (n >= 1 && n <= 730))) save({ asset_revalidate_days: n }, "Regra de acessos salva."); }} /> dias
                </label>
              )}
            </div>
          </label>
      </div>
    </section>
  );
}
