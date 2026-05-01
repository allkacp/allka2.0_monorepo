import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();

const createSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  version: z.string().min(1),
  acceptance_level: z.enum(["empresa", "usuario"]).default("usuario"),
  target_account_types: z.string().optional(),
  is_active: z.boolean().default(true),
});

// GET /api/terms
router.get("/", verifyToken, async (_req, res, next) => {
  try {
    const terms = await prisma.term.findMany({
      orderBy: { created_at: "desc" },
      include: { _count: { select: { acceptances: true } } },
    });
    res.json(terms);
  } catch (err) {
    next(err);
  }
});

// GET /api/terms/:id
router.get("/:id", verifyToken, async (req, res, next) => {
  try {
    const term = await prisma.term.findUnique({
      where: { id: (req.params.id as string) },
      include: { _count: { select: { acceptances: true } } },
    });
    if (!term) {
      res.status(404).json({ error: "Termo não encontrado" });
      return;
    }
    res.json(term);
  } catch (err) {
    next(err);
  }
});

// POST /api/terms
router.post("/", verifyToken, validate(createSchema), async (req, res, next) => {
  try {
    const term = await prisma.term.create({ data: req.body });
    res.status(201).json(term);
  } catch (err) {
    next(err);
  }
});

// PUT /api/terms/:id
router.put("/:id", verifyToken, validate(createSchema.partial()), async (req, res, next) => {
  try {
    const term = await prisma.term.update({
      where: { id: (req.params.id as string) },
      data: req.body,
    });
    res.json(term);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/terms/:id
router.delete("/:id", verifyToken, async (req, res, next) => {
  try {
    await prisma.term.delete({ where: { id: (req.params.id as string) } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// POST /api/terms/:id/accept
router.post("/:id/accept", verifyToken, async (req, res, next) => {
  try {
    const term = await prisma.term.findUnique({
      where: { id: (req.params.id as string) },
    });

    if (!term || !term.is_active) {
      res.status(404).json({ error: "Termo não encontrado ou inativo" });
      return;
    }

    const acceptance = await prisma.termAcceptance.upsert({
      where: {
        term_id_user_id: {
          term_id: (req.params.id as string),
          user_id: req.user!.id,
        },
      },
      create: {
        term_id: (req.params.id as string),
        user_id: req.user!.id,
        ip_address:
          (req.headers["x-forwarded-for"] as string) ||
          req.socket.remoteAddress,
      },
      update: {
        accepted_at: new Date(),
        ip_address:
          (req.headers["x-forwarded-for"] as string) ||
          req.socket.remoteAddress,
      },
    });

    res.json(acceptance);
  } catch (err) {
    next(err);
  }
});

// GET /api/terms/:id/accepted — check if current user has accepted
router.get("/:id/accepted", verifyToken, async (req, res, next) => {
  try {
    const acceptance = await prisma.termAcceptance.findUnique({
      where: {
        term_id_user_id: {
          term_id: (req.params.id as string),
          user_id: req.user!.id,
        },
      },
    });
    res.json({ accepted: !!acceptance, acceptance });
  } catch (err) {
    next(err);
  }
});

export default router;
