import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const projectId = Number.parseInt(params.id)

    // TODO: Implement database query to get project configuration
    // For now, return a mock configuration
    const mockConfig = {
      id: 1,
      project_id: projectId,
      responsible_users: [],
      auto_save_attachments: false,
      file_categories: ["Documentos", "Imagens", "Contratos", "Relatórios"],
      vault_enabled: false,
      vault_permissions: [],
      payment_mode: "SQUAD",
      payment_config: {},
      auto_task_distribution: false,
      auto_approval_on_timeout: false,
      auto_approval_timeout_hours: 48,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    return NextResponse.json(mockConfig)
  } catch (error) {
    console.error("Error fetching project configuration:", error)
    return NextResponse.json({ error: "Failed to fetch project configuration" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const projectId = Number.parseInt(params.id)
    const configuration = await request.json()

    // TODO: Implement database update for project configuration
    console.log("Updating project configuration:", { projectId, configuration })

    return NextResponse.json({
      message: "Project configuration updated successfully",
      data: configuration,
    })
  } catch (error) {
    console.error("Error updating project configuration:", error)
    return NextResponse.json({ error: "Failed to update project configuration" }, { status: 500 })
  }
}
