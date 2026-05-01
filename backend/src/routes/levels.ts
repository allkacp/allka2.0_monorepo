import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();

const levelSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  gradient: z.string().optional(),
  min_mrr: z.number().int().min(0).optional(),
  max_mrr: z.number().int().optional().nullable(),
  led_agencies_min: z.number().int().min(0).optional(),
  led_agencies_mrr_min: z.number().int().min(0).optional(),
  premium_project_limit: z.number().int().optional().nullable(),
  commission_rate: z.number().min(0).optional(),
  extra_discount: z.number().min(0).optional(),
  receives_leads_premium: z.boolean().optional(),
  requires_partner: z.boolean().optional(),
  level_up_bonus_credits: z.number().int().min(0).optional(),
  benefits: z.string().optional(),
  sort_order: z.number().int().optional(),
});

// GET /api/levels
router.get("/", verifyToken, async (_req, res, next) => {
  try {
    const levels = await prisma.partnerLevel.findMany({
      orderBy: { sort_order: "asc" },
    });
    res.json(levels);
  } catch (err) {
    next(err);
  }
});

// GET /api/levels/:id
router.get("/:id", verifyToken, async (req, res, next) => {
  try {
    const level = await prisma.partnerLevel.findUnique({
      where: { id: (req.params.id as string) },
    });
    if (!level) return res.status(404).json({ error: "Nível não encontrado" });
    res.json(level);
  } catch (err) {
    next(err);
  }
});

// POST /api/levels
router.post("/", verifyToken, validate(levelSchema), async (req, res, next) => {
  try {
    const level = await prisma.partnerLevel.create({ data: req.body });
    res.status(201).json(level);
  } catch (err) {
    next(err);
  }
});

// PUT /api/levels/:id
router.put("/:id", verifyToken, validate(levelSchema.partial()), async (req, res, next) => {
  try {
    const level = await prisma.partnerLevel.update({
      where: { id: (req.params.id as string) },
      data: req.body,
    });
    res.json(level);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/levels/:id
router.delete("/:id", verifyToken, async (req, res, next) => {
  try {
    await prisma.partnerLevel.delete({ where: { id: (req.params.id as string) } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
