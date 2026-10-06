import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const api = {
  getTaskFlowPanel: vi.fn(),
  decideStage: vi.fn(async () => ({})),
  releaseNextStage: vi.fn(async () => ({})),
  warnStageClient: vi.fn(async () => ({})),
  getStageHistory: vi.fn(async () => ({ data: [] })),
  decideApprovalGate: vi.fn(async () => ({})),
  getSlaReasons: vi.fn(async () => ({ reasons: [{ key: "acesso_nao_liberado", label: "Acesso não liberado" }], responsibles: [{ key: "client", label: "Cliente" }] })),
  pauseSla: vi.fn(async () => ({})),
  resumeSla: vi.fn(async () => ({})),
};
vi.mock("@/lib/api-client", () => ({ apiClient: new Proxy({}, { get: (_t, k: string) => (api as any)[k] }) }));
import { TaskStagesPanel } from "./task-stages-panel";

const stage = (over: Record<string, unknown>) => ({ id: "s1", titulo: "Layout", status: "EM_QUALIFICACAO", ordem: 1, position: 1, rodada_ajuste: 0, can_qualify: false, can_approve: false, can_release: false, can_warn_client: false, ...over });
const flow = (over: Record<string, unknown> = {}) => ({ task: { id: "t", stage_execution: "stage" }, viewer: { kind: "leader", can_manage_sla: true }, stages: [stage({ can_qualify: true })], approval_gates: [], sla: [], inputs: [], ...over });

describe("Painel operacional da tarefa (A8b fase 5)", () => {
  beforeEach(() => { Object.values(api).forEach((f: any) => f.mockClear?.()); });

  it("líder: aprova a qualificação e pede ajuste (motivo obrigatório)", async () => {
    api.getTaskFlowPanel.mockResolvedValue(flow());
    render(<TaskStagesPanel taskId="t" status="EM_EXECUCAO" />);
    await screen.findByText("Layout");
    expect(screen.getByText("Aguardando qualificação do líder")).toBeInTheDocument();
    const pedir = screen.getByRole("button", { name: "Pedir ajuste" }) as HTMLButtonElement;
    expect(pedir.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Comentário da etapa 1"), { target: { value: "Falta o rodapé" } });
    expect(pedir.disabled).toBe(false);
    fireEvent.click(pedir);
    await waitFor(() => expect(api.decideStage).toHaveBeenCalledWith("t", "s1", "qualificacao", "reprovar", "Falta o rodapé"));
    fireEvent.click(screen.getByRole("button", { name: /Aprovar qualificação/ }));
    await waitFor(() => expect(api.decideStage).toHaveBeenCalledWith("t", "s1", "qualificacao", "aprovar", undefined));
  });

  it("cliente: só vê o botão de aprovar a etapa quando o servidor liberou; não vê botões de líder nem etapa interna", async () => {
    api.getTaskFlowPanel.mockResolvedValue(flow({ viewer: { kind: "company", can_manage_sla: false }, stages: [stage({ status: "EM_APROVACAO_CLIENTE", can_approve: true })] }));
    render(<TaskStagesPanel taskId="t" status="EM_EXECUCAO" />);
    fireEvent.click(await screen.findByRole("button", { name: /Aprovar etapa/ }));
    await waitFor(() => expect(api.decideStage).toHaveBeenCalledWith("t", "s1", "aprovacao", "aprovar", undefined));
    expect(screen.queryByRole("button", { name: /Liberar a próxima/ })).toBeNull();
    expect(screen.queryByLabelText("Motivo da pausa")).toBeNull();
  });

  it("líder: libera a próxima etapa e avisa o cliente sobre etapa interna; portões e prazos aparecem com ações", async () => {
    api.getTaskFlowPanel.mockResolvedValue(flow({
      stages: [stage({ id: "a", status: "CONCLUIDA", can_qualify: false, can_release: true, titulo: "Briefing" }), stage({ id: "b", titulo: "Acessos", status: "EM_ANDAMENTO", interna: true, can_warn_client: true, position: 2 })],
      approval_gates: [{ id: "g1", name: "Cliente aprova criativos", status: "pendente", position_label: "Antes de publicar", approver_label: "Cliente", requires_comment: true, can_decide: true }],
      sla: [{ id: "c1", scope_label: "Implantação inicial", amount: 7, unit_label: "dias úteis", status: "correndo", due_at: "2026-10-20T12:00:00Z", pauses: [] }],
      inputs: [{ id: "i1", label: "Arte aprovada", link_url: "https://exemplo.com/arte" }],
    }));
    render(<TaskStagesPanel taskId="t" status="EM_EXECUCAO" />);
    fireEvent.click(await screen.findByRole("button", { name: /Liberar a próxima etapa/ }));
    await waitFor(() => expect(api.releaseNextStage).toHaveBeenCalledWith("t", "a"));
    expect(screen.getByText("Interna (cliente não vê)")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Aviso ao cliente sobre a etapa 2"), { target: { value: "O acesso está errado" } });
    fireEvent.click(screen.getByRole("button", { name: "Avisar o cliente" }));
    await waitFor(() => expect(api.warnStageClient).toHaveBeenCalledWith("t", "b", "O acesso está errado"));
    // portão: comentário obrigatório antes de aprovar
    const aprovar = screen.getAllByRole("button", { name: "Aprovar" })[0] as HTMLButtonElement;
    expect(aprovar.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Comentário do portão Cliente aprova criativos"), { target: { value: "ok" } });
    fireEvent.click(aprovar);
    await waitFor(() => expect(api.decideApprovalGate).toHaveBeenCalledWith("g1", "approve", "ok"));
    // SLA: pausar e retomar
    await screen.findByText("Implantação inicial");
    fireEvent.click(await screen.findByRole("button", { name: /Pausar prazo/ }));
    await waitFor(() => expect(api.pauseSla).toHaveBeenCalledWith("t", { reason: "acesso_nao_liberado", responsible_party: "client", note: undefined }));
    fireEvent.click(screen.getByRole("button", { name: /Retomar prazo/ }));
    await waitFor(() => expect(api.resumeSla).toHaveBeenCalledWith("t"));
    expect(screen.getByRole("link", { name: /Abrir entregável de origem/ })).toHaveAttribute("href", "https://exemplo.com/arte");
  });

  it("não aparece nada quando a tarefa não usa etapas por execução e não tem portões, prazos nem entradas", async () => {
    api.getTaskFlowPanel.mockResolvedValue(flow({ task: { id: "t", stage_execution: "task" }, stages: [] }));
    const { container } = render(<TaskStagesPanel taskId="t" status="EM_EXECUCAO" />);
    await waitFor(() => expect(api.getTaskFlowPanel).toHaveBeenCalled());
    expect(container.querySelector("[data-testid=task-stages-panel]")).toBeNull();
  });
});
