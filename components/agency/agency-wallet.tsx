// @ts-nocheck
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Receipt,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  Plus,
  Minus,
} from "lucide-react"
import type { Agency, WalletTransaction, WithdrawalRequest } from "@/types/agency"

interface AgencyWalletProps {
  agency: Agency
  transactions: WalletTransaction[]
  withdrawalRequests: WithdrawalRequest[]
  isAdmin?: boolean
  onWithdraw?: (amount: number, invoiceFile: File) => void
  onAdjustBalance?: (amount: number, type: "credit" | "debit", reason: string) => void
}

export function AgencyWallet({
  agency,
  transactions,
  withdrawalRequests,
  isAdmin = false,
  onWithdraw,
  onAdjustBalance,
}: AgencyWalletProps) {
  const [showWithdrawForm, setShowWithdrawForm] = useState(false)
  const [showAdjustForm, setShowAdjustForm] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [adjustAmount, setAdjustAmount] = useState("")
  const [adjustType, setAdjustType] = useState<"credit" | "debit">("credit")
  const [adjustReason, setAdjustReason] = useState("")

  const handleWithdraw = () => {
    const amount = Number.parseFloat(withdrawAmount)
    if (amount > 0 && amount <= agency.wallet.available_balance) {
      // onWithdraw would handle file upload
      setShowWithdrawForm(false)
      setWithdrawAmount("")
    }
  }

  const handleAdjust = () => {
    const amount = Number.parseFloat(adjustAmount)
    if (amount > 0 && adjustReason.trim()) {
      onAdjustBalance?.(amount, adjustType, adjustReason)
      setShowAdjustForm(false)
      setAdjustAmount("")
      setAdjustReason("")
    }
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "credit":
      case "bonus":
      case "commission":
        return <ArrowDownLeft className="h-4 w-4 text-green-600" />
      case "debit":
      case "withdrawal":
        return <ArrowUpRight className="h-4 w-4 text-red-600" />
      default:
        return <Receipt className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: { variant: "outline" as const, icon: Clock, color: "text-yellow-600" },
      completed: { variant: "default" as const, icon: CheckCircle, color: "text-green-600" },
      failed: { variant: "destructive" as const, icon: AlertCircle, color: "text-red-600" },
      cancelled: { variant: "secondary" as const, icon: AlertCircle, color: "text-gray-600" },
    }
    return variants[status as keyof typeof variants] || variants.pending
  }

  return (
    <div className="space-y-6">
      {/* Wallet Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Saldo Disponível</p>
                <p className="text-3xl font-bold text-green-600">
                  R$ {agency.wallet.available_balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-gray-500 mt-1">Disponível para saque</p>
              </div>
              <Wallet className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Saldo Pendente</p>
                <p className="text-3xl font-bold text-yellow-600">
                  R$ {agency.wallet.pending_balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-gray-500 mt-1">Aguardando liberação</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Ganho</p>
                <p className="text-3xl font-bold text-blue-600">
                  R$ {agency.wallet.total_earned.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-gray-500 mt-1">Histórico total</p>
              </div>
              <CreditCard className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        {!showWithdrawForm && (
          <Button
            onClick={() => setShowWithdrawForm(true)}
            disabled={agency.wallet.available_balance <= 0}
            className="bg-green-600 hover:bg-green-700"
          >
            <ArrowUpRight className="h-4 w-4 mr-2" />
            Solicitar Saque
          </Button>
        )}

        {isAdmin && !showAdjustForm && (
          <Button variant="outline" onClick={() => setShowAdjustForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Ajustar Saldo
          </Button>
        )}
      </div>

      {/* Withdraw Form */}
      {showWithdrawForm && (
        <Card className="border-green-200">
          <CardHeader>
            <CardTitle className="text-green-700">Solicitar Saque</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="withdraw-amount">Valor do Saque</Label>
              <Input
                id="withdraw-amount"
                type="number"
                placeholder="0,00"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                max={agency.wallet.available_balance}
              />
              <p className="text-sm text-gray-500 mt-1">
                Máximo: R$ {agency.wallet.available_balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">Requisitos para Saque</p>
                  <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                    <li>• Nota fiscal obrigatória</li>
                    <li>• Conta bancária com mesmo CNPJ da agência</li>
                    <li>• Processamento em até 5 dias úteis</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="invoice-file">Nota Fiscal (PDF)</Label>
              <Input id="invoice-file" type="file" accept=".pdf" className="mt-1" />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleWithdraw} className="bg-green-600 hover:bg-green-700">
                Confirmar Saque
              </Button>
              <Button variant="outline" onClick={() => setShowWithdrawForm(false)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admin Adjust Form */}
      {isAdmin && showAdjustForm && (
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-700">Ajustar Saldo (Admin)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="adjust-type">Tipo de Ajuste</Label>
                <select
                  id="adjust-type"
                  className="w-full p-2 border rounded-md"
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value as "credit" | "debit")}
                >
                  <option value="credit">Crédito (+)</option>
                  <option value="debit">Débito (-)</option>
                </select>
              </div>
              <div>
                <Label htmlFor="adjust-amount">Valor</Label>
                <Input
                  id="adjust-amount"
                  type="number"
                  placeholder="0,00"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="adjust-reason">Justificativa</Label>
              <Textarea
                id="adjust-reason"
                placeholder="Descreva o motivo do ajuste..."
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleAdjust} className="bg-blue-600 hover:bg-blue-700">
                {adjustType === "credit" ? <Plus className="h-4 w-4 mr-2" /> : <Minus className="h-4 w-4 mr-2" />}
                Aplicar Ajuste
              </Button>
              <Button variant="outline" onClick={() => setShowAdjustForm(false)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Withdrawal Requests */}
      {withdrawalRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Solicitações de Saque</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {withdrawalRequests.map((request) => {
                const statusBadge = getStatusBadge(request.status)
                return (
                  <div key={request.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          R$ {request.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-sm text-gray-600">
                          Solicitado em {new Date(request.requested_at).toLocaleDateString("pt-BR")}
                        </p>
                        {request.notes && <p className="text-sm text-gray-500 mt-1">{request.notes}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={statusBadge.variant}>
                          <statusBadge.icon className="h-3 w-3 mr-1" />
                          {request.status}
                        </Badge>
                        {request.invoice_url && (
                          <Button variant="outline" size="sm">
                            <FileText className="h-4 w-4 mr-1" />
                            NF
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Transações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {transactions.map((transaction) => {
              const statusBadge = getStatusBadge(transaction.status)
              return (
                <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getTransactionIcon(transaction.type)}
                    <div>
                      <p className="font-medium">{transaction.description}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(transaction.created_at).toLocaleDateString("pt-BR")} às{" "}
                        {new Date(transaction.created_at).toLocaleTimeString("pt-BR")}
                      </p>
                      {transaction.reference_id && (
                        <p className="text-xs text-gray-500">Ref: {transaction.reference_id}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-medium ${
                        ["credit", "bonus", "commission"].includes(transaction.type) ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {["credit", "bonus", "commission"].includes(transaction.type) ? "+" : "-"}
                      R$ {transaction.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                    <Badge variant={statusBadge.variant} className="mt-1">
                      <statusBadge.icon className="h-3 w-3 mr-1" />
                      {transaction.status}
                    </Badge>
                    {transaction.receipt_url && (
                      <Button variant="ghost" size="sm" className="mt-1">
                        <Receipt className="h-3 w-3 mr-1" />
                        Recibo
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
