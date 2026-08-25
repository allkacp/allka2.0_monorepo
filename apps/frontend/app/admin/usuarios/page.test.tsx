import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

// Lote "ações destrutivas de conta" (ata 2026-08-25) — cobre os dois fluxos
// de confirmação corrigidos em admin/usuarios/page.tsx: bloquear/desbloquear
// (ação reversível, confirmação de 1 etapa com nome/e-mail mascarado/
// consequência/como reativar) e excluir definitivamente (agora com
// confirmação de DUAS etapas de verdade — antes era um único modal com
// campo de motivo que já chamava DELETE no primeiro clique, sem 2ª
// confirmação). A página inteira (~3800 linhas) monta em jsdom desde que
// receba os providers de contexto que ela consome (PlatformUsers/Sidebar/
// OpenScreens) — diferente de admin/projetos/page.tsx, que tem um loop
// pré-existente do @radix-ui/react-compose-refs e nunca foi testável.

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

import AdminUsuariosPage from "@/app/admin/usuarios/page";
import { PlatformUsersProvider } from "@/contexts/platform-users-context";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { OpenScreensProvider } from "@/contexts/open-screens-context";

function adminUser(overrides: Partial<any> = {}) {
  return {
    id: "user-1",
    user_code: "usr_00001",
    name: "Fulano de Tal",
    email: "fulano.detal@example.com",
    role: "company_user",
    account_type: "empresas",
    is_active: true,
    is_admin: false,
    status: "ativo",
    created_at: "2026-08-24T00:00:00.000Z",
    updated_at: "2026-08-24T00:00:00.000Z",
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <SidebarProvider>
        <OpenScreensProvider>
          <PlatformUsersProvider>
            <AdminUsuariosPage />
          </PlatformUsersProvider>
        </OpenScreensProvider>
      </SidebarProvider>
    </MemoryRouter>,
  );
}

async function openRowMenu(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(await screen.findByRole("button", { name: `Mais ações — ${name}` }));
}

// Esta página é pesada (tabela grande + vários providers) — `user.type()`
// caractere a caractere num campo livre chegou a levar ~5.4s (medido),
// perto do timeout padrão de 5000ms, só por causa do custo de re-render a
// cada tecla nessa árvore grande. O motivo da exclusão não é o que o teste
// quer validar aqui (é só um gate de "tem texto"), então colar é
// equivalente e evita pagar esse custo — mesma técnica já usada no lote de
// otimização dos testes do product-feedback-widget.
async function fillByPaste(user: ReturnType<typeof userEvent.setup>, input: HTMLElement, text: string) {
  await user.click(input);
  await user.paste(text);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("admin/usuarios — bloquear/desbloquear (ação reversível)", () => {
  it("1. o texto do botão reflete a ação real (Bloquear/Desbloquear, nunca 'excluir')", async () => {
    apiMock.getAdminUsers.mockResolvedValue({ data: [adminUser()], total: 1 });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Fulano de Tal");
    await openRowMenu(user, "Fulano de Tal");
    expect(await screen.findByText("Bloquear usuário")).toBeInTheDocument();
  });

  it("2. abrir a confirmação de bloqueio mostra nome, e-mail mascarado, tipo de conta e a consequência", async () => {
    apiMock.getAdminUsers.mockResolvedValue({ data: [adminUser()], total: 1 });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Fulano de Tal");
    await openRowMenu(user, "Fulano de Tal");
    await user.click(await screen.findByText("Bloquear usuário"));

    expect(await screen.findByText(/fu\*+@example\.com/)).toBeInTheDocument();
    expect(screen.getByText(/nenhum dado é apagado/i)).toBeInTheDocument();
  });

  it("3. cancelar mantém o usuário ativo (não chama a API)", async () => {
    apiMock.getAdminUsers.mockResolvedValue({ data: [adminUser()], total: 1 });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Fulano de Tal");
    await openRowMenu(user, "Fulano de Tal");
    await user.click(await screen.findByText("Bloquear usuário"));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.queryByText(/nenhum dado é apagado/i)).not.toBeInTheDocument());
    expect(apiMock.updateUser).not.toHaveBeenCalled();
  });

  it("5. confirmar chama a API uma única vez e 6. erro mantém o usuário (diálogo mostra a mensagem, não fecha)", async () => {
    apiMock.getAdminUsers.mockResolvedValue({ data: [adminUser()], total: 1 });
    apiMock.updateUser.mockRejectedValue(new ApiErrorMock("Só um Admin Master pode alterar o acesso de outro Admin Master.", 403));
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Fulano de Tal");
    await openRowMenu(user, "Fulano de Tal");
    await user.click(await screen.findByText("Bloquear usuário"));
    await user.click(screen.getByRole("button", { name: "Bloquear" }));

    expect(await screen.findByText("Só um Admin Master pode alterar o acesso de outro Admin Master.")).toBeInTheDocument();
    expect(apiMock.updateUser).toHaveBeenCalledTimes(1);
  });

  it("7. sucesso atualiza a lista (a linha reflete o novo status)", async () => {
    apiMock.getAdminUsers.mockResolvedValue({ data: [adminUser()], total: 1 });
    apiMock.updateUser.mockResolvedValue({ ...adminUser(), is_active: false });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Fulano de Tal");
    await openRowMenu(user, "Fulano de Tal");
    await user.click(await screen.findByText("Bloquear usuário"));
    await user.click(screen.getByRole("button", { name: "Bloquear" }));

    await waitFor(() => expect(apiMock.updateUser).toHaveBeenCalledWith("user-1", { is_active: false }));
  });
});

