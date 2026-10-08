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

export interface AudienceViewer { kind: "company" | "agency" | "internal"; is_partner?: boolean; agency_level?: string | null }
export interface AudienceProduct { visibility_mode?: string | null; visibility_agency_levels?: string | null }

// Níveis de agência (D-1, reunião 07/10): o produto pode ser exibido para todos os níveis ou só para alguns (ex.: só Gold). Só limita AGÊNCIAS.
// As opções são os níveis CADASTRADOS em Administração > Níveis Agências (tabela partner_levels); o vínculo é pelo nome em minúsculas
// (o mesmo valor guardado em Agency.partner_level). Cadastrou um nível novo → ele aparece sozinho aqui.
export const DEFAULT_AGENCY_LEVEL_KEYS = ["bronze", "silver", "gold", "platinum", "diamond"];
export const levelKey = (v: string | null | undefined) => (v ?? "").replace(/,/g, " ").trim().toLowerCase();
export interface RegisteredLevel { key: string; name: string; sort_order: number }
/** Níveis cadastrados, na ordem do cadastro. Se não houver nenhum (ambiente novo), usa os cinco padrão. */
export async function loadRegisteredLevels(): Promise<RegisteredLevel[]> {
  const rows = await prisma.partnerLevel.findMany({ orderBy: { sort_order: "asc" }, select: { name: true, sort_order: true } }).catch(() => []);
  const list = rows.map((r) => ({ key: levelKey(r.name), name: r.name, sort_order: r.sort_order })).filter((r) => r.key);
  return list.length ? list : DEFAULT_AGENCY_LEVEL_KEYS.map((k, i) => ({ key: k, name: k.charAt(0).toUpperCase() + k.slice(1), sort_order: i + 1 }));
}
/** Guardado como ",gold,platinum," (com vírgulas nas pontas) para a busca por nível não confundir "gold" com "rose gold". */
export function parseAgencyLevels(raw: string | null | undefined): string[] {
  return Array.from(new Set((raw ?? "").split(",").map(levelKey).filter(Boolean)));
}
/** Mantém só níveis cadastrados; nenhum ou todos marcados = sem restrição (null). */
export function serializeAgencyLevels(levels: readonly string[] | null | undefined, validKeys: readonly string[]): string | null {
  const wanted = new Set((levels ?? []).map(levelKey));
  const list = validKeys.filter((k) => wanted.has(k));
  return list.length === 0 || list.length === validKeys.length ? null : `,${list.join(",")},`;
}
export function validateAgencyLevels(levels: readonly string[], validKeys: readonly string[]): string | null {
  for (const l of levels) if (!validKeys.includes(levelKey(l))) return `Nível de agência não cadastrado: ${l}.`;
  return null;
}

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

/** Regra completa: público (company/agency/partner/interno) E, para agências, o nível da agência. */
export function productVisibleTo(product: AudienceProduct, viewer: AudienceViewer | null | undefined): boolean {
  const levels = parseAgencyLevels(product.visibility_agency_levels);
  if (levels.length && viewer?.kind === "agency" && !levels.includes(levelKey(viewer.agency_level) || "bronze")) return false;
  return audienceAllows(product, viewer);
}

/** Filtro para a listagem do catálogo (o mesmo critério de audienceAllows, em forma de consulta). `null` = sem filtro (equipe interna). */
export function audienceWhere(viewer: AudienceViewer): Record<string, unknown> | null {
  if (viewer.kind === "internal") return null;
  const has = (t: AudienceToken) => ({ visibility_mode: { contains: t } });
  if (viewer.kind === "company") return { OR: [{ visibility_mode: "all" }, has("company")] };
  const level = levelKey(viewer.agency_level) || "bronze";
  return {
    AND: [
      { OR: [{ visibility_mode: "all" }, viewer.is_partner ? has("partner") : has("agency")] },
      { OR: [{ visibility_agency_levels: null }, { visibility_agency_levels: "" }, { visibility_agency_levels: { contains: `,${level},` } }] },
    ],
  };
}

/** Visualizador a partir do contexto do catálogo do cliente. */
export function viewerFromContext(ctx: { kind: string; always_sees_all_products?: boolean; agency_is_partner?: boolean; agency_level?: string | null }): AudienceViewer {
  if (ctx.always_sees_all_products || ctx.kind === "admin" || ctx.kind === "leader") return { kind: "internal" };
  if (ctx.kind === "agency") return { kind: "agency", is_partner: !!ctx.agency_is_partner, agency_level: ctx.agency_level ?? null };
  return { kind: "company" };
}

/** Visualizador de um usuário (IA e outros pontos que só têm o id). */
export async function loadAudienceViewer(userId: string): Promise<AudienceViewer> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { account_type: true, role: true, agency_link: { select: { partner_level: true, partner_profile: { select: { status: true } } } }, owned_agency: { select: { partner_level: true, partner_profile: { select: { status: true } } } } },
  }).catch(() => null);
  if (!u) return { kind: "company" };
  if (u.account_type === "admin" || u.role === "admin" || u.account_type === "lider" || u.role === "lider") return { kind: "internal" };
  if (u.account_type === "agencias" || u.role === "agency_admin" || u.role === "agency_user") {
    const st = u.agency_link?.partner_profile?.status ?? u.owned_agency?.partner_profile?.status ?? null;
    return { kind: "agency", is_partner: st === "active", agency_level: u.agency_link?.partner_level ?? u.owned_agency?.partner_level ?? null };
  }
  return { kind: "company" };
}
