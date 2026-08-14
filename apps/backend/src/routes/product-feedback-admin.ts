import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken, requirePermission } from "../middleware/auth";
import { parsePagination } from "../middleware/validate";
import { isRoadmapTechnicallyConfigured } from "../lib/roadmap-client";
import { config } from "../config";
import {
  decideProductFeedbackAccess,
  type ProductFeedbackGroupLike,
} from "../lib/product-feedback-access-decision";
import {
  getOrCreateAccessConfig,
  resolveProductFeedbackAccess,
  writeAccessAudit,
} from "../lib/product-feedback-service";

// Every route here is admin-only and re-verifies the real backend
// authorization (verifyToken + requireRole("admin") + requirePermission),
// never trusting that the frontend already hid the page — the frontend
// route guard is a convenience, this is the actual boundary.
const router = Router();

// Same role check as requireRole("admin"), but also writes an audit entry
// for the denied attempt — a plain requireRole() has no hook for "and log
// it when this fails", so this wraps it instead of duplicating the role
// check ad hoc.
async function requireAdminWithAudit(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }
  if (req.user.role !== "admin") {
    await writeAccessAudit({
      actorId: req.user.id,
      action: "admin.access_denied",
      after: { path: req.path, method: req.method },
      reason: `role "${req.user.role}" tentou acessar uma rota administrativa de acesso a chamados`,
    }).catch(() => undefined);
    res.status(403).json({ error: "Permissão insuficiente" });
    return;
  }
  next();
}

router.use(verifyToken, requireAdminWithAudit);

const readGuard = requirePermission("sistema", "view");
const writeGuard = requirePermission("sistema", "edit");

// ── GET /config ──────────────────────────────────────────────────────────

router.get("/config", readGuard, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const cfg = await getOrCreateAccessConfig();
    res.json({
      enabled: cfg.enabled,
      defaultPolicy: cfg.default_policy,
      technicallyConfigured: isRoadmapTechnicallyConfigured(),
      updatedAt: cfg.updated_at,
      // Only ever shown to an authorized Admin (this whole router is
      // requireRole("admin")-gated) — never sent to a common user, and no
      // SSO/JIT exists yet, so this is a plain link, nothing more.
      roadmapInternalUrl: config.ROADMAP_INTERNAL_URL || null,
    });
  } catch (err) {
    next(err);
  }
});

const configSchema = z
  .object({
    enabled: z.boolean().optional(),
    defaultPolicy: z.enum(["ALLOW_ALL_ACTIVE", "DENY_ALL_EXCEPT_ALLOWED"]).optional(),
    reason: z.string().trim().max(2000).optional(),
  })
  .strict();

router.patch("/config", writeGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = configSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Dados inválidos", details: parsed.error.flatten() });
      return;
    }

    if (parsed.data.enabled === true && !isRoadmapTechnicallyConfigured()) {
      await writeAccessAudit({
        actorId: req.user!.id,
        action: "config.enable_denied",
        after: { attemptedEnabled: true },
        reason: "tentativa de ligar o produto com a integração técnica inválida ou incompleta",
      });
      res.status(409).json({
        error: "Não é possível ligar o produto: a integração técnica com a Roadmap não está configurada corretamente.",
      });
      return;
    }

    const before = await getOrCreateAccessConfig();
    const updated = await prisma.productFeedbackAccessConfig.update({
      where: { id: before.id },
      data: {
        enabled: parsed.data.enabled ?? undefined,
        default_policy: parsed.data.defaultPolicy ?? undefined,
        updated_by_id: req.user!.id,
      },
    });
    await writeAccessAudit({
      actorId: req.user!.id,
      action: "config.updated",
      before: { enabled: before.enabled, defaultPolicy: before.default_policy },
      after: { enabled: updated.enabled, defaultPolicy: updated.default_policy },
      reason: parsed.data.reason,
    });
    res.json({ enabled: updated.enabled, defaultPolicy: updated.default_policy });
  } catch (err) {
    next(err);
  }
});

