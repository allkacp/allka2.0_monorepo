// Seção universal "Conexões e acessos necessários" do editor de produto (qualquer produto, atual ou futuro).
// Opcional: desativada, o produto se comporta como se o módulo não existisse. Nunca coleta senha: só descreve o que é exigido.
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Plug, Plus, Save, ShieldCheck, Trash2, X } from "lucide-react";
import { apiClient } from "@/lib/api-client";

type Act = (fn: () => Promise<any>, ok?: string | ((r: any) => string | undefined), opts?: { rethrow?: boolean }) => Promise<any>;
interface Opt { key: string; label: string }
interface Vocab {
  methods: Opt[]; when_needed: Opt[]; obligations: Opt[]; pending_behaviors: Opt[]; grant_scopes: Opt[]; dependency_kinds: Opt[]; validation_modes: string[]; asset_rules: string[];
}
const VALIDATION_LABEL: Record<string, string> = { automatic: "Automática", manual: "Manual", automatic_with_human: "Automática com confirmação humana" };
const ASSET_RULE_LABEL: Record<string, string> = {
  first_only: "Validar só na primeira execução", always: "Sempre validar", every_x_days: "Revalidar a cada X dias", on_executor_change: "Revalidar se houver troca de executor",
  on_client_change: "Revalidar se o cliente informar mudança", none_while_valid: "Não exigir revalidação enquanto válida", light_check: "Só uma conferência leve enquanto válida",
};

const SEL = "h-8 w-full min-w-0 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";
const INP = "h-8 w-full min-w-0 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";
const LBL = "mb-0.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300";

interface Form {
  key?: string; connection_type_id: number | ""; when_needed: string; when_task_key: string; when_step_key: string; condition_text: string;
  obligation: string; method: string; permission_level: string; pending_behavior: string;
  reason: string; instructions: string; default_grant_scope: string; validation_mode: string; asset_rule: string; revalidate_days: string; light_check: boolean;
  reminder_interval_hours: string; reminder_limit: string; escalate_after_reminders: string; visible_to_client: boolean;
  dependents: { task_key: string; step_key: string; kind: string }[];
}
const emptyForm = (): Form => ({
  connection_type_id: "", when_needed: "before_task", when_task_key: "", when_step_key: "", condition_text: "", obligation: "required", method: "", permission_level: "", pending_behavior: "block_dependents",
  reason: "", instructions: "", default_grant_scope: "project", validation_mode: "manual", asset_rule: "first_only", revalidate_days: "", light_check: false,
  reminder_interval_hours: "", reminder_limit: "", escalate_after_reminders: "", visible_to_client: true, dependents: [],
});
const fromReq = (r: any): Form => ({
  key: r.key, connection_type_id: r.connection_type.id, when_needed: r.when_needed, when_task_key: r.when_task_key ?? "", when_step_key: r.when_step_key ?? "", condition_text: r.condition_text ?? "",
  obligation: r.obligation, method: r.method, permission_level: r.permission_level, pending_behavior: r.pending_behavior,
  reason: r.advanced.reason ?? "", instructions: r.advanced.instructions ?? "", default_grant_scope: r.advanced.default_grant_scope, validation_mode: r.advanced.validation_mode, asset_rule: r.advanced.asset_rule,
  revalidate_days: r.advanced.revalidate_days != null ? String(r.advanced.revalidate_days) : "", light_check: !!r.advanced.light_check,
  reminder_interval_hours: r.advanced.reminder_interval_hours != null ? String(r.advanced.reminder_interval_hours) : "", reminder_limit: r.advanced.reminder_limit != null ? String(r.advanced.reminder_limit) : "",
  escalate_after_reminders: r.advanced.escalate_after_reminders != null ? String(r.advanced.escalate_after_reminders) : "", visible_to_client: r.advanced.visible_to_client !== false,
  dependents: r.dependents.map((d: any) => ({ task_key: d.task_key, step_key: d.step_key ?? "", kind: d.kind })),
});
const num = (s: string) => (s.trim() === "" ? null : Number(s));
const toBody = (f: Form) => ({
  connection_type_id: Number(f.connection_type_id), when_needed: f.when_needed,
  when_task_key: ["before_task", "before_step"].includes(f.when_needed) ? f.when_task_key || null : null, when_step_key: f.when_needed === "before_step" ? f.when_step_key || null : null,
  condition_text: f.condition_text.trim() || null, obligation: f.obligation, method: f.method, permission_level: f.permission_level, pending_behavior: f.pending_behavior,
  reason: f.reason.trim() || null, instructions: f.instructions.trim() || null, default_grant_scope: f.default_grant_scope, validation_mode: f.validation_mode, asset_rule: f.asset_rule,
  revalidate_days: f.asset_rule === "every_x_days" ? num(f.revalidate_days) : null, light_check: f.light_check,
  reminder_interval_hours: num(f.reminder_interval_hours), reminder_limit: num(f.reminder_limit), escalate_after_reminders: num(f.escalate_after_reminders), visible_to_client: f.visible_to_client,
  dependents: f.dependents.map((d) => ({ task_key: d.task_key, step_key: d.step_key || null, kind: d.kind })),
});

