// Allkoin é a MOEDA da plataforma: todo saldo (carteira de empresa, agência, parceiro, nômade…) aparece em Allkoins, nunca em reais.
// Escreve-se como dinheiro, igual a reais, só trocando o símbolo: "AK$ 1.000,00". Hoje 1 Allkoin = R$ 1,00. O banco guarda o número na mesma
// escala (campo `balance`, `*_brl`), então a conversão é só esta taxa — se um dia o valor mudar, é só trocar ALLKOIN_BRL_RATE aqui.
// Recarga por Pix/boleto/cartão, comissão, brinde… tudo entra como Allkoins.
// Preço de PRODUTO continua em reais na vitrine (`R$ 10,00`) e mostra o valor em Allkoins ao passar o mouse (ver price-with-allkoins.tsx) —
// por enquanto é assim; mais adiante a ordem se inverte. Saldo e movimentação de carteira são sempre Allkoins.
export const ALLKOIN_BRL_RATE = 1; // R$ por 1 Allkoin
export const ALLKOIN_SYMBOL = "AK$";

/** Converte um valor guardado (escala em reais) para Allkoins. */
export function toAllkoins(brl: number | null | undefined): number {
  const n = Number(brl);
  return Number.isFinite(n) ? n / ALLKOIN_BRL_RATE : 0;
}

/** Converte Allkoins digitados pelo usuário para a escala guardada. */
export function fromAllkoins(ak: number): number {
  return ak * ALLKOIN_BRL_RATE;
}

const MONEY = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const REAIS = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** "R$ 1.000,00" — o valor em reais (escala guardada). */
export function fmtReais(brl: number | null | undefined): string {
  const n = Number(brl);
  return REAIS.format(Number.isFinite(n) ? n : 0);
}

/**
 * Os DOIS valores, em todo lugar da plataforma: Allkoin primeiro e o real entre parênteses — "AK$ 1.000,00 (R$ 1.000,00)".
 * Hoje 1 AK$ = R$ 1,00, então os números são iguais; quando a taxa mudar, cada um mostra o seu.
 */
export function fmtAllkoinsBoth(brl: number | null | undefined): string {
  return `${fmtAllkoins(brl)} (${fmtReais(brl)})`;
}

/**
 * "AK$ 1.000,00" — símbolo na frente, sempre com 2 casas (como R$). Negativo: "-AK$ 50,00".
 * Com "number" devolve só "1.000,00" (quando o símbolo já está escrito ao lado).
 */
export function fmtAllkoins(brl: number | null | undefined, style?: "number"): string {
  const ak = toAllkoins(brl);
  const n = MONEY.format(Math.abs(ak));
  if (style === "number") return `${ak < 0 ? "-" : ""}${n}`;
  return `${ak < 0 ? "-" : ""}${ALLKOIN_SYMBOL} ${n}`;
}
