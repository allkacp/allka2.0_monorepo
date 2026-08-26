import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { AccountTypeProvider } from "@/contexts/account-type-context";
import { OpenScreensProvider } from "@/contexts/open-screens-context";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { AlertsPanel } from "@/components/alerts-panel";

// Lote de correção visual (ata 2026-08, revisão do responsável) — AlertsPanel
// é o painel EXCLUSIVO de alertas, extraído do painel combinado anterior
// (notification-preferences-panel.tsx, removido). Sem nenhuma aba/estado de
// Notificações aqui — ver notifications-panel.test.tsx pro painel irmão.
// Cobre também a correção de cor pedida pelo responsável: Amarelo precisa
// ser amarelo de verdade (yellow-*), nunca laranja/âmbar (orange-*/amber-*).

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    getSystemAlerts: vi.fn(),
    markSystemAlertRead: vi.fn(),
    archiveSystemAlert: vi.fn(),
    unarchiveSystemAlert: vi.fn(),
    markAllSystemAlertsRead: vi.fn(),
    getAgencyAlerts: vi.fn(),
    // Default: não-Master, pra não expor a área "Gerenciar" nos testes do
    // feed comum — os testes da central administrativa ficam em
    // alerts-admin-center.test.tsx, com o mock ajustado pra is_master true.
    getCurrentUser: vi.fn().mockResolvedValue({ admin_profile: null }),
    getAdminSystemAlerts: vi.fn().mockResolvedValue({ data: [], total: 0 }),
  },
}));

import { apiClient } from "@/lib/api-client";

function Providers({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter initialEntries={["/admin/dashboard"]}>
      <AccountTypeProvider>
        <SidebarProvider>
          <OpenScreensProvider>{children}</OpenScreensProvider>
        </SidebarProvider>
      </AccountTypeProvider>
    </MemoryRouter>
  );
}

function renderPanel(props: Partial<React.ComponentProps<typeof AlertsPanel>> = {}) {
  return render(
    <Providers>
      <AlertsPanel open onClose={() => {}} {...props} />
    </Providers>,
  );
}

