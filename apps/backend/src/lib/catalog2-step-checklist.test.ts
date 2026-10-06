import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeStepOps, visibleChecklist } from "./catalog2-ops";

describe("Checklist da etapa · normalização", () => {
  it("CK01. mantém itens válidos, descarta vazios, corrige tipo inválido e gera ids únicos", () => {
    const n = normalizeStepOps({ checklist: [
      { id: "a", text: "  Conferir destino  ", kind: "aprovacao", required: true },
      { id: "a", text: "Id repetido", kind: "qualificacao", required: false },
      { text: "   " },
      { text: "Tipo inventado", kind: "xyz" },
      "lixo",
    ] });
    assert.ok(n?.checklist);
    assert.equal(n!.checklist!.length, 3);
    assert.equal(n!.checklist![0].text, "Conferir destino");
    assert.equal(n!.checklist![0].kind, "aprovacao");
    assert.equal(n!.checklist![1].required, false);
    assert.equal(n!.checklist![2].kind, "execucao", "tipo inválido vira execução");
    assert.equal(new Set(n!.checklist!.map((i) => i.id)).size, 3, "ids únicos");
  });
  it("CK02. limita a 60 itens e 300 caracteres; checklist vazio some do guia", () => {
    const many = Array.from({ length: 80 }, (_, i) => ({ text: `item ${i}` }));
    assert.equal(normalizeStepOps({ checklist: many })!.checklist!.length, 60);
    assert.equal(normalizeStepOps({ checklist: [{ text: "x".repeat(500) }] })!.checklist![0].text.length, 300);
    assert.equal(normalizeStepOps({ checklist: [] }), null);
  });
  it("CK03. responsável pela evidência: só aceita executor/líder/cliente (executor é o padrão e não é gravado)", () => {
    assert.equal(normalizeStepOps({ evidence_owner: "client", instructions: "x" })!.evidence_owner, "client");
    assert.equal(normalizeStepOps({ evidence_owner: "executor", instructions: "x" })!.evidence_owner, undefined);
    assert.equal(normalizeStepOps({ evidence_owner: "lixo", instructions: "x" })!.evidence_owner, undefined);
  });
});

describe("Checklist da etapa · quem vê na execução do projeto", () => {
  it("CK04. execução para quem executa, qualificação para o líder, aprovação para todos", () => {
    const ops = normalizeStepOps({ checklist: [
      { id: "e", text: "Fazer", kind: "execucao", required: true },
      { id: "q", text: "Qualificar", kind: "qualificacao", required: false },
      { id: "a", text: "Aprovar", kind: "aprovacao", required: true },
    ] });
    const ids = (v: Parameters<typeof visibleChecklist>[1]) => visibleChecklist(ops, v).map((c) => c.id).join("");
    assert.equal(ids("executor"), "ea");
    assert.equal(ids("leader"), "eqa");
    assert.equal(ids("internal"), "eqa");
    assert.equal(ids("client"), "a");
    assert.equal(ids("agency"), "a");
  });
});
