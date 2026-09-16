// Item 6 (reunião 2026-09-14, "Modalidades de contratação por período") —
// mensal/trimestral/semestral/anual, com desconto progressivo, pagamento
// antecipado e proteção de preço durante o período contratado.
//
// Regra de ouro: o cálculo de período NUNCA duplica o motor de preço — ele
// sempre chama computePricing() pra obter o preço de referência MENSAL
// (exatamente o mesmo cálculo usado pra uma cotação avulsa) e só aplica,
// por cima, a multiplicação por meses × desconto configurado. Sem
// configuração admin explícita para aquele produto+período, o período NUNCA
// fica disponível — nenhum percentual padrão, nenhum desconto global.

import { prisma } from "./prisma";
import { computePricing, type PricingResult, type PricingSelection } from "./catalog2-pricing";

export const CATALOG2_PERIODS = ["mensal", "trimestral", "semestral", "anual"] as const;
export type Catalog2Period = (typeof CATALOG2_PERIODS)[number];

export const CATALOG2_PERIOD_MONTHS: Record<Catalog2Period, number> = {
  mensal: 1,
  trimestral: 3,
  semestral: 6,
  anual: 12,
};

export const CATALOG2_PERIOD_LABEL: Record<Catalog2Period, string> = {
  mensal: "Mensal",
  trimestral: "Trimestral",
  semestral: "Semestral",
  anual: "Anual",
};

