// ─── Agency Indicators Calculator ────────────────────────────────────────────
// Feeds: clientes_ativos, clientes_status, atividade, inatividade

import { prisma } from "../../../lib/prisma";
import type { CalculatorContext, IndicatorResult } from "../types";
import { computeVariation } from "../types";

// ─── Clientes Ativos (#27) ────────────────────────────────────────────────────
// Agencies with at least one active project (lifecycle=mensal or in-progress).

export async function calcClientesAtivos(ctx: CalculatorContext): Promise<IndicatorResult> {
  const [value, newInPeriod] = await Promise.all([
    prisma.agency.count({ where: { status: "ativo" } }),
    prisma.agency.count({
      where: { created_at: { gte: ctx.current.start, lte: ctx.current.end } },
    }),
  ]);

  let previousValue: number | null = null;
  if (ctx.previous) {
    // Approximate: agencies that were active and existed before period end
    previousValue = await prisma.agency.count({
      where: { status: "ativo", created_at: { lte: ctx.previous.end } },
    });
  }

  const { variationPercent, trend } = computeVariation(value, previousValue);

  return {
    indicatorId: "clientes_ativos",
    title: "Clientes Ativos",
    value,
    previousValue,
    variationPercent,
    trend,
    status: "ok",
    drilldownAvailable: true,
    meta: { new_in_period: newInPeriod },
    warnings: [],
  };
}

// ─── Clientes por Status (#28) ────────────────────────────────────────────────

export async function calcClientesPorStatus(ctx: CalculatorContext): Promise<IndicatorResult> {
  const groups = await prisma.agency.groupBy({
    by: ["status"],
    _count: true,
  });

  const breakdown: Record<string, number> = {};
  let total = 0;
  for (const g of groups) {
    breakdown[g.status] = g._count;
    total += g._count;
  }

  return {
    indicatorId: "clientes_status",
    title: "Clientes — Outros Status",
    value: total,
    breakdown,
    drilldownAvailable: true,
    meta: {},
    warnings: [],
  };
}

// ─── Atividade (#29) ──────────────────────────────────────────────────────────
// Agencies whose master user logged in during the period.
// Limitation: last_login captures only the latest login — not count per period.

export async function calcAtividade(ctx: CalculatorContext): Promise<IndicatorResult> {
  const totalAgencies = await prisma.agency.count({ where: { status: "ativo" } });

  // Count agencies where the linked user logged in during the period
  const activeAgencies = await prisma.agency.count({
    where: {
      status: "ativo",
      user: { last_login: { gte: ctx.current.start, lte: ctx.current.end } },
    },
  });

  const pct = totalAgencies > 0 ? (activeAgencies / totalAgencies) * 100 : 0;

  return {
    indicatorId: "atividade",
    title: "Atividade",
    value: activeAgencies,
    drilldownAvailable: true,
    meta: {
      total_agencias_ativas: totalAgencies,
      percent_acesso_no_periodo: Math.round(pct * 100) / 100,
    },
    warnings: [
      "Atividade calculada via User.last_login no período. Mede apenas se houve login, não frequência.",
      "Para contagem precisa de sessões, adicionar tabela UsageEvent (modelo já criado na migration).",
    ],
  };
}

// ─── Inatividade (#30) ───────────────────────────────────────────────────────
// Active agencies with no login in the last 90 days.

export async function calcInatividade(ctx: CalculatorContext): Promise<IndicatorResult> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);

  const [inactive, total] = await Promise.all([
    prisma.agency.count({
      where: {
        status: "ativo",
        user: {
          OR: [
            { last_login: { lt: cutoff } },
            { last_login: null },
          ],
        },
      },
    }),
    prisma.agency.count({ where: { status: "ativo" } }),
  ]);

  const pct = total > 0 ? (inactive / total) * 100 : 0;

  return {
    indicatorId: "inatividade",
    title: "Inatividade",
    value: inactive,
    status: pct > 30 ? "danger" : pct > 15 ? "warning" : "ok",
    drilldownAvailable: true,
    meta: {
      threshold_days: 90,
      total_agencias_ativas: total,
      percent_inativas: Math.round(pct * 100) / 100,
      cutoff_date: cutoff.toISOString(),
    },
    warnings: [],
  };
}

// ─── Atividade de uso via UsageEvent ──────────────────────────────────────────
// Returns MAU/DAU from UsageEvent table. Returns unavailable if no events yet.

export async function calcUsabilidade(ctx: CalculatorContext): Promise<IndicatorResult> {
  const count = await prisma.usageEvent.count({
    where: { created_at: { gte: ctx.current.start, lte: ctx.current.end } },
  });

  if (count === 0) {
    return {
      indicatorId: "usabilidade",
      title: "Usabilidade",
      value: null,
      drilldownAvailable: false,
      meta: {},
      warnings: [
        "Nenhum evento de uso registrado ainda. Instrua o frontend a emitir eventos via POST /api/reports/usage-event.",
      ],
      unavailable: true,
      unavailableReason: "missing_model",
    };
  }

  const [mauUsers, dauAgg] = await Promise.all([
    // MAU: distinct users in the period
    prisma.usageEvent.groupBy({
      by: ["user_id"],
      where: { created_at: { gte: ctx.current.start, lte: ctx.current.end } },
    }),
    // Total events (proxy for engagement)
    prisma.usageEvent.count({
      where: { created_at: { gte: ctx.current.start, lte: ctx.current.end } },
    }),
  ]);

  // Simple breakdown by event_type
  const eventBreakdown = await prisma.usageEvent.groupBy({
    by: ["event_type"],
    _count: true,
    where: { created_at: { gte: ctx.current.start, lte: ctx.current.end } },
  });

  const breakdown: Record<string, number> = {};
  for (const e of eventBreakdown) {
    breakdown[e.event_type] = e._count;
  }

  return {
    indicatorId: "usabilidade",
    title: "Usabilidade",
    value: mauUsers.length,
    breakdown,
    drilldownAvailable: false,
    meta: { mau: mauUsers.length, total_events: dauAgg },
    warnings: [],
  };
}
