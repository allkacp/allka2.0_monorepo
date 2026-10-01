// Assinatura mensal contínua (Pedido 3, fase 4) — parte que a geração de tarefas precisa conhecer.
// A cobrança/estado ficam em catalog2-subscriptions.ts (que depende do gerador de tarefas).
import type { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

export const SUBSCRIPTION_STATUSES = ["ativa", "pausada", "cancelada", "encerrada", "aguardando_renovacao", "inadimplente"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];
export const SUBSCRIPTION_STATUS_LABEL: Record<SubscriptionStatus, string> = {
  ativa: "Ativa",
  pausada: "Pausada",
  cancelada: "Cancelada (vale até o fim do período pago)",
  encerrada: "Encerrada",
  aguardando_renovacao: "Aguardando renovação",
  inadimplente: "Inadimplente",
};

/** Quantos dias ANTES do fim do período pago a fatura do mês seguinte é emitida. */
export const INVOICE_LEAD_DAYS = 5;
/** Dias de tolerância depois do vencimento antes de marcar a assinatura como inadimplente. */
export const OVERDUE_GRACE_DAYS = 3;
export const DAY_MS = 24 * 60 * 60 * 1000;

export async function logSubscriptionEvent(db: Db, subscriptionId: string, fromStatus: string | null, toStatus: string, reason: string | null, actorUserId?: string | null) {
  await db.catalog2SubscriptionEvent.create({ data: { subscription_id: subscriptionId, from_status: fromStatus, to_status: toStatus, reason, actor_user_id: actorUserId ?? null } });
}

/** Soma meses de calendário em UTC, capando o dia no último dia do mês de destino (31/01 + 1 = 28/02). */
export function addMonthsUtc(d: Date, months: number): Date {
  const total = d.getUTCFullYear() * 12 + d.getUTCMonth() + months;
  const year = Math.floor(total / 12);
  const month = total % 12;
  const day = Math.min(d.getUTCDate(), new Date(Date.UTC(year, month + 1, 0)).getUTCDate());
  const r = new Date(d.getTime());
  r.setUTCFullYear(year, month, day);
  return r;
}

export function nextInvoiceDate(periodEnd: Date, leadDays: number = INVOICE_LEAD_DAYS): Date {
  return new Date(periodEnd.getTime() - leadDays * DAY_MS);
}

/** Aviso e tolerância vigentes AGORA (configuráveis pela administração). Cada assinatura guarda a fotografia na criação. */
export async function currentSubscriptionTerms(db: Db): Promise<{ invoice_lead_days: number; grace_days: number }> {
  const s = await db.catalog2PricingSettings.findUnique({ where: { id: "default" }, select: { subscription_invoice_lead_days: true, subscription_grace_days: true } });
  return { invoice_lead_days: s?.subscription_invoice_lead_days ?? INVOICE_LEAD_DAYS, grace_days: s?.subscription_grace_days ?? OVERDUE_GRACE_DAYS };
}

/** Só o período MENSAL de um produto de entrega recorrente mensal vira assinatura contínua. */
export function isSubscriptionContract(pp: { catalog2_period: string | null; catalog2_period_months: number | null; catalog2_product?: { delivery_recurrence: string | null } | null }): boolean {
  return pp.catalog2_period === "mensal" && (pp.catalog2_period_months ?? 1) === 1 && pp.catalog2_product?.delivery_recurrence === "mensal";
}

/** Cria (uma única vez) a assinatura de um contrato mensal, no pagamento do 1º ciclo. Idempotente. */
export async function ensureSubscription(
  db: Db,
  pp: { id: string; project_id: string; origin_catalog2_quote_id?: string | null; implementation_price_snapshot?: number | null; recurring_price_snapshot?: number | null; preco_final_cliente_snapshot: number | null; catalog2_period: string | null; catalog2_period_months: number | null; catalog2_product?: { delivery_recurrence: string | null } | null },
  paidAt: Date,
  companyId: string | null,
) {
  if (!isSubscriptionContract(pp)) return null;
  const existing = await db.catalog2Subscription.findUnique({ where: { project_product_id: pp.id } });
  if (existing) return existing;
  const end = addMonthsUtc(paidAt, 1);
  const terms = await currentSubscriptionTerms(db);
  // Composição vinda da cotação: implantação cobrada SÓ na primeira cobrança; a mensalidade é o valor recorrente congelado.
  const quote = pp.origin_catalog2_quote_id ? await db.catalog2Quote.findUnique({ where: { id: pp.origin_catalog2_quote_id }, select: { pricing_components_json: true, implementation_price: true, recurring_price: true, first_charge_price: true } }) : null;
  const comps = quote?.pricing_components_json ? (JSON.parse(quote.pricing_components_json) as { schedule?: unknown; first_charge_parts?: unknown; implementation?: { reason?: string; applicable?: boolean }; discount_percent?: number }) : null;
  const implAmount = pp.implementation_price_snapshot ?? quote?.implementation_price ?? 0;
  const recurring = pp.recurring_price_snapshot ?? quote?.recurring_price ?? pp.preco_final_cliente_snapshot ?? 0;
  const sub = await db.catalog2Subscription.create({
    data: {
      project_product_id: pp.id,
      project_id: pp.project_id,
      company_id: companyId,
      status: "ativa",
      period_months: 1,
      monthly_amount: recurring,
      implementation_amount: implAmount,
      implementation_charged_at: implAmount > 0 ? paidAt : null,
      implementation_reason: comps?.implementation?.reason ?? null,
      first_charge_json: JSON.stringify({ total: pp.preco_final_cliente_snapshot ?? quote?.first_charge_price ?? null, parts: comps?.first_charge_parts ?? null, implementation: implAmount }),
      renewal_components_json: comps?.schedule ? JSON.stringify({ schedule: comps.schedule, discount_percent: comps.discount_percent ?? 0 }) : null,
      started_at: paidAt,
      current_cycle_index: 0,
      current_period_start: paidAt,
      current_period_end: end,
      next_invoice_at: nextInvoiceDate(end, terms.invoice_lead_days),
      invoice_lead_days: terms.invoice_lead_days,
      grace_days: terms.grace_days,
    },
  });
  await logSubscriptionEvent(db, sub.id, null, "ativa", "Assinatura criada no pagamento do primeiro mês.");
  return sub;
}
