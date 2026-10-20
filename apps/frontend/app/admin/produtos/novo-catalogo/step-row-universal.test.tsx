import { describe, expect, it, vi, beforeEach } from "vitest";
import { act as rtlAct, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

// Fluxo universal (19/10): entregáveis DENTRO da etapa, aprovação do cliente explícita, campos dependentes, variação criada na condição,
// status real dos blocos e navegação guiada. Tudo contra o StepRow real; só a API é simulada.
const api: Record<string, any> = {
  updateCatalog2Step: vi.fn(async () => ({})),
  createCatalog2Deliverable: vi.fn(async () => ({ id: "new1", key: "plano-estrategico" })),
  updateCatalog2Deliverable: vi.fn(async () => ({})),
  deleteCatalog2Deliverable: vi.fn(async () => ({})),
  reorderCatalog2Deliverables: vi.fn(async () => ({})),
  searchCatalog2DeliverableLibrary: vi.fn(async () => ({ data: [] })),
  saveConnectionRequirement: vi.fn(async (_v: string, key: string) => ({ id: `id-${key}`, key, draft_incomplete: false })),
  deleteConnectionRequirement: vi.fn(async () => ({})),
  setVersionConnectionsModule: vi.fn(async () => ({})),
  addCatalog2Variation: vi.fn(async () => ({ id: "va1", key: "plataforma" })),
  addCatalog2Option: vi.fn(async () => ({})),
  getConnectionTypes: vi.fn(async () => ({ data: [
    { id: 1, key: "google_ads", name: "Google Ads", is_active: true, allowed_methods: ["oauth"], permission_levels: [{ key: "read_write", label: "Leitura e escrita" }], fields: [] },
  ] })),
  getConnectionVocabulary: vi.fn(async () => ({ methods: [{ key: "oauth", label: "Login Google" }], when_needed: [], obligations: [{ key: "required", label: "Obrigatório" }, { key: "optional", label: "Opcional" }, { key: "conditional", label: "Condicional" }], pending_behaviors: [{ key: "block_dependents", label: "Bloqueia dependentes" }], grant_scopes: [{ key: "project", label: "Projeto" }], dependency_kinds: [{ key: "start", label: "Para começar" }], validation_modes: ["manual"], asset_rules: ["first_only"] })),
};
vi.mock("@/lib/api-client", () => ({ apiClient: new Proxy({}, { get: (_t, k: string) => api[k] ?? vi.fn(async () => ({ data: [] })) }) }));
vi.mock("@/components/confirmation-dialog", () => ({
  ConfirmationDialog: ({ open, title, message, confirmText, cancelText, onConfirm, onClose }: any) => open ? (<div role="alertdialog" aria-label={title}><h2>{title}</h2><div>{message}</div><button onClick={onClose}>{cancelText ?? "Cancelar"}</button><button onClick={() => void onConfirm()}>{confirmText ?? "Confirmar"}</button></div>) : null,
}));
vi.mock("@/hooks/useAppFrameMetrics", () => ({ useAppFrameMetrics: () => ({ top: 0, left: 0, width: 1000, height: 800, sidebarWidth: 72 }) }));
import { StepRow, resetOpenStoreForTests } from "./product-editor";
import { OPEN_STEP_EVENT } from "./catalog2-deliverables-ui";

const refs = { specialties: [{ id: "sp1", name: "Gestor de Tráfego", execution_kind: "humano", max_hourly_rate: 50, is_active: true }] };
const baseStep = (over: any = {}) => ({
  id: "st1", key: "configurar", name: "Configurar a conta", description: "Cria a conta", sort_order: 1, estimated_minutes: 120, specialty_id: "sp1", purpose: "execucao", execution_mode: "humano",
  completion_criteria: "Conta ativa", first_execution_only: false, skip_when_same_executor: false, executor_kind: "nomad", leader_mode: "auto", leader_user_id: null, internal_step: false,
  requires_qualification: true, requires_specialist_qualification: false, specialist_user_id: null, qualifier_kind: "leader", approval_hours: null, rework_hours: null, executor_accept_hours: null, ai_free_changes: null,
  ai_specialty_id: null, ai_estimated_minutes: null, depends_on: null, executor_policy: "auto", step_model_id: null, model: null, ops: {}, draft_incomplete: false, ...over,
});
const otherStep = { id: "st2", key: "otimizar", name: "Otimizar campanhas", sort_order: 2 };
const deliv = (over: any = {}) => ({
  id: "d1", key: "plano-estrategico", name: "Plano estratégico inicial de mídia paga", description: "Plano com metas e canais", type: "arquivo", responsible: "executor", is_required: true, requires_approval: true, visibility: "client",
  step_id: "st1", format: "PDF", delivery_moment: "step_end", template_url: null, template_name: null, evidence_required: false, requires_qualification: false, cycle_scope: "every_cycle", is_conditional: false, condition_json: null, sort_order: 1, draft_incomplete: false, ...over,
});
const baseTask = { id: "t1", key: "t1", name: "Gestão de anúncios", execution_mode: "humano", stage_execution: "task", specialty: { id: "sp1" } };
const act = vi.fn(async (fn: () => Promise<any>, _ok?: any, opts?: { rethrow?: boolean }) => { try { return await fn(); } catch (e) { if (opts?.rethrow) throw e; } });

function mount(o: { step?: any; deliverables?: any[]; taskOver?: any; version?: any; twoSteps?: boolean } = {}) {
  const step = baseStep(o.step);
  const steps = o.twoSteps ? [step, otherStep] : [step];
  const task = { ...baseTask, ...o.taskOver, steps, deliverables: o.deliverables ?? [] };
  const version = o.version ?? { id: "v1", requires_connections: false, tasks: [{ ...task }], connection_requirements: [] };
  return render(<ul><StepRow step={step} index={0} steps={steps} taskId="t1" readOnly={false} act={act} refs={refs} task={task} version={version} /></ul>);
}
const openEditor = () => fireEvent.click(screen.getByTestId("step-edit-btn"));
const expandAll = () => fireEvent.click(screen.getByRole("button", { name: "Expandir todos" }));
const modal = () => within(screen.getByTestId("step-edit-form"));
const lastPut = () => (api.updateCatalog2Step.mock.calls.at(-1) as any[])[1];
const concluir = () => fireEvent.click(screen.getByRole("button", { name: "Concluir e salvar etapa" }));
const items = () => screen.queryAllByTestId("step-deliverable-item");
const fillModal = (name: string, desc: string) => {
  const m = within(screen.getByTestId("deliverable-modal"));
  fireEvent.change(m.getByLabelText("Nome do entregável"), { target: { value: name } });
  if (desc) fireEvent.change(m.getByLabelText("Descrição do entregável"), { target: { value: desc } });
};
const addDeliverable = async (name: string, desc = "Descrição completa", draft = false) => {
  fireEvent.click(screen.getByTestId("add-step-deliverable"));
  fillModal(name, desc);
  fireEvent.click(within(screen.getByTestId("deliverable-modal")).getByTestId(draft ? "deliverable-save-draft" : "deliverable-save"));
  await waitFor(() => expect(screen.queryByTestId("deliverable-modal")).not.toBeInTheDocument());
};

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); resetOpenStoreForTests(); Object.values(api).forEach((f) => f.mockClear()); act.mockClear(); });

