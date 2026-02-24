
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/page-header"
import {
  DollarSign,
  TrendingUp,
  Wallet,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react"

const transactions = [
  {
    id: "1",
    type: "receita",
    description: "Pagamento - Design de Banner",
    project: "Redesign E-commerce TechStore",
    amount: 225,
    status: "concluido",
    date: "2024-02-10",
    method: "Carteira Allka",
  },
  {
    id: "2",
    type: "receita",
    description: "Pagamento - Logo Design",
    project: "Identidade Visual Café Aroma",
    amount: 450,
    status: "concluido",
    date: "2024-02-08",
    method: "Carteira Allka",
  },
  {
    id: "3",
    type: "saque",
    description: "Saque para Conta Bancária",
    project: "-",
    amount: -500,
    status: "processando",
    date: "2024-02-07",
    method: "Transferência Bancária",
  },
  {
    id: "4",
    type: "receita",
    description: "Bônus Silver - Nível Alcançado",
    project: "-",
    amount: 150,
    status: "concluido",
    date: "2024-02-05",
    method: "Bônus",
  },
  {
    id: "5",
    type: "receita",
    description: "Pagamento - Copywriting",
    project: "Campanha Social Media FoodCorp",
    amount: 312,
    status: "pendente",
    date: "2024-02-12",
    method: "Carteira Allka",
  },
  {
    id: "6",
    type: "receita",
    description: "Pagamento - Edição de Vídeo",
    project: "Campanha Social Media FoodCorp",
    amount: 180,
    status: "pendente",
    date: "2024-02-14",
    method: "Carteira Allka",
  },
  {
    id: "7",
    type: "saque",
    description: "Saque para Conta Bancária",
    project: "-",
    amount: -800,
    status: "concluido",
    date: "2024-01-28",
    method: "Transferência Bancária",
  },
]

const monthlyEarnings = [
  { month: "Jan", earnings: 4200, tasks: 18 },
  { month: "Fev", earnings: 5200, tasks: 22 },
  { month: "Mar", earnings: 0, tasks: 0 },
]

export default function NomadesFinanceiroPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedType, setSelectedType] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")

  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch =
      transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.project.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = selectedType === "all" || transaction.type === selectedType
    const matchesStatus = selectedStatus === "all" || transaction.status === selectedStatus

    return matchesSearch && matchesType && matchesStatus
  })

  const stats = {
    availableBalance: 3450,
    pendingBalance: 492,
    totalEarned: 45800,
    thisMonth: 5200,
    lastWithdrawal: 800,
    withdrawalDate: "2024-01-28",
  }

  const getStatusColor = (status: string) => {
    const colors = {
      concluido: "bg-green-100 text-green-800 border-green-200",
      pendente: "bg-yellow-100 text-yellow-800 border-yellow-200",
      processando: "bg-blue-100 text-blue-800 border-blue-200",
      cancelado: "bg-red-100 text-red-800 border-red-200",
    }
    return colors[status as keyof typeof colors] || colors.pendente
  }

  const getStatusLabel = (status: string) => {
    const labels = {
      concluido: "Concluído",
      pendente: "Pendente",
      processando: "Processando",
      cancelado: "Cancelado",
    }
    return labels[status as keyof typeof labels] || status
  }

  const getStatusIcon = (status: string) => {
    const icons = {
      concluido: CheckCircle,
      pendente: Clock,
      processando: AlertCircle,
      cancelado: AlertCircle,
    }
    const Icon = icons[status as keyof typeof icons] || Clock
    return <Icon className="h-4 w-4" />
  }

  return (
    <div className="container mx-auto px-0 py-0 space-y-6">
      {/* Header */}
      <PageHeader
        title="Financeiro"
        description="Acompanhe seus ganhos, pagamentos e histórico financeiro"
        actions={
          <div className="flex items-center gap-3">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar Extrato
            </Button>
            <Button className="bg-green-500 hover:bg-green-600 text-white">
              <Wallet className="h-4 w-4 mr-2" />
              Solicitar Saque
            </Button>
          </div>
        }
      />

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium opacity-90">Saldo Disponível</p>
              <Wallet className="h-6 w-6 opacity-80" />
            </div>
            <p className="text-4xl font-bold mb-1">R$ {stats.availableBalance.toLocaleString()}</p>
            <p className="text-sm opacity-75">Disponível para saque</p>
            <Button className="mt-4 bg-white text-green-600 hover:bg-gray-100 w-full">Sacar Agora</Button>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium opacity-90">Saldo Pendente</p>
              <Clock className="h-6 w-6 opacity-80" />
            </div>
            <p className="text-4xl font-bold mb-1">R$ {stats.pendingBalance.toLocaleString()}</p>
            <p className="text-sm opacity-75">Aguardando aprovação</p>
            <div className="mt-4 flex items-center text-sm">
              <AlertCircle className="h-4 w-4 mr-1" />
              <span>2 pagamentos pendentes</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium opacity-90">Ganhos Este Mês</p>
              <TrendingUp className="h-6 w-6 opacity-80" />
            </div>
            <p className="text-4xl font-bold mb-1">R$ {stats.thisMonth.toLocaleString()}</p>
            <p className="text-sm opacity-75">Fevereiro 2024</p>
            <div className="mt-4 flex items-center text-sm">
              <ArrowUpRight className="h-4 w-4 mr-1" />
              <span>+23.8% vs mês anterior</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Ganho</p>
                <p className="text-3xl font-bold text-purple-600">R$ {(stats.totalEarned / 1000).toFixed(1)}k</p>
                <p className="text-sm text-gray-500">Histórico completo</p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Último Saque</p>
                <p className="text-3xl font-bold text-gray-900">R$ {stats.lastWithdrawal}</p>
                <p className="text-sm text-gray-500">{new Date(stats.withdrawalDate).toLocaleDateString()}</p>
              </div>
              <ArrowDownRight className="h-8 w-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Bônus Silver</p>
                <p className="text-3xl font-bold text-blue-600">+25%</p>
                <p className="text-sm text-gray-500">Por tarefa concluída</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Earnings Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-blue-500" />
            Ganhos Mensais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {monthlyEarnings.map((month, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center flex-1">
                  <div className="w-16 font-medium text-gray-700">{month.month}</div>
                  <div className="flex-1 mx-4">
                    <div className="w-full bg-gray-200 rounded-full h-8 relative">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-8 rounded-full flex items-center justify-end pr-3 text-white text-sm font-medium transition-all"
                        style={{ width: `${month.earnings > 0 ? (month.earnings / 6000) * 100 : 0}%` }}
                      >
                        {month.earnings > 0 && `R$ ${month.earnings.toLocaleString()}`}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 w-24 text-right">{month.tasks} tarefas</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar transações..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">Todos os Tipos</option>
                <option value="receita">Receitas</option>
                <option value="saque">Saques</option>
              </select>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">Todos os Status</option>
                <option value="concluido">Concluído</option>
                <option value="pendente">Pendente</option>
                <option value="processando">Processando</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Transações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 ${
                      transaction.type === "receita" ? "bg-green-100" : "bg-red-100"
                    }`}
                  >
                    {transaction.type === "receita" ? (
                      <ArrowUpRight className="h-5 w-5 text-green-600" />
                    ) : (
                      <ArrowDownRight className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{transaction.description}</h4>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-sm text-gray-600">{transaction.project}</p>
                      <span className="text-gray-400">•</span>
                      <p className="text-sm text-gray-600">{transaction.method}</p>
                      <span className="text-gray-400">•</span>
                      <p className="text-sm text-gray-600">{new Date(transaction.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge className={getStatusColor(transaction.status)}>
                    {getStatusIcon(transaction.status)}
                    <span className="ml-1">{getStatusLabel(transaction.status)}</span>
                  </Badge>
                  <div className="text-right min-w-[100px]">
                    <p className={`text-lg font-bold ${transaction.amount > 0 ? "text-green-600" : "text-red-600"}`}>
                      {transaction.amount > 0 ? "+" : ""}R$ {Math.abs(transaction.amount).toLocaleString()}
                    </p>
                  </div>
                  <Button size="sm" variant="outline">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {filteredTransactions.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhuma transação encontrada</p>
              <p className="text-sm mt-1">Tente ajustar os filtros de busca</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
