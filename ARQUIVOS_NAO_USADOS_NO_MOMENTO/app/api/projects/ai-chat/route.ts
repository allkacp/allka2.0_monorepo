import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { messages, projectData } = await request.json()

    // Return a simple mock response to avoid AI SDK compatibility issues
    const response = {
      message: "Entendi! Vou ajudar você a estruturar melhor esse projeto. Poderia me contar mais sobre os objetivos principais?",
      projectData: projectData || {},
      suggestions: [
        {
          id: "1",
          name: "Suggestion 1",
          description: "Description of suggestion 1",
          price: 100,
          reason: "Reason for suggestion 1",
          selected: false,
        },
        {
          id: "2",
          name: "Suggestion 2",
          description: "Description of suggestion 2",
          price: 200,
          reason: "Reason for suggestion 2",
          selected: false,
        },
      ],
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error("AI Chat error:", error)
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    )
  }
}
