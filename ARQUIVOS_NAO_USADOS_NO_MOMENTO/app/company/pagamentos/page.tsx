
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DollarSign, CreditCard, TrendingUp, Calendar, Download, Filter, Eye, FileText } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { PageHeader } from "@/components/page-header"

interface Payment {
  id: string
  agency: string
  amount: number
  dueDate: string
  status: "paid" | "pending" | "overdue"
  invoice: string
  project: string
}

export default function CompanyPagamentosPage() {
  const [payments, setPayments] = useState<Payment[]>([
    {
      id: "1",
      agency: "TechCorp Marketing",
      amount: 8500,
      dueDate: "2024-01-15",
      status: "pending",
      invoice: "INV-2024-001",
      project: "Campanha Black Friday",
    },
    {
      id: "2",
      agency: "Creative Partners",
      amount: 12300,
      dueDate: "2024-01-05",
      status: "paid",
      invoice: "INV-2024-002",
      project: "Rebranding Completo",
    },
    {
      id: "3",
      agency: "Digital Solutions",
      amount: 5200,
      dueDate: "2024-01-20",
      status: "pending",
      invoice: "INV-2024-003",
      project: "Website Institucional",
    },
  ])

  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [detailsDialog, setDetailsDialog] = useState(false)

  const handleViewDetails = (payment: Payment) => {
    setSelectedPayment(payment)
    setDetailsDialog(true)
  }

  const handlePayNow = (payment: Payment) => {
    alert(`Processando pagamento de R$ ${payment.amount.toLocaleString()} para ${payment.agency}...`)
  }

  const handleDownloadInvoice = (payment: Payment) => {
    alert(`Baixando fatura ${payment.invoice}...`)
  }

  const handleExportData = () => {
    alert("Exportando dados de pagamentos...")
  }

  const getStatusBadgeClass = (status: string) => {
    if (status === "paid") return "bg-green-500 text-white"
    if (status === "overdue") return "bg-red-500 text-white"
    return "bg-yellow-500 text-white"
  }

  const getStatusLabel = (status: string) => {
    if (status === "paid") return "Pago"
    if (status === "overdue") return "Atrasado"
    return "Pendente"
  }

  const totalPaid = payments.filter((p) => p.status === "paid").reduce((sum, p) => sum + p.amount, 0)
  const totalPending = payments.filter((p) => p.status === "pending").reduce((sum, p) => sum + p.amount, 0)
  const thisMonth = payments
    .filter((p) => new Date(p.dueDate).getMonth() === new Date().getMonth())
    .reduce((sum, p) => sum + p.amount, 0)
  const totalInvoices = payments.length

  return (
    <div className="min-h-screen p-6 px-0 py-0 bg-slate-200">
      <div className="max-w-7xl bg-slate-200 mx-0 my-0 px-0 py-0 space-y-6">
        <PageHeader
          title="Pagamentos"
          description="Gerencie pagamentos e faturas"
          actions={
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={handleExportData}>
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filtros
              </Button>
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <CreditCard className="h-4 w-4 mr-2" />
                Novo Pagamento
              </Button>
            </div>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 h-full">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white/90">Total Pago</p>
                    <p className="text-3xl font-bold text-white">R$ {(totalPaid / 1000).toFixed(1)}k</p>
                  </div>
                  <div className="bg-white/20 p-3 rounded-lg">
                    <DollarSign className="h-8 w-8 text-white" />
                  </div>
                </div>
              </CardContent>
            </div>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
            <div className="bg-gradient-to-r from-yellow-500 to-orange-500 h-full">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white/90">Pendente</p>
                    <p className="text-3xl font-bold text-white">R$ {(totalPending / 1000).toFixed(1)}k</p>
                  </div>
                  <div className="bg-white/20 p-3 rounded-lg">
                    <Calendar className="h-8 w-8 text-white" />
                  </div>
                </div>
              </CardContent>
            </div>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white/90">Este Mês</p>
                    <p className="text-3xl font-bold text-white">R$ {(thisMonth / 1000).toFixed(1)}k</p>
                  </div>
                  <div className="bg-white/20 p-3 rounded-lg">
                    <TrendingUp className="h-8 w-8 text-white" />
                  </div>
                </div>
              </CardContent>
            </div>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-full">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white/90">Faturas</p>
                    <p className="text-3xl font-bold text-white">{totalInvoices}</p>
                  </div>
                  <div className="bg-white/20 p-3 rounded-lg">
                    <CreditCard className="h-8 w-8 text-white" />
                  </div>
                </div>
              </CardContent>
            </div>
          </Card>
        </div>

        <Card className="shadow-lg border-0 bg-white">
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Histórico de Pagamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {payments.length > 0 ? (
              <div className="space-y-4">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="p-4 border rounded-lg hover:shadow-md transition-all bg-gradient-to-r from-gray-50 to-white"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">{payment.agency}</h3>
                          <Badge className={getStatusBadgeClass(payment.status)}>
                            {getStatusLabel(payment.status)}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">Projeto: {payment.project}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>Fatura: {payment.invoice}</span>
                          <span>•</span>
                          <span>Vencimento: {new Date(payment.dueDate).toLocaleDateString("pt-BR")}</span>
                          <span>•</span>
                          <span className="font-semibold text-gray-700">R$ {payment.amount.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleViewDetails(payment)}>
                        <Eye className="h-4 w-4 mr-1" />
                        Ver Detalhes
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDownloadInvoice(payment)}>
                        <Download className="h-4 w-4 mr-1" />
                        Baixar Fatura
                      </Button>
                      {payment.status === "pending" && (
                        <Button
                          size="sm"
                          className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
                          onClick={() => handlePayNow(payment)}
                        >
                          <CreditCard className="h-4 w-4 mr-1" />
                          Pagar Agora
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum pagamento registrado</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={detailsDialog} onOpenChange={setDetailsDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Detalhes do Pagamento</DialogTitle>
              <DialogDescription>Fatura {selectedPayment?.invoice}</DialogDescription>
            </DialogHeader>
            {selectedPayment && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Agência</p>
                    <p className="text-base font-semibold">{selectedPayment.agency}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Valor</p>
                    <p className="text-base font-semibold">R$ {selectedPayment.amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Vencimento</p>
                    <p className="text-base font-semibold">
                      {new Date(selectedPayment.dueDate).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Status</p>
                    <Badge className={getStatusBadgeClass(selectedPayment.status)}>
                      {getStatusLabel(selectedPayment.status)}
                    </Badge>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-gray-500">Projeto</p>
                    <p className="text-base font-semibold">{selectedPayment.project}</p>
                  </div>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button
                    className="flex-1 bg-transparent"
                    variant="outline"
                    onClick={() => handleDownloadInvoice(selectedPayment)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Baixar Fatura
                  </Button>
                  {selectedPayment.status === "pending" && (
                    <Button
                      className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                      onClick={() => handlePayNow(selectedPayment)}
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Pagar Agora
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
