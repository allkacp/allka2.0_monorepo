import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";

export function useSpecialties(filters?: Record<string, any>) {
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSpecialties = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response: any = await apiClient.getSpecialties(filters);
      setSpecialties(response.data || []);
      setTotal(response.total || 0);
    } catch (err: any) {
      console.error("[useSpecialties] API error:", err.message);
      setError(err.message);
      setSpecialties([]);
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(filters)]);

  useEffect(() => {
    fetchSpecialties();
  }, [fetchSpecialties]);

  const createSpecialty = useCallback(
    async (data: any) => {
      const result: any = await apiClient.createSpecialty(data);
      await fetchSpecialties();
      return result;
    },
    [fetchSpecialties],
  );

  const updateSpecialty = useCallback(
    async (id: string, data: any) => {
      const result: any = await apiClient.updateSpecialty(id, data);
      await fetchSpecialties();
      return result;
    },
    [fetchSpecialties],
  );

  const deleteSpecialty = useCallback(
    async (id: string) => {
      await apiClient.deleteSpecialty(id);
      await fetchSpecialties();
    },
    [fetchSpecialties],
  );

  return {
    specialties,
    total,
    loading,
    error,
    refetch: fetchSpecialties,
    createSpecialty,
    updateSpecialty,
    deleteSpecialty,
  };
}