// NOTE: the SSO handoff (POST .../roadmap-sso/start, GET .../roadmap-sso/base-url)
// used to live here, but this whole router is gated by requireAdminWithAudit
// (role==="admin" for every route) — the SSO handoff must NOT require that,
// since a founder can grant the narrower "central_chamados" permission to a
// non-admin account (developer/QA reviewer). It now lives in its own file,
// routes/roadmap-sso.ts, mounted directly in app.ts with only
// verifyToken + requireAnyPermission(["sistema","view"], ["central_chamados","view"]).

// ── GET /users — paginated, filtered listing with effective access ─────────

const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  search: z.string().trim().optional(),
  filter: z.enum(["all", "allowed", "blocked", "override", "inactive"]).default("all"),
});

async function loadGroupsAndOverridesFor(userIds: string[]) {
  const [overrides, memberships] = await Promise.all([
    prisma.productFeedbackUserOverride.findMany({ where: { user_id: { in: userIds } } }),
    prisma.productFeedbackAccessGroupMember.findMany({
      where: { user_id: { in: userIds }, group: { active: true, archived_at: null } },
      include: { group: true },
    }),
  ]);
  const overrideByUser = new Map(overrides.map((o) => [o.user_id, o]));
  const groupsByUser = new Map<string, ProductFeedbackGroupLike[]>();
  for (const m of memberships) {
    const list = groupsByUser.get(m.user_id) ?? [];
    list.push({
      id: m.group.id,
      effect: m.group.effect as "ALLOW" | "DENY",
      priority: m.group.priority,
      active: m.group.active,
      expiresAt: m.group.expires_at,
    });
    groupsByUser.set(m.user_id, list);
  }
  return { overrideByUser, groupsByUser };
}

router.get("/users", readGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsedQuery = listUsersQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) {
      res.status(400).json({ error: "Parâmetros inválidos" });
      return;
    }
    const { page, limit, search, filter } = parsedQuery.data;

    const where = search
      ? {
          OR: [
            { name: { contains: search } },
            { email: { contains: search } },
            { user_code: { contains: search } },
          ],
        }
      : {};

    // The effective-access filters (allowed/blocked/override/inactive)
    // depend on decideProductFeedbackAccess, which isn't expressible as a
    // SQL WHERE clause — it combines per-user group membership, override,
    // and the global config. Paginating the raw `users` query BEFORE
    // applying that filter (the previous approach) silently drops matches
    // that happen to fall outside the current page's raw slice, and
    // reports a `total` that doesn't match what's actually being shown.
    // Fetching every search-matching user's minimal fields and filtering
    // in memory — the same approach already used by GET /summary — is the
    // only way to get a correct total and a correct page for every filter
    // value; the affected sets are always this platform's own user count
    // (hundreds, not millions), so this stays cheap.
    const [allUsers, cfg] = await Promise.all([
      prisma.user.findMany({
        where,
        select: { id: true, name: true, email: true, user_code: true, is_active: true, status: true, account_type: true },
        orderBy: { name: "asc" },
      }),
      getOrCreateAccessConfig(),
    ]);

    const { overrideByUser, groupsByUser } = await loadGroupsAndOverridesFor(allUsers.map((u) => u.id));
    const technicallyConfigured = isRoadmapTechnicallyConfigured();

    const rows = allUsers.map((u) => {
      const override = overrideByUser.get(u.id);
      const decision = decideProductFeedbackAccess({
        authenticated: true,
        user: { id: u.id, isActive: u.is_active, status: u.status },
        config: { enabled: cfg.enabled, defaultPolicy: cfg.default_policy as any, technicallyConfigured },
        memberGroups: groupsByUser.get(u.id) ?? [],
        override: override
          ? { effect: override.effect as any, active: override.active, expiresAt: override.expires_at }
          : undefined,
        now: new Date(),
      });
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        userCode: u.user_code,
        accountType: u.account_type,
        isActive: u.is_active,
        status: u.status,
        canUse: decision.canUse,
        source: decision.source,
        override: override ? { effect: override.effect, active: override.active, expiresAt: override.expires_at } : null,
        groupCount: (groupsByUser.get(u.id) ?? []).length,
      };
    });

    const filtered = rows.filter((row) => {
      if (filter === "all") return true;
      if (filter === "allowed") return row.canUse;
      if (filter === "blocked") return !row.canUse;
      if (filter === "override") return row.override !== null;
      if (filter === "inactive") return !row.isActive || row.status !== "ativo";
      return true;
    });

    const total = filtered.length;
    const { skip } = parsePagination({ page, limit });
    const pageItems = filtered.slice(skip, skip + limit);

    res.json({ items: pageItems, pagination: { page, limit, total } });
  } catch (err) {
    next(err);
  }
});

