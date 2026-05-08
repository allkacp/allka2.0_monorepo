import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();

const profileSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  is_master: z.boolean().default(false),
  is_active: z.boolean().default(true),
});

const permissionSchema = z.object({
  profile_id: z.string().min(1),
  module: z.string().min(1),
  action: z.enum(["view", "edit", "create", "delete", "not_applicable"]),
  resource: z.string().optional(),
});

// GET /api/permissions/profiles
router.get("/profiles", verifyToken, requireRole("admin"), async (_req, res, next) => {
  try {
    const profiles = await prisma.adminProfile.findMany({
      include: {
        permissions: true,
        _count: { select: { permissions: true } },
      },
      orderBy: { name: "asc" },
    });
    res.json(profiles);
  } catch (err) {
    next(err);
  }
});

// GET /api/permissions/profiles/:id
router.get("/profiles/:id", verifyToken, requireRole("admin"), async (req, res, next) => {
  try {
    const profile = await prisma.adminProfile.findUnique({
      where: { id: (((req.params.id as string) as string) as string) },
      include: { permissions: true },
    });
    if (!profile) {
      res.status(404).json({ error: "Perfil não encontrado" });
      return;
    }
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

// POST /api/permissions/profiles
router.post("/profiles", verifyToken, requireRole("admin"), validate(profileSchema), async (req, res, next) => {
  try {
    const profile = await prisma.adminProfile.create({ data: req.body });
    res.status(201).json(profile);
  } catch (err) {
    next(err);
  }
});

// PUT /api/permissions/profiles/:id
router.put("/profiles/:id", verifyToken, requireRole("admin"), validate(profileSchema.partial()), async (req, res, next) => {
  try {
    const profile = await prisma.adminProfile.update({
      where: { id: (((req.params.id as string) as string) as string) },
      data: req.body,
      include: { permissions: true },
    });
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/permissions/profiles/:id
router.delete("/profiles/:id", verifyToken, requireRole("admin"), async (req, res, next) => {
  try {
    await prisma.adminProfile.delete({ where: { id: (((req.params.id as string) as string) as string) } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// POST /api/permissions
router.post("/", verifyToken, requireRole("admin"), validate(permissionSchema), async (req, res, next) => {
  try {
    const permission = await prisma.adminPermission.create({ data: req.body });
    res.status(201).json(permission);
  } catch (err) {
    next(err);
  }
});

// PUT /api/permissions/profiles/:id/permissions — bulk replace
router.put(
  "/profiles/:id/permissions",
  verifyToken,
  requireRole("admin"),
  validate(z.object({ permissions: z.array(permissionSchema.omit({ profile_id: true })) })),
  async (req, res, next) => {
    try {
      const { permissions } = req.body as {
        permissions: { module: string; action: string; resource?: string }[];
      };

      await prisma.$transaction([
        prisma.adminPermission.deleteMany({ where: { profile_id: (((req.params.id as string) as string) as string) } }),
        prisma.adminPermission.createMany({
          data: permissions.map((p) => ({ ...p, profile_id: (((req.params.id as string) as string) as string) })),
        }),
      ]);

      const profile = await prisma.adminProfile.findUnique({
        where: { id: (((req.params.id as string) as string) as string) },
        include: { permissions: true },
      });

      res.json(profile);
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/permissions/:id
router.delete("/:id", verifyToken, requireRole("admin"), async (req, res, next) => {
  try {
    await prisma.adminPermission.delete({ where: { id: (((req.params.id as string) as string) as string) } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
