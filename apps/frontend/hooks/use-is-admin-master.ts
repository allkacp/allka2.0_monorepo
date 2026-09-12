"use client";

// Mesmo padrão de detecção usado por useCanUseIallka
// (components/iallka-floating-icon.tsx) — busca o usuário atual uma vez e
// aplica a checagem oficial de Admin Master (mesma regra do backend,
// canManageAlertsAdmin). Usado pra restringir UI sensível (ex.: memória de
// cálculo de preço, reunião 10/09) que só faz sentido pra quem o backend já
// deixaria acessar — nunca duplica a decisão de acesso, só evita mostrar um
// controle que resultaria em 404/403.
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { canManageAlertsAdmin } from "@/lib/admin-permissions";

export function useIsAdminMaster(): boolean {
  const [isAdminMaster, setIsAdminMaster] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .getCurrentUser()
      .then((user: any) => {
        if (cancelled) return;
        const accountType = user?.account_type;
        setIsAdminMaster(accountType === "admin" && canManageAlertsAdmin(accountType, user?.admin_profile ?? null));
      })
      .catch(() => {
        if (!cancelled) setIsAdminMaster(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return isAdminMaster;
}
