import { useEffect, useState } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { IallkaAssistantPanel } from "@/components/iallka-assistant-panel";
import { IallkaContextProvider, useIallkaContext, type IallkaScreenContext } from "@/contexts/iallka-context";
import { AccountTypeProvider } from "@/contexts/account-type-context";
import { OpenScreensProvider } from "@/contexts/open-screens-context";
import { SidebarProvider } from "@/contexts/sidebar-context";

// Item 9 (reunião 2026-09-14, "Atualizar o contexto da Aura") — mesmo
// padrão de iallka-assistant-panel.project-context.test.tsx, agora pra
// `productId`/`quoteId`: o painel manda exatamente o que a tela registrou,
// nada mais, e o valor SOME ao trocar de tela/produto (nunca reutiliza o
// contexto anterior) — a autorização real continua só no backend.

const { api } = vi.hoisted(() => ({
  api: {
    createIallkaSession: vi.fn(),
    sendIallkaMessage: vi.fn(),
  },
}));
vi.mock("@/lib/api-client", () => ({ apiClient: api, ApiError: class ApiError extends Error {} }));
vi.mock("@/components/ui/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

beforeEach(() => {
  vi.clearAllMocks();
  api.createIallkaSession.mockResolvedValue({ id: "sess1", messages: [] });
  api.sendIallkaMessage.mockResolvedValue({
    reply_text: "ok",
    stage: "gathering",
    project_title: "",
    selected_products: [],
    sources: [],
  });
});

/** Simula uma tela real publicando (e limpando ao desmontar/trocar) um
 * contexto de tela — mesmo padrão do ScreenStub do teste de projeto. */
function ScreenStub({ context }: { context: IallkaScreenContext | null }) {
  const { setScreenContext } = useIallkaContext();
  useEffect(() => {
    setScreenContext(context);
    return () => setScreenContext(null);
  }, [context, setScreenContext]);
  return null;
}

function renderPanel(context: IallkaScreenContext | null) {
  return render(
    <MemoryRouter initialEntries={["/admin/produtos"]}>
      <OpenScreensProvider>
        <AccountTypeProvider>
          <SidebarProvider>
            <IallkaContextProvider>
              <ScreenStub context={context} />
              <IallkaAssistantPanel open onClose={() => {}} />
            </IallkaContextProvider>
          </SidebarProvider>
        </AccountTypeProvider>
      </OpenScreensProvider>
    </MemoryRouter>,
  );
}

async function sendMessage(text: string) {
  const textarea = await screen.findByPlaceholderText(/Me conte tudo que sabe/i);
  const user = userEvent.setup();
  await user.type(textarea, `${text}{Enter}`);
}

describe("IallkaAssistantPanel — envia productId/quoteId do contexto da tela (Item 9)", () => {
  it("com um produto aberto no Cadastro de Produtos, manda esse product_id", async () => {
    renderPanel({ label: "Cadastro de Produtos", openItemName: "Serviço X", productId: "prod-A" });
    await waitFor(() => expect(api.createIallkaSession).toHaveBeenCalled());
    await sendMessage("explique este produto");
    await waitFor(() => expect(api.sendIallkaMessage).toHaveBeenCalled());
    const [, , , sentProductId, sentQuoteId] = api.sendIallkaMessage.mock.calls[0];
    expect(sentProductId).toBe("prod-A");
    expect(sentQuoteId).toBeUndefined();
  });

  it("com uma única cotação identificada no checkout, manda esse quote_id", async () => {
    renderPanel({ label: "Checkout do Catálogo", quoteId: "quote-A" });
    await waitFor(() => expect(api.createIallkaSession).toHaveBeenCalled());
    await sendMessage("qual o prazo de proteção?");
    await waitFor(() => expect(api.sendIallkaMessage).toHaveBeenCalled());
    const [, , , sentProductId, sentQuoteId] = api.sendIallkaMessage.mock.calls[0];
    expect(sentQuoteId).toBe("quote-A");
    expect(sentProductId).toBeUndefined();
  });

  it("sem produto/cotação identificados, nenhum id é enviado (regra geral, nunca dado inventado)", async () => {
    renderPanel({ label: "Checkout do Catálogo" });
    await waitFor(() => expect(api.createIallkaSession).toHaveBeenCalled());
    await sendMessage("como funciona a proteção de preço?");
    await waitFor(() => expect(api.sendIallkaMessage).toHaveBeenCalled());
    const [, , , sentProductId, sentQuoteId] = api.sendIallkaMessage.mock.calls[0];
    expect(sentProductId).toBeUndefined();
    expect(sentQuoteId).toBeUndefined();
  });

  it("trocar de produto (mesma sessão, mesmo painel) nunca reutiliza o productId anterior", async () => {
    function SwitchableScreenStub() {
      const { setScreenContext } = useIallkaContext();
      useEffect(() => {
        setScreenContext({ label: "Cadastro de Produtos", productId: "prod-A" });
        return () => setScreenContext(null);
      }, [setScreenContext]);
      return null;
    }
    function SwitchedScreenStub() {
      const { setScreenContext } = useIallkaContext();
      useEffect(() => {
        setScreenContext({ label: "Cadastro de Produtos", productId: "prod-B" });
        return () => setScreenContext(null);
      }, [setScreenContext]);
      return null;
    }
    function Harness() {
      const [onProductB, setOnProductB] = useState(false);
      return (
        <MemoryRouter initialEntries={["/admin/produtos"]}>
          <OpenScreensProvider>
            <AccountTypeProvider>
              <SidebarProvider>
                <IallkaContextProvider>
                  {onProductB ? <SwitchedScreenStub /> : <SwitchableScreenStub />}
                  <button onClick={() => setOnProductB(true)}>trocar-produto</button>
                  <IallkaAssistantPanel open onClose={() => {}} />
                </IallkaContextProvider>
              </SidebarProvider>
            </AccountTypeProvider>
          </OpenScreensProvider>
        </MemoryRouter>
      );
    }
    render(<Harness />);
    await waitFor(() => expect(api.createIallkaSession).toHaveBeenCalled());
    const user = userEvent.setup();
    await user.click(screen.getByText("trocar-produto"));
    await sendMessage("explique este produto");
    await waitFor(() => expect(api.sendIallkaMessage).toHaveBeenCalled());
    const [, , , sentProductId] = api.sendIallkaMessage.mock.calls[0];
    expect(sentProductId).toBe("prod-B");
  });
});
