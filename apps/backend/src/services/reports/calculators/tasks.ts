// ─── Task Indicators Calculator ───────────────────────────────────────────────
// Feeds: tarefas_contratadas, tarefas_concluidas, tarefas_atrasadas,
//        pontuacao_tarefas, tarefas_reprovadas
// Uses ProjectTask (operational) and TaskExecution (rating/approval system).

import { prisma } from "../../../lib/prisma";
import type { CalculatorContext, IndicatorResult } from "../types";
import { computeVariation } from "../types";
import { buildAgencyScopeFilter } from "../report-access.service";

// ─── Scope filter for ProjectTask ─────────────────────────────────────────────
// Resolves to project-level agency filter, nomad filter, or leader filter.

function buildTaskScopeFilter(ctx: CalculatorContext): Record<string, unknown> {
  const { scope } = ctx;

  if (scope.type === "GLOBAL") return {};

  if (scope.type === "OWN_AGENCY_SCOPE" || scope.type === "OWN_PARTNER_SCOPE") {
    const agencyFilter = buildAgencyScopeFilter(scope);
    return Object.keys(agencyFilter).length > 0 ? { project: agencyFilter } : {};
  }

  if (scope.type === "OWN_NOMAD_SCOPE" && scope.nomadeId) {
    return { nomade_responsavel_id: scope.nomadeId };
  }

  if (scope.type === "OWN_LEADER_SCOPE" && scope.leaderUserId) {
    return { lider_responsavel_id: scope.leaderUserId };
  }

  if (scope.type === "OWN_COMPANY_SCOPE" && scope.companyIds?.length) {
    return { project: { client_id: { in: scope.companyIds } } };
  }

  return {};
}

// ─── Tarefas Contratadas (#21) ────────────────────────────────────────────────

export async function calcTarefasContratadas(ctx: CalculatorContext): Promise<IndicatorResult> {
  const scopeFilter = buildTaskScopeFilter(ctx);
  const categoryFilter = ctx.filters.category
    ? { category_snapshot: ctx.filters.category as string }
    : {};

  const value = await prisma.projectTask.count({
    where: {
      created_at: { gte: ctx.current.start, lte: ctx.current.end },
      ...scopeFilter,
      ...categoryFilter,
    },
  });

  let previousValue: number | null = null;
  if (ctx.previous) {
    previousValue = await prisma.projectTask.count({
      where: {
        created_at: { gte: ctx.previous.start, lte: ctx.previous.end },
        ...scopeFilter,
        ...categoryFilter,
      },
    });
  }

  const { variationPercent, trend } = computeVariation(value, previousValue);
  return {
    indicatorId: "tarefas_contratadas",
    title: "Tarefas Contratadas",
    value,
    previousValue,
    variationPercent,
    trend,
    status: "ok",
    drilldownAvailable: false,
    meta: { filter_category: ctx.filters.category ?? null },
    warnings: [],
  };
}

// ─── Tarefas Concluídas (#22) ─────────────────────────────────────────────────

export async function calcTarefasConcluidas(ctx: CalculatorContext): Promise<IndicatorResult> {
  const scopeFilter = buildTaskScopeFilter(ctx);
  const categoryFilter = ctx.filters.category
    ? { category_snapshot: ctx.filters.category as string }
    : {};

  const value = await prisma.projectTask.count({
    where: {
      status: "CONCLUIDA",
      data_conclusao: { gte: ctx.current.start, lte: ctx.current.end },
      ...scopeFilter,
      ...categoryFilter,
    },
  });

  let previousValue: number | null = null;
  if (ctx.previous) {
    previousValue = await prisma.projectTask.count({
      where: {
        status: "CONCLUIDA",
        data_conclusao: { gte: ctx.previous.start, lte: ctx.previous.end },
        ...scopeFilter,
        ...categoryFilter,
      },
    });
  }

  const { variationPercent, trend } = computeVariation(value, previousValue);
  return {
    indicatorId: "tarefas_concluidas",
    title: "Tarefas Concluídas",
    value,
    previousValue,
    variationPercent,
    trend,
    status: "ok",
    drilldownAvailable: false,
    meta: {},
    warnings: [],
  };
}

// ─── Tarefas Atrasadas (#23) ──────────────────────────────────────────────────
// No cancelled_at field — computed in-flight: due_date < now + status not final.

export async function calcTarefasAtrasadas(ctx: CalculatorContext): Promise<IndicatorResult> {
  const scopeFilter = buildTaskScopeFilter(ctx);
  const now = new Date();

  const [value, withDueDate] = await Promise.all([
    prisma.projectTask.count({
      where: {
        due_date: { lt: now },
        status: { notIn: ["CONCLUIDA", "CANCELADA"] },
        ...scopeFilter,
      },
    }),
    prisma.projectTask.findMany({
      where: {
        due_date: { lt: now },
        status: { notIn: ["CONCLUIDA", "CANCELADA"] },
        ...scopeFilter,
      },
      select: { due_date: true },
    }),
  ]);

  // Average delay in days
  let avgDelayDays: number | null = null;
  if (withDueDate.length > 0) {
    const totalMs = withDueDate.reduce((sum, t) => {
      return sum + (now.getTime() - (t.due_date?.getTime() ?? now.getTime()));
    }, 0);
    avgDelayDays = Math.round(totalMs / withDueDate.length / 86400000);
  }

  return {
    indicatorId: "tarefas_atrasadas",
    title: "Tarefas Atrasadas",
    value,
    status: value > 0 ? (value > 10 ? "danger" : "warning") : "ok",
    drilldownAvailable: true,
    meta: { avg_delay_days: avgDelayDays },
    warnings: [
      "Atraso calculado em runtime: due_date < now E status não final. Sem campo is_late ou late_at.",
    ],
  };
}

