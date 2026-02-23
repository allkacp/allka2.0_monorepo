// @ts-nocheck
import { useState, useEffect } from "react"
import { ConfirmationDialog } from "@/components/confirmation-dialog"
import {
  X,
  Building2,
  Users,
  FileText,
  Crown,
  CreditCard,
  UserPlus,
  Shield,
  TrendingUp,
  Activity,
  CheckCircle2,
  Clock,
  Mail,
  Trash2,
  Edit,
  Search,
  Filter,
  Save,
  Calendar,
  MapPin,
  Phone,
  Globe,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Download,
  FileSpreadsheet,
  CheckCircle as CheckCircleIcon,
  Pause,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AddressMapPicker } from "@/components/address/address-map-picker"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useSidebar } from "@/contexts/sidebar-context"
import { ModalBrandHeader } from "@/components/ui/modal-brand-header"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { CompanyStatusSelector } from "@/components/company-status-selector"

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
  // Added for export functions
  cnpj?: string
  website?: string
  address?: string
  plan?: string
  activeUsers?: number
  totalUsers?: number
  projects?: number
  // ... potentially other fields
}

// Interface update based on the provided updates
interface CompanyEditSlidePanelProps {
  open: boolean
  onClose: () => void
  company: Company | null
  onSave: (company: Company) => void
}

// Dummy interfaces for the export functions
interface UserForExport {
  name: string
  email: string
  role: string
  status: string
}

interface AcceptedTermForExport {
  name: string
  version: string
  acceptedAt: string
  acceptedBy: string
}

interface RelatedProjectForExport {
  name: string
  status: string
  progress: number
  startDate: string
}

interface ActivityLogForExport {
  user: string
  action: string
  timestamp: string
  ip: string
}

