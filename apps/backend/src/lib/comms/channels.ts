// Adaptadores de canal (ata 2026-08, bloco 5/5).
//
// AUDITORIA (registrada no relatório): o backend NÃO tem serviço de e-mail,
// integração de WhatsApp nem Web Push configurados. Por isso e-mail/WhatsApp/
// push abaixo SEMPRE respondem "channel_not_configured" + captura de preview
// local — nunca fingem entrega. Cada um está isolado numa função própria para
// virar um adaptador real (drop-in) quando existir provedor/credenciais.
//
// Só o canal "platform" entrega de verdade: cria um SystemAlert pessoal
// (category "notificacao"), que aparece no mesmo painel de Notificações que o
// resto da plataforma usa. Nunca cria alerta (category "alerta") — campanha
// não é alerta.

import crypto from "crypto";
import { prisma } from "../prisma";
import { config } from "../../config";
import type { ChannelSendResult, CommsChannel, DeliveryContext } from "./types";

function isValidEmail(value: string | null | undefined): value is string {
  if (!value) return false;
  // Validação simples e conservadora — só formato, nunca DNS/rede.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function normalizePhone(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 ? digits : null;
}

// ── platform (real) ──────────────────────────────────────────────────────
async function sendPlatform(ctx: DeliveryContext): Promise<ChannelSendResult> {
  const alert = await prisma.systemAlert.create({
    data: {
      type: `comms.${ctx.origin}`,
      title: ctx.message.title,
      message: ctx.message.body,
      severity: "info",
      category: "notificacao", // NUNCA "alerta" — campanha/banner não é alerta
      user_id: ctx.recipient.id, // destinatário real — isolado por usuário
      action_url: ctx.message.linkUrl ?? null,
      entity_type: ctx.originId ? `communication_${ctx.origin}` : null,
      entity_id: ctx.originId ?? null,
    },
    select: { id: true },
  });
  return { outcome: "delivered", externalId: alert.id };
}

// ── e-mail (não configurado → preview) ───────────────────────────────────
async function sendEmail(ctx: DeliveryContext): Promise<ChannelSendResult> {
  if (!isValidEmail(ctx.recipient.email)) {
    return { outcome: "no_valid_address", failureSummary: "Destinatário sem e-mail em formato válido." };
  }
  const preview = {
    to: ctx.recipient.email,
    from: config.EMAIL_FROM_ADDRESS ?? "(remetente não configurado)",
    subject: ctx.message.title,
    body: ctx.message.body,
    link: ctx.message.linkUrl ?? null,
  };
  if (config.EMAIL_PROVIDER === "smtp") {
    // Adaptador real (drop-in): exigiria uma biblioteca SMTP e as credenciais
    // completas. Enquanto isso não existir no projeto, NÃO finge sucesso.
    return {
      outcome: "channel_not_configured",
      failureSummary:
        "EMAIL_PROVIDER=smtp mas o adaptador SMTP real ainda não está implementado (dependência não instalada). Nada foi enviado.",
      preview,
    };
  }
  return {
    outcome: "channel_not_configured",
    failureSummary: "Canal de e-mail não configurado — nenhum e-mail real foi enviado. Preview capturado localmente.",
    preview,
  };
}

// ── WhatsApp (não configurado → preview) ─────────────────────────────────
async function sendWhatsapp(ctx: DeliveryContext): Promise<ChannelSendResult> {
  const phone = normalizePhone(ctx.recipient.phone);
  if (!phone) {
    return { outcome: "no_valid_address", failureSummary: "Destinatário sem telefone válido." };
  }
  const preview = {
    to: phone,
    template: "(template aprovado será necessário quando configurado)",
    body: ctx.message.body,
    link: ctx.message.linkUrl ?? null,
  };
  if (config.WHATSAPP_PROVIDER === "cloud_api" || config.WHATSAPP_PROVIDER === "provider") {
    return {
      outcome: "channel_not_configured",
      failureSummary:
        `WHATSAPP_PROVIDER=${config.WHATSAPP_PROVIDER} mas o adaptador oficial ainda não está implementado. ` +
        "Somente Cloud API oficial / provedor oficial serão aceitos — nunca automação de WhatsApp Web. Nada foi enviado.",
      preview,
    };
  }
  return {
    outcome: "channel_not_configured",
    failureSummary: "Canal de WhatsApp não configurado — nenhuma mensagem real foi enviada. Preview capturado localmente.",
    preview,
  };
}

