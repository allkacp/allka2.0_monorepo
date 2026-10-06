// Visibilidade do produto por público (reunião 2026-10-05, C7; refeita em 2026-10-06 como lista de marcação).
// O produto guarda em `visibility_mode` ou "all" (todos) ou uma lista separada por vírgula com os públicos marcados:
//   company  = empresas
//   agency   = SOMENTE agências comuns (que não são partner)
//   partner  = somente agências partner (parceiras ativas)
//   internal = somente equipe interna
// Vale na lista, no detalhe, na cotação/cesta e nas recomendações da IA. Administração e líderes sempre veem. Sem configuração = todos.
import { prisma } from "./prisma";

export const AUDIENCE_TOKENS = ["company", "agency", "partner", "internal"] as const;
export type AudienceToken = (typeof AUDIENCE_TOKENS)[number];
export const AUDIENCE_LABEL: Record<AudienceToken, string> = { company: "Company (empresas)", agency: "Agency (só agências comuns, sem as partner)", partner: "Agency Partner (só agências partner)", internal: "Somente equipe interna" };

export interface AudienceViewer { kind: "company" | "agency" | "internal"; is_partner?: boolean }
export interface AudienceProduct { visibility_mode?: string | null }

/** Lê o valor guardado: "all" (ou vazio) = todos; senão a lista de públicos marcados (valores desconhecidos são ignorados). */
export function parseAudiences(raw: string | null | undefined): AudienceToken[] | "all" {
  const v = (raw ?? "all").trim();
  if (!v || v === "all") return "all";
  const tokens = v.split(",").map((t) => t.trim()).filter((t): t is AudienceToken => (AUDIENCE_TOKENS as readonly string[]).includes(t));
  return tokens.length ? tokens : "all";
}

/** Normaliza o que veio da tela. "Somente equipe interna" é exclusivo; lista vazia = todos. */
export function serializeAudiences(tokens: readonly string[] | null | undefined): string {
  const set = new Set((tokens ?? []).filter((t): t is AudienceToken => (AUDIENCE_TOKENS as readonly string[]).includes(t)));
  if (set.has("internal")) return "internal";
  const ordered = AUDIENCE_TOKENS.filter((t) => set.has(t));
  return ordered.length ? ordered.join(",") : "all";
}

export function validateAudiences(tokens: readonly string[]): string | null {
  for (const t of tokens) if (t !== "all" && !(AUDIENCE_TOKENS as readonly string[]).includes(t)) return `Público inválido: ${t}.`;
  return null;
}

/** O público informado enxerga o produto? Sem visualizador (ex.: IA sem contexto) só enxerga o que é para todos. */
export function audienceAllows(product: AudienceProduct, viewer: AudienceViewer | null | undefined): boolean {
  const a = parseAudiences(product.visibility_mode);
  if (a === "all") return true;
  if (!viewer) return false;
  if (viewer.kind === "internal") return true;
  if (viewer.kind === "company") return a.includes("company");
  return viewer.is_partner ? a.includes("partner") : a.includes("agency");
}

/** Filtro para a listagem do catálogo (o mesmo critério de audienceAllows, em forma de consulta). `null` = sem filtro (equipe interna). */
export function audienceWhere(viewer: AudienceViewer): Record<string, unknown> | null {
  if (viewer.kind === "internal") return null;
  const has = (t: AudienceToken) => ({ visibility_mode: { contains: t } });
  if (viewer.kind === "company") return { OR: [{ visibility_mode: "all" }, has("company")] };
  return { OR: [{ visibility_mode: "all" }, viewer.is_partner ? has("partner") : has("agency")] };
}

/** Visualizador a partir do contexto do catálogo do cliente. */
export function viewerFromContext(ctx: { kind: string; always_sees_all_products?: boolean; agency_is_partner?: boolean }): AudienceViewer {
  if (ctx.always_sees_all_products || ctx.kind === "admin" || ctx.kind === "leader") return { kind: "internal" };
  if (ctx.kind === "agency") return { kind: "agency", is_partner: !!ctx.agency_is_partner };
  return { kind: "company" };
}

/** Visualizador de um usuário (IA e outros pontos que só têm o id). */
export async function loadAudienceViewer(userId: string): Promise<AudienceViewer> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { account_type: true, role: true, agency_link: { select: { partner_profile: { select: { status: true } } } }, owned_agency: { select: { partner_profile: { select: { status: true } } } } },
  }).catch(() => null);
  if (!u) return { kind: "company" };
  if (u.account_type === "admin" || u.role === "admin" || u.account_type === "lider" || u.role === "lider") return { kind: "internal" };
  if (u.account_type === "agencias" || u.role === "agency_admin" || u.role === "agency_user") {
    const st = u.agency_link?.partner_profile?.status ?? u.owned_agency?.partner_profile?.status ?? null;
    return { kind: "agency", is_partner: st === "active" };
  }
  return { kind: "company" };
}
