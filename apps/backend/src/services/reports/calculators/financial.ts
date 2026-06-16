// ─── Financial Indicators Calculator ─────────────────────────────────────────
// Feeds: faturamento, mrr, avulsos, checkout_cliente, plano_credito,
//        novos_mrr, novos_avulsos, churn_projetos, churn_agencias,
//        ticket_medio, ltv, cmv, margem_bruta

import { prisma } from "../../../lib/prisma";
import type { CalculatorContext, IndicatorResult } from "../types";
import {
  computeVariation,
  unavailableResult,
} from "../types";
import { buildAgencyScopeFilter } from "../report-access.service";

const TAX_RATE = 0.16; // 16% imposto sobre faturamento, aplicado no CMV

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function sumPaidInvoices(
  start: Date,
  end: Date,
  extraWhere: Record<string, unknown> = {},
): Promise<number> {
  const agg = await prisma.invoice.aggregate({
    _sum: { amount: true },
    where: {
      status: "paid",
      paid_at: { gte: start, lte: end },
      ...extraWhere,
    },
  });
  return agg._sum.amount ?? 0;
}

// Project-level filter for agency scope (Project.agency is a string FK)
function invoiceWhereForScope(ctx: CalculatorContext): Record<string, unknown> {
  const agencyFilter = buildAgencyScopeFilter(ctx.scope);
  if (Object.keys(agencyFilter).length === 0) return {};
  return { project: agencyFilter };
}

// ─── Faturamento (#1) ─────────────────────────────────────────────────────────

export async function calcFaturamento(ctx: CalculatorContext): Promise<IndicatorResult> {
  const scopeFilter = invoiceWhereForScope(ctx);

  const value = await sumPaidInvoices(ctx.current.start, ctx.current.end, scopeFilter);
  let previousValue: number | null = null;
  if (ctx.previous) {
    previousValue = await sumPaidInvoices(ctx.previous.start, ctx.previous.end, scopeFilter);
  }

  const { variationPercent, trend } = computeVariation(value, previousValue);

  return {
    indicatorId: "faturamento",
    title: "Faturamento",
    value,
    previousValue,
    variationPercent,
    trend,
    status: trend === "down" ? "warning" : "ok",
    drilldownAvailable: true,
    meta: { currency: "BRL" },
    warnings: [],
  };
}

// ─── MRR (#3) ─────────────────────────────────────────────────────────────────
// Soma de invoices de projetos com lifecycle='mensal' pagos no período.

export async function calcMrr(ctx: CalculatorContext): Promise<IndicatorResult> {
  const scopeFilter = invoiceWhereForScope(ctx);
  const lifecycleFilter = { project: { ...buildAgencyScopeFilter(ctx.scope), lifecycle: "mensal" } };

  const agg = await prisma.invoice.aggregate({
    _sum: { amount: true },
    where: { status: "paid", paid_at: { gte: ctx.current.start, lte: ctx.current.end }, ...lifecycleFilter },
  });
  const value = agg._sum.amount ?? 0;

  let previousValue: number | null = null;
  if (ctx.previous) {
    const aggPrev = await prisma.invoice.aggregate({
      _sum: { amount: true },
      where: { status: "paid", paid_at: { gte: ctx.previous.start, lte: ctx.previous.end }, ...lifecycleFilter },
    });
    previousValue = aggPrev._sum.amount ?? 0;
  }

  const { variationPercent, trend } = computeVariation(value, previousValue);
  const warnings: string[] = [];

  if (ctx.scope.type === "OWN_AGENCY_SCOPE" || ctx.scope.type === "OWN_PARTNER_SCOPE") {
    warnings.push(
      "MRR por agência filtra via Project.agency (campo texto). Precisão depende da consistência dos nomes.",
    );
  }

  return {
    indicatorId: "mrr",
    title: "MRR",
    value,
    previousValue,
    variationPercent,
    trend,
    status: "ok",
    drilldownAvailable: true,
    meta: { currency: "BRL", note: "Projetos com lifecycle='mensal'" },
    warnings,
  };
}

// ─── Avulsos (#4) ─────────────────────────────────────────────────────────────

