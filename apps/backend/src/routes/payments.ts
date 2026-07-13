import { Router } from "express";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../middleware/auth";
import { recordWalletEvent } from "../lib/wallet-service";
import { confirmPaymentAndGenerateProjectTasks, PaymentValidationError, withIdempotentRetry } from "../lib/confirm-payment";

const router = Router();

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/payments/fake-checkout
//
// Simula um pagamento aprovado para fins de teste (ambiente sandbox). Não
// chama nenhum gateway real. Delega toda a regra (bloqueio sem produto,
// valor recalculado dos produtos, idempotência real, geração transacional
// de tarefas/etapas) para confirmPaymentAndGenerateProjectTasks — ver
// src/lib/confirm-payment.ts. `amount` não é mais aceito do corpo da
// requisição: o valor cobrado vem sempre dos ProjectProducts válidos do
// projeto (nunca confia em valor enviado pelo frontend).
// ──────────────────────────────────────────────────────────────────────────────
router.post("/fake-checkout", verifyToken, async (req, res, next) => {
  try {
    const {
      project_id,
      payment_id,
      card_last_digits = "4242",
      card_holder = "Vinicius Guardia",
      notes,
      billing_cycle_key,
    } = req.body as {
      project_id: string;
      // Opcional — se enviado, confirma EXATAMENTE esse Payment (precisa
      // estar PENDENTE e pertencer ao projeto). Se omitido, o serviço
      // localiza uma tentativa PENDENTE/PAGA compatível com projeto+ciclo,
      // ou cria uma nova — nunca cria um Payment PAGO "solto" ao lado de um
      // PENDENTE já existente.
      payment_id?: string;
      card_last_digits?: string;
      card_holder?: string;
      notes?: string;
      billing_cycle_key?: string;
    };

    if (!project_id) {
      res.status(400).json({ error: "project_id é obrigatório" });
      return;
    }

    const user = req.user!;

    let result;
    try {
      result = await withIdempotentRetry(() =>
        prisma.$transaction((tx) =>
          confirmPaymentAndGenerateProjectTasks(tx, {
            projectId: project_id,
            requesterUser: user,
            paymentId: payment_id,
            billingCycleKey: billing_cycle_key,
            paymentMethod: "CARTAO_TESTE",
            cardLastDigits: String(card_last_digits),
            cardHolder: String(card_holder),
            notes: notes ?? "Pagamento de teste simulado — ambiente sandbox",
          }),
        ),
      );
    } catch (err) {
      if (err instanceof PaymentValidationError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      throw err;
    }

    const { payment, project: updatedProject, alreadyProcessed, tasksResult } = result;

    // ── Registro na carteira (não bloqueia o fluxo, best-effort) ──────────────
    // Fluxo Allkoin: pagamento aprovado → crédito na carteira → projeto debita
    // da carteira. Roda fora da transação principal (efeito colateral
    // financeiro adjacente, fora do escopo desta fase) — mesmo padrão de
    // antes. Idempotente pela própria idempotencyKey de recordWalletEvent
    // (pay_credit_{paymentId} / pay_debit_{paymentId}): numa repetição, o
    // payment.id é o mesmo, então não duplica lançamento.
    if (updatedProject.client_id) {
      const projectTitle = updatedProject.title || project_id;
      await recordWalletEvent("company", updatedProject.client_id, {
        type: "payment",
        direction: "credit",
        amount: payment.amount,
        description: `Pagamento aprovado — ${projectTitle}`,
        idempotencyKey: `pay_credit_${payment.id}`,
        referenceType: "payment",
        referenceId: payment.id,
        createdBy: user.id,
        metadata: { gateway: "FAKE_SANDBOX", project_id, payment_id: payment.id },
      });
      await recordWalletEvent("company", updatedProject.client_id, {
        type: "payment",
        direction: "debit",
        amount: payment.amount,
        description: `Débito projeto — ${projectTitle}`,
        idempotencyKey: `pay_debit_${payment.id}`,
        referenceType: "project",
        referenceId: project_id,
        createdBy: user.id,
        metadata: { project_id, payment_id: payment.id },
      });
    }

    const message = alreadyProcessed
      ? "Pagamento já havia sido confirmado anteriormente (idempotente) — nada foi duplicado."
      : (tasksResult?.generated ?? 0) > 0
        ? "Pagamento aprovado. Tarefas geradas com sucesso."
        : (tasksResult?.produtos_sem_modelo.length ?? 0) > 0
          ? "Pagamento aprovado, mas nenhuma tarefa foi gerada porque os produtos não possuem modelos de tarefas ativos."
          : "Pagamento aprovado.";

    res.status(201).json({
      success: true,
      payment,
      project: updatedProject,
      project_status: updatedProject.status,
      paymentId: payment.id,
      projectId: project_id,
      checkoutId: payment.fake_transaction_id || payment.id,
      paymentStatus: payment.status,
      alreadyProcessed,
      tarefasCriadasAgora: tasksResult?.generated ?? 0,
      tarefasIgnoradasAgora: tasksResult?.skipped ?? 0,
      totalTarefasProjeto: tasksResult?.total_tarefas,
      tarefasGeradas: tasksResult?.generated ?? 0,
      tarefasIgnoradas: tasksResult?.skipped ?? 0,
      etapasGeradas: tasksResult?.stages_generated ?? 0,
      produtosProcessados: tasksResult?.produtos_processados ?? 0,
      produtosSemModelo: tasksResult?.produtos_sem_modelo ?? [],
      errosDeGeracao: tasksResult?.erros_de_geracao ?? [],
      warnings: tasksResult?.warnings ?? [],
      message,
    });
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/payments
// Lista pagamentos, filtrável por project_id
// ──────────────────────────────────────────────────────────────────────────────
router.get("/", verifyToken, async (req, res, next) => {
  try {
    const { project_id } = req.query as { project_id?: string };
    const where = project_id ? { project_id } : {};

    const payments = await prisma.payment.findMany({
      where,
      include: { project: { select: { id: true, title: true, status: true } } },
      orderBy: { created_at: "desc" },
    });

    res.json({ data: payments, total: payments.length });
  } catch (err) {
    next(err);
  }
});

// GET /api/payments/:id
router.get("/:id", verifyToken, async (req, res, next) => {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id as string },
      include: { project: { select: { id: true, title: true, status: true } } },
    });
    if (!payment) {
      res.status(404).json({ error: "Pagamento não encontrado" });
      return;
    }
    res.json(payment);
  } catch (err) {
    next(err);
  }
});

export default router;