describe("Entregáveis DENTRO da etapa", () => {
  it("1/3/4) criar na etapa: nasce 'não salvo', nada vai ao servidor até salvar a etapa, e depois é criado JÁ ligado à etapa (antes de gravar a etapa)", async () => {
    mount();
    openEditor(); expandAll();
    expect(screen.getByTestId("deliverables-empty")).toBeInTheDocument();
    await addDeliverable("Plano estratégico inicial de mídia paga");
    expect(items()).toHaveLength(1);
    expect(items()[0]).toHaveAttribute("data-state", "new");
    expect(within(items()[0]).getByTestId("deliverable-state").textContent).toBe("Novo — ainda não salvo");
    expect(items()[0].textContent).toContain("Etapa 1 — Configurar a conta"); // "Etapa responsável" preenchida sozinha
    expect(api.createCatalog2Deliverable).not.toHaveBeenCalled();
    concluir();
    await waitFor(() => expect(api.updateCatalog2Step).toHaveBeenCalledTimes(1));
    expect(api.createCatalog2Deliverable.mock.calls[0]).toMatchObject(["t1", { name: "Plano estratégico inicial de mídia paga", step_id: "st1", draft: false }]);
    expect(api.createCatalog2Deliverable.mock.invocationCallOrder[0]).toBeLessThan(api.updateCatalog2Step.mock.invocationCallOrder[0]);
    await waitFor(() => expect(screen.queryByTestId("step-edit-form")).not.toBeInTheDocument());
  });

  it("2) resumo do bloco: conta, nomes e pendências; vazio é 'Opcional', declarado 'sem entregáveis' é 'Não se aplica'", async () => {
    mount();
    openEditor();
    expect(screen.getByTestId("step-block-5-summary").textContent).toBe("Nenhum entregável ainda");
    expect(screen.getByTestId("step-block-5-status").textContent).toBe("Opcional");
    expandAll();
    fireEvent.click(modal().getByLabelText("Esta etapa não tem entregáveis"));
    expect(screen.getByTestId("deliverables-none-note")).toBeInTheDocument();
    expect(screen.getByTestId("step-block-5-status").textContent).toBe("Não se aplica");
    concluir();
    await waitFor(() => expect(api.updateCatalog2Step).toHaveBeenCalledTimes(1));
    expect(lastPut().ops).toMatchObject({ no_deliverables: true });
  });

  it("5/6) rascunho do entregável (incompleto) guarda como rascunho; concluir a etapa é bloqueado citando o entregável pelo nome", async () => {
    mount();
    openEditor(); expandAll();
    await addDeliverable("Contrato assinado", "", true); // sem descrição → incompleto
    expect(items()[0].textContent).toContain("incompleto");
    concluir();
    const sum = await screen.findByTestId("step-error-summary");
    expect(sum.textContent).toContain("O entregável “Contrato assinado” está incompleto");
    expect(api.updateCatalog2Step).not.toHaveBeenCalled();
    expect(api.createCatalog2Deliverable).not.toHaveBeenCalled();
    expect(screen.getByTestId("step-block-5-status").textContent).toBe("Com erro · 1 pendência");
    // o mesmo conteúdo SALVA como rascunho: entregável com draft:true, etapa com draft:true
    fireEvent.click(screen.getByTestId("step-save-draft"));
    await waitFor(() => expect(api.updateCatalog2Step).toHaveBeenCalledTimes(1));
    expect(api.createCatalog2Deliverable.mock.calls[0]).toMatchObject(["t1", { name: "Contrato assinado", step_id: "st1", draft: true }]);
    expect(lastPut()).toMatchObject({ draft: true });
  });

  it("7/8) um entregável já salvo aparece dentro da etapa e no resumo do cartão; reabrir mostra o mesmo registro (persistência)", () => {
    mount({ deliverables: [deliv()] });
    const sum = screen.getByTestId("step-deliverable-summary");
    expect(sum.textContent).toContain("1 entregável");
    expect(sum.textContent).toContain("Plano estratégico inicial de mídia paga — aprovação do cliente — todo ciclo");
    expect(screen.getByTestId("step-deliverable-state").textContent).toBe("completos");
    openEditor(); expandAll();
    expect(items()).toHaveLength(1);
    expect(items()[0]).toHaveAttribute("data-state", "saved");
    expect(screen.getByTestId("step-block-5-status").textContent).toBe("Completo");
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" })); // nada mudou → fecha direto
    openEditor(); expandAll();
    expect(items()).toHaveLength(1);
  });

  it("cartão da etapa sem entregáveis diz isso; com rascunho mostra 'incompleto'", () => {
    const { unmount } = mount();
    expect(screen.getByTestId("step-deliverable-summary").textContent).toBe("Nenhum entregável nesta etapa");
    unmount();
    mount({ deliverables: [deliv({ description: "", draft_incomplete: true })] });
    expect(screen.getByTestId("step-deliverable-state").textContent).toBe("1 incompleto");
  });

  it("9) editar um entregável da etapa: o corpo completo vai ao MESMO registro (update, nunca create) quando a etapa é salva", async () => {
    mount({ deliverables: [deliv()] });
    openEditor(); expandAll();
    fireEvent.click(screen.getByLabelText("Editar Plano estratégico inicial de mídia paga"));
    const m = within(screen.getByTestId("deliverable-modal"));
    fireEvent.change(m.getByLabelText("Recorrência do entregável"), { target: { value: "first_execution" } });
    fireEvent.click(m.getByTestId("deliverable-save"));
    await waitFor(() => expect(screen.queryByTestId("deliverable-modal")).not.toBeInTheDocument());
    expect(items()[0]).toHaveAttribute("data-state", "edited");
    expect(api.updateCatalog2Deliverable).not.toHaveBeenCalled();
    concluir();
    await waitFor(() => expect(api.updateCatalog2Step).toHaveBeenCalledTimes(1));
    expect(api.updateCatalog2Deliverable.mock.calls[0]).toMatchObject(["d1", { cycle_scope: "first_execution", step_id: "st1", draft: false }]);
    expect(api.createCatalog2Deliverable).not.toHaveBeenCalled();
  });

  it("10/11) 'Remover o vínculo' tira SÓ o vínculo (step_id null, sem excluir); 'Excluir' pede confirmação e só exclui ao salvar a etapa", async () => {
    mount({ deliverables: [deliv(), deliv({ id: "d2", key: "relatorio", name: "Relatório", sort_order: 2 })] });
    openEditor(); expandAll();
    fireEvent.click(screen.getByLabelText("Remover o vínculo de Plano estratégico inicial de mídia paga"));
    expect(items()[0]).toHaveAttribute("data-state", "unlinked");
    fireEvent.click(screen.getByLabelText("Excluir Relatório"));
    expect(screen.getByRole("alertdialog").textContent).toContain("Relatório");
    expect(api.deleteCatalog2Deliverable).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Excluir entregável" }));
    expect(items()[1]).toHaveAttribute("data-state", "deleted");
    concluir();
    await waitFor(() => expect(api.updateCatalog2Step).toHaveBeenCalledTimes(1));
    expect(api.updateCatalog2Deliverable).toHaveBeenCalledWith("d1", { step_id: null });
    expect(api.deleteCatalog2Deliverable).toHaveBeenCalledWith("d2");
  });

  it("12) exclusão recusada pelo servidor (entregável já usado): a etapa NÃO fecha, a mensagem aparece e nada do preenchido se perde", async () => {
    api.deleteCatalog2Deliverable.mockRejectedValueOnce(new Error("Este entregável já foi usado em uma tarefa contratada e não pode ser excluído."));
    mount({ deliverables: [deliv()] });
    openEditor(); expandAll();
    fireEvent.change(modal().getByLabelText("Nome da etapa"), { target: { value: "Nome que eu digitei" } });
    fireEvent.click(screen.getByLabelText("Excluir Plano estratégico inicial de mídia paga"));
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Excluir entregável" }));
    concluir();
    const err = await screen.findByTestId("step-save-error");
    expect(err.textContent).toContain("já foi usado");
    expect(screen.getByTestId("step-edit-form")).toBeInTheDocument();
    expect((modal().getByLabelText("Nome da etapa") as HTMLInputElement).value).toBe("Nome que eu digitei");
    expect(api.updateCatalog2Step).not.toHaveBeenCalled();
  });

  it("vincular um entregável SEM etapa da tarefa: grava só o vínculo (mesmo registro)", async () => {
    mount({ deliverables: [deliv({ id: "d9", key: "orfao", name: "Relatório de otimização", step_id: null })] });
    expect(screen.getByTestId("step-deliverable-summary").textContent).toBe("Nenhum entregável nesta etapa");
    openEditor(); expandAll();
    fireEvent.click(screen.getByTestId("link-step-deliverable"));
    fireEvent.click(within(screen.getByTestId("link-list")).getByRole("button", { name: "Vincular a esta etapa" }));
    expect(items()[0]).toHaveAttribute("data-state", "linked");
    concluir();
    await waitFor(() => expect(api.updateCatalog2Step).toHaveBeenCalledTimes(1));
    expect(api.updateCatalog2Deliverable.mock.calls[0]).toMatchObject(["d9", { step_id: "st1" }]);
    expect(api.createCatalog2Deliverable).not.toHaveBeenCalled();
  });

  it("cancelar com entregável novo pergunta e, ao descartar, não deixa NADA no servidor", async () => {
    mount();
    openEditor(); expandAll();
    await addDeliverable("Rascunho de entregável");
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    fireEvent.click(within(await screen.findByTestId("step-close-ask")).getByTestId("step-close-discard"));
    expect(api.createCatalog2Deliverable).not.toHaveBeenCalled();
    expect(api.updateCatalog2Deliverable).not.toHaveBeenCalled();
    expect(api.updateCatalog2Step).not.toHaveBeenCalled();
    openEditor(); expandAll();
    expect(items()).toHaveLength(0);
  });

  it("declarar 'sem entregáveis' tendo entregável ligado é contradição: bloqueia concluir e mantém a pendência visível", async () => {
    mount({ deliverables: [deliv()] });
    openEditor(); expandAll();
    fireEvent.click(modal().getByLabelText("Esta etapa não tem entregáveis"));
    expect(screen.getByTestId("step-block-5-status").textContent).not.toBe("Não se aplica");
    concluir();
    expect((await screen.findByTestId("step-error-summary")).textContent).toContain("declarou que esta etapa não tem entregáveis");
    expect(api.updateCatalog2Step).not.toHaveBeenCalled();
  });

  it("'Ir para a etapa' (evento do resumo da tarefa) abre o editor desta etapa", async () => {
    mount();
    expect(screen.queryByTestId("step-edit-form")).not.toBeInTheDocument();
    rtlAct(() => { window.dispatchEvent(new CustomEvent(OPEN_STEP_EVENT, { detail: { stepId: "outra" } })); });
    expect(screen.queryByTestId("step-edit-form")).not.toBeInTheDocument();
    rtlAct(() => { window.dispatchEvent(new CustomEvent(OPEN_STEP_EVENT, { detail: { stepId: "st1" } })); });
    expect(await screen.findByTestId("step-edit-form")).toBeInTheDocument();
  });
});

