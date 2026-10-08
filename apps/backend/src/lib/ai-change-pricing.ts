// P-11 (reunião 07/10): precificação das ALTERAÇÕES feitas por IA com base na MÉDIA REAL de tokens/custo registrada em AIUsageLog.
// Não existe preço exato por token por servidor/variação, então se usa a média (ou o percentil 90, mais conservador) do que já foi gasto,
// convertida para reais e acrescida de margem; opcionalmente com N alterações grátis e preço mínimo.
import { prisma } from "./prisma";

export const BASES = ["average", "p90"] as const;
export type Basis = (typeof BASES)[number];
export interface ChangePricingSettings { usd_brl_rate: number; margin_percent: number; free_changes: number; min_price_brl: number; basis: Basis; features: string[] | null }
export const DEFAULT_SETTINGS: ChangePricingSettings = { usd_brl_rate: 5.5, margin_percent: 100, free_changes: 1, min_price_brl: 0, basis: "average", features: null };

export interface FeatureAverage { feature: string; calls: number; avg_prompt_tokens: number; avg_completion_tokens: number; avg_total_tokens: number; avg_cost_usd: number; p90_cost_usd: number }

const round = (n: number, d = 6) => Math.round(n * 10 ** d) / 10 ** d;

export async function loadChangePricingSettings(): Promise<ChangePricingSettings> {
  const row = await prisma.aiChangePricingSettings.upsert({ where: { id: "default" }, update: {}, create: { id: "default" } });
  const features = row.features ? row.features.split(",").map((f) => f.trim()).filter(Boolean) : null;
  return { usd_brl_rate: row.usd_brl_rate, margin_percent: row.margin_percent, free_changes: row.free_changes, min_price_brl: row.min_price_brl, basis: (BASES as readonly string[]).includes(row.basis) ? (row.basis as Basis) : "average", features: features && features.length ? features : null };
}

export function validateSettings(s: Partial<ChangePricingSettings>): string | null {
  if (s.usd_brl_rate !== undefined && !(s.usd_brl_rate > 0 && s.usd_brl_rate <= 100)) return "A cotação do dólar precisa ser maior que zero.";
  if (s.margin_percent !== undefined && !(s.margin_percent >= 0 && s.margin_percent <= 1000)) return "A margem deve ficar entre 0% e 1000%.";
  if (s.free_changes !== undefined && !(Number.isInteger(s.free_changes) && s.free_changes >= 0 && s.free_changes <= 100)) return "As alterações grátis devem ser um número inteiro entre 0 e 100.";
  if (s.min_price_brl !== undefined && !(s.min_price_brl >= 0 && s.min_price_brl <= 100000)) return "O preço mínimo é inválido.";
  if (s.basis !== undefined && !(BASES as readonly string[]).includes(s.basis)) return "Base de cálculo inválida (use média ou percentil 90).";
  return null;
}

/** Média por funcionalidade a partir dos registros reais (só chamadas cobradas por token). */
export function averagesFrom(logs: { feature: string; prompt_tokens: number; completion_tokens: number; total_tokens: number; estimated_cost_usd: number }[]): FeatureAverage[] {
  const by = new Map<string, typeof logs>();
  for (const l of logs) { const a = by.get(l.feature) ?? []; a.push(l); by.set(l.feature, a); }
  return [...by.entries()].map(([feature, rows]) => {
    const n = rows.length;
    const costs = rows.map((r) => r.estimated_cost_usd).sort((a, b) => a - b);
    const sum = (k: "prompt_tokens" | "completion_tokens" | "total_tokens") => rows.reduce((t, r) => t + r[k], 0);
    return { feature, calls: n, avg_prompt_tokens: Math.round(sum("prompt_tokens") / n), avg_completion_tokens: Math.round(sum("completion_tokens") / n), avg_total_tokens: Math.round(sum("total_tokens") / n), avg_cost_usd: round(costs.reduce((t, c) => t + c, 0) / n), p90_cost_usd: round(costs[Math.min(n - 1, Math.ceil(n * 0.9) - 1)]) };
  }).sort((a, b) => b.calls - a.calls);
}

/** Custo médio ponderado pelas chamadas das funcionalidades consideradas "alteração". */
export function pooledCost(avgs: FeatureAverage[], features: string[] | null, basis: Basis): number {
  const use = features ? avgs.filter((a) => features.includes(a.feature)) : avgs;
  const calls = use.reduce((t, a) => t + a.calls, 0);
  if (calls === 0) return 0;
  return use.reduce((t, a) => t + (basis === "p90" ? a.p90_cost_usd : a.avg_cost_usd) * a.calls, 0) / calls;
}

/** Preço de UMA alteração, em reais: custo × dólar × (1 + margem), nunca abaixo do mínimo, arredondado para cima em R$ 0,10. */
export function priceForChange(costUsd: number, s: ChangePricingSettings): number {
  const raw = costUsd * s.usd_brl_rate * (1 + s.margin_percent / 100);
  const withMin = Math.max(raw, s.min_price_brl);
  return withMin <= 0 ? 0 : Math.ceil(withMin * 10 - 1e-9) / 10;
}

export async function computeChangePricing(days = 90) {
  const settings = await loadChangePricingSettings();
  const since = new Date(Date.now() - days * 86400000);
  const logs = await prisma.aIUsageLog.findMany({ where: { created_at: { gte: since }, units: 0 }, select: { feature: true, prompt_tokens: true, completion_tokens: true, total_tokens: true, estimated_cost_usd: true }, take: 50000 });
  const averages = averagesFrom(logs);
  const cost = pooledCost(averages, settings.features, settings.basis);
  const price = priceForChange(cost, settings);
  return { days, settings, averages, sample_calls: logs.length, pooled_cost_usd: round(cost), pooled_cost_brl: round(cost * settings.usd_brl_rate, 4), price_per_change_brl: price, enough_data: logs.length >= 20 };
}
