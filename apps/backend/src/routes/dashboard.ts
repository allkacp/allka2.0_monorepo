import { Router } from "express";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../middleware/auth";

const router = Router();

// GET /api/dashboard/stats
router.get("/stats", verifyToken, async (req, res, next) => {
  try {
    const [
      totalCompanies,
      totalProjects,
      activeProjects,
      totalNomades,
      activeNomades,
      totalTasks,
      pendingTasks,
      approvedTasks,
      totalWithdrawals,
      pendingWithdrawals,
      totalInvoices,
      paidInvoices,
      projectsByStatusRaw,
      pendingPaymentsAgg,
      paidPaymentsAgg,
      totalProjectProducts,
      totalUsers,
      activeUsersReal,
      totalAgencies,
      totalPartners,
      totalCatalogProducts,
    ] = await Promise.all([
      prisma.company.count(),
      prisma.project.count(),
      prisma.project.count({ where: { status: "in-progress" } }),
      prisma.nomade.count(),
      prisma.nomade.count({ where: { status: "ativo" } }),
      prisma.taskExecution.count(),
      prisma.taskExecution.count({
        where: { status: { in: ["draft", "launched", "in_progress"] } },
      }),
      prisma.taskExecution.count({ where: { status: "approved" } }),
      prisma.withdrawalRequest.count(),
      prisma.withdrawalRequest.count({
        where: { status: "aguardando_analise" },
      }),
      prisma.invoice.count(),
      prisma.invoice.count({ where: { status: "paid" } }),
      // Contagens reais do fluxo Projeto -> Pagamento -> Tarefa (ver create-project.ts /
      // confirm-payment.ts). Distintas de totalProjects/activeProjects acima, que usam o
      // conceito antigo (Invoice/status "in-progress") de um subsistema financeiro paralelo.
      prisma.project.groupBy({ by: ["status"], _count: { id: true } }),
      prisma.payment.aggregate({ _count: true, _sum: { amount: true }, where: { status: "PENDENTE" } }),
      prisma.payment.aggregate({ _count: true, _sum: { amount: true }, where: { status: "PAGO" } }),
      prisma.projectProduct.count(),
      prisma.user.count(),
      prisma.user.count({ where: { is_active: true } }),
      prisma.agency.count(),
      prisma.partnerProfile.count(),
      prisma.product.count(),
    ]);

    const invoiceAmounts = await prisma.invoice.aggregate({
      _sum: { amount: true },
      where: { status: "paid" },
    });

    const projectsByStatus = Object.fromEntries(
      projectsByStatusRaw.map((g) => [g.status, g._count.id]),
    );

    res.json({
      companies: { total: totalCompanies },
      projects: {
        total: totalProjects,
        active: activeProjects,
        inactive: totalProjects - activeProjects,
        byStatus: projectsByStatus,
      },
      nomades: {
        total: totalNomades,
        active: activeNomades,
      },
      tasks: {
        total: totalTasks,
        pending: pendingTasks,
        approved: approvedTasks,
        completionRate:
          totalTasks > 0
            ? Math.round((approvedTasks / totalTasks) * 100)
            : 0,
      },
      financial: {
        totalRevenue: invoiceAmounts._sum.amount ?? 0,
        paidInvoices,
        totalInvoices,
        pendingWithdrawals,
        totalWithdrawals,
      },
      // Campos reais adicionais (Project/Payment/ProjectProduct/User/Agency/PartnerProfile/
      // Product) -- aditivos, não substituem nada acima. Alimentam os cards "Total de
      // Projetos", "Pagamentos Pendentes", "Produtos Vinculados", "Produtos no Catálogo" e
      // "Agências & Parceiros" do Admin Dashboard.
      payments: {
        pendingCount: pendingPaymentsAgg._count,
        pendingAmount: pendingPaymentsAgg._sum.amount ?? 0,
        paidCount: paidPaymentsAgg._count,
        paidAmount: paidPaymentsAgg._sum.amount ?? 0,
      },
      projectProducts: { total: totalProjectProducts },
      users: { total: totalUsers, active: activeUsersReal },
      agencies: { total: totalAgencies },
      partners: { total: totalPartners },
      catalogProducts: { total: totalCatalogProducts },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/revenue?from=&to=
// Returns real invoice-based revenue breakdown for the given date range.
router.get("/revenue", verifyToken, async (req, res, next) => {
  try {
    const fromParam = req.query.from as string | undefined;
    const toParam = req.query.to as string | undefined;
    const now = new Date();
    const from = fromParam ? new Date(fromParam) : new Date(now.getTime() - 30 * 86_400_000);
    const to = toParam ? new Date(toParam) : now;

    const dateWhere = { gte: from, lte: to };
    const paidDateOr = [
      { paid_at: dateWhere },
      { paid_at: null as any, created_at: dateWhere },
    ];

    const [totalRevenue, recurringRevenue, oneTimeRevenue, creditPlanRevenue] =
      await Promise.all([
        prisma.invoice.aggregate({
          _sum: { amount: true },
          _count: true,
          where: { status: "paid", OR: paidDateOr },
        }),
        prisma.invoice.aggregate({
          _sum: { amount: true },
          where: { status: "paid", OR: paidDateOr, project: { lifecycle: "mensal" } },
        }),
        prisma.invoice.aggregate({
          _sum: { amount: true },
          where: { status: "paid", OR: paidDateOr, project: { lifecycle: "avulso" } },
        }),
        prisma.invoice.aggregate({
          _sum: { amount: true },
          where: { status: "paid", OR: paidDateOr, project_id: null },
        }),
      ]);

    const total = totalRevenue._sum.amount ?? 0;
    const recurring = recurringRevenue._sum.amount ?? 0;
    const oneTime = oneTimeRevenue._sum.amount ?? 0;
    const creditPlan = creditPlanRevenue._sum.amount ?? 0;

    res.json({
      total,
      creditPlan,
      recurring,
      oneTime,
      projected: Math.round(total * 1.1),
      growth: 0,
      totalGrowth: 0,
      creditPlanGrowth: 0,
      recurringGrowth: 0,
      oneTimeGrowth: 0,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/recent-activities
router.get("/recent-activities", verifyToken, async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 10, 50);

    const [recentProjects, recentTasks, recentNomades] = await Promise.all([
      prisma.project.findMany({
        take: limit,
        orderBy: { created_at: "desc" },
        select: {
          id: true,
          project_code: true,
          title: true,
          status: true,
          created_at: true,
          client: { select: { name: true } },
          created_by: { select: { name: true } },
        },
      }),
      prisma.taskExecution.findMany({
        take: limit,
        orderBy: { updated_at: "desc" },
        select: {
          id: true,
          title: true,
          status: true,
          updated_at: true,
          nomade: { select: { name: true } },
        },
      }),
      prisma.nomade.findMany({
        take: 5,
        orderBy: { registration_date: "desc" },
        select: { id: true, name: true, level: true, status: true, registration_date: true },
      }),
    ]);

    const activities = [
      ...recentProjects.map((p) => ({
        type: "project",
        id: p.id,
        project_code: p.project_code,
        title: `Projeto: ${p.title}`,
        subtitle: p.client?.name,
        creator: p.created_by?.name ?? null,
        status: p.status,
        date: p.created_at,
      })),
      ...recentTasks.map((t) => ({
        type: "task",
        id: t.id,
        title: `Tarefa: ${t.title}`,
        subtitle: t.nomade?.name,
        status: t.status,
        date: t.updated_at,
      })),
      ...recentNomades.map((n) => ({
        type: "nomade",
        id: n.id,
        title: `Nômade: ${n.name}`,
        subtitle: n.level,
        status: n.status,
        date: n.registration_date,
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);

    res.json(activities);
  } catch (err) {
    next(err);
  }
});

// POST /api/dashboard/widgets
// Returns all widget data for the given date range — same calculations as /api/share/data.
router.post("/widgets", verifyToken, async (req, res, next) => {
  try {
    const { from: fromRaw, to: toRaw } = req.body as { from?: string; to?: string };
    const now = new Date();
    const from = fromRaw ? new Date(fromRaw) : new Date(now.getTime() - 30 * 86_400_000);
    const to = toRaw ? new Date(toRaw) : now;

    const dateWhere = { gte: from, lte: to };
    const paidDateOr = [
      { paid_at: dateWhere },
      { paid_at: null as any, created_at: dateWhere },
    ];

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
      tasksAgencyApproval,
      tasksClientApproval,
      tasksExpired,
      tasksCancelled,
      nomadsActive,
      nomadsNew,
      companiesActive,
      companiesTrial,
      companiesSuspended,
      companiesCancelled,
      companiesTotal,
      partnersActive,
    ] = await Promise.all([
      prisma.invoice.aggregate({ _sum: { amount: true }, _count: true, where: { status: "paid", OR: paidDateOr } }),
      prisma.invoice.aggregate({ _sum: { amount: true }, where: { status: "paid", OR: paidDateOr, project: { lifecycle: "mensal" } } }),
      prisma.invoice.aggregate({ _sum: { amount: true }, where: { status: "paid", OR: paidDateOr, project: { lifecycle: "avulso" } } }),
      prisma.invoice.aggregate({ _sum: { amount: true }, where: { status: "paid", OR: paidDateOr, project_id: null } }),
      prisma.invoice.aggregate({ _sum: { amount: true }, where: { status: { in: ["pending", "overdue"] }, created_at: dateWhere } }),
      prisma.project.count({ where: { created_at: dateWhere } }),
      prisma.project.count({ where: { status: "in-progress", created_at: dateWhere } }),
      prisma.project.count({ where: { status: { in: ["completed", "paid"] }, created_at: dateWhere } }),
      prisma.project.count({ where: { status: "cancelled", created_at: dateWhere } }),
      prisma.taskExecution.count({ where: { created_at: dateWhere } }),
      prisma.taskExecution.count({ where: { status: "approved", created_at: dateWhere } }),
      prisma.taskExecution.count({ where: { status: { in: ["in_progress", "launched"] }, created_at: dateWhere } }),
      prisma.taskExecution.count({ where: { status: { in: ["draft", "returned"] }, created_at: dateWhere } }),
      prisma.taskExecution.count({ where: { status: "agency_approval", created_at: dateWhere } }),
      prisma.taskExecution.count({ where: { status: "client_approval", created_at: dateWhere } }),
      prisma.taskExecution.count({ where: { status: "expired", created_at: dateWhere } }),
      prisma.taskExecution.count({ where: { status: "rejected", created_at: dateWhere } }),
      prisma.nomade.count({ where: { status: "ativo" } }),
      prisma.nomade.count({ where: { created_at: dateWhere } }),
      prisma.company.count({ where: { status: "ativo" } }),
      prisma.company.count({ where: { status: "prospecto" } }),
      prisma.company.count({ where: { status: "inadimplente" } }),
      prisma.company.count({ where: { status: "inativo" } }),
      prisma.company.count(),
      prisma.partnerProfile.count({ where: { status: "active" } }),
    ]);

    const revenue = paidRevenue._sum.amount ?? 0;
    const revenueRec = revenueRecurring._sum.amount ?? 0;
    const revenueOne = revenueOneTime._sum.amount ?? 0;
    const revenueCp = revenueCreditPlan._sum.amount ?? 0;
    const invoiceCount = paidRevenue._count ?? 0;
    const avgTicket = invoiceCount > 0 ? Math.round(revenue / invoiceCount) : 0;
    const outstanding = pendingRevenue._sum.amount ?? 0;
    const completionRate = tasksTotal > 0 ? Math.round((tasksApproved / tasksTotal) * 100) : 0;
    const pendingProjects = Math.max(projectsTotal - projectsInProgress - projectsDelivered - projectsCancelled, 0);
    const trendBase = (v: number) => [0.7, 0.78, 0.84, 0.9, 0.96, 1].map((f) => Math.round(v * f));

    res.json({
      revenue: { total: revenue, growth: 0, totalGrowth: 0, creditPlan: revenueCp, creditPlanGrowth: 0, recurring: revenueRec, recurringGrowth: 0, oneTime: revenueOne, oneTimeGrowth: 0, projected: Math.round(revenue * 1.1) },
      mrr: { total: revenue, growth: 0, trendData: trendBase(revenue) },
      churn: { inactiveAccounts: companiesSuspended + companiesCancelled, cancelledProjects: projectsCancelled, revenueChurn: 0, revenueChurnRate: 0 },
      averageTicket: { general: avgTicket, generalGrowth: 0, perProject: avgTicket, perProjectGrowth: 0, trendData: Array(6).fill(avgTicket) },
      ltv: { value: avgTicket * 12 },
      activeProjects: { total: projectsTotal, growth: 0 },
      tasks: { total: tasksTotal, completed: tasksApproved, inProgress: tasksInProgress, contracted: tasksPending, cancelled: tasksCancelled, agencyApproval: tasksAgencyApproval, clientApproval: tasksClientApproval, expired: tasksExpired },
      accountsReceivable: { total: outstanding + revenue, received: revenue },
      nomads: { total: nomadsActive, active: nomadsActive, newInPeriod: nomadsNew, growth: 0 },
      partnerProgram: { activePartners: partnersActive },
      statusOverview: { active: companiesActive, trial: companiesTrial, suspended: companiesSuspended, cancelled: companiesCancelled, total: companiesTotal },
      creditPlans: {},
      platformActivities: { actionsExecuted: tasksApproved },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/dre?from=&to=
// DRE (Demonstrativo de Resultado do Exercício) — P&L breakdown for the given period.
router.get("/dre", verifyToken, async (req, res, next) => {
  try {
    const fromParam = req.query.from as string | undefined;
    const toParam = req.query.to as string | undefined;
    const now = new Date();
    const from = fromParam ? new Date(fromParam) : new Date(now.getFullYear(), now.getMonth(), 1);
    const to = toParam ? new Date(toParam) : now;

    const dateWhere = { gte: from, lte: to };
    const paidDateOr = [
      { paid_at: dateWhere },
      { paid_at: null as any, created_at: dateWhere },
    ];

    const [receitaAgg, custosAgg, despesasByCat, despesasTotal] = await Promise.all([
      // Receita = faturas pagas no período
      prisma.invoice.aggregate({
        _sum: { amount: true },
        where: { status: "paid", OR: paidDateOr },
      }),
      // Custos Diretos (CMV) = pagamentos de nômades efetuados no período
      prisma.withdrawalRequest.aggregate({
        _sum: { amount: true },
        where: {
          status: "pagamento_efetuado",
          OR: [
            { paid_at: dateWhere },
            { paid_at: null as any, updated_at: dateWhere },
          ],
        },
      }),
      // Despesas Operacionais agrupadas por categoria
      prisma.expense.groupBy({
        by: ["category"],
        _sum: { amount: true },
        _count: true,
        where: {
          status: { in: ["paga", "pendente", "atrasada"] },
          due_date: { gte: from, lte: new Date(to.getTime() + 30 * 86_400_000) },
        },
        orderBy: { _sum: { amount: "desc" } },
      }),
      // Total de despesas operacionais
      prisma.expense.aggregate({
        _sum: { amount: true },
        where: {
          status: { in: ["paga", "pendente", "atrasada"] },
          due_date: { gte: from, lte: new Date(to.getTime() + 30 * 86_400_000) },
        },
      }),
    ]);

    const receita = receitaAgg._sum.amount ?? 0;
    const custosDiretos = custosAgg._sum.amount ?? 0;
    const lucroBruto = receita - custosDiretos;
    const margemBruta = receita > 0 ? Math.round((lucroBruto / receita) * 10000) / 100 : 0;
    const despesas = despesasTotal._sum.amount ?? 0;
    const lucroOperacional = lucroBruto - despesas;
    const margemOperacional = receita > 0 ? Math.round((lucroOperacional / receita) * 10000) / 100 : 0;

    res.json({
      receita,
      custosDiretos,
      lucroBruto,
      margemBruta,
      despesasOperacionais: despesas,
      lucroOperacional,
      margemOperacional,
      despesasPorCategoria: despesasByCat.map((d) => ({
        category: d.category,
        amount: d._sum.amount ?? 0,
        count: d._count,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/my-tasks
router.get("/my-tasks", verifyToken, async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 10, 50);

    // For nomad users, return their own tasks
    // For admin/other users, return most recent pending tasks
    const where =
      req.user?.role === "nomad" || req.user?.role === "nomad_admin"
        ? {
            nomade: { user_id: req.user.id },
            status: { in: ["launched", "in_progress", "returned"] },
          }
        : { status: { in: ["launched", "in_progress"] } };

    const tasks = await prisma.taskExecution.findMany({
      where,
      take: limit,
      orderBy: { due_date: "asc" },
      include: {
        project: { select: { id: true, title: true } },
        template: { select: { id: true, name: true } },
      },
    });

    res.json(tasks);
  } catch (err) {
    next(err);
  }
});

export default router;
