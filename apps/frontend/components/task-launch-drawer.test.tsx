import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { TaskLaunchDrawer } from "./task-launch-drawer";

const api = vi.hoisted(() => ({
  getProjectDocuments: vi.fn(), launchProjectTask: vi.fn(),
  getProjectTaskBriefing: vi.fn(), getProjectTaskAttachments: vi.fn(),
  submitProjectTaskBriefing: vi.fn(),
}));
vi.mock("@/lib/api-client", () => ({ apiClient: api }));
vi.mock("@/components/connections/task-launch-connections", () => ({ TaskLaunchConnections: () => null }));
vi.mock("@/components/framed-panel", () => ({
  FramedPanel: ({ children, title, testId }: any) => <div role="dialog" aria-label={title} data-testid={testId}>{children}</div>,
}));
const task = { id: "task-test", title: "SEO teste", task_code: "T015720", status: "EM_LANCAMENTO", project_id: "project-test", project: { title: "Projeto teste", client_record: { name: "Cliente vinculado" } } };

beforeEach(() => {
  vi.clearAllMocks();
  api.getProjectDocuments.mockResolvedValue({ documents: [] });
  api.getProjectTaskBriefing.mockResolvedValue({ briefing_questions: [], answers: [] });
  api.getProjectTaskAttachments.mockResolvedValue({ data: [] });
  api.submitProjectTaskBriefing.mockResolvedValue({ ...task, status: "LANCAMENTO_ENVIADO_PARA_ANALISE" });
});

describe("Lançamento da tarefa — moldura e envio", () => {
  it("abre no Painel Moldura e fecha pelo X sem submeter", async () => {
    const onClose = vi.fn();
    render(<TaskLaunchDrawer task={task} onClose={onClose} onReleased={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: "Lançamento da tarefa" })).toBeInTheDocument();
    expect(await screen.findByText("Cliente vinculado")).toBeInTheDocument();
    await userEvent.click(await screen.findByRole("button", { name: "Fechar" }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(api.submitProjectTaskBriefing).not.toHaveBeenCalled();
  });

  it("envia o briefing e avisa o estado de análise, nunca de execução", async () => {
    const onReleased = vi.fn();
    const onTaskUpdated = vi.fn();
    render(<TaskLaunchDrawer task={task} onClose={vi.fn()} onReleased={onReleased} onTaskUpdated={onTaskUpdated} />);
    await userEvent.click(await screen.findByRole("button", { name: /Responder pergunta por pergunta/ }));
    await userEvent.click(screen.getByRole("button", { name: "Enviar briefing para análise" }));
    await waitFor(() => expect(onReleased).toHaveBeenCalledWith(task.id));
    expect(onTaskUpdated).toHaveBeenCalledWith(expect.objectContaining({ status: "LANCAMENTO_ENVIADO_PARA_ANALISE" }));
  });

  it("erro de envio mantém o formulário e não sinaliza sucesso", async () => {
    api.submitProjectTaskBriefing.mockRejectedValue(new Error("Envio indisponível"));
    const onReleased = vi.fn();
    render(<TaskLaunchDrawer task={task} onClose={vi.fn()} onReleased={onReleased} />);
    await userEvent.click(await screen.findByRole("button", { name: /Responder pergunta por pergunta/ }));
    await userEvent.click(screen.getByRole("button", { name: "Enviar briefing para análise" }));
    expect(await screen.findByText("Envio indisponível")).toBeInTheDocument();
    expect(onReleased).not.toHaveBeenCalled();
  });

  it("lista respeita o fechamento do painel e não libera execução após briefing", () => {
    const source = readFileSync("app/admin/tarefas/page.tsx", "utf8");
    expect(source).toContain("launchDrawerOpen && launchTask && (");
    const released = source.slice(source.indexOf("const handleReleased"), source.indexOf("const handleNomadeAssigned"));
    expect(released).toContain('status: "LANCAMENTO_ENVIADO_PARA_ANALISE"');
    expect(released).not.toContain('status: "LIBERADA_PARA_EXECUCAO"');
    expect(source).toContain('isAdmin={routeBase.startsWith("/admin/")}');
    expect(source).toContain('label: "Briefing em análise"');
  });
});
