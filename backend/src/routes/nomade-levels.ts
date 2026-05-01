import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();

const levelSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  min_score: z.number().int().min(0),
  max_score: z.number().int().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  benefits: z.string().optional(),
  requirements: z.string().optional(),
});

// GET /api/nomade-levels
router.get("/", verifyToken, async (_req, res, next) => {
  try {
    const levels = await prisma.nomadeLevel.findMany({
      orderBy: { min_score: "asc" },
    });
    res.json(levels);
  } catch (err) {
    next(err);
  }
});

// GET /api/nomade-levels/:id
router.get("/:id", verifyToken, async (req, res, next) => {
  try {
    const level = await prisma.nomadeLevel.findUnique({
      where: { id: (req.params.id as string) },
    });
    if (!level) {
      res.status(404).json({ error: "Nível não encontrado" });
      return;
    }
    res.json(level);
  } catch (err) {
    next(err);
  }
});

// POST /api/nomade-levels
router.post("/", verifyToken, validate(levelSchema), async (req, res, next) => {
  try {
    const level = await prisma.nomadeLevel.create({ data: req.body });
    res.status(201).json(level);
  } catch (err) {
    next(err);
  }
});

// PUT /api/nomade-levels/:id
router.put("/:id", verifyToken, validate(levelSchema.partial()), async (req, res, next) => {
  try {
    const level = await prisma.nomadeLevel.update({
      where: { id: (req.params.id as string) },
      data: req.body,
    });
    res.json(level);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/nomade-levels/:id
router.delete("/:id", verifyToken, async (req, res, next) => {
  try {
    await prisma.nomadeLevel.delete({ where: { id: (req.params.id as string) } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
