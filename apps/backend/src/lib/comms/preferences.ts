// Preferência de CANAL do usuário para comunicações NÃO obrigatórias
// (ata 2026-08, bloco 5/5). Distinta de NotificationPreference (por tipo de
// evento). Aqui é: "por qual canal o usuário aceita receber?" + opt-in de
// marketing/reengajamento.
//
// Regras (Parte H do lote):
//   * canal desligado → nenhuma entrega NÃO obrigatória por ele;
//   * marketing/reengajamento exige `marketing_opt_in`;
//   * comunicação interna OBRIGATÓRIA (banner obrigatório) segue pelo canal
//     "platform" mesmo com preferência desligada — quem chama passa
//     `mandatory: true`;
//   * nenhuma preferência dá acesso a dados de outra conta (a identidade vem
//     sempre da sessão nas rotas).

import { prisma } from "../prisma";
import type { CommsChannel } from "./types";

export interface ChannelPrefRow {
  platform_enabled: boolean;
  email_enabled: boolean;
  whatsapp_enabled: boolean;
  push_enabled: boolean;
  marketing_opt_in: boolean;
}

export const DEFAULT_CHANNEL_PREF: ChannelPrefRow = {
  platform_enabled: true,
  email_enabled: true,
  whatsapp_enabled: false,
  push_enabled: false,
  marketing_opt_in: false,
};

export async function getChannelPref(userId: string): Promise<ChannelPrefRow> {
  const row = await prisma.userCommunicationChannelPref.findUnique({ where: { user_id: userId } });
  if (!row) return { ...DEFAULT_CHANNEL_PREF };
  return {
    platform_enabled: row.platform_enabled,
    email_enabled: row.email_enabled,
    whatsapp_enabled: row.whatsapp_enabled,
    push_enabled: row.push_enabled,
    marketing_opt_in: row.marketing_opt_in,
  };
}

export async function upsertChannelPref(userId: string, patch: Partial<ChannelPrefRow>): Promise<ChannelPrefRow> {
  const current = await getChannelPref(userId);
  const next = { ...current, ...patch };
  await prisma.userCommunicationChannelPref.upsert({
    where: { user_id: userId },
    create: { user_id: userId, ...next },
    update: next,
  });
  return next;
}

function channelEnabled(pref: ChannelPrefRow, channel: CommsChannel): boolean {
  switch (channel) {
    case "platform":
      return pref.platform_enabled;
    case "email":
      return pref.email_enabled;
    case "whatsapp":
      return pref.whatsapp_enabled;
    case "push":
      return pref.push_enabled;
  }
}

export interface PrefDecision {
  allowed: boolean;
  reason?: string;
}

export async function channelAllowedByPreference(
  userId: string,
  channel: CommsChannel,
  opts: { requiresOptIn: boolean; mandatory?: boolean },
): Promise<PrefDecision> {
  // Obrigatório pelo canal plataforma nunca é bloqueado por preferência.
  if (opts.mandatory && channel === "platform") return { allowed: true };

  const pref = await getChannelPref(userId);

  if (opts.requiresOptIn && !pref.marketing_opt_in) {
    return { allowed: false, reason: "sem_opt_in_marketing" };
  }
  if (!channelEnabled(pref, channel)) {
    return { allowed: false, reason: "canal_desligado_pelo_usuario" };
  }
  return { allowed: true };
}
