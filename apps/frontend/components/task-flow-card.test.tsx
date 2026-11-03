import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const getTaskFlow = vi.fn();
vi.mock("@/lib/api-client", () => ({ apiClient: { getTaskFlow: (...a: unknown[]) => getTaskFlow(...a), getTaskDecisions: async () => ({ data: [] }) } }));
import { TaskFlowBadge } from "./task-flow-card";

// 01/11 (teste do Codex na T015718): o cabeçalho mostrava "Para lançamento" (status da
// tarefa) e "Em lançamento" (situação derivada) ao mesmo tempo. A situação derivada de
// uma tarefa recém-comprada agora é "Aguardando lançamento" e o chip diz o escopo.
describe("chip da situação do fluxo", () => {
  it("identifica o escopo (Fluxo:) e mostra o estado derivado sem confundir com o status", async () => {
    getTaskFlow.mockResolvedValueOnce({ state: "aguardando_lancamento", label: "Aguardando lançamento", reason: "Contratada e aguardando o lançamento. Nada foi distribuído ainda.", blockers: [] });
    render(<TaskFlowBadge taskId="t1" status="PARA_LANCAMENTO" />);
    const chip = await screen.findByText("Fluxo: Aguardando lançamento");
    expect(chip).toHaveAttribute("title", "Contratada e aguardando o lançamento. Nada foi distribuído ainda.");
    expect(screen.queryByText(/Em lançamento/)).not.toBeInTheDocument();
  });
});
