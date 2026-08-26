import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import multer from "multer";
import fs from "fs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken, requireAdminMaster } from "../middleware/auth";
import { writeAccessAudit } from "../lib/product-feedback-service";
import {
  computeNextRun,
  findUnknownVariables,
  isDueSoonTrigger,
  parseRecipientRoles,
  RECIPIENT_CATEGORIES,
  RECIPIENT_CATEGORY_LABELS,
  renderTemplate,
  TRIGGER_ENTITY_TYPE,
} from "../lib/alert-engine";
import {
  MAX_ALERT_IMAGE_BYTES,
  alertImagePath,
  deleteAlertImage,
  detectImageFormat,
  storeAlertImageBuffer,
} from "../lib/alert-image-storage";
import { isValidIanaTimeZone, isValidTimeOfDay, zonedTimeToUtc } from "../lib/timezone";

const router = Router();

// ── Imagem de Alerta (ata 2026-08, 4º lote) ───────────────────────────────
// Upload é Admin Master only (mesmo escopo de quem cria Padrão/Programação/
// Avulso com imagem); a validação real é por CONTEÚDO (assinatura de bytes
// em alert-image-storage.ts), nunca por extensão/Content-Type do
// multipart — protege contra arquivo disfarçado. multer em memória (não
// disco) porque o arquivo só é gravado DEPOIS de confirmado o formato real.
const alertImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_ALERT_IMAGE_BYTES },
});

router.post(
  "/admin/images",
  verifyToken,
  requireAdminMaster,
  alertImageUpload.single("file"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "Nenhum arquivo enviado" });
        return;
      }
      const detected = detectImageFormat(req.file.buffer);
      if (!detected) {
        res.status(400).json({ error: "Formato de imagem inválido — envie JPEG, PNG ou WebP" });
        return;
      }
      const fileName = storeAlertImageBuffer(req.file.buffer, detected.ext);
      await writeAccessAudit({
        actorId: req.user!.id,
        action: "alert_image.uploaded",
        after: { file_name: fileName, mime: detected.mime, size: req.file.buffer.length },
      });
      // Nunca base64 dentro do alerta — só o nome físico, resolvido pra URL
      // pela rota de servir abaixo.
      res.status(201).json({ file_name: fileName, url: `/api/system-alerts/admin/images/${fileName}` });
    } catch (err) {
      next(err);
    }
  },
);

// GET .../images/:fileName — serve a imagem pra QUALQUER usuário autenticado
// (não só Admin Master): o destinatário de um alerta com imagem também
// precisa conseguir vê-la. Nunca público sem sessão — nome físico aleatório
// já impede adivinhação, isto some com a última brecha (sessão zero).
router.get("/admin/images/:fileName", verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // fileName vem só do generateStoredFileName do backend (uuid + extensão
    // curta fixa) — mesmo assim, nunca resolve caminho fora da pasta.
    const fileName = req.params.fileName as string;
    if (!/^[a-zA-Z0-9-]+\.(jpg|png|webp)$/.test(fileName)) {
      res.status(400).json({ error: "Nome de arquivo inválido" });
      return;
    }
    const filePath = alertImagePath(fileName);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: "Imagem não encontrada" });
      return;
    }
    res.sendFile(filePath);
  } catch (err) {
    next(err);
  }
});

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

// Deriva a URL servível a partir do nome físico — nunca expõe caminho de
// disco, nunca base64.
function withImageUrl<T extends { image_file_name?: string | null }>(alert: T): T & { image_url: string | null } {
  return { ...alert, image_url: alert.image_file_name ? `/api/system-alerts/admin/images/${alert.image_file_name}` : null };
}

async function attachDestinatario<T extends { user_id: string | null; image_file_name?: string | null }>(
  alert: T,
): Promise<T & { destinatario: DestinatarioInfo; image_url: string | null }> {
  const withImg = withImageUrl(alert);
  if (!alert.user_id) return { ...withImg, destinatario: null };
  const user = await prisma.user.findUnique({
    where: { id: alert.user_id },
    select: { id: true, name: true, email: true },
  });
  return { ...withImg, destinatario: user ?? null };
}

