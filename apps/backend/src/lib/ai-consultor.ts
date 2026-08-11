// "Consultor IA" — camada fina sobre o Gemini que replica o comportamento do
// Gem consultivo (configurado pelo usuário no app do Gemini) via API, já que
// Gems não são acessíveis por API diretamente. O "system prompt" abaixo é a
// persona/instruções que o usuário copiou do Gem + a base de conhecimento
// PLAC (ver ai-knowledge-base.ts) — mesma fundamentação, chamada pelo backend.
import { GoogleGenAI } from "@google/genai";
import { getCategoryKnowledgeText, getProjectDocumentsText } from "./ai-knowledge-base";
import { recordAIUsage, usageFromGeminiResponse } from "./ai-usage-tracker";

const MODEL = "gemini-2.5-flash";
const IMAGE_MODEL = "gemini-2.5-flash-image";

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "CHANGE_ME") {
    throw new Error("GEMINI_API_KEY não configurada no backend (.env)");
  }
  if (!client) client = new GoogleGenAI({ apiKey });
  return client;
}

// Persona/instruções copiadas do Gem "Consultor PLAC" configurado no Gemini
// pelo usuário (gemini.google.com) — replicadas aqui porque Gems não são
// chamáveis via API. Qualquer ajuste de comportamento deve ser feito no Gem
// original E aqui, pros dois ficarem coerentes.
const GEM_PERSONA = `
Você é um analista empresarial que vai responder de forma técnica as questões que forem efetuados, com base em dados captados e preenchidos pelo empresário em nossa calculadora de escravidão operacional.

Sempre embase suas respostas na nossa metodologia PLAC (anexada como base de conhecimento) e sempre indique ao empresário que preencheu a calculadora que adote o PLAC para resolver os problemas, indicando o que do PLAC se aplica para atingir escalabilidade e lucratividade no negócio.
A allka.com.vc é a solução para as empresas de consultoria e agências de marketing — mostre sempre, de forma prática, a forma de corrigir os problemas.
Importante: o tamanho da resposta deve seguir a natureza da pergunta — um dado objetivo (nome, URL, prazo, valor) merece resposta curta e direta, sem enrolação. Já uma pergunta aberta, estratégica ou que peça ideias/conteúdo (ex: proposta de página, estrutura de campanha, argumentos de venda) deve ser desenvolvida por completo, com todos os parágrafos, tópicos ou seções que o assunto realmente exigir — nunca corte uma resposta assim numa frase só para parecer objetivo. Acima de tudo, siga o que o texto fornecido pedir sobre tamanho/escopo: se o cliente ou a agência pedir explicitamente algo pequeno, resumido, direto ou só um exemplo rápido, respeite isso e reduza a resposta de acordo — mesmo numa pergunta aberta — em vez de expandir por padrão.
`.trim();

async function buildSystemInstruction(): Promise<string> {
  const kb = await getCategoryKnowledgeText("briefing");
  return `${GEM_PERSONA}

Contexto de uso atual: aqui você está ajudando a preencher e melhorar respostas do questionário de briefing de TAREFAS dentro de projetos de clientes na plataforma allka — não a calculadora original, mas o mesmo espírito consultivo (técnico, embasado no PLAC, resumido e objetivo) se aplica.

=== BASE DE CONHECIMENTO PLAC (referência — não cite os nomes dos arquivos, só use o conteúdo) ===
${kb || "(nenhum documento de referência carregado no momento)"}
=== FIM DA BASE DE CONHECIMENTO ===`;
}

export interface BriefingQuestion {
  question_key: string;
  question_text: string;
  type?: string;
  options?: string[];
  required?: boolean;
}

export interface FilledAnswer {
  question_key: string;
  answer: string;
}

