// @ts-nocheck
import type { ManualDataEntry } from "../types/admin-dashboard.types";

// ─── Inline fallback mock data generator ──────────────────────────────────────
// dev-mocks/ é gitignored e não está disponível no build de produção
export const generateDashboardData = (from?: Date, to?: Date): any => {
  const now = new Date();
  const f =
    from ?? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
  const t = to ?? now;
  const days = Math.max(1, Math.round((t.getTime() - f.getTime()) / 86400000));
  const m = days / 30; // multiplier relative to 30-day base
  const sc = (base: number) => Math.round(base * m); // scale financial/count
  const scSoft = (base: number) => Math.round(base * (0.5 + m * 0.5)); // softer scale for counts
  return {
    revenue: {
      total: sc(270800),
      growth: 18.1,
      totalGrowth: 18.1,
      series: [],
      trendData: [180000, 205000, 215000, 230000, 248000, sc(270800)].map((v) =>
        Math.round((v * m) / 1),
      ),
      creditPlan: sc(114000),
      creditPlanGrowth: 18,
      recurring: sc(97600),
      recurringGrowth: 8,
      oneTime: sc(59200),
      oneTimeGrowth: 14,
    },
    activeProjects: {
      total: scSoft(127),
      growth: 5.2,
      series: [],
      agencies: scSoft(48),
      agenciesGrowth: 7,
      leadPremium: scSoft(63),
      leadPremiumGrowth: 9,
      nomades: scSoft(16),
      nomadesGrowth: 3,
      newTotal: sc(22),
      newAgencies: sc(9),
      newLeadPremium: sc(10),
      newNomades: sc(3),
    },
    creditPlans: {
      total: sc(114000),
      growth: 18,
      series: [],
      basic: { revenue: sc(38000), newContracts: sc(12), growth: 8 },
      partner: { revenue: sc(45000), newContracts: sc(9), growth: 22 },
      premium: { revenue: sc(31000), newContracts: sc(5), growth: 14 },
    },
    mrr: {
      total: sc(97600),
      growth: 8,
      series: [],
      newMrr: sc(12400),
      expansion: sc(5200),
      contraction: sc(1800),
      churnRevenue: sc(3100),
      baseMrr: sc(89600),
      netChange: sc(12700),
      trendGrowth: 12,
      trendData: [72000, 78000, 82000, 86000, 91000, 97600].map((v) => sc(v)),
    },
    churn: {
      total: 0,
      growth: 0,
      series: [],
      inactiveAccounts: sc(23),
      inactiveGrowth: 4,
      agencies: sc(8),
      leadPremium: sc(5),
      nomades: sc(7),
      free: sc(3),
      cancelledProjects: sc(11),
      cancelledGrowth: 2,
      revenueChurn: sc(9300),
      revenueChurnRate: 3.2,
    },
    averageTicket: {
      total: 0,
      growth: 5,
      series: [],
      general: 1213,
      generalGrowth: 5,
      perProject: 2840,
      perProjectGrowth: 7,
      trendData: [980, 1050, 1100, 1180, 1210, 1213],
    },
    ltv: {
      total: 0,
      growth: 12,
      series: [],
      value: 8740,
      agencies: 14200,
      agenciesGrowth: 9,
      leadPremium: 11500,
      leadPremiumGrowth: 15,
      nomades: 3800,
      nomadesGrowth: 6,
      hist0to1k: 120,
      hist1kto5k: 280,
      hist5kto15k: 95,
      hist15kplus: 30,
    },
    accountsReceivable: {
      total: sc(187400),
      growth: 12,
      series: [],
      creditPlans: sc(98200),
      postPaid: sc(54700),
      others: sc(34500),
      received: sc(143600),
    },
    platformActivities: {
      activeAgencies: scSoft(34),
      avgSessionMinutes: 47,
      mau: scSoft(1240),
      dau: scSoft(312),
      sessions: sc(8740),
      actionsExecuted: sc(52300),
      trendData: [420, 510, 480, 630, 590, 710, 680].map((v) => sc(v)),
    },
    nomads: {
      total: scSoft(148),
      growth: 6,
      active: scSoft(112),
      activeGrowth: 9,
      inactive: scSoft(36),
      inactiveChange: -3,
      newInPeriod: sc(14),
      churn: sc(5),
      retention30d: 82,
      trendData: [95, 100, 104, 108, 110, 112].map((v) => scSoft(v)),
    },
    nomadsIndicators: {
      deliveryRate: 94.3,
      avgRating: 4.7,
      avgTimePerTask: 3.2,
      certified: 68,
      retention90d: 79,
    },
    nomadsRanking: { items: [] },
    agenciesRanking: [
      {
        id: "1",
        name: "Digital Works",
        avatar: "DW",
        rating: 4.9,
        projects: 23,
        contribution: "R$ 48k",
        specialty: "Dev & Design",
        color: "from-blue-500 to-indigo-600",
      },
      {
        id: "2",
        name: "Criativa Lab",
        avatar: "CL",
        rating: 4.8,
        projects: 18,
        contribution: "R$ 37k",
        specialty: "Branding",
        color: "from-pink-500 to-rose-600",
      },
      {
        id: "3",
        name: "Inovax Agency",
        avatar: "IA",
        rating: 4.7,
        projects: 15,
        contribution: "R$ 31k",
        specialty: "Marketing 360",
        color: "from-violet-500 to-purple-600",
      },
      {
        id: "4",
        name: "PixelForge",
        avatar: "PF",
        rating: 4.6,
        projects: 12,
        contribution: "R$ 24k",
        specialty: "UX/UI",
        color: "from-cyan-500 to-teal-600",
      },
      {
        id: "5",
        name: "BluePrint Co.",
        avatar: "BP",
        rating: 4.5,
        projects: 10,
        contribution: "R$ 19k",
        specialty: "Arquitetura",
        color: "from-amber-500 to-orange-600",
      },
    ],
    tasks: {
      total: sc(552),
      items: [],
      completed: sc(412),
      completedGrowth: 8,
      inProgress: scSoft(57),
      inProgressGrowth: 4,
      contracted: scSoft(83),
      contractedGrowth: 12,
      cancelled: sc(14),
      cancelledChange: -2,
      slaCompliance: 91.4,
    },
    activeUsers: {
      total: scSoft(284),
      empresas: scSoft(92),
      empresasGrowth: 5,
      agencias: scSoft(61),
      agenciasGrowth: 7,
      nomades: scSoft(112),
      nomadesGrowth: 9,
      admins: scSoft(19),
      adminsGrowth: 3,
      series: [],
    },
    partnerProgram: {
      total: scSoft(38),
      items: [],
      invitesSent: sc(124),
      pending: scSoft(47),
      accepted: scSoft(38),
      diamond: 3,
      platinum: 6,
      gold: 11,
      silver: 12,
      bronze: 6,
      mrrGenerated: sc(22400),
    },
    cmv: {
      totalCosts: sc(87400),
      revenue: sc(270800),
      cmvPercent: 32.3,
      prevCmvPercent: 34.1,
      nomades: { value: sc(42800), percent: 49 },
      impostos: { value: sc(18200), percent: 21 },
      comissoes: { value: sc(14900), percent: 17 },
      outros: { value: sc(11500), percent: 13 },
      variation: { cmvPercent: -1.8, totalCosts: -2.4, revenue: 5.6 },
    },
    statusOverview: {
      projects: {
        ongoing: scSoft(42),
        approved: scSoft(18),
        completed: sc(156),
        cancelled: sc(7),
        delayed: scSoft(11),
      },
      tasks: {
        contracted: scSoft(83),
        inProgress: scSoft(57),
        completed: sc(412),
        archived: sc(34),
      },
      leads: {
        new: scSoft(29),
        contacted: scSoft(15),
        proposal: scSoft(8),
        won: sc(12),
        lost: sc(5),
      },
    },
    metrics: {},
    activity: [],
    alerts: [],
    performers: [
      {
        id: "1",
        name: "Carlos Mendonça",
        avatar: "CM",
        rating: 4.9,
        projects: sc(34),
        badge: "gold",
        tasks: sc(128),
        revenue: `R$ ${sc(52)}k`,
        specialty: "Dev Full Stack",
      },
      {
        id: "2",
        name: "Ana Beatriz Lima",
        avatar: "AB",
        rating: 4.8,
        projects: sc(29),
        badge: "gold",
        tasks: sc(115),
        revenue: `R$ ${sc(44)}k`,
        specialty: "UI/UX Design",
      },
      {
        id: "3",
        name: "Rafael Torres",
        avatar: "RT",
        rating: 4.7,
        projects: sc(26),
        badge: "gold",
        tasks: sc(98),
        revenue: `R$ ${sc(39)}k`,
        specialty: "Marketing Digital",
      },
      {
        id: "4",
        name: "Juliana Ferreira",
        avatar: "JF",
        rating: 4.6,
        projects: sc(22),
        badge: "silver",
        tasks: sc(84),
        revenue: `R$ ${sc(31)}k`,
        specialty: "Copywriting",
      },
      {
        id: "5",
        name: "Marcos Oliveira",
        avatar: "MO",
        rating: 4.6,
        projects: sc(21),
        badge: "silver",
        tasks: sc(79),
        revenue: `R$ ${sc(28)}k`,
        specialty: "Dev Backend",
      },
      {
        id: "6",
        name: "Priscila Santos",
        avatar: "PS",
        rating: 4.5,
        projects: sc(19),
        badge: "silver",
        tasks: sc(71),
        revenue: `R$ ${sc(24)}k`,
        specialty: "SEO",
      },
      {
        id: "7",
        name: "Diego Cavalcante",
        avatar: "DC",
        rating: 4.4,
        projects: sc(17),
        badge: "bronze",
        tasks: sc(63),
        revenue: `R$ ${sc(19)}k`,
        specialty: "Tráfego Pago",
      },
      {
        id: "8",
        name: "Fernanda Costa",
        avatar: "FC",
        rating: 4.3,
        projects: sc(15),
        badge: "bronze",
        tasks: sc(57),
        revenue: `R$ ${sc(16)}k`,
        specialty: "Social Media",
      },
    ],
    userDistribution: [],
    systemAlerts: [],
    adminProfiles: [],
    permissionMatrix: [],
    managementTools: [],
  };
};

