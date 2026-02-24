
import { useState, useEffect } from "react"
import { MyAccountTabs } from "@/components/account/my-account-tabs"
import { useAccountType } from "@/contexts/account-type-context"
import type { Company, User } from "@/types/user"

// Mock data - replace with actual API calls
const mockCompany: Company = {
  id: 1,
  name: "TechCorp Solutions",
  email: "contato@techcorp.com",
  phone: "(11) 99999-9999",
  document: "12.345.678/0001-90",
  account_type: "independent",
  is_active: true,
  last_project_date: "2024-01-15",
  ai_knowledge_base: {
    id: 1,
    company_id: 1,
    summary:
      "TechCorp Solutions é uma empresa de tecnologia focada em soluções digitais inovadoras. Possui histórico de projetos em desenvolvimento web, aplicativos móveis e consultoria em transformação digital. Valoriza entregas rápidas e comunicação transparente.",
    briefing_history: [
      {
        id: 1,
        project_name: "App Mobile E-commerce",
        brief_summary: "Desenvolvimento de aplicativo mobile para vendas online com integração de pagamentos",
        key_requirements: ["React Native", "Pagamentos", "Push Notifications"],
        date: "2024-01-15",
      },
      {
        id: 2,
        project_name: "Website Institucional",
        brief_summary: "Criação de website responsivo com foco em conversão",
        key_requirements: ["Design Responsivo", "SEO", "Analytics"],
        date: "2023-12-10",
      },
    ],
    contracting_patterns: [
      {
        service_type: "Desenvolvimento Web",
        frequency: 5,
        average_budget: 25000,
        preferred_timeline: "30-45 dias",
      },
      {
        service_type: "Design UI/UX",
        frequency: 3,
        average_budget: 15000,
        preferred_timeline: "15-20 dias",
      },
    ],
    guidelines: [
      {
        category: "Comunicação",
        description: "Prefere reuniões semanais e relatórios detalhados",
        importance: "high",
      },
      {
        category: "Tecnologia",
        description: "Foco em tecnologias modernas e escaláveis",
        importance: "high",
      },
    ],
    last_updated: "2024-01-20",
    auto_generated: true,
  },
  created_at: "2023-06-15",
  updated_at: "2024-01-20",
  users: [
    {
      id: 1,
      email: "admin@techcorp.com",
      name: "Carlos Silva",
      account_type: "empresas",
      account_sub_type: "in-house",
      company_id: 1,
      role: "company_admin",
      permissions: [],
      is_admin: true,
      is_active: true,
      created_at: "2023-06-15",
      updated_at: "2024-01-20",
    },
    {
      id: 2,
      email: "user@techcorp.com",
      name: "Ana Santos",
      account_type: "empresas",
      account_sub_type: "in-house",
      company_id: 1,
      role: "company_user",
      permissions: [],
      is_admin: false,
      is_active: true,
      created_at: "2023-07-01",
      updated_at: "2024-01-15",
    },
  ],
  projects: [
    {
      id: 1,
      name: "App Mobile E-commerce",
      description: "Desenvolvimento de aplicativo mobile para vendas online",
      company_id: 1,
      status: "active",
      start_date: "2024-01-15",
      created_at: "2024-01-15",
      updated_at: "2024-01-20",
    },
    {
      id: 2,
      name: "Website Institucional",
      description: "Criação de website responsivo",
      company_id: 1,
      status: "completed",
      start_date: "2023-12-01",
      end_date: "2023-12-30",
      created_at: "2023-12-01",
      updated_at: "2023-12-30",
    },
  ],
}

const mockCurrentUser: User = {
  id: 1,
  email: "admin@techcorp.com",
  name: "Carlos Silva",
  account_type: "empresas",
  account_sub_type: "in-house",
  company_id: 1,
  role: "company_admin",
  permissions: [],
  is_admin: true,
  is_active: true,
  created_at: "2023-06-15",
  updated_at: "2024-01-20",
}

export default function AccountPage() {
  const { accountType } = useAccountType()
  const [company, setCompany] = useState<Company | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setCompany(mockCompany)
      setCurrentUser(mockCurrentUser)
      setLoading(false)
    }, 1000)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!company || !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Erro ao carregar dados da conta.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <MyAccountTabs company={company} currentUser={currentUser} />
    </div>
  )
}
