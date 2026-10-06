import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const get = vi.fn();
const upd = vi.fn(async () => ({}));
vi.mock("@/lib/api-client", () => ({ apiClient: { getProjectPlac: (...a: unknown[]) => get(...a), updatePlacProjectStep: (...a: unknown[]) => (upd as any)(...a), getPlacInternalUsers: async () => ({ data: [{ id: "u1", name: "Líder Ana" }] }), generateProjectPlac: vi.fn() } }));
import { ProjectPlacTab } from "./project-plac-tab";

const step = (o: Record<string, unknown>) => ({ id: "s1", key: "agendamento_briefing", name: "Agendamento de Briefing", description: "AC agenda", role: "ac", role_label: "Assistente Consultiva (AC)", phase: "inicio", phase_label: "Início do contrato", estimated_hours: 0.17, due_at: "2026-10-02T12:00:00Z", status: "pendente", status_label: "Pendente", overdue: false, internal_user_ids: [], ...o });

describe("Passos PLAC no projeto", () => {
  it("mostra progresso, atraso e conclui um passo", async () => {
    get.mockResolvedValue({ project: { id: "p", title: "P" }, steps: [step({}), step({ id: "s2", key: "reuniao", name: "Reunião", overdue: true, status: "pendente" })], progress: { total: 2, done: 0, percent: 0 }, can_manage: false });
    render(<ProjectPlacTab projectId="p" />);
    expect(await screen.findByText("Agendamento de Briefing")).toBeInTheDocument();
    expect(screen.getByText("0 de 2 concluídos (0%)")).toBeInTheDocument();
    expect(screen.getByText("1 atrasado")).toBeInTheDocument();
    fireEvent.click(screen.getAllByLabelText("Concluir passo")[0]);
    await waitFor(() => expect(upd).toHaveBeenCalledWith("p", "s1", { status: "concluida" }));
  });
  it("administração vê prazo e cobrança interna", async () => {
    get.mockResolvedValue({ project: { id: "p", title: "P" }, steps: [step({})], progress: { total: 1, done: 0, percent: 0 }, can_manage: true });
    render(<ProjectPlacTab projectId="p" />);
    expect(await screen.findByText("Líder Ana")).toBeInTheDocument();
    expect(screen.getByLabelText("Prazo do passo 1")).toBeInTheDocument();
  });
});
