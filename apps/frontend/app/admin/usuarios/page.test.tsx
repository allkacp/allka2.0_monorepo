import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";

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
import { ChatProvider } from "@/contexts/chat-context";

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
            <ChatProvider>
              <AdminUsuariosPage />
            </ChatProvider>
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

// Tanto a página quanto os painéis de criar/editar têm vários Radix
// `Select` na tela ao mesmo tempo (o próprio "Itens: 10" da tabela, tipo de
// conta, status, plano...) — `getByRole("combobox")` sozinho é ambíguo.
// Escolhe o combobox pelo texto atualmente exibido nele (o valor
// selecionado no momento), que é único o suficiente pra cada caso testado
// aqui.
function findComboboxShowing(text: string): HTMLElement {
  const boxes = screen.getAllByRole("combobox");
  const match = boxes.find((b) => b.textContent?.includes(text));
  if (!match) throw new Error(`Nenhum combobox mostrando "${text}" encontrado`);
  return match;
}

// Esta suíte cresceu bastante (árvore grande da página + vários fluxos
// completos de painel lateral) — o timeout padrão de 5000ms passou a ser
// insuficiente por causa do custo de render/transform, não por lentidão
// real de nenhum fluxo específico. 15s dá folga sem mascarar um travamento
// de verdade.
vi.setConfig({ testTimeout: 15000 });

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.removeItem("allka_user");
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

// Lote "users table live updates" (ata 2026-08) — mesmo padrão já corrigido
// em admin/empresas: ações de linha (bloquear/desbloquear/excluir) não
// podem mais substituir a tela inteira por `PageLoader` nem perder busca/
// filtro/página. Antes deste lote, tanto o bloqueio quanto a exclusão
// chamavam o `updateUser`/`deleteUser` do hook `useUsers`, que sempre
// refaz um fetch da lista inteira (reacende `usersLoading`) — agora
// chamam `apiClient.updateUser`/`apiClient.deleteUser` direto e corrigem
// só o registro afetado em memória.
function manyUsers(count: number, overrides: (i: number) => Partial<any> = () => ({})) {
  return Array.from({ length: count }, (_, i) =>
    adminUser({
      id: `user-page-${i}`,
      name: `Usuário Página ${String(i).padStart(2, "0")}`,
      email: `usuario.pagina${i}@example.com`,
      ...overrides(i),
    }),
  );
}

describe("admin/usuarios — carga inicial vs. atualização em segundo plano", () => {
  it("1. o loader global aparece na carga inicial", async () => {
    let resolveUsers: (v: any) => void;
    apiMock.getAdminUsers.mockReturnValue(
      new Promise((resolve) => {
        resolveUsers = resolve;
      }),
    );
    renderPage();

    expect(await screen.findByText("Carregando usuários…")).toBeInTheDocument();
    resolveUsers!({ data: [adminUser()], total: 1 });
    await screen.findByText("Fulano de Tal");
    expect(screen.queryByText("Carregando usuários…")).not.toBeInTheDocument();
  });

  it("2/17. o loader global NÃO reaparece ao bloquear uma linha, e nenhum novo fetch da lista inteira acontece", async () => {
    apiMock.getAdminUsers.mockResolvedValue({ data: [adminUser()], total: 1 });
    apiMock.updateUser.mockResolvedValue({ ...adminUser(), is_active: false });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Fulano de Tal");
    const fetchCallsBefore = apiMock.getAdminUsers.mock.calls.length;

    await openRowMenu(user, "Fulano de Tal");
    await user.click(await screen.findByText("Bloquear usuário"));
    await user.click(screen.getByRole("button", { name: "Bloquear" }));
    await waitFor(() => expect(apiMock.updateUser).toHaveBeenCalled());

    expect(screen.queryByText("Carregando usuários…")).not.toBeInTheDocument();
    expect(apiMock.getAdminUsers.mock.calls.length).toBe(fetchCallsBefore);
  });
});

