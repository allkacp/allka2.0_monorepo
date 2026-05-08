import type { AccountType, AccountSubType } from "@/contexts/account-type-context"

export function calculateDiscount(
  accountType: AccountType,
  accountSubType: AccountSubType | null,
  creditPlan?: number,
): number {
  if (accountType === "agencias") {
    // Agency credit plan discounts (keyed by monthly price)
    if (creditPlan === 300)  return 0     // Lite   — ativa conta agency, sem desconto
    if (creditPlan === 500)  return 0.05  // Start  — 5%
    if (creditPlan === 1000) return 0.1   // Standard — 10%
    if (creditPlan === 1500) return 0.15  // Growth — 15%
    if (creditPlan === 3000) return 0.2   // Scale  — 20%
    if (creditPlan === 5000) return 0.2   // Squad  — 20%
    return 0 // No discount without credit plan
  }

  if (accountType === "empresas" && accountSubType === "company") {
    return 0.05 // 5% discount for company accounts
  }

  return 0 // No discount for other account types
}

export function calculatePrice(
  basePrice: number,
  accountType: AccountType,
  accountSubType: AccountSubType | null,
  creditPlan?: number,
): number {
  const discount = calculateDiscount(accountType, accountSubType, creditPlan)
  return basePrice * (1 - discount)
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(price)
}
