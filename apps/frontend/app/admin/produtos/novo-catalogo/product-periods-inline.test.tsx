import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const rows = () => [
  { period: "mensal", label: "Mensal", months: 1, configured: true, is_active: true, discount_percent: 0, sale_open: true },
  { period: "bimestral", label: "Bimestral", months: 2, configured: false, is_active: false, discount_percent: null, sale_open: false },
  { period: "trimestral", label: "Trimestral", months: 3, configured: false, is_active: false, discount_percent: null, sale_open: false },
  { period: "semestral", label: "Semestral", months: 6, configured: true, is_active: true, discount_percent: 2, sale_open: false },
  { period: "anual", label: "Anual", months: 12, configured: false, is_active: false, discount_percent: null, sale_open: false },
];
const api = { getCatalog2ProductPeriods: vi.fn(async () => ({ data: rows() })), updateCatalog2ProductPeriod: vi.fn(async () => ({})) };
vi.mock("@/lib/api-client", () => ({ apiClient: new Proxy({}, { get: (_t, k: string) => (api as any)[k] }) }));
import { ProductPeriodsInline, periodDiscountHint } from "./product-periods-inline";

beforeEach(() => { Object.values(api).forEach((f) => f.mockClear()); });

describe("Períodos da assinatura dentro da Modalidade", () => {
  it("lista os 5 períodos; os autorizados mostram desconto; períodos longos avisam que a venda ainda não foi liberada", async () => {
    render(<ProductPeriodsInline productId="p1" />);
    expect(await screen.findByTestId("period-row-mensal")).toBeInTheDocument();
    for (const p of ["mensal", "bimestral", "trimestral", "semestral", "anual"]) expect(screen.getByTestId(`period-row-${p}`)).toBeInTheDocument();
    expect((screen.getByLabelText("Autorizar o período Semestral") as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText("Desconto do período Semestral (%)") as HTMLInputElement).value).toBe("2");
    expect(screen.getByTestId("period-sale-closed-semestral")).toBeInTheDocument();
    expect(screen.queryByTestId("period-sale-closed-mensal")).toBeNull();
    expect((screen.getByLabelText("Desconto do período Anual (%)") as HTMLInputElement).disabled).toBe(true); // só edita desconto de período autorizado
  });
  it("autorizar um período grava com o desconto; mudar o desconto grava ao sair do campo; desligar mantém o desconto", async () => {
    render(<ProductPeriodsInline productId="p1" />);
    await screen.findByTestId("period-row-anual");
    fireEvent.click(screen.getByLabelText("Autorizar o período Anual"));
    await waitFor(() => expect(api.updateCatalog2ProductPeriod).toHaveBeenCalledWith("p1", "anual", { discount_percent: 0, is_active: true }));
    const disc = screen.getByLabelText("Desconto do período Semestral (%)");
    fireEvent.change(disc, { target: { value: "5" } });
    fireEvent.blur(disc);
    await waitFor(() => expect(api.updateCatalog2ProductPeriod).toHaveBeenCalledWith("p1", "semestral", { discount_percent: 5, is_active: true }));
    fireEvent.click(screen.getByLabelText("Autorizar o período Semestral"));
    await waitFor(() => expect(api.updateCatalog2ProductPeriod).toHaveBeenCalledWith("p1", "semestral", { discount_percent: 2, is_active: false }));
  });
  it("recusa desconto fora de 0–90% sem chamar o servidor; sem nenhum período avisa", async () => {
    render(<ProductPeriodsInline productId="p1" />);
    await screen.findByTestId("period-row-mensal");
    const disc = screen.getByLabelText("Desconto do período Semestral (%)");
    fireEvent.change(disc, { target: { value: "95" } });
    fireEvent.blur(disc);
    expect(await screen.findByText(/entre 0 e 90%/)).toBeInTheDocument();
    expect(api.updateCatalog2ProductPeriod).not.toHaveBeenCalled();
  });
  it("texto do desconto em linguagem simples", () => {
    expect(periodDiscountHint(1, 0)).toBe("preço normal");
    expect(periodDiscountHint(6, 0)).toBe("sem desconto");
    expect(periodDiscountHint(6, 2)).toBe("2% a menos por mês (6 meses pagos de uma vez)");
  });
});

import { readFileSync } from "node:fs";
import path from "node:path";
describe("Janela Entrega comercial: salvar rascunho e períodos em faixa larga", () => {
  const src = readFileSync(path.join(__dirname, "product-editor.tsx"), "utf8");
  it("tem o botão Salvar rascunho dentro da janela e Fechar grava o que estiver pendente (nada se perde ao fechar)", () => {
    expect(src).toMatch(/data-testid="commercial-overview-save"/);
    expect(src).toMatch(/window\.dispatchEvent\(new Event\("catalog2:save-draft"\)\)/);
    expect(src).toMatch(/window\.dispatchEvent\(new Event\("catalog2:flush-pending"\)\); setOpen\(false\)/);
    expect(src).toMatch(/window\.addEventListener\("catalog2:save-draft", onSave\)/);
  });
  it("os períodos ocupam a faixa inteira abaixo das três colunas (md:col-span-3), não a coluna estreita da Modalidade", () => {
    expect(src).toMatch(/<div className="md:col-span-3" data-testid="periods-row"><ProductPeriodsInline/);
  });
});
