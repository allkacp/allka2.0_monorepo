import { describe, expect, it } from "vitest";
import { AI_PRODUCT_FIELDS, productAiInventory } from "./product-ai-inventory";
describe("inventário explícito do cadastro para a IA", () => {
  it("oferece os 14 textos/listas suportados e não presume preenchimento", () => {
    const inventory = productAiInventory({});
    expect(AI_PRODUCT_FIELDS).toHaveLength(14);
    expect(inventory.available).toHaveLength(14);
    expect(inventory.filled).toEqual([]);
    expect(inventory.current.included_items).toEqual([]);
    expect(inventory.current.scope).toBe("");
  });
  it("distingue nome sozinho de nome/descrição/escopo já informados", () => {
    const name = productAiInventory({ title: "Nome" });
    expect(name.filled).toEqual(["Título comercial"]);
    const complete = productAiInventory({ title: "Nome", summary: "Resumo", scope: "Escopo digitado" });
    expect(complete.filled).toEqual(["Título comercial", "Descrição curta", "Escopo"]);
    expect(complete.available).not.toContain("Descrição curta");
    expect(complete.available).not.toContain("Escopo");
  });
  it("não inclui senhas, dados de acesso, preços ou pessoas no inventário enviado", () => {
    const inventory = productAiInventory({ title: "Nome", password: "não encaminhar", connection_requirements: [{ secret: "não encaminhar" }], manual_price: 123, leader_user_id: "pessoa" });
    expect(JSON.stringify(inventory)).not.toContain("não encaminhar");
    expect(inventory.current).not.toHaveProperty("manual_price");
    expect(inventory.context).not.toHaveProperty("leader_user_id");
  });
  it("usa só o texto de listas com anexo, sem encaminhar identificadores de arquivos", () => {
    const inventory = productAiInventory({ deliverables_summary: [{ text: "Relatório", file: { id: "arquivo-privado" } }] });
    expect(inventory.current.deliverables_summary).toEqual(["Relatório"]);
    expect(JSON.stringify(inventory)).not.toContain("arquivo-privado");
  });
});
