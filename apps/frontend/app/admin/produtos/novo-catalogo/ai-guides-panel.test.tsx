import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const api = {
  listCatalog2AiGuides: vi.fn(),
  createCatalog2AiGuide: vi.fn(async () => ({})),
  updateCatalog2AiGuide: vi.fn(async () => ({})),
  deleteCatalog2AiGuide: vi.fn(async () => ({})),
};
vi.mock("@/lib/api-client", () => ({ apiClient: new Proxy({}, { get: (_t, k: string) => (api as any)[k] }) }));
import { AiGuidesPanel } from "./catalog2-product-ai-chat";

// R21-18: área de guias e métodos para a IA de preenchimento.
describe("Guias e métodos da IA (R21-18)", () => {
  beforeEach(() => { Object.values(api).forEach((f) => f.mockClear()); api.listCatalog2AiGuides.mockResolvedValue({ guides: [{ id: "g1", title: "Método PLA", content: "Passo a passo do método", is_active: true }] }); });

  it("lista os guias, desativa e guarda um novo (com o texto vindo de um arquivo .md)", async () => {
    render(<AiGuidesPanel />);
    await screen.findByText("Método PLA");
    fireEvent.click(screen.getByLabelText("Guia ativo: Método PLA"));
    await waitFor(() => expect(api.updateCatalog2AiGuide).toHaveBeenCalledWith("g1", { is_active: false }));
    const save = screen.getByTestId("ai-guide-save") as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    fireEvent.change(screen.getByTestId("ai-guide-file"), { target: { files: [new File(["Sempre escreva em português claro."], "estilo.md")] } });
    await waitFor(() => expect((screen.getByTestId("ai-guide-content") as HTMLTextAreaElement).value).toContain("português claro"));
    expect((screen.getByTestId("ai-guide-title") as HTMLInputElement).value).toBe("estilo");
    fireEvent.click(screen.getByTestId("ai-guide-save"));
    await waitFor(() => expect(api.createCatalog2AiGuide).toHaveBeenCalledWith({ title: "estilo", content: "Sempre escreva em português claro." }));
  });

  it("arquivo que não é texto é recusado com orientação", async () => {
    render(<AiGuidesPanel />);
    await screen.findByText("Método PLA");
    fireEvent.change(screen.getByTestId("ai-guide-file"), { target: { files: [new File(["x"], "metodo.docx")] } });
    expect((await screen.findByRole("alert")).textContent).toMatch(/\.txt ou \.md/);
  });

  it("somente leitura: sem formulário nem botão de apagar", async () => {
    render(<AiGuidesPanel readOnly />);
    await screen.findByText("Método PLA");
    expect(screen.queryByTestId("ai-guide-save")).toBeNull();
    expect(screen.queryByText("Apagar")).toBeNull();
  });
});
