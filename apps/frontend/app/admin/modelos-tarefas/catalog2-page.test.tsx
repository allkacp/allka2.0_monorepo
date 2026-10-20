import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const calls: Record<string, any[][]> = {};
const rec = (k: string, a: any[]) => { (calls[k] ??= []).push(a); };
let stepInstances: any[] = [];

const taskModels = [{ id: 121, name: "Teste", description: null, is_active: true, revision: 1, step_count: 2, product_count: 1, usage_count: 1 }];
const stepModels = [
  { id: 60, name: "Elaborar relatório", description: null, is_active: true, revision: 2, usage_count: 1, task_model_count: 1, used_in_tasks: ["Teste · Gestão de Tráfego"] },
  { id: 61, name: "Etapa sem uso", description: null, is_active: true, revision: 1, usage_count: 0, task_model_count: 0, used_in_tasks: [] },
];
vi.mock("@/lib/api-client", () => ({
  apiClient: new Proxy({}, {
    get: (_t, name: string) => {
      if (name === "getCatalog2TaskModels") return async () => ({ total: taskModels.length, data: taskModels });
      if (name === "getCatalog2StepModels") return async () => ({ total: stepModels.length, data: stepModels });
      if (name === "getCatalog2TaskModel") return async (id: number) => ({ ...taskModels[0], id, steps: [{ id: 1, step_model: { name: "Elaborar relatório" } }], instances: [{ task_id: "t1", task_name: "Teste", product_id: "p1", product_name: "Gestão de Tráfego", version: 1, state: "rascunho" }] });
      if (name === "getCatalog2StepModel") return async (id: number) => ({ ...stepModels.find((s) => s.id === id), task_models: [{ task_model_id: 121, task_model: { id: 121, name: "Teste" } }], instances: id === 60 ? stepInstances : [] });
      if (name === "copyCatalog2StepModel") return async (...a: any[]) => { rec("copy", a); return { id: 99 }; };
      if (name === "linkCatalog2StepModelTasks") return async (...a: any[]) => { rec("link", a); return { added: 1 }; };
      if (name === "setCatalog2StepModelActive") return async (...a: any[]) => { rec("active", a); return {}; };
      return async () => ({ data: [] });
    },
  }),
}));
// O editor real é testado em embedded-model-editor.test.tsx; aqui só confirmamos COMO a página o abre.
vi.mock("@/app/admin/produtos/novo-catalogo/product-editor", () => ({
  ProductEditor: (p: any) => <div data-testid="stub-editor" data-product={p.productId} data-kind={p.embedded?.kind} data-task={p.embedded?.taskId} data-step={p.embedded?.stepId ?? ""} data-model={p.embedded?.modelId} />,
}));
vi.mock("@/components/standard-page-shell", () => ({ STANDARD_SHELL_PANEL_CLASS: "", StandardPageBanner: ({ title, actions }: any) => <header><h1>{title}</h1>{actions}</header> }));

import Catalog2GlobalModelsPage from "./catalog2-page";

beforeEach(() => {
  cleanup();
  for (const k of Object.keys(calls)) delete calls[k];
  stepInstances = [{ step_id: "st8", task_id: "t1", task_name: "Teste", product_id: "p1", product_name: "Gestão de Tráfego", version: 1, state: "rascunho" }];
});

