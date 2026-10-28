// Checklist da ETAPA gerado por IA: a IA lê o que já está cadastrado (produto, tarefa, todas as etapas, entregáveis e acessos), mais o que está
// sendo preenchido na própria etapa, e SUGERE os itens de execução, aprovação e qualificação. Nada é salvo aqui: a pessoa revisa, edita,
// remove ou mantém. Fontes opcionais: banco interno de documentos e pesquisa na internet.
import { GoogleGenAI } from "@google/genai";
import { prisma } from "./prisma";
import { recordAIUsage, usageFromGeminiResponse } from "./ai-usage-tracker";
import { getCategoryKnowledgeText } from "./ai-knowledge-base";
import { buildQuestionnaireContext } from "./catalog2-questionnaire-ai";

export const CHECKLIST_KINDS = ["execucao", "aprovacao", "qualificacao"] as const;
export type ChecklistKind = (typeof CHECKLIST_KINDS)[number];
export interface ChecklistSuggestionItem { kind: ChecklistKind; text: string; required: boolean }
export interface ChecklistDraft {
  name?: string; description?: string; completion_criteria?: string; orientations?: string;
  execution_mode?: string; specialty?: string; qualification?: boolean; client_approval?: string; internal?: boolean;
}
export interface ChecklistRequest {
  existing?: { kind: ChecklistKind; text: string }[];
  draft?: ChecklistDraft;
  /** quais abas gerar (as que a etapa usa) */
  kinds?: ChecklistKind[];
  use_internal?: boolean;
  use_internet?: boolean;
  notes?: string;
}
export type RawChecklist = { execucao?: unknown; aprovacao?: unknown; qualificacao?: unknown };

export const MAX_PER_KIND = 10;
const clip = (v: unknown, n: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

/** Falha de conexão com a IA (rede/DNS/tempo esgotado): vale tentar de novo uma vez antes de desistir. */
const isTransient = (e: any) => /fetch failed|ECONN|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|socket|network|timeout|503|429|UNAVAILABLE|overloaded/i.test(String(e?.message ?? "") + String(e?.cause?.code ?? ""));
export async function withRetry<T>(fn: () => Promise<T>, tries = 3, waitMs = 1200): Promise<T> {
  let last: any;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); } catch (e: any) { last = e; if (!isTransient(e) || i === tries - 1) break; await new Promise((r) => setTimeout(r, waitMs * (i + 1))); }
  }
  throw last;
}
export const friendlyAiError = (e: any): string => (isTransient(e) ? "Não consegui falar com a IA agora (falha de conexão). Tente de novo em alguns instantes." : e?.message ?? "Não foi possível usar a IA agora.");

export class ChecklistAiError extends Error { constructor(message: string, public httpStatus = 422) { super(message); } }

/** Normaliza a resposta da IA: só as abas pedidas, sem repetir o que já existe, texto curto, no máximo MAX_PER_KIND por aba. */
export function normalizeChecklist(raw: RawChecklist, kinds: readonly ChecklistKind[], existing: { kind: ChecklistKind; text: string }[] = []): ChecklistSuggestionItem[] {
  const out: ChecklistSuggestionItem[] = [];
  for (const kind of CHECKLIST_KINDS) {
    if (!kinds.includes(kind)) continue;
    const seen = new Set(existing.filter((e) => e.kind === kind).map((e) => norm(e.text)));
    const have = existing.filter((e) => e.kind === kind).length;
    const room = Math.max(0, MAX_PER_KIND - have);
    const list = Array.isArray(raw?.[kind]) ? (raw[kind] as unknown[]) : [];
    let n = 0;
    for (const it of list) {
      const text = clip(typeof it === "string" ? it : (it as any)?.text, 300);
      const key = norm(text);
      if (text.length < 6 || !key || seen.has(key)) continue;
      seen.add(key);
      out.push({ kind, text, required: typeof it === "object" && it !== null ? (it as any).required !== false : true });
      if (++n >= room) break;
    }
  }
  return out;
}

