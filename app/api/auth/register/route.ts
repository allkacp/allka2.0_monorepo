import { type NextRequest, NextResponse } from "next/server"
import type { UserRole } from "@/types/user"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password, account_type, account_sub_type, company_name, document, phone } = body

    // Validate required fields
    if (!name || !email || !password || !account_type) {
      return NextResponse.json({ message: "Campos obrigatórios faltando" }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ message: "Email inválido" }, { status: 400 })
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json({ message: "Senha deve ter pelo menos 6 caracteres" }, { status: 400 })
    }

    // Validate company name for empresas and agencias
    if ((account_type === "empresas" || account_type === "agencias") && !company_name) {
      return NextResponse.json({ message: "Nome da empresa/agência é obrigatório" }, { status: 400 })
    }

    // Determine user role based on account type
    let role: UserRole = "company_user"
    if (account_type === "empresas") {
      role = "company_admin" // First user is admin
    } else if (account_type === "agencias") {
      role = "agency_admin"
    } else if (account_type === "nomades") {
      role = "nomad"
    } else if (account_type === "admin") {
      role = "admin"
    }

    // In a real implementation, you would:
    // 1. Check if email already exists
    // 2. Hash the password
    // 3. Create user in database
    // 4. Create company/agency record if applicable
    // 5. Assign default permissions
    // 6. Send verification email

    // For now, simulate successful registration
    // Process registration

    // Simulate database operation
    const newUser = {
      id: Math.floor(Math.random() * 10000),
      name,
      email,
      account_type,
      account_sub_type,
      role,
      is_admin: account_type === "admin",
      is_active: true,
      created_at: new Date().toISOString(),
    }

    return NextResponse.json(
      {
        message: "Conta criada com sucesso",
        user: newUser,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("[v0] Registration error:", error)
    return NextResponse.json({ message: "Erro ao criar conta" }, { status: 500 })
  }
}
