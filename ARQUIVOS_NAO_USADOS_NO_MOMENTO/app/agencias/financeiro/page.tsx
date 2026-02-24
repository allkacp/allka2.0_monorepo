
import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PageHeader } from "@/components/page-header"
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  Download,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Receipt,
} from "lucide-react"

const financialSummary = [
  {
    title: "Saldo Disponível",
    value: "R$ 12.450",
    subtitle: "Pronto para saque",
    icon: Wallet,
    color: "bg-green-500",
  },
  {
    title: "Receita do Mês",
    value: "R$ 45.200",
    subtitle: "+18% vs. mês anterior",
    icon: DollarSign,
    color: "bg-blue-500",
  },
  {
    title: "Comissões Recebidas",
    value: "R$ 8.750",
    subtitle: "Projetos + Agências",
    icon: TrendingUp,
    color: "bg-purple-500",
  },
  {
    title: "Créditos Disponíveis",
    value: "R$ 3.200",
    subtitle: "Plano R$ 1.000 (15% OFF)",
    icon: CreditCard,
    color: "bg-orange-500",
  },
]

const transactions = [
  {
    id: 1,
    type: "credit",
    description: "Pagamento - Projeto TechCorp",
    amount: 15000,
    date: "10 Jan 2026",
    status: "completed",
  },
  {
    id: 2,
    type: "credit",
    description: "Comissão - Digital Solutions",
    amount: 42.5,
    date: "09 Jan 2026",
    status: "completed",
  },
  {
    id: 3,
    type: "debit",
    description: "Saque para conta bancária",
    amount: 10000,
    date: "08 Jan 2026",
    status: "completed",
  },
  {
    id: 4,
    type: "credit",
    description: "Pagamento - Projeto StartUp XYZ",
    amount: 8500,
    date: "07 Jan 2026",
    status: "completed",
  },
  {
    id: 5,
    type: "debit",
    description: "Compra de créditos - Plano R$ 1.000",
    amount: 850,
    date: "05 Jan 2026",
    status: "completed",
  },
]

const creditPlans = [
  {
    id: "lite",
    name: "Lite",
    value: "R$ 300",
    discount: "—",
    description: "Ativa conta agency",
    benefits: ["Acesso à plataforma agency"],
    status: "available",
  },
  {
    id: "start",
    name: "Start",
    value: "R$ 500",
    discount: "5%",
    description: "5% de desconto em todos os produtos",
    benefits: ["5% desconto", "Catálogo completo"],
    status: "available",
  },
  {
    id: "standard",
    name: "Standard",
    value: "R$ 1.000",
    discount: "10%",
    description: "10% de desconto em todos os produtos",
    benefits: ["10% desconto", "Relatórios básicos", "Suporte prioritário"],
    status: "current",
  },
  {
    id: "growth",
    name: "Growth",
    value: "R$ 1.500",
    discount: "15%",
    description: "15% de desconto em todos os produtos",
    benefits: ["15% desconto", "Relatórios avançados", "Suporte prioritário"],
    status: "available",
  },
  {
    id: "scale",
    name: "Scale",
    value: "R$ 3.000",
    discount: "20%",
    description: "20% de desconto em todos os produtos",
    benefits: ["20% desconto", "Relatórios completos", "Account manager"],
    status: "available",
  },
  {
    id: "squad",
    name: "Squad",
    value: "R$ 5.000",
    discount: "20%",
    description: "20% desconto + pós pago + squad dedicado",
    benefits: ["20% desconto", "Pós pago", "Squad dedicado"],
    status: "available",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    value: "R$ 5.000",
    discount: "—",
    description: "Pós pago + atendimento exclusivo + squad dedicado",
    benefits: ["Pós pago", "Atendimento estratégico", "Squad dedicado"],
    status: "available",
  },
]

