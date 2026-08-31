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
  apiClient: { getCurrentUser, startRoadmapSso, getRoadmapSsoBaseUrl },
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

  it("NÃO aparece pra usuário comum (agencias, sem perfil) — sem grandfather fora de admin", async () => {
    mockAccountType.value = "agencias";
    getCurrentUser.mockResolvedValue({ admin_profile: null });
    renderDrawer();
    await waitFor(() => expect(screen.getByText("Dashboard")).toBeInTheDocument());
    await waitFor(() => expect(getCurrentUser).toHaveBeenCalled());
    expect(screen.queryByText("Roadmap e chamados")).not.toBeInTheDocument();
  });

  it("desenvolvedor não-admin (account_type agencias) COM central_chamados.view VÊ", async () => {
    mockAccountType.value = "agencias";
    getCurrentUser.mockResolvedValue({
      admin_profile: { is_active: true, is_master: false, permissions: [{ module: "central_chamados", action: "view" }] },
    });
    renderDrawer();
    await waitFor(() => expect(screen.getByText("Dashboard")).toBeInTheDocument());
    expect(await screen.findByText("Roadmap e chamados")).toBeInTheDocument();
  });

  // Admin: o clique navega (mesma tela) pra gestão — o SSO só dispara de
  // lá, pelo botão "Abrir painel interno" (mesma regra do desktop).
  it("admin: clicar navega para /admin/acesso-chamados, sem abrir aba nem chamar o hook de SSO", async () => {
    mockAccountType.value = "admin";
    getCurrentUser.mockResolvedValue({ admin_profile: null });
    const openSpy = vi.spyOn(window, "open");

    renderDrawer();
    const item = await screen.findByText("Roadmap e chamados");
    expect(item.closest("a")).toHaveAttribute("href", "/admin/acesso-chamados");

    await userEvent.click(item);

    expect(openSpy).not.toHaveBeenCalled();
    expect(getRoadmapSsoBaseUrl).not.toHaveBeenCalled();
    openSpy.mockRestore();
  });

  // Não-admin (dev/QA com central_chamados): sem tela de gestão pra ver
  // (admin-gated), vai direto pro SSO. Fluxo completo (postMessage/Basic
  // Auth) já testado em hooks/use-open-roadmap-panel.test.ts — aqui só
  // confirma que o clique no mobile aciona o mesmo hook compartilhado do
  // desktop.
  it("não-admin com central_chamados: clicar aciona o hook de SSO compartilhado (mesmo do desktop)", async () => {
    mockAccountType.value = "agencias";
    getCurrentUser.mockResolvedValue({
      admin_profile: { is_active: true, is_master: false, permissions: [{ module: "central_chamados", action: "view" }] },
    });
    getRoadmapSsoBaseUrl.mockResolvedValue({ roadmapInternalUrl: "http://localhost:8090" });
    const openSpy = vi.spyOn(window, "open").mockReturnValue({ location: { href: "" }, closed: false } as unknown as Window);

    renderDrawer();
    const item = await screen.findByText("Roadmap e chamados");
    await userEvent.click(item);

    expect(openSpy).toHaveBeenCalledWith("about:blank", "_blank");
    await waitFor(() => expect(getRoadmapSsoBaseUrl).toHaveBeenCalledTimes(1));
    openSpy.mockRestore();
  });
});

// Lote de navegação de perfil (ata 2026-08-21): mesmo link real usado no
// sidebar desktop, agora conferido também no menu "Mais" do celular.
describe("AppMenuDrawer (mobile) — item 'Perfil' (Líder e Nômade)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("13. Líder no celular: o link 'Perfil' aponta pra /leader/perfil, sem cortar o item", async () => {
    mockAccountType.value = "lider";
    getCurrentUser.mockResolvedValue({ admin_profile: null });
    renderDrawer();
    const link = await screen.findByRole("link", { name: /^perfil$/i });
    expect(link).toHaveAttribute("href", "/leader/perfil");
    expect(link).toBeVisible();
  });

  it("13. Nômade no celular: o link 'Perfil' aponta pra /nomades/perfil", async () => {
    mockAccountType.value = "nomades";
    getCurrentUser.mockResolvedValue({ admin_profile: null });
    renderDrawer();
    const link = await screen.findByRole("link", { name: /^perfil$/i });
    expect(link).toHaveAttribute("href", "/nomades/perfil");
    expect(link).toBeVisible();
  });
});
