import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const { startRoadmapSso, getRoadmapSsoBaseUrl, getCurrentUser, mockAccountType, getInternalTaskSettings } = vi.hoisted(() => ({
  getInternalTaskSettings: vi.fn(),
  startRoadmapSso: vi.fn(),
  getRoadmapSsoBaseUrl: vi.fn(),
  getCurrentUser: vi.fn(),
  mockAccountType: { value: "admin" as string },
}));

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    getCurrentUser,
    getInternalTaskSettings,
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
    // a barra da agência lê logo/nome da agência; para os demais perfis não é usado
    agencyProfile: mockAccountType.value === "agencias" ? { logo: "", name: "Agência Teste" } : null,
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

  // Admin: o clique navega (mesma aba) para a tela de gestão — o SSO só
  // dispara de lá, pelo botão "Abrir painel interno" dessa página. O item
  // vira um link normal (href), não mais um disparador direto do hook.
  it("admin: clicar navega para /admin/acesso-chamados, sem abrir aba nem chamar o hook de SSO", async () => {
    mockAccountType.value = "admin";
    getCurrentUser.mockResolvedValue({ admin_profile: null });
    const openSpy = vi.spyOn(window, "open");

    renderSidebar();
    const item = await screen.findByText("Roadmap e chamados");
    expect(item.closest("a")).toHaveAttribute("href", "/admin/acesso-chamados");

    await userEvent.click(item);

    expect(openSpy).not.toHaveBeenCalled();
    expect(getRoadmapSsoBaseUrl).not.toHaveBeenCalled();
    expect(startRoadmapSso).not.toHaveBeenCalled();
    openSpy.mockRestore();
  });

  // Não-admin (dev/QA com central_chamados): não existe tela de gestão pra
  // essa conta ver (é admin-gated), então o clique vai direto pro SSO. O
  // fluxo completo (aba -> /sso/await -> aguarda postMessage -> só então
  // pede o token) já é testado exaustivamente em
  // hooks/use-open-roadmap-panel.test.ts. Aqui só confirmamos que o clique
  // do item realmente aciona esse hook compartilhado — abre a aba
  // sincronamente e chama o primeiro passo dele — sem duplicar toda a
  // simulação de postMessage/Basic Auth de novo neste arquivo.
  it("não-admin com central_chamados: clicar abre uma aba em branco de forma síncrona e aciona o hook de SSO compartilhado", async () => {
    mockAccountType.value = "empresas";
    getCurrentUser.mockResolvedValue({
      admin_profile: { is_active: true, is_master: false, permissions: [{ module: "central_chamados", action: "view" }] },
    });
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

  it("não-admin com central_chamados: duplo clique não dispara duas requisições nem abre duas abas", async () => {
    mockAccountType.value = "empresas";
    getCurrentUser.mockResolvedValue({
      admin_profile: { is_active: true, is_master: false, permissions: [{ module: "central_chamados", action: "view" }] },
    });
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

// 2026-09 (consolidação catalog2, reunião "catálogo2 como cadastro
// definitivo"): não existe mais uma entrada de menu separada para
// "Preparação de Produtos" — Cadastro de Produtos e Catálogo de Produtos
// passaram a administrar exclusivamente o catalog2, e ambos exigem Admin
// Master (o backend já recusava /api/admin/catalog2/* pra qualquer outro
// perfil; antes desta consolidação, o catálogo ANTIGO nesta mesma rota era
// visível a outros admins — essa perda de acesso para não-master é
// intencional e documentada, não acidental).
describe("Sidebar — Produtos: Cadastro/Catálogo exigem Admin Master (consolidação catalog2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAccountType.value = "admin";
  });

  it("Admin Master vê 'Cadastro de Produtos' e 'Catálogo de Produtos', sem entrada separada de 'Preparação'", async () => {
    getCurrentUser.mockResolvedValue({ admin_profile: { is_active: true, is_master: true, permissions: [] } });
    renderSidebar();
    await waitFor(() => expect(getCurrentUser).toHaveBeenCalled());
    await userEvent.click(await screen.findByText("Produtos"));
    const cadastro = await screen.findByRole("link", { name: /^Cadastro de Produtos$/i });
    expect(cadastro).toHaveAttribute("href", "/admin/cadastro-produtos");
    const catalogo = await screen.findByRole("link", { name: /^Catálogo de Produtos$/i });
    expect(catalogo).toHaveAttribute("href", "/admin/produtos");
    expect(screen.queryByRole("link", { name: /Preparação de Produtos/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Novo Catálogo/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/operacional atual/i)).not.toBeInTheDocument();
  });

  it("Admin comum (não-master) NÃO vê Cadastro nem Catálogo de Produtos", async () => {
    getCurrentUser.mockResolvedValue({
      admin_profile: { is_active: true, is_master: false, permissions: [{ module: "produtos", action: "view" }] },
    });
    renderSidebar();
    await waitFor(() => expect(getCurrentUser).toHaveBeenCalled());
    await userEvent.click(await screen.findByText("Produtos"));
    expect(screen.queryByRole("link", { name: /^Cadastro de Produtos$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^Catálogo de Produtos$/i })).not.toBeInTheDocument();
  });
});

// Lote de navegação de perfil (ata 2026-08-21): auditoria de código
// confirmou que /leader/perfil é a rota REAL e funcional do perfil do
// líder (renderiza LiderPerfilPage — ver App.tsx) e /lider/perfil é só um
// redirect pra ela; e /nomades/perfil já era a rota real do nômade. Estes
// testes travam esses links pra não regredir.
describe("Sidebar — item 'Perfil' (Líder e Nômade)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("2/3. Líder: o link 'Perfil' aponta pra /leader/perfil (rota real, não /lider/perfil nem qualquer rota inexistente)", async () => {
    mockAccountType.value = "lider";
    getCurrentUser.mockResolvedValue({ admin_profile: null });
    renderSidebar();
    const link = await screen.findByRole("link", { name: /^perfil$/i });
    expect(link).toHaveAttribute("href", "/leader/perfil");
  });

  it("4. Nômade: o link 'Perfil' aponta pra /nomades/perfil (rota real e funcional)", async () => {
    mockAccountType.value = "nomades";
    getCurrentUser.mockResolvedValue({ admin_profile: null });
    renderSidebar();
    const link = await screen.findByRole("link", { name: /^perfil$/i });
    expect(link).toHaveAttribute("href", "/nomades/perfil");
  });
});

