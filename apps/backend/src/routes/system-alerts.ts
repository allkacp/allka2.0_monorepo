import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken, requireAdminMaster } from "../middleware/auth";
import { writeAccessAudit } from "../lib/product-feedback-service";
import { findUnknownVariables, renderTemplate, TRIGGER_TYPES } from "../lib/alert-engine";

const router = Router();

// ── Escopo por destinatário ───────────────────────────────────────────────────
//
// SystemAlert nasceu como mural global do Admin ("nômade não encontrado",
// "tarefa atrasada"): todas as rotas aqui liam e escreviam sem olhar para quem
// era o alerta. Com o motor de etapas passaram a existir avisos endereçados
// (`user_id`, ver migration 20260804160000) — e sem escopo eles ficavam
// invisíveis para o dono e visíveis para todos os outros.
//
//   Admin      → alertas gerais (user_id nulo) + os endereçados a ele
//   Demais     → só os endereçados a ele
//
// O escopo entra em TODAS as rotas, não só na listagem: sem isso qualquer
// usuário marcaria como lido ou apagaria o alerta de outro. O `read-all`, em
// particular, marcava o mural inteiro da plataforma.

function escopoDoUsuario(req: Request): Record<string, unknown> {
  const user = req.user!;
  const ehAdmin = user.role === "admin" || user.account_type === "admin";
  return ehAdmin
    ? { OR: [{ user_id: null }, { user_id: user.id }] }
    : { user_id: user.id };
}

// ── Schemas ───────────────────────────────────────────────────────────────────

const listSchema = z.object({
  type: z.string().optional(),
  severity: z.enum(["info", "warning", "error"]).optional(),
  category: z.enum(["notificacao", "alerta"]).optional(),
  is_read: z
    .string()
    .optional()
    .transform((v) =>
      v === "true" ? true : v === "false" ? false : undefined,
    ),
  // Ausente = só ativos (comportamento padrão, "o que precisa resolver").
  // "true"/"false" filtram explicitamente; "all" traz os dois.
  is_archived: z.enum(["true", "false", "all"]).optional(),
  entity_type: z.string().optional(),
  entity_id: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// ── GET /api/system-alerts ────────────────────────────────────────────────────

router.get(
  "/",
  verifyToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = listSchema.safeParse(req.query);
      if (!query.success) {
        res.status(400).json({
          error: "Parâmetros inválidos",
          details: query.error.flatten(),
        });
        return;
      }

      const { type, severity, category, is_read, is_archived, entity_type, entity_id, limit, offset } =
        query.data;

      const filtros: Record<string, unknown> = {};
      if (type) filtros.type = type;
      if (severity) filtros.severity = severity;
      if (category) filtros.category = category;
      if (is_read !== undefined) filtros.is_read = is_read;
      if (entity_type) filtros.entity_type = entity_type;
      if (entity_id) filtros.entity_id = entity_id;
      if (is_archived === "true") filtros.is_archived = true;
      else if (is_archived === "false" || is_archived === undefined) filtros.is_archived = false;
      // is_archived === "all" → sem filtro, traz os dois.

      // AND explícito: o escopo usa OR internamente (admin vê geral + os seus),
      // e espalhar as duas coisas no mesmo objeto faria um sobrescrever o outro.
      const where = { AND: [filtros, escopoDoUsuario(req)] };

      const [total, alerts, unread] = await Promise.all([
        prisma.systemAlert.count({ where }),
        prisma.systemAlert.findMany({
          where,
          orderBy: { created_at: "desc" },
          take: limit,
          skip: offset,
        }),
        prisma.systemAlert.count({
          where: { AND: [filtros, escopoDoUsuario(req), { is_read: false }] },
        }),
      ]);

      res.json({ data: alerts, total, unread });
    } catch (err) {
      next(err);
    }
  },
);

// ── GET /api/system-alerts/unread-count ──────────────────────────────────────

const unreadCountSchema = z.object({
  category: z.enum(["notificacao", "alerta"]).optional(),
});

