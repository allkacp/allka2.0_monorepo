import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken, requireRole, requirePermission } from "../middleware/auth";
import { evaluateRoadmapSsoAccess } from "../middleware/auth";
import { parsePagination } from "../middleware/validate";
import { writeAccessAudit } from "../lib/product-feedback-service";

/**
 * Admin UI for granting/revoking the "central_chamados" permission — the
 * module that lets a non-admin account (a developer or QA reviewer) see
 * "Roadmap e chamados" in the sidebar and use the SSO handoff, without
 * granting the broader "sistema" module. Only a "sistema" editor can hand
 * this out (a narrower permission is still a privilege to grant, so
 * granting it needs a broader one).
 *
 * The underlying AdminProfile/AdminPermission model only supports ONE
 * profile per user (User.admin_profile_id is a single nullable FK, not a
 * many-to-many) — there is no way around that constraint without a schema
 * change. This UI works with it explicitly rather than hiding it: granting
 * access assigns the user to one well-known, dedicated profile ("Acesso —
 * Central de Roadmap", containing exactly the central_chamados/view
 * permission and nothing else); if the user already has a DIFFERENT
 * profile, the grant endpoint refuses and reports it, so the switch is
 * always something an admin chooses deliberately (via the confirmation
 * dialog in the UI), never a silent side effect that quietly strips
 * unrelated permissions from someone.
 */
const router = Router();

const DEDICATED_PROFILE_NAME = "Acesso — Central de Roadmap";

router.use(verifyToken, requireRole("admin"), requirePermission("sistema", "edit"));

async function ensureDedicatedProfile() {
  const existing = await prisma.adminProfile.findUnique({ where: { name: DEDICATED_PROFILE_NAME } });
  if (existing) return existing;
  return prisma.adminProfile.create({
    data: {
      name: DEDICATED_PROFILE_NAME,
      description:
        "Perfil dedicado, criado automaticamente pela tela Acesso aos chamados: contém só a permissão central_chamados/view, para liberar o item \"Roadmap e chamados\" e o SSO a quem não deve ter o módulo \"sistema\" inteiro.",
      is_master: false,
      is_active: true,
      permissions: { create: [{ module: "central_chamados", action: "view" }] },
    },
  });
}

const userSelect = {
  id: true,
  name: true,
  email: true,
  user_code: true,
  account_type: true,
  role: true,
  is_active: true,
  status: true,
  admin_profile_id: true,
  admin_profile: {
    select: {
      id: true,
      name: true,
      is_active: true,
      is_master: true,
      permissions: { select: { module: true, action: true } },
    },
  },
} as const;

function toRow(user: {
  id: string;
  name: string;
  email: string;
  user_code: string | null;
  account_type: string;
  role: string;
  is_active: boolean;
  status: string;
  admin_profile_id: string | null;
  admin_profile: {
    id: string;
    name: string;
    is_active: boolean;
    is_master: boolean;
    permissions: { module: string; action: string }[];
  } | null;
}) {
  const canOpenRoadmap = evaluateRoadmapSsoAccess(user.account_type, user.admin_profile);
  const hasExplicitCentralChamados =
    user.admin_profile?.permissions.some((p) => p.module === "central_chamados" && p.action === "view") ?? false;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    userCode: user.user_code,
    accountType: user.account_type,
    role: user.role,
    isActive: user.is_active,
    status: user.status,
    profileId: user.admin_profile_id,
    profileName: user.admin_profile?.name ?? null,
    isDedicatedProfile: user.admin_profile?.name === DEDICATED_PROFILE_NAME,
    hasExplicitCentralChamados,
    canOpenRoadmap,
  };
}

// ── GET /users — search + pagination, same shape/spirit as the existing
// product-feedback user listing on this same page ──────────────────────────

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(20),
  search: z.string().trim().optional(),
  filter: z.enum(["all", "holders", "dedicated_profile"]).default("all"),
});

