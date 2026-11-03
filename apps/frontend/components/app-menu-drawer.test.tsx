import { useState } from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const ADMIN_PROFILE = { name: "Admin Teste", avatar: "AT", job_title: "Admin", role: "admin" };
const { startRoadmapSso, getRoadmapSsoBaseUrl, getCurrentUser, mockAccountType, mockProfile } = vi.hoisted(() => ({
  startRoadmapSso: vi.fn(),
  getRoadmapSsoBaseUrl: vi.fn(),
  getCurrentUser: vi.fn(),
  mockAccountType: { value: "admin" as string },
  mockProfile: { value: null as Record<string, string> | null },
}));

vi.mock("@/lib/api-client", () => ({
  apiClient: { getCurrentUser, startRoadmapSso, getRoadmapSsoBaseUrl },
}));

vi.mock("@/contexts/account-type-context", () => ({
  useAccountType: () => ({ accountType: mockAccountType.value, accountSubType: "company", isPartnerActive: false }),
}));

vi.mock("@/contexts/sidebar-context", () => ({
  useSidebar: () => ({ userProfile: mockProfile.value ?? ADMIN_PROFILE }),
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "dark", setTheme: vi.fn() }),
}));

vi.mock("@/contexts/open-screens-context", () => ({
  usePinEntry: () => ({ pinned: false, toggle: vi.fn() }),
  useOpenScreens: () => ({ addPinned: vi.fn() }),
}));

vi.mock("@/hooks/useAppFrameMetrics", () => ({ useAppFrameMetrics: () => ({ sidebarWidth: 72 }) }));

vi.mock("@/hooks/useFontScale", () => ({
  useFontScale: () => ({ increase: vi.fn(), decrease: vi.fn() }),
}));

import { AppMenuDrawer } from "@/components/app-menu-drawer";
import { publishNavigation } from "@/lib/navigation-store";
import { EmbeddedSlideScreen } from "@/components/embedded-slide-screen";
import { SlidePanel } from "@/components/slide-panel";

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

