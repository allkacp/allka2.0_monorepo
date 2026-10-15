"use client";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";

// Horas extras de uma OPÇÃO de variação (ex.: "4 campanhas" soma horas em "Criar campanhas").
// Só aparece o que foi ADICIONADO: quem cadastra escolhe a etapa (ou a tarefa inteira), informa as horas e, se quiser, uma
// ESPECIALIDADE PRÓPRIA (ex.: uma variação nova que o produto original não tem). Sem especialidade própria, o custo usa a
// especialidade da etapa. O preço e o prazo adicionais são calculados no servidor. A opção PADRÃO (o que o produto original
// já inclui) não soma horas: nada disso aparece nela.
type Act = (fn: () => Promise<any>, ok?: string | ((r: any) => string | undefined), opts?: { rethrow?: boolean }) => Promise<any>;
const EFFORT_EFFECT = "add_effort_hours";
const brl = (n: number) => `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export interface StepRef { taskKey: string; taskName: string; stepKey: string; stepName: string; rate: number | null; specialtyName: string | null }

/** Todas as etapas da versão com a especialidade e o valor/hora dela (usado para estimar o custo das horas extras). */
export function stepRefsOf(version: any, specialties: any[]): StepRef[] {
  const out: StepRef[] = [];
  for (const t of version?.tasks ?? []) {
    const steps = [...(t.steps ?? [])].sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    for (const s of steps) {
      const sp = specialties.find((x) => x.id === s.specialty_id);
      out.push({ taskKey: t.key, taskName: t.name, stepKey: s.key, stepName: s.name, rate: sp?.max_hourly_rate != null ? Number(sp.max_hourly_rate) : null, specialtyName: sp?.name ?? null });
    }
  }
  return out;
}

/** Etapas + a "tarefa inteira" (sem etapa específica), para horas extras que não pertencem a uma etapa só. */
export function targetRefsOf(version: any, specialties: any[]): StepRef[] {
  const out: StepRef[] = [];
  for (const t of version?.tasks ?? []) {
    const sp = specialties.find((x) => x.id === (t.specialty?.id ?? t.specialty_id));
    out.push({ taskKey: t.key, taskName: t.name, stepKey: "", stepName: "Tarefa inteira", rate: sp?.max_hourly_rate != null ? Number(sp.max_hourly_rate) : null, specialtyName: sp?.name ?? null });
    out.push(...stepRefsOf({ tasks: [t] }, specialties));
  }
  return out;
}

/** Efeito de horas extras já cadastrado para uma etapa (soma de minutos ou de horas), em HORAS. */
export function extraHoursFor(effects: any[], taskKey: string, stepKey: string): { hours: number; ids: string[]; specialtyId: string | null } {
  let hours = 0; const ids: string[] = []; let specialtyId: string | null = null;
  for (const e of effects ?? []) {
    if (e.source_task_key !== taskKey || (e.source_step_key ?? "") !== stepKey) continue;
    if (e.effect_type === "add_effort_hours") { hours += Number(e.effect_value) || 0; ids.push(e.id); }
    else if (e.effect_type === "add_effort_minutes") { hours += (Number(e.effect_value) || 0) / 60; ids.push(e.id); }
    else continue;
    if (e.specialty_id) specialtyId = e.specialty_id;
  }
  return { hours, ids, specialtyId };
}

export function OptionStepAdjustments({ option, version, specialties, readOnly, act }: { option: any; version: any; specialties: any[]; readOnly: boolean; act: Act }) {
  const refs = targetRefsOf(version, specialties);
  const effects: any[] = option.effects ?? [];
  const [pick, setPick] = useState("");
  const [hoursText, setHoursText] = useState("");
  const [specId, setSpecId] = useState("");
  const [err, setErr] = useState("");
  // Opção padrão = produto original: não soma horas, então a área some.
  if (option.is_default) return null;
  if (refs.length <= (version?.tasks ?? []).length) {
    return <p className="mt-2 rounded-md border border-dashed border-slate-300 px-2 py-1.5 text-[11px] text-slate-500 dark:border-slate-700" data-testid="no-steps-adjust">Cadastre as etapas da tarefa para poder somar horas extras por etapa nesta opção.</p>;
  }
  const withHours = refs.filter((r) => extraHoursFor(effects, r.taskKey, r.stepKey).hours > 0);
  const available = refs.filter((r) => !withHours.includes(r));
  const add = () => {
    const ref = refs.find((r) => `${r.taskKey}::${r.stepKey}` === pick);
    const h = Number(hoursText.replace(",", "."));
    if (!ref) { setErr("Escolha a etapa que recebe as horas extras."); return; }
    if (!Number.isFinite(h) || h <= 0) { setErr("Informe as horas extras (um número maior que zero)."); return; }
    setErr("");
    void act(async () => {
      await apiClient.addCatalog2OptionEffect(option.id, { effect_type: EFFORT_EFFECT, effect_value: String(h), charge_scope: "recurring", source_task_key: ref.taskKey, source_step_key: ref.stepKey || null, effort_scale_by_quantity: false, specialty_id: specId || null });
    }, "Horas extras salvas.").then(() => { setPick(""); setHoursText(""); setSpecId(""); });
  };
  return (
    <div className="pt-2" data-testid="option-step-adjust">
      <p className="text-[11px] font-bold uppercase tracking-wide text-violet-800 dark:text-violet-200">Horas extras desta opção <span className="font-normal normal-case text-slate-500">— somam em cima do produto original; preço e prazo adicionais são calculados automaticamente</span></p>
      {withHours.length === 0
        ? <p className="mt-1 text-[11px] text-slate-500" data-testid="adjust-empty">Nenhuma etapa com horas extras nesta opção.</p>
        : <ul className="mt-1.5 space-y-1">{withHours.map((r) => <StepAdjustRow key={`${r.taskKey}-${r.stepKey}`} r={r} effects={effects} option={option} specialties={specialties} readOnly={readOnly} act={act} />)}</ul>}
      {!readOnly && available.length > 0 && (
        <div className="mt-2 flex flex-wrap items-end gap-2 border-t border-violet-200 pt-2 dark:border-violet-900" data-testid="adjust-add">
          <label className="min-w-[14rem] flex-1 text-[11px] font-medium text-slate-600 dark:text-slate-300">Etapa (ou tarefa inteira) que recebe as horas extras
            <select aria-label="Etapa que recebe horas extras" className="mt-0.5 h-8 w-full rounded-md border border-slate-200 bg-white px-1.5 text-xs dark:border-slate-700 dark:bg-slate-900" value={pick} onChange={(e) => { setPick(e.target.value); setErr(""); }}>
              <option value="">Escolha…</option>
              {available.map((r) => <option key={`${r.taskKey}::${r.stepKey}`} value={`${r.taskKey}::${r.stepKey}`}>{r.stepKey ? `${r.stepName} (${r.taskName})` : `Tarefa inteira: ${r.taskName}`} · {r.specialtyName ?? "sem especialidade"}</option>)}
            </select>
          </label>
          <label className="min-w-[12rem] text-[11px] font-medium text-slate-600 dark:text-slate-300">Especialidade das horas extras
            <select aria-label="Especialidade das horas extras" className="mt-0.5 h-8 w-full rounded-md border border-slate-200 bg-white px-1.5 text-xs dark:border-slate-700 dark:bg-slate-900" value={specId} onChange={(e) => setSpecId(e.target.value)}>
              <option value="">A da própria etapa</option>
              {specialties.map((sp) => <option key={sp.id} value={sp.id}>{sp.name}{sp.max_hourly_rate != null ? ` — ${brl(Number(sp.max_hourly_rate))}/h` : ""}</option>)}
            </select>
          </label>
          <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300">Horas extras
            <input type="number" min={0} step="0.25" aria-label="Horas extras a adicionar" className="mt-0.5 block h-8 w-24 rounded-md border border-slate-200 bg-white px-1.5 text-xs dark:border-slate-700 dark:bg-slate-900" value={hoursText} placeholder="0" onChange={(e) => { setHoursText(e.target.value); setErr(""); }} onKeyDown={(e) => { if (e.key === "Enter") add(); }} />
          </label>
          <button type="button" onClick={add} className="h-8 rounded-md bg-violet-700 px-3 text-xs font-semibold text-white hover:bg-violet-800">Adicionar horas extras</button>
          {err && <span role="alert" data-testid="adjust-error" className="basis-full text-xs font-semibold text-red-600">{err}</span>}
        </div>
      )}
    </div>
  );
}

function StepAdjustRow({ r, effects, option, specialties, readOnly, act }: { r: StepRef; effects: any[]; option: any; specialties: any[]; readOnly: boolean; act: Act }) {
  const cur = extraHoursFor(effects, r.taskKey, r.stepKey);
  const own = cur.specialtyId ? specialties.find((sp) => sp.id === cur.specialtyId) ?? null : null;
  const rate = own ? (own.max_hourly_rate != null ? Number(own.max_hourly_rate) : null) : r.rate;
  const specName = own ? own.name : r.specialtyName;
  const [v, setV] = useState<string>(String(Math.round(cur.hours * 100) / 100));
  const hours = Number(v.replace(",", "."));
  const valid = v.trim() === "" || (Number.isFinite(hours) && hours >= 0);
  const apply = (next: number) => {
    if (Math.abs(next - cur.hours) < 1e-9) return;
    void act(async () => {
      for (const id of cur.ids) await apiClient.deleteCatalog2OptionEffect(id);
      if (next > 0) await apiClient.addCatalog2OptionEffect(option.id, { effect_type: EFFORT_EFFECT, effect_value: String(next), charge_scope: "recurring", source_task_key: r.taskKey, source_step_key: r.stepKey || null, effort_scale_by_quantity: false, specialty_id: cur.specialtyId });
    }, next > 0 ? "Horas extras salvas." : "Horas extras removidas.");
  };
  const save = () => { if (valid) apply(v.trim() === "" ? 0 : hours); };
  const cost = rate != null && hours > 0 ? hours * rate : null;
  const label = r.stepKey ? r.stepName : `Tarefa inteira: ${r.taskName}`;
  return (
    <li className="flex flex-wrap items-center gap-2 text-xs">
      <span className="min-w-[10rem] flex-1"><span className="font-semibold">{label}</span> {r.stepKey && <span className="text-slate-400">({r.taskName})</span>} <span className="text-slate-500">· especialidade{own ? " própria" : ""}: {specName ?? "não definida"}</span></span>
      <label className="inline-flex items-center gap-1">+
        <input type="number" min={0} step="0.25" disabled={readOnly} aria-label={`Horas extras na etapa ${label}`} className={`h-7 w-20 rounded-md border bg-white px-1.5 text-xs dark:bg-slate-900 ${valid ? "border-slate-200 dark:border-slate-700" : "border-red-400"}`} value={v} placeholder="0" onChange={(e) => setV(e.target.value)} onBlur={save} onKeyDown={(e) => { if (e.key === "Enter") save(); }} /> h
      </label>
      <span className="w-44 text-right text-[11px] text-slate-500" data-testid="adjust-cost">{cost != null ? `custo ≈ ${brl(cost)}` : hours > 0 ? "defina o valor/hora da especialidade" : ""}</span>
      {!readOnly && <button type="button" aria-label={`Remover horas extras da etapa ${label}`} onClick={() => apply(0)} className="rounded p-1 text-red-500 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></button>}
    </li>
  );
}
