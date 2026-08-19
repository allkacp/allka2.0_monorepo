import { Router } from "express";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../middleware/auth";
import { computeDashboardWidgetsMetrics } from "../lib/dashboard-widgets";
import {
  resolveAuthenticatedProfile,
  resolveOwnScopeId,
  resolveDashboardScopeExtras,
} from "../lib/dashboard-scope";

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
      // ProjectTask é o motor real de tarefas — TaskExecution é uma tabela
      // legada praticamente vazia (ver lib/dashboard-widgets.ts).
      prisma.projectTask.count(),
      prisma.projectTask.count({
        where: {
          status: {
            in: [
              "PARA_LANCAMENTO",
              "EM_LANCAMENTO",
              "AGUARDANDO_INFORMACOES",
              "LIBERADA_PARA_EXECUCAO",
              "AGUARDANDO_NOMADE",
              "EM_EXECUCAO",
              "EM_REVISAO",
              "EM_APROVACAO",
            ],
          },
        },
      }),
      prisma.projectTask.count({ where: { status: "CONCLUIDA" } }),
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
// Returns real invoice-based revenue breakdown for the given date range —
// somado ao faturamento da plataforma antiga (legacy_records, tabela
// "project_invoice"), que nunca virou Invoice de propósito (ver
// docs/importacao-plataforma-antiga.md, arquivo isolado). Sem isso, a
// "Receita" some pra todo o histórico anterior à importação nova, mesmo tendo
// R$ 3,68 milhões faturados registrados no legado.
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

    const [totalRevenue, recurringRevenue, oneTimeRevenue, creditPlanRevenue, legacyInvoices] =
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
        prisma.legacyRecord.findMany({
          where: { tabela: "project_invoice", data: dateWhere, valor: { not: null } },
          select: { valor: true, projeto_legacy_id: true },
        }),
      ]);

    // Faturas do legado só têm o id do projeto antigo — busca o lifecycle
    // (mensal/avulso) dos projetos importados pra somar na mesma categoria
    // que a fatura nativa equivalente usaria.
    const legacyProjectIds = [
      ...new Set(legacyInvoices.map((r) => r.projeto_legacy_id).filter((v): v is number => v != null)),
    ];
    const legacyProjects = legacyProjectIds.length
      ? await prisma.project.findMany({
          where: { legacy_id: { in: legacyProjectIds } },
          select: { legacy_id: true, lifecycle: true },
        })
      : [];
    const lifecycleByLegacyId = new Map(legacyProjects.map((p) => [p.legacy_id, p.lifecycle]));

    let legacyRecurring = 0;
    let legacyOneTime = 0;
    for (const r of legacyInvoices) {
      const valor = r.valor ?? 0;
      const lifecycle = r.projeto_legacy_id != null ? lifecycleByLegacyId.get(r.projeto_legacy_id) : null;
      if (lifecycle === "mensal") legacyRecurring += valor;
      else legacyOneTime += valor;
    }

    const recurring = (recurringRevenue._sum.amount ?? 0) + legacyRecurring;
    const oneTime = (oneTimeRevenue._sum.amount ?? 0) + legacyOneTime;
    const creditPlan = creditPlanRevenue._sum.amount ?? 0;
    const total = (totalRevenue._sum.amount ?? 0) + legacyRecurring + legacyOneTime;

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
      // ProjectTask (motor real) — TaskExecution é legado/quase vazio.
      prisma.projectTask.findMany({
        take: limit,
        orderBy: { updated_at: "desc" },
        select: {
          id: true,
          title: true,
          status: true,
          updated_at: true,
          nomade_responsavel_id: true,
        },
      }),
      prisma.nomade.findMany({
        take: 5,
        orderBy: { registration_date: "desc" },
        select: { id: true, name: true, level: true, status: true, registration_date: true },
      }),
    ]);

    const taskNomadeIds = [
      ...new Set(recentTasks.map((t) => t.nomade_responsavel_id).filter((v): v is string => !!v)),
    ];
    const taskNomades = taskNomadeIds.length
      ? await prisma.nomade.findMany({ where: { id: { in: taskNomadeIds } }, select: { id: true, name: true } })
      : [];
    const nomadeNameById = new Map(taskNomades.map((n) => [n.id, n.name]));

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
        subtitle: t.nomade_responsavel_id ? nomadeNameById.get(t.nomade_responsavel_id) : undefined,
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

    // Escopo NUNCA vem do corpo da requisição — é sempre derivado de quem
    // está autenticado (mesma resolução usada na criação de um ShareLink,
    // ver lib/dashboard-scope.ts). Admin e Leader continuam sem filtro:
    // Admin por design (vê a plataforma inteira); Leader porque hoje não
    // existe uma forma segura de reduzir a um único id de escopo (LiderArea
    // é um conjunto de categorias/produtos, não um id) — limitação
    // documentada, não contornada liberando dados amplos por engano; é o
    // mesmo comportamento que o compartilhamento de Leader já tinha.
    const profile = resolveAuthenticatedProfile(req.user!);
    const scopeId =
      profile && profile !== "admin" && profile !== "leader"
        ? await resolveOwnScopeId(prisma, req.user!, profile)
        : null;
    const scopeExtras =
      profile && profile !== "admin"
        ? await resolveDashboardScopeExtras(prisma, profile, scopeId)
        : {};

    const {
      revenue,
      revenueRec,
      revenueOne,
      revenueCp,
      avgTicket,
      outstanding,
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
      completionRate,
      nomadsActive,
      nomadsInactive,
      nomadsTotal,
      nomadsNew,
      companiesActive,
      companiesTrial,
      companiesSuspended,
      companiesCancelled,
      companiesTotal,
      partnersActive,
    } = await computeDashboardWidgetsMetrics(prisma, from, to, scopeExtras);
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
      // Bug corrigido: "total" usava nomadsActive (era sempre igual a
      // "active"). Nomade.status hoje só distingue ativo/inativo — soma
      // exata do total real (ver lib/dashboard-widgets.ts).
      nomads: { total: nomadsTotal, active: nomadsActive, inactive: nomadsInactive, newInPeriod: nomadsNew, growth: 0 },
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