describe("Modelos globais · só modelos reais e editor completo na própria página", () => {
  it("lista só os modelos reais; em Etapas mostra as tarefas que usam cada uma; não existe 'Novo modelo' nem formulário reduzido", async () => {
    render(<Catalog2GlobalModelsPage />);
    await screen.findByText("Teste");
    expect(screen.getByTestId("models-count").textContent).toBe("1");
    expect(screen.queryByText("Novo modelo")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Etapas" }));
    await screen.findByText("Elaborar relatório");
    const usage = screen.getAllByTestId("model-usage").map((e) => e.textContent);
    expect(usage[0]).toBe("Usada em: Teste · Gestão de Tráfego");
    expect(usage[1]).toBe("Ainda não usada em nenhuma tarefa de produto");
  });

  it("editar abre o editor completo NA PRÓPRIA PÁGINA (sem navegar), focado na tarefa do modelo", async () => {
    const assign = vi.fn();
    Object.defineProperty(window, "location", { value: { ...window.location, assign, href: window.location.href }, writable: true });
    render(<Catalog2GlobalModelsPage />);
    await screen.findByText("Teste");
    fireEvent.click(screen.getByLabelText("Editar Teste"));
    const ed = await screen.findByTestId("stub-editor");
    expect(ed.dataset).toMatchObject({ product: "p1", kind: "task", task: "t1", model: "121" });
    expect(screen.getByTestId("model-editor-dialog")).toBeInTheDocument();
    expect(assign).not.toHaveBeenCalled();
    expect(screen.queryByText("Salvar modelo global")).not.toBeInTheDocument(); // o formulário reduzido antigo não existe mais
  });

  it("editar uma ETAPA abre o editor na etapa certa; com vários usos, deixa escolher onde editar", async () => {
    stepInstances = [
      { step_id: "stA", task_id: "tA", task_name: "Tarefa A", product_id: "pA", product_name: "Produto A", version: 1, state: "publicada" },
      { step_id: "stB", task_id: "tB", task_name: "Tarefa B", product_id: "pB", product_name: "Produto B", version: 2, state: "rascunho" },
    ];
    render(<Catalog2GlobalModelsPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Etapas" }));
    fireEvent.click(await screen.findByLabelText("Editar Elaborar relatório"));
    const select = (await screen.findByTestId("model-instance-select")) as HTMLSelectElement;
    expect(select.options).toHaveLength(2);
    // abre direto no uso editável (rascunho) e não no publicado
    await waitFor(() => expect(screen.getByTestId("stub-editor").dataset).toMatchObject({ product: "pB", step: "stB", task: "tB", kind: "step" }));
    fireEvent.change(select, { target: { value: "0" } });
    await waitFor(() => expect(screen.getByTestId("stub-editor").dataset.product).toBe("pA"));
  });

  it("modelo que ainda não está em nenhum produto explica (sem editor paralelo)", async () => {
    render(<Catalog2GlobalModelsPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Etapas" }));
    fireEvent.click(await screen.findByLabelText("Editar Etapa sem uso"));
    expect((await screen.findByTestId("model-no-instance")).textContent).toContain("ainda não está em nenhuma etapa de produto");
    expect(screen.queryByTestId("stub-editor")).not.toBeInTheDocument();
  });

  it("etapa: vincular a mais tarefas (sem copiar) e duplicar e vincular chamam as rotas certas; a lista de tarefas vinculadas aparece no detalhe", async () => {
    render(<Catalog2GlobalModelsPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Etapas" }));
    fireEvent.click(await screen.findByText("Elaborar relatório"));
    const det = await screen.findByTestId("model-detail");
    expect(det.textContent).toContain("Teste");
    expect(det.textContent).toContain("Gestão de Tráfego");
    fireEvent.click(within(det).getByRole("button", { name: /Duplicar e vincular/ }));
    const copy = await screen.findByTestId("copy-dialog");
    fireEvent.click(within(copy).getByLabelText("Teste"));
    fireEvent.click(within(copy).getByRole("button", { name: "Criar cópia" }));
    await waitFor(() => expect(calls.copy?.[0]).toEqual([60, { name: "Elaborar relatório — cópia", task_model_ids: [121] }]));
    // vincular (a mesma etapa) — a tarefa 121 já usa, então a lista oferece "todas já usam"
    fireEvent.click(await screen.findByLabelText("Vincular Elaborar relatório a mais tarefas"));
    const link = await screen.findByTestId("link-dialog");
    expect(link.textContent).toContain("Todas as tarefas já usam esta etapa");
  });
});
