
import { cn } from "@/lib/utils"
import { TooltipContent } from "@/components/ui/tooltip"

import { TooltipTrigger } from "@/components/ui/tooltip"

import { Tooltip } from "@/components/ui/tooltip"

import { TooltipProvider } from "@/components/ui/tooltip"

import React from "react"

import { X, Mail, Phone, Building2, Shield, UserIcon, Lock, CheckCircle2, AlertCircle, TrendingUp, Activity, Clock, Zap, Search, Edit2, Save, XCircle, Loader2, Download, Copy, Eye, EyeOff, Send, Key, ChevronDown, CreditCard, Plus, Trash2, Wallet, FileText, Check, DollarSign, BarChart3, Settings, Smartphone, Globe, Monitor, Tablet, Star, Upload, ToggleRight, ToggleLeft, ChevronsUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { UserViewHeader } from "@/components/user-view-header"
import { UserPartnershipCard } from "@/components/user-partnership-card"
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts"
import { useState, useEffect } from "react"
import { useSidebar } from "@/contexts/sidebar-context"
import { User as UserType } from "@/types/user"
import { useToast } from "@/hooks/use-toast"

interface UserViewSlidePanelProps {
  open: boolean
  onClose: () => void
  user: UserType | null
}

// Dados fake
const createFakeUserData = (user: UserType | null): UserType => {
  return {
    id: "usr_2024001",
    name: "João Silva Santos",
    email: "joao.silva@example.com",
    phone: "(11) 98765-4321",
    cpf: "123.456.789-00",
    cnpj: "12.345.678/0001-90",
    birth_date: "1990-05-15",
    created_at: "2024-01-10",
    last_login: "2024-01-28T14:30:00",
    is_active: true,
    role: "admin",
    account_type: "premium",
    street: "Rua das Flores",
    number: "123",
    complement: "Apto 45",
    city: "São Paulo",
    state: "SP",
    zip_code: "01310-100",
    country: "Brasil",
    job_title: "Gerente de Projetos",
    department: "Desenvolvimento",
    // Dados Financeiros
    bank_name: "Banco do Brasil",
    agency_number: "1234",
    account_number: "123456-7",
    card_last_digits: "1234",
    card_holder: "JOAO SILVA SANTOS",
    card_expiry: "12/26",
    pix_key: "joao.silva@example.com",
    wallet_balance: 2500.75,
    wallet_status: "ativa",
    financial_document: "123.456.789-00",
    financial_holder: "João Silva Santos",
    person_type: "fisica",
    tax_regime: "simples",
    financial_notes: "",
    permissions: ["manage_users", "manage_permissions", "view_financial", "edit_financial", "adjust_balance", "manage_cards", "manage_accounts", "create_tasks", "edit_tasks", "delete_tasks", "assign_tasks", "approve_tasks", "view_reports", "export_reports", "view_metrics", "access_settings", "manage_integrations", "view_logs"],
    online_status: "online",
    ...(user || {})
  } as UserType
}

const accessChartData = [
  { date: "1", acessos: 45 },
  { date: "5", acessos: 52 },
  { date: "10", acessos: 38 },
  { date: "15", acessos: 61 },
  { date: "20", acessos: 55 },
  { date: "25", acessos: 68 },
  { date: "30", acessos: 72 }
]

const moduleUsageData = [
  { nome: "Vendas", uso: 85 },
  { nome: "Relatórios", uso: 65 },
  { nome: "Financeiro", uso: 72 },
  { nome: "RH", uso: 48 },
  { nome: "Operações", uso: 90 }
]

const permissionsByCategory = {
  "Usuários": [
    { id: "user_create", name: "Criar Usuários", risk: "alto" },
    { id: "user_edit", name: "Editar Usuários", risk: "médio" },
    { id: "user_delete", name: "Deletar Usuários", risk: "crítico" },
    { id: "user_view", name: "Visualizar Usuários", risk: "baixo" }
  ],
  "Financeiro": [
    { id: "fin_view", name: "Visualizar Financeiro", risk: "médio" },
    { id: "fin_edit", name: "Editar Financeiro", risk: "alto" },
    { id: "fin_approve", name: "Aprovar Transações", risk: "crítico" },
    { id: "fin_report", name: "Relatórios Financeiros", risk: "médio" }
  ],
  "Relatórios": [
    { id: "report_view", name: "Visualizar Relatórios", risk: "baixo" },
    { id: "report_create", name: "Criar Relatórios", risk: "médio" },
    { id: "report_export", name: "Exportar Relatórios", risk: "médio" },
    { id: "report_schedule", name: "Agendar Relatórios", risk: "médio" }
  ],
  "Configurações": [
    { id: "settings_view", name: "Visualizar Configurações", risk: "baixo" },
    { id: "settings_edit", name: "Editar Configurações", risk: "alto" },
    { id: "settings_system", name: "Configurações de Sistema", risk: "crítico" }
  ],
  "Integrações": [
    { id: "integ_view", name: "Visualizar Integrações", risk: "baixo" },
    { id: "integ_connect", name: "Conectar Integrações", risk: "alto" },
    { id: "integ_manage", name: "Gerenciar Integrações", risk: "crítico" }
  ]
}

const templates = [
  { name: "Admin Completo", permissions: Object.values(permissionsByCategory).flat().map(p => p.id) },
  { name: "Financeiro", permissions: permissionsByCategory["Financeiro"].map(p => p.id) },
  { name: "Relatórios", permissions: permissionsByCategory["Relatórios"].map(p => p.id) },
  { name: "Leitura Apenas", permissions: ["user_view", "fin_view", "report_view", "settings_view", "integ_view"] }
]

export function UserViewSlidePanel({ open, onClose, user }: UserViewSlidePanelProps) {
  const [isClosing, setIsClosing] = useState(false)
  const [onlineStatus, setOnlineStatus] = useState("online")
  const [isEditMode, setIsEditMode] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editedData, setEditedData] = useState<Partial<UserType>>({})
  const [isContaEditMode, setIsContaEditMode] = useState(false)
  const [contaEditedData, setContaEditedData] = useState<Partial<UserType>>({})
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
  const [searchPermissions, setSearchPermissions] = useState("")
  const [filterCategory, setFilterCategory] = useState<string | null>(null)
  const [resetPasswordToken, setResetPasswordToken] = useState<string | null>(null)
  const [resetPasswordUrl, setResetPasswordUrl] = useState<string | null>(null)
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false)
  const [openAccordions, setOpenAccordions] = useState<string[]>(["dados-principais"])
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [persistedUserData, setPersistedUserData] = useState<Partial<UserType> | null>(null)
  const [isDadosEditMode, setIsDadosEditMode] = useState(false)
  const [dadosEditedData, setDadosEditedData] = useState<Partial<UserType>>({})
  const [showDadosConfirmDialog, setShowDadosConfirmDialog] = useState(false)
  const [isFinancialEditMode, setIsFinancialEditMode] = useState(false)
  const [financialEditedData, setFinancialEditedData] = useState<Partial<UserType>>({})
  const [showFinancialConfirmDialog, setShowFinancialConfirmDialog] = useState(false)
  const [financialOpenAccordions, setFinancialOpenAccordions] = useState<string[]>(["pagamentos"])
  const [dadosOpenAccordions, setDadosOpenAccordions] = useState<string[]>(["pessoais"])
  const [securityOpenAccordions, setSecurityOpenAccordions] = useState<string[]>(["auth"])
  const [contaSingleOpen, setContaSingleOpen] = useState(false)
  const [dadosSingleOpen, setDadosSingleOpen] = useState(false)
  const [financialSingleOpen, setFinancialSingleOpen] = useState(false)
  const [permissionsSingleOpen, setPermissionsSingleOpen] = useState(false)
  const [securitySingleOpen, setSecuritySingleOpen] = useState(false)
  // Card Management
  const [cards, setCards] = useState<Array<{ id: string; lastDigits: string; holder: string; expiry: string; brand: string; isDefault: boolean }>>([])
  const [showCardModal, setShowCardModal] = useState(false)
  const [cardFormData, setCardFormData] = useState({ number: "", expiry: "", holder: "", brand: "" })
  const [showSetDefaultCardDialog, setShowSetDefaultCardDialog] = useState(false)
  const [selectedCardForDefault, setSelectedCardForDefault] = useState<string | null>(null)
  // Wallet Adjustment
  const [walletAdjustValue, setWalletAdjustValue] = useState("")
  const [walletAdjustType, setWalletAdjustType] = useState("add")
  const [walletAdjustReason, setWalletAdjustReason] = useState("")
  const [showWalletConfirmDialog, setShowWalletConfirmDialog] = useState(false)
  const [isApplyingWallet, setIsApplyingWallet] = useState(false)
  // Permissions
  const [isPermissionsEditMode, setIsPermissionsEditMode] = useState(false)
  const [permissionsEditedData, setPermissionsEditedData] = useState<{ role?: string; permissions?: string[] }>({})
  const [showPermissionsConfirmDialog, setShowPermissionsConfirmDialog] = useState(false)
  const [permissionsOpenAccordions, setPermissionsOpenAccordions] = useState<string[]>(["role", "admin", "financial", "operational", "reports", "system"])
  // Wallet Statement
  const [walletStatements, setWalletStatements] = useState<Array<{ id: string; date: string; type: "credit" | "debit" | "blocked"; amount: number; reason: string; balanceAfter: number; admin: string }>>([])
  const [showStatementModal, setShowStatementModal] = useState(false)
  const [statementFilters, setStatementFilters] = useState({ type: "all", startDate: "", endDate: "", search: "" })
  // Blocked Credit
  const [blockedBalance, setBlockedBalance] = useState<number>(0)
  const [showAddBalanceModal, setShowAddBalanceModal] = useState(false)
  const [creditType, setCreditType] = useState<"immediate" | "blocked">("immediate")
  const [creditReason, setCreditReason] = useState("")
  const [creditAmount, setCreditAmount] = useState("")
  const [showUnblockRequestModal, setShowUnblockRequestModal] = useState(false)
  const [unblockInvoice, setUnblockInvoice] = useState<File | null>(null)
  // Unblock Requests (Admin)
  const [unblockRequests, setUnblockRequests] = useState<Array<{ id: string; userId: string; userName: string; amount: number; date: string; invoiceUrl: string; status: "pending" | "approved" | "rejected" }>>([])
  const [showUnblockRequestsModal, setShowUnblockRequestsModal] = useState(false)
  

  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false)
  const [passwordResetMethod, setPasswordResetMethod] = useState<"email" | "link" | "direct">("email")
  const [generatedResetLink, setGeneratedResetLink] = useState("")
  const [is2FAEnabled, setIs2FAEnabled] = useState(false)
  const [show2FASetupModal, setShow2FASetupModal] = useState(false)
  const [twoFAQRCode, setTwoFAQRCode] = useState("")
  const [twoFAManualKey, setTwoFAManualKey] = useState("")
  const [twoFAVerificationCode, setTwoFAVerificationCode] = useState("")
  const [showTwoFAVerification, setShowTwoFAVerification] = useState(false)
  const [twoFALastValidation, setTwoFALastValidation] = useState("")
  const [twoFAActivationDate, setTwoFAActivationDate] = useState("")
  const [activeSessions, setActiveSessions] = useState<Array<{ id: string; location: string; ip: string; browser: string; os: string; loginTime: string; status: "active" | "expired" }>>([])
  const [connectedDevices, setConnectedDevices] = useState<Array<{ id: string; name: string; type: "mobile" | "desktop" | "tablet"; lastAccess: string; ip: string }>>([])
  const [securityLogs, setSecurityLogs] = useState<Array<{ id: string; date: string; action: string; ip: string; location: string; admin: string }>>([])
  const [showFullLogsModal, setShowFullLogsModal] = useState(false)
  const [logFilters, setLogFilters] = useState({ action: "all", date: "", admin: "" })
  const [showConfirmSecurityAction, setShowConfirmSecurityAction] = useState(false)
  const [confirmSecurityAction, setConfirmSecurityAction] = useState<{ type: string; message: string; callback: () => void } | null>(null)
  const [isSavingSecurityAction, setIsSavingSecurityAction] = useState(false)
  
  // Header States
  const [showBalanceAllka, setShowBalanceAllka] = useState(true)
  const [showAvatarUpload, setShowAvatarUpload] = useState(false)
  const [userLevel, setUserLevel] = useState(3) // 1-5 stars
  const [levelProgress, setLevelProgress] = useState(65) // percentage to next level
  const [userAccountStatus, setUserAccountStatus] = useState<"ativo" | "inativo" | "pausado" | "suspenso">("ativo")
  const [userPlan, setUserPlan] = useState<"free" | "premium" | "vip">("premium")
  
  const { sidebarWidth } = useSidebar()
  const { toast } = useToast()

  const fakeUser = createFakeUserData(user)
  
  // Usar dados persistidos se existirem, caso contrário usar fakeUser
  const displayUser = { ...fakeUser, ...persistedUserData }

  // Normalizar tipo de conta corretamente, sem fallback silencioso
  const rawAccountType = displayUser?.account_type || displayUser?.tipo
  const userAccountType = rawAccountType ? rawAccountType.toString().toLowerCase() : undefined

  // Initialize cards on component mount
  useEffect(() => {
    if (cards.length === 0) {
      // 2 Cartões mockados por padrão
      setCards([
        {
          id: "card_001",
          lastDigits: "4242",
          holder: "JOAO SILVA SANTOS",
          expiry: "12/26",
          brand: "Visa",
          isDefault: true
        },
        {
          id: "card_002",
          lastDigits: "5555",
          holder: "JOAO SILVA SANTOS",
          expiry: "08/25",
          brand: "Mastercard",
          isDefault: false
        }
      ])

      // Inicializar extrato com algumas movimentações mockadas
      setWalletStatements([
        {
          id: "stmt_001",
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          type: "credit",
          amount: 500,
          reason: "Depósito inicial",
          balanceAfter: 2500.75,
          admin: "Admin Sistema"
        },
        {
          id: "stmt_002",
          date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          type: "debit",
          amount: 150,
          reason: "Compra em loja",
          balanceAfter: 2350.75,
          admin: "Automático"
        },
        {
          id: "stmt_003",
          date: new Date().toISOString(),
          type: "credit",
          amount: 25.50,
          reason: "Cashback de compras",
          balanceAfter: 2376.25,
          admin: "Sistema"
        }
      ])
    }

    // Initialize security data on component mount
    if (activeSessions.length === 0) {
      setActiveSessions([
        {
          id: "session_001",
          location: "São Paulo, SP",
          ip: "187.45.123.45",
          browser: "Chrome 131.0",
          os: "macOS 14.2",
          loginTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          status: "active"
        },
        {
          id: "session_002",
          location: "São Paulo, SP",
          ip: "187.45.123.45",
          browser: "Safari 17.2",
          os: "iOS 17.2",
          loginTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          status: "active"
        },
        {
          id: "session_003",
          location: "Rio de Janeiro, RJ",
          ip: "189.23.234.56",
          browser: "Firefox 121.0",
          os: "Windows 11",
          loginTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: "expired"
        }
      ])

      setConnectedDevices([
        {
          id: "device_001",
          name: "MacBook Pro de João",
          type: "desktop",
          lastAccess: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          ip: "187.45.123.45"
        },
        {
          id: "device_002",
          name: "iPhone de João",
          type: "mobile",
          lastAccess: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          ip: "187.45.123.45"
        },
        {
          id: "device_003",
          name: "Computador do Escritório",
          type: "desktop",
          lastAccess: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          ip: "192.168.1.100"
        }
      ])

      setSecurityLogs([
        {
          id: "log_001",
          date: new Date().toISOString(),
          action: "Login bem-sucedido",
          ip: "187.45.123.45",
          location: "São Paulo, SP",
          admin: "Automático"
        },
        {
          id: "log_002",
          date: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          action: "Alteração de dados cadastrais",
          ip: "187.45.123.45",
          location: "São Paulo, SP",
          admin: "Admin User"
        },
        {
          id: "log_003",
          date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          action: "2FA ativado",
          ip: "187.45.123.45",
          location: "São Paulo, SP",
          admin: "Usuário"
        },
        {
          id: "log_004",
          date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          action: "Tentativa de login inválida",
          ip: "189.23.234.56",
          location: "Rio de Janeiro, RJ",
          admin: "Automático"
        },
        {
          id: "log_005",
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          action: "Redefinição de senha",
          ip: "192.168.1.100",
          location: "Escritório",
          admin: "Admin User"
        }
      ])

      setTwoFAActivationDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      setTwoFALastValidation(new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
      setIs2FAEnabled(true)
    }
  }, [])

  // Define panel positioning - Extends from sidebar to right edge
  const [panelStyle, setPanelStyle] = useState<{ left: string; width: string }>({
    left: "240px",
    width: "calc(100vw - 240px)"
  })

  useEffect(() => {
    const calculatePanelStyle = () => {
      const sidebarWidthPx = typeof sidebarWidth === "number" ? sidebarWidth : parseInt(sidebarWidth as string) || 240
      setPanelStyle({
        left: `${sidebarWidthPx}px`,
        width: `calc(100vw - ${sidebarWidthPx}px)`
      })
    }

    calculatePanelStyle()
    window.addEventListener("resize", calculatePanelStyle)
    return () => window.removeEventListener("resize", calculatePanelStyle)
  }, [sidebarWidth])

  useEffect(() => {
    if (!open) {
      setIsClosing(false)
    }
  }, [open])

  useEffect(() => {
    const statuses = ["online", "busy", "away", "offline"]
    const interval = setInterval(() => {
      setOnlineStatus(statuses[Math.floor(Math.random() * statuses.length)])
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleClose = () => {
    if (isEditMode) {
      const hasChanges = Object.keys(editedData).length > 0
      if (hasChanges && !confirm("Há alterações não salvas. Descartar?")) return
      setIsEditMode(false)
      setEditedData({})
    }
    setIsClosing(true)
    setTimeout(onClose, 300)
  }

  const handleEditMode = () => {
    setIsEditMode(true)
    setEditedData({})
  }

  const handleCancelEdit = () => {
    setIsEditMode(false)
    setEditedData({})
  }

  const handleSave = async () => {
    if (!editedData.name || !editedData.email) {
      toast({ title: "Erro", description: "Nome e email são obrigatórios", variant: "destructive" })
      return
    }
    setIsSaving(true)
    await new Promise(r => setTimeout(r, 1500))
    toast({ title: "Sucesso!", description: "Dados atualizados com sucesso" })
    setIsEditMode(false)
    setEditedData({})
    setIsSaving(false)
  }

  const handleFieldChange = (field: string, value: any) => {
    setEditedData(prev => ({ ...prev, [field]: value }))
  }

  const getDisplayValue = (field: string) => {
    return editedData[field as keyof typeof editedData] ?? fakeUser[field as keyof UserType]
  }

  const handleExport = () => {
    const dataStr = JSON.stringify({ user: fakeUser, exportedAt: new Date().toISOString() }, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `usuario-${fakeUser.id}-${Date.now()}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast({ title: "Sucesso!", description: "Dados exportados com sucesso" })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online": return { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" }
      case "busy": return { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500" }
      case "away": return { bg: "bg-slate-100", text: "text-slate-700", dot: "bg-slate-500" }
      case "offline": return { bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-500" }
      default: return { bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-500" }
    }
  }

  const handleContaEditMode = () => {
    setIsContaEditMode(true)
    setContaEditedData({})
  }

  const handleContaCancelEdit = () => {
    setIsContaEditMode(false)
    setContaEditedData({})
    setShowConfirmDialog(false)
  }

  // Handlers para aba "Dados"
  const handleDadosEditMode = () => {
    setIsDadosEditMode(true)
    setDadosEditedData({})
  }

  const handleDadosCancelEdit = () => {
    setIsDadosEditMode(false)
    setDadosEditedData({})
    setShowDadosConfirmDialog(false)
  }

  const handleDadosFieldChange = (field: string, value: any) => {
    setDadosEditedData(prev => ({ ...prev, [field]: value }))
  }

  const getDadosDisplayValue = (field: string) => {
    return dadosEditedData[field as keyof typeof dadosEditedData] ?? displayUser[field as keyof UserType]
  }

  const handleDadosSaveClick = () => {
    setShowDadosConfirmDialog(true)
  }

  const handleDadosSaveConfirm = async () => {
    setIsSaving(true)
    try {
      const updatePayload = {
        ...displayUser,
        ...dadosEditedData,
        id: displayUser.id
      }

      const response = await fetch(`/api/admin/users/${displayUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      })

      const data = await response.json()

      if (data.success && data.data) {
        setPersistedUserData(prev => ({
          ...prev,
          ...data.data
        }))
        toast({ title: "Sucesso!", description: "Dados atualizados com sucesso" })
        setIsDadosEditMode(false)
        setDadosEditedData({})
      } else {
        toast({ title: "Erro", description: data.message || "Falha ao salvar dados", variant: "destructive" })
      }
    } catch (error) {
      console.error('[v0] Error saving dados:', error)
      toast({ title: "Erro", description: "Falha ao salvar dados", variant: "destructive" })
    } finally {
      setShowDadosConfirmDialog(false)
      setIsSaving(false)
    }
  }

  // Handlers para aba "Financeiro"
  const handleFinancialEditMode = () => {
    setIsFinancialEditMode(true)
    setFinancialEditedData({})
  }

  const handleFinancialCancelEdit = () => {
    setIsFinancialEditMode(false)
    setFinancialEditedData({})
    setShowFinancialConfirmDialog(false)
  }

  const handleFinancialFieldChange = (field: string, value: any) => {
    setFinancialEditedData(prev => ({ ...prev, [field]: value }))
  }

  const getFinancialDisplayValue = (field: string) => {
    return financialEditedData[field as keyof typeof financialEditedData] ?? displayUser[field as keyof UserType]
  }

  const handleFinancialSaveClick = () => {
    setShowFinancialConfirmDialog(true)
  }

  const handleFinancialSaveConfirm = async () => {
    setIsSaving(true)
    try {
      const updatePayload = {
        ...displayUser,
        ...financialEditedData,
        id: displayUser.id
      }

      const response = await fetch(`/api/admin/users/${displayUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      })

      const data = await response.json()

      if (data.success && data.data) {
        setPersistedUserData(prev => ({
          ...prev,
          ...data.data
        }))
        toast({ title: "Sucesso!", description: "Dados financeiros atualizados com sucesso" })
        setIsFinancialEditMode(false)
        setFinancialEditedData({})
      } else {
        toast({ title: "Erro", description: data.message || "Falha ao salvar dados", variant: "destructive" })
      }
    } catch (error) {
      console.error('[v0] Error saving financial data:', error)
      toast({ title: "Erro", description: "Falha ao salvar dados financeiros", variant: "destructive" })
    } finally {
      setShowFinancialConfirmDialog(false)
      setIsSaving(false)
    }
  }

  // Card Handlers
  const handleAddCard = () => {
    setCardFormData({ number: "", expiry: "", holder: "", brand: "" })
    setShowCardModal(true)
  }

  const handleSaveCard = () => {
    if (!cardFormData.number || !cardFormData.expiry || !cardFormData.holder) {
      toast({ title: "Erro", description: "Preencha todos os campos do cartão", variant: "destructive" })
      return
    }
    const lastDigits = cardFormData.number.slice(-4)
    const newCard = {
      id: `card_${Date.now()}`,
      lastDigits,
      holder: cardFormData.holder.toUpperCase(),
      expiry: cardFormData.expiry,
      brand: cardFormData.brand || "Visa",
      isDefault: cards.length === 0
    }
    setCards([...cards, newCard])
    setShowCardModal(false)
    toast({ title: "Sucesso!", description: "Cartão adicionado com sucesso" })
  }

  const handleDeleteCard = (cardId: string) => {
    setCards(cards.filter(c => c.id !== cardId))
    toast({ title: "Sucesso!", description: "Cartão removido com sucesso" })
  }

  const handleSetDefaultCard = (cardId: string) => {
    setSelectedCardForDefault(cardId)
    setShowSetDefaultCardDialog(true)
  }

  const handleConfirmSetDefaultCard = () => {
    if (selectedCardForDefault) {
      setCards(cards.map(c => ({ ...c, isDefault: c.id === selectedCardForDefault })))
      toast({ title: "Sucesso!", description: "Cartão definido como padrão" })
      setShowSetDefaultCardDialog(false)
      setSelectedCardForDefault(null)
    }
  }

  // Balance Addition Handlers
  const handleAddBalance = () => {
    if (!creditAmount || parseFloat(creditAmount) <= 0) {
      toast({ title: "Erro", description: "Digite um valor válido", variant: "destructive" })
      return
    }
    if (!creditReason.trim()) {
      toast({ title: "Erro", description: "Informe o motivo da operação", variant: "destructive" })
      return
    }
    setShowWalletConfirmDialog(true)
  }

  const handleConfirmAddBalance = async () => {
    setIsApplyingWallet(true)
    try {
      const amount = parseFloat(creditAmount)
      const currentBalance = (displayUser.wallet_balance as number) || 0
      let newBalance = currentBalance

      if (creditType === "immediate") {
        newBalance = currentBalance + amount
      }

      const newStatement = {
        id: `stmt_${Date.now()}`,
        date: new Date().toISOString(),
        type: creditType === "blocked" ? ("blocked" as const) : ("credit" as const),
        amount,
        reason: creditReason,
        balanceAfter: creditType === "blocked" ? currentBalance : newBalance,
        admin: "Admin User"
      }

      if (creditType === "blocked") {
        setBlockedBalance(prev => prev + amount)
      } else {
        const updatePayload = { ...displayUser, wallet_balance: newBalance, id: displayUser.id }
        const response = await fetch(`/api/admin/users/${displayUser.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatePayload)
        })
        const data = await response.json()
        if (data.success) {
          setPersistedUserData(prev => ({ ...prev, wallet_balance: newBalance }))
        }
      }

      setWalletStatements([newStatement, ...walletStatements])
      toast({ title: "Sucesso!", description: `${creditType === "blocked" ? "Crédito bloqueado" : "Crédito"} adicionado com sucesso` })
      setCreditAmount("")
      setCreditReason("")
      setShowAddBalanceModal(false)
      setShowWalletConfirmDialog(false)
    } catch (error) {
      console.error('[v0] Error adding balance:', error)
      toast({ title: "Erro", description: "Falha ao adicionar crédito", variant: "destructive" })
    } finally {
      setIsApplyingWallet(false)
    }
  }

  const handleRequestUnblock = () => {
    if (!unblockInvoice) {
      toast({ title: "Erro", description: "Anexe uma nota fiscal", variant: "destructive" })
      return
    }
    toast({ title: "Sucesso!", description: "Solicitação de desbloqueio enviada para análise" })
    setShowUnblockRequestModal(false)
    setUnblockInvoice(null)
  }

  const handleApproveUnblockRequest = (requestId: string) => {
    const request = unblockRequests.find(r => r.id === requestId)
    if (request) {
      setBlockedBalance(prev => prev - request.amount)
      setUnblockRequests(unblockRequests.map(r => r.id === requestId ? { ...r, status: "approved" as const } : r))
      toast({ title: "Sucesso!", description: "Solicitação aprovada" })
    }
  }

  const handleRejectUnblockRequest = (requestId: string) => {
    setUnblockRequests(unblockRequests.map(r => r.id === requestId ? { ...r, status: "rejected" as const } : r))
    toast({ title: "Sucesso!", description: "Solicitação rejeitada" })
  }

  // Security Handlers
  const handlePasswordReset = () => {
    setPasswordResetMethod("email")
    setGeneratedResetLink("")
    setShowPasswordResetModal(true)
  }

  const handleConfirmPasswordReset = async () => {
    setIsSavingSecurityAction(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      if (passwordResetMethod === "email") {
        toast({ title: "Sucesso!", description: "Email de redefinição enviado para " + displayUser.email })
      } else if (passwordResetMethod === "link") {
        const link = `https://allka.com/auth/reset-password?token=tk_${Date.now()}&user=${displayUser.id}`
        setGeneratedResetLink(link)
        toast({ title: "Link gerado!", description: "Copie o link para compartilhar com o usuário" })
      } else if (passwordResetMethod === "direct") {
        const newPassword = Math.random().toString(36).substring(2, 15)
        toast({ title: "Sucesso!", description: "Senha redefinida para: " + newPassword })
      }

      const logEntry = {
        id: `log_${Date.now()}`,
        date: new Date().toISOString(),
        action: `Redefinição de senha (${passwordResetMethod})`,
        ip: "187.45.123.45",
        location: "São Paulo, SP",
        admin: "Admin User"
      }
      setSecurityLogs([logEntry, ...securityLogs])
      
      setShowPasswordResetModal(false)
    } catch (error) {
      console.error('[v0] Error resetting password:', error)
      toast({ title: "Erro", description: "Falha ao redefinir senha", variant: "destructive" })
    } finally {
      setIsSavingSecurityAction(false)
    }
  }

  const handleToggle2FA = () => {
    if (is2FAEnabled) {
      setConfirmSecurityAction({
        type: "disable-2fa",
        message: "Tem certeza que deseja desativar 2FA? Isso reduzirá a segurança da conta.",
        callback: handleDisable2FA
      })
      setShowConfirmSecurityAction(true)
    } else {
      setShow2FASetupModal(true)
      setTwoFAQRCode("https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=otpauth://totp/joao%40allka.com?secret=JBSWY3DPEBLW64TMMQ======")
      setTwoFAManualKey("JBSWY3DPEBLW64TMMQ======")
    }
  }

  const handleDisable2FA = async () => {
    setIsSavingSecurityAction(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 800))
      setIs2FAEnabled(false)
      const logEntry = {
        id: `log_${Date.now()}`,
        date: new Date().toISOString(),
        action: "2FA desativado",
        ip: "187.45.123.45",
        location: "São Paulo, SP",
        admin: "Usuário"
      }
      setSecurityLogs([logEntry, ...securityLogs])
      toast({ title: "Sucesso!", description: "2FA foi desativado" })
      setShowConfirmSecurityAction(false)
    } catch (error) {
      console.error('[v0] Error disabling 2FA:', error)
      toast({ title: "Erro", description: "Falha ao desativar 2FA", variant: "destructive" })
    } finally {
      setIsSavingSecurityAction(false)
    }
  }

  const handleVerify2FACode = async () => {
    if (!twoFAVerificationCode || twoFAVerificationCode.length !== 6) {
      toast({ title: "Erro", description: "Digite um código de 6 dígitos", variant: "destructive" })
      return
    }
    
    setIsSavingSecurityAction(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      setIs2FAEnabled(true)
      setTwoFAActivationDate(new Date().toISOString())
      setTwoFALastValidation(new Date().toISOString())
      
      const logEntry = {
        id: `log_${Date.now()}`,
        date: new Date().toISOString(),
        action: "2FA ativado",
        ip: "187.45.123.45",
        location: "São Paulo, SP",
        admin: "Usuário"
      }
      setSecurityLogs([logEntry, ...securityLogs])
      
      toast({ title: "Sucesso!", description: "2FA foi ativado com sucesso" })
      setShow2FASetupModal(false)
      setShowTwoFAVerification(false)
      setTwoFAVerificationCode("")
    } catch (error) {
      console.error('[v0] Error verifying 2FA:', error)
      toast({ title: "Erro", description: "Código inválido", variant: "destructive" })
    } finally {
      setIsSavingSecurityAction(false)
    }
  }

  const handleEndSession = (sessionId: string) => {
    setActiveSessions(activeSessions.filter(s => s.id !== sessionId))
    const session = activeSessions.find(s => s.id === sessionId)
    const logEntry = {
      id: `log_${Date.now()}`,
      date: new Date().toISOString(),
      action: `Sessão encerrada (${session?.browser})`,
      ip: session?.ip || "N/A",
      location: session?.location || "N/A",
      admin: "Admin User"
    }
    setSecurityLogs([logEntry, ...securityLogs])
    toast({ title: "Sucesso!", description: "Sessão encerrada" })
  }

  const handleEndAllSessions = () => {
    setConfirmSecurityAction({
      type: "end-all-sessions",
      message: "Tem certeza que deseja encerrar TODAS as sessões? O usuário será desconectado de todos os dispositivos.",
      callback: () => {
        setActiveSessions([])
        const logEntry = {
          id: `log_${Date.now()}`,
          date: new Date().toISOString(),
          action: "Todas as sessões encerradas",
          ip: "187.45.123.45",
          location: "São Paulo, SP",
          admin: "Admin User"
        }
        setSecurityLogs([logEntry, ...securityLogs])
        toast({ title: "Sucesso!", description: "Todas as sessões foram encerradas" })
        setShowConfirmSecurityAction(false)
      }
    })
    setShowConfirmSecurityAction(true)
  }

  const handleRevokeDevice = (deviceId: string) => {
    setConnectedDevices(connectedDevices.filter(d => d.id !== deviceId))
    const device = connectedDevices.find(d => d.id === deviceId)
    const logEntry = {
      id: `log_${Date.now()}`,
      date: new Date().toISOString(),
      action: `Dispositivo revogado: ${device?.name}`,
      ip: device?.ip || "N/A",
      location: "N/A",
      admin: "Admin User"
    }
    setSecurityLogs([logEntry, ...securityLogs])
    toast({ title: "Sucesso!", description: "Dispositivo revogado" })
  }

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: "Copiado!", description: "Link copiado para a área de transferência" })
  }

  const handleAccordionChange = (value: string | string[], isSingleMode: boolean, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (isSingleMode) {
      // Single mode - only one accordion open at a time
      setter(typeof value === 'string' ? [value] : value as string[])
    } else {
      // Multiple mode - can have multiple accordions open
      setter(value as string[])
    }
  }

  const handleApplyWalletAdjustment = () => {
    if (!walletAdjustValue || parseFloat(walletAdjustValue) <= 0) {
      toast({ title: "Erro", description: "Digite um valor válido", variant: "destructive" })
      return
    }
    setShowWalletConfirmDialog(true)
  }

  const handleConfirmWalletAdjustment = async () => {
    setIsApplyingWallet(true)
    try {
      const adjustValue = parseFloat(walletAdjustValue)
      const currentBalance = (displayUser.wallet_balance as number) || 0
      const newBalance = walletAdjustType === "add" ? currentBalance + adjustValue : currentBalance - adjustValue

      if (newBalance < 0) {
        toast({ title: "Erro", description: "Saldo não pode ser negativo", variant: "destructive" })
        return
      }

      const updatePayload = {
        ...displayUser,
        wallet_balance: newBalance,
        id: displayUser.id
      }

      const response = await fetch(`/api/admin/users/${displayUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      })

      const data = await response.json()

      if (data.success && data.data) {
        setPersistedUserData(prev => ({
          ...prev,
          wallet_balance: newBalance
        }))
        toast({ title: "Sucesso!", description: `Saldo atualizado para R$ ${newBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` })
        setWalletAdjustValue("")
        setShowWalletConfirmDialog(false)
      } else {
        toast({ title: "Erro", description: "Falha ao atualizar saldo", variant: "destructive" })
      }
    } catch (error) {
      console.error('[v0] Error applying wallet adjustment:', error)
      toast({ title: "Erro", description: "Falha ao aplicar ajuste", variant: "destructive" })
    } finally {
      setIsApplyingWallet(false)
    }
  }

  // Permissions Handlers
  const handlePermissionsEditMode = () => {
    setIsPermissionsEditMode(true)
    setPermissionsEditedData({
      role: displayUser.role as string,
      permissions: (displayUser.permissions as string[]) || []
    })
  }

  const handlePermissionsCancelEdit = () => {
    setIsPermissionsEditMode(false)
    setPermissionsEditedData({})
    setShowPermissionsConfirmDialog(false)
  }

  const handlePermissionsFieldChange = (field: string, value: any) => {
    setPermissionsEditedData(prev => ({ ...prev, [field]: value }))
  }

  const handlePermissionToggle = (permission: string) => {
    const currentPerms = permissionsEditedData.permissions || []
    const newPerms = currentPerms.includes(permission) ? currentPerms.filter(p => p !== permission) : [...currentPerms, permission]
    setPermissionsEditedData(prev => ({ ...prev, permissions: newPerms }))
  }

  const handlePermissionsSaveClick = () => {
    setShowPermissionsConfirmDialog(true)
  }

  const handlePermissionsSaveConfirm = async () => {
    setIsSaving(true)
    try {
      const updatePayload = {
        ...displayUser,
        role: permissionsEditedData.role || displayUser.role,
        permissions: permissionsEditedData.permissions || displayUser.permissions,
        id: displayUser.id
      }

      const response = await fetch(`/api/admin/users/${displayUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      })

      const data = await response.json()

      if (data.success && data.data) {
        setPersistedUserData(prev => ({
          ...prev,
          role: updatePayload.role,
          permissions: updatePayload.permissions
        }))
        toast({ title: "Sucesso!", description: "Permissões atualizadas com sucesso" })
        setIsPermissionsEditMode(false)
        setPermissionsEditedData({})
      } else {
        toast({ title: "Erro", description: data.message || "Falha ao salvar permissões", variant: "destructive" })
      }
    } catch (error) {
      console.error('[v0] Error saving permissions:', error)
      toast({ title: "Erro", description: "Falha ao salvar permissões", variant: "destructive" })
    } finally {
      setShowPermissionsConfirmDialog(false)
      setIsSaving(false)
    }
  }

  // Filtrar extrato
  const getFilteredStatements = () => {
    return walletStatements.filter(stmt => {
      if (statementFilters.type !== "all" && stmt.type !== statementFilters.type) return false
      if (statementFilters.startDate && new Date(stmt.date) < new Date(statementFilters.startDate)) return false
      if (statementFilters.endDate && new Date(stmt.date) > new Date(statementFilters.endDate)) return false
      return true
    })
  }

  const handleContaSaveClick = () => {
    setShowConfirmDialog(true)
  }

  const handleContaSaveConfirm = async () => {
    // Validar dados obrigatórios se forem alterados
    const nameToSave = contaEditedData.name ?? displayUser.name
    const emailToSave = contaEditedData.email ?? displayUser.email
    
    if (!nameToSave || !emailToSave) {
      toast({ title: "Erro", description: "Nome e email são obrigatórios", variant: "destructive" })
      setShowConfirmDialog(false)
      return
    }

    setIsSaving(true)
    try {
      // Preparar payload com todos os campos
      const updatePayload = {
        ...displayUser,
        ...contaEditedData,
        name: nameToSave,
        email: emailToSave,
        id: displayUser.id // Garantir que o ID está no payload
      }

      const response = await fetch(`/api/admin/users/${displayUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      })

      const data = await response.json()

      if (data.success && data.data) {
        // Atualizar persistedUserData com os dados retornados da API
        setPersistedUserData(prev => ({
          ...prev,
          ...data.data
        }))
        
        toast({ title: "Sucesso!", description: "Dados da conta atualizados com sucesso" })
        setIsContaEditMode(false)
        setContaEditedData({})
      } else {
        toast({ title: "Erro", description: data.message || "Falha ao salvar dados", variant: "destructive" })
      }
    } catch (error) {
      console.error('[v0] Error saving account data:', error)
      toast({ title: "Erro", description: "Falha ao salvar dados da conta", variant: "destructive" })
    } finally {
      setShowConfirmDialog(false)
      setIsSaving(false)
    }
  }

  const handleContaFieldChange = (field: string, value: any) => {
    setContaEditedData(prev => ({ ...prev, [field]: value }))
  }

  const getContaDisplayValue = (field: string) => {
    return contaEditedData[field as keyof typeof contaEditedData] ?? displayUser[field as keyof UserType]
  }

  const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)

  // Password Reset Handlers
  const handleResetPassword = async () => {
    setIsResettingPassword(true)
    try {
      const response = await fetch(`/api/admin/users/${fakeUser.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset-password' })
      })
      const data = await response.json()
      if (data.success) {
        setResetPasswordToken(data.token)
        setResetPasswordUrl(data.resetUrl)
        toast({ title: "Sucesso!", description: "Token de recuperação gerado. Copie o link abaixo para enviar ao usuário." })
      } else {
        toast({ title: "Erro", description: data.message, variant: "destructive" })
      }
    } catch (error) {
      console.error('[v0] Error resetting password:', error)
      toast({ title: "Erro", description: "Falha ao gerar token de recuperação", variant: "destructive" })
    }
    setIsResettingPassword(false)
  }

  const handleSendResetEmail = async () => {
    setIsSendingResetEmail(true)
    try {
      const response = await fetch(`/api/admin/users/${fakeUser.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send-reset-email' })
      })
      const data = await response.json()
      if (data.success) {
        toast({ title: "Sucesso!", description: "Email de recuperação enviado para " + fakeUser.email })
      } else {
        toast({ title: "Erro", description: data.message, variant: "destructive" })
      }
    } catch (error) {
      console.error('[v0] Error sending reset email:', error)
      toast({ title: "Erro", description: "Falha ao enviar email", variant: "destructive" })
    }
    setIsSendingResetEmail(false)
  }

  const handleCopyResetLink = () => {
    if (resetPasswordUrl) {
      navigator.clipboard.writeText(resetPasswordUrl)
      toast({ title: "Copiado!", description: "Link copiado para a área de transferência" })
    }
  }

  const handleStatusChange = (newStatus: "ativo" | "inativo" | "pausado" | "suspenso") => {
    if (!isContaEditMode) return
    handleContaFieldChange("status", newStatus)
  }

  const handleLevelChange = (newLevel: "free" | "premium" | "vip") => {
    if (!isContaEditMode) return
    handleContaFieldChange("account_type", newLevel)
  }

  const getCurrentStatus = (): "ativo" | "inativo" | "pausado" | "suspenso" => {
    // Se há status editado, usa ele. Caso contrário, usa o padrão "ativo"
    return (contaEditedData.status as any) ?? "ativo"
  }

  const getCurrentLevel = (): "free" | "premium" | "vip" => {
    return (contaEditedData.account_type as any) ?? (fakeUser.account_type as any) ?? "premium"
  }

  const handleAccountStatusUpdate = (newStatus: "ativo" | "inativo" | "pausado" | "suspenso") => {
    if (!isContaEditMode) return
    handleContaFieldChange("status", newStatus)
  }

  const handleAccountLevelUpdate = (newLevel: "free" | "premium" | "vip") => {
    if (!isContaEditMode) return
    handleContaFieldChange("account_type", newLevel)
  }

  const getStatusBadgeColor = (status: "ativo" | "inativo" | "pausado" | "suspenso") => {
    switch (status) {
      case "ativo": return "bg-emerald-100 text-emerald-700 border-emerald-300"
      case "inativo": return "bg-slate-100 text-slate-700 border-slate-300"
      case "pausado": return "bg-amber-100 text-amber-700 border-amber-300"
      case "suspenso": return "bg-red-100 text-red-700 border-red-300"
      default: return "bg-slate-100 text-slate-700 border-slate-300"
    }
  }

  const getAccountLevelBadgeColor = (level: "free" | "premium" | "vip") => {
    switch (level) {
      case "free": return "bg-slate-100 text-slate-700 border-slate-300"
      case "premium": return "bg-blue-100 text-blue-700 border-blue-300"
      case "vip": return "bg-purple-100 text-purple-700 border-purple-300"
      default: return "bg-slate-100 text-slate-700 border-slate-300"
    }
  }

  const statusColors = getStatusColor(onlineStatus)
  const statusLabel = { online: "Online", busy: "Ocupado", away: "Ausente", offline: "Offline" }

  if (!open && !isClosing) return null

  return (
    <>
      <div
        className={cn(
          "fixed top-0 z-40 h-screen",
          "bg-background overflow-hidden flex flex-col",
          "transition-all duration-300 ease-in-out",
          isClosing ? "slide-out-to-right opacity-0" : "slide-in-from-right opacity-100",
        )}
        style={{ 
          left: panelStyle.left,
          width: panelStyle.width,
          display: open && !isClosing ? "flex" : "none" 
        }}
      >
      
        {/* Header - Modern and Premium */}
        <UserViewHeader
          user={displayUser}
          isEditMode={isEditMode}
          isSaving={isSaving}
          onSave={handleSave}
          onCancel={handleCancelEdit}
          onClose={handleClose}
          onExport={handleExport}
          userLevel={userLevel}
          levelProgress={levelProgress}
          userAccountStatus={userAccountStatus}
          userAccountType={userAccountType}
          userPlan={userPlan}
          showBalance={showBalanceAllka}
          onToggleBalance={() => setShowBalanceAllka(!showBalanceAllka)}
        />

        {/* Content with Tabs */}
        <Tabs defaultValue="visao-geral" className="flex-1 flex flex-col min-h-0">
          {/* Tab Navigation - Fixed */}
          <div className="sticky top-0 z-40 flex-shrink-0 border-b border-slate-200 bg-white px-6 py-3 overflow-x-auto">
            <TabsList className="grid w-max grid-cols-6 gap-1 bg-transparent p-0 h-auto">
              {["visao-geral", "conta", "dados", "financeiro", "permissoes", "seguranca"].map(tab => (
                <TabsTrigger
                  key={tab}
                  value={tab}
                  className="px-3 py-2 text-xs font-medium rounded-md border border-transparent data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 data-[state=active]:border-blue-300 hover:bg-slate-100"
                >
                  {tab === "visao-geral" && "Visão Geral"}
                  {tab === "conta" && "Conta"}
                  {tab === "dados" && "Dados"}
                  {tab === "financeiro" && "Financeiro"}
                  {tab === "permissoes" && "Permissões"}
                  {tab === "seguranca" && "Segurança"}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Tab Content - Scrollable */}
          <ScrollArea className="flex-1 min-h-0 overflow-hidden">
            <div className="p-6 space-y-6 app-brand-soft">
              {/* Visão Geral */}
              <TabsContent value="visao-geral" className="space-y-4 mt-0">
                {/* Partnership Card - Convites Especiais */}
                <UserPartnershipCard user={displayUser} accountType={userAccountType} />

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-1 gap-3">
                  {/* Total Tarefas */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Total de Tarefas Executadas</span>
                        <div className="text-3xl font-bold text-slate-900 mt-2">1,247</div>
                        <div className="text-xs text-slate-600 mt-1">+12% em relação ao mês anterior</div>
                      </div>
                      <div className="p-3 bg-white rounded-lg border border-blue-200">
                        <TrendingUp className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                  </div>

                  {/* Nota Geral e Avaliação em Estrelas */}
                  <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4 border border-amber-200">
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Nota Geral na Plataforma</span>
                      <div className="p-2 bg-white rounded-lg border border-amber-200">
                        <Activity className="h-5 w-5 text-amber-600" />
                      </div>
                    </div>
                    
                    {/* Star Rating System */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="text-2xl font-bold text-slate-900">4.5</div>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <div key={star} className="relative">
                              {star <= Math.floor(4.5) ? (
                                <span className="text-lg">★</span>
                              ) : star === Math.ceil(4.5) && 4.5 % 1 !== 0 ? (
                                <div className="relative inline-block">
                                  <span className="text-lg text-slate-300">★</span>
                                  <div className="absolute top-0 left-0 overflow-hidden" style={{ width: '50%' }}>
                                    <span className="text-lg text-amber-400">★</span>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-lg text-slate-300">★</span>
                              )}
                            </div>
                          ))}
                        </div>
                        <span className="text-xs text-slate-600 ml-2">(125 avaliações)</span>
                      </div>

                      {/* Progress Bar to Next Star */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-600">Progresso até 5 estrelas</span>
                          <span className="text-xs font-semibold text-slate-700">90%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div className="bg-gradient-to-r from-amber-400 to-amber-500 h-2 rounded-full transition-all" style={{ width: '90%' }} />
                        </div>
                      </div>

                      {/* Trend Indicator */}
                      <div className="flex items-center gap-2 pt-2">
                        <div className="flex items-center gap-1 text-xs">
                          <TrendingUp className="h-4 w-4 text-emerald-600" />
                          <span className="text-emerald-700 font-semibold">Subindo</span>
                        </div>
                        <span className="text-xs text-slate-600">+0.2 estrelas este mês</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Activity Metrics */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white rounded-lg p-3 border border-slate-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-600 font-medium">Último Login</span>
                      <Clock className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div className="text-sm font-bold text-slate-900">Hoje</div>
                    <div className="text-xs text-slate-500">14:30 (2h atrás)</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-slate-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-600 font-medium">Média Sessão</span>
                      <Activity className="h-4 w-4 text-purple-600" />
                    </div>
                    <div className="text-sm font-bold text-slate-900">18 min</div>
                    <div className="text-xs text-slate-500">Tempo médio</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-slate-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-600 font-medium">Taxa Atividade</span>
                      <Zap className="h-4 w-4 text-amber-600" />
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-700 text-xs">Alta</Badge>
                    <div className="text-xs text-slate-500 mt-1">87% (7 dias)</div>
                  </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-lg p-3 border border-slate-200">
                    <h4 className="text-xs font-semibold text-slate-700 mb-2">Acessos (30 dias)</h4>
                    <ResponsiveContainer width="100%" height={150}>
                      <LineChart data={accessChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <RechartsTooltip contentStyle={{ backgroundColor: "#1e293b", border: "none", borderRadius: "4px", color: "#fff", fontSize: "11px" }} />
                        <Line type="monotone" dataKey="acessos" stroke="#2563eb" strokeWidth={2} dot={{ fill: "#2563eb", r: 2 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-slate-200">
                    <h4 className="text-xs font-semibold text-slate-700 mb-2">Módulos Mais Usados</h4>
                    <ResponsiveContainer width="100%" height={150}>
                      <BarChart data={moduleUsageData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis type="number" tick={{ fontSize: 10 }} />
                        <YAxis dataKey="nome" type="category" tick={{ fontSize: 9 }} width={60} />
                        <RechartsTooltip contentStyle={{ backgroundColor: "#1e293b", border: "none", borderRadius: "4px", color: "#fff", fontSize: "11px" }} />
                        <Bar dataKey="uso" fill="#3b82f6" radius={2} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Account Info - Accordion */}
                <Accordion type="multiple" defaultValue={["info-principais"]} className="space-y-3">
                  <AccordionItem value="info-principais" className="border border-slate-200 rounded-lg overflow-hidden">
                    <AccordionTrigger className="px-4 py-3 hover:bg-slate-50 [&[data-state=open]]:bg-slate-50">
                      <div className="flex items-center gap-2">
                        <UserIcon className="h-5 w-5 text-blue-600" />
                        <span className="font-semibold text-slate-900">Informações Principais</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 py-4 border-t border-slate-100">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-slate-600">ID:</span><code className="bg-slate-100 px-2 py-1 rounded text-xs">{displayUser.id}</code></div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600">Tipo:</span>
                          {(() => {
                            const normalized = userAccountType ? String(userAccountType).toLowerCase().trim() : null
                            
                            if (normalized === "company") {
                              return <Badge className="bg-purple-600 hover:bg-purple-700 text-white">Company</Badge>
                            } else if (normalized === "nomad") {
                              return <Badge className="bg-blue-600 hover:bg-blue-700 text-white">Nomad</Badge>
                            } else if (normalized === "agency") {
                              return <Badge className="bg-orange-600 hover:bg-orange-700 text-white">Agency</Badge>
                            } else if (normalized) {
                              return <Badge className="bg-slate-600">{userAccountType}</Badge>
                            } else {
                              return <Badge className="bg-blue-600">{getCurrentLevel().charAt(0).toUpperCase() + getCurrentLevel().slice(1)}</Badge>
                            }
                          })()}
                        </div>
                        <div className="flex justify-between items-center"><span className="text-slate-600">Função:</span><Badge variant="outline">Admin</Badge></div>
                        <div className="flex justify-between items-center"><span className="text-slate-600">Status:</span><CheckCircle2 className="h-4 w-4 text-emerald-600" /></div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </TabsContent>

              {/* Conta */}
              <TabsContent value="conta" className="space-y-4 mt-0">
                  {/* Header with Edit Button */}
                <div className="flex items-center justify-between sticky top-0 bg-white z-10 pb-4">
                  <h3 className="text-lg font-semibold text-slate-900">Gerenciar Conta</h3>
                  <div className="flex items-center gap-2">
                    {!isContaEditMode ? (
                      <Button onClick={handleContaEditMode} size="sm" className="bg-blue-600 hover:bg-blue-700">
                        <Edit2 className="h-4 w-4 mr-2" />
                        Editar Perfil
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button onClick={handleContaSaveClick} size="sm" disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700">
                          {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                          {isSaving ? "Salvando..." : "Salvar"}
                        </Button>
                        <Button onClick={handleContaCancelEdit} size="sm" variant="outline">
                          <XCircle className="h-4 w-4 mr-2" />
                          Cancelar
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Accordions */}
                <Accordion type="multiple" value={openAccordions} onValueChange={setOpenAccordions} className="space-y-3">
                  {/* 1. DADOS PRINCIPAIS DA CONTA */}
                  <AccordionItem value="dados-principais" className="border border-slate-200 rounded-lg overflow-hidden">
                    <AccordionTrigger className="px-4 py-3 hover:bg-slate-50 [&[data-state=open]]:bg-slate-50">
                      <div className="flex items-center gap-2">
                        <UserIcon className="h-5 w-5 text-blue-600" />
                        <span className="font-semibold text-slate-900">Dados Principais da Conta</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 py-4 border-t border-slate-100">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Nome Completo */}
                        <div>
                          <label className="text-xs font-semibold text-slate-600 block mb-2 uppercase tracking-wide">Nome Completo</label>
                          {isContaEditMode ? (
                            <Input value={getContaDisplayValue("name") as string} onChange={(e) => handleContaFieldChange("name", e.target.value)} className="border-slate-300" placeholder="Digite o nome completo" />
                          ) : (
                            <div className="font-medium text-slate-900">{getContaDisplayValue("name")}</div>
                          )}
                        </div>

                        {/* Email */}
                        <div>
                          <label className="text-xs font-semibold text-slate-600 block mb-2 uppercase tracking-wide">Email</label>
                          {isContaEditMode ? (
                            <Input type="email" value={getContaDisplayValue("email") as string} onChange={(e) => handleContaFieldChange("email", e.target.value)} className="border-slate-300" placeholder="Digite o email" />
                          ) : (
                            <div className="font-medium text-slate-900 truncate">{getContaDisplayValue("email")}</div>
                          )}
                        </div>

                        {/* Username / Login */}
                        <div>
                          <label className="text-xs font-semibold text-slate-600 block mb-2 uppercase tracking-wide">Username / Login</label>
                          <div className="font-medium text-slate-900 truncate">{displayUser.email?.split("@")[0] || "username"}</div>
                        </div>

                        {/* ID Interno */}
                        <div>
                          <label className="text-xs font-semibold text-slate-600 block mb-2 uppercase tracking-wide">ID Interno</label>
                          <code className="bg-slate-100 px-3 py-2 rounded text-sm font-mono font-bold text-slate-900">{displayUser.id}</code>
                        </div>

                        {/* Data Criação */}
                        <div>
                          <label className="text-xs font-semibold text-slate-600 block mb-2 uppercase tracking-wide">Data de Criação</label>
                          <div className="font-medium text-slate-900">10 jan 2024</div>
                        </div>

                        {/* Último Login */}
                        <div>
                          <label className="text-xs font-semibold text-slate-600 block mb-2 uppercase tracking-wide">Último Login</label>
                          <div className="font-medium text-slate-900">Hoje às 14:30</div>
                        </div>

                        {/* Tipo de Usuário */}
                        <div>
                          <label className="text-xs font-semibold text-slate-600 block mb-2 uppercase tracking-wide">Tipo de Usuário</label>
                          {isContaEditMode ? (
                            <select value={getContaDisplayValue("role") as string || "admin"} onChange={(e) => handleContaFieldChange("role", e.target.value)} className="w-full border border-slate-300 rounded px-3 py-2 text-sm font-medium">
                              <option value="admin">Admin</option>
                              <option value="nômade">Nômade</option>
                              <option value="líder">Líder</option>
                              <option value="usuário">Usuário</option>
                            </select>
                          ) : (
                            <Badge className="bg-blue-100 text-blue-700 border border-blue-300 capitalize">{getContaDisplayValue("role")}</Badge>
                          )}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* 2. STATUS DA CONTA */}
                  <AccordionItem value="status-conta" className="border border-slate-200 rounded-lg overflow-hidden">
                    <AccordionTrigger className="px-4 py-3 hover:bg-slate-50 [&[data-state=open]]:bg-slate-50">
                      <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-amber-600" />
                        <span className="font-semibold text-slate-900">Status da Conta</span>
                        <Badge className={`ml-auto ${getStatusBadgeColor(getCurrentStatus())} border`}>{getCurrentStatus().charAt(0).toUpperCase() + getCurrentStatus().slice(1)}</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 py-4 border-t border-slate-100">
                      <div className="space-y-4">
                        {/* Status Selection - Only in Edit Mode */}
                        {isContaEditMode ? (
                          <>
                            <div>
                              <label className="text-sm font-semibold text-slate-900 block mb-3">Alterar Status da Conta</label>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {(['ativo', 'inativo', 'pausado', 'suspenso'] as const).map(status => (
                                  <Button
                                    key={status}
                                    onClick={() => handleStatusChange(status)}
                                    variant={getCurrentStatus() === status ? "default" : "outline"}
                                    className={`text-xs font-medium capitalize ${
                                      getCurrentStatus() === status
                                        ? status === 'ativo'
                                          ? 'bg-emerald-600 hover:bg-emerald-700'
                                          : status === 'inativo'
                                          ? 'bg-slate-600 hover:bg-slate-700'
                                          : status === 'pausado'
                                          ? 'bg-amber-600 hover:bg-amber-700'
                                          : 'bg-red-600 hover:bg-red-700'
                                        : ''
                                    }`}
                                  >
                                    {status}
                                  </Button>
                                ))}
                              </div>
                            </div>

                            {/* Status Info */}
                            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                              <p className="text-xs text-slate-600">
                                {getCurrentStatus() === 'ativo' && "A conta está ativa e o usuário pode acessar todos os recursos normalmente."}
                                {getCurrentStatus() === 'inativo' && "A conta está inativa. O usuário não pode fazer login."}
                                {getCurrentStatus() === 'pausado' && "A conta está pausada temporariamente. O usuário pode reativar depois."}
                                {getCurrentStatus() === 'suspenso' && "A conta está suspensa por violação de políticas."}
                              </p>
                            </div>
                          </>
                        ) : (
                          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                            <p className="text-xs text-slate-600 mb-3">Status Atual:</p>
                            <Badge className={`${getStatusBadgeColor(getCurrentStatus())} border text-sm py-2`}>
                              {getCurrentStatus().charAt(0).toUpperCase() + getCurrentStatus().slice(1)}
                            </Badge>
                            <p className="text-xs text-slate-600 mt-3">
                              {getCurrentStatus() === 'ativo' && "A conta está ativa e o usuário pode acessar todos os recursos normalmente."}
                              {getCurrentStatus() === 'inativo' && "A conta está inativa. O usuário não pode fazer login."}
                              {getCurrentStatus() === 'pausado' && "A conta está pausada temporariamente. O usuário pode reativar depois."}
                              {getCurrentStatus() === 'suspenso' && "A conta está suspensa por violação de políticas."}
                            </p>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* 3. NÍVEL E PLANO */}
                  <AccordionItem value="nivel-performance" className="border border-slate-200 rounded-lg overflow-hidden">
                    <AccordionTrigger className="px-4 py-3 hover:bg-slate-50 [&[data-state=open]]:bg-slate-50">
                      <div className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-purple-600" />
                        <span className="font-semibold text-slate-900">Nível e Plano da Conta</span>
                        <Badge className={`ml-auto ${getAccountLevelBadgeColor(getCurrentLevel())} border capitalize`}>{getCurrentLevel()}</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 py-4 border-t border-slate-100">
                      <div className="space-y-4">
                        {/* Level Selection - Only in Edit Mode */}
                        {isContaEditMode ? (
                          <>
                            <div>
                              <label className="text-sm font-semibold text-slate-900 block mb-3">Alterar Nível da Conta</label>
                              <div className="grid grid-cols-3 gap-2">
                                {(['free', 'premium', 'vip'] as const).map(level => (
                                  <Button
                                    key={level}
                                    onClick={() => handleLevelChange(level)}
                                    variant={getCurrentLevel() === level ? "default" : "outline"}
                                    className={`text-xs font-medium capitalize ${
                                      getCurrentLevel() === level
                                        ? level === 'free'
                                          ? 'bg-slate-600 hover:bg-slate-700'
                                          : level === 'premium'
                                          ? 'bg-blue-600 hover:bg-blue-700'
                                          : 'bg-purple-600 hover:bg-purple-700'
                                        : ''
                                    }`}
                                  >
                                    {level}
                                  </Button>
                                ))}
                              </div>
                            </div>

                            {/* Performance Metrics */}
                            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200 p-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Level */}
                                <div>
                                  <label className="text-xs font-semibold text-slate-600 block mb-1">Nível Atual</label>
                                  <div className="flex items-center gap-2">
                                    <div className="text-3xl font-bold text-purple-700">7</div>
                                    <div className="text-xs text-slate-600">de 10</div>
                                  </div>
                                </div>

                                {/* Rating */}
                                <div>
                                  <label className="text-xs font-semibold text-slate-600 block mb-1">Classificação</label>
                                  <div className="flex items-center gap-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <span key={star} className="text-lg">{star <= 4 ? "★" : "☆"}</span>
                                    ))}
                                    <span className="text-xs text-slate-600 ml-2">4.0/5.0</span>
                                  </div>
                                </div>

                                {/* Progress */}
                                <div className="md:col-span-2">
                                  <label className="text-xs font-semibold text-slate-600 block mb-2">Progresso até Nível 8</label>
                                  <div className="space-y-1">
                                    <div className="flex justify-between items-center">
                                      <span className="text-xs text-slate-600">75%</span>
                                    </div>
                                    <div className="w-full bg-slate-300 rounded-full h-2.5">
                                      <div className="bg-gradient-to-r from-purple-400 to-purple-600 h-2.5 rounded-full" style={{ width: '75%' }} />
                                    </div>
                                  </div>
                                </div>

                                {/* Trend */}
                                <div className="md:col-span-2 flex items-center gap-2 bg-white bg-opacity-60 rounded px-3 py-2">
                                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                                  <div className="text-xs">
                                    <span className="font-semibold text-emerald-700">Em Ascensão</span>
                                    <span className="text-slate-600 ml-2">+2 níveis este trimestre</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200 p-4">
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-xs font-semibold text-slate-600 mb-1">Plano Atual</p>
                                  <Badge className={`${getAccountLevelBadgeColor(getCurrentLevel())} border capitalize text-sm py-2`}>
                                    {getCurrentLevel()}
                                  </Badge>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs font-semibold text-slate-600 mb-1">Nível</p>
                                  <div className="text-3xl font-bold text-purple-700">7</div>
                                </div>
                              </div>

                              <div className="border-t border-purple-200 pt-3">
                                <label className="text-xs font-semibold text-slate-600 block mb-2">Progresso</label>
                                <div className="w-full bg-slate-300 rounded-full h-2.5">
                                  <div className="bg-gradient-to-r from-purple-400 to-purple-600 h-2.5 rounded-full" style={{ width: '75%' }} />
                                </div>
                                <p className="text-xs text-slate-600 mt-2">75% até o próximo nível</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </TabsContent>

              {/* Dados Unificados */}
              {/* Dados */}
              <TabsContent value="dados" className="space-y-4 mt-0">
                {/* Header with Edit Button */}
                <div className="flex items-center justify-between sticky top-0 bg-white z-10 pb-4">
                  <h3 className="text-lg font-semibold text-slate-900">Dados do Usuário</h3>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const allOpen = USER_DADOS_ALL_ACCORDIONS.every(a => dadosOpenAccordions.includes(a))
                        setDadosOpenAccordions(allOpen ? [] : USER_DADOS_ALL_ACCORDIONS)
                      }}
                      className="text-xs"
                    >
                      <ChevronsUpDown className="h-3.5 w-3.5 mr-1.5" />
                      {USER_DADOS_ALL_ACCORDIONS.every(a => dadosOpenAccordions.includes(a)) ? "Fechar todos" : "Abrir todos"}
                    </Button>
                    {!isDadosEditMode ? (
                      <Button onClick={handleDadosEditMode} size="sm" className="bg-blue-600 hover:bg-blue-700">
                        <Edit2 className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button onClick={handleDadosSaveClick} size="sm" disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700">
                          {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                          {isSaving ? "Salvando..." : "Salvar"}
                        </Button>
                        <Button onClick={handleDadosCancelEdit} size="sm" variant="outline">
                          <XCircle className="h-4 w-4 mr-2" />
                          Cancelar
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Accordions */}
                <Accordion type="multiple" value={dadosOpenAccordions} onValueChange={setDadosOpenAccordions} className="space-y-3">
                  {/* DADOS PESSOAIS */}
                  <AccordionItem value="pessoais" className="border border-slate-200 rounded-lg overflow-hidden">
                    <AccordionTrigger className="px-4 py-3 hover:bg-slate-50 [&[data-state=open]]:bg-slate-50">
                      <div className="flex items-center gap-2">
                        <UserIcon className="h-5 w-5 text-blue-600" />
                        <span className="font-semibold text-slate-900">Dados Pessoais</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 py-4 border-t border-slate-100">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Nome Completo */}
                        <div>
                          <label className="text-xs font-semibold text-slate-600 block mb-2 uppercase tracking-wide">Nome Completo</label>
                          {isDadosEditMode ? (
                            <Input value={getDadosDisplayValue("name") as string} onChange={(e) => handleDadosFieldChange("name", e.target.value)} className="border-slate-300" placeholder="Digite o nome completo" />
                          ) : (
                            <div className="font-medium text-slate-900">{getDadosDisplayValue("name")}</div>
                          )}
                        </div>

                        {/* Nome Social */}
                        <div>
                          <label className="text-xs font-semibold text-slate-600 block mb-2 uppercase tracking-wide">Nome Social</label>
                          {isDadosEditMode ? (
                            <Input value={getDadosDisplayValue("social_name") as string || ""} onChange={(e) => handleDadosFieldChange("social_name", e.target.value)} className="border-slate-300" placeholder="Se aplicável" />
                          ) : (
                            <div className="font-medium text-slate-900">{getDadosDisplayValue("social_name") || "—"}</div>
                          )}
                        </div>

                        {/* Data Nascimento */}
                        <div>
                          <label className="text-xs font-semibold text-slate-600 block mb-2 uppercase tracking-wide">Data de Nascimento</label>
                          {isDadosEditMode ? (
                            <Input type="date" value={getDadosDisplayValue("birth_date") as string || ""} onChange={(e) => handleDadosFieldChange("birth_date", e.target.value)} className="border-slate-300" />
                          ) : (
                            <div className="font-medium text-slate-900">{getDadosDisplayValue("birth_date") || "15 mai 1990"}</div>
                          )}
                        </div>

                        {/* Sexo / Gênero */}
                        <div>
                          <label className="text-xs font-semibold text-slate-600 block mb-2 uppercase tracking-wide">Sexo / Gênero</label>
                          {isDadosEditMode ? (
                            <select value={getDadosDisplayValue("gender") as string || ""} onChange={(e) => handleDadosFieldChange("gender", e.target.value)} className="w-full border border-slate-300 rounded px-3 py-2 text-sm font-medium">
                              <option value="">Selecione</option>
                              <option value="M">Masculino</option>
                              <option value="F">Feminino</option>
                              <option value="O">Outro</option>
                              <option value="N">Prefiro não informar</option>
                            </select>
                          ) : (
                            <div className="font-medium text-slate-900">{getDadosDisplayValue("gender") || "—"}</div>
                          )}
                        </div>

                        {/* CPF */}
                        <div>
                          <label className="text-xs font-semibold text-slate-600 block mb-2 uppercase tracking-wide">CPF / Documento</label>
                          {isDadosEditMode ? (
                            <Input value={getDadosDisplayValue("cpf") as string || ""} onChange={(e) => handleDadosFieldChange("cpf", e.target.value)} className="border-slate-300 font-mono" placeholder="000.000.000-00" />
                          ) : (
                            <code className="bg-slate-100 px-3 py-2 rounded text-sm font-mono font-bold text-slate-900">{getDadosDisplayValue("cpf") || "—"}</code>
                          )}
                        </div>

                        {/* RG */}
                        <div>
                          <label className="text-xs font-semibold text-slate-600 block mb-2 uppercase tracking-wide">RG (se aplicável)</label>
                          {isDadosEditMode ? (
                            <Input value={getDadosDisplayValue("rg") as string || ""} onChange={(e) => handleDadosFieldChange("rg", e.target.value)} className="border-slate-300 font-mono" placeholder="RG" />
                          ) : (
                            <div className="font-medium text-slate-900">{getDadosDisplayValue("rg") || "—"}</div>
                          )}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* CONTATO */}
                  <AccordionItem value="contato" className="border border-slate-200 rounded-lg overflow-hidden">
                    <AccordionTrigger className="px-4 py-3 hover:bg-slate-50 [&[data-state=open]]:bg-slate-50">
                      <div className="flex items-center gap-2">
                        <Mail className="h-5 w-5 text-amber-600" />
                        <span className="font-semibold text-slate-900">Contato</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 py-4 border-t border-slate-100">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Email */}
                        <div className="md:col-span-2">
                          <label className="text-xs font-semibold text-slate-600 block mb-2 uppercase tracking-wide">Email</label>
                          {isDadosEditMode ? (
                            <Input type="email" value={getDadosDisplayValue("email") as string} onChange={(e) => handleDadosFieldChange("email", e.target.value)} className="border-slate-300" placeholder="email@example.com" />
                          ) : (
                            <div className="font-medium text-slate-900">{getDadosDisplayValue("email")}</div>
                          )}
                        </div>

                        {/* Telefone Principal */}
                        <div>
                          <label className="text-xs font-semibold text-slate-600 block mb-2 uppercase tracking-wide">Telefone Principal</label>
                          {isDadosEditMode ? (
                            <Input type="tel" value={getDadosDisplayValue("phone") as string || ""} onChange={(e) => handleDadosFieldChange("phone", e.target.value)} className="border-slate-300" placeholder="(00) 00000-0000" />
                          ) : (
                            <div className="font-medium text-slate-900">{getDadosDisplayValue("phone") || "—"}</div>
                          )}
                        </div>

                        {/* Telefone Secundário */}
                        <div>
                          <label className="text-xs font-semibold text-slate-600 block mb-2 uppercase tracking-wide">Telefone Secundário</label>
                          {isDadosEditMode ? (
                            <Input type="tel" value={getDadosDisplayValue("phone_secondary") as string || ""} onChange={(e) => handleDadosFieldChange("phone_secondary", e.target.value)} className="border-slate-300" placeholder="(00) 00000-0000" />
                          ) : (
                            <div className="font-medium text-slate-900">{getDadosDisplayValue("phone_secondary") || "—"}</div>
                          )}
                        </div>

                        {/* WhatsApp */}
                        <div>
                          <label className="text-xs font-semibold text-slate-600 block mb-2 uppercase tracking-wide">WhatsApp</label>
                          {isDadosEditMode ? (
                            <Input type="tel" value={getDadosDisplayValue("whatsapp") as string || ""} onChange={(e) => handleDadosFieldChange("whatsapp", e.target.value)} className="border-slate-300" placeholder="(00) 00000-0000" />
                          ) : (
                            <div className="font-medium text-slate-900">{getDadosDisplayValue("whatsapp") || "—"}</div>
                          )}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* ENDEREÇO */}
                  <AccordionItem value="endereco" className="border border-slate-200 rounded-lg overflow-hidden">
                    <AccordionTrigger className="px-4 py-3 hover:bg-slate-50 [&[data-state=open]]:bg-slate-50">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-green-600" />
                        <span className="font-semibold text-slate-900">Endereço</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 py-4 border-t border-slate-100">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* CEP */}
                        <div>
                          <label className="text-xs font-semibold text-slate-600 block mb-2 uppercase tracking-wide">CEP</label>
                          {isDadosEditMode ? (
                            <Input value={getDadosDisplayValue("zip_code") as string || ""} onChange={(e) => handleDadosFieldChange("zip_code", e.target.value)} className="border-slate-300 font-mono" placeholder="00000-000" />
                          ) : (
                            <code className="bg-slate-100 px-3 py-2 rounded text-sm font-mono font-bold text-slate-900">{getDadosDisplayValue("zip_code") || "—"}</code>
                          )}
                        </div>

                        {/* Rua */}
                        <div>
                          <label className="text-xs font-semibold text-slate-600 block mb-2 uppercase tracking-wide">Rua</label>
                          {isDadosEditMode ? (
                            <Input value={getDadosDisplayValue("street") as string || ""} onChange={(e) => handleDadosFieldChange("street", e.target.value)} className="border-slate-300" placeholder="Nome da rua" />
                          ) : (
                            <div className="font-medium text-slate-900">{getDadosDisplayValue("street") || "—"}</div>
                          )}
                        </div>

                        {/* Número */}
                        <div>
                          <label className="text-xs font-semibold text-slate-600 block mb-2 uppercase tracking-wide">Número</label>
                          {isDadosEditMode ? (
                            <Input value={getDadosDisplayValue("number") as string || ""} onChange={(e) => handleDadosFieldChange("number", e.target.value)} className="border-slate-300" placeholder="123" />
                          ) : (
                            <div className="font-medium text-slate-900">{getDadosDisplayValue("number") || "—"}</div>
                          )}
                        </div>

                        {/* Complemento */}
                        <div>
                          <label className="text-xs font-semibold text-slate-600 block mb-2 uppercase tracking-wide">Complemento</label>
                          {isDadosEditMode ? (
                            <Input value={getDadosDisplayValue("complement") as string || ""} onChange={(e) => handleDadosFieldChange("complement", e.target.value)} className="border-slate-300" placeholder="Apto 123, Bloco A" />
                          ) : (
                            <div className="font-medium text-slate-900">{getDadosDisplayValue("complement") || "—"}</div>
                          )}
                        </div>

                        {/* Bairro */}
                        <div>
                          <label className="text-xs font-semibold text-slate-600 block mb-2 uppercase tracking-wide">Bairro</label>
                          {isDadosEditMode ? (
                            <Input value={getDadosDisplayValue("neighborhood") as string || ""} onChange={(e) => handleDadosFieldChange("neighborhood", e.target.value)} className="border-slate-300" placeholder="Nome do bairro" />
                          ) : (
                            <div className="font-medium text-slate-900">{getDadosDisplayValue("neighborhood") || "—"}</div>
                          )}
                        </div>

                        {/* Cidade */}
                        <div>
                          <label className="text-xs font-semibold text-slate-600 block mb-2 uppercase tracking-wide">Cidade</label>
                          {isDadosEditMode ? (
                            <Input value={getDadosDisplayValue("city") as string || ""} onChange={(e) => handleDadosFieldChange("city", e.target.value)} className="border-slate-300" placeholder="São Paulo" />
                          ) : (
                            <div className="font-medium text-slate-900">{getDadosDisplayValue("city") || "—"}</div>
                          )}
                        </div>

                        {/* Estado */}
                        <div>
                          <label className="text-xs font-semibold text-slate-600 block mb-2 uppercase tracking-wide">Estado</label>
                          {isDadosEditMode ? (
                            <Input value={getDadosDisplayValue("state") as string || ""} onChange={(e) => handleDadosFieldChange("state", e.target.value.toUpperCase())} className="border-slate-300" placeholder="SP" maxLength={2} />
                          ) : (
                            <div className="font-medium text-slate-900">{getDadosDisplayValue("state") || "—"}</div>
                          )}
                        </div>

                        {/* País */}
                        <div>
                          <label className="text-xs font-semibold text-slate-600 block mb-2 uppercase tracking-wide">País</label>
                          {isDadosEditMode ? (
                            <Input value={getDadosDisplayValue("country") as string || "Brasil"} onChange={(e) => handleDadosFieldChange("country", e.target.value)} className="border-slate-300" placeholder="Brasil" />
                          ) : (
                            <div className="font-medium text-slate-900">{getDadosDisplayValue("country") || "Brasil"}</div>
                          )}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* INFORMAÇÕES ADICIONAIS */}
                  <AccordionItem value="adicionais" className="border border-slate-200 rounded-lg overflow-hidden">
                    <AccordionTrigger className="px-4 py-3 hover:bg-slate-50 [&[data-state=open]]:bg-slate-50">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-purple-600" />
                        <span className="font-semibold text-slate-900">Informações Adicionais</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 py-4 border-t border-slate-100">
                      <div className="space-y-4">
                        {/* Observações Administrativas */}
                        <div>
                          <label className="text-xs font-semibold text-slate-600 block mb-2 uppercase tracking-wide">Observações Administrativas</label>
                          {isDadosEditMode ? (
                            <textarea value={getDadosDisplayValue("admin_notes") as string || ""} onChange={(e) => handleDadosFieldChange("admin_notes", e.target.value)} className="w-full border border-slate-300 rounded px-3 py-2 text-sm font-medium min-h-20" placeholder="Notas visíveis para admin" />
                          ) : (
                            <div className="font-medium text-slate-900 whitespace-pre-wrap">{getDadosDisplayValue("admin_notes") || "—"}</div>
                          )}
                        </div>

                        {/* Notas Internas */}
                        <div>
                          <label className="text-xs font-semibold text-slate-600 block mb-2 uppercase tracking-wide">Notas Internas (Visíveis apenas para admin)</label>
                          {isDadosEditMode ? (
                            <textarea value={getDadosDisplayValue("internal_notes") as string || ""} onChange={(e) => handleDadosFieldChange("internal_notes", e.target.value)} className="w-full border border-slate-300 rounded px-3 py-2 text-sm font-medium min-h-20" placeholder="Notas internas do sistema" />
                          ) : (
                            <div className="font-medium text-slate-900 whitespace-pre-wrap">{getDadosDisplayValue("internal_notes") || "—"}</div>
                          )}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </TabsContent>

              {/* Financeiro */}
              {/* Financeiro */}
              <TabsContent value="financeiro" className="space-y-4 mt-0">
                {/* Header with Edit Button */}
                <div className="flex items-center justify-between sticky top-0 bg-white z-10 pb-4">
                  <h3 className="text-lg font-semibold text-slate-900">Dados Financeiros</h3>
                  <div className="flex items-center gap-2">
                    {!isFinancialEditMode ? (
                      <Button onClick={handleFinancialEditMode} size="sm" className="bg-blue-600 hover:bg-blue-700">
                        <Edit2 className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button onClick={handleFinancialSaveClick} size="sm" disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700">
                          {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                          {isSaving ? "Salvando..." : "Salvar"}
                        </Button>
                        <Button onClick={handleFinancialCancelEdit} size="sm" variant="outline">
                          <XCircle className="h-4 w-4 mr-2" />
                          Cancelar
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Accordions */}
                <Accordion type="multiple" value={financialOpenAccordions} onValueChange={setFinancialOpenAccordions} className="space-y-3">
                  {/* MÉTODOS DE PAGAMENTO */}
                  <AccordionItem value="pagamentos" className="border border-slate-200 rounded-lg overflow-hidden">
                    <AccordionTrigger className="px-4 py-3 hover:bg-slate-50 [&[data-state=open]]:bg-slate-50">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-blue-600" />
                        <span className="font-semibold text-slate-900">Métodos de Pagamento</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 py-4 border-t border-slate-100">
                      <div className="space-y-6">
                        {/* CARTÕES DE CRÉDITO */}
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <label className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Cartões de Crédito/Débito</label>
                            {isFinancialEditMode && (
                              <Button onClick={handleAddCard} size="sm" className="h-8 gap-1 bg-blue-600 hover:bg-blue-700">
                                <Plus className="h-4 w-4" />
                                Novo Cartão
                              </Button>
                            )}
                          </div>
                          {cards.length === 0 ? (
                            <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                              <CreditCard className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                              <p className="text-sm text-slate-600">Nenhum cartão cadastrado</p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {cards.map(card => (
                                <div key={card.id} className={`relative h-56 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group ${card.isDefault ? "ring-2 ring-blue-500" : ""}`} style={{
                                  background: card.isDefault ? "linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)" : "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)"
                                }}>
                                  {/* Card Background Pattern */}
                                  <div className="absolute inset-0 opacity-10">
                                    <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full blur-3xl" />
                                  </div>
                                  
                                  <div className="relative h-full p-6 flex flex-col justify-between text-white">
                                    {/* Top Row */}
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <div className="text-xs font-semibold opacity-75 uppercase tracking-widest">BANCO</div>
                                        <div className="text-lg font-bold">{card.brand}</div>
                                      </div>
                                      {card.isDefault && (
                                        <div className="bg-white bg-opacity-20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold">
                                          Padrão
                                        </div>
                                      )}
                                    </div>

                                    {/* Middle - Card Number */}
                                    <div>
                                      <div className="text-xs font-semibold opacity-75 uppercase tracking-widest mb-2">Número</div>
                                      <div className="text-2xl font-mono font-bold tracking-widest">•••• •••• •••• {card.lastDigits}</div>
                                    </div>

                                    {/* Bottom Row */}
                                    <div className="flex justify-between items-end">
                                      <div>
                                        <div className="text-xs font-semibold opacity-75 uppercase tracking-widest">Titular</div>
                                        <div className="text-sm font-bold">{card.holder}</div>
                                      </div>
                                      <div className="text-right">
                                        <div className="text-xs font-semibold opacity-75 uppercase tracking-widest">Validade</div>
                                        <div className="text-sm font-bold">{card.expiry}</div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Actions Overlay */}
                                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-300 flex items-end justify-center pb-4 opacity-0 group-hover:opacity-100">
                                    <div className="flex gap-2">
                                      {!card.isDefault && (
                                        <Button onClick={() => handleSetDefaultCard(card.id)} size="sm" className="bg-white text-slate-900 hover:bg-blue-100 font-semibold h-9 px-4">
                                          Definir Padrão
                                        </Button>
                                      )}
                                      {isFinancialEditMode && (
                                        <>
                                          <Button onClick={() => handleDeleteCard(card.id)} size="sm" variant="outline" className="bg-white text-slate-900 hover:bg-red-100 h-9 px-3">
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* PIX */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <label className="text-sm font-semibold text-slate-900 uppercase tracking-wide">PIX</label>
                            {isFinancialEditMode && (
                              <Button size="sm" variant="outline" className="h-8 gap-1 bg-transparent">
                                <Plus className="h-4 w-4" />
                                Adicionar
                              </Button>
                            )}
                          </div>
                          <div className="space-y-2">
                            {isFinancialEditMode ? (
                              <div className="space-y-2">
                                <Input placeholder="Chave PIX (CPF, CNPJ, email, telefone ou chave aleatória)" value={getFinancialDisplayValue("pix_key") as string || ""} onChange={(e) => handleFinancialFieldChange("pix_key", e.target.value)} className="border-slate-300" />
                              </div>
                            ) : (
                              <div className="bg-slate-50 p-3 rounded border border-slate-200 text-sm text-slate-700">
                                {getFinancialDisplayValue("pix_key") || "Nenhuma chave PIX cadastrada"}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* CONTAS BANCÁRIAS */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <label className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Contas Bancárias</label>
                            {isFinancialEditMode && (
                              <Button size="sm" variant="outline" className="h-8 gap-1 bg-transparent">
                                <Plus className="h-4 w-4" />
                                Adicionar
                              </Button>
                            )}
                          </div>
                          <div className="space-y-2 bg-slate-50 p-3 rounded border border-slate-200">
                            {isFinancialEditMode ? (
                              <div className="grid grid-cols-2 gap-2">
                                <Input placeholder="Banco" value={getFinancialDisplayValue("bank_name") as string || ""} onChange={(e) => handleFinancialFieldChange("bank_name", e.target.value)} className="border-slate-300" />
                                <Input placeholder="Agência" value={getFinancialDisplayValue("agency_number") as string || ""} onChange={(e) => handleFinancialFieldChange("agency_number", e.target.value)} className="border-slate-300" />
                                <Input placeholder="Conta" value={getFinancialDisplayValue("account_number") as string || ""} onChange={(e) => handleFinancialFieldChange("account_number", e.target.value)} className="border-slate-300" />
                                <select value={getFinancialDisplayValue("account_type") as string || ""} onChange={(e) => handleFinancialFieldChange("account_type", e.target.value)} className="border border-slate-300 rounded px-3 py-2 text-sm">
                                  <option value="">Tipo</option>
                                  <option value="corrente">Corrente</option>
                                  <option value="poupanca">Poupança</option>
                                </select>
                              </div>
                            ) : (
                              <div className="text-sm space-y-1">
                                <div><span className="text-slate-600">Banco:</span> <span className="font-medium">{getFinancialDisplayValue("bank_name") || "—"}</span></div>
                                <div><span className="text-slate-600">Agência:</span> <code className="bg-white px-2 py-1 rounded text-xs font-mono font-bold">{getFinancialDisplayValue("agency_number") || "—"}</code></div>
                                <div><span className="text-slate-600">Conta:</span> <code className="bg-white px-2 py-1 rounded text-xs font-mono font-bold">{getFinancialDisplayValue("account_number") || "—"}</code></div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* CARTEIRA DIGITAL / ALLKOIN */}
                  <AccordionItem value="carteira" className="border border-slate-200 rounded-lg overflow-hidden">
                    <AccordionTrigger className="px-4 py-3 hover:bg-slate-50 [&[data-state=open]]:bg-slate-50">
                      <div className="flex items-center gap-2">
                        <Wallet className="h-5 w-5 text-amber-600" />
                        <span className="font-semibold text-slate-900">Carteira Digital / Allkoin</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 py-4 border-t border-slate-100">
                      <div className="space-y-4">
                        {/* Saldo Disponível e Bloqueado */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 p-6 rounded-xl border border-amber-300 shadow-lg text-white">
                            <label className="text-xs font-semibold uppercase tracking-wide block mb-2 opacity-90">Saldo Disponível</label>
                            <div className="text-3xl font-bold mb-1">R$ {(displayUser.wallet_balance as number || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                            <p className="text-xs opacity-75">Pronto para usar</p>
                          </div>
                          <div className="bg-gradient-to-br from-yellow-500 via-amber-500 to-orange-500 p-6 rounded-xl border border-yellow-300 shadow-lg text-white">
                            <label className="text-xs font-semibold uppercase tracking-wide block mb-2 opacity-90">Saldo Bloqueado</label>
                            <div className="text-3xl font-bold mb-1">R$ {blockedBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                            <p className="text-xs opacity-75">Aguardando aprovação</p>
                          </div>
                        </div>

                        {/* Status */}
                        <div>
                          <label className="text-xs font-semibold text-slate-600 block mb-2 uppercase tracking-wide">Status da Carteira</label>
                          {isFinancialEditMode ? (
                            <select value={getFinancialDisplayValue("wallet_status") as string || "ativa"} onChange={(e) => handleFinancialFieldChange("wallet_status", e.target.value)} className="w-full border border-slate-300 rounded px-3 py-2 text-sm">
                              <option value="ativa">Ativa</option>
                              <option value="bloqueada">Bloqueada</option>
                            </select>
                          ) : (
                            <Badge className={getFinancialDisplayValue("wallet_status") === "ativa" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}>
                              {getFinancialDisplayValue("wallet_status") === "ativa" ? "Ativa" : "Bloqueada"}
                            </Badge>
                          )}
                        </div>

                        {/* Ações */}
                        <div className="grid grid-cols-2 gap-2">
                          <Button onClick={() => setShowStatementModal(true)} className="bg-slate-700 hover:bg-slate-800 text-white font-semibold gap-2">
                            <FileText className="h-4 w-4" />
                            Ver Extrato
                          </Button>
                          {isFinancialEditMode && (
                            <Button onClick={() => setShowAddBalanceModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-2">
                              <Plus className="h-4 w-4" />
                              Adicionar Saldo
                            </Button>
                          )}
                        </div>

                        {/* Solicitar Desbloqueio (usuário) */}
                        {blockedBalance > 0 && !isFinancialEditMode && (
                          <Button onClick={() => setShowUnblockRequestModal(true)} variant="outline" className="w-full font-semibold text-amber-600 border-amber-300">
                            Solicitar Desbloqueio de Saldo
                          </Button>
                        )}

                        {/* Últimas Movimentações */}
                        <div>
                          <label className="text-xs font-semibold text-slate-600 block mb-2 uppercase tracking-wide">Últimas Movimentações</label>
                          <div className="space-y-2 bg-slate-50 p-3 rounded border border-slate-200 max-h-48 overflow-y-auto">
                            {walletStatements.slice(0, 5).map(stmt => (
                              <div key={stmt.id} className="flex justify-between items-center text-xs border-b border-slate-200 pb-2 last:border-0">
                                <div>
                                  <div className="font-semibold text-slate-900">{stmt.reason}</div>
                                  <div className="text-slate-500 text-xs">{new Date(stmt.date).toLocaleString('pt-BR')}</div>
                                </div>
                                <div className="text-right">
                                  <div className={`font-bold ${stmt.type === "credit" ? "text-emerald-600" : stmt.type === "debit" ? "text-red-600" : "text-yellow-600"}`}>
                                    {stmt.type === "credit" ? "+" : stmt.type === "debit" ? "-" : "🔒"} R$ {stmt.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </div>
                                  <div className="text-slate-500 text-xs">Saldo: R$ {stmt.balanceAfter.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                                </div>
                              </div>
                            ))}
                            {walletStatements.length === 0 && (
                              <div className="text-center py-4 text-slate-500 text-xs">Nenhuma movimentação</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* DADOS FINANCEIROS GERAIS */}
                  <AccordionItem value="financeiro" className="border border-slate-200 rounded-lg overflow-hidden">
                    <AccordionTrigger className="px-4 py-3 hover:bg-slate-50 [&[data-state=open]]:bg-slate-50">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-purple-600" />
                        <span className="font-semibold text-slate-900">Dados Financeiros Gerais</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 py-4 border-t border-slate-100">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* CPF / CNPJ */}
                        <div>
                          <label className="text-xs font-semibold text-slate-600 block mb-2 uppercase tracking-wide">CPF / CNPJ</label>
                          {isFinancialEditMode ? (
                            <Input value={getFinancialDisplayValue("financial_document") as string || ""} onChange={(e) => handleFinancialFieldChange("financial_document", e.target.value)} className="border-slate-300 font-mono" placeholder="00000000000000" />
                          ) : (
                            <code className="bg-slate-100 px-3 py-2 rounded text-sm font-mono font-bold text-slate-900">{getFinancialDisplayValue("financial_document") || "—"}</code>
                          )}
                        </div>

                        {/* Nome do Titular */}
                        <div>
                          <label className="text-xs font-semibold text-slate-600 block mb-2 uppercase tracking-wide">Nome do Titular</label>
                          {isFinancialEditMode ? (
                            <Input value={getFinancialDisplayValue("financial_holder") as string || ""} onChange={(e) => handleFinancialFieldChange("financial_holder", e.target.value)} className="border-slate-300" placeholder="Nome do titular" />
                          ) : (
                            <div className="font-medium text-slate-900">{getFinancialDisplayValue("financial_holder") || "—"}</div>
                          )}
                        </div>

                        {/* Tipo de Pessoa */}
                        <div>
                          <label className="text-xs font-semibold text-slate-600 block mb-2 uppercase tracking-wide">Tipo de Pessoa</label>
                          {isFinancialEditMode ? (
                            <select value={getFinancialDisplayValue("person_type") as string || ""} onChange={(e) => handleFinancialFieldChange("person_type", e.target.value)} className="w-full border border-slate-300 rounded px-3 py-2 text-sm">
                              <option value="">Selecione</option>
                              <option value="fisica">Física</option>
                              <option value="juridica">Jurídica</option>
                            </select>
                          ) : (
                            <div className="font-medium text-slate-900">{getFinancialDisplayValue("person_type") === "fisica" ? "Pessoa Física" : getFinancialDisplayValue("person_type") === "juridica" ? "Pessoa Jurídica" : "—"}</div>
                          )}
                        </div>

                        {/* Regime Tributário */}
                        <div>
                          <label className="text-xs font-semibold text-slate-600 block mb-2 uppercase tracking-wide">Regime Tributário</label>
                          {isFinancialEditMode ? (
                            <select value={getFinancialDisplayValue("tax_regime") as string || ""} onChange={(e) => handleFinancialFieldChange("tax_regime", e.target.value)} className="w-full border border-slate-300 rounded px-3 py-2 text-sm">
                              <option value="">Selecione</option>
                              <option value="simples">Simples Nacional</option>
                              <option value="presumido">Lucro Presumido</option>
                              <option value="real">Lucro Real</option>
                            </select>
                          ) : (
                            <div className="font-medium text-slate-900">{getFinancialDisplayValue("tax_regime") || "—"}</div>
                          )}
                        </div>

                        {/* Observações Financeiras */}
                        <div className="md:col-span-2">
                          <label className="text-xs font-semibold text-slate-600 block mb-2 uppercase tracking-wide">Observações Financeiras Administrativas</label>
                          {isFinancialEditMode ? (
                            <textarea value={getFinancialDisplayValue("financial_notes") as string || ""} onChange={(e) => handleFinancialFieldChange("financial_notes", e.target.value)} className="w-full border border-slate-300 rounded px-3 py-2 text-sm font-medium min-h-20" placeholder="Notas financeiras" />
                          ) : (
                            <div className="font-medium text-slate-900 whitespace-pre-wrap bg-slate-50 p-3 rounded border border-slate-200 min-h-20">{getFinancialDisplayValue("financial_notes") || "—"}</div>
                          )}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </TabsContent>

              {/* Permissões */}
              {/* Permissões */}
              <TabsContent value="permissoes" className="space-y-4 mt-0">
                {/* Header with Edit Button */}
                <div className="flex items-center justify-between sticky top-0 bg-white z-10 pb-4">
                  <h3 className="text-lg font-semibold text-slate-900">Controle de Acesso</h3>
                  <div className="flex items-center gap-2">
                    {!isPermissionsEditMode ? (
                      <Button onClick={handlePermissionsEditMode} size="sm" className="bg-blue-600 hover:bg-blue-700">
                        <Edit2 className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button onClick={handlePermissionsSaveClick} size="sm" disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700">
                          {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                          {isSaving ? "Salvando..." : "Salvar"}
                        </Button>
                        <Button onClick={handlePermissionsCancelEdit} size="sm" variant="outline">
                          <XCircle className="h-4 w-4 mr-2" />
                          Cancelar
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Accordions */}
                <Accordion type="multiple" value={permissionsOpenAccordions} onValueChange={setPermissionsOpenAccordions} className="space-y-3">
                  {/* PERFIL DE ACESSO */}
                  <AccordionItem value="role" className="border border-slate-200 rounded-lg overflow-hidden">
                    <AccordionTrigger className="px-4 py-3 hover:bg-slate-50 [&[data-state=open]]:bg-slate-50">
                      <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-blue-600" />
                        <span className="font-semibold text-slate-900">Perfil de Acesso</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 py-4 border-t border-slate-100">
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-semibold text-slate-600 block mb-3 uppercase tracking-wide">Selecionar Perfil</label>
                          <div className="grid grid-cols-1 gap-2">
                            {[
                              { value: "admin", label: "Admin", desc: "Acesso completo ao sistema" },
                              { value: "gestor", label: "Gestor", desc: "Gerenciar usuários e tarefas" },
                              { value: "lider", label: "Líder", desc: "Supervisionar equipe" },
                              { value: "nomade", label: "Nômade", desc: "Acesso básico e flexível" },
                              { value: "financeiro", label: "Financeiro", desc: "Gerenciar dados financeiros" },
                              { value: "suporte", label: "Suporte", desc: "Atender e resolver tickets" }
                            ].map(role => (
                              <div
                                key={role.value}
                                onClick={() => !isPermissionsEditMode && handlePermissionsFieldChange("role", role.value)}
                                className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${isPermissionsEditMode ? "cursor-pointer" : "cursor-default"} ${permissionsEditedData.role === role.value ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-300"}`}
                              >
                                <div className="flex items-start justify-between">
                                  <div>
                                    <div className="font-semibold text-slate-900">{role.label}</div>
                                    <div className="text-xs text-slate-600">{role.desc}</div>
                                  </div>
                                  {isPermissionsEditMode && (
                                    <div className={`h-5 w-5 rounded border-2 flex items-center justify-center ${permissionsEditedData.role === role.value ? "border-blue-500 bg-blue-500" : "border-slate-300"}`}>
                                      {permissionsEditedData.role === role.value && <Check className="h-3 w-3 text-white" />}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* ADMINISTRAÇÃO */}
                  <AccordionItem value="admin" className="border border-slate-200 rounded-lg overflow-hidden">
                    <AccordionTrigger className="px-4 py-3 hover:bg-slate-50 [&[data-state=open]]:bg-slate-50">
                      <div className="flex items-center gap-2">
                        <Lock className="h-5 w-5 text-red-600" />
                        <span className="font-semibold text-slate-900">Administração</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 py-4 border-t border-slate-100">
                      <div className="space-y-3">
                        {[
                          { id: "manage_users", label: "Gerenciar usuários", desc: "Criar, editar, deletar usuários" },
                          { id: "manage_permissions", label: "Gerenciar permissões", desc: "Alterar roles e acessos" },
                          { id: "view_sensitive", label: "Visualizar dados sensíveis", desc: "Ver informações confidenciais" },
                          { id: "reset_password", label: "Resetar senhas", desc: "Redefinir senha de usuários" },
                          { id: "access_admin_panel", label: "Acessar painel administrativo", desc: "Usar dashboard admin completo" }
                        ].map(perm => (
                          <div key={perm.id} className="flex items-start justify-between p-3 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100">
                            <div>
                              <div className="font-medium text-slate-900">{perm.label}</div>
                              <div className="text-xs text-slate-600">{perm.desc}</div>
                            </div>
                            {isPermissionsEditMode ? (
                              <button onClick={() => handlePermissionToggle(perm.id)} className="flex-shrink-0">
                                {(permissionsEditedData.permissions || []).includes(perm.id) ? (
                                  <ToggleRight className="h-6 w-6 text-blue-600" />
                                ) : (
                                  <ToggleLeft className="h-6 w-6 text-slate-400" />
                                )}
                              </button>
                            ) : (
                              <Badge className={(displayUser.permissions as string[] || []).includes(perm.id) ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}>
                                {(displayUser.permissions as string[] || []).includes(perm.id) ? "Ativo" : "Inativo"}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* FINANCEIRO */}
                  <AccordionItem value="financial" className="border border-slate-200 rounded-lg overflow-hidden">
                    <AccordionTrigger className="px-4 py-3 hover:bg-slate-50 [&[data-state=open]]:bg-slate-50">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-amber-600" />
                        <span className="font-semibold text-slate-900">Financeiro</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 py-4 border-t border-slate-100">
                      <div className="space-y-3">
                        {[
                          { id: "view_financial", label: "Visualizar dados financeiros", desc: "Acessar relatórios e históricos" },
                          { id: "edit_financial", label: "Editar dados financeiros", desc: "Atualizar informações financeiras" },
                          { id: "adjust_balance", label: "Ajustar saldo (Allkoin)", desc: "Adicionar ou subtrair do wallet" },
                          { id: "manage_cards", label: "Gerenciar cartões", desc: "Adicionar, editar ou remover cartões" },
                          { id: "manage_accounts", label: "Gerenciar contas bancárias", desc: "Configurar dados bancários" }
                        ].map(perm => (
                          <div key={perm.id} className="flex items-start justify-between p-3 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100">
                            <div>
                              <div className="font-medium text-slate-900">{perm.label}</div>
                              <div className="text-xs text-slate-600">{perm.desc}</div>
                            </div>
                            {isPermissionsEditMode ? (
                              <button onClick={() => handlePermissionToggle(perm.id)} className="flex-shrink-0">
                                {(permissionsEditedData.permissions || []).includes(perm.id) ? (
                                  <ToggleRight className="h-6 w-6 text-blue-600" />
                                ) : (
                                  <ToggleLeft className="h-6 w-6 text-slate-400" />
                                )}
                              </button>
                            ) : (
                              <Badge className={(displayUser.permissions as string[] || []).includes(perm.id) ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}>
                                {(displayUser.permissions as string[] || []).includes(perm.id) ? "Ativo" : "Inativo"}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* OPERACIONAL */}
                  <AccordionItem value="operational" className="border border-slate-200 rounded-lg overflow-hidden">
                    <AccordionTrigger className="px-4 py-3 hover:bg-slate-50 [&[data-state=open]]:bg-slate-50">
                      <div className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-yellow-600" />
                        <span className="font-semibold text-slate-900">Operacional</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 py-4 border-t border-slate-100">
                      <div className="space-y-3">
                        {[
                          { id: "create_tasks", label: "Criar tarefas", desc: "Criar novas tarefas e projetos" },
                          { id: "edit_tasks", label: "Editar tarefas", desc: "Modificar tarefas existentes" },
                          { id: "delete_tasks", label: "Excluir tarefas", desc: "Remover tarefas do sistema" },
                          { id: "assign_tasks", label: "Atribuir tarefas", desc: "Designar tarefas a usuários" },
                          { id: "approve_tasks", label: "Aprovar tarefas", desc: "Validar e aprovar conclusões" }
                        ].map(perm => (
                          <div key={perm.id} className="flex items-start justify-between p-3 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100">
                            <div>
                              <div className="font-medium text-slate-900">{perm.label}</div>
                              <div className="text-xs text-slate-600">{perm.desc}</div>
                            </div>
                            {isPermissionsEditMode ? (
                              <button onClick={() => handlePermissionToggle(perm.id)} className="flex-shrink-0">
                                {(permissionsEditedData.permissions || []).includes(perm.id) ? (
                                  <ToggleRight className="h-6 w-6 text-blue-600" />
                                ) : (
                                  <ToggleLeft className="h-6 w-6 text-slate-400" />
                                )}
                              </button>
                            ) : (
                              <Badge className={(displayUser.permissions as string[] || []).includes(perm.id) ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}>
                                {(displayUser.permissions as string[] || []).includes(perm.id) ? "Ativo" : "Inativo"}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* RELATÓRIOS */}
                  <AccordionItem value="reports" className="border border-slate-200 rounded-lg overflow-hidden">
                    <AccordionTrigger className="px-4 py-3 hover:bg-slate-50 [&[data-state=open]]:bg-slate-50">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-green-600" />
                        <span className="font-semibold text-slate-900">Relatórios</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 py-4 border-t border-slate-100">
                      <div className="space-y-3">
                        {[
                          { id: "view_reports", label: "Visualizar relatórios", desc: "Acessar todos os relatórios" },
                          { id: "export_reports", label: "Exportar relatórios", desc: "Gerar e baixar relatórios em PDF/Excel" },
                          { id: "view_metrics", label: "Visualizar métricas avançadas", desc: "Ver análises e KPIs detalhados" }
                        ].map(perm => (
                          <div key={perm.id} className="flex items-start justify-between p-3 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100">
                            <div>
                              <div className="font-medium text-slate-900">{perm.label}</div>
                              <div className="text-xs text-slate-600">{perm.desc}</div>
                            </div>
                            {isPermissionsEditMode ? (
                              <button onClick={() => handlePermissionToggle(perm.id)} className="flex-shrink-0">
                                {(permissionsEditedData.permissions || []).includes(perm.id) ? (
                                  <ToggleRight className="h-6 w-6 text-blue-600" />
                                ) : (
                                  <ToggleLeft className="h-6 w-6 text-slate-400" />
                                )}
                              </button>
                            ) : (
                              <Badge className={(displayUser.permissions as string[] || []).includes(perm.id) ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}>
                                {(displayUser.permissions as string[] || []).includes(perm.id) ? "Ativo" : "Inativo"}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* SISTEMA */}
                  <AccordionItem value="system" className="border border-slate-200 rounded-lg overflow-hidden">
                    <AccordionTrigger className="px-4 py-3 hover:bg-slate-50 [&[data-state=open]]:bg-slate-50">
                      <div className="flex items-center gap-2">
                        <Settings className="h-5 w-5 text-purple-600" />
                        <span className="font-semibold text-slate-900">Sistema</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 py-4 border-t border-slate-100">
                      <div className="space-y-3">
                        {[
                          { id: "access_settings", label: "Acessar configurações", desc: "Modificar preferências do sistema" },
                          { id: "manage_integrations", label: "Gerenciar integrações", desc: "Conectar APIs e serviços externos" },
                          { id: "view_logs", label: "Visualizar logs", desc: "Acessar histórico de atividades do sistema" }
                        ].map(perm => (
                          <div key={perm.id} className="flex items-start justify-between p-3 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100">
                            <div>
                              <div className="font-medium text-slate-900">{perm.label}</div>
                              <div className="text-xs text-slate-600">{perm.desc}</div>
                            </div>
                            {isPermissionsEditMode ? (
                              <button onClick={() => handlePermissionToggle(perm.id)} className="flex-shrink-0">
                                {(permissionsEditedData.permissions || []).includes(perm.id) ? (
                                  <ToggleRight className="h-6 w-6 text-blue-600" />
                                ) : (
                                  <ToggleLeft className="h-6 w-6 text-slate-400" />
                                )}
                              </button>
                            ) : (
                              <Badge className={(displayUser.permissions as string[] || []).includes(perm.id) ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}>
                                {(displayUser.permissions as string[] || []).includes(perm.id) ? "Ativo" : "Inativo"}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </TabsContent>

              {/* Segurança */}
              <TabsContent value="seguranca" className="space-y-4 mt-0">
                {/* Security Header */}
                <div className="flex items-center justify-between sticky top-0 bg-white z-10 pb-4">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-slate-900">Segurança da Conta</h3>
                    <Badge className="bg-emerald-100 text-emerald-700 font-semibold">Segura</Badge>
                  </div>
                </div>

                <Accordion type="multiple" value={securityOpenAccordions} onValueChange={setSecurityOpenAccordions} className="space-y-3">
                  {/* 1. AUTENTICAÇÃO E SENHA */}
                  <AccordionItem value="auth" className="border border-slate-200 rounded-lg overflow-hidden">
                    <AccordionTrigger className="px-4 py-3 hover:bg-slate-50 [&[data-state=open]]:bg-slate-50">
                      <div className="flex items-center gap-2">
                        <Key className="h-5 w-5 text-blue-600" />
                        <span className="font-semibold text-slate-900">Autenticação e Senha</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 py-4 border-t border-slate-100 space-y-4">
                      <div className="bg-slate-50 p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-slate-900">Força da Senha</h4>
                            <p className="text-xs text-slate-600 mt-1">Sua senha é forte e segura</p>
                          </div>
                          <Badge className="bg-emerald-100 text-emerald-700">Forte</Badge>
                        </div>
                        <div className="space-y-1 text-xs text-slate-600">
                          <div>✓ Contém letras maiúsculas e minúsculas</div>
                          <div>✓ Contém números</div>
                          <div>✓ Contém caracteres especiais</div>
                          <div>✓ Tem mais de 12 caracteres</div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-600 block uppercase">Ações de Senha</label>
                        <div className="grid grid-cols-1 gap-2">
                          <Button onClick={handlePasswordReset} className="bg-blue-600 hover:bg-blue-700 justify-start gap-2">
                            <Key className="h-4 w-4" />
                            Redefinir Senha
                          </Button>
                        </div>
                      </div>

                      <div className="text-xs text-slate-600 pt-2 border-t border-slate-200">
                        <div>Última alteração: 45 dias atrás</div>
                        <div className="text-slate-500 mt-1">Recomendamos alterar a senha a cada 90 dias</div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* 2. AUTENTICAÇÃO EM DOIS FATORES */}
                  <AccordionItem value="2fa" className="border border-slate-200 rounded-lg overflow-hidden">
                    <AccordionTrigger className="px-4 py-3 hover:bg-slate-50 [&[data-state=open]]:bg-slate-50">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-5 w-5 text-amber-600" />
                        <span className="font-semibold text-slate-900">Autenticação em Dois Fatores (2FA)</span>
                        {is2FAEnabled && <Badge className="bg-emerald-100 text-emerald-700 text-xs ml-2">Ativado</Badge>}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 py-4 border-t border-slate-100 space-y-4">
                      <div className={`p-4 rounded-lg ${is2FAEnabled ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50 border border-slate-200'}`}>
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-slate-900">Status 2FA</h4>
                            <p className="text-xs text-slate-600 mt-1">Proteção adicional com autenticador</p>
                          </div>
                          <Badge className={is2FAEnabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}>
                            {is2FAEnabled ? "Ativado" : "Inativo"}
                          </Badge>
                        </div>
                        {is2FAEnabled && (
                          <div className="space-y-1 text-xs text-slate-600">
                            <div>✓ Ativação: {new Date(twoFAActivationDate).toLocaleDateString('pt-BR')}</div>
                            <div>✓ Última validação: {new Date(twoFALastValidation).toLocaleTimeString('pt-BR')}</div>
                          </div>
                        )}
                      </div>

                      <Button onClick={handleToggle2FA} className={is2FAEnabled ? "bg-red-600 hover:bg-red-700 justify-start gap-2 w-full" : "bg-blue-600 hover:bg-blue-700 justify-start gap-2 w-full"}>
                        <Smartphone className="h-4 w-4" />
                        {is2FAEnabled ? "Desativar 2FA" : "Ativar 2FA"}
                      </Button>
                    </AccordionContent>
                  </AccordionItem>

                  {/* 3. SESSÕES ATIVAS */}
                  <AccordionItem value="sessions" className="border border-slate-200 rounded-lg overflow-hidden">
                    <AccordionTrigger className="px-4 py-3 hover:bg-slate-50 [&[data-state=open]]:bg-slate-50">
                      <div className="flex items-center gap-2">
                        <Globe className="h-5 w-5 text-green-600" />
                        <span className="font-semibold text-slate-900">Sessões Ativas</span>
                        <Badge className="bg-slate-200 text-slate-700 text-xs ml-2">{activeSessions.filter(s => s.status === 'active').length}</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 py-4 border-t border-slate-100 space-y-3">
                      {activeSessions.map(session => (
                        <div key={session.id} className="border border-slate-200 rounded-lg p-3">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Monitor className="h-4 w-4 text-slate-600" />
                                <span className="font-semibold text-slate-900">{session.browser}</span>
                                {session.status === 'active' && <Badge className="bg-emerald-100 text-emerald-700 text-xs">Ativa</Badge>}
                              </div>
                              <div className="text-xs text-slate-600 mt-1 space-y-1">
                                <div>OS: {session.os}</div>
                                <div>Local: {session.location}</div>
                                <div>IP: {session.ip}</div>
                                <div>Login: {new Date(session.loginTime).toLocaleString('pt-BR')}</div>
                              </div>
                            </div>
                            {session.status === 'active' && (
                              <Button onClick={() => handleEndSession(session.id)} size="sm" variant="outline" className="text-red-600 hover:bg-red-50 border-red-200">
                                Encerrar
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                      {activeSessions.length > 0 && (
                        <Button onClick={handleEndAllSessions} variant="outline" className="w-full text-red-600 hover:bg-red-50 border-red-200 bg-transparent">
                          Encerrar Todas as Sessões
                        </Button>
                      )}
                    </AccordionContent>
                  </AccordionItem>

                  {/* 4. DISPOSITIVOS CONECTADOS */}
                  <AccordionItem value="devices" className="border border-slate-200 rounded-lg overflow-hidden">
                    <AccordionTrigger className="px-4 py-3 hover:bg-slate-50 [&[data-state=open]]:bg-slate-50">
                      <div className="flex items-center gap-2">
                        <Tablet className="h-5 w-5 text-purple-600" />
                        <span className="font-semibold text-slate-900">Dispositivos Conectados</span>
                        <Badge className="bg-slate-200 text-slate-700 text-xs ml-2">{connectedDevices.length}</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 py-4 border-t border-slate-100 space-y-3">
                      {connectedDevices.map(device => (
                        <div key={device.id} className="border border-slate-200 rounded-lg p-3">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                {device.type === 'mobile' ? <Smartphone className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
                                <span className="font-semibold text-slate-900">{device.name}</span>
                              </div>
                              <div className="text-xs text-slate-600 mt-1 space-y-1">
                                <div>Tipo: {device.type === 'mobile' ? 'Móvel' : 'Desktop'}</div>
                                <div>Último acesso: {new Date(device.lastAccess).toLocaleString('pt-BR')}</div>
                                <div>IP: {device.ip}</div>
                              </div>
                            </div>
                            <Button onClick={() => handleRevokeDevice(device.id)} size="sm" variant="outline" className="text-red-600 hover:bg-red-50 border-red-200">
                              Revogar
                            </Button>
                          </div>
                        </div>
                      ))}
                    </AccordionContent>
                  </AccordionItem>

                  {/* 5. LOGS E AUDITORIA */}
                  <AccordionItem value="audit" className="border border-slate-200 rounded-lg overflow-hidden">
                    <AccordionTrigger className="px-4 py-3 hover:bg-slate-50 [&[data-state=open]]:bg-slate-50">
                      <div className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-red-600" />
                        <span className="font-semibold text-slate-900">Logs e Auditoria</span>
                        <Badge className="bg-slate-200 text-slate-700 text-xs ml-2">{securityLogs.length}</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 py-4 border-t border-slate-100 space-y-3">
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {securityLogs.slice(0, 5).map(log => (
                          <div key={log.id} className="border border-slate-200 rounded p-2">
                            <div className="flex justify-between items-start">
                              <div className="text-sm">
                                <div className="font-semibold text-slate-900">{log.action}</div>
                                <div className="text-xs text-slate-600 mt-0.5">{new Date(log.date).toLocaleString('pt-BR')}</div>
                              </div>
                            </div>
                            <div className="text-xs text-slate-600 mt-1 space-y-0.5">
                              <div>IP: {log.ip} | Local: {log.location}</div>
                              <div>Admin: {log.admin}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <Button onClick={() => setShowFullLogsModal(true)} variant="outline" className="w-full">
                        Ver Logs Completos
                      </Button>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>

        {/* Confirmation Dialog for Conta Tab */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar alterações</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja salvar as alterações desta conta? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-3">
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleContaSaveConfirm} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700">
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {isSaving ? "Salvando..." : "Confirmar"}
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* Confirmation Dialog for Dados Tab */}
        <AlertDialog open={showDadosConfirmDialog} onOpenChange={setShowDadosConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar alterações dos dados</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja salvar as alterações dos dados do usuário? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-3">
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDadosSaveConfirm} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700">
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {isSaving ? "Salvando..." : "Confirmar"}
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* Confirmation Dialog for Financeiro Tab */}
        <AlertDialog open={showFinancialConfirmDialog} onOpenChange={setShowFinancialConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar alterações financeiras</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja salvar as alterações financeiras deste usuário? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-3">
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleFinancialSaveConfirm} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700">
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {isSaving ? "Salvando..." : "Confirmar"}
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* Modal for Adding Card */}
        <AlertDialog open={showCardModal} onOpenChange={setShowCardModal}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>Adicionar Novo Cartão</AlertDialogTitle>
              <AlertDialogDescription>
                Preencha os dados do cartão para adicionar um novo método de pagamento.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1 uppercase tracking-wide">Número do Cartão</label>
                <Input placeholder="0000 0000 0000 0000" value={cardFormData.number} onChange={(e) => setCardFormData({...cardFormData, number: e.target.value})} maxLength="19" className="border-slate-300 font-mono" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1 uppercase tracking-wide">Validade</label>
                  <Input placeholder="MM/YY" value={cardFormData.expiry} onChange={(e) => setCardFormData({...cardFormData, expiry: e.target.value})} maxLength="5" className="border-slate-300" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1 uppercase tracking-wide">Bandeira</label>
                  <select value={cardFormData.brand} onChange={(e) => setCardFormData({...cardFormData, brand: e.target.value})} className="w-full border border-slate-300 rounded px-3 py-2 text-sm">
                    <option value="Visa">Visa</option>
                    <option value="Mastercard">Mastercard</option>
                    <option value="Amex">Amex</option>
                    <option value="Elo">Elo</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1 uppercase tracking-wide">Nome do Titular</label>
                <Input placeholder="NOME DO TITULAR" value={cardFormData.holder} onChange={(e) => setCardFormData({...cardFormData, holder: e.target.value.toUpperCase()})} className="border-slate-300" />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleSaveCard} className="bg-blue-600 hover:bg-blue-700">
                Adicionar Cartão
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* Confirmation Dialog for Wallet Adjustment */}
        <AlertDialog open={showWalletConfirmDialog} onOpenChange={setShowWalletConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Ajuste de Saldo</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja {walletAdjustType === "add" ? "adicionar" : "subtrair"} R$ {parseFloat(walletAdjustValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} do saldo?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="bg-slate-50 p-3 rounded-lg space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Saldo Atual:</span>
                <span className="font-semibold">R$ {((displayUser.wallet_balance as number) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>{walletAdjustType === "add" ? "Adição:" : "Subtração:"}</span>
                <span>{walletAdjustType === "add" ? "+" : "-"} R$ {parseFloat(walletAdjustValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="border-t border-slate-200 pt-1 mt-1 flex justify-between font-bold">
                <span>Novo Saldo:</span>
                <span className="text-emerald-600">R$ {((walletAdjustType === "add" ? (displayUser.wallet_balance as number || 0) + parseFloat(walletAdjustValue) : (displayUser.wallet_balance as number || 0) - parseFloat(walletAdjustValue)) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmWalletAdjustment} disabled={isApplyingWallet} className="bg-emerald-600 hover:bg-emerald-700">
                {isApplyingWallet ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {isApplyingWallet ? "Aplicando..." : "Confirmar"}
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* Confirmation Dialog for Permissions */}
        <AlertDialog open={showPermissionsConfirmDialog} onOpenChange={setShowPermissionsConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Alterações de Permissões</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja salvar as alterações de permissões deste usuário? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="bg-slate-50 p-3 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Perfil:</span>
                <span className="font-semibold capitalize">{permissionsEditedData.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Permissões:</span>
                <span className="font-semibold">{(permissionsEditedData.permissions || []).length} permissões ativas</span>
              </div>
            </div>
            <div className="flex gap-3">
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handlePermissionsSaveConfirm} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700">
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {isSaving ? "Salvando..." : "Confirmar"}
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* Confirmation Dialog for Set Default Card */}
        <AlertDialog open={showSetDefaultCardDialog} onOpenChange={setShowSetDefaultCardDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Definir cartão como padrão?</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja definir este cartão como seu método de pagamento padrão?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-3">
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmSetDefaultCard} className="bg-blue-600 hover:bg-blue-700">
                Confirmar
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* Modal for Adding Balance/Credit */}
        <AlertDialog open={showAddBalanceModal} onOpenChange={setShowAddBalanceModal}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>Adicionar Crédito/Débito</AlertDialogTitle>
              <AlertDialogDescription>
                Preencha os dados para realizar a movimentação.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-2 uppercase">Tipo</label>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    onClick={() => setCreditType("immediate")} 
                    className={creditType === "immediate" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-slate-200 hover:bg-slate-300 text-slate-900"}
                  >
                    Imediato
                  </Button>
                  <Button 
                    onClick={() => setCreditType("blocked")} 
                    className={creditType === "blocked" ? "bg-yellow-600 hover:bg-yellow-700" : "bg-slate-200 hover:bg-slate-300 text-slate-900"}
                  >
                    Bloqueado
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-2 uppercase">Valor (R$)</label>
                <Input type="number" placeholder="0.00" value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} className="border-slate-300" step="0.01" min="0" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-2 uppercase">Motivo (obrigatório)</label>
                <Input placeholder="Descreva o motivo da operação" value={creditReason} onChange={(e) => setCreditReason(e.target.value)} className="border-slate-300" />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleAddBalance} className="bg-blue-600 hover:bg-blue-700">
                Próximo
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* Confirmation for Balance Addition */}
        <AlertDialog open={showWalletConfirmDialog && showAddBalanceModal} onOpenChange={(open) => { if (!open) { setShowWalletConfirmDialog(false); setShowAddBalanceModal(false) } }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Movimentação</AlertDialogTitle>
              <AlertDialogDescription>
                Revise os dados antes de confirmar.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="bg-slate-50 p-4 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-600">Tipo:</span><span className="font-semibold">{creditType === "immediate" ? "Crédito Imediato" : "Crédito Bloqueado"}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Valor:</span><span className="font-semibold text-emerald-600">R$ {parseFloat(creditAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Motivo:</span><span className="font-semibold">{creditReason}</span></div>
              <div className="border-t border-slate-200 pt-2 mt-2 flex justify-between"><span className="font-semibold">Saldo após:</span><span className="text-emerald-600 font-bold">R$ {(creditType === "blocked" ? (displayUser.wallet_balance as number || 0) : ((displayUser.wallet_balance as number || 0) + parseFloat(creditAmount))).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
            </div>
            <div className="flex gap-3">
              <AlertDialogCancel>Voltar</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmAddBalance} disabled={isApplyingWallet} className="bg-emerald-600 hover:bg-emerald-700">
                {isApplyingWallet ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {isApplyingWallet ? "Processando..." : "Confirmar"}
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* Modal for Requesting Unblock */}
        <AlertDialog open={showUnblockRequestModal} onOpenChange={setShowUnblockRequestModal}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>Solicitar Desbloqueio</AlertDialogTitle>
              <AlertDialogDescription>
                Anexe a nota fiscal para solicitar o desbloqueio de R$ {blockedBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-slate-400 transition">
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setUnblockInvoice(e.target.files?.[0] || null)} className="hidden" id="invoice-upload" />
                <label htmlFor="invoice-upload" className="cursor-pointer">
                  <div className="text-slate-600 text-sm font-semibold">Clique para selecionar ou arraste a nota fiscal</div>
                  <div className="text-slate-500 text-xs mt-1">PDF, JPG ou PNG (máx 5MB)</div>
                  {unblockInvoice && <div className="text-emerald-600 text-sm font-semibold mt-2">✓ {unblockInvoice.name}</div>}
                </label>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleRequestUnblock} className="bg-emerald-600 hover:bg-emerald-700">
                Enviar Solicitação
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* Modal for Statement */}
        <AlertDialog open={showStatementModal} onOpenChange={setShowStatementModal}>
          <AlertDialogContent className="max-w-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Extrato Completo</AlertDialogTitle>
              <div className="space-y-2 mt-4">
                <div className="flex gap-2">
                  <select value={statementFilters.type} onChange={(e) => setStatementFilters({...statementFilters, type: e.target.value})} className="border border-slate-300 rounded px-3 py-2 text-sm flex-1">
                    <option value="all">Todos os tipos</option>
                    <option value="credit">Crédito</option>
                    <option value="debit">Débito</option>
                    <option value="blocked">Bloqueado</option>
                  </select>
                  <Input type="text" placeholder="Buscar motivo..." value={statementFilters.search} onChange={(e) => setStatementFilters({...statementFilters, search: e.target.value})} className="border-slate-300 flex-1" />
                </div>
              </div>
            </AlertDialogHeader>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {walletStatements.filter(s => (statementFilters.type === "all" || s.type === statementFilters.type) && (statementFilters.search === "" || s.reason.toLowerCase().includes(statementFilters.search.toLowerCase()))).map(stmt => (
                <div key={stmt.id} className="p-3 border border-slate-200 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-semibold text-slate-900">{stmt.reason}</div>
                      <div className="text-xs text-slate-500">{new Date(stmt.date).toLocaleString('pt-BR')}</div>
                    </div>
                    <div className={`font-bold text-right ${stmt.type === "credit" ? "text-emerald-600" : stmt.type === "debit" ? "text-red-600" : "text-yellow-600"}`}>
                      {stmt.type === "credit" ? "+" : stmt.type === "debit" ? "-" : "🔒"} R$ {stmt.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-slate-600">
                    <div>Admin: <span className="font-semibold">{stmt.admin}</span></div>
                    <div>Saldo após: <span className="font-semibold">R$ {stmt.balanceAfter.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3 justify-end mt-4">
              <AlertDialogCancel>Fechar</AlertDialogCancel>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* Password Reset Modal */}
        <AlertDialog open={showPasswordResetModal} onOpenChange={setShowPasswordResetModal}>
          <AlertDialogContent className="max-w-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Redefinir Senha do Usuário
              </AlertDialogTitle>
              <AlertDialogDescription>
                Escolha o método para redefinir a senha de {displayUser.name}
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <Button
                  onClick={() => { setPasswordResetMethod("email"); setGeneratedResetLink("") }}
                  className={passwordResetMethod === "email" ? "ring-2 ring-blue-600 bg-blue-50 text-slate-900 hover:bg-blue-100" : "bg-slate-100 hover:bg-slate-200 text-slate-900"}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Por Email
                </Button>
                <Button
                  onClick={() => setPasswordResetMethod("link")}
                  className={passwordResetMethod === "link" ? "ring-2 ring-blue-600 bg-blue-50 text-slate-900 hover:bg-blue-100" : "bg-slate-100 hover:bg-slate-200 text-slate-900"}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Gerar Link
                </Button>
                <Button
                  onClick={() => setPasswordResetMethod("direct")}
                  className={passwordResetMethod === "direct" ? "ring-2 ring-blue-600 bg-blue-50 text-slate-900 hover:bg-blue-100" : "bg-slate-100 hover:bg-slate-200 text-slate-900"}
                >
                  <Lock className="h-4 w-4 mr-2" />
                  Redefinir Direto
                </Button>
              </div>

              {passwordResetMethod === "email" && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm text-slate-900 mb-2">Um email será enviado para:</p>
                  <p className="text-sm font-semibold text-blue-700">{displayUser.email}</p>
                  <p className="text-xs text-slate-600 mt-2">O usuário terá 24 horas para completar a redefinição</p>
                </div>
              )}

              {passwordResetMethod === "link" && (
                <div className="space-y-2">
                  {generatedResetLink ? (
                    <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
                      <p className="text-xs font-semibold text-slate-700 mb-2">Link de Redefinição Gerado:</p>
                      <div className="flex gap-2">
                        <Input value={generatedResetLink} readOnly className="text-xs" />
                        <Button size="sm" onClick={() => handleCopyToClipboard(generatedResetLink)} variant="outline">
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-slate-600 mt-2">Este link expira em 24 horas</p>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-600">Clique em "Gerar Link" para criar um link de redefinição único</p>
                  )}
                </div>
              )}

              {passwordResetMethod === "direct" && (
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                  <p className="text-sm text-slate-900 mb-2">Uma nova senha será gerada automaticamente e compartilhada com você</p>
                  <p className="text-xs text-amber-700 font-semibold mt-2">⚠ Isso gera uma senha aleatória que será válida por 24 horas</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end">
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmPasswordReset} disabled={isSavingSecurityAction} className="bg-blue-600 hover:bg-blue-700">
                {isSavingSecurityAction ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {isSavingSecurityAction ? "Processando..." : passwordResetMethod === "link" ? "Gerar Link" : "Confirmar"}
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* 2FA Setup Modal */}
        <AlertDialog open={show2FASetupModal} onOpenChange={setShow2FASetupModal}>
          <AlertDialogContent className="max-w-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Configurar Autenticação em Dois Fatores
              </AlertDialogTitle>
              <AlertDialogDescription>
                Siga os passos para ativar 2FA com seu autenticador
              </AlertDialogDescription>
            </AlertDialogHeader>

            {!showTwoFAVerification ? (
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <p className="text-sm font-semibold text-slate-900 mb-3">Passo 1: Escaneie o código QR</p>
                  <div className="flex justify-center mb-4">
                    <img src={twoFAQRCode || "/placeholder.svg"} alt="QR Code" className="h-48 w-48" />
                  </div>
                  <p className="text-xs text-slate-600">Use Google Authenticator, Microsoft Authenticator ou Authy</p>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <p className="text-sm font-semibold text-slate-900 mb-2">Passo 2: Chave Manual (se necessário)</p>
                  <div className="flex gap-2">
                    <Input value={twoFAManualKey} readOnly className="font-mono text-xs" />
                    <Button size="sm" onClick={() => handleCopyToClipboard(twoFAManualKey)} variant="outline">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <Button onClick={() => setShowTwoFAVerification(true)} className="w-full bg-blue-600 hover:bg-blue-700">
                  Próximo: Verificar Código
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm font-semibold text-slate-900 mb-3">Passo 3: Verificar Código</p>
                  <label className="text-xs font-semibold text-slate-600 block mb-2 uppercase">Digite o código de 6 dígitos do seu autenticador</label>
                  <Input
                    type="text"
                    placeholder="000000"
                    maxLength="6"
                    value={twoFAVerificationCode}
                    onChange={(e) => setTwoFAVerificationCode(e.target.value.replace(/\D/g, ''))}
                    className="text-center text-lg font-mono tracking-widest"
                  />
                </div>

                <div className="flex gap-3">
                  <Button onClick={() => setShowTwoFAVerification(false)} variant="outline" className="flex-1">
                    Voltar
                  </Button>
                  <Button onClick={handleVerify2FACode} disabled={isSavingSecurityAction} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                    {isSavingSecurityAction ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    {isSavingSecurityAction ? "Verificando..." : "Ativar 2FA"}
                  </Button>
                </div>
              </div>
            )}
          </AlertDialogContent>
        </AlertDialog>

        {/* Full Logs Modal */}
        <AlertDialog open={showFullLogsModal} onOpenChange={setShowFullLogsModal}>
          <AlertDialogContent className="max-w-4xl max-h-96">
            <AlertDialogHeader>
              <AlertDialogTitle>Logs Completos de Auditoria</AlertDialogTitle>
              <div className="space-y-2 mt-4">
                <div className="flex gap-2 flex-wrap">
                  <select value={logFilters.action} onChange={(e) => setLogFilters({...logFilters, action: e.target.value})} className="border border-slate-300 rounded px-3 py-2 text-sm">
                    <option value="all">Todas as ações</option>
                    <option value="login">Login</option>
                    <option value="logout">Logout</option>
                    <option value="password">Redefinição de Senha</option>
                    <option value="2fa">2FA</option>
                    <option value="dados">Alteração de Dados</option>
                  </select>
                  <Input type="date" value={logFilters.date} onChange={(e) => setLogFilters({...logFilters, date: e.target.value})} className="border-slate-300" />
                </div>
              </div>
            </AlertDialogHeader>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {securityLogs.map(log => (
                <div key={log.id} className="border border-slate-200 rounded-lg p-3 hover:bg-slate-50 transition">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-semibold text-slate-900 text-sm">{log.action}</div>
                      <div className="text-xs text-slate-600">{new Date(log.date).toLocaleString('pt-BR')}</div>
                    </div>
                    <Badge variant="outline" className="text-xs">{log.admin}</Badge>
                  </div>
                  <div className="text-xs text-slate-600 space-y-0.5">
                    <div>IP: {log.ip}</div>
                    <div>Local: {log.location}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 justify-end">
              <AlertDialogCancel>Fechar</AlertDialogCancel>
              <Button variant="outline" size="sm">
                Exportar CSV
              </Button>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* Confirmation Dialog for Security Actions */}
        <AlertDialog open={showConfirmSecurityAction} onOpenChange={setShowConfirmSecurityAction}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Ação de Segurança</AlertDialogTitle>
              <AlertDialogDescription>
                {confirmSecurityAction?.message}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-3">
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => { confirmSecurityAction?.callback(); setShowConfirmSecurityAction(false) }} disabled={isSavingSecurityAction} className="bg-red-600 hover:bg-red-700">
                {isSavingSecurityAction ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Confirmar
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  )
}

function DataSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">{title}</h3>
      <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
        {children}
      </div>
    </div>
  )
}
