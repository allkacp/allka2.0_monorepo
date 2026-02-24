
import { PageHeader } from "@/components/page-header"
import { AgencyProfile } from "@/components/agency/agency-profile"
import type { Agency } from "@/types/agency"

// Mock data
const mockAgency: Agency = {
  id: 1,
  name: "Creative Digital Agency",
  cnpj: "12.345.678/0001-90",
  email: "contato@creativedigital.com",
  phone: "(11) 99999-9999",
  address: {
    street: "Rua das Flores",
    number: "123",
    complement: "Sala 45",
    neighborhood: "Vila Madalena",
    city: "São Paulo",
    state: "SP",
    zipCode: "05435-040",
  },
  status: "active",
  partner_level: "premium",
  is_partner: true,
  created_at: "2024-01-15T10:00:00Z",
  approved_at: "2024-01-20T14:30:00Z",
  wallet: {
    available_balance: 15750.5,
    pending_balance: 3200.0,
    total_earned: 45890.75,
  },
  bank_account: {
    bank_name: "Banco do Brasil",
    agency: "1234-5",
    account: "12345-6",
    account_type: "checking",
    cnpj: "12.345.678/0001-90",
  },
  files: [],
  stats: {
    total_projects: 45,
    active_projects: 8,
    mrr: 12500,
    led_agencies: 5,
    led_agencies_mrr: 8750,
  },
}

export default function AgenciasPerfilPage() {
  const handleUpdateAgency = (data: Partial<Agency>) => {
    console.log("[v0] Update agency:", data)
  }

  const handlePromoteToPartner = () => {
    console.log("[v0] Promote to partner")
  }

  return (
    <div className="min-h-screen bg-slate-200 px-0 py-0">
      <div className="max-w-7xl mx-auto bg-slate-200 px-0 py-0 space-y-6">
        <div className="px-0">
          <PageHeader title="Perfil da Agência" description="Gerencie as informações e configurações da sua agência" />
        </div>

        <div className="px-0">
          <AgencyProfile
            agency={mockAgency}
            onUpdate={handleUpdateAgency}
            onPromoteToPartner={handlePromoteToPartner}
          />
        </div>
      </div>
    </div>
  )
}
