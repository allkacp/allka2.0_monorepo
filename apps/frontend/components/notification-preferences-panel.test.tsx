import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { OpenScreensProvider } from "@/contexts/open-screens-context";
import { AccountTypeProvider } from "@/contexts/account-type-context";
import { NotificationPreferencesPanel } from "@/components/notification-preferences-panel";

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    getSystemAlerts: vi.fn(),
    markSystemAlertRead: vi.fn(),
    markAllSystemAlertsRead: vi.fn(),
    archiveSystemAlert: vi.fn(),
    unarchiveSystemAlert: vi.fn(),
    getAgencyAlerts: vi.fn(),
    getUnreadSystemAlertsCount: vi.fn(),
    getNotificationPreferences: vi.fn(),
    updateNotificationPreference: vi.fn(),
    getNotificationGroups: vi.fn(),
    getNotificationGroupEligibleMembers: vi.fn(),
    getNotificationGroup: vi.fn(),
    createNotificationGroup: vi.fn(),
    updateNotificationGroup: vi.fn(),
    deleteNotificationGroup: vi.fn(),
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

function renderPanel(props: Partial<React.ComponentProps<typeof NotificationPreferencesPanel>> = {}) {
  return render(
    <Providers>
      <NotificationPreferencesPanel open onClose={() => {}} {...props} />
    </Providers>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  (apiClient.getSystemAlerts as any).mockResolvedValue({ data: [] });
  (apiClient.getUnreadSystemAlertsCount as any).mockResolvedValue({ count: 0 });
  (apiClient.getAgencyAlerts as any).mockResolvedValue({ data: [] });
  (apiClient.getNotificationPreferences as any).mockResolvedValue({ data: [] });
  (apiClient.getNotificationGroups as any).mockResolvedValue({ data: [] });
  (apiClient.getNotificationGroupEligibleMembers as any).mockResolvedValue({ data: [] });
});

describe("NotificationPreferencesPanel — Inbox (real data, not mock)", () => {
  it("fetches real alerts on open instead of rendering hardcoded mock notifications", async () => {
    (apiClient.getSystemAlerts as any).mockResolvedValue({
      data: [
        { id: "a1", type: "tarefa_atrasada", title: "Tarefa atrasada", message: "A tarefa X está atrasada.", created_at: new Date().toISOString(), is_read: false },
      ],
    });
    renderPanel();

    await waitFor(() => expect(apiClient.getSystemAlerts).toHaveBeenCalled());
    expect(await screen.findByText("Tarefa atrasada")).toBeInTheDocument();
    // The old mock data must never appear.
    expect(screen.queryByText("Adicionar exportação em PDF")).not.toBeInTheDocument();
  });

  it("clicking the archive button on a row calls archiveSystemAlert and removes it from the active view", async () => {
    (apiClient.getSystemAlerts as any).mockResolvedValue({
      data: [{ id: "a1", type: "sistema", title: "Alerta de teste", message: "Detalhe", created_at: new Date().toISOString(), is_read: false }],
    });
    const user = userEvent.setup();
    renderPanel();

    await screen.findByText("Alerta de teste");
    await user.click(screen.getByTitle("Arquivar"));

    await waitFor(() => expect(apiClient.archiveSystemAlert).toHaveBeenCalledWith("a1"));
    expect(screen.queryByText("Alerta de teste")).not.toBeInTheDocument();
  });

  it("switching to 'Arquivados' re-fetches with is_archived=true", async () => {
    const user = userEvent.setup();
    renderPanel();
    await waitFor(() => expect(apiClient.getSystemAlerts).toHaveBeenCalledWith(expect.objectContaining({ is_archived: "false" })));

    await user.click(screen.getByText("Arquivados"));
    await waitFor(() => expect(apiClient.getSystemAlerts).toHaveBeenCalledWith(expect.objectContaining({ is_archived: "true" })));
  });
});

