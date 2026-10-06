import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const create = vi.fn(async () => ({ id: 9 }));
vi.mock("@/lib/api-client", () => ({ apiClient: {
  getConnectionTypes: async () => ({ data: [{ id: 1, key: "google_ads", name: "Google Ads", provider: "google", is_active: true, allowed_methods: ["oauth", "user_invite"], permission_levels: [{ key: "read", label: "Leitura" }], fields: [] }] }),
  getConnectionVocabulary: async () => ({ methods: [{ key: "oauth", label: "OAuth" }, { key: "user_invite", label: "Convite" }, { key: "api_key", label: "Chave de API / integração por API" }] }),
  createConnectionType: (...a: unknown[]) => (create as any)(...a), updateConnectionType: vi.fn(), deleteConnectionType: vi.fn(), setVersionConnectionsModule: vi.fn(), saveConnectionRequirement: vi.fn(),
} }));
import { AccessCatalogDialog, slugKey, typeSummary } from "./catalog2-access-catalog-ui";

describe("catálogo de tipos de acesso (admin)", () => {
  it("resumo: como libera e o que o cliente informa", () => {
    expect(typeSummary({ allowed_methods: ["oauth"], permission_levels: [{ label: "Leitura" }], fields: [{ label: "ID da loja", required: true }] }, (k) => k.toUpperCase())).toEqual({ how: "OAUTH", needs: "ID da loja*", levels: "Leitura" });
    expect(typeSummary({ allowed_methods: [], fields: [] }, (k) => k).needs).toMatch(/identificação da conta/);
    expect(slugKey("ID da Loja (Tray)")).toBe("id_da_loja_tray");
  });
  it("lista o catálogo e cria um tipo novo com liberação por API e um campo", async () => {
    render(<AccessCatalogDialog open onOpenChange={() => {}} version={{ id: "v", tasks: [], connection_requirements: [] }} readOnly={false} act={async (fn) => fn()} />);
    expect(await screen.findByText("Google Ads")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("new-access-type"));
    fireEvent.change(await screen.findByLabelText("Nome do acesso"), { target: { value: "Tray Loja" } });
    expect((screen.getByLabelText("Identificador do acesso") as HTMLInputElement).value).toBe("tray_loja");
    fireEvent.click(await screen.findByLabelText("Chave de API / integração por API"));
    fireEvent.click(screen.getByText("ID da conta"));
    fireEvent.click(screen.getByTestId("save-access-type"));
    await waitFor(() => expect(create).toHaveBeenCalled());
    const body = (create.mock.calls[0] as any[])[0];
    expect(body.key).toBe("tray_loja");
    expect(body.allowed_methods).toEqual(["api_key"]);
    expect(body.fields[0]).toMatchObject({ key: "id_da_conta_loja", type: "text", required: true });
  });
});
