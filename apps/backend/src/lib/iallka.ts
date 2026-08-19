// IALLKA — assistente de IA que interview o usuário até ter informação
// suficiente, depois propõe uma lista real de produtos/variações do
// catálogo pra montar um projeto (ver routes/iallka.ts). Reaproveita a
// mesma infra de ai-consultor.ts (@google/genai, saída estruturada via
// responseSchema, ai-usage-tracker) — só o multi-turno é novo: cada
// chamada reenvia o histórico inteiro como `contents: [{role, parts}]`,
// já que a API `ai.chats.create` não é usada em nenhum outro lugar do
// código hoje.
import { GoogleGenAI } from "@google/genai";
import { prisma } from "./prisma";
import { assertProductContractable } from "./product-contractability";
import { recordAIUsage, usageFromGeminiResponse } from "./ai-usage-tracker";

const MODEL = "gemini-2.5-flash";

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "CHANGE_ME") {
    throw new Error("GEMINI_API_KEY não configurada no backend (.env)");
  }
  if (!client) client = new GoogleGenAI({ apiKey });
  return client;
}

const IALLKA_PERSONA = `
Você é a IALLKA, assistente de IA da allka.com.vc (marketplace de serviços de marketing, criação e tecnologia para agências e empresas). Sua função é ajudar quem está montando um projeto a escolher os produtos certos do catálogo, por meio de uma conversa curta.

Regras da conversa:
- Faça perguntas OBJETIVAS e poucas por vez (1 a 3), nunca um questionário longo de uma vez só — como uma conversa natural, não um formulário.
- Pergunte só o que for necessário pra escolher bem os produtos: que tipo de entrega/serviço a pessoa precisa, pra que tipo de negócio/objetivo, volume ou recorrência (uma vez só ou mensal), urgência, e qualquer detalhe que ajude a escolher entre variações de um mesmo produto.
- Quando já tiver informação suficiente pra montar uma proposta sólida, PARE de perguntar e monte a proposta.
- Na proposta: escolha produtos/variações APENAS da lista de catálogo fornecida abaixo — nunca invente um produto, nunca invente um id que não esteja na lista. Se nada do catálogo atender bem, diga isso com honestidade em vez de forçar uma escolha ruim.
- Explique brevemente o raciocínio de cada produto escolhido (por que ele resolve o que foi pedido).
- Se, depois de uma proposta, o usuário pedir ajuste (trocar produto, adicionar, remover, mudar variação), monte uma proposta NOVA já refletindo o pedido — não é preciso perguntar de novo o que já foi respondido antes.
- Português do Brasil, direto, sem emojis, sem markdown (a resposta é exibida como texto puro).
`.trim();

function buildCatalogText(
  products: Array<{
    id: string;
    name: string;
    category: string;
    short_description: string | null;
    tags: string | null;
    complexity: string;
    base_price: number;
    variations: Array<{ id: string; name: string; price: number }>;
  }>,
): string {
  return products
    .map((p) => {
      const tags = p.tags ? (JSON.parse(p.tags) as string[]).join(", ") : "";
      const variationsText = p.variations.length
        ? p.variations.map((v) => `${v.name} (id: ${v.id}, R$ ${v.price.toFixed(2)})`).join(" | ")
        : "(sem variações — usa o preço base)";
      return `- id: ${p.id} | ${p.name} | categoria: ${p.category} | complexidade: ${p.complexity} | preço base: R$ ${p.base_price.toFixed(2)}${
        tags ? ` | tags: ${tags}` : ""
      }${p.short_description ? ` | resumo: ${p.short_description.slice(0, 200)}` : ""} | variações: ${variationsText}`;
    })
    .join("\n");
}

/** Catálogo ativo e contratável (mesma regra de product-contractability.ts)
 * — só isso entra no prompt, reduzindo a chance da IA propor algo que não
 * pode ser vinculado a um projeto agora. */
export async function buildProductCatalogContext(): Promise<string> {
  const products = await prisma.product.findMany({
    where: { is_active: true, task_links: { some: { catalog_task: { is_active: true } } } },
    select: {
      id: true,
      name: true,
      category: true,
      short_description: true,
      tags: true,
      complexity: true,
      base_price: true,
      variations: { where: { is_active: true }, select: { id: true, name: true, price: true } },
    },
    orderBy: { category: "asc" },
  });
  if (products.length === 0) return "(nenhum produto contratável disponível no momento)";
  return buildCatalogText(products);
}

export interface IallkaHistoryTurn {
  role: "user" | "assistant";
  content: string;
}

export interface IallkaSelectedProduct {
  product_id: string;
  variation_id?: string;
  reasoning: string;
}

export interface IallkaTurnResult {
  reply_text: string;
  stage: "gathering" | "proposal";
  project_title: string;
  selected_products: IallkaSelectedProduct[];
}

/** Envia um turno pra IA: histórico completo + mensagem nova do usuário,
 * catálogo injetado no systemInstruction (mesmo padrão de
 * ai-knowledge-base.ts). Sem tools/grounding — só saída estruturada. */
export async function sendIallkaTurn(
  history: IallkaHistoryTurn[],
  userMessage: string,
  userId?: string,
): Promise<IallkaTurnResult> {
  const catalogText = await buildProductCatalogContext();
  const systemInstruction = `${IALLKA_PERSONA}

=== CATÁLOGO DE PRODUTOS DISPONÍVEIS PRA PROPOR (use só os ids listados aqui) ===
${catalogText}
=== FIM DO CATÁLOGO ===`;

  const contents = [
    ...history.map((h) => ({ role: h.role === "assistant" ? "model" : "user", parts: [{ text: h.content }] })),
    { role: "user", parts: [{ text: userMessage }] },
  ];

  const ai = getClient();
  const response = await ai.models.generateContent({
    model: MODEL,
    contents,
    config: {
      systemInstruction,
      temperature: 0.5,
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: {
          reply_text: { type: "string" },
          stage: { type: "string", enum: ["gathering", "proposal"] },
          project_title: { type: "string" },
          selected_products: {
            type: "array",
            items: {
              type: "object",
              properties: {
                product_id: { type: "string" },
                variation_id: { type: "string" },
                reasoning: { type: "string" },
              },
              required: ["product_id", "reasoning"],
            },
          },
        },
        required: ["reply_text", "stage", "project_title", "selected_products"],
      },
    },
  });

  await recordAIUsage({ model: MODEL, feature: "iallka-assembly", userId, ...usageFromGeminiResponse(response) });

  const text = response.text;
  if (!text) throw new Error("IALLKA não retornou resposta");
  return JSON.parse(text) as IallkaTurnResult;
}

/** Revalida cada produto/variação proposto contra o catálogo real — a IA
 * pode ter alucinado um id (mesmo instruída a não fazer isso). Item
 * inválido é descartado silenciosamente em vez de quebrar o fluxo
 * inteiro. */
export async function validateProposal(
  items: IallkaSelectedProduct[],
): Promise<IallkaSelectedProduct[]> {
  const valid: IallkaSelectedProduct[] = [];
  for (const item of items) {
    try {
      const product = await prisma.product.findUnique({ where: { id: item.product_id } });
      if (!product || !product.is_active) continue;
      if (item.variation_id) {
        const variation = await prisma.productVariation.findUnique({ where: { id: item.variation_id } });
        if (!variation || variation.product_id !== item.product_id || !variation.is_active) continue;
      }
      await assertProductContractable(item.product_id);
      valid.push(item);
    } catch {
      // produto proposto não é mais válido/contratável — ignorado, não
      // derruba a proposta inteira.
      continue;
    }
  }
  return valid;
}