router.get(
  "/unread-count",
  verifyToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = unreadCountSchema.safeParse(req.query);
      if (!query.success) {
        res.status(400).json({ error: "Parâmetros inválidos", details: query.error.flatten() });
        return;
      }
      const filtros: Record<string, unknown> = {};
      if (query.data.category) filtros.category = query.data.category;

      const baseWhere = [filtros, { is_read: false }, { is_archived: false }, escopoDoUsuario(req)];
      const count = await prisma.systemAlert.count({ where: { AND: baseWhere } });

      // Quebra por severidade só faz sentido pra alerta (é o que a reunião
      // chama de "criticidade": info→verde, warning→amarelo, error→vermelho
      // — reaproveita o campo já existente, não cria um novo). Some no
      // corpo só quando o pedido já filtrou por category=alerta, pra não
      // sugerir esse conceito pra notificação comum.
      let bySeverity: { info: number; warning: number; error: number } | undefined;
      if (query.data.category === "alerta") {
        const [info, warning, error] = await Promise.all([
          prisma.systemAlert.count({ where: { AND: [...baseWhere, { severity: "info" }] } }),
          prisma.systemAlert.count({ where: { AND: [...baseWhere, { severity: "warning" }] } }),
          prisma.systemAlert.count({ where: { AND: [...baseWhere, { severity: "error" }] } }),
        ]);
        bySeverity = { info, warning, error };
      }

      res.json(bySeverity ? { count, bySeverity } : { count });
    } catch (err) {
      next(err);
    }
  },
);

// ── PATCH /api/system-alerts/:id/read ────────────────────────────────────────

router.patch(
  "/:id/read",
  verifyToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // findFirst com escopo em vez de findUnique: alerta de outra pessoa tem
      // de responder "não encontrado", não ser marcado como lido.
      const alert = await prisma.systemAlert.findFirst({
        where: { AND: [{ id: req.params.id as string }, escopoDoUsuario(req)] },
      });
      if (!alert) {
        res.status(404).json({ error: "Alerta não encontrado" });
        return;
      }
      const updated = await prisma.systemAlert.update({
        where: { id: alert.id },
        data: { is_read: true, read_at: new Date() },
      });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

// ── PATCH /api/system-alerts/:id/archive ─────────────────────────────────────
// Soft — some da visão padrão ("o que precisa resolver"), mas o dado
// continua existindo e consultável com is_archived=true/all.

router.patch(
  "/:id/archive",
  verifyToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const alert = await prisma.systemAlert.findFirst({
        where: { AND: [{ id: req.params.id as string }, escopoDoUsuario(req)] },
      });
      if (!alert) {
        res.status(404).json({ error: "Alerta não encontrado" });
        return;
      }
      const updated = await prisma.systemAlert.update({
        where: { id: alert.id },
        data: { is_archived: true, archived_at: new Date() },
      });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

// ── PATCH /api/system-alerts/:id/unarchive ───────────────────────────────────

router.patch(
  "/:id/unarchive",
  verifyToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const alert = await prisma.systemAlert.findFirst({
        where: { AND: [{ id: req.params.id as string }, escopoDoUsuario(req)] },
      });
      if (!alert) {
        res.status(404).json({ error: "Alerta não encontrado" });
        return;
      }
      const updated = await prisma.systemAlert.update({
        where: { id: alert.id },
        data: { is_archived: false, archived_at: null },
      });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

// ── PATCH /api/system-alerts/read-all ────────────────────────────────────────

router.patch(
  "/read-all",
  verifyToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = unreadCountSchema.safeParse(req.query);
      if (!query.success) {
        res.status(400).json({ error: "Parâmetros inválidos", details: query.error.flatten() });
        return;
      }
      const filtros: Record<string, unknown> = {};
      if (query.data.category) filtros.category = query.data.category;

      const result = await prisma.systemAlert.updateMany({
        where: { AND: [filtros, { is_read: false }, escopoDoUsuario(req)] },
        data: { is_read: true, read_at: new Date() },
      });
      res.json({ updated: result.count });
    } catch (err) {
      next(err);
    }
  },
);

// ── DELETE /api/system-alerts/:id ────────────────────────────────────────────

router.delete(
  "/:id",
  verifyToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const alert = await prisma.systemAlert.findFirst({
        where: { AND: [{ id: req.params.id as string }, escopoDoUsuario(req)] },
        select: { id: true },
      });
      if (!alert) {
        res.status(404).json({ error: "Alerta não encontrado" });
        return;
      }
      await prisma.systemAlert.delete({ where: { id: alert.id } });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// Central de Alertas (ata 2026-08: "criar uma central para o cadastro e
// gestão de alertas... Admin Master deve ter a capacidade de criar,
// modificar ou reclassificar alertas... sem depender de alterações no
// código"). Gerencia os mesmos SystemAlert de sempre — nenhuma tabela nova,
// nenhum motor de regras/templates. Tudo abaixo exige requireAdminMaster
// (estritamente is_master, sem a regra do avô de requirePermission — ver
// comentário em middleware/auth.ts) e opera SEM o escopoDoUsuario de cima:
// o Admin Master administra qualquer alerta, endereçado a quem for, não só
// o que já era visível pra ele.
// ═══════════════════════════════════════════════════════════════════════════

const CRITICALITY_TYPE = "alerta_admin_manual";

// SystemAlert.user_id é um escalar solto, sem relação Prisma pro lado do
// User (nenhum @relation declarado) — criar uma exigiria migration (FK
// nova numa coluna que já existe sem constraint) só pra poder usar
// `include`. Mais simples e sem tocar no schema: buscar os usuários à parte
// e anexar como "destinatario" na resposta.
type DestinatarioInfo = { id: string; name: string; email: string } | null;

async function attachDestinatario<T extends { user_id: string | null }>(
  alert: T,
): Promise<T & { destinatario: DestinatarioInfo }> {
  if (!alert.user_id) return { ...alert, destinatario: null };
  const user = await prisma.user.findUnique({
    where: { id: alert.user_id },
    select: { id: true, name: true, email: true },
  });
  return { ...alert, destinatario: user ?? null };
}

async function attachDestinatarioMany<T extends { user_id: string | null }>(
  alerts: T[],
): Promise<(T & { destinatario: DestinatarioInfo })[]> {
  const ids = [...new Set(alerts.map((a) => a.user_id).filter((id): id is string => !!id))];
  if (ids.length === 0) return alerts.map((a) => ({ ...a, destinatario: null }));
  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, email: true },
  });
  const byId = new Map(users.map((u) => [u.id, u]));
  return alerts.map((a) => ({ ...a, destinatario: a.user_id ? (byId.get(a.user_id) ?? null) : null }));
}

