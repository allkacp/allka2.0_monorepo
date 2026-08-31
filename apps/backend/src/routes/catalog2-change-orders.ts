// Aditivo pós-venda do catalog2 (sprint de produtos, bloco 6/6). Nunca altera
// o ProjectProduct/ProjectTask originais — só cria uma linha nova
// (origin="CATALOG2_ADDITIVE") depois de aprovado E pago. Preço/prazo do
// aditivo vêm sempre de uma Catalog2Quote própria — nunca digitados/forjados.

import { Router } from "express";
import { z } from "zod";
import { verifyToken } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { resolveClientContext } from "../lib/catalog2-client";
import {
  Catalog2CheckoutError,
  revalidateAndFreezeQuote,
  attachCatalog2QuoteToProject,
  confirmCatalog2AdditivePayment,
} from "../lib/catalog2-checkout";
import { projectVisibleToUser, isAdminUser } from "../lib/project-scope";
import { writeAccessAudit } from "../lib/product-feedback-service";
import { recalculateProjectValue } from "../lib/project-value";

const router = Router();
router.use(verifyToken);

async function loadProjectOr404(projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new Catalog2CheckoutError("Projeto não encontrado.", 404, "project_not_found");
  return project;
}

// ── Solicitar ──────────────────────────────────────────────────────────────
const requestSchema = z.object({
  project_id: z.string().min(1),
  original_project_product_id: z.string().min(1).optional(),
  quote_id: z.string().min(1),
  request_note: z.string().max(2000).optional(),
});

router.post("/", async (req, res, next) => {
  try {
    const body = requestSchema.parse(req.body ?? {});
    const project = await loadProjectOr404(body.project_id);
    const visible = await projectVisibleToUser(prisma, req.user!, project);
    if (!visible) {
      res.status(403).json({ error: "Acesso negado." });
      return;
    }

    const ctx = await resolveClientContext(req.user!.id, req.user!.account_type, req.user!.role);
    if (!ctx.can_contract) {
      res.status(403).json({ error: "Seu perfil não pode solicitar aditivos." });
      return;
    }
    // A cotação do aditivo precisa pertencer à MESMA conta contratante do
    // projeto — nunca aceito só porque o usuário "enxerga" o projeto.
    const ownsProject =
      (ctx.account_kind === "company" && project.company_id === ctx.account_id) ||
      (ctx.account_kind === "agency" && project.agency_id === ctx.account_id);
    if (!ownsProject) {
      res.status(403).json({ error: "Este projeto não pertence à sua conta." });
      return;
    }

    const quote = await prisma.catalog2Quote.findUnique({
      where: { id: body.quote_id },
      include: { product: { select: { internal_name: true } } },
    });
    if (!quote || quote.account_kind !== ctx.account_kind || quote.account_id !== ctx.account_id) {
      res.status(404).json({ error: "Cotação não encontrada." });
      return;
    }
    if (quote.status !== "valida") {
      res.status(409).json({ error: "A cotação precisa estar válida para solicitar um aditivo." });
      return;
    }
    const existingForQuote = await prisma.catalog2ChangeOrder.findUnique({ where: { quote_id: quote.id } });
    if (existingForQuote) {
      res.status(200).json(existingForQuote);
      return;
    }

    if (body.original_project_product_id) {
      const originalPp = await prisma.projectProduct.findUnique({ where: { id: body.original_project_product_id } });
      if (!originalPp || originalPp.project_id !== project.id) {
        res.status(404).json({ error: "Produto original não encontrado neste projeto." });
        return;
      }
    }

    const changeOrder = await prisma.catalog2ChangeOrder.create({
      data: {
        project_id: project.id,
        original_project_product_id: body.original_project_product_id ?? null,
        quote_id: quote.id,
        requested_by_user_id: req.user!.id,
        request_note: body.request_note ?? null,
        change_summary: `Aditivo de "${quote.product.internal_name}" — quantidade ${quote.quantity}.`,
        status: "solicitado",
      },
    });

    await writeAccessAudit({
      actorId: req.user!.id,
      action: "catalog2.change_order.requested",
      after: { change_order_id: changeOrder.id, project_id: project.id, quote_id: quote.id },
    });

    await prisma.systemAlert.create({
      data: {
        type: "catalog2.change_order_requested",
        title: "Aditivo solicitado — Catálogo 2.0",
        message: `Um aditivo foi solicitado no pedido "${project.title}" (${project.project_code}).`,
        severity: "warning",
        category: "alerta",
        entity_type: "project",
        entity_id: project.id,
        user_id: project.admin_responsible_user_id ?? null,
        action_url: `/admin/projetos?produto=${project.id}`,
      },
    });

    res.status(201).json(changeOrder);
  } catch (e) {
    if (e instanceof Catalog2CheckoutError) {
      res.status(e.httpStatus).json({ error: e.message, code: e.code });
      return;
    }
    next(e);
  }
});