export interface FillBriefingOptions {
  /** Projeto de onde vieram os documentos de contexto (ver ProjectAttachment).
   * Só é usado quando useProjectDocuments também é true. */
  projectId?: string;
  /** true quando a agência confirmou, na tela, que quer usar os documentos
   * do projeto (PDFs/docs/imagens anexados na aba "Documentos") como base
   * extra pra entender o cliente. Quando false/ausente, a IA usa só o texto
   * livre fornecido na hora + o Consultor PLAC, exatamente como antes. */
  useProjectDocuments?: boolean;
}

/** "Preencher com Assistente": recebe um texto livre (briefing colado pelo
 * usuário) e devolve uma resposta sugerida para cada pergunta do
 * questionário, embasada no PLAC. A agência revisa/ajusta antes de salvar —
 * nunca salva direto. */
export async function fillBriefingWithAI(
  freeText: string,
  questions: BriefingQuestion[],
  options: FillBriefingOptions = {},
): Promise<FilledAnswer[]> {
  if (questions.length === 0) return [];

  const systemInstruction = await buildSystemInstruction();
  const questionsList = questions
    .map(
      (q, i) =>
        `${i + 1}. [key: ${q.question_key}] (tipo: ${q.type ?? "text_short"}) ${q.question_text}${
          q.options?.length ? ` — opções válidas: ${q.options.join(" | ")}` : ""
        }`,
    )
    .join("\n");

  let projectDocsSection = "";
  if (options.useProjectDocuments && options.projectId) {
    const docsText = await getProjectDocumentsText(options.projectId);
    if (docsText) {
      projectDocsSection = `

Documentos do projeto (contexto adicional sobre ESTE cliente específico, anexados pela agência na aba "Documentos" do projeto — a agência pediu explicitamente pra você usar isso; priorize sobre suposições genéricas quando complementar ou detalhar o que está no texto livre acima):
"""
${docsText}
"""`;
    }
  }

  const prompt = `Perguntas do questionário de briefing:
${questionsList}

Informações fornecidas pela agência (texto livre, pode ser briefing do cliente, mensagens, anotações de reunião etc.):
"""
${freeText}
"""
${projectDocsSection}

Regras para responder:
- Perguntas de tipo "select" ou "multiple_choice": a resposta deve ser EXATAMENTE igual a uma das "opções válidas" listadas (copie o texto da opção, não parafraseie, não combine explicação com a opção). Se nenhuma opção corresponder à informação disponível, use a opção mais próxima ou "Não sei" se existir.
- Perguntas objetivas/factuais (ex: URL, valor, nome, data, endereço, quantidade — geralmente tipo "text_short"): responda só com o dado em si, direto e sem comentário adicional. NÃO mencione PLAC, 4F's ou allka.com.vc nessas respostas.
- Perguntas abertas/estratégicas (tipo "text_long", ex: objetivos, público-alvo, contexto do problema, ideias de conteúdo/página): desenvolva de verdade, sem se prender a uma frase curta. Se a pergunta pedir uma ideia, proposta ou estrutura (ex: sugestão de página, campanha, argumento de venda), escreva um texto completo — com parágrafos e, quando fizer sentido, seções nomeadas (ex: "Hero:", "Seção X:", "Prova social:", "Chamada para ação:") — cobrindo o assunto de verdade em vez de resumir. Só quando fizer sentido real para aquela pergunta específica, mencione brevemente como o PLAC se aplica — sem forçar em toda resposta.
- Se o texto fornecido pelo cliente/agência pedir explicitamente algo pequeno, resumido, direto ou reduzido (mesmo para uma pergunta aberta), respeite esse pedido e encurte a resposta de acordo, em vez de expandir por padrão.
- Se a informação para uma pergunta específica não estiver disponível no texto, responda com uma string vazia para aquela pergunta (não invente dados do cliente).
- Devolva TODAS as perguntas, uma resposta por "question_key".`;

  const ai = getClient();
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      systemInstruction,
      temperature: 0.4,
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: {
          answers: {
            type: "array",
            items: {
              type: "object",
              properties: {
                question_key: { type: "string" },
                answer: { type: "string" },
              },
              required: ["question_key", "answer"],
            },
          },
        },
        required: ["answers"],
      },
    },
  });

  await recordAIUsage({ model: MODEL, feature: "fill-briefing", ...usageFromGeminiResponse(response) });

  const text = response.text;
  if (!text) return [];
  const parsed = JSON.parse(text) as { answers: FilledAnswer[] };
  return parsed.answers ?? [];
}

