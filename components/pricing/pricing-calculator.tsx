
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Calculator, DollarSign, Clock, AlertTriangle } from "lucide-react"
import { pricingEngine } from "@/lib/pricing-engine"
import type { Specialty, Task, TaskVariation, TaskAddon, PricingCalculation } from "@/types/pricing"
import type { AccountType, AccountSubType } from "@/contexts/account-type-context"

// Mock data for demonstration
const mockSpecialties: Specialty[] = [
  {
    id: "1",
    name: "Design Gráfico",
    description: "Criação de materiais visuais",
    hourlyRate: 85,
    category: "Design",
    requiredSkills: ["Adobe Creative Suite", "Figma"],
    marketResearchDate: "2024-01-15",
    isActive: true,
  },
  {
    id: "2",
    name: "Desenvolvimento Web",
    description: "Desenvolvimento de websites",
    hourlyRate: 120,
    category: "Tecnologia",
    requiredSkills: ["React", "Node.js"],
    marketResearchDate: "2024-01-15",
    isActive: true,
  },
]

const mockTask: Task = {
  id: "1",
  name: "Criação de Landing Page",
  description: "Desenvolvimento de página de conversão",
  specialtyId: "2",
  baseHours: 40,
  profitMargin: 30,
  emergencyMultiplier: 50,
  quantityDiscount: 10,
  monthlyDiscount: 15,
  variations: [
    {
      id: "1",
      name: "Básica",
      description: "Layout simples",
      percentageModifier: -20,
      features: ["Design responsivo", "Formulário de contato"],
    },
    {
      id: "2",
      name: "Premium",
      description: "Layout avançado",
      percentageModifier: 50,
      features: ["Animações", "Integração CRM", "A/B Testing"],
    },
  ],
  addons: [
    {
      id: "1",
      name: "SEO Básico",
      description: "Otimização para motores de busca",
      specialtyId: "2",
      hours: 8,
      isRequired: false,
      category: "Marketing",
    },
  ],
  isActive: true,
}

