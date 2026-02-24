import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SpecialtyManager } from "@/components/pricing/specialty-manager"
import { PricingCalculator } from "@/components/pricing/pricing-calculator"

export default function PricingPage() {
  return (
    <div className="container mx-auto py-6">
      <Tabs defaultValue="calculator" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="calculator">Calculadora de Preços</TabsTrigger>
          <TabsTrigger value="specialties">Gestão de Especialidades</TabsTrigger>
        </TabsList>

        <TabsContent value="calculator">
          <PricingCalculator />
        </TabsContent>

        <TabsContent value="specialties">
          <SpecialtyManager />
        </TabsContent>
      </Tabs>
    </div>
  )
}
