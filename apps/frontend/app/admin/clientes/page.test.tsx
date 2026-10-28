import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { OpenScreensProvider, useOpenScreens } from "@/contexts/open-screens-context";
const { api, frame } = vi.hoisted(() => ({ api: { getClientRecords: vi.fn(), updateClientRecord: vi.fn(), updateClientRecordLink: vi.fn() }, frame: { sidebarWidth: 72, headerHeight: 64, footerHeight: 40 } }));
vi.mock("@/lib/api-client", () => ({ apiClient: api }));
vi.mock("@/hooks/useAppFrameMetrics", () => ({ useAppFrameMetrics: () => frame }));
vi.mock("@/components/ui/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
import Page from "./page";
const client = {
  id: "client-internal", sequence_number: 1, name: "VG Lab Studio Pro", type: "pf", status: "active",
  created_at: "2026-10-27T12:00:00Z", updated_at: "2026-10-27T12:00:00Z", links: [],
  email: "test@example.test", document: "123456", phone: "11999999999", website: "https://example.test", segment: "Marketing",
};
function TrayProbe() { const { pinned } = useOpenScreens(); return <output data-testid="tray-state">{JSON.stringify(pinned)}</output>; }
function mount(path = "/admin/clientes") {
  return render(<MemoryRouter initialEntries={[path]}><SidebarProvider><OpenScreensProvider><TrayProbe /><Routes><Route path="/admin/clientes/:clientId?" element={<Page />} /></Routes></OpenScreensProvider></SidebarProvider></MemoryRouter>);
}
beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); frame.sidebarWidth = 72; api.getClientRecords.mockResolvedValue({ data: [client], total: 1 }); api.updateClientRecord.mockResolvedValue(client); api.updateClientRecordLink.mockResolvedValue(client); });
afterEach(cleanup);
describe("Clientes — tabela adaptável e Painel Moldura", () => {
  it("reserva espaço das ações, permite encolher colunas e mantém os cinco indicadores", async () => {
    const view = mount();
    await screen.findByText("001");
    const stats = screen.getByTestId("client-stats");
    expect(stats.children).toHaveLength(5);
    expect(stats.className).not.toContain("grid-cols-2");
    const table = view.container.querySelector("table")!;
    expect(table.className).not.toContain("min-w-");
    const cols = table.querySelectorAll("colgroup col");
    expect(cols).toHaveLength(9);
    expect((cols[8] as HTMLElement).style.width).toBe("96px");
    for (const th of table.querySelectorAll("thead th:not(.hidden)")) expect((th as HTMLElement).style.minWidth).toBe("");
    expect(within(table).getByText("Ações", { selector: "th.client-actions" })).toBeInTheDocument();
  });
  it.each(["001", "VG Lab Studio Pro"])("clicar em %s abre o Painel Moldura com X e fundo ATRÁS", async label => {
    mount();
    fireEvent.click(await screen.findByText(label));
    const modal = await screen.findByTestId("client-details-window");
    const overlay = screen.getByTestId("client-details-window-overlay");
    expect(modal.className).toContain("!z-[1201]");
    expect(overlay.className).toContain("z-[1200]");
    expect(overlay.className).toContain("bg-slate-950/60");
    expect(overlay.style.left).toBe("72px");
    expect(modal.style.left).toBe("102px");
    expect(modal.style.top).toBe("30px");
    // Sem segundo overlay Radix cobrindo a janela.
    expect(document.querySelectorAll('[data-slot="dialog-overlay"]')).toHaveLength(0);
    expect(within(modal).getByRole("button", { name: "Editar dados" })).toBeInTheDocument();
    fireEvent.click(within(modal).getByRole("button", { name: "Fechar detalhes do cliente" }));
    await waitFor(() => expect(screen.queryByTestId("client-details-window")).not.toBeInTheDocument());
  });
  it("link direto abre a mesma janela e acompanha a largura útil com a sidebar expandida", async () => {
    frame.sidebarWidth = 300;
    mount("/admin/clientes/1");
    const modal = await screen.findByTestId("client-details-window");
    expect(modal.style.width).toContain("300px");
    expect(screen.getByTestId("client-details-window-overlay").style.left).toBe("300px");
    expect(modal.style.left).toBe("330px");
  });
  it("Editar dados tem degradê e abre Janela Moldura SOBRE os detalhes, mantendo pin, X e rodapé", async () => {
    mount("/admin/clientes/1");
    const detail = await screen.findByTestId("client-details-window");
    const edit = within(detail).getByRole("button", { name: "Editar dados" });
    expect(edit.getAttribute("style")).toContain("var(--app-brand-gradient)");
    fireEvent.click(edit);
    const form = await screen.findByTestId("client-form-panel");
    expect(form.className).toContain("!z-[1251]");
    expect(form.style.top).toBe("50%");
    expect(screen.getByTestId("client-details-window")).toBeInTheDocument();
    expect(screen.getByTestId("client-form-panel-overlay").className).toContain("z-[1250]");
    expect(within(form).getByDisplayValue(client.name)).toBeInTheDocument();
    expect(within(form).getByRole("button", { name: "Salvar alterações" })).toBeInTheDocument();
    expect(within(form).getByRole("button", { name: /Bandeja/ })).toBeInTheDocument();
    fireEvent.click(within(form).getByRole("button", { name: "Fechar cadastro do cliente" }));
    await waitFor(() => expect(screen.queryByTestId("client-form-panel")).not.toBeInTheDocument());
    expect(screen.getByTestId("client-details-window")).toBeInTheDocument();
  });
  it("cabeçalho mostra ID/nome/status e links diretos sem endereço; inativo também aparece", async () => {
    api.getClientRecords.mockResolvedValue({ data: [{ ...client, status: "inactive", address: "Rua de teste" }], total: 1 });
    mount("/admin/clientes/1");
    const detail = await screen.findByTestId("client-details-window");
    const header = within(detail).getByRole("banner");
    expect(header).toHaveTextContent("001"); expect(header).toHaveTextContent(client.name);
    expect(header).toHaveTextContent("Inativo"); expect(header).not.toHaveTextContent("Rua de teste");
    expect(within(header).getByRole("link", { name: "WhatsApp do cliente" })).toHaveAttribute("href", "https://wa.me/5511999999999");
    expect(within(header).getByRole("link", { name: "E-mail do cliente" })).toHaveAttribute("href", "mailto:test@example.test");
  });
  it("cancelar edição interna preserva o painel e não grava alterações", async () => {
    mount("/admin/clientes/1");
    const detail = await screen.findByTestId("client-details-window");
    fireEvent.click(within(detail).getByRole("button", { name: "Editar dados" }));
    const form = await screen.findByTestId("client-form-panel");
    fireEvent.change(within(form).getByDisplayValue(client.name), { target: { value: "Não salvar" } });
    fireEvent.click(within(form).getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(screen.queryByTestId("client-form-panel")).not.toBeInTheDocument());
    expect(within(screen.getByTestId("client-details-window")).getByRole("banner")).toHaveTextContent(client.name);
    expect(api.updateClientRecord).not.toHaveBeenCalled();
  });
  it("editar pela ação da tabela mantém o salvamento e a chave de retomada na Bandeja", async () => {
    mount();
    fireEvent.click(await screen.findByRole("button", { name: `Editar cliente ${client.name}` }));
    const form = await screen.findByTestId("client-form-panel");
    fireEvent.click(within(form).getByRole("button", { name: "Adicionar à Bandeja de Telas" }));
    expect(screen.getByTestId("tray-state")).toHaveTextContent("edit:client-internal");
    fireEvent.change(within(form).getByDisplayValue(client.name), { target: { value: "Nome atualizado" } });
    fireEvent.click(within(form).getByRole("button", { name: "Salvar alterações" }));
    await waitFor(() => expect(api.updateClientRecord).toHaveBeenCalledWith(client.id, expect.objectContaining({ name: "Nome atualizado" })));
    expect(api.updateClientRecordLink).toHaveBeenCalledWith(client.id, {});
    await waitFor(() => expect(screen.queryByTestId("client-form-panel")).not.toBeInTheDocument());
  });
});
