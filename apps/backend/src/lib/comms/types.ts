// Tipos compartilhados do motor central de comunicação (ata 2026-08, bloco 5/5).

export const COMMS_CHANNELS = ["platform", "email", "whatsapp", "push"] as const;
export type CommsChannel = (typeof COMMS_CHANNELS)[number];

export const COMMS_ORIGINS = ["notification", "campaign", "banner"] as const;
export type CommsOrigin = (typeof COMMS_ORIGINS)[number];

// Situações de UMA entrega na outbox.
export const DELIVERY_STATUSES = [
  "pending",
  "processing",
  "delivered",
  "failed",
  "cancelled",
  "skipped_by_preference",
  "channel_not_configured",
  "no_valid_address",
] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

// Mensagem já resolvida para um destinatário — nunca contém segredo.
export interface RenderedMessage {
  title: string;
  body: string;
  linkUrl?: string | null;
  imageUrl?: string | null;
  // Só para o canal "platform": categoria do SystemAlert gerado.
  platformCategory?: "notificacao";
}

// Resultado de UMA tentativa de envio por um adaptador de canal.
export interface ChannelSendResult {
  // "delivered"           → chegou de verdade (só "platform" hoje).
  // "channel_not_configured" → canal sem provedor/credenciais; NUNCA finge
  //                          sucesso; carrega `preview`.
  // "no_valid_address"    → destinatário sem e-mail/telefone/assinatura válida.
  // "failed"              → provedor real respondeu erro (transitório ou não).
  outcome: "delivered" | "channel_not_configured" | "no_valid_address" | "failed";
  // Motivo resumido e legível — NUNCA token, senha, chave de provedor ou
  // corpo completo da requisição.
  failureSummary?: string;
  // Falha transitória → o motor tenta de novo (respeitando o teto). Falha
  // permanente → marca "failed" direto.
  retriable?: boolean;
  // Id retornado pelo provedor real, quando houver.
  externalId?: string;
  // Captura local (assunto/corpo/para) para o Admin conferir que nada real
  // saiu — sem segredos.
  preview?: Record<string, unknown>;
}

export interface DeliveryContext {
  recipient: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  };
  origin: CommsOrigin;
  originId: string | null;
  message: RenderedMessage;
}
