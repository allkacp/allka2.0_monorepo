import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json({ message: "Email e senha são obrigatórios" }, { status: 400 })
    }

    // In a real implementation, you would:
    // 1. Query database for user by email
    // 2. Verify password hash
    // 3. Generate JWT token
    // 4. Set secure HTTP-only cookie
    // 5. Return user data

    // For now, simulate successful login with mock data
    // Process login

    // Mock user data based on email pattern
    let mockUser
    if (email.includes("admin")) {
      mockUser = {
        id: 1,
        name: "Admin User",
        email,
        account_type: "admin",
        account_sub_type: null,
        role: "admin",
        is_admin: true,
        is_active: true,
        permissions: [
          "view_projects",
          "create_projects",
          "edit_projects",
          "cancel_projects",
          "view_catalog",
          "purchase_services",
          "manage_users",
          "view_payments",
          "manage_payments",
          "approve_deliveries",
          "access_ai_knowledge",
          "edit_ai_knowledge",
          "view_analytics",
          "admin_access",
        ],
      }
    } else if (email.includes("agency") || email.includes("agencia")) {
      mockUser = {
        id: 2,
        name: "Agency User",
        email,
        account_type: "agencias",
        account_sub_type: null,
        role: "agency_admin",
        is_admin: false,
        is_active: true,
        permissions: [
          "view_projects",
          "create_projects",
          "edit_projects",
          "view_catalog",
          "purchase_services",
          "manage_users",
          "view_payments",
          "approve_deliveries",
          "access_ai_knowledge",
          "view_analytics",
        ],
      }
    } else if (email.includes("nomad") || email.includes("nomade")) {
      mockUser = {
        id: 3,
        name: "Nomad User",
        email,
        account_type: "nomades",
        account_sub_type: null,
        role: "nomad",
        is_admin: false,
        is_active: true,
        permissions: ["view_projects", "view_analytics"],
      }
    } else if (email.includes("inhouse") || email.includes("in-house")) {
      mockUser = {
        id: 4,
        name: "In-House User",
        email,
        account_type: "empresas",
        account_sub_type: "in-house",
        role: "company_admin",
        is_admin: false,
        is_active: true,
        permissions: [
          "view_projects",
          "create_projects",
          "edit_projects",
          "view_catalog",
          "purchase_services",
          "manage_users",
          "view_payments",
          "approve_deliveries",
          "access_ai_knowledge",
          "view_analytics",
        ],
      }
    } else {
      mockUser = {
        id: 5,
        name: "Company User",
        email,
        account_type: "empresas",
        account_sub_type: "company",
        role: "company_admin",
        is_admin: false,
        is_active: true,
        permissions: [
          "view_projects",
          "create_projects",
          "view_catalog",
          "view_payments",
          "approve_deliveries",
          "access_ai_knowledge",
          "view_analytics",
        ],
      }
    }

    return NextResponse.json(
      {
        message: "Login realizado com sucesso",
        user: mockUser,
        token: "mock-jwt-token-" + Date.now(),
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("[v0] Login error:", error)
    return NextResponse.json({ message: "Erro ao fazer login" }, { status: 500 })
  }
}
