import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const impact = vi.fn(async () => ({ instances: 1, editable: 1, locked: 0, products: 1 }));
vi.mock("@/lib/api-client", () => ({ apiClient: { getCatalog2ModelImpact: (...a: any[]) => (impact as any)(...a) } }));
import { ModelScopeDialog } from "./catalog2-models-ui";

describe("Onde aplicar a alteração de um modelo global", () => {
  it("no cadastro do produto oferece também 'somente neste produto'; singular no impacto; cancelar não escolhe nada", async () => {
    const onChoose = vi.fn(); const onCancel = vi.fn();
    render(<ModelScopeDialog open kindLabel="tarefa" modelId={121} onChoose={onChoose} onCancel={onCancel} />);
    expect(screen.getByTestId("scope-product")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("model-impact").textContent).toContain("usado em 1 tarefa, em 1 produto. 1 vínculo editável (versão em rascunho) será atualizado. Nenhum está em versão publicada."));
    expect(impact).toHaveBeenCalledWith("task", 121);
    fireEvent.click(screen.getByTestId("scope-product"));
    expect(onChoose).toHaveBeenCalledWith("product");
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onCancel).toHaveBeenCalled();
  });

  it("falha ao calcular o impacto não trava a decisão", async () => {
    impact.mockRejectedValueOnce(new Error("x"));
    const onChoose = vi.fn();
    render(<ModelScopeDialog open embedded kindLabel="etapa" modelId={5} onChoose={onChoose} onCancel={() => {}} />);
    await waitFor(() => expect(screen.getByTestId("model-impact").textContent).toBe("Não foi possível calcular o impacto agora."));
    expect(screen.queryByTestId("scope-product")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("scope-new-model"));
    expect(onChoose).toHaveBeenCalledWith("new_model");
  });
});
