// Campos comerciais estruturados da versão do produto (universal: vale para todos os produtos).
// Regras:
//  • descrição curta ≤ 500 e completa ≤ 4000 (um único limite para tela, API e testes);
//  • conteúdo JÁ salvo acima do limite nunca é cortado em silêncio — só é rejeitado o que for ALTERADO para cima do limite;
//  • listas são ordenáveis (a ordem do array é a ordem de exibição);
//  • cada campo tem visibilidade interna / equipe / cliente; observações internas nunca são do cliente.

export const SUMMARY_MAX = 500;
export const FULL_DESCRIPTION_MAX = 4000;

export const VISIBILITIES = ["internal", "team", "client"] as const;
export type Visibility = (typeof VISIBILITIES)[number];

export const TEXT_FIELDS = {
  target_audience: { label: "Público-alvo", max: 1000, column: "target_audience", default: "client" },
  commercial_objective: { label: "Objetivo / promessa", max: 1000, column: "commercial_objective", default: "client" },
  scope: { label: "Escopo", max: 4000, column: "scope", default: "client" },
  results_disclaimer: { label: "Aviso de resultados não garantidos", max: 1000, column: "results_disclaimer", default: "client" },
  change_policy: { label: "Política de alterações", max: 2000, column: "change_policy", default: "client" },
  client_info: { label: "Informações que o cliente precisa fornecer", max: 4000, column: "client_info", default: "client" },
  internal_notes: { label: "Observações internas", max: 4000, column: "internal_notes", default: "internal" },
} as const;
export type TextFieldKey = keyof typeof TEXT_FIELDS;

export const LIST_FIELDS = {
  included_items: { label: "Itens incluídos", column: "included_items_json", default: "client" },
  excluded_items: { label: "Itens não incluídos", column: "excluded_items_json", default: "client" },
  client_requirements: { label: "Requisitos do cliente", column: "client_requirements_json", default: "client" },
  deliverables_summary: { label: "Resumo dos entregáveis", column: "deliverables_summary_json", default: "client" },
} as const;
export type ListFieldKey = keyof typeof LIST_FIELDS;

export const LIST_ITEM_MAX = 300;
export const LIST_MAX_ITEMS = 50;

export class CommercialFieldError extends Error {
  statusCode = 422;
  code: string;
  constructor(message: string, code = "commercial_field_invalid") { super(message); this.code = code; }
}

type Row = Record<string, unknown>;
const DEFAULT_VISIBILITY: Record<string, Visibility> = Object.fromEntries([
  ...Object.entries(TEXT_FIELDS).map(([k, v]) => [k, v.default as Visibility]),
  ...Object.entries(LIST_FIELDS).map(([k, v]) => [k, v.default as Visibility]),
  ["summary", "client"], ["full_description", "client"],
]);

export function readVisibility(json: string | null | undefined): Record<string, Visibility> {
  let parsed: Record<string, unknown> = {};
  try { parsed = json ? (JSON.parse(json) as Record<string, unknown>) : {}; } catch { parsed = {}; }
  const out: Record<string, Visibility> = { ...DEFAULT_VISIBILITY };
  for (const [k, v] of Object.entries(parsed)) if (k in DEFAULT_VISIBILITY && (VISIBILITIES as readonly string[]).includes(String(v))) out[k] = v as Visibility;
  out.internal_notes = "internal";
  return out;
}

export function readList(json: string | null | undefined): string[] {
  try {
    const v = json ? (JSON.parse(json) as unknown) : [];
    return Array.isArray(v) ? v.map((x) => String(x)).filter((x) => x.trim()) : [];
  } catch { return []; }
}

/** Normaliza uma lista vinda da API: texto aparado, sem itens vazios, sem duplicados exatos, com limites. */
export function normalizeList(label: string, raw: unknown): string[] {
  if (!Array.isArray(raw)) throw new CommercialFieldError(`"${label}" deve ser uma lista.`);
  const out: string[] = [];
  for (const item of raw) {
    const text = (typeof item === "string" ? item : (item as { text?: unknown })?.text ?? "").toString().trim();
    if (!text) continue;
    if (text.length > LIST_ITEM_MAX) throw new CommercialFieldError(`Um item de "${label}" passa de ${LIST_ITEM_MAX} caracteres.`, "list_item_too_long");
    if (!out.includes(text)) out.push(text);
  }
  if (out.length > LIST_MAX_ITEMS) throw new CommercialFieldError(`"${label}" aceita no máximo ${LIST_MAX_ITEMS} itens.`, "list_too_long");
  return out;
}

/** Limite de texto com regra de compatibilidade: valor que não mudou nunca é rejeitado (conteúdo antigo fica intacto). */
export function checkTextLimit(label: string, value: string | null | undefined, max: number, previous: string | null | undefined) {
  if (value == null) return;
  if (value.length > max && value !== (previous ?? null)) {
    throw new CommercialFieldError(`"${label}" passa de ${max} caracteres (${value.length}). Reduza o texto para salvar.`, "text_too_long");
  }
}

