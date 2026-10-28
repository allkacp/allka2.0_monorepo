// Seção universal "Conexões e acessos necessários" do editor de produto (qualquer produto, atual ou futuro).
// Opcional: desativada, o produto se comporta como se o módulo não existisse. Nunca coleta senha: só descreve o que é exigido.
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Eye, Info, Layers, Link2, Plug, Plus, Save, Settings2, ShieldCheck, Trash2, X } from "lucide-react";
import { AccessLogo } from "./access-logo";
import { accessPatch, splitAccesses } from "./step-access-picker";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FramedModal, FRAMED_HEADER_CLASS } from "@/components/framed-panel";
import { apiClient } from "@/lib/api-client";
import { ButtonLoader } from "@/components/ui/loading";
import { AccessConditionBuilder } from "./access-condition-builder";
import { conditionFromServer, conditionIssues, emptyCondition, emptyRule, sourcesFromVersion, triggersFromCondition, type AccessCondition } from "./access-condition";
import { RevealBox } from "./reveal";
import type { QuickCreate } from "./quick-variation";

export type Act = (fn: () => Promise<any>, ok?: string | ((r: any) => string | undefined), opts?: { rethrow?: boolean }) => Promise<any>;
export interface Opt { key: string; label: string }
export interface Vocab {
  methods: Opt[]; when_needed: Opt[]; obligations: Opt[]; pending_behaviors: Opt[]; grant_scopes: Opt[]; dependency_kinds: Opt[]; validation_modes: string[]; asset_rules: string[];
}
const VALIDATION_LABEL: Record<string, string> = { automatic: "Automática", manual: "Manual", automatic_with_human: "Automática com confirmação humana" };
const ASSET_RULE_LABEL: Record<string, string> = {
  first_only: "Validar só na primeira execução", always: "Sempre validar", every_x_days: "Revalidar a cada X dias", on_executor_change: "Revalidar se houver troca de executor",
  on_client_change: "Revalidar se o cliente informar mudança", none_while_valid: "Não exigir revalidação enquanto válida", light_check: "Só uma conferência leve enquanto válida",
};

const SEL = "h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";
const INP = "h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";
const LBL = "mb-0.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300";

export interface Form {
  key?: string; connection_type_id: number | ""; when_needed: string; when_task_key: string; when_step_key: string; condition_text: string;
  obligation: string; method: string; permission_level: string; pending_behavior: string;
  reason: string; instructions: string; default_grant_scope: string; validation_mode: string; asset_rule: string; revalidate_days: string; light_check: boolean;
  reminder_interval_hours: string; reminder_limit: string; escalate_after_reminders: string; visible_to_client: boolean;
  /** Só para acesso cadastrado dentro de uma etapa: fica disponível para as outras etapas escolherem usar. */
  shared_with_steps: boolean;
  dependents: { task_key: string; step_key: string; kind: string }[];
  /** Condição de quando o acesso passa a ser necessário (construtor; vira ativação por gatilhos no servidor). */
  condition: AccessCondition;
  /** Obrigatoriedade que veio do servidor (para não apagar uma condição antiga ao salvar sem mexer). */
  original_obligation?: string;
  /** O servidor guardou este acesso como rascunho incompleto. */
  draft_incomplete?: boolean;
}
// A posição é a regra: um acesso configurado dentro de uma tarefa/etapa já
// sabe o que bloqueia. Não obrigamos a pessoa a escolher a mesma tarefa de
// novo em uma lista técnica de dependentes.
export type ConnectionScope = { kind: "product" | "task" | "step"; task?: { key: string; name: string }; step?: { key: string; name: string } };
export const emptyForm = (): Form => ({
  connection_type_id: "", when_needed: "before_task", when_task_key: "", when_step_key: "", condition_text: "", obligation: "required", method: "", permission_level: "", pending_behavior: "block_dependents",
  reason: "", instructions: "", default_grant_scope: "project", validation_mode: "manual", asset_rule: "first_only", revalidate_days: "", light_check: false,
  reminder_interval_hours: "", reminder_limit: "", escalate_after_reminders: "", visible_to_client: true, shared_with_steps: false, dependents: [], condition: emptyCondition(),
});
export const fromReq = (r: any): Form => ({
  key: r.key, connection_type_id: r.connection_type.id, when_needed: r.when_needed, when_task_key: r.when_task_key ?? "", when_step_key: r.when_step_key ?? "", condition_text: r.condition_text ?? "",
  obligation: r.obligation, method: r.method, permission_level: r.permission_level, pending_behavior: r.pending_behavior,
  reason: r.advanced.reason ?? "", instructions: r.advanced.instructions ?? "", default_grant_scope: r.advanced.default_grant_scope, validation_mode: r.advanced.validation_mode, asset_rule: r.advanced.asset_rule,
  revalidate_days: r.advanced.revalidate_days != null ? String(r.advanced.revalidate_days) : "", light_check: !!r.advanced.light_check,
  reminder_interval_hours: r.advanced.reminder_interval_hours != null ? String(r.advanced.reminder_interval_hours) : "", reminder_limit: r.advanced.reminder_limit != null ? String(r.advanced.reminder_limit) : "",
  escalate_after_reminders: r.advanced.escalate_after_reminders != null ? String(r.advanced.escalate_after_reminders) : "", visible_to_client: r.advanced.visible_to_client !== false, shared_with_steps: !!r.shared_with_steps,
  dependents: r.dependents.map((d: any) => ({ task_key: d.task_key, step_key: d.step_key ?? "", kind: d.kind })),
  condition: conditionFromServer(r.activation), original_obligation: r.obligation, draft_incomplete: !!r.draft_incomplete,
});
const num = (s: string) => (s.trim() === "" ? null : Number(s));
/** O acesso é condicional (pela obrigatoriedade ou pelo "quando é pedido")? */
export const isConditionalForm = (f: Form) => f.obligation === "conditional" || f.when_needed === "on_condition";
/** Problemas do acesso para CONCLUIR (vazio = completo). A condição antiga em texto continua valendo como condição. */
export function formIssues(f: Form): string[] {
  const out: string[] = [];
  if (f.connection_type_id === "") out.push("escolha o tipo de acesso");
  if (!f.method) out.push("escolha como o cliente libera o acesso");
  if (!f.permission_level) out.push("escolha a permissão necessária");
  if (isConditionalForm(f) && !f.condition_text.trim()) out.push(...conditionIssues(f.condition));
  return out;
}
export const toBody = (f: Form, opts: { draft?: boolean; requireComplete?: boolean } = {}) => ({
  connection_type_id: Number(f.connection_type_id), when_needed: f.when_needed,
  when_task_key: ["before_task", "before_step"].includes(f.when_needed) ? f.when_task_key || null : null, when_step_key: f.when_needed === "before_step" ? f.when_step_key || null : null,
  condition_text: f.condition_text.trim() || null, obligation: f.obligation, method: f.method, permission_level: f.permission_level, pending_behavior: f.pending_behavior,
  reason: f.reason.trim() || null, instructions: f.instructions.trim() || null, default_grant_scope: f.default_grant_scope, validation_mode: f.validation_mode, asset_rule: f.asset_rule,
  revalidate_days: f.asset_rule === "every_x_days" ? num(f.revalidate_days) : null, light_check: f.light_check,
  reminder_interval_hours: num(f.reminder_interval_hours), reminder_limit: num(f.reminder_limit), escalate_after_reminders: num(f.escalate_after_reminders), visible_to_client: f.visible_to_client, shared_with_steps: f.shared_with_steps,
  dependents: f.dependents.map((d) => ({ task_key: d.task_key, step_key: d.step_key || null, kind: d.kind })),
  // A condição só segue se o acesso é condicional (ou se já tinha gatilhos e a obrigatoriedade não mudou: nada é apagado em silêncio).
  ...(() => {
    const keep = isConditionalForm(f) || (f.original_obligation === f.obligation && (f.condition.rules.length > 0 || (f.condition.preserved ?? []).length > 0));
    const triggers = keep ? triggersFromCondition(f.condition) : [];
    return { activation_mode: triggers.length ? f.condition.mode : "manual", triggers };
  })(),
  ...(opts.draft ? { draft: true } : {}), ...(opts.requireComplete ? { require_complete: true } : {}),
});

