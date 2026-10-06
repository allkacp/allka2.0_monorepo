// Histórico real de uma etapa (2026-10-06): a partir das etapas JÁ executadas em projetos, resume quanto tempo levou de verdade contra o
// estimado, atrasos, refações, custo e uso de IA — por tipo de execução (humano / IA / híbrido) e por quem executou. Automático: lê o que
// foi contratado e entregue; etapa nova (sem execuções) devolve vazio.
import type { PrismaClient } from "@prisma/client";

export interface StageRow {
  status: string;
  executor_type: string;
  horas_execucao: number | null;
  valor_nomade: number | null;
  prazo_execucao: Date | null;
  iniciada_em: Date | null;
  concluida_em: Date | null;
  rodada_ajuste: number;
  config_snapshot: string | null;
}

export interface PerfSummary {
  total: number;
  concluidas: number;
  em_andamento: number;
  /** horas estimadas médias (as da época de cada execução) */
  avg_estimated_hours: number | null;
  /** horas reais médias (da abertura à conclusão, em horas corridas) */
  avg_actual_hours: number | null;
  /** real ÷ estimado: 1 = no estimado; 1,3 = 30% a mais */
  actual_vs_estimated: number | null;
  on_time_rate: number | null;
  late_count: number;
  avg_delay_hours: number | null;
  avg_rework_rounds: number | null;
  rework_rate: number | null;
  avg_cost: number | null;
  last_executed_at: string | null;
}

export interface PerfResult extends PerfSummary {
  by_execution: Record<string, PerfSummary>;
  by_executor: Record<string, PerfSummary>;
  signals: string[];
}

const HOUR = 3600000;
const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 100) / 100 : null);
const r2 = (n: number) => Math.round(n * 100) / 100;

export function executionModeOf(snapshot: string | null): string {
  if (!snapshot) return "humano";
  try { const v = JSON.parse(snapshot)?.execution_mode; return typeof v === "string" && v ? v : "humano"; } catch { return "humano"; }
}

export function summarizeStages(rows: StageRow[]): PerfSummary {
  const done = rows.filter((r) => r.status === "CONCLUIDA");
  const open = rows.filter((r) => !["CONCLUIDA", "CANCELADA", "DISPENSADA"].includes(r.status) && r.iniciada_em);
  const timed = done.filter((r) => r.iniciada_em && r.concluida_em);
  const actual = timed.map((r) => (r.concluida_em!.getTime() - r.iniciada_em!.getTime()) / HOUR);
  const est = timed.filter((r) => r.horas_execucao != null).map((r) => r.horas_execucao as number);
  const withPrazo = done.filter((r) => r.prazo_execucao && r.concluida_em);
  const late = withPrazo.filter((r) => r.concluida_em!.getTime() > r.prazo_execucao!.getTime());
  const aA = avg(actual), aE = avg(est);
  const last = done.map((r) => r.concluida_em?.getTime() ?? 0).reduce((a, b) => Math.max(a, b), 0);
  return {
    total: rows.length,
    concluidas: done.length,
    em_andamento: open.length,
    avg_estimated_hours: aE,
    avg_actual_hours: aA,
    actual_vs_estimated: aA != null && aE ? r2(aA / aE) : null,
    on_time_rate: withPrazo.length ? r2((withPrazo.length - late.length) / withPrazo.length) : null,
    late_count: late.length,
    avg_delay_hours: late.length ? avg(late.map((r) => (r.concluida_em!.getTime() - r.prazo_execucao!.getTime()) / HOUR)) : null,
    avg_rework_rounds: done.length ? avg(done.map((r) => r.rodada_ajuste)) : null,
    rework_rate: done.length ? r2(done.filter((r) => r.rodada_ajuste > 0).length / done.length) : null,
    avg_cost: avg(done.filter((r) => r.valor_nomade != null).map((r) => r.valor_nomade as number)),
    last_executed_at: last ? new Date(last).toISOString() : null,
  };
}