function alertaRow(overrides: Partial<{ id: string; severity: "info" | "warning" | "error"; title: string }> = {}) {
  return {
    id: overrides.id ?? "al1",
    type: "tarefa_atrasada",
    title: overrides.title ?? "Alerta de teste",
    message: "Detalhe do alerta",
    severity: overrides.severity ?? "warning",
    entity_type: null,
    entity_id: null,
    is_read: false,
    created_at: new Date().toISOString(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  (apiClient.getSystemAlerts as any).mockResolvedValue({ data: [] });
  (apiClient.getAgencyAlerts as any).mockResolvedValue({ data: [] });
});

describe("AlertsPanel — título e escopo exclusivo", () => {
  it("19. título acessível próprio ('Alertas')", async () => {
    renderPanel();
    expect(await screen.findByRole("heading", { name: "Alertas" })).toBeInTheDocument();
  });

  it("9. não existe nenhuma aba/rótulo 'Notificações' dentro deste painel", async () => {
    (apiClient.getSystemAlerts as any).mockResolvedValue({ data: [alertaRow()] });
    renderPanel();
    await screen.findByText("Alerta de teste");
    expect(screen.queryByRole("tab", { name: /notificações/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Tipos de notificação")).not.toBeInTheDocument();
  });

  it("fetches alerts filtered by category=alerta, never notificacao", async () => {
    renderPanel();
    await waitFor(() => expect(apiClient.getSystemAlerts).toHaveBeenCalledWith(expect.objectContaining({ category: "alerta" })));
    expect(apiClient.getSystemAlerts).not.toHaveBeenCalledWith(expect.objectContaining({ category: "notificacao" }));
  });
});

describe("AlertsPanel — criticidade: Verde/Amarelo/Vermelho verdadeiros (não laranja)", () => {
  it("14. alerta verde usa token verde (emerald) e texto 'Verde'", async () => {
    (apiClient.getSystemAlerts as any).mockResolvedValue({ data: [alertaRow({ severity: "info" })] });
    renderPanel();

    const badge = await screen.findByLabelText(/Criticidade: Verde/);
    expect(badge.className).toMatch(/emerald/);
    expect(badge.textContent).toContain("Verde");
  });

  it("15/16. alerta amarelo usa token amarelo (yellow) e texto 'Amarelo' — NUNCA classe orange/amber", async () => {
    (apiClient.getSystemAlerts as any).mockResolvedValue({ data: [alertaRow({ severity: "warning" })] });
    renderPanel();

    const badge = await screen.findByLabelText(/Criticidade: Amarelo/);
    expect(badge.className).toMatch(/yellow/);
    expect(badge.className).not.toMatch(/orange/);
    expect(badge.className).not.toMatch(/amber/);
    expect(badge.textContent).toContain("Amarelo");

    // A faixa lateral do card também precisa ser yellow, não amber/orange.
    const card = badge.closest("div.border-l-4") as HTMLElement;
    expect(card.className).toMatch(/border-l-yellow/);
    expect(card.className).not.toMatch(/border-l-amber/);
    expect(card.className).not.toMatch(/border-l-orange/);
  });

  it("17. alerta vermelho usa token vermelho (red) e texto 'Vermelho'", async () => {
    (apiClient.getSystemAlerts as any).mockResolvedValue({ data: [alertaRow({ severity: "error" })] });
    renderPanel();

    const badge = await screen.findByLabelText(/Criticidade: Vermelho/);
    expect(badge.className).toMatch(/red/);
    expect(badge.textContent).toContain("Vermelho");
  });

  it("18. acessibilidade não depende só da cor — cada badge tem texto e ícone (svg) próprios", async () => {
    (apiClient.getSystemAlerts as any).mockResolvedValue({ data: [alertaRow({ severity: "warning" })] });
    renderPanel();

    const badge = await screen.findByLabelText(/Criticidade: Amarelo/);
    expect(badge.querySelector("svg")).toBeTruthy();
    expect(badge.getAttribute("aria-label")).toContain("Amarelo");
  });

  it("22. filtro por criticidade esconde as outras cores", async () => {
    (apiClient.getSystemAlerts as any).mockResolvedValue({
      data: [
        alertaRow({ id: "a-verde", severity: "info", title: "Alerta Verde Teste" }),
        alertaRow({ id: "a-vermelho", severity: "error", title: "Alerta Vermelho Teste" }),
      ],
    });
    const user = userEvent.setup();
    renderPanel();

    await screen.findByText("Alerta Verde Teste");
    await screen.findByText("Alerta Vermelho Teste");

    await user.click(screen.getByRole("button", { name: "Vermelho" }));
    expect(screen.queryByText("Alerta Verde Teste")).not.toBeInTheDocument();
    expect(await screen.findByText("Alerta Vermelho Teste")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Todos" }));
    expect(await screen.findByText("Alerta Verde Teste")).toBeInTheDocument();
  });
});

describe("AlertsPanel — estados e ações independentes de Notificações", () => {
  it("24. estado vazio próprio ('Nenhum alerta ativo no momento')", async () => {
    renderPanel();
    expect(await screen.findByText("Nenhum alerta ativo no momento.")).toBeInTheDocument();
  });

  it("estado de erro próprio quando a busca falha", async () => {
    (apiClient.getSystemAlerts as any).mockRejectedValue(new Error("falhou"));
    renderPanel();
    expect(await screen.findByText("Não foi possível carregar os alertas agora.")).toBeInTheDocument();
  });

  it("22. marcar/arquivar um alerta chama só rotas de alerta (nunca uma rota de notificação, que nem existe aqui)", async () => {
    (apiClient.getSystemAlerts as any).mockResolvedValue({ data: [alertaRow({ id: "al-x" })] });
    const user = userEvent.setup();
    renderPanel();

    await screen.findByText("Alerta de teste");
    await user.click(screen.getByTitle("Marcar como lido"));
    await waitFor(() => expect(apiClient.markSystemAlertRead).toHaveBeenCalledWith("al-x"));
  });
});

// Lote "Central de Alertas" (ata 2026-08) — a área "Gerenciar" só pode
// aparecer pra Admin Master de verdade, nunca por manipulação de estado
// (ex.: forçar a aba via devtools) — o backend é sempre a autoridade final,
// mas a UI também não deve nem oferecer o botão pra quem não tem acesso.
describe("AlertsPanel — 'Gerenciar' é exclusivo de Admin Master", () => {
  it("24. Admin Master vê a aba 'Gerenciar'", async () => {
    (apiClient.getCurrentUser as any).mockResolvedValue({
      admin_profile: { is_active: true, is_master: true, permissions: [] },
    });
    renderPanel();
    expect(await screen.findByRole("tab", { name: "Gerenciar" })).toBeInTheDocument();
  });

  it("25. usuário comum (sem perfil admin) NÃO vê a aba 'Gerenciar'", async () => {
    (apiClient.getCurrentUser as any).mockResolvedValue({ admin_profile: null });
    renderPanel();
    await screen.findByText("Nenhum alerta ativo no momento.");
    expect(screen.queryByRole("tab", { name: "Gerenciar" })).not.toBeInTheDocument();
  });

  it("admin com perfil ativo mas is_master=false NÃO vê a aba 'Gerenciar'", async () => {
    (apiClient.getCurrentUser as any).mockResolvedValue({
      admin_profile: { is_active: true, is_master: false, permissions: [{ module: "alertas", action: "create" }] },
    });
    renderPanel();
    await screen.findByText("Nenhum alerta ativo no momento.");
    expect(screen.queryByRole("tab", { name: "Gerenciar" })).not.toBeInTheDocument();
  });

  it("26. mesmo se a aba não existe na tela, o painel nunca renderiza a central administrativa sem isMaster confirmado (não há como 'forçar' via clique num elemento que não existe)", async () => {
    (apiClient.getCurrentUser as any).mockResolvedValue({ admin_profile: null });
    renderPanel();
    await screen.findByText("Nenhum alerta ativo no momento.");
    // getAdminSystemAlerts (usado só pela central) nunca é chamado quando
    // não há tab/botão algum pra abri-la.
    expect(apiClient.getAdminSystemAlerts).not.toHaveBeenCalled();
  });

  it("Admin Master consegue trocar para 'Gerenciar' e ver a central (getAdminSystemAlerts é chamado só então)", async () => {
    (apiClient.getCurrentUser as any).mockResolvedValue({
      admin_profile: { is_active: true, is_master: true, permissions: [] },
    });
    const user = userEvent.setup();
    renderPanel();

    const manageTab = await screen.findByRole("tab", { name: "Gerenciar" });
    expect(apiClient.getAdminSystemAlerts).not.toHaveBeenCalled();
    await user.click(manageTab);
    await waitFor(() => expect(apiClient.getAdminSystemAlerts).toHaveBeenCalled());
  });
});
