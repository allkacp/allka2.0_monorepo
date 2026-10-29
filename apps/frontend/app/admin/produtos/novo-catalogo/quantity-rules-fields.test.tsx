import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QuantityRulesFields } from "./quantity-rules-fields";
describe("Regras de compras em quantidade", () => {
  it("não inventa percentuais nem descontos e cadastra faixa explicitamente", () => {
    const change = vi.fn(); render(<QuantityRulesFields onChange={change} />);
    expect(screen.getByLabelText("Prazo adicional por unidade extra (%)")).toHaveValue(0);
    expect(screen.getByText(/Sem desconto por quantidade/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Adicionar faixa" }));
    expect(change).toHaveBeenCalledWith(expect.objectContaining({ discount_tiers: [{ from_quantity: 2, discount_percent: 0 }] }));
  });
  it("regra publicada somente leitura não oferece alteração", () => {
    render(<QuantityRulesFields disabled value={{ discount_tiers: [{ from_quantity: 3, discount_percent: 10 }] }} onChange={vi.fn()} />);
    expect(screen.getByLabelText("Desconto da faixa 1")).toBeDisabled();
    expect(screen.getByLabelText("Quantidade mínima da faixa 1")).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Adicionar faixa" })).not.toBeInTheDocument();
  });
  it("mostra erro claro para quantidade e desconto inválidos", () => {
    render(<QuantityRulesFields value={{ discount_tiers: [{ from_quantity: 1, discount_percent: 100 }] }} onChange={vi.fn()} />);
    expect(screen.getByRole("alert")).toHaveTextContent(/a partir de 2/);
  });
});
