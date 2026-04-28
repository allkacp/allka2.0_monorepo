import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken, requireRole } from "../middleware/auth";
import { validate, parsePagination } from "../middleware/validate";

const router = Router();

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  username: z.string().optional(),
  role: z.string().default("company_user"),
  account_type: z.string().default("empresas"),
  phone: z.string().optional(),
  avatar: z.string().optional(),
  company_id: z.string().optional(),
});

const updateUserSchema = createUserSchema
  .partial()
  .omit({ password: true })
  .extend({
    password: z.string().min(6).optional(),
    is_active: z.boolean().optional(),
  });

const safeSelect = {
  id: true,
  email: true,
  username: true,
  name: true,
  role: true,
  account_type: true,
  is_active: true,
  avatar: true,
  phone: true,
  company_id: true,
  last_login: true,
  created_at: true,
  updated_at: true,
};

// GET /api/users
router.get("/", verifyToken, async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const search = req.query.search as string | undefined;

    const where = search
      ? {
          OR: [
            { name: { contains: search } },
            { email: { contains: search } },
          ],
        }
      : {};

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: safeSelect,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
      }),
    ]);

    res.json({ data: users, total, page, limit });
  } catch (err) {
    next(err);
  }
});

// GET /api/users/:id
router.get("/:id", verifyToken, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: safeSelect,
    });

    if (!user) {
      res.status(404).json({ error: "Usuário não encontrado" });
      return;
    }

    res.json(user);
  } catch (err) {
    next(err);
  }
});

// POST /api/users
router.post(
  "/",
  verifyToken,
  requireRole("admin"),
  validate(createUserSchema),
  async (req, res, next) => {
    try {
      const { password, ...rest } = req.body as {
        password: string;
        [key: string]: unknown;
      };
      const password_hash = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: { ...(rest as object), password_hash } as Parameters<
          typeof prisma.user.create
        >[0]["data"],
        select: safeSelect,
      });

      res.status(201).json(user);
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/users/:id
router.put("/:id", verifyToken, validate(updateUserSchema), async (req, res, next) => {
  try {
    const { password, ...rest } = req.body as {
      password?: string;
      [key: string]: unknown;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: Record<string, any> = { ...rest };
    if (password) {
      data["password_hash"] = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: safeSelect,
    });

    res.json(user);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/users/:id
router.delete(
  "/:id",
  verifyToken,
  requireRole("admin"),
  async (req, res, next) => {
    try {
      await prisma.user.delete({ where: { id: req.params.id } });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

export default router;
