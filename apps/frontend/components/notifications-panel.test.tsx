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

vi.mock("@/contexts/chat-context", () => ({
  useChat: () => ({ openChat: vi.fn(), openRoom: vi.fn(), rooms: [], totalUnread: 0 }),
}));

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
    getNotificationGroupsList: vi.fn().mockResolvedValue({ data: [], role: "other" }),
    getNotificationGroupEligibleMembers: vi.fn().mockResolvedValue({ data: [], total: 0, page: 1, page_size: 10 }),
    getNotificationGroup: vi.fn(),
    requestNotificationGroup: vi.fn(),
    cancelNotificationGroupRequest: vi.fn(),
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

// Bloco 3/5 (ata 2026-08) — Grupos de Notificação com ciclo de aprovação.
describe("NotificationsPanel — Grupos (ciclo de aprovação)", () => {
  it("2. Líder vê 'Solicitar grupo' e a lista com o status de cada um", async () => {
    (apiClient.getNotificationGroupsList as any).mockResolvedValue({
      role: "leader",
      data: [
        { id: "g1", name: "Grupo pendente", status: "pending", member_count: 2, created_at: new Date().toISOString(), purpose: "acompanhar" },
        { id: "g2", name: "Grupo rejeitado", status: "rejected", rejection_reason: "escopo amplo", member_count: 1, created_at: new Date().toISOString() },
      ],
    });
    renderPanel({ initialTab: "groups" });
    expect(await screen.findByText("Grupo pendente")).toBeInTheDocument();
    expect(screen.getByText(/aguardando aprovação/i)).toBeInTheDocument();
    expect(screen.getByText(/motivo da rejeição: escopo amplo/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /solicitar grupo/i })).toBeInTheDocument();
  });

  it("8. abrir 'Solicitar grupo' exige finalidade e chama requestNotificationGroup", async () => {
    (apiClient.getNotificationGroupsList as any).mockResolvedValue({ role: "leader", data: [] });
    (apiClient.getNotificationGroupEligibleMembers as any).mockResolvedValue({
      data: [{ id: "u1", name: "Fulano", email: "f@x.test", account_type: "empresas", is_active: true }],
      total: 1,
      page: 1,
      page_size: 10,
    });
    (apiClient.requestNotificationGroup as any).mockResolvedValue({ id: "g9", status: "pending" });
    const user = userEvent.setup();
    renderPanel({ initialTab: "groups" });

    const btns = await screen.findAllByRole("button", { name: /solicitar grupo/i });
    await user.click(btns[0]);
    const dialog = await screen.findByRole("dialog");
    await within(dialog).findByText("Fulano");
    await user.type(within(dialog).getAllByRole("textbox")[0], "Time X");
    await user.type(within(dialog).getByPlaceholderText(/por que este grupo/i), "acompanhar entregas");
    await user.click(within(dialog).getByText("Fulano"));
    await user.click(within(dialog).getByRole("button", { name: /enviar solicitação/i }));

    await waitFor(() =>
      expect(apiClient.requestNotificationGroup).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Time X", purpose: "acompanhar entregas", member_user_ids: ["u1"] }),
      ),
    );
  });

  it("Admin Master vê o atalho para a central de grupos, não o CRUD", async () => {
    (apiClient.getNotificationGroupsList as any).mockResolvedValue({
      role: "master",
      data: [{ id: "g1", name: "x", status: "pending", member_count: 1, created_at: new Date().toISOString() }],
    });
    renderPanel({ initialTab: "groups" });
    expect(await screen.findByRole("button", { name: /central de grupos de notificação/i })).toBeInTheDocument();
    expect(screen.getByText(/1 solicitação/i)).toBeInTheDocument();
  });
});

// Bloco 2/5 (ata 2026-08) — filtros/paginação server-side + preferências
// travadas por governança do Admin Master.
describe("NotificationsPanel — filtros e governança", () => {
  it("31. busca e datas vão pro servidor (category=notificacao sempre)", async () => {
    const user = userEvent.setup();
    renderPanel();
    await screen.findByRole("heading", { name: "Notificações" });
    await user.type(await screen.findByRole("searchbox", { name: /buscar notificações/i }), "fatura");
    await waitFor(() =>
      expect(apiClient.getSystemAlerts).toHaveBeenLastCalledWith(
        expect.objectContaining({ category: "notificacao", q: "fatura" }),
      ),
    );
  });

  it("35. paginação server-side aparece quando há mais de uma página", async () => {
    (apiClient.getSystemAlerts as any).mockResolvedValue({
      data: [{ id: "n1", type: "welcome", title: "Bem-vindo", message: "m", is_read: false, created_at: new Date().toISOString() }],
      total: 30,
      total_pages: 3,
    });
    renderPanel();
    expect(await screen.findByText(/página 1 de 3/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /próxima/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /anterior/i })).toBeDisabled();
  });

  it("32/7. preferência governada mostra o motivo e trava o canal não permitido", async () => {
    (apiClient.getNotificationPreferences as any).mockResolvedValue({
      data: [],
      governance: {
        "task-due": {
          standard_name: "Tarefa atrasada",
          mandatory: true,
          personal_prefs_allowed: true,
          locked_channels: ["in_app"],
          toggleable_channels: ["email"],
          min_severity: "error",
          reason: "Definido como obrigatório pelo Admin Master.",
        },
      },
    });
    renderPanel({ initialTab: "prefs" });
    expect(await screen.findAllByText(/Definido como obrigatório pelo Admin Master\./)).not.toHaveLength(0);
    // A linha do evento governado ("Prazo se aproximando") tem o WhatsApp travado (só email é liberado).
    const row = (await screen.findByText("Prazo se aproximando")).closest("div.flex.items-center.justify-between") as HTMLElement;
    const switches = within(row).getAllByRole("switch");
    // 3 canais: email (liberado), whatsapp e push travados → pelo menos um disabled.
    expect(switches.some((s) => s.getAttribute("disabled") !== null || s.getAttribute("data-disabled") !== null || s.getAttribute("aria-disabled") === "true")).toBe(true);
  });
});
