import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup, within } from "@testing-library/react";
const writes = vi.hoisted(() => vi.fn(async () => ({})));
const generateAi = vi.hoisted(() => vi.fn());

const version = {
  id: "v1", state: "rascunho", version_number: 1, title: "Produto", summary: "", full_description: "Texto", change_summary: "",
  tasks: [], variations: [], addons: [], conditions: [], included_items: [], excluded_items: [], updated_at: "2026-10-15T10:00:00Z", is_published_current: false,
};
const product: any = { id: "p1", internal_name: "Produto", status: "em_preparacao", published_version_id: null, versions: [version], pillar: null, category: null, four_f: [], header: {}, task_structure: "multiple" };

vi.mock("@/lib/api-client", () => {
  const handler: ProxyHandler<object> = {
    get: (_t, name: string) => {
      if (name.startsWith("update")) return writes;
      if (name === "draftCatalog2ProductWithAI") return generateAi;
      if (name === "getCatalog2ProductReadiness") return async () => ({ items: { conteudo: { level: "pronto", note: "Textos preenchidos" }, tarefas: { level: "pronto", note: "Tarefa configurada" }, validacao: { level: "bloqueio", note: "Revisar publicação" } }, blockers: ["Revisar publicação"], pendings: [] });
      if (name === "getCatalog2Product") return async () => JSON.parse(JSON.stringify(product));
      if (name === "newCatalog2Version") return async () => {
        product.versions = [...product.versions, { ...product.versions[0], id: "v2", state: "rascunho", version_number: 2, is_published_current: false, updated_at: "2026-10-15T11:00:00Z" }];
        return { version_id: "v2", version_number: 2 };
      };
      return async () => ({ data: [], items: [], versions: [] });
    },
  };
  return { apiClient: new Proxy({}, handler) };
});
vi.mock("@/contexts/iallka-context", () => ({ useIallkaContext: () => ({ setScreenContext: () => {} }) }));
vi.mock("@/contexts/open-screens-context", () => ({ usePinEntry: () => ({ pinned: false, toggle: () => {} }) }));
vi.mock("@/hooks/useAppFrameMetrics", () => ({ useAppFrameMetrics: () => ({ top: 0, left: 0, width: 1000, height: 800 }) }));
vi.mock("@/lib/use-work-calendar", () => ({ useWorkCalendar: () => ({}), fmtBusinessMinutes: () => "", businessDaysOf: () => 0 }));

import { ProductEditor } from "./product-editor";

