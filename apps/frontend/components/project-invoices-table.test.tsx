import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { ProjectInvoicesTable } from "./project-invoices-table";

// Fatura do proj_956 como o GET /projects/:id/billing devolve.
const invoice = { id: "inv1", invoice_number: "INV-2026-0016", amount: 2148.66, status: "paid", due_date: null, paid_at: "2026-11-01T21:57:01.886Z", description: "Fatura gerada automaticamente — pagamento cmvydegbu00ikvmhowabi37mq (avulso)", payment_id: "p2" };

describe("tabela de faturas da tela do projeto", () => {
  it("adere ao padrão global tabela-cartao: cada célula de dado leva a legenda da coluna; no celular nada fica de fora", () => {
    render(<ProjectInvoicesTable invoices={[invoice]} onView={() => {}} onDownload={() => {}} />);
    const table = screen.getByTestId("project-invoices-table");
    expect(table).toHaveClass("tabela-cartao");
    const row = within(table).getAllByRole("row")[1];
    const cells = within(row).getAllByRole("cell");
    expect(cells.map((c) => c.getAttribute("data-rotulo"))).toEqual(["Situação", "Fatura", "Descrição", "Vencimento", "Valor", null]);
    // as legendas correspondem aos títulos das colunas do desktop
    const heads = within(table).getAllByRole("columnheader").map((h) => h.textContent);
    expect(heads.slice(0, 5).map((h) => h!.toLowerCase())).toEqual(["situação", "fatura", "descrição", "vencimento", "valor"]);
    // descrição inteira no celular (no desktop continua resumida na coluna)
    expect(cells[2]).toHaveTextContent(invoice.description);
    expect(cells[2]).toHaveClass("truncate", "max-md:whitespace-normal", "max-md:max-w-none");
    expect(cells[1]).toHaveTextContent("INV-2026-0016");
    expect(cells[3]).toHaveTextContent("—");
    expect(cells[4]).toHaveTextContent("R$ 2.148,66");
  });

  it("ações acessíveis pelo nome: ver detalhes abre a fatura e baixar chama o download", () => {
    const onView = vi.fn();
    const onDownload = vi.fn();
    render(<ProjectInvoicesTable invoices={[invoice]} onView={onView} onDownload={onDownload} />);
    fireEvent.click(screen.getByRole("button", { name: "Ver detalhes da fatura INV-2026-0016" }));
    expect(onView).toHaveBeenCalledWith(invoice);
    fireEvent.click(screen.getByRole("button", { name: "Baixar PDF da fatura INV-2026-0016" }));
    expect(onDownload).toHaveBeenCalledWith(invoice);
  });

  it("sem faturas mostra a linha de vazio ocupando a largura toda", () => {
    render(<ProjectInvoicesTable invoices={[]} onView={() => {}} onDownload={() => {}} />);
    const cell = screen.getByText("Nenhuma fatura encontrada para este projeto.");
    expect(cell).toHaveAttribute("colspan", "6");
  });
});
