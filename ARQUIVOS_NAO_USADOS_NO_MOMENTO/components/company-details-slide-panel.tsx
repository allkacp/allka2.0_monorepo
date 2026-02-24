// @ts-nocheck
import { useState } from "react"
import {
  X,
  Building2,
  Mail,
  Users,
  Briefcase,
  Calendar,
  FileText,
  Crown,
  Wallet,
  Plus,
  Minus,
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  Receipt,
  Settings,
  Landmark,
  Check,
  Star,
  MoreVertical,
  Edit,
  Trash2,
  UserPlus,
  Search,
  Filter,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import { Card } from "@/components/ui/card" // Added Card component
import { Progress } from "@/components/ui/progress" // Added Progress component
import { useSidebar } from "@/contexts/sidebar-context"

type CompanyType = "company" | "agency" | "nomad"
type CompanyStatus = "active" | "inactive" | "pending"

interface Company {
  id: number
  name: string
  type: CompanyType
  email: string
  phone: string
  document: string
  location: string
  account_type?: "independent" | "premium"
  partner_level?: "basic" | "premium" | "enterprise"
  status: CompanyStatus
  users_count: number
  users_online: number
  projects_count: number
  created_at: string
}

interface CompanyDetailsSlidePanelProps {
  open: boolean
  onClose: () => void
  company: Company | null
  onEdit: () => void
}

interface Transaction {
  id: string
  type: "credit" | "debit" | "withdrawal" | "deposit"
  amount: number
  description: string
  date: string
  status: "completed" | "pending" | "cancelled"
  reference?: string
}

interface BankAccount {
  id: string
  bankName: string
  accountType: "checking" | "savings"
  accountNumber: string
  branch: string
  holderName: string
  document: string
  isDefault: boolean
}

export function CompanyDetailsSlidePanel({ open, onClose, company, onEdit }: CompanyDetailsSlidePanelProps) {
  const { sidebarWidth } = useSidebar()
  const [isExiting, setIsExiting] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")

  const [walletBalance, setWalletBalance] = useState(15000.0)
  const [showAddFunds, setShowAddFunds] = useState(false)
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [addAmount, setAddAmount] = useState("")
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [transactionFilter, setTransactionFilter] = useState("all")
  const [searchTransaction, setSearchTransaction] = useState("")

  const [searchUsers, setSearchUsers] = useState("")
  const [filterUserRole, setFilterUserRole] = useState("all")
  const [users, setUsers] = useState([
    {
      id: 1,
      name: "João Silva",
      email: "joao@empresa.com",
      role: "master",
      status: "active",
      lastAccess: "2025-01-08 14:30",
      avatar: "",
    },
    {
      id: 2,
      name: "Maria Santos",
      email: "maria@empresa.com",
      role: "admin",
      status: "active",
      lastAccess: "2025-01-08 12:15",
      avatar: "",
    },
    {
      id: 3,
      name: "Pedro Costa",
      email: "pedro@empresa.com",
      role: "member",
      status: "active",
      lastAccess: "2025-01-07 18:45",
      avatar: "",
    },
    {
      id: 4,
      name: "Ana Oliveira",
      email: "ana@empresa.com",
      role: "member",
      status: "inactive",
      lastAccess: "2025-01-05 10:20",
      avatar: "",
    },
  ])

  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: "TX001",
      type: "credit",
      amount: 5000,
      description: "Recarga de créditos",
      date: "2025-01-05",
      status: "completed",
      reference: "PAY-001",
    },
    {
      id: "TX002",
      type: "debit",
      amount: 1200,
      description: "Pagamento projeto #432",
      date: "2025-01-04",
      status: "completed",
      reference: "PROJ-432",
    },
    {
      id: "TX003",
      type: "withdrawal",
      amount: 3000,
      description: "Solicitação de saque",
      date: "2025-01-03",
      status: "pending",
      reference: "WD-003",
    },
    {
      id: "TX004",
      type: "deposit",
      amount: 8000,
      description: "Depósito via PIX",
      date: "2025-01-02",
      status: "completed",
      reference: "PIX-004",
    },
    {
      id: "TX005",
      type: "debit",
      amount: 850,
      description: "Pagamento nômade - Design UI",
      date: "2025-01-01",
      status: "completed",
      reference: "NOM-112",
    },
  ])

  const [creditCards, setCreditCards] = useState([
    {
      id: "CC001",
      brand: "Visa",
      lastFour: "4532",
      expiryDate: "12/2027",
      holderName: "EMPRESA EXEMPLO LTDA",
      isDefault: true,
    },
    {
      id: "CC002",
      brand: "Mastercard",
      lastFour: "5412",
      expiryDate: "09/2026",
      holderName: "EMPRESA EXEMPLO LTDA",
      isDefault: false,
    },
  ])

  const [bankAccounts, setBankAccounts] = useState([
    {
      id: "BA001",
      bankName: "Banco do Brasil",
      accountType: "checking",
      accountNumber: "12345-6",
      branch: "0001",
      holderName: "Empresa Exemplo LTDA",
      document: "12.345.678/0001-90",
      isDefault: true,
    },
    {
      id: "BA002",
      bankName: "Itaú",
      accountType: "savings",
      accountNumber: "98765-4",
      branch: "1234",
      holderName: "Empresa Exemplo LTDA",
      document: "12.345.678/0001-90",
      isDefault: false,
    },
  ])

  const [paymentPreferences, setPaymentPreferences] = useState({
    autoWithdraw: false,
    withdrawDay: "5",
    minBalance: "1000",
    emailNotifications: true,
    smsNotifications: false,
  })

  const [showAddCard, setShowAddCard] = useState(false)
  const [showAddAccount, setShowAddAccount] = useState(false)

  const [showProjectParticipantsModal, setShowProjectParticipantsModal] = useState(false)
  const [selectedProject, setSelectedProject] = useState<any>(null)

  const handleClose = () => {
    setIsExiting(true)
    setTimeout(() => {
      setIsExiting(false)
      onClose()
    }, 500)
  }

  const handleAddFunds = () => {
    const amount = Number.parseFloat(addAmount)
    if (amount > 0) {
      const newTransaction = {
        id: `TX${String(transactions.length + 1).padStart(3, "0")}`,
        type: "credit",
        amount: amount,
        description: "Adição manual de créditos",
        date: new Date().toISOString().split("T")[0],
        status: "completed",
        reference: `ADD-${Date.now()}`,
      }
      setTransactions([newTransaction, ...transactions])
      setWalletBalance(walletBalance + amount)
      setAddAmount("")
      setShowAddFunds(false)
    }
  }

  const handleWithdraw = () => {
    const amount = Number.parseFloat(withdrawAmount)
    if (amount > 0 && amount <= walletBalance) {
      const newTransaction = {
        id: `TX${String(transactions.length + 1).padStart(3, "0")}`,
        type: "withdrawal",
        amount: amount,
        description: "Solicitação de saque",
        date: new Date().toISOString().split("T")[0],
        status: "pending",
        reference: `WD-${Date.now()}`,
      }
      setTransactions([newTransaction, ...transactions])
      setWithdrawAmount("")
      setShowWithdraw(false)
    }
  }

  const exportStatement = () => {
    const statement = {
      company: company?.name,
      balance: walletBalance,
      transactions: filteredTransactions,
      exportDate: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(statement, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `extrato-${company?.name}-${new Date().toISOString().split("T")[0]}.json`
    a.click()
  }

  const downloadReceipt = (transaction: any) => {
    const receipt = {
      transaction,
      company: company?.name,
      document: company?.document,
      date: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(receipt, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `comprovante-${transaction.id}.json`
    a.click()
  }

  const filteredTransactions = transactions.filter((t) => {
    const matchesFilter = transactionFilter === "all" || t.type === transactionFilter
    const matchesSearch =
      t.description.toLowerCase().includes(searchTransaction.toLowerCase()) ||
      t.reference?.toLowerCase().includes(searchTransaction.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchUsers.toLowerCase()) ||
      user.email.toLowerCase().includes(searchUsers.toLowerCase())
    const matchesRole = filterUserRole === "all" || user.role === filterUserRole
    return matchesSearch && matchesRole
  })

  const setDefaultCard = (id: string) => {
    setCreditCards(creditCards.map((card) => ({ ...card, isDefault: card.id === id })))
  }

  const deleteCard = (id: string) => {
    setCreditCards(creditCards.filter((card) => card.id !== id))
  }

  const setDefaultAccount = (id: string) => {
    setBankAccounts(bankAccounts.map((acc) => ({ ...acc, isDefault: acc.id === id })))
  }

  const deleteAccount = (id: string) => {
    setBankAccounts(bankAccounts.filter((acc) => acc.id !== id))
  }

  const getCardBrandColor = (brand: string) => {
    switch (brand.toLowerCase()) {
      case "visa":
        return "from-blue-600 to-blue-700"
      case "mastercard":
        return "from-red-600 to-orange-600"
      case "amex":
        return "from-teal-600 to-blue-600"
      default:
        return "from-gray-600 to-gray-700"
    }
  }

  // Added helper functions for user roles
  const getRoleLabel = (role: string) => {
    switch (role) {
      case "master":
        return "Master"
      case "admin":
        return "Admin"
      case "member":
        return "Membro"
      default:
        return role
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "master":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
      case "admin":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
      case "member":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
    }
  }

  if (!open && !isExiting) return null
  if (!company) return null

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "company":
        return "Company"
      case "agency":
        return "Agency"
      case "nomad":
        return "Nomad"
      default:
        return type
    }
  }

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case "company":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
      case "agency":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
      case "nomad":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
      case "inactive":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    })
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "credit":
        return <ArrowDownLeft className="h-4 w-4 text-green-600" />
      case "debit":
        return <ArrowUpRight className="h-4 w-4 text-red-600" />
      case "withdrawal":
        return <TrendingDown className="h-4 w-4 text-orange-600" />
      case "deposit":
        return <TrendingUp className="h-4 w-4 text-blue-600" />
      default:
        return <DollarSign className="h-4 w-4" />
    }
  }

  const getTransactionColor = (type: string) => {
    switch (type) {
      case "credit":
      case "deposit":
        return "text-green-600"
      case "debit":
      case "withdrawal":
        return "text-red-600"
      default:
        return "text-gray-600"
    }
  }

  const projects = [
    {
      id: 1,
      name: "Website Redesign",
      status: "Em andamento",
      progress: 65,
      startDate: "2025-01-01",
      endDate: "2025-03-01",
      responsible: { id: 1, name: "João Silva", email: "joao@empresa.com" },
      participants: [
        { id: 2, name: "Maria Santos", email: "maria@empresa.com" },
        { id: 3, name: "Pedro Costa", email: "pedro@empresa.com" },
      ],
    },
    {
      id: 2,
      name: "App Mobile",
      status: "Planejamento",
      progress: 20,
      startDate: "2025-02-01",
      endDate: "2025-06-01",
      responsible: { id: 2, name: "Maria Santos", email: "maria@empresa.com" },
      participants: [{ id: 1, name: "João Silva", email: "joao@empresa.com" }],
    },
  ]

  return (
    <>
      <div
        style={{ width: `calc(100% - ${sidebarWidth}px)` }}
        className={`fixed right-0 top-0 h-full bg-background shadow-2xl z-50 flex flex-col transition-all duration-500 ease-out border-l ${
          isExiting ? "translate-x-full" : "translate-x-0 delay-100"
        }`}
      >
        <div className="app-brand-header shrink-0">
          <div className="p-4 flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              <Avatar className="h-12 w-12 ring-2 ring-white/20">
                <AvatarFallback className="bg-white/20 backdrop-blur-sm text-white text-sm font-bold">
                  {company.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-white text-balance">{company.name}</h2>
                <p className="text-xs text-white/80 mt-0.5">Detalhes da Empresa</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs bg-white/20 text-white border-0">
                    {getTypeLabel(company.type)}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className={`text-xs border-0 ${
                      company.status === "active"
                        ? "bg-green-500/20 text-green-100"
                        : company.status === "inactive"
                          ? "bg-red-500/20 text-red-100"
                          : "bg-yellow-500/20 text-yellow-100"
                    }`}
                  >
                    {company.status === "active" ? "Ativo" : company.status === "inactive" ? "Inativo" : "Pendente"}
                  </Badge>
                  {company.account_type === "premium" && (
                    <Badge variant="secondary" className="text-xs bg-amber-500/20 text-amber-100 border-0">
                      <Crown className="h-2.5 w-2.5 mr-0.5" />
                      Premium
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                onClick={onEdit}
                size="sm"
                className="h-9 px-4 bg-white text-blue-600 hover:bg-white/90 font-medium"
              >
                <Edit className="h-3.5 w-3.5 mr-1.5" />
                Editar
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="shrink-0 h-9 w-9 text-white hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="border-b px-4 shrink-0 bg-gradient-to-r from-slate-50 to-slate-100 relative overflow-hidden">
            <TabsList className="bg-transparent h-auto p-0 w-full justify-start gap-1 relative z-10">
              <TabsTrigger
                value="overview"
                className="relative h-10 px-4 text-xs font-semibold transition-all duration-300
                  data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:via-purple-600 data-[state=active]:to-blue-600
                  data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/50
                  data-[state=inactive]:bg-slate-200 data-[state=inactive]:text-slate-600 data-[state=inactive]:hover:bg-slate-300
                  rounded-t-lg border-t-2 border-x-2 border-transparent
                  data-[state=active]:border-blue-400 data-[state=active]:border-b-0
                  data-[state=inactive]:border-slate-300
                  transform data-[state=active]:scale-105 data-[state=active]:-translate-y-0.5
                  skew-x-[-10deg] data-[state=active]:skew-x-[-8deg]"
              >
                <span className="skew-x-[10deg] data-[state=active]:skew-x-[8deg] flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" />
                  Visão Geral
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="users"
                className="relative h-10 px-4 text-xs font-semibold transition-all duration-300
                  data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:via-purple-600 data-[state=active]:to-blue-600
                  data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/50
                  data-[state=inactive]:bg-slate-200 data-[state=inactive]:text-slate-600 data-[state=inactive]:hover:bg-slate-300
                  rounded-t-lg border-t-2 border-x-2 border-transparent
                  data-[state=active]:border-blue-400 data-[state=active]:border-b-0
                  data-[state=inactive]:border-slate-300
                  transform data-[state=active]:scale-105 data-[state=active]:-translate-y-0.5
                  skew-x-[-10deg] data-[state=active]:skew-x-[-8deg]"
              >
                <span className="skew-x-[10deg] data-[state=active]:skew-x-[8deg] flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  Usuários
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="wallet"
                className="relative h-10 px-4 text-xs font-semibold transition-all duration-300
                  data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:via-purple-600 data-[state=active]:to-blue-600
                  data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/50
                  data-[state=inactive]:bg-slate-200 data-[state=inactive]:text-slate-600 data-[state=inactive]:hover:bg-slate-300
                  rounded-t-lg border-t-2 border-x-2 border-transparent
                  data-[state=active]:border-blue-400 data-[state=active]:border-b-0
                  data-[state=inactive]:border-slate-300
                  transform data-[state=active]:scale-105 data-[state=active]:-translate-y-0.5
                  skew-x-[-10deg] data-[state=active]:skew-x-[-8deg]"
              >
                <span className="skew-x-[10deg] data-[state=active]:skew-x-[8deg] flex items-center gap-1.5">
                  <Wallet className="h-3.5 w-3.5" />
                  Carteira
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="cards"
                className="relative h-10 px-4 text-xs font-semibold transition-all duration-300
                  data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:via-purple-600 data-[state=active]:to-blue-600
                  data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/50
                  data-[state=inactive]:bg-slate-200 data-[state=inactive]:text-slate-600 data-[state=inactive]:hover:bg-slate-300
                  rounded-t-lg border-t-2 border-x-2 border-transparent
                  data-[state=active]:border-blue-400 data-[state=active]:border-b-0
                  data-[state=inactive]:border-slate-300
                  transform data-[state=active]:scale-105 data-[state=active]:-translate-y-0.5
                  skew-x-[-10deg] data-[state=active]:skew-x-[-8deg]"
              >
                <span className="skew-x-[10deg] data-[state=active]:skew-x-[8deg] flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" />
                  Cartões
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="plans"
                className="relative h-10 px-4 text-xs font-semibold transition-all duration-300
                  data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:via-purple-600 data-[state=active]:to-blue-600
                  data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/50
                  data-[state=inactive]:bg-slate-200 data-[state=inactive]:text-slate-600 data-[state=inactive]:hover:bg-slate-300
                  rounded-t-lg border-t-2 border-x-2 border-transparent
                  data-[state=active]:border-blue-400 data-[state=active]:border-b-0
                  data-[state=inactive]:border-slate-300
                  transform data-[state=active]:scale-105 data-[state=active]:-translate-y-0.5
                  skew-x-[-10deg] data-[state=active]:skew-x-[-8deg]"
              >
                <span className="skew-x-[10deg] data-[state=active]:skew-x-[8deg] flex items-center gap-1.5">
                  <Crown className="h-3.5 w-3.5" />
                  Planos
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="preferences"
                className="relative h-10 px-4 text-xs font-semibold transition-all duration-300
                  data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:via-purple-600 data-[state=active]:to-blue-600
                  data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/50
                  data-[state=inactive]:bg-slate-200 data-[state=inactive]:text-slate-600 data-[state=inactive]:hover:bg-slate-300
                  rounded-t-lg border-t-2 border-x-2 border-transparent
                  data-[state=active]:border-blue-400 data-[state=active]:border-b-0
                  data-[state=inactive]:border-slate-300
                  transform data-[state=active]:scale-105 data-[state=active]:-translate-y-0.5
                  skew-x-[-10deg] data-[state=active]:skew-x-[-8deg]"
              >
                <span className="skew-x-[10deg] data-[state=active]:skew-x-[8deg] flex items-center gap-1.5">
                  <Settings className="h-3.5 w-3.5" />
                  Preferências
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="banking"
                className="relative h-10 px-4 text-xs font-semibold transition-all duration-300
                  data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:via-purple-600 data-[state=active]:to-blue-600
                  data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/50
                  data-[state=inactive]:bg-slate-200 data-[state=inactive]:text-slate-600 data-[state=inactive]:hover:bg-slate-300
                  rounded-t-lg border-t-2 border-x-2 border-transparent
                  data-[state=active]:border-blue-400 data-[state=active]:border-b-0
                  data-[state=inactive]:border-slate-300
                  transform data-[state=active]:scale-105 data-[state=active]:-translate-y-0.5
                  skew-x-[-10deg] data-[state=active]:skew-x-[-8deg]"
              >
                <span className="skew-x-[10deg] data-[state=active]:skew-x-[8deg] flex items-center gap-1.5">
                  <Landmark className="h-3.5 w-3.5" />
                  Dados Bancários
                </span>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-hidden bg-muted/20">
            <ScrollArea className="h-full">
              <TabsContent value="overview" className="p-6 space-y-4 mt-0">
                <div className="grid grid-cols-4 gap-3">
                  <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 border-blue-200 dark:border-blue-800">
                    <div className="flex items-center space-x-2 mb-2">
                      <Users className="h-4 w-4 text-blue-600" />
                      <span className="text-xs font-medium text-muted-foreground">Usuários</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">{company.users_count}</p>
                    <div className="flex items-center space-x-1 mt-1">
                      <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-xs text-green-600 dark:text-green-400">{company.users_online} online</span>
                    </div>
                  </Card>

                  <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/30 border-purple-200 dark:border-purple-800">
                    <div className="flex items-center space-x-2 mb-2">
                      <Briefcase className="h-4 w-4 text-purple-600" />
                      <span className="text-xs font-medium text-muted-foreground">Projetos</span>
                    </div>
                    <p className="text-2xl font-bold text-purple-600">{company.projects_count}</p>
                    <span className="text-xs text-muted-foreground">Total ativos</span>
                  </Card>

                  <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/30 border-green-200 dark:border-green-800">
                    <div className="flex items-center space-x-2 mb-2">
                      <Wallet className="h-4 w-4 text-green-600" />
                      <span className="text-xs font-medium text-muted-foreground">Saldo</span>
                    </div>
                    <p className="text-2xl font-bold text-green-600">
                      {walletBalance.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </p>
                    <span className="text-xs text-muted-foreground">Carteira</span>
                  </Card>

                  <Card className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/30 border-amber-200 dark:border-amber-800">
                    <div className="flex items-center space-x-2 mb-2">
                      <Calendar className="h-4 w-4 text-amber-600" />
                      <span className="text-xs font-medium text-muted-foreground">Cadastro</span>
                    </div>
                    <p className="text-sm font-bold text-amber-600">
                      {new Date(company.created_at).toLocaleDateString("pt-BR")}
                    </p>
                    <span className="text-xs text-muted-foreground capitalize">{company.account_type || "Padrão"}</span>
                  </Card>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-4">
                    <h3 className="font-semibold text-sm flex items-center space-x-2 mb-3">
                      <Mail className="h-4 w-4 text-blue-600" />
                      <span>Informações de Contato</span>
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p className="text-sm font-medium">{company.email}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Telefone</p>
                        <p className="text-sm font-medium">{company.phone}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Localização</p>
                        <p className="text-sm font-medium">{company.location}</p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4">
                    <h3 className="font-semibold text-sm flex items-center space-x-2 mb-3">
                      <FileText className="h-4 w-4 text-purple-600" />
                      <span>Informações Legais</span>
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Documento (CNPJ)</p>
                        <p className="text-sm font-medium">{company.document}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Nível de Parceria</p>
                        <p className="text-sm font-medium capitalize">{company.partner_level || "Nenhum"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Tipo de Conta</p>
                        <p className="text-sm font-medium capitalize">{company.account_type || "Independente"}</p>
                      </div>
                    </div>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="users" className="p-6 space-y-4 mt-0">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 flex-1">
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar usuários..."
                        value={searchUsers}
                        onChange={(e) => setSearchUsers(e.target.value)}
                        className="pl-9 h-9 text-sm"
                      />
                    </div>
                    <Select value={filterUserRole} onValueChange={setFilterUserRole}>
                      <SelectTrigger className="w-[140px] h-9 text-sm">
                        <Filter className="h-3.5 w-3.5 mr-1.5" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="master">Master</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="member">Membro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-3">
                  {filteredUsers.map((user) => (
                    <Card key={user.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-sm font-semibold">
                              {user.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold">{user.name}</p>
                              {user.role === "master" && (
                                <Crown className="h-3.5 w-3.5 text-amber-500" title="Usuário Master" />
                              )}
                              <Badge variant="outline" className={`${getRoleBadgeColor(user.role)} text-xs`}>
                                {getRoleLabel(user.role)}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={`text-xs ${
                                  user.status === "active"
                                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                    : "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
                                }`}
                              >
                                {user.status === "active" ? "Ativo" : "Inativo"}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Último acesso: {user.lastAccess}</p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="wallet" className="p-6 space-y-3 m-0">
                <div className="bg-gradient-to-br from-green-600 to-emerald-600 p-4 rounded-xl text-white shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-1.5">
                      <Wallet className="h-4 w-4" />
                      <span className="text-xs font-medium opacity-90">Saldo Disponível</span>
                    </div>
                    <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={exportStatement}>
                      <Download className="h-3 w-3 mr-1" />
                      Extrato
                    </Button>
                  </div>
                  <p className="text-3xl font-bold mb-4">
                    R$ {walletBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="flex-1 h-8 text-xs"
                      onClick={() => setShowAddFunds(true)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Adicionar
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="flex-1 h-8 text-xs"
                      onClick={() => setShowWithdraw(true)}
                    >
                      <Minus className="h-3 w-3 mr-1" />
                      Sacar
                    </Button>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <div className="flex-1">
                    <Input
                      placeholder="Buscar transação..."
                      value={searchTransaction}
                      onChange={(e) => setSearchTransaction(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <Select value={transactionFilter} onValueChange={setTransactionFilter}>
                    <SelectTrigger className="w-[120px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="credit">Crédito</SelectItem>
                      <SelectItem value="debit">Débito</SelectItem>
                      <SelectItem value="withdrawal">Saque</SelectItem>
                      <SelectItem value="deposit">Depósito</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  {filteredTransactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-2 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center space-x-2 flex-1">
                        <div className="p-1.5 rounded-lg bg-accent">{getTransactionIcon(transaction.type)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{transaction.description}</p>
                          <div className="flex items-center space-x-1.5">
                            <span className="text-xs text-muted-foreground">{transaction.date}</span>
                            {transaction.reference && (
                              <>
                                <span className="text-xs text-muted-foreground">•</span>
                                <span className="text-xs text-muted-foreground font-mono">{transaction.reference}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="text-right">
                          <p className={`text-sm font-bold ${getTransactionColor(transaction.type)}`}>
                            {transaction.type === "credit" || transaction.type === "deposit" ? "+" : "-"} R${" "}
                            {transaction.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </p>
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              transaction.status === "completed"
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                : transaction.status === "pending"
                                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                                  : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                            }`}
                          >
                            {transaction.status === "completed"
                              ? "Concluído"
                              : transaction.status === "pending"
                                ? "Pendente"
                                : "Cancelado"}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => downloadReceipt(transaction)}
                        >
                          <Receipt className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="cards" className="p-6 space-y-3 m-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">Cartões Cadastrados</h3>
                  <Button size="sm" className="h-8 text-xs" onClick={() => setShowAddCard(true)}>
                    <Plus className="h-3 w-3 mr-1" />
                    Adicionar Cartão
                  </Button>
                </div>

                <div className="space-y-2">
                  {creditCards.map((card) => (
                    <div
                      key={card.id}
                      className={`relative p-4 rounded-xl bg-gradient-to-br ${getCardBrandColor(card.brand)} text-white shadow-md overflow-hidden`}
                    >
                      {card.isDefault && (
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-white/20 text-white backdrop-blur-sm border-white/30">
                            <Star className="h-2.5 w-2.5 mr-0.5 fill-white" />
                            Padrão
                          </Badge>
                        </div>
                      )}
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Building2 className="h-5 w-5" />
                          <span className="font-bold text-lg">{card.brand}</span>
                        </div>
                        <div className="font-mono text-xl tracking-widest">•••• •••• •••• {card.lastFour}</div>
                        <div className="flex items-center justify-between text-xs">
                          <div>
                            <p className="opacity-70 text-xs">Titular</p>
                            <p className="font-medium">{card.holderName}</p>
                          </div>
                          <div>
                            <p className="opacity-70 text-xs">Validade</p>
                            <p className="font-medium">{card.expiryDate}</p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-white hover:bg-white/20">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {!card.isDefault && (
                                <DropdownMenuItem onClick={() => setDefaultCard(card.id)}>
                                  <Check className="h-3 w-3 mr-2" />
                                  Definir como padrão
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => deleteCard(card.id)} className="text-red-600">
                                <Trash2 className="h-3 w-3 mr-2" />
                                Remover
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="preferences" className="p-6 space-y-4 m-0">
                <div>
                  <h3 className="font-semibold text-sm mb-3">Preferências de Pagamento</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                      <div className="flex-1">
                        <Label htmlFor="auto-withdraw" className="text-sm font-medium">
                          Saque Automático
                        </Label>
                        <p className="text-xs text-muted-foreground">Realizar saques automáticos mensalmente</p>
                      </div>
                      <Switch
                        id="auto-withdraw"
                        checked={paymentPreferences.autoWithdraw}
                        onCheckedChange={(checked) =>
                          setPaymentPreferences({ ...paymentPreferences, autoWithdraw: checked })
                        }
                      />
                    </div>

                    {paymentPreferences.autoWithdraw && (
                      <div className="pl-4 space-y-2">
                        <div>
                          <Label htmlFor="withdraw-day" className="text-xs">
                            Dia do Saque
                          </Label>
                          <Select
                            value={paymentPreferences.withdrawDay}
                            onValueChange={(value) =>
                              setPaymentPreferences({ ...paymentPreferences, withdrawDay: value })
                            }
                          >
                            <SelectTrigger id="withdraw-day" className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                                <SelectItem key={day} value={String(day)}>
                                  Dia {day}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="min-balance" className="text-xs">
                            Saldo Mínimo (R$)
                          </Label>
                          <Input
                            id="min-balance"
                            type="number"
                            value={paymentPreferences.minBalance}
                            onChange={(e) =>
                              setPaymentPreferences({ ...paymentPreferences, minBalance: e.target.value })
                            }
                            className="h-8 text-xs"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Saque só será feito se o saldo for maior que este valor
                          </p>
                        </div>
                      </div>
                    )}

                    <Separator />

                    <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                      <div className="flex-1">
                        <Label htmlFor="email-notifications" className="text-sm font-medium">
                          Notificações por Email
                        </Label>
                        <p className="text-xs text-muted-foreground">Receber notificações de transações por email</p>
                      </div>
                      <Switch
                        id="email-notifications"
                        checked={paymentPreferences.emailNotifications}
                        onCheckedChange={(checked) =>
                          setPaymentPreferences({ ...paymentPreferences, emailNotifications: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                      <div className="flex-1">
                        <Label htmlFor="sms-notifications" className="text-sm font-medium">
                          Notificações por SMS
                        </Label>
                        <p className="text-xs text-muted-foreground">Receber notificações de transações por SMS</p>
                      </div>
                      <Switch
                        id="sms-notifications"
                        checked={paymentPreferences.smsNotifications}
                        onCheckedChange={(checked) =>
                          setPaymentPreferences({ ...paymentPreferences, smsNotifications: checked })
                        }
                      />
                    </div>
                  </div>
                </div>

                <Button size="sm" className="w-full">
                  Salvar Preferências
                </Button>
              </TabsContent>

              <TabsContent value="banking" className="p-6 space-y-3 m-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">Dados Bancários para Recebimento</h3>
                  <Button size="sm" className="h-8 text-xs" onClick={() => setShowAddAccount(true)}>
                    <Plus className="h-3 w-3 mr-1" />
                    Adicionar Conta
                  </Button>
                </div>

                <div className="space-y-2">
                  {bankAccounts.map((account) => (
                    <div
                      key={account.id}
                      className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                            <Landmark className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{account.bankName}</p>
                            <p className="text-xs text-muted-foreground">
                              {account.accountType === "checking" ? "Conta Corrente" : "Conta Poupança"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          {account.isDefault && (
                            <Badge
                              variant="outline"
                              className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs"
                            >
                              <Star className="h-2.5 w-2.5 mr-0.5 fill-current" />
                              Padrão
                            </Badge>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {!account.isDefault && (
                                <DropdownMenuItem onClick={() => setDefaultAccount(account.id)}>
                                  <Check className="h-3 w-3 mr-2" />
                                  Definir como padrão
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => deleteAccount(account.id)} className="text-red-600">
                                <Trash2 className="h-3 w-3 mr-2" />
                                Remover
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">Agência</p>
                          <p className="font-mono font-medium">{account.branch}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Conta</p>
                          <p className="font-mono font-medium">{account.accountNumber}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Titular</p>
                          <p className="font-medium">{account.holderName}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">CNPJ</p>
                          <p className="font-mono font-medium">{account.document}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* Plans Tab */}
              <TabsContent value="plans" className="p-6 space-y-6 m-0">
                {/* Credit Plan Section */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full bg-blue-600"></span>
                    Plano de Crédito
                  </h3>
{(() => {
                      const planMap: Record<string, { name: string; credits: number }> = {
                        starter: { name: "Starter", credits: 100 },
                        growth:  { name: "Growth",  credits: 500 },
                        enterprise: { name: "Enterprise", credits: 1000 },
                        basic: { name: "Starter", credits: 100 },
                        pro:   { name: "Growth",  credits: 500 },
                        gold:  { name: "Starter", credits: 100 },
                        silver: { name: "Starter", credits: 100 },
                        platinum: { name: "Enterprise", credits: 1000 },
                      }
                      const plan = planMap[(company.partner_level || "").toLowerCase()] || { name: company.partner_level || "Não definido", credits: 0 }
                      const used = 32
                      const available = plan.credits
                      const usedCredits = Math.round(available * used / 100)
                      const remaining = available - usedCredits
                      return (
                    <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 border-blue-200 dark:border-blue-800">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Plano Atual</p>
                        <p className="text-xl font-bold text-blue-600">{plan.name}</p>
                      </div>
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs">
                        <Check className="h-2.5 w-2.5 mr-1" />
                        Ativo
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Créditos Disponíveis</p>
                        <p className="text-lg font-bold text-blue-600">{available.toLocaleString("pt-BR")}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Créditos Utilizados</p>
                        <p className="text-lg font-bold text-orange-600">{usedCredits.toLocaleString("pt-BR")}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Créditos Restantes</p>
                        <p className="text-lg font-bold text-green-600">{remaining.toLocaleString("pt-BR")}</p>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-muted-foreground">Uso do Plano</span>
                        <span className="text-xs font-semibold text-blue-600">{used}%</span>
                      </div>
                      <Progress value={used} className="h-2" />
                    </div>
                  </Card>
                      )
                    })()}
                </div>

                {/* Account Type Section */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full bg-purple-600"></span>
                    Tipo de Conta
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {["Company Dependente", "Company Independente", "Agency", "Partner"].map((type) => {
                      const isSelected = company.type === "company" && company.account_type === "independent" 
                        ? type === "Company Independente"
                        : company.type === "company" && company.account_type !== "independent"
                        ? type === "Company Dependente"
                        : company.type === "agency"
                        ? type === "Agency"
                        : company.type === "nomad"
                        ? type === "Partner"
                        : false

                      return (
                        <Card
                          key={type}
                          className={`p-3 cursor-pointer transition-all border-2 ${
                            isSelected
                              ? "border-blue-600 bg-blue-50 dark:bg-blue-950/30"
                              : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-semibold">{type}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {type === "Company Dependente" && "Empresa vinculada a outra entidade"}
                                {type === "Company Independente" && "Empresa operacional independente"}
                                {type === "Agency" && "Agência de serviços"}
                                {type === "Partner" && "Parceiro da plataforma"}
                              </p>
                            </div>
                            {isSelected && (
                              <Check className="h-4 w-4 text-blue-600 flex-shrink-0" />
                            )}
                          </div>
                        </Card>
                      )
                    })}
                  </div>
                </div>
              </TabsContent>
            </ScrollArea>
          </div>
        </Tabs>

        <div className="border-t p-3 bg-muted/30 shrink-0">
          <div className="flex justify-end space-x-2">
            <Button variant="outline" size="sm" className="h-8 text-xs bg-transparent" onClick={handleClose}>
              Fechar
            </Button>
            <Button size="sm" className="h-8 text-xs" onClick={onEdit}>
              <Edit className="h-3 w-3 mr-1" />
              Editar Empresa
            </Button>
          </div>
        </div>
      </div>

      {showProjectParticipantsModal && selectedProject && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="p-6 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold">Gerenciar Acesso - {selectedProject.name}</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowProjectParticipantsModal(false)
                  setSelectedProject(null)
                }}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              {/* Responsible */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold flex items-center gap-1">
                  <Crown className="h-3.5 w-3.5 text-amber-600" />
                  Responsável
                </Label>
                <Card className="p-3 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-600 text-white text-xs">
                          {selectedProject.responsible.name
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{selectedProject.responsible.name}</p>
                        <p className="text-xs text-muted-foreground">{selectedProject.responsible.email}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="h-7 px-2 text-xs bg-transparent">
                      Alterar
                    </Button>
                  </div>
                </Card>
              </div>

              {/* Participants */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-blue-600" />
                    Participantes ({selectedProject.participants.length})
                  </Label>
                  <Button variant="outline" size="sm" className="h-7 px-2 text-xs bg-transparent">
                    <UserPlus className="h-3 w-3 mr-1" />
                    Adicionar
                  </Button>
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {selectedProject.participants.map((participant: any) => (
                    <Card key={participant.id} className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
                              {participant.name
                                .split(" ")
                                .map((n: string) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{participant.name}</p>
                            <p className="text-xs text-muted-foreground">{participant.email}</p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50 bg-transparent"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  onClick={() => {
                    setShowProjectParticipantsModal(false)
                    setSelectedProject(null)
                  }}
                  size="sm"
                  className="h-9 px-4"
                >
                  Concluir
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      <Dialog open={showAddFunds} onOpenChange={setShowAddFunds}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Fundos</DialogTitle>
            <DialogDescription>Adicione créditos à carteira da empresa.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor (R$)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={addAmount}
                onChange={(e) => setAddAmount(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddFunds(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddFunds}>Adicionar Fundos</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showWithdraw} onOpenChange={setShowWithdraw}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar Saque</DialogTitle>
            <DialogDescription>Crie uma solicitação de saque para a empresa.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="withdraw-amount">Valor (R$)</Label>
              <Input
                id="withdraw-amount"
                type="number"
                placeholder="0.00"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Saldo disponível: R$ {walletBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWithdraw(false)}>
              Cancelar
            </Button>
            <Button onClick={handleWithdraw}>Solicitar Saque</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddCard} onOpenChange={setShowAddCard}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Cartão de Crédito</DialogTitle>
            <DialogDescription>Preencha os dados do novo cartão de crédito.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">{/* Add form fields for new credit card here */}</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCard(false)}>
              Cancelar
            </Button>
            <Button>Adicionar Cartão</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddAccount} onOpenChange={setShowAddAccount}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Conta Bancária</DialogTitle>
            <DialogDescription>Preencha os dados da nova conta bancária.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">{/* Add form fields for new bank account here */}</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddAccount(false)}>
              Cancelar
            </Button>
            <Button>Adicionar Conta</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Moved projects rendering here */}
      <div className="p-3 space-y-3 m-0">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-base">Projetos</h3>
          {/* Add button to create new project if needed */}
        </div>

        <div className="grid gap-3">
          {projects.map((project) => (
            <Card key={project.id} className="p-3 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-semibold">{project.name}</h4>
                    <Badge
                      variant="secondary"
                      className={`text-xs ${
                        project.status === "Em andamento"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-900/30"
                      }`}
                    >
                      {project.status}
                    </Badge>
                  </div>

                  <div className="space-y-1 mb-2">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Crown className="h-3 w-3 text-amber-600" />
                      <span className="font-medium">Responsável:</span>
                      <span>{project.responsible.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="h-3 w-3 text-blue-600" />
                      <span className="font-medium">Participantes:</span>
                      <span>{project.participants.length}</span>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => {
                          setSelectedProject(project)
                          setShowProjectParticipantsModal(true)
                        }}
                        className="h-auto p-0 text-xs text-blue-600 hover:text-blue-700"
                      >
                        Ver todos
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {new Date(project.startDate).toLocaleDateString("pt-BR")} -{" "}
                      {new Date(project.endDate).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Progresso</span>
                  <span className="font-medium">{project.progress}%</span>
                </div>
                <Progress value={project.progress} className="h-1.5" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </>
  )
}
