import { AgencyProfile } from "@/components/agency/agency-profile"
import type { Agency } from "@/types/agency"

// Mock data - replace with actual API calls
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
  files: [
    {
      id: 1,
      agency_id: 1,
      name: "Apresentação Comercial 2024.pdf",
      type: "presentation",
      file_url: "/files/apresentacao.pdf",
      file_size: 2048000,
      uploaded_at: "2024-01-15T10:00:00Z",
      uploaded_by: 1,
      can_delete: true,
    },
  ],
  stats: {
    total_projects: 45,
    active_projects: 8,
    mrr: 12500,
    led_agencies: 5,
    led_agencies_mrr: 8750,
  },
}

export default function AgencyDashboardPage() {
  console.log("[v0] AgencyDashboardPage rendered")

  const handleUpdateAgency = (data: Partial<Agency>) => {
    console.log("[v0] Update agency:", data)
  }

  const handlePromoteToPartner = () => {
    console.log("[v0] Promote to partner")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-950 dark:via-blue-950/20 dark:to-purple-950/10">
      <div className="container mx-auto py-8 px-4">
        <AgencyProfile agency={mockAgency} onUpdate={handleUpdateAgency} onPromoteToPartner={handlePromoteToPartner} />
      </div>
    </div>
  )
}
