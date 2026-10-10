// Avaliação de produto pelos nômades habilitados. A fonte antiga era uma tabela de dados FALSOS (mock) de produtos do catálogo antigo (PA0001, DC0001…)
// que ia dentro do pacote de todo usuário e nunca casava com os produtos reais (ids do catálogo novo). Enquanto não houver avaliação real vinda do
// servidor, o resultado correto é "sem avaliação" (0 nômades, nota 0).
export function computeProductRating(_productId: string): { rating: number; count: number; totalDeliveries: number } {
  return { rating: 0, count: 0, totalDeliveries: 0 };
}