/** Leituras em linguagem simples para decidir se a etapa está boa e viável. Só fala quando há amostra mínima (3 execuções). */
export function perfSignals(s: PerfSummary): string[] {
  const out: string[] = [];
  if (s.concluidas === 0) return ["Ainda não há execuções concluídas desta etapa."];
  if (s.concluidas < 3) out.push(`Poucas execuções (${s.concluidas}): leia os números com cautela.`);
  if (s.actual_vs_estimated != null) {
    if (s.actual_vs_estimated > 1.15) out.push(`Leva ${Math.round((s.actual_vs_estimated - 1) * 100)}% a MAIS que o estimado — considere aumentar as horas da etapa.`);
    else if (s.actual_vs_estimated < 0.8) out.push(`Leva ${Math.round((1 - s.actual_vs_estimated) * 100)}% a MENOS que o estimado — dá para reduzir horas/preço.`);
    else out.push("Duração real dentro do estimado.");
  }
  if (s.on_time_rate != null && s.on_time_rate < 0.8) out.push(`Só ${Math.round(s.on_time_rate * 100)}% entregues no prazo (atraso médio ${s.avg_delay_hours ?? 0} h).`);
  if (s.rework_rate != null && s.rework_rate > 0.3) out.push(`${Math.round(s.rework_rate * 100)}% das execuções precisaram de ajuste/refação.`);
  return out;
}

export function buildPerformance(rows: StageRow[]): PerfResult {
  const base = summarizeStages(rows);
  const group = (key: (r: StageRow) => string) => {
    const m = new Map<string, StageRow[]>();
    for (const r of rows) m.set(key(r), [...(m.get(key(r)) ?? []), r]);
    return Object.fromEntries([...m.entries()].map(([k, v]) => [k, summarizeStages(v)]));
  };
  return { ...base, by_execution: group((r) => executionModeOf(r.config_snapshot)), by_executor: group((r) => r.executor_type), signals: perfSignals(base) };
}

const SELECT = { status: true, executor_type: true, horas_execucao: true, valor_nomade: true, prazo_execucao: true, iniciada_em: true, concluida_em: true, rodada_ajuste: true, config_snapshot: true } as const;

/** Histórico desta etapa do produto e, se ela vem de um modelo global, o histórico do modelo em todos os produtos. */
export async function stepPerformance(db: PrismaClient, stepId: string) {
  const step = await db.catalog2TaskStep.findUnique({ where: { id: stepId }, select: { id: true, step_model_id: true } });
  if (!step) return null;
  const product = await db.projectTaskStage.findMany({ where: { catalog_step_ref: step.id }, select: SELECT, take: 5000 });
  let model: PerfResult | null = null;
  let modelSteps = 0;
  if (step.step_model_id != null) {
    const ids = (await db.catalog2TaskStep.findMany({ where: { step_model_id: step.step_model_id }, select: { id: true } })).map((s) => s.id);
    modelSteps = ids.length;
    if (ids.length > 1) model = buildPerformance(await db.projectTaskStage.findMany({ where: { catalog_step_ref: { in: ids } }, select: SELECT, take: 20000 }));
  }
  const stageIds = (await db.projectTaskStage.findMany({ where: { catalog_step_ref: step.id }, select: { id: true }, take: 5000 })).map((s) => s.id);
  const runs = stageIds.length ? await db.projectTaskAIRun.findMany({ where: { project_task_stage_id: { in: stageIds } }, select: { status: true, cost: true } }) : [];
  const ai = runs.length
    ? { runs: runs.length, adopted: runs.filter((r) => r.status === "adotada").length, discarded: runs.filter((r) => r.status === "descartada").length, errors: runs.filter((r) => r.status === "erro").length, avg_cost: avg(runs.filter((r) => r.cost != null).map((r) => r.cost as number)) }
    : null;
  return { product: buildPerformance(product), model, model_steps: modelSteps, ai };
}
