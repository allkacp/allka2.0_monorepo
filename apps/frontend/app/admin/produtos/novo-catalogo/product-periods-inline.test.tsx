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
import { ProductPeriodsInline, notifyPeriodsChanged, periodDiscountHint, periodMath, periodMathLine, periodPriceHelp } from "./product-periods-inline";

beforeEach(() => { Object.values(api).forEach((f) => f.mockClear()); });

describe("Períodos da assinatura dentro da Modalidade", () => {
  it("31/10: desconto salvo em OUTRO lugar do editor (painel Modalidades por período) atualiza esta faixa sem F5; outro produto não", async () => {
    render(<ProductPeriodsInline productId="p1" />);
    expect((await screen.findByLabelText("Desconto do período Mensal (%)") as HTMLInputElement).value).toBe("0");
    const calls = api.getCatalog2ProductPeriods.mock.calls.length;
    api.getCatalog2ProductPeriods.mockResolvedValueOnce({ data: rows().map((r) => r.period === "mensal" ? { ...r, discount_percent: 5 } : r) });
    notifyPeriodsChanged("outro-produto");
    expect(api.getCatalog2ProductPeriods.mock.calls.length).toBe(calls);
    notifyPeriodsChanged("p1");
    await waitFor(() => expect((screen.getByLabelText("Desconto do período Mensal (%)") as HTMLInputElement).value).toBe("5"));
  });
  it("31/10: salvar aqui avisa o resto do editor (painel e etiqueta de preço recarregam)", async () => {
    const heard = vi.fn();
    window.addEventListener("catalog2:periods-changed", heard);
    render(<ProductPeriodsInline productId="p1" />);
    const disc = await screen.findByLabelText("Desconto do período Semestral (%)");
    fireEvent.change(disc, { target: { value: "4" } });
    fireEvent.blur(disc);
    await waitFor(() => expect(heard).toHaveBeenCalledTimes(1));
    expect((heard.mock.calls[0][0] as CustomEvent).detail).toEqual({ productId: "p1" });
    window.removeEventListener("catalog2:periods-changed", heard);
  });
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
    expect(periodDiscountHint(1, 5)).toBe("5% a menos na mensalidade");
    expect(periodDiscountHint(6, 0)).toBe("sem desconto");
    expect(periodDiscountHint(6, 2)).toBe("2% a menos por mês (6 meses pagos de uma vez)");
  });
});

// Item 7 (31/10): desconto de 5% no Mensal — a explicação do cadastro agora bate com o servidor (que já aplicava o desconto no
// Mensal) e mostra base, percentual e total. Fórmula do servidor intacta (catalog2-periods.integration.test.ts, cenário 1).
describe("Desconto do período: base, percentual e total", () => {
  it("sem desconto, 5% no mensal, arredondamento e período longo", () => {
    expect(periodMath(1, 0, 933.47)).toEqual({ base: 933.47, total: 933.47, perMonth: 933.47, saved: 0 });
    expect(periodMath(1, 5, 933.47)).toEqual({ base: 933.47, total: 886.8, perMonth: 886.8, saved: 46.67 }); // 886,7965 → 886,80
    expect(periodMath(3, 6, 100)).toEqual({ base: 300, total: 282, perMonth: 94, saved: 18 });
    expect(periodMath(1, 5, null)).toBeNull();
    expect(periodMathLine(1, 5, 933.47)).toBe("R$ 933,47/mês − 5% = R$ 886,80/mês");
    expect(periodMathLine(1, 0, 933.47)).toBe("R$ 933,47/mês, sem desconto");
    expect(periodMathLine(3, 6, 100)).toBe("R$ 300,00 (3 meses) − 6% = R$ 282,00 (3 meses)");
  });
  it("ⓘ do Mensal com 5% já não diz 'sem desconto de período' e avisa que implantação não tem desconto", () => {
    const help = periodPriceHelp("Mensal", 1, 5, 933.47);
    expect(help).toContain("com 5%: R$ 886,80 por mês");
    expect(help).toContain("economiza R$ 46,67");
    expect(help).toContain("implantação e cobranças únicas não têm desconto");
    expect(help).not.toContain("sem desconto de período");
    expect(periodPriceHelp("Mensal", 1, 0, 933.47)).toContain("preço normal, sem desconto de período");
  });
  it("período autorizado mostra a conta na tela quando o preço mensal já existe", async () => {
    (api as any).simulateCatalog2 = vi.fn(async () => ({ pricing: { split: { commercial_summary: { renewal: 100 } } } }));
    const r = rows(); r[0].discount_percent = 5;
    api.getCatalog2ProductPeriods.mockResolvedValueOnce({ data: r });
    render(<ProductPeriodsInline productId="p1" versionId="v1" />);
    expect(await screen.findByTestId("period-math-mensal")).toHaveTextContent("R$ 100,00/mês − 5% = R$ 95,00/mês");
    expect(screen.queryByTestId("period-math-anual")).toBeNull(); // não autorizado: sem conta
    delete (api as any).simulateCatalog2;
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
  // Requisito aprovado (29/10): a Entrega comercial é UMA coluna; os períodos ocupam a largura inteira do bloco de preço
  // (antes: md:col-span-3 numa grade de 3 colunas). A responsividade fica nos cartões dos períodos (1 → 2 → 3 por linha).
  it("os períodos ocupam a largura inteira no bloco de preço (uma coluna), não a coluna estreita da Modalidade", () => {
    expect(src).toMatch(/<ProductFlowField slot="pricing">\{f\.accepts_recurring && product\?\.id && <div className="min-w-0 w-full" data-testid="periods-row"><ProductPeriodsInline/);
    expect(src).not.toMatch(/md:col-span-3" data-testid="periods-row"/);
  });
  it("responsivo: cartões em 1 coluna no celular, 2 no médio e 3 no largo, sem estourar a largura", async () => {
    render(<ProductPeriodsInline productId="p1" />);
    const card = await screen.findByTestId("period-row-mensal");
    const list = card.parentElement!;
    expect(list.tagName).toBe("UL");
    expect(list.className.split(" ")).toEqual(expect.arrayContaining(["grid", "md:grid-cols-2", "xl:grid-cols-3"]));
    expect(list.className).not.toMatch(/(^| )grid-cols-/); // sem colunas fixas no celular
    expect(card.className.split(" ")).toEqual(expect.arrayContaining(["min-w-0", "flex-wrap"]));
  });
});
