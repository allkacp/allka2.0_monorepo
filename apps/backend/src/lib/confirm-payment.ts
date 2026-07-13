import type { Payment, Project } from "@prisma/client";
import type { DbClient } from "./project-scope";
import { projectVisibleToUser } from "./project-scope";
import { recalculateProjectValue } from "./project-value";
import { gerarTarefasDoProjeto, type GerarTarefasResult } from "./generate-tasks";

export class PaymentValidationError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "PaymentValidationError";
    this.statusCode = statusCode;
  }
}

export interface ConfirmPaymentParams {
  projectId: string;
  requesterUser: { id: string; account_type?: string; role?: string };
  // Se enviado, confirma EXATAMENTE este Payment — precisa existir, pertencer
  // ao projeto e estar PENDENTE (ou já PAGO, tratado como repetição
  // idempotente). Se omitido, localiza uma tentativa PENDENTE/PAGO
  // compatível com projeto+ciclo, ou cria uma nova.
  paymentId?: string;
  billingCycleKey?: string;
  paymentMethod?: string;
  cardLastDigits?: string;
  cardHolder?: string;
  notes?: string;
}

export interface ConfirmPaymentResult {
  payment: Payment;
  project: Project;
  alreadyProcessed: boolean;
  tasksResult: GerarTarefasResult | null;
}

const NON_REUSABLE_PAYMENT_STATUSES = ["CANCELADO", "FALHOU"];

function resolveCycleKey(lifecycle: string, provided?: string): string {
  if (provided) return provided;
  if (lifecycle === "mensal") {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }
  return "avulso";
}

/**
 * Serviço central e transacional: Pagamento confirmado -> Tarefas -> Etapas.
 *
 * Reaproveita um Payment PENDENTE existente em vez de criar um PAGO
 * duplicado ao lado dele (a versão anterior desta fase deixava o PENDENTE
 * abandonado — corrigido aqui: o MESMO registro sempre transiciona
 * PENDENTE -> PAGO). Único ponto de entrada permitido para
 * gerarTarefasDoProjeto — ver src/routes/payments.ts (fake-checkout) e
 * src/routes/projects.ts (reprocessamento manual, admin-only) para os
 * chamadores reais.
 *
 * Recebe sempre o Prisma Transaction Client (tx); o chamador envolve a
 * chamada inteira em `prisma.$transaction(...)`, tipicamente através de
 * withIdempotentRetry() (ver abaixo). Se qualquer passo falhar, a exceção
 * propaga e o Prisma reverte a transação inteira — nenhum Payment fica
 * confirmado, nenhum PaymentItem ou tarefa/etapa parcial permanece, e
 * nenhum Payment PENDENTE criado nesta mesma chamada fica órfão.
 */
