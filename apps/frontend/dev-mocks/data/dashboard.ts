// Mock dashboard data — shape matches DashboardStats and RecentActivity from useDashboard
import type { MockApiProject } from "./projects";
import type { MockApiTask } from "./tasks";
import type { MockCompany } from "./companies";
import type { MockUser } from "./users";

export function buildDashboardStats(
  companies: MockCompany[],
  projects: MockApiProject[],
  tasks: MockApiTask[],
  users: MockUser[],
) {
  const activeProjects = projects.filter((p) =>
    ["in-progress", "planning", "awaiting-payment"].includes(p.status),
  );
  const inactiveProjects = projects.filter((p) =>
    ["completed", "cancelled", "paused", "draft"].includes(p.status),
  );
  const nomades = users.filter((u) => u.account_type === "nomade");
  const pendingTasks = tasks.filter((t) => t.status === "pending");
  const completedTasks = tasks.filter((t) => t.status === "completed");
  const totalRevenue = projects.reduce((sum, p) => sum + p.value, 0);

  return {
    companies: { total: companies.length },
    projects: {
      total: projects.length,
      active: activeProjects.length,
      inactive: inactiveProjects.length,
    },
    nomades: {
      total: nomades.length,
      active: nomades.filter((n) => n.is_active).length,
    },
    tasks: {
      total: tasks.length,
      pending: pendingTasks.length,
      approved: completedTasks.length,
      completionRate: tasks.length
        ? Math.round((completedTasks.length / tasks.length) * 100)
        : 0,
    },
    financial: {
      totalRevenue,
      paidInvoices: Math.round(totalRevenue * 0.72),
      totalInvoices: Math.round(totalRevenue * 0.85),
      pendingWithdrawals: 3200,
      totalWithdrawals: 18500,
    },
  };
}

export interface MockRecentActivity {
  type: string;
  id: string;
  title: string;
  subtitle: string | null;
  status: string;
  date: string;
}

export const mockRecentActivities: MockRecentActivity[] = [
  {
    type: "project",
    id: "3",
    title: "Landing Page Produto X",
    subtitle: "Google Brasil",
    status: "planning",
    date: "2026-04-14T10:00:00Z",
  },
  {
    type: "task",
    id: "4",
    title: "Post Instagram — Café da Semana",
    subtitle: "Starbucks Coffee → Social Media Mensal",
    status: "in_progress",
    date: "2026-04-14T08:00:00Z",
  },
  {
    type: "project",
    id: "7",
    title: "App de Fidelidade",
    subtitle: "Tesla Brasil",
    status: "awaiting-payment",
    date: "2026-04-14T16:00:00Z",
  },
  {
    type: "task",
    id: "11",
    title: "Artigo — Tendências de Marketing 2026",
    subtitle: "Ambev S.A. → Content Marketing Mensal",
    status: "in_progress",
    date: "2026-04-14T09:00:00Z",
  },
  {
    type: "user",
    id: "10",
    title: "Diego Costa",
    subtitle: "Nubank — admin",
    status: "active",
    date: "2026-04-12T10:00:00Z",
  },
  {
    type: "project",
    id: "10",
    title: "Identidade Visual Corporativa",
    subtitle: "Embraer",
    status: "in-progress",
    date: "2026-04-14T15:00:00Z",
  },
  {
    type: "task",
    id: "9",
    title: "Gravação — dia 1",
    subtitle: "Nubank → Vídeo Institucional",
    status: "in_progress",
    date: "2026-04-12T10:00:00Z",
  },
  {
    type: "project",
    id: "9",
    title: "Redesign Portal Interno",
    subtitle: "iFood",
    status: "paused",
    date: "2026-04-01T11:00:00Z",
  },
];

// ─── Period-aware dashboard data ─────────────────────────────────────────────

