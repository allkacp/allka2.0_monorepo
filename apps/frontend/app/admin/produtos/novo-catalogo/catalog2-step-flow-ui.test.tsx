import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const saveFlow = vi.fn(async () => ({ ok: true }));
vi.mock("@/lib/api-client", () => ({ apiClient: { saveCatalog2StepFlow: (...a: unknown[]) => (saveFlow as any)(...a) } }));

import { StepFlowEditor, StepFlowControls, flowSummary, stepFlowChips, stepStartMode, startChangePayload } from "./catalog2-step-flow-ui";

const mk = (over: Record<string, unknown> = {}) => [
  { id: "i1", key: "s1", name: "Briefing", sort_order: 1, estimated_minutes: 60, depends_on: null, executor_policy: "auto", executor_same_as_key: null },
  { id: "i2", key: "s2", name: "Arte", sort_order: 2, estimated_minutes: 120, depends_on: null, executor_policy: "auto", executor_same_as_key: null },
  { id: "i3", key: "s3", name: "Texto", sort_order: 3, estimated_minutes: 30, depends_on: null, executor_policy: "auto", executor_same_as_key: null },
  { id: "i4", key: "s4", name: "Revisão", sort_order: 4, estimated_minutes: 45, depends_on: null, executor_policy: "auto", executor_same_as_key: null, ...over },
];
const act = async (fn: () => Promise<any>) => fn();