export async function confirmPaymentAndGenerateProjectTasks(
  tx: DbClient,
  params: ConfirmPaymentParams,
): Promise<ConfirmPaymentResult> {
  const project = await tx.project.findUnique({ where: { id: params.projectId } });
  if (!project) {
    throw new PaymentValidationError("Projeto não encontrado", 404);
  }

  const visible = await projectVisibleToUser(tx, params.requesterUser, project);
  if (!visible) {
    throw new PaymentValidationError("Acesso negado", 403);
  }

  const cycleKey = resolveCycleKey(project.lifecycle, params.billingCycleKey);

  // Bloqueio: projeto sem produto válido — checado ANTES de resolver/criar
  // qualquer Payment, pra não gerar uma linha PENDENTE à toa quando isto já
  // vai falhar de qualquer forma.
  const validProducts = await tx.projectProduct.findMany({
    where: { project_id: project.id, status: { not: "CANCELADO" } },
  });
  if (validProducts.length === 0) {
    throw new PaymentValidationError(
      "O projeto precisa possuir pelo menos um produto antes do pagamento.",
      400,
    );
  }

  // ── Resolve QUAL Payment está sendo confirmado ──────────────────────────
  let payment: Payment;

  if (params.paymentId) {
    const found = await tx.payment.findUnique({ where: { id: params.paymentId } });
    if (!found) {
      throw new PaymentValidationError("Payment não encontrado", 404);
    }
    if (found.project_id !== project.id) {
      throw new PaymentValidationError("Payment não pertence a este projeto", 400);
    }
    if (found.status === "PAGO") {
      // Repetição idempotente via payment_id explícito.
      return { payment: found, project, alreadyProcessed: true, tasksResult: null };
    }
    if (NON_REUSABLE_PAYMENT_STATUSES.includes(found.status)) {
      throw new PaymentValidationError(`Payment está ${found.status} e não pode ser confirmado`, 400);
    }
    if (found.status !== "PENDENTE") {
      throw new PaymentValidationError(`Payment está em status inesperado (${found.status})`, 400);
    }
    payment = found;
  } else {
    // Sem payment_id explícito: procura uma tentativa compatível com
    // projeto + ciclo — PENDENTE (pra confirmar) ou já PAGO (repetição
    // idempotente sem o cliente precisar guardar o payment_id). Linhas
    // antigas (seed, criadas antes desta fase) têm billing_cycle_key null
    // — tratadas como "avulso" pra continuar compatíveis.
    const compatible = await tx.payment.findFirst({
      where: {
        project_id: project.id,
        status: { in: ["PENDENTE", "PAGO"] },
        ...(cycleKey === "avulso"
          ? { OR: [{ billing_cycle_key: null }, { billing_cycle_key: "avulso" }] }
          : { billing_cycle_key: cycleKey }),
      },
      orderBy: { created_at: "asc" },
    });

    if (compatible?.status === "PAGO") {
      return { payment: compatible, project, alreadyProcessed: true, tasksResult: null };
    }

    if (compatible) {
      payment = compatible;
    } else {
      // Nenhuma tentativa compatível — cria uma nova, já como PENDENTE, com
      // idempotency_key provisória (namespace "draft:") que protege contra
      // duas transações concorrentes criando tentativas duplicadas pro
      // mesmo projeto+ciclo quando nenhuma delas informou payment_id. Vira
      // a chave final (namespace "fake:") só quando confirmada abaixo.
      const draftKey = `draft:${project.id}:${cycleKey}`;
      payment = await tx.payment.create({
        data: {
          project_id: project.id,
          user_id: params.requesterUser.id,
          amount: 0,
          payment_method: params.paymentMethod ?? "CARTAO_TESTE",
          status: "PENDENTE",
          gateway: "FAKE_SANDBOX",
          idempotency_key: draftKey,
          billing_cycle_key: cycleKey,
          notes: params.notes ?? "Pagamento de teste simulado — ambiente sandbox",
        },
      });
    }
  }

  // ── Congela os itens pagos em PaymentItem (snapshot imutável) ───────────
  // A partir daqui, geração de tarefas (nesta chamada e em qualquer
  // reprocessamento futuro) usa exclusivamente estes PaymentItems — nunca
  // reconsulta "produtos atuais do projeto".
  const paymentItemsData = validProducts.map((pp) => ({
    payment_id: payment.id,
    project_product_id: pp.id,
    product_id: pp.product_id,
    product_name_snapshot: pp.product_name_snapshot,
    unit_price_snapshot: pp.preco_final_cliente_snapshot,
    quantity_snapshot: 1,
    total_snapshot: pp.preco_final_cliente_snapshot,
    recurrence_snapshot: pp.recurrence_snapshot,
    billing_cycle_key: cycleKey,
  }));
  for (const data of paymentItemsData) {
    await tx.paymentItem.create({ data });
  }
  const amount = paymentItemsData.reduce((sum, item) => sum + item.total_snapshot, 0);

  // Mantém Project.value/budget sincronizados com os produtos vinculados —
  // regra independente deste Payment específico, da fase anterior.
  await recalculateProjectValue(tx, project.id);

  // ── Confirma o Payment: PENDENTE -> PAGO, via UPDATE condicional ────────
  // UPDATE com WHERE status="PENDENTE" nunca lança exceção sob concorrência
  // (ao contrário de um create()+unique constraint) — se outra transação
  // venceu a corrida e confirmou este MESMO Payment entre nós o carregarmos
  // e chegarmos aqui, `count` fica 0, sem poluir a transação com erro do
  // MySQL (foi exatamente esse tipo de erro, num create(), que quebrava a
  // recuperação dentro da própria transação na versão anterior).
  const finalIdempotencyKey = `fake:${payment.id}:${cycleKey}`;
  const paidAt = new Date();
  const updateResult = await tx.payment.updateMany({
    where: { id: payment.id, status: "PENDENTE" },
    data: {
      status: "PAGO",
      amount,
      paid_at: paidAt,
      idempotency_key: finalIdempotencyKey,
      billing_cycle_key: cycleKey,
      payment_method: params.paymentMethod ?? payment.payment_method,
      card_last_digits: params.cardLastDigits ?? payment.card_last_digits ?? "4242",
      card_holder: params.cardHolder ?? payment.card_holder ?? "Cartão de Teste",
      fake_transaction_id:
        payment.fake_transaction_id ??
        `FAKE_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    },
  });

  if (updateResult.count === 0) {
    // Perdeu a corrida — outra transação concorrente confirmou este mesmo
    // Payment entre o momento em que o carregamos e agora. Os PaymentItems
    // que acabamos de criar acima revertem junto com o resto desta
    // transação (rollback); devolvemos o resultado da transação vencedora.
    const winner = await tx.payment.findUniqueOrThrow({ where: { id: payment.id } });
    const currentProject = await tx.project.findUniqueOrThrow({ where: { id: project.id } });
    return { payment: winner, project: currentProject, alreadyProcessed: true, tasksResult: null };
  }

  const confirmedPayment = await tx.payment.findUniqueOrThrow({ where: { id: payment.id } });

  // Produtos cobertos por este pagamento entram em execução — mesmo
  // comportamento que o fake-checkout já tinha antes desta fase.
  const productUpdateData: Record<string, unknown> = { status: "EM_EXECUCAO", start_date: paidAt };
  if (project.lifecycle === "mensal") {
    productUpdateData.expected_end_date = new Date(paidAt.getTime() + 30 * 24 * 60 * 60 * 1000);
  }
  await tx.projectProduct.updateMany({
    where: { id: { in: validProducts.map((p) => p.id) } },
    data: productUpdateData,
  });

  // gera tarefas + etapas exclusivamente a partir dos PaymentItems recém-criados
  const tasksResult = await gerarTarefasDoProjeto(tx, project.id, {
    paymentId: confirmedPayment.id,
    paidAt,
    billingCycleKey: cycleKey,
    projectProductIds: validProducts.map((p) => p.id),
  });

  const updatedProject = await tx.project.update({
    where: { id: project.id },
    data: { status: "in-progress" },
  });

  return { payment: confirmedPayment, project: updatedProject, alreadyProcessed: false, tasksResult };
}

/**
 * Retry controlado — só para a colisão esperada de concorrência real
 * (duas requisições confirmando a mesma tentativa ao mesmo tempo, sem
 * payment_id explícito, criando o draft PENDENTE simultaneamente). Chamar
 * assim, no lugar de um `prisma.$transaction(...)` direto:
 *
 *   const result = await withIdempotentRetry(() =>
 *     prisma.$transaction((tx) => confirmPaymentAndGenerateProjectTasks(tx, params)),
 *   );
 *
 * Tenta rodar a transação normalmente; se falhar especificamente por
 * violação de uma das DUAS constraints @unique que podem colidir sob
 * concorrência real neste fluxo, a transação inteira sofreu rollback
 * (nenhum PaymentItem/Payment parcial ficou) — refaz a chamada UMA vez, e a
 * segunda tentativa encontra o trabalho da vencedora já commitado e
 * prossegue normalmente, sem duplicar nada:
 *   - `payments_idempotency_key_key` — duas transações criando o draft
 *     PENDENTE simultaneamente (sem payment_id explícito).
 *   - `payment_items_payment_id_project_product_id_key` — duas transações
 *     que carregaram o MESMO Payment PENDENTE (com payment_id explícito, ou
 *     achado via busca por projeto+ciclo) e ambas tentaram congelar os
 *     PaymentItems antes de uma delas confirmar o Payment pra PAGO (achado
 *     real do Cenário F em prisma/verify-payment-task-generation.ts — a
 *     primeira versão desta função só tratava a colisão em idempotency_key,
 *     não em PaymentItem).
 * Qualquer outro erro (incluindo PaymentValidationError) propaga direto,
 * sem retry.
 */
const RETRYABLE_UNIQUE_CONSTRAINTS = ["payments_idempotency_key_key", "payment_items_payment_id_project_product_id_key"];

export async function withIdempotentRetry<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (err) {
    const code = (err as { code?: string } | null)?.code;
    const message = (err as { message?: string } | null)?.message ?? "";
    const isExpectedCollision = code === "P2002" && RETRYABLE_UNIQUE_CONSTRAINTS.some((c) => message.includes(c));
    if (!isExpectedCollision) throw err;
    return run();
  }
}
