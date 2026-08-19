import { Router } from "express";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { isAdminUser } from "../lib/project-scope";
import { resolveOwnScopeId } from "../lib/dashboard-scope";
import {
  normalizeShareLinkSlug,
  validateShareLinkSlug,
  shareLinkSlugErrorMessage,
} from "../lib/share-link-slug";
import { logShareLinkActivity, shareLinkActivityLabel, type ShareLinkActor } from "../lib/share-link-activity";
import { Prisma } from "@prisma/client";

const router = Router();

// Snapshot de nome/e-mail no momento da ação (item 8) — não é uma FK viva
// pro User atual: se a conta for renomeada/removida depois, o log
// continua legível com quem fez o quê na época. `req.user` (JWT) já traz
// email; name precisa de uma consulta rápida.
async function resolveActor(user: { id: string; email: string }): Promise<ShareLinkActor> {
  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { name: true } });
  return { id: user.id, name: dbUser?.name ?? null, email: user.email };
}

// O scopeId de um compartilhamento NUNCA vem do cliente (exceto admin) —
// resolveOwnScopeId (lib/dashboard-scope.ts) sempre deriva a partir de
// quem está autenticado, pra impedir que alguém compartilhe dados de uma
// organização que não é a sua. A MESMA função agora também é usada pelo
// dashboard normal autenticado (routes/dashboard.ts, POST /widgets), pra
// impedir os dois fluxos de escopo divergirem de novo.

// Status é sempre calculado no backend, nunca no cliente — a mesma regra
// usada aqui é a que routes/share.ts aplica pra decidir se o link público
// ainda funciona (ver checagens de revoked_at/expires_at/deleted_at lá).
type ShareLinkRow = {
  id: string;
  token: string;
  slug: string | null;
  target_id: string;
  target_type: string;
  target_title: string;
  permission: string;
  pin_hash: string | null;
  expires_at: Date | null;
  revoked_at: Date | null;
  deleted_at: Date | null;
  created_at: Date;
  created_by: string;
  creator?: { name: string | null; email: string } | null;
};

function computeStatus(link: Pick<ShareLinkRow, "revoked_at" | "expires_at" | "deleted_at">) {
  if (link.deleted_at) return "archived" as const;
  if (link.revoked_at) return "revoked" as const;
  if (link.expires_at && link.expires_at < new Date()) return "expired" as const;
  return "active" as const;
}

function serializeShareLink(link: ShareLinkRow) {
  return {
    id: link.id,
    token: link.token,
    slug: link.slug,
    targetId: link.target_id,
    targetType: link.target_type,
    targetTitle: link.target_title,
    permission: link.permission,
    hasPin: !!link.pin_hash,
    status: computeStatus(link),
    expiresAt: link.expires_at?.toISOString() ?? null,
    revokedAt: link.revoked_at?.toISOString() ?? null,
    createdAt: link.created_at.toISOString(),
    creatorName: link.creator?.name ?? null,
    creatorEmail: link.creator?.email ?? null,
  };
}

// Normaliza + valida (só forma: charset/tamanho/palavra reservada) uma
// entrada de slug vinda do cliente. Não checa disponibilidade — isso é
// responsabilidade de quem chama (create/patch tratam conflito de unique
// constraint; check-slug consulta o banco explicitamente).
function resolveSlugInput(raw: string): { ok: true; slug: string } | { ok: false; error: string } {
  const normalized = normalizeShareLinkSlug(raw);
  const validation = validateShareLinkSlug(normalized);
  if (!validation.ok) return { ok: false, error: shareLinkSlugErrorMessage(validation.reason) };
  return { ok: true, slug: validation.slug };
}

