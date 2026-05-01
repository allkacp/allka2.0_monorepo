import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../middleware/auth";
import { validate, parsePagination } from "../middleware/validate";

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

    const where: Record<string, unknown> = {};
    if (status) where["status"] = status;
    if (company_id) where["company_id"] = company_id;

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
router.put("/invoices/:id", verifyToken, validate(updateSchema), async (req, res, next) => {
  try {
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
    res.json(invoice);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/billing/invoices/:id
router.delete("/invoices/:id", verifyToken, async (req, res, next) => {
  try {
    await prisma.invoice.delete({ where: { id: (req.params.id as string) } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// GET /api/billing/stats
router.get("/stats", verifyToken, async (req, res, next) => {
  try {
    const [byStatus, totals] = await Promise.all([
      prisma.invoice.groupBy({
        by: ["status"],
        _count: true,
        _sum: { amount: true },
      }),
      prisma.invoice.aggregate({ _sum: { amount: true } }),
    ]);

    res.json({
      totalRevenue: totals._sum.amount ?? 0,
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