// ── Listar ─────────────────────────────────────────────────────────────────
router.get("/", async (req, res, next) => {
  try {
    const projectId = String(req.query.project_id ?? "");
    if (!projectId) {
      res.status(400).json({ error: "project_id é obrigatório" });
      return;
    }
    const project = await loadProjectOr404(projectId);
    const visible = await projectVisibleToUser(prisma, req.user!, project);
    if (!visible) {
      res.status(403).json({ error: "Acesso negado." });
      return;
    }
    const rows = await prisma.catalog2ChangeOrder.findMany({
      where: { project_id: projectId },
      orderBy: { requested_at: "desc" },
    });
    res.json({ data: rows });
  } catch (e) {
    if (e instanceof Catalog2CheckoutError) {
      res.status(e.httpStatus).json({ error: e.message, code: e.code });
      return;
    }
    next(e);
  }
});

// ── Aprovar ────────────────────────────────────────────────────────────────
const approveSchema = z.object({
  decision_note: z.string().max(2000).optional(),
  approval_client_action_id: z.string().min(1),
});

router.post("/:id/approve", async (req, res, next) => {
  try {
    if (!isAdminUser(req.user)) {
      res.status(403).json({ error: "Somente um administrador pode aprovar aditivos." });
      return;
    }
    const body = approveSchema.parse(req.body ?? {});
    const co = await prisma.catalog2ChangeOrder.findUnique({ where: { id: req.params.id as string } });
    if (!co) {
      res.status(404).json({ error: "Aditivo não encontrado." });
      return;
    }
    // Idempotência do clique "Aprovar": o MESMO approval_client_action_id
    // nunca aprova duas vezes — devolve o estado já decidido.
    if (co.approval_client_action_id === body.approval_client_action_id) {
      res.status(200).json(co);
      return;
    }
    if (co.status !== "solicitado") {
      res.status(409).json({ error: `Aditivo em status "${co.status}" não pode ser aprovado agora.` });
      return;
    }

    // Revalida a cotação AGORA — o preço pode ter mudado desde a
    // solicitação; nunca aprova um preço velho.
    const quote = await prisma.catalog2Quote.findUniqueOrThrow({ where: { id: co.quote_id } });
    const ctx = await resolveClientContext(quote.user_id, quote.account_kind === "agency" ? "agencias" : "empresas", "");
    try {
      await revalidateAndFreezeQuote(ctx, co.quote_id);
    } catch (err) {
      if (err instanceof Catalog2CheckoutError) {
        res.status(err.httpStatus).json({ error: `Não foi possível aprovar: ${err.message}`, code: err.code });
        return;
      }
      throw err;
    }
    const freshQuote = await prisma.catalog2Quote.findUniqueOrThrow({ where: { id: co.quote_id } });

    const updated = await prisma.catalog2ChangeOrder.update({
      where: { id: co.id },
      data: {
        status: "aprovado",
        decided_by_user_id: req.user!.id,
        decided_at: new Date(),
        decision_note: body.decision_note ?? null,
        approval_client_action_id: body.approval_client_action_id,
        price_impact_snapshot: freshQuote.commercial_price,
        deadline_impact_days_snapshot: freshQuote.commercial_deadline_days,
        currency_snapshot: freshQuote.currency,
      },
    });

    await writeAccessAudit({
      actorId: req.user!.id,
      action: "catalog2.change_order.approved",
      after: { change_order_id: co.id },
    });
    await prisma.systemAlert.create({
      data: {
        type: "catalog2.change_order_approved",
        title: "Aditivo aprovado — Catálogo 2.0",
        message: `Seu aditivo foi aprovado. Confirme o pagamento para liberar a execução.`,
        severity: "info",
        category: "notificacao",
        entity_type: "project",
        entity_id: co.project_id,
        user_id: co.requested_by_user_id,
        action_url: `/admin/projetos?produto=${co.project_id}`,
      },
    });

    res.json(updated);
  } catch (e) {
    next(e);
  }
});

// ── Rejeitar ───────────────────────────────────────────────────────────────
const rejectSchema = z.object({ decision_note: z.string().min(1).max(2000) });

