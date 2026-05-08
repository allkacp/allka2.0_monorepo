import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";

export function usePermissions() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response: any = await apiClient.getPermissionProfiles();
      setProfiles(Array.isArray(response) ? response : response.data || []);
    } catch (err: any) {
      console.error("[usePermissions] API error:", err.message);
      setError(err.message);
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const createProfile = useCallback(
    async (data: any) => {
      const result: any = await apiClient.createPermissionProfile(data);
      await fetchProfiles();
      return result;
    },
    [fetchProfiles],
  );

  const updateProfile = useCallback(
    async (id: string, data: any) => {
      const result: any = await apiClient.updatePermissionProfile(id, data);
      await fetchProfiles();
      return result;
    },
    [fetchProfiles],
  );

  const deleteProfile = useCallback(
    async (id: string) => {
      await apiClient.deletePermissionProfile(id);
      await fetchProfiles();
    },
    [fetchProfiles],
  );

  const setPermissions = useCallback(
    async (profileId: string, permissions: any[]) => {
      await apiClient.updateProfilePermissions(profileId, permissions);
      await fetchProfiles();
    },
    [fetchProfiles],
  );

  return {
    profiles,
    loading,
    error,
    refetch: fetchProfiles,
    createProfile,
    updateProfile,
    deleteProfile,
    setPermissions,
  };
}
