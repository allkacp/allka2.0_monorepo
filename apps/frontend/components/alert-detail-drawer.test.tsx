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
    expect(apiClient.recordSystemAlertEvent).toHaveBeenCalledWith("alert-1", "details_opened", expect.any(String));

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
    expect(apiClient.recordSystemAlertEvent).toHaveBeenCalledWith("alert-1", "origin_clicked", expect.any(String));
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

  // ── Reparo overlay/rolagem/idempotência (ata 2026-08, 9º lote) ────────────

  it("1. overlay aparece ao abrir detalhes, acima do container de trás (z-65, entre a Central z-60 e o painel z-70)", async () => {
    (apiClient.getSystemAlertDetail as any).mockResolvedValue(fullDetail);
    renderDrawer();
    await screen.findByText("Alerta de teste");
    const overlay = document.querySelector('[data-slot="dialog-overlay"]');
    expect(overlay).toBeInTheDocument();
    expect(overlay?.className).toMatch(/z-65/);
    expect(overlay?.className).toMatch(/backdrop-blur/);
  });

  it("4. Escape fecha o painel", async () => {
    (apiClient.getSystemAlertDetail as any).mockResolvedValue(fullDetail);
    const onClose = vi.fn();
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    renderDrawer({ onClose });
    await screen.findByText("Alerta de teste");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("5. botão X fecha o painel", async () => {
    (apiClient.getSystemAlertDetail as any).mockResolvedValue(fullDetail);
    const onClose = vi.fn();
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    renderDrawer({ onClose });
    await screen.findByText("Alerta de teste");
    // O X do StandardModalDialog não tem texto acessível próprio — é o
    // único <button> fora dos botões de conteúdo, localizado no cabeçalho.
    const closeButtons = screen.getAllByRole("button").filter((b) => b.querySelector("svg") && !b.textContent?.trim());
    expect(closeButtons.length).toBeGreaterThan(0);
    await user.click(closeButtons[0]);
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("8/9. abre sempre no topo — inclusive ao trocar de alerta com o painel já aberto", async () => {
    (apiClient.getSystemAlertDetail as any).mockResolvedValue(fullDetail);
    const scrollToSpy = vi.spyOn(Element.prototype, "scrollTo").mockImplementation(() => {});
    const { rerender } = renderDrawer({ alertId: "alert-1" });
    await screen.findByText("Alerta de teste");
    await waitFor(() => expect(scrollToSpy).toHaveBeenCalledWith({ top: 0 }));
    scrollToSpy.mockClear();

    rerender(
      <SidebarProvider>
        <AlertDetailDrawer alertId="alert-2" open onClose={() => {}} accountType="admin" />
      </SidebarProvider>,
    );
    await waitFor(() => expect(scrollToSpy).toHaveBeenCalledWith({ top: 0 }));
  });

  it("retry (Tentar novamente) NÃO reseta a rolagem — só uma abertura real reseta", async () => {
    (apiClient.getSystemAlertDetail as any).mockRejectedValue(new Error("Network failure"));
    const scrollToSpy = vi.spyOn(Element.prototype, "scrollTo").mockImplementation(() => {});
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    renderDrawer();
    await screen.findByText("Não foi possível carregar os detalhes");
    scrollToSpy.mockClear();

    await user.click(screen.getByRole("button", { name: /tentar novamente/i }));
    await new Promise((r) => setTimeout(r, 20));
    expect(scrollToSpy).not.toHaveBeenCalled();
  });

  it("13. português com acentos aparece corretamente (Histórico, criação, destinatário, não, alteração, restauração), nunca com �", async () => {
    (apiClient.getSystemAlertDetail as any).mockResolvedValue({
      ...fullDetail,
      title: "[TESTE LOCAL] Histórico de alerta",
      message: "Criação, destinatário, alteração e restauração — não deve corromper.",
      events: [
        { id: "e1", event_type: "created", description: "Alerta criado com sucesso.", created_at: "2026-08-27T10:00:00.000Z" },
      ],
    });
    renderDrawer();
    expect(await screen.findByText("[TESTE LOCAL] Histórico de alerta")).toBeInTheDocument();
    expect(screen.getByText(/Criação, destinatário, alteração e restauração — não deve corromper\./)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/�/);
  });

  it("15/16. clientEventId gerado é estável durante a mesma abertura (envia 1 chamada mesmo remontando o efeito)", async () => {
    (apiClient.getSystemAlertDetail as any).mockResolvedValue(fullDetail);
    renderDrawer();
    await waitFor(() => expect(apiClient.recordSystemAlertEvent).toHaveBeenCalledTimes(1));
    const [, , firstId] = (apiClient.recordSystemAlertEvent as any).mock.calls[0];
    expect(typeof firstId).toBe("string");
    expect(firstId.length).toBeGreaterThan(8);
  });

  it("17. reabrir gera um clientEventId DIFERENTE (nova abertura legítima = novo evento)", async () => {
    (apiClient.getSystemAlertDetail as any).mockResolvedValue(fullDetail);
    const { rerender } = renderDrawer({ open: true });
    await waitFor(() => expect(apiClient.recordSystemAlertEvent).toHaveBeenCalledTimes(1));
    const [, , firstId] = (apiClient.recordSystemAlertEvent as any).mock.calls[0];

    rerender(<SidebarProvider><AlertDetailDrawer alertId="alert-1" open={false} onClose={() => {}} accountType="admin" /></SidebarProvider>);
    rerender(<SidebarProvider><AlertDetailDrawer alertId="alert-1" open onClose={() => {}} accountType="admin" /></SidebarProvider>);

    await waitFor(() => expect(apiClient.recordSystemAlertEvent).toHaveBeenCalledTimes(2));
    const [, , secondId] = (apiClient.recordSystemAlertEvent as any).mock.calls[1];
    expect(secondId).not.toBe(firstId);
  });

  it("18. clique em 'Ver origem' também usa um clientEventId novo por clique", async () => {
    (apiClient.getSystemAlertDetail as any).mockResolvedValue(fullDetail);
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    renderDrawer();
    const link = await screen.findByText(/ver origem/i);
    await user.click(link);
    await waitFor(() => expect(apiClient.recordSystemAlertEvent).toHaveBeenCalledTimes(2));
    const calls = (apiClient.recordSystemAlertEvent as any).mock.calls;
    const originCall = calls.find((c: any[]) => c[1] === "origin_clicked");
    expect(originCall).toBeTruthy();
    expect(typeof originCall[2]).toBe("string");
  });

  it("6. falha ao gravar o evento não trava a interface nem mostra erro técnico bruto", async () => {
    (apiClient.getSystemAlertDetail as any).mockResolvedValue(fullDetail);
    (apiClient.recordSystemAlertEvent as any).mockRejectedValue(new Error("network down"));
    renderDrawer();
    // Nunca deve aparecer o texto de erro cru na tela — a chamada é
    // fire-and-forget, silenciosa pro usuário.
    await screen.findByText("Alerta de teste");
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByText(/network down/i)).not.toBeInTheDocument();
  });
});
