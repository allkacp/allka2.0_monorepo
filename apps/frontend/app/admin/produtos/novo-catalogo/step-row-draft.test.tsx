import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const api: Record<string, any> = {
  updateCatalog2Step: vi.fn(async () => ({})),
  saveConnectionRequirement: vi.fn(async (_v: string, key: string) => ({ id: `id-${key}`, key, draft_incomplete: false })),
  deleteConnectionRequirement: vi.fn(async () => ({})),
  setVersionConnectionsModule: vi.fn(async () => ({})),
  getConnectionTypes: vi.fn(async () => ({ data: [
    { id: 1, key: "google_ads", name: "Google Ads", is_active: true, allowed_methods: ["oauth"], permission_levels: [{ key: "read_write", label: "Leitura e escrita" }], fields: [] },
    { id: 2, key: "wordpress", name: "WordPress", is_active: true, allowed_methods: ["invite"], permission_levels: [{ key: "admin", label: "Admin" }], fields: [] },
  ] })),
  getConnectionVocabulary: vi.fn(async () => ({ methods: [{ key: "oauth", label: "Login Google" }, { key: "invite", label: "Convite" }], when_needed: [], obligations: [{ key: "required", label: "Obrigatório" }, { key: "optional", label: "Opcional" }, { key: "conditional", label: "Condicional" }], pending_behaviors: [{ key: "block_dependents", label: "Bloqueia dependentes" }], grant_scopes: [{ key: "project", label: "Projeto" }], dependency_kinds: [{ key: "start", label: "Para começar" }], validation_modes: ["manual"], asset_rules: ["first_only"] })),
};
vi.mock("@/lib/api-client", () => ({ apiClient: new Proxy({}, { get: (_t, k: string) => api[k] ?? vi.fn(async () => ({ data: [] })) }) }));
vi.mock("@/components/confirmation-dialog", () => ({
  ConfirmationDialog: ({ open, title, message, confirmText, cancelText, onConfirm, onClose }: any) => open ? (<div role="alertdialog" aria-label={title}><h2>{title}</h2><div>{message}</div><button onClick={onClose}>{cancelText ?? "Cancelar"}</button><button onClick={() => void onConfirm()}>{confirmText ?? "Confirmar"}</button></div>) : null,
}));
vi.mock("@/hooks/useAppFrameMetrics", () => ({ useAppFrameMetrics: () => ({ top: 0, left: 0, width: 1000, height: 800, sidebarWidth: 72 }) }));
import { StepRow } from "./product-editor";

const refs = { specialties: [{ id: "sp1", name: "Gestor de Tráfego", execution_kind: "humano", max_hourly_rate: 50, is_active: true }] };
const baseStep = (over: any = {}) => ({
  id: "st1", key: "configurar", name: "Configurar a conta", description: "Cria a conta", sort_order: 1, estimated_minutes: 120, specialty_id: "sp1", purpose: "execucao", execution_mode: "humano",
  completion_criteria: "Conta ativa", first_execution_only: false, skip_when_same_executor: false, executor_kind: "nomad", leader_mode: "auto", leader_user_id: null, internal_step: false,
  requires_qualification: true, requires_specialist_qualification: false, specialist_user_id: null, qualifier_kind: "leader", approval_hours: null, rework_hours: null, executor_accept_hours: null, ai_free_changes: null,
  ai_specialty_id: null, ai_estimated_minutes: null, depends_on: null, executor_policy: "auto", step_model_id: null, model: null, ops: {}, draft_incomplete: false, ...over,
});
const task = { id: "t1", key: "t1", name: "Gestão de anúncios", execution_mode: "humano", stage_execution: "task", specialty: { id: "sp1" }, steps: [] as any[], deliverables: [] };
const mkVersion = (reqs: any[] = []) => ({ id: "v1", requires_connections: reqs.length > 0, tasks: [{ ...task, steps: [{ key: "configurar", name: "Configurar a conta", ops: {} }] }], connection_requirements: reqs });
const act = vi.fn(async (fn: () => Promise<any>, _ok?: any, opts?: { rethrow?: boolean }) => { try { return await fn(); } catch (e) { if (opts?.rethrow) throw e; } });