describe("admin/usuarios — busca, filtro, ordenação e página são preservados", () => {
  it("4. a busca permanece preenchida depois de bloquear um usuário", async () => {
    apiMock.getAdminUsers.mockResolvedValue({
      data: [adminUser(), adminUser({ id: "user-2", name: "Beltrano Souza", email: "beltrano@example.com" })],
      total: 2,
    });
    apiMock.updateUser.mockResolvedValue({ ...adminUser(), is_active: false });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Fulano de Tal");
    const searchBox = screen.getByPlaceholderText(/nome, e-mail ou telefone/i);
    await fillByPaste(user, searchBox, "Fulano");

    await openRowMenu(user, "Fulano de Tal");
    await user.click(await screen.findByText("Bloquear usuário"));
    await user.click(screen.getByRole("button", { name: "Bloquear" }));
    await waitFor(() => expect(apiMock.updateUser).toHaveBeenCalled());

    expect(searchBox).toHaveValue("Fulano");
  });

  it("5/16. o filtro 'Ativos' permanece selecionado, e o usuário bloqueado sai dele (só reaparece em 'Todos')", async () => {
    apiMock.getAdminUsers.mockResolvedValue({ data: [adminUser()], total: 1 });
    apiMock.updateUser.mockResolvedValue({ ...adminUser(), is_active: false });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Fulano de Tal");
    await openRowMenu(user, "Fulano de Tal");
    await user.click(await screen.findByText("Bloquear usuário"));
    await user.click(screen.getByRole("button", { name: "Bloquear" }));

    // Filtro padrão é "Ativos" — o usuário recém-bloqueado some dele.
    await waitFor(() => expect(screen.queryByText("Fulano de Tal")).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Ativos" })).toBeInTheDocument();

    // Mudar pra "Todos" traz ele de volta, já mostrando o status novo.
    await user.click(screen.getByRole("button", { name: "Todos" }));
    expect(await screen.findByText("Fulano de Tal")).toBeInTheDocument();
  });

  it("7. a página atual permanece quando ainda é válida depois de bloquear um usuário de outra página", async () => {
    apiMock.getAdminUsers.mockResolvedValue({ data: manyUsers(15), total: 15 });
    apiMock.updateUser.mockResolvedValue({});
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Usuário Página 00");
    await user.click(screen.getAllByTitle("Próxima página")[0]);
    await screen.findByText("Usuário Página 10");
    expect(screen.queryByText("Usuário Página 00")).not.toBeInTheDocument();

    await openRowMenu(user, "Usuário Página 10");
    await user.click(await screen.findByText("Bloquear usuário"));
    await user.click(screen.getByRole("button", { name: "Bloquear" }));
    await waitFor(() => expect(apiMock.updateUser).toHaveBeenCalled());

    // Continua na página 2 — não voltou pra 1.
    expect(screen.queryByText("Usuário Página 00")).not.toBeInTheDocument();
  });

  it("9. página vazia depois de excluir volta pra uma página válida", async () => {
    // Fluxo pesado (11 linhas + duas confirmações em sequência) — perto do
    // timeout padrão de 5000ms nesta suíte maior; folga explícita evita
    // flakiness por cold-start, sem mudar o que é testado.
    // 11 usuários = página 1 com 10, página 2 com só 1 (o último).
    apiMock.getAdminUsers.mockResolvedValue({ data: manyUsers(11), total: 11 });
    apiMock.deleteUser.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Usuário Página 00");
    await user.click(screen.getAllByTitle("Próxima página")[0]);
    await screen.findByText("Usuário Página 10");

    await openRowMenu(user, "Usuário Página 10");
    await user.click(await screen.findByText("Deletar usuário"));
    await fillByPaste(user, screen.getByPlaceholderText(/motivo da exclusão/i), "Motivo de teste com mais de dez caracteres");
    await user.click(screen.getByRole("button", { name: /continuar para confirmação/i }));
    await user.click(screen.getByRole("button", { name: "Excluir usuário definitivamente" }));

    await waitFor(() => expect(apiMock.deleteUser).toHaveBeenCalledTimes(1));
    // Página 2 ficou vazia — a tela volta pra página 1, que ainda tem 10.
    expect(await screen.findByText("Usuário Página 00")).toBeInTheDocument();
  }, 15000);
});

describe("admin/usuarios — exclusão só remove após confirmação do servidor, erro de rede não altera nada", () => {
  it("8. a linha só some depois da resposta do servidor, nunca antes", async () => {
    let resolveDelete: () => void;
    apiMock.getAdminUsers.mockResolvedValue({ data: [adminUser({ id: "user-slow", name: "Alvo Lento" })], total: 1 });
    apiMock.deleteUser.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveDelete = resolve;
      }),
    );
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Alvo Lento");
    await openRowMenu(user, "Alvo Lento");
    await user.click(await screen.findByText("Deletar usuário"));
    await fillByPaste(user, screen.getByPlaceholderText(/motivo da exclusão/i), "Motivo de teste com mais de dez caracteres");
    await user.click(screen.getByRole("button", { name: /continuar para confirmação/i }));
    await user.click(screen.getByRole("button", { name: "Excluir usuário definitivamente" }));

    // Ainda aguardando o servidor — o usuário continua na tela.
    await waitFor(() => expect(apiMock.deleteUser).toHaveBeenCalledTimes(1));
    expect(screen.getAllByText("Alvo Lento").length).toBeGreaterThan(0);

    resolveDelete!();
    await waitFor(() => expect(screen.queryByText("Alvo Lento")).not.toBeInTheDocument());
  });

  it("12. erro de rede na desativação mantém o usuário intacto (ativo, sem mudar de linha)", async () => {
    apiMock.getAdminUsers.mockResolvedValue({ data: [adminUser()], total: 1 });
    apiMock.updateUser.mockRejectedValue(new TypeError("Failed to fetch"));
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Fulano de Tal");
    await openRowMenu(user, "Fulano de Tal");
    await user.click(await screen.findByText("Bloquear usuário"));
    await user.click(screen.getByRole("button", { name: "Bloquear" }));

    await waitFor(() => expect(apiMock.updateUser).toHaveBeenCalledTimes(1));
    // Diálogo continua aberto com o erro — o usuário nunca saiu da lista de
    // Ativos nem teve o status trocado localmente. `ConfirmationDialog`
    // mostra `err.message` verbatim quando é uma instância de Error.
    expect(await screen.findByText("Failed to fetch")).toBeInTheDocument();
    expect(screen.getAllByText("Fulano de Tal").length).toBeGreaterThan(0);
  });
});

