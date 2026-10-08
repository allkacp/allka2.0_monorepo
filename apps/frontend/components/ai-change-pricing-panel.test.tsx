import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const base = {
  days: 90, sample_calls: 30, enough_data: true, pooled_cost_usd: 0.0047, pooled_cost_brl: 0.0259, price_per_change_brl: 0.6,
  settings: { usd_brl_rate: 5.5, margin_percent: 100, free_changes: 1, min_price_brl: 0, basis: "average", features: null },
  averages: [{ feature: "improve-product-field", calls: 20, avg_prompt_tokens: 1000, avg_completion_tokens: 400, avg_total_tokens: 1400, avg_cost_usd: 0.002, p90_cost_usd: 0.002 }, { feature: "questionnaire-suggest", calls: 10, avg_prompt_tokens: 1000, avg_completion_tokens: 400, avg_total_tokens: 1400, avg_cost_usd: 0.01, p90_cost_usd: 0.01 }],
};
const api = { getAiChangePricing: vi.fn(), saveAiChangePricing: vi.fn() };
vi.mock("@/lib/api-client", () => ({ apiClient: new Proxy({}, { get: (_t, k: string) => (api as any)[k] }) }));
import { AiChangePricingPanel } from "./ai-change-pricing-panel";

describe("Preço das alterações por IA (tela)", () => {
  beforeEach(() => { api.getAiChangePricing.mockReset().mockResolvedValue(base); api.saveAiChangePricing.mockReset(); });

  it("mostra as médias reais, o custo e o preço por alteração", async () => {
    render(<AiChangePricingPanel />);
    expect((await screen.findByTestId("price-result")).textContent).toMatch(/0,60/);
    expect(screen.getByTestId("averages-table").textContent).toContain("improve-product-field");
    expect(screen.getByTestId("averages-table").textContent).toContain("1400");
  });

  it("salva as regras editadas (inclusive os usos escolhidos) e mostra o novo preço", async () => {
    api.saveAiChangePricing.mockResolvedValue({ ...base, price_per_change_brl: 0.3, settings: { ...base.settings, margin_percent: 150, basis: "p90", features: ["improve-product-field"] } });
    render(<AiChangePricingPanel />);
    await screen.findByTestId("price-result");
    fireEvent.change(screen.getByLabelText("Margem"), { target: { value: "150" } });
    fireEvent.change(screen.getByLabelText("Base do cálculo"), { target: { value: "p90" } });
    fireEvent.click(screen.getByLabelText("Contar questionnaire-suggest"));
    fireEvent.click(screen.getByRole("button", { name: "Salvar regras" }));
    await waitFor(() => expect(api.saveAiChangePricing).toHaveBeenCalledWith({ usd_brl_rate: 5.5, margin_percent: 150, free_changes: 1, min_price_brl: 0, basis: "p90", features: ["improve-product-field"] }));
    await screen.findByText(/Regras de preço das alterações salvas/);
    expect(screen.getByTestId("price-result").textContent).toMatch(/0,30/);
  });

  it("avisa quando há poucos dados", async () => {
    api.getAiChangePricing.mockResolvedValue({ ...base, enough_data: false, sample_calls: 3 });
    render(<AiChangePricingPanel />);
    expect((await screen.findByTestId("price-result")).textContent).toMatch(/Poucos dados \(3 chamadas/);
  });
});
