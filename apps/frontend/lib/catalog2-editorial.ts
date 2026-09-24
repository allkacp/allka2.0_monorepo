/**
 * Arte editorial do Cadastro de Produtos.
 *
 * As imagens são assets próprios do projeto, criados para a Allka em
 * 2026-09. Elas apresentam a categoria na listagem sem substituir a imagem
 * cadastrada no banco: a imagem original continua disponível no detalhe do
 * produto e serve de fallback se algum novo asset não puder ser carregado.
 */

function normalized(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function catalog2EditorialImage(category?: string | null, productName?: string | null) {
  const subject = `${normalized(category)} ${normalized(productName)}`;

  if (/(automacao|automacao|venda|crm|whatsapp|funil|atendimento)/.test(subject)) {
    return "/images/catalog2/editorial/automation-v1.png";
  }
  if (/(marketing|trafego|campanha|rede social|social media|performance|ads|seo)/.test(subject)) {
    return "/images/catalog2/editorial/marketing-v1.png";
  }
  if (/(site|web|desenvolvimento|e-commerce|ecommerce|loja virtual|tecnologia)/.test(subject)) {
    return "/images/catalog2/editorial/web-v1.png";
  }
  if (/(design|identidade|branding|marca|criativ)/.test(subject)) {
    return "/images/catalog2/editorial/design-v1.png";
  }
  return "/images/catalog2/editorial/education-v1.png";
}

export function catalog2CategoryTone(category?: string | null) {
  const subject = normalized(category);
  if (/(automacao|automacao|venda|crm|whatsapp|funil|atendimento)/.test(subject)) return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (/(marketing|trafego|campanha|rede social|social media|performance|ads|seo)/.test(subject)) return "bg-rose-50 text-rose-700 ring-rose-100";
  if (/(site|web|desenvolvimento|e-commerce|ecommerce|loja virtual|tecnologia)/.test(subject)) return "bg-blue-50 text-blue-700 ring-blue-100";
  if (/(design|identidade|branding|marca|criativ)/.test(subject)) return "bg-violet-50 text-violet-700 ring-violet-100";
  return "bg-amber-50 text-amber-700 ring-amber-100";
}
