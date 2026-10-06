import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { StepChecklistDialog, checklistCount, type ChecklistItem } from "./catalog2-step-checklist-ui";

const base: ChecklistItem[] = [{ id: "a", text: "Conferir destino", kind: "execucao", required: true }];

describe("Checklist da etapa (janelinha)", () => {
  it("mostra os itens do tipo escolhido, adiciona item de aprovação e devolve a lista ao salvar", () => {
    const onSave = vi.fn();
    render(<StepChecklistDialog open title="Etapa X" value={base} onClose={() => {}} onSave={onSave} />);
    expect(screen.getByText("Conferir destino")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: /Aprovação/ }));
    expect(screen.queryByText("Conferir destino")).not.toBeInTheDocument();
    const input = screen.getByLabelText("Novo item do checklist");
    fireEvent.change(input, { target: { value: "Cliente aprova o criativo" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByText("Cliente aprova o criativo")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Salvar checklist" }));
    const saved = onSave.mock.calls[0][0] as ChecklistItem[];
    expect(saved).toHaveLength(2);
    expect(saved[1]).toMatchObject({ text: "Cliente aprova o criativo", kind: "aprovacao", required: true });
  });

  it("remove item, marca como não obrigatório e, só leitura, não mostra campos de edição", () => {
    const onSave = vi.fn();
    const { rerender } = render(<StepChecklistDialog open title="E" value={base} onClose={() => {}} onSave={onSave} />);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Salvar checklist" }));
    expect((onSave.mock.calls[0][0] as ChecklistItem[])[0].required).toBe(false);
    rerender(<StepChecklistDialog open title="E" value={base} readOnly onClose={() => {}} onSave={onSave} />);
    expect(screen.queryByLabelText("Novo item do checklist")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Salvar checklist" })).not.toBeInTheDocument();
  });

  it("checklistCount tolera valor ausente", () => {
    expect(checklistCount(undefined)).toBe(0);
    expect(checklistCount(base)).toBe(1);
  });
});
