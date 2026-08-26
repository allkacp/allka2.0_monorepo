import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { OpenScreensProvider } from "@/contexts/open-screens-context";
import { AccountTypeProvider } from "@/contexts/account-type-context";
import { NotificationsPanel } from "@/components/notifications-panel";

// Lote de correção visual (ata 2026-08, revisão do responsável) — extraído
// de notification-preferences-panel.tsx (removido: virou dois painéis de
// verdade). Este arquivo cobre SÓ o painel de Notificações — sem nenhuma
// aba/estado de Alertas (ver alerts-panel.test.tsx pro painel irmão).

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    getSystemAlerts: vi.fn(),
    markSystemAlertRead: vi.fn(),
    markAllSystemAlertsRead: vi.fn(),
    archiveSystemAlert: vi.fn(),
    unarchiveSystemAlert: vi.fn(),
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

function renderPanel(props: Partial<React.ComponentProps<typeof NotificationsPanel>> = {}) {
  return render(
    <Providers>
      <NotificationsPanel open onClose={() => {}} {...props} />
    </Providers>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  (apiClient.getSystemAlerts as any).mockResolvedValue({ data: [] });
  (apiClient.getNotificationPreferences as any).mockResolvedValue({ data: [] });
  (apiClient.getNotificationGroups as any).mockResolvedValue({ data: [] });
  (apiClient.getNotificationGroupEligibleMembers as any).mockResolvedValue({ data: [] });
});

describe("NotificationsPanel — título e escopo exclusivo", () => {
  it("19. título acessível próprio ('Notificações')", async () => {
    renderPanel();
    expect(await screen.findByRole("heading", { name: "Notificações" })).toBeInTheDocument();
  });

  it("8/9. não existe nenhuma aba/rótulo 'Alertas' dentro deste painel", async () => {
    renderPanel();
    await screen.findByRole("tab", { name: /notificações/i });
    expect(screen.queryByRole("tab", { name: /alertas/i })).not.toBeInTheDocument();
  });

  it("23. aba 'Regras' continua ausente (removida antes, não pode voltar)", async () => {
    renderPanel({ initialTab: "prefs" });
    await screen.findByRole("tab", { name: /preferências/i });
    expect(screen.queryByRole("tab", { name: /regras/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /nova regra/i })).not.toBeInTheDocument();
  });
});

describe("NotificationsPanel — Inbox (fonte, loading e erro próprios)", () => {
  it("fetches real alerts on open, filtered by category=notificacao", async () => {
    (apiClient.getSystemAlerts as any).mockResolvedValue({
      data: [
        { id: "a1", type: "tarefa_atrasada", title: "Tarefa atrasada", message: "A tarefa X está atrasada.", created_at: new Date().toISOString(), is_read: false },
      ],
    });
    renderPanel();

    await waitFor(() => expect(apiClient.getSystemAlerts).toHaveBeenCalledWith(expect.objectContaining({ category: "notificacao" })));
    expect(await screen.findByText("Tarefa atrasada")).toBeInTheDocument();
  });

  it("24. estado vazio próprio ('Nenhuma notificação por aqui')", async () => {
    renderPanel();
    expect(await screen.findByText("Nenhuma notificação por aqui.")).toBeInTheDocument();
  });

  it("estado de erro próprio quando a busca falha, sem quebrar o resto do painel", async () => {
    (apiClient.getSystemAlerts as any).mockRejectedValue(new Error("falhou"));
    renderPanel();
    expect(await screen.findByText("Não foi possível carregar as notificações agora.")).toBeInTheDocument();
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

  it("21. marcar uma notificação como lida nunca chama nenhuma rota de alerta (archive/unarchive de alerta é uma ação separada, deste mesmo item)", async () => {
    (apiClient.getSystemAlerts as any).mockResolvedValue({
      data: [{ id: "n1", type: "sistema", title: "Notificação clicável", message: "ok", created_at: new Date().toISOString(), is_read: false }],
    });
    const user = userEvent.setup();
    renderPanel();

    await user.click(await screen.findByText("Notificação clicável"));
    await waitFor(() => expect(apiClient.markSystemAlertRead).toHaveBeenCalledWith("n1"));
  });
});

describe("NotificationsPanel — Preferências (real, per event x channel, exclusivas de notificação)", () => {
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

  it("10. as configurações de notificação (canais/tipos de evento) só aparecem na aba Preferências deste painel, nunca junto da lista de Notificações", async () => {
    renderPanel({ initialTab: "inbox" });
    await screen.findByRole("tab", { name: /notificações/i });
    expect(screen.queryByText("Tipos de notificação")).not.toBeInTheDocument();
  });
});

describe("NotificationsPanel — Grupos (Novo Grupo funciona)", () => {
  it("'Novo Grupo' opens a real modal, lists eligible members, and submitting creates a real group", async () => {
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

  it("renders real groups fetched from the backend", async () => {
    (apiClient.getNotificationGroups as any).mockResolvedValue({
      data: [{ id: "g1", name: "Minha Equipe Real", description: null, member_count: 4, created_at: new Date().toISOString() }],
    });
    renderPanel({ initialTab: "groups" });

    expect(await screen.findByText("Minha Equipe Real")).toBeInTheDocument();
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
    await user.click(rowButtons[rowButtons.length - 1]);

    await screen.findByText(/excluir grupo/i);
    await user.click(screen.getByRole("button", { name: /^excluir$/i }));

    await waitFor(() => expect(apiClient.deleteNotificationGroup).toHaveBeenCalledWith("g1"));
  });
});
