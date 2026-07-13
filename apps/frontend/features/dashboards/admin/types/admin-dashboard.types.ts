// @ts-nocheck
import type React from "react";
import type { AlertTriangle } from "lucide-react";

// ─── Widget & Metric types ────────────────────────────────────────────────────

export type WidgetType =
  | "metrics"
  | "activity"
  | "alerts"
  | "performers"
  | "quickActions"
  | "userDistribution"
  | "activeUsers"
  | "systemAlerts"
  | "adminProfiles"
  | "revenue"
  | "activeProjectsWidget"
  | "creditPlans"
  | "mrr"
  | "permissionMatrix"
  | "managementTools"
  | "churn"
  | "averageTicket"
  | "ltv"
  | "cmv"
  | "nomads"
  | "nomadsIndicators"
  | "tasks"
  | "platformActivities"
  | "nomadsRanking"
  | "agenciesRanking"
  | "statusOverview"
  | "accountsReceivable"
  | "partnerProgram";

export type MetricType =
  | "totalUsers"
  | "activeUsers"
  | "companies"
  | "activeProjects"
  | "revenue"
  | "avgRating"
  | "totalProjects"
  | "pendingPayments"
  | "linkedProducts"
  | "catalogProducts"
  | "orgPartners";

export type WidgetSize = "standard" | "compact";

export interface Widget {
  id: WidgetType;
  order: number;
  visible: boolean;
  customTitle?: string;
  size?: string;
}

// Define the structure for revenue metric with breakdown
export interface RevenueMetric {
  value: string;
  change: number;
  trend: "up" | "down";
  breakdown?: {
    creditPlan: { value: string; change: number };
    recurring: { value: string; change: number };
    oneTime: { value: string; change: number };
  };
}

export interface RatingBreakdown {
  nomades: { value: number; change: number; trend: "up" | "down" };
  agencies: { value: number; change: number; trend: "up" | "down" };
  leadPremium: { value: number; change: number; trend: "up" | "down" };
  support: { value: number; change: number; trend: "up" | "down" };
  projects: { value: number; change: number; trend: "up" | "down" };
}

export interface MetricCard {
  id: MetricType;
  order: number;
  visible: boolean;
}

export interface WidgetLibraryItem {
  id: WidgetType;
  name: string;
  description: string;
  icon: React.ElementType;
  color?: string;
}

export interface WidgetState {
  id: string;
  type: WidgetType;
  visible: boolean;
  order: number;
  customTitle?: string;
  colSpan?: 1 | 2 | 3;
}

export interface SystemAlert {
  id: string;
  type: "tarefas" | "mensagens" | "financeiro" | "projetos" | "sistema";
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  count: number;
  link: string;
  icon: typeof AlertTriangle;
}

// ─── Historical (manual) data system ─────────────────────────────────────────

export type ManualDataEntry = {
  // Financeiro
  revenue_total?: number;
  mrr_total?: number;
  creditPlans_total?: number;
  accountsReceivable_total?: number;
  cmv_totalCosts?: number;
  // Projetos & Tarefas
  activeProjects_total?: number;
  tasks_total?: number;
  tasks_completed?: number;
  tasks_inProgress?: number;
  tasks_slaCompliance?: number;
  // Nômades & Parceiros
  nomads_total?: number;
  nomads_active?: number;
  partnerProgram_total?: number;
  partnerProgram_invitesSent?: number;
  partnerProgram_mrrGenerated?: number;
  // Churn, Ticket & LTV
  churn_revenueChurnRate?: number;
  churn_revenueChurn?: number;
  averageTicket_general?: number;
  ltv_value?: number;
};

// ─── Share system ─────────────────────────────────────────────────────────────

export type ShareConfig = {
  target: { id: string; title: string; type: "widget" | "dashboard" };
  permission: "view" | "comment";
  pin?: string;
  expiry?: Date;
};

// ─── Saved Dashboard ──────────────────────────────────────────────────────────

export interface SavedDashboard {
  id: string;
  name: string;
  widgets: WidgetState[];
  createdAt: string;
  updatedAt?: string;
  isGlobal?: boolean;
  isDefault?: boolean;
  sharedWith?: string[];
  createdBy?: string;
}

// ─── Widget period override ───────────────────────────────────────────────────

export interface WidgetPeriodOverride {
  widgetId: string;
  mode: "global" | "custom";
  customPeriod?: {
    from: string;
    to: string;
    label: string;
    periodKey?: string;
  };
}

// ─── Global period ────────────────────────────────────────────────────────────

export type GlobalPeriodType =
  | "today"
  | "yesterday"
  | "last_7_days"
  | "last_30_days"
  | "this_month"
  | "last_month"
  | "this_quarter"
  | "custom";

export interface GlobalPeriod {
  type: GlobalPeriodType;
  from?: Date;
  to?: Date;
  label: string;
}
