import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../middleware/auth";
import { validate, parsePagination } from "../middleware/validate";
import { gerarTarefasDoProjeto } from "../lib/generate-tasks";

const router = Router();

// ─── Project scope helpers ───────────────────────────────────────────────────

type ProjectScope =
  | { kind: "admin" }
  | { kind: "open" }
  | { kind: "agency"; agencyName: string }
  | { kind: "agency_unlinked" }
  | { kind: "company"; companyId: string }
  | { kind: "company_unlinked" }
  | { kind: "partner"; companyIds: string[] }
  | { kind: "partner_unlinked" };

async function getProjectScope(
  userId: string,
  accountType: string,
): Promise<ProjectScope> {
  if (accountType === "admin") return { kind: "admin" };

  if (accountType === "agencias") {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { agency: { select: { name: true } } },
    });
    const agencyName = user?.agency?.name;
    if (!agencyName) return { kind: "agency_unlinked" };
    return { kind: "agency", agencyName };
  }

  if (accountType === "empresas") {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { company_id: true },
    });
    if (!user?.company_id) return { kind: "company_unlinked" };
    return { kind: "company", companyId: user.company_id };
  }

  if (accountType === "parceiro") {
    const profile = await prisma.partnerProfile.findUnique({
      where: { user_id: userId },
      select: { referred_companies: { select: { id: true } } },
    });
    const companyIds = profile?.referred_companies?.map((c) => c.id) ?? [];
    if (companyIds.length === 0) return { kind: "partner_unlinked" };
    return { kind: "partner", companyIds };
  }

  return { kind: "open" };
}

function scopeToWhere(scope: ProjectScope): Record<string, unknown> | null {
  if (
    scope.kind === "company_unlinked" ||
    scope.kind === "agency_unlinked" ||
    scope.kind === "partner_unlinked"
  )
    return null;
  if (scope.kind === "agency") return { agency: scope.agencyName };
  if (scope.kind === "company") return { client_id: scope.companyId };
  if (scope.kind === "partner") return { client_id: { in: scope.companyIds } };
  return {};
}

function projectInScope(
  scope: ProjectScope,
  project: { agency: string | null; client_id: string | null },
): boolean {
  if (scope.kind === "admin" || scope.kind === "open") return true;
  if (
    scope.kind === "company_unlinked" ||
    scope.kind === "agency_unlinked" ||
    scope.kind === "partner_unlinked"
  )
    return false;
  if (scope.kind === "agency") return project.agency === scope.agencyName;
  if (scope.kind === "company") return project.client_id === scope.companyId;
  if (scope.kind === "partner")
    return scope.companyIds.includes(project.client_id ?? "");
  return false;
}

// ─── New structured scope (agency_id/company_id/partner_id) ────────────────
// Roda em paralelo ao escopo legado acima — nada do código anterior foi
// alterado. Projetos antigos (sem esses 3 campos) continuam visíveis só
// pelo escopo legado; projetos novos passam a usar isto também. No máximo
// um dos três é preenchido por projeto (regra aplicada no POST/PUT /link,
// não em constraint de banco — mesmo padrão do ClientLink).
function isAdminUser(user?: { role?: string; account_type?: string }): boolean {
  return user?.role === "admin" || user?.account_type === "admin";
}
function isLeaderUser(user?: { role?: string; account_type?: string }): boolean {
  return user?.role === "lider" || user?.account_type === "lider";
}

type NewProjectScope =
  | { kind: "agency"; agencyId: string }
  | { kind: "company"; companyId: string }
  | { kind: "partner"; partnerId: string }
  | { kind: "none" };

async function resolveProjectNewScope(
  userId: string,
  accountType: string,
): Promise<NewProjectScope> {
  if (accountType === "agencias") {
    const agency = await prisma.agency.findFirst({ where: { user_id: userId }, select: { id: true } });
    return agency ? { kind: "agency", agencyId: agency.id } : { kind: "none" };
  }
  if (accountType === "empresas") {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { company_id: true } });
    return user?.company_id ? { kind: "company", companyId: user.company_id } : { kind: "none" };
  }
  if (accountType === "parceiro") {
    const profile = await prisma.partnerProfile.findUnique({ where: { user_id: userId }, select: { id: true } });
    return profile ? { kind: "partner", partnerId: profile.id } : { kind: "none" };
  }
  return { kind: "none" };
}

function newScopeToWhere(scope: NewProjectScope): Record<string, unknown> | null {
  if (scope.kind === "agency") return { agency_id: scope.agencyId };
  if (scope.kind === "company") return { company_id: scope.companyId };
  if (scope.kind === "partner") return { partner_id: scope.partnerId };
  return null;
}

// Visibilidade combinada (legado OR novo) pra endpoints de projeto único
// (GET/:id, PUT/:id, /:id/files, /:id/credentials).
async function projectVisibleToUser(
  user: { id: string; account_type?: string; role?: string },
  project: {
    agency: string | null;
    client_id: string | null;
    agency_id?: string | null;
    company_id?: string | null;
    partner_id?: string | null;
  },
): Promise<boolean> {
  const scope = await getProjectScope(user.id, user.account_type ?? "");
  if (projectInScope(scope, project)) return true;
  const newScope = await resolveProjectNewScope(user.id, user.account_type ?? "");
  if (newScope.kind === "agency") return project.agency_id === newScope.agencyId;
  if (newScope.kind === "company") return project.company_id === newScope.companyId;
  if (newScope.kind === "partner") return project.partner_id === newScope.partnerId;
  return false;
}

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  client_id: z.string().optional(),
  // Escopo novo — só o Admin pode enviar isso no body (ver POST /); pra
  // Agency/Company/Partner é sempre auto-resolvido e o que vier aqui é
  // ignorado.
  agency_id: z.string().optional(),
  company_id: z.string().optional(),
  partner_id: z.string().optional(),
  status: z
    .enum([
      "draft",
      "negotiation",
      "pending-approval",
      "awaiting-payment",
      "planning",
      "in-progress",
      "paused",
      "completed",
      "cancelled",
    ])
    .default("draft"),
  lifecycle: z.enum(["avulso", "mensal"]).default("avulso"),
  type: z.string().optional(),
  value: z.number().min(0).default(0),
  budget: z.number().min(0).default(0),
  spent: z.number().min(0).default(0),
  progress: z.number().min(0).max(100).default(0),
  agency: z.string().optional(),
  company_type: z.enum(["company", "agency", "nomad"]).optional(),
  consultant: z.string().optional(),
  consultant_email: z.string().optional(),
  team_size: z.number().min(0).default(0),
  nomades: z.string().optional(),
  bitrix_sync: z.boolean().default(false),
  portfolio_permission: z.boolean().default(false),
  overdue: z.boolean().default(false),
  from_lead: z.boolean().default(false),
  billing_day: z.number().optional(),
  billing_start_date: z.string().optional(),
  start_date: z.preprocess(
    (v) => (!v || v === "" ? undefined : v),
    z.string().optional(),
  ),
  end_date: z.preprocess(
    (v) => (!v || v === "" ? undefined : v),
    z.string().optional(),
  ),
});