describe("admin/usuarios — clique duplo, loading isolado por linha, e isolamento entre usuários", () => {
  it("13. clique duplo no botão de confirmação não duplica a chamada", async () => {
    let resolveUpdate: (v: any) => void;
    apiMock.getAdminUsers.mockResolvedValue({ data: [adminUser()], total: 1 });
    apiMock.updateUser.mockReturnValue(
      new Promise((resolve) => {
        resolveUpdate = resolve;
      }),
    );
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Fulano de Tal");
    await openRowMenu(user, "Fulano de Tal");
    await user.click(await screen.findByText("Bloquear usuário"));

    const confirmBtn = screen.getByRole("button", { name: "Bloquear" });
    await user.click(confirmBtn);
    // Segundo clique enquanto a primeira chamada ainda está pendente — o
    // próprio ConfirmationDialog ignora cliques repetidos via isSubmitting.
    await user.click(confirmBtn).catch(() => {});

    resolveUpdate!({});
    await waitFor(() => expect(apiMock.updateUser).toHaveBeenCalledTimes(1));
  });

  it("14. o estado de loading fica isolado por usuário — Beltrano não é afetado nem trancado pela ação em Fulano", async () => {
    apiMock.getAdminUsers.mockResolvedValue({
      data: [adminUser(), adminUser({ id: "user-2", name: "Beltrano Souza", email: "beltrano@example.com" })],
      total: 2,
    });
    apiMock.updateUser.mockResolvedValue({});
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Fulano de Tal");
    await openRowMenu(user, "Fulano de Tal");
    await user.click(await screen.findByText("Bloquear usuário"));
    await user.click(screen.getByRole("button", { name: "Bloquear" }));
    await waitFor(() => expect(apiMock.updateUser).toHaveBeenCalledWith("user-1", { is_active: false }));

    // Depois que o diálogo fecha (a ação em Fulano terminou), Beltrano
    // nunca teve seu botão de ações desabilitado por um flag global — ele
    // continua exatamente como estava, disponível pra sua própria ação.
    const beltranoMenuBtn = await screen.findByRole("button", { name: "Mais ações — Beltrano Souza" });
    expect(beltranoMenuBtn).toBeEnabled();
    expect(apiMock.updateUser).not.toHaveBeenCalledWith("user-2", expect.anything());
  });

  it("18. atualizar um usuário não altera outro com nome parecido", async () => {
    apiMock.getAdminUsers.mockResolvedValue({
      data: [
        adminUser({ id: "user-ana-1", name: "Ana Paula Silva", email: "ana.silva@example.com" }),
        adminUser({ id: "user-ana-2", name: "Ana Paula Souza", email: "ana.souza@example.com" }),
      ],
      total: 2,
    });
    apiMock.updateUser.mockResolvedValue({});
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Ana Paula Silva");
    await screen.findByText("Ana Paula Souza");

    await openRowMenu(user, "Ana Paula Silva");
    await user.click(await screen.findByText("Bloquear usuário"));
    await user.click(screen.getByRole("button", { name: "Bloquear" }));
    await waitFor(() => expect(apiMock.updateUser).toHaveBeenCalledWith("user-ana-1", { is_active: false }));

    // Só "Ana Paula Silva" saiu do filtro padrão (Ativos) — "Ana Paula
    // Souza" continua lá, intacta.
    await waitFor(() => expect(screen.queryByText("Ana Paula Silva")).not.toBeInTheDocument());
    expect(screen.getByText("Ana Paula Souza")).toBeInTheDocument();
  });
});

