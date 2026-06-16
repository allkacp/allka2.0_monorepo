export const DATA_SCOPES = [
  "GLOBAL",
  "OWN_PROFILE_SCOPE",
  "OWN_COMPANY_SCOPE",
  "OWN_AGENCY_SCOPE",
  "OWN_NOMAD_SCOPE",
  "OWN_PARTNER_SCOPE",
  "OWN_LEADER_SCOPE",
  "CUSTOM_USERS",
] as const;

export type DataScope = (typeof DATA_SCOPES)[number];

export const DATA_SCOPE_LABELS: Record<string, string> = {
  GLOBAL: "Global — todos os dados",
  OWN_PROFILE_SCOPE: "Próprio perfil",
  OWN_COMPANY_SCOPE: "Empresa vinculada",
  OWN_AGENCY_SCOPE: "Agência vinculada",
  OWN_NOMAD_SCOPE: "Dados do nômade",
  OWN_PARTNER_SCOPE: "Dados do parceiro",
  OWN_LEADER_SCOPE: "Equipe do líder",
  CUSTOM_USERS: "Usuários específicos",
};

export const ACCOUNT_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "agencias", label: "Agências" },
  { value: "empresas", label: "Empresas" },
  { value: "nomades", label: "Nômades" },
  { value: "parceiro", label: "Parceiros" },
  { value: "lider", label: "Líderes" },
];

export interface ReportConfig {
  report_key: string;
  is_active: boolean;
  allowed_account_types: string[];
  allowed_roles: string[];
  allowed_user_ids: string[];
  blocked_user_ids: string[];
  data_scope: string;
  can_export: boolean;
  can_change_filters: boolean;
  only_related_data: boolean;
}

export interface AvailableReport {
  report_key: string;
  can_export: boolean;
  can_change_filters: boolean;
  data_scope: string;
}

// ─── Indicator result from POST /api/reports/indicators/run ──────────────────

export type IndicatorTrend = "up" | "down" | "flat";
export type IndicatorHealth = "ok" | "warning" | "danger";
export type UnavailableReason = "missing_model" | "insufficient_scope" | "no_permission" | "error";

export interface IndicatorResult {
  indicatorId: string;
  title: string;
  value: number | null;
  previousValue?: number | null;
  variationPercent?: number | null;
  trend?: IndicatorTrend | null;
  status?: IndicatorHealth | null;
  chartData?: { label: string; value: number }[];
  breakdown?: Record<string, number>;
  drilldownAvailable: boolean;
  meta: Record<string, unknown>;
  warnings: string[];
  unavailable?: boolean;
  unavailableReason?: UnavailableReason;
}

// ─── Admin report list entry ─────────────────────────────────────────────────

export interface AdminReportEntry extends ReportConfig {
  id?: string;
  configured: boolean;
  created_at?: string;
  updated_at?: string;
}

// ─── Period option ────────────────────────────────────────────────────────────

export interface PeriodOption {
  value: string;
  label: string;
  days: number;
}

export const PERIOD_OPTIONS: PeriodOption[] = [
  { value: "7", label: "Últimos 7 dias", days: 7 },
  { value: "30", label: "Últimos 30 dias", days: 30 },
  { value: "90", label: "Últimos 90 dias", days: 90 },
  { value: "365", label: "Último ano", days: 365 },
];

export function periodToDates(days: number): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}