const updateSchema = createSchema.partial();

// GET /api/projects/check-name — check if a project name is already in use
router.get("/check-name", verifyToken, async (req, res, next) => {
  try {
    const title = req.query.title as string | undefined;
    const client_id = req.query.client_id as string | undefined;
    const agency = req.query.agency as string | undefined;
    const exclude_id = req.query.exclude_id as string | undefined;

    if (!title?.trim()) {
      res.status(400).json({ error: "title é obrigatório" });
      return;
    }

    const where: Record<string, unknown> = { title };
    if (client_id) where.client_id = client_id;
    if (agency) where.agency = agency;
    if (exclude_id) where.id = { not: exclude_id };

    const existing = await prisma.project.findFirst({ where, select: { id: true, title: true } });
    res.json({ exists: !!existing });
  } catch (err) {
    next(err);
  }
});

// GET /api/projects
router.get("/", verifyToken, async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const status = req.query.status as string | undefined;
    const client_id = req.query.client_id as string | undefined;
    const search = req.query.search as string | undefined;

    const scope = await getProjectScope(req.user!.id, req.user!.account_type);
    const scopeWhere = scopeToWhere(scope);
    // Escopo novo roda em paralelo — projeto aparece se bater em QUALQUER
    // um dos dois (legado OR novo). Não afeta admin/leader (scope "open"),
    // que já viam tudo sem filtro.
    const newScope = await resolveProjectNewScope(req.user!.id, req.user!.account_type);
    const newWhere = newScopeToWhere(newScope);

    let where: Record<string, unknown>;
    if (scope.kind === "admin" || scope.kind === "open") {
      where = {};
    } else if (scopeWhere === null && newWhere === null) {
      res.json({ data: [], total: 0, page, limit });
      return;
    } else {
      const orConditions = [scopeWhere, newWhere].filter(
        (w): w is Record<string, unknown> => w !== null,
      );
      where = orConditions.length > 1 ? { OR: orConditions } : orConditions[0];
    }
    if (status) where["status"] = status;
    if (search) where["title"] = { contains: search };
    // client_id filter is only applied for admin/open — scoped users already have their scope locked
    if (client_id && (scope.kind === "admin" || scope.kind === "open")) {
      where["client_id"] = client_id;
    }

    const [total, data] = await Promise.all([
      prisma.project.count({ where }),
      prisma.project.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              cnpj: true,
              referred_by_partner_id: true,
              referred_by_partner: {
                select: { user: { select: { id: true, name: true } } },
              },
            },
          },
          products: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  category: true,
                  base_price: true,
                  image: true,
                },
              },
              variation: {
                select: { id: true, name: true, price: true },
              },
            },
            orderBy: { created_at: "asc" },
          },
          _count: { select: { task_executions: true } },
          agency_owner: { select: { id: true, name: true } },
          company_owner: { select: { id: true, name: true } },
          partner_owner: { select: { id: true, user: { select: { name: true } } } },
        },
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
      }),
    ]);

    // Compute global sequence number: oldest project = 1, newest = N (stable when new projects added)
    // Uses Prisma (no raw SQL) so it works in both SQLite (dev) and MySQL (prod)
    let seqMap: Record<string, number> = {};
    if (data.length > 0) {
      const allProjectIds = await prisma.project.findMany({
        select: { id: true },
        orderBy: [{ created_at: "asc" }, { id: "asc" }],
      });
      allProjectIds.forEach((p, i) => { seqMap[p.id] = i + 1; });
    }

    // Build set of client_ids that belong to partner-referred companies (direct DB query, no join dependency)
    const clientIdsInPage = [...new Set(data.map((p) => p.client_id).filter(Boolean))] as string[];
    const partnerReferredSet = new Set<string>();
    const partnerOwnerMap = new Map<string, string>(); // client_id → partner user name
    if (clientIdsInPage.length > 0) {
      const referredCompanies = await prisma.company.findMany({
        where: { id: { in: clientIdsInPage }, referred_by_partner_id: { not: null } },
        select: {
          id: true,
          referred_by_partner: { select: { user: { select: { name: true } } } },
        },
      });
      for (const c of referredCompanies) {
        partnerReferredSet.add(c.id);
        if (c.referred_by_partner?.user?.name) {
          partnerOwnerMap.set(c.id, c.referred_by_partner.user.name);
        }
      }
    }

    const enriched = data.map((p: any) => {
      // Escopo novo tem prioridade de exibição quando presente (projeto
      // criado já no sistema novo); senão cai no cálculo legado de sempre.
      const ownerType: "agency" | "company" | "partner" | null = p.agency_id
        ? "agency"
        : p.company_id
          ? "company"
          : p.partner_id
            ? "partner"
            : p.agency
              ? "agency"
              : partnerReferredSet.has(p.client_id ?? "")
                ? "partner"
                : p.client_id
                  ? "company"
                  : null;

      const ownerName: string | null = p.agency_id
        ? (p.agency_owner?.name ?? null)
        : p.company_id
          ? (p.company_owner?.name ?? null)
          : p.partner_id
            ? (p.partner_owner?.user?.name ?? null)
            : p.agency
              ? p.agency
              : ownerType === "partner"
                ? (partnerOwnerMap.get(p.client_id!) ?? (p.client as any)?.name ?? null)
                : (p.client as any)?.name ?? null;

      return {
        ...p,
        _seq: seqMap[p.id] ?? null,
        _hasOwner: !!(p.agency || p.client_id || p.agency_id || p.company_id || p.partner_id),
        _ownerType: ownerType,
        _ownerName: ownerName,
      };
    });
    res.json({ data: enriched, total, page, limit });
  } catch (err) {
    next(err);
  }
});

