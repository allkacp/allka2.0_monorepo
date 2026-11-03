// P-8 (reunião 07/10): a IA conversa com o administrador e PREENCHE o produto inteiro a partir de uma explicação inicial.
// Ela só PROPÕE um rascunho (título, descrições, itens incluídos/não incluídos, requisitos, resumo dos entregáveis e uma sugestão de tarefas/etapas);
// nada é salvo até o administrador aplicar. Pode refinar por mensagens ("deixe mais curto", "inclua relatório mensal").
import { GoogleGenAI, type GenerateContentParameters, type GenerateContentResponse } from "@google/genai";
import { prisma } from "./prisma";
import { recordAIUsage, usageFromGeminiResponse } from "./ai-usage-tracker";

export interface ProductDraft {
  target_audience?: string; commercial_objective?: string; scope?: string; client_info?: string;
  results_disclaimer?: string; change_policy?: string; internal_notes?: string;
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
export const PRODUCT_DRAFT_TEXT_LIMITS = { target_audience: 1000, commercial_objective: 1000, scope: 4000, client_info: 4000, results_disclaimer: 1000, change_policy: 2000, internal_notes: 4000 } as const;
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
  for (const key of Object.keys(PRODUCT_DRAFT_TEXT_LIMITS) as (keyof typeof PRODUCT_DRAFT_TEXT_LIMITS)[]) {
    if (raw[key] !== undefined || keep(key) !== undefined) draft[key] = clip(raw[key] ?? keep(key), PRODUCT_DRAFT_TEXT_LIMITS[key]);
  }
  return { draft, reply: oneLine(raw.reply, 600) || "Montei uma proposta. Revise e, se quiser, peça ajustes." };
}

export type DraftGenerator = (input: { messages: DraftMessage[]; current: Partial<ProductDraft> | null; existing: { title: string; category: string | null; guides?: { title: string; content: string }[] } }) => Promise<RawDraft>;

const GUIDES_BUDGET = 12000;
/** R21-18: monta o bloco de guias/métodos ativos que a IA deve seguir (limitado para não estourar o prompt). */
export function guidesPromptBlock(guides: { title: string; content: string }[] | undefined): string {
  if (!guides?.length) return "";
  let left = GUIDES_BUDGET; const parts: string[] = [];
  for (const g of guides) { if (left <= 200) break; const body = g.content.trim().slice(0, left - g.title.length - 20); parts.push(`### ${g.title}\n${body}`); left -= body.length + g.title.length + 20; }
  return `GUIAS E MÉTODOS DA ALLKA (siga estas instruções ao montar o cadastro; elas têm prioridade sobre suposições suas):\n${parts.join("\n\n")}\n\n`;
}
let generator: DraftGenerator = geminiGenerator;
export function __setDraftGeneratorForTests(g: DraftGenerator | null) { generator = g ?? geminiGenerator; }

async function geminiGenerator(input: Parameters<DraftGenerator>[0]): Promise<RawDraft> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "CHANGE_ME") throw new Error("A IA não está configurada neste ambiente (GEMINI_API_KEY).");
  const ai = new GoogleGenAI({ apiKey });
  return generateDraftWithClient(input, request => ai.models.generateContent(request), response =>
    recordAIUsage({ model: "gemini-2.5-flash", feature: "product-draft", ...usageFromGeminiResponse(response) }));
}

