// Resumo automático do que mudou numa versão do produto.
//
// 1) Calcula, de forma DETERMINÍSTICA, a lista de diferenças entre a versão e a
//    anterior (título/descrições, prazo, tarefas, etapas, variações, adicionais,
//    condições e preço).
// 2) Pede à IA (mesma integração Gemini do resto da plataforma) que escreva um
//    parágrafo curto a partir dessa lista. Sem IA/chave/erro, devolve a própria
//    lista em texto corrido — o resumo nunca fica em branco por causa da IA.
import { GoogleGenAI } from "@google/genai";
import { prisma } from "./prisma";
import { computePricing, defaultSelection } from "./catalog2-pricing";
import { recordAIUsage, usageFromGeminiResponse } from "./ai-usage-tracker";

const MODEL = "gemini-2.5-flash";

const INCLUDE = {
  variations: { include: { options: true } },
  addons: true,
  conditions: true,
  tasks: { include: { steps: { include: { specialty: true } }, specialty: true } },
} as const;

type Snap = NonNullable<Awaited<ReturnType<typeof load>>>;
async function load(id: string) {
  return prisma.catalog2ProductVersion.findUnique({ where: { id }, include: INCLUDE });
}

const brl = (n: number | null | undefined) => (n == null ? "sem valor" : `R$ ${n.toFixed(2).replace(".", ",")}`);
const norm = (t: string | null | undefined) => (t ?? "").replace(/\s+/g, " ").trim();

async function priceOf(versionId: string): Promise<{ amount: number | null; days: number | null }> {
  try {
    const p = await computePricing(versionId, await defaultSelection(versionId));
    return {
      amount: p.commercial_ready ? p.lines.commercial_final_price.amount : null,
      days: p.commercial_ready ? p.deadline.commercial_deadline_days : null,
    };
  } catch {
    return { amount: null, days: null };
  }
}

function listDiff(label: string, before: string[], after: string[], out: string[]) {
  const b = new Set(before);
  const a = new Set(after);
  const added = after.filter((x) => !b.has(x));
  const removed = before.filter((x) => !a.has(x));
  if (added.length) out.push(`${label} adicionad${label.endsWith("a") ? "a" : "o"}(s): ${added.join(", ")}`);
  if (removed.length) out.push(`${label} removid${label.endsWith("a") ? "a" : "o"}(s): ${removed.join(", ")}`);
}

