import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../middleware/auth";
import { resolveMyAgencyId } from "../lib/project-scope";

const router = Router();

// Grupo PESSOAL de pessoas do próprio time do usuário logado (ex.: "Líderes
// de Projeto", "Equipe Financeira") — cadastro/gestão do grupo em si.
// Usar um grupo como alvo de uma notificação/regra de verdade é uma etapa
// futura, ainda não conectada aqui (ver NotificationGroup no schema).
router.use(verifyToken);

type EligibleMember = { id: string; name: string; email: string };

// Candidatos a membro, escopados ao próprio time do usuário — nunca a base
// inteira de usuários da plataforma (exceto para admin, que já enxerga
// todo mundo em outras telas). Deliberadamente NÃO reaproveita as rotas
// admin-only de listagem de equipe (requireAgencyAdmin/requireCompanyAdmin
// bloqueariam um agency_user comum) — esta é uma consulta própria, aberta a
// qualquer conta autenticada, só olhando pro seu próprio vínculo.
async function eligibleMembersFor(userId: string, accountType: string): Promise<EligibleMember[]> {
  if (accountType === "admin") {
    const users = await prisma.user.findMany({
      where: { is_active: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });
    return users;
  }

  if (accountType === "agencias") {
    const agencyId = await resolveMyAgencyId(prisma, userId);
    if (!agencyId) return [];
    const users = await prisma.user.findMany({
      where: { agency_id: agencyId, is_active: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });
    return users;
  }

  if (accountType === "empresas") {
    const me = await prisma.user.findUnique({ where: { id: userId }, select: { company_id: true } });
    if (!me?.company_id) return [];
    const users = await prisma.user.findMany({
      where: { company_id: me.company_id, is_active: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });
    return users;
  }

  // nomades/lider e qualquer outro tipo sem conceito de "time" hoje — só o
  // próprio usuário, até esses portais ganharem uma noção de equipe.
  const me = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true } });
  return me ? [me] : [];
}

// ── GET /eligible-members ─────────────────────────────────────────────────

router.get("/eligible-members", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await eligibleMembersFor(req.user!.id, req.user!.account_type);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// ── GET / ──────────────────────────────────────────────────────────────────

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const groups = await prisma.notificationGroup.findMany({
      where: { owner_user_id: req.user!.id },
      include: { _count: { select: { members: true } } },
      orderBy: { created_at: "desc" },
    });
    res.json({
      data: groups.map((g) => ({
        id: g.id,
        name: g.name,
        description: g.description,
        member_count: g._count.members,
        created_at: g.created_at,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /:id ───────────────────────────────────────────────────────────────

router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const group = await prisma.notificationGroup.findFirst({
      where: { id: req.params.id as string, owner_user_id: req.user!.id },
      include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } },
    });
    if (!group) {
      res.status(404).json({ error: "Grupo não encontrado" });
      return;
    }
    res.json({
      id: group.id,
      name: group.name,
      description: group.description,
      members: group.members.map((m) => m.user),
      created_at: group.created_at,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST / ─────────────────────────────────────────────────────────────────

const createSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  member_user_ids: z.array(z.string()).default([]),
});

async function sanitizeMemberIds(userId: string, accountType: string, requestedIds: string[]): Promise<string[]> {
  if (requestedIds.length === 0) return [];
  const eligible = await eligibleMembersFor(userId, accountType);
  const eligibleIds = new Set(eligible.map((u) => u.id));
  return [...new Set(requestedIds)].filter((id) => eligibleIds.has(id));
}

router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Dados inválidos", details: parsed.error.flatten() });
      return;
    }
    const { name, description, member_user_ids } = parsed.data;
    const memberIds = await sanitizeMemberIds(req.user!.id, req.user!.account_type, member_user_ids);

    const group = await prisma.notificationGroup.create({
      data: {
        owner_user_id: req.user!.id,
        name,
        description: description || null,
        members: { create: memberIds.map((user_id) => ({ user_id })) },
      },
      include: { _count: { select: { members: true } } },
    });

    res.status(201).json({
      id: group.id,
      name: group.name,
      description: group.description,
      member_count: group._count.members,
      created_at: group.created_at,
    });
  } catch (err) {
    next(err);
  }
});

// ── PUT /:id ───────────────────────────────────────────────────────────────

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  member_user_ids: z.array(z.string()).optional(),
});

router.put("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.notificationGroup.findFirst({
      where: { id: req.params.id as string, owner_user_id: req.user!.id },
      select: { id: true },
    });
    if (!existing) {
      res.status(404).json({ error: "Grupo não encontrado" });
      return;
    }

    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Dados inválidos", details: parsed.error.flatten() });
      return;
    }
    const { name, description, member_user_ids } = parsed.data;

    if (member_user_ids !== undefined) {
      const memberIds = await sanitizeMemberIds(req.user!.id, req.user!.account_type, member_user_ids);
      await prisma.$transaction([
        prisma.notificationGroupMember.deleteMany({ where: { group_id: existing.id } }),
        prisma.notificationGroupMember.createMany({
          data: memberIds.map((user_id) => ({ group_id: existing.id, user_id })),
        }),
      ]);
    }

    const group = await prisma.notificationGroup.update({
      where: { id: existing.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description: description || null } : {}),
      },
      include: { _count: { select: { members: true } } },
    });

    res.json({
      id: group.id,
      name: group.name,
      description: group.description,
      member_count: group._count.members,
      created_at: group.created_at,
    });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /:id ────────────────────────────────────────────────────────────

router.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.notificationGroup.findFirst({
      where: { id: req.params.id as string, owner_user_id: req.user!.id },
      select: { id: true },
    });
    if (!existing) {
      res.status(404).json({ error: "Grupo não encontrado" });
      return;
    }
    await prisma.notificationGroup.delete({ where: { id: existing.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
