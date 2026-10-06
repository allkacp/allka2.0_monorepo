import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const perf = vi.fn();
vi.mock("@/lib/api-client", () => ({ apiClient: { getCatalog2StepPerformance: (...a: unknown[]) => perf(...a) } }));
import { StepPerformance, perfRatioText } from "./catalog2-step-governance-ui";

const sum = (o: Record<string, unknown> = {}) => ({ total: 4, concluidas: 4, em_andamento: 1, avg_estimated_hours: 2, avg_actual_hours: 3.75, actual_vs_estimated: 1.88, on_time_rate: 0.75, late_count: 1, avg_delay_hours: 2, avg_rework_rounds: 1, rework_rate: 0.5, avg_cost: 100, last_executed_at: null, by_execution: {}, by_executor: {}, signals: [], ...o });

describe("Histórico real da etapa (tela)", () => {
  it("etapa nova: mensagem de que não há histórico", async () => {
    perf.mockResolvedValue({ product: sum({ total: 0, concluidas: 0 }), model: null, model_steps: 0, ai: null });
    render(<StepPerformance stepId="s" hasModel={false} />);
    expect(await screen.findByText(/Etapa nova: ainda não foi contratada/)).toBeInTheDocument();
  });
  it("com execuções: mostra tempo real, leitura, separação por humano/IA e os sinais", async () => {
    perf.mockResolvedValue({ product: sum({ by_execution: { humano: sum(), ia: sum({ concluidas: 2 }) }, signals: ["Leva 88% a MAIS que o estimado"] }), model: null, model_steps: 0, ai: { runs: 3, adopted: 2, discarded: 1, errors: 0, avg_cost: 0.5 } });
    render(<StepPerformance stepId="s" hasModel={false} />);
    await waitFor(() => expect(screen.getByTestId("step-performance")).toBeInTheDocument());
    expect(screen.getByText("+88% sobre o estimado")).toBeInTheDocument();
    expect(screen.getByText("Humano")).toBeInTheDocument();
    expect(screen.getByText("IA")).toBeInTheDocument();
    expect(screen.getByTestId("perf-signals").textContent).toMatch(/a MAIS que o estimado/);
    expect(screen.getByText(/IA: 3 execução/)).toBeInTheDocument();
    expect(perfRatioText(1)).toBe("no estimado");
  });
});