// GET /api/projects/:id
router.get("/:id", verifyToken, async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id as string },
      include: {
        client: true,
        products: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                category: true,
                base_price: true,
                image: true,
              },
            },
            variation: {
              select: { id: true, name: true, price: true },
            },
          },
          orderBy: { created_at: "asc" },
        },
        _count: { select: { task_executions: true, invoices: true } },
      },
    });

    if (!project) {
      res.status(404).json({ error: "Projeto não encontrado" });
      return;
    }

    if (!(await projectVisibleToUser(req.user!, project))) {
      res.status(403).json({ error: "Acesso negado" });
      return;
    }

    res.json(project);
  } catch (err) {
    next(err);
  }
});

// GET /api/projects/:id/files  — all task attachments for a project, grouped
router.get("/:id/files", verifyToken, async (req, res, next) => {
  try {
    const parent = await prisma.project.findUnique({
      where: { id: req.params.id as string },
      select: { agency: true, client_id: true, agency_id: true, company_id: true, partner_id: true },
    });
    if (!parent) {
      res.status(404).json({ error: "Projeto não encontrado" });
      return;
    }
    if (!(await projectVisibleToUser(req.user!, parent))) {
      res.status(403).json({ error: "Acesso negado" });
      return;
    }

    const attachments = await prisma.taskAttachment.findMany({
      where: { project_task: { project_id: req.params.id as string } },
      include: {
        project_task: {
          select: {
            id: true,
            title: true,
            status: true,
            project_product: {
              select: {
                id: true,
                product_name_snapshot: true,
                status: true,
              },
            },
          },
        },
      },
      orderBy: { created_at: "asc" },
    });

    const enriched = attachments.map((a) => ({
      id: a.id,
      name: a.name,
      url: a.url,
      type: a.type,
      mime_type: a.mime_type,
      size: a.size,
      uploaded_by: a.uploaded_by,
      observations: a.observations,
      created_at: a.created_at,
      task: a.project_task
        ? {
            id: a.project_task.id,
            title: a.project_task.title,
            status: a.project_task.status,
          }
        : null,
      product: a.project_task?.project_product
        ? {
            id: a.project_task.project_product.id,
            name: a.project_task.project_product.product_name_snapshot,
            status: a.project_task.project_product.status,
          }
        : null,
      isApproved:
        a.type === "delivery" &&
        a.project_task?.status === "CONCLUIDA",
    }));

    const initialFiles = enriched.filter((a) => a.type === "reference");
    const internalFiles = enriched.filter((a) => a.type === "file");
    const deliveries = enriched.filter((a) => a.type === "delivery");
    const approvedFiles = enriched.filter((a) => a.isApproved);

    res.json({
      summary: {
        total: enriched.length,
        initial: initialFiles.length,
        internal: internalFiles.length,
        deliveries: deliveries.length,
        approved: approvedFiles.length,
      },
      initialFiles,
      internalFiles,
      deliveries,
      approvedFiles,
      allFiles: enriched,
    });
  } catch (err) {
    next(err);
  }
});

// ─── Credential helpers ──────────────────────────────────────────────────────

async function getCredentialOwned(credentialId: string, projectId: string) {
  return prisma.projectCredential.findFirst({
    where: { id: credentialId, project_id: projectId },
  });
}

async function logCredentialAction(
  credentialId: string,
  action: string,
  actorType: string,
  actorId: string,
  details?: string,
) {
  await prisma.projectCredentialAccessLog.create({
    data: {
      credential_id: credentialId,
      action,
      actor_type: actorType,
      actor_user_id: actorType === "user" ? actorId : null,
      actor_nomad_id: actorType === "nomad" ? actorId : null,
      details: details ?? null,
    },
  });
}

// GET /api/projects/:id/credentials
router.get("/:id/credentials", verifyToken, async (req, res, next) => {
  try {
    const parent = await prisma.project.findUnique({
      where: { id: req.params.id as string },
      select: { agency: true, client_id: true, agency_id: true, company_id: true, partner_id: true },
    });
    if (!parent) {
      res.status(404).json({ error: "Projeto não encontrado" });
      return;
    }
    if (!(await projectVisibleToUser(req.user!, parent))) {
      res.status(403).json({ error: "Acesso negado" });
      return;
    }

    const credentials = await prisma.projectCredential.findMany({
      where: { project_id: req.params.id as string },
      include: {
        project_task: { select: { id: true, title: true, status: true } },
        project_product: {
          select: { id: true, product_name_snapshot: true, status: true },
        },
      },
      orderBy: { created_at: "asc" },
    });

    const enriched = credentials.map((c) => ({
      id: c.id,
      title: c.title,
      service: c.service,
      url: c.url,
      username: c.username,
      password_demo: c.password_demo,
      notes: c.notes,
      category: c.category,
      status: c.status,
      is_demo: c.is_demo,
      requires_rotation: c.requires_rotation,
      rotation_reason: c.rotation_reason,
      last_rotated_at: c.last_rotated_at,
      expires_at: c.expires_at,
      shared_until: c.shared_until,
      shared_with_user_id: c.shared_with_user_id,
      shared_with_nomad_id: c.shared_with_nomad_id,
      created_by: c.created_by,
      created_at: c.created_at,
      updated_at: c.updated_at,
      task: c.project_task
        ? {
            id: c.project_task.id,
            title: c.project_task.title,
            status: c.project_task.status,
          }
        : null,
      product: c.project_product
        ? {
            id: c.project_product.id,
            name: c.project_product.product_name_snapshot,
            status: c.project_product.status,
          }
        : null,
    }));

    const summary = {
      total: enriched.length,
      active: enriched.filter((c) => c.status === "active").length,
      shared: enriched.filter((c) => c.status === "shared").length,
      expired: enriched.filter((c) => c.status === "expired").length,
      rotationRequired: enriched.filter(
        (c) => c.status === "rotation_required" || c.requires_rotation,
      ).length,
      demo: enriched.filter((c) => c.is_demo).length,
    };

    res.json({ summary, credentials: enriched });
  } catch (err) {
    next(err);
  }
});

