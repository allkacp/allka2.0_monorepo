// Tipos universais de ADICIONAL (2026-10-02). Padrão "checkbox" = comportamento histórico (liga/desliga).
//
//   checkbox       seleção simples (liga/desliga);
//   quantity       quantidade inteira (mínimo, máximo, incremento, unidade) com valor, minutos e prazo por unidade;
//   range          faixa de quantidade (escolhas com "de/até" e valor/minutos/prazo próprios);
//   quoted_value   valor informado pelo cliente: sempre vira solicitação de orçamento;
//   single_select  seleção única entre escolhas;
//   multi_select   seleção múltipla entre escolhas.
//
// Seleção: addon_keys (como sempre) + addon_selections { chave: { quantity?, value?, choice_keys? } }.
// Para "quantity" presente só em addon_keys, vale a quantidade mínima (ou 1).

export const ADDON_TYPES = ["checkbox", "quantity", "range", "quoted_value", "single_select", "multi_select"] as const;
export type AddonType = (typeof ADDON_TYPES)[number];
export const ADDON_TYPE_LABEL: Record<AddonType, string> = {
  checkbox: "Seleção simples",
  quantity: "Quantidade inteira",
  range: "Faixa de quantidade",
  quoted_value: "Valor informado para orçamento",
  single_select: "Seleção única",
  multi_select: "Seleção múltipla",
};
export const normalizeAddonType = (v: string | null | undefined): AddonType => ((ADDON_TYPES as readonly string[]).includes(v ?? "") ? (v as AddonType) : "checkbox");

export interface AddonSelection { quantity?: number; value?: number; choice_keys?: string[] }

export interface AddonLike {
  key: string; name: string; is_active: boolean; addon_type?: string | null;
  qty_min?: number | null; qty_max?: number | null; qty_step?: number | null; unit_label?: string | null;
  unit_base_cost?: number | null; unit_minutes?: number | null; unit_deadline_days?: number | null; auto_quote_limit?: number | null;
  choices?: Array<{ key: string; label: string; is_active: boolean; is_default?: boolean; base_cost?: number | null; minutes?: number | null; deadline_days?: number | null; qty_from?: number | null; qty_to?: number | null; requires_quote?: boolean }>;
}

export interface NormalizedAddon {
  addon: AddonLike;
  type: AddonType;
  /** Quantidade efetiva (1 para seleção simples). */
  quantity: number;
  value: number | null;
  choices: NonNullable<AddonLike["choices"]>;
  /** Passou do limite de orçamento automático, é valor informado ou escolha que exige orçamento. */
  requiresQuote: string | null;
}

export interface AddonIssue { code: string; message: string; ref: string }

/** Lê a seleção de adicionais (addon_keys + addon_selections) e devolve o que realmente vale, com problemas explícitos. */
export function normalizeAddonSelections(addons: AddonLike[], sel: { addon_keys?: string[]; addon_selections?: Record<string, AddonSelection> }): { chosen: NormalizedAddon[]; issues: AddonIssue[] } {
  const issues: AddonIssue[] = [];
  const chosen: NormalizedAddon[] = [];
  const byKey = new Map(addons.map((a) => [a.key, a]));
  const keys = new Set<string>([...(sel.addon_keys ?? []), ...Object.keys(sel.addon_selections ?? {})]);
  for (const key of keys) {
    const a = byKey.get(key);
    if (!a) { issues.push({ code: "addon_unknown", message: `O adicional "${key}" não existe nesta versão.`, ref: key }); continue; }
    if (!a.is_active) { issues.push({ code: "addon_inactive", message: `O adicional "${a.name}" está inativo.`, ref: key }); continue; }
    const type = normalizeAddonType(a.addon_type);
    const raw = sel.addon_selections?.[key] ?? {};
    const choices = (a.choices ?? []).filter((c) => c.is_active !== false);
    let quantity = 1;
    let value: number | null = null;
    let requiresQuote: string | null = null;
    let picked: NonNullable<AddonLike["choices"]> = [];

    if (type === "quantity") {
      const min = a.qty_min ?? 1, max = a.qty_max ?? null, step = Math.max(1, a.qty_step ?? 1);
      const q = raw.quantity != null ? Number(raw.quantity) : min;
      if (!Number.isInteger(q) || q < 1) { issues.push({ code: "addon_quantity_invalid", message: `Informe uma quantidade inteira para "${a.name}".`, ref: key }); continue; }
      if (q < min) { issues.push({ code: "addon_quantity_min", message: `"${a.name}": a quantidade mínima é ${min}.`, ref: key }); continue; }
      if (max != null && q > max) { issues.push({ code: "addon_quantity_max", message: `"${a.name}": a quantidade máxima é ${max}.`, ref: key }); continue; }
      if ((q - min) % step !== 0) { issues.push({ code: "addon_quantity_step", message: `"${a.name}": a quantidade deve variar de ${step} em ${step} a partir de ${min}.`, ref: key }); continue; }
      quantity = q;
      if (a.auto_quote_limit != null && q > a.auto_quote_limit) requiresQuote = `"${a.name}" acima de ${a.auto_quote_limit} ${a.unit_label ?? "unidade(s)"}: exige orçamento personalizado.`;
    } else if (type === "range") {
      const q = raw.quantity != null ? Number(raw.quantity) : NaN;
      if (!Number.isInteger(q) || q < 1) { issues.push({ code: "addon_quantity_invalid", message: `Informe a quantidade de "${a.name}".`, ref: key }); continue; }
      const band = choices.find((c) => (c.qty_from == null || q >= c.qty_from) && (c.qty_to == null || q <= c.qty_to));
      if (!band) { issues.push({ code: "addon_range_out", message: `"${a.name}": nenhuma faixa cobre a quantidade ${q}.`, ref: key }); continue; }
      quantity = q; picked = [band];
      if (band.requires_quote) requiresQuote = `"${a.name}" na faixa "${band.label}": exige orçamento personalizado.`;
    } else if (type === "quoted_value") {
      const v = raw.value != null ? Number(raw.value) : NaN;
      if (!Number.isFinite(v) || v <= 0) { issues.push({ code: "addon_value_invalid", message: `Informe o valor para "${a.name}".`, ref: key }); continue; }
      value = v;
      requiresQuote = `"${a.name}" é um valor informado: exige orçamento personalizado.`;
    } else if (type === "single_select" || type === "multi_select") {
      const ks = raw.choice_keys ?? choices.filter((c) => c.is_default).map((c) => c.key);
      const known = new Set(choices.map((c) => c.key));
      const bad = ks.find((k) => !known.has(k));
      if (bad) { issues.push({ code: "addon_choice_unknown", message: `"${a.name}": a escolha "${bad}" não existe ou está inativa.`, ref: key }); continue; }
      if (ks.length === 0) { issues.push({ code: "addon_choice_missing", message: `Escolha uma opção para "${a.name}".`, ref: key }); continue; }
      if (type === "single_select" && ks.length > 1) { issues.push({ code: "addon_choice_many", message: `"${a.name}" aceita apenas uma escolha.`, ref: key }); continue; }
      picked = choices.filter((c) => ks.includes(c.key));
      const q = picked.find((c) => c.requires_quote);
      if (q) requiresQuote = `"${a.name}" — "${q.label}": exige orçamento personalizado.`;
    }
    chosen.push({ addon: a, type, quantity, value, choices: picked, requiresQuote });
  }
  return { chosen, issues };
}
