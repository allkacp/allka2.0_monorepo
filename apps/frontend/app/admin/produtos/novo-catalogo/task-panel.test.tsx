import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const api = vi.hoisted(() => ({ writes: vi.fn(), getCatalog2Leaders: vi.fn(async () => ({ data: [] })) }));
vi.mock("@/lib/api-client", () => ({ apiClient: new Proxy({}, { get: (_t, k: string) => {
  if (k.startsWith("update") || k.startsWith("add") || k.startsWith("delete")) return api.writes;
  if (k === "getCatalog2Leaders") return api.getCatalog2Leaders;
  return async () => ({ data: [], items: [] });
} }) }));
vi.mock("@/hooks/useAppFrameMetrics", () => ({ useAppFrameMetrics: () => ({ sidebarWidth: 72 }) }));
vi.mock("@/contexts/open-screens-context", () => ({ usePinEntry: () => ({ pinned: false, toggle: () => {} }) }));
vi.mock("@/lib/use-work-calendar", () => ({ useWorkCalendar: () => ({ business_hours_per_day: 8 }), fmtBusinessMinutes: () => "2 h", businessDaysOf: () => 1 }));

import { TasksTab, resetOpenStoreForTests } from "./product-editor";
import { OPEN_STEP_EVENT } from "./catalog2-deliverables-ui";
import { ProductEditorLayoutProvider } from "./editor-layout-test";
import { FramedEditorScope } from "@/components/framed-editor-context";

const makeTask = (id = "t1", name = "Alteração de Website ou Loja Virtual") => ({
  id, key: id, name, description: "Cadastro da tarefa", execution_mode: "humano", stage_execution: "task", sort_order: 1,
  cycle_type: "recorrente", repeat_rule: "all_cycles", executor_continuity: "not_allowed", questionnaire: null, deliverables: [],
  steps: [{ id: `${id}-s1`, key: `${id}-s1`, name: `Análise de Briefing ${id}`, description: "Validar informações", sort_order: 1,
    estimated_minutes: 120, specialty_id: "sp1", purpose: "execucao", execution_mode: "humano", completion_criteria: "Validado",
    executor_kind: "leader", leader_mode: "auto", leader_user_id: null, internal_step: false, ops: {}, draft_incomplete: false,
    requires_qualification: false, qualifier_kind: "leader", depends_on: null, first_execution_only: false }],
});
const makeVersion = (tasks = [makeTask()], id = "v1", state = "rascunho") => ({
  id, state, version_number: 2, tasks, variations: [], addons: [], conditions: [], commercial_deadline_days: 3,
});
const props = (version = makeVersion(), extra: any = {}) => ({ version, productId: "p1", readOnly: false,
  refs: { specialties: [{ id: "sp1", name: "Gestor", execution_kind: "humano", max_hourly_rate: 50 }] },
  act: async (fn: () => any) => fn(), clearHighlight: vi.fn(), taskStructure: "single", ...extra,
});
beforeEach(() => { cleanup(); sessionStorage.clear(); localStorage.clear(); resetOpenStoreForTests(); vi.clearAllMocks(); });
afterEach(cleanup);

