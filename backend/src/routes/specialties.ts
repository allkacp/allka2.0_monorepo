import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../middleware/auth";
import { validate, parsePagination } from "../middleware/validate";

const router = Router();

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  hourly_rate: z.number().min(0),
  category: z.string().min(1),
  required_skills: z.string().optional(),
  is_active: z.boolean().default(true),
});

// GET /api/specialties
router.get("/", verifyToken, async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const category = req.query.category as string | undefined;
    const is_active = req.query.is_active;
    const search = req.query.search as string | undefined;

    const where: Record<string, unknown> = {};
    if (category) where["category"] = category;
    if (is_active !== undefined) where["is_active"] = is_active === "true";
    if (search) where["name"] = { contains: search };

    const [total, data] = await Promise.all([
      prisma.specialty.count({ where }),
      prisma.specialty.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" },
      }),
    ]);

    res.json({ data, total, page, limit });
  } catch (err) {
    next(err);
  }
});

// GET /api/specialties/:id
router.get("/:id", verifyToken, async (req, res, next) => {
  try {
    const specialty = await prisma.specialty.findUnique({
      where: { id: (req.params.id as string) },
    });
    if (!specialty) {
      res.status(404).json({ error: "Especialidade não encontrada" });
      return;
    }
    res.json(specialty);
  } catch (err) {
    next(err);
  }
});

// POST /api/specialties
router.post("/", verifyToken, validate(createSchema), async (req, res, next) => {
  try {
    const specialty = await prisma.specialty.create({ data: req.body });
    res.status(201).json(specialty);
  } catch (err) {
    next(err);
  }
});

// PUT /api/specialties/:id
router.put("/:id", verifyToken, validate(createSchema.partial()), async (req, res, next) => {
  try {
    const specialty = await prisma.specialty.update({
      where: { id: (req.params.id as string) },
      data: req.body,
    });
    res.json(specialty);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/specialties/:id
router.delete("/:id", verifyToken, async (req, res, next) => {
  try {
    await prisma.specialty.delete({ where: { id: (req.params.id as string) } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
