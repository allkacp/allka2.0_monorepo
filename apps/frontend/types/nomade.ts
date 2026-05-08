export interface Nomade {
  id: string
  name: string
  email: string
  whatsapp: string
  avatar?: string
  level: "bronze" | "silver" | "gold" | "platinum" | "diamond" | "leader"
  status: "ativo" | "inativo" | "aguardando_aprovacao" | "reprovado" | "pausado"
  score: number
  tasksCompleted: {
    quarter: number
    total: number
  }
  areasOfInterest: string[]
  registrationDate: string
  lastAccess: string
  termsAccepted: boolean
  performance: {
    averageRating: number
    onTimeDelivery: number
    rejectionRate: number
  }
  qualifications: Qualification[]
  wallet: NomadeWallet
  minimumMonthlyGoal?: number
  leaderId?: string
  isLeader: boolean
  leaderData?: LeaderData
}

export interface Qualification {
  id: string
  category: string
  task: string
  status: "habilitado" | "pausado" | "teste_pendente" | "reprovado"
  certificationDate?: string
  pausedDate?: string
  testRequired: boolean
}

export interface NomadeWallet {
  availableBalance: number
  unavailableBalance: number
  transactions: WalletTransaction[]
  bankAccount?: BankAccount
}

export interface WalletTransaction {
  id: string
  type: "credit" | "debit" | "bonus" | "penalty" | "withdrawal"
  amount: number
  description: string
  date: string
  receipt?: string
  justification?: string
}

export interface BankAccount {
  bank: string
  agency: string
  account: string
  accountType: "corrente" | "poupanca"
  cnpj: string
}

export interface LeaderData {
  category: string
  monthlyFixedSalary: number
  commissionPercentage: number
  managedNomades: string[]
  qualificationResponsibilities: string[]
}

export interface TestTask {
  id: string
  category: string
  title: string
  description: string
  learningCircuit: LearningContent[]
  template?: any
  checklist: QualificationChecklist[]
  status: "draft" | "active" | "archived"
}

export interface LearningContent {
  type: "text" | "image" | "video" | "document"
  title: string
  content: string
  url?: string
  duration?: number
}

export interface QualificationChecklist {
  id: string
  criterion: string
  weight: number
  required: boolean
}

export interface AvailabilityWidget {
  category: string
  activeNomades: number
  tasksLast30Days: number
  availableHours: number
  status: "green" | "yellow" | "red"
  needsMoreProfessionals: boolean
}

export interface NomadeLevel {
  name: string
  criteria: {
    tasksRequired?: number
    periodDays?: number
    minimumRating?: number
    weeklyHours?: number
    inviteOnly?: boolean
  }
  benefits: {
    salaryIncrease?: number
    monthlyGuarantee?: boolean
    specialAccess?: string[]
    managementRoles?: boolean
  }
  description: string
}
