// @ts-nocheck
import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import {
  FolderKanban, Mail, Calendar, DollarSign, User, AlertCircle, Check, Camera, ZoomIn, Trash2, Crosshair,
  UserPlus, Search, Building2, ShoppingBag, Package, X as XIcon,
  Save, Eye, ArrowLeft, CreditCard, Percent, TrendingUp, ShoppingCart, Plus,
} from "lucide-react"
import { useCompanyData } from "@/lib/mock-companies"
import type { MockClientItem, MockCompanyItem } from "@/lib/mock-companies"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { CompanyCreateSlidePanel } from "@/components/company-create-slide-panel"
import { useProjects } from "@/hooks/useProjects"
import { cn } from "@/lib/utils"
import { apiClient } from "@/lib/api-client"
import { useSidebar } from "@/contexts/sidebar-context"
import { ModalBrandHeader } from "@/components/ui/modal-brand-header"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
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

import { ProductCatalogView, type CatalogSelectedProduct } from "@/components/product-catalog-view"
import { CheckoutFlow } from "@/components/checkout-flow"
import type { CheckoutData } from "@/components/checkout-flow"

// ── Project status types & config ─────────────────────────────────────────────
type ProjectStatus =
  | "draft"
  | "awaiting-payment"
  | "planning"
  | "in-progress"
  | "paused"
  | "completed"
  | "canceled"

const PROJECT_STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string; dot: string; btn: string; btnSelected: string }> = {
  "draft":           { label: "Rascunho",           dot: "bg-slate-400",   color: "bg-slate-100 text-slate-700",    btn: "bg-slate-100 text-slate-700 hover:bg-slate-200",   btnSelected: "bg-slate-500 text-white shadow-md scale-105" },
  "awaiting-payment":{ label: "Ag. Pagamento",      dot: "bg-cyan-500",    color: "bg-cyan-100 text-cyan-800",      btn: "bg-cyan-50 text-cyan-700 hover:bg-cyan-100",        btnSelected: "bg-cyan-500 text-white shadow-md scale-105" },
  "planning":        { label: "Planejamento",        dot: "bg-orange-500",  color: "bg-orange-100 text-orange-800",  btn: "bg-orange-50 text-orange-700 hover:bg-orange-100",  btnSelected: "bg-orange-500 text-white shadow-md scale-105" },
  "in-progress":     { label: "Em Andamento",        dot: "bg-blue-500",    color: "bg-blue-100 text-blue-800",      btn: "bg-blue-50 text-blue-700 hover:bg-blue-100",         btnSelected: "bg-blue-500 text-white shadow-md scale-105" },
  "paused":          { label: "Pausado",             dot: "bg-amber-500",   color: "bg-amber-100 text-amber-800",    btn: "bg-amber-50 text-amber-700 hover:bg-amber-100",      btnSelected: "bg-amber-500 text-white shadow-md scale-105" },
  "completed":       { label: "Concluído",           dot: "bg-emerald-500", color: "bg-emerald-100 text-emerald-800",btn: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",btnSelected: "bg-emerald-500 text-white shadow-md scale-105" },
  "canceled":        { label: "Cancelado",           dot: "bg-red-500",     color: "bg-red-100 text-red-800",        btn: "bg-red-50 text-red-700 hover:bg-red-100",            btnSelected: "bg-red-500 text-white shadow-md scale-105" },
}

const STATUS_OPTIONS = Object.entries(PROJECT_STATUS_CONFIG) as [ProjectStatus, typeof PROJECT_STATUS_CONFIG[ProjectStatus]][]

// ── Project types ──────────────────────────────────────────────────────────────
const PROJECT_TYPES = [
  "Marketing Digital",
  "Desenvolvimento Web",
  "Desenvolvimento Mobile",
  "Design",
  "Consultoria",
  "E-commerce",
  "Identidade Visual",
  "SEO / Tráfego",
  "Produção de Conteúdo",
  "Outro",
]

// ── Props ──────────────────────────────────────────────────────────────────────
interface ProjectCreateNewPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (project: any) => void
  /** Optional: pre-fill all fields (for Clone mode) */
  initialData?: Partial<{
    nome: string
    tipo: string
    agencia: string
    cliente: string
    clienteCnpj: string
    consultor: string
    emailConsultor: string
    dataInicio: string
    prazo: string
    orcamento: string
    permitePortfolio: boolean
    sincronizadoBitrix: boolean
    descricao: string
    status: ProjectStatus
  }>
  cloneMode?: boolean
  /** When set, empresa field is shown as read-only with this name (company-modal mode) */
  companyName?: string
  /** When set, empresa field is shown as read-only and maps to this id */
  companyId?: number
  /** When true, empresa field becomes a dropdown (admin-projetos mode) */
  allowCompanySelect?: boolean
  /** Resume a draft: pre-load these products into the catalog step */
  draftProducts?: CatalogSelectedProduct[]
  draftProductQuantities?: Record<string, number>
  draftCommissions?: Record<string, number>
  /** The backend project ID of the draft being resumed */
  draftProjectId?: string | number
  /** If true, skip straight to checkout step */
  resumeToCheckout?: boolean
}

interface FormData {
  nome: string
  tipo: string
  agencia: string
  cliente: string
  clienteCnpj: string
  consultor: string
  emailConsultor: string
  dataInicio: string
  prazo: string
  orcamento: string
  permitePortfolio: boolean
  sincronizadoBitrix: boolean
  descricao: string
  status: ProjectStatus
}

interface FormErrors {
  [key: string]: string
}

const EMPTY_FORM: FormData = {
  nome: "",
  tipo: "",
  agencia: "",
  cliente: "",
  clienteCnpj: "",
  consultor: "",
  emailConsultor: "",
  dataInicio: "",
  prazo: "",
  orcamento: "",
  permitePortfolio: false,
  sincronizadoBitrix: false,
  descricao: "",
  status: "draft",
}