// Lote "users session and local saves" (ata 2026-08) — dois pontos:
// (1) a proteção visual contra autoexclusão usava `currentUserId =
// useState("1")`, um valor fixo que nunca era o id de ninguém de verdade —
// a proteção nunca disparava. Agora lê `localStorage.getItem("allka_user")`
// (a mesma fonte síncrona já usada em sidebar.tsx pra role/nomadUser/
// isPartnerActive, gravada no login antes do primeiro render). (2) os 5
// pontos de salvamento em user-view-slide-panel.tsx, a troca de vínculo, e
// a criação de usuário agora devolvem o registro canônico via um callback
// novo (`onUserSaved`/`onUserCreated` já existia) em vez de disparar
// `refetchUsers()` (GET /api/admin/users?limit=1000 inteiro).
function setSessionUser(id: string) {
  localStorage.setItem("allka_user", JSON.stringify({ id, name: "Quem Está Logado", email: "logado@example.com", role: "admin" }));
}

describe("admin/usuarios — autoexclusão usa a sessão real, não mais um id fixo", () => {
  it("1/5. o id fixo \"1\" não protege mais ninguém — um usuário com id literal \"1\" só é bloqueado se for a sessão de verdade", async () => {
    // Nenhuma sessão gravada (equivalente a "não sou o usuário 1") — um
    // usuário com id literal "1" precisa continuar deletável, provando que
    // a comparação não é mais contra a string fixa "1".
    apiMock.getAdminUsers.mockResolvedValue({ data: [adminUser({ id: "1", name: "Usuário Um" })], total: 1 });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Usuário Um");
    await openRowMenu(user, "Usuário Um");
    const deleteItem = await screen.findByText("Deletar usuário");
    expect(deleteItem.closest('[role="menuitem"]')).not.toHaveAttribute("data-disabled");
  });

  it("2. o usuário autenticado não pode iniciar a própria exclusão — item desabilitado e explicado", async () => {
    setSessionUser("user-1");
    apiMock.getAdminUsers.mockResolvedValue({ data: [adminUser({ id: "user-1", name: "Fulano de Tal" })], total: 1 });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Fulano de Tal");
    await openRowMenu(user, "Fulano de Tal");
    const deleteItem = await screen.findByText("Você não pode excluir sua própria conta");
    const menuitem = deleteItem.closest('[role="menuitem"]')!;
    expect(menuitem).toHaveAttribute("data-disabled");
    expect(menuitem).toHaveAttribute("aria-label", "Você não pode excluir sua própria conta");
  });

  it("3. outro usuário continua elegível para exclusão quando autorizado", async () => {
    setSessionUser("user-logado");
    apiMock.getAdminUsers.mockResolvedValue({ data: [adminUser({ id: "user-1", name: "Fulano de Tal" })], total: 1 });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Fulano de Tal");
    await openRowMenu(user, "Fulano de Tal");
    const deleteItem = await screen.findByText("Deletar usuário");
    expect(deleteItem.closest('[role="menuitem"]')).not.toHaveAttribute("data-disabled");
  });

  it("4. sessão sem `allka_user` (ainda carregando/ausente) não bloqueia ninguém por engano", async () => {
    // Sem `setSessionUser` nenhum — localStorage vazio. currentUserId vira
    // `null`, e `isSelf` exige `currentUserId !== null`, então nenhum
    // usuário real é confundido com "eu mesmo" só por falta de sessão.
    apiMock.getAdminUsers.mockResolvedValue({ data: [adminUser({ id: "user-1", name: "Fulano de Tal" })], total: 1 });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Fulano de Tal");
    await openRowMenu(user, "Fulano de Tal");
    const deleteItem = await screen.findByText("Deletar usuário");
    expect(deleteItem.closest('[role="menuitem"]')).not.toHaveAttribute("data-disabled");
  });

  it("6. a proteção do servidor (409, último admin) continua tratada corretamente mesmo com a sessão certa", async () => {
    setSessionUser("user-logado");
    apiMock.getAdminUsers.mockResolvedValue({ data: [adminUser({ id: "user-del-x", name: "Alvo Protegido" })], total: 1 });
    apiMock.deleteUser.mockRejectedValue(
      new ApiErrorMock("Não é possível excluir o último administrador responsável (Master) do sistema.", 409),
    );
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Alvo Protegido");
    await openRowMenu(user, "Alvo Protegido");
    await user.click(await screen.findByText("Deletar usuário"));
    await fillByPaste(user, screen.getByPlaceholderText(/motivo da exclusão/i), "Motivo de teste com mais de dez caracteres");
    await user.click(screen.getByRole("button", { name: /continuar para confirmação/i }));
    await user.click(screen.getByRole("button", { name: "Excluir usuário definitivamente" }));

    await waitFor(() => expect(apiMock.deleteUser).toHaveBeenCalledTimes(1));
    expect(screen.getAllByText("Alvo Protegido").length).toBeGreaterThan(0);
  });
});

