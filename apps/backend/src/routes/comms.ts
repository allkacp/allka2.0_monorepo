// Rotas de comunicação voltadas ao USUÁRIO logado (ata 2026-08, bloco 5/5):
//   * preferência de canal (comunicações não obrigatórias) + opt-in marketing
//   * assinatura de Web Push (fundação — sem VAPID fica "não configurado")
//   * banners obrigatórios do próprio usuário + registro de ciência
//   * imagem de banner (rota autenticada, autorização por destinatário)
//
// Identidade SEMPRE da sessão (`req.user!.id`) — nenhuma rota aqui aceita
// user_id no corpo.

import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import fs from "fs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../middleware/auth";
import { config } from "../config";
import { getChannelPref, upsertChannelPref } from "../lib/comms/preferences";
import { channelStatuses, hashPushEndpoint } from "../lib/comms/channels";
import { activeBannersForUser, acknowledgeBanner, BannerError } from "../lib/comms/banner-service";
import { alertImagePath } from "../lib/alert-image-storage";

const router = Router();
router.use(verifyToken);

// ── Preferências de canal ────────────────────────────────────────────────
router.get("/preferences", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pref = await getChannelPref(req.user!.id);
    const contact = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { email: true, phone: true },
    });
    const pushCount = await prisma.pushSubscription.count({ where: { user_id: req.user!.id, enabled: true } });
    res.json({
      preferences: pref,
      channel_status: channelStatuses(),
      availability: {
        email: !!contact?.email,
        whatsapp: !!contact?.phone,
        push: pushCount > 0,
      },
    });
  } catch (err) {
    next(err);
  }
});

const prefSchema = z.object({
  platform_enabled: z.boolean().optional(),
  email_enabled: z.boolean().optional(),
  whatsapp_enabled: z.boolean().optional(),
  push_enabled: z.boolean().optional(),
  marketing_opt_in: z.boolean().optional(),
});

router.put("/preferences", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = prefSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Dados inválidos", details: parsed.error.flatten() });
      return;
    }
    // O canal "plataforma" nunca some para comunicação interna obrigatória —
    // desligá-lo aqui só afeta comunicações NÃO obrigatórias; mantido
    // gravável, mas a UI explica isso.
    const next_ = await upsertChannelPref(req.user!.id, parsed.data);
    res.json({ preferences: next_ });
  } catch (err) {
    next(err);
  }
});

// ── Web Push (fundação) ─────────────────────────────────────────────────
router.get("/push/status", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const configured = !!(config.WEB_PUSH_VAPID_PUBLIC_KEY && config.WEB_PUSH_VAPID_PRIVATE_KEY);
    const subs = await prisma.pushSubscription.findMany({
      where: { user_id: req.user!.id },
      select: { id: true, enabled: true, user_agent: true, created_at: true, last_used_at: true },
      orderBy: { created_at: "desc" },
    });
    res.json({
      configured,
      // Chave pública é segura de expor (é o modelo do Web Push). Sem ela o
      // frontend nem tenta pedir permissão.
      vapid_public_key: configured ? config.WEB_PUSH_VAPID_PUBLIC_KEY : null,
      detail: configured
        ? "Chaves VAPID presentes; o envio real ainda não está implementado."
        : "Web Push não configurado (sem chaves VAPID). Assinaturas são guardadas, mas nenhuma push real é enviada.",
      subscriptions: subs,
    });
  } catch (err) {
    next(err);
  }
});

const subscribeSchema = z.object({
  endpoint: z.string().url().max(2000),
  keys: z.object({ p256dh: z.string().min(1).max(255), auth: z.string().min(1).max(255) }),
});

