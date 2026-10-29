import { z } from "zod";
import type { PricingResult, PricingSelection } from "./catalog2-pricing";

// Ausente = comportamento anterior. Percentuais são SEMPRE cadastrados pelo admin.
export const quantityRulesSchema = z.object({
  repeat_setup_per_contract: z.boolean().default(false),
  extra_deadline_percent_per_unit: z.number().finite().min(0).max(1000).default(0),
  discount_tiers: z.array(z.object({
    from_quantity: z.number().int().min(2).max(10000),
    discount_percent: z.number().finite().min(0).lt(100),
  }).strict()).max(20).default([]),
}).strict().superRefine((r, ctx) => {
  const tiers = [...r.discount_tiers].sort((a, b) => a.from_quantity - b.from_quantity);
  for (let i = 1; i < tiers.length; i++) {
    if (tiers[i].from_quantity === tiers[i - 1].from_quantity || tiers[i].discount_percent < tiers[i - 1].discount_percent)
      ctx.addIssue({ code: "custom", message: "Faixas precisam de quantidades diferentes e descontos crescentes.", path: ["discount_tiers", i] });
  }
});
export type QuantityRules = z.infer<typeof quantityRulesSchema>;
export function quantityRules(raw: unknown): QuantityRules {
  let value = raw;
  try { if (typeof raw === "string") value = JSON.parse(raw); } catch { value = null; }
  const result = quantityRulesSchema.safeParse(value ?? {});
  return result.success ? result.data : quantityRulesSchema.parse({});
}
export const roundMoney = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export function executionStepsForCycle<T extends { key: string; is_conditional?: boolean; first_execution_only?: boolean; step_model?: { first_execution_only?: boolean } | null }>(steps: T[], taskKey: string, activeRefs: Set<string> | null, previouslyExecuted: boolean): T[] {
  return steps.filter((s) => (!s.is_conditional || !!activeRefs?.has(`${taskKey}:${s.key}`)) && (!previouslyExecuted || !(s.first_execution_only || s.step_model?.first_execution_only)));
}
export function volumeSelection(rules: QuantityRules, selection: PricingSelection) {
  const quantity = Math.max(1, Math.floor(selection.quantity ?? 1));
  const groups = selection.delivery_groups;
  const valid = groups?.length && groups.every((n) => Number.isInteger(n) && n > 0) && groups.reduce((a, b) => a + b, 0) === quantity;
  const largestGroup = valid ? Math.max(...groups!) : quantity;
  const tier = [...rules.discount_tiers].sort((a, b) => b.from_quantity - a.from_quantity).find((t) => quantity >= t.from_quantity);
  return { quantity, largestGroup, discountPercent: tier?.discount_percent ?? 0, deadlineMultiplier: 1 + (largestGroup - 1) * rules.extra_deadline_percent_per_unit / 100 };
}

/** Desconto comercial explícito, sem falsificar horas, tokens, custos ou impostos-base. */
export function applyQuantityRules(result: PricingResult, raw: unknown, selection: PricingSelection): PricingResult {
  const rules = quantityRules(raw), v = volumeSelection(rules, selection);
  const before = result.lines.commercial_final_price.amount;
  const factor = 1 - v.discountPercent / 100;
  if (v.discountPercent > 0) {
    // Split tem referências compartilhadas; visitar cada objeto uma vez evita desconto duplo.
    const seen = new WeakSet<object>();
    const scale = (node: any) => {
      if (!node || typeof node !== "object" || seen.has(node)) return;
      seen.add(node);
      for (const [key, value] of Object.entries(node)) {
        if (typeof value === "number" && ["price", "avulso_total", "first_charge", "renewal", "implementation_price", "first_cycle_recurring_price", "avulso", "renewal_if_dispensed", "savings_per_cycle"].includes(key)) node[key] = roundMoney(value * factor);
        else if (key === "first_charge_parts" && value) for (const k of Object.keys(value)) (value as any)[k] = roundMoney((value as any)[k] * factor);
        else if (key !== "taxes_and_margins") scale(value);
      }
    };
    scale(result.split);
    if (before != null) {
      const after = roundMoney(before * factor);
      result.lines.commercial_final_price = { ...result.lines.commercial_final_price, amount: after };
      result.lines.final_price = result.lines.commercial_final_price;
      result.lines.taxes_and_margins.push({ label: `Desconto por quantidade (${v.discountPercent}%)`, amount: roundMoney(after - before), detail: "Desconto comercial; custos-base não são reduzidos neste demonstrativo." });
      if (after < (result.lines.minimum_price.amount ?? 0)) {
        const message = "O desconto por quantidade deixa o preço abaixo do custo direto. Reduza o desconto antes de contratar.";
        result.selection_issues.push({ code: "quantity_discount_below_cost", message, ref: "quantity" });
        result.quote_blockers.push(message);
        result.commercial_ready = false;
      }
    }
    result.simulation.total = roundMoney(result.simulation.total * factor);
  }
  const base = result.deadline.commercial_deadline_days;
  const extra = base == null ? 0 : Math.ceil(base * (v.deadlineMultiplier - 1) - 1e-9);
  if (base != null && extra > 0) {
    result.deadline.commercial_deadline_days = base + extra;
    result.deadline.detail += ` Quantidade: +${extra} dia(s) para o maior lote (${v.largestGroup} unidades).`;
    result.estimated_deadline_days = base + extra;
    result.deadline_detail = result.deadline.detail;
  }
  result.volume = { quantity: v.quantity, largest_group: v.largestGroup, discount_percent: v.discountPercent, discount_amount: before == null ? null : roundMoney(before * (1 - factor)), price_before_discount: before, deadline_extra_days: extra };
  return result;
}