describe("Fluxo das etapas (A8) · editor", () => {
  it("padrão: em sequência; esforço total = soma; some quando há só 1 etapa", () => {
    const { container, rerender } = render(<StepFlowEditor task={{ id: "t", steps: mk() }} readOnly={false} act={act} startEditing />);
    expect(screen.getByTestId("flow-summary").textContent).toMatch(/Em sequência/);
    expect(screen.getByTestId("flow-summary").textContent).toMatch(/duração mínima 4 h 15 min · esforço total 4 h 15 min/);
    rerender(<StepFlowEditor task={{ id: "t", steps: mk().slice(0, 1) }} readOnly={false} act={act} startEditing />);
    expect(container.querySelector("[data-testid=step-flow-editor]")).toBeNull();
  });

  it("2 e 3 em paralelo com a 1; a 4 depois de todas — resumo, duração mínima e payload salvo", async () => {
    render(<StepFlowEditor task={{ id: "t1", steps: mk() }} readOnly={false} act={act} startEditing />);
    fireEvent.change(screen.getByLabelText("Quando a etapa 1 começa"), { target: { value: "start" } });
    fireEvent.change(screen.getByLabelText("Quando a etapa 2 começa"), { target: { value: "start" } });
    fireEvent.change(screen.getByLabelText("Quando a etapa 3 começa"), { target: { value: "start" } });
    fireEvent.change(screen.getByLabelText("Quando a etapa 4 começa"), { target: { value: "after" } });
    for (const box of screen.getAllByRole("checkbox")) fireEvent.click(box); // marca 1, 2 e 3 na etapa 4
    expect(screen.getByTestId("flow-summary").textContent).toMatch(/\[1 \+ 2 \+ 3\] → 4/);
    expect(screen.getByTestId("flow-summary").textContent).toMatch(/duração mínima 2 h 45 min · esforço total 4 h 15 min/);
    fireEvent.click(screen.getByTestId("save-step-flow"));
    expect(saveFlow).toHaveBeenCalledTimes(1);
    const payload = (saveFlow.mock.calls[0] as unknown[])[1] as any[];
    expect(payload.map((p) => p.depends_on)).toEqual([[], [], [], ["s1", "s2", "s3"]]);
  });

  it("'só depois da 3' e 'mesmo executor da 3': só oferece etapas que terminam antes; bloqueia salvar sem escolher", () => {
    render(<StepFlowEditor task={{ id: "t2", steps: mk({ depends_on: ["s3"] }).map((s, i) => (i < 3 ? { ...s, depends_on: [] } : s)) }} readOnly={false} act={act} startEditing />);
    fireEvent.change(screen.getByLabelText("Quem executa a etapa 4"), { target: { value: "same_as_step" } });
    const sel = screen.getByLabelText("Mesmo executor da etapa (para a etapa 4)") as HTMLSelectElement;
    const opts = [...sel.options].filter((o) => o.value);
    expect(opts.find((o) => o.value === "s3")!.disabled).toBe(false);
    expect(opts.find((o) => o.value === "s1")!.disabled).toBe(true);
    expect(screen.getByText(/Falta escolher de qual etapa/)).toBeInTheDocument();
    fireEvent.change(sel, { target: { value: "s3" } });
    expect(screen.queryByText(/Falta escolher de qual etapa/)).not.toBeInTheDocument();
  });

  it("detecta círculo (e bloqueia salvar); resumo e chips da etapa", () => {
    const steps = mk({ depends_on: ["s1"] }).map((s, i) => (i === 0 ? { ...s, depends_on: ["s4"] } : i < 3 ? { ...s, depends_on: [] } : s));
    render(<StepFlowEditor task={{ id: "t3", steps }} readOnly={false} act={act} startEditing />);
    expect(screen.getByText(/O fluxo tem um círculo/)).toBeInTheDocument();
    expect((screen.getByTestId("save-step-flow") as HTMLButtonElement).disabled).toBe(true);
    expect(flowSummary(mk()).waves).toEqual([["s1"], ["s2"], ["s3"], ["s4"]]);
    expect(stepFlowChips({ depends_on: [] }, mk())).toEqual(["começa junto com a tarefa"]);
    expect(stepFlowChips({ depends_on: ["s1", "s2"], executor_policy: "same_as_step", executor_same_as_key: "s1" }, mk())).toEqual(["depois das etapas 1, 2", "mesmo executor da etapa 1"]);
  });
  it("seletor rápido da linha: ao mesmo tempo que a anterior copia as dependências dela e faz a seguinte esperar as duas", () => {
    const steps = mk();
    // etapa 2 junto com a 1: depende do mesmo que a 1 (nada) -> []; a 3 (padrão) passa a esperar 1 e 2
    const p = startChangePayload("with_previous", steps[1], steps);
    expect(p).toEqual([{ step_id: "i2", depends_on: [] }, { step_id: "i3", depends_on: ["s1", "s2"] }]);
    // aplicado: a 2 aparece como "ao mesmo tempo que a anterior", a 3 como "depois de específicas"
    const aplicado = steps.map((s) => { const x = p.find((q) => q.step_id === s.id); return x ? { ...s, depends_on: x.depends_on } : s; });
    expect(stepStartMode(aplicado[1], aplicado)).toBe("with_previous");
    expect(stepStartMode(aplicado[2], aplicado)).toBe("custom");
    expect(startChangePayload("previous", aplicado[1], aplicado)).toEqual([{ step_id: "i2", depends_on: null }]);
    expect(startChangePayload("start", aplicado[2], aplicado)).toEqual([{ step_id: "i3", depends_on: [] }]);
    expect(stepStartMode(steps[3], steps)).toBe("previous");
  });

  it("visão organizada do fluxo salvo: fases, o que espera o quê, executor e botão Editar fluxo", () => {
    const steps = mk({ depends_on: ["s2", "s3"], executor_policy: "same_as_step", executor_same_as_key: "s2" }).map((s, i) => (i < 3 ? { ...s, depends_on: i === 2 ? ["s1"] : [] } : s));
    render(<StepFlowEditor task={{ id: "tv", stage_execution: "stage", steps }} readOnly={false} act={act} allowEdit />);
    expect(screen.getByTestId("flow-overview")).toBeInTheDocument();
    expect(screen.getByTestId("flow-wave-1").textContent).toMatch(/rodando juntas: etapas 1 \+ 2/);
    expect(screen.getByTestId("flow-step-s3").textContent).toMatch(/Começa depois que etapa 1 \(Briefing\) for aprovada/);
    expect(screen.getByTestId("flow-step-s4").textContent).toMatch(/etapa 2 \(Arte\) e etapa 3 \(Texto\) forem aprovadas/);
    expect(screen.getByTestId("flow-step-s4").textContent).toMatch(/mesmo executor da etapa 2/);
    expect(screen.getByTestId("flow-step-s1").textContent).toMatch(/Libera depois.*etapa 3 \(Texto\)/);
    expect(screen.getByTestId("flow-step-s4").textContent).toMatch(/última nesse caminho/);
    expect(screen.queryByLabelText("Quando a etapa 1 começa")).toBeNull();
    fireEvent.click(screen.getByTestId("edit-step-flow"));
    expect(screen.getByLabelText("Quando a etapa 1 começa")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Cancelar"));
    expect(screen.queryByLabelText("Quando a etapa 1 começa")).toBeNull();
  });

  it("sem botão Editar fluxo por padrão: o fluxo se edita direto na etapa (StepFlowControls) e salva ao escolher", () => {
    saveFlow.mockClear();
    render(<StepFlowEditor task={{ id: "tn", steps: mk() }} readOnly={false} act={act} />);
    expect(screen.queryByTestId("edit-step-flow")).toBeNull();
    const steps = mk();
    render(<StepFlowControls step={steps[3]} steps={steps} index={3} taskId="tn" act={act} />);
    fireEvent.change(screen.getByLabelText("Quando a etapa 4 começa"), { target: { value: "custom" } });
    fireEvent.click(screen.getByLabelText("Etapa 1"));
    expect(saveFlow).toHaveBeenLastCalledWith("tn", [{ step_id: "i4", depends_on: ["s1"] }]);
    fireEvent.change(screen.getByLabelText("Quem executa a etapa 4"), { target: { value: "same_as_step" } });
    fireEvent.change(screen.getByLabelText("Mesmo executor da etapa (para a etapa 4)"), { target: { value: "s3" } });
    expect(saveFlow).toHaveBeenLastCalledWith("tn", [{ step_id: "i4", executor_policy: "same_as_step", executor_same_as_key: "s3" }]);
  });
});