// ── GET /summary ─────────────────────────────────────────────────────────

router.get("/summary", readGuard, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [cfg, users] = await Promise.all([
      getOrCreateAccessConfig(),
      prisma.user.findMany({ select: { id: true, is_active: true, status: true } }),
    ]);
    const { overrideByUser, groupsByUser } = await loadGroupsAndOverridesFor(users.map((u) => u.id));
    const technicallyConfigured = isRoadmapTechnicallyConfigured();

    let released = 0;
    let blocked = 0;
    let exceptions = 0;
    let inactive = 0;

    for (const u of users) {
      if (!u.is_active || u.status !== "ativo") inactive += 1;
      const override = overrideByUser.get(u.id);
      if (override && override.active) exceptions += 1;
      const decision = decideProductFeedbackAccess({
        authenticated: true,
        user: { id: u.id, isActive: u.is_active, status: u.status },
        config: { enabled: cfg.enabled, defaultPolicy: cfg.default_policy as any, technicallyConfigured },
        memberGroups: groupsByUser.get(u.id) ?? [],
        override: override
          ? { effect: override.effect as any, active: override.active, expiresAt: override.expires_at }
          : undefined,
        now: new Date(),
      });
      if (decision.canUse) released += 1;
      else blocked += 1;
    }

    res.json({ released, blocked, exceptions, inactive, total: users.length });
  } catch (err) {
    next(err);
  }
});

// ── PUT /users/:id/override ─────────────────────────────────────────────────

const overrideSchema = z
  .object({
    effect: z.enum(["ALLOW", "DENY", "INHERIT"]),
    expiresAt: z.string().datetime().nullable().optional(),
    reason: z.string().trim().max(2000).optional(),
  })
  .strict();

router.put("/users/:id/override", writeGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = overrideSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Dados inválidos", details: parsed.error.flatten() });
      return;
    }
    const targetUser = await prisma.user.findUnique({ where: { id: req.params.id as string }, select: { id: true } });
    if (!targetUser) {
      res.status(404).json({ error: "Usuário não encontrado" });
      return;
    }

    const before = await prisma.productFeedbackUserOverride.findUnique({ where: { user_id: targetUser.id } });
    const updated = await prisma.productFeedbackUserOverride.upsert({
      where: { user_id: targetUser.id },
      update: {
        effect: parsed.data.effect,
        active: true,
        expires_at: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
        reason: parsed.data.reason ?? null,
        updated_by_id: req.user!.id,
      },
      create: {
        user_id: targetUser.id,
        effect: parsed.data.effect,
        active: true,
        expires_at: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
        reason: parsed.data.reason ?? null,
        updated_by_id: req.user!.id,
      },
    });
    await writeAccessAudit({
      actorId: req.user!.id,
      targetUserId: targetUser.id,
      action: "override.set",
      before: before ? { effect: before.effect, active: before.active } : null,
      after: { effect: updated.effect, active: updated.active },
      reason: parsed.data.reason,
    });
    res.json({ effect: updated.effect, active: updated.active, expiresAt: updated.expires_at });
  } catch (err) {
    next(err);
  }
});

// ── POST /users/batch-override ──────────────────────────────────────────────

const batchOverrideSchema = z
  .object({
    userIds: z.array(z.string().min(1)).min(1).max(500),
    effect: z.enum(["ALLOW", "DENY", "INHERIT"]),
    expiresAt: z.string().datetime().nullable().optional(),
    reason: z.string().trim().max(2000).optional(),
  })
  .strict();

