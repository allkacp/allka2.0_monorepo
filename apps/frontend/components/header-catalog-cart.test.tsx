import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
const { getCart, navigate } = vi.hoisted(() => ({ getCart: vi.fn(), navigate: vi.fn() }));
vi.mock("@/lib/api-client", () => ({ apiClient: { getClientCatalog2Cart: getCart } }));
vi.mock("@/hooks/use-navigate", () => ({ useNavigate: () => navigate }));
import { HeaderCatalogCart } from "./header-catalog-cart";
import { CATALOG_CART_CHANGED } from "@/lib/catalog-cart-events";
import type { AccountType } from "@/types/user";
beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); localStorage.setItem("allka_user", JSON.stringify({ id: "user-1", agency_id: "agency-1" })); getCart.mockResolvedValue({ count: 0, items: [] }); });
afterEach(cleanup);
function mount(type: AccountType = "agencias", legacyCount = 0, onOpenLegacy = vi.fn()) {
  return render(<MemoryRouter initialEntries={["/partner/dashboard"]}><HeaderCatalogCart accountType={type} legacyCount={legacyCount} onOpenLegacy={onOpenLegacy} /></MemoryRouter>);
}
describe("Cesta global do catálogo", () => {
  it("aparece fora do catálogo para Agência Partner e abre a mesma cesta", async () => {
    getCart.mockResolvedValue({ count: 2, items: [{ id: "one" }, { id: "two" }] });
    const user = userEvent.setup(); mount();
    await user.click(await screen.findByRole("button", { name: "Cesta — 2 itens" }));
    expect(navigate).toHaveBeenCalledWith("/agency/catalogo-produtos?cesta=1");
  });
  it("Company também pode abrir sua cesta", async () => {
    getCart.mockResolvedValue({ count: 1, items: [{}] });
    const user = userEvent.setup(); mount("empresas");
    await user.click(await screen.findByRole("button", { name: "Cesta — 1 item" }));
    expect(navigate).toHaveBeenCalledWith("/company/catalogo-produtos?cesta=1");
  });
  it.each(["admin", "nomades", "lider"] as AccountType[])("não consulta nem mostra cesta para %s", async type => {
    mount(type, 5);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(getCart).not.toHaveBeenCalled();
  });
  it("cesta vazia fica oculta e eventos atualizam sem recarregar", async () => {
    mount(); await waitFor(() => expect(getCart).toHaveBeenCalledOnce());
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    getCart.mockResolvedValue({ count: 3 }); window.dispatchEvent(new Event(CATALOG_CART_CHANGED));
    expect(await screen.findByRole("button", { name: "Cesta — 3 itens" })).toBeInTheDocument();
    getCart.mockResolvedValue({ count: 0 }); window.dispatchEvent(new Event(CATALOG_CART_CHANGED));
    await waitFor(() => expect(screen.queryByRole("button")).not.toBeInTheDocument());
  });
  it("cesta antiga não é apagada e conserva o acionador quando aplicável", async () => {
    const user = userEvent.setup(), openLegacy = vi.fn(); mount("agencias", 1, openLegacy);
    await user.click(screen.getByRole("button", { name: "Cesta — 1 item" }));
    expect(openLegacy).toHaveBeenCalledOnce(); expect(navigate).not.toHaveBeenCalled();
  });
});
