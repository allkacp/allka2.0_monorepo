import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();

// ── Schemas ───────────────────────────────────────────────────────────────────

const listSchema = z.object({
  type: z.string().optional(),
  severity: z.enum(["info", "warning", "error"]).optional(),
  is_read: z
    .string()
    .optional()
    .transform((v) =>
      v === "true" ? true : v === "false" ? false : undefined,
    ),
  entity_type: z.string().optional(),
  entity_id: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// ── GET /api/system-alerts ────────────────────────────────────────────────────

router.get(
  "/",
  verifyToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = listSchema.safeParse(req.query);
      if (!query.success) {
        res
          .status(400)
          .json({
            error: "Parâmetros inválidos",
            details: query.error.flatten(),
          });
        return;
      }

      const { type, severity, is_read, entity_type, entity_id, limit, offset } =
        query.data;

      const where: Record<string, unknown> = {};
      if (type) where.type = type;
      if (severity) where.severity = severity;
      if (is_read !== undefined) where.is_read = is_read;
      if (entity_type) where.entity_type = entity_type;
      if (entity_id) where.entity_id = entity_id;

      const [total, alerts] = await Promise.all([
        prisma.systemAlert.count({ where }),
        prisma.systemAlert.findMany({
          where,
          orderBy: { created_at: "desc" },
          take: limit,
          skip: offset,
        }),
      ]);

      res.json({
        data: alerts,
        total,
        unread: await prisma.systemAlert.count({
          where: { ...where, is_read: false },
        }),
      });
    } catch (err) {
      next(err);
    }
  },
);

// ── GET /api/system-alerts/unread-count ──────────────────────────────────────

router.get(
  "/unread-count",
  verifyToken,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const count = await prisma.systemAlert.count({
        where: { is_read: false },
      });
      res.json({ count });
    } catch (err) {
      next(err);
    }
  },
);

// ── PATCH /api/system-alerts/:id/read ────────────────────────────────────────

router.patch(
  "/:id/read",
  verifyToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const alert = await prisma.systemAlert.findUnique({
        where: { id: req.params.id as string },
      });
      if (!alert) {
        res.status(404).json({ error: "Alerta não encontrado" });
        return;
      }
      const updated = await prisma.systemAlert.update({
        where: { id: req.params.id as string },
        data: { is_read: true, read_at: new Date() },
      });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

// ── PATCH /api/system-alerts/read-all ────────────────────────────────────────

router.patch(
  "/read-all",
  verifyToken,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await prisma.systemAlert.updateMany({
        where: { is_read: false },
        data: { is_read: true, read_at: new Date() },
      });
      res.json({ updated: result.count });
    } catch (err) {
      next(err);
    }
  },
);

// ── DELETE /api/system-alerts/:id ────────────────────────────────────────────

router.delete(
  "/:id",
  verifyToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await prisma.systemAlert.delete({
        where: { id: req.params.id as string },
      });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

export default router;
