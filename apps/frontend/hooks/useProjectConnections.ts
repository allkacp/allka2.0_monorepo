import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";

export interface ProjectConnection {
  id: string;
  project_id: string;
  provider: string;
  status: "connected" | "expired" | "disconnected" | "error";
  external_account_id: string;
  external_account_name: string | null;
  token_expires_at: string | null;
  last_synced_at: string | null;
  last_error: string | null;
  created_at: string;
}

/** Compartilhado entre a aba "Conexões" e o widget da Visão Geral — uma
 * fetch só por projeto aberto, não duas. */
export function useProjectConnections(projectId: string | number) {
  const [connections, setConnections] = useState<ProjectConnection[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.getProjectConnections(projectId);
      setConnections(res?.data ?? []);
    } catch {
      setConnections([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  // Voltar da aba do Meta (OAuth) pra essa aba deve atualizar sozinho, sem
  // exigir um refresh manual.
  useEffect(() => {
    const onFocus = () => void refetch();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refetch]);

  return { connections, loading, refetch };
}
