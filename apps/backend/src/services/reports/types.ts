// ─── Shared types for the Report & Indicator service layer ───────────────────

import type { JwtPayload } from "../../middleware/auth";

export type { JwtPayload };

// ─── Scope ───────────────────────────────────────────────────────────────────

export type ScopeType =
  | "GLOBAL"
  | "OWN_PROFILE_SCOPE"
  | "OWN_USER_SCOPE"
  | "OWN_COMPANY_SCOPE"
  | "OWN_AGENCY_SCOPE"
  | "OWN_NOMAD_SCOPE"
  | "OWN_PARTNER_SCOPE"
  | "OWN_LEADER_SCOPE"
  | "CUSTOM_USERS";

export interface ResolvedScope {
  type: ScopeType;
  // agency
  agencyIds?: string[];    // Agency.id[]
  agencyNames?: string[];  // Agency.name[] (workaround for Project.agency string FK)
  // company
  companyIds?: string[];
  // nomad / leader
  nomadeId?: string;
  leaderUserId?: string;   // User.id of the leader
  // partner
  partnerProfileId?: string;
  // custom
  customUserIds?: string[];
}

// ─── Calculator context passed to every calculator ────────────────────────────

export interface DateRange {
  start: Date;
  end: Date;
}

export interface CalculatorContext {
  scope: ResolvedScope;
  current: DateRange;
  previous?: DateRange;                   // set when comparisonMode=true
  filters: Record<string, unknown>;
}

// ─── Indicator run request (from API body) ────────────────────────────────────

export interface IndicatorRunRequest {
  indicatorId: string;
  startDate: string;        // ISO date string, e.g. "2026-01-01"
  endDate: string;          // ISO date string, e.g. "2026-01-31"
  filters?: Record<string, unknown>;
  comparisonMode?: boolean; // if true, also compute previous period
  reportKey?: string;       // context: which report this is running inside
}

// ─── Indicator result returned to the API ────────────────────────────────────

export type Trend = "up" | "down" | "flat";
export type IndicatorHealth = "ok" | "warning" | "danger";

export interface IndicatorResult {
  indicatorId: string;
  title: string;
  value: number | null;         // null = unavailable (not zero)
  previousValue?: number | null;
  variationPercent?: number | null;
  trend?: Trend | null;
  status?: IndicatorHealth | null;
  chartData?: ChartPoint[];
  breakdown?: Record<string, number>;
  drilldownAvailable: boolean;
  meta: Record<string, unknown>;
  warnings: string[];
  // set when indicator cannot be computed at all
  unavailable?: boolean;
  unavailableReason?: "missing_model" | "insufficient_scope" | "no_permission" | "error";
}

export interface ChartPoint {
  label: string;
  value: number;
  [key: string]: unknown;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function computeVariation(
  current: number | null,
  previous: number | null,
): { variationPercent: number | null; trend: Trend | null } {
  if (current === null || previous === null) {
    return { variationPercent: null, trend: null };
  }
  if (previous === 0) {
    return {
      variationPercent: current > 0 ? 100 : 0,
      trend: current > 0 ? "up" : "flat",
    };
  }
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  return {
    variationPercent: Math.round(pct * 100) / 100,
    trend: pct > 0.5 ? "up" : pct < -0.5 ? "down" : "flat",
  };
}

export function previousPeriod(range: DateRange): DateRange {
  const durationMs = range.end.getTime() - range.start.getTime();
  return {
    start: new Date(range.start.getTime() - durationMs - 1),
    end: new Date(range.start.getTime() - 1),
  };
}

export function unavailableResult(
  indicatorId: string,
  title: string,
  reason: IndicatorResult["unavailableReason"],
  warning: string,
): IndicatorResult {
  return {
    indicatorId,
    title,
    value: null,
    drilldownAvailable: false,
    meta: {},
    warnings: [warning],
    unavailable: true,
    unavailableReason: reason,
  };
}