router.get("/users", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Parâmetros inválidos" });
      return;
    }
    const { page, limit, search, filter } = parsed.data;

    const where = search
      ? {
          OR: [
            { name: { contains: search } },
            { email: { contains: search } },
            { user_code: { contains: search } },
          ],
        }
      : {};

    // Same reasoning as product-feedback-admin.ts's GET /users: the
    // effective-access filter depends on evaluateRoadmapSsoAccess, which
    // isn't a SQL WHERE clause — fetch the matching set, filter in memory.
    // This platform's user count stays small enough for that to be cheap.
    const allUsers = await prisma.user.findMany({ where, select: userSelect, orderBy: { name: "asc" } });
    const rows = allUsers.map(toRow);

    const filtered = rows.filter((row) => {
      if (filter === "holders") return row.canOpenRoadmap;
      if (filter === "dedicated_profile") return row.isDedicatedProfile;
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

// ── POST /users/:id/grant ───────────────────────────────────────────────────

const grantSchema = z.object({ reason: z.string().trim().max(2000).optional() }).strict();

router.post("/users/:id/grant", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = grantSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Dados inválidos" });
      return;
    }
    const target = await prisma.user.findUnique({
      where: { id: req.params.id as string },
      select: userSelect,
    });
    if (!target) {
      res.status(404).json({ error: "Usuário não encontrado" });
      return;
    }
    if (target.admin_profile && target.admin_profile.name !== DEDICATED_PROFILE_NAME) {
      res.status(409).json({
        error: `Este usuário já tem o perfil "${target.admin_profile.name}" atribuído. Atribuir o acesso à Central de Roadmap trocaria esse perfil, removendo as permissões atuais dele — ajuste manualmente em vez de usar este atalho.`,
        currentProfileName: target.admin_profile.name,
      });
      return;
    }

    const profile = await ensureDedicatedProfile();
    const updated = await prisma.user.update({
      where: { id: target.id },
      data: { admin_profile_id: profile.id },
      select: userSelect,
    });

    await writeAccessAudit({
      actorId: req.user!.id,
      targetUserId: target.id,
      action: "central_chamados.granted",
      before: { profileId: target.admin_profile_id, profileName: target.admin_profile?.name ?? null },
      after: { profileId: profile.id, profileName: profile.name },
      reason: parsed.data.reason,
    });

    res.json(toRow(updated));
  } catch (err) {
    next(err);
  }
});

// ── POST /users/:id/revoke ──────────────────────────────────────────────────

router.post("/users/:id/revoke", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = grantSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Dados inválidos" });
      return;
    }
    const target = await prisma.user.findUnique({ where: { id: req.params.id as string }, select: userSelect });
    if (!target) {
      res.status(404).json({ error: "Usuário não encontrado" });
      return;
    }
    if (target.admin_profile && target.admin_profile.name !== DEDICATED_PROFILE_NAME) {
      res.status(409).json({
        error: `Este usuário tem o perfil "${target.admin_profile.name}" atribuído (não o dedicado desta tela) — remova pela tela de Permissões em vez daqui.`,
      });
      return;
    }

    const updated = await prisma.user.update({
      where: { id: target.id },
      data: { admin_profile_id: null },
      select: userSelect,
    });

    await writeAccessAudit({
      actorId: req.user!.id,
      targetUserId: target.id,
      action: "central_chamados.revoked",
      before: { profileId: target.admin_profile_id, profileName: target.admin_profile?.name ?? null },
      after: { profileId: null, profileName: null },
      reason: parsed.data.reason,
    });

    res.json(toRow(updated));
  } catch (err) {
    next(err);
  }
});

// ── POST /users/batch-grant / batch-revoke ─────────────────────────────────

const batchSchema = z
  .object({
    userIds: z.array(z.string().min(1)).min(1).max(500),
    reason: z.string().trim().max(2000).optional(),
  })
  .strict();

router.post("/users/batch-grant", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = batchSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Dados inválidos" });
      return;
    }
    const targets = await prisma.user.findMany({
      where: { id: { in: parsed.data.userIds } },
      select: userSelect,
    });
    const profile = await ensureDedicatedProfile();

    const skipped: { id: string; name: string; reason: string }[] = [];
    const granted: string[] = [];

    for (const target of targets) {
      if (target.admin_profile && target.admin_profile.name !== DEDICATED_PROFILE_NAME) {
        skipped.push({ id: target.id, name: target.name, reason: `já tem o perfil "${target.admin_profile.name}"` });
        continue;
      }
      await prisma.user.update({ where: { id: target.id }, data: { admin_profile_id: profile.id } });
      await writeAccessAudit({
        actorId: req.user!.id,
        targetUserId: target.id,
        action: "central_chamados.granted",
        before: { profileId: target.admin_profile_id, profileName: target.admin_profile?.name ?? null },
        after: { profileId: profile.id, profileName: profile.name },
        reason: parsed.data.reason,
      });
      granted.push(target.id);
    }

    res.json({ granted: granted.length, skipped });
  } catch (err) {
    next(err);
  }
});

router.post("/users/batch-revoke", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = batchSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Dados inválidos" });
      return;
    }
    const targets = await prisma.user.findMany({
      where: { id: { in: parsed.data.userIds } },
      select: userSelect,
    });

    const skipped: { id: string; name: string; reason: string }[] = [];
    const revoked: string[] = [];

    for (const target of targets) {
      if (target.admin_profile && target.admin_profile.name !== DEDICATED_PROFILE_NAME) {
        skipped.push({ id: target.id, name: target.name, reason: `perfil "${target.admin_profile.name}" não é o dedicado` });
        continue;
      }
      if (!target.admin_profile_id) {
        continue;
      }
      await prisma.user.update({ where: { id: target.id }, data: { admin_profile_id: null } });
      await writeAccessAudit({
        actorId: req.user!.id,
        targetUserId: target.id,
        action: "central_chamados.revoked",
        before: { profileId: target.admin_profile_id, profileName: target.admin_profile?.name ?? null },
        after: { profileId: null, profileName: null },
        reason: parsed.data.reason,
      });
      revoked.push(target.id);
    }

    res.json({ revoked: revoked.length, skipped });
  } catch (err) {
    next(err);
  }
});

export default router;
