import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { IallkaFloatingIcon } from "@/components/iallka-floating-icon";
import { OnboardingProvider } from "@/contexts/onboarding-context";
import { IallkaContextProvider } from "@/contexts/iallka-context";
import { AccountTypeProvider } from "@/contexts/account-type-context";
import { OpenScreensProvider } from "@/contexts/open-screens-context";
import { SidebarProvider } from "@/contexts/sidebar-context";

// Reunião 10/09 ("Assistente IAllka — ícone e ajuda contextual"): ícone
// flutuante global (logo da Allka como avatar provisório) que abre o painel
// já existente da IAllka, com sugestões contextuais e entrada segura pro
// fluxo de IA já implementado (IallkaSession/IallkaMessage) — nada de nova
// infraestrutura de chat.

const { api } = vi.hoisted(() => ({
  api: {
    getCurrentUser: vi.fn(),
    listTourProgress: vi.fn(),
    getMyMandatoryBanners: vi.fn(),
    dismissTour: vi.fn(),
    postponeTour: vi.fn(),
    createIallkaSession: vi.fn(),
    getIallkaSession: vi.fn(),
    sendIallkaMessage: vi.fn(),
    approveIallkaSession: vi.fn(),
  },
}));
vi.mock("@/lib/api-client", () => ({ apiClient: api, ApiError: class ApiError extends Error {} }));
vi.mock("@/components/ui/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  api.getCurrentUser.mockResolvedValue({ id: "u1", account_type: "admin" });
  api.listTourProgress.mockResolvedValue({ data: [] });
  api.getMyMandatoryBanners.mockResolvedValue({ data: [] });
  api.dismissTour.mockResolvedValue({ data: {} });
  api.postponeTour.mockResolvedValue({ data: {} });
  api.createIallkaSession.mockResolvedValue({
    id: "sess1",
    messages: [{ id: "m1", role: "assistant", content: "IALLKA pode te ajudar a montar um projeto..." }],
  });
});

function renderIcon(initialPath = "/admin/catalogo-produtos") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <OpenScreensProvider>
        <SidebarProvider>
          <AccountTypeProvider>
            <IallkaContextProvider>
              <OnboardingProvider>
                <IallkaFloatingIcon />
              </OnboardingProvider>
            </IallkaContextProvider>
          </AccountTypeProvider>
        </SidebarProvider>
      </OpenScreensProvider>
    </MemoryRouter>,
  );
}

