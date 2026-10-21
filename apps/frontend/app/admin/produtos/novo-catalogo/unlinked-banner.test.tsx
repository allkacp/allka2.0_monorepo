import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
vi.mock("@/lib/api-client", () => ({ apiClient: {} }));
vi.mock("@/hooks/useAppFrameMetrics", () => ({ useAppFrameMetrics: () => ({ sidebarWidth: 72 }) }));
import { UnlinkedStepsBanner } from "./product-editor";

const base = {
  tasks: [{ key: "a", steps: [{ key: "s1", name: "Briefing", is_conditional: false }, { key: "s2", name: "Etapa B (extra)", is_conditional: true }] }],
  variations: [{ options: [{ effects: [] }] }], addons: [], conditions: [],
};

// R21-03: aviso nas abas Variações/Adicionais para a etapa dependente que ainda não foi ligada.
describe("Aviso de etapa dependente sem vínculo", () => {
  it("aparece citando a etapa e ensinando o caminho; some quando a etapa é ligada", () => {
    const { rerender } = render(<UnlinkedStepsBanner version={base} />);
    const b = screen.getByTestId("unlinked-steps-banner");
    expect(b.textContent).toContain("Etapa B (extra)");
    expect(b.textContent).toContain("Configurar impactos");
    expect(b.textContent).toContain("Incluir etapa");
    rerender(<UnlinkedStepsBanner version={{ ...base, variations: [{ options: [{ effects: [{ effect_type: "add_step", effect_value: "a:s2" }] }] }] }} />);
    expect(screen.queryByTestId("unlinked-steps-banner")).toBeNull();
  });
  it("não aparece quando não há etapa dependente", () => {
    render(<UnlinkedStepsBanner version={{ ...base, tasks: [{ key: "a", steps: [{ key: "s1", name: "Briefing", is_conditional: false }] }] }} />);
    expect(screen.queryByTestId("unlinked-steps-banner")).toBeNull();
  });
});