async function auditSystemAlert(input: {
  actorId: string;
  action: string;
  alertId: string;
  before?: unknown;
  after?: unknown;
}) {
  await writeAccessAudit({
    actorId: input.actorId,
    action: input.action,
    before: input.before !== undefined ? { system_alert_id: input.alertId, ...(input.before as object) } : { system_alert_id: input.alertId },
    after: input.after !== undefined ? { system_alert_id: input.alertId, ...(input.after as object) } : undefined,
  });
}

// ── GET /api/system-alerts/admin — lista completa pra central administrativa

const adminListSchema = z.object({
  search: z.string().trim().max(200).optional(),
  severity: z.enum(["info", "warning", "error"]).optional(),
  is_archived: z.enum(["true", "false", "all"]).default("false"),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

router.get(
  "/admin",
  verifyToken,
  requireAdminMaster,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = adminListSchema.safeParse(req.query);
      if (!query.success) {
        res.status(400).json({ error: "Parâmetros inválidos", details: query.error.flatten() });
        return;
      }
      const { search, severity, is_archived, limit, offset } = query.data;

      const filtros: Record<string, unknown> = { category: "alerta" };
      if (severity) filtros.severity = severity;
      if (is_archived === "true") filtros.is_archived = true;
      else if (is_archived === "false") filtros.is_archived = false;
      // "all" → sem filtro de arquivado.
      if (search) {
        filtros.OR = [
          { title: { contains: search } },
          { message: { contains: search } },
        ];
      }

      const [total, alerts] = await Promise.all([
        prisma.systemAlert.count({ where: filtros }),
        prisma.systemAlert.findMany({
          where: filtros,
          orderBy: { created_at: "desc" },
          take: limit,
          skip: offset,
        }),
      ]);

      res.json({ data: await attachDestinatarioMany(alerts), total });
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /api/system-alerts/admin — criação manual ───────────────────────────

const createAdminAlertSchema = z.object({
  title: z.string().trim().min(3, "Título deve ter no mínimo 3 caracteres").max(200, "Título deve ter no máximo 200 caracteres"),
  message: z.string().trim().min(3, "Mensagem deve ter no mínimo 3 caracteres").max(2000, "Mensagem deve ter no máximo 2000 caracteres"),
  severity: z.enum(["info", "warning", "error"], { errorMap: () => ({ message: "Criticidade inválida" }) }),
  // Ausente/null = alerta geral (visível a todo Admin) — conceito que já
  // existia (user_id nulo), não inventado aqui. Presente = destinatário
  // específico, validado abaixo (precisa existir e estar ativo).
  user_id: z.string().trim().min(1).nullable().optional(),
});

router.post(
  "/admin",
  verifyToken,
  requireAdminMaster,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = createAdminAlertSchema.safeParse(req.body);
      if (!body.success) {
        res.status(400).json({ error: "Dados inválidos", details: body.error.flatten() });
        return;
      }
      const { title, message, severity, user_id } = body.data;

      // Destinatário nunca aceito só porque o frontend mandou um id — tem
      // que existir de verdade e estar ativo, igual a qualquer outro fluxo
      // administrativo desta plataforma.
      if (user_id) {
        const destinatario = await prisma.user.findUnique({
          where: { id: user_id },
          select: { id: true, is_active: true },
        });
        if (!destinatario || !destinatario.is_active) {
          res.status(400).json({ error: "Destinatário inválido ou inexistente" });
          return;
        }
      }

      const created = await prisma.systemAlert.create({
        data: {
          type: CRITICALITY_TYPE,
          title,
          message,
          severity,
          category: "alerta",
          user_id: user_id ?? null,
        },
      });

      await auditSystemAlert({
        actorId: req.user!.id,
        action: "system_alert.created",
        alertId: created.id,
        after: { title, severity, user_id: user_id ?? null },
      });

      res.status(201).json(await attachDestinatario(created));
    } catch (err) {
      next(err);
    }
  },
);

// ── PATCH /api/system-alerts/admin/:id — editar título/mensagem ──────────────

const editAdminAlertSchema = z.object({
  title: z.string().trim().min(3, "Título deve ter no mínimo 3 caracteres").max(200, "Título deve ter no máximo 200 caracteres").optional(),
  message: z.string().trim().min(3, "Mensagem deve ter no mínimo 3 caracteres").max(2000, "Mensagem deve ter no máximo 2000 caracteres").optional(),
});

router.patch(
  "/admin/:id",
  verifyToken,
  requireAdminMaster,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = editAdminAlertSchema.safeParse(req.body);
      if (!body.success) {
        res.status(400).json({ error: "Dados inválidos", details: body.error.flatten() });
        return;
      }
      if (Object.keys(body.data).length === 0) {
        res.status(400).json({ error: "Informe título e/ou mensagem para editar" });
        return;
      }

      const before = await prisma.systemAlert.findFirst({
        where: { id: req.params.id as string, category: "alerta" },
        select: { id: true, title: true, message: true },
      });
      if (!before) {
        res.status(404).json({ error: "Alerta não encontrado" });
        return;
      }

      const updated = await prisma.systemAlert.update({
        where: { id: before.id },
        data: body.data,
      });

      await auditSystemAlert({
        actorId: req.user!.id,
        action: "system_alert.updated",
        alertId: before.id,
        before: { title: before.title, message: before.message },
        after: body.data,
      });

      res.json(await attachDestinatario(updated));
    } catch (err) {
      next(err);
    }
  },
);