function RequirementRow({ initial, isNew, types, vocab, tasks, readOnly, onSave, onRemove }: { initial: Form; isNew: boolean; types: any[]; vocab: Vocab; tasks: any[]; readOnly: boolean; onSave: (f: Form) => Promise<void>; onRemove: () => void }) {
  const [f, setF] = useState<Form>(initial);
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
  const valid = f.connection_type_id !== "" && !!f.method && !!f.permission_level && (["before_task", "before_step"].indexOf(f.when_needed) < 0 || !!effTask) && (f.when_needed !== "before_step" || !!effStep);
  const sel = (label: string, value: string, onChange: (v: string) => void, options: Opt[], aria: string, disabled = false) => (
    <div className="min-w-0"><label className={LBL}>{label}</label>
      <select aria-label={aria} className={SEL} disabled={readOnly || disabled} value={value} onChange={(e) => onChange(e.target.value)}>{options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}</select>
    </div>
  );
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-2.5 dark:border-slate-800 dark:bg-slate-900/40" data-testid="conn-requirement">
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        <div className="min-w-0"><label className={LBL}>1. Tipo de conexão</label>
          <select aria-label="Tipo de conexão" className={SEL} disabled={readOnly} value={f.connection_type_id} onChange={(e) => pickType(Number(e.target.value))}>
            <option value="">Selecione…</option>{types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        {sel("2. Quando será necessária", f.when_needed, (v) => set("when_needed", v), vocab.when_needed, "Quando será necessária")}
        {sel("3. Obrigatoriedade", f.obligation, (v) => set("obligation", v), vocab.obligations, "Obrigatoriedade")}
        {sel("4. Forma de conexão", f.method, (v) => set("method", v), methods.map((m) => ({ key: m, label: methodLabel(m) })), "Forma de conexão")}
        {sel("5. Nível de permissão", f.permission_level, (v) => set("permission_level", v), levels, "Nível de permissão")}
        {["before_task", "before_step"].includes(f.when_needed) && (
          <div className="grid min-w-0 grid-cols-2 gap-2">
            {sel("Tarefa", effTask, (v) => setF((c) => ({ ...c, when_task_key: v, when_step_key: "" })), [{ key: "", label: "Selecione…" }, ...tasks.map((t) => ({ key: t.key, label: t.name }))], "Tarefa de referência")}
            {f.when_needed === "before_step" && sel("Etapa", f.when_step_key, (v) => set("when_step_key", v), [{ key: "", label: "Selecione…" }, ...(taskOf(f.when_task_key)?.steps ?? []).map((s: any) => ({ key: s.key, label: s.name }))], "Etapa de referência")}
          </div>
        )}
      </div>
      {(f.obligation === "conditional" || f.when_needed === "on_condition") && (
        <div className="mt-2"><label className={LBL}>Condição (quando passa a ser necessária)</label><input aria-label="Condição" className={INP} disabled={readOnly} value={f.condition_text} onChange={(e) => set("condition_text", e.target.value)} placeholder="Ex.: se o cliente já tiver CRM próprio" /></div>
      )}
      <div className="mt-2">
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
      </div>

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

      {!readOnly && (
        <div className="mt-2 flex items-center justify-end gap-2">
          <button type="button" aria-label="Remover exigência" className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40" onClick={onRemove}><Trash2 className="h-3.5 w-3.5" />{isNew ? "Descartar" : "Remover"}</button>
          <button type="button" aria-label="Salvar exigência" disabled={!valid || busy} onClick={async () => { setBusy(true); try { await onSave({ ...f, when_task_key: effTask, when_step_key: effStep }); } finally { setBusy(false); } }} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-violet-600 px-3.5 text-xs font-semibold text-white shadow-sm disabled:opacity-50"><Save className="h-3.5 w-3.5" />Salvar exigência</button>
        </div>
      )}
    </div>
  );
}