export function isCatalog2Period(v: unknown): v is Catalog2Period {
  return typeof v === "string" && (CATALOG2_PERIODS as readonly string[]).includes(v);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface PeriodPricingResult {
  period: Catalog2Period;
  months: number;
  /** Configurado + ativo NO ADMIN + preço base calculável. Só quando true a
   * modalidade pode ser cotada/comprada. */
  available: boolean;
  discount_percent: number;
  /** Preço de referência MENSAL (saída bruta do computePricing — o mesmo
   * motor da cotação avulsa), antes do desconto de período. */
  reference_monthly_price: number | null;
  /** Total a pagar ANTECIPADAMENTE = reference_monthly_price × months ×
   * (1 - discount_percent/100). */
  total_price: number | null;
  /** total_price / months — "valor mensal equivalente", só COMPARATIVO
   * (nunca é o que é cobrado por ciclo — o pagamento é único, antecipado). */
  monthly_equivalent_price: number | null;
  commercial_deadline_days: number | null;
  currency: string;
  commercial_ready: boolean;
  quote_blockers: string[];
  base: PricingResult;
}

async function loadPeriodConfig(productId: string, period: Catalog2Period) {
  return prisma.catalog2ProductPeriod.findUnique({
    where: { product_id_period: { product_id: productId, period } },
  });
}

/** Item 6.1: só "mensal" marca um produto como tendo entrega recorrente
 * REAL — é o único valor que habilita a fórmula "preço × meses" (períodos)
 * e o registro de ciclos de entrega. Qualquer outro valor (incl. nulo —
 * "ainda não definido") mantém a contratação por período bloqueada. */
export function hasRecurringMonthlyDelivery(product: { delivery_recurrence: string | null }): boolean {
  return product.delivery_recurrence === "mensal";
}

/** Calcula o preço de UM período pra uma seleção — sempre a partir do
 * MESMO computePricing usado pra avulso; nunca um cálculo paralelo.
 * `product` precisa trazer `delivery_recurrence` (Item 6.1) — sem ele
 * marcado "mensal", o período nunca fica disponível, mesmo com desconto
 * configurado (a formula preço×meses só vale pra entrega recorrente real). */
export async function computePeriodPricing(
  versionId: string,
  sel: PricingSelection,
  product: { id: string; delivery_recurrence: string | null },
  period: Catalog2Period,
): Promise<PeriodPricingResult> {
  const base = await computePricing(versionId, sel);
  const months = CATALOG2_PERIOD_MONTHS[period];
  const cfg = await loadPeriodConfig(product.id, period);
  const configured = !!cfg && cfg.is_active;
  const recurring = hasRecurringMonthlyDelivery(product);

  if (!base.commercial_ready) {
    return {
      period, months, available: false, discount_percent: cfg?.discount_percent ?? 0,
      reference_monthly_price: base.lines.commercial_final_price.amount, total_price: null, monthly_equivalent_price: null,
      commercial_deadline_days: base.deadline.commercial_deadline_days, currency: base.currency,
      commercial_ready: false, quote_blockers: base.quote_blockers, base,
    };
  }
  if (!recurring) {
    // Item 6.1: bloqueado mesmo que o admin já tenha configurado um
    // desconto — a definição de recorrência vem primeiro, nunca é inferida
    // pela presença do desconto.
    return {
      period, months, available: false, discount_percent: cfg?.discount_percent ?? 0,
      reference_monthly_price: base.lines.commercial_final_price.amount, total_price: null, monthly_equivalent_price: null,
      commercial_deadline_days: base.deadline.commercial_deadline_days, currency: base.currency,
      commercial_ready: false,
      quote_blockers: [...base.quote_blockers, "frequência de entrega recorrente ainda não foi definida para este produto — pendência administrativa"],
      base,
    };
  }
  if (!configured) {
    return {
      period, months, available: false, discount_percent: 0,
      reference_monthly_price: base.lines.commercial_final_price.amount, total_price: null, monthly_equivalent_price: null,
      commercial_deadline_days: base.deadline.commercial_deadline_days, currency: base.currency,
      commercial_ready: false,
      quote_blockers: [...base.quote_blockers, `período "${CATALOG2_PERIOD_LABEL[period]}" não está configurado para este produto`],
      base,
    };
  }

  const referenceMonthly = base.lines.commercial_final_price.amount as number;
  const total = round2(referenceMonthly * months * (1 - cfg!.discount_percent / 100));
  return {
    period, months, available: true, discount_percent: cfg!.discount_percent,
    reference_monthly_price: referenceMonthly, total_price: total, monthly_equivalent_price: round2(total / months),
    commercial_deadline_days: base.deadline.commercial_deadline_days, currency: base.currency,
    commercial_ready: true, quote_blockers: [], base,
  };
}

/** Todos os períodos CONFIGURADOS + ATIVOS pra este produto, com preço
 * calculado pra seleção dada — usado no detalhe/carrinho do cliente pra
 * listar as modalidades realmente oferecidas (nunca as 4 fixas). Vazio
 * quando o produto não tem entrega recorrente definida (Item 6.1), mesmo
 * que existam descontos configurados. */
export async function listAvailablePeriods(
  versionId: string,
  sel: PricingSelection,
  product: { id: string; delivery_recurrence: string | null },
): Promise<PeriodPricingResult[]> {
  if (!hasRecurringMonthlyDelivery(product)) return [];
  const cfgs = await prisma.catalog2ProductPeriod.findMany({ where: { product_id: product.id, is_active: true } });
  const out: PeriodPricingResult[] = [];
  for (const cfg of cfgs) {
    if (!isCatalog2Period(cfg.period)) continue;
    out.push(await computePeriodPricing(versionId, sel, product, cfg.period));
  }
  return out.sort((a, b) => CATALOG2_PERIODS.indexOf(a.period) - CATALOG2_PERIODS.indexOf(b.period));
}

/** Visão administrativa dos 4 períodos possíveis — SEMPRE os 4, com
 * `configured:false` pros que não têm linha em Catalog2ProductPeriod (ou
 * estão desativados). Nunca infere/preenche percentual. */
export async function listPeriodsForAdmin(productId: string) {
  const rows = await prisma.catalog2ProductPeriod.findMany({ where: { product_id: productId } });
  const byPeriod = new Map(rows.map((r) => [r.period, r]));
  return CATALOG2_PERIODS.map((period) => {
    const row = byPeriod.get(period);
    return {
      period,
      label: CATALOG2_PERIOD_LABEL[period],
      months: CATALOG2_PERIOD_MONTHS[period],
      configured: !!row,
      is_active: row?.is_active ?? false,
      discount_percent: row?.discount_percent ?? null,
      updated_at: row?.updated_at ?? null,
    };
  });
}
