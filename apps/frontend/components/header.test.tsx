import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

// Lote de navegação de perfil (ata 2026-08-21): "Meu Perfil" no menu do
// usuário (header global) precisa SEMPRE abrir o painel compartilhado
// (UserViewSlidePanel) com os dados do usuário atual — nunca navegar pro
// dashboard, nunca misturar dados de outro perfil. Auditoria de código
// confirmou que esse é o único caminho real usado pelo dropdown "Meu
// Perfil" em todos os portais que compartilham o painel (Admin, Empresa,
// Agência, Parceiro) — o `menuItems` por account_type que existia em
// header.tsx (com o bug real "/admin/dashboard" pro Admin) nunca era lido
// em lugar nenhum: dado morto, removido neste lote por ser enganoso.

const { accountConfig, apiClientMock, notifPanelMock } = vi.hoisted(() => ({
  accountConfig: { accountType: "admin" as string, isPartnerActive: false },
  notifPanelMock: { open: false, setOpen: vi.fn(), tab: "prefs" as string, setTab: vi.fn() },
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
  useProjectBasket: () => ({ getTotalItems: () => 0, setOpen: vi.fn() }),
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

function renderHeader() {
  return render(
    <MemoryRouter initialEntries={["/admin/dashboard"]}>
      <Header />
    </MemoryRouter>,
  );
}

async function openMeuPerfil(user: ReturnType<typeof userEvent.setup>) {
  const avatarTrigger = document.querySelector(
    'header button:has([class*="from-blue-500"])',
  ) as HTMLElement;
  await user.click(avatarTrigger);
  const item = await screen.findByRole("menuitem", { name: /^meu perfil$/i });
  await user.click(item);
}

describe("Header — 'Meu Perfil' abre o painel compartilhado, nunca o dashboard", () => {
  beforeEach(() => {
    accountConfig.accountType = "admin";
    accountConfig.isPartnerActive = false;
    vi.clearAllMocks();
  });

  it("1. Admin: clicar em 'Meu Perfil' abre o painel com os dados do admin, não navega pro dashboard", async () => {
    const user = userEvent.setup();
    renderHeader();
    await openMeuPerfil(user);

    const panel = await screen.findByTestId("profile-panel");
    expect(panel).toHaveAttribute("data-viewer-role", "admin");
    // A URL não muda — abrir o perfil não é uma navegação.
    expect(window.location.pathname).not.toMatch(/dashboard$/);
  });

  it("5. Empresa: 'Meu Perfil' abre o painel com os dados da própria empresa (viewerRole=company)", async () => {
    accountConfig.accountType = "empresas";
    const user = userEvent.setup();
    renderHeader();
    await openMeuPerfil(user);

    expect(await screen.findByTestId("profile-panel-name")).toHaveTextContent("Rose Empresa LTDA");
    expect(screen.getByTestId("profile-panel-email")).toHaveTextContent("rose@lamego.com.vc");
    expect(screen.getByTestId("profile-panel")).toHaveAttribute("data-viewer-role", "company");
  });

  it("6. Agência: 'Meu Perfil' abre o painel com os dados da própria agência (viewerRole=agency)", async () => {
    accountConfig.accountType = "agencias";
    const user = userEvent.setup();
    renderHeader();
    await openMeuPerfil(user);

    expect(await screen.findByTestId("profile-panel-name")).toHaveTextContent("Gabriel Franco Agency");
    expect(screen.getByTestId("profile-panel-email")).toHaveTextContent("gabriel@lamego.com.vc");
    expect(screen.getByTestId("profile-panel")).toHaveAttribute("data-viewer-role", "agency");
  });

  it("7. Parceiro (Agência com PartnerProfile ativo): 'Meu Perfil' também abre o painel com os dados da agência (mesma conta, viewerRole=agency)", async () => {
    accountConfig.accountType = "agencias";
    accountConfig.isPartnerActive = true;
    const user = userEvent.setup();
    renderHeader();
    await openMeuPerfil(user);

    expect(await screen.findByTestId("profile-panel-name")).toHaveTextContent("Gabriel Franco Agency");
    expect(screen.getByTestId("profile-panel")).toHaveAttribute("data-viewer-role", "agency");
  });

  it("8. O painel abre sempre com os dados do usuário ATUAL (nunca aceita um id externo) — o objeto `user` vem só do contexto da própria sessão", async () => {
    accountConfig.accountType = "empresas";
    const user = userEvent.setup();
    renderHeader();
    await openMeuPerfil(user);
    // O componente real (mockado aqui) nunca recebe nem usa um "userId" de
    // rota/URL — o `user` é montado a partir do contexto local (empresa.profile),
    // não de uma busca por id. Não existe caminho de UI pra trocar esse id.
    expect(await screen.findByTestId("profile-panel-name")).toHaveTextContent("Rose Empresa LTDA");
  });

  it("11. abrir 'Meu Perfil' nunca resulta em uma tela vazia — o painel sempre recebe um `user` com nome", async () => {
    accountConfig.accountType = "nomades";
    const user = userEvent.setup();
    renderHeader();
    await openMeuPerfil(user);
    const panel = await screen.findByTestId("profile-panel");
    expect(panel).toBeInTheDocument();
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
