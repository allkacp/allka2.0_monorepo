// Núcleo compartilhado de checkout do catalog2 (sprint de produtos, bloco
// 6/6) — usado tanto pela compra original (POST /api/catalog2/checkout)
// quanto pelo checkout de um aditivo aprovado (POST
// /api/catalog2/change-orders/:id/checkout). Nenhuma rota chama Prisma
// diretamente para criar o vínculo comercial — sempre por aqui.
//
// Regras de ouro (iguais às do restante do catalog2):
//   • o servidor recalcula/revalida tudo — nada de preço vindo do navegador;
//   • cotação expirada ou desatualizada nunca vira pedido;
//   • snapshot do pedido é imutável — editar o produto depois não altera o
//     que já foi vendido;
//   • clique duplo / retry nunca duplica (idempotência real, via @unique).

import type { DbClient } from "./project-scope";
import { prisma } from "./prisma";
import { Catalog2Error } from "./catalog2-service";
import { revalidateQuote, type ClientContext } from "./catalog2-client";
import { gerarTarefasCatalog2DoProjeto } from "./generate-tasks-catalog2";
import type { GerarTarefasResult } from "./generate-tasks";
import { satisfyPaymentTriggersByReference } from "./task-release-service";

export class Catalog2CheckoutError extends Catalog2Error {}

/**
 * Revalida a cotação no motor oficial (mesma lógica de
 * POST /catalog2/quotes/:id/revalidate) e garante que ela ainda está
 * "valida" antes de deixar o chamador prosseguir para criar um
 * ProjectProduct. Roda com o PrismaClient global (fora de qualquer
 * transação do chamador) — o checkout só abre sua transação DEPOIS que toda
 * cotação envolvida já foi confirmada fresca.
 */
export async function revalidateAndFreezeQuote(ctx: ClientContext, quoteId: string): Promise<void> {
  const existing = await prisma.catalog2Quote.findUnique({ where: { id: quoteId } });
  if (!existing || existing.account_kind !== ctx.account_kind || existing.account_id !== ctx.account_id) {
    throw new Catalog2CheckoutError("Cotação não encontrada.", 404, "quote_not_found");
  }
  if (existing.status === "convertida") {
    throw new Catalog2CheckoutError("Esta cotação já foi convertida em pedido.", 409, "quote_already_converted");
  }
  if (existing.status === "cancelada") {
    throw new Catalog2CheckoutError("Esta cotação foi cancelada.", 409, "quote_cancelled");
  }

  const result = await revalidateQuote(ctx, quoteId);
  // revalidateQuote() retorna um shape mais enxuto (sem needs_recalc) quando
  // a quote já estava convertida/cancelada — não deveria acontecer aqui
  // (já filtrado acima), mas o cast abaixo cobre esse union sem afirmar
  // além do que o runtime garante.
  const needsRecalc = "needs_recalc" in result ? result.needs_recalc : false;
  const recalcReason = "recalc_reason" in result ? result.recalc_reason : null;
  if (needsRecalc || result.status !== "valida") {
    throw new Catalog2CheckoutError(
      `Cotação desatualizada: ${recalcReason ?? "preço ou prazo mudou"}. Gere uma nova cotação.`,
      409,
      "quote_stale",
    );
  }
}

export interface AttachQuoteParams {
  projectId: string;
  quoteId: string;
  origin: "CATALOG2" | "CATALOG2_ADDITIVE";
  changeOrderId?: string;
  pagadorSnapshot: "AGENCIA" | "CLIENTE";
}

/**
 * Cria o ProjectProduct a partir de uma Catalog2Quote já revalidada — chamar
 * SEMPRE dentro da mesma transação que cria/atualiza o Project. Idempotente:
 * a MESMA quote nunca vira duas linhas (origin_catalog2_quote_id é @unique)
 * — clique duplo/retry devolve a linha já existente em vez de duplicar.
 */
export async function attachCatalog2QuoteToProject(tx: DbClient, params: AttachQuoteParams) {
  const existing = await tx.projectProduct.findUnique({ where: { origin_catalog2_quote_id: params.quoteId } });
  if (existing) return existing;

  const quote = await tx.catalog2Quote.findUniqueOrThrow({ where: { id: params.quoteId } });
  if (quote.status !== "valida") {
    // Já pode ter sido convertida/expirada por outra transação concorrente
    // entre a revalidação (fora da tx) e aqui — nunca prossegue com uma
    // cotação que não está mais "valida" no exato momento da gravação.
    throw new Catalog2CheckoutError("Cotação não está mais válida para conversão.", 409, "quote_stale");
  }

  const product = await tx.catalog2Product.findUniqueOrThrow({
    where: { id: quote.product_id },
    include: { category: { select: { name: true } }, pillar: { select: { name: true } } },
  });

  const pp = await tx.projectProduct.create({
    data: {
      project_id: params.projectId,
      product_id: null,
      catalog2_product_id: product.id,
      catalog2_version_id: quote.version_id,
      product_name_snapshot: product.internal_name,
      product_code_snapshot: product.slug,
      product_category_snapshot: product.category?.name ?? product.pillar?.name ?? "Catálogo 2.0",
      product_price_snapshot: quote.commercial_price ?? 0,
      recurrence_snapshot: null,
      preco_final_cliente_snapshot: quote.commercial_price ?? 0,
      comissao_snapshot: 0,
      pagador_snapshot: params.pagadorSnapshot,
      origin: params.origin,
      origin_catalog2_quote_id: quote.id,
      origin_catalog2_change_order_id: params.changeOrderId ?? null,
      status: "PENDENTE",
    },
  });

  await tx.catalog2Quote.update({ where: { id: quote.id }, data: { status: "convertida" } });

  return pp;
}