// ── PATCH /api/system-alerts/admin/:id/severity — reclassificar criticidade ──

const reclassifySchema = z.object({
  severity: z.enum(["info", "warning", "error"], { errorMap: () => ({ message: "Criticidade inválida" }) }),
});

router.patch(
  "/admin/:id/severity",
  verifyToken,
  requireAdminMaster,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = reclassifySchema.safeParse(req.body);
      if (!body.success) {
        res.status(400).json({ error: "Dados inválidos", details: body.error.flatten() });
        return;
      }

      const before = await prisma.systemAlert.findFirst({
        where: { id: req.params.id as string, category: "alerta" },
        select: { id: true, severity: true },
      });
      if (!before) {
        res.status(404).json({ error: "Alerta não encontrado" });
        return;
      }

      // Mesmo registro, sempre — reclassificar nunca cria uma ocorrência
      // nova nem duplica: é um único UPDATE no id já existente.
      const updated = await prisma.systemAlert.update({
        where: { id: before.id },
        data: { severity: body.data.severity },
      });

      await auditSystemAlert({
        actorId: req.user!.id,
        action: "system_alert.severity_changed",
        alertId: before.id,
        before: { severity: before.severity },
        after: { severity: body.data.severity },
      });

      res.json(await attachDestinatario(updated));
    } catch (err) {
      next(err);
    }
  },
);

