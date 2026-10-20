"use client";

// "Condição quando este acesso passa a ser necessário": construtor SEM código livre. A pessoa escolhe origem, referência (nome + ID), operador e
// valores em listas da própria versão do produto; várias regras se combinam com E / OU; várias opções válidas na mesma regra valem como OU.
import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { QuickVariationDialog, type QuickCreate } from "./quick-variation";
import {
  COMMERCIAL_RULES, COND_KINDS, COND_KIND_LABEL, COND_OPERATOR_LABEL, MODALITIES, OPERATORS_BY_KIND, defaultOperator, describeCondition, emptyRule, ruleIssue,
  type AccessCondition, type CondKind, type CondOperator, type CondRef, type CondRule, type CondSources,
} from "./access-condition";

const SEL = "h-9 w-full min-w-0 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100";
const LBL = "mb-0.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300";

function Chips({ options, values, onChange, readOnly, name }: { options: CondRef[]; values: string[]; onChange: (v: string[]) => void; readOnly?: boolean; name: string }) {
  if (options.length === 0) return <p className="text-[11px] text-slate-500">Nada para escolher ainda neste produto.</p>;
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={name}>
      {options.map((o) => {
        const on = values.includes(o.key);
        return (
          <label key={o.key} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${readOnly ? "opacity-70" : "cursor-pointer"} ${on ? "border-violet-500 bg-violet-600 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-violet-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"}`}>
            <input type="checkbox" className="sr-only" disabled={readOnly} checked={on} onChange={(e) => onChange(e.target.checked ? [...values, o.key] : values.filter((v) => v !== o.key))} />
            {o.label}
          </label>
        );
      })}
    </div>
  );
}

function TextValues({ values, onChange, readOnly, name }: { values: string[]; onChange: (v: string[]) => void; readOnly?: boolean; name: string }) {
  const [draft, setDraft] = useState("");
  const add = () => { const v = draft.trim().replace(/\|/g, " "); if (v && !values.includes(v)) onChange([...values, v]); setDraft(""); };
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        {values.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-full border border-violet-300 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-800 dark:border-violet-700 dark:bg-violet-950/40 dark:text-violet-200">
            {v}{!readOnly && <button type="button" aria-label={`Remover valor ${v}`} className="text-violet-500 hover:text-red-600" onClick={() => onChange(values.filter((x) => x !== v))}><X className="h-3 w-3" /></button>}
          </span>
        ))}
      </div>
      {!readOnly && (
        <div className="flex gap-1.5">
          <input aria-label={name} className={SEL} value={draft} placeholder="Digite o valor e tecle Enter" onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
          <button type="button" className="h-9 shrink-0 rounded-md border border-violet-300 bg-white px-3 text-xs font-semibold text-violet-700 hover:bg-violet-50 dark:bg-slate-900" disabled={!draft.trim()} onClick={add}>Adicionar valor</button>
        </div>
      )}
    </div>
  );
}

/** Acrescentar uma opção a uma variação existente, sem sair da etapa. */
function AddOption({ onAdd }: { onAdd: (label: string) => Promise<void> }) {
  const [label, setLabel] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const go = async () => {
    const l = label.trim(); if (!l) { setErr("Digite o nome da opção."); return; }
    setBusy(true); setErr(null);
    try { await onAdd(l); setLabel(""); } catch (e: any) { setErr(e?.message ?? "Não foi possível criar a opção."); } finally { setBusy(false); }
  };
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5" data-testid="add-option-inline">
      <input aria-label="Nome da nova opção" className={`${SEL} !w-48`} value={label} placeholder="Nova opção desta variação" onChange={(e) => { setLabel(e.target.value); setErr(null); }} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void go(); } }} />
      <button type="button" disabled={busy} className="h-9 rounded-md border border-violet-300 bg-white px-3 text-xs font-semibold text-violet-700 hover:bg-violet-50 dark:bg-slate-900" onClick={() => void go()} data-testid="add-option-inline-btn">{busy ? "Criando…" : "Criar opção"}</button>
      {err && <span role="alert" className="text-[11px] font-semibold text-rose-600">{err}</span>}
    </div>
  );
}

export function AccessConditionBuilder({ value, onChange, sources, readOnly = false, showErrors = false, legacyText, accessName, quick }: {
  value: AccessCondition; onChange: (c: AccessCondition) => void; sources: CondSources; readOnly?: boolean;
  /** Criar variação/opção na hora (mesmas rotas do cadastro de variações); sem isso, os botões não aparecem. */
  quick?: QuickCreate;
  /** Mostra o que falta em cada regra (depois de uma tentativa de concluir). */
  showErrors?: boolean;
  /** Condição antiga, escrita em texto livre: continua guardada e aparece aqui só como lembrete. */
  legacyText?: string | null; accessName?: string;
}) {
  const [newVarFor, setNewVarFor] = useState<string | null>(null);
  const setRule = (id: string, patch: Partial<CondRule>) => onChange({ ...value, rules: value.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
  const pickKind = (id: string, kind: CondKind | "") => setRule(id, { kind, ref_key: "", values: [], operator: kind ? defaultOperator(kind) : "eq" });
  const summary = describeCondition(value, sources);
  const many = value.rules.length > 1;
  const idLabel = (r: CondRef) => `${r.label} (ID: ${r.key})`;
  const showValues = (r: CondRule): boolean => {
    if (!r.kind) return false;
    if (r.kind === "first_execution" || r.kind === "renewal") return false;
    if (r.kind === "variation") return (r.operator === "eq" || r.operator === "neq") && !!r.ref_key;
    if (r.kind === "questionnaire_answer") return ["eq", "neq", "contains"].includes(r.operator) && !!r.ref_key;
    if (r.kind === "step") return false;
    return true;
  };
  return (
    <div className="space-y-2.5 rounded-lg border border-amber-300 bg-amber-50/60 p-3 dark:border-amber-800 dark:bg-amber-950/20" data-testid="access-condition-builder">
      <div>
        <p className="text-sm font-bold text-amber-900 dark:text-amber-200">Condição quando este acesso passa a ser necessário{accessName ? <span className="font-normal text-amber-800/80"> — {accessName}</span> : null}</p>
        <p className="text-[11px] text-amber-900/80 dark:text-amber-200/80">Escolha nas listas, sem escrever código. Sem uma condição completa, o acesso condicional não pode ser concluído (mas pode ficar salvo como rascunho).</p>
      </div>
      {legacyText?.trim() && <p className="rounded-md border border-slate-200 bg-white/70 px-2 py-1 text-[11px] text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300" data-testid="access-condition-legacy"><strong>Condição antiga (texto):</strong> {legacyText} — continua guardada; use as regras abaixo para a condição passar a valer sozinha.</p>}
      {many && (
        <fieldset className="flex flex-wrap items-center gap-3 text-xs" disabled={readOnly}>
          <legend className="sr-only">Como combinar as regras</legend>
          <span className="font-semibold text-slate-700 dark:text-slate-200">Combinar as regras com:</span>
          <label className="inline-flex cursor-pointer items-center gap-1.5"><input type="radio" name="cond-mode" checked={value.mode === "all_triggers"} onChange={() => onChange({ ...value, mode: "all_triggers" })} /><strong>E</strong> — todas precisam ocorrer</label>
          <label className="inline-flex cursor-pointer items-center gap-1.5"><input type="radio" name="cond-mode" checked={value.mode === "any_trigger"} onChange={() => onChange({ ...value, mode: "any_trigger" })} /><strong>OU</strong> — basta uma ocorrer</label>
        </fieldset>
      )}
      <ul className="space-y-2">
        {value.rules.map((r, i) => {
          const issue = showErrors ? ruleIssue(r) : null;
          const variation = r.kind === "variation" ? sources.variations.find((v) => v.key === r.ref_key) : undefined;
          const question = r.kind === "questionnaire_answer" ? sources.questions.find((q) => q.key === r.ref_key) : undefined;
          return (
            <li key={r.id} className={`space-y-2 rounded-lg border bg-white p-2.5 dark:bg-slate-900 ${issue ? "border-rose-400 ring-1 ring-rose-300" : "border-slate-200 dark:border-slate-700"}`} data-testid="access-condition-rule" data-invalid={issue ? "true" : undefined}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Regra {i + 1}{i > 0 ? ` · ${value.mode === "all_triggers" ? "E" : "OU"}` : ""}</span>
                {!readOnly && <button type="button" aria-label={`Remover regra ${i + 1}`} className="rounded p-1 text-slate-400 hover:text-red-600" onClick={() => onChange({ ...value, rules: value.rules.filter((x) => x.id !== r.id) })}><Trash2 className="h-3.5 w-3.5" /></button>}
              </div>
              <div className="grid gap-2 md:grid-cols-3">
                <div className="min-w-0"><label className={LBL}>Origem da condição</label>
                  <select aria-label={`Origem da regra ${i + 1}`} className={SEL} disabled={readOnly} value={r.kind} onChange={(e) => pickKind(r.id, e.target.value as CondKind | "")}>
                    <option value="">Selecione…</option>
                    {COND_KINDS.map((k) => <option key={k} value={k}>{COND_KIND_LABEL[k]}</option>)}
                  </select>
                </div>
                {(r.kind === "variation" || r.kind === "questionnaire_answer" || r.kind === "step") && (
                  <div className="min-w-0"><label className={LBL}>{r.kind === "variation" ? "Variação" : r.kind === "step" ? "Etapa" : "Pergunta do questionário"}</label>
                    <select aria-label={`Referência da regra ${i + 1}`} className={SEL} disabled={readOnly} value={r.ref_key} onChange={(e) => setRule(r.id, { ref_key: e.target.value, values: [] })}>
                      <option value="">Selecione…</option>
                      {(r.kind === "variation" ? sources.variations : r.kind === "step" ? sources.steps : sources.questions).map((x) => <option key={x.key} value={x.key}>{r.kind === "step" ? x.label : idLabel(x)}</option>)}
                    </select>
                    {r.kind === "variation" && quick && !readOnly && (
                      <button type="button" className="mt-1 text-[11px] font-semibold text-violet-700 underline decoration-dotted hover:text-violet-900" onClick={() => setNewVarFor(r.id)} data-testid="open-quick-variation">+ Criar nova variação</button>
                    )}
                  </div>
                )}
                {r.kind && (
                  <div className="min-w-0"><label className={LBL}>Operador</label>
                    <select aria-label={`Operador da regra ${i + 1}`} className={SEL} disabled={readOnly || OPERATORS_BY_KIND[r.kind].length < 2} value={r.operator} onChange={(e) => setRule(r.id, { operator: e.target.value as CondOperator })}>
                      {OPERATORS_BY_KIND[r.kind].map((o) => <option key={o} value={o}>{r.kind === "first_execution" || r.kind === "renewal" ? (o === "selected" ? "Ocorre" : "Não ocorre") : COND_OPERATOR_LABEL[o]}</option>)}
                    </select>
                  </div>
                )}
              </div>
              {showValues(r) && (
                <div>
                  <label className={LBL}>{r.kind === "variation" || (r.kind === "questionnaire_answer" && !!question?.options.length) ? "Valor de comparação (pode marcar mais de uma opção: vale uma OU outra)" : r.kind === "questionnaire_answer" ? "Valor de comparação" : "Quais (pode marcar mais de uma: vale uma OU outra)"}</label>
                  {r.kind === "variation" && <Chips name={`Opções da regra ${i + 1}`} options={variation?.options ?? []} values={r.values} readOnly={readOnly} onChange={(v) => setRule(r.id, { values: v })} />}
                  {r.kind === "variation" && quick && !readOnly && variation && (
                    <AddOption onAdd={async (label) => { const k = await quick.createOption(variation.key, label); setRule(r.id, { values: [...r.values, k] }); }} />
                  )}
                  {r.kind === "option" && <Chips name={`Opções da regra ${i + 1}`} options={sources.options.map((o) => ({ key: o.key, label: `${o.variation} › ${o.label}` }))} values={r.values} readOnly={readOnly} onChange={(v) => setRule(r.id, { values: v })} />}
                  {r.kind === "addon" && <Chips name={`Adicionais da regra ${i + 1}`} options={sources.addons} values={r.values} readOnly={readOnly} onChange={(v) => setRule(r.id, { values: v })} />}
                  {r.kind === "connection" && <Chips name={`Conexões da regra ${i + 1}`} options={sources.connections} values={r.values} readOnly={readOnly} onChange={(v) => setRule(r.id, { values: v })} />}
                  {r.kind === "modality" && <Chips name={`Modalidades da regra ${i + 1}`} options={MODALITIES} values={r.values} readOnly={readOnly} onChange={(v) => setRule(r.id, { values: v })} />}
                  {r.kind === "commercial_rule" && <Chips name={`Regras comerciais da regra ${i + 1}`} options={COMMERCIAL_RULES} values={r.values} readOnly={readOnly} onChange={(v) => setRule(r.id, { values: v })} />}
                  {r.kind === "questionnaire_answer" && (question?.options.length && (r.operator === "eq" || r.operator === "neq")
                    ? <Chips name={`Respostas da regra ${i + 1}`} options={question.options} values={r.values} readOnly={readOnly} onChange={(v) => setRule(r.id, { values: v })} />
                    : <TextValues name={`Valor da regra ${i + 1}`} values={r.values} readOnly={readOnly} onChange={(v) => setRule(r.id, { values: v })} />)}
                </div>
              )}
              {(r.kind === "first_execution" || r.kind === "renewal") && <p className="text-[11px] text-slate-500">{r.kind === "first_execution" ? "Vale no primeiro ciclo do produto neste projeto." : "Vale nos ciclos seguintes (renovações)."}</p>}
              {issue && <p role="alert" className="text-[11px] font-semibold text-rose-600">Falta: {issue}.</p>}
            </li>
          );
        })}
      </ul>
      {!readOnly && <button type="button" className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-violet-300 bg-white px-3 text-xs font-semibold text-violet-700 hover:bg-violet-50 dark:border-violet-800 dark:bg-slate-900 dark:text-violet-200" onClick={() => onChange({ ...value, rules: [...value.rules, emptyRule()] })} data-testid="add-condition-rule"><Plus className="h-3.5 w-3.5" />Adicionar regra</button>}
      {showErrors && value.rules.length === 0 && !(value.preserved ?? []).length && <p role="alert" className="text-[11px] font-semibold text-rose-600">Falta: adicione ao menos uma regra à condição{accessName ? ` do acesso “${accessName}”` : ""}.</p>}
      {summary
        ? <p className="rounded-md bg-white/80 px-2 py-1.5 text-xs text-slate-700 dark:bg-slate-900/60 dark:text-slate-200" data-testid="access-condition-summary"><strong>Este acesso será necessário quando</strong> {summary}.</p>
        : <p className="rounded-md bg-white/60 px-2 py-1.5 text-xs italic text-slate-500 dark:bg-slate-900/40" data-testid="access-condition-summary-empty">Este acesso será necessário quando … (complete a regra acima para ver a frase).</p>}
      {quick && (
        <QuickVariationDialog open={newVarFor !== null} existingNames={sources.variations.map((v) => v.label)}
          onCreate={async (spec) => { const key = await quick.createVariation(spec); if (newVarFor) setRule(newVarFor, { ref_key: key, values: [] }); return key; }}
          onClose={() => setNewVarFor(null)} />
      )}
    </div>
  );
}
