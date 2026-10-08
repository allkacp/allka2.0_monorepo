// P-12 (08/10): NÃO existe mais dado provisório inventado (preço, prazo, imagem, tarefas, selo). Produto sem preço mostra "a definir"; sem imagem
// mostra um espaço neutro. Este arquivo guarda só os rótulos reais dos selos comerciais definidos pelo Admin Master.
const MERCH_KINDS = ["novo", "lancamento", "promocao", "destaque"] as const;
export type MerchBadgeKind = (typeof MERCH_KINDS)[number];
export const MERCH_KIND_LABEL: Record<MerchBadgeKind, string> = {
  novo: "Novo", lancamento: "Lançamento", promocao: "Promoção", destaque: "Destaque",
};