// ── PATCH /api/system-alerts/admin/:id/archive|unarchive — arquivamento ──────
// administrativo. Distinto do /:id/archive de cima: aquele é escopoDoUsuario
// (só o que já é visível pra quem chama); este é Admin Master administrando
// QUALQUER alerta, endereçado a quem for. Mesmo soft-delete de sempre —
// nunca physical delete.

router.patch(
  "/admin/:id/archive",
  verifyToken,
  requireAdminMaster,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const before = await prisma.systemAlert.findFirst({
        where: { id: req.params.id as string, category: "alerta" },
        select: { id: true, is_archived: true },
      });
      if (!before) {
        res.status(404).json({ error: "Alerta não encontrado" });
        return;
      }
      const updated = await prisma.systemAlert.update({
        where: { id: before.id },
        data: { is_archived: true, archived_at: new Date() },
      });
      await auditSystemAlert({
        actorId: req.user!.id,
        action: "system_alert.archived",
        alertId: before.id,
        before: { is_archived: before.is_archived },
        after: { is_archived: true },
      });
      res.json(await attachDestinatario(updated));
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  "/admin/:id/unarchive",
  verifyToken,
  requireAdminMaster,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const before = await prisma.systemAlert.findFirst({
        where: { id: req.params.id as string, category: "alerta" },
        select: { id: true, is_archived: true },
      });
      if (!before) {
        res.status(404).json({ error: "Alerta não encontrado" });
        return;
      }
      const updated = await prisma.systemAlert.update({
        where: { id: before.id },
        data: { is_archived: false, archived_at: null },
      });
      await auditSystemAlert({
        actorId: req.user!.id,
        action: "system_alert.unarchived",
        alertId: before.id,
        before: { is_archived: before.is_archived },
        after: { is_archived: false },
      });
      res.json(await attachDestinatario(updated));
    } catch (err) {
      next(err);
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// Padrões e Regras (ata 2026-08, 2º lote) — Padrão → Regra → Verificação
// automática → Ocorrência. As ocorrências continuam sendo criadas só pelo
// motor (src/lib/alert-engine.ts); estas rotas só administram o CONTEÚDO
// (Padrão) e o COMPORTAMENTO (Regra), nunca criam SystemAlert diretamente.
// ═══════════════════════════════════════════════════════════════════════════

// ── GET /api/system-alerts/admin/standards ────────────────────────────────

router.get(
  "/admin/standards",
  verifyToken,
  requireAdminMaster,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const standards = await prisma.alertStandard.findMany({ orderBy: { created_at: "asc" } });
      res.json({
        data: standards.map((s) => ({
          ...s,
          allowed_variables: JSON.parse(s.allowed_variables_json) as string[],
        })),
      });
    } catch (err) {
      next(err);
    }
  },
);

// ── PATCH /api/system-alerts/admin/standards/:id — nunca a key ───────────

const editStandardSchema = z.object({
  name: z.string().trim().min(3).max(200).optional(),
  title: z.string().trim().min(3).max(200).optional(),
  message: z.string().trim().min(3).max(2000).optional(),
  default_severity: z.enum(["info", "warning", "error"]).optional(),
  is_active: z.boolean().optional(),
});

