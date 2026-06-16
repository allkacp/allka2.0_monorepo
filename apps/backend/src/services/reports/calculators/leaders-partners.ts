// ─── Leader & Partner Indicators Calculator ───────────────────────────────────
// Feeds: partner_agencias_lideradas_status, partner_projetos_agencias,
//        leader_tarefas_recebidas, leader_faturamento_proporcionado

import { prisma } from "../../../lib/prisma";
import type { CalculatorContext, IndicatorResult } from "../types";
import { computeVariation } from "../types";
import { buildAgencyScopeFilter } from "../report-access.service";

// ─── Agências Lideradas por Status (Partner) ──────────────────────────────────

export async function calcAgenciasLideradasStatus(
  ctx: CalculatorContext,
): Promise<IndicatorResult> {
  if (!ctx.scope.partnerProfileId) {
    return {
      indicatorId: "partner_agencias_lideradas_status",
      title: "Agências Lideradas — Status",
      value: null,
      drilldownAvailable: false,
      meta: {},
      warnings: ["Perfil de parceiro não encontrado no escopo."],
      unavailable: true,
      unavailableReason: "insufficient_scope",
    };
  }

  const leaderships = await prisma.agencyLeadership.findMany({
    where: { partner_id: ctx.scope.partnerProfileId },
    select: { agency: { select: { status: true } } },
  });

  const breakdown: Record<string, number> = {};
  for (const l of leaderships) {
    const s = l.agency.status;
    breakdown[s] = (breakdown[s] ?? 0) + 1;
  }

  return {
    indicatorId: "partner_agencias_lideradas_status",
    title: "Agências Lideradas — Status",
    value: leaderships.length,
    breakdown,
    drilldownAvailable: true,
    meta: {},
    warnings: [],
  };
}

// ─── Projetos das Agências Lideradas (Partner) ───────────────────────────────

export async function calcProjetosAgenciasLideradas(
  ctx: CalculatorContext,
): Promise<IndicatorResult> {
  const agencyFilter = buildAgencyScopeFilter(ctx.scope);
  if (!ctx.scope.agencyNames?.length) {
    return {
      indicatorId: "partner_projetos_agencias",
      title: "Projetos das Agências Lideradas",
      value: 0,
      drilldownAvailable: false,
      meta: { message: "Nenhuma agência liderada ativa." },
      warnings: [],
    };
  }

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
    indicatorId: "partner_projetos_agencias",
    title: "Projetos das Agências Lideradas",
    value: total,
    breakdown,
    drilldownAvailable: true,
    meta: { agencies_count: ctx.scope.agencyNames.length },
    warnings: ["Projetos filtrados via Project.agency (string). Verifique consistência dos nomes."],
  };
}

// ─── Usabilidade das Agências Lideradas (Partner) ────────────────────────────

export async function calcUsabilidadeAgenciasLideradas(
  ctx: CalculatorContext,
): Promise<IndicatorResult> {
  if (!ctx.scope.agencyIds?.length) {
    return {
      indicatorId: "partner_usabilidade_agencias",
      title: "Usabilidade das Agências Lideradas",
      value: 0,
      drilldownAvailable: false,
      meta: { message: "Nenhuma agência liderada ativa." },
      warnings: [],
    };
  }

  const agencies = await prisma.agency.findMany({
    where: { id: { in: ctx.scope.agencyIds } },
    select: { id: true, name: true, user: { select: { last_login: true } } },
  });

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const inactive90 = new Date();
  inactive90.setDate(inactive90.getDate() - 90);

  const breakdown = {
    active_30d: agencies.filter((a) => a.user?.last_login && a.user.last_login >= cutoff).length,
    inactive_90d: agencies.filter(
      (a) => !a.user?.last_login || a.user.last_login < inactive90,
    ).length,
  };

  return {
    indicatorId: "partner_usabilidade_agencias",
    title: "Usabilidade das Agências Lideradas",
    value: agencies.length,
    breakdown,
    drilldownAvailable: true,
    meta: { agencies_total: agencies.length },
    warnings: [
      "Mede apenas último login por agência, não sessões completas. Ver tabela UsageEvent para rastreamento de sessão.",
    ],
  };
}

