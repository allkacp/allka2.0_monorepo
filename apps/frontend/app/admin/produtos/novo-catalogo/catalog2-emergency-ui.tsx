"use client";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Entrega emergencial (B3): liga a opção na versão e define, por ETAPA, quantas horas ela encurta e quanto cobra a mais.
export type EmergencyStepDraft = { reduction_hours: string; kind: "" | "fixed" | "percent"; value: string };

const num = (s: string) => Number(String(s).replace(",", "."));

export function emergencyDraftOf(step: any): EmergencyStepDraft {
  return {
    reduction_hours: step.emergency_reduction_minutes ? String(Math.round((step.emergency_reduction_minutes / 60) * 100) / 100) : "",
    kind: step.emergency_extra_kind ?? "",
    value: step.emergency_extra_value != null ? String(step.emergency_extra_value) : "",
  };
}

export function emergencyPayload(d: EmergencyStepDraft) {
  const hours = d.reduction_hours.trim() === "" ? 0 : num(d.reduction_hours);
  const hasExtra = d.kind !== "" && d.value.trim() !== "";
  return {
    emergency_reduction_minutes: hours > 0 ? Math.round(hours * 60) : null,
    emergency_extra_kind: hasExtra ? d.kind : null,
    emergency_extra_value: hasExtra ? num(d.value) : null,
    scope: "product",
  };
}

export function emergencyDraftError(d: EmergencyStepDraft, stepHours: number | null): string | null {
  const hours = d.reduction_hours.trim() === "" ? 0 : num(d.reduction_hours);
  if (Number.isNaN(hours) || hours < 0) return "Horas inválidas.";
  if (stepHours != null && hours > stepHours) return "Maior que o tempo da etapa.";
  if ((d.kind === "") !== (d.value.trim() === "")) return "Informe o tipo e o valor juntos.";
  if (d.value.trim() !== "" && (Number.isNaN(num(d.value)) || num(d.value) < 0)) return "Valor inválido.";
  return null;
}

function StepLine({ task, step, readOnly, act, enabled }: any) {
  const [d, setD] = useState<EmergencyStepDraft>(emergencyDraftOf(step));
  useEffect(() => { setD(emergencyDraftOf(step)); }, [step.id, step.emergency_reduction_minutes, step.emergency_extra_kind, step.emergency_extra_value]);
  const stepHours = step.estimated_minutes != null ? step.estimated_minutes / 60 : null;
  const err = emergencyDraftError(d, stepHours);
  const dirty = JSON.stringify(d) !== JSON.stringify(emergencyDraftOf(step));
  return (
    <div className="grid grid-cols-[minmax(0,1.6fr)_90px_120px_100px_auto] items-center gap-2 border-t border-slate-100 py-1.5 text-xs dark:border-slate-800" data-testid={`emergency-step-${step.key}`}>
      <span className="min-w-0 truncate"><span className="text-slate-400">{task.name} ›</span> <strong>{step.name}</strong>{stepHours != null && <span className="text-slate-400"> ({stepHours.toLocaleString("pt-BR")} h)</span>}</span>
      <Input aria-label={`Horas a reduzir de ${step.name}`} className="h-7 text-xs" inputMode="decimal" placeholder="0" value={d.reduction_hours} disabled={readOnly || !enabled} onChange={(e) => setD({ ...d, reduction_hours: e.target.value })} />
      <select aria-label={`Tipo de adicional de ${step.name}`} className="h-7 rounded-md border border-slate-200 bg-white px-1 text-xs dark:border-slate-700 dark:bg-slate-900" value={d.kind} disabled={readOnly || !enabled} onChange={(e) => setD({ ...d, kind: e.target.value as EmergencyStepDraft["kind"] })}>
        <option value="">sem adicional</option><option value="fixed">valor fixo (R$)</option><option value="percent">% do preço da etapa</option>
      </select>
      <Input aria-label={`Valor do adicional de ${step.name}`} className="h-7 text-xs" inputMode="decimal" placeholder={d.kind === "percent" ? "%" : "R$"} value={d.value} disabled={readOnly || !enabled || d.kind === ""} onChange={(e) => setD({ ...d, value: e.target.value })} />
      <span className="flex items-center gap-1">
        {err ? <span className="text-[10px] text-red-600">{err}</span> : dirty && !readOnly && enabled ? <Button type="button" size="sm" className="h-7 bg-violet-700 px-2 text-[11px] text-white" onClick={() => void act(() => apiClient.updateCatalog2Step(step.id, emergencyPayload(d)), "Entrega emergencial da etapa salva.")}>Salvar</Button> : null}
      </span>
    </div>
  );
}

