import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const clear = vi.fn(async () => ({ ok: true }));
const snapshots = vi.fn(async () => ({ data: [{ event_id: "ev1", created_at: "2026-10-14T12:00:00Z", steps: 2, deliverables: 1, step_names: ["A", "B"] }], task_is_empty: true }));
const restore = vi.fn(async () => ({ ok: true }));
vi.mock("@/lib/api-client", () => ({ apiClient: { clearCatalog2Task: (...a: unknown[]) => (clear as any)(...a), getCatalog2TaskClearSnapshots: (...a: unknown[]) => (snapshots as any)(...a), restoreCatalog2Task: (...a: unknown[]) => (restore as any)(...a) } }));
import { ClearTaskButton, RestoreTaskPanel } from "./task-clear";

const act = async (fn: () => Promise<any>) => fn();
beforeEach(() => { clear.mockClear(); restore.mockClear(); });

describe("limpar tarefa (dupla confirmação) e restaurar", () => {
  it("só limpa depois de ler o aviso, digitar o nome exato e LIMPAR; nada é chamado antes", async () => {
    render(<ClearTaskButton task={{ id: "t1", name: "Relatório mensal", steps: [{}, {}], deliverables: [{}] }} act={act} />);
    fireEvent.click(screen.getByTestId("clear-task-open"));
    const text = screen.getByTestId("clear-task-dialog").textContent ?? "";
    expect(text).toMatch(/2 etapas e 1 entregável/);
    expect(text).toMatch(/continua no produto/);
    expect(text).toMatch(/restaurado/);
    fireEvent.click(screen.getByText("Continuar"));
    const confirm = screen.getByTestId("clear-task-confirm") as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Nome da tarefa para confirmar"), { target: { value: "Relatorio" } });
    fireEvent.change(screen.getByLabelText("Digite LIMPAR"), { target: { value: "LIMPAR" } });
    expect(confirm.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Nome da tarefa para confirmar"), { target: { value: "Relatório mensal" } });
    expect(confirm.disabled).toBe(false);
    expect(clear).not.toHaveBeenCalled();
    fireEvent.click(confirm);
    await waitFor(() => expect(clear).toHaveBeenCalledWith("t1", { confirm_name: "Relatório mensal", confirm_phrase: "LIMPAR" }));
  });
  it("tarefa vazia com fotografia no histórico mostra Restaurar; tarefa com etapas não mostra", async () => {
    const { rerender } = render(<RestoreTaskPanel task={{ id: "t1", steps: [] }} act={act} />);
    expect(await screen.findByTestId("restore-task")).toBeTruthy();
    fireEvent.click(screen.getByText("Restaurar tarefa"));
    await waitFor(() => expect(restore).toHaveBeenCalledWith("t1", "ev1"));
    rerender(<RestoreTaskPanel task={{ id: "t1", steps: [{ id: "s" }] }} act={act} />);
    await waitFor(() => expect(screen.queryByTestId("restore-task")).toBeNull());
  });
});
