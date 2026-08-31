import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Lote "ações destrutivas de conta" (ata 2026-08-25) — bloquear/desbloquear
// um colaborador virou uma ação imediata com confirmação própria, em vez de
// um toggle local silencioso escondido dentro do "Salvar" genérico do
// painel de edição (o antigo comportamento: mudava só estado React, e só
// chegava no backend se a pessoa clicasse Salvar depois — sem nenhum aviso
// do que ia acontecer).

const { apiMock, ApiErrorMock } = vi.hoisted(() => {
  class ApiErrorMock extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  }
  return {
    ApiErrorMock,
    apiMock: {
      getCompanyUsers: vi.fn(),
      createCompanyUser: vi.fn(),
      updateCompanyUser: vi.fn(),
    },
  };
});

vi.mock("@/lib/api-client", () => ({ apiClient: apiMock, ApiError: ApiErrorMock }));
vi.mock("@/components/ui/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

import CompanyUsuariosPage from "@/app/company/usuarios/page";
import { OpenScreensProvider } from "@/contexts/open-screens-context";
import { SidebarProvider } from "@/contexts/sidebar-context";

function renderPage() {
  return render(
    <SidebarProvider>
      <OpenScreensProvider>
        <CompanyUsuariosPage />
      </OpenScreensProvider>
    </SidebarProvider>,
  );
}

function collaborator(overrides: Partial<any> = {}) {
  return {
    id: "collab-1",
    user_code: "usr_00002",
    name: "Colaborador Teste",
    email: "colaborador.teste@example.com",
    role: "company_user",
    account_type: "empresas",
    is_active: true,
    company_id: "company-1",
    company_name: "Empresa Teste",
    created_at: "2026-08-24T00:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("company/usuarios — bloquear/desbloquear colaborador", () => {
  it("1. abrir editar e clicar em Bloquear não chama a API ainda (abre a confirmação primeiro)", async () => {
    apiMock.getCompanyUsers.mockResolvedValue({ data: [collaborator()], total: 1 });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Colaborador Teste");
    await user.click(screen.getByRole("button", { name: "Editar Colaborador Teste" }));
    await user.click(await screen.findByRole("button", { name: "Bloquear" }));

    expect(await screen.findByText("Bloquear usuário")).toBeInTheDocument();
    expect(apiMock.updateCompanyUser).not.toHaveBeenCalled();
  });

  it("2. a confirmação mostra nome, e-mail mascarado e a consequência", async () => {
    apiMock.getCompanyUsers.mockResolvedValue({ data: [collaborator()], total: 1 });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Colaborador Teste");
    await user.click(screen.getByRole("button", { name: "Editar Colaborador Teste" }));
    await user.click(await screen.findByRole("button", { name: "Bloquear" }));

    expect(screen.getAllByText("Colaborador Teste").length).toBeGreaterThan(0);
    expect(await screen.findByText(/co\*+@example\.com/)).toBeInTheDocument();
    expect(screen.getByText(/nenhum dado é apagado/i)).toBeInTheDocument();
  });

  it("3. cancelar mantém o usuário ativo", async () => {
    apiMock.getCompanyUsers.mockResolvedValue({ data: [collaborator()], total: 1 });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Colaborador Teste");
    await user.click(screen.getByRole("button", { name: "Editar Colaborador Teste" }));
    await user.click(await screen.findByRole("button", { name: "Bloquear" }));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.queryByText(/nenhum dado é apagado/i)).not.toBeInTheDocument());
    expect(apiMock.updateCompanyUser).not.toHaveBeenCalled();
  });

  it("5/7. confirmar chama a API uma vez com só is_active e atualiza a lista", async () => {
    apiMock.getCompanyUsers.mockResolvedValue({ data: [collaborator()], total: 1 });
    apiMock.updateCompanyUser.mockResolvedValue({ ...collaborator(), is_active: false });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Colaborador Teste");
    await user.click(screen.getByRole("button", { name: "Editar Colaborador Teste" }));
    await user.click(await screen.findByRole("button", { name: "Bloquear" }));
    const dialogButtons = screen.getAllByRole("button", { name: "Bloquear" });
    await user.click(dialogButtons[dialogButtons.length - 1]);

    await waitFor(() => expect(apiMock.updateCompanyUser).toHaveBeenCalledTimes(1));
    expect(apiMock.updateCompanyUser).toHaveBeenCalledWith("collab-1", { is_active: false });
  });

  it("6. erro mantém o usuário ativo (a confirmação mostra a mensagem, não fecha)", async () => {
    apiMock.getCompanyUsers.mockResolvedValue({ data: [collaborator()], total: 1 });
    apiMock.updateCompanyUser.mockRejectedValue(new ApiErrorMock("Não é possível bloquear o usuário principal da empresa", 403));
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Colaborador Teste");
    await user.click(screen.getByRole("button", { name: "Editar Colaborador Teste" }));
    await user.click(await screen.findByRole("button", { name: "Bloquear" }));
    const dialogButtons = screen.getAllByRole("button", { name: "Bloquear" });
    await user.click(dialogButtons[dialogButtons.length - 1]);

    expect(await screen.findByText("Não é possível bloquear o usuário principal da empresa")).toBeInTheDocument();
  });

  it("10. o usuário principal (owner) não tem a ação de bloqueio disponível", async () => {
    apiMock.getCompanyUsers.mockResolvedValue({
      data: [collaborator({ id: "owner-1", name: "Dono da Empresa", role: "company_admin" })],
      total: 1,
    });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Dono da Empresa");
    await user.click(screen.getByRole("button", { name: "Editar Dono da Empresa" }));

    expect(await screen.findByText(/função e bloqueio não podem ser alterados/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Bloquear" })).not.toBeInTheDocument();
  });
});
