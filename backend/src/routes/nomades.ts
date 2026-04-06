import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../middleware/auth";
import { validate, parsePagination } from "../middleware/validate";

const router = Router();

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  whatsapp: z.string().optional(),
  avatar: z.string().optional(),
  level: z
    .enum(["bronze", "silver", "gold", "platinum", "diamond", "leader"])
    .default("bronze"),
  status: z
    .enum(["ativo", "inativo", "aguardando_aprovacao", "reprovado", "pausado"])
    .default("aguardando_aprovacao"),
  score: z.number().int().min(0).default(0),
  areas_of_interest: z.string().optional(),
  is_leader: z.boolean().default(false),
  leader_id: z.string().optional(),
  min_monthly_goal: z.number().optional(),
  terms_accepted: z.boolean().default(false),
  user_id: z.string().optional(),
});

const updateSchema = createSchema.partial();

// GET /api/nomades
router.get("/", verifyToken, async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const status = req.query.status as string | undefined;
    const level = req.query.level as string | undefined;
    const search = req.query.search as string | undefined;

    const where: Record<string, unknown> = {};
    if (status) where["status"] = status;
    if (level) where["level"] = level;
    if (search) {
      where["OR"] = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.nomade.count({ where }),
      prisma.nomade.findMany({
        where,
        include: {
          _count: {
            select: {
              qualifications: true,
              task_executions: true,
              wallet_transactions: true,
            },
          },
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

// GET /api/nomades/:id
router.get("/:id", verifyToken, async (req, res, next) => {
  try {
    const nomade = await prisma.nomade.findUnique({
      where: { id: req.params.id },
      include: {
        qualifications: true,
        bank_account: true,
        wallet_transactions: { orderBy: { date: "desc" }, take: 20 },
        _count: { select: { task_executions: true, withdrawal_requests: true } },
      },
    });

    if (!nomade) {
      res.status(404).json({ error: "Nômade não encontrado" });
      return;
    }

    res.json(nomade);
  } catch (err) {
    next(err);
  }
});

// POST /api/nomades
router.post("/", verifyToken, validate(createSchema), async (req, res, next) => {
  try {
    const nomade = await prisma.nomade.create({ data: req.body });
    res.status(201).json(nomade);
  } catch (err) {
    next(err);
  }
});

// PUT /api/nomades/:id
router.put("/:id", verifyToken, validate(updateSchema), async (req, res, next) => {
  try {
    const nomade = await prisma.nomade.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(nomade);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/nomades/:id
router.delete("/:id", verifyToken, async (req, res, next) => {
  try {
    await prisma.nomade.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// GET /api/nomades/:id/wallet
router.get("/:id/wallet", verifyToken, async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);

    const nomade = await prisma.nomade.findUnique({
      where: { id: req.params.id },
      select: { id: true, name: true },
    });

    if (!nomade) {
      res.status(404).json({ error: "Nômade não encontrado" });
      return;
    }

    const [transactions, balanceData] = await Promise.all([
      prisma.walletTransaction.findMany({
        where: { nomade_id: req.params.id },
        orderBy: { date: "desc" },
        skip,
        take: limit,
      }),
      prisma.walletTransaction.groupBy({
        by: ["type"],
        where: { nomade_id: req.params.id },
        _sum: { amount: true },
      }),
    ]);

    const available = balanceData
      .filter((b) => ["credit", "bonus"].includes(b.type))
      .reduce((acc, b) => acc + (b._sum.amount ?? 0), 0);

    const debited = balanceData
      .filter((b) => ["debit", "penalty", "withdrawal"].includes(b.type))
      .reduce((acc, b) => acc + (b._sum.amount ?? 0), 0);

    res.json({
      availableBalance: available - debited,
      transactions,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/nomades/:id/qualifications
router.get("/:id/qualifications", verifyToken, async (req, res, next) => {
  try {
    const qualifications = await prisma.qualification.findMany({
      where: { nomade_id: req.params.id },
      orderBy: { created_at: "desc" },
    });
    res.json(qualifications);
  } catch (err) {
    next(err);
  }
});

// PUT /api/nomades/:id/qualifications/:qid
router.put(
  "/:id/qualifications/:qid",
  verifyToken,
  async (req, res, next) => {
    try {
      const allowed = z.object({
        status: z.enum(["habilitado", "pausado", "teste_pendente", "reprovado"]),
        certification_date: z.string().datetime({ offset: true }).optional(),
        paused_date: z.string().datetime({ offset: true }).optional(),
      });

      const parsed = allowed.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Dados inválidos", details: parsed.error.flatten() });
        return;
      }

      const qual = await prisma.qualification.update({
        where: { id: req.params.qid },
        data: parsed.data,
      });
      res.json(qual);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
