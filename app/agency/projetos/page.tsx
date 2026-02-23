// @ts-nocheck
import { AgencyProjects } from "@/components/agency/agency-projects"
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
  stats: {
    total_projects: 45,
    active_projects: 8,
    mrr: 12500,
    led_agencies: 5,
    led_agencies_mrr: 8750,
  },
}

export default function AgencyProjetosPage() {
  console.log("[v0] AgencyProjetosPage rendered")

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-950 dark:via-blue-950/20 dark:to-purple-950/10">
      <div className="container mx-auto pt-6 px-6">
        <AgencyProjects agency={mockAgency} />
      </div>
    </div>
  )
}
