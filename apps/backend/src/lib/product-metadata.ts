/**
 * Product.metadata é um JSON livre ("extras do frontend") — este helper só
 * cobre os campos que o backend precisa ler pra congelar snapshot no
 * ProjectProduct (limite de alterações grátis + taxa emergencial). Não tenta
 * tipar o resto do metadata (apresentação, pricing calc etc.), que o
 * frontend já trata em lib/product-adapter.ts.
 */
export interface AllkaProductMetadata {
  alteracoesIncluidas?: number;
  valorAlteracaoExtra?: number;
  taxaEmergencialReducaoPercentual?: number;
}

export function parseProductMetadata(raw: string | null | undefined): AllkaProductMetadata {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}