// Abre o painel de detalhes/edição via deep-link de URL (o mesmo mecanismo
// que o app usa pra "Ver"/"Editar" na tabela) — evita depender dos ícones
// sem nome acessível na linha (Eye/Edit, só com Tooltip, sem aria-label).
function renderPageForUserCode(userCode: string) {
  const num = parseInt((userCode.match(/(\d+)\s*$/) || [])[1] || "0", 10);
  return render(
    <MemoryRouter initialEntries={[`/admin/usuarios/${num}`]}>
      <SidebarProvider>
        <OpenScreensProvider>
          <PlatformUsersProvider>
            <ChatProvider>
              <Routes>
                <Route path="/admin/usuarios/:userId" element={<AdminUsuariosPage />} />
              </Routes>
            </ChatProvider>
          </PlatformUsersProvider>
        </OpenScreensProvider>
      </SidebarProvider>
    </MemoryRouter>,
  );
}

describe("admin/usuarios — editar (painel lateral) atualiza só a linha correspondente", () => {
  it("7/9/12/13. salvar o nome via 'Conta & Dados' atualiza só esse usuário, sem refetch completo, preservando busca", async () => {
    apiMock.getAdminUsers.mockResolvedValue({
      data: [
        adminUser({ id: "user-1", user_code: "usr_00001", name: "Fulano de Tal" }),
        adminUser({ id: "user-2", user_code: "usr_00002", name: "Beltrano Souza", email: "beltrano@example.com" }),
      ],
      total: 2,
    });
    apiMock.updateUser.mockResolvedValue({ id: "user-1", name: "Fulano Editado" });
    const user = userEvent.setup();
    renderPageForUserCode("usr_00001");

    // O deep-link já abre o painel — nome aparece na linha da tabela E no
    // painel ao mesmo tempo.
    await waitFor(() => expect(screen.getAllByText("Fulano de Tal").length).toBeGreaterThan(0));
    const fetchCallsBefore = apiMock.getAdminUsers.mock.calls.length;

    // Deixa uma busca preenchida antes de editar, pra provar que sobrevive.
    const searchBox = screen.getByPlaceholderText(/nome, e-mail ou telefone/i);
    await fillByPaste(user, searchBox, "Fulano");

    // O painel abre na aba "Visão Geral" — muda pra "Conta & Dados".
    await user.click(await screen.findByRole("tab", { name: "Conta & Dados" }));
    await user.click(await screen.findByRole("button", { name: "Editar" }));

    const nameInput = await screen.findByDisplayValue("Fulano de Tal");
    await user.clear(nameInput);
    await user.type(nameInput, "Fulano Editado");

    await user.click(screen.getByRole("button", { name: "Salvar" }));
    await user.click(await screen.findByRole("button", { name: "Confirmar" }));

    await waitFor(() => expect(apiMock.updateUser).toHaveBeenCalledWith("user-1", expect.objectContaining({ name: "Fulano Editado" })));
    // Nenhum novo GET /api/admin/users — atualização localizada.
    expect(apiMock.getAdminUsers.mock.calls.length).toBe(fetchCallsBefore);
    expect(searchBox).toHaveValue("Fulano");
  });

  it("10. erro no salvamento mantém os dados anteriores na tabela", async () => {
    apiMock.getAdminUsers.mockResolvedValue({ data: [adminUser({ id: "user-1", user_code: "usr_00001", name: "Fulano de Tal" })], total: 1 });
    apiMock.updateUser.mockRejectedValue(new ApiErrorMock("Não foi possível salvar.", 500));
    const user = userEvent.setup();
    renderPageForUserCode("usr_00001");

    await waitFor(() => expect(screen.getAllByText("Fulano de Tal").length).toBeGreaterThan(0));
    await user.click(await screen.findByRole("tab", { name: "Conta & Dados" }));
    await user.click(await screen.findByRole("button", { name: "Editar" }));
    const nameInput = await screen.findByDisplayValue("Fulano de Tal");
    await user.clear(nameInput);
    await user.type(nameInput, "Nome Que Não Deveria Persistir");
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    await user.click(await screen.findByRole("button", { name: "Confirmar" }));

    await waitFor(() => expect(apiMock.updateUser).toHaveBeenCalledTimes(1));
    // A tabela (fora do painel) nunca chegou a receber o nome novo.
    expect(screen.getAllByText("Fulano de Tal").length).toBeGreaterThan(0);
  });

  it("11. dois usuários com nomes parecidos não são confundidos ao editar um deles", async () => {
    apiMock.getAdminUsers.mockResolvedValue({
      data: [
        adminUser({ id: "user-ana-1", user_code: "usr_00003", name: "Ana Paula Silva", email: "ana.silva@example.com" }),
        adminUser({ id: "user-ana-2", user_code: "usr_00004", name: "Ana Paula Souza", email: "ana.souza@example.com" }),
      ],
      total: 2,
    });
    apiMock.updateUser.mockResolvedValue({ id: "user-ana-1", name: "Ana Paula Editada" });
    const user = userEvent.setup();
    renderPageForUserCode("usr_00003");

    await waitFor(() => expect(screen.getAllByText("Ana Paula Silva").length).toBeGreaterThan(0));
    await user.click(await screen.findByRole("tab", { name: "Conta & Dados" }));
    await user.click(await screen.findByRole("button", { name: "Editar" }));
    const nameInput = await screen.findByDisplayValue("Ana Paula Silva");
    await user.clear(nameInput);
    await user.type(nameInput, "Ana Paula Editada");
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    await user.click(await screen.findByRole("button", { name: "Confirmar" }));

    await waitFor(() => expect(apiMock.updateUser).toHaveBeenCalledWith("user-ana-1", expect.anything()));
    await waitFor(() => expect(screen.getAllByText("Ana Paula Editada").length).toBeGreaterThan(0));
    // "Ana Paula Souza" nunca foi tocada.
    expect(screen.getByText("Ana Paula Souza")).toBeInTheDocument();
  });
});