async function attachDestinatarioMany<T extends { user_id: string | null; image_file_name?: string | null }>(
  alerts: T[],
): Promise<(T & { destinatario: DestinatarioInfo; image_url: string | null })[]> {
  const ids = [...new Set(alerts.map((a) => a.user_id).filter((id): id is string => !!id))];
  const withImgs = alerts.map(withImageUrl);
  if (ids.length === 0) return withImgs.map((a) => ({ ...a, destinatario: null }));
  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, email: true },
  });
  const byId = new Map(users.map((u) => [u.id, u]));
  return withImgs.map((a) => ({ ...a, destinatario: a.user_id ? (byId.get(a.user_id) ?? null) : null }));
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

const createAdminAlertSchema = z
  .object({
    title: z.string().trim().min(3, "Título deve ter no mínimo 3 caracteres").max(200, "Título deve ter no máximo 200 caracteres"),
    message: z.string().trim().min(3, "Mensagem deve ter no mínimo 3 caracteres").max(2000, "Mensagem deve ter no máximo 2000 caracteres"),
    severity: z.enum(["info", "warning", "error"], { errorMap: () => ({ message: "Criticidade inválida" }) }),
    // Ausente/null = alerta geral (visível a todo Admin) — conceito que já
    // existia (user_id nulo), não inventado aqui. Presente = destinatário
    // específico, validado abaixo (precisa existir e estar ativo).
    user_id: z.string().trim().min(1).nullable().optional(),
    // Imagem opcional (ata 2026-08, 4º lote) — `image_file_name` só aceita o
    // nome devolvido por POST /admin/images (nunca um caminho arbitrário);
    // validado contra o disco abaixo, além do formato aqui.
    image_file_name: z.string().trim().min(1).nullable().optional(),
    image_alt: z.string().trim().max(300).nullable().optional(),
    expires_at: z.string().datetime().nullable().optional(),
  })
  .refine((data) => !data.image_file_name || !!data.image_alt, {
    message: "Texto alternativo é obrigatório quando há imagem",
    path: ["image_alt"],
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
      const { title, message, severity, user_id, image_file_name, image_alt, expires_at } = body.data;

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

      // Mesma regra do upload: o nome só é aceito se realmente existir em
      // disco (não confia cegamente no que veio no corpo).
      if (image_file_name && !fs.existsSync(alertImagePath(image_file_name))) {
        res.status(400).json({ error: "Imagem inválida — envie novamente" });
        return;
      }

      const expiresAtDate = expires_at ? new Date(expires_at) : null;
      if (expiresAtDate && expiresAtDate.getTime() <= Date.now()) {
        res.status(400).json({ error: "Expiração precisa ser no futuro" });
        return;
      }

      const created = await prisma.systemAlert.create({
        data: {
          type: CRITICALITY_TYPE,
          title,
          message,
          severity,
          category: "alerta",
          user_id: user_id ?? null,
          image_file_name: image_file_name ?? null,
          image_alt: image_file_name ? (image_alt ?? null) : null,
          expires_at: expiresAtDate,
        },
      });

      await auditSystemAlert({
        actorId: req.user!.id,
        action: "system_alert.created",
        alertId: created.id,
        after: { title, severity, user_id: user_id ?? null, has_image: !!image_file_name, expires_at: expiresAtDate },
      });

      res.status(201).json(await attachDestinatario(created));
    } catch (err) {
      next(err);
    }
  },
);

// ── PATCH /api/system-alerts/admin/:id — editar título/mensagem ──────────────

