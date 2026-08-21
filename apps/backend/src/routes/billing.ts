import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken, requireRole, requirePermission } from "../middleware/auth";
import { validate, parsePagination } from "../middleware/validate";
import { recordWalletEvent } from "../lib/wallet-service";

const router = Router();

const createSchema = z.object({
  company_id: z.string().optional(),
  project_id: z.string().optional(),
  amount: z.number().positive(),
  status: z.enum(["pending", "paid", "overdue", "cancelled"]).default("pending"),
  due_date: z.string().datetime({ offset: true }).optional(),
  description: z.string().optional(),
  invoice_number: z.string().optional(),
});

const updateSchema = createSchema.partial();

// GET /api/billing/invoices
router.get("/invoices", verifyToken, async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const status = req.query.status as string | undefined;
    const company_id = req.query.company_id as string | undefined;
    const fromRaw = req.query.from as string | undefined;
    const toRaw = req.query.to as string | undefined;

    const where: Record<string, unknown> = {};
    if (status) where["status"] = status;
    if (company_id) where["company_id"] = company_id;
    if (fromRaw || toRaw) {
      const dateFilter: Record<string, Date> = {};
      if (fromRaw) dateFilter.gte = new Date(fromRaw);
      if (toRaw) dateFilter.lte = new Date(toRaw);
      where["created_at"] = dateFilter;
    }

    const [total, data] = await Promise.all([
      prisma.invoice.count({ where }),
      prisma.invoice.findMany({
        where,
        include: {
          company: { select: { id: true, name: true } },
          project: { select: { id: true, title: true } },
        },
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
      }),
    ]);

    res.json({ data, total, page, limit });
  } catch (err) {
    next(err);
  }
});

// GET /api/billing/invoices/:id
router.get("/invoices/:id", verifyToken, async (req, res, next) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: (req.params.id as string) },
      include: {
        company: true,
        project: true,
      },
    });

    if (!invoice) {
      res.status(404).json({ error: "Fatura não encontrada" });
      return;
    }

    res.json(invoice);
  } catch (err) {
    next(err);
  }
});

// POST /api/billing/invoices
router.post("/invoices", verifyToken, validate(createSchema), async (req, res, next) => {
  try {
    const invoice = await prisma.invoice.create({
      data: req.body,
      include: {
        company: { select: { id: true, name: true } },
        project: { select: { id: true, title: true } },
      },
    });
    res.status(201).json(invoice);
  } catch (err) {
    next(err);
  }
});

// PUT /api/billing/invoices/:id
// Muda status da fatura (inclui "paid", que credita a carteira da empresa
// via recordWalletEvent abaixo, e "cancelled") — só admin com permissão
// administrativa (module "sistema", action "edit"). Mesma política do
// lote de segurança anterior (ver routes/products.ts).
router.put(
  "/invoices/:id",
  verifyToken,
  requireRole("admin"),
  requirePermission("sistema", "edit"),
  validate(updateSchema),
  async (req, res, next) => {
  try {
    // Capture previous status to detect the paid transition
    const previous = await prisma.invoice.findUnique({
      where: { id: req.params.id as string },
      select: { status: true, company_id: true, amount: true, invoice_number: true, description: true },
    });

    const data = { ...req.body } as Record<string, unknown>;
    if (data["status"] === "paid" && !data["paid_at"]) {
      data["paid_at"] = new Date();
    }

    const invoice = await prisma.invoice.update({
      where: { id: (req.params.id as string) },
      data,
      include: {
        company: { select: { id: true, name: true } },
      },
    });

    // ── Registro na carteira (não bloqueia o fluxo) ────────────────────────────
    // Cria crédito apenas na transição para "paid" e se há uma empresa vinculada.
    if (
      previous?.status !== "paid" &&
      data["status"] === "paid" &&
      previous?.company_id
    ) {
      const descricao = previous.invoice_number
        ? `Fatura #${previous.invoice_number} paga`
        : previous.description
        ? `Fatura paga — ${previous.description}`
        : `Fatura ${invoice.id} paga`;

      await recordWalletEvent("company", previous.company_id, {
        type: "payment",
        direction: "credit",
        amount: previous.amount,
        description: descricao,
        idempotencyKey: `inv_credit_${invoice.id}`,
        referenceType: "invoice",
        referenceId: invoice.id,
        createdBy: (req as any).user?.id,
        metadata: { invoice_id: invoice.id, company_id: previous.company_id },
      });
    }

    // ── Destrava tarefa bloqueada por alteração extra ──────────────────────
    // Pagar libera a próxima reprovação (soma 1 em alteracoes_extras_pagas);
    // cancelar também destrava, mas como perdão administrativo, sem contar
    // como paga. Ver PATCH /api/project-tasks/:id/reprovar.
    if (previous?.status !== "paid" && data["status"] === "paid") {
      const blockedTask = await prisma.projectTask.findFirst({
        where: { pending_fee_invoice_id: invoice.id },
      });
      if (blockedTask) {
        await prisma.projectTask.update({
          where: { id: blockedTask.id },
          data: { alteracoes_extras_pagas: { increment: 1 }, pending_fee_invoice_id: null },
        });
      }
    } else if (data["status"] === "cancelled" && previous?.status === "pending") {
      const blockedTask = await prisma.projectTask.findFirst({
        where: { pending_fee_invoice_id: invoice.id },
      });
      if (blockedTask) {
        await prisma.projectTask.update({
          where: { id: blockedTask.id },
          data: { pending_fee_invoice_id: null },
        });
      }
    }

    res.json(invoice);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/billing/invoices/:id
// Exclusão física da fatura — distinta de cancelar (PUT acima com status
// "cancelled", que preserva o histórico). Só admin com permissão
// administrativa (module "sistema", action "delete").
router.delete(
  "/invoices/:id",
  verifyToken,
  requireRole("admin"),
  requirePermission("sistema", "delete"),
  async (req, res, next) => {
    try {
      await prisma.invoice.delete({ where: { id: (req.params.id as string) } });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/billing/stats
router.get("/stats", verifyToken, async (req, res, next) => {
  try {
    const fromRaw = req.query.from as string | undefined;
    const toRaw = req.query.to as string | undefined;
    const where: Record<string, unknown> = {};
    if (fromRaw || toRaw) {
      const dateFilter: Record<string, Date> = {};
      if (fromRaw) dateFilter.gte = new Date(fromRaw);
      if (toRaw) dateFilter.lte = new Date(toRaw);
      where["created_at"] = dateFilter;
    }

    const [byStatus, totals, invoiceCount] = await Promise.all([
      prisma.invoice.groupBy({
        by: ["status"],
        _count: true,
        _sum: { amount: true },
        where,
      }),
      prisma.invoice.aggregate({ _sum: { amount: true }, where }),
      prisma.invoice.count({ where }),
    ]);

    const paidEntry = byStatus.find((s) => s.status === "paid");
    const avgTicket = (paidEntry?._count ?? 0) > 0
      ? Math.round((paidEntry!._sum.amount ?? 0) / paidEntry!._count)
      : 0;

    res.json({
      totalRevenue: totals._sum.amount ?? 0,
      invoiceCount,
      avgTicket,
      byStatus: byStatus.map((s) => ({
        status: s.status,
        count: s._count,
        amount: s._sum.amount ?? 0,
      })),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