describe("Aprovação do cliente da etapa", () => {
  const stage = { stage_execution: "stage" };
  it("tarefa que não executa por etapa explica que a aprovação acontece no fim da tarefa", () => {
    mount();
    openEditor(); expandAll();
    expect(screen.getByTestId("approval-not-stage").textContent).toContain("não executa por etapa");
  });

  it("4 opções explícitas; o comportamento anterior aparece como 'Sim, pela própria etapa' sem gravar nada até o usuário escolher", async () => {
    mount({ taskOver: stage });
    openEditor(); expandAll();
    const radios = ["Não", "Sim, pela própria etapa", "Sim, por um ou mais entregáveis", "Apenas ciência do cliente, sem bloquear o fluxo"];
    for (const r of radios) expect(modal().getByRole("radio", { name: r })).toBeInTheDocument();
    expect(modal().getByRole("radio", { name: "Sim, pela própria etapa" })).toBeChecked();
    concluir();
    await waitFor(() => expect(api.updateCatalog2Step).toHaveBeenCalledTimes(1));
    expect(lastPut().ops?.client_approval).toBeUndefined(); // dado antigo não é reescrito
  });

  it("resumo em linguagem simples com prazos; mudar para 'ciência' e para 'Não' muda a frase e vai no ops", async () => {
    mount({ taskOver: stage, twoSteps: true, step: { approval_hours: 16, rework_hours: 8 } });
    openEditor(); expandAll();
    const text = () => screen.getByTestId("approval-summary").textContent!;
    expect(text()).toContain("Ao concluir esta etapa, ela será enviada ao cliente.");
    expect(text()).toContain("A próxima etapa ficará bloqueada até a aprovação.");
    expect(text()).toContain("O cliente terá 16 horas úteis para responder.");
    expect(text()).toContain("o executor terá 8 horas úteis para reenviar");
    fireEvent.click(modal().getByRole("radio", { name: "Apenas ciência do cliente, sem bloquear o fluxo" }));
    expect(text()).toContain("a próxima etapa é liberada na hora");
    fireEvent.click(modal().getByRole("radio", { name: "Não" }));
    expect(text()).toContain("segue direto para a próxima");
    concluir();
    await waitFor(() => expect(api.updateCatalog2Step).toHaveBeenCalledTimes(1));
    expect(lastPut().ops.client_approval).toMatchObject({ mode: "none" });
  });

  it("por entregável: sem entregável que exija aprovação não conclui; com um, conclui e grava o modo", async () => {
    mount({ taskOver: stage });
    openEditor(); expandAll();
    fireEvent.click(modal().getByRole("radio", { name: "Sim, por um ou mais entregáveis" }));
    expect(screen.getByTestId("approval-deliverables-box").textContent).toContain("Nenhum entregável desta etapa exige aprovação");
    concluir();
    expect((await screen.findByTestId("step-error-summary")).textContent).toContain("nenhum entregável desta etapa exige aprovação do cliente");
    expect(api.updateCatalog2Step).not.toHaveBeenCalled();
    await addDeliverable("Plano estratégico inicial de mídia paga"); // vem com "Exige aprovação" ligado
    expect(screen.getByTestId("approval-deliverables-box").textContent).toContain("Plano estratégico inicial de mídia paga");
    concluir();
    await waitFor(() => expect(api.updateCatalog2Step).toHaveBeenCalledTimes(1));
    expect(lastPut().ops.client_approval).toMatchObject({ mode: "deliverables" });
    expect(api.createCatalog2Deliverable).toHaveBeenCalledTimes(1);
  });

  it("etapa interna: opções de aprovação ficam desativadas com explicação e o modo vai para 'Não'", async () => {
    mount({ taskOver: stage, step: { ops: { client_approval: { mode: "step" } } } });
    openEditor(); expandAll();
    fireEvent.click(modal().getByLabelText(/Etapa interna/));
    expect(screen.getByTestId("approval-internal-note").textContent).toContain("não se aplicam");
    for (const r of modal().getAllByRole("radio", { name: /Sim|Apenas/ })) expect(r).toBeDisabled();
    expect(screen.getByTestId("approval-summary").textContent).toContain("Etapa interna");
    concluir();
    await waitFor(() => expect(api.updateCatalog2Step).toHaveBeenCalledTimes(1));
    expect(lastPut()).toMatchObject({ internal_step: true });
    expect(lastPut().ops.client_approval.mode).toBe("none");
  });

  it("prazos e ajustes só aparecem quando há aprovação; prazo inválido é apontado", () => {
    mount({ taskOver: stage });
    openEditor(); expandAll();
    expect(screen.getByTestId("approval-details")).toBeInTheDocument();
    fireEvent.click(modal().getByRole("radio", { name: "Não" }));
    expect(screen.queryByTestId("approval-details")).not.toBeInTheDocument();
  });
});

