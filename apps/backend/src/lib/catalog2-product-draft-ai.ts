// P-8 (reunião 07/10): a IA conversa com o administrador e PREENCHE o produto inteiro a partir de uma explicação inicial.
// Ela só PROPÕE um rascunho (título, descrições, itens incluídos/não incluídos, requisitos, resumo dos entregáveis e uma sugestão de tarefas/etapas);
// nada é salvo até o administrador aplicar. Pode refinar por mensagens ("deixe mais curto", "inclua relatório mensal").
import { GoogleGenAI } from "@google/genai";
import { prisma } from "./prisma";
import { recordAIUsage, usageFromGeminiResponse } from "./ai-usage-tracker";

export interface ProductDraft {
  title: string;
  summary: string;
  full_description: string;
  included_items: string[];
  excluded_items: string[];
  client_requirements: string[];
  deliverables_summary: string[];
  suggested_tasks: { name: string; objective: string; steps: { name: string; description: string; completion_criteria: string }[] }[];
}
export interface DraftMessage { role: "user" | "assistant"; text: string }
export interface DraftResult { draft: ProductDraft; reply: string }
export type RawDraft = Partial<Record<keyof ProductDraft, unknown>> & { reply?: unknown };

const LIMITS = { title: 200, summary: 500, full: 2000, item: 300, items: 50, tasks: 6, steps: 8 };
const clip = (v: unknown, n: number) => String(v ?? "").replace(/\r/g, "").trim().slice(0, n);
const oneLine = (v: unknown, n: number) => clip(v, n).replace(/\s*\n+\s*/g, " ");
const list = (v: unknown) => Array.from(new Set((Array.isArray(v) ? v : []).map((x) => oneLine(x, LIMITS.item)).filter((x) => x.length >= 3))).slice(0, LIMITS.items);

/** Normaliza o que a IA devolveu (limites do cadastro, listas sem repetição, tarefas e etapas limitadas). */
export function normalizeDraft(raw: RawDraft, previous?: Partial<ProductDraft> | null): DraftResult {
  const keep = (k: keyof ProductDraft) => (previous as any)?.[k];
  const tasksRaw = Array.isArray(raw.suggested_tasks) ? raw.suggested_tasks : keep("suggested_tasks") ?? [];
  const draft: ProductDraft = {
    title: oneLine(raw.title ?? keep("title"), LIMITS.title),
    summary: oneLine(raw.summary ?? keep("summary"), LIMITS.summary),
    full_description: clip(raw.full_description ?? keep("full_description"), LIMITS.full),
    included_items: raw.included_items !== undefined ? list(raw.included_items) : list(keep("included_items")),
    excluded_items: raw.excluded_items !== undefined ? list(raw.excluded_items) : list(keep("excluded_items")),
    client_requirements: raw.client_requirements !== undefined ? list(raw.client_requirements) : list(keep("client_requirements")),
    deliverables_summary: raw.deliverables_summary !== undefined ? list(raw.deliverables_summary) : list(keep("deliverables_summary")),
    suggested_tasks: (tasksRaw as any[]).slice(0, LIMITS.tasks).map((t) => ({
      name: oneLine(t?.name, 160), objective: oneLine(t?.objective, 500),
      steps: (Array.isArray(t?.steps) ? t.steps : []).slice(0, LIMITS.steps).map((s: any) => ({ name: oneLine(s?.name, 160), description: oneLine(s?.description, 500), completion_criteria: oneLine(s?.completion_criteria, 300) })).filter((s: { name: string }) => s.name.length >= 3),
    })).filter((t: { name: string }) => t.name.length >= 3),
  };
  return { draft, reply: oneLine(raw.reply, 600) || "Montei uma proposta. Revise e, se quiser, peça ajustes." };
}

export type DraftGenerator = (input: { messages: DraftMessage[]; current: Partial<ProductDraft> | null; existing: { title: string; category: string | null } }) => Promise<RawDraft>;
let generator: DraftGenerator = geminiGenerator;
export function __setDraftGeneratorForTests(g: DraftGenerator | null) { generator = g ?? geminiGenerator; }

