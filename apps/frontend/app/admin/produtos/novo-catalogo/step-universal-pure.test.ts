import { describe, expect, it, vi, beforeEach } from "vitest";

const api = {
  updateCatalog2Deliverable: vi.fn(async (..._a: any[]) => ({})),
  deleteCatalog2Deliverable: vi.fn(async (..._a: any[]) => ({})),
  createCatalog2Deliverable: vi.fn(async (..._a: any[]) => ({ id: "n1", key: "novo" })),
  reorderCatalog2Deliverables: vi.fn(async (..._a: any[]) => ({})),
};
vi.mock("@/lib/api-client", () => ({ apiClient: new Proxy({}, { get: (_t, k: string) => (api as any)[k] }) }));
import { approvalSummary, effectiveMode } from "./client-approval";
import { activeDeliv, commitDelivItems, delivIssues, hasDelivPending, itemsFromTask, linkItem, mergeOrder, newItem, syncDelivStates } from "./step-deliverables";
import { deliverableBrief, deliverableIssues, deliverableSituation, fieldsOf } from "./catalog2-deliverable-fields";
import { freeKey, slugKey } from "./quick-variation";

const d = (over: any = {}) => ({ id: "d1", key: "plano", name: "Plano estratégico inicial de mídia paga", description: "Plano", step_id: "s1", sort_order: 1, requires_approval: true, cycle_scope: "every_cycle", ...over });
beforeEach(() => Object.values(api).forEach((f) => f.mockClear()));

describe("Aprovação do cliente · modo efetivo e resumo em linguagem simples", () => {
  it("sem nada gravado vale o comportamento anterior (etapa visível = aprovada pelo cliente); interna = nenhuma", () => {
    expect(effectiveMode({}, false)).toBe("step");
    expect(effectiveMode({ client_approval: { mode: "awareness" } }, false)).toBe("awareness");
    expect(effectiveMode({ client_approval: { mode: "step" } }, true)).toBe("none");
  });
  const base = { internal: false, ops: { client_approval: { mode: "step" } }, approvalHours: "16", reworkHours: "8", deliverableNames: [] as string[], hasNext: true };
  it("frase completa do exemplo do pedido", () => {
    expect(approvalSummary(base)).toBe("Ao concluir esta etapa, ela será enviada ao cliente. A próxima etapa ficará bloqueada até a aprovação. O cliente terá 16 horas úteis para responder. Se pedir ajuste, o executor terá 8 horas úteis para reenviar.");
  });
  it("singular, última etapa, líder recebendo ajustes e limite de ajustes", () => {
    const t = approvalSummary({ ...base, hasNext: false, approvalHours: "1", reworkHours: "", ops: { client_approval: { mode: "step", adjust_receiver: "leader", adjustment_limit: 1, silence_action: "escalate" } } });
    expect(t).toContain("O encerramento da tarefa aguarda a aprovação.");
    expect(t).toContain("1 hora úteis".replace("hora úteis", "hora úteis"));
    expect(t).toContain("o líder da área refaz dentro do prazo anterior");
    expect(t).toContain("até 1 ajuste.");
    expect(t).toContain("o líder será avisado");
  });
  it("por entregáveis cita os nomes; ciência e 'não' liberam a próxima; interna explica", () => {
    expect(approvalSummary({ ...base, ops: { client_approval: { mode: "deliverables" } }, deliverableNames: ["Plano"] })).toContain("o entregável “Plano” será enviado ao cliente");
    expect(approvalSummary({ ...base, ops: { client_approval: { mode: "deliverables" } }, deliverableNames: [] })).toContain("nenhum está marcado ainda");
    expect(approvalSummary({ ...base, ops: { client_approval: { mode: "awareness" } } })).toContain("a próxima etapa é liberada na hora");
    expect(approvalSummary({ ...base, ops: { client_approval: { mode: "none" } } })).toContain("segue direto para a próxima");
    expect(approvalSummary({ ...base, internal: true })).toContain("Etapa interna");
  });
});

