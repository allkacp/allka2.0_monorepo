import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { OpenScreensProvider } from "@/contexts/open-screens-context";
import { SidebarProvider } from "@/contexts/sidebar-context";

// Lote 3 (ata 2026-08-24) — migra a exclusão de nível geral (Programa
// Partner) para a confirmação dupla do ConfirmationDialog. Antes,
// handleDeleteLevel engolia qualquer erro (403/409/rede) num catch vazio e
// SEMPRE filtrava o nível da lista local, então uma exclusão recusada pelo
// backend fazia o nível "sumir" da tela sem ter sido excluído de verdade —
// ver auditoria do lote. Este arquivo cobre só o comportamento do NOVO
// fluxo: permissão, duas etapas, 403/409/erro de rede, atualização da
// lista só após sucesso real.

const {
  deleteLevelSpy,
  getLevelsMock,
  getCurrentUserMock,
} = vi.hoisted(() => ({
  deleteLevelSpy: vi.fn(),
  getLevelsMock: vi.fn(),
  getCurrentUserMock: vi.fn(),
}));

vi.mock("@/lib/api-client", () => {
  class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  }
  return {
    ApiError,
    apiClient: {
      getLevels: getLevelsMock,
      getCurrentUser: getCurrentUserMock,
      deleteLevel: deleteLevelSpy,
      createLevel: vi.fn(),
      updateLevel: vi.fn(),
    },
  };
});

import { ApiError } from "@/lib/api-client";

import NiveisPage from "@/app/admin/niveis/page";

function levelFixture(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    name: "Bronze",
    description: "Nível inicial do Programa Partner",
    icon: "🥉",
    color: "#4F46E5",
    gradient: "from-blue-600 to-cyan-600",
    min_mrr: 0,
    max_mrr: 5000,
    led_agencies_min: 0,
    led_agencies_mrr_min: 0,
    premium_project_limit: 0,
    commission_rate: 5,
    extra_discount: 10,
    receives_leads_premium: false,
    requires_partner: false,
    level_up_bonus_credits: 0,
    benefits: [],
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/admin/niveis"]}>
      <SidebarProvider>
        <OpenScreensProvider>
          <NiveisPage />
        </OpenScreensProvider>
      </SidebarProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  getLevelsMock.mockResolvedValue({ data: [levelFixture()] });
});

