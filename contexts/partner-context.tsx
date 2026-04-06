"use client";

import { createContext, useContext, useState } from "react";
import type {
  PartnerProfile,
  PartnerStats,
  PartnerCommission,
  PartnerWithdrawal,
  PartnerProject,
  LedAgency,
} from "@/types/partner";

// ── Mock data ─────────────────────────────────────────────────────────────────

export const MOCK_PARTNER_PROFILE: PartnerProfile = {
  id: "p1",
  userId: "u1",
  name: "Carlos Mendonça",
  email: "carlos@influencer.com",
  avatarInitials: "CM",
  linkedCampaignId: "c1",
  linkedCampaignName: "Campanha Verão 2026",
  linkedCouponCode: "CARLOS10",
  balance: 1240.0,
  totalEarned: 4870.5,
  totalWithdrawn: 3630.5,
  referralLink: "https://allka.com.br/ref/carlos10",
  referralCode: "CARLOS10",
  status: "active",
  createdAt: "2025-06-01",
  pixKey: "carlos@influencer.com",
  pixKeyType: "email",
  level: "silver",
  currentMrr: 1650,
};

export const MOCK_PARTNER_STATS: PartnerStats = {
  clicks: 1842,
  conversions: 38,
  abandonment: 1804,
  conversionRate: 2.1,
  contractedProjects: 38,
  commissionsEarned: 4870.5,
  period: "Últimos 30 dias",
};

export const MOCK_LED_AGENCIES: LedAgency[] = [
  {
    id: "a1",
    name: "Agência Criativa SP",
    email: "contato@criativasp.com.br",
    plan: "2000",
    mrr: 2000,
    status: "active",
    joinedAt: "2025-09-01",
    lastActiveAt: "2026-04-01",
    totalProjects: 12,
    commissionAmount: 100,
  },
  {
    id: "a2",
    name: "Studio Digital RJ",
    email: "hello@studiodigital.com.br",
    plan: "1000",
    mrr: 950,
    status: "at_risk",
    joinedAt: "2025-10-15",
    lastActiveAt: "2026-02-10",
    totalProjects: 5,
    commissionAmount: 47.5,
  },
  {
    id: "a3",
    name: "Maketer Agency",
    email: "ops@maketer.com.br",
    plan: "500",
    mrr: 500,
    status: "active",
    joinedAt: "2025-11-01",
    lastActiveAt: "2026-04-02",
    totalProjects: 7,
    commissionAmount: 25,
  },
  {
    id: "a4",
    name: "Brandcraft BH",
    email: "time@brandcraft.com.br",
    plan: "1000",
    mrr: 0,
    status: "onboarding",
    joinedAt: "2026-03-20",
    lastActiveAt: "2026-03-20",
    totalProjects: 0,
    commissionAmount: 0,
  },
  {
    id: "a5",
    name: "Pixels & Ideias",
    email: "ola@pixelseideias.com.br",
    plan: "2000",
    mrr: 1800,
    status: "active",
    joinedAt: "2025-08-01",
    lastActiveAt: "2026-04-03",
    totalProjects: 18,
    commissionAmount: 90,
  },
];

export const MOCK_PARTNER_COMMISSIONS: PartnerCommission[] = [
  {
    id: "com1",
    partnerId: "p1",
    sourceType: "campaign",
    sourceName: "Campanha Verão 2026",
    companyName: "Coca-Cola Brasil",
    companyId: "c1",
    projectName: "Campanha Rebranding",
    projectValue: 12000,
    commissionType: "percentage",
    commissionValue: 10,
    commissionAmount: 1200,
    status: "paid",
    convertedAt: "2026-02-10",
    paidAt: "2026-02-20",
  },
  {
    id: "com2",
    partnerId: "p1",
    sourceType: "coupon",
    sourceName: "CARLOS10",
    companyName: "Starbucks Coffee",
    companyId: "c2",
    projectName: "Campanha Sazonal",
    projectValue: 8500,
    commissionType: "percentage",
    commissionValue: 10,
    commissionAmount: 850,
    status: "paid",
    convertedAt: "2026-02-14",
    paidAt: "2026-02-25",
  },
  {
    id: "com3",
    partnerId: "p1",
    sourceType: "campaign",
    sourceName: "Campanha Verão 2026",
    companyName: "Tesla Brasil",
    companyId: "c3",
    projectName: "Vídeo Institucional",
    projectValue: 15000,
    commissionType: "percentage",
    commissionValue: 10,
    commissionAmount: 1500,
    status: "confirmed",
    convertedAt: "2026-03-01",
  },
  {
    id: "com4",
    partnerId: "p1",
    sourceType: "coupon",
    sourceName: "CARLOS10",
    companyName: "Magazine Luiza",
    companyId: "c4",
    projectName: "Produção de Conteúdo",
    projectValue: 6200,
    commissionType: "percentage",
    commissionValue: 10,
    commissionAmount: 620,
    status: "pending",
    convertedAt: "2026-03-08",
  },
  {
    id: "com5",
    partnerId: "p1",
    sourceType: "campaign",
    sourceName: "Campanha Verão 2026",
    companyName: "Nubank",
    companyId: "c5",
    projectName: "Social Media Pack",
    projectValue: 4500,
    commissionType: "percentage",
    commissionValue: 10,
    commissionAmount: 450,
    status: "pending",
    convertedAt: "2026-03-10",
  },
];

