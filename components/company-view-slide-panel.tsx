
import { X, Building2, Users, Mail, Phone, MapPin, Calendar, CheckCircle, AlertCircle, TrendingUp, Wallet, ArrowUp, ArrowDown, Lock, Download, Star, Gift, Check, MessageSquare, Camera, Eye, Clock, Activity, Zap, UserIcon, Edit2, Save, Loader2, XCircle, Crown, Trash2, Plus, CreditCard, MoreVertical, FileText, Shield, BarChart3, Share2, PauseCircle, ZoomIn, Crosshair, ChevronsUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { Input } from "@/components/ui/input"
import { ModalBrandHeader } from "@/components/ui/modal-brand-header"
import { ConfirmationDialog } from "@/components/confirmation-dialog"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts"
import { useSidebar } from "@/contexts/sidebar-context"
import { useToast } from "@/hooks/use-toast"
import { CompanyUsersTab } from "@/components/company-users-tab"
import { TermsManagementTab } from "@/components/terms-management-tab"
import { ProjectsManagementTab } from "@/components/projects-management-tab"
import { CompanyTasksTab } from "@/components/company-tasks-tab"
import { CompanyLogsTab } from "@/components/company-logs-tab"
import { CompanyStatusSelector } from "@/components/company-status-selector"
import { CompanySocialLinksManager, type SocialLink } from "@/components/company-social-links-manager"
import { AddressMapPicker } from "@/components/address/address-map-picker"
import { useState, useEffect, useRef } from "react"

type CompanyType = "company" | "agency" | "nomad"
type CompanyStatus = "active" | "inactive" | "pending"

interface Company {
  id: number
  name: string
  legal_name?: string
  type: CompanyType
  email: string
  phone: string
  phone_secondary?: string
  whatsapp?: string
  website?: string
  document: string
  ie?: string
  location: string
  account_type?: string
  partner_level?: string
  status: CompanyStatus
  users_count: number
  users_online: number
  projects_count: number
  created_at: string
  avatar?: string
  zip_code?: string
  street?: string
  number?: string
  complement?: string
  neighborhood?: string
  city?: string
  state?: string
  country?: string
  pix_key?: string
  pix_type?: string
  bank_name?: string
  bank_agency?: string
  bank_account?: string
  bank_account_type?: string
  admin_notes?: string
  internal_notes?: string
  social_links: SocialLink[]
}

interface CompanyViewSlidePanelProps {
  open: boolean
  onClose: () => void
  company: Company | null
  onCompanyUpdate?: (updatedCompany: Company) => void
}

export function CompanyViewSlidePanel({ open, onClose, company, onCompanyUpdate }: CompanyViewSlidePanelProps) {
  // Guard: Return null if company is not provided
  if (!company) return null

  const { sidebarWidth } = useSidebar()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("visao-geral")
  const [showMigrateModal, setShowMigrateModal] = useState(false)
  const [migrationStep, setMigrationStep] = useState<"confirm" | "leader">("confirm")
  const [avatar, setAvatar] = useState<string | null>(company?.avatar || null)
  const [showAvatarMenu, setShowAvatarMenu] = useState(false)
  const [originalRawSrc, setOriginalRawSrc] = useState<string | null>(null)
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null)
  const [cropOpen, setCropOpen] = useState(false)
  const [cropZoom, setCropZoom] = useState(1)
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cropImgRef = useRef<HTMLImageElement>(null)
  const CROP_SIZE = 192
  const [showBalance, setShowBalance] = useState(false)
  
  // Edit mode state for Dados tab
  const [isDadosEditMode, setIsDadosEditMode] = useState(false)
  const DADOS_ALL_ACCORDIONS = ["cadastrais", "contato", "endereco", "financeiro", "adicionais"]
  const [dadosOpenAccordions, setDadosOpenAccordions] = useState<string[]>([])
  const [dadosEditedData, setDadosEditedData] = useState<Record<string, any>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [showSaveConfirm, setShowSaveConfirm] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  // Payment methods state
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState<string>("pix")
  const [creditCards, setCreditCards] = useState<Array<{
    id: string
    brand: string
    lastFour: string
    expiry: string
    holderName: string
  }>>([
    { id: "1", brand: "Visa", lastFour: "4242", expiry: "12/25", holderName: "John Doe" },
  ])
  const [showAddCardModal, setShowAddCardModal] = useState(false)
  const [newCardData, setNewCardData] = useState({
    number: "",
    expiry: "",
    cvv: "",
    holderName: "",
  })

  // Admin actions state
  const [adminActionModal, setAdminActionModal] = useState<string | null>(null)
  const [adminFormData, setAdminFormData] = useState({
    creditPlan: company.partner_level || "basic",
    accountType: company.type || "company",
    chargeDate: "",
    paymentDate: "",
    dueDate: "",
  })
  const [paymentHistory, setPaymentHistory] = useState([
    { id: "1", date: "2024-01-15", amount: 1500, method: "pix", status: "Pago", type: "nf" },
    { id: "2", date: "2024-01-10", amount: 2000, method: "boleto", status: "Pago", type: "nf" },
    { id: "3", date: "2024-01-05", amount: 500, method: "allkoins", status: "Pago", type: "comprovante" },
    { id: "4", date: "2023-12-20", amount: 1500, method: "cartao", status: "Pendente", type: "nf" },
  ])

  // Company Wallet state
  const [companyWalletBalance, setCompanyWalletBalance] = useState(5000)
  const [companyWalletStatements, setCompanyWalletStatements] = useState([
    { id: "stmt_1", date: new Date().toISOString(), type: "credit" as const, amount: 1000, reason: "Recarga inicial", balanceAfter: 5000 },
    { id: "stmt_2", date: new Date(Date.now() - 7*24*60*60*1000).toISOString(), type: "debit" as const, amount: 200, reason: "Pagamento de serviço", balanceAfter: 4000 },
  ])
  const [showCompanyWalletModal, setShowCompanyWalletModal] = useState(false)
  const [companyWalletType, setCompanyWalletType] = useState<"add" | "remove">("add")
  const [companyWalletAmount, setCompanyWalletAmount] = useState("")
  const [companyWalletReason, setCompanyWalletReason] = useState("")
  const [showWalletConfirmDialog, setShowWalletConfirmDialog] = useState(false)
  const [isApplyingCompanyWallet, setIsApplyingCompanyWallet] = useState(false)

  useEffect(() => {
    if (company) {
      setAvatar(company.avatar || null)
    }
  }, [company])

  if (!company) return null

  // Avatar handlers
  const handleAvatarClick = () => {
    if (avatar) { setShowAvatarMenu((p) => !p) } else { fileInputRef.current?.click() }
  }
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ""
    const reader = new FileReader()
    reader.onload = (ev) => {
      const src = ev.target?.result as string
      setRawImageSrc(src)
      setOriginalRawSrc(src)
      setCropZoom(1)
      setCropOffset({ x: 0, y: 0 })
      setCropOpen(true)
    }
    reader.readAsDataURL(file)
  }
  const handleCropConfirm = () => {
    const img = cropImgRef.current
    if (!img) return
    const canvas = document.createElement("canvas")
    canvas.width = CROP_SIZE
    canvas.height = CROP_SIZE
    const ctx = canvas.getContext("2d")!
    ctx.beginPath()
    ctx.arc(CROP_SIZE / 2, CROP_SIZE / 2, CROP_SIZE / 2, 0, Math.PI * 2)
    ctx.clip()
    const fitScale = Math.min(CROP_SIZE / img.naturalWidth, CROP_SIZE / img.naturalHeight)
    const drawW = img.naturalWidth * fitScale * cropZoom
    const drawH = img.naturalHeight * fitScale * cropZoom
    const dx = CROP_SIZE / 2 + cropOffset.x - drawW / 2
    const dy = CROP_SIZE / 2 + cropOffset.y - drawH / 2
    ctx.drawImage(img, dx, dy, drawW, drawH)
    setAvatar(canvas.toDataURL("image/jpeg", 0.92))
    setCropOpen(false)
    setRawImageSrc(null)
  }

  const getTypeLabel = (type: CompanyType) => {
    const labels = {
      company: "Empresa",
      agency: "Agência",
      nomad: "Nômade",
    }
    return labels[type]
  }

  const getStatusColor = (status: CompanyStatus) => {
    const colors = {
      active: "default",
      inactive: "secondary",
      pending: "outline",
    }
    return colors[status] as any
  }

  const getStatusLabel = (status: CompanyStatus) => {
    const labels = {
      active: "Ativo",
      inactive: "Inativo",
      pending: "Pendente",
    }
    return labels[status]
  }

  // Payment methods functions
  const handleSetDefaultMethod = (method: string) => {
    setDefaultPaymentMethod(method)
  }

  const handleAddCard = () => {
    if (newCardData.number && newCardData.expiry && newCardData.cvv && newCardData.holderName) {
      const lastFour = newCardData.number.slice(-4)
      const newCard = {
        id: Math.random().toString(),
        brand: newCardData.number.startsWith("4") ? "Visa" : "Mastercard",
        lastFour,
        expiry: newCardData.expiry,
        holderName: newCardData.holderName,
      }
      setCreditCards([...creditCards, newCard])
      setNewCardData({ number: "", expiry: "", cvv: "", holderName: "" })
      setShowAddCardModal(false)
    }
  }

  const handleRemoveCard = (cardId: string) => {
    setCreditCards(creditCards.filter((card) => card.id !== cardId))
  }

  const handleSetDefaultCard = (cardId: string) => {
    if (creditCards.length > 0) {
      setDefaultPaymentMethod(`card-${cardId}`)
    }
  }

  // Company Wallet handlers
  const handleCompanyWalletAction = (action: "add" | "remove") => {
    setCompanyWalletType(action)
    setCompanyWalletAmount("")
    setCompanyWalletReason("")
    setShowCompanyWalletModal(true)
  }

  const handleCompanyWalletSubmit = () => {
    if (!companyWalletAmount || parseFloat(companyWalletAmount) <= 0) {
      toast({ title: "Erro", description: "Digite um valor válido", variant: "destructive" })
      return
    }
    if (!companyWalletReason.trim()) {
      toast({ title: "Erro", description: "Informe o motivo da operação", variant: "destructive" })
      return
    }
    setShowWalletConfirmDialog(true)
  }

  const handleCompanyWalletConfirm = () => {
    setIsApplyingCompanyWallet(true)
    const amount = parseFloat(companyWalletAmount)
    const currentBalance = companyWalletBalance
    let newBalance = currentBalance

    if (companyWalletType === "add") {
      newBalance = currentBalance + amount
    } else {
      if (currentBalance < amount) {
        toast({ title: "Erro", description: "Saldo não pode ser negativo", variant: "destructive" })
        setIsApplyingCompanyWallet(false)
        return
      }
      newBalance = currentBalance - amount
    }

    const newStatement = {
      id: `stmt_${Date.now()}`,
      date: new Date().toISOString(),
      type: (companyWalletType === "add" ? "credit" : "debit") as const,
      amount,
      reason: companyWalletReason,
      balanceAfter: newBalance,
    }

    setCompanyWalletBalance(newBalance)
    setCompanyWalletStatements(prev => [newStatement, ...prev])
    
    toast({ 
      title: "Sucesso!", 
      description: `Saldo atualizado para R$ ${newBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` 
    })
    
    setShowCompanyWalletModal(false)
    setShowWalletConfirmDialog(false)
    setIsApplyingCompanyWallet(false)
  }

  // Admin actions handlers
  const handleAdminAction = (action: string) => {
    setAdminActionModal(action)
  }

  const handleConfirmAdminAction = () => {
    // Mock implementation - in real app would call backend
    console.log("[v0] Admin action confirmed:", adminActionModal, adminFormData)
    setAdminActionModal(null)
  }

  const handleGenerateBoleto = () => {
    console.log("[v0] Boleto gerado")
    setAdminActionModal(null)
  }

  const getInitials = (name: string): string => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const handleMigrateClick = () => {
    console.log("[v0] Migrate button clicked for company:", company.name)
    setMigrationStep("confirm")
    setShowMigrateModal(true)
  }

  const handleConfirmMigration = () => {
    console.log("[v0] Moving to Partner Leader invitation step for:", company.name)
    setMigrationStep("leader")
  }

  const handleInviteLeader = () => {
    console.log("[v0] Sending Partner Leader invitation to:", company.name)
    setShowMigrateModal(false)
    setMigrationStep("confirm")
  }

  const handleMigrateWithoutInvite = () => {
    console.log("[v0] Migrating to Partner without Leader invitation for:", company.name)
    setShowMigrateModal(false)
    setMigrationStep("confirm")
  }

  const handleCloseMigrateModal = () => {
    console.log("[v0] Closing migration modal")
    setShowMigrateModal(false)
    setMigrationStep("confirm")
  }

  // Dados tab edit handlers
  const getDadosDisplayValue = (key: string) => {
    if (isDadosEditMode && key in dadosEditedData) {
      return dadosEditedData[key]
    }
    const fieldMap: Record<string, string> = {
      legal_name: "legal_name",
      trade_name: "name",
      document: "document",
      ie: "ie",
      status: "status",
      email: "email",
      phone: "phone",
      phone_secondary: "phone_secondary",
      whatsapp: "whatsapp",
      website: "website",
      zip_code: "zip_code",
      street: "street",
      number: "number",
      complement: "complement",
      neighborhood: "neighborhood",
      city: "city",
      state: "state",
      country: "country",
      pix_key: "pix_key",
      pix_type: "pix_type",
      bank_name: "bank_name",
      bank_agency: "bank_agency",
      bank_account: "bank_account",
      bank_account_type: "bank_account_type",
      admin_notes: "admin_notes",
      internal_notes: "internal_notes",
    }
    return (company as any)?.[fieldMap[key]] || ""
  }

  const handleDadosFieldChange = (key: string, value: any) => {
    setDadosEditedData((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleDadosEditMode = () => {
    setIsDadosEditMode(true)
  }

  const handleDadosCancelEdit = () => {
    setIsDadosEditMode(false)
    setDadosEditedData({})
  }

  const handleDadosSaveClick = () => {
    // Validation
    const name = getDadosDisplayValue("legal_name") || getDadosDisplayValue("trade_name")
    const email = getDadosDisplayValue("email")
    const phone = getDadosDisplayValue("phone")
    const zipCode = getDadosDisplayValue("zip_code")

    // Required field validation
    if (!name || typeof name !== "string" || !name.trim()) {
      toast({ title: "Erro", description: "Nome / Razão Social é obrigat��rio", variant: "destructive" })
      return
    }

    // Email validation
    if (!email || typeof email !== "string" || !email.includes("@")) {
      toast({ title: "Erro", description: "Email válido é obrigatório", variant: "destructive" })
      return
    }

    // Phone validation
    if (!phone || typeof phone !== "string" || phone.trim().length < 10) {
      toast({ title: "Erro", description: "Telefone principal é obrigatório (mínimo 10 caracteres)", variant: "destructive" })
      return
    }

    // CEP validation (if provided)
    if (zipCode && typeof zipCode === "string" && zipCode.trim().length > 0 && zipCode.trim().length < 8) {
      toast({ title: "Erro", description: "CEP deve ter no mínimo 8 caracteres", variant: "destructive" })
      return
    }

    // Validation passed — show confirmation dialog
    setShowSaveConfirm(true)
  }

  const performDadosSave = async () => {
    if (!company?.id) {
      toast({ title: "Erro", description: "ID da empresa não encontrado", variant: "destructive" })
      return
    }

    setIsSaving(true)
    try {
      const dataPayload = {
        name: getDadosDisplayValue("trade_name") || company.name,
        legal_name: getDadosDisplayValue("legal_name") || company.name,
        email: getDadosDisplayValue("email"),
        phone: getDadosDisplayValue("phone"),
        phone_secondary: getDadosDisplayValue("phone_secondary") || undefined,
        whatsapp: getDadosDisplayValue("whatsapp") || undefined,
        website: getDadosDisplayValue("website") || undefined,
        ie: getDadosDisplayValue("ie") || undefined,
        zip_code: getDadosDisplayValue("zip_code") || undefined,
        street: getDadosDisplayValue("street") || undefined,
        number: getDadosDisplayValue("number") || undefined,
        complement: getDadosDisplayValue("complement") || undefined,
        neighborhood: getDadosDisplayValue("neighborhood") || undefined,
        city: getDadosDisplayValue("city") || undefined,
        state: getDadosDisplayValue("state") || undefined,
        country: getDadosDisplayValue("country") || "Brasil",
        pix_key: getDadosDisplayValue("pix_key") || undefined,
        pix_type: getDadosDisplayValue("pix_type") || undefined,
        bank_name: getDadosDisplayValue("bank_name") || undefined,
        bank_agency: getDadosDisplayValue("bank_agency") || undefined,
        bank_account: getDadosDisplayValue("bank_account") || undefined,
        bank_account_type: getDadosDisplayValue("bank_account_type") || undefined,
        admin_notes: getDadosDisplayValue("admin_notes") || undefined,
        internal_notes: getDadosDisplayValue("internal_notes") || undefined,
        status: getDadosDisplayValue("status") || company.status,
      }

      // Simulate async save (no real API in mock mode)
      await new Promise((resolve) => setTimeout(resolve, 600))

      const updatedCompany: Company = {
        ...company!,
        name: dataPayload.name as string,
        legal_name: dataPayload.legal_name as string,
        email: dataPayload.email as string,
        phone: dataPayload.phone as string,
        phone_secondary: dataPayload.phone_secondary,
        whatsapp: dataPayload.whatsapp,
        website: dataPayload.website,
        ie: dataPayload.ie,
        zip_code: dataPayload.zip_code,
        street: dataPayload.street,
        number: dataPayload.number,
        complement: dataPayload.complement,
        neighborhood: dataPayload.neighborhood,
        city: dataPayload.city,
        state: dataPayload.state,
        country: dataPayload.country,
        pix_key: dataPayload.pix_key,
        pix_type: dataPayload.pix_type,
        bank_name: dataPayload.bank_name,
        bank_agency: dataPayload.bank_agency,
        bank_account: dataPayload.bank_account,
        bank_account_type: dataPayload.bank_account_type,
        admin_notes: dataPayload.admin_notes,
        internal_notes: dataPayload.internal_notes,
        status: dataPayload.status as CompanyStatus,
      }

      onCompanyUpdate?.(updatedCompany)
      toast({ title: "Dados salvos!", description: "As informações da empresa foram atualizadas com sucesso." })
      setIsDadosEditMode(false)
      setDadosEditedData({})
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao salvar dados da empresa", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  // Mock data for charts and metrics
  const moduleUsageData = [
    { nome: "Vendas", uso: 1200 },
    { nome: "Financeiro", uso: 980 },
    { nome: "Relatórios", uso: 850 },
    { nome: "RH", uso: 720 },
    { nome: "Operações", uso: 650 },
  ]

  const allUserPool = [
    { name: "Ana Silva",       avatar: "AS" },
    { name: "Carlos Santos",   avatar: "CS" },
    { name: "Marina Costa",    avatar: "MC" },
    { name: "Paulo Oliveira",  avatar: "PO" },
    { name: "Rita Alves",      avatar: "RA" },
    { name: "Lucas Ferreira",  avatar: "LF" },
    { name: "Juliana Rocha",   avatar: "JR" },
    { name: "Bruno Mendes",    avatar: "BM" },
    { name: "Fernanda Lima",   avatar: "FL" },
    { name: "Diego Carvalho",  avatar: "DC" },
    { name: "Tatiane Borges",  avatar: "TB" },
    { name: "Rafael Souza",    avatar: "RS" },
    { name: "Camila Nunes",    avatar: "CN" },
    { name: "Vinícius Prado",  avatar: "VP" },
    { name: "Aline Castelo",   avatar: "AC" },
    { name: "Thiago Moreira",  avatar: "TM" },
    { name: "Patrícia Dias",   avatar: "PD" },
    { name: "Rodrigo Leal",    avatar: "RL" },
    { name: "Isabela Teixeira",avatar: "IT" },
    { name: "Felipe Araújo",   avatar: "FA" },
  ]
  const accessTimes = [
    "Há 10 minutos", "Há 25 minutos", "Há 1 hora", "Há 2 horas", "Há 3 horas",
    "Há 5 horas", "Há 7 horas", "Há 9 horas", "Ontem", "Ontem à tarde",
    "2 dias atrás", "3 dias atrás", "4 dias atrás", "5 dias atrás", "1 semana atrás",
  ]
  const seed = company.id * 7
  const recentUsers = Array.from({ length: 5 }, (_, i) => {
    const userIdx = (seed + i * 3) % allUserPool.length
    const timeIdx = (seed + i * 5) % accessTimes.length
    return { id: i + 1, ...allUserPool[userIdx], time: accessTimes[timeIdx] }
  })

  return (
    <>
      <Sheet open={open && !showMigrateModal} onOpenChange={(o) => { if (!o && !showSaveConfirm && !showCancelConfirm) onClose() }}>
        <SheetContent
          side="right"
          hideOverlay={true}
          onInteractOutside={(e) => { if (showSaveConfirm || showCancelConfirm) e.preventDefault() }}
          onPointerDownOutside={(e) => { if (showSaveConfirm || showCancelConfirm) e.preventDefault() }}
          className="p-0 flex flex-col gap-0 !w-auto !max-w-none"
          style={{ left: `${sidebarWidth}px`, width: `calc(100vw - ${sidebarWidth}px)`, maxWidth: `calc(100vw - ${sidebarWidth}px)` }}
        >
          <div className="relative flex flex-col h-full overflow-hidden">
          {/* Hidden file input */}
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          <ModalBrandHeader
            right={
              <div className="flex items-center gap-3 flex-shrink-0">
                {company.status === "active" && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500 text-white">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Ativa
                  </span>
                )}
                {company.status === "inactive" && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-400 text-white">
                    <PauseCircle className="h-3.5 w-3.5" />
                    Inativa
                  </span>
                )}
                {company.status === "pending" && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-400 text-amber-900">
                    <Clock className="h-3.5 w-3.5" />
                    Pendente
                  </span>
                )}
                {/* Credit Plan Badge */}
                {company.partner_level && (() => {
                  const planMap: Record<string, { name: string; color: string }> = {
                    starter:    { name: "Starter",    color: "bg-slate-100 text-slate-600 border border-slate-200" },
                    growth:     { name: "Growth",     color: "bg-blue-100 text-blue-700 border border-blue-200" },
                    enterprise: { name: "Enterprise", color: "bg-purple-100 text-purple-700 border border-purple-200" },
                    // backwards compat
                    basic:    { name: "Starter",    color: "bg-slate-100 text-slate-600 border border-slate-200" },
                    pro:      { name: "Growth",     color: "bg-blue-100 text-blue-700 border border-blue-200" },
                    gold:     { name: "Starter",    color: "bg-slate-100 text-slate-600 border border-slate-200" },
                    silver:   { name: "Starter",    color: "bg-slate-100 text-slate-600 border border-slate-200" },
                    platinum: { name: "Enterprise", color: "bg-purple-100 text-purple-700 border border-purple-200" },
                  }
                  const p = planMap[company.partner_level!.toLowerCase()] ?? { name: company.partner_level, color: "bg-slate-100 text-slate-600 border border-slate-200" }
                  return (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${p.color}`}>
                      <Crown className="h-3.5 w-3.5" />
                      {p.name}
                    </span>
                  )
                })()}

                {/* Account Type Badge */}
                {(() => {
                  const label =
                    company.type === "company" && company.account_type === "independent" ? "Company Independente"
                    : company.type === "company" ? "Company Dependente"
                    : company.type === "agency"  ? "Agency"
                    : company.type === "nomad"   ? "Partner"
                    : null
                  if (!label) return null
                  const typeColor =
                    label === "Company Independente" ? "bg-blue-100 text-blue-700 border border-blue-200"
                    : label === "Company Dependente"  ? "bg-violet-100 text-violet-700 border border-violet-200"
                    : label === "Agency"              ? "bg-pink-100 text-pink-700 border border-pink-200"
                    :                                   "bg-emerald-100 text-emerald-700 border border-emerald-200"
                  const TypeIcon = label === "Agency" ? Building2 : label === "Partner" ? Star : Building2
                  return (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${typeColor}`}>
                      <TypeIcon className="h-3.5 w-3.5" />
                      {label}
                    </span>
                  )
                })()}

                {/* Wallet Balance Card */}
                <div
                  onClick={() => setShowBalance(!showBalance)}
                  className="flex cursor-pointer items-center gap-2 bg-gradient-to-r from-blue-900/40 to-cyan-900/40 px-4 py-2 rounded-lg border border-blue-700/50 flex-shrink-0 hover:border-blue-600/75 transition-colors"
                >
                  <div className="flex-1">
                    <p className="text-blue-300 text-xs font-semibold uppercase tracking-wide">ALLKOIN</p>
                    <p className="text-white font-bold text-sm">
                      {showBalance ? "0.00" : "•••••"}
                    </p>
                  </div>
                  <Eye className="h-4 w-4 text-blue-200" />
                </div>

              </div>
            }
            left={
              <div className="flex items-center gap-4 flex-1 min-w-0">
                {/* Avatar Section */}
                <button
                  onClick={handleAvatarClick}
                  className="relative h-20 w-20 rounded-full bg-white/15 border-2 border-white/30 flex-shrink-0 group overflow-hidden hover:border-white/60 transition-all"
                >
                  {avatar ? (
                    <img src={avatar} alt="logo" className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-600 to-cyan-500">
                      <span className="text-white font-bold text-2xl">{company.name.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                    <Camera className="h-5 w-5 text-white" />
                    <span className="text-[9px] text-white/90 font-medium mt-0.5">{avatar ? "Editar" : "Foto"}</span>
                  </div>
                </button>

                {/* Main Info Section */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-white font-bold text-lg truncate">{company.name}</h2>
                  <p className="text-blue-300 text-xs truncate">{company.email}</p>
                  <p className="text-blue-200 text-xs mt-1">{getTypeLabel(company.type)}</p>
                </div>
              </div>
            }
          />
          {/* Avatar menu */}
          {showAvatarMenu && avatar && (
            <>
              <div className="absolute inset-0 z-40" onClick={() => setShowAvatarMenu(false)} />
              <div className="absolute z-50 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden min-w-[172px]" style={{ top: 108, left: 22 }}>
                <button
                  onClick={() => { setShowAvatarMenu(false); setTimeout(() => fileInputRef.current?.click(), 10) }}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Camera className="h-3.5 w-3.5 text-gray-400" />
                  Nova foto
                </button>
                {originalRawSrc && (
                  <button
                    onClick={() => { setShowAvatarMenu(false); setRawImageSrc(originalRawSrc); setCropZoom(1); setCropOffset({ x: 0, y: 0 }); setCropOpen(true) }}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-100"
                  >
                    <ZoomIn className="h-3.5 w-3.5 text-gray-400" />
                    Reposicionar
                  </button>
                )}
                <button
                  onClick={() => { setShowAvatarMenu(false); setAvatar(null); setOriginalRawSrc(null) }}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors border-t border-gray-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remover foto
                </button>
              </div>
            </>
          )}

          {/* Crop overlay */}
          {cropOpen && rawImageSrc && (
            <div className="absolute inset-0 z-50 flex flex-col bg-black/90">
              <div className="flex-shrink-0 px-6 pt-5 pb-2 text-center">
                <p className="text-white text-sm font-semibold">Ajustar logo da empresa</p>
                <p className="text-white/50 text-xs mt-0.5">Arraste para reposicionar · use o zoom para ajustar</p>
              </div>
              <div className="flex-1 flex items-center justify-center overflow-hidden">
                <div
                  className="relative flex-shrink-0"
                  style={{ width: CROP_SIZE, height: CROP_SIZE }}
                  onMouseDown={(e) => { setIsDragging(true); setDragStart({ x: e.clientX - cropOffset.x, y: e.clientY - cropOffset.y }) }}
                  onMouseMove={(e) => { if (!isDragging) return; setCropOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }) }}
                  onMouseUp={() => setIsDragging(false)}
                  onMouseLeave={() => setIsDragging(false)}
                >
                  <img ref={cropImgRef} src={rawImageSrc} alt="crop" draggable={false}
                    style={{ transform: `translate(${cropOffset.x}px,${cropOffset.y}px) scale(${cropZoom})`, transformOrigin: "center", userSelect: "none", width: "100%", height: "100%", objectFit: "contain", opacity: 0.35 }}
                  />
                  <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `circle(${CROP_SIZE / 2}px at 50% 50%)`, pointerEvents: "none" }}>
                    <img src={rawImageSrc} alt="crop-bright" draggable={false}
                      style={{ transform: `translate(${cropOffset.x}px,${cropOffset.y}px) scale(${cropZoom})`, transformOrigin: "center", userSelect: "none", width: "100%", height: "100%", objectFit: "contain" }}
                    />
                  </div>
                  <div className="absolute inset-0 rounded-full border-2 border-white/60 pointer-events-none" style={{ borderRadius: "50%" }} />
                </div>
              </div>
              <div className="flex-shrink-0 px-6 pb-3 space-y-3">
                <div className="flex items-center gap-3">
                  <Camera className="h-4 w-4 text-white/60 flex-shrink-0" />
                  <input type="range" min={0.1} max={3} step={0.01} value={cropZoom} onChange={(e) => setCropZoom(parseFloat(e.target.value))} className="flex-1 accent-white" />
                  <button onClick={() => setCropOffset({ x: 0, y: 0 })} className="h-7 w-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors flex-shrink-0" title="Centralizar">
                    <Crosshair className="h-4 w-4 text-white" />
                  </button>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setCropOpen(false); setRawImageSrc(null) }} className="flex-1 h-9 rounded-lg border border-white/20 text-white/70 text-sm hover:bg-white/10 transition-colors">Cancelar</button>
                  <button onClick={handleCropConfirm} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 text-white text-sm font-semibold hover:from-blue-700 hover:to-violet-700 transition-colors">Usar esta foto</button>
                </div>
              </div>
            </div>
          )}

          {/* Content Wrapper - scrollable */}
          <div className="flex-1 overflow-y-auto bg-slate-200">
            {/* Content with Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col mt-0">
            <div className="sticky top-0 z-40 flex-shrink-0 border-b border-slate-200 bg-white px-[50px] py-[15px] overflow-x-auto">
              <TabsList className="grid w-max grid-cols-9 gap-1 bg-transparent p-0 h-auto">
                <TabsTrigger
                  value="visao-geral"
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-transparent data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 data-[state=active]:border-blue-300 hover:bg-slate-100"
                >
                  Visão Geral
                </TabsTrigger>
                <TabsTrigger
                  value="dados"
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-transparent data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 data-[state=active]:border-blue-300 hover:bg-slate-100"
                >
                  Dados
                </TabsTrigger>
                <TabsTrigger
                  value="usuarios"
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-transparent data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 data-[state=active]:border-blue-300 hover:bg-slate-100"
                >
                  Usuários
                </TabsTrigger>
                <TabsTrigger
                  value="redes-sociais"
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-transparent data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 data-[state=active]:border-blue-300 hover:bg-slate-100"
                >
                  Redes Sociais
                </TabsTrigger>
                <TabsTrigger
                  value="plano"
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-transparent data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 data-[state=active]:border-blue-300 hover:bg-slate-100"
                >
                  Plano
                </TabsTrigger>
                <TabsTrigger
                  value="termos"
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-transparent data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 data-[state=active]:border-blue-300 hover:bg-slate-100"
                >
                  Termos
                </TabsTrigger>
                <TabsTrigger
                  value="projetos"
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-transparent data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 data-[state=active]:border-blue-300 hover:bg-slate-100"
                >
                  Projetos
                </TabsTrigger>
                <TabsTrigger
                  value="tarefas"
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-transparent data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 data-[state=active]:border-blue-300 hover:bg-slate-100"
                >
                  Tarefas
                </TabsTrigger>
                <TabsTrigger
                  value="log"
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-transparent data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 data-[state=active]:border-blue-300 hover:bg-slate-100"
                >
                  Log
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Overview Tab */}
            <TabsContent value="visao-geral" className="flex-1 overflow-y-auto">
              <div className="px-[50px] py-[50px] space-y-4">
                {/* KPI Cards Row */}
                <div className="grid grid-cols-3 gap-3">
                  {/* Card 1: Total de tarefas contratadas */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 border border-blue-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider leading-none">Tarefas contratadas</span>
                        <div className="text-2xl font-bold text-slate-900 mt-1">1.247</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Vinculadas à empresa</div>
                      </div>
                      <div className="p-1.5 bg-white rounded-md border border-blue-200 flex-shrink-0">
                        <TrendingUp className="h-4 w-4 text-blue-600" />
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Pontuação total das tarefas */}
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 border border-purple-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider leading-none">Pontuação total</span>
                        <div className="text-2xl font-bold text-slate-900 mt-1">8.430 pts</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Soma dos projetos</div>
                      </div>
                      <div className="p-1.5 bg-white rounded-md border border-purple-200 flex-shrink-0">
                        <Star className="h-4 w-4 text-purple-600" />
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Economia gerada */}
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 border border-green-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider leading-none">Economia gerada</span>
                        <div className="text-2xl font-bold text-slate-900 mt-1">R$ 124.500</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Economia acumulada</div>
                      </div>
                      <div className="p-1.5 bg-white rounded-md border border-green-200 flex-shrink-0">
                        <Wallet className="h-4 w-4 text-green-600" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Seção de Estatísticas - Mesmo padrão de admin/usuarios */}
                <Accordion type="single" collapsible defaultValue="estatisticas" className="space-y-3">
                  <AccordionItem value="estatisticas" className="border border-slate-200 rounded-lg">
                    <AccordionTrigger className="px-3 py-2 bg-white hover:bg-slate-50 [&[data-state=open]]:bg-slate-50 rounded-t-lg text-xs">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-slate-600" />
                        <span className="font-semibold text-slate-900">Estatísticas</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="border-t border-slate-100 pb-0">
                      <div className="px-3 py-3 rounded-b-lg overflow-hidden">
                      <div className="grid grid-cols-3 gap-2">
                        <Card className="p-2 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/20 dark:to-emerald-900/10 border-emerald-200/50 dark:border-emerald-800/30 shadow-none">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <TrendingUp className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-[10px] font-medium text-emerald-900 dark:text-emerald-300">Crescimento</span>
                          </div>
                          <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                            {company.status === "active" && company.mau > 0
                              ? `${((company.dau / company.mau) * 100).toFixed(1)}%`
                              : "—"}
                          </p>
                        </Card>

                        <Card className="p-2 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/10 border-blue-200/50 dark:border-blue-800/30 shadow-none">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <Users className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                            <span className="text-[10px] font-medium text-blue-900 dark:text-blue-300">Usuários</span>
                          </div>
                          <p className="text-sm font-bold text-blue-700 dark:text-blue-300">{company.users_count}</p>
                        </Card>

                        <Card className="p-2 bg-gradient-to-br from-violet-50 to-violet-100/50 dark:from-violet-950/20 dark:to-violet-900/10 border-violet-200/50 dark:border-violet-800/30 shadow-none">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <Clock className="h-3 w-3 text-violet-600 dark:text-violet-400" />
                            <span className="text-[10px] font-medium text-violet-900 dark:text-violet-300">Ativos 90d</span>
                          </div>
                          <p className="text-sm font-bold text-violet-700 dark:text-violet-300">
                            {company.mau > 0 ? Math.round(company.mau / 3) : 0}
                          </p>
                        </Card>
                      </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                {/* Status de Usuários Row */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Card: Últimos usuários que acessaram */}
                  <div className="bg-white rounded-lg p-3 border border-slate-200">
                    <h3 className="text-xs font-semibold text-slate-700 mb-2">Últimos acessos</h3>
                    <div className="space-y-2">
                      {recentUsers.length > 0 ? (
                        recentUsers.map((user) => (
                          <div key={user.id} className="flex items-center gap-2 pb-1.5 border-b border-slate-100 last:border-0 last:pb-0">
                            <Avatar className="h-6 w-6 flex-shrink-0">
                              <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.avatar}`} />
                              <AvatarFallback className="text-[10px]">{user.avatar}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-slate-900 truncate">{user.name}</p>
                              <p className="text-[10px] text-slate-500">{user.time}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-500">Nenhum acesso recente</p>
                      )}
                    </div>
                  </div>

                  {/* Card: Usuários online agora */}
                  <div className="bg-white rounded-lg p-3 border border-slate-200 flex flex-col items-center justify-center">
                    <h3 className="text-xs font-semibold text-slate-700 mb-2 w-full">Online agora</h3>
                    <div className="flex flex-col items-center justify-center flex-1">
                      <div className="text-4xl font-bold text-blue-600">{company.users_online}</div>
                      <p className="text-[10px] text-slate-500 mt-1">usuários ativos</p>
                    </div>
                  </div>
                </div>

                {/* Módulos Mais Usados - Full Width Chart */}
                <div className="bg-white rounded-lg p-3 border border-slate-200">
                  <h4 className="text-xs font-semibold text-slate-700 mb-2">Módulos mais usados</h4>
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart data={moduleUsageData} layout="vertical" margin={{ top: 0, right: 30, left: 80, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis dataKey="nome" type="category" tick={{ fontSize: 9 }} width={75} />
                      <RechartsTooltip contentStyle={{ backgroundColor: "#1e293b", border: "none", borderRadius: "4px", color: "#fff", fontSize: "11px" }} />
                      <Bar dataKey="uso" fill="#3b82f6" radius={2} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Informações Principais - Accordion */}
                <Accordion type="multiple" defaultValue={[]} className="space-y-3">
                  <AccordionItem value="info-principais" className="border border-slate-200 rounded-lg">
                    <AccordionTrigger className="px-3 py-2 bg-white hover:bg-slate-50 [&[data-state=open]]:bg-slate-50 rounded-t-lg text-xs">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-blue-600" />
                        <span className="font-semibold text-slate-900">Informações Principais</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-3 py-2 border-t border-slate-100 pb-0">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-500">ID</span>
                          <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-700">{company.id}</code>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-500">Tipo</span>
                          <Badge className="bg-blue-600 text-[10px] px-1.5 py-0">{getTypeLabel(company.type)}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-500">Status</span>
                          <Badge variant={getStatusColor(company.status)} className="text-[10px] px-1.5 py-0">{getStatusLabel(company.status)}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-500">Cadastro</span>
                          <span className="text-[10px] font-medium text-slate-700">{new Date(company.created_at).toLocaleDateString("pt-BR")}</span>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </TabsContent>

            {/* Dados Tab */}
            <TabsContent value="dados" className="space-y-4 mt-0 px-[50px] py-[50px]">
              {/* Header with Edit Button */}
              <div className="flex items-center justify-between sticky top-0 bg-white z-10 pb-4 -mx-6 px-6">
                <h3 className="text-sm font-semibold text-slate-900">Dados da Empresa</h3>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const allOpen = DADOS_ALL_ACCORDIONS.every(a => dadosOpenAccordions.includes(a))
                      setDadosOpenAccordions(allOpen ? [] : DADOS_ALL_ACCORDIONS)
                    }}
                    className="text-xs"
                  >
                    <ChevronsUpDown className="h-3.5 w-3.5 mr-1.5" />
                    {DADOS_ALL_ACCORDIONS.every(a => dadosOpenAccordions.includes(a)) ? "Fechar todos" : "Abrir todos"}
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
                      <Button onClick={() => setShowCancelConfirm(true)} size="sm" variant="outline">
                        <XCircle className="h-4 w-4 mr-2" />
                        Cancelar
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Accordions */}
              <Accordion type="multiple" value={dadosOpenAccordions} onValueChange={setDadosOpenAccordions} className="space-y-3">
                {/* DADOS CADASTRAIS */}
                <AccordionItem value="cadastrais" className="border border-slate-200 rounded-lg">
                  <AccordionTrigger className="px-3 py-2 bg-white hover:bg-slate-50 [&[data-state=open]]:bg-slate-50 rounded-t-lg text-xs">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-blue-600" />
                      <span className="font-semibold text-slate-900">Dados Cadastrais</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 py-3 border-t border-slate-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Razão Social */}
                      <div>
                        <label className="text-sm font-semibold text-slate-700 block mb-1.5">Razão Social</label>
                        {isDadosEditMode ? (
                          <Input value={getDadosDisplayValue("legal_name") as string} onChange={(e) => handleDadosFieldChange("legal_name", e.target.value)} className="border-slate-300" placeholder="Digite a razão social" />
                        ) : (
                          <div className="font-medium text-slate-900">{getDadosDisplayValue("legal_name") || company.name || "—"}</div>
                        )}
                      </div>

                      {/* Nome Fantasia */}
                      <div>
                        <label className="text-sm font-semibold text-slate-700 block mb-1.5">Nome Fantasia</label>
                        {isDadosEditMode ? (
                          <Input value={getDadosDisplayValue("trade_name") as string || ""} onChange={(e) => handleDadosFieldChange("trade_name", e.target.value)} className="border-slate-300" placeholder="Digite o nome fantasia" />
                        ) : (
                          <div className="font-medium text-slate-900">{getDadosDisplayValue("trade_name") || company.name || "—"}</div>
                        )}
                      </div>

                      {/* CNPJ */}
                      <div>
                        <label className="text-sm font-semibold text-slate-700 block mb-1.5">CNPJ</label>
                        {isDadosEditMode ? (
                          <Input value={getDadosDisplayValue("document") as string || ""} onChange={(e) => handleDadosFieldChange("document", e.target.value)} className="border-slate-300 font-mono" placeholder="00.000.000/0000-00" disabled />
                        ) : (
                          <code className="bg-slate-100 px-2 py-1 rounded text-xs font-mono font-bold text-slate-900">{company.document || "—"}</code>
                        )}
                      </div>

                      {/* Inscrição Estadual */}
                      <div>
                        <label className="text-sm font-semibold text-slate-700 block mb-1.5">Inscrição Estadual</label>
                        {isDadosEditMode ? (
                          <Input value={getDadosDisplayValue("ie") as string || ""} onChange={(e) => handleDadosFieldChange("ie", e.target.value)} className="border-slate-300" placeholder="IE" />
                        ) : (
                          <div className="font-medium text-slate-900">{getDadosDisplayValue("ie") || "—"}</div>
                        )}
                      </div>

                      {/* Status da Empresa */}
                      <div className="md:col-span-2">
                        <label className="text-sm font-semibold text-slate-700 block mb-1.5">Status da Empresa</label>
                        {isDadosEditMode ? (
                          <CompanyStatusSelector
                            value={getDadosDisplayValue("status") as CompanyStatus || "active"}
                            onChange={(status) => handleDadosFieldChange("status", status)}
                            showLabel={false}
                          />
                        ) : (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            company.status === "active" ? "bg-emerald-500 text-white"
                            : company.status === "inactive" ? "bg-slate-200 text-slate-600"
                            : "bg-amber-100 text-amber-700"
                          }`}>
                            {company.status === "active" && <CheckCircle className="h-3.5 w-3.5" />}
                            {company.status === "inactive" && <PauseCircle className="h-3.5 w-3.5" />}
                            {company.status === "pending" && <Clock className="h-3.5 w-3.5" />}
                            {getStatusLabel(company.status)}
                          </span>
                        )}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* CONTATO */}
                <AccordionItem value="contato" className="border border-slate-200 rounded-lg">
                  <AccordionTrigger className="px-3 py-2 bg-white hover:bg-slate-50 [&[data-state=open]]:bg-slate-50 rounded-t-lg text-xs">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-amber-600" />
                      <span className="font-semibold text-slate-900">Contato</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 py-3 border-t border-slate-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Email Principal */}
                      <div className="md:col-span-2">
                        <label className="text-sm font-semibold text-slate-700 block mb-1.5">Email Principal</label>
                        {isDadosEditMode ? (
                          <Input type="email" value={getDadosDisplayValue("email") as string} onChange={(e) => handleDadosFieldChange("email", e.target.value)} className="border-slate-300" placeholder="email@example.com" />
                        ) : (
                          <div className="font-medium text-slate-900">{getDadosDisplayValue("email") || "—"}</div>
                        )}
                      </div>

                      {/* Telefone Principal */}
                      <div>
                        <label className="text-sm font-semibold text-slate-700 block mb-1.5">Telefone Principal</label>
                        {isDadosEditMode ? (
                          <Input type="tel" value={getDadosDisplayValue("phone") as string || ""} onChange={(e) => handleDadosFieldChange("phone", e.target.value)} className="border-slate-300" placeholder="(00) 0000-0000" />
                        ) : (
                          <div className="font-medium text-slate-900">{getDadosDisplayValue("phone") || "—"}</div>
                        )}
                      </div>

                      {/* Telefone Secundário */}
                      <div>
                        <label className="text-sm font-semibold text-slate-700 block mb-1.5">Telefone Secundário</label>
                        {isDadosEditMode ? (
                          <Input type="tel" value={getDadosDisplayValue("phone_secondary") as string || ""} onChange={(e) => handleDadosFieldChange("phone_secondary", e.target.value)} className="border-slate-300" placeholder="(00) 0000-0000" />
                        ) : (
                          <div className="font-medium text-slate-900">{getDadosDisplayValue("phone_secondary") || "—"}</div>
                        )}
                      </div>

                      {/* WhatsApp */}
                      <div>
                        <label className="text-sm font-semibold text-slate-700 block mb-1.5">WhatsApp</label>
                        {isDadosEditMode ? (
                          <Input type="tel" value={getDadosDisplayValue("whatsapp") as string || ""} onChange={(e) => handleDadosFieldChange("whatsapp", e.target.value)} className="border-slate-300" placeholder="(00) 00000-0000" />
                        ) : (
                          <div className="font-medium text-slate-900">{getDadosDisplayValue("whatsapp") || "—"}</div>
                        )}
                      </div>

                      {/* Site */}
                      <div className="md:col-span-2">
                        <label className="text-sm font-semibold text-slate-700 block mb-1.5">Site</label>
                        {isDadosEditMode ? (
                          <Input type="url" value={getDadosDisplayValue("website") as string || ""} onChange={(e) => handleDadosFieldChange("website", e.target.value)} className="border-slate-300" placeholder="https://exemplo.com.br" />
                        ) : (
                          <div className="font-medium text-slate-900">{getDadosDisplayValue("website") || "—"}</div>
                        )}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* ENDEREÇO */}
                <AccordionItem value="endereco" className="border border-slate-200 rounded-lg">
                  <AccordionTrigger className="px-3 py-2 bg-white hover:bg-slate-50 [&[data-state=open]]:bg-slate-50 rounded-t-lg text-xs">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-green-600" />
                      <span className="font-semibold text-slate-900">Endereço</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 py-3 border-t border-slate-100">
                    {/* MAP — view: static embed | edit: interactive picker */}
                    {!isDadosEditMode ? (
                      (() => {
                        const parts = [
                          getDadosDisplayValue("street") || company.street,
                          getDadosDisplayValue("number") || company.number,
                          getDadosDisplayValue("neighborhood") || company.neighborhood,
                          getDadosDisplayValue("city") || company.city,
                          getDadosDisplayValue("state") || company.state,
                          "Brasil",
                        ].filter(Boolean)
                        const query = encodeURIComponent(
                          parts.length > 1 ? parts.join(", ") : company.location
                        )
                        return (
                          <div className="mb-4 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                            <iframe
                              title="Localização da empresa"
                              width="100%"
                              height="220"
                              loading="lazy"
                              src={`https://maps.google.com/maps?q=${query}&output=embed&z=15`}
                              className="block"
                              style={{ border: 0 }}
                            />
                          </div>
                        )
                      })()
                    ) : (
                      <div className="mb-4">
                        <label className="text-xs font-semibold text-slate-600 block mb-2 uppercase tracking-wide">
                          Localização no Mapa
                        </label>
                        <AddressMapPicker
                          address={{
                            street: getDadosDisplayValue("street") as string || company.street || "",
                            number: getDadosDisplayValue("number") as string || company.number || "",
                            district: getDadosDisplayValue("neighborhood") as string || company.neighborhood || "",
                            city: getDadosDisplayValue("city") as string || company.city || "",
                            state: getDadosDisplayValue("state") as string || company.state || "",
                            zipcode: getDadosDisplayValue("zip_code") as string || company.zip_code || "",
                          }}
                          onAddressChange={(addr) => {
                            if (addr.street !== undefined) handleDadosFieldChange("street", addr.street)
                            if (addr.number !== undefined) handleDadosFieldChange("number", addr.number)
                            if (addr.district !== undefined) handleDadosFieldChange("neighborhood", addr.district)
                            if (addr.city !== undefined) handleDadosFieldChange("city", addr.city)
                            if (addr.state !== undefined) handleDadosFieldChange("state", addr.state)
                            if (addr.zipcode !== undefined) handleDadosFieldChange("zip_code", addr.zipcode)
                          }}
                        />
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* CEP */}
                      <div>
                        <label className="text-sm font-semibold text-slate-700 block mb-1.5">CEP</label>
                        {isDadosEditMode ? (
                          <Input value={getDadosDisplayValue("zip_code") as string || ""} onChange={(e) => handleDadosFieldChange("zip_code", e.target.value)} className="border-slate-300 font-mono" placeholder="00000-000" />
                        ) : (
                          <code className="bg-slate-100 px-2 py-1 rounded text-xs font-mono font-bold text-slate-900">{company.zip_code || "—"}</code>
                        )}
                      </div>

                      {/* Rua */}
                      <div>
                        <label className="text-sm font-semibold text-slate-700 block mb-1.5">Rua</label>
                        {isDadosEditMode ? (
                          <Input value={getDadosDisplayValue("street") as string || ""} onChange={(e) => handleDadosFieldChange("street", e.target.value)} className="border-slate-300" placeholder="Nome da rua" />
                        ) : (
                          <div className="font-medium text-slate-900">{company.street || "—"}</div>
                        )}
                      </div>

                      {/* Número */}
                      <div>
                        <label className="text-sm font-semibold text-slate-700 block mb-1.5">Número</label>
                        {isDadosEditMode ? (
                          <Input value={getDadosDisplayValue("number") as string || ""} onChange={(e) => handleDadosFieldChange("number", e.target.value)} className="border-slate-300" placeholder="123" />
                        ) : (
                          <div className="font-medium text-slate-900">{company.number || "—"}</div>
                        )}
                      </div>

                      {/* Complemento */}
                      <div>
                        <label className="text-sm font-semibold text-slate-700 block mb-1.5">Complemento</label>
                        {isDadosEditMode ? (
                          <Input value={getDadosDisplayValue("complement") as string || ""} onChange={(e) => handleDadosFieldChange("complement", e.target.value)} className="border-slate-300" placeholder="Apto 123, Bloco A" />
                        ) : (
                          <div className="font-medium text-slate-900">{company.complement || "—"}</div>
                        )}
                      </div>

                      {/* Bairro */}
                      <div>
                        <label className="text-sm font-semibold text-slate-700 block mb-1.5">Bairro</label>
                        {isDadosEditMode ? (
                          <Input value={getDadosDisplayValue("neighborhood") as string || ""} onChange={(e) => handleDadosFieldChange("neighborhood", e.target.value)} className="border-slate-300" placeholder="Nome do bairro" />
                        ) : (
                          <div className="font-medium text-slate-900">{company.neighborhood || "—"}</div>
                        )}
                      </div>

                      {/* Cidade */}
                      <div>
                        <label className="text-sm font-semibold text-slate-700 block mb-1.5">Cidade</label>
                        {isDadosEditMode ? (
                          <Input value={getDadosDisplayValue("city") as string || ""} onChange={(e) => handleDadosFieldChange("city", e.target.value)} className="border-slate-300" placeholder="São Paulo" />
                        ) : (
                          <div className="font-medium text-slate-900">{company.city || "—"}</div>
                        )}
                      </div>

                      {/* Estado */}
                      <div>
                        <label className="text-sm font-semibold text-slate-700 block mb-1.5">Estado</label>
                        {isDadosEditMode ? (
                          <Input value={getDadosDisplayValue("state") as string || ""} onChange={(e) => handleDadosFieldChange("state", e.target.value.toUpperCase())} className="border-slate-300" placeholder="SP" maxLength={2} />
                        ) : (
                          <div className="font-medium text-slate-900">{company.state || "—"}</div>
                        )}
                      </div>

                      {/* País */}
                      <div>
                        <label className="text-sm font-semibold text-slate-700 block mb-1.5">País</label>
                        {isDadosEditMode ? (
                          <Input value={getDadosDisplayValue("country") as string || "Brasil"} onChange={(e) => handleDadosFieldChange("country", e.target.value)} className="border-slate-300" placeholder="Brasil" />
                        ) : (
                          <div className="font-medium text-slate-900">{company.country || "Brasil"}</div>
                        )}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* FINANCEIRO */}
                <AccordionItem value="financeiro" className="border border-slate-200 rounded-lg">
                  <AccordionTrigger className="px-3 py-2 bg-white hover:bg-slate-50 [&[data-state=open]]:bg-slate-50 rounded-t-lg text-xs">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-red-600" />
                      <span className="font-semibold text-slate-900">Financeiro</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 py-3 border-t border-slate-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Chave PIX */}
                      <div>
                        <label className="text-sm font-semibold text-slate-700 block mb-1.5">Chave PIX</label>
                        {isDadosEditMode ? (
                          <Input value={getDadosDisplayValue("pix_key") as string || ""} onChange={(e) => handleDadosFieldChange("pix_key", e.target.value)} className="border-slate-300" placeholder="Chave PIX" />
                        ) : (
                          <code className="bg-slate-100 px-2 py-1 rounded text-xs font-mono font-bold text-slate-900">{company.pix_key || "—"}</code>
                        )}
                      </div>

                      {/* Tipo de Chave PIX */}
                      <div>
                        <label className="text-sm font-semibold text-slate-700 block mb-1.5">Tipo de Chave PIX</label>
                        {isDadosEditMode ? (
                          <select value={getDadosDisplayValue("pix_type") as string || ""} onChange={(e) => handleDadosFieldChange("pix_type", e.target.value)} className="w-full border border-slate-300 rounded px-3 py-2 text-sm font-medium">
                            <option value="">Selecione</option>
                            <option value="cpf">CPF</option>
                            <option value="cnpj">CNPJ</option>
                            <option value="email">Email</option>
                            <option value="phone">Telefone</option>
                            <option value="random">Aleatória</option>
                          </select>
                        ) : (
                          <div className="font-medium text-slate-900">{company.pix_type || "—"}</div>
                        )}
                      </div>

                      {/* Banco */}
                      <div>
                        <label className="text-sm font-semibold text-slate-700 block mb-1.5">Banco</label>
                        {isDadosEditMode ? (
                          <Input value={getDadosDisplayValue("bank_name") as string || ""} onChange={(e) => handleDadosFieldChange("bank_name", e.target.value)} className="border-slate-300" placeholder="Nome do banco" />
                        ) : (
                          <div className="font-medium text-slate-900">{company.bank_name || "—"}</div>
                        )}
                      </div>

                      {/* Agência */}
                      <div>
                        <label className="text-sm font-semibold text-slate-700 block mb-1.5">Agência</label>
                        {isDadosEditMode ? (
                          <Input value={getDadosDisplayValue("bank_agency") as string || ""} onChange={(e) => handleDadosFieldChange("bank_agency", e.target.value)} className="border-slate-300" placeholder="0000" />
                        ) : (
                          <div className="font-medium text-slate-900">{company.bank_agency || "—"}</div>
                        )}
                      </div>

                      {/* Conta */}
                      <div>
                        <label className="text-sm font-semibold text-slate-700 block mb-1.5">Conta</label>
                        {isDadosEditMode ? (
                          <Input value={getDadosDisplayValue("bank_account") as string || ""} onChange={(e) => handleDadosFieldChange("bank_account", e.target.value)} className="border-slate-300" placeholder="000000-0" />
                        ) : (
                          <div className="font-medium text-slate-900">{company.bank_account || "—"}</div>
                        )}
                      </div>

                      {/* Tipo de Conta */}
                      <div>
                        <label className="text-sm font-semibold text-slate-700 block mb-1.5">Tipo de Conta</label>
                        {isDadosEditMode ? (
                          <select value={getDadosDisplayValue("bank_account_type") as string || ""} onChange={(e) => handleDadosFieldChange("bank_account_type", e.target.value)} className="w-full border border-slate-300 rounded px-3 py-2 text-sm font-medium">
                            <option value="">Selecione</option>
                            <option value="corrente">Corrente</option>
                            <option value="poupanca">Poupança</option>
                          </select>
                        ) : (
                          <div className="font-medium text-slate-900">{company.bank_account_type || "—"}</div>
                        )}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* INFORMAÇÕES ADICIONAIS */}
                <AccordionItem value="adicionais" className="border border-slate-200 rounded-lg">
                  <AccordionTrigger className="px-3 py-2 bg-white hover:bg-slate-50 [&[data-state=open]]:bg-slate-50 rounded-t-lg text-xs">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-purple-600" />
                      <span className="font-semibold text-slate-900">Informações Adicionais</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 py-3 border-t border-slate-100">
                    <div className="space-y-4">
                      {/* Observações Administrativas */}
                      <div>
                        <label className="text-sm font-semibold text-slate-700 block mb-1.5">Observações Administrativas</label>
                        {isDadosEditMode ? (
                          <textarea value={getDadosDisplayValue("admin_notes") as string || ""} onChange={(e) => handleDadosFieldChange("admin_notes", e.target.value)} className="w-full border border-slate-300 rounded px-3 py-2 text-sm font-medium min-h-20" placeholder="Notas visíveis para admin" />
                        ) : (
                          <div className="font-medium text-slate-900 whitespace-pre-wrap">{company.admin_notes || "—"}</div>
                        )}
                      </div>

                      {/* Notas Internas */}
                      <div>
                        <label className="text-sm font-semibold text-slate-700 block mb-1.5">Notas Internas (Visíveis apenas para admin)</label>
                        {isDadosEditMode ? (
                          <textarea value={getDadosDisplayValue("internal_notes") as string || ""} onChange={(e) => handleDadosFieldChange("internal_notes", e.target.value)} className="w-full border border-slate-300 rounded px-3 py-2 text-sm font-medium min-h-20" placeholder="Notas internas do sistema" />
                        ) : (
                          <div className="font-medium text-slate-900 whitespace-pre-wrap">{company.internal_notes || "—"}</div>
                        )}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </TabsContent>

            {/* Usuários Tab */}
            <TabsContent value="usuarios" className="flex-1 overflow-y-auto p-0">
              <CompanyUsersTab companyId={company.id} companyName={company.name} />
            </TabsContent>

            {/* Redes Sociais Tab */}
            <TabsContent value="redes-sociais" className="flex-1 overflow-y-auto px-[50px] py-[50px]">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-4">Redes Sociais da Empresa</h3>
                  {isDadosEditMode ? (
                    <CompanySocialLinksManager
                      socialLinks={getDadosDisplayValue("social_links") as SocialLink[] || []}
                      onChange={(links) => handleDadosFieldChange("social_links", links)}
                      isEditMode={true}
                    />
                  ) : (
                    <div className="space-y-2">
                      <div className="flex justify-end mb-4">
                        <Button
                          onClick={handleDadosEditMode}
                          className="gap-2"
                          size="sm"
                        >
                          <Edit2 className="h-4 w-4" />
                          Editar
                        </Button>
                      </div>
                      {(company.social_links && company.social_links.length > 0) ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {company.social_links.map((link) => (
                            <div key={link.id} className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
                              <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex-1 text-blue-600 hover:underline text-sm truncate font-medium">
                                {link.platform}
                              </a>
                              <Badge variant="outline" className="text-xs flex-shrink-0">
                                Ativo
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <Card className="border border-dashed border-slate-300 bg-slate-50/50">
                          <div className="p-8 text-center">
                            <Share2 className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-500 font-medium mb-2">Nenhuma rede social adicionada</p>
                            <p className="text-xs text-slate-400 mb-4">Adicione redes sociais para aumentar a visibilidade da sua empresa</p>
                            <Button
                              onClick={handleDadosEditMode}
                              size="sm"
                              className="gap-2"
                            >
                              <Plus className="h-4 w-4" />
                              Adicionar Redes Sociais
                            </Button>
                          </div>
                        </Card>
                      )}
                    </div>
                  )}
                </div>

                {isDadosEditMode && (
                  <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                    <Button
                      variant="outline"
                      onClick={() => setShowCancelConfirm(true)}
                      disabled={isSaving}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleDadosSaveClick}
                      disabled={isSaving}
                      className="gap-2"
                    >
                      {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                      Salvar
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Plano Tab */}
            <TabsContent value="plano" className="flex-1 overflow-y-auto px-[50px] py-[50px]">
              <Accordion type="multiple" defaultValue={["admin", "credito", "account", "pagamento", "carteira", "nf"]} className="space-y-3">
                {/* ACCORDION 1: AÇÕES ADMINISTRATIVAS */}
                <AccordionItem value="admin" className="border border-slate-200 rounded-lg">
                  <AccordionTrigger className="px-3 py-2 bg-white hover:bg-slate-50 [&[data-state=open]]:bg-slate-50 rounded-t-lg text-xs">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-amber-600" />
                      <span className="font-semibold text-slate-900">Ações Administrativas</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 py-3 border-t border-slate-100">
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={() => handleAdminAction("edit-plan")}
                      >
                        Editar Plano
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={() => handleAdminAction("change-account")}
                      >
                        Alterar Tipo Conta
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={() => handleAdminAction("force-charge")}
                      >
                        Forçar Cobrança
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={() => handleAdminAction("generate-boleto")}
                      >
                        Gerar Boleto
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* ACCORDION 2: PLANO DE CRÉDITO */}
                <AccordionItem value="credito" className="border border-slate-200 rounded-lg">
                  <AccordionTrigger className="px-3 py-2 bg-white hover:bg-slate-50 [&[data-state=open]]:bg-slate-50 rounded-t-lg text-xs">
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4 text-blue-600" />
                      <span className="font-semibold text-slate-900">Plano de Crédito</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 py-3 border-t border-slate-100">
                    {(() => {
                      const planMap: Record<string, { name: string; credits: number }> = {
                        starter: { name: "Starter", credits: 100 },
                        growth:  { name: "Growth",  credits: 500 },
                        enterprise: { name: "Enterprise", credits: 1000 },
                        // backwards compat
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
                  </AccordionContent>
                </AccordionItem>

                {/* ACCORDION 3: TIPO DE CONTA */}
                <AccordionItem value="account" className="border border-slate-200 rounded-lg">
                  <AccordionTrigger className="px-3 py-2 bg-white hover:bg-slate-50 [&[data-state=open]]:bg-slate-50 rounded-t-lg text-xs">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-purple-600" />
                      <span className="font-semibold text-slate-900">Tipo de Conta</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 py-3 border-t border-slate-100">
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
                  </AccordionContent>
                </AccordionItem>

                {/* ACCORDION 3: MÉTODOS DE PAGAMENTO */}
                <AccordionItem value="pagamento" className="border border-slate-200 rounded-lg">
                  <AccordionTrigger className="px-3 py-2 bg-white hover:bg-slate-50 [&[data-state=open]]:bg-slate-50 rounded-t-lg text-xs">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-emerald-600" />
                      <span className="font-semibold text-slate-900">Métodos de Pagamento</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 py-3 border-t border-slate-100 space-y-4">
                    {/* Payment Methods List */}
                    <div className="space-y-3">
                      {/* Pix */}
                      <Card
                        className={`p-3 cursor-pointer transition-all border-2 ${
                          defaultPaymentMethod === "pix"
                            ? "border-blue-600 bg-blue-50 dark:bg-blue-950/30"
                            : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                        }`}
                        onClick={() => handleSetDefaultMethod("pix")}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                              <Wallet className="h-4 w-4 text-purple-600" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold">Pix</p>
                              <p className="text-xs text-muted-foreground">Transferência instantânea</p>
                            </div>
                          </div>
                          {defaultPaymentMethod === "pix" && (
                            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                              Padrão
                            </Badge>
                          )}
                        </div>
                      </Card>

                      {/* Boleto */}
                      <Card
                        className={`p-3 cursor-pointer transition-all border-2 ${
                          defaultPaymentMethod === "boleto"
                            ? "border-blue-600 bg-blue-50 dark:bg-blue-950/30"
                            : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                        }`}
                        onClick={() => handleSetDefaultMethod("boleto")}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                              <Download className="h-4 w-4 text-orange-600" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold">Boleto</p>
                              <p className="text-xs text-muted-foreground">Até 3 dias úteis</p>
                            </div>
                          </div>
                          {defaultPaymentMethod === "boleto" && (
                            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                              Padrão
                            </Badge>
                          )}
                        </div>
                      </Card>

                      {/* Allkoins */}
                      <Card
                        className={`p-3 cursor-pointer transition-all border-2 ${
                          defaultPaymentMethod === "allkoins"
                            ? "border-blue-600 bg-blue-50 dark:bg-blue-950/30"
                            : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                        }`}
                        onClick={() => handleSetDefaultMethod("allkoins")}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                              <Gift className="h-4 w-4 text-yellow-600" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold">Allkoins</p>
                              <p className="text-xs text-muted-foreground">Saldo em créditos</p>
                            </div>
                          </div>
                          {defaultPaymentMethod === "allkoins" && (
                            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                              Padrão
                            </Badge>
                          )}
                        </div>
                      </Card>
                    </div>

                    {/* Credit Cards Section */}
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-xs font-semibold text-slate-600">Cartões de Crédito/Débito</label>
                        <Button
                          onClick={() => setShowAddCardModal(true)}
                          size="sm"
                          className="h-8 gap-1 bg-blue-600 hover:bg-blue-700"
                        >
                          <Plus className="h-4 w-4" />
                          Novo Cartão
                        </Button>
                      </div>
                      {creditCards.length === 0 ? (
                        <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                          <CreditCard className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                          <p className="text-sm text-slate-600">Nenhum cartão cadastrado</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {creditCards.map(card => (
                            <div key={card.id} className={`relative h-56 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group ${defaultPaymentMethod === `card-${card.id}` ? "ring-2 ring-blue-500" : ""}`} style={{
                              background: defaultPaymentMethod === `card-${card.id}` ? "linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)" : "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)"
                            }}>
                              <div className="absolute inset-0 opacity-10">
                                <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full blur-3xl" />
                              </div>
                              
                              <div className="relative h-full p-6 flex flex-col justify-between text-white">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <div className="text-xs font-semibold opacity-75 uppercase tracking-widest">BANCO</div>
                                    <div className="text-lg font-bold">{card.brand}</div>
                                  </div>
                                  {defaultPaymentMethod === `card-${card.id}` && (
                                    <div className="bg-white bg-opacity-20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold">
                                      Padrão
                                    </div>
                                  )}
                                </div>

                                <div>
                                  <div className="text-xs font-semibold opacity-75 uppercase tracking-widest mb-2">Número</div>
                                  <div className="text-2xl font-mono font-bold tracking-widest">•••• •••• •••• {card.lastFour}</div>
                                </div>

                                <div className="flex justify-between items-end">
                                  <div>
                                    <div className="text-xs font-semibold opacity-75 uppercase tracking-widest">Titular</div>
                                    <div className="text-sm font-bold">{card.holderName}</div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-xs font-semibold opacity-75 uppercase tracking-widest">Validade</div>
                                    <div className="text-sm font-bold">{card.expiry}</div>
                                  </div>
                                </div>
                              </div>

                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-300 flex items-end justify-center pb-4 opacity-0 group-hover:opacity-100">
                                <div className="flex gap-2">
                                  {defaultPaymentMethod !== `card-${card.id}` && (
                                    <Button onClick={() => handleSetDefaultCard(card.id)} size="sm" className="bg-white text-slate-900 hover:bg-blue-100 font-semibold h-9 px-4">
                                      Definir Padrão
                                    </Button>
                                  )}
                                  <Button onClick={() => handleRemoveCard(card.id)} size="sm" variant="outline" className="bg-white text-slate-900 hover:bg-red-100 h-9 px-3">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* ACCORDION 4: CARTEIRA DA EMPRESA */}
                <AccordionItem value="carteira" className="border border-slate-200 rounded-lg">
                  <AccordionTrigger className="px-3 py-2 bg-white hover:bg-slate-50 [&[data-state=open]]:bg-slate-50 rounded-t-lg text-xs">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-cyan-600" />
                      <span className="font-semibold text-slate-900">Carteira da Empresa</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 py-3 border-t border-slate-100 space-y-4">
                    <div className="bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 p-6 rounded-xl border border-blue-300 shadow-lg text-white">
                      <label className="text-xs font-semibold uppercase tracking-wide block mb-2 opacity-90">Saldo Disponível</label>
                      <div className="text-3xl font-bold mb-1">R$ {companyWalletBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                      <p className="text-xs opacity-75">Pronto para usar</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        onClick={() => handleCompanyWalletAction("add")}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Adicionar Saldo
                      </Button>
                      <Button
                        onClick={() => handleCompanyWalletAction("remove")}
                        className="bg-red-600 hover:bg-red-700 text-white font-semibold gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Reduzir Saldo
                      </Button>
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-slate-700 block mb-1.5">Últimas Movimentações</label>
                      <div className="space-y-2 bg-slate-50 p-3 rounded border border-slate-200 max-h-48 overflow-y-auto">
                        {companyWalletStatements.slice(0, 5).map(stmt => (
                          <div key={stmt.id} className="flex justify-between items-center text-xs border-b border-slate-200 pb-2 last:border-0">
                            <div>
                              <div className="font-semibold text-slate-900">{stmt.reason}</div>
                              <div className="text-slate-500 text-xs">{new Date(stmt.date).toLocaleString('pt-BR')}</div>
                            </div>
                            <div className="text-right">
                              <div className={`font-bold ${stmt.type === "credit" ? "text-emerald-600" : "text-red-600"}`}>
                                {stmt.type === "credit" ? "+" : "-"} R$ {stmt.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </div>
                              <div className="text-slate-500 text-xs">Saldo: R$ {stmt.balanceAfter.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                            </div>
                          </div>
                        ))}
                        {companyWalletStatements.length === 0 && (
                          <div className="text-center py-4 text-slate-500 text-xs">Nenhuma movimentação</div>
                        )}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* ACCORDION 5: NOTAS FISCAIS E COMPROVANTES */}
                <AccordionItem value="nf" className="border border-slate-200 rounded-lg">
                  <AccordionTrigger className="px-3 py-2 bg-white hover:bg-slate-50 [&[data-state=open]]:bg-slate-50 rounded-t-lg text-xs">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-indigo-600" />
                      <span className="font-semibold text-slate-900">Notas Fiscais e Comprovantes</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 py-3 border-t border-slate-100">
                    <div className="space-y-2">
                      {paymentHistory.map((payment) => {
                        const methodLabel = {
                          pix: "Pix",
                          boleto: "Boleto",
                          cartao: "Cartão",
                          allkoins: "Allkoins",
                        }[payment.method]

                        const methodColor = {
                          pix: "bg-purple-50 dark:bg-purple-950/20 border-purple-200",
                          boleto: "bg-orange-50 dark:bg-orange-950/20 border-orange-200",
                          cartao: "bg-blue-50 dark:bg-blue-950/20 border-blue-200",
                          allkoins: "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200",
                        }[payment.method]

                        const statusColor = {
                          Pago: "bg-green-100 text-green-800",
                          Pendente: "bg-yellow-100 text-yellow-800",
                          Cancelado: "bg-red-100 text-red-800",
                        }[payment.status]

                        return (
                          <Card
                            key={payment.id}
                            className={`p-3 border-2 ${methodColor}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3">
                                  {payment.type === "nf" ? (
                                    <FileText className="h-4 w-4 text-indigo-600" />
                                  ) : (
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                  )}
                                  <div>
                                    <p className="text-sm font-semibold">
                                      {payment.type === "nf" ? "Nota Fiscal" : "Comprovante"} - {methodLabel}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {new Date(payment.date).toLocaleDateString("pt-BR")} • R$ {payment.amount.toLocaleString("pt-BR")}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className={statusColor}>
                                  {payment.status}
                                </Badge>
                                {payment.type === "nf" && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 w-7 p-0"
                                      title="Visualizar"
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 w-7 p-0"
                                      title="Baixar"
                                    >
                                      <Download className="h-3.5 w-3.5" />
                                    </Button>
                                  </>
                                )}
                                {payment.type === "comprovante" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 w-7 p-0"
                                    title="Comprovante"
                                  >
                                    <CheckCircle className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            </div>
                            {payment.type === "comprovante" && (
                              <p className="text-xs text-muted-foreground mt-2 italic">
                                Pagamentos com Allkoins não geram nota fiscal.
                              </p>
                            )}
                          </Card>
                        )
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Company Wallet Modal */}
              {showCompanyWalletModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                  <Card className="w-full max-w-md">
                    <div className="p-6">
                      <h3 className="text-lg font-bold mb-4">
                        {companyWalletType === "add" ? "Adicionar Saldo" : "Reduzir Saldo"}
                      </h3>
                      <div className="space-y-4 mb-4">
                        <div>
                          <label className="text-xs font-semibold text-slate-600 block mb-2 uppercase">Valor (R$)</label>
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={companyWalletAmount}
                            onChange={(e) => setCompanyWalletAmount(e.target.value)}
                            className="border-slate-300"
                            step="0.01"
                            min="0"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-600 block mb-2 uppercase">Motivo (obrigatório)</label>
                          <Input
                            placeholder="Descreva o motivo da operação"
                            value={companyWalletReason}
                            onChange={(e) => setCompanyWalletReason(e.target.value)}
                            className="border-slate-300"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setShowCompanyWalletModal(false)}
                          className="flex-1"
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={handleCompanyWalletSubmit}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          Próximo
                        </Button>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {/* Company Wallet Confirmation Modal */}
              {showWalletConfirmDialog && showCompanyWalletModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                  <Card className="w-full max-w-md">
                    <div className="p-6">
                      <h3 className="text-lg font-bold mb-4">Confirmar Movimentação</h3>
                      <div className="bg-slate-50 p-4 rounded-lg space-y-2 text-sm mb-4">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Tipo:</span>
                          <span className="font-semibold">
                            {companyWalletType === "add" ? "Crédito" : "Débito"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Valor:</span>
                          <span className={`font-semibold ${companyWalletType === "add" ? "text-emerald-600" : "text-red-600"}`}>
                            {companyWalletType === "add" ? "+" : "-"} R$ {parseFloat(companyWalletAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Motivo:</span>
                          <span className="font-semibold">{companyWalletReason}</span>
                        </div>
                        <div className="border-t border-slate-200 pt-2 mt-2 flex justify-between">
                          <span className="font-semibold">Saldo após:</span>
                          <span className="text-blue-600 font-bold">
                            R$ {(companyWalletType === "add" 
                              ? companyWalletBalance + parseFloat(companyWalletAmount)
                              : companyWalletBalance - parseFloat(companyWalletAmount)
                            ).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setShowWalletConfirmDialog(false)}
                          className="flex-1"
                        >
                          Voltar
                        </Button>
                        <Button
                          onClick={handleCompanyWalletConfirm}
                          disabled={isApplyingCompanyWallet}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          {isApplyingCompanyWallet ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Processando...
                            </>
                          ) : (
                            "Confirmar"
                          )}
                        </Button>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {/* Admin Action Modals */}
              {adminActionModal === "edit-plan" && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                  <Card className="w-full max-w-md">
                    <div className="p-6">
                      <h3 className="text-lg font-bold mb-4">Editar Plano de Crédito</h3>
                      <div className="space-y-3 mb-4">
                        <div>
                          <label className="text-xs font-semibold mb-1 block">Novo Plano</label>
                          <select
                            value={adminFormData.creditPlan}
                            onChange={(e) =>
                              setAdminFormData({ ...adminFormData, creditPlan: e.target.value })
                            }
                            className="w-full px-3 py-2 border rounded text-sm"
                          >
                            <option value="starter">Starter — 100 créditos</option>
                            <option value="growth">Growth — 500 créditos</option>
                            <option value="enterprise">Enterprise — 1.000 créditos</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setAdminActionModal(null)}
                          className="flex-1"
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={handleConfirmAdminAction}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          Confirmar
                        </Button>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {adminActionModal === "change-account" && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                  <Card className="w-full max-w-md">
                    <div className="p-6">
                      <h3 className="text-lg font-bold mb-4">Alterar Tipo de Conta</h3>
                      <div className="space-y-2 mb-4">
                        {["Company Dependente", "Company Independente", "Agency", "Partner"].map(
                          (type) => (
                            <label key={type} className="flex items-center gap-3 p-2 border rounded cursor-pointer hover:bg-gray-50">
                              <input
                                type="radio"
                                name="account-type"
                                checked={adminFormData.accountType === type}
                                onChange={() =>
                                  setAdminFormData({ ...adminFormData, accountType: type })
                                }
                                className="cursor-pointer"
                              />
                              <span className="text-sm font-medium">{type}</span>
                            </label>
                          )
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setAdminActionModal(null)}
                          className="flex-1"
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={handleConfirmAdminAction}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          Confirmar
                        </Button>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {adminActionModal === "force-charge" && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                  <Card className="w-full max-w-md">
                    <div className="p-6">
                      <h3 className="text-lg font-bold mb-4">Forçar Cobrança</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Tem certeza que deseja forçar a cobrança agora? Esta ação é irreversível.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setAdminActionModal(null)}
                          className="flex-1"
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={handleConfirmAdminAction}
                          className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                        >
                          Confirmar Cobrança
                        </Button>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {adminActionModal === "generate-boleto" && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                  <Card className="w-full max-w-md">
                    <div className="p-6">
                      <h3 className="text-lg font-bold mb-4">Gerar Boleto</h3>
                      <div className="space-y-3 mb-4">
                        <div>
                          <label className="text-xs font-semibold mb-1 block">Data de Vencimento</label>
                          <Input
                            type="date"
                            value={adminFormData.dueDate}
                            onChange={(e) =>
                              setAdminFormData({ ...adminFormData, dueDate: e.target.value })
                            }
                            className="text-sm"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setAdminActionModal(null)}
                          className="flex-1"
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={handleGenerateBoleto}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          Gerar Boleto
                        </Button>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {/* Add Card Modal */}
              {showAddCardModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                  <Card className="w-full max-w-md">
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold">Adicionar Cartão</h3>
                        <button
                          onClick={() => setShowAddCardModal(false)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-semibold text-gray-600 block mb-1">Número do Cartão</label>
                          <Input
                            value={newCardData.number}
                            onChange={(e) => setNewCardData({ ...newCardData, number: e.target.value.slice(0, 16) })}
                            placeholder="1234 5678 9012 3456"
                            className="text-sm h-8"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs font-semibold text-gray-600 block mb-1">Validade</label>
                            <Input
                              value={newCardData.expiry}
                              onChange={(e) => setNewCardData({ ...newCardData, expiry: e.target.value.slice(0, 5) })}
                              placeholder="MM/YY"
                              className="text-sm h-8"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-600 block mb-1">CVV</label>
                            <Input
                              value={newCardData.cvv}
                              onChange={(e) => setNewCardData({ ...newCardData, cvv: e.target.value.slice(0, 4) })}
                              placeholder="123"
                              className="text-sm h-8"
                              type="password"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-gray-600 block mb-1">Nome do Titular</label>
                          <Input
                            value={newCardData.holderName}
                            onChange={(e) => setNewCardData({ ...newCardData, holderName: e.target.value })}
                            placeholder="João da Silva"
                            className="text-sm h-8"
                          />
                        </div>

                        <div className="flex gap-2 pt-3 border-t">
                          <Button
                            variant="outline"
                            onClick={() => setShowAddCardModal(false)}
                            className="flex-1 text-sm h-8"
                          >
                            Cancelar
                          </Button>
                          <Button
                            onClick={handleAddCard}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm h-8"
                          >
                            Adicionar
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              )}
            </TabsContent>

            {/* Termos Tab */}
            <TabsContent value="termos" className="flex-1 overflow-y-auto px-[50px] py-[50px]">
              <TermsManagementTab company={company} />
            </TabsContent>

            {/* Projetos Tab */}
            <TabsContent value="projetos" className="flex-1 overflow-y-auto px-[50px] py-[50px]">
              <ProjectsManagementTab company={company} />
            </TabsContent>

            {/* Tarefas Tab */}
            <TabsContent value="tarefas" className="flex-1 overflow-y-auto px-[50px] py-[50px]">
              <CompanyTasksTab company={company} />
            </TabsContent>

            {/* Log Tab */}
            <TabsContent value="log" className="flex-1 overflow-y-auto px-[50px] py-[50px]">
              <CompanyLogsTab company={company} />
            </TabsContent>
            </Tabs>
            </div>
          </div>
      </SheetContent>
    </Sheet>

    {/* Partner Migration Modal - Step 1: Confirm Migration */}
    {showMigrateModal && migrationStep === "confirm" && (
      <div className="z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm fixed inset-0">
        <div className="bg-white rounded-3xl max-w-md w-full mx-4 shadow-2xl p-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center shadow-lg">
              <MessageSquare className="h-10 w-10 text-blue-600" />
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Migrar para Partner</h2>
            <p className="text-gray-600 leading-relaxed text-base">
              Deseja realmente migrar <strong className="text-gray-900">{company?.name}</strong> para o tipo de conta <strong className="text-gray-900">Partner</strong>?
            </p>
          </div>
          <div className="bg-blue-50 border border-blue-200 p-5 rounded-xl">
            <p className="text-sm text-blue-900 leading-relaxed font-medium">
              Esta ação irá desbloquear funcionalidades exclusivas para parceiros da plataforma.
            </p>
          </div>
          <div className="flex gap-3 pt-4">
            <Button
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold h-12 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg"
              onClick={handleCloseMigrateModal}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold h-12 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg"
              onClick={handleConfirmMigration}
            >
              Sim, migrar!
            </Button>
          </div>
        </div>
      </div>
    )}

    {/* Partner Migration Modal - Step 2: Partner Leader Invitation */}
    {showMigrateModal && migrationStep === "leader" && (
      <div className="z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm fixed inset-0">
        <div className="bg-white rounded-3xl max-w-md w-full mx-4 shadow-2xl overflow-hidden">
          <div className="p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Star className="h-6 w-6 text-blue-600 fill-blue-600" />
                <h2 className="text-xl font-bold text-blue-600">Convidar para Partner Leader</h2>
              </div>
              <button
                onClick={handleCloseMigrateModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Main Question */}
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg">
              <p className="text-sm text-blue-900 leading-relaxed">
                Deseja também convidar <strong>{company?.name}</strong> para fazer parte do <strong>Programa Partner Leaders</strong>?
              </p>
            </div>

            {/* Benefits */}
            <div className="border-l-4 border-blue-600 pl-4 space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Gift className="h-5 w-5 text-blue-600" />
                Benefícios como Partner Leader:
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-gray-700">
                    Receber <strong className="text-blue-600">comissão</strong> por cada venda de uma <strong>Agência liderada</strong>
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-gray-700">
                    Fazer parte do <strong className="text-blue-600">time de elite</strong> da plataforma
                  </p>
                </div>
              </div>
            </div>

            {/* Email Notification */}
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex items-start gap-3">
              <Mail className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
              <p className="text-sm text-blue-900">
                A agência receberá um <strong>convite por e-mail</strong> e <strong>notificação no sistema</strong>
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-4">
              <Button
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold h-12 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg text-base"
                onClick={handleInviteLeader}
              >
                <Check className="h-5 w-5 mr-2" />
                Sim, convidar!
              </Button>
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold h-12 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg text-base"
                onClick={handleMigrateWithoutInvite}
              >
                <X className="h-5 w-5 mr-2" />
                Não, apenas migrar
              </Button>
              <Button
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold h-12 rounded-xl border-0 transition-all duration-200 shadow-md hover:shadow-lg text-base"
                onClick={handleCloseMigrateModal}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Save confirmation dialog */}
    <ConfirmationDialog
      open={showSaveConfirm}
      onClose={() => setShowSaveConfirm(false)}
      onConfirm={performDadosSave}
      title="Salvar alterações?"
      message={<>Tem certeza que deseja salvar as alterações nos dados de <strong className="font-semibold text-slate-700">{company.name}</strong>? Esta ação irá atualizar as informações da empresa.</>}
      confirmText="Sim, salvar"
      cancelText="Voltar à edição"
      destructive={false}
    />

    {/* Cancel confirmation dialog */}
    <ConfirmationDialog
      open={showCancelConfirm}
      onClose={() => setShowCancelConfirm(false)}
      onConfirm={handleDadosCancelEdit}
      title="Descartar alterações?"
      message={<>Tem certeza que deseja cancelar? Todas as alterações nos dados de <strong className="font-semibold text-slate-700">{company.name}</strong> serão descartadas.</>}
      confirmText="Sim, descartar"
      cancelText="Voltar à edição"
      destructive={true}
    />
    </>
  )
}
