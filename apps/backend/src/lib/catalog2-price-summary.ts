// Preço exibido: UMA regra, calculada no servidor, que diz QUAL valor é e DE ONDE vem.
// FONTE ÚNICA (2026-10-02): sempre a regra real de preço (Catalog2PricingSettings + valor/hora das especialidades).
//   • comercial       — preço de venda fechado (configuração comercial completa);
//   • calculado       — mesmo cálculo do preço de venda, mas ainda há pendência comercial (ex.: prazo) — ainda NÃO vende;
//   • simulacao       — preço real ainda pendente (ex.: custo de IA indefinido): valor ILUSTRATIVO com as MESMAS regras reais,
//                       dizendo o que falta. Nunca usa valores provisórios de outra configuração;
//   • sob_solicitacao — a seleção exige orçamento personalizado / análise comercial / contratação assistida: sem preço definitivo.
import type { PricingResult } from "./catalog2-pricing";
import { REQUEST_KIND_LABEL } from "./catalog2-availability";

export interface PriceSummary {
  amount: number | null;
  source: "comercial" | "calculado" | "simulacao" | "sob_solicitacao" | "indefinido";
  explanation: string;
  /** Versão da regra de preço usada (a mesma memória de cálculo). */
  rule_version: number | null;
}

/** O 2º parâmetro é mantido só por compatibilidade com chamadores antigos: não existe mais "simulação provisória". */
export function priceSummary(real: PricingResult, _legacy?: PricingResult | null): PriceSummary {
  const rule_version = real.rule?.version ?? null;
  if (real.price_status === "custom_quote" || real.price_status === "commercial_review" || real.price_status === "assisted_only") {
    return { amount: null, source: "sob_solicitacao", explanation: `${REQUEST_KIND_LABEL[real.price_status] ?? "Solicitação comercial"}: ${real.quote_requirements.map((r) => r.message).join(" ")}`, rule_version };
  }
  const amount = real.lines.commercial_final_price.amount;
  if (amount != null) {
    return real.commercial_ready
      ? { amount, source: "comercial", explanation: "Preço de venda do cenário padrão (opções padrão, sem adicionais, quantidade 1).", rule_version }
      : { amount, source: "calculado", explanation: `Mesmo cálculo do preço de venda no cenário padrão, mas ainda há pendência comercial (${[...real.quote_blockers, ...real.pending_info].slice(0, 2).join("; ") || "configuração incompleta"}) — ainda não pode ser vendido.`, rule_version };
  }
  if (real.simulation.total != null && real.simulation_provenance.commercial_config === "real") {
    return { amount: real.simulation.total, source: "simulacao", explanation: `Valor ilustrativo calculado com as regras reais de preço (versão ${rule_version ?? "—"}); ainda falta definir: ${real.pending_info.join("; ") || "configuração comercial"}. Não é preço de venda.`, rule_version };
  }
  return { amount: null, source: "indefinido", explanation: "Preço ainda não definido.", rule_version };
}
