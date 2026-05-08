"use client"

import { useState } from "react"

export type CommissionApplyOn = "final_value" | "value_without_fees_taxes" | "value_without_taxes" | "specialist_value"

export type ProductCategory = "all" | "design" | "development" | "marketing" | "consulting" | "video" | "content"

export type PricingComponent = {
  id: string
  name: string
  type: "commission" | "fee" | "tax" | "margin"
  value: number
  valueType: "percentage" | "fixed"
  appliesTo: string[]
  description: string
  isActive: boolean
  applyOn?: CommissionApplyOn // Apenas para comissões
  productCategories?: ProductCategory[] // Para margem de lucro por tipo de produto
}

// Default pricing components — managed locally until a dedicated pricing API exists
const defaultComponents: PricingComponent[] = [
  { id: "1", name: "Comissão Agência", type: "commission", value: 15, valueType: "percentage", appliesTo: ["Iniciante", "Júnior"], description: "Comissão padrão para níveis iniciantes", isActive: true, applyOn: "final_value" },
  { id: "2", name: "Comissão Nômade", type: "commission", value: 5, valueType: "percentage", appliesTo: ["Nível 1", "Nível 2"], description: "Comissão para nômades sobre valor do especialista", isActive: true, applyOn: "specialist_value" },
  { id: "3", name: "Taxa de uso da plataforma", type: "fee", value: 10, valueType: "percentage", appliesTo: ["Iniciante"], description: "Taxa para manutenção e uso da plataforma", isActive: true },
  { id: "4", name: "Taxa fixa por projeto", type: "fee", value: 50, valueType: "fixed", appliesTo: ["Iniciante"], description: "Taxa fixa cobrada por projeto iniciado", isActive: true },
  { id: "5", name: "Taxa de processamento", type: "fee", value: 1.10, valueType: "fixed", appliesTo: ["Iniciante", "Júnior", "Pleno", "Sênior"], description: "Taxa fixa de processamento por venda", isActive: true },
  { id: "6", name: "Margem Padrão", type: "margin", value: 30, valueType: "percentage", appliesTo: ["Iniciante", "Júnior", "Pleno", "Sênior"], description: "Margem de lucro padrão aplicada a todos os produtos", isActive: true, productCategories: ["all"] },
  { id: "7", name: "Margem Design Premium", type: "margin", value: 40, valueType: "percentage", appliesTo: ["Pleno", "Sênior"], description: "Margem diferenciada para produtos de design premium", isActive: true, productCategories: ["design"] },
]

export function usePricing() {
  const [pricingComponents, setPricingComponents] = useState<PricingComponent[]>(defaultComponents)

  const addComponent = (component: PricingComponent) => {
    setPricingComponents((prev) => [...prev, component])
  }

  const updateComponent = (id: string, updatedComponent: PricingComponent) => {
    setPricingComponents((prev) => prev.map((comp) => (comp.id === id ? updatedComponent : comp)))
  }

  const deleteComponent = (id: string) => {
    setPricingComponents((prev) => prev.filter((comp) => comp.id !== id))
  }

  const getActiveComponents = () => {
    return pricingComponents.filter((comp) => comp.isActive)
  }

  const getComponentsByType = (type: "commission" | "fee" | "tax") => {
    return pricingComponents.filter((comp) => comp.type === type)
  }

  return {
    pricingComponents,
    addComponent,
    updateComponent,
    deleteComponent,
    getActiveComponents,
    getComponentsByType,
  }
}