// POST /api/projects/:id/credentials
router.post("/:id/credentials", verifyToken, async (req, res, next) => {
  try {
    const parent = await prisma.project.findUnique({
      where: { id: req.params.id as string },
      select: { agency: true, client_id: true, agency_id: true, company_id: true, partner_id: true },
    });
    if (!parent) {
      res.status(404).json({ error: "Projeto não encontrado" });
      return;
    }
    if (!(await projectVisibleToUser(req.user!, parent))) {
      res.status(403).json({ error: "Acesso negado" });
      return;
    }

    const {
      title,
      service,
      url,
      username,
      password_demo,
      notes,
      category,
      status,
      project_task_id,
      project_product_id,
      expires_at,
    } = req.body;

    if (!title?.trim()) {
      res.status(400).json({ error: "title é obrigatório" });
      return;
    }

    if (password_demo && !String(password_demo).includes("DEMO")) {
      res
        .status(400)
        .json({ error: "Em ambiente demo, a senha deve conter 'DEMO'" });
      return;
    }

    const credential = await prisma.projectCredential.create({
      data: {
        project_id: req.params.id as string,
        project_task_id: project_task_id ?? null,
        project_product_id: project_product_id ?? null,
        title,
        service: service ?? null,
        url: url ?? null,
        username: username ?? null,
        password_demo: password_demo ?? null,
        notes: notes ?? null,
        category: category ?? "other",
        status: status ?? "active",
        is_demo: true,
        created_by: req.user!.id,
        expires_at: expires_at ? new Date(expires_at) : null,
      },
    });

    await logCredentialAction(credential.id, "created", "user", req.user!.id);
    res.status(201).json(credential);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/projects/:id/credentials/:credentialId
router.patch(
  "/:id/credentials/:credentialId",
  verifyToken,
  async (req, res, next) => {
    try {
      const parent = await prisma.project.findUnique({
        where: { id: req.params.id as string },
        select: { agency: true, client_id: true },
      });
      if (!parent) {
        res.status(404).json({ error: "Projeto não encontrado" });
        return;
      }
      const scope = await getProjectScope(req.user!.id, req.user!.account_type);
      if (!projectInScope(scope, parent)) {
        res.status(403).json({ error: "Acesso negado" });
        return;
      }

      const existing = await getCredentialOwned(
        req.params.credentialId as string,
        req.params.id as string,
      );
      if (!existing) {
        res.status(404).json({ error: "Credencial não encontrada" });
        return;
      }

      const {
        title,
        service,
        url,
        username,
        password_demo,
        notes,
        category,
        status,
        project_task_id,
        project_product_id,
        requires_rotation,
        rotation_reason,
        expires_at,
      } = req.body;

      const updated = await prisma.projectCredential.update({
        where: { id: req.params.credentialId as string },
        data: {
          ...(title !== undefined && { title }),
          ...(service !== undefined && { service }),
          ...(url !== undefined && { url }),
          ...(username !== undefined && { username }),
          ...(password_demo !== undefined && { password_demo }),
          ...(notes !== undefined && { notes }),
          ...(category !== undefined && { category }),
          ...(status !== undefined && { status }),
          ...(project_task_id !== undefined && { project_task_id }),
          ...(project_product_id !== undefined && { project_product_id }),
          ...(requires_rotation !== undefined && { requires_rotation }),
          ...(rotation_reason !== undefined && { rotation_reason }),
          ...(expires_at !== undefined && {
            expires_at: expires_at ? new Date(expires_at) : null,
          }),
        },
      });

      await logCredentialAction(
        req.params.credentialId as string,
        "edited",
        "user",
        req.user!.id,
      );
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/projects/:id/credentials/:credentialId — soft delete (archive)
router.delete(
  "/:id/credentials/:credentialId",
  verifyToken,
  async (req, res, next) => {
    try {
      const parent = await prisma.project.findUnique({
        where: { id: req.params.id as string },
        select: { agency: true, client_id: true },
      });
      if (!parent) {
        res.status(404).json({ error: "Projeto não encontrado" });
        return;
      }
      const scope = await getProjectScope(req.user!.id, req.user!.account_type);
      if (!projectInScope(scope, parent)) {
        res.status(403).json({ error: "Acesso negado" });
        return;
      }

      const existing = await getCredentialOwned(
        req.params.credentialId as string,
        req.params.id as string,
      );
      if (!existing) {
        res.status(404).json({ error: "Credencial não encontrada" });
        return;
      }

      const archived = await prisma.projectCredential.update({
        where: { id: req.params.credentialId as string },
        data: { status: "archived" },
      });

      await logCredentialAction(
        req.params.credentialId as string,
        "archived",
        "user",
        req.user!.id,
      );
      res.json(archived);
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/projects/:id/credentials/:credentialId/share
router.post(
  "/:id/credentials/:credentialId/share",
  verifyToken,
  async (req, res, next) => {
    try {
      const parent = await prisma.project.findUnique({
        where: { id: req.params.id as string },
        select: { agency: true, client_id: true },
      });
      if (!parent) {
        res.status(404).json({ error: "Projeto não encontrado" });
        return;
      }
      const scope = await getProjectScope(req.user!.id, req.user!.account_type);
      if (!projectInScope(scope, parent)) {
        res.status(403).json({ error: "Acesso negado" });
        return;
      }

      const existing = await getCredentialOwned(
        req.params.credentialId as string,
        req.params.id as string,
      );
      if (!existing) {
        res.status(404).json({ error: "Credencial não encontrada" });
        return;
      }

      const { shared_with_user_id, shared_with_nomad_id, shared_until } =
        req.body;
      if (!shared_with_user_id && !shared_with_nomad_id) {
        res.status(400).json({
          error: "Informe shared_with_user_id ou shared_with_nomad_id",
        });
        return;
      }

      const updated = await prisma.projectCredential.update({
        where: { id: req.params.credentialId as string },
        data: {
          status: "shared",
          shared_with_user_id: shared_with_user_id ?? null,
          shared_with_nomad_id: shared_with_nomad_id ?? null,
          shared_until: shared_until ? new Date(shared_until) : null,
        },
      });

      await logCredentialAction(
        req.params.credentialId as string,
        "shared",
        "user",
        req.user!.id,
        JSON.stringify({ shared_with_user_id, shared_with_nomad_id, shared_until }),
      );
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/projects/:id/credentials/:credentialId/revoke
router.post(
  "/:id/credentials/:credentialId/revoke",
  verifyToken,
  async (req, res, next) => {
    try {
      const parent = await prisma.project.findUnique({
        where: { id: req.params.id as string },
        select: { agency: true, client_id: true },
      });
      if (!parent) {
        res.status(404).json({ error: "Projeto não encontrado" });
        return;
      }
      const scope = await getProjectScope(req.user!.id, req.user!.account_type);
      if (!projectInScope(scope, parent)) {
        res.status(403).json({ error: "Acesso negado" });
        return;
      }

      const existing = await getCredentialOwned(
        req.params.credentialId as string,
        req.params.id as string,
      );
      if (!existing) {
        res.status(404).json({ error: "Credencial não encontrada" });
        return;
      }

      const newStatus = existing.requires_rotation
        ? "rotation_required"
        : "active";

      const updated = await prisma.projectCredential.update({
        where: { id: req.params.credentialId as string },
        data: {
          status: newStatus,
          shared_with_user_id: null,
          shared_with_nomad_id: null,
          shared_until: null,
        },
      });

      await logCredentialAction(
        req.params.credentialId as string,
        "revoked",
        "user",
        req.user!.id,
      );
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/projects/:id/dashboard  — aggregated KPIs for the project modal
router.get("/:id/dashboard", verifyToken, async (req, res, next) => {
  try {
    const proj = await prisma.project.findUnique({
      where: { id: req.params.id as string },
      select: {
        agency: true, client_id: true, status: true, created_at: true,
        project_tasks: {
          select: { id: true, status: true, updated_at: true, title: true },
        },
        invoices: {
          select: { id: true, status: true, amount: true, paid_at: true, invoice_number: true, created_at: true },
          orderBy: { created_at: "desc" },
        },
        credentials: { select: { id: true, status: true, requires_rotation: true } },
      },
    });
    if (!proj) { res.status(404).json({ error: "Projeto não encontrado" }); return; }
    const scope = await getProjectScope(req.user!.id, req.user!.account_type);
    if (!projectInScope(scope, { agency: proj.agency, client_id: proj.client_id })) { res.status(403).json({ error: "Acesso negado" }); return; }

    // Task counts
    const tasks = proj.project_tasks;
    const totalTasks = tasks.length;
    const doneTasks = tasks.filter((t) => t.status === "CONCLUIDA").length;
    const inProgressTasks = tasks.filter((t) => ["EM_EXECUCAO", "EM_REVISAO", "EM_APROVACAO"].includes(t.status)).length;
    const waitingTasks = tasks.filter((t) => ["PARA_LANCAMENTO", "EM_LANCAMENTO", "LIBERADA_PARA_EXECUCAO"].includes(t.status)).length;
    const cancelledTasks = tasks.filter((t) => t.status === "CANCELADA").length;
    const completionPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

    // Billing breakdown
    const invoices = proj.invoices;
    const paidInvoices = invoices.filter((i) => i.status === "paid");
    const overdueInvoices = invoices.filter((i) => i.status === "overdue");
    const pendingInvoices = invoices.filter((i) => i.status === "pending");
    const totalAmount = invoices.reduce((s, i) => s + i.amount, 0);
    const paidAmount = paidInvoices.reduce((s, i) => s + i.amount, 0);
    const overdueAmount = overdueInvoices.reduce((s, i) => s + i.amount, 0);
    const pendingAmount = pendingInvoices.reduce((s, i) => s + i.amount, 0);

    // Credentials
    const rotationCreds = proj.credentials.filter((c) => c.requires_rotation && c.status !== "archived").length;
    const activeCredentials = proj.credentials.filter((c) => c.status === "active" || c.status === "shared").length;

    // Attention = overdue invoices + rotation-required credentials
    const overdueCount = overdueInvoices.length;
    const attentionCount = overdueCount + rotationCreds;

    // Recent activities: paid invoices + done tasks, sorted descending
    const actInvoices = paidInvoices
      .filter((i) => i.paid_at != null)
      .map((i) => ({
        id: `inv-${i.id}`,
        type: "invoice_paid",
        label: `Fatura ${i.invoice_number} paga — R$ ${i.amount.toLocaleString("pt-BR")}`,
        at: i.paid_at as Date,
      }));
    const actTasks = tasks
      .filter((t) => t.status === "CONCLUIDA")
      .map((t) => ({ id: `task-${t.id}`, type: "task_done", label: `Tarefa concluída: ${t.title}`, at: t.updated_at }));
    const recentActivities = [...actInvoices, ...actTasks]
      .sort((a, b) => b.at.getTime() - a.at.getTime())
      .slice(0, 8);

    res.json({
      tasks: { total: totalTasks, done: doneTasks, inProgress: inProgressTasks, waiting: waitingTasks, cancelled: cancelledTasks, completionPct },
      billing: {
        total: totalAmount,
        paid: paidAmount,
        pending: pendingAmount,
        overdue: overdueAmount,
        totalCount: invoices.length,
        paidCount: paidInvoices.length,
        overdueCount,
        pendingCount: pendingInvoices.length,
      },
      credentials: { total: proj.credentials.length, active: activeCredentials, rotationRequired: rotationCreds },
      attention: attentionCount,
      recentActivities,
    });
  } catch (err) { next(err); }
});

// GET /api/projects/:id/log  — synthesized timeline from existing data
router.get("/:id/log", verifyToken, async (req, res, next) => {
  try {
    const proj = await prisma.project.findUnique({
      where: { id: req.params.id as string },
      select: {
        agency: true, client_id: true, status: true, created_at: true, updated_at: true,
        products: { select: { id: true, product_name_snapshot: true, created_at: true }, orderBy: { created_at: "asc" } },
        project_tasks: { select: { id: true, title: true, status: true, created_at: true, updated_at: true }, orderBy: { created_at: "asc" } },
        invoices: { select: { id: true, invoice_number: true, amount: true, status: true, paid_at: true, created_at: true }, orderBy: { created_at: "asc" } },
        credentials: {
          select: { access_logs: { select: { id: true, action: true, actor_user_id: true, details: true, created_at: true }, orderBy: { created_at: "asc" } } },
        },
      },
    });
    if (!proj) { res.status(404).json({ error: "Projeto não encontrado" }); return; }
    const scope = await getProjectScope(req.user!.id, req.user!.account_type);
    if (!projectInScope(scope, { agency: proj.agency, client_id: proj.client_id })) { res.status(403).json({ error: "Acesso negado" }); return; }

    type LogEntry = { id: string; event: string; description: string; actor_name?: string; meta?: string; created_at: Date };
    const entries: LogEntry[] = [];

    // 1. Projeto criado
    entries.push({ id: `proj-created`, event: "CRIADO", description: "Projeto criado na plataforma.", created_at: proj.created_at });

    // 2. Produtos adicionados
    proj.products.forEach((pp, i) => {
      entries.push({ id: `prod-${pp.id}`, event: "PRODUTO_ADICIONADO", description: `Produto "${pp.product_name_snapshot}" adicionado ao projeto.`, created_at: pp.created_at });
    });

    // 3. Tarefas geradas (quando há tarefas)
    if (proj.project_tasks.length > 0) {
      entries.push({ id: `tasks-generated`, event: "TAREFAS_GERADAS", description: `${proj.project_tasks.length} tarefa(s) gerada(s) automaticamente para os produtos do projeto.`, created_at: proj.project_tasks[0].created_at });
    }

    // 4. Tarefas concluídas
    const doneTasks = proj.project_tasks.filter((t) => t.status === "CONCLUIDA");
    doneTasks.slice(0, 5).forEach((t) => {
      entries.push({ id: `task-done-${t.id}`, event: "ATUALIZADO", description: `Tarefa "${t.title}" concluída.`, created_at: t.updated_at });
    });

    // 5. Faturas geradas + pagas
    proj.invoices.forEach((inv) => {
      entries.push({ id: `inv-${inv.id}`, event: "CHECKOUT_INICIADO", description: `Fatura ${inv.invoice_number ?? inv.id.slice(-8)} de R$ ${inv.amount.toFixed(2)} gerada.`, meta: JSON.stringify({ amount: inv.amount, status: inv.status }), created_at: inv.created_at });
      if (inv.status === "paid" && inv.paid_at) {
        entries.push({ id: `pay-${inv.id}`, event: "PAGAMENTO_APROVADO", description: `Pagamento de R$ ${inv.amount.toFixed(2)} aprovado.`, meta: JSON.stringify({ amount: inv.amount }), created_at: inv.paid_at });
      }
    });

    // 6. Logs de credenciais
    proj.credentials.flatMap((c) => c.access_logs).slice(0, 10).forEach((log) => {
      const eventMap: Record<string, string> = { created: "ATUALIZADO", edited: "ATUALIZADO", shared: "ATUALIZADO", revoked: "ATUALIZADO", archived: "ATUALIZADO" };
      const descMap: Record<string, string> = { created: "Credencial adicionada ao cofre.", edited: "Credencial editada.", shared: "Credencial compartilhada com nômade.", revoked: "Compartilhamento de credencial revogado.", archived: "Credencial arquivada." };
      entries.push({ id: `cred-log-${log.id}`, event: eventMap[log.action] ?? "ATUALIZADO", description: descMap[log.action] ?? `Ação: ${log.action}`, created_at: log.created_at });
    });

    // 7. Status atual (se não for draft)
    if (proj.status !== "draft" && proj.status !== "negotiation") {
      const statusDescMap: Record<string, string> = {
        "awaiting-payment": "Projeto aguardando pagamento para iniciar.",
        "planning": "Projeto em fase de planejamento.",
        "in-progress": "Projeto em execução.",
        "paused": "Projeto pausado.",
        "completed": "Projeto concluído com sucesso.",
        "cancelled": "Projeto cancelado.",
      };
      const desc = statusDescMap[proj.status] ?? `Status do projeto: ${proj.status}.`;
      entries.push({ id: `status-current`, event: "STATUS_ALTERADO", description: desc, created_at: proj.updated_at });
    }

    // Sort by created_at descending (newest first)
    entries.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());

    res.json({ total: entries.length, data: entries });
  } catch (err) { next(err); }
});

// GET /api/projects/:id/billing  — invoices + payments summary
router.get("/:id/billing", verifyToken, async (req, res, next) => {
  try {
    const parent = await prisma.project.findUnique({
      where: { id: req.params.id as string },
      select: { agency: true, client_id: true },
    });
    if (!parent) { res.status(404).json({ error: "Projeto não encontrado" }); return; }
    const scope = await getProjectScope(req.user!.id, req.user!.account_type);
    if (!projectInScope(scope, parent)) { res.status(403).json({ error: "Acesso negado" }); return; }

    const [invoices, payments] = await Promise.all([
      prisma.invoice.findMany({
        where: { project_id: req.params.id as string },
        orderBy: { due_date: "desc" },
      }),
      prisma.payment.findMany({
        where: { project_id: req.params.id as string },
        orderBy: { created_at: "desc" },
      }),
    ]);

    const totalAmount = invoices.reduce((s, i) => s + i.amount, 0);
    const paidAmount = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);
    const pendingAmount = invoices.filter((i) => i.status === "pending").reduce((s, i) => s + i.amount, 0);
    const overdueAmount = invoices.filter((i) => i.status === "overdue").reduce((s, i) => s + i.amount, 0);

    res.json({
      summary: {
        totalInvoices: invoices.length,
        totalAmount,
        paidAmount,
        pendingAmount,
        overdueAmount,
        paidCount: invoices.filter((i) => i.status === "paid").length,
        pendingCount: invoices.filter((i) => i.status === "pending").length,
        overdueCount: invoices.filter((i) => i.status === "overdue").length,
      },
      invoices,
      payments,
    });
  } catch (err) { next(err); }
});

// GET /api/projects/:id/tasks  — operational execution tasks (ProjectTask)
router.get("/:id/tasks", verifyToken, async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const status = req.query.status as string | undefined;

    const parent = await prisma.project.findUnique({
      where: { id: req.params.id as string },
      select: { agency: true, client_id: true, agency_id: true, company_id: true, partner_id: true },
    });
    if (!parent) {
      res.status(404).json({ error: "Projeto não encontrado" });
      return;
    }
    if (!(await projectVisibleToUser(req.user!, parent))) {
      res.status(403).json({ error: "Acesso negado" });
      return;
    }

    const where: Record<string, unknown> = {
      project_id: req.params.id as string,
    };
    if (status) where.status = status;

    const [total, data] = await Promise.all([
      prisma.projectTask.count({ where }),
      prisma.projectTask.findMany({
        where,
        include: {
          project_product: {
            select: {
              id: true,
              product_name_snapshot: true,
              product_code_snapshot: true,
              product_category_snapshot: true,
              status: true,
            },
          },
          catalog_task: {
            select: { id: true, code: true, name: true, category: true },
          },
          _count: {
            select: { stages: true, briefing_answers: true, attachments: true },
          },
        },
        skip,
        take: limit,
        orderBy: [{ sort_order: "asc" }, { created_at: "asc" }],
      }),
    ]);

    res.json({ data, total, page, limit });
  } catch (err) {
    next(err);
  }
});

// POST /api/projects/:id/generate-tasks  — idempotent (re-)generation of tasks from all linked products
router.post("/:id/generate-tasks", verifyToken, async (req, res, next) => {
  try {
    const result = await gerarTarefasDoProjeto(
      req.params.id as string as string,
    );
    res.status(201).json({
      ...result,
      message: `${result.generated} tarefa(s) gerada(s), ${result.skipped} j\u00e1 existia(m).`,
    });
  } catch (err: any) {
    if (err?.message?.includes("n\u00e3o encontrado")) {
      res.status(404).json({ error: err.message });
      return;
    }
    next(err);
  }
});

// POST /api/projects
router.post(
  "/",
  verifyToken,
  validate(createSchema),
  async (req, res, next) => {
    try {
      if (isLeaderUser(req.user)) {
        res.status(403).json({ error: "Permissão insuficiente" });
        return;
      }

      const { start_date, end_date, ...rest } = req.body;
      const scope = await getProjectScope(req.user!.id, req.user!.account_type);
      const agencyName = scope.kind === "agency" ? scope.agencyName : undefined;
      const toDate = (v: string | undefined) => {
        if (!v) return undefined;
        const d = new Date(v);
        return isNaN(d.getTime()) ? undefined : d;
      };

      // Name uniqueness check within the same scope
      const nameWhere: Record<string, unknown> = { title: rest.title };
      if (agencyName || rest.agency) nameWhere.agency = agencyName || rest.agency;
      if (rest.client_id) nameWhere.client_id = rest.client_id;
      const duplicate = await prisma.project.findFirst({ where: nameWhere, select: { id: true } });
      if (duplicate) {
        res.status(409).json({ error: "Já existe um projeto com esse nome" });
        return;
      }

      // Escopo novo: Agency/Company/Partner são auto-vinculados ao próprio
      // perfil — o que vier em agency_id/company_id/partner_id no body é
      // sempre ignorado pra esses três. Admin pode enviar exatamente um
      // desses três (ou nenhum); validado abaixo. Não afeta o vínculo
      // legado (agency/client_id) acima, que continua exatamente como
      // estava.
      const newScope = await resolveProjectNewScope(req.user!.id, req.user!.account_type);
      let newScopeData: Record<string, string> = {};
      if (newScope.kind === "agency") newScopeData = { agency_id: newScope.agencyId };
      else if (newScope.kind === "company") newScopeData = { company_id: newScope.companyId };
      else if (newScope.kind === "partner") newScopeData = { partner_id: newScope.partnerId };
      else if (isAdminUser(req.user)) {
        const providedCount = [rest.agency_id, rest.company_id, rest.partner_id].filter(Boolean).length;
        if (providedCount > 1) {
          res.status(400).json({ error: "Informe no máximo um vínculo: agency_id, company_id ou partner_id" });
          return;
        }
        if (rest.agency_id) {
          const exists = await prisma.agency.findUnique({ where: { id: rest.agency_id }, select: { id: true } });
          if (!exists) { res.status(400).json({ error: "Agency não encontrada" }); return; }
          newScopeData = { agency_id: rest.agency_id };
        } else if (rest.company_id) {
          const exists = await prisma.company.findUnique({ where: { id: rest.company_id }, select: { id: true } });
          if (!exists) { res.status(400).json({ error: "Company não encontrada" }); return; }
          newScopeData = { company_id: rest.company_id };
        } else if (rest.partner_id) {
          const exists = await prisma.partnerProfile.findUnique({ where: { id: rest.partner_id }, select: { id: true } });
          if (!exists) { res.status(400).json({ error: "Partner não encontrado" }); return; }
          newScopeData = { partner_id: rest.partner_id };
        }
      }
      // rest ainda carrega agency_id/company_id/partner_id crus do body
      // (usados só pra validação acima) — removidos aqui pra não colidir
      // com newScopeData no create() logo abaixo.
      delete rest.agency_id;
      delete rest.company_id;
      delete rest.partner_id;

      const project = await prisma.project.create({
        data: {
          ...rest,
          agency: agencyName || rest.agency,
          ...newScopeData,
          start_date: toDate(start_date),
          end_date: toDate(end_date),
        },
        include: { client: { select: { id: true, name: true, cnpj: true } } },
      });
      res.status(201).json(project);
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/projects/:id
router.put(
  "/:id",
  verifyToken,
  validate(updateSchema),
  async (req, res, next) => {
    try {
      if (isLeaderUser(req.user)) {
        res.status(403).json({ error: "Permissão insuficiente" });
        return;
      }

      const id = req.params.id as string as string;
      const { start_date, end_date, ...rest } = req.body;
      // Vínculo novo só muda pelo endpoint dedicado PUT /:id/link
      // (admin-only) — nunca por aqui, nem pro próprio Admin.
      delete rest.agency_id;
      delete rest.company_id;
      delete rest.partner_id;
      const toDate = (v: string | undefined) => {
        if (!v) return undefined;
        const d = new Date(v);
        return isNaN(d.getTime()) ? undefined : d;
      };

      // Capture previous status and validate scope before update
      const before = await prisma.project.findUnique({
        where: { id },
        select: { status: true, agency: true, client_id: true, agency_id: true, company_id: true, partner_id: true },
      });

      if (!before) {
        res.status(404).json({ error: "Projeto não encontrado" });
        return;
      }

      if (!(await projectVisibleToUser(req.user!, before))) {
        res.status(403).json({ error: "Acesso negado" });
        return;
      }

      // Name uniqueness check on rename (skip if title unchanged)
      if (rest.title && rest.title !== (await prisma.project.findUnique({ where: { id }, select: { title: true } }))?.title) {
        const nameWhere: Record<string, unknown> = { title: rest.title, id: { not: id } };
        if (before.agency) nameWhere.agency = before.agency;
        if (before.client_id) nameWhere.client_id = before.client_id;
        const duplicate = await prisma.project.findFirst({ where: nameWhere, select: { id: true } });
        if (duplicate) {
          res.status(409).json({ error: "Já existe um projeto com esse nome" });
          return;
        }
      }

      const project = await prisma.project.update({
        where: { id },
        data: {
          ...rest,
          start_date: toDate(start_date),
          end_date: toDate(end_date),
        },
        include: { client: { select: { id: true, name: true, cnpj: true } } },
      });

      // Auto-generate operational tasks when project transitions to "planning"
      if (rest.status === "planning" && before?.status !== "planning") {
        gerarTarefasDoProjeto(id).catch((err) =>
          console.error(
            `[generate-tasks] Erro ao gerar tarefas para projeto ${id}:`,
            err,
          ),
        );
      }

      res.json(project);
    } catch (err) {
      next(err);
    }
  },
);

const updateProjectLinkSchema = z.object({
  agency_id: z.string().nullable().optional(),
  company_id: z.string().nullable().optional(),
  partner_id: z.string().nullable().optional(),
});

// PUT /api/projects/:id/link — admin-only, define/troca/remove o vínculo
// NOVO do projeto (agency_id/company_id/partner_id). Não toca no vínculo
// legado (agency string / client_id) de jeito nenhum — mesmo padrão do
// PUT /api/client-records/:id/link. Envie exatamente um dos três pra
// vincular, ou nenhum (todos ausentes/null) pra desvincular do escopo novo.
router.put("/:id/link", verifyToken, validate(updateProjectLinkSchema), async (req, res, next) => {
  try {
    if (!isAdminUser(req.user)) {
      res.status(403).json({ error: "Permissão insuficiente" });
      return;
    }

    const id = req.params.id as string;
    const project = await prisma.project.findUnique({ where: { id }, select: { id: true } });
    if (!project) {
      res.status(404).json({ error: "Projeto não encontrado" });
      return;
    }

    const body = req.body as z.infer<typeof updateProjectLinkSchema>;
    const providedCount = [body.agency_id, body.company_id, body.partner_id].filter(Boolean).length;
    if (providedCount > 1) {
      res.status(400).json({ error: "Informe no máximo um vínculo: agency_id, company_id ou partner_id" });
      return;
    }

    let agencyId: string | null = null;
    let companyId: string | null = null;
    let partnerId: string | null = null;

    if (body.agency_id) {
      const exists = await prisma.agency.findUnique({ where: { id: body.agency_id }, select: { id: true } });
      if (!exists) { res.status(400).json({ error: "Agency não encontrada" }); return; }
      agencyId = body.agency_id;
    } else if (body.company_id) {
      const exists = await prisma.company.findUnique({ where: { id: body.company_id }, select: { id: true } });
      if (!exists) { res.status(400).json({ error: "Company não encontrada" }); return; }
      companyId = body.company_id;
    } else if (body.partner_id) {
      const exists = await prisma.partnerProfile.findUnique({ where: { id: body.partner_id }, select: { id: true } });
      if (!exists) { res.status(400).json({ error: "Partner não encontrado" }); return; }
      partnerId = body.partner_id;
    }

    const updated = await prisma.project.update({
      where: { id },
      data: { agency_id: agencyId, company_id: companyId, partner_id: partnerId },
      include: {
        client: { select: { id: true, name: true, cnpj: true } },
        agency_owner: { select: { id: true, name: true } },
        company_owner: { select: { id: true, name: true } },
        partner_owner: { select: { id: true, user: { select: { name: true } } } },
      },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/projects/:id
router.delete("/:id", verifyToken, async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id as string },
      select: { agency: true, client_id: true, agency_id: true, company_id: true, partner_id: true },
    });
    if (!project) {
      res.status(404).json({ error: "Projeto não encontrado" });
      return;
    }
    if (!(await projectVisibleToUser(req.user!, project))) {
      res.status(403).json({ error: "Acesso negado" });
      return;
    }
    await prisma.project.delete({ where: { id: req.params.id as string } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
