
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, ArrowRight, Check, Building2, FolderKanban, ShoppingBag, CreditCard, Smartphone, FileText, Wallet, Coins } from 'lucide-react'
import type { Client, Project, CreateClientRequest, CreateProjectRequest } from "@/types/api"
import type { CartItem } from "@/contexts/cart-context"

interface CheckoutFlowProps {
  items: CartItem[]
  onBack: () => void
  onComplete: (data: CheckoutData) => void
  preselectedClient?: Client | CreateClientRequest
  preselectedProject?: Project | CreateProjectRequest
}

export interface CheckoutData {
  client: Client | CreateClientRequest
  project: Project | CreateProjectRequest
  isNewClient: boolean
  isNewProject: boolean
  payment: PaymentData
}

interface PaymentData {
  methods: PaymentMethod[]
  totalAmount: number
}

interface PaymentMethod {
  type: "credit_card" | "pix" | "boleto" | "credits" | "allkoins"
  amount: number
  details?: CreditCardDetails
}

interface CreditCardDetails {
  cardNumber: string
  cardName: string
  expiryDate: string
  cvv: string
}

// Mock data - Replace with actual API calls
const mockClients: Client[] = [
  {
    id: 1,
    name: "Empresa ABC Ltda",
    email: "contato@empresaabc.com",
    phone: "(11) 98765-4321",
    company: "ABC Ltda",
    created_by: 1,
    created_at: "2024-01-15",
    updated_at: "2024-01-15",
  },
  {
    id: 2,
    name: "Tech Solutions Inc",
    email: "info@techsolutions.com",
    phone: "(11) 91234-5678",
    company: "Tech Solutions",
    created_by: 1,
    created_at: "2024-02-20",
    updated_at: "2024-02-20",
  },
]

const mockProjects: Project[] = [
  {
    id: 1,
    name: "Projeto Marketing Digital 2024",
    description: "Campanha de marketing digital para Q1 2024",
    client_id: 1,
    created_by: 1,
    status: "active",
    start_date: "2024-01-01",
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
  },
  {
    id: 2,
    name: "Desenvolvimento de Website",
    description: "Novo website institucional",
    client_id: 1,
    created_by: 1,
    status: "active",
    start_date: "2024-02-01",
    created_at: "2024-02-01",
    updated_at: "2024-02-01",
  },
]

