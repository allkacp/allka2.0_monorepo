import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { OpenScreensProvider } from "@/contexts/open-screens-context";
import { GlobalHeaderPanelProvider } from "@/contexts/global-header-panel-context";
import { ProductFeedbackWidget, ACCESS_REVALIDATE_INTERVAL_MS } from "@/components/product-feedback-widget";

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

import { apiClient, ApiError } from "@/lib/api-client";

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

// There are two physical trigger buttons now (desktop + mobile, see the
// "renders both a desktop... and a mobile..." test below) — either one
// opens the same panel, so tests that just need "the trigger" grab the
// first match rather than asserting on which one.
async function getTrigger() {
  const triggers = await screen.findAllByLabelText("Ajuda e sugestões");
  return triggers[0];
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
    expect(await getTrigger()).toBeInTheDocument();
  });

  it("renders both a desktop (lg:block) trigger and a mobile (lg:hidden) trigger, with matching breakpoints against the bottom nav", async () => {
    (apiClient.getProductFeedbackAccess as any).mockResolvedValue({ canUse: true });
    renderWidget();
    const triggers = await screen.findAllByLabelText("Ajuda e sugestões");
    // Exactly two physical buttons: one hidden below "lg", one hidden at
    // "lg" and above — never zero, never both hidden at once. This is the
    // regression test for the desktop/mobile visibility gap: the mobile
    // bottom nav is "lg:hidden", so the desktop trigger must turn on at
    // exactly "lg:block", not "xl:block" (that would leave viewports
    // between lg and xl with no visible trigger at all).
    expect(triggers).toHaveLength(2);

    // The desktop trigger's own <button> has no responsive classes — the
    // "hidden lg:block" pair lives on its wrapping <div>; the mobile
    // trigger applies "lg:hidden" directly to the <button> itself.
    const mobileTrigger = triggers.find((el) => el.className.includes("lg:hidden"));
    const desktopTrigger = triggers.find((el) => el !== mobileTrigger);
    expect(desktopTrigger).toBeTruthy();
    expect(mobileTrigger).toBeTruthy();
    expect(desktopTrigger?.parentElement?.className).toMatch(/\blg:block\b/);
    expect(desktopTrigger?.parentElement?.className).not.toMatch(/\bxl:block\b/);
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

    const trigger = await getTrigger();
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
        "clientSubmissionId",
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
    expect(callArg.clientSubmissionId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it("reuses the same clientSubmissionId across a retry of the same submit, but mints a new one for a genuinely new ticket", async () => {
    (apiClient.createProductFeedbackWorkItem as any)
      .mockRejectedValueOnce(new ApiError("Falha de rede", 503))
      .mockResolvedValueOnce({ protocol: "ALK-000001" });
    const user = userEvent.setup();
    renderWidget();

    await user.click(await getTrigger());
    await user.type(screen.getByPlaceholderText("Resuma em poucas palavras"), "Primeiro título");
    await user.type(
      screen.getByPlaceholderText("Descreva com o máximo de detalhe possível"),
      "Primeira descrição enviada pelo usuário.",
    );

    // First attempt fails (simulated network/server error) — the form
    // stays as-is, no resetForm() call, so a retry must reuse the id.
    await user.click(screen.getByRole("button", { name: /enviar/i }));
    await waitFor(() => expect(apiClient.createProductFeedbackWorkItem).toHaveBeenCalledTimes(1));

    // Retry: same button, same form, same clientSubmissionId expected.
    await user.click(screen.getByRole("button", { name: /enviar/i }));
    await waitFor(() => expect(apiClient.createProductFeedbackWorkItem).toHaveBeenCalledTimes(2));

    const firstCallId = (apiClient.createProductFeedbackWorkItem as any).mock.calls[0][0].clientSubmissionId;
    const secondCallId = (apiClient.createProductFeedbackWorkItem as any).mock.calls[1][0].clientSubmissionId;
    expect(secondCallId).toBe(firstCallId);

    // Now start a genuinely new ticket ("Novo chamado") and submit again —
    // this must mint a fresh id, never reusing the previous submission's.
    (apiClient.createProductFeedbackWorkItem as any).mockResolvedValueOnce({ protocol: "ALK-000002" });
    await user.click(screen.getByRole("button", { name: /novo chamado/i }));
    await user.type(screen.getByPlaceholderText("Resuma em poucas palavras"), "Segundo título");
    await user.type(
      screen.getByPlaceholderText("Descreva com o máximo de detalhe possível"),
      "Segunda descrição, um chamado diferente.",
    );
    await user.click(screen.getByRole("button", { name: /enviar/i }));
    await waitFor(() => expect(apiClient.createProductFeedbackWorkItem).toHaveBeenCalledTimes(3));

    const thirdCallId = (apiClient.createProductFeedbackWorkItem as any).mock.calls[2][0].clientSubmissionId;
    expect(thirdCallId).not.toBe(firstCallId);
  });

  it("shows the returned protocol after a successful submit", async () => {
    (apiClient.createProductFeedbackWorkItem as any).mockResolvedValue({ protocol: "ALK-000099" });
    const user = userEvent.setup();
    renderWidget();

    await user.click(await getTrigger());
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
    await user.click(await getTrigger());
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

  it("renders ticket rows on success, with translated public status, title, and type", async () => {
    (apiClient.getProductFeedbackWorkItems as any).mockResolvedValue({
      items: [
        {
          protocol: "ALK-000010",
          type: "IDEA",
          title: "Adicionar exportação em PDF",
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
    expect(screen.getByText("Adicionar exportação em PDF")).toBeInTheDocument();
    expect(screen.getByText(/Tenho uma ideia/)).toBeInTheDocument();
  });
});

describe("ProductFeedbackWidget — access revalidation (item #10 of the review)", () => {
  it("re-checks access when the panel is opened, not only at mount", async () => {
    (apiClient.getProductFeedbackAccess as any).mockResolvedValue({ enabled: true, canUse: true });
    const user = userEvent.setup();
    renderWidget();

    await waitFor(() => expect(apiClient.getProductFeedbackAccess).toHaveBeenCalledTimes(1));
    await user.click(await getTrigger());
    await waitFor(() => expect(apiClient.getProductFeedbackAccess).toHaveBeenCalledTimes(2));
  });

  it("re-checks access when the window regains focus", async () => {
    (apiClient.getProductFeedbackAccess as any).mockResolvedValue({ enabled: true, canUse: true });
    renderWidget();
    await waitFor(() => expect(apiClient.getProductFeedbackAccess).toHaveBeenCalledTimes(1));

    window.dispatchEvent(new Event("focus"));
    await waitFor(() => expect(apiClient.getProductFeedbackAccess).toHaveBeenCalledTimes(2));
  });

  it("re-checks access on a periodic interval, for tabs left open in the foreground", async () => {
    vi.useFakeTimers();
    try {
      (apiClient.getProductFeedbackAccess as any).mockResolvedValue({ enabled: true, canUse: true });
      renderWidget();
      await vi.waitFor(() => expect(apiClient.getProductFeedbackAccess).toHaveBeenCalledTimes(1));

      await vi.advanceTimersByTimeAsync(ACCESS_REVALIDATE_INTERVAL_MS);
      expect(apiClient.getProductFeedbackAccess).toHaveBeenCalledTimes(2);

      await vi.advanceTimersByTimeAsync(ACCESS_REVALIDATE_INTERVAL_MS);
      expect(apiClient.getProductFeedbackAccess).toHaveBeenCalledTimes(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it("hides the trigger and closes the panel — without any new login — once a revalidation reports access was revoked", async () => {
    (apiClient.getProductFeedbackAccess as any).mockResolvedValue({ enabled: true, canUse: true });
    const user = userEvent.setup();
    renderWidget();

    await user.click(await getTrigger());
    expect(await screen.findByPlaceholderText("Resuma em poucas palavras")).toBeInTheDocument();

    // Admin blocks the user in another tab/session while this one stays
    // open — the next revalidation (here: window focus) must reflect it
    // immediately, with no re-login step.
    (apiClient.getProductFeedbackAccess as any).mockResolvedValue({ enabled: true, canUse: false });
    window.dispatchEvent(new Event("focus"));

    await waitFor(() => expect(screen.queryByLabelText("Ajuda e sugestões")).not.toBeInTheDocument());
    expect(screen.queryByPlaceholderText("Resuma em poucas palavras")).not.toBeInTheDocument();
  });

  it("re-checks access after a 403 while submitting a new ticket", async () => {
    (apiClient.getProductFeedbackAccess as any).mockResolvedValue({ enabled: true, canUse: true });
    (apiClient.createProductFeedbackWorkItem as any).mockRejectedValue(new ApiError("Acesso negado", 403));
    const user = userEvent.setup();
    renderWidget();

    await user.click(await getTrigger());
    await user.type(screen.getByPlaceholderText("Resuma em poucas palavras"), "Título");
    await user.type(
      screen.getByPlaceholderText("Descreva com o máximo de detalhe possível"),
      "Descrição qualquer com detalhe suficiente.",
    );
    // 2 = mount + the panel-open revalidation from opening the trigger.
    await waitFor(() => expect(apiClient.getProductFeedbackAccess).toHaveBeenCalledTimes(2));

    await user.click(screen.getByRole("button", { name: /enviar/i }));
    await waitFor(() => expect(apiClient.getProductFeedbackAccess).toHaveBeenCalledTimes(3));
  });

  it("re-checks access after a 403 while loading 'Meus chamados'", async () => {
    (apiClient.getProductFeedbackAccess as any).mockResolvedValue({ enabled: true, canUse: true });
    (apiClient.getProductFeedbackWorkItems as any).mockRejectedValue(new ApiError("Acesso negado", 403));
    const user = userEvent.setup();
    renderWidget();

    await user.click(await getTrigger());
    await waitFor(() => expect(apiClient.getProductFeedbackAccess).toHaveBeenCalledTimes(2));

    await user.click(screen.getByRole("button", { name: /meus chamados/i }));
    await waitFor(() => expect(apiClient.getProductFeedbackAccess).toHaveBeenCalledTimes(3));
  });
});
