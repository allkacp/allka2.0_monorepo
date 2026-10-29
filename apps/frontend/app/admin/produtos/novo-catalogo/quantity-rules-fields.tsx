import { Plus, Trash2 } from "lucide-react";
import { helpFor } from "./field-help";

type Rules = { repeat_setup_per_contract?: boolean; extra_deadline_percent_per_unit?: number; discount_tiers?: { from_quantity: number; discount_percent: number }[] };
export function QuantityRulesFields({ value, onChange, disabled }: { value?: Rules | null; onChange: (v: Rules) => void; disabled?: boolean }) {
  const v = { repeat_setup_per_contract: false, extra_deadline_percent_per_unit: 0, discount_tiers: [], ...value };
  const set = (patch: Partial<Rules>) => onChange({ ...v, ...patch });
  const input = "h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-900";
  const tiers = v.discount_tiers ?? [];
  const ordered = [...tiers].sort((a, b) => a.from_quantity - b.from_quantity);
  const invalid = tiers.some((t, i) => t.from_quantity < 2 || t.discount_percent < 0 || t.discount_percent >= 100 || tiers.some((o, j) => i !== j && o.from_quantity === t.from_quantity)) || ordered.some((t, i) => i > 0 && t.discount_percent < ordered[i - 1].discount_percent);
  return <div className="space-y-2 border-t border-slate-200 pt-2 text-xs dark:border-slate-700" data-testid="quantity-rules-fields">
    <p className="font-semibold">Regras para compras em quantidade</p>
    <label className="flex items-start gap-2"><input type="checkbox" disabled={disabled} checked={v.repeat_setup_per_contract} onChange={(e) => set({ repeat_setup_per_contract: e.target.checked })} className="mt-0.5 accent-violet-600" /><span>Nova contratação inclui implantação<span className="field-info" data-help={helpFor("Nova contratação inclui implantação") ?? undefined} aria-hidden="true">i</span></span></label>
    <label className="block">Prazo adicional por unidade extra (%)<input aria-label="Prazo adicional por unidade extra (%)" type="number" min={0} max={1000} step="0.1" className={input} disabled={disabled} value={v.extra_deadline_percent_per_unit} onChange={(e) => set({ extra_deadline_percent_per_unit: Number(e.target.value) })} /></label>
    <p className="text-[10px] leading-snug text-slate-500">Vale para unidades na mesma tarefa. Tarefas separadas podem seguir em paralelo. Zero mantém o prazo; as horas de trabalho não diminuem.</p>
    <div className="flex items-center justify-between"><strong>Desconto progressivo</strong>{!disabled && <button type="button" className="inline-flex items-center gap-1 text-violet-700" onClick={() => set({ discount_tiers: [...tiers, { from_quantity: Math.max(1, ...tiers.map((t) => t.from_quantity)) + 1, discount_percent: 0 }] })}><Plus className="h-3 w-3" />Adicionar faixa</button>}</div>
    {!tiers.length && <p className="text-[10px] text-slate-500">Sem desconto por quantidade. Cadastre os percentuais aprovados.</p>}
    {tiers.map((t, i) => <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-end gap-1.5">
      <label>A partir de<input aria-label={`Quantidade mínima da faixa ${i + 1}`} type="number" min={2} max={10000} disabled={disabled} className={input} value={t.from_quantity} onChange={(e) => set({ discount_tiers: tiers.map((o, j) => i === j ? { ...o, from_quantity: Number(e.target.value) } : o) })} /></label>
      <label>Desconto (%)<input aria-label={`Desconto da faixa ${i + 1}`} type="number" min={0} max={99.99} step="0.1" disabled={disabled} className={input} value={t.discount_percent} onChange={(e) => set({ discount_tiers: tiers.map((o, j) => i === j ? { ...o, discount_percent: Number(e.target.value) } : o) })} /></label>
      {!disabled && <button type="button" aria-label={`Remover faixa ${i + 1}`} className="h-8 px-1 text-slate-500 hover:text-rose-600" onClick={() => set({ discount_tiers: tiers.filter((_, j) => j !== i) })}><Trash2 className="h-3.5 w-3.5" /></button>}
    </div>)}
    {invalid && <p role="alert" className="text-rose-600">Use quantidades diferentes, a partir de 2, e descontos crescentes de 0% a menos de 100%.</p>}
    {!!tiers.length && <p className="text-[10px] leading-snug text-slate-500">Aplica a maior faixa atingida ao total, sem somar faixas. O mesmo percentual acompanha o repasse da execução humana. O sistema bloqueia venda abaixo do custo direto.</p>}
  </div>;
}
