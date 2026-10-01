// Preço exibido: UMA regra, calculada no servidor, que diz QUAL valor é e DE ONDE vem (cadastro, prévia, simulação).
//   • comercial  — preço de venda fechado (configuração comercial completa);
//   • calculado  — mesmo cálculo do preço de venda, mas ainda há pendência comercial (ex.: prazo/ordem de taxas) — ainda NÃO vende;
//   • simulacao  — só quando o cálculo real não fecha: valores provisórios de teste, nunca preço de venda.
import type { PricingResult } from "./catalog2-pricing";

export interface PriceSummary { amount: number | null; source: "comercial" | "calculado" | "simulacao" | "indefinido"; explanation: string }

export function priceSummary(real: PricingResult, simulation?: PricingResult | null): PriceSummary {
  const amount = real.lines.commercial_final_price.amount;
  if (amount != null) {
    return real.commercial_ready
      ? { amount, source: "comercial", explanation: "Preço de venda do cenário padrão (opções padrão, sem adicionais, quantidade 1)." }
      : { amount, source: "calculado", explanation: `Mesmo cálculo do preço de venda no cenário padrão, mas ainda há pendência comercial (${[...real.quote_blockers, ...real.pending_info].slice(0, 2).join("; ") || "configuração incompleta"}) — ainda não pode ser vendido.` };
  }
  if (simulation && simulation.simulation.total != null) {
    return { amount: simulation.simulation.total, source: "simulacao", explanation: "Simulação com valores provisórios de teste — não é preço de venda. O preço real ainda depende de configuração comercial." };
  }
  return { amount: null, source: "indefinido", explanation: "Preço ainda não definido." };
}
