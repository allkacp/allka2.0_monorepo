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
import { checkClientVisibility } from "./catalog2-client";
import { recordAIUsage, usageFromGeminiResponse } from "./ai-usage-tracker";
import {
  buildCatalog2KnowledgeText,
  buildAdminKnowledgeText,
  type KnowledgeSource,
} from "./iallka-knowledge";

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

Regras de conhecimento (reunião 10/09, "base de conhecimento — catálogo e briefings"):
- Existem DUAS listas de catálogo abaixo. O CATÁLOGO LEGADO continua sendo a única fonte de "selected_products" e, portanto, a única que pode criar um projeto neste fluxo. O CATÁLOGO2 deve ser usado em "catalog2_recommendations": recomendações informativas dos produtos novos, sempre com um id da lista fornecida e nunca dentro de "selected_products".
- Produto Catalog2 em preparação pode ser recomendado somente como "em preparação para revisão"; nunca diga que ele foi adicionado a projeto, cesta, orçamento ou contratação. Produto Catalog2 realmente disponível pode ser recomendado como próximo passo de configuração, mas também não entra em "selected_products" automaticamente.
- Todo produto do catálogo2 já vem marcado [REAL] ou [PROVISÓRIO] no preço/prazo. Preço/prazo [PROVISÓRIO] NUNCA é uma oferta comercial válida — sempre diga explicitamente que é provisório e precisa de revisão antes de qualquer contratação real. Nunca apresente um valor provisório como se fosse o preço final.
- Um produto marcado "EM PREPARAÇÃO" nunca deve ser recomendado como se já pudesse ser contratado agora — explique que ele ainda está em preparação.
- Se a pergunta não tiver base nas informações fornecidas (nem no catálogo, nem nos documentos), diga honestamente que não encontrou essa informação, em vez de inventar. Pode fazer uma pergunta de esclarecimento em vez de responder.
- Ao recomendar um produto, explique o motivo (que necessidade ele resolve), cite os campos relevantes usados na decisão (categoria, preço, prazo, tarefas) e informe pendências reais quando existirem.
- Nunca invente preço, prazo, tarefa, política ou produto que não esteja em nenhuma das fontes fornecidas.
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

export interface IallkaCatalog2Recommendation {
  product_id: string;
  reasoning: string;
  product_name?: string;
  product_slug?: string;
  status?: "disponivel" | "em_preparacao" | "temporariamente_inativo" | "arquivado";
  can_configure?: boolean;
}

export interface IallkaTurnResult {
  reply_text: string;
  stage: "gathering" | "proposal";
  project_title: string;
  selected_products: IallkaSelectedProduct[];
  /** Recomendações do Catalog2. São validadas no servidor e nunca criam
   * projeto, cesta ou cotação por conta própria. */
  catalog2_recommendations: IallkaCatalog2Recommendation[];
  /** Fontes REALMENTE usadas neste turno — calculado no servidor a partir
   * do que foi montado no contexto (nunca auto-relatado pela IA, pra nunca
   * arriscar uma fonte alucinada). Vazio quando nada relevante foi incluído. */
  sources?: KnowledgeSource[];
}

export interface IallkaTurnOpts {
  /** Admin Master: vê o catálogo2 inteiro (inclusive em preparação) e pode
   * ver preço/prazo PROVISÓRIO, sempre marcado como tal. */
  isAdminMaster?: boolean;
  /** Company/Agency/Partner: só produtos catalog2 realmente visíveis pro
   * cliente entram no contexto — nunca um provisório, nunca "em preparação". */
  clientVisibleOnly?: boolean;
  /** Texto de briefing de um projeto específico — só deve chegar aqui
   * depois de validado que o projeto pertence à conta da sessão (ver
   * routes/iallka.ts). Nunca cacheado, nunca reaproveitado entre contas. */
  projectBriefing?: { text: string; source: KnowledgeSource } | null;
}

/** Envia um turno pra IA: histórico completo + mensagem nova do usuário,
 * catálogo injetado no systemInstruction (mesmo padrão de
 * ai-knowledge-base.ts). Sem tools/grounding — só saída estruturada. */
export async function sendIallkaTurn(
  history: IallkaHistoryTurn[],
  userMessage: string,
  userId?: string,
  opts: IallkaTurnOpts = {},
): Promise<IallkaTurnResult> {
  const catalogText = await buildProductCatalogContext();
  const catalog2 = await buildCatalog2KnowledgeText({
    includeProvisional: !!opts.isAdminMaster,
    clientVisibleOnly: !!opts.clientVisibleOnly,
  });
  const adminDocs = await buildAdminKnowledgeText();

  const sources: KnowledgeSource[] = [...catalog2.sources, ...adminDocs.sources];
  if (opts.projectBriefing) sources.push(opts.projectBriefing.source);

  const systemInstruction = `${IALLKA_PERSONA}

=== CATÁLOGO DE PRODUTOS DISPONÍVEIS PRA PROPOR (use só os ids listados aqui) ===
${catalogText}
=== FIM DO CATÁLOGO ===

=== CATÁLOGO2 — PRODUTOS NOVOS DA PLATAFORMA (use somente em catalog2_recommendations; nunca em selected_products) ===
${catalog2.text}
=== FIM DO CATÁLOGO2 ===

=== DOCUMENTOS ADMINISTRATIVOS APROVADOS (conhecimento compartilhado) ===
${adminDocs.text || "(nenhum documento cadastrado ainda)"}
=== FIM DOS DOCUMENTOS ===${
    opts.projectBriefing
      ? `

=== BRIEFING PRIVADO DESTE PROJETO (nunca compartilhe fora desta sessão) ===
${opts.projectBriefing.text}
=== FIM DO BRIEFING PRIVADO ===`
      : ""
  }`;

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
          catalog2_recommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                product_id: { type: "string" },
                reasoning: { type: "string" },
              },
              required: ["product_id", "reasoning"],
            },
          },
        },
        required: ["reply_text", "stage", "project_title", "selected_products", "catalog2_recommendations"],
      },
    },
  });

  await recordAIUsage({ model: MODEL, feature: "iallka-assembly", userId, ...usageFromGeminiResponse(response) });

  const text = response.text;
  if (!text) throw new Error("IALLKA não retornou resposta");
  const parsed = JSON.parse(text) as IallkaTurnResult;
  // `sources` é calculado no servidor (nunca reportado pela própria IA) —
  // sempre reflete exatamente o que foi injetado no contexto deste turno.
  return { ...parsed, catalog2_recommendations: parsed.catalog2_recommendations ?? [], sources };
}

/** Revalida recomendações de Catalog2. Diferente do catálogo legado, uma
 * recomendação aqui não vira item de projeto: apenas informa o estado real
 * e o próximo passo seguro para o usuário. */
export async function validateCatalog2Recommendations(
  items: IallkaCatalog2Recommendation[],
): Promise<IallkaCatalog2Recommendation[]> {
  const valid: IallkaCatalog2Recommendation[] = [];
  for (const item of items) {
    const product = await prisma.catalog2Product.findUnique({
      where: { id: item.product_id },
      select: {
        id: true, slug: true, internal_name: true, status: true,
        published_version_id: true,
        import_origin: { select: { pendencies_json: true } },
      },
    });
    if (!product || product.internal_name.startsWith("[TESTE LOCAL]")) continue;
    const visibility = await checkClientVisibility(product);
    valid.push({
      product_id: product.id,
      reasoning: item.reasoning,
      product_name: product.internal_name,
      product_slug: product.slug,
      status: product.status as IallkaCatalog2Recommendation["status"],
      can_configure: visibility.visible,
    });
  }
  return valid;
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
