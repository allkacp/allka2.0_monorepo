import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";
import { ensureWorkCalendar } from "./work-calendar";
import { addBusinessMinutes } from "./sla";
import { normalizeStepCycles, type StepCycleItem } from "./catalog2-ops";

// ─── MOTOR DAS ETAPAS EM CICLOS (23/10) ──────────────────────────────────────────────────────────────────────────────
// Uma etapa "em ciclos" (ex.: gestão semanal de campanhas por 30 dias) vira, no projeto, uma lista de ciclos. Regras combinadas com o dono do produto:
//  1. cada ciclo termina com uma ENTREGA (ex.: relatório) que o cliente aprova em um prazo curto (dias úteis, por ciclo);
//  2. o ciclo seguinte COMEÇA NA DATA CERTA, com ou sem aprovação do anterior — ninguém volta ao passado;
//  3. se o cliente REPROVA, o comentário dele vira ORIENTAÇÃO do ciclo seguinte; o ciclo reprovado NÃO reabre;
//  4. se o cliente não responde no prazo, o ciclo se encerra "sem resposta" e a etapa segue;
//  5. a etapa só FECHA depois que todos os ciclos estiverem encerrados e o último período tiver acabado.
// Os ciclos nascem quando a etapa é iniciada (iniciada_em). Todo o estado fica no banco (ProjectTaskStageCycle), relido a cada tick do worker:
// atraso ou reinício do servidor nunca perde nem duplica um ciclo.

type Db = PrismaClient | Prisma.TransactionClient;

export const CYCLE_STATUS = {
  AGENDADO: "agendado",
  EM_ANDAMENTO: "em_andamento",
  AGUARDANDO_APROVACAO: "aguardando_aprovacao",
  APROVADO: "aprovado",
  REPROVADO: "reprovado",
  SEM_RESPOSTA: "sem_resposta",
} as const;
export type CycleStatus = (typeof CYCLE_STATUS)[keyof typeof CYCLE_STATUS];
export const CYCLE_OPEN: CycleStatus[] = [CYCLE_STATUS.AGENDADO, CYCLE_STATUS.EM_ANDAMENTO, CYCLE_STATUS.AGUARDANDO_APROVACAO];
export const CYCLE_CLOSED: CycleStatus[] = [CYCLE_STATUS.APROVADO, CYCLE_STATUS.REPROVADO, CYCLE_STATUS.SEM_RESPOSTA];

export class CycleError extends Error {
  constructor(message: string, public httpStatus = 409) {
    super(message);
    this.name = "CycleError";
  }
}

const DAY_MS = 86_400_000;

/** Começo do dia (hora local do servidor) em que a etapa foi iniciada. */
function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export interface PlannedCycle {
  cycle_index: number;
  from_day: number;
  to_day: number;
  approval_window_days: number;
  hours: number | null;
  rule: string | null;
  starts_at: Date;
  ends_at: Date;
}

/**
 * Datas de cada ciclo a partir do início da etapa. O dia 1 é o dia em que a etapa começou (o ciclo 1 começa no instante em que ela começa);
 * o ciclo N começa à 00h do dia `from_day` e termina às 23h59 do dia `to_day`. Função pura.
 */
export function planCycles(startedAt: Date, items: StepCycleItem[]): PlannedCycle[] {
  const base = startOfDay(startedAt);
  return items.map((it, i) => {
    const startDay = new Date(base.getTime() + (it.from_day - 1) * DAY_MS);
    const endDay = new Date(base.getTime() + it.to_day * DAY_MS - 1);
    return {
      cycle_index: i + 1,
      from_day: it.from_day,
      to_day: it.to_day,
      approval_window_days: it.approval_window_days,
      hours: it.hours ?? null,
      rule: it.rule ?? null,
      starts_at: it.from_day === 1 ? startedAt : startDay,
      ends_at: endDay,
    };
  });
}

/** Lê a configuração de ciclos gravada na fotografia da etapa (config_snapshot.cycles). */
export function cyclesOfSnapshot(configSnapshot: string | null | undefined): StepCycleItem[] | null {
  if (!configSnapshot) return null;
  try {
    const parsed = JSON.parse(configSnapshot) as { cycles?: unknown };
    const norm = normalizeStepCycles(Array.isArray(parsed.cycles) ? { items: parsed.cycles } : parsed.cycles);
    return norm ? norm.items : null;
  } catch {
    return null;
  }
}