/** Tudo o que a IA lê: o cadastro do produto/tarefa (já usado pelo questionário) + a etapa e o rascunho dela. */
export async function buildChecklistContext(stepId: string, draft: ChecklistDraft = {}): Promise<{ context: string; stepName: string } | null> {
  const step: any = await prisma.catalog2TaskStep.findUnique({ where: { id: stepId }, select: { id: true, task_id: true, name: true, description: true, completion_criteria: true, execution_mode: true } }).catch(() => null);
  if (!step) return null;
  const base = await buildQuestionnaireContext(step.task_id);
  const lines: string[] = [];
  if (base) lines.push(base.context);
  lines.push("");
  lines.push("ETAPA QUE RECEBERÁ O CHECKLIST:");
  lines.push(`Nome: ${clip(draft.name || step.name, 200)}`);
  const desc = draft.description || step.description;
  if (desc) lines.push(`O que acontece nesta etapa: ${clip(desc, 1500)}`);
  const crit = draft.completion_criteria || step.completion_criteria;
  if (crit) lines.push(`Conclui quando: ${clip(crit, 800)}`);
  if (draft.orientations) lines.push(`Orientações já escritas para execução: ${clip(draft.orientations, 1500)}`);
  const mode = draft.execution_mode || step.execution_mode;
  if (mode) lines.push(`Quem executa: ${mode === "ia" ? "IA" : mode === "hibrido" ? "Humano + IA" : "Humano"}${draft.specialty ? ` (${clip(draft.specialty, 80)})` : ""}`);
  lines.push(`Qualificação (conferência do líder) nesta etapa: ${draft.qualification ? "SIM" : "NÃO"}`);
  if (draft.internal) lines.push("A etapa é INTERNA: o cliente não a vê nem aprova.");
  else if (draft.client_approval) lines.push(`Aprovação do cliente: ${clip(draft.client_approval, 60)}`);
  return { context: lines.join("\n"), stepName: clip(draft.name || step.name, 200) };
}

export type ChecklistGenerator = (context: string, req: Required<Pick<ChecklistRequest, "kinds">> & ChecklistRequest) => Promise<RawChecklist>;
let generator: ChecklistGenerator = geminiGenerator;
export function __setChecklistGeneratorForTests(g: ChecklistGenerator | null) { generator = g ?? geminiGenerator; }

const KIND_HELP: Record<ChecklistKind, string> = {
  execucao: "execucao = o que o EXECUTOR confere enquanto faz a etapa (passos de verificação do trabalho, antes de entregar)",
  aprovacao: "aprovacao = o que o CLIENTE ou o responsável confere para aprovar a entrega (critérios de aceite em linguagem simples)",
  qualificacao: "qualificacao = o que o LÍDER confere antes de liberar a entrega (qualidade, aderência ao combinado, evidências)",
};

