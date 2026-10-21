import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

// Modelos globais: o editor embutido é o MESMO ProductEditor (sem formulário paralelo), focado na tarefa/etapa do modelo.
const step = (over: any = {}) => ({
  id: "st1", key: "configurar", name: "Configurar a conta", description: "Cria a conta", sort_order: 1, estimated_minutes: 120, specialty_id: "sp1", purpose: "execucao", execution_mode: "humano",
  completion_criteria: "Conta ativa", first_execution_only: false, skip_when_same_executor: false, executor_kind: "nomad", leader_mode: "auto", leader_user_id: null, internal_step: false,
  requires_qualification: true, requires_specialist_qualification: false, specialist_user_id: null, qualifier_kind: "leader", approval_hours: null, rework_hours: null, executor_accept_hours: null, ai_free_changes: null,
  ai_specialty_id: null, ai_estimated_minutes: null, depends_on: null, executor_policy: "auto", step_model_id: 77, step_model_revision: 1, model: { id: 77, revision: 1 }, ops: {}, draft_incomplete: false, ...over,
});
const task = (over: any = {}) => ({
  id: "t1", key: "t1", name: "Gestão de anúncios", description: null, execution_mode: "humano", specialty: { id: "sp1", name: "Gestor" }, specialty_id: "sp1", stage_execution: "task", task_model_id: 121, task_model_revision: 1, model: { id: 121, revision: 1 },
  steps: [step()], deliverables: [], questionnaire: null, sort_order: 1, cycle_type: "recorrente", repeat_rule: "all_cycles", executor_continuity: "not_allowed", ...over,
});
const other = { id: "t2", key: "t2", name: "OUTRA TAREFA", execution_mode: "humano", steps: [], deliverables: [], sort_order: 2, cycle_type: "recorrente", repeat_rule: "all_cycles" };
let version: any;
let product: any;
const calls: Record<string, any[][]> = {};
const rec = (k: string, a: any[]) => { (calls[k] ??= []).push(a); };

vi.mock("@/lib/api-client", () => {
  const handler: ProxyHandler<object> = {
    get: (_t, name: string) => {
      if (name === "getCatalog2Product") return async () => JSON.parse(JSON.stringify(product));
      if (name === "getCatalog2ModelImpact") return async (...a: any[]) => { rec("impact", a); return { instances: 3, editable: 2, locked: 1, products: 2, model_id: 77, kind: "step" }; };
      if (name === "updateCatalog2Step") return async (...a: any[]) => { rec("updateStep", a); return {}; };
      if (name === "getCatalog2Specialties") return async () => ({ data: [{ id: "sp1", name: "Gestor", execution_kind: "humano", max_hourly_rate: 50, is_active: true }] });
      return async () => ({ data: [], items: [], versions: [] });
    },
  };
  return { apiClient: new Proxy({}, handler) };
});
vi.mock("@/contexts/iallka-context", () => ({ useIallkaContext: () => ({ setScreenContext: () => {} }) }));
vi.mock("@/contexts/open-screens-context", () => ({ usePinEntry: () => ({ pinned: false, toggle: () => {} }) }));
vi.mock("@/hooks/useAppFrameMetrics", () => ({ useAppFrameMetrics: () => ({ top: 0, left: 0, width: 1000, height: 800 }) }));
vi.mock("@/lib/use-work-calendar", () => ({ useWorkCalendar: () => ({}), fmtBusinessMinutes: () => "", businessDaysOf: () => 0 }));

import { ProductEditor, resetOpenStoreForTests } from "./product-editor";

const mountEmbedded = (over: any = {}) => render(<ProductEditor productId="p1" onBack={() => {}} embedded={{ kind: "step", modelId: 77, taskId: "t1", stepId: "st1", modelName: "Configurar a conta", onClose: () => {}, ...over }} />);

beforeEach(() => {
  cleanup(); window.sessionStorage.clear(); resetOpenStoreForTests();
  for (const k of Object.keys(calls)) delete calls[k];
  version = { id: "v1", state: "rascunho", version_number: 1, title: "Produto", summary: "", full_description: "", change_summary: "", tasks: [task(), other], variations: [], addons: [], conditions: [], included_items: [], excluded_items: [], updated_at: "2026-10-15T10:00:00Z", is_published_current: false };
  product = { id: "p1", internal_name: "Gestão de Tráfego", status: "em_preparacao", published_version_id: null, versions: [version], pillar: null, category: null, four_f: [], header: {}, task_structure: "single" };
});