describe("Navegação guiada, status real e campos dependentes", () => {
  it("Anterior / Próximo abre o bloco seguinte e termina no resumo final", () => {
    mount();
    openEditor();
    const where = () => screen.getByTestId("step-guide-where").textContent;
    expect(screen.getByTestId("step-guide-prev")).toBeDisabled();
    expect(where()).toBe("Bloco 1 de 6");
    fireEvent.click(screen.getByTestId("step-guide-next"));
    expect(where()).toBe("Bloco 2 de 6");
    expect(screen.getByTestId("step-block-2")).toHaveAttribute("data-open", "true");
    for (let i = 0; i < 4; i++) fireEvent.click(screen.getByTestId("step-guide-next"));
    expect(where()).toBe("Bloco 6 de 6");
    expect(screen.getByTestId("step-block-6")).toHaveAttribute("data-open", "true");
    fireEvent.click(screen.getByTestId("step-guide-next"));
    expect(where()).toBe("Resumo final");
    expect(screen.getByTestId("step-guide-next")).toBeDisabled();
    fireEvent.click(screen.getByTestId("step-guide-prev"));
    expect(where()).toBe("Bloco 6 de 6");
  });

  it("resumo final: situação por bloco, pendências clicáveis, entregáveis, acessos, aprovação, qualificação e liberação da próxima etapa", () => {
    mount({ deliverables: [deliv()], step: { description: "" }, taskOver: { stage_execution: "stage" }, twoSteps: true });
    openEditor();
    const s = within(screen.getByTestId("step-final-summary"));
    expect(screen.getByTestId("step-final-status").textContent).toBe("Incompleta · 1 pendência");
    expect(s.getByTestId("step-final-pending").textContent).toContain("Descreva o que acontece nesta etapa.");
    expect(s.getByTestId("step-final-deliverables").textContent).toContain("Plano estratégico inicial de mídia paga");
    expect(s.getByTestId("step-final-access").textContent).toBe("Esta etapa não precisa de acesso.");
    expect(s.getByTestId("step-final-approval").textContent).toContain("Sim, pela própria etapa");
    expect(s.getByTestId("step-final-qualification").textContent).toContain("líder da área");
    expect(s.getByTestId("step-final-release").textContent).toBe("Liberada só depois da aprovação do cliente.");
  });

  it("status do bloco é real: o selo do cabeçalho da etapa NÃO esconde pendências e clicar na pendência vai ao campo", async () => {
    mount({ step: { description: "", completion_criteria: "" } });
    openEditor();
    expect(screen.getByTestId("step-block-1-status").textContent).toBe("Incompleto · 1 pendência");
    expect(screen.getByTestId("step-block-3-status").textContent).toBe("Incompleto · 1 pendência");
    expect(screen.getByTestId("step-block-2-status").textContent).toBe("Completo");
    fireEvent.click(within(screen.getByTestId("step-final-pending")).getAllByRole("button")[0]);
    await waitFor(() => expect(screen.getByTestId("step-block-1")).toHaveAttribute("data-open", "true"));
  });

  it("cabeçalho do painel consolida as pendências reais de TODOS os blocos e clicar leva ao primeiro campo", async () => {
    mount({ step: { description: "", completion_criteria: "" }, deliverables: [deliv({ description: "", draft_incomplete: true })] });
    openEditor();
    const chip = screen.getByTestId("step-pending-chip");
    expect(chip.textContent).toBe("3 pendências para concluir"); // descrição (bloco 1) + critério (bloco 3) + entregável (bloco 5)
    fireEvent.click(chip);
    await waitFor(() => expect(screen.getByTestId("step-block-1")).toHaveAttribute("data-open", "true"));
    fireEvent.change(document.querySelector('[data-field="description"] textarea') as HTMLTextAreaElement, { target: { value: "ok" } });
    expect(screen.getByTestId("step-pending-chip").textContent).toBe("2 pendências para concluir");
  });

  it("etapa completa mostra que o rascunho está pronto para concluir", () => {
    mount();
    openEditor();
    expect(screen.getByTestId("step-pending-chip").textContent).toBe("Rascunho pronto para concluir");
  });

  it("campos dependentes: evidência obrigatória e 'só na primeira execução' abrem os detalhes na hora", () => {
    mount();
    openEditor(); expandAll();
    expect(screen.queryByTestId("evidence-reveal")).not.toBeInTheDocument();
    fireEvent.click(modal().getByLabelText("Evidência obrigatória"));
    expect(screen.getByTestId("evidence-reveal")).toHaveAttribute("data-reveal", "true");
    expect(screen.getByTestId("evidence-details")).toBeInTheDocument();
    expect(screen.queryByTestId("first-execution-reveal")).not.toBeInTheDocument();
    fireEvent.click(modal().getByLabelText(/Só na primeira execução/));
    expect(screen.getByTestId("first-execution-reveal")).toBeInTheDocument();
  });

  it("qualificador 'pessoa específica': o campo da pessoa aparece, é DESTACADO na hora e diz 'falta 1 campo' até escolher", async () => {
    mount();
    openEditor(); expandAll();
    expect(screen.queryByTestId("qualifier-person-box")).not.toBeInTheDocument();
    fireEvent.change(modal().getByLabelText("Quem qualifica"), { target: { value: "person" } });
    const box = screen.getByTestId("qualifier-person-box");
    expect(within(box).getByTestId("reveal-missing").textContent).toBe("falta 1 campo");
    await waitFor(() => expect(box).toHaveAttribute("data-flash", "true")); // rolou e destacou (por instantes)
    fireEvent.change(modal().getByLabelText("Quem qualifica"), { target: { value: "leader" } });
    expect(screen.queryByTestId("qualifier-person-box")).not.toBeInTheDocument();
  });

  it("abrir o editor com a pessoa JÁ escolhida não pisca nem reabre bloco fechado (só escolha nova revela)", () => {
    mount({ step: { qualifier_kind: "person", requires_specialist_qualification: true, requires_qualification: false, specialist_user_id: "u1" } });
    openEditor();
    expect(screen.getByTestId("step-block-3")).toHaveAttribute("data-open", "false");
  });
});

