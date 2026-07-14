import { Router, type Request, type Response, type NextFunction } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../middleware/auth";
import { validate, parsePagination } from "../middleware/validate";
import { generateNextUserCode } from "../lib/user-code";

// Fluxo self-service: uma Company cria/gerencia os próprios usuários
// (colaboradores). Sempre escopado à empresa do usuário logado — nunca
// aceita company_id vindo do frontend. Vínculo/desvínculo/troca de empresa
// é exclusivo do Admin (ver PUT /api/admin/users/:id/link).
const router = Router();

// Roles que uma Company pode atribuir aos próprios usuários. Deliberadamente
// não inclui company_admin aqui — restringe o self-service ao mínimo que já
// tem sentido (usuário comum / financeiro), evitando uma empresa promover
// alguém a admin da própria conta sem esse fluxo ter sido pedido.
const COMPANY_ASSIGNABLE_ROLES = ["company_user", "company_financial"] as const;

// Só company_admin gerencia a equipe — company_user/company_financial
// recebem 403 (Tarefa 10). account_type sozinho não basta mais: um
// subusuário comum também tem account_type="empresas".
function requireCompanyAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.account_type !== "empresas" || req.user?.role !== "company_admin") {
    res.status(403).json({ error: "Acesso restrito ao administrador da empresa" });
    return;
  }
  next();
}

// Resolve a empresa do usuário logado — nunca confia em company_id enviado
// pelo cliente. Retorna null se o usuário empresa não tiver vínculo (caso
// de usuário desvinculado pelo Admin).
async function resolveCallerCompanyId(userId: string): Promise<string | null> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { company_id: true } });
  return u?.company_id ?? null;
}

// Resolve o owner_user_id da Company — usado pra impedir que o admin
// bloqueie o próprio usuário principal (Tarefa 10).
async function resolveCompanyOwnerUserId(companyId: string): Promise<string | null> {
  const c = await prisma.company.findUnique({ where: { id: companyId }, select: { owner_user_id: true } });
  return c?.owner_user_id ?? null;
}

const createSchema = z.object({
  name: z.string().min(1, "name é obrigatório"),
  email: z.string().email(),
  password: z.string().min(6, "password precisa ter ao menos 6 caracteres"),
  role: z.enum(COMPANY_ASSIGNABLE_ROLES).default("company_user"),
});

// Sem company_id/account_type/user_code de propósito — o schema do zod
// descarta qualquer chave não declarada (safeParse), então mesmo que o
// cliente envie esses campos, eles nunca chegam no handler.
const updateSchema = z.object({
  name: z.string().min(1, "name não pode ficar vazio").optional(),
  role: z.enum(COMPANY_ASSIGNABLE_ROLES).optional(),
  is_active: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

const companyUserSelect = {
  id: true,
  user_code: true,
  name: true,
  email: true,
  role: true,
  account_type: true,
  is_active: true,
  company_id: true,
  created_at: true,
  company: { select: { id: true, name: true } },
} as const;

function toDTO(u: {
  id: string;
  user_code: string | null;
  name: string;
  email: string;
  role: string;
  account_type: string;
  is_active: boolean;
  company_id: string | null;
  created_at: Date;
  company: { id: string; name: string } | null;
}) {
  return {
    id: u.id,
    user_code: u.user_code,
    name: u.name,
    email: u.email,
    role: u.role,
    account_type: u.account_type,
    is_active: u.is_active,
    company_id: u.company_id,
    company_name: u.company?.name ?? null,
    created_at: u.created_at,
  };
}

// GET /api/company/users — lista só os usuários da própria empresa
router.get("/", verifyToken, requireCompanyAdmin, async (req, res, next) => {
  try {
    const companyId = await resolveCallerCompanyId(req.user!.id);
    if (!companyId) {
      res.status(403).json({ error: "Usuário sem empresa vinculada" });
      return;
    }

    const { page, limit, skip } = parsePagination(req.query);
    const search = req.query.search as string | undefined;

    const where: Record<string, unknown> = { company_id: companyId };
    if (search) {
      where["OR"] = [{ name: { contains: search } }, { email: { contains: search } }];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: companyUserSelect,
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

// POST /api/company/users — cria um usuário sempre vinculado à empresa do
// usuário logado (company_id nunca vem do body).
router.post("/", verifyToken, requireCompanyAdmin, validate(createSchema), async (req, res, next) => {
  try {
    const companyId = await resolveCallerCompanyId(req.user!.id);
    if (!companyId) {
      res.status(403).json({ error: "Usuário sem empresa vinculada — não é possível criar colaboradores" });
      return;
    }

    const { name, email, password, role } = req.body as {
      name: string;
      email: string;
      password: string;
      role: (typeof COMPANY_ASSIGNABLE_ROLES)[number];
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
          account_type: "empresas",
          company_id: companyId,
          is_active: true,
          user_code,
        },
        select: companyUserSelect,
      });
    });

    res.status(201).json(toDTO(created));
  } catch (err) {
    next(err);
  }
});

// PUT /api/company/users/:id — só edita usuário da própria empresa; nunca
// altera company_id/account_type/user_code (fora do schema de validação).
router.put("/:id", verifyToken, requireCompanyAdmin, validate(updateSchema), async (req, res, next) => {
  try {
    const companyId = await resolveCallerCompanyId(req.user!.id);
    if (!companyId) {
      res.status(403).json({ error: "Usuário sem empresa vinculada" });
      return;
    }

    const target = await prisma.user.findUnique({
      where: { id: req.params.id as string },
      select: { id: true, company_id: true },
    });
    if (!target || target.company_id !== companyId) {
      res.status(404).json({ error: "Usuário não encontrado" });
      return;
    }

    const { password, ...rest } = req.body as {
      name?: string;
      role?: (typeof COMPANY_ASSIGNABLE_ROLES)[number];
      is_active?: boolean;
      password?: string;
    };

    if (rest.is_active === false) {
      const ownerUserId = await resolveCompanyOwnerUserId(companyId);
      if (ownerUserId && target.id === ownerUserId) {
        res.status(403).json({ error: "Não é possível bloquear o usuário principal da empresa" });
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
      select: companyUserSelect,
    });

    res.json(toDTO(updated));
  } catch (err) {
    next(err);
  }
});

export default router;
