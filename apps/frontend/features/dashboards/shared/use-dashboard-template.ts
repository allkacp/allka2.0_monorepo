// Hook único reutilizado pelos 6 dashboards para o template padrão do
// perfil (item 9) e os banners/avisos fixos (item 10).
//
// Regra de produto (revisada — o template NÃO é mais uma semente aplicada
// uma vez no primeiro acesso):
//   1. O template padrão definido pelo Admin é a VISÃO INICIAL de toda
//      nova sessão/entrada, sempre — nunca uma cópia congelada. Se o Admin
//      trocar o conteúdo do template, o próximo carregamento já reflete a
//      versão nova.
//   2. O usuário pode ter visões pessoais (localStorage) e alternar para
//      elas durante a sessão, mas elas nunca decidem qual é a visão
//      INICIAL — isso é decisão exclusiva do Admin.
//   3. Sem template configurado pro perfil: cai no fallback de sempre
//      (presets hardcoded / localStorage), comportamento inalterado.
// Ver TEMPLATE_DASHBOARD_ID abaixo — a entrada sintética usada pelos 6
// dashboards pra representar "estou vendo o padrão do Admin" no seletor de
// visões, sem persistir uma cópia dela em localStorage.
//
// Banners não têm hierarquia nenhuma: aparecem sempre que ativos dentro do
// período, independente de o usuário ter personalizado o layout — exceto
// os não-locked que o próprio usuário dispensou (guardado em localStorage,
// mesmo padrão de persistência pessoal do restante do dashboard).
import { useCallback, useEffect, useState } from "react";
import { apiClient, type DashboardTemplate, type DashboardTemplateContent } from "@/lib/api-client";
import { dashboardRoleToProfile } from "./dashboard-template-profile";
import type { DashboardRole } from "@/lib/dashboard-widget-roles";

/** Id sintético (nunca gravado em localStorage) da entrada "padrão do Admin" no seletor de visões. */
export const TEMPLATE_DASHBOARD_ID = "__admin_template_default__";

function dismissedKey(role: DashboardRole) {
  return `dashboard-template-content-dismissed-${role.toLowerCase()}`;
}

function readDismissed(role: DashboardRole): string[] {
  try {
    const raw = localStorage.getItem(dismissedKey(role));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function useDashboardTemplate(role: DashboardRole) {
  const [template, setTemplate] = useState<DashboardTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<string[]>(() => readDismissed(role));

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const { template: t } = await apiClient.resolveDashboardTemplate(dashboardRoleToProfile(role));
      setTemplate(t);
    } catch {
      // Sem template configurado, backend fora do ar, etc. — nunca deve
      // quebrar o dashboard; simplesmente não há template/banner nenhum.
      setTemplate(null);
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    reload();
  }, [reload]);

  const visibleContents: DashboardTemplateContent[] = (template?.contents ?? []).filter(
    (c) => !dismissed.includes(c.id),
  );

  const dismissContent = useCallback(
    (contentId: string) => {
      setDismissed((prev) => {
        if (prev.includes(contentId)) return prev;
        const next = [...prev, contentId];
        localStorage.setItem(dismissedKey(role), JSON.stringify(next));
        return next;
      });
    },
    [role],
  );

  return { template, loading, visibleContents, dismissContent, reload };
}