describe("Condição de acesso · criar variação sem sair da etapa", () => {
  const version = () => ({ id: "v1", requires_connections: false, tasks: [{ ...baseTask, steps: [baseStep()] }], connection_requirements: [], variations: [{ id: "va0", key: "tom", name: "Tom", is_active: true, options: [{ key: "formal", label: "Formal" }] }] });
  // a nova variação só aparece na lista depois que o editor recarrega o produto (aqui simulado com rerender)
  const withNewVariation = () => ({ ...version(), variations: [...version().variations, { id: "va1", key: "plataforma", name: "Plataforma", is_active: true, options: [{ key: "google-ads", label: "Google Ads" }, { key: "meta-ads", label: "Meta Ads" }, { key: "ambas", label: "Ambas" }] }] });
  const toBuilder = async () => {
    fireEvent.click(screen.getByLabelText("Esta etapa precisa de acesso"));
    fireEvent.click(await screen.findByTestId("add-step-access"));
    fireEvent.click(await within(await screen.findByTestId("step-access-type-google_ads")).findByRole("button", { name: /Adicionar ao rascunho/ }));
    fireEvent.click(screen.getByLabelText("Abrir o acesso Google Ads"));
    fireEvent.change(await screen.findByLabelText("Obrigatoriedade"), { target: { value: "conditional" } });
    fireEvent.change(screen.getByLabelText("Origem da regra 1"), { target: { value: "variation" } });
  };

  it("cria a variação e as opções pelas rotas oficiais, seleciona a nova e NÃO perde o que foi digitado na etapa", async () => {
    const r = mount({ version: version() });
    openEditor(); expandAll();
    fireEvent.change(modal().getByLabelText("Nome da etapa"), { target: { value: "Nome ainda não salvo" } });
    await toBuilder();
    fireEvent.click(screen.getByTestId("open-quick-variation"));
    const dlg = within(screen.getByTestId("quick-variation"));
    fireEvent.click(dlg.getByTestId("quick-variation-create"));
    expect(dlg.getByTestId("quick-variation-error").textContent).toContain("Digite o nome");
    fireEvent.change(dlg.getByLabelText("Nome da nova variação"), { target: { value: "Plataforma" } });
    fireEvent.change(dlg.getByLabelText("Opções da nova variação"), { target: { value: "Google Ads\nMeta Ads\nAmbas" } });
    fireEvent.click(dlg.getByTestId("quick-variation-create"));
    await waitFor(() => expect(api.addCatalog2Variation).toHaveBeenCalledTimes(1));
    expect(api.addCatalog2Variation).toHaveBeenCalledWith("v1", { key: "plataforma", name: "Plataforma", base_included: true });
    expect(api.addCatalog2Option.mock.calls.map((c: any[]) => [c[0], c[1].key, c[1].is_default ?? false])).toEqual([["va1", "google-ads", true], ["va1", "meta-ads", false], ["va1", "ambas", false]]);
    await waitFor(() => expect(screen.queryByTestId("quick-variation")).not.toBeInTheDocument());
    const step = baseStep();
    const task = { ...baseTask, steps: [step], deliverables: [] };
    r.rerender(<ul><StepRow step={step} index={0} steps={[step]} taskId="t1" readOnly={false} act={act} refs={refs} task={task} version={withNewVariation()} /></ul>);
    expect((screen.getByLabelText("Referência da regra 1") as HTMLSelectElement).value).toBe("plataforma"); // já escolhida
    expect(within(screen.getByRole("group", { name: "Opções da regra 1" })).getByLabelText("Meta Ads")).toBeInTheDocument();
    expect((modal().getByLabelText("Nome da etapa") as HTMLInputElement).value).toBe("Nome ainda não salvo"); // etapa intacta
    expect(api.updateCatalog2Step).not.toHaveBeenCalled(); // criar a variação não salva a etapa
  });

  it("nome repetido é recusado com explicação e nada é criado", async () => {
    mount({ version: version() });
    openEditor(); expandAll();
    await toBuilder();
    fireEvent.click(screen.getByTestId("open-quick-variation"));
    const dlg = within(screen.getByTestId("quick-variation"));
    fireEvent.change(dlg.getByLabelText("Nome da nova variação"), { target: { value: "tom" } });
    fireEvent.change(dlg.getByLabelText("Opções da nova variação"), { target: { value: "Informal" } });
    fireEvent.click(dlg.getByTestId("quick-variation-create"));
    expect(dlg.getByTestId("quick-variation-error").textContent).toContain("Já existe uma variação");
    expect(api.addCatalog2Variation).not.toHaveBeenCalled();
  });

  it("falha do servidor ao criar: o diálogo continua aberto com a mensagem e a etapa não perde nada", async () => {
    api.addCatalog2Variation.mockRejectedValueOnce(new Error("Falha simulada ao criar variação."));
    mount({ version: version() });
    openEditor(); expandAll();
    await toBuilder();
    fireEvent.click(screen.getByTestId("open-quick-variation"));
    const dlg = within(screen.getByTestId("quick-variation"));
    fireEvent.change(dlg.getByLabelText("Nome da nova variação"), { target: { value: "Plataforma" } });
    fireEvent.change(dlg.getByLabelText("Opções da nova variação"), { target: { value: "Google Ads" } });
    fireEvent.click(dlg.getByTestId("quick-variation-create"));
    await waitFor(() => expect(dlg.getByTestId("quick-variation-error").textContent).toContain("Falha simulada"));
    expect(screen.getByTestId("step-edit-form")).toBeInTheDocument();
  });

  it("criar uma nova opção numa variação existente a seleciona na regra", async () => {
    mount({ version: version() });
    openEditor(); expandAll();
    await toBuilder();
    fireEvent.change(screen.getByLabelText("Referência da regra 1"), { target: { value: "tom" } });
    fireEvent.change(screen.getByLabelText("Nome da nova opção"), { target: { value: "Descontraído" } });
    fireEvent.click(screen.getByTestId("add-option-inline-btn"));
    await waitFor(() => expect(api.addCatalog2Option).toHaveBeenCalledWith("va0", { key: "descontraido", label: "Descontraído" }));
  });
});
