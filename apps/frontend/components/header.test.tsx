import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";

// Lote de navegação de perfil (ata 2026-08-21): "Meu Perfil" no menu do
// usuário (header global) precisa SEMPRE abrir o painel compartilhado
// (UserViewSlidePanel) com os dados do usuário atual — nunca navegar pro
// dashboard, nunca misturar dados de outro perfil. Auditoria de código
// confirmou que esse é o único caminho real usado pelo dropdown "Meu
// Perfil" em todos os portais que compartilham o painel (Admin, Empresa,
// Agência, Parceiro) — o `menuItems` por account_type que existia em
// header.tsx (com o bug real "/admin/dashboard" pro Admin) nunca era lido
// em lugar nenhum: dado morto, removido neste lote por ser enganoso.

const { accountConfig, apiClientMock, notifPanelMock, basketMock } = vi.hoisted(() => ({
  accountConfig: { accountType: "admin" as string, isPartnerActive: false },
  notifPanelMock: { open: false, setOpen: vi.fn(), tab: "prefs" as string, setTab: vi.fn() },
  basketMock: { totalItems: 0, setOpen: vi.fn() },
  apiClientMock: {
    getCurrentUser: vi.fn().mockResolvedValue({
      id: 1,
      name: "Vinicius Guardia",
      email: "cp@lamego.com.vc",
      role: "admin",
      account_type: "admin",
    }),
    getUsers: vi.fn().mockResolvedValue([]),
    getCompanies: vi.fn().mockResolvedValue([]),
    getProjects: vi.fn().mockResolvedValue([]),
    getUnreadSystemAlertsCount: vi.fn().mockResolvedValue(0),
    clearToken: vi.fn(),
  },
}));

vi.mock("@/contexts/account-type-context", () => ({
  useAccountType: () => ({
    accountType: accountConfig.accountType,
    accountSubType: null,
    unlockAccountType: vi.fn(),
    previewUserName: null,
    previewUserEmail: null,
    isPartnerActive: accountConfig.isPartnerActive,
  }),
}));

vi.mock("@/contexts/sidebar-context", () => ({
  useSidebar: () => ({
    userProfile: { name: "", email: "", job_title: "" },
    updateUserProfile: vi.fn(),
  }),
}));

vi.mock("@/contexts/partner-context", () => ({
  usePartner: () => ({ profile: null }),
}));

vi.mock("@/contexts/empresa-context", () => ({
  useEmpresa: () => ({
    profile: {
      id: "emp-1",
      name: "Rose Empresa LTDA",
      email: "rose@lamego.com.vc",
      totalInvested: 1000,
      status: "active",
      createdAt: "",
    },
    projects: [],
    tasks: [],
  }),
}));

vi.mock("@/contexts/agencia-context", () => ({
  useAgencia: () => ({
    profile: {
      id: "ag-1",
      name: "Gabriel Franco Agency",
      email: "gabriel@lamego.com.vc",
      currentMrr: 454,
      totalProjects: 1,
      createdAt: "",
    },
    projects: [],
    tasks: [],
    invoices: [],
  }),
}));

vi.mock("@/contexts/project-basket-context", () => ({
  useProjectBasket: () => ({ getTotalItems: () => basketMock.totalItems, setOpen: basketMock.setOpen }),
}));

vi.mock("@/contexts/notifications-panel-context", () => ({
  useNotificationsPanel: () => notifPanelMock,
}));

vi.mock("@/lib/api-client", () => ({ apiClient: apiClientMock }));

vi.mock("@/components/notifications-panel", () => ({
  NotificationsPanel: () => <div data-testid="notif-panel-mock" />,
}));

vi.mock("@/components/project-basket-drawer", () => ({
  ProjectBasketDrawer: () => null,
}));

// UserViewSlidePanel real tem ~5800 linhas e dezenas de dependências
// (accordions, permissões, gráficos) — o que importa aqui é só o CONTRATO:
// quais props chegam nele quando "Meu Perfil" é clicado. Um stub simples
// que expõe `open`/`user` como texto basta pra provar isso.
vi.mock("@/components/user-view-slide-panel", () => ({
  UserViewSlidePanel: ({ open, user, viewerRole }: any) =>
    open ? (
      <div data-testid="profile-panel" data-viewer-role={viewerRole}>
        <span data-testid="profile-panel-name">{user?.name}</span>
        <span data-testid="profile-panel-email">{user?.email}</span>
      </div>
    ) : null,
}));

