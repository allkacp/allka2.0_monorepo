import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { HelpFloatingIcon } from "@/components/help-floating-icon";
import { OnboardingProvider } from "@/contexts/onboarding-context";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { OpenScreensProvider } from "@/contexts/open-screens-context";

// Central de Ajuda — "Tours da plataforma", com categorias e busca (sprint de
// onboarding, bloco 2/3).

const { api } = vi.hoisted(() => ({
  api: {
    getCurrentUser: vi.fn(),
    listTourProgress: vi.fn(),
    getMyMandatoryBanners: vi.fn(),
    startTour: vi.fn(),
    restartTour: vi.fn(),
    saveTourStep: vi.fn(),
    completeTour: vi.fn(),
    postponeTour: vi.fn(),
    dismissTour: vi.fn(),
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
            {/* Alvos reais montados pra qualquer tour que precise deles ao ser
                iniciado/reiniciado pela Ajuda (nunca começa sem o alvo existir). */}
            <div data-tour-id="main-navigation" style={{ width: 10, height: 10 }} />
            <div data-tour-id="help-button" style={{ width: 10, height: 10 }} />
            <HelpFloatingIcon />
          </OnboardingProvider>
        </SidebarProvider>
      </OpenScreensProvider>
    </MemoryRouter>,
  );
}

async function openHelp() {
  renderHelp();
  const user = userEvent.setup();
  await user.click(screen.getAllByRole("button", { name: "Ajuda" })[0]);
  // Aguarda a transição de abertura do painel assentar (data-state="open")
  // antes de qualquer consulta por role, senão a árvore de acessibilidade
  // ainda reflete o estado "fechado" por um instante.
  await screen.findByText("Primeiros passos na Allka");
  return user;
}

function findTourCard(title: string) {
  const heading = screen.getByText(title);
  return heading.closest("div.rounded-xl") as HTMLElement;
}

describe("HelpFloatingIcon — Tours da plataforma", () => {
  it("organiza os tours por categoria (Primeiros passos / Alertas e comunicação / Produtos e catálogo / Memória e lançamento)", async () => {
    api.listTourProgress.mockResolvedValue({ data: [] });
    await openHelp();
    expect(await screen.findByText("Primeiros passos")).toBeInTheDocument();
    expect(screen.getByText("Alertas e comunicação")).toBeInTheDocument();
    expect(screen.getByText("Produtos e catálogo")).toBeInTheDocument();
    expect(screen.getByText("Memória e lançamento")).toBeInTheDocument();
  });

  it("lista só tours elegíveis pro perfil — admin-only (Legacy) nunca aparece pra uma conta 'empresas'", async () => {
    api.listTourProgress.mockResolvedValue({ data: [] });
    await openHelp();
    await screen.findByText("Primeiros passos na Allka");
    expect(screen.queryByText("Legacy")).not.toBeInTheDocument();
    expect(screen.queryByText("Administração de Alertas e Regras")).not.toBeInTheDocument();
    // mas os elegíveis pra "empresas" aparecem
    expect(screen.getByText("Catálogo do cliente e configurador")).toBeInTheDocument();
    expect(screen.getByText("Memória")).toBeInTheDocument();
  });

  it("busca pelo nome do tour filtra a lista", async () => {
    api.listTourProgress.mockResolvedValue({ data: [] });
    await openHelp();
    await screen.findByText("Primeiros passos na Allka");
    fireEvent.change(screen.getByLabelText("Buscar tour"), { target: { value: "aditivos" } });
    expect(await screen.findByText("Aditivos")).toBeInTheDocument();
    expect(screen.queryByText("Primeiros passos na Allka")).not.toBeInTheDocument();
  });

  it("card do tour piloto mostra status 'Novo' quando ainda não há progresso, com botão Começar", async () => {
    api.listTourProgress.mockResolvedValue({ data: [] });
    await openHelp();
    const card = findTourCard("Primeiros passos na Allka");
    expect(within(card).getByText("Novo")).toBeInTheDocument();
    expect(within(card).getByText(/come.ar/i).closest("button")).not.toBeNull();
  });

  it("mostra 'Em andamento' com progresso e botão 'Continuar'", async () => {
    api.listTourProgress.mockResolvedValue({
      data: [{ id: "p1", user_id: "u1", tour_key: "primeiros-passos", version: 1, status: "em_andamento", last_step_key: "alerts-button", started_at: "x", completed_at: null, dismissed_at: null, postponed_at: null, postponed_until: null, created_at: "x", updated_at: "x" }],
    });
    await openHelp();
    const card = findTourCard("Primeiros passos na Allka");
    expect(await within(card).findByText("Em andamento")).toBeInTheDocument();
    expect(within(card).getByRole("button", { name: /continuar/i })).toBeInTheDocument();
  });

  it("tour concluído mostra 'Refazer' e chama restartTour ao clicar (sem apagar o histórico)", async () => {
    api.listTourProgress.mockResolvedValue({
      data: [{ id: "p1", user_id: "u1", tour_key: "primeiros-passos", version: 1, status: "concluido", last_step_key: "help-button", started_at: "x", completed_at: "2026-01-01T00:00:00Z", dismissed_at: null, postponed_at: null, postponed_until: null, created_at: "x", updated_at: "x" }],
    });
    const user = await openHelp();
    const card = findTourCard("Primeiros passos na Allka");
    expect(await within(card).findByText("Concluído")).toBeInTheDocument();
    await user.click(within(card).getByRole("button", { name: /refazer/i }));
    expect(api.restartTour).toHaveBeenCalledWith("primeiros-passos", 1);
  });

  it("tour dispensado também mostra 'Refazer' (dispensar nunca impede reabertura manual)", async () => {
    api.listTourProgress.mockResolvedValue({
      data: [{ id: "p1", user_id: "u1", tour_key: "primeiros-passos", version: 1, status: "dispensado", last_step_key: null, started_at: null, completed_at: null, dismissed_at: "2026-01-01T00:00:00Z", postponed_at: null, postponed_until: null, created_at: "x", updated_at: "x" }],
    });
    await openHelp();
    const card = findTourCard("Primeiros passos na Allka");
    expect(await within(card).findByText("Dispensado")).toBeInTheDocument();
    expect(within(card).getByRole("button", { name: /refazer/i })).toBeInTheDocument();
  });
});
