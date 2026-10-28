import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const api = {
  getStageCycles: vi.fn(),
  deliverStageCycle: vi.fn(async () => ({})),
  decideStageCycle: vi.fn(async () => ({})),
};
vi.mock("@/lib/api-client", () => ({ apiClient: new Proxy({}, { get: (_t, k: string) => (api as any)[k] }) }));
import { StageCyclesList } from "./stage-cycles-list";

const cycle = (over: Record<string, unknown>) => ({ id: "c1", cycle_index: 1, from_day: 1, to_day: 7, starts_at: "2026-10-01T00:00:00Z", ends_at: "2026-10-07T23:59:00Z", status: "em_andamento", approval_window_days: 2, hours: null, rule: null, guidance_from_previous: null, delivery_note: null, client_comment: null, approval_due_at: null, atrasado: false, pode_entregar: false, pode_decidir: false, ...over });
beforeEach(() => { Object.values(api).forEach((f) => f.mockClear()); });

describe("Ciclos da etapa (projeto)", () => {
  it("não mostra nada quando a etapa não é em ciclos", async () => {
    api.getStageCycles.mockResolvedValue({ em_ciclos: false, data: [], viewer: {} });
    const { container } = render(<StageCyclesList taskId="t" stageId="s" />);
    await waitFor(() => expect(api.getStageCycles).toHaveBeenCalled());
    expect(container.firstChild).toBeNull();
  });
  it("lista cada ciclo com situação, orientação do ciclo anterior e aviso de período vencido; o executor entrega com observação", async () => {
    api.getStageCycles.mockResolvedValue({
      em_ciclos: true, viewer: { can_deliver: true, can_decide: false },
      data: [cycle({ id: "c1", status: "reprovado", client_comment: "Faltou o custo por lead" }), cycle({ id: "c2", cycle_index: 2, from_day: 8, to_day: 14, pode_entregar: true, atrasado: true, rule: "Relatório da 2ª semana", guidance_from_previous: "Ciclo 1 (reprovado): Faltou o custo por lead" }), cycle({ id: "c3", cycle_index: 3, status: "agendado" })],
    });
    render(<StageCyclesList taskId="t" stageId="s" />);
    expect(await screen.findAllByTestId("stage-cycle")).toHaveLength(3);
    expect(screen.getByTestId("cycle-guidance").textContent).toMatch(/Faltou o custo por lead/);
    expect(screen.getByTestId("cycle-late")).toBeInTheDocument();
    expect(screen.getByText("Reprovado")).toBeInTheDocument();
    expect(screen.getByText("Ainda não começou")).toBeInTheDocument();
    expect(screen.queryByTestId("cycle-approve")).toBeNull(); // quem entrega não aprova
    fireEvent.change(screen.getByLabelText("Observação da entrega do ciclo 2"), { target: { value: "Relatório pronto" } });
    fireEvent.click(screen.getByTestId("cycle-deliver"));
    await waitFor(() => expect(api.deliverStageCycle).toHaveBeenCalledWith("t", "s", "c2", "Relatório pronto"));
  });
  it("o cliente aprova ou reprova; reprovar só habilita com comentário (vai como orientação do próximo ciclo)", async () => {
    api.getStageCycles.mockResolvedValue({ em_ciclos: true, viewer: { can_deliver: false, can_decide: true }, data: [cycle({ status: "aguardando_aprovacao", pode_decidir: true, approval_due_at: "2026-10-10T18:00:00Z" })] });
    render(<StageCyclesList taskId="t" stageId="s" />);
    const reject = await screen.findByTestId("cycle-reject");
    expect(reject).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Comentário do ciclo 1"), { target: { value: "Faltou o custo por lead" } });
    expect(reject).not.toBeDisabled();
    fireEvent.click(reject);
    await waitFor(() => expect(api.decideStageCycle).toHaveBeenCalledWith("t", "s", "c1", "reprovar", "Faltou o custo por lead"));
    fireEvent.click(screen.getByTestId("cycle-approve"));
    await waitFor(() => expect(api.decideStageCycle).toHaveBeenCalledWith("t", "s", "c1", "aprovar", undefined));
  });
});
