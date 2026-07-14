import { Router, type Request, type Response, type NextFunction } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../middleware/auth";
import { validate, parsePagination } from "../middleware/validate";
import { generateNextUserCode } from "../lib/user-code";
import { resolveMyPartnerId } from "../lib/project-scope";

// Fluxo self-service: um Partner cria/gerencia os próprios usuários
// (colaboradores). Sempre escopado ao partner do usuário logado — nunca
// aceita partner_id vindo do frontend. Espelha company-users.ts (Tarefa 10).
const router = Router();

// Único role atribuível via self-service — nunca partner_admin.
const PARTNER_ASSIGNABLE_ROLES = ["partner_user"] as const;

// Só partner_admin gerencia a equipe — partner_user recebe 403.
function requirePartnerAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.account_type !== "parceiro" || req.user?.role !== "partner_admin") {
    res.status(403).json({ error: "Acesso restrito ao administrador do parceiro" });
    return;
  }
  next();
}

// Resolve o owner_user_id do PartnerProfile — usado pra impedir que o admin
// bloqueie o próprio usuário principal.
async function resolvePartnerOwnerUserId(partnerId: string): Promise<string | null> {
  const p = await prisma.partnerProfile.findUnique({ where: { id: partnerId }, select: { owner_user_id: true } });
  return p?.owner_user_id ?? null;
}

const createSchema = z.object({
  name: z.string().min(1, "name é obrigatório"),
  email: z.string().email(),
  password: z.string().min(6, "password precisa ter ao menos 6 caracteres"),
  role: z.enum(PARTNER_ASSIGNABLE_ROLES).default("partner_user"),
});

// Sem partner_id/account_type/user_code de propósito — o zod descarta
// qualquer chave não declarada, então mesmo que o cliente envie esses
// campos, eles nunca chegam no handler.
const updateSchema = z.object({
  name: z.string().min(1, "name não pode ficar vazio").optional(),
  role: z.enum(PARTNER_ASSIGNABLE_ROLES).optional(),
  is_active: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

const partnerUserSelect = {
  id: true,
  user_code: true,
  name: true,
  email: true,
  role: true,
  account_type: true,
  is_active: true,
  partner_id: true,
  created_at: true,
  partner_link: { select: { id: true } },
} as const;

function toDTO(u: {
  id: string;
  user_code: string | null;
  name: string;
  email: string;
  role: string;
  account_type: string;
  is_active: boolean;
  partner_id: string | null;
  created_at: Date;
  partner_link: { id: string } | null;
}) {
  return {
    id: u.id,
    user_code: u.user_code,
    name: u.name,
    email: u.email,
    role: u.role,
    account_type: u.account_type,
    is_active: u.is_active,
    partner_id: u.partner_id,
    created_at: u.created_at,
  };
}

// GET /api/partner/users — lista só os usuários do próprio partner
router.get("/", verifyToken, requirePartnerAdmin, async (req, res, next) => {
  try {
    const partnerId = await resolveMyPartnerId(prisma, req.user!.id);
    if (!partnerId) {
      res.status(403).json({ error: "Usuário sem partner vinculado" });
      return;
    }

    const { page, limit, skip } = parsePagination(req.query);
    const search = req.query.search as string | undefined;

    const where: Record<string, unknown> = { partner_id: partnerId };
    if (search) {
      where["OR"] = [{ name: { contains: search } }, { email: { contains: search } }];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: partnerUserSelect,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
      }),
    ]);

    res.json({ data: users.map(toDTO), total, page, limit });
  } catch (err) {
    next(err);
  }
});

// POST /api/partner/users — cria um usuário sempre vinculado ao partner do
// usuário logado (partner_id nunca vem do body).
router.post("/", verifyToken, requirePartnerAdmin, validate(createSchema), async (req, res, next) => {
  try {
    const partnerId = await resolveMyPartnerId(prisma, req.user!.id);
    if (!partnerId) {
      res.status(403).json({ error: "Usuário sem partner vinculado — não é possível criar colaboradores" });
      return;
    }

    const { name, email, password, role } = req.body as {
      name: string;
      email: string;
      password: string;
      role: (typeof PARTNER_ASSIGNABLE_ROLES)[number];
    };

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: "Este e-mail já está cadastrado" });
      return;
    }

    const password_hash = await bcrypt.hash(password, 10);

    const created = await prisma.$transaction(async (tx) => {
      const user_code = await generateNextUserCode(tx);
      return tx.user.create({
        data: {
          name,
          email,
          password_hash,
          role,
          account_type: "parceiro",
          partner_id: partnerId,
          is_active: true,
          user_code,
        },
        select: partnerUserSelect,
      });
    });

    res.status(201).json(toDTO(created));
  } catch (err) {
    next(err);
  }
});

// PUT /api/partner/users/:id — só edita usuário do próprio partner; nunca
// altera partner_id/account_type/user_code (fora do schema de validação).
router.put("/:id", verifyToken, requirePartnerAdmin, validate(updateSchema), async (req, res, next) => {
  try {
    const partnerId = await resolveMyPartnerId(prisma, req.user!.id);
    if (!partnerId) {
      res.status(403).json({ error: "Usuário sem partner vinculado" });
      return;
    }

    const target = await prisma.user.findUnique({
      where: { id: req.params.id as string },
      select: { id: true, partner_id: true },
    });
    if (!target || target.partner_id !== partnerId) {
      res.status(404).json({ error: "Usuário não encontrado" });
      return;
    }

    const { password, ...rest } = req.body as {
      name?: string;
      role?: (typeof PARTNER_ASSIGNABLE_ROLES)[number];
      is_active?: boolean;
      password?: string;
    };

    if (rest.is_active === false) {
      const ownerUserId = await resolvePartnerOwnerUserId(partnerId);
      if (ownerUserId && target.id === ownerUserId) {
        res.status(403).json({ error: "Não é possível bloquear o usuário principal do parceiro" });
        return;
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: Record<string, any> = { ...rest };
    if (password) {
      data["password_hash"] = await bcrypt.hash(password, 10);
    }

    const updated = await prisma.user.update({
      where: { id: target.id },
      data,
      select: partnerUserSelect,
    });

    res.json(toDTO(updated));
  } catch (err) {
    next(err);
  }
});

export default router;
