// @ts-nocheck
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CreditCard, Download, CheckCircle, Plus } from "lucide-react"
import type { Company, User } from "@/types/user"
import type { AccountBilling, AccountPlan, PaymentMethod } from "@/types/admin"

interface BillingManagementProps {
  company: Company
  currentUser: User
}

// Mock data - replace with actual API calls
const mockBilling: AccountBilling = {
  id: 1,
  account_id: 1,
  account_type: "agency",
  plan_id: 2,
  status: "active",
  current_period_start: "2024-01-01",
  current_period_end: "2024-01-31",
  next_billing_date: "2024-02-01",
  invoices: [
    {
      id: 1,
      number: "INV-2024-001",
      amount: 299.0,
      status: "paid",
      issue_date: "2024-01-01",
      due_date: "2024-01-15",
      paid_date: "2024-01-10",
      download_url: "/invoices/INV-2024-001.pdf",
    },
    {
      id: 2,
      number: "INV-2024-002",
      amount: 299.0,
      status: "pending",
      issue_date: "2024-02-01",
      due_date: "2024-02-15",
    },
  ],
}

const mockPlans: AccountPlan[] = [
  {
    id: 1,
    name: "Lite",
    type: "lite",
    monthly_price: 300.0,
    features: ["Ativa conta agency na plataforma", "Acesso ao catálogo básico", "Suporte por email"],
    is_active: true,
  },
  {
    id: 2,
    name: "Start",
    type: "start",
    monthly_price: 500.0,
    features: ["5% de desconto em todos os produtos", "Acesso ao catálogo completo", "Suporte por email"],
    is_active: true,
  },
  {
    id: 3,
    name: "Standard",
    type: "standard",
    monthly_price: 1000.0,
    features: ["10% de desconto em todos os produtos", "Relatórios básicos", "Suporte prioritário"],
    is_active: true,
  },
  {
    id: 4,
    name: "Growth",
    type: "growth",
    monthly_price: 1500.0,
    features: ["15% de desconto em todos os produtos", "Relatórios avançados", "Suporte prioritário"],
    is_active: true,
  },
  {
    id: 5,
    name: "Scale",
    type: "scale",
    monthly_price: 3000.0,
    features: ["20% de desconto em todos os produtos", "Relatórios completos", "Account manager"],
    is_active: true,
  },
  {
    id: 6,
    name: "Squad",
    type: "squad",
    monthly_price: 5000.0,
    features: ["20% de desconto em todos os produtos", "Pós pago", "Squad dedicado", "Para agências"],
    is_active: true,
  },
  {
    id: 7,
    name: "Enterprise",
    type: "enterprise",
    monthly_price: 5000.0,
    features: ["Pós pago", "Atendimento exclusivo estratégico", "Squad dedicado", "Para empresas"],
    is_active: true,
  },
]

const mockPaymentMethods: PaymentMethod[] = [
  {
    id: 1,
    type: "credit_card",
    last_four: "4532",
    brand: "Visa",
    is_default: true,
  },
  {
    id: 2,
    type: "credit_card",
    last_four: "8765",
    brand: "Mastercard",
    is_default: false,
  },
]

export function BillingManagement({ company, currentUser }: BillingManagementProps) {
  const [billing, setBilling] = useState<AccountBilling | null>(null)
  const [plans, setPlans] = useState<AccountPlan[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setBilling(mockBilling)
      setPlans(mockPlans)
      setPaymentMethods(mockPaymentMethods)
      setLoading(false)
    }, 1000)
  }, [])

  const currentPlan = plans.find((plan) => plan.id === billing?.plan_id)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-100 text-green-800">Pago</Badge>
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pendente</Badge>
      case "overdue":
        return <Badge className="bg-red-100 text-red-800">Vencido</Badge>
      case "cancelled":
        return <Badge variant="secondary">Cancelado</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!billing) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum plano ativo</h3>
            <p className="text-muted-foreground mb-4">Configure um plano para começar a usar os recursos premium</p>
            <Button>Escolher Plano</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Current Plan Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5" />
            <span>Plano Atual</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold">{currentPlan?.name}</h3>
              <p className="text-muted-foreground">R$ {currentPlan?.monthly_price.toFixed(2)}/mês</p>
              <div className="flex items-center space-x-2 mt-2">
                <Badge variant={billing.status === "active" ? "default" : "destructive"}>
                  {billing.status === "active" ? "Ativo" : "Inativo"}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Próximo pagamento: {new Date(billing.next_billing_date).toLocaleDateString()}
                </span>
              </div>
            </div>
            <Button variant="outline">Alterar Plano</Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="invoices" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="invoices">Faturas</TabsTrigger>
          <TabsTrigger value="payment-methods">Pagamento</TabsTrigger>
          <TabsTrigger value="plans">Planos</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Histórico de Faturas</h3>
            <Badge variant="outline">{billing.invoices.length} faturas</Badge>
          </div>

          <div className="grid gap-4">
            {billing.invoices.map((invoice) => (
              <Card key={invoice.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium">{invoice.number}</h4>
                        {getStatusBadge(invoice.status)}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span>Emitida: {new Date(invoice.issue_date).toLocaleDateString()}</span>
                        <span>Vencimento: {new Date(invoice.due_date).toLocaleDateString()}</span>
                        {invoice.paid_date && <span>Paga: {new Date(invoice.paid_date).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-lg font-semibold">R$ {invoice.amount.toFixed(2)}</p>
                      </div>
                      {invoice.download_url && (
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="payment-methods" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Métodos de Pagamento</h3>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Cartão
            </Button>
          </div>

          <div className="grid gap-4">
            {paymentMethods.map((method) => (
              <Card key={method.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <CreditCard className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          {method.brand} •••• {method.last_four}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {method.type === "credit_card" ? "Cartão de Crédito" : "Transferência Bancária"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {method.is_default && <Badge variant="outline">Padrão</Badge>}
                      <Button variant="outline" size="sm">
                        Editar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="plans" className="space-y-4">
          <h3 className="text-lg font-medium">Planos Disponíveis</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card key={plan.id} className={plan.id === billing.plan_id ? "ring-2 ring-blue-600" : ""}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{plan.name}</CardTitle>
                    {plan.id === billing.plan_id && <Badge>Atual</Badge>}
                  </div>
                  <CardDescription>
                    <span className="text-2xl font-bold">R$ {plan.monthly_price.toFixed(2)}</span>
                    <span className="text-muted-foreground">/mês</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center space-x-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  {plan.id !== billing.plan_id && (
                    <Button className="w-full">
                      {plan.monthly_price > (currentPlan?.monthly_price || 0) ? "Fazer Upgrade" : "Fazer Downgrade"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
