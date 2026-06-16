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
    const company_id = req.query.company_id as string | undefined;
    const account_type = req.query.account_type as string | undefined;
    const role = req.query.role as string | undefined;

    const where: Record<string, unknown> = {};
    if (search) {
      where["OR"] = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }
    if (company_id) where["company_id"] = company_id;
    if (account_type) where["account_type"] = account_type;
    if (role) where["role"] = role;

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
      where: { id: (req.params.id as string) },
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

// ─── Role defaults per account_type ─────────────────────────────────────────

const DEFAULT_ROLE: Record<string, string> = {
  agencias: "agency_admin",
  empresas: "company_admin",
  nomades:  "nomad",
  parceiro: "partner",
  lider:    "lider",
  admin:    "admin",
};

// POST /api/users
router.post(
  "/",
  verifyToken,
  requireRole("admin"),
  validate(createUserSchema),
  async (req, res, next) => {
    try {
      const {
        password,
        role: rawRole,
        account_type,
        company_id,
        ...rest
      } = req.body as {
        password: string;
        role: string;
        account_type: string;
        company_id?: string;
        [key: string]: unknown;
      };

      const password_hash = await bcrypt.hash(password, 10);

      // Normalize role: use provided role if compatible; otherwise use default for account_type
      const resolvedRole =
        rawRole && rawRole !== "company_user"
          ? rawRole
          : (account_type === "empresas" && (rawRole === "company_user" || company_id))
            ? (rawRole || DEFAULT_ROLE[account_type] || "company_user")
            : (DEFAULT_ROLE[account_type] || rawRole || "company_user");

      const user = await prisma.$transaction(async (tx) => {
        // 1. Create the User record
        const created = await tx.user.create({
          data: {
            ...(rest as object),
            account_type,
            role: resolvedRole,
            password_hash,
            ...(company_id ? { company_id } : {}),
          } as Parameters<typeof tx.user.create>[0]["data"],
          select: { ...safeSelect, id: true },
        });

        // 2. Create the profile entity matching account_type
        if (account_type === "agencias") {
          const existing = await tx.agency.findUnique({ where: { user_id: created.id } });
          if (!existing) {
            await tx.agency.create({
              data: {
                user_id: created.id,
                name: (rest.name as string) || "Nova Agência",
                email: rest.email as string | undefined,
                status: "ativo",
                partner_level: "bronze",
              },
            });
          }
        } else if (account_type === "nomades") {
          const existing = await tx.nomade.findUnique({ where: { user_id: created.id } });
          if (!existing) {
            await tx.nomade.create({
              data: {
                user_id: created.id,
                name: (rest.name as string) || "Novo Nômade",
                email: rest.email as string,
                status: "aguardando_aprovacao",
              },
            });
          }
        } else if (account_type === "parceiro") {
          const existing = await tx.partnerProfile.findUnique({ where: { user_id: created.id } });
          if (!existing) {
            await tx.partnerProfile.create({
              data: {
                user_id: created.id,
                status: "pending",
                balance: 0,
                total_earned: 0,
                total_withdrawn: 0,
              },
            });
          }
        } else if (account_type === "lider") {
          const existing = await tx.liderArea.findFirst({ where: { user_id: created.id } });
          if (!existing) {
            await tx.liderArea.create({
              data: {
                user_id: created.id,
                area_nome: "Geral",
                ativo: true,
                categorias_permitidas: JSON.stringify([]),
                produtos_permitidos: JSON.stringify([]),
              },
            });
          }
        } else if (account_type === "empresas" && !company_id && resolvedRole !== "company_user") {
          // Create a new Company for company_admin users without an existing company link
          const company = await tx.company.create({
            data: {
              name: (rest.name as string) || "Nova Empresa",
              email: rest.email as string | undefined,
              status: "ativo",
            },
          });
          await tx.user.update({
            where: { id: created.id },
            data: { company_id: company.id },
          });
          return tx.user.findUnique({ where: { id: created.id }, select: safeSelect });
        }

        return tx.user.findUnique({ where: { id: created.id }, select: safeSelect });
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
      where: { id: (req.params.id as string) },
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
      await prisma.user.delete({ where: { id: (req.params.id as string) } });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

export default router;