import { Header } from "@/components/header";

function LocationProbe() {
  const loc = useLocation();
  return <div data-testid="loc">{loc.pathname}</div>;
}

function renderHeader(route = "/admin/dashboard") {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Header />
      <LocationProbe />
    </MemoryRouter>,
  );
}

const currentPath = () => screen.getByTestId("loc").textContent;

const basketBtn = () => screen.queryByRole("button", { name: "Cesta do projeto" });

async function openMeuPerfil(user: ReturnType<typeof userEvent.setup>) {
  const avatarTrigger = document.querySelector(
    'header button:has([class*="from-blue-500"])',
  ) as HTMLElement;
  await user.click(avatarTrigger);
  const item = await screen.findByRole("menuitem", { name: /^meu perfil$/i });
  await user.click(item);
}

describe("Header — 'Meu Perfil' NAVEGA para a rota pessoal do portal (nunca abre o slide-over)", () => {
  beforeEach(() => {
    accountConfig.accountType = "admin";
    accountConfig.isPartnerActive = false;
    basketMock.totalItems = 0;
    vi.clearAllMocks();
  });

  it("1. Admin: 'Meu Perfil' navega para /admin/perfil e NÃO renderiza o UserViewSlidePanel", async () => {
    const user = userEvent.setup();
    renderHeader("/admin/tarefas");
    await openMeuPerfil(user);

    await waitFor(() => expect(currentPath()).toBe("/admin/perfil"));
    expect(screen.queryByTestId("profile-panel")).not.toBeInTheDocument();
  });

  it("5. Empresa: 'Meu Perfil' navega para /company/perfil", async () => {
    accountConfig.accountType = "empresas";
    const user = userEvent.setup();
    renderHeader("/company/dashboard");
    await openMeuPerfil(user);
    await waitFor(() => expect(currentPath()).toBe("/company/perfil"));
  });

  it("6. Agência: 'Meu Perfil' navega para /agency/perfil", async () => {
    accountConfig.accountType = "agencias";
    const user = userEvent.setup();
    renderHeader("/agency/projetos");
    await openMeuPerfil(user);
    await waitFor(() => expect(currentPath()).toBe("/agency/perfil"));
  });

  it("7. Parceiro (Agência com PartnerProfile ativo): também vai para /agency/perfil", async () => {
    accountConfig.accountType = "agencias";
    accountConfig.isPartnerActive = true;
    const user = userEvent.setup();
    renderHeader("/agency/projetos");
    await openMeuPerfil(user);
    await waitFor(() => expect(currentPath()).toBe("/agency/perfil"));
  });

  it("11. Nomad e Leader preservam as rotas dedicadas", async () => {
    accountConfig.accountType = "nomades";
    const user = userEvent.setup();
    const { unmount } = renderHeader("/nomades/minhastarefas");
    await openMeuPerfil(user);
    await waitFor(() => expect(currentPath()).toBe("/nomades/perfil"));
    unmount();

    accountConfig.accountType = "lider";
    const user2 = userEvent.setup();
    renderHeader("/leader/tarefas");
    await openMeuPerfil(user2);
    await waitFor(() => expect(currentPath()).toBe("/leader/perfil"));
  });
});