async function geminiGenerator(context: string, req: Required<Pick<ChecklistRequest, "kinds">> & ChecklistRequest): Promise<RawChecklist> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "CHANGE_ME") throw new Error("A IA não está configurada neste ambiente (GEMINI_API_KEY).");
  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-2.5-flash";
  let research = "";
  if (req.use_internet) {
    // A pesquisa na internet roda separada (a busca do Gemini não combina com resposta estruturada).
    const r = await withRetry(() => ai.models.generateContent({
      model,
      contents: `Hoje é ${new Date().toISOString().slice(0, 10)}. Pesquise na internet boas práticas ATUAIS de conferência e controle de qualidade para a etapa abaixo (como profissionais da área verificam e como esse tipo de entrega costuma ser aprovada). Responda em português do Brasil, em tópicos curtos e objetivos, só com o que ajuda a montar um checklist.\n\n${context}`,
      config: { temperature: 0.3, maxOutputTokens: 3000, thinkingConfig: { thinkingBudget: 0 }, tools: [{ googleSearch: {} }] },
    }));
    await recordAIUsage({ model, feature: "checklist-research", ...usageFromGeminiResponse(r) });
    research = (r.text ?? "").trim().slice(0, 6000);
  }
  const kb = req.use_internal !== false ? await getCategoryKnowledgeText("produtos").catch(() => "") : "";
  const have = (k: ChecklistKind) => (req.existing ?? []).filter((e) => e.kind === k).map((e) => `"${clip(e.text, 120)}"`).join("; ") || "(nenhum)";
  const prompt = `Você é um líder de operações de uma plataforma de serviços de marketing (Allka). Monte o CHECKLIST da etapa descrita abaixo, usando TUDO que está cadastrado sobre o produto, a tarefa, as outras etapas, os entregáveis e os acessos.

Abas pedidas (gere só estas):
${req.kinds.map((k) => `- ${KIND_HELP[k]}`).join("\n")}

Regras:
- Português do Brasil, itens curtos (uma ação verificável por item, começando com verbo ou "Confirmar/Conferir…"), específicos ao que foi cadastrado. Nada genérico demais.
- No máximo ${MAX_PER_KIND} itens por aba, só o que realmente importa.
- Não repita itens que já existem. Já existem — ${req.kinds.map((k) => `${k}: ${have(k)}`).join(" | ")}.
- Não peça senhas nem tokens. Não invente prazos, números ou garantias que não estejam no cadastro.
${req.notes ? `- Instruções do autor (têm prioridade): ${clip(req.notes, 600)}\n` : ""}${research ? `\nPESQUISA NA INTERNET (use como apoio, sem copiar):\n"""\n${research}\n"""\n` : ""}${kb ? `\nMATERIAL INTERNO DE REFERÊNCIA (use quando fizer sentido, não cite nomes de arquivo):\n"""\n${kb.slice(0, 8000)}\n"""\n` : ""}
CADASTRO:
"""
${context}
"""`;
  const itemSchema = { type: "array", items: { type: "object", properties: { text: { type: "string" }, required: { type: "boolean" } }, required: ["text"] } };
  const response = await withRetry(() => ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      temperature: 0.4,
      maxOutputTokens: 4000,
      thinkingConfig: { thinkingBudget: 0 },
      responseMimeType: "application/json",
      responseSchema: { type: "object", properties: Object.fromEntries(req.kinds.map((k) => [k, itemSchema])), required: [...req.kinds] },
    },
  }));
  await recordAIUsage({ model, feature: "checklist-suggest", ...usageFromGeminiResponse(response) });
  const text = response.text;
  if (!text) return {};
  return JSON.parse(text) as RawChecklist;
}

/** Sugestão de checklist para uma etapa já cadastrada (não salva nada). */
export async function suggestChecklist(stepId: string, req: ChecklistRequest = {}): Promise<{ items: ChecklistSuggestionItem[]; read: string[] }> {
  const kinds = (req.kinds && req.kinds.length ? req.kinds : [...CHECKLIST_KINDS]).filter((k, i, a) => (CHECKLIST_KINDS as readonly string[]).includes(k) && a.indexOf(k) === i) as ChecklistKind[];
  const c = await buildChecklistContext(stepId, req.draft ?? {});
  if (!c) throw new ChecklistAiError("Etapa não encontrada.", 404);
  if (!clip(req.draft?.name, 5) && !c.stepName) throw new ChecklistAiError("Dê um nome à etapa antes: a IA monta o checklist a partir do que está cadastrado.");
  let raw: RawChecklist;
  try { raw = await generator(c.context, { ...req, kinds }); }
  catch (e: any) { console.error("[checklist-ai]", e?.message, e?.cause?.code ?? ""); throw new ChecklistAiError(friendlyAiError(e), 502); }
  const items = normalizeChecklist(raw, kinds, req.existing ?? []);
  if (items.length === 0) throw new ChecklistAiError("A IA não trouxe itens novos (talvez já esteja tudo coberto). Ajuste as instruções ou complete o cadastro da etapa.", 502);
  const read = ["produto", "tarefa", "etapas", "entregáveis", "acessos", "esta etapa"];
  if (req.use_internal !== false) read.push("banco interno");
  if (req.use_internet) read.push("internet");
  return { items, read };
}