describe("digitar na descrição", () => {
  beforeEach(() => { window.sessionStorage.clear(); window.localStorage.clear(); cleanup(); writes.mockClear(); product.versions = [JSON.parse(JSON.stringify(version))]; product.published_version_id = null; });
  it("produto sem assinatura não recebe status Mensal na conferência", async () => {
    render(<ProductEditor productId="p1" layout="test" onBack={() => {}} />);
    fireEvent.click(await screen.findByRole("button", { name: /Conferência, preço e publicação/ }));
    const card = await waitFor(() => {
      const node = document.getElementById("catalog2-periods-card");
      expect(node).not.toBeNull();
      return node!;
    });
    expect(card).toHaveTextContent("Sem assinatura");
    expect(within(card).queryByText("Mensal", { exact: true })).toBeNull();
  });
  it("novo fluxo abre os mesmos dados sem aviso de teste e preserva o layout anterior", async () => {
    const first = render(<ProductEditor productId="p1" layout="test" onBack={() => {}} />);
    expect(await screen.findByLabelText("Título comercial")).toHaveValue("Produto");
    expect(screen.queryByTestId("product-test-notice")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Título comercial")).toBeDisabled();
    expect(screen.getByLabelText("Descrição")).toHaveValue("Texto");
    expect(screen.getByText("Classificação do produto")).toBeVisible();
    expect(screen.getAllByTestId("commercial-accordion").every(node => node.hasAttribute("open"))).toBe(true);
    expect(writes).not.toHaveBeenCalled();
    first.unmount(); render(<ProductEditor productId="p1" onBack={() => {}} />);
    await screen.findByText("Editar");
    expect(screen.queryByTestId("product-test-notice")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Título comercial")).not.toBeInTheDocument();
    expect(writes).not.toHaveBeenCalled();
  });
  it("fluxo teste tem três passos, apresentação junto do produto e preço no fechamento", async () => {
    render(<ProductEditor productId="p1" layout="test" onBack={() => {}} />);
    const title = await screen.findByLabelText("Título comercial");
    expect(title).toBeVisible();
    expect(screen.getByTestId("modalities-card")).toBeVisible();
    expect(screen.queryByTestId("class-summary")).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("ai-free-changes").closest('[role="tabpanel"]')).toHaveAttribute("data-state", "inactive"));
    expect(screen.getByTestId("modalities-card").compareDocumentPosition(screen.getByText("Classificação do produto")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId("price-type-card").closest('[role="tabpanel"]')).toHaveAttribute("data-state", "inactive"));
    await waitFor(() => expect(screen.getByLabelText("Descrição").closest('[role="tabpanel"]')).toHaveAttribute("data-state", "active"));
    const nav = screen.getByRole("navigation", { name: "Passos do produto" });
    expect(within(nav).getAllByRole("button")).toHaveLength(3);
    expect(nav).toHaveStyle({ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" });
    expect(within(nav).queryByRole("button", { name: /Questionário e apresentação|Variações e adicionais/ })).not.toBeInTheDocument();
    fireEvent.click(within(nav).getByRole("button", { name: /Configurações da tarefa e etapas/ }));
    await waitFor(() => expect(title.closest('[role="tabpanel"]')).toHaveAttribute("data-state", "inactive"));
    fireEvent.click(within(nav).getByRole("button", { name: /Conferência, preço e publicação/ }));
    await waitFor(() => expect(screen.getByTestId("price-type-card").closest('[role="tabpanel"]')).toHaveAttribute("data-state", "active"));
    expect(screen.getByTestId("ai-free-changes").closest('[role="tabpanel"]')).toHaveAttribute("data-state", "active");
    expect(screen.getByTestId("modalities-card").closest('[role="tabpanel"]')).toHaveAttribute("data-state", "inactive");
    expect(writes).not.toHaveBeenCalled();
  });
  it("tarefa recebe cadastros reais de opções e questionário sem duplicar ou gravar ao navegar", async () => {
    product.versions[0].tasks = [{ id: "t1", key: "t1", name: "Tarefa existente", execution_mode: "humano", stage_execution: "stage", steps: [], deliverables: [], questionnaire: null, executor_continuity: "not_allowed" }];
    render(<ProductEditor productId="p1" layout="test" onBack={() => {}} />);
    const nav = await screen.findByRole("navigation", { name: "Passos do produto" });
    fireEvent.click(within(nav).getByRole("button", { name: /Configurações da tarefa e etapas/ }));
    fireEvent.click(await screen.findByTestId("task-summary-open"));
    const task = await screen.findByTestId("test-task-editor");
    fireEvent.click(within(task).getByRole("tab", { name: "Variações" }));
    await waitFor(() => expect(task.querySelector("#sec-var")).toBeVisible());
    expect(document.querySelectorAll("#sec-var")).toHaveLength(1);
    fireEvent.click(within(task).getByRole("tab", { name: "Adicionais" }));
    await waitFor(() => expect(task.querySelector("#sec-add")).toBeVisible());
    fireEvent.click(within(task).getByRole("tab", { name: "Prazos e condições" }));
    await waitFor(() => expect(task.querySelector("#sec-conditions")).toBeVisible());
    fireEvent.click(within(task).getByRole("tab", { name: "Questionário" }));
    await waitFor(() => expect(within(task).getByRole("tabpanel")).toHaveTextContent("Questionário · Tarefa existente"));
    expect(screen.queryByTestId("task-panel")).not.toBeInTheDocument();
    fireEvent.click(within(task).getByRole("button", { name: "Fechar tarefa" }));
    fireEvent.click(screen.getByTestId("task-summary-open"));
    await waitFor(() => expect(screen.getByRole("tab", { name: "Questionário" })).toHaveAttribute("aria-selected", "true"));
    fireEvent.click(screen.getByRole("button", { name: "Fechar tarefa" }));
    fireEvent(window, new CustomEvent("catalog2:reveal", { detail: { ids: ["sec-var"] } }));
    await waitFor(() => expect(screen.getByRole("tab", { name: "Variações" })).toHaveAttribute("aria-selected", "true"));
    expect(writes).not.toHaveBeenCalled();
  });
  it("cabeçalho teste reúne contadores, visualização e IA por ícones sem duplicar no formulário", async () => {
    generateAi.mockReset();
    render(<ProductEditor productId="p1" layout="test" openInEditMode onBack={() => {}} />);
    await waitFor(() => expect(screen.getByLabelText("Título comercial")).toBeEnabled());
    const header = screen.getByTestId("editor-header-wrap");
    const readiness = within(header).getByRole("button", { name: "Ver preenchimento do produto" });
    await waitFor(() => expect(readiness).toHaveTextContent("2/3"));
    expect(readiness).toHaveTextContent("1");
    expect(readiness).not.toHaveTextContent("Preenchimento");
    const preview = within(header).getByRole("button", { name: /Visualizar como o cliente vê/ });
    expect(preview).toHaveTextContent("");
    expect(screen.queryByTestId("client-view-label")).not.toBeInTheDocument();
    const ai = await within(header).findByRole("button", { name: "Preencher produto com IA" });
    expect(ai).toHaveTextContent("");
    expect(preview.compareDocumentPosition(ai) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getAllByTestId("open-ai-chat")).toHaveLength(1);
    expect(document.querySelector('#catalog2-general [data-testid="open-ai-chat"]')).toBeNull();
    fireEvent.focus(readiness);
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Preenchimento — clique para ver mais");
    fireEvent.blur(readiness);
    fireEvent.click(readiness);
    expect(await screen.findByTestId("product-readiness-dialog")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Fechar preenchimento" }));
    const nav = screen.getByRole("navigation", { name: "Passos do produto" });
    fireEvent.click(within(nav).getByRole("button", { name: /Configurações da tarefa e etapas/ }));
    await waitFor(() => expect(ai).toBeVisible());
    fireEvent.click(ai);
    expect(await screen.findByTestId("product-ai-chat")).toBeVisible();
    expect(writes).not.toHaveBeenCalled();
    expect(generateAi).not.toHaveBeenCalled();
  });
  it("erro ao gravar impede avançar e preserva o preenchimento", async () => {
    render(<ProductEditor productId="p1" layout="test" openInEditMode onBack={() => {}} />);
    const input = await screen.findByLabelText("Título comercial");
    await waitFor(() => expect(input).toBeEnabled());
    fireEvent.change(input, { target: { value: "Nome preservado" } });
    writes.mockRejectedValueOnce(new Error("Falha de teste ao salvar"));
    fireEvent.click(screen.getByRole("navigation", { name: "Passos do produto" }).querySelectorAll("button")[1]);
    await waitFor(() => expect(writes).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByRole("navigation", { name: "Passos do produto" }).querySelector('[aria-current="step"]')).toHaveTextContent("Produto"));
    expect(input).toHaveValue("Nome preservado");
    expect(input.closest('[role="tabpanel"]')).toHaveAttribute("data-state", "active");
  });
  it("IA lê os textos ainda não salvos, preserva campos preenchidos e só grava ao salvar o rascunho", async () => {
    generateAi.mockReset().mockResolvedValueOnce({ reply: "Revise a proposta.", draft: { title: "Título da IA", summary: "Resumo da IA", full_description: "Descrição da IA", target_audience: "Público proposto", scope: "Escopo da IA", included_items: ["Item proposto"], excluded_items: [], client_requirements: [], deliverables_summary: [], suggested_tasks: [] } });
    const view = () => <ProductEditor productId="p1" layout="test" openInEditMode onBack={() => {}} />;
    const first = render(view());
    const title = await screen.findByLabelText("Título comercial");
    await waitFor(() => expect(title).toBeEnabled());
    fireEvent.change(title, { target: { value: "Nome digitado" } });
    fireEvent.change(screen.getByLabelText("Descrição curta"), { target: { value: "Resumo digitado" } });
    fireEvent.change(screen.getByLabelText("Escopo"), { target: { value: "Escopo digitado" } });
    fireEvent.click(screen.getByTestId("open-ai-chat"));
    const dialog = await screen.findByTestId("product-ai-chat");
    expect(within(within(dialog).getByTestId("ai-filled-fields")).getByText("Título comercial")).toBeInTheDocument();
    expect(within(within(dialog).getByTestId("ai-filled-fields")).getByText("Descrição curta")).toBeInTheDocument();
    expect(writes).not.toHaveBeenCalled();
    expect(generateAi).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByTestId("ai-generate-from-inputs"));
    await within(dialog).findByText("Revise a proposta.");
    expect(generateAi.mock.calls[0][2]).toMatchObject({ title: "Nome digitado", summary: "Resumo digitado" });
    fireEvent.click(within(dialog).getByTestId("apply-draft"));
    fireEvent.click(within(dialog).getByTestId("confirm-ai-apply"));
    await within(dialog).findByText(/Sugestões aplicadas ao formulário/);
    expect(writes).not.toHaveBeenCalled();
    expect(title).toHaveValue("Nome digitado");
    expect(screen.getByLabelText("Descrição curta")).toHaveValue("Resumo digitado");
    expect(screen.getByLabelText("Itens incluídos 1")).toHaveValue("Item proposto");
    expect(screen.getByLabelText("Escopo")).toHaveValue("Escopo digitado");
    expect(screen.getByLabelText("Público-alvo")).toHaveValue("Público proposto");
    first.unmount(); render(view());
    expect(await screen.findByLabelText("Itens incluídos 1")).toHaveValue("Item proposto");
    const save = await screen.findByRole("button", { name: /^Salvar rascunho$/ });
    await waitFor(() => expect(save).toBeEnabled());
    fireEvent.click(save);
    await waitFor(() => expect(writes).toHaveBeenCalledWith("v1", expect.objectContaining({ included_items: ["Item proposto"] })));
  });
  it("os dois layouts salvam pelo mesmo ID/rota de versão; o teste recupera campos após F5", async () => {
    const view = () => <ProductEditor productId="p1" layout="test" openInEditMode onBack={() => {}} />;
    const first = render(view());
    const title = await screen.findByLabelText("Título comercial");
    await waitFor(() => expect(title).toBeEnabled());
    fireEvent.change(title, { target: { value: "Nome revisto" } });
    first.unmount(); const second = render(view());
    expect(await screen.findByLabelText("Título comercial")).toHaveValue("Nome revisto");
    expect(writes).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole("button", { name: /^Salvar rascunho$/ }));
    await waitFor(() => expect(writes).toHaveBeenCalledWith("v1", expect.objectContaining({ title: "Nome revisto" })));
    second.unmount(); writes.mockClear();
    render(<ProductEditor productId="p1" openInEditMode onBack={() => {}} />);
    await screen.findByText("Dados principais");
    if (!screen.queryByLabelText("Título comercial")) fireEvent.click(screen.getByText("Dados principais"));
    const classicTitle = await screen.findByLabelText("Título comercial");
    // Editing opens asynchronously; a real user cannot type into a disabled field.
    await waitFor(() => expect(classicTitle).toBeEnabled(), { timeout: 5000 });
    fireEvent.change(classicTitle, { target: { value: "Nome revisto" } });
    fireEvent.click(await screen.findByRole("button", { name: /^Salvar rascunho$/ }));
    await waitFor(() => expect(writes).toHaveBeenCalledWith("v1", expect.objectContaining({ title: "Nome revisto" })));
  });
  it("F5 retoma a descrição não salva e o modo de edição sem criar versão ou gravar", async () => {
    const view = () => <ProductEditor productId="p1" onBack={() => {}} />;
    const first = render(view());
    fireEvent.click(await screen.findByText("Editar"));
    if (!screen.queryByLabelText("Descrição")) fireEvent.click(await screen.findByText("Descrição completa"));
    const input = await screen.findByLabelText("Descrição");
    await waitFor(() => expect(input).toBeEnabled());
    fireEvent.change(input, { target: { value: "Descrição ainda sem salvar" } });
    first.unmount(); render(view());
    const restored = await screen.findByLabelText("Descrição");
    await waitFor(() => expect(restored).toBeEnabled());
    expect(restored).toHaveValue("Descrição ainda sem salvar");
    expect(await screen.findByRole("button", { name: /^Salvar rascunho$/ })).toBeEnabled();
    expect(product.versions).toHaveLength(1);
    expect(writes).not.toHaveBeenCalled();
  });
  it("o primeiro caractere digitado aparece (sem precisar digitar duas vezes)", async () => {
    render(<ProductEditor productId="p1" onBack={() => {}} />);
    await waitFor(() => expect(screen.getByText("Editar")).toBeTruthy(), { timeout: 5000 });
    fireEvent.click(screen.getByText("Editar"));
    if (!screen.queryByLabelText("Descrição")) fireEvent.click(await screen.findByText("Descrição completa"));
    const box = (await screen.findByLabelText("Descrição")) as HTMLTextAreaElement;
    await waitFor(() => expect(box.disabled).toBe(false));
    box.focus();
    fireEvent.change(box, { target: { value: "Texto." } });
    const after1 = screen.getByLabelText("Descrição") as HTMLTextAreaElement;
    expect(after1.value).toBe("Texto.");
    expect(document.activeElement).toBe(after1);
    fireEvent.change(after1, { target: { value: "Texto.!" } });
    expect((screen.getByLabelText("Descrição") as HTMLTextAreaElement).value).toBe("Texto.!");
  });

  it("a partir da versão publicada: Editar cria o rascunho e o primeiro caractere também aparece", async () => {
    product.versions = [{ ...version, state: "publicada", is_published_current: true }];
    product.published_version_id = "v1";
    render(<ProductEditor productId="p1" onBack={() => {}} />);
    await waitFor(() => expect(screen.getByText("Editar")).toBeTruthy(), { timeout: 5000 });
    fireEvent.click(screen.getByText("Editar"));
    if (!screen.queryByLabelText("Descrição")) fireEvent.click(await screen.findByText("Descrição completa"));
    await waitFor(() => expect((screen.getByLabelText("Descrição") as HTMLTextAreaElement).disabled).toBe(false), { timeout: 5000 });
    const box = screen.getByLabelText("Descrição") as HTMLTextAreaElement;
    box.focus();
    fireEvent.change(box, { target: { value: "Texto." } });
    await new Promise((r) => setTimeout(r, 400));
    expect((screen.getByLabelText("Descrição") as HTMLTextAreaElement).value).toBe("Texto.");
    expect(document.activeElement).toBe(screen.getByLabelText("Descrição"));
  });
});

