import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";

export function useAgencies(filters?: Record<string, any>) {
  const [agencies, setAgencies] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgencies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response: any = await apiClient.getAgencies(filters);
      setAgencies(response.data || []);
      setTotal(response.total || 0);
    } catch (err: any) {
      console.error("[useAgencies] API error:", err.message);
      setError(err.message);
      setAgencies([]);
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(filters)]);

  useEffect(() => {
    fetchAgencies();
  }, [fetchAgencies]);

  const createAgency = useCallback(
    async (data: any) => {
      const result: any = await apiClient.createAgency(data);
      await fetchAgencies();
      return result;
    },
    [fetchAgencies],
  );

  const updateAgency = useCallback(
    async (id: string, data: any) => {
      const result: any = await apiClient.updateAgency(id, data);
      await fetchAgencies();
      return result;
    },
    [fetchAgencies],
  );

  const deleteAgency = useCallback(
    async (id: string) => {
      await apiClient.deleteAgency(id);
      await fetchAgencies();
    },
    [fetchAgencies],
  );

  return {
    agencies,
    total,
    loading,
    error,
    refetch: fetchAgencies,
    createAgency,
    updateAgency,
    deleteAgency,
  };
}