function createSeededRng(from: Date, to: Date): () => number {
  let s =
    (from.getFullYear() * 10000 +
      (from.getMonth() + 1) * 100 +
      from.getDate() +
      ((to.getFullYear() * 10000 +
        (to.getMonth() + 1) * 100 +
        to.getDate()) *
        31)) |
    1;
  return () => {
    s ^= s << 13;
    s ^= s >> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967295;
  };
}

function sc(base: number, f: number, rng: () => number, v = 0.12): number {
  return Math.max(0, Math.round(base * f * (1 - v + rng() * v * 2)));
}

function scf(base: number, f: number, rng: () => number, v = 0.12): number {
  return parseFloat(
    Math.max(0, base * f * (1 - v + rng() * v * 2)).toFixed(1),
  );
}

export interface DashboardPeriodData {
  revenue: {
    total: number;
    totalGrowth: number;
    creditPlan: number;
    creditPlanGrowth: number;
    recurring: number;
    recurringGrowth: number;
    oneTime: number;
    oneTimeGrowth: number;
  };
  activeProjects: {
    total: number;
    growth: number;
    agencies: number;
    agenciesGrowth: number;
    leadPremium: number;
    leadPremiumGrowth: number;
    newTotal: number;
    newAgencies: number;
    newLeadPremium: number;
  };
  creditPlans: {
    total: number;
    growth: number;
    basic: { revenue: number; newContracts: number; growth: number };
    partner: { revenue: number; newContracts: number; growth: number };
    premium: { revenue: number; newContracts: number; growth: number };
  };
  mrr: {
    total: number;
    growth: number;
    newMrr: number;
    expansion: number;
    contraction: number;
    churnRevenue: number;
    churnRate: number;
    newContracts: number;
    baseMrr: number;
    netChange: number;
    trendData: number[];
    trendGrowth: number;
  };
  churn: {
    inactiveAccounts: number;
    inactiveGrowth: number;
    agencies: number;
    leadPremium: number;
    nomades: number;
    free: number;
    cancelledProjects: number;
    cancelledGrowth: number;
    revenueChurn: number;
    revenueChurnRate: number;
  };
  averageTicket: {
    general: number;
    generalGrowth: number;
    agencies: number;
    agenciesGrowth: number;
    leadPremium: number;
    leadPremiumGrowth: number;
    nomades: number;
    nomadesGrowth: number;
    perProject: number;
    perProjectGrowth: number;
    trendData: number[];
  };
  ltv: {
    value: number;
    growth: number;
    agencies: number;
    agenciesGrowth: number;
    leadPremium: number;
    leadPremiumGrowth: number;
    nomades: number;
    nomadesGrowth: number;
    hist0to1k: number;
    hist1kto5k: number;
    hist5kto15k: number;
    hist15kplus: number;
  };
  cmv: {
    totalCosts: number;
    revenue: number;
    cmvPercent: number;
    prevCmvPercent: number;
    nomades: { value: number; percent: number };
    impostos: { value: number; percent: number };
    comissoes: { value: number; percent: number };
    outros: { value: number; percent: number };
    variation: { totalCosts: number; cmvPercent: number };
  };
  platformActivities: {
    activeAgencies: number;
    avgSessionMinutes: number;
    mau: number;
    dau: number;
    sessions: number;
    actionsExecuted: number;
    trendData: number[];
  };
  nomads: {
    total: number;
    growth: number;
    active: number;
    activeGrowth: number;
    inactive: number;
    inactiveChange: number;
    newInPeriod: number;
    churn: number;
    retention30d: number;
    trendData: number[];
  };
  performers: Array<{
    id: number;
    name: string;
    rating: number;
    projects: number;
    badge: string;
  }>;
  agenciesRanking: Array<{
    id: number;
    name: string;
    projects: number;
    rating: number;
    contribution: string;
  }>;
  statusOverview: {
    projects: {
      ongoing: number;
      approved: number;
      completed: number;
      cancelled: number;
      delayed: number;
    };
    tasks: {
      contracted: number;
      inProgress: number;
      completed: number;
      archived: number;
    };
    leads: {
      new: number;
      contacted: number;
      proposal: number;
      won: number;
      lost: number;
    };
  };
  accountsReceivable: {
    total: number;
    creditPlans: number;
    postPaid: number;
    others: number;
    received: number;
    growth: number;
  };
  tasks: {
    completed: number;
    completedGrowth: number;
    inProgress: number;
    inProgressGrowth: number;
    contracted: number;
    contractedGrowth: number;
    cancelled: number;
    cancelledChange: number;
    slaCompliance: number;
  };
  nomadsIndicators: {
    deliveryRate: number;
    avgRating: number;
    avgTimePerTask: number;
    certified: number;
    retention90d: number;
  };
  activeUsers: {
    empresas: number;
    agencias: number;
    nomades: number;
    admins: number;
    total: number;
    empresasGrowth: number;
    agenciasGrowth: number;
    nomadesGrowth: number;
    adminsGrowth: number;
  };
  partnerProgram: {
    invitesSent: number;
    pending: number;
    accepted: number;
    activePartners: number;
    diamond: number;
    platinum: number;
    gold: number;
    silver: number;
    bronze: number;
    mrrGenerated: number;
  };
  userDistribution: Array<{
    type: string;
    count: number;
    percentage: number;
    growth: string;
    color: string;
  }>;
}

