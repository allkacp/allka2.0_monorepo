import type { Specialty, Task, TaskVariation, TaskAddon, PricingCalculation, PricingBreakdown } from "@/types/pricing"
import type { AccountType, AccountSubType } from "@/contexts/account-type-context"
import { DEFAULT_TAX_RATES } from "@/constants/tax-rates"

export class PricingEngine {
  private static instance: PricingEngine

  static getInstance(): PricingEngine {
    if (!PricingEngine.instance) {
      PricingEngine.instance = new PricingEngine()
    }
    return PricingEngine.instance
  }

  calculateTaskPrice(
    task: Task,
    specialty: Specialty,
    selectedVariations: TaskVariation[] = [],
    selectedAddons: TaskAddon[] = [],
    specialties: Specialty[] = [],
    options: {
      quantity?: number
      isEmergency?: boolean
      isMonthly?: boolean
      accountType?: AccountType
      accountSubType?: AccountSubType | null
      creditPlan?: number
      nomadLevel?: "bronze" | "silver" | "gold" | "platinum" | "leader"
    } = {},
  ): PricingCalculation {
    const {
      quantity = 1,
      isEmergency = false,
      isMonthly = false,
      accountType,
      accountSubType,
      creditPlan,
      nomadLevel = "bronze",
    } = options

    // Step 1: Calculate Base Remuneration (Custo Base)
    // Remuneração Base da Tarefa = (Número de horas da tarefa) x (Valor da hora do especialista)
    const baseTaskRemuneration = task.baseHours * specialty.hourlyRate

    // Remuneração Base do Adicional = (Número de horas do adicional) x (Valor da hora do especialista)
    let baseAddonRemuneration = 0
    let totalAddonHours = 0

    selectedAddons.forEach((addon) => {
      const addonSpecialty = specialties.find((s) => s.id === addon.specialtyId) || specialty
      baseAddonRemuneration += addon.hours * addonSpecialty.hourlyRate
      totalAddonHours += addon.hours
    })

    const totalBaseRemuneration = baseTaskRemuneration + baseAddonRemuneration
    const totalHours = task.baseHours + totalAddonHours

    // Step 2: Calculate Total Cost for Allka
    // Custo da Tarefa = Remuneração Base + Remuneração Base * (% de nível do especialista até 50%)
    const nomadLevelMultipliers = {
      bronze: 0, // 0% additional
      silver: 0.25, // 25% additional
      gold: 0.5, // 50% additional
      platinum: 0.5, // 50% additional
      leader: 0.5, // 50% additional
    }

    const nomadBonus = totalBaseRemuneration * nomadLevelMultipliers[nomadLevel]
    const totalTaskCost = totalBaseRemuneration + nomadBonus

    // Step 3: Calculate Final Sale Price
    // Preço com Margem = Custo da Tarefa + Custo da Tarefa * Margem de Lucro
    const priceWithMargin = totalTaskCost + totalTaskCost * (task.profitMargin / 100)

    // Apply variations to price with margin
    // Preço com Variação = Preço com Margem + Preço com Margem * % da variação
    let priceWithVariation = priceWithMargin
    selectedVariations.forEach((variation) => {
      priceWithVariation += priceWithMargin * (variation.percentageModifier / 100)
    })

    // Step 4: Apply Discounts and Surcharges
    let finalPrice = priceWithVariation * quantity
    let adjustedNomadRemuneration = totalBaseRemuneration * quantity

    // Emergency surcharge
    if (isEmergency) {
      const emergencyMultiplier = task.emergencyMultiplier / 100
      finalPrice *= 1 + emergencyMultiplier
      adjustedNomadRemuneration *= 1 + emergencyMultiplier
    }

    // Quantity discount
    if (quantity > 1) {
      const quantityDiscount = task.quantityDiscount / 100
      finalPrice *= 1 - quantityDiscount
      adjustedNomadRemuneration *= 1 - quantityDiscount
    }

    // Monthly discount
    if (isMonthly) {
      const monthlyDiscount = task.monthlyDiscount / 100
      finalPrice *= 1 - monthlyDiscount
      adjustedNomadRemuneration *= 1 - monthlyDiscount
    }

    // Account-based discounts
    if (accountType && accountSubType) {
      const accountDiscount = this.calculateAccountDiscount(accountType, accountSubType, creditPlan)
      if (accountDiscount > 0) {
        finalPrice *= 1 - accountDiscount
        adjustedNomadRemuneration *= 1 - accountDiscount
      }
    }

    // Calculate taxes and fees (applied to final price)
    const partnerCommission = finalPrice * DEFAULT_TAX_RATES.PARTNER_COMMISSION
    const taxes = finalPrice * DEFAULT_TAX_RATES.TAXES
    const operationalFee = finalPrice * DEFAULT_TAX_RATES.OPERATIONAL_FEE
    const qualificationFee = totalTaskCost * DEFAULT_TAX_RATES.QUALIFICATION_FEE

    // Create detailed breakdown
    const breakdown: PricingBreakdown[] = [
      {
        item: "Remuneração Base do Nômade",
        type: "cost",
        value: totalBaseRemuneration,
        description: `${totalHours}h × R$ ${specialty.hourlyRate}/h`,
      },
      {
        item: `Bônus Nível ${nomadLevel.charAt(0).toUpperCase() + nomadLevel.slice(1)}`,
        type: "cost",
        value: nomadBonus,
        percentage: nomadLevelMultipliers[nomadLevel] * 100,
        description: `${nomadLevelMultipliers[nomadLevel] * 100}% sobre remuneração base`,
      },
      {
        item: "Margem de Lucro Allka",
        type: "profit",
        value: priceWithMargin - totalTaskCost,
        percentage: task.profitMargin,
        description: "Margem de lucro da plataforma",
      },
      {
        item: "Taxa de Qualificação",
        type: "fee",
        value: qualificationFee,
        percentage: DEFAULT_TAX_RATES.QUALIFICATION_FEE * 100,
        description: "20% sobre custo da tarefa",
      },
      {
        item: "Comissão Parceiro",
        type: "fee",
        value: partnerCommission,
        percentage: DEFAULT_TAX_RATES.PARTNER_COMMISSION * 100,
        description: "5% sobre valor final",
      },
      {
        item: "Impostos",
        type: "tax",
        value: taxes,
        percentage: DEFAULT_TAX_RATES.TAXES * 100,
        description: "14% sobre valor final",
      },
      {
        item: "Taxa Operacional",
        type: "fee",
        value: operationalFee,
        percentage: DEFAULT_TAX_RATES.OPERATIONAL_FEE * 100,
        description: "5% sobre valor final",
      },
    ]

    return {
      baseHours: totalHours,
      hourlyRate: specialty.hourlyRate,
      baseCost: totalBaseRemuneration,
      nomadPayment: adjustedNomadRemuneration,
      qualificationFee,
      partnerCommission,
      taxes,
      operationalFee,
      allkaProfit: priceWithMargin - totalTaskCost,
      finalPrice,
      breakdown,
    }
  }

