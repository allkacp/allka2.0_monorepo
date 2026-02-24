import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { id } = params

    // TODO: Add authentication check to ensure admin access
    // TODO: Add validation for the update data

    // Simulated database update
    await new Promise(resolve => setTimeout(resolve, 800))

    // Merge all provided fields with the ID - include ALL fields from payload
    const updatedData = {
      id: body.id || id,
      name: body.name,
      email: body.email,
      role: body.role,
      status: body.status,
      account_type: body.account_type,
      phone: body.phone,
      is_active: body.is_active ?? true,
      social_name: body.social_name ?? undefined,
      birth_date: body.birth_date ?? undefined,
      gender: body.gender ?? undefined,
      cpf: body.cpf ?? undefined,
      rg: body.rg ?? undefined,
      phone_secondary: body.phone_secondary ?? undefined,
      whatsapp: body.whatsapp ?? undefined,
      zip_code: body.zip_code ?? undefined,
      street: body.street ?? undefined,
      number: body.number ?? undefined,
      complement: body.complement ?? undefined,
      neighborhood: body.neighborhood ?? undefined,
      city: body.city ?? undefined,
      state: body.state ?? undefined,
      country: body.country ?? undefined,
      admin_notes: body.admin_notes ?? undefined,
      internal_notes: body.internal_notes ?? undefined,
      card_last_digits: body.card_last_digits ?? undefined,
      card_holder: body.card_holder ?? undefined,
      card_expiry: body.card_expiry ?? undefined,
      pix_key: body.pix_key ?? undefined,
      bank_name: body.bank_name ?? undefined,
      agency_number: body.agency_number ?? undefined,
      account_number: body.account_number ?? undefined,
      wallet_balance: body.wallet_balance ?? undefined,
      wallet_status: body.wallet_status ?? undefined,
      financial_document: body.financial_document ?? undefined,
      financial_holder: body.financial_holder ?? undefined,
      person_type: body.person_type ?? undefined,
      tax_regime: body.tax_regime ?? undefined,
      financial_notes: body.financial_notes ?? undefined,
      permissions: body.permissions ?? undefined,
      updated_at: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      message: 'Usuário atualizado com sucesso',
      data: updatedData
    })
  } catch (error) {
    console.error('[API] PATCH Error updating user:', error)
    return NextResponse.json(
      { success: false, message: 'Erro ao atualizar usuário' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { id } = params
    const { action } = body

    // TODO: Add authentication check

    if (action === 'reset-password') {
      // Use cryptographically secure token generation
      const token = randomUUID()
      const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/auth/reset-password?token=${token}`

      return NextResponse.json({
        success: true,
        message: 'Token de recuperação gerado',
        token,
        resetUrl,
        expiresIn: 3600
      })
    }

    if (action === 'send-reset-email') {
      await new Promise(resolve => setTimeout(resolve, 1000))

      return NextResponse.json({
        success: true,
        message: 'Email de recuperação enviado com sucesso'
      })
    }

    return NextResponse.json(
      { success: false, message: 'Ação não reconhecida' },
      { status: 400 }
    )
  } catch (error) {
    console.error('[API] POST Error processing user action:', error)
    return NextResponse.json(
      { success: false, message: 'Erro ao processar ação' },
      { status: 500 }
    )
  }
}
