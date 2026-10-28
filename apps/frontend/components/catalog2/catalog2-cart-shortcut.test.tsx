import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { OpenScreensProvider } from "@/contexts/open-screens-context";
vi.mock("@/lib/api-client", () => ({ apiClient: {
  getClientCatalog2Refs: vi.fn().mockResolvedValue({ pillars: [], categories: [], four_f: [] }),
  getClientCatalog2Products: vi.fn().mockResolvedValue({ data: [], total: 0, page: 1 }),
  getClientCatalog2Cart: vi.fn().mockResolvedValue({ items: [], count: 0, needs_revalidation: false }),
} }));
vi.mock("@/components/catalog2-product-detail", () => ({ Catalog2ProductDetail: () => null }));
import { Catalog2Store } from "./catalog2-store";
import { cleanup } from "@testing-library/react";
afterEach(cleanup);
describe("Atalho global abre a mesma cesta do catálogo", () => {
  it("abre a cesta da Agency pelo parâmetro cesta=1 sem criar pedido", async () => {
    render(<MemoryRouter initialEntries={["/agency/catalogo-produtos?cesta=1"]}><SidebarProvider><OpenScreensProvider><Catalog2Store portal="agency" /></OpenScreensProvider></SidebarProvider></MemoryRouter>);
    expect(await screen.findByText("Cesta do catálogo")).toBeInTheDocument();
    expect(screen.getByText("Continuar comprando")).toBeInTheDocument();
  });
});
