/**
 * Role-scoped dashboard presets for the Allka platform.
 *
 * Each role has its own set of built-in preset dashboards.
 * Widgets used in each preset MUST be within the allowed set defined in
 * `dashboard-widget-roles.ts` for that role.
 *
 * Each non-admin portal uses its own localStorage namespace
 * (e.g. "saved-dashboards-agency") so that presets and user-saved dashboards
 * never leak between roles.
 *
 * ADMIN presets live in the admin dashboard page itself (unchanged).
 */

import type { DashboardRole } from "./dashboard-widget-roles";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DashboardPreset {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  /** Role that owns this preset — used for filtering */
  role: DashboardRole;
  /** Visibility scope */
  visibility: "ROLE_DEFAULT" | "PERSONAL" | "GLOBAL_ADMIN";
  /** Ordered widget type IDs */
  widgetTypes: string[];
}

// ─── Helper ──────────────────────────────────────────────────────────────────

const mk = (type: string, order: number) => ({
  id: `preset-${type}-${order}`,
  type,
  visible: true,
  order,
});

/** Build the WidgetState[] format used by SavedDashboard["widgets"] */
export function buildWidgets(types: string[]) {
  return types.map((t, i) => mk(t, i));
}

// ─── localStorage namespace per role ─────────────────────────────────────────

export const DASHBOARD_STORAGE_KEY: Record<
  Exclude<DashboardRole, "ADMIN">,
  string
> = {
  AGENCY: "saved-dashboards-agency",
  NOMAD: "saved-dashboards-nomad",
  COMPANY: "saved-dashboards-company",
  PARTNER: "saved-dashboards-partner",
  LEADER: "saved-dashboards-leader",
};

export const CURRENT_DASHBOARD_KEY: Record<
  Exclude<DashboardRole, "ADMIN">,
  string
> = {
  AGENCY: "current-dashboard-id-agency",
  NOMAD: "current-dashboard-id-nomad",
  COMPANY: "current-dashboard-id-company",
  PARTNER: "current-dashboard-id-partner",
  LEADER: "current-dashboard-id-leader",
};

// ─── Presets by role ─────────────────────────────────────────────────────────

/**
 * AGENCY — owns projects, delivers tasks, manages nomads.
 * Widgets pool: metrics · activeProjectsWidget · tasks · statusOverview ·
 *               averageTicket · accountsReceivable · activity · alerts · quickActions
 */
export const AGENCY_PRESETS: DashboardPreset[] = [
  {
    id: "agency-preset-overview",
    name: "Visão Geral da Agency",
    description: "Projetos, tarefas, aprovações e financeiro da agency",
    isDefault: true,
    role: "AGENCY",
    visibility: "ROLE_DEFAULT",
    widgetTypes: [
      "metrics",
      "activeProjectsWidget",
      "tasks",
      "statusOverview",
      "activity",
      "alerts",
    ],
  },
  {
    id: "agency-preset-projects",
    name: "Projetos e Tarefas",
    description: "Projetos ativos, tarefas em execução e lançamentos",
    isDefault: false,
    role: "AGENCY",
    visibility: "ROLE_DEFAULT",
    widgetTypes: [
      "activeProjectsWidget",
      "tasks",
      "statusOverview",
      "activity",
    ],
  },
  {
    id: "agency-preset-approvals",
    name: "Aprovações Pendentes",
    description: "Aprovações, propostas e entregas aguardando cliente",
    isDefault: false,
    role: "AGENCY",
    visibility: "ROLE_DEFAULT",
    widgetTypes: ["tasks", "statusOverview", "alerts", "activity"],
  },
  {
    id: "agency-preset-financial",
    name: "Financeiro da Agency",
    description: "Valor contratado, margem, pagamentos e recebíveis",
    isDefault: false,
    role: "AGENCY",
    visibility: "ROLE_DEFAULT",
    widgetTypes: [
      "averageTicket",
      "accountsReceivable",
      "alerts",
      "quickActions",
    ],
  },
  {
    id: "agency-preset-catalog",
    name: "Contratações e Catálogo",
    description: "Produtos contratados, projetos e ações rápidas",
    isDefault: false,
    role: "AGENCY",
    visibility: "ROLE_DEFAULT",
    widgetTypes: [
      "creditPlans",
      "activeProjectsWidget",
      "quickActions",
      "activity",
    ],
  },
];

