import { describe, expect, it, vi, beforeEach } from "vitest";

const api = {
  setVersionConnectionsModule: vi.fn(async () => ({})),
  saveConnectionRequirement: vi.fn(async (_v: string, key: string, _b: any) => ({ id: `id-${key}`, key, draft_incomplete: false })),
  deleteConnectionRequirement: vi.fn(async () => ({})),
};
vi.mock("@/lib/api-client", () => ({ apiClient: new Proxy({}, { get: (_t, k: string) => (api as any)[k] }) }));
import {
  accessIssues, commitAccessItems, configuredCount, hasPending, incompleteCount, itemsFromRequirements, newItemFromType, opsAfterAccesses, otherUsers, syncStates, formFromBody,
  type AccessItem,
} from "./step-accesses";
import { emptyRule } from "./access-condition";

const gads = { id: 1, key: "google_ads", name: "Google Ads", allowed_methods: ["oauth"], permission_levels: [{ key: "read_write", label: "Leitura e escrita" }] };
const wp = { id: 2, key: "wordpress", name: "WordPress", allowed_methods: ["invite"], permission_levels: [{ key: "admin", label: "Admin" }] };
const scope = { task: { key: "t1", name: "Gestão" }, step: { key: "s1", name: "Configurar" } };
const version = { id: "v1", requires_connections: true, tasks: [{ key: "t1", name: "Gestão", steps: [{ key: "s1", ops: {} }, { key: "s2", ops: { access_scope: "some", access_keys: ["ga_1"] } }] }] };
const serverReq = (over: any = {}) => ({
  id: "r1", key: "ga_1", label: null, connection_type: gads, when_needed: "before_step", when_task_key: "t1", when_step_key: "s1", condition_text: null,
  obligation: "required", method: "oauth", permission_level: "read_write", pending_behavior: "block_dependents",
  advanced: { reason: null, instructions: null, default_grant_scope: "project", validation_mode: "manual", asset_rule: "first_only", revalidate_days: null, light_check: false, reminder_interval_hours: null, reminder_limit: null, escalate_after_reminders: null, visible_to_client: true },
  shared_with_steps: false, dependents: [{ task_key: "t1", step_key: "s1", kind: "start" }], activation: { mode: "manual", triggers: [] }, ...over,
});
beforeEach(() => Object.values(api).forEach((f) => f.mockClear()));

