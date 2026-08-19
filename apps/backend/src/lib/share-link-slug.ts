// Normalização e validação de slug de ShareLink (ver routes/dashboard-shares.ts
// e routes/share.ts). O slug é só uma forma amigável de LOCALIZAR o
// registro — nunca prova autorização, então validar aqui é só sobre forma
// (charset/tamanho/palavra reservada), nunca sobre segurança.
export const SHARE_LINK_SLUG_MIN_LENGTH = 3;
export const SHARE_LINK_SLUG_MAX_LENGTH = 60;

// Só o essencial: segmentos de rota reais que um slug colidiria (ver
// App.tsx do frontend) mais alguns valores obviamente problemáticos.
// Não precisa ser exaustivo — o pior caso de esquecer um é uma rota some
// atrás do slug, não um problema de segurança.
export const SHARE_LINK_RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "login",
  "logout",
  "register",
  "dashboard",
  "share",
  "app",
  "static",
  "assets",
  "auth",
  "agency",
  "agencia",
  "company",
  "empresa",
  "nomad",
  "nomade",
  "partner",
  "parceiro",
  "leader",
  "lider",
  "settings",
  "config",
  "help",
  "support",
  "suporte",
  "terms",
  "privacy",
  "null",
  "undefined",
  "true",
  "false",
  "new",
  "novo",
  "edit",
  "editar",
  "delete",
  "excluir",
]);

const DIACRITICS_REGEX = /[̀-ͯ]/g;
const NON_SLUG_CHAR_REGEX = /[^a-z0-9]+/g;
const REPEATED_HYPHEN_REGEX = /-+/g;
const VALID_SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * lowercase → remove acentos → espaços/símbolos viram hífen → colapsa
 * hífens repetidos → tira hífen das pontas. Puramente sintático: não
 * garante disponibilidade nem validade de tamanho — ver `validateShareLinkSlug`.
 */
export function normalizeShareLinkSlug(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(DIACRITICS_REGEX, "")
    .toLowerCase()
    .trim()
    .replace(NON_SLUG_CHAR_REGEX, "-")
    .replace(REPEATED_HYPHEN_REGEX, "-")
    .replace(/^-+|-+$/g, "");
}

export function validateShareLinkSlug(
  normalized: string,
):
  | { ok: true; slug: string }
  | { ok: false; reason: ShareLinkSlugInvalidReason } {
  if (normalized.length < SHARE_LINK_SLUG_MIN_LENGTH) return { ok: false, reason: "too_short" };
  if (normalized.length > SHARE_LINK_SLUG_MAX_LENGTH) return { ok: false, reason: "too_long" };
  if (!VALID_SLUG_REGEX.test(normalized)) return { ok: false, reason: "invalid_chars" };
  if (SHARE_LINK_RESERVED_SLUGS.has(normalized)) return { ok: false, reason: "reserved" };
  return { ok: true, slug: normalized };
}

export type ShareLinkSlugInvalidReason = "too_short" | "too_long" | "invalid_chars" | "reserved";

export function shareLinkSlugErrorMessage(reason: ShareLinkSlugInvalidReason): string {
  switch (reason) {
    case "too_short":
      return `A URL personalizada precisa ter pelo menos ${SHARE_LINK_SLUG_MIN_LENGTH} caracteres.`;
    case "too_long":
      return `A URL personalizada pode ter no máximo ${SHARE_LINK_SLUG_MAX_LENGTH} caracteres.`;
    case "invalid_chars":
      return "Use apenas letras minúsculas, números e hífen.";
    case "reserved":
      return "Essa URL é reservada pelo sistema — escolha outra.";
  }
}
