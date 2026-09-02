import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { MemoryContextPreview } from "@/components/memory-context-preview";

// Defesa contra alucinação (bloco 2/4, sprint 2026-09) — "Visualizar contexto
// que a IA utilizará" + atalho pra "Reportar possível alucinação", ambos
// testados no ponto de entrada real (aba Memória do projeto). Mocka só o
// apiClient, mesmo padrão de memory-panel.test.tsx.

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    previewMemoryContext: vi.fn(),
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

import { apiClient, ApiError } from "@/lib/api-client";

function renderPreview() {
  return render(
    <SidebarProvider>
      <MemoryContextPreview projectId="proj-1" />
    </SidebarProvider>,
  );
}

const compiledResponse = {
  snapshot_id: "snap-1",
  checksum: "abc123",
  created_at: "2026-09-01T10:00:00.000Z",
  text: "=== contexto compilado completo ===",
  layers: [
    { scope: "project", present: true, sections: { positive_instructions: "Sempre revisar antes de publicar", negative_instructions: null, summary: null } },
    { scope: "company", present: false, sections: { positive_instructions: null, negative_instructions: null, summary: null } },
    { scope: "agency", present: false, sections: { positive_instructions: null, negative_instructions: null, summary: null } },
  ],
  missing_layers: ["company", "agency"],
  approved_task_refs: [],
  truncation_notes: [],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("MemoryContextPreview", () => {
  it("abre a prévia, chama o backend com um clientActionId novo e mostra as camadas", async () => {
    const user = userEvent.setup();
    (apiClient.previewMemoryContext as any).mockResolvedValue(compiledResponse);

    renderPreview();
    await user.click(screen.getByRole("button", { name: /visualizar contexto que a ia utilizará/i }));

    expect(await screen.findByText("Contexto hierárquico compilado")).toBeInTheDocument();
    expect(apiClient.previewMemoryContext).toHaveBeenCalledTimes(1);
    const [projectIdArg, clientActionIdArg] = (apiClient.previewMemoryContext as any).mock.calls[0];
    expect(projectIdArg).toBe("proj-1");
    expect(typeof clientActionIdArg).toBe("string");
    expect(clientActionIdArg.length).toBeGreaterThan(0);

    expect(screen.getByText(/camadas ausentes/i)).toBeInTheDocument();
    expect(screen.getByText("Sempre revisar antes de publicar")).toBeInTheDocument();
  });

  it("mostra erro sem quebrar a tela quando a compilação falha", async () => {
    const user = userEvent.setup();
    (apiClient.previewMemoryContext as any).mockRejectedValue(new ApiError("Falha ao compilar", 500));

    renderPreview();
    await user.click(screen.getByRole("button", { name: /visualizar contexto que a ia utilizará/i }));

    expect(await screen.findByText("Falha ao compilar")).toBeInTheDocument();
  });

  it("relatar possível alucinação: valida campos obrigatórios antes de chamar o backend", async () => {
    const user = userEvent.setup();
    renderPreview();

    await user.click(screen.getByRole("button", { name: /reportar possível alucinação/i }));
    await screen.findByPlaceholderText(/descreva o que pareceu errado/i);
    await user.click(screen.getByRole("button", { name: /enviar relato/i }));

    expect(await screen.findByText(/descrição, categoria e impacto são obrigatórios/i)).toBeInTheDocument();
    expect(apiClient.createHallucinationReport).not.toHaveBeenCalled();
  });

  it("relatar possível alucinação: envia com o projeto, categoria e impacto corretos, vinculando o snapshot já aberto", async () => {
    const user = userEvent.setup();
    (apiClient.previewMemoryContext as any).mockResolvedValue(compiledResponse);
    (apiClient.createHallucinationReport as any).mockResolvedValue({ report: { id: "rep-1" }, duplicate: false });

    renderPreview();
    // abre a prévia primeiro pra ter um snapshotId real vinculado ao relato
    await user.click(screen.getByRole("button", { name: /visualizar contexto que a ia utilizará/i }));
    await screen.findByText("Contexto hierárquico compilado");
    // fecha a prévia antes de abrir o formulário de relato — snapshotId já
    // ficou guardado no estado do componente pai, sobrevive ao fechamento.
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByText("Contexto hierárquico compilado")).not.toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /reportar possível alucinação/i }));
    await screen.findByPlaceholderText(/descreva o que pareceu errado/i);

    await user.type(screen.getByPlaceholderText(/descreva o que pareceu errado/i), "A IA prometeu um prazo que não existe no projeto.");

    const comboboxes = screen.getAllByRole("combobox");
    await user.click(comboboxes[0]);
    await user.click(await screen.findByRole("option", { name: "Dado inventado" }));
    await user.click(comboboxes[1]);
    await user.click(await screen.findByRole("option", { name: "Alto" }));

    await user.click(screen.getByRole("button", { name: /enviar relato/i }));

    await waitFor(() => expect(apiClient.createHallucinationReport).toHaveBeenCalledTimes(1));
    const payload = (apiClient.createHallucinationReport as any).mock.calls[0][0];
    expect(payload.project_id).toBe("proj-1");
    expect(payload.category).toBe("dado_inventado");
    expect(payload.impact).toBe("alto");
    expect(payload.snapshot_id).toBe("snap-1");
    expect(typeof payload.create_client_action_id).toBe("string");

    expect(await screen.findByText(/relato enviado para análise administrativa/i)).toBeInTheDocument();
  });
});
