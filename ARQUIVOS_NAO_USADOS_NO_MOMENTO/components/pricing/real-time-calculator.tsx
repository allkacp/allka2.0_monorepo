// @ts-nocheck
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useAccountType } from "@/contexts/account-type-context"
import { pricingEngine } from "@/lib/pricing-engine"
import type { Task, Specialty, TaskVariation, TaskAddon } from "@/types/pricing"

interface RealTimeCalculatorProps {
  task: Task
  specialty: Specialty
  selectedVariations?: TaskVariation[]
  selectedAddons?: TaskAddon[]
  quantity?: number
  isEmergency?: boolean
  isMonthly?: boolean
  specialties?: Specialty[]
  nomadLevel?: "bronze" | "silver" | "gold" | "platinum" | "leader"
}

export function RealTimeCalculator({
  task,
  specialty,
  selectedVariations = [],
  selectedAddons = [],
  quantity = 1,
  isEmergency = false,
  isMonthly = false,
  specialties = [],
  nomadLevel = "bronze",
}: RealTimeCalculatorProps) {
  const { accountType, accountSubType, creditPlan } = useAccountType()
  const [calculation, setCalculation] = useState<any>(null)

  useEffect(() => {
    const result = pricingEngine.calculateTaskPrice(task, specialty, selectedVariations, selectedAddons, specialties, {
      quantity,
      isEmergency,
      isMonthly,
      accountType,
      accountSubType,
      creditPlan,
      nomadLevel,
    })
    setCalculation(result)
  }, [
    task,
    specialty,
    selectedVariations,
    selectedAddons,
    quantity,
    isEmergency,
    isMonthly,
    accountType,
    accountSubType,
    creditPlan,
    nomadLevel,
    specialties,
  ])

  if (!calculation) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Cálculo Detalhado</span>
          <Badge variant="outline">Tempo Real</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Horas Totais:</span>
            <span>{calculation.baseHours}h</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Valor/Hora:</span>
            <span>{pricingEngine.formatCurrency(calculation.hourlyRate)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Remuneração do Nômade:</span>
            <span>{pricingEngine.formatCurrency(calculation.nomadPayment)}</span>
          </div>
        </div>

        <Separator />

        {/* Detailed Breakdown */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Detalhamento de Custos:</h4>
          {calculation.breakdown.map((item: any, index: number) => (
            <div key={index} className="flex justify-between text-xs">
              <span className="flex items-center gap-2">
                {item.item}
                {item.percentage && (
                  <Badge variant="secondary" className="text-xs">
                    {item.percentage}%
                  </Badge>
                )}
              </span>
              <span>{pricingEngine.formatCurrency(item.value)}</span>
            </div>
          ))}
        </div>

        <Separator />

        {/* Final Price */}
        <div className="flex justify-between text-lg font-bold">
          <span>Preço Final:</span>
          <span className="text-green-600">{pricingEngine.formatCurrency(calculation.finalPrice)}</span>
        </div>

        {/* Discounts Applied */}
        {(isEmergency || quantity > 1 || isMonthly || (accountType && accountSubType)) && (
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Ajustes aplicados:</p>
            {isEmergency && <p>• Acréscimo emergencial: +{task.emergencyMultiplier}%</p>}
            {quantity > 1 && <p>• Desconto quantidade: -{task.quantityDiscount}%</p>}
            {isMonthly && <p>• Desconto mensal: -{task.monthlyDiscount}%</p>}
            {accountType && accountSubType && <p>• Desconto tipo de conta aplicado</p>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