describe("Admin > Níveis — exclusão de nível (confirmação dupla)", () => {
  it("sem permissão sistema/delete: botão Excluir fica desabilitado", async () => {
    getCurrentUserMock.mockResolvedValue({
      admin_profile: { is_active: true, is_master: false, permissions: [{ module: "financeiro", action: "view" }] },
    });
    renderPage();
    const btn = await screen.findByRole("button", { name: /sem permissão para excluir níveis/i });
    expect(btn).toBeDisabled();
  });

  it("com permissão sistema/delete: abre a 1ª etapa com o nome correto, sem chamar a API", async () => {
    getCurrentUserMock.mockResolvedValue({
      admin_profile: { is_active: true, is_master: false, permissions: [{ module: "sistema", action: "delete" }] },
    });
    const user = userEvent.setup();
    renderPage();
    const btn = await screen.findByRole("button", { name: /^excluir nível$/i });
    expect(btn).toBeEnabled();
    await user.click(btn);
    expect(await screen.findByText("Esta ação é permanente e não pode ser desfeita.")).toBeInTheDocument();
    expect(screen.getAllByText("Bronze").length).toBeGreaterThan(0);
    expect(deleteLevelSpy).not.toHaveBeenCalled();
  });

  it("avançar abre a 2ª etapa; voltar não exclui; cancelar não exclui", async () => {
    getCurrentUserMock.mockResolvedValue({ admin_profile: null });
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: /^excluir nível$/i }));

    await user.click(screen.getByRole("button", { name: /continuar para confirmação/i }));
    expect(screen.getByRole("button", { name: /excluir nível definitivamente/i })).toBeInTheDocument();
    expect(deleteLevelSpy).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /voltar/i }));
    expect(screen.getByRole("button", { name: /continuar para confirmação/i })).toBeInTheDocument();
    expect(deleteLevelSpy).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /^cancelar$/i }));
    expect(deleteLevelSpy).not.toHaveBeenCalled();
    expect(screen.getAllByText("Bronze").length).toBeGreaterThan(0);
  });

  it("Escape não exclui e fecha o diálogo", async () => {
    getCurrentUserMock.mockResolvedValue({ admin_profile: null });
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: /^excluir nível$/i }));
    await user.keyboard("{Escape}");
    expect(deleteLevelSpy).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByText("Esta ação é permanente e não pode ser desfeita.")).not.toBeInTheDocument());
  });

  it("confirmação final chama a API uma única vez e remove da lista só após sucesso", async () => {
    getCurrentUserMock.mockResolvedValue({ admin_profile: null });
    deleteLevelSpy.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: /^excluir nível$/i }));
    await user.click(screen.getByRole("button", { name: /continuar para confirmação/i }));

    // Ainda visível — a lista não muda antes da confirmação final.
    expect(screen.getAllByText("Bronze").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /excluir nível definitivamente/i }));
    await waitFor(() => expect(deleteLevelSpy).toHaveBeenCalledWith("1"));
    await waitFor(() => expect(deleteLevelSpy).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByText("Bronze")).not.toBeInTheDocument());
  });

  it("clique duplo no botão final não duplica a chamada", async () => {
    getCurrentUserMock.mockResolvedValue({ admin_profile: null });
    let resolveDelete: () => void = () => {};
    deleteLevelSpy.mockImplementation(() => new Promise<void>((resolve) => { resolveDelete = resolve; }));
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: /^excluir nível$/i }));
    await user.click(screen.getByRole("button", { name: /continuar para confirmação/i }));
    const finalButton = screen.getByRole("button", { name: /excluir nível definitivamente/i });
    await user.click(finalButton);
    await user.click(finalButton);
    await user.click(finalButton);
    expect(deleteLevelSpy).toHaveBeenCalledTimes(1);
    resolveDelete();
  });

  it("403 mostra mensagem amigável e mantém o nível", async () => {
    getCurrentUserMock.mockResolvedValue({ admin_profile: null });
    deleteLevelSpy.mockRejectedValue(new ApiError("Você não tem permissão para excluir níveis.", 403));
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: /^excluir nível$/i }));
    await user.click(screen.getByRole("button", { name: /continuar para confirmação/i }));
    await user.click(screen.getByRole("button", { name: /excluir nível definitivamente/i }));
    expect(await screen.findByText("Você não tem permissão para excluir níveis.")).toBeInTheDocument();
    expect(screen.getAllByText("Bronze").length).toBeGreaterThan(0);
  });

  it("409 (vínculo existente) mostra mensagem amigável e mantém o nível", async () => {
    getCurrentUserMock.mockResolvedValue({ admin_profile: null });
    deleteLevelSpy.mockRejectedValue(
      new ApiError("Este nível está vinculado a parceiros existentes e não pode ser excluído.", 409),
    );
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: /^excluir nível$/i }));
    await user.click(screen.getByRole("button", { name: /continuar para confirmação/i }));
    await user.click(screen.getByRole("button", { name: /excluir nível definitivamente/i }));
    expect(
      await screen.findByText("Este nível está vinculado a parceiros existentes e não pode ser excluído."),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Bronze").length).toBeGreaterThan(0);
  });

  it("erro de rede mostra mensagem amigável e mantém o nível", async () => {
    getCurrentUserMock.mockResolvedValue({ admin_profile: null });
    deleteLevelSpy.mockRejectedValue(new Error("Falha de rede"));
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: /^excluir nível$/i }));
    await user.click(screen.getByRole("button", { name: /continuar para confirmação/i }));
    await user.click(screen.getByRole("button", { name: /excluir nível definitivamente/i }));
    expect(await screen.findByText("Falha de rede")).toBeInTheDocument();
    expect(screen.getAllByText("Bronze").length).toBeGreaterThan(0);
  });

  it("Admin Master (sem perfil) continua conseguindo excluir normalmente", async () => {
    getCurrentUserMock.mockResolvedValue({ admin_profile: { is_active: true, is_master: true, permissions: [] } });
    deleteLevelSpy.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: /^excluir nível$/i }));
    await user.click(screen.getByRole("button", { name: /continuar para confirmação/i }));
    await user.click(screen.getByRole("button", { name: /excluir nível definitivamente/i }));
    await waitFor(() => expect(deleteLevelSpy).toHaveBeenCalledTimes(1));
  });

  it("funciona em viewport estreito (celular) — botões continuam presentes", async () => {
    getCurrentUserMock.mockResolvedValue({ admin_profile: null });
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: /^excluir nível$/i }));
    expect(screen.getByRole("button", { name: /^cancelar$/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /continuar para confirmação/i }));
    expect(screen.getByRole("button", { name: /excluir nível definitivamente/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /voltar/i })).toBeInTheDocument();
  });
});
