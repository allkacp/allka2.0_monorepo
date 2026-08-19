import type { PrismaClient } from "@prisma/client";

/**
 * Consulta única reaproveitada por dois lugares que precisam dos MESMOS
 * números — POST /api/dashboard/widgets (autenticado, hoje só usado pelo
 * Admin Dashboard) e POST /api/share/data (público, escopo vem do
 * ShareLink). Antes eram duas implementações de query independentes
 * (escritas em momentos diferentes) que foram divergindo silenciosamente —
 * ver diagnóstico da correção "dados do dashboard compartilhado zerados".
 *
 * Cada chamador decide o formato de resposta (os dois routers hoje têm
 * contratos de campo ligeiramente diferentes com seus respectivos
 * frontends); esta função só garante que os NÚMEROS venham da mesma fonte,
 * com o mesmo escopo aplicado.
 */
export type WidgetsScope = {
  /** Merge no where de nível superior de Project.count() (ex.: agency_id, OR client_id/company_id). */
  projectExtra?: Record<string, unknown>;
  /** Merge no where aninhado `project: {...}` usado por Invoice/ProjectTask. */
  projectNestedExtra?: Record<string, unknown>;
  /** Merge no where de nível superior de Invoice (ex.: company_id). */
  invoiceExtra?: Record<string, unknown>;
  /** Merge no where de nível superior de ProjectTask (ex.: nomade_responsavel_id). */
  taskExtra?: Record<string, unknown>;
  /** Merge no where de Nomade.count() (ex.: id do nômade do compartilhamento). */
  nomadeExtra?: Record<string, unknown>;
  /** Merge no where de Company.count() (ex.: id da empresa do compartilhamento). */
  companyExtra?: Record<string, unknown>;
  /** Merge no where de PartnerProfile.count() (ex.: agency_id). */
  partnerExtra?: Record<string, unknown>;
  /**
   * Faturas sem projeto (plano de crédito) não têm como ser atribuídas a
   * uma agência (Invoice não tem agency_id direto) — quando false, essas
   * faturas somam 0 em vez de vazar receita de outra organização.
   */
  creditPlanAttributable?: boolean;
};

export type DashboardWidgetsMetrics = Awaited<
  ReturnType<typeof computeDashboardWidgetsMetrics>
>;