export function CheckoutFlow({ items, onBack, onComplete, preselectedClient, preselectedProject }: CheckoutFlowProps) {
  const [step, setStep] = useState(1)
  const [clientMode, setClientMode] = useState<"existing" | "new">("existing")
  const [projectMode, setProjectMode] = useState<"existing" | "new">("existing")

  // Client data
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [newClient, setNewClient] = useState<CreateClientRequest>({
    name: "",
    email: "",
    phone: "",
    company: "",
  })

  // Project data
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [newProject, setNewProject] = useState<CreateProjectRequest>({
    name: "",
    description: "",
    client_id: 0,
    start_date: "",
    end_date: "",
  })

  const [paymentMethod, setPaymentMethod] = useState<"single" | "split">("single")
  const [selectedPaymentType, setSelectedPaymentType] = useState<
    "credit_card" | "pix" | "boleto" | "credits" | "allkoins"
  >("credit_card")

  // Credit card details
  const [creditCard, setCreditCard] = useState<CreditCardDetails>({
    cardNumber: "",
    cardName: "",
    expiryDate: "",
    cvv: "",
  })

  // Split payment amounts
  const [splitPayments, setSplitPayments] = useState({
    credit_card: { enabled: false, amount: 0 },
    pix: { enabled: false, amount: 0 },
    boleto: { enabled: false, amount: 0 },
    credits: { enabled: false, amount: 0 },
    allkoins: { enabled: false, amount: 0 },
  })

  // Mock user balances
  const userBalances = {
    credits: 500.0,
    allkoins: 1250,
  }

  useEffect(() => {
    if (preselectedClient) {
      if ('id' in preselectedClient) {
        setSelectedClient(preselectedClient as Client)
        setClientMode('existing')
      } else {
        setNewClient(preselectedClient as CreateClientRequest)
        setClientMode('new')
      }
    }
    if (preselectedProject) {
      if ('id' in preselectedProject) {
        setSelectedProject(preselectedProject as Project)
        setProjectMode('existing')
      } else {
        setNewProject(preselectedProject as CreateProjectRequest)
        setProjectMode('new')
      }
    }
  }, [preselectedClient, preselectedProject])


  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  const getTotalPrice = () => {
    return items.reduce((total, item) => total + item.product.basePrice * item.quantity, 0)
  }

  const canProceedFromStep1 = items.length > 0
  const canProceedFromStep2 = clientMode === "existing" ? selectedClient !== null : newClient.name && newClient.email
  const canProceedFromStep3 = projectMode === "existing" ? selectedProject !== null : newProject.name
  const canProceedFromStep4 = () => {
    if (paymentMethod === "single") {
      if (selectedPaymentType === "credit_card") {
        return creditCard.cardNumber && creditCard.cardName && creditCard.expiryDate && creditCard.cvv
      }
      return true
    } else {
      const totalSplit = Object.values(splitPayments).reduce((sum, p) => sum + (p.enabled ? p.amount : 0), 0)
      return Math.abs(totalSplit - getTotalPrice()) < 0.01 // Allow small floating point differences
    }
  }

  const handleComplete = () => {
    const paymentData: PaymentData = {
      totalAmount: getTotalPrice(),
      methods: [],
    }

    if (paymentMethod === "single") {
      paymentData.methods.push({
        type: selectedPaymentType,
        amount: getTotalPrice(),
        details: selectedPaymentType === "credit_card" ? creditCard : undefined,
      })
    } else {
      Object.entries(splitPayments).forEach(([type, data]) => {
        if (data.enabled && data.amount > 0) {
          paymentData.methods.push({
            type: type as PaymentMethod["type"],
            amount: data.amount,
            details: type === "credit_card" ? creditCard : undefined,
          })
        }
      })
    }

    const checkoutData: CheckoutData = {
      client: clientMode === "existing" ? selectedClient! : newClient,
      project: projectMode === "existing" ? selectedProject! : newProject,
      isNewClient: clientMode === "new",
      isNewProject: projectMode === "new",
      payment: paymentData,
    }
    onComplete(checkoutData)
  }

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center space-x-2 mb-6">
      {[1, 2, 3, 4, 5].map((s) => (
        <div key={s} className="flex items-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
              s === step
                ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                : s < step
                  ? "bg-green-500 text-white"
                  : "bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-gray-400"
            }`}
          >
            {s < step ? <Check className="h-4 w-4" /> : s}
          </div>
          {s < 5 && <div className={`w-12 h-0.5 ${s < step ? "bg-green-500" : "bg-gray-200 dark:bg-slate-700"}`} />}
        </div>
      ))}
    </div>
  )

  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="flex items-center space-x-3 mb-4">
        <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg">
          <ShoppingBag className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Revisar Itens</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Confirme os produtos selecionados</p>
        </div>
      </div>

      <ScrollArea className="h-[300px]">
        <div className="space-y-3 pr-4">
          {items.map((item) => (
            <Card key={item.product.id} className="p-3">
              <div className="flex gap-3">
                <div className="relative w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 rounded-lg flex items-center justify-center flex-shrink-0">
                  {item.product.image ? (
                    <img
                      src={item.product.image || "/placeholder.svg"}
                      alt={item.product.name}
                      className="absolute inset-0 w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <ShoppingBag className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-sm text-gray-900 dark:text-white">{item.product.name}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Quantidade: {item.quantity}</p>
                  <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mt-1">
                    {formatCurrency(item.product.basePrice * item.quantity)}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>

      <div className="border-t border-gray-200 dark:border-slate-700 pt-3">
        <div className="flex items-center justify-between">
          <span className="text-base font-semibold text-gray-900 dark:text-white">Total</span>
          <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {formatCurrency(getTotalPrice())}
          </span>
        </div>
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="flex items-center space-x-3 mb-4">
        <div className="bg-purple-100 dark:bg-purple-900 p-2 rounded-lg">
          <Building2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Cliente</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {preselectedClient ? 'Cliente já selecionado nesta contratação' : 'Selecione ou cadastre um cliente'}
          </p>
        </div>
      </div>

      {preselectedClient ? (
        <Card className="p-4 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
          <div className="flex items-start space-x-3">
            <Building2 className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-2">Cliente Selecionado</h4>
              <div className="space-y-1 text-sm">
                <p className="text-gray-700 dark:text-gray-300">
                  <span className="font-medium">Nome:</span> {preselectedClient.name}
                </p>
                {preselectedClient.email && (
                  <p className="text-gray-700 dark:text-gray-300">
                    <span className="font-medium">E-mail:</span> {preselectedClient.email}
                  </p>
                )}
                {preselectedClient.phone && (
                  <p className="text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Telefone:</span> {preselectedClient.phone}
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <>
          <RadioGroup value={clientMode} onValueChange={(v) => setClientMode(v as "existing" | "new")}>
            <div className="flex items-center space-x-2 mb-3">
              <RadioGroupItem value="existing" id="existing-client" />
              <Label htmlFor="existing-client" className="cursor-pointer">
                Selecionar cliente existente
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="new" id="new-client" />
              <Label htmlFor="new-client" className="cursor-pointer">
                Cadastrar novo cliente
              </Label>
            </div>
          </RadioGroup>

          {clientMode === "existing" ? (
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select
                value={selectedClient?.id.toString()}
                onValueChange={(v) => {
                  const client = mockClients.find((c) => c.id === Number.parseInt(v))
                  setSelectedClient(client || null)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  {mockClients.map((client) => (
                    <SelectItem key={client.id} value={client.id.toString()}>
                      <div className="flex flex-col">
                        <span className="font-medium">{client.name}</span>
                        <span className="text-xs text-gray-500">{client.email}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-4 pr-4">
                <div className="space-y-2">
                  <Label htmlFor="client-name">Nome / Razão Social *</Label>
                  <Input
                    id="client-name"
                    value={newClient.name}
                    onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                    placeholder="Digite o nome do cliente"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-company">CNPJ / CPF</Label>
                  <Input
                    id="client-company"
                    value={newClient.company}
                    onChange={(e) => setNewClient({ ...newClient, company: e.target.value })}
                    placeholder="00.000.000/0000-00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-email">E-mail *</Label>
                  <Input
                    id="client-email"
                    type="email"
                    value={newClient.email}
                    onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                    placeholder="contato@empresa.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-phone">Telefone</Label>
                  <Input
                    id="client-phone"
                    value={newClient.phone}
                    onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
            </ScrollArea>
          )}
        </>
      )}
    </div>
  )

  const renderStep3 = () => {
    const clientId = clientMode === "existing" ? selectedClient?.id : 0
    const filteredProjects = mockProjects.filter((p) => p.client_id === clientId)

    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-3 mb-4">
          <div className="bg-green-100 dark:bg-green-900 p-2 rounded-lg">
            <FolderKanban className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Projeto</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {preselectedProject ? 'Projeto já criado nesta contratação' : 'Selecione ou crie um projeto'}
            </p>
          </div>
        </div>

        {preselectedProject ? (
          <Card className="p-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <div className="flex items-start space-x-3">
              <FolderKanban className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-2">Projeto Selecionado</h4>
                <div className="space-y-1 text-sm">
                  <p className="text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Nome:</span> {preselectedProject.name}
                  </p>
                  {preselectedProject.description && (
                    <p className="text-gray-700 dark:text-gray-300">
                      <span className="font-medium">Descrição:</span> {preselectedProject.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <>
            <RadioGroup value={projectMode} onValueChange={(v) => setProjectMode(v as "existing" | "new")}>
              <div className="flex items-center space-x-2 mb-3">
                <RadioGroupItem value="existing" id="existing-project" />
                <Label htmlFor="existing-project" className="cursor-pointer">
                  Selecionar projeto existente
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="new" id="new-project" />
                <Label htmlFor="new-project" className="cursor-pointer">
                  Criar novo projeto
                </Label>
              </div>
            </RadioGroup>

            {projectMode === "existing" ? (
              <div className="space-y-2">
                <Label>Projeto</Label>
                {filteredProjects.length > 0 ? (
                  <Select
                    value={selectedProject?.id.toString()}
                    onValueChange={(v) => {
                      const project = mockProjects.find((p) => p.id === Number.parseInt(v))
                      setSelectedProject(project || null)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um projeto" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredProjects.map((project) => (
                        <SelectItem key={project.id} value={project.id.toString()}>
                          <div className="flex flex-col">
                            <span className="font-medium">{project.name}</span>
                            <span className="text-xs text-gray-500">{project.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="text-sm text-gray-500 dark:text-gray-400 p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
                    Nenhum projeto encontrado para este cliente. Crie um novo projeto.
                  </div>
                )}
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-4 pr-4">
                  <div className="space-y-2">
                    <Label htmlFor="project-name">Nome do Projeto *</Label>
                    <Input
                      id="project-name"
                      value={newProject.name}
                      onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                      placeholder="Digite o nome do projeto"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project-description">Descrição</Label>
                    <Textarea
                      id="project-description"
                      value={newProject.description}
                      onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                      placeholder="Descreva o projeto"
                      rows={4}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="project-start">Data de Início</Label>
                      <Input
                        id="project-start"
                        type="date"
                        value={newProject.start_date}
                        onChange={(e) => setNewProject({ ...newProject, start_date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="project-end">Data de Término</Label>
                      <Input
                        id="project-end"
                        type="date"
                        value={newProject.end_date}
                        onChange={(e) => setNewProject({ ...newProject, end_date: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </ScrollArea>
            )}
          </>
        )}
      </div>
    )
  }

  const renderStep4 = () => {
    const totalPrice = getTotalPrice()
    const totalSplit = Object.values(splitPayments).reduce((sum, p) => sum + (p.enabled ? p.amount : 0), 0)
    const remaining = totalPrice - totalSplit

    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-3 mb-4">
          <div className="bg-emerald-100 dark:bg-emerald-900 p-2 rounded-lg">
            <Wallet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Pagamento</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Escolha a forma de pagamento</p>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Valor Total</span>
            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{formatCurrency(totalPrice)}</span>
          </div>
        </div>

        <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as "single" | "split")}>
          <div className="flex items-center space-x-2 mb-3">
            <RadioGroupItem value="single" id="single-payment" />
            <Label htmlFor="single-payment" className="cursor-pointer">
              Pagamento único
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="split" id="split-payment" />
            <Label htmlFor="split-payment" className="cursor-pointer">
              Dividir pagamento
            </Label>
          </div>
        </RadioGroup>

        <ScrollArea className="h-[320px]">
          <div className="space-y-4 pr-4">
            {paymentMethod === "single" ? (
              <>
                <Select value={selectedPaymentType} onValueChange={(v) => setSelectedPaymentType(v as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o método de pagamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit_card">
                      <div className="flex items-center space-x-2">
                        <CreditCard className="h-4 w-4" />
                        <span>Cartão de Crédito</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="pix">
                      <div className="flex items-center space-x-2">
                        <Smartphone className="h-4 w-4" />
                        <span>Pix</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="boleto">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4" />
                        <span>Boleto Bancário</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="credits">
                      <div className="flex items-center space-x-2">
                        <Wallet className="h-4 w-4" />
                        <span>Créditos da Plataforma ({formatCurrency(userBalances.credits)})</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="allkoins">
                      <div className="flex items-center space-x-2">
                        <Coins className="h-4 w-4" />
                        <span>Allkoins ({userBalances.allkoins} AK)</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>

                {selectedPaymentType === "credit_card" && (
                  <div className="space-y-3 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="card-number">Número do Cartão *</Label>
                      <Input
                        id="card-number"
                        value={creditCard.cardNumber}
                        onChange={(e) => setCreditCard({ ...creditCard, cardNumber: e.target.value })}
                        placeholder="0000 0000 0000 0000"
                        maxLength={19}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="card-name">Nome no Cartão *</Label>
                      <Input
                        id="card-name"
                        value={creditCard.cardName}
                        onChange={(e) => setCreditCard({ ...creditCard, cardName: e.target.value })}
                        placeholder="Nome como está no cartão"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="expiry">Validade *</Label>
                        <Input
                          id="expiry"
                          value={creditCard.expiryDate}
                          onChange={(e) => setCreditCard({ ...creditCard, expiryDate: e.target.value })}
                          placeholder="MM/AA"
                          maxLength={5}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cvv">CVV *</Label>
                        <Input
                          id="cvv"
                          value={creditCard.cvv}
                          onChange={(e) => setCreditCard({ ...creditCard, cvv: e.target.value })}
                          placeholder="123"
                          maxLength={4}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {selectedPaymentType === "pix" && (
                  <Card className="p-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 mt-4">
                    <div className="flex items-start space-x-3">
                      <Smartphone className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-2">Pagamento via Pix</h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          Após confirmar, você receberá um QR Code para realizar o pagamento instantaneamente.
                        </p>
                      </div>
                    </div>
                  </Card>
                )}

                {selectedPaymentType === "boleto" && (
                  <Card className="p-4 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 mt-4">
                    <div className="flex items-start space-x-3">
                      <FileText className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-2">Boleto Bancário</h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          O boleto será gerado após a confirmação. Prazo de vencimento: 3 dias úteis.
                        </p>
                      </div>
                    </div>
                  </Card>
                )}

                {selectedPaymentType === "credits" && (
                  <Card className="p-4 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 mt-4">
                    <div className="flex items-start space-x-3">
                      <Wallet className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-2">
                          Créditos da Plataforma
                        </h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                          Saldo disponível: {formatCurrency(userBalances.credits)}
                        </p>
                        {totalPrice > userBalances.credits && (
                          <p className="text-xs text-red-600 dark:text-red-400">
                            Saldo insuficiente. Considere dividir o pagamento.
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                )}

                {selectedPaymentType === "allkoins" && (
                  <Card className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 mt-4">
                    <div className="flex items-start space-x-3">
                      <Coins className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-2">Allkoins</h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                          Saldo disponível: {userBalances.allkoins} AK (≈ {formatCurrency(userBalances.allkoins * 1)})
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Taxa de conversão: 1 AK = R$ 1,00</p>
                      </div>
                    </div>
                  </Card>
                )}
              </>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Combine diferentes métodos de pagamento para completar o valor total.
                </p>

                {/* Credit Card Split */}
                <Card className="p-3">
                  <div className="flex items-center space-x-3 mb-2">
                    <Checkbox
                      id="split-credit-card"
                      checked={splitPayments.credit_card.enabled}
                      onCheckedChange={(checked) =>
                        setSplitPayments({
                          ...splitPayments,
                          credit_card: { ...splitPayments.credit_card, enabled: !!checked },
                        })
                      }
                    />
                    <Label htmlFor="split-credit-card" className="flex items-center space-x-2 cursor-pointer flex-1">
                      <CreditCard className="h-4 w-4" />
                      <span>Cartão de Crédito</span>
                    </Label>
                  </div>
                  {splitPayments.credit_card.enabled && (
                    <Input
                      type="number"
                      value={splitPayments.credit_card.amount || ""}
                      onChange={(e) =>
                        setSplitPayments({
                          ...splitPayments,
                          credit_card: { ...splitPayments.credit_card, amount: Number(e.target.value) },
                        })
                      }
                      placeholder="Valor"
                      className="mt-2"
                    />
                  )}
                </Card>

                {/* Pix Split */}
                <Card className="p-3">
                  <div className="flex items-center space-x-3 mb-2">
                    <Checkbox
                      id="split-pix"
                      checked={splitPayments.pix.enabled}
                      onCheckedChange={(checked) =>
                        setSplitPayments({
                          ...splitPayments,
                          pix: { ...splitPayments.pix, enabled: !!checked },
                        })
                      }
                    />
                    <Label htmlFor="split-pix" className="flex items-center space-x-2 cursor-pointer flex-1">
                      <Smartphone className="h-4 w-4" />
                      <span>Pix</span>
                    </Label>
                  </div>
                  {splitPayments.pix.enabled && (
                    <Input
                      type="number"
                      value={splitPayments.pix.amount || ""}
                      onChange={(e) =>
                        setSplitPayments({
                          ...splitPayments,
                          pix: { ...splitPayments.pix, amount: Number(e.target.value) },
                        })
                      }
                      placeholder="Valor"
                      className="mt-2"
                    />
                  )}
                </Card>

                {/* Credits Split */}
                <Card className="p-3">
                  <div className="flex items-center space-x-3 mb-2">
                    <Checkbox
                      id="split-credits"
                      checked={splitPayments.credits.enabled}
                      onCheckedChange={(checked) =>
                        setSplitPayments({
                          ...splitPayments,
                          credits: { ...splitPayments.credits, enabled: !!checked },
                        })
                      }
                    />
                    <Label htmlFor="split-credits" className="flex items-center space-x-2 cursor-pointer flex-1">
                      <Wallet className="h-4 w-4" />
                      <span>Créditos ({formatCurrency(userBalances.credits)})</span>
                    </Label>
                  </div>
                  {splitPayments.credits.enabled && (
                    <Input
                      type="number"
                      value={splitPayments.credits.amount || ""}
                      onChange={(e) =>
                        setSplitPayments({
                          ...splitPayments,
                          credits: {
                            ...splitPayments.credits,
                            amount: Math.min(Number(e.target.value), userBalances.credits),
                          },
                        })
                      }
                      placeholder="Valor"
                      max={userBalances.credits}
                      className="mt-2"
                    />
                  )}
                </Card>

                {/* Allkoins Split */}
                <Card className="p-3">
                  <div className="flex items-center space-x-3 mb-2">
                    <Checkbox
                      id="split-allkoins"
                      checked={splitPayments.allkoins.enabled}
                      onCheckedChange={(checked) =>
                        setSplitPayments({
                          ...splitPayments,
                          allkoins: { ...splitPayments.allkoins, enabled: !!checked },
                        })
                      }
                    />
                    <Label htmlFor="split-allkoins" className="flex items-center space-x-2 cursor-pointer flex-1">
                      <Coins className="h-4 w-4" />
                      <span>Allkoins ({userBalances.allkoins} AK)</span>
                    </Label>
                  </div>
                  {splitPayments.allkoins.enabled && (
                    <Input
                      type="number"
                      value={splitPayments.allkoins.amount || ""}
                      onChange={(e) =>
                        setSplitPayments({
                          ...splitPayments,
                          allkoins: {
                            ...splitPayments.allkoins,
                            amount: Math.min(Number(e.target.value), userBalances.allkoins),
                          },
                        })
                      }
                      placeholder="Valor"
                      max={userBalances.allkoins}
                      className="mt-2"
                    />
                  )}
                </Card>

                {/* Split Summary */}
                <Card
                  className={`p-3 ${remaining === 0 ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" : "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800"}`}
                >
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Total:</span>
                      <span className="font-medium">{formatCurrency(totalPrice)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Alocado:</span>
                      <span className="font-medium">{formatCurrency(totalSplit)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-1">
                      <span className="font-semibold">Restante:</span>
                      <span
                        className={`font-bold ${remaining === 0 ? "text-green-600 dark:text-green-400" : "text-orange-600 dark:text-orange-400"}`}
                      >
                        {formatCurrency(remaining)}
                      </span>
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    )
  }

  const renderStep5 = () => {
    const client = clientMode === "existing" ? selectedClient : newClient
    const project = projectMode === "existing" ? selectedProject : newProject

    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-3 mb-4">
          <div className="bg-orange-100 dark:bg-orange-900 p-2 rounded-lg">
            <Check className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Revisar e Confirmar</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Verifique os dados antes de finalizar</p>
          </div>
        </div>

        <ScrollArea className="h-[350px]">
          <div className="space-y-4 pr-4">
            {/* Client Summary */}
            <Card className="p-4 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
              <div className="flex items-start space-x-3">
                <Building2 className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-2">Cliente</h4>
                  <div className="space-y-1 text-sm">
                    <p className="text-gray-700 dark:text-gray-300">
                      <span className="font-medium">Nome:</span> {client?.name}
                    </p>
                    {client?.email && (
                      <p className="text-gray-700 dark:text-gray-300">
                        <span className="font-medium">E-mail:</span> {client.email}
                      </p>
                    )}
                    {client?.phone && (
                      <p className="text-gray-700 dark:text-gray-300">
                        <span className="font-medium">Telefone:</span> {client.phone}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* Project Summary */}
            <Card className="p-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <div className="flex items-start space-x-3">
                <FolderKanban className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-2">Projeto</h4>
                  <div className="space-y-1 text-sm">
                    <p className="text-gray-700 dark:text-gray-300">
                      <span className="font-medium">Nome:</span> {project?.name}
                    </p>
                    {project?.description && (
                      <p className="text-gray-700 dark:text-gray-300">
                        <span className="font-medium">Descrição:</span> {project.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* Items Summary */}
            <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <div className="flex items-start space-x-3">
                <ShoppingBag className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-2">
                    Produtos ({items.length})
                  </h4>
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div key={item.product.id} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700 dark:text-gray-300">
                          {item.product.name} × {item.quantity}
                        </span>
                        <span className="font-medium text-blue-600 dark:text-blue-400">
                          {formatCurrency(item.product.basePrice * item.quantity)}
                        </span>
                      </div>
                    ))}
                    <div className="border-t border-blue-200 dark:border-blue-800 pt-2 mt-2 flex items-center justify-between font-semibold">
                      <span className="text-gray-900 dark:text-white">Total</span>
                      <span className="text-lg text-blue-600 dark:text-blue-400">
                        {formatCurrency(getTotalPrice())}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800">
              <div className="flex items-start space-x-3">
                <Wallet className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-2">Pagamento</h4>
                  <div className="space-y-1 text-sm">
                    {paymentMethod === "single" ? (
                      <p className="text-gray-700 dark:text-gray-300">
                        <span className="font-medium">Método:</span>{" "}
                        {selectedPaymentType === "credit_card" && "Cartão de Crédito"}
                        {selectedPaymentType === "pix" && "Pix"}
                        {selectedPaymentType === "boleto" && "Boleto Bancário"}
                        {selectedPaymentType === "credits" && "Créditos da Plataforma"}
                        {selectedPaymentType === "allkoins" && "Allkoins"}
                      </p>
                    ) : (
                      <div className="space-y-1">
                        <p className="font-medium text-gray-900 dark:text-white mb-1">Pagamento Dividido:</p>
                        {Object.entries(splitPayments).map(([type, data]) => {
                          if (!data.enabled || data.amount === 0) return null
                          const labels = {
                            credit_card: "Cartão de Crédito",
                            pix: "Pix",
                            boleto: "Boleto",
                            credits: "Créditos",
                            allkoins: "Allkoins",
                          }
                          return (
                            <p key={type} className="text-gray-700 dark:text-gray-300">
                              • {labels[type as keyof typeof labels]}: {formatCurrency(data.amount)}
                            </p>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </ScrollArea>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex-shrink-0">{renderStepIndicator()}</div>

      {/* Content with proper scrolling */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
          {step === 5 && renderStep5()}
        </div>
      </ScrollArea>

      {/* Footer - Fixed at bottom, always visible */}
      <div className="border-t border-gray-200 dark:border-slate-700 p-4 space-y-3 bg-white dark:bg-slate-900 flex-shrink-0">
        <div className="flex gap-2">
          {step > 1 ? (
            <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          ) : (
            <Button variant="outline" onClick={onBack} className="flex-1">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Carrinho
            </Button>
          )}

          {step < 5 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={
                (step === 1 && !canProceedFromStep1) ||
                (step === 2 && !canProceedFromStep2) ||
                (step === 3 && !canProceedFromStep3) ||
                (step === 4 && !canProceedFromStep4())
              }
              className="flex-1 btn-brand"
            >
              Próximo
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleComplete}
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
            >
              <Check className="h-4 w-4 mr-2" />
              Finalizar Compra
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
