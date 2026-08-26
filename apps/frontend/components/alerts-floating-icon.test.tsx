import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AccountTypeProvider } from "@/contexts/account-type-context";
import { GlobalHeaderPanelProvider } from "@/contexts/global-header-panel-context";
import { OpenScreensProvider } from "@/contexts/open-screens-context";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { AlertsFloatingIcon } from "@/components/alerts-floating-icon";

// Lote de correção visual (ata 2026-08, revisão do responsável) — Alertas
// saiu do cabeçalho (não fica mais ao lado do sino) e passou a viver na
// barra vertical direita (desktop) / botão flutuante redondo (mobile),
// mesma família visual dos outros ícones dessa barra (chat, bandeja de
// telas, ajuda). Abre um painel de verdade exclusivo (AlertsPanel).

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    getUnreadSystemAlertsCount: vi.fn().mockResolvedValue({ count: 0 }),
    getSystemAlerts: vi.fn().mockResolvedValue({ data: [] }),
    getAgencyAlerts: vi.fn().mockResolvedValue({ data: [] }),
    markSystemAlertRead: vi.fn(),
    archiveSystemAlert: vi.fn(),
    unarchiveSystemAlert: vi.fn(),
    markAllSystemAlertsRead: vi.fn(),
  },
}));

import { apiClient } from "@/lib/api-client";

function renderWidget() {
  return render(
    <MemoryRouter initialEntries={["/admin/dashboard"]}>
      <AccountTypeProvider>
        <SidebarProvider>
          <OpenScreensProvider>
            <GlobalHeaderPanelProvider>
              <AlertsFloatingIcon />
            </GlobalHeaderPanelProvider>
          </OpenScreensProvider>
        </SidebarProvider>
      </AccountTypeProvider>
    </MemoryRouter>,
  );
}

async function getTriggers() {
  return screen.findAllByLabelText(/^Alertas/);
}

beforeEach(() => {
  vi.clearAllMocks();
  (apiClient.getUnreadSystemAlertsCount as any).mockResolvedValue({ count: 0 });
});

describe("AlertsFloatingIcon — barra vertical direita (desktop) e botão flutuante (mobile)", () => {
  it("3. o ícone de Alertas aparece na barra direita — dois gatilhos físicos (desktop lg:block / mobile lg:hidden), nunca visíveis ao mesmo tempo por breakpoint", async () => {
    renderWidget();
    const triggers = await getTriggers();
    expect(triggers).toHaveLength(2);

    const mobileTrigger = triggers.find((el) => el.className.includes("lg:hidden"));
    const desktopTrigger = triggers.find((el) => el !== mobileTrigger);
    expect(desktopTrigger).toBeTruthy();
    expect(mobileTrigger).toBeTruthy();
    expect(desktopTrigger?.parentElement?.className).toMatch(/\blg:block\b/);
  });

  it("uses AlertTriangle (triangle-alert), a different icon from the bell", async () => {
    renderWidget();
    await getTriggers();
    expect(document.querySelectorAll("svg.lucide-triangle-alert").length).toBeGreaterThan(0);
    expect(document.querySelectorAll("svg.lucide-bell").length).toBe(0);
  });

  it("4. tooltip do ícone de desktop mostra 'Alertas'", async () => {
    renderWidget();
    const triggers = await getTriggers();
    const desktopTrigger = triggers.find((el) => !el.className.includes("lg:hidden"))!;
    const tooltip = desktopTrigger.parentElement?.querySelector("span");
    expect(tooltip?.textContent).toBe("Alertas");
  });

  it("7. clicar no ícone abre o AlertsPanel (painel exclusivo, com seu próprio título)", async () => {
    const user = userEvent.setup();
    renderWidget();
    const triggers = await getTriggers();
    await user.click(triggers[0]);

    expect(await screen.findByRole("heading", { name: "Alertas" })).toBeInTheDocument();
  });

  it("5/17. contador é exclusivo de alertas — chama getUnreadSystemAlertsCount({ category: 'alerta' }), nunca sem filtro", async () => {
    (apiClient.getUnreadSystemAlertsCount as any).mockResolvedValue({ count: 4, bySeverity: { info: 2, warning: 1, error: 1 } });
    renderWidget();

    await waitFor(() => expect(apiClient.getUnreadSystemAlertsCount).toHaveBeenCalledWith({ category: "alerta" }));
    expect(apiClient.getUnreadSystemAlertsCount).not.toHaveBeenCalledWith(undefined);
    expect(apiClient.getUnreadSystemAlertsCount).not.toHaveBeenCalledWith({});
    expect((await screen.findAllByText("4")).length).toBeGreaterThan(0);
  });

  it("o pulso de urgência usa motion-safe (respeita prefers-reduced-motion) só quando há vermelho ativo", async () => {
    (apiClient.getUnreadSystemAlertsCount as any).mockResolvedValue({ count: 1, bySeverity: { info: 0, warning: 0, error: 1 } });
    renderWidget();

    await waitFor(() => {
      const svgs = document.querySelectorAll("svg.lucide-triangle-alert");
      expect(Array.from(svgs).some((s) => s.getAttribute("class")?.includes("motion-safe:animate-pulse"))).toBe(true);
    });
    const svgs = document.querySelectorAll("svg.lucide-triangle-alert");
    svgs.forEach((s) => {
      expect(s.getAttribute("class")?.split(" ")).not.toContain("animate-pulse");
    });
  });
});
