import type { Prisma, PrismaClient } from "@prisma/client";

/**
 * Vocabulário fechado de ações auditadas (item 8) — usar sempre uma destas,
 * nunca uma string livre, pra manter o histórico consistente e fácil de
 * filtrar/exibir na UI.
 */
export const SHARE_LINK_ACTIVITY_ACTIONS = [
  "created",
  "slug_changed",
  "permission_changed",
  "pin_enabled",
  "pin_changed",
  "pin_removed",
  "expiry_changed",
  "revoked",
  "reactivated",
  "archived",
] as const;
export type ShareLinkActivityAction = (typeof SHARE_LINK_ACTIVITY_ACTIONS)[number];

const ACTIVITY_LABEL: Record<ShareLinkActivityAction, string> = {
  created: "Link criado",
  slug_changed: "URL personalizada alterada",
  permission_changed: "Permissão alterada",
  pin_enabled: "PIN ativado",
  pin_changed: "PIN trocado",
  pin_removed: "PIN removido",
  expiry_changed: "Validade alterada",
  revoked: "Link revogado",
  reactivated: "Link reativado",
  archived: "Link excluído/arquivado",
};

export function shareLinkActivityLabel(action: string): string {
  return ACTIVITY_LABEL[action as ShareLinkActivityAction] ?? action;
}

/**
 * Só valores seguros entram aqui — nunca PIN em texto puro, pin_hash, JWT
 * ou qualquer segredo. Ações relacionadas a PIN (pin_enabled/pin_changed/
 * pin_removed) NUNCA recebem metadata com o valor do PIN, só a mudança de
 * ESTADO (ex.: nada — a própria ação já diz o que aconteceu). Isso é
 * reforçado aqui, não só por convenção nos call sites: se algum campo
 * suspeito (pin/token/hash/secret/senha) vier no metadata, é removido
 * antes de persistir.
 */
const FORBIDDEN_METADATA_KEYS = /pin|hash|token|secret|senha|password|jwt/i;

function redactMetadata(metadata: Record<string, unknown> | undefined): Prisma.InputJsonValue | undefined {
  if (!metadata) return undefined;
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (FORBIDDEN_METADATA_KEYS.test(key)) continue;
    if (value === undefined) continue;
    safe[key] = value;
  }
  return Object.keys(safe).length > 0 ? (safe as Prisma.InputJsonValue) : undefined;
}

export type ShareLinkActor = {
  id: string;
  name?: string | null;
  email?: string | null;
};

/**
 * Registra uma ação de auditoria — sempre chamado DENTRO da mesma
 * transaction que fez a alteração no ShareLink (ver routes/dashboard-shares.ts),
 * pra nunca existir alteração sem log nem log sem alteração. `db` recebe o
 * client de transaction (Prisma.TransactionClient) quando chamado de
 * dentro de `prisma.$transaction`, ou o client normal fora de transaction
 * (ex.: ação de sistema sem ator humano).
 */
export async function logShareLinkActivity(
  db: PrismaClient | Prisma.TransactionClient,
  params: {
    shareLinkId: string;
    action: ShareLinkActivityAction;
    actor: ShareLinkActor | null;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  await db.shareLinkActivity.create({
    data: {
      share_link_id: params.shareLinkId,
      action: params.action,
      actor_user_id: params.actor?.id ?? null,
      actor_name: params.actor?.name ?? null,
      actor_email: params.actor?.email ?? null,
      metadata: redactMetadata(params.metadata),
    },
  });
}
