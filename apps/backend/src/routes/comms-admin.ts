// Central Administrativa de Comunicação (ata 2026-08, bloco 5/5).
//   * /api/admin/comms/channels     — auditoria dos canais (o que funciona)
//   * /api/admin/comms/campaigns    — campanhas e reengajamento
//   * /api/admin/comms/banners      — banners obrigatórios
//   * .../deliveries                — métricas reais da outbox (sem inventar)
//
// Autorização: admin com permissão "sistema" (nunca só pelo texto do papel —
// mesmo padrão de routes/notifications.ts). Toda decisão crítica
// (público, ativação, pausa) é revalidada no servidor.

import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import multer from "multer";
import fs from "fs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken, requireRole, requirePermission } from "../middleware/auth";
import { writeAccessAudit } from "../lib/product-feedback-service";
import {
  MAX_ALERT_IMAGE_BYTES,
  alertImagePath,
  detectImageFormat,
  storeAlertImageBuffer,
  validateBannerDimensions,
} from "../lib/alert-image-storage";
import { channelStatuses } from "../lib/comms/channels";
import { audienceSchema, parseAudience, estimateAudience } from "../lib/comms/audience";
import {
  activateCampaign,
  cancelCampaign,
  pauseCampaign,
  previewCampaign,
  parseChannels,
  serializeCampaign,
  CampaignError,
} from "../lib/comms/campaign-service";
import { serializeBanner, publishNewBannerVersion, BannerError } from "../lib/comms/banner-service";

const router = Router();
const imageUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_ALERT_IMAGE_BYTES } });

const adminGuard = [verifyToken, requireRole("admin")] as const;

function handleServiceError(err: unknown, res: Response, next: NextFunction) {
  if (err instanceof CampaignError || err instanceof BannerError) {
    res.status(err.httpStatus).json({ error: err.message, code: err.code });
    return;
  }
  next(err);
}

// ── Auditoria dos canais ────────────────────────────────────────────────
router.get("/channels", ...adminGuard, async (_req: Request, res: Response) => {
  res.json({ data: channelStatuses() });
});

// ── Upload de imagem (1200×200, mesmo pipeline seguro dos Alertas) ───────
router.post(
  "/images",
  ...adminGuard,
  requirePermission("sistema", "create"),
  imageUpload.single("file"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "Nenhum arquivo enviado" });
        return;
      }
      const detected = detectImageFormat(req.file.buffer);
      if (!detected) {
        res.status(400).json({ error: "Formato inválido — envie JPEG, PNG ou WebP" });
        return;
      }
      const dimError = validateBannerDimensions(req.file.buffer, detected);
      if (dimError) {
        res.status(400).json({ error: dimError });
        return;
      }
      const fileName = storeAlertImageBuffer(req.file.buffer, detected.ext);
      await writeAccessAudit({
        actorId: req.user!.id,
        action: "comms_image.uploaded",
        after: { file_name: fileName, mime: detected.mime, size: req.file.buffer.length },
      });
      res.status(201).json({ file_name: fileName });
    } catch (err) {
      next(err);
    }
  },
);

function sendImage(res: Response, fileName: string | null): boolean {
  if (!fileName) return false;
  const filePath = alertImagePath(fileName);
  if (!fs.existsSync(filePath)) return false;
  res.set("X-Content-Type-Options", "nosniff");
  res.set("Cache-Control", "private, no-store");
  res.sendFile(filePath);
  return true;
}

// ─────────────────────────────── CAMPANHAS ──────────────────────────────

const campaignBody = z.object({
  internal_name: z.string().min(1).max(160),
  title: z.string().min(1).max(160),
  body: z.string().min(1).max(8000),
  image_file_name: z.string().trim().min(1).nullable().optional(),
  image_alt: z.string().max(300).nullable().optional(),
  link_url: z.string().url().max(2000).nullable().optional(),
  channels: z.array(z.string()).min(1),
  audience: audienceSchema,
  is_reengagement: z.boolean().optional(),
  inactivity_days: z.number().int().positive().max(3650).nullable().optional(),
  scheduled_at: z.string().datetime({ offset: true }).nullable().optional(),
  ends_at: z.string().datetime({ offset: true }).nullable().optional(),
});

router.get("/campaigns", ...adminGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const rows = await prisma.communicationCampaign.findMany({
      where: status ? { status } : {},
      orderBy: { created_at: "desc" },
      take: 200,
    });
    res.json({ data: rows.map((r) => serializeCampaign(r)) });
  } catch (err) {
    next(err);
  }
});

router.get("/campaigns/:id", ...adminGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const row = await prisma.communicationCampaign.findUnique({ where: { id: req.params.id as string } });
    if (!row) {
      res.status(404).json({ error: "Campanha não encontrada" });
      return;
    }
    res.json(serializeCampaign(row));
  } catch (err) {
    next(err);
  }
});

