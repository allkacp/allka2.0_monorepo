import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const { startRoadmapSso, getCurrentUser, mockAccountType } = vi.hoisted(() => ({
  startRoadmapSso: vi.fn(),
  getCurrentUser: vi.fn(),
  mockAccountType: { value: "admin" as string },
}));

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    getCurrentUser,
    startRoadmapSso,
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

  it("usuário comum (account_type diferente de admin) nunca vê o item nem consulta permissão", async () => {
    mockAccountType.value = "empresas";
    renderSidebar();
    await waitFor(() => expect(screen.getByText("Dashboard")).toBeInTheDocument());
    expect(screen.queryByText("Roadmap e chamados")).not.toBeInTheDocument();
    expect(getCurrentUser).not.toHaveBeenCalled();
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

  it("clicar chama a mesma função de SSO (apiClient.startRoadmapSso) e não navega a aba atual", async () => {
    getCurrentUser.mockResolvedValue({ admin_profile: null });
    startRoadmapSso.mockResolvedValue({ redirectUrl: "http://localhost:8090/sso/consume?token=abc" });
    const openSpy = vi.spyOn(window, "open").mockReturnValue({ location: { href: "" }, closed: false } as unknown as Window);

    renderSidebar();
    const item = await screen.findByText("Roadmap e chamados");
    await userEvent.click(item);

    await waitFor(() => expect(startRoadmapSso).toHaveBeenCalledTimes(1));
    // Primeira coisa a acontecer é abrir uma aba em branco (síncrono, antes do await) — nunca `to`/navigate na aba atual.
    expect(openSpy).toHaveBeenCalledWith("about:blank", "_blank");
    openSpy.mockRestore();
  });

  it("duplo clique não dispara duas chamadas de SSO nem abre duas abas", async () => {
    getCurrentUser.mockResolvedValue({ admin_profile: null });
    let resolveSso: (v: { redirectUrl: string }) => void = () => {};
    startRoadmapSso.mockReturnValue(new Promise((resolve) => { resolveSso = resolve; }));
    const openSpy = vi.spyOn(window, "open").mockReturnValue({ location: { href: "" }, closed: false } as unknown as Window);

    renderSidebar();
    const item = await screen.findByText("Roadmap e chamados");
    await userEvent.click(item);
    await userEvent.click(item);

    expect(startRoadmapSso).toHaveBeenCalledTimes(1);
    expect(openSpy).toHaveBeenCalledTimes(1);
    resolveSso({ redirectUrl: "http://localhost:8090/sso/consume?token=abc" });
    openSpy.mockRestore();
  });
});
