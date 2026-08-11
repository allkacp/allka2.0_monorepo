// Controle de custo de IA (admin > Configurações > "Uso e Custos de IA").
// Registra cada chamada real ao Gemini (tokens + custo estimado) numa tabela
// própria — não existe API de billing em tempo real pela chave de API que
// usamos hoje, então o custo é sempre CALCULADO aqui a partir dos tokens que
// a própria resposta do Gemini devolve × o preço configurado em
// AIModelPricing (editável pelo admin — os valores iniciais abaixo são só
// uma estimativa de partida).
import { prisma } from "./prisma";

export const GEMINI_SERVICE_KEY = "gemini";

// Preços de partida (USD por 1.000.000 de tokens) — ajustáveis na tela.
// Fonte: tabela pública de preços do Gemini API no momento da implementação;
// o Google pode mudar isso a qualquer momento, por isso é editável e não
// hardcoded no cálculo (só usado pra semear a primeira linha de cada modelo).
const DEFAULT_PRICING: Record<string, { input: number; output: number }> = {
  "gemini-2.5-flash": { input: 0.3, output: 2.5 },
  "gemini-2.5-flash-image": { input: 0.3, output: 30 },
};

/** Cria o AIServiceConfig "gemini" e semeia o preço de partida dos modelos
 * conhecidos — idempotente, chamado uma vez na subida do servidor. Preço já
 * configurado pelo admin nunca é sobrescrito (upsert só cria, não atualiza
 * update:{}). */
export async function ensureDefaultAIServices(): Promise<void> {
  const service = await prisma.aIServiceConfig.upsert({
    where: { key: GEMINI_SERVICE_KEY },
    update: {},
    create: { key: GEMINI_SERVICE_KEY, name: "Google Gemini", provider: "Google" },
  });

  for (const [model, price] of Object.entries(DEFAULT_PRICING)) {
    await prisma.aIModelPricing.upsert({
      where: { service_id_model: { service_id: service.id, model } },
      update: {},
      create: {
        service_id: service.id,
        model,
        input_price_per_million: price.input,
        output_price_per_million: price.output,
      },
    });
  }
}

export interface RecordAIUsageInput {
  serviceKey?: string;
  model: string;
  feature: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  // Para modelos cobrados por unidade (pricing_unit != "tokens" — 1 imagem, 1
  // segundo de vídeo etc.), em vez de tokens. Uma chamada usa OU tokens OU
  // units, não os dois.
  units?: number;
  userId?: string;
}

/** Registra uma chamada de IA já concluída — nunca lança: falha ao registrar
 * uso não pode derrubar a resposta que o usuário já recebeu (mesmo princípio
 * usado nas notificações do motor de tarefas). Chamar depois de cada
 * `ai.models.generateContent(...)` bem-sucedida, passando
 * `response.usageMetadata` (texto) ou `units` (imagem/vídeo/etc.). */
export async function recordAIUsage(input: RecordAIUsageInput): Promise<void> {
  try {
    const serviceKey = input.serviceKey ?? GEMINI_SERVICE_KEY;
    const service = await prisma.aIServiceConfig.findUnique({ where: { key: serviceKey } });
    if (!service) return;

    const pricing = await prisma.aIModelPricing.findUnique({
      where: { service_id_model: { service_id: service.id, model: input.model } },
    });

    const promptTokens = input.promptTokens ?? 0;
    const completionTokens = input.completionTokens ?? 0;
    const totalTokens = input.totalTokens ?? promptTokens + completionTokens;
    const units = input.units ?? 0;

    let estimatedCost = 0;
    if (pricing?.pricing_unit === "tokens" || !pricing?.pricing_unit) {
      estimatedCost =
        (promptTokens / 1_000_000) * (pricing?.input_price_per_million ?? 0) +
        (completionTokens / 1_000_000) * (pricing?.output_price_per_million ?? 0);
    } else if (pricing) {
      estimatedCost = units * (pricing.unit_price ?? 0);
    }

    await prisma.aIUsageLog.create({
      data: {
        service_id: service.id,
        model: input.model,
        feature: input.feature,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: totalTokens,
        units,
        estimated_cost_usd: estimatedCost,
        user_id: input.userId,
      },
    });
  } catch (err) {
    console.error("[ai-usage-tracker] Falha ao registrar uso de IA:", err);
  }
}

/** Extrai os campos relevantes de `response.usageMetadata` do @google/genai
 * pra passar direto pra recordAIUsage — soma tokens de "thinking" (saída
 * raciocinada) nos de saída, porque o Google cobra os dois como output. */
export function usageFromGeminiResponse(response: any): {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
} {
  const usage = response?.usageMetadata ?? {};
  const promptTokens = usage.promptTokenCount ?? 0;
  const completionTokens = (usage.candidatesTokenCount ?? 0) + (usage.thoughtsTokenCount ?? 0);
  const totalTokens = usage.totalTokenCount ?? promptTokens + completionTokens;
  return { promptTokens, completionTokens, totalTokens };
}
