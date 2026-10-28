import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { OpenScreensProvider } from "@/contexts/open-screens-context";
vi.mock("@/lib/api-client", () => ({
  apiClient: { getOperationalTasks: vi.fn(), getOperationalTask: vi.fn(), getProjects: vi.fn().mockResolvedValue({ data: [] }), getNomades: vi.fn().mockResolvedValue({ data: [] }), getProject: vi.fn(), transferProjectTask: vi.fn(), updateProjectTask: vi.fn() },
  ApiError: class extends Error {},
}));
vi.mock("@/components/tarefa-detail-drawer", () => ({ TarefaDetailDrawer: ({ open, tarefa, onClose }: any) => open ? <section aria-label="Detalhes da tarefa">{tarefa.title}<button onClick={onClose}>Fechar teste</button></section> : null }));
vi.mock("@/components/project-management-modal", () => ({ ProjectManagementModal: () => null }));
vi.mock("@/components/project-view-slide-panel", () => ({ ProjectViewSlidePanel: () => null }));
vi.mock("@/components/task-launch-drawer", () => ({ TaskLaunchDrawer: () => null }));
import { apiClient } from "@/lib/api-client";
import Page from "./page";
const task = (id: string, title: string, status: string) => ({
  id, title, task_code: id, code_snapshot: id, status, priority: "MEDIA", due_date: null, start_date: null,
  estimated_hours: 1, sort_order: 0, created_at: "2026-10-27T10:00:00Z", updated_at: "2026-10-27T10:00:00Z",
  project_id: "p1", project_product_id: "pp1", nomade_responsavel: null, responsavel_agencia: null,
  project: { id: "p1", title: "Projeto cadastrado", status: "ACTIVE", client: null },
  project_product: { id: "pp1", product_name_snapshot: "Produto cadastrado", product_code_snapshot: null, product_category_snapshot: null, status: "ACTIVE" },
  catalog_task: null, _count: { stages: 2, briefing_answers: 0, attachments: 0 },
});
const tasks = [task("tar_11", "Briefing", "PARA_LANCAMENTO"), task("tar_12", "Produzir", "EM_EXECUCAO")];
beforeEach(() => {
  localStorage.clear(); vi.clearAllMocks();
  vi.mocked(apiClient.getOperationalTasks).mockResolvedValue({ data: tasks, total: 2 } as any);
  vi.mocked(apiClient.getOperationalTask).mockResolvedValue(tasks[0] as any);
});
afterEach(cleanup);
function mount() {
  return render(<MemoryRouter initialEntries={["/admin/tarefas"]}><SidebarProvider><OpenScreensProvider><Routes><Route path="/admin/tarefas" element={<Page />} /><Route path="/admin/tarefas/:tarefaId" element={<Page />} /></Routes></OpenScreensProvider></SidebarProvider></MemoryRouter>);
}
describe("Tarefas — Referência Clientes", () => {
  it("preserva oito indicadores e reserva 96px para três ações à direita", async () => {
    const view = mount(); await screen.findByText("Briefing");
    expect(within(screen.getByTestId("task-reference-stats")).getAllByRole("button")).toHaveLength(8);
    const table = view.container.querySelector("table")!;
    expect(table).toHaveClass("tasks-reference-table", "tabela-cartao");
    expect((table.querySelector("col:last-child") as HTMLElement).style.width).toBe("96px");
    expect(table.querySelector("thead th:last-child")).toHaveTextContent("Ações");
    const row = table.querySelector("tbody tr")!;
    expect(row.lastElementChild).toHaveClass("task-reference-actions");
    expect(within(row.lastElementChild as HTMLElement).getAllByRole("button")).toHaveLength(3);
  });
  it("indicadores continuam filtrando e Total restaura a lista", async () => {
    const user = userEvent.setup(); mount(); await screen.findByText("Briefing");
    const stats = within(screen.getByTestId("task-reference-stats"));
    await user.click(stats.getByRole("button", { name: /Em execução/ }));
    expect(screen.queryByText("Briefing")).not.toBeInTheDocument();
    expect(screen.getByText("Produzir")).toBeInTheDocument();
    await user.click(stats.getByRole("button", { name: /Total/ }));
    expect(screen.getByText("Briefing")).toBeInTheDocument();
  });
  it("busca mantém dados e não dispara alteração", async () => {
    const user = userEvent.setup(); mount(); await screen.findByText("Briefing");
    await user.type(screen.getByPlaceholderText("Buscar tarefa, projeto, cliente, nômade..."), "Briefing");
    expect(screen.queryByText("Produzir")).not.toBeInTheDocument();
    expect(apiClient.updateProjectTask).not.toHaveBeenCalled();
  });
  it("menu preserva Lançar apenas para tarefa liberada e mantém transferência", async () => {
    const user = userEvent.setup(); mount(); await screen.findByText("Briefing");
    await user.click(screen.getByRole("button", { name: "Mais ações — Briefing" }));
    expect(screen.getByRole("menuitem", { name: /Lançar/ })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Transferir/ })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "Mais ações — Produzir" }));
    expect(screen.queryByRole("menuitem", { name: /Lançar/ })).not.toBeInTheDocument();
    expect(apiClient.updateProjectTask).not.toHaveBeenCalled();
  });
});
