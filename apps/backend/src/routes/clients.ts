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
  number: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional(),
  pix_key: z.string().optional(),
  pix_key_type: z.string().optional(),
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
      const clientIds = new Set(agencyProjects.map((p) => p.client_id as string));

      // Se a agência do usuário também é Partner ativo, some as companies
      // que ela referiu como Partner (referred_by_partner_id) — antes era
      // um account_type "parceiro" separado com sua própria listagem; agora
      // é só mais uma fonte de client_ids pra mesma Agency.
      const myPartnerId = await resolveMyPartnerId(prisma, userId);
      if (myPartnerId) {
        const referred = await prisma.company.findMany({
          where: { referred_by_partner_id: myPartnerId },
          select: { id: true },
        });
        referred.forEach((c) => clientIds.add(c.id));
      }

      if (clientIds.size === 0) {
        res.json({ data: [], total: 0, page: 1, limit });
        return;
      }

      const clientIdList = Array.from(clientIds);
      const where: Record<string, unknown> = { id: { in: clientIdList } };
      if (search) {
        where["AND"] = [
          { id: { in: clientIdList } },
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

// GET /api/clients/archives/:sequenceNumber — admin only
// Consulta o histórico de Companies já excluídas que usaram este número
// sequencial (pode haver mais de uma ao longo do tempo, se o número foi
// reaproveitado várias vezes) — mais recente primeiro. Precisa vir ANTES de
// GET /:id abaixo, senão "archives" seria capturado como :id.
router.get(
  "/archives/:sequenceNumber",
  verifyToken,
  requireRole("admin"),
  async (req, res, next) => {
    try {
      const sequence_number = parseInt(req.params.sequenceNumber as string, 10);
      const archives = await prisma.companyArchive.findMany({
        where: { sequence_number },
        orderBy: { deleted_at: "desc" },
      });
      res.json(
        archives.map((a) => ({
          ...a,
          snapshot: JSON.parse(a.snapshot),
          users_snapshot: JSON.parse(a.users_snapshot),
        })),
      );
    } catch (err) {
      next(err);
    }
  },
);

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

const deleteUserActionSchema = z.object({
  userId: z.string(),
  action: z.enum(["delete", "unlink", "suspend"]),
});
const deleteCompanySchema = z.object({
  userActions: z.array(deleteUserActionSchema).default([]),
});

// DELETE /api/clients/:id — admin only
// Company <-> User has a circular FK (Company.owner_user_id -> User,
// User.company_id -> Company), and User rows linked via company_id
// (@@relation("CompanyMembers")) have no cascade — so a bare
// prisma.company.delete() fails with P2003 the moment the company has its
// (mandatory) first company_admin user. Break the cycle explicitly.
//
// Before deleting, snapshot the company (+ linked users, project/invoice
// counts) into CompanyArchive, and apply the admin's chosen action to each
// linked user (delete / unlink / suspend — see deleteUserActionSchema).
// The freed sequence_number goes into CompanyFreedSequence so a future
// Company can reuse it (see claimFreedSequenceNumber in company-sequence.ts).
router.delete("/:id", verifyToken, requireRole("admin"), async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const parsed = deleteCompanySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: "userActions inválido", details: parsed.error.issues });
      return;
    }
    const { userActions } = parsed.data;
    const actionByUserId = new Map(userActions.map((a) => [a.userId, a.action]));

    const company = await prisma.company.findUnique({ where: { id } });
    if (!company) {
      res.status(404).json({ error: "Empresa não encontrada" });
      return;
    }

    const members = await prisma.user.findMany({ where: { company_id: id } });
    const [projectsCount, invoicesCount] = await Promise.all([
      prisma.project.count({ where: { OR: [{ client_id: id }, { company_id: id }] } }),
      prisma.invoice.count({ where: { company_id: id } }),
    ]);

    const usersSnapshot = members.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      is_active: u.is_active,
      action: actionByUserId.get(u.id) ?? "unlink",
    }));

    await prisma.$transaction(async (tx) => {
      await tx.companyArchive.create({
        data: {
          sequence_number: company.sequence_number,
          original_company_id: company.id,
          name: company.name,
          snapshot: JSON.stringify(company),
          users_snapshot: JSON.stringify(usersSnapshot),
          projects_count: projectsCount,
          invoices_count: invoicesCount,
          deleted_by_user_id: req.user?.id,
        },
      });

      for (const member of members) {
        const action = actionByUserId.get(member.id) ?? "unlink";
        if (action === "delete") {
          await tx.user.delete({ where: { id: member.id } });
        } else if (action === "suspend") {
          await tx.user.update({
            where: { id: member.id },
            data: { company_id: null, is_active: false },
          });
        } else {
          await tx.user.update({ where: { id: member.id }, data: { company_id: null } });
        }
      }

      await tx.company.update({ where: { id }, data: { owner_user_id: null } });
      await tx.company.delete({ where: { id } });
      await tx.companyFreedSequence.create({ data: { sequence_number: company.sequence_number } });
    });

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
