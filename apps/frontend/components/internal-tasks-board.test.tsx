import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const upd = vi.fn(async () => ({}));
vi.mock("@/lib/api-client", () => ({ apiClient: {
  getInternalTasks: async () => ({ data: [{ id: "a", title: "Fazer relatório", status: "todo", priority: "high", due_date: null, assignee_user_id: "u1", checklist: [{ id: "1", text: "x", done: true }, { id: "2", text: "y", done: false }], overdue: false, source_kind: null }, { id: "b", title: "Atrasada", status: "doing", priority: "urgent", due_date: "2026-09-01T12:00:00Z", assignee_user_id: null, checklist: [], overdue: true, source_kind: "plac_step" }] }),
  getInternalTasksSummary: async () => ({ open: 2, late: 1, due_soon: 0, mine: 1, doing: 1 }),
  getInternalTaskMembers: async () => ({ data: [{ id: "u1", name: "Ana" }] }),
  updateInternalTask: (...a: unknown[]) => (upd as any)(...a), createInternalTask: vi.fn(), deleteInternalTask: vi.fn(), getInternalTaskComments: async () => ({ data: [] }), addInternalTaskComment: vi.fn(),
} }));
import { InternalTasksBoard, groupByStatus } from "./internal-tasks-board";

describe("Tarefas internas (quadro)", () => {
  it("agrupa por status", () => {
    expect(Object.keys(groupByStatus([{ status: "todo" }, { status: "done" }]))).toEqual(["todo", "doing", "blocked", "done"]);
  });
  it("mostra colunas, resumo, responsável, checklist e move a tarefa", async () => {
    render(<InternalTasksBoard />);
    expect(await screen.findByText("Fazer relatório")).toBeInTheDocument();
    expect(screen.getByText("Atrasadas: 1")).toBeInTheDocument();
    expect(screen.getByText("Ana")).toBeInTheDocument();
    expect(screen.getByText("1/2")).toBeInTheDocument();
    expect(screen.getByText("PLAC")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Mover Fazer relatório"), { target: { value: "doing" } });
    await waitFor(() => expect(upd).toHaveBeenCalledWith("a", { status: "doing" }));
    fireEvent.click(screen.getByTestId("new-internal-task"));
    expect(await screen.findByTestId("internal-task-dialog")).toBeInTheDocument();
  });
});
