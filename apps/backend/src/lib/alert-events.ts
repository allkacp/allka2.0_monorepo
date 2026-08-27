// Histórico real de ocorrência de alerta (ata 2026-08, 8º lote —
// "visualização detalhada e histórico real"). Auditoria prévia confirmou
// que não existia estrutura reaproveitável: a única tabela de auditoria já
// existente (product_feedback_access_audits, via writeAccessAudit) é
// genérica, sem índice por alerta, e nunca cobriu ações do destinatário
// (abrir detalhes, clicar em Ver origem, dispensar) — só ações
// administrativas da Central. SystemAlertEvent é nova, imutável (só
// INSERT nesta feature), com o mínimo necessário por linha.
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