// ─── Tarefas do Líder ─────────────────────────────────────────────────────────

export async function calcTarefasLider(ctx: CalculatorContext): Promise<IndicatorResult> {
  if (!ctx.scope.leaderUserId) {
    return {
      indicatorId: "leader_tarefas_recebidas",
      title: "Tarefas Recebidas (Líder)",
      value: null,
      drilldownAvailable: false,
      meta: {},
      warnings: ["ID de líder não encontrado no escopo."],
      unavailable: true,
      unavailableReason: "insufficient_scope",
    };
  }

  const [asExec, asLeader] = await Promise.all([
    // Tasks where the leader is the executing nomad
    ctx.scope.nomadeId
      ? prisma.projectTask.count({
          where: {
            nomade_responsavel_id: ctx.scope.nomadeId,
            created_at: { gte: ctx.current.start, lte: ctx.current.end },
          },
        })
      : Promise.resolve(0),
    // Tasks where this user is lider_responsavel
    prisma.projectTask.count({
      where: {
        lider_responsavel_id: ctx.scope.leaderUserId,
        created_at: { gte: ctx.current.start, lte: ctx.current.end },
      },
    }),
  ]);

  const value = asExec + asLeader;

  let previousValue: number | null = null;
  if (ctx.previous) {
    const [prevExec, prevLeader] = await Promise.all([
      ctx.scope.nomadeId
        ? prisma.projectTask.count({
            where: {
              nomade_responsavel_id: ctx.scope.nomadeId,
              created_at: { gte: ctx.previous.start, lte: ctx.previous.end },
            },
          })
        : Promise.resolve(0),
      prisma.projectTask.count({
        where: {
          lider_responsavel_id: ctx.scope.leaderUserId,
          created_at: { gte: ctx.previous.start, lte: ctx.previous.end },
        },
      }),
    ]);
    previousValue = prevExec + prevLeader;
  }

  const { variationPercent, trend } = computeVariation(value, previousValue);
  return {
    indicatorId: "leader_tarefas_recebidas",
    title: "Tarefas Recebidas (Líder)",
    value,
    previousValue,
    variationPercent,
    trend,
    status: "ok",
    drilldownAvailable: true,
    meta: { as_executor: asExec, as_leader: asLeader },
    warnings: [],
  };
}

// ─── Faturamento Proporcionado pelo Líder ────────────────────────────────────

export async function calcFaturamentoLider(ctx: CalculatorContext): Promise<IndicatorResult> {
  if (!ctx.scope.leaderUserId) {
    return {
      indicatorId: "leader_faturamento_proporcionado",
      title: "Faturamento Proporcionado",
      value: null,
      drilldownAvailable: false,
      meta: {},
      warnings: ["ID de líder não encontrado."],
      unavailable: true,
      unavailableReason: "insufficient_scope",
    };
  }

  // Get distinct project IDs where this leader managed tasks
  const tasks = await prisma.projectTask.findMany({
    where: {
      lider_responsavel_id: ctx.scope.leaderUserId,
      created_at: { gte: ctx.current.start, lte: ctx.current.end },
    },
    select: { project_id: true },
  });

  const projectIds = [...new Set(tasks.map((t) => t.project_id))];

  if (projectIds.length === 0) {
    return {
      indicatorId: "leader_faturamento_proporcionado",
      title: "Faturamento Proporcionado",
      value: 0,
      drilldownAvailable: false,
      meta: { projects_count: 0 },
      warnings: [],
    };
  }

  const agg = await prisma.invoice.aggregate({
    _sum: { amount: true },
    where: {
      status: "paid",
      paid_at: { gte: ctx.current.start, lte: ctx.current.end },
      project_id: { in: projectIds },
    },
  });

  const value = agg._sum.amount ?? 0;

  return {
    indicatorId: "leader_faturamento_proporcionado",
    title: "Faturamento Proporcionado",
    value,
    drilldownAvailable: false,
    meta: { currency: "BRL", projects_count: projectIds.length },
    warnings: [
      "Faturamento atribuído integralmente aos projetos onde o líder teve tarefas. Sem rateio proporcional.",
    ],
  };
}