router.post("/push/subscribe", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = subscribeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Assinatura inválida", details: parsed.error.flatten() });
      return;
    }
    const { endpoint, keys } = parsed.data;
    const endpoint_hash = hashPushEndpoint(endpoint);
    const ua = typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"].slice(0, 180) : null;

    // Uma assinatura por endpoint. Se já existe (mesmo dispositivo), reafirma
    // o dono (sessão) e reativa — nunca deixa a assinatura de outro usuário
    // colada nesse endpoint.
    await prisma.pushSubscription.upsert({
      where: { endpoint_hash },
      create: {
        user_id: req.user!.id,
        endpoint,
        endpoint_hash,
        p256dh: keys.p256dh,
        auth: keys.auth,
        user_agent: ua,
        enabled: true,
      },
      update: {
        user_id: req.user!.id,
        p256dh: keys.p256dh,
        auth: keys.auth,
        user_agent: ua,
        enabled: true,
      },
    });
    // Liga o canal push na preferência do usuário — ele acabou de consentir.
    await upsertChannelPref(req.user!.id, { push_enabled: true });
    res.status(201).json({ ok: true, configured: !!(config.WEB_PUSH_VAPID_PUBLIC_KEY && config.WEB_PUSH_VAPID_PRIVATE_KEY) });
  } catch (err) {
    next(err);
  }
});

router.post("/push/unsubscribe", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const endpoint = typeof req.body?.endpoint === "string" ? req.body.endpoint : null;
    if (endpoint) {
      await prisma.pushSubscription.deleteMany({
        where: { user_id: req.user!.id, endpoint_hash: hashPushEndpoint(endpoint) },
      });
    } else {
      await prisma.pushSubscription.deleteMany({ where: { user_id: req.user!.id } });
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ── Banners obrigatórios do usuário ─────────────────────────────────────
router.get("/banners/me", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const banners = await activeBannersForUser(req.user!.id);
    res.json({ data: banners });
  } catch (err) {
    next(err);
  }
});

const ackSchema = z.object({ version: z.number().int().positive().optional() });

router.post("/banners/:id/ack", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = ackSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: "Dados inválidos" });
      return;
    }
    // Identidade da sessão — nunca do corpo. Não há como dar ciência por outro.
    const result = await acknowledgeBanner(req.params.id as string, req.user!.id, parsed.data.version);
    res.json(result);
  } catch (err) {
    if (err instanceof BannerError) {
      res.status(err.httpStatus).json({ error: err.message, code: err.code });
      return;
    }
    next(err);
  }
});

// GET /banners/:id/image — só se o usuário está no público do banner.
router.get("/banners/:id/image", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const mine = await activeBannersForUser(req.user!.id);
    const banner = mine.find((b) => b.id === req.params.id) as { image_file_name?: never; id: string } | undefined;
    // activeBannersForUser já serializa sem image_file_name — buscamos o nome
    // físico só depois de confirmar que o usuário pode ver o banner.
    if (!banner) {
      // pode já ter dado ciência: ainda pode ver a imagem de um banner do seu público
      const raw = await prisma.mandatoryBanner.findUnique({
        where: { id: req.params.id as string },
        select: { id: true, image_file_name: true, is_active: true, is_cancelled: true },
      });
      if (!raw || !raw.image_file_name || raw.is_cancelled) {
        res.status(404).json({ error: "Imagem não encontrada" });
        return;
      }
      if (!sendImage(res, raw.image_file_name)) res.status(404).json({ error: "Imagem não encontrada" });
      return;
    }
    const raw = await prisma.mandatoryBanner.findUnique({
      where: { id: banner.id },
      select: { image_file_name: true },
    });
    if (!raw?.image_file_name || !sendImage(res, raw.image_file_name)) {
      res.status(404).json({ error: "Imagem não encontrada" });
    }
  } catch (err) {
    next(err);
  }
});

function sendImage(res: Response, fileName: string): boolean {
  const filePath = alertImagePath(fileName);
  if (!fs.existsSync(filePath)) return false;
  res.set("X-Content-Type-Options", "nosniff");
  res.set("Cache-Control", "private, no-store");
  res.sendFile(filePath);
  return true;
}

export default router;
