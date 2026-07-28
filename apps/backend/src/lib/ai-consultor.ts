// "Consultor IA" — camada fina sobre o Gemini que replica o comportamento do
// Gem consultivo (configurado pelo usuário no app do Gemini) via API, já que
// Gems não são acessíveis por API diretamente. O "system prompt" abaixo é a
// persona/instruções que o usuário copiou do Gem + a base de conhecimento
// PLAC (ver ai-knowledge-base.ts) — mesma fundamentação, chamada pelo backend.
import { GoogleGenAI } from "@google/genai";
import { getKnowledgeBaseText } from "./ai-knowledge-base";

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

// Persona/instruções copiadas do Gem "Consultor PLAC" configurado no Gemini
// pelo usuário (gemini.google.com) — replicadas aqui porque Gems não são
// chamáveis via API. Qualquer ajuste de comportamento deve ser feito no Gem
// original E aqui, pros dois ficarem coerentes.
const GEM_PERSONA = `
Você é um analista empresarial que vai responder de forma técnica as questões que forem efetuados, com base em dados captados e preenchidos pelo empresário em nossa calculadora de escravidão operacional.

Sempre embase suas respostas na nossa metodologia PLAC (anexada como base de conhecimento) e sempre indique ao empresário que preencheu a calculadora que adote o PLAC para resolver os problemas, indicando o que do PLAC se aplica para atingir escalabilidade e lucratividade no negócio.
A allka.com.vc é a solução para as empresas de consultoria e agências de marketing — mostre sempre, de forma prática, a forma de corrigir os problemas.
Importante: as respostas devem ser resumidas e objetivas.
`.trim();

async function buildSystemInstruction(): Promise<string> {
  const kb = await getKnowledgeBaseText();
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

/** "Preencher com Assistente": recebe um texto livre (briefing colado pelo
 * usuário) e devolve uma resposta sugerida para cada pergunta do
 * questionário, embasada no PLAC. A agência revisa/ajusta antes de salvar —
 * nunca salva direto. */
export async function fillBriefingWithAI(
  freeText: string,
  questions: BriefingQuestion[],
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

  const prompt = `Perguntas do questionário de briefing:
${questionsList}

Informações fornecidas pela agência (texto livre, pode ser briefing do cliente, mensagens, anotações de reunião etc.):
"""
${freeText}
"""

Regras para responder:
- Perguntas de tipo "select" ou "multiple_choice": a resposta deve ser EXATAMENTE igual a uma das "opções válidas" listadas (copie o texto da opção, não parafraseie, não combine explicação com a opção). Se nenhuma opção corresponder à informação disponível, use a opção mais próxima ou "Não sei" se existir.
- Perguntas objetivas/factuais (ex: URL, valor, nome, data, endereço, quantidade — geralmente tipo "text_short"): responda só com o dado em si, direto e sem comentário adicional. NÃO mencione PLAC, 4F's ou allka.com.vc nessas respostas.
- Perguntas abertas/estratégicas (tipo "text_long", ex: objetivos, público-alvo, contexto do problema): pode ser um pouco mais elaborado e, só quando fizer sentido real para aquela pergunta específica, mencionar brevemente como o PLAC se aplica — sem forçar em toda resposta.
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
    : "Reescreva essa resposta de forma mais clara, técnica e objetiva, mantendo as informações originais (não invente dados novos do cliente) e embasando na metodologia PLAC quando fizer sentido real para o contexto desta pergunta específica — sem forçar a menção se não for relevante."
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

  return (response.text ?? "").trim();
}
