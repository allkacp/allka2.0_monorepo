import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { HelpFloatingIcon } from "@/components/help-floating-icon";
import { OnboardingProvider } from "@/contexts/onboarding-context";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { OpenScreensProvider } from "@/contexts/open-screens-context";

// Central de Ajuda — "Tours da plataforma" (sprint de onboarding, bloco 1/3).

const { api } = vi.hoisted(() => ({
  api: {
    getCurrentUser: vi.fn(),
    listTourProgress: vi.fn(),
    getMyMandatoryBanners: vi.fn(),
    startTour: vi.fn(),
    saveTourStep: vi.fn(),
    completeTour: vi.fn(),
    postponeTour: vi.fn(),
    dismissTour: vi.fn(),
    restartTour: vi.fn(),
  },
}));
vi.mock("@/lib/api-client", () => ({ apiClient: api, ApiError: class ApiError extends Error {} }));

beforeEach(() => {
  vi.clearAllMocks();
  api.getCurrentUser.mockResolvedValue({ id: "u1", account_type: "empresas" });
  api.getMyMandatoryBanners.mockResolvedValue({ data: [] });
  api.startTour.mockResolvedValue({ data: {} });
  api.restartTour.mockResolvedValue({ data: {} });
  api.saveTourStep.mockResolvedValue({ data: {} });
  api.completeTour.mockResolvedValue({ data: {} });
  api.postponeTour.mockResolvedValue({ data: {} });
  api.dismissTour.mockResolvedValue({ data: {} });
});

function renderHelp() {
  return render(
    <MemoryRouter>
      <OpenScreensProvider>
        <SidebarProvider>
          <OnboardingProvider>
            <HelpFloatingIcon />
          </OnboardingProvider>
        </SidebarProvider>
      </OpenScreensProvider>
    </MemoryRouter>,
  );
}

describe("HelpFloatingIcon — Tours da plataforma", () => {
  it("lista o tour piloto com status 'Novo' quando ainda não há progresso", async () => {
    api.listTourProgress.mockResolvedValue({ data: [] });
    const user = userEvent.setup();
    renderHelp();
    await user.click(screen.getAllByRole("button", { name: "Ajuda" })[0]);
    expect(await screen.findByText("Primeiros passos na Allka")).toBeInTheDocument();
    expect(screen.getByText("Novo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /começar/i })).toBeInTheDocument();
  });

  it("mostra 'Em andamento' com progresso e botão 'Continuar'", async () => {
    api.listTourProgress.mockResolvedValue({
      data: [{ id: "p1", user_id: "u1", tour_key: "primeiros-passos", version: 1, status: "em_andamento", last_step_key: "alerts-button", started_at: "x", completed_at: null, dismissed_at: null, postponed_at: null, postponed_until: null, created_at: "x", updated_at: "x" }],
    });
    const user = userEvent.setup();
    renderHelp();
    await user.click(screen.getAllByRole("button", { name: "Ajuda" })[0]);
    expect(await screen.findByText("Em andamento")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continuar/i })).toBeInTheDocument();
  });

  it("tour concluído mostra 'Refazer' e chama restartTour ao clicar (sem apagar o histórico)", async () => {
    api.listTourProgress.mockResolvedValue({
      data: [{ id: "p1", user_id: "u1", tour_key: "primeiros-passos", version: 1, status: "concluido", last_step_key: "help-button", started_at: "x", completed_at: "2026-01-01T00:00:00Z", dismissed_at: null, postponed_at: null, postponed_until: null, created_at: "x", updated_at: "x" }],
    });
    const user = userEvent.setup();
    renderHelp();
    await user.click(screen.getAllByRole("button", { name: "Ajuda" })[0]);
    expect(await screen.findByText("Concluído")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /refazer/i }));
    expect(api.restartTour).toHaveBeenCalledWith("primeiros-passos", 1);
  });
});
