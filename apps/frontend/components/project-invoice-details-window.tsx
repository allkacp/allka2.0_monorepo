// Detalhes da Fatura (tela do projeto → Faturamento → olho) em JANELA MOLDURA (`FramedModal`), por cima da tela do projeto.
// Antes era um slide lateral sob o cabeçalho global, montado com campos de demonstração (valor/mês/competência) que a
// fatura real não tem — abrir uma fatura de verdade quebrava a tela. Aqui só aparece o que a fatura e o pagamento
// gravaram: número, valor, situação, vencimento, data do pagamento, forma e os itens congelados no pagamento.
import { Building2, Calendar, DollarSign, Download, FileText, Package, X } from "lucide-react";
import { FramedModal, FRAMED_FOOTER_CLASS, FRAMED_HEADER_CLASS } from "@/components/framed-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtDateBR, NO_VALUE, paymentMethodLabel } from "@/lib/project-display";

export type ProjectInvoice = {
  id: string;
  invoice_number?: string | null;
  amount?: number | null;
  status?: string | null;
  due_date?: string | null;
  paid_at?: string | null;
  description?: string | null;
  payment_id?: string | null;
};
export type ProjectInvoicePayment = {
  id: string;
  payment_method?: string | null;
  items?: { product_name_snapshot?: string | null; total_snapshot?: number | null }[];
};

const STATUS: Record<string, { label: string; cls: string }> = {
  paid: { label: "Pago", cls: "bg-green-500" },
  overdue: { label: "Atrasado", cls: "bg-red-500" },
  cancelled: { label: "Cancelado", cls: "bg-slate-400" },
};
const brl = (v?: number | null) => `R$ ${Number(v ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function ProjectInvoiceDetailsWindow({ open, onOpenChange, invoice, payment, agencyName, clientName, onDownload }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: ProjectInvoice | null;
  /** Pagamento ligado à fatura (payment_id), com os itens congelados. */
  payment: ProjectInvoicePayment | null;
  agencyName?: string | null;
  clientName?: string | null;
  onDownload: (invoice: ProjectInvoice) => void;
}) {
  const status = STATUS[invoice?.status ?? ""] ?? { label: "Pendente", cls: "bg-yellow-500" };
  const items = payment?.items ?? [];
  return (
    <FramedModal open={open && !!invoice} onOpenChange={onOpenChange} testId="project-invoice-details" title="Detalhes da Fatura" className="max-w-4xl sm:!max-w-4xl">
      {invoice && (
        <>
          {/* Header with gradient */}
          <div className={`relative shrink-0 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 pr-14 text-white ${FRAMED_HEADER_CLASS}`} data-testid="project-invoice-details-header">
            <button
              type="button"
              aria-label="Fechar detalhes da fatura"
              onClick={() => onOpenChange(false)}
              className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg text-white/90 transition-colors hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-white/20 p-2 backdrop-blur-sm">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Detalhes da Fatura</h2>
                  <p className="text-sm text-white/90">{invoice.invoice_number ?? NO_VALUE}</p>
                </div>
              </div>
              <Badge className={`${status.cls} text-white`}>{status.label}</Badge>
            </div>
            {/* Main value display */}
            <div className="mt-4 rounded-lg bg-white/10 p-4 backdrop-blur-sm">
              <p className="mb-1 text-sm text-white/80">Valor Total</p>
              <p className="text-3xl font-bold">{brl(invoice.amount)}</p>
            </div>
          </div>

          {/* Content with scroll — só o corpo rola */}
          <div className="mt-[10px] min-h-0 flex-1 space-y-6 overflow-y-auto rounded-2xl bg-white p-6 dark:bg-slate-900" data-testid="project-invoice-details-body">
            {/* Payment Information */}
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Building2 className="h-4 w-4 text-blue-600" />
                Informações de Pagamento
              </h3>
              <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted/30 p-4">
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Agência</p>
                  <p className="text-sm font-medium">{agencyName || NO_VALUE}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Cliente</p>
                  <p className="text-sm font-medium">{clientName || NO_VALUE}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Forma de Pagamento</p>
                  <p className="text-sm font-medium">{paymentMethodLabel(payment?.payment_method)}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Descrição</p>
                  <p className="break-words text-sm font-medium">{invoice.description || NO_VALUE}</p>
                </div>
              </div>
            </div>

            {/* Dates */}
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Calendar className="h-4 w-4 text-blue-600" />
                Datas
              </h3>
              <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted/30 p-4">
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Vencimento</p>
                  <p className="text-sm font-medium">{fmtDateBR(invoice.due_date)}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Data de Pagamento</p>
                  <p className="text-sm font-medium">
                    {invoice.paid_at ? fmtDateBR(invoice.paid_at) : invoice.status === "paid" ? NO_VALUE : "Aguardando pagamento"}
                  </p>
                </div>
              </div>
            </div>

            {/* Products — itens congelados no pagamento desta fatura */}
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Package className="h-4 w-4 text-blue-600" />
                Produtos/Serviços Incluídos
              </h3>
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs">Produto</TableHead>
                      <TableHead className="text-right text-xs">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, idx) => (
                      <TableRow key={idx}>
                        {/* no celular o nome longo quebra a linha em vez de exigir rolagem lateral */}
                        <TableCell className="text-xs font-medium max-md:whitespace-normal max-md:break-words">{item.product_name_snapshot || NO_VALUE}</TableCell>
                        <TableCell className="text-right text-xs font-semibold">{brl(item.total_snapshot)}</TableCell>
                      </TableRow>
                    ))}
                    {items.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={2} className="py-6 text-center text-xs text-slate-400">
                          Itens não registrados para esta fatura.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Summary */}
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <DollarSign className="h-4 w-4 text-blue-600" />
                Resumo Financeiro
              </h3>
              <div className="space-y-2 rounded-lg border bg-muted/20 p-4">
                <div className="flex justify-between text-base font-bold">
                  <span>Total</span>
                  <span className="text-blue-600">{brl(invoice.amount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer with action */}
          <div className={`mt-[10px] shrink-0 ${FRAMED_FOOTER_CLASS}`}>
            <Button className="w-full" onClick={() => onDownload(invoice)}>
              <Download className="mr-2 h-4 w-4" />
              Baixar PDF da Fatura
            </Button>
          </div>
        </>
      )}
    </FramedModal>
  );
}
