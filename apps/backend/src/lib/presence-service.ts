import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";
import { config } from "../config";

// ── Presença online mínima e segura (ata 2026-08, bloco 4/5) ─────────────
// Um usuário NÃO é "online" só porque fez login um dia. Só conta enquanto o
// heartbeat autenticado estiver dentro da janela PRESENCE_OFFLINE_AFTER_MS.
// A identidade sempre vem da sessão (`req.user.id`) — nunca do corpo. Conta
// bloqueada/inativa nunca é elegível (o chamador verifica `is_active`).

type Db = Prisma.TransactionClient | PrismaClient;

export const PRESENCE_OFFLINE_AFTER_MS = config.PRESENCE_OFFLINE_AFTER_MS;
export const PRESENCE_HEARTBEAT_MS = config.PRESENCE_HEARTBEAT_MS;

/** Instante a partir do qual um `last_seen_at` ainda conta como online. */
export function onlineSince(now: Date = new Date()): Date {
  return new Date(now.getTime() - PRESENCE_OFFLINE_AFTER_MS);
}

export function isOnline(lastSeenAt: Date | null | undefined, now: Date = new Date()): boolean {
  return !!lastSeenAt && lastSeenAt.getTime() >= onlineSince(now).getTime();
}

/** Registra/atualiza o heartbeat do usuário logado. */
export async function recordHeartbeat(db: Db, userId: string): Promise<void> {
  const now = new Date();
  await db.userPresence.upsert({
    where: { user_id: userId },
    create: { user_id: userId, last_seen_at: now },
    update: { last_seen_at: now },
  });
}

/** Encerra a presença imediatamente (logout). */
export async function clearPresence(db: Db, userId: string): Promise<void> {
  await db.userPresence.deleteMany({ where: { user_id: userId } });
}

/** Dentre os `userIds` dados, quais estão online agora (usuário ativo + heartbeat na janela). */
export async function onlineUserIds(db: Db, userIds: string[], now: Date = new Date()): Promise<Set<string>> {
  if (userIds.length === 0) return new Set();
  const rows = await db.userPresence.findMany({
    where: {
      user_id: { in: userIds },
      last_seen_at: { gte: onlineSince(now) },
      user: { is_active: true },
    },
    select: { user_id: true },
  });
  return new Set(rows.map((r) => r.user_id));
}