/**
 * NOMAD — executes tasks, delivers work, receives payments.
 * Widgets pool: metrics · tasks · statusOverview · nomadsIndicators ·
 *               nomadsRanking · accountsReceivable · activity · alerts · quickActions
 */
export const NOMAD_PRESETS: DashboardPreset[] = [
  {
    id: "nomad-preset-overview",
    name: "Minha Operação",
    description: "Tarefas, entregas e alertas da sua operação",
    isDefault: true,
    role: "NOMAD",
    visibility: "ROLE_DEFAULT",
    widgetTypes: ["metrics", "tasks", "statusOverview", "alerts", "activity"],
  },
  {
    id: "nomad-preset-tasks",
    name: "Minhas Tarefas",
    description: "Tarefas atribuídas e status por categoria",
    isDefault: false,
    role: "NOMAD",
    visibility: "ROLE_DEFAULT",
    widgetTypes: ["tasks", "statusOverview", "alerts"],
  },
  {
    id: "nomad-preset-deliveries",
    name: "Entregas",
    description: "Entregas pendentes, aprovadas e reprovadas",
    isDefault: false,
    role: "NOMAD",
    visibility: "ROLE_DEFAULT",
    widgetTypes: ["activity", "tasks", "alerts"],
  },
  {
    id: "nomad-preset-performance",
    name: "Desempenho",
    description: "Indicadores pessoais de qualidade, prazo e avaliação",
    isDefault: false,
    role: "NOMAD",
    visibility: "ROLE_DEFAULT",
    widgetTypes: ["nomadsIndicators", "activity", "alerts"],
  },
  {
    id: "nomad-preset-payments",
    name: "Pagamentos",
    description: "Valores a receber, histórico de pagamentos e alertas",
    isDefault: false,
    role: "NOMAD",
    visibility: "ROLE_DEFAULT",
    widgetTypes: ["accountsReceivable", "alerts", "quickActions"],
  },
];

/**
 * COMPANY — contracts projects, approves deliveries, pays invoices.
 * Widgets pool: metrics · activeProjectsWidget · tasks · statusOverview ·
 *               activity · alerts · quickActions
 */
export const COMPANY_PRESETS: DashboardPreset[] = [
  {
    id: "company-preset-overview",
    name: "Visão Geral da Company",
    description: "Projetos, tarefas, atividades e alertas da empresa",
    isDefault: true,
    role: "COMPANY",
    visibility: "ROLE_DEFAULT",
    widgetTypes: [
      "metrics",
      "activeProjectsWidget",
      "tasks",
      "statusOverview",
      "activity",
      "alerts",
    ],
  },
  {
    id: "company-preset-projects",
    name: "Projetos Contratados",
    description: "Todos os projetos ativos e visão de status",
    isDefault: false,
    role: "COMPANY",
    visibility: "ROLE_DEFAULT",
    widgetTypes: ["activeProjectsWidget", "tasks", "statusOverview"],
  },
  {
    id: "company-preset-approvals",
    name: "Aprovações",
    description: "Propostas, entregas e tarefas aguardando aprovação",
    isDefault: false,
    role: "COMPANY",
    visibility: "ROLE_DEFAULT",
    widgetTypes: ["tasks", "alerts", "activity"],
  },
  {
    id: "company-preset-financial",
    name: "Financeiro e Pagamentos",
    description: "Faturas, pagamentos pendentes e histórico financeiro",
    isDefault: false,
    role: "COMPANY",
    visibility: "ROLE_DEFAULT",
    widgetTypes: ["metrics", "alerts", "quickActions", "activity"],
  },
  {
    id: "company-preset-deliveries",
    name: "Entregas e Histórico",
    description: "Entregas disponíveis para revisão e histórico de aprovações",
    isDefault: false,
    role: "COMPANY",
    visibility: "ROLE_DEFAULT",
    widgetTypes: ["tasks", "activity", "alerts"],
  },
];

/**
 * PARTNER — refers clients, earns commissions, tracks conversions.
 * Widgets pool: metrics · partnerProgram · accountsReceivable ·
 *               activity · alerts · quickActions
 */
