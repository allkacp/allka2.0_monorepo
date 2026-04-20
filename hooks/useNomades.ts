import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";

export function useNomades(filters?: Record<string, any>) {
  const [nomades, setNomades] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNomades = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response: any = await apiClient.getNomades(filters);
      setNomades(response.data || []);
      setTotal(response.total || 0);
    } catch (err: any) {
      console.error("[useNomades] API error:", err.message);
      setError(err.message);
      setNomades([]);
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(filters)]);

  useEffect(() => {
    fetchNomades();
  }, [fetchNomades]);

  const createNomade = useCallback(
    async (data: any) => {
      const result: any = await apiClient.createNomade(data);
      await fetchNomades();
      return result;
    },
    [fetchNomades],
  );

  const updateNomade = useCallback(
    async (id: string, data: any) => {
      const result: any = await apiClient.updateNomade(id, data);
      await fetchNomades();
      return result;
    },
    [fetchNomades],
  );

  const deleteNomade = useCallback(
    async (id: string) => {
      await apiClient.deleteNomade(id);
      await fetchNomades();
    },
    [fetchNomades],
  );

  return {
    nomades,
    total,
    loading,
    error,
    refetch: fetchNomades,
    createNomade,
    updateNomade,
    deleteNomade,
  };
}