// Item 3 (31/10): no Produto teste, UMA ação principal por contexto no rodapé. Em edição, avançar = "Salvar e continuar" (já gravava o
// pendente antes de trocar de passo); "Salvar rascunho" fica secundário; no último passo a principal é Publicar. Item 2: status único.
describe("Produto teste: ação principal do rodapé e status único", () => {
  beforeEach(() => { window.sessionStorage.clear(); window.localStorage.clear(); cleanup(); writes.mockClear(); product.versions = [JSON.parse(JSON.stringify(version))]; product.published_version_id = null; });
  it("rodapé cresce e quebra linhas sem sobrepor navegação e edição", async () => {
    render(<ProductEditor productId="p1" layout="test" openInEditMode onBack={() => {}} />);
    await waitFor(() => expect(screen.getByLabelText("Título comercial")).toBeEnabled());
    // JSDOM não mede layout: protege a estrutura; a geometria é conferida no navegador real.
    const footer = screen.getByTestId("editor-footer");
    expect(footer).toHaveClass("flex-wrap", "min-h-[52px]");
    expect(footer).not.toHaveClass("h-[52px]");
    for (const group of [screen.getByTestId("editor-footer-navigation"), screen.getByTestId("editor-footer-actions")]) {
      expect(group).toHaveClass("w-full", "min-w-0", "flex-wrap", "lg:w-auto", "[&>button]:max-w-full", "[&>button]:whitespace-normal");
    }
    fireEvent.click(screen.getByTestId("footer-next"));
    const nav = screen.getByRole("navigation", { name: "Passos do produto" });
    await waitFor(() => expect(nav.querySelector('[aria-current="step"]')).toHaveTextContent("Configurações da tarefa e etapas"));
    expect(screen.queryByText("Deseja salvar antes de travar a edição?")).not.toBeInTheDocument();
  });
  it("em edição: 'Salvar e continuar' é a principal; no último passo some o avançar e Publicar vira a principal", async () => {
    render(<ProductEditor productId="p1" layout="test" openInEditMode onBack={() => {}} />);
    await waitFor(() => expect(screen.getByLabelText("Título comercial")).toBeEnabled());
    expect(screen.getByTestId("footer-next")).toHaveTextContent("Salvar e continuar: Configurações da tarefa e etapas");
    expect(screen.getByTestId("footer-publish")).toHaveAttribute("data-primary", "false");
    expect(screen.getByTestId("footer-save-draft")).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "Passos do produto" });
    fireEvent.click(within(nav).getByRole("button", { name: /Conferência, preço e publicação/ }));
    await waitFor(() => expect(screen.queryByTestId("footer-next")).not.toBeInTheDocument());
    expect(screen.getByTestId("footer-publish")).toHaveAttribute("data-primary", "true");
    expect(screen.getByTestId("header-status-summary")).toHaveTextContent("Rascunho v1");
  });
  // Validação 31/10 (API simulada — não é persistência real): o botão grava pela MESMA rota da versão antes de trocar de passo.
  it("Salvar e continuar: sucesso grava uma vez (mesmo com clique duplo) e avança", async () => {
    render(<ProductEditor productId="p1" layout="test" openInEditMode onBack={() => {}} />);
    const input = await screen.findByLabelText("Título comercial");
    await waitFor(() => expect(input).toBeEnabled());
    fireEvent.change(input, { target: { value: "Nome salvo ao continuar" } });
    let release!: () => void;
    writes.mockImplementationOnce(() => new Promise((r) => { release = () => r({}); }));
    const next = screen.getByTestId("footer-next");
    fireEvent.click(next); fireEvent.click(next);
    await waitFor(() => expect(writes).toHaveBeenCalledTimes(1));
    release();
    const nav = screen.getByRole("navigation", { name: "Passos do produto" });
    await waitFor(() => expect(nav.querySelector('[aria-current="step"]')).toHaveTextContent("Configurações da tarefa e etapas"));
    expect(writes).toHaveBeenCalledTimes(1);
    expect(writes).toHaveBeenCalledWith("v1", expect.objectContaining({ title: "Nome salvo ao continuar" }));
    expect(product.versions).toHaveLength(1); // não cria versão nova
  });
  it("Salvar e continuar: erro do servidor mantém o passo, o texto e mostra a mensagem; tentar de novo grava", async () => {
    render(<ProductEditor productId="p1" layout="test" openInEditMode onBack={() => {}} />);
    const input = await screen.findByLabelText("Título comercial");
    await waitFor(() => expect(input).toBeEnabled());
    fireEvent.change(input, { target: { value: "Texto que não pode sumir" } });
    writes.mockRejectedValueOnce(new Error("Servidor recusou o título"));
    fireEvent.click(screen.getByTestId("footer-next"));
    expect(await screen.findByText(/Servidor recusou o título/)).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "Passos do produto" });
    expect(nav.querySelector('[aria-current="step"]')).toHaveTextContent("Produto");
    expect(input).toHaveValue("Texto que não pode sumir");
    fireEvent.click(screen.getByTestId("footer-next"));
    await waitFor(() => expect(nav.querySelector('[aria-current="step"]')).toHaveTextContent("Configurações da tarefa e etapas"));
    expect(writes).toHaveBeenCalledTimes(2);
    expect(writes).toHaveBeenLastCalledWith("v1", expect.objectContaining({ title: "Texto que não pode sumir" }));
  });
  it("IA no editor: 'Sugerir público-alvo' manda as etapas como contexto, mostra prévia, só aplica após confirmar e não grava sozinha", async () => {
    product.versions[0].tasks = [{ id: "t1", key: "t1", name: "SEO técnico", description: "Melhora o site", execution_mode: "humano", stage_execution: "stage", estimated_minutes: 420,
      steps: [{ id: "s1", key: "s1", name: "Auditar páginas", description: "Auditoria", completion_criteria: "Checklist feito", executor_kind: "nomad", estimated_minutes: 180, specialist_user_id: "pessoa-z" }],
      deliverables: [{ id: "d1", step_id: "s1", name: "Relatório de auditoria" }], questionnaire: null, executor_continuity: "not_allowed" }];
    generateAi.mockReset().mockResolvedValueOnce({ reply: "Proposta comercial.", draft: { title: "Outro título", summary: "", full_description: "", target_audience: "Pequenas empresas com site", scope: "Escopo da IA", included_items: [], excluded_items: [], client_requirements: [], deliverables_summary: [], suggested_tasks: [] } });
    render(<ProductEditor productId="p1" layout="test" openInEditMode onBack={() => {}} />);
    await waitFor(() => expect(screen.getByLabelText("Título comercial")).toBeEnabled());
    fireEvent.change(screen.getByLabelText("Escopo"), { target: { value: "Escopo do usuário" } });
    fireEvent.click(screen.getByTestId("open-ai-chat"));
    const dialog = await screen.findByTestId("product-ai-chat");
    expect(within(dialog).getByTestId("ai-context-used")).toHaveTextContent("1 tarefa(s), 1 etapa(s)");
    fireEvent.click(within(dialog).getByTestId("ai-suggest-audience"));
    await within(dialog).findByText("Proposta comercial.");
    const sent = (generateAi.mock.calls[0][1] as any[]).at(-1).text as string;
    expect(sent).toContain("Auditar páginas");
    expect(sent).toContain("Relatório de auditoria");
    expect(sent).not.toContain("pessoa-z");
    expect(sent).not.toContain("420");
    expect(within(dialog).getByText("Pequenas empresas com site")).toBeInTheDocument(); // prévia
    expect(screen.getByLabelText("Público-alvo")).toHaveValue(""); // nada aplicado ainda
    fireEvent.click(within(dialog).getByTestId("apply-draft"));
    fireEvent.click(within(dialog).getByRole("button", { name: "Voltar à revisão" }));
    expect(screen.getByLabelText("Público-alvo")).toHaveValue("");
    fireEvent.click(within(dialog).getByTestId("apply-draft"));
    fireEvent.click(within(dialog).getByTestId("confirm-ai-apply"));
    await within(dialog).findByText(/Sugestões aplicadas ao formulário/);
    expect(screen.getByLabelText("Público-alvo")).toHaveValue("Pequenas empresas com site");
    expect(screen.getByLabelText("Escopo")).toHaveValue("Escopo do usuário"); // preenchido é protegido
    expect(screen.getByLabelText("Título comercial")).toHaveValue("Produto");
    expect(writes).not.toHaveBeenCalled();
    expect(generateAi).toHaveBeenCalledTimes(1);
  });
  it("layout atual continua igual: 'Passo 2' e Publicar principal", async () => {
    render(<ProductEditor productId="p1" openInEditMode onBack={() => {}} />);
    await waitFor(() => expect(screen.getByTestId("footer-next")).toHaveTextContent(/^Passo 2/));
    expect(screen.getByTestId("footer-publish")).toHaveAttribute("data-primary", "true");
    expect(screen.queryByTestId("header-status-summary")).not.toBeInTheDocument();
  });
});