export interface CommercialInput {
  summary?: string | null; full_description?: string | null;
  deliverables?: string | null; // legado: texto solto → vira o resumo dos entregáveis (um item por linha)
  field_visibility?: Record<string, string> | null;
  [k: string]: unknown;
}

/** Converte o corpo da requisição em colunas da versão + a lista do que mudou (para o histórico). */
export function buildCommercialUpdate(input: CommercialInput, before: Row): { data: Row; changed: string[] } {
  const data: Row = {};
  const changed: string[] = [];
  checkTextLimit("Descrição curta", input.summary, SUMMARY_MAX, before.summary as string | null);
  checkTextLimit("Descrição completa", input.full_description, FULL_DESCRIPTION_MAX, before.full_description as string | null);
  for (const [key, def] of Object.entries(TEXT_FIELDS)) {
    if (input[key] === undefined) continue;
    const value = input[key] == null ? null : String(input[key]);
    checkTextLimit(def.label, value, def.max, before[def.column] as string | null);
    if ((value ?? null) !== ((before[def.column] as string | null) ?? null)) { data[def.column] = value; changed.push(def.label); }
  }
  const lists: Record<string, unknown> = { ...input };
  if (input.deliverables !== undefined && lists.deliverables_summary === undefined) {
    lists.deliverables_summary = (input.deliverables ?? "").split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  }
  for (const [key, def] of Object.entries(LIST_FIELDS)) {
    if (lists[key] === undefined) continue;
    const items = lists[key] == null ? [] : normalizeList(def.label, lists[key]);
    const json = items.length ? JSON.stringify(items) : null;
    if (json !== ((before[def.column] as string | null) ?? null)) { data[def.column] = json; changed.push(def.label); }
  }
  if (input.field_visibility) {
    const next = readVisibility(before.field_visibility_json as string | null);
    for (const [k, v] of Object.entries(input.field_visibility)) {
      if (!(k in DEFAULT_VISIBILITY)) throw new CommercialFieldError(`Campo desconhecido na visibilidade: ${k}.`, "visibility_unknown_field");
      if (!(VISIBILITIES as readonly string[]).includes(v)) throw new CommercialFieldError(`Visibilidade inválida para "${k}": use interna, equipe ou cliente.`, "visibility_invalid");
      if (k === "internal_notes" && v !== "internal") throw new CommercialFieldError("As observações internas nunca podem ser visíveis ao cliente ou à equipe.", "internal_notes_always_internal");
      next[k] = v as Visibility;
    }
    const json = JSON.stringify(next);
    if (json !== JSON.stringify(readVisibility(before.field_visibility_json as string | null))) { data.field_visibility_json = json; changed.push("Visibilidade dos campos"); }
  }
  return { data, changed };
}

/** Bloco completo para o editor / API de admin. */
export function serializeCommercialFields(v: Row) {
  const text: Record<string, string | null> = {};
  for (const [k, def] of Object.entries(TEXT_FIELDS)) text[k] = (v[def.column] as string | null) ?? null;
  const lists: Record<string, string[]> = {};
  for (const [k, def] of Object.entries(LIST_FIELDS)) lists[k] = readList(v[def.column] as string | null);
  return {
    ...text, ...lists,
    deliverables: lists.deliverables_summary.join("\n"),
    field_visibility: readVisibility(v.field_visibility_json as string | null),
    limits: { summary: SUMMARY_MAX, full_description: FULL_DESCRIPTION_MAX, list_item: LIST_ITEM_MAX, list_items: LIST_MAX_ITEMS, text: Object.fromEntries(Object.entries(TEXT_FIELDS).map(([k, d]) => [k, d.max])) },
  };
}

/** O que o cliente enxerga: só campos marcados como "cliente" — nunca observações internas. */
export function clientCommercialView(v: Row) {
  const vis = readVisibility(v.field_visibility_json as string | null);
  const out: Record<string, unknown> = {};
  for (const [k, def] of Object.entries(TEXT_FIELDS)) if (vis[k] === "client" && k !== "internal_notes") out[k] = (v[def.column] as string | null) ?? null;
  for (const [k, def] of Object.entries(LIST_FIELDS)) if (vis[k] === "client") out[k] = readList(v[def.column] as string | null);
  return out;
}

/** Colunas copiadas ao criar uma nova versão a partir da anterior. */
export function commercialCloneData(last: Row | null | undefined): Row {
  if (!last) return {};
  const cols = [...Object.values(TEXT_FIELDS).map((d) => d.column), ...Object.values(LIST_FIELDS).map((d) => d.column), "field_visibility_json"];
  return Object.fromEntries(cols.map((c) => [c, (last[c] as string | null) ?? null]));
}
