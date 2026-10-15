import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const types = [
  { id: 1, key: "google_ads", name: "Google Ads", is_active: true, description: "Conta de anúncios", allowed_methods: ["oauth"], permission_levels: [{ key: "read_write", label: "Leitura e edição" }], fields: [{ key: "id", label: "ID da conta" }] },
  { id: 2, key: "wordpress", name: "WordPress", is_active: true, description: "Site", allowed_methods: ["api_key"], permission_levels: [{ key: "admin", label: "Administrador" }], fields: [] },
];
const vocab = { methods: [{ key: "oauth", label: "Login com a conta (OAuth)" }, { key: "api_key", label: "Chave de API" }], when_needed: [], obligations: [], pending_behaviors: [], grant_scopes: [], dependency_kinds: [], validation_modes: [], asset_rules: [] };
const save = vi.fn(async (_v: string, key: string) => ({ key }));
const api = {
  getConnectionTypes: vi.fn(async () => ({ data: types })), getConnectionVocabulary: vi.fn(async () => vocab),
  saveConnectionRequirement: (...a: unknown[]) => (save as any)(...a), setVersionConnectionsModule: vi.fn(async () => ({})), deleteConnectionRequirement: vi.fn(async () => ({})),
};
vi.mock("@/lib/api-client", () => ({ apiClient: new Proxy({}, { get: (_t, k: string) => (api as any)[k] }) }));
import { ConnectionsSection } from "./catalog2-connections-ui";

const scope = { kind: "step" as const, task: { key: "t1", name: "Tarefa" }, step: { key: "e1", name: "Etapa 1" } };
const act = async (fn: () => Promise<any>) => fn();
beforeEach(() => { save.mockClear(); api.deleteConnectionRequirement.mockClear(); });