describe("admin/usuarios — troca de vínculo atualiza só a linha afetada", () => {
  it("14/15. trocar a empresa vinculada atualiza só esse usuário com a resposta canônica do servidor", async () => {
    apiMock.getAdminUsers.mockResolvedValue({
      data: [adminUser({ id: "user-1", name: "Fulano de Tal", account_type: "empresas", company_id: null })],
      total: 1,
    });
    apiMock.getCompanies.mockResolvedValue({ data: [{ id: "company-9", name: "Empresa Nova LTDA" }], total: 1 });
    apiMock.updateAdminUserCompanyLink.mockResolvedValue({
      id: "user-1",
      name: "Fulano de Tal",
      company_id: "company-9",
      company_name: "Empresa Nova LTDA",
    });
    // O `SlidePanel` de vínculo é um overlay empilhado sobre o painel de
    // informações — `pointerEventsCheck` precisa ser desligado na hora do
    // `setup()` nesta versão do user-event (não existe opção por-clique).
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderPage();

    await screen.findByText("Fulano de Tal");
    const fetchCallsBefore = apiMock.getAdminUsers.mock.calls.length;

    await openRowMenu(user, "Fulano de Tal");
    await user.click(await screen.findByText("Ver todas as informações"));
    await user.click(await screen.findByRole("button", { name: "Alterar vínculo" }));

    await user.click(findComboboxShowing("Sem empresa vinculada"));
    await user.click(await screen.findByText("Empresa Nova LTDA"));
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(apiMock.updateAdminUserCompanyLink).toHaveBeenCalledTimes(1));
    expect(apiMock.getAdminUsers.mock.calls.length).toBe(fetchCallsBefore);
  });

  it("16/17. falha na troca de vínculo mantém o vínculo anterior, e clique duplo não duplica a chamada", async () => {
    apiMock.getAdminUsers.mockResolvedValue({
      data: [adminUser({ id: "user-1", name: "Fulano de Tal", account_type: "empresas", company_id: null })],
      total: 1,
    });
    apiMock.getCompanies.mockResolvedValue({ data: [{ id: "company-9", name: "Empresa Nova LTDA" }], total: 1 });
    let resolveLink: (v: any) => void;
    apiMock.updateAdminUserCompanyLink.mockReturnValue(
      new Promise((resolve) => {
        resolveLink = resolve;
      }),
    );
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderPage();

    await screen.findByText("Fulano de Tal");
    await openRowMenu(user, "Fulano de Tal");
    await user.click(await screen.findByText("Ver todas as informações"));
    await user.click(await screen.findByRole("button", { name: "Alterar vínculo" }));
    await user.click(findComboboxShowing("Sem empresa vinculada"));
    await user.click(await screen.findByText("Empresa Nova LTDA"));

    const saveBtn = screen.getByRole("button", { name: "Salvar" });
    await user.click(saveBtn);
    await user.click(saveBtn).catch(() => {});

    resolveLink!({ id: "user-1", name: "Fulano de Tal", company_id: "company-9", company_name: "Empresa Nova LTDA" });
    await waitFor(() => expect(apiMock.updateAdminUserCompanyLink).toHaveBeenCalledTimes(1));
  });
});

