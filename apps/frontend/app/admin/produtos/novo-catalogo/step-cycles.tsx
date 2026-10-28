"use client";
import { CalendarRange, Plus, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// ETAPA EM CICLOS (23/10): etapa que dura vários períodos seguidos (ex.: gestão semanal durante 30 dias).
// O cadastro LISTA cada ciclo, com o período dele (dias contados do início da etapa) e as regras dele.
// Regras fixas, combinadas com o usuário:
//  • cada ciclo termina com uma entrega (ex.: relatório) que o cliente aprova em um prazo curto;
//  • o ciclo seguinte começa na data certa, COM OU SEM aprovação — ninguém volta ao passado;
//  • se o cliente reprova, o comentário vira orientação para o ciclo seguinte; o ciclo anterior NÃO reabre;
//  • a etapa só fecha ao fim do último ciclo.
// A configuração fica em ops.cycles.items da etapa.

export interface CycleItem { from_day: number; to_day: number; approval_window_days: number; hours?: number; rule?: string }
export interface StepCyclesCfg { items: CycleItem[] }

export const CYCLE_PRESETS: { label: string; days: number }[] = [
  { label: "Semanal", days: 7 },
  { label: "Quinzenal", days: 15 },
  { label: "Mensal", days: 30 },
];

/** Gera a lista de ciclos: períodos iguais até cobrir o total (o último pode ser mais curto, ex.: 29–30). */
export function generateCycles(periodDays: number, totalDays: number, approvalDays = 2): CycleItem[] {
  const out: CycleItem[] = [];
  if (!(periodDays >= 1) || !(totalDays >= periodDays)) return out;
  for (let from = 1; from <= totalDays && out.length < 60; from += periodDays) out.push({ from_day: from, to_day: Math.min(from + periodDays - 1, totalDays), approval_window_days: approvalDays });
  return out;
}
export const DEFAULT_CYCLES: StepCyclesCfg = { items: generateCycles(7, 30, 2) };

/** Mensagem do primeiro problema encontrado (ou null se a lista está certa). */
export function cyclesProblem(c: Partial<StepCyclesCfg> | null | undefined): string | null {
  const items = c?.items;
  if (!Array.isArray(items) || items.length === 0) return "Adicione ao menos um ciclo.";
  let prevTo = 0;
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const n = i + 1;
    if (!Number.isInteger(it.from_day) || it.from_day < 1) return `Ciclo ${n}: o primeiro dia precisa ser 1 ou mais.`;
    if (!Number.isInteger(it.to_day) || it.to_day < it.from_day) return `Ciclo ${n}: o último dia não pode ser antes do primeiro.`;
    if (it.from_day <= prevTo) return `Ciclo ${n}: começa no dia ${it.from_day}, mas o ciclo anterior vai até o dia ${prevTo}. Os ciclos não podem se sobrepor.`;
    if (!Number.isInteger(it.approval_window_days) || it.approval_window_days < 1 || it.approval_window_days > 30) return `Ciclo ${n}: o prazo de aprovação precisa ser de 1 a 30 dias úteis.`;
    prevTo = it.to_day;
  }
  return null;
}
export const cyclesValid = (c: Partial<StepCyclesCfg> | null | undefined): boolean => cyclesProblem(c) === null;

export const cyclesSummary = (c: Partial<StepCyclesCfg> | null | undefined): string => {
  if (!c || !cyclesValid(c)) return "";
  const items = c.items as CycleItem[];
  const last = items[items.length - 1].to_day;
  const aws = Array.from(new Set(items.map((i) => i.approval_window_days)));
  const prazo = aws.length === 1 ? `o cliente tem ${aws[0]} dia(s) útil(eis) para aprovar cada ciclo` : `prazo de aprovação de ${Math.min(...aws)} a ${Math.max(...aws)} dia(s) útil(eis) por ciclo`;
  return `${items.length} ${items.length === 1 ? "ciclo" : "ciclos"} em ${last} dias · ${prazo}`;
};

