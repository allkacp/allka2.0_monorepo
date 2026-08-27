import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AdminTarefasPage from "./page";

// Reparo "tela de destino indisponível" (ata 2026-08, 7º lote) — cobre os
// estados finais do deep-link /admin/tarefas/:tarefaId introduzidos no lote
// anterior (fix/reuniao-2026-08-alert-destination-and-task-loading):
// not_found (404), forbidden (403), timeout e erro de rede/servidor. Cada
// um precisa de mensagem própria, nunca voltar sozinho pro loading, e (o
// reparo específico deste lote) renderizar dentro do painel branco padrão
// da plataforma — não sobre o gradiente escuro do shell.

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    getOperationalTasks: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    getOperationalTask: vi.fn(),
    getProjects: vi.fn().mockResolvedValue({ data: [] }),
    getNomades: vi.fn().mockResolvedValue({ data: [] }),
    getProject: vi.fn(),
    transferProjectTask: vi.fn(),
    updateProjectTask: vi.fn(),
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

function renderDeepLink(taskId: string) {
  return render(
    <MemoryRouter initialEntries={[`/admin/tarefas/${taskId}`]}>
      <Routes>
        <Route path="/admin/tarefas/:tarefaId" element={<AdminTarefasPage />} />
        <Route path="/admin/tarefas" element={<div>Lista de tarefas (rota base)</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  (apiClient.getOperationalTasks as any).mockResolvedValue({ data: [], total: 0 });
});

describe("AdminTarefasPage — estados finais do deep-link (ata 2026-08, 7º lote)", () => {
  it("5. destino inexistente (404) mostra 'Tarefa não encontrada' dentro do painel branco padrão, nunca fica em loading", async () => {
    (apiClient.getOperationalTask as any).mockRejectedValue(new ApiError("Not found", 404));
    renderDeepLink("tarefa-inexistente");

    expect(await screen.findByText("Tarefa não encontrada")).toBeInTheDocument();
    expect(screen.queryByLabelText(/carregando/i)).not.toBeInTheDocument();
    // Reparo de contraste: o card de erro precisa estar dentro do painel
    // branco padrão (admin-empresas-panel), não solto sobre o fundo do
    // shell — senão herda o gradiente escuro por trás.
    expect(document.querySelector(".admin-empresas-panel")).toBeInTheDocument();
  });

  it("6. 403 mostra mensagem diferente de 404 (nunca confunde 'não existe' com 'sem permissão')", async () => {
    (apiClient.getOperationalTask as any).mockRejectedValue(new ApiError("Forbidden", 403));
    renderDeepLink("tarefa-sem-acesso");

    expect(await screen.findByText("Você não possui acesso a esta tarefa")).toBeInTheDocument();
    expect(screen.queryByText("Tarefa não encontrada")).not.toBeInTheDocument();
    expect(screen.getByText(/a tarefa existe, mas sua conta não tem permissão/i)).toBeInTheDocument();
  });

  it("7a. erro de rede/servidor mostra mensagem de falha de conexão e encerra o loading, com Tentar novamente", async () => {
    (apiClient.getOperationalTask as any).mockRejectedValue(new Error("Network request failed"));
    renderDeepLink("tarefa-erro-rede");

    expect(await screen.findByText("Não foi possível carregar a tarefa")).toBeInTheDocument();
    expect(screen.queryByLabelText(/carregando/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /tentar novamente/i })).toBeInTheDocument();
  });

  it("7b. timeout (AbortError) mostra mensagem de demora e encerra o loading", async () => {
    const abortError = new Error("Aborted");
    abortError.name = "AbortError";
    (apiClient.getOperationalTask as any).mockRejectedValue(abortError);
    renderDeepLink("tarefa-timeout");

    expect(await screen.findByText(/o carregamento demorou demais/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/carregando/i)).not.toBeInTheDocument();
  });

  it("8. nenhum estado final volta sozinho pro loading — depois de resolver, o texto de loading nunca reaparece", async () => {
    (apiClient.getOperationalTask as any).mockRejectedValue(new ApiError("Not found", 404));
    renderDeepLink("tarefa-inexistente");

    expect(await screen.findByText("Tarefa não encontrada")).toBeInTheDocument();
    // Espera mais um ciclo de eventos — garante que nada reagenda um novo
    // fetch/estado de loading sozinho.
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByLabelText(/carregando/i)).not.toBeInTheDocument();
    expect(screen.getByText("Tarefa não encontrada")).toBeInTheDocument();
  });

  it("'Voltar para tarefas' no 404 navega pra rota base da lista", async () => {
    (apiClient.getOperationalTask as any).mockRejectedValue(new ApiError("Not found", 404));
    renderDeepLink("tarefa-inexistente");

    await screen.findByText("Tarefa não encontrada");
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /voltar para tarefas/i }));

    expect(await screen.findByText("Lista de tarefas (rota base)")).toBeInTheDocument();
  });
});
