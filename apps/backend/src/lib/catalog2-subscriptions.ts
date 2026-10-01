// Assinatura mensal contínua (Pedido 3, fase 4): uma fatura por mês, com estado visível.
//
//   ativa ──(faltam 5 dias)──▶ aguardando_renovacao ──(paga)──▶ ativa
//                                   └─(venceu + 3 dias)──▶ inadimplente ──(paga)──▶ ativa
//   ativa|aguardando|inadimplente ──(cancelar)──▶ cancelada ──(fim do período pago)──▶ encerrada
//   ativa ──(pausar)──▶ pausada ──(retomar)──▶ ativa
//
// Tarefas do mês só nascem quando a fatura do mês é PAGA (mesma regra da recorrência já existente).
import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";
import { getPaymentGateway } from "./payment-gateway";
import { getNextSequenceValue, formatInvoiceNumber } from "./sequence";
import { materializeSubscriptionCycle } from "./generate-tasks-catalog2";
import { Catalog2Error } from "./catalog2-service";
import { cycleAmount } from "./catalog2-pricing";
import {
  DAY_MS, SUBSCRIPTION_STATUS_LABEL, addMonthsUtc, logSubscriptionEvent, nextInvoiceDate, type SubscriptionStatus,
} from "./catalog2-subscription-core";

type Tx = Prisma.TransactionClient;
export class SubscriptionError extends Catalog2Error {}

async function loadSub(db: PrismaClient | Tx, id: string) {
  const sub = await db.catalog2Subscription.findUnique({ where: { id } });
  if (!sub) throw new SubscriptionError("Assinatura não encontrada.", 404, "subscription_not_found");
  return sub;
}

async function setStatus(db: PrismaClient | Tx, sub: { id: string; status: string }, to: SubscriptionStatus, reason: string, actor: string | null, extra: Prisma.Catalog2SubscriptionUpdateInput = {}) {
  await db.catalog2Subscription.update({ where: { id: sub.id }, data: { status: to, status_reason: reason, ...extra } });
  if (sub.status !== to) await logSubscriptionEvent(db, sub.id, sub.status, to, reason, actor);
}

/** Emite a fatura (pendente) do próximo ciclo. Idempotente: nunca duas faturas para o mesmo ciclo. */
export async function issueNextInvoice(id: string, actor: string | null = null) {
  return prisma.$transaction(async (tx) => {
    const sub = await loadSub(tx, id);
    if (!["ativa", "aguardando_renovacao", "inadimplente"].includes(sub.status)) return { issued: false as const, reason: `status ${sub.status}` };
    const n = sub.current_cycle_index + 1;
    const key = `subscription:${sub.id}:${n}`;
    const existing = await tx.payment.findUnique({ where: { idempotency_key: key } });
    if (existing) return { issued: false as const, reason: "já emitida", payment_id: existing.id };
    const project = await tx.project.findUniqueOrThrow({ where: { id: sub.project_id }, select: { company_id: true, client_id: true } });
    const pp = await tx.projectProduct.findUniqueOrThrow({ where: { id: sub.project_product_id } });
    // Valor do ciclo n: só a mensalidade recorrente (nunca a implantação, que foi cobrada na 1ª cobrança).
    const amount = amountForSubscriptionCycle(sub, n);
    const payment = await tx.payment.create({
      data: {
        project_id: sub.project_id, amount, payment_method: "RECORRENCIA_AUTOMATICA", status: "PENDENTE", gateway: "FAKE_SANDBOX",
        idempotency_key: key, billing_cycle_key: `sub:${sub.id}:${n}`, notes: `Assinatura — mês ${n + 1}`,
      },
    });
    await tx.paymentItem.create({
      data: {
        payment_id: payment.id, project_product_id: pp.id, product_id: null, product_name_snapshot: pp.product_name_snapshot ?? "",
        unit_price_snapshot: amount, quantity_snapshot: 1, total_snapshot: amount, recurrence_snapshot: pp.recurrence_snapshot, billing_cycle_key: `sub:${sub.id}:${n}`,
      },
    });
    await tx.invoice.create({
      data: {
        payment_id: payment.id, project_id: sub.project_id, company_id: project.company_id ?? project.client_id, amount, status: "pending",
        due_date: sub.current_period_end, invoice_number: formatInvoiceNumber(await getNextSequenceValue(tx, "invoice_number")),
        description: `Assinatura mensal — ${pp.product_name_snapshot ?? "produto"} (mês ${n + 1})`,
      },
    });
    await setStatus(tx, sub, "aguardando_renovacao", `Fatura do mês ${n + 1} emitida; vence em ${sub.current_period_end.toISOString().slice(0, 10)}.`, actor, { pending_payment_id: payment.id, next_invoice_at: null });
    return { issued: true as const, payment_id: payment.id, cycle: n };
  });
}

