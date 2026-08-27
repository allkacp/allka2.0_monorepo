import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { AlertDetailDrawer } from "@/components/alert-detail-drawer";

// "Detalhes" (ata 2026-08, 8º lote) — painel próprio com visualização
// completa + histórico, separado de "Ver origem". Testado isolado (mesmo
// padrão de alert-image-field.test.tsx): mocka só o apiClient, monta
// dentro de um SidebarProvider (StandardModalDialog depende dele).

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    getSystemAlertDetail: vi.fn(),
    recordSystemAlertEvent: vi.fn().mockResolvedValue({ ok: true }),
    resolveAlertImageUrl: vi.fn((url: string | null) => url),
    fetchAlertImageBlobUrl: vi.fn().mockResolvedValue("blob:mock-banner"),
  },
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

import { apiClient, ApiError } from "@/lib/api-client";

function renderDrawer(props: Partial<Parameters<typeof AlertDetailDrawer>[0]> = {}) {
  return render(
    <SidebarProvider>
      <AlertDetailDrawer
        alertId="alert-1"
        open
        onClose={() => {}}
        accountType="admin"
        {...props}
      />
    </SidebarProvider>,
  );
}

const fullDetail = {
  id: "alert-1",
  title: "Alerta de teste",
  message: "Mensagem completa do alerta",
  severity: "warning" as const,
  situacao: "ativo" as const,
  created_at: "2026-08-27T10:00:00.000Z",
  expires_at: null,
  has_image: false,
  image_url: null,
  image_alt: null,
  origin: { type: "avulso" as const, created_by: { id: "u1", name: "Fulano Admin" } },
  destinatario: { kind: "geral" as const },
  entity_type: "project_task",
  entity_id: "task-1",
  entity_parent_id: null,
  destination: { entity_type: "project_task", label: "Tarefa", name: "Tarefa real de teste", code: "T000123", status: "disponivel" as const },
  events: [
    { id: "e1", event_type: "created", description: "Alerta avulso criado manualmente.", created_at: "2026-08-27T10:00:00.000Z" },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AlertDetailDrawer", () => {
  it("14. mostra loading enquanto busca", () => {
    (apiClient.getSystemAlertDetail as any).mockReturnValue(new Promise(() => {}));
    renderDrawer();
    expect(screen.getByRole("status", { name: /carregando detalhes/i })).toBeInTheDocument();
  });

  it("3. exibe os campos reais: título, mensagem, severidade, origem, destinatário, entidade", async () => {
    (apiClient.getSystemAlertDetail as any).mockResolvedValue(fullDetail);
    renderDrawer();

    expect(await screen.findByText("Alerta de teste")).toBeInTheDocument();
    expect(screen.getByText("Mensagem completa do alerta")).toBeInTheDocument();
    expect(screen.getByText("Amarelo")).toBeInTheDocument();
    expect(screen.getByText("Fulano Admin")).toBeInTheDocument();
    expect(screen.getByText("Geral (público)")).toBeInTheDocument();
    expect(screen.getByText("Tarefa: Tarefa real de teste")).toBeInTheDocument();
    expect(screen.getByText("Disponível")).toBeInTheDocument();
  });

  it("9/17. nunca mostra o entity_id técnico como texto solto na tela", async () => {
    (apiClient.getSystemAlertDetail as any).mockResolvedValue(fullDetail);
    renderDrawer();
    await screen.findByText("Alerta de teste");
    expect(screen.queryByText("task-1")).not.toBeInTheDocument();
  });

  it("4. alerta sem destino mostra 'Sem destino' e o texto explicativo, sem link de Ver origem", async () => {
    (apiClient.getSystemAlertDetail as any).mockResolvedValue({
      ...fullDetail,
      entity_type: null,
      entity_id: null,
      destination: null,
    });
    renderDrawer();
    await screen.findByText("Alerta de teste");
    expect(screen.getByText("Sem destino")).toBeInTheDocument();
    expect(screen.getByText(/este alerta é informativo e não possui uma tela vinculada/i)).toBeInTheDocument();
    expect(screen.queryByText(/ver origem/i)).not.toBeInTheDocument();
  });

  it("5/6. destino disponível mostra 'Ver origem' como link real, nova aba, com noopener/noreferrer", async () => {
    (apiClient.getSystemAlertDetail as any).mockResolvedValue(fullDetail);
    renderDrawer();
    const link = await screen.findByText(/ver origem/i);
    const anchor = link.closest("a")!;
    expect(anchor).toHaveAttribute("target", "_blank");
    expect(anchor).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(anchor).toHaveAttribute("rel", expect.stringContaining("noreferrer"));
    expect(anchor).toHaveAttribute("href", "/admin/tarefas/task-1");
  });

  it("7. banner completo aparece quando has_image é true", async () => {
    (apiClient.getSystemAlertDetail as any).mockResolvedValue({
      ...fullDetail,
      has_image: true,
      image_url: "/api/system-alerts/alert-1/image",
      image_alt: "Banner de teste",
    });
    renderDrawer();
    await waitFor(() => expect(screen.getByAltText("Banner de teste")).toBeInTheDocument());
  });

  it("8/12. histórico em ordem cronológica; alerta sem eventos mostra o aviso de histórico não disponível", async () => {
    (apiClient.getSystemAlertDetail as any).mockResolvedValue({ ...fullDetail, events: [] });
    renderDrawer();
    await screen.findByText("Alerta de teste");
    expect(screen.getByText(/o histórico detalhado deste alerta começou a ser registrado/i)).toBeInTheDocument();
  });

  it("9. abrir o painel registra no máximo 1 evento 'details_opened', mesmo com re-render", async () => {
    (apiClient.getSystemAlertDetail as any).mockResolvedValue(fullDetail);
    const { rerender } = renderDrawer();
    await screen.findByText("Alerta de teste");
    await waitFor(() => expect(apiClient.recordSystemAlertEvent).toHaveBeenCalledTimes(1));
    expect(apiClient.recordSystemAlertEvent).toHaveBeenCalledWith("alert-1", "details_opened");

    // Re-render (ex.: o pai re-renderiza por outro motivo) não deve
    // disparar uma segunda chamada — mesmo alertId, mesmo open.
    rerender(
      <SidebarProvider>
        <AlertDetailDrawer alertId="alert-1" open onClose={() => {}} accountType="admin" />
      </SidebarProvider>,
    );
    await new Promise((r) => setTimeout(r, 20));
    expect(apiClient.recordSystemAlertEvent).toHaveBeenCalledTimes(1);
  });

  it("10. clicar em 'Ver origem' registra o evento 'origin_clicked'", async () => {
    (apiClient.getSystemAlertDetail as any).mockResolvedValue(fullDetail);
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    renderDrawer();
    const link = await screen.findByText(/ver origem/i);
    await user.click(link);
    expect(apiClient.recordSystemAlertEvent).toHaveBeenCalledWith("alert-1", "origin_clicked");
  });

  it("2. 404 mostra estado de erro seguro, sem loading residual", async () => {
    (apiClient.getSystemAlertDetail as any).mockRejectedValue(new ApiError("Not found", 404));
    renderDrawer();
    expect(await screen.findByText("Alerta não encontrado")).toBeInTheDocument();
    expect(screen.queryByRole("status", { name: /carregando detalhes/i })).not.toBeInTheDocument();
  });

  it("2. 403 mostra mensagem diferente de 404", async () => {
    (apiClient.getSystemAlertDetail as any).mockRejectedValue(new ApiError("Forbidden", 403));
    renderDrawer();
    expect(await screen.findByText("Você não possui acesso a este alerta")).toBeInTheDocument();
    expect(screen.queryByText("Alerta não encontrado")).not.toBeInTheDocument();
  });

  it("14. erro de rede mostra estado próprio com Tentar novamente, encerra o loading", async () => {
    (apiClient.getSystemAlertDetail as any).mockRejectedValue(new Error("Network failure"));
    renderDrawer();
    expect(await screen.findByText("Não foi possível carregar os detalhes")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /tentar novamente/i })).toBeInTheDocument();
  });

  it("não busca nada quando fechado", () => {
    renderDrawer({ open: false });
    expect(apiClient.getSystemAlertDetail).not.toHaveBeenCalled();
  });
});