export function CompanyEditSlidePanel({ open, onClose, company, onSave }: CompanyEditSlidePanelProps) {
  const { sidebarWidth } = useSidebar()
  const { toast } = useToast()
  
  const [isExiting, setIsExiting] = useState(false)
  const [activeTab, setActiveTab] = useState("company-data")
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    action: "save" | "cancel" | null
  }>({ open: false, action: null })
  
  const [statusChangeDialog, setStatusChangeDialog] = useState<{
    open: boolean
    newStatus: CompanyStatus | null
  }>({ open: false, newStatus: null })

  const [userSearch, setUserSearch] = useState("")
  const [userRoleFilter, setUserRoleFilter] = useState("all")
  const [termFilter, setTermFilter] = useState("all")
  const [projectFilter, setProjectFilter] = useState("all")
  const [logSearch, setLogSearch] = useState("")
  const [logActionFilter, setLogActionFilter] = useState("all")

  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [newUserName, setNewUserName] = useState("")
  const [newUserEmail, setNewUserEmail] = useState("")
  const [newUserRole, setNewUserRole] = useState("member")

  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteType, setInviteType] = useState("")
  const [inviteEmail, setInviteEmail] = useState("")

  const [editedCompany, setEditedCompany] = useState<Company | null>(null)
  const [currentPlan, setCurrentPlan] = useState("basic")

  // Dummy data and functions for export
  const [users, setUsers] = useState<UserForExport[]>([
    { id: 1, name: "João Silva", email: "joao@empresa.com", role: "Admin", status: "active" },
    { id: 2, name: "Maria Santos", email: "maria@empresa.com", role: "User", status: "active" },
    { id: 3, name: "Pedro Costa", email: "pedro@empresa.com", role: "User", status: "inactive" },
  ])
  const [acceptedTerms, setAcceptedTerms] = useState<AcceptedTermForExport[]>([
    { name: "Termos de Uso", version: "1.0", acceptedAt: "2024-06-15", acceptedBy: "Admin" },
    { name: "Política de Privacidade", version: "1.2", acceptedAt: "2024-06-15", acceptedBy: "Admin" },
  ])
  const [relatedProjects, setRelatedProjects] = useState<RelatedProjectForExport[]>([
    { id: 1, name: "Redesign Website", status: "active", progress: 75, startDate: "2025-02-15" },
    { id: 2, name: "Mobile App Development", status: "active", progress: 45, startDate: "2025-03-20" },
    { id: 3, name: "Marketing Campaign", status: "completed", progress: 100, startDate: "2024-12-30" },
  ])
  const [activityLogs, setActivityLogs] = useState<ActivityLogForExport[]>([
    { user: "João Silva", action: "Login realizado", timestamp: "2025-01-07 14:30", ip: "192.168.1.1" },
    { user: "Maria Santos", action: "Projeto criado", timestamp: "2025-01-07 13:15", ip: "192.168.1.5" },
    { user: "João Silva", action: "Usuário convidado", timestamp: "2025-01-07 11:20", ip: "192.168.1.1" },
  ])

  const handleExportCompanyData = () => {
    if (!editedCompany) return // Ensure editedCompany is available

    const companyReport = {
      informacoes_basicas: {
        nome: editedCompany.name,
        tipo: editedCompany.type,
        status: editedCompany.status,
        cnpj: editedCompany.cnpj || "N/A", // Use default if not present
        email: editedCompany.email,
        telefone: editedCompany.phone,
        website: editedCompany.website || "N/A",
        endereco: editedCompany.address || "N/A",
      },
      usuarios: users.map((u) => ({
        nome: u.name,
        email: u.email,
        funcao: u.role,
        status: u.status,
      })),
      plano: {
        atual: editedCompany.plan || "basic", // Default to basic if not set
        valor_mensal:
          editedCompany.plan === "Enterprise"
            ? "R$ 499/mês"
            : editedCompany.plan === "Premium"
              ? "R$ 199/mês"
              : "R$ 49/mês",
      },
      metricas_uso: {
        usuarios_ativos: editedCompany.activeUsers || 0,
        total_usuarios: editedCompany.totalUsers || users.length,
        projetos_ativos: editedCompany.projects || relatedProjects.filter((p) => p.status === "active").length,
        mau: Math.floor((editedCompany.activeUsers || 0) * 1.2),
        dau: Math.floor((editedCompany.activeUsers || 0) * 0.7),
      },
      financeiro: {
        total_investido: `R$ ${(Math.random() * 50000 + 5000).toFixed(2)}`,
        receita_mensal: `R$ ${(Math.random() * 5000 + 500).toFixed(2)}`,
        lifetime_value: `R$ ${(Math.random() * 100000 + 10000).toFixed(2)}`,
      },
      termos_aceitos: acceptedTerms.map((t) => ({
        termo: t.name,
        versao: t.version,
        aceito_em: t.acceptedAt,
        aceito_por: t.acceptedBy,
      })),
      projetos: relatedProjects.map((p) => ({
        nome: p.name,
        status: p.status,
        progresso: p.progress,
        inicio: p.startDate,
      })),
      logs_recentes: activityLogs.slice(0, 50).map((l) => ({
        usuario: l.user,
        acao: l.action,
        timestamp: l.timestamp,
        ip: l.ip,
      })),
    }

    const jsonStr = JSON.stringify(companyReport, null, 2)
    const blob = new Blob([jsonStr], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `relatorio-${editedCompany.name.toLowerCase().replace(/\s/g, "-")}-${new Date().toISOString().split("T")[0]}.json`
    a.click()
  }

  const handleExportUsersCSV = () => {
    if (!editedCompany) return // Ensure editedCompany is available

    const csvData = users
      .map(
        (u) =>
          `"${u.name.replace(/"/g, '""')}","${u.email.replace(/"/g, '""')}","${u.role.replace(/"/g, '""')}","${u.status.replace(/"/g, '""')}"`,
      )
      .join("\n")
    const header = "Nome,Email,Função,Status\n"
    const blob = new Blob([header + csvData], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `usuarios-${editedCompany.name.toLowerCase().replace(/\s/g, "-")}-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
  }

  const handleStatusChange = (newStatus: CompanyStatus) => {
    setStatusChangeDialog({ open: true, newStatus })
  }

  const confirmStatusChange = async () => {
    if (!editedCompany || !statusChangeDialog.newStatus) return
    
    const oldStatus = editedCompany.status
    setEditedCompany({ ...editedCompany, status: statusChangeDialog.newStatus })
    setStatusChangeDialog({ open: false, newStatus: null })
    
    try {
      await new Promise((resolve) => setTimeout(resolve, 500))
      
      toast({
        title: "Sucesso",
        description: `Status alterado de ${oldStatus === "active" ? "Ativo" : oldStatus === "inactive" ? "Inativo" : "Pendente"} para ${statusChangeDialog.newStatus === "active" ? "Ativo" : statusChangeDialog.newStatus === "inactive" ? "Inativo" : "Pendente"}`,
      })
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao alterar status",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    if (company && open) {
      setEditedCompany(company)
      setCurrentPlan(company.partner_level || "basic")
    }
  }, [company, open])

  const [companyUsers, setCompanyUsers] = useState([
    {
      id: 1,
      name: "João Silva",
      email: "joao@empresa.com",
      role: "Admin",
      status: "active",
      last_login: "2025-01-05",
      isMaster: true,
    },
    {
      id: 2,
      name: "Maria Santos",
      email: "maria@empresa.com",
      role: "User",
      status: "active",
      last_login: "2025-01-06",
      isMaster: false,
    },
    {
      id: 3,
      name: "Pedro Costa",
      email: "pedro@empresa.com",
      role: "User",
      status: "inactive",
      last_login: "2024-12-20",
      isMaster: false,
    },
  ])

  const [terms] = useState([
    { id: 1, term: "Termos de Uso", accepted: true, date: "2024-06-15", version: "1.0" },
    { id: 2, term: "Política de Privacidade", accepted: true, date: "2024-06-15", version: "1.2" },
    { id: 3, term: "Termos de Serviço Premium", accepted: false, date: null, version: "2.0" },
  ])

  const [projects] = useState([
    { id: 1, name: "Redesign Website", status: "active", progress: 75, nomads: 3, deadline: "2025-02-15" },
    { id: 2, name: "Mobile App Development", status: "active", progress: 45, nomads: 5, deadline: "2025-03-20" },
    { id: 3, name: "Marketing Campaign", status: "completed", progress: 100, nomads: 2, deadline: "2024-12-30" },
    { id: 4, name: "SEO Optimization", status: "paused", progress: 30, nomads: 1, deadline: "2025-04-10" },
  ])

  const [logs] = useState([
    {
      id: 1,
      user: "João Silva",
      action: "Login realizado",
      category: "auth",
      timestamp: "2025-01-07 14:30",
      ip: "192.168.1.1",
    },
    {
      id: 2,
      user: "Maria Santos",
      action: "Projeto criado",
      category: "project",
      timestamp: "2025-01-07 13:15",
      ip: "192.168.1.5",
    },
    {
      id: 3,
      user: "João Silva",
      action: "Usuário convidado",
      category: "user",
      timestamp: "2025-01-07 11:20",
      ip: "192.168.1.1",
    },
    {
      id: 4,
      user: "Pedro Costa",
      action: "Configurações alteradas",
      category: "settings",
      timestamp: "2025-01-06 16:45",
      ip: "192.168.1.8",
    },
    {
      id: 5,
      user: "Maria Santos",
      action: "Logout",
      category: "auth",
      timestamp: "2025-01-06 15:30",
      ip: "192.168.1.5",
    },
  ])

  const [showTransferMasterModal, setShowTransferMasterModal] = useState(false)
  const [selectedUserForMaster, setSelectedUserForMaster] = useState<number | null>(null)

  const filteredUsers = companyUsers.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      user.email.toLowerCase().includes(userSearch.toLowerCase())
    const matchesRole = userRoleFilter === "all" || user.role.toLowerCase() === userRoleFilter
    return matchesSearch && matchesRole
  })

  const filteredTerms = terms.filter((term) => {
    if (termFilter === "all") return true
    if (termFilter === "accepted") return term.accepted
    if (termFilter === "pending") return !term.accepted
    return true
  })

  const filteredProjects = projects.filter((project) => {
    if (projectFilter === "all") return true
    return project.status === projectFilter
  })

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.user.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.action.toLowerCase().includes(logSearch.toLowerCase())
    const matchesAction = logActionFilter === "all" || log.category === logActionFilter
    return matchesSearch && matchesAction
  })

  const handleAddUser = () => {
    if (!newUserName || !newUserEmail) return

    const newUser = {
      id: companyUsers.length + 1,
      name: newUserName,
      email: newUserEmail,
      role: newUserRole === "admin" ? "Admin" : "User",
      status: "active" as const,
      last_login: new Date().toISOString().split("T")[0],
      isMaster: false, // New users are not masters by default
    }

    setCompanyUsers([...companyUsers, newUser])
    setShowAddUserModal(false)
    setNewUserName("")
    setNewUserEmail("")
    setNewUserRole("member")
  }

  const handleDeleteUser = (userId: number) => {
    setCompanyUsers(companyUsers.filter((user) => user.id !== userId))
  }

  const handleTransferMaster = () => {
    if (!selectedUserForMaster) return

    setCompanyUsers(
      companyUsers.map((user) => ({
        ...user,
        isMaster: user.id === selectedUserForMaster,
      })),
    )
    setShowTransferMasterModal(false)
    setSelectedUserForMaster(null)
  }

  const handleSendInvite = () => {
    if (!inviteEmail) return
    setShowInviteModal(false)
    setInviteEmail("")
    setInviteType("")
  }

  const handleClickSave = () => {
    setConfirmDialog({ open: true, action: "save" })
  }

  const handleConfirmSave = () => {
    if (editedCompany) {
      onSave(editedCompany)
      setConfirmDialog({ open: false, action: null })
      handleClose()
    }
  }

  const handleClickCancel = () => {
    setConfirmDialog({ open: true, action: "cancel" })
  }

  const handleConfirmCancel = () => {
    setConfirmDialog({ open: false, action: null })
    handleClose()
  }

  const handleClose = () => {
    setIsExiting(true)
    setTimeout(() => {
      setIsExiting(false)
      onClose()
    }, 300)
  }

  const handlePlanChange = (newPlan: string) => {
    setCurrentPlan(newPlan)
    if (editedCompany) {
      setEditedCompany({
        ...editedCompany,
        partner_level: newPlan as "basic" | "premium" | "enterprise",
        plan: newPlan, // Also update the 'plan' field for export
      })
    }
  }

  if (!open && !isExiting) {
    return null
  }
  if (!company) {
    return null
  }

  if (!editedCompany) {
    return (
      <div
        style={{ width: `calc(100% - ${sidebarWidth}px)` }}
        className={`fixed right-0 top-0 h-full bg-background shadow-2xl z-50 flex flex-col transition-all duration-500 ease-out border-l ${
          isExiting ? "translate-x-full" : "translate-x-0 delay-100"
        }`}
      >
        <div className="flex items-center justify-center h-full">
          <div className="text-muted-foreground text-sm">Carregando...</div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div
        style={{ width: `calc(100% - ${sidebarWidth}px)` }}
        className={`fixed right-0 top-0 h-full bg-background shadow-2xl z-50 flex flex-col transition-all duration-500 ease-out border-l ${
          isExiting ? "translate-x-full" : "translate-x-0 delay-100"
        }`}
      >
        <ModalBrandHeader
          title="Editar Empresa"
          left={
            <div className="flex items-start space-x-3 flex-1">
              <Avatar className="h-12 w-12 ring-2 ring-white/20">
                <AvatarFallback className="bg-white/20 backdrop-blur-sm text-white text-sm font-bold">
                  {company.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-xs text-white/80 mt-0.5">{company.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs bg-white/20 text-white border-0">
                    {company.type === "company" ? "Company" : company.type === "agency" ? "Agency" : "Nomad"}
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
                </div>
              </div>
            </div>
          }
          right={
            <div className="flex items-center space-x-2">
              {/* Export dropdown in header */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-9 px-3 text-white hover:bg-white/10">
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    Exportar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Exportar Dados</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleExportCompanyData}>
                    <FileText className="h-4 w-4 mr-2" />
                    Relatório Completo
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportUsersCSV}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Exportar Usuários (CSV)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                onClick={handleClickSave}
                type="button"
                size="sm"
                className="h-9 px-4 bg-white text-blue-600 hover:bg-white/90 font-medium"
              >
                <Save className="h-3.5 w-3.5 mr-1.5" />
                Salvar Alterações
              </Button>
            </div>
          }
          onClose={handleClickCancel}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="border-b px-6 py-3 shrink-0 bg-gradient-to-r from-gray-50 to-gray-100">
            <TabsList className="bg-transparent h-auto p-0 w-full justify-start gap-2">
              <TabsTrigger
                value="company-data"
                className="px-4 py-2.5 text-sm font-semibold rounded-lg border-2 transition-all duration-200 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:border-blue-600 data-[state=inactive]:bg-white data-[state=inactive]:text-gray-700 data-[state=inactive]:border-gray-200 hover:border-blue-300"
              >
                <Building2 className="h-4 w-4 mr-2" />
                Dados
              </TabsTrigger>
              <TabsTrigger
                value="users"
                className="px-4 py-2.5 text-sm font-semibold rounded-lg border-2 transition-all duration-200 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:border-blue-600 data-[state=inactive]:bg-white data-[state=inactive]:text-gray-700 data-[state=inactive]:border-gray-200 hover:border-blue-300"
              >
                <Users className="h-4 w-4 mr-2" />
                Usuários
              </TabsTrigger>
              <TabsTrigger
                value="plan"
                className="px-4 py-2.5 text-sm font-semibold rounded-lg border-2 transition-all duration-200 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:border-blue-600 data-[state=inactive]:bg-white data-[state=inactive]:text-gray-700 data-[state=inactive]:border-gray-200 hover:border-blue-300"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Plano
              </TabsTrigger>
              <TabsTrigger
                value="terms"
                className="px-4 py-2.5 text-sm font-semibold rounded-lg border-2 transition-all duration-200 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:border-blue-600 data-[state=inactive]:bg-white data-[state=inactive]:text-gray-700 data-[state=inactive]:border-gray-200 hover:border-blue-300"
              >
                <FileText className="h-4 w-4 mr-2" />
                Termos
              </TabsTrigger>
              <TabsTrigger
                value="projects"
                className="px-4 py-2.5 text-sm font-semibold rounded-lg border-2 transition-all duration-200 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:border-blue-600 data-[state=inactive]:bg-white data-[state=inactive]:text-gray-700 data-[state=inactive]:border-gray-200 hover:border-blue-300"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Projetos
              </TabsTrigger>
              <TabsTrigger
                value="logs"
                className="px-4 py-2.5 text-sm font-semibold rounded-lg border-2 transition-all duration-200 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:border-blue-600 data-[state=inactive]:bg-white data-[state=inactive]:text-gray-700 data-[state=inactive]:border-gray-200 hover:border-blue-300"
              >
                <Activity className="h-4 w-4 mr-2" />
                Logs
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-hidden bg-slate-200">
            <ScrollArea className="h-full">
              <TabsContent value="company-data" className="p-6 space-y-6 mt-0">
                {/* STATUS HEADER - Prominently displayed at the top */}
                <div className="mb-6 p-5 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-xl shadow-sm">
                  <CompanyStatusSelector
                    value={editedCompany?.status || "active"}
                    onChange={(status) => {
                      if (editedCompany) {
                        handleStatusChange(status)
                      }
                    }}
                    showLabel={true}
                  />
                </div>

                <Card className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    <h3 className="text-sm font-semibold">Informações da Empresa</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-xs font-medium flex items-center gap-1.5">
                        <Building2 className="h-3 w-3" />
                        Nome da Empresa
                      </Label>
                      <Input
                        id="name"
                        value={editedCompany.name}
                        onChange={(e) => setEditedCompany({ ...editedCompany, name: e.target.value })}
                        className="h-9 text-sm"
                        placeholder="Nome da empresa"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="type" className="text-xs font-medium">
                        Tipo de Empresa
                      </Label>
                      <Select
                        value={editedCompany.type}
                        onValueChange={(value) => setEditedCompany({ ...editedCompany, type: value as CompanyType })}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="company">Company</SelectItem>
                          <SelectItem value="agency">Agency</SelectItem>
                          <SelectItem value="nomad">Nomad</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-xs font-medium flex items-center gap-1.5">
                        <Mail className="h-3 w-3" />
                        Email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={editedCompany.email}
                        onChange={(e) => setEditedCompany({ ...editedCompany, email: e.target.value })}
                        className="h-9 text-sm"
                        placeholder="email@empresa.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-xs font-medium flex items-center gap-1.5">
                        <Phone className="h-3 w-3" />
                        Telefone
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={editedCompany.phone}
                        onChange={(e) => setEditedCompany({ ...editedCompany, phone: e.target.value })}
                        className="h-9 text-sm"
                        placeholder="+55 (11) 98765-4321"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="document" className="text-xs font-medium flex items-center gap-1.5">
                        <FileText className="h-3 w-3" />
                        Documento (CNPJ)
                      </Label>
                      <Input
                        id="document"
                        value={editedCompany.document}
                        onChange={(e) => setEditedCompany({ ...editedCompany, document: e.target.value })}
                        className="h-9 text-sm"
                        placeholder="00.000.000/0000-00"
                      />
                    </div>

                    {/* Mapa interativo para seleção de endereço */}
                    <div className="space-y-2 col-span-1 md:col-span-2">
                      <Label className="text-sm font-semibold mb-3 block flex items-center gap-1.5">
                        <MapPin className="h-4 w-4" />
                        Localização (Selecione no Mapa)
                      </Label>
                      <AddressMapPicker
                        address={{
                          street: editedCompany.street || "",
                          number: editedCompany.number || "",
                          district: editedCompany.district || "",
                          city: editedCompany.city || "",
                          state: editedCompany.state || "",
                          zipcode: editedCompany.cep || "",
                          lat: editedCompany.lat || 0,
                          lng: editedCompany.lng || 0,
                        }}
                        onAddressChange={(address) => {
                          setEditedCompany((prev) => ({
                            ...prev,
                            street: address.street || "",
                            number: address.number || "",
                            district: address.district || "",
                            city: address.city || "",
                            state: address.state || "",
                            cep: address.zipcode || "",
                            lat: address.lat,
                            lng: address.lng,
                          }))
                        }}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="location" className="text-xs font-medium flex items-center gap-1.5">
                        <MapPin className="h-3 w-3" />
                        Localização
                      </Label>
                      <Input
                        id="location"
                        value={editedCompany.location}
                        onChange={(e) => setEditedCompany({ ...editedCompany, location: e.target.value })}
                        className="h-9 text-sm"
                        placeholder="São Paulo, Brasil"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="account-type" className="text-xs font-medium">
                        Tipo de Conta
                      </Label>
                      <Select
                        value={editedCompany.account_type || "independent"}
                        onValueChange={(value) =>
                          setEditedCompany({ ...editedCompany, account_type: value as "independent" | "premium" })
                        }
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="independent">Independente</SelectItem>
                          <SelectItem value="premium">Premium</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Added fields from updates */}
                    <div className="space-y-2">
                      <Label htmlFor="cnpj" className="text-xs font-medium flex items-center gap-1.5">
                        <FileText className="h-3 w-3" />
                        CNPJ
                      </Label>
                      <Input
                        id="cnpj"
                        value={editedCompany.cnpj || ""}
                        onChange={(e) => setEditedCompany({ ...editedCompany, cnpj: e.target.value })}
                        className="h-9 text-sm"
                        placeholder="00.000.000/0000-00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website" className="text-xs font-medium flex items-center gap-1.5">
                        <Globe className="h-3 w-3" />
                        Website
                      </Label>
                      <Input
                        id="website"
                        value={editedCompany.website || ""}
                        onChange={(e) => setEditedCompany({ ...editedCompany, website: e.target.value })}
                        className="h-9 text-sm"
                        placeholder="https://www.empresa.com"
                      />
                    </div>
                    <div className="space-y-2 col-span-1 md:col-span-2">
                      <Label htmlFor="address" className="text-xs font-medium flex items-center gap-1.5">
                        <MapPin className="h-3 w-3" />
                        Endereço Completo
                      </Label>
                      <Input
                        id="address"
                        value={editedCompany.address || ""}
                        onChange={(e) => setEditedCompany({ ...editedCompany, address: e.target.value })}
                        className="h-9 text-sm"
                        placeholder="Rua Exemplo, 123, Bairro, Cidade, Estado, CEP"
                      />
                    </div>
                  </div>
                </Card>

                <div className="flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleClickCancel}
                    className="h-9 px-6"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="button" 
                    onClick={handleClickSave} 
                    className="h-9 px-6"
                  >
                    <Save className="h-3.5 w-3.5 mr-2" />
                    Salvar Alterações
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="users" className="p-6 space-y-4 mt-0">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar usuários..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="pl-9 h-9 text-sm"
                    />
                  </div>
                  <Select value={userRoleFilter} onValueChange={setUserRoleFilter}>
                    <SelectTrigger className="w-full sm:w-[180px] h-9 text-sm">
                      <Filter className="h-3.5 w-3.5 mr-2" />
                      <SelectValue placeholder="Filtrar por função" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="user">Usuário</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={() => setShowAddUserModal(true)} className="h-9 px-4">
                    <UserPlus className="h-3.5 w-3.5 mr-2" />
                    Adicionar Usuário
                  </Button>
                </div>

                {showTransferMasterModal && (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <Card className="p-6 w-full max-w-md shadow-2xl">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-semibold">Transferir Master</h3>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowTransferMasterModal(false)}
                          className="h-8 w-8"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          Selecione o usuário que se tornará o novo Master da empresa. Esta ação é irreversível.
                        </p>
                        <Select
                          value={selectedUserForMaster?.toString()}
                          onValueChange={(value) => setSelectedUserForMaster(Number.parseInt(value))}
                        >
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="Selecionar usuário" />
                          </SelectTrigger>
                          <SelectContent>
                            {companyUsers
                              .filter((u) => !u.isMaster)
                              .map((user) => (
                                <SelectItem key={user.id} value={user.id.toString()}>
                                  {user.name} ({user.email})
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <div className="flex justify-end space-x-2 pt-2">
                          <Button
                            variant="outline"
                            onClick={() => setShowTransferMasterModal(false)}
                            size="sm"
                            className="h-9 px-4"
                          >
                            Cancelar
                          </Button>
                          <Button onClick={handleTransferMaster} size="sm" className="h-9 px-4">
                            Transferir Master
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </div>
                )}

                {showAddUserModal && (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <Card className="p-6 w-full max-w-md shadow-2xl">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-semibold">Adicionar Novo Usuário</h3>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowAddUserModal(false)}
                          className="h-8 w-8"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="new-user-name" className="text-xs font-medium">
                            Nome Completo
                          </Label>
                          <Input
                            id="new-user-name"
                            value={newUserName}
                            onChange={(e) => setNewUserName(e.target.value)}
                            placeholder="João Silva"
                            className="h-9 text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="new-user-email" className="text-xs font-medium">
                            Email
                          </Label>
                          <Input
                            id="new-user-email"
                            type="email"
                            value={newUserEmail}
                            onChange={(e) => setNewUserEmail(e.target.value)}
                            placeholder="joao@empresa.com"
                            className="h-9 text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="new-user-role" className="text-xs font-medium">
                            Função
                          </Label>
                          <Select value={newUserRole} onValueChange={setNewUserRole}>
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="member">Usuário</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex justify-end space-x-2 pt-2">
                          <Button
                            variant="outline"
                            onClick={() => setShowAddUserModal(false)}
                            size="sm"
                            className="h-9 px-4"
                          >
                            Cancelar
                          </Button>
                          <Button onClick={handleAddUser} size="sm" className="h-9 px-4">
                            Adicionar
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </div>
                )}

                {showInviteModal && (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <Card className="p-6 w-full max-w-md shadow-2xl">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-semibold">Convidar {inviteType}</h3>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowInviteModal(false)}
                          className="h-8 w-8"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="invite-email" className="text-xs font-medium">
                            Email do Convidado
                          </Label>
                          <Input
                            id="invite-email"
                            type="email"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            placeholder="email@exemplo.com"
                            className="h-9 text-sm"
                          />
                        </div>
                        <div className="flex justify-end space-x-2 pt-2">
                          <Button
                            variant="outline"
                            onClick={() => setShowInviteModal(false)}
                            size="sm"
                            className="h-9 px-4"
                          >
                            Cancelar
                          </Button>
                          <Button onClick={handleSendInvite} size="sm" className="h-9 px-4">
                            <Mail className="h-3.5 w-3.5 mr-2" />
                            Enviar Convite
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </div>
                )}

                <div className="grid gap-3">
                  {filteredUsers.map((user) => (
                    <Card key={user.id} className="p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <Avatar className="h-10 w-10 ring-2 ring-muted">
                            <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white font-semibold text-xs">
                              {user.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">{user.name}</p>
                              {user.isMaster && (
                                <Badge
                                  variant="secondary"
                                  className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                                >
                                  <Crown className="h-3 w-3 mr-1" />
                                  Master
                                </Badge>
                              )}
                              <Badge
                                variant="secondary"
                                className={`text-xs ${
                                  user.role === "Admin"
                                    ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                                    : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                }`}
                              >
                                {user.role}
                              </Badge>
                              {user.status === "active" && (
                                <Badge
                                  variant="secondary"
                                  className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                                >
                                  Online
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Último acesso: {new Date(user.last_login).toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {user.isMaster && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowTransferMasterModal(true)}
                              className="h-8 px-3 bg-transparent"
                            >
                              <Crown className="h-3 w-3 mr-1.5" />
                              Transferir
                            </Button>
                          )}
                          <Button variant="outline" size="sm" className="h-8 px-3 bg-transparent">
                            <Edit className="h-3 w-3 mr-1.5" />
                            Editar
                          </Button>
                          {!user.isMaster && (
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleDeleteUser(user.id)}
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                <Card className="p-4 bg-muted/30">
                  <h4 className="text-sm font-semibold mb-3">Convites Rápidos</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setInviteType("Partner")
                        setShowInviteModal(true)
                      }}
                      className="h-9 justify-start"
                    >
                      <Shield className="h-3.5 w-3.5 mr-2" />
                      Convidar Partner
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setInviteType("Nômade Líder")
                        setShowInviteModal(true)
                      }}
                      className="h-9 justify-start"
                    >
                      <Crown className="h-3.5 w-3.5 mr-2" />
                      Convidar Nômade Líder
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setInviteType("Membro")
                        setShowInviteModal(true)
                      }}
                      className="h-9 justify-start"
                    >
                      <UserPlus className="h-3.5 w-3.5 mr-2" />
                      Convidar Membro
                    </Button>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="plan" className="p-6 space-y-6 mt-0">
                <Card className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <CreditCard className="h-4 w-4 text-blue-600" />
                    <h3 className="text-sm font-semibold">Plano Atual</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Basic Plan */}
                    <Card
                      className={`p-4 cursor-pointer transition-all ${
                        currentPlan === "basic" ? "ring-2 ring-blue-600 shadow-lg" : "hover:shadow-md"
                      }`}
                      onClick={() => handlePlanChange("basic")}
                    >
                      <div className="text-center space-y-3">
                        <div className="flex items-center justify-center h-12 w-12 mx-auto rounded-full bg-blue-100 dark:bg-blue-900/30">
                          <Shield className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-bold text-base">Basic</h4>
                          <p className="text-2xl font-bold text-blue-600 mt-2">R$ 99</p>
                          <p className="text-xs text-muted-foreground">/mês</p>
                        </div>
                        <ul className="text-xs text-left space-y-1.5 pt-2">
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                            Até 5 usuários
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="h-3 w-3 text-green-600" />3 projetos ativos
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                            Suporte básico
                          </li>
                        </ul>
                        {currentPlan === "basic" && (
                          <Badge className="w-full justify-center bg-blue-600 hover:bg-blue-600">Plano Ativo</Badge>
                        )}
                      </div>
                    </Card>

                    {/* Premium Plan */}
                    <Card
                      className={`p-4 cursor-pointer transition-all ${
                        currentPlan === "premium" ? "ring-2 ring-purple-600 shadow-lg" : "hover:shadow-md"
                      }`}
                      onClick={() => handlePlanChange("premium")}
                    >
                      <div className="text-center space-y-3">
                        <div className="flex items-center justify-center h-12 w-12 mx-auto rounded-full bg-purple-100 dark:bg-purple-900/30">
                          <Crown className="h-6 w-6 text-purple-600" />
                        </div>
                        <div>
                          <h4 className="font-bold text-base">Premium</h4>
                          <p className="text-2xl font-bold text-purple-600 mt-2">R$ 299</p>
                          <p className="text-xs text-muted-foreground">/mês</p>
                        </div>
                        <ul className="text-xs text-left space-y-1.5 pt-2">
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                            Até 20 usuários
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                            Projetos ilimitados
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                            Suporte prioritário
                          </li>
                        </ul>
                        {currentPlan === "premium" && (
                          <Badge className="w-full justify-center bg-purple-600 hover:bg-purple-600">Plano Ativo</Badge>
                        )}
                      </div>
                    </Card>

                    {/* Enterprise Plan */}
                    <Card
                      className={`p-4 cursor-pointer transition-all ${
                        currentPlan === "enterprise" ? "ring-2 ring-amber-600 shadow-lg" : "hover:shadow-md"
                      }`}
                      onClick={() => handlePlanChange("enterprise")}
                    >
                      <div className="text-center space-y-3">
                        <div className="flex items-center justify-center h-12 w-12 mx-auto rounded-full bg-amber-100 dark:bg-amber-900/30">
                          <Building2 className="h-6 w-6 text-amber-600" />
                        </div>
                        <div>
                          <h4 className="font-bold text-base">Enterprise</h4>
                          <p className="text-2xl font-bold text-amber-600 mt-2">R$ 799</p>
                          <p className="text-xs text-muted-foreground">/mês</p>
                        </div>
                        <ul className="text-xs text-left space-y-1.5 pt-2">
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                            Usuários ilimitados
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                            Projetos ilimitados
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                            Suporte dedicado
                          </li>
                        </ul>
                        {currentPlan === "enterprise" && (
                          <Badge className="w-full justify-center bg-amber-600 hover:bg-amber-600">Plano Ativo</Badge>
                        )}
                      </div>
                    </Card>
                  </div>
                </Card>

                {currentPlan !== company.partner_level && (
                  <Card className="p-4 border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                          Alteração de plano pendente
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                          Você selecionou o plano <strong>{currentPlan.toUpperCase()}</strong>. Clique em "Salvar
                          Alterações" para confirmar a mudança.
                        </p>
                      </div>
                    </div>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="terms" className="p-6 space-y-4 mt-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold">Termos Aceitos</h3>
                  <Select value={termFilter} onValueChange={setTermFilter}>
                    <SelectTrigger className="w-[180px] h-9 text-sm">
                      <Filter className="h-3.5 w-3.5 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="accepted">Aceitos</SelectItem>
                      <SelectItem value="pending">Pendentes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-3">
                  {filteredTerms.map((term) => (
                    <Card key={term.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div
                            className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                              term.accepted
                                ? "bg-green-100 dark:bg-green-900/30"
                                : "bg-yellow-100 dark:bg-yellow-900/30"
                            }`}
                          >
                            {term.accepted ? (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            ) : (
                              <Clock className="h-5 w-5 text-yellow-600" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-medium">{term.term}</h4>
                              <Badge variant="secondary" className="text-xs">
                                v{term.version}
                              </Badge>
                            </div>
                            {term.accepted ? (
                              <p className="text-xs text-muted-foreground mt-1">
                                Aceito em {new Date(term.date!).toLocaleDateString("pt-BR")}
                              </p>
                            ) : (
                              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">Aguardando aceitação</p>
                            )}
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="h-8 px-3 bg-transparent">
                          <ExternalLink className="h-3 w-3 mr-1.5" />
                          Ver Detalhes
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="projects" className="p-6 space-y-4 mt-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold">Projetos Vinculados</h3>
                  <Select value={projectFilter} onValueChange={setProjectFilter}>
                    <SelectTrigger className="w-[180px] h-9 text-sm">
                      <Filter className="h-3.5 w-3.5 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="active">Ativos</SelectItem>
                      <SelectItem value="completed">Concluídos</SelectItem>
                      <SelectItem value="paused">Pausados</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-3">
                  {filteredProjects.map((project) => (
                    <Card key={project.id} className="p-4 hover:shadow-md transition-shadow">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-medium">{project.name}</h4>
                              <Badge
                                variant="secondary"
                                className={`text-xs ${
                                  project.status === "active"
                                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                                    : project.status === "completed"
                                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                      : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
                                }`}
                              >
                                {project.status === "active"
                                  ? "Ativo"
                                  : project.status === "completed"
                                    ? "Concluído"
                                    : "Pausado"}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {project.nomads} nômades
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(project.deadline).toLocaleDateString("pt-BR")}
                              </div>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" className="h-8 px-3 bg-transparent">
                            <ExternalLink className="h-3 w-3 mr-1.5" />
                            Ver Projeto
                          </Button>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Progresso</span>
                            <span className="font-medium">{project.progress}%</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all rounded-full ${
                                project.status === "completed"
                                  ? "bg-blue-600"
                                  : project.status === "active"
                                    ? "bg-green-600"
                                    : "bg-yellow-600"
                              }`}
                              style={{ width: `${project.progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="logs" className="p-6 space-y-4 mt-0">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar nos logs..."
                      value={logSearch}
                      onChange={(e) => setLogSearch(e.target.value)}
                      className="pl-9 h-9 text-sm"
                    />
                  </div>
                  <Select value={logActionFilter} onValueChange={setLogActionFilter}>
                    <SelectTrigger className="w-full sm:w-[180px] h-9 text-sm">
                      <Filter className="h-3.5 w-3.5 mr-2" />
                      <SelectValue placeholder="Tipo de ação" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="auth">Autenticação</SelectItem>
                      <SelectItem value="project">Projetos</SelectItem>
                      <SelectItem value="user">Usuários</SelectItem>
                      <SelectItem value="settings">Configurações</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Card className="p-4">
                  <div className="space-y-4">
                    {filteredLogs.map((log, index) => (
                      <div key={log.id}>
                        <div className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div
                              className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                                log.category === "auth"
                                  ? "bg-blue-100 dark:bg-blue-900/30"
                                  : log.category === "project"
                                    ? "bg-green-100 dark:bg-green-900/30"
                                    : log.category === "user"
                                      ? "bg-purple-100 dark:bg-purple-900/30"
                                      : "bg-orange-100 dark:bg-orange-900/30"
                              }`}
                            >
                              <Activity className="h-4 w-4 text-muted-foreground" />
                            </div>
                            {index < filteredLogs.length - 1 && <div className="w-px h-8 bg-border mt-1" />}
                          </div>
                          <div className="flex-1 pb-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="text-sm font-medium">{log.action}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Por <span className="font-medium">{log.user}</span>
                                </p>
                              </div>
                              <Badge variant="secondary" className="text-xs">
                                {log.category}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {log.timestamp}
                              </div>
                              <div className="flex items-center gap-1">
                                <Globe className="h-3 w-3" />
                                {log.ip}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </TabsContent>
            </ScrollArea>
          </div>
        </Tabs>
      </div>

      {/* Dialogs de Confirmação */}
      <ConfirmationDialog
        open={confirmDialog.open && confirmDialog.action === "save"}
        title="Salvar alterações?"
        message="Deseja realmente salvar as alterações da empresa?"
        confirmText="Salvar"
        cancelText="Continuar editando"
        onConfirm={handleConfirmSave}
        onClose={() => setConfirmDialog({ open: false, action: null })}
        destructive={false}
      />

      <ConfirmationDialog
        open={confirmDialog.open && confirmDialog.action === "cancel"}
        title="Descartar alterações?"
        message="Todas as alterações não salvas serão perdidas."
        confirmText="Descartar"
        cancelText="Voltar"
        onConfirm={handleConfirmCancel}
        onClose={() => setConfirmDialog({ open: false, action: null })}
        destructive={true}
      />

      <AlertDialog open={statusChangeDialog.open} onOpenChange={(open) => !open && setStatusChangeDialog({ open: false, newStatus: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterar status da empresa?</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente alterar o status desta empresa de {editedCompany?.status === "active" ? "Ativa" : editedCompany?.status === "inactive" ? "Inativa" : "Pendente"} para {statusChangeDialog.newStatus === "active" ? "Ativa" : statusChangeDialog.newStatus === "inactive" ? "Inativa" : "Pendente"}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmStatusChange}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
