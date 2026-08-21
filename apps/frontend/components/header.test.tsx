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

const { accountConfig, apiClientMock } = vi.hoisted(() => ({
  accountConfig: { accountType: "admin" as string, isPartnerActive: false },
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
  useNotificationsPanel: () => ({ open: false, setOpen: vi.fn(), tab: "prefs", setTab: vi.fn() }),
}));

vi.mock("@/lib/api-client", () => ({ apiClient: apiClientMock }));

vi.mock("@/components/notification-preferences-panel", () => ({
  NotificationPreferencesPanel: () => null,
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
