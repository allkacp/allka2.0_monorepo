import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const pk = (over: Record<string, any> = {}) => ({
  id: "pk1", name: "Pacote Tráfego", is_active: true, block_standalone_sale: false, rules: [],
  items: [{ product: { id: "a", internal_name: "Gestão de Tráfego" } }, { product: { id: "b", internal_name: "Design de Anúncios" } }], ...over,
});
const api = {
  getCatalog2Packages: vi.fn(async () => ({ data: [pk()] })),
  getCatalog2Products: vi.fn(async () => ({ data: [{ id: "a", internal_name: "Gestão de Tráfego", sequence_number: 1 }, { id: "b", internal_name: "Design de Anúncios", sequence_number: 2 }] })),
  getCatalog2DependencyOptions: vi.fn(async () => ({ target_kinds: [], behaviors: [] })),
  createCatalog2Package: vi.fn(async () => ({ id: "pk2" })),
  updateCatalog2Package: vi.fn(async () => ({ ok: true })),
};
vi.mock("@/lib/api-client", () => ({ apiClient: new Proxy({}, { get: (_t, k: string) => (api as any)[k] }) }));
import { SidebarProvider } from "@/contexts/sidebar-context";
import AdminPacotesPage from "./page";

const Page = () => <SidebarProvider><AdminPacotesPage /></SidebarProvider>;

// "Somente em pacote" não é campo do cadastro comum do produto: é decisão do administrador aqui, com aviso claro.
beforeEach(() => { Object.values(api).forEach((f) => f.mockClear()); api.getCatalog2Packages.mockResolvedValue({ data: [pk()] }); });

describe("Pacotes e dependências · impedir a venda separada", () => {
  it("por padrão o pacote mostra que a venda separada é PERMITIDA (produto em pacote continua vendido separadamente)", async () => {
    render(<Page />);
    expect((await screen.findByTestId("package-solo-state")).textContent).toMatch(/Venda separada permitida/);
    expect(screen.getByTestId("package-solo-toggle").textContent).toBe("Impedir venda separada");
  });

  it("impedir a venda separada exige confirmação com aviso claro e só então grava", async () => {
    render(<Page />);
    fireEvent.click(await screen.findByTestId("package-solo-toggle"));
    expect(await screen.findByText(/deixarão de poder ser comprados sozinhos/)).toBeInTheDocument();
    expect(screen.getByText(/contratos já feitos não mudam/)).toBeInTheDocument();
    expect(api.updateCatalog2Package).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Impedir venda separada" }));
    await waitFor(() => expect(api.updateCatalog2Package).toHaveBeenCalledWith("pk1", { block_standalone_sale: true }));
  });

  it("pacote com venda separada impedida mostra o estado e permite voltar atrás", async () => {
    api.getCatalog2Packages.mockResolvedValue({ data: [pk({ block_standalone_sale: true })] });
    render(<Page />);
    expect((await screen.findByTestId("package-solo-state")).textContent).toMatch(/Venda separada IMPEDIDA/);
    fireEvent.click(screen.getByTestId("package-solo-toggle"));
    fireEvent.click(await screen.findByRole("button", { name: "Permitir venda separada" }));
    await waitFor(() => expect(api.updateCatalog2Package).toHaveBeenCalledWith("pk1", { block_standalone_sale: false }));
  });

  it("ao criar um pacote novo a venda separada continua permitida (o campo vai como falso)", async () => {
    api.getCatalog2Packages.mockResolvedValue({ data: [] });
    render(<Page />);
    await screen.findByText("Nenhum pacote ainda.");
    fireEvent.change(screen.getByPlaceholderText("Nome (ex.: Tráfego Pago + Criativos)"), { target: { value: "Novo pacote" } });
    for (const label of [/#1 · Gestão de Tráfego/, /#2 · Design de Anúncios/]) fireEvent.click(screen.getByLabelText(label));
    expect((screen.getByLabelText("Impedir a venda separada dos produtos deste pacote") as HTMLInputElement).checked).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: /Criar pacote/ }));
    await waitFor(() => expect(api.createCatalog2Package).toHaveBeenCalledTimes(1));
    expect((api.createCatalog2Package.mock.calls[0] as any[])[0]).toMatchObject({ name: "Novo pacote", product_ids: ["a", "b"], block_standalone_sale: false });
  });
});
