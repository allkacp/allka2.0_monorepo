// D-2 (reunião 07/10): produto "sob consulta" não contrata direto — o cliente SOLICITA ORÇAMENTO respondendo ao questionário do produto;
// a equipe responde com valor e prazo (proposta); o cliente aprova ou recusa. Este módulo guarda as regras puras e os avisos.
import { prisma } from "./prisma";
import { parseOptions } from "./catalog2-question-types";

export interface RequestQuestion { id: string; group: string; label: string; is_required: boolean; question_type: string; help_text: string | null; options: { value: string; label: string }[] }
export interface RequestAnswer { question_id: string; label: string; question_type: string; group: string; answer: string }

/** Perguntas que o CLIENTE responde ao pedir orçamento: os questionários das tarefas da versão (só as visíveis ao cliente). */
export async function loadRequestQuestionnaire(versionId: string): Promise<RequestQuestion[]> {
  const tasks = await prisma.catalog2Task.findMany({
    where: { version_id: versionId },
    orderBy: { sort_order: "asc" },
    select: { name: true, questionnaire: { select: { questions: { orderBy: { sort_order: "asc" } } } } },
  });
  const out: RequestQuestion[] = [];
  for (const t of tasks) {
    for (const q of t.questionnaire?.questions ?? []) {
      if ((q.visibility ?? "client") !== "client") continue;
      out.push({ id: q.id, group: t.name, label: q.label, is_required: q.is_required, question_type: q.question_type, help_text: q.help_text ?? null, options: parseOptions(q.options_json) });
    }
  }
  return out;
}

const MULTI = new Set(["selecao_multipla"]);
const SELECT = new Set(["selecao_unica", "selecao_multipla"]);
const clip = (v: string, n: number) => v.replace(/\r/g, "").trim().slice(0, n);

/** Confere as respostas do cliente: obrigatórias preenchidas, escolhas dentro das opções, números e e-mails válidos. */
export function validateRequestAnswers(questions: RequestQuestion[], raw: Record<string, unknown> | null | undefined): { answers: RequestAnswer[]; errors: string[] } {
  const errors: string[] = [];
  const answers: RequestAnswer[] = [];
  for (const q of questions) {
    const v = raw?.[q.id];
    const text = Array.isArray(v) ? v.map((x) => clip(String(x), 500)).filter(Boolean).join(", ") : clip(String(v ?? ""), 4000);
    if (!text) { if (q.is_required) errors.push(`Responda: ${q.label}`); continue; }
    if (SELECT.has(q.question_type) && q.options.length) {
      const allowed = new Set(q.options.flatMap((o) => [o.value.toLowerCase(), o.label.toLowerCase()]));
      const picked = (MULTI.has(q.question_type) ? (Array.isArray(v) ? v.map(String) : text.split(",")) : [text]).map((x) => x.trim().toLowerCase()).filter(Boolean);
      if (picked.some((p) => !allowed.has(p))) { errors.push(`Resposta fora das opções: ${q.label}`); continue; }
    }
    if ((q.question_type === "numero" || q.question_type === "moeda") && !Number.isFinite(Number(text.replace(",", ".")))) { errors.push(`Informe um número: ${q.label}`); continue; }
    if (q.question_type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) { errors.push(`Informe um e-mail válido: ${q.label}`); continue; }
    answers.push({ question_id: q.id, label: q.label, question_type: q.question_type, group: q.group, answer: text });
  }
  return { answers, errors };
}

export const OPEN_REQUEST_STATUSES = ["novo", "em_analise", "aguardando_cliente", "proposta_preparada", "proposta_enviada"];
/** O cliente só enxerga valor e prazo depois que a equipe ENVIA a proposta. */
export const PROPOSAL_VISIBLE_STATUSES = ["proposta_enviada", "aprovado", "recusado", "expirado"];

/** Avisa a administração (todos os administradores ativos). Nunca lança. */
export async function notifyAdmins(title: string, message: string, entityId: string): Promise<void> {
  try {
    const admins = await prisma.user.findMany({ where: { is_active: true, OR: [{ role: "admin" }, { account_type: "admin" }] }, select: { id: true }, take: 50 });
    if (admins.length === 0) return;
    await prisma.systemAlert.createMany({ data: admins.map((a) => ({ type: "pedido_orcamento", title, message, severity: "info", category: "alerta", entity_type: "commercial_request", entity_id: entityId, user_id: a.id, action_url: "/admin/pedidos-comerciais" })) });
  } catch (e) { console.error("[commercial-flow] avisar administração:", e); }
}
export async function notifyUser(userId: string, title: string, message: string, entityId: string): Promise<void> {
  try {
    await prisma.systemAlert.create({ data: { type: "pedido_orcamento", title, message, severity: "info", category: "alerta", entity_type: "commercial_request", entity_id: entityId, user_id: userId, action_url: "/company/catalogo-produtos" } });
  } catch (e) { console.error("[commercial-flow] avisar cliente:", e); }
}