export function ConnectionsSection({ version, readOnly, act }: { version: any; readOnly: boolean; act: Act }) {
  const [types, setTypes] = useState<any[]>([]);
  const [vocab, setVocab] = useState<Vocab | null>(null);
  const [drafts, setDrafts] = useState<number[]>([]);
  const [seq, setSeq] = useState(1);
  useEffect(() => {
    let live = true;
    void Promise.all([apiClient.getConnectionTypes(), apiClient.getConnectionVocabulary()]).then(([t, v]) => { if (live) { setTypes(t.data); setVocab(v); } }).catch(() => {});
    return () => { live = false; };
  }, []);
  const on: boolean = !!version.requires_connections;
  const reqs: any[] = version.connection_requirements ?? [];
  const tasks: any[] = useMemo(() => (version.tasks ?? []).map((t: any) => ({ key: t.key, name: t.name, steps: (t.steps ?? []).map((s: any) => ({ key: s.key, name: s.name })) })), [version.tasks]);
  const toggle = (v: boolean) => act(() => apiClient.setVersionConnectionsModule(version.id, v), v ? "Módulo de conexões ativado." : "Módulo de conexões desativado.");
  const save = (f: Form, draftId?: number) =>
    act(async () => {
      const key = f.key ?? `${(types.find((t) => t.id === f.connection_type_id)?.key ?? "conexao")}_${Date.now().toString(36)}`;
      const r = await apiClient.saveConnectionRequirement(version.id, key, toBody(f));
      if (draftId != null) setDrafts((d) => d.filter((x) => x !== draftId));
      return r;
    }, "Exigência de conexão salva.");
  return (
    <details open className="group h-full min-w-0 rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60" data-testid="connections-section">
      <summary className="flex cursor-pointer select-none list-none items-center gap-2 px-3 py-2 [&::-webkit-details-marker]:hidden">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200"><Plug className="h-3.5 w-3.5" /></span>
        <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">Conexões e acessos necessários</span>
        <span className="min-w-0 flex-1 truncate text-xs text-slate-500 dark:text-slate-400">{on ? `${reqs.length} exigência${reqs.length === 1 ? "" : "s"} · evita coletar usuário e senha` : "não exige conexões externas"}</span>
        <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
      </summary>
      <div className="min-w-0 space-y-2.5 border-t border-slate-100 px-3 py-2.5 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Este produto exige conexões externas?">
          {[{ v: false, t: "Não exige conexões externas" }, { v: true, t: "Exige conexões externas" }].map((o) => (
            <button key={String(o.v)} type="button" role="radio" aria-checked={on === o.v} disabled={readOnly} onClick={() => on !== o.v && void toggle(o.v)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${on === o.v ? "border-violet-500 bg-violet-600 text-white" : "border-slate-300 bg-white text-slate-600 hover:border-violet-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"} ${readOnly ? "cursor-default opacity-70" : ""}`}>{o.t}</button>
          ))}
        </div>
        {!on && <p className="text-[11px] text-slate-500">Desativado: nada aparece para o cliente, não cria pendência, não entra no checklist e não bloqueia publicação, contratação, tarefas, preço ou prazo.</p>}
        {on && (
          <>
            <div className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>Prefira, nesta ordem: <strong>OAuth/integração oficial</strong> · conta gerenciadora ou vínculo entre empresas · convite para usuário corporativo da Allka · usuário temporário com permissão mínima · token/senha de aplicação revogável · e só se indispensável, credencial protegida em cofre. <strong>Senha nunca fica em campo comum, comentário, briefing ou notificação.</strong></span>
            </div>
            {!vocab ? <p className="text-xs text-slate-500">Carregando o catálogo de conexões…</p> : (
              <div className="space-y-2">
                {reqs.map((r) => (
                  <RequirementRow key={r.id} initial={fromReq(r)} isNew={false} types={types} vocab={vocab} tasks={tasks} readOnly={readOnly}
                    onSave={(f) => save(f)} onRemove={() => void act(() => apiClient.deleteConnectionRequirement(r.id), "Exigência removida.")} />
                ))}
                {drafts.map((id) => (
                  <RequirementRow key={`d${id}`} initial={emptyForm()} isNew types={types} vocab={vocab} tasks={tasks} readOnly={readOnly}
                    onSave={(f) => save(f, id)} onRemove={() => setDrafts((d) => d.filter((x) => x !== id))} />
                ))}
                {reqs.length === 0 && drafts.length === 0 && <p className="text-xs text-slate-500">Nenhuma exigência cadastrada. Com o módulo ativado, é preciso ter ao menos uma para publicar.</p>}
                {!readOnly && (
                  <button type="button" aria-label="Adicionar conexão" onClick={() => { setDrafts((d) => [...d, seq]); setSeq((n) => n + 1); }} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-violet-300 bg-violet-50 px-3 text-xs font-semibold text-violet-700 hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-200"><Plus className="h-3.5 w-3.5" />Adicionar conexão</button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </details>
  );
}
