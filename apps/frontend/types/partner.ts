// Types for the Partner (influencer/affiliate) access portal

export type PartnerLevel = "bronze" | "silver" | "gold" | "platinum" | "diamond";

export interface PartnerProfile {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatarInitials: string;
  linkedCampaignId?: string;
  linkedCampaignName?: string;
  linkedCouponId?: string;
  linkedCouponCode?: string;
  /** Current pending balance available for withdrawal (R$) */
  balance: number;
  /** Total lifetime commissions earned (R$) */
  totalEarned: number;
  /** Total amount withdrawn to date (R$) */
  totalWithdrawn: number;
  /** Partner's own shareable referral link / coupon code */
  referralLink?: string;
  referralCode?: string;
  status: "active" | "suspended" | "pending";
  createdAt: string;
  /** PIX key for withdrawals */
  pixKey?: string;
  pixKeyType?: "cpf" | "email" | "phone" | "random";
  /** Partner program level */
  level?: PartnerLevel;
  /** Current month MRR consumption (R$) */
  currentMrr?: number;
}

export interface PartnerStats {
  clicks: number;
  conversions: number;
  abandonment: number;
  conversionRate: number;
  contractedProjects: number;
  commissionsEarned: number;
  /** Period label for display */
  period: string;
}

export interface PartnerCommission {
  id: string;
  partnerId: string;
  /** Campaign, coupon or direct referral that triggered this commission —
   *  derived server-side from PartnerCommission.campaign?.type (falls back
   *  to "referral" when there's no linked campaign). */
  sourceType: "campaign" | "coupon" | "referral";
  sourceName: string;
  /** Company that converted */
  companyName: string;
  /** Project contracted */
  projectName?: string;
  projectValue?: number;
  commissionAmount: number;
  status: "pending" | "confirmed" | "paid" | "cancelled";
  convertedAt: string;
}

export interface PartnerWithdrawal {
  id: string;
  partnerId: string;
  amount: number;
  pixKey: string;
  pixKeyType: "cpf" | "email" | "phone" | "random";
  status: "pending" | "approved" | "rejected" | "paid";
  requestedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  paidAt?: string;
  notes?: string;
}

export interface PartnerProject {
  id: string;
  partnerId: string;
  companyName: string;
  companyId: string;
  projectName: string;
  projectValue: number;
  serviceCategory: string;
  status: "active" | "completed" | "cancelled";
  contractedAt: string;
  completedAt?: string;
  commissionGenerated: number;
  commissionStatus: "pending" | "confirmed" | "paid";
}

// Admin-side: pending withdrawal request visible in financeiro
export interface PendingWithdrawalAdmin extends PartnerWithdrawal {
  partnerName: string;
  partnerEmail: string;
}

// ── Led Agency (Agências Lideradas) ──────────────────────────────────────────

export interface AgencyReport {
  id: string;
  partnerId: string;
  agencyId: string;
  title: string;
  content: string;
  periodMonth: number;
  periodYear: number;
  rating?: number;
  highlights?: string[];
  improvements?: string[];
  mrr?: number;
  projectsCount?: number;
  tasksCount?: number;
  status: "draft" | "published";
  createdAt: string;
  updatedAt: string;
}

export interface LedAgency {
  id: string;
  name: string;
  email: string;
  plan: string;
  mrr: number;
  status: "active" | "onboarding" | "at_risk" | "inactive";
  joinedAt: string;
  lastActiveAt: string;
  totalProjects: number;
  commissionAmount: number;
  reports?: AgencyReport[];
  leadershipId?: string;
}
