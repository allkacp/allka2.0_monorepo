import { Router, type Request, type Response, type NextFunction } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../middleware/auth";
import { validate, parsePagination } from "../middleware/validate";
import { generateNextUserCode } from "../lib/user-code";
import { resolveMyAgencyId } from "../lib/project-scope";

// Fluxo self-service: uma Agency cria/gerencia os próprios usuários
// (colaboradores). Sempre escopado à agência do usuário logado — nunca
// aceita agency_id vindo do frontend. Espelha company-users.ts (Tarefa 10).
const router = Router();

// Único role atribuível via self-service — nunca agency_admin (impede
// autopromoção e criação de um segundo principal por esse caminho).
const AGENCY_ASSIGNABLE_ROLES = ["agency_user"] as const;

// Só agency_admin gerencia a equipe — agency_user recebe 403.
function requireAgencyAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.account_type !== "agencias" || req.user?.role !== "agency_admin") {
    res.status(403).json({ error: "Acesso restrito ao administrador da agência" });
    return;
  }
  next();
}

// Resolve o owner_user_id da Agency — usado pra impedir que o admin
// bloqueie o próprio usuário principal.
async function resolveAgencyOwnerUserId(agencyId: string): Promise<string | null> {
  const a = await prisma.agency.findUnique({ where: { id: agencyId }, select: { owner_user_id: true } });
  return a?.owner_user_id ?? null;
}

const createSchema = z.object({
  name: z.string().min(1, "name é obrigatório"),
  email: z.string().email(),
  password: z.string().min(6, "password precisa ter ao menos 6 caracteres"),
  role: z.enum(AGENCY_ASSIGNABLE_ROLES).default("agency_user"),
});

// Sem agency_id/account_type/user_code de propósito — o zod descarta
// qualquer chave não declarada, então mesmo que o cliente envie esses
// campos, eles nunca chegam no handler.
const updateSchema = z.object({
  name: z.string().min(1, "name não pode ficar vazio").optional(),
  role: z.enum(AGENCY_ASSIGNABLE_ROLES).optional(),
  is_active: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

const agencyUserSelect = {
  id: true,
  user_code: true,
  name: true,
  email: true,
  role: true,
  account_type: true,
  is_active: true,
  agency_id: true,
  created_at: true,
  agency_link: { select: { id: true, name: true } },
} as const;

function toDTO(u: {
  id: string;
  user_code: string | null;
  name: string;
  email: string;
  role: string;
  account_type: string;
  is_active: boolean;
  agency_id: string | null;
  created_at: Date;
  agency_link: { id: string; name: string } | null;
}) {
  return {
    id: u.id,
    user_code: u.user_code,
    name: u.name,
    email: u.email,
    role: u.role,
    account_type: u.account_type,
    is_active: u.is_active,
    agency_id: u.agency_id,
    agency_name: u.agency_link?.name ?? null,
    created_at: u.created_at,
  };
}

// GET /api/agency/users — lista só os usuários da própria agência
router.get("/", verifyToken, requireAgencyAdmin, async (req, res, next) => {
  try {
    const agencyId = await resolveMyAgencyId(prisma, req.user!.id);
    if (!agencyId) {
      res.status(403).json({ error: "Usuário sem agência vinculada" });
      return;
    }

    const { page, limit, skip } = parsePagination(req.query);
    const search = req.query.search as string | undefined;

    const where: Record<string, unknown> = { agency_id: agencyId };
    if (search) {
      where["OR"] = [{ name: { contains: search } }, { email: { contains: search } }];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: agencyUserSelect,
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

// POST /api/agency/users — cria um usuário sempre vinculado à agência do
// usuário logado (agency_id nunca vem do body).
router.post("/", verifyToken, requireAgencyAdmin, validate(createSchema), async (req, res, next) => {
  try {
    const agencyId = await resolveMyAgencyId(prisma, req.user!.id);
    if (!agencyId) {
      res.status(403).json({ error: "Usuário sem agência vinculada — não é possível criar colaboradores" });
      return;
    }

    const { name, email, password, role } = req.body as {
      name: string;
      email: string;
      password: string;
      role: (typeof AGENCY_ASSIGNABLE_ROLES)[number];
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
          account_type: "agencias",
          agency_id: agencyId,
          is_active: true,
          user_code,
        },
        select: agencyUserSelect,
      });
    });

    res.status(201).json(toDTO(created));
  } catch (err) {
    next(err);
  }
});

// PUT /api/agency/users/:id — só edita usuário da própria agência; nunca
// altera agency_id/account_type/user_code (fora do schema de validação).
router.put("/:id", verifyToken, requireAgencyAdmin, validate(updateSchema), async (req, res, next) => {
  try {
    const agencyId = await resolveMyAgencyId(prisma, req.user!.id);
    if (!agencyId) {
      res.status(403).json({ error: "Usuário sem agência vinculada" });
      return;
    }

    const target = await prisma.user.findUnique({
      where: { id: req.params.id as string },
      select: { id: true, agency_id: true },
    });
    if (!target || target.agency_id !== agencyId) {
      res.status(404).json({ error: "Usuário não encontrado" });
      return;
    }

    const { password, ...rest } = req.body as {
      name?: string;
      role?: (typeof AGENCY_ASSIGNABLE_ROLES)[number];
      is_active?: boolean;
      password?: string;
    };

    if (rest.is_active === false) {
      const ownerUserId = await resolveAgencyOwnerUserId(agencyId);
      if (ownerUserId && target.id === ownerUserId) {
        res.status(403).json({ error: "Não é possível bloquear o usuário principal da agência" });
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
      select: agencyUserSelect,
    });

    res.json(toDTO(updated));
  } catch (err) {
    next(err);
  }
});

export default router;
