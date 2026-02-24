// @ts-nocheck
import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Building2, Mail, Phone, MapPin, CreditCard, User, AlertCircle, Check, Camera, ZoomIn, Trash2, Crosshair } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSidebar } from "@/contexts/sidebar-context"
import { ModalBrandHeader } from "@/components/ui/modal-brand-header"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { AddressMapPicker } from "@/components/address/address-map-picker"
import { CompanyStatusSelector } from "@/components/company-status-selector"
import { CompanySocialLinksManager, type SocialLink } from "@/components/company-social-links-manager"

type CompanyStatus = "active" | "inactive" | "pending"

interface CompanyCreateSlidePanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (company: any) => void
}

interface FormData {
  // Dados Cadastrais
  razaoSocial: string
  nomeFantasia: string
  cnpj: string
  inscricaoEstadual: string
  status: CompanyStatus

  // Contato
  emailPrincipal: string
  telefone: string

  // Redes Sociais
  socialLinks: SocialLink[]

  // Endereço
  cep: string
  rua: string
  numero: string
  complemento: string
  cidade: string
  estado: string
  latitude?: number
  longitude?: number
  place_id?: string
  formatted_address?: string

  // Tipo de Conta
  tipoContato: "dependent" | "independent" | "agency" | "partner"

  // Plano de Créditos
  planoCreditoId: string
  limite: string
  creditosIniciais: string

  // Métodos de Pagamento
  metodoPagamento: string

  // Usuário Administrador
  nomeAdmin: string
  emailAdmin: string
}

interface FormErrors {
  [key: string]: string
}