/** Cobra a fatura aberta (gateway de teste). Aprovada: paga, libera as tarefas do mês e renova o período. */
export async function payOpenInvoice(id: string, opts: { cardLastDigits?: string; actor?: string | null } = {}) {
  const sub0 = await loadSub(prisma, id);
  if (!sub0.pending_payment_id) throw new SubscriptionError("Não há fatura aberta para esta assinatura.", 409, "no_open_invoice");
  const payment0 = await prisma.payment.findUniqueOrThrow({ where: { id: sub0.pending_payment_id } });
  const charge = await getPaymentGateway().charge({ amount: payment0.amount, cardLastDigits: opts.cardLastDigits, referenceId: `${payment0.id}`, description: `Assinatura ${sub0.id}` });
  return prisma.$transaction(async (tx) => {
    const sub = await loadSub(tx, id);
    if (sub.pending_payment_id !== payment0.id) return { paid: false as const, reason: "a fatura já foi tratada" };
    if (!charge.approved) {
      await tx.catalog2Subscription.update({ where: { id: sub.id }, data: { status_reason: `Cobrança recusada: ${charge.declineReason ?? "sem motivo informado"}` } });
      await logSubscriptionEvent(tx, sub.id, sub.status, sub.status, `Cobrança recusada: ${charge.declineReason ?? "sem motivo informado"}`, opts.actor);
      return { paid: false as const, reason: charge.declineReason ?? "recusada" };
    }
    const now = new Date();
    const n = sub.current_cycle_index + 1;
    const payment = await tx.payment.update({
      where: { id: payment0.id },
      data: { status: "PAGO", paid_at: now, fake_transaction_id: charge.transactionId, card_last_digits: opts.cardLastDigits ?? "4242", gateway: charge.gateway },
    });
    await tx.invoice.updateMany({ where: { payment_id: payment.id }, data: { status: "paid", paid_at: now } });
    // o período novo começa onde o anterior terminou (sem "comer" nem "dar" dias); se ficou muito atrasado, recomeça hoje
    const start = sub.current_period_end.getTime() + 31 * DAY_MS < now.getTime() ? now : sub.current_period_end;
    const end = addMonthsUtc(start, 1);
    await materializeSubscriptionCycle(tx, sub.project_product_id, { paymentId: payment.id, paidAt: now, billingCycleKey: `sub:${sub.id}:${n}`, occurrenceIndex: n });
    await setStatus(tx, sub, "ativa", `Mês ${n + 1} pago.`, opts.actor ?? null, {
      current_cycle_index: n, current_period_start: start, current_period_end: end, next_invoice_at: nextInvoiceDate(end, sub.invoice_lead_days), pending_payment_id: null,
    });
    return { paid: true as const, cycle: n, period_end: end };
  });
}

async function cancelOpenInvoice(tx: Tx, paymentId: string | null) {
  if (!paymentId) return;
  await tx.payment.updateMany({ where: { id: paymentId, status: "PENDENTE" }, data: { status: "CANCELADO" } });
  await tx.invoice.updateMany({ where: { payment_id: paymentId, status: { in: ["pending", "overdue"] } }, data: { status: "cancelled" } });
}

export async function pauseSubscription(id: string, actor: string | null, reason?: string) {
  return prisma.$transaction(async (tx) => {
    const sub = await loadSub(tx, id);
    if (sub.status !== "ativa") throw new SubscriptionError(`Só uma assinatura ativa pode ser pausada (está: ${SUBSCRIPTION_STATUS_LABEL[sub.status as SubscriptionStatus] ?? sub.status}).`, 409, "invalid_transition");
    const remaining = Math.max(0, sub.current_period_end.getTime() - Date.now());
    await setStatus(tx, sub, "pausada", reason?.trim() || "Pausada a pedido.", actor, { paused_at: new Date(), paused_remaining_ms: BigInt(remaining), next_invoice_at: null });
    return loadSub(tx, id);
  });
}

export async function resumeSubscription(id: string, actor: string | null) {
  return prisma.$transaction(async (tx) => {
    const sub = await loadSub(tx, id);
    if (sub.status !== "pausada") throw new SubscriptionError("Só uma assinatura pausada pode ser retomada.", 409, "invalid_transition");
    const now = new Date();
    const end = new Date(now.getTime() + Number(sub.paused_remaining_ms ?? 0));
    await setStatus(tx, sub, "ativa", "Retomada.", actor, { paused_at: null, paused_remaining_ms: null, current_period_start: now, current_period_end: end, next_invoice_at: nextInvoiceDate(end, sub.invoice_lead_days) });
    return loadSub(tx, id);
  });
}

