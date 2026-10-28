// Texto gerado pela IA NUNCA pode sair cortado no meio (ex.: "melhorar descrição" que parava sem fim).
// Duas proteções, ambas independentes do modelo:
//  1. se a resposta parou por limite de saída (MAX_TOKENS), pede para CONTINUAR de onde parou até o texto terminar;
//  2. se o texto passou do máximo (ou ficou abaixo do mínimo) do campo, pede para CONDENSAR (ou ampliar) mantendo o fim completo —
//     nunca se corta o texto "na tesoura".

export interface GenResult { text: string; finishReason?: string | null }
export type GenFn = (contents: string) => Promise<GenResult>;
export interface TextLimits { minWords?: number | null; maxWords?: number | null; minChars?: number | null; maxChars?: number | null }

export const countWords = (s: string): number => s.trim().split(/\s+/).filter(Boolean).length;
const hitOutputLimit = (r: GenResult) => /MAX_TOKENS|LENGTH/i.test(String(r.finishReason ?? ""));

export type LimitState = "ok" | "over" | "under";
/** Compara o texto com os limites do campo (palavras e caracteres). */
export function limitState(text: string, lim: TextLimits): LimitState {
  const w = countWords(text);
  const c = text.trim().length;
  if ((lim.maxWords && w > lim.maxWords) || (lim.maxChars && c > lim.maxChars)) return "over";
  if ((lim.minWords && w < lim.minWords) || (lim.minChars && c < lim.minChars)) return "under";
  return "ok";
}

/** Descreve os limites em português (para o pedido à IA e para as mensagens). */
export function limitsText(lim: TextLimits): string {
  return [
    lim.minWords ? `no mínimo ${lim.minWords} palavras` : null,
    lim.maxWords ? `no máximo ${lim.maxWords} palavras` : null,
    lim.minChars ? `no mínimo ${lim.minChars} caracteres` : null,
    lim.maxChars ? `no máximo ${lim.maxChars} caracteres` : null,
  ].filter(Boolean).join(", ");
}

/** Gera o texto e, se a resposta parou por limite de saída, continua de onde parou (até `maxContinuations` vezes). */
export async function completeWithoutCutting(gen: GenFn, contents: string, maxContinuations = 4): Promise<{ text: string; stillCut: boolean }> {
  let r = await gen(contents);
  let text = (r.text ?? "").trim();
  let n = 0;
  while (hitOutputLimit(r) && n < maxContinuations) {
    n += 1;
    r = await gen(
      `${contents}\n\n=== O TEXTO QUE VOCÊ JÁ ESCREVEU (a resposta foi interrompida no meio) ===\n${text}\n=== FIM ===\n\n` +
        "CONTINUE exatamente de onde parou, sem repetir nada do que já está escrito e sem comentários. Termine o texto com um fechamento completo (a última frase tem que estar inteira).",
    );
    const more = (r.text ?? "").trim();
    if (!more) break;
    text = `${text}${/[\s]$/.test(text) || /^[\s.,;:!?)]/.test(more) ? "" : " "}${more}`.trim();
  }
  return { text, stillCut: hitOutputLimit(r) };
}

/**
 * Garante que o texto cabe nos limites SEM cortar: acima do máximo → a IA condensa/resume mantendo todas as informações essenciais e o fechamento;
 * abaixo do mínimo → a IA amplia. Até `rounds` tentativas. Devolve também avisos em linguagem simples quando não foi possível.
 */
export async function fitToLimits(gen: GenFn, text: string, lim: TextLimits, rounds = 2): Promise<{ text: string; notes: string[] }> {
  const notes: string[] = [];
  let current = text;
  for (let i = 0; i < rounds; i++) {
    const st = limitState(current, lim);
    if (st === "ok") return { text: current, notes };
    const ask = st === "over"
      ? `O texto abaixo passou do limite (${limitsText(lim)}). Reescreva-o para caber no limite, CONDENSANDO e resumindo (nunca cortando o final): mantenha todas as informações essenciais, a estrutura e um fechamento completo. Devolva só o texto reescrito.`
      : `O texto abaixo ficou menor que o mínimo (${limitsText(lim)}). Amplie-o com detalhes coerentes e verdadeiros até atingir o mínimo, sem repetir ideias, mantendo um fechamento completo. Devolva só o texto ampliado.`;
    const { text: next } = await completeWithoutCutting(gen, `${ask}\n\n"""\n${current}\n"""`);
    if (!next.trim()) break;
    current = next;
  }
  const finalState = limitState(current, lim);
  if (finalState === "over") notes.push(`O texto ficou com ${countWords(current)} palavras e ${current.trim().length} caracteres, acima do limite (${limitsText(lim)}). Nada foi cortado: gere de novo ou aumente o limite.`);
  if (finalState === "under") notes.push(`O texto ficou com ${countWords(current)} palavras e ${current.trim().length} caracteres, abaixo do mínimo (${limitsText(lim)}). Gere de novo ou diminua o mínimo.`);
  return { text: current, notes };
}
