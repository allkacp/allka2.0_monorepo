// ─── Wallet Indicators Calculator ────────────────────────────────────────────
// Feeds: carteira (balances by owner_type), extrato geral summary

import { prisma } from "../../../lib/prisma";
import type { CalculatorContext, IndicatorResult } from "../types";

// ─── Carteira (#2) ────────────────────────────────────────────────────────────
// Balances grouped by owner_type (nomad/agency/partner/platform)

export async function calcCarteira(ctx: CalculatorContext): Promise<IndicatorResult> {
  // For non-global scopes, restrict to the user's own wallet
  let walletFilter: Record<string, unknown> = {};

  if (ctx.scope.type === "OWN_NOMAD_SCOPE" && ctx.scope.nomadeId) {
    walletFilter = { owner_type: "nomad", owner_id: ctx.scope.nomadeId };
  } else if (ctx.scope.type === "OWN_AGENCY_SCOPE" && ctx.scope.agencyIds?.length) {
    walletFilter = { owner_type: "agency", owner_id: { in: ctx.scope.agencyIds } };
  } else if (ctx.scope.type === "OWN_COMPANY_SCOPE" && ctx.scope.companyIds?.length) {
    walletFilter = { owner_type: "company", owner_id: { in: ctx.scope.companyIds } };
  } else if (ctx.scope.type === "OWN_PARTNER_SCOPE" && ctx.scope.partnerProfileId) {
    walletFilter = { owner_type: "partner", owner_id: ctx.scope.partnerProfileId };
  }

  const [balanceAgg, blockedAgg] = await Promise.all([
    prisma.wallet.aggregate({
      _sum: { balance: true },
      where: { status: "active", ...walletFilter },
    }),
    prisma.wallet.aggregate({
      _sum: { blocked_balance: true },
      where: { status: "active", ...walletFilter },
    }),
  ]);

  const available = balanceAgg._sum.balance ?? 0;
  const blocked = blockedAgg._sum.blocked_balance ?? 0;

  // Breakdown by owner_type (only for GLOBAL scope)
  let breakdown: Record<string, number> = {};
  if (ctx.scope.type === "GLOBAL") {
    const groups = await prisma.wallet.groupBy({
      by: ["owner_type"],
      _sum: { balance: true },
      where: { status: "active" },
    });
    breakdown = Object.fromEntries(
      groups.map((g) => [g.owner_type, g._sum.balance ?? 0]),
    );
  }

  return {
    indicatorId: "carteira",
    title: "Carteira",
    value: available,
    breakdown: { ...breakdown, bloqueado: blocked },
    drilldownAvailable: ctx.scope.type === "GLOBAL",
    meta: { currency: "BRL", available, blocked },
    warnings: [],
  };
}

// ─── Extrato Summary (for tabular report header) ──────────────────────────────

export async function calcExtratoSummary(ctx: CalculatorContext): Promise<IndicatorResult> {
  let walletFilter: Record<string, unknown> = {};

  if (ctx.scope.type === "OWN_AGENCY_SCOPE" && ctx.scope.agencyIds?.length) {
    walletFilter = { wallet: { owner_type: "agency", owner_id: { in: ctx.scope.agencyIds } } };
  } else if (ctx.scope.type === "OWN_NOMAD_SCOPE" && ctx.scope.nomadeId) {
    walletFilter = { wallet: { owner_type: "nomad", owner_id: ctx.scope.nomadeId } };
  }

  const [creditsAgg, debitsAgg, count] = await Promise.all([
    prisma.walletLedger.aggregate({
      _sum: { amount: true },
      where: {
        direction: "credit",
        status: "confirmed",
        created_at: { gte: ctx.current.start, lte: ctx.current.end },
        ...walletFilter,
      },
    }),
    prisma.walletLedger.aggregate({
      _sum: { amount: true },
      where: {
        direction: "debit",
        status: "confirmed",
        created_at: { gte: ctx.current.start, lte: ctx.current.end },
        ...walletFilter,
      },
    }),
    prisma.walletLedger.count({
      where: {
        status: "confirmed",
        created_at: { gte: ctx.current.start, lte: ctx.current.end },
        ...walletFilter,
      },
    }),
  ]);

  const totalCredits = creditsAgg._sum.amount ?? 0;
  const totalDebits = debitsAgg._sum.amount ?? 0;

  return {
    indicatorId: "extrato_summary",
    title: "Extrato — Resumo do Período",
    value: totalCredits - totalDebits,
    drilldownAvailable: true,
    meta: {
      currency: "BRL",
      total_credits: totalCredits,
      total_debits: totalDebits,
      transaction_count: count,
    },
    warnings: [],
  };
}
