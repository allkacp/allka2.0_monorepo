import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const create = vi.fn(async () => ({ id: "p9" }));
const open = vi.fn(async () => ({ session: { id: "s1", mode: "use", remaining_seconds: 600 }, url: "/api/secure-browser/demo/s1?t=x" }));
vi.mock("@/lib/api-client", () => ({ apiClient: {
  getSecureBrowserProfiles: async () => ({ data: [
    { id: "p1", label: "Instagram da Loja", start_url: "https://instagram.com", status: "active", access: "owner", has_saved_session: false, grant: null },
    { id: "p2", label: "Meta da Cliente", start_url: "https://business.facebook.com", status: "active", access: "grant", has_saved_session: true, grant: { id: "g", valid_until: "2026-12-01T12:00:00Z" } },
  ] }),
  getSecureBrowserConsent: async () => ({ version: "v1", text: "Autorizo a Allka a guardar a sessão." }),
  createSecureBrowserProfile: (...a: unknown[]) => (create as any)(...a), openSecureBrowserSession: (...a: unknown[]) => (open as any)(...a),
  heartbeatSecureBrowserSession: async () => ({ remaining_seconds: 590, status: "active" }), endSecureBrowserSession: vi.fn(async () => ({})),
  getSecureBrowserGrants: async () => ({ data: [] }), getSecureBrowserProfileSessions: async () => ({ data: [] }), getSecureBrowserEvents: async () => ({ data: [] }), getSecureBrowserGrantable: async () => ({ data: [] }),
} }));
import { SecureBrowserHub, fmtRemaining } from "./secure-browser-hub";

describe("Navegador seguro (tela)", () => {
  it("formata o tempo restante", () => { expect(fmtRemaining(605)).toBe("10:05"); expect(fmtRemaining(59)).toBe("0:59"); });

  it("exige o aceite para guardar uma conta e separa 'minhas contas' dos acessos recebidos", async () => {
    render(<SecureBrowserHub />);
    expect(await screen.findByText("Acessos que você recebeu")).toBeInTheDocument();
    expect(screen.getByText("Meta da Cliente")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("new-sb-profile"));
    fireEvent.change(screen.getByLabelText("Nome da conta"), { target: { value: "Loja X" } });
    expect((screen.getByTestId("save-sb-profile") as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Endereço de entrada"), { target: { value: "https://instagram.com" } });
    fireEvent.click(screen.getByLabelText("Aceito"));
    fireEvent.click(screen.getByTestId("save-sb-profile"));
    await waitFor(() => expect(create).toHaveBeenCalled());
    expect((create.mock.calls[0] as any[])[0]).toMatchObject({ label: "Loja X", consent: true });
  });

  it("abre a sessão e mostra o contador regressivo em um quadro", async () => {
    render(<SecureBrowserHub />);
    fireEvent.click(await screen.findByTestId("open-p2"));
    expect(await screen.findByTestId("session-viewer")).toBeInTheDocument();
    expect(screen.getByTestId("countdown").textContent).toMatch(/10:00|9:5\d/);
    expect(document.querySelector("iframe")?.getAttribute("src")).toContain("/api/secure-browser/demo/s1");
  });
});