function mount(over: any = {}, reqs: any[] = [], readOnly = false, taskOver: any = {}) {
  const step = baseStep(over);
  return render(<ul><StepRow step={step} index={0} steps={[step]} taskId="t1" readOnly={readOnly} act={act} refs={refs} task={{ ...task, ...taskOver, steps: [step] }} version={mkVersion(reqs)} /></ul>);
}
const descField = () => document.querySelector('[data-field="description"] textarea') as HTMLTextAreaElement;
const openEditor = () => fireEvent.click(screen.getByTestId("step-edit-btn"));
const modal = () => within(screen.getByTestId("step-edit-form"));
const lastPut = () => (api.updateCatalog2Step.mock.calls.at(-1) as any[])[1];
const fillAll = () => {
  fireEvent.change(modal().getByLabelText("Nome da etapa"), { target: { value: "Configurar a conta" } });
};
const serverReq = (over: any = {}) => ({
  id: "r1", key: "ga_1", label: null, connection_type: { id: 1, key: "google_ads", name: "Google Ads", allowed_methods: ["oauth"], permission_levels: [{ key: "read_write", label: "Leitura e escrita" }] },
  when_needed: "before_step", when_task_key: "t1", when_step_key: "configurar", condition_text: null, obligation: "required", method: "oauth", permission_level: "read_write", pending_behavior: "block_dependents",
  advanced: { reason: null, instructions: null, default_grant_scope: "project", validation_mode: "manual", asset_rule: "first_only", revalidate_days: null, light_check: false, reminder_interval_hours: null, reminder_limit: null, escalate_after_reminders: null, visible_to_client: true },
  shared_with_steps: false, dependents: [{ task_key: "t1", step_key: "configurar", kind: "start" }], activation: { mode: "manual", triggers: [] }, draft_incomplete: false, ...over,
});

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); Object.values(api).forEach((f) => f.mockClear()); act.mockClear(); });