describe("IallkaFloatingIcon — ícone e painel", () => {
  it("1. ícone fica visível, com nome oficial 'IAllka' no rótulo/tooltip", async () => {
    renderIcon();
    const buttons = screen.getAllByRole("button", { name: "Abrir IAllka" });
    expect(buttons.length).toBeGreaterThan(0);
  });

  it("2. usa o logo da Allka como avatar (nunca um ícone de lucide igual ao de outra função)", async () => {
    renderIcon();
    const [btn] = screen.getAllByRole("button", { name: "Abrir IAllka" });
    const img = btn.querySelector("img");
    expect(img).toHaveAttribute("src", "/logo-allka-icon.png");
  });

  it("3. fica numa camada acima (z-65 desktop / z-45 mobile) — nunca atrás do container padrão", async () => {
    renderIcon();
    const [desktopBtn, mobileBtn] = screen.getAllByRole("button", { name: "Abrir IAllka" });
    expect(desktopBtn.closest(".z-65")).toBeTruthy();
    expect(mobileBtn.className).toContain("z-45");
  });

  it("4. em viewport reduzida, o botão mobile existe com posição própria (empilhado, sem sobrepor os outros ícones)", async () => {
    renderIcon();
    const mobileBtn = screen.getAllByRole("button", { name: "Abrir IAllka" })[1];
    expect(mobileBtn.className).toContain("lg:hidden");
    // jsdom recalcula calc()+env() de forma estranha na volta pra string,
    // mas soma corretamente as duas partes fixas (72px base + 240px deste
    // ícone = 312px) — prova que o degrau é o esperado, um acima de Ajuda
    // (+164px) e distinto de todos os outros ícones empilhados.
    expect((mobileBtn as HTMLElement).style.bottom).toContain("312px");
  });

  it("5. abrir e fechar o painel funciona", async () => {
    renderIcon();
    const user = userEvent.setup();
    await user.click(screen.getAllByRole("button", { name: "Abrir IAllka" })[0]);
    expect(await screen.findByText("IAllka")).toBeInTheDocument();
  });

  it("7. contexto do Catálogo de Produtos: sugestões específicas aparecem", async () => {
    renderIcon("/admin/catalogo-produtos");
    const user = userEvent.setup();
    await user.click(screen.getAllByRole("button", { name: "Abrir IAllka" })[0]);
    await screen.findByText("IAllka");
    expect(await screen.findByText("Ajude-me a escolher um produto")).toBeInTheDocument();
    expect(screen.getByText("Monte uma combinação usando os 4 Fs")).toBeInTheDocument();
  });

  it("8. contexto de Projetos: sugestões específicas aparecem", async () => {
    renderIcon("/agency/projeto/123");
    const user = userEvent.setup();
    await user.click(screen.getAllByRole("button", { name: "Abrir IAllka" })[0]);
    await screen.findByText("IAllka");
    expect(await screen.findByText("Quais são os próximos passos?")).toBeInTheDocument();
  });

  it("9. tela genérica: orientação curta, sem fingir sugestões específicas", async () => {
    renderIcon("/perfil");
    const user = userEvent.setup();
    await user.click(screen.getAllByRole("button", { name: "Abrir IAllka" })[0]);
    await screen.findByText("IAllka");
    expect(await screen.findByText("O que a IAllka pode me ajudar a fazer aqui?")).toBeInTheDocument();
    expect(screen.queryByText("Ajude-me a escolher um produto")).not.toBeInTheDocument();
  });

  it("11. teclado: Enter no ícone focado abre o painel", async () => {
    renderIcon();
    const [btn] = screen.getAllByRole("button", { name: "Abrir IAllka" });
    btn.focus();
    await userEvent.keyboard("{Enter}");
    expect(await screen.findByText("IAllka")).toBeInTheDocument();
  });

  it("12. loading ao iniciar sessão, e erro amigável quando a API falha", async () => {
    let resolveSession: (v: any) => void = () => {};
    api.createIallkaSession.mockReturnValue(new Promise((resolve) => { resolveSession = resolve; }));
    renderIcon();
    const user = userEvent.setup();
    await user.click(screen.getAllByRole("button", { name: "Abrir IAllka" })[0]);
    expect(screen.getByText(/Iniciando a IAllka/i)).toBeInTheDocument();
    resolveSession({ id: "s1", messages: [] });
    await waitFor(() => expect(screen.queryByText(/Iniciando a IAllka/i)).not.toBeInTheDocument());
  });

  it("12b. erro amigável (403) quando a conta ainda não tem acesso ao fluxo de IA", async () => {
    api.createIallkaSession.mockRejectedValue(Object.assign(new Error("Forbidden"), { status: 403 }));
    renderIcon();
    const user = userEvent.setup();
    await user.click(screen.getAllByRole("button", { name: "Abrir IAllka" })[0]);
    expect(await screen.findByText(/só para Admin Master e contas de agência/i)).toBeInTheDocument();
  });

  it("14. nenhuma ação automática indevida: abrir o painel não cria projeto nem aprova nada sozinho", async () => {
    renderIcon();
    const user = userEvent.setup();
    await user.click(screen.getAllByRole("button", { name: "Abrir IAllka" })[0]);
    await screen.findByText("IAllka");
    expect(api.approveIallkaSession).not.toHaveBeenCalled();
    expect(screen.queryByText(/projeto criado/i)).not.toBeInTheDocument();
  });
});