export function EmergencyCard({ version, readOnly, act }: { version: any; readOnly: boolean; act: any }) {
  const enabled = !!version.emergency_enabled;
  const [sim, setSim] = useState<any>(null);
  const [simErr, setSimErr] = useState<string | null>(null);
  const tasks: any[] = version.tasks ?? [];
  const configured = tasks.flatMap((t) => t.steps ?? []).filter((s: any) => (s.emergency_reduction_minutes ?? 0) > 0 || s.emergency_extra_kind).length;
  const stepsSig = JSON.stringify(tasks.flatMap((t) => (t.steps ?? []).map((s: any) => [s.id, s.estimated_minutes, s.emergency_reduction_minutes, s.emergency_extra_kind, s.emergency_extra_value])));
  useEffect(() => {
    if (!enabled || configured === 0) { setSim(null); return; }
    let live = true;
    apiClient.simulateCatalog2(version.id, { variation_option_keys: [], addon_keys: [], quantity: 1, answers: {}, emergency: true })
      .then((r: any) => { if (live) { setSim(r.pricing); setSimErr(null); } })
      .catch((e: any) => { if (live) setSimErr(e?.message ?? "Não foi possível simular."); });
    return () => { live = false; };
  }, [version.id, enabled, configured, stepsSig]);
  const em = sim?.emergency;
  const money = (n: number | null | undefined) => (n == null ? "—" : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));
  return (
    <section id="catalog2-emergency" className="mb-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/60" data-testid="emergency-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Entrega emergencial</h3>
          <p className="text-[11px] text-slate-500">O cliente pode pedir prazo menor pagando um adicional. Cada etapa diz quantas horas encurta e quanto cobra a mais; o sistema recalcula o prazo total e o preço final.</p>
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold">
          <input type="checkbox" checked={enabled} disabled={readOnly} onChange={(e) => void act(() => apiClient.updateCatalog2VersionInfo(version.id, { emergency_enabled: e.target.checked }), e.target.checked ? "Entrega emergencial ligada." : "Entrega emergencial desligada.")} />
          Oferecer entrega emergencial
        </label>
      </div>
      {enabled && (
        <div className="mt-2">
          <div className="grid grid-cols-[minmax(0,1.6fr)_90px_120px_100px_auto] gap-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            <span>Etapa</span><span>Horas a reduzir</span><span>Adicional</span><span>Valor</span><span />
          </div>
          {tasks.flatMap((t) => (t.steps ?? []).map((s: any) => <StepLine key={s.id} task={t} step={s} readOnly={readOnly} act={act} enabled={enabled} />))}
          {configured === 0 && <p className="mt-2 text-[11px] text-amber-700">Nenhuma etapa configurada ainda — sem isso a opção não aparece para o cliente e a versão não publica.</p>}
          {em?.available && (
            <p className="mt-2 rounded-lg bg-violet-50 px-3 py-2 text-xs text-violet-900 dark:bg-violet-950/30 dark:text-violet-100" data-testid="emergency-summary">
              Com entrega emergencial: prazo das etapas de <strong>{(em.minutes_before / 60).toLocaleString("pt-BR")} h</strong> para <strong>{(em.minutes_after / 60).toLocaleString("pt-BR")} h</strong>
              {em.commercial_days_before != null && <> · prazo comercial de <strong>{em.commercial_days_before}</strong> para <strong>{em.commercial_days_after}</strong> dia(s) útil(eis)</>}
              {" "}· adicional <strong>{em.extra_pending ? "a calcular (falta preço)" : money(em.extra_price)}</strong>.
            </p>
          )}
          {simErr && <p className="mt-1 text-[11px] text-red-600">Simulação: {simErr}</p>}
        </div>
      )}
    </section>
  );
}