/** A etapa já pode fechar? Todos os ciclos encerrados e o último período já terminou. Função pura. */
export function etapaPodeFechar(cycles: { status: string; ends_at: Date }[], now: Date): boolean {
  if (cycles.length === 0) return false;
  if (cycles.some((c) => !(CYCLE_CLOSED as string[]).includes(c.status))) return false;
  const lastEnd = Math.max(...cycles.map((c) => c.ends_at.getTime()));
  return now.getTime() >= lastEnd;
}

/** Prazo de aprovação em DIAS ÚTEIS do calendário da plataforma (mesmo calendário dos prazos de aprovação por etapa). */
async function prazoDeAprovacao(db: Db, from: Date, dias: number): Promise<Date> {
  const cal = await ensureWorkCalendar(db);
  const perDay = Math.max(60, (cal.endMin ?? 1080) - (cal.startMin ?? 540));
  return addBusinessMinutes(from, dias * perDay);
}

/** Cria os ciclos da etapa quando ela já foi iniciada e ainda não tem ciclos (idempotente). */
export async function materializarCiclosDaEtapa(db: Db, stageId: string): Promise<number> {
  const stage = await db.projectTaskStage.findUnique({ where: { id: stageId }, select: { id: true, iniciada_em: true, config_snapshot: true, _count: { select: { cycles: true } } } });
  if (!stage || !stage.iniciada_em || stage._count.cycles > 0) return 0;
  const items = cyclesOfSnapshot(stage.config_snapshot);
  if (!items) return 0;
  const now = new Date();
  const plan = planCycles(stage.iniciada_em, items);
  await db.projectTaskStageCycle.createMany({
    data: plan.map((p) => ({ ...p, stage_id: stage.id, status: p.starts_at <= now ? CYCLE_STATUS.EM_ANDAMENTO : CYCLE_STATUS.AGENDADO })),
    skipDuplicates: true,
  });
  return plan.length;
}

async function carregarCiclo(db: Db, cycleId: string) {
  const c = await db.projectTaskStageCycle.findUnique({ where: { id: cycleId } });
  if (!c) throw new CycleError("Ciclo não encontrado.", 404);
  return c;
}

/** O executor entrega o ciclo: ele vai para a aprovação do cliente, que tem o prazo (dias úteis) configurado para aquele ciclo. */
export async function entregarCiclo(db: Db, cycleId: string, opts: { userId?: string; nota?: string | null } = {}) {
  const c = await carregarCiclo(db, cycleId);
  if (c.status === CYCLE_STATUS.AGENDADO) throw new CycleError(`O ciclo ${c.cycle_index} ainda não começou: ele abre no dia ${c.from_day} da etapa.`);
  if (c.status !== CYCLE_STATUS.EM_ANDAMENTO) throw new CycleError(`O ciclo ${c.cycle_index} já foi entregue ou encerrado.`);
  const agora = new Date();
  const due = await prazoDeAprovacao(db, agora, c.approval_window_days);
  return db.projectTaskStageCycle.update({
    where: { id: cycleId },
    data: { status: CYCLE_STATUS.AGUARDANDO_APROVACAO, delivered_at: agora, delivered_by: opts.userId ?? null, delivery_note: opts.nota?.trim() || null, approval_due_at: due },
  });
}

/**
 * O cliente aprova ou reprova a entrega do ciclo. Reprovar NUNCA reabre o ciclo: o comentário vira orientação do ciclo seguinte
 * (o próximo que ainda não terminou). Se não houver ciclo seguinte, o comentário fica só registrado.
 */
export async function decidirCiclo(db: Db, cycleId: string, opts: { decisao: "aprovar" | "reprovar"; comentario?: string | null; userId?: string }) {
  const c = await carregarCiclo(db, cycleId);
  if (c.status !== CYCLE_STATUS.AGUARDANDO_APROVACAO) throw new CycleError(`O ciclo ${c.cycle_index} não está aguardando aprovação.`);
  const comment = opts.comentario?.trim() || null;
  if (opts.decisao === "reprovar" && !comment) throw new CycleError("Ao reprovar, escreva o que precisa mudar: o comentário vai como orientação para o próximo ciclo.", 422);
  const agora = new Date();
  const decided = await db.projectTaskStageCycle.update({
    where: { id: cycleId },
    data: { status: opts.decisao === "aprovar" ? CYCLE_STATUS.APROVADO : CYCLE_STATUS.REPROVADO, decided_at: agora, decided_by: opts.userId ?? null, client_comment: comment },
  });
  let proximo: { id: string; cycle_index: number } | null = null;
  if (opts.decisao === "reprovar" && comment) {
    const next = await db.projectTaskStageCycle.findFirst({
      where: { stage_id: c.stage_id, cycle_index: { gt: c.cycle_index }, status: { in: [CYCLE_STATUS.AGENDADO, CYCLE_STATUS.EM_ANDAMENTO] } },
      orderBy: { cycle_index: "asc" },
    });
    if (next) {
      const guidance = [next.guidance_from_previous, `Ciclo ${c.cycle_index} (reprovado): ${comment}`].filter(Boolean).join("\n");
      await db.projectTaskStageCycle.update({ where: { id: next.id }, data: { guidance_from_previous: guidance } });
      proximo = { id: next.id, cycle_index: next.cycle_index };
    }
  }
  return { ciclo: decided, orientacaoVaiPara: proximo };
}

