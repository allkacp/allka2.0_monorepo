// Checkout do catálogo do CLIENTE do catalog2 (sprint de produtos, bloco
// 6/6). Transforma cotações VÁLIDAS (Catalog2Quote) em um pedido real
// (Project + ProjectProduct) — nunca cria pagamento nem tarefa aqui; isso
// continua em POST /api/payments/fake-checkout (reaproveitado sem mudança de
// contrato) via confirmPaymentAndGenerateProjectTasks.
//
// Regras de ouro: servidor revalida/recalcula tudo; cotação expirada ou
// desatualizada bloqueia; clique duplo/retry nunca duplica; conta A nunca
// acessa cotação/pedido de conta B; Admin (preview) nunca finaliza checkout.

import { Router } from "express";
import { z } from "zod";
import { verifyToken } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { resolveClientContext } from "../lib/catalog2-client";
import { Catalog2CheckoutError, revalidateAndFreezeQuote, attachCatalog2QuoteToProject } from "../lib/catalog2-checkout";
import { createProjectWithSequentialCode } from "../lib/create-project";
import { recalculateProjectValue } from "../lib/project-value";
import { writeAccessAudit } from "../lib/product-feedback-service";
import { projectVisibleToUser } from "../lib/project-scope";
import { recordWalletEvent } from "../lib/wallet-service";

const router = Router();
router.use(verifyToken);

const bodySchema = z.object({
  quote_ids: z.array(z.string().min(1)).min(1),
  checkout_client_action_id: z.string().min(1),
});

router.post("/", async (req, res, next) => {
  try {
    const body = bodySchema.parse(req.body ?? {});
    const ctx = await resolveClientContext(req.user!.id, req.user!.account_type, req.user!.role);

    if (!ctx.can_contract) {
      res.status(403).json({ error: "Seu perfil não pode finalizar compras no novo catálogo." });
      return;
    }

    // ── Idempotência do PEDIDO: mesmo checkout_client_action_id nunca cria
    // um segundo Project — devolve o já existente (200, não 201). ──────────
    const existingProject = await prisma.project.findUnique({
      where: { catalog2_checkout_client_action_id: body.checkout_client_action_id },
      include: { products: { where: { origin_catalog2_quote_id: { not: null } } } },
    });
    if (existingProject) {
      res.status(200).json({
        project: existingProject,
        project_products: existingProject.products,
        next_step: "confirm_payment",
        payment_endpoint: "/api/payments/fake-checkout",
        already_processed: true,
      });
      return;
    }

    const quoteIds = [...new Set(body.quote_ids)];

    // ── Revalida CADA cotação fora da transação — qualquer falha aborta tudo
    // (nenhum Project parcial). ──────────────────────────────────────────
    for (const quoteId of quoteIds) {
      await revalidateAndFreezeQuote(ctx, quoteId);
    }

    const pagadorSnapshot: "AGENCIA" | "CLIENTE" = ctx.account_kind === "agency" ? "AGENCIA" : "CLIENTE";

    const firstQuote = await prisma.catalog2Quote.findUniqueOrThrow({
      where: { id: quoteIds[0] },
      include: { product: { select: { internal_name: true } } },
    });

    let result: { project: Awaited<ReturnType<typeof prisma.project.findUniqueOrThrow>>; projectProducts: unknown[] };
    try {
      result = await prisma.$transaction(async (tx) => {
        const project = await createProjectWithSequentialCode(tx, {
          title:
            quoteIds.length === 1
              ? firstQuote.product.internal_name
              : `Pedido Catálogo 2.0 (${quoteIds.length} itens)`,
          status: "draft",
          lifecycle: "avulso",
          agency_id: ctx.account_kind === "agency" ? ctx.account_id : null,
          company_id: ctx.account_kind === "company" ? ctx.account_id : null,
          created_by_user_id: ctx.user_id,
          catalog2_checkout_client_action_id: body.checkout_client_action_id,
        });

        const projectProducts = [];
        for (const quoteId of quoteIds) {
          const pp = await attachCatalog2QuoteToProject(tx, {
            projectId: project.id,
            quoteId,
            origin: "CATALOG2",
            pagadorSnapshot,
          });
          projectProducts.push(pp);
        }

        await recalculateProjectValue(tx, project.id);

        const finalProject = await tx.project.findUniqueOrThrow({ where: { id: project.id } });
        return { project: finalProject, projectProducts };
      });
    } catch (err) {
      // Corrida real: duas requisições com o MESMO checkout_client_action_id
      // criaram o Project ao mesmo tempo — a perdedora não duplica nada,
      // devolve o Project da vencedora (já commitado).
      const code = (err as { code?: string } | null)?.code;
      const message = (err as { message?: string } | null)?.message ?? "";
      if (code === "P2002" && message.includes("catalog2_checkout_client_action_id")) {
        const winner = await prisma.project.findUniqueOrThrow({
          where: { catalog2_checkout_client_action_id: body.checkout_client_action_id },
          include: { products: { where: { origin_catalog2_quote_id: { not: null } } } },
        });
        res.status(200).json({
          project: winner,
          project_products: winner.products,
          next_step: "confirm_payment",
          payment_endpoint: "/api/payments/fake-checkout",
          already_processed: true,
        });
        return;
      }
      throw err;
    }

    await writeAccessAudit({
      actorId: ctx.user_id,
      action: "catalog2.checkout.project_created",
      after: { project_id: result.project.id, quote_ids: quoteIds },
    });

    await prisma.systemAlert.create({
      data: {
        type: "catalog2.project_created",
        title: "Novo pedido — Catálogo 2.0",
        message: `Pedido "${result.project.title}" (${result.project.project_code}) criado via checkout do novo catálogo.`,
        severity: "info",
        category: "notificacao",
        entity_type: "project",
        entity_id: result.project.id,
        action_url: `/admin/projetos?produto=${result.project.id}`,
      },
    });
    if (!result.project.admin_responsible_user_id) {
      await prisma.systemAlert.create({
        data: {
          type: "catalog2.admin_responsible_pending",
          title: "Pedido sem Admin responsável",
          message: `O pedido "${result.project.title}" (${result.project.project_code}) do novo catálogo ainda não tem um Admin responsável atribuído.`,
          severity: "warning",
          category: "alerta",
          entity_type: "project",
          entity_id: result.project.id,
          action_url: `/admin/projetos?produto=${result.project.id}`,
        },
      });
    }

    res.status(201).json({
      project: result.project,
      project_products: result.projectProducts,
      next_step: "confirm_payment",
      payment_endpoint: "/api/payments/fake-checkout",
      already_processed: false,
    });
  } catch (e) {
    if (e instanceof Catalog2CheckoutError) {
      res.status(e.httpStatus).json({ error: e.message, code: e.code });
      return;
    }
    next(e);
  }
});

