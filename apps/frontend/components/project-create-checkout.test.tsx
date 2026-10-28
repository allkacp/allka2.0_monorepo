import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { OpenScreensProvider } from "@/contexts/open-screens-context";
const { api, metrics } = vi.hoisted(() => {
  const methods: Record<string, ReturnType<typeof vi.fn>> = {};
  return { api: new Proxy(methods, { get(target, key: string) { return target[key] ??= vi.fn().mockResolvedValue({ data: [] }); } }), metrics: { sidebarWidth: 200, headerHeight: 64, footerHeight: 40 } };
});
vi.mock("@/lib/api-client", () => ({ apiClient: api }));
vi.mock("@/hooks/useAppFrameMetrics", () => ({ useAppFrameMetrics: () => metrics }));
vi.mock("@/contexts/account-type-context", () => ({ useAccountType: () => ({ accountType: "agencia" }) }));
vi.mock("@/components/company-create-slide-panel", () => ({ CompanyCreateSlidePanel: () => null }));
vi.mock("@/components/user-create-slide-panel", () => ({ UserCreateSlidePanel: () => null }));
vi.mock("@/components/product-catalog-view", () => ({ ProductCatalogView: () => null }));
vi.mock("@/components/checkout-flow", () => ({ CheckoutFlow: () => null }));
vi.mock("@/components/send-approval-modal", () => ({ SendApprovalModal: () => null }));
import { ProjectCreateNewPanel } from "./project-create-new-panel";
import { FramedPanel } from "./framed-panel";
const initialData = { nome: "Projeto de teste", cliente: "Cliente cadastrado", clientRecordId: "client-1", consultor: "Responsável cadastrado", consultorId: "consultant-1", emailConsultor: "responsavel@example.test", sincronizadoBitrix: true };
beforeEach(() => {
  localStorage.clear(); vi.clearAllMocks(); metrics.sidebarWidth = 200;
  api.createProject.mockResolvedValue({ id: "new-project", title: initialData.nome, status: "draft" });
  api.checkProjectName.mockResolvedValue({ exists: false });
  api.getProjectContactOptions.mockImplementation(async ({ kind }: any) => ({ data: kind === "consultant" ? [{ id: "consultant-1", name: initialData.consultor, email: initialData.emailConsultor }] : [{ id: "client-1", name: initialData.cliente }] }));
});
afterEach(cleanup);
function mount(projectOnly = true, registered = true) {
  const onCreate = vi.fn(), onOpenChange = vi.fn();
  const view = render(<MemoryRouter><SidebarProvider><OpenScreensProvider>
    <FramedPanel open title="Criar projeto" testId="checkout-project-panel" onOpenChange={onOpenChange}>
      <div className="relative flex min-h-0 flex-1 flex-col">
        <ProjectCreateNewPanel open projectOnly={projectOnly} initialData={{ ...initialData, ...(registered ? {} : { consultorId: "", clientRecordId: "" }) }} agencyName="Agência cadastrada" companyName="Agência cadastrada" onCreate={onCreate} onOpenChange={onOpenChange} />
      </div>
    </FramedPanel>
  </OpenScreensProvider></SidebarProvider></MemoryRouter>);
  return { ...view, onCreate, onOpenChange };
}
describe("Formulário REAL de projeto dentro do checkout", () => {
  it("erro real de nome duplicado fica visível no rodapé e mantém o preenchimento", async () => {
    api.createProject.mockRejectedValue(Object.assign(new Error("Já existe um projeto com esse nome"), { status: 409, code: "duplicate_project_name" }));
    const user = userEvent.setup(), { onCreate, onOpenChange } = mount();
    await user.click(screen.getByRole("button", { name: "Salvar projeto" }));
    expect(await screen.findByText(/Altere o nome ou cancele e selecione/)).toBeVisible();
    expect(onCreate).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(screen.getByDisplayValue(initialData.nome)).toBeInTheDocument();
  });
  it("verificação antecipada bloqueia duplicado sem chamar a criação", async () => {
    api.checkProjectName.mockResolvedValue({ duplicate: true });
    const user = userEvent.setup(); mount();
    await screen.findByText("Já existe um projeto com esse nome para esta empresa.");
    await user.click(screen.getByRole("button", { name: "Salvar projeto" }));
    expect(api.createProject).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("O projeto não foi salvo");
    expect(screen.getByRole("alert")).toHaveTextContent("Já existe um projeto com esse nome para esta empresa.");
  });
  it("reúne orçamento e configurações no único bloco Dados do Projeto, visíveis e salvos juntos", async () => {
    const user = userEvent.setup(); mount();
    expect(screen.queryByRole("button", { name: /^2 Orçamento/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Configurações & Descrição/ })).not.toBeInTheDocument();
    const budget = screen.getByRole("textbox", { name: "Orçamento previsto (R$)" });
    const description = screen.getByRole("textbox", { name: "Descrição do Projeto" });
    expect(budget).toBeVisible();
    expect(description).toBeVisible();
    expect(screen.getByText(/Valor que você prevê usar neste projeto/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Sincronizar Bitrix" })).toBeVisible();
    await user.type(budget, "500,00");
    await user.type(description, "Objetivos de teste");
    expect(screen.getByRole("button", { name: "Permite Portfólio" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Permite Portfólio" }));
    await user.click(screen.getByRole("button", { name: /Dados do Projeto/ }));
    expect(screen.queryByRole("textbox", { name: "Orçamento previsto (R$)" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Dados do Projeto/ }));
    expect(screen.getByRole("textbox", { name: "Orçamento previsto (R$)" })).toHaveValue("500,00");
    await user.click(screen.getByRole("button", { name: "Salvar projeto" }));
    await waitFor(() => expect(api.createProject).toHaveBeenCalledOnce());
    expect(api.createProject).toHaveBeenCalledWith(expect.objectContaining({ budget: 500, value: 500, description: "Objetivos de teste", portfolio_permission: false }));
  });
  it("nomes preenchidos sem seleção de cadastro não salvam o projeto", async () => {
    const user = userEvent.setup(); mount(true, false);
    await user.click(screen.getByRole("button", { name: "Salvar projeto" }));
    expect(api.createProject).not.toHaveBeenCalled();
    expect(screen.getByTestId("project-save-validation")).toHaveTextContent("Cadastre e selecione um consultor vinculado à empresa.");
    expect(screen.getByTestId("project-save-validation")).toHaveTextContent("Cadastre e selecione um cliente vinculado à empresa.");
  });
  it("fica no Painel Moldura acima do overlay e fora da sidebar", () => {
    mount();
    const panel = screen.getByTestId("checkout-project-panel"), overlay = screen.getByTestId("checkout-project-panel-overlay");
    expect(panel.parentElement).toBe(document.body);
    expect(panel).toHaveStyle({ left: "230px", top: "30px" });
    expect(panel.className).toContain("!z-[1201]");
    expect(overlay).toHaveStyle({ left: "200px" });
    expect(overlay.className).toContain("z-[1200]");
    expect(screen.getByRole("button", { name: "Salvar projeto" })).toBeInTheDocument();
    expect(screen.getByText(/Projeto ainda não salvo/)).toBeVisible();
    expect(screen.queryByRole("button", { name: "Próximo" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Bandeja de Telas/ })).toBeInTheDocument();
  });
  it("salva rascunho, retorna o ID e não abre outro catálogo nem compra", async () => {
    const user = userEvent.setup(), { onCreate, onOpenChange } = mount();
    await user.click(screen.getByRole("button", { name: "Salvar projeto" }));
    await waitFor(() => expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ id: "new-project" })));
    expect(api.createProject).toHaveBeenCalledOnce();
    expect(api.createProject).toHaveBeenCalledWith(expect.objectContaining({ title: initialData.nome, status: "draft" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(api.linkProductToProject).not.toHaveBeenCalled();
    expect(api.checkoutCatalog2).not.toHaveBeenCalled();
  });
  it("erro ao salvar conserva o formulário aberto e não retorna ID falso", async () => {
    api.createProject.mockRejectedValue(new Error("Falha de teste"));
    const user = userEvent.setup(), { onCreate, onOpenChange } = mount();
    await user.click(screen.getByRole("button", { name: "Salvar projeto" }));
    await waitFor(() => expect(api.createProject).toHaveBeenCalledOnce());
    expect(screen.getByRole("alert")).toHaveTextContent("Falha de teste");
    expect(onCreate).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(screen.getByDisplayValue(initialData.nome)).toBeInTheDocument();
  });
  it("cancelar não cria projeto e mantém o fluxo antigo fora do checkout", async () => {
    const user = userEvent.setup(), { onOpenChange } = mount(false);
    expect(screen.getByRole("button", { name: "Próximo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar Rascunho" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(api.createProject).not.toHaveBeenCalled();
  });
});
