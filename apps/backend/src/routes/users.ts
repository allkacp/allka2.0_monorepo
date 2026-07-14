import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken, requireRole } from "../middleware/auth";
import { validate, parsePagination } from "../middleware/validate";
import { generateNextUserCode } from "../lib/user-code";

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
  // Nome da organização (Agency/Company) sendo criada — distinto do nome do
  // usuário principal. Opcional por retrocompatibilidade com chamadores que
  // ainda não enviam isto (nesse caso cai no fallback antigo: nome do
  // usuário). Sem efeito para account_type=parceiro (PartnerProfile não tem
  // campo de nome próprio — o nome exibido sempre vem do User vinculado).
  organization_name: z.string().min(1).optional(),
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
  user_code: true,
  email: true,
  username: true,
  name: true,
  role: true,
  account_type: true,
  is_active: true,
  avatar: true,
  phone: true,
  company_id: true,
  agency_id: true,
  partner_id: true,
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
  parceiro: "partner_admin",
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
        organization_name,
        ...rest
      } = req.body as {
        password: string;
        role: string;
        account_type: string;
        company_id?: string;
        organization_name?: string;
        [key: string]: unknown;
      };

      const password_hash = await bcrypt.hash(password, 10);

      // Normalize role: usa o role explícito quando ele não é o default "não
      // informado" do zod (company_user); caso contrário, decide pelo
      // company_id, não pelo valor ambíguo de rawRole — zod sempre entrega
      // "company_user" quando o chamador não manda nada, então usar
      // "rawRole === company_user" pra decidir "é uma empresa nova?" (bug
      // real encontrado na Tarefa 9: toda empresa nova virava company_user
      // órfão, sem Company nenhuma criada, porque a condição nunca batia).
      // Com company_id presente → adicionando a uma empresa existente,
      // default company_user. Sem company_id → fundando organização nova,
      // default é sempre o *_admin daquele account_type.
      const resolvedRole =
        rawRole && rawRole !== "company_user"
          ? rawRole
          : company_id
            ? (rawRole || "company_user")
            : (DEFAULT_ROLE[account_type] || rawRole || "company_user");

      const user = await prisma.$transaction(async (tx) => {
        // 1. Create the User record
        const user_code = await generateNextUserCode(tx);
        const created = await tx.user.create({
          data: {
            ...(rest as object),
            account_type,
            role: resolvedRole,
            password_hash,
            user_code,
            ...(company_id ? { company_id } : {}),
          } as Parameters<typeof tx.user.create>[0]["data"],
          select: { ...safeSelect, id: true },
        });

        // 2. Create the profile entity matching account_type, and — pro
        // usuário principal, que é sempre criado atomicamente junto com a
        // organização — o vínculo de membro (User.agency_id/company_id/
        // partner_id) é preenchido na mesma transação. É esse vínculo, não
        // a propriedade (owner_user_id), que passa a definir o escopo de
        // acesso (ver resolveMyAgencyId/resolveMyPartnerId).
        if (account_type === "agencias") {
          const existing = await tx.agency.findUnique({ where: { owner_user_id: created.id } });
          const agency =
            existing ??
            (await tx.agency.create({
              data: {
                owner_user_id: created.id,
                name: organization_name || (rest.name as string) || "Nova Agência",
                email: rest.email as string | undefined,
                status: "ativo",
                partner_level: "bronze",
              },
            }));
          await tx.user.update({ where: { id: created.id }, data: { agency_id: agency.id } });
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
          const existing = await tx.partnerProfile.findUnique({ where: { owner_user_id: created.id } });
          const partner =
            existing ??
            (await tx.partnerProfile.create({
              data: {
                owner_user_id: created.id,
                status: "pending",
                balance: 0,
                total_earned: 0,
                total_withdrawn: 0,
              },
            }));
          await tx.user.update({ where: { id: created.id }, data: { partner_id: partner.id } });
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
          // Create a new Company for company_admin users without an existing company link.
          // owner_user_id marca o usuário principal (propriedade); company_id
          // no User marca o vínculo de membro (escopo) — o mesmo usuário
          // recebe os dois, já que é ele quem acabou de fundar a empresa.
          const company = await tx.company.create({
            data: {
              owner_user_id: created.id,
              name: organization_name || (rest.name as string) || "Nova Empresa",
              email: rest.email as string | undefined,
              status: "ativo",
            },
          });
          await tx.user.update({
            where: { id: created.id },
            data: { company_id: company.id },
          });
        }

        return tx.user.findUnique({ where: { id: created.id }, select: safeSelect });
      });

      res.status(201).json(user);
    } catch (err: any) {
      if (err?.code === "P2002") {
        const field = err?.meta?.target as string | string[] | undefined;
        const targets = Array.isArray(field) ? field : [field ?? ""];
        if (targets.some((f) => f.includes("email"))) {
          res.status(409).json({ error: "Este e-mail já está cadastrado" });
          return;
        }
        if (targets.some((f) => f.includes("username"))) {
          res.status(409).json({ error: "Este usuário já está cadastrado" });
          return;
        }
        if (targets.some((f) => f.includes("cpf"))) {
          res.status(409).json({ error: "Este CPF já está cadastrado" });
          return;
        }
        res.status(409).json({ error: "Registro duplicado" });
        return;
      }
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
