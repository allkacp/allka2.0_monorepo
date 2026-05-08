export interface Specialty {
  id: string
  name: string
  description: string
  hourlyRate: number // valor base por hora baseado em pesquisa de mercado
  category: string
  requiredSkills: string[]
  marketResearchDate: string
  isActive: boolean
}

export interface TaxConfiguration {
  id: string
  name: string
  type: "percentage" | "fixed"
  value: number
  appliesTo: "final_value" | "base_cost" | "nomad_payment"
  description: string
  isActive: boolean
}

export interface Task {
  id: string
  name: string
  description: string
  specialtyId: string
  baseHours: number
  profitMargin: number // margem de lucro da Allka em %
  emergencyMultiplier: number // acréscimo para entregas emergenciais
  quantityDiscount: number // desconto para contratação em quantidade
  monthlyDiscount: number // desconto para modelo mensal
  variations: TaskVariation[]
  addons: TaskAddon[]
  isActive: boolean
}

export interface TaskVariation {
  id: string
  name: string
  description: string
  percentageModifier: number // aumento ou redução percentual
  features: string[]
}

export interface TaskAddon {
  id: string
  name: string
  description: string
  specialtyId: string
  hours: number
  isRequired: boolean
  category: string
}

export interface PricingCalculation {
  baseHours: number
  hourlyRate: number
  baseCost: number // custo base (horas * valor/hora)
  nomadPayment: number // remuneração do nômade
  qualificationFee: number // taxa de qualificação (20% sobre custo base)
  partnerCommission: number // comissão de parceiro (5% sobre valor final)
  taxes: number // impostos (14% sobre valor final)
  operationalFee: number // taxa operacional (5% sobre valor final)
  allkaProfit: number // lucro da Allka
  finalPrice: number // preço final para o cliente
  breakdown: PricingBreakdown[]
}

export interface PricingBreakdown {
  item: string
  type: "cost" | "fee" | "tax" | "profit"
  value: number
  percentage?: number
  description: string
}
