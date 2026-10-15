import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { UnsavedChangesDialog } from "./unsaved-dialog";

const base = { labels: ["Etapa 2 — Montar relatório"], hasNewVersion: false, draftChanged: true, onSave: vi.fn(), onDiscard: vi.fn(), onCancel: vi.fn() };

describe("confirmação de itens não salvos", () => {
  it("ao salvar rascunho: lista o que está aberto e só oferece salvar tudo ou cancelar", () => {
    const onSave = vi.fn(); const onCancel = vi.fn();
    render(<UnsavedChangesDialog {...base} mode="draft" onSave={onSave} onCancel={onCancel} />);
    expect(screen.getByTestId("unsaved-list").textContent).toMatch(/Montar relatório/);
    expect(screen.queryByText("Travar sem salvar")).toBeNull();
    fireEvent.click(screen.getByText("Salvar tudo e salvar rascunho"));
    expect(onSave).toHaveBeenCalled();
    fireEvent.click(screen.getByText("Cancelar"));
    expect(onCancel).toHaveBeenCalled();
  });
  it("ao travar: pergunta se salva, trava sem salvar ou continua editando", () => {
    const onSave = vi.fn(); const onDiscard = vi.fn(); const onCancel = vi.fn();
    render(<UnsavedChangesDialog {...base} mode="lock" onSave={onSave} onDiscard={onDiscard} onCancel={onCancel} />);
    expect(screen.getByText(/Deseja salvar antes de travar a edição/)).toBeTruthy();
    expect(screen.getByText(/salvar a etapa não salva o rascunho/)).toBeTruthy();
    fireEvent.click(screen.getByText("Travar sem salvar"));
    expect(onDiscard).toHaveBeenCalled();
    fireEvent.click(screen.getByText("Salvar rascunho e travar"));
    expect(onSave).toHaveBeenCalled();
    fireEvent.click(screen.getByText("Continuar editando"));
    expect(onCancel).toHaveBeenCalled();
  });
  it("nova versão ainda não salva: avisa que será descartada", () => {
    render(<UnsavedChangesDialog {...base} mode="close" labels={[]} hasNewVersion />);
    expect(screen.getByText(/nova versão é descartada/)).toBeTruthy();
  });
});