describe("Entregáveis da etapa · modelo em rascunho da tela", () => {
  it("itemsFromTask pega só os da etapa, na ordem salva, como 'saved'", () => {
    const list = [d({ id: "b", sort_order: 2 }), d({ id: "a", sort_order: 1 }), d({ id: "x", step_id: "s2" }), d({ id: "o", step_id: null })];
    const items = itemsFromTask(list, "s1");
    expect(items.map((i) => [i.id, i.state])).toEqual([["a", "saved"], ["b", "saved"]]);
    expect(hasDelivPending(items)).toBe(false);
  });
  it("editar vira 'edited' e voltar ao valor original volta a 'saved'", () => {
    const [i] = itemsFromTask([d()], "s1");
    const edited = syncDelivStates([{ ...i, fields: { ...i.fields, name: "Outro" } }]);
    expect(edited[0].state).toBe("edited");
    expect(syncDelivStates([{ ...edited[0], fields: i.fields }])[0].state).toBe("saved");
  });
  it("novo e vinculado carregam a etapa; removidos não contam como ativos", () => {
    const n = newItem("s1", { name: "Novo" });
    const l = linkItem(d({ id: "z", step_id: null }), "s1");
    expect(n.fields.step_id).toBe("s1"); expect(l.fields.step_id).toBe("s1");
    expect(activeDeliv([n, { ...l, state: "unlinked" }])).toHaveLength(1);
  });
  it("pendências citam o entregável pelo nome; 'sem entregáveis' declarado ignora, a não ser que haja entregável ligado", () => {
    const inc = newItem("s1", { name: "Contrato", description: "" });
    expect(delivIssues([inc], false)[0].message).toContain("“Contrato” está incompleto: descreva o que é o entregável");
    expect(delivIssues([inc], true)[0].field).toBe("deliverables");
    expect(delivIssues([], true)).toEqual([]);
    expect(delivIssues([{ ...inc, fields: { ...inc.fields, description: "ok" }, draft: true }], false)[0].message).toContain("salvo como rascunho");
  });
  it("mergeOrder mantém os entregáveis de outras etapas onde estão e reparte só as vagas da etapa", () => {
    // tarefa: [a(s1), x(s2), b(s1)] — na etapa s1 troca a ordem de a/b
    expect(mergeOrder(["a", "x", "b"], new Set(["a", "b"]), ["b", "a"], new Set())).toEqual(["b", "x", "a"]);
    // novo entra no fim; removido sai
    expect(mergeOrder(["a", "x"], new Set(["a", "n"]), ["a", "n"], new Set())).toEqual(["a", "x", "n"]);
    expect(mergeOrder(["a", "x", "b"], new Set(["a", "b"]), ["a", "b"], new Set(["a"]))).toEqual(["x", "b"]);
  });
});

