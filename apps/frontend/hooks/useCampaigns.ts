import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";

export function useCampaigns(filters?: Record<string, any>) {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response: any = await apiClient.getCampaigns(filters);
      setCampaigns(response.data || []);
      setTotal(response.total || 0);
    } catch (err: any) {
      console.error("[useCampaigns] API error:", err.message);
      setError(err.message);
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(filters)]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const createCampaign = useCallback(
    async (data: any) => {
      const result: any = await apiClient.createCampaign(data);
      await fetchCampaigns();
      return result;
    },
    [fetchCampaigns],
  );

  const updateCampaign = useCallback(
    async (id: string, data: any) => {
      const result: any = await apiClient.updateCampaign(id, data);
      await fetchCampaigns();
      return result;
    },
    [fetchCampaigns],
  );

  const deleteCampaign = useCallback(
    async (id: string) => {
      await apiClient.deleteCampaign(id);
      await fetchCampaigns();
    },
    [fetchCampaigns],
  );

  return {
    campaigns,
    total,
    loading,
    error,
    refetch: fetchCampaigns,
    createCampaign,
    updateCampaign,
    deleteCampaign,
  };
}
