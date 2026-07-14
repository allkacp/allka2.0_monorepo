import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken, requireRole } from "../middleware/auth";
import { validate, parsePagination } from "../middleware/validate";
import { resolveMyPartnerId } from "../lib/project-scope";

const router = Router();

const createSchema = z.object({
  name: z.string().min(1),
  cnpj: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  status: z.string().default("ativo"),
  segment: z.string().optional(),
  address: z.string().optional(),
  description: z.string().optional(),
  logo: z.string().optional(),
  website: z.string().optional(),
  // Commercial contact
  commercial_contact_name: z.string().optional(),
  commercial_contact_role: z.string().optional(),
  commercial_contact_email: z.string().email().optional().or(z.literal("")),
  commercial_contact_phone: z.string().optional(),
  commercial_contact_whatsapp: z.string().optional(),
  commercial_contact_preferred_channel: z.string().optional(),
  commercial_contact_notes: z.string().optional(),
  // Financial contact
  financial_contact_name: z.string().optional(),
  financial_contact_role: z.string().optional(),
  financial_contact_email: z.string().email().optional().or(z.literal("")),
  financial_contact_phone: z.string().optional(),
  financial_contact_whatsapp: z.string().optional(),
  financial_contact_preferred_channel: z.string().optional(),
  financial_contact_notes: z.string().optional(),
  financial_contact_user_id: z.string().optional(),
  use_master_as_financial_fallback: z.boolean().optional(),
});

const updateSchema = createSchema.partial();

const COMPANY_COUNT_SELECT = { _count: { select: { members: true, projects: true, invoices: true } } } as const;

// Resposta HTTP deste router sempre expôs a contagem de usuários sob
// "_count.users" (consumido por apps/frontend/app/admin/empresas/page.tsx:890
// via c._count?.users) — a relação Prisma virou "members" (ver
// schema.prisma), mas o contrato externo desta rota não muda.
function withUsersCountAlias<T extends { _count: { members: number; projects: number; invoices: number } }>(
  company: T,
): Omit<T, "_count"> & { _count: { users: number; projects: number; invoices: number } } {
  const { members, ...restCount } = company._count;
  return { ...company, _count: { ...restCount, users: members } };
}

// GET /api/clients
router.get("/", verifyToken, async (req, res, next) => {
  try {
    const { role, account_type, id: userId } = req.user!;

    // Company users see only their own company
    if (account_type === "empresas") {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { company_id: true } });
      if (!user?.company_id) {
        res.json({ data: [], total: 0, page: 1, limit: 10 });
        return;
      }
      const company = await prisma.company.findUnique({
        where: { id: user.company_id },
        include: COMPANY_COUNT_SELECT,
      });
      const data = company ? [withUsersCountAlias(company)] : [];
      res.json({ data, total: company ? 1 : 0, page: 1, limit: 1 });
      return;
    }

    // Agency users see only companies that have projects linked to their agency
    if (account_type === "agencias") {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { agency_link: { select: { name: true } } },
      });
      const agencyName = user?.agency_link?.name;
      if (!agencyName) {
        res.json({ data: [], total: 0, page: 1, limit: 20 });
        return;
      }
      const { page, limit, skip } = parsePagination(req.query);
      const search = req.query.search as string | undefined;

      // Get distinct client_ids from projects of this agency
      const agencyProjects = await prisma.project.findMany({
        where: { agency: agencyName, client_id: { not: null } },
        select: { client_id: true },
        distinct: ["client_id"],
      });
      const clientIds = agencyProjects.map((p) => p.client_id as string);

      if (clientIds.length === 0) {
        res.json({ data: [], total: 0, page: 1, limit });
        return;
      }

      const where: Record<string, unknown> = { id: { in: clientIds } };
      if (search) {
        where["AND"] = [
          { id: { in: clientIds } },
          {
            OR: [
              { name: { contains: search } },
              { email: { contains: search } },
              { cnpj: { contains: search } },
            ],
          },
        ];
        delete where["id"];
      }

      const [total, rawData] = await Promise.all([
        prisma.company.count({ where }),
        prisma.company.findMany({
          where,
          include: COMPANY_COUNT_SELECT,
          skip,
          take: limit,
          orderBy: { name: "asc" },
        }),
      ]);

      res.json({ data: rawData.map(withUsersCountAlias), total, page, limit });
      return;
    }

    // Partner users see only companies referred by them
    if (account_type === "parceiro") {
      const myPartnerId = await resolveMyPartnerId(prisma, userId);
      if (!myPartnerId) {
        res.json({ data: [], total: 0, page: 1, limit: 20 });
        return;
      }
      const { page, limit, skip } = parsePagination(req.query);
      const search = req.query.search as string | undefined;
      const where: Record<string, unknown> = { referred_by_partner_id: myPartnerId };
      if (search) {
        where["AND"] = [
          { referred_by_partner_id: myPartnerId },
          { OR: [{ name: { contains: search } }, { cnpj: { contains: search } }] },
        ];
        delete where["referred_by_partner_id"];
      }
      const [total, rawData] = await Promise.all([
        prisma.company.count({ where }),
        prisma.company.findMany({ where, include: COMPANY_COUNT_SELECT, skip, take: limit, orderBy: { name: "asc" } }),
      ]);
      res.json({ data: rawData.map(withUsersCountAlias), total, page, limit });
      return;
    }

    // Non-admin, non-company accounts cannot list companies
    if (role !== "admin") {
      res.status(403).json({ error: "Acesso não autorizado" });
      return;
    }

    // Admin: full paginated listing
    const { page, limit, skip } = parsePagination(req.query);
    const search = req.query.search as string | undefined;
    const status = req.query.status as string | undefined;

    const where: Record<string, unknown> = {};
    if (search) {
      where["OR"] = [
        { name: { contains: search } },
        { email: { contains: search } },
        { cnpj: { contains: search } },
      ];
    }
    if (status) where["status"] = status;

    const [total, rawData] = await Promise.all([
      prisma.company.count({ where }),
      prisma.company.findMany({
        where,
        include: COMPANY_COUNT_SELECT,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
      }),
    ]);

    res.json({ data: rawData.map(withUsersCountAlias), total, page, limit });
  } catch (err) {
    next(err);
  }
});