const editAdminAlertSchema = z
  .object({
    title: z.string().trim().min(3, "Título deve ter no mínimo 3 caracteres").max(200, "Título deve ter no máximo 200 caracteres").optional(),
    message: z.string().trim().min(3, "Mensagem deve ter no mínimo 3 caracteres").max(2000, "Mensagem deve ter no máximo 2000 caracteres").optional(),
    // Presente = trocar/definir imagem; null explícito = remover; ausente =
    // não mexer na imagem atual.
    image_file_name: z.string().trim().min(1).nullable().optional(),
    image_alt: z.string().trim().max(300).nullable().optional(),
  })
  .refine((data) => data.image_file_name === undefined || !data.image_file_name || !!data.image_alt, {
    message: "Texto alternativo é obrigatório quando há imagem",
    path: ["image_alt"],
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
        res.status(400).json({ error: "Informe título, mensagem e/ou imagem para editar" });
        return;
      }

      const before = await prisma.systemAlert.findFirst({
        where: { id: req.params.id as string, category: "alerta" },
        select: { id: true, title: true, message: true, image_file_name: true },
      });
      if (!before) {
        res.status(404).json({ error: "Alerta não encontrado" });
        return;
      }

      const { image_file_name, image_alt, ...rest } = body.data;
      const imageChanging = image_file_name !== undefined;
      if (imageChanging && image_file_name && !fs.existsSync(alertImagePath(image_file_name))) {
        res.status(400).json({ error: "Imagem inválida — envie novamente" });
        return;
      }

      const updated = await prisma.systemAlert.update({
        where: { id: before.id },
        data: {
          ...rest,
          ...(imageChanging
            ? { image_file_name: image_file_name ?? null, image_alt: image_file_name ? (image_alt ?? null) : null }
            : {}),
        },
      });

      // Substituição/remoção — o arquivo antigo (se havia um e mudou) some
      // do disco só DEPOIS do banco confirmar a troca, nunca antes.
      if (imageChanging && before.image_file_name && before.image_file_name !== image_file_name) {
        deleteAlertImage(before.image_file_name);
        await writeAccessAudit({
          actorId: req.user!.id,
          action: image_file_name ? "alert_image.replaced" : "alert_image.removed",
          after: { system_alert_id: before.id },
        });
      }

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
          image_url: s.image_file_name ? `/api/system-alerts/admin/images/${s.image_file_name}` : null,
        })),
      });
    } catch (err) {
      next(err);
    }
  },
);

// ── PATCH /api/system-alerts/admin/standards/:id — nunca a key ───────────

