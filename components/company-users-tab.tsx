
import { Trash2, Edit2, Eye, Lock, Unlock, Shield, Plus, Search, X, ChevronLeft, ChevronRight, Filter, Mail, CheckCircle, PauseCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts"
import { ConfirmationDialog } from "@/components/confirmation-dialog"
import { ItemsPerPageSelect } from "@/components/items-per-page-select"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { useState } from "react"
import { useSidebar } from "@/contexts/sidebar-context"

interface UserListItem {
  id: number
  name: string
  email: string
  avatar: string
  status: "online" | "offline"
  profile: string
  lastAccess: string
  createdAt: string
  isBlocked: boolean
  cpf?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  averageOnlineHours?: number
  averageOfflineDays?: number
  permissions?: UserPermissions
}

interface Permission {
  id: string
  name: string
  enabled: boolean
}

interface UserPermissions {
  [key: string]: Permission[]
}

interface CompanyUsersTabProps {
  companyId: number
  companyName: string
  users?: UserListItem[]
}

const DEFAULT_USERS: UserListItem[] = [
  {
    id: 1,
    name: "Ana Silva",
    email: "ana.silva@empresa.com",
    avatar: "AS",
    status: "online",
    profile: "Administrador",
    lastAccess: "Há 2 horas",
    createdAt: "12/01/2024",
    isBlocked: false,
    cpf: "123.456.789-00",
    phone: "(11) 98765-4321",
    address: "Rua das Flores, 123",
    city: "São Paulo",
    state: "SP",
    zipCode: "01234-567",
    averageOnlineHours: 2.5,
    averageOfflineDays: 1,
    permissions: {
      gestao: [
        { id: "hire_services", name: "Contratar serviços", enabled: true },
        { id: "insert_credit", name: "Inserir crédito", enabled: true },
        { id: "approve_payments", name: "Aprovar pagamentos", enabled: true },
      ],
      tasks: [
        { id: "create_tasks", name: "Criar tarefas", enabled: true },
        { id: "approve_tasks", name: "Aprovar tarefas", enabled: true },
        { id: "edit_tasks", name: "Editar tarefas", enabled: true },
        { id: "delete_tasks", name: "Excluir tarefas", enabled: false },
      ],
      projects: [
        { id: "create_projects", name: "Criar projetos", enabled: true },
        { id: "edit_projects", name: "Editar projetos", enabled: true },
        { id: "delete_projects", name: "Excluir projetos", enabled: false },
      ],
      users: [
        { id: "create_users", name: "Criar usuários", enabled: true },
        { id: "edit_users", name: "Editar usuários", enabled: true },
        { id: "block_users", name: "Bloquear usuários", enabled: true },
      ],
    },
  },
  {
    id: 2,
    name: "Carlos Santos",
    email: "carlos.santos@empresa.com",
    avatar: "CS",
    status: "online",
    profile: "Gerente",
    lastAccess: "Há 30 minutos",
    createdAt: "15/01/2024",
    isBlocked: false,
    cpf: "987.654.321-00",
    phone: "(11) 99876-5432",
    address: "Avenida Principal, 456",
    city: "São Paulo",
    state: "SP",
    zipCode: "02345-678",
    averageOnlineHours: 3.2,
    averageOfflineDays: 1.5,
  },
  {
    id: 3,
    name: "Marina Costa",
    email: "marina.costa@empresa.com",
    avatar: "MC",
    status: "offline",
    profile: "Operador",
    lastAccess: "Ontem",
    createdAt: "18/01/2024",
    isBlocked: false,
    cpf: "456.789.012-00",
    phone: "(11) 97654-3210",
    address: "Rua dos Pinheiros, 789",
    city: "São Paulo",
    state: "SP",
    zipCode: "03456-789",
    averageOnlineHours: 2.8,
    averageOfflineDays: 2,
  },
  {
    id: 4,
    name: "Paulo Oliveira",
    email: "paulo.oliveira@empresa.com",
    avatar: "PO",
    status: "offline",
    profile: "Operador",
    lastAccess: "2 dias atrás",
    createdAt: "10/01/2024",
    isBlocked: false,
    cpf: "789.012.345-00",
    phone: "(11) 96543-2109",
    address: "Rua da Paz, 321",
    city: "São Paulo",
    state: "SP",
    zipCode: "04567-890",
    averageOnlineHours: 2.2,
    averageOfflineDays: 3,
  },
  {
    id: 5,
    name: "Rita Alves",
    email: "rita.alves@empresa.com",
    avatar: "RA",
    status: "offline",
    profile: "Visualizador",
    lastAccess: "3 dias atrás",
    createdAt: "08/01/2024",
    isBlocked: true,
    cpf: "321.098.765-00",
    phone: "(11) 95432-1098",
    address: "Rua da Esperança, 654",
    city: "São Paulo",
    state: "SP",
    zipCode: "05678-901",
    averageOnlineHours: 1.8,
    averageOfflineDays: 5,
  },
]

const timelineData = [
  { day: "Seg", hours: 2.5 },
  { day: "Ter", hours: 3.2 },
  { day: "Qua", hours: 2.8 },
  { day: "Qui", hours: 3.5 },
  { day: "Sex", hours: 2.2 },
  { day: "Sab", hours: 1.8 },
  { day: "Dom", hours: 0.5 },
]

export function CompanyUsersTab({ companyId, companyName, users }: CompanyUsersTabProps) {
  const { sidebarWidth } = useSidebar()
  const [userList, setUserList] = useState<UserListItem[]>(users || DEFAULT_USERS)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState<Partial<UserListItem> | null>(null)
  const [confirmSave, setConfirmSave] = useState(false)
  const [permissionsMode, setPermissionsMode] = useState(false)
  const [permissionsData, setPermissionsData] = useState<UserPermissions | null>(null)
  const [initialPermissionsData, setInitialPermissionsData] = useState<UserPermissions | null>(null)
  const [hasPermissionChanges, setHasPermissionChanges] = useState(false)
  const [confirmSavePermissions, setConfirmSavePermissions] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [unsavedChangesDialog, setUnsavedChangesDialog] = useState({
    open: false,
    pendingAction: null as (() => void) | null,
  })
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [newUserData, setNewUserData] = useState({
    name: "",
    email: "",
    cpf: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    profile: "User",
    status: "active",
  })
  const [confirmAddUser, setConfirmAddUser] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    action: null as "block" | "delete" | null,
    userId: null as number | null,
  })

  const handleViewDetails = (user: UserListItem) => {
    setSelectedUser(user)
    setIsDetailsOpen(true)
  }

  const handleEditUser = () => {
    if (hasUnsavedChanges && (editMode || permissionsMode)) {
      setUnsavedChangesDialog({
        open: true,
        pendingAction: () => {
          setEditMode(true)
          if (selectedUser) {
            setEditData({
              name: selectedUser.name,
              email: selectedUser.email,
              phone: selectedUser.phone || "",
              address: selectedUser.address || "",
              city: selectedUser.city || "",
              state: selectedUser.state || "",
              zipCode: selectedUser.zipCode || "",
            })
          }
        },
      })
      return
    }
    
    setEditMode(true)
    setPermissionsMode(false)
    setPermissionsData(null)
    setInitialPermissionsData(null)
    if (selectedUser) {
      setEditData({
        name: selectedUser.name,
        email: selectedUser.email,
        phone: selectedUser.phone || "",
        address: selectedUser.address || "",
        city: selectedUser.city || "",
        state: selectedUser.state || "",
        zipCode: selectedUser.zipCode || "",
      })
    }
  }

  const handleCancelEdit = () => {
    setEditMode(false)
    setEditData(null)
    setHasUnsavedChanges(false)
  }

  const handleSaveClick = () => {
    setConfirmSave(true)
  }

  const handleConfirmSave = () => {
    if (selectedUser && editData) {
      const updatedUser = { ...selectedUser, ...editData }
      setUserList((prevUsers) =>
        prevUsers.map((u) => (u.id === selectedUser.id ? updatedUser : u))
      )
      setSelectedUser(updatedUser)
      setEditMode(false)
      setEditData(null)
      setConfirmSave(false)
      setHasUnsavedChanges(false)
    }
  }

  const handleEditFieldChange = (field: string, value: string) => {
    setEditData((prev) => (prev ? { ...prev, [field]: value } : null))
    setHasUnsavedChanges(true)
  }

  const comparePermissions = (perm1: UserPermissions | null, perm2: UserPermissions | null): boolean => {
    if (!perm1 || !perm2) return false
    return JSON.stringify(perm1) === JSON.stringify(perm2)
  }

  const handleOpenPermissions = () => {
    if (hasUnsavedChanges && (editMode || permissionsMode)) {
      setUnsavedChangesDialog({
        open: true,
        pendingAction: () => {
          setPermissionsMode(true)
          setEditMode(false)
          setEditData(null)
          if (selectedUser?.permissions) {
            const permissionsCopy = JSON.parse(JSON.stringify(selectedUser.permissions))
            setPermissionsData(permissionsCopy)
            setInitialPermissionsData(permissionsCopy)
            setHasPermissionChanges(false)
          }
        },
      })
      return
    }
    
    setPermissionsMode(true)
    setEditMode(false)
    setEditData(null)
    if (selectedUser?.permissions) {
      const permissionsCopy = JSON.parse(JSON.stringify(selectedUser.permissions))
      setPermissionsData(permissionsCopy)
      setInitialPermissionsData(permissionsCopy)
      setHasPermissionChanges(false)
    }
  }

  const handleCancelPermissions = () => {
    setPermissionsMode(false)
    setPermissionsData(null)
    setInitialPermissionsData(null)
    setHasPermissionChanges(false)
    setHasUnsavedChanges(false)
  }

  const handleTogglePermission = (category: string, permissionId: string) => {
    if (permissionsData && permissionsData[category]) {
      setPermissionsData((prev) => {
        if (!prev) return null
        const updated = { ...prev }
        updated[category] = updated[category].map((p) =>
          p.id === permissionId ? { ...p, enabled: !p.enabled } : p
        )
        const hasChanges = !comparePermissions(updated, initialPermissionsData)
        setHasPermissionChanges(hasChanges)
        return updated
      })
    }
  }

  const handleSavePermissionsClick = () => {
    setConfirmSavePermissions(true)
  }

  const handleConfirmSavePermissions = () => {
    if (selectedUser && permissionsData) {
      const updatedUser = { ...selectedUser, permissions: permissionsData }
      setUserList((prevUsers) =>
        prevUsers.map((u) => (u.id === selectedUser.id ? updatedUser : u))
      )
      setSelectedUser(updatedUser)
      setInitialPermissionsData(permissionsData)
      setHasPermissionChanges(false)
      setHasUnsavedChanges(false)
      setConfirmSavePermissions(false)
    }
  }

  const handleBlockToggle = (userId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    const user = userList.find((u) => u.id === userId)
    if (user && !user.isBlocked) {
      setConfirmDialog({
        open: true,
        action: "block",
        userId,
      })
    } else {
      setConfirmDialog({
        open: true,
        action: "unblock",
        userId,
      })
    }
  }

  const handleDeleteUser = (userId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setConfirmDialog({
      open: true,
      action: "delete",
      userId,
    })
  }

  const handleConfirmAction = () => {
    if (confirmDialog.action === "block" && confirmDialog.userId) {
      setUserList((prevUsers) =>
        prevUsers.map((user) =>
          user.id === confirmDialog.userId
            ? { ...user, isBlocked: true }
            : user
        )
      )
      if (selectedUser?.id === confirmDialog.userId) {
        setSelectedUser({ ...selectedUser, isBlocked: true })
      }
    } else if (confirmDialog.action === "unblock" && confirmDialog.userId) {
      setUserList((prevUsers) =>
        prevUsers.map((user) =>
          user.id === confirmDialog.userId
            ? { ...user, isBlocked: false }
            : user
        )
      )
      if (selectedUser?.id === confirmDialog.userId) {
        setSelectedUser({ ...selectedUser, isBlocked: false })
      }
    } else if (confirmDialog.action === "delete" && confirmDialog.userId) {
      setUserList((prevUsers) =>
        prevUsers.filter((user) => user.id !== confirmDialog.userId)
      )
      if (selectedUser?.id === confirmDialog.userId) {
        setIsDetailsOpen(false)
        setSelectedUser(null)
      }
    }
    setConfirmDialog({ open: false, action: null, userId: null })
  }

  const handleAddUserClick = () => {
    setShowAddUserModal(true)
    setNewUserData({
      name: "",
      email: "",
      cpf: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      profile: "User",
      status: "active",
    })
  }

  const handleNewUserFieldChange = (field: string, value: string) => {
    setNewUserData((prev) => ({ ...prev, [field]: value }))
  }

  const validateNewUser = (): boolean => {
    return (
      newUserData.name.trim() !== "" &&
      newUserData.email.trim() !== "" &&
      newUserData.email.includes("@") &&
      newUserData.cpf.trim() !== "" &&
      newUserData.phone.trim() !== ""
    )
  }

  const handleConfirmAddUser = () => {
    if (!validateNewUser()) {
      alert("Por favor, preencha todos os campos obrigatórios corretamente.")
      return
    }
    setConfirmAddUser(true)
  }

  const handleCreateUser = () => {
    const newUser: UserListItem = {
      id: Math.max(...userList.map((u) => u.id), 0) + 1,
      name: newUserData.name,
      email: newUserData.email,
      avatar: newUserData.name.substring(0, 2).toUpperCase(),
      status: "online",
      profile: newUserData.profile,
      lastAccess: "Agora",
      createdAt: new Date().toLocaleDateString("pt-BR"),
      isBlocked: false,
      cpf: newUserData.cpf,
      phone: newUserData.phone,
      address: newUserData.address,
      city: newUserData.city,
      state: newUserData.state,
      zipCode: newUserData.zipCode,
    }
    setUserList((prev) => [newUser, ...prev])
    setShowAddUserModal(false)
    setConfirmAddUser(false)
    setNewUserData({
      name: "",
      email: "",
      cpf: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      profile: "User",
      status: "active",
    })
  }

  const onlineCount = userList.filter((u) => u.status === "online").length
  const blockedCount = userList.filter((u) => u.isBlocked).length

  // Filtrar usuários baseado no termo de pesquisa
  const filteredUsers = userList.filter((user) =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.cpf?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Calcular paginação
  const totalPages = Math.ceil(filteredUsers.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex)

  // Resetar para página 1 ao mudar page size ou termo de pesquisa
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize)
    setCurrentPage(1)
  }

  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1)
  }

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const handlePageClick = (page: number) => {
    setCurrentPage(page)
  }

  const getPageNumbers = (): (number | string)[] => {
    const pages: (number | string)[] = []
    const maxVisible = 5
    const half = Math.floor(maxVisible / 2)
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else if (currentPage <= half + 1) {
      for (let i = 1; i <= maxVisible; i++) pages.push(i)
      pages.push("...")
    } else if (currentPage >= totalPages - half) {
      pages.push("...")
      for (let i = totalPages - maxVisible + 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push("...")
      for (let i = currentPage - half; i <= currentPage + half; i++) pages.push(i)
      pages.push("...")
    }
    return pages
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto">
        <div className="px-8 pt-5 pb-2 space-y-3">
          {/* Compact Stats Row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600">
                <Shield className="h-3.5 w-3.5 text-white" />
              </div>
              <div>
                <p className="text-xs text-slate-500 leading-none mb-0.5">Total</p>
                <p className="text-lg font-bold text-blue-600 leading-none">{userList.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-3 py-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-600">
                <span className="h-2.5 w-2.5 rounded-full bg-white" />
              </div>
              <div>
                <p className="text-xs text-slate-500 leading-none mb-0.5">Online</p>
                <p className="text-lg font-bold text-green-600 leading-none">{onlineCount}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500">
                <Lock className="h-3.5 w-3.5 text-white" />
              </div>
              <div>
                <p className="text-xs text-slate-500 leading-none mb-0.5">Bloqueados</p>
                <p className="text-lg font-bold text-red-600 leading-none">{blockedCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Global-standard Table Card */}
        <div className="mx-8 mb-5 border border-slate-200/70 rounded-lg overflow-hidden shadow-sm">

          {/* Top Bar — matches empresas page */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200/70 bg-slate-50/60">
            {/* Search */}
            <div className="flex-1 relative min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por nome ou e-mail..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9 h-9 text-sm bg-white border-slate-200 rounded-lg focus-visible:ring-blue-500 w-full"
              />
            </div>

            {/* Items per page + count */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <ItemsPerPageSelect
                value={pageSize.toString()}
                onValueChange={(value) => { handlePageSizeChange(Number(value)) }}
                variant="top"
              />
              <span className="text-xs text-slate-400 whitespace-nowrap">
                {filteredUsers.length !== userList.length
                  ? <>de <span className="font-semibold text-blue-500">{filteredUsers.length}</span> de {userList.length} usuário{userList.length !== 1 ? "s" : ""}</>
                  : <>de <span className="font-semibold text-slate-600">{userList.length}</span> usuário{userList.length !== 1 ? "s" : ""}</>
                }
              </span>
            </div>

            {/* Add User button */}
            <Button
              onClick={handleAddUserClick}
              size="sm"
              className="h-9 gap-2 px-3.5 text-xs bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white border-0 shadow-sm flex-shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar
            </Button>

            {/* Pagination */}
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <button
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
                className="h-7 w-7 flex items-center justify-center rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              {getPageNumbers().map((page, index) =>
                page === "..." ? (
                  <span key={index} className="text-xs text-slate-300 px-0.5">·</span>
                ) : (
                  <button
                    key={index}
                    onClick={() => handlePageClick(Number(page))}
                    className={`h-7 w-7 flex items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                      page === currentPage
                        ? "bg-blue-500 text-white shadow-sm shadow-blue-200"
                        : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {page}
                  </button>
                )
              )}
              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages || totalPages === 0}
                className="h-7 w-7 flex items-center justify-center rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200/60">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Usuário</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">E-mail</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Perfil · Último acesso</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedUsers.length > 0 ? (
                  paginatedUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="group hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      {/* Usuário */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.avatar}`} />
                              <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-semibold">
                                {user.avatar}
                              </AvatarFallback>
                            </Avatar>
                            <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${user.status === "online" ? "bg-green-500" : "bg-slate-300"}`} />
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-slate-900">{user.name}</p>
                            {user.isBlocked && (
                              <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 mt-0.5">Bloqueado</Badge>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* E-mail */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-3 w-3 text-slate-400 flex-shrink-0" />
                          <span className="text-xs text-slate-600 truncate max-w-[160px]">{user.email}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            user.isBlocked
                              ? "bg-red-100 text-red-700 border border-red-200"
                              : user.status === "online"
                              ? "bg-emerald-500 text-white"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {user.isBlocked ? (
                            <Lock className="h-3 w-3" />
                          ) : user.status === "online" ? (
                            <CheckCircle className="h-3 w-3" />
                          ) : (
                            <PauseCircle className="h-3 w-3" />
                          )}
                          {user.isBlocked ? "Bloqueado" : user.status === "online" ? "Online" : "Offline"}
                        </span>
                      </td>

                      {/* Perfil + Último acesso */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-1">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                            user.profile === "Administrador"
                              ? "bg-violet-50 text-violet-700 border-violet-200"
                              : user.profile === "Gerente"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-slate-50 text-slate-600 border-slate-200"
                          }`}>
                            {user.profile}
                          </span>
                          <p className="text-xs text-slate-400 pl-0.5">{user.lastAccess}</p>
                        </div>
                      </td>

                      {/* Ações */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost" size="sm"
                                className="h-8 w-8 p-0 rounded-lg text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                onClick={() => handleViewDetails(user)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs">Ver detalhes</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost" size="sm"
                                className={`h-8 w-8 p-0 rounded-lg ${
                                  user.isBlocked
                                    ? "text-red-400 hover:text-red-600 hover:bg-red-50"
                                    : "text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50"
                                }`}
                                onClick={(e) => handleBlockToggle(user.id, e)}
                              >
                                {user.isBlocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs">{user.isBlocked ? "Desbloquear" : "Bloquear"}</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost" size="sm"
                                className="h-8 w-8 p-0 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50"
                                onClick={(e) => handleDeleteUser(user.id, e)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs">Excluir</TooltipContent>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                          <Shield className="h-6 w-6 opacity-40" />
                        </div>
                        <p className="text-sm font-medium text-slate-500">
                          {searchTerm ? "Nenhum usuário encontrado" : "Nenhum usuário cadastrado"}
                        </p>
                        {searchTerm && (
                          <p className="text-xs text-slate-400">Tente ajustar o termo de busca</p>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Bottom Pagination — matches empresas page */}
          {filteredUsers.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/40">
              <div className="flex items-center gap-2">
                <ItemsPerPageSelect
                  value={pageSize.toString()}
                  onValueChange={(value) => { handlePageSizeChange(Number(value)) }}
                  variant="bottom"
                />
                <span className="text-xs text-slate-400">
                  de {filteredUsers.length} usuário{filteredUsers.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex items-center gap-0.5">
                <button
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  className="h-7 w-7 flex items-center justify-center rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                {getPageNumbers().map((page, index) =>
                  page === "..." ? (
                    <span key={index} className="text-xs text-slate-300 px-0.5">·</span>
                  ) : (
                    <button
                      key={index}
                      onClick={() => handlePageClick(Number(page))}
                      className={`h-7 w-7 flex items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                        page === currentPage
                          ? "bg-blue-500 text-white shadow-sm shadow-blue-200"
                          : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {page}
                    </button>
                  )
                )}
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="h-7 w-7 flex items-center justify-center rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* User Details Sheet */}
      <Sheet 
        open={isDetailsOpen} 
        onOpenChange={(open) => {
          setIsDetailsOpen(open)
          if (!open) {
            setEditMode(false)
            setEditData(null)
            setPermissionsMode(false)
            setPermissionsData(null)
          }
        }}
      >
        <SheetContent side="right" className="!w-1/2 !max-w-none border-l flex flex-col p-0 overflow-hidden" style={{ width: '50vw', right: 0 }}>
          {selectedUser && (
            <div className="h-full flex flex-col bg-white">
              {/* Header - Platform Standard - Fixed */}
              <header className="relative flex items-center justify-between gap-4 px-6 py-4 border-b bg-gradient-to-r from-blue-950 via-indigo-900 to-fuchsia-900 text-white flex-shrink-0 min-h-20">
                <div className="flex items-center gap-4 flex-1">
                  <Avatar className="h-16 w-16 border-3 border-white shadow-lg flex-shrink-0">
                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedUser.avatar}`} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-600 to-cyan-500 text-white text-lg font-semibold">
                      {selectedUser.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h1 className="text-xl font-bold">{selectedUser.name}</h1>
                    <p className="text-blue-100 text-xs mt-0.5">{selectedUser.email}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`inline-flex h-2.5 w-2.5 rounded-full ${selectedUser.status === "online" ? "bg-green-400" : "bg-gray-300"}`} />
                      <span className="text-xs font-medium">
                        {selectedUser.status === "online" ? "Online" : "Offline"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-white hover:bg-white/20"
                          onClick={handleEditUser}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Editar</TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-white hover:bg-white/20"
                          onClick={handleOpenPermissions}
                        >
                          <Shield className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Permissões</TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-white hover:bg-white/20"
                          onClick={(e) => handleBlockToggle(selectedUser.id, e as React.MouseEvent<HTMLButtonElement>)}
                        >
                          {selectedUser.isBlocked ? (
                            <Unlock className="h-4 w-4" />
                          ) : (
                            <Lock className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {selectedUser.isBlocked ? "Desbloquear" : "Bloquear"}
                      </TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-200 hover:bg-red-600/20"
                          onClick={(e) => handleDeleteUser(selectedUser.id, e as React.MouseEvent<HTMLButtonElement>)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Deletar</TooltipContent>
                    </Tooltip>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-white/20 flex-shrink-0"
                      onClick={() => setIsDetailsOpen(false)}
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </header>

              {/* Content - Scrollable */}
              <div className={`flex-1 overflow-y-auto p-8 ${editMode || permissionsMode ? 'pb-20' : ''}`}>
                {!permissionsMode ? (
                  <>
                {/* Two Column Layout */}
                <div className="grid grid-cols-2 gap-8">
                  {/* Left Column */}
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wide">Dados da Conta</h2>
                    <div className="space-y-3">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                        <span className="text-xs font-semibold text-slate-600 uppercase">ID do Usuário</span>
                        <code className="text-sm font-mono font-bold text-slate-900 block mt-2">#{selectedUser.id}</code>
                      </div>

                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                        <span className="text-xs font-semibold text-slate-600 uppercase">Perfil</span>
                        <p className="text-sm font-bold text-slate-900 mt-2">{selectedUser.profile}</p>
                      </div>

                      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                        <span className="text-xs font-semibold text-slate-600 uppercase">Status</span>
                        <Badge className={`mt-2 ${selectedUser.isBlocked ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                          {selectedUser.isBlocked ? "Bloqueado" : "Ativo"}
                        </Badge>
                      </div>

                      <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4 border border-amber-200">
                        <span className="text-xs font-semibold text-slate-600 uppercase">Último Acesso</span>
                        <p className="text-sm font-bold text-slate-900 mt-2">{selectedUser.lastAccess}</p>
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wide">Dados Pessoais</h2>
                    {!editMode ? (
                      <div className="space-y-2 text-xs">
                        <div>
                          <label className="font-semibold text-slate-600 uppercase">Nome</label>
                          <p className="text-slate-900 mt-1 font-medium">{selectedUser.name}</p>
                        </div>
                        <div>
                          <label className="font-semibold text-slate-600 uppercase">CPF</label>
                          <p className="text-slate-900 mt-1 font-medium">{selectedUser.cpf || "Não informado"}</p>
                        </div>
                        <div>
                          <label className="font-semibold text-slate-600 uppercase">Email</label>
                          <p className="text-slate-900 mt-1 font-medium break-all">{selectedUser.email}</p>
                        </div>
                        <div>
                          <label className="font-semibold text-slate-600 uppercase">Telefone</label>
                          <p className="text-slate-900 mt-1 font-medium">{selectedUser.phone || "Não informado"}</p>
                        </div>
                        <div>
                          <label className="font-semibold text-slate-600 uppercase">Endereço</label>
                          <p className="text-slate-900 mt-1 font-medium">{selectedUser.address || "Não informado"}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="font-semibold text-slate-600 uppercase">Cidade</label>
                            <p className="text-slate-900 mt-1 font-medium">{selectedUser.city || "Não informado"}</p>
                          </div>
                          <div>
                            <label className="font-semibold text-slate-600 uppercase">Estado</label>
                            <p className="text-slate-900 mt-1 font-medium">{selectedUser.state || "Não informado"}</p>
                          </div>
                        </div>
                        <div>
                          <label className="font-semibold text-slate-600 uppercase">CEP</label>
                          <p className="text-slate-900 mt-1 font-medium">{selectedUser.zipCode || "Não informado"}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <label className="font-semibold text-slate-600 uppercase text-xs">Nome Completo</label>
                          <Input
                            value={editData?.name || ""}
                            onChange={(e) => handleEditFieldChange("name", e.target.value)}
                            placeholder="Nome completo"
                            className="mt-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="font-semibold text-slate-600 uppercase text-xs">Email</label>
                          <Input
                            value={editData?.email || ""}
                            onChange={(e) => handleEditFieldChange("email", e.target.value)}
                            placeholder="email@exemplo.com"
                            type="email"
                            className="mt-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="font-semibold text-slate-600 uppercase text-xs">Telefone</label>
                          <Input
                            value={editData?.phone || ""}
                            onChange={(e) => handleEditFieldChange("phone", e.target.value)}
                            placeholder="(11) 98765-4321"
                            className="mt-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="font-semibold text-slate-600 uppercase text-xs">Endereço</label>
                          <Input
                            value={editData?.address || ""}
                            onChange={(e) => handleEditFieldChange("address", e.target.value)}
                            placeholder="Rua ou Avenida"
                            className="mt-1 text-sm"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="font-semibold text-slate-600 uppercase text-xs">Cidade</label>
                            <Input
                              value={editData?.city || ""}
                              onChange={(e) => handleEditFieldChange("city", e.target.value)}
                              placeholder="São Paulo"
                              className="mt-1 text-sm"
                            />
                          </div>
                          <div>
                            <label className="font-semibold text-slate-600 uppercase text-xs">Estado</label>
                            <Input
                              value={editData?.state || ""}
                              onChange={(e) => handleEditFieldChange("state", e.target.value)}
                              placeholder="SP"
                              maxLength={2}
                              className="mt-1 text-sm"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="font-semibold text-slate-600 uppercase text-xs">CEP</label>
                          <Input
                            value={editData?.zipCode || ""}
                            onChange={(e) => handleEditFieldChange("zipCode", e.target.value)}
                            placeholder="01234-567"
                            className="mt-1 text-sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Metrics */}
                <div className="border-t border-slate-200 pt-6">
                  <h2 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wide">Uso e Métricas</h2>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4 border border-yellow-200">
                      <span className="text-xs font-semibold text-slate-600 uppercase">Tempo Online</span>
                      <p className="text-lg font-bold text-yellow-600 mt-2">{selectedUser.averageOnlineHours || 2.5}h/dia</p>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
                      <span className="text-xs font-semibold text-slate-600 uppercase">Sem Acesso</span>
                      <p className="text-lg font-bold text-orange-600 mt-2">{selectedUser.averageOfflineDays || 1}d</p>
                    </div>
                  </div>
                </div>

                {/* Chart */}
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                  <h3 className="text-sm font-bold text-slate-900 mb-4">Tempo Online (7 dias)</h3>
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={timelineData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                        <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                        <YAxis tick={{ fontSize: 11 }} stroke="#9CA3AF" tickFormatter={(value) => `${value}h`} />
                        <RechartsTooltip contentStyle={{ backgroundColor: "#1F2937", border: "1px solid #374151", borderRadius: "8px" }} formatter={(value: number) => [`${value}h`, "Online"]} />
                        <Bar dataKey="hours" radius={[8, 8, 0, 0]} fill="#3B82F6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Permissions */}
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                  <h3 className="text-sm font-bold text-slate-900 mb-4">Permissões</h3>
                  <div className="flex flex-wrap gap-2">
                    <Badge className="bg-blue-100 text-blue-700 text-xs">Visualizar dados</Badge>
                    <Badge className="bg-green-100 text-green-700 text-xs">Editar configurações</Badge>
                    <Badge className="bg-purple-100 text-purple-700 text-xs">Gerenciar usuários</Badge>
                  </div>
                </div>

                {/* History */}
                <div className="bg-white border border-slate-200 rounded-lg p-4 pb-6">
                  <h3 className="text-sm font-bold text-slate-900 mb-4">Histórico de Acessos</h3>
                  <div className="space-y-1">
                    {[
                      { date: "Hoje", time: "14:30" },
                      { date: "Ontem", time: "10:15" },
                      { date: "2 dias atrás", time: "09:45" },
                      { date: "3 dias atrás", time: "16:20" },
                      { date: "4 dias atrás", time: "11:00" },
                    ].map((access, idx) => (
                      <div key={idx} className="flex justify-between text-xs py-2.5 px-2 border-b border-slate-100 last:border-0 hover:bg-slate-50 rounded">
                        <span className="text-slate-700 font-medium">{access.date}</span>
                        <span className="text-slate-500">{access.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
                  </>
                ) : (
                  /* Permissions Mode View */
                  <div className="space-y-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-bold text-slate-900">Gerenciar Permissões</h2>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCancelPermissions}
                        className="text-slate-500 hover:text-slate-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    {permissionsData && Object.entries(permissionsData).map(([categoryKey, categoryData]) => (
                      <div key={categoryKey} className="bg-white rounded-lg border border-slate-200 p-6">
                        <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wide">
                          {categoryKey === 'gestao' ? 'Gestão' : categoryKey === 'tasks' ? 'Tarefas' : categoryKey === 'projects' ? 'Projetos' : 'Usuários'}
                        </h3>
                        <div className="space-y-3">
                          {categoryData.map((permission) => (
                            <div key={permission.id} className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg">
                              <label className="text-sm font-medium text-slate-900 cursor-pointer">
                                {permission.name}
                              </label>
                              <Switch
                                checked={permission.enabled}
                                onCheckedChange={() =>
                                  handleTogglePermission(categoryKey, permission.id)
                                }
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Edit Mode Footer - Fixed */}
              {editMode && (
                <div className="sticky bottom-0 left-0 right-0 flex gap-2 px-6 py-4 border-t bg-white shadow-lg">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancelEdit}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveClick}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Salvar alterações
                  </Button>
                </div>
              )}

              {/* Permissions Mode Footer - Fixed (Only show if changes detected) */}
              {permissionsMode && hasPermissionChanges && (
                <div className="sticky bottom-0 left-0 right-0 flex gap-2 px-6 py-4 border-t bg-white shadow-lg">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancelPermissions}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSavePermissionsClick}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Salvar permissões
                  </Button>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, action: null, userId: null })}
        onConfirm={handleConfirmAction}
        title={
          confirmDialog.action === "block"
            ? "Bloquear Usuário"
            : confirmDialog.action === "unblock"
            ? "Desbloquear Usuário"
            : "Deletar Usuário"
        }
        message={
          confirmDialog.action === "block"
            ? `Tem certeza que deseja bloquear o usuário "${selectedUser?.name}"? Ele não poderá acessar até ser desbloqueado.`
            : confirmDialog.action === "unblock"
            ? `Tem certeza que deseja desbloquear o usuário "${selectedUser?.name}"?`
            : `Tem certeza que deseja deletar o usuário "${selectedUser?.name}"? Esta ação é irreversível.`
        }
        confirmText={
          confirmDialog.action === "block"
            ? "Bloquear"
            : confirmDialog.action === "unblock"
            ? "Desbloquear"
            : "Deletar"
        }
        cancelText="Cancelar"
        destructive={confirmDialog.action === "delete"}
      />

      {/* Save Confirmation Dialog */}
      <ConfirmationDialog
        open={confirmSave}
        onClose={() => setConfirmSave(false)}
        onConfirm={handleConfirmSave}
        title="Confirmar Alterações"
        message="Tem certeza que deseja salvar as alterações deste usuário?"
        confirmText="Confirmar"
        cancelText="Cancelar"
        destructive={false}
      />

      {/* Save Permissions Confirmation Dialog */}
      <ConfirmationDialog
        open={confirmSavePermissions}
        onClose={() => setConfirmSavePermissions(false)}
        onConfirm={handleConfirmSavePermissions}
        title="Confirmar Alterações de Permissões"
        message="Tem certeza que deseja atualizar as permissões deste usuário?"
        confirmText="Confirmar"
        cancelText="Cancelar"
        destructive={false}
      />

      {/* Unsaved Changes Warning Dialog */}
      <ConfirmationDialog
        open={unsavedChangesDialog.open}
        onClose={() => setUnsavedChangesDialog({ open: false, pendingAction: null })}
        onConfirm={() => {
          setUnsavedChangesDialog({ open: false, pendingAction: null })
          setEditMode(false)
          setEditData(null)
          setPermissionsMode(false)
          setPermissionsData(null)
          setInitialPermissionsData(null)
          setHasPermissionChanges(false)
          setHasUnsavedChanges(false)
          unsavedChangesDialog.pendingAction?.()
        }}
        title="Alterações Não Salvas"
        message="Existem alterações não salvas. Para mudar de tela, você deve salvar ou cancelar as alterações."
        confirmText="Cancelar alterações"
        cancelText="Voltar"
        destructive={false}
      />

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-lg font-bold text-gray-900">Cadastrar Novo Usuário</h3>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-3">
                {/* Nome e Email em 2 colunas */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Nome *</label>
                    <Input
                      value={newUserData.name}
                      onChange={(e) => handleNewUserFieldChange("name", e.target.value)}
                      placeholder="João Silva"
                      className="text-sm h-8"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Email *</label>
                    <Input
                      value={newUserData.email}
                      onChange={(e) => handleNewUserFieldChange("email", e.target.value)}
                      placeholder="joao@empresa.com"
                      type="email"
                      className="text-sm h-8"
                    />
                  </div>
                </div>

                {/* CPF e Telefone em 2 colunas */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">CPF *</label>
                    <Input
                      value={newUserData.cpf}
                      onChange={(e) => handleNewUserFieldChange("cpf", e.target.value)}
                      placeholder="123.456.789-00"
                      className="text-sm h-8"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Telefone *</label>
                    <Input
                      value={newUserData.phone}
                      onChange={(e) => handleNewUserFieldChange("phone", e.target.value)}
                      placeholder="(11) 98765-4321"
                      className="text-sm h-8"
                    />
                  </div>
                </div>

                {/* Endereço */}
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Endereço</label>
                  <Input
                    value={newUserData.address}
                    onChange={(e) => handleNewUserFieldChange("address", e.target.value)}
                    placeholder="Rua ou Avenida"
                    className="text-sm h-8"
                  />
                </div>

                {/* Cidade, Estado e CEP em 3 colunas */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Cidade</label>
                    <Input
                      value={newUserData.city}
                      onChange={(e) => handleNewUserFieldChange("city", e.target.value)}
                      placeholder="São Paulo"
                      className="text-sm h-8"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Estado</label>
                    <Input
                      value={newUserData.state}
                      onChange={(e) => handleNewUserFieldChange("state", e.target.value)}
                      placeholder="SP"
                      maxLength={2}
                      className="text-sm h-8"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">CEP</label>
                    <Input
                      value={newUserData.zipCode}
                      onChange={(e) => handleNewUserFieldChange("zipCode", e.target.value)}
                      placeholder="01234-567"
                      className="text-sm h-8"
                    />
                  </div>
                </div>

                {/* Perfil */}
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Perfil</label>
                  <Select value={newUserData.profile} onValueChange={(value) => handleNewUserFieldChange("profile", value)}>
                    <SelectTrigger className="text-sm h-8">
                      <SelectValue placeholder="Selecione um perfil" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Admin">Admin</SelectItem>
                      <SelectItem value="User">Usuário</SelectItem>
                      <SelectItem value="Viewer">Visualizador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <p className="text-xs text-gray-500 mt-2">* Campos obrigatórios</p>
              </div>
            </div>

            {/* Footer - Fixed */}
            <div className="px-6 py-3 border-t border-gray-200 flex gap-2 flex-shrink-0 bg-gray-50">
              <Button
                variant="outline"
                onClick={() => setShowAddUserModal(false)}
                className="flex-1 text-sm h-8"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmAddUser}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm h-8"
              >
                Cadastrar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Add User Dialog */}
      <ConfirmationDialog
        open={confirmAddUser}
        onClose={() => setConfirmAddUser(false)}
        onConfirm={handleCreateUser}
        title="Confirmar Cadastro"
        message={`Tem certeza que deseja cadastrar o usuário "${newUserData.name}"?`}
        confirmText="Cadastrar"
        cancelText="Cancelar"
        destructive={false}
      />
    </>
  )
}
