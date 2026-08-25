import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Espelha company/usuarios/page.test.tsx — mesmo fluxo de confirmação de
// bloqueio/desbloqueio, agora no self-service da Agency.

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
      getAgencyUsers: vi.fn(),
      createAgencyUser: vi.fn(),
      updateAgencyUser: vi.fn(),
    },
  };
});

vi.mock("@/lib/api-client", () => ({ apiClient: apiMock, ApiError: ApiErrorMock }));
vi.mock("@/components/ui/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

import AgenciaUsuariosPage from "@/app/agencia/usuarios/page";
import { OpenScreensProvider } from "@/contexts/open-screens-context";
import { SidebarProvider } from "@/contexts/sidebar-context";

function renderPage() {
  return render(
    <SidebarProvider>
      <OpenScreensProvider>
        <AgenciaUsuariosPage />
      </OpenScreensProvider>
    </SidebarProvider>,
  );
}

function collaborator(overrides: Partial<any> = {}) {
  return {
    id: "collab-1",
    user_code: "usr_00003",
    name: "Colaborador Agência",
    email: "colaborador.agencia@example.com",
    role: "agency_user",
    account_type: "agencias",
    is_active: true,
    agency_id: "agency-1",
    agency_name: "Agência Teste",
    created_at: "2026-08-24T00:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("agencia/usuarios — bloquear/desbloquear colaborador", () => {
  it("1. abrir editar e clicar em Bloquear abre a confirmação sem chamar a API", async () => {
    apiMock.getAgencyUsers.mockResolvedValue({ data: [collaborator()], total: 1 });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Colaborador Agência");
    await user.click(screen.getByRole("button", { name: "Editar Colaborador Agência" }));
    await user.click(await screen.findByRole("button", { name: "Bloquear" }));

    expect(await screen.findByText("Bloquear usuário")).toBeInTheDocument();
    expect(apiMock.updateAgencyUser).not.toHaveBeenCalled();
  });

  it("2. a confirmação mostra nome e e-mail mascarado", async () => {
    apiMock.getAgencyUsers.mockResolvedValue({ data: [collaborator()], total: 1 });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Colaborador Agência");
    await user.click(screen.getByRole("button", { name: "Editar Colaborador Agência" }));
    await user.click(await screen.findByRole("button", { name: "Bloquear" }));

    expect(screen.getAllByText("Colaborador Agência").length).toBeGreaterThan(0);
    expect(await screen.findByText(/co\*+@example\.com/)).toBeInTheDocument();
  });

  it("3. cancelar mantém o usuário ativo", async () => {
    apiMock.getAgencyUsers.mockResolvedValue({ data: [collaborator()], total: 1 });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Colaborador Agência");
    await user.click(screen.getByRole("button", { name: "Editar Colaborador Agência" }));
    await user.click(await screen.findByRole("button", { name: "Bloquear" }));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.queryByText("Bloquear usuário")).not.toBeInTheDocument());
    expect(apiMock.updateAgencyUser).not.toHaveBeenCalled();
  });

  it("5/7. confirmar chama a API uma vez com só is_active", async () => {
    apiMock.getAgencyUsers.mockResolvedValue({ data: [collaborator()], total: 1 });
    apiMock.updateAgencyUser.mockResolvedValue({ ...collaborator(), is_active: false });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Colaborador Agência");
    await user.click(screen.getByRole("button", { name: "Editar Colaborador Agência" }));
    await user.click(await screen.findByRole("button", { name: "Bloquear" }));
    const dialogButtons = screen.getAllByRole("button", { name: "Bloquear" });
    await user.click(dialogButtons[dialogButtons.length - 1]);

    await waitFor(() => expect(apiMock.updateAgencyUser).toHaveBeenCalledTimes(1));
    expect(apiMock.updateAgencyUser).toHaveBeenCalledWith("collab-1", { is_active: false });
  });

  it("6. erro mantém o usuário ativo", async () => {
    apiMock.getAgencyUsers.mockResolvedValue({ data: [collaborator()], total: 1 });
    apiMock.updateAgencyUser.mockRejectedValue(new ApiErrorMock("Não é possível bloquear o usuário principal da agência", 403));
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Colaborador Agência");
    await user.click(screen.getByRole("button", { name: "Editar Colaborador Agência" }));
    await user.click(await screen.findByRole("button", { name: "Bloquear" }));
    const dialogButtons = screen.getAllByRole("button", { name: "Bloquear" });
    await user.click(dialogButtons[dialogButtons.length - 1]);

    expect(await screen.findByText("Não é possível bloquear o usuário principal da agência")).toBeInTheDocument();
  });

  it("10. o usuário principal (owner) não tem a ação de bloqueio disponível", async () => {
    apiMock.getAgencyUsers.mockResolvedValue({
      data: [collaborator({ id: "owner-1", name: "Dono da Agência", role: "agency_admin" })],
      total: 1,
    });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Dono da Agência");
    await user.click(screen.getByRole("button", { name: "Editar Dono da Agência" }));

    expect(await screen.findByText(/bloqueio não pode ser alterado/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Bloquear" })).not.toBeInTheDocument();
  });
});