/** "Melhorar com IA": pega a resposta atual (rascunho) de UM campo e devolve
 * uma versão melhorada — mais clara, técnica e embasada no PLAC quando fizer
 * sentido. Usado no fluxo "Responder pergunta por pergunta". */
export async function improveAnswerWithAI(
  questionText: string,
  currentAnswer: string,
  type?: string,
): Promise<string> {
  const isFactual = type === "text_short" || type === "select" || type === "multiple_choice";
  const systemInstruction = await buildSystemInstruction();
  const prompt = `Pergunta do briefing: "${questionText}"

Resposta atual (rascunho da agência):
"""
${currentAnswer || "(vazio — ainda não respondido)"}
"""

${
  isFactual
    ? "Esta é uma pergunta objetiva/factual (dado curto: URL, valor, nome, data, opção etc.). Apenas corrija clareza/ortografia do dado, sem adicionar explicações, contexto ou menções a PLAC/allka — o resultado deve continuar curto e direto."
    : "Reescreva essa resposta de forma mais clara e técnica, mantendo as informações originais (não invente dados novos do cliente) e embasando na metodologia PLAC quando fizer sentido real para o contexto desta pergunta específica — sem forçar a menção se não for relevante. Se a pergunta pedir uma ideia, proposta ou estrutura (ex: sugestão de página, campanha, argumento de venda), desenvolva por completo — parágrafos e, quando fizer sentido, seções nomeadas (ex: \"Hero:\", \"Seção X:\", \"Chamada para ação:\") — não resuma numa frase só apenas para parecer objetivo. Mas se a pergunta ou o rascunho pedir explicitamente algo pequeno, resumido ou reduzido, respeite esse pedido e mantenha a resposta curta em vez de expandir."
}
Devolva APENAS o texto da resposta melhorada, sem aspas, sem preâmbulo, sem explicações extras.`;

  const ai = getClient();
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      systemInstruction,
      temperature: 0.5,
    },
  });

  await recordAIUsage({ model: MODEL, feature: "improve-answer", ...usageFromGeminiResponse(response) });

  return (response.text ?? "").trim();
}

// Persona separada da do "Consultor PLAC" acima — aqui a IA escreve/melhora
// texto de catálogo de produto (marketing/vendas), não responde briefing de
// tarefa embasado em PLAC. Usa a base de conhecimento da categoria
// "produtos" (admin > Configurações > Base de Conhecimento IA), não a de
// "briefing" — contexto diferente (copy de produto, não consultoria PLAC).
const PRODUCT_COPYWRITER_PERSONA = `
Você é um redator especialista em catálogo de produtos da allka.com.vc, uma plataforma de marketplace de serviços de marketing e criação para agências e empresas.
Seu trabalho é escrever ou melhorar o texto de UM campo do cadastro de um produto do catálogo: claro, objetivo, com poder de venda, em português do Brasil.
Nunca invente números, prazos, garantias ou funcionalidades que não estejam no contexto fornecido — se faltar informação, escreva de forma genérica mas honesta.
O campo é exibido como texto puro (sem renderização de markdown) — não use "**negrito**", "# títulos" nem outra sintaxe markdown.
`.trim();

async function buildProductSystemInstruction(): Promise<string> {
  const kb = await getCategoryKnowledgeText("produtos");
  if (!kb) return PRODUCT_COPYWRITER_PERSONA;
  return `${PRODUCT_COPYWRITER_PERSONA}

=== MATERIAL DE REFERÊNCIA (catálogo de produtos — use como base quando fizer sentido, não cite nomes de arquivo) ===
${kb}
=== FIM DO MATERIAL DE REFERÊNCIA ===`;
}

