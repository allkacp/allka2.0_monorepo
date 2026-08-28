// Motor central de entrega — outbox persistente (ata 2026-08, bloco 5/5).
//
// TODA saída por canal (notificação, campanha, banner) vira uma linha em
// `communication_deliveries`. Idempotência REAL por `idempotency_key`
// (@unique no banco, não só memória): retry, clique duplo e job concorrente
// nunca criam uma segunda entrega para a mesma
// (origem, origem_id, destinatário, canal, chave de disparo).

import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { config } from "../../config";
import { dispatchToChannel } from "./channels";
import { channelAllowedByPreference } from "./preferences";
import type { CommsChannel, CommsOrigin, RenderedMessage } from "./types";

export interface EnqueueInput {
  origin: CommsOrigin;
  originId: string | null;
  recipientUserId: string;
  channel: CommsChannel;
  // Parte estável da chave de idempotência dentro de uma origem. Ex.: para
  // campanha use a própria (campaign_id já está em originId) + "v1"; para
  // notificação avulsa use um id de evento único.
  dispatchKey: string;
  scheduledFor: Date;
  render: RenderedMessage;
  // Marketing/reengajamento respeita opt-in; comunicação obrigatória não.
  requiresOptIn?: boolean;
}

export function buildIdempotencyKey(i: {
  origin: string;
  originId: string | null;
  recipientUserId: string;
  channel: string;
  dispatchKey: string;
}): string {
  return [i.origin, i.originId ?? "-", i.recipientUserId, i.channel, i.dispatchKey].join("::");
}

export interface EnqueueResult {
  id: string;
  created: boolean;
  status: string;
}

/**
 * Cria (ou reaproveita) UMA entrega. Nunca duplica: se a chave já existe,
 * devolve a existente com `created: false`. Aplica a preferência de canal do
 * usuário ANTES de gastar uma tentativa (marca `skipped_by_preference`).
 */
export async function enqueueDelivery(input: EnqueueInput): Promise<EnqueueResult> {
  const idempotency_key = buildIdempotencyKey(input);

  const existing = await prisma.communicationDelivery.findUnique({
    where: { idempotency_key },
    select: { id: true, status: true },
  });
  if (existing) return { id: existing.id, created: false, status: existing.status };

  const prefAllowed = await channelAllowedByPreference(input.recipientUserId, input.channel, {
    requiresOptIn: input.requiresOptIn ?? false,
  });

  const initialStatus = prefAllowed.allowed ? "pending" : "skipped_by_preference";

  try {
    const row = await prisma.communicationDelivery.create({
      data: {
        origin: input.origin,
        origin_id: input.originId,
        recipient_user_id: input.recipientUserId,
        channel: input.channel,
        status: initialStatus,
        scheduled_for: input.scheduledFor,
        idempotency_key,
        metadata_json: JSON.stringify({
          dispatch_key: input.dispatchKey,
          render: { title: input.render.title, has_link: !!input.render.linkUrl },
          ...(prefAllowed.allowed ? {} : { skipped_reason: prefAllowed.reason }),
        }),
      },
      select: { id: true, status: true },
    });
    return { id: row.id, created: true, status: row.status };
  } catch (err) {
    // Corrida com outra chamada concorrente para a MESMA chave — o índice
    // único garante uma só linha. Devolve a que venceu.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const row = await prisma.communicationDelivery.findUnique({
        where: { idempotency_key },
        select: { id: true, status: true },
      });
      if (row) return { id: row.id, created: false, status: row.status };
    }
    throw err;
  }
}

// Guarda em processo — evita duas varreduras concorrentes na MESMA instância.
let outboxRunning = false;

export interface ProcessResult {
  claimed: number;
  delivered: number;
  failed: number;
  not_configured: number;
  no_address: number;
  retried: number;
}

/**
 * Processa um lote da outbox. Cada entrega é "reivindicada" por um
 * compare-and-swap (`updateMany status: pending → processing`): dois jobs
 * concorrentes nunca enviam a mesma linha duas vezes.
 */