// ─── Historical (manual) data system ─────────────────────────────────────────

export const MANUAL_WIDGET_MAP: Record<keyof ManualDataEntry, string> = {
  revenue_total: "revenue",
  mrr_total: "mrr",
  creditPlans_total: "creditPlans",
  accountsReceivable_total: "accountsReceivable",
  cmv_totalCosts: "cmv",
  activeProjects_total: "activeProjectsWidget",
  tasks_total: "tasks",
  tasks_completed: "tasks",
  tasks_inProgress: "tasks",
  tasks_slaCompliance: "tasks",
  nomads_total: "nomads",
  nomads_active: "nomads",
  partnerProgram_total: "partnerProgram",
  partnerProgram_invitesSent: "partnerProgram",
  partnerProgram_mrrGenerated: "partnerProgram",
  churn_revenueChurnRate: "churn",
  churn_revenueChurn: "churn",
  averageTicket_general: "averageTicket",
  ltv_value: "ltv",
};

export const mergeManualData = (base: any, entry: ManualDataEntry): any => {
  const m = { ...base };
  if (entry.revenue_total != null)
    m.revenue = { ...m.revenue, total: entry.revenue_total };
  if (entry.mrr_total != null) m.mrr = { ...m.mrr, total: entry.mrr_total };
  if (entry.creditPlans_total != null)
    m.creditPlans = { ...m.creditPlans, total: entry.creditPlans_total };
  if (entry.accountsReceivable_total != null)
    m.accountsReceivable = {
      ...m.accountsReceivable,
      total: entry.accountsReceivable_total,
    };
  if (entry.cmv_totalCosts != null)
    m.cmv = { ...m.cmv, totalCosts: entry.cmv_totalCosts };
  if (entry.activeProjects_total != null)
    m.activeProjects = {
      ...m.activeProjects,
      total: entry.activeProjects_total,
    };
  const tasksOverride: any = {};
  if (entry.tasks_total != null) tasksOverride.total = entry.tasks_total;
  if (entry.tasks_completed != null)
    tasksOverride.completed = entry.tasks_completed;
  if (entry.tasks_inProgress != null)
    tasksOverride.inProgress = entry.tasks_inProgress;
  if (entry.tasks_slaCompliance != null)
    tasksOverride.slaCompliance = entry.tasks_slaCompliance;
  if (Object.keys(tasksOverride).length)
    m.tasks = { ...m.tasks, ...tasksOverride };
  if (entry.nomads_total != null)
    m.nomads = { ...m.nomads, total: entry.nomads_total };
  if (entry.nomads_active != null)
    m.nomads = { ...m.nomads, active: entry.nomads_active };
  const ppOverride: any = {};
  if (entry.partnerProgram_total != null)
    ppOverride.total = entry.partnerProgram_total;
  if (entry.partnerProgram_invitesSent != null)
    ppOverride.invitesSent = entry.partnerProgram_invitesSent;
  if (entry.partnerProgram_mrrGenerated != null)
    ppOverride.mrrGenerated = entry.partnerProgram_mrrGenerated;
  if (Object.keys(ppOverride).length)
    m.partnerProgram = { ...m.partnerProgram, ...ppOverride };
  if (entry.churn_revenueChurnRate != null)
    m.churn = { ...m.churn, revenueChurnRate: entry.churn_revenueChurnRate };
  if (entry.churn_revenueChurn != null)
    m.churn = { ...m.churn, revenueChurn: entry.churn_revenueChurn };
  if (entry.averageTicket_general != null)
    m.averageTicket = {
      ...m.averageTicket,
      general: entry.averageTicket_general,
    };
  if (entry.ltv_value != null) m.ltv = { ...m.ltv, value: entry.ltv_value };
  return m;
};
