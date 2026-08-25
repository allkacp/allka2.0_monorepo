import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { OpenScreensProvider } from "@/contexts/open-screens-context";

// Lote "align Nomad management with company domain" (ata 2026-08) — Nomad é
// um tipo de EMPRESA (CNPJ), gerida junto de Company/Agência na aba/badge
// Nomad desta mesma tela — nunca um perfil profissional isolado. Cobre os
// dois fluxos de confirmação da aba Nomad: desativar/reativar empresa
// (reversível, 1 etapa) e excluir empresa (irreversível, 2 etapas, nunca
// apaga a conta de login vinculada). Textos usam sempre "empresa Nomad",
// nunca "perfil de Nômade".

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

function companyFixture(overrides: Partial<any> = {}) {
  return {
    id: "company-1",
    sequence_number: 501,
    name: "Empresa Cliente Direta",
    type: "empresa",
    cnpj: "11222333000144",
    email: "contato@clientedireta.example.com",
    phone: "11988887777",
    status: "ativo",
    address: "",
    created_at: "2026-08-24T00:00:00.000Z",
    updated_at: "2026-08-24T00:00:00.000Z",
    ...overrides,
  };
}

function agencyFixture(overrides: Partial<any> = {}) {
  return {
    id: "agency-1",
    sequence_number: 601,
    name: "Agência Parceira",
    cnpj: "22333444000155",
    email: "contato@agenciaparceira.example.com",
    phone: "11977776666",
    status: "ativo",
    address: "",
    partner_level: "bronze",
    partner_profile: null,
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
  apiMock.getCompanies.mockResolvedValue({ data: [], total: 0 });
  apiMock.getAgencies.mockResolvedValue({ data: [], total: 0 });
});