// ── Component ──────────────────────────────────────────────────────────────────
export function ProjectCreateNewPanel({
  open, onOpenChange, onCreate, initialData, cloneMode = false,
  companyName, companyId: companyIdProp, allowCompanySelect = false,
  draftProducts, draftProductQuantities, draftCommissions,
  draftProjectId, resumeToCheckout,
}: ProjectCreateNewPanelProps) {
  const { toast } = useToast()
  const { sidebarWidth } = useSidebar()
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const ALL_ACCORDIONS = ["dados", "responsavel", "datas", "orcamento", "config"]
  const [openAccordions, setOpenAccordions] = useState<string[]>(["dados"])
  const [isClosing, setIsClosing] = useState(false)

  // Company-scoping state
  const [resolvedCompanyId, setResolvedCompanyId] = useState<number | null>(companyIdProp ?? null)
  const [resolvedCompanyName, setResolvedCompanyName] = useState<string>(companyName ?? "")

  // New-client inline form state
  const [showNewClientForm, setShowNewClientForm] = useState(false)
  const [newClientName, setNewClientName] = useState("")
  const [newClientEmail, setNewClientEmail] = useState("")
  const [localClients, setLocalClients] = useState<MockClientItem[]>([])

  // Custom project types added inline
  const [localProjectTypes, setLocalProjectTypes] = useState<string[]>([])
  const [showNewTypeForm, setShowNewTypeForm] = useState(false)
  const [newTypeName, setNewTypeName] = useState("")

  // Company creation
  const [showCreateCompany, setShowCreateCompany] = useState(false)
  const [localCompanies, setLocalCompanies] = useState<MockCompanyItem[]>([])

  // Project name uniqueness
  const { projects: existingProjects } = useProjects()
  const existingProjectNames = existingProjects.map(p => p.name.toLowerCase())
  const [warnings, setWarnings] = useState<Record<string, string>>({})

  // Company data from API
  const { companies: mockCompaniesList, clientsByCompany: mockClientsByCompany, usersByCompany: mockUsersByCompany } = useCompanyData()

  // Products catalog + cart state
  const [showProductsStep, setShowProductsStep] = useState(false)
  const [showReview, setShowReview] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState<CatalogSelectedProduct[]>([])
  const [productQuantities, setProductQuantities] = useState<Record<string, number>>({})
  const [productCommissions, setProductCommissions] = useState<Record<string, number>>({})
  const [activeReviewTab, setActiveReviewTab] = useState<"resumo" | "comissoes">("resumo")
  const [showNextStepModal, setShowNextStepModal] = useState(false)

  // Avatar / crop states
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
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

  const buildFormFromInitial = (): FormData => ({
    ...EMPTY_FORM,
    ...(initialData ?? {}),
  })

  const [formData, setFormData] = useState<FormData>(buildFormFromInitial)

  const handleClose = () => {
    if (isClosing) return
    setIsClosing(true)
    setTimeout(() => {
      onOpenChange(false)
    }, 420)
  }

  // Reset closing flag once the parent confirms close
  useEffect(() => {
    if (!open) setIsClosing(false)
  }, [open])

  // Sync when panel opens / initialData changes
  useEffect(() => {
    if (open) {
      setFormData(buildFormFromInitial())
      setErrors({})
      setSubmitAttempted(false)
      setAvatarPreview(null)
      setOriginalRawSrc(null)
      setRawImageSrc(null)
      setCropOpen(false)
      setShowAvatarMenu(false)
      setOpenAccordions(["dados"])
      // Reset company-scoping
      setResolvedCompanyId(companyIdProp ?? null)
      setResolvedCompanyName(companyName ?? "")
      setLocalClients([])
      setShowNewClientForm(false)
      setNewClientName("")
      setNewClientEmail("")
      setShowProductsStep(false)
      setShowReview(false)
      setShowCheckout(false)
      setSelectedProducts([])
      setProductQuantities({})
      setProductCommissions({})
      setActiveReviewTab("resumo")
      setShowNextStepModal(false)
      // Hydrate from draft props if resuming
      if (draftProducts && draftProducts.length > 0) {
        setSelectedProducts(draftProducts)
        setProductQuantities(draftProductQuantities ?? {})
        setProductCommissions(draftCommissions ?? {})
        setShowProductsStep(true)
      }
      if (resumeToCheckout) {
        setShowProductsStep(true)
        setShowCheckout(true)
      }
    }
  }, [open])

  // ── Helpers ──
  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field as string]) setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const validateForm = (): boolean => {
    const e: FormErrors = {}
    if (!formData.nome.trim()) e.nome = "Nome do projeto é obrigatório"
    if (!formData.tipo) e.tipo = "Tipo é obrigatório"
    // Empresa required only when allowCompanySelect is true (must pick one)
    if (allowCompanySelect && !resolvedCompanyId) e.agencia = "Empresa é obrigatória"
    if (!formData.agencia.trim() && !allowCompanySelect && !companyName) e.agencia = "Empresa é obrigatória"
    if (!formData.cliente.trim()) e.cliente = "Cliente é obrigatório"
    if (!formData.consultor.trim()) e.consultor = "Consultor é obrigatório"
    if (!formData.emailConsultor.trim()) {
      e.emailConsultor = "E-mail é obrigatório"
    } else if (!/\S+@\S+\.\S+/.test(formData.emailConsultor)) {
      e.emailConsultor = "E-mail inválido"
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = () => {
    if (!validateForm()) { setSubmitAttempted(true); return }
    setShowNextStepModal(true)
  }

  const buildProject = (status: string, products?: {name:string;price:number;qty:number}[]) => ({
    id: Date.now(),
    name: formData.nome,
    type: formData.tipo,
    agency: resolvedCompanyName || formData.agencia,
    client: formData.cliente,
    clientCNPJ: formData.clienteCnpj,
    consultant: formData.consultor,
    consultantEmail: formData.emailConsultor,
    startDate: formData.dataInicio,
    deadline: formData.prazo,
    budget: parseFloat(formData.orcamento.replace(/[^\d.,]/g, "").replace(",", ".")) || 0,
    portfolioPermission: formData.permitePortfolio,
    bitrixSync: formData.sincronizadoBitrix,
    descricao: formData.descricao,
    status,
    companyId: resolvedCompanyId ?? undefined,
    lifecycle: "avulso",
    progress: 0,
    spent: 0,
    team: 0,
    nomades: [],
    products: products ?? [],
    createdDate: new Date().toLocaleDateString("pt-BR"),
    avatar: avatarPreview,
    fromLead: false,
    overdue: false,
    value: parseFloat(formData.orcamento.replace(/[^\d.,]/g, "").replace(",", ".")) || 0,
  })

  const confirmSubmit = async (status: string, products?: {name:string;price:number;qty:number}[]) => {
    setLoading(true)
    setShowProductsStep(false)
    setShowReview(false)
    setShowCheckout(false)
    try {
      const budgetValue = parseFloat(formData.orcamento.replace(/[^\d.,]/g, "").replace(",", ".")) || 0
      const payload: any = {
        title: formData.nome,
        type: formData.tipo,
        agency: resolvedCompanyName || formData.agencia,
        consultant: formData.consultor,
        consultant_email: formData.emailConsultor,
        start_date: formData.dataInicio,
        end_date: formData.prazo,
        budget: budgetValue,
        value: budgetValue,
        portfolio_permission: formData.permitePortfolio,
        bitrix_sync: formData.sincronizadoBitrix,
        description: formData.descricao,
        status,
        lifecycle: "avulso",
        client_id: resolvedCompanyId ?? undefined,
      }
      const created: any = await apiClient.createProject(payload)
      // Persist draft state to localStorage so the banner can restore it
      if (status === "draft" || status === "awaiting-payment") {
        const storageKey = `allka-draft-${created?.id ?? draftProjectId ?? Date.now()}`
        try {
          localStorage.setItem(storageKey, JSON.stringify({
            formData,
            selectedProducts,
            productQuantities,
            productCommissions,
            projectId: created?.id,
            status,
          }))
        } catch (_) { /* quota exceeded – ignore */ }
      }
      toast({ title: "Sucesso", description: cloneMode ? "Projeto clonado!" : "Projeto criado!" })
      onCreate(created)
      handleClose()
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Falha ao criar projeto", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  // ── Format helper ──
  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

  // ── Product cart handlers ──
  const handleAddProduct = (product: any) => {
    const id = String(product.id)
    setSelectedProducts((prev) => {
      if (prev.find((p) => String(p.id) === id)) return prev
      return [...prev, { ...product, id, quantity: 1 }]
    })
    setProductQuantities((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }))
  }

  const handleRemoveProduct = (productId: string) => {
    setSelectedProducts((prev) => prev.filter((p) => String(p.id) !== productId))
    setProductQuantities((prev) => {
      const next = { ...prev }
      delete next[productId]
      return next
    })
  }

  const handleIncreaseProduct = (productId: string) => {
    setProductQuantities((prev) => ({ ...prev, [productId]: (prev[productId] || 1) + 1 }))
    setSelectedProducts((prev) =>
      prev.map((p) => String(p.id) === productId ? { ...p, quantity: (p.quantity || 1) + 1 } : p)
    )
  }

  const handleDecreaseProduct = (productId: string) => {
    const currentQty = productQuantities[productId] || 1
    if (currentQty <= 1) {
      handleRemoveProduct(productId)
    } else {
      setProductQuantities((prev) => ({ ...prev, [productId]: prev[productId] - 1 }))
      setSelectedProducts((prev) =>
        prev.map((p) => String(p.id) === productId ? { ...p, quantity: p.quantity - 1 } : p)
      )
    }
  }

  const calculateTotal = () =>
    selectedProducts.reduce((sum, p) => {
      const qty = productQuantities[String(p.id)] || p.quantity || 1
      return sum + (p.finalPrice * qty)
    }, 0)

  const handleSaveDraftNow = () => {
    if (!formData.nome.trim()) {
      toast({ title: "Nome obrigatório", description: "Informe o nome do projeto para salvar o rascunho.", variant: "destructive" })
      return
    }
    const products = selectedProducts.map((p) => ({
      name: p.name, price: p.finalPrice, qty: productQuantities[String(p.id)] || p.quantity || 1,
    }))
    confirmSubmit("draft", products)
  }

  const handleOpenReview = () => {
    setActiveReviewTab("resumo")
    setShowReview(true)
  }

  const calculateCommissionTotal = () =>
    selectedProducts.reduce((sum, p) => {
      const qty = productQuantities[String(p.id)] || p.quantity || 1
      const pct = productCommissions[String(p.id)] || 0
      return sum + (p.finalPrice * qty * pct / 100)
    }, 0)

  const calculateClientTotal = () => calculateTotal() + calculateCommissionTotal()

  const getWeightedCommissionRate = () => {
    const total = calculateTotal()
    if (total === 0) return 0
    return (calculateCommissionTotal() / total) * 100
  }

  const buildPreselectedClient = () => ({
    name: formData.cliente,
    email: formData.emailConsultor,
    phone: "",
    company: formData.clienteCnpj || formData.cliente,
  })

  const convertProductsToCartItems = () =>
    selectedProducts.map((p) => ({
      id: String(p.id),
      product: {
        id: String(p.id),
        name: p.name,
        description: p.description || "",
        shortDescription: p.description || "",
        category: p.category || "",
        tags: [],
        basePrice: p.finalPrice || 0,
        complexity: "basic" as const,
        visibility: { company: true, agency: true, partner: true, inHouse: true },
        variations: [],
        addons: [],
        stats: { contractCount: 0, averageRating: 0, completionTime: "" },
        demonstrations: [],
        image: p.image || "",
      },
      quantity: productQuantities[String(p.id)] || p.quantity || 1,
    }))

  const handleCheckoutComplete = (_data: CheckoutData) => {
    const products = selectedProducts.map((p) => ({
      name: p.name, price: p.finalPrice, qty: productQuantities[String(p.id)] || p.quantity || 1,
    }))
    confirmSubmit("awaiting-payment", products)
  }

  // ── Avatar handlers ──
  const handleAvatarClick = () => {
    if (avatarPreview) setShowAvatarMenu((p) => !p)
    else fileInputRef.current?.click()
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
    setAvatarPreview(canvas.toDataURL("image/jpeg", 0.92))
    setCropOpen(false)
    setRawImageSrc(null)
  }

  // ── Error counts ──
  const sectionErrors = {
    dados:      [errors.nome, errors.tipo, errors.agencia, errors.cliente].filter(Boolean).length,
    responsavel:[errors.consultor, errors.emailConsultor].filter(Boolean).length,
  }
  const totalErrors = Object.values(sectionErrors).reduce((a, b) => a + b, 0)

  const panelWidth = `calc(100vw - ${sidebarWidth}px)`

  if (!open && !isClosing) return null

  return (
    <>
      <div
        data-slot="sheet-content"
        data-state={isClosing ? "closed" : "open"}
        className="fixed top-0 z-50 h-[calc(100vh-24px)] bg-background shadow-2xl flex flex-col border-l border-border overflow-hidden data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=closed]:fade-out-0"
        style={{ left: `${sidebarWidth}px`, width: panelWidth }}
      >
        <div className="relative h-full flex flex-col overflow-hidden">
          {/* Hidden file input */}
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

          {/* Header */}
          <ModalBrandHeader
            title={formData.nome || (cloneMode ? "Clonar Projeto" : "Novo Projeto")}
            subtitle={cloneMode ? "Clonar projeto existente" : "Configure os dados do projeto"}
            left={
              <button
                onClick={handleAvatarClick}
                className="relative h-20 w-20 rounded-full bg-white/15 border-2 border-white/30 flex-shrink-0 group overflow-hidden hover:border-white/60 transition-all"
              >
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-600 to-violet-600">
                  <FolderKanban className="h-7 w-7 text-white/70" />
                </div>
                {avatarPreview && (
                  <img src={avatarPreview} alt="logo" className="absolute inset-0 w-full h-full object-cover" />
                )}
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                  <Camera className="h-5 w-5 text-white" />
                  <span className="text-[9px] text-white/90 font-medium mt-0.5">{avatarPreview ? "Editar" : "Foto"}</span>
                </div>
              </button>
            }
            onClose={handleClose}
          />

          {/* Avatar menu */}
          {showAvatarMenu && avatarPreview && (
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
                  onClick={() => { setShowAvatarMenu(false); setAvatarPreview(null); setOriginalRawSrc(null) }}
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
                <p className="text-white text-sm font-semibold">Ajustar imagem do projeto</p>
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
                  <button onClick={handleCropConfirm} className="flex-1 h-9 rounded-lg btn-brand text-sm font-semibold transition-colors">Usar esta foto</button>
                </div>
              </div>
            </div>
          )}

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-[50px] py-[50px] bg-slate-200">

            {/* Validation warning */}
            {submitAttempted && totalErrors > 0 && (
              <div className="mb-4 flex items-center gap-2.5 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                <p className="text-xs text-red-700 font-medium">
                  {totalErrors === 1 ? "Falta 1 campo obrigatório" : `Faltam ${totalErrors} campos obrigatórios`}
                </p>
              </div>
            )}

            {/* Expand/Collapse toggle */}
            <div className="flex items-center justify-end pb-3">
              <button
                onClick={() => setOpenAccordions(ALL_ACCORDIONS.every(a => openAccordions.includes(a)) ? [] : ALL_ACCORDIONS)}
                className="flex items-center gap-2 group"
              >
                <span className="text-xs text-slate-500 group-hover:text-slate-700 transition-colors select-none">
                  {ALL_ACCORDIONS.every(a => openAccordions.includes(a)) ? "Fechar" : "Expandir"}
                </span>
                <div className={cn("relative w-9 h-5 rounded-full transition-colors duration-200", ALL_ACCORDIONS.every(a => openAccordions.includes(a)) ? "bg-blue-600" : "bg-slate-300")}>
                  <div className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200", ALL_ACCORDIONS.every(a => openAccordions.includes(a)) ? "translate-x-4" : "translate-x-0.5")} />
                </div>
              </button>
            </div>

            <Accordion type="multiple" value={openAccordions} onValueChange={setOpenAccordions} className="space-y-2">

              {/* ── SEÇÃO 1: DADOS DO PROJETO ── */}
              <AccordionItem value="dados" className={cn("border rounded-lg overflow-hidden", sectionErrors.dados > 0 ? "border-red-300" : "border-slate-200")}>
                <AccordionTrigger className={cn("px-3 py-2 text-xs font-semibold", sectionErrors.dados > 0 ? "bg-red-50 hover:bg-red-100" : "bg-white hover:bg-slate-50")}>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-blue-100 text-blue-700">1</Badge>
                    Dados do Projeto
                    {sectionErrors.dados > 0 && (
                      <span className="ml-1 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">{sectionErrors.dados}</span>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="border-t bg-white px-3 py-3">
                    <div className="grid grid-cols-2 gap-3">
                      {/* Nome */}
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs font-medium text-slate-600">Nome do Projeto *</Label>
                        <Input
                          placeholder="Ex: Website Institucional Florescer"
                          value={formData.nome}
                          onChange={(e) => {
                            updateField("nome", e.target.value)
                            if (warnings.nome) setWarnings(prev => ({ ...prev, nome: "" }))
                          }}
                          onBlur={() => {
                            if (formData.nome.trim() && existingProjectNames.includes(formData.nome.trim().toLowerCase())) {
                              setWarnings(prev => ({ ...prev, nome: "Este nome já está em uso" }))
                            } else {
                              setWarnings(prev => ({ ...prev, nome: "" }))
                            }
                          }}
                          className={cn("h-8 text-xs", errors.nome && "border-red-400", !errors.nome && warnings.nome && "border-amber-400")}
                        />
                        {errors.nome && <p className="text-xs text-red-500">{errors.nome}</p>}
                        {!errors.nome && warnings.nome && <p className="text-xs text-amber-600">{warnings.nome}</p>}
                      </div>

                      {/* Tipo */}
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs font-medium text-slate-600">Tipo de Projeto *</Label>
                        {!showNewTypeForm ? (
                          <SearchableSelect
                            items={[...PROJECT_TYPES, ...localProjectTypes].map(t => ({ value: t, label: t }))}
                            value={formData.tipo}
                            onValueChange={(v) => updateField("tipo", v)}
                            placeholder="Selecione o tipo"
                            searchPlaceholder="Pesquisar tipo..."
                            emptyMessage="Nenhum tipo encontrado."
                            className={cn("h-8 text-xs", errors.tipo && "border-red-400")}
                            onAddNew={() => setShowNewTypeForm(true)}
                            addNewLabel="Adicionar tipo"
                          />
                        ) : (
                          <div className="space-y-1.5 p-2.5 bg-violet-50 rounded-lg border border-violet-200">
                            <p className="text-[10px] font-semibold text-violet-700 uppercase tracking-wider">Novo tipo</p>
                            <Input placeholder="Nome do tipo *" value={newTypeName} onChange={e => setNewTypeName(e.target.value)} className="h-7 text-xs" />
                            <div className="flex gap-1.5 pt-0.5">
                              <button type="button"
                                onClick={() => {
                                  if (!newTypeName.trim()) return
                                  setLocalProjectTypes(prev => [...prev, newTypeName.trim()])
                                  updateField("tipo", newTypeName.trim())
                                  setNewTypeName("")
                                  setShowNewTypeForm(false)
                                }}
                                className="flex-1 h-7 rounded-md btn-brand text-xs font-semibold"
                              >Adicionar</button>
                              <button type="button" onClick={() => { setShowNewTypeForm(false); setNewTypeName("") }}
                                className="h-7 w-7 flex items-center justify-center rounded-md border border-slate-200 bg-white text-slate-400 hover:bg-slate-50"
                              ><XIcon className="h-3 w-3" /></button>
                            </div>
                          </div>
                        )}
                        {errors.tipo && <p className="text-xs text-red-500">{errors.tipo}</p>}
                      </div>

                      {/* Empresa */}
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs font-medium text-slate-600">Empresa *</Label>
                        {companyName ? (
                          <div className="flex items-center gap-2 h-8 px-2.5 bg-slate-100 rounded-md border border-slate-200">
                            <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="text-xs font-semibold text-slate-700 truncate">{companyName}</span>
                          </div>
                        ) : allowCompanySelect ? (
                          <SearchableSelect
                            items={[...mockCompaniesList, ...localCompanies].map(c => ({ value: String(c.id), label: c.name }))}
                            value={resolvedCompanyId ? String(resolvedCompanyId) : ""}
                            onValueChange={(v) => {
                              const id = Number(v)
                              const allCos = [...mockCompaniesList, ...localCompanies]
                              const co = allCos.find(c => c.id === id)
                              setResolvedCompanyId(id)
                              setResolvedCompanyName(co?.name ?? "")
                              updateField("agencia", co?.name ?? "")
                              updateField("cliente", "")
                              updateField("clienteCnpj", "")
                              updateField("consultor", "")
                              updateField("emailConsultor", "")
                              setLocalClients([])
                            }}
                            placeholder="Pesquisar empresa..."
                            searchPlaceholder="Digite para buscar..."
                            emptyMessage="Nenhuma empresa encontrada."
                            className={cn("h-8 text-xs", errors.agencia && "border-red-400")}
                            onAddNew={() => setShowCreateCompany(true)}
                            addNewLabel="Cadastrar empresa"
                          />
                        ) : (
                          <Input
                            placeholder="Nome da empresa"
                            value={formData.agencia}
                            onChange={(e) => { updateField("agencia", e.target.value); setResolvedCompanyName(e.target.value) }}
                            className={cn("h-8 text-xs", errors.agencia && "border-red-400")}
                          />
                        )}
                        {errors.agencia && <p className="text-xs text-red-500">{errors.agencia}</p>}
                      </div>

                      {/* Cliente */}
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs font-medium text-slate-600">Cliente *</Label>
                        {resolvedCompanyId ? (
                          <>
                            {!showNewClientForm ? (
                              <SearchableSelect
                                items={[...(mockClientsByCompany[resolvedCompanyId] ?? []), ...localClients].map(c => ({
                                  value: c.name,
                                  label: c.name,
                                  sublabel: c.cnpj || c.email || undefined,
                                }))}
                                value={formData.cliente}
                                onValueChange={(v) => {
                                  const clients = [...(mockClientsByCompany[resolvedCompanyId] ?? []), ...localClients]
                                  const cl = clients.find(c => c.name === v)
                                  updateField("cliente", v)
                                  if (cl?.cnpj) updateField("clienteCnpj", cl.cnpj)
                                }}
                                placeholder="Pesquisar cliente..."
                                searchPlaceholder="Digite para buscar..."
                                emptyMessage="Nenhum cliente encontrado."
                                className={cn("h-8 text-xs", errors.cliente && "border-red-400")}
                                onAddNew={() => setShowNewClientForm(true)}
                                addNewLabel="Novo cliente"
                              />
                            ) : (
                              <div className="space-y-1.5 p-2.5 bg-violet-50 rounded-lg border border-violet-200">
                                <p className="text-[10px] font-semibold text-violet-700 uppercase tracking-wider">Novo cliente</p>
                                <Input placeholder="Nome do cliente *" value={newClientName} onChange={e => setNewClientName(e.target.value)} className="h-7 text-xs" />
                                <Input placeholder="E-mail" value={newClientEmail} onChange={e => setNewClientEmail(e.target.value)} className="h-7 text-xs" />
                                <div className="flex gap-1.5 pt-0.5">
                                  <button type="button"
                                    onClick={() => {
                                      if (!newClientName.trim()) return
                                      const nc: MockClientItem = { id: Date.now(), name: newClientName.trim(), email: newClientEmail.trim() }
                                      setLocalClients(prev => [...prev, nc])
                                      updateField("cliente", nc.name)
                                      setNewClientName("")
                                      setNewClientEmail("")
                                      setShowNewClientForm(false)
                                    }}
                                    className="flex-1 h-7 rounded-md btn-brand text-xs font-semibold"
                                  >Adicionar</button>
                                  <button type="button" onClick={() => setShowNewClientForm(false)}
                                    className="h-7 w-7 flex items-center justify-center rounded-md border border-slate-200 bg-white text-slate-400 hover:bg-slate-50"
                                  ><XIcon className="h-3 w-3" /></button>
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <Input
                            placeholder={allowCompanySelect ? "Selecione uma empresa primeiro" : "Nome do cliente"}
                            disabled={allowCompanySelect && !resolvedCompanyId}
                            value={formData.cliente}
                            onChange={(e) => updateField("cliente", e.target.value)}
                            className={cn("h-8 text-xs", errors.cliente && "border-red-400")}
                          />
                        )}
                        {errors.cliente && <p className="text-xs text-red-500">{errors.cliente}</p>}
                      </div>

                      {/* CNPJ do cliente */}
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs font-medium text-slate-600">CNPJ do Cliente</Label>
                        <Input
                          placeholder="00.000.000/0001-00"
                          value={formData.clienteCnpj}
                          onChange={(e) => updateField("clienteCnpj", e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* ── SEÇÃO 2: RESPONSÁVEL ── */}
              <AccordionItem value="responsavel" className={cn("border rounded-lg overflow-hidden", sectionErrors.responsavel > 0 ? "border-red-300" : "border-slate-200")}>
                <AccordionTrigger className={cn("px-3 py-2 text-xs font-semibold", sectionErrors.responsavel > 0 ? "bg-red-50 hover:bg-red-100" : "bg-white hover:bg-slate-50")}>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-100 text-green-700">2</Badge>
                    Responsável
                    {sectionErrors.responsavel > 0 && (
                      <span className="ml-1 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">{sectionErrors.responsavel}</span>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="border-t bg-white px-3 py-3 grid grid-cols-2 gap-3">
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs font-medium text-slate-600">Consultor Responsável *</Label>
                      {resolvedCompanyId ? (
                        <SearchableSelect
                          items={(mockUsersByCompany[resolvedCompanyId] ?? []).map(u => ({
                            value: u.name,
                            label: u.name,
                            sublabel: u.role,
                          }))}
                          value={formData.consultor}
                          onValueChange={(v) => {
                            const users = mockUsersByCompany[resolvedCompanyId] ?? []
                            const u = users.find(u => u.name === v)
                            updateField("consultor", v)
                            if (u?.email) updateField("emailConsultor", u.email)
                          }}
                          placeholder="Pesquisar consultor..."
                          searchPlaceholder="Digite para buscar..."
                          emptyMessage="Nenhum consultor encontrado."
                          className={cn("h-8 text-xs", errors.consultor && "border-red-400")}
                        />
                      ) : (
                        <div className="relative">
                          <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                          <Input
                            placeholder="Nome do consultor"
                            value={formData.consultor}
                            onChange={(e) => updateField("consultor", e.target.value)}
                            className={cn("h-8 text-xs pl-8", errors.consultor && "border-red-400")}
                          />
                        </div>
                      )}
                      {errors.consultor && <p className="text-xs text-red-500">{errors.consultor}</p>}
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs font-medium text-slate-600">E-mail do Consultor *</Label>
                      <div className="relative">
                        <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                        <Input
                          type="email"
                          placeholder="consultor@agencia.com"
                          value={formData.emailConsultor}
                          onChange={(e) => updateField("emailConsultor", e.target.value)}
                          className={cn("h-8 text-xs pl-8", errors.emailConsultor && "border-red-400")}
                        />
                      </div>
                      {errors.emailConsultor && <p className="text-xs text-red-500">{errors.emailConsultor}</p>}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* ── SEÇÃO 3: DATAS ── */}
              <AccordionItem value="datas" className="border border-slate-200 rounded-lg overflow-hidden">
                <AccordionTrigger className="px-3 py-2 bg-white hover:bg-slate-50 text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-purple-100 text-purple-700">3</Badge>
                    Datas
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="border-t bg-white px-3 py-3 grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-slate-600">Data de Início</Label>
                      <div className="relative">
                        <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                        <Input
                          type="date"
                          value={formData.dataInicio}
                          onChange={(e) => updateField("dataInicio", e.target.value)}
                          className="h-8 text-xs pl-8"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-slate-600">Prazo / Entrega</Label>
                      <div className="relative">
                        <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                        <Input
                          type="date"
                          value={formData.prazo}
                          onChange={(e) => updateField("prazo", e.target.value)}
                          className="h-8 text-xs pl-8"
                        />
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* ── SEÇÃO 4: ORÇAMENTO ── */}
              <AccordionItem value="orcamento" className="border border-slate-200 rounded-lg overflow-hidden">
                <AccordionTrigger className="px-3 py-2 bg-white hover:bg-slate-50 text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-orange-100 text-orange-700">4</Badge>
                    Orçamento
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="border-t bg-white px-3 py-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-slate-600">Valor do Projeto (R$)</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                        <Input
                          placeholder="0,00"
                          value={formData.orcamento}
                          onChange={(e) => updateField("orcamento", e.target.value)}
                          className="h-8 text-xs pl-8"
                        />
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* ── SEÇÃO 5: CONFIGURAÇÕES ── */}
              <AccordionItem value="config" className="border border-slate-200 rounded-lg overflow-hidden">
                <AccordionTrigger className="px-3 py-2 bg-white hover:bg-slate-50 text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-indigo-100 text-indigo-700">5</Badge>
                    Configurações &amp; Descrição
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="border-t bg-white px-3 py-3 space-y-4">
                    {/* Toggles */}
                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
                        <div>
                          <p className="text-xs font-semibold text-slate-700">Permite Portfólio</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Exibir em portfólio público</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => updateField("permitePortfolio", !formData.permitePortfolio)}
                          className={cn("relative w-9 h-5 rounded-full transition-colors duration-200 flex-shrink-0", formData.permitePortfolio ? "bg-blue-600" : "bg-slate-300")}
                        >
                          <div className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200", formData.permitePortfolio ? "translate-x-4" : "translate-x-0.5")} />
                        </button>
                      </label>
                      <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
                        <div>
                          <p className="text-xs font-semibold text-slate-700">Sincronizar Bitrix</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Integrar com Bitrix24</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => updateField("sincronizadoBitrix", !formData.sincronizadoBitrix)}
                          className={cn("relative w-9 h-5 rounded-full transition-colors duration-200 flex-shrink-0", formData.sincronizadoBitrix ? "bg-blue-600" : "bg-slate-300")}
                        >
                          <div className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200", formData.sincronizadoBitrix ? "translate-x-4" : "translate-x-0.5")} />
                        </button>
                      </label>
                    </div>

                    {/* Descrição */}
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-slate-600">Descrição do Projeto</Label>
                      <Textarea
                        placeholder="Descreva os objetivos e escopo do projeto..."
                        value={formData.descricao}
                        onChange={(e) => updateField("descricao", e.target.value)}
                        className="text-xs min-h-[80px] resize-none"
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

            </Accordion>

            {cloneMode && (
              <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-amber-800">
                  Este projeto é uma cópia do original. Ajuste os dados conforme necessário antes de confirmar.
                </p>
              </div>
            )}
            {!cloneMode && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                <p className="text-xs text-blue-700">
                  O projeto será criado e ficará disponível na listagem de projetos desta empresa.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 px-[25px] py-[15px] border-t bg-gray-50 flex-shrink-0">
            <Button variant="outline" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleSaveDraftNow}
                disabled={loading || !formData.nome.trim()}
                className="gap-1.5"
              >
                <Save className="h-4 w-4" />
                Salvar Rascunho
              </Button>
              <Button
                className="btn-brand"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? "Salvando..." : cloneMode ? "Clonar Projeto" : "Próximo"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Decision Modal after "Próximo" */}
      <AlertDialog open={showNextStepModal} onOpenChange={setShowNextStepModal}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>O que deseja fazer?</AlertDialogTitle>
            <AlertDialogDescription>
              Escolha como deseja prosseguir com o projeto.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-3"
              onClick={() => {
                setShowNextStepModal(false)
                handleSaveDraftNow()
              }}
            >
              <Save className="h-5 w-5 text-muted-foreground" />
              <div className="text-left">
                <div className="font-medium">Salvar Rascunho</div>
                <div className="text-xs text-muted-foreground">Salvar projeto como rascunho e continuar depois</div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-3"
              onClick={() => {
                setShowNextStepModal(false)
                setShowProductsStep(true)
              }}
            >
              <ShoppingCart className="h-5 w-5 text-muted-foreground" />
              <div className="text-left">
                <div className="font-medium">Adicionar Produtos</div>
                <div className="text-xs text-muted-foreground">Selecionar produtos e serviços para o projeto</div>
              </div>
            </Button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Catalog/Products Step */}
      {showProductsStep && !showCheckout && (
        <div className="fixed top-0 z-[60] h-[calc(100%-25px)] bg-white flex flex-col border-l border-gray-200 shadow-2xl"
          style={{ left: `${sidebarWidth}px`, right: 0 }}>

          {/* Header */}
          <div className="relative h-[90px] flex-shrink-0 bg-linear-to-r from-violet-700 to-indigo-700 flex items-center justify-between px-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center">
                <Package className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Selecionar Produtos</p>
                <p className="text-xs text-white/70">{formData.nome || "Novo Projeto"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveDraftNow}
                disabled={loading || !formData.nome.trim()}
                className="h-8 px-3 flex items-center gap-1.5 rounded-lg bg-white/15 border border-white/30 text-white text-xs font-medium hover:bg-white/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Save className="h-3.5 w-3.5" />
                Salvar Rascunho
              </button>
              <button
                onClick={() => setShowProductsStep(false)}
                className="h-8 w-8 flex items-center justify-center rounded-lg bg-white/10 border border-white/30 text-white/70 hover:bg-white/20 hover:text-white transition-colors"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Catalog fills remaining space */}
          <div className="flex-1 overflow-hidden">
            <ProductCatalogView
              mode="panel"
              panelTitle={`Produtos — ${formData.nome || "Novo Projeto"}`}
              selectedProducts={selectedProducts}
              productQuantities={productQuantities}
              onAdd={handleAddProduct}
              onRemove={handleRemoveProduct}
              onIncrease={handleIncreaseProduct}
              onDecrease={handleDecreaseProduct}
              onConfirm={handleOpenReview}
            />
          </div>

          {/* Review Modal Overlay (inside this panel so z-index works correctly) */}
          {showReview && (
            <div className="absolute inset-0 z-10 bg-black/50 flex items-center justify-center p-6">
              <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[calc(100%-48px)] flex flex-col overflow-hidden">

                {/* Review Header */}
                <div className="flex-shrink-0 bg-linear-to-r from-violet-700 to-indigo-700 px-6 py-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center">
                        <Eye className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-white">Revisão do Projeto</h2>
                        <p className="text-xs text-white/70">Confira os detalhes antes do checkout</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowReview(false)}
                      className="h-8 w-8 flex items-center justify-center rounded-lg bg-white/15 border border-white/30 text-white/70 hover:bg-white/25 hover:text-white transition-colors"
                    >
                      <XIcon className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Tabs */}
                  <div className="flex gap-1 mt-4">
                    {(["resumo", "comissoes"] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveReviewTab(tab)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                          activeReviewTab === tab
                            ? "bg-white text-violet-700"
                            : "text-white/70 hover:text-white hover:bg-white/15"
                        )}
                      >
                        {tab === "resumo" ? <Eye className="h-3.5 w-3.5" /> : <Percent className="h-3.5 w-3.5" />}
                        {tab === "resumo" ? "Resumo" : "Comissões"}
                        {tab === "comissoes" && calculateCommissionTotal() > 0 && (
                          <span className="ml-1 px-1.5 py-0.5 rounded-full bg-emerald-400 text-white text-[10px] font-bold">
                            +{formatCurrency(calculateCommissionTotal())}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">

                  {/* ── TAB: RESUMO ── */}
                  {activeReviewTab === "resumo" && (
                    <>
                      {/* Project Info */}
                      <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Dados do Projeto</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-[10px] text-slate-400">Nome</p>
                            <p className="text-sm font-semibold text-slate-800">{formData.nome || "—"}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400">Tipo</p>
                            <p className="text-sm font-medium text-slate-700">{formData.tipo || "—"}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400">Cliente</p>
                            <p className="text-sm font-medium text-slate-700">{formData.cliente || "—"}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400">Empresa</p>
                            <p className="text-sm font-medium text-slate-700">{resolvedCompanyName || formData.agencia || "—"}</p>
                          </div>
                          {formData.dataInicio && (
                            <div>
                              <p className="text-[10px] text-slate-400">Início</p>
                              <p className="text-sm font-medium text-slate-700">{formData.dataInicio}</p>
                            </div>
                          )}
                          {formData.prazo && (
                            <div>
                              <p className="text-[10px] text-slate-400">Prazo</p>
                              <p className="text-sm font-medium text-slate-700">{formData.prazo}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Products list */}
                      {selectedProducts.length > 0 ? (
                        <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                          <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                            <p className="text-xs font-semibold text-slate-700">Produtos Selecionados</p>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-xs font-semibold">
                              {selectedProducts.length} {selectedProducts.length === 1 ? "item" : "itens"}
                            </span>
                          </div>
                          <div className="divide-y divide-slate-100">
                            {selectedProducts.map((product) => {
                              const id = String(product.id)
                              const qty = productQuantities[id] || product.quantity || 1
                              const lineTotal = product.finalPrice * qty
                              const pct = productCommissions[id] || 0
                              const commission = lineTotal * pct / 100
                              return (
                                <div key={id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
                                  <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                                      <Package className="h-4 w-4 text-violet-500" />
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-slate-800">{product.name}</p>
                                      <p className="text-xs text-slate-400">{product.category} &middot; Qtd: {qty}</p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-semibold text-slate-800">{formatCurrency(lineTotal)}</p>
                                    {pct > 0 && (
                                      <p className="text-xs text-emerald-600 font-medium">+{pct}% comissão ({formatCurrency(commission)})</p>
                                    )}
                                    <p className="text-xs text-slate-400">unit. {formatCurrency(product.finalPrice)}</p>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center bg-white">
                          <Package className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                          <p className="text-sm text-slate-400">Nenhum produto adicionado</p>
                        </div>
                      )}

                      {/* Financial Summary */}
                      {selectedProducts.length > 0 && (
                        <div className="rounded-xl overflow-hidden border border-indigo-200">
                          <div className="px-4 py-3 bg-linear-to-r from-indigo-600 to-violet-600">
                            <p className="text-xs font-semibold text-white uppercase tracking-wider">Resumo Financeiro</p>
                          </div>
                          <div className="p-4 space-y-2 bg-linear-to-br from-indigo-50 to-violet-50">
                            {selectedProducts.map((p) => {
                              const id = String(p.id)
                              const qty = productQuantities[id] || p.quantity || 1
                              return (
                                <div key={id} className="flex items-center justify-between text-xs text-indigo-800">
                                  <span className="truncate mr-2">{p.name} × {qty}</span>
                                  <span className="font-medium shrink-0">{formatCurrency(p.finalPrice * qty)}</span>
                                </div>
                              )
                            })}
                            {calculateCommissionTotal() > 0 && (
                              <div className="flex items-center justify-between text-xs text-emerald-700 border-t border-indigo-200 pt-2 mt-1">
                                <span>Comissões</span>
                                <span className="font-semibold">+{formatCurrency(calculateCommissionTotal())}</span>
                              </div>
                            )}
                            <div className="pt-2 mt-1 border-t border-indigo-200 space-y-1">
                              {calculateCommissionTotal() > 0 && (
                                <div className="flex items-center justify-between text-sm text-indigo-700">
                                  <span className="font-medium">Total Agência</span>
                                  <span className="font-semibold">{formatCurrency(calculateTotal())}</span>
                                </div>
                              )}
                              <div className="flex items-center justify-between">
                                <span className="text-base font-bold text-indigo-900">
                                  {calculateCommissionTotal() > 0 ? "Total Cliente" : "Total Geral"}
                                </span>
                                <span className="text-xl font-bold text-indigo-900">{formatCurrency(calculateClientTotal())}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* ── TAB: COMISSÕES ── */}
                  {activeReviewTab === "comissoes" && (
                    <>
                      {selectedProducts.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-200 p-10 text-center bg-white">
                          <Percent className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                          <p className="text-sm text-slate-400">Nenhum produto para configurar comissão</p>
                        </div>
                      ) : (
                        <>
                          <p className="text-xs text-slate-500">Defina a porcentagem de comissão por produto. O valor da comissão será adicionado ao preço cobrado do cliente.</p>

                          {/* Per-product commission rows */}
                          <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                            <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50">
                              <div className="grid grid-cols-12 gap-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                <span className="col-span-4">Produto</span>
                                <span className="col-span-2 text-right">Custo</span>
                                <span className="col-span-2 text-center">Comissão %</span>
                                <span className="col-span-2 text-right">Valor Com.</span>
                                <span className="col-span-2 text-right">Preço Cliente</span>
                              </div>
                            </div>
                            <div className="divide-y divide-slate-100">
                              {selectedProducts.map((product) => {
                                const id = String(product.id)
                                const qty = productQuantities[id] || product.quantity || 1
                                const baseCost = product.finalPrice * qty
                                const pct = productCommissions[id] || 0
                                const commissionValue = baseCost * pct / 100
                                const clientPrice = baseCost + commissionValue
                                return (
                                  <div key={id} className="grid grid-cols-12 gap-2 items-center px-4 py-3 hover:bg-slate-50 transition-colors">
                                    <div className="col-span-4 flex items-center gap-2 min-w-0">
                                      <div className="h-7 w-7 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                                        <Package className="h-3.5 w-3.5 text-violet-500" />
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-xs font-medium text-slate-800 truncate">{product.name}</p>
                                        <p className="text-[10px] text-slate-400">Qtd: {qty}</p>
                                      </div>
                                    </div>
                                    <div className="col-span-2 text-right">
                                      <p className="text-xs font-semibold text-slate-700">{formatCurrency(baseCost)}</p>
                                    </div>
                                    <div className="col-span-2 flex items-center justify-center">
                                      <div className="relative w-full max-w-[72px]">
                                        <input
                                          type="number"
                                          min={0}
                                          max={200}
                                          step={0.5}
                                          value={pct === 0 ? "" : pct}
                                          placeholder="0"
                                          onChange={(e) => {
                                            const v = parseFloat(e.target.value) || 0
                                            setProductCommissions((prev) => ({ ...prev, [id]: v }))
                                          }}
                                          className="w-full h-7 text-xs text-center rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:border-violet-400 focus:bg-white transition-colors pr-4"
                                        />
                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">%</span>
                                      </div>
                                    </div>
                                    <div className="col-span-2 text-right">
                                      <p className={cn("text-xs font-semibold", commissionValue > 0 ? "text-emerald-600" : "text-slate-400")}>
                                        {commissionValue > 0 ? formatCurrency(commissionValue) : "—"}
                                      </p>
                                    </div>
                                    <div className="col-span-2 text-right">
                                      <p className="text-xs font-bold text-slate-800">{formatCurrency(clientPrice)}</p>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>

                          {/* Commission Summary */}
                          <div className="rounded-xl overflow-hidden border border-emerald-200">
                            <div className="px-4 py-3 bg-linear-to-r from-emerald-600 to-teal-600 flex items-center gap-2">
                              <TrendingUp className="h-4 w-4 text-white" />
                              <p className="text-xs font-semibold text-white uppercase tracking-wider">Resumo de Comissões</p>
                            </div>
                            <div className="p-4 bg-linear-to-br from-emerald-50 to-teal-50 space-y-2">
                              <div className="flex items-center justify-between text-xs text-slate-600">
                                <span>Total Custo (Agência)</span>
                                <span className="font-semibold text-slate-800">{formatCurrency(calculateTotal())}</span>
                              </div>
                              <div className="flex items-center justify-between text-xs text-emerald-700">
                                <span>Total Comissões</span>
                                <span className="font-semibold">+{formatCurrency(calculateCommissionTotal())}</span>
                              </div>
                              <div className="pt-2 border-t border-emerald-200 flex items-center justify-between">
                                <span className="text-sm font-bold text-slate-900">Total Cliente</span>
                                <span className="text-lg font-bold text-emerald-700">{formatCurrency(calculateClientTotal())}</span>
                              </div>
                              {calculateCommissionTotal() > 0 && (
                                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                                  <span>Margem média</span>
                                  <span className="font-semibold text-emerald-600">
                                    {(calculateCommissionTotal() / calculateTotal() * 100).toFixed(1)}%
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </>
                  )}

                </div>

                {/* Footer Actions */}
                <div className="flex-shrink-0 flex items-center justify-between gap-3 px-6 py-4 border-t bg-white">
                  <button
                    onClick={() => setShowReview(false)}
                    className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Voltar ao Catálogo
                  </button>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setShowReview(false); handleSaveDraftNow() }}
                      disabled={loading}
                      className="gap-1.5"
                    >
                      <Save className="h-3.5 w-3.5" />
                      Salvar Rascunho
                    </Button>
                    <Button
                      className="btn-brand gap-1.5"
                      onClick={() => { setShowReview(false); setShowCheckout(true) }}
                      disabled={selectedProducts.length === 0}
                    >
                      <CreditCard className="h-4 w-4" />
                      Confirmar e ir ao Checkout
                    </Button>
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>
      )}

      {/* Checkout Step */}
      {showCheckout && (
        <div className="fixed top-0 z-[70] h-[calc(100%-25px)] bg-white flex flex-col border-l border-gray-200 shadow-2xl overflow-hidden"
          style={{ left: `${sidebarWidth}px`, right: 0 }}>
          <CheckoutFlow
            items={convertProductsToCartItems()}
            onBack={() => setShowCheckout(false)}
            onComplete={handleCheckoutComplete}
            preselectedClient={buildPreselectedClient()}
            preselectedProject={buildProject("awaiting-payment")}
            payerType="agency"
            presetCommissionRate={getWeightedCommissionRate()}
          />
        </div>
      )}

      {/* Company creation panel */}
      <CompanyCreateSlidePanel
        open={showCreateCompany}
        onOpenChange={setShowCreateCompany}
        onCreate={(company: any) => {
          const allExisting = [...mockCompaniesList, ...localCompanies]
          const dupByName = allExisting.some(c => c.name.toLowerCase() === (company.name || "").toLowerCase())
          if (dupByName) {
            toast({ title: "Empresa duplicada", description: "Já existe uma empresa com este nome.", variant: "destructive" })
            return
          }
          const newCo: MockCompanyItem = { id: company.id ?? Date.now(), name: company.name }
          setLocalCompanies(prev => [...prev, newCo])
          setResolvedCompanyId(newCo.id)
          setResolvedCompanyName(newCo.name)
          updateField("agencia", newCo.name)
          updateField("cliente", "")
          updateField("clienteCnpj", "")
          updateField("consultor", "")
          updateField("emailConsultor", "")
          setLocalClients([])
          setShowCreateCompany(false)
        }}
      />
    </>
  )
}