// Pedido do usuário 02/11: menu "Mais" deslizante, com TODOS os itens como grade de ícones e o nome de cada um.
describe("AppMenuDrawer (mobile) — menu deslizante em grade de ícones", () => {
  const Dummy = () => null;
  beforeEach(() => {
    vi.clearAllMocks();
    mockAccountType.value = "admin";
    getCurrentUser.mockResolvedValue({ admin_profile: null });
    publishNavigation([]);
  });
  afterEach(() => publishNavigation([]));

  it("mostra exatamente o menu da barra lateral: itens soltos em 'Principal' e cada grupo com todos os subitens à vista (sem sanfona)", async () => {
    publishNavigation([
      { name: "Dashboard", href: "/admin/dashboard", icon: Dummy },
      { name: "Projetos e Tarefas", icon: Dummy, subitems: [
        { name: "Projetos", href: "/admin/projetos", icon: Dummy, badge: "157" },
        { name: "Tarefas", href: "/admin/tarefas", icon: Dummy },
        { name: "Navegador seguro", href: "/admin/navegador-seguro", icon: Dummy },
      ] },
      { name: "Financeiro", href: "/admin/financeiro", icon: Dummy },
      { name: "Roadmap e chamados", href: "/admin/acesso-chamados", icon: Dummy },
    ]);
    renderDrawer();
    const sections = screen.getAllByTestId("app-menu-section");
    expect(sections.map((s) => s.getAttribute("aria-label"))).toEqual(["Principal", "Projetos e Tarefas"]);
    expect(within(sections[0]).getAllByTestId("app-menu-tile").map((t) => t.textContent)).toEqual(["Dashboard", "Financeiro", "Roadmap e chamados"]);
    expect(within(sections[1]).getAllByTestId("app-menu-tile").map((t) => t.textContent)).toEqual(["Projetos157", "Tarefas", "Navegador seguro"]);
    expect(screen.getByRole("link", { name: /Tarefas/ })).toHaveAttribute("href", "/admin/tarefas");
    // atual (rota aberta) destacado
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");
    // a lista própria (com Roadmap pela permissão) não é somada à da barra lateral
    expect(screen.getAllByText("Roadmap e chamados")).toHaveLength(1);
  });

  it("sem a barra lateral (lista própria) não mostra contadores inventados", async () => {
    mockAccountType.value = "agencias";
    renderDrawer();
    await waitFor(() => expect(screen.getByText("Clientes")).toBeInTheDocument());
    for (const fake of ["15", "24", "8", "3"]) expect(screen.queryByText(fake)).not.toBeInTheDocument();
  });

  it("busca no menu filtra os ícones pelo nome (sem acento/maiúscula)", async () => {
    publishNavigation([
      { name: "Gestão de Contas", icon: Dummy, subitems: [
        { name: "Usuários", href: "/admin/usuarios", icon: Dummy },
        { name: "Permissões", href: "/admin/permissoes", icon: Dummy },
      ] },
      { name: "Financeiro", href: "/admin/financeiro", icon: Dummy },
    ]);
    renderDrawer();
    await userEvent.type(screen.getByRole("textbox", { name: "Buscar no menu" }), "permissoes");
    expect(screen.getAllByTestId("app-menu-tile").map((t) => t.textContent)).toEqual(["Permissões"]);
    await userEvent.clear(screen.getByRole("textbox", { name: "Buscar no menu" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Buscar no menu" }), "xyz");
    expect(screen.getByText("Nenhum item encontrado.")).toBeInTheDocument();
  });

  it("fecha no X, no Escape, tocando no fundo e arrastando a alça para baixo", async () => {
    publishNavigation([{ name: "Dashboard", href: "/admin/dashboard", icon: Dummy }]);
    const onClose = vi.fn();
    render(<MemoryRouter initialEntries={["/admin/dashboard"]}><AppMenuDrawer open onClose={onClose} /></MemoryRouter>);
    expect(screen.getByRole("dialog", { name: "Menu" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Fechar menu" }));
    await userEvent.keyboard("{Escape}");
    await userEvent.click(screen.getByTestId("app-menu-backdrop"));
    const handle = screen.getByTestId("app-menu-handle");
    const drag = (pointerType: string, from: number, to: number, target: Element = handle) => {
      fireEvent.pointerDown(target, { pointerId: 1, pointerType, button: 0, clientY: from });
      fireEvent.pointerMove(handle, { pointerId: 1, pointerType, clientY: to });
      fireEvent.pointerUp(handle, { pointerId: 1, pointerType, clientY: to });
    };
    drag("touch", 100, 260);
    expect(onClose).toHaveBeenCalledTimes(4);
    // arrasto curto não fecha
    drag("touch", 100, 140);
    expect(onClose).toHaveBeenCalledTimes(4);
  });

  it("arrastar a alça com o MOUSE também fecha, sem selecionar texto; começar no X não arrasta (reteste Codex 02/11)", () => {
    publishNavigation([{ name: "Dashboard", href: "/admin/dashboard", icon: Dummy }]);
    const onClose = vi.fn();
    render(<MemoryRouter initialEntries={["/admin/dashboard"]}><AppMenuDrawer open onClose={onClose} /></MemoryRouter>);
    const handle = screen.getByTestId("app-menu-handle");
    expect(handle.className).toContain("select-none");
    fireEvent.pointerDown(handle, { pointerId: 2, pointerType: "mouse", button: 0, clientY: 50 });
    fireEvent.pointerMove(handle, { pointerId: 2, pointerType: "mouse", clientY: 230 });
    fireEvent.pointerUp(handle, { pointerId: 2, pointerType: "mouse", clientY: 230 });
    expect(onClose).toHaveBeenCalledTimes(1);
    // botão direito não arrasta
    fireEvent.pointerDown(handle, { pointerId: 3, pointerType: "mouse", button: 2, clientY: 50 });
    fireEvent.pointerMove(handle, { pointerId: 3, pointerType: "mouse", clientY: 230 });
    fireEvent.pointerUp(handle, { pointerId: 3, pointerType: "mouse", clientY: 230 });
    expect(onClose).toHaveBeenCalledTimes(1);
    // apertar no X e arrastar não fecha pelo arrasto (o X só fecha no clique)
    const x = screen.getByRole("button", { name: "Fechar menu" });
    fireEvent.pointerDown(x, { pointerId: 4, pointerType: "mouse", button: 0, clientY: 50 });
    fireEvent.pointerMove(handle, { pointerId: 4, pointerType: "mouse", clientY: 230 });
    fireEvent.pointerUp(handle, { pointerId: 4, pointerType: "mouse", clientY: 230 });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("fundo e folha ficam acima do cabeçalho do topo (z-90), para tocar na faixa de cima fechar", () => {
    publishNavigation([{ name: "Dashboard", href: "/admin/dashboard", icon: Dummy }]);
    render(<MemoryRouter initialEntries={["/admin/dashboard"]}><AppMenuDrawer open onClose={() => {}} /></MemoryRouter>);
    expect(screen.getByTestId("app-menu-backdrop").className).toMatch(/\bz-95\b/);
    expect(screen.getByTestId("app-menu-sheet").parentElement?.className).toMatch(/\bz-95\b/);
  });
});

describe("AppMenuDrawer (mobile) — identidade no topo do menu (reteste Codex 02/11)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUser.mockResolvedValue({ admin_profile: null });
  });
  afterEach(() => {
    mockAccountType.value = "admin";
    mockProfile.value = null;
  });

  it("agência mostra a pessoa, a sigla e o papel do cartão do topo — nunca AT/Administrador", async () => {
    mockAccountType.value = "agencias";
    mockProfile.value = { name: "Contato Lamego", avatar: "LA", job_title: "", role: "Agência · Partner" };
    renderDrawer();
    const sheet = await screen.findByTestId("app-menu-sheet");
    expect(within(sheet).getByText("Contato Lamego")).toBeInTheDocument();
    expect(within(sheet).getByText("LA")).toBeInTheDocument();
    expect(within(sheet).getByText("Agência · Partner")).toBeInTheDocument();
    expect(within(sheet).queryByText("AT")).not.toBeInTheDocument();
    expect(within(sheet).queryByText("Administrador")).not.toBeInTheDocument();
  });

  it("antes do cabeçalho mandar a sigla, ela sai do nome da pessoa", async () => {
    mockProfile.value = { name: "Vinicius Guardia", avatar: "", job_title: "", role: "Administrador" };
    renderDrawer();
    const sheet = await screen.findByTestId("app-menu-sheet");
    expect(within(sheet).getByText("VG")).toBeInTheDocument();
    expect(within(sheet).getByText("Vinicius Guardia")).toBeInTheDocument();
    expect(within(sheet).getByText("Administrador")).toBeInTheDocument();
  });
});

// Reteste do Codex (02/11): proj_956 → Faturamento → Mais → UM Escape fechava o menu E o projeto.
describe("AppMenuDrawer (mobile) — Escape com o menu aberto sobre um painel", () => {
  const Dummy = () => null;
  beforeEach(() => {
    mockProfile.value = null;
    publishNavigation([{ name: "Dashboard", href: "/admin/dashboard", icon: Dummy }]);
  });

  function ProjetoComMenu({ onCloseProjeto, Painel }: { onCloseProjeto: () => void; Painel: "tela-slide" | "slide-panel" }) {
    const [menuAberto, setMenuAberto] = useState(false);
    const aba = <p>Aba Faturamento</p>;
    return (
      <MemoryRouter initialEntries={["/admin/projetos"]}>
        {Painel === "tela-slide" ? (
          <EmbeddedSlideScreen open onClose={onCloseProjeto} title="Projeto proj_956">{aba}</EmbeddedSlideScreen>
        ) : (
          <SlidePanel open onClose={onCloseProjeto} title="Projeto proj_956">{aba}</SlidePanel>
        )}
        <button type="button" onClick={() => setMenuAberto(true)}>Mais</button>
        <AppMenuDrawer open={menuAberto} onClose={() => setMenuAberto(false)} />
      </MemoryRouter>
    );
  }

  it.each(["tela-slide", "slide-panel"] as const)("um Escape fecha só o menu; o projeto e a aba continuam (%s)", async (Painel) => {
    const onCloseProjeto = vi.fn();
    const user = userEvent.setup();
    render(<ProjetoComMenu onCloseProjeto={onCloseProjeto} Painel={Painel} />);
    await user.click(screen.getByRole("button", { name: "Mais" }));
    expect(screen.getByRole("dialog", { name: "Menu" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Menu" })).not.toBeInTheDocument());
    expect(onCloseProjeto).not.toHaveBeenCalled();
    expect(screen.getByText("Aba Faturamento")).toBeInTheDocument();
    // o próximo Escape, já sem menu, volta a fechar o projeto como antes
    await user.keyboard("{Escape}");
    expect(onCloseProjeto).toHaveBeenCalledTimes(1);
  });

  it("Escape digitado na busca do menu também fecha só o menu", async () => {
    const onCloseProjeto = vi.fn();
    const user = userEvent.setup();
    render(<ProjetoComMenu onCloseProjeto={onCloseProjeto} Painel="tela-slide" />);
    await user.click(screen.getByRole("button", { name: "Mais" }));
    await user.type(screen.getByRole("textbox", { name: "Buscar no menu" }), "dash");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Menu" })).not.toBeInTheDocument());
    expect(onCloseProjeto).not.toHaveBeenCalled();
  });
});
