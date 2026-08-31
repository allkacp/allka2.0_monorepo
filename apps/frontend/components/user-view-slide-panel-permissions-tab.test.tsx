import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

// Fechamento pré-deploy QA — item 1 (corrigir "Meu Perfil" em todos os
// portais): a aba "Permissões" (perfil de acesso admin, vínculo com outras
// empresas, permissões por projeto) vazava inteira para Company/qualquer
// usuário comum na tela de autoatendimento "Meu Perfil", porque a lista de
// abas nunca checava `viewerRole`. Este teste cobre só esse ponto exato —
// não é uma suíte completa do componente de 5885 linhas.

const { apiClientMock } = vi.hoisted(() => ({
  apiClientMock: {
    getPermissionProfiles: vi.fn().mockResolvedValue([]),
    getWallets: vi.fn().mockResolvedValue({ data: [] }),
    updateUser: vi.fn(),
    createWalletAdjustment: vi.fn(),
  },
}));

vi.mock("@/lib/api-client", () => ({ apiClient: apiClientMock }));
vi.mock("@/contexts/platform-users-context", () => ({
  usePlatformUsers: () => ({
    getUserById: vi.fn(),
    addCompanyLink: vi.fn(),
    removeCompanyLink: vi.fn(),
    updateCompanyLink: vi.fn(),
    upsertProjectMembership: vi.fn(),
    removeProjectMembership: vi.fn(),
    updateUser: vi.fn(),
  }),
  MOCK_COMPANIES: [],
}));

import { UserViewSlidePanel } from "./user-view-slide-panel";
import { OpenScreensProvider } from "@/contexts/open-screens-context";

const baseUser = {
  id: "u-1",
  name: "Usuário de Teste",
  email: "teste@example.test",
  role: "company_admin",
  account_type: "company",
  is_active: true,
  is_admin: false,
  permissions: [],
  created_at: "",
  updated_at: "",
};

beforeEach(() => {
  vi.clearAllMocks();
  apiClientMock.getPermissionProfiles.mockResolvedValue([]);
  apiClientMock.getWallets.mockResolvedValue({ data: [] });
});

function renderPanel(viewerRole: "admin" | "partner" | "agency" | "company" | "nomad") {
  return render(
    <OpenScreensProvider>
      <UserViewSlidePanel
        open
        onClose={() => {}}
        user={baseUser as any}
        viewerRole={viewerRole}
        asPage
      />
    </OpenScreensProvider>,
  );
}

describe("UserViewSlidePanel — aba Permissões não vaza para autoatendimento", () => {
  it("Company (viewerRole=company) NÃO vê a aba Permissões", async () => {
    renderPanel("company");
    await waitFor(() => expect(screen.getByRole("tab", { name: /conta/i })).toBeInTheDocument());
    expect(screen.queryByRole("tab", { name: /permiss/i })).not.toBeInTheDocument();
    // Abas normais de autoatendimento continuam presentes.
    expect(screen.getByRole("tab", { name: /visão geral/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /segurança/i })).toBeInTheDocument();
  });

  it("Admin (viewerRole=admin) continua vendo a aba Permissões", async () => {
    renderPanel("admin");
    await waitFor(() => expect(screen.getByRole("tab", { name: /permiss/i })).toBeInTheDocument());
  });

  it("Partner (viewerRole=partner) continua vendo a aba Permissões", async () => {
    renderPanel("partner");
    await waitFor(() => expect(screen.getByRole("tab", { name: /permiss/i })).toBeInTheDocument());
  });

  it("Nômade (viewerRole=nomad, caso um dia caia neste painel) também não vê Permissões", async () => {
    renderPanel("nomad");
    await waitFor(() => expect(screen.getByRole("tab", { name: /conta/i })).toBeInTheDocument());
    expect(screen.queryByRole("tab", { name: /permiss/i })).not.toBeInTheDocument();
  });
});