router.post("/:id/reject", async (req, res, next) => {
  try {
    if (!isAdminUser(req.user)) {
      res.status(403).json({ error: "Somente um administrador pode rejeitar aditivos." });
      return;
    }
    const body = rejectSchema.parse(req.body ?? {});
    const co = await prisma.catalog2ChangeOrder.findUnique({ where: { id: req.params.id as string } });
    if (!co) {
      res.status(404).json({ error: "Aditivo não encontrado." });
      return;
    }
    if (co.status !== "solicitado") {
      res.status(409).json({ error: `Aditivo em status "${co.status}" não pode ser rejeitado agora.` });
      return;
    }
    const updated = await prisma.catalog2ChangeOrder.update({
      where: { id: co.id },
      data: { status: "rejeitado", decided_by_user_id: req.user!.id, decided_at: new Date(), decision_note: body.decision_note },
    });
    await writeAccessAudit({ actorId: req.user!.id, action: "catalog2.change_order.rejected", after: { change_order_id: co.id } });
    await prisma.systemAlert.create({
      data: {
        type: "catalog2.change_order_rejected",
        title: "Aditivo rejeitado — Catálogo 2.0",
        message: `Seu aditivo foi rejeitado: ${body.decision_note}`,
        severity: "warning",
        category: "notificacao",
        entity_type: "project",
        entity_id: co.project_id,
        user_id: co.requested_by_user_id,
        action_url: `/admin/projetos?produto=${co.project_id}`,
      },
    });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

// ── Checkout do aditivo aprovado: cria o ProjectProduct e confirma seu
// próprio pagamento simulado (isolado do motor genérico de pagamento — ver
// comentário de confirmCatalog2AdditivePayment em catalog2-checkout.ts sobre
// por que um aditivo avulso não pode reutilizar /api/payments/fake-checkout
// depois que o pedido original já foi pago). ─────────────────────────────
router.post("/:id/checkout", async (req, res, next) => {
  try {
    const co = await prisma.catalog2ChangeOrder.findUnique({ where: { id: req.params.id as string } });
    if (!co) {
      res.status(404).json({ error: "Aditivo não encontrado." });
      return;
    }
    const project = await loadProjectOr404(co.project_id);
    const visible = await projectVisibleToUser(prisma, req.user!, project);
    if (!visible) {
      res.status(403).json({ error: "Acesso negado." });
      return;
    }
    if (co.status === "materializado") {
      const pp = co.materialized_project_product_id
        ? await prisma.projectProduct.findUnique({ where: { id: co.materialized_project_product_id } })
        : null;
      res.status(200).json({ change_order: co, project_product: pp, already_processed: true });
      return;
    }
    if (co.status !== "aprovado") {
      res.status(409).json({ error: `Aditivo em status "${co.status}" não pode ser convertido em pedido agora.` });
      return;
    }

    const ctx = await resolveClientContext(req.user!.id, req.user!.account_type, req.user!.role);
    const pagadorSnapshot: "AGENCIA" | "CLIENTE" = ctx.account_kind === "agency" ? "AGENCIA" : "CLIENTE";

    const result = await prisma.$transaction(async (tx) => {
      const pp = await attachCatalog2QuoteToProject(tx, {
        projectId: co.project_id,
        quoteId: co.quote_id,
        origin: "CATALOG2_ADDITIVE",
        changeOrderId: co.id,
        pagadorSnapshot,
      });
      await recalculateProjectValue(tx, co.project_id);
      const payment = await confirmCatalog2AdditivePayment(tx, {
        projectId: co.project_id,
        projectProductId: pp.id,
        requesterUserId: req.user!.id,
      });
      const updatedCo = await tx.catalog2ChangeOrder.update({
        where: { id: co.id },
        data: {
          status: "materializado",
          materialized_project_product_id: pp.id,
          materialized_payment_id: payment.payment.id || null,
        },
      });
      return { changeOrder: updatedCo, projectProduct: pp, payment };
    });

    await writeAccessAudit({
      actorId: req.user!.id,
      action: "catalog2.change_order.checkout",
      after: { change_order_id: co.id, project_product_id: result.projectProduct.id },
    });
    await prisma.systemAlert.create({
      data: {
        type: "catalog2.change_order_paid",
        title: "Aditivo pago — Catálogo 2.0",
        message: `Aditivo do pedido "${project.title}" (${project.project_code}) foi pago. ${result.payment.tasksResult?.generated ?? 0} nova(s) tarefa(s) gerada(s).`,
        severity: "info",
        category: "notificacao",
        entity_type: "project",
        entity_id: project.id,
        action_url: `/admin/projetos?produto=${project.id}`,
      },
    });

    res.status(201).json({
      change_order: result.changeOrder,
      project_product: result.projectProduct,
      payment: result.payment.payment,
      tasks_generated: result.payment.tasksResult?.generated ?? 0,
      already_processed: result.payment.alreadyProcessed,
    });
  } catch (e) {
    if (e instanceof Catalog2CheckoutError) {
      res.status(e.httpStatus).json({ error: e.message, code: e.code });
      return;
    }
    next(e);
  }
});

export default router;
