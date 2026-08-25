import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { OpenScreensProvider } from "@/contexts/open-screens-context";

// Lote "remoção/exclusão de perfil de Nômade" (ata 2026-08-25) — cobre os
// dois fluxos de confirmação novos na tela de Nômades dentro de
// admin/empresas/page.tsx: desativar/reativar (reversível, 1 etapa) e
// remover perfil (irreversível, 2 etapas, nunca apaga a conta global). O
// texto do botão/tooltip mudou de "Excluir empresa" genérico pra refletir
// a ação real — nunca "Excluir Nômade definitivamente", já que a conta
// continua existindo depois da remoção do perfil.

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

import AdminEmpresasPage from "@/app/admin/empresas/page";

function nomadFixture(overrides: Partial<any> = {}) {
  return {
    id: "nomade-1",
    user_id: "user-nomade-1",
    name: "Fulano Nômade",
    email: "fulano.nomade@example.com",
    whatsapp: "11999999999",
    cnpj: "12345678000190",
    level: "bronze",
    status: "ativo",
    address: "",
    avatar: null,
    _count: { task_executions: 0 },
    created_at: "2026-08-24T00:00:00.000Z",
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <SidebarProvider>
        <OpenScreensProvider>
          <AdminEmpresasPage />
        </OpenScreensProvider>
      </SidebarProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  apiMock.getNomades.mockResolvedValue({ data: [nomadFixture()], total: 1 });
});

describe("admin/empresas — Nômade: desativar/reativar (reversível)", () => {
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
    // Erro não fecha o diálogo nem dispara o refetch de sucesso — a lista
    // nunca chega a ser atualizada como se a ação tivesse funcionado.
    expect(apiMock.getNomades).toHaveBeenCalledTimes(1);
  });

  it("8. reativação aparece quando o Nômade está inativo", async () => {
    // A lista abre filtrada só por status "Ativo" por padrão (comportamento
    // já existente da tela, não deste lote) — precisa incluir "Inativo" no
    // filtro avançado pra um Nômade desativado aparecer na tabela.
    apiMock.getNomades.mockResolvedValue({ data: [nomadFixture({ status: "inativo" })], total: 1 });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Filtros avançados" }));
    await user.click(await screen.findByRole("button", { name: "Inativo" }));
    await user.click(await screen.findByRole("button", { name: "Aplicar Filtros" }));

    expect(await screen.findByRole("button", { name: "Reativar Nômade Fulano Nômade" })).toBeInTheDocument();
  });
});

describe("admin/empresas — Nômade: remover perfil (duas etapas, conta global preservada)", () => {
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

  it("mostra as relações vinculadas (histórico) na primeira etapa, quando houver", async () => {
    apiMock.getNomade.mockResolvedValue({
      _count: { wallet_transactions: 3, qualifications: 1, withdrawal_requests: 0, task_executions: 5 },
      bank_account: { id: "bank-1" },
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Remover perfil de Nômade Fulano Nômade" }));
    expect(await screen.findByText(/lançamento\(s\) de carteira/)).toBeInTheDocument();
    expect(screen.getByText(/conta bancária cadastrada/)).toBeInTheDocument();
    expect(screen.getByText(/tarefa\(s\) executada\(s\)/)).toBeInTheDocument();
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
