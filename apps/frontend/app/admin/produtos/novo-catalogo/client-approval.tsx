"use client";

// Aprovação do cliente da etapa, EXPLÍCITA (19/10): "Esta etapa exige aprovação do cliente?" (Não · Sim, pela própria etapa · Sim, por entregáveis ·
// Apenas ciência) + prazos, ajustes, silêncio e um resumo em linguagem simples do que acontece. "Etapa interna" continua existindo e, quando
// ligada, desativa as opções de aprovação do cliente explicando o motivo. Só vale em tarefa com execução por etapa.
import { RevealBox } from "./reveal";

export type ApprovalMode = "none" | "step" | "deliverables" | "awareness";
export interface ApprovalCfg { mode: ApprovalMode; silence_action?: "wait" | "remind" | "escalate"; adjust_receiver?: "executor" | "leader"; adjustment_limit?: number }

export const MODE_LABEL: Record<ApprovalMode, string> = {
  none: "Não",
  step: "Sim, pela própria etapa",
  deliverables: "Sim, por um ou mais entregáveis",
  awareness: "Apenas ciência do cliente, sem bloquear o fluxo",
};
const SILENCE_LABEL: Record<NonNullable<ApprovalCfg["silence_action"]>, string> = { wait: "Continuar aguardando", remind: "Lembrar o cliente", escalate: "Avisar o líder" };
const RECEIVER_LABEL: Record<NonNullable<ApprovalCfg["adjust_receiver"]>, string> = { executor: "O executor da etapa", leader: "O líder da área" };

/** Modo efetivo: o gravado; sem gravação, o comportamento anterior (etapa visível ao cliente é aprovada por ele). */
export const effectiveMode = (ops: any, internal: boolean): ApprovalMode => (internal ? "none" : (ops?.client_approval?.mode as ApprovalMode | undefined) ?? "step");

const hoursText = (h: string) => `${h} hora${h === "1" ? "" : "s"} úteis`;

/** Resumo em linguagem simples (sem jargão) do que acontece quando a etapa termina. */
export function approvalSummary(p: { internal: boolean; ops: any; approvalHours: string; reworkHours: string; deliverableNames: string[]; hasNext: boolean }): string {
  if (p.internal) return "Etapa interna: o cliente não vê nem aprova esta etapa. Ao concluir, ela segue direto para a próxima.";
  const cfg = (p.ops?.client_approval ?? {}) as Partial<ApprovalCfg>;
  const mode = effectiveMode(p.ops, false);
  if (mode === "none") return "O cliente não aprova esta etapa. Ao concluir, ela segue direto para a próxima.";
  if (mode === "awareness") return "Ao concluir esta etapa, o cliente é avisado (ciência), mas nada fica esperando por ele: a próxima etapa é liberada na hora.";
  const what = mode === "deliverables"
    ? (p.deliverableNames.length ? `o${p.deliverableNames.length > 1 ? "s entregáveis" : " entregável"} ${p.deliverableNames.map((n) => `“${n}”`).join(", ")} ser${p.deliverableNames.length > 1 ? "ão enviados" : "á enviado"} ao cliente` : "os entregáveis que exigem aprovação serão enviados ao cliente (nenhum está marcado ainda)")
    : "ela será enviada ao cliente";
  const parts = [`Ao concluir esta etapa, ${what}.`];
  parts.push(p.hasNext ? "A próxima etapa ficará bloqueada até a aprovação." : "O encerramento da tarefa aguarda a aprovação.");
  parts.push(p.approvalHours.trim() ? `O cliente terá ${hoursText(p.approvalHours.trim())} para responder.` : "O cliente responde dentro do prazo padrão da plataforma.");
  if (cfg.silence_action && cfg.silence_action !== "wait") parts.push(`Se não responder, ${cfg.silence_action === "remind" ? "o cliente será lembrado" : "o líder será avisado"} (registrado no cadastro).`);
  const who = (cfg.adjust_receiver ?? "executor") === "leader" ? "o líder da área" : "o executor";
  parts.push(p.reworkHours.trim() ? `Se pedir ajuste, ${who} terá ${hoursText(p.reworkHours.trim())} para reenviar.` : `Se pedir ajuste, ${who} refaz dentro do prazo anterior da etapa.`);
  if (typeof cfg.adjustment_limit === "number") parts.push(`O cliente pode pedir até ${cfg.adjustment_limit} ajuste${cfg.adjustment_limit === 1 ? "" : "s"}.`);
  return parts.join(" ");
}