function isSlugUniqueConstraintError(err: unknown): boolean {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== "P2002") return false;
  // MySQL reporta meta.target como a STRING do nome da constraint (ex.:
  // "share_links_slug_key"), não como array de colunas (isso é Postgres) —
  // precisa cobrir os dois formatos (mesmo padrão usado em routes/clients.ts).
  const rawTarget = (err.meta as { target?: unknown })?.target;
  const targets = Array.isArray(rawTarget) ? rawTarget : [rawTarget ?? ""];
  return targets.some((t) => typeof t === "string" && t.includes("slug"));
}

const SHARE_LINK_SELECT = {
  id: true,
  token: true,
  slug: true,
  target_id: true,
  target_type: true,
  target_title: true,
  permission: true,
  pin_hash: true,
  expires_at: true,
  revoked_at: true,
  deleted_at: true,
  created_at: true,
  created_by: true,
} as const;

// Igual a SHARE_LINK_SELECT, mas com o criador — usado só pela central
// geral (GET /?scope=all), onde "quem criou" é uma coluna relevante.
// Não usado na listagem contextual por dashboard, pra não pagar o custo
// do join à toa nela.
const SHARE_LINK_SELECT_WITH_CREATOR = {
  ...SHARE_LINK_SELECT,
  creator: { select: { name: true, email: true } },
} as const;

// ─── POST /api/dashboard-shares — criar link ────────────────────────────────
const createShareSchema = z.object({
  targetId: z.string().min(1),
  targetType: z.enum(["widget", "dashboard"]),
  targetTitle: z.string().min(1),
  permission: z.enum(["view", "comment"]),
  pin: z.string().regex(/^\d{4}$/).optional(),
  expiresAt: z.string().datetime().optional(),
  // URL amigável opcional — sugerida no frontend a partir do título, mas
  // sempre normalizada/validada aqui de novo (nunca confia no que o
  // cliente já "normalizou"). Omitir = link só por token, como sempre foi.
  slug: z.string().min(1).max(80).optional(),
  profile: z.enum(["admin", "agency", "company", "nomad", "partner", "leader"]),
  scopeId: z.string().optional(), // só é considerado se o requisitante for admin
  periodType: z.string().optional(),
  periodFrom: z.string().datetime().optional(),
  periodTo: z.string().datetime().optional(),
  periodLabel: z.string().optional(),
  allowFilterChanges: z.boolean().optional(),
});

router.post(
  "/",
  verifyToken,
  validate(createShareSchema),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof createShareSchema>;
      const user = req.user!;

      let scopeId: string | null;
      if (isAdminUser(user)) {
        scopeId = body.scopeId ?? null;
      } else {
        if (body.profile === "admin") {
          // Não-admin não pode gerar um compartilhamento com visão global.
          res.status(403).json({ error: "Permissão insuficiente" });
          return;
        }
        scopeId = await resolveOwnScopeId(prisma, user, body.profile);
        if (body.profile !== "leader" && !scopeId) {
          res.status(403).json({
            error:
              "Sua conta não está vinculada a nenhuma organização para compartilhar este painel.",
          });
          return;
        }
      }

      let slug: string | null = null;
      if (body.slug) {
        const resolved = resolveSlugInput(body.slug);
        if (!resolved.ok) {
          res.status(400).json({ error: resolved.error });
          return;
        }
        slug = resolved.slug;
      }

      const token = crypto.randomBytes(24).toString("base64url");
      const pinHash = body.pin ? await bcrypt.hash(body.pin, 10) : null;
      const actor = await resolveActor(user);

      const created = await prisma.$transaction(async (tx) => {
        const link = await tx.shareLink.create({
          data: {
            token,
            slug,
            target_id: body.targetId,
            target_type: body.targetType,
            target_title: body.targetTitle,
            permission: body.permission,
            pin_hash: pinHash,
            profile: body.profile,
            scope_id: scopeId,
            period_type: body.periodType,
            period_from: body.periodFrom ? new Date(body.periodFrom) : null,
            period_to: body.periodTo ? new Date(body.periodTo) : null,
            period_label: body.periodLabel,
            allow_filter_changes: body.allowFilterChanges ?? false,
            expires_at: body.expiresAt ? new Date(body.expiresAt) : null,
            created_by: user.id,
          },
          select: SHARE_LINK_SELECT,
        });
        await logShareLinkActivity(tx, {
          shareLinkId: link.id,
          action: "created",
          actor,
          metadata: {
            permission: link.permission,
            hasPin: !!link.pin_hash,
            slug: link.slug,
            expiresAt: link.expires_at?.toISOString() ?? null,
          },
        });
        return link;
      });

      res.status(201).json({ token: created.token, link: serializeShareLink(created) });
    } catch (err) {
      // Mesmo com o slug "disponível" no check-slug, duas criações
      // simultâneas com o mesmo slug podem colidir na constraint única do
      // banco — essa é a fonte de verdade final, não a checagem prévia.
      if (isSlugUniqueConstraintError(err)) {
        res.status(409).json({ error: "Essa URL personalizada já está em uso — escolha outra." });
        return;
      }
      next(err);
    }
  },
);