export async function calcAvulsos(ctx: CalculatorContext): Promise<IndicatorResult> {
  const lifecycleFilter = { project: { ...buildAgencyScopeFilter(ctx.scope), lifecycle: "avulso" } };

  const agg = await prisma.invoice.aggregate({
    _sum: { amount: true },
    where: { status: "paid", paid_at: { gte: ctx.current.start, lte: ctx.current.end }, ...lifecycleFilter },
  });
  const value = agg._sum.amount ?? 0;

  let previousValue: number | null = null;
  if (ctx.previous) {
    const aggPrev = await prisma.invoice.aggregate({
      _sum: { amount: true },
      where: { status: "paid", paid_at: { gte: ctx.previous.start, lte: ctx.previous.end }, ...lifecycleFilter },
    });
    previousValue = aggPrev._sum.amount ?? 0;
  }

  const { variationPercent, trend } = computeVariation(value, previousValue);
  return {
    indicatorId: "avulsos",
    title: "Avulsos",
    value,
    previousValue,
    variationPercent,
    trend,
    status: "ok",
    drilldownAvailable: true,
    meta: { currency: "BRL", note: "Projetos com lifecycle='avulso'" },
    warnings: [],
  };
}

// ─── Checkout do Cliente (#5) ─────────────────────────────────────────────────

export async function calcCheckoutCliente(ctx: CalculatorContext): Promise<IndicatorResult> {
  const baseFilter = { company_type: "company", ...buildAgencyScopeFilter(ctx.scope) };

  const agg = await prisma.invoice.aggregate({
    _sum: { amount: true },
    where: {
      status: "paid",
      paid_at: { gte: ctx.current.start, lte: ctx.current.end },
      project: baseFilter,
    },
  });
  const value = agg._sum.amount ?? 0;

  let previousValue: number | null = null;
  if (ctx.previous) {
    const aggPrev = await prisma.invoice.aggregate({
      _sum: { amount: true },
      where: {
        status: "paid",
        paid_at: { gte: ctx.previous.start, lte: ctx.previous.end },
        project: baseFilter,
      },
    });
    previousValue = aggPrev._sum.amount ?? 0;
  }

  const { variationPercent, trend } = computeVariation(value, previousValue);
  return {
    indicatorId: "checkout_cliente",
    title: "Checkout do Cliente",
    value,
    previousValue,
    variationPercent,
    trend,
    status: "ok",
    drilldownAvailable: true,
    meta: { currency: "BRL", note: "Projetos com company_type='company'" },
    warnings: [
      "Margem média da agência por checkout do cliente não está disponível (requer ProjectProduct.comissao_snapshot vs. base_price).",
    ],
  };
}

// ─── Plano de Crédito / Squad (#6) ───────────────────────────────────────────

export async function calcPlanoCredito(ctx: CalculatorContext): Promise<IndicatorResult> {
  if (ctx.scope.type !== "GLOBAL") {
    return unavailableResult(
      "plano_credito",
      "Plano de Crédito",
      "insufficient_scope",
      "Indicador de Plano de Crédito disponível apenas para Admin.",
    );
  }

  const [activeSquads, newSquads, cyclesAgg] = await Promise.all([
    prisma.squadConfig.count({ where: { status: "active" } }),
    prisma.squadConfig.count({
      where: { status: "active", started_at: { gte: ctx.current.start, lte: ctx.current.end } },
    }),
    prisma.squadCycle.aggregate({
      _sum: { total_invoiced: true },
      where: {
        status: { in: ["invoiced", "paid"] },
        closed_at: { gte: ctx.current.start, lte: ctx.current.end },
      },
    }),
  ]);

  const value = cyclesAgg._sum.total_invoiced ?? 0;

  return {
    indicatorId: "plano_credito",
    title: "Plano de Crédito",
    value,
    drilldownAvailable: true,
    meta: {
      currency: "BRL",
      active_squads: activeSquads,
      new_squads_in_period: newSquads,
    },
    warnings: [],
  };
}

// ─── Churn de Projetos (#9) ───────────────────────────────────────────────────

