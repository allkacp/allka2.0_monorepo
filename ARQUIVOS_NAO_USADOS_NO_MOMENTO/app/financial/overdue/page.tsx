
import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  AlertTriangle,
  Calendar,
  CreditCard,
  DollarSign,
  ExternalLink,
  Filter,
  Mail,
  MessageSquare,
  Phone,
  Search,
  Send,
  TrendingUp,
  User,
  Building,
} from "lucide-react"
import type { Invoice, BillingStats, BillingFilters } from "@/types/billing"

export default function OverduePage() {
  const [filters, setFilters] = useState<BillingFilters>({
    date_range: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      end: new Date().toISOString().split("T")[0],
    },
    type: "all",
    status: "all",
    overdue_range: "all",
    search: "",
  })

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [showSendPayment, setShowSendPayment] = useState(false)
  const [paymentMessage, setPaymentMessage] = useState("")

  // Mock data - replace with real API calls
  const stats: BillingStats = {
    total_pending: 45,
    total_overdue: 23,
    total_amount_pending: 125000,
    total_amount_overdue: 67500,
    overdue_0_30: 15,
    overdue_31_60: 5,
    overdue_61_90: 2,
    overdue_90_plus: 1,
  }

  const invoices: Invoice[] = [
    {
      id: "INV-001",
      client_id: "client-1",
      client_name: "João Silva",
      client_email: "joao@empresa.com",
      client_phone: "(11) 99999-9999",
      client_company: "Empresa ABC Ltda",
      type: "project",
      amount: 5000,
      due_date: "2024-01-15",
      created_at: "2024-01-01T10:00:00Z",
      status: "overdue",
      overdue_days: 15,
      description: "Projeto de desenvolvimento web",
      reference_id: "PROJ-123",
      checkout_url: "https://checkout.example.com/inv-001",
    },
    {
      id: "INV-002",
      client_id: "client-2",
      client_name: "Maria Santos",
      client_email: "maria@startup.com",
      client_phone: "(11) 88888-8888",
      client_company: "Startup XYZ",
      type: "credit_plan",
      amount: 2500,
      due_date: "2024-01-20",
      created_at: "2024-01-05T14:30:00Z",
      status: "overdue",
      overdue_days: 8,
      description: "Plano de créditos Premium",
      reference_id: "PLAN-456",
      checkout_url: "https://checkout.example.com/inv-002",
    },
  ]

  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      // Date range filter
      const invoiceDate = new Date(invoice.created_at)
      const startDate = new Date(filters.date_range.start)
      const endDate = new Date(filters.date_range.end)
      if (invoiceDate < startDate || invoiceDate > endDate) return false

      // Type filter
      if (filters.type !== "all" && invoice.type !== filters.type) return false

      // Status filter
      if (filters.status !== "all" && invoice.status !== filters.status) return false

      // Overdue range filter
      if (filters.overdue_range !== "all") {
        const days = invoice.overdue_days
        switch (filters.overdue_range) {
          case "0-30":
            if (days < 0 || days > 30) return false
            break
          case "31-60":
            if (days < 31 || days > 60) return false
            break
          case "61-90":
            if (days < 61 || days > 90) return false
            break
          case "90+":
            if (days < 90) return false
            break
        }
      }

      // Search filter
      if (filters.search) {
        const search = filters.search.toLowerCase()
        return (
          invoice.client_name.toLowerCase().includes(search) ||
          invoice.client_email.toLowerCase().includes(search) ||
          invoice.client_company?.toLowerCase().includes(search) ||
          invoice.id.toLowerCase().includes(search)
        )
      }

      return true
    })
  }, [invoices, filters])

  const getStatusBadge = (status: string, overdueDays: number) => {
    if (status === "overdue") {
      if (overdueDays > 90) return { variant: "destructive" as const, label: "90+ dias" }
      if (overdueDays > 60) return { variant: "destructive" as const, label: "61-90 dias" }
      if (overdueDays > 30) return { variant: "secondary" as const, label: "31-60 dias" }
      return { variant: "outline" as const, label: `${overdueDays} dias` }
    }
    return { variant: "default" as const, label: "Pendente" }
  }

  const getTypeLabel = (type: string) => {
    const types = {
      project: "Projeto",
      credit_plan: "Plano de Crédito",
      post_paid: "Pós-pago",
    }
    return types[type as keyof typeof types] || type
  }

  const handleSendPaymentLink = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setPaymentMessage(
      `Olá ${invoice.client_name},\n\nSua fatura no valor de R$ ${invoice.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} está em aberto.\n\nClique no link abaixo para efetuar o pagamento:\n${invoice.checkout_url}\n\nAtenciosamente,\nEquipe Allka`,
    )
    setShowSendPayment(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Inadimplência</h1>
        <p className="text-gray-600 mt-2">Gerencie faturas em aberto e ações de cobrança</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Pendente</p>
                <p className="text-2xl font-bold">{stats.total_pending}</p>
                <p className="text-sm text-gray-500">faturas</p>
              </div>
              <CreditCard className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Em Atraso</p>
                <p className="text-2xl font-bold text-red-600">{stats.total_overdue}</p>
                <p className="text-sm text-gray-500">faturas</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Valor Pendente</p>
                <p className="text-2xl font-bold text-blue-600">
                  R$ {stats.total_amount_pending.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-gray-500">total</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Valor em Atraso</p>
                <p className="text-2xl font-bold text-red-600">
                  R$ {stats.total_amount_overdue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-gray-500">total</p>
              </div>
              <TrendingUp className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <Label>Data Início</Label>
              <Input
                type="date"
                value={filters.date_range.start}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    date_range: { ...prev.date_range, start: e.target.value },
                  }))
                }
              />
            </div>
            <div>
              <Label>Data Fim</Label>
              <Input
                type="date"
                value={filters.date_range.end}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    date_range: { ...prev.date_range, end: e.target.value },
                  }))
                }
              />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select
                value={filters.type}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, type: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="project">Projetos</SelectItem>
                  <SelectItem value="credit_plan">Planos de Crédito</SelectItem>
                  <SelectItem value="post_paid">Pós-pago</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, status: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="overdue">Em Atraso</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Dias de Atraso</Label>
              <Select
                value={filters.overdue_range}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, overdue_range: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="0-30">0-30 dias</SelectItem>
                  <SelectItem value="31-60">31-60 dias</SelectItem>
                  <SelectItem value="61-90">61-90 dias</SelectItem>
                  <SelectItem value="90+">90+ dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Cliente, email, empresa..."
                  value={filters.search}
                  onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoices List */}
      <Card>
        <CardHeader>
          <CardTitle>Faturas ({filteredInvoices.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredInvoices.map((invoice) => {
              const statusBadge = getStatusBadge(invoice.status, invoice.overdue_days)
              return (
                <div
                  key={invoice.id}
                  className={`p-4 border rounded-lg ${invoice.status === "overdue" ? "border-red-200 bg-red-50" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold">{invoice.id}</h3>
                        <Badge variant={statusBadge.variant}>
                          {invoice.status === "overdue" && <AlertTriangle className="h-3 w-3 mr-1" />}
                          {statusBadge.label}
                        </Badge>
                        <Badge variant="outline">{getTypeLabel(invoice.type)}</Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">{invoice.client_name}</span>
                          </div>
                          {invoice.client_company && (
                            <div className="flex items-center gap-2 mb-1">
                              <Building className="h-4 w-4 text-gray-400" />
                              <span className="text-gray-600">{invoice.client_company}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-600">{invoice.client_email}</span>
                          </div>
                          {invoice.client_phone && (
                            <div className="flex items-center gap-2 mt-1">
                              <Phone className="h-4 w-4 text-gray-400" />
                              <span className="text-gray-600">{invoice.client_phone}</span>
                            </div>
                          )}
                        </div>

                        <div>
                          <p className="text-gray-600 mb-1">{invoice.description}</p>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-600">
                              Vencimento: {new Date(invoice.due_date).toLocaleDateString("pt-BR")}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-2xl font-bold text-green-600 mb-2">
                            R$ {invoice.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </p>
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              onClick={() => handleSendPaymentLink(invoice)}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              <Send className="h-4 w-4 mr-1" />
                              Enviar Link
                            </Button>
                            {invoice.checkout_url && (
                              <Button variant="outline" size="sm" asChild>
                                <a href={invoice.checkout_url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4 mr-1" />
                                  Checkout
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Send Payment Link Dialog */}
      <Dialog open={showSendPayment} onOpenChange={setShowSendPayment}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Enviar Link de Pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedInvoice && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold mb-2">Detalhes da Fatura</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p>
                      <strong>Cliente:</strong> {selectedInvoice.client_name}
                    </p>
                    <p>
                      <strong>Email:</strong> {selectedInvoice.client_email}
                    </p>
                  </div>
                  <div>
                    <p>
                      <strong>Valor:</strong> R${" "}
                      {selectedInvoice.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                    <p>
                      <strong>Atraso:</strong> {selectedInvoice.overdue_days} dias
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <Label>Mensagem</Label>
              <Textarea
                value={paymentMessage}
                onChange={(e) => setPaymentMessage(e.target.value)}
                rows={8}
                className="mt-1"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => {
                  // Here you would send the payment link
                  console.log("Sending payment link:", { invoice: selectedInvoice, message: paymentMessage })
                  setShowSendPayment(false)
                }}
              >
                <Send className="h-4 w-4 mr-2" />
                Enviar por Email
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  // Here you would send via WhatsApp
                  console.log("Sending via WhatsApp:", { invoice: selectedInvoice, message: paymentMessage })
                  setShowSendPayment(false)
                }}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Enviar por WhatsApp
              </Button>
              <Button variant="outline" onClick={() => setShowSendPayment(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
