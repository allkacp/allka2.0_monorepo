import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";

// ── Serviço de chat (ata 2026-08, bloco 3/5) ─────────────────────────────
// Regras de acesso e sincronização grupo↔sala num só lugar, para a rota de
// chat e a rota de Grupos de Notificação usarem a MESMA lógica.
//
// Acesso à sala: só participante com `left_at` nulo. Trocar o id na URL não
// entra (a checagem é sempre por `(conversation_id, user_id, left_at:null)`).
// Participante removido do grupo mantém a linha (histórico) mas com `left_at`
// preenchido → perde acesso futuro. Sala arquivada = somente leitura.

type Tx = Prisma.TransactionClient | PrismaClient;

export type ChatAccess =
  | { ok: true; role: string; conversationStatus: string }
  | { ok: false; reason: "not_participant" | "left" | "not_found" };

/** O usuário é participante ATIVO da conversa? (base de todo acesso.) */
export async function resolveChatAccess(
  db: Tx,
  conversationId: string,
  userId: string,
): Promise<ChatAccess> {
  const conv = await db.conversation.findUnique({
    where: { id: conversationId },
    select: { status: true },
  });
  if (!conv) return { ok: false, reason: "not_found" };
  const p = await db.chatParticipant.findUnique({
    where: { conversation_id_user_id: { conversation_id: conversationId, user_id: userId } },
    select: { role: true, left_at: true },
  });
  if (!p) return { ok: false, reason: "not_participant" };
  if (p.left_at) return { ok: false, reason: "left" };
  return { ok: true, role: p.role, conversationStatus: conv.status };
}

/**
 * Reconcilia a sala de um Grupo de Notificação com a lista de membros.
 * Idempotente: rodar duas vezes com o mesmo estado não muda nada e não
 * duplica participante. Nunca apaga `ChatMessage`. Membro que saiu volta
 * como participante ativo (limpa `left_at`) — mensagens antigas dele
 * permanecem.
 *
 * `memberUserIds` já deve incluir o dono/solicitante do grupo se ele
 * também for participante da sala (o chamador decide).
 */
export async function syncRoomParticipants(
  db: Tx,
  conversationId: string,
  memberUserIds: string[],
): Promise<{ added: number; removed: number }> {
  const want = new Set(memberUserIds);
  const current = await db.chatParticipant.findMany({
    where: { conversation_id: conversationId },
    select: { user_id: true, left_at: true },
  });
  const currentActive = new Set(current.filter((p) => !p.left_at).map((p) => p.user_id));
  const currentAny = new Map(current.map((p) => [p.user_id, p]));

  let added = 0;
  let removed = 0;

  for (const uid of want) {
    const existing = currentAny.get(uid);
    if (!existing) {
      await db.chatParticipant.create({ data: { conversation_id: conversationId, user_id: uid, role: "member" } });
      added++;
    } else if (existing.left_at) {
      await db.chatParticipant.update({
        where: { conversation_id_user_id: { conversation_id: conversationId, user_id: uid } },
        data: { left_at: null },
      });
      added++;
    }
  }
  for (const uid of currentActive) {
    if (!want.has(uid)) {
      await db.chatParticipant.update({
        where: { conversation_id_user_id: { conversation_id: conversationId, user_id: uid } },
        data: { left_at: new Date() },
      });
      removed++;
    }
  }
  return { added, removed };
}

/** Não lidas de UMA conversa para um usuário (mensagens de terceiros após o last_read_at). */
export async function unreadForConversation(
  db: Tx,
  conversationId: string,
  userId: string,
  lastReadAt: Date | null,
): Promise<number> {
  return db.chatMessage.count({
    where: {
      conversation_id: conversationId,
      sender_id: { not: userId },
      ...(lastReadAt ? { created_at: { gt: lastReadAt } } : {}),
    },
  });
}

/** Total de não lidas do usuário em todas as salas ATIVAS de que participa. */
export async function totalUnreadForUser(db: Tx, userId: string): Promise<number> {
  const parts = await db.chatParticipant.findMany({
    where: { user_id: userId, left_at: null, conversation: { status: "active" } },
    select: { conversation_id: true, last_read_at: true },
  });
  if (parts.length === 0) return 0;
  const counts = await Promise.all(
    parts.map((p) => unreadForConversation(db, p.conversation_id, userId, p.last_read_at)),
  );
  return counts.reduce((a, b) => a + b, 0);
}
