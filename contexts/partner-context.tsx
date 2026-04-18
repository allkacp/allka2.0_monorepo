"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import type {
  PartnerProfile,
  PartnerStats,
  PartnerCommission,
  PartnerWithdrawal,
  PartnerProject,
  LedAgency,
} from "@/types/partner";

// ── Data loaded from API on mount ──────────────────────────────────────────────

// ── Context ────────────────────────────────────────────────────────────────────

interface PartnerContextType {
  profile: PartnerProfile | null;
  stats: PartnerStats | null;
  commissions: PartnerCommission[];
  withdrawals: PartnerWithdrawal[];
  projects: PartnerProject[];
  ledAgencies: LedAgency[];
  loading: boolean;
  requestWithdrawal: (
    amount: number,
    pixKey: string,
    pixKeyType: PartnerWithdrawal["pixKeyType"],
  ) => void;
}

const PartnerContext = createContext<PartnerContextType | undefined>(undefined);

export function PartnerProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<PartnerProfile | null>(null);
  const [stats, setStats] = useState<PartnerStats | null>(null);
  const [commissions, setCommissions] = useState<PartnerCommission[]>([]);
  const [withdrawals, setWithdrawals] = useState<PartnerWithdrawal[]>([]);
  const [projects, setProjects] = useState<PartnerProject[]>([]);
  const [ledAgencies, setLedAgencies] = useState<LedAgency[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [meRes, commissionsRes] = await Promise.allSettled([
          apiClient.getPartnerMe(),
          apiClient.getPartnerCommissions("me"),
        ]);
        if (cancelled) return;
        if (meRes.status === "fulfilled") {
          const me: any = meRes.value;
          if (me.profile) setProfile(me.profile);
          if (me.stats) setStats(me.stats);
          if (me.withdrawals) setWithdrawals(me.withdrawals);
          if (me.projects) setProjects(me.projects);
          if (me.ledAgencies) setLedAgencies(me.ledAgencies);
        }
        if (commissionsRes.status === "fulfilled") {
          const data: any = commissionsRes.value;
          setCommissions(Array.isArray(data) ? data : data.data || []);
        }
      } catch (err) {
        console.error("[PartnerProvider] Failed to load data:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const requestWithdrawal = useCallback(async (
    amount: number,
    pixKey: string,
    pixKeyType: PartnerWithdrawal["pixKeyType"],
  ) => {
    try {
      const res: any = await apiClient.createWithdrawal({
        amount,
        pixKey,
        pixKeyType,
      });
      setWithdrawals((prev) => [res, ...prev]);
    } catch (err) {
      console.error("[PartnerProvider] Failed to request withdrawal:", err);
      // Fallback local add
      const newWithdrawal: PartnerWithdrawal = {
        id: `w${Date.now()}`,
        partnerId: profile?.id || "",
        amount,
        pixKey,
        pixKeyType,
        status: "pending",
        requestedAt: new Date().toISOString().split("T")[0],
      };
      setWithdrawals((prev) => [newWithdrawal, ...prev]);
    }
  }, [profile]);

  return (
    <PartnerContext.Provider
      value={{
        profile,
        stats,
        commissions,
        withdrawals,
        projects,
        ledAgencies,
        loading,
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