describe("Editor de modelo global = o MESMO editor do produto, embutido", () => {
  it("mostra o banner do modelo, só a tarefa do modelo (sem as abas e sem a publicação do produto) e já libera a edição do rascunho", async () => {
    mountEmbedded({ kind: "task", modelId: 121, stepId: undefined, modelName: "Gestão de anúncios" });
    const banner = await screen.findByTestId("embedded-model-banner", {}, { timeout: 5000 });
    expect(banner.textContent!.replace(/\s+/g, " ")).toContain("Editando modelo global de tarefa #121");
    expect(banner.textContent).toContain("Gestão de Tráfego");
    expect(screen.getByTestId("embedded-model-editor")).toBeInTheDocument();
    expect(screen.queryByText("OUTRA TAREFA")).not.toBeInTheDocument(); // só a tarefa do modelo
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();           // sem as abas do produto
    expect(screen.queryByText("Publicar")).not.toBeInTheDocument();
    // as etapas vêm do próprio editor de tarefa do produto (com Editar liberado)
    fireEvent.click(await screen.findByTestId("steps-open")); // 20/10: as etapas abrem no Painel Moldura ("Ver etapas")
    expect(await screen.findByTestId("step-card-1")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("step-edit-btn")).toBeInTheDocument());
  });

  it("modelo de ETAPA: abre sozinho o painel completo da etapa (os 6 blocos) — o mesmo do produto", async () => {
    mountEmbedded();
    expect(await screen.findByTestId("step-edit-form", {}, { timeout: 6000 })).toBeInTheDocument();
    for (const n of [1, 2, 3, 4, 5, 6]) expect(screen.getByTestId(`step-block-${n}`)).toBeInTheDocument();
    expect(screen.getByTestId("step-guide-nav")).toBeInTheDocument();
  });

  it("salvar uma etapa de modelo usado pergunta: criar novo modelo OU editar globalmente (sem 'somente neste produto'), com o impacto; escolher 'novo modelo' manda scope new_model", async () => {
    mountEmbedded();
    await screen.findByTestId("step-edit-form", {}, { timeout: 6000 });
    fireEvent.click(screen.getByRole("button", { name: "Concluir e salvar etapa" }));
    const dlg = await screen.findByTestId("model-scope-dialog");
    expect(within(dlg).getByTestId("scope-new-model").textContent).toContain("Criar novo modelo a partir deste");
    expect(within(dlg).getByTestId("scope-global").textContent).toContain("Editar globalmente");
    expect(within(dlg).queryByTestId("scope-product")).not.toBeInTheDocument();
    await waitFor(() => expect(within(dlg).getByTestId("model-impact").textContent).toContain("usado em 3 etapas, em 2 produtos"));
    expect(within(dlg).getByTestId("model-impact").textContent).toContain("2 vínculos editáveis (versões em rascunho) serão atualizados");
    expect(within(dlg).getByTestId("model-impact").textContent).toContain("1 está em versão publicada: não muda sozinho");
    fireEvent.click(within(dlg).getByTestId("scope-new-model"));
    await waitFor(() => expect(calls.updateStep?.length).toBe(1));
    expect(calls.updateStep[0][0]).toBe("st1");
    expect(calls.updateStep[0][1]).toMatchObject({ scope: "new_model", draft: false });
    expect(calls.updateStep[0][1].confirm_model_update).toBeUndefined();
  });

  it("'Editar globalmente' pede uma confirmação com o impacto e só então manda scope model + confirmação", async () => {
    mountEmbedded();
    await screen.findByTestId("step-edit-form", {}, { timeout: 6000 });
    fireEvent.click(screen.getByRole("button", { name: "Concluir e salvar etapa" }));
    const dlg = await screen.findByTestId("model-scope-dialog");
    fireEvent.click(within(dlg).getByTestId("scope-global"));
    const conf = await screen.findByTestId("model-scope-confirm");
    expect(calls.updateStep).toBeUndefined(); // nada gravado antes de confirmar
    await waitFor(() => expect(within(conf).getByTestId("model-impact").textContent).toContain("2 vínculos editáveis"));
    expect(conf.textContent).toContain("nunca");
    fireEvent.click(within(conf).getByTestId("model-scope-confirm-yes"));
    await waitFor(() => expect(calls.updateStep?.length).toBe(1));
    expect(calls.updateStep[0][1]).toMatchObject({ scope: "model", confirm_model_update: true });
  });

  it("uso numa versão PUBLICADA: aviso claro e nada de edição (versão publicada nunca muda sozinha)", async () => {
    version.state = "publicada"; version.is_published_current = true; product.published_version_id = "v1";
    mountEmbedded({ kind: "task", modelId: 121, stepId: undefined });
    expect((await screen.findByTestId("embedded-model-locked", {}, { timeout: 5000 })).textContent).toContain("versão publicada");
    expect(screen.queryByTestId("step-edit-btn")).not.toBeInTheDocument();
  });

  it("o botão Fechar do banner avisa quem abriu", async () => {
    const onClose = vi.fn();
    mountEmbedded({ kind: "task", modelId: 121, stepId: undefined, onClose });
    fireEvent.click(await screen.findByTestId("embedded-model-close", {}, { timeout: 5000 }));
    expect(onClose).toHaveBeenCalled();
  });
});