export async function calcChurnProjetos(ctx: CalculatorContext): Promise<IndicatorResult> {
  const agencyFilter = buildAgencyScopeFilter(ctx.scope);

  const value = await prisma.project.count({
    where: {
      status: "cancelled",
      lifecycle: "mensal",
      updated_at: { gte: ctx.current.start, lte: ctx.current.end },
      ...agencyFilter,
    },
  });

  let previousValue: number | null = null;
  if (ctx.previous) {
    previousValue = await prisma.project.count({
      where: {
        status: "cancelled",
        lifecycle: "mensal",
        updated_at: { gte: ctx.previous.start, lte: ctx.previous.end },
        ...agencyFilter,
      },
    });
  }

  const { variationPercent, trend } = computeVariation(value, previousValue);
  return {
    indicatorId: "churn_projetos",
    title: "Churn de Projetos",
    value,
    previousValue,
    variationPercent,
    trend,
    status: value > 0 ? "warning" : "ok",
    drilldownAvailable: true,
    meta: {},
    warnings: [
      "Churn calculado via Project.status='cancelled' + updated_at no período. Sem campo cancelled_at explícito.",
    ],
  };
}

// ─── Churn de Agências (#10) ──────────────────────────────────────────────────

export async function calcChurnAgencias(ctx: CalculatorContext): Promise<IndicatorResult> {
  if (ctx.scope.type !== "GLOBAL") {
    return unavailableResult(
      "churn_agencias",
      "Churn de Agências",
      "insufficient_scope",
      "Indicador de Churn de Agências disponível apenas para Admin.",
    );
  }

  const value = await prisma.squadConfig.count({
    where: {
      status: "cancelled",
      updated_at: { gte: ctx.current.start, lte: ctx.current.end },
    },
  });

  let previousValue: number | null = null;
  if (ctx.previous) {
    previousValue = await prisma.squadConfig.count({
      where: {
        status: "cancelled",
        updated_at: { gte: ctx.previous.start, lte: ctx.previous.end },
      },
    });
  }

  const { variationPercent, trend } = computeVariation(value, previousValue);
  return {
    indicatorId: "churn_agencias",
    title: "Churn de Agências",
    value,
    previousValue,
    variationPercent,
    trend,
    status: value > 0 ? "warning" : "ok",
    drilldownAvailable: true,
    meta: {},
    warnings: [
      "Churn calculado via SquadConfig.status='cancelled' + updated_at. Sem campo cancelled_at explícito.",
    ],
  };
}

// ─── Ticket Médio (#11) ───────────────────────────────────────────────────────

export async function calcTicketMedio(ctx: CalculatorContext): Promise<IndicatorResult> {
  // Sum paid invoices and count distinct agencies (via Project.agency string)
  const invoices = await prisma.invoice.findMany({
    where: {
      status: "paid",
      paid_at: { gte: ctx.current.start, lte: ctx.current.end },
    },
    select: { amount: true, project: { select: { agency: true } } },
  });

  const agencyFilter = buildAgencyScopeFilter(ctx.scope);
  const allowedNames = agencyFilter.agency?.in;
  const filtered = allowedNames
    ? invoices.filter((i) => allowedNames.includes(i.project?.agency ?? ""))
    : invoices;

  const total = filtered.reduce((sum, i) => sum + i.amount, 0);
  const uniqueAgencies = new Set(filtered.map((i) => i.project?.agency).filter(Boolean)).size;
  const value = uniqueAgencies > 0 ? total / uniqueAgencies : 0;

  return {
    indicatorId: "ticket_medio",
    title: "Ticket Médio",
    value,
    drilldownAvailable: false,
    meta: { currency: "BRL", total_faturado: total, agencias_ativas: uniqueAgencies },
    warnings: [
      "Ticket Médio calculado via Project.agency (string). Precisão depende da consistência dos nomes cadastrados.",
    ],
  };
}

// ─── LTV (#12) ────────────────────────────────────────────────────────────────

