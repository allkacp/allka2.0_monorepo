import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
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

// Lote "correct company type filter source of truth" (ata 2026-08) — o
// responsável reproduziu: em /admin/empresas?type=nomad, com o chip "Nomad"
// selecionado, a tabela mostrava "Agência Digital Creative" (badges Agency +
// Partner). Causa real: a caixa de sugestões de busca (`searchSuggestions`)
// lia a lista `companies` SEM filtro nenhum de tipo, só a tabela
// (`filteredCompanies`) filtrava certo. Corrigido centralizando a regra
// "este registro pertence ao filtro de tipo ativo" numa função só
// (`matchesTypeAndPartnerFilter`) usada tanto pela tabela quanto pelas
// sugestões, via `typeFilteredCompanies`.
describe("admin/empresas — fonte única de verdade do tipo (regressão da Agência aparecendo em Nomad)", () => {
  it("8/9. uma Agency Partner buscada por nome não aparece nas sugestões nem na tabela com o filtro Nomad ativo", async () => {
    apiMock.getCompanies.mockResolvedValue({ data: [], total: 0 });
    apiMock.getAgencies.mockResolvedValue({
      data: [agencyFixture({ name: "Agência Digital Creative", partner_profile: { status: "active" } })],
      total: 1,
    });
    apiMock.getNomades.mockResolvedValue({ data: [nomadFixture()], total: 1 });
    const user = userEvent.setup();
    renderAtUrl("/admin/empresas?type=nomad");
    await screen.findByText("Fulano Nômade");

    const searchBox = screen.getByPlaceholderText(/buscar/i);
    await user.click(searchBox);
    await user.type(searchBox, "Digital Creative");

    // Nem na caixa de sugestões (dropdown abaixo da busca)...
    await waitFor(() => expect(screen.queryByText("Agência Digital Creative")).not.toBeInTheDocument());
    // ...nem na tabela.
    expect(screen.queryByText("Agência Digital Creative")).not.toBeInTheDocument();
  });

  it("8/9. a mesma Agency Partner não aparece com o filtro Company ativo", async () => {
    apiMock.getCompanies.mockResolvedValue({ data: [companyFixture()], total: 1 });
    apiMock.getAgencies.mockResolvedValue({
      data: [agencyFixture({ name: "Agência Digital Creative", partner_profile: { status: "active" } })],
      total: 1,
    });
    renderAtUrl("/admin/empresas?type=company");
    await screen.findByText("Empresa Cliente Direta");
    expect(screen.queryByText("Agência Digital Creative")).not.toBeInTheDocument();
  });

  it("10. Company aparece em Company e não nos outros dois tipos", async () => {
    apiMock.getCompanies.mockResolvedValue({ data: [companyFixture()], total: 1 });
    apiMock.getAgencies.mockResolvedValue({ data: [agencyFixture()], total: 1 });
    apiMock.getNomades.mockResolvedValue({ data: [nomadFixture()], total: 1 });

    renderAtUrl("/admin/empresas?type=company");
    expect(await screen.findByText("Empresa Cliente Direta")).toBeInTheDocument();
    expect(screen.queryByText("Agência Parceira")).not.toBeInTheDocument();
    expect(screen.queryByText("Fulano Nômade")).not.toBeInTheDocument();
  });

  it("11. Todos reúne os três tipos sem duplicar registros", async () => {
    apiMock.getCompanies.mockResolvedValue({ data: [companyFixture()], total: 1 });
    apiMock.getAgencies.mockResolvedValue({ data: [agencyFixture()], total: 1 });
    apiMock.getNomades.mockResolvedValue({ data: [nomadFixture()], total: 1 });

    renderAtUrl("/admin/empresas");
    expect(await screen.findByText("Empresa Cliente Direta")).toBeInTheDocument();
    expect(screen.getByText("Agência Parceira")).toBeInTheDocument();
    expect(screen.getByText("Fulano Nômade")).toBeInTheDocument();
    // Nenhum nome duplicado na tela (cada um aparece exatamente uma vez).
    expect(screen.getAllByText("Empresa Cliente Direta")).toHaveLength(1);
    expect(screen.getAllByText("Agência Parceira")).toHaveLength(1);
    expect(screen.getAllByText("Fulano Nômade")).toHaveLength(1);
  });

  it("12. o filtro é aplicado antes da paginação — a página renderizada contém só nômades, mesmo com company/agency no total combinado", async () => {
    apiMock.getCompanies.mockResolvedValue({ data: [companyFixture()], total: 1 });
    apiMock.getAgencies.mockResolvedValue({ data: [agencyFixture()], total: 1 });
    apiMock.getNomades.mockResolvedValue({
      data: Array.from({ length: 3 }, (_, i) =>
        nomadFixture({ id: `nomade-${i}`, name: `Nômade ${i}`, email: `nomade${i}@example.com` }),
      ),
      total: 3,
    });

    renderAtUrl("/admin/empresas?type=nomad");
    // Os 3 nômades aparecem — se a paginação rodasse ANTES do filtro de
    // tipo (sobre os 5 registros combinados, 10 por página), um resultado
    // errado ainda passaria por acidente aqui; o que prova a ordem certa é
    // a ausência total de company/agency abaixo, não a contagem em si.
    expect(await screen.findByText("Nômade 0")).toBeInTheDocument();
    expect(screen.getByText("Nômade 1")).toBeInTheDocument();
    expect(screen.getByText("Nômade 2")).toBeInTheDocument();
    expect(screen.queryByText("Empresa Cliente Direta")).not.toBeInTheDocument();
    expect(screen.queryByText("Agência Parceira")).not.toBeInTheDocument();
  });

  it("13. ?type=nomad produz o mesmo resultado depois de um F5 (remontagem da página na mesma URL)", async () => {
    apiMock.getCompanies.mockResolvedValue({ data: [companyFixture()], total: 1 });
    apiMock.getAgencies.mockResolvedValue({ data: [agencyFixture()], total: 1 });
    apiMock.getNomades.mockResolvedValue({ data: [nomadFixture()], total: 1 });

    const { unmount } = renderAtUrl("/admin/empresas?type=nomad");
    expect(await screen.findByText("Fulano Nômade")).toBeInTheDocument();
    expect(screen.queryByText("Agência Parceira")).not.toBeInTheDocument();
    unmount();

    // F5 = remontar do zero na mesma URL.
    renderAtUrl("/admin/empresas?type=nomad");
    expect(await screen.findByText("Fulano Nômade")).toBeInTheDocument();
    expect(screen.queryByText("Agência Parceira")).not.toBeInTheDocument();
    expect(screen.queryByText("Empresa Cliente Direta")).not.toBeInTheDocument();
  });

  it("14. voltar do navegador troca o chip e os dados junto com a URL", async () => {
    apiMock.getCompanies.mockResolvedValue({ data: [companyFixture()], total: 1 });
    apiMock.getAgencies.mockResolvedValue({ data: [agencyFixture()], total: 1 });
    apiMock.getNomades.mockResolvedValue({ data: [nomadFixture()], total: 1 });

    // MemoryRouter tem sua própria pilha de histórico, independente de
    // window.history — expõe um botão que chama navigate(-1) pra simular
    // "voltar" de dentro da própria árvore de rotas, do jeito que o app
    // real reage a um voltar/avançar de verdade do navegador.
    function GoBackButton() {
      const navigate = useNavigate();
      return (
        <button type="button" onClick={() => navigate(-1)}>
          voltar-teste
        </button>
      );
    }
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/admin/empresas?type=nomad"]}>
        <SidebarProvider>
          <OpenScreensProvider>
            <GoBackButton />
            <AdminEmpresasPage />
          </OpenScreensProvider>
        </SidebarProvider>
      </MemoryRouter>,
    );
    await screen.findByText("Fulano Nômade");

    await user.click(await screen.findByRole("button", { name: "Agency" }));
    expect(await screen.findByText("Agência Parceira")).toBeInTheDocument();
    expect(screen.queryByText("Fulano Nômade")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "voltar-teste" }));
    expect(await screen.findByText("Fulano Nômade")).toBeInTheDocument();
    expect(screen.queryByText("Agência Parceira")).not.toBeInTheDocument();
    const nomadChip = screen.getByRole("button", { name: "Nomad" });
    expect(nomadChip).toHaveAttribute("aria-pressed", "true");
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

// Lote "company table nomad actual rows" (ata 2026-08) — o responsável
// reportou uma captura mostrando "Agência Digital Creative" como LINHA REAL
// da tabela (não a caixa de sugestões, já corrigida no commit 5603304), com
// busca vazia, em /admin/empresas?type=nomad. Reproduzido exaustivamente
// (URL direta, F5, troca de chip com dado já carregado, voltar/avançar, e
// uma corrida forçada com /api/agencies atrasado 4s) contra o código atual
// sem sucesso — o <tbody> sempre mostrou só nômades. Estes testes fixam
// exatamente os cenários pedidos, direto no <tbody> real (não em chips nem
// em funções puras), inclusive o de chegada assíncrona fora de ordem, que é
// o mais próximo de uma causa real que a hipótese lista.
function getTbodyRowTexts() {
  const tbody = document.querySelector("tbody");
  if (!tbody) return [];
  return Array.from(tbody.querySelectorAll("tr")).map((tr) => tr.textContent || "");
}

describe("admin/empresas — linhas reais do <tbody> com type=nomad e busca vazia", () => {
  it("1. montagem inicial direto em ?type=nomad: <tbody> só tem nômades", async () => {
    apiMock.getCompanies.mockResolvedValue({ data: [companyFixture()], total: 1 });
    apiMock.getAgencies.mockResolvedValue({
      data: [agencyFixture({ name: "Agência Digital Creative", partner_profile: { status: "active" } })],
      total: 1,
    });
    apiMock.getNomades.mockResolvedValue({ data: [nomadFixture()], total: 1 });

    renderAtUrl("/admin/empresas?type=nomad");
    await screen.findByText("Fulano Nômade");

    const rows = getTbodyRowTexts();
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.some((r) => r.includes("Agência Digital Creative"))).toBe(false);
    expect(rows.some((r) => r.includes("Empresa Cliente Direta"))).toBe(false);
    expect(rows.every((r) => r.includes("Nômade") || r.includes("Fulano"))).toBe(true);
  });

  it("2. respostas chegando em ordem diferente (companies resolve DEPOIS de agencies+nomades) não deixa Agency/Company no <tbody>", async () => {
    // `refetchOrgTypes` busca agencies e nomades juntos, num único
    // Promise.all — não há como um chegar antes do outro. O par que
    // realmente pode chegar em ordens diferentes é `companies` (hook
    // independente, `useCompanies()`) vs. o par agencies+nomades.
    let resolveCompanies: (v: any) => void;
    const companiesPromise = new Promise((resolve) => {
      resolveCompanies = resolve;
    });
    apiMock.getCompanies.mockReturnValue(companiesPromise);
    apiMock.getAgencies.mockResolvedValue({
      data: [agencyFixture({ name: "Agência Digital Creative", partner_profile: { status: "active" } })],
      total: 1,
    });
    apiMock.getNomades.mockResolvedValue({ data: [nomadFixture()], total: 1 });

    renderAtUrl("/admin/empresas?type=nomad");
    // Enquanto `companies` (carga inicial) não resolve, a tela inteira
    // mostra o loader de primeira carga — comportamento esperado (ver
    // `hasLoadedCompaniesOnceRef`, lote anterior). Não há <tbody> ainda
    // pra inspecionar neste instante.
    expect(screen.queryByText("Fulano Nômade")).not.toBeInTheDocument();

    // Companies resolve por último, bem depois de agencies+nomades.
    resolveCompanies!({ data: [companyFixture()], total: 1 });

    // Depois de tudo assentar, o filtro Nomad continua valendo — nem a
    // Agency nem a Company entram no <tbody> filtrado, não importa a ordem
    // de chegada das três respostas.
    await screen.findByText("Fulano Nômade");
    const rows = getTbodyRowTexts();
    expect(rows.some((r) => r.includes("Digital Creative"))).toBe(false);
    expect(rows.some((r) => r.includes("Empresa Cliente Direta"))).toBe(false);
    expect(rows.some((r) => r.includes("Fulano Nômade"))).toBe(true);
  });

  it("3/4. <tbody> de Nomad não contém Agency Partner nem Company", async () => {
    apiMock.getCompanies.mockResolvedValue({ data: [companyFixture()], total: 1 });
    apiMock.getAgencies.mockResolvedValue({
      data: [agencyFixture({ partner_profile: { status: "active" } })],
      total: 1,
    });
    apiMock.getNomades.mockResolvedValue({
      data: [nomadFixture({ id: "n1", name: "Nômade A" }), nomadFixture({ id: "n2", name: "Nômade B", email: "b@example.com" })],
      total: 2,
    });

    renderAtUrl("/admin/empresas?type=nomad");
    await screen.findByText("Nômade A");
    const rows = getTbodyRowTexts();
    expect(rows).toHaveLength(2);
    expect(rows.some((r) => r.includes("Agência Parceira"))).toBe(false);
    expect(rows.some((r) => r.includes("Empresa Cliente Direta"))).toBe(false);
  });

  it("5/6. o total exibido é igual à quantidade de nômades filtrados, e a paginação usa só nômades", async () => {
    apiMock.getCompanies.mockResolvedValue({ data: [companyFixture()], total: 1 });
    apiMock.getAgencies.mockResolvedValue({ data: [agencyFixture()], total: 1 });
    apiMock.getNomades.mockResolvedValue({
      data: Array.from({ length: 4 }, (_, i) =>
        nomadFixture({ id: `n${i}`, name: `Nômade ${i}`, email: `n${i}@example.com` }),
      ),
      total: 4,
    });

    renderAtUrl("/admin/empresas?type=nomad");
    await screen.findByText("Nômade 0");
    const rows = getTbodyRowTexts();
    // 4 nômades cabem numa página (paginação padrão é maior que 4) — todas
    // as linhas visíveis são nômades, nenhuma company/agency entra na conta.
    expect(rows).toHaveLength(4);
    expect(rows.every((r) => /Nômade \d/.test(r))).toBe(true);
  });

  it("7. trocar de Todos para Nomad remove imediatamente as linhas Agency/Company do <tbody>", async () => {
    apiMock.getCompanies.mockResolvedValue({ data: [companyFixture()], total: 1 });
    apiMock.getAgencies.mockResolvedValue({ data: [agencyFixture()], total: 1 });
    apiMock.getNomades.mockResolvedValue({ data: [nomadFixture()], total: 1 });

    const user = userEvent.setup();
    renderAtUrl("/admin/empresas");
    await screen.findByText("Empresa Cliente Direta");
    expect(getTbodyRowTexts()).toHaveLength(3);

    await user.click(screen.getByRole("button", { name: "Nomad" }));
    await waitFor(() => expect(getTbodyRowTexts()).toHaveLength(1));
    const rows = getTbodyRowTexts();
    expect(rows[0]).toContain("Fulano Nômade");
    expect(rows.some((r) => r.includes("Agência Parceira") || r.includes("Empresa Cliente Direta"))).toBe(false);
  });

  it("8. trocar de Agency (na página 2) para Nomad volta pra uma página válida", async () => {
    apiMock.getCompanies.mockResolvedValue({ data: [], total: 0 });
    apiMock.getAgencies.mockResolvedValue({
      data: Array.from({ length: 15 }, (_, i) => agencyFixture({ id: `a${i}`, name: `Agência ${i}`, email: `a${i}@example.com` })),
      total: 15,
    });
    apiMock.getNomades.mockResolvedValue({ data: [nomadFixture()], total: 1 });

    const user = userEvent.setup();
    renderAtUrl("/admin/empresas?type=agency");
    await screen.findByText("Agência 0");
    await user.click(screen.getAllByRole("button", { name: "Próxima página" })[0]);
    await waitFor(() => expect(screen.queryByText("Agência 0")).not.toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Nomad" }));
    // Só existe 1 nômade — se a página não voltasse pra 1, a lista ficaria
    // vazia mesmo havendo resultado.
    expect(await screen.findByText("Fulano Nômade")).toBeInTheDocument();
    expect(getTbodyRowTexts()).toHaveLength(1);
  });

  it("9. F5 simulado (remontagem na mesma URL) mantém só nômades no <tbody>", async () => {
    apiMock.getCompanies.mockResolvedValue({ data: [companyFixture()], total: 1 });
    apiMock.getAgencies.mockResolvedValue({
      data: [agencyFixture({ name: "Agência Digital Creative", partner_profile: { status: "active" } })],
      total: 1,
    });
    apiMock.getNomades.mockResolvedValue({ data: [nomadFixture()], total: 1 });

    const { unmount } = renderAtUrl("/admin/empresas?type=nomad");
    await screen.findByText("Fulano Nômade");
    expect(getTbodyRowTexts()).toHaveLength(1);
    unmount();

    renderAtUrl("/admin/empresas?type=nomad");
    await screen.findByText("Fulano Nômade");
    const rows = getTbodyRowTexts();
    expect(rows).toHaveLength(1);
    expect(rows[0]).not.toContain("Digital Creative");
  });

  it("10. voltar/avançar sincroniza chip, total e <tbody> juntos", async () => {
    apiMock.getCompanies.mockResolvedValue({ data: [companyFixture()], total: 1 });
    apiMock.getAgencies.mockResolvedValue({ data: [agencyFixture()], total: 1 });
    apiMock.getNomades.mockResolvedValue({ data: [nomadFixture()], total: 1 });

    function GoBackButton() {
      const navigate = useNavigate();
      return (
        <button type="button" onClick={() => navigate(-1)}>
          voltar-teste-tbody
        </button>
      );
    }
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/admin/empresas?type=nomad"]}>
        <SidebarProvider>
          <OpenScreensProvider>
            <GoBackButton />
            <AdminEmpresasPage />
          </OpenScreensProvider>
        </SidebarProvider>
      </MemoryRouter>,
    );
    await screen.findByText("Fulano Nômade");
    expect(getTbodyRowTexts()).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Agency" }));
    await screen.findByText("Agência Parceira");
    expect(getTbodyRowTexts()).toHaveLength(1);
    expect(getTbodyRowTexts()[0]).toContain("Agência Parceira");

    await user.click(screen.getByRole("button", { name: "voltar-teste-tbody" }));
    await screen.findByText("Fulano Nômade");
    const rows = getTbodyRowTexts();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toContain("Fulano Nômade");
    expect(screen.getByRole("button", { name: "Nomad" })).toHaveAttribute("aria-pressed", "true");
  });

  it("11. desativar/reativar (atualização localizada) não reinsere uma Agency no filtro Nomad", async () => {
    apiMock.getCompanies.mockResolvedValue({ data: [companyFixture()], total: 1 });
    apiMock.getAgencies.mockResolvedValue({
      data: [agencyFixture({ name: "Agência Digital Creative", partner_profile: { status: "active" } })],
      total: 1,
    });
    apiMock.getNomades.mockResolvedValue({ data: [nomadFixture()], total: 1 });
    apiMock.updateNomadeStatus.mockResolvedValue({ status: "inativo" });

    const user = userEvent.setup();
    renderAtUrl("/admin/empresas?type=nomad");
    await screen.findByText("Fulano Nômade");

    await user.click(await screen.findByRole("button", { name: "Desativar empresa Nomad Fulano Nômade" }));
    await user.click(screen.getByRole("button", { name: "Desativar" }));
    await waitFor(() => expect(apiMock.updateNomadeStatus).toHaveBeenCalled());

    // O nômade desativado some do filtro padrão (só Ativos) — a Agency
    // Partner, que nunca deveria ter entrado, continua fora também.
    await waitFor(() => expect(getTbodyRowTexts()).toHaveLength(0));
    expect(getTbodyRowTexts().some((r) => r.includes("Digital Creative"))).toBe(false);
  });

  it("12. busca vazia não usa nem depende da caixa de sugestões", async () => {
    apiMock.getCompanies.mockResolvedValue({ data: [companyFixture()], total: 1 });
    apiMock.getAgencies.mockResolvedValue({
      data: [agencyFixture({ name: "Agência Digital Creative", partner_profile: { status: "active" } })],
      total: 1,
    });
    apiMock.getNomades.mockResolvedValue({ data: [nomadFixture()], total: 1 });

    renderAtUrl("/admin/empresas?type=nomad");
    await screen.findByText("Fulano Nômade");

    // Busca vazia: a caixa de sugestões (searchSuggestions) nem chega a
    // existir no DOM — searchFocused/searchQuery vazios não abrem o
    // dropdown. O <tbody> não depende dela pra estar correto.
    expect(screen.queryByText("Nenhuma empresa encontrada com esse termo")).not.toBeInTheDocument();
    const rows = getTbodyRowTexts();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toContain("Fulano Nômade");
  });
});
