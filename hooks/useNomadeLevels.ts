import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";

export function useNomadeLevels() {
  const [levels, setLevels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLevels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response: any = await apiClient.getNomadeLevels();
      setLevels(Array.isArray(response) ? response : response.data || []);
    } catch (err: any) {
      console.error("[useNomadeLevels] API error:", err.message);
      setError(err.message);
      setLevels([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLevels();
  }, [fetchLevels]);

  const createLevel = useCallback(
    async (data: any) => {
      const result: any = await apiClient.createNomadeLevel(data);
      await fetchLevels();
      return result;
    },
    [fetchLevels],
  );

  const updateLevel = useCallback(
    async (id: string, data: any) => {
      const result: any = await apiClient.updateNomadeLevel(id, data);
      await fetchLevels();
      return result;
    },
    [fetchLevels],
  );

  const deleteLevel = useCallback(
    async (id: string) => {
      await apiClient.deleteNomadeLevel(id);
      await fetchLevels();
    },
    [fetchLevels],
  );

  return {
    levels,
    loading,
    error,
    refetch: fetchLevels,
    createLevel,
    updateLevel,
    deleteLevel,
  };
}
