import { Router } from "express";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../middleware/auth";
import { gerarTarefasDoProjeto } from "../lib/generate-tasks";
import { recordWalletEvent } from "../lib/wallet-service";

const router = Router();

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/payments/fake-checkout
//
// Simula um pagamento aprovado para fins de teste (ambiente sandbox).
// Não chama nenhum gateway real. Cria um registro Payment no banco com
// status PAGO e atualiza o projeto para "planning" (contratado).
// ──────────────────────────────────────────────────────────────────────────────
router.post("/fake-checkout", verifyToken, async (req, res, next) => {
  try {
    const {
      project_id,
      amount,
      card_last_digits = "4242",
      card_holder = "Vinicius Guardia",
      notes,
    } = req.body as {
      project_id: string;
      amount: number;
      card_last_digits?: string;
      card_holder?: string;
      notes?: string;
    };

    if (!project_id || amount == null || isNaN(Number(amount))) {
      res.status(400).json({ error: "project_id e amount são obrigatórios" });
      return;
    }

    const project = await prisma.project.findUnique({
      where: { id: project_id },
      select: { id: true, status: true, lifecycle: true, client_id: true, title: true },
    });

    if (!project) {
      res.status(404).json({ error: "Projeto não encontrado" });
      return;
    }

    const user = (req as any).user;

    // ID de transação falso — rastreável nos logs de dev
    const fakeTransactionId = `FAKE_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)
      .toUpperCase()}`;

    // Cria o registro de pagamento
    const payment = await prisma.payment.create({
      data: {
        project_id,
        user_id: user?.id ?? null,
        amount: Number(amount),
        payment_method: "CARTAO_TESTE",
        status: "PAGO",
        gateway: "FAKE_SANDBOX",
        fake_transaction_id: fakeTransactionId,
        card_last_digits: String(card_last_digits),
        card_holder: String(card_holder),
        notes: notes ?? "Pagamento de teste simulado — ambiente sandbox",
        paid_at: new Date(),
      },
    });

    // Atualiza o projeto: pago + em andamento
    const updatedProject = await prisma.project.update({
      where: { id: project_id },
      data: { status: "in-progress" },
    });

    const projectProducts = await prisma.projectProduct.findMany({
      where: { project_id },
      select: { id: true, product_id: true, recurrence_snapshot: true },
    });

    if (projectProducts.length > 0) {
      const paymentDate = payment.paid_at ?? new Date();
      const productUpdateData: Record<string, unknown> = {
        status: "EM_EXECUCAO",
        start_date: paymentDate,
      };
      if (project.lifecycle === "mensal") {
        productUpdateData.expected_end_date = new Date(
          paymentDate.getTime() + 30 * 24 * 60 * 60 * 1000,
        );
      }

      await prisma.projectProduct.updateMany({
        where: { project_id },
        data: productUpdateData,
      });
    }

    // Gera tarefas operacionais — AWAITED para garantir que estejam no banco antes
    // de retornar ao cliente. Erros são capturados e reportados, não engolidos.
    let tarefasResult = {
      generated: 0,
      skipped: 0,
      stages_generated: 0,
      total_tarefas: 0,
      total_etapas: 0,
      produtos_processados: 0,
      produtos_sem_modelo: [] as string[],
      erros_de_geracao: [] as string[],
      warnings: [] as string[],
    };

    try {
      const selectedProductIds =
        project.lifecycle === "mensal"
          ? projectProducts
              .filter((item) => item.recurrence_snapshot === "mensal")
              .map((item) => item.product_id)
          : projectProducts.map((item) => item.product_id);
      const productIds =
        selectedProductIds.length > 0
          ? selectedProductIds
          : projectProducts.map((item) => item.product_id);

      tarefasResult = await gerarTarefasDoProjeto(project_id, {
        paymentId: payment.id,
        paidAt: payment.paid_at ?? new Date(),
        productIds,
      });
    } catch (taskErr: any) {
      console.error(`[payments] Erro ao gerar tarefas para ${project_id}:`, taskErr);
      const errMsg = taskErr?.message ?? "Erro desconhecido ao gerar tarefas";
      tarefasResult.erros_de_geracao.push(errMsg);
      tarefasResult.warnings.push(errMsg);
    }

    // Log only when there's a genuine problem: products exist, nothing was created AND nothing was skipped
    if (tarefasResult.generated === 0 && tarefasResult.skipped === 0 && tarefasResult.produtos_processados > 0) {
      console.warn(
        `[payments] INVESTIGAR: projeto ${project_id} tem ${tarefasResult.produtos_processados} produto(s) mas nenhuma tarefa foi criada ou encontrada.` +
        ` sem_modelo=${tarefasResult.produtos_sem_modelo.length}, erros=${tarefasResult.erros_de_geracao.length}`,
      );
    } else if (tarefasResult.skipped > 0) {
      console.log(
        `[payments] Idempotência OK: ${tarefasResult.skipped} tarefa(s) já existiam para projeto ${project_id}. Total no projeto: ${tarefasResult.total_tarefas}`,
      );
    }

    // ── Registro na carteira (não bloqueia o fluxo) ────────────────────────────
    // Fluxo Allkoin: pagamento aprovado → crédito na carteira → projeto debita da carteira.
    // Apenas processa se o projeto tem uma empresa (client_id) vinculada.
    if (project.client_id) {
      const paidAmount = Number(amount);
      const projectTitle = project.title || project_id;

      // 1. Crédito: dinheiro recebido entra na carteira da empresa
      await recordWalletEvent("company", project.client_id, {
        type: "payment",
        direction: "credit",
        amount: paidAmount,
        description: `Pagamento aprovado — ${projectTitle}`,
        idempotencyKey: `pay_credit_${payment.id}`,
        referenceType: "payment",
        referenceId: payment.id,
        createdBy: user?.id,
        metadata: { gateway: "FAKE_SANDBOX", project_id, payment_id: payment.id },
      });

      // 2. Débito: projeto consome o crédito da carteira
      await recordWalletEvent("company", project.client_id, {
        type: "payment",
        direction: "debit",
        amount: paidAmount,
        description: `Débito projeto — ${projectTitle}`,
        idempotencyKey: `pay_debit_${payment.id}`,
        referenceType: "project",
        referenceId: project_id,
        createdBy: user?.id,
        metadata: { project_id, payment_id: payment.id },
      });
    }

    // Derive a truthful status message based on what actually happened
    let message: string;
    if (tarefasResult.erros_de_geracao.length > 0) {
      message = "Pagamento aprovado, mas houve erro ao gerar tarefas. Verifique os detalhes.";
    } else if (tarefasResult.produtos_sem_modelo.length > 0) {
      message = "Pagamento aprovado, mas nenhuma tarefa foi gerada porque os produtos não possuem modelos de tarefas ativos.";
    } else if (tarefasResult.generated > 0) {
      message = "Pagamento aprovado. Tarefas geradas com sucesso.";
    } else if (tarefasResult.total_tarefas > 0) {
      message = "As tarefas deste projeto já haviam sido geradas anteriormente.";
    } else {
      message = "Pagamento aprovado, mas nenhuma tarefa foi gerada. Verifique os modelos vinculados aos produtos.";
    }

    res.status(201).json({
      success: true,
      payment,
      project: updatedProject,
      project_status: "in-progress",
      paymentId: payment.id,
      projectId: project_id,
      checkoutId: payment.fake_transaction_id || payment.id,
      paymentStatus: payment.status,
      projectProducts: projectProducts.length,
      produtosProcessadosNaCompra: tarefasResult.produtos_processados,
      tarefasCriadasAgora: tarefasResult.generated,
      tarefasIgnoradasAgora: tarefasResult.skipped,
      totalTarefasProjeto: tarefasResult.total_tarefas,
      tarefasGeradas: tarefasResult.generated,
      tarefasIgnoradas: tarefasResult.skipped,
      etapasGeradas: tarefasResult.stages_generated,
      produtosProcessados: tarefasResult.produtos_processados,
      produtosSemModelo: tarefasResult.produtos_sem_modelo,
      errosDeGeracao: tarefasResult.erros_de_geracao,
      warnings: tarefasResult.warnings,
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
