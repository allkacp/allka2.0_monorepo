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

/** Campo simples que guarda ao sair (blur) — vazio limpa o valor. */
function SaveField({ label, hint, value, readOnly, placeholder, testId, inputMode = "numeric", onSave }: { label: string; hint?: string; value: string; readOnly: boolean; placeholder?: string; testId: string; inputMode?: "numeric" | "decimal" | "text"; onSave: (raw: string) => void }) {
  const [v, setV] = useState(value);
  useEffect(() => { setV(value); }, [value]);
  return (
    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
      {label}
      <Input aria-label={label} data-testid={testId} className="mt-0.5 h-8 text-xs" inputMode={inputMode} placeholder={placeholder} value={v} disabled={readOnly} onChange={(e) => setV(e.target.value)} onBlur={() => { if (v.trim() !== value.trim()) onSave(v.trim()); }} />
      {hint && <span className="mt-0.5 block text-[10px] font-normal text-slate-500">{hint}</span>}
    </label>
  );
}

export function EmergencyCard({ version, readOnly, act }: { version: any; readOnly: boolean; act: any }) {
  const enabled = !!version.emergency_enabled;
  const [sim, setSim] = useState<any>(null);
  const [simErr, setSimErr] = useState<string | null>(null);
  const tasks: any[] = version.tasks ?? [];
  const productWide = version.emergency_mode === "product";
  const configured = productWide ? ((version.emergency_product_reduction_percent ?? 0) > 0 ? 1 : 0) : tasks.flatMap((t) => t.steps ?? []).filter((s: any) => (s.emergency_reduction_minutes ?? 0) > 0 || s.emergency_extra_kind).length;
  const save = (patch: Record<string, unknown>, ok: string) => void act(() => apiClient.updateCatalog2VersionInfo(version.id, patch), ok);
  const toInt = (raw: string) => (raw === "" ? null : Math.round(num(raw)));
  const stepsSig = JSON.stringify(tasks.flatMap((t) => (t.steps ?? []).map((s: any) => [s.id, s.estimated_minutes, s.emergency_reduction_minutes, s.emergency_extra_kind, s.emergency_extra_value])).concat([[version.emergency_mode, version.emergency_product_reduction_percent, version.emergency_product_extra_percent]]));
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
          <div className="mb-2 flex flex-wrap items-center gap-3 text-xs" role="radiogroup" aria-label="Como a entrega emergencial é definida" data-testid="emergency-mode">
            <label className="flex items-center gap-1.5"><input type="radio" name={`emergency-mode-${version.id}`} checked={!productWide} disabled={readOnly} onChange={() => save({ emergency_mode: "step" }, "Entrega emergencial definida por etapa.")} /> Por etapa (cada etapa diz quanto encurta e quanto cobra)</label>
            <label className="flex items-center gap-1.5"><input type="radio" name={`emergency-mode-${version.id}`} checked={productWide} disabled={readOnly} onChange={() => save({ emergency_mode: "product" }, "Entrega emergencial definida para o produto inteiro.")} /> Condição do produto inteiro (um % vale para todas as etapas)</label>
          </div>
          {productWide && (
            <div className="mb-2 grid gap-2 rounded-lg border border-violet-200 bg-violet-50/60 p-2 sm:grid-cols-2 dark:border-violet-900 dark:bg-violet-950/20" data-testid="emergency-product-fields">
              <SaveField label="Redução do prazo de TODAS as etapas (%)" hint="Ex.: 30 = cada etapa leva 30% menos tempo." value={version.emergency_product_reduction_percent != null ? String(version.emergency_product_reduction_percent) : ""} readOnly={readOnly} testId="emergency-product-reduction" placeholder="ex.: 30" onSave={(raw) => save({ emergency_product_reduction_percent: toInt(raw) }, "Redução do prazo guardada.")} />
              <SaveField label="Adicional de preço em TODAS as etapas (%)" hint="Ex.: 20 = cada etapa custa 20% a mais. Vazio = sem adicional." inputMode="decimal" value={version.emergency_product_extra_percent != null ? String(version.emergency_product_extra_percent) : ""} readOnly={readOnly} testId="emergency-product-extra" placeholder="ex.: 20" onSave={(raw) => save({ emergency_product_extra_percent: raw === "" ? null : num(raw) }, "Adicional de preço guardado.")} />
            </div>
          )}
          <div className="mb-2 grid gap-2 rounded-lg border border-slate-200 p-2 sm:grid-cols-2 dark:border-slate-800" data-testid="emergency-limits">
            <SaveField label="Horário-limite no mesmo dia em que a tarefa começa" hint="Formato HH:MM (ex.: 12:00). Depois desse horário não dá para pedir no dia de início. Vazio = sem limite." inputMode="text" value={version.emergency_same_day_limit_time ?? ""} readOnly={readOnly} testId="emergency-same-day" placeholder="12:00" onSave={(raw) => save({ emergency_same_day_limit_time: raw === "" ? null : raw }, "Horário-limite guardado.")} />
            <SaveField label="Antecedência mínima antes do fim da tarefa (horas)" hint="Faltando menos que isso para o prazo final, o pedido é recusado. Vazio = sem mínimo." value={version.emergency_min_notice_hours != null ? String(version.emergency_min_notice_hours) : ""} readOnly={readOnly} testId="emergency-min-notice" placeholder="ex.: 24" onSave={(raw) => save({ emergency_min_notice_hours: toInt(raw) }, "Antecedência mínima guardada.")} />
            <label className="flex items-center gap-2 text-xs font-semibold sm:col-span-2"><input type="checkbox" data-testid="emergency-accept-required" checked={!!version.emergency_executor_accept_required} disabled={readOnly} onChange={(e) => save({ emergency_executor_accept_required: e.target.checked }, e.target.checked ? "O profissional precisará aceitar a entrega rápida." : "A entrega rápida não depende de aceite.")} /> O profissional precisa aceitar ou recusar a entrega rápida (recusou → o valor adicional é estornado)</label>
            {version.emergency_executor_accept_required && <SaveField label="Prazo para o profissional responder (horas)" value={version.emergency_executor_accept_hours != null ? String(version.emergency_executor_accept_hours) : ""} readOnly={readOnly} testId="emergency-accept-hours" placeholder="ex.: 4" onSave={(raw) => save({ emergency_executor_accept_hours: toInt(raw) }, "Prazo de resposta guardado.")} />}
          </div>
          {!productWide && <div className="grid grid-cols-[minmax(0,1.6fr)_90px_120px_100px_auto] gap-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            <span>Etapa</span><span>Horas a reduzir</span><span>Adicional</span><span>Valor</span><span />
          </div>}
          {!productWide && tasks.flatMap((t) => (t.steps ?? []).map((s: any) => <StepLine key={s.id} task={t} step={s} readOnly={readOnly} act={act} enabled={enabled} />))}
          {configured === 0 && <p className="mt-2 text-[11px] text-amber-700">{productWide ? "Informe o % de redução do prazo — sem isso a opção não aparece para o cliente e a versão não publica." : "Nenhuma etapa configurada ainda — sem isso a opção não aparece para o cliente e a versão não publica."}</p>}
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