router.post(
  "/campaigns",
  ...adminGuard,
  requirePermission("sistema", "create"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = campaignBody.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Dados inválidos", details: parsed.error.flatten() });
        return;
      }
      const d = parsed.data;
      const channels = parseChannels(d.channels);
      if (channels.length === 0) {
        res.status(422).json({ error: "Selecione ao menos um canal válido." });
        return;
      }
      if (d.image_file_name && !fs.existsSync(alertImagePath(d.image_file_name))) {
        res.status(400).json({ error: "Imagem informada não existe. Faça o upload primeiro." });
        return;
      }
      if (d.image_file_name && !d.image_alt) {
        res.status(400).json({ error: "Descreva a imagem (texto alternativo)." });
        return;
      }
      const isReeng = d.is_reengagement ?? false;
      if (isReeng && !d.inactivity_days && !d.audience.last_access_days) {
        res.status(422).json({ error: "Reengajamento precisa de um período de inatividade (dias)." });
        return;
      }
      const audience = isReeng
        ? { ...d.audience, last_access_days: d.audience.last_access_days ?? d.inactivity_days ?? undefined }
        : d.audience;

      const created = await prisma.communicationCampaign.create({
        data: {
          internal_name: d.internal_name,
          title: d.title,
          body: d.body,
          image_file_name: d.image_file_name ?? null,
          image_alt: d.image_file_name ? (d.image_alt ?? null) : null,
          link_url: d.link_url ?? null,
          channels_json: JSON.stringify(channels),
          audience_json: JSON.stringify(audience),
          is_reengagement: isReeng,
          inactivity_days: d.inactivity_days ?? null,
          scheduled_at: d.scheduled_at ? new Date(d.scheduled_at) : null,
          ends_at: d.ends_at ? new Date(d.ends_at) : null,
          target_environment: d.audience.environment ?? null,
          status: d.scheduled_at ? "scheduled" : "draft",
          created_by_user_id: req.user!.id,
        },
      });
      await writeAccessAudit({ actorId: req.user!.id, action: "comms_campaign.created", after: { id: created.id, internal_name: created.internal_name } });
      res.status(201).json(serializeCampaign(created));
    } catch (err) {
      next(err);
    }
  },
);

router.put(
  "/campaigns/:id",
  ...adminGuard,
  requirePermission("sistema", "edit"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await prisma.communicationCampaign.findUnique({ where: { id: req.params.id as string } });
      if (!existing) {
        res.status(404).json({ error: "Campanha não encontrada" });
        return;
      }
      if (!["draft", "scheduled", "paused"].includes(existing.status)) {
        res.status(409).json({ error: `Campanha em "${existing.status}" não pode ser editada.`, code: "invalid_status" });
        return;
      }
      const parsed = campaignBody.partial().safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Dados inválidos", details: parsed.error.flatten() });
        return;
      }
      const d = parsed.data;
      const data: Record<string, unknown> = {};
      if (d.internal_name !== undefined) data.internal_name = d.internal_name;
      if (d.title !== undefined) data.title = d.title;
      if (d.body !== undefined) data.body = d.body;
      if (d.link_url !== undefined) data.link_url = d.link_url;
      if (d.image_file_name !== undefined) {
        if (d.image_file_name && !fs.existsSync(alertImagePath(d.image_file_name))) {
          res.status(400).json({ error: "Imagem informada não existe." });
          return;
        }
        data.image_file_name = d.image_file_name ?? null;
        data.image_alt = d.image_file_name ? (d.image_alt ?? existing.image_alt ?? null) : null;
      } else if (d.image_alt !== undefined) {
        data.image_alt = d.image_alt;
      }
      if (d.channels !== undefined) {
        const channels = parseChannels(d.channels);
        if (channels.length === 0) {
          res.status(422).json({ error: "Selecione ao menos um canal válido." });
          return;
        }
        data.channels_json = JSON.stringify(channels);
      }
      if (d.audience !== undefined) {
        data.audience_json = JSON.stringify(d.audience);
        data.target_environment = d.audience.environment ?? null;
      }
      if (d.is_reengagement !== undefined) data.is_reengagement = d.is_reengagement;
      if (d.inactivity_days !== undefined) data.inactivity_days = d.inactivity_days;
      if (d.scheduled_at !== undefined) {
        data.scheduled_at = d.scheduled_at ? new Date(d.scheduled_at) : null;
        data.status = d.scheduled_at ? "scheduled" : "draft";
      }
      if (d.ends_at !== undefined) data.ends_at = d.ends_at ? new Date(d.ends_at) : null;

      const updated = await prisma.communicationCampaign.update({ where: { id: existing.id }, data });
      res.json(serializeCampaign(updated));
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  "/campaigns/:id",
  ...adminGuard,
  requirePermission("sistema", "delete"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await prisma.communicationCampaign.findUnique({ where: { id: req.params.id as string } });
      if (!existing) {
        res.status(204).send();
        return;
      }
      if (!["draft", "scheduled", "cancelled", "failed"].includes(existing.status)) {
        res.status(409).json({ error: "Só rascunho/agendada/cancelada pode ser excluída.", code: "invalid_status" });
        return;
      }
      await prisma.communicationCampaign.delete({ where: { id: existing.id } });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

// Estimativa/preview do público (server-side, sempre recalculado).
router.post("/campaigns/estimate", ...adminGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({ audience: audienceSchema, channels: z.array(z.string()).min(1), is_reengagement: z.boolean().optional() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Dados inválidos", details: parsed.error.flatten() });
      return;
    }
    const channels = parseChannels(parsed.data.channels);
    const filter = parseAudience(parsed.data.audience);
    const requiresOptIn = (parsed.data.is_reengagement ?? false) || !!filter.last_access_days;
    const estimate = await estimateAudience(filter, channels, { requiresOptIn });
    res.json(estimate);
  } catch (err) {
    next(err);
  }
});

router.get("/campaigns/:id/preview", ...adminGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await previewCampaign(req.params.id as string));
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

router.post(
  "/campaigns/:id/activate",
  ...adminGuard,
  requirePermission("sistema", "create"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await activateCampaign(req.params.id as string, req.user!.id);
      await writeAccessAudit({ actorId: req.user!.id, action: "comms_campaign.activated", after: { id: req.params.id, ...result } });
      res.json({ ok: true, ...result });
    } catch (err) {
      handleServiceError(err, res, next);
    }
  },
);