/** Lista os ciclos da etapa já com os sinais úteis para a tela (atrasado, pode entregar, pode decidir). */
export async function listarCiclos(db: Db, stageId: string, now = new Date()) {
  const rows = await db.projectTaskStageCycle.findMany({ where: { stage_id: stageId }, orderBy: { cycle_index: "asc" } });
  return rows.map((c) => ({
    ...c,
    atrasado: c.status === CYCLE_STATUS.EM_ANDAMENTO && now > c.ends_at,
    pode_entregar: c.status === CYCLE_STATUS.EM_ANDAMENTO,
    pode_decidir: c.status === CYCLE_STATUS.AGUARDANDO_APROVACAO,
  }));
}

/** Fecha a etapa pelo caminho normal do motor (qualificação do líder etc.) quando todos os ciclos terminaram. Falha de regra do motor não derruba o worker. */
async function fecharEtapa(stageId: string): Promise<boolean> {
  try {
    const { concluirEtapa } = await import("./stage-engine");
    await prisma.$transaction((tx) => concluirEtapa(tx, stageId, {}));
    return true;
  } catch (err) {
    console.error("[stage-cycles] não foi possível fechar a etapa", stageId, (err as Error)?.message ?? err);
    return false;
  }
}

export interface CycleTickResult { materializadas: number; abertos: number; sem_resposta: number; etapas_fechadas: number }

/** Um passo do motor (chamado pelo worker): cria ciclos das etapas iniciadas, abre o que chegou na data, encerra o que ficou sem resposta e fecha etapas prontas. */
export async function avancarCiclosOnce(now = new Date()): Promise<CycleTickResult> {
  const out: CycleTickResult = { materializadas: 0, abertos: 0, sem_resposta: 0, etapas_fechadas: 0 };
  // 1) etapas em ciclos que já começaram e ainda não têm os ciclos criados
  const novas = await prisma.projectTaskStage.findMany({
    where: { iniciada_em: { not: null }, status: { not: "CONCLUIDA" }, config_snapshot: { contains: "\"cycles\"" }, cycles: { none: {} } },
    select: { id: true }, take: 200,
  });
  for (const s of novas) out.materializadas += await materializarCiclosDaEtapa(prisma, s.id).catch((e) => { console.error("[stage-cycles] materializar", s.id, e); return 0; });
  // 2) ciclo cuja data chegou começa — com ou sem aprovação do anterior
  out.abertos = (await prisma.projectTaskStageCycle.updateMany({ where: { status: CYCLE_STATUS.AGENDADO, starts_at: { lte: now } }, data: { status: CYCLE_STATUS.EM_ANDAMENTO } })).count;
  // 3) o cliente não respondeu no prazo: o ciclo se encerra e a etapa segue
  out.sem_resposta = (await prisma.projectTaskStageCycle.updateMany({ where: { status: CYCLE_STATUS.AGUARDANDO_APROVACAO, approval_due_at: { lte: now } }, data: { status: CYCLE_STATUS.SEM_RESPOSTA, decided_at: now } })).count;
  // 4) etapa com todos os ciclos encerrados e o último período já terminado
  const candidatas = await prisma.projectTaskStage.findMany({
    where: { status: { notIn: ["CONCLUIDA", "EM_QUALIFICACAO", "EM_QUALIFICACAO_ESPECIALISTA", "EM_APROVACAO_CLIENTE"] }, cycles: { some: {}, none: { status: { in: CYCLE_OPEN } } } },
    select: { id: true, cycles: { select: { status: true, ends_at: true } } }, take: 200,
  });
  for (const e of candidatas) if (etapaPodeFechar(e.cycles, now) && (await fecharEtapa(e.id))) out.etapas_fechadas += 1;
  return out;
}

let running = false;
export async function avancarCiclosGuarded(): Promise<void> {
  if (running) return;
  running = true;
  try {
    await avancarCiclosOnce();
  } catch (err) {
    console.error("[stage-cycles] erro no worker", err);
  } finally {
    running = false;
  }
}
