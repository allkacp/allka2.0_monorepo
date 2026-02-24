
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/page-header"
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Receipt,
  Calendar,
  Download,
  Filter,
  Plus,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react"
import { useState } from "react"

export default function InHouseFinanceiroPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("month")

  const financialStats = [
    {
      title: "Investimento Total",
      value: "R$ 45.200",
      change: "+12%",
      trend: "up",
      icon: DollarSign,
      color: "bg-blue-500",
    },
    {
      title: "Economia Gerada",
      value: "R$ 28.400",
      change: "+18%",
      trend: "up",
      icon: TrendingUp,
      color: "bg-green-500",
    },
    {
      title: "Pagamentos Pendentes",
      value: "R$ 8.500",
      change: "-5%",
      trend: "down",
      icon: Clock,
      color: "bg-yellow-500",
    },
    {
      title: "ROI Médio",
      value: "340%",
      change: "+25%",
      trend: "up",
      icon: TrendingUp,
      color: "bg-purple-500",
    },
  ]

  const recentTransactions = [
    {
      id: 1,
      service: "Design de Landing Page",
      specialist: "Maria Silva",
      amount: 2500,
      date: "2024-12-28",
      status: "paid",
      category: "Design",
    },
    {
      id: 2,
      service: "Otimização SEO",
      specialist: "João Santos",
      amount: 1800,
      date: "2024-12-25",
      status: "paid",
      category: "Marketing",
    },
    {
      id: 3,
      service: "Desenvolvimento de App",
      specialist: "Ana Costa",
      amount: 4500,
      date: "2024-12-30",
      status: "pending",
      category: "Desenvolvimento",
    },
    {
      id: 4,
      service: "Consultoria de Marca",
      specialist: "Carlos Lima",
      amount: 3200,
      date: "2024-12-22",
      status: "processing",
      category: "Consultoria",
    },
  ]

  const upcomingPayments = [
    {
      service: "Criação de Conteúdo",
      specialist: "Paula Oliveira",
      amount: 1500,
      dueDate: "2025-01-05",
      priority: "high",
    },
    {
      service: "Análise de Dados",
      specialist: "Roberto Alves",
      amount: 2200,
      dueDate: "2025-01-08",
      priority: "medium",
    },
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-gradient-to-r from-green-500 to-green-600 text-white">Pago</Badge>
      case "pending":
        return <Badge className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">Pendente</Badge>
      case "processing":
        return <Badge className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">Processando</Badge>
      default:
        return <Badge variant="outline">Desconhecido</Badge>
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  return (
    <div className="min-h-screen bg-slate-200 px-0 py-0">
      <div className="max-w-7xl mx-auto bg-slate-200 px-0 py-0 space-y-6">
        {/* Header */}
        <div className="px-0">
          <PageHeader
            title="Financeiro"
            description="Gerencie pagamentos, investimentos e análise financeira"
            actions={
              <div className="flex items-center gap-3">
                <Button variant="outline" className="bg-white hover:bg-gray-50">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Pagamento
                </Button>
              </div>
            }
          />
        </div>

        {/* Financial Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-0">
          {financialStats.map((stat, index) => (
            <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                    <p
                      className={`text-xs mt-1 flex items-center gap-1 ${stat.trend === "up" ? "text-green-600" : "text-red-600"}`}
                    >
                      {stat.trend === "up" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {stat.change} vs. mês anterior
                    </p>
                  </div>
                  <div className={`${stat.color} p-3 rounded-lg`}>
                    <stat.icon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Period Filter */}
        <div className="px-0">
          <Card className="border-0 shadow-lg bg-white">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">Período:</span>
                  <div className="flex gap-2">
                    {["week", "month", "quarter", "year"].map((period) => (
                      <Button
                        key={period}
                        variant={selectedPeriod === period ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedPeriod(period)}
                        className={
                          selectedPeriod === period
                            ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                            : "bg-white"
                        }
                      >
                        {period === "week" && "Semana"}
                        {period === "month" && "Mês"}
                        {period === "quarter" && "Trimestre"}
                        {period === "year" && "Ano"}
                      </Button>
                    ))}
                  </div>
                </div>
                <Button variant="outline" size="sm" className="bg-white hover:bg-gray-50">
                  <Calendar className="h-4 w-4 mr-2" />
                  Período Personalizado
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-0">
          {/* Recent Transactions */}
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-lg bg-white">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center text-xl">
                    <Receipt className="h-5 w-5 mr-2 text-blue-600" />
                    Transações Recentes
                  </CardTitle>
                  <Button variant="outline" size="sm" className="bg-white hover:bg-gray-50">
                    Ver Todas
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentTransactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100 hover:shadow-md transition-all duration-300"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="bg-white p-3 rounded-lg shadow-sm">
                          <CreditCard className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{transaction.service}</h4>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-sm text-gray-600">{transaction.specialist}</span>
                            <Badge variant="outline" className="text-xs bg-white">
                              {transaction.category}
                            </Badge>
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(transaction.date).toLocaleDateString("pt-BR")}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">{formatCurrency(transaction.amount)}</p>
                          {getStatusBadge(transaction.status)}
                        </div>
                        <Button size="sm" variant="outline" className="bg-white hover:bg-gray-50">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Upcoming Payments */}
            <Card className="border-0 shadow-lg bg-white">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Clock className="h-5 w-5 mr-2 text-yellow-600" />
                  Próximos Pagamentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {upcomingPayments.map((payment, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border ${
                        payment.priority === "high"
                          ? "bg-gradient-to-r from-red-50 to-orange-50 border-red-200"
                          : "bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm text-gray-900">{payment.service}</h4>
                          <p className="text-xs text-gray-600 mt-1">{payment.specialist}</p>
                        </div>
                        {payment.priority === "high" && <AlertCircle className="h-4 w-4 text-red-500" />}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-900">{formatCurrency(payment.amount)}</span>
                        <span
                          className={`text-xs px-2 py-1 rounded font-medium ${
                            payment.priority === "high" ? "bg-red-500 text-white" : "bg-yellow-500 text-white"
                          }`}
                        >
                          {new Date(payment.dueDate).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <Button className="w-full mt-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Processar Pagamentos
                </Button>
              </CardContent>
            </Card>

            {/* Payment Methods */}
            <Card className="border-0 shadow-lg bg-white">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <CreditCard className="h-5 w-5 mr-2 text-purple-600" />
                  Métodos de Pagamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">Cartão de Crédito</p>
                        <p className="text-xs text-gray-600">•••• 4532</p>
                      </div>
                      <Badge className="bg-gradient-to-r from-green-500 to-green-600 text-white">Principal</Badge>
                    </div>
                  </div>
                  <div className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">Transferência</p>
                        <p className="text-xs text-gray-600">Banco 001</p>
                      </div>
                    </div>
                  </div>
                </div>
                <Button variant="outline" className="w-full mt-4 bg-white hover:bg-gray-50">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Método
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
