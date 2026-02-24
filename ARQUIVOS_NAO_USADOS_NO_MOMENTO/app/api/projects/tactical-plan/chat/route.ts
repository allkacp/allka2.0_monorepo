export async function POST(request: Request) {
  try {
    const { messages } = await request.json()

    // Mock response for tactical planning chat
    const response = {
      role: "assistant",
      content: "Entendido! Vou analisar os produtos e criar um plano tático detalhado. Para começar, poderia me detalhar os objetivos principais do projeto e o prazo disponível?"
    }

    return Response.json(response)
  } catch (error) {
    console.error("Chat error:", error)
    return Response.json({ error: "Failed to process chat message" }, { status: 500 })
  }
}