export interface ProductFieldContext {
  name?: string;
  category?: string;
  price?: string | number;
  otherFields?: Record<string, string>;
}

export type ProductFieldLength = "manter" | "curto" | "medio" | "longo";
export type ProductFieldApproach = "melhorar" | "recriar";

function lengthInstruction(
  length: ProductFieldLength | undefined,
  currentValue: string,
  mode: "text" | "list",
): string {
  const currentLen = currentValue.trim().length;
  if (mode === "list") {
    switch (length) {
      case "curto":
        return "Gere poucos itens (2 a 3), só os mais essenciais.";
      case "longo":
        return "Gere bastante itens (7 a 10), cobrindo o máximo de detalhes relevantes.";
      case "manter":
        return currentLen > 0
          ? "Gere aproximadamente a mesma quantidade de itens que já existe no campo."
          : "Gere de 4 a 6 itens.";
      case "medio":
      default:
        return "Gere de 4 a 6 itens.";
    }
  }
  switch (length) {
    case "curto":
      return "Escreva uma versão CURTA: 1 a 2 frases, direto ao ponto.";
    case "longo":
      return "Escreva uma versão LONGA e detalhada, explorando bem o assunto (vários parágrafos ou bullet points quando fizer sentido).";
    case "manter":
      return currentLen > 0
        ? `Escreva mantendo aproximadamente o mesmo tamanho do texto atual (cerca de ${currentLen} caracteres) — não encurte nem alongue muito.`
        : "Escreva um texto de tamanho médio (1 parágrafo curto).";
    case "medio":
    default:
      return "Escreva um texto de tamanho médio (1 parágrafo, direto).";
  }
}

/** "Melhorar com IA" nos campos do cadastro de produto (admin/produtos).
 * `mode: "list"` pede itens curtos, um por linha (ex: itens inclusos);
 * `mode: "text"` (padrão) pede um texto corrido pro campo.
 * `length`/`approach` são preferências que o usuário escolhe antes de gerar
 * (ver popover do botão "Melhorar com IA" no frontend). */
export async function improveProductField(
  fieldLabel: string,
  currentValue: string,
  context: ProductFieldContext = {},
  mode: "text" | "list" = "text",
  length: ProductFieldLength = "manter",
  approach: ProductFieldApproach = "melhorar",
): Promise<string> {
  const otherFieldsText = context.otherFields
    ? Object.entries(context.otherFields)
        .filter(([, v]) => v && v.trim())
        .map(([k, v]) => `- ${k}: ${v.length > 300 ? v.slice(0, 300) + "…" : v}`)
        .join("\n")
    : "";

  const prompt = `Produto: ${context.name || "(sem nome ainda)"}
Categoria: ${context.category || "não definida"}
Preço: ${context.price || "não definido"}

Campo a preencher/melhorar: "${fieldLabel}"
${mode === "list" ? "Este campo é uma LISTA de itens curtos (um por linha)." : "Este campo é um texto corrido."}

Conteúdo atual do campo:
"""
${currentValue || "(vazio)"}
"""

Outros campos já preenchidos do produto (contexto — não repita o conteúdo deles, só use como referência):
${otherFieldsText || "(nenhum outro campo preenchido ainda)"}

Instruções:
- ${
    approach === "recriar"
      ? "RECRIE o campo do zero — pode usar o conteúdo atual como referência de tom/assunto, mas não precisa preservar a redação existente."
      : "MELHORE o conteúdo atual — preserve as informações verdadeiras já escritas, ajustando clareza, estrutura e poder de venda."
  }
- ${lengthInstruction(length, currentValue, mode)}
- Se o campo estiver vazio, escreva conteúdo novo e coerente com nome/categoria/preço e os demais campos.
- Não invente números, prazos ou garantias que não constem no contexto.
${
  mode === "list"
    ? "- Devolva só os itens, um por linha, sem marcadores como '-' ou '•', sem numeração, sem linhas em branco."
    : "- Devolva só o texto final do campo, sem aspas, sem preâmbulo, sem explicações extras."
}`;

  const ai = getClient();
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      systemInstruction: await buildProductSystemInstruction(),
      temperature: 0.6,
    },
  });

  await recordAIUsage({ model: MODEL, feature: "improve-product-field", ...usageFromGeminiResponse(response) });

  return (response.text ?? "").trim();
}

