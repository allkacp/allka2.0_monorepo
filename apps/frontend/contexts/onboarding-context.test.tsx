import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { OnboardingProvider, useOnboarding } from "@/contexts/onboarding-context";

// Onboarding: orquestração do tour guiado (sprint de onboarding, bloco 1/3) —
// oferta no primeiro acesso, adiar/dispensar, retomar/reiniciar pela Ajuda,
// e nunca reabrir sozinho quando já existe uma decisão registrada.

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

function Harness() {
  const { requestStartTour, requestRestartTour, availableTours } = useOnboarding();
  const navigate = useNavigate();
  return (
    <div>
      {/* Navegação real (sem trocar de pathname de fato) só pra disparar o
          efeito de reavaliação de elegibilidade — simula "voltar pra mesma
          tela depois que a permissão mudou no servidor". */}
      <button onClick={() => navigate("/admin/legacy?revalidate=1")}>revalidate-route</button>
      <nav data-tour-id="main-navigation" style={{ width: 10, height: 10 }} />
      <button data-tour-id="notifications-button">Notif</button>
      <button data-tour-id="alerts-button">Alerts</button>
      <button data-tour-id="user-profile-menu">Perfil</button>
      <button data-tour-id="help-button">Ajuda</button>
      {/* Alvos de "legacy", usados só nos testes de permissão/rota abaixo. */}
      <div data-tour-id="legacy-header" style={{ width: 10, height: 10 }} />
      <div data-tour-id="legacy-tabs" style={{ width: 10, height: 10 }} />
      <ul data-testid="available-tour-keys">
        {availableTours.map((t) => (
          <li key={t.key}>{t.key}</li>
        ))}
      </ul>
      <button onClick={() => requestStartTour("primeiros-passos")}>start-from-help</button>
      <button onClick={() => requestRestartTour("primeiros-passos")}>restart-from-help</button>
      <button onClick={() => requestStartTour("legacy")}>start-legacy-from-help</button>
    </div>
  );
}

function renderProvider(initialEntries: string[] = ["/"]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <OnboardingProvider>
        <Harness />
      </OnboardingProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  api.getCurrentUser.mockResolvedValue({ id: "u1", account_type: "empresas" });
  api.listTourProgress.mockResolvedValue({ data: [] });
  api.getMyMandatoryBanners.mockResolvedValue({ data: [] });
  api.startTour.mockResolvedValue({ data: {} });
  api.saveTourStep.mockResolvedValue({ data: {} });
  api.completeTour.mockResolvedValue({ data: {} });
  api.postponeTour.mockResolvedValue({ data: {} });
  api.dismissTour.mockResolvedValue({ data: {} });
  api.restartTour.mockResolvedValue({ data: {} });
});