export const MOCK_PARTNER_WITHDRAWALS: PartnerWithdrawal[] = [
  {
    id: "w1",
    partnerId: "p1",
    amount: 2000,
    pixKey: "carlos@influencer.com",
    pixKeyType: "email",
    status: "paid",
    requestedAt: "2026-01-15",
    reviewedAt: "2026-01-16",
    reviewedBy: "Admin",
    paidAt: "2026-01-17",
  },
  {
    id: "w2",
    partnerId: "p1",
    amount: 1630.5,
    pixKey: "carlos@influencer.com",
    pixKeyType: "email",
    status: "paid",
    requestedAt: "2026-02-20",
    reviewedAt: "2026-02-21",
    reviewedBy: "Admin",
    paidAt: "2026-02-22",
  },
  {
    id: "w3",
    partnerId: "p1",
    amount: 800,
    pixKey: "carlos@influencer.com",
    pixKeyType: "email",
    status: "pending",
    requestedAt: "2026-03-11",
  },
];

export const MOCK_PARTNER_PROJECTS: PartnerProject[] = [
  {
    id: "proj1",
    partnerId: "p1",
    companyName: "Coca-Cola Brasil",
    companyId: "c1",
    projectName: "Campanha Rebranding",
    projectValue: 12000,
    serviceCategory: "Branding",
    status: "completed",
    contractedAt: "2026-02-10",
    completedAt: "2026-02-28",
    commissionGenerated: 1200,
    commissionStatus: "paid",
  },
  {
    id: "proj2",
    partnerId: "p1",
    companyName: "Starbucks Coffee",
    companyId: "c2",
    projectName: "Campanha Sazonal",
    projectValue: 8500,
    serviceCategory: "Social Media",
    status: "completed",
    contractedAt: "2026-02-14",
    completedAt: "2026-02-25",
    commissionGenerated: 850,
    commissionStatus: "paid",
  },
  {
    id: "proj3",
    partnerId: "p1",
    companyName: "Tesla Brasil",
    companyId: "c3",
    projectName: "Vídeo Institucional",
    projectValue: 15000,
    serviceCategory: "Produção de Vídeo",
    status: "active",
    contractedAt: "2026-03-01",
    commissionGenerated: 1500,
    commissionStatus: "confirmed",
  },
  {
    id: "proj4",
    partnerId: "p1",
    companyName: "Magazine Luiza",
    companyId: "c4",
    projectName: "Produção de Conteúdo",
    projectValue: 6200,
    serviceCategory: "Conteúdo",
    status: "active",
    contractedAt: "2026-03-08",
    commissionGenerated: 620,
    commissionStatus: "pending",
  },
  {
    id: "proj5",
    partnerId: "p1",
    companyName: "Nubank",
    companyId: "c5",
    projectName: "Social Media Pack",
    projectValue: 4500,
    serviceCategory: "Social Media",
    status: "active",
    contractedAt: "2026-03-10",
    commissionGenerated: 450,
    commissionStatus: "pending",
  },
];

// ── Context ────────────────────────────────────────────────────────────────────

interface PartnerContextType {
  profile: PartnerProfile;
  stats: PartnerStats;
  commissions: PartnerCommission[];
  withdrawals: PartnerWithdrawal[];
  projects: PartnerProject[];
  ledAgencies: LedAgency[];
  requestWithdrawal: (
    amount: number,
    pixKey: string,
    pixKeyType: PartnerWithdrawal["pixKeyType"],
  ) => void;
}

const PartnerContext = createContext<PartnerContextType | undefined>(undefined);

export function PartnerProvider({ children }: { children: React.ReactNode }) {
  const [profile] = useState<PartnerProfile>(MOCK_PARTNER_PROFILE);
  const [stats] = useState<PartnerStats>(MOCK_PARTNER_STATS);
  const [commissions] = useState<PartnerCommission[]>(MOCK_PARTNER_COMMISSIONS);
  const [withdrawals, setWithdrawals] = useState<PartnerWithdrawal[]>(
    MOCK_PARTNER_WITHDRAWALS,
  );
  const [projects] = useState<PartnerProject[]>(MOCK_PARTNER_PROJECTS);
  const [ledAgencies] = useState<LedAgency[]>(MOCK_LED_AGENCIES);

  const requestWithdrawal = (
    amount: number,
    pixKey: string,
    pixKeyType: PartnerWithdrawal["pixKeyType"],
  ) => {
    const newWithdrawal: PartnerWithdrawal = {
      id: `w${Date.now()}`,
      partnerId: profile.id,
      amount,
      pixKey,
      pixKeyType,
      status: "pending",
      requestedAt: new Date().toISOString().split("T")[0],
    };
    setWithdrawals((prev) => [newWithdrawal, ...prev]);
  };

  return (
    <PartnerContext.Provider
      value={{
        profile,
        stats,
        commissions,
        withdrawals,
        projects,
        ledAgencies,
        requestWithdrawal,
      }}
    >
      {children}
    </PartnerContext.Provider>
  );
}

export function usePartner() {
  const ctx = useContext(PartnerContext);
  if (!ctx) throw new Error("usePartner must be used inside PartnerProvider");
  return ctx;
}