/** `embedded`: usado dentro da etapa (acessos em rascunho): não grava sozinho, só avisa cada mudança em `onChange` e esconde Salvar/Remover. */
export function RequirementRow({ initial, isNew, types, vocab, tasks, version, readOnly, onSave, onRemove, scope, embedded = false, onChange, lockType = false, quick }: { quick?: QuickCreate; initial: Form; isNew: boolean; types: any[]; vocab: Vocab; tasks: any[]; version: any; readOnly: boolean; onSave?: (f: Form) => Promise<void>; onRemove?: () => void; scope?: ConnectionScope; embedded?: boolean; onChange?: (f: Form) => void; lockType?: boolean }) {
  const [f, setF] = useState<Form>(initial);
  useEffect(() => { if (embedded && JSON.stringify(f) !== JSON.stringify(initial)) onChange?.(f); }, [f]); // eslint-disable-line react-hooks/exhaustive-deps
  const [advOpen, setAdvOpen] = useState(false);
  const [dep, setDep] = useState({ task_key: "", step_key: "", kind: "start" });
  const [busy, setBusy] = useState(false);
  useEffect(() => { setF(initial); }, [JSON.stringify(initial)]); // eslint-disable-line react-hooks/exhaustive-deps
  const type = types.find((t) => t.id === f.connection_type_id);
  const methods: string[] = type?.allowed_methods ?? vocab.methods.map((m) => m.key);
  const levels: Opt[] = type?.permission_levels ?? [];
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((cur) => ({ ...cur, [k]: v }));
  const taskOf = (key: string) => tasks.find((t) => t.key === key);
  const pickType = (id: number) => {
    const t = types.find((x) => x.id === id);
    setF((cur) => ({ ...cur, connection_type_id: id, method: t?.allowed_methods?.[0] ?? "", permission_level: t?.permission_levels?.[0]?.key ?? "" }));
  };
  const methodLabel = (k: string) => vocab.methods.find((m) => m.key === k)?.label ?? k;
  const effTask = f.when_task_key || f.dependents[0]?.task_key || "";
  const effStep = f.when_step_key || (f.when_needed === "before_step" ? f.dependents.find((d) => d.task_key === effTask)?.step_key ?? "" : "");
  const appliesToAllTasks = !scope || scope.kind === "product";
  const conditionOk = !isConditionalForm(f) || !!f.condition_text.trim() || conditionIssues(f.condition).length === 0;
  const valid = conditionOk && f.connection_type_id !== "" && !!f.method && !!f.permission_level && (appliesToAllTasks || ["before_task", "before_step"].indexOf(f.when_needed) < 0 || !!effTask) && (f.when_needed !== "before_step" || !!effStep);
  const sel = (label: string, value: string, onChange: (v: string) => void, options: Opt[], aria: string, disabled = false) => (
    <div className="min-w-0"><label className={LBL}>{label}</label>
      <select aria-label={aria} className={SEL} disabled={readOnly || disabled} value={value} onChange={(e) => onChange(e.target.value)}>{options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}</select>
    </div>
  );
  return (
    <div className="space-y-2" data-testid="conn-requirement">
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        <div className="min-w-0"><label className={LBL}>Tipo de acesso</label>
          <select aria-label="Tipo de conexão" className={SEL} disabled={readOnly || lockType} value={f.connection_type_id} onChange={(e) => pickType(Number(e.target.value))}>
            <option value="">Selecione…</option>{types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        {false && !scope && sel("Quando será necessária", f.when_needed, (v) => set("when_needed", v), vocab.when_needed, "Quando será necessária")}
        {sel("Obrigatoriedade", f.obligation, (v) => setF((cur) => ({ ...cur, obligation: v, ...(v === "conditional" && cur.condition.rules.length === 0 && !(cur.condition.preserved ?? []).length ? { condition: { ...cur.condition, rules: [emptyRule()] } } : {}) })), vocab.obligations, "Obrigatoriedade")}
        {sel("Como será liberado", f.method, (v) => set("method", v), methods.map((m) => ({ key: m, label: methodLabel(m) })), "Forma de conexão")}
        {sel("Permissão necessária", f.permission_level, (v) => set("permission_level", v), levels, "Nível de permissão")}
        {false && !scope && ["before_task", "before_step"].includes(f.when_needed) && (
          <div className="grid min-w-0 grid-cols-2 gap-2">
            {sel("Tarefa", effTask, (v) => setF((c) => ({ ...c, when_task_key: v, when_step_key: "" })), [{ key: "", label: "Selecione…" }, ...tasks.map((t) => ({ key: t.key, label: t.name }))], "Tarefa de referência")}
            {f.when_needed === "before_step" && sel("Etapa", f.when_step_key, (v) => set("when_step_key", v), [{ key: "", label: "Selecione…" }, ...(taskOf(f.when_task_key)?.steps ?? []).map((s: any) => ({ key: s.key, label: s.name }))], "Etapa de referência")}
          </div>
        )}
      </div>
      {scope?.kind === "step" && (
        <label className={`mt-1 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${f.shared_with_steps ? "border-violet-300 bg-violet-50 dark:border-violet-800 dark:bg-violet-950/30" : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"} ${readOnly ? "opacity-70" : "cursor-pointer"}`} data-testid="share-access">
          <input type="checkbox" className="h-4 w-4 accent-violet-600" disabled={readOnly} checked={f.shared_with_steps} onChange={(e) => set("shared_with_steps", e.target.checked)} />
          <span className="font-semibold text-slate-700 dark:text-slate-200">Deixar este acesso disponível para as outras etapas</span>
          <span className="text-[11px] text-slate-500">Nas outras etapas ele aparece para marcar; não precisa cadastrar de novo.</span>
        </label>
      )}
      {/* Escolheu "Condicional": o construtor abre sozinho, a tela rola até ele, destaca e leva ao 1º campo ("Origem da condição"). */}
      <RevealBox active={isConditionalForm(f)} missing={isConditionalForm(f) && !f.condition_text.trim() ? conditionIssues(f.condition).length : 0} testId="access-condition-reveal" className="mt-2">
        <AccessConditionBuilder value={f.condition} onChange={(c) => set("condition", c)} sources={sourcesFromVersion(version, f.key)} readOnly={readOnly} legacyText={f.condition_text} accessName={type?.name} quick={quick} />
      </RevealBox>
      {/* Os gatilhos de execução pertencem à configuração da própria tarefa.
          Mantemos qualquer regra antiga salva, mas não a exibimos no acesso geral
          do produto para não misturar acesso com ordem de execução. */}
      {false && !scope && <div className="mt-2">
        <label className={LBL}>6. Tarefas ou etapas dependentes</label>
        <div className="flex flex-wrap items-center gap-1.5">
          {f.dependents.map((d, i) => (
            <span key={i} className="inline-flex items-center gap-1 rounded-full border border-violet-300 bg-violet-50 py-0.5 pl-2 pr-1 text-[11px] font-medium text-violet-800 dark:border-violet-700 dark:bg-violet-950/40 dark:text-violet-200">
              {taskOf(d.task_key)?.name ?? d.task_key}{d.step_key ? ` › ${(taskOf(d.task_key)?.steps ?? []).find((s: any) => s.key === d.step_key)?.name ?? d.step_key}` : ""}
              <select aria-label="Tipo de dependência" className="rounded border-0 bg-transparent text-[10px]" disabled={readOnly} value={d.kind} onChange={(e) => set("dependents", f.dependents.map((x, j) => (j === i ? { ...x, kind: e.target.value } : x)))}>
                {vocab.dependency_kinds.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
              </select>
              {!readOnly && <button type="button" aria-label="Remover dependente" className="text-violet-500 hover:text-red-600" onClick={() => set("dependents", f.dependents.filter((_, j) => j !== i))}><X className="h-3 w-3" /></button>}
            </span>
          ))}
          {f.dependents.length === 0 && <span className="text-[11px] text-slate-500">Nenhuma ainda — sem dependentes, a conexão só informa.</span>}
        </div>
        {!readOnly && (
          <div className="mt-1.5 flex flex-wrap items-end gap-1.5">
            <select aria-label="Adicionar tarefa dependente" className={`${SEL} !w-44`} value={dep.task_key} onChange={(e) => setDep({ task_key: e.target.value, step_key: "", kind: dep.kind })}>
              <option value="">Tarefa…</option>{tasks.map((t) => <option key={t.key} value={t.key}>{t.name}</option>)}
            </select>
            <select aria-label="Adicionar etapa dependente" className={`${SEL} !w-40`} value={dep.step_key} onChange={(e) => setDep({ ...dep, step_key: e.target.value })} disabled={!dep.task_key}>
              <option value="">Tarefa inteira</option>{(taskOf(dep.task_key)?.steps ?? []).map((s: any) => <option key={s.key} value={s.key}>{s.name}</option>)}
            </select>
            <select aria-label="Tipo da nova dependência" className={`${SEL} !w-52`} value={dep.kind} onChange={(e) => setDep({ ...dep, kind: e.target.value })}>{vocab.dependency_kinds.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}</select>
            <button type="button" aria-label="Adicionar dependente" disabled={!dep.task_key || f.dependents.some((d) => d.task_key === dep.task_key && d.step_key === dep.step_key)} className="inline-flex h-8 items-center gap-1 rounded-md border border-violet-300 bg-violet-50 px-2.5 text-xs font-semibold text-violet-700 disabled:opacity-50 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-200" onClick={() => { set("dependents", [...f.dependents, dep]); setDep({ task_key: "", step_key: "", kind: dep.kind }); }}><Plus className="h-3.5 w-3.5" />Adicionar</button>
          </div>
        )}
      </div>}

      <details open={advOpen} onToggle={(e) => setAdvOpen((e.target as HTMLDetailsElement).open)} className="mt-2 rounded-md border border-slate-200 dark:border-slate-700">
        <summary className="flex cursor-pointer select-none list-none items-center gap-1.5 px-2 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300"><ChevronDown className="h-3.5 w-3.5" />Detalhes avançados (operação)</summary>
        <div className="grid gap-2 border-t border-slate-200 p-2 md:grid-cols-2 xl:grid-cols-3 dark:border-slate-700">
          {sel("Comportamento quando pendente", f.pending_behavior, (v) => set("pending_behavior", v), vocab.pending_behaviors, "Comportamento quando pendente")}
          {sel("Escopo de uso sugerido", f.default_grant_scope, (v) => set("default_grant_scope", v), vocab.grant_scopes, "Escopo de uso sugerido")}
          {sel("Modo de validação", f.validation_mode, (v) => set("validation_mode", v), vocab.validation_modes.map((k) => ({ key: k, label: VALIDATION_LABEL[k] ?? k })), "Modo de validação")}
          {sel("Regra de revalidação", f.asset_rule, (v) => set("asset_rule", v), vocab.asset_rules.map((k) => ({ key: k, label: ASSET_RULE_LABEL[k] ?? k })), "Regra de revalidação")}
          {f.asset_rule === "every_x_days" && <div className="min-w-0"><label className={LBL}>Revalidar a cada (dias)</label><input aria-label="Dias para revalidar" type="number" min={1} className={INP} disabled={readOnly} value={f.revalidate_days} onChange={(e) => set("revalidate_days", e.target.value)} /></div>}
          <div className="min-w-0"><label className={LBL}>Lembrete a cada (horas)</label><input aria-label="Intervalo do lembrete" type="number" min={1} className={INP} disabled={readOnly} value={f.reminder_interval_hours} onChange={(e) => set("reminder_interval_hours", e.target.value)} placeholder="padrão: 72" /></div>
          <div className="min-w-0"><label className={LBL}>Limite de lembretes</label><input aria-label="Limite de lembretes" type="number" min={1} className={INP} disabled={readOnly} value={f.reminder_limit} onChange={(e) => set("reminder_limit", e.target.value)} placeholder="padrão: 5" /></div>
          <div className="min-w-0"><label className={LBL}>Escalonar após (lembretes)</label><input aria-label="Escalonar após" type="number" min={1} className={INP} disabled={readOnly} value={f.escalate_after_reminders} onChange={(e) => set("escalate_after_reminders", e.target.value)} placeholder="padrão: 3" /></div>
          <div className="min-w-0 md:col-span-2"><label className={LBL}>Motivo (mostrado ao cliente)</label><input aria-label="Motivo" className={INP} disabled={readOnly} value={f.reason} onChange={(e) => set("reason", e.target.value)} placeholder="Por que precisamos desta conexão" /></div>
          <div className="min-w-0 md:col-span-3"><label className={LBL}>Instruções específicas deste produto</label><textarea aria-label="Instruções específicas" rows={2} className="w-full rounded-md border border-slate-300 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-900" disabled={readOnly} value={f.instructions} onChange={(e) => set("instructions", e.target.value)} placeholder="Complementa as instruções padrão do tipo (nunca peça senha)." /></div>
          <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" disabled={readOnly} checked={f.light_check} onChange={(e) => set("light_check", e.target.checked)} />Conferência leve ao reaproveitar</label>
          <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" disabled={readOnly} checked={f.visible_to_client} onChange={(e) => set("visible_to_client", e.target.checked)} />Visível para o cliente</label>
        </div>
      </details>

      {!readOnly && !embedded && (
        <div className="mt-2 flex items-center justify-end gap-2">
          <button type="button" aria-label="Remover exigência" className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40" onClick={() => onRemove?.()}><Trash2 className="h-3.5 w-3.5" />{isNew ? "Descartar" : "Remover"}</button>
          <button type="button" aria-label="Salvar exigência" disabled={!valid || busy} onClick={async () => { setBusy(true); try { await onSave?.({ ...f, when_task_key: effTask, when_step_key: effStep }); } finally { setBusy(false); } }} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-violet-600 px-3.5 text-xs font-semibold text-white shadow-sm disabled:opacity-50"><Save className="h-3.5 w-3.5" />Salvar exigência</button>
        </div>
      )}
    </div>
  );
}

/** Onde um acesso foi cadastrado e em quais etapas ele é usado — vira uma linha do resumo. */
export function summarizeAccesses(version: any) {
  const tasks: any[] = version?.tasks ?? [];
  const stepRows = tasks.flatMap((t) => (t.steps ?? []).map((s: any) => ({ task: t, step: s })));
  return ((version?.connection_requirements ?? []) as any[]).filter((r) => !r.draft_incomplete).map((r) => {
    const name = r.label?.trim() || r.connection_type?.name || r.key;
    const ownerTask = tasks.find((t) => t.key === r.when_task_key);
    const ownerStep = r.when_step_key ? (ownerTask?.steps ?? []).find((s: any) => s.key === r.when_step_key) : null;
    // Cadastrado numa etapa · numa tarefa (vale para as etapas dela) · ou no produto inteiro (cobre todas as tarefas).
    const coversAllTasks = tasks.length > 0 && tasks.every((t) => (r.dependents ?? []).some((d: any) => d.task_key === t.key));
    const origin = r.when_step_key
      ? `Etapa “${ownerStep?.name ?? r.when_step_key}”${ownerTask ? ` · ${ownerTask.name}` : ""}`
      : coversAllTasks || !r.when_task_key ? "Produto inteiro" : `Tarefa “${ownerTask?.name ?? r.when_task_key}”`;
    const wholeProduct = !r.when_step_key;
    // Etapas que usam: a que cadastrou + as que marcaram a chave em "só os que eu escolher" + as que usam "todos".
    const users = stepRows.filter(({ task, step }) => {
      const ops = step.ops ?? {};
      if (ops.access_scope === "all") return true;
      if (ops.access_scope === "some" && Array.isArray(ops.access_keys) && ops.access_keys.includes(r.key)) return true;
      return !!r.when_step_key && r.when_step_key === step.key && r.when_task_key === task.key;
    }).map(({ task, step }) => `${step.name}${(tasks.length > 1) ? ` (${task.name})` : ""}`);
    return { key: r.key, name, origin, shared: !!r.shared_with_steps, wholeProduct, allText: origin === "Produto inteiro" ? "Todas as etapas" : "Todas as etapas da tarefa", users };
  });
}

export interface StepAccessChip { key: string; name: string; type: any; fromStep: string | null; shared: boolean }
export interface StepAccessRow { stepKey: string; taskKey: string; taskName: string; position: number; stepName: string; usesAll: boolean; accesses: StepAccessChip[] }

/** Resumo POR ETAPA: para cada etapa, os acessos que ela usa (os que cadastrou + os de outras etapas que marcou usar). */
export function summarizeByStep(version: any): { general: StepAccessChip[]; steps: StepAccessRow[] } {
  // Acesso salvo como rascunho incompleto NÃO conta como configurado.
  const reqs: any[] = ((version?.connection_requirements ?? []) as any[]).filter((r) => !r.draft_incomplete);
  const tasks: any[] = version?.tasks ?? [];
  const nameOf = (r: any) => r.label?.trim() || r.connection_type?.name || r.key;
  const chip = (r: any, fromStep: string | null): StepAccessChip => ({ key: r.key, name: nameOf(r), type: r.connection_type ?? {}, fromStep, shared: !!r.shared_with_steps });
  const stepName = new Map<string, string>();
  for (const t of tasks) for (const s of t.steps ?? []) stepName.set(`${t.key}::${s.key}`, s.name);
  const general = reqs.filter((r) => !r.when_step_key).map((r) => chip(r, null));
  const steps: StepAccessRow[] = [];
  for (const t of tasks) {
    const ordered = [...(t.steps ?? [])].sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    ordered.forEach((s: any, i: number) => {
      const ops = s.ops ?? {};
      const own = reqs.filter((r) => r.when_step_key === s.key && r.when_task_key === t.key).map((r) => chip(r, null));
      const keys: string[] = ops.access_scope === "some" && Array.isArray(ops.access_keys) ? ops.access_keys : [];
      const borrowed = reqs.filter((r) => r.when_step_key && !(r.when_step_key === s.key && r.when_task_key === t.key) && keys.includes(r.key)).map((r) => chip(r, stepName.get(`${r.when_task_key}::${r.when_step_key}`) ?? r.when_step_key));
      steps.push({ stepKey: s.key, taskKey: t.key, taskName: t.name, position: i + 1, stepName: s.name, usesAll: ops.access_scope === "all", accesses: [...own, ...borrowed] });
    });
  }
  return { general, steps };
}

export interface AccessUsageRow { key: string; name: string; type: any; origin: string; stepsLabels: string[]; allSteps: boolean }

/**
 * Resumo POR ACESSO: o nome do acesso e em quais etapas ele está liberado (a etapa que cadastrou + as que marcaram usar).
 * Acesso antigo "geral do produto" (sem etapa) aparece como liberado em todas as etapas.
 */
export function summarizeByAccess(version: any): AccessUsageRow[] {
  // Acesso salvo como rascunho incompleto NÃO conta como configurado.
  const reqs: any[] = ((version?.connection_requirements ?? []) as any[]).filter((r) => !r.draft_incomplete);
  const tasks: any[] = version?.tasks ?? [];
  const multiTask = tasks.length > 1;
  const rows: { task: any; step: any; position: number }[] = [];
  for (const t of tasks) {
    const ordered = [...(t.steps ?? [])].sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    ordered.forEach((s: any, i: number) => rows.push({ task: t, step: s, position: i + 1 }));
  }
  const label = ({ task, step, position }: { task: any; step: any; position: number }) => `Etapa ${position}${multiTask ? ` · ${task.name}` : ""}`;
  return reqs.map((r) => {
    const name = r.label?.trim() || r.connection_type?.name || r.key;
    if (!r.when_step_key) return { key: r.key, name, type: r.connection_type ?? {}, origin: "Geral do produto", stepsLabels: [], allSteps: true };
    const used = rows.filter(({ task, step }) => {
      if (step.key === r.when_step_key && task.key === r.when_task_key) return true;
      const ops = step.ops ?? {};
      return ops.access_scope === "all" || (ops.access_scope === "some" && Array.isArray(ops.access_keys) && ops.access_keys.includes(r.key));
    });
    const owner = rows.find(({ task, step }) => step.key === r.when_step_key && task.key === r.when_task_key);
    return { key: r.key, name, type: r.connection_type ?? {}, origin: owner ? label(owner) : "Etapa removida", stepsLabels: used.map(label), allSteps: false };
  });
}

/** Quadro SÓ de leitura: cada acesso e em quais etapas está liberado. Para pedir acesso, use a própria etapa. */
export function AccessesSummary({ version, act, readOnly = true }: { version: any; act?: Act; readOnly?: boolean }) {
  const all = summarizeByAccess(version);
  // O quadro mostra SÓ o que vem das etapas. Acesso antigo (cadastrado antes da regra por etapa, sem etapa) fica num aviso à parte.
  const rows = all.filter((r) => !r.allSteps);
  const legacy = all.filter((r) => r.allSteps);
  const draftReqs = ((version?.connection_requirements ?? []) as any[]).filter((r) => r.draft_incomplete);
  const reqById = new Map<string, any>(((version?.connection_requirements ?? []) as any[]).map((r) => [r.key, r]));
  const [vocab, setVocab] = useState<any>(null);
  const [openKey, setOpenKey] = useState<string | null>(null);
  useEffect(() => { let live = true; void Promise.resolve(apiClient.getConnectionVocabulary?.()).then((v) => { if (live) setVocab(v); }).catch(() => {}); return () => { live = false; }; }, []);
  const methodLabel = (k?: string) => (k ? vocab?.methods?.find((m: any) => m.key === k)?.label ?? k : "—");
  const obligationOf = (o?: string) => (o === "optional" ? { text: "Opcional", cls: "bg-slate-100 text-slate-700" } : o === "conditional" ? { text: "Condicional", cls: "bg-amber-100 text-amber-800" } : { text: "Obrigatório", cls: "bg-emerald-100 text-emerald-700" });
  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">Configure os acessos que serão solicitados nas etapas do processo.</p>
      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800/30" data-testid="accesses-summary-empty">Nenhum acesso aqui por enquanto. Os acessos aparecem nesta lista depois de cadastrados dentro de uma etapa (em “Conexões e acessos desta etapa”). Se nenhuma etapa pedir acesso, esta lista continua vazia.</p>
      ) : (
        <ul className="space-y-1.5" data-testid="accesses-summary">
          {rows.map((r, idx) => {
            const req = reqById.get(r.key) ?? {};
            const perm = (r.type?.permission_levels ?? []).find((l: any) => l.key === req.permission_level)?.label ?? req.permission_level ?? "—";
            const ob = obligationOf(req.obligation);
            const stepsText = r.stepsLabels.length ? r.stepsLabels.join(", ") : "nenhuma etapa";
            const fact = "flex items-center justify-between gap-4";
            return (
              <li key={r.key} className="rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900/60" data-testid="summary-access">
                <div className="flex items-center gap-2.5">
                  <span className="section-number-badge flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" data-testid="summary-access-number">{idx + 1}</span>
                  <AccessLogo type={{ ...r.type, name: r.name }} size={30} />
                  <span className="min-w-0 truncate text-sm font-bold text-slate-900 dark:text-slate-100">{r.name}</span>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${ob.cls}`}>{ob.text}</span>
                  <span className="ml-auto flex min-w-0 items-center gap-1.5" data-testid="summary-access-steps">
                    <Layers className="h-3.5 w-3.5 shrink-0 text-violet-500" aria-hidden="true" />
                    <span className="sr-only">Liberado em {stepsText}</span>
                    <span className="hidden flex-wrap items-center gap-1 sm:flex" aria-hidden="true">
                      {r.stepsLabels.length ? r.stepsLabels.map((l: string) => <span key={l} className="rounded-md bg-violet-50 px-1.5 py-0.5 text-[11px] font-bold text-violet-700 dark:bg-violet-950/40 dark:text-violet-200">{l}</span>) : <span className="text-[11px] text-slate-500">nenhuma etapa</span>}
                    </span>
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" aria-label={`Informações do acesso ${r.name}`} className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-violet-200 bg-white text-violet-700 transition hover:bg-violet-50"><Info className="h-3.5 w-3.5" /></button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-sm p-3 text-xs" data-testid="summary-access-info">
                      <p className="text-sm font-bold">{r.name}</p>
                      <dl className="mt-2.5 space-y-2">
                        <div className={fact}><dt className="font-semibold opacity-90">Obrigatoriedade</dt><dd>{ob.text}</dd></div>
                        <div className={fact}><dt className="font-semibold opacity-90">Liberado em</dt><dd className="text-right">{stepsText}</dd></div>
                        <div className={fact}><dt className="font-semibold opacity-90">Permissão</dt><dd className="text-right">{perm}</dd></div>
                        <div className={fact}><dt className="font-semibold opacity-90">Método de acesso</dt><dd className="text-right">{methodLabel(req.method)}</dd></div>
                      </dl>
                    </TooltipContent>
                  </Tooltip>
                  <button type="button" onClick={() => setOpenKey(r.key)} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-violet-200 bg-white px-3 text-xs font-semibold text-violet-700 transition hover:bg-violet-50 dark:border-violet-800 dark:bg-slate-900 dark:text-violet-200" data-testid="summary-access-details-btn"><Eye className="h-3.5 w-3.5" />Ver detalhes</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {(() => {
        const idx = rows.findIndex((x) => x.key === openKey);
        if (idx < 0) return null;
        const r = rows[idx];
        const req = reqById.get(r.key) ?? {};
        const perm = (r.type?.permission_levels ?? []).find((l: any) => l.key === req.permission_level)?.label ?? req.permission_level ?? "—";
        const ob = obligationOf(req.obligation);
        const stepsText = r.stepsLabels.length ? r.stepsLabels.join(", ") : "nenhuma etapa";
        const cell = "rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900/40";
        const lab = "block text-[11px] font-semibold uppercase tracking-wide text-slate-500";
        const val = "mt-0.5 block text-sm font-bold text-slate-900 dark:text-slate-100";
        return (
          <FramedModal open onOpenChange={(o) => { if (!o) setOpenKey(null); }} testId="summary-access-details" title={`Acesso — ${r.name}`}>
            <div className={`flex shrink-0 items-center justify-between gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm dark:bg-slate-900 ${FRAMED_HEADER_CLASS}`}>
              <div className="flex min-w-0 items-center gap-3">
                <span className="section-number-badge flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white">{idx + 1}</span>
                <AccessLogo type={{ ...r.type, name: r.name }} size={34} />
                <div className="min-w-0"><p className="truncate text-base font-bold text-slate-900 dark:text-slate-100">{r.name}</p><p className="truncate text-xs text-slate-500">Resumo só de leitura. Para mudar, abra a etapa e use “Conexões e acessos desta etapa”.</p></div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${ob.cls}`}>{ob.text}</span>
              </div>
              <Button size="sm" variant="outline" className="border-violet-200 bg-white text-violet-700 hover:bg-violet-50" onClick={() => setOpenKey(null)} data-testid="summary-access-close">Fechar</Button>
            </div>
            <div className="mt-2 min-h-0 flex-1 overflow-y-auto rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900">
              <dl className="grid gap-3 sm:grid-cols-2">
                <div className={cell}><dt className={lab}>Cadastrado em</dt><dd className={val}>{r.origin}</dd></div>
                <div className={cell}><dt className={lab}>Liberado em</dt><dd className={val}>{stepsText}</dd></div>
                <div className={cell}><dt className={lab}>Tipo</dt><dd className={val}>{r.type?.name ?? r.name}</dd></div>
                <div className={cell}><dt className={lab}>Quando é pedido</dt><dd className={val}>{req.when_needed === "before_step" ? "antes da etapa" : req.when_needed === "before_task" ? "antes da tarefa" : req.when_needed ?? "—"}</dd></div>
                <div className={cell}><dt className={lab}>Permissão</dt><dd className={val}>{perm}</dd></div>
                <div className={cell}><dt className={lab}>Método de acesso</dt><dd className={val}>{methodLabel(req.method)}</dd></div>
              </dl>
            </div>
          </FramedModal>
        );
      })()}
      {/* "Adicionar acesso" escondido (20/10): o resumo só mostra os acessos configurados; acessos se cadastram dentro da etapa. */}
      <div hidden className="hidden items-center gap-3 rounded-xl border border-dashed border-violet-300 bg-violet-50/40 px-3 py-3 dark:border-violet-800 dark:bg-violet-950/20" data-testid="summary-add-hint">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-violet-300 bg-white text-violet-600"><Plus className="h-4 w-4" aria-hidden="true" /></span>
        <span><span className="block text-sm font-bold text-violet-700 dark:text-violet-300">Adicionar acesso</span><span className="block text-xs text-slate-500">Inclua outras plataformas ou ferramentas dentro da etapa que precisa delas (Editar etapa → Conexões e acessos desta etapa).</span></span>
      </div>
      {draftReqs.length > 0 && <p className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-200" data-testid="summary-drafts"><strong>Em rascunho incompleto ({draftReqs.length}):</strong> {draftReqs.map((r) => r.label?.trim() || r.connection_type?.name || r.key).join(", ")}. Não contam como configurados e não são pedidos ao cliente até a etapa ser concluída.</p>}
      {legacy.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-2.5 text-xs dark:border-amber-800 dark:bg-amber-950/20" data-testid="summary-legacy">
          <p className="font-bold text-amber-900 dark:text-amber-200">Acessos antigos, sem etapa ({legacy.length})</p>
          <p className="mt-0.5 text-amber-900/90 dark:text-amber-200/90">Foram cadastrados antes de os acessos passarem a ser pedidos dentro das etapas (não vêm de nenhuma etapa). Eles ainda valem para o produto inteiro. Se não são mais necessários, remova; se são, peça de novo dentro da etapa certa e remova o antigo.</p>
          <ul className="mt-1.5 space-y-1">
            {legacy.map((r) => (
              <li key={r.key} className="flex items-center gap-2 rounded-lg border border-amber-200 bg-white px-2 py-1 dark:border-amber-900 dark:bg-slate-900" data-testid="summary-legacy-item">
                <AccessLogo type={{ ...r.type, name: r.name }} size={22} />
                <span className="min-w-0 flex-1 truncate font-semibold">{r.name}</span>
                {!readOnly && act && (
                  <button type="button" aria-label={`Remover o acesso antigo ${r.name}`} className="rounded p-1 text-slate-400 hover:text-red-600" onClick={() => {
                    const req = reqById.get(r.key);
                    if (!req || !window.confirm(`Remover o acesso antigo “${r.name}” do produto? Ele deixa de ser pedido ao cliente.`)) return;
                    void act(() => apiClient.deleteConnectionRequirement(req.id), "Acesso antigo removido.");
                  }}><Trash2 className="h-3.5 w-3.5" /></button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Corpo para adicionar um tipo de acesso ao produto inteiro (padrão do botão "Adicionar acesso"): obrigatório, antes das tarefas, primeiro método e permissão do tipo. */
export function buildProductRequirementBody(version: any, type: any) {
  return toBody({
    ...emptyForm(), connection_type_id: type.id, method: type.allowed_methods?.[0] ?? "", permission_level: type.permission_levels?.[0]?.key ?? "",
    when_needed: "before_task", when_task_key: version.tasks?.[0]?.key ?? "",
    dependents: (version.tasks ?? []).map((task: any) => ({ task_key: task.key, step_key: "", kind: "start" })),
  });
}

export function ConnectionsSection({ version, readOnly, act, scope, onLinked, stepOps, onStepOps, stepNames }: { version: any; readOnly: boolean; act: Act; scope?: ConnectionScope; /** Chamado com a chave do acesso recém-salvo dentro de uma etapa (a etapa passa a usá-lo). */ onLinked?: (key: string) => void; /** ops da etapa em edição (access_keys) e como alterá-los: usados para marcar acessos de outras etapas. */ stepOps?: any; onStepOps?: (patch: Record<string, unknown>) => void; stepNames?: Record<string, string> }) {
  const [types, setTypes] = useState<any[]>([]);
  const [vocab, setVocab] = useState<Vocab | null>(null);
  const [drafts, setDrafts] = useState<number[]>([]);
  const [seq, setSeq] = useState(1);
  useEffect(() => {
    let live = true;
    void Promise.all([apiClient.getConnectionTypes(), apiClient.getConnectionVocabulary()]).then(([t, v]) => { if (live) { setTypes(t.data); setVocab(v); } }).catch(() => {});
    return () => { live = false; };
  }, []);
  const allReqs: any[] = version.connection_requirements ?? [];
  const reqs = !scope || scope.kind === "product"
    ? allReqs.filter((r) => !r.when_task_key && !r.when_step_key)
    : allReqs.filter((r) => r.when_task_key === scope.task?.key && (scope.kind === "task" ? !r.when_step_key : r.when_step_key === scope.step?.key));
  // Produto → todas as tarefas; tarefa → todas as etapas da tarefa. Uma
  // etapa só ganha configuração própria quando não existe acesso herdado.
  const productReqs = allReqs.filter((r) => !r.when_task_key && !r.when_step_key);
  const taskReqs = scope?.task?.key ? allReqs.filter((r) => r.when_task_key === scope.task?.key && !r.when_step_key) : [];
  const inheritedReqs = scope?.kind === "task" ? productReqs : scope?.kind === "step" ? [...productReqs, ...taskReqs] : [];
  const inherited = !!scope && inheritedReqs.length > 0;
  const on: boolean = scope ? reqs.length > 0 || drafts.length > 0 : !!version.requires_connections;
  const tasks: any[] = useMemo(() => (version.tasks ?? []).map((t: any) => ({ key: t.key, name: t.name, steps: (t.steps ?? []).map((s: any) => ({ key: s.key, name: s.name })) })), [version.tasks]);
  const toggle = (v: boolean) => act(() => apiClient.setVersionConnectionsModule(version.id, v), v ? "Módulo de conexões ativado." : "Módulo de conexões desativado.");
  const addDraft = () => { setDrafts((d) => [...d, seq]); setSeq((n) => n + 1); };
  const toggleProductAccess = (needed: boolean) => {
    void toggle(needed);
    if (needed && reqs.length === 0 && drafts.length === 0) addDraft();
    if (!needed) setDrafts([]);
  };
  const toggleScopedAccess = (needed: boolean) => {
    if (needed) {
      if (reqs.length === 0 && drafts.length === 0) addDraft();
      return;
    }
    setDrafts([]);
    if (reqs.length > 0) {
      void act(
        () => Promise.all(reqs.map((r) => apiClient.deleteConnectionRequirement(r.id))),
        "Acesso removido desta parte."
      );
    }
  };
  const save = (f: Form, draftId?: number) =>
    act(async () => {
      if (scope && !version.requires_connections) await apiClient.setVersionConnectionsModule(version.id, true);
      const key = f.key ?? `${(types.find((t) => t.id === f.connection_type_id)?.key ?? "conexao")}_${Date.now().toString(36)}`;
      const atScope = !scope || scope.kind === "product" ? {
        ...f,
        when_needed: "before_task",
        // O campo técnico guarda uma tarefa âncora, mas a lista abaixo inclui
        // todas: por isso esta exigência é herdada por todo o produto.
        when_task_key: version.tasks?.[0]?.key ?? "",
        when_step_key: "",
        dependents: (version.tasks ?? []).map((task: any) => ({ task_key: task.key, step_key: "", kind: "start" })),
      } : {
        ...f,
        when_needed: scope.kind === "task" ? "before_task" : "before_step",
        when_task_key: scope.task?.key ?? "",
        when_step_key: scope.kind === "step" ? scope.step?.key ?? "" : "",
        dependents: [{ task_key: scope.task?.key ?? "", step_key: scope.kind === "step" ? scope.step?.key ?? "" : "", kind: "start" }],
      };
      const r = await apiClient.saveConnectionRequirement(version.id, key, toBody(atScope));
      if (draftId != null) setDrafts((d) => d.filter((x) => x !== draftId));
      if (scope?.kind === "step") onLinked?.(String(r?.key ?? key));
      return r;
    }, "Exigência de conexão salva.");
  const content = on && (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"><ShieldCheck className="h-4 w-4 shrink-0" />Orientação segura para conexões</div>
      {!vocab ? <p className="text-xs text-slate-500"><ButtonLoader text="Carregando o catálogo de conexões…" /></p> : <div className="space-y-2">
        {reqs.map((r) => <RequirementRow key={r.id} initial={fromReq(r)} isNew={false} types={types} vocab={vocab} tasks={tasks} version={version} readOnly={readOnly} scope={scope} onSave={(f) => save(f)} onRemove={() => void act(() => apiClient.deleteConnectionRequirement(r.id), "Exigência removida.")} />)}
        {drafts.map((id) => <RequirementRow key={`d${id}`} initial={emptyForm()} isNew types={types} vocab={vocab} tasks={tasks} version={version} readOnly={readOnly} scope={scope} onSave={(f) => save(f, id)} onRemove={() => setDrafts((d) => d.filter((x) => x !== id))} />)}
        {!readOnly && <button type="button" aria-label="Adicionar conexão" onClick={addDraft} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-violet-300 bg-white px-3 text-xs font-semibold text-violet-700 hover:bg-violet-100 dark:border-violet-800 dark:bg-slate-900 dark:text-violet-200"><Plus className="h-3.5 w-3.5" />{scope ? "Adicionar outro acesso" : "Adicionar outro acesso geral"}</button>}
      </div>}
    </div>
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [wants, setWants] = useState(false);
  const [ask, setAsk] = useState<null | { mode: "off" | "remove"; items: { req: any; users: { task: any; step: any }[]; choice: string }[] }>(null);
  if (scope && scope.kind === "step") {
    // Não existe mais "acesso herdado" aqui: cada etapa tem a SUA lista (a lista nunca é bloqueada por acesso geral do produto).
    // O acesso da etapa é SEMPRE um tipo do catálogo (Google Ads, WordPress…): como o cliente libera e o que informa já vêm
    // definidos no tipo. Aqui só se escolhe da lista; tipos novos são criados no catálogo de acessos, não na etapa.
    const catalogTypes = types.filter((t) => t.is_active !== false);
    const usedTypeIds = new Set(reqs.map((r) => r.connection_type?.id));
    const methodLabel = (k: string) => vocab?.methods.find((m) => m.key === k)?.label ?? k;
    const addType = async (t: any) => {
      try {
        await act(async () => {
          if (!version.requires_connections) await apiClient.setVersionConnectionsModule(version.id, true);
          const key = `${t.key}_${Date.now().toString(36)}`;
          const body = toBody({
            ...emptyForm(), connection_type_id: t.id, method: t.allowed_methods?.[0] ?? "", permission_level: t.permission_levels?.[0]?.key ?? "",
            when_needed: "before_step", when_task_key: scope.task?.key ?? "", when_step_key: scope.step?.key ?? "",
            dependents: [{ task_key: scope.task?.key ?? "", step_key: scope.step?.key ?? "", kind: "start" }],
          });
          const r = await apiClient.saveConnectionRequirement(version.id, key, body);
          onLinked?.(String(r?.key ?? key));
          return r;
        }, `“${t.name}” adicionado a esta etapa.`, { rethrow: true });
        setCatalogOpen(false);
      } catch { /* act já mostra o erro */ }
    };
    const setShared = (r: any, v: boolean) => act(() => apiClient.saveConnectionRequirement(version.id, r.key, toBody({ ...fromReq(r), shared_with_steps: v })), v ? "Acesso disponível para as outras etapas." : "Acesso só desta etapa.");
    // Acessos de OUTRAS etapas marcados como "disponível para as outras etapas": os que esta etapa já usa aparecem na lista;
    // os demais aparecem logo abaixo para usar com um clique. Quem usa fica guardado em ops.access_keys da etapa.
    const { shared } = splitAccesses(allReqs, scope.step?.key) as { shared: any[] };
    const keys: string[] = Array.isArray(stepOps?.access_keys) ? stepOps.access_keys : [];
    const usedShared = shared.filter((r) => keys.includes(r.key));
    const availableShared = shared.filter((r) => !keys.includes(r.key));
    const nameOfReq = (r: any) => r.label?.trim() || r.connection_type?.name || r.key;
    const showList = on || wants || usedShared.length > 0;
    const myTask = scope.task?.key ?? "";
    const myStep = scope.step?.key ?? "";
    // Outras etapas que USAM um acesso cadastrado aqui (marcaram "usar nesta etapa").
    const allSteps: { task: any; step: any }[] = (version.tasks ?? []).flatMap((t: any) => (t.steps ?? []).map((s: any) => ({ task: t, step: s })));
    const usersOf = (r: any) => allSteps.filter(({ task, step }) => !(task.key === myTask && step.key === myStep) && step.ops?.access_scope === "some" && Array.isArray(step.ops.access_keys) && step.ops.access_keys.includes(r.key));
    const parked: { reqs: any[]; keys: string[] } | undefined = stepOps?.access_parked;
    const parkedCount = (parked?.reqs?.length ?? 0) + (parked?.keys?.length ?? 0);
    const transferReq = (r: any, taskKey: string, stepKey: string) =>
      apiClient.saveConnectionRequirement(version.id, r.key, toBody({ ...fromReq(r), when_needed: "before_step", when_task_key: taskKey, when_step_key: stepKey, dependents: [{ task_key: taskKey, step_key: stepKey, kind: "start" }] }));
    // Pergunta ao desligar a etapa / remover um acesso que outras etapas usam: desativar em todas ou passar para uma delas.
    const labelOf = ({ task, step }: { task: any; step: any }) => `${step.name}${(version.tasks ?? []).length > 1 ? ` (${task.name})` : ""}`;
    /** Desliga a etapa GUARDANDO os acessos (voltam ao ligar de novo). `decisions`: acesso → "all" | "tarefa::etapa" (passar para). */
    const doTurnOff = async (decisions: Record<string, string>) => {
      let toPark: { key: string; body: any }[] = [];
      await act(async () => {
        toPark = [];
        for (const r of reqs) {
          const d = decisions[r.key];
          if (d && d !== "all") { const [tk, sk] = d.split("::"); await transferReq(r, tk, sk); }
          else { toPark.push({ key: r.key, body: toBody(fromReq(r)) }); await apiClient.deleteConnectionRequirement(r.id); }
        }
      }, "Etapa sem acesso. Os acessos ficam guardados e voltam se você ligar de novo.");
      const ownKeys = new Set(reqs.map((r) => r.key));
      const borrowed = keys.filter((k) => !ownKeys.has(k));
      setWants(false);
      onStepOps?.({ access_scope: undefined, access_keys: undefined, access_parked: toPark.length || borrowed.length ? { reqs: toPark, keys: borrowed } : undefined });
    };
    const startTurnOff = () => {
      const items = reqs.map((r) => ({ req: r, users: usersOf(r), choice: "all" })).filter((i) => i.users.length > 0);
      if (items.length) { setAsk({ mode: "off", items }); return; }
      void doTurnOff({});
    };
    const turnOn = async () => {
      setWants(true);
      if (!parked || parkedCount === 0) return;
      await act(async () => { for (const p of parked.reqs ?? []) await apiClient.saveConnectionRequirement(version.id, p.key, p.body); }, "Os acessos guardados desta etapa voltaram.");
      const restored = [...(parked.keys ?? []), ...(parked.reqs ?? []).map((p: any) => p.key)];
      onStepOps?.({ access_scope: "some", access_keys: Array.from(new Set(restored)), access_parked: undefined });
    };
    const removeOne = (r: any) => {
      const users = usersOf(r);
      if (users.length) { setAsk({ mode: "remove", items: [{ req: r, users, choice: "all" }] }); return; }
      void act(() => apiClient.deleteConnectionRequirement(r.id), "Acesso removido desta etapa.");
    };
    const confirmAsk = async () => {
      if (!ask) return;
      const decisions = Object.fromEntries(ask.items.map((i) => [i.req.key, i.choice]));
      const mode = ask.mode;
      setAsk(null);
      if (mode === "off") { await doTurnOff(decisions); return; }
      const item = ask.items[0];
      await act(async () => {
        if (item.choice !== "all") { const [tk, sk] = item.choice.split("::"); await transferReq(item.req, tk, sk); }
        else await apiClient.deleteConnectionRequirement(item.req.id);
      }, item.choice === "all" ? "Acesso removido de todas as etapas." : "Acesso passado para a outra etapa.");
    };
    return <section className="space-y-2.5" data-testid="connections-section">
      <div className="flex flex-wrap items-center gap-3">
        <label className={`flex h-9 items-center gap-2 text-sm ${readOnly ? "opacity-70" : "cursor-pointer"}`}>
          <Switch aria-label="Esta etapa precisa de acesso" checked={showList} disabled={readOnly} onCheckedChange={(v) => { if (v) void turnOn(); else startTurnOff(); }} />
          {/* data-no-info: este "i" é o único (a camada geral de ajuda não coloca outro ao lado do mesmo texto) */}
          <span data-no-info="" className="font-semibold text-slate-700 dark:text-slate-200">Esta etapa precisa de acesso</span>
          <span className="field-info" data-help="Ligue quando o cliente precisa liberar algum acesso para esta etapa acontecer (conta de anúncios, site, e-mail…). Ao ligar, aparece a lista e o botão para adicionar. Desligar remove os acessos desta etapa." aria-hidden="true">i</span>
        </label>
      </div>
      {!showList && parkedCount > 0 && (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300" data-testid="parked-note">
          Acessos guardados desta etapa: <strong>{[...(parked?.reqs ?? []).map((p: any) => p.key), ...(parked?.keys ?? [])].length}</strong>. Eles voltam quando você ligar “Esta etapa precisa de acesso” de novo. Só somem se você excluí-los.
        </p>
      )}
      {showList && (
        <div className="space-y-2" data-testid="step-access-list">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Acessos que esta etapa usa</p>
          {reqs.length === 0 && usedShared.length === 0 && <p className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500 dark:border-slate-700">Nenhum acesso ainda. Clique em “Adicionar acesso” e escolha na lista (Google Ads, WordPress…).</p>}
          <ul className="grid gap-2 md:grid-cols-2">
            {usedShared.map((r) => (
              <li key={r.id} className="rounded-xl border border-violet-200 bg-violet-50/50 p-3 text-xs shadow-sm dark:border-violet-900 dark:bg-violet-950/20" data-testid="step-access-shared-used">
                <div className="flex items-start gap-2">
                  <AccessLogo type={{ ...r.connection_type, name: nameOfReq(r) }} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{nameOfReq(r)}</p>
                    <p className="text-[11px] text-slate-500">Cadastrado na etapa {stepNames?.[r.when_step_key ?? ""] ?? r.when_step_key} · usado aqui</p>
                  </div>
                  {!readOnly && <button type="button" aria-label={`Deixar de usar ${nameOfReq(r)} nesta etapa`} title="Deixar de usar nesta etapa (o acesso continua na etapa de origem)" className="rounded p-1 text-slate-400 hover:text-red-600" onClick={() => onStepOps?.(accessPatch("some", keys.filter((k) => k !== r.key)))}><X className="h-4 w-4" /></button>}
                </div>
              </li>
            ))}
            {reqs.map((r) => (
              <li key={r.id} className="rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-sm dark:border-slate-700 dark:bg-slate-900" data-testid="step-access-item">
                <div className="flex items-start gap-2">
                  <AccessLogo type={{ ...r.connection_type, name: nameOfReq(r) }} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{r.label || r.connection_type?.name}</p>
                    <p className="text-[11px] text-slate-500">O cliente libera por: {methodLabel(r.method)}{r.obligation === "optional" ? " · opcional" : r.obligation === "conditional" ? " · condicional" : " · obrigatório"}</p>
                  </div>
                  {!readOnly && <button type="button" aria-label={`Remover ${r.label || r.connection_type?.name}`} className="rounded p-1 text-slate-400 hover:text-red-600" onClick={() => removeOne(r)}><Trash2 className="h-4 w-4" /></button>}
                </div>
                <label className={`mt-2 flex items-center gap-2 rounded-md bg-slate-50 px-2 py-1.5 dark:bg-slate-800/50 ${readOnly ? "opacity-70" : "cursor-pointer"}`}>
                  <input type="checkbox" className="h-4 w-4 accent-violet-600" disabled={readOnly} checked={!!r.shared_with_steps} onChange={(e) => void setShared(r, e.target.checked)} />
                  <span className="font-semibold text-slate-700 dark:text-slate-200">Disponível para as outras etapas</span>
                </label>
              </li>
            ))}
          </ul>
          {!readOnly && (
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" className="h-9" onClick={() => setCatalogOpen(true)} data-testid="add-step-access"><Plus className="mr-1.5 h-4 w-4" />Adicionar acesso</Button>
              {reqs.length > 0 && <Button type="button" variant="ghost" className="h-9 text-xs" onClick={() => setPickerOpen(true)} data-testid="select-step-access"><Link2 className="mr-1.5 h-4 w-4" />Ajustes avançados</Button>}
            </div>
          )}
          {availableShared.length > 0 && (
            <div className="rounded-lg border border-violet-200 bg-violet-50/60 p-2.5 dark:border-violet-900 dark:bg-violet-950/20" data-testid="shared-accesses">
              <p className="text-xs font-semibold text-violet-800 dark:text-violet-200">Acessos de outras etapas, disponíveis para usar aqui</p>
              <ul className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
                {availableShared.map((r) => (
                  <li key={r.key} className="flex items-center gap-2 rounded-lg border border-violet-200 bg-white px-2 py-1.5 dark:border-violet-900 dark:bg-slate-900">
                    <AccessLogo type={{ ...r.connection_type, name: nameOfReq(r) }} size={26} />
                    <span className="min-w-0 flex-1 text-xs"><span className="block truncate font-semibold">{nameOfReq(r)}</span><span className="text-[10px] text-slate-500">da etapa {stepNames?.[r.when_step_key ?? ""] ?? r.when_step_key}</span></span>
                    {!readOnly && <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={() => onStepOps?.(accessPatch("some", [...keys, r.key]))}>Usar nesta etapa</Button>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      <Dialog open={ask !== null} onOpenChange={(v) => { if (!v) setAsk(null); }}>
        <DialogContent className="max-w-xl" data-testid="access-transfer-dialog">
          <DialogTitle className="text-base">{ask?.mode === "off" ? "Estes acessos são usados por outras etapas" : "Este acesso é usado por outras etapas"}</DialogTitle>
          <p className="text-xs text-slate-600 dark:text-slate-300">Escolha o que fazer com cada um: desativar em todas as etapas, ou passar para uma das etapas que o usa (ela vira a etapa “mãe” do acesso e ele continua funcionando nas demais).</p>
          <div className="space-y-3">
            {ask?.items.map((it, idx) => (
              <fieldset key={it.req.key} className="rounded-lg border border-slate-200 p-2.5 dark:border-slate-700">
                <legend className="px-1 text-sm font-bold">{it.req.label || it.req.connection_type?.name}</legend>
                <label className="flex items-center gap-2 py-0.5 text-xs">
                  <input type="radio" name={`ask-${idx}`} checked={it.choice === "all"} onChange={() => setAsk((cur) => cur && { ...cur, items: cur.items.map((x, j) => (j === idx ? { ...x, choice: "all" } : x)) })} />
                  <span>{ask.mode === "off" ? "Desativar em todas as etapas (fica guardado)" : "Remover de todas as etapas"}</span>
                </label>
                {it.users.map((u) => {
                  const v = `${u.task.key}::${u.step.key}`;
                  return (
                    <label key={v} className="flex items-center gap-2 py-0.5 text-xs">
                      <input type="radio" name={`ask-${idx}`} checked={it.choice === v} onChange={() => setAsk((cur) => cur && { ...cur, items: cur.items.map((x, j) => (j === idx ? { ...x, choice: v } : x)) })} />
                      <span>Passar para a etapa <strong>{labelOf(u)}</strong> (ela passa a ser a etapa mãe)</span>
                    </label>
                  );
                })}
              </fieldset>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setAsk(null)}>Cancelar</Button>
            <Button type="button" onClick={() => void confirmAsk()} data-testid="access-transfer-confirm">Confirmar</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={catalogOpen} onOpenChange={setCatalogOpen}>
        <DialogContent className="max-h-[85vh] w-[95vw] max-w-4xl overflow-y-auto sm:max-w-4xl" data-testid="step-access-catalog">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <DialogTitle className="text-base">Adicionar acesso — {scope.step?.name}</DialogTitle>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Escolha o tipo de acesso. Como o cliente libera e o que ele informa já estão definidos no cadastro de cada tipo.</p>
            </div>
            {!readOnly && <Button type="button" variant="outline" size="sm" className="h-8 text-xs" data-testid="manage-access-types" onClick={() => { setCatalogOpen(false); window.dispatchEvent(new Event("catalog2:manage-access-types")); }}><Settings2 className="mr-1.5 h-3.5 w-3.5" />Configurar tipos de acesso</Button>}
          </div>
          {!vocab && <p className="text-xs text-slate-500"><ButtonLoader text="Carregando o catálogo de acessos…" /></p>}
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {catalogTypes.map((t) => {
              const fields: any[] = t.fields ?? [];
              const used = usedTypeIds.has(t.id);
              return (
                <li key={t.id} className={`flex flex-col rounded-xl border bg-white p-3 text-xs shadow-sm dark:bg-slate-900 ${used ? "border-emerald-300" : "border-slate-200 dark:border-slate-700"}`} data-testid={`step-access-type-${t.key}`}>
                  <div className="flex items-start gap-2.5">
                    <AccessLogo type={t} size={40} />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{t.name}</p>
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500">{t.description || "Sem descrição."}</p>
                    </div>
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-600 dark:text-slate-300"><span className="font-semibold">Cliente libera por:</span> {(t.allowed_methods ?? []).map(methodLabel).join(", ") || "—"}</p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300"><span className="font-semibold">Cliente informa:</span> {fields.length ? fields.map((f) => f.label).join(", ") : "identificação da conta"}</p>
                  <Button type="button" size="sm" className="mt-2 h-8" disabled={used} onClick={() => void addType(t)}><Plus className="mr-1 h-3.5 w-3.5" />{used ? "Já nesta etapa" : "Adicionar"}</Button>
                </li>
              );
            })}
            {vocab && catalogTypes.length === 0 && <li className="col-span-full text-xs text-slate-500">Nenhum tipo de acesso cadastrado. Cadastre no catálogo de acessos do produto.</li>}
          </ul>
        </DialogContent>
      </Dialog>
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-h-[85vh] w-[95vw] max-w-4xl overflow-y-auto sm:max-w-4xl">
          <DialogTitle className="text-base">Ajustes avançados dos acessos — {scope.step?.name}</DialogTitle>
          {content}
        </DialogContent>
      </Dialog>
    </section>;
  }
  if (scope) {
    const part = scope.kind === "task" ? "tarefa" : "etapa";
    const inheritedFrom = scope.kind === "task" ? "do produto, válido para todas as tarefas" : taskReqs.length > 0 ? "da tarefa, válido para todas as etapas dela" : "do produto, válido para todas as tarefas";
    return <section className="space-y-2" data-testid="connections-section">
      {inherited ? <p className="text-[11px] text-slate-500">Esta {part} já usa o acesso configurado {inheritedFrom}.</p> : <label className={`flex h-8 items-center gap-2 text-xs ${readOnly ? "cursor-default opacity-70" : "cursor-pointer"}`}><input type="checkbox" checked={on} disabled={readOnly} onChange={(e) => toggleScopedAccess(e.target.checked)} /><span className="font-semibold text-slate-700 dark:text-slate-200">Esta {part} precisa de acesso</span></label>}
      {!inherited && content}
    </section>;
  }
  return <details className="group min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60" data-testid="connections-section">
    <summary className="flex min-h-[52px] cursor-pointer select-none list-none items-center gap-2 px-3 py-2 [&::-webkit-details-marker]:hidden"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200"><Plug className="h-4 w-4" /></span><span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Acesso para todas as tarefas</span><span className="field-info" data-help="Quando ativado, este acesso é compartilhado por todas as tarefas do produto. Use para requisitos gerais, como uma conta Google Ads ou acesso ao site. Para uma necessidade específica, cadastre dentro da própria tarefa ou etapa." aria-hidden="true">i</span><span className="min-w-0 flex-1 truncate text-xs text-slate-500 dark:text-slate-400">{on ? `${reqs.length} acesso${reqs.length === 1 ? "" : "s"} compartilhado${reqs.length === 1 ? "" : "s"}` : "nenhum acesso geral"}</span><label onClick={(e) => e.stopPropagation()} className={`inline-flex shrink-0 items-center gap-2 text-xs font-semibold ${readOnly ? "opacity-70" : "cursor-pointer"}`}><input type="checkbox" checked={on} disabled={readOnly} onChange={(e) => toggleProductAccess(e.target.checked)} className="h-4 w-4 accent-violet-600" />Aplicar a todas as tarefas</label><ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" /></summary>
    <div className="min-w-0 space-y-3 border-t border-slate-100 px-3 py-3 dark:border-slate-800">{on && content}</div>
  </details>;
}