describe("OnboardingProvider — oferta no primeiro acesso", () => {
  it("oferece o tutorial quando não há decisão registrada e o alvo do primeiro passo já existe", async () => {
    renderProvider();
    expect(await screen.findByText("Conheça a plataforma Allka")).toBeInTheDocument();
  });

  it("'Começar tutorial' chama startTour e mostra o primeiro passo real", async () => {
    const user = userEvent.setup();
    renderProvider();
    await user.click(await screen.findByRole("button", { name: /começar tutorial/i }));
    await waitFor(() => expect(api.startTour).toHaveBeenCalledWith("primeiros-passos", 1));
    expect(await screen.findByText("Navegação principal")).toBeInTheDocument();
  });

  it("'Agora não' adia sem marcar como concluído e não inicia o tour", async () => {
    const user = userEvent.setup();
    renderProvider();
    await user.click(await screen.findByRole("button", { name: /agora não/i }));
    await waitFor(() => expect(api.postponeTour).toHaveBeenCalledWith("primeiros-passos", 1));
    expect(api.completeTour).not.toHaveBeenCalled();
    expect(api.startTour).not.toHaveBeenCalled();
    expect(screen.queryByText("Navegação principal")).not.toBeInTheDocument();
  });

  it("'Não quero ver este tutorial' dispensa a versão", async () => {
    const user = userEvent.setup();
    renderProvider();
    await user.click(await screen.findByRole("button", { name: /não quero ver este tutorial/i }));
    await waitFor(() => expect(api.dismissTour).toHaveBeenCalledWith("primeiros-passos", 1));
  });

  it("nunca oferece de novo quando já existe uma decisão registrada (concluído)", async () => {
    api.listTourProgress.mockResolvedValue({
      data: [{ id: "p1", user_id: "u1", tour_key: "primeiros-passos", version: 1, status: "concluido", last_step_key: "help-button", started_at: null, completed_at: "2026-01-01", dismissed_at: null, postponed_at: null, postponed_until: null, created_at: "x", updated_at: "x" }],
    });
    renderProvider();
    await screen.findByText("Ajuda"); // garante que o shell (Harness) já montou
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText("Conheça a plataforma Allka")).not.toBeInTheDocument();
  });

  it("nunca oferece de novo enquanto adiado ainda não venceu", async () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    api.listTourProgress.mockResolvedValue({
      data: [{ id: "p1", user_id: "u1", tour_key: "primeiros-passos", version: 1, status: "adiado", last_step_key: null, started_at: null, completed_at: null, dismissed_at: null, postponed_at: "2026-01-01", postponed_until: future, created_at: "x", updated_at: "x" }],
    });
    renderProvider();
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText("Conheça a plataforma Allka")).not.toBeInTheDocument();
  });

  it("não abre em cima de um banner obrigatório pendente — espera ele esvaziar", async () => {
    api.getMyMandatoryBanners.mockResolvedValueOnce({ data: [{ id: "b1" }] }).mockResolvedValue({ data: [] });
    renderProvider();
    expect(await screen.findByText("Conheça a plataforma Allka", {}, { timeout: 3000 })).toBeInTheDocument();
    expect(api.getMyMandatoryBanners).toHaveBeenCalledTimes(2);
  });
});

describe("OnboardingProvider — Central de Ajuda (retomar/reiniciar)", () => {
  it("retomar via Ajuda começa do passo salvo", async () => {
    api.listTourProgress.mockResolvedValue({
      data: [{ id: "p1", user_id: "u1", tour_key: "primeiros-passos", version: 1, status: "em_andamento", last_step_key: "alerts-button", started_at: "x", completed_at: null, dismissed_at: null, postponed_at: null, postponed_until: null, created_at: "x", updated_at: "x" }],
    });
    const user = userEvent.setup();
    renderProvider();
    await screen.findByText("start-from-help");
    // já em andamento -> não oferece a janela de boas-vindas de novo
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText("Conheça a plataforma Allka")).not.toBeInTheDocument();

    await user.click(screen.getByText("start-from-help"));
    expect(await screen.findByText("Alertas")).toBeInTheDocument(); // retomou do passo salvo, não do início
  });

  it("reiniciar via Ajuda começa do zero mesmo já tendo concluído", async () => {
    api.listTourProgress.mockResolvedValue({
      data: [{ id: "p1", user_id: "u1", tour_key: "primeiros-passos", version: 1, status: "concluido", last_step_key: "help-button", started_at: "x", completed_at: "x", dismissed_at: null, postponed_at: null, postponed_until: null, created_at: "x", updated_at: "x" }],
    });
    const user = userEvent.setup();
    renderProvider();
    await screen.findByText("restart-from-help");
    await user.click(screen.getByText("restart-from-help"));
    await waitFor(() => expect(api.restartTour).toHaveBeenCalledWith("primeiros-passos", 1));
    expect(await screen.findByText("Navegação principal")).toBeInTheDocument();
  });
});

describe("OnboardingProvider — concluir tour real", () => {
  it("concluir o último passo chama completeTour", async () => {
    const user = userEvent.setup();
    renderProvider();
    await user.click(await screen.findByRole("button", { name: /começar tutorial/i }));
    await screen.findByText("Navegação principal");
    // avança por todos os passos até o fim (busca é opcional e será pulada
    // por não existir na Harness)
    for (let i = 0; i < 6; i++) {
      const btn = screen.queryByRole("button", { name: /concluir/i });
      if (btn) {
        await user.click(btn);
        break;
      }
      await user.click(screen.getByRole("button", { name: /próximo/i }));
    }
    await waitFor(() => expect(api.completeTour).toHaveBeenCalledWith("primeiros-passos", 1));
  });
});