describe("acessos da etapa: escolher da lista de tipos cadastrados", () => {
  it("lista os tipos do catálogo, adiciona o escolhido já ligado à etapa e avisa a etapa", async () => {
    const onLinked = vi.fn();
    render(<ConnectionsSection version={{ id: "v1", requires_connections: false, tasks: [], connection_requirements: [] }} readOnly={false} act={act} scope={scope} onLinked={onLinked} />);
    fireEvent.click(screen.getByLabelText("Esta etapa precisa de acesso"));
    // ligar NÃO abre a lista sozinho: aparece o botão "Adicionar acesso"
    expect(screen.queryByTestId("step-access-catalog")).toBeNull();
    fireEvent.click(await screen.findByTestId("add-step-access"));
    expect(await screen.findByTestId("step-access-catalog")).toBeTruthy();
    expect(await screen.findByTestId("step-access-type-google_ads")).toBeTruthy();
    expect(screen.getByTestId("step-access-type-wordpress").textContent).toMatch(/Chave de API/);
    fireEvent.click(screen.getByTestId("step-access-type-google_ads").querySelector("button")!);
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    const [, key, body] = save.mock.calls[0] as any[];
    expect(key).toMatch(/^google_ads_/);
    expect(body).toMatchObject({ connection_type_id: 1, method: "oauth", when_needed: "before_step", when_task_key: "t1", when_step_key: "e1", shared_with_steps: false });
    expect(body.dependents).toEqual([{ task_key: "t1", step_key: "e1", kind: "start" }]);
    await waitFor(() => expect(onLinked).toHaveBeenCalledWith(key));
  });
  it("não existe mais 'acesso herdado': mesmo com acesso geral do produto/tarefa, a etapa tem a sua lista e pode adicionar", async () => {
    const general = { id: "g1", key: "geral", label: "Site", connection_type: types[1], when_needed: "before_task", when_task_key: "t1", when_step_key: null, obligation: "required", method: "api_key", permission_level: "admin", pending_behavior: "block_dependents", advanced: {}, dependents: [{ task_key: "t1", step_key: "" }], activation: { mode: "manual", triggers: [] } };
    render(<ConnectionsSection version={{ id: "v1", requires_connections: true, tasks: [], connection_requirements: [general] }} readOnly={false} act={act} scope={scope} />);
    expect(screen.queryByText(/Acesso herdado/)).toBeNull();
    const sw = screen.getByLabelText("Esta etapa precisa de acesso") as HTMLButtonElement;
    expect(sw.disabled).toBe(false);
    fireEvent.click(sw);
    expect(await screen.findByTestId("add-step-access")).toBeTruthy();
  });
  it("acessos de outras etapas marcados como disponíveis aparecem para usar aqui, e o uso vira ops da etapa", async () => {
    const onStepOps = vi.fn();
    const other = { id: "r9", key: "ads_9", label: null, connection_type: types[0], when_task_key: "t1", when_step_key: "e0", shared_with_steps: true, obligation: "required", method: "oauth", permission_level: "read_write", advanced: {}, dependents: [], activation: { mode: "manual", triggers: [] } };
    const hidden = { ...other, id: "r8", key: "wp_8", connection_type: types[1], shared_with_steps: false };
    render(<ConnectionsSection version={{ id: "v1", requires_connections: true, tasks: [], connection_requirements: [other, hidden] }} readOnly={false} act={act} scope={scope} stepOps={null} onStepOps={onStepOps} stepNames={{ e0: "Briefing" }} />);
    fireEvent.click(screen.getByLabelText("Esta etapa precisa de acesso"));
    const box = await screen.findByTestId("shared-accesses");
    expect(box.textContent).toMatch(/Google Ads/);
    expect(box.textContent).toMatch(/da etapa Briefing/);
    expect(box.textContent).not.toMatch(/WordPress/);
    fireEvent.click(screen.getByText("Usar nesta etapa"));
    expect(onStepOps).toHaveBeenLastCalledWith({ access_scope: "some", access_keys: ["ads_9"] });
  });
  const own = (extra: Record<string, unknown> = {}) => ({ id: "r1", key: "ads_1", label: null, connection_type: types[0], when_needed: "before_step", when_task_key: "t1", when_step_key: "e1", obligation: "required", method: "oauth", permission_level: "read_write", pending_behavior: "block_dependents", advanced: { default_grant_scope: "project", validation_mode: "manual", asset_rule: "first_only" }, dependents: [{ task_key: "t1", step_key: "e1", kind: "start" }], activation: { mode: "manual", triggers: [] }, shared_with_steps: false, ...extra });

  it("desligar GUARDA os acessos (não apaga de vez) e ligar de novo traz tudo de volta", async () => {
    const onStepOps = vi.fn();
    const { rerender } = render(<ConnectionsSection version={{ id: "v1", requires_connections: true, tasks: [{ key: "t1", name: "T", steps: [{ key: "e1", name: "Etapa 1" }] }], connection_requirements: [own()] }} readOnly={false} act={act} scope={scope} stepOps={{ access_scope: "some", access_keys: ["ads_1"] }} onStepOps={onStepOps} />);
    fireEvent.click(await screen.findByLabelText("Esta etapa precisa de acesso"));
    await waitFor(() => expect(api.deleteConnectionRequirement).toHaveBeenCalledWith("r1"));
    await waitFor(() => expect(onStepOps).toHaveBeenCalled());
    const patch = onStepOps.mock.calls.at(-1)![0];
    expect(patch.access_parked.reqs[0].key).toBe("ads_1");
    expect(patch.access_parked.reqs[0].body).toMatchObject({ connection_type_id: 1, when_step_key: "e1" });
    // ligar de novo: recria a exigência guardada e restaura o uso
    save.mockClear(); onStepOps.mockClear();
    rerender(<ConnectionsSection version={{ id: "v1", requires_connections: true, tasks: [{ key: "t1", name: "T", steps: [{ key: "e1", name: "Etapa 1" }] }], connection_requirements: [] }} readOnly={false} act={act} scope={scope} stepOps={{ access_parked: patch.access_parked }} onStepOps={onStepOps} />);
    expect(screen.getByTestId("parked-note")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Esta etapa precisa de acesso"));
    await waitFor(() => expect(save).toHaveBeenCalledWith("v1", "ads_1", expect.objectContaining({ connection_type_id: 1 })));
    await waitFor(() => expect(onStepOps).toHaveBeenCalledWith({ access_scope: "some", access_keys: ["ads_1"], access_parked: undefined }));
  });

  it("desligar uma etapa cujo acesso é usado por outras pergunta: desativar em todas ou passar para uma delas (que vira a etapa mãe)", async () => {
    const onStepOps = vi.fn();
    const tasks = [{ key: "t1", name: "T", steps: [{ key: "e1", name: "Etapa 1" }, { key: "e2", name: "Etapa 2", ops: { access_scope: "some", access_keys: ["ads_1"] } }, { key: "e3", name: "Etapa 3", ops: { access_scope: "some", access_keys: ["ads_1"] } }] }];
    render(<ConnectionsSection version={{ id: "v1", requires_connections: true, tasks, connection_requirements: [own({ shared_with_steps: true })] }} readOnly={false} act={act} scope={scope} stepOps={{ access_scope: "some", access_keys: ["ads_1"] }} onStepOps={onStepOps} />);
    fireEvent.click(await screen.findByLabelText("Esta etapa precisa de acesso"));
    const dlg = await screen.findByTestId("access-transfer-dialog");
    expect(dlg.textContent).toMatch(/Desativar em todas as etapas/);
    expect(dlg.textContent).toMatch(/Passar para a etapa Etapa 2/);
    expect(dlg.textContent).toMatch(/Passar para a etapa Etapa 3/);
    expect(api.deleteConnectionRequirement).not.toHaveBeenCalledWith("r1");
    fireEvent.click(screen.getByLabelText(/Etapa 2/, { selector: "input" }));
    save.mockClear();
    fireEvent.click(screen.getByTestId("access-transfer-confirm"));
    await waitFor(() => expect(save).toHaveBeenCalledWith("v1", "ads_1", expect.objectContaining({ when_step_key: "e2", when_task_key: "t1", dependents: [{ task_key: "t1", step_key: "e2", kind: "start" }] })));
    expect(api.deleteConnectionRequirement).not.toHaveBeenCalledWith("r1"); // passou para a etapa 2, não foi apagado
  });

  it("mostra o acesso da etapa como item da lista com a opção de ficar disponível para as outras etapas", async () => {
    const req = { id: "r1", key: "google_ads_x", label: null, connection_type: types[0], when_needed: "before_step", when_task_key: "t1", when_step_key: "e1", obligation: "required", method: "oauth", permission_level: "read_write", pending_behavior: "block_dependents", advanced: { default_grant_scope: "project", validation_mode: "manual", asset_rule: "first_only" }, dependents: [], activation: { mode: "manual", triggers: [] }, shared_with_steps: false };
    render(<ConnectionsSection version={{ id: "v1", requires_connections: true, tasks: [], connection_requirements: [req] }} readOnly={false} act={act} scope={scope} />);
    const item = await screen.findByTestId("step-access-item");
    expect(item.textContent).toMatch(/Google Ads/);
    expect(item.textContent).toMatch(/Login com a conta/);
    fireEvent.click(item.querySelector("input[type=checkbox]")!);
    await waitFor(() => expect(save).toHaveBeenCalledWith("v1", "google_ads_x", expect.objectContaining({ shared_with_steps: true })));
  });
});
