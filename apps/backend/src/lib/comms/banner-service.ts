// Banner obrigatório (ata 2026-08, bloco 5/5).
//
// Comunicado interno que aparece DENTRO da plataforma. kind "obrigatorio"
// exige ciência explícita ("Li e estou ciente") — Esc / clique fora NÃO
// dispensam. A ciência é registrada por (banner, usuário, versão): subir a
// versão faz o banner reaparecer. Expirado / cancelado → não aparece.
//
// NÃO é aceite jurídico de termos (isso tem fluxo próprio — TermAcceptance).

import { prisma } from "../prisma";
import { parseAudience, resolveAudienceUserIds } from "./audience";

export class BannerError extends Error {
  constructor(
    message: string,
    public httpStatus: number,
    public code?: string,
  ) {
    super(message);
  }
}

function bannerImageUrl(id: string, fileName: string | null): string | null {
  return fileName ? `/api/comms/banners/${id}/image` : null;
}

export function serializeBanner(b: {
  id: string;
  audience_json: string;
  image_file_name: string | null;
  [k: string]: unknown;
}) {
  const { audience_json, image_file_name, ...rest } = b;
  return {
    ...rest,
    audience: safeObj(audience_json),
    has_image: !!image_file_name,
    image_url: bannerImageUrl(b.id, image_file_name),
  };
}

function safeObj(json: string): Record<string, unknown> {
  try {
    const v = JSON.parse(json);
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

/** True se o usuário está no público do banner (recalculado no servidor). */
async function userInAudience(bannerAudienceJson: string, userId: string): Promise<boolean> {
  const filter = parseAudience(safeObj(bannerAudienceJson));
  // Sem nenhum filtro efetivo = todos os usuários ativos das contas principais.
  const ids = await resolveAudienceUserIds({ ...filter, user_ids: filter.user_ids ?? undefined });
  return ids.includes(userId);
}

/**
 * Banners que o usuário PRECISA ver agora: ativos, dentro da janela, do seu
 * público, e SEM ciência na versão atual. Informativos entram também (mas o
 * frontend permite fechá-los).
 */
export async function activeBannersForUser(userId: string, now: Date = new Date()) {
  const candidates = await prisma.mandatoryBanner.findMany({
    where: {
      is_active: true,
      is_cancelled: false,
      starts_at: { lte: now },
      OR: [{ ends_at: null }, { ends_at: { gt: now } }],
    },
    orderBy: { starts_at: "asc" },
  });

  const acks = await prisma.bannerAcknowledgement.findMany({
    where: { user_id: userId, banner_id: { in: candidates.map((b) => b.id) } },
    select: { banner_id: true, version: true },
  });
  const ackedCurrent = new Set(
    acks
      .filter((a) => candidates.find((b) => b.id === a.banner_id && b.version === a.version))
      .map((a) => a.banner_id),
  );

  const out: ReturnType<typeof serializeBanner>[] = [];
  for (const b of candidates) {
    if (ackedCurrent.has(b.id)) continue;
    if (!(await userInAudience(b.audience_json, userId))) continue;
    out.push(serializeBanner(b));
  }
  return out;
}

/**
 * Registra a ciência. Identidade SEMPRE da sessão (o chamador passa
 * `sessionUserId`), nunca do corpo. Idempotente por (banner, usuário,
 * versão) — clique duplo / retry não cria uma segunda linha.
 */
export async function acknowledgeBanner(bannerId: string, sessionUserId: string, versionFromClient?: number) {
  const banner = await prisma.mandatoryBanner.findUnique({ where: { id: bannerId } });
  if (!banner) throw new BannerError("Banner não encontrado.", 404);
  if (banner.is_cancelled || !banner.is_active) {
    throw new BannerError("Este banner não está mais ativo.", 409, "inactive");
  }
  // A versão de referência é sempre a ATUAL do servidor — o cliente só
  // informa qual versão ele viu (para detectar corrida com nova publicação).
  const version = banner.version;
  if (versionFromClient != null && versionFromClient !== version) {
    throw new BannerError("Há uma nova versão deste banner — recarregue para vê-la.", 409, "version_changed");
  }

  await prisma.bannerAcknowledgement.upsert({
    where: { banner_id_user_id_version: { banner_id: bannerId, user_id: sessionUserId, version } },
    create: { banner_id: bannerId, user_id: sessionUserId, version },
    update: {}, // já registrado — mantém o horário original
  });

  return { acknowledged: true, banner_id: bannerId, version };
}

/** Publica uma nova versão — faz o banner reaparecer para quem já deu ciência. */
export async function publishNewBannerVersion(bannerId: string) {
  const banner = await prisma.mandatoryBanner.findUnique({ where: { id: bannerId } });
  if (!banner) throw new BannerError("Banner não encontrado.", 404);
  const updated = await prisma.mandatoryBanner.update({
    where: { id: bannerId },
    data: { version: banner.version + 1 },
  });
  return { version: updated.version };
}
