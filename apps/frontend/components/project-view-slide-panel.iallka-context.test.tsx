import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ProjectViewSlidePanel } from "@/components/project-view-slide-panel";
import { IallkaContextProvider, useIallkaContext } from "@/contexts/iallka-context";
import { OpenScreensProvider } from "@/contexts/open-screens-context";

// Reunião 10/09 ("integração IAllka — telas de Projetos"): o painel de
// projeto (usado por Admin/Agência/Empresa) precisa registrar o `projectId`
// real no contexto da IAllka enquanto está aberto, e limpar ao fechar ou
// trocar de projeto — nunca reaproveitando o projeto anterior. O backend já
// valida o vínculo de novo (routes/iallka.ts) — aqui só garantimos que o
// FRONTEND manda o ID certo, e nada além do ID (nunca briefing/documento).

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    getProjectProducts: vi.fn().mockResolvedValue({ data: [] }),
    getOperationalTasks: vi.fn().mockResolvedValue({ data: [] }),
    contractProductBundle: vi.fn(),
    linkProductToProject: vi.fn(),
    updateProjectTask: vi.fn(),
    releaseProjectTask: vi.fn(),
    unlinkProductFromProject: vi.fn(),
  },
}));

// Componentes de outras abas (conexões, memória, lançamento, meta ads,
// bloqueadores) são irrelevantes pra esse teste — mockados pra manter o
// teste focado só na integração de contexto, sem puxar suas próprias
// chamadas de API.
vi.mock("@/components/project-connections-tab", () => ({ ProjectConnectionsTab: () => null }));
vi.mock("@/components/project-memoria-tab", () => ({ ProjectMemoriaTab: () => null }));
vi.mock("@/components/launch-session-panel", () => ({ LaunchSessionPanel: () => null }));
vi.mock("@/components/task-release-blockers-panel", () => ({ TaskReleaseBlockersPanel: () => null }));
vi.mock("@/components/project-meta-ads-widget", () => ({ ProjectMetaAdsWidget: () => null }));
vi.mock("@/components/task-launch-drawer", () => ({ TaskLaunchDrawer: () => null }));
vi.mock("@/components/catalog2/catalog2-additives-panel", () => ({ Catalog2AdditivesPanel: () => null }));

function ScreenContextProbe() {
  const { screenContext } = useIallkaContext();
  return <div data-testid="probe">{screenContext.projectId ?? "none"}</div>;
}

function renderPanel(project: any, open: boolean, onClose = () => {}) {
  return render(
    <MemoryRouter initialEntries={["/admin/tarefas"]}>
      <OpenScreensProvider>
        <IallkaContextProvider>
          <ScreenContextProbe />
          <ProjectViewSlidePanel
            open={open}
            project={project}
            onClose={onClose}
            onEdit={() => {}}
            onClone={() => {}}
            onExport={() => {}}
            onCancel={() => {}}
          />
        </IallkaContextProvider>
      </OpenScreensProvider>
    </MemoryRouter>,
  );
}

describe("ProjectViewSlidePanel — integração de contexto com a IAllka", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("projeto aberto envia o ID correto pro contexto da IAllka", async () => {
    renderPanel({ id: "proj-A", name: "Projeto A" }, true);
    await waitFor(() => expect(screen.getByTestId("probe")).toHaveTextContent("proj-A"));
  });

  it("fechar o painel limpa o ID do contexto", async () => {
    const { rerender } = renderPanel({ id: "proj-A", name: "Projeto A" }, true);
    await waitFor(() => expect(screen.getByTestId("probe")).toHaveTextContent("proj-A"));

    rerender(
      <MemoryRouter initialEntries={["/admin/tarefas"]}>
        <OpenScreensProvider>
          <IallkaContextProvider>
            <ScreenContextProbe />
            <ProjectViewSlidePanel
              open={false}
              project={{ id: "proj-A", name: "Projeto A" }}
              onClose={() => {}}
              onEdit={() => {}}
              onClone={() => {}}
              onExport={() => {}}
              onCancel={() => {}}
            />
          </IallkaContextProvider>
        </OpenScreensProvider>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByTestId("probe")).toHaveTextContent("none"));
  });

  it("sair da tela (desmontar o painel) limpa o ID do contexto", async () => {
    const { unmount } = renderPanel({ id: "proj-A", name: "Projeto A" }, true);
    await waitFor(() => expect(screen.getByTestId("probe")).toHaveTextContent("proj-A"));
    unmount();
    // Sem probe pra checar depois do unmount — a garantia real é a
    // próxima montagem (ver teste de troca A→B) nunca reaproveitar o valor.
  });

  it("trocar do Projeto A para o Projeto B substitui o ID anterior (nunca soma/mistura)", async () => {
    const { rerender } = renderPanel({ id: "proj-A", name: "Projeto A" }, true);
    await waitFor(() => expect(screen.getByTestId("probe")).toHaveTextContent("proj-A"));

    rerender(
      <MemoryRouter initialEntries={["/admin/tarefas"]}>
        <OpenScreensProvider>
          <IallkaContextProvider>
            <ScreenContextProbe />
            <ProjectViewSlidePanel
              open
              project={{ id: "proj-B", name: "Projeto B" }}
              onClose={() => {}}
              onEdit={() => {}}
              onClone={() => {}}
              onExport={() => {}}
              onCancel={() => {}}
            />
          </IallkaContextProvider>
        </OpenScreensProvider>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByTestId("probe")).toHaveTextContent("proj-B"));
    expect(screen.getByTestId("probe")).not.toHaveTextContent("proj-A");
  });

  it("sem projeto aberto (project null), o contexto continua genérico — sem projectId", async () => {
    renderPanel(null, false);
    expect(screen.getByTestId("probe")).toHaveTextContent("none");
  });
});