describe("OnboardingProvider — permissão real (bloco 2/3)", () => {
  it("mesmo account_type 'admin', SEM is_master: 'legacy' nunca aparece em availableTours", async () => {
    api.getCurrentUser.mockResolvedValue({ id: "u1", account_type: "admin", admin_profile: { is_active: true, is_master: false, permissions: [] } });
    renderProvider();
    await screen.findByText("Ajuda");
    await waitFor(() => expect(screen.getByTestId("available-tour-keys").textContent).not.toContain("legacy"));
    expect(within(screen.getByTestId("available-tour-keys")).queryByText("legacy")).not.toBeInTheDocument();
  });

  it("account_type 'admin' COM is_master: 'legacy' aparece em availableTours", async () => {
    api.getCurrentUser.mockResolvedValue({ id: "u1", account_type: "admin", admin_profile: { is_active: true, is_master: true, permissions: [] } });
    renderProvider();
    await waitFor(() => expect(within(screen.getByTestId("available-tour-keys")).queryByText("legacy")).toBeInTheDocument());
  });

  it("permissão perdida DURANTE o tour em andamento encerra com segurança (nunca trava tentando avançar num passo não autorizado)", async () => {
    api.getCurrentUser.mockResolvedValue({ id: "u1", account_type: "admin", admin_profile: { is_active: true, is_master: true, permissions: [] } });
    const user = userEvent.setup();
    renderProvider(["/admin/legacy"]);
    await user.click(await screen.findByText("start-legacy-from-help"));
    expect(await screen.findByText("Consulta da plataforma anterior")).toBeInTheDocument(); // tour realmente em andamento

    // perde is_master no meio do tour (ex.: revogado por outro admin) —
    // busca de novo no servidor a cada navegação, nunca confia num valor
    // antigo já guardado no cliente.
    api.getCurrentUser.mockResolvedValue({ id: "u1", account_type: "admin", admin_profile: { is_active: true, is_master: false, permissions: [] } });
    await user.click(screen.getByText("revalidate-route"));

    await waitFor(() => expect(screen.queryByText("Consulta da plataforma anterior")).not.toBeInTheDocument());
  });
});

describe("OnboardingProvider — oferta contextual por rota (bloco 2/3)", () => {
  it("oferece um tour de módulo quando a rota bate, mesmo sem ser o primeiro acesso (progresso do piloto já concluído)", async () => {
    api.getCurrentUser.mockResolvedValue({ id: "u1", account_type: "admin", admin_profile: { is_active: true, is_master: true, permissions: [] } });
    api.listTourProgress.mockResolvedValue({
      data: [{ id: "p1", user_id: "u1", tour_key: "primeiros-passos", version: 1, status: "concluido", last_step_key: "help-button", started_at: "x", completed_at: "x", dismissed_at: null, postponed_at: null, postponed_until: null, created_at: "x", updated_at: "x" }],
    });
    renderProvider(["/admin/legacy"]);
    expect(await screen.findByText("Quer conhecer este recurso?", {}, { timeout: 3000 })).toBeInTheDocument();
  });

  it("nunca oferece duas coisas ao mesmo tempo: com o tour piloto ainda pendente, a oferta contextual não aparece junto", async () => {
    api.getCurrentUser.mockResolvedValue({ id: "u1", account_type: "admin", admin_profile: { is_active: true, is_master: true, permissions: [] } });
    renderProvider(["/admin/legacy"]);
    // primeiro acesso tem prioridade — só a janela de boas-vindas do piloto aparece
    expect(await screen.findByText("Conheça a plataforma Allka")).toBeInTheDocument();
    expect(screen.queryByText("Quer conhecer este recurso?")).not.toBeInTheDocument();
  });
});
