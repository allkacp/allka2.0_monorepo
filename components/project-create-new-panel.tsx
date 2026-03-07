// @ts-nocheck
import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import {
  FolderKanban, Mail, Calendar, DollarSign, User, AlertCircle, Check, Camera, ZoomIn, Trash2, Crosshair,
  UserPlus, Search, Building2, ShoppingBag, Package, X as XIcon,
} from "lucide-react"
import { mockCompaniesList, mockClientsByCompany, mockUsersByCompany } from "@/lib/mock-companies"
import type { MockClientItem } from "@/lib/mock-companies"
import { cn } from "@/lib/utils"
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
}: ProjectCreateNewPanelProps) {
  const { toast } = useToast()
  const { sidebarWidth } = useSidebar()
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const ALL_ACCORDIONS = ["dados", "responsavel", "datas", "orcamento", "config"]
  const [openAccordions, setOpenAccordions] = useState<string[]>(["dados"])
  const [mounted, setMounted] = useState(false)

  // Company-scoping state
  const [resolvedCompanyId, setResolvedCompanyId] = useState<number | null>(companyIdProp ?? null)
  const [resolvedCompanyName, setResolvedCompanyName] = useState<string>(companyName ?? "")

  // New-client inline form state
  const [showNewClientForm, setShowNewClientForm] = useState(false)
  const [newClientName, setNewClientName] = useState("")
  const [newClientEmail, setNewClientEmail] = useState("")
  const [localClients, setLocalClients] = useState<MockClientItem[]>([])

  // Products confirmation + step state
  const [showProductsDialog, setShowProductsDialog] = useState(false)
  const [showProductsStep, setShowProductsStep] = useState(false)
  const [productSearch, setProductSearch] = useState("")
  const [selectedProduct, setSelectedProduct] = useState<{name:string;price:number} | null>(null)
  const [productQty, setProductQty] = useState(1)

  const FAKE_PRODUCTS = [
    { name: "Gestão de Redes Sociais", price: 2500 },
    { name: "Criação de Site Institucional", price: 8000 },
    { name: "Identidade Visual Completa", price: 5500 },
    { name: "SEO e Tráfego Pago", price: 3200 },
    { name: "Produção de Conteúdo Mensal", price: 1800 },
    { name: "Branding & Posicionamento", price: 6000 },
    { name: "Desenvolvimento de E-commerce", price: 12000 },
    { name: "Consultoria Estratégica", price: 4500 },
  ]

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

  useEffect(() => { setMounted(true) }, [])

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
      setShowProductsDialog(false)
      setShowProductsStep(false)
      setSelectedProduct(null)
      setProductQty(1)
      setProductSearch("")
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
    setShowProductsDialog(true)
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
    setShowProductsDialog(false)
    setShowProductsStep(false)
    try {
      const project = buildProject(status, products)
      await new Promise((r) => setTimeout(r, 400))
      toast({ title: "Sucesso", description: cloneMode ? "Projeto clonado!" : "Projeto criado!" })
      onCreate(project)
      onOpenChange(false)
    } catch {
      toast({ title: "Erro", description: "Falha ao criar projeto", variant: "destructive" })
    } finally {
      setLoading(false)
    }
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

  if (!mounted) return null

  return (
    <>
      <div
        className={cn(
          "fixed top-0 right-0 h-[calc(100%-25px)] bg-white flex flex-col border-l border-gray-200 z-50 shadow-2xl",
          open
            ? "translate-x-0 opacity-100 transition-[transform,opacity] duration-[560ms] ease-[cubic-bezier(0.2,0,0,1)]"
            : "translate-x-full opacity-0 transition-[transform,opacity] duration-[420ms] ease-[cubic-bezier(0.4,0,1,1)]",
        )}
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
            onClose={() => onOpenChange(false)}
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
                          onChange={(e) => updateField("nome", e.target.value)}
                          className={cn("h-8 text-xs", errors.nome && "border-red-400")}
                        />
                        {errors.nome && <p className="text-xs text-red-500">{errors.nome}</p>}
                      </div>

                      {/* Tipo */}
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs font-medium text-slate-600">Tipo de Projeto *</Label>
                        <Select value={formData.tipo} onValueChange={(v) => updateField("tipo", v)}>
                          <SelectTrigger className={cn("h-8 text-xs", errors.tipo && "border-red-400")}>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            {PROJECT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                          </SelectContent>
                        </Select>
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
                          <Select
                            value={resolvedCompanyId ? String(resolvedCompanyId) : ""}
                            onValueChange={(v) => {
                              const id = Number(v)
                              const co = mockCompaniesList.find(c => c.id === id)
                              setResolvedCompanyId(id)
                              setResolvedCompanyName(co?.name ?? "")
                              updateField("agencia", co?.name ?? "")
                              updateField("cliente", "")
                              updateField("clienteCnpj", "")
                              updateField("consultor", "")
                              updateField("emailConsultor", "")
                              setLocalClients([])
                            }}
                          >
                            <SelectTrigger className={cn("h-8 text-xs", errors.agencia && "border-red-400")}>
                              <SelectValue placeholder="Selecione a empresa" />
                            </SelectTrigger>
                            <SelectContent>
                              {mockCompaniesList.map(c => (
                                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
                              <div className="flex gap-1.5">
                                <Select
                                  value={formData.cliente}
                                  onValueChange={(v) => {
                                    const clients = [...(mockClientsByCompany[resolvedCompanyId] ?? []), ...localClients]
                                    const cl = clients.find(c => c.name === v)
                                    updateField("cliente", v)
                                    if (cl?.cnpj) updateField("clienteCnpj", cl.cnpj)
                                  }}
                                >
                                  <SelectTrigger className={cn("h-8 text-xs flex-1", errors.cliente && "border-red-400")}>
                                    <SelectValue placeholder="Selecione um cliente" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {[...(mockClientsByCompany[resolvedCompanyId] ?? []), ...localClients].map(c => (
                                      <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <button
                                  type="button"
                                  onClick={() => setShowNewClientForm(true)}
                                  className="h-8 w-8 shrink-0 flex items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:border-violet-400 hover:text-violet-600 transition-colors"
                                  title="Novo cliente"
                                >
                                  <UserPlus className="h-3.5 w-3.5" />
                                </button>
                              </div>
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
                        <Select
                          value={formData.consultor}
                          onValueChange={(v) => {
                            const users = mockUsersByCompany[resolvedCompanyId] ?? []
                            const u = users.find(u => u.name === v)
                            updateField("consultor", v)
                            if (u?.email) updateField("emailConsultor", u.email)
                          }}
                        >
                          <SelectTrigger className={cn("h-8 text-xs", errors.consultor && "border-red-400")}>
                            <SelectValue placeholder="Selecione o consultor" />
                          </SelectTrigger>
                          <SelectContent>
                            {(mockUsersByCompany[resolvedCompanyId] ?? []).map(u => (
                              <SelectItem key={u.id} value={u.name}>
                                <div className="flex flex-col">
                                  <span>{u.name}</span>
                                  <span className="text-[10px] text-slate-400">{u.role}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button
              className="btn-brand"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? "Salvando..." : cloneMode ? "Clonar Projeto" : "Criar Projeto"}
            </Button>
          </div>
        </div>
      </div>

      {/* Products Confirmation Dialog */}
      <AlertDialog open={showProductsDialog} onOpenChange={setShowProductsDialog}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-violet-600" />
              Adicionar Produtos?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Deseja adicionar produtos ao projeto <strong>{formData.nome}</strong> agora ou deixar para depois?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              className="btn-brand w-full"
              onClick={() => { setShowProductsDialog(false); setShowProductsStep(true) }}
            >
              <ShoppingBag className="h-4 w-4 mr-2" />
              Adicionar produtos agora
            </Button>
            <AlertDialogCancel
              className="w-full mt-0"
              onClick={() => confirmSubmit("draft")}
            >
              Deixar para depois (Rascunho)
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Products Step (inline overlay on panel) */}
      {showProductsStep && (
        <div className="fixed top-0 z-[60] h-[calc(100%-25px)] bg-white flex flex-col border-l border-gray-200 shadow-2xl"
          style={{ left: `${sidebarWidth}px`, right: 0 }}>
          <ModalBrandHeader
            title="Adicionar Produto"
            subtitle={`Projeto: ${formData.nome}`}
            onClose={() => { setShowProductsStep(false); setShowProductsDialog(true) }}
          />
          <div className="flex-1 overflow-y-auto px-[50px] py-[40px] bg-slate-100">
            <div className="max-w-lg mx-auto space-y-4">
              <p className="text-sm text-slate-500">Selecione um produto e defina a quantidade. Mais produtos poderão ser adicionados após a criação do projeto.</p>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  placeholder="Buscar produto..."
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  className="pl-9 h-9 bg-white"
                />
              </div>

              {/* Product list */}
              <div className="space-y-2">
                {FAKE_PRODUCTS.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).map(p => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => setSelectedProduct(p)}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all",
                      selectedProduct?.name === p.name
                        ? "border-violet-500 bg-violet-50 shadow-sm"
                        : "border-slate-200 bg-white hover:border-violet-300"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center",
                        selectedProduct?.name === p.name ? "bg-violet-100" : "bg-slate-100"
                      )}>
                        <Package className={cn("h-4 w-4", selectedProduct?.name === p.name ? "text-violet-600" : "text-slate-400")} />
                      </div>
                      <span className="text-sm font-medium text-slate-800">{p.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-slate-600">
                      R$ {p.price.toLocaleString("pt-BR")}
                    </span>
                  </button>
                ))}
              </div>

              {/* Qty */}
              {selectedProduct && (
                <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Produto selecionado</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-800">{selectedProduct.name}</span>
                    <span className="text-sm text-violet-700 font-bold">R$ {(selectedProduct.price * productQty).toLocaleString("pt-BR")}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Label className="text-xs text-slate-500">Quantidade:</Label>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setProductQty(q => Math.max(1, q - 1))}
                        className="h-7 w-7 rounded-md border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-600 hover:bg-slate-100 text-lg leading-none">−</button>
                      <span className="w-8 text-center text-sm font-semibold">{productQty}</span>
                      <button type="button" onClick={() => setProductQty(q => q + 1)}
                        className="h-7 w-7 rounded-md border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-600 hover:bg-slate-100 text-lg leading-none">+</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 px-[25px] py-[15px] border-t bg-gray-50 shrink-0">
            <Button variant="outline" onClick={() => { setShowProductsStep(false); setShowProductsDialog(true) }}>
              Voltar
            </Button>
            <Button
              className="btn-brand"
              disabled={loading}
              onClick={() => {
                const products = selectedProduct
                  ? [{ name: selectedProduct.name, price: selectedProduct.price, qty: productQty }]
                  : []
                confirmSubmit("awaiting-payment", products)
              }}
            >
              {loading ? "Criando..." : "Concluir e Criar Projeto"}
            </Button>
          </div>
        </div>
      )}
    </>
  )
}