describe("admin/empresas — empresa Nomad: desativar/reativar (reversível)", () => {
  it("1. o botão mostra 'Desativar empresa Nomad' pra uma empresa ativa (nunca 'Excluir')", async () => {
    renderPage();
    expect(await screen.findByRole("button", { name: "Desativar empresa Nomad Fulano Nômade" })).toBeInTheDocument();
    // Nunca o rótulo genérico de pessoa física usado no lote errado anterior.
    expect(screen.queryByRole("button", { name: "Excluir Nômade Fulano Nômade" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remover perfil de Nômade Fulano Nômade" })).not.toBeInTheDocument();
  });

  it("2/3. abrir a confirmação mostra nome, e-mail mascarado e a consequência; cancelar não altera", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Desativar empresa Nomad Fulano Nômade" }));
    expect(await screen.findByText(/fu\*+@example\.com/)).toBeInTheDocument();
    expect(screen.getByText(/login fica bloqueado/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(screen.queryByText(/login fica bloqueado/i)).not.toBeInTheDocument());
    expect(apiMock.updateNomadeStatus).not.toHaveBeenCalled();
  });

  it("4/7. confirmar chama a API uma vez com status inativo e atualiza a lista SEM refazer o fetch (evita o recarregamento completo)", async () => {
    apiMock.updateNomadeStatus.mockResolvedValue({ status: "inativo" });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Desativar empresa Nomad Fulano Nômade" }));
    await user.click(screen.getByRole("button", { name: "Desativar" }));

    await waitFor(() => expect(apiMock.updateNomadeStatus).toHaveBeenCalledWith("nomade-1", "inativo"));
    // A lista sai do filtro padrão (só Ativos) sem um novo GET /api/nomades —
    // a linha é atualizada localmente a partir da própria resposta da ação.
    await waitFor(() => expect(screen.queryByText("Fulano Nômade")).not.toBeInTheDocument());
    expect(apiMock.getNomades).toHaveBeenCalledTimes(1);
  });

  it("5/6. erro na desativação mostra mensagem amigável e mantém o registro", async () => {
    apiMock.updateNomadeStatus.mockRejectedValue(new ApiErrorMock("Não foi possível desativar", 500));
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Desativar empresa Nomad Fulano Nômade" }));
    await user.click(screen.getByRole("button", { name: "Desativar" }));

    expect(await screen.findByText("Não foi possível desativar")).toBeInTheDocument();
    // Erro não fecha o diálogo nem dispara o refetch de sucesso — a lista
    // nunca chega a ser atualizada como se a ação tivesse funcionado.
    expect(apiMock.getNomades).toHaveBeenCalledTimes(1);
  });

  it("8. reativação aparece quando a empresa Nomad está inativa", async () => {
    // A lista abre filtrada só por status "Ativo" por padrão (comportamento
    // já existente da tela, não deste lote) — precisa incluir "Inativo" no
    // filtro avançado pra uma empresa Nomad desativada aparecer na tabela.
    apiMock.getNomades.mockResolvedValue({ data: [nomadFixture({ status: "inativo" })], total: 1 });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Filtros avançados" }));
    await user.click(await screen.findByRole("button", { name: "Inativo" }));
    await user.click(await screen.findByRole("button", { name: "Aplicar Filtros" }));

    expect(await screen.findByRole("button", { name: "Reativar empresa Nomad Fulano Nômade" })).toBeInTheDocument();
  });
});

describe("admin/empresas — empresa Nomad: excluir (duas etapas, conta de login preservada)", () => {
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

    await user.click(await screen.findByRole("button", { name: "Excluir empresa Nomad Fulano Nômade" }));
    expect(await screen.findByText("Excluir empresa Nomad")).toBeInTheDocument();
    expect(apiMock.deleteNomade).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /continuar para confirmação/i }));
    expect(await screen.findByText("Excluir empresa definitivamente")).toBeInTheDocument();
    expect(apiMock.deleteNomade).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Excluir empresa definitivamente" }));
    await waitFor(() => expect(apiMock.deleteNomade).toHaveBeenCalledTimes(1));
  });

  it("2. cancelar mantém a empresa Nomad", async () => {
    apiMock.getNomade.mockResolvedValue({
      _count: { wallet_transactions: 0, qualifications: 0, withdrawal_requests: 0, task_executions: 0 },
      bank_account: null,
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Excluir empresa Nomad Fulano Nômade" }));
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

    await user.click(await screen.findByRole("button", { name: "Excluir empresa Nomad Fulano Nômade" }));
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
      new ApiErrorMock("Esta empresa Nomad tem histórico vinculado (2 tarefa(s) executada(s)) e não pode ser excluída — desative a empresa Nomad em vez de excluí-la.", 409),
    );
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Excluir empresa Nomad Fulano Nômade" }));
    await user.click(await screen.findByRole("button", { name: /continuar para confirmação/i }));
    await user.click(screen.getByRole("button", { name: "Excluir empresa definitivamente" }));

    expect(await screen.findByText(/não pode ser excluída/i)).toBeInTheDocument();
    expect(screen.getAllByText("Fulano Nômade").length).toBeGreaterThan(0);
  });

  it("explica que a conta de login vinculada não é apagada", async () => {
    apiMock.getNomade.mockResolvedValue({
      _count: { wallet_transactions: 0, qualifications: 0, withdrawal_requests: 0, task_executions: 0 },
      bank_account: null,
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Excluir empresa Nomad Fulano Nômade" }));
    expect((await screen.findAllByText(/conta de login vinculada.*NÃO é apagada|conta de login vinculada não é apagada/i)).length).toBeGreaterThan(0);
  });
});

describe("admin/empresas — redirecionamento da rota antiga /admin/nomades", () => {
  it("?type=nomad abre a lista já filtrada na aba Nomad", async () => {
    render(
      <MemoryRouter initialEntries={["/admin/empresas?type=nomad"]}>
        <SidebarProvider>
          <OpenScreensProvider>
            <AdminEmpresasPage />
          </OpenScreensProvider>
        </SidebarProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Fulano Nômade")).toBeInTheDocument();
    const nomadChip = await screen.findByRole("button", { name: "Nomad" });
    expect(nomadChip).toHaveAttribute("aria-pressed", "true");
  });
});

// Lote "update company table without reload and correct filters" (ata
// 2026-08) — Nomad/Agência/Company são os três tipos principais; Partner NÃO
// é um quarto tipo, é um upgrade que uma Agência recebe (company.partner_status),
// só filtrável como subfiltro dentro de Agência.
function renderAtUrl(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <SidebarProvider>
        <OpenScreensProvider>
          <AdminEmpresasPage />
        </OpenScreensProvider>
      </SidebarProvider>
    </MemoryRouter>,
  );
}

describe("admin/empresas — filtros principais mostram só o tipo selecionado", () => {
  beforeEach(() => {
    apiMock.getCompanies.mockResolvedValue({ data: [companyFixture()], total: 1 });
    apiMock.getAgencies.mockResolvedValue({
      data: [agencyFixture({ partner_profile: { status: "active" } })],
      total: 1,
    });
    apiMock.getNomades.mockResolvedValue({ data: [nomadFixture()], total: 1 });
  });

  it("1. Nomad mostra somente Nomad", async () => {
    renderAtUrl("/admin/empresas?type=nomad");
    expect(await screen.findByText("Fulano Nômade")).toBeInTheDocument();
    expect(screen.queryByText("Empresa Cliente Direta")).not.toBeInTheDocument();
    expect(screen.queryByText("Agência Parceira")).not.toBeInTheDocument();
  });

  it("2. Agency mostra somente Agência", async () => {
    renderAtUrl("/admin/empresas?type=agency");
    expect(await screen.findByText("Agência Parceira")).toBeInTheDocument();
    expect(screen.queryByText("Empresa Cliente Direta")).not.toBeInTheDocument();
    expect(screen.queryByText("Fulano Nômade")).not.toBeInTheDocument();
  });

  it("3. Company mostra somente Company", async () => {
    renderAtUrl("/admin/empresas?type=company");
    expect(await screen.findByText("Empresa Cliente Direta")).toBeInTheDocument();
    expect(screen.queryByText("Agência Parceira")).not.toBeInTheDocument();
    expect(screen.queryByText("Fulano Nômade")).not.toBeInTheDocument();
  });

  it("4/5. Partner não é um chip principal — só existe dentro de Agência", async () => {
    renderAtUrl("/admin/empresas?type=nomad");
    await screen.findByText("Fulano Nômade");
    expect(screen.queryByRole("button", { name: "Partner" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Partners" })).not.toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Agency" }));
    expect(await screen.findByRole("button", { name: "Partners" })).toBeInTheDocument();
  });

  it("6. Partner filtra corretamente dentro de Agência", async () => {
    apiMock.getAgencies.mockResolvedValue({
      data: [
        agencyFixture({ id: "agency-partner", name: "Agência Partner Ativa", partner_profile: { status: "active" } }),
        agencyFixture({ id: "agency-plain", name: "Agência Sem Partner", partner_profile: null }),
      ],
      total: 2,
    });
    renderAtUrl("/admin/empresas?type=agency");
    await screen.findByText("Agência Partner Ativa");
    expect(screen.getByText("Agência Sem Partner")).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Partners" }));
    await waitFor(() => expect(screen.queryByText("Agência Sem Partner")).not.toBeInTheDocument());
    expect(screen.getByText("Agência Partner Ativa")).toBeInTheDocument();

    await user.click(await screen.findByRole("button", { name: "Não Partners" }));
    await waitFor(() => expect(screen.queryByText("Agência Partner Ativa")).not.toBeInTheDocument());
    expect(screen.getByText("Agência Sem Partner")).toBeInTheDocument();
  });

  it("7. sair de Agência limpa o subfiltro Partner", async () => {
    const user = userEvent.setup();
    renderAtUrl("/admin/empresas?type=agency");
    await user.click(await screen.findByRole("button", { name: "Partners" }));
    expect(await screen.findByRole("button", { name: "Partners" })).toHaveAttribute("aria-pressed", "true");

    await user.click(await screen.findByRole("button", { name: "Company" }));
    expect(screen.queryByRole("button", { name: "Partners" })).not.toBeInTheDocument();

    await user.click(await screen.findByRole("button", { name: "Agency" }));
    expect(await screen.findByRole("button", { name: "Todas as Agências" })).toHaveAttribute("aria-pressed", "true");
  });

  it("9. clicar num chip atualiza a URL preservando o tipo", async () => {
    let currentSearch = "";
    function LocationProbe() {
      const location = useLocation();
      currentSearch = location.search;
      return null;
    }
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/admin/empresas"]}>
        <SidebarProvider>
          <OpenScreensProvider>
            <LocationProbe />
            <AdminEmpresasPage />
          </OpenScreensProvider>
        </SidebarProvider>
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole("button", { name: "Nomad" }));
    await waitFor(() => expect(currentSearch).toBe("?type=nomad"));
    expect(await screen.findByText("Fulano Nômade")).toBeInTheDocument();
    expect(screen.queryByText("Empresa Cliente Direta")).not.toBeInTheDocument();

    await user.click(await screen.findByRole("button", { name: "Agency" }));
    await waitFor(() => expect(currentSearch).toBe("?type=agency"));

    await user.click(await screen.findByRole("button", { name: "Partners" }));
    await waitFor(() => expect(currentSearch).toBe("?type=agency&partner=only"));

    await user.click(await screen.findByRole("button", { name: "Todos" }));
    await waitFor(() => expect(currentSearch).toBe(""));
  });
});

describe("admin/empresas — desativar/reativar Nômade não recarrega a página", () => {
  it("11/12/13. não chama getCompanies/getAgencies de novo, e sidebar/topbar (fora desta árvore) não são afetados", async () => {
    apiMock.updateNomadeStatus.mockResolvedValue({ status: "inativo" });
    apiMock.getCompanies.mockResolvedValue({ data: [companyFixture()], total: 1 });
    apiMock.getAgencies.mockResolvedValue({ data: [agencyFixture()], total: 1 });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Fulano Nômade");
    const companiesCallsBefore = apiMock.getCompanies.mock.calls.length;
    const agenciesCallsBefore = apiMock.getAgencies.mock.calls.length;

    await user.click(await screen.findByRole("button", { name: "Desativar empresa Nomad Fulano Nômade" }));
    await user.click(screen.getByRole("button", { name: "Desativar" }));
    await waitFor(() => expect(apiMock.updateNomadeStatus).toHaveBeenCalled());

    // Nenhum outro fetch de tipo foi refeito — só a linha afetada mudou.
    expect(apiMock.getCompanies.mock.calls.length).toBe(companiesCallsBefore);
    expect(apiMock.getAgencies.mock.calls.length).toBe(agenciesCallsBefore);
  });
});
