import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeStepOps, stepOpsSchema, visibleStepGuide } from "./catalog2-ops";

describe("tipos de evidência da etapa", () => {
  it("só vale com evidência obrigatória; descarta tipo desconhecido e repetido; mantém a ordem padrão", () => {
    assert.deepEqual(normalizeStepOps({ evidence_required: true, evidence_types: ["pdf", "print", "xyz", "pdf"] })?.evidence_types, ["print", "pdf"]);
    assert.equal(normalizeStepOps({ evidence_required: false, evidence_types: ["pdf"], instructions: "x" })?.evidence_types, undefined);
    assert.equal(normalizeStepOps({ evidence_required: true, evidence_types: [] })?.evidence_types, undefined);
  });
  it("a API aceita os tipos e recusa um tipo inventado", () => {
    assert.ok(stepOpsSchema.safeParse({ evidence_required: true, evidence_types: ["print", "relatorio"] }).success);
    assert.equal(stepOpsSchema.safeParse({ evidence_required: true, evidence_types: ["robo"] }).success, false);
  });
  it("o executor vê o tipo pedido junto da dica de evidência", () => {
    const g = visibleStepGuide({ evidence_required: true, evidence_types: ["print", "relatorio"], evidence_hint: "Campanha no ar" }, "executor");
    assert.equal(g.evidence_required, true);
    assert.equal(g.items.find((i) => i.key === "evidence_hint")?.value, "Tipo: Print da tela, Relatório — Campanha no ar");
    const so = visibleStepGuide({ evidence_required: true, evidence_types: ["pdf"] }, "executor");
    assert.equal(so.items.find((i) => i.key === "evidence_hint")?.value, "Tipo: PDF");
  });
});