// GET /api/clients/:id
router.get("/:id", verifyToken, async (req, res, next) => {
  try {
    const { role, account_type, id: userId } = req.user!;

    // Company users can only see their own company
    if (account_type === "empresas") {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { company_id: true } });
      if (!user?.company_id || user.company_id !== req.params.id) {
        res.status(403).json({ error: "Acesso não autorizado" });
        return;
      }
    } else if (role !== "admin") {
      res.status(403).json({ error: "Acesso não autorizado" });
      return;
    }

    const company = await prisma.company.findUnique({
      where: { id: req.params.id as string },
      include: { _count: { select: { members: true, projects: true, invoices: true } } },
    });

    if (!company) {
      res.status(404).json({ error: "Empresa não encontrada" });
      return;
    }

    res.json(withUsersCountAlias(company));
  } catch (err) {
    next(err);
  }
});

// GET /api/clients/:id/summary — project counts by status + user roster,
// used by the "more info" panel on the admin companies table.
router.get("/:id/summary", verifyToken, async (req, res, next) => {
  try {
    const { role, account_type, id: userId } = req.user!;
    const companyId = req.params.id as string;

    if (account_type === "empresas") {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { company_id: true } });
      if (!user?.company_id || user.company_id !== companyId) {
        res.status(403).json({ error: "Acesso não autorizado" });
        return;
      }
    } else if (role !== "admin") {
      res.status(403).json({ error: "Acesso não autorizado" });
      return;
    }

    const [projectsByStatus, users] = await Promise.all([
      prisma.project.groupBy({
        by: ["status"],
        where: { client_id: companyId },
        _count: { id: true },
      }),
      prisma.user.findMany({
        where: { company_id: companyId },
        select: { id: true, name: true, email: true, role: true, is_active: true, last_login: true },
        orderBy: [{ is_active: "desc" }, { name: "asc" }],
      }),
    ]);

    const projects = {
      total: projectsByStatus.reduce((acc, r) => acc + r._count.id, 0),
      byStatus: Object.fromEntries(
        projectsByStatus.map((r) => [r.status, r._count.id]),
      ),
    };

    res.json({ projects, users });
  } catch (err) {
    next(err);
  }
});

function normalizeCNPJ(cnpj: string): string {
  return cnpj.replace(/\D/g, "");
}