describe("Etapa · acordeão fechado e botão Editar sempre à vista", () => {
  it("vem fechada, com o Editar no cabeçalho; marca 'Rascunho incompleto' quando for o caso", () => {
    mount({ draft_incomplete: true });
    expect(screen.getByTestId("step-edit-btn")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Abrir a etapa 1")[0]).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByTestId("step-actions")).not.toBeInTheDocument();
    expect(screen.getByTestId("step-draft-chip").textContent).toBe("Rascunho incompleto");
  });

  it("em somente leitura não há botão Editar", () => {
    mount({}, [], true);
    expect(screen.queryByTestId("step-edit-btn")).not.toBeInTheDocument();
  });
});

describe("Painel da etapa · Salvar rascunho x Concluir", () => {
  it("abre com 6 blocos em acordeão TODOS FECHADOS, cada um com resumo; botões de rodapé corretos", () => {
    mount();
    openEditor();
    for (const n of [1, 2, 3, 4, 5, 6]) expect(screen.getByTestId(`step-block-${n}`)).toBeInTheDocument();
    for (const n of [1, 2, 3, 4, 5, 6]) expect(screen.getByTestId(`step-block-${n}`)).toHaveAttribute("data-open", "false");
    expect(screen.getByTestId("step-block-1-summary").textContent).toContain("Configurar a conta");
    expect(screen.getByTestId("step-block-3-summary").textContent).toContain("Conta ativa");
    expect(screen.getByTestId("step-block-5-summary").textContent).toBe("Nenhum entregável ainda");
    expect(screen.getByTestId("step-block-6-summary").textContent).toBe("Esta etapa não precisa de acesso");
    expect(screen.getByTestId("step-block-6-status").textContent).toBe("Não se aplica");
    expect(screen.getByTestId("step-save-draft").textContent).toBe("Salvar rascunho da etapa");
    expect(screen.getByRole("button", { name: "Concluir e salvar etapa" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Expandir todos" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Expandir todos" }));
    for (const n of [1, 2, 3, 4, 5, 6]) expect(screen.getByTestId(`step-block-${n}`)).toHaveAttribute("data-open", "true");
  });

  it("1) etapa COMPLETAMENTE vazia salva como rascunho: sem validar nada, manda draft e escopo do produto, e a tela continua aberta", async () => {
    mount({ name: "Configurar a conta", description: "", estimated_minutes: null, specialty_id: null, completion_criteria: "" });
    openEditor();
    fireEvent.change(modal().getByLabelText("Nome da etapa"), { target: { value: "" } });
    fireEvent.click(screen.getByTestId("step-save-draft"));
    await waitFor(() => expect(api.updateCatalog2Step).toHaveBeenCalledTimes(1));
    expect(api.updateCatalog2Step.mock.calls[0][0]).toBe("st1");
    expect(lastPut()).toMatchObject({ draft: true, scope: "product", name: "", description: null, estimated_minutes: null, specialty_id: null });
    expect(screen.getByTestId("step-edit-form")).toBeInTheDocument();
    expect(await screen.findByTestId("step-draft-note")).toBeInTheDocument();
    expect(screen.queryByTestId("step-error-summary")).not.toBeInTheDocument();
  });

  it("2/3) etapa parcialmente preenchida: tudo o que foi digitado vai no rascunho, que pode ser fechado sem confirmação e reaberto", async () => {
    mount({ description: "", completion_criteria: "" });
    openEditor();
    fireEvent.change(modal().getByLabelText("Nome da etapa"), { target: { value: "Etapa em andamento" } });
    fireEvent.click(screen.getByRole("button", { name: "Expandir todos" }));
    fireEvent.change(modal().getByPlaceholderText("Quando esta etapa pode ser considerada concluída?"), { target: { value: "Quando o pixel disparar" } });
    fireEvent.click(screen.getByTestId("step-save-draft"));
    await waitFor(() => expect(api.updateCatalog2Step).toHaveBeenCalledTimes(1));
    expect(lastPut()).toMatchObject({ draft: true, name: "Etapa em andamento", completion_criteria: "Quando o pixel disparar" });
    // depois do rascunho salvo não há mais alteração pendente: fechar não pergunta nada
    await screen.findByTestId("step-draft-note");
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByTestId("step-close-ask")).not.toBeInTheDocument();
    expect(screen.queryByTestId("step-edit-form")).not.toBeInTheDocument();
  });

  it("4/6) concluir com campos obrigatórios faltando: NÃO grava, NÃO fecha, não apaga nada, destaca e explica", async () => {
    mount({ description: "", specialty_id: null, estimated_minutes: null, completion_criteria: "" }, [], false, { specialty: null });
    openEditor();
    fireEvent.change(modal().getByLabelText("Nome da etapa"), { target: { value: "Etapa que eu digitei" } });
    fireEvent.click(screen.getByRole("button", { name: "Concluir e salvar etapa" }));
    expect(api.updateCatalog2Step).not.toHaveBeenCalled();
    const summary = await screen.findByTestId("step-error-summary");
    expect(summary.textContent).toContain("Descreva o que acontece nesta etapa.");
    expect(summary.textContent).toContain("Escolha a especialidade da etapa.");
    expect(summary.textContent).toContain("Informe as horas estimadas");
    expect(summary.textContent).toContain("Informe o critério de conclusão");
    expect(screen.getByTestId("step-edit-form")).toBeInTheDocument();
    expect((modal().getByLabelText("Nome da etapa") as HTMLInputElement).value).toBe("Etapa que eu digitei"); // nada apagado
    // os blocos com erro abrem sozinhos e mostram "Com erro"
    expect(screen.getByTestId("step-block-1-status").textContent).toBe("Com erro · 1 pendência");
    expect(screen.getByTestId("step-block-3")).toHaveAttribute("data-open", "true");
    expect(screen.getByTestId("step-block-3-status").textContent).toBe("Com erro · 1 pendência");
    expect(screen.getByTestId("step-block-2")).toHaveAttribute("data-open", "true");
    // o campo é destacado e a mensagem aparece junto dele
    const field = descField().closest("label")!;
    expect(field).toHaveAttribute("data-invalid", "true");
    expect(within(field).getByRole("alert").textContent).toBe("Descreva o que acontece nesta etapa.");
  });

  it("7) corrige os erros e conclui: manda draft:false e a tela fecha", async () => {
    mount({ description: "", completion_criteria: "" });
    openEditor();
    fireEvent.click(screen.getByRole("button", { name: "Concluir e salvar etapa" }));
    await screen.findByTestId("step-error-summary");
    fireEvent.change(descField(), { target: { value: "Cria a conta e liga o pixel" } });
    fireEvent.change(modal().getByPlaceholderText("Quando esta etapa pode ser considerada concluída?"), { target: { value: "Conta ativa" } });
    fireEvent.click(screen.getByRole("button", { name: "Concluir e salvar etapa" }));
    await waitFor(() => expect(api.updateCatalog2Step).toHaveBeenCalledTimes(1));
    expect(lastPut()).toMatchObject({ draft: false, name: "Configurar a conta", description: "Cria a conta e liga o pixel", completion_criteria: "Conta ativa" });
    expect(lastPut().scope).toBeUndefined();
    await waitFor(() => expect(screen.queryByTestId("step-edit-form")).not.toBeInTheDocument());
  });

  it("erro do servidor ao salvar: a tela NÃO fecha e o preenchimento fica", async () => {
    api.updateCatalog2Step.mockRejectedValueOnce(new Error("Falha de rede simulada."));
    mount();
    openEditor();
    fireEvent.change(modal().getByLabelText("Nome da etapa"), { target: { value: "Nome novo" } });
    fireEvent.click(screen.getByRole("button", { name: "Concluir e salvar etapa" }));
    const err = await screen.findByTestId("step-save-error");
    expect(err.textContent).toContain("Falha de rede simulada.");
    expect((modal().getByLabelText("Nome da etapa") as HTMLInputElement).value).toBe("Nome novo");
  });

  it("8) cancelar com alterações pergunta: continuar editando · salvar como rascunho · descartar", async () => {
    mount();
    openEditor();
    fireEvent.change(modal().getByLabelText("Nome da etapa"), { target: { value: "Mudei o nome" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    const ask = await screen.findByTestId("step-close-ask");
    expect(within(ask).getByTestId("step-close-continue").textContent).toBe("Continuar editando");
    expect(within(ask).getByTestId("step-close-draft").textContent).toBe("Salvar como rascunho e fechar");
    expect(within(ask).getByTestId("step-close-discard").textContent).toBe("Descartar alterações");
    // continuar editando: tudo como estava
    fireEvent.click(within(ask).getByTestId("step-close-continue"));
    expect(screen.queryByTestId("step-close-ask")).not.toBeInTheDocument();
    expect((modal().getByLabelText("Nome da etapa") as HTMLInputElement).value).toBe("Mudei o nome");
    // descartar: fecha sem gravar
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    fireEvent.click(within(await screen.findByTestId("step-close-ask")).getByTestId("step-close-discard"));
    expect(api.updateCatalog2Step).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByTestId("step-edit-form")).not.toBeInTheDocument());
    // reabrir: volta o valor salvo (o descartado não fica)
    openEditor();
    expect((modal().getByLabelText("Nome da etapa") as HTMLInputElement).value).toBe("Configurar a conta");
  });

  it("8b) cancelar sem alterações fecha direto; salvar como rascunho e fechar grava como rascunho", async () => {
    mount();
    openEditor();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByTestId("step-edit-form")).not.toBeInTheDocument();
    openEditor();
    fireEvent.change(modal().getByLabelText("Nome da etapa"), { target: { value: "Outro nome" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    fireEvent.click(within(await screen.findByTestId("step-close-ask")).getByTestId("step-close-draft"));
    await waitFor(() => expect(api.updateCatalog2Step).toHaveBeenCalledTimes(1));
    expect(lastPut()).toMatchObject({ draft: true, name: "Outro nome" });
    await waitFor(() => expect(screen.queryByTestId("step-edit-form")).not.toBeInTheDocument());
  });
});

describe("Painel da etapa · acessos em rascunho da tela", () => {
  const addGoogleAds = async () => {
    fireEvent.click(screen.getByRole("button", { name: "Expandir todos" }));
    fireEvent.click(screen.getByLabelText("Esta etapa precisa de acesso"));
    fireEvent.click(await screen.findByTestId("add-step-access"));
    fireEvent.click(await within(await screen.findByTestId("step-access-type-google_ads")).findByRole("button", { name: /Adicionar ao rascunho/ }));
  };

  it("o modal 'Adicionar acesso' tem barra de pesquisa: filtra por nome (sem acento/maiúscula), mostra a contagem e avisa quando não acha", async () => {
    mount();
    openEditor();
    fireEvent.click(screen.getByRole("button", { name: "Expandir todos" }));
    fireEvent.click(screen.getByLabelText("Esta etapa precisa de acesso"));
    fireEvent.click(await screen.findByTestId("add-step-access"));
    const box = await screen.findByTestId("access-type-search");
    expect(screen.getByTestId("access-type-count").textContent).toBe("2 acessos");
    fireEvent.change(box, { target: { value: "WORDPRESS" } });
    expect(screen.queryByTestId("step-access-type-google_ads")).not.toBeInTheDocument();
    expect(screen.getByTestId("step-access-type-wordpress")).toBeInTheDocument();
    expect(screen.getByTestId("access-type-count").textContent).toBe("1 de 2 acessos");
    fireEvent.change(box, { target: { value: "goógle" } });
    expect(screen.getByTestId("step-access-type-google_ads")).toBeInTheDocument();
    fireEvent.change(box, { target: { value: "inexistente" } });
    expect(screen.getByTestId("access-type-empty").textContent).toContain("Nenhum acesso encontrado");
    fireEvent.click(screen.getByLabelText("Limpar pesquisa"));
    expect(screen.getByTestId("step-access-type-google_ads")).toBeInTheDocument();
    expect(screen.getByTestId("step-access-type-wordpress")).toBeInTheDocument();
  });

  it("13) adicionar acesso NÃO grava nada: aparece como 'Novo — ainda não salvo' e cancelar não deixa conexão parcial", async () => {
    mount();
    openEditor();
    await addGoogleAds();
    expect(api.saveConnectionRequirement).not.toHaveBeenCalled();
    expect(api.setVersionConnectionsModule).not.toHaveBeenCalled();
    expect((await screen.findByTestId("access-state")).textContent).toBe("Novo — ainda não salvo");
    expect(screen.getByTestId("access-draft-banner").textContent).toContain("só é gravado no servidor quando você salva a etapa");
    // cancelar → confirma descartar → nada foi ao servidor
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    fireEvent.click(within(await screen.findByTestId("step-close-ask")).getByTestId("step-close-discard"));
    expect(api.saveConnectionRequirement).not.toHaveBeenCalled();
    expect(api.deleteConnectionRequirement).not.toHaveBeenCalled();
    expect(api.updateCatalog2Step).not.toHaveBeenCalled();
  });

  it("acesso incompleto não aumenta o contador de acessos configurados", async () => {
    mount();
    openEditor();
    await addGoogleAds();
    expect(screen.getByTestId("access-counter").textContent).toBe("1 acesso configurado");
    fireEvent.click(screen.getByLabelText("Abrir o acesso Google Ads"));
    fireEvent.change(await screen.findByLabelText("Obrigatoriedade"), { target: { value: "conditional" } });
    expect(screen.getByTestId("access-counter").textContent).toBe("0 acessos configurados");
    expect(screen.getByTestId("access-incomplete-count").textContent).toContain("1 incompleto");
    expect(screen.getByTestId("access-condition-builder")).toBeInTheDocument(); // o construtor aparece na hora
  });

  it("5/6) concluir com acesso condicional SEM condição: não grava, não fecha e a mensagem cita o acesso pelo nome", async () => {
    mount();
    openEditor();
    await addGoogleAds();
    fireEvent.click(screen.getByLabelText("Abrir o acesso Google Ads"));
    fireEvent.change(await screen.findByLabelText("Obrigatoriedade"), { target: { value: "conditional" } });
    fireEvent.click(screen.getByRole("button", { name: "Concluir e salvar etapa" }));
    const summary = await screen.findByTestId("step-error-summary");
    expect(summary.textContent).toContain("O acesso “Google Ads” está incompleto");
    expect(api.saveConnectionRequirement).not.toHaveBeenCalled();
    expect(api.updateCatalog2Step).not.toHaveBeenCalled();
    expect(screen.getByTestId("step-edit-form")).toBeInTheDocument();
    expect(screen.getByTestId("step-block-6-status").textContent).toBe("Com erro · 1 pendência");
    expect(screen.getByTestId("step-block-6")).toHaveAttribute("data-open", "true");
  });

  it("5b) o mesmo acesso condicional incompleto SALVA como rascunho: acesso e etapa gravados com draft:true", async () => {
    mount();
    openEditor();
    await addGoogleAds();
    fireEvent.click(screen.getByLabelText("Abrir o acesso Google Ads"));
    fireEvent.change(await screen.findByLabelText("Obrigatoriedade"), { target: { value: "conditional" } });
    fireEvent.click(screen.getByTestId("step-save-draft"));
    await waitFor(() => expect(api.updateCatalog2Step).toHaveBeenCalledTimes(1));
    expect(api.setVersionConnectionsModule).toHaveBeenCalledWith("v1", true);
    expect(api.saveConnectionRequirement).toHaveBeenCalledTimes(1);
    const [, key, body] = api.saveConnectionRequirement.mock.calls[0] as any[];
    expect(body).toMatchObject({ draft: true, obligation: "conditional", when_step_key: "configurar" });
    expect(lastPut()).toMatchObject({ draft: true });
    expect(lastPut().ops).toMatchObject({ access_scope: "some", access_keys: [key] });
  });

  it("monta a condição com listas e conclui: manda a condição como gatilhos e require_complete", async () => {
    const version = { ...mkVersion(), variations: [{ key: "plataforma", name: "Plataforma", is_active: true, options: [{ key: "google_ads", label: "Google Ads" }, { key: "ambas", label: "Ambas" }] }] };
    const step = baseStep();
    render(<ul><StepRow step={step} index={0} steps={[step]} taskId="t1" readOnly={false} act={act} refs={refs} task={{ ...task, steps: [step] }} version={version} /></ul>);
    openEditor();
    await addGoogleAds();
    fireEvent.click(screen.getByLabelText("Abrir o acesso Google Ads"));
    fireEvent.change(await screen.findByLabelText("Obrigatoriedade"), { target: { value: "conditional" } });
    // ao escolher "Condicional" o construtor já nasce com a 1ª regra (sem precisar procurar "Adicionar regra")
    expect(screen.getAllByTestId("access-condition-rule")).toHaveLength(1);
    expect(screen.getByTestId("access-condition-reveal")).toHaveAttribute("data-reveal", "true");
    expect(screen.getByTestId("reveal-missing").textContent).toBe("falta 1 campo");
    expect(screen.getByTestId("access-condition-summary-empty").textContent).toContain("Este acesso será necessário quando");
    fireEvent.change(screen.getByLabelText("Origem da regra 1"), { target: { value: "variation" } });
    fireEvent.change(screen.getByLabelText("Referência da regra 1"), { target: { value: "plataforma" } });
    const g = screen.getByRole("group", { name: "Opções da regra 1" });
    fireEvent.click(within(g).getByLabelText("Google Ads"));
    fireEvent.click(within(g).getByLabelText("Ambas"));
    fireEvent.click(screen.getByRole("button", { name: "Concluir e salvar etapa" }));
    await waitFor(() => expect(api.updateCatalog2Step).toHaveBeenCalledTimes(1));
    const body = (api.saveConnectionRequirement.mock.calls[0] as any[])[2];
    expect(body).toMatchObject({ require_complete: true, obligation: "conditional", activation_mode: "any_trigger", triggers: [{ kind: "variation", ref_key: "plataforma", ref_value: "google_ads|ambas", operator: "eq" }] });
    expect(body.draft).toBeUndefined();
    expect(lastPut()).toMatchObject({ draft: false });
  });

  it("frase ao vivo da condição: 'Este acesso será necessário quando …' e o selo some quando completa", async () => {
    const version = { ...mkVersion(), variations: [{ key: "plataforma", name: "Plataforma", is_active: true, options: [{ key: "meta_ads", label: "Meta Ads" }, { key: "ambas", label: "Ambas" }] }] };
    const step = baseStep();
    render(<ul><StepRow step={step} index={0} steps={[step]} taskId="t1" readOnly={false} act={act} refs={refs} task={{ ...task, steps: [step] }} version={version} /></ul>);
    openEditor();
    await addGoogleAds();
    fireEvent.click(screen.getByLabelText("Abrir o acesso Google Ads"));
    fireEvent.change(await screen.findByLabelText("Obrigatoriedade"), { target: { value: "conditional" } });
    fireEvent.change(screen.getByLabelText("Origem da regra 1"), { target: { value: "variation" } });
    fireEvent.change(screen.getByLabelText("Referência da regra 1"), { target: { value: "plataforma" } });
    const g = screen.getByRole("group", { name: "Opções da regra 1" });
    fireEvent.click(within(g).getByLabelText("Meta Ads"));
    fireEvent.click(within(g).getByLabelText("Ambas"));
    expect(screen.getByTestId("access-condition-summary").textContent).toBe("Este acesso será necessário quando a variação “Plataforma” é igual a Meta Ads ou Ambas.");
    expect(screen.queryByTestId("reveal-missing")).not.toBeInTheDocument();
  });

  it("remover acesso salvo é só marcar: dá para desfazer e nada vai ao servidor até salvar a etapa", async () => {
    const wp = serverReq({ id: "r2", key: "wp_1", connection_type: { id: 2, key: "wordpress", name: "WordPress", allowed_methods: ["invite"], permission_levels: [{ key: "admin", label: "Admin" }] }, method: "invite", permission_level: "admin" });
    mount({ ops: { access_scope: "some", access_keys: ["ga_1", "wp_1"] } }, [serverReq(), wp]);
    openEditor();
    fireEvent.click(screen.getByRole("button", { name: "Expandir todos" }));
    expect(screen.getByTestId("access-counter").textContent).toBe("2 acessos configurados");
    expect(screen.getAllByTestId("access-state").map((e) => e.textContent)).toEqual(["Salvo no servidor", "Salvo no servidor"]);
    fireEvent.click(screen.getByLabelText("Remover Google Ads"));
    expect(screen.getAllByTestId("access-state")[0].textContent).toBe("Será removido ao salvar a etapa");
    expect(screen.getByTestId("access-counter").textContent).toBe("1 acesso configurado");
    expect(api.deleteConnectionRequirement).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /Desfazer/ }));
    expect(screen.getAllByTestId("access-state")[0].textContent).toBe("Salvo no servidor");
    fireEvent.click(screen.getByLabelText("Remover Google Ads"));
    fireEvent.click(screen.getByRole("button", { name: "Concluir e salvar etapa" }));
    await waitFor(() => expect(api.updateCatalog2Step).toHaveBeenCalledTimes(1));
    expect(api.deleteConnectionRequirement).toHaveBeenCalledWith("r1");
    expect(lastPut().ops).toMatchObject({ access_scope: "some", access_keys: ["wp_1"] });
  });

  it("remover o ÚNICO acesso com a chave ligada: concluir avisa (adicione um acesso ou desligue a opção)", async () => {
    mount({ ops: { access_scope: "some", access_keys: ["ga_1"] } }, [serverReq()]);
    openEditor();
    fireEvent.click(screen.getByLabelText("Remover Google Ads"));
    fireEvent.click(screen.getByRole("button", { name: "Concluir e salvar etapa" }));
    expect((await screen.findByTestId("step-error-summary")).textContent).toContain("nenhum acesso foi adicionado");
    expect(api.updateCatalog2Step).not.toHaveBeenCalled();
  });

  it("acesso salvo como rascunho incompleto aparece marcado e não conta", () => {
    mount({}, [serverReq({ draft_incomplete: true, obligation: "conditional" })]);
    openEditor();
    fireEvent.click(screen.getByRole("button", { name: "Expandir todos" }));
    expect(screen.getByTestId("access-state").textContent).toBe("Rascunho incompleto");
    expect(screen.getByTestId("access-counter").textContent).toBe("0 acessos configurados");
  });
});

