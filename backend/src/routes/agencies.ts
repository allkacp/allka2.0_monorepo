import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../middleware/auth";
import { validate, parsePagination } from "../middleware/validate";

const router = Router();

const createSchema = z.object({
  name: z.string().min(1),
  cnpj: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  partner_level: z
    .enum(["bronze", "silver", "gold", "platinum", "diamond"])
    .default("bronze"),
  status: z.string().default("ativo"),
  user_id: z.string().min(1),
});

const updateSchema = createSchema.partial().omit({ user_id: true });

// GET /api/agencies
router.get("/", verifyToken, async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const partner_level = req.query.partner_level as string | undefined;
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;

    const where: Record<string, unknown> = {};
    if (partner_level) where["partner_level"] = partner_level;
    if (status) where["status"] = status;
    if (search) {
      where["OR"] = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.agency.count({ where }),
      prisma.agency.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, name: true } },
          match_queue_entry: true,
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

// GET /api/agencies/:id
router.get("/:id", verifyToken, async (req, res, next) => {
  try {
    const agency = await prisma.agency.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, email: true, name: true } },
        match_queue_entry: true,
      },
    });

    if (!agency) {
      res.status(404).json({ error: "Agência não encontrada" });
      return;
    }

    res.json(agency);
  } catch (err) {
    next(err);
  }
});

// POST /api/agencies
router.post("/", verifyToken, validate(createSchema), async (req, res, next) => {
  try {
    const agency = await prisma.agency.create({
      data: req.body,
      include: { user: { select: { id: true, email: true, name: true } } },
    });
    res.status(201).json(agency);
  } catch (err) {
    next(err);
  }
});

// PUT /api/agencies/:id
router.put("/:id", verifyToken, validate(updateSchema), async (req, res, next) => {
  try {
    const agency = await prisma.agency.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(agency);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/agencies/:id
router.delete("/:id", verifyToken, async (req, res, next) => {
  try {
    await prisma.agency.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
