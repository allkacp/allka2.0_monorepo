// Resolução de PÚBLICO de campanhas e banners (ata 2026-08, bloco 5/5).
//
// Filtro ESTRUTURADO e seguro — nunca SQL livre, nunca lista inteira de
// usuários no frontend. O servidor SEMPRE recalcula o público na ativação
// (o corpo da requisição de ativar não traz destinatários).

import { z } from "zod";
import { prisma } from "../prisma";
import { config } from "../../config";
import { getChannelPref } from "./preferences";
import { isValidEmail, normalizePhone } from "./channels";
import type { CommsChannel } from "./types";

export const audienceSchema = z.object({
  // Tipo principal da conta.
  principal_types: z.array(z.enum(["empresas", "agencias", "nomades"])).optional(),
  // Partner só entra como CONDIÇÃO dentro de Agency (é um upgrade da Agency,
  // não um account_type próprio) — ver PartnerProfile.
  only_partners: z.boolean().optional(),
  // "active" | "inactive" | "any"
  account_state: z.enum(["active", "inactive", "any"]).default("any"),
  // Sem acesso há N dias (last_login). 0/ausente = ignora.
  last_access_days: z.number().int().positive().max(3650).optional(),
  // Grupo de notificação existente (usa seus membros).
  notification_group_id: z.string().optional(),
  // IDs explícitos de usuários (interseccionados com os demais filtros).
  user_ids: z.array(z.string()).max(5000).optional(),
  // Guarda de ambiente — a campanha só pode ativar no ambiente declarado.
  environment: z.enum(["local", "qa", "production"]).optional(),
});

export type AudienceFilter = z.infer<typeof audienceSchema>;
export type AudienceFilterInput = z.input<typeof audienceSchema>;

export function parseAudience(raw: unknown): AudienceFilter {
  return audienceSchema.parse(raw ?? {});
}

/** `where` Prisma seguro derivado do filtro (sem paginação, sem texto livre). */
async function buildWhere(filter: AudienceFilter): Promise<Record<string, unknown>> {
  const AND: Record<string, unknown>[] = [];

  if (filter.principal_types && filter.principal_types.length > 0) {
    AND.push({ account_type: { in: filter.principal_types } });
  } else {
    // Nunca inclui contas "admin" num público de campanha por padrão.
    AND.push({ account_type: { in: ["empresas", "agencias", "nomades"] } });
  }

  if (filter.account_state === "active") AND.push({ is_active: true });
  else if (filter.account_state === "inactive") AND.push({ is_active: false });

  if (filter.last_access_days && filter.last_access_days > 0) {
    const cutoff = new Date(Date.now() - filter.last_access_days * 24 * 60 * 60 * 1000);
    AND.push({ OR: [{ last_login: { lt: cutoff } }, { last_login: null }] });
  }

  if (filter.only_partners) {
    // Usuário cujo dono da Agency tem PartnerProfile — o vínculo real.
    AND.push({
      OR: [
        { owned_agency: { partner_profile: { isNot: null } } },
        { agency_link: { partner_profile: { isNot: null } } },
      ],
    });
  }

  if (filter.notification_group_id) {
    const members = await prisma.notificationGroupMember.findMany({
      where: { group_id: filter.notification_group_id },
      select: { user_id: true },
    });
    AND.push({ id: { in: members.map((m) => m.user_id) } });
  }

  if (filter.user_ids && filter.user_ids.length > 0) {
    AND.push({ id: { in: filter.user_ids } });
  }

  return { AND };
}

export async function resolveAudienceUserIds(filter: AudienceFilter | AudienceFilterInput): Promise<string[]> {
  const parsed = audienceSchema.parse(filter ?? {});
  const where = await buildWhere(parsed);
  const rows = await prisma.user.findMany({ where, select: { id: true } });
  return rows.map((r) => r.id);
}

export interface AudienceEstimate {
  estimated: number;
  filters_applied: Record<string, unknown>;
  channels: CommsChannel[];
  environment_ok: boolean;
  without_contact: number;
  without_consent: number;
  possible_deliveries: number;
}

/**
 * Estimativa mostrada ANTES de ativar (Parte I do lote): quantidade, filtros,
 * canais, quantos sem contato válido, quantos sem consentimento, e o total
 * possível de entregas. Recalculado sempre no servidor.
 */
export async function estimateAudience(
  filterInput: AudienceFilter | AudienceFilterInput,
  channels: CommsChannel[],
  opts: { requiresOptIn: boolean },
): Promise<AudienceEstimate> {
  const filter = audienceSchema.parse(filterInput ?? {});
  const ids = await resolveAudienceUserIds(filter);
  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, email: true, phone: true },
  });

  const needsEmail = channels.includes("email");
  const needsPhone = channels.includes("whatsapp");
  const needsPush = channels.includes("push");

  let pushSubById = new Map<string, number>();
  if (needsPush) {
    const subs = await prisma.pushSubscription.groupBy({
      by: ["user_id"],
      where: { user_id: { in: ids }, enabled: true },
      _count: { _all: true },
    });
    pushSubById = new Map(subs.map((s) => [s.user_id, s._count._all]));
  }

  let withoutContact = 0;
  let withoutConsent = 0;
  let possible = 0;

  for (const u of users) {
    const pref = await getChannelPref(u.id);
    if (opts.requiresOptIn && !pref.marketing_opt_in) {
      withoutConsent++;
      continue;
    }
    let anyDeliverable = false;
    for (const ch of channels) {
      if (ch === "platform" && pref.platform_enabled) anyDeliverable = true;
      if (ch === "email" && pref.email_enabled && isValidEmail(u.email)) anyDeliverable = true;
      if (ch === "whatsapp" && pref.whatsapp_enabled && normalizePhone(u.phone)) anyDeliverable = true;
      if (ch === "push" && pref.push_enabled && (pushSubById.get(u.id) ?? 0) > 0) anyDeliverable = true;
    }
    if (!anyDeliverable) {
      // Sem contato válido só quando o problema é endereço, não preferência.
      const missingAddressOnly =
        (needsEmail && !isValidEmail(u.email)) ||
        (needsPhone && !normalizePhone(u.phone)) ||
        (needsPush && (pushSubById.get(u.id) ?? 0) === 0);
      if (missingAddressOnly && !channels.includes("platform")) withoutContact++;
      continue;
    }
    possible++;
  }

  const environmentOk = !filter.environment || filter.environment === config.COMMS_ENVIRONMENT;

  return {
    estimated: ids.length,
    filters_applied: { ...filter },
    channels,
    environment_ok: environmentOk,
    without_contact: withoutContact,
    without_consent: withoutConsent,
    possible_deliveries: possible,
  };
}