export async function computeDashboardWidgetsMetrics(
  prisma: PrismaClient,
  from: Date,
  to: Date,
  scope: WidgetsScope = {},
) {
  const {
    projectExtra = {},
    projectNestedExtra = {},
    invoiceExtra = {},
    taskExtra = {},
    nomadeExtra = {},
    companyExtra = {},
    partnerExtra = {},
    creditPlanAttributable = true,
  } = scope;

  const hasProjectNestedScope = Object.keys(projectNestedExtra).length > 0;

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
    nomadsInactive,
    nomadsTotal,
    nomadsNew,
    companiesActive,
    companiesTrial,
    companiesSuspended,
    companiesCancelled,
    companiesTotal,
    partnersActive,
  ] = await Promise.all([
    prisma.invoice.aggregate({
      _sum: { amount: true },
      _count: true,
      where: {
        status: "paid",
        OR: paidDateOr,
        ...invoiceExtra,
        ...(hasProjectNestedScope ? { project: projectNestedExtra } : {}),
      },
    }),
    prisma.invoice.aggregate({
      _sum: { amount: true },
      where: {
        status: "paid",
        OR: paidDateOr,
        ...invoiceExtra,
        project: { lifecycle: "mensal", ...projectNestedExtra },
      },
    }),
    prisma.invoice.aggregate({
      _sum: { amount: true },
      where: {
        status: "paid",
        OR: paidDateOr,
        ...invoiceExtra,
        project: { lifecycle: "avulso", ...projectNestedExtra },
      },
    }),
    creditPlanAttributable
      ? prisma.invoice.aggregate({
          _sum: { amount: true },
          where: { status: "paid", OR: paidDateOr, project_id: null, ...invoiceExtra },
        })
      : Promise.resolve({ _sum: { amount: 0 } }),
    prisma.invoice.aggregate({
      _sum: { amount: true },
      where: {
        status: { in: ["pending", "overdue"] },
        created_at: dateWhere,
        ...invoiceExtra,
        ...(hasProjectNestedScope ? { project: projectNestedExtra } : {}),
      },
    }),
    prisma.project.count({ where: { created_at: dateWhere, ...projectExtra } }),
    prisma.project.count({
      where: { status: "in-progress", created_at: dateWhere, ...projectExtra },
    }),
    prisma.project.count({
      where: {
        status: { in: ["completed", "paid"] },
        created_at: dateWhere,
        ...projectExtra,
      },
    }),
    prisma.project.count({
      where: { status: "cancelled", created_at: dateWhere, ...projectExtra },
    }),
    // ── Tarefas: ProjectTask é o motor real de etapas (15.650 registros na
    // base de referência); TaskExecution é uma tabela LEGADA (22 registros)
    // que ficou órfã depois da migração pro motor de etapas — usá-la fazia
    // os cards de tarefas mostrarem quase nada. Status reais de ProjectTask:
    // PARA_LANCAMENTO | EM_LANCAMENTO | AGUARDANDO_INFORMACOES |
    // LIBERADA_PARA_EXECUCAO | AGUARDANDO_NOMADE | EM_EXECUCAO | EM_REVISAO |
    // EM_APROVACAO | CONCLUIDA | CANCELADA (ver schema.prisma).
    prisma.projectTask.count({
      where: {
        created_at: dateWhere,
        ...taskExtra,
        ...(hasProjectNestedScope ? { project: projectNestedExtra } : {}),
      },
    }),
    prisma.projectTask.count({
      where: {
        status: "CONCLUIDA",
        created_at: dateWhere,
        ...taskExtra,
        ...(hasProjectNestedScope ? { project: projectNestedExtra } : {}),
      },
    }),
    prisma.projectTask.count({
      where: {
        status: { in: ["EM_EXECUCAO", "EM_REVISAO"] },
        created_at: dateWhere,
        ...taskExtra,
        ...(hasProjectNestedScope ? { project: projectNestedExtra } : {}),
      },
    }),
    prisma.projectTask.count({
      where: {
        status: {
          in: [
            "PARA_LANCAMENTO",
            "EM_LANCAMENTO",
            "AGUARDANDO_INFORMACOES",
            "LIBERADA_PARA_EXECUCAO",
            "AGUARDANDO_NOMADE",
          ],
        },
        created_at: dateWhere,
        ...taskExtra,
        ...(hasProjectNestedScope ? { project: projectNestedExtra } : {}),
      },
    }),
    // Aprovação em dois níveis (agência depois cliente) é UM status só
    // (EM_APROVACAO) no motor novo — distinguimos pelo timestamp real de
    // aprovação da agência já registrado na própria tarefa.
    prisma.projectTask.count({
      where: {
        status: "EM_APROVACAO",
        aprovado_agencia_em: null,
        created_at: dateWhere,
        ...taskExtra,
        ...(hasProjectNestedScope ? { project: projectNestedExtra } : {}),
      },
    }),
    prisma.projectTask.count({
      where: {
        status: "EM_APROVACAO",
        aprovado_agencia_em: { not: null },
        created_at: dateWhere,
        ...taskExtra,
        ...(hasProjectNestedScope ? { project: projectNestedExtra } : {}),
      },
    }),
    // Não existe um status "expirado" distinto no motor novo (só
    // `lancamento_expires_at`, um prazo, não um estado) — 0 é honesto, não
    // fallback silencioso.
    Promise.resolve(0),
    prisma.projectTask.count({
      where: {
        status: "CANCELADA",
        created_at: dateWhere,
        ...taskExtra,
        ...(hasProjectNestedScope ? { project: projectNestedExtra } : {}),
      },
    }),
    prisma.nomade.count({ where: { status: "ativo", ...nomadeExtra } }),
    // Bug real anterior: o JSON de saída usava nomadsActive como "total"
    // (dashboard.ts). Nomade.status hoje só tem "ativo"/"inativo" — soma
    // exata do total (confirmado: 350+47=397 na base de referência).
    prisma.nomade.count({ where: { status: { not: "ativo" }, ...nomadeExtra } }),
    prisma.nomade.count({ where: nomadeExtra }),
    prisma.nomade.count({ where: { created_at: dateWhere, ...nomadeExtra } }),
    prisma.company.count({ where: { status: "ativo", ...companyExtra } }),
    prisma.company.count({ where: { status: "prospecto", ...companyExtra } }),
    prisma.company.count({ where: { status: "inadimplente", ...companyExtra } }),
    prisma.company.count({ where: { status: "inativo", ...companyExtra } }),
    prisma.company.count({ where: companyExtra }),
    prisma.partnerProfile.count({ where: { status: "active", ...partnerExtra } }),
  ]);

  const revenue = paidRevenue._sum.amount ?? 0;
  const revenueRec = revenueRecurring._sum.amount ?? 0;
  const revenueOne = revenueOneTime._sum.amount ?? 0;
  const revenueCp = revenueCreditPlan._sum.amount ?? 0;
  const invoiceCount = (paidRevenue as any)._count ?? 0;
  const avgTicket = invoiceCount > 0 ? Math.round(revenue / invoiceCount) : 0;
  const outstanding = pendingRevenue._sum.amount ?? 0;
  const completionRate =
    tasksTotal > 0 ? Math.round((tasksApproved / tasksTotal) * 100) : 0;
  const pendingProjects = Math.max(
    projectsTotal - projectsInProgress - projectsDelivered - projectsCancelled,
    0,
  );

  return {
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
    pendingProjects,
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
  };
}
