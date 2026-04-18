// @ts-nocheck
import { useState, useEffect, useRef } from "react"
import { PageLoadingSkeleton } from "@/components/ui/page-loading-skeleton"
import { ExportButton } from "@/components/export-button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Search,
  Filter,
  UserX,
  Shield,
  Eye,
  Phone,
  MessageCircle,
  X,
  Users,
  TrendingUp,
  TrendingDown,
  Clock,
  BarChart3,
  Trash2,
  Loader2,
  AlertCircle,
  Edit,
  Key,
  ChevronLeft,
  ChevronRight,
  Settings2,
  Check,
  Copy,
  Plus,
  Cog,
  Activity,
  Info,
  Download,
  ImageDown,
} from "lucide-react"
import { useSorting, SortableHeader } from "@/hooks/useSorting"
import type { User } from "@/types/user"
import { UserViewSlidePanel } from "@/components/user-view-slide-panel"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ItemsPerPageSelect } from "@/components/items-per-page-select"
import { UserCreateSlidePanel } from "@/components/user-create-slide-panel"
import { ConfirmationDialog } from "@/components/confirmation-dialog"
import { createPortal } from "react-dom"
import { usePlatformUsers } from "@/contexts/platform-users-context"
import { useUsers } from "@/hooks/useUsers"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/components/ui/use-toast"

const mockUsers: User[] = [
  {
    id: 1,
    email: "carlos.silva@techcorp.com",
    name: "Carlos Silva",
    phone: "+55 11 98765-4321",
    account_type: "company",
    account_sub_type: "in-house",
    company_id: 1,
    role: "company_admin",
    permissions: ["view_projects", "create_projects", "manage_users"],
    is_admin: true,
    is_active: true,
    created_at: "2023-06-15",
    updated_at: "2024-01-20",
    online_status: "online",
    last_login: "2024-01-22T14:30:00",
    bitrix_id: "12345",
    asaas_id: "67890",
  },
  {
    id: 2,
    email: "ana.santos@allka.com",
    name: "Ana Santos",
    phone: "+55 21 99876-5432",
    account_type: "nomad",
    account_sub_type: null,
    role: "nomad",
    permissions: ["view_projects"],
    is_admin: false,
    is_active: true,
    created_at: "2023-07-01",
    updated_at: "2024-01-15",
    online_status: "offline",
    last_login: "2024-01-21T09:15:00",
  },
  {
    id: 3,
    email: "joao.costa@partner.com",
    name: "João Costa",
    phone: "+55 11 97654-3210",
    account_type: "agency",
    account_sub_type: null,
    agency_id: 1,
    role: "agency_admin",
    permissions: ["view_projects", "create_projects"],
    is_admin: false,
    is_active: false,
    created_at: "2023-08-10",
    updated_at: "2024-01-10",
    online_status: "offline",
    last_login: "2024-01-10T16:45:00",
  },
  {
    id: 4,
    email: "maria.oliveira@empresa.com",
    name: "Maria Oliveira",
    phone: "+55 85 98123-4567",
    account_type: "company",
    account_sub_type: "company",
    company_id: 2,
    role: "company_user",
    permissions: ["view_projects", "view_catalog"],
    is_admin: false,
    is_active: true,
    created_at: "2023-09-05",
    updated_at: "2024-01-18",
    online_status: "busy",
    last_login: "2024-01-22T11:20:00",
  },
  {
    id: 5,
    email: "pedro.santos@allka.com",
    name: "Pedro Santos",
    phone: "+55 11 96543-2109",
    account_type: "nomad",
    account_sub_type: null,
    role: "nomad",
    permissions: ["view_projects"],
    is_admin: false,
    is_active: true,
    created_at: "2023-10-12",
    updated_at: "2024-01-22",
    online_status: "away",
    last_login: "2024-01-22T08:00:00",
  },
  {
    id: 6,
    email: "lucas.ferreira@techcorp.com",
    name: "Lucas Ferreira",
    phone: "+55 31 99999-8888",
    account_type: "company",
    account_sub_type: "in-house",
    company_id: 1,
    role: "company_user",
    permissions: ["view_projects", "view_catalog"],
    is_admin: false,
    is_active: true,
    created_at: "2023-11-03",
    updated_at: "2024-01-21",
    online_status: "online",
    last_login: "2024-01-22T13:45:00",
  },
  {
    id: 7,
    email: "juliana.rocha@allka.com",
    name: "Juliana Rocha",
    phone: "+55 47 97777-6666",
    account_type: "nomad",
    account_sub_type: null,
    role: "nomad",
    permissions: ["view_projects"],
    is_admin: false,
    is_active: false,
    created_at: "2023-12-01",
    updated_at: "2024-01-15",
    online_status: "offline",
    last_login: "2024-01-19T10:30:00",
  },
  {
    id: 8,
    email: "rafael.souza@partner.com",
    name: "Rafael Souza",
    phone: "+55 62 98765-4321",
    account_type: "agency",
    account_sub_type: null,
    agency_id: 2,
    role: "agency_admin",
    permissions: ["view_projects", "create_projects", "manage_users"],
    is_admin: false,
    is_active: true,
    created_at: "2024-01-05",
    updated_at: "2024-01-22",
    online_status: "online",
    last_login: "2024-01-22T15:20:00",
  },
  {
    id: 9,
    email: "camila.silva@empresa.com",
    name: "Camila Silva",
    phone: "+55 75 96543-2109",
    account_type: "company",
    account_sub_type: "company",
    company_id: 3,
    role: "company_user",
    permissions: ["view_projects"],
    is_admin: false,
    is_active: true,
    created_at: "2024-01-08",
    updated_at: "2024-01-22",
    online_status: "busy",
    last_login: "2024-01-22T12:00:00",
  },
  {
    id: 10,
    email: "diego.costa@techcorp.com",
    name: "Diego Costa",
    phone: "+55 11 95432-1098",
    account_type: "company",
    account_sub_type: "in-house",
    company_id: 1,
    role: "company_admin",
    permissions: ["view_projects", "create_projects", "manage_users"],
    is_admin: true,
    is_active: true,
    created_at: "2024-01-10",
    updated_at: "2024-01-22",
    online_status: "online",
    last_login: "2024-01-22T16:30:00",
  },
  {
    id: 11,
    email: "beatriz.gomes@allka.com",
    name: "Beatriz Gomes",
    phone: "+55 21 94321-0987",
    account_type: "nomad",
    account_sub_type: null,
    role: "nomad",
    permissions: ["view_projects"],
    is_admin: false,
    is_active: true,
    created_at: "2024-01-12",
    updated_at: "2024-01-21",
    online_status: "away",
    last_login: "2024-01-21T14:15:00",
  },
  {
    id: 12,
    email: "gustavo.alves@partner.com",
    name: "Gustavo Alves",
    phone: "+55 85 93210-9876",
    account_type: "agency",
    account_sub_type: null,
    agency_id: 1,
    role: "agency_user",
    permissions: ["view_projects"],
    is_admin: false,
    is_active: true,
    created_at: "2024-01-14",
    updated_at: "2024-01-22",
    online_status: "online",
    last_login: "2024-01-22T11:45:00",
  },
  {
    id: 13,
    email: "fernanda.dias@empresa.com",
    name: "Fernanda Dias",
    phone: "+55 11 92109-8765",
    account_type: "company",
    account_sub_type: "company",
    company_id: 2,
    role: "company_user",
    permissions: ["view_projects", "view_catalog"],
    is_admin: false,
    is_active: false,
    created_at: "2024-01-15",
    updated_at: "2024-01-18",
    online_status: "offline",
    last_login: "2024-01-18T09:00:00",
  },
  {
    id: 14,
    email: "marcus.pinto@techcorp.com",
    name: "Marcus Pinto",
    phone: "+55 81 91098-7654",
    account_type: "company",
    account_sub_type: "in-house",
    company_id: 1,
    role: "company_user",
    permissions: ["view_projects"],
    is_admin: false,
    is_active: true,
    created_at: "2024-01-16",
    updated_at: "2024-01-22",
    online_status: "online",
    last_login: "2024-01-22T10:00:00",
  },
  {
    id: 15,
    email: "isabela.santos@allka.com",
    name: "Isabela Santos",
    phone: "+55 48 90987-6543",
    account_type: "nomad",
    account_sub_type: null,
    role: "nomad",
    permissions: ["view_projects"],
    is_admin: false,
    is_active: true,
    created_at: "2024-01-17",
    updated_at: "2024-01-22",
    online_status: "away",
    last_login: "2024-01-22T07:30:00",
  },
  {
    id: 16,
    email: "tiago.mendes@partner.com",
    name: "Tiago Mendes",
    phone: "+55 11 88765-4321",
    account_type: "agency",
    account_sub_type: null,
    agency_id: 2,
    role: "agency_user",
    permissions: ["view_projects", "create_projects"],
    is_admin: false,
    is_active: true,
    created_at: "2024-01-18",
    updated_at: "2024-01-22",
    online_status: "busy",
    last_login: "2024-01-22T14:20:00",
  },
  {
    id: 17,
    email: "vitoria.cardoso@empresa.com",
    name: "Vitória Cardoso",
    phone: "+55 71 87654-3210",
    account_type: "company",
    account_sub_type: "company",
    company_id: 3,
    role: "company_user",
    permissions: ["view_projects"],
    is_admin: false,
    is_active: true,
    created_at: "2024-01-19",
    updated_at: "2024-01-22",
    online_status: "online",
    last_login: "2024-01-22T13:00:00",
  },
  {
    id: 18,
    email: "anderson.cruz@techcorp.com",
    name: "Anderson Cruz",
    phone: "+55 27 86543-2109",
    account_type: "company",
    account_sub_type: "in-house",
    company_id: 1,
    role: "company_user",
    permissions: ["view_projects", "view_catalog"],
    is_admin: false,
    is_active: true,
    created_at: "2024-01-20",
    updated_at: "2024-01-22",
    online_status: "away",
    last_login: "2024-01-22T09:45:00",
  },
  {
    id: 19,
    email: "patricia.moura@allka.com",
    name: "Patrícia Moura",
    phone: "+55 41 85432-1098",
    account_type: "nomad",
    account_sub_type: null,
    role: "nomad",
    permissions: ["view_projects"],
    is_admin: false,
    is_active: false,
    created_at: "2024-01-21",
    updated_at: "2024-01-21",
    online_status: "offline",
    last_login: "2024-01-21T15:30:00",
  },
  {
    id: 20,
    email: "rodolfo.oliveira@partner.com",
    name: "Rodolfo Oliveira",
    phone: "+55 51 84321-0987",
    account_type: "agency",
    account_sub_type: null,
    agency_id: 1,
    role: "agency_admin",
    permissions: ["view_projects", "create_projects", "manage_users"],
    is_admin: false,
    is_active: true,
    created_at: "2024-01-22",
    updated_at: "2024-01-22",
    online_status: "online",
    last_login: "2024-01-22T17:00:00",
  },
]

