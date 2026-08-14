import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const { startRoadmapSso, getRoadmapSsoBaseUrl, getCurrentUser, mockAccountType } = vi.hoisted(() => ({
  startRoadmapSso: vi.fn(),
  getRoadmapSsoBaseUrl: vi.fn(),
  getCurrentUser: vi.fn(),
  mockAccountType: { value: "admin" as string },
}));

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    getCurrentUser,
    startRoadmapSso,
    getRoadmapSsoBaseUrl,
    getProjects: vi.fn().mockResolvedValue(null),
    getCompanies: vi.fn().mockResolvedValue(null),
    getAgencies: vi.fn().mockResolvedValue(null),
    getNomades: vi.fn().mockResolvedValue(null),
    getUsers: vi.fn().mockResolvedValue(null),
    getClientRecords: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock("@/contexts/account-type-context", () => ({
  useAccountType: () => ({ accountType: mockAccountType.value, accountSubType: "company", isPartnerActive: false, isOrgAdmin: true }),
}));

vi.mock("@/contexts/sidebar-context", () => ({
  useSidebar: () => ({
    sidebarSettings: { backgroundColor: "bg-slate-900" },
    agencyProfile: null,
    userProfile: { name: "Admin Teste", avatar: "AT", job_title: "Admin", role: "admin" },
    setSidebarCollapsed: vi.fn(),
    setSidebarWidth: vi.fn(),
    sidebarWidth: 260,
    previewTheme: null,
    previewEnabled: false,
  }),
}));

vi.mock("@/contexts/agencia-context", () => ({
  useAgencia: () => ({ profile: null }),
}));

import { Sidebar } from "@/components/sidebar";

function renderSidebar() {
  return render(
    <MemoryRouter initialEntries={["/admin/dashboard"]}>
      <Sidebar />
    </MemoryRouter>,
  );
}

describe("Sidebar — item Roadmap e chamados", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAccountType.value = "admin";
  });

  it("usuário comum (empresas, sem perfil/permissão) não vê o item — sem grandfather fora de admin", async () => {
    mockAccountType.value = "empresas";
    getCurrentUser.mockResolvedValue({ admin_profile: null });
    renderSidebar();
    await waitFor(() => expect(screen.getByText("Dashboard")).toBeInTheDocument());
    await waitFor(() => expect(getCurrentUser).toHaveBeenCalled());
    expect(screen.queryByText("Roadmap e chamados")).not.toBeInTheDocument();
  });

  it("desenvolvedor não-admin (account_type empresas) COM central_chamados.view VÊ o item", async () => {
    mockAccountType.value = "empresas";
    getCurrentUser.mockResolvedValue({
      admin_profile: { is_active: true, is_master: false, permissions: [{ module: "central_chamados", action: "view" }] },
    });
    renderSidebar();
    await waitFor(() => expect(screen.getByText("Dashboard")).toBeInTheDocument());
    expect(await screen.findByText("Roadmap e chamados")).toBeInTheDocument();
  });

  it("aparece para admin com permissão granular (module central_chamados)", async () => {
    getCurrentUser.mockResolvedValue({
      admin_profile: { is_active: true, is_master: false, permissions: [{ module: "central_chamados", action: "view" }] },
    });
    renderSidebar();
    expect(await screen.findByText("Roadmap e chamados")).toBeInTheDocument();
  });

  it("aparece para admin sem perfil granular (legado, mesma regra do backend)", async () => {
    getCurrentUser.mockResolvedValue({ admin_profile: null });
    renderSidebar();
    expect(await screen.findByText("Roadmap e chamados")).toBeInTheDocument();
  });

  it("NÃO aparece para admin com perfil granular sem sistema/central_chamados", async () => {
    getCurrentUser.mockResolvedValue({
      admin_profile: { is_active: true, is_master: false, permissions: [{ module: "financeiro", action: "view" }] },
    });
    renderSidebar();
    await waitFor(() => expect(getCurrentUser).toHaveBeenCalled());
    expect(screen.queryByText("Roadmap e chamados")).not.toBeInTheDocument();
  });

  // O fluxo completo (aba -> /sso/await -> aguarda postMessage -> só então
  // pede o token) já é testado exaustivamente em
  // hooks/use-open-roadmap-panel.test.ts. Aqui só confirmamos que o clique
  // do item realmente aciona esse hook compartilhado — abre a aba
  // sincronamente e chama o primeiro passo dele — sem duplicar toda a
  // simulação de postMessage/Basic Auth de novo neste arquivo.
  it("clicar abre uma aba em branco de forma síncrona e aciona o hook de SSO compartilhado", async () => {
    getCurrentUser.mockResolvedValue({ admin_profile: null });
    getRoadmapSsoBaseUrl.mockResolvedValue({ roadmapInternalUrl: "http://localhost:8090" });
    const openSpy = vi.spyOn(window, "open").mockReturnValue({ location: { href: "" }, closed: false } as unknown as Window);

    renderSidebar();
    const item = await screen.findByText("Roadmap e chamados");
    await userEvent.click(item);

    // Primeira coisa a acontecer é abrir uma aba em branco (síncrono, antes do await) — nunca `to`/navigate na aba atual.
    expect(openSpy).toHaveBeenCalledWith("about:blank", "_blank");
    await waitFor(() => expect(getRoadmapSsoBaseUrl).toHaveBeenCalledTimes(1));
    expect(startRoadmapSso).not.toHaveBeenCalled(); // só depois do Basic Auth/postMessage — não testado aqui
    openSpy.mockRestore();
  });

  it("duplo clique não dispara duas requisições nem abre duas abas", async () => {
    getCurrentUser.mockResolvedValue({ admin_profile: null });
    let resolveBaseUrl: (v: { roadmapInternalUrl: string }) => void = () => {};
    getRoadmapSsoBaseUrl.mockReturnValue(new Promise((resolve) => { resolveBaseUrl = resolve; }));
    const openSpy = vi.spyOn(window, "open").mockReturnValue({ location: { href: "" }, closed: false } as unknown as Window);

    renderSidebar();
    const item = await screen.findByText("Roadmap e chamados");
    await userEvent.click(item);
    await userEvent.click(item);

    expect(getRoadmapSsoBaseUrl).toHaveBeenCalledTimes(1);
    expect(openSpy).toHaveBeenCalledTimes(1);
    resolveBaseUrl({ roadmapInternalUrl: "http://localhost:8090" });
    openSpy.mockRestore();
  });
});
