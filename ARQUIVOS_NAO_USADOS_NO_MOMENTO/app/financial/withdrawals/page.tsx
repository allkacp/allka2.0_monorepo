
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Calendar,
  FileText,
  Building2,
  CreditCard,
  Download,
  Eye,
} from "lucide-react"
import type { WithdrawalRequestExtended, FinancialStats, OmiePaymentOrder } from "@/types/financial"

export default function WithdrawalRequestsPage() {
  const [requests, setRequests] = useState<WithdrawalRequestExtended[]>([])
  const [stats, setStats] = useState<FinancialStats | null>(null)
  const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequestExtended | null>(null)
  const [viewMode, setViewMode] = useState<"list" | "kanban">("kanban")
  const [filters, setFilters] = useState({
    status: "all",
    period: "all",
    agency: "",
    search: "",
  })
  const [loading, setLoading] = useState(true)

  // Mock data - Em produção, viria da API
  useEffect(() => {
    const mockStats: FinancialStats = {
      total_pending_amount: 45750.0,
      total_requests_count: 23,
      requests_by_status: {
        aguardando_analise: 8,
        pagamento_agendado: 5,
        pagamento_efetuado: 7,
        cancelado: 2,
        reprovado: 1,
      },
      overdue_analysis: 3,
      overdue_payment: 1,
      monthly_volume: 125000.0,
      average_processing_time: 4.2,
    }

    const mockRequests: WithdrawalRequestExtended[] = [
      {
        id: 1,
        agency_id: 101,
        agency_name: "Agência Digital Pro",
        agency_cnpj: "12.345.678/0001-90",
        amount: 5500.0,
        status: "aguardando_analise",
        requested_at: "2024-01-15T10:30:00Z",
        invoice_url: "/invoices/invoice-001.pdf",
        analysis_deadline: "2024-01-18T17:00:00Z",
        bank_account: {
          bank_name: "Banco do Brasil",
          agency: "1234-5",
          account: "12345-6",
          account_type: "checking",
          cnpj: "12.345.678/0001-90",
        },
      },
      {
        id: 2,
        agency_id: 102,
        agency_name: "Tech Solutions",
        agency_cnpj: "98.765.432/0001-10",
        amount: 8200.0,
        status: "pagamento_agendado",
        requested_at: "2024-01-12T14:20:00Z",
        processed_at: "2024-01-14T09:15:00Z",
        payment_scheduled_date: "2024-01-19T00:00:00Z",
        analysis_deadline: "2024-01-15T17:00:00Z",
        payment_deadline: "2024-01-21T17:00:00Z",
        omie_payment_id: "OMI-2024-001",
        bank_account: {
          bank_name: "Itaú",
          agency: "5678",
          account: "98765-4",
          account_type: "checking",
          cnpj: "98.765.432/0001-10",
        },
      },
      {
        id: 3,
        agency_id: 103,
        agency_name: "Creative Agency",
        agency_cnpj: "11.222.333/0001-44",
        amount: 3200.0,
        status: "reprovado",
        requested_at: "2024-01-10T16:45:00Z",
        processed_at: "2024-01-13T11:30:00Z",
        rejection_reason: "Nota fiscal com dados incorretos",
        correction_deadline: "2024-01-20T17:00:00Z",
        auto_cancel_date: "2024-01-20T17:00:00Z",
        analysis_deadline: "2024-01-13T17:00:00Z",
        bank_account: {
          bank_name: "Santander",
          agency: "9876",
          account: "54321-8",
          account_type: "savings",
          cnpj: "11.222.333/0001-44",
        },
      },
    ]

    setStats(mockStats)
    setRequests(mockRequests)
    setLoading(false)
  }, [])

  const getStatusConfig = (status: WithdrawalRequestExtended["status"]) => {
    const configs = {
      aguardando_analise: {
        label: "Aguardando Análise",
        color: "bg-yellow-100 text-yellow-800 border-yellow-200",
        icon: Clock,
      },
      pagamento_agendado: {
        label: "Pagamento Agendado",
        color: "bg-blue-100 text-blue-800 border-blue-200",
        icon: Calendar,
      },
      pagamento_efetuado: {
        label: "Pagamento Efetuado",
        color: "bg-green-100 text-green-800 border-green-200",
        icon: CheckCircle,
      },
      cancelado: {
        label: "Cancelado",
        color: "bg-gray-100 text-gray-800 border-gray-200",
        icon: XCircle,
      },
      reprovado: {
        label: "Reprovado",
        color: "bg-red-100 text-red-800 border-red-200",
        icon: AlertTriangle,
      },
    }
    return configs[status]
  }

  const isOverdue = (request: WithdrawalRequestExtended) => {
    const now = new Date()
    if (request.status === "aguardando_analise") {
      return new Date(request.analysis_deadline) < now
    }
    if (request.status === "pagamento_agendado" && request.payment_deadline) {
      return new Date(request.payment_deadline) < now
    }
    return false
  }

  const handleStatusChange = async (requestId: number, newStatus: WithdrawalRequestExtended["status"], data?: any) => {
    console.log("[v0] Status change:", { requestId, newStatus, data })

    // Simular atualização
    setRequests((prev) =>
      prev.map((req) =>
        req.id === requestId
          ? {
              ...req,
              status: newStatus,
              processed_at: new Date().toISOString(),
              ...data,
            }
          : req,
      ),
    )
  }

  const generateOmiePayment = async (request: WithdrawalRequestExtended) => {
    console.log("[v0] Generating Omie payment for request:", request.id)

    const paymentOrder: OmiePaymentOrder = {
      id: `OMI-${new Date().getFullYear()}-${String(request.id).padStart(3, "0")}`,
      withdrawal_request_id: request.id,
      amount: request.amount,
      recipient: {
        name: request.agency_name,
        cnpj: request.agency_cnpj,
        bank_account: {
          bank_code: getBankCode(request.bank_account.bank_name),
          agency: request.bank_account.agency,
          account: request.bank_account.account,
          account_type: request.bank_account.account_type,
        },
      },
      scheduled_date: request.payment_scheduled_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: "pending",
      created_at: new Date().toISOString(),
    }

    // Simular envio para Omie
    await new Promise((resolve) => setTimeout(resolve, 1000))

    return paymentOrder
  }

  const getBankCode = (bankName: string): string => {
    const bankCodes: Record<string, string> = {
      "Banco do Brasil": "001",
      Itaú: "341",
      Santander: "033",
      Caixa: "104",
      Bradesco: "237",
    }
    return bankCodes[bankName] || "000"
  }

  const filteredRequests = requests.filter((request) => {
    if (filters.status !== "all" && request.status !== filters.status) return false
    if (filters.agency && !request.agency_name.toLowerCase().includes(filters.agency.toLowerCase())) return false
    if (
      filters.search &&
      !request.agency_name.toLowerCase().includes(filters.search.toLowerCase()) &&
      !request.agency_cnpj.includes(filters.search)
    )
      return false
    return true
  })

  const groupedRequests = {
    aguardando_analise: filteredRequests.filter((r) => r.status === "aguardando_analise"),
    pagamento_agendado: filteredRequests.filter((r) => r.status === "pagamento_agendado"),
    pagamento_efetuado: filteredRequests.filter((r) => r.status === "pagamento_efetuado"),
    cancelado: filteredRequests.filter((r) => r.status === "cancelado"),
    reprovado: filteredRequests.filter((r) => r.status === "reprovado"),
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Solicitações de Saque</h1>
          <p className="text-gray-600 mt-1">Gerencie todas as solicitações de saque da plataforma</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setViewMode(viewMode === "list" ? "kanban" : "list")}>
            {viewMode === "list" ? "Visualização Kanban" : "Visualização Lista"}
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Valor Pendente</p>
                  <p className="text-2xl font-bold text-blue-600">
                    R$ {stats.total_pending_amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total de Solicitações</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_requests_count}</p>
                </div>
                <FileText className="h-8 w-8 text-gray-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Análises Atrasadas</p>
                  <p className="text-2xl font-bold text-red-600">{stats.overdue_analysis}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tempo Médio</p>
                  <p className="text-2xl font-bold text-green-600">{stats.average_processing_time} dias</p>
                </div>
                <Clock className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="status-filter">Status</Label>
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="aguardando_analise">Aguardando Análise</SelectItem>
                  <SelectItem value="pagamento_agendado">Pagamento Agendado</SelectItem>
                  <SelectItem value="pagamento_efetuado">Pagamento Efetuado</SelectItem>
                  <SelectItem value="reprovado">Reprovado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="period-filter">Período</Label>
              <Select
                value={filters.period}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, period: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os períodos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os períodos</SelectItem>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="week">Esta semana</SelectItem>
                  <SelectItem value="month">Este mês</SelectItem>
                  <SelectItem value="quarter">Este trimestre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="agency-filter">Agência</Label>
              <Input
                id="agency-filter"
                placeholder="Filtrar por agência..."
                value={filters.agency}
                onChange={(e) => setFilters((prev) => ({ ...prev, agency: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="search">Busca Geral</Label>
              <Input
                id="search"
                placeholder="CNPJ, nome da agência..."
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {viewMode === "kanban" ? (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {Object.entries(groupedRequests).map(([status, statusRequests]) => {
            const config = getStatusConfig(status as WithdrawalRequestExtended["status"])
            return (
              <div key={status} className="space-y-4">
                <div className="flex items-center gap-2">
                  <config.icon className="h-5 w-5" />
                  <h3 className="font-semibold">{config.label}</h3>
                  <Badge variant="secondary">{statusRequests.length}</Badge>
                </div>

                <div className="space-y-3">
                  {statusRequests.map((request) => (
                    <Card
                      key={request.id}
                      className={`cursor-pointer hover:shadow-md transition-shadow ${
                        isOverdue(request) ? "border-red-300 bg-red-50" : ""
                      }`}
                      onClick={() => setSelectedRequest(request)}
                    >
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <h4 className="font-medium text-sm">{request.agency_name}</h4>
                            {isOverdue(request) && <AlertTriangle className="h-4 w-4 text-red-500" />}
                          </div>

                          <p className="text-xs text-gray-600">{request.agency_cnpj}</p>

                          <div className="flex justify-between items-center">
                            <span className="font-bold text-green-600">
                              R$ {request.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(request.requested_at).toLocaleDateString("pt-BR")}
                            </span>
                          </div>

                          {request.invoice_url && (
                            <div className="flex items-center gap-1 text-xs text-blue-600">
                              <FileText className="h-3 w-3" />
                              NF anexada
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-4 font-semibold">Agência</th>
                    <th className="text-left p-4 font-semibold">Valor</th>
                    <th className="text-left p-4 font-semibold">Status</th>
                    <th className="text-left p-4 font-semibold">Solicitado em</th>
                    <th className="text-left p-4 font-semibold">Prazo</th>
                    <th className="text-left p-4 font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((request) => {
                    const config = getStatusConfig(request.status)
                    return (
                      <tr key={request.id} className="border-t hover:bg-gray-50">
                        <td className="p-4">
                          <div>
                            <p className="font-medium">{request.agency_name}</p>
                            <p className="text-sm text-gray-600">{request.agency_cnpj}</p>
                          </div>
                        </td>
                        <td className="p-4 font-bold text-green-600">
                          R$ {request.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-4">
                          <Badge className={config.color}>
                            <config.icon className="h-3 w-3 mr-1" />
                            {config.label}
                          </Badge>
                        </td>
                        <td className="p-4 text-sm text-gray-600">
                          {new Date(request.requested_at).toLocaleDateString("pt-BR")}
                        </td>
                        <td className="p-4">
                          {isOverdue(request) ? (
                            <Badge className="bg-red-100 text-red-800">Atrasado</Badge>
                          ) : (
                            <span className="text-sm text-gray-600">
                              {new Date(request.analysis_deadline).toLocaleDateString("pt-BR")}
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <Button variant="outline" size="sm" onClick={() => setSelectedRequest(request)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Request Detail Modal */}
      {selectedRequest && (
        <RequestDetailModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onStatusChange={handleStatusChange}
          onGenerateOmiePayment={generateOmiePayment}
        />
      )}
    </div>
  )
}

function RequestDetailModal({
  request,
  onClose,
  onStatusChange,
  onGenerateOmiePayment,
}: {
  request: WithdrawalRequestExtended
  onClose: () => void
  onStatusChange: (id: number, status: WithdrawalRequestExtended["status"], data?: any) => void
  onGenerateOmiePayment: (request: WithdrawalRequestExtended) => Promise<OmiePaymentOrder>
}) {
  const [newStatus, setNewStatus] = useState(request.status)
  const [notes, setNotes] = useState(request.notes || "")
  const [paymentDate, setPaymentDate] = useState("")
  const [rejectionReason, setRejectionReason] = useState("")
  const [loading, setLoading] = useState(false)

  const config = getStatusConfig(request.status)

  const handleApprove = async () => {
    setLoading(true)
    try {
      // Gerar ordem de pagamento no Omie
      const omieOrder = await onGenerateOmiePayment(request)

      onStatusChange(request.id, "pagamento_agendado", {
        payment_scheduled_date: paymentDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        omie_payment_id: omieOrder.id,
        notes,
      })
      onClose()
    } catch (error) {
      console.error("Erro ao aprovar solicitação:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleReject = () => {
    onStatusChange(request.id, "reprovado", {
      rejection_reason: rejectionReason,
      correction_deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      notes,
    })
    onClose()
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <config.icon className="h-5 w-5" />
            Solicitação de Saque #{request.id}
          </DialogTitle>
          <DialogDescription>Gerencie esta solicitação de saque da {request.agency_name}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status atual */}
          <div className="flex items-center gap-4">
            <Badge className={config.color}>
              <config.icon className="h-3 w-3 mr-1" />
              {config.label}
            </Badge>
            {request.omie_payment_id && <Badge variant="outline">Omie: {request.omie_payment_id}</Badge>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Informações da Agência */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Informações da Agência
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-sm font-medium">Nome</Label>
                  <p className="text-sm">{request.agency_name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">CNPJ</Label>
                  <p className="text-sm">{request.agency_cnpj}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Valor Solicitado</Label>
                  <p className="text-lg font-bold text-green-600">
                    R$ {request.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Data da Solicitação</Label>
                  <p className="text-sm">{new Date(request.requested_at).toLocaleString("pt-BR")}</p>
                </div>
              </CardContent>
            </Card>

            {/* Dados Bancários */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Dados Bancários
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-sm font-medium">Banco</Label>
                  <p className="text-sm">{request.bank_account.bank_name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Agência</Label>
                  <p className="text-sm">{request.bank_account.agency}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Conta</Label>
                  <p className="text-sm">{request.bank_account.account}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Tipo</Label>
                  <p className="text-sm">
                    {request.bank_account.account_type === "checking" ? "Conta Corrente" : "Poupança"}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">CNPJ da Conta</Label>
                  <p className="text-sm">{request.bank_account.cnpj}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Documentos */}
          {request.invoice_url && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Documentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button variant="outline" asChild>
                  <a href={request.invoice_url} target="_blank" rel="noopener noreferrer">
                    <FileText className="h-4 w-4 mr-2" />
                    Visualizar Nota Fiscal
                  </a>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Ações */}
          {request.status === "aguardando_analise" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Ações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs defaultValue="approve">
                  <TabsList>
                    <TabsTrigger value="approve">Aprovar</TabsTrigger>
                    <TabsTrigger value="reject">Reprovar</TabsTrigger>
                  </TabsList>

                  <TabsContent value="approve" className="space-y-4">
                    <div>
                      <Label htmlFor="payment-date">Data de Pagamento (opcional)</Label>
                      <Input
                        id="payment-date"
                        type="date"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                      />
                      <p className="text-xs text-gray-500 mt-1">Se não definida, será agendada para 7 dias úteis</p>
                    </div>

                    <div>
                      <Label htmlFor="approval-notes">Observações</Label>
                      <Textarea
                        id="approval-notes"
                        placeholder="Observações sobre a aprovação..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>

                    <Button
                      onClick={handleApprove}
                      className="w-full bg-green-600 hover:bg-green-700"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Processando...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Aprovar e Gerar Ordem de Pagamento
                        </>
                      )}
                    </Button>
                  </TabsContent>

                  <TabsContent value="reject" className="space-y-4">
                    <div>
                      <Label htmlFor="rejection-reason">Motivo da Reprovação</Label>
                      <Textarea
                        id="rejection-reason"
                        placeholder="Descreva o motivo da reprovação..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        required
                      />
                    </div>

                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        A agência terá 7 dias para corrigir a solicitação. Após esse prazo, ela será cancelada
                        automaticamente.
                      </AlertDescription>
                    </Alert>

                    <Button
                      onClick={handleReject}
                      variant="destructive"
                      className="w-full"
                      disabled={!rejectionReason.trim()}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reprovar Solicitação
                    </Button>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}

          {/* Histórico */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Histórico</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-600">{new Date(request.requested_at).toLocaleString("pt-BR")}</span>
                  <span>Solicitação criada</span>
                </div>

                {request.processed_at && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-gray-600">{new Date(request.processed_at).toLocaleString("pt-BR")}</span>
                    <span>Status alterado para {config.label}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function getStatusConfig(status: WithdrawalRequestExtended["status"]) {
  const configs = {
    aguardando_analise: {
      label: "Aguardando Análise",
      color: "bg-yellow-100 text-yellow-800 border-yellow-200",
      icon: Clock,
    },
    pagamento_agendado: {
      label: "Pagamento Agendado",
      color: "bg-blue-100 text-blue-800 border-blue-200",
      icon: Calendar,
    },
    pagamento_efetuado: {
      label: "Pagamento Efetuado",
      color: "bg-green-100 text-green-800 border-green-200",
      icon: CheckCircle,
    },
    cancelado: {
      label: "Cancelado",
      color: "bg-gray-100 text-gray-800 border-gray-200",
      icon: XCircle,
    },
    reprovado: {
      label: "Reprovado",
      color: "bg-red-100 text-red-800 border-red-200",
      icon: AlertTriangle,
    },
  }
  return configs[status]
}