export const PARTNER_PRESETS: DashboardPreset[] = [
  {
    id: "partner-preset-overview",
    name: "Visão Geral Partner",
    description: "Programa, comissões e atividades do partner",
    isDefault: true,
    role: "PARTNER",
    visibility: "ROLE_DEFAULT",
    widgetTypes: [
      "metrics",
      "partnerProgram",
      "accountsReceivable",
      "activity",
    ],
  },
  {
    id: "partner-preset-referrals",
    name: "Indicações",
    description: "Convites enviados, indicações ativas e status de conversão",
    isDefault: false,
    role: "PARTNER",
    visibility: "ROLE_DEFAULT",
    widgetTypes: ["partnerProgram", "activity", "alerts"],
  },
  {
    id: "partner-preset-clients",
    name: "Clientes Indicados",
    description: "Clientes convertidos e ativos via sua indicação",
    isDefault: false,
    role: "PARTNER",
    visibility: "ROLE_DEFAULT",
    widgetTypes: ["partnerProgram", "metrics", "activity"],
  },
  {
    id: "partner-preset-commissions",
    name: "Comissões",
    description: "Comissões geradas, a receber e histórico de pagamentos",
    isDefault: false,
    role: "PARTNER",
    visibility: "ROLE_DEFAULT",
    widgetTypes: ["accountsReceivable", "metrics", "alerts"],
  },
  {
    id: "partner-preset-reports",
    name: "Relatórios Partner",
    description: "Receita própria, programa partner e atividades recentes",
    isDefault: false,
    role: "PARTNER",
    visibility: "ROLE_DEFAULT",
    widgetTypes: ["accountsReceivable", "partnerProgram", "activity"],
  },
];

/**
 * LEADER — qualifies tasks, oversees their area's nomads.
 * Widgets pool: metrics · tasks · statusOverview · nomadsIndicators ·
 *               nomadsRanking · activity · alerts · quickActions
 */
export const LEADER_PRESETS: DashboardPreset[] = [
  {
    id: "leader-preset-overview",
    name: "Visão Geral da Área",
    description: "Tarefas, qualificações, nômades e alertas da área",
    isDefault: true,
    role: "LEADER",
    visibility: "ROLE_DEFAULT",
    widgetTypes: [
      "metrics",
      "tasks",
      "statusOverview",
      "nomadsIndicators",
      "nomadsRanking",
      "activity",
      "alerts",
      "quickActions",
    ],
  },
  {
    id: "leader-preset-qualification",
    name: "Tarefas para Qualificação",
    description: "Briefings aguardando revisão e tarefas para qualificação",
    isDefault: false,
    role: "LEADER",
    visibility: "ROLE_DEFAULT",
    widgetTypes: ["tasks", "alerts", "activity", "quickActions"],
  },
  {
    id: "leader-preset-in-progress",
    name: "Tarefas em Execução",
    description: "Tarefas em andamento na área e visão de status",
    isDefault: false,
    role: "LEADER",
    visibility: "ROLE_DEFAULT",
    widgetTypes: ["tasks", "statusOverview", "activity", "alerts"],
  },
  {
    id: "leader-preset-nomads",
    name: "Nômades da Área",
    description: "Indicadores de desempenho e ranking dos nômades da área",
    isDefault: false,
    role: "LEADER",
    visibility: "ROLE_DEFAULT",
    widgetTypes: ["nomadsIndicators", "nomadsRanking", "activity", "alerts"],
  },
  {
    id: "leader-preset-history",
    name: "Histórico de Qualificações",
    description: "Aprovações, devoluções e atividade histórica da área",
    isDefault: false,
    role: "LEADER",
    visibility: "ROLE_DEFAULT",
    widgetTypes: ["tasks", "activity", "statusOverview", "nomadsIndicators"],
  },
];

/**
 * Central registry indexed by role.
 * ADMIN is excluded here — admin presets live in the admin dashboard page.
 */
export const DASHBOARD_PRESETS_BY_ROLE: Record<
  Exclude<DashboardRole, "ADMIN">,
  DashboardPreset[]
> = {
  AGENCY: AGENCY_PRESETS,
  NOMAD: NOMAD_PRESETS,
  COMPANY: COMPANY_PRESETS,
  PARTNER: PARTNER_PRESETS,
  LEADER: LEADER_PRESETS,
};
