import { describe, expect, it } from "vitest";
import { delivIssues, isStaleDraft, itemsFromTask } from "./step-deliverables";

const base = { id: "d1", key: "k", step_id: "s1", sort_order: 0, type: "arquivo", responsible: "executor", requires_approval: true, cycle_scope: "all_cycles", is_conditional: false };

describe("entregável marcado como rascunho mas já completo", () => {
  it("não conta como pendência nem como incompleto; só falta concluir a etapa", () => {
    const [ok] = itemsFromTask([{ ...base, name: "Documento", description: "Documento final com o que foi alterado", draft_incomplete: true }], "s1");
    expect(ok.draft).toBe(true);
    expect(isStaleDraft(ok)).toBe(true);
    expect(delivIssues([ok], false)).toEqual([]);
  });
  it("rascunho de verdade (falta a descrição) continua incompleto e diz o motivo", () => {
    const [bad] = itemsFromTask([{ ...base, name: "Documento", description: "", draft_incomplete: true }], "s1");
    expect(isStaleDraft(bad)).toBe(false);
    const issues = delivIssues([bad], false);
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toMatch(/incompleto.*descreva/i);
  });
});