// GET /api/dashboard/admin-widgets?from=&to=
// Métricas adicionais do Admin Dashboard que POST /widgets não cobre (esse
// é reaproveitado pelo compartilhamento — ver lib/dashboard-widgets.ts — e
// fica deliberadamente enxuto). Tudo aqui é específico do Admin: rankings,
// perfis administrativos, breakdown financeiro mais fino. Sem escopo — o
// Admin vê a plataforma inteira, igual aos outros endpoints deste arquivo.
//
// Alguns campos vêm explicitamente `null` com um `reason` — não é erro, é a
// forma de dizer "não há dado real suficiente pra calcular isto hoje" (ver
// LTV e retenção de coorte) em vez de inventar um número.
router.get("/admin-widgets", verifyToken, async (req, res, next) => {
  try {
    const fromParam = req.query.from as string | undefined;
    const toParam = req.query.to as string | undefined;
    const now = new Date();
    const from = fromParam ? new Date(fromParam) : new Date(now.getTime() - 30 * 86_400_000);
    const to = toParam ? new Date(toParam) : now;
    const periodMs = to.getTime() - from.getTime();
    const prevFrom = new Date(from.getTime() - periodMs);
    const prevTo = new Date(from.getTime() - 1);

    const dateWhere = { gte: from, lte: to };
    const paidDateOr = (range: { gte: Date; lte: Date }) => [
      { paid_at: range },
      { paid_at: null as any, created_at: range },
    ];

    const [
      // MRR breakdown: receita recorrente (lifecycle=mensal) do período atual
      // agrupada por empresa, comparada com o período anterior de mesma
      // duração — "nova" (empresa não pagava antes, paga agora), "expansão"
      // (pagava menos, paga mais), "contração" (pagava mais, paga menos),
      // "churn" (pagava antes, não paga mais). Isto é o que dá pra calcular
      // com o que existe hoje (Invoice ligada a Project.lifecycle="mensal");
      // não é MRR "oficial" de um sistema de assinaturas com ciclo próprio.
      currentRecurringByCompany,
      previousRecurringByCompany,
      // Ticket médio por tipo real de projeto (Project.company_type) — não
      // existe "Lead Premium" no schema, então essa categoria não aparece.
      ticketByType,
      // Contas a receber: plano de crédito = fatura sem projeto vinculado;
      // pós-pago = fatura com projeto. "Outros" não tem base real — fica 0.
      receivableCreditPlan,
      receivablePostPaid,
      // Nômades: qualidade vem de campos já mantidos no cadastro do nômade
      // (performance_avg_rating/performance_on_time, recalculados alhures
      // no sistema) — não recalculamos aqui, só agregamos.
      nomadQuality,
      nomadsInactive,
      nomadsTotal,
      nomadsRankingRaw,
      agenciesRankingRaw,
      partnerInvited,
      partnerAccepted,
      partnerDeclined,
      partnerSuspended,
      partnerByLevel,
      partnerRevenueAgg,
      usersByType,
      projectsByStatus,
      tasksByStatus,
    ] = await Promise.all([
      prisma.invoice.groupBy({
        by: ["company_id"],
        _sum: { amount: true },
        where: {
          status: "paid",
          OR: paidDateOr(dateWhere),
          project: { lifecycle: "mensal" },
          company_id: { not: null },
        },
      }),
      prisma.invoice.groupBy({
        by: ["company_id"],
        _sum: { amount: true },
        where: {
          status: "paid",
          OR: paidDateOr({ gte: prevFrom, lte: prevTo }),
          project: { lifecycle: "mensal" },
          company_id: { not: null },
        },
      }),
      prisma.project.groupBy({
        by: ["company_type"],
        _count: { id: true },
        where: { created_at: dateWhere },
      }),
      prisma.invoice.aggregate({
        _sum: { amount: true },
        where: { status: "paid", OR: paidDateOr(dateWhere), project_id: null },
      }),
      prisma.invoice.aggregate({
        _sum: { amount: true },
        where: { status: "paid", OR: paidDateOr(dateWhere), project_id: { not: null } },
      }),
      prisma.nomade.aggregate({
        // ProjectTask não tem campo de avaliação por tarefa — a nota fica
        // só no cadastro do nômade (performance_avg_rating, mantida pelo
        // sistema em outro fluxo). Não há segunda fonte pra cruzar aqui.
        _avg: { performance_avg_rating: true, performance_on_time: true },
        where: { status: "ativo" },
      }),
      prisma.nomade.count({ where: { status: { not: "ativo" } } }),
      prisma.nomade.count(),
      // Ranking real: nômades com mais tarefas concluídas no período (motor
      // real ProjectTask — TaskExecution é a tabela legada/quase vazia).
      prisma.projectTask.groupBy({
        by: ["nomade_responsavel_id"],
        _count: { id: true },
        where: {
          status: "CONCLUIDA",
          created_at: dateWhere,
          nomade_responsavel_id: { not: null },
        },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }),
      // Ranking real: agências com mais receita paga no período.
      prisma.invoice.groupBy({
        by: ["project_id"],
        _sum: { amount: true },
        where: { status: "paid", OR: paidDateOr(dateWhere), project_id: { not: null } },
      }),
      prisma.partnerProfile.count({ where: { status: "invited" } }),
      prisma.partnerProfile.count({ where: { status: "active" } }),
      prisma.partnerProfile.count({ where: { status: "declined" } }),
      prisma.partnerProfile.count({ where: { status: "suspended" } }),
      prisma.agency.groupBy({
        by: ["partner_level"],
        _count: { id: true },
        where: { status: "ativo" },
      }),
      // Receita gerada por projetos com partner_id atribuído (comissão de
      // indicação) — proxy real disponível para "mrrGenerated".
      prisma.invoice.aggregate({
        _sum: { amount: true },
        where: {
          status: "paid",
          OR: paidDateOr(dateWhere),
          project: { partner_id: { not: null } },
        },
      }),
      prisma.user.groupBy({ by: ["account_type"], _count: { id: true } }),
      prisma.project.groupBy({ by: ["status"], _count: { id: true }, where: { created_at: dateWhere } }),
      prisma.projectTask.groupBy({ by: ["status"], _count: { id: true }, where: { created_at: dateWhere } }),
    ]);

    // ── MRR breakdown por comparação de coorte simples (empresa a empresa) ──
    const prevMap = new Map(previousRecurringByCompany.map((r) => [r.company_id, r._sum.amount ?? 0]));
    const curMap = new Map(currentRecurringByCompany.map((r) => [r.company_id, r._sum.amount ?? 0]));
    let newMrr = 0, expansion = 0, contraction = 0, churnMrr = 0;
    for (const [companyId, curAmount] of curMap) {
      const prevAmount = prevMap.get(companyId) ?? 0;
      if (prevAmount === 0) newMrr += curAmount;
      else if (curAmount > prevAmount) expansion += curAmount - prevAmount;
      else if (curAmount < prevAmount) contraction += prevAmount - curAmount;
    }
    for (const [companyId, prevAmount] of prevMap) {
      if (!curMap.has(companyId)) churnMrr += prevAmount;
    }
    const baseMrr = [...prevMap.values()].reduce((a, b) => a + b, 0);
    const currentMrrTotal = [...curMap.values()].reduce((a, b) => a + b, 0);

    // ── Ticket por tipo ──
    const ticketByTypeOut: Record<string, number> = {};
    for (const row of ticketByType) {
      ticketByTypeOut[row.company_type ?? "não_classificado"] = row._count.id;
    }

    // ── Ranking de nômades: junta contagem com nome/nível real ──
    const nomadIds = nomadsRankingRaw
      .map((r) => r.nomade_responsavel_id)
      .filter((v): v is string => !!v);
    const nomadRows = nomadIds.length
      ? await prisma.nomade.findMany({
          where: { id: { in: nomadIds } },
          select: { id: true, name: true, level: true, avatar: true, performance_avg_rating: true },
        })
      : [];
    const nomadById = new Map(nomadRows.map((n) => [n.id, n]));
    const nomadsRanking = nomadsRankingRaw
      .map((r) => {
        const n = nomadById.get(r.nomade_responsavel_id!);
        return n
          ? {
              id: n.id,
              name: n.name,
              level: n.level,
              avatar: n.avatar,
              rating: n.performance_avg_rating,
              tasksApproved: r._count.id,
            }
          : null;
      })
      .filter((v): v is NonNullable<typeof v> => !!v);

    // ── Ranking de agências: soma receita por agência via project_id ──
    const projIds = agenciesRankingRaw.map((r) => r.project_id).filter((v): v is string => !!v);
    const projRows = projIds.length
      ? await prisma.project.findMany({
          where: { id: { in: projIds } },
          select: { id: true, agency_id: true },
        })
      : [];
    const agencyRevenue = new Map<string, number>();
    const projToAgency = new Map(projRows.map((p) => [p.id, p.agency_id]));
    for (const row of agenciesRankingRaw) {
      const agencyId = projToAgency.get(row.project_id!);
      if (!agencyId) continue;
      agencyRevenue.set(agencyId, (agencyRevenue.get(agencyId) ?? 0) + (row._sum.amount ?? 0));
    }
    const topAgencyIds = [...agencyRevenue.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id]) => id);
    const agencyRows = topAgencyIds.length
      ? await prisma.agency.findMany({
          where: { id: { in: topAgencyIds } },
          select: { id: true, name: true, partner_level: true },
        })
      : [];
    const agencyById = new Map(agencyRows.map((a) => [a.id, a]));
    // Projetos faturados no período, por agência (a partir dos mesmos
    // projRows já buscados acima) — não é "total de projetos da agência",
    // é "quantos projetos geraram fatura paga neste período".
    const billedProjectsByAgency = new Map<string, number>();
    for (const p of projRows) {
      if (!p.agency_id) continue;
      billedProjectsByAgency.set(p.agency_id, (billedProjectsByAgency.get(p.agency_id) ?? 0) + 1);
    }
    const agenciesRanking = topAgencyIds
      .map((id) => {
        const a = agencyById.get(id);
        return a
          ? {
              id: a.id,
              name: a.name,
              level: a.partner_level,
              revenue: agencyRevenue.get(id) ?? 0,
              billedProjects: billedProjectsByAgency.get(id) ?? 0,
            }
          : null;
      })
      .filter((v): v is NonNullable<typeof v> => !!v);

    res.json({
      mrrBreakdown: {
        total: currentMrrTotal,
        baseMrr,
        newMrr,
        expansion,
        contraction,
        churn: churnMrr,
        netChange: currentMrrTotal - baseMrr,
      },
      ticketByType: ticketByTypeOut,
      accountsReceivableBreakdown: {
        creditPlans: receivableCreditPlan._sum.amount ?? 0,
        postPaid: receivablePostPaid._sum.amount ?? 0,
        // Não existe hoje uma terceira categoria financeira real distinta
        // destas duas — mantido em 0 de propósito, não é um dado omitido.
        others: 0,
      },
      ltv: null,
      ltvReason:
        "Não há dados de coorte/retenção de clientes registrados (data de churn, tempo de vida da conta) suficientes para calcular LTV real. O que existe hoje (ticket médio × 12) é uma aproximação, não um LTV calculado.",
      nomads: {
        inactive: nomadsInactive,
        total: nomadsTotal,
        avgRating: nomadQuality._avg.performance_avg_rating ?? null,
        avgOnTimeRate: nomadQuality._avg.performance_on_time ?? null,
        retention30d: null,
        retention30dReason:
          "Retenção de coorte precisa de uma definição de janela de atividade por nômade que ainda não está registrada — não calculada.",
      },
      nomadsRanking,
      agenciesRanking,
      partnerProgram: {
        invited: partnerInvited,
        active: partnerAccepted,
        declined: partnerDeclined,
        suspended: partnerSuspended,
        byLevel: Object.fromEntries(partnerByLevel.map((r) => [r.partner_level, r._count.id])),
        revenueGenerated: partnerRevenueAgg._sum.amount ?? 0,
      },
      userDistribution: usersByType.map((r) => ({ type: r.account_type, count: r._count.id })),
      statusOverview: {
        projects: Object.fromEntries(projectsByStatus.map((r) => [r.status, r._count.id])),
        tasks: Object.fromEntries(tasksByStatus.map((r) => [r.status, r._count.id])),
        // Não existe model de "Lead" no schema hoje — não incluído.
      },
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
