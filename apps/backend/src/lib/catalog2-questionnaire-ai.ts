// D-7 (reunião 07/10): botão de IA que lê TODOS os campos cadastrados do produto e sugere o questionário da tarefa.
// A IA só SUGERE: nada é salvo aqui. O administrador revisa, edita, adiciona ou remove perguntas e só então cria/vincula o questionário.
import { GoogleGenAI } from "@google/genai";
import { prisma } from "./prisma";
import { QUESTION_TYPES } from "./catalog2-question-types";
import { recordAIUsage, usageFromGeminiResponse } from "./ai-usage-tracker";

export interface SuggestedQuestion {
  key: string;
  label: string;
  is_required: boolean;
  question_type: string;
  help_text: string | null;
  options: string[] | null;
  visibility: "client";
  answer_usage: "both";
}
export interface QuestionnaireSuggestion { name: string; description: string | null; questions: SuggestedQuestion[] }
export type RawSuggestion = { label?: unknown; question_type?: unknown; is_required?: unknown; help_text?: unknown; options?: unknown };

const MAX_QUESTIONS = 15;
const SELECT_TYPES = new Set(["selecao_unica", "selecao_multipla"]);
const clip = (v: unknown, n: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const slug = (v: string) => v.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "pergunta";

/** Texto com TUDO que está cadastrado no produto e na tarefa (o que a IA lê). */
export async function buildQuestionnaireContext(taskId: string): Promise<{ context: string; productTitle: string; taskName: string; hasContent: boolean } | null> {
  const task: any = await prisma.catalog2Task.findUnique({
    where: { id: taskId },
    include: {
      steps: { orderBy: { sort_order: "asc" } },
      version: { include: { product: { select: { internal_name: true, category: { select: { name: true } } } }, variations: true, addons: true, connection_requirements: { include: { connection_type: { select: { name: true } } } } } },
    },
  }).catch((e) => { console.error("[questionnaire-ai] contexto:", e?.message); return null; });
  if (!task) return null;
  const v = task.version;
  const lines: string[] = [];
  lines.push(`PRODUTO: ${clip(v?.title, 200)}`);
  if (v?.product?.category?.name) lines.push(`Categoria: ${clip(v.product.category.name, 120)}`);
  if (v?.summary) lines.push(`Descrição curta: ${clip(v.summary, 600)}`);
  if (v?.full_description) lines.push(`Descrição completa: ${clip(v.full_description, 2500)}`);
  lines.push(`TAREFA: ${clip(task.name, 200)}${task.description ? ` — ${clip(task.description, 600)}` : ""}${task.objective ? ` | Objetivo: ${clip(task.objective, 600)}` : ""}`);
  if (task.steps?.length) {
    lines.push("ETAPAS DA TAREFA:");
    for (const [i, s] of task.steps.entries()) lines.push(`${i + 1}. ${clip(s.name, 160)}${s.description ? ` — ${clip(s.description, 300)}` : ""}${s.completion_criteria ? ` (conclui quando: ${clip(s.completion_criteria, 200)})` : ""}`);
  }
  if (v?.variations?.length) lines.push(`VARIAÇÕES OFERECIDAS: ${v.variations.map((x: any) => clip(x.name ?? x.label, 80)).filter(Boolean).join("; ")}`);
  if (v?.addons?.length) lines.push(`ADICIONAIS OFERECIDOS: ${v.addons.map((x: any) => clip(x.name ?? x.label, 80)).filter(Boolean).join("; ")}`);
  const accessNames = (v?.connection_requirements ?? []).map((a: any) => clip(a.label ?? a.connection_type?.name, 80)).filter(Boolean);
  if (accessNames.length) lines.push(`ACESSOS QUE O CLIENTE JÁ LIBERA (não pergunte senhas nem peça estes acessos de novo): ${accessNames.join("; ")}`);
  const hasContent = !!(v?.title || v?.summary || v?.full_description || task.steps?.length);
  return { context: lines.join("\n"), productTitle: clip(v?.title, 200), taskName: clip(task.name, 200), hasContent };
}

/** Normaliza a resposta da IA: tipos válidos, opções só nas perguntas de escolha, chaves únicas, sem duplicar rótulo, no máximo 15. */
export function normalizeSuggestions(raw: RawSuggestion[], existingLabels: string[] = []): SuggestedQuestion[] {
  const seen = new Set(existingLabels.map((l) => clip(l, 300).toLowerCase()));
  const out: SuggestedQuestion[] = [];
  for (const r of raw ?? []) {
    const label = clip(r.label, 300);
    if (label.length < 8 || seen.has(label.toLowerCase())) continue;
    seen.add(label.toLowerCase());
    const type = (QUESTION_TYPES as readonly string[]).includes(String(r.question_type)) ? String(r.question_type) : "texto_longo";
    let options: string[] | null = null;
    if (SELECT_TYPES.has(type)) {
      options = Array.from(new Set((Array.isArray(r.options) ? r.options : []).map((o) => clip(o, 80)).filter(Boolean))).slice(0, 12);
      if (options.length < 2) options = null;
    }
    const finalType = SELECT_TYPES.has(type) && !options ? "texto_curto" : type;
    out.push({ key: `p${out.length + 1}-${slug(label)}`, label, is_required: r.is_required !== false, question_type: finalType, help_text: clip(r.help_text, 400) || null, options: SELECT_TYPES.has(finalType) ? options : null, visibility: "client", answer_usage: "both" });
    if (out.length >= MAX_QUESTIONS) break;
  }
  return out;
}

// Gerador (trocável em teste): chama o Gemini e devolve as perguntas cruas.
export type QuestionnaireGenerator = (context: string, existingLabels: string[]) => Promise<RawSuggestion[]>;
let generator: QuestionnaireGenerator = geminiGenerator;
export function __setQuestionnaireGeneratorForTests(g: QuestionnaireGenerator | null) { generator = g ?? geminiGenerator; }

async function geminiGenerator(context: string, existingLabels: string[]): Promise<RawSuggestion[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "CHANGE_ME") throw new Error("A IA não está configurada neste ambiente (GEMINI_API_KEY).");
  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-2.5-flash";
  const prompt = `Você é um analista de operações de uma plataforma de serviços de marketing (Allka). Com base em TUDO que está cadastrado abaixo sobre o produto e a tarefa, escreva o QUESTIONÁRIO (briefing) que o cliente deve responder para que o profissional execute a tarefa sem precisar voltar a perguntar.

Regras:
- Em português do Brasil, perguntas claras, curtas e específicas ao que foi cadastrado (use os nomes de plataformas, entregas e etapas citados). Nada genérico demais.
- No máximo ${MAX_QUESTIONS} perguntas; só o que é realmente necessário. Perguntas essenciais são obrigatórias; as opcionais, não.
- Escolha o tipo certo: ${QUESTION_TYPES.join(", ")}. Para "selecao_unica" ou "selecao_multipla" traga de 2 a 8 opções reais. Use "arquivo" para logotipos/materiais e "url" para endereços.
- NUNCA peça senhas, tokens ou códigos de acesso (isso é feito por outro recurso da plataforma) e não repita acessos já listados.
- Não repita perguntas que já existem: ${existingLabels.length ? existingLabels.map((l) => `"${clip(l, 120)}"`).join("; ") : "(nenhuma ainda)"}.
- Inclua "help_text" curto só quando a pergunta puder gerar dúvida.

CADASTRO DO PRODUTO E DA TAREFA:
"""
${context}
"""`;
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      temperature: 0.4,
      maxOutputTokens: 4000,
      thinkingConfig: { thinkingBudget: 0 },
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: {
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                label: { type: "string" },
                question_type: { type: "string", enum: [...QUESTION_TYPES] },
                is_required: { type: "boolean" },
                help_text: { type: "string" },
                options: { type: "array", items: { type: "string" } },
              },
              required: ["label", "question_type", "is_required"],
            },
          },
        },
        required: ["questions"],
      },
    },
  });
  await recordAIUsage({ model, feature: "questionnaire-suggest", ...usageFromGeminiResponse(response) });
  const text = response.text;
  if (!text) return [];
  return (JSON.parse(text) as { questions?: RawSuggestion[] }).questions ?? [];
}