describe("Gravação dos entregáveis da etapa (commit)", () => {
  it("ordem: desvincular → excluir → vincular/alterar → criar → reordenar; e cada passo gravado sai da lista de pendências", async () => {
    const calls: string[] = [];
    api.updateCatalog2Deliverable.mockImplementation(async (id: any, body: any) => { calls.push(`put:${id}:${body.step_id === null ? "null" : body.step_id ?? "-"}`); return {}; });
    api.deleteCatalog2Deliverable.mockImplementation(async (id: any) => { calls.push(`del:${id}`); return {}; });
    api.createCatalog2Deliverable.mockImplementation(async (_t: any, body: any) => { calls.push(`new:${body.name}`); return { id: "n1", key: "novo" }; });
    api.reorderCatalog2Deliverables.mockImplementation(async () => { calls.push("order"); return {}; });
    const saved = itemsFromTask([d({ id: "a", sort_order: 1 }), d({ id: "b", sort_order: 2 }), d({ id: "c", sort_order: 3 })], "s1");
    const items = [
      { ...saved[0], state: "unlinked" as const },
      { ...saved[1], state: "deleted" as const },
      { ...saved[2], state: "edited" as const, fields: { ...saved[2].fields, name: "C editado" } },
      newItem("s1", { name: "Brand new", description: "x" }),
    ];
    const r = await commitDelivItems(items, { taskId: "t1", stepId: "s1", taskDeliverableIds: ["a", "b", "c"] });
    expect(calls).toEqual(["put:a:null", "del:b", "put:c:s1", "new:Brand new"]); // c e o novo já estão na ordem certa: não precisa reordenar
    expect(r.createdIds).toEqual(["n1"]);
    expect(r.items.map((i) => [i.id, i.state])).toEqual([["c", "saved"], ["n1", "saved"]]);
    expect(hasDelivPending(r.items)).toBe(false);
    expect(api.reorderCatalog2Deliverables).not.toHaveBeenCalled();
  });
  it("reordenar: quem saiu da etapa fica onde estava na tarefa, ninguém some nem se repete (a ordem enviada tem os mesmos ids)", async () => {
    // tarefa: [a(s1, desvinculado), x(s2), b(s1), c(s1)] — a etapa passa a ter c antes de b
    const saved = itemsFromTask([d({ id: "a", sort_order: 1 }), d({ id: "b", sort_order: 3 }), d({ id: "c", sort_order: 4 })], "s1");
    const items = [{ ...saved[0], state: "unlinked" as const }, saved[2], saved[1]];
    await commitDelivItems(items, { taskId: "t1", stepId: "s1", taskDeliverableIds: ["a", "x", "b", "c"] });
    expect(api.reorderCatalog2Deliverables).toHaveBeenCalledWith("t1", ["a", "x", "c", "b"]);
  });
  it("falha no meio não perde o que já foi gravado e propaga a mensagem do servidor", async () => {
    api.deleteCatalog2Deliverable.mockRejectedValueOnce(new Error("Este entregável já foi usado em 1 tarefa(s) contratada(s)."));
    const saved = itemsFromTask([d({ id: "a" }), d({ id: "b", sort_order: 2 })], "s1");
    const seen: string[][] = [];
    await expect(commitDelivItems([{ ...saved[0], state: "unlinked" }, { ...saved[1], state: "deleted" }], { taskId: "t1", stepId: "s1", taskDeliverableIds: ["a", "b"], onProgress: (it) => seen.push(it.map((x) => x.id!)) })).rejects.toThrow(/já foi usado/);
    expect(seen[0]).toEqual(["b"]); // o desvincular de "a" já tinha sido gravado e saiu da lista
  });
  it("trocar a etapa responsável no modal tira o entregável desta etapa (continua o mesmo registro, agora em outra)", async () => {
    const [i] = itemsFromTask([d()], "s1");
    const r = await commitDelivItems([{ ...i, state: "edited", fields: { ...i.fields, step_id: "s2" } }], { taskId: "t1", stepId: "s1", taskDeliverableIds: ["d1"] });
    expect(api.updateCatalog2Deliverable).toHaveBeenCalledWith("d1", expect.objectContaining({ step_id: "s2" }));
    expect(r.items).toHaveLength(0);
  });
});

describe("Campos do entregável", () => {
  it("completo exige nome e descrição; condicional exige o texto da condição", () => {
    expect(deliverableIssues(fieldsOf(d()))).toEqual([]);
    expect(deliverableIssues(fieldsOf(d({ name: "", description: "" }))).map((x) => x.field)).toEqual(["name", "description"]);
    expect(deliverableIssues(fieldsOf(d({ is_conditional: true }))).map((x) => x.field)).toEqual(["condition"]);
    expect(deliverableSituation(d({ draft_incomplete: true })).draft).toBe(true);
    expect(deliverableSituation(d()).complete).toBe(true);
  });
  it("frase curta do cartão da etapa", () => {
    expect(deliverableBrief(d())).toBe("Plano estratégico inicial de mídia paga — aprovação do cliente — todo ciclo");
    expect(deliverableBrief(d({ requires_approval: false, cycle_scope: "first_execution" }))).toBe("Plano estratégico inicial de mídia paga — só 1ª execução");
  });
});

describe("Chaves de variação/opção criadas na hora", () => {
  it("slug sem acento e com hífen; colisão ganha sufixo", () => {
    expect(slugKey("Número de Campanhas Simultâneas!")).toBe("numero-de-campanhas-simultaneas");
    expect(freeKey("Google Ads", [])).toBe("google-ads");
    expect(freeKey("Google Ads", ["google-ads", "google-ads-2"])).toBe("google-ads-3");
    expect(freeKey("???", [])).toBe("item");
  });
});
