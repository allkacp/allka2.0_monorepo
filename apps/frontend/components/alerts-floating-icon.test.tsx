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
    getCurrentUser: vi.fn().mockResolvedValue({ admin_profile: null }),
    getAlertMonitoringSummary: vi.fn().mockRejectedValue(new Error("403")),
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

  it("o pulso usa motion-safe (respeita prefers-reduced-motion) quando há alerta ativo — nunca 'animate-pulse' cru", async () => {
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

  // ── Indicador de criticidade (ata 2026-08, bloco interface/usabilidade) ──

  async function iconClasses() {
    await waitFor(() => expect(document.querySelectorAll("svg.lucide-triangle-alert").length).toBeGreaterThan(0));
    return Array.from(document.querySelectorAll("svg.lucide-triangle-alert")).map((s) => s.getAttribute("class") ?? "");
  }

  it("nenhum alerta → estado neutro: sem badge, sem pulso, cor neutra", async () => {
    (apiClient.getUnreadSystemAlertsCount as any).mockResolvedValue({ count: 0, bySeverity: { info: 0, warning: 0, error: 0 } });
    renderWidget();
    const classes = await iconClasses();
    expect(classes.every((c) => !c.includes("animate-pulse"))).toBe(true);
    expect(classes.some((c) => c.includes("text-white/70"))).toBe(true);
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("somente verdes (info) → verde (nunca amarelo)", async () => {
    (apiClient.getUnreadSystemAlertsCount as any).mockResolvedValue({ count: 3, bySeverity: { info: 3, warning: 0, error: 0 } });
    renderWidget();
    const classes = await iconClasses();
    expect(classes.some((c) => c.includes("text-emerald-400"))).toBe(true);
    expect(classes.some((c) => c.includes("motion-safe:animate-pulse"))).toBe(true);
    expect((await screen.findAllByText("3")).length).toBeGreaterThan(0);
  });

  it("amarelo sem vermelho → amarelo verdadeiro (yellow, não orange)", async () => {
    (apiClient.getUnreadSystemAlertsCount as any).mockResolvedValue({ count: 2, bySeverity: { info: 1, warning: 1, error: 0 } });
    renderWidget();
    const classes = await iconClasses();
    expect(classes.some((c) => c.includes("text-yellow-400"))).toBe(true);
    expect(classes.some((c) => c.includes("orange"))).toBe(false);
  });

  it("pelo menos um vermelho → vermelho, mesmo com amarelos e verdes juntos (prioridade)", async () => {
    (apiClient.getUnreadSystemAlertsCount as any).mockResolvedValue({ count: 6, bySeverity: { info: 2, warning: 3, error: 1 } });
    renderWidget();
    const classes = await iconClasses();
    expect(classes.some((c) => c.includes("text-red-400"))).toBe(true);
    expect(classes.every((c) => !c.includes("text-yellow-400") && !c.includes("text-emerald-400"))).toBe(true);
  });

  it("aria-label informa contagem e maior criticidade (a cor não é a única pista)", async () => {
    (apiClient.getUnreadSystemAlertsCount as any).mockResolvedValue({ count: 4, bySeverity: { info: 1, warning: 1, error: 2 } });
    renderWidget();
    await waitFor(() =>
      expect(screen.getAllByLabelText(/Maior criticidade: Vermelho\./).length).toBeGreaterThan(0),
    );
    expect(screen.getAllByLabelText(/você possui 4 alertas/).length).toBeGreaterThan(0);
  });

  it("painel aberto pausa o pulso (mantém cor e badge)", async () => {
    (apiClient.getUnreadSystemAlertsCount as any).mockResolvedValue({ count: 1, bySeverity: { info: 0, warning: 0, error: 1 } });
    const user = userEvent.setup();
    renderWidget();
    await iconClasses();
    const triggers = await getTriggers();
    await user.click(triggers[0]);
    await screen.findByRole("heading", { name: "Alertas" });
    const classes = await iconClasses();
    expect(classes.every((c) => !c.includes("animate-pulse"))).toBe(true);
    expect(classes.some((c) => c.includes("text-red-400"))).toBe(true);
  });
});
