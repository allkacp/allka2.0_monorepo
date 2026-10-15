import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
vi.mock("@/hooks/useAppFrameMetrics", () => ({ useAppFrameMetrics: () => ({ top: 0, left: 0, width: 1000, height: 800 }) }));
import { ConfirmDeleteButton, EditableVariationName } from "./variation-actions-ui";

describe("variação: editar nome e excluir", () => {
  it("Editar nome troca o texto por um campo e salva com Enter", async () => {
    const onRename = vi.fn(async () => {});
    render(<EditableVariationName name="Campanhas" readOnly={false} onRename={onRename} />);
    fireEvent.click(screen.getByTestId("variation-rename"));
    const input = screen.getByLabelText("Nome da variação");
    fireEvent.change(input, { target: { value: "Número de campanhas" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(onRename).toHaveBeenCalledWith("Número de campanhas"));
  });
  it("sem edição (somente leitura) não mostra o botão de editar nome", () => {
    render(<EditableVariationName name="Campanhas" readOnly onRename={vi.fn()} />);
    expect(screen.queryByTestId("variation-rename")).toBeNull();
  });
  it("Excluir pede confirmação antes de apagar", async () => {
    const onConfirm = vi.fn();
    render(<ConfirmDeleteButton testId="del" label="Excluir variação" title="Excluir esta variação?" onConfirm={onConfirm} />);
    fireEvent.click(screen.getByTestId("del"));
    expect(onConfirm).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByText("Excluir", { selector: "button" }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalled());
  });
});