export async function calcLtv(ctx: CalculatorContext): Promise<IndicatorResult> {
  // Agencies active in the last 90 days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);

  const recentInvoices = await prisma.invoice.findMany({
    where: { status: "paid", paid_at: { gte: cutoff } },
    select: { project: { select: { agency: true } } },
  });

  const recentAgencies = new Set(
    recentInvoices.map((i) => i.project?.agency).filter(Boolean) as string[],
  );

  if (recentAgencies.size === 0) {
    return {
      indicatorId: "ltv",
      title: "LTV",
      value: 0,
      drilldownAvailable: false,
      meta: { active_agencies_last90d: 0 },
      warnings: ["Nenhuma agência com fatura paga nos últimos 90 dias."],
    };
  }

  // Historical total for those agencies
  const historical = await prisma.invoice.aggregate({
    _sum: { amount: true },
    where: {
      status: "paid",
      project: { agency: { in: Array.from(recentAgencies) } },
    },
  });

  const total = historical._sum.amount ?? 0;
  const value = total / recentAgencies.size;

  return {
    indicatorId: "ltv",
    title: "LTV",
    value,
    drilldownAvailable: false,
    meta: { currency: "BRL", active_agencies: recentAgencies.size, total_historico: total },
    warnings: [
      "LTV calculado via Project.agency (string). Precisão depende da consistência dos nomes cadastrados.",
    ],
  };
}

// ─── CMV (#13) ────────────────────────────────────────────────────────────────

export async function calcCmv(ctx: CalculatorContext): Promise<IndicatorResult> {
  const [walletAgg, commissionAgg, invoiceAgg] = await Promise.all([
    // Créditos pagos a nômades no período
    prisma.walletTransaction.aggregate({
      _sum: { amount: true },
      where: {
        type: "credit",
        date: { gte: ctx.current.start, lte: ctx.current.end },
      },
    }),
    // Comissões aprovadas de parceiros no período
    prisma.partnerCommission.aggregate({
      _sum: { amount: true },
      where: {
        status: "approved",
        created_at: { gte: ctx.current.start, lte: ctx.current.end },
      },
    }),
    // Impostos estimados: 16% sobre faturamento pago
    prisma.invoice.aggregate({
      _sum: { amount: true },
      where: { status: "paid", paid_at: { gte: ctx.current.start, lte: ctx.current.end } },
    }),
  ]);

  const nomadePayments = walletAgg._sum.amount ?? 0;
  const partnerCommissions = commissionAgg._sum.amount ?? 0;
  const taxEstimate = (invoiceAgg._sum.amount ?? 0) * TAX_RATE;

  const value = nomadePayments + partnerCommissions + taxEstimate;
  const revenue = invoiceAgg._sum.amount ?? 0;
  const cmvRatio = revenue > 0 ? (value / revenue) * 100 : 0;

  return {
    indicatorId: "cmv",
    title: "CMV",
    value,
    status: cmvRatio > 50 ? "danger" : cmvRatio > 40 ? "warning" : "ok",
    drilldownAvailable: true,
    meta: {
      currency: "BRL",
      nomade_payments: nomadePayments,
      partner_commissions: partnerCommissions,
      tax_estimate: taxEstimate,
      tax_rate: TAX_RATE,
      cmv_ratio_percent: Math.round(cmvRatio * 100) / 100,
    },
    warnings: [
      "Imposto calculado como estimativa (16% flat sobre faturamento). Taxa real pode variar.",
      "WalletTransaction não distingue pagamento de execução vs. liderança.",
    ],
  };
}

// ─── Margem Bruta (#14) ──────────────────────────────────────────────────────

export async function calcMargemBruta(ctx: CalculatorContext): Promise<IndicatorResult> {
  const [faturamento, cmv] = await Promise.all([
    calcFaturamento(ctx),
    calcCmv(ctx),
  ]);

  const revenue = faturamento.value ?? 0;
  const cost = cmv.value ?? 0;
  const value = revenue - cost;
  const pct = revenue > 0 ? (value / revenue) * 100 : 0;

  return {
    indicatorId: "margem_bruta",
    title: "Margem Bruta",
    value,
    status: pct < 30 ? "danger" : pct < 50 ? "warning" : "ok",
    drilldownAvailable: false,
    meta: {
      currency: "BRL",
      faturamento: revenue,
      cmv: cost,
      margem_percent: Math.round(pct * 100) / 100,
    },
    warnings: [...(cmv.warnings ?? [])],
  };
}