const editStandardSchema = z
  .object({
    name: z.string().trim().min(3).max(200).optional(),
    title: z.string().trim().min(3).max(200).optional(),
    message: z.string().trim().min(3).max(2000).optional(),
    default_severity: z.enum(["info", "warning", "error"]).optional(),
    is_active: z.boolean().optional(),
    image_file_name: z.string().trim().min(1).nullable().optional(),
    image_alt: z.string().trim().max(300).nullable().optional(),
  })
  .refine((data) => data.image_file_name === undefined || !data.image_file_name || !!data.image_alt, {
    message: "Texto alternativo é obrigatório quando há imagem",
    path: ["image_alt"],
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

      const { image_file_name, image_alt, ...rest } = body.data;
      const imageChanging = image_file_name !== undefined;
      if (imageChanging && image_file_name && !fs.existsSync(alertImagePath(image_file_name))) {
        res.status(400).json({ error: "Imagem inválida — envie novamente" });
        return;
      }

      const updated = await prisma.alertStandard.update({
        where: { id: before.id },
        data: {
          ...rest,
          ...(imageChanging
            ? { image_file_name: image_file_name ?? null, image_alt: image_file_name ? (image_alt ?? null) : null }
            : {}),
          updated_by_id: req.user!.id,
        },
      });

      // Trocar/remover a imagem do Padrão nunca apaga o arquivo de uma
      // Ocorrência já criada — cada Ocorrência tem sua PRÓPRIA cópia física
      // (ver snapshotAlertImage em alert-engine.ts), então só o arquivo do
      // próprio Padrão é removido aqui.
      if (imageChanging && before.image_file_name && before.image_file_name !== image_file_name) {
        deleteAlertImage(before.image_file_name);
        await writeAccessAudit({
          actorId: req.user!.id,
          action: image_file_name ? "alert_image.replaced" : "alert_image.removed",
          after: { alert_standard_id: before.id },
        });
      }

      await writeAccessAudit({
        actorId: req.user!.id,
        action: "alert_standard.updated",
        before: { alert_standard_id: before.id, name: before.name, title: before.title, message: before.message, default_severity: before.default_severity, is_active: before.is_active },
        after: { alert_standard_id: before.id, ...rest },
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
        etapa: "[EXEMPLO] Etapa de demonstração",
        tarefa: "[EXEMPLO] Tarefa de demonstração",
        prazo: "31/12/2026",
        projeto: "[EXEMPLO] Projeto de demonstração",
      };
      res.json({
        title: renderTemplate(standard.title, fixture, allowed),
        message: renderTemplate(standard.message, fixture, allowed),
        severity: standard.default_severity,
        image_url: standard.image_file_name ? `/api/system-alerts/admin/images/${standard.image_file_name}` : null,
        image_alt: standard.image_alt,
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

      // "algumas entidades estão sem responsável" (ata 2026-08) — só
      // calculado quando alguma regra ativa realmente usa a categoria
      // admin_responsavel, pra não fazer a contagem à toa.
      const usesAdminResponsavel = rules.some((r) => (parseRecipientRoles(r.recipient_roles_json) ?? []).includes("admin_responsavel"));
      let projectsMissingAdminResponsavel = 0;
      if (usesAdminResponsavel) {
        const [tasks, stages] = await Promise.all([
          prisma.projectTask.findMany({
            where: { due_date: { not: null }, status: { notIn: ["CONCLUIDA", "CANCELADA"] } },
            select: { project_id: true },
          }),
          prisma.projectTaskStage.findMany({
            where: { prazo_execucao: { not: null }, status: { notIn: ["CONCLUIDA", "BLOQUEADA"] } },
            select: { project_task: { select: { project_id: true } } },
          }),
        ]);
        const activeProjectIds = new Set<string>([
          ...tasks.map((t) => t.project_id),
          ...stages.map((s) => s.project_task?.project_id).filter((id): id is string => !!id),
        ]);
        if (activeProjectIds.size > 0) {
          projectsMissingAdminResponsavel = await prisma.project.count({
            where: { id: { in: [...activeProjectIds] }, admin_responsible_user_id: null },
          });
        }
      }

      res.json({
        // "regra geral" nunca é opcional na resposta — toda regra sempre se
        // aplica a TODOS os registros do entity_type do gatilho, nunca a um
        // registro específico (não existe seletor de tarefa/etapa aqui).
        recipient_category_options: RECIPIENT_CATEGORIES.map((value) => ({ value, label: RECIPIENT_CATEGORY_LABELS[value] })),
        projects_missing_admin_responsavel: projectsMissingAdminResponsavel,
        data: rules.map((r) => ({
          ...r,
          entity_type: TRIGGER_ENTITY_TYPE[r.trigger_type] ?? null,
          recipient_roles: parseRecipientRoles(r.recipient_roles_json) ?? [],
          last_triggered_at: lastRunByRule.get(r.id) ?? null,
        })),
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
  // Categorias (papéis/relações) — nunca um id de usuário individual. Isso é
  // exclusivo do Alerta Avulso; uma regra geral escolhe QUEM PODE receber,
  // nunca UMA pessoa específica.
  recipient_roles: z.array(z.enum(RECIPIENT_CATEGORIES)).min(1, "Selecione ao menos uma categoria de destinatário").optional(),
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

      // Antecedência só faz sentido pra gatilhos "due_soon" — não deixa
      // configurar à toa num gatilho de atraso, que nunca a usa.
      if (body.data.lead_time_minutes !== undefined && !isDueSoonTrigger(before.trigger_type)) {
        res.status(400).json({ error: "Este gatilho não usa antecedência" });
        return;
      }

      const { recipient_roles, ...rest } = body.data;
      const updated = await prisma.alertRule.update({
        where: { id: before.id },
        data: {
          ...rest,
          ...(recipient_roles ? { recipient_roles_json: JSON.stringify([...new Set(recipient_roles)]) } : {}),
          updated_by_id: req.user!.id,
        },
      });

      await writeAccessAudit({
        actorId: req.user!.id,
        action: "alert_rule.updated",
        before: {
          alert_rule_id: before.id,
          is_active: before.is_active,
          lead_time_minutes: before.lead_time_minutes,
          severity_override: before.severity_override,
          recipient_roles: parseRecipientRoles(before.recipient_roles_json),
        },
        after: { alert_rule_id: before.id, ...rest, ...(recipient_roles ? { recipient_roles } : {}) },
      });

      res.json({
        ...updated,
        entity_type: TRIGGER_ENTITY_TYPE[updated.trigger_type] ?? null,
        recipient_roles: parseRecipientRoles(updated.recipient_roles_json) ?? [],
      });
    } catch (err) {
      next(err);
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// Alertas Programados (ata 2026-08, 4º lote) — estrutura própria e explícita
// (nunca cron livre digitado pelo Admin). Cada disparo vira um SystemAlert
// comum (ver src/lib/alert-engine.ts). Nunca misturado com Regras de
// tarefa/etapa — programação é por data/horário, regra é por gatilho.
// ═══════════════════════════════════════════════════════════════════════════

function scheduleWithImageUrl<T extends { image_file_name: string | null }>(schedule: T) {
  return { ...schedule, image_url: schedule.image_file_name ? `/api/system-alerts/admin/images/${schedule.image_file_name}` : null };
}

router.get(
  "/admin/schedules",
  verifyToken,
  requireAdminMaster,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const schedules = await prisma.alertSchedule.findMany({ orderBy: { created_at: "desc" } });
      const userIds = [...new Set(schedules.map((s) => s.user_id).filter((id): id is string => !!id))];
      const users = userIds.length
        ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } })
        : [];
      const byId = new Map(users.map((u) => [u.id, u]));
      res.json({
        data: schedules.map((s) => ({
          ...scheduleWithImageUrl(s),
          weekdays: s.weekdays_json ? JSON.parse(s.weekdays_json) : [],
          destinatario: s.user_id ? (byId.get(s.user_id) ?? null) : null,
        })),
      });
    } catch (err) {
      next(err);
    }
  },
);

const scheduleObjectSchema = z.object({
  name: z.string().trim().min(3).max(200),
  title: z.string().trim().min(3).max(200),
  message: z.string().trim().min(3).max(2000),
  severity: z.enum(["info", "warning", "error"]),
  user_id: z.string().trim().min(1).nullable().optional(),
  image_file_name: z.string().trim().min(1).nullable().optional(),
  image_alt: z.string().trim().max(300).nullable().optional(),
  recurrence_type: z.enum(["once", "daily", "weekly"]),
  weekdays: z.array(z.number().int().min(0).max(6)).optional(),
  time_of_day: z.string().refine(isValidTimeOfDay, "Horário inválido — use HH:MM"),
  timezone: z.string().refine(isValidIanaTimeZone, "Timezone inválida"),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inicial inválida"),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  occurrence_expires_minutes: z.number().int().positive().max(30 * 24 * 60).nullable().optional(),
});

const scheduleBaseSchema = scheduleObjectSchema
  .refine((d) => !d.image_file_name || !!d.image_alt, { message: "Texto alternativo é obrigatório quando há imagem", path: ["image_alt"] })
  .refine((d) => d.recurrence_type !== "weekly" || (d.weekdays && d.weekdays.length > 0), {
    message: "Selecione ao menos um dia da semana",
    path: ["weekdays"],
  });

async function validateScheduleRecipientAndImage(body: {
  user_id?: string | null;
  image_file_name?: string | null;
}): Promise<string | null> {
  if (body.user_id) {
    const user = await prisma.user.findUnique({ where: { id: body.user_id }, select: { is_active: true } });
    if (!user || !user.is_active) return "Destinatário inválido ou inexistente";
  }
  if (body.image_file_name && !fs.existsSync(alertImagePath(body.image_file_name))) {
    return "Imagem inválida — envie novamente";
  }
  return null;
}

function buildScheduleDates(data: z.infer<typeof scheduleBaseSchema>) {
  const [y, m, d] = data.start_date.split("-").map(Number);
  const [hh, mm] = data.time_of_day.split(":").map(Number);
  const startsAt = zonedTimeToUtc(y!, m!, d!, hh!, mm!, data.timezone);
  let endsAt: Date | null = null;
  if (data.end_date) {
    const [ey, em, ed] = data.end_date.split("-").map(Number);
    endsAt = zonedTimeToUtc(ey!, em!, ed!, 23, 59, data.timezone);
  }
  return { startsAt, endsAt };
}

router.post(
  "/admin/schedules",
  verifyToken,
  requireAdminMaster,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = scheduleBaseSchema.safeParse(req.body);
      if (!body.success) {
        res.status(400).json({ error: "Dados inválidos", details: body.error.flatten() });
        return;
      }
      const validationError = await validateScheduleRecipientAndImage(body.data);
      if (validationError) {
        res.status(400).json({ error: validationError });
        return;
      }

      const { startsAt, endsAt } = buildScheduleDates(body.data);
      if (endsAt && endsAt.getTime() <= startsAt.getTime()) {
        res.status(400).json({ error: "Data final precisa ser depois da inicial" });
        return;
      }

      const scheduleForCalc = {
        id: "pending",
        recurrence_type: body.data.recurrence_type,
        weekdays_json: body.data.weekdays ? JSON.stringify(body.data.weekdays) : null,
        time_of_day: body.data.time_of_day,
        timezone: body.data.timezone,
        starts_at: startsAt,
        ends_at: endsAt,
      } as Parameters<typeof computeNextRun>[0];
      const nextRun = computeNextRun(scheduleForCalc, new Date(Date.now() - 1));

      const created = await prisma.alertSchedule.create({
        data: {
          name: body.data.name,
          title: body.data.title,
          message: body.data.message,
          severity: body.data.severity,
          image_file_name: body.data.image_file_name ?? null,
          image_alt: body.data.image_file_name ? (body.data.image_alt ?? null) : null,
          user_id: body.data.user_id ?? null,
          recurrence_type: body.data.recurrence_type,
          weekdays_json: body.data.weekdays ? JSON.stringify(body.data.weekdays) : null,
          time_of_day: body.data.time_of_day,
          timezone: body.data.timezone,
          starts_at: startsAt,
          ends_at: endsAt,
          occurrence_expires_minutes: body.data.occurrence_expires_minutes ?? null,
          next_run_at: nextRun,
          created_by_id: req.user!.id,
        },
      });

      await writeAccessAudit({ actorId: req.user!.id, action: "alert_schedule.created", after: { alert_schedule_id: created.id, name: created.name } });

      res.status(201).json({ ...scheduleWithImageUrl(created), weekdays: body.data.weekdays ?? [] });
    } catch (err) {
      next(err);
    }
  },
);

