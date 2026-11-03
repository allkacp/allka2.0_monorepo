// Tabela de faturas da tela do projeto (Faturamento → Faturas). No desktop é a mesma tabela de sempre;
// abaixo de 768 px vira cartão pelo padrão global `tabela-cartao` (cada célula com a legenda em `data-rotulo`,
// ações no rodapé do cartão) — antes exigia rolagem lateral no celular (reteste Codex 01/11).
import { Download, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ProjectInvoice } from "@/components/project-invoice-details-window";

const STATUS: Record<string, { label: string; cls: string }> = {
  paid: { label: "Pago", cls: "bg-green-500 hover:bg-green-600" },
  overdue: { label: "Atrasado", cls: "bg-red-500 hover:bg-red-600" },
  cancelled: { label: "Cancelado", cls: "bg-slate-400 hover:bg-slate-500" },
};
const PENDING = { label: "Pendente", cls: "bg-yellow-500 hover:bg-yellow-600" };

export function ProjectInvoicesTable({ invoices, onView, onDownload }: {
  invoices: ProjectInvoice[];
  onView: (invoice: ProjectInvoice) => void;
  onDownload: (invoice: ProjectInvoice) => void;
}) {
  return (
    <div className="border rounded-lg overflow-hidden max-md:border-0 max-md:rounded-none max-md:overflow-visible">
      <Table className="tabela-cartao" data-testid="project-invoices-table">
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="text-xs font-semibold">SITUAÇÃO</TableHead>
            <TableHead className="text-xs font-semibold">FATURA</TableHead>
            <TableHead className="text-xs font-semibold">DESCRIÇÃO</TableHead>
            <TableHead className="text-xs font-semibold">VENCIMENTO</TableHead>
            <TableHead className="text-xs font-semibold">VALOR</TableHead>
            <TableHead className="text-xs font-semibold text-right">AÇÕES</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => {
            const status = STATUS[invoice.status ?? ""] ?? PENDING;
            return (
              <TableRow key={invoice.id} className="hover:bg-muted/30">
                <TableCell className="py-2" data-rotulo="Situação">
                  <Badge className={`${status.cls} text-white text-xs`}>{status.label}</Badge>
                </TableCell>
                <TableCell className="text-xs font-medium" data-rotulo="Fatura">
                  {invoice.invoice_number ?? invoice.id.slice(-8).toUpperCase()}
                </TableCell>
                {/* no celular a descrição aparece inteira (no desktop continua resumida na coluna) */}
                <TableCell className="text-xs max-w-[180px] truncate max-md:max-w-none max-md:whitespace-normal max-md:break-words" data-rotulo="Descrição">
                  {invoice.description ?? "—"}
                </TableCell>
                <TableCell className="text-xs" data-rotulo="Vencimento">
                  {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString("pt-BR") : "—"}
                </TableCell>
                <TableCell className="text-xs font-semibold" data-rotulo="Valor">
                  R$ {(invoice.amount ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 bg-blue-100 hover:bg-blue-200"
                      aria-label={`Ver detalhes da fatura ${invoice.invoice_number ?? ""}`.trim()}
                      onClick={() => onView(invoice)}
                    >
                      <Eye className="h-3.5 w-3.5 text-blue-700" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 bg-yellow-100 hover:bg-yellow-200"
                      aria-label={`Baixar PDF da fatura ${invoice.invoice_number ?? ""}`.trim()}
                      onClick={() => onDownload(invoice)}
                    >
                      <Download className="h-3.5 w-3.5 text-yellow-700" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          {invoices.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-xs text-slate-400 py-8">
                Nenhuma fatura encontrada para este projeto.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