router.post("/users/batch-override", writeGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = batchOverrideSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Dados inválidos", details: parsed.error.flatten() });
      return;
    }
    const existingUsers = await prisma.user.findMany({
      where: { id: { in: parsed.data.userIds } },
      select: { id: true },
    });
    const expiresAt = parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null;

    await prisma.$transaction(async (tx) => {
      for (const u of existingUsers) {
        await tx.productFeedbackUserOverride.upsert({
          where: { user_id: u.id },
          update: {
            effect: parsed.data.effect,
            active: true,
            expires_at: expiresAt,
            reason: parsed.data.reason ?? null,
            updated_by_id: req.user!.id,
          },
          create: {
            user_id: u.id,
            effect: parsed.data.effect,
            active: true,
            expires_at: expiresAt,
            reason: parsed.data.reason ?? null,
            updated_by_id: req.user!.id,
          },
        });
        await tx.productFeedbackAccessAudit.create({
          data: {
            actor_id: req.user!.id,
            target_user_id: u.id,
            action: "override.batch_set",
            after_json: JSON.stringify({ effect: parsed.data.effect }),
            reason: parsed.data.reason ?? null,
          },
        });
      }
    });

    res.json({ updated: existingUsers.length });
  } catch (err) {
    next(err);
  }
});

// ── Groups ──────────────────────────────────────────────────────────────────

router.get("/groups", readGuard, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const groups = await prisma.productFeedbackAccessGroup.findMany({
      where: { archived_at: null },
      orderBy: [{ priority: "desc" }, { name: "asc" }],
      include: { _count: { select: { members: true } } },
    });
    res.json({
      items: groups.map((g) => ({
        id: g.id,
        name: g.name,
        effect: g.effect,
        priority: g.priority,
        active: g.active,
        expiresAt: g.expires_at,
        reason: g.reason,
        memberCount: g._count.members,
        createdAt: g.created_at,
      })),
    });
  } catch (err) {
    next(err);
  }
});

const groupSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    effect: z.enum(["ALLOW", "DENY"]),
    priority: z.number().int().default(0),
    active: z.boolean().default(true),
    expiresAt: z.string().datetime().nullable().optional(),
    reason: z.string().trim().max(2000).optional(),
  })
  .strict();

router.post("/groups", writeGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = groupSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Dados inválidos", details: parsed.error.flatten() });
      return;
    }
    const created = await prisma.productFeedbackAccessGroup.create({
      data: {
        name: parsed.data.name,
        effect: parsed.data.effect,
        priority: parsed.data.priority,
        active: parsed.data.active,
        expires_at: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
        reason: parsed.data.reason ?? null,
        created_by_id: req.user!.id,
      },
    });
    await writeAccessAudit({
      actorId: req.user!.id,
      action: "group.created",
      after: { id: created.id, name: created.name, effect: created.effect, priority: created.priority },
    });
    res.status(201).json({ id: created.id });
  } catch (err) {
    next(err);
  }
});

const groupUpdateSchema = groupSchema.partial().strict();

router.patch("/groups/:id", writeGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = groupUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Dados inválidos", details: parsed.error.flatten() });
      return;
    }
    const before = await prisma.productFeedbackAccessGroup.findUnique({ where: { id: req.params.id as string } });
    if (!before) {
      res.status(404).json({ error: "Grupo não encontrado" });
      return;
    }
    const updated = await prisma.productFeedbackAccessGroup.update({
      where: { id: before.id },
      data: {
        name: parsed.data.name ?? undefined,
        effect: parsed.data.effect ?? undefined,
        priority: parsed.data.priority ?? undefined,
        active: parsed.data.active ?? undefined,
        expires_at: parsed.data.expiresAt === undefined ? undefined : parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
        reason: parsed.data.reason ?? undefined,
      },
    });
    await writeAccessAudit({
      actorId: req.user!.id,
      action: "group.updated",
      before: { effect: before.effect, priority: before.priority, active: before.active },
      after: { effect: updated.effect, priority: updated.priority, active: updated.active },
    });
    res.json({ id: updated.id });
  } catch (err) {
    next(err);
  }
});

