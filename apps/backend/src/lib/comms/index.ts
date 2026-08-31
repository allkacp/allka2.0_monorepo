// Ponto único do motor de comunicação (ata 2026-08, bloco 5/5).
// O job de fundo (src/index.ts) chama runCommsSchedulerOnceGuarded().

import { prisma } from "../prisma";
import { runScheduledCampaignsOnce } from "./campaign-service";
import { processOutboxBatch, enqueueWithRender, type ProcessResult } from "./delivery-engine";
import type { CommsChannel } from "./types";

export * from "./types";
export { channelStatuses } from "./channels";

let schedulerRunning = false;

export interface SchedulerRunSummary {
  activated_campaigns: string[];
  outbox: ProcessResult;
}

export async function runCommsSchedulerOnce(now: Date = new Date()): Promise<SchedulerRunSummary> {
  const { activated } = await runScheduledCampaignsOnce(now);
  // `now` fresco: a ativação acima criou entregas com scheduled_for = agora,
  // que precisam entrar nesta mesma varredura.
  const outbox = await processOutboxBatch(new Date());
  return { activated_campaigns: activated, outbox };
}

export async function runCommsSchedulerOnceGuarded(now: Date = new Date()): Promise<SchedulerRunSummary | null> {
  if (schedulerRunning) return null;
  schedulerRunning = true;
  try {
    return await runCommsSchedulerOnce(now);
  } finally {
    schedulerRunning = false;
  }
}

/**
 * Notificação pessoal/operacional a um ou mais usuários — atalho do canal
 * "platform" (vira SystemAlert category "notificacao", no painel de
 * Notificações). Idempotente por `dispatchKey` (um evento = uma chave).
 * `linkUrl` só quando existir destino real; sem destino, o aviso não tem
 * link (o painel mostra "Sem destino").
 */
export async function sendPlatformNotification(input: {
  recipientUserIds: string[];
  title: string;
  body: string;
  linkUrl?: string | null;
  dispatchKey: string;
  originId?: string | null;
}): Promise<{ enqueued: number }> {
  const users = await prisma.user.findMany({
    where: { id: { in: input.recipientUserIds }, is_active: true },
    select: { id: true },
  });
  const now = new Date();
  let enqueued = 0;
  for (const u of users) {
    const res = await enqueueWithRender({
      origin: "notification",
      originId: input.originId ?? null,
      recipientUserId: u.id,
      channel: "platform" as CommsChannel,
      dispatchKey: input.dispatchKey,
      scheduledFor: now,
      render: { title: input.title, body: input.body, linkUrl: input.linkUrl ?? null },
    });
    if (res.created) enqueued++;
  }
  return { enqueued };
}
