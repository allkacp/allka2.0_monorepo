import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
const api = vi.hoisted(() => ({ getCatalog2DeliverableFiles: vi.fn(), uploadCatalog2DeliverableFile: vi.fn() }));
vi.mock("@/lib/api-client", () => ({ apiClient: api }));
import { DeliverableFilePicker } from "./deliverable-file-picker";
import { DeliverableEditorModal } from "./deliverable-modal";
import { fieldsOf } from "./catalog2-deliverable-fields";
const file = { id: "11111111-1111-4111-8111-111111111111.pdf", name: "Modelo de briefing.pdf", from: "Produto 002 · Website · Briefing" };
beforeEach(() => { vi.clearAllMocks(); api.getCatalog2DeliverableFiles.mockResolvedValue({ data: [file], has_more: false }); });

describe("Escolher arquivo-modelo já salvo", () => {
  it("lista origem, busca e reutiliza a mesma referência sem upload", async () => {
    const choose = vi.fn();
    render(<DeliverableFilePicker onChoose={choose} onClose={() => {}} />);
    expect(await screen.findByText(file.name)).toBeInTheDocument();
    expect(screen.getByText(file.from)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Buscar arquivo-modelo salvo"), { target: { value: "briefing" } });
    await waitFor(() => expect(api.getCatalog2DeliverableFiles).toHaveBeenLastCalledWith("briefing"));
    fireEvent.click(await screen.findByRole("button", { name: `Usar ${file.name}` }));
    expect(choose).toHaveBeenCalledWith(file);
    expect(api.uploadCatalog2DeliverableFile).not.toHaveBeenCalled();
  });
  it("cancelar e busca vazia não selecionam arquivo", async () => {
    api.getCatalog2DeliverableFiles.mockResolvedValue({ data: [], has_more: false });
    const choose = vi.fn(), close = vi.fn();
    render(<DeliverableFilePicker onChoose={choose} onClose={close} />);
    expect(await screen.findByText(/Nenhum arquivo-modelo salvo disponível/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar seleção" }));
    expect(close).toHaveBeenCalled(); expect(choose).not.toHaveBeenCalled();
  });
  it("falha mostra erro e permite tentar novamente", async () => {
    api.getCatalog2DeliverableFiles.mockRejectedValueOnce(new Error("offline"));
    render(<DeliverableFilePicker onChoose={() => {}} onClose={() => {}} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível carregar");
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(await screen.findByText(file.name)).toBeInTheDocument();
  });
  it("seleção no cadastro só entra no payload ao salvar; remover não apaga o arquivo compartilhado", async () => {
    const save = vi.fn(async () => {});
    render(<DeliverableEditorModal initial={fieldsOf({ name: "Documento", description: "Descrição completa" })} isNew steps={[]} context={{ taskName: "Tarefa" }} onSave={save} onClose={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /Arquivo-modelo/ }));
    fireEvent.click(screen.getByRole("button", { name: "Escolher arquivo salvo" }));
    fireEvent.click(await screen.findByRole("button", { name: `Usar ${file.name}` }));
    expect(save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("deliverable-save"));
    await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({ template_url: `file:${file.id}`, template_name: file.name }), { draft: false }));
    fireEvent.click(screen.getByRole("button", { name: "Remover" }));
    fireEvent.click(screen.getByTestId("deliverable-save"));
    await waitFor(() => expect(save).toHaveBeenLastCalledWith(expect.objectContaining({ template_url: "", template_name: "" }), { draft: false }));
    expect(api.uploadCatalog2DeliverableFile).not.toHaveBeenCalled();
  });
});
