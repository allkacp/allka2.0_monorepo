import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// 01/11 (teste do Codex no proj_956): a carteira recebeu a comissão, mas o Financeiro
// da agência mostrava 0 faturas e R$ 0 pago sem explicar por quê. A rota de faturas
// ainda não lista faturas para agências (decisão pendente do usuário); a tela explica.
vi.mock("@/contexts/agencia-context", () => ({
  useAgencia: () => ({ loading: false, invoices: [], profile: { name: "Agência", plan: "basic", planDiscount: 0, currentMrr: 0 } }),
}));
vi.mock("@/components/pin-to-tray-button", () => ({ PinToTrayButton: () => null }));
import AgenciaFinanceiro from "./page";

describe("Financeiro da agência", () => {
  it("explica que as faturas dos pedidos ainda não aparecem e onde está a comissão", () => {
    render(<AgenciaFinanceiro />);
    const note = screen.getByRole("note");
    expect(note).toHaveTextContent("As faturas dos pedidos da agência ainda não aparecem nesta lista");
    expect(note).toHaveTextContent("a comissão da agência entra na Carteira");
  });
});
