// ─── Project Indicators Calculator ───────────────────────────────────────────
// Feeds: projetos_ativos, projetos_rascunho, projetos_negociacao,
//        projetos_perdidos, and comparison variants

import { prisma } from "../../../lib/prisma";
import type { CalculatorContext, IndicatorResult } from "../types";
import { computeVariation } from "../types";
import { buildAgencyScopeFilter } from "../report-access.service";

type ProjectStatus =
  | "draft"
  | "negotiation"
  | "awaiting-payment"
  | "planning"
  | "in-progress"
  | "paused"
  | "completed"
  | "cancelled"
  | "paid";

async function countProjects(
  status: ProjectStatus | ProjectStatus[],
  start: Date,
  end: Date,
  agencyFilter: Record<string, unknown>,
  dateField: "created_at" | "updated_at" = "created_at",
): Promise<number> {
  const statusWhere = Array.isArray(status) ? { in: status } : status;
  return prisma.project.count({
    where: {
      status: statusWhere,
      [dateField]: { gte: start, lte: end },
      ...agencyFilter,
    } as Record<string, unknown>,
  });
}

function buildResult(
  indicatorId: string,
  title: string,
  value: number,
  previousValue: number | null,
  opts: Partial<IndicatorResult> = {},
): IndicatorResult {
  const { variationPercent, trend } = computeVariation(value, previousValue);
  return {
    indicatorId,
    title,
    value,
    previousValue,
    variationPercent,
    trend,
    status: "ok",
    drilldownAvailable: true,
    meta: {},
    warnings: [],
    ...opts,
  };
}

// ─── Projetos Ativos (#15) ────────────────────────────────────────────────────
// Status: planning + in-progress. Uses updated_at as the period anchor
// (projects may have been created before the period but became active in it).

export async function calcProjetosAtivos(ctx: CalculatorContext): Promise<IndicatorResult> {
  const agencyFilter = buildAgencyScopeFilter(ctx.scope);
  const activeStatuses: ProjectStatus[] = ["planning", "in-progress"];

  // Snapshot count: projects currently active (no date range — point-in-time)
  const value = await prisma.project.count({
    where: { status: { in: activeStatuses }, ...agencyFilter },
  });

  // For comparison, count projects that were in those statuses during previous period
  let previousValue: number | null = null;
  if (ctx.previous) {
    previousValue = await countProjects(
      activeStatuses,
      ctx.previous.start,
      ctx.previous.end,
      agencyFilter,
      "updated_at",
    );
  }

  // Breakdown by lifecycle
  const byLifecycle = await prisma.project.groupBy({
    by: ["lifecycle"],
    _count: true,
    where: { status: { in: activeStatuses }, ...agencyFilter },
  });

  return buildResult("projetos_ativos", "Projetos Ativos", value, previousValue, {
    breakdown: Object.fromEntries(byLifecycle.map((r) => [r.lifecycle, r._count])),
  });
}

// ─── Projetos em Rascunho (#16) ──────────────────────────────────────────────

export async function calcProjetosRascunho(ctx: CalculatorContext): Promise<IndicatorResult> {
  const agencyFilter = buildAgencyScopeFilter(ctx.scope);

  const value = await countProjects("draft", ctx.current.start, ctx.current.end, agencyFilter);
  const previousValue = ctx.previous
    ? await countProjects("draft", ctx.previous.start, ctx.previous.end, agencyFilter)
    : null;

  return buildResult("projetos_rascunho", "Projetos em Rascunho", value, previousValue);
}

// ─── Projetos em Negociação (#17) ────────────────────────────────────────────

export async function calcProjetosNegociacao(ctx: CalculatorContext): Promise<IndicatorResult> {
  const agencyFilter = buildAgencyScopeFilter(ctx.scope);

  const value = await countProjects("negotiation", ctx.current.start, ctx.current.end, agencyFilter);
  const previousValue = ctx.previous
    ? await countProjects("negotiation", ctx.previous.start, ctx.previous.end, agencyFilter)
    : null;

  return buildResult("projetos_negociacao", "Projetos em Negociação", value, previousValue);
}

// ─── Projetos Perdidos/Cancelados (#18) ──────────────────────────────────────

export async function calcProjetosPerdidos(ctx: CalculatorContext): Promise<IndicatorResult> {
  const agencyFilter = buildAgencyScopeFilter(ctx.scope);

  // Use updated_at as proxy for cancelled_at (field doesn't exist)
  const value = await prisma.project.count({
    where: {
      status: "cancelled",
      updated_at: { gte: ctx.current.start, lte: ctx.current.end },
      ...agencyFilter,
    },
  });

  let previousValue: number | null = null;
  if (ctx.previous) {
    previousValue = await prisma.project.count({
      where: {
        status: "cancelled",
        updated_at: { gte: ctx.previous.start, lte: ctx.previous.end },
        ...agencyFilter,
      },
    });
  }

  const { variationPercent, trend } = computeVariation(value, previousValue);

  return {
    indicatorId: "projetos_perdidos",
    title: "Projetos Perdidos",
    value,
    previousValue,
    variationPercent,
    trend,
    status: trend === "up" && value > 0 ? "warning" : "ok",
    drilldownAvailable: true,
    meta: {},
    warnings: [
      "Usa updated_at como proxy de data de cancelamento. Sem campo cancelled_at no schema atual.",
      "Não há distinção entre 'perdido em negociação' e 'cancelado após contratação'.",
    ],
  };
}

// ─── Distribuição completa de projetos por status ─────────────────────────────
// Returns breakdown for donut chart (used by agency/partner indicators)

export async function calcProjetosPorStatus(ctx: CalculatorContext): Promise<IndicatorResult> {
  const agencyFilter = buildAgencyScopeFilter(ctx.scope);

  const groups = await prisma.project.groupBy({
    by: ["status"],
    _count: true,
    where: agencyFilter,
  });

  const breakdown: Record<string, number> = {};
  let total = 0;
  for (const g of groups) {
    breakdown[g.status] = g._count;
    total += g._count;
  }

  return {
    indicatorId: "projetos_status_breakdown",
    title: "Projetos por Status",
    value: total,
    breakdown,
    drilldownAvailable: true,
    meta: {},
    warnings:
      ctx.scope.type === "OWN_AGENCY_SCOPE"
        ? ["Projetos filtrados via Project.agency (string). Verifique consistência dos nomes."]
        : [],
  };
}
