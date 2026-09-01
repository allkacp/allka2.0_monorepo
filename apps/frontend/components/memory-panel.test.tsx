import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { MemoryPanel, type MemoryPanelProps } from "@/components/memory-panel";

// Fundação da Memória Hierárquica (Bloco 1/4, sprint 2026-09) — testado
// isolado (mesmo padrão de alert-detail-drawer.test.tsx): mocka só o
// apiClient, monta o componente reutilizável diretamente (a aba real do
// projeto e a seção de Company/Agência são wrappers finos sobre ele, ver
// project-memoria-tab.tsx e company-view-slide-panel.tsx).

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    getMemory: vi.fn(),
    updateMemorySection: vi.fn(),
    getMemoryHistory: vi.fn(),
    uploadMemoryFile: vi.fn(),
    deleteMemoryFile: vi.fn(),
    downloadMemoryFile: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

import { apiClient, ApiError } from "@/lib/api-client";

function emptyMemory(overrides: Partial<any> = {}) {
  return {
    id: "mem-1",
    positive_instructions: null,
    negative_instructions: null,
    summary: null,
    is_archived: false,
    updated_at: "2026-09-01T10:00:00.000Z",
    files: [],
    approved_task_records: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// StandardModalDialog (usado pelo ConfirmationDialog de descarte) depende de
// SidebarProvider mesmo fora de um sidebar de verdade — mesmo padrão de
// alert-detail-drawer.test.tsx.
function renderPanel(props: MemoryPanelProps) {
  return render(
    <SidebarProvider>
      <MemoryPanel {...props} />
    </SidebarProvider>,
  );
}

describe("MemoryPanel", () => {
  it("mostra loading enquanto busca a memória", () => {
    (apiClient.getMemory as any).mockReturnValue(new Promise(() => {}));
    const { container } = renderPanel({ scopeType: "project", scopeId: "p1" });
    expect(container.querySelector(".animate-spin")).toBeTruthy();
  });

  it("mostra erro de carregamento (sem quebrar a tela)", async () => {
    (apiClient.getMemory as any).mockRejectedValue(new ApiError("Falha ao carregar", 500));
    renderPanel({ scopeType: "project", scopeId: "p1" });
    expect(await screen.findByText("Falha ao carregar")).toBeInTheDocument();
  });

  it("estado vazio: mostra leitura fácil sem dado fictício e sem botão Editar quando não pode editar", async () => {
    (apiClient.getMemory as any).mockResolvedValue({ memory: emptyMemory(), can_edit: false });
    renderPanel({ scopeType: "project", scopeId: "p1" });

    expect(await screen.findByText("Resumo")).toBeInTheDocument();
    expect(screen.getAllByText("Nada registrado ainda.")).toHaveLength(3);
    expect(screen.queryByRole("button", { name: "Editar" })).not.toBeInTheDocument();
  });

  it("edição por seção: salva sem recarregar a tela inteira (um único GET) e sem afetar as outras seções", async () => {
    const user = userEvent.setup();
    (apiClient.getMemory as any).mockResolvedValue({ memory: emptyMemory(), can_edit: true });
    (apiClient.updateMemorySection as any).mockResolvedValue({
      memory: emptyMemory({ positive_instructions: "Sempre usar tom formal", updated_at: "2026-09-01T10:05:00.000Z" }),
    });

    renderPanel({ scopeType: "project", scopeId: "p1" });
    await screen.findByText("Resumo");

    const positiveCard = screen.getByText("O que a IA deve fazer").closest("div")!.parentElement!;
    await user.click(within(positiveCard).getByRole("button", { name: "Editar" }));
    await user.type(screen.getByPlaceholderText(/sempre usar linguagem informal/i), "Sempre usar tom formal");
    await user.click(screen.getByRole("button", { name: /Salvar/i }));

    await waitFor(() => expect(apiClient.updateMemorySection).toHaveBeenCalledWith("project", "p1", "positive_instructions", "Sempre usar tom formal", "2026-09-01T10:00:00.000Z"));
    expect(await screen.findByText("Sempre usar tom formal")).toBeInTheDocument();
    // só o GET inicial — salvar não recarrega a tela inteira
    expect(apiClient.getMemory).toHaveBeenCalledTimes(1);
    // as outras seções continuam com o estado vazio original
    expect(screen.getAllByText("Nada registrado ainda — clique em Editar pra adicionar.")).toHaveLength(2);
  });

  it("erro 409 de concorrência aparece SÓ na seção editada, sem perder o rascunho do usuário", async () => {
    const user = userEvent.setup();
    (apiClient.getMemory as any).mockResolvedValue({ memory: emptyMemory(), can_edit: true });
    (apiClient.updateMemorySection as any).mockRejectedValue(new ApiError("stale", 409));

    renderPanel({ scopeType: "project", scopeId: "p1" });
    await screen.findByText("Resumo");

    const summaryCard = screen.getByText("Resumo").closest("div")!.parentElement!;
    await user.click(within(summaryCard).getByRole("button", { name: "Editar" }));
    const textarea = screen.getByPlaceholderText(/resumo consolidado/i);
    await user.type(textarea, "Rascunho que não pode ser perdido");
    await user.click(screen.getByRole("button", { name: /Salvar/i }));

    expect(await screen.findByText(/alterada por outra pessoa/i)).toBeInTheDocument();
    expect(textarea).toHaveValue("Rascunho que não pode ser perdido");
  });

  it("cancelar edição sem alteração fecha direto; com alteração pede confirmação antes de descartar", async () => {
    const user = userEvent.setup();
    (apiClient.getMemory as any).mockResolvedValue({ memory: emptyMemory(), can_edit: true });

    renderPanel({ scopeType: "project", scopeId: "p1" });
    await screen.findByText("Resumo");

    const summaryCard = screen.getByText("Resumo").closest("div")!.parentElement!;
    await user.click(within(summaryCard).getByRole("button", { name: "Editar" }));
    await user.type(screen.getByPlaceholderText(/resumo consolidado/i), "algo digitado");
    await user.click(screen.getByRole("button", { name: /Cancelar/i }));

    expect(await screen.findByText("Descartar alterações?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Descartar/i }));
    await waitFor(() => expect(screen.queryByText("Descartar alterações?")).not.toBeInTheDocument());
    expect(screen.getByPlaceholderText).toBeTruthy();
  });

  it("compact esconde arquivos e tarefas aprovadas (Company/Agência não recebem detalhe de projeto)", async () => {
    (apiClient.getMemory as any).mockResolvedValue({ memory: emptyMemory(), can_edit: true });
    renderPanel({ scopeType: "company", scopeId: "c1", compact: true });
    await screen.findByText("Resumo");
    expect(screen.queryByText("Arquivos de referência")).not.toBeInTheDocument();
    expect(screen.queryByText("Aprendizados de tarefas aprovadas")).not.toBeInTheDocument();
    expect(screen.getByText("Histórico de alterações")).toBeInTheDocument();
  });

  it("lista arquivos e tarefas aprovadas reais quando presentes (modo não-compact)", async () => {
    (apiClient.getMemory as any).mockResolvedValue({
      memory: emptyMemory({
        files: [{ id: "f1", name: "briefing.pdf", size: 2048, mime_type: "application/pdf", created_at: "2026-09-01T09:00:00.000Z" }],
        approved_task_records: [{ id: "r1", project_task_id: "t1", approved_at: "2026-09-01T09:30:00.000Z", approval_note: null, project_task: { title: "Criar wireframe" } }],
      }),
      can_edit: true,
    });
    renderPanel({ scopeType: "project", scopeId: "p1" });

    expect(await screen.findByText("briefing.pdf")).toBeInTheDocument();
    expect(screen.getByText("2.0 KB")).toBeInTheDocument();
    expect(screen.getByText("Criar wireframe")).toBeInTheDocument();
  });

  it("remover arquivo aciona o delete e recarrega a lista (arquivamento lógico no backend, não visível aqui como exclusão física)", async () => {
    const user = userEvent.setup();
    (apiClient.getMemory as any)
      .mockResolvedValueOnce({
        memory: emptyMemory({ files: [{ id: "f1", name: "briefing.pdf", size: 2048, mime_type: null, created_at: "2026-09-01T09:00:00.000Z" }] }),
        can_edit: true,
      })
      .mockResolvedValueOnce({ memory: emptyMemory({ files: [] }), can_edit: true });
    (apiClient.deleteMemoryFile as any).mockResolvedValue({ success: true });

    renderPanel({ scopeType: "project", scopeId: "p1" });
    await screen.findByText("briefing.pdf");

    const fileRow = screen.getByText("briefing.pdf").closest("li")!;
    const rowButtons = within(fileRow).getAllByRole("button");
    await user.click(rowButtons[rowButtons.length - 1]); // botão de remover (trash), não o nome do arquivo

    await waitFor(() => expect(apiClient.deleteMemoryFile).toHaveBeenCalledWith("project", "p1", "f1"));
    await waitFor(() => expect(screen.queryByText("briefing.pdf")).not.toBeInTheDocument());
  });

  it("histórico: só busca ao expandir (colapsado por padrão) e mostra os eventos reais", async () => {
    const user = userEvent.setup();
    (apiClient.getMemory as any).mockResolvedValue({ memory: emptyMemory(), can_edit: true });
    (apiClient.getMemoryHistory as any).mockResolvedValue({
      history: [{ id: "h1", section: "summary", action: "created", actor_user_id: "u1", reason: null, created_at: "2026-09-01T10:00:00.000Z" }],
    });

    renderPanel({ scopeType: "project", scopeId: "p1" });
    await screen.findByText("Resumo");
    expect(apiClient.getMemoryHistory).not.toHaveBeenCalled();

    await user.click(screen.getByText("Histórico de alterações"));
    expect(await screen.findByText(/memória criada/)).toBeInTheDocument();
    expect(apiClient.getMemoryHistory).toHaveBeenCalledTimes(1);

    // colapsar e reabrir não refaz a busca (já em cache local)
    await user.click(screen.getByText("Histórico de alterações"));
    await user.click(screen.getByText("Histórico de alterações"));
    expect(apiClient.getMemoryHistory).toHaveBeenCalledTimes(1);
  });

  it("memória arquivada mostra aviso visível", async () => {
    (apiClient.getMemory as any).mockResolvedValue({ memory: emptyMemory({ is_archived: true }), can_edit: true });
    renderPanel({ scopeType: "project", scopeId: "p1" });
    expect(await screen.findByText("Esta memória está arquivada.")).toBeInTheDocument();
  });
});
