// Company data provider — originally mock data, now provides an API-fetcher hook.
// Exports are kept for backward compatibility with existing imports.
// IMPORTANT: Components should migrate to useCompanyData() hook for real API data.

export interface MockCompanyItem {
  id: number;
  name: string;
}

export interface MockClientItem {
  id: number;
  name: string;
  email: string;
  cnpj?: string;
}

export interface MockUserItem {
  id: number;
  name: string;
  email: string;
  role: string;
}

// ── Backward-compatible empty defaults (used during initial render before API loads) ──
export const mockCompaniesList: MockCompanyItem[] = [];
export const mockClientsByCompany: Record<number, MockClientItem[]> = {};
export const mockUsersByCompany: Record<number, MockUserItem[]> = {};

// ── Hook: useCompanyData() ─────────────────────────────────────────────────────
// Usage: const { companies, clientsByCompany, usersByCompany, loading } = useCompanyData()
import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";

export function useCompanyData() {
  const [companies, setCompanies] = useState<MockCompanyItem[]>([]);
  const [clientsByCompany, setClientsByCompany] = useState<
    Record<number, MockClientItem[]>
  >({});
  const [usersByCompany, setUsersByCompany] = useState<
    Record<number, MockUserItem[]>
  >({});
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await apiClient.getCompanies({ limit: "1000" });
      const data = res.data || (Array.isArray(res) ? res : []);
      setCompanies(data.map((c: any) => ({ id: Number(c.id), name: c.name })));
    } catch (err) {
      console.error("[useCompanyData] Failed to load companies:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    companies,
    clientsByCompany,
    usersByCompany,
    loading,
    refetch: fetchAll,
  };
}