// ── Cancelamento (com reversão financeira quando já pago) ──────────────────
// Só cobre ProjectProduct de origem catalog2 (compra ou aditivo). Trabalho
// novo — não existe reversão financeira automática hoje para o restante do
// sistema (auditado no início do Bloco 6): PENDENTE cancela sem tocar
// wallet; EM_EXECUCAO gera crédito de estorno idempotente; já em andamento
// (tarefa iniciada) fica fora de escopo — reverter execução em curso não é
// coberto aqui.
router.post("/:projectProductId/cancel", async (req, res, next) => {
  try {
    const pp = await prisma.projectProduct.findUnique({ where: { id: req.params.projectProductId as string } });
    if (!pp || (pp.origin !== "CATALOG2" && pp.origin !== "CATALOG2_ADDITIVE")) {
      res.status(404).json({ error: "Item não encontrado." });
      return;
    }
    const project = await prisma.project.findUniqueOrThrow({ where: { id: pp.project_id } });
    const visible = await projectVisibleToUser(prisma, req.user!, project);
    if (!visible) {
      res.status(403).json({ error: "Acesso negado." });
      return;
    }
    if (pp.status === "CANCELADO") {
      res.status(200).json(pp);
      return;
    }
    if (pp.status !== "PENDENTE" && pp.status !== "EM_EXECUCAO") {
      res.status(409).json({ error: `Item em status "${pp.status}" não pode ser cancelado.` });
      return;
    }
    const hasStartedTask = await prisma.projectTask.findFirst({
      where: { project_product_id: pp.id, status: { notIn: ["PARA_LANCAMENTO", "CANCELADA"] } },
      select: { id: true },
    });
    if (hasStartedTask) {
      res.status(409).json({ error: "Este item já tem tarefa em andamento — cancelamento com reversão de trabalho não é suportado nesta fase." });
      return;
    }

    const wasPaid = pp.status === "EM_EXECUCAO";
    const updated = await prisma.projectProduct.update({ where: { id: pp.id }, data: { status: "CANCELADO" } });
    await recalculateProjectValue(prisma, pp.project_id);

    // Pedido (Project ainda "draft", nunca pago) que fica sem nenhum item
    // ativo não pode continuar parecendo um rascunho aberto indefinidamente —
    // encerra como "cancelled" (nunca some, sempre auditável). Projeto já em
    // execução com outros itens pagos nunca é tocado aqui.
    if (project.status === "draft") {
      const remainingActive = await prisma.projectProduct.count({
        where: { project_id: project.id, status: { notIn: ["CANCELADO", "TRANSFERIDO"] } },
      });
      if (remainingActive === 0) {
        await prisma.project.update({ where: { id: project.id }, data: { status: "cancelled" } });
      }
    }

    if (wasPaid) {
      const ownerType = project.company_id ? "company" : project.agency_id ? "agency" : null;
      const ownerId = project.company_id ?? project.agency_id ?? null;
      if (ownerType && ownerId) {
        await recordWalletEvent(ownerType, ownerId, {
          type: "refund",
          direction: "credit",
          amount: pp.preco_final_cliente_snapshot,
          description: `Estorno — cancelamento de "${pp.product_name_snapshot}"`,
          idempotencyKey: `catalog2_cancel_refund_${pp.id}`,
          referenceType: "project",
          referenceId: pp.project_id,
          createdBy: req.user!.id,
          metadata: { project_product_id: pp.id },
        });
      }
    }

    await writeAccessAudit({
      actorId: req.user!.id,
      action: "catalog2.project_product.cancelled",
      after: { project_product_id: pp.id, refunded: wasPaid },
    });
    await prisma.systemAlert.create({
      data: {
        type: "catalog2.project_product_cancelled",
        title: "Item cancelado — Catálogo 2.0",
        message: `"${pp.product_name_snapshot}" foi cancelado no pedido "${project.title}" (${project.project_code})${wasPaid ? ", com estorno." : "."}`,
        severity: "warning",
        category: "alerta",
        entity_type: "project",
        entity_id: project.id,
        action_url: `/admin/projetos?produto=${project.id}`,
      },
    });

    res.json(updated);
  } catch (e) {
    next(e);
  }
});

export default router;