async function geminiGenerator(input: Parameters<DraftGenerator>[0]): Promise<RawDraft> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "CHANGE_ME") throw new Error("A IA não está configurada neste ambiente (GEMINI_API_KEY).");
  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-2.5-flash";
  const convo = input.messages.map((m) => `${m.role === "user" ? "ADMINISTRADOR" : "IA"}: ${m.text}`).join("\n");
  const lastUser = [...input.messages].reverse().find((m) => m.role === "user")?.text ?? "";
  const common = `Você ajuda um administrador a cadastrar um PRODUTO de serviço (marketing digital) na plataforma Allka. Escreva em português do Brasil, comercial e objetivo, usando SOMENTE o que a explicação sustenta (não invente números, prazos nem preços). Seja conciso e nunca repita frases.`;
  const ctx = `${input.existing.category ? `Categoria do produto no catálogo: ${input.existing.category}.\n` : ""}CONVERSA:\n${convo}`;
  // Uma chamada pequena por vez (uma única chamada grande fazia a IA entrar em repetição e estourar o limite). Cada uma tenta de novo se vier cortada.
  async function callJson(prompt: string, properties: Record<string, unknown>, maxTokens: number): Promise<RawDraft> {
    for (let attempt = 1; attempt <= 2; attempt++) {
      const response = await ai.models.generateContent({
        model, contents: prompt,
        config: { temperature: attempt === 1 ? 0.5 : 0.3, responseMimeType: "application/json", maxOutputTokens: maxTokens, thinkingConfig: { thinkingBudget: 0 }, responseSchema: { type: "object", properties, required: ["reply"] } },
      });
      await recordAIUsage({ model, feature: "product-draft", ...usageFromGeminiResponse(response) });
      const text = response.text;
      if (!text) return {};
      try { return JSON.parse(text) as RawDraft; }
      catch { console.error("[product-draft] resposta incompleta", { tentativa: attempt, fim: (response as any).candidates?.[0]?.finishReason, tamanho: text.length }); }
    }
    throw new Error("A IA devolveu uma resposta incompleta. Tente de novo ou detalhe menos o pedido.");
  }
  const arr = { type: "array", maxItems: 15, items: { type: "string", maxLength: 200 } };
  const textPrompt = `${common}
Monte o cadastro (sem tarefas): título comercial curto (até 80 caracteres), descrição curta (até ${LIMITS.summary}), descrição completa (até ${LIMITS.full}: benefícios, como funciona, diferenciais) e as listas itens incluídos, itens NÃO incluídos, requisitos do cliente e resumo dos entregáveis (itens curtos, de 3 a ${LIMITS.item} caracteres).
${input.current ? "Já existe um rascunho: aplique os ajustes pedidos e devolva SOMENTE os campos que mudaram (omita os demais; nós mantemos o resto)." : "Preencha TODOS esses campos."}
Em "reply", responda em 1 ou 2 frases o que montou/alterou e o que ainda falta informar.
${input.current ? `RASCUNHO ATUAL (JSON): ${JSON.stringify({ ...input.current, suggested_tasks: undefined }).slice(0, 6000)}\n` : ""}${ctx}`;
  const base = await callJson(textPrompt, {
    reply: { type: "string", maxLength: 400 }, title: { type: "string", maxLength: 100 }, summary: { type: "string", maxLength: 500 }, full_description: { type: "string", maxLength: 2000 },
    included_items: arr, excluded_items: arr, client_requirements: arr, deliverables_summary: arr,
  }, 4000);
  // Tarefas e etapas: na primeira vez, ou quando o administrador pede para mexer nelas.
  const wantsTasks = !input.current?.suggested_tasks?.length || /tarefa|etapa/i.test(lastUser);
  if (wantsTasks) {
    const tasksPrompt = `${common}
Sugira de 1 a ${LIMITS.tasks} TAREFAS para executar este produto, cada uma com 2 a ${LIMITS.steps} etapas (nome curto, descrição curta e critério de conclusão curto).
Produto: ${base.title ?? input.current?.title ?? ""}. ${base.summary ?? input.current?.summary ?? ""}
${input.current?.suggested_tasks?.length ? `TAREFAS ATUAIS (JSON): ${JSON.stringify(input.current.suggested_tasks).slice(0, 4000)}\nAplique os ajustes pedidos e devolva a lista completa.\n` : ""}${ctx}`;
    const step = { type: "object", properties: { name: { type: "string", maxLength: 120 }, description: { type: "string", maxLength: 300 }, completion_criteria: { type: "string", maxLength: 200 } }, required: ["name"] };
    const t = await callJson(tasksPrompt, { reply: { type: "string", maxLength: 200 }, suggested_tasks: { type: "array", items: { type: "object", properties: { name: { type: "string", maxLength: 120 }, objective: { type: "string", maxLength: 300 }, steps: { type: "array", items: step } }, required: ["name"] } } }, 3500);
    if (Array.isArray(t.suggested_tasks)) base.suggested_tasks = t.suggested_tasks;
  }
  return base;
}

export class ProductDraftError extends Error { constructor(message: string, public httpStatus = 422) { super(message); } }

/** Uma rodada da conversa: devolve o rascunho atualizado e a resposta da IA (não grava nada). */
export async function draftProductWithAI(productId: string, messagesIn: DraftMessage[], current: Partial<ProductDraft> | null): Promise<DraftResult> {
  const messages = messagesIn.map((m) => ({ role: m.role, text: clip(m.text, 6000) })).filter((m) => m.text).slice(-12);
  if (!messages.some((m) => m.role === "user")) throw new ProductDraftError("Conte para a IA o que é o produto antes de gerar.");
  const p = await prisma.catalog2Product.findUnique({ where: { id: productId }, select: { internal_name: true, category: { select: { name: true } } } });
  if (!p) throw new ProductDraftError("Produto não encontrado.", 404);
  let raw: RawDraft;
  try { raw = await generator({ messages, current, existing: { title: p.internal_name, category: p.category?.name ?? null } }); }
  catch (e: any) { throw new ProductDraftError(e?.message ?? "Não foi possível usar a IA agora.", 502); }
  const out = normalizeDraft(raw, current);
  if (!out.draft.title && !out.draft.full_description) throw new ProductDraftError("A IA não devolveu um rascunho utilizável. Detalhe melhor o produto e tente de novo.", 502);
  return out;
}
