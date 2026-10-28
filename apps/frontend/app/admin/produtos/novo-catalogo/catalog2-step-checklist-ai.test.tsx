import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const api = { suggestCatalog2StepChecklist: vi.fn() };
vi.mock("@/lib/api-client", () => ({ apiClient: new Proxy({}, { get: (_t, k: string) => (api as any)[k] }) }));
import { StepChecklistDialog } from "./catalog2-step-checklist-ui";

beforeEach(() => api.suggestCatalog2StepChecklist.mockReset());
const mount = (over: Record<string, any> = {}) => render(<StepChecklistDialog open title="Etapa X" value={[{ id: "a", text: "Item que já existia", kind: "execucao", required: true }]} onClose={() => {}} onSave={over.onSave ?? (() => {})} stepId="s1" draft={{ name: "Etapa X" }} {...over} />);

describe("Checklist da etapa · gerar com IA", () => {
  it("só aparece com a etapa salva e fora do modo leitura", () => {
    const { unmount } = mount({ stepId: undefined });
    expect(screen.queryByTestId("checklist-ai-open")).toBeNull();
    unmount();
    mount({ readOnly: true });
    expect(screen.queryByTestId("checklist-ai-open")).toBeNull();
  });
  it("abre o painel do que será consultado, manda o que já existe e as fontes, adiciona os itens com selo IA e dá para remover", async () => {
    api.suggestCatalog2StepChecklist.mockResolvedValue({ read: ["produto", "tarefa", "etapas"], items: [
      { kind: "execucao", text: "Conferir o acesso liberado", required: true },
      { kind: "aprovacao", text: "Cliente confirma o resultado", required: true },
    ] });
    mount();
    fireEvent.click(screen.getByTestId("checklist-ai-open"));
    expect(screen.getByTestId("checklist-ai-panel").textContent).toMatch(/produto, a tarefa, todas as etapas/);
    fireEvent.click(screen.getByLabelText(/Pesquisar na internet/));
    fireEvent.click(screen.getByTestId("checklist-ai-go"));
    await waitFor(() => expect(screen.getByTestId("checklist-ai-note")).toBeInTheDocument());
    const [stepId, body] = api.suggestCatalog2StepChecklist.mock.calls[0];
    expect(stepId).toBe("s1");
    expect(body.existing).toEqual([{ kind: "execucao", text: "Item que já existia" }]);
    expect(body.use_internet).toBe(true);
    expect(body.use_internal).toBe(true);
    expect(screen.getByText("Conferir o acesso liberado")).toBeInTheDocument();
    expect(screen.getAllByTitle("Sugerido pela IA: revise").length).toBe(1);
    expect(screen.getAllByLabelText("Remover item").length).toBe(2); // o antigo e o da IA: dá para remover qualquer um
    fireEvent.click(screen.getAllByLabelText("Remover item")[1]);
    expect(screen.queryByText("Conferir o acesso liberado")).toBeNull();
  });
  it("um botão só: o de fora some quando a confirmação abre; dá para gerar só uma aba (ou as três) e sem nenhuma marcada não gera", async () => {
    api.suggestCatalog2StepChecklist.mockResolvedValueOnce({ read: ["produto"], items: [{ kind: "aprovacao", text: "Cliente confirma o resultado final", required: true }] });
    mount();
    expect(screen.getAllByRole("button", { name: /Gerar checklist com IA|Consultar e gerar/ }).length).toBe(1);
    fireEvent.click(screen.getByTestId("checklist-ai-open"));
    expect(screen.queryByTestId("checklist-ai-open")).toBeNull(); // não fica um botão em cima do outro
    expect(screen.getAllByRole("button", { name: /Gerar checklist com IA|Consultar e gerar/ }).length).toBe(1);
    const kinds = screen.getByTestId("checklist-ai-kinds");
    expect(kinds.textContent).toMatch(/Execução.*Aprovação.*Qualificação/);
    fireEvent.click(screen.getByLabelText("Execução", { selector: "fieldset input" }));
    fireEvent.click(screen.getByLabelText("Qualificação", { selector: "fieldset input" }));
    fireEvent.click(screen.getByTestId("checklist-ai-go"));
    await waitFor(() => expect(api.suggestCatalog2StepChecklist).toHaveBeenCalledTimes(1));
    expect(api.suggestCatalog2StepChecklist.mock.calls[0][1].kinds).toEqual(["aprovacao"]);
    await screen.findByTestId("checklist-ai-note");
    fireEvent.click(screen.getByTestId("checklist-ai-open"));
    fireEvent.click(screen.getByLabelText("Aprovação", { selector: "fieldset input" }));
    expect((screen.getByTestId("checklist-ai-go") as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByText("Marcar os três"));
    expect((screen.getByTestId("checklist-ai-go") as HTMLButtonElement).disabled).toBe(false);
  });
  it("erro da IA aparece com o motivo e não apaga nada", async () => {
    api.suggestCatalog2StepChecklist.mockRejectedValueOnce(new Error("A IA não está configurada neste ambiente (GEMINI_API_KEY)."));
    mount();
    fireEvent.click(screen.getByTestId("checklist-ai-open"));
    fireEvent.click(screen.getByTestId("checklist-ai-go"));
    expect((await screen.findByRole("alert")).textContent).toMatch(/GEMINI_API_KEY/);
    expect(screen.getByText("Item que já existia")).toBeInTheDocument();
  });
});