// Whitespace-trimmed duplicate check for company name. MySQL's default
// collation (utf8mb4_unicode_ci) already compares `=` case-insensitively,
// so a plain equals is enough here (Prisma's `mode: "insensitive"` is a
// Postgres/Mongo-only option and isn't supported on the MySQL provider).
// Excludes `excludeId` so an update doesn't collide with the record itself.
async function findDuplicateNameId(name: string, excludeId?: string): Promise<string | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const match = await prisma.company.findFirst({
    where: {
      name: { equals: trimmed },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
  return match?.id ?? null;
}

function handleCompanyUniqueError(err: any, res: any): boolean {
  if (err?.code !== "P2002") return false;
  const targets = (Array.isArray(err?.meta?.target) ? err.meta.target : [err?.meta?.target ?? ""]) as string[];
  if (targets.some((f: string) => f.includes("cnpj"))) {
    res.status(409).json({ error: "Este CNPJ já está cadastrado" });
    return true;
  }
  if (targets.some((f: string) => f.includes("email"))) {
    res.status(409).json({ error: "Este e-mail já está cadastrado" });
    return true;
  }
  return false;
}

// POST /api/clients — admin only
router.post(
  "/",
  verifyToken,
  requireRole("admin"),
  validate(createSchema),
  async (req, res, next) => {
    try {
      if (await findDuplicateNameId(req.body.name)) {
        res.status(409).json({ error: "Já existe uma empresa cadastrada com este nome" });
        return;
      }
      if (req.body.cnpj) {
        const raw = normalizeCNPJ(req.body.cnpj);
        // Check both raw and formatted variants to catch normalized duplicates
        const dup = await prisma.company.findFirst({
          where: { OR: [{ cnpj: raw }, { cnpj: req.body.cnpj }] },
          select: { id: true },
        });
        if (dup) {
          res.status(409).json({ error: "Já existe um cliente cadastrado com este CNPJ" });
          return;
        }
        req.body.cnpj = raw;
      }
      const company = await prisma.company.create({ data: req.body });
      res.status(201).json(company);
    } catch (err: any) {
      if (handleCompanyUniqueError(err, res)) return;
      next(err);
    }
  },
);

// PUT /api/clients/:id — admin only
router.put(
  "/:id",
  verifyToken,
  requireRole("admin"),
  validate(updateSchema),
  async (req, res, next) => {
    try {
      if (
        req.body.name &&
        (await findDuplicateNameId(req.body.name, req.params.id as string))
      ) {
        res.status(409).json({ error: "Já existe uma empresa cadastrada com este nome" });
        return;
      }
      if (req.body.cnpj) {
        req.body.cnpj = normalizeCNPJ(req.body.cnpj);
      }
      const company = await prisma.company.update({
        where: { id: req.params.id as string },
        data: req.body,
      });
      res.json(company);
    } catch (err: any) {
      if (handleCompanyUniqueError(err, res)) return;
      next(err);
    }
  },
);

// DELETE /api/clients/:id — admin only
router.delete("/:id", verifyToken, requireRole("admin"), async (req, res, next) => {
  try {
    await prisma.company.delete({ where: { id: req.params.id as string } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// ─── Payment Methods ──────────────────────────────────────────────────────────

// GET /api/clients/:id/payment-methods
router.get("/:id/payment-methods", verifyToken, async (req, res, next) => {
  try {
    const methods = await prisma.companyPaymentMethod.findMany({
      where: { company_id: req.params.id as string, is_active: true },
      orderBy: [{ is_default: "desc" }, { created_at: "asc" }],
    });
    // Mask holder_name for client cards (only agency-owned cards show full name)
    const sanitized = methods.map((m) => ({
      ...m,
      holder_name: m.is_client_card ? "•••• Titular Externo" : m.holder_name,
    }));
    res.json(sanitized);
  } catch (err) {
    next(err);
  }
});

const paymentMethodSchema = z.object({
  brand: z.string().min(1),
  last_four: z.string().length(4),
  expiry: z.string().regex(/^\d{2}\/\d{4}$/),
  holder_name: z.string().min(1),
  is_default: z.boolean().optional(),
  is_client_card: z.boolean().optional(),
  label: z.string().optional(),
});

// POST /api/clients/:id/payment-methods
router.post(
  "/:id/payment-methods",
  verifyToken,
  validate(paymentMethodSchema),
  async (req, res, next) => {
    try {
      const { is_default, ...rest } = req.body;
      // If setting as default, unset all others first
      if (is_default) {
        await prisma.companyPaymentMethod.updateMany({
          where: { company_id: req.params.id as string, is_active: true },
          data: { is_default: false },
        });
      }
      const method = await prisma.companyPaymentMethod.create({
        data: {
          ...rest,
          company_id: req.params.id,
          is_default: is_default ?? false,
        },
      });
      res.status(201).json(method);
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /api/clients/:id/payment-methods/:pmId/default
router.patch(
  "/:id/payment-methods/:pmId/default",
  verifyToken,
  async (req, res, next) => {
    try {
      await prisma.companyPaymentMethod.updateMany({
        where: { company_id: req.params.id as string, is_active: true },
        data: { is_default: false },
      });
      const method = await prisma.companyPaymentMethod.update({
        where: { id: req.params.pmId as string },
        data: { is_default: true },
      });
      res.json(method);
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/clients/:id/payment-methods/:pmId
router.delete(
  "/:id/payment-methods/:pmId",
  verifyToken,
  async (req, res, next) => {
    try {
      await prisma.companyPaymentMethod.update({
        where: { id: req.params.pmId as string },
        data: { is_active: false },
      });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

export default router;