describe("Entrega → tarefa numerada → Painel Moldura completo", () => {
  it("layout teste abre a mesma tarefa inline em abas; navegar não grava nem abre outro painel", async () => {
    const view = () => <ProductEditorLayoutProvider value="test"><FramedEditorScope product={{ id: "p1", name: "Produto" }} version={{ id: "v1" }} workspace="test"><TasksTab {...props()} /></FramedEditorScope></ProductEditorLayoutProvider>;
    const first = render(view());
    fireEvent.click(screen.getByTestId("task-summary-open"));
    const editor = await screen.findByTestId("test-task-editor");
    expect(screen.queryByTestId("task-panel")).not.toBeInTheDocument();
    expect(within(editor).getByRole("tab", { name: "Dados da tarefa" })).toHaveAttribute("aria-selected", "true");
    fireEvent.click(within(editor).getByRole("tab", { name: "Etapas e fluxo" }));
    expect(within(editor).getByRole("tabpanel")).toHaveTextContent("Análise de Briefing t1");
    fireEvent.click(within(editor).getByRole("tab", { name: "Questionário" }));
    expect(within(editor).getByRole("tabpanel")).toHaveTextContent("Questionário de contratação");
    expect(within(editor).getByRole("tab", { name: "Variações" })).toBeVisible();
    expect(within(editor).getByRole("tab", { name: "Adicionais" })).toBeVisible();
    expect(within(editor).getByRole("tab", { name: "Prazos e condições" })).toBeVisible();
    expect(screen.queryByTestId("panel-card-open")).not.toBeInTheDocument();
    expect(api.writes).not.toHaveBeenCalled();
    first.unmount(); render(view());
    expect(await screen.findByRole("tab", { name: "Questionário" })).toHaveAttribute("aria-selected", "true");
    fireEvent(window, new CustomEvent(OPEN_STEP_EVENT, { detail: { stepId: "t1-s1", block: 2 } }));
    expect(screen.getByRole("tab", { name: "Etapas e fluxo" })).toHaveAttribute("aria-selected", "true");
    const form = await screen.findByTestId("step-edit-form");
    expect(within(form).getByTestId("step-guide-nav")).toBeVisible();
    for (const id of [1, 2, 3, 4, 5, 6]) expect(within(form).getByTestId(`step-block-${id}`)).toBeVisible();
    expect([...form.querySelectorAll('[data-testid^="step-block-"][data-status]')].map(node => node.getAttribute("data-testid"))).toEqual(["step-block-1", "step-block-2", "step-block-6", "step-block-5", "step-block-4", "step-block-3"]);
    for (const id of [1, 2, 3, 4, 5, 6]) expect(within(form).getByTestId(`step-block-${id}`).querySelector('h5 > button')).toBeDisabled();
    expect(api.writes).not.toHaveBeenCalled();
  });
  it("o resumo compacto é somente leitura mesmo em edição; configurações ficam fora e os dados acompanham as etapas", async () => {
    const version = makeVersion();
    const { rerender } = render(<TasksTab {...props(version)} />);
    fireEvent.click(screen.getByTestId("task-summary-open"));
    const summary = await screen.findByTestId("task-readonly-summary");
    expect(summary.querySelector("input,select,textarea,button")).toBeNull();
    expect(summary).toHaveTextContent("Calculado pelas etapas · somente leitura");
    expect(within(summary).getByTestId("task-summary-specialties")).toHaveTextContent("Gestor");
    expect(within(summary).getByText("2 h")).toBeInTheDocument();
    expect(summary.querySelector("dl")).toHaveAttribute("data-compact", "true");
    const config = screen.getByTestId("continuity-card");
    expect(summary.contains(config)).toBe(false);
    expect(config).toHaveAttribute("data-compact", "true");
    expect(within(config).getByRole("combobox", { name: "Continuidade do executor nos próximos ciclos" })).toBeEnabled();
    expect(screen.getByTestId("step-card-1")).toHaveAttribute("data-compact", "true");
    const updated = { ...version, tasks: [{ ...version.tasks[0], steps: [{ ...version.tasks[0].steps[0], estimated_minutes: 210, specialty_id: "sp2", execution_mode: "ia" }] }] };
    rerender(<TasksTab {...props(updated, { refs: { specialties: [{ id: "sp2", name: "Análise IA", max_hourly_rate: 20 }] } })} />);
    expect(within(summary).getByTestId("task-summary-executor")).toHaveTextContent("IA");
    expect(within(summary).getByTestId("task-summary-specialties")).toHaveTextContent("Análise IA");
    expect(within(summary).getByText("3,5 h")).toBeInTheDocument();
    expect(summary.querySelector("input,select,textarea,button")).toBeNull();
    expect(api.writes).not.toHaveBeenCalled();
  });

  it("sem tarefa mantém o cadastro da tarefa principal, sem inventar registros ou abrir painéis", () => {
    render(<TasksTab {...props(makeVersion([]))} />);
    expect(screen.getByRole("button", { name: /Cadastrar a tarefa principal/ })).toBeInTheDocument();
    expect(screen.queryByTestId("task-summary-row")).not.toBeInTheDocument();
    expect(screen.queryByTestId("task-panel")).not.toBeInTheDocument();
    expect(api.writes).not.toHaveBeenCalled();
  });

  it("Abrir todos da página não abre painéis de tarefas automaticamente", () => {
    render(<TasksTab {...props(makeVersion([makeTask(), makeTask("t2")]), { taskStructure: "multiple" })} />);
    fireEvent(window, new Event("catalog2:expand-tasks"));
    fireEvent(window, new CustomEvent("catalog2:accordion-all", { detail: { open: true } }));
    expect(screen.queryByTestId("task-panel")).not.toBeInTheDocument();
  });

  it("começa compacto, com a entrega comercial no produto e sem espalhar os blocos da tarefa na página", () => {
    render(<TasksTab {...props(makeVersion(), { leading: () => <div>Entrega comercial do produto</div> })} />);
    expect(screen.getByText("Tarefa 1")).toBeInTheDocument();
    expect(screen.getByText("Entrega comercial do produto")).toBeInTheDocument();
    expect(screen.getByTestId("task-summary-open")).toHaveTextContent("Ver tarefa");
    expect(screen.queryByTestId("task-panel")).not.toBeInTheDocument();
    expect(screen.queryByTestId("steps-card")).not.toBeInTheDocument();
    expect(screen.queryByText("Questionário de contratação")).not.toBeInTheDocument();
    expect(api.writes).not.toHaveBeenCalled();
  });

  it("as linhas compactas continuam abrindo questionário e entregáveis sem fechar a tarefa ou gravar dados", async () => {
    render(<TasksTab {...props()} />);
    fireEvent.click(screen.getByTestId("task-summary-open"));
    const panel = await screen.findByTestId("task-panel");
    fireEvent.click(within(panel).getAllByTestId("panel-card-open")[0]);
    expect(await screen.findByTestId("panel-card-panel")).toHaveTextContent("Questionário de contratação");
    fireEvent.click(screen.getByTestId("panel-card-close"));
    await waitFor(() => expect(screen.queryByTestId("panel-card-panel")).not.toBeInTheDocument());
    expect(screen.getByTestId("task-panel")).toBeInTheDocument();
    fireEvent.click(within(panel).getAllByTestId("panel-card-open")[1]);
    expect(await screen.findByTestId("panel-card-panel")).toHaveTextContent("Entregáveis da tarefa");
    fireEvent.click(screen.getByTestId("panel-card-close"));
    await waitFor(() => expect(screen.queryByTestId("panel-card-panel")).not.toBeInTheDocument());
    expect(screen.getByTestId("task-panel")).toBeInTheDocument();
    expect(api.writes).not.toHaveBeenCalled();
  });

  it("Ver tarefa abre o Painel Moldura e mostra as etapas diretamente, além do resumo, questionário e entregáveis", async () => {
    render(<TasksTab {...props()} />);
    fireEvent.click(screen.getByTestId("task-summary-open"));
    const panel = await screen.findByTestId("task-panel");
    expect(panel.style.left).toBe("102px");
    expect(panel.style.height).toBe("calc(100dvh - 60px)");
    expect(within(panel).getByTestId("task-inline-steps")).toBeInTheDocument();
    expect(within(panel).getByTestId("step-card-1")).toHaveTextContent("Análise de Briefing t1");
    expect(within(panel).getByText("Resumo da tarefa")).toBeInTheDocument();
    expect(within(panel).getByText("Questionário de contratação")).toBeInTheDocument();
    expect(within(panel).getByText("Entregáveis da tarefa")).toBeInTheDocument();
    expect(within(panel).queryByTestId("steps-open")).not.toBeInTheDocument();
    expect(screen.queryByTestId("task-summary-modal")).not.toBeInTheDocument();
    expect(api.writes).not.toHaveBeenCalled();
    fireEvent.click(within(panel).getByRole("button", { name: "Fechar tarefa" }));
    await waitFor(() => expect(screen.queryByTestId("task-panel")).not.toBeInTheDocument());
    expect(api.writes).not.toHaveBeenCalled();
  });

  it("o nome também abre a tarefa; várias tarefas têm números e conteúdos separados", async () => {
    render(<TasksTab {...props(makeVersion([makeTask(), makeTask("t2", "Relatório mensal")]), { taskStructure: "multiple" })} />);
    expect(screen.getByText("Tarefa 1")).toBeInTheDocument();
    expect(screen.getByText("Tarefa 2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ver tarefa 2: Relatório mensal" }));
    const panel = await screen.findByTestId("task-panel");
    expect(within(panel).getByText("Tarefa 2 · Relatório mensal")).toBeInTheDocument();
    expect(within(panel).getByTestId("step-card-1")).toHaveTextContent("Análise de Briefing t2");
    expect(within(panel).queryByText("Análise de Briefing t1")).not.toBeInTheDocument();
  });

  it("recupera o painel aberto após remontagem/F5; fechar explicitamente impede reabertura", async () => {
    const p = props();
    const first = render(<TasksTab {...p} />);
    fireEvent.click(screen.getByTestId("task-summary-open"));
    await screen.findByTestId("task-panel");
    fireEvent.scroll(screen.getByTestId("task-panel-content"), { target: { scrollTop: 320 } });
    first.unmount();
    const second = render(<TasksTab {...p} />);
    const panel = await screen.findByTestId("task-panel");
    expect(screen.getByTestId("task-panel-content").scrollTop).toBe(320);
    fireEvent.click(within(panel).getByRole("button", { name: "Voltar às tarefas" }));
    await waitFor(() => expect(screen.queryByTestId("task-panel")).not.toBeInTheDocument());
    second.unmount(); render(<TasksTab {...p} />);
    expect(screen.queryByTestId("task-panel")).not.toBeInTheDocument();
    expect(api.writes).not.toHaveBeenCalled();
  });

  it("trocar a versão não abre a tarefa que estava selecionada na outra versão", async () => {
    const v1 = makeVersion(), v2 = makeVersion([makeTask("t2")], "v2");
    const { rerender } = render(<TasksTab {...props(v1)} />);
    fireEvent.click(screen.getByTestId("task-summary-open"));
    await screen.findByTestId("task-panel");
    rerender(<TasksTab {...props(v2)} />);
    await waitFor(() => expect(screen.queryByTestId("task-panel")).not.toBeInTheDocument());
  });

  it("versão publicada é só leitura, sem editar tarefa/etapa ou cadastrar etapa", async () => {
    render(<TasksTab {...props(makeVersion([makeTask()], "v1", "publicada"), { readOnly: true })} />);
    fireEvent.click(screen.getByTestId("task-summary-open"));
    const panel = await screen.findByTestId("task-panel");
    expect(within(panel).queryByTestId("task-summary-edit")).not.toBeInTheDocument();
    expect(within(panel).queryByTestId("step-edit-btn")).not.toBeInTheDocument();
    expect(within(panel).queryByText("Nova etapa")).not.toBeInTheDocument();
    expect(api.writes).not.toHaveBeenCalled();
  });

  it("Editar no painel de leitura do rascunho usa a edição existente e não fecha a tarefa", async () => {
    const editing = vi.fn(); window.addEventListener("catalog2:start-editing", editing);
    try {
      const p = props(makeVersion(), { readOnly: true });
      const { rerender } = render(<TasksTab {...p} />);
      fireEvent.click(screen.getByTestId("task-summary-open"));
      const panel = await screen.findByTestId("task-panel");
      fireEvent.click(within(panel).getByTestId("task-summary-edit"));
      expect(editing).toHaveBeenCalledTimes(1);
      rerender(<TasksTab {...p} readOnly={false} />);
      expect(await screen.findByTestId("task-panel")).toBeInTheDocument();
      expect(within(screen.getByTestId("task-panel")).getByTestId("step-edit-btn")).toBeInTheDocument();
      expect(api.writes).not.toHaveBeenCalled();
    } finally { window.removeEventListener("catalog2:start-editing", editing); }
  });

  it("F5 recupera tarefa, editor da etapa e texto não salvo sem mandar gravação ao servidor", async () => {
    const p = props();
    const first = render(<TasksTab {...p} />);
    fireEvent.click(screen.getByTestId("task-summary-open"));
    fireEvent.click(await screen.findByTestId("step-edit-btn"));
    await screen.findByTestId("step-edit-form");
    fireEvent.click(screen.getByTestId("step-block-1").querySelector("button")!);
    const name = await screen.findByDisplayValue("Análise de Briefing t1");
    fireEvent.change(name, { target: { value: "Texto preservado após F5" } });
    first.unmount();
    render(<TasksTab {...p} />);
    expect(await screen.findByTestId("task-panel")).toBeInTheDocument();
    expect(await screen.findByTestId("step-edit-form")).toBeInTheDocument();
    expect(await screen.findByDisplayValue("Texto preservado após F5")).toBeInTheDocument();
    expect(api.writes).not.toHaveBeenCalled();
  });

  it("atalho de uma etapa abre automaticamente a tarefa certa e o editor real da etapa", async () => {
    render(<TasksTab {...props()} />);
    fireEvent(window, new CustomEvent(OPEN_STEP_EVENT, { detail: { stepId: "t1-s1", block: 2 } }));
    expect(await screen.findByTestId("task-panel")).toBeInTheDocument();
    expect(await screen.findByTestId("step-edit-form", {}, { timeout: 5000 })).toBeInTheDocument();
    expect(api.writes).not.toHaveBeenCalled();
  });

  it("o atalho de prontidão e o retorno de edição apontam para a tarefa correta, sem abrir todas", async () => {
    render(<TasksTab {...props(makeVersion([makeTask(), makeTask("t2", "Relatório")]), { taskStructure: "multiple" })} />);
    fireEvent(window, new CustomEvent("catalog2:reveal", { detail: { ids: ["catalog2-step-add:t2"] } }));
    const panel = await screen.findByTestId("task-panel");
    expect(within(panel).getByText("Tarefa 2 · Relatório")).toBeInTheDocument();
    expect(screen.getAllByTestId("task-panel")).toHaveLength(1);
  });
});
