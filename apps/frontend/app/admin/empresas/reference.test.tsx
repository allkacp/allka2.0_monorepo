import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { OpenScreensProvider } from "@/contexts/open-screens-context";
const { api, frame } = vi.hoisted(() => {
  const known: Record<string, ReturnType<typeof vi.fn>> = {};
  return { api: new Proxy(known, { get(t, key: string) { return t[key] ??= vi.fn().mockResolvedValue({ data: [], total: 0, methods: [], statements: [], balance: 0 }); } }), frame: { sidebarWidth: 72, headerHeight: 64, footerHeight: 40 } };
});
vi.mock("@/lib/api-client", () => ({ apiClient: api, ApiError: class extends Error {} }));
vi.mock("@/hooks/useAppFrameMetrics", () => ({ useAppFrameMetrics: () => frame }));
vi.mock("@/contexts/platform-users-context", () => ({ usePlatformUsers: () => ({ users: [] }) }));
vi.mock("@/components/ui/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
import Page from "./page";
const company = { id: "c1", sequence_number: 2, name: "Empresa Referência", type: "empresa", email: "empresa@example.test", phone: "11999999999", cnpj: "12345678000190", status: "ativo", address: "São Paulo", created_at: "2026-10-27T12:00:00Z", updated_at: "2026-10-27T12:00:00Z", _count: { users: 1, projects: 0 } };
function mount(path = "/admin/empresas") { return render(<MemoryRouter initialEntries={[path]}><SidebarProvider><OpenScreensProvider><Routes><Route path="/admin/empresas/:empresaId?" element={<Page />} /></Routes></OpenScreensProvider></SidebarProvider></MemoryRouter>); }
beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); frame.sidebarWidth = 72; api.getCompanies.mockResolvedValue({ data: [company], total: 1 }); api.getAgencies.mockResolvedValue({ data: [], total: 0 }); api.getNomades.mockResolvedValue({ data: [], total: 0 }); });
afterEach(cleanup);
describe("Empresas reproduz Referência Clientes", () => {
  it("mantém quatro indicadores reais, reserva 96px e oferece três ações visíveis", async () => {
    const view = mount(); await screen.findByText("002");
    expect(screen.getByTestId("company-stats").children).toHaveLength(4);
    const table = view.container.querySelector("table")!;
    expect(table.className).toContain("companies-reference-table");
    expect(table.style.width).toBe("");
    expect((table.querySelector("col:last-child") as HTMLElement).style.width).toBe("96px");
    const actions = table.querySelector("td.company-reference-actions")!;
    expect(within(actions as HTMLElement).getAllByRole("button")).toHaveLength(3);
    expect(within(actions as HTMLElement).getByRole("button", { name: `Ver empresa ${company.name}` })).toHaveClass("company-reference-action");
  });
  it("ID abre Painel Moldura com contatos, mesmas margens e X funcionando", async () => {
    mount(); fireEvent.click(await screen.findByText("002"));
    const panel = await screen.findByTestId("company-view-panel");
    expect(panel.style.left).toBe("102px"); expect(panel.style.top).toBe("30px");
    const header = within(panel).getByRole("banner");
    expect(header).toHaveTextContent(company.name); expect(header).toHaveTextContent("002");
    expect(within(header).getByRole("link", { name: "WhatsApp da empresa" })).toHaveAttribute("href", "https://wa.me/5511999999999");
    fireEvent.click(within(header).getByRole("button", { name: "Fechar empresa" }));
    await waitFor(() => expect(screen.queryByTestId("company-view-panel")).not.toBeInTheDocument());
  });
  it("lápis abre editor completo em Painel Moldura com salvamento e Bandeja", async () => {
    mount(); fireEvent.click(await screen.findByRole("button", { name: `Editar empresa ${company.name}` }));
    const panel = await screen.findByTestId("company-edit-panel");
    expect(panel.style.left).toBe("102px");
    expect(within(panel).getByRole("button", { name: /Salvar/ })).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: /Bandeja/ })).toBeInTheDocument();
  });
  it("editar dentro da ficha abre Janela Moldura sem desmontar a leitura", async () => {
    const user = userEvent.setup(); mount("/admin/empresas/2");
    const panel = await screen.findByTestId("company-view-panel");
    await user.click(within(panel).getByRole("tab", { name: /Dados/ }));
    await user.click(within(panel).getByRole("button", { name: "Editar dados" }));
    const modal = await screen.findByTestId("company-edit-modal");
    expect(modal.className).toContain("!z-[1251]");
    expect(screen.getByTestId("company-view-panel")).toBeInTheDocument();
    // Editor já tem confirmação de descarte: não a remover ao reproduzir layout.
    expect(within(modal).getByRole("button", { name: "Fechar empresa" })).toBeInTheDocument();
    await user.click(within(modal).getByRole("button", { name: "Fechar empresa" }));
    await user.click(await screen.findByRole("button", { name: "Descartar" }));
    await waitFor(() => expect(screen.queryByTestId("company-edit-modal")).not.toBeInTheDocument());
    expect(screen.getByTestId("company-view-panel")).toBeInTheDocument();
    expect(api.updateCompany).not.toHaveBeenCalled();
  });
  it("sidebar expandida altera posição e largura do painel", async () => {
    frame.sidebarWidth = 300; mount("/admin/empresas/2");
    const panel = await screen.findByTestId("company-view-panel");
    expect(panel.style.left).toBe("330px");
    expect(screen.getByTestId("company-view-panel-overlay").style.left).toBe("300px");
  });
});
