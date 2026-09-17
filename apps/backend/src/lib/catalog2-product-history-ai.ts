// Item 7 (reunião 2026-09-14, "Histórico de alterações do produto") —
// resumo automático por IA de um trecho do histórico já registrado.
//
// Reaproveita a MESMA integração de IA já usada em ai-consultor.ts/iallka.ts
// (@google/genai, mesmo modelo, mesmo padrão de contabilização via
// ai-usage-tracker) — nenhum cliente/SDK novo. O registro original
// (Catalog2ProductHistoryEvent + os mecanismos mesclados) SEMPRE existe
// independente da IA — este módulo só lê descrições JÁ determinísticas e
// pede um resumo em texto corrido; nunca envia before/after bruto nem
// qualquer campo interno (custo, margem etc.) — só o texto já sanitizado
// que o próprio histórico expõe ao admin.
import { GoogleGenAI } from "@google/genai";
import { recordAIUsage, usageFromGeminiResponse } from "./ai-usage-tracker";
import type { UnifiedCatalog2HistoryEvent } from "./catalog2-product-history";

const MODEL = "gemini-2.5-flash";
const MAX_EVENTS_IN_PROMPT = 50;

export interface Catalog2HistorySummaryResult {
  summary: string | null;
  /** ids dos eventos realmente usados como base do resumo — a interface
   * mantém acesso a eles mesmo depois de mostrar o texto gerado. */
  based_on_event_ids: string[];
  unavailable_reason: string | null;
}

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "CHANGE_ME") {
    throw new Error("GEMINI_API_KEY não configurada no backend (.env)");
  }
  if (!client) client = new GoogleGenAI({ apiKey });
  return client;
}

/**
 * Gera um resumo em texto corrido de uma lista de eventos de histórico JÁ
 * DETERMINÍSTICOS (nunca gera o registro em si — só resume o que já foi
 * escrito). Nunca lança: qualquer falha (IA indisponível, sem chave, erro
 * de rede) devolve `summary: null` com o motivo em `unavailable_reason` —
 * o histórico (a lista de eventos) continua 100% utilizável sem isto.
 *
 * Nunca faz chamada real em ambiente de teste — `TEST_DATABASE_URL` é o
 * sinal já usado por toda a suíte de integração pra indicar esse contexto
 * (toda suíte chama `requireTestDatabaseUrl()`); reaproveitado aqui como
 * trava explícita contra qualquer chamada paga real durante os testes,
 * mesmo que uma chave real esteja configurada no `.env` local.
 */
export async function summarizeCatalog2ProductHistory(
  productName: string,
  events: UnifiedCatalog2HistoryEvent[],
): Promise<Catalog2HistorySummaryResult> {
  if (events.length === 0) {
    return { summary: null, based_on_event_ids: [], unavailable_reason: "sem eventos para resumir" };
  }
  if (process.env.TEST_DATABASE_URL) {
    return { summary: null, based_on_event_ids: [], unavailable_reason: "resumo por IA desativado em ambiente de teste (nunca chamada paga real nos testes)" };
  }

  const slice = events.slice(0, MAX_EVENTS_IN_PROMPT);
  const eventIds = slice.map((e) => e.id);
  // Só o texto já determinístico e sanitizado — nunca before/after brutos,
  // nunca id interno, nunca campo de custo/margem (o histórico em si já
  // nunca registra esse tipo de dado, ver descrições geradas nas rotas).
  const lines = slice
    .map((e) => `- [${e.created_at.toISOString().slice(0, 10)}] ${e.description}`)
    .join("\n");

  const prompt = `Você resume o histórico de alterações de um produto do catálogo pra um administrador. Escreva um resumo em português, corrido, de no máximo 4 frases, agrupando alterações parecidas. Baseie-se ESTRITAMENTE na lista abaixo — nunca invente nem infira nada que não esteja escrito nela.

Produto: ${productName}

Alterações (mais recente primeiro):
${lines}

Devolva só o texto do resumo, sem preâmbulo, sem markdown.`;

  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: { temperature: 0.3 },
    });
    await recordAIUsage({ model: MODEL, feature: "catalog2-history-summary", ...usageFromGeminiResponse(response) });
    const text = (response.text ?? "").trim();
    if (!text) return { summary: null, based_on_event_ids: eventIds, unavailable_reason: "a IA não retornou texto" };
    return { summary: text, based_on_event_ids: eventIds, unavailable_reason: null };
  } catch (err) {
    console.error("[catalog2-product-history-ai] falha ao gerar resumo", err);
    return { summary: null, based_on_event_ids: eventIds, unavailable_reason: "não foi possível gerar o resumo por IA agora — o histórico continua disponível normalmente" };
  }
}