describe("Painel da etapa · lembra onde você estava depois do F5", () => {
  it("F5 com o painel aberto: ele reabre sozinho, com os mesmos blocos abertos; quem abriu só o 3 continua só com o 3", () => {
    const first = mount();
    openEditor();
    fireEvent.click(screen.getByRole("button", { name: /Quando a etapa termina/ }));
    expect(screen.getByTestId("step-block-3")).toHaveAttribute("data-open", "true");
    expect(screen.getByTestId("step-block-1")).toHaveAttribute("data-open", "false");
    first.unmount(); // F5 (o sessionStorage da aba continua)
    mount();
    expect(screen.getByTestId("step-edit-form")).toBeInTheDocument();
    expect(screen.getByTestId("step-block-3")).toHaveAttribute("data-open", "true");
    expect(screen.getByTestId("step-block-1")).toHaveAttribute("data-open", "false");
    expect(screen.getByTestId("step-block-2")).toHaveAttribute("data-open", "false");
  });

  it("fechou o painel (Cancelar) e deu F5: NÃO reabre", () => {
    const first = mount();
    openEditor();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    first.unmount();
    mount();
    expect(screen.queryByTestId("step-edit-form")).not.toBeInTheDocument();
  });

  it("clicar em Editar de novo começa com todos os blocos fechados (o 'aberto' de antes não vale)", () => {
    const first = mount();
    openEditor();
    fireEvent.click(screen.getByRole("button", { name: "Expandir todos" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    first.unmount();
    mount();
    openEditor();
    for (const n of [1, 2, 3, 4, 5]) expect(screen.getByTestId(`step-block-${n}`)).toHaveAttribute("data-open", "false");
  });

  it("com alterações ainda não salvas o navegador avisa antes de recarregar", () => {
    mount();
    openEditor();
    const ev = () => { const e = new Event("beforeunload", { cancelable: true }); window.dispatchEvent(e); return e.defaultPrevented; };
    expect(ev()).toBe(false);
    fireEvent.change(modal().getByLabelText("Nome da etapa"), { target: { value: "Mudei" } });
    expect(ev()).toBe(true);
  });
});

describe("Painel da etapa · F5 com a página ainda travada", () => {
  it("a página volta travada no F5 e destrava depois: o painel reabre só quando destravar (uma vez)", () => {
    sessionStorage.setItem("catalog2-open-store", "{}");
    const step = baseStep();
    const el = (readOnly: boolean) => <ul><StepRow step={step} index={0} steps={[step]} taskId="t1" readOnly={readOnly} act={act} refs={refs} task={{ ...task, steps: [step] }} version={mkVersion()} /></ul>;
    const first = render(el(false));
    openEditor();
    first.unmount();
    const again = render(el(true)); // F5: a página volta travada
    expect(screen.queryByTestId("step-edit-form")).not.toBeInTheDocument();
    again.rerender(el(false)); // destravou
    expect(screen.getByTestId("step-edit-form")).toBeInTheDocument();
  });
});
