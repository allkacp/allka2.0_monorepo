import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { AlertSchedulesTab, type AlertSchedule } from "@/components/alert-schedules-tab";

// Aba "Programados" (ata 2026-08, 4º lote) — testada isolada, mockando
// apiClient (mesmo padrão de alert-standards-tab / project-admin-responsible
// -section). Cobre: listagem, ativar/desativar, arquivar com confirmação.

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    getAdminAlertSchedules: vi.fn(),
    createAdminAlertSchedule: vi.fn(),
    updateAdminAlertSchedule: vi.fn(),
    archiveAdminAlertSchedule: vi.fn(),
    previewAdminAlertSchedule: vi.fn(),
    getNotificationGroupEligibleMembers: vi.fn(),
    uploadAlertImage: vi.fn(),
    resolveAlertImageUrl: vi.fn((url: string | null) => url),
    fetchAlertImageBlobUrl: vi.fn(() => Promise.resolve("blob:mock-url")),
  },
}));

import { apiClient } from "@/lib/api-client";

function schedule(overrides: Partial<AlertSchedule> = {}): AlertSchedule {
  return {
    id: "sched-1",
    name: "Lembrete mensal",
    title: "Fechamento do mês",
    message: "Não esqueça de revisar o fechamento.",
    severity: "warning",
    image_file_name: null,
    image_alt: null,
    image_url: null,
    user_id: null,
    destinatario: null,
    recurrence_type: "daily",
    weekdays: [],
    time_of_day: "09:00",
    timezone: "America/Sao_Paulo",
    starts_at: "2026-08-01T12:00:00.000Z",
    ends_at: null,
    occurrence_expires_minutes: null,
    is_active: true,
    is_archived: false,
    last_run_at: null,
    next_run_at: "2026-08-27T12:00:00.000Z",
    created_at: "2026-08-01T12:00:00.000Z",
    updated_at: "2026-08-01T12:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  (apiClient.getNotificationGroupEligibleMembers as any).mockResolvedValue({ data: [] });
});

function renderTab() {
  return render(
    <MemoryRouter initialEntries={["/admin/dashboard"]}>
      <SidebarProvider>
        <AlertSchedulesTab />
      </SidebarProvider>
    </MemoryRouter>,
  );
}

describe("AlertSchedulesTab", () => {
  it("renderiza a lista a partir de getAdminAlertSchedules", async () => {
    (apiClient.getAdminAlertSchedules as any).mockResolvedValue({ data: [schedule()] });
    renderTab();

    expect(await screen.findByText("Lembrete mensal")).toBeInTheDocument();
    expect(screen.getByText("Fechamento do mês")).toBeInTheDocument();
    expect(screen.getByText("Todos os dias às 09:00")).toBeInTheDocument();
  });

  it("mostra estado vazio quando não há programações", async () => {
    (apiClient.getAdminAlertSchedules as any).mockResolvedValue({ data: [] });
    renderTab();
    expect(await screen.findByText("Nenhuma programação cadastrada.")).toBeInTheDocument();
  });

  it("ativar/desativar chama updateAdminAlertSchedule com is_active invertido", async () => {
    (apiClient.getAdminAlertSchedules as any).mockResolvedValue({ data: [schedule({ is_active: true })] });
    (apiClient.updateAdminAlertSchedule as any).mockResolvedValue(schedule({ is_active: false }));
    const user = userEvent.setup();
    renderTab();

    const toggle = await screen.findByRole("switch", { name: /ativar\/desativar lembrete mensal/i });
    await user.click(toggle);

    await waitFor(() => expect(apiClient.updateAdminAlertSchedule).toHaveBeenCalledWith("sched-1", { is_active: false }));
  });

  it("arquivar exige confirmação antes de chamar archiveAdminAlertSchedule", async () => {
    (apiClient.getAdminAlertSchedules as any).mockResolvedValue({ data: [schedule()] });
    (apiClient.archiveAdminAlertSchedule as any).mockResolvedValue(schedule({ is_archived: true, is_active: false }));
    const user = userEvent.setup();
    renderTab();

    await screen.findByText("Lembrete mensal");
    await user.click(screen.getByTitle("Arquivar"));

    // Confirmação ainda não foi disparada — só abriu o diálogo.
    expect(apiClient.archiveAdminAlertSchedule).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Arquivar" }));

    await waitFor(() => expect(apiClient.archiveAdminAlertSchedule).toHaveBeenCalledWith("sched-1"));
  });

  it("prévia chama previewAdminAlertSchedule e nunca cria ocorrência real", async () => {
    (apiClient.getAdminAlertSchedules as any).mockResolvedValue({ data: [schedule()] });
    (apiClient.previewAdminAlertSchedule as any).mockResolvedValue({ title: "Fechamento do mês", message: "Exemplo fictício", severity: "warning" });
    const user = userEvent.setup();
    renderTab();

    await screen.findByText("Lembrete mensal");
    await user.click(screen.getByTitle("Visualizar prévia"));

    await waitFor(() => expect(apiClient.previewAdminAlertSchedule).toHaveBeenCalledWith("sched-1"));
    expect(apiClient.createAdminAlertSchedule).not.toHaveBeenCalled();
    expect(screen.getByText("Exemplo fictício")).toBeInTheDocument();
  });
});
