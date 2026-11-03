"use client";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";

// PERÍODOS da assinatura (25/10): quando a Assinatura está ligada, o admin AUTORIZA os períodos que o cliente poderá escolher
// (mensal, bimestral, trimestral, semestral, anual) e define o DESCONTO de cada um. Pagar um período antecipado não muda o ritmo das tarefas:
// elas continuam abrindo todo mês, na data de aniversário do pagamento. O desconto é sobre (preço mensal × meses).
// Layout compacto (faixa de largura total): um cartãozinho por período, lado a lado. Cada período salva na hora
// (mesma rota de sempre: /products/:id/periods/:period).

export interface PeriodRow { period: string; label: string; months: number; configured: boolean; is_active: boolean; discount_percent: number | null; sale_open?: boolean }

// 31/10: o mesmo editor mostra os períodos em três lugares (esta faixa, o painel "Modalidades por período" e a etiqueta de preço
// do cabeçalho), cada um com a própria leitura. Quem grava avisa; quem mostra recarrega — sem isso, salvar 5% no painel deixava
// "− 2%" aqui até o F5.
export const PERIODS_CHANGED_EVENT = "catalog2:periods-changed";
export function notifyPeriodsChanged(productId: string) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(PERIODS_CHANGED_EVENT, { detail: { productId } }));
}
export function usePeriodsChanged(productId: string, onChange: () => void) {
  useEffect(() => {
    const on = (e: Event) => { if ((e as CustomEvent<{ productId?: string }>).detail?.productId === productId) onChange(); };
    window.addEventListener(PERIODS_CHANGED_EVENT, on);
    return () => window.removeEventListener(PERIODS_CHANGED_EVENT, on);
  }, [productId, onChange]);
}

export function periodDiscountHint(months: number, discount: number): string {
  if (!(discount > 0)) return months === 1 ? "preço normal" : "sem desconto";
  return months === 1 ? `${discount}% a menos na mensalidade` : `${discount}% a menos por mês (${months} meses pagos de uma vez)`;
}