export default function UsuariosPage() {
  const { addUser: addPlatformUser } = usePlatformUsers()
  const { users: apiUsers, loading: usersLoading, error: usersError, refetch: refetchUsers, createUser, updateUser, deleteUser: apiDeleteUser } = useUsers()
  const { toast } = useToast()
  const pageRef = useRef<HTMLDivElement>(null)
  const { sortKey: userSortKey, sortDir: userSortDir, handleSort: handleUserSort, sortData: sortUsers, columnFilters, toggleColumnFilter, clearColumnFilter } = useSorting<User>()
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false)
  const [isDeleteUserAlertOpen, setIsDeleteUserAlertOpen] = useState(false)
  const [isDeleteLoading, setIsDeleteLoading] = useState(false)
  const [deletionReason, setDeletionReason] = useState("")
  const [deletionReasonError, setDeletionReasonError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [roleFilter, setRoleFilter] = useState("all")
  const [currentUserId] = useState(1)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false)
  
  // Advanced filters
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false)
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
  const [savedFilters, setSavedFilters] = useState<Array<{
    id: string
    name: string
    filters: typeof advancedFilters
  }>>([])
  const [filterName, setFilterName] = useState("")
  const [saveAsFilter, setSaveAsFilter] = useState(false)
  const [selectedFilterId, setSelectedFilterId] = useState<string | null>(null)
  const [isEditingFilter, setIsEditingFilter] = useState(false)
  const [unsavedChanges, setUnsavedChanges] = useState(false)
  const [pendingClose, setPendingClose] = useState<(() => void) | null>(null)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [isDuplicatingFilter, setIsDuplicatingFilter] = useState(false)
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [advancedFilters, setAdvancedFilters] = useState({
    // Identificação
    name: "",
    email: "",
    cpf: "",
    phone: "",
    whatsapp: "",
    hasWhatsapp: "all",
    // Tipo e Função
    accountTypes: [] as string[],
    roles: [] as string[],
    statuses: [] as string[],
    // Datas
    registrationDateFrom: "",
    registrationDateTo: "",
    lastAccessDateFrom: "",
    lastAccessDateTo: "",
    lastUpdateDateFrom: "",
    lastUpdateDateTo: "",
    // Métricas
    minScore: "",
    maxScore: "",
    userLevel: "all",
    rating: "all",
    // Dados Complementares
    hasCompany: "all",
    hasSpecialPermissions: "all",
    hasActiveWallet: "all",
    minBalance: "",
    maxBalance: "",
    hasFinancialActions: "all",
    profile: "all",
    plan: "all",
  })
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [paginatedUsers, setPaginatedUsers] = useState<User[]>([])

  useEffect(() => {
    // Map API users to the shape the page expects
    const mapped = apiUsers.map((u: any) => ({
      ...u,
      is_active: u.is_active ?? true,
      online_status: "offline",
      account_type: u.account_type || "empresas",
    }))
    setUsers(mapped)
    setFilteredUsers(mapped)
    setCurrentPage(1)
  }, [apiUsers])

  useEffect(() => {
    const filtered = users.filter((user) => {
      if (
        searchTerm &&
        !user.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !user.email.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false
      }

      if (statusFilter !== "all") {
        if (statusFilter === "active" && !user.is_active) return false
        if (statusFilter === "inactive" && user.is_active) return false
      }

      if (roleFilter !== "all") {
        if (roleFilter === "company_admin" && user.role !== "company_admin") return false
        if (roleFilter === "company_user" && user.role !== "company_user") return false
        if (roleFilter === "agency_admin" && user.role !== "agency_admin") return false
        if (roleFilter === "agency_user" && user.role !== "agency_user") return false
        if (roleFilter === "nomad" && user.role !== "nomad") return false
        if (roleFilter === "admin" && user.role !== "admin") return false
        if (roleFilter === "financial" && user.role !== "financial") return false
        if (roleFilter === "team_allka" && user.role !== "team_allka") return false
        if (roleFilter === "partner" && user.role !== "partner") return false
      }

      // Advanced filters
      if (advancedFilters.registrationDateFrom) {
        const userDate = new Date(user.created_at)
        const filterDate = new Date(advancedFilters.registrationDateFrom)
        if (userDate < filterDate) return false
      }

      if (advancedFilters.registrationDateTo) {
        const userDate = new Date(user.created_at)
        const filterDate = new Date(advancedFilters.registrationDateTo)
        filterDate.setHours(23, 59, 59, 999)
        if (userDate > filterDate) return false
      }

      if (advancedFilters.lastAccessDateFrom && user.last_login) {
        const userDate = new Date(user.last_login)
        const filterDate = new Date(advancedFilters.lastAccessDateFrom)
        if (userDate < filterDate) return false
      }

      if (advancedFilters.lastAccessDateTo && user.last_login) {
        const userDate = new Date(user.last_login)
        const filterDate = new Date(advancedFilters.lastAccessDateTo)
        filterDate.setHours(23, 59, 59, 999)
        if (userDate > filterDate) return false
      }

      if (advancedFilters.plan !== "all") {
        // Mock plan filter - in real app would check user.plan field
        const userPlan = (user.account_type === "company" || user.account_type === "empresas") ? "premium" : "free"
        if (userPlan !== advancedFilters.plan) return false
      }

      return true
    })
    
    setFilteredUsers(filtered)
    setCurrentPage(1)
  }, [users, searchTerm, statusFilter, roleFilter, advancedFilters])

  // Pagination effect
  useEffect(() => {
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    setPaginatedUsers(sortUsers(filteredUsers).slice(startIndex, endIndex))
  }, [filteredUsers, currentPage, pageSize, userSortKey, userSortDir])

  const totalPages = Math.ceil(filteredUsers.length / pageSize)

  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisible = 5
    const halfVisible = Math.floor(maxVisible / 2)

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      if (currentPage <= halfVisible + 1) {
        for (let i = 1; i <= maxVisible; i++) {
          pages.push(i)
        }
        if (totalPages > maxVisible) pages.push("...")
      } else if (currentPage >= totalPages - halfVisible) {
        pages.push("...")
        for (let i = totalPages - maxVisible + 1; i <= totalPages; i++) {
          pages.push(i)
        }
      } else {
        pages.push("...")
        for (let i = currentPage - halfVisible; i <= currentPage + halfVisible; i++) {
          pages.push(i)
        }
        pages.push("...")
      }
    }
    return pages
  }

  const clearFilters = () => {
    setSearchTerm("")
    setStatusFilter("all")
    setRoleFilter("all")
    setAdvancedFilters({
      registrationDateFrom: "",
      registrationDateTo: "",
      lastAccessDateFrom: "",
      lastAccessDateTo: "",
      profile: "all",
      plan: "all",
    })
    setCurrentPage(1)
  }

  const hasActiveFilters = 
    searchTerm || 
    statusFilter !== "all" || 
    roleFilter !== "all" || 
    advancedFilters.registrationDateFrom ||
    advancedFilters.registrationDateTo ||
    advancedFilters.lastAccessDateFrom ||
    advancedFilters.lastAccessDateTo ||
    advancedFilters.plan !== "all"

  const handleUserAction = (user: User, action: string) => {
    setSelectedUser(user)

    switch (action) {
      case "view":
        setIsViewDialogOpen(true)
        break
      case "block":
        setIsDeleteAlertOpen(true)
        break
      case "delete":
        setDeletionReason("")
        setDeletionReasonError("")
        setIsDeleteUserAlertOpen(true)
        break
    }
  }

  const handleDeleteUser = async () => {
    if (!selectedUser) return

    // Validate deletion reason
    if (!deletionReason.trim()) {
      setDeletionReasonError("O motivo da exclusão é obrigatório")
      return
    }

    if (deletionReason.trim().length < 10) {
      setDeletionReasonError("O motivo deve ter no mínimo 10 caracteres")
      return
    }

    // Security check: prevent deletion of current user
    if (selectedUser.id === currentUserId) {
      console.error("Cannot delete current logged-in user")
      return
    }

    // Security check: prevent deletion of main admin accounts
    if (selectedUser.is_admin && selectedUser.role === "admin") {
      console.error("Cannot delete main admin account")
      return
    }

    setIsDeleteLoading(true)
    try {
      // Real API call to delete user
      await apiDeleteUser(String(selectedUser.id))

      toast({
        title: "Usuário excluído",
        description: `O usuário "${selectedUser.name}" foi excluído com sucesso.`,
      })

      // Close dialog and reset
      setIsDeleteUserAlertOpen(false)
      setSelectedUser(null)
      setDeletionReason("")
      setDeletionReasonError("")
    } catch (error: any) {
      console.error("Error deleting user:", error)
      toast({
        title: "Erro ao excluir",
        description: error.message || "Erro ao excluir usuário. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsDeleteLoading(false)
    }
  }

  const handlePhoneCall = (phone: string) => {
    // Remove formatting and open phone dialer
    const cleanPhone = phone.replace(/\D/g, "")
    window.open(`tel:${cleanPhone}`, "_self")
  }

  const handleWhatsApp = (phone: string) => {
    // Remove formatting and open WhatsApp
    const cleanPhone = phone.replace(/\D/g, "")
    window.open(`https://wa.me/${cleanPhone}`, "_blank")
  }

  const getAccountTypeLabel = (type: string) => {
    switch (type) {
      case "empresas":
        return "Company"
      case "agencias":
        return "Agency"
      case "nomades":
        return "Nomad"
      case "admin":
        return "Admin"
      default:
        return type
    }
  }

  const getAccountTypeColor = (type: string) => {
    switch (type) {
      case "empresas":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
      case "agencias":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
      case "nomades":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
      case "admin":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "company_admin":
        return "Admin Empresa"
      case "company_user":
        return "Usuário Empresa"
      case "agency_admin":
        return "Admin Agência"
      case "agency_user":
        return "Usuário Agência"
      case "nomad":
        return "Nômade"
      case "admin":
        return "Administrador"
      case "financial":
        return "Financial"
      case "team_allka":
        return "Team allka"
      case "partner":
        return "Partner"
      default:
        return role
    }
  }

  const getOnlineStatusIndicator = (status: string) => {
    switch (status) {
      case "online":
        return (
          <div className="relative">
            <div className="h-3 w-3 rounded-full bg-green-500 ring-2 ring-white dark:ring-gray-900"></div>
            <div className="absolute inset-0 h-3 w-3 rounded-full bg-green-500 animate-ping opacity-75"></div>
          </div>
        )
      case "offline":
        return <div className="h-3 w-3 rounded-full bg-gray-400 ring-2 ring-white dark:ring-gray-900"></div>
      case "busy":
        return <div className="h-3 w-3 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-900"></div>
      case "away":
        return <div className="h-3 w-3 rounded-full bg-yellow-500 ring-2 ring-white dark:ring-gray-900"></div>
      default:
        return <div className="h-3 w-3 rounded-full bg-gray-400 ring-2 ring-white dark:ring-gray-900"></div>
    }
  }

  const getOnlineStatusLabel = (status: string) => {
    switch (status) {
      case "online":
        return "Online"
      case "offline":
        return "Offline"
      case "busy":
        return "Ocupado"
      case "away":
        return "Ausente"
      default:
        return "Desconhecido"
    }
  }

  const handleStatusConfirmation = async (reason: string, duration: "indefinite" | Date) => {
    if (!selectedUser) return

    try {
      const newStatus = !selectedUser.is_active
      await updateUser(String(selectedUser.id), { is_active: newStatus })

      setSelectedUser({ ...selectedUser, is_active: newStatus })
      toast({
        title: newStatus ? "Usuário desbloqueado" : "Usuário bloqueado",
        description: `O usuário "${selectedUser.name}" foi ${newStatus ? "desbloqueado" : "bloqueado"} com sucesso.`,
      })
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar status do usuário.",
        variant: "destructive",
      })
    }

    // Close dialog
    setIsDeleteAlertOpen(false)
  }

  const getAccountTypeBadge = (accountType: string, role?: string) => {
    // Normalizar tipo de conta
    const normalizedType = String(accountType).toLowerCase()
    
    if (normalizedType === "company" || normalizedType === "empresas")
      return { label: "Company", color: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:to-purple-900" }
    if (normalizedType === "agency" || normalizedType === "agencias")
      return { label: "Agency", color: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:to-orange-900" }
    if (normalizedType === "nomad" || normalizedType === "nomades")
      return { label: "Nomad", color: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:to-blue-900" }
    if (role === "financial")
      return { label: "Financial", color: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:to-orange-900" }
    if (role === "team_allka")
      return { label: "Team allka", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:to-indigo-900" }
    return { label: "Outro", color: "bg-gray-100 text-gray-800 dark:bg-gray-950 dark:to-gray-900" }
  }

  if (usersLoading) {
    return (
      <div className="space-y-5">
        <PageLoadingSkeleton statCards={4} tableRows={8} tableColumns={6} />
      </div>
    )
  }

  return (
    <div className="space-y-5" ref={pageRef}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 bg-clip-text text-transparent tracking-tight">
            Usuários
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Gerencie todos os usuários da plataforma
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton pageRef={pageRef} filename="usuarios" />
          <Button
            onClick={() => setShowCreateUser(true)}
            className="h-9 gap-2 btn-brand shadow-md border-0"
          >
            <Plus className="h-4 w-4" />
            Novo Usuário
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative rounded-xl overflow-hidden shadow-sm bg-gradient-to-br from-blue-500 to-blue-700 px-3 pt-2 pb-1.5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-white/70 leading-tight">Total de Usuários</p>
            <div className="bg-white/20 rounded-md p-1"><Users className="h-4 w-4 text-white" /></div>
          </div>
          <p className="text-2xl font-bold text-white leading-none">{users.length}</p>
        </div>
        <div className="relative rounded-xl overflow-hidden shadow-sm bg-gradient-to-br from-emerald-500 to-teal-600 px-3 pt-2 pb-1.5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-white/70 leading-tight">Usuários Ativos</p>
            <div className="bg-white/20 rounded-md p-1"><Activity className="h-4 w-4 text-white" /></div>
          </div>
          <p className="text-2xl font-bold text-white leading-none">{users.filter((u) => u.is_active).length}</p>
        </div>
        <div className="relative rounded-xl overflow-hidden shadow-sm bg-gradient-to-br from-violet-500 to-purple-700 px-3 pt-2 pb-1.5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-white/70 leading-tight">Administradores</p>
            <div className="bg-white/20 rounded-md p-1"><Shield className="h-4 w-4 text-white" /></div>
          </div>
          <p className="text-2xl font-bold text-white leading-none">{users.filter((u) => u.is_admin).length}</p>
        </div>
        <div className="relative rounded-xl overflow-hidden shadow-sm bg-gradient-to-br from-orange-500 to-rose-600 px-3 pt-2 pb-1.5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-white/70 leading-tight">Ativos 90 dias</p>
            <div className="bg-white/20 rounded-md p-1"><Clock className="h-4 w-4 text-white" /></div>
          </div>
          <p className="text-2xl font-bold text-white leading-none">
            {
              users.filter((u) => {
                const lastAccess = new Date(u.last_login || Date.now())
                const ninetyDaysAgo = new Date()
                ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
                return lastAccess >= ninetyDaysAgo
              }).length
            }
          </p>
        </div>
      </div>

      {/* Main Table Card */}
      <Card className="border border-slate-200/70 dark:border-slate-700/60 shadow-sm overflow-hidden">
        {/* Card Top Bar */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-200/70 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-900/30">
          {/* Search */}
          <div className="flex-1 relative min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Nome, e-mail, telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg focus-visible:ring-blue-500 w-full"
            />
          </div>

          {/* Items per page + result count */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <ItemsPerPageSelect
              value={pageSize.toString()}
              onValueChange={(value) => { setPageSize(Number(value)); setCurrentPage(1) }}
              variant="top"
            />
            <span className="text-xs text-slate-400 whitespace-nowrap">
              {filteredUsers.length !== users.length
                ? <>de <span className="font-semibold text-blue-500">{filteredUsers.length}</span> de {users.length}</>
                : <>de <span className="font-semibold text-slate-600 dark:text-slate-300">{users.length}</span> usuário{users.length !== 1 ? "s" : ""}</>
              }
            </span>
          </div>

          {/* Filter Button */}
          <Button
            onClick={() => setIsFilterModalOpen(true)}
            variant="outline"
            size="sm"
            className="h-9 gap-2 px-3.5 text-xs border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex-shrink-0"
          >
            <Filter className="h-3.5 w-3.5" />
            Filtros
          </Button>

          {/* Pagination */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="h-7 w-7 flex items-center justify-center rounded-full text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            {getPageNumbers().map((page, index) =>
              page === "..." ? (
                <span key={index} className="text-xs text-slate-300 px-0.5">·</span>
              ) : (
                <button
                  key={index}
                  onClick={() => setCurrentPage(Number(page))}
                  className={`h-7 w-7 flex items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                    page === currentPage
                      ? "bg-blue-500 text-white shadow-sm shadow-blue-200 dark:shadow-blue-900/40"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  {page}
                </button>
              )
            )}
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="h-7 w-7 flex items-center justify-center rounded-full text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <CardContent className="p-0">
          <div>

            {/* Filter Modal - Centered popup with two columns */}
            {isFilterModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div
                  className="absolute inset-0 bg-black/30 backdrop-blur-sm"
                  onClick={() => {
                    if (unsavedChanges) {
                      setPendingClose(() => () => {
                        setIsFilterModalOpen(false)
                        setSelectedFilterId(null)
                        setIsEditingFilter(false)
                        setUnsavedChanges(false)
                      })
                      return
                    }
                    setIsFilterModalOpen(false)
                    setSelectedFilterId(null)
                    setIsEditingFilter(false)
                    setUnsavedChanges(false)
                  }}
                />

                <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl mx-4 max-h-[85vh] border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in duration-300 flex flex-col overflow-hidden">
                  {/* Header with gradient */}
                  <div className="flex items-center justify-between px-8 py-5 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white flex-shrink-0">
                    <div>
                      <h2 className="text-lg font-bold">Filtros Avançados de Usuários</h2>
                      <p className="text-xs text-blue-100 mt-0.5">
                        {selectedFilterId && !isEditingFilter ? "Filtro carregado" : isEditingFilter ? "Editando filtro" : "Configure filtros detalhados"}
                        {unsavedChanges && " • Alterações não salvas"}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        if (unsavedChanges) {
                          setPendingClose(() => () => {
                            setIsFilterModalOpen(false)
                            setSelectedFilterId(null)
                            setIsEditingFilter(false)
                            setUnsavedChanges(false)
                          })
                          return
                        }
                        setIsFilterModalOpen(false)
                        setSelectedFilterId(null)
                        setIsEditingFilter(false)
                        setUnsavedChanges(false)
                      }}
                      className="text-white hover:bg-white/20 rounded-lg p-1.5 transition-colors flex-shrink-0"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Content - Two columns with flex layout */}
                  <div className="flex flex-1 overflow-hidden">
                    {/* Left Column - Saved Filters (30%) */}
                    <div className="w-1/3 border-r border-slate-200 dark:border-slate-700 p-5 overflow-y-auto flex-shrink-0 bg-slate-50/30 dark:bg-slate-900/20">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <Filter className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        Filtros Salvos
                      </h3>
                      
                      {savedFilters.length === 0 ? (
                        <div className="text-center py-12">
                          <div className="text-slate-300 dark:text-slate-600 mb-3">
                            <Filter className="h-8 w-8 mx-auto opacity-40" />
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Você ainda não possui filtros salvos
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {savedFilters.map((filter) => (
                            <div
                              key={filter.id}
                              className={`p-3 rounded-lg border transition-all group cursor-pointer ${
                                selectedFilterId === filter.id
                                  ? "bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700"
                                  : "bg-white dark:bg-slate-700/40 hover:bg-blue-50 dark:hover:bg-slate-700/60 border-slate-200 dark:border-slate-600/50"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <p className="text-sm font-medium text-slate-900 dark:text-white truncate flex-1">
                                  {filter.name}
                                </p>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => {
                                    setAdvancedFilters(filter.filters)
                                    setSelectedFilterId(filter.id)
                                    setIsEditingFilter(false)
                                    setUnsavedChanges(false)
                                  }}
                                  className="flex-1 px-2 py-1.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                                  title="Carregar"
                                >
                                  Carregar
                                </button>
                                <button
                                  onClick={() => {
                                    setAdvancedFilters(filter.filters)
                                    setSelectedFilterId(null)
                                    setIsEditingFilter(false)
                                    setIsDuplicatingFilter(true)
                                    setFilterName(`${filter.name} (Cópia)`)
                                    setSaveAsFilter(true)
                                  }}
                                  className="p-1.5 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 transition-colors"
                                  title="Duplicar"
                                >
                                  <Copy className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setSavedFilters(savedFilters.filter((f) => f.id !== filter.id))
                                    if (selectedFilterId === filter.id) {
                                      setSelectedFilterId(null)
                                      setIsEditingFilter(false)
                                    }
                                  }}
                                  className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors"
                                  title="Excluir"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Right Column - Filter Configuration with Accordion (70%) */}
                    <div className="flex-1 overflow-y-auto p-6 pb-32">
                      <Accordion type="multiple" defaultValue={["identificacao", "tipo-funcao"]} className="space-y-3">
                        
                        {/* SEÇÃO: IDENTIFICAÇÃO */}
                        <AccordionItem value="identificacao" className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                          <AccordionTrigger className="bg-white hover:bg-slate-50 px-4 py-3 transition-colors">
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">Identificação</span>
                          </AccordionTrigger>
                          <AccordionContent className="p-4 space-y-3 bg-white dark:bg-slate-800/50">
                            <div className="grid grid-cols-2 gap-3">
                              <Input
                                placeholder="Nome"
                                value={advancedFilters.name}
                                onChange={(e) => {
                                  setAdvancedFilters({...advancedFilters, name: e.target.value})
                                  if (selectedFilterId) setUnsavedChanges(true)
                                }}
                                className="h-8 text-sm"
                              />
                              <Input
                                placeholder="E-mail"
                                value={advancedFilters.email}
                                onChange={(e) => {
                                  setAdvancedFilters({...advancedFilters, email: e.target.value})
                                  if (selectedFilterId) setUnsavedChanges(true)
                                }}
                                className="h-8 text-sm"
                              />
                              <Input
                                placeholder="CPF"
                                value={advancedFilters.cpf}
                                onChange={(e) => {
                                  setAdvancedFilters({...advancedFilters, cpf: e.target.value})
                                  if (selectedFilterId) setUnsavedChanges(true)
                                }}
                                className="h-8 text-sm"
                              />
                              <Input
                                placeholder="Telefone"
                                value={advancedFilters.phone}
                                onChange={(e) => {
                                  setAdvancedFilters({...advancedFilters, phone: e.target.value})
                                  if (selectedFilterId) setUnsavedChanges(true)
                                }}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3 items-end">
                              <Input
                                placeholder="WhatsApp"
                                value={advancedFilters.whatsapp}
                                onChange={(e) => {
                                  setAdvancedFilters({...advancedFilters, whatsapp: e.target.value})
                                  if (selectedFilterId) setUnsavedChanges(true)
                                }}
                                className="h-8 text-sm"
                              />
                              <Select value={advancedFilters.hasWhatsapp} onValueChange={(value) => {
                                setAdvancedFilters({...advancedFilters, hasWhatsapp: value})
                                if (selectedFilterId) setUnsavedChanges(true)
                              }}>
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue placeholder="Com WhatsApp?" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">Todos</SelectItem>
                                  <SelectItem value="yes">Sim</SelectItem>
                                  <SelectItem value="no">Não</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </AccordionContent>
                        </AccordionItem>

                        {/* SEÇÃO: TIPO E FUNÇÃO */}
                        <AccordionItem value="tipo-funcao" className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                          <AccordionTrigger className="bg-white hover:bg-slate-50 px-4 py-3 transition-colors">
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">Tipo e Função</span>
                          </AccordionTrigger>
                          <AccordionContent className="p-4 space-y-3 bg-white dark:bg-slate-800/50">
                            <div>
                              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">Tipo de Conta</label>
                              <div className="flex flex-wrap gap-2">
                                {["company", "nomad", "agency"].map((type) => (
                                  <label key={type} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={advancedFilters.accountTypes.includes(type)}
                                      onChange={(e) => {
                                        setAdvancedFilters({
                                          ...advancedFilters,
                                          accountTypes: e.target.checked
                                            ? [...advancedFilters.accountTypes, type]
                                            : advancedFilters.accountTypes.filter((t) => t !== type),
                                        })
                                        if (selectedFilterId) setUnsavedChanges(true)
                                      }}
                                      className="rounded border-slate-300 dark:border-slate-600"
                                    />
                                    <span className="text-sm text-slate-700 dark:text-slate-300 capitalize">{type}</span>
                                  </label>
                                ))}
                              </div>
                            </div>

                            <div>
                              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">Função</label>
                              <div className="flex flex-wrap gap-2">
                                {["admin", "user"].map((role) => (
                                  <label key={role} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={advancedFilters.roles.includes(role)}
                                      onChange={(e) => {
                                        setAdvancedFilters({
                                          ...advancedFilters,
                                          roles: e.target.checked
                                            ? [...advancedFilters.roles, role]
                                            : advancedFilters.roles.filter((r) => r !== role),
                                        })
                                        if (selectedFilterId) setUnsavedChanges(true)
                                      }}
                                      className="rounded border-slate-300 dark:border-slate-600"
                                    />
                                    <span className="text-sm text-slate-700 dark:text-slate-300 capitalize">{role}</span>
                                  </label>
                                ))}
                              </div>
                            </div>

                            <div>
                              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">Status</label>
                              <div className="flex flex-wrap gap-2">
                                {["active", "inactive", "blocked"].map((status) => (
                                  <label key={status} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={advancedFilters.statuses.includes(status)}
                                      onChange={(e) => {
                                        setAdvancedFilters({
                                          ...advancedFilters,
                                          statuses: e.target.checked
                                            ? [...advancedFilters.statuses, status]
                                            : advancedFilters.statuses.filter((s) => s !== status),
                                        })
                                        if (selectedFilterId) setUnsavedChanges(true)
                                      }}
                                      className="rounded border-slate-300 dark:border-slate-600"
                                    />
                                    <span className="text-sm text-slate-700 dark:text-slate-300">
                                      {status === "active" ? "Ativo" : status === "inactive" ? "Inativo" : "Bloqueado"}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>

                        {/* SEÇÃO: DATAS */}
                        <AccordionItem value="datas" className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                          <AccordionTrigger className="bg-white hover:bg-slate-50 px-4 py-3 transition-colors">
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">Período de Datas</span>
                          </AccordionTrigger>
                          <AccordionContent className="p-4 space-y-3 bg-white dark:bg-slate-800/50">
                            <div>
                              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">Data de Cadastro</label>
                              <div className="flex gap-2">
                                <Input type="date" value={advancedFilters.registrationDateFrom} onChange={(e) => {
                                  setAdvancedFilters({...advancedFilters, registrationDateFrom: e.target.value})
                                  if (selectedFilterId) setUnsavedChanges(true)
                                }} className="h-8 text-sm flex-1" />
                                <Input type="date" value={advancedFilters.registrationDateTo} onChange={(e) => {
                                  setAdvancedFilters({...advancedFilters, registrationDateTo: e.target.value})
                                  if (selectedFilterId) setUnsavedChanges(true)
                                }} className="h-8 text-sm flex-1" />
                              </div>
                            </div>

                            <div>
                              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">Último Acesso</label>
                              <div className="flex gap-2">
                                <Input type="date" value={advancedFilters.lastAccessDateFrom} onChange={(e) => {
                                  setAdvancedFilters({...advancedFilters, lastAccessDateFrom: e.target.value})
                                  if (selectedFilterId) setUnsavedChanges(true)
                                }} className="h-8 text-sm flex-1" />
                                <Input type="date" value={advancedFilters.lastAccessDateTo} onChange={(e) => {
                                  setAdvancedFilters({...advancedFilters, lastAccessDateTo: e.target.value})
                                  if (selectedFilterId) setUnsavedChanges(true)
                                }} className="h-8 text-sm flex-1" />
                              </div>
                            </div>

                            <div>
                              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">Última Atualização</label>
                              <div className="flex gap-2">
                                <Input type="date" value={advancedFilters.lastUpdateDateFrom} onChange={(e) => {
                                  setAdvancedFilters({...advancedFilters, lastUpdateDateFrom: e.target.value})
                                  if (selectedFilterId) setUnsavedChanges(true)
                                }} className="h-8 text-sm flex-1" />
                                <Input type="date" value={advancedFilters.lastUpdateDateTo} onChange={(e) => {
                                  setAdvancedFilters({...advancedFilters, lastUpdateDateTo: e.target.value})
                                  if (selectedFilterId) setUnsavedChanges(true)
                                }} className="h-8 text-sm flex-1" />
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>

                        {/* SEÇÃO: MÉTRICAS */}
                        <AccordionItem value="metricas" className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                          <AccordionTrigger className="bg-white hover:bg-slate-50 px-4 py-3 transition-colors">
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">Métricas e Pontuação</span>
                          </AccordionTrigger>
                          <AccordionContent className="p-4 space-y-3 bg-white dark:bg-slate-800/50">
                            <div className="grid grid-cols-2 gap-3">
                              <Input
                                placeholder="Pontuação Mínima"
                                type="number"
                                value={advancedFilters.minScore}
                                onChange={(e) => {
                                  setAdvancedFilters({...advancedFilters, minScore: e.target.value})
                                  if (selectedFilterId) setUnsavedChanges(true)
                                }}
                                className="h-8 text-sm"
                              />
                              <Input
                                placeholder="Pontuação Máxima"
                                type="number"
                                value={advancedFilters.maxScore}
                                onChange={(e) => {
                                  setAdvancedFilters({...advancedFilters, maxScore: e.target.value})
                                  if (selectedFilterId) setUnsavedChanges(true)
                                }}
                                className="h-8 text-sm"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <Select value={advancedFilters.userLevel} onValueChange={(value) => {
                                setAdvancedFilters({...advancedFilters, userLevel: value})
                                if (selectedFilterId) setUnsavedChanges(true)
                              }}>
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue placeholder="Nível" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">Todos</SelectItem>
                                  <SelectItem value="iniciante">Iniciante</SelectItem>
                                  <SelectItem value="intermediario">Intermediário</SelectItem>
                                  <SelectItem value="avancado">Avançado</SelectItem>
                                </SelectContent>
                              </Select>

                              <Select value={advancedFilters.rating} onValueChange={(value) => {
                                setAdvancedFilters({...advancedFilters, rating: value})
                                if (selectedFilterId) setUnsavedChanges(true)
                              }}>
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue placeholder="Avaliação" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">Todas</SelectItem>
                                  <SelectItem value="5">5 Estrelas</SelectItem>
                                  <SelectItem value="4">4+ Estrelas</SelectItem>
                                  <SelectItem value="3">3+ Estrelas</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </AccordionContent>
                        </AccordionItem>

                        {/* SEÇÃO: DADOS COMPLEMENTARES */}
                        <AccordionItem value="complementares" className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                          <AccordionTrigger className="bg-white hover:bg-slate-50 px-4 py-3 transition-colors">
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">Dados Complementares</span>
                          </AccordionTrigger>
                          <AccordionContent className="p-4 space-y-3 bg-white dark:bg-slate-800/50">
                            <div className="grid grid-cols-2 gap-3">
                              <Select value={advancedFilters.hasCompany} onValueChange={(value) => {
                                setAdvancedFilters({...advancedFilters, hasCompany: value})
                                if (selectedFilterId) setUnsavedChanges(true)
                              }}>
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue placeholder="Empresa?" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">Todos</SelectItem>
                                  <SelectItem value="yes">Sim</SelectItem>
                                  <SelectItem value="no">Não</SelectItem>
                                </SelectContent>
                              </Select>

                              <Select value={advancedFilters.hasSpecialPermissions} onValueChange={(value) => {
                                setAdvancedFilters({...advancedFilters, hasSpecialPermissions: value})
                                if (selectedFilterId) setUnsavedChanges(true)
                              }}>
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue placeholder="Perms especiais?" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">Todos</SelectItem>
                                  <SelectItem value="yes">Sim</SelectItem>
                                  <SelectItem value="no">Não</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <Select value={advancedFilters.hasActiveWallet} onValueChange={(value) => {
                                setAdvancedFilters({...advancedFilters, hasActiveWallet: value})
                                if (selectedFilterId) setUnsavedChanges(true)
                              }}>
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue placeholder="Carteira?" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">Todos</SelectItem>
                                  <SelectItem value="yes">Sim</SelectItem>
                                  <SelectItem value="no">Não</SelectItem>
                                </SelectContent>
                              </Select>

                              <Select value={advancedFilters.hasFinancialActions} onValueChange={(value) => {
                                setAdvancedFilters({...advancedFilters, hasFinancialActions: value})
                                if (selectedFilterId) setUnsavedChanges(true)
                              }}>
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue placeholder="Ações financeiras?" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">Todos</SelectItem>
                                  <SelectItem value="yes">Sim</SelectItem>
                                  <SelectItem value="no">Não</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <Input
                                placeholder="Saldo Mínimo"
                                type="number"
                                value={advancedFilters.minBalance}
                                onChange={(e) => {
                                  setAdvancedFilters({...advancedFilters, minBalance: e.target.value})
                                  if (selectedFilterId) setUnsavedChanges(true)
                                }}
                                className="h-8 text-sm"
                              />
                              <Input
                                placeholder="Saldo Máximo"
                                type="number"
                                value={advancedFilters.maxBalance}
                                onChange={(e) => {
                                  setAdvancedFilters({...advancedFilters, maxBalance: e.target.value})
                                  if (selectedFilterId) setUnsavedChanges(true)
                                }}
                                className="h-8 text-sm"
                              />
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </div>
                  </div>

                  {/* Footer - Fixed at bottom */}
                  <div className="absolute bottom-0 left-0 right-0 flex flex-col gap-4 p-6 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-b-2xl">
                    {/* Save as Favorite section */}
                    <div className="space-y-3 pb-2">
                      <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30 hover:bg-blue-100 dark:hover:bg-blue-950/30 transition-colors">
                        <input
                          type="checkbox"
                          checked={saveAsFilter}
                          onChange={(e) => setSaveAsFilter(e.target.checked)}
                          className="rounded border-blue-300 dark:border-blue-600"
                        />
                        <span className="text-sm font-medium text-slate-900 dark:text-white">Salvar este filtro como favorito</span>
                      </label>
                      
                      {saveAsFilter && (
                        <div>
                          <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-2">
                            Nome do Filtro *
                          </label>
                          <Input
                            placeholder={isDuplicatingFilter ? "Ex: Nomads Ativos (Cópia)" : "Ex: Nomads Ativos com Pontuação Alta"}
                            value={filterName}
                            onChange={(e) => setFilterName(e.target.value)}
                            className="h-8 text-sm rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600"
                          />
                        </div>
                      )}
                    </div>

                    {/* Buttons */}
                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                      <Button
                        onClick={() => {
                          if (unsavedChanges) {
                            setPendingClose(() => () => {
                              setIsFilterModalOpen(false)
                              setSelectedFilterId(null)
                              setIsEditingFilter(false)
                              setUnsavedChanges(false)
                              setSaveAsFilter(false)
                              setFilterName("")
                              setIsDuplicatingFilter(false)
                            })
                            return
                          }
                          setIsFilterModalOpen(false)
                          setSelectedFilterId(null)
                          setIsEditingFilter(false)
                          setUnsavedChanges(false)
                          setSaveAsFilter(false)
                          setFilterName("")
                          setIsDuplicatingFilter(false)
                        }}
                        variant="outline"
                        size="sm"
                        className="px-4 py-2 text-sm rounded-lg"
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={() => {
                          if (saveAsFilter) {
                            if (!filterName.trim()) {
                              alert("Por favor, digite um nome para o filtro")
                              return
                            }
                            if (isDuplicatingFilter || !selectedFilterId) {
                              setSavedFilters([
                                ...savedFilters,
                                {
                                  id: Date.now().toString(),
                                  name: filterName,
                                  filters: { ...advancedFilters },
                                },
                              ])
                            } else {
                              const updatedFilters = savedFilters.map((f) =>
                                f.id === selectedFilterId
                                  ? { ...f, filters: { ...advancedFilters } }
                                  : f
                              )
                              setSavedFilters(updatedFilters)
                            }
                            setSaveAsFilter(false)
                            setFilterName("")
                            setIsDuplicatingFilter(false)
                            setUnsavedChanges(false)
                          }
                          setIsFilterModalOpen(false)
                        }}
                        size="sm"
                        className="px-4 py-2 text-sm rounded-lg btn-brand"
                      >
                        Aplicar Filtros
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Users Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200/60 dark:border-slate-700/60">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-white dark:bg-slate-900" style={{ borderRight: "1px solid rgba(148,163,184,0.25)" }}>
                      <SortableHeader label="Usuário" field="name" type="text" sortKey={userSortKey ? String(userSortKey) : null} sortDir={userSortDir} onSort={handleUserSort} />
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-white dark:bg-slate-900" style={{ borderRight: "1px solid rgba(148,163,184,0.25)" }}>Contato</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-white dark:bg-slate-900" style={{ borderRight: "1px solid rgba(148,163,184,0.25)" }}>
                      <SortableHeader label="Tipo / Função" field="account_type" type="status" sortKey={userSortKey ? String(userSortKey) : null} sortDir={userSortDir} onSort={handleUserSort} columnFilters={columnFilters} onFilter={toggleColumnFilter} onClearFilter={clearColumnFilter} filterValues={["company","nomad","agency"]} />
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-white dark:bg-slate-900" style={{ borderRight: "1px solid rgba(148,163,184,0.25)" }}>
                      <SortableHeader label="Status" field="is_active" type="status" sortKey={userSortKey ? String(userSortKey) : null} sortDir={userSortDir} onSort={handleUserSort} columnFilters={columnFilters} onFilter={toggleColumnFilter} onClearFilter={clearColumnFilter} filterValues={["true","false"]} />
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-white dark:bg-slate-900" style={{ borderRight: "1px solid rgba(148,163,184,0.25)" }}>
                      <SortableHeader label="Último Acesso" field="last_login" type="date" sortKey={userSortKey ? String(userSortKey) : null} sortDir={userSortDir} onSort={handleUserSort} />
                    </th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-white dark:bg-slate-900" style={{ position: "sticky", right: 0, zIndex: 2, borderLeft: "1px solid rgba(148,163,184,0.25)" }}>Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedUsers.map((user) => {
                    const accountBadge = getAccountTypeBadge(user.account_type, user.role)
                    const canDelete = user.id !== currentUserId && !(user.is_admin && user.role === "admin")

                    return (
                      <tr
                        key={user.id}
                        className={`group transition-colors cursor-pointer ${paginatedUsers.indexOf(user) % 2 === 0 ? "bg-white hover:bg-slate-50" : "bg-slate-200/50 hover:bg-slate-200/70"} dark:hover:bg-slate-700/50`}
                      >
                        <td className="px-5 py-3.5" style={{ borderRight: "1px solid rgba(148,163,184,0.15)" }}>
                          <div className="flex items-center gap-2.5">
                            <div className="relative">
                              <Avatar className="h-7 w-7">
                                <AvatarFallback
                                  className={`text-xs font-semibold ${
                                    (user.account_type === "company" || user.account_type === "empresas")
                                      ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                                      : (user.account_type === "agency" || user.account_type === "agencias")
                                      ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                                      : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                  }`}
                                >
                                  {user.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .toUpperCase()
                                    .slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="absolute -bottom-0.5 -right-0.5 scale-75">
                                      {getOnlineStatusIndicator(user.online_status)}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent className="text-xs">
                                    {user.online_status === "online" && "Online agora"}
                                    {user.online_status === "offline" && "Offline"}
                                    {user.online_status === "busy" && "Ocupado"}
                                    {user.online_status === "away" && "Ausente"}
                                    {user.last_login && (
                                      <div>
                                        Última atividade: {new Date(user.last_login).toLocaleDateString("pt-BR")} às{" "}
                                        {new Date(user.last_login).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                      </div>
                                    )}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-xs text-slate-900 dark:text-slate-100 truncate">{user.name}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5" style={{ borderRight: "1px solid rgba(148,163,184,0.15)" }}>
                          <div className="flex items-center gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handlePhoneCall(user.phone)}
                                    className="h-5 w-5 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded"
                                  >
                                    <Phone className="h-2.5 w-2.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="text-xs">Ligar</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleWhatsApp(user.phone)}
                                    className="h-5 w-5 p-0 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/30 rounded"
                                  >
                                    <MessageCircle className="h-2.5 w-2.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="text-xs">WhatsApp</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </td>
                        <td className="px-5 py-3.5" style={{ borderRight: "1px solid rgba(148,163,184,0.15)" }}>
                          <div className="space-y-0.5">
                            <Badge className={`text-xs px-2 py-0.5 ${accountBadge.color}`}>{accountBadge.label}</Badge>
                            <p className="text-xs text-slate-600 dark:text-slate-400">{getRoleLabel(user.role)}</p>
                            {!user.lgpd?.consent_given && (
                              <Badge className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 border-0">Sem consentimento LGPD</Badge>
                            )}
                            {user.lgpd?.deletion_requested && (
                              <Badge className="text-xs px-2 py-0.5 bg-red-100 text-red-700 border-0">Exclusão solicitada</Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5" style={{ borderRight: "1px solid rgba(148,163,184,0.15)" }}>
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                              user.is_active
                                ? "bg-emerald-500 text-white"
                                : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                            }`}
                          >
                            {user.is_active ? "Ativo" : "Inativo"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5" style={{ borderRight: "1px solid rgba(148,163,184,0.15)" }}>
                          <div>
                            <p className="text-xs font-medium text-slate-900 dark:text-slate-100">{user.last_login ? new Date(user.last_login).toLocaleDateString("pt-BR") : "Nunca"}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {user.last_login ? new Date(user.last_login).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : ""}
                            </p>
                          </div>
                        </td>
                        <td
                          className="px-5 py-3.5"
                          style={{
                            position: "sticky",
                            right: 0,
                            zIndex: 1,
                            background: paginatedUsers.indexOf(user) % 2 === 0 ? "#ffffff" : "#f1f4f8",
                            borderLeft: "1px solid rgba(148,163,184,0.25)",
                          }}
                        >
                          <div className="flex items-center justify-end gap-0">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleUserAction(user, "view")}
                                    className="h-5 w-5 p-0 rounded text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30"
                                  >
                                    <Eye className="h-2.5 w-2.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="text-xs">Ver Detalhes</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleUserAction(user, "block")}
                                    className={`h-5 w-5 p-0 rounded ${
                                      user.is_active
                                        ? "text-amber-500 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/30"
                                        : "text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                                    }`}
                                  >
                                    {user.is_active ? <UserX className="h-2.5 w-2.5" /> : <Shield className="h-2.5 w-2.5" />}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="text-xs">
                                  {user.is_active ? "Bloquear" : "Desbloquear"}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleUserAction(user, "delete")}
                                    disabled={!canDelete}
                                    className={`h-5 w-5 p-0 rounded ${
                                      canDelete
                                        ? "text-red-400 hover:text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
                                        : "opacity-40 cursor-not-allowed"
                                    }`}
                                  >
                                    <Trash2 className="h-2.5 w-2.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="text-xs">
                                  {!canDelete ? "Não pode deletar este usuário" : "Deletar usuário"}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Empty State */}
            {paginatedUsers.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                  <Users className="h-7 w-7 opacity-40" />
                </div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Nenhum usuário encontrado</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Tente ajustar os filtros ou busca</p>
              </div>
            )}

            {/* Bottom Pagination */}
            {filteredUsers.length > 0 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20">
                <div className="flex items-center gap-2">
                  <ItemsPerPageSelect
                    value={pageSize.toString()}
                    onValueChange={(value) => { setPageSize(Number(value)); setCurrentPage(1) }}
                    variant="bottom"
                  />
                  <span className="text-xs text-slate-400">
                    de {filteredUsers.length} usuário{filteredUsers.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="h-7 w-7 flex items-center justify-center rounded-full text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  {getPageNumbers().map((page, index) =>
                    page === "..." ? (
                      <span key={index} className="text-xs text-slate-300 px-0.5">·</span>
                    ) : (
                      <button
                        key={index}
                        onClick={() => setCurrentPage(Number(page))}
                        className={`h-7 w-7 flex items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                          page === currentPage
                            ? "bg-blue-500 text-white shadow-sm shadow-blue-200 dark:shadow-blue-900/40"
                            : "text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400"
                        }`}
                      >
                        {page}
                      </button>
                    )
                  )}
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="h-7 w-7 flex items-center justify-center rounded-full text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {isViewDialogOpen && (
        <UserViewSlidePanel
          open={isViewDialogOpen}
          onClose={() => {
            setIsViewDialogOpen(false)
            setSelectedUser(null)
          }}
          onRefresh={refetchUsers}
          user={selectedUser}
        />
      )}

      <UserCreateSlidePanel
        open={showCreateUser}
        onClose={() => setShowCreateUser(false)}
        onUserCreated={() => {
          refetchUsers()
          setShowCreateUser(false)
        }}
      />

      <ConfirmationDialog
        open={isDeleteAlertOpen && !!selectedUser}
        onClose={() => setIsDeleteAlertOpen(false)}
        onConfirm={() => handleStatusConfirmation("Desconhecido", "indefinite")}
        title={selectedUser?.is_active ? "Bloquear Usuário" : "Desbloquear Usuário"}
        message={
          selectedUser?.is_active
            ? `Tem certeza que deseja bloquear o usuário "${selectedUser?.name}"? Ele não poderá acessar a plataforma enquanto estiver bloqueado.`
            : `Tem certeza que deseja desbloquear o usuário "${selectedUser?.name}"? Ele voltará a ter acesso à plataforma.`
        }
        confirmText={selectedUser?.is_active ? "Bloquear" : "Desbloquear"}
        cancelText="Cancelar"
        destructive={selectedUser?.is_active}
      />

      <ConfirmationDialog
        open={pendingClose !== null}
        onClose={() => setPendingClose(null)}
        onConfirm={() => { pendingClose?.(); setPendingClose(null) }}
        title="Alterações não salvas"
        message="Você tem alterações não salvas. Deseja sair sem salvar?"
        confirmText="Sair sem salvar"
        cancelText="Cancelar"
        destructive={false}
      />

      {isDeleteUserAlertOpen && selectedUser && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40"
          onClick={() => { if (!isDeleteLoading) setIsDeleteUserAlertOpen(false) }}
        >
          <div
            className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden border border-slate-200 dark:border-slate-700"
            onClick={e => e.stopPropagation()}
          >
            {/* Top accent bar */}
            <div className="h-1 w-full bg-gradient-to-r from-red-500 to-rose-600" />

            {/* Header */}
            <div className="flex items-start justify-between px-6 pt-5 pb-0">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 dark:bg-red-900/20">
                <Trash2 className="h-5 w-5 text-red-500" />
              </div>
              <button
                onClick={() => { if (!isDeleteLoading) setIsDeleteUserAlertOpen(false) }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg p-1.5 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 pt-4 pb-4 space-y-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">Excluir Usuário</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Tem certeza que deseja excluir este usuário? Esta ação é <strong>irreversível</strong>.
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3">
                <div className="text-sm font-semibold text-slate-900 dark:text-white">{selectedUser.name}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{selectedUser.email}</div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  Motivo da Exclusão <span className="text-red-500">*</span>
                </label>
                <Textarea
                  placeholder="Descreva o motivo da exclusão para fins de auditoria (mínimo 10 caracteres)"
                  value={deletionReason}
                  onChange={(e) => {
                    setDeletionReason(e.target.value)
                    if (deletionReasonError) setDeletionReasonError("")
                  }}
                  disabled={isDeleteLoading}
                  className="text-sm resize-none focus-visible:ring-red-500"
                  rows={3}
                />
                {deletionReasonError && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />{deletionReasonError}
                  </p>
                )}
                <p className="text-xs text-slate-400">Caracteres: {deletionReason.length}/10 (mínimo)</p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 pb-5">
              <Button
                variant="outline"
                className="flex-1 h-9 text-sm border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={() => setIsDeleteUserAlertOpen(false)}
                disabled={isDeleteLoading}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 h-9 text-sm font-semibold text-white border-0 shadow-sm bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleDeleteUser}
                disabled={isDeleteLoading || !deletionReason.trim()}
              >
                {isDeleteLoading ? (
                  <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Excluindo...</>
                ) : (
                  <><Trash2 className="h-3.5 w-3.5 mr-1.5" />Excluir Definitivamente</>
                )}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
