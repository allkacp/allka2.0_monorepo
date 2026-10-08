import { describe, it, expect } from "vitest";
import { aiChangeSummary, brl, type AiChangeQuote } from "./catalog2-ai-changes-panel";

const base: AiChangeQuote = { project_product_id: "p", free_total: 3, used: 0, free_left: 3, is_free: true, price_brl: 0, balance_brl: 0, enough_balance: true, missing_brl: 0 };

describe("P-11 painel de alterações por IA", () => {
  it("mostra grátis restantes", () => expect(aiChangeSummary(base)).toBe("Alterações grátis restantes: 3 de 3."));
  it("acabou o grátis: informa preço extra", () => {
    const t = aiChangeSummary({ ...base, used: 3, free_left: 0, is_free: false, price_brl: 12.5 });
    expect(t).toContain("acabaram");
    expect(t).toContain("R$ 12,50");
  });
  it("formata reais", () => expect(brl(7)).toBe("R$ 7,00"));
});
