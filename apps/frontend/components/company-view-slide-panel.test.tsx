import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { OpenScreensProvider } from "@/contexts/open-screens-context";
import { CompanyViewSlidePanel } from "@/components/company-view-slide-panel";
import type { Company } from "@/types/company";

// Acabamento do Bloco 1/4 (sprint Memória e Automação por IA, 2026-09) — este
// painel é o único ponto de entrada real da memória de Agência (reaproveita o
// mesmo drawer/tabs de Company, ver relatório do bloco). O bug corrigido era
// scopeType="company" fixo na TabsContent "memoria" mesmo quando a entidade
// aberta é uma Agency — o que gravaria/leria a memória no escopo errado.
// Este teste garante que a Agência aberta aqui usa scopeType="agency", e que
// Company continua usando "company", direto pelo ponto de entrada real.

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    getMemory: vi.fn().mockResolvedValue({
      memory: { id: null, positive_instructions: null, negative_instructions: null, summary: null, is_archived: false, updated_at: null, files: [] },
      can_edit: true,
    }),
    updateMemorySection: vi.fn(),
    getMemoryHistory: vi.fn().mockResolvedValue({ history: [] }),
    uploadMemoryFile: vi.fn(),
    deleteMemoryFile: vi.fn(),
    downloadMemoryFile: vi.fn(),
    getCompanyPaymentMethods: vi.fn().mockResolvedValue({ methods: [] }),
    getCompanyWalletBalance: vi.fn().mockResolvedValue({ balance: 0 }),
    getCompanyWalletStatements: vi.fn().mockResolvedValue({ statements: [] }),
  },
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

vi.mock("@/contexts/platform-users-context", () => ({
  usePlatformUsers: () => ({ users: [] }),
}));

import { apiClient } from "@/lib/api-client";

function baseCompany(overrides: Partial<Company> = {}): Company {
  return {
    id: 1,
    _apiId: "company-cuid-1",
    name: "Empresa Teste",
    type: "company",
    status: "active",
    email: "empresa@example.test",
    phone: "11999990000",
    document: "00000000000191",
    location: "São Paulo, SP",
    users_count: 0,
    projects_count: 0,
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function renderPanel(company: Company) {
  return render(
    <SidebarProvider>
      <OpenScreensProvider>
        <CompanyViewSlidePanel open company={company} onClose={() => {}} />
      </OpenScreensProvider>
    </SidebarProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("CompanyViewSlidePanel — aba Memória (Company e Agency compartilham o mesmo painel)", () => {
  it("Agency: a aba Memória usa scopeType 'agency' com o id real da agência", async () => {
    const user = userEvent.setup();
    const agency = baseCompany({ type: "agency", _apiId: "agency-cuid-7", name: "Agência Teste" });
    renderPanel(agency);

    await user.click(screen.getByRole("tab", { name: "Memória" }));

    await waitFor(() => expect(apiClient.getMemory).toHaveBeenCalledWith("agency", "agency-cuid-7"));
  });

  it("Company: a aba Memória continua usando scopeType 'company' (sem regressão)", async () => {
    const user = userEvent.setup();
    const company = baseCompany({ type: "company", _apiId: "company-cuid-9" });
    renderPanel(company);

    await user.click(screen.getByRole("tab", { name: "Memória" }));

    await waitFor(() => expect(apiClient.getMemory).toHaveBeenCalledWith("company", "company-cuid-9"));
  });

  it("Agência sem autorização (can_edit=false) não ganha botão Editar na memória — 403 do backend nunca é contornado na tela", async () => {
    const user = userEvent.setup();
    (apiClient.getMemory as any).mockResolvedValueOnce({
      memory: { id: null, positive_instructions: null, negative_instructions: null, summary: null, is_archived: false, updated_at: null, files: [] },
      can_edit: false,
    });
    const agency = baseCompany({ type: "agency", _apiId: "agency-cuid-outra" });
    renderPanel(agency);

    await user.click(screen.getByRole("tab", { name: "Memória" }));
    await screen.findByText("Resumo");
    expect(screen.queryByRole("button", { name: "Editar" })).not.toBeInTheDocument();
  });

  it("Agência sem vínculo com a outra Agência recebe acesso negado (404 do backend, nunca vazado como tela quebrada)", async () => {
    const user = userEvent.setup();
    const { ApiError } = await import("@/lib/api-client");
    (apiClient.getMemory as any).mockRejectedValueOnce(new ApiError("Memória não encontrada", 404));

    const otherAgency = baseCompany({ type: "agency", _apiId: "agency-cuid-de-outra-agencia" });
    renderPanel(otherAgency);

    await user.click(screen.getByRole("tab", { name: "Memória" }));

    expect(await screen.findByText("Memória não encontrada")).toBeInTheDocument();
    expect(screen.queryByText("Resumo")).not.toBeInTheDocument();
  });
});