export async function processOutboxBatch(now: Date = new Date()): Promise<ProcessResult> {
  const result: ProcessResult = { claimed: 0, delivered: 0, failed: 0, not_configured: 0, no_address: 0, retried: 0 };

  const candidates = await prisma.communicationDelivery.findMany({
    where: { status: "pending", scheduled_for: { lte: now } },
    orderBy: { scheduled_for: "asc" },
    take: config.COMMS_DELIVERY_BATCH_SIZE,
    select: { id: true },
  });

  for (const { id } of candidates) {
    // Reivindica a linha — só uma varredura (nesta ou noutra instância) vence.
    const claim = await prisma.communicationDelivery.updateMany({
      where: { id, status: "pending" },
      data: { status: "processing", first_attempt_at: undefined },
    });
    if (claim.count === 0) continue;
    result.claimed++;

    const delivery = await prisma.communicationDelivery.findUnique({ where: { id } });
    if (!delivery) continue;

    const recipient = await prisma.user.findUnique({
      where: { id: delivery.recipient_user_id },
      select: { id: true, name: true, email: true, phone: true, is_active: true },
    });

    if (!recipient || !recipient.is_active) {
      await prisma.communicationDelivery.update({
        where: { id },
        data: {
          status: "cancelled",
          last_attempt_at: now,
          failure_summary: "Destinatário inexistente ou inativo no momento do envio.",
        },
      });
      continue;
    }

    const meta = safeParse(delivery.metadata_json);
    const render: RenderedMessage = (meta?.full_render as RenderedMessage) ?? {
      title: (meta?.render as { title?: string } | undefined)?.title ?? "Comunicação",
      body: (meta?.body as string | undefined) ?? "",
    };

    const send = await dispatchToChannel(delivery.channel as CommsChannel, {
      recipient: { id: recipient.id, name: recipient.name, email: recipient.email, phone: recipient.phone },
      origin: delivery.origin as CommsOrigin,
      originId: delivery.origin_id,
      message: render,
    });

    const attempts = delivery.attempts + 1;
    const base = {
      attempts,
      last_attempt_at: now,
      first_attempt_at: delivery.first_attempt_at ?? now,
    };

    if (send.outcome === "delivered") {
      await prisma.communicationDelivery.update({
        where: { id },
        data: {
          ...base,
          status: "delivered",
          delivered_at: now,
          metadata_json: mergeMeta(delivery.metadata_json, { external_id: send.externalId ?? null }),
        },
      });
      result.delivered++;
    } else if (send.outcome === "channel_not_configured") {
      await prisma.communicationDelivery.update({
        where: { id },
        data: {
          ...base,
          status: "channel_not_configured",
          failed_at: now,
          failure_summary: send.failureSummary ?? "Canal não configurado.",
          preview_json: send.preview ? JSON.stringify(send.preview) : null,
        },
      });
      result.not_configured++;
    } else if (send.outcome === "no_valid_address") {
      await prisma.communicationDelivery.update({
        where: { id },
        data: { ...base, status: "no_valid_address", failed_at: now, failure_summary: send.failureSummary ?? "Sem endereço válido." },
      });
      result.no_address++;
    } else {
      // failed — tenta de novo se ainda há orçamento e o erro é transitório.
      const canRetry = send.retriable !== false && attempts < config.COMMS_MAX_DELIVERY_ATTEMPTS;
      await prisma.communicationDelivery.update({
        where: { id },
        data: {
          ...base,
          status: canRetry ? "pending" : "failed",
          failed_at: canRetry ? null : now,
          failure_summary: send.failureSummary ?? "Falha no envio.",
        },
      });
      if (canRetry) result.retried++;
      else result.failed++;
    }
  }

  return result;
}

export async function processOutboxGuarded(now: Date = new Date()): Promise<ProcessResult | null> {
  if (outboxRunning) return null;
  outboxRunning = true;
  try {
    return await processOutboxBatch(now);
  } finally {
    outboxRunning = false;
  }
}

function safeParse(json: string | null): Record<string, unknown> | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function mergeMeta(existing: string | null, extra: Record<string, unknown>): string {
  return JSON.stringify({ ...(safeParse(existing) ?? {}), ...extra });
}

/**
 * Igual a enqueueDelivery, mas grava o render completo em metadata para o
 * processamento assíncrono (a outbox roda depois, sem o contexto original).
 */
export async function enqueueWithRender(input: EnqueueInput): Promise<EnqueueResult> {
  const res = await enqueueDelivery(input);
  if (res.created) {
    const row = await prisma.communicationDelivery.findUnique({ where: { id: res.id }, select: { metadata_json: true } });
    await prisma.communicationDelivery.update({
      where: { id: res.id },
      data: { metadata_json: mergeMeta(row?.metadata_json ?? null, { full_render: input.render }) },
    });
  }
  return res;
}
