import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
const frame = vi.hoisted(() => ({ sidebarWidth: 72 }));
vi.mock("@/hooks/useAppFrameMetrics", () => ({ useAppFrameMetrics: () => frame }));
import { ProjectInvoiceDetailsWindow } from "./project-invoice-details-window";
import { fmtDateBR } from "@/lib/project-display";

// Fatura e pagamento no formato que GET /projects/:id/billing devolve para o proj_956.
const PAID_AT = "2026-11-01T21:57:01.886Z";
const invoice = { id: "inv1", invoice_number: "INV-2026-0016", amount: 2148.66, status: "paid", due_date: null, paid_at: PAID_AT, description: "Fatura gerada automaticamente — pagamento p2 (avulso)", payment_id: "p2" };
const payment = { id: "p2", payment_method: "CARTAO_TESTE", items: [
  { product_name_snapshot: "SEO — Otimização para Buscadores", total_snapshot: 1000.66 },
  { product_name_snapshot: "Manutenção e Alteração de Site ou Loja Virtual", total_snapshot: 1148 },
] };

describe("Projeto → Faturamento → Detalhes da Fatura em Janela Moldura", () => {
  it("abre com a fatura real (antes quebrava): número, valor, situação, forma, datas e itens congelados — sem dado inventado", () => {
    render(<ProjectInvoiceDetailsWindow open onOpenChange={() => {}} invoice={invoice} payment={payment} agencyName="Lamego Academy" clientName="Teste cliente" onDownload={() => {}} />);
    const win = screen.getByTestId("project-invoice-details");
    expect(within(win).getByText("INV-2026-0016")).toBeVisible();
    expect(within(win).getByText("Pago")).toBeVisible();
    expect(within(win).getAllByText("R$ 2.148,66").length).toBeGreaterThan(0);
    expect(within(win).getByText("Cartão (teste)")).toBeVisible();
    expect(within(win).getByText("Lamego Academy")).toBeVisible();
    expect(within(win).getByText("Teste cliente")).toBeVisible();
    expect(within(win).getByText(fmtDateBR(PAID_AT))).toBeVisible();
    expect(within(win).getByText("SEO — Otimização para Buscadores")).toBeVisible();
    // no celular o nome longo do produto quebra a linha (antes a tabela da janela exigia rolagem lateral em 390 px)
    expect(within(win).getByText("Manutenção e Alteração de Site ou Loja Virtual")).toHaveClass("max-md:whitespace-normal", "max-md:break-words");
    expect(within(win).getByText("R$ 1.148,00")).toBeVisible();
    // vencimento não gravado = —, nunca data de reserva
    expect(within(win).getByText("Vencimento").nextElementSibling).toHaveTextContent("—");
    expect(win).not.toHaveTextContent(/undefined|NaN|01\/01\/2000|Competência/);
  });

  it("fica acima do cabeçalho global, com X dentro do cabeçalho da janela; X e Escape fecham", () => {
    const onOpenChange = vi.fn();
    render(<ProjectInvoiceDetailsWindow open onOpenChange={onOpenChange} invoice={invoice} payment={null} onDownload={() => {}} />);
    const overlay = screen.getByTestId("project-invoice-details-overlay");
    expect(overlay).toHaveClass("bg-black/60", "backdrop-blur-[2px]");
    expect(overlay).toHaveStyle({ left: "72px" });
    expect(Number(overlay.style.zIndex)).toBeGreaterThan(90);
    const header = screen.getByTestId("project-invoice-details-header");
    fireEvent.pointerDown(overlay);
    expect(onOpenChange).not.toHaveBeenCalled();
    fireEvent.click(within(header).getByRole("button", { name: "Fechar detalhes da fatura" }));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("project-invoice-details-body")).toHaveClass("overflow-y-auto", "min-h-0", "flex-1");
    // pagamento sem itens/forma registrados: diz isso, sem inventar
    expect(screen.getByText("Itens não registrados para esta fatura.")).toBeVisible();
    expect(screen.getByText("Forma de Pagamento").nextElementSibling).toHaveTextContent("—");
  });

  it("sem fatura selecionada não abre nada", () => {
    render(<ProjectInvoiceDetailsWindow open onOpenChange={() => {}} invoice={null} payment={null} onDownload={() => {}} />);
    expect(screen.queryByTestId("project-invoice-details")).not.toBeInTheDocument();
  });
});
