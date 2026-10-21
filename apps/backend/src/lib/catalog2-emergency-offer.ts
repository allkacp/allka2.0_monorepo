// R21-11 (reunião 21/10): entrega rápida PÓS-COMPRA com aceite do profissional.
// Quando o produto exige o aceite (`emergency_executor_accept_required`), o pedido do cliente NÃO comprime o prazo na hora:
// a tarefa fica "aguardando_aceite" com um prazo de resposta; o profissional aceita (o prazo é comprimido) ou recusa
// (nada muda e o valor adicional é cancelado). Sem resposta no prazo, vale como recusa.
// Dinheiro: fatura ainda NÃO paga é cancelada; fatura já paga NÃO é estornada aqui (movimento financeiro) — fica marcada
// "ESTORNO PENDENTE" e o administrador é avisado para devolver pelo fluxo financeiro.
import type { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

export const EMERGENCY_DEFAULT_ACCEPT_HOURS = 24;
const OPEN_STAGE_STATUSES = ["PENDENTE", "AGUARDANDO_EXECUTOR", "EM_ANDAMENTO"];

export class EmergencyOfferError extends Error {
  constructor(message: string, public httpStatus = 422) { super(message); }
}

/** Novo prazo se a redução (em %) for aplicada sobre o tempo que falta até `due`. */
export function compressedDate(now: Date, due: Date, reductionPercent: number): Date {
  return new Date(now.getTime() + (due.getTime() - now.getTime()) * (1 - reductionPercent / 100));
}

async function alertUser(db: Db, userId: string | null | undefined, task: { id: string; title: string }, type: string, title: string, message: string) {
  if (!userId) return;
  await db.systemAlert.create({ data: { type, title, message, severity: "info", category: "alerta", entity_type: "project_task", entity_id: task.id, user_id: userId } }).catch(() => {});
}

/** Aplica a compressão do prazo (tarefa + etapas abertas). Usada quando o profissional aceita. */
async function applyCompression(db: Db, task: { id: string; due_date: Date | null; emergencial_reducao_percentual: number | null }, now: Date) {
  const reducao = task.emergencial_reducao_percentual ?? 0;
  const newDue = task.due_date && task.due_date > now ? compressedDate(now, task.due_date, reducao) : task.due_date;
  const stages = await db.projectTaskStage.findMany({ where: { project_task_id: task.id, status: { in: OPEN_STAGE_STATUSES } } });
  for (const st of stages) {
    if (st.prazo_execucao && st.prazo_execucao > now) await db.projectTaskStage.update({ where: { id: st.id }, data: { prazo_execucao: compressedDate(now, st.prazo_execucao, reducao) } });
  }
  return newDue;
}

/** Cancela o valor adicional (fatura pendente) ou marca o estorno pendente (fatura paga). */
async function undoCharge(db: Db, invoiceId: string | null, reason: string): Promise<"cancelada" | "estorno_pendente" | "sem_fatura"> {
  if (!invoiceId) return "sem_fatura";
  const inv = await db.invoice.findUnique({ where: { id: invoiceId }, select: { id: true, status: true, description: true } });
  if (!inv) return "sem_fatura";
  if (inv.status === "paid") {
    await db.invoice.update({ where: { id: inv.id }, data: { description: `${inv.description ?? ""} — ESTORNO PENDENTE (${reason})`.trim() } });
    return "estorno_pendente";
  }
  await db.invoice.update({ where: { id: inv.id }, data: { status: "cancelled", description: `${inv.description ?? ""} — cancelada (${reason})`.trim() } });
  return "cancelada";
}

export interface RespondResult { status: "aceita" | "recusada" | "expirada"; novo_due_date: Date | null; cobranca: "cancelada" | "estorno_pendente" | "sem_fatura" | null }

/**
 * Resposta do profissional (ou expiração automática). `by` = "executor" | "admin" | "system".
 * Só vale enquanto a tarefa está "aguardando_aceite".
 */
export async function respondEmergencyOffer(db: PrismaClient, taskId: string, accept: boolean, by: "executor" | "admin" | "system", now = new Date()): Promise<RespondResult> {
  const task = await db.projectTask.findUnique({
    where: { id: taskId },
    select: { id: true, title: true, project_id: true, due_date: true, emergencial_status: true, emergencial_reducao_percentual: true, emergencial_invoice_id: true, nomade_responsavel_id: true, emergencial_solicitada_por: true },
  });
  if (!task) throw new EmergencyOfferError("Tarefa não encontrada.", 404);
  if (task.emergencial_status !== "aguardando_aceite") throw new EmergencyOfferError("Não há pedido de entrega rápida aguardando resposta nesta tarefa.", 409);

  const expired = by === "system";
  if (accept) {
    const newDue = await applyCompression(db, task, now);
    await db.projectTask.update({ where: { id: task.id }, data: { due_date: newDue, emergencial_status: "aceita", emergencial_resposta_ate: null } });
    await alertUser(db, task.emergencial_solicitada_por, task, "entrega_emergencial_aceita", `Entrega rápida aceita: ${task.title}`, `O profissional aceitou a entrega rápida de "${task.title}". O novo prazo já vale.`);
    return { status: "aceita", novo_due_date: newDue, cobranca: null };
  }
  const cobranca = await undoCharge(db, task.emergencial_invoice_id, expired ? "sem resposta do profissional no prazo" : "o profissional recusou");
  // limpa a solicitação para o cliente poder pedir de novo (o histórico fica no status e na fatura).
  await db.projectTask.update({
    where: { id: task.id },
    data: { emergencial_status: expired ? "expirada" : "recusada", emergencial_resposta_ate: null, emergencial_solicitada_em: null, emergencial_invoice_id: null },
  });
  await alertUser(db, task.emergencial_solicitada_por, task, "entrega_emergencial_recusada", `Entrega rápida não realizada: ${task.title}`,
    `${expired ? "O profissional não respondeu no prazo" : "O profissional recusou"} a entrega rápida de "${task.title}". O prazo continua o mesmo. ${cobranca === "estorno_pendente" ? "O valor já foi pago: o estorno será feito pelo financeiro." : "O valor adicional foi cancelado."}`);
  if (cobranca === "estorno_pendente") {
    const admins = await db.user.findMany({ where: { role: "admin" }, select: { id: true }, take: 20 });
    for (const a of admins) await alertUser(db, a.id, task, "estorno_entrega_emergencial", `Estorno pendente: ${task.title}`, `A entrega rápida de "${task.title}" não foi realizada e o valor adicional já estava pago. Faça o estorno pelo financeiro.`);
  }
  return { status: expired ? "expirada" : "recusada", novo_due_date: task.due_date, cobranca };
}

/** Varredura: pedidos sem resposta no prazo viram recusa automática. Retorna quantos foram encerrados. */
export async function sweepEmergencyOffers(db: PrismaClient, now = new Date()): Promise<number> {
  const due = await db.projectTask.findMany({ where: { emergencial_status: "aguardando_aceite", emergencial_resposta_ate: { lt: now } }, select: { id: true }, take: 200 });
  let n = 0;
  for (const t of due) { try { await respondEmergencyOffer(db, t.id, false, "system", now); n++; } catch (e) { console.error("[emergency-offer] falha ao expirar", t.id, e); } }
  return n;
}
