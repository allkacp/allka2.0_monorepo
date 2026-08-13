import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { OpenScreensProvider } from "@/contexts/open-screens-context";
import { GlobalHeaderPanelProvider } from "@/contexts/global-header-panel-context";
import { ProductFeedbackWidget } from "@/components/product-feedback-widget";

vi.mock("@/lib/api-client", () => {
  class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  }
  return {
    ApiError,
    apiClient: {
      getProductFeedbackAccess: vi.fn(),
      createProductFeedbackWorkItem: vi.fn(),
      getProductFeedbackWorkItems: vi.fn(),
    },
  };
});

import { apiClient } from "@/lib/api-client";

function Providers({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter initialEntries={["/admin/dashboard"]}>
      <SidebarProvider>
        <OpenScreensProvider>
          <GlobalHeaderPanelProvider>{children}</GlobalHeaderPanelProvider>
        </OpenScreensProvider>
      </SidebarProvider>
    </MemoryRouter>
  );
}

function renderWidget() {
  return render(
    <Providers>
      <ProductFeedbackWidget />
    </Providers>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ProductFeedbackWidget — trigger visibility", () => {
  it("never shows the trigger while the access check is still loading", async () => {
    (apiClient.getProductFeedbackAccess as any).mockReturnValue(new Promise(() => {})); // never resolves
    renderWidget();
    expect(screen.queryByLabelText("Ajuda e sugestões")).not.toBeInTheDocument();
  });

  it("hides the trigger when canUse is false", async () => {
    (apiClient.getProductFeedbackAccess as any).mockResolvedValue({ canUse: false });
    renderWidget();
    await waitFor(() => {
      // The mocked promise resolves — trigger must stay absent.
      expect(apiClient.getProductFeedbackAccess).toHaveBeenCalled();
    });
    expect(screen.queryByLabelText("Ajuda e sugestões")).not.toBeInTheDocument();
  });

  it("hides the trigger when the access check fails", async () => {
    (apiClient.getProductFeedbackAccess as any).mockRejectedValue(new Error("network down"));
    renderWidget();
    await waitFor(() => expect(apiClient.getProductFeedbackAccess).toHaveBeenCalled());
    expect(screen.queryByLabelText("Ajuda e sugestões")).not.toBeInTheDocument();
  });

  it("shows the trigger once canUse resolves true", async () => {
    (apiClient.getProductFeedbackAccess as any).mockResolvedValue({ canUse: true });
    renderWidget();
    expect(await screen.findByLabelText("Ajuda e sugestões")).toBeInTheDocument();
  });
});

describe("ProductFeedbackWidget — submitting a ticket", () => {
  beforeEach(() => {
    (apiClient.getProductFeedbackAccess as any).mockResolvedValue({ canUse: true });
  });

  it("sends only the allowed fields, deriving pathname from window.location itself", async () => {
    (apiClient.createProductFeedbackWorkItem as any).mockResolvedValue({ protocol: "ALK-000042" });
    // The component reads the real browser URL (window.location), not
    // MemoryRouter's internal history — matches on purpose (see
    // sanitizedPathname() in product-feedback-widget.tsx).
    window.history.pushState({}, "", "/admin/dashboard");
    const user = userEvent.setup();
    renderWidget();

    const trigger = await screen.findByLabelText("Ajuda e sugestões");
    await user.click(trigger);

    const titleInput = await screen.findByPlaceholderText("Resuma em poucas palavras");
    await user.type(titleInput, "Botão não responde");
    const descriptionInput = screen.getByPlaceholderText("Descreva com o máximo de detalhe possível");
    await user.type(descriptionInput, "Cliquei em salvar e nada aconteceu.");

    const submitButton = screen.getByRole("button", { name: /enviar/i });
    await user.click(submitButton);

    await waitFor(() => expect(apiClient.createProductFeedbackWorkItem).toHaveBeenCalledTimes(1));
    const callArg = (apiClient.createProductFeedbackWorkItem as any).mock.calls[0][0];

    expect(Object.keys(callArg).sort()).toEqual(
      [
        "type",
        "title",
        "description",
        "pathname",
        "pageTitle",
        "steps",
        "expectedResult",
        "actualResult",
        "impact",
      ].sort(),
    );
    // Never anything identity/cookie/token/env-related — the browser can't
    // even construct such a payload from this form.
    expect(callArg).not.toHaveProperty("identity");
    expect(callArg).not.toHaveProperty("environment");
    expect(callArg).not.toHaveProperty("externalUserId");
    expect(callArg.pathname).toBe("/admin/dashboard");
  });

  it("shows the returned protocol after a successful submit", async () => {
    (apiClient.createProductFeedbackWorkItem as any).mockResolvedValue({ protocol: "ALK-000099" });
    const user = userEvent.setup();
    renderWidget();

    await user.click(await screen.findByLabelText("Ajuda e sugestões"));
    await user.type(screen.getByPlaceholderText("Resuma em poucas palavras"), "Ideia nova");
    await user.type(
      screen.getByPlaceholderText("Descreva com o máximo de detalhe possível"),
      "Seria bom ter um atalho aqui.",
    );
    await user.click(screen.getByRole("button", { name: /enviar/i }));

    expect(await screen.findByText("ALK-000099")).toBeInTheDocument();
  });
});

describe("ProductFeedbackWidget — Meus chamados", () => {
  beforeEach(() => {
    (apiClient.getProductFeedbackAccess as any).mockResolvedValue({ canUse: true });
  });

  async function openList(user: ReturnType<typeof userEvent.setup>) {
    await user.click(await screen.findByLabelText("Ajuda e sugestões"));
    await user.click(screen.getByRole("button", { name: /meus chamados/i }));
  }

  it("shows an empty state when there are no tickets", async () => {
    (apiClient.getProductFeedbackWorkItems as any).mockResolvedValue({ items: [] });
    const user = userEvent.setup();
    renderWidget();
    await openList(user);
    expect(await screen.findByText("Você ainda não enviou nenhum chamado.")).toBeInTheDocument();
  });

  it("shows a friendly error state when the list fails to load", async () => {
    (apiClient.getProductFeedbackWorkItems as any).mockRejectedValue(new Error("Serviço indisponível"));
    const user = userEvent.setup();
    renderWidget();
    await openList(user);
    expect(await screen.findByText("Serviço indisponível")).toBeInTheDocument();
  });

  it("renders ticket rows on success, with translated public status", async () => {
    (apiClient.getProductFeedbackWorkItems as any).mockResolvedValue({
      items: [
        {
          protocol: "ALK-000010",
          status: "IN_PROGRESS",
          updatedAt: new Date().toISOString(),
          solutionSummary: null,
          release: null,
          validated: false,
          publicComments: [],
        },
      ],
    });
    const user = userEvent.setup();
    renderWidget();
    await openList(user);

    expect(await screen.findByText("ALK-000010")).toBeInTheDocument();
    expect(screen.getByText("Em andamento")).toBeInTheDocument();
  });
});
