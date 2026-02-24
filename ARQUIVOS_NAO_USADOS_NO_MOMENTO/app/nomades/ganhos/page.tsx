
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Wallet, DollarSign, TrendingUp, Calendar, Download, ArrowUpRight, Clock } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/page-header"

const earningsData = {
  summary: {
    available: 1250,
    pending: 890,
    thisMonth: 6800,
    lastMonth: 5200,
    bonus: 1700,
  },
  transactions: [
    {
      id: 1,
      type: "payment",
      description: "Design de Banner - E-commerce",
      client: "TechStore Brasil",
      amount: 281.25,
      baseAmount: 225,
      bonus: 56.25,
      date: "15 Mar 2024",
      status: "paid",
    },
    {
      id: 2,
      type: "payment",
      description: "Artigos para Blog (3x)",
      client: "Marketing Pro",
      amount: 281.25,
      baseAmount: 225,
      bonus: 56.25,
      date: "14 Mar 2024",
      status: "paid",
    },
    {
      id: 3,
      type: "pending",
      description: "Edição de Vídeo - Social Media",
      client: "FoodCorp",
      amount: 500,
      baseAmount: 400,
      bonus: 100,
      date: "Aguardando aprovação",
      status: "pending",
    },
    {
      id: 4,
      type: "payment",
      description: "Logo Design",
      client: "Startup ABC",
      amount: 562.5,
      baseAmount: 450,
      bonus: 112.5,
      date: "12 Mar 2024",
      status: "paid",
    },
    {
      id: 5,
      type: "pending",
      description: "Copywriting - Landing Page",
      client: "StartupXYZ",
      amount: 390,
      baseAmount: 312,
      bonus: 78,
      date: "Em progresso",
      status: "in-progress",
    },
  ],
  withdrawals: [
    {
      id: 1,
      amount: 2500,
      date: "10 Mar 2024",
      method: "PIX",
      status: "completed",
    },
    {
      id: 2,
      amount: 1800,
      date: "25 Fev 2024",
      method: "Transferência Bancária",
      status: "completed",
    },
  ],
}

export default function GanhosPage() {
  return (
    <div className="container mx-auto px-0 py-0">
      <PageHeader
        title="Ganhos"
        description="Gerencie seus ganhos e saques"
        actions={
          <Button className="bg-green-600 hover:bg-green-700">
            <Download className="h-4 w-4 mr-2" />
            Solicitar Saque
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Disponível para Saque</p>
                <p className="text-3xl font-bold mt-2">R$ {earningsData.summary.available.toLocaleString()}</p>
              </div>
              <Wallet className="h-10 w-10 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Pendente</p>
                <p className="text-3xl font-bold mt-2">R$ {earningsData.summary.pending.toLocaleString()}</p>
              </div>
              <Clock className="h-10 w-10 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Este Mês</p>
                <p className="text-3xl font-bold mt-2">R$ {earningsData.summary.thisMonth.toLocaleString()}</p>
                <p className="text-xs opacity-75 mt-1">
                  +
                  {Math.round(
                    ((earningsData.summary.thisMonth - earningsData.summary.lastMonth) /
                      earningsData.summary.lastMonth) *
                      100,
                  )}
                  % vs mês anterior
                </p>
              </div>
              <TrendingUp className="h-10 w-10 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Bônus Silver</p>
                <p className="text-3xl font-bold mt-2">R$ {earningsData.summary.bonus.toLocaleString()}</p>
                <p className="text-xs opacity-75 mt-1">+25% este mês</p>
              </div>
              <ArrowUpRight className="h-10 w-10 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transactions" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="transactions">Transações</TabsTrigger>
          <TabsTrigger value="withdrawals">Saques</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-4 mt-6">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <DollarSign className="h-5 w-5 mr-2 text-green-600" />
                Histórico de Ganhos
              </h3>

              <div className="space-y-4">
                {earningsData.transactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900">{transaction.description}</h4>
                        {transaction.status === "paid" && <Badge className="bg-green-500 text-white">Pago</Badge>}
                        {transaction.status === "pending" && (
                          <Badge className="bg-orange-500 text-white">Pendente</Badge>
                        )}
                        {transaction.status === "in-progress" && (
                          <Badge className="bg-blue-500 text-white">Em Progresso</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">Cliente: {transaction.client}</p>
                      <p className="text-xs text-gray-500 mt-1">{transaction.date}</p>

                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span className="text-gray-600">
                          Base: <span className="font-medium">R$ {transaction.baseAmount}</span>
                        </span>
                        <span className="text-green-600">
                          Bônus: <span className="font-medium">R$ {transaction.bonus}</span>
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-xl font-bold text-green-600">R$ {transaction.amount.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="withdrawals" className="space-y-4 mt-6">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                Histórico de Saques
              </h3>

              <div className="space-y-4">
                {earningsData.withdrawals.map((withdrawal) => (
                  <div key={withdrawal.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900">Saque via {withdrawal.method}</h4>
                        <Badge className="bg-green-500 text-white">Concluído</Badge>
                      </div>
                      <p className="text-sm text-gray-600">{withdrawal.date}</p>
                    </div>
                    <p className="text-xl font-bold text-gray-900">R$ {withdrawal.amount.toLocaleString()}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-2">Informações sobre Saques</h4>
                <ul className="space-y-1 text-sm text-blue-700">
                  <li>• Saques disponíveis via PIX (instantâneo) ou Transferência Bancária (1-2 dias úteis)</li>
                  <li>• Valor mínimo para saque: R$ 100</li>
                  <li>• Sem taxas para saques via PIX</li>
                  <li>• Saques processados em até 24h úteis</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