export function CompanyCreateSlidePanel({ open, onOpenChange, onCreate }: CompanyCreateSlidePanelProps) {
  const { toast } = useToast()
  const { sidebarWidth } = useSidebar()
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const CREATE_ALL_ACCORDIONS = ["cadastrais", "contato", "social", "endereco", "tipoConta", "plano", "pagamento", "admin"]
  const [createOpenAccordions, setCreateOpenAccordions] = useState<string[]>(["cadastrais"])
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [mounted, setMounted] = useState(false)

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

  const [formData, setFormData] = useState<FormData>({
    razaoSocial: "",
    nomeFantasia: "",
    cnpj: "",
    inscricaoEstadual: "",
    status: "active",
    emailPrincipal: "",
    telefone: "",
    socialLinks: [],
    cep: "",
    rua: "",
    numero: "",
    complemento: "",
    cidade: "",
    estado: "",
    latitude: undefined,
    longitude: undefined,
    place_id: undefined,
    formatted_address: undefined,
    tipoContato: "independent",
    planoCreditoId: "starter",
    limite: "1000",
    creditosIniciais: "100",
    metodoPagamento: "pix",
    nomeAdmin: "",
    emailAdmin: "",
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) {
      setFormData({
        razaoSocial: "",
        nomeFantasia: "",
        cnpj: "",
        inscricaoEstadual: "",
        status: "active",
        emailPrincipal: "",
        telefone: "",
        socialLinks: [],
        cep: "",
        rua: "",
        numero: "",
        complemento: "",
        cidade: "",
        estado: "",
        tipoContato: "independent",
        planoCreditoId: "starter",
        limite: "1000",
        creditosIniciais: "100",
        metodoPagamento: "pix",
        nomeAdmin: "",
        emailAdmin: "",
      })
      setErrors({})
      setSubmitAttempted(false)
      setAvatarPreview(null)
      setOriginalRawSrc(null)
      setRawImageSrc(null)
      setCropOpen(false)
      setShowAvatarMenu(false)
    }
  }, [open])

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.razaoSocial.trim()) newErrors.razaoSocial = "Razão Social é obrigatória"
    if (!formData.nomeFantasia.trim()) newErrors.nomeFantasia = "Nome Fantasia é obrigatório"
    if (!formData.cnpj.trim()) newErrors.cnpj = "CNPJ é obrigatório"
    if (!formData.emailPrincipal.trim()) {
      newErrors.emailPrincipal = "Email é obrigatório"
    } else if (!/\S+@\S+\.\S+/.test(formData.emailPrincipal)) {
      newErrors.emailPrincipal = "Email inválido"
    }
    if (!formData.telefone.trim()) newErrors.telefone = "Telefone é obrigatório"
    if (!formData.rua.trim()) newErrors.rua = "Rua é obrigatória"
    if (!formData.numero.trim()) newErrors.numero = "Número é obrigatório"
    if (!formData.cidade.trim()) newErrors.cidade = "Cidade é obrigatória"
    if (!formData.estado.trim()) newErrors.estado = "Estado é obrigatório"
    if (!formData.nomeAdmin.trim()) newErrors.nomeAdmin = "Nome do Admin é obrigatório"
    if (!formData.emailAdmin.trim()) {
      newErrors.emailAdmin = "Email do Admin é obrigatório"
    } else if (!/\S+@\S+\.\S+/.test(formData.emailAdmin)) {
      newErrors.emailAdmin = "Email do Admin inválido"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (!validateForm()) {
      setSubmitAttempted(true)
      return
    }
    setShowConfirmDialog(true)
  }

  const confirmSubmit = async () => {
    setLoading(true)
    setShowConfirmDialog(false)

    try {
      const companyData = {
        id: Date.now().toString(),
        razaoSocial: formData.razaoSocial,
        nomeFantasia: formData.nomeFantasia,
        cnpj: formData.cnpj,
        inscricaoEstadual: formData.inscricaoEstadual,
        status: formData.status,
        emailPrincipal: formData.emailPrincipal,
        telefone: formData.telefone,
        socialLinks: formData.socialLinks,
        endereco: {
          cep: formData.cep,
          rua: formData.rua,
          numero: formData.numero,
          complemento: formData.complemento,
          cidade: formData.cidade,
          estado: formData.estado,
        },
        tipoContato: formData.tipoContato,
        planoCreditoId: formData.planoCreditoId,
        limite: parseInt(formData.limite),
        creditosIniciais: parseInt(formData.creditosIniciais),
        metodoPagamento: formData.metodoPagamento,
        adminInicial: {
          nome: formData.nomeAdmin,
          email: formData.emailAdmin,
          perfil: "administrador",
        },
        createdAt: new Date().toISOString(),
      }

      await new Promise((resolve) => setTimeout(resolve, 500))

      toast({
        title: "Sucesso",
        description: "Empresa criada com sucesso!",
      })

      onCreate(companyData)
      onOpenChange(false)
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao criar empresa",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const updateField = (field: keyof FormData, value: string | CompanyStatus) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  // Avatar handlers
  const handleAvatarClick = () => {
    if (avatarPreview) { setShowAvatarMenu((p) => !p) } else { fileInputRef.current?.click() }
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
    // objectFit:contain scales the image to fit within CROP_SIZE — we must account for that
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

  // Error counts per accordion section
  const sectionErrors = {
    cadastrais: [errors.razaoSocial, errors.nomeFantasia, errors.cnpj].filter(Boolean).length,
    contato: [errors.emailPrincipal, errors.telefone].filter(Boolean).length,
    endereco: [errors.rua, errors.numero, errors.cidade, errors.estado].filter(Boolean).length,
    admin: [errors.nomeAdmin, errors.emailAdmin].filter(Boolean).length,
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

        {/* Header with Brand Theme */}
        <ModalBrandHeader
          title={formData.nomeFantasia || "Nova Empresa"}
          subtitle="Configure os dados da empresa"
          left={
            <button
              onClick={handleAvatarClick}
              className="relative h-20 w-20 rounded-full bg-white/15 border-2 border-white/30 flex-shrink-0 group overflow-hidden hover:border-white/60 transition-all"
            >
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-600 to-violet-600">
                <Camera className="h-7 w-7 text-white/70" />
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
                {/* Dimmed full image */}
                <img
                  ref={cropImgRef}
                  src={rawImageSrc}
                  alt="crop"
                  draggable={false}
                  style={{ transform: `translate(${cropOffset.x}px,${cropOffset.y}px) scale(${cropZoom})`, transformOrigin: "center", userSelect: "none", width: "100%", height: "100%", objectFit: "contain", opacity: 0.35 }}
                />
                {/* Bright circle */}
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ clipPath: `circle(${CROP_SIZE / 2}px at 50% 50%)`, pointerEvents: "none" }}
                >
                  <img
                    src={rawImageSrc}
                    alt="crop-bright"
                    draggable={false}
                    style={{ transform: `translate(${cropOffset.x}px,${cropOffset.y}px) scale(${cropZoom})`, transformOrigin: "center", userSelect: "none", width: "100%", height: "100%", objectFit: "contain" }}
                  />
                </div>
                {/* Circle border */}
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

        {/* Conteúdo com Abas em Accordions */}
        <div className="flex-1 overflow-y-auto px-[50px] py-[50px] bg-slate-200">
          {/* STATUS HEADER - Prominently displayed at the top */}
          <div className="mb-4 w-fit px-3 py-2 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg">
            <CompanyStatusSelector
              value={formData.status}
              onChange={(status) => updateField("status", status)}
            />
          </div>

          {/* Validation warning banner */}
          {submitAttempted && totalErrors > 0 && (
            <div className="mb-4 flex items-center gap-2.5 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
              <p className="text-xs text-red-700 font-medium">
                {totalErrors === 1
                  ? "Falta 1 campo obrigatório para preencher"
                  : `Faltam ${totalErrors} campos obrigatórios para preencher`}
              </p>
            </div>
          )}

          <div className="flex items-center justify-end pb-3">
            <button
              onClick={() => {
                const allOpen = CREATE_ALL_ACCORDIONS.every(a => createOpenAccordions.includes(a))
                setCreateOpenAccordions(allOpen ? [] : CREATE_ALL_ACCORDIONS)
              }}
              className="flex items-center gap-2 group"
              title={CREATE_ALL_ACCORDIONS.every(a => createOpenAccordions.includes(a)) ? "Fechar todos" : "Abrir todos"}
            >
              <span className="text-xs text-slate-500 group-hover:text-slate-700 transition-colors select-none">
                {CREATE_ALL_ACCORDIONS.every(a => createOpenAccordions.includes(a)) ? "Fechar" : "Expandir"}
              </span>
              <div className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${
                CREATE_ALL_ACCORDIONS.every(a => createOpenAccordions.includes(a)) ? "bg-blue-600" : "bg-slate-300"
              }`}>
                <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
                  CREATE_ALL_ACCORDIONS.every(a => createOpenAccordions.includes(a)) ? "translate-x-4" : "translate-x-0.5"
                }`} />
              </div>
            </button>
          </div>
          <Accordion type="multiple" value={createOpenAccordions} onValueChange={setCreateOpenAccordions} className="space-y-2">
            {/* SEÇÃO 1: DADOS CADASTRAIS */}
            <AccordionItem value="cadastrais" className={cn("border rounded-lg overflow-hidden", sectionErrors.cadastrais > 0 ? "border-red-300" : "border-slate-200")}>
              <AccordionTrigger className={cn("px-3 py-2 text-xs font-semibold", sectionErrors.cadastrais > 0 ? "bg-red-50 hover:bg-red-100" : "bg-white hover:bg-slate-50")}>
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-100 text-blue-700">1</Badge>
                  Dados Cadastrais da Empresa
                  {sectionErrors.cadastrais > 0 && (
                    <span className="ml-1 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">{sectionErrors.cadastrais}</span>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="border-t bg-white px-3 py-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs font-medium text-slate-600">Razão Social *</Label>
                      <Input placeholder="Empresa LTDA" value={formData.razaoSocial} onChange={(e) => updateField("razaoSocial", e.target.value)} className={cn("h-8 text-xs", errors.razaoSocial && "border-red-400")} />
                      {errors.razaoSocial && <p className="text-xs text-red-500">{errors.razaoSocial}</p>}
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs font-medium text-slate-600">Nome Fantasia *</Label>
                      <Input placeholder="Empresa" value={formData.nomeFantasia} onChange={(e) => updateField("nomeFantasia", e.target.value)} className={cn("h-8 text-xs", errors.nomeFantasia && "border-red-400")} />
                      {errors.nomeFantasia && <p className="text-xs text-red-500">{errors.nomeFantasia}</p>}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-slate-600">CNPJ *</Label>
                      <Input placeholder="12.345.678/0001-90" value={formData.cnpj} onChange={(e) => updateField("cnpj", e.target.value)} className={cn("h-8 text-xs", errors.cnpj && "border-red-400")} />
                      {errors.cnpj && <p className="text-xs text-red-500">{errors.cnpj}</p>}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-slate-600">Inscrição Estadual</Label>
                      <Input placeholder="Opcional" value={formData.inscricaoEstadual} onChange={(e) => updateField("inscricaoEstadual", e.target.value)} className="h-8 text-xs" />
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* SEÇÃO 2: CONTATO */}
            <AccordionItem value="contato" className={cn("border rounded-lg overflow-hidden", sectionErrors.contato > 0 ? "border-red-300" : "border-slate-200")}>
              <AccordionTrigger className={cn("px-3 py-2 text-xs font-semibold", sectionErrors.contato > 0 ? "bg-red-50 hover:bg-red-100" : "bg-white hover:bg-slate-50")}>
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-100 text-green-700">2</Badge>
                  Contato
                  {sectionErrors.contato > 0 && (
                    <span className="ml-1 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">{sectionErrors.contato}</span>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="border-t bg-white px-3 py-3 grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs font-medium text-slate-600">Email Principal *</Label>
                    <div className="relative">
                      <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                      <Input type="email" placeholder="contact@empresa.com" value={formData.emailPrincipal} onChange={(e) => updateField("emailPrincipal", e.target.value)} className={cn("h-8 text-xs pl-8", errors.emailPrincipal && "border-red-400")} />
                    </div>
                    {errors.emailPrincipal && <p className="text-xs text-red-500">{errors.emailPrincipal}</p>}
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs font-medium text-slate-600">Telefone *</Label>
                    <div className="relative">
                      <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                      <Input placeholder="(11) 98765-4321" value={formData.telefone} onChange={(e) => updateField("telefone", e.target.value)} className={cn("h-8 text-xs pl-8", errors.telefone && "border-red-400")} />
                    </div>
                    {errors.telefone && <p className="text-xs text-red-500">{errors.telefone}</p>}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* SEÇÃO 3: REDES SOCIAIS */}
            <AccordionItem value="social" className="border border-slate-200 rounded-lg overflow-hidden">
              <AccordionTrigger className="px-3 py-2 bg-white hover:bg-slate-50 text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-100 text-blue-700">3</Badge>
                  Redes Sociais
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-3 py-2">
                <CompanySocialLinksManager
                  socialLinks={formData.socialLinks}
                  onChange={(links) => updateField("socialLinks", links)}
                />
              </AccordionContent>
            </AccordionItem>

            {/* SEÇÃO 4: ENDEREÇO */}
            <AccordionItem value="endereco" className={cn("border rounded-lg overflow-hidden", sectionErrors.endereco > 0 ? "border-red-300" : "border-slate-200")}>
              <AccordionTrigger className={cn("px-3 py-2 text-xs font-semibold", sectionErrors.endereco > 0 ? "bg-red-50 hover:bg-red-100" : "bg-white hover:bg-slate-50")}>
                <div className="flex items-center gap-2">
                  <Badge className="bg-purple-100 text-purple-700">4</Badge>
                  Endereço
                  {sectionErrors.endereco > 0 && (
                    <span className="ml-1 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">{sectionErrors.endereco}</span>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 py-4 space-y-6">
                {/* Seletor de Endereço com Mapa */}
                <div className="col-span-2">
                  <Label className="text-sm font-semibold mb-3 block">Localização (Selecione no Mapa) *</Label>
                  <AddressMapPicker
                    address={{
                      street: formData.rua,
                      number: formData.numero,
                      district: formData.complemento,
                      city: formData.cidade,
                      state: formData.estado,
                      zipcode: formData.cep,
                      lat: formData.latitude,
                      lng: formData.longitude,
                    }}
                    onAddressChange={(address) => {
                      updateField("rua", address.street)
                      updateField("numero", address.number)
                      updateField("complemento", address.district)
                      updateField("cidade", address.city)
                      updateField("estado", address.state)
                      updateField("cep", address.zipcode)
                      updateField("latitude", address.lat)
                      updateField("longitude", address.lng)
                      if (address.placeId) updateField("place_id", address.placeId)
                      if (address.formatted) updateField("formatted_address", address.formatted)
                    }}
                  />
                </div>

                {/* Campos Manuais (para correção rápida) */}
                <div className="border-t pt-4">
                  <p className="text-xs text-gray-600 mb-4">Você também pode editar os campos abaixo manualmente</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label className="text-sm font-semibold">CEP</Label>
                      <Input
                        placeholder="01310-100"
                        value={formData.cep}
                        onChange={(e) => updateField("cep", e.target.value)}
                      />
                    </div>

                    <div className="col-span-2">
                      <Label className="text-sm font-semibold">Rua *</Label>
                      <Input
                        placeholder="Avenida Paulista"
                        value={formData.rua}
                        onChange={(e) => updateField("rua", e.target.value)}
                        className={errors.rua ? "border-red-500" : ""}
                      />
                      {errors.rua && <p className="text-xs text-red-500 mt-1">{errors.rua}</p>}
                    </div>

                    <div>
                      <Label className="text-sm font-semibold">Número *</Label>
                      <Input
                        placeholder="1000"
                        value={formData.numero}
                        onChange={(e) => updateField("numero", e.target.value)}
                        className={errors.numero ? "border-red-500" : ""}
                      />
                      {errors.numero && <p className="text-xs text-red-500 mt-1">{errors.numero}</p>}
                    </div>

                    <div>
                      <Label className="text-sm font-semibold">Complemento</Label>
                      <Input
                        placeholder="Apto 1000"
                        value={formData.complemento}
                        onChange={(e) => updateField("complemento", e.target.value)}
                      />
                    </div>

                    <div>
                      <Label className="text-sm font-semibold">Cidade *</Label>
                      <Input
                        placeholder="São Paulo"
                        value={formData.cidade}
                        onChange={(e) => updateField("cidade", e.target.value)}
                        className={errors.cidade ? "border-red-500" : ""}
                      />
                      {errors.cidade && <p className="text-xs text-red-500 mt-1">{errors.cidade}</p>}
                    </div>

                    <div>
                      <Label className="text-sm font-semibold">Estado *</Label>
                      <Select value={formData.estado} onValueChange={(value) => updateField("estado", value)}>
                        <SelectTrigger className={errors.estado ? "border-red-500" : ""}>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SP">SP</SelectItem>
                          <SelectItem value="RJ">RJ</SelectItem>
                          <SelectItem value="MG">MG</SelectItem>
                          <SelectItem value="BA">BA</SelectItem>
                          <SelectItem value="SC">SC</SelectItem>
                          <SelectItem value="PR">PR</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.estado && <p className="text-xs text-red-500 mt-1">{errors.estado}</p>}
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* SEÇÃO 5: TIPO DE CONTA */}
            <AccordionItem value="tipoConta" className="border border-slate-200 rounded-lg overflow-hidden">
              <AccordionTrigger className="px-3 py-2 bg-white hover:bg-slate-50 text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <Badge className="bg-orange-100 text-orange-700">5</Badge>
                  Tipo de Conta
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="border-t bg-white px-3 py-3">
                  <RadioGroup value={formData.tipoContato} onValueChange={(value) => updateField("tipoContato", value)} className="grid grid-cols-2 gap-2">
                    {[
                      { value: "dependent", label: "Dependente", desc: "Gerenciada por outra company", color: "border-blue-200 hover:border-blue-400 hover:bg-blue-50", dot: "bg-blue-500" },
                      { value: "independent", label: "Independente", desc: "Autonomia total", color: "border-green-200 hover:border-green-400 hover:bg-green-50", dot: "bg-green-500" },
                      { value: "agency", label: "Agency", desc: "Gestora de projetos", color: "border-purple-200 hover:border-purple-400 hover:bg-purple-50", dot: "bg-purple-500" },
                      { value: "partner", label: "Partner", desc: "Parceiro de plataforma", color: "border-red-200 hover:border-red-400 hover:bg-red-50", dot: "bg-red-500" },
                    ].map((opt) => (
                      <label key={opt.value} className={cn("flex items-start gap-2 p-2.5 rounded-lg border bg-white cursor-pointer transition-all", opt.color, formData.tipoContato === opt.value && "ring-2 ring-offset-1 ring-blue-400")}>
                        <RadioGroupItem value={opt.value} className="mt-0.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-800 flex items-center gap-1.5"><span className={cn("h-2 w-2 rounded-full flex-shrink-0", opt.dot)} />{opt.label}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                        </div>
                      </label>
                    ))}
                  </RadioGroup>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* SEÇÃO 6: PLANO DE CRÉDITOS */}
            <AccordionItem value="plano" className="border border-slate-200 rounded-lg overflow-hidden">
              <AccordionTrigger className="px-3 py-2 bg-white hover:bg-slate-50 text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <Badge className="bg-indigo-100 text-indigo-700">6</Badge>
                  Plano de Créditos
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="border-t bg-white px-3 py-3 space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-slate-600">Plano</Label>
                    <Select value={formData.planoCreditoId} onValueChange={(value) => updateField("planoCreditoId", value)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lite">Lite — R$ 300/mês (ativa conta agency)</SelectItem>
                        <SelectItem value="start">Start — R$ 500/mês (5% desconto)</SelectItem>
                        <SelectItem value="standard">Standard — R$ 1.000/mês (10% desconto)</SelectItem>
                        <SelectItem value="growth">Growth — R$ 1.500/mês (15% desconto)</SelectItem>
                        <SelectItem value="scale">Scale — R$ 3.000/mês (20% desconto)</SelectItem>
                        <SelectItem value="squad">Squad — R$ 5.000/mês (agências — 20% + pós pago)</SelectItem>
                        <SelectItem value="enterprise">Enterprise — R$ 5.000/mês (empresas — pós pago)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* SEÇÃO 7: MÉTODOS DE PAGAMENTO */}
            <AccordionItem value="pagamento" className="border border-slate-200 rounded-lg overflow-hidden">
              <AccordionTrigger className="px-3 py-2 bg-white hover:bg-slate-50 text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <Badge className="bg-cyan-100 text-cyan-700">7</Badge>
                  Métodos de Pagamento
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="border-t bg-white px-3 py-3">
                  <p className="text-xs font-medium text-slate-600 mb-2">Método Padrão</p>
                  <RadioGroup value={formData.metodoPagamento} onValueChange={(value) => updateField("metodoPagamento", value)} className="grid grid-cols-2 gap-2">
                    {[
                      { value: "pix", label: "PIX", emoji: "⚡" },
                      { value: "boleto", label: "Boleto", emoji: "📄" },
                      { value: "cartao", label: "Cartão de Crédito", emoji: "💳" },
                      { value: "allkoin", label: "ALLKOIN", emoji: "🪙" },
                    ].map((opt) => (
                      <label key={opt.value} className={cn("flex items-center gap-2 px-3 py-2 rounded-lg border bg-white cursor-pointer transition-all text-xs font-medium text-slate-700 hover:border-cyan-300 hover:bg-cyan-50", formData.metodoPagamento === opt.value && "border-cyan-400 bg-cyan-50 ring-2 ring-offset-1 ring-cyan-300")}>
                        <RadioGroupItem value={opt.value} className="flex-shrink-0" />
                        <span>{opt.emoji}</span>
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </RadioGroup>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* SEÇÃO 8: USUÁRIO ADMINISTRADOR */}
            <AccordionItem value="admin" className={cn("border rounded-lg overflow-hidden", sectionErrors.admin > 0 ? "border-red-300" : "border-slate-200")}>
              <AccordionTrigger className={cn("px-3 py-2 text-xs font-semibold", sectionErrors.admin > 0 ? "bg-red-50 hover:bg-red-100" : "bg-white hover:bg-slate-50")}>
                <div className="flex items-center gap-2">
                  <Badge className="bg-rose-100 text-rose-700">8</Badge>
                  Usuário Administrador Inicial
                  {sectionErrors.admin > 0 && (
                    <span className="ml-1 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">{sectionErrors.admin}</span>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="border-t bg-white px-3 py-3 space-y-3">
                  <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-100">
                    <AlertCircle className="h-3.5 w-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-700">Este será o primeiro usuário com acesso total à empresa</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-slate-600">Nome *</Label>
                    <div className="relative">
                      <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                      <Input placeholder="João Silva" value={formData.nomeAdmin} onChange={(e) => updateField("nomeAdmin", e.target.value)} className={cn("h-8 text-xs pl-8", errors.nomeAdmin && "border-red-400")} />
                    </div>
                    {errors.nomeAdmin && <p className="text-xs text-red-500">{errors.nomeAdmin}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-slate-600">Email *</Label>
                    <div className="relative">
                      <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                      <Input type="email" placeholder="joao@empresa.com" value={formData.emailAdmin} onChange={(e) => updateField("emailAdmin", e.target.value)} className={cn("h-8 text-xs pl-8", errors.emailAdmin && "border-red-400")} />
                    </div>
                    {errors.emailAdmin && <p className="text-xs text-red-500">{errors.emailAdmin}</p>}
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 border border-slate-200">
                    <Check className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                    <span className="text-xs text-slate-600">Perfil: <span className="font-semibold text-slate-800">Administrador</span></span>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-800">
              A empresa será criada e o usuário administrador receberá um convite por email para configurar sua senha.
            </p>
          </div>
        </div>

        {/* Rodapé Fixo */}
        <div className="flex items-center justify-between gap-3 px-[25px] py-[15px] border-t bg-gray-50 flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button
            className="bg-gradient-to-r from-blue-600 to-fuchsia-600 hover:from-blue-700 hover:to-fuchsia-700"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Criando..." : "Criar Empresa"}
          </Button>
        </div>
        </div>
      </div>

      {/* Diálogo de Confirmação */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Criação de Empresa</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente criar a empresa <strong>{formData.nomeFantasia}</strong> com as configurações informadas?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSubmit} className="bg-blue-600 hover:bg-blue-700">
              Criar Empresa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