describe("Acessos da etapa em rascunho da tela", () => {
  it("adicionar acesso NÃO chama o servidor: vira item 'novo' só na tela", () => {
    const item = newItemFromType(gads, scope);
    expect(item.state).toBe("new");
    expect(item.form).toMatchObject({ connection_type_id: 1, method: "oauth", permission_level: "read_write", when_needed: "before_step", when_step_key: "s1" });
    expect(api.saveConnectionRequirement).not.toHaveBeenCalled();
    expect(hasPending([item])).toBe(true);
  });

  it("itens salvos começam 'salvos' e só viram 'alterados' se o formulário mudar (e voltam ao desfazer)", () => {
    const [i] = itemsFromRequirements([serverReq()]);
    expect(i.state).toBe("saved");
    expect(hasPending([i])).toBe(false);
    const changed = syncStates([{ ...i, form: { ...i.form, obligation: "optional" } }]);
    expect(changed[0].state).toBe("edited");
    expect(hasPending(changed)).toBe(true);
    expect(syncStates([{ ...changed[0], form: i.base! }])[0].state).toBe("saved");
  });

  it("acesso condicional sem condição é incompleto: não conta como configurado e a mensagem traz o NOME do acesso", () => {
    const ok = newItemFromType(wp, scope);
    const cond: AccessItem = { ...newItemFromType(gads, scope), form: { ...newItemFromType(gads, scope).form, obligation: "conditional" } };
    expect(configuredCount([ok, cond])).toBe(1);
    expect(incompleteCount([ok, cond])).toBe(1);
    const iss = accessIssues([ok, cond], true);
    expect(iss).toHaveLength(1);
    expect(iss[0].message).toMatch(/^O acesso “Google Ads” está incompleto: .*adicione ao menos uma regra\.$/);
    expect(iss[0].field).toBe(`access:${cond.uid}`);
  });

  it("condição completa (variação = Google Ads OU Ambas) torna o acesso completo", () => {
    const base = newItemFromType(gads, scope);
    const item: AccessItem = { ...base, form: { ...base.form, obligation: "conditional", condition: { mode: "any_trigger", rules: [{ ...emptyRule(), kind: "variation", ref_key: "plataforma", operator: "eq", values: ["google_ads", "ambas"] }] } } };
    expect(accessIssues([item], true)).toEqual([]);
    expect(configuredCount([item])).toBe(1);
  });

  it("etapa que 'precisa de acesso' sem nenhum acesso pede para adicionar ou desligar", () => {
    expect(accessIssues([], true)[0]).toMatchObject({ field: "accesses" });
    expect(accessIssues([], false)).toEqual([]);
  });

  it("gravar como RASCUNHO: manda draft e não exige completo; só então o servidor é chamado", async () => {
    const item = { ...newItemFromType(gads, scope), form: { ...newItemFromType(gads, scope).form, obligation: "conditional" } };
    const r = await commitAccessItems([item], { version, scope, draft: true, turnedOff: false, borrowedKeys: [] });
    expect(api.saveConnectionRequirement).toHaveBeenCalledTimes(1);
    const [, key, body] = api.saveConnectionRequirement.mock.calls[0] as any[];
    expect(body).toMatchObject({ draft: true, obligation: "conditional" });
    expect(body.require_complete).toBeUndefined();
    expect(r.items[0].state).toBe("saved");
    expect(r.ownKeys).toEqual([key]);
  });

  it("concluir: manda require_complete e não manda draft", async () => {
    await commitAccessItems([newItemFromType(wp, scope)], { version, scope, draft: false, turnedOff: false, borrowedKeys: [] });
    const body = (api.saveConnectionRequirement.mock.calls[0] as any[])[2];
    expect(body).toMatchObject({ require_complete: true });
    expect(body.draft).toBeUndefined();
  });

  it("ordem: remoções primeiro, depois novos/alterados; item removido que nunca foi salvo nem chega ao servidor", async () => {
    const [saved] = itemsFromRequirements([serverReq()]);
    const removed: AccessItem = { ...saved, state: "removed", decision: "all" };
    const fresh = newItemFromType(wp, scope);
    const calls: string[] = [];
    api.deleteConnectionRequirement.mockImplementationOnce(async () => { calls.push("delete"); return {}; });
    api.saveConnectionRequirement.mockImplementationOnce(async (_v: string, key: string) => { calls.push("save"); return { id: "n", key, draft_incomplete: false }; });
    const r = await commitAccessItems([removed, fresh], { version, scope, draft: false, turnedOff: false, borrowedKeys: [] });
    expect(calls).toEqual(["delete", "save"]);
    expect(r.items).toHaveLength(1);
  });

  it("desligar 'precisa de acesso' guarda os acessos (parked) em vez de perdê-los", async () => {
    const [saved] = itemsFromRequirements([serverReq()]);
    const r = await commitAccessItems([{ ...saved, state: "removed", decision: "all" }], { version, scope, draft: false, turnedOff: true, borrowedKeys: ["outro"] });
    expect(r.parked?.reqs).toHaveLength(1);
    expect(r.parked?.reqs[0].key).toBe("ga_1");
    expect(r.parked?.keys).toEqual(["outro"]);
    const ops = opsAfterAccesses({ access_scope: "some", access_keys: ["ga_1", "outro"], checklist: [{ id: "a", text: "x" }] }, { ownKeys: [], borrowedKeys: ["outro"], turnedOff: true, parked: r.parked });
    expect(ops.access_scope).toBeUndefined();
    expect(ops.access_keys).toBeUndefined();
    expect(ops.access_parked.reqs[0].key).toBe("ga_1");
    expect(ops.checklist).toHaveLength(1); // o resto do ops da etapa fica como estava
    // o corpo guardado volta como formulário
    expect(formFromBody(r.parked!.reqs[0].body)).toMatchObject({ connection_type_id: 1, method: "oauth" });
  });

  it("passar o acesso para outra etapa (decisão) grava na outra etapa em vez de apagar", async () => {
    const [saved] = itemsFromRequirements([serverReq()]);
    await commitAccessItems([{ ...saved, state: "removed", decision: "t1::s2" }], { version, scope, draft: false, turnedOff: false, borrowedKeys: [] });
    expect(api.deleteConnectionRequirement).not.toHaveBeenCalled();
    expect((api.saveConnectionRequirement.mock.calls[0] as any[])[2]).toMatchObject({ when_step_key: "s2" });
  });

  it("se algo falha no meio, o que já foi gravado fica registrado (onProgress) e o erro sobe", async () => {
    const a = newItemFromType(gads, scope); const b = newItemFromType(wp, scope);
    api.saveConnectionRequirement.mockImplementationOnce(async (_v: string, key: string) => ({ id: "ok", key, draft_incomplete: false }));
    api.saveConnectionRequirement.mockImplementationOnce(async () => { throw new Error("O acesso “WordPress” está incompleto: x."); });
    const seen: AccessItem[][] = [];
    await expect(commitAccessItems([a, b], { version, scope, draft: false, turnedOff: false, borrowedKeys: [], onProgress: (x) => seen.push(x) })).rejects.toThrow(/WordPress/);
    expect(seen.at(-1)!.find((i) => i.uid === a.uid)!.state).toBe("saved");
    expect(seen.at(-1)!.find((i) => i.uid === b.uid)!.state).toBe("new");
  });

  it("ops depois de gravar: usa os acessos próprios + os de outras etapas; 'todos' continua 'todos'", () => {
    expect(opsAfterAccesses({}, { ownKeys: ["a"], borrowedKeys: ["b"], turnedOff: false, parked: null })).toMatchObject({ access_scope: "some", access_keys: ["a", "b"] });
    expect(opsAfterAccesses({ access_scope: "all" }, { ownKeys: ["a"], borrowedKeys: [], turnedOff: false, parked: null }).access_scope).toBe("all");
  });

  it("outras etapas que usam o acesso", () => {
    expect(otherUsers(version, "ga_1", "t1", "s1").map((u) => u.step.key)).toEqual(["s2"]);
    expect(otherUsers(version, "ga_1", "t1", "s2")).toEqual([]);
  });
});