router.delete("/groups/:id", writeGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const before = await prisma.productFeedbackAccessGroup.findUnique({ where: { id: req.params.id as string } });
    if (!before) {
      res.status(404).json({ error: "Grupo não encontrado" });
      return;
    }
    await prisma.productFeedbackAccessGroup.update({
      where: { id: before.id },
      data: { archived_at: new Date(), active: false },
    });
    await writeAccessAudit({ actorId: req.user!.id, action: "group.archived", before: { id: before.id, name: before.name } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.get("/groups/:id/members", readGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const group = await prisma.productFeedbackAccessGroup.findUnique({ where: { id: req.params.id as string } });
    if (!group) {
      res.status(404).json({ error: "Grupo não encontrado" });
      return;
    }
    const members = await prisma.productFeedbackAccessGroupMember.findMany({
      where: { group_id: group.id },
      include: { user: { select: { id: true, name: true, email: true, user_code: true } } },
      orderBy: { created_at: "desc" },
    });
    res.json({
      items: members.map((m) => ({
        userId: m.user.id,
        name: m.user.name,
        email: m.user.email,
        userCode: m.user.user_code,
        addedAt: m.created_at,
      })),
    });
  } catch (err) {
    next(err);
  }
});

const membersSchema = z.object({ userIds: z.array(z.string().min(1)).min(1).max(500) }).strict();

router.post("/groups/:id/members", writeGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = membersSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Dados inválidos" });
      return;
    }
    const group = await prisma.productFeedbackAccessGroup.findUnique({ where: { id: req.params.id as string } });
    if (!group) {
      res.status(404).json({ error: "Grupo não encontrado" });
      return;
    }
    const existingUsers = await prisma.user.findMany({ where: { id: { in: parsed.data.userIds } }, select: { id: true } });

    await prisma.$transaction(
      existingUsers.map((u) =>
        prisma.productFeedbackAccessGroupMember.upsert({
          where: { group_id_user_id: { group_id: group.id, user_id: u.id } },
          update: {},
          create: { group_id: group.id, user_id: u.id, added_by_id: req.user!.id },
        }),
      ),
    );
    await writeAccessAudit({
      actorId: req.user!.id,
      action: "group.member_added",
      after: { groupId: group.id, userIds: existingUsers.map((u) => u.id) },
    });
    res.json({ added: existingUsers.length });
  } catch (err) {
    next(err);
  }
});

router.delete("/groups/:id/members/:userId", writeGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.productFeedbackAccessGroupMember.deleteMany({
      where: { group_id: req.params.id as string, user_id: req.params.userId as string },
    });
    await writeAccessAudit({
      actorId: req.user!.id,
      targetUserId: req.params.userId as string,
      action: "group.member_removed",
      after: { groupId: req.params.id as string },
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ── GET /audit ────────────────────────────────────────────────────────────

const auditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  targetUserId: z.string().optional(),
});

router.get("/audit", readGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = auditQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Parâmetros inválidos" });
      return;
    }
    const { page, limit, targetUserId } = parsed.data;
    const where = targetUserId ? { target_user_id: targetUserId } : {};
    const [total, entries] = await Promise.all([
      prisma.productFeedbackAccessAudit.count({ where }),
      prisma.productFeedbackAccessAudit.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    res.json({ items: entries, pagination: { page, limit, total } });
  } catch (err) {
    next(err);
  }
});

// ── POST /simulate ───────────────────────────────────────────────────────

const simulateSchema = z.object({ userId: z.string().min(1) }).strict();

router.post("/simulate", readGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = simulateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Dados inválidos" });
      return;
    }
    const decision = await resolveProductFeedbackAccess(parsed.data.userId);
    res.json({ canUse: decision.canUse, reason: decision.reason, source: decision.source });
  } catch (err) {
    next(err);
  }
});

export default router;
