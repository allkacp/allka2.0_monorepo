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
  apiClient: { getCurrentUser, startRoadmapSso },
}));

vi.mock("@/contexts/account-type-context", () => ({
  useAccountType: () => ({ accountType: mockAccountType.value, accountSubType: "company", isPartnerActive: false }),
}));

vi.mock("@/contexts/sidebar-context", () => ({
  useSidebar: () => ({ userProfile: { name: "Admin Teste", avatar: "AT", job_title: "Admin", role: "admin" } }),
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "dark", setTheme: vi.fn() }),
}));

vi.mock("@/hooks/useFontScale", () => ({
  useFontScale: () => ({ increase: vi.fn(), decrease: vi.fn() }),
}));

import { AppMenuDrawer } from "@/components/app-menu-drawer";

function renderDrawer() {
  return render(
    <MemoryRouter initialEntries={["/admin/dashboard"]}>
      <AppMenuDrawer open onClose={() => {}} />
    </MemoryRouter>,
  );
}

describe("AppMenuDrawer (mobile) — item Roadmap e chamados", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAccountType.value = "admin";
  });

  it("aparece para admin com permissão", async () => {
    getCurrentUser.mockResolvedValue({ admin_profile: null });
    renderDrawer();
    expect(await screen.findByText("Roadmap e chamados")).toBeInTheDocument();
  });

  it("NÃO aparece para admin sem sistema/central_chamados", async () => {
    getCurrentUser.mockResolvedValue({
      admin_profile: { is_active: true, is_master: false, permissions: [{ module: "financeiro", action: "view" }] },
    });
    renderDrawer();
    await waitFor(() => expect(getCurrentUser).toHaveBeenCalled());
    expect(screen.queryByText("Roadmap e chamados")).not.toBeInTheDocument();
  });

  it("NÃO aparece pra usuário comum (não-admin), sem nem consultar permissão", async () => {
    mockAccountType.value = "agencias";
    renderDrawer();
    await waitFor(() => expect(screen.getByText("Dashboard")).toBeInTheDocument());
    expect(screen.queryByText("Roadmap e chamados")).not.toBeInTheDocument();
    expect(getCurrentUser).not.toHaveBeenCalled();
  });

  it("clicar abre o SSO pela mesma função compartilhada (apiClient.startRoadmapSso)", async () => {
    getCurrentUser.mockResolvedValue({ admin_profile: null });
    startRoadmapSso.mockResolvedValue({ redirectUrl: "http://localhost:8090/sso/consume?token=abc" });
    const openSpy = vi.spyOn(window, "open").mockReturnValue({ location: { href: "" }, closed: false } as unknown as Window);

    renderDrawer();
    const item = await screen.findByText("Roadmap e chamados");
    await userEvent.click(item);

    await waitFor(() => expect(startRoadmapSso).toHaveBeenCalledTimes(1));
    expect(openSpy).toHaveBeenCalledWith("about:blank", "_blank");
    openSpy.mockRestore();
  });
});