/** Mesma geração de produção, com transporte injetável para testar cortes/escopo sem gastar IA. */
export async function generateDraftWithClient(
  input: Parameters<DraftGenerator>[0],
  generate: (request: GenerateContentParameters) => Promise<GenerateContentResponse>,
  record: (response: GenerateContentResponse) => Promise<unknown> = async () => {},
): Promise<RawDraft> {
  const model = "gemini-2.5-flash";
  const convo = input.messages.map((m) => `${m.role === "user" ? "ADMINISTRADOR" : "IA"}: ${m.text}`).join("\n");
  const lastMessage = [...input.messages].reverse().find((m) => m.role === "user")?.text ?? "";
  // O editor prefixa o contexto antes de "Pedido:". Mencionar etapas nesse contexto
  // não é uma ordem para gerar tarefas novas nem para reescrever o cadastro inteiro.
  const lastUser = lastMessage.includes("\nPedido: ") ? lastMessage.slice(lastMessage.lastIndexOf("\nPedido: ") + 9) : lastMessage;
  const common = `Você ajuda um administrador a cadastrar um PRODUTO de serviço (marketing digital) na plataforma Allka. Escreva em português do Brasil, comercial e objetivo, usando SOMENTE o que a explicação sustenta (não invente números, prazos nem preços). Seja conciso e nunca repita frases.`;
  const ctx = `${guidesPromptBlock(input.existing.guides)}${input.existing.category ? `Categoria do produto no catálogo: ${input.existing.category}.\n` : ""}CONVERSA:\n${convo}`;
  // Uma chamada pequena por vez (uma única chamada grande fazia a IA entrar em repetição e estourar o limite). Cada uma tenta de novo se vier cortada.
  async function callJson(prompt: string, properties: Record<string, unknown>, maxTokens: number): Promise<RawDraft> {
    for (let attempt = 1; attempt <= 2; attempt++) {
      const response = await generate({
        model, contents: `${prompt}\nRetorne apenas as propriedades do esquema, uma única vez cada. Não copie o contexto. Textos curtos, sem repetição.${attempt > 1 ? " A tentativa anterior veio cortada: resuma drasticamente e devolva um objeto JSON completo." : ""}`,
        config: { temperature: attempt === 1 ? 0.3 : 0.1, responseMimeType: "application/json", maxOutputTokens: maxTokens, thinkingConfig: { thinkingBudget: 0 }, responseJsonSchema: { type: "object", properties, additionalProperties: false, required: ["reply"] } },
      });
      await record(response);
      const text = response.text;
      try {
        if (response.candidates?.[0]?.finishReason !== "STOP" || !text) throw new Error("Resposta não concluída");
        const parsed = JSON.parse(text);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || typeof parsed.reply !== "string") throw new Error("Objeto inválido");
        // Defesa adicional: a IA nunca devolve configurações ou campos fora desta chamada.
        return Object.fromEntries(Object.entries(parsed).filter(([key]) => Object.hasOwn(properties, key))) as RawDraft;
      }
      catch { console.error("[product-draft] resposta incompleta", { tentativa: attempt, fim: response.candidates?.[0]?.finishReason, tamanho: text?.length ?? 0 }); }
    }
    throw new Error("A IA devolveu uma resposta incompleta. Tente de novo ou detalhe menos o pedido.");
  }
  const commercialLabels: Record<keyof typeof PRODUCT_DRAFT_TEXT_LIMITS, RegExp> = {
    target_audience: /p[uú]blico[- ]alvo|target_audience/i,
    commercial_objective: /objetivo|promessa|commercial_objective/i,
    scope: /escopo|\bscope\b/i,
    client_info: /informa[çc][õo]es do cliente|materiais|client_info/i,
    results_disclaimer: /aviso de resultados|results_disclaimer/i,
    change_policy: /pol[ií]tica de altera[çc][õo]es|change_policy/i,
    internal_notes: /observa[çc][õo]es internas|internal_notes/i,
  };
  const requestedCommercial = (Object.keys(commercialLabels) as (keyof typeof PRODUCT_DRAFT_TEXT_LIMITS)[]).filter(key => commercialLabels[key].test(lastUser));
  if (/\b(somente|apenas|s[oó])\b/i.test(lastUser) && requestedCommercial.length > 0) {
    // Um ajuste pontual não deve fazer três chamadas amplas nem sugerir novas tarefas.
    return callJson(`${common}\nPedido pontual: proponha SOMENTE ${requestedCommercial.join(", ")}. Cada texto deve ter no máximo duas frases, até 500 caracteres. Em reply explique em uma frase. Preserve o restante; use tarefas/etapas apenas como contexto, não como itens a gerar.\nCADASTRO ATUAL: ${JSON.stringify(input.current).slice(0, 12000)}\n${ctx}`,
      { reply: { type: "string" }, ...Object.fromEntries(requestedCommercial.map(key => [key, { type: "string" }])) }, 1800);
  }
  const arr = { type: "array", maxItems: 15, items: { type: "string", maxLength: 200 } };
  const textPrompt = `${common}
Monte o cadastro (sem tarefas): título comercial curto (até 80 caracteres), descrição curta (até ${LIMITS.summary}), descrição completa (até ${LIMITS.full}: benefícios, como funciona, diferenciais) e as listas itens incluídos, itens NÃO incluídos, requisitos do cliente e resumo dos entregáveis (itens curtos, de 3 a ${LIMITS.item} caracteres).
${input.current ? "Já existe um rascunho: aplique os ajustes pedidos e devolva SOMENTE os campos que mudaram (omita os demais; nós mantemos o resto)." : "Preencha TODOS esses campos."}
Em "reply", responda em 1 ou 2 frases o que montou/alterou e o que ainda falta informar. Se o pedido ou o anexo tiver ambiguidade (ex.: o que está incluído, prazos, quantidades, quem entrega), NÃO invente: deixe o campo em branco e faça de 1 a 3 perguntas curtas no "reply" para o administrador responder.
${input.current ? `RASCUNHO ATUAL (JSON): ${JSON.stringify({ ...input.current, suggested_tasks: undefined }).slice(0, 6000)}\n` : ""}${ctx}`;
  const base = await callJson(textPrompt, {
    reply: { type: "string", maxLength: 400 }, title: { type: "string", maxLength: 100 }, summary: { type: "string", maxLength: 500 }, full_description: { type: "string", maxLength: 2000 },
    included_items: arr, excluded_items: arr, client_requirements: arr, deliverables_summary: arr,
  }, 4000);
  // The experimental form requests the seven additional textual fields explicitly.
  // Keep a separate small call; legacy clients keep the original two-call behavior.
  const commercialKeys = Object.keys(PRODUCT_DRAFT_TEXT_LIMITS) as (keyof typeof PRODUCT_DRAFT_TEXT_LIMITS)[];
  if (commercialKeys.some(key => Object.prototype.hasOwnProperty.call(input.current ?? {}, key))) {
    const extra = await callJson(`${common}
Complete os textos comerciais vazios ou os ajustes pedidos: target_audience (público-alvo), commercial_objective (objetivo sem prometer resultados), scope (escopo), client_info (materiais/informações necessários), results_disclaimer (limites dos resultados), change_policy (política de alterações) e internal_notes (observações apenas internas).
Seja curto, até 500 caracteres por campo. Não invente quantidades, políticas, valores, prazos ou fatos ausentes: deixe em branco e peça esclarecimento no reply. Preserve o que já está preenchido, salvo pedido explícito de substituição.
Dados comerciais existentes: ${JSON.stringify(Object.fromEntries(commercialKeys.map(key => [key, input.current?.[key]])))}
Produto: ${base.title ?? input.current?.title ?? ""}. ${base.summary ?? input.current?.summary ?? ""}
${ctx}`, { reply: { type: "string", maxLength: 300 }, ...Object.fromEntries(commercialKeys.map(key => [key, { type: "string", maxLength: 500 }])) }, 3000);
    for (const key of commercialKeys) if (typeof extra[key] === "string") base[key] = extra[key];
    if (extra.reply) base.reply = [base.reply, extra.reply].filter(Boolean).join(" ");
  }
  // Tarefas e etapas: na primeira vez, ou quando o administrador pede para mexer nelas.
  const wantsTasks = (!input.current?.suggested_tasks?.length && !input.current?.title)
    || /produto\s+(?:completo|inteiro)|todos\s+os\s+campos|preench(?:a|er)\s+(?:o\s+)?produto/i.test(lastUser)
    || /(?:crie|criar|gere|gerar|sugira|sugerir|ajuste|ajustar|altere|alterar|inclua|incluir|revise|revisar)\s+(?:as?\s+|os?\s+)?(?:tarefas?|etapas?)/i.test(lastUser);
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
  const guides = await prisma.catalog2AiGuide.findMany({ where: { is_active: true }, orderBy: { created_at: "asc" }, select: { title: true, content: true } });
  let raw: RawDraft;
  try { raw = await generator({ messages, current, existing: { title: p.internal_name, category: p.category?.name ?? null, guides } }); }
  catch (e: any) { throw new ProductDraftError(e?.message ?? "Não foi possível usar a IA agora.", 502); }
  const out = normalizeDraft(raw, current);
  if (!out.draft.title && !out.draft.full_description) throw new ProductDraftError("A IA não devolveu um rascunho utilizável. Detalhe melhor o produto e tente de novo.", 502);
  return out;
}
