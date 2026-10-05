// Disponibilidade universal de uma OPÇÃO de variação (2026-10-02). Padrão "auto" = comportamento histórico.
//
//   auto               compra automática permitida;
//   commercial_review  exige análise comercial antes de contratar (gera solicitação, não cotação automática);
//   custom_quote       exige orçamento personalizado: a opção continua visível e selecionável, o preço automático NÃO é definitivo,
//                      o botão vira "Solicitar orçamento" e a contratação automática é bloqueada no servidor;
//   unavailable        indisponível temporariamente: visível, mas não selecionável (a API recusa, nunca ignora em silêncio);
//   assisted_only      somente contratação assistida (atendimento comercial), nunca automática.

export const OPTION_AVAILABILITY = ["auto", "commercial_review", "custom_quote", "unavailable", "assisted_only"] as const;
export type OptionAvailability = (typeof OPTION_AVAILABILITY)[number];

export const OPTION_AVAILABILITY_LABEL: Record<OptionAvailability, string> = {
  auto: "Compra automática permitida",
  commercial_review: "Exigir análise comercial",
  custom_quote: "Exigir orçamento personalizado",
  unavailable: "Indisponível temporariamente",
  assisted_only: "Somente contratação assistida",
};

export const normalizeAvailability = (v: string | null | undefined): OptionAvailability =>
  (OPTION_AVAILABILITY as readonly string[]).includes(v ?? "") ? (v as OptionAvailability) : "auto";

/** Quais disponibilidades obrigam a passar por uma solicitação comercial (em vez de contratar sozinho). */
export const REQUIRES_COMMERCIAL_REQUEST: readonly OptionAvailability[] = ["commercial_review", "custom_quote", "assisted_only"];

export const REQUEST_KIND_LABEL: Record<string, string> = {
  custom_quote: "Orçamento personalizado",
  commercial_review: "Análise comercial",
  assisted_only: "Contratação assistida",
};

export interface QuoteRequirement {
  /** custom_quote | commercial_review | assisted_only */
  kind: string;
  /** Origem: "variação:chave/opção" ou "adicional:chave". */
  from: string;
  label: string;
  message: string;
}

/** O tipo mais restritivo entre vários (orçamento personalizado > assistida > análise). */
export function strongestRequirement(reqs: QuoteRequirement[]): string | null {
  const rank = ["custom_quote", "assisted_only", "commercial_review"];
  for (const k of rank) if (reqs.some((r) => r.kind === k)) return k;
  return null;
}
