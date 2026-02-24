
import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  Download,
  DollarSign,
  Filter,
  Minus,
  Plus,
  Receipt,
  Search,
  TrendingDown,
  TrendingUp,
  User,
  Wallet,
} from "lucide-react"

interface WalletOverview {
  total_available: number
  total_pending: number
  total_blocked: number
  total_earned: number
  active_users: number
  pending_withdrawals: number
}

interface UserWallet {
  user_id: string
  user_name: string
  user_email: string
  user_type: "agency" | "nomade" | "leader"
  available_balance: number
  pending_balance: number
  blocked_balance: number
  total_earned: number
  last_activity: string
}

interface WalletAdjustment {
  id: string
  user_id: string
  user_name: string
  amount: number
  type: "credit" | "debit"
  reason: string
  admin_id: string
  admin_name: string
  created_at: string
}

export default function WalletsPage() {
  const [selectedUser, setSelectedUser] = useState<UserWallet | null>(null)
  const [showAdjustment, setShowAdjustment] = useState(false)
  const [adjustmentAmount, setAdjustmentAmount] = useState("")
  const [adjustmentType, setAdjustmentType] = useState<"credit" | "debit">("credit")
  const [adjustmentReason, setAdjustmentReason] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [userTypeFilter, setUserTypeFilter] = useState<string>("all")

  // Mock data - replace with real API calls
  const overview: WalletOverview = {
    total_available: 450000,
    total_pending: 125000,
    total_blocked: 35000,
    total_earned: 2500000,
    active_users: 156,
    pending_withdrawals: 23,
  }

  const userWallets: UserWallet[] = [
    {
      user_id: "user-1",
      user_name: "Agência Digital Pro",
      user_email: "contato@digitalpro.com",
      user_type: "agency",
      available_balance: 15000,
      pending_balance: 5000,
      blocked_balance: 2000,
      total_earned: 85000,
      last_activity: "2024-01-30T10:00:00Z",
    },
    {
      user_id: "user-2",
      user_name: "João Silva",
      user_email: "joao@nomade.com",
      user_type: "nomade",
      available_balance: 3500,
      pending_balance: 1200,
      blocked_balance: 0,
      total_earned: 25000,
      last_activity: "2024-01-29T15:30:00Z",
    },
  ]

  const adjustments: WalletAdjustment[] = [
    {
      id: "adj-1",
      user_id: "user-1",
      user_name: "Agência Digital Pro",
      amount: 1000,
      type: "credit",
      reason: "Bônus por performance excepcional",
      admin_id: "admin-1",
      admin_name: "Admin Sistema",
      created_at: "2024-01-30T09:00:00Z",
    },
  ]

  const filteredWallets = useMemo(() => {
    return userWallets.filter((wallet) => {
      const matchesSearch =
        wallet.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wallet.user_email.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesType = userTypeFilter === "all" || wallet.user_type === userTypeFilter
      return matchesSearch && matchesType
    })
  }, [userWallets, searchTerm, userTypeFilter])

  const handleAdjustment = () => {
    if (!selectedUser || !adjustmentAmount || !adjustmentReason.trim()) return

    const amount = Number.parseFloat(adjustmentAmount)
    if (amount <= 0) return

    // Here you would make the API call to adjust the balance
    console.log("Adjusting balance:", {
      user_id: selectedUser.user_id,
      amount,
      type: adjustmentType,
      reason: adjustmentReason,
    })

    setShowAdjustment(false)
    setAdjustmentAmount("")
    setAdjustmentReason("")
    setSelectedUser(null)
  }

  const generateReconciliationReport = () => {
    // Here you would generate and download the reconciliation report
    console.log("Generating reconciliation report...")
  }

  const getUserTypeLabel = (type: string) => {
    const types = {
      agency: "Agência",
      nomade: "Nômade",
      leader: "Líder",
    }
    return types[type as keyof typeof types] || type
  }

  const getUserTypeBadge = (type: string) => {
    const variants = {
      agency: "default" as const,
      nomade: "secondary" as const,
      leader: "outline" as const,
    }
    return variants[type as keyof typeof variants] || "default"
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Carteiras</h1>
          <p className="text-gray-600 mt-2">Visão geral e gerenciamento de todas as carteiras da plataforma</p>
        </div>
        <Button onClick={generateReconciliationReport} className="bg-green-600 hover:bg-green-700">
          <Download className="h-4 w-4 mr-2" />
          Relatório de Conciliação
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="wallets">Carteiras</TabsTrigger>
          <TabsTrigger value="adjustments">Ajustes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Disponível</p>
                    <p className="text-3xl font-bold text-green-600">
                      R$ {overview.total_available.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm text-gray-500">Para saque</p>
                  </div>
                  <Wallet className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Pendente</p>
                    <p className="text-3xl font-bold text-yellow-600">
                      R$ {overview.total_pending.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm text-gray-500">Aguardando liberação</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Bloqueado</p>
                    <p className="text-3xl font-bold text-red-600">
                      R$ {overview.total_blocked.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm text-gray-500">Em solicitações</p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-red-500" />
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
                    <p className="text-2xl font-bold text-blue-600">
                      R$ {overview.total_earned.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm text-gray-500">Histórico total</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Usuários Ativos</p>
                    <p className="text-2xl font-bold">{overview.active_users}</p>
                    <p className="text-sm text-gray-500">Com saldo</p>
                  </div>
                  <User className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Saques Pendentes</p>
                    <p className="text-2xl font-bold text-orange-600">{overview.pending_withdrawals}</p>
                    <p className="text-sm text-gray-500">Solicitações</p>
                  </div>
                  <Receipt className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="wallets" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Buscar</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Nome ou email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <Label>Tipo de Usuário</Label>
                  <Select value={userTypeFilter} onValueChange={setUserTypeFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="agency">Agências</SelectItem>
                      <SelectItem value="nomade">Nômades</SelectItem>
                      <SelectItem value="leader">Líderes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Wallets List */}
          <Card>
            <CardHeader>
              <CardTitle>Carteiras ({filteredWallets.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredWallets.map((wallet) => (
                  <div key={wallet.user_id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div>
                          <h3 className="font-semibold">{wallet.user_name}</h3>
                          <p className="text-sm text-gray-600">{wallet.user_email}</p>
                        </div>
                        <Badge variant={getUserTypeBadge(wallet.user_type)}>{getUserTypeLabel(wallet.user_type)}</Badge>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(wallet)
                          setShowAdjustment(true)
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Ajustar Saldo
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <p className="text-sm text-gray-600">Disponível</p>
                        <p className="text-lg font-bold text-green-600">
                          R$ {wallet.available_balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="text-center p-3 bg-yellow-50 rounded-lg">
                        <p className="text-sm text-gray-600">Pendente</p>
                        <p className="text-lg font-bold text-yellow-600">
                          R$ {wallet.pending_balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="text-center p-3 bg-red-50 rounded-lg">
                        <p className="text-sm text-gray-600">Bloqueado</p>
                        <p className="text-lg font-bold text-red-600">
                          R$ {wallet.blocked_balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-gray-600">Total Ganho</p>
                        <p className="text-lg font-bold text-blue-600">
                          R$ {wallet.total_earned.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Última atividade: {new Date(wallet.last_activity).toLocaleDateString("pt-BR")} às{" "}
                        {new Date(wallet.last_activity).toLocaleTimeString("pt-BR")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="adjustments" className="space-y-6">
          {/* Adjustments History */}
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Ajustes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {adjustments.map((adjustment) => (
                  <div key={adjustment.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {adjustment.type === "credit" ? (
                          <ArrowDownLeft className="h-5 w-5 text-green-600" />
                        ) : (
                          <ArrowUpRight className="h-5 w-5 text-red-600" />
                        )}
                        <div>
                          <h4 className="font-semibold">{adjustment.user_name}</h4>
                          <p className="text-sm text-gray-600">{adjustment.reason}</p>
                          <p className="text-xs text-gray-500">
                            Por {adjustment.admin_name} em {new Date(adjustment.created_at).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-lg font-bold ${adjustment.type === "credit" ? "text-green-600" : "text-red-600"}`}
                        >
                          {adjustment.type === "credit" ? "+" : "-"}
                          R$ {adjustment.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </p>
                        <Badge variant={adjustment.type === "credit" ? "default" : "destructive"}>
                          {adjustment.type === "credit" ? "Crédito" : "Débito"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Adjustment Dialog */}
      <Dialog open={showAdjustment} onOpenChange={setShowAdjustment}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajustar Saldo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedUser && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold mb-2">Usuário Selecionado</h4>
                <p>
                  <strong>Nome:</strong> {selectedUser.user_name}
                </p>
                <p>
                  <strong>Email:</strong> {selectedUser.user_email}
                </p>
                <p>
                  <strong>Saldo Atual:</strong> R${" "}
                  {selectedUser.available_balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo de Ajuste</Label>
                <Select
                  value={adjustmentType}
                  onValueChange={(value) => setAdjustmentType(value as "credit" | "debit")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit">Crédito (+)</SelectItem>
                    <SelectItem value="debit">Débito (-)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor</Label>
                <Input
                  type="number"
                  placeholder="0,00"
                  value={adjustmentAmount}
                  onChange={(e) => setAdjustmentAmount(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label>Justificativa</Label>
              <Textarea
                placeholder="Descreva o motivo do ajuste..."
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleAdjustment} className="bg-blue-600 hover:bg-blue-700">
                {adjustmentType === "credit" ? <Plus className="h-4 w-4 mr-2" /> : <Minus className="h-4 w-4 mr-2" />}
                Aplicar Ajuste
              </Button>
              <Button variant="outline" onClick={() => setShowAdjustment(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
