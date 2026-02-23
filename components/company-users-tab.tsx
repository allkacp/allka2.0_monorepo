
import { Trash2, Edit2, Eye, Lock, Unlock, Shield, Plus, Search, X, ChevronLeft, ChevronRight, Filter, Mail, CheckCircle, PauseCircle, UserPlus, MapPin, Phone, CreditCard, AtSign, User, Camera, ZoomIn, Crosshair, Settings2 } from "lucide-react"
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
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { useState, useRef, useCallback } from "react"
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

type UserColKey = "usuario" | "email" | "status" | "perfil" | "acoes"
const USER_COLS: { key: UserColKey; label: string; required?: boolean }[] = [
  { key: "usuario", label: "Usuário",              required: true },
  { key: "email",   label: "E-mail" },
  { key: "status",  label: "Status" },
  { key: "perfil",  label: "Perfil · Último acesso" },
  { key: "acoes",   label: "Ações",               required: true },
]
const USER_COL_DEFAULTS: Record<UserColKey, number> = { usuario: 210, email: 210, status: 115, perfil: 190, acoes: 72 }

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

  // Avatar / crop states
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [cropOpen, setCropOpen] = useState(false)
  const [cropContext, setCropContext] = useState<'add' | 'detail'>('add')
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null)
  const [cropZoom, setCropZoom] = useState(1)
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const detailFileInputRef = useRef<HTMLInputElement>(null)
  const cropImgRef = useRef<HTMLImageElement>(null)
  const CROP_SIZE = 192
  const [originalRawSrc, setOriginalRawSrc] = useState<string | null>(null)
  const [showAvatarMenu, setShowAvatarMenu] = useState(false)
  // Detail panel avatar states
  const [detailAvatarPreview, setDetailAvatarPreview] = useState<{ [id: number]: string }>({})
  const [detailOriginalRawSrc, setDetailOriginalRawSrc] = useState<string | null>(null)
  const [detailShowAvatarMenu, setDetailShowAvatarMenu] = useState(false)

  const handleAvatarClick = () => {
    if (avatarPreview) {
      setShowAvatarMenu((prev) => !prev)
    } else {
      fileInputRef.current?.click()
    }
  }

  const handleDetailAvatarClick = () => {
    if (selectedUser && (detailAvatarPreview[selectedUser.id] || selectedUser.avatar)) {
      setDetailShowAvatarMenu((prev) => !prev)
    } else {
      detailFileInputRef.current?.click()
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const src = ev.target?.result as string
      setRawImageSrc(src)
      setOriginalRawSrc(src)
      setCropZoom(1)
      setCropOffset({ x: 0, y: 0 })
      setCropContext('add')
      setCropOpen(true)
    }
    reader.readAsDataURL(file)
    e.target.value = ""
  }

  const handleDetailFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const src = ev.target?.result as string
      setRawImageSrc(src)
      setDetailOriginalRawSrc(src)
      setCropZoom(1)
      setCropOffset({ x: 0, y: 0 })
      setCropContext('detail')
      setCropOpen(true)
    }
    reader.readAsDataURL(file)
    e.target.value = ""
  }

  const handleCropMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX - cropOffset.x, y: e.clientY - cropOffset.y })
  }

  const handleCropMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return
    setCropOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })
  }, [isDragging, dragStart])

  const handleCropMouseUp = () => setIsDragging(false)

  const handleCropConfirm = () => {
    if (!cropImgRef.current) return
    const canvas = document.createElement("canvas")
    canvas.width = CROP_SIZE
    canvas.height = CROP_SIZE
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.beginPath()
    ctx.arc(CROP_SIZE / 2, CROP_SIZE / 2, CROP_SIZE / 2, 0, Math.PI * 2)
    ctx.clip()
    const img = cropImgRef.current
    // Replicate exactly the CSS transform: scale(cropZoom) centered + cropOffset translation
    const drawW = img.naturalWidth * cropZoom
    const drawH = img.naturalHeight * cropZoom
    const dx = CROP_SIZE / 2 + cropOffset.x - drawW / 2
    const dy = CROP_SIZE / 2 + cropOffset.y - drawH / 2
    ctx.drawImage(img, dx, dy, drawW, drawH)
    const result = canvas.toDataURL("image/jpeg", 0.92)
    if (cropContext === 'detail' && selectedUser) {
      setDetailAvatarPreview((prev) => ({ ...prev, [selectedUser.id]: result }))
    } else {
      setAvatarPreview(result)
    }
    setCropOpen(false)
    setRawImageSrc(null)
  }

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Column visibility & resize
  const [visibleCols, setVisibleCols] = useState<Set<UserColKey>>(new Set(["usuario","email","status","perfil","acoes"]))
  const [colWidths, setColWidths] = useState<Record<UserColKey, number>>(USER_COL_DEFAULTS)
  const resizingRef = useRef<{ col: UserColKey; startX: number; startW: number } | null>(null)
  const handleResizeStart = (col: UserColKey, e: React.MouseEvent) => {
    e.preventDefault()
    resizingRef.current = { col, startX: e.clientX, startW: colWidths[col] }
    const onMove = (mv: MouseEvent) => {
      if (!resizingRef.current) return
      const delta = mv.clientX - resizingRef.current.startX
      setColWidths(prev => ({ ...prev, [resizingRef.current!.col]: Math.max(60, resizingRef.current!.startW + delta) }))
    }
    const onUp = () => { resizingRef.current = null; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp) }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
  }
  const toggleUserCol = (key: UserColKey) => {
    setVisibleCols(prev => {
      const next = new Set(prev)
      if (next.has(key) && !USER_COLS.find(c => c.key === key)?.required) next.delete(key)
      else next.add(key)
      return next
    })
  }

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
    if (!validateNewUser()) return
    setConfirmAddUser(true)
  }

  const handleCreateUser = () => {
    const newUser: UserListItem = {
      id: Math.max(...userList.map((u) => u.id), 0) + 1,
      name: newUserData.name,
      email: newUserData.email,
      avatar: avatarPreview || newUserData.name.substring(0, 2).toUpperCase(),
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
    setAvatarPreview(null)
    setOriginalRawSrc(null)
    setShowAvatarMenu(false)
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
      <div className="flex-1 overflow-y-auto px-[50px]">
        <div className="pt-[25px] pb-3">
          {/* Stats chips + Adicionar button */}
          <div className="flex items-center justify-between">
            {/* Left: compact stat chips */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-600">
                  <Shield className="h-3 w-3 text-white" />
                </div>
                <span className="text-xs text-slate-500">Total</span>
                <span className="text-sm font-bold text-blue-600">{userList.length}</span>
              </div>
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-green-600">
                  <span className="h-2 w-2 rounded-full bg-white" />
                </div>
                <span className="text-xs text-slate-500">Online</span>
                <span className="text-sm font-bold text-green-600">{onlineCount}</span>
              </div>
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-red-500">
                  <Lock className="h-3 w-3 text-white" />
                </div>
                <span className="text-xs text-slate-500">Bloqueados</span>
                <span className="text-sm font-bold text-red-600">{blockedCount}</span>
              </div>
            </div>
            {/* Right: Add user button */}
            <Button
              onClick={handleAddUserClick}
              size="sm"
              className="h-9 gap-2 px-4 text-sm bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white border-0 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Adicionar usuário
            </Button>
          </div>
        </div>

        {/* Global-standard Table Card */}
        <div className="mx-0 mb-5 border border-slate-200/70 rounded-lg overflow-hidden shadow-sm bg-white">

          {/* Top Bar — matches empresas page */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200/70 bg-white">
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

            {/* Column config */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="h-7 w-7 flex items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors flex-shrink-0">
                  <Settings2 className="h-3.5 w-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" sideOffset={8} className="w-[180px] p-2">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">Colunas visíveis</p>
                {USER_COLS.filter(c => !c.required).map(col => (
                  <button
                    key={col.key}
                    onClick={() => toggleUserCol(col.key)}
                    className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-slate-50 transition-colors"
                  >
                    <div className={`h-3.5 w-3.5 rounded border flex items-center justify-center flex-shrink-0 ${visibleCols.has(col.key) ? "bg-blue-500 border-blue-500" : "border-slate-300"}`}>
                      {visibleCols.has(col.key) && <svg viewBox="0 0 10 10" className="h-2 w-2"><polyline points="1.5,5.5 4,7.5 8.5,2.5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                    </div>
                    <span className="text-xs text-slate-700">{col.label}</span>
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="text-sm" style={{ tableLayout: "fixed", width: "100%" }}>
              <colgroup>
                {visibleCols.has("usuario") && <col style={{ width: colWidths.usuario }} />}
                {visibleCols.has("email")   && <col style={{ width: colWidths.email   }} />}
                {visibleCols.has("status")  && <col style={{ width: colWidths.status  }} />}
                {visibleCols.has("perfil")  && <col style={{ width: colWidths.perfil  }} />}
                {visibleCols.has("acoes")   && <col style={{ width: colWidths.acoes   }} />}
              </colgroup>
              <thead>
                <tr className="border-b border-slate-200/60">
                  {visibleCols.has("usuario") && (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-r border-slate-200/50 relative">
                      Usuário
                      <div onMouseDown={(e) => handleResizeStart("usuario", e)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400 opacity-0 hover:opacity-100 transition-opacity" />
                    </th>
                  )}
                  {visibleCols.has("email") && (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-r border-slate-200/50 relative">
                      E-mail
                      <div onMouseDown={(e) => handleResizeStart("email", e)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400 opacity-0 hover:opacity-100 transition-opacity" />
                    </th>
                  )}
                  {visibleCols.has("status") && (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-r border-slate-200/50 relative">
                      Status
                      <div onMouseDown={(e) => handleResizeStart("status", e)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400 opacity-0 hover:opacity-100 transition-opacity" />
                    </th>
                  )}
                  {visibleCols.has("perfil") && (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-r border-slate-200/50 relative">
                      Perfil · Último acesso
                      <div onMouseDown={(e) => handleResizeStart("perfil", e)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400 opacity-0 hover:opacity-100 transition-opacity" />
                    </th>
                  )}
                  {visibleCols.has("acoes") && (
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Ações</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedUsers.length > 0 ? (
                  paginatedUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="group hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      {visibleCols.has("usuario") && (
                      <td className="px-4 py-3.5 border-r border-slate-100">
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
                            <p className="font-semibold text-xs text-slate-900">{user.name}</p>
                            {user.isBlocked && (
                              <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 mt-0.5">Bloqueado</Badge>
                            )}
                          </div>
                        </div>
                      </td>
                      )}
                      {visibleCols.has("email") && (
                      <td className="px-4 py-3.5 border-r border-slate-100">
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-3 w-3 text-slate-400 flex-shrink-0" />
                          <span className="text-xs text-slate-600 truncate max-w-[160px]">{user.email}</span>
                        </div>
                      </td>
                      )}
                      {visibleCols.has("status") && (
                      <td className="px-4 py-3.5 border-r border-slate-100">
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
                      )}
                      {visibleCols.has("perfil") && (
                      <td className="px-4 py-3.5 border-r border-slate-100">
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
                      )}
                      {visibleCols.has("acoes") && (
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-0">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost" size="sm"
                                className="h-5 w-5 p-0 rounded text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                onClick={() => handleViewDetails(user)}
                              >
                                <Eye className="h-2.5 w-2.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs">Ver detalhes</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost" size="sm"
                                className={`h-5 w-5 p-0 rounded ${
                                  user.isBlocked
                                    ? "text-red-400 hover:text-red-600 hover:bg-red-50"
                                    : "text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50"
                                }`}
                                onClick={(e) => handleBlockToggle(user.id, e)}
                              >
                                {user.isBlocked ? <Unlock className="h-2.5 w-2.5" /> : <Lock className="h-2.5 w-2.5" />}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs">{user.isBlocked ? "Desbloquear" : "Bloquear"}</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost" size="sm"
                                className="h-5 w-5 p-0 rounded text-red-400 hover:text-red-600 hover:bg-red-50"
                                onClick={(e) => handleDeleteUser(user.id, e)}
                              >
                                <Trash2 className="h-2.5 w-2.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs">Excluir</TooltipContent>
                          </Tooltip>
                        </div>
                      </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={visibleCols.size} className="py-16 text-center">
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
        <SheetContent
          side="right"
          className="!w-[480px] !max-w-none border-l flex flex-col p-0 overflow-hidden"
          style={{ width: 480 }}
          onPointerDownOutside={(e) => { if (detailShowAvatarMenu || (cropOpen && cropContext === 'detail')) e.preventDefault() }}
          onInteractOutside={(e) => { if (detailShowAvatarMenu || (cropOpen && cropContext === 'detail')) e.preventDefault() }}
        >
          {selectedUser && (
            <div className="relative h-full flex flex-col bg-white">

              {/* hidden detail file input */}
              <input ref={detailFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleDetailFileChange} />

              {/* Gradient Header — matches add-user panel */}
              <header className="relative flex items-center gap-4 px-6 pr-14 bg-gradient-to-r from-blue-950 via-indigo-900 to-fuchsia-900 text-white flex-shrink-0 overflow-hidden" style={{ height: 100 }}>
                {/* Clickable avatar — same as add-user panel */}
                <button
                  onClick={handleDetailAvatarClick}
                  className="relative h-20 w-20 rounded-full bg-white/15 border-2 border-white/30 flex-shrink-0 shadow-lg group overflow-hidden hover:border-white/60 transition-all"
                >
                  {/* fallback initials */}
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-600 to-violet-600">
                    <span className="text-white text-xl font-bold">{selectedUser.name.substring(0, 2).toUpperCase()}</span>
                  </div>
                  {/* dicebear or uploaded photo */}
                  {detailAvatarPreview[selectedUser.id] ? (
                    <img src={detailAvatarPreview[selectedUser.id]} alt="avatar" className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedUser.avatar}`} alt={selectedUser.name} className="absolute inset-0 w-full h-full object-cover" />
                  )}
                  {/* Camera hover overlay */}
                  <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                    <Camera className="h-5 w-5 text-white" />
                    <span className="text-[9px] text-white/90 font-medium mt-0.5">{detailAvatarPreview[selectedUser.id] ? "Editar" : "Foto"}</span>
                  </div>
                </button>

                {/* Name / email / status */}
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold text-white/50 uppercase tracking-widest mb-0.5">Perfil do usuário</p>
                  <h2 className="text-lg font-bold text-white leading-tight truncate">{selectedUser.name}</h2>
                  <p className="text-xs text-white/60 truncate mt-0.5">{selectedUser.email}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`inline-flex h-2 w-2 rounded-full ${selectedUser.status === "online" ? "bg-green-400" : "bg-gray-400"}`} />
                    <span className="text-[10px] font-medium text-white/70">{selectedUser.status === "online" ? "Online" : "Offline"}</span>
                  </div>
                </div>
                {/* Action icon buttons — absolute bottom-right, before Sheet's X */}
                <div className="absolute bottom-3 right-5 flex items-center gap-0.5">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button onClick={handleEditUser} className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-white/20 transition-colors">
                        <Edit2 className="h-3.5 w-3.5 text-white/80" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Editar</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button onClick={handleOpenPermissions} className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-white/20 transition-colors">
                        <Shield className="h-3.5 w-3.5 text-white/80" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Permissões</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={(e) => handleBlockToggle(selectedUser.id, e as React.MouseEvent<HTMLButtonElement>)}
                        className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-white/20 transition-colors"
                      >
                        {selectedUser.isBlocked ? <Unlock className="h-3.5 w-3.5 text-white/80" /> : <Lock className="h-3.5 w-3.5 text-white/80" />}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>{selectedUser.isBlocked ? "Desbloquear" : "Bloquear"}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={(e) => handleDeleteUser(selectedUser.id, e as React.MouseEvent<HTMLButtonElement>)}
                        className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-red-500/30 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-300" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Excluir</TooltipContent>
                  </Tooltip>
                </div>
              </header>

              {/* Detail avatar context menu */}
              {detailShowAvatarMenu && selectedUser && (detailAvatarPreview[selectedUser.id] || selectedUser.avatar) && (
                <>
                  <div className="absolute inset-0 z-40" onClick={() => setDetailShowAvatarMenu(false)} />
                  <div className="absolute z-50 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden min-w-[172px]" style={{ top: 108, left: 24 }}>
                    <button
                      onClick={() => { setDetailShowAvatarMenu(false); setTimeout(() => detailFileInputRef.current?.click(), 10) }}
                      className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Camera className="h-3.5 w-3.5 text-gray-400" />
                      Nova foto
                    </button>
                    {detailOriginalRawSrc && (
                      <button
                        onClick={() => {
                          setDetailShowAvatarMenu(false)
                          setRawImageSrc(detailOriginalRawSrc)
                          setCropZoom(1)
                          setCropOffset({ x: 0, y: 0 })
                          setCropContext('detail')
                          setCropOpen(true)
                        }}
                        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-100"
                      >
                        <ZoomIn className="h-3.5 w-3.5 text-gray-400" />
                        Reposicionar
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setDetailShowAvatarMenu(false)
                        if (selectedUser) setDetailAvatarPreview((prev) => { const n = { ...prev }; delete n[selectedUser.id]; return n })
                        setDetailOriginalRawSrc(null)
                      }}
                      className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors border-t border-gray-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remover foto
                    </button>
                  </div>
                </>
              )}

              {/* Detail crop overlay */}
              {cropOpen && rawImageSrc && cropContext === 'detail' && (
                <div className="absolute inset-0 z-50 flex flex-col bg-black/90">
                  <div className="flex-shrink-0 px-6 pt-5 pb-2 text-center">
                    <p className="text-white text-sm font-semibold">Ajustar foto de perfil</p>
                    <p className="text-white/50 text-xs mt-0.5">Arraste para reposicionar · Use o zoom para ajustar</p>
                  </div>
                  <div className="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing select-none" onMouseDown={handleCropMouseDown} onMouseMove={handleCropMouseMove} onMouseUp={handleCropMouseUp} onMouseLeave={handleCropMouseUp}>
                    <img src={rawImageSrc} alt="" draggable={false} className="absolute pointer-events-none select-none opacity-25" style={{ maxWidth:"none", transform:`scale(${cropZoom})`, transformOrigin:"center", left:`calc(50% + ${cropOffset.x}px)`, top:`calc(50% + ${cropOffset.y}px)`, translate:"-50% -50%" }} />
                    <div className="absolute inset-0 pointer-events-none" style={{ background:`radial-gradient(circle ${CROP_SIZE/2}px at 50% 50%, transparent ${CROP_SIZE/2}px, rgba(0,0,0,0.72) ${CROP_SIZE/2}px)` }} />
                    <div className="absolute inset-0 pointer-events-none" style={{ clipPath:`circle(${CROP_SIZE/2}px at 50% 50%)` }}>
                      <img ref={cropImgRef} src={rawImageSrc} alt="crop" draggable={false} className="absolute select-none" style={{ maxWidth:"none", transform:`scale(${cropZoom})`, transformOrigin:"center", left:`calc(50% + ${cropOffset.x}px)`, top:`calc(50% + ${cropOffset.y}px)`, translate:"-50% -50%" }} />
                      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage:"linear-gradient(rgba(255,255,255,.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.1) 1px,transparent 1px)", backgroundSize:"33.3% 33.3%" }} />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="rounded-full border-2 border-white/70 shadow-2xl" style={{ width:CROP_SIZE, height:CROP_SIZE }} />
                    </div>
                  </div>
                  <div className="flex-shrink-0 px-8 py-4 flex items-center gap-3">
                    <span className="text-white/40 text-xs w-8 text-right">{Math.round(cropZoom*100)}%</span>
                    <input type="range" min="0.1" max="3" step="0.02" value={cropZoom} onChange={(e) => setCropZoom(Number(e.target.value))} className="flex-1 accent-white cursor-pointer" />
                    <ZoomIn className="h-4 w-4 text-white/50 flex-shrink-0" />
                    <button onClick={() => setCropOffset({ x:0, y:0 })} title="Centralizar" className="flex-shrink-0 h-7 w-7 rounded-lg bg-white/10 hover:bg-white/25 flex items-center justify-center transition-colors">
                      <Crosshair className="h-3.5 w-3.5 text-white/70" />
                    </button>
                  </div>
                  <div className="flex-shrink-0 flex gap-3 px-8 pb-6">
                    <button onClick={() => { setCropOpen(false); setRawImageSrc(null) }} className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors">Cancelar</button>
                    <button onClick={handleCropConfirm} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600 text-white text-sm font-semibold shadow-md transition-all">Usar esta foto</button>
                  </div>
                </div>
              )}

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto">
                {!permissionsMode ? (
                  <div className="px-4 py-3 space-y-4">

                    {/* Section: Dados da Conta */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <div className="h-4 w-4 rounded bg-blue-100 flex items-center justify-center">
                          <Shield className="h-2.5 w-2.5 text-blue-600" />
                        </div>
                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Dados da Conta</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-2">
                          <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">ID</p>
                          <p className="text-xs font-bold text-slate-800 mt-0.5 font-mono">#{selectedUser.id}</p>
                        </div>
                        <div className="bg-purple-50 border border-purple-100 rounded-lg p-2">
                          <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">Perfil</p>
                          <p className="text-xs font-bold text-slate-800 mt-0.5">{selectedUser.profile}</p>
                        </div>
                        <div className="bg-green-50 border border-green-100 rounded-lg p-2">
                          <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">Status</p>
                          <span className={`inline-flex items-center mt-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${selectedUser.isBlocked ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700"}`}>
                            {selectedUser.isBlocked ? "Bloqueado" : "Ativo"}
                          </span>
                        </div>
                        <div className="bg-amber-50 border border-amber-100 rounded-lg p-2">
                          <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">Último acesso</p>
                          <p className="text-xs font-bold text-slate-800 mt-0.5">{selectedUser.lastAccess}</p>
                        </div>
                      </div>
                    </div>

                    {/* Section: Identificação */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <div className="h-4 w-4 rounded bg-blue-100 flex items-center justify-center">
                          <User className="h-2.5 w-2.5 text-blue-600" />
                        </div>
                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Identificação</span>
                      </div>
                      {!editMode ? (
                        <div className="space-y-1.5">
                          {[
                            { label: "Nome completo", value: selectedUser.name },
                            { label: "CPF", value: selectedUser.cpf || "Não informado" },
                            { label: "Telefone", value: selectedUser.phone || "Não informado" },
                            { label: "E-mail", value: selectedUser.email },
                          ].map(({ label, value }) => (
                            <div key={label} className="border border-slate-100 rounded-lg px-3 py-2 bg-slate-50/60">
                              <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
                              <p className="text-xs font-medium text-slate-800 mt-0.5 break-all">{value}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div>
                            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Nome completo</label>
                            <Input value={editData?.name || ""} onChange={(e) => handleEditFieldChange("name", e.target.value)} placeholder="Nome completo" className="mt-1 h-8 text-xs" />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Telefone</label>
                              <Input value={editData?.phone || ""} onChange={(e) => handleEditFieldChange("phone", e.target.value)} placeholder="(11) 98765-4321" className="mt-1 h-8 text-xs" />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">E-mail</label>
                              <Input value={editData?.email || ""} onChange={(e) => handleEditFieldChange("email", e.target.value)} placeholder="email@exemplo.com" type="email" className="mt-1 h-8 text-xs" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Section: Endereço */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <div className="h-4 w-4 rounded bg-violet-100 flex items-center justify-center">
                          <MapPin className="h-2.5 w-2.5 text-violet-600" />
                        </div>
                        <span className="text-[10px] font-bold text-violet-600 uppercase tracking-widest">Endereço</span>
                        <span className="text-[9px] text-slate-400 font-medium">(opcional)</span>
                      </div>
                      {!editMode ? (
                        <div className="space-y-1.5">
                          <div className="border border-slate-100 rounded-lg px-3 py-2 bg-slate-50/60">
                            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">Logradouro</p>
                            <p className="text-xs font-medium text-slate-800 mt-0.5">{selectedUser.address || "Não informado"}</p>
                          </div>
                          <div className="grid grid-cols-3 gap-1.5">
                            <div className="col-span-1 border border-slate-100 rounded-lg px-3 py-2 bg-slate-50/60">
                              <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">UF</p>
                              <p className="text-xs font-medium text-slate-800 mt-0.5">{selectedUser.state || "—"}</p>
                            </div>
                            <div className="col-span-2 border border-slate-100 rounded-lg px-3 py-2 bg-slate-50/60">
                              <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">Cidade</p>
                              <p className="text-xs font-medium text-slate-800 mt-0.5">{selectedUser.city || "Não informado"}</p>
                            </div>
                          </div>
                          <div className="border border-slate-100 rounded-lg px-3 py-2 bg-slate-50/60">
                            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">CEP</p>
                            <p className="text-xs font-medium text-slate-800 mt-0.5">{selectedUser.zipCode || "Não informado"}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div>
                            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Logradouro</label>
                            <Input value={editData?.address || ""} onChange={(e) => handleEditFieldChange("address", e.target.value)} placeholder="Rua, Avenida, Nº..." className="mt-1 h-8 text-xs" />
                          </div>
                          <div className="grid grid-cols-5 gap-2">
                            <div className="col-span-2">
                              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Cidade</label>
                              <Input value={editData?.city || ""} onChange={(e) => handleEditFieldChange("city", e.target.value)} placeholder="São Paulo" className="mt-1 h-8 text-xs" />
                            </div>
                            <div className="col-span-1">
                              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">UF</label>
                              <Input value={editData?.state || ""} onChange={(e) => handleEditFieldChange("state", e.target.value)} placeholder="SP" maxLength={2} className="mt-1 h-8 text-xs" />
                            </div>
                            <div className="col-span-2">
                              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">CEP</label>
                              <Input value={editData?.zipCode || ""} onChange={(e) => handleEditFieldChange("zipCode", e.target.value)} placeholder="01234-567" className="mt-1 h-8 text-xs" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Section: Uso e Métricas */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <div className="h-4 w-4 rounded bg-amber-100 flex items-center justify-center">
                          <CheckCircle className="h-2.5 w-2.5 text-amber-600" />
                        </div>
                        <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Uso e Métricas</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 mb-2">
                        <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-2">
                          <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">Tempo online</p>
                          <p className="text-sm font-bold text-yellow-600 mt-0.5">{selectedUser.averageOnlineHours || 2.5}h/dia</p>
                        </div>
                        <div className="bg-orange-50 border border-orange-100 rounded-lg p-2">
                          <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">Sem acesso</p>
                          <p className="text-sm font-bold text-orange-600 mt-0.5">{selectedUser.averageOfflineDays || 1}d</p>
                        </div>
                      </div>
                      {/* Chart */}
                      <div className="border border-slate-100 rounded-lg p-3 bg-slate-50/40">
                        <p className="text-[10px] font-semibold text-slate-500 mb-2">Tempo online — 7 dias</p>
                        <div className="h-24">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={timelineData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                              <XAxis dataKey="day" tick={{ fontSize: 9 }} stroke="#9CA3AF" />
                              <YAxis tick={{ fontSize: 9 }} stroke="#9CA3AF" tickFormatter={(v) => `${v}h`} />
                              <RechartsTooltip contentStyle={{ backgroundColor: "#1F2937", border: "none", borderRadius: "8px", fontSize: 10 }} formatter={(v: number) => [`${v}h`, "Online"]} />
                              <Bar dataKey="hours" radius={[4, 4, 0, 0]} fill="#3B82F6" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                  </div>
                ) : (
                  /* Permissions Mode */
                  <div className="px-6 py-5 space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-5 w-5 rounded-md bg-blue-100 flex items-center justify-center">
                        <Shield className="h-3 w-3 text-blue-600" />
                      </div>
                      <span className="text-[11px] font-bold text-blue-600 uppercase tracking-widest">Permissões</span>
                    </div>
                    {permissionsData && Object.entries(permissionsData).map(([categoryKey, categoryData]) => (
                      <div key={categoryKey} className="border border-slate-100 rounded-xl overflow-hidden">
                        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                          <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                            {categoryKey === "gestao" ? "Gestão" : categoryKey === "tasks" ? "Tarefas" : categoryKey === "projects" ? "Projetos" : "Usuários"}
                          </p>
                        </div>
                        <div className="divide-y divide-slate-100">
                          {categoryData.map((permission) => (
                            <div key={permission.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
                              <span className="text-sm text-slate-800">{permission.name}</span>
                              <Switch checked={permission.enabled} onCheckedChange={() => handleTogglePermission(categoryKey, permission.id)} />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Edit footer */}
              {editMode && (
                <div className="flex-shrink-0 border-t border-slate-200 px-6 py-4 bg-slate-50/60 flex gap-3">
                  <Button variant="outline" onClick={handleCancelEdit} className="flex-1 h-10">Cancelar</Button>
                  <Button onClick={handleSaveClick} className="flex-1 h-10 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white border-0">
                    Salvar alterações
                  </Button>
                </div>
              )}

              {/* Permissions footer */}
              {permissionsMode && hasPermissionChanges && (
                <div className="flex-shrink-0 border-t border-slate-200 px-6 py-4 bg-slate-50/60 flex gap-3">
                  <Button variant="outline" onClick={handleCancelPermissions} className="flex-1 h-10">Cancelar</Button>
                  <Button onClick={handleSavePermissionsClick} className="flex-1 h-10 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white border-0">
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

      {/* Add User Sheet — slide from right */}
      <Sheet open={showAddUserModal} onOpenChange={(o) => { if (!o && !confirmAddUser) { setShowAddUserModal(false); setAvatarPreview(null); setOriginalRawSrc(null); setShowAvatarMenu(false); setCropOpen(false); setRawImageSrc(null) } }}>
        <SheetContent
          side="right"
          className="!w-[480px] !max-w-none border-l flex flex-col p-0 overflow-hidden"
          style={{ width: 480 }}
          onPointerDownOutside={(e) => { if (showAvatarMenu || cropOpen) e.preventDefault() }}
          onInteractOutside={(e) => { if (showAvatarMenu || cropOpen) e.preventDefault() }}
        >
          <div className="relative h-full flex flex-col bg-white">

            {/* hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* Gradient Header */}
            <header className="relative flex items-center gap-4 px-6 pr-14 bg-gradient-to-r from-blue-950 via-indigo-900 to-fuchsia-900 text-white flex-shrink-0 overflow-hidden" style={{ height: 100 }}>
              {/* Clickable avatar wrapper — relative so menu can be positioned below */}
              <div className="relative flex-shrink-0">
                <button
                  onClick={handleAvatarClick}
                  className="relative h-20 w-20 rounded-full bg-white/15 border-2 border-white/30 flex items-center justify-center shadow-lg group overflow-hidden hover:border-white/60 transition-all"
                >
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <UserPlus className="h-8 w-8 text-white/80" />
                  )}
                  {/* Camera hover overlay */}
                  <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                    <Camera className="h-5 w-5 text-white" />
                    <span className="text-[9px] text-white/90 font-medium mt-0.5">{avatarPreview ? "Editar" : "Foto"}</span>
                  </div>
                </button>

              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-white/50 uppercase tracking-widest mb-0.5">Novo cadastro</p>
                <h2 className="text-lg font-bold text-white leading-tight truncate">
                  {newUserData.name.trim() ? newUserData.name : "Novo Usuário"}
                </h2>
                <p className="text-xs text-white/60 truncate mt-0.5">{companyName}</p>
              </div>
            </header>

            {/* Avatar context menu — inside Sheet DOM but outside overflow-hidden header */}
            {showAvatarMenu && avatarPreview && (
              <>
                <div className="absolute inset-0 z-40" onClick={() => setShowAvatarMenu(false)} />
                <div className="absolute z-50 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden min-w-[172px]" style={{ top: 108, left: 24 }}>
                  <button
                    onClick={() => { setShowAvatarMenu(false); setTimeout(() => fileInputRef.current?.click(), 10) }}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Camera className="h-3.5 w-3.5 text-gray-400" />
                    Nova foto
                  </button>
                  {originalRawSrc && (
                    <button
                      onClick={() => {
                        setShowAvatarMenu(false)
                        setRawImageSrc(originalRawSrc)
                        setCropZoom(1)
                        setCropOffset({ x: 0, y: 0 })
                        setCropOpen(true)
                      }}
                      className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-100"
                    >
                      <ZoomIn className="h-3.5 w-3.5 text-gray-400" />
                      Reposicionar
                    </button>
                  )}
                  <button
                    onClick={() => { setShowAvatarMenu(false); setAvatarPreview(null); setOriginalRawSrc(null) }}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors border-t border-gray-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remover foto
                  </button>
                </div>
              </>
            )}

            {/* Crop overlay — shown inside the sheet */}
            {cropOpen && rawImageSrc && cropContext === 'add' && (
              <div className="absolute inset-0 z-50 flex flex-col bg-black/90">

                {/* Header */}
                <div className="flex-shrink-0 px-6 pt-5 pb-2 text-center">
                  <p className="text-white text-sm font-semibold">Ajustar foto de perfil</p>
                  <p className="text-white/50 text-xs mt-0.5">Arraste para reposicionar · Use o zoom para ajustar</p>
                </div>

                {/* Drag area — full image visible as context */}
                <div
                  className="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing select-none"
                  onMouseDown={handleCropMouseDown}
                  onMouseMove={handleCropMouseMove}
                  onMouseUp={handleCropMouseUp}
                  onMouseLeave={handleCropMouseUp}
                >
                  {/* Full image — dimmed as context */}
                  <img
                    src={rawImageSrc}
                    alt=""
                    draggable={false}
                    className="absolute pointer-events-none select-none opacity-25"
                    style={{
                      maxWidth: "none",
                      transform: `scale(${cropZoom})`,
                      transformOrigin: "center",
                      left: `calc(50% + ${cropOffset.x}px)`,
                      top: `calc(50% + ${cropOffset.y}px)`,
                      translate: "-50% -50%",
                    }}
                  />

                  {/* Dark vignette with circle hole */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{ background: `radial-gradient(circle ${CROP_SIZE / 2}px at 50% 50%, transparent ${CROP_SIZE / 2}px, rgba(0,0,0,0.72) ${CROP_SIZE / 2}px)` }}
                  />

                  {/* Bright image clipped to circle */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{ clipPath: `circle(${CROP_SIZE / 2}px at 50% 50%)` }}
                  >
                    <img
                      ref={cropImgRef}
                      src={rawImageSrc}
                      alt="crop preview"
                      draggable={false}
                      className="absolute select-none"
                      style={{
                        maxWidth: "none",
                        transform: `scale(${cropZoom})`,
                        transformOrigin: "center",
                        left: `calc(50% + ${cropOffset.x}px)`,
                        top: `calc(50% + ${cropOffset.y}px)`,
                        translate: "-50% -50%",
                      }}
                    />
                    {/* Rule-of-thirds grid inside circle */}
                    <div className="absolute inset-0 pointer-events-none" style={{
                      backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.1) 1px,transparent 1px)",
                      backgroundSize: "33.3% 33.3%",
                    }} />
                  </div>

                  {/* Circle border */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div
                      className="rounded-full border-2 border-white/70 shadow-2xl"
                      style={{ width: CROP_SIZE, height: CROP_SIZE }}
                    />
                  </div>
                </div>

                {/* Zoom slider */}
                <div className="flex-shrink-0 px-8 py-4 flex items-center gap-3">
                  <span className="text-white/40 text-xs w-8 text-right">{Math.round(cropZoom * 100)}%</span>
                  <input
                    type="range" min="0.1" max="3" step="0.02"
                    value={cropZoom}
                    onChange={(e) => setCropZoom(Number(e.target.value))}
                    className="flex-1 accent-white cursor-pointer"
                  />
                  <ZoomIn className="h-4 w-4 text-white/50 flex-shrink-0" />
                  <button
                    onClick={() => setCropOffset({ x: 0, y: 0 })}
                    title="Centralizar"
                    className="flex-shrink-0 h-7 w-7 rounded-lg bg-white/10 hover:bg-white/25 flex items-center justify-center transition-colors"
                  >
                    <Crosshair className="h-3.5 w-3.5 text-white/70" />
                  </button>
                </div>

                {/* Buttons */}
                <div className="flex-shrink-0 flex gap-3 px-8 pb-6">
                  <button
                    onClick={() => { setCropOpen(false); setRawImageSrc(null) }}
                    className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCropConfirm}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600 text-white text-sm font-semibold shadow-md transition-all"
                  >
                    Usar esta foto
                  </button>
                </div>
              </div>
            )}

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto">
              <div className="px-6 py-5 space-y-6">

                {/* Section: Identificação */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-5 w-5 rounded-md bg-blue-100 flex items-center justify-center">
                      <User className="h-3 w-3 text-blue-600" />
                    </div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Identificação</span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-slate-600 mb-1.5 block">Nome completo <span className="text-red-500">*</span></label>
                      <Input
                        value={newUserData.name}
                        onChange={(e) => handleNewUserFieldChange("name", e.target.value)}
                        placeholder="Ex: João Silva"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-slate-600 mb-1.5 block">
                          <span className="flex items-center gap-1"><CreditCard className="h-3 w-3" /> CPF <span className="text-red-500">*</span></span>
                        </label>
                        <Input
                          value={newUserData.cpf}
                          onChange={(e) => handleNewUserFieldChange("cpf", e.target.value)}
                          placeholder="123.456.789-00"
                          className="h-9 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-600 mb-1.5 block">
                          <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> Telefone <span className="text-red-500">*</span></span>
                        </label>
                        <Input
                          value={newUserData.phone}
                          onChange={(e) => handleNewUserFieldChange("phone", e.target.value)}
                          placeholder="(11) 98765-4321"
                          className="h-9 text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600 mb-1.5 block">
                        <span className="flex items-center gap-1"><AtSign className="h-3 w-3" /> E-mail <span className="text-red-500">*</span></span>
                      </label>
                      <Input
                        value={newUserData.email}
                        onChange={(e) => handleNewUserFieldChange("email", e.target.value)}
                        placeholder="joao@empresa.com"
                        type="email"
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-slate-100" />

                {/* Section: Endereço */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-5 w-5 rounded-md bg-violet-100 flex items-center justify-center">
                      <MapPin className="h-3 w-3 text-violet-600" />
                    </div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Endereço</span>
                    <span className="text-[10px] text-slate-400">(opcional)</span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-slate-600 mb-1.5 block">Logradouro</label>
                      <Input
                        value={newUserData.address}
                        onChange={(e) => handleNewUserFieldChange("address", e.target.value)}
                        placeholder="Rua, Avenida, Nº..."
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-5 gap-3">
                      <div className="col-span-2">
                        <label className="text-xs font-medium text-slate-600 mb-1.5 block">Cidade</label>
                        <Input
                          value={newUserData.city}
                          onChange={(e) => handleNewUserFieldChange("city", e.target.value)}
                          placeholder="São Paulo"
                          className="h-9 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-600 mb-1.5 block">UF</label>
                        <Input
                          value={newUserData.state}
                          onChange={(e) => handleNewUserFieldChange("state", e.target.value)}
                          placeholder="SP"
                          maxLength={2}
                          className="h-9 text-sm uppercase"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs font-medium text-slate-600 mb-1.5 block">CEP</label>
                        <Input
                          value={newUserData.zipCode}
                          onChange={(e) => handleNewUserFieldChange("zipCode", e.target.value)}
                          placeholder="01234-567"
                          className="h-9 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-slate-100" />

                {/* Section: Acesso */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-5 w-5 rounded-md bg-emerald-100 flex items-center justify-center">
                      <Shield className="h-3 w-3 text-emerald-600" />
                    </div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Perfil de Acesso</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: "Administrador", label: "Administrador", desc: "Acesso total", color: "violet" },
                      { value: "Gerente", label: "Gerente", desc: "Gestão geral", color: "blue" },
                      { value: "Operador", label: "Operador", desc: "Operações", color: "sky" },
                      { value: "Visualizador", label: "Visualizador", desc: "Somente leitura", color: "slate" },
                      { value: "Financeiro", label: "Financeiro", desc: "Dados financeiros", color: "emerald" },
                      { value: "Suporte", label: "Suporte", desc: "Atendimento", color: "amber" },
                    ].map(({ value, label, desc, color }) => {
                      const active = newUserData.profile === value
                      const colors: Record<string, string> = {
                        violet: active ? "border-violet-500 bg-violet-50 text-violet-700" : "border-slate-200 hover:border-violet-300 hover:bg-violet-50/50",
                        blue:   active ? "border-blue-500 bg-blue-50 text-blue-700"     : "border-slate-200 hover:border-blue-300 hover:bg-blue-50/50",
                        sky:    active ? "border-sky-500 bg-sky-50 text-sky-700"         : "border-slate-200 hover:border-sky-300 hover:bg-sky-50/50",
                        slate:  active ? "border-slate-500 bg-slate-100 text-slate-700" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
                        emerald:active ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50",
                        amber:  active ? "border-amber-500 bg-amber-50 text-amber-700"  : "border-slate-200 hover:border-amber-300 hover:bg-amber-50/50",
                      }
                      return (
                        <button
                          key={value}
                          onClick={() => handleNewUserFieldChange("profile", value)}
                          className={`flex flex-col items-start p-3 rounded-xl border-2 transition-all text-left ${
                            colors[color]
                          } ${active ? "" : "text-slate-600"}`}
                        >
                          <span className="text-xs font-semibold leading-tight">{label}</span>
                          <span className={`text-[10px] mt-0.5 ${ active ? "opacity-80" : "text-slate-400" }`}>{desc}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <p className="text-[11px] text-slate-400"><span className="text-red-500">*</span> Campos obrigatórios</p>
              </div>
            </div>

            {/* Sticky footer */}
            <div className="flex-shrink-0 border-t border-slate-200 px-6 py-4 bg-slate-50/60 flex gap-3">
              <Button
                variant="outline"
                onClick={() => { setShowAddUserModal(false); setAvatarPreview(null); setOriginalRawSrc(null); setShowAvatarMenu(false); setCropOpen(false); setRawImageSrc(null) }}
                className="flex-1 h-10"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmAddUser}
                disabled={!validateNewUser()}
                className="flex-1 h-10 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white border-0 shadow-sm disabled:opacity-50"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Cadastrar usuário
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

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