const CTL = "h-9 w-full min-w-0 rounded-md border border-slate-300 bg-white px-2.5 text-sm dark:border-slate-600 dark:bg-slate-900";
function Fld({ label, field, error, children }: { label: React.ReactNode; field?: string; error?: string | null; children: React.ReactNode }) {
  return (
    <label data-field={field} data-invalid={error ? "true" : undefined} className={`block min-w-0 space-y-0.5 ${error ? "rounded-md ring-2 ring-rose-400 ring-offset-2" : ""}`}>
      <span className="block text-xs font-semibold text-slate-700 dark:text-slate-200">{label}</span>{children}
      {error && <span role="alert" className="block text-[11px] font-semibold text-rose-600">{error}</span>}
    </label>
  );
}

export function ClientApprovalSection({ task, step, f, patch, setOps, readOnly, err, hoursBad, approvable, hasNext, onReveal, onClearDeliverableApprovals }: {
  task: any; step: any; f: any; patch: (p: Record<string, unknown>) => void; setOps: (p: Record<string, unknown>) => void; readOnly: boolean;
  err: (field: string) => string | null; hoursBad: boolean;
  /** Nomes dos entregáveis ativos desta etapa que exigem aprovação do cliente. */
  approvable: string[]; hasNext: boolean; onReveal?: () => void; onClearDeliverableApprovals?: () => void;
}) {
  const stage = task?.stage_execution === "stage";
  if (!stage) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300" data-testid="approval-not-stage">
        <p className="font-semibold">Aprovação do cliente</p>
        <p className="mt-0.5">Esta tarefa <strong>não executa por etapa</strong>: a qualificação e a aprovação do cliente acontecem no fim da tarefa, não nesta etapa. Para aprovar etapa por etapa, ligue “Esta tarefa executa por etapa” na caixa de qualificação, acima.</p>
      </div>
    );
  }
  const internal = !!f.internal_step;
  const cfg: Partial<ApprovalCfg> = f.ops?.client_approval ?? {};
  const mode = effectiveMode(f.ops, internal);
  const legacy = !internal && !f.ops?.client_approval;
  const gate = mode === "step" || mode === "deliverables";
  const setCfg = (p: Partial<ApprovalCfg>) => setOps({ client_approval: { mode, ...cfg, ...p } });
  const summary = approvalSummary({ internal, ops: f.ops, approvalHours: f.approval_hours, reworkHours: f.rework_hours, deliverableNames: approvable, hasNext });
  const missingDeliv = mode === "deliverables" && approvable.length === 0 ? 1 : 0;
  const incompatibleDeliverables = mode !== "deliverables" && approvable.length > 0;
  return (
    <div className="mt-1 space-y-2 rounded-lg border border-violet-200 bg-violet-50/50 p-2.5 dark:border-violet-900 dark:bg-violet-950/20" data-testid="stage-flags">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">Aprovação do cliente e execução por etapa</p>
      <label className="flex items-start gap-2 text-sm" title="O cliente não vê nem aprova esta etapa (ex.: validação de briefing ou de acessos). Se achar um problema, o líder pode avisar o cliente.">
        <input type="checkbox" className="mt-0.5 h-4 w-4" checked={internal} disabled={readOnly} onChange={(e) => { const on = e.target.checked; const ca = f.ops?.client_approval; patch(on && ca && ca.mode !== "none" ? { internal_step: true, ops: { ...f.ops, client_approval: { ...ca, mode: "none" } } } : { internal_step: on }); }} />
        <span><strong>Etapa interna</strong> — o cliente não visualiza nem aprova esta etapa</span>
      </label>
      {internal && <p className="rounded-md bg-slate-100 px-2 py-1 text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300" data-testid="approval-internal-note">Como a etapa é interna, a aprovação do cliente e os prazos dele <strong>não se aplicam</strong>: as opções abaixo ficam desativadas. Desmarque “Etapa interna” para configurá-las.</p>}
      <fieldset className="space-y-1" disabled={readOnly || internal} data-field="approval_mode" data-invalid={err("approval_mode") ? "true" : undefined}>
        <legend className="text-xs font-bold text-slate-800 dark:text-slate-100">Esta etapa exige aprovação do cliente?</legend>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {(Object.keys(MODE_LABEL) as ApprovalMode[]).map((m) => (
            <label key={m} className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs ${internal ? "opacity-50" : "cursor-pointer"} ${mode === m ? "border-violet-500 bg-white font-semibold dark:bg-slate-900" : "border-slate-200 bg-white/60 dark:border-slate-700 dark:bg-slate-900/40"}`}>
              <input type="radio" name={`approval-${step.id}`} checked={mode === m} onChange={() => setCfg({ mode: m })} /> {MODE_LABEL[m]}
            </label>
          ))}
        </div>
        {legacy && <p className="text-[11px] text-slate-500">Hoje esta etapa segue o comportamento anterior: o cliente aprova a etapa. Escolha uma opção para deixar explícito.</p>}
        {err("approval_mode") && <p role="alert" className="text-[11px] font-semibold text-rose-600">{err("approval_mode")}</p>}
      </fieldset>

      <RevealBox active={!internal && mode === "deliverables"} missing={missingDeliv} title="Entregáveis que o cliente aprova" onReveal={onReveal} testId="approval-deliverables-box">
        <div data-field="approval_deliverables" data-invalid={err("approval_deliverables") ? "true" : undefined} className="rounded-md bg-white/70 p-2 text-xs dark:bg-slate-900/50">
          {approvable.length ? <ul className="list-disc space-y-0.5 pl-4">{approvable.map((n) => <li key={n}>{n}</li>)}</ul> : <p className="text-amber-800">Nenhum entregável desta etapa exige aprovação do cliente ainda. No bloco “Entregáveis desta etapa”, marque “Exige aprovação” em ao menos um.</p>}
          {err("approval_deliverables") && <p role="alert" className="mt-1 font-semibold text-rose-600">{err("approval_deliverables")}</p>}
        </div>
      </RevealBox>

      {!internal && incompatibleDeliverables && <div className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-950" data-testid="approval-deliverables-conflict">
        <strong>Configuração incompatível:</strong> {approvable.length === 1 ? `o entregável “${approvable[0]}” está` : `${approvable.length} entregáveis estão`} marcado{approvable.length === 1 ? "" : "s"} para aprovação, mas a etapa usa “{MODE_LABEL[mode]}”.
        <div className="mt-1.5 flex flex-wrap gap-2">
          <button type="button" className="font-semibold text-violet-700 underline" onClick={() => setCfg({ mode: "deliverables" })}>Usar aprovação por entregáveis</button>
          {onClearDeliverableApprovals && <button type="button" className="font-semibold text-violet-700 underline" onClick={onClearDeliverableApprovals}>Desativar aprovação dos entregáveis</button>}
        </div>
      </div>}

      <RevealBox active={!internal && gate} title="Prazos e ajustes" onReveal={onReveal} testId="approval-details">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3" data-testid="stage-hours">
          <Fld field="approval_hours" error={err("approval_hours")} label="Prazo de aprovação do cliente (h úteis)"><input type="number" min={1} step={1} aria-label="Prazo de aprovação do cliente (horas úteis)" title="Quantas horas úteis o cliente tem para aprovar esta etapa. Vazio = padrão da plataforma." className={CTL} value={f.approval_hours} onChange={(e) => patch({ approval_hours: e.target.value })} placeholder="padrão" /></Fld>
          <Fld field="rework_hours" error={err("rework_hours")} label="Prazo de refação (h úteis)"><input type="number" min={1} step={1} aria-label="Prazo de refação (horas úteis)" title="Quantas horas úteis o executor tem para refazer depois de um pedido de ajuste. Vazio = mantém o prazo anterior." className={CTL} value={f.rework_hours} onChange={(e) => patch({ rework_hours: e.target.value })} placeholder="mantém" /></Fld>
          <Fld label="Limite de ajustes pedidos pelo cliente"><input type="number" min={0} max={50} step={1} aria-label="Limite de ajustes" title="Quantos pedidos de ajuste o cliente pode fazer nesta etapa. Vazio = sem limite definido. Fica registrado no cadastro." className={CTL} value={cfg.adjustment_limit ?? ""} onChange={(e) => setCfg({ adjustment_limit: e.target.value === "" ? undefined : Math.max(0, Math.min(50, Math.trunc(Number(e.target.value)))) })} placeholder="sem limite" /></Fld>
          <Fld label="Quem recebe o pedido de ajustes"><select className={CTL} aria-label="Quem recebe o pedido de ajustes" value={cfg.adjust_receiver ?? "executor"} onChange={(e) => setCfg({ adjust_receiver: e.target.value as ApprovalCfg["adjust_receiver"] })}>{(Object.keys(RECEIVER_LABEL) as NonNullable<ApprovalCfg["adjust_receiver"]>[]).map((k) => <option key={k} value={k}>{RECEIVER_LABEL[k]}</option>)}</select></Fld>
          <Fld label="Se o cliente não responder no prazo"><select className={CTL} aria-label="Se o cliente não responder no prazo" value={cfg.silence_action ?? "wait"} onChange={(e) => setCfg({ silence_action: e.target.value as ApprovalCfg["silence_action"] })}>{(Object.keys(SILENCE_LABEL) as NonNullable<ApprovalCfg["silence_action"]>[]).map((k) => <option key={k} value={k}>{SILENCE_LABEL[k]}</option>)}</select></Fld>
          <Fld field="ai_free_changes" error={err("ai_free_changes")} label="Alterações por IA grátis (cota da etapa)"><input type="number" min={0} max={100} step={1} aria-label="Alterações por IA grátis desta etapa" title="Quantas alterações por IA o cliente faz sem pagar NESTA etapa. Vazio = a etapa não tem cota própria." className={CTL} value={f.ai_free_changes} onChange={(e) => patch({ ai_free_changes: e.target.value })} placeholder="sem cota" /></Fld>
        </div>
        <p className="mt-1 text-[10px] text-slate-500">O limite de ajustes, quem recebe o pedido e o que fazer no silêncio ficam registrados no cadastro da etapa; hoje o sistema mostra e acompanha o prazo, e não aprova nem bloqueia sozinho por silêncio.</p>
        {hoursBad && <p role="alert" className="text-[11px] font-semibold text-red-600">Use números inteiros a partir de 1 (ou deixe vazio).</p>}
      </RevealBox>
      {!internal && mode === "awareness" && <p className="rounded-md bg-sky-50 px-2 py-1 text-[11px] text-sky-900 dark:bg-sky-950/30 dark:text-sky-100">O cliente é avisado quando a etapa conclui; nada fica esperando por ele e a próxima etapa é liberada na hora.</p>}
      {!internal && mode === "none" && f.approval_hours.trim() && <p className="rounded-md bg-amber-50 px-2 py-1 text-[11px] text-amber-900">Há um prazo de aprovação preenchido, mas a aprovação do cliente está desligada: ele não será usado.</p>}
      {step.executor_policy === "prefer_same_as_step" && (
        <Fld field="accept_hours" error={err("accept_hours")} label="Prazo de aceite do preferido (h)"><input type="number" min={1} step={1} aria-label="Prazo de aceite do preferido (horas)" title="Quantas horas o executor preferido tem para aceitar antes de a etapa abrir para os demais. Vazio = 2 h." className={CTL} value={f.executor_accept_hours} onChange={(e) => patch({ executor_accept_hours: e.target.value })} placeholder="2 h" /></Fld>
      )}
      <p className="rounded-md border border-violet-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 dark:border-violet-900 dark:bg-slate-900 dark:text-slate-200" data-testid="approval-summary"><strong>Em linguagem simples:</strong> {summary}</p>
    </div>
  );
}
