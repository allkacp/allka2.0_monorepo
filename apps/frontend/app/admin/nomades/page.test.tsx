import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { OpenScreensProvider } from "@/contexts/open-screens-context";

// Lote "expose nomad status actions" (ata 2026-08) — a tela real que o
// responsável usa (/admin/nomades, linkada no Dashboard e na navegação
// mobile) só tinha Ver/Editar; desativar/reativar/remover perfil existiam
// só em admin/empresas (aba Nomad), uma tela diferente que ele não acessa.
// Este teste cobre a mesma dupla de fluxos, agora nesta tela.

const { apiMock, ApiErrorMock } = vi.hoisted(() => {
  class ApiErrorMock extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  }
  const known: Record<string, ReturnType<typeof vi.fn>> = {};
  const apiMock = new Proxy(known, {
    get(target, prop: string) {
      if (!target[prop]) target[prop] = vi.fn(() => Promise.resolve({ data: [], total: 0 }));
      return target[prop];
    },
  });
  return { apiMock, ApiErrorMock };
});

vi.mock("@/lib/api-client", () => ({
  apiClient: apiMock,
  ApiError: ApiErrorMock,
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));
vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

import AdminNomadesPage from "@/app/admin/nomades/page";

function nomadFixture(overrides: Partial<any> = {}) {
  return {
    id: "nomade-1",
    name: "Fulano Nômade",
    email: "fulano.nomade@example.com",
    whatsapp: "11999999999",
    level: "Bronze",
    status: "ativo",
    legacy_id: null,
    online_status: null,
    performance_avg_rating: 0,
    tasks_completed_total: 0,
    registration_date: "2026-08-24T00:00:00.000Z",
    created_at: "2026-08-24T00:00:00.000Z",
    last_access: null,
    areas_of_interest: null,
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <SidebarProvider>
        <OpenScreensProvider>
          <AdminNomadesPage />
        </OpenScreensProvider>
      </SidebarProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  apiMock.getNomades.mockResolvedValue({ data: [nomadFixture()], total: 1 });
});

describe("admin/nomades — Nômade: desativar/reativar (reversível)", () => {
  it("1. o botão mostra 'Desativar Nômade' pra um perfil ativo (nunca 'Excluir')", async () => {
    renderPage();
    expect(await screen.findByRole("button", { name: "Desativar Nômade Fulano Nômade" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /excluir.*fulano/i })).not.toBeInTheDocument();
  });

  it("2/3. abrir a confirmação mostra nome, e-mail mascarado e a consequência; cancelar não altera", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Desativar Nômade Fulano Nômade" }));
    expect(await screen.findByText(/fu\*+@example\.com/)).toBeInTheDocument();
    expect(screen.getByText(/login fica bloqueado/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(screen.queryByText(/login fica bloqueado/i)).not.toBeInTheDocument());
    expect(apiMock.updateNomadeStatus).not.toHaveBeenCalled();
  });

  it("4/7. confirmar chama a API uma vez com status inativo e atualiza a lista", async () => {
    apiMock.updateNomadeStatus.mockResolvedValue({ status: "inativo" });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Desativar Nômade Fulano Nômade" }));
    await user.click(screen.getByRole("button", { name: "Desativar" }));

    await waitFor(() => expect(apiMock.updateNomadeStatus).toHaveBeenCalledWith("nomade-1", "inativo"));
    await waitFor(() => expect(apiMock.getNomades).toHaveBeenCalledTimes(2));
  });

  it("5/6. erro na desativação mostra mensagem amigável e mantém o registro", async () => {
    apiMock.updateNomadeStatus.mockRejectedValue(new ApiErrorMock("Não foi possível desativar", 500));
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Desativar Nômade Fulano Nômade" }));
    await user.click(screen.getByRole("button", { name: "Desativar" }));

    expect(await screen.findByText("Não foi possível desativar")).toBeInTheDocument();
    expect(apiMock.getNomades).toHaveBeenCalledTimes(1);
  });

  it("8. reativação aparece quando o Nômade está inativo, usando o filtro de status da própria tela", async () => {
    apiMock.getNomades.mockResolvedValue({ data: [nomadFixture({ status: "inativo" })], total: 1 });
    const user = userEvent.setup();
    renderPage();

    // Por padrão a lista mostra só "Em operação" (esconde inativo/reprovado)
    // — comportamento já existente da tela, não deste lote.
    expect(screen.queryByRole("button", { name: "Reativar Nômade Fulano Nômade" })).not.toBeInTheDocument();

    const statusSelect = (await screen.findAllByRole("combobox")).find(
      (el) => (el as HTMLSelectElement).value === "em_operacao",
    ) as HTMLSelectElement;
    await user.selectOptions(statusSelect, "inativo");

    expect(await screen.findByRole("button", { name: "Reativar Nômade Fulano Nômade" })).toBeInTheDocument();
  });
});

describe("admin/nomades — Nômade: remover perfil (duas etapas, conta global preservada)", () => {
  it("1. window.confirm não é usado neste fluxo", async () => {
    const confirmSpy = vi.spyOn(window, "confirm");
    renderPage();
    await screen.findByText("Fulano Nômade");
    expect(confirmSpy).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it("3/4. primeira etapa não chama a API; segunda etapa chama uma vez", async () => {
    apiMock.getNomade.mockResolvedValue({
      _count: { wallet_transactions: 0, qualifications: 0, withdrawal_requests: 0, task_executions: 0 },
      bank_account: null,
    });
    apiMock.deleteNomade.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Remover perfil de Nômade Fulano Nômade" }));
    expect(await screen.findByText("Remover perfil de Nômade")).toBeInTheDocument();
    expect(apiMock.deleteNomade).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /continuar para confirmação/i }));
    expect(await screen.findByText("Remover perfil definitivamente")).toBeInTheDocument();
    expect(apiMock.deleteNomade).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Remover perfil definitivamente" }));
    await waitFor(() => expect(apiMock.deleteNomade).toHaveBeenCalledTimes(1));
  });

  it("2. cancelar mantém o Nômade", async () => {
    apiMock.getNomade.mockResolvedValue({
      _count: { wallet_transactions: 0, qualifications: 0, withdrawal_requests: 0, task_executions: 0 },
      bank_account: null,
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Remover perfil de Nômade Fulano Nômade" }));
    await user.click(await screen.findByRole("button", { name: "Cancelar" }));

    expect(apiMock.deleteNomade).not.toHaveBeenCalled();
    expect(screen.getAllByText("Fulano Nômade").length).toBeGreaterThan(0);
  });

  it("6. erro (409, histórico vinculado) é amigável e mantém o registro", async () => {
    apiMock.getNomade.mockResolvedValue({
      _count: { wallet_transactions: 0, qualifications: 0, withdrawal_requests: 0, task_executions: 0 },
      bank_account: null,
    });
    apiMock.deleteNomade.mockRejectedValue(
      new ApiErrorMock("Este perfil tem histórico vinculado (2 tarefa(s) executada(s)) e não pode ser removido — desative o Nômade em vez de remover o perfil.", 409),
    );
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Remover perfil de Nômade Fulano Nômade" }));
    await user.click(await screen.findByRole("button", { name: /continuar para confirmação/i }));
    await user.click(screen.getByRole("button", { name: "Remover perfil definitivamente" }));

    expect(await screen.findByText(/não pode ser removido/i)).toBeInTheDocument();
    expect(screen.getAllByText("Fulano Nômade").length).toBeGreaterThan(0);
  });

  it("explica que a conta global não é apagada", async () => {
    apiMock.getNomade.mockResolvedValue({
      _count: { wallet_transactions: 0, qualifications: 0, withdrawal_requests: 0, task_executions: 0 },
      bank_account: null,
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Remover perfil de Nômade Fulano Nômade" }));
    expect(await screen.findByText(/conta global NÃO é apagada/i)).toBeInTheDocument();
  });
});
