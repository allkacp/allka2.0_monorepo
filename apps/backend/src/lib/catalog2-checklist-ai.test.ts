import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MAX_PER_KIND, normalizeChecklist } from "./catalog2-checklist-ai";

describe("Checklist da etapa por IA · normalização", () => {
  it("só devolve as abas pedidas, aceita texto ou objeto, descarta curtos e repetidos (também contra o que já existe)", () => {
    const raw = {
      execucao: ["Conferir se o acesso ao WordPress foi liberado", { text: "Fazer backup antes de alterar", required: false }, "ok", "Conferir se o acesso ao WordPress foi liberado", "  conferir SE o acesso ao wordpress foi liberado!  "],
      aprovacao: ["O cliente confirma que o texto está correto"],
      qualificacao: ["Líder confere as evidências anexadas"],
    };
    const out = normalizeChecklist(raw, ["execucao", "aprovacao"], [{ kind: "aprovacao", text: "O cliente confirma que o texto está correto" }]);
    assert.deepEqual(out.map((i) => i.kind), ["execucao", "execucao"]);
    assert.equal(out[1].required, false);
    assert.equal(out.find((i) => i.kind === "qualificacao"), undefined);
  });
  it("respeita o limite por aba levando em conta o que já existe", () => {
    const many = Array.from({ length: 20 }, (_, i) => `Item de conferência número ${i + 1}`);
    const existing = Array.from({ length: 7 }, (_, i) => ({ kind: "execucao" as const, text: `Já existente ${i}` }));
    const out = normalizeChecklist({ execucao: many }, ["execucao"], existing);
    assert.equal(out.length, MAX_PER_KIND - 7);
    assert.equal(normalizeChecklist({ execucao: many }, ["execucao"]).length, MAX_PER_KIND);
  });
  it("resposta vazia ou torta não quebra", () => {
    assert.deepEqual(normalizeChecklist({} as any, ["execucao"]), []);
    assert.deepEqual(normalizeChecklist({ execucao: "texto solto" } as any, ["execucao"]), []);
  });
});