// ─── Pesquisa de mercado com Google Search grounding ────────────────────────
// Diferente das funções acima (texto gerado só com o conhecimento do modelo),
// estas usam `tools: [{ googleSearch: {} }]` — o Gemini faz buscas reais na
// internet antes de responder. Por isso NÃO combinamos com responseSchema/
// JSON estruturado (a API não suporta tools + saída estruturada ao mesmo
// tempo de forma confiável) — a resposta vem em texto livre, e as fontes
// citadas vêm em `groundingMetadata.groundingChunks`.
// ⚠ Cada chamada aqui é uma busca real (custo por request maior que as
// chamadas de texto puro acima) — usar só quando o usuário pedir
// explicitamente ("pesquisar com IA"), nunca automaticamente.

export interface WebSource {
  title: string;
  url: string;
}

export interface MarketResearchResult {
  research_text: string;
  sources: WebSource[];
}

function extractSources(response: any): WebSource[] {
  const chunks = response?.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const sources: WebSource[] = [];
  for (const c of chunks) {
    if (c?.web?.uri) {
      sources.push({ title: c.web.title || c.web.uri, url: c.web.uri });
    }
  }
  return sources;
}

const MARKET_RESEARCH_PERSONA = `
Você é um analista de precificação de serviços de marketing, criação e tecnologia para o mercado brasileiro, com acesso a busca na internet em tempo real.
Sua função é pesquisar preços e dados de mercado ATUAIS e resumir de forma objetiva, sempre baseando as informações em resultados de busca reais — nunca invente números sem fundamento.
Se os valores variarem muito entre fontes, dê uma faixa (mínimo–máximo) em vez de um número único, e mencione de onde vem a variação (região, senioridade, escopo etc.).
Responda em português do Brasil, direto, em bullet points curtos, sem floreio.
IMPORTANTE: a resposta é exibida como texto puro (não há renderização de markdown) — não use "**negrito**", "# títulos", nem outra sintaxe markdown. Use apenas hífen "-" para listas e quebras de linha simples para separar seções.
`.trim();

/** Pesquisa de preço de mercado pra UM produto do catálogo (admin/produtos):
 * quanto se paga a freelancers, quanto agências cobram do cliente final, e
 * variação regional — usa busca real no Google via Gemini grounding. */
export async function researchProductPricing(
  productName: string,
  category: string,
  description: string,
): Promise<MarketResearchResult> {
  const year = new Date().getFullYear();
  const prompt = `Pesquise o preço de mercado ATUAL (Brasil, ${year}) para o seguinte serviço:

Produto/serviço: ${productName || "(sem nome informado)"}
Categoria: ${category || "não informada"}
Descrição: ${description || "não informada"}

Traga na resposta:
1. Faixa de valor pago a freelancers/profissionais por esse tipo de entrega (unitário ou por hora, o que fizer mais sentido).
2. Faixa de valor cobrado por agências ao cliente final pelo mesmo tipo de serviço.
3. Como o preço varia entre regiões do Brasil (grandes centros vs. interior/outras regiões), se houver essa informação.
4. Uma sugestão de faixa de preço final para uma plataforma de marketplace de serviços cobrar do cliente final, considerando que uma agência intermediária é responsável pela entrega.`;

  const ai = getClient();
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      systemInstruction: MARKET_RESEARCH_PERSONA,
      temperature: 0.3,
      tools: [{ googleSearch: {} }],
    },
  });

  await recordAIUsage({ model: MODEL, feature: "research-product-pricing", ...usageFromGeminiResponse(response) });

  return { research_text: (response.text ?? "").trim(), sources: extractSources(response) };
}

