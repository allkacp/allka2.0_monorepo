// Constantes do novo catálogo (sprint de produtos). A partir do bloco 3/6
// este arquivo NÃO faz mais seed no boot (correção 1.2) — as classificações
// dinâmicas vêm de `catalog2-classifications-seed.ts` por comando explícito,
// e as 4 fases 4Fs vêm da migration. Aqui ficam só enums/rótulos.

// Reunião 2026-09-14 (Item 2 — "Status e disponibilidade dos produtos"):
// dois status novos (pre_lancamento, esgotado_temporariamente) entram na
// lista. Os 4 valores originais NUNCA mudam de literal salvo no banco (os
// 36 produtos reais e a fixture já usam esses valores) — só o RÓTULO em
// português exibido na UI foi renomeado pra bater com a nomenclatura da
// reunião (ver CATALOG2_STATUS_LABEL). Migration é só aditiva: nenhuma
// coluna muda de tipo, o campo já era string livre.
export const CATALOG2_STATUSES = [
  "em_preparacao",
  "pre_lancamento",
  "disponivel",
  "temporariamente_inativo",
  "esgotado_temporariamente",
  "arquivado",
] as const;
export type Catalog2Status = (typeof CATALOG2_STATUSES)[number];

// Rótulo em português exibido na UI (Admin e cliente). Distinto do literal
// salvo no banco — trocar o rótulo aqui NUNCA migra dado nenhum.
export const CATALOG2_STATUS_LABEL: Record<Catalog2Status, string> = {
  em_preparacao: "Em preparação",
  pre_lancamento: "Pré-lançamento",
  disponivel: "Ativo",
  temporariamente_inativo: "Pausado",
  esgotado_temporariamente: "Esgotado temporariamente",
  arquivado: "Inativo",
};

export const CATALOG2_STATUS_MEANING: Record<Catalog2Status, string> = {
  em_preparacao: "Disponível para administração e prévia interna; não aparece no catálogo do cliente nem é contratável.",
  pre_lancamento: "Visível no catálogo do cliente com etiqueta própria; contratação ainda bloqueada nesta etapa.",
  disponivel: "Visível e contratável quando atende às validações comerciais (preço e prazo comerciais completos).",
  temporariamente_inativo: "Continua visível no catálogo, com aviso; contratação temporariamente bloqueada.",
  esgotado_temporariamente: "Continua visível no catálogo, com aviso de indisponibilidade; contratação bloqueada.",
  arquivado: "Fora da listagem comercial comum; consultável pela administração e preservado no histórico.",
};

// Status em que o produto aparece no catálogo do CLIENTE — mesmo quando
// ainda não é contratável (pré-lançamento/pausado/esgotado mostram o
// produto com aviso; em_preparacao e arquivado nunca aparecem lá).
export const CATALOG2_CLIENT_VISIBLE_STATUSES: readonly Catalog2Status[] = [
  "pre_lancamento",
  "disponivel",
  "temporariamente_inativo",
  "esgotado_temporariamente",
];

// Único status que autoriza gerar cotação, adicionar à cesta ou contratar —
// ainda sujeito às validações comerciais reais (preço/prazo comerciais
// completos, zero pendência obrigatória — ver checkClientVisibility em
// catalog2-client.ts). Status não apaga nem substitui a prontidão comercial:
// um produto "Ativo" sem preço pronto continua bloqueado por
// commercial_ready, exatamente como antes desta mudança.
export const CATALOG2_CONTRACTABLE_STATUSES: readonly Catalog2Status[] = ["disponivel"];

// Mensagem exibida quando o produto é visível mas não pode ser contratado
// NESTE status — independe de o preço/prazo estarem prontos.
export const CATALOG2_STATUS_BLOCK_MESSAGE: Partial<Record<Catalog2Status, string>> = {
  em_preparacao: "produto ainda em preparação",
  pre_lancamento: "produto em pré-lançamento — contratação ainda não liberada",
  temporariamente_inativo: "oferta pausada temporariamente",
  esgotado_temporariamente: "produto esgotado temporariamente",
  arquivado: "produto fora do catálogo",
};

export const CATALOG2_EXECUTION_MODES = ["humano", "ia", "hibrido"] as const;
export type Catalog2ExecutionMode = (typeof CATALOG2_EXECUTION_MODES)[number];
