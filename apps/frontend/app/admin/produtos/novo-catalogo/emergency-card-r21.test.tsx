import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
vi.mock("@/lib/api-client", () => ({ apiClient: { updateCatalog2VersionInfo: vi.fn(async () => ({})), simulateCatalog2: vi.fn(async () => ({ pricing: {} })), updateCatalog2Step: vi.fn() } }));
import { apiClient } from "@/lib/api-client";
import { EmergencyCard } from "./catalog2-emergency-ui";

const ver = (o: any = {}) => ({ id: "v1", emergency_enabled: true, tasks: [{ id: "t", name: "T", steps: [{ id: "s", key: "s", name: "Etapa", estimated_minutes: 480 }] }], ...o });

// R21-04 (entrega rápida como condição do produto), R21-19 (limites) e R21-11 (aceite do profissional): telas de cadastro.
describe("Entrega emergencial: modo produto, limites e aceite", () => {
  it("modo por etapa mostra a tabela de etapas e não os campos de % do produto", () => {
    render(<EmergencyCard version={ver()} readOnly={false} act={vi.fn()} />);
    expect(screen.getByTestId("emergency-step-s")).toBeTruthy();
    expect(screen.queryByTestId("emergency-product-fields")).toBeNull();
    expect(screen.getByTestId("emergency-limits")).toBeTruthy();
  });
  it("modo produto esconde a tabela e pede os dois percentuais; trocar o modo e salvar chamam a API", () => {
    const act = vi.fn((fn: any) => fn());
    render(<EmergencyCard version={ver({ emergency_mode: "product" })} readOnly={false} act={act} />);
    expect(screen.queryByTestId("emergency-step-s")).toBeNull();
    fireEvent.change(screen.getByTestId("emergency-product-reduction"), { target: { value: "30" } });
    fireEvent.blur(screen.getByTestId("emergency-product-reduction"));
    expect(apiClient.updateCatalog2VersionInfo).toHaveBeenCalledWith("v1", { emergency_product_reduction_percent: 30 });
    fireEvent.change(screen.getByTestId("emergency-same-day"), { target: { value: "12:00" } });
    fireEvent.blur(screen.getByTestId("emergency-same-day"));
    expect(apiClient.updateCatalog2VersionInfo).toHaveBeenCalledWith("v1", { emergency_same_day_limit_time: "12:00" });
    fireEvent.change(screen.getByTestId("emergency-min-notice"), { target: { value: "24" } });
    fireEvent.blur(screen.getByTestId("emergency-min-notice"));
    expect(apiClient.updateCatalog2VersionInfo).toHaveBeenCalledWith("v1", { emergency_min_notice_hours: 24 });
  });
  it("aceite do profissional: ao marcar aparece o prazo de resposta", () => {
    const { rerender } = render(<EmergencyCard version={ver()} readOnly={false} act={vi.fn()} />);
    expect(screen.queryByTestId("emergency-accept-hours")).toBeNull();
    rerender(<EmergencyCard version={ver({ emergency_executor_accept_required: true })} readOnly={false} act={vi.fn()} />);
    expect(screen.getByTestId("emergency-accept-hours")).toBeTruthy();
  });
});
