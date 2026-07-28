import { forwardRef, type ReactNode } from "react";
import { STANDARD_SHELL_PANEL_CLASS } from "@/components/standard-page-shell";

/**
 * Wrapper de shell compartilhado pelos 5 dashboards (admin/agency/company/
 * partner/leader) — era um bloco de 4 divs idêntico byte-a-byte, copiado em
 * cada um dos 5 arquivos de ~13 mil linhas. Extraído pra evitar o mesmo
 * problema do useDashboardScrollCompact: uma correção no shell precisando
 * ser replicada manualmente em 5 lugares.
 *
 *   const { isHeaderCompact, dashboardScrollRef } = useDashboardScrollCompact();
 *   return (
 *     <DashboardShellFrame ref={dashboardScrollRef}>
 *       {... conteúdo do dashboard, sticky header + widgets ...}
 *     </DashboardShellFrame>
 *   );
 */
export const DashboardShellFrame = forwardRef<HTMLDivElement, { children: ReactNode }>(
  function DashboardShellFrame({ children }, ref) {
    return (
      <div className={STANDARD_SHELL_PANEL_CLASS}>
        <div className="relative h-full min-h-0 flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto" ref={ref}>
            <div className="container mx-auto space-y-4 px-0 py-0">{children}</div>
          </div>
        </div>
      </div>
    );
  },
);
