import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    // In a real implementation, you would:
    // 1. Verify JWT token from cookie
    // 2. Query database for user data
    // 3. Return user information

    // For now, return mock data
    const mockUser = {
      id: 1,
      name: "Test User",
      email: "test@example.com",
      account_type: "empresas",
      account_sub_type: "company",
      role: "company_admin",
      is_admin: false,
      is_active: true,
      permissions: ["view_projects", "create_projects", "view_catalog"],
    }

    return NextResponse.json({ user: mockUser }, { status: 200 })
  } catch (error) {
    console.error("[v0] Get current user error:", error)
    return NextResponse.json({ message: "Não autenticado" }, { status: 401 })
  }
}
