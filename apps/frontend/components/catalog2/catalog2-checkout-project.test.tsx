import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { api, navigate, setContext } = vi.hoisted(() => ({
  api: {
    getClientCatalog2Cart: vi.fn(), createClientCatalog2Quote: vi.fn(), getCatalog2EligibleProjects: vi.fn(),
    checkoutCatalog2: vi.fn(), removeClientCatalog2CartItem: vi.fn(), fakeSandboxCheckout: vi.fn(),
  }, navigate: vi.fn(), setContext: vi.fn(),
}));
vi.mock("@/lib/api-client", () => ({ apiClient: api }));
vi.mock("@/hooks/use-navigate", () => ({ useNavigate: () => navigate }));
vi.mock("@/hooks/useAppFrameMetrics", () => ({ useAppFrameMetrics: () => ({ sidebarWidth: 72, headerHeight: 64, footerHeight: 40 }) }));
vi.mock("@/contexts/agencia-context", () => ({ useAgencia: () => ({ profile: { name: "[TESTE QA] Agência" } }) }));
vi.mock("@/contexts/empresa-context", () => ({ useEmpresa: () => ({ profile: null }) }));
vi.mock("@/contexts/iallka-context", () => ({ useIallkaContext: () => ({ setScreenContext: setContext }) }));
vi.mock("@/components/project-create-new-panel", () => ({
  ProjectCreateNewPanel: ({ onCreate, onOpenChange, projectOnly }: any) => <div role="region" aria-label="Novo Projeto" data-project-only={String(projectOnly)}>
    <button onClick={() => onCreate({ id: "project-new" })}>Salvar projeto QA</button>
    <button onClick={() => onOpenChange(false)}>Cancelar projeto QA</button>
  </div>,
}));
import { Catalog2Checkout } from "./catalog2-checkout";

beforeEach(() => {
  vi.resetAllMocks();
  window.history.replaceState({}, "", "/agency/catalogo-produtos/checkout");
  api.getClientCatalog2Cart.mockResolvedValue({ items: [{ id: "cart-qa", product_id: "prod-qa", name: "Serviço QA", quantity: 1, selection: {}, period: "mensal" }], count: 1, needs_revalidation: false });
  api.createClientCatalog2Quote.mockResolvedValue({ id: "quote-qa", commercial_price: 100, commercial_deadline_days: 3 });
  api.getCatalog2EligibleProjects.mockResolvedValue({ data: [] });
  api.checkoutCatalog2.mockResolvedValue({ project: { id: "project-new", project_code: "QA-001" }, project_products: [] });
  api.removeClientCatalog2CartItem.mockResolvedValue({});
  api.fakeSandboxCheckout.mockResolvedValue({ success: true });
});

