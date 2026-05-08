"use client"

import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from "react"

export interface PricingComponent {
  id: string
  name: string
  type: "commission" | "fee" | "tax"
  value: number
  valueType: "percentage" | "fixed"
  appliesTo: string[]
  description: string
  isActive: boolean
}

interface PricingContextType {
  pricingComponents: PricingComponent[]
  addComponent: (component: PricingComponent) => void
  updateComponent: (id: string, component: PricingComponent) => void
  deleteComponent: (id: string) => void
  getActiveComponents: (type?: string) => PricingComponent[]
  getTotalRate: (type: string, level?: string) => number
  isLoading: boolean
}

const PricingContext = createContext<PricingContextType | undefined>(undefined)

const DEFAULT_PRICING_COMPONENTS: PricingComponent[] = [
  {
    id: "1",
    name: "Comissão Agência",
    type: "commission",
    value: 15,
    valueType: "percentage",
    appliesTo: ["Iniciante", "Júnior", "Pleno", "Sênior"],
    description: "Comissão padrão para agências",
    isActive: true,
  },
  {
    id: "2",
    name: "Comissão Líder",
    type: "commission",
    value: 5,
    valueType: "percentage",
    appliesTo: ["Pleno", "Sênior"],
    description: "Comissão adicional para líderes de projeto",
    isActive: true,
  },
  {
    id: "3",
    name: "Taxa de Plataforma",
    type: "fee",
    value: 10,
    valueType: "percentage",
    appliesTo: ["Iniciante", "Júnior", "Pleno", "Sênior"],
    description: "Taxa de uso da plataforma",
    isActive: true,
  },
  {
    id: "4",
    name: "Taxa de Processamento",
    type: "fee",
    value: 50,
    valueType: "fixed",
    appliesTo: ["Iniciante", "Júnior", "Pleno", "Sênior"],
    description: "Taxa fixa por transação",
    isActive: true,
  },
  {
    id: "5",
    name: "ISS",
    type: "tax",
    value: 5,
    valueType: "percentage",
    appliesTo: ["Iniciante", "Júnior", "Pleno", "Sênior"],
    description: "Imposto sobre Serviços",
    isActive: true,
  },
  {
    id: "6",
    name: "IRRF",
    type: "tax",
    value: 1.5,
    valueType: "percentage",
    appliesTo: ["Iniciante", "Júnior", "Pleno", "Sênior"],
    description: "Imposto de Renda Retido na Fonte",
    isActive: true,
  },
]

export function PricingProvider({ children }: { children: ReactNode }) {
  const [pricingComponents, setPricingComponents] = useState<PricingComponent[]>(DEFAULT_PRICING_COMPONENTS)
  const [isLoading, setIsLoading] = useState(true)
  const [isHydrated, setIsHydrated] = useState(false)

  // Hydration - Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("allka-pricing-components")
    if (stored) {
      try {
        setPricingComponents(JSON.parse(stored))
      } catch (e) {
        setPricingComponents(DEFAULT_PRICING_COMPONENTS)
      }
    }
    setIsHydrated(true)
    setIsLoading(false)
  }, [])

  // Save to localStorage whenever components change (debounced)
  useEffect(() => {
    if (isHydrated && pricingComponents.length > 0) {
      localStorage.setItem("allka-pricing-components", JSON.stringify(pricingComponents))
    }
  }, [pricingComponents, isHydrated])

  const addComponent = useCallback((component: PricingComponent) => {
    setPricingComponents((prev) => [...prev, component])
  }, [])

  const updateComponent = useCallback((id: string, component: PricingComponent) => {
    setPricingComponents((prev) => prev.map((c) => (c.id === id ? component : c)))
  }, [])

  const deleteComponent = useCallback((id: string) => {
    setPricingComponents((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const getActiveComponents = useCallback(
    (type?: string) => {
      return pricingComponents.filter((c) => c.isActive && (!type || c.type === type))
    },
    [pricingComponents]
  )

  const getTotalRate = useCallback(
    (type: string, level?: string): number => {
      return pricingComponents
        .filter((c) => c.isActive && c.type === type && c.valueType === "percentage")
        .filter((c) => !level || c.appliesTo.includes(level))
        .reduce((sum, c) => sum + c.value, 0)
    },
    [pricingComponents]
  )

  const value = useMemo(
    () => ({
      pricingComponents,
      addComponent,
      updateComponent,
      deleteComponent,
      getActiveComponents,
      getTotalRate,
      isLoading,
    }),
    [pricingComponents, addComponent, updateComponent, deleteComponent, getActiveComponents, getTotalRate, isLoading]
  )

  return <PricingContext.Provider value={value}>{children}</PricingContext.Provider>
}

export function usePricing() {
  const context = useContext(PricingContext)
  if (context === undefined) {
    throw new Error("usePricing must be used within a PricingProvider")
  }
  return context
}