export function PricingCalculator() {
  const [selectedTask] = useState<Task>(mockTask)
  const [selectedSpecialty, setSelectedSpecialty] = useState<Specialty>(mockSpecialties[1])
  const [selectedVariations, setSelectedVariations] = useState<TaskVariation[]>([])
  const [selectedAddons, setSelectedAddons] = useState<TaskAddon[]>([])
  const [quantity, setQuantity] = useState(1)
  const [isEmergency, setIsEmergency] = useState(false)
  const [isMonthly, setIsMonthly] = useState(false)
  const [accountType, setAccountType] = useState<AccountType>("empresas")
  const [accountSubType, setAccountSubType] = useState<AccountSubType>("in-house")
  const [creditPlan, setCreditPlan] = useState<number>()
  const [calculation, setCalculation] = useState<PricingCalculation | null>(null)

  useEffect(() => {
    const result = pricingEngine.calculateTaskPrice(
      selectedTask,
      selectedSpecialty,
      selectedVariations,
      selectedAddons,
      mockSpecialties,
      {
        quantity,
        isEmergency,
        isMonthly,
        accountType,
        accountSubType,
        creditPlan,
      },
    )
    setCalculation(result)
  }, [
    selectedTask,
    selectedSpecialty,
    selectedVariations,
    selectedAddons,
    quantity,
    isEmergency,
    isMonthly,
    accountType,
    accountSubType,
    creditPlan,
  ])

  const handleVariationToggle = (variation: TaskVariation) => {
    setSelectedVariations((prev) => {
      const exists = prev.find((v) => v.id === variation.id)
      if (exists) {
        return prev.filter((v) => v.id !== variation.id)
      } else {
        return [...prev, variation]
      }
    })
  }

  const handleAddonToggle = (addon: TaskAddon) => {
    setSelectedAddons((prev) => {
      const exists = prev.find((a) => a.id === addon.id)
      if (exists) {
        return prev.filter((a) => a.id !== addon.id)
      } else {
        return [...prev, addon]
      }
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Calculadora de Preços</h2>
        <p className="text-muted-foreground">Simule preços de tarefas com diferentes configurações</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Configuração da Tarefa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Tarefa Selecionada</Label>
                <div className="mt-1 p-3 bg-muted rounded-lg">
                  <h4 className="font-medium">{selectedTask.name}</h4>
                  <p className="text-sm text-muted-foreground">{selectedTask.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {selectedTask.baseHours}h base
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      {selectedTask.profitMargin}% margem
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <Label>Especialidade</Label>
                <Select
                  value={selectedSpecialty.id}
                  onValueChange={(value) => {
                    const specialty = mockSpecialties.find((s) => s.id === value)
                    if (specialty) setSelectedSpecialty(specialty)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {mockSpecialties.map((specialty) => (
                      <SelectItem key={specialty.id} value={specialty.id}>
                        {specialty.name} - R$ {specialty.hourlyRate}/h
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Variações</Label>
                <div className="space-y-2 mt-2">
                  {selectedTask.variations.map((variation) => (
                    <div key={variation.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`variation-${variation.id}`}
                        checked={selectedVariations.some((v) => v.id === variation.id)}
                        onChange={() => handleVariationToggle(variation)}
                        className="rounded"
                      />
                      <label htmlFor={`variation-${variation.id}`} className="flex-1 text-sm">
                        <span className="font-medium">{variation.name}</span>
                        <Badge variant={variation.percentageModifier > 0 ? "default" : "secondary"} className="ml-2">
                          {variation.percentageModifier > 0 ? "+" : ""}
                          {variation.percentageModifier}%
                        </Badge>
                        <p className="text-muted-foreground">{variation.description}</p>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>Adicionais</Label>
                <div className="space-y-2 mt-2">
                  {selectedTask.addons.map((addon) => (
                    <div key={addon.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`addon-${addon.id}`}
                        checked={selectedAddons.some((a) => a.id === addon.id)}
                        onChange={() => handleAddonToggle(addon)}
                        className="rounded"
                      />
                      <label htmlFor={`addon-${addon.id}`} className="flex-1 text-sm">
                        <span className="font-medium">{addon.name}</span>
                        <Badge variant="outline" className="ml-2">
                          +{addon.hours}h
                        </Badge>
                        <p className="text-muted-foreground">{addon.description}</p>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="quantity">Quantidade</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    min="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Opções</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Switch id="emergency" checked={isEmergency} onCheckedChange={setIsEmergency} />
                      <Label htmlFor="emergency" className="text-sm">
                        Entrega emergencial (+{selectedTask.emergencyMultiplier}%)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="monthly" checked={isMonthly} onCheckedChange={setIsMonthly} />
                      <Label htmlFor="monthly" className="text-sm">
                        Modelo mensal (-{selectedTask.monthlyDiscount}%)
                      </Label>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <Label>Tipo de Conta</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <Select value={accountType} onValueChange={(value: AccountType) => setAccountType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="empresas">Empresas</SelectItem>
                      <SelectItem value="agencias">Agências</SelectItem>
                    </SelectContent>
                  </Select>

                  {accountType === "empresas" && (
                    <Select
                      value={accountSubType || ""}
                      onValueChange={(value: AccountSubType) => setAccountSubType(value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="company">Company</SelectItem>
                        <SelectItem value="in-house">In-House</SelectItem>
                      </SelectContent>
                    </Select>
                  )}

                  {accountType === "agencias" && (
                    <Select
                      value={creditPlan?.toString() || ""}
                      onValueChange={(value) => setCreditPlan(Number(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Plano de crédito" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="300">Lite — R$ 300/mês (0%)</SelectItem>
                        <SelectItem value="500">Start — R$ 500/mês (5%)</SelectItem>
                        <SelectItem value="1000">Standard — R$ 1.000/mês (10%)</SelectItem>
                        <SelectItem value="1500">Growth — R$ 1.500/mês (15%)</SelectItem>
                        <SelectItem value="3000">Scale — R$ 3.000/mês (20%)</SelectItem>
                        <SelectItem value="5000">Squad / Enterprise — R$ 5.000/mês (20%)</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results Panel */}
        <div className="space-y-6">
          {calculation && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Resultado do Cálculo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center p-6 bg-primary/5 rounded-lg">
                      <p className="text-sm text-muted-foreground">Preço Final</p>
                      <p className="text-3xl font-bold text-primary">
                        {pricingEngine.formatCurrency(calculation.finalPrice)}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Horas Totais</p>
                        <p className="font-medium">{calculation.baseHours}h</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Valor/Hora</p>
                        <p className="font-medium">R$ {calculation.hourlyRate}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Remuneração Nômade</p>
                        <p className="font-medium">{pricingEngine.formatCurrency(calculation.nomadPayment)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Lucro Allka</p>
                        <p className="font-medium">{pricingEngine.formatCurrency(calculation.allkaProfit)}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Detalhamento de Custos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {calculation.breakdown.map((item, index) => (
                      <div key={index} className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              item.type === "cost"
                                ? "bg-blue-500"
                                : item.type === "fee"
                                  ? "bg-orange-500"
                                  : item.type === "tax"
                                    ? "bg-red-500"
                                    : "bg-green-500"
                            }`}
                          />
                          <div>
                            <p className="font-medium">{item.item}</p>
                            <p className="text-xs text-muted-foreground">{item.description}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{pricingEngine.formatCurrency(item.value)}</p>
                          {item.percentage && <p className="text-xs text-muted-foreground">{item.percentage}%</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {(isEmergency || isMonthly || quantity > 1) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                      Modificadores Aplicados
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {isEmergency && (
                        <div className="flex items-center justify-between">
                          <span>Entrega Emergencial</span>
                          <Badge variant="destructive">+{selectedTask.emergencyMultiplier}%</Badge>
                        </div>
                      )}
                      {quantity > 1 && (
                        <div className="flex items-center justify-between">
                          <span>Desconto por Quantidade</span>
                          <Badge variant="secondary">-{selectedTask.quantityDiscount}%</Badge>
                        </div>
                      )}
                      {isMonthly && (
                        <div className="flex items-center justify-between">
                          <span>Desconto Mensal</span>
                          <Badge variant="secondary">-{selectedTask.monthlyDiscount}%</Badge>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
