import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../middleware/auth";
import { parseJsonStringArray } from "../lib/alert-engine";

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
//
// ── Governança do Admin Master (ata 2026-08, bloco 2/5) ──────────────────
// Um AlertStandard marcado `is_mandatory` pode listar `governed_event_types`.
// Para esses event_types:
//   * o canal "dentro da plataforma" (in_app) nunca pode ser desligado
//     (isto já valia globalmente; a governança torna a intenção explícita);
//   * só é possível habilitar canais adicionais listados em
//     `additional_channels` do padrão, e apenas quando `personal_prefs_allowed`;
//   * com `personal_prefs_allowed = false`, nenhuma mudança de canal é aceita
//     para o event_type — o Líder/usuário só visualiza a configuração.
// A proteção é no servidor; o GET devolve o mapa de travas pra UI explicar.

const CHANNELS = ["in_app", "email", "whatsapp", "push"] as const;
type Channel = (typeof CHANNELS)[number];

router.use(verifyToken);

interface GovernanceEntry {
  standard_id: string;
  standard_name: string;
  mandatory: true;
  personal_prefs_allowed: boolean;
  /** Canais que a preferência pessoal NÃO pode alterar (ficam no estado obrigatório). */
  locked_channels: Channel[];
  /** Canais adicionais que o usuário PODE ligar/desligar. */
  toggleable_channels: Channel[];
  min_severity: string | null;
  reason: string;
}

async function loadGovernance(): Promise<Record<string, GovernanceEntry>> {
  const mandatory = await prisma.alertStandard.findMany({
    where: { is_mandatory: true },
    select: {
      id: true,
      name: true,
      mandatory_min_severity: true,
      default_severity: true,
      personal_prefs_allowed: true,
      additional_channels_json: true,
      governed_event_types_json: true,
    },
  });
  const map: Record<string, GovernanceEntry> = {};
  for (const s of mandatory) {
    const events = parseJsonStringArray(s.governed_event_types_json);
    if (events.length === 0) continue;
    const extras = parseJsonStringArray(s.additional_channels_json).filter(
      (c): c is Channel => (CHANNELS as readonly string[]).includes(c) && c !== "in_app",
    );
    for (const ev of events) {
      // Se dois padrões obrigatórios governarem o mesmo event_type, a regra
      // MAIS restritiva vence (personal_prefs_allowed=false ganha; interseção
      // dos canais liberados).
      const existing = map[ev];
      const personalAllowed = (existing ? existing.personal_prefs_allowed : true) && s.personal_prefs_allowed;
      const toggleable = existing
        ? existing.toggleable_channels.filter((c) => extras.includes(c))
        : extras;
      const lockedChannels: Channel[] = personalAllowed
        ? (["in_app"] as Channel[])
        : ([...CHANNELS] as Channel[]);
      map[ev] = {
        standard_id: s.id,
        standard_name: s.name,
        mandatory: true,
        personal_prefs_allowed: personalAllowed,
        locked_channels: lockedChannels,
        toggleable_channels: personalAllowed ? toggleable : [],
        min_severity: s.mandatory_min_severity ?? s.default_severity,
        reason: "Definido como obrigatório pelo Admin Master.",
      };
    }
  }
  return map;
}

// ── GET / ──────────────────────────────────────────────────────────────────

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [data, governance] = await Promise.all([
      prisma.notificationPreference.findMany({ where: { user_id: req.user!.id } }),
      loadGovernance(),
    ]);
    res.json({ data, governance });
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

    // ── Governança: este event_type é governado por um padrão obrigatório? ──
    const governance = await loadGovernance();
    const gov = governance[event_type];
    if (gov) {
      const requested = Object.entries(channels).filter(([, v]) => v !== undefined) as Array<[Channel, boolean]>;
      if (!gov.personal_prefs_allowed) {
        res.status(400).json({
          error: "Este tipo de alerta é obrigatório e sua configuração de canais não pode ser alterada.",
          detail: gov.reason,
          governed_by: gov.standard_name,
        });
        return;
      }
      for (const [channel, enabled] of requested) {
        if (channel === "in_app") continue; // já garantido acima
        const permitido = gov.toggleable_channels.includes(channel);
        if (!permitido && enabled) {
          res.status(400).json({
            error: `O canal "${channel}" não é permitido para este tipo de alerta obrigatório.`,
            detail: gov.reason,
            allowed_channels: ["in_app", ...gov.toggleable_channels],
          });
          return;
        }
        if (!permitido && !enabled) {
          // Tentando desligar um canal travado (que não está entre os
          // adicionais permitidos) — recusa, não é do usuário mexer.
          res.status(400).json({
            error: `O canal "${channel}" deste tipo de alerta obrigatório não pode ser alterado.`,
            detail: gov.reason,
          });
          return;
        }
      }
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