// ─── Pontuação de Tarefas (#24) ───────────────────────────────────────────────
// Uses TaskExecution.rating (approved executions).

export async function calcPontuacaoTarefas(ctx: CalculatorContext): Promise<IndicatorResult> {
  // TaskExecution scope: filter by nomade_id for nomad scope, or project_id for agency scope
  let execFilter: Record<string, unknown> = {};

  if (ctx.scope.type === "OWN_NOMAD_SCOPE" && ctx.scope.nomadeId) {
    execFilter = { nomade_id: ctx.scope.nomadeId };
  } else if (ctx.scope.type === "OWN_LEADER_SCOPE" && ctx.scope.nomadeId) {
    execFilter = { nomade_id: ctx.scope.nomadeId };
  } else if (
    (ctx.scope.type === "OWN_AGENCY_SCOPE" || ctx.scope.type === "OWN_PARTNER_SCOPE") &&
    ctx.scope.agencyNames?.length
  ) {
    execFilter = { project: { agency: { in: ctx.scope.agencyNames } } };
  } else if (ctx.scope.type === "OWN_COMPANY_SCOPE" && ctx.scope.companyIds?.length) {
    execFilter = { project: { client_id: { in: ctx.scope.companyIds } } };
  }

  const agg = await prisma.taskExecution.aggregate({
    _avg: { rating: true },
    _count: { id: true },
    where: {
      status: "approved",
      rating: { not: null },
      approved_at: { gte: ctx.current.start, lte: ctx.current.end },
      ...execFilter,
    },
  });

  const value = agg._avg.rating !== null ? Math.round((agg._avg.rating ?? 0) * 100) / 100 : null;

  let previousValue: number | null = null;
  if (ctx.previous) {
    const aggPrev = await prisma.taskExecution.aggregate({
      _avg: { rating: true },
      where: {
        status: "approved",
        rating: { not: null },
        approved_at: { gte: ctx.previous.start, lte: ctx.previous.end },
        ...execFilter,
      },
    });
    previousValue = aggPrev._avg.rating !== null
      ? Math.round((aggPrev._avg.rating ?? 0) * 100) / 100
      : null;
  }

  if (value === null) {
    return {
      indicatorId: "pontuacao_tarefas",
      title: "Pontuação de Tarefas",
      value: null,
      drilldownAvailable: false,
      meta: { evaluated_count: agg._count.id },
      warnings: ["Nenhuma tarefa com avaliação (rating) no período."],
    };
  }

  const { variationPercent, trend } = computeVariation(value, previousValue);
  return {
    indicatorId: "pontuacao_tarefas",
    title: "Pontuação de Tarefas",
    value,
    previousValue,
    variationPercent,
    trend,
    status: value >= 4 ? "ok" : value >= 3 ? "warning" : "danger",
    drilldownAvailable: false,
    meta: { evaluated_count: agg._count.id, max: 5 },
    warnings: [],
  };
}

// ─── Tarefas Reprovadas ───────────────────────────────────────────────────────

export async function calcTarefasReprovadas(ctx: CalculatorContext): Promise<IndicatorResult> {
  let execFilter: Record<string, unknown> = {};

  if (ctx.scope.type === "OWN_NOMAD_SCOPE" && ctx.scope.nomadeId) {
    execFilter = { nomade_id: ctx.scope.nomadeId };
  } else if (ctx.scope.type === "OWN_LEADER_SCOPE" && ctx.scope.nomadeId) {
    execFilter = { nomade_id: ctx.scope.nomadeId };
  }

  const value = await prisma.taskExecution.count({
    where: {
      status: "rejected",
      updated_at: { gte: ctx.current.start, lte: ctx.current.end },
      ...execFilter,
    },
  });

  let previousValue: number | null = null;
  if (ctx.previous) {
    previousValue = await prisma.taskExecution.count({
      where: {
        status: "rejected",
        updated_at: { gte: ctx.previous.start, lte: ctx.previous.end },
        ...execFilter,
      },
    });
  }

  const { variationPercent, trend } = computeVariation(value, previousValue);
  return {
    indicatorId: "tarefas_reprovadas",
    title: "Tarefas Reprovadas",
    value,
    previousValue,
    variationPercent,
    trend,
    status: value > 0 ? "warning" : "ok",
    drilldownAvailable: true,
    meta: {},
    warnings: [],
  };
}
