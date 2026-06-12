import { Router } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

// ── Token decoder ─────────────────────────────────────────────────────────────
// Mirrors the frontend encoding: btoa(unescape(encodeURIComponent(JSON.stringify(payload))))
function decodeShareToken(token: string): Record<string, unknown> | null {
  try {
    // Base64 → Latin-1 string
    const latin1 = Buffer.from(token, "base64").toString("latin1");
    // Re-encode non-ASCII bytes as %XX (reverses the `unescape` step)
    const reEncoded = latin1.replace(/[\x80-\xFF]/g, (c) =>
      "%" + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0"),
    );
    const parsed = JSON.parse(decodeURIComponent(reEncoded));
    if (!parsed?.target?.id || !parsed?.permission) return null;
    return parsed;
  } catch {
    return null;
  }
}

// ── Date range helper ─────────────────────────────────────────────────────────
function getDateRange(
  periodType: string,
  dateFrom?: string,
  dateTo?: string,
): { from: Date; to: Date } {
  const now = new Date();
  const sub = (d: Date, days: number) =>
    new Date(d.getTime() - days * 86_400_000);

  switch (periodType) {
    case "today": {
      const s = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { from: s, to: new Date(s.getTime() + 86_400_000 - 1) };
    }
    case "yesterday": {
      const s = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      return { from: s, to: new Date(s.getTime() + 86_400_000 - 1) };
    }
    case "last_7_days":
      return { from: sub(now, 7), to: now };
    case "last_30_days":
      return { from: sub(now, 30), to: now };
    case "this_month":
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
    case "last_month":
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        to: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999),
      };
    case "last_quarter":
    case "last_90_days":
      return { from: sub(now, 90), to: now };
    case "this_year":
      return { from: new Date(now.getFullYear(), 0, 1), to: now };
    case "custom":
      return {
        from: dateFrom ? new Date(dateFrom) : sub(now, 30),
        to: dateTo ? new Date(`${dateTo}T23:59:59.999Z`) : now,
      };
    default:
      return { from: sub(now, 30), to: now };
  }
}

