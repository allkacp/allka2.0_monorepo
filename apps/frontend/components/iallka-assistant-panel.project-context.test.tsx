import { useEffect } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { IallkaAssistantPanel } from "@/components/iallka-assistant-panel";
import { IallkaContextProvider, useIallkaContext } from "@/contexts/iallka-context";
import { AccountTypeProvider } from "@/contexts/account-type-context";
import { OpenScreensProvider } from "@/contexts/open-screens-context";

// Reunião 10/09 ("integração IAllka — telas de Projetos"): o painel manda
// SÓ o `project_id` que a tela registrou no contexto — nunca briefing/doc, e
// a autorização real continua só no backend (routes/iallka.ts). Este teste
// garante que o valor que chega em `apiClient.sendIallkaMessage` é
// exatamente o que a tela publicou via `setScreenContext`, e que ele some
// quando a tela deixa de publicar um `projectId` (fechar/trocar de tela).

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

/** Simula uma tela real: publica (e ao desmontar, limpa) um `projectId`. */
function ScreenStub({ projectId }: { projectId?: string }) {
  const { setScreenContext } = useIallkaContext();
  useEffect(() => {
    setScreenContext(projectId ? { label: "Projetos", projectId } : { label: "Projetos" });
    return () => setScreenContext(null);
  }, [projectId, setScreenContext]);
  return null;
}

function renderPanel(projectId?: string) {
  return render(
    <MemoryRouter initialEntries={["/admin/tarefas"]}>
      <OpenScreensProvider>
        <AccountTypeProvider>
          <IallkaContextProvider>
            <ScreenStub projectId={projectId} />
            <IallkaAssistantPanel open onClose={() => {}} />
          </IallkaContextProvider>
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

describe("IallkaAssistantPanel — envia só o project_id do contexto da tela", () => {
  it("com um projeto aberto no contexto, manda esse project_id — e nada mais (nunca briefing/texto)", async () => {
    renderPanel("proj-A");
    await waitFor(() => expect(api.createIallkaSession).toHaveBeenCalled());
    await sendMessage("oi");
    await waitFor(() => expect(api.sendIallkaMessage).toHaveBeenCalled());
    const [, , sentProjectId] = api.sendIallkaMessage.mock.calls[0];
    expect(sentProjectId).toBe("proj-A");
  });

  it("sem projeto aberto, o contexto segue genérico — nenhum project_id é enviado", async () => {
    renderPanel(undefined);
    await waitFor(() => expect(api.createIallkaSession).toHaveBeenCalled());
    await sendMessage("oi");
    await waitFor(() => expect(api.sendIallkaMessage).toHaveBeenCalled());
    const [, , sentProjectId] = api.sendIallkaMessage.mock.calls[0];
    expect(sentProjectId).toBeUndefined();
  });

  it("mostra recomendação do Catalog2 como orientação, sem oferecer criação automática de projeto", async () => {
    api.sendIallkaMessage.mockResolvedValueOnce({
      reply_text: "Este produto atende ao objetivo informado.",
      stage: "gathering",
      project_title: "",
      selected_products: [],
      catalog2_recommendations: [{
        product_id: "catalog2-1",
        product_name: "Criação de Site Institucional",
        reasoning: "Atende à necessidade de presença digital.",
        can_configure: false,
      }],
      sources: [],
    });
    renderPanel();
    await waitFor(() => expect(api.createIallkaSession).toHaveBeenCalled());
    await sendMessage("Preciso de um site");
    expect(await screen.findByText("Sugestões do novo catálogo")).toBeInTheDocument();
    expect(screen.getByText("Criação de Site Institucional")).toBeInTheDocument();
    expect(screen.getByText(/ainda não gera orçamento, cesta ou projeto/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /aprovar e criar projeto/i })).not.toBeInTheDocument();
  });
});