/** Cancela: para de cobrar; o mês já pago continua valendo até o fim e só então a assinatura encerra. */
export async function cancelSubscription(id: string, actor: string | null, reason?: string) {
  return prisma.$transaction(async (tx) => {
    const sub = await loadSub(tx, id);
    if (["cancelada", "encerrada"].includes(sub.status)) throw new SubscriptionError("Esta assinatura já foi cancelada.", 409, "invalid_transition");
    await cancelOpenInvoice(tx, sub.pending_payment_id);
    const now = new Date();
    const paidThroughEnd = sub.status === "ativa" || sub.status === "pausada" || sub.status === "aguardando_renovacao";
    const stillPaid = paidThroughEnd && (sub.status === "pausada" || sub.current_period_end > now);
    if (stillPaid) {
      await setStatus(tx, sub, "cancelada", reason?.trim() || "Cancelamento solicitado.", actor, { cancel_requested_at: now, next_invoice_at: null, pending_payment_id: null });
    } else {
      await setStatus(tx, sub, "encerrada", reason?.trim() || "Cancelada sem período pago em aberto.", actor, { cancel_requested_at: now, ended_at: now, next_invoice_at: null, pending_payment_id: null });
    }
    return loadSub(tx, id);
  });
}

/** Rotina periódica: emite faturas, marca inadimplentes e encerra o que foi cancelado. */
export async function runSubscriptionsTick(now = new Date()) {
  const out = { invoiced: 0, overdue: 0, ended: 0 };
  const due = await prisma.catalog2Subscription.findMany({ where: { status: "ativa", next_invoice_at: { lte: now } }, select: { id: true }, take: 200 });
  for (const s of due) {
    const r = await issueNextInvoice(s.id).catch((e) => { console.error("[subscriptions] emitir fatura", s.id, e); return null; });
    if (r?.issued) out.invoiced += 1;
  }
  const lateCandidates = await prisma.catalog2Subscription.findMany({ where: { status: "aguardando_renovacao", current_period_end: { lt: now } }, take: 500 });
  const late = lateCandidates.filter((s) => s.current_period_end.getTime() < now.getTime() - s.grace_days * DAY_MS); // tolerância de CADA assinatura
  for (const s of late) {
    await prisma.$transaction(async (tx) => {
      await setStatus(tx, s, "inadimplente", "Fatura vencida e não paga.", null);
      if (s.pending_payment_id) await tx.invoice.updateMany({ where: { payment_id: s.pending_payment_id, status: "pending" }, data: { status: "overdue" } });
    });
    out.overdue += 1;
  }
  const finishing = await prisma.catalog2Subscription.findMany({ where: { status: "cancelada", current_period_end: { lte: now } }, take: 200 });
  for (const s of finishing) {
    await prisma.$transaction((tx) => setStatus(tx, s, "encerrada", "Fim do período pago após o cancelamento.", null, { ended_at: now }));
    out.ended += 1;
  }
  return out;
}

let running = false;
export async function runSubscriptionsTickGuarded(): Promise<void> {
  if (running) return;
  running = true;
  try { await runSubscriptionsTick(); } catch (err) { console.error("[subscriptions] erro no ciclo", err); } finally { running = false; }
}

/** Mensalidade do ciclo n (n ≥ 1): usa o cronograma congelado na contratação; sem ele, o valor recorrente congelado. */
export function amountForSubscriptionCycle(sub: { monthly_amount: number; renewal_components_json: string | null }, n: number): number {
  if (!sub.renewal_components_json) return sub.monthly_amount;
  try {
    const c = JSON.parse(sub.renewal_components_json) as { schedule: Parameters<typeof cycleAmount>[0]; discount_percent?: number };
    return cycleAmount(c.schedule, n, c.discount_percent ?? 0);
  } catch { return sub.monthly_amount; }
}

export function serializeSubscription(s: Awaited<ReturnType<typeof loadSub>>, events?: { from_status: string | null; to_status: string; reason: string | null; created_at: Date }[]) {
  return {
    id: s.id,
    project_product_id: s.project_product_id,
    project_id: s.project_id,
    status: s.status,
    status_label: SUBSCRIPTION_STATUS_LABEL[s.status as SubscriptionStatus] ?? s.status,
    status_reason: s.status_reason,
    monthly_amount: s.monthly_amount,
    implementation_amount: s.implementation_amount,
    implementation_charged_at: s.implementation_charged_at,
    implementation_reason: s.implementation_reason,
    first_charge: s.first_charge_json ? JSON.parse(s.first_charge_json) : null,
    next_renewal_amount: amountForSubscriptionCycle(s, s.current_cycle_index + 1),
    started_at: s.started_at,
    months_paid: s.current_cycle_index + 1,
    current_period_start: s.current_period_start,
    current_period_end: s.current_period_end,
    next_invoice_at: s.next_invoice_at,
    has_open_invoice: !!s.pending_payment_id,
    cancel_requested_at: s.cancel_requested_at,
    ended_at: s.ended_at,
    ...(events ? { history: events } : {}),
  };
}