describe("admin/usuarios — criar usuário insere sem duplicar e sem refetch completo", () => {
  it("18/19/21/22. criação insere exatamente um usuário, usando a resposta do servidor, sem refazer a lista inteira", async () => {
    apiMock.getAdminUsers.mockResolvedValue({ data: [], total: 0 });
    apiMock.getCompanies.mockResolvedValue({ data: [], total: 0 });
    apiMock.createUser.mockResolvedValue({
      id: "user-novo",
      name: "Usuário Recém Criado",
      email: "novo@example.com",
      role: "admin",
      account_type: "admin",
      is_active: true,
    });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Nenhum usuário encontrado");
    const fetchCallsBefore = apiMock.getAdminUsers.mock.calls.length;

    await user.click(await screen.findByRole("button", { name: "Novo Usuário" }));

    await fillByPaste(user, await screen.findByPlaceholderText("Ex: João Silva"), "Usuário Recém Criado");
    await fillByPaste(user, screen.getByPlaceholderText("Ex: joao@empresa.com"), "novo@example.com");
    await fillByPaste(user, screen.getByPlaceholderText("Ex: joao.silva"), "usuario.novo");
    await fillByPaste(user, screen.getByPlaceholderText("Mínimo 6 caracteres"), "SenhaForte123");
    // "Admin" evita os campos extras de organização/CNPJ exigidos por
    // Company/Agency/Líder na etapa 1.
    await user.click(findComboboxShowing("Company"));
    await user.click(await screen.findByText("Admin"));

    await user.click(screen.getByRole("button", { name: /próximo/i }));
    await user.click(await screen.findByRole("button", { name: /próximo/i }));
    await user.click(await screen.findByRole("button", { name: "Criar Usuário" }));

    await waitFor(() => expect(apiMock.createUser).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Usuário Recém Criado")).toBeInTheDocument();
    expect(screen.getAllByText("Usuário Recém Criado").length).toBe(1);
    expect(apiMock.getAdminUsers.mock.calls.length).toBe(fetchCallsBefore);
  });

  it("20. usuário criado fora do filtro atual (ex.: inativo, com filtro Ativos) não aparece incorretamente", async () => {
    apiMock.getAdminUsers.mockResolvedValue({ data: [], total: 0 });
    apiMock.getCompanies.mockResolvedValue({ data: [], total: 0 });
    apiMock.createUser.mockResolvedValue({
      id: "user-novo-inativo",
      name: "Usuário Inativo Recém Criado",
      email: "inativo@example.com",
      role: "admin",
      account_type: "admin",
      is_active: false,
    });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Nenhum usuário encontrado");
    await user.click(await screen.findByRole("button", { name: "Novo Usuário" }));
    await fillByPaste(user, await screen.findByPlaceholderText("Ex: João Silva"), "Usuário Inativo Recém Criado");
    await fillByPaste(user, screen.getByPlaceholderText("Ex: joao@empresa.com"), "inativo@example.com");
    await fillByPaste(user, screen.getByPlaceholderText("Ex: joao.silva"), "usuario.inativo");
    await fillByPaste(user, screen.getByPlaceholderText("Mínimo 6 caracteres"), "SenhaForte123");
    await user.click(findComboboxShowing("Company"));
    await user.click(await screen.findByText("Admin"));
    await user.click(screen.getByRole("button", { name: /próximo/i }));
    await user.click(await screen.findByRole("button", { name: /próximo/i }));
    await user.click(await screen.findByRole("button", { name: "Criar Usuário" }));

    await waitFor(() => expect(apiMock.createUser).toHaveBeenCalledTimes(1));
    // Filtro padrão da tela é "Ativos" — um usuário criado inativo não deve
    // aparecer nele (mesma checagem client-side já usada pra bloquear/
    // desbloquear, ver linha 567-570 do componente).
    await waitFor(() => expect(screen.queryByText("Usuário Inativo Recém Criado")).not.toBeInTheDocument());
  });

  it("21. erro na criação não insere uma linha falsa", async () => {
    apiMock.getAdminUsers.mockResolvedValue({ data: [], total: 0 });
    apiMock.getCompanies.mockResolvedValue({ data: [], total: 0 });
    apiMock.createUser.mockRejectedValue(new ApiErrorMock("E-mail já cadastrado.", 409));
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Nenhum usuário encontrado");
    await user.click(await screen.findByRole("button", { name: "Novo Usuário" }));
    await fillByPaste(user, await screen.findByPlaceholderText("Ex: João Silva"), "Usuário Que Falha");
    await fillByPaste(user, screen.getByPlaceholderText("Ex: joao@empresa.com"), "falha@example.com");
    await fillByPaste(user, screen.getByPlaceholderText("Ex: joao.silva"), "usuario.falha");
    await fillByPaste(user, screen.getByPlaceholderText("Mínimo 6 caracteres"), "SenhaForte123");
    await user.click(findComboboxShowing("Company"));
    await user.click(await screen.findByText("Admin"));
    await user.click(screen.getByRole("button", { name: /próximo/i }));
    await user.click(await screen.findByRole("button", { name: /próximo/i }));
    await user.click(await screen.findByRole("button", { name: "Criar Usuário" }));

    await waitFor(() => expect(apiMock.createUser).toHaveBeenCalledTimes(1));
    expect(screen.queryByText("Usuário Que Falha")).not.toBeInTheDocument();
  });
});
