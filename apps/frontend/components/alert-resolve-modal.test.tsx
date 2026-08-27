import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { AlertResolveModal, type AlertResolveTarget } from "@/components/alert-resolve-modal";

// "Resolver alerta" (ata 2026-08, 10º lote) — formulário obrigatório pra
// resolução formal de alerta crítico. Testado isolado, dentro de um
// SidebarProvider (StandardModalDialog depende dele).

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    resolveSystemAlert: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    status: number;
    data?: Record<string, any>;
    constructor(message: string, status: number, data?: Record<string, any>) {
      super(message);
      this.status = status;
      this.data = data;
    }
  },
}));

import { apiClient } from "@/lib/api-client";

const target: AlertResolveTarget = {
  id: "alert-1",
  title: "[TESTE] Alerta crítico",
  message: "Mensagem resumida do alerta",
  entityLabel: "Tarefa: Corrigir X",
  originLink: "/admin/tarefas/task-1",
};

function renderModal(props: Partial<Parameters<typeof AlertResolveModal>[0]> = {}) {
  return render(
    <SidebarProvider>
      <AlertResolveModal open onClose={() => {}} target={target} onResolved={() => {}} {...props} />
    </SidebarProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AlertResolveModal", () => {
  it("mostra título, severidade vermelha, mensagem, entidade e Ver origem", () => {
    renderModal();
    expect(screen.getByText("[TESTE] Alerta crítico")).toBeInTheDocument();
    expect(screen.getByText("Vermelho")).toBeInTheDocument();
    expect(screen.getByText("Mensagem resumida do alerta")).toBeInTheDocument();
    expect(screen.getByText(/Tarefa: Corrigir X/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ver origem/i })).toHaveAttribute("href", "/admin/tarefas/task-1");
  });

  it("5. ação é obrigatória — enviar vazio mostra erro e não chama a API", async () => {
    const user = userEvent.setup();
    renderModal();
    await user.type(screen.getByPlaceholderText(/descreva o que foi feito/i), "Descrição de teste com mais de dez caracteres");
    await user.click(screen.getByRole("button", { name: /confirmar resolução/i }));
    expect(await screen.findByText(/selecione a ação realizada/i)).toBeInTheDocument();
    expect(apiClient.resolveSystemAlert).not.toHaveBeenCalled();
  });

  it("6/7. descrição é obrigatória e espaços em branco são rejeitados", async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByRole("button", { name: "Correção aplicada" }));
    await user.type(screen.getByPlaceholderText(/descreva o que foi feito/i), "        ");
    await user.click(screen.getByRole("button", { name: /confirmar resolução/i }));
    expect(await screen.findByText(/pelo menos 10 caracteres/i)).toBeInTheDocument();
    expect(apiClient.resolveSystemAlert).not.toHaveBeenCalled();
  });

  it("8. tamanho mínimo — descrição curta (< 10 caracteres reais) é rejeitada", async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByRole("button", { name: "Correção aplicada" }));
    await user.type(screen.getByPlaceholderText(/descreva o que foi feito/i), "curta");
    await user.click(screen.getByRole("button", { name: /confirmar resolução/i }));
    expect(await screen.findByText(/pelo menos 10 caracteres/i)).toBeInTheDocument();
  });

  it("confirma com sucesso: chama resolveSystemAlert com action/description/clientActionId e fecha", async () => {
    (apiClient.resolveSystemAlert as any).mockResolvedValue({
      ok: true, duplicate: false, manual_resolved_at: "2026-08-27T10:00:00Z",
      resolution_action: "correcao_aplicada", resolution_description: "Descrição de teste válida.",
    });
    const onResolved = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderModal({ onResolved, onClose });

    await user.click(screen.getByRole("button", { name: "Correção aplicada" }));
    await user.type(screen.getByPlaceholderText(/descreva o que foi feito/i), "Descrição de teste válida.");
    await user.click(screen.getByRole("button", { name: /confirmar resolução/i }));

    await waitFor(() => expect(apiClient.resolveSystemAlert).toHaveBeenCalledTimes(1));
    const [id, data, clientActionId] = (apiClient.resolveSystemAlert as any).mock.calls[0];
    expect(id).toBe("alert-1");
    expect(data).toEqual({ action: "correcao_aplicada", description: "Descrição de teste válida." });
    expect(typeof clientActionId).toBe("string");
    expect(clientActionId.length).toBeGreaterThan(8);
    await waitFor(() => expect(onResolved).toHaveBeenCalledWith("alert-1", expect.any(Object)));
    expect(onClose).toHaveBeenCalled();
  });

  it("botão mostra loading e impede clique duplo", async () => {
    let resolvePromise: (v: any) => void = () => {};
    (apiClient.resolveSystemAlert as any).mockReturnValue(new Promise((resolve) => { resolvePromise = resolve; }));
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole("button", { name: "Correção aplicada" }));
    await user.type(screen.getByPlaceholderText(/descreva o que foi feito/i), "Descrição de teste válida.");
    const confirmButton = screen.getByRole("button", { name: /confirmar resolução/i });
    await user.click(confirmButton);
    await user.click(confirmButton);

    expect(await screen.findByRole("button", { name: /confirmando/i })).toBeInTheDocument();
    resolvePromise({ ok: true, duplicate: false, manual_resolved_at: "2026-08-27T10:00:00Z", resolution_action: "correcao_aplicada", resolution_description: "x" });
    await waitFor(() => expect(apiClient.resolveSystemAlert).toHaveBeenCalledTimes(1));
  });

  it("23. erro mantém o modal aberto com os campos preenchidos", async () => {
    (apiClient.resolveSystemAlert as any).mockRejectedValue(new Error("network down"));
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderModal({ onClose });

    await user.click(screen.getByRole("button", { name: "Correção aplicada" }));
    await user.type(screen.getByPlaceholderText(/descreva o que foi feito/i), "Descrição de teste válida.");
    await user.click(screen.getByRole("button", { name: /confirmar resolução/i }));

    expect(await screen.findByText(/não foi possível confirmar a resolução/i)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue("Descrição de teste válida.")).toBeInTheDocument();
  });

  it("contador de caracteres é exibido", async () => {
    const user = userEvent.setup();
    renderModal();
    await user.type(screen.getByPlaceholderText(/descreva o que foi feito/i), "abc");
    expect(screen.getByText("3/2000")).toBeInTheDocument();
  });

  // ── Reparo "ações conclusivas" (ata 2026-08, 11º lote) ────────────────────
  // "Responsável acionado" foi removida: acionar alguém é encaminhar, não
  // comprova que o problema terminou.
  it("1. 'Responsável acionado' não aparece mais como opção", () => {
    renderModal();
    expect(screen.queryByRole("button", { name: "Responsável acionado" })).not.toBeInTheDocument();
  });

  it("2. as ações conclusivas continuam disponíveis", () => {
    renderModal();
    expect(screen.getByRole("button", { name: "Correção aplicada" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Processo ajustado" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Alerta identificado como falso positivo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Outra ação concluída" })).toBeInTheDocument();
  });

  it("3. frontend nunca envia 'responsavel_acionado' — só as 4 ações restantes existem no DOM pra clicar", async () => {
    (apiClient.resolveSystemAlert as any).mockResolvedValue({
      ok: true, duplicate: false, manual_resolved_at: "2026-08-27T10:00:00Z",
      resolution_action: "processo_ajustado", resolution_description: "Descrição de teste válida.",
    });
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByRole("button", { name: "Processo ajustado" }));
    await user.type(screen.getByPlaceholderText(/descreva o que foi feito/i), "Descrição de teste válida.");
    await user.click(screen.getByRole("button", { name: /confirmar resolução/i }));

    await waitFor(() => expect(apiClient.resolveSystemAlert).toHaveBeenCalledTimes(1));
    const [, data] = (apiClient.resolveSystemAlert as any).mock.calls[0];
    expect(data.action).not.toBe("responsavel_acionado");
  });
});
