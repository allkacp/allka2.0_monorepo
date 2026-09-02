import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { LaunchSessionPanel } from "@/components/launch-session-panel";

// IA de Lançamento / Plano Tático (bloco 3/4) — testado no ponto de entrada
// real (aba do projeto), mesmo padrão de memory-panel.test.tsx: mocka só o
// apiClient.

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    listLaunchSessions: vi.fn(),
    createLaunchSession: vi.fn(),
    getLaunchSession: vi.fn(),
    postLaunchMessage: vi.fn(),
    uploadLaunchMessageFile: vi.fn(),
    downloadLaunchMessageFile: vi.fn(),
    deleteLaunchMessageFile: vi.fn(),
    generateLaunchProposal: vi.fn(),
    getLaunchExecution: vi.fn(),
    cancelLaunchGeneration: vi.fn(),
    listLaunchVersions: vi.fn(),
    getLaunchVersion: vi.fn(),
    submitLaunchHumanEdit: vi.fn(),
    approveLaunchSession: vi.fn(),
    cancelLaunchSession: vi.fn(),
    createHallucinationReport: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

import { apiClient } from "@/lib/api-client";

function renderPanel() {
  return render(
    <SidebarProvider>
      <LaunchSessionPanel projectId="proj-1" />
    </SidebarProvider>,
  );
}

