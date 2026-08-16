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

describe("NotificationPreferencesPanel — Regras (Nova Regra agora funciona)", () => {
  it("'Nova Regra' opens a real modal and submitting it saves a preference — the button used to have no onClick at all", async () => {
    const user = userEvent.setup();
    renderPanel({ initialTab: "rules" });

    await user.click(screen.getByRole("tab", { name: /regras/i }));
    await user.click(screen.getByRole("button", { name: /nova regra/i }));

    const dialog = await screen.findByRole("dialog");
    await user.selectOptions(within(dialog).getByRole("combobox"), "task-approved");

    const whatsappSwitch = within(dialog).getAllByRole("switch")[1]; // in_app row has no switch; order: email, whatsapp, push
    await user.click(whatsappSwitch);
    await user.click(within(dialog).getByRole("button", { name: /salvar regra/i }));

    await waitFor(() =>
      expect(apiClient.updateNotificationPreference).toHaveBeenCalledWith(
        "task-approved",
        expect.objectContaining({ whatsapp: true }),
      ),
    );
  });

  it("shows an active rule card for any event with a non-in_app channel already enabled", async () => {
    (apiClient.getNotificationPreferences as any).mockResolvedValue({
      data: [{ event_type: "task-returned", channel: "whatsapp", enabled: true }],
    });
    renderPanel({ initialTab: "rules" });

    await screen.findByText("Tarefa devolvida");
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
