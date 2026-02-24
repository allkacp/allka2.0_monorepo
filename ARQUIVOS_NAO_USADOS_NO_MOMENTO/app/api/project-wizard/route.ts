import { type NextRequest, NextResponse } from "next/server"

export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()

    // Return a mock stream response
    const mockResponse = {
      success: true,
      message: "Qual é o tipo de projeto que você gostaria de criar?",
      suggestions: ["Website", "App Mobile", "E-commerce", "Sistema Web"],
    }

    return NextResponse.json(mockResponse, { status: 200 })
  } catch (error) {
    console.error("Project wizard error:", error)
    return NextResponse.json(
      { error: "Failed to process wizard" },
      { status: 500 }
    )
  }
}