router.post(
  "/campaigns/:id/pause",
  ...adminGuard,
  requirePermission("sistema", "edit"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({ ok: true, ...(await pauseCampaign(req.params.id as string)) });
    } catch (err) {
      handleServiceError(err, res, next);
    }
  },
);

router.post(
  "/campaigns/:id/cancel",
  ...adminGuard,
  requirePermission("sistema", "edit"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({ ok: true, ...(await cancelCampaign(req.params.id as string)) });
    } catch (err) {
      handleServiceError(err, res, next);
    }
  },
);

// Métricas REAIS da outbox de uma campanha — nunca "entregue" só por entrar na fila.
router.get("/campaigns/:id/deliveries", ...adminGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const grouped = await prisma.communicationDelivery.groupBy({
      by: ["channel", "status"],
      where: { origin: "campaign", origin_id: id },
      _count: { _all: true },
    });
    const states = await prisma.campaignRecipientState.groupBy({
      by: ["state"],
      where: { campaign_id: id },
      _count: { _all: true },
    });
    const sample = await prisma.communicationDelivery.findMany({
      where: { origin: "campaign", origin_id: id, status: { in: ["failed", "channel_not_configured", "no_valid_address"] } },
      select: { id: true, channel: true, status: true, failure_summary: true, preview_json: true, attempts: true, last_attempt_at: true },
      take: 50,
      orderBy: { updated_at: "desc" },
    });
    res.json({
      by_channel_status: grouped.map((g) => ({ channel: g.channel, status: g.status, count: g._count._all })),
      recipient_states: states.map((s) => ({ state: s.state, count: s._count._all })),
      // preview_json exposto sem segredo — os adaptadores só guardam assunto/corpo/para.
      failures_sample: sample.map((s) => ({ ...s, preview: s.preview_json ? JSON.parse(s.preview_json) : null, preview_json: undefined })),
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────── BANNERS ────────────────────────────────

const bannerBody = z.object({
  title: z.string().min(1).max(160),
  body: z.string().min(1).max(8000),
  image_file_name: z.string().trim().min(1).nullable().optional(),
  image_alt: z.string().max(300).nullable().optional(),
  link_url: z.string().url().max(2000).nullable().optional(),
  kind: z.enum(["obrigatorio", "informativo"]).default("obrigatorio"),
  ack_button_label: z.string().min(1).max(80).optional(),
  audience: audienceSchema,
  starts_at: z.string().datetime({ offset: true }).optional(),
  ends_at: z.string().datetime({ offset: true }).nullable().optional(),
  is_active: z.boolean().optional(),
});

router.get("/banners", ...adminGuard, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await prisma.mandatoryBanner.findMany({
      orderBy: { created_at: "desc" },
      take: 200,
      include: { _count: { select: { acknowledgements: true } } },
    });
    res.json({
      data: rows.map((r) => ({ ...serializeBanner(r), acknowledgement_count: r._count.acknowledgements })),
    });
  } catch (err) {
    next(err);
  }
});

router.get("/banners/:id", ...adminGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const row = await prisma.mandatoryBanner.findUnique({ where: { id: req.params.id as string } });
    if (!row) {
      res.status(404).json({ error: "Banner não encontrado" });
      return;
    }
    const acks = await prisma.bannerAcknowledgement.count({ where: { banner_id: row.id, version: row.version } });
    res.json({ ...serializeBanner(row), acknowledgements_current_version: acks });
  } catch (err) {
    next(err);
  }
});

