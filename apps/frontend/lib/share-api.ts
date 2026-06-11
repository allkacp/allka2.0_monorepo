// Public API utility for fetching share page data.
// No auth header — the token itself carries identity and scope.
import type { FilterState } from "./share-token";

const API_BASE = (import.meta as any).env?.VITE_API_URL ?? "/api";

export type ShareApiData = {
  _meta: {
    profile: string;
    periodType: string;
    from: string;
    to: string;
    isRealData: boolean;
  };
  revenue: {
    total: number;
    growth: number;
    recurring: number;
    oneTime: number;
    projected: number;
  };
  mrr: { value: number; growth: number; trendData: number[] };
  churn: {
    rate: number;
    inactiveAccounts: number;
    cancelledProjects: number;
    revenueChurn: number;
    revenueChurnRate: number;
  };
  averageTicket: {
    general: number;
    growth: number;
    perProject: number;
    trendData: number[];
  };
  ltv: {
    value: number;
    agencies: number;
    leadPremium: number;
    nomades: number;
    hist0to1k: number;
    hist1kto5k: number;
    hist5kto15k: number;
    hist15kplus: number;
  };
  activeProjects: {
    total: number;
    inProgress: number;
    delivered: number;
    pending: number;
    growth: number;
  };
  tasks: {
    total: number;
    done: number;
    inProgress: number;
    pending: number;
    completionRate: number;
  };
  accountsReceivable: {
    total: number;
    creditPlans: number;
    postPaid: number;
    others: number;
    received: number;
    growth: number;
  };
  nomads: {
    total: number;
    active: number;
    newThisMonth: number;
    growth: number;
    avgRating: number;
  };
  partnerProgram: {
    activePartners: number;
    totalReferrals: number;
    conversionRate: number;
    partnerRevenue: number;
  };
  statusOverview: {
    active: number;
    trial: number;
    suspended: number;
    cancelled: number;
    total: number;
  };
  creditPlans: { active: number; totalValue: number; avgValue: number; overdue: number };
  platformActivities: {
    logins: number;
    projectsCreated: number;
    tasksCompleted: number;
    messagesExchanged: number;
  };
};

export class ShareApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ShareApiError";
  }
}

export async function fetchShareData(
  token: string,
  filters: FilterState,
): Promise<ShareApiData> {
  const res = await fetch(`${API_BASE}/share/data`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, filters }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ShareApiError(
      (body as any).error ?? `Erro ${res.status}`,
      res.status,
    );
  }

  return res.json() as Promise<ShareApiData>;
}
