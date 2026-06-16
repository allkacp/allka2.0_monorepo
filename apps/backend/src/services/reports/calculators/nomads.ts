// ─── Nomad Indicators Calculator ─────────────────────────────────────────────
// Feeds: nomades, pontuacao_nomades, remuneracao_nomade, remuneracao_media,
//        nomad-scope: tarefas, pontuação, remuneração, comissões

import { prisma } from "../../../lib/prisma";
import type { CalculatorContext, IndicatorResult } from "../types";
import { computeVariation } from "../types";

// ─── Nômades (#19) ────────────────────────────────────────────────────────────

export async function calcNomades(ctx: CalculatorContext): Promise<IndicatorResult> {
  const categoryFilter = ctx.filters.category
    ? { areas_of_interest: { contains: ctx.filters.category as string } }
    : {};

  const [active, newCount, cancelled] = await Promise.all([
    prisma.nomade.count({ where: { status: "ativo", ...categoryFilter } }),
    prisma.nomade.count({
      where: {
        registration_date: { gte: ctx.current.start, lte: ctx.current.end },
        ...categoryFilter,
      },
    }),
    prisma.nomade.count({
      where: {
        status: "inativo",
        updated_at: { gte: ctx.current.start, lte: ctx.current.end },
        ...categoryFilter,
      },
    }),
  ]);

  let prevActive: number | null = null;
  if (ctx.previous) {
    prevActive = await prisma.nomade.count({
      where: {
        status: "ativo",
        updated_at: { lte: ctx.previous.end },
        ...categoryFilter,
      },
    });
  }

  const { variationPercent, trend } = computeVariation(active, prevActive);

  return {
    indicatorId: "nomades",
    title: "Nômades",
    value: active,
    previousValue: prevActive,
    variationPercent,
    trend,
    status: "ok",
    drilldownAvailable: true,
    meta: {
      new_in_period: newCount,
      cancelled_in_period: cancelled,
    },
    warnings: [],
  };
}

// ─── Pontuação dos Nômades (#20) ─────────────────────────────────────────────

export async function calcPontuacaoNomades(ctx: CalculatorContext): Promise<IndicatorResult> {
  const categoryFilter = ctx.filters.category
    ? { areas_of_interest: { contains: ctx.filters.category as string } }
    : {};

  const agg = await prisma.nomade.aggregate({
    _avg: { score: true },
    _count: { id: true },
    where: { status: "ativo", ...categoryFilter },
  });

  const value = agg._avg.score !== null ? Math.round((agg._avg.score ?? 0) * 100) / 100 : null;

  return {
    indicatorId: "pontuacao_nomades",
    title: "Pontuação dos Nômades",
    value,
    drilldownAvailable: false,
    meta: { nomades_counted: agg._count.id },
    warnings: [
      "Pontuação atual — sem histórico por período. Para comparação temporal, adicionar tabela NomadeScoreSnapshot.",
    ],
  };
}

// ─── Remuneração Nômade (#25) ─────────────────────────────────────────────────

export async function calcRemuneracaoNomade(ctx: CalculatorContext): Promise<IndicatorResult> {
  const nomadeFilter =
    ctx.scope.type === "OWN_NOMAD_SCOPE" && ctx.scope.nomadeId
      ? { nomade_id: ctx.scope.nomadeId }
      : {};

  const agg = await prisma.walletTransaction.aggregate({
    _sum: { amount: true },
    where: {
      type: "credit",
      date: { gte: ctx.current.start, lte: ctx.current.end },
      ...nomadeFilter,
    },
  });
  const value = agg._sum.amount ?? 0;

  let previousValue: number | null = null;
  if (ctx.previous) {
    const aggPrev = await prisma.walletTransaction.aggregate({
      _sum: { amount: true },
      where: {
        type: "credit",
        date: { gte: ctx.previous.start, lte: ctx.previous.end },
        ...nomadeFilter,
      },
    });
    previousValue = aggPrev._sum.amount ?? 0;
  }

  const { variationPercent, trend } = computeVariation(value, previousValue);
  return {
    indicatorId: "remuneracao_nomade",
    title: "Remuneração Nômade",
    value,
    previousValue,
    variationPercent,
    trend,
    status: "ok",
    drilldownAvailable: true,
    meta: { currency: "BRL" },
    warnings: [],
  };
}

// ─── Remuneração Média (#26) ──────────────────────────────────────────────────

export async function calcRemuneracaoMedia(ctx: CalculatorContext): Promise<IndicatorResult> {
  const [totalAgg, distinctNomades] = await Promise.all([
    prisma.walletTransaction.aggregate({
      _sum: { amount: true },
      where: { type: "credit", date: { gte: ctx.current.start, lte: ctx.current.end } },
    }),
    prisma.walletTransaction.groupBy({
      by: ["nomade_id"],
      where: { type: "credit", date: { gte: ctx.current.start, lte: ctx.current.end } },
    }),
  ]);

  const total = totalAgg._sum.amount ?? 0;
  const n = distinctNomades.length;
  const value = n > 0 ? total / n : 0;

  return {
    indicatorId: "remuneracao_media",
    title: "Remuneração Média",
    value,
    drilldownAvailable: false,
    meta: { currency: "BRL", total, nomades_pagos: n },
    warnings: [],
  };
}

// ─── Comissões (nomad/leader) ─────────────────────────────────────────────────

export async function calcComissoesNomade(ctx: CalculatorContext): Promise<IndicatorResult> {
  const nomadeFilter =
    ctx.scope.nomadeId ? { nomade_id: ctx.scope.nomadeId } : {};

  const agg = await prisma.walletTransaction.aggregate({
    _sum: { amount: true },
    where: {
      type: "bonus",
      date: { gte: ctx.current.start, lte: ctx.current.end },
      ...nomadeFilter,
    },
  });

  const value = agg._sum.amount ?? 0;

  return {
    indicatorId: "comissoes_nomade",
    title: "Comissões",
    value,
    drilldownAvailable: true,
    meta: { currency: "BRL" },
    warnings: [
      "Comissões derivadas de WalletTransaction.type='bonus'. Não há distinção entre bônus de comissão e outros bônus.",
    ],
  };
}

// ─── Nômade: pontuação própria ────────────────────────────────────────────────
// For OWN_NOMAD_SCOPE — returns the nomad's own score.

export async function calcPontuacaoNomadePropria(ctx: CalculatorContext): Promise<IndicatorResult> {
  if (!ctx.scope.nomadeId) {
    return {
      indicatorId: "nomad_pontuacao",
      title: "Pontuação",
      value: null,
      drilldownAvailable: false,
      meta: {},
      warnings: ["ID do nômade não encontrado no escopo."],
      unavailable: true,
      unavailableReason: "insufficient_scope",
    };
  }

  const nomade = await prisma.nomade.findUnique({
    where: { id: ctx.scope.nomadeId },
    select: { score: true, performance_avg_rating: true, performance_rejection_rate: true },
  });

  if (!nomade) {
    return {
      indicatorId: "nomad_pontuacao",
      title: "Pontuação",
      value: null,
      drilldownAvailable: false,
      meta: {},
      warnings: ["Nômade não encontrado."],
      unavailable: true,
      unavailableReason: "error",
    };
  }

  return {
    indicatorId: "nomad_pontuacao",
    title: "Pontuação",
    value: nomade.score,
    drilldownAvailable: false,
    meta: {
      avg_rating: nomade.performance_avg_rating,
      rejection_rate: nomade.performance_rejection_rate,
    },
    warnings: ["Histórico de pontuação por período não disponível. Exibe score atual."],
  };
}