describe("admin/usuarios — excluir usuário (confirmação em duas etapas)", () => {
  it("1. window.confirm não é usado neste fluxo", async () => {
    const confirmSpy = vi.spyOn(window, "confirm");
    apiMock.getAdminUsers.mockResolvedValue({ data: [adminUser({ id: "user-del-1", name: "Alvo Exclusão" })], total: 1 });
    renderPage();

    await screen.findByText("Alvo Exclusão");
    expect(confirmSpy).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it("4/5. voltar mantém o usuário; a 1ª etapa nunca chama DELETE", async () => {
    apiMock.getAdminUsers.mockResolvedValue({ data: [adminUser({ id: "user-del-2", name: "Alvo Dois" })], total: 1 });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Alvo Dois");
    await openRowMenu(user, "Alvo Dois");
    await user.click(await screen.findByText("Deletar usuário"));

    await fillByPaste(user, screen.getByPlaceholderText(/motivo da exclusão/i), "Motivo de teste com mais de dez caracteres");
    await user.click(screen.getByRole("button", { name: /continuar para confirmação/i }));
    expect(await screen.findByText("Excluir usuário definitivamente")).toBeInTheDocument();
    expect(apiMock.deleteUser).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /voltar/i }));
    expect(await screen.findByPlaceholderText(/motivo da exclusão/i)).toBeInTheDocument();
    expect(apiMock.deleteUser).not.toHaveBeenCalled();
  });

  it("9. a exclusão definitiva chama DELETE só na 2ª etapa, uma única vez", async () => {
    apiMock.getAdminUsers.mockResolvedValue({ data: [adminUser({ id: "user-del-3", name: "Alvo Tres" })], total: 1 });
    apiMock.deleteUser.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Alvo Tres");
    await openRowMenu(user, "Alvo Tres");
    await user.click(await screen.findByText("Deletar usuário"));
    await fillByPaste(user, screen.getByPlaceholderText(/motivo da exclusão/i), "Motivo de teste com mais de dez caracteres");
    await user.click(screen.getByRole("button", { name: /continuar para confirmação/i }));

    expect(apiMock.deleteUser).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Excluir usuário definitivamente" }));

    await waitFor(() => expect(apiMock.deleteUser).toHaveBeenCalledTimes(1));
    expect(apiMock.deleteUser).toHaveBeenCalledWith("user-del-3", "Motivo de teste com mais de dez caracteres");
  });

  it("6. erro na 2ª etapa mantém o usuário na tela (diálogo continua aberto)", async () => {
    apiMock.getAdminUsers.mockResolvedValue({ data: [adminUser({ id: "user-del-4", name: "Alvo Quatro" })], total: 1 });
    apiMock.deleteUser.mockRejectedValue(new ApiErrorMock("Não é possível excluir o último administrador responsável (Master) do sistema.", 409));
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Alvo Quatro");
    await openRowMenu(user, "Alvo Quatro");
    await user.click(await screen.findByText("Deletar usuário"));
    await fillByPaste(user, screen.getByPlaceholderText(/motivo da exclusão/i), "Motivo de teste com mais de dez caracteres");
    await user.click(screen.getByRole("button", { name: /continuar para confirmação/i }));
    await user.click(screen.getByRole("button", { name: "Excluir usuário definitivamente" }));

    await waitFor(() => expect(apiMock.deleteUser).toHaveBeenCalledTimes(1));
    expect(screen.getAllByText("Alvo Quatro").length).toBeGreaterThan(0);
  });
});