// Lote de correção visual (ata 2026-08, revisão do responsável) — o lote
// anterior tinha colocado o ícone de Alertas AO LADO do sino, no cabeçalho.
// O responsável rejeitou visualmente e pediu que Alertas saísse do
// cabeçalho de vez, indo para a barra vertical direita (ver
// alerts-floating-icon.test.tsx pros testes desse ícone e do AlertsPanel).
// Este describe garante que o cabeçalho ficou só com o sino.
describe("Header — só o sino de Notificações fica no cabeçalho (Alertas saiu daqui)", () => {
  beforeEach(() => {
    accountConfig.accountType = "admin";
    accountConfig.isPartnerActive = false;
    vi.clearAllMocks();
    apiClientMock.getCurrentUser.mockResolvedValue({
      id: 1, name: "Vinicius Guardia", email: "cp@lamego.com.vc", role: "admin", account_type: "admin",
    });
  });

  it("1. o sino (Notificações) aparece no cabeçalho desktop", () => {
    renderHeader();
    expect(document.querySelector("header button svg.lucide-bell")).toBeTruthy();
  });

  it("2. o ícone de Alertas NÃO aparece ao lado do sino no cabeçalho", () => {
    renderHeader();
    expect(document.querySelector("header button svg.lucide-triangle-alert")).toBeNull();
    expect(document.querySelector("header svg.lucide-triangle-alert")).toBeNull();
  });

  it("4. o sino tem tooltip/aria-label próprio ('Notificações')", () => {
    renderHeader();
    const bellButton = document.querySelector("header button svg.lucide-bell")?.closest("button");
    expect(bellButton).toHaveAttribute("title", "Notificações");
    expect(bellButton?.getAttribute("aria-label")).toMatch(/^Notificações/);
  });

  it("6. clicar no sino define a aba 'inbox' e abre o painel de Notificações", async () => {
    const user = userEvent.setup();
    renderHeader();

    const bellButton = document.querySelector("header button svg.lucide-bell")?.closest("button") as HTMLElement;
    await user.click(bellButton);
    expect(notifPanelMock.setTab).toHaveBeenLastCalledWith("inbox");
    expect(notifPanelMock.setOpen).toHaveBeenLastCalledWith(true);
  });

  it("5/17. contador do sino usa somente category=notificacao, nunca soma alerta", async () => {
    apiClientMock.getUnreadSystemAlertsCount = vi.fn((filters?: any) => {
      if (filters?.category === "notificacao") return Promise.resolve({ count: 3 });
      return Promise.resolve({ count: 999 }); // nunca deveria ser chamado sem categoria, nem com "alerta"
    });
    renderHeader();

    expect(await screen.findByText("3")).toBeInTheDocument();
    expect(apiClientMock.getUnreadSystemAlertsCount).not.toHaveBeenCalledWith(undefined);
    expect(apiClientMock.getUnreadSystemAlertsCount).not.toHaveBeenCalledWith({});
    expect(apiClientMock.getUnreadSystemAlertsCount).not.toHaveBeenCalledWith({ category: "alerta" });
  });
});

describe("Header — cesta só no contexto de catálogo/loja (ata 2026-08, interface/usabilidade)", () => {
  beforeEach(() => {
    accountConfig.accountType = "admin";
    accountConfig.isPartnerActive = false;
    basketMock.totalItems = 0;
    vi.clearAllMocks();
  });

  it("cesta VAZIA fora de catálogo (dashboard) → ícone não aparece", async () => {
    renderHeader("/admin/dashboard");
    await screen.findByRole("menuitem", { name: /^meu perfil$/i }).catch(() => {});
    expect(basketBtn()).not.toBeInTheDocument();
  });

  it("cesta VAZIA fora de catálogo (financeiro / perfil) → ícone não aparece", async () => {
    renderHeader("/admin/financeiro");
    await new Promise((r) => setTimeout(r, 0));
    expect(basketBtn()).not.toBeInTheDocument();
  });

  it("rota de catálogo → ícone aparece mesmo com a cesta vazia", async () => {
    renderHeader("/admin/catalogo-produtos");
    expect(basketBtn()).toBeInTheDocument();
  });

  it("cesta COM itens em qualquer rota (fluxo de projeto em criação a continuar) → ícone aparece", async () => {
    basketMock.totalItems = 2;
    renderHeader("/admin/dashboard");
    expect(basketBtn()).toBeInTheDocument();
  });

  it("catálogo de empresa e agência também exibem a cesta", async () => {
    accountConfig.accountType = "empresas";
    const { unmount } = renderHeader("/company/produtos");
    expect(basketBtn()).toBeInTheDocument();
    unmount();
    accountConfig.accountType = "agencias";
    renderHeader("/agencia/catalogo");
    expect(basketBtn()).toBeInTheDocument();
  });
});