export interface ConfirmAdditivePaymentParams {
  projectId: string;
  projectProductId: string;
  requesterUserId: string;
}

export interface ConfirmAdditivePaymentResult {
  payment: { id: string; status: string };
  alreadyProcessed: boolean;
  tasksResult: GerarTarefasResult | null;
}

/**
 * Confirma o pagamento simulado de UM aditivo (ProjectProduct de origem
 * CATALOG2_ADDITIVE) e materializa suas tarefas — DELIBERADAMENTE isolado do
 * motor genérico (confirm-payment.ts / gerarTarefasDoProjeto), que sempre
 * rebilha/regenera tarefas para TODOS os ProjectProduct não cancelados do
 * projeto usando o mesmo billing_cycle_key. Isso é correto para produtos
 * "mensal" (recorrência intencional), mas incorreto para um aditivo avulso
 * feito DEPOIS que o pedido original já foi pago: reutilizar aquele motor
 * aqui reprocessaria (e duplicaria) as tarefas do item ORIGINAL, que não tem
 * nada a ver com este aditivo.
 *
 * Por isso este motor tem seu próprio Payment (idempotency_key dedicado por
 * ProjectProduct) e chama gerarTarefasCatalog2DoProjeto só com este ÚNICO
 * projectProductId — nunca com "todos os produtos do projeto".
 *
 * Deve ser chamada com o Prisma Transaction Client (tx).
 */
export async function confirmCatalog2AdditivePayment(
  tx: DbClient,
  params: ConfirmAdditivePaymentParams,
): Promise<ConfirmAdditivePaymentResult> {
  const pp = await tx.projectProduct.findUniqueOrThrow({ where: { id: params.projectProductId } });
  if (pp.project_id !== params.projectId) {
    throw new Catalog2CheckoutError("Item não pertence a este projeto.", 400, "mismatched_project");
  }
  if (pp.status === "EM_EXECUCAO" || pp.status === "CONCLUIDO") {
    const existingPayment = await tx.payment.findFirst({
      where: { idempotency_key: `catalog2_additive:${pp.id}` },
    });
    return { payment: existingPayment ?? { id: "", status: "PAGO" }, alreadyProcessed: true, tasksResult: null };
  }
  if (pp.status !== "PENDENTE") {
    throw new Catalog2CheckoutError(`Item em status "${pp.status}" não pode ser pago agora.`, 409, "invalid_status");
  }

  const idempotencyKey = `catalog2_additive:${pp.id}`;
  const cycleKey = `additive:${pp.id}`;
  let payment = await tx.payment.findUnique({ where: { idempotency_key: idempotencyKey } });
  if (!payment) {
    payment = await tx.payment.create({
      data: {
        project_id: params.projectId,
        user_id: params.requesterUserId,
        amount: pp.preco_final_cliente_snapshot,
        payment_method: "CARTAO_TESTE",
        status: "PENDENTE",
        gateway: "FAKE_SANDBOX",
        idempotency_key: idempotencyKey,
        billing_cycle_key: cycleKey,
        notes: "Aditivo do Catálogo 2.0 — pagamento de teste simulado.",
      },
    });
  }
  if (payment.status === "PAGO") {
    return { payment, alreadyProcessed: true, tasksResult: null };
  }

  const existingItem = await tx.paymentItem.findFirst({ where: { payment_id: payment.id, project_product_id: pp.id } });
  if (!existingItem) {
    await tx.paymentItem.create({
      data: {
        payment_id: payment.id,
        project_product_id: pp.id,
        product_id: null,
        product_name_snapshot: pp.product_name_snapshot,
        unit_price_snapshot: pp.preco_final_cliente_snapshot,
        quantity_snapshot: 1,
        total_snapshot: pp.preco_final_cliente_snapshot,
        recurrence_snapshot: pp.recurrence_snapshot,
        billing_cycle_key: cycleKey,
      },
    });
  }

  const paidAt = new Date();
  const updateResult = await tx.payment.updateMany({
    where: { id: payment.id, status: "PENDENTE" },
    data: {
      status: "PAGO",
      paid_at: paidAt,
      fake_transaction_id: payment.fake_transaction_id ?? `FAKE_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      card_last_digits: payment.card_last_digits ?? "4242",
      card_holder: payment.card_holder ?? "Cartão de Teste",
    },
  });
  if (updateResult.count === 0) {
    // Corrida: outra transação confirmou este MESMO pagamento entre a
    // leitura acima e agora.
    const winner = await tx.payment.findUniqueOrThrow({ where: { id: payment.id } });
    return { payment: winner, alreadyProcessed: true, tasksResult: null };
  }

  await tx.projectProduct.update({ where: { id: pp.id }, data: { status: "EM_EXECUCAO", start_date: paidAt } });

  const confirmedPayment = await tx.payment.findUniqueOrThrow({ where: { id: payment.id } });
  const tasksResult = await gerarTarefasCatalog2DoProjeto(tx, params.projectId, {
    paymentId: confirmedPayment.id,
    paidAt,
    billingCycleKey: cycleKey,
    projectProductIds: [pp.id],
  });

  // Gatilho de pagamento (bloco 4/4) — "pagamento de nova etapa" real: se
  // este item veio de um Catalog2ChangeOrder (aditivo), satisfaz qualquer
  // TaskReleaseTrigger que esperava exatamente este aditivo ser pago.
  if (pp.origin_catalog2_change_order_id) {
    await satisfyPaymentTriggersByReference({ referenceType: "catalog2_change_order", referenceId: pp.origin_catalog2_change_order_id }, tx);
  }

  return { payment: confirmedPayment, alreadyProcessed: false, tasksResult };
}
