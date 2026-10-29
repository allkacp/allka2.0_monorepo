import { beforeEach, describe, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({ updateCatalog2Deliverable: vi.fn(async () => ({})), deleteCatalog2Deliverable: vi.fn(async () => ({})), createCatalog2Deliverable: vi.fn(async () => ({})), reorderCatalog2Deliverables: vi.fn(async () => ({})) }));
vi.mock("@/lib/api-client", () => ({ apiClient: api }));
import { activeDeliv, commitDelivItems, delivIssues, hasDelivPending, itemsFromTask } from "./step-deliverables";

const saved = (id = "d1") => itemsFromTask([{ id, key: id, step_id: "s1", name: `Entregável ${id}`, description: "Descrição completa", type: "arquivo", requires_approval: true }], "s1")[0];
beforeEach(() => vi.clearAllMocks());

describe("entregáveis removidos e pendências antigas", () => {
  it("excluídos, desvinculados e movidos não contam no resumo/aprovação nem nas pendências da etapa de origem", () => {
    const item = saved();
    const items = [{ ...item, state: "deleted" as const }, { ...saved("d2"), state: "unlinked" as const }, { ...saved("d3"), fields: { ...item.fields, step_id: "s2", description: "" } }];
    expect(activeDeliv(items, "s1")).toEqual([]);
    expect(delivIssues(items, true, "s1")).toEqual([]);
    expect(delivIssues(items, false, "s1")).toEqual([]);
    expect(hasDelivPending(items)).toBe(true); // Ainda é preciso persistir a remoção.
  });
  it("atalho que altera a aprovação é pendência de gravação mesmo se o estado recebido ainda for saved", async () => {
    const item = saved();
    const changed = { ...item, fields: { ...item.fields, requires_approval: false } };
    expect(hasDelivPending([changed])).toBe(true);
    const result = await commitDelivItems([changed], { taskId: "t1", stepId: "s1", taskDeliverableIds: ["d1"] });
    expect(api.updateCatalog2Deliverable).toHaveBeenCalledWith("d1", expect.objectContaining({ requires_approval: false }));
    expect(hasDelivPending(result.items)).toBe(false);
  });
  it("excluir não vira edição ou criação, mesmo se houver aprovação/rascunho antigo", async () => {
    const item = saved();
    const result = await commitDelivItems([{ ...item, state: "deleted", draft: true }], { taskId: "t1", stepId: "s1", taskDeliverableIds: ["d1"] });
    expect(api.deleteCatalog2Deliverable).toHaveBeenCalledWith("d1");
    expect(api.updateCatalog2Deliverable).not.toHaveBeenCalled();
    expect(api.createCatalog2Deliverable).not.toHaveBeenCalled();
    expect(result.items).toEqual([]);
    expect(delivIssues(result.items, true, "s1")).toEqual([]);
  });
});
