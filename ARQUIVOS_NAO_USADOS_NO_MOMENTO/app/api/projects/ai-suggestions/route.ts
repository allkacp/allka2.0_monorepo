import { type NextRequest, NextResponse } from "next/server"

const mockProducts = [
  {
    id: "1",
    name: "Landing Page Profissional",
    shortDescription: "Página de conversão otimizada",
    basePrice: 2500,
    complexity: "intermediate" as const,
  },
  {
    id: "2",
    name: "E-commerce Completo",
    shortDescription: "Loja virtual com pagamentos",
    basePrice: 8500,
    complexity: "advanced" as const,
  },
  {
    id: "3",
    name: "Sistema de Gestão",
    shortDescription: "Dashboard administrativo",
    basePrice: 12000,
    complexity: "premium" as const,
  },
]

export async function POST(request: NextRequest) {
  try {
    const { description, goals, industry, target_audience, budget } = await request.json()

    // Return mock suggestions based on simple heuristics
    const suggestedProducts = mockProducts.slice(0, 2).map((product) => ({
      ...product,
      reason: `Ideal para ${industry || "seu projeto"} com foco em ${goals?.[0] || "conversão"}`,
      confidence: 0.85,
    }))

    return NextResponse.json({ object: suggestedProducts }, { status: 200 })
  } catch (error) {
    console.error("AI Suggestions error:", error)
    return NextResponse.json(
      { error: "Failed to generate suggestions" },
      { status: 500 }
    )
  }
}