/** Pesquisa de mercado pra UMA especialidade (admin/especialidades): valor/
 * hora atual por senioridade, demanda do mercado, ferramentas mais exigidas. */
export async function researchSpecialtyMarket(
  specialtyName: string,
  category: string,
  description: string,
): Promise<MarketResearchResult> {
  const year = new Date().getFullYear();
  const prompt = `Pesquise informações ATUAIS de mercado (Brasil, ${year}) sobre a especialidade profissional abaixo:

Especialidade: ${specialtyName || "(sem nome informado)"}
Categoria: ${category || "não informada"}
Descrição: ${description || "não informada"}

Traga na resposta:
1. Faixa de valor/hora atualmente pago a profissionais dessa especialidade no Brasil (freelancer/PJ).
2. Como isso varia por senioridade (júnior/pleno/sênior), se houver dado.
3. Se essa especialidade está em alta demanda, estável ou em queda no mercado atualmente.
4. Habilidades/ferramentas mais exigidas hoje para essa especialidade.`;

  const ai = getClient();
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      systemInstruction: MARKET_RESEARCH_PERSONA,
      temperature: 0.3,
      tools: [{ googleSearch: {} }],
    },
  });

  await recordAIUsage({ model: MODEL, feature: "research-specialty-market", ...usageFromGeminiResponse(response) });

  return { research_text: (response.text ?? "").trim(), sources: extractSources(response) };
}

/** Pesquisa de especialidades novas/emergentes no mercado (admin/
 * especialidades, botão de página inteira, não ligado a um registro). */
export async function researchEmergingSpecialties(
  categoryHint?: string,
): Promise<MarketResearchResult> {
  const year = new Date().getFullYear();
  const prompt = `Pesquise quais especialidades/profissões novas ou emergentes estão surgindo atualmente (${year}) no mercado de marketing digital, criação de conteúdo, tecnologia e serviços para agências${
    categoryHint ? ` — com foco especial na área de "${categoryHint}"` : ""
  }.

Liste de 5 a 10 especialidades emergentes que uma plataforma de marketplace de serviços de marketing/criação para agências deveria considerar adicionar ao catálogo. Para cada uma:
- Nome da especialidade
- Uma frase curta explicando o que é
- Faixa de valor/hora praticada no Brasil, se houver dado disponível`;

  const ai = getClient();
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      systemInstruction: MARKET_RESEARCH_PERSONA,
      temperature: 0.4,
      tools: [{ googleSearch: {} }],
    },
  });

  await recordAIUsage({ model: MODEL, feature: "research-emerging-specialties", ...usageFromGeminiResponse(response) });

  return { research_text: (response.text ?? "").trim(), sources: extractSources(response) };
}

// ─── Geração de imagem com IA ────────────────────────────────────────────
// Usa o modelo de imagem do Gemini (gera PNG em base64) — usado pra criar
// imagem de capa e imagens de portfólio dos produtos do catálogo.

export interface GeneratedImage {
  mimeType: string;
  base64: string;
}

export async function generateProductImage(
  prompt: string,
  aspectRatio: string = "16:9",
): Promise<GeneratedImage> {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: IMAGE_MODEL,
    contents: prompt,
    config: {
      responseModalities: ["IMAGE", "TEXT"],
      imageConfig: { aspectRatio },
    },
  });

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p: any) => p.inlineData);
  if (!imagePart?.inlineData?.data) {
    throw new Error("A IA não retornou uma imagem (resposta sem inlineData).");
  }

  return {
    mimeType: imagePart.inlineData.mimeType || "image/png",
    base64: imagePart.inlineData.data,
  };
}