  calculateShowcasePrice(task: Task, specialty: Specialty): number {
    // Price displayed in showcase should be without variations, addons, in standard single condition
    const baseRemuneration = task.baseHours * specialty.hourlyRate
    const taskCost = baseRemuneration // No nomad level bonus for showcase
    const priceWithMargin = taskCost + taskCost * (task.profitMargin / 100)

    return priceWithMargin
  }

  private calculateAccountDiscount(
    accountType: AccountType,
    accountSubType: AccountSubType | null,
    creditPlan?: number,
  ): number {
    if (accountType === "agencias") {
      // Agency credit plan discounts
      if (creditPlan === 500) return 0.1 // 10%
      if (creditPlan === 1000) return 0.15 // 15%
      if (creditPlan === 1500) return 0.2 // 20%
      return 0
    }

    if (accountType === "empresas" && accountSubType === "company") {
      return 0.05 // 5% discount for company accounts
    }

    return 0
  }

  calculateNomadRemuneration(
    baseCost: number,
    nomadLevel: "bronze" | "silver" | "gold" | "platinum" | "leader",
  ): number {
    const multipliers = {
      bronze: 1.0,
      silver: 1.25,
      gold: 1.5,
      platinum: 1.0, // Fixed monthly value
      leader: 1.0, // Fixed monthly value + execution bonus
    }

    return baseCost * multipliers[nomadLevel]
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }
}

export const pricingEngine = PricingEngine.getInstance()