router.patch(
  "/admin/standards/:id",
  verifyToken,
  requireAdminMaster,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = editStandardSchema.safeParse(req.body);
      if (!body.success) {
        res.status(400).json({ error: "Dados inválidos", details: body.error.flatten() });
        return;
      }
      if (Object.keys(body.data).length === 0) {
        res.status(400).json({ error: "Informe ao menos um campo para editar" });
        return;
      }

      const before = await prisma.alertStandard.findUnique({ where: { id: req.params.id as string } });
      if (!before) {
        res.status(404).json({ error: "Padrão não encontrado" });
        return;
      }

      // Variável fora da allowlist deste padrão nunca é aceita em título/
      // mensagem — nunca texto livre representando código.
      const allowed = JSON.parse(before.allowed_variables_json) as string[];
      const titleToCheck = body.data.title ?? before.title;
      const messageToCheck = body.data.message ?? before.message;
      const unknown = [...findUnknownVariables(titleToCheck, allowed), ...findUnknownVariables(messageToCheck, allowed)];
      if (unknown.length > 0) {
        res.status(400).json({ error: `Variável não permitida: ${[...new Set(unknown)].join(", ")}` });
        return;
      }

      const updated = await prisma.alertStandard.update({
        where: { id: before.id },
        data: { ...body.data, updated_by_id: req.user!.id },
      });

      await writeAccessAudit({
        actorId: req.user!.id,
        action: "alert_standard.updated",
        before: { alert_standard_id: before.id, name: before.name, title: before.title, message: before.message, default_severity: before.default_severity, is_active: before.is_active },
        after: { alert_standard_id: before.id, ...body.data },
      });

      res.json({ ...updated, allowed_variables: allowed });
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /api/system-alerts/admin/standards/:id/preview — nunca cria alerta

router.post(
  "/admin/standards/:id/preview",
  verifyToken,
  requireAdminMaster,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const standard = await prisma.alertStandard.findUnique({ where: { id: req.params.id as string } });
      if (!standard) {
        res.status(404).json({ error: "Padrão não encontrado" });
        return;
      }
      const allowed = JSON.parse(standard.allowed_variables_json) as string[];
      // Dados fictícios claramente identificados — nunca lê tarefa real.
      const fixture: Record<string, string> = {
        tarefa: "[EXEMPLO] Tarefa de demonstração",
        prazo: "31/12/2026",
        projeto: "[EXEMPLO] Projeto de demonstração",
      };
      res.json({
        title: renderTemplate(standard.title, fixture, allowed),
        message: renderTemplate(standard.message, fixture, allowed),
        severity: standard.default_severity,
        fictitious: true,
      });
    } catch (err) {
      next(err);
    }
  },
);

// ── GET /api/system-alerts/admin/rules ────────────────────────────────────

router.get(
  "/admin/rules",
  verifyToken,
  requireAdminMaster,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const rules = await prisma.alertRule.findMany({
        orderBy: { created_at: "asc" },
        include: { standard: { select: { id: true, key: true, name: true, default_severity: true } } },
      });
      const lastRuns = await prisma.systemAlert.groupBy({
        by: ["rule_id"],
        where: { rule_id: { in: rules.map((r) => r.id) } },
        _max: { created_at: true },
      });
      const lastRunByRule = new Map(lastRuns.map((r) => [r.rule_id, r._max.created_at]));

      res.json({
        data: rules.map((r) => ({ ...r, last_triggered_at: lastRunByRule.get(r.id) ?? null })),
      });
    } catch (err) {
      next(err);
    }
  },
);

// ── PATCH /api/system-alerts/admin/rules/:id ──────────────────────────────

const editRuleSchema = z.object({
  is_active: z.boolean().optional(),
  lead_time_minutes: z.number().int().min(1).max(30 * 24 * 60).optional().nullable(),
  severity_override: z.enum(["info", "warning", "error"]).nullable().optional(),
});

router.patch(
  "/admin/rules/:id",
  verifyToken,
  requireAdminMaster,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = editRuleSchema.safeParse(req.body);
      if (!body.success) {
        res.status(400).json({ error: "Dados inválidos", details: body.error.flatten() });
        return;
      }
      if (Object.keys(body.data).length === 0) {
        res.status(400).json({ error: "Informe ao menos um campo para editar" });
        return;
      }

      const before = await prisma.alertRule.findUnique({ where: { id: req.params.id as string } });
      if (!before) {
        res.status(404).json({ error: "Regra não encontrada" });
        return;
      }

      // Antecedência só faz sentido pra task.due_soon — não deixa configurar
      // à toa num gatilho que nunca a usa.
      if (body.data.lead_time_minutes !== undefined && before.trigger_type !== TRIGGER_TYPES[0]) {
        res.status(400).json({ error: "Este gatilho não usa antecedência" });
        return;
      }

      const updated = await prisma.alertRule.update({
        where: { id: before.id },
        data: { ...body.data, updated_by_id: req.user!.id },
      });

      await writeAccessAudit({
        actorId: req.user!.id,
        action: "alert_rule.updated",
        before: { alert_rule_id: before.id, is_active: before.is_active, lead_time_minutes: before.lead_time_minutes, severity_override: before.severity_override },
        after: { alert_rule_id: before.id, ...body.data },
      });

      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
