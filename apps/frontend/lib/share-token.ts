// Shared types and utilities for dashboard/widget share tokens.
// All profile dashboards encode tokens using this contract;
// the public share page decodes them using decodeShareToken().

export type ShareProfile =
  | "admin"
  | "agency"
  | "company"
  | "nomad"
  | "partner"
  | "leader";

export type SharePeriod = {
  type: string;
  from?: string;  // ISO date string
  to?: string;    // ISO date string
  label: string;
};

// v1 tokens (legacy): target, permission, pin, expiry, issued
// v2 tokens (current): adds profile, period, scopeId, widgets
export type SharePayload = {
  target: { id: string; title: string; type: "widget" | "dashboard" };
  permission: "view" | "comment";
  pin: string | null;
  expiry: string | null;
  issued: string;
  // Added in v2
  profile?: ShareProfile;
  scopeId?: string;      // agencyId, companyId, nomadId, etc.
  period?: SharePeriod;
  widgets?: string[];    // ordered widget ids for dashboard shares
  // Added in v3
  allowFilterChanges?: boolean;  // visitor can change period/filters when true
  v?: number;
};

export function decodeShareToken(token: string): SharePayload | null {
  try {
    const json = decodeURIComponent(escape(atob(token)));
    const parsed = JSON.parse(json) as SharePayload;
    if (!parsed.target?.id || !parsed.permission) return null;
    return parsed;
  } catch {
    return null;
  }
}

export const PROFILE_LABELS: Record<ShareProfile, string> = {
  admin: "Admin",
  agency: "Agência",
  company: "Empresa",
  nomad: "Nômade",
  partner: "Parceiro",
  leader: "Líder",
};

// Active filter state for the viewer (separate from the locked token config).
// Stored in URL query params; never modifies the original token.
export type FilterState = {
  periodType: string;   // today | yesterday | last_7_days | last_30_days | ...
  periodLabel: string;
  dateFrom: string;     // ISO date "YYYY-MM-DD" or ""
  dateTo: string;       // ISO date "YYYY-MM-DD" or ""
  status: string;       // "" | active | trial | suspended | cancelled
};

export function makeFilterState(
  periodType = "last_30_days",
  periodLabel = "Últimos 30 dias",
  dateFrom = "",
  dateTo = "",
  status = "",
): FilterState {
  return { periodType, periodLabel, dateFrom, dateTo, status };
}

export function filterStateFromPeriod(period?: SharePeriod): FilterState {
  return makeFilterState(
    period?.type ?? "last_30_days",
    period?.label ?? "Últimos 30 dias",
    period?.from ? period.from.slice(0, 10) : "",
    period?.to ? period.to.slice(0, 10) : "",
    "",
  );
}

export const PROFILE_COLORS: Record<ShareProfile, string> = {
  admin: "text-violet-600 bg-violet-50 border-violet-200 dark:bg-violet-950/30 dark:border-violet-800",
  agency: "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800",
  company: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800",
  nomad: "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800",
  partner: "text-pink-600 bg-pink-50 border-pink-200 dark:bg-pink-950/30 dark:border-pink-800",
  leader: "text-indigo-600 bg-indigo-50 border-indigo-200 dark:bg-indigo-950/30 dark:border-indigo-800",
};
