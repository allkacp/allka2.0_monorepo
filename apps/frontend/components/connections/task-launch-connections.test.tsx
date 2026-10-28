import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Conexões na hora de LANÇAR a tarefa (versão compacta): uma linha por conexão, "Conectar agora", "Fazer depois" e ⓘ com os detalhes.
// A contratação não pergunta mais nada; aqui o cliente resolve — e nada disso trava o lançamento.

const { api, conta } = vi.hoisted(() => ({
  api: {
    getProjectConnectionRequirements: vi.fn(),
    getConnectionRequirement: vi.fn(),
    setConnectionHandling: vi.fn(),
    createAndLinkConnection: vi.fn(),
    linkConnectionRequirement: vi.fn(),
    startConnectionOAuth: vi.fn(),
  },
  conta: { tipo: "agencias" as string },
}));
vi.mock("@/lib/api-client", () => ({ apiClient: api }));
vi.mock("@/lib/conta-logada", () => ({ tipoDaContaLogada: () => conta.tipo }));

import { TaskLaunchConnections } from "./task-launch-connections";

const wp = {
  id: "pcr-wp", label: "WordPress", status: "awaiting_submission", status_label: "Aguardando envio", handling: null, connection_id: null,
  action: { kind: "connect", label: "Conectar agora" }, when_label: "Antes de determinada etapa", method_label: "Usuário temporário (permissão mínima)", permission_level: "editor",
  impact: "1 atividade(s) bloqueada(s).", problem: null, correction: null,
  tasks: [{ id: "task-1", title: "Alteração de Website", kind: "start", kind_label: "Necessária para iniciar", state: "missing", reason: "Necessária para executar parte do serviço contratado." }],
};
const ga = { ...wp, id: "pcr-ga", label: "Google Analytics", tasks: [{ ...wp.tasks[0], id: "task-OUTRA", title: "Outra tarefa" }] };
const done = { ...wp, id: "pcr-ok", label: "Hospedagem", status: "valid", status_label: "Válida" };

beforeEach(() => {
  vi.clearAllMocks();
  conta.tipo = "agencias";
  api.getProjectConnectionRequirements.mockResolvedValue({ data: [wp, ga] });
  api.getConnectionRequirement.mockResolvedValue({ instructions: ["Crie um usuário temporário só para a Allka."], reuse_candidates: [], allowed_methods: ["temporary_user"], permission_levels: [{ key: "editor", label: "Editor" }], fields: [] });
  api.setConnectionHandling.mockResolvedValue({ ok: true });
});

describe("TaskLaunchConnections", () => {
  it("mostra UMA linha por conexão que afeta esta tarefa (as de outras tarefas ficam de fora)", async () => {
    render(<TaskLaunchConnections projectId="proj-1" taskId="task-1" />);
    const lines = await screen.findAllByTestId("launch-connection");
    expect(lines).toHaveLength(1);
    expect(within(lines[0]).getByText("WordPress")).toBeInTheDocument();
    expect(within(lines[0]).getByRole("button", { name: "Conectar agora" })).toBeInTheDocument();
    expect(within(lines[0]).getByRole("button", { name: "Fazer depois" })).toBeInTheDocument();
    expect(screen.queryByText("Google Analytics")).not.toBeInTheDocument();
    expect(api.getProjectConnectionRequirements).toHaveBeenCalledWith("proj-1");
  });

  it("'Fazer depois' registra e a linha passa a dizer 'Fica para depois' — sem travar nada", async () => {
    const user = userEvent.setup();
    // depois de gravar, o servidor passa a devolver a escolha "later" (a tela recarrega a lista)
    api.setConnectionHandling.mockImplementation(async () => {
      api.getProjectConnectionRequirements.mockResolvedValue({ data: [{ ...wp, handling: "later" }] });
      return { ok: true };
    });
    render(<TaskLaunchConnections projectId="proj-1" taskId="task-1" />);
    await user.click(await screen.findByRole("button", { name: "Fazer depois" }));
    expect(api.setConnectionHandling).toHaveBeenCalledWith("pcr-wp", { handling: "later" });
    await waitFor(() => expect(screen.getByTestId("launch-connection-later")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Fazer depois" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Conectar agora" })).toBeInTheDocument();
  });

  it("o ⓘ abre todos os detalhes (por quê, quando, forma, permissão, atividade, instruções) e fecha de novo", async () => {
    const user = userEvent.setup();
    render(<TaskLaunchConnections projectId="proj-1" taskId="task-1" />);
    const info = await screen.findByTestId("launch-connection-info");
    expect(screen.queryByTestId("launch-connection-details")).not.toBeInTheDocument();
    await user.click(info);
    const d = await screen.findByTestId("launch-connection-details");
    expect(d.textContent).toContain("Necessária para executar parte do serviço contratado.");
    expect(d.textContent).toContain("Antes de determinada etapa");
    expect(d.textContent).toContain("Usuário temporário (permissão mínima)");
    expect(d.textContent).toContain("editor");
    expect(d.textContent).toContain("Alteração de Website");
    await waitFor(() => expect(d.textContent).toContain("Crie um usuário temporário só para a Allka."));
    await user.click(info);
    expect(screen.queryByTestId("launch-connection-details")).not.toBeInTheDocument();
  });

  it("'Conectar agora' abre o formulário na própria linha", async () => {
    const user = userEvent.setup();
    render(<TaskLaunchConnections projectId="proj-1" taskId="task-1" />);
    await user.click(await screen.findByRole("button", { name: "Conectar agora" }));
    expect(await screen.findByTestId("connect-form")).toBeInTheDocument();
    expect(api.getConnectionRequirement).toHaveBeenCalledWith("pcr-wp");
  });

  it("conexão já válida mostra 'Conectada' e nenhum botão de ação", async () => {
    api.getProjectConnectionRequirements.mockResolvedValue({ data: [done] });
    render(<TaskLaunchConnections projectId="proj-1" taskId="task-1" />);
    expect(await screen.findByTestId("launch-connection-ok")).toHaveTextContent("Conectada");
    expect(screen.queryByRole("button", { name: "Conectar agora" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Fazer depois" })).not.toBeInTheDocument();
    expect(screen.getByText("tudo certo")).toBeInTheDocument();
  });

  it("tarefa sem exigência de conexão: o bloco não aparece", async () => {
    api.getProjectConnectionRequirements.mockResolvedValue({ data: [ga] });
    const { container } = render(<TaskLaunchConnections projectId="proj-1" taskId="task-1" />);
    await waitFor(() => expect(api.getProjectConnectionRequirements).toHaveBeenCalled());
    await waitFor(() => expect(container.querySelector('[data-testid="task-launch-connections"]')).toBeNull());
  });

  it("só empresa/agência resolve conexão: admin não vê o bloco nem chama a API", async () => {
    conta.tipo = "admin";
    const { container } = render(<TaskLaunchConnections projectId="proj-1" taskId="task-1" />);
    await waitFor(() => expect(container.querySelector('[data-testid="task-launch-connections"]')).toBeNull());
    expect(api.getProjectConnectionRequirements).not.toHaveBeenCalled();
  });

  it("falha ao carregar não derruba o lançamento (bloco some)", async () => {
    api.getProjectConnectionRequirements.mockRejectedValue(new Error("Módulo desligado"));
    const { container } = render(<TaskLaunchConnections projectId="proj-1" taskId="task-1" />);
    await waitFor(() => expect(api.getProjectConnectionRequirements).toHaveBeenCalled());
    await waitFor(() => expect(container.querySelector('[data-testid="task-launch-connections"]')).toBeNull());
  });
});
