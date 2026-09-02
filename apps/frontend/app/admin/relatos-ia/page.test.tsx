import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SidebarProvider } from "@/contexts/sidebar-context";
import RelatosIAPage from "@/app/admin/relatos-ia/page";

// Acabamento do Bloco 2 (pedido explícito no início do Bloco 3): a Central
// administrativa de "possível alucinação" ainda não tinha teste de
// frontend — mesmo padrão de memory-panel.test.tsx (mocka só o apiClient).

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    listHallucinationReports: vi.fn(),
    getHallucinationReport: vi.fn(),
    getHallucinationReportHistory: vi.fn(),
    getMemoryContextSnapshot: vi.fn(),
    assumeHallucinationAnalysis: vi.fn(),
    markHallucinationSuspectedOrigin: vi.fn(),
    recordHallucinationDiagnosis: vi.fn(),
    closeHallucinationReport: vi.fn(),
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

function renderPage() {
  return render(
    <SidebarProvider>
      <RelatosIAPage />
    </SidebarProvider>,
  );
}

const reportRow = {
  id: "rep-1",
  project_id: "proj-1",
  reported_by_user_id: "user-1",
  description: "A IA prometeu um prazo que não existe",
  questioned_response: null,
  category: "dado_inventado",
  impact: "alto",
  status: "novo",
  assigned_admin_user_id: null,
  suspected_origin_layer: null,
  suspected_origin_memory_id: null,
  diagnosis_note: null,
  snapshot_id: "snap-1",
  project_task: null,
  created_at: "2026-09-01T10:00:00.000Z",
  updated_at: "2026-09-01T10:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  (apiClient.getHallucinationReportHistory as any).mockResolvedValue({ history: [] });
  (apiClient.getMemoryContextSnapshot as any).mockResolvedValue({ text: "contexto", layers: [] });
});

describe("Central administrativa de possível alucinação (/admin/relatos-ia)", () => {
  it("carrega a lista filtrada por 'Novos' por padrão", async () => {
    (apiClient.listHallucinationReports as any).mockResolvedValue({ data: [reportRow], total: 1 });
    renderPage();

    expect(await screen.findByText("A IA prometeu um prazo que não existe")).toBeInTheDocument();
    expect(apiClient.listHallucinationReports).toHaveBeenCalledWith({ status: "novo" });
  });

  it("trocar de aba recarrega com o novo filtro de status", async () => {
    const user = userEvent.setup();
    (apiClient.listHallucinationReports as any).mockResolvedValue({ data: [], total: 0 });
    renderPage();
    await screen.findByText("Nenhum relato nesta visão.");

    await user.click(screen.getByRole("tab", { name: "Resolvidos" }));
    await waitFor(() => expect(apiClient.listHallucinationReports).toHaveBeenCalledWith({ status: "resolvido" }));
  });

  it("abre o detalhe do relato ao clicar na linha", async () => {
    const user = userEvent.setup();
    (apiClient.listHallucinationReports as any).mockResolvedValue({ data: [reportRow], total: 1 });
    (apiClient.getHallucinationReport as any).mockResolvedValue({ report: reportRow });

    renderPage();
    await user.click(await screen.findByText("A IA prometeu um prazo que não existe"));

    expect(await screen.findByText("Contexto exato utilizado (snapshot)")).toBeInTheDocument();
    // o texto do snapshot vinculado é carregado e mostrado
    await waitFor(() => expect(apiClient.getMemoryContextSnapshot).toHaveBeenCalledWith("proj-1", "snap-1"));
    expect(await screen.findByText("contexto")).toBeInTheDocument();
  });

  it("assumir análise chama o backend com o updated_at atual e recarrega o relato", async () => {
    const user = userEvent.setup();
    (apiClient.listHallucinationReports as any).mockResolvedValue({ data: [reportRow], total: 1 });
    (apiClient.getHallucinationReport as any).mockResolvedValue({ report: reportRow });
    (apiClient.assumeHallucinationAnalysis as any).mockResolvedValue({ report: { ...reportRow, status: "em_analise", updated_at: "2026-09-01T10:05:00.000Z" } });

    renderPage();
    await user.click(await screen.findByText("A IA prometeu um prazo que não existe"));
    await screen.findByText("Ações administrativas");

    await user.click(screen.getByRole("button", { name: "Assumir análise" }));

    await waitFor(() => expect(apiClient.assumeHallucinationAnalysis).toHaveBeenCalledWith("rep-1", "2026-09-01T10:00:00.000Z"));
    await waitFor(() => expect(apiClient.getHallucinationReport).toHaveBeenCalledTimes(2));
  });

  it("resolver exige justificativa antes de habilitar o botão", async () => {
    const user = userEvent.setup();
    (apiClient.listHallucinationReports as any).mockResolvedValue({ data: [reportRow], total: 1 });
    (apiClient.getHallucinationReport as any).mockResolvedValue({ report: reportRow });

    renderPage();
    await user.click(await screen.findByText("A IA prometeu um prazo que não existe"));
    await screen.findByText("Ações administrativas");

    const resolveButton = screen.getByRole("button", { name: "Resolver" });
    expect(resolveButton).toBeDisabled();

    await user.type(screen.getByPlaceholderText(/justificativa obrigatória/i), "Instrução da memória corrigida.");
    expect(resolveButton).not.toBeDisabled();

    (apiClient.closeHallucinationReport as any).mockResolvedValue({ report: { ...reportRow, status: "resolvido" } });
    await user.click(resolveButton);

    await waitFor(() =>
      expect(apiClient.closeHallucinationReport).toHaveBeenCalledWith(
        "rep-1",
        "resolvido",
        "Instrução da memória corrigida.",
        expect.any(String),
        "2026-09-01T10:00:00.000Z",
      ),
    );
  });
});
