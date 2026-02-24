import { NextResponse } from "next/server"
import { z } from "zod"

const TacticalPlanSchema = z.object({
  tasks: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      estimated_hours: z.number(),
      priority: z.enum(["low", "medium", "high", "urgent"]),
      dependencies: z.array(z.string()),
      deliverables: z.array(z.string()),
      requirements: z.record(z.any()),
      suggested_nomad_profile: z.string().optional(),
      ai_generated: z.boolean(),
      status: z.enum(["draft", "approved", "rejected", "needs_review"]),
      order: z.number(),
    }),
  ),
  total_estimated_hours: z.number(),
  total_estimated_cost: z.number(),
  timeline_days: z.number(),
  ai_analysis: z.object({
    complexity_score: z.number(),
    risk_factors: z.array(z.string()),
    recommendations: z.array(z.string()),
    optimal_team_size: z.number(),
  }),
})

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { project_data, chat_context } = await request.json()

    // Return mock tactical plan
    const mockPlan = {
      tasks: [
        {
          id: "1",
          title: "Planejamento e Kickoff",
          description: "Reunião de kickoff com o cliente e equipe",
          estimated_hours: 4,
          priority: "high" as const,
          dependencies: [],
          deliverables: ["Ata de reunião", "Cronograma aprovado"],
          requirements: {},
          ai_generated: false,
          status: "draft" as const,
          order: 1,
        },
        {
          id: "2",
          title: "Desenvolvimento",
          description: "Desenvolvimento do projeto",
          estimated_hours: 40,
          priority: "high" as const,
          dependencies: ["1"],
          deliverables: ["Código", "Testes"],
          requirements: {},
          ai_generated: false,
          status: "draft" as const,
          order: 2,
        },
      ],
      total_estimated_hours: 44,
      total_estimated_cost: project_data?.budget || 5000,
      timeline_days: 15,
      ai_analysis: {
        complexity_score: 6.5,
        risk_factors: ["Dependências externas", "Timeline apertado"],
        recommendations: ["Aumentar equipe", "Comunicação semanal"],
        optimal_team_size: 3,
      },
    }

    const tacticalPlan = {
      id: `plan-${Date.now()}`,
      project_id: params.id,
      project_name: project_data.name,
      ...mockPlan,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    return NextResponse.json(tacticalPlan, { status: 200 })
  } catch (error) {
    console.error("Tactical plan generation error:", error)
    return NextResponse.json(
      { error: "Failed to generate tactical plan" },
      { status: 500 }
    )
  }
}
