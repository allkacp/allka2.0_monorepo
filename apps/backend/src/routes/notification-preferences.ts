import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../middleware/auth";

const router = Router();

// Preferência PESSOAL de notificação: para um tipo de evento (catálogo fixo
// no frontend, components/notification-preferences-panel.tsx PREF_GROUPS),
// por qual canal o usuário logado quer ser avisado. Substitui as antigas
// telas mockadas "Preferências"/"Regras" — mesma tabela real por trás das
// duas, ver NotificationPreference no schema.
//
// Só "in_app" entrega de verdade hoje (vira SystemAlert, no motor de
// etapas/admin notifications). email/whatsapp/push ficam salvos aqui pra
// quando existir envio real — nunca inferir daqui que eles já disparam.

const CHANNELS = ["in_app", "email", "whatsapp", "push"] as const;
type Channel = (typeof CHANNELS)[number];

router.use(verifyToken);

// ── GET / ──────────────────────────────────────────────────────────────────

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.notificationPreference.findMany({
      where: { user_id: req.user!.id },
    });
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// ── PUT / ──────────────────────────────────────────────────────────────────

const updateSchema = z.object({
  event_type: z.string().min(1),
  channels: z
    .object({
      in_app: z.boolean().optional(),
      email: z.boolean().optional(),
      whatsapp: z.boolean().optional(),
      push: z.boolean().optional(),
    })
    .refine((c) => Object.keys(c).length > 0, "Informe ao menos um canal"),
});

router.put("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Dados inválidos", details: parsed.error.flatten() });
      return;
    }
    const { event_type, channels } = parsed.data;

    if (channels.in_app === false) {
      res.status(400).json({ error: "O canal 'dentro da plataforma' não pode ser desligado." });
      return;
    }

    const userId = req.user!.id;
    const entries = Object.entries(channels) as Array<[Channel, boolean | undefined]>;

    const rows = await prisma.$transaction(
      entries
        .filter((entry): entry is [Channel, boolean] => entry[1] !== undefined)
        .map(([channel, enabled]) =>
          prisma.notificationPreference.upsert({
            where: { user_id_event_type_channel: { user_id: userId, event_type, channel } },
            create: { user_id: userId, event_type, channel, enabled },
            update: { enabled },
          }),
        ),
    );

    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

export default router;