/**
 * Generate period-aware dashboard data.
 * Flow metrics (revenue, tasks, new projects …) scale with the number of days.
 * Stock metrics (MRR, LTV, active users …) vary slightly based on the seed.
 */
export function generateDashboardData(
  from: Date,
  to: Date,
): DashboardPeriodData {
  const days = Math.max(
    1,
    Math.ceil((to.getTime() - from.getTime()) / 86_400_000),
  );
  const f = days / 30; // scale factor: 1 = 30-day baseline
  const rng = createSeededRng(from, to);

  // ── Revenue (flow) ─────────────────────────────────────────────────────────
  const revTotal = sc(284700, f, rng);
  const revCreditPlan = sc(119100, f, rng);
  const revRecurring = sc(99100, f, rng);
  const revOneTime = revTotal - revCreditPlan - revRecurring;

  // ── Active projects (flow) ─────────────────────────────────────────────────
  const apTotal = sc(312, f, rng);
  const apAgencies = Math.round(apTotal * 0.673);
  const apLeadPremium = apTotal - apAgencies;
  const apNew = sc(47, f, rng);
  const apNewAgencies = Math.round(apNew * 0.68);

  // ── Credit plans (flow) ────────────────────────────────────────────────────
  const cpBasic = sc(32000, f, rng);
  const cpPartner = sc(45500, f, rng);
  const cpPremium = sc(45950, f, rng);
  const cpTotal = cpBasic + cpPartner + cpPremium;

  // ── MRR (stock – small scale factor) ────────────────────────────────────────
  const sf = 1 + (f - 1) * 0.15;
  const mrrTotal = sc(78420, sf, rng);
  const mrrNew = sc(9000, sf, rng);
  const mrrExpansion = sc(4200, sf, rng);
  const mrrContraction = sc(1500, sf, rng);
  const mrrChurnRev = sc(3800, sf, rng);
  const mrrBaseMrr = Math.max(
    0,
    mrrTotal - mrrNew - mrrExpansion + mrrContraction + mrrChurnRev,
  );
  const mrrNetChange = mrrNew + mrrExpansion - mrrContraction - mrrChurnRev;
  const mrrNewContracts = sc(48, sf, rng);
  const mrrTrend = [0.83, 0.87, 0.89, 0.92, 0.96, 1.0].map((r) =>
    Math.round(mrrTotal * r),
  );

  // ── Churn (flow) ───────────────────────────────────────────────────────────
  const churnInactive = sc(24, f, rng);
  const churnCancelledProj = sc(11, f, rng);
  const churnRevenue = sc(14200, f, rng);

  // ── Average ticket (stock) ─────────────────────────────────────────────────
  const atGeneral = sc(1280, 1, rng, 0.08);
  const atAgencies = sc(1750, 1, rng, 0.08);
  const atLeadPrem = sc(1120, 1, rng, 0.08);
  const atNomades = sc(680, 1, rng, 0.08);
  const atPerProject = sc(940, 1, rng, 0.08);
  const atTrend = [0.72, 0.77, 0.82, 0.88, 0.95, 1.0].map((r) =>
    Math.round(atGeneral * r),
  );

  // ── LTV (stock) ────────────────────────────────────────────────────────────
  const ltvValue = sc(10080, 1, rng, 0.08);
  const ltvAgencies = sc(14200, 1, rng, 0.08);
  const ltvLeadPrem = sc(9100, 1, rng, 0.08);
  const ltvNomades = sc(4200, 1, rng, 0.08);

  // ── CMV (flow) ─────────────────────────────────────────────────────────────
  const cmvCosts = sc(124320, f, rng);
  const cmvRevenue = sc(482400, f, rng);
  const cmvPct = parseFloat(((cmvCosts / cmvRevenue) * 100).toFixed(1));
  const cmvPrevPct = parseFloat((cmvPct + scf(1.0, 1, rng, 0.5)).toFixed(1));
  const cmvNomades = Math.round(cmvCosts * 0.499);
  const cmvImpostos = Math.round(cmvCosts * 0.228);
  const cmvComissoes = Math.round(cmvCosts * 0.193);
  const cmvOutros = cmvCosts - cmvNomades - cmvImpostos - cmvComissoes;

  // ── Platform activities (mixed) ────────────────────────────────────────────
  const paAgencies = sc(182, 1, rng, 0.08);
  const paAvgMin = sc(42, 1, rng, 0.08);
  const paMau = sc(528, 1, rng, 0.08);
  const paDau = sc(128, 1, rng, 0.08);
  const paSessions = sc(3820, f, rng);
  const paActions = sc(14200, f, rng);
  const paTrend = [0.73, 0.82, 0.78, 0.86, 0.95, 0.84, 1.0].map((r) =>
    Math.round(paDau * r),
  );

  // ── Nomads (stock) ─────────────────────────────────────────────────────────
  const nmTotal = sc(316, 1, rng, 0.08);
  const nmActive = Math.round(nmTotal * 0.785);
  const nmInactive = nmTotal - nmActive;
  const nmNew = sc(24, f, rng);
  const nmChurn = sc(8, f, rng);
  const nmTrendStart = Math.round(nmActive * 0.887);
  const nmTrend = Array.from({ length: 7 }, (_, i) =>
    Math.round(nmTrendStart + ((nmActive - nmTrendStart) / 6) * i),
  );

  // ── Ranking projects (flow) ────────────────────────────────────────────────
  const nmP1 = sc(45, f, rng);
  const nmP2 = sc(38, f, rng);
  const nmP3 = sc(32, f, rng);
  const agP1 = sc(55, f, rng);
  const agP2 = sc(48, f, rng);
  const agP3 = sc(42, f, rng);

  // ── Status overview (flow) ─────────────────────────────────────────────────
  const soOngoing = sc(45, f, rng);
  const soApproved = sc(18, 1, rng, 0.1);
  const soCompleted = sc(73, f, rng);
  const soCancelled = sc(5, f, rng);
  const soDelayed = sc(8, 1, rng, 0.1);
  const soTContracted = sc(87, 1, rng, 0.1);
  const soTInProgress = sc(34, 1, rng, 0.1);
  const soTCompleted = sc(456, f, rng);
  const soTArchived = sc(23, f, rng);
  const soLNew = sc(56, f, rng);
  const soLContacted = sc(32, 1, rng, 0.1);
  const soLProposal = sc(15, 1, rng, 0.1);
  const soLWon = sc(9, f, rng);
  const soLLost = sc(21, f, rng);

  // ── Accounts receivable (stock) ────────────────────────────────────────────
  const arTotal = sc(182450, 1, rng, 0.08);
  const arCreditPlans = Math.round(arTotal * 0.538);
  const arPostPaid = Math.round(arTotal * 0.398);
  const arOthers = arTotal - arCreditPlans - arPostPaid;
  const arReceived = sc(167000, 1, rng, 0.08);

  // ── Tasks (flow) ───────────────────────────────────────────────────────────
  const tCompleted = sc(1248, f, rng);
  const tInProgress = sc(87, 1, rng, 0.1);
  const tContracted = sc(234, 1, rng, 0.1);
  const tCancelled = sc(19, f, rng);

  // ── Active users (stock) ───────────────────────────────────────────────────
  const auEmpresasBase = sc(632, 1, rng, 0.08);
  const auAgenciasBase = sc(418, 1, rng, 0.08);
  const auNomadesBase = sc(1124, 1, rng, 0.08);
  const auAdminsBase = sc(28, 1, rng, 0.05);

  // ── User distribution (stock) ─────────────────────────────────────────────
  const udEmpresas = sc(847, 1, rng, 0.06);
  const udAgencias = sc(623, 1, rng, 0.06);
  const udNomades = sc(1247, 1, rng, 0.06);
  const udAdmins = sc(130, 1, rng, 0.06);
  const udTotal = udEmpresas + udAgencias + udNomades + udAdmins;

  // ── Partner program (flow for invites, stock for partners) ─────────────────
  const ppInvites = sc(5, f, rng);

  return {
    revenue: {
      total: revTotal,
      totalGrowth: scf(15.2, 1, rng, 0.2),
      creditPlan: revCreditPlan,
      creditPlanGrowth: scf(18.7, 1, rng, 0.2),
      recurring: revRecurring,
      recurringGrowth: scf(13.4, 1, rng, 0.2),
      oneTime: Math.max(0, revOneTime),
      oneTimeGrowth: scf(10.9, 1, rng, 0.2),
    },
    activeProjects: {
      total: apTotal,
      growth: sc(10, 1, rng, 0.25),
      agencies: apAgencies,
      agenciesGrowth: sc(8, 1, rng, 0.25),
      leadPremium: apLeadPremium,
      leadPremiumGrowth: sc(15, 1, rng, 0.25),
      newTotal: apNew,
      newAgencies: apNewAgencies,
      newLeadPremium: apNew - apNewAgencies,
    },
    creditPlans: {
      total: cpTotal,
      growth: sc(12, 1, rng, 0.25),
      basic: {
        revenue: cpBasic,
        newContracts: sc(12, f, rng),
        growth: sc(5, 1, rng, 0.3),
      },
      partner: {
        revenue: cpPartner,
        newContracts: sc(24, f, rng),
        growth: sc(18, 1, rng, 0.3),
      },
      premium: {
        revenue: cpPremium,
        newContracts: sc(8, f, rng),
        growth: -sc(2, 1, rng, 0.3),
      },
    },
    mrr: {
      total: mrrTotal,
      growth: sc(8, 1, rng, 0.25),
      newMrr: mrrNew,
      expansion: mrrExpansion,
      contraction: mrrContraction,
      churnRevenue: mrrChurnRev,
      churnRate: scf(4.5, 1, rng, 0.15),
      newContracts: mrrNewContracts,
      baseMrr: mrrBaseMrr,
      netChange: mrrNetChange,
      trendData: mrrTrend,
      trendGrowth: sc(20, 1, rng, 0.2),
    },
    churn: {
      inactiveAccounts: churnInactive,
      inactiveGrowth: sc(5, 1, rng, 0.3),
      agencies: Math.round(churnInactive * 0.25),
      leadPremium: Math.round(churnInactive * 0.125),
      nomades: Math.round(churnInactive * 0.333),
      free:
        churnInactive -
        Math.round(churnInactive * 0.25) -
        Math.round(churnInactive * 0.125) -
        Math.round(churnInactive * 0.333),
      cancelledProjects: churnCancelledProj,
      cancelledGrowth: sc(10, 1, rng, 0.3),
      revenueChurn: churnRevenue,
      revenueChurnRate: scf(3.2, 1, rng, 0.15),
    },
    averageTicket: {
      general: atGeneral,
      generalGrowth: sc(4, 1, rng, 0.3),
      agencies: atAgencies,
      agenciesGrowth: sc(6, 1, rng, 0.3),
      leadPremium: atLeadPrem,
      leadPremiumGrowth: sc(2, 1, rng, 0.3),
      nomades: atNomades,
      nomadesGrowth: sc(1, 1, rng, 0.3),
      perProject: atPerProject,
      perProjectGrowth: sc(3, 1, rng, 0.3),
      trendData: atTrend,
    },
    ltv: {
      value: ltvValue,
      growth: sc(6, 1, rng, 0.3),
      agencies: ltvAgencies,
      agenciesGrowth: sc(8, 1, rng, 0.3),
      leadPremium: ltvLeadPrem,
      leadPremiumGrowth: sc(4, 1, rng, 0.3),
      nomades: ltvNomades,
      nomadesGrowth: -sc(1, 1, rng, 0.3),
      hist0to1k: sc(342, 1, rng, 0.06),
      hist1kto5k: sc(210, 1, rng, 0.06),
      hist5kto15k: sc(83, 1, rng, 0.06),
      hist15kplus: sc(28, 1, rng, 0.06),
    },
    cmv: {
      totalCosts: cmvCosts,
      revenue: cmvRevenue,
      cmvPercent: cmvPct,
      prevCmvPercent: cmvPrevPct,
      nomades: {
        value: cmvNomades,
        percent: parseFloat(((cmvNomades / cmvCosts) * 100).toFixed(1)),
      },
      impostos: {
        value: cmvImpostos,
        percent: parseFloat(((cmvImpostos / cmvCosts) * 100).toFixed(1)),
      },
      comissoes: {
        value: cmvComissoes,
        percent: parseFloat(((cmvComissoes / cmvCosts) * 100).toFixed(1)),
      },
      outros: {
        value: cmvOutros,
        percent: parseFloat(((cmvOutros / cmvCosts) * 100).toFixed(1)),
      },
      variation: {
        totalCosts: sc(4, 1, rng, 0.3),
        cmvPercent: -scf(1.0, 1, rng, 0.3),
      },
    },
    platformActivities: {
      activeAgencies: paAgencies,
      avgSessionMinutes: paAvgMin,
      mau: paMau,
      dau: paDau,
      sessions: paSessions,
      actionsExecuted: paActions,
      trendData: paTrend,
    },
    nomads: {
      total: nmTotal,
      growth: sc(4, 1, rng, 0.25),
      active: nmActive,
      activeGrowth: sc(6, 1, rng, 0.25),
      inactive: nmInactive,
      inactiveChange: -sc(2, 1, rng, 0.3),
      newInPeriod: nmNew,
      churn: nmChurn,
      retention30d: sc(78, 1, rng, 0.05),
      trendData: nmTrend,
    },
    performers: [
      { id: 1, name: "Ana Santos", rating: 4.9, projects: nmP1, badge: "gold" },
      {
        id: 2,
        name: "Pedro Costa",
        rating: 4.8,
        projects: nmP2,
        badge: "silver",
      },
      {
        id: 3,
        name: "Maria Oliveira",
        rating: 4.7,
        projects: nmP3,
        badge: "bronze",
      },
    ],
    agenciesRanking: [
      {
        id: 1,
        name: "Alpha Solutions",
        projects: agP1,
        rating: 4.8,
        contribution: `R$ ${Math.round(agP1 * 2.73)}k`,
      },
      {
        id: 2,
        name: "Beta Innovations",
        projects: agP2,
        rating: 4.7,
        contribution: `R$ ${Math.round(agP2 * 2.5)}k`,
      },
      {
        id: 3,
        name: "Gamma Marketing",
        projects: agP3,
        rating: 4.6,
        contribution: `R$ ${Math.round(agP3 * 2.38)}k`,
      },
    ],
    statusOverview: {
      projects: {
        ongoing: soOngoing,
        approved: soApproved,
        completed: soCompleted,
        cancelled: soCancelled,
        delayed: soDelayed,
      },
      tasks: {
        contracted: soTContracted,
        inProgress: soTInProgress,
        completed: soTCompleted,
        archived: soTArchived,
      },
      leads: {
        new: soLNew,
        contacted: soLContacted,
        proposal: soLProposal,
        won: soLWon,
        lost: soLLost,
      },
    },
    accountsReceivable: {
      total: arTotal,
      creditPlans: arCreditPlans,
      postPaid: arPostPaid,
      others: arOthers,
      received: arReceived,
      growth: sc(6, 1, rng, 0.25),
    },
    tasks: {
      completed: tCompleted,
      completedGrowth: sc(12, 1, rng, 0.25),
      inProgress: tInProgress,
      inProgressGrowth: sc(5, 1, rng, 0.25),
      contracted: tContracted,
      contractedGrowth: sc(8, 1, rng, 0.25),
      cancelled: tCancelled,
      cancelledChange: -sc(3, 1, rng, 0.25),
      slaCompliance: scf(94.2, 1, rng, 0.02),
    },
    nomadsIndicators: {
      deliveryRate: scf(97.3, 1, rng, 0.02),
      avgRating: scf(4.7, 1, rng, 0.02),
      avgTimePerTask: scf(2.4, 1, rng, 0.08),
      certified: sc(68, 1, rng, 0.05),
      retention90d: sc(81, 1, rng, 0.04),
    },
    activeUsers: {
      empresas: auEmpresasBase,
      agencias: auAgenciasBase,
      nomades: auNomadesBase,
      admins: auAdminsBase,
      total: auEmpresasBase + auAgenciasBase + auNomadesBase + auAdminsBase,
      empresasGrowth: sc(15, 1, rng, 0.25),
      agenciasGrowth: sc(22, 1, rng, 0.25),
      nomadesGrowth: sc(8, 1, rng, 0.25),
      adminsGrowth: sc(3, 1, rng, 0.25),
    },
    partnerProgram: {
      invitesSent: ppInvites,
      pending: sc(2, 1, rng, 0.25),
      accepted: sc(2, 1, rng, 0.25),
      activePartners: sc(2, 1, rng, 0.2),
      diamond: 1,
      platinum: 1,
      gold: 0,
      silver: 0,
      bronze: 0,
      mrrGenerated: sc(89400, 1, rng, 0.08),
    },
    userDistribution: [
      {
        type: "Empresas",
        count: udEmpresas,
        percentage: parseFloat(((udEmpresas / udTotal) * 100).toFixed(1)),
        growth: `+${sc(15, 1, rng, 0.2)}%`,
        color: "from-info to-info-foreground",
      },
      {
        type: "Agências",
        count: udAgencias,
        percentage: parseFloat(((udAgencias / udTotal) * 100).toFixed(1)),
        growth: `+${sc(22, 1, rng, 0.2)}%`,
        color: "from-success to-success-foreground",
      },
      {
        type: "Nômades",
        count: udNomades,
        percentage: parseFloat(((udNomades / udTotal) * 100).toFixed(1)),
        growth: `+${sc(8, 1, rng, 0.2)}%`,
        color: "from-chart-4 to-chart-4",
      },
      {
        type: "Admins",
        count: udAdmins,
        percentage: parseFloat(((udAdmins / udTotal) * 100).toFixed(1)),
        growth: `+${sc(3, 1, rng, 0.2)}%`,
        color: "from-warning to-warning-foreground",
      },
    ],
  };
}
