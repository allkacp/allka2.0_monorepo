import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { OpenScreensProvider } from "@/contexts/open-screens-context";

// Fundação de confirmação dupla (ata 2026-08-22) — fluxo real de exclusão
// de produto no Admin, agora ligado a um botão de verdade (antes,
// handleDeleteProduct existia mas nenhum botão chamava — ver auditoria do
// lote). Cobre só o comportamento do NOVO botão "Excluir": permissão,
// cancelar, duas etapas, conflito de vínculo, atualização da lista.

const { deleteProductSpy, productsState, getCurrentUserMock } = vi.hoisted(() => ({
  deleteProductSpy: vi.fn(),
  productsState: {
    products: [
      { id: "prod-1", name: "Landing Page Institucional", productCode: "PA0001", isActive: true, finalPrice: 1000, tasks: [] },
    ] as any[],
  },
  getCurrentUserMock: vi.fn(),
}));

vi.mock("@/lib/contexts/product-context", () => ({
  useProducts: () => ({
    products: productsState.products,
    loading: false,
    error: null,
    refetch: vi.fn(),
    addProduct: vi.fn(),
    updateProduct: vi.fn(),
    deleteProduct: deleteProductSpy,
  }),
}));

vi.mock("@/lib/contexts/specialty-context", () => ({
  useSpecialties: () => ({ specialties: [] }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    getCurrentUser: getCurrentUserMock,
    getProducts: vi.fn().mockResolvedValue({ data: [] }),
  },
}));

import AdminProdutosPage from "@/app/admin/produtos/page";

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/admin/produtos"]}>
      <SidebarProvider>
        <OpenScreensProvider>
          <AdminProdutosPage />
        </OpenScreensProvider>
      </SidebarProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  productsState.products = [
    { id: "prod-1", name: "Landing Page Institucional", productCode: "PA0001", isActive: true, finalPrice: 1000, tasks: [] },
  ];
});

describe("Admin > Produtos — exclusão de produto (confirmação dupla)", () => {
  it("sem permissão sistema/delete: botão Excluir fica desabilitado", async () => {
    getCurrentUserMock.mockResolvedValue({
      admin_profile: { is_active: true, is_master: false, permissions: [{ module: "financeiro", action: "view" }] },
    });
    renderPage();
    const btn = await screen.findByRole("button", { name: /sem permissão para excluir produtos/i });
    expect(btn).toBeDisabled();
  });

  it("com permissão sistema/delete: botão Excluir fica habilitado e abre a 1ª etapa", async () => {
    getCurrentUserMock.mockResolvedValue({
      admin_profile: { is_active: true, is_master: false, permissions: [{ module: "sistema", action: "delete" }] },
    });
    const user = userEvent.setup();
    renderPage();
    const btn = await screen.findByRole("button", { name: /^excluir produto$/i });
    expect(btn).toBeEnabled();
    await user.click(btn);
    expect(await screen.findByText("Esta ação é permanente e não pode ser desfeita.")).toBeInTheDocument();
    expect(screen.getAllByText("Landing Page Institucional").length).toBeGreaterThan(0);
    expect(deleteProductSpy).not.toHaveBeenCalled();
  });

  it("cancelar mantém o produto (não chama deleteProduct)", async () => {
    getCurrentUserMock.mockResolvedValue({ admin_profile: null }); // sem perfil = grandfather liberado
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: /^excluir produto$/i }));
    await user.click(screen.getByRole("button", { name: /^cancelar$/i }));
    expect(deleteProductSpy).not.toHaveBeenCalled();
    expect(screen.getAllByText("Landing Page Institucional").length).toBeGreaterThan(0);
  });

  it("primeira confirmação ('Continuar') ainda não exclui — só avança de etapa", async () => {
    getCurrentUserMock.mockResolvedValue({ admin_profile: null });
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: /^excluir produto$/i }));
    await user.click(screen.getByRole("button", { name: /continuar para confirmação/i }));
    expect(deleteProductSpy).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /excluir produto definitivamente/i })).toBeInTheDocument();
  });

  it("confirmação final autorizada exclui: chama deleteProduct com o id certo", async () => {
    getCurrentUserMock.mockResolvedValue({ admin_profile: null });
    deleteProductSpy.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: /^excluir produto$/i }));
    await user.click(screen.getByRole("button", { name: /continuar para confirmação/i }));
    await user.click(screen.getByRole("button", { name: /excluir produto definitivamente/i }));
    await waitFor(() => expect(deleteProductSpy).toHaveBeenCalledWith("prod-1"));
    await waitFor(() => expect(deleteProductSpy).toHaveBeenCalledTimes(1));
  });

  it("conflito de vínculo (409) mostra mensagem amigável e mantém o produto", async () => {
    getCurrentUserMock.mockResolvedValue({ admin_profile: null });
    deleteProductSpy.mockRejectedValue(
      new Error("Este produto está vinculado a projetos, pedidos ou pacotes existentes e não pode ser excluído."),
    );
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: /^excluir produto$/i }));
    await user.click(screen.getByRole("button", { name: /continuar para confirmação/i }));
    await user.click(screen.getByRole("button", { name: /excluir produto definitivamente/i }));
    expect(
      await screen.findByText("Este produto está vinculado a projetos, pedidos ou pacotes existentes e não pode ser excluído."),
    ).toBeInTheDocument();
    // Nada foi removido da lista (o mock nunca chega a mexer em productsState.products).
    expect(screen.getAllByText("Landing Page Institucional").length).toBeGreaterThan(0);
  });

  it("lista só é atualizada depois do sucesso — não some da tela antes da confirmação final", async () => {
    getCurrentUserMock.mockResolvedValue({ admin_profile: null });
    let resolveDelete: () => void = () => {};
    deleteProductSpy.mockImplementation(() => new Promise<void>((resolve) => { resolveDelete = resolve; }));
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: /^excluir produto$/i }));
    await user.click(screen.getByRole("button", { name: /continuar para confirmação/i }));
    await user.click(screen.getByRole("button", { name: /excluir produto definitivamente/i }));
    // Ainda "excluindo" — produto continua visível até o backend responder.
    expect(screen.getAllByText("Landing Page Institucional").length).toBeGreaterThan(0);
    resolveDelete();
    await waitFor(() => expect(deleteProductSpy).toHaveBeenCalledTimes(1));
  });
});