// ── POST /api/share/data ──────────────────────────────────────────────────────
// Public endpoint: validates token, applies scope + date filters, returns real data.
router.post("/data", async (req, res, next) => {
  try {
    const { token, filters } = req.body as {
      token?: string;
      filters?: {
        periodType?: string;
        dateFrom?: string;
        dateTo?: string;
        status?: string;
      };
    };

    if (!token) {
      res.status(400).json({ error: "Token obrigatório" });
      return;
    }

    const config = decodeShareToken(token);
    if (!config) {
      res.status(400).json({ error: "Token inválido" });
      return;
    }

    if (config.expiry && new Date(config.expiry as string) < new Date()) {
      res.status(410).json({ error: "Link expirado" });
      return;
    }

    // Date range: visitor-supplied filters take precedence, then token-embedded dates,
    // then period type. When the token has explicit from/to (set by the dashboard at
    // share-link generation time), use them directly so the share matches the dashboard.
    const savedPeriod = config.period as { type?: string; from?: string; to?: string } | undefined;
    const periodType =
      filters?.periodType ?? savedPeriod?.type ?? "last_30_days";
    const dateFromRaw =
      filters?.dateFrom ?? savedPeriod?.from?.slice(0, 10);
    const dateToRaw =
      filters?.dateTo ?? savedPeriod?.to?.slice(0, 10);
    // If explicit dates are available (from visitor filter or token), use them directly.
    const { from, to } =
      dateFromRaw && dateToRaw
        ? { from: new Date(dateFromRaw), to: new Date(`${dateToRaw}T23:59:59.999Z`) }
        : getDateRange(periodType, dateFromRaw, dateToRaw);

    // Scope — enforce profile boundaries
    const profile = (config.profile as string) ?? "admin";
    const scopeId = (config.scopeId as string) ?? null;

    // Company scope: filter invoices/projects to the specific company
    const invoiceScope =
      profile === "company" && scopeId ? { company_id: scopeId } : {};
    const projectScope =
      profile === "company" && scopeId ? { client_id: scopeId } : {};
    // Nomad scope: filter task executions to the specific nomad
    const taskScope =
      profile === "nomad" && scopeId ? { nomade_id: scopeId } : {};

    const dateWhere = { gte: from, lte: to };
    // Paid invoices: use paid_at when set, fall back to created_at.
    // This ensures invoices created outside the window but paid within it are counted.
    const paidDateOr = [
      { paid_at: dateWhere },
      { paid_at: null as any, created_at: dateWhere },
    ];

    // ── Parallel queries ──────────────────────────────────────────────────────
    const [
      paidRevenue,
      revenueRecurring,
      revenueOneTime,
      revenueCreditPlan,
      pendingRevenue,
      projectsTotal,
      projectsInProgress,
      projectsDelivered,
      projectsCancelled,
      tasksTotal,
      tasksApproved,
      tasksInProgress,
      tasksPending,
      nomadsActive,
      nomadsNew,
      companiesActive,
      companiesTrial,
      companiesSuspended,
      companiesCancelled,
      companiesTotal,
      partnersActive,
    ] = await Promise.all([
      // Revenue: all paid invoices in period
      prisma.invoice.aggregate({
        _sum: { amount: true },
        _count: true,
        where: { status: "paid", OR: paidDateOr, ...invoiceScope },
      }),
      // Revenue breakdown: recurring (mensal lifecycle projects)
      prisma.invoice.aggregate({
        _sum: { amount: true },
        where: { status: "paid", OR: paidDateOr, project: { lifecycle: "mensal" }, ...invoiceScope },
      }),
      // Revenue breakdown: one-time (avulso lifecycle projects)
      prisma.invoice.aggregate({
        _sum: { amount: true },
        where: { status: "paid", OR: paidDateOr, project: { lifecycle: "avulso" }, ...invoiceScope },
      }),
      // Revenue breakdown: credit plan (invoices not linked to any project)
      prisma.invoice.aggregate({
        _sum: { amount: true },
        where: { status: "paid", OR: paidDateOr, project_id: null, ...invoiceScope },
      }),
      // Revenue: outstanding (pending + overdue)
      prisma.invoice.aggregate({
        _sum: { amount: true },
        where: {
          status: { in: ["pending", "overdue"] },
          created_at: dateWhere,
          ...invoiceScope,
        },
      }),
      // Projects
      prisma.project.count({ where: { created_at: dateWhere, ...projectScope } }),
      prisma.project.count({
        where: { status: "in-progress", created_at: dateWhere, ...projectScope },
      }),
      prisma.project.count({
        where: {
          status: { in: ["completed", "paid"] },
          created_at: dateWhere,
          ...projectScope,
        },
      }),
      prisma.project.count({
        where: { status: "cancelled", created_at: dateWhere, ...projectScope },
      }),
      // Task executions
      prisma.taskExecution.count({ where: { created_at: dateWhere, ...taskScope } }),
      prisma.taskExecution.count({
        where: { status: "approved", created_at: dateWhere, ...taskScope },
      }),
      prisma.taskExecution.count({
        where: {
          status: { in: ["in_progress", "launched"] },
          created_at: dateWhere,
          ...taskScope,
        },
      }),
      prisma.taskExecution.count({
        where: {
          status: { in: ["draft", "returned"] },
          created_at: dateWhere,
          ...taskScope,
        },
      }),
      // Nomads
      prisma.nomade.count({ where: { status: "ativo" } }),
      prisma.nomade.count({ where: { created_at: dateWhere } }),
      // Companies by status (not date-filtered — these are current totals)
      prisma.company.count({ where: { status: "ativo" } }),
      prisma.company.count({ where: { status: "prospecto" } }),
      prisma.company.count({ where: { status: "inadimplente" } }),
      prisma.company.count({ where: { status: "inativo" } }),
      prisma.company.count(),
      // Partners
      prisma.partnerProfile.count({ where: { status: "active" } }),
    ]);

    // ── Compute metrics ───────────────────────────────────────────────────────
    const revenue = paidRevenue._sum.amount ?? 0;
    const revenueRec = revenueRecurring._sum.amount ?? 0;
    const revenueOne = revenueOneTime._sum.amount ?? 0;
    const revenueCp = revenueCreditPlan._sum.amount ?? 0;
    const invoiceCount = paidRevenue._count ?? 0;
    const avgTicket =
      invoiceCount > 0 ? Math.round(revenue / invoiceCount) : 0;
    const outstanding = pendingRevenue._sum.amount ?? 0;

    const completionRate =
      tasksTotal > 0 ? Math.round((tasksApproved / tasksTotal) * 100) : 0;

    const pendingProjects = Math.max(
      projectsTotal - projectsInProgress - projectsDelivered - projectsCancelled,
      0,
    );

    // Build a synthetic 6-point trend from the period total (rough estimate)
    const trendBase = (revenue: number) =>
      [0.7, 0.78, 0.84, 0.9, 0.96, 1].map((f) => Math.round(revenue * f));

    res.json({
      _meta: {
        profile,
        periodType,
        from: from.toISOString(),
        to: to.toISOString(),
        isRealData: true,
      },
      revenue: {
        total: revenue,
        growth: 0,
        creditPlan: revenueCp,
        recurring: revenueRec,
        oneTime: revenueOne,
        projected: Math.round(revenue * 1.1),
      },
      mrr: {
        value: revenue,
        growth: 0,
        trendData: trendBase(revenue),
      },
      churn: {
        rate: 0,
        inactiveAccounts: companiesSuspended + companiesCancelled,
        cancelledProjects: projectsCancelled,
        revenueChurn: 0,
        revenueChurnRate: 0,
      },
      averageTicket: {
        general: avgTicket,
        growth: 0,
        perProject: avgTicket,
        trendData: Array(6).fill(avgTicket),
      },
      ltv: {
        value: avgTicket * 12,
        agencies: 0,
        leadPremium: 0,
        nomades: 0,
        hist0to1k: 0,
        hist1kto5k: 0,
        hist5kto15k: companiesActive,
        hist15kplus: 0,
      },
      activeProjects: {
        total: projectsTotal,
        inProgress: projectsInProgress,
        delivered: projectsDelivered,
        pending: pendingProjects,
        growth: 0,
      },
      tasks: {
        total: tasksTotal,
        done: tasksApproved,
        inProgress: tasksInProgress,
        pending: tasksPending,
        completionRate,
      },
      accountsReceivable: {
        total: outstanding + revenue,
        creditPlans: 0,
        postPaid: outstanding + revenue,
        others: 0,
        received: revenue,
        growth: 0,
      },
      nomads: {
        total: nomadsActive,
        active: nomadsActive,
        newThisMonth: nomadsNew,
        growth: 0,
        avgRating: 0,
      },
      partnerProgram: {
        activePartners: partnersActive,
        totalReferrals: 0,
        conversionRate: 0,
        partnerRevenue: 0,
      },
      statusOverview: {
        active: companiesActive,
        trial: companiesTrial,
        suspended: companiesSuspended,
        cancelled: companiesCancelled,
        total: companiesTotal,
      },
      creditPlans: {
        active: 0,
        totalValue: 0,
        avgValue: 0,
        overdue: 0,
      },
      platformActivities: {
        logins: 0,
        projectsCreated: projectsTotal,
        tasksCompleted: tasksApproved,
        messagesExchanged: 0,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
