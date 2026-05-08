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
  /** Campaign or coupon that triggered this commission */
  sourceType: "campaign" | "coupon";
  sourceName: string;
  /** Company that converted */
  companyName: string;
  companyId: string;
  /** Project contracted */
  projectName?: string;
  projectValue?: number;
  commissionType: "percentage" | "fixed";
  commissionValue: number;
  commissionAmount: number;
  status: "pending" | "confirmed" | "paid" | "cancelled";
  convertedAt: string;
  paidAt?: string;
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
}
