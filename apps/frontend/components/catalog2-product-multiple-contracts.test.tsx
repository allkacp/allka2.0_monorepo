import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { Catalog2ProductDetail } from "./catalog2-product-detail";

const api = vi.hoisted(() => ({
  getClientCatalog2Product: vi.fn(),
  configureClientCatalog2: vi.fn(),
}));
vi.mock("@/lib/api-client", () => ({ apiClient: api }));
const detail = (multiple: boolean) => ({
  id: "p1", slug: "teste", name: "Serviço", description: "Descrição",
  version_id: "v1", version_state: "publicada", is_preview: false,
  variations: [], addons: [], required_info: [], pendencies: [], visibility_reasons: [],
  sale_modes: { one_time: true, recurring: false, multiple_contracts: multiple },
  default_selection: { variation_option_keys: [], addon_keys: [], quantity: 3, delivery_groups: [3] },
  pricing: { currency: "BRL", commercial_price: 100, commercial_deadline_days: 3, commercial_ready: true, notices: [], applied_options: [] },
  can_configure: true, can_contract: true,
});
beforeEach(() => {
  vi.clearAllMocks();
  api.configureClientCatalog2.mockResolvedValue({ pricing: detail(true).pricing, selection_errors: [], can_generate_quote: true, quote_blockers: [] });
});
describe("Quantidade na contratação conforme a matriz", () => {
  it("organiza tarefas sem prometer escolha de profissional no checkout", async () => {
    api.getClientCatalog2Product.mockResolvedValue(detail(true));
    render(<Catalog2ProductDetail productId="p1" onBack={() => {}} dataSource="client" canBuy />);
    fireEvent.click(await screen.findByRole("button", { name: "Tarefas separadas" }));
    expect(screen.getByText(/não escolhe profissionais/)).toBeInTheDocument();
    await waitFor(() => expect(api.configureClientCatalog2).toHaveBeenLastCalledWith("p1", expect.objectContaining({ delivery_groups: [1, 2] }), false, null, undefined));
  });
  it("bloqueia em uma unidade e normaliza uma seleção antiga com quantidade maior", async () => {
    api.getClientCatalog2Product.mockResolvedValue(detail(false));
    render(<Catalog2ProductDetail productId="p1" onBack={() => {}} dataSource="client" canBuy />);
    const quantity = await screen.findByRole("spinbutton", { name: "Quantidade do produto" });
    expect(quantity).toBeDisabled();
    expect(quantity).toHaveValue(1);
    expect(quantity).toHaveAttribute("max", "1");
    await waitFor(() => expect(api.configureClientCatalog2).toHaveBeenLastCalledWith("p1", expect.objectContaining({ quantity: 1, delivery_groups: [1] }), false, null, undefined));
  });
  it("mantém quantidade editável quando múltiplas contratações estão permitidas", async () => {
    api.getClientCatalog2Product.mockResolvedValue(detail(true));
    render(<Catalog2ProductDetail productId="p1" onBack={() => {}} dataSource="client" canBuy />);
    const quantity = await screen.findByRole("spinbutton", { name: "Quantidade do produto" });
    expect(quantity).toBeEnabled();
    expect(quantity).toHaveValue(3);
    expect(quantity).not.toHaveAttribute("max");
  });
});