const paymentMethods = [
  {
    type: "Cartão de Crédito",
    last4: "4532",
    brand: "Visa",
    expiry: "12/2027",
    isDefault: true,
  },
  {
    type: "Cartão de Crédito",
    last4: "8765",
    brand: "Mastercard",
    expiry: "08/2026",
    isDefault: false,
  },
]

export default function AgenciasFinanceiroPage() {
  const [withdrawalModalOpen, setWithdrawalModalOpen] = useState(false)
  const [addCardModalOpen, setAddCardModalOpen] = useState(false)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [withdrawalAmount, setWithdrawalAmount] = useState("")
  const [selectedBank, setSelectedBank] = useState("")
  const [exportPeriod, setExportPeriod] = useState("")
  const [exportFormat, setExportFormat] = useState("")

  const handleWithdrawal = () => {
    console.log("[v0] Processing withdrawal:", { withdrawalAmount, selectedBank })
    alert(`Solicitação de saque de R$ ${withdrawalAmount} enviada com sucesso!`)
    setWithdrawalModalOpen(false)
    setWithdrawalAmount("")
    setSelectedBank("")
  }

  const handleExport = () => {
    console.log("[v0] Exporting report:", { exportPeriod, exportFormat })
    alert(`Relatório ${exportFormat.toUpperCase()} do período ${exportPeriod} será baixado em instantes.`)
    setExportModalOpen(false)
    setExportPeriod("")
    setExportFormat("")
  }

  const handleAddCard = () => {
    console.log("[v0] Adding new card")
    alert("Novo cartão adicionado com sucesso!")
    setAddCardModalOpen(false)
  }

  const handleBuyCredits = (plan: any) => {
    console.log("[v0] Buying credits:", plan)
    alert(`Compra do plano ${plan.value} confirmada! Você pagará ${plan.finalPrice}.`)
  }

  const handleSetDefaultCard = (method: any) => {
    console.log("[v0] Setting default card:", method)
    alert(`Cartão ${method.brand} •••• ${method.last4} definido como padrão.`)
  }

  const handleRemoveCard = (method: any) => {
    console.log("[v0] Removing card:", method)
    if (confirm(`Deseja realmente remover o cartão ${method.brand} •••• ${method.last4}?`)) {
      alert("Cartão removido com sucesso!")
    }
  }

  return (
    <div className="min-h-screen bg-slate-200 px-0 py-0">
      <div className="max-w-7xl mx-auto bg-slate-200 space-y-6 py-0 px-0">
        <PageHeader
          title="Financeiro"
          description="Gerencie suas finanças, créditos e métodos de pagamento"
          actions={
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="flex items-center gap-2 bg-white/80 backdrop-blur-sm border-gray-200 hover:bg-white"
                onClick={() => setExportModalOpen(true)}
              >
                <Download className="h-4 w-4" />
                Exportar Relatório
              </Button>
              <Button
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 flex items-center gap-2"
                onClick={() => setWithdrawalModalOpen(true)}
              >
                <Wallet className="h-4 w-4" />
                Solicitar Saque
              </Button>
            </div>
          }
        />

        {/* Financial Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {financialSummary.map((item, index) => (
            <Card
              key={index}
              className="border-0 bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all"
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600">{item.title}</p>
                    <p className="text-3xl font-bold mt-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      {item.value}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">{item.subtitle}</p>
                  </div>
                  <div className={`ml-4 p-3 rounded-xl ${item.color} bg-opacity-10`}>
                    <item.icon className={`h-8 w-8 ${item.color.replace("bg-", "text-")}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content */}
        <Tabs defaultValue="transactions" className="space-y-6">
          <TabsList className="bg-white/80 backdrop-blur-sm border border-gray-200">
            <TabsTrigger value="transactions">Transações</TabsTrigger>
            <TabsTrigger value="credits">Planos de Crédito</TabsTrigger>
            <TabsTrigger value="payment-methods">Métodos de Pagamento</TabsTrigger>
          </TabsList>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-6">
            <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold">Histórico de Transações</h3>
                  <Button variant="outline" size="sm" className="flex items-center gap-2 bg-white border-gray-200">
                    <Calendar className="h-4 w-4" />
                    Filtrar por período
                  </Button>
                </div>
                <div className="space-y-3">
                  {transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg hover:shadow-md transition-all border border-gray-100"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`p-2 rounded-full ${transaction.type === "credit" ? "bg-green-100" : "bg-red-100"}`}
                        >
                          {transaction.type === "credit" ? (
                            <ArrowDownRight className="h-5 w-5 text-green-600" />
                          ) : (
                            <ArrowUpRight className="h-5 w-5 text-red-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{transaction.description}</p>
                          <p className="text-sm text-gray-600">{transaction.date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-lg font-bold ${transaction.type === "credit" ? "text-green-600" : "text-red-600"}`}
                        >
                          {transaction.type === "credit" ? "+" : "-"}R$ {transaction.amount.toLocaleString("pt-BR")}
                        </p>
                        <Badge className="bg-green-500 text-white">Concluído</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Credit Plans Tab */}
          <TabsContent value="credits" className="space-y-6">
            <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-lg">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Planos Disponíveis</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Escolha o plano ideal para sua agência. Quanto maior o plano, maior o desconto em todos os produtos!
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {creditPlans.map((plan, index) => (
                    <div
                      key={index}
                      className={`p-6 rounded-lg border-2 transition-all ${
                        plan.status === "current"
                          ? "border-blue-500 bg-gradient-to-br from-blue-50 to-purple-50 shadow-lg"
                          : "border-gray-200 bg-white hover:border-blue-300 hover:shadow-md"
                      }`}
                    >
                      <div className="text-center">
                        <p className="text-sm text-gray-600 font-medium">Plano</p>
                        <p className="text-2xl font-bold text-gray-900 mt-2">{plan.name}</p>
                        <p className="text-lg font-semibold text-blue-600 mt-1">{plan.value}<span className="text-sm font-normal text-gray-500">/mês</span></p>
                        {plan.discount !== "—" ? (
                          <Badge className="bg-green-500 text-white mt-2">{plan.discount} desconto</Badge>
                        ) : (
                          <Badge className="bg-slate-400 text-white mt-2">Sem desconto</Badge>
                        )}
                        <p className="text-xs text-gray-500 mt-3 leading-relaxed">{plan.description}</p>
                        {plan.status === "current" ? (
                          <Badge className="w-full mt-4 bg-blue-500 text-white py-2">Plano Atual</Badge>
                        ) : (
                          <Button
                            className="w-full mt-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                            onClick={() => handleBuyCredits(plan)}
                          >
                            Contratar
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800">
                    <strong>Plano Atual:</strong> R$ 1.000/mês com 15% de desconto. Você economiza R$ 150 por mês!
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payment Methods Tab */}
          <TabsContent value="payment-methods" className="space-y-6">
            <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold">Métodos de Pagamento</h3>
                  <Button
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 flex items-center gap-2"
                    onClick={() => setAddCardModalOpen(true)}
                  >
                    <CreditCard className="h-4 w-4" />
                    Adicionar Cartão
                  </Button>
                </div>
                <div className="space-y-4">
                  {paymentMethods.map((method, index) => (
                    <div
                      key={index}
                      className="p-6 bg-gradient-to-r from-gray-50 to-white rounded-lg border-2 border-gray-200 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-blue-100 rounded-lg">
                            <CreditCard className="h-6 w-6 text-blue-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-gray-900">{method.brand}</p>
                              {method.isDefault && <Badge className="bg-green-500 text-white">Padrão</Badge>}
                            </div>
                            <p className="text-sm text-gray-600">•••• •••• •••• {method.last4}</p>
                            <p className="text-xs text-gray-500 mt-1">Validade: {method.expiry}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!method.isDefault && (
                            <Button variant="outline" size="sm" onClick={() => handleSetDefaultCard(method)}>
                              Tornar Padrão
                            </Button>
                          )}
                          <Button variant="outline" size="sm">
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 bg-transparent"
                            onClick={() => handleRemoveCard(method)}
                          >
                            Remover
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Billing Information */}
            <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-lg">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Informações de Cobrança</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-gray-600 font-medium">Próxima Cobrança</p>
                    <p className="text-xl font-bold text-gray-900 mt-1">31 Jan 2026</p>
                    <p className="text-sm text-gray-600 mt-1">Plano R$ 1.000</p>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
                    <p className="text-sm text-gray-600 font-medium">Valor da Cobrança</p>
                    <p className="text-xl font-bold text-gray-900 mt-1">R$ 850,00</p>
                    <p className="text-sm text-green-600 mt-1">15% de desconto aplicado</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full mt-4 flex items-center justify-center gap-2 bg-white border-gray-200 hover:bg-gray-50"
                >
                  <Receipt className="h-4 w-4" />
                  Ver Histórico de Faturas
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Withdrawal Modal */}
        <Dialog open={withdrawalModalOpen} onOpenChange={setWithdrawalModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Solicitar Saque</DialogTitle>
              <DialogDescription>Solicite o saque do seu saldo disponível para sua conta bancária.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Valor do Saque</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="R$ 0,00"
                  value={withdrawalAmount}
                  onChange={(e) => setWithdrawalAmount(e.target.value)}
                />
                <p className="text-xs text-gray-500">Saldo disponível: R$ 12.450,00</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank">Conta Bancária</Label>
                <Select value={selectedBank} onValueChange={setSelectedBank}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a conta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank1">Banco do Brasil - Ag 1234 - CC 56789-0</SelectItem>
                    <SelectItem value="bank2">Itaú - Ag 5678 - CC 12345-6</SelectItem>
                    <SelectItem value="bank3">Nubank - Ag 0001 - CC 98765-4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>Atenção:</strong> O saque será processado em até 2 dias úteis.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setWithdrawalModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                onClick={handleWithdrawal}
                disabled={!withdrawalAmount || !selectedBank}
              >
                Confirmar Saque
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Export Report Modal */}
        <Dialog open={exportModalOpen} onOpenChange={setExportModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Exportar Relatório Financeiro</DialogTitle>
              <DialogDescription>Escolha o período e formato do relatório.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="period">Período</Label>
                <Select value={exportPeriod} onValueChange={setExportPeriod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current-month">Mês Atual</SelectItem>
                    <SelectItem value="last-month">Mês Anterior</SelectItem>
                    <SelectItem value="last-3-months">Últimos 3 Meses</SelectItem>
                    <SelectItem value="last-6-months">Últimos 6 Meses</SelectItem>
                    <SelectItem value="current-year">Ano Atual</SelectItem>
                    <SelectItem value="last-year">Ano Anterior</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="format">Formato</Label>
                <Select value={exportFormat} onValueChange={setExportFormat}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o formato" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="excel">Excel (XLSX)</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setExportModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                onClick={handleExport}
                disabled={!exportPeriod || !exportFormat}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Card Modal */}
        <Dialog open={addCardModalOpen} onOpenChange={setAddCardModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Adicionar Cartão de Crédito</DialogTitle>
              <DialogDescription>Adicione um novo método de pagamento.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="cardNumber">Número do Cartão</Label>
                <Input id="cardNumber" placeholder="0000 0000 0000 0000" maxLength={19} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expiry">Validade</Label>
                  <Input id="expiry" placeholder="MM/AA" maxLength={5} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cvv">CVV</Label>
                  <Input id="cvv" placeholder="123" maxLength={4} type="password" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cardName">Nome no Cartão</Label>
                <Input id="cardName" placeholder="Nome como está no cartão" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddCardModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                onClick={handleAddCard}
              >
                Adicionar Cartão
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
