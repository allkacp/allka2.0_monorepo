
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import {
  ShoppingBag,
  CreditCard,
  Package,
  Search,
  Download,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Clock,
} from "lucide-react"

interface ProjectPurchase {
  id: string
  item_id: string
  item_name: string
  item_description: string
  purchase_type: "product" | "service" | "addon" | "upgrade"
  quantity: number
  unit_price: number
  total_price: number
  payment_status: "pending" | "paid" | "failed" | "refunded"
  payment_method?: string
  payment_date?: string
  metadata: Record<string, any>
  created_at: string
}

interface PurchaseSummary {
  total_spent: number
  total_items: number
  pending_payments: number
  successful_payments: number
  failed_payments: number
  refunded_payments: number
}

interface ProjectPurchasesTabProps {
  projectId: string
}

export default function ProjectPurchasesTab({ projectId }: ProjectPurchasesTabProps) {
  const { toast } = useToast()
  const [purchases, setPurchases] = useState<ProjectPurchase[]>([])
  const [summary, setSummary] = useState<PurchaseSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")

  useEffect(() => {
    loadPurchases()
    loadSummary()
  }, [projectId])

  const loadPurchases = async () => {
    try {
      // Mock data - in real app, fetch from API
      const mockPurchases: ProjectPurchase[] = [
        {
          id: "purchase-1",
          item_id: "product-1",
          item_name: "Logo Design Premium",
          item_description: "Criação de logo profissional com variações e manual de marca",
          purchase_type: "product",
          quantity: 1,
          unit_price: 1500,
          total_price: 1500,
          payment_status: "paid",
          payment_method: "credit_card",
          payment_date: "2024-12-20T10:00:00Z",
          metadata: {
            category: "Design",
            complexity: "high",
            delivery_time: "5 dias",
          },
          created_at: "2024-12-20T09:30:00Z",
        },
        {
          id: "purchase-2",
          item_id: "service-1",
          item_name: "Consultoria de Marketing Digital",
          item_description: "Análise completa e estratégia de marketing digital",
          purchase_type: "service",
          quantity: 1,
          unit_price: 2500,
          total_price: 2500,
          payment_status: "paid",
          payment_method: "pix",
          payment_date: "2024-12-21T14:30:00Z",
          metadata: {
            category: "Marketing",
            duration: "30 dias",
            includes: ["Análise", "Estratégia", "Relatório"],
          },
          created_at: "2024-12-21T14:00:00Z",
        },
        {
          id: "purchase-3",
          item_id: "addon-1",
          item_name: "Revisões Extras",
          item_description: "Pacote adicional de 3 revisões para o logo",
          purchase_type: "addon",
          quantity: 1,
          unit_price: 300,
          total_price: 300,
          payment_status: "pending",
          metadata: {
            related_to: "purchase-1",
            revision_count: 3,
          },
          created_at: "2024-12-25T16:20:00Z",
        },
        {
          id: "purchase-4",
          item_id: "product-2",
          item_name: "Website Responsivo",
          item_description: "Desenvolvimento de website institucional responsivo",
          purchase_type: "product",
          quantity: 1,
          unit_price: 5000,
          total_price: 5000,
          payment_status: "failed",
          payment_method: "credit_card",
          metadata: {
            category: "Desenvolvimento",
            pages: 5,
            cms: true,
            reason: "Cartão recusado",
          },
          created_at: "2024-12-24T11:15:00Z",
        },
      ]

      setPurchases(mockPurchases)
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao carregar histórico de compras",
        variant: "destructive",
      })
    }
  }

  const loadSummary = async () => {
    try {
      const mockSummary: PurchaseSummary = {
        total_spent: 4000,
        total_items: 4,
        pending_payments: 1,
        successful_payments: 2,
        failed_payments: 1,
        refunded_payments: 0,
      }

      setSummary(mockSummary)
    } catch (error) {
      console.error("Failed to load purchase summary:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    const icons = {
      paid: <CheckCircle className="h-4 w-4 text-green-500" />,
      pending: <Clock className="h-4 w-4 text-yellow-500" />,
      failed: <AlertTriangle className="h-4 w-4 text-red-500" />,
      refunded: <RefreshCw className="h-4 w-4 text-blue-500" />,
    }
    return icons[status as keyof typeof icons] || <Clock className="h-4 w-4" />
  }

  const getStatusColor = (status: string) => {
    const colors = {
      paid: "bg-green-100 text-green-800",
      pending: "bg-yellow-100 text-yellow-800",
      failed: "bg-red-100 text-red-800",
      refunded: "bg-blue-100 text-blue-800",
    }
    return colors[status as keyof typeof colors] || colors.pending
  }

  const getStatusLabel = (status: string) => {
    const labels = {
      paid: "Pago",
      pending: "Pendente",
      failed: "Falhou",
      refunded: "Reembolsado",
    }
    return labels[status as keyof typeof labels] || "Pendente"
  }

  const getTypeColor = (type: string) => {
    const colors = {
      product: "bg-blue-100 text-blue-800",
      service: "bg-purple-100 text-purple-800",
      addon: "bg-orange-100 text-orange-800",
      upgrade: "bg-green-100 text-green-800",
    }
    return colors[type as keyof typeof colors] || colors.product
  }

  const getTypeLabel = (type: string) => {
    const labels = {
      product: "Produto",
      service: "Serviço",
      addon: "Complemento",
      upgrade: "Upgrade",
    }
    return labels[type as keyof typeof labels] || "Produto"
  }

  const filteredPurchases = purchases.filter((purchase) => {
    const matchesSearch =
      purchase.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      purchase.item_description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || purchase.payment_status === statusFilter
    const matchesType = typeFilter === "all" || purchase.purchase_type === typeFilter
    return matchesSearch && matchesStatus && matchesType
  })

  const retryPayment = async (purchaseId: string) => {
    try {
      // Mock retry payment
      toast({
        title: "Pagamento Processado",
        description: "Tentativa de pagamento iniciada. Você será notificado sobre o resultado.",
      })
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao processar pagamento",
        variant: "destructive",
      })
    }
  }

  const downloadInvoice = async (purchaseId: string) => {
    try {
      // Mock download
      toast({
        title: "Download Iniciado",
        description: "O download da nota fiscal foi iniciado.",
      })
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao baixar nota fiscal",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Carregando histórico de compras...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="purchases" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="purchases">
            <ShoppingBag className="h-4 w-4 mr-2" />
            Compras
          </TabsTrigger>
          <TabsTrigger value="summary">
            <CreditCard className="h-4 w-4 mr-2" />
            Resumo Financeiro
          </TabsTrigger>
        </TabsList>

        <TabsContent value="purchases" className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar compras..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <select
              className="p-2 border rounded-md"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Todos os status</option>
              <option value="paid">Pagos</option>
              <option value="pending">Pendentes</option>
              <option value="failed">Falharam</option>
              <option value="refunded">Reembolsados</option>
            </select>

            <select
              className="p-2 border rounded-md"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">Todos os tipos</option>
              <option value="product">Produtos</option>
              <option value="service">Serviços</option>
              <option value="addon">Complementos</option>
              <option value="upgrade">Upgrades</option>
            </select>
          </div>

          {/* Purchases Table */}
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Compras ({filteredPurchases.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Quantidade</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPurchases.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <Package className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <p>Nenhuma compra encontrada</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPurchases.map((purchase) => (
                        <TableRow key={purchase.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{purchase.item_name}</div>
                              <div className="text-sm text-gray-500">{purchase.item_description}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getTypeColor(purchase.purchase_type)}>
                              {getTypeLabel(purchase.purchase_type)}
                            </Badge>
                          </TableCell>
                          <TableCell>{purchase.quantity}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {new Intl.NumberFormat("pt-BR", {
                                  style: "currency",
                                  currency: "BRL",
                                }).format(purchase.total_price)}
                              </div>
                              {purchase.quantity > 1 && (
                                <div className="text-sm text-gray-500">
                                  {new Intl.NumberFormat("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                  }).format(purchase.unit_price)}{" "}
                                  cada
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(purchase.payment_status)}
                              <Badge className={getStatusColor(purchase.payment_status)}>
                                {getStatusLabel(purchase.payment_status)}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="text-sm">{new Date(purchase.created_at).toLocaleDateString("pt-BR")}</div>
                              {purchase.payment_date && (
                                <div className="text-xs text-gray-500">
                                  Pago em {new Date(purchase.payment_date).toLocaleDateString("pt-BR")}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {purchase.payment_status === "failed" && (
                                <Button size="sm" variant="outline" onClick={() => retryPayment(purchase.id)}>
                                  <RefreshCw className="h-4 w-4 mr-1" />
                                  Tentar Novamente
                                </Button>
                              )}
                              {purchase.payment_status === "paid" && (
                                <Button size="sm" variant="ghost" onClick={() => downloadInvoice(purchase.id)}>
                                  <Download className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary" className="space-y-6">
          {summary && (
            <>
              {/* Financial Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">Total Gasto</span>
                    </div>
                    <div className="text-2xl font-bold">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(summary.total_spent)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium">Total de Itens</span>
                    </div>
                    <div className="text-2xl font-bold">{summary.total_items}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">Pagamentos Bem-sucedidos</span>
                    </div>
                    <div className="text-2xl font-bold">{summary.successful_payments}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Payment Status Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Status dos Pagamentos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-green-600">{summary.successful_payments}</div>
                      <div className="text-sm text-gray-500">Pagos</div>
                    </div>

                    <div className="text-center p-4 border rounded-lg">
                      <Clock className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-yellow-600">{summary.pending_payments}</div>
                      <div className="text-sm text-gray-500">Pendentes</div>
                    </div>

                    <div className="text-center p-4 border rounded-lg">
                      <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-red-600">{summary.failed_payments}</div>
                      <div className="text-sm text-gray-500">Falharam</div>
                    </div>

                    <div className="text-center p-4 border rounded-lg">
                      <RefreshCw className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-blue-600">{summary.refunded_payments}</div>
                      <div className="text-sm text-gray-500">Reembolsados</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Ações Rápidas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Baixar Relatório Completo
                    </Button>
                    <Button variant="outline">
                      <CreditCard className="h-4 w-4 mr-2" />
                      Gerenciar Métodos de Pagamento
                    </Button>
                    <Button variant="outline">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Tentar Pagamentos Pendentes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
