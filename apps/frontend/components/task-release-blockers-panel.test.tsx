import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaskReleaseBlockersPanel } from "@/components/task-release-blockers-panel";

// Painel de bloqueadores de liberação (bloco 4/4) — mocka só o apiClient,
// mesmo padrão de launch-session-panel.test.tsx.

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    getTaskReleaseGates: vi.fn(),
    satisfyManualApprovalTrigger: vi.fn(),
    applyTaskReleaseAdminOverride: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

import { apiClient } from "@/lib/api-client";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("TaskReleaseBlockersPanel", () => {
  it("mostra dependência pendente e satisfeita, e pré-requisito é clicável", async () => {
    (apiClient.getTaskReleaseGates as any).mockResolvedValue({
      gate: {
        dependencies: [
          { dependencyId: "d1", taskId: "task-prereq", title: "Preparar ambiente", satisfied: true },
          { dependencyId: "d2", taskId: "task-outro", title: "Aprovar briefing", satisfied: false },
        ],
        triggers: [],
        allSatisfied: false,
      },
      events: [],
    });
    const onOpenTask = vi.fn();

    render(<TaskReleaseBlockersPanel taskId="task-1" canManage isAdmin={false} onOpenTask={onOpenTask} />);

    expect(await screen.findByText("Pendente de liberação")).toBeInTheDocument();
    expect(screen.getByText("Preparar ambiente")).toBeInTheDocument();
    expect(screen.getByText("Aprovar briefing")).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByText("Aprovar briefing"));
    expect(onOpenTask).toHaveBeenCalledWith("task-outro");
  });

  it("aprovação manual exige justificativa antes de habilitar a chamada", async () => {
    (apiClient.getTaskReleaseGates as any).mockResolvedValue({
      gate: {
        dependencies: [],
        triggers: [{ id: "t1", type: "manual_approval", satisfied: false, scheduledAt: null }],
        allSatisfied: false,
      },
      events: [],
    });

    render(<TaskReleaseBlockersPanel taskId="task-1" canManage isAdmin={false} />);
    const user = userEvent.setup();

    expect(await screen.findByText("Aprovação manual do gestor")).toBeInTheDocument();
    await user.click(screen.getByText("Liberar"));
    expect(apiClient.satisfyManualApprovalTrigger).not.toHaveBeenCalled();
    expect(await screen.findByText(/Justificativa é obrigatória/)).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("Justificativa da aprovação manual"), "Combinado com o cliente");
    await user.click(screen.getByText("Liberar"));
    await waitFor(() => expect(apiClient.satisfyManualApprovalTrigger).toHaveBeenCalledWith("t1", "Combinado com o cliente"));
  });

  it("exceção administrativa só aparece para isAdmin e exige justificativa", async () => {
    (apiClient.getTaskReleaseGates as any).mockResolvedValue({
      gate: { dependencies: [], triggers: [], allSatisfied: false },
      events: [],
    });

    const { rerender } = render(<TaskReleaseBlockersPanel taskId="task-1" canManage isAdmin={false} />);
    await screen.findByText("Pendente de liberação");
    expect(screen.queryByText("Aplicar exceção administrativa")).not.toBeInTheDocument();

    rerender(<TaskReleaseBlockersPanel taskId="task-1" canManage isAdmin />);
    const user = userEvent.setup();
    await user.click(await screen.findByText("Aplicar exceção administrativa"));
    await user.click(screen.getByText("Confirmar exceção"));
    expect(apiClient.applyTaskReleaseAdminOverride).not.toHaveBeenCalled();

    await user.type(screen.getByPlaceholderText(/Justificativa obrigatória/), "Liberado por decisão comercial");
    await user.click(screen.getByText("Confirmar exceção"));
    await waitFor(() => expect(apiClient.applyTaskReleaseAdminOverride).toHaveBeenCalledWith("task-1", "Liberado por decisão comercial"));
  });
});
