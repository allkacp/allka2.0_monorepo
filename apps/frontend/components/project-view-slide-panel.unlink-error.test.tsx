import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ProjectViewSlidePanel } from "@/components/project-view-slide-panel";
import { IallkaContextProvider } from "@/contexts/iallka-context";
import { OpenScreensProvider } from "@/contexts/open-screens-context";

// Decisão do usuário (02/11): produto já pago não sai do projeto — o servidor responde 409 com o motivo.
// Antes o erro do "Desvincular" sumia em silêncio (a janela só ficava aberta); agora a tela mostra o motivo.

const { toastMock, unlinkMock } = vi.hoisted(() => ({ toastMock: vi.fn(), unlinkMock: vi.fn() }));

vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: toastMock }) }));
vi.mock("@/lib/api-client", () => ({
  apiClient: {
    getProjectProducts: vi.fn().mockResolvedValue({
      data: [{ id: "pp-pago", product_name_snapshot: "Produto pago", product_code_snapshot: "P1", status: "EM_EXECUCAO", tasks: [], _count: { tasks: 0 } }],
    }),
    getOperationalTasks: vi.fn().mockResolvedValue({ data: [] }),
    contractProductBundle: vi.fn(),
    linkProductToProject: vi.fn(),
    updateProjectTask: vi.fn(),
    releaseProjectTask: vi.fn(),
    unlinkProductFromProject: unlinkMock,
  },
}));
vi.mock("@/components/project-connections-tab", () => ({ ProjectConnectionsTab: () => null }));
vi.mock("@/components/project-memoria-tab", () => ({ ProjectMemoriaTab: () => null }));
vi.mock("@/components/launch-session-panel", () => ({ LaunchSessionPanel: () => null }));
vi.mock("@/components/task-release-blockers-panel", () => ({ TaskReleaseBlockersPanel: () => null }));
vi.mock("@/components/project-meta-ads-widget", () => ({ ProjectMetaAdsWidget: () => null }));
vi.mock("@/components/task-launch-drawer", () => ({ TaskLaunchDrawer: () => null }));
vi.mock("@/components/catalog2/catalog2-additives-panel", () => ({ Catalog2AdditivesPanel: () => null }));

describe("ProjectViewSlidePanel — desvincular produto recusado", () => {
  it("mostra o motivo do servidor e fecha a confirmação", async () => {
    unlinkMock.mockRejectedValue(new Error("Este produto já foi pago e não pode ser removido do projeto."));
    const { container } = render(
      <MemoryRouter initialEntries={["/admin/projetos"]}>
        <OpenScreensProvider>
          <IallkaContextProvider>
            <ProjectViewSlidePanel
              open
              project={{ id: "proj-A", name: "Projeto A", status: "in-progress" } as any}
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

    fireEvent.mouseDown(await screen.findByRole("tab", { name: "Produtos (1)" }));
    await screen.findByText("Produto pago");
    const trash = container.querySelector('svg[class*="lucide-trash"]')?.closest("button");
    expect(trash).toBeTruthy();
    fireEvent.click(trash!);
    fireEvent.click(await screen.findByRole("button", { name: "Desvincular" }));

    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Não foi possível remover o produto",
          description: "Este produto já foi pago e não pode ser removido do projeto.",
          variant: "destructive",
        }),
      ),
    );
    expect(unlinkMock).toHaveBeenCalledWith("pp-pago");
    await waitFor(() => expect(screen.queryByText("Desvincular produto?")).toBeNull());
  });
});
