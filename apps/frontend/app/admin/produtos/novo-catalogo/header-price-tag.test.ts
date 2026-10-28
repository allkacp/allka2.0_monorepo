import { describe, expect, it } from "vitest";
import { priceSummaryOf } from "./header-price-tag";

const pricing = (cs: any) => ({ split: { commercial_summary: cs } });
const periods = [
  { period: "mensal", label: "Mensal", months: 1, configured: true, is_active: true, discount_percent: 0 },
  { period: "trimestral", label: "Trimestral", months: 3, configured: true, is_active: true, discount_percent: 10 },
  { period: "anual", label: "Anual", months: 12, configured: true, is_active: false, discount_percent: 20 },
];

describe("preço do cabeçalho: venda normal + detalhe por plano", () => {
  it("avulso é o preço normal; planos só os autorizados, com desconto sobre o mensal", () => {
    const r = priceSummaryOf(pricing({ avulso: 1000, renewal: 800 }), periods, true, true)!;
    expect(r.normal).toEqual({ label: "Venda avulsa", value: 1000 });
    expect(r.plans.map((p) => p.key)).toEqual(["mensal", "trimestral"]);
    const tri = r.plans[1];
    expect(tri.total).toBeCloseTo(800 * 0.9 * 3, 6);
    expect(tri.perMonth).toBeCloseTo(720, 6);
  });
  it("só assinatura: o preço normal é o mensal; sem períodos cadastrados mostra o mensal", () => {
    const r = priceSummaryOf(pricing({ avulso: 500, renewal: 300 }), [], false, true)!;
    expect(r.normal).toEqual({ label: "Assinatura mensal", value: 300 });
    expect(r.plans).toHaveLength(1);
  });
  it("sem preço calculado devolve nada (a tela usa o texto de reserva)", () => {
    expect(priceSummaryOf(pricing({ avulso: null, renewal: null }), periods, true, true)).toBeNull();
    expect(priceSummaryOf({}, periods, true, true)).toBeNull();
  });
});
