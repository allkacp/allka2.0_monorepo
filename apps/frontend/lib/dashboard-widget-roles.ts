/**
 * Centralized widget visibility config per user role.
 * Used by non-admin portal dashboards to filter the widget library
 * and the initial widget state.
 *
 * ADMIN role is not filtered — admins always see all widgets.
 */

export type DashboardRole =
  | "ADMIN"
  | "AGENCY"
  | "NOMAD"
  | "COMPANY"
  | "PARTNER"
  | "LEADER";

/**
 * Map of role → allowed widget IDs.
 *
 * Widget IDs must match the `WidgetType` values defined in the dashboard page.
 *
 * Rules:
 * - ADMIN sees everything.
 * - Non-admin roles see only widgets relevant to their function.
 * - Widgets marked as "administrative global" (financials, platform metrics,
 *   system tools) are restricted to ADMIN only.
 * - Shared operational widgets (tasks, activity, alerts, quickActions) are
 *   available to all roles.
 */
export const WIDGETS_BY_ROLE: Record<DashboardRole, string[]> = {
  /** Admin sees every widget without restriction. */
  ADMIN: [
    "metrics",
    "accountsReceivable",
    "platformActivities",
    "tasks",
    "nomads",
    "nomadsIndicators",
    "nomadsRanking",
    "agenciesRanking",
    "statusOverview",
    "cmv",
    "ltv",
    "mrr",
    "churn",
    "revenue",
    "averageTicket",
    "activeProjectsWidget",
    "creditPlans",
    "activity",
    "alerts",
    "performers",
    "quickActions",
    "userDistribution",
    "activeUsers",
    "systemAlerts",
    "adminProfiles",
    "permissionMatrix",
    "managementTools",
    "partnerProgram",
  ],

  /**
   * Agency — manages nomads and delivers projects for companies.
   * Sees: own projects, own tasks, approvals, invoicing, activity.
   * Does NOT see: platform-wide financials (MRR/LTV/CMV/CHURN/revenue),
   *   admin tools, system alerts, global user/nomad rankings.
   */
  AGENCY: [
    "metrics", // Cards de Métricas (agency-scoped)
    "activeProjectsWidget", // Projetos Ativos da agency
    "tasks", // Tarefas dos projetos da agency
    "statusOverview", // Visão Geral por Status (agency-scoped)
    "averageTicket", // Ticket Médio da agency
    "accountsReceivable", // À Receber da agency
    "creditPlans", // Catálogo / Produtos Contratados
    "activity", // Atividade Recente (agency-scoped)
    "alerts", // Alertas Rápidos (agency-scoped)
    "quickActions", // Ações Rápidas (agency-scoped)
  ],

  /**
   * Nomad — individual freelancer executing tasks.
   * Sees: own tasks, delivery indicators, ranking position, payment pending.
   * Does NOT see: global financials, other nomads' private data, admin tools,
   *   agency internals, company data, MRR/LTV/CMV/CHURN.
   */
  NOMAD: [
    "metrics", // Cards de Métricas (nomad-scoped)
    "tasks", // Tarefas atribuídas ao Nomad
    "statusOverview", // Visão Geral por Status (nomad-scoped)
    "nomadsIndicators", // Indicadores do próprio Nomad
    "accountsReceivable", // À Receber (nomad-scoped)
    "activity", // Atividade Recente (nomad-scoped)
    "alerts", // Alertas Rápidos (nomad-scoped)
    "quickActions", // Ações Rápidas (nomad-scoped)
  ],

  /**
   * Company — client that contracts projects through the platform.
   * Sees: own projects, tasks (simplified), proposals, approvals, payments.
   * Does NOT see: agency internals (margin/commission/cost), nomad data,
   *   leader data, global financials, MRR/LTV/CMV/CHURN, global users,
   *   permission matrix, admin tools.
   */
  COMPANY: [
    "metrics", // Cards de Métricas (company-scoped)
    "activeProjectsWidget", // Projetos Ativos da company
    "tasks", // Tarefas dos projetos (status simplificado)
    "statusOverview", // Visão Geral por Status (company-scoped)
    "activity", // Atividade Recente (company-scoped)
    "alerts", // Alertas Rápidos (company-scoped)
    "quickActions", // Ações Rápidas (company-scoped)
  ],

  /**
   * Partner — affiliate/referral partner.
   * Sees: own referrals, own commissions, partner program, own revenue.
   * Does NOT see: global MRR/LTV/CMV/CHURN, all projects, all users,
   *   nomad data, leader data, permission matrix, admin tools.
   */
  PARTNER: [
    "metrics", // Cards de Métricas (partner-scoped)
    "partnerProgram", // Programa Partner (nível, convites, distribuição própria)
    "accountsReceivable", // Comissões pendentes do Partner
    "activity", // Atividade Recente (partner-scoped)
    "alerts", // Alertas Rápidos (partner-scoped)
    "quickActions", // Ações Rápidas (partner-scoped)
  ],

  /**
   * Leader — area lead overseeing a specific group of nomads.
   * Sees: own area tasks, nomad KPIs (area-scoped), ranking (area-scoped).
   * Does NOT see: global financials, MRR/LTV/CMV/CHURN, all companies,
   *   all users, projects outside their area, permission matrix, admin tools.
   */
  LEADER: [
    "metrics", // Cards de Métricas (area-scoped)
    "tasks", // Tarefas da área do Leader
    "statusOverview", // Visão Geral por Status (área-scoped)
    "nomadsIndicators", // Indicadores dos Nômades da área
    "nomadsRanking", // Ranking dos Nômades da área
    "activity", // Atividade Recente (área-scoped)
    "alerts", // Alertas Rápidos (área-scoped)
    "quickActions", // Ações Rápidas (área-scoped)
  ],
};

/**
 * Returns the array of allowed widget IDs for a given role.
 * Falls back to ADMIN (all widgets) if the role is not found.
 */
export function getWidgetsByRole(role: DashboardRole): string[] {
  return WIDGETS_BY_ROLE[role] ?? WIDGETS_BY_ROLE.ADMIN;
}