const brl = (n: number) => `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Item 7 (31/10): conta do período EXPLÍCITA — base, percentual e total. Mesma regra do servidor (catalog2-periods.ts): o desconto
 * vale também no Mensal e incide só sobre a parte recorrente (implantação e cobranças únicas não têm desconto). Valores do servidor
 * mandam; isto é só a explicação para quem cadastra.
 */
export function periodMath(months: number, discount: number, monthly: number | null): { base: number; total: number; perMonth: number; saved: number } | null {
  if (monthly == null || !(monthly > 0)) return null;
  const d = Number.isFinite(discount) && discount > 0 ? discount : 0;
  const base = round2(monthly * months);
  const total = round2(monthly * months * (1 - d / 100));
  return { base, total, perMonth: round2(total / months), saved: round2(base - total) };
}

/** Texto do ⓘ de cada período: mostra o valor final quando o preço mensal já existe; senão avisa que dá para cadastrar a % mesmo assim. */
export function periodPriceHelp(label: string, months: number, discount: number, monthly: number | null): string {
  const intro = months === 1 ? "Período de 1 mês. " : `Período de ${months} meses pagos de uma vez. `;
  return intro + periodPriceDetail(label, months, discount, monthly);
}
function periodPriceDetail(label: string, months: number, discount: number, monthly: number | null): string {
  const m = periodMath(months, discount, monthly);
  if (!m) return "Ainda não temos o valor final do produto, mas você já pode cadastrar a porcentagem. Quando o preço estiver definido, o valor deste período aparece aqui.";
  const only = " O desconto vale só sobre a mensalidade (implantação e cobranças únicas não têm desconto).";
  if (months === 1) return discount > 0
    ? `Mensal: ${brl(m.base)} por mês sem desconto; com ${discount}%: ${brl(m.total)} por mês (o cliente economiza ${brl(m.saved)} por mês).${only}`
    : `Mensal: ${brl(m.base)} por mês (preço normal, sem desconto de período).`;
  return `${label}: ${brl(m.total)} pagos de uma vez (${brl(m.perMonth)} por mês). Sem desconto seriam ${brl(m.base)}${discount > 0 ? ` — o cliente economiza ${brl(m.saved)}` : ""}.${discount > 0 ? only : ""}`;
}
/** Linha visível "base − % = total" do período autorizado. */
export function periodMathLine(months: number, discount: number, monthly: number | null): string | null {
  const m = periodMath(months, discount, monthly);
  if (!m) return null;
  const unit = months === 1 ? "/mês" : ` (${months} meses)`;
  return discount > 0 ? `${brl(m.base)}${unit} − ${discount}% = ${brl(m.total)}${unit}` : `${brl(m.base)}${unit}, sem desconto`;
}

export function ProductPeriodsInline({ productId, versionId, readOnly = false }: { productId: string; versionId?: string; readOnly?: boolean }) {
  const [monthly, setMonthly] = useState<number | null>(null);
  useEffect(() => {
    if (!versionId) return;
    let off = false;
    Promise.resolve(apiClient.simulateCatalog2?.(versionId, { variation_option_keys: [], addon_keys: [], quantity: 1, answers: {} }))
      .then((r: any) => { const cs = r?.pricing?.split?.commercial_summary; const v = cs?.renewal ?? cs?.first_cycle_recurring_price; if (!off) setMonthly(v != null && Number(v) > 0 ? Number(v) : null); })
      .catch(() => { if (!off) setMonthly(null); });
    return () => { off = true; };
  }, [versionId]);
  const [rows, setRows] = useState<PeriodRow[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(() => {
    apiClient.getCatalog2ProductPeriods(productId).then((r: any) => setRows(r.data ?? [])).catch(() => setRows([]));
  }, [productId]);
  useEffect(() => { load(); }, [load]);
  usePeriodsChanged(productId, load);

  if (!rows) return null;
  const draftOf = (r: PeriodRow) => drafts[r.period] ?? (r.discount_percent != null ? String(r.discount_percent) : "");

  async function save(r: PeriodRow, active: boolean, discountText: string) {
    const discount = discountText === "" ? 0 : Number(discountText.replace(",", "."));
    if (!Number.isFinite(discount) || discount < 0 || discount > 90) { setMsg({ ok: false, text: "O desconto precisa ficar entre 0 e 90%." }); return; }
    setBusy(r.period); setMsg(null);
    try {
      await apiClient.updateCatalog2ProductPeriod(productId, r.period, { discount_percent: discount, is_active: active });
      setMsg({ ok: true, text: active ? `${r.label} autorizado${discount ? ` com ${discount}% de desconto` : ""}.` : `${r.label} desligado.` });
      setDrafts((d) => { const n = { ...d }; delete n[r.period]; return n; });
      notifyPeriodsChanged(productId);
    } catch (e: any) { setMsg({ ok: false, text: e?.message ?? "Não foi possível salvar o período." }); }
    finally { setBusy(null); }
  }

  const authorized = rows.filter((r) => r.configured && r.is_active);
  return (
    <div className="space-y-2 rounded-xl border border-violet-200 bg-white p-2.5 dark:border-violet-900 dark:bg-slate-900" data-testid="product-periods-inline">
      <p className="flex flex-wrap items-center gap-x-2 text-[13px] font-bold text-slate-900 dark:text-slate-100">
        <span data-no-info="">Períodos que o cliente pode escolher<span className="field-info" data-help="Marque os períodos autorizados e informe o desconto de cada um. No Mensal, um desconto reduz a mensalidade (todas as cobranças mensais). Nos outros, o cliente paga vários meses de uma vez e ganha o desconto que você definir (sobre o preço mensal × os meses). O desconto vale só sobre a mensalidade: implantação e cobranças únicas não têm desconto. A entrega continua mês a mês: as tarefas abrem todo mês, na data de aniversário do pagamento." aria-hidden="true">i</span></span>
        <span className="text-[11px] font-normal text-slate-500">marque e informe o desconto — salva na hora</span>
      </p>
      <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((r) => {
          const on = r.configured && r.is_active;
          const draft = draftOf(r);
          return (
            <li key={r.period} title={on ? periodDiscountHint(r.months, Number(draft.replace(",", ".") || 0)) : undefined} className={`flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border px-2.5 py-1.5 ${on ? "border-violet-300 bg-violet-50/60 dark:border-violet-700 dark:bg-violet-950/20" : "border-slate-200 dark:border-slate-700"}`} data-testid={`period-row-${r.period}`}>
              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 whitespace-nowrap text-sm font-semibold text-slate-800 dark:text-slate-100">
                <input type="checkbox" aria-label={`Autorizar o período ${r.label}`} disabled={readOnly || busy === r.period} checked={on} onChange={(e) => void save(r, e.target.checked, draft)} />
                <span className="min-w-0" data-no-info="">{r.label}<span className="field-info" data-help={periodPriceHelp(r.label, r.months, Number(draft.replace(",", ".")) || 0, monthly)} aria-hidden="true">i</span></span>
              </label>
              <span className="flex shrink-0 items-center gap-1 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300">desc.
                <input type="text" inputMode="decimal" autoComplete="off" aria-label={`Desconto do período ${r.label} (%)`} disabled={readOnly || !on || busy === r.period} value={draft} placeholder="0"
                  onChange={(e) => setDrafts((d) => ({ ...d, [r.period]: e.target.value.replace(/[^0-9.,]/g, "") }))} onBlur={() => { if (on && draft !== String(r.discount_percent ?? "")) void save(r, true, draft); }}
                  onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                  className="h-7 w-14 rounded-md border border-slate-300 bg-white px-2 text-right text-sm font-semibold disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900" />%
              </span>
              <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                {busy === r.period ? <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-600" aria-hidden="true" /> : on && r.sale_open !== false ? <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-label="Disponível para o cliente" /> : null}
              </span>
              {on && (() => { const line = periodMathLine(r.months, Number(draft.replace(",", ".")) || 0, monthly); return line ? <span className="w-full text-[11px] font-semibold text-violet-800 dark:text-violet-200" data-testid={`period-math-${r.period}`}>{line}</span> : null; })()}
              {on && r.sale_open === false && <span className="w-fit rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800" data-testid={`period-sale-closed-${r.period}`} title="Autorizado no cadastro, mas a venda deste período ainda não está liberada na plataforma.">venda ainda não liberada</span>}
            </li>
          );
        })}
      </ul>
      {authorized.length === 0 && <p className="text-[11px] font-semibold text-amber-700" data-testid="period-none">Nenhum período autorizado: o cliente não consegue assinar. Autorize ao menos o Mensal.</p>}
      {msg && <p role="status" className={`text-[11px] font-semibold ${msg.ok ? "text-emerald-700" : "text-red-600"}`}>{msg.text}</p>}
    </div>
  );
}
