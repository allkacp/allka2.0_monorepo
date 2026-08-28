// Constantes do novo catálogo (sprint de produtos). A partir do bloco 3/6
// este arquivo NÃO faz mais seed no boot (correção 1.2) — as classificações
// dinâmicas vêm de `catalog2-classifications-seed.ts` por comando explícito,
// e as 4 fases 4Fs vêm da migration. Aqui ficam só enums/rótulos.

export const CATALOG2_STATUSES = [
  "em_preparacao",
  "disponivel",
  "temporariamente_inativo",
  "arquivado",
] as const;
export type Catalog2Status = (typeof CATALOG2_STATUSES)[number];

export const CATALOG2_STATUS_MEANING: Record<Catalog2Status, string> = {
  em_preparacao: "Ainda sem versão publicada — não aparece para o cliente.",
  disponivel: "Tem versão publicada e está ofertável.",
  temporariamente_inativo: "Tem versão publicada, mas a oferta está suspensa (volta sem nova versão).",
  arquivado: "Fora do catálogo. Histórico preservado; não é reofertado.",
};

export const CATALOG2_EXECUTION_MODES = ["humano", "ia", "hibrido"] as const;
export type Catalog2ExecutionMode = (typeof CATALOG2_EXECUTION_MODES)[number];