// Lote "separar alertas de notificações" (ata 2026-08) — a aba Alertas
// nunca tinha teste dedicado (gap confirmado em auditoria). Cobre a
// criticidade verde/amarelo/vermelho (derivada de `severity`, sem coluna
// nova), o filtro por criticidade, e o isolamento de erro/estado entre as
// duas abas.
describe("NotificationPreferencesPanel — Alertas (criticidade verde/amarelo/vermelho)", () => {
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

  it("19. alerta com severity 'info' mostra criticidade Verde (texto + ícone + cor), não só cor", async () => {
    (apiClient.getSystemAlerts as any).mockResolvedValue({ data: [alertaRow({ severity: "info" })] });
    renderPanel({ initialTab: "alertas" });

    await screen.findByText("Alerta de teste");
    // aria-label distingue do botão de filtro "Verde", que também tem esse texto.
    const badge = await screen.findByLabelText(/Criticidade: Verde/);
    expect(badge.textContent).toContain("Verde");
    // Texto explícito visível (não só cor) — e o ícone acompanha (svg irmão).
    expect(badge.querySelector("svg")).toBeTruthy();
  });

  it("20. alerta com severity 'warning' mostra criticidade Amarelo", async () => {
    (apiClient.getSystemAlerts as any).mockResolvedValue({ data: [alertaRow({ severity: "warning" })] });
    renderPanel({ initialTab: "alertas" });

    await screen.findByText("Alerta de teste");
    expect(await screen.findByLabelText(/Criticidade: Amarelo/)).toBeInTheDocument();
  });

  it("21. alerta com severity 'error' mostra criticidade Vermelho", async () => {
    (apiClient.getSystemAlerts as any).mockResolvedValue({ data: [alertaRow({ severity: "error" })] });
    renderPanel({ initialTab: "alertas" });

    await screen.findByText("Alerta de teste");
    expect(await screen.findByLabelText(/Criticidade: Vermelho/)).toBeInTheDocument();
  });

  it("22. filtro por criticidade esconde alertas de outras cores", async () => {
    (apiClient.getSystemAlerts as any).mockResolvedValue({
      data: [
        alertaRow({ id: "a-verde", severity: "info", title: "Alerta Verde Teste" }),
        alertaRow({ id: "a-vermelho", severity: "error", title: "Alerta Vermelho Teste" }),
      ],
    });
    const user = userEvent.setup();
    renderPanel({ initialTab: "alertas" });

    await screen.findByText("Alerta Verde Teste");
    await screen.findByText("Alerta Vermelho Teste");

    await user.click(screen.getByRole("button", { name: "Vermelho" }));

    expect(screen.queryByText("Alerta Verde Teste")).not.toBeInTheDocument();
    expect(await screen.findByText("Alerta Vermelho Teste")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Todos" }));
    expect(await screen.findByText("Alerta Verde Teste")).toBeInTheDocument();
  });

  it("18. notificações comuns (aba Inbox) não recebem badge de criticidade", async () => {
    (apiClient.getSystemAlerts as any).mockResolvedValue({
      data: [{ id: "n1", type: "sistema", title: "Notificação comum", message: "Sem urgência", created_at: new Date().toISOString(), is_read: false }],
    });
    renderPanel({ initialTab: "inbox" });

    await screen.findByText("Notificação comum");
    expect(screen.queryByText("Verde")).not.toBeInTheDocument();
    expect(screen.queryByText("Amarelo")).not.toBeInTheDocument();
    expect(screen.queryByText("Vermelho")).not.toBeInTheDocument();
  });

  it("23. estado vazio de alertas é uma mensagem própria, distinta da de notificações", async () => {
    (apiClient.getSystemAlerts as any).mockResolvedValue({ data: [] });
    renderPanel({ initialTab: "alertas" });

    expect(await screen.findByText("Nenhum alerta ativo no momento.")).toBeInTheDocument();
  });

  it("26. erro ao buscar alertas não derruba a aba de notificações", async () => {
    (apiClient.getSystemAlerts as any).mockImplementation((filters: any) => {
      if (filters?.category === "alerta") return Promise.reject(new Error("falhou"));
      return Promise.resolve({
        data: [{ id: "n1", type: "sistema", title: "Notificação ainda funciona", message: "ok", created_at: new Date().toISOString(), is_read: false }],
      });
    });
    renderPanel({ initialTab: "inbox" });

    expect(await screen.findByText("Notificação ainda funciona")).toBeInTheDocument();
  });

  it("27. erro ao buscar notificações não derruba a aba de alertas", async () => {
    (apiClient.getSystemAlerts as any).mockImplementation((filters: any) => {
      if (filters?.category === "notificacao") return Promise.reject(new Error("falhou"));
      return Promise.resolve({ data: [alertaRow({ title: "Alerta ainda funciona" })] });
    });
    renderPanel({ initialTab: "alertas" });

    expect(await screen.findByText("Alerta ainda funciona")).toBeInTheDocument();
  });

  it("marcar uma notificação como lida não chama nenhuma operação de alerta", async () => {
    (apiClient.getSystemAlerts as any).mockImplementation((filters: any) =>
      Promise.resolve({
        data:
          filters?.category === "alerta"
            ? [alertaRow({ id: "al-x" })]
            : [{ id: "n1", type: "sistema", title: "Notificação clicável", message: "ok", created_at: new Date().toISOString(), is_read: false }],
      }),
    );
    const user = userEvent.setup();
    renderPanel({ initialTab: "inbox" });

    await user.click(await screen.findByText("Notificação clicável"));

    await waitFor(() => expect(apiClient.markSystemAlertRead).toHaveBeenCalledWith("n1"));
    expect(apiClient.markSystemAlertRead).not.toHaveBeenCalledWith("al-x");
  });
});

describe("NotificationPreferencesPanel — Preferências (real, per event x channel)", () => {
  it("toggling a non-in_app channel switch calls updateNotificationPreference with that event and channel", async () => {
    const user = userEvent.setup();
    renderPanel({ initialTab: "prefs" });

    await user.click(screen.getByRole("tab", { name: /preferências/i }));
    const row = (await screen.findByText("Tarefa atribuída")).closest("div.flex.items-center.justify-between") as HTMLElement;
    const emailSwitch = within(row).getAllByRole("switch")[0];
    await user.click(emailSwitch);

    await waitFor(() =>
      expect(apiClient.updateNotificationPreference).toHaveBeenCalledWith("task-assigned", { email: true }),
    );
  });

  it("reflects a preference already saved on the backend as checked", async () => {
    (apiClient.getNotificationPreferences as any).mockResolvedValue({
      data: [{ event_type: "task-assigned", channel: "email", enabled: true }],
    });
    renderPanel({ initialTab: "prefs" });

    const row = (await screen.findByText("Tarefa atribuída")).closest("div.flex.items-center.justify-between") as HTMLElement;
    await waitFor(() => expect(within(row).getAllByRole("switch")[0]).toBeChecked());
  });
});

// Lote de remoção da aba "Regras" (redundante com "Preferências" — mesma
// tabela NotificationPreference, sem função exclusiva: confirmado por
// auditoria de código antes da remoção).
describe("NotificationPreferencesPanel — aba 'Regras' removida", () => {
  it("não existe mais nenhuma aba nem botão 'Regras' ou 'Nova Regra'", async () => {
    renderPanel({ initialTab: "prefs" });

    await screen.findByRole("tab", { name: /preferências/i });
    expect(screen.queryByRole("tab", { name: /regras/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /nova regra/i })).not.toBeInTheDocument();
  });

  it("um estado/link antigo com initialTab=\"rules\" abre 'Preferências' em vez de ficar em branco", async () => {
    renderPanel({ initialTab: "rules" });

    // Preferências é a aba que fica ativa: seu conteúdo real aparece, sem
    // precisar clicar em nada — prova que a tela não ficou em branco.
    expect(await screen.findByText("Tarefas")).toBeInTheDocument();
    const prefsTab = await screen.findByRole("tab", { name: /preferências/i });
    expect(prefsTab).toHaveAttribute("data-state", "active");
  });
});

describe("NotificationPreferencesPanel — Grupos (Novo Grupo agora funciona)", () => {
  it("'Novo Grupo' opens a real modal, lists eligible members, and submitting creates a real group — the button used to have no onClick at all", async () => {
    (apiClient.getNotificationGroupEligibleMembers as any).mockResolvedValue({
      data: [{ id: "u1", name: "Fulano", email: "fulano@example.com" }],
    });
    const user = userEvent.setup();
    renderPanel({ initialTab: "groups" });

    await user.click(screen.getByRole("tab", { name: /grupos/i }));
    await user.click(screen.getByRole("button", { name: /novo grupo/i }));

    const dialog = await screen.findByRole("dialog");
    await within(dialog).findByText("Fulano");
    await user.type(within(dialog).getByPlaceholderText(/líderes de projeto/i), "Time X");
    await user.click(within(dialog).getByText("Fulano"));
    await user.click(within(dialog).getByRole("button", { name: /salvar grupo/i }));

    await waitFor(() =>
      expect(apiClient.createNotificationGroup).toHaveBeenCalledWith({
        name: "Time X",
        description: "",
        member_user_ids: ["u1"],
      }),
    );
  });

  it("renders real groups fetched from the backend, not the old hardcoded mock groups", async () => {
    (apiClient.getNotificationGroups as any).mockResolvedValue({
      data: [{ id: "g1", name: "Minha Equipe Real", description: null, member_count: 4, created_at: new Date().toISOString() }],
    });
    renderPanel({ initialTab: "groups" });

    expect(await screen.findByText("Minha Equipe Real")).toBeInTheDocument();
    expect(screen.queryByText("Líderes de Projeto")).not.toBeInTheDocument();
  });

  it("deleting a group asks for confirmation, then calls deleteNotificationGroup", async () => {
    (apiClient.getNotificationGroups as any).mockResolvedValue({
      data: [{ id: "g1", name: "Equipe a Remover", description: null, member_count: 1, created_at: new Date().toISOString() }],
    });
    const user = userEvent.setup();
    renderPanel({ initialTab: "groups" });

    await screen.findByText("Equipe a Remover");
    const row = screen.getByText("Equipe a Remover").closest("div.flex.items-center.gap-4") as HTMLElement;
    const rowButtons = within(row).getAllByRole("button");
    await user.click(rowButtons[rowButtons.length - 1]); // trash icon is the last button in the row

    await screen.findByText(/excluir grupo/i);
    await user.click(screen.getByRole("button", { name: /^excluir$/i }));

    await waitFor(() => expect(apiClient.deleteNotificationGroup).toHaveBeenCalledWith("g1"));
  });
});