describe("Checkout: projeto criado sem sair da contratação", () => {
  it("projeto salvo volta selecionado mesmo se atualizar a lista falhar, sem perder comissão ou termos", async () => {
    const user = userEvent.setup();
    render(<Catalog2Checkout portal="agency" />);
    await user.click(await screen.findByRole("button", { name: /Gerar cotação e continuar/ }));
    await screen.findByTestId("checkout-no-project");
    await user.click(screen.getByRole("button", { name: "Cliente final paga por link" }));
    const percent = screen.getByRole("spinbutton", { name: "Comissão da agência (%)" });
    await user.clear(percent); await user.type(percent, "12");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Criar projeto" }));
    api.getCatalog2EligibleProjects.mockRejectedValue(new Error("Lista temporariamente indisponível"));
    await user.click(screen.getByRole("button", { name: "Salvar projeto QA" }));
    await waitFor(() => expect(screen.queryByTestId("checkout-project-panel")).not.toBeInTheDocument());
    expect(screen.getByRole("combobox", { name: "Projeto do pedido" })).toHaveValue("project-new");
    expect(screen.getByRole("checkbox")).toBeChecked();
    expect(screen.getByRole("spinbutton", { name: "Comissão da agência (%)" })).toHaveValue(12);
    expect(api.createClientCatalog2Quote).toHaveBeenCalledOnce();
    expect(api.checkoutCatalog2).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });
  it("comissão por produto inclui todas as unidades, preserva percentuais ao alternar e envia por cotação", async () => {
    const user = userEvent.setup();
    api.getClientCatalog2Cart.mockResolvedValue({ items: [
      { id: "cart-a", product_id: "a", name: "Produto A", quantity: 10, selection: { quantity: 10 } },
      { id: "cart-b", product_id: "b", name: "Produto B", quantity: 2, selection: { quantity: 2 } },
    ], count: 2, needs_revalidation: false });
    api.createClientCatalog2Quote.mockImplementation(async (id: string) => ({ id: `quote-${id}`, commercial_price: id === "a" ? 1000 : 200 }));
    api.getCatalog2EligibleProjects.mockResolvedValue({ data: [{ id: "existing", title: "Projeto existente" }] });
    render(<Catalog2Checkout portal="agency" />);
    await user.click(await screen.findByRole("button", { name: /Gerar cotação e continuar/ }));
    await user.click(await screen.findByRole("button", { name: "Cliente final paga por link" }));
    await user.click(screen.getByRole("button", { name: "Por produto" }));
    const a = screen.getByRole("spinbutton", { name: "Comissão de Produto A (%)" });
    const b = screen.getByRole("spinbutton", { name: "Comissão de Produto B (%)" });
    await user.clear(a); await user.type(a, "10");
    await user.clear(b); await user.type(b, "6");
    expect(within(screen.getByTestId("commission-item-quote-a")).getByText(/10 unidade/)).toBeInTheDocument();
    expect(within(screen.getByTestId("commission-item-quote-b")).getByText(/2 unidade/)).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Pagamento e comissão" })).toHaveTextContent("1.312,00");
    await user.click(screen.getByRole("button", { name: "Sobre o total" }));
    expect(screen.queryByRole("spinbutton", { name: "Comissão de Produto A (%)" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Por produto" }));
    expect(screen.getByRole("spinbutton", { name: "Comissão de Produto A (%)" })).toHaveValue(10);
    await user.clear(screen.getByRole("spinbutton", { name: "Comissão de Produto B (%)" }));
    await user.type(screen.getByRole("spinbutton", { name: "Comissão de Produto B (%)" }), "101");
    await user.click(screen.getByRole("checkbox"));
    expect(screen.getByRole("button", { name: /Confirmar pedido/ })).toBeDisabled();
    await user.clear(screen.getByRole("spinbutton", { name: "Comissão de Produto B (%)" }));
    await user.type(screen.getByRole("spinbutton", { name: "Comissão de Produto B (%)" }), "6");
    await user.click(screen.getByRole("button", { name: /Confirmar pedido/ }));
    await waitFor(() => expect(api.checkoutCatalog2).toHaveBeenCalledOnce());
    expect(api.checkoutCatalog2).toHaveBeenCalledWith(expect.objectContaining({ commission_mode: "per_product", commission_percent: 0, item_commissions: [{ quote_id: "quote-a", percent: 10 }, { quote_id: "quote-b", percent: 6 }] }));
  });
  it("exige projeto e mantém a cotação ao cancelar o painel", async () => {
    const user = userEvent.setup();
    render(<Catalog2Checkout portal="agency" />);
    await user.click(await screen.findByRole("button", { name: /Gerar cotação e continuar/ }));
    await screen.findByTestId("checkout-no-project");
    await user.click(screen.getByRole("checkbox"));
    expect(screen.getByRole("button", { name: /Confirmar pedido/ })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Criar projeto" }));
    expect(screen.getByTestId("checkout-project-panel")).toHaveStyle({ left: "102px", top: "30px" });
    expect(screen.getByTestId("checkout-project-panel-overlay")).toHaveStyle({ left: "72px" });
    expect(screen.getByTestId("checkout-project-panel-host")).toHaveClass("relative", "min-h-0", "flex-1");
    expect(screen.getByRole("region", { name: "Novo Projeto" })).toHaveAttribute("data-project-only", "true");
    await user.click(screen.getByRole("button", { name: "Cancelar projeto QA" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(api.createClientCatalog2Quote).toHaveBeenCalledTimes(1);
    expect(api.createClientCatalog2Quote).toHaveBeenCalledWith("prod-qa", {}, "mensal");
    expect(api.checkoutCatalog2).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("com projeto existente também oferece Criar projeto, sem rótulo divergente", async () => {
    const user = userEvent.setup();
    api.getCatalog2EligibleProjects.mockResolvedValue({ data: [{ id: "existing", title: "Projeto existente", project_code: "P-1" }] });
    render(<Catalog2Checkout portal="agency" />);
    await user.click(await screen.findByRole("button", { name: /Gerar cotação e continuar/ }));
    expect(await screen.findByRole("combobox", { name: "Projeto do pedido" })).toHaveValue("existing");
    expect(screen.queryByRole("button", { name: "Criar outro projeto" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Criar projeto" }));
    expect(screen.getByTestId("checkout-project-panel")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancelar projeto QA" }));
    expect(screen.getByRole("combobox", { name: "Projeto do pedido" })).toHaveValue("existing");
    expect(api.createClientCatalog2Quote).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
  });

  it("seleciona o projeto criado, preserva cotação/termos e confirma pagamento sandbox", async () => {
    const user = userEvent.setup();
    render(<Catalog2Checkout portal="agency" />);
    await user.click(await screen.findByRole("button", { name: /Gerar cotação e continuar/ }));
    await screen.findByTestId("checkout-no-project");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Criar projeto" }));
    api.getCatalog2EligibleProjects.mockResolvedValue({ data: [{ id: "project-new", title: "Projeto QA", project_code: "QA-001" }] });
    await user.click(screen.getByRole("button", { name: "Salvar projeto QA" }));
    await waitFor(() => expect(screen.getByRole("combobox", { name: "Projeto do pedido" })).toHaveValue("project-new"));
    await user.click(screen.getByRole("button", { name: /Confirmar pedido/ }));
    await screen.findByRole("button", { name: "Simular pagamento" });
    expect(api.checkoutCatalog2).toHaveBeenCalledWith(expect.objectContaining({ project_id: "project-new", quote_ids: ["quote-qa"] }));
    expect(navigate).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Simular pagamento" }));
    await screen.findByRole("button", { name: "Ver projeto" });
    expect(api.fakeSandboxCheckout).toHaveBeenCalledWith(expect.objectContaining({ project_id: "project-new", card_last_digits: "4242" }));
  });

  it("cobra do cliente por link com comissão e não oferece pagamento pela agência", async () => {
    const user = userEvent.setup();
    api.getCatalog2EligibleProjects.mockResolvedValue({ data: [{ id: "project-new", title: "Projeto QA", project_code: "QA-001" }] });
    api.checkoutCatalog2.mockResolvedValue({ project: { id: "project-new", project_code: "QA-001" }, project_products: [], payment_link_path: "/pagar/contratacao/qa-link" });
    render(<Catalog2Checkout portal="agency" />);
    await user.click(await screen.findByRole("button", { name: /Gerar cotação e continuar/ }));
    await user.click(await screen.findByRole("button", { name: "Cliente final paga por link" }));
    const percent = screen.getByRole("spinbutton", { name: "Comissão da agência (%)" });
    await user.clear(percent); await user.type(percent, "20");
    expect(screen.getByText("Total que o cliente verá")).toBeInTheDocument();
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /Confirmar pedido/ }));
    await screen.findByRole("textbox", { name: "Link de pagamento do cliente" });
    expect(api.checkoutCatalog2).toHaveBeenCalledWith(expect.objectContaining({ payer: "client", commission_percent: 20, project_id: "project-new" }));
    expect(screen.queryByRole("button", { name: "Simular pagamento" })).not.toBeInTheDocument();
    expect(api.fakeSandboxCheckout).not.toHaveBeenCalled();
  });

  it("impede percentual inválido antes de confirmar", async () => {
    const user = userEvent.setup();
    api.getCatalog2EligibleProjects.mockResolvedValue({ data: [{ id: "project-new", title: "Projeto QA", project_code: "QA-001" }] });
    render(<Catalog2Checkout portal="agency" />);
    await user.click(await screen.findByRole("button", { name: /Gerar cotação e continuar/ }));
    await user.click(await screen.findByRole("button", { name: "Cliente final paga por link" }));
    const percent = screen.getByRole("spinbutton", { name: "Comissão da agência (%)" });
    await user.clear(percent); await user.type(percent, "101");
    await user.click(screen.getByRole("checkbox"));
    expect(screen.getByRole("button", { name: /Confirmar pedido/ })).toBeDisabled();
    expect(api.checkoutCatalog2).not.toHaveBeenCalled();
  });
});