// ── Web Push (sem VAPID → não configurado) ───────────────────────────────
async function sendPush(ctx: DeliveryContext): Promise<ChannelSendResult> {
  const subs = await prisma.pushSubscription.findMany({
    where: { user_id: ctx.recipient.id, enabled: true },
    select: { id: true },
  });
  if (subs.length === 0) {
    return { outcome: "no_valid_address", failureSummary: "Usuário sem assinatura de push ativa." };
  }
  const preview = { subscriptions: subs.length, title: ctx.message.title, body: ctx.message.body };
  if (config.WEB_PUSH_VAPID_PUBLIC_KEY && config.WEB_PUSH_VAPID_PRIVATE_KEY) {
    return {
      outcome: "channel_not_configured",
      failureSummary: "Chaves VAPID presentes, mas o envio Web Push real ainda não está implementado. Nada foi enviado.",
      preview,
    };
  }
  return {
    outcome: "channel_not_configured",
    failureSummary: "Web Push não configurado (sem chaves VAPID) — nenhuma notificação real foi enviada.",
    preview,
  };
}

export interface ChannelStatus {
  channel: CommsChannel;
  // "working" | "not_configured"
  state: "working" | "not_configured";
  detail: string;
}

export function channelStatuses(): ChannelStatus[] {
  return [
    { channel: "platform", state: "working", detail: "Aviso dentro da plataforma (painel de Notificações)." },
    {
      channel: "email",
      state: "not_configured",
      detail:
        config.EMAIL_PROVIDER === "smtp"
          ? "EMAIL_PROVIDER=smtp, mas o adaptador SMTP real não está implementado."
          : "Sem provedor de e-mail. Preview local disponível; nenhum e-mail real é enviado.",
    },
    {
      channel: "whatsapp",
      state: "not_configured",
      detail:
        config.WHATSAPP_PROVIDER !== "none"
          ? `WHATSAPP_PROVIDER=${config.WHATSAPP_PROVIDER}, mas o adaptador oficial não está implementado.`
          : "Sem integração oficial de WhatsApp. Preview local; nenhuma mensagem real é enviada.",
    },
    {
      channel: "push",
      state: "not_configured",
      detail:
        config.WEB_PUSH_VAPID_PUBLIC_KEY && config.WEB_PUSH_VAPID_PRIVATE_KEY
          ? "Chaves VAPID presentes, mas o envio Web Push real não está implementado."
          : "Sem chaves VAPID. Assinaturas são guardadas; nenhuma push real é enviada.",
    },
  ];
}

const ADAPTERS: Record<CommsChannel, (ctx: DeliveryContext) => Promise<ChannelSendResult>> = {
  platform: sendPlatform,
  email: sendEmail,
  whatsapp: sendWhatsapp,
  push: sendPush,
};

// Aplica um timeout por tentativa (canais externos) — nunca deixa uma
// tentativa pendurada travando a outbox.
export async function dispatchToChannel(channel: CommsChannel, ctx: DeliveryContext): Promise<ChannelSendResult> {
  const adapter = ADAPTERS[channel];
  if (!adapter) {
    return { outcome: "failed", failureSummary: `Canal desconhecido: ${channel}`, retriable: false };
  }
  try {
    if (channel === "platform") return await adapter(ctx);
    return await Promise.race([
      adapter(ctx),
      new Promise<ChannelSendResult>((_, reject) =>
        setTimeout(() => reject(new Error("timeout do canal")), config.COMMS_CHANNEL_TIMEOUT_MS),
      ),
    ]);
  } catch (err) {
    return {
      outcome: "failed",
      failureSummary: err instanceof Error ? err.message.slice(0, 300) : "Falha desconhecida no canal.",
      retriable: true,
    };
  }
}

export function hashPushEndpoint(endpoint: string): string {
  return crypto.createHash("sha256").update(endpoint).digest("hex");
}

export { isValidEmail, normalizePhone };