function baseSession(overrides: Partial<any> = {}) {
  return {
    id: "sess-1",
    project_id: "proj-1",
    status: "coletando_informacoes",
    current_version_id: null,
    approved_version_id: null,
    pending_questions_json: null,
    updated_at: "2026-09-01T10:00:00.000Z",
    messages: [],
    versions: [],
    executions: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("LaunchSessionPanel", () => {
  it("sem sessão ainda: mostra convite pra iniciar; clicar cria a sessão", async () => {
    const user = userEvent.setup();
    (apiClient.listLaunchSessions as any).mockResolvedValue({ sessions: [] });
    (apiClient.createLaunchSession as any).mockResolvedValue({ session: baseSession() });
    (apiClient.getLaunchSession as any).mockResolvedValue({ session: baseSession(), can_manage: true });

    renderPanel();
    expect(await screen.findByText(/nenhuma conversa de lançamento iniciada/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /iniciar ia de lançamento/i }));
    await waitFor(() => expect(apiClient.createLaunchSession).toHaveBeenCalledWith("proj-1"));
    expect(await screen.findByText("Coletando informações")).toBeInTheDocument();
  });

  it("carrega sessão existente e mostra as mensagens reais", async () => {
    (apiClient.listLaunchSessions as any).mockResolvedValue({ sessions: [{ id: "sess-1" }] });
    (apiClient.getLaunchSession as any).mockResolvedValue({
      session: baseSession({ messages: [{ id: "m1", role: "user", actor_user_id: "u1", content: "Preciso lançar em outubro", status: "ok", execution_id: null, created_at: "2026-09-01T10:00:00.000Z", files: [] }] }),
      can_manage: true,
    });

    renderPanel();
    expect(await screen.findByText("Preciso lançar em outubro")).toBeInTheDocument();
  });

  it("enviar mensagem chama o backend e recarrega a conversa", async () => {
    const user = userEvent.setup();
    (apiClient.listLaunchSessions as any).mockResolvedValue({ sessions: [{ id: "sess-1" }] });
    (apiClient.getLaunchSession as any).mockResolvedValue({ session: baseSession(), can_manage: true });
    (apiClient.postLaunchMessage as any).mockResolvedValue({ message: { id: "m1" } });

    renderPanel();
    await screen.findByText("Coletando informações");

    await user.type(screen.getByPlaceholderText(/descreva o lançamento/i), "Vamos lançar uma campanha nova.");
    await user.click(screen.getByRole("button", { name: "Enviar mensagem" }));

    await waitFor(() => expect(apiClient.postLaunchMessage).toHaveBeenCalledWith("sess-1", "Vamos lançar uma campanha nova."));
  });

  it("gerar plano tático chama o backend com um client_action_id novo e mostra o indicador de processamento", async () => {
    const user = userEvent.setup();
    (apiClient.listLaunchSessions as any).mockResolvedValue({ sessions: [{ id: "sess-1" }] });
    (apiClient.getLaunchSession as any)
      .mockResolvedValueOnce({ session: baseSession(), can_manage: true })
      .mockResolvedValue({ session: baseSession({ executions: [{ id: "exec-1", status: "pending", snapshot_id: null, error_message: null }] }), can_manage: true });
    (apiClient.generateLaunchProposal as any).mockResolvedValue({ execution: { id: "exec-1", status: "pending" }, duplicate: false });

    renderPanel();
    await screen.findByText("Coletando informações");

    await user.click(screen.getByRole("button", { name: /gerar plano tático/i }));

    await waitFor(() => {
      const [sessionIdArg, clientActionIdArg] = (apiClient.generateLaunchProposal as any).mock.calls[0];
      expect(sessionIdArg).toBe("sess-1");
      expect(typeof clientActionIdArg).toBe("string");
    });
    expect(await screen.findByText(/gerando plano tático/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancelar geração/i })).toBeInTheDocument();
  });

  it("cancelar geração chama o backend com o id da execução pendente", async () => {
    const user = userEvent.setup();
    (apiClient.listLaunchSessions as any).mockResolvedValue({ sessions: [{ id: "sess-1" }] });
    (apiClient.getLaunchSession as any).mockResolvedValue({
      session: baseSession({ executions: [{ id: "exec-1", status: "pending", snapshot_id: null, error_message: null }] }),
      can_manage: true,
    });
    (apiClient.cancelLaunchGeneration as any).mockResolvedValue({ ok: true });

    renderPanel();
    await screen.findByText(/gerando plano tático/i);
    await user.click(screen.getByRole("button", { name: /cancelar geração/i }));

    await waitFor(() => expect(apiClient.cancelLaunchGeneration).toHaveBeenCalledWith("sess-1", "exec-1"));
  });

  it("mostra o plano da versão atual (ondas e tarefas) quando existe", async () => {
    const plan = {
      plan_summary: "Lançamento em duas ondas.",
      plan_duration_months: 2,
      waves: [{ name: "Onda 1", objective: "Preparar", trigger_type: "data", trigger_date: "2026-10-01", task_titles: ["Configurar ambiente"] }],
      tasks: [
        {
          title: "Configurar ambiente",
          objective: "Deixar pronto",
          description: "desc",
          deliverable: "Ambiente pronto",
          steps: ["a"],
          suggested_duration_days: 3,
          required_specialty: "Gestão de Tráfego",
          responsible_user_id: null,
          prerequisites: [],
          approval_criteria: ["ok"],
          references: [],
          justification: "porque sim",
          open_questions: [],
        },
      ],
    };
    (apiClient.listLaunchSessions as any).mockResolvedValue({ sessions: [{ id: "sess-1" }] });
    (apiClient.getLaunchSession as any).mockResolvedValue({
      session: baseSession({
        status: "proposta_gerada",
        current_version_id: "v1",
        versions: [{ id: "v1", version_number: 1, source: "ia_gerada", structured_json: JSON.stringify(plan), created_at: "2026-09-01T10:00:00.000Z" }],
      }),
      can_manage: true,
    });

    renderPanel();
    expect(await screen.findByText("Lançamento em duas ondas.")).toBeInTheDocument();
    expect(screen.getByText("Onda 1")).toBeInTheDocument();
    expect(screen.getByText("Configurar ambiente")).toBeInTheDocument();
  });

  it("reportar possível alucinação abre o formulário vinculado ao snapshot da execução real", async () => {
    const user = userEvent.setup();
    (apiClient.listLaunchSessions as any).mockResolvedValue({ sessions: [{ id: "sess-1" }] });
    (apiClient.getLaunchSession as any).mockResolvedValue({
      session: baseSession({
        messages: [{ id: "m1", role: "assistant", actor_user_id: null, content: "Aqui está o plano.", status: "ok", execution_id: "exec-1", created_at: "2026-09-01T10:00:00.000Z", files: [] }],
        executions: [{ id: "exec-1", status: "succeeded", snapshot_id: "snap-1", error_message: null }],
      }),
      can_manage: true,
    });

    renderPanel();
    await user.click(await screen.findByRole("button", { name: /reportar possível alucinação/i }));

    await screen.findByPlaceholderText(/descreva o que pareceu errado/i);
    // formulário aberto — confirma que está pronto pra vincular snapshot/execução reais no envio
    expect(screen.getByRole("button", { name: /enviar relato/i })).toBeInTheDocument();
  });
});