router.get("/banners/:id/image", ...adminGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const row = await prisma.mandatoryBanner.findUnique({
      where: { id: req.params.id as string },
      select: { image_file_name: true },
    });
    if (!sendImage(res, row?.image_file_name ?? null)) {
      res.status(404).json({ error: "Imagem não encontrada" });
    }
  } catch (err) {
    next(err);
  }
});

router.post(
  "/banners",
  ...adminGuard,
  requirePermission("sistema", "create"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = bannerBody.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Dados inválidos", details: parsed.error.flatten() });
        return;
      }
      const d = parsed.data;
      if (d.image_file_name && !fs.existsSync(alertImagePath(d.image_file_name))) {
        res.status(400).json({ error: "Imagem informada não existe. Faça o upload primeiro." });
        return;
      }
      if (d.image_file_name && !d.image_alt) {
        res.status(400).json({ error: "Descreva a imagem (texto alternativo)." });
        return;
      }
      const created = await prisma.mandatoryBanner.create({
        data: {
          title: d.title,
          body: d.body,
          image_file_name: d.image_file_name ?? null,
          image_alt: d.image_file_name ? (d.image_alt ?? null) : null,
          link_url: d.link_url ?? null,
          kind: d.kind,
          ack_button_label: d.ack_button_label ?? "Li e estou ciente",
          audience_json: JSON.stringify(d.audience),
          starts_at: d.starts_at ? new Date(d.starts_at) : new Date(),
          ends_at: d.ends_at ? new Date(d.ends_at) : null,
          is_active: d.is_active ?? true,
          created_by_user_id: req.user!.id,
        },
      });
      await writeAccessAudit({ actorId: req.user!.id, action: "comms_banner.created", after: { id: created.id, title: created.title, kind: created.kind } });
      res.status(201).json(serializeBanner(created));
    } catch (err) {
      next(err);
    }
  },
);

router.put(
  "/banners/:id",
  ...adminGuard,
  requirePermission("sistema", "edit"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await prisma.mandatoryBanner.findUnique({ where: { id: req.params.id as string } });
      if (!existing) {
        res.status(404).json({ error: "Banner não encontrado" });
        return;
      }
      const parsed = bannerBody.partial().safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Dados inválidos", details: parsed.error.flatten() });
        return;
      }
      const d = parsed.data;
      const data: Record<string, unknown> = {};
      for (const k of ["title", "body", "link_url", "kind", "ack_button_label", "is_active"] as const) {
        if (d[k] !== undefined) data[k] = d[k];
      }
      if (d.image_file_name !== undefined) {
        if (d.image_file_name && !fs.existsSync(alertImagePath(d.image_file_name))) {
          res.status(400).json({ error: "Imagem informada não existe." });
          return;
        }
        data.image_file_name = d.image_file_name ?? null;
        data.image_alt = d.image_file_name ? (d.image_alt ?? existing.image_alt ?? null) : null;
      } else if (d.image_alt !== undefined) {
        data.image_alt = d.image_alt;
      }
      if (d.audience !== undefined) data.audience_json = JSON.stringify(d.audience);
      if (d.starts_at !== undefined) data.starts_at = new Date(d.starts_at);
      if (d.ends_at !== undefined) data.ends_at = d.ends_at ? new Date(d.ends_at) : null;

      const updated = await prisma.mandatoryBanner.update({ where: { id: existing.id }, data });
      res.json(serializeBanner(updated));
    } catch (err) {
      next(err);
    }
  },
);

// Nova versão → exige nova ciência de todos.
router.post(
  "/banners/:id/publish-version",
  ...adminGuard,
  requirePermission("sistema", "edit"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await publishNewBannerVersion(req.params.id as string);
      await writeAccessAudit({ actorId: req.user!.id, action: "comms_banner.version_published", after: { id: req.params.id, ...result } });
      res.json({ ok: true, ...result });
    } catch (err) {
      handleServiceError(err, res, next);
    }
  },
);

router.post(
  "/banners/:id/cancel",
  ...adminGuard,
  requirePermission("sistema", "edit"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const updated = await prisma.mandatoryBanner.update({
        where: { id: req.params.id as string },
        data: { is_cancelled: true, is_active: false },
      });
      res.json({ ok: true, banner: serializeBanner(updated) });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