/** Privado do servidor: referência de execução congelada quando a cotação nasce. */
export function executionSnapshot(pricing: PricingResult, rules: unknown) {
  const steps = pricing.human_cost_breakdown.filter((b) => b.task_key.includes(":")).map((b) => ({ ref: b.task_key, minutes: b.minutes, rate: b.rate, cost: b.cost, extras: [] as { minutes: number; cost: number; scope: string; start: number; end: number | null }[] }));
  const used = new Map<string, number>();
  for (const effort of pricing.effort_breakdown.filter((e) => e.mode === "add" && e.human_cost != null)) {
    const label = `esforço:${effort.from}`;
    const index = used.get(label) ?? 0; used.set(label, index + 1);
    const schedule = pricing.split.schedule.items.filter((s) => s.label === label)[index];
    if (!schedule) continue;
    const targets = steps.filter((s) => effort.step ? s.ref === `${effort.task}:${effort.step}` : s.ref.startsWith(`${effort.task}:`) && (s.cost ?? 0) > 0);
    const weight = targets.reduce((n, s) => n + (effort.step ? 1 : s.cost ?? 0), 0);
    for (const s of targets) {
      const share = weight > 0 ? (effort.step ? 1 : s.cost ?? 0) / weight : 0;
      s.extras.push({ minutes: effort.minutes * share, cost: (effort.human_cost ?? 0) * share, scope: schedule.scope, start: schedule.start, end: schedule.end });
    }
  }
  return JSON.stringify({ version: 1, discount_percent: pricing.volume?.discount_percent ?? 0,
    extra_deadline_percent_per_unit: quantityRules(rules).extra_deadline_percent_per_unit,
    steps });
}

export type ExecutionReference = { discount_percent?: number; extra_deadline_percent_per_unit?: number; steps?: { ref: string; minutes: number; rate: number | null; cost: number | null; extras?: { minutes: number; cost: number; scope: string; start: number; end: number | null }[] }[] };
export function stageExecutionBudget(snapshot: ExecutionReference | null, ref: string, groupQuantity: number, totalQuantity: number, cycle: number, fallbackMinutes: number | null, stepPercent?: number) {
  const line = snapshot?.steps?.find((s) => s.ref === ref);
  const extras = (line?.extras ?? []).filter((e) => (e.scope !== "implementation" && e.scope !== "first_cycle" && e.scope !== "one_time" || cycle === 0) && cycle >= e.start && (e.end == null || cycle <= e.end));
  const groupShare = groupQuantity / Math.max(1, totalQuantity);
  const extraMinutes = extras.reduce((s, e) => s + e.minutes, 0) * groupShare;
  const extraCost = extras.reduce((s, e) => s + e.cost, 0) * groupShare;
  const minutes = line?.minutes ?? fallbackMinutes;
  const effortMinutes = minutes == null ? null : minutes * groupQuantity + extraMinutes;
  const factor = 1 + (groupQuantity - 1) * (stepPercent ?? snapshot?.extra_deadline_percent_per_unit ?? 0) / 100;
  return { rate: line?.rate ?? null, effortMinutes, hours: effortMinutes == null ? null : effortMinutes / groupQuantity * factor / 60,
    amount: line?.cost == null ? null : roundMoney((line.cost * groupQuantity + extraCost) * (1 - (snapshot?.discount_percent ?? 0) / 100)) };
}