// ─── GET /api/dashboard-shares — meus links (contextual) ou central geral ──
// `?targetId=` filtra pro contexto de um dashboard/widget específico — é
// assim que a área de compartilhamento mostra só os links DAQUELE
// dashboard, nunca uma lista global misturada (ver ShareLinksPanel no
// frontend). Arquivados (deleted_at) somem da listagem padrão.
//
// `?scope=all` é a Central Geral de Links — só tem efeito pra Admin
// (checado no backend via isAdminUser, nunca confiado do cliente); pra
// qualquer outro perfil o parâmetro é ignorado e a regra de sempre
// (só os próprios links) continua valendo. Aceita filtros adicionais:
// `status` (active|expired|revoked — calculado, filtrado em memória),
// `permission` (view|comment), `creatorEmail` (contains) e `q` (busca por
// título do alvo, slug ou token).
router.get("/", verifyToken, async (req, res, next) => {
  try {
    const targetId = typeof req.query.targetId === "string" ? req.query.targetId : undefined;
    const scopeAll = req.query.scope === "all" && isAdminUser(req.user!);
    const permissionFilter = typeof req.query.permission === "string" ? req.query.permission : undefined;
    const creatorEmailFilter = typeof req.query.creatorEmail === "string" ? req.query.creatorEmail : undefined;
    const q = typeof req.query.q === "string" ? req.query.q.trim() : undefined;
    const statusFilter = typeof req.query.status === "string" ? req.query.status : undefined;

    const links = await prisma.shareLink.findMany({
      where: {
        ...(scopeAll ? {} : { created_by: req.user!.id }),
        deleted_at: null,
        ...(targetId ? { target_id: targetId } : {}),
        ...(permissionFilter ? { permission: permissionFilter } : {}),
        ...(creatorEmailFilter ? { creator: { email: { contains: creatorEmailFilter } } } : {}),
        ...(q
          ? { OR: [{ target_title: { contains: q } }, { slug: { contains: q } }, { token: { contains: q } }] }
          : {}),
      },
      orderBy: { created_at: "desc" },
      select: scopeAll ? SHARE_LINK_SELECT_WITH_CREATOR : SHARE_LINK_SELECT,
    });
    const serialized = links.map(serializeShareLink);
    // Status é calculado, não uma coluna — filtro por status precisa
    // acontecer depois de serializar (mesma regra de sempre, sem duplicar
    // a lógica de computeStatus num where do Prisma).
    const filtered = statusFilter ? serialized.filter((l) => l.status === statusFilter) : serialized;
    res.json({ links: filtered });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/dashboard-shares/check-slug — disponibilidade (autenticado) ──
// Só UX (debounce no frontend) — nunca a fonte de verdade: create/patch
// sempre revalidam contra a constraint única do banco (ver
// isSlugUniqueConstraintError acima), então uma corrida entre o check e o
// submit efetivo não pode reservar o slug pra ninguém indevidamente.
// `excludeId` deixa o dono do próprio link checar o slug atual dele sem
// se autodenunciar como "indisponível".
router.get("/check-slug", verifyToken, async (req, res, next) => {
  try {
    const raw = typeof req.query.slug === "string" ? req.query.slug : "";
    const excludeId = typeof req.query.excludeId === "string" ? req.query.excludeId : undefined;
    const resolved = resolveSlugInput(raw);
    if (!resolved.ok) {
      res.json({ available: false, normalized: normalizeShareLinkSlug(raw), reason: "invalid", message: resolved.error });
      return;
    }
    const existing = await prisma.shareLink.findUnique({
      where: { slug: resolved.slug },
      select: { id: true },
    });
    const available = !existing || existing.id === excludeId;
    res.json({
      available,
      normalized: resolved.slug,
      ...(available ? {} : { reason: "taken", message: "Essa URL já está em uso." }),
    });
  } catch (err) {
    next(err);
  }
});

// Busca o link garantindo ownership (dono do link ou admin) — usado por
// todas as rotas de gerenciamento abaixo. Nunca confia num shareLinkId sem
// checar quem criou; um Agency não consegue agir sobre link de outra.
type OwnedShareLinkResult =
  | { error: 404 | 403; body: { error: string } }
  | { link: ShareLinkRow };

async function findOwnedShareLink(
  id: string,
  user: { id: string; role: string; account_type: string },
): Promise<OwnedShareLinkResult> {
  const link = await prisma.shareLink.findUnique({ where: { id }, select: SHARE_LINK_SELECT });
  if (!link) return { error: 404, body: { error: "Link não encontrado" } };
  if (link.created_by !== user.id && !isAdminUser(user)) {
    return { error: 403, body: { error: "Permissão insuficiente" } };
  }
  return { link };
}

// ─── PATCH /api/dashboard-shares/:id — editar configuração do link ────────
// Ponto único de edição pra tudo que pertence ao link (item 7 revisado):
// slug, permissão, PIN e validade num só PATCH — o frontend manda um
// payload com só os campos que o usuário de fato mudou; campos ausentes
// (`undefined`) ficam intocados.
//
// Estender a validade de um link EXPIRADO (mas não revogado/arquivado) pra
// uma data futura faz ele voltar a "active" automaticamente — status é
// sempre calculado a partir de expires_at, não existe um campo "status"
// salvo pra sincronizar. Um link revogado continua revogado mesmo com
// expiresAt novo: revoked_at só volta com /reactivate, deliberadamente.
//
// Trocar o slug SUBSTITUI o valor da coluna — o slug anterior não vira
// alias/redirect, simplesmente fica livre pra qualquer um usar depois
// (decisão deliberada, evita complexidade de histórico de aliases sem
// necessidade real). `slug: null` remove a URL amigável (volta a só
// token). Isso nunca acontece automaticamente em revogação/arquivamento —
// só uma edição explícita muda o slug.
//
// PIN: `pin: "1234"` define/troca (sempre um hash NOVO — o hash antigo
// nunca é reaproveitado nem revelado, nunca dá pra "ver" o PIN atual);
// `pin: null` remove a proteção; campo ausente não mexe no PIN existente.
// Trocar/remover invalida o PIN anterior imediatamente (não existe cache
// nem sessão de PIN no backend — cada acesso público valida contra o
// pin_hash atual, ver POST /api/share/:token/verify-pin).
//
// Permissão: mudar comment → view não apaga comentários já feitos — só
// impede novos (resolveCommentableLink em routes/share.ts já rejeita POST
// /comments quando permission !== "comment", e essa checagem lê o valor
// atual do banco a cada request, então o efeito é imediato).
const patchShareSchema = z
  .object({
    expiresAt: z.string().datetime().nullable().optional(),
    slug: z.string().max(80).nullable().optional(),
    permission: z.enum(["view", "comment"]).optional(),
    pin: z.string().regex(/^\d{4}$/).nullable().optional(),
  })
  .refine(
    (body) =>
      body.expiresAt !== undefined ||
      body.slug !== undefined ||
      body.permission !== undefined ||
      body.pin !== undefined,
    { message: "Nada para atualizar." },
  );

router.patch("/:id", verifyToken, validate(patchShareSchema), async (req, res, next) => {
  try {
    const found = await findOwnedShareLink(String(req.params.id), req.user!);
    if ("error" in found) {
      res.status(found.error).json(found.body);
      return;
    }
    if (found.link.deleted_at) {
      res.status(410).json({ error: "Link arquivado — crie um novo link." });
      return;
    }
    const { expiresAt, slug: rawSlug, permission, pin } = req.body as z.infer<typeof patchShareSchema>;

    const data: {
      expires_at?: Date | null;
      slug?: string | null;
      permission?: string;
      pin_hash?: string | null;
    } = {};
    // Cada campo alterado vira UMA entrada de log com a mudança relevante
    // (de → para) — nunca PIN em texto puro, só se ele foi
    // ativado/trocado/removido (ver logShareLinkActivity, que também
    // filtra qualquer chave suspeita como defesa extra).
    const activityEntries: { action: Parameters<typeof logShareLinkActivity>[1]["action"]; metadata?: Record<string, unknown> }[] = [];

    if (expiresAt !== undefined) {
      data.expires_at = expiresAt ? new Date(expiresAt) : null;
      activityEntries.push({
        action: "expiry_changed",
        metadata: { from: found.link.expires_at?.toISOString() ?? null, to: data.expires_at?.toISOString() ?? null },
      });
    }
    if (rawSlug !== undefined) {
      if (rawSlug === null) {
        data.slug = null;
      } else {
        const resolved = resolveSlugInput(rawSlug);
        if (!resolved.ok) {
          res.status(400).json({ error: resolved.error });
          return;
        }
        data.slug = resolved.slug;
      }
      activityEntries.push({ action: "slug_changed", metadata: { from: found.link.slug, to: data.slug } });
    }
    if (permission !== undefined) {
      data.permission = permission;
      activityEntries.push({ action: "permission_changed", metadata: { from: found.link.permission, to: permission } });
    }
    if (pin !== undefined) {
      data.pin_hash = pin === null ? null : await bcrypt.hash(pin, 10);
      // Ação distingue ativar (não tinha PIN) / trocar (já tinha) / remover
      // — nunca o valor do PIN em si, só o fato de a proteção ter mudado.
      activityEntries.push({
        action: pin === null ? "pin_removed" : found.link.pin_hash ? "pin_changed" : "pin_enabled",
      });
    }

    const actor = await resolveActor(req.user!);
    const updated = await prisma.$transaction(async (tx) => {
      const link = await tx.shareLink.update({
        where: { id: found.link.id },
        data,
        select: SHARE_LINK_SELECT,
      });
      for (const entry of activityEntries) {
        await logShareLinkActivity(tx, { shareLinkId: link.id, action: entry.action, actor, metadata: entry.metadata });
      }
      return link;
    });
    res.json({ link: serializeShareLink(updated) });
  } catch (err) {
    if (isSlugUniqueConstraintError(err)) {
      res.status(409).json({ error: "Essa URL personalizada já está em uso — escolha outra." });
      return;
    }
    next(err);
  }
});

// ─── POST /api/dashboard-shares/:id/reactivate — desfazer revogação ───────
// Seguro pela própria arquitetura: revoked_at é só um timestamp nullable
// sem efeito colateral em cascata (comentários/anexos não são apagados
// nem alterados na revogação), então voltar pra null é uma operação
// reversível de verdade. Não reativa link arquivado — pra esse caso a
// regra de produto é gerar um novo link.
router.post("/:id/reactivate", verifyToken, async (req, res, next) => {
  try {
    const found = await findOwnedShareLink(String(req.params.id), req.user!);
    if ("error" in found) {
      res.status(found.error).json(found.body);
      return;
    }
    if (found.link.deleted_at) {
      res.status(410).json({ error: "Link arquivado — crie um novo link." });
      return;
    }
    const actor = await resolveActor(req.user!);
    const updated = await prisma.$transaction(async (tx) => {
      const link = await tx.shareLink.update({
        where: { id: found.link.id },
        data: { revoked_at: null },
        select: SHARE_LINK_SELECT,
      });
      await logShareLinkActivity(tx, { shareLinkId: link.id, action: "reactivated", actor });
      return link;
    });
    res.json({ link: serializeShareLink(updated) });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/dashboard-shares/:id — revogar (bloqueia acesso, preserva
// o registro) ────────────────────────────────────────────────────────────
router.delete("/:id", verifyToken, async (req, res, next) => {
  try {
    const found = await findOwnedShareLink(String(req.params.id), req.user!);
    if ("error" in found) {
      res.status(found.error).json(found.body);
      return;
    }
    if (found.link.deleted_at) {
      res.json({ link: serializeShareLink(found.link) });
      return;
    }
    if (found.link.revoked_at) {
      res.json({ ok: true, link: serializeShareLink(found.link) });
      return;
    }
    const actor = await resolveActor(req.user!);
    const updated = await prisma.$transaction(async (tx) => {
      const link = await tx.shareLink.update({
        where: { id: found.link.id },
        data: { revoked_at: new Date() },
        select: SHARE_LINK_SELECT,
      });
      await logShareLinkActivity(tx, { shareLinkId: link.id, action: "revoked", actor });
      return link;
    });
    res.json({ ok: true, link: serializeShareLink(updated) });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/dashboard-shares/:id/archive — excluir (soft-delete) ───────
// Some da listagem operacional (GET / já filtra deleted_at: null) e passa
// a ser tratado como inválido pelas rotas públicas de routes/share.ts —
// mas a linha continua no banco, junto com os comentários/anexos e o
// histórico de auditoria ligados a ela via FK. Nunca DELETE destrutivo.
router.post("/:id/archive", verifyToken, async (req, res, next) => {
  try {
    const found = await findOwnedShareLink(String(req.params.id), req.user!);
    if ("error" in found) {
      res.status(found.error).json(found.body);
      return;
    }
    if (found.link.deleted_at) {
      res.json({ ok: true, link: serializeShareLink(found.link) });
      return;
    }
    const actor = await resolveActor(req.user!);
    const updated = await prisma.$transaction(async (tx) => {
      const link = await tx.shareLink.update({
        where: { id: found.link.id },
        data: { deleted_at: new Date() },
        select: SHARE_LINK_SELECT,
      });
      await logShareLinkActivity(tx, { shareLinkId: link.id, action: "archived", actor });
      return link;
    });
    res.json({ ok: true, link: serializeShareLink(updated) });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/dashboard-shares/:id/activity — histórico do link ───────────
// Sobrevive a revogação/expiração/arquivamento: o filtro de ownership é o
// mesmo (findOwnedShareLink), mas NÃO exige deleted_at: null — um link
// arquivado continua tendo seu histórico consultável por quem tem
// permissão sobre ele, só não aparece mais na listagem operacional padrão.
router.get("/:id/activity", verifyToken, async (req, res, next) => {
  try {
    const found = await findOwnedShareLink(String(req.params.id), req.user!);
    if ("error" in found) {
      res.status(found.error).json(found.body);
      return;
    }
    const activities = await prisma.shareLinkActivity.findMany({
      where: { share_link_id: found.link.id },
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        action: true,
        actor_name: true,
        actor_email: true,
        metadata: true,
        created_at: true,
      },
    });
    res.json({
      activities: activities.map((a) => ({
        id: a.id,
        action: a.action,
        label: shareLinkActivityLabel(a.action),
        actorName: a.actor_name,
        actorEmail: a.actor_email,
        metadata: a.metadata,
        createdAt: a.created_at.toISOString(),
      })),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
