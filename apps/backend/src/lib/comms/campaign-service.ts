// Ciclo de vida das campanhas de comunicação (ata 2026-08, bloco 5/5).
//
// rascunho → agendada → processando → concluída
//                    ↘ pausada ↗
//                    ↘ cancelada
//
// A ativação SEMPRE recalcula o público no servidor e cria as entregas de
// forma idempotente (CampaignRecipientState @unique + CommunicationDelivery
// idempotency_key @unique). Clique duplo em "Ativar" / job concorrente nunca
// duplica.

import { prisma } from "../prisma";
import { config } from "../../config";
import { parseAudience, resolveAudienceUserIds, estimateAudience } from "./audience";
import { enqueueWithRender } from "./delivery-engine";
import { channelStatuses } from "./channels";
import type { CommsChannel } from "./types";

export class CampaignError extends Error {
  constructor(
    message: string,
    public httpStatus: number,
    public code?: string,
  ) {
    super(message);
  }
}

const VALID_CHANNELS: CommsChannel[] = ["platform", "email", "whatsapp", "push"];

export function parseChannels(raw: unknown): CommsChannel[] {
  const arr = Array.isArray(raw) ? raw : [];
  const out = arr.filter((c): c is CommsChannel => VALID_CHANNELS.includes(c as CommsChannel));
  return [...new Set(out)];
}

function campaignImageUrl(id: string, fileName: string | null): string | null {
  return fileName ? `/api/admin/comms/campaigns/${id}/image` : null;
}

export function serializeCampaign(c: {
  id: string;
  channels_json: string;
  audience_json: string;
  image_file_name: string | null;
  [k: string]: unknown;
}) {
  const { channels_json, audience_json, image_file_name, ...rest } = c;
  return {
    ...rest,
    channels: safeArr(channels_json),
    audience: safeObj(audience_json),
    has_image: !!image_file_name,
    image_url: campaignImageUrl(c.id, image_file_name),
  };
}

function safeArr(json: string): unknown[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
function safeObj(json: string): Record<string, unknown> {
  try {
    const v = JSON.parse(json);
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

// ── Preview (antes de ativar) ────────────────────────────────────────────
export async function previewCampaign(campaignId: string) {
  const c = await prisma.communicationCampaign.findUnique({ where: { id: campaignId } });
  if (!c) throw new CampaignError("Campanha não encontrada.", 404);
  const channels = parseChannels(safeArr(c.channels_json));
  const filter = parseAudience(safeObj(c.audience_json));
  const requiresOptIn = c.is_reengagement || filterLooksLikeMarketing(filter);
  const estimate = await estimateAudience(filter, channels, { requiresOptIn });
  return {
    campaign: serializeCampaign(c),
    estimate,
    channel_status: channelStatuses().filter((s) => channels.includes(s.channel)),
    requires_opt_in: requiresOptIn,
    environment: config.COMMS_ENVIRONMENT,
  };
}

function filterLooksLikeMarketing(filter: { last_access_days?: number }): boolean {
  // Reengajamento por inatividade é sempre marketing (opt-in).
  return !!filter.last_access_days;
}

// ── Ativação ────────────────────────────────────────────────────────────
export async function activateCampaign(campaignId: string, actorUserId: string) {
  const c = await prisma.communicationCampaign.findUnique({ where: { id: campaignId } });
  if (!c) throw new CampaignError("Campanha não encontrada.", 404);
  if (!["draft", "scheduled", "paused"].includes(c.status)) {
    throw new CampaignError(`Campanha em "${c.status}" não pode ser ativada.`, 409, "invalid_status");
  }

  const channels = parseChannels(safeArr(c.channels_json));
  if (channels.length === 0) throw new CampaignError("Selecione ao menos um canal.", 422, "no_channels");

  const filter = parseAudience(safeObj(c.audience_json));

  // Guarda de ambiente — nunca dispara num ambiente diferente do declarado.
  if (filter.environment && filter.environment !== config.COMMS_ENVIRONMENT) {
    throw new CampaignError(
      `Esta campanha é para o ambiente "${filter.environment}", mas este servidor é "${config.COMMS_ENVIRONMENT}".`,
      409,
      "environment_mismatch",
    );
  }

  const now = new Date();
  if (c.ends_at && c.ends_at <= now) {
    throw new CampaignError("A data de encerramento da campanha já passou.", 409, "already_ended");
  }

  const requiresOptIn = c.is_reengagement || filterLooksLikeMarketing(filter);

  // RECALCULA o público no servidor — o corpo da requisição não traz gente.
  const userIds = await resolveAudienceUserIds(filter);

  await prisma.communicationCampaign.update({
    where: { id: campaignId },
    data: { status: "processing", activated_at: c.activated_at ?? now, activated_by_user_id: actorUserId, starts_at: c.starts_at ?? now },
  });

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, is_active: true },
  });

  const dispatchKey = `v${c.updated_at.getTime()}`; // muda se a campanha for editada → novo envio legítimo
  let queued = 0;
  let excluded = 0;

  for (const u of users) {
    if (!u.is_active) {
      await recordRecipientState(campaignId, u.id, "excluded_no_contact", "conta inativa");
      excluded++;
      continue;
    }

    // Idempotência do público: uma linha por (campanha, usuário). Se já
    // existe, esta ativação não reprocessa (retry / job concorrente).
    const state = await prisma.campaignRecipientState.findUnique({
      where: { campaign_id_recipient_user_id: { campaign_id: campaignId, recipient_user_id: u.id } },
      select: { id: true, state: true },
    });
    if (state && state.state !== "queued") {
      excluded++;
      continue;
    }
    if (!state) {
      await prisma.campaignRecipientState.create({
        data: { campaign_id: campaignId, recipient_user_id: u.id, state: "queued" },
      });
    }

    for (const channel of channels) {
      await enqueueWithRender({
        origin: "campaign",
        originId: campaignId,
        recipientUserId: u.id,
        channel,
        dispatchKey,
        scheduledFor: now,
        requiresOptIn,
        render: {
          title: c.title,
          body: c.body,
          linkUrl: c.link_url,
          imageUrl: campaignImageUrl(campaignId, c.image_file_name),
        },
      });
    }
    await prisma.campaignRecipientState.update({
      where: { campaign_id_recipient_user_id: { campaign_id: campaignId, recipient_user_id: u.id } },
      data: { state: "processed", processed_at: now },
    });
    queued++;
  }

  await prisma.communicationCampaign.update({
    where: { id: campaignId },
    data: { status: "completed", completed_at: new Date() },
  });

  return { queued, excluded, channels, recipients_considered: users.length };
}