export async function computeChangeList(cur: Snap, prev: Snap | null): Promise<string[]> {
  const out: string[] = [];
  if (!prev) return ["Primeira versão do produto."];

  if (norm(cur.title) !== norm(prev.title)) out.push(`Título comercial alterado de "${prev.title}" para "${cur.title}".`);
  if (norm(cur.summary) !== norm(prev.summary)) out.push("Descrição curta alterada.");
  if (norm(cur.full_description) !== norm(prev.full_description)) out.push("Descrição completa alterada.");
  if ((cur.base_commercial_deadline_days ?? null) !== (prev.base_commercial_deadline_days ?? null)) {
    out.push(`Prazo comercial base alterado de ${prev.base_commercial_deadline_days ?? "sem valor"} para ${cur.base_commercial_deadline_days ?? "sem valor"} dia(s).`);
  }

  // tarefas
  const pt = new Map(prev.tasks.map((t) => [t.key, t]));
  const ct = new Map(cur.tasks.map((t) => [t.key, t]));
  listDiff("Tarefa", prev.tasks.map((t) => t.name), cur.tasks.filter((t) => !pt.has(t.key)).map((t) => t.name).concat(cur.tasks.filter((t) => pt.has(t.key)).map((t) => t.name)), out);
  for (const t of cur.tasks) {
    const o = pt.get(t.key);
    if (!o) continue;
    const ch: string[] = [];
    if (o.name !== t.name) ch.push(`nome de "${o.name}" para "${t.name}"`);
    if ((o.estimated_minutes ?? null) !== (t.estimated_minutes ?? null)) ch.push(`tempo de ${o.estimated_minutes ?? "?"} para ${t.estimated_minutes ?? "?"} min`);
    if ((o.specialty?.name ?? null) !== (t.specialty?.name ?? null)) ch.push(`especialidade de ${o.specialty?.name ?? "nenhuma"} para ${t.specialty?.name ?? "nenhuma"}`);
    // etapas
    const ps = new Map(o.steps.map((s) => [s.key, s]));
    const cs = new Map(t.steps.map((s) => [s.key, s]));
    const addedSteps = t.steps.filter((s) => !ps.has(s.key)).map((s) => s.name);
    const removedSteps = o.steps.filter((s) => !cs.has(s.key)).map((s) => s.name);
    if (addedSteps.length) ch.push(`etapa(s) adicionada(s): ${addedSteps.join(", ")}`);
    if (removedSteps.length) ch.push(`etapa(s) removida(s): ${removedSteps.join(", ")}`);
    for (const s of t.steps) {
      const so = ps.get(s.key);
      if (!so) continue;
      if ((so.estimated_minutes ?? null) !== (s.estimated_minutes ?? null)) ch.push(`etapa "${s.name}": tempo de ${so.estimated_minutes ?? "?"} para ${s.estimated_minutes ?? "?"} min`);
      if ((so.specialty?.name ?? null) !== (s.specialty?.name ?? null)) ch.push(`etapa "${s.name}": especialidade de ${so.specialty?.name ?? "nenhuma"} para ${s.specialty?.name ?? "nenhuma"}`);
    }
    if (ch.length) out.push(`Tarefa "${t.name}": ${ch.join("; ")}.`);
  }
  const removedTasks = prev.tasks.filter((t) => !ct.has(t.key)).map((t) => t.name);
  const addedTasks = cur.tasks.filter((t) => !pt.has(t.key)).map((t) => t.name);
  // (listDiff acima já cobre nomes; para evitar duplicidade, refaz de forma simples)
  out.splice(0, out.length, ...out.filter((l) => !/^Tarefa (adicionada|removida)\(s\):/.test(l)));
  if (addedTasks.length) out.push(`Tarefa(s) adicionada(s): ${addedTasks.join(", ")}.`);
  if (removedTasks.length) out.push(`Tarefa(s) removida(s): ${removedTasks.join(", ")}.`);

  // variações / opções / adicionais / condições
  listDiff("Variação", prev.variations.map((v) => v.name), cur.variations.map((v) => v.name), out);
  const pv = new Map(prev.variations.map((v) => [v.key, v]));
  for (const v of cur.variations) {
    const o = pv.get(v.key);
    if (!o) continue;
    const before = o.options.map((x) => x.label);
    const after = v.options.map((x) => x.label);
    const added = after.filter((x) => !before.includes(x));
    const removed = before.filter((x) => !after.includes(x));
    if (added.length) out.push(`Variação "${v.name}": opção(ões) adicionada(s): ${added.join(", ")}.`);
    if (removed.length) out.push(`Variação "${v.name}": opção(ões) removida(s): ${removed.join(", ")}.`);
  }
  listDiff("Adicional", prev.addons.map((a) => a.name), cur.addons.map((a) => a.name), out);
  const pa = new Map(prev.addons.map((a) => [a.key, a]));
  for (const a of cur.addons) {
    const o = pa.get(a.key);
    if (o && (o.base_cost ?? null) !== (a.base_cost ?? null)) out.push(`Adicional "${a.name}": custo de ${brl(o.base_cost)} para ${brl(a.base_cost)}.`);
  }
  if (cur.conditions.length !== prev.conditions.length) out.push(`Condições: de ${prev.conditions.length} para ${cur.conditions.length}.`);

  // preço / prazo calculados
  const [p0, p1] = await Promise.all([priceOf(prev.id), priceOf(cur.id)]);
  if (p0.amount !== p1.amount) out.push(`Preço comercial calculado mudou de ${brl(p0.amount)} para ${brl(p1.amount)}.`);
  if (p0.days !== p1.days) out.push(`Prazo comercial calculado mudou de ${p0.days ?? "sem valor"} para ${p1.days ?? "sem valor"} dia(s).`);

  return out;
}

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "CHANGE_ME") throw new Error("GEMINI_API_KEY não configurada");
  if (!client) client = new GoogleGenAI({ apiKey });
  return client;
}

export interface ChangeSummaryResult {
  summary: string;
  source: "ia" | "automatico";
  changes: string[];
}

export async function summarizeVersionChanges(versionId: string): Promise<ChangeSummaryResult> {
  const cur = await load(versionId);
  if (!cur) throw Object.assign(new Error("Versão não encontrada."), { httpStatus: 404 });
  const prevRow = await prisma.catalog2ProductVersion.findFirst({
    where: { product_id: cur.product_id, version_number: { lt: cur.version_number } },
    orderBy: { version_number: "desc" },
    select: { id: true },
  });
  const prev = prevRow ? await load(prevRow.id) : null;
  const changes = await computeChangeList(cur, prev);
  if (changes.length === 0) return { summary: "Nenhuma alteração em relação à versão anterior.", source: "automatico", changes };

  const plain = changes.join(" ");
  if (process.env.TEST_DATABASE_URL) return { summary: plain, source: "automatico", changes };
  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: `Você escreve o "resumo da mudança" de uma nova versão de um produto de catálogo, para um administrador. Escreva em português, em texto corrido, no máximo 3 frases curtas, destacando primeiro o que afeta preço e prazo. Baseie-se ESTRITAMENTE na lista abaixo; não invente nada.

Produto: ${cur.title}

Mudanças:
${changes.map((c) => `- ${c}`).join("\n")}

Devolva só o texto, sem preâmbulo e sem markdown.`,
      config: { temperature: 0.2 },
    });
    await recordAIUsage({ model: MODEL, feature: "catalog2-version-change-summary", ...usageFromGeminiResponse(response) });
    const text = (response.text ?? "").trim();
    if (text) return { summary: text.slice(0, 500), source: "ia", changes };
  } catch (err) {
    console.error("[catalog2-change-summary] IA indisponível, usando resumo automático", err);
  }
  return { summary: plain.slice(0, 500), source: "automatico", changes };
}