export class QuestionnaireAiError extends Error { constructor(message: string, public httpStatus = 422) { super(message); } }

/** Sugestão completa de questionário para uma tarefa (não salva nada). */
export async function suggestQuestionnaire(taskId: string, existingLabels: string[] = []): Promise<QuestionnaireSuggestion> {
  const c = await buildQuestionnaireContext(taskId);
  if (!c) throw new QuestionnaireAiError("Tarefa não encontrada.", 404);
  if (!c.hasContent) throw new QuestionnaireAiError("Preencha antes o título, a descrição ou as etapas do produto: a IA lê o que está cadastrado para montar as perguntas.");
  let raw: RawSuggestion[];
  try { raw = await generator(c.context, existingLabels); }
  catch (e: any) { throw new QuestionnaireAiError(e?.message ?? "Não foi possível usar a IA agora.", 502); }
  const questions = normalizeSuggestions(raw, existingLabels);
  if (questions.length === 0) throw new QuestionnaireAiError("A IA não devolveu perguntas utilizáveis. Tente de novo ou complete o cadastro do produto.", 502);
  return { name: `Briefing — ${c.taskName || c.productTitle}`.slice(0, 200), description: `Perguntas sugeridas pela IA a partir do cadastro de "${c.productTitle}". Revise antes de publicar.`, questions };
}