const editScheduleSchema = scheduleObjectSchema.partial().extend({
  is_active: z.boolean().optional(),
});

router.patch(
  "/admin/schedules/:id",
  verifyToken,
  requireAdminMaster,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = editScheduleSchema.safeParse(req.body);
      if (!body.success) {
        res.status(400).json({ error: "Dados inválidos", details: body.error.flatten() });
        return;
      }
      if (Object.keys(body.data).length === 0) {
        res.status(400).json({ error: "Informe ao menos um campo para editar" });
        return;
      }

      const before = await prisma.alertSchedule.findUnique({ where: { id: req.params.id as string } });
      if (!before) {
        res.status(404).json({ error: "Programação não encontrada" });
        return;
      }

      const validationError = await validateScheduleRecipientAndImage(body.data);
      if (validationError) {
        res.status(400).json({ error: validationError });
        return;
      }

      const { is_active, weekdays, start_date, end_date, image_file_name, image_alt, ...rest } = body.data;
      const imageChanging = image_file_name !== undefined;

      // Recalcula a próxima execução sempre que horário/dias/timezone/
      // recorrência/datas mudarem — nunca duplica a execução anterior
      // (last_run_at fica intocado; ocorrências já geradas não são tocadas).
      const scheduleChanged =
        rest.recurrence_type !== undefined || weekdays !== undefined || rest.time_of_day !== undefined ||
        rest.timezone !== undefined || start_date !== undefined || end_date !== undefined;

      let starts_at = before.starts_at;
      let ends_at = before.ends_at;
      if (scheduleChanged) {
        const merged = {
          recurrence_type: rest.recurrence_type ?? before.recurrence_type,
          time_of_day: rest.time_of_day ?? before.time_of_day,
          timezone: rest.timezone ?? before.timezone,
          start_date: start_date ?? null,
          end_date: end_date === undefined ? null : end_date,
          weekdays: weekdays ?? (before.weekdays_json ? JSON.parse(before.weekdays_json) : []),
        };
        if (start_date) {
          const dates = buildScheduleDates({ ...merged, start_date: merged.start_date! } as z.infer<typeof scheduleBaseSchema>);
          starts_at = dates.startsAt;
          if (end_date !== undefined) ends_at = dates.endsAt;
        } else if (end_date !== undefined) {
          if (end_date === null) {
            ends_at = null;
          } else {
            const [ey, em, ed] = end_date.split("-").map(Number);
            ends_at = zonedTimeToUtc(ey!, em!, ed!, 23, 59, merged.timezone);
          }
        }
      }

      const updated = await prisma.alertSchedule.update({
        where: { id: before.id },
        data: {
          ...rest,
          ...(weekdays !== undefined ? { weekdays_json: JSON.stringify(weekdays) } : {}),
          ...(scheduleChanged ? { starts_at, ends_at } : {}),
          ...(is_active !== undefined ? { is_active } : {}),
          ...(imageChanging ? { image_file_name: image_file_name ?? null, image_alt: image_file_name ? (image_alt ?? null) : null } : {}),
          updated_by_id: req.user!.id,
        },
      });

      if (imageChanging && before.image_file_name && before.image_file_name !== image_file_name) {
        deleteAlertImage(before.image_file_name);
      }

      // Reativar (is_active volta a true) ou qualquer mudança de padrão
      // sempre recalcula next_run_at a partir de agora — nunca reaproveita
      // um valor congelado de quando estava pausada/desatualizada.
      if (scheduleChanged || is_active === true) {
        const nextRun = updated.is_active
          ? computeNextRun(
              {
                id: updated.id,
                recurrence_type: updated.recurrence_type,
                weekdays_json: updated.weekdays_json,
                time_of_day: updated.time_of_day,
                timezone: updated.timezone,
                starts_at: updated.starts_at,
                ends_at: updated.ends_at,
              } as Parameters<typeof computeNextRun>[0],
              new Date(),
            )
          : null;
        await prisma.alertSchedule.update({ where: { id: updated.id }, data: { next_run_at: nextRun } });
        updated.next_run_at = nextRun;
      } else if (is_active === false) {
        await prisma.alertSchedule.update({ where: { id: updated.id }, data: { next_run_at: null } });
        updated.next_run_at = null;
      }

      await writeAccessAudit({
        actorId: req.user!.id,
        action: is_active !== undefined ? (is_active ? "alert_schedule.activated" : "alert_schedule.deactivated") : "alert_schedule.updated",
        before: { alert_schedule_id: before.id, is_active: before.is_active, next_run_at: before.next_run_at },
        after: { alert_schedule_id: before.id, is_active: updated.is_active, next_run_at: updated.next_run_at },
      });

      res.json({ ...scheduleWithImageUrl(updated), weekdays: updated.weekdays_json ? JSON.parse(updated.weekdays_json) : [] });
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  "/admin/schedules/:id/archive",
  verifyToken,
  requireAdminMaster,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const before = await prisma.alertSchedule.findUnique({ where: { id: req.params.id as string } });
      if (!before) {
        res.status(404).json({ error: "Programação não encontrada" });
        return;
      }
      const updated = await prisma.alertSchedule.update({
        where: { id: before.id },
        data: { is_archived: true, is_active: false, archived_at: new Date(), next_run_at: null },
      });
      await writeAccessAudit({
        actorId: req.user!.id,
        action: "alert_schedule.archived",
        before: { alert_schedule_id: before.id },
        after: { alert_schedule_id: before.id },
      });
      res.json({ ...scheduleWithImageUrl(updated), weekdays: updated.weekdays_json ? JSON.parse(updated.weekdays_json) : [] });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/admin/schedules/:id/preview",
  verifyToken,
  requireAdminMaster,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schedule = await prisma.alertSchedule.findUnique({ where: { id: req.params.id as string } });
      if (!schedule) {
        res.status(404).json({ error: "Programação não encontrada" });
        return;
      }
      res.json({
        title: schedule.title,
        message: schedule.message,
        severity: schedule.severity,
        image_url: schedule.image_file_name ? `/api/system-alerts/admin/images/${schedule.image_file_name}` : null,
        image_alt: schedule.image_alt,
        fictitious: true,
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
