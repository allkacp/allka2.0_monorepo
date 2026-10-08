"use client";

// P-11 (reunião 07/10): preço das alterações feitas por IA, calculado pela MÉDIA real de tokens/custo registrada. Fica em Configurações > Uso e Custos de IA.
import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const brl = (v?: number | null) => (v == null ? "—" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(v));
const usd = (v?: number | null) => (v == null ? "—" : `US$ ${v.toFixed(5)}`);

export function AiChangePricingPanel() {
  const [data, setData] = useState<any>(null);
  const [form, setForm] = useState({ usd_brl_rate: "5.5", margin_percent: "100", free_changes: "1", min_price_brl: "0", basis: "average" });
  const [features, setFeatures] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const apply = (r: any) => {
    setData(r);
    setForm({ usd_brl_rate: String(r.settings.usd_brl_rate), margin_percent: String(r.settings.margin_percent), free_changes: String(r.settings.free_changes), min_price_brl: String(r.settings.min_price_brl), basis: r.settings.basis });
    setFeatures(r.settings.features);
  };
  const load = useCallback(() => { apiClient.getAiChangePricing().then(apply).catch((e: any) => setMsg({ ok: false, text: e?.message ?? "Não foi possível carregar." })); }, []);
  useEffect(() => { load(); }, [load]);

  async function save() {
    setBusy(true); setMsg(null);
    try {
      const r = await apiClient.saveAiChangePricing({ usd_brl_rate: Number(form.usd_brl_rate), margin_percent: Number(form.margin_percent), free_changes: Number(form.free_changes), min_price_brl: Number(form.min_price_brl), basis: form.basis, features: features ?? [] });
      apply(r); setMsg({ ok: true, text: "Regras de preço das alterações salvas." });
    } catch (e: any) { setMsg({ ok: false, text: e?.message ?? "Não foi possível salvar." }); }
    finally { setBusy(false); }
  }
  const toggle = (f: string, on: boolean) => { const all = (data?.averages ?? []).map((a: any) => a.feature); const cur = features ?? all; const next = on ? [...cur, f] : cur.filter((x: string) => x !== f); setFeatures(next.length === all.length ? null : next); };

  if (!data) return <div className="flex items-center gap-2 p-3 text-xs text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Carregando preço das alterações…</div>;
  const all: string[] = data.averages.map((a: any) => a.feature);
  const F = "h-8 text-xs";
  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900" data-testid="ai-change-pricing">
      <div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Preço das alterações feitas por IA</h3>
        <p className="text-xs text-slate-500">Não dá para saber o custo exato de cada pedido (varia com o tamanho do texto e com o servidor). Por isso o preço usa a <strong>média real</strong> do que já foi gasto, convertida para reais, mais uma margem.</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-5 text-xs">
        <label className="font-semibold">Dólar (R$)<Input aria-label="Cotação do dólar" type="number" step="0.01" min="0" className={F} value={form.usd_brl_rate} onChange={(e) => setForm({ ...form, usd_brl_rate: e.target.value })} /></label>
        <label className="font-semibold">Margem (%)<Input aria-label="Margem" type="number" min="0" className={F} value={form.margin_percent} onChange={(e) => setForm({ ...form, margin_percent: e.target.value })} /></label>
        <label className="font-semibold">Alterações grátis<Input aria-label="Alterações grátis" type="number" min="0" step="1" className={F} value={form.free_changes} onChange={(e) => setForm({ ...form, free_changes: e.target.value })} /></label>
        <label className="font-semibold">Preço mínimo (R$)<Input aria-label="Preço mínimo" type="number" min="0" step="0.1" className={F} value={form.min_price_brl} onChange={(e) => setForm({ ...form, min_price_brl: e.target.value })} /></label>
        <label className="font-semibold">Base do cálculo<select aria-label="Base do cálculo" className="h-8 w-full rounded-md border border-slate-300 bg-white px-1 text-xs dark:border-slate-700 dark:bg-slate-900" value={form.basis} onChange={(e) => setForm({ ...form, basis: e.target.value })}><option value="average">Média</option><option value="p90">Percentil 90 (mais seguro)</option></select></label>
      </div>
      <div>
        <p className="mb-1 text-xs font-semibold">Quais usos contam como “alteração”</p>
        {all.length === 0 ? <p className="text-xs text-slate-400">Ainda não há chamadas de IA registradas.</p> : (
          <div className="flex flex-wrap gap-x-4 gap-y-1">{data.averages.map((a: any) => <label key={a.feature} className="flex items-center gap-1.5 text-xs"><input type="checkbox" aria-label={`Contar ${a.feature}`} checked={features ? features.includes(a.feature) : true} onChange={(e) => toggle(a.feature, e.target.checked)} />{a.feature}</label>)}</div>
        )}
      </div>
      {data.averages.length > 0 && (
        <table className="w-full text-left text-xs" data-testid="averages-table">
          <thead><tr className="text-[10px] uppercase tracking-wide text-slate-500"><th>Uso</th><th className="text-right">Chamadas</th><th className="text-right">Tokens (média)</th><th className="text-right">Custo médio</th><th className="text-right">Custo p90</th></tr></thead>
          <tbody>{data.averages.map((a: any) => <tr key={a.feature} className="border-t border-slate-100 dark:border-slate-800"><td className="py-1">{a.feature}</td><td className="text-right">{a.calls}</td><td className="text-right">{a.avg_total_tokens}</td><td className="text-right">{usd(a.avg_cost_usd)}</td><td className="text-right">{usd(a.p90_cost_usd)}</td></tr>)}</tbody>
        </table>
      )}
      <div className="flex flex-wrap items-center gap-3 rounded-lg bg-violet-50 px-3 py-2 text-xs dark:bg-violet-950/30" data-testid="price-result">
        <span>Custo médio por alteração: <strong>{usd(data.pooled_cost_usd)}</strong> ({brl(data.pooled_cost_brl)})</span>
        <span className="text-sm">Preço por alteração: <strong className="text-violet-800 dark:text-violet-200">{brl(data.price_per_change_brl)}</strong></span>
        <span>{Number(form.free_changes) > 0 ? `${form.free_changes} alteração(ões) grátis por entrega` : "sem alterações grátis"}</span>
        {!data.enough_data && <span className="font-semibold text-amber-700">Poucos dados ({data.sample_calls} chamadas nos últimos {data.days} dias): o preço ainda é uma estimativa fraca.</span>}
      </div>
      <div className="flex items-center gap-3">
        <Button type="button" size="sm" disabled={busy} onClick={() => void save()}>{busy ? "Salvando…" : "Salvar regras"}</Button>
        {msg && <span role={msg.ok ? "status" : "alert"} className={`text-xs font-semibold ${msg.ok ? "text-emerald-700" : "text-red-600"}`}>{msg.text}</span>}
      </div>
    </section>
  );
}