const INP = "h-9 w-20 rounded-lg border border-slate-300 bg-white px-2 text-right text-sm font-semibold text-slate-900 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100";
const LAB = "mb-1 block text-[11px] font-semibold text-slate-600 dark:text-slate-300";

export function StepCyclesSection({ ops, setOps, readOnly }: { ops: any; setOps: (p: Record<string, unknown>) => void; readOnly: boolean }) {
  const cyc: StepCyclesCfg | null = ops?.cycles?.items ? ops.cycles : null;
  const on = !!cyc;
  const items: CycleItem[] = cyc?.items ?? [];
  const problem = on ? cyclesProblem(cyc) : null;
  const write = (next: CycleItem[]) => setOps({ cycles: { items: next } });
  const patchItem = (i: number, p: Partial<CycleItem>) => write(items.map((it, k) => (k === i ? { ...it, ...p } : it)));
  const num = (v: string) => (v === "" ? 0 : Number(v));
  const addCycle = () => {
    const last = items[items.length - 1];
    const len = items[0] ? items[0].to_day - items[0].from_day + 1 : 7; // mesmo tamanho do 1º ciclo (o último pode ser mais curto)
    const from = last ? last.to_day + 1 : 1;
    write([...items, { from_day: from, to_day: from + len - 1, approval_window_days: last?.approval_window_days ?? 2 }]);
  };
  return (
    <div className="mt-2 space-y-2 rounded-lg border border-violet-200 bg-violet-50/50 p-2.5 dark:border-violet-900 dark:bg-violet-950/20" data-testid="step-cycles">
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-0.5 h-4 w-4" disabled={readOnly} checked={on} onChange={(e) => setOps({ cycles: e.target.checked ? { items: generateCycles(7, 30, 2) } : undefined })} data-testid="step-cycles-toggle" />
        <span><strong>Esta etapa é em ciclos</strong> — ela dura vários períodos seguidos (ex.: gestão semanal durante 30 dias) e cada ciclo termina com uma entrega aprovada pelo cliente<span className="field-info" data-help="Use quando o trabalho se repete por períodos dentro da mesma etapa, como a gestão semanal de campanhas. Cada ciclo tem seu período (dias contados do início da etapa), seu prazo de aprovação e, se quiser, sua regra própria." aria-hidden="true">i</span></span>
      </label>
      {on && (
        <>
          {!readOnly && (
            <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-dashed border-violet-300 bg-white/70 px-2 py-1.5 text-[11px] text-slate-600 dark:border-violet-800 dark:bg-slate-900/40 dark:text-slate-300" data-testid="step-cycles-generate">
              <Sparkles className="h-3.5 w-3.5 text-violet-600" aria-hidden="true" />
              <span className="font-semibold">Montar a lista automaticamente (30 dias):</span>
              {CYCLE_PRESETS.map((p) => (
                <button key={p.days} type="button" onClick={() => write(generateCycles(p.days, 30, items[0]?.approval_window_days ?? 2))} className="h-7 rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-violet-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">{p.label}</button>
              ))}
              <span className="text-slate-500">— depois ajuste cada ciclo abaixo.</span>
            </div>
          )}
          <ol className="space-y-2" data-testid="step-cycles-list">
            {items.map((it, i) => (
              <li key={i} className="rounded-xl border border-violet-200 bg-white p-2.5 dark:border-violet-900 dark:bg-slate-900" data-testid="step-cycle-row">
                <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
                  <span className="section-number-badge mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" aria-hidden="true">{i + 1}</span>
                  <label className="block"><span className={LAB}>Do dia</span><input type="number" min={1} step={1} className={INP} aria-label={`Ciclo ${i + 1}: primeiro dia`} disabled={readOnly} value={it.from_day || ""} onChange={(e) => patchItem(i, { from_day: num(e.target.value) })} /></label>
                  <label className="block"><span className={LAB}>Até o dia</span><input type="number" min={1} step={1} className={INP} aria-label={`Ciclo ${i + 1}: último dia`} disabled={readOnly} value={it.to_day || ""} onChange={(e) => patchItem(i, { to_day: num(e.target.value) })} /></label>
                  <label className="block"><span className={LAB}>Cliente aprova em (dias úteis)</span><input type="number" min={1} max={30} step={1} className={INP} aria-label={`Ciclo ${i + 1}: prazo de aprovação (dias úteis)`} disabled={readOnly} value={it.approval_window_days || ""} onChange={(e) => patchItem(i, { approval_window_days: num(e.target.value) })} /></label>
                  <label className="block"><span className={LAB}>Horas do ciclo (opcional)</span><input type="number" min={0} step={0.5} className={INP} aria-label={`Ciclo ${i + 1}: horas`} disabled={readOnly} value={it.hours ?? ""} onChange={(e) => patchItem(i, { hours: e.target.value === "" ? undefined : Number(e.target.value) })} /></label>
                  {!readOnly && items.length > 1 && <button type="button" aria-label={`Remover o ciclo ${i + 1}`} title="Remover este ciclo" className="mb-0.5 ml-auto rounded-md bg-rose-100 p-2 text-rose-600 transition hover:bg-rose-200" onClick={() => write(items.filter((_, k) => k !== i))}><Trash2 className="h-4 w-4" /></button>}
                </div>
                <label className="mt-2 block"><span className={LAB}>Regra ou orientação deste ciclo (opcional)</span><input type="text" maxLength={500} className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-sm dark:border-slate-600 dark:bg-slate-900" aria-label={`Ciclo ${i + 1}: regra`} placeholder="Ex.: relatório da 1ª semana com métricas de alcance e custo" disabled={readOnly} value={it.rule ?? ""} onChange={(e) => patchItem(i, { rule: e.target.value })} /></label>
              </li>
            ))}
          </ol>
          {!readOnly && <Button type="button" size="sm" variant="outline" className="border-violet-200 bg-white text-violet-700 hover:bg-violet-50" onClick={addCycle} data-testid="step-cycle-add"><Plus className="mr-1 h-4 w-4" />Adicionar ciclo</Button>}
          {problem && <p role="alert" className="text-[11px] font-semibold text-red-600" data-testid="step-cycles-error">{problem}</p>}
          {!problem && items.length > 0 && (
            <div data-testid="step-cycles-preview">
              <p className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-violet-700 dark:text-violet-300"><CalendarRange className="h-3.5 w-3.5" aria-hidden="true" />{items.length} {items.length === 1 ? "ciclo" : "ciclos"} · dias contados a partir do início da etapa</p>
              <div className="flex flex-wrap gap-1.5">
                {items.map((r, i) => <span key={i} className="rounded-lg border border-violet-200 bg-white px-2 py-1 text-[11px] text-slate-700 dark:border-violet-900 dark:bg-slate-900 dark:text-slate-200"><strong className="text-violet-700 dark:text-violet-300">Ciclo {i + 1}</strong> · dia {r.from_day === r.to_day ? r.from_day : `${r.from_day} a ${r.to_day}`}</span>)}
              </div>
            </div>
          )}
          <ul className="space-y-0.5 rounded-md border border-violet-200 bg-white px-3 py-2 text-[11px] text-slate-700 dark:border-violet-900 dark:bg-slate-900 dark:text-slate-200" data-testid="step-cycles-rules">
            <li>• Ao fim de cada ciclo, a entrega vai ao cliente, que tem o prazo daquele ciclo para aprovar.</li>
            <li>• O ciclo seguinte <strong>começa na data certa, com ou sem aprovação</strong> — não dá para voltar ao passado.</li>
            <li>• Se o cliente reprovar, o comentário dele <strong>vai para o ciclo seguinte</strong>; o ciclo anterior não reabre.</li>
            <li>• A etapa só fecha ao fim do último ciclo.</li>
          </ul>
        </>
      )}
    </div>
  );
}
