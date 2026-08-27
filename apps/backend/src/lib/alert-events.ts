// Histórico real de ocorrência de alerta (ata 2026-08, 8º lote —
// "visualização detalhada e histórico real"). Auditoria prévia confirmou
// que não existia estrutura reaproveitável: a única tabela de auditoria já
// existente (product_feedback_access_audits, via writeAccessAudit) é
// genérica, sem índice por alerta, e nunca cobriu ações do destinatário
// (abrir detalhes, clicar em Ver origem, dispensar) — só ações
// administrativas da Central. SystemAlertEvent é nova, imutável (só
// INSERT nesta feature), com o mínimo necessário por linha.
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export const ALERT_EVENT_TYPES = [
  "created",
  "details_opened",
  "origin_clicked",
  "archived",
  "unarchived",
  "dismissed",
  "expired_by_engine",
  "admin_updated",
  // Resolução formal de alerta crítico (ata 2026-08, 10º lote) — distinto
  // de "expired_by_engine"/"archived": só existe por ação humana explícita
  // via POST /:id/resolve, nunca automático.
  "resolved",
] as const;

export type AlertEventType = (typeof ALERT_EVENT_TYPES)[number];

interface AlertEventInput {
  eventType: AlertEventType;
  description: string;
  actorUserId?: string | null;
  // Só o mínimo necessário e seguro — nunca token/senha/payload completo.
  // Serializado aqui (não confiado ao chamador) pra nunca esquecer o
  // JSON.stringify nem gravar undefined como string.
  metadata?: Record<string, unknown> | null;
}

interface ClientTriggeredEventInput extends AlertEventInput {
  // Gerado no frontend por ação intencional (uma abertura, um clique) —
  // ver comentário no schema (SystemAlertEvent.client_event_id). Único no
  // banco: nunca depende só de guarda em memória do lado do cliente.
  clientEventId: string;
}

// Formato pronto pra usar dentro de um `data: { events: { create: ... } }`
// de um `prisma.systemAlert.create()`/`.update()` — nested write do Prisma,
// que roda na MESMA transação implícita da operação principal (o pedido
// explícito da ata de "gravar o evento na mesma transação da alteração
// sempre que tecnicamente possível").
export function nestedAlertEventCreate(input: AlertEventInput) {
  return {
    create: {
      event_type: input.eventType,
      description: input.description,
      actor_user_id: input.actorUserId ?? null,
      metadata_json: input.metadata ? JSON.stringify(input.metadata) : null,
    },
  };
}

// Gravação avulsa (fora de um nested write) — usada quando o evento precisa
// ser registrado por uma rota separada da que muda o estado (ex.: "detalhes
// abertos"/"origem clicada", que não alteram a ocorrência em si) ou quando
// a chamada que muda o estado já teve sua própria resposta computada e só
// falta anexar o evento.
export async function recordAlertEvent(alertId: string, input: AlertEventInput): Promise<void> {
  await prisma.systemAlertEvent.create({
    data: {
      alert_id: alertId,
      event_type: input.eventType,
      description: input.description,
      actor_user_id: input.actorUserId ?? null,
      metadata_json: input.metadata ? JSON.stringify(input.metadata) : null,
    },
  });
}

// Idempotência de verdade pra eventos disparados por AÇÃO DO CLIENTE
// ("details_opened"/"origin_clicked" — os únicos sem uma mudança de estado
// própria que já os protegeria, como archived/dismissed protegidos por
// is_archived/is_read antes de gravar). O índice único em
// client_event_id é a garantia real; a checagem antes do INSERT é só
// otimização (evita round-trip extra na maioria dos casos) — o catch do
// P2002 é o que de fato cobre a corrida (duas requisições concorrentes
// com o MESMO client_event_id, ex.: clique duplo disparando dois POSTs
// quase simultâneos, ou um retry de rede reenviando a mesma requisição).
// Nunca lança em cima de duplicata — devolve normalmente, sem criar uma
// segunda linha nem impedir uma abertura/clique NOVO e legítimo (que vem
// com um client_event_id DIFERENTE, gerado no frontend por ação).
export async function recordClientTriggeredEventIdempotent(
  alertId: string,
  input: ClientTriggeredEventInput,
): Promise<{ duplicate: boolean }> {
  const existing = await prisma.systemAlertEvent.findUnique({
    where: { client_event_id: input.clientEventId },
    select: { id: true },
  });
  if (existing) return { duplicate: true };

  try {
    await prisma.systemAlertEvent.create({
      data: {
        alert_id: alertId,
        event_type: input.eventType,
        description: input.description,
        actor_user_id: input.actorUserId ?? null,
        metadata_json: input.metadata ? JSON.stringify(input.metadata) : null,
        client_event_id: input.clientEventId,
      },
    });
    return { duplicate: false };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      // Perdeu a corrida pro índice único — outra requisição com o MESMO
      // client_event_id já inseriu primeiro. Mesmo resultado funcional:
      // exatamente 1 evento gravado pra esse client_event_id.
      return { duplicate: true };
    }
    throw err;
  }
}