async function recordRecipientState(campaignId: string, userId: string, state: string, reason: string) {
  await prisma.campaignRecipientState.upsert({
    where: { campaign_id_recipient_user_id: { campaign_id: campaignId, recipient_user_id: userId } },
    create: { campaign_id: campaignId, recipient_user_id: userId, state, reason, processed_at: new Date() },
    update: { state, reason, processed_at: new Date() },
  });
}

// ── Pausa / cancelamento ────────────────────────────────────────────────
export async function pauseCampaign(campaignId: string) {
  const c = await prisma.communicationCampaign.findUnique({ where: { id: campaignId } });
  if (!c) throw new CampaignError("Campanha não encontrada.", 404);
  if (!["scheduled", "processing"].includes(c.status)) {
    throw new CampaignError(`Campanha em "${c.status}" não pode ser pausada.`, 409, "invalid_status");
  }
  await prisma.communicationCampaign.update({ where: { id: campaignId }, data: { status: "paused" } });
  // Entregas ainda não processadas param; as que já estão "processing"/"delivered" seguem seu curso.
  const stopped = await prisma.communicationDelivery.updateMany({
    where: { origin: "campaign", origin_id: campaignId, status: "pending" },
    data: { status: "cancelled", failure_summary: "Campanha pausada." },
  });
  return { paused: true, deliveries_held: stopped.count };
}

export async function cancelCampaign(campaignId: string) {
  const c = await prisma.communicationCampaign.findUnique({ where: { id: campaignId } });
  if (!c) throw new CampaignError("Campanha não encontrada.", 404);
  if (["completed", "cancelled"].includes(c.status)) {
    // idempotente
    return { cancelled: true, deliveries_cancelled: 0 };
  }
  await prisma.communicationCampaign.update({ where: { id: campaignId }, data: { status: "cancelled" } });
  const stopped = await prisma.communicationDelivery.updateMany({
    where: { origin: "campaign", origin_id: campaignId, status: { in: ["pending", "processing"] } },
    data: { status: "cancelled", failure_summary: "Campanha cancelada." },
  });
  return { cancelled: true, deliveries_cancelled: stopped.count };
}

// ── Agendadas: ativação pelo job ────────────────────────────────────────
export async function runScheduledCampaignsOnce(now: Date = new Date()): Promise<{ activated: string[] }> {
  const due = await prisma.communicationCampaign.findMany({
    where: { status: "scheduled", scheduled_at: { lte: now } },
    select: { id: true },
    take: 50,
  });
  const activated: string[] = [];
  for (const { id } of due) {
    try {
      await activateCampaign(id, /* system */ "system");
      activated.push(id);
    } catch (err) {
      console.error(`[comms] falha ao ativar campanha agendada ${id}:`, err);
      await prisma.communicationCampaign.update({ where: { id }, data: { status: "failed" } }).catch(() => {});
    }
  }
  return { activated };
}
