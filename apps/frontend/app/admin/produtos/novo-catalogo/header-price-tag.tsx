"use client";
import { useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Preço no cabeçalho do produto: o valor da venda normal (avulsa; se só vende assinatura, o mensal) e, ao passar o mouse, o detalhe de cada plano
// (mensal, bimestral, trimestral…), já com impostos, taxas e margem. Os números vêm do servidor (simulação real): a tela nunca calcula preço.
const brl = (n: number) => `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export interface PlanLine { key: string; label: string; total: number; perMonth: number | null; discount: number; months: number }
export interface PriceSummary { normal: { label: string; value: number } | null; oneTime: number | null; monthly: number | null; plans: PlanLine[] }

/** Junta a simulação (preço do servidor) com os períodos autorizados e seus descontos. Função pura. */
export function priceSummaryOf(pricing: any, periods: any[], acceptsOneTime: boolean, acceptsRecurring: boolean): PriceSummary | null {
  const cs = pricing?.split?.commercial_summary;
  if (!cs) return null;
  const oneTime = acceptsOneTime && cs.avulso != null && Number(cs.avulso) > 0 ? Number(cs.avulso) : null;
  const monthlyRaw = cs.renewal ?? cs.first_cycle_recurring_price;
  const monthly = acceptsRecurring && monthlyRaw != null && Number(monthlyRaw) > 0 ? Number(monthlyRaw) : null;
  const plans: PlanLine[] = [];
  if (monthly != null) {
    for (const p of periods ?? []) {
      if (!p?.configured || !p?.is_active) continue;
      const months = Number(p.months) || 1;
      const discount = Number(p.discount_percent ?? 0) || 0;
      const perMonth = monthly * (1 - discount / 100);
      plans.push({ key: p.period, label: p.label ?? p.period, months, discount, perMonth: months > 1 ? perMonth : null, total: perMonth * months });
    }
    if (plans.length === 0) plans.push({ key: "mensal", label: "Mensal", months: 1, discount: 0, perMonth: null, total: monthly });
  }
  const normal = oneTime != null ? { label: "Venda avulsa", value: oneTime } : monthly != null ? { label: "Assinatura mensal", value: monthly } : null;
  return normal ? { normal, oneTime, monthly, plans } : null;
}

/** Preço de venda (e planos) da versão aberta, calculado pelo servidor; refaz sozinho quando tarefas, etapas ou valor/hora mudam. */
export function usePriceSummary(version: any, productId: string): PriceSummary | null {
  const [summary, setSummary] = useState<PriceSummary | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => { const on = () => setTick((n) => n + 1); window.addEventListener("catalog2:reload-refs", on); return () => window.removeEventListener("catalog2:reload-refs", on); }, []);
  const sig = useMemo(() => JSON.stringify([(version?.tasks ?? []).map((t: any) => [t.id, t.estimated_minutes, (t.steps ?? []).map((s: any) => [s.id, s.estimated_minutes, s.specialty_id, s.executor_kind])]), version?.accepts_one_time, version?.accepts_recurring, version?.pricing_mode, version?.manual_price]), [version]);
  useEffect(() => {
    let off = false;
    if (!version?.id || version.pricing_mode === "on_request" || version.pricing_mode === "manual_fixed") { setSummary(null); return; }
    const opts: string[] = [];
    for (const va of version.variations ?? []) { const d = (va.options ?? []).find((o: any) => o.is_default) ?? (va.options ?? [])[0]; if (d) opts.push(d.key); }
    const addons = (version.addons ?? []).filter((a: any) => a.is_default_selected).map((a: any) => a.key);
    Promise.all([
      Promise.resolve(apiClient.simulateCatalog2(version.id, { variation_option_keys: opts, addon_keys: addons, quantity: 1, answers: {} })),
      Promise.resolve(apiClient.getCatalog2ProductPeriods?.(productId)).catch(() => ({ data: [] })),
    ]).then(([sim, per]: any) => { if (!off) setSummary(priceSummaryOf(sim?.pricing, per?.data ?? [], version.accepts_one_time !== false, !!version.accepts_recurring)); })
      .catch(() => { if (!off) setSummary(null); });
    return () => { off = true; };
  }, [version?.id, sig, tick, productId]); // eslint-disable-line react-hooks/exhaustive-deps

  return summary;
}

export function HeaderPriceTag({ version, productId, fallback }: { version: any; productId: string; fallback?: { text: string; hint: string } | null }) {
  const summary = usePriceSummary(version, productId);
  if (!summary) return fallback ? <span title={fallback.hint} className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-bold text-white ring-1 ring-white/25" data-testid="header-price-fallback">{fallback.text}</span> : null;
  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex cursor-help items-center gap-1.5 rounded-full bg-white/20 px-3 py-0.5 text-white ring-1 ring-white/30" data-testid="header-price">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-white/80">{summary.normal!.label}</span>
            <span className="text-sm font-extrabold">{brl(summary.normal!.value)}{summary.oneTime == null && summary.monthly != null ? <span className="text-[10px] font-semibold text-white/80">/mês</span> : null}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={8} className="w-80 space-y-2 p-3 text-xs leading-snug" data-testid="header-price-tooltip">
          <p className="text-sm font-bold">Valores de venda</p>
          <p className="text-[11px] opacity-80">Já com impostos, taxas e margem configurados.</p>
          <ul className="space-y-1">
            {summary.oneTime != null && <li className="flex justify-between gap-3"><span>Compra avulsa</span><strong>{brl(summary.oneTime)}</strong></li>}
            {summary.plans.map((p) => (
              <li key={p.key} className="flex justify-between gap-3">
                <span>{p.label}{p.months > 1 ? ` (${p.months} meses${p.discount > 0 ? `, -${String(p.discount).replace(".", ",")}%` : ""})` : " (por mês)"}</span>
                <span className="text-right"><strong>{brl(p.total)}</strong>{p.perMonth != null ? <span className="block text-[10px] opacity-80">{brl(p.perMonth)} por mês</span> : null}</span>
              </li>
            ))}
          </ul>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