// Agência PARTNER (regra de 26/10/2026): vê o menu da agência (tudo DELA) + Comissões e Saques; NÃO vê "Agências" nem "Tarefas internas" (são da Allka).
describe("Sidebar — agência Partner", () => {
  const linkNames = () => screen.getAllByRole("link").map((a) => (a.textContent ?? "").trim());
  const setUser = (partner: boolean) => localStorage.setItem("allka_user", JSON.stringify({ role: "agency_admin", account_type: "agencias", ...(partner ? { partner_status: "active" } : {}) }));
  beforeEach(() => {
    vi.clearAllMocks();
    mockAccountType.value = "agencias";
    getCurrentUser.mockResolvedValue({ admin_profile: null });
    // a administração liberou "Tarefas internas" para agências em geral — mesmo assim a Partner não vê
    getInternalTaskSettings.mockResolvedValue({ can_use: true });
  });

  it("Partner ativa: vê Dashboard, Clientes, Usuários, Projetos, Catálogo, Conexões, Combos, Tarefas, Navegador seguro, Financeiro, Relatórios, Comissões e Saques", async () => {
    setUser(true);
    renderSidebar();
    await waitFor(() => expect(getInternalTaskSettings).toHaveBeenCalled());
    await screen.findByRole("link", { name: /Comissões/ });
    const names = linkNames();
    for (const esperado of ["Dashboard", "Clientes", "Usuários", "Projetos", "Catálogo", "Conexões e acessos", "Combos", "Tarefas", "Navegador seguro", "Financeiro", "Relatórios", "Comissões", "Saques"]) {
      expect(names.some((n) => n.includes(esperado)), `faltou ${esperado}`).toBe(true);
    }
  });

  it("Partner ativa: NÃO vê 'Agências' nem 'Tarefas internas'", async () => {
    setUser(true);
    renderSidebar();
    await waitFor(() => expect(getInternalTaskSettings).toHaveBeenCalled());
    await screen.findByRole("link", { name: /Comissões/ });
    const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(hrefs).not.toContain("/partner/agencias");
    expect(hrefs).not.toContain("/agency/tarefas-internas");
    expect(linkNames().some((n) => n === "Agências" || n === "Tarefas internas")).toBe(false);
  });

  it("agência comum (sem Partner) com o módulo liberado continua vendo 'Tarefas internas' e não vê Comissões/Saques", async () => {
    setUser(false);
    renderSidebar();
    await screen.findByRole("link", { name: /Tarefas internas/ });
    const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/agency/tarefas-internas");
    expect(hrefs).not.toContain("/partner/comissoes");
    expect(hrefs).not.toContain("/partner/saques");
  });
});
