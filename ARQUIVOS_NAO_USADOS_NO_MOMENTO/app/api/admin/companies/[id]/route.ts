import { NextRequest, NextResponse } from "next/server"

type CompanyStatus = "active" | "inactive" | "pending"

interface UpdateCompanyPayload {
  name?: string
  legal_name?: string
  email?: string
  phone?: string
  phone_secondary?: string
  whatsapp?: string
  website?: string
  ie?: string
  zip_code?: string
  street?: string
  number?: string
  complement?: string
  neighborhood?: string
  city?: string
  state?: string
  country?: string
  pix_key?: string
  pix_type?: string
  bank_name?: string
  bank_agency?: string
  bank_account?: string
  bank_account_type?: string
  admin_notes?: string
  internal_notes?: string
  status?: CompanyStatus
}

// Mock database storage (in production this would be a real database)
const mockCompanies: Map<string, any> = new Map()

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const companyId = params.id
    const body: UpdateCompanyPayload = await request.json()

    console.log("[Internal] PUT /api/admin/companies/{id}:", companyId)

    // Validate required fields
    if (!body.email || !body.phone) {
      return NextResponse.json(
        {
          success: false,
          message: "Email and phone are required",
        },
        { status: 400 }
      )
    }

    // Validate status if provided
    if (body.status && !["active", "inactive", "pending"].includes(body.status)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid status value",
        },
        { status: 400 }
      )
    }

    // In a real application, update the database here
    // For now, we'll just log and return success
    // Update company in database

    // Store in mock database
    mockCompanies.set(companyId, {
      id: parseInt(companyId),
      ...body,
      updated_at: new Date().toISOString(),
    })

    return NextResponse.json(
      {
        success: true,
        message: "Company updated successfully",
        data: {
          id: companyId,
          ...body,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("[Internal] Error updating company:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update company",
      },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const companyId = params.id
    const company = mockCompanies.get(companyId)

    if (!company) {
      return NextResponse.json(
        {
          success: false,
          message: "Company not found",
        },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        data: company,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("[v0-api] Error fetching company:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch company",
      },
      { status: 500 }
    )
  }
}
