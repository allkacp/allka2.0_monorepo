import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../middleware/auth";
import { validate, parsePagination } from "../middleware/validate";

const router = Router();

const createSchema = z.object({
  nomade_id: z.string().min(1),
  amount: z.number().positive(),
  pix_key: z.string().optional(),
  pix_key_type: z.enum(["cpf", "email", "phone", "random"]).optional(),
  notes: z.string().optional(),
});

const reviewSchema = z.object({
  status: z.enum([
    "aguardando_analise",
    "pagamento_agendado",
    "pagamento_efetuado",
    "cancelado",
    "reprovado",
  ]),
  notes: z.string().optional(),
  scheduled_for: z.string().datetime({ offset: true }).optional(),
});

// GET /api/financial/withdrawals
router.get("/withdrawals", verifyToken, async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const status = req.query.status as string | undefined;
    const nomade_id = req.query.nomade_id as string | undefined;

    const where: Record<string, unknown> = {};
    if (status) where["status"] = status;
    if (nomade_id) where["nomade_id"] = nomade_id;

    // Nomad users can only see their own withdrawals
    if (req.user?.role === "nomad") {
      where["nomade"] = { user_id: req.user.id };
    }

    const [total, data] = await Promise.all([
      prisma.withdrawalRequest.count({ where }),
      prisma.withdrawalRequest.findMany({
        where,
        include: { nomade: { select: { id: true, name: true, email: true } } },
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

// GET /api/financial/withdrawals/:id
router.get("/withdrawals/:id", verifyToken, async (req, res, next) => {
  try {
    const withdrawal = await prisma.withdrawalRequest.findUnique({
      where: { id: (req.params.id as string) },
      include: { nomade: true },
    });

    if (!withdrawal) {
      res.status(404).json({ error: "Solicitação não encontrada" });
      return;
    }

    res.json(withdrawal);
  } catch (err) {
    next(err);
  }
});

// POST /api/financial/withdrawals
router.post("/withdrawals", verifyToken, validate(createSchema), async (req, res, next) => {
  try {
    const withdrawal = await prisma.withdrawalRequest.create({
      data: req.body,
      include: { nomade: { select: { id: true, name: true } } },
    });
    res.status(201).json(withdrawal);
  } catch (err) {
    next(err);
  }
});

// PUT /api/financial/withdrawals/:id — review/update status
router.put("/withdrawals/:id", verifyToken, validate(reviewSchema), async (req, res, next) => {
  try {
    const { status, notes, scheduled_for } = req.body as {
      status: string;
      notes?: string;
      scheduled_for?: string;
    };

    const data: Record<string, unknown> = {
      status,
      reviewed_by: req.user?.id,
      reviewed_at: new Date(),
    };
    if (notes) data["notes"] = notes;
    if (scheduled_for) data["scheduled_for"] = new Date(scheduled_for);
    if (status === "pagamento_efetuado") data["paid_at"] = new Date();

    const withdrawal = await prisma.withdrawalRequest.update({
      where: { id: (req.params.id as string) },
      data,
      include: { nomade: { select: { id: true, name: true } } },
    });

    res.json(withdrawal);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/financial/withdrawals/:id
router.delete("/withdrawals/:id", verifyToken, async (req, res, next) => {
  try {
    await prisma.withdrawalRequest.delete({ where: { id: (req.params.id as string) } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// GET /api/financial/stats — summary for admin
router.get("/stats", verifyToken, async (req, res, next) => {
  try {
    const [byStatus, totalAmount] = await Promise.all([
      prisma.withdrawalRequest.groupBy({
        by: ["status"],
        _count: true,
        _sum: { amount: true },
      }),
      prisma.withdrawalRequest.aggregate({ _sum: { amount: true } }),
    ]);

    res.json({
      total: totalAmount._sum.amount ?? 0,
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
