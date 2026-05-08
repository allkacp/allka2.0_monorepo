// Default tax rates based on business requirements
export const DEFAULT_TAX_RATES = {
  PARTNER_COMMISSION: 0.05, // 5% sobre valor final do projeto
  QUALIFICATION_FEE: 0.2, // 20% sobre custo base da tarefa (remuneração do nômade)
  TAXES: 0.14, // 14% sobre valor final do projeto
  OPERATIONAL_FEE: 0.05, // 5% sobre valor final do projeto
} as const

export type TaxRateKeys = keyof typeof DEFAULT_TAX_RATES
