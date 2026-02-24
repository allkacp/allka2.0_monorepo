// @ts-nocheck
import { Textarea } from "@/components/ui/textarea"

import { Label } from "@/components/ui/label"

import React from "react"

import { useState, useRef } from "react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { ConfirmationDialog } from "@/components/confirmation-dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  User,
  Copy,
  FileText,
  Ban,
  Download,
  Info,
  Zap,
  CreditCard,
  Wallet,
  Filter,
  ArrowUpDown,
  Calendar,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Upload,
  Trash2,
  File,
  CheckCircle,
  Plus,
  ExternalLink,
  Share2,
  Edit,
  Users,
  X,
  UserPlus,
  Edit2,
  Building2,
  Package,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  BarChart3,
  Star,
  Activity,
  List,
  LayoutGrid,
  Save,
  Trash,
  XCircle,
  Loader2,
  Camera,
  ZoomIn,
  Crosshair,
  FolderKanban,
  Palette,
  CheckSquare,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast" // Import useToast
import { DialogFooter } from "@/components/ui/dialog"
import { ChevronLeft, ChevronRight, Search, ChevronDown } from "lucide-react"
import { ModalBrandHeader } from "@/components/ui/modal-brand-header"
import { useSidebar } from "@/contexts/sidebar-context"

interface Project {
  id: number
  name: string
  client: string
  company: string
  type: string
  status: string
  progress: number
  budget: number
  spent: number
  startDate: string
  deadline: string
  team: number
  nomades: string[]
}

interface ProjectManagementModalProps {
  project: Project | null
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "view" | "edit" | "create"
  onEdit?: () => void
  onClone?: () => void
  onExport?: () => void
  onSave?: (project: any) => void
  onCancel?: () => void
}

export function ProjectManagementModal({ project, open, onOpenChange, mode, onEdit, onClone, onExport, onSave, onCancel }: ProjectManagementModalProps) {
  const { toast } = useToast()
  const { sidebarWidth } = useSidebar()

  // Avatar / crop state
  const [avatar, setAvatar] = useState<string | null>(null)
  const [showAvatarMenu, setShowAvatarMenu] = useState(false)
  const [originalRawSrc, setOriginalRawSrc] = useState<string | null>(null)
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null)
  const [cropOpen, setCropOpen] = useState(false)
  const [cropZoom, setCropZoom] = useState(1)
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 })
  const [isDraggingCrop, setIsDraggingCrop] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cropImgRef = useRef<HTMLImageElement>(null)
  const CROP_SIZE = 192

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

  const [selectedFile, setSelectedFile] = useState<any>(null)

  // Header color / theme
  const [headerBg, setHeaderBg] = useState<string | null>(null)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [customHeaderColor, setCustomHeaderColor] = useState("#1e293b")

  const HEADER_PRESETS: { label: string; value: string | null; preview: string }[] = [
    { label: "Padrão",     value: null,                                                                             preview: "linear-gradient(135deg,#000 0%,#1a2a6f 45%,#c81a7f 100%)" },
    { label: "Oceano",     value: "linear-gradient(135deg,#0f172a 0%,#0e4d8c 50%,#0891b2 100%)",                   preview: "linear-gradient(135deg,#0f172a 0%,#0e4d8c 50%,#0891b2 100%)" },
    { label: "Pôr do Sol", value: "linear-gradient(135deg,#1c0533 0%,#7c1d6f 50%,#f97316 100%)",                   preview: "linear-gradient(135deg,#1c0533 0%,#7c1d6f 50%,#f97316 100%)" },
    { label: "Natureza",   value: "linear-gradient(135deg,#052e16 0%,#166534 50%,#4ade80 100%)",                   preview: "linear-gradient(135deg,#052e16 0%,#166534 50%,#4ade80 100%)" },
    { label: "Fogo",       value: "linear-gradient(135deg,#450a0a 0%,#b91c1c 50%,#f97316 100%)",                   preview: "linear-gradient(135deg,#450a0a 0%,#b91c1c 50%,#f97316 100%)" },
    { label: "Noite",      value: "linear-gradient(135deg,#0f0f0f 0%,#1e1e3f 50%,#312e81 100%)",                   preview: "linear-gradient(135deg,#0f0f0f 0%,#1e1e3f 50%,#312e81 100%)" },
    { label: "Aurora",     value: "linear-gradient(135deg,#0f172a 0%,#4f46e5 45%,#06b6d4 100%)",                   preview: "linear-gradient(135deg,#0f172a 0%,#4f46e5 45%,#06b6d4 100%)" },
    { label: "Rubi",       value: "linear-gradient(135deg,#1c0533 0%,#be123c 50%,#f43f5e 100%)",                   preview: "linear-gradient(135deg,#1c0533 0%,#be123c 50%,#f43f5e 100%)" },
    { label: "Carvão",     value: "linear-gradient(135deg,#111827 0%,#374151 50%,#6b7280 100%)",                   preview: "linear-gradient(135deg,#111827 0%,#374151 50%,#6b7280 100%)" },
    { label: "Esmeralda",  value: "linear-gradient(135deg,#022c22 0%,#065f46 50%,#10b981 100%)",                   preview: "linear-gradient(135deg,#022c22 0%,#065f46 50%,#10b981 100%)" },
    { label: "Índigo",     value: "linear-gradient(135deg,#1e1b4b 0%,#4338ca 50%,#818cf8 100%)",                   preview: "linear-gradient(135deg,#1e1b4b 0%,#4338ca 50%,#818cf8 100%)" },
    { label: "Âmbar",      value: "linear-gradient(135deg,#451a03 0%,#b45309 50%,#fbbf24 100%)",                   preview: "linear-gradient(135deg,#451a03 0%,#b45309 50%,#fbbf24 100%)" },
  ]

  const getHeaderStyle = (): React.CSSProperties | undefined => {
    if (!headerBg) return undefined
    return { background: headerBg }
  }
  const [showFileDetails, setShowFileDetails] = useState(false)
  const [fileTypeFilter, setFileTypeFilter] = useState<string>("all")
  const [fileProductFilter, setFileProductFilter] = useState<string>("all")
  const [fileDateFilter, setFileDateFilter] = useState<string>("")
  const [productTypeFilter, setProductTypeFilter] = useState<string>("all")
  const [productStatusFilter, setProductStatusFilter] = useState<string>("all")
  const [productDateFilter, setProductDateFilter] = useState<string>("")
  const [productTaskStatusFilter, setProductTaskStatusFilter] = useState<string>("all")
  const [taskFontSize, setTaskFontSize] = useState<"sm" | "base" | "lg">("sm")
  const [selectedCredential, setSelectedCredential] = useState<any>(null)
  const [showCredentialDetails, setShowCredentialDetails] = useState(false) // Corrected state name
  const [visiblePasswords, setVisiblePasswords] = useState<{ [key: number]: boolean }>({})
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState<string>("carteira")
  const [savedCards, setSavedCards] = useState([
    { id: 1, number: "**** **** **** 1234", name: "Visa", expiry: "12/25", isDefault: true },
    { id: 2, number: "**** **** **** 5678", name: "Mastercard", expiry: "06/26", isDefault: false },
  ])
  const [walletBalance] = useState(2847.5)
  const [allkoinBalance] = useState(1523.0)
  const [allkoinExchangeRate] = useState(1.0)
  const [showInvoiceDetails, setShowInvoiceDetails] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null)

  const [productSortBy, setProductSortBy] = useState<string>("nome")

  // Dados do Projeto tab
  const DADOS_PROJECT_ACCORDIONS = ["info", "descricao"]
  const [dadosProjOpenAccordions, setDadosProjOpenAccordions] = useState<string[]>(["info"])
  const [isDadosProjEditMode, setIsDadosProjEditMode] = useState(false)
  const [isSavingDados, setIsSavingDados] = useState(false)
  const [showDadosProjSaveConfirm, setShowDadosProjSaveConfirm] = useState(false)
  const [showDadosProjCancelConfirm, setShowDadosProjCancelConfirm] = useState(false)
  const [dadosProjForm, setDadosProjForm] = useState({
    situacao: "AGUARDANDO PAGAMENTO",
    agencia: "Lamego Academy",
    consultor: "Equipe Lamego",
    emailConsultor: "contato@lamego.com.vc",
    cliente: "Florescer",
    dataCriacao: "19/02/2025",
    permitePortfolio: false,
    sincronizadoBitrix: false,
    descricao: "Projeto de hospedagem e cuidados para idosos da empresa Florescer. Inclui desenvolvimento de website institucional, sistema de gestão de pacientes, e materiais de marketing digital para divulgação dos serviços.",
  })

  const handleDadosProjSave = async () => {
    setIsSavingDados(true)
    await new Promise(r => setTimeout(r, 800))
    setIsSavingDados(false)
    setIsDadosProjEditMode(false)
  }
  const [productSortOrder, setProductSortOrder] = useState<"asc" | "desc">("asc")
  const [productPercentageFilter, setProductPercentageFilter] = useState<string>("all")
  const [showProductFilters, setShowProductFilters] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [showProductTasksModal, setShowProductTasksModal] = useState(false)

  const [approvedFileTypeFilter, setApprovedFileTypeFilter] = useState("all")
  const [approvedFileSortOrder, setApprovedFileSortOrder] = useState("recent")
  const [showAddFileDialog, setShowAddFileDialog] = useState(false)
  const [newFileName, setNewFileName] = useState("")
  const [editedProject, setEditedProject] = useState<Partial<Project> | null>(null)
  const [editedProducts, setEditedProducts] = useState<any[]>([])

  // Initialize edited data when switching to edit mode
  React.useEffect(() => {
    if (mode === "edit" && project) {
      setEditedProject({ ...project })
      setEditedProducts(project.products || [])
    }
  }, [mode, project])
  const [showEditCredentialDialog, setShowEditCredentialDialog] = useState(false)
  const [showDeleteCredentialDialog, setShowDeleteCredentialDialog] = useState(false)
  const [editingCredential, setEditingCredential] = useState<any>(null)
  const [fileSortOrder, setFileSortOrder] = useState<"recent" | "oldest" | "name" | "size">("recent") // Added fileSortOrder

  const [editPasswordVisible, setEditPasswordVisible] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState("")

  // Added state for new user access form
  const [newAccessUser, setNewAccessUser] = useState("select-user")
  const [newAccessPermission, setNewAccessPermission] = useState("view")
  const [newAccessExpiration, setNewAccessExpiration] = useState("")
  const [hasExpiration, setHasExpiration] = useState(true)

  // Added state for share credential sheet
  const [showShareCredential, setShowShareCredential] = useState(false)

  const [taskStatusFilter, setTaskStatusFilter] = useState<string>("all")
  const [taskProductFilter, setTaskProductFilter] = useState<string>("all")
  const [taskDateFilter, setTaskDateFilter] = useState<string>("")
  const [taskSortBy, setTaskSortBy] = useState<string>("produto")
  const [taskSortOrder, setTaskSortOrder] = useState<"asc" | "desc">("asc")
  const [showTaskFilters, setShowTaskFilters] = useState(false)
  const [tasksViewMode, setTasksViewMode] = useState<"list" | "kanban">("list")

  const [tasksCurrentPage, setTasksCurrentPage] = useState(1)
  const [tasksPerPage, setTasksPerPage] = useState(10)
  const [taskSearchTerm, setTaskSearchTerm] = useState("")
  // Removed duplicate: const [showProductFilters, setShowProductFilters] = useState(false)

  // State for mock credentials, to allow updates
  const [mockCredentials, setMockCredentials] = useState<any[]>([
    {
      id: 1,
      title: "Admin WordPress",
      url: "https://florescer.com.br/wp-admin",
      username: "admin@florescer.com.br",
      password: "Wp@dm1n2025!",
      category: "Website",
      sharedWith: ["João Silva", "Maria Santos"],
    },
    {
      id: 2,
      title: "Servidor Hospedagem",
      url: "https://console.vercel.com",
      username: "florescer_admin",
      password: "V3rc3l#2025@Host",
      category: "Infraestrutura",
      sharedWith: ["Carlos Lima"],
    },
    {
      id: 3,
      title: "Email Marketing",
      url: "https://mailchimp.com",
      username: "marketing@florescer.com.br",
      password: "M@ilCh1mp!2025",
      category: "Marketing",
      sharedWith: ["Fernanda Dias", "Beatriz Souza", "Ricardo Alves"],
    },
    {
      id: 4,
      title: "Google Analytics",
      url: "https://analytics.google.com",
      username: "analytics@florescer.com.br",
      password: "G00gl3@n@lyt1cs!",
      category: "Analytics",
      sharedWith: ["João Silva"],
    },
  ])

  const isReadOnly = mode === "view"

  const mockData = {
    situacao: "AGUARDANDO PAGAMENTO",
    agencia: "Lamego Academy",
    consultorResponsavel: "Equipe Lamego",
    emailConsultor: "contato@lamego.com.vc",
    cliente: "Florescer",
    dataCriacao: "19/02/2025",
    sincronizadoBitrix: false,
    permitePortfolio: false,
    descricao:
      "Projeto de hospedagem e cuidados para idosos da empresa Florescer. Inclui desenvolvimento de website institucional, sistema de gestão de pacientes, e materiais de marketing digital para divulgação dos serviços.",
    produtos: [
      {
        id: 1,
        nome: "Website Institucional",
        tipo: "Avulso",
        valor: 15000,
        dataContratacao: "19/02/2025",
        dataEntrega: "22/03/2025",
        status: "Em Desenvolvimento",
        progresso: 65,
        tarefasConcluidas: 8,
        tarefasTotais: 12,
        tarefas: [
          {
            id: 1,
            nome: "Design Homepage",
            status: "Aprovada",
            executor: "João Silva",
            lider: "Carlos Lima",
            prazo: "15/02/2025",
          },
          {
            id: 2,
            nome: "Desenvolvimento Frontend",
            status: "Em Execução",
            executor: "Maria Santos",
            lider: "Carlos Lima",
            prazo: "05/03/2025",
          },
          {
            id: 3,
            nome: "Integração API",
            status: "Para Aprovação",
            executor: "Pedro Costa",
            lider: "Maria Santos",
            prazo: "10/03/2025",
          },
          {
            id: 4,
            nome: "Testes de Usabilidade",
            status: "Entregue",
            executor: "Ana Oliveira",
            lider: "João Silva",
            prazo: "18/03/2025",
          },
          {
            id: 5,
            nome: "Design Páginas Internas",
            status: "Aprovada",
            executor: "João Silva",
            lider: "Carlos Lima",
            prazo: "20/02/2025",
          },
          {
            id: 6,
            nome: "Desenvolvimento Backend",
            status: "Aprovada",
            executor: "Carlos Lima",
            lider: "Maria Santos",
            prazo: "25/02/2025",
          },
          {
            id: 7,
            nome: "Otimização SEO",
            status: "Em Execução",
            executor: "Fernanda Dias",
            lider: "Carlos Lima",
            prazo: "12/03/2025",
          },
          {
            id: 8,
            nome: "Configuração Hospedagem",
            status: "Aprovada",
            executor: "Rafael Gomes",
            lider: "Pedro Costa",
            prazo: "18/02/2025",
          },
          {
            id: 9,
            nome: "Testes de Performance",
            status: "Atrasada",
            executor: "Beatriz Souza",
            lider: "João Silva",
            prazo: "10/01/2025",
          },
          {
            id: 10,
            nome: "Configuração CDN",
            status: "Para Aprovação",
            executor: "Thiago Barbosa",
            lider: "Pedro Costa",
            prazo: "22/03/2025",
          },
          {
            id: 11,
            nome: "Testes Cross-browser",
            status: "Atrasada",
            executor: "Julia Rocha",
            lider: "Maria Santos",
            prazo: "05/01/2025",
          },
          {
            id: 12,
            nome: "Deploy Final",
            status: "Para Aprovação",
            executor: "Sergio Mendes",
            lider: "Carlos Lima",
            prazo: "22/03/2025",
          },
        ],
      },
      {
        id: 2,
        nome: "Sistema de Gestão",
        tipo: "Mensal",
        valorMensal: 2500,
        dataContratacao: "19/02/2025",
        dataEntrega: "15/04/2025",
        status: "Planejamento",
        progresso: 15,
        tarefasConcluidas: 2,
        tarefasTotais: 15,
        tarefas: [
          {
            id: 1,
            nome: "Levantamento de Requisitos",
            status: "Aprovada",
            executor: "Carlos Lima",
            lider: "Maria Santos",
            prazo: "25/02/2025",
          },
          {
            id: 2,
            nome: "Arquitetura do Sistema",
            status: "Em Execução",
            executor: "Julia Rocha",
            lider: "Carlos Lima",
            prazo: "10/03/2025",
          },
          {
            id: 3,
            nome: "Design Database",
            status: "Em Execução",
            executor: "Pedro Costa",
            lider: "Maria Santos",
            prazo: "15/03/2025",
          },
          {
            id: 4,
            nome: "Prototipação UI",
            status: "Para Aprovação",
            executor: "João Silva",
            lider: "Carlos Lima",
            prazo: "20/03/2025",
          },
          {
            id: 5,
            nome: "API REST Development",
            status: "Para Aprovação",
            executor: "Maria Santos",
            lider: "Pedro Costa",
            prazo: "25/03/2025",
          },
          {
            id: 6,
            nome: "Autenticação e Autorização",
            status: "Para Aprovação",
            executor: "Rafael Gomes",
            lider: "Maria Santos",
            prazo: "30/03/2025",
          },
          {
            id: 7,
            nome: "Módulo de Pacientes",
            status: "Para Aprovação",
            executor: "Ana Oliveira",
            lider: "João Silva",
            prazo: "05/04/2025",
          },
          {
            id: 8,
            nome: "Módulo de Agendamentos",
            status: "Para Aprovação",
            executor: "Carlos Lima",
            lider: "Maria Santos",
            prazo: "10/04/2025",
          },
          {
            id: 9,
            nome: "Módulo Financeiro",
            status: "Para Aprovação",
            executor: "Fernanda Dias",
            lider: "Carlos Lima",
            prazo: "15/04/2025",
          },
          {
            id: 10,
            nome: "Relatórios e Analytics",
            status: "Para Aprovação",
            executor: "Beatriz Souza",
            lider: "Pedro Costa",
            prazo: "20/04/2025",
          },
          {
            id: 11,
            nome: "Integração WhatsApp",
            status: "Para Aprovação",
            executor: "Thiago Barbosa",
            lider: "Maria Santos",
            prazo: "25/04/2025",
          },
          {
            id: 12,
            nome: "Backup Automático",
            status: "Para Aprovação",
            executor: "Sergio Mendes",
            lider: "Carlos Lima",
            prazo: "01/05/2025",
          },
          {
            id: 13,
            nome: "Testes Unitários",
            status: "Para Aprovação",
            executor: "Daniela Cardoso",
            lider: "Pedro Costa",
            prazo: "05/05/2025",
          },
          {
            id: 14,
            nome: "Testes de Integração",
            status: "Para Aprovação",
            executor: "Lucas Martins",
            lider: "Maria Santos",
            prazo: "10/05/2025",
          },
          {
            id: 15,
            nome: "Documentação Técnica",
            status: "Para Aprovação",
            executor: "Patrícia Cunha",
            lider: "Carlos Lima",
            prazo: "15/05/2025",
          },
        ],
      },
      {
        id: 3,
        nome: "Identidade Visual",
        tipo: "Avulso",
        valor: 8000,
        dataContratacao: "01/03/2025",
        dataEntrega: "28/02/2025",
        status: "Não Iniciado",
        progresso: 0,
        tarefasConcluidas: 0,
        tarefasTotais: 8,
        tarefas: [
          {
            id: 1,
            nome: "Pesquisa de Mercado",
            status: "Para Aprovação",
            executor: "João Silva",
            lider: "Fernanda Dias",
            prazo: "10/02/2025",
          },
          {
            id: 2,
            nome: "Conceituação da Marca",
            status: "Para Aprovação",
            executor: "Fernanda Dias",
            lider: "João Silva",
            prazo: "15/02/2025",
          },
          {
            id: 3,
            nome: "Desenvolvimento Logo",
            status: "Para Aprovação",
            executor: "João Silva",
            lider: "Fernanda Dias",
            prazo: "20/02/2025",
          },
          {
            id: 4,
            nome: "Paleta de Cores",
            status: "Para Aprovação",
            executor: "Ana Oliveira",
            lider: "João Silva",
            prazo: "25/02/2025",
          },
          {
            id: 5,
            nome: "Tipografia",
            status: "Para Aprovação",
            executor: "Maria Santos",
            lider: "Fernanda Dias",
            prazo: "01/03/2025",
          },
          {
            id: 6,
            nome: "Manual da Marca",
            status: "Para Aprovação",
            executor: "Beatriz Souza",
            lider: "João Silva",
            prazo: "05/03/2025",
          },
          {
            id: 7,
            nome: "Aplicações da Marca",
            status: "Para Aprovação",
            executor: "Julia Rocha",
            lider: "Fernanda Dias",
            prazo: "10/03/2025",
          },
          {
            id: 8,
            nome: "Entrega de Arquivos",
            status: "Para Aprovação",
            executor: "João Silva",
            lider: "Carlos Lima",
            prazo: "15/03/2025",
          },
        ],
      },
      {
        id: 4,
        nome: "Marketing Digital",
        tipo: "Mensal",
        valorMensal: 3500,
        dataContratacao: "10/02/2025",
        dataEntrega: "10/03/2025",
        status: "Em Andamento",
        progresso: 45,
        tarefasConcluidas: 9,
        tarefasTotais: 20,
        tarefas: [
          {
            id: 1,
            nome: "Estratégia de Conteúdo",
            status: "Aprovada",
            executor: "Fernanda Dias",
            lider: "Beatriz Souza",
            prazo: "15/02/2025",
          },
          {
            id: 2,
            nome: "Criação de Posts",
            status: "Em Execução",
            executor: "Ricardo Alves",
            lider: "Fernanda Dias",
            prazo: "20/02/2025",
          },
          {
            id: 3,
            nome: "Gestão de Campanhas",
            status: "Para Aprovação",
            executor: "Beatriz Souza",
            lider: "Fernanda Dias",
            prazo: "25/02/2025",
          },
          {
            id: 4,
            nome: "Calendário Editorial",
            status: "Aprovada",
            executor: "Fernanda Dias",
            lider: "Beatriz Souza",
            prazo: "01/03/2025",
          },
          {
            id: 5,
            nome: "Design de Artes",
            status: "Aprovada",
            executor: "João Silva",
            lider: "Fernanda Dias",
            prazo: "05/03/2025",
          },
          {
            id: 6,
            nome: "Copywriting Posts",
            status: "Aprovada",
            executor: "Ricardo Alves",
            lider: "Fernanda Dias",
            prazo: "10/03/2025",
          },
          {
            id: 7,
            nome: "Gestão Instagram",
            status: "Aprovada",
            executor: "Beatriz Souza",
            lider: "Fernanda Dias",
            prazo: "15/03/2025",
          },
          {
            id: 8,
            nome: "Gestão Facebook",
            status: "Aprovada",
            executor: "Fernanda Dias",
            lider: "Beatriz Souza",
            prazo: "20/03/2025",
          },
          {
            id: 9,
            nome: "Google Ads Setup",
            status: "Aprovada",
            executor: "Thiago Barbosa",
            lider: "Beatriz Souza",
            prazo: "25/03/2025",
          },
          {
            id: 10,
            nome: "Facebook Ads Setup",
            status: "Em Execução",
            executor: "Ricardo Alves",
            lider: "Fernanda Dias",
            prazo: "01/04/2025",
          },
          {
            id: 11,
            nome: "Email Marketing",
            status: "Em Execução",
            executor: "Daniela Cardoso",
            lider: "Fernanda Dias",
            prazo: "05/04/2025",
          },
          {
            id: 12,
            nome: "Relatórios Mensais",
            status: "Para Aprovação",
            executor: "Sergio Mendes",
            lider: "Beatriz Souza",
            prazo: "10/04/2025",
          },
          {
            id: 13,
            nome: "SEO On-page",
            status: "Para Aprovação",
            executor: "Carlos Lima",
            lider: "Fernanda Dias",
            prazo: "15/04/2025",
          },
          {
            id: 14,
            nome: "Link Building",
            status: "Para Aprovação",
            executor: "Pedro Costa",
            lider: "Beatriz Souza",
            prazo: "20/04/2025",
          },
          {
            id: 15,
            nome: "Análise Concorrência",
            status: "Para Aprovação",
            executor: "Julia Rocha",
            lider: "Fernanda Dias",
            prazo: "25/04/2025",
          },
          {
            id: 16,
            nome: "Pesquisa Keywords",
            status: "Para Aprovação",
            executor: "Lucas Martins",
            lider: "Beatriz Souza",
            prazo: "30/04/2025",
          },
          {
            id: 17,
            nome: "Otimização Conversão",
            status: "Para Aprovação",
            executor: "Camila Ferreira",
            lider: "Fernanda Dias",
            prazo: "05/05/2025",
          },
          {
            id: 18,
            nome: "Testes A/B",
            status: "Para Aprovação",
            executor: "Rafael Gomes",
            lider: "Beatriz Souza",
            prazo: "10/05/2025",
          },
          {
            id: 19,
            nome: "Automação Marketing",
            status: "Para Aprovação",
            executor: "Patrícia Cunha",
            lider: "Fernanda Dias",
            prazo: "15/05/2025",
          },
          {
            id: 20,
            nome: "Estratégia Influencers",
            status: "Para Aprovação",
            executor: "Ana Oliveira",
            lider: "Beatriz Souza",
            prazo: "20/05/2025",
          },
        ],
      },
      {
        id: 5,
        nome: "App Mobile",
        tipo: "Avulso",
        valor: 25000,
        dataContratacao: "05/02/2025",
        dataEntrega: "05/04/2025",
        status: "Em Desenvolvimento",
        progresso: 85,
        tarefasConcluidas: 17,
        tarefasTotais: 20,
        tarefas: [
          {
            id: 1,
            nome: "Design UI/UX",
            status: "Aprovada",
            executor: "Lucas Martins",
            lider: "Ana Oliveira",
            prazo: "20/02/2025",
          },
          {
            id: 2,
            nome: "Desenvolvimento iOS",
            status: "Em Execução",
            executor: "Camila Ferreira",
            lider: "Lucas Martins",
            prazo: "05/03/2025",
          },
          {
            id: 3,
            nome: "Desenvolvimento Android",
            status: "Em Execução",
            executor: "Rafael Gomes",
            lider: "Lucas Martins",
            prazo: "05/03/2025",
          },
          {
            id: 4,
            nome: "Testes Beta",
            status: "Entregue",
            executor: "Patrícia Cunha",
            lider: "Camila Ferreira",
            prazo: "15/03/2025",
          },
          {
            id: 5,
            nome: "Setup Backend",
            status: "Aprovada",
            executor: "Carlos Lima",
            lider: "Rafael Gomes",
            prazo: "25/02/2025",
          },
          {
            id: 6,
            nome: "API Integration",
            status: "Aprovada",
            executor: "Maria Santos",
            lider: "Carlos Lima",
            prazo: "01/03/2025",
          },
          {
            id: 7,
            nome: "Push Notifications",
            status: "Aprovada",
            executor: "Pedro Costa",
            lider: "Maria Santos",
            prazo: "10/03/2025",
          },
          {
            id: 8,
            nome: "Auth System",
            status: "Aprovada",
            executor: "Rafael Gomes",
            lider: "Carlos Lima",
            prazo: "15/03/2025",
          },
          {
            id: 9,
            nome: "Offline Mode",
            status: "Aprovada",
            executor: "Camila Ferreira",
            lider: "Rafael Gomes",
            prazo: "20/03/2025",
          },
          {
            id: 10,
            nome: "Payment Gateway",
            status: "Aprovada",
            executor: "Thiago Barbosa",
            lider: "Carlos Lima",
            prazo: "25/03/2025",
          },
          {
            id: 11,
            nome: "Analytics Setup",
            status: "Aprovada",
            executor: "Sergio Mendes",
            lider: "Rafael Gomes",
            prazo: "01/04/2025",
          },
          {
            id: 12,
            nome: "Chat Feature",
            status: "Aprovada",
            executor: "Julia Rocha",
            lider: "Carlos Lima",
            prazo: "05/04/2025",
          },
          {
            id: 13,
            nome: "Video Call",
            status: "Aprovada",
            executor: "Lucas Martins",
            lider: "Rafael Gomes",
            prazo: "10/04/2025",
          },
          {
            id: 14,
            nome: "Map Integration",
            status: "Aprovada",
            executor: "Ana Oliveira",
            lider: "Carlos Lima",
            prazo: "15/04/2025",
          },
          {
            id: 15,
            nome: "Calendar Sync",
            status: "Aprovada",
            executor: "João Silva",
            lider: "Rafael Gomes",
            prazo: "20/04/2025",
          },
          {
            id: 16,
            nome: "Dark Mode",
            status: "Aprovada",
            executor: "Fernanda Dias",
            lider: "Carlos Lima",
            prazo: "25/04/2025",
          },
          {
            id: 17,
            nome: "Multi-language",
            status: "Aprovada",
            executor: "Beatriz Souza",
            lider: "Rafael Gomes",
            prazo: "30/04/2025",
          },
          {
            id: 18,
            nome: "App Store Submit",
            status: "Para Aprovação",
            executor: "Camila Ferreira",
            lider: "Lucas Martins",
            prazo: "05/05/2025",
          },
          {
            id: 19,
            nome: "Play Store Submit",
            status: "Para Aprovação",
            executor: "Rafael Gomes",
            lider: "Lucas Martins",
            prazo: "10/05/2025",
          },
          {
            id: 20,
            nome: "Marketing Materials",
            status: "Para Aprovação",
            executor: "Ricardo Alves",
            lider: "Fernanda Dias",
            prazo: "15/05/2025",
          },
        ],
      },
      {
        id: 6,
        nome: "Consultoria Estratégica",
        tipo: "Avulso",
        valor: 12000,
        dataContratacao: "15/01/2025",
        dataEntrega: "15/02/2025",
        status: "Concluído",
        progresso: 100,
        tarefasConcluidas: 10,
        tarefasTotais: 10,
        tarefas: [
          {
            id: 1,
            nome: "Análise de Mercado",
            status: "Aprovada",
            executor: "Sergio Mendes",
            lider: "Daniela Cardoso",
            prazo: "20/01/2025",
          },
          {
            id: 2,
            nome: "Planejamento Estratégico",
            status: "Aprovada",
            executor: "Daniela Cardoso",
            lider: "Sergio Mendes",
            prazo: "25/01/2025",
          },
          {
            id: 3,
            nome: "Relatório Final",
            status: "Entregue",
            executor: "Thiago Barbosa",
            lider: "Daniela Cardoso",
            prazo: "01/02/2025",
          },
          {
            id: 4,
            nome: "Análise Concorrencial",
            status: "Aprovada",
            executor: "Carlos Lima",
            lider: "Sergio Mendes",
            prazo: "22/01/2025",
          },
          {
            id: 5,
            nome: "Definição Personas",
            status: "Aprovada",
            executor: "Fernanda Dias",
            lider: "Daniela Cardoso",
            prazo: "28/01/2025",
          },
          {
            id: 6,
            nome: "Jornada do Cliente",
            status: "Aprovada",
            executor: "Beatriz Souza",
            lider: "Sergio Mendes",
            prazo: "03/02/2025",
          },
          {
            id: 7,
            nome: "Posicionamento Marca",
            status: "Aprovada",
            executor: "Julia Rocha",
            lider: "Daniela Cardoso",
            prazo: "08/02/2025",
          },
          {
            id: 8,
            nome: "Plano de Ação",
            status: "Aprovada",
            executor: "Sergio Mendes",
            lider: "Beatriz Souza",
            prazo: "10/02/2025",
          },
          {
            id: 9,
            nome: "KPIs e Métricas",
            status: "Aprovada",
            executor: "Daniela Cardoso",
            lider: "Julia Rocha",
            prazo: "12/02/2025",
          },
          {
            id: 10,
            nome: "Apresentação Executiva",
            status: "Entregue",
            executor: "Thiago Barbosa",
            lider: "Sergio Mendes",
            prazo: "15/02/2025",
          },
        ],
      },
    ],
  }

  const mockVaultCredentials = [
    {
      id: 1,
      title: "Admin WordPress",
      url: "https://florescer.com.br/wp-admin",
      username: "admin@florescer.com.br",
      password: "Wp@dm1n2025!",
      category: "Website",
      sharedWith: ["João Silva", "Maria Santos"],
    },
    {
      id: 2,
      title: "Servidor Hospedagem",
      url: "https://console.vercel.com",
      username: "florescer_admin",
      password: "V3rc3l#2025@Host",
      category: "Infraestrutura",
      sharedWith: ["Carlos Lima"],
    },
    {
      id: 3,
      title: "Email Marketing",
      url: "https://mailchimp.com",
      username: "marketing@florescer.com.br",
      password: "M@ilCh1mp!2025",
      category: "Marketing",
      sharedWith: ["Fernanda Dias", "Beatriz Souza", "Ricardo Alves"],
    },
    {
      id: 4,
      title: "Google Analytics",
      url: "https://analytics.google.com",
      username: "analytics@florescer.com.br",
      password: "G00gl3@n@lyt1cs!",
      category: "Analytics",
      sharedWith: ["João Silva"],
    },
  ]

  const mockInvoices = [
    {
      id: 1,
      status: "PAGO",
      month: "OUTUBRO/2025",
      motivo: "PROJETO",
      descricao: "Pagamento referente ao projeto ID [1614]",
      competencia: "OUTUBRO/2025",
      dataCobran: "15/10/2025 10:16:14",
      dataPagamento: "15/10/2025 10:16:14",
      valor: 605.41,
      valorOriginal: 650.0,
      desconto: 44.59,
      descontoPercentual: 6.86,
      agencia: "Agência Digital Plus",
      agenciaId: "AGE-001",
      cliente: "Tech Solutions LTDA",
      clienteId: "CLI-1614",
      formaPagamento: "Carteira",
      produtos: [
        { nome: "Logo Design", quantidade: 1, valorUnitario: 350.0, valorTotal: 350.0 },
        { nome: "Brand Identity Kit", quantidade: 1, valorUnitario: 300.0, valorTotal: 300.0 },
      ],
    },
    {
      id: 2,
      status: "PAGO",
      month: "SETEMBRO/2025",
      motivo: "PROJETO",
      descricao: "Pagamento referente ao projeto ID [1614]",
      competencia: "SETEMBRO/2025",
      dataCobran: "23/09/2025 15:05:34",
      dataPagamento: "23/09/2025 15:05:34",
      valor: 117.94,
      valorOriginal: 150.0,
      desconto: 32.06,
      descontoPercentual: 21.37,
      agencia: "Agência Digital Plus",
      agenciaId: "AGE-001",
      cliente: "Tech Solutions LTDA",
      clienteId: "CLI-1614",
      formaPagamento: "Carteira",
      produtos: [{ nome: "Social Media Posts", quantidade: 10, valorUnitario: 15.0, valorTotal: 150.0 }],
    },
    {
      id: 3,
      status: "PAGO",
      month: "SETEMBRO/2025",
      motivo: "PROJETO",
      descricao: "Pagamento referente ao projeto ID [1614]",
      competencia: "SETEMBRO/2025",
      dataCobran: "10/09/2025 12:39:32",
      dataPagamento: "10/09/2025 12:39:32",
      valor: 621.13,
      valorOriginal: 621.13,
      desconto: 0,
      descontoPercentual: 0,
      agencia: "Agência Digital Plus",
      agenciaId: "AGE-001",
      cliente: "Tech Solutions LTDA",
      clienteId: "CLI-1614",
      formaPagamento: "Cartão de Crédito",
      produtos: [{ nome: "Website Development", quantidade: 1, valorUnitario: 621.13, valorTotal: 621.13 }],
    },
    {
      id: 4,
      status: "PAGO",
      month: "SETEMBRO/2025",
      motivo: "PROJETO",
      descricao: "Pagamento referente ao projeto ID [1614]",
      competencia: "SETEMBRO/2025",
      dataCobran: "04/09/2025 15:04:06",
      dataPagamento: "04/09/2025 15:04:06",
      valor: 770.52,
      valorOriginal: 850.0,
      desconto: 79.48,
      descontoPercentual: 9.35,
      agencia: "Creative Studio Brasil",
      agenciaId: "AGE-002",
      cliente: "Tech Solutions LTDA",
      clienteId: "CLI-1614",
      formaPagamento: "PIX",
      produtos: [
        { nome: "Marketing Campaign", quantidade: 1, valorUnitario: 500.0, valorTotal: 500.0 },
        { nome: "Content Creation", quantidade: 1, valorUnitario: 350.0, valorTotal: 350.0 },
      ],
    },
    {
      id: 5,
      status: "PAGO",
      month: "AGOSTO/2025",
      motivo: "PROJETO",
      descricao: "Pagamento referente ao projeto ID [1614]",
      competencia: "AGOSTO/2025",
      dataCobran: "28/08/2025 09:15:22",
      dataPagamento: "28/08/2025 09:15:22",
      valor: 1250.0,
      valorOriginal: 1250.0,
      desconto: 0,
      descontoPercentual: 0,
      agencia: "Agência Digital Plus",
      agenciaId: "AGE-001",
      cliente: "Tech Solutions LTDA",
      clienteId: "CLI-1614",
      formaPagamento: "Boleto",
      produtos: [{ nome: "E-commerce Platform", quantidade: 1, valorUnitario: 1250.0, valorTotal: 1250.0 }],
    },
    {
      id: 6,
      status: "PENDENTE",
      month: "NOVEMBRO/2025",
      motivo: "PROJETO",
      descricao: "Pagamento referente ao projeto ID [1614]",
      competencia: "NOVEMBRO/2025",
      dataCobran: "15/11/2025 10:00:00",
      dataPagamento: null,
      valor: 890.0,
      valorOriginal: 890.0,
      desconto: 0,
      descontoPercentual: 0,
      agencia: "Agência Digital Plus",
      agenciaId: "AGE-001",
      cliente: "Tech Solutions LTDA",
      clienteId: "CLI-1614",
      formaPagamento: "Carteira",
      produtos: [
        { nome: "SEO Optimization", quantidade: 1, valorUnitario: 450.0, valorTotal: 450.0 },
        { nome: "Analytics Setup", quantidade: 1, valorUnitario: 440.0, valorTotal: 440.0 },
      ],
    },
  ]

  const handleDownloadInvoicePDF = (invoice: any) => {
    toast({
      title: "Download iniciado",
      description: `Gerando PDF da fatura ${invoice.month}...`,
    })
    // In a real app, this would generate and download a PDF
    console.log("[v0] Downloading invoice PDF:", invoice)
  }

  const togglePasswordVisibility = (id: number) => {
    setVisiblePasswords((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const copyToClipboard = (text: string, label = "Item") => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copiado!",
      description: `${label} copiado para a área de transferência.`,
      duration: 2000,
    })
  }

  const getProgressColor = (progress: number) => {
    if (progress === 100) return "bg-gradient-to-r from-blue-400 to-blue-500"
    if (progress >= 75) return "bg-gradient-to-r from-emerald-400 to-green-500"
    if (progress >= 50) return "bg-gradient-to-r from-teal-400 to-emerald-400"
    if (progress >= 25) return "bg-gradient-to-r from-amber-400 to-yellow-400"
    if (progress === 0) return "bg-slate-200"
    return "bg-gradient-to-r from-orange-400 to-amber-400"
  }

  const getProgressTextColor = (progress: number) => {
    if (progress === 100) return "text-blue-700"
    if (progress >= 75) return "text-emerald-700"
    if (progress >= 50) return "text-teal-700"
    if (progress >= 25) return "text-amber-700"
    if (progress === 0) return "text-slate-400"
    return "text-orange-700"
  }

  const getProgressBgColor = (progress: number) => {
    if (progress >= 70) return "bg-gradient-to-r from-green-50 to-emerald-50"
    if (progress >= 30) return "bg-gradient-to-r from-yellow-50 to-amber-50"
    return "bg-gradient-to-r from-orange-50 to-red-50"
  }

  const fontSizeClasses = {
    sm: "text-xs",
    base: "text-sm",
    lg: "text-base",
  }

  const getFaviconUrl = (url: string) => {
    try {
      const domain = new URL(url).hostname
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
    } catch {
      return null
    }
  }

  const getInitials = (title: string) => {
    return title.substring(0, 2).toUpperCase()
  }

  const handleDeleteCredential = (credentialId: number) => {
    console.log("[v0] Deleting credential:", credentialId)
    // TODO: Implement actual delete logic
    setShowDeleteCredentialDialog(false)
  }

  const handleEditCredential = (credential: any) => {
    setEditingCredential(credential)
    setShowEditCredentialDialog(true)
  }

  const handleSaveCredential = () => {
    console.log("[v0] Saving credential:", editingCredential)
    // TODO: Implement actual save logic
    setShowEditCredentialDialog(false)
    setEditPasswordVisible(false) // Reset visibility
    setConfirmPassword("") // Reset confirmation
  }

  const handleAddFile = () => {
    if (newFileName.trim()) {
      console.log("[v0] Adding file:", newFileName)
      // TODO: Implement actual file upload logic
      setNewFileName("")
      setShowAddFileDialog(false)
    }
  }

  const handleAddUserAccess = () => {
    if (newAccessUser === "select-user" || !selectedCredential) {
      toast({
        title: "Erro",
        description: "Por favor, selecione um usuário.",
        variant: "destructive",
      })
      return
    }

    if (hasExpiration && !newAccessExpiration) {
      toast({
        title: "Erro",
        description: "Por favor, defina uma data de expiração ou desmarque a opção.",
        variant: "destructive",
      })
      return
    }

    const userNames: Record<string, string> = {
      joao: "João Silva",
      maria: "Maria Santos",
      carlos: "Carlos Lima",
      fernanda: "Fernanda Dias",
      beatriz: "Beatriz Souza",
      ricardo: "Ricardo Alves",
    }

    const userName = userNames[newAccessUser]

    const alreadyHasAccess = selectedCredential.sharedWith.some(
      (user: any) => (typeof user === "string" ? user : user.name) === userName,
    )

    if (alreadyHasAccess) {
      toast({
        title: "Aviso",
        description: `${userName} já possui acesso a esta credencial.`,
        variant: "destructive",
      })
      return
    }

    const expirationDate = hasExpiration && newAccessExpiration ? newAccessExpiration : null

    const updatedSharedWith = [
      ...selectedCredential.sharedWith,
      {
        name: userName,
        permission: newAccessPermission,
        expiresAt: expirationDate,
      },
    ]

    setSelectedCredential({
      ...selectedCredential,
      sharedWith: updatedSharedWith,
    })

    setMockCredentials((prev: any[]) =>
      prev.map((cred: any) => (cred.id === selectedCredential.id ? { ...cred, sharedWith: updatedSharedWith } : cred)),
    )

    // Reset form
    setNewAccessUser("select-user")
    setNewAccessPermission("view")
    setNewAccessExpiration("")
    setHasExpiration(true)

    toast({
      title: "✓ Compartilhado!",
      description: expirationDate
        ? `${userName} agora tem acesso até ${new Date(expirationDate).toLocaleDateString("pt-BR")}.`
        : `${userName} agora tem acesso permanente a esta credencial.`,
    })
  }

  const getSortedAndFilteredProducts = () => {
    let filtered = [...mockData.produtos]

    // Filter by percentage
    if (productPercentageFilter === "0-25") {
      filtered = filtered.filter((p) => p.progresso >= 0 && p.progresso < 25)
    } else if (productPercentageFilter === "25-50") {
      filtered = filtered.filter((p) => p.progresso >= 25 && p.progresso < 50)
    } else if (productPercentageFilter === "50-75") {
      filtered = filtered.filter((p) => p.progresso >= 50 && p.progresso < 75)
    } else if (productPercentageFilter === "75-100") {
      filtered = filtered.filter((p) => p.progresso >= 75 && p.progresso <= 100)
    } else if (productPercentageFilter === "concluido") {
      filtered = filtered.filter((p) => p.progresso === 100)
    }

    // Filter by status
    if (productStatusFilter !== "all") {
      filtered = filtered.filter((p) => p.status === productStatusFilter)
    }

    // Filter by type
    if (productTypeFilter !== "all") {
      filtered = filtered.filter((p) => p.tipo === productTypeFilter)
    }

    filtered.sort((a, b) => {
      let comparison = 0
      if (productSortBy === "nome") {
        comparison = a.nome.localeCompare(b.nome)
      } else if (productSortBy === "progresso") {
        comparison = a.progresso - b.progresso
      } else if (productSortBy === "dataContratacao") {
        comparison =
          new Date(a.dataContratacao.split("/").reverse().join("-")).getTime() -
          new Date(b.dataContratacao.split("/").reverse().join("-")).getTime()
      } else if (productSortBy === "dataEntrega") {
        comparison =
          new Date(a.dataEntrega.split("/").reverse().join("-")).getTime() -
          new Date(b.dataEntrega.split("/").reverse().join("-")).getTime()
      }
      return productSortOrder === "asc" ? comparison : -comparison
    })

    return filtered
  }

  const toggleSortOrder = () => {
    setProductSortOrder(productSortOrder === "asc" ? "desc" : "asc")
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "Aprovada":
        return "bg-green-100 text-green-700 border-green-200"
      case "Em Execução":
        return "bg-blue-100 text-blue-700 border-blue-200"
      case "Para Aprovação":
        return "bg-yellow-100 text-yellow-700 border-yellow-200"
      case "Entregue":
        return "bg-purple-100 text-purple-700 border-purple-200"
      case "Atrasada":
        return "bg-red-100 text-red-700 border-red-200"
      default:
        return "bg-gray-100 text-gray-700 border-gray-200"
    }
  }

  const getStatusBorderColor = (status: string) => {
    switch (status) {
      case "Aprovada":        return "#10b981"
      case "Em Execução":    return "#3b82f6"
      case "Para Aprovação": return "#f59e0b"
      case "Entregue":        return "#a855f7"
      case "Atrasada":        return "#ef4444"
      default:                return "#9ca3af"
    }
  }

  const getStatusDotClass = (status: string) => {
    switch (status) {
      case "Aprovada":        return "bg-emerald-500"
      case "Em Execução":    return "bg-blue-500"
      case "Para Aprovação": return "bg-amber-400"
      case "Entregue":        return "bg-purple-500"
      case "Atrasada":        return "bg-red-500 animate-pulse"
      default:                return "bg-slate-400"
    }
  }

  const getAllTasks = () => {
    const allTasks: any[] = []
    mockData.produtos.forEach((produto) => {
      produto.tarefas.forEach((tarefa: any) => {
        allTasks.push({
          ...tarefa,
          produtoId: produto.id,
          produtoNome: produto.nome,
          uniqueId: produto.id * 1000 + tarefa.id,
        })
      })
    })
    return allTasks
  }

  const getFilteredAndSortedTasks = () => {
    let tasks = getAllTasks()

    // Apply status filter
    if (taskStatusFilter !== "all") {
      tasks = tasks.filter((task) => task.status === taskStatusFilter)
    }

    // Apply product filter
    if (taskProductFilter !== "all") {
      tasks = tasks.filter((task) => task.produtoId === Number.parseInt(taskProductFilter))
    }

    // Apply date filter
    if (taskDateFilter) {
      tasks = tasks.filter((task) => task.prazo === taskDateFilter)
    }

    // Apply search
    if (taskSearchTerm) {
      const s = taskSearchTerm.toLowerCase()
      tasks = tasks.filter((task) => task.nome.toLowerCase().includes(s) || String(task.uniqueId).toLowerCase().includes(s))
    }

    // Apply sorting
    tasks.sort((a, b) => {
      let comparison = 0

      switch (taskSortBy) {
        case "produto":
          comparison = a.produtoNome.localeCompare(b.produtoNome)
          break
        case "nome":
          comparison = a.nome.localeCompare(b.nome)
          break
        case "status":
          comparison = a.status.localeCompare(b.status)
          break
        case "prazo":
          const dateA = new Date(a.prazo.split("/").reverse().join("-"))
          const dateB = new Date(b.prazo.split("/").reverse().join("-"))
          comparison = dateA.getTime() - dateB.getTime()
          break
        case "executor":
          comparison = a.executor.localeCompare(b.executor)
          break
        case "lider":
          comparison = a.lider.localeCompare(b.lider)
          break
      }

      return taskSortOrder === "asc" ? comparison : -comparison
    })

    return tasks
  }

  const getPaginatedTasks = () => {
    const filteredTasks = getFilteredAndSortedTasks()
    const startIndex = (tasksCurrentPage - 1) * tasksPerPage
    const endIndex = startIndex + tasksPerPage
    return filteredTasks.slice(startIndex, endIndex)
  }

  const getTotalTaskPages = () => {
    return Math.ceil(getFilteredAndSortedTasks().length / tasksPerPage)
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          hideOverlay={true}
          className="p-0 flex flex-col gap-0 !w-auto !max-w-none overflow-hidden"
          style={{ left: `${sidebarWidth}px`, width: `calc(100vw - ${sidebarWidth}px)`, maxWidth: `calc(100vw - ${sidebarWidth}px)` }}
        >
          <div className="relative flex flex-col h-full overflow-hidden">
            {/* Hidden file input */}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

            {/* Brand Header */}
            <ModalBrandHeader
              onClose={() => onOpenChange(false)}
              headerStyle={getHeaderStyle()}
              right={
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge className="bg-blue-500/90 text-white text-[10px] px-2 py-0.5 font-semibold border-0">
                    {mockData.situacao}
                  </Badge>
                  {/* Palette button */}
                  <button
                    onClick={() => setShowColorPicker((p) => !p)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-white text-[10px] font-medium transition-colors border ${
                      showColorPicker
                        ? "bg-white/30 border-white/50"
                        : "bg-white/15 hover:bg-white/25 border-white/20"
                    }`}
                    title="Cor do cabeçalho"
                  >
                    <Palette className="h-3 w-3" />
                    Tema
                  </button>
                  {mode === "view" && project && (
                    <>
                      <button onClick={onClone} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[10px] font-medium transition-colors border border-white/20">
                        <Copy className="h-3 w-3" />
                        Clonar
                      </button>
                      <button onClick={onExport} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[10px] font-medium transition-colors border border-white/20">
                        <FileText className="h-3 w-3" />
                        Exportar
                      </button>
                      <button onClick={onEdit} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[10px] font-medium transition-colors border border-white/20">
                        <Edit className="h-3 w-3" />
                        Editar
                      </button>
                      <button onClick={onCancel} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/30 hover:bg-red-500/50 text-white text-[10px] font-medium transition-colors border border-red-400/30">
                        <Ban className="h-3 w-3" />
                        Cancelar
                      </button>
                    </>
                  )}
                </div>
              }
              left={
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {/* Avatar Section */}
                  <button
                    onClick={handleAvatarClick}
                    className="relative h-16 w-16 rounded-full bg-white/15 border-2 border-white/30 flex-shrink-0 group overflow-hidden hover:border-white/60 transition-all"
                  >
                    {avatar ? (
                      <img src={avatar} alt="projeto" className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-500">
                        <FolderKanban className="h-7 w-7 text-white" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                      <Camera className="h-4 w-4 text-white" />
                      <span className="text-[9px] text-white/90 font-medium mt-0.5">{avatar ? "Editar" : "Foto"}</span>
                    </div>
                  </button>

                  {/* Project Info */}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-white font-bold text-base truncate">{project?.name || "Novo Projeto"}</h2>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-white/70 text-xs flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {mockData.agencia}
                      </span>
                      <span className="text-white/70 text-xs flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {mockData.cliente}
                      </span>
                      <span className="text-white/70 text-xs flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {mockData.dataCriacao}
                      </span>
                    </div>
                  </div>
                </div>
              }
            />

            {/* Header color picker */}
            {showColorPicker && (
              <>
                <div className="absolute inset-0 z-40" onClick={() => setShowColorPicker(false)} />
                <div
                  className="absolute z-50 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4"
                  style={{ top: 108, right: 16, width: 300 }}
                >
                  <p className="text-xs font-semibold text-gray-700 mb-3">Cor do cabeçalho</p>
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {HEADER_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        title={preset.label}
                        onClick={() => { setHeaderBg(preset.value); setShowColorPicker(false) }}
                        className={`relative h-10 rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${
                          headerBg === preset.value ? "border-blue-500 ring-2 ring-blue-300" : "border-transparent"
                        }`}
                        style={{ background: preset.preview }}
                      >
                        {!preset.value && (
                          <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white drop-shadow">
                            Padrão
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-gray-100 pt-3 flex items-center gap-2">
                    <label className="text-xs text-gray-500 flex-shrink-0">Cor sólida:</label>
                    <input
                      type="color"
                      value={customHeaderColor}
                      onChange={(e) => setCustomHeaderColor(e.target.value)}
                      className="h-7 w-10 rounded border border-gray-200 cursor-pointer"
                    />
                    <button
                      onClick={() => { setHeaderBg(customHeaderColor); setShowColorPicker(false) }}
                      className="flex-1 px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs text-gray-700 font-medium transition-colors"
                    >
                      Aplicar
                    </button>
                    {headerBg && (
                      <button
                        onClick={() => { setHeaderBg(null); setShowColorPicker(false) }}
                        className="px-2 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-xs text-red-600 font-medium transition-colors"
                      >
                        Resetar
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}

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
                  <p className="text-white text-sm font-semibold">Ajustar foto do projeto</p>
                  <p className="text-white/50 text-xs mt-0.5">Arraste para reposicionar · use o zoom para ajustar</p>
                </div>
                <div className="flex-1 flex items-center justify-center overflow-hidden">
                  <div
                    className="relative flex-shrink-0"
                    style={{ width: CROP_SIZE, height: CROP_SIZE }}
                    onMouseDown={(e) => { setIsDraggingCrop(true); setDragStart({ x: e.clientX - cropOffset.x, y: e.clientY - cropOffset.y }) }}
                    onMouseMove={(e) => { if (!isDraggingCrop) return; setCropOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }) }}
                    onMouseUp={() => setIsDraggingCrop(false)}
                    onMouseLeave={() => setIsDraggingCrop(false)}
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

            {/* Tabs + Content */}
            <div className="flex-1 flex flex-col bg-white overflow-hidden">
            <Tabs defaultValue="dashboard" className="w-full flex flex-col h-full">
              <div className="flex-shrink-0 bg-white px-[50px] pt-0 pb-[10px] overflow-x-auto">
                <TabsList className="grid w-max grid-cols-8 gap-1 bg-transparent p-0 h-auto">
                  <TabsTrigger value="dashboard" className="px-4 py-2 text-xs font-medium rounded-lg border border-transparent data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 data-[state=active]:border-blue-300 hover:bg-slate-100">
                    Dashboard
                  </TabsTrigger>
                  <TabsTrigger value="descricao" className="px-4 py-2 text-xs font-medium rounded-lg border border-transparent data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 data-[state=active]:border-blue-300 hover:bg-slate-100">
                    Dados do Projeto
                  </TabsTrigger>
                  <TabsTrigger value="produtos" className="px-4 py-2 text-xs font-medium rounded-lg border border-transparent data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 data-[state=active]:border-blue-300 hover:bg-slate-100">
                    Produtos
                  </TabsTrigger>
                  <TabsTrigger value="arquivos" className="px-4 py-2 text-xs font-medium rounded-lg border border-transparent data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 data-[state=active]:border-blue-300 hover:bg-slate-100">
                    Arquivos
                  </TabsTrigger>
                  <TabsTrigger value="cofre" className="px-4 py-2 text-xs font-medium rounded-lg border border-transparent data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 data-[state=active]:border-blue-300 hover:bg-slate-100">
                    Cofre
                  </TabsTrigger>
                  <TabsTrigger value="tarefas" className="px-4 py-2 text-xs font-medium rounded-lg border border-transparent data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 data-[state=active]:border-blue-300 hover:bg-slate-100">
                    Tarefas
                  </TabsTrigger>
                  <TabsTrigger value="faturamento" className="px-4 py-2 text-xs font-medium rounded-lg border border-transparent data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 data-[state=active]:border-blue-300 hover:bg-slate-100">
                    Faturamento
                  </TabsTrigger>
                  <TabsTrigger value="pagamento" className="px-4 py-2 text-xs font-medium rounded-lg border border-transparent data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 data-[state=active]:border-blue-300 hover:bg-slate-100">
                    Pagamento
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="dashboard" className="p-0 m-0 flex-1 overflow-y-auto bg-slate-100">
                <div className="px-[50px] py-[25px] space-y-4">

                  {/* Summary banner */}
                  <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shrink-0">
                      <Activity className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-700 mb-0.5">Status do Projeto</p>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        75% das tarefas concluídas · 3 aguardando aprovação · desempenho acima da média
                      </p>
                    </div>
                  </div>

                  {/* KPI row – 4 compact stat cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Horas */}
                    <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl px-4 py-3 text-white shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">Horas</span>
                        <Clock className="w-3.5 h-3.5 opacity-70" />
                      </div>
                      <p className="text-2xl font-bold leading-tight">247.5h</p>
                      <p className="text-[10px] opacity-75 mt-0.5 flex items-center gap-1"><TrendingUp className="w-3 h-3" />+12.5h esta semana</p>
                    </div>
                    {/* Tarefas */}
                    <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl px-4 py-3 text-white shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">Tarefas</span>
                        <CheckCircle2 className="w-3.5 h-3.5 opacity-70" />
                      </div>
                      <p className="text-2xl font-bold leading-tight">45<span className="text-base font-semibold opacity-70">/60</span></p>
                      <p className="text-[10px] opacity-75 mt-0.5 flex items-center gap-1"><TrendingUp className="w-3 h-3" />+5 esta semana</p>
                    </div>
                    {/* Nota */}
                    <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl px-4 py-3 text-white shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">Nota Média</span>
                        <Star className="w-3.5 h-3.5 opacity-70" />
                      </div>
                      <p className="text-2xl font-bold leading-tight">4.8<span className="text-base font-semibold opacity-70">/5</span></p>
                      <p className="text-[10px] opacity-75 mt-0.5">Excelente avaliação</p>
                    </div>
                    {/* Atenção */}
                    <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-xl px-4 py-3 text-white shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">Atenção</span>
                        <AlertTriangle className="w-3.5 h-3.5 opacity-70" />
                      </div>
                      <p className="text-2xl font-bold leading-tight">3</p>
                      <p className="text-[10px] opacity-75 mt-0.5">Tarefas críticas</p>
                    </div>
                  </div>

                  {/* Middle row – task status + reprovação */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {/* Tarefas por Status */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold text-slate-700">Tarefas por Status</p>
                        <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
                      </div>
                      <div className="space-y-2.5">
                        {[
                          { label: "Concluídas", value: 45, total: 60, color: "bg-emerald-500", text: "text-emerald-600" },
                          { label: "Em Andamento", value: 8, total: 60, color: "bg-blue-500", text: "text-blue-600" },
                          { label: "Aguardando", value: 3, total: 60, color: "bg-amber-400", text: "text-amber-600" },
                          { label: "Bloqueadas", value: 2, total: 60, color: "bg-red-500", text: "text-red-500" },
                        ].map(s => (
                          <div key={s.label}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[11px] text-slate-500">{s.label}</span>
                              <span className={`text-[11px] font-semibold ${s.text}`}>{s.value}</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5">
                              <div className={`${s.color} h-1.5 rounded-full`} style={{ width: `${(s.value / s.total) * 100}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Taxa de Reprovação */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold text-slate-700">Taxa de Reprovação</p>
                        <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />
                      </div>
                      <div className="flex items-end gap-3 mb-3">
                        <span className="text-3xl font-bold text-slate-800">8.5%</span>
                        <span className="text-xs text-emerald-600 font-medium mb-1">Abaixo da média</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: "8.5%" }} />
                      </div>
                      <div className="flex justify-between mt-1.5">
                        <span className="text-[10px] text-slate-400">0%</span>
                        <span className="text-[10px] text-slate-400">Média: 15%</span>
                        <span className="text-[10px] text-slate-400">100%</span>
                      </div>
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                    <p className="text-xs font-semibold text-slate-700 mb-3">Atividades Recentes</p>
                    <div className="space-y-1">
                      {[
                        { action: "Tarefa #45 concluída", time: "2h atrás", type: "success" },
                        { action: "Nova revisão solicitada na tarefa #38", time: "5h atrás", type: "warning" },
                        { action: "3 novas tarefas adicionadas", time: "1 dia atrás", type: "info" },
                        { action: "Aprovação pendente - Tarefa #42", time: "2 dias atrás", type: "warning" },
                      ].map((activity, idx) => (
                        <div key={idx} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${activity.type === "success" ? "bg-emerald-500" : activity.type === "warning" ? "bg-amber-400" : "bg-blue-500"}`} />
                          <p className="flex-1 text-xs text-slate-700">{activity.action}</p>
                          <p className="text-[10px] text-slate-400 whitespace-nowrap">{activity.time}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </TabsContent>

              <TabsContent value="descricao" className="p-0 m-0 flex-1 overflow-y-auto bg-slate-200">
                <div className="px-[50px] pt-[25px] pb-[80px] space-y-4">

                  {/* Header */}
                  <div className="flex items-center justify-between pb-2">
                    <h3 className="text-sm font-semibold text-slate-900">Dados do Projeto</h3>
                    <div className="flex items-center gap-2">
                      {/* Expandir toggle */}
                      <button
                        onClick={() => {
                          const allOpen = DADOS_PROJECT_ACCORDIONS.every(a => dadosProjOpenAccordions.includes(a))
                          setDadosProjOpenAccordions(allOpen ? [] : DADOS_PROJECT_ACCORDIONS)
                        }}
                        className="flex items-center gap-2 group"
                      >
                        <span className="text-xs text-slate-500 group-hover:text-slate-700 transition-colors select-none">
                          {DADOS_PROJECT_ACCORDIONS.every(a => dadosProjOpenAccordions.includes(a)) ? "Fechar" : "Expandir"}
                        </span>
                        <div className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${DADOS_PROJECT_ACCORDIONS.every(a => dadosProjOpenAccordions.includes(a)) ? "bg-blue-600" : "bg-slate-300"}`}>
                          <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${DADOS_PROJECT_ACCORDIONS.every(a => dadosProjOpenAccordions.includes(a)) ? "translate-x-4" : "translate-x-0.5"}`} />
                        </div>
                      </button>
                      {!isDadosProjEditMode ? (
                        <Button onClick={() => setIsDadosProjEditMode(true)} size="sm" className="bg-blue-600 hover:bg-blue-700">
                          <Edit2 className="h-4 w-4 mr-2" />
                          Editar
                        </Button>
                      ) : (
                        <div className="flex gap-2">
                          <Button onClick={() => setShowDadosProjSaveConfirm(true)} size="sm" disabled={isSavingDados} className="bg-emerald-600 hover:bg-emerald-700">
                            {isSavingDados ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                            {isSavingDados ? "Salvando..." : "Salvar"}
                          </Button>
                          <Button onClick={() => setShowDadosProjCancelConfirm(true)} size="sm" variant="outline">
                            <XCircle className="h-4 w-4 mr-2" />
                            Cancelar
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  <Accordion type="multiple" value={dadosProjOpenAccordions} onValueChange={setDadosProjOpenAccordions} className="space-y-2">

                    {/* Informações do Projeto */}
                    <AccordionItem value="info" className="border border-slate-200/80 rounded-xl overflow-hidden shadow-sm">
                      <AccordionTrigger className="px-4 py-3 bg-white hover:bg-slate-50 [&[data-state=open]]:bg-slate-50 text-xs">
                        <div className="flex items-center gap-2">
                          <FolderKanban className="h-4 w-4 text-blue-600" />
                          <span className="font-semibold text-slate-800">Informações do Projeto</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-3 py-3 border-t border-slate-100 bg-slate-50/30">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                          <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Situação</p>
                            {isDadosProjEditMode ? (
                              <Select value={dadosProjForm.situacao} onValueChange={v => setDadosProjForm(f => ({ ...f, situacao: v }))}>
                                <SelectTrigger className="h-8 text-sm border-slate-300"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="AGUARDANDO PAGAMENTO">Aguardando Pagamento</SelectItem>
                                  <SelectItem value="EM ANDAMENTO">Em Andamento</SelectItem>
                                  <SelectItem value="CONCLUÍDO">Concluído</SelectItem>
                                  <SelectItem value="CANCELADO">Cancelado</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <p className="text-sm font-semibold text-slate-800">{dadosProjForm.situacao}</p>
                            )}
                          </div>
                          <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Agência</p>
                            {isDadosProjEditMode ? (
                              <Input value={dadosProjForm.agencia} onChange={e => setDadosProjForm(f => ({ ...f, agencia: e.target.value }))} className="h-8 text-sm border-slate-300" />
                            ) : (
                              <p className="text-sm font-semibold text-slate-800">{dadosProjForm.agencia}</p>
                            )}
                          </div>
                          <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Consultor Responsável</p>
                            {isDadosProjEditMode ? (
                              <Input value={dadosProjForm.consultor} onChange={e => setDadosProjForm(f => ({ ...f, consultor: e.target.value }))} className="h-8 text-sm border-slate-300" />
                            ) : (
                              <p className="text-sm font-semibold text-slate-800">{dadosProjForm.consultor}</p>
                            )}
                          </div>
                          <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">E-mail do Consultor</p>
                            {isDadosProjEditMode ? (
                              <Input value={dadosProjForm.emailConsultor} onChange={e => setDadosProjForm(f => ({ ...f, emailConsultor: e.target.value }))} className="h-8 text-sm border-slate-300" />
                            ) : (
                              <p className="text-sm font-semibold text-blue-600">{dadosProjForm.emailConsultor}</p>
                            )}
                          </div>
                          <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Cliente</p>
                            {isDadosProjEditMode ? (
                              <Input value={dadosProjForm.cliente} onChange={e => setDadosProjForm(f => ({ ...f, cliente: e.target.value }))} className="h-8 text-sm border-slate-300" />
                            ) : (
                              <p className="text-sm font-semibold text-slate-800">{dadosProjForm.cliente}</p>
                            )}
                          </div>
                          <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Data de Criação</p>
                            {isDadosProjEditMode ? (
                              <Input value={dadosProjForm.dataCriacao} onChange={e => setDadosProjForm(f => ({ ...f, dataCriacao: e.target.value }))} className="h-8 text-sm border-slate-300" />
                            ) : (
                              <p className="text-sm font-semibold text-slate-800">{dadosProjForm.dataCriacao}</p>
                            )}
                          </div>
                          <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Permite Portfólio</p>
                            {isDadosProjEditMode ? (
                              <button
                                onClick={() => setDadosProjForm(f => ({ ...f, permitePortfolio: !f.permitePortfolio }))}
                                className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${dadosProjForm.permitePortfolio ? "bg-blue-600" : "bg-slate-300"}`}
                              >
                                <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${dadosProjForm.permitePortfolio ? "translate-x-4" : "translate-x-0.5"}`} />
                              </button>
                            ) : (
                              <p className={`text-sm font-semibold ${dadosProjForm.permitePortfolio ? "text-emerald-600" : "text-slate-400"}`}>
                                {dadosProjForm.permitePortfolio ? "Permitido" : "Não permitido"}
                              </p>
                            )}
                          </div>
                          <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Bitrix</p>
                            {isDadosProjEditMode ? (
                              <button
                                onClick={() => setDadosProjForm(f => ({ ...f, sincronizadoBitrix: !f.sincronizadoBitrix }))}
                                className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${dadosProjForm.sincronizadoBitrix ? "bg-blue-600" : "bg-slate-300"}`}
                              >
                                <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${dadosProjForm.sincronizadoBitrix ? "translate-x-4" : "translate-x-0.5"}`} />
                              </button>
                            ) : (
                              <p className={`text-sm font-semibold ${dadosProjForm.sincronizadoBitrix ? "text-emerald-600" : "text-slate-400"}`}>
                                {dadosProjForm.sincronizadoBitrix ? "Sincronizado" : "Não sincronizado"}
                              </p>
                            )}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Descrição */}
                    <AccordionItem value="descricao" className="border border-slate-200/80 rounded-xl overflow-hidden shadow-sm">
                      <AccordionTrigger className="px-4 py-3 bg-white hover:bg-slate-50 [&[data-state=open]]:bg-slate-50 text-xs">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-violet-600" />
                          <span className="font-semibold text-slate-800">Descrição</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-3 py-3 border-t border-slate-100 bg-slate-50/30">
                        {isDadosProjEditMode ? (
                          <Textarea
                            value={dadosProjForm.descricao}
                            onChange={e => setDadosProjForm(f => ({ ...f, descricao: e.target.value }))}
                            className="min-h-[120px] text-sm border-slate-300 bg-white"
                            placeholder="Descreva o projeto..."
                          />
                        ) : (
                          <p className="text-sm text-slate-700 leading-relaxed px-1">{dadosProjForm.descricao}</p>
                        )}
                      </AccordionContent>
                    </AccordionItem>

                  </Accordion>
                </div>
              </TabsContent>

              <TabsContent value="produtos" className="p-0 m-0 flex-1 overflow-y-auto bg-slate-200">
                <div className="px-[50px] pt-[25px] pb-[80px] space-y-4">

                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900">Produtos Contratados</h3>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className={`h-8 text-xs border-slate-300 bg-white hover:bg-slate-50 ${showProductFilters ? "border-blue-400 text-blue-600" : ""}`}
                        onClick={() => setShowProductFilters(!showProductFilters)}
                      >
                        <Filter className="h-3.5 w-3.5 mr-1.5" />
                        Filtros
                      </Button>
                      <Select value={productSortBy} onValueChange={setProductSortBy}>
                        <SelectTrigger className="h-8 w-[175px] text-xs border-slate-300 bg-white">
                          <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nome">Ordem Alfabética</SelectItem>
                          <SelectItem value="progresso">Ordem de %</SelectItem>
                          <SelectItem value="dataContratacao">Data Contratação</SelectItem>
                          <SelectItem value="dataEntrega">Data Entrega</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0 border-slate-300 bg-white hover:bg-slate-50"
                        onClick={toggleSortOrder}
                        title={productSortOrder === "asc" ? "Ordem Crescente" : "Ordem Decrescente"}
                      >
                        {productSortOrder === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>

                  {/* Filter panel */}
                  {showProductFilters && (
                    <div className="p-4 border border-slate-200/80 rounded-xl bg-white shadow-sm space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 block">Porcentagem</label>
                          <Select value={productPercentageFilter} onValueChange={setProductPercentageFilter}>
                            <SelectTrigger className="h-8 text-xs border-slate-300"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todos</SelectItem>
                              <SelectItem value="0-25">0% – 25%</SelectItem>
                              <SelectItem value="25-50">25% – 50%</SelectItem>
                              <SelectItem value="50-75">50% – 75%</SelectItem>
                              <SelectItem value="75-100">75% – 100%</SelectItem>
                              <SelectItem value="concluido">Concluído (100%)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 block">Status</label>
                          <Select value={productStatusFilter} onValueChange={setProductStatusFilter}>
                            <SelectTrigger className="h-8 text-xs border-slate-300"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todos</SelectItem>
                              <SelectItem value="Não Iniciado">Não Iniciado</SelectItem>
                              <SelectItem value="Planejamento">Planejamento</SelectItem>
                              <SelectItem value="Em Desenvolvimento">Em Desenvolvimento</SelectItem>
                              <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                              <SelectItem value="Concluído">Concluído</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 block">Tipo</label>
                          <Select value={productTypeFilter} onValueChange={setProductTypeFilter}>
                            <SelectTrigger className="h-8 text-xs border-slate-300"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todos</SelectItem>
                              <SelectItem value="Avulso">Avulso</SelectItem>
                              <SelectItem value="Mensal">Mensal</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-slate-500"
                          onClick={() => { setProductPercentageFilter("all"); setProductStatusFilter("all"); setProductTypeFilter("all") }}>
                          Limpar Filtros
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Product cards */}
                  <div className="space-y-2.5">
                    {getSortedAndFilteredProducts().map((produto) => (
                      <div
                        key={produto.id}
                        className="relative overflow-hidden rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-200 group"
                        style={{ minHeight: 72 }}
                      >
                        {/* Animated progress fill */}
                        <div className="absolute inset-0 flex">
                          <div
                            className={`${getProgressColor(produto.progresso)} transition-all duration-700 ease-out opacity-30`}
                            style={{ width: `${produto.progresso}%` }}
                          />
                          <div className="flex-1 bg-white" />
                        </div>
                        {/* Stronger left accent line */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${getProgressColor(produto.progresso)} opacity-80`} />

                        {/* Content */}
                        <div className="relative flex items-center gap-4 px-4 py-3 pl-5">
                          {/* Progress ring / percentage */}
                          <div className="shrink-0 flex flex-col items-center justify-center w-12">
                            <span className={`text-lg font-black leading-none ${getProgressTextColor(produto.progresso)}`}>
                              {produto.progresso}%
                            </span>
                            <span className="text-[9px] text-slate-400 font-medium tracking-wide mt-0.5">progresso</span>
                          </div>

                          {/* Divider */}
                          <div className="w-px h-10 bg-slate-200 shrink-0" />

                          {/* Main info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-bold text-sm text-slate-800 truncate">{produto.nome}</h4>
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${
                                produto.tipo === "Mensal" ? "bg-violet-100 text-violet-700" : "bg-blue-100 text-blue-700"
                              }`}>
                                {produto.tipo}
                              </span>
                            </div>
                            {/* Progress bar */}
                            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mb-1.5">
                              <div
                                className={`h-full ${getProgressColor(produto.progresso)} transition-all duration-700 ease-out`}
                                style={{ width: `${produto.progresso}%` }}
                              />
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-slate-500">
                              <span className="font-medium text-slate-600">
                                {produto.tarefasConcluidas}/{produto.tarefasTotais} tarefas
                              </span>
                              <span className="text-slate-300">•</span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Contratação: <span className="font-medium">{produto.dataContratacao}</span>
                              </span>
                              <span className="text-slate-300">•</span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Entrega: <span className="font-medium">{produto.dataEntrega}</span>
                              </span>
                            </div>
                          </div>

                          {/* Actions */}
                          <button
                            className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border border-slate-200 bg-white hover:bg-slate-50 hover:border-blue-300 text-slate-400 hover:text-blue-600 transition-all"
                            onClick={() => { setSelectedProduct(produto); setShowProductTasksModal(true) }}
                            title="Ver tarefas"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {getSortedAndFilteredProducts().length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center mb-3">
                        <Package className="h-5 w-5 text-slate-400" />
                      </div>
                      <p className="text-sm font-medium text-slate-600">Nenhum produto encontrado</p>
                      <p className="text-xs text-slate-400 mt-1">Tente alterar os filtros selecionados</p>
                    </div>
                  )}

                </div>
              </TabsContent>

              {/* Arquivos */}
              <TabsContent value="arquivos" className="p-6 m-0 flex-1 overflow-y-auto">
                <Tabs defaultValue="iniciais" className="w-full">
                  <TabsList className="w-full justify-start rounded-lg bg-gray-100 h-auto p-1 mb-6">
                    <TabsTrigger
                      value="iniciais"
                      className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2.5 text-sm font-medium transition-all"
                    >
                      Arquivos Iniciais
                    </TabsTrigger>
                    <TabsTrigger
                      value="aprovados"
                      className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2.5 text-sm font-medium transition-all"
                    >
                      Arquivos Aprovados
                    </TabsTrigger>
                  </TabsList>

                  {/* Initial Files Sub-tab */}
                  <TabsContent value="iniciais" className="m-0">
                    <div className="space-y-4">
                      {/* Filters */}
                      <div className="flex items-center gap-2 pb-4 border-b">
                        <Select value={fileTypeFilter} onValueChange={setFileTypeFilter}>
                          <SelectTrigger className="h-8 w-[160px] text-xs">
                            <SelectValue placeholder="Tipo de Arquivo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos os Tipos</SelectItem>
                            <SelectItem value="pdf">PDF</SelectItem>
                            <SelectItem value="image">Imagem</SelectItem>
                            <SelectItem value="video">Vídeo</SelectItem>
                            <SelectItem value="document">Documento</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={fileSortOrder} onValueChange={setFileSortOrder}>
                          <SelectTrigger className="h-8 w-[160px] text-xs">
                            <SelectValue placeholder="Ordenar por" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="recent">Mais Recente</SelectItem>
                            <SelectItem value="oldest">Mais Antigo</SelectItem>
                            <SelectItem value="name">Nome A-Z</SelectItem>
                            <SelectItem value="size">Tamanho</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs ml-auto bg-transparent"
                          onClick={() => setShowAddFileDialog(true)}
                        >
                          <Upload className="h-3.5 w-3.5 mr-1.5" />
                          Adicionar Arquivo
                        </Button>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        Arquivos que a agência anexa ou deleta para usar nas tarefas do projeto (logotipos, briefings,
                        etc.)
                      </p>

                      <div className="space-y-2">
                        <Card className="p-3 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded bg-blue-100 flex items-center justify-center">
                                <File className="h-5 w-5 text-blue-600" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">Briefing_Florescer.pdf</p>
                                <p className="text-xs text-muted-foreground">Adicionado em 19/02/2025 • 2.5 MB</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </Card>

                        <Card className="p-3 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded bg-purple-100 flex items-center justify-center">
                                <File className="h-5 w-5 text-purple-600" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">Logo_Atual_Florescer.ai</p>
                                <p className="text-xs text-muted-foreground">Adicionado em 19/02/2025 • 8.3 MB</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </Card>

                        <Card className="p-3 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded bg-green-100 flex items-center justify-center">
                                <File className="h-5 w-5 text-green-600" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">Referencias_Visuais.zip</p>
                                <p className="text-xs text-muted-foreground">Adicionado em 20/02/2025 • 15.7 MB</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Approved Files Sub-tab */}
                  <TabsContent value="aprovados" className="m-0">
                    <div className="space-y-4">
                      {/* Filters */}
                      <div className="flex items-center gap-2 pb-4 border-b">
                        <Select value={approvedFileTypeFilter} onValueChange={setApprovedFileTypeFilter}>
                          <SelectTrigger className="h-8 w-[160px] text-xs">
                            <SelectValue placeholder="Filtrar por Produto" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos os Produtos</SelectItem>
                            <SelectItem value="product1">Produto 1</SelectItem>
                            <SelectItem value="product2">Produto 2</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={approvedFileSortOrder} onValueChange={setApprovedFileSortOrder}>
                          <SelectTrigger className="h-8 w-[160px] text-xs">
                            <SelectValue placeholder="Ordenar por" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="recent">Data de Conclusão</SelectItem>
                            <SelectItem value="task">Número da Tarefa</SelectItem>
                            <SelectItem value="name">Nome A-Z</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <p className="text-xs text-muted-foreground">
                          Quando uma tarefa do produto é aprovada, o último arquivo anexado fica disponível aqui
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Card className="p-3 hover:bg-gray-50 transition-colors border-l-4 border-green-500">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded bg-green-100 flex items-center justify-center">
                                <File className="h-5 w-5 text-green-600" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">Design_Homepage_Final.fig</p>
                                <p className="text-xs text-muted-foreground">
                                  Tarefa: Design Homepage • Produto: Website Institucional
                                </p>
                                <p className="text-xs text-muted-foreground">Aprovado em 15/02/2025 • 4.2 MB</p>
                              </div>
                            </div>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </Card>

                        <Card className="p-3 hover:bg-gray-50 transition-colors border-l-4 border-green-500">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded bg-green-100 flex items-center justify-center">
                                <File className="h-5 w-5 text-green-600" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">Backend_API_Documentation.pdf</p>
                                <p className="text-xs text-muted-foreground">
                                  Tarefa: Desenvolvimento Backend • Produto: Website Institucional
                                </p>
                                <p className="text-xs text-muted-foreground">Aprovado em 25/02/2025 • 1.8 MB</p>
                              </div>
                            </div>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </Card>

                        <Card className="p-3 hover:bg-gray-50 transition-colors border-l-4 border-green-500">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded bg-green-100 flex items-center justify-center">
                                <File className="h-5 w-5 text-green-600" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">Hospedagem_Configuracao.txt</p>
                                <p className="text-xs text-muted-foreground">
                                  Tarefa: Configuração Hospedagem • Produto: Website Institucional
                                </p>
                                <p className="text-xs text-muted-foreground">Aprovado em 18/02/2025 • 0.1 MB</p>
                              </div>
                            </div>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </Card>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </TabsContent>

              <TabsContent value="cofre" className="p-6 m-0 flex-1 overflow-y-auto">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">Cofre de Senhas</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Gerencie credenciais e compartilhe com segurança
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => setShowShareCredential(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Credencial
                    </Button>
                  </div>

                  {/* Credentials List */}
                  <div className="space-y-3">
                    {mockCredentials.map((credential) => (
                      <Card
                        key={credential.id}
                        className="p-3 hover:shadow-md transition-all border border-gray-200 hover:border-blue-200"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              {getFaviconUrl(credential.url) ? (
                                <img
                                  src={getFaviconUrl(credential.url) || ""}
                                  alt={credential.title}
                                  className="w-8 h-8 rounded"
                                  onError={(e) => {
                                    e.currentTarget.style.display = "none"
                                    e.currentTarget.nextElementSibling?.classList.remove("hidden")
                                  }}
                                />
                              ) : null}
                              <div
                                className={`w-8 h-8 rounded bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs ${
                                  getFaviconUrl(credential.url) ? "hidden" : ""
                                }`}
                              >
                                {getInitials(credential.title)}
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-sm text-gray-900">{credential.title}</h4>
                                <Badge variant="outline" className="text-[10px] h-4 px-1">
                                  {credential.category}
                                </Badge>
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              {/* URL */}
                              <div className="flex items-center gap-2">
                                <label className="text-[10px] font-medium text-gray-500 w-16 shrink-0">URL:</label>
                                <div className="flex-1 flex items-center gap-1">
                                  <Input
                                    value={credential.url}
                                    readOnly
                                    className="h-7 text-[11px] bg-gray-50 border-gray-200 truncate"
                                  />
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0 shrink-0"
                                    onClick={() => copyToClipboard(credential.url, "Link")} // Updated label
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0 shrink-0"
                                    onClick={() => window.open(credential.url, "_blank")}
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>

                              {/* Username */}
                              <div className="flex items-center gap-2">
                                <label className="text-[10px] font-medium text-gray-500 w-16 shrink-0">Usuário:</label>
                                <div className="flex-1 flex items-center gap-1">
                                  <Input
                                    value={credential.username}
                                    readOnly
                                    className="h-7 text-[11px] bg-gray-50 border-gray-200 truncate"
                                  />
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0 shrink-0"
                                    onClick={() => copyToClipboard(credential.username, "Usuário")} // Updated label
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>

                              {/* Password */}
                              <div className="flex items-center gap-2">
                                <label className="text-[10px] font-medium text-gray-500 w-16 shrink-0">Senha:</label>
                                <div className="flex-1 flex items-center gap-1">
                                  <Input
                                    type={visiblePasswords[credential.id] ? "text" : "password"}
                                    value={credential.password}
                                    readOnly
                                    className="h-7 text-[11px] bg-gray-50 border-gray-200 truncate"
                                  />
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0 shrink-0"
                                    onClick={() => togglePasswordVisibility(credential.id)}
                                  >
                                    {visiblePasswords[credential.id] ? (
                                      <EyeOff className="h-3 w-3" />
                                    ) : (
                                      <Eye className="h-3 w-3" />
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0 shrink-0"
                                    onClick={() => copyToClipboard(credential.password, "Senha")} // Updated label
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>

                              {/* Shared With */}
                              <div className="flex items-start gap-2 pt-1.5 border-t">
                                <Users className="h-3 w-3 text-gray-400 mt-0.5" />
                                <div className="flex-1">
                                  <p className="text-[10px] font-medium text-gray-500 mb-1">Compartilhado:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {credential.sharedWith.map((user: any, idx: number) => (
                                      <Badge key={idx} variant="secondary" className="text-[10px] h-4 px-1.5">
                                        {typeof user === "string" ? user : user.name}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 w-7 p-0 bg-transparent"
                              onClick={() => {
                                setSelectedCredential(credential)
                                setShowShareCredential(true)
                              }}
                            >
                              <Share2 className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 w-7 p-0 bg-transparent"
                              onClick={() => handleEditCredential(credential)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 w-7 p-0 text-red-600 hover:text-red-700 bg-transparent"
                              onClick={() => {
                                setEditingCredential(credential)
                                setShowDeleteCredentialDialog(true)
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Tarefas */}
              <TabsContent value="tarefas" className="p-0 m-0 flex-1 overflow-y-auto bg-slate-200">
                <div className="px-[50px] pt-[25px] pb-[80px] space-y-4">

                  {/* ── Stats bar ── */}
                  {(() => {
                    const allTasks = getAllTasks()
                    const stats = {
                      total:     allTasks.length,
                      execucao:  allTasks.filter(t => t.status === "Em Execução").length,
                      aprovada:  allTasks.filter(t => t.status === "Aprovada").length,
                      aprovacao: allTasks.filter(t => t.status === "Para Aprovação").length,
                      entregue:  allTasks.filter(t => t.status === "Entregue").length,
                      atrasada:  allTasks.filter(t => t.status === "Atrasada").length,
                    }
                    return (
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-2">
                          <div className="h-6 w-6 rounded-md bg-indigo-100 flex items-center justify-center">
                            <CheckSquare className="h-3.5 w-3.5 text-indigo-600" />
                          </div>
                          <span className="text-xs font-semibold text-slate-600">Total</span>
                          <span className="text-sm font-bold text-slate-900">{stats.total}</span>
                        </div>
                        {stats.execucao > 0 && (
                          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-2">
                            <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
                            <span className="text-xs font-semibold text-slate-500">Em Execução</span>
                            <span className="text-sm font-bold text-blue-600">{stats.execucao}</span>
                          </div>
                        )}
                        {stats.aprovada > 0 && (
                          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-2">
                            <div className="h-2 w-2 rounded-full bg-emerald-500 flex-shrink-0" />
                            <span className="text-xs font-semibold text-slate-500">Aprovadas</span>
                            <span className="text-sm font-bold text-emerald-600">{stats.aprovada}</span>
                          </div>
                        )}
                        {stats.aprovacao > 0 && (
                          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-2">
                            <div className="h-2 w-2 rounded-full bg-amber-400 flex-shrink-0" />
                            <span className="text-xs font-semibold text-slate-500">Para Aprovação</span>
                            <span className="text-sm font-bold text-amber-500">{stats.aprovacao}</span>
                          </div>
                        )}
                        {stats.entregue > 0 && (
                          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-2">
                            <div className="h-2 w-2 rounded-full bg-purple-500 flex-shrink-0" />
                            <span className="text-xs font-semibold text-slate-500">Entregues</span>
                            <span className="text-sm font-bold text-purple-600">{stats.entregue}</span>
                          </div>
                        )}
                        {stats.atrasada > 0 && (
                          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-2">
                            <div className="h-2 w-2 rounded-full bg-red-400 flex-shrink-0" />
                            <span className="text-xs font-semibold text-slate-500">Atrasadas</span>
                            <span className="text-sm font-bold text-red-500">{stats.atrasada}</span>
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  {/* ── Main card ── */}
                  <div className="border border-slate-200/70 shadow-sm overflow-hidden rounded-xl bg-white">

                    {/* ── Top bar ── */}
                    <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-200/70 bg-slate-50/60">
                      {/* Search */}
                      <div className="flex-1 relative min-w-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Buscar tarefa ou ID..."
                          value={taskSearchTerm}
                          onChange={(e) => { setTaskSearchTerm(e.target.value); setTasksCurrentPage(1) }}
                          className="w-full pl-9 pr-3 h-9 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                        />
                      </div>

                      {/* Lista / Kanban toggle */}
                      <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden flex-shrink-0">
                        <button
                          onClick={() => setTasksViewMode("list")}
                          className={`flex items-center gap-1.5 h-9 px-3 text-xs font-medium transition-colors ${
                            tasksViewMode === "list" ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <List className="h-3.5 w-3.5" />
                          Lista
                        </button>
                        <button
                          onClick={() => setTasksViewMode("kanban")}
                          className={`flex items-center gap-1.5 h-9 px-3 text-xs font-medium transition-colors border-l border-slate-200 ${
                            tasksViewMode === "kanban" ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <LayoutGrid className="h-3.5 w-3.5" />
                          Kanban
                        </button>
                      </div>

                      {/* Items per page + count */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Select value={tasksPerPage.toString()} onValueChange={(v) => { setTasksPerPage(parseInt(v)); setTasksCurrentPage(1) }}>
                          <SelectTrigger className="h-9 w-[72px] text-xs border-slate-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="20">20</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                            <SelectItem value="100">100</SelectItem>
                          </SelectContent>
                        </Select>
                        <span className="text-xs text-slate-400 whitespace-nowrap">
                          de <span className="font-semibold text-slate-600">{getFilteredAndSortedTasks().length}</span> tarefa{getFilteredAndSortedTasks().length !== 1 ? "s" : ""}
                        </span>
                      </div>

                      {/* Filtros */}
                      <button
                        onClick={() => setShowTaskFilters(!showTaskFilters)}
                        className={`flex items-center gap-1.5 h-9 px-3.5 text-xs font-medium rounded-lg border transition-colors flex-shrink-0 ${
                          showTaskFilters ? "border-blue-400 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <Filter className="h-3.5 w-3.5" />
                        Filtros
                      </button>

                      {/* Pagination */}
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <button
                          onClick={() => setTasksCurrentPage(p => Math.max(1, p - 1))}
                          disabled={tasksCurrentPage === 1}
                          className="h-7 w-7 flex items-center justify-center rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                        >
                          <ChevronDown className="h-3.5 w-3.5 rotate-90" />
                        </button>
                        {(() => {
                          const totalPages = getTotalTaskPages() || 1
                          const pages: (number|string)[] = []
                          if (totalPages <= 7) { for (let i = 1; i <= totalPages; i++) pages.push(i) }
                          else {
                            pages.push(1)
                            if (tasksCurrentPage > 3) pages.push("...")
                            for (let i = Math.max(2, tasksCurrentPage - 1); i <= Math.min(totalPages - 1, tasksCurrentPage + 1); i++) pages.push(i)
                            if (tasksCurrentPage < totalPages - 2) pages.push("...")
                            pages.push(totalPages)
                          }
                          return pages.map((page, idx) =>
                            page === "..." ? (
                              <span key={idx} className="text-xs text-slate-300 px-0.5">·</span>
                            ) : (
                              <button key={idx} onClick={() => setTasksCurrentPage(Number(page))}
                                className={`h-7 w-7 flex items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                                  page === tasksCurrentPage ? "bg-blue-500 text-white shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                                }`}>
                                {page}
                              </button>
                            )
                          )
                        })()}
                        <button
                          onClick={() => setTasksCurrentPage(p => Math.min(getTotalTaskPages(), p + 1))}
                          disabled={tasksCurrentPage === getTotalTaskPages() || getTotalTaskPages() === 0}
                          className="h-7 w-7 flex items-center justify-center rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                        >
                          <ChevronDown className="h-3.5 w-3.5 -rotate-90" />
                        </button>
                      </div>
                    </div>

                    {/* ── Filter panel ── */}
                    {showTaskFilters && (
                      <div className="px-5 py-3.5 border-b border-slate-200/70 bg-white">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 block">Status</label>
                            <Select value={taskStatusFilter} onValueChange={setTaskStatusFilter}>
                              <SelectTrigger className="h-8 text-xs border-slate-200"><SelectValue placeholder="Todos" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                <SelectItem value="Aprovada">Aprovada</SelectItem>
                                <SelectItem value="Em Execução">Em Execução</SelectItem>
                                <SelectItem value="Para Aprovação">Para Aprovação</SelectItem>
                                <SelectItem value="Entregue">Entregue</SelectItem>
                                <SelectItem value="Atrasada">Atrasada</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 block">Produto</label>
                            <Select value={taskProductFilter} onValueChange={setTaskProductFilter}>
                              <SelectTrigger className="h-8 text-xs border-slate-200"><SelectValue placeholder="Todos" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                {mockData.produtos.map((produto) => (
                                  <SelectItem key={produto.id} value={produto.id.toString()}>{produto.nome}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 block">Ordenar por</label>
                            <div className="flex gap-1.5">
                              <Select value={taskSortBy} onValueChange={setTaskSortBy}>
                                <SelectTrigger className="h-8 text-xs flex-1 border-slate-200"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="produto">Produto</SelectItem>
                                  <SelectItem value="nome">Nome</SelectItem>
                                  <SelectItem value="status">Status</SelectItem>
                                  <SelectItem value="prazo">Prazo</SelectItem>
                                  <SelectItem value="executor">Executor</SelectItem>
                                  <SelectItem value="lider">Líder</SelectItem>
                                </SelectContent>
                              </Select>
                              <button
                                onClick={() => setTaskSortOrder(taskSortOrder === "asc" ? "desc" : "asc")}
                                className="h-8 w-8 flex items-center justify-center border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-slate-500"
                              >
                                {taskSortOrder === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-end mt-2">
                          <button
                            onClick={() => { setTaskStatusFilter("all"); setTaskProductFilter("all"); setTaskDateFilter(""); setTaskSortBy("produto"); setTaskSortOrder("asc"); setTaskSearchTerm("") }}
                            className="text-xs text-slate-500 hover:text-slate-700 font-medium"
                          >
                            Limpar Filtros
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ── Content ── */}
                    {tasksViewMode === "list" ? (
                      <div>
                        {getPaginatedTasks().length > 0 ? (
                          getPaginatedTasks().map((tarefa, idx) => (
                            <div
                              key={tarefa.uniqueId}
                              className={`flex items-center gap-4 px-5 py-3 hover:brightness-95 transition-all ${
                                idx % 2 === 0 ? "bg-white" : "bg-slate-50/70"
                              }`}
                              style={{ borderLeft: `3px solid ${getStatusBorderColor(tarefa.status)}` }}
                            >
                              {/* ID */}
                              <div className="flex items-center justify-center bg-blue-50 rounded px-2 py-0.5 shrink-0">
                                <span className="text-[11px] text-blue-600 font-bold">#{tarefa.uniqueId}</span>
                              </div>

                              {/* Main info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                  <span className={`text-sm font-semibold ${tarefa.status === "Atrasada" ? "text-red-600" : "text-slate-900"}`}>{tarefa.nome}</span>
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium border border-slate-200">{tarefa.produtoNome}</span>
                                </div>
                                <div className="flex items-center gap-2.5 text-[11px] text-slate-400 flex-wrap">
                                  <span className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    <span className="font-medium text-slate-600">{tarefa.executor}</span>
                                  </span>
                                  <span>·</span>
                                  <span className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    <span className="font-medium text-slate-600">{tarefa.lider}</span>
                                  </span>
                                  <span>·</span>
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    <span className="font-medium text-slate-600">{tarefa.prazo}</span>
                                  </span>
                                </div>
                              </div>

                              {/* Status pill + eye */}
                              <div className="flex items-center gap-2 shrink-0">
                                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border ${getStatusBadgeColor(tarefa.status)}`}>
                                  <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${getStatusDotClass(tarefa.status)}`} />
                                  {tarefa.status}
                                </div>
                                <button
                                  className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                  title="Visualizar Tarefa"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                              <CheckSquare className="h-7 w-7 opacity-40" />
                            </div>
                            <p className="text-sm font-medium text-slate-500">Nenhuma tarefa encontrada</p>
                            <p className="text-xs text-slate-400 mt-1">Tente ajustar os filtros ou a busca</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex gap-3 overflow-x-auto px-5 pb-4 pt-4">
                        {["Aprovada", "Em Execução", "Para Aprovação", "Entregue", "Atrasada"].map((status) => {
                          const statusTasks = getFilteredAndSortedTasks().filter((t) => t.status === status)
                          const columnColor = getStatusBorderColor(status)
                          return (
                            <div key={status} className="flex-shrink-0 w-64">
                              <div className="rounded-t-xl p-2.5 mb-2" style={{ background: `linear-gradient(135deg, ${columnColor}15, ${columnColor}30)`, borderBottom: `3px solid ${columnColor}` }}>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <span className={`h-2 w-2 rounded-full ${getStatusDotClass(status)}`} />
                                    <span className="font-semibold text-xs" style={{ color: columnColor }}>{status}</span>
                                  </div>
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full border" style={{ borderColor: columnColor, color: columnColor }}>{statusTasks.length}</span>
                                </div>
                              </div>
                              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                                {statusTasks.length > 0 ? (
                                  statusTasks.map((tarefa) => (
                                    <div key={tarefa.uniqueId} className="bg-white rounded-lg p-2.5 shadow-sm border-l-4 hover:shadow-md transition-all" style={{ borderLeftColor: columnColor }}>
                                      <div className="flex items-center justify-between gap-1 mb-1.5">
                                        <div className="flex items-center justify-center bg-blue-50 rounded px-1.5 py-0.5">
                                          <span className="text-[9px] text-blue-600 font-bold">#{tarefa.uniqueId}</span>
                                        </div>
                                        <button className="h-5 w-5 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-colors">
                                          <Eye className="h-3 w-3" />
                                        </button>
                                      </div>
                                      <p className="font-semibold text-xs text-slate-800 line-clamp-2 mb-1.5">{tarefa.nome}</p>
                                      <span className="inline-block text-[9px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 mb-1.5">{tarefa.produtoNome}</span>
                                      <div className="space-y-0.5 text-[9px] text-slate-400 pt-1.5 border-t border-slate-100">
                                        <div className="flex items-center gap-1"><User className="h-2.5 w-2.5" /><span className="font-medium text-slate-600">{tarefa.executor}</span></div>
                                        <div className="flex items-center gap-1"><Users className="h-2.5 w-2.5" /><span className="font-medium text-slate-600">{tarefa.lider}</span></div>
                                        <div className="flex items-center gap-1"><Calendar className="h-2.5 w-2.5" /><span className="font-medium text-slate-600">{tarefa.prazo}</span></div>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="flex items-center justify-center h-20 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                                    <p className="text-[10px] text-slate-400">Sem tarefas</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                  </div>
                </div>
              </TabsContent>

              {/* Faturamento */}
              <TabsContent value="faturamento" className="p-4 m-0 flex-1 overflow-y-auto">
                <div className="space-y-4">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-3 gap-4 pb-4 border-b">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Última Forma de Pagamento</p>
                      <p className="text-sm font-semibold">Carteira</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Último Pagamento</p>
                      <p className="text-sm font-semibold">15/10/2025</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Próxima Cobrança</p>
                      <p className="text-sm font-semibold">15/11/2025</p>
                    </div>
                  </div>

                  {/* Invoices */}
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Faturas</h3>
                    <p className="text-xs text-muted-foreground mb-3">{mockInvoices.length} registro(s) encontrados.</p>

                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="text-xs font-semibold">SITUAÇÃO</TableHead>
                            <TableHead className="text-xs font-semibold">COMPETÊNCIA</TableHead>
                            <TableHead className="text-xs font-semibold">DESCRIÇÃO</TableHead>
                            <TableHead className="text-xs font-semibold">VALOR</TableHead>
                            <TableHead className="text-xs font-semibold text-right">AÇÕES</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {mockInvoices.map((invoice) => (
                            <TableRow key={invoice.id} className="hover:bg-muted/30">
                              <TableCell className="py-2">
                                <Badge
                                  className={`${
                                    invoice.status === "PAGO"
                                      ? "bg-green-500 hover:bg-green-600"
                                      : "bg-yellow-500 hover:bg-yellow-600"
                                  } text-white text-xs`}
                                >
                                  {invoice.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs font-medium">{invoice.month}</TableCell>
                              <TableCell className="text-xs">{invoice.descricao}</TableCell>
                              <TableCell className="text-xs font-semibold">
                                R$ {invoice.valor.toFixed(2).replace(".", ",")}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0 bg-blue-100 hover:bg-blue-200"
                                    onClick={() => {
                                      setSelectedInvoice(invoice)
                                      setShowInvoiceDetails(true)
                                    }}
                                  >
                                    <Eye className="h-3.5 w-3.5 text-blue-700" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0 bg-yellow-100 hover:bg-yellow-200"
                                    onClick={() => handleDownloadInvoicePDF(invoice)}
                                  >
                                    <Download className="h-3.5 w-3.5 text-yellow-700" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Formas de Pagamento */}
              <TabsContent value="pagamento" className="p-6 m-0 flex-1 overflow-y-auto">
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold">Formas de Pagamento</h3>

                  {/* Info Banner */}
                  <Card className="p-4 bg-blue-50 border-blue-200">
                    <div className="flex items-start gap-3">
                      <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-sm text-blue-900 mb-1">Forma de faturamento padrão</h4>
                        <p className="text-xs text-blue-800">
                          Selecione abaixo qual deverá ser a forma de faturamento padrão caso a forma de faturamento
                          definida no projeto não funcione.
                        </p>
                      </div>
                    </div>
                  </Card>

                  {/* Payment Methods */}
                  <div className="space-y-2">
                    {/* Credit Card */}
                    <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-2.5 flex-1">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                          <CreditCard className="h-4 w-4 text-gray-600" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-xs">CARTÃO DE CRÉDITO</div>
                          {savedCards.find((c) => c.isDefault) && (
                            <div className="text-[10px] text-gray-500 mt-0.5">
                              {savedCards.find((c) => c.isDefault)?.number} •{" "}
                              {savedCards.find((c) => c.isDefault)?.name}
                            </div>
                          )}
                        </div>
                      </div>
                      <input
                        type="radio"
                        name="payment-method"
                        value="cartao"
                        checked={defaultPaymentMethod === "cartao"}
                        onChange={(e) => setDefaultPaymentMethod(e.target.value)}
                        className="w-4 h-4"
                      />
                    </label>

                    {defaultPaymentMethod === "cartao" && (
                      <Card className="p-4 ml-11 bg-gray-50 border-gray-200">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-xs font-semibold text-gray-700">Cartões Salvos</h4>
                            <Button size="sm" variant="outline" className="h-7 text-xs bg-transparent">
                              <Plus className="h-3 w-3 mr-1" />
                              Adicionar Cartão
                            </Button>
                          </div>
                          {savedCards.map((card) => (
                            <div
                              key={card.id}
                              className="flex items-center justify-between p-2.5 bg-white rounded-lg border"
                            >
                              <div className="flex items-center gap-2">
                                <CreditCard className="h-4 w-4 text-gray-400" />
                                <div>
                                  <div className="text-xs font-medium">{card.number}</div>
                                  <div className="text-[10px] text-gray-500">
                                    {card.name} • Exp: {card.expiry}
                                  </div>
                                </div>
                                {card.isDefault && (
                                  <Badge className="bg-blue-100 text-blue-700 text-[9px] px-1.5 py-0">Padrão</Badge>
                                )}
                              </div>
                              <div className="flex gap-1">
                                {!card.isDefault && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0"
                                    onClick={() => {
                                      setSavedCards(savedCards.map((c) => ({ ...c, isDefault: c.id === card.id })))
                                      toast({ description: "Cartão definido como padrão" })
                                    }}
                                  >
                                    <CheckCircle className="h-3 w-3" />
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                                  onClick={() => {
                                    setSavedCards(savedCards.filter((c) => c.id !== card.id))
                                    toast({ description: "Cartão removido" })
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </Card>
                    )}

                    {/* Wallet */}
                    <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-2.5 flex-1">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                          <Wallet className="h-4 w-4 text-gray-600" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-xs">CARTEIRA</div>
                          <div className="text-[10px] text-gray-500 mt-0.5">
                            Saldo: R$ {walletBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>
                      <input
                        type="radio"
                        name="payment-method"
                        value="carteira"
                        checked={defaultPaymentMethod === "carteira"}
                        onChange={(e) => setDefaultPaymentMethod(e.target.value)}
                        className="w-4 h-4"
                      />
                    </label>

                    {defaultPaymentMethod === "carteira" && (
                      <Card className="p-4 ml-11 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs text-green-700 mb-1">Saldo Disponível</div>
                            <div className="text-2xl font-bold text-green-900">
                              R$ {walletBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                          <Wallet className="h-10 w-10 text-green-600 opacity-20" />
                        </div>
                      </Card>
                    )}

                    {/* Boleto */}
                    <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-2.5 flex-1">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                          <FileText className="h-4 w-4 text-gray-600" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-xs">BOLETO</div>
                          <div className="text-[10px] text-gray-500 mt-0.5">Pagamento via código de barras</div>
                        </div>
                      </div>
                      <input
                        type="radio"
                        name="payment-method"
                        value="boleto"
                        checked={defaultPaymentMethod === "boleto"}
                        onChange={(e) => setDefaultPaymentMethod(e.target.value)}
                        className="w-4 h-4"
                      />
                    </label>

                    {/* PIX */}
                    <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-2.5 flex-1">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                          <Zap className="h-4 w-4 text-gray-600" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-xs">PIX</div>
                          <div className="text-[10px] text-gray-500 mt-0.5">Transferência instantânea</div>
                        </div>
                      </div>
                      <input
                        type="radio"
                        name="payment-method"
                        value="pix"
                        checked={defaultPaymentMethod === "pix"}
                        onChange={(e) => setDefaultPaymentMethod(e.target.value)}
                        className="w-4 h-4"
                      />
                    </label>

                    {/* Allkoin - NEW */}
                    <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors relative overflow-hidden">
                      <div className="flex items-center gap-2.5 flex-1">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 via-blue-600 to-blue-800 flex items-center justify-center shadow-lg">
                          {/* Wolf silhouette icon */}
                          <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-white">
                            <path d="M12 2C11.5 2 11 2.19 10.59 2.59L8 5.17L5.41 2.59C5 2.19 4.5 2 4 2C2.9 2 2 2.9 2 4C2 4.5 2.19 5 2.59 5.41L4 6.83V9C4 10.1 4.9 11 6 11H7L6 13L4 14C3.45 14 3 14.45 3 15V17C3 17.55 3.45 18 4 18H6V20C6 21.1 6.9 22 8 22H16C17.1 22 18 21.1 18 20V18H20C20.55 18 21 17.55 21 17V15C21 14.45 20.55 14 20 14L18 13L17 11H18C19.1 11 20 10.1 20 9V6.83L21.41 5.41C21.81 5 22 4.5 22 4C22 2.9 21.1 2 20 2C19.5 2 19 2.19 18.59 2.59L16 5.17L13.41 2.59C13 2.19 12.5 2 12 2M12 6C12.55 6 13 6.45 13 7S12.55 8 12 8 11 7.55 11 7 11.45 6 12 6M9 9C9.55 9 10 9.45 10 10S9.55 11 9 11 8 10.55 8 10 8.45 9 9 9M15 9C15.55 9 16 9.45 16 10S15.55 11 15 11 14 10.55 14 10 14.45 9 15 9Z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-xs">ALLKOIN</span>
                            <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-[9px] px-1.5 py-0">
                              Novo
                            </Badge>
                          </div>
                          <div className="text-[10px] text-gray-500 mt-0.5">
                            {allkoinBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} AK • 1 AK = R${" "}
                            {allkoinExchangeRate.toFixed(2)}
                          </div>
                        </div>
                      </div>
                      <input
                        type="radio"
                        name="payment-method"
                        value="allkoin"
                        checked={defaultPaymentMethod === "allkoin"}
                        onChange={(e) => setDefaultPaymentMethod(e.target.value)}
                        className="w-4 h-4"
                      />
                    </label>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit Mode Sheet */}
      <Sheet open={open && mode === "edit"} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          hideOverlay={true}
          className="p-0 flex flex-col gap-0 !w-auto !max-w-none overflow-hidden"
          style={{ left: `${sidebarWidth}px`, width: `calc(100vw - ${sidebarWidth}px)`, maxWidth: `calc(100vw - ${sidebarWidth}px)` }}
        >
          {/* Edit Header */}
          <SheetHeader className="px-6 py-4 border-b bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 shrink-0">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-white text-xl font-bold">Editar Projeto</SheetTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="h-8 w-8 hover:bg-white/20"
              >
                <X className="h-5 w-5 text-white" />
              </Button>
            </div>
          </SheetHeader>

          {/* Edit Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-6 py-6 space-y-6">
              {/* Project Info Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Informações do Projeto</h3>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Nome do Projeto</label>
                  <Input
                    value={editedProject?.name || ""}
                    onChange={(e) => setEditedProject({ ...editedProject!, name: e.target.value })}
                    placeholder="Digite o nome do projeto"
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Descrição</label>
                  <textarea
                    value={editedProject?.descricao || ""}
                    onChange={(e) => setEditedProject({ ...editedProject!, descricao: e.target.value })}
                    placeholder="Digite a descrição do projeto"
                    className="w-full h-24 p-3 border border-gray-300 rounded-lg text-sm font-sans resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Situação</label>
                    <select
                      value={editedProject?.situacao || "AGUARDANDO PAGAMENTO"}
                      onChange={(e) => setEditedProject({ ...editedProject!, situacao: e.target.value })}
                      className="w-full h-9 px-3 border border-gray-300 rounded-lg text-sm"
                    >
                      <option>AGUARDANDO PAGAMENTO</option>
                      <option>EM EXECUÇÃO</option>
                      <option>PAUSADO</option>
                      <option>CONCLUÍDO</option>
                      <option>CANCELADO</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Orçamento Total (R$)</label>
                    <Input
                      type="number"
                      value={editedProject?.budget || 0}
                      onChange={(e) => setEditedProject({ ...editedProject!, budget: Number(e.target.value) })}
                      placeholder="0,00"
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Products Section */}
              <div className="space-y-4 border-t pt-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Produtos Contratados</h3>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs bg-transparent"
                    onClick={() => {
                      // Adicionar novo produto
                      const newProduct = {
                        id: Math.max(...(editedProducts.map(p => p.id) || [0])) + 1,
                        nome: "Novo Produto",
                        tipo: "Avulso",
                        valor: 0,
                        dataContratacao: new Date().toLocaleDateString("pt-BR"),
                        dataEntrega: "",
                        status: "Contratado",
                        progresso: 0,
                      }
                      setEditedProducts([...editedProducts, newProduct])
                    }}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Adicionar Produto
                  </Button>
                </div>

                <div className="space-y-3">
                  {editedProducts && editedProducts.length > 0 ? (
                    editedProducts.map((product, idx) => (
                      <Card key={product.id} className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <Input
                              value={product.nome}
                              onChange={(e) => {
                                const updated = [...editedProducts]
                                updated[idx].nome = e.target.value
                                setEditedProducts(updated)
                              }}
                              placeholder="Nome do produto"
                              className="text-sm font-medium"
                            />
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
                            onClick={() => {
                              setEditedProducts(editedProducts.filter((_, i) => i !== idx))
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs text-gray-600">Tipo</label>
                            <select
                              value={product.tipo || "Avulso"}
                              onChange={(e) => {
                                const updated = [...editedProducts]
                                updated[idx].tipo = e.target.value
                                setEditedProducts(updated)
                              }}
                              className="w-full h-8 px-2 border border-gray-300 rounded text-xs"
                            >
                              <option>Avulso</option>
                              <option>Pacote</option>
                              <option>Recorrente</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs text-gray-600">Valor (R$)</label>
                            <Input
                              type="number"
                              value={product.valor || 0}
                              onChange={(e) => {
                                const updated = [...editedProducts]
                                updated[idx].valor = Number(e.target.value)
                                setEditedProducts(updated)
                              }}
                              className="h-8 text-xs"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs text-gray-600">Data de Entrega</label>
                            <Input
                              type="date"
                              value={product.dataEntrega || ""}
                              onChange={(e) => {
                                const updated = [...editedProducts]
                                updated[idx].dataEntrega = e.target.value
                                setEditedProducts(updated)
                              }}
                              className="h-8 text-xs"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs text-gray-600">Status</label>
                            <select
                              value={product.status || "Contratado"}
                              onChange={(e) => {
                                const updated = [...editedProducts]
                                updated[idx].status = e.target.value
                                setEditedProducts(updated)
                              }}
                              className="w-full h-8 px-2 border border-gray-300 rounded text-xs"
                            >
                              <option>Contratado</option>
                              <option>Em Desenvolvimento</option>
                              <option>Entregue</option>
                              <option>Cancelado</option>
                            </select>
                          </div>
                        </div>
                      </Card>
                    ))
                  ) : (
                    <div className="p-4 text-center text-sm text-gray-500 bg-gray-50 rounded-lg">
                      Nenhum produto adicionado. Clique em "Adicionar Produto" para começar.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Edit Footer with Save Button */}
          <div className="border-t bg-gray-50 p-4 flex gap-3 shrink-0">
            <Button
              variant="outline"
              className="flex-1 bg-white"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                // Salvar alterações
                if (editedProject && onSave) {
                  const updatedProject = {
                    ...editedProject,
                    products: editedProducts,
                  }
                  console.log("[v0] Salvando projeto:", updatedProject)
                  onSave(updatedProject)
                  toast({
                    title: "Sucesso!",
                    description: "Projeto atualizado com sucesso.",
                  })
                }
              }}
            >
              <Save className="h-4 w-4 mr-2" />
              Salvar Alterações
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Product Tasks Modal */}
      <Sheet open={showProductTasksModal} onOpenChange={setShowProductTasksModal}>
        <SheetContent
          side="right"
          className="left-[var(--sidebar-width,64px)] w-[calc(100vw-var(--sidebar-width,64px))] sm:max-w-[calc(100vw-var(--sidebar-width,64px))] h-full p-0 flex flex-col overflow-hidden"
        >
          {/* Header */}
          <SheetHeader className="shrink-0 px-8 py-5 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 text-white border-b border-white/10 shadow-lg">
            {selectedProduct && (
              <div className="flex items-start justify-between gap-6">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                      <Package className="h-4 w-4 text-white/80" />
                    </div>
                    <SheetTitle className="text-lg text-white font-bold leading-tight">{selectedProduct.nome}</SheetTitle>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                      selectedProduct.tipo === "Mensal" ? "bg-violet-500/30 text-violet-200" : "bg-blue-500/30 text-blue-200"
                    }`}>
                      {selectedProduct.tipo}
                    </span>
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center gap-4 pl-11">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-2xl font-black ${getProgressTextColor(selectedProduct.progresso)} drop-shadow-sm`} style={{filter:'brightness(1.4)'}}>
                        {selectedProduct.progresso}%
                      </span>
                      <span className="text-[10px] text-white/50 font-medium">concluído</span>
                    </div>
                    <div className="w-px h-5 bg-white/20" />
                    <span className="text-xs text-white/70">
                      <span className="font-semibold text-white">{selectedProduct.tarefasConcluidas}</span>/{selectedProduct.tarefasTotais} tarefas
                    </span>
                    <div className="w-px h-5 bg-white/20" />
                    <span className="text-xs text-white/70">
                      <span className="font-semibold text-white">{selectedProduct.tarefasTotais - selectedProduct.tarefasConcluidas}</span> pendentes
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3 pl-11">
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getProgressColor(selectedProduct.progresso)} transition-all duration-700`}
                        style={{ width: `${selectedProduct.progresso}%` }}
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowProductTasksModal(false)}
                  className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all mt-1"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </SheetHeader>

          {/* Content */}
          <div className="flex-1 overflow-y-auto bg-slate-200">
            <div className="px-[50px] pt-[25px] pb-[80px]">
              {selectedProduct && (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-900">
                      Tarefas do Produto
                    </h3>
                    <span className="text-xs text-slate-500">
                      {selectedProduct.tarefas.length} tarefa{selectedProduct.tarefas.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {selectedProduct.tarefas.length > 0 ? (
                    <div className="border border-slate-200/70 shadow-sm overflow-hidden rounded-xl bg-white">
                      {selectedProduct.tarefas.map((tarefa: any, index: number) => {
                        const uniqueTaskId = selectedProduct.id * 1000 + tarefa.id
                        const isOverdue = tarefa.status === "Atrasada"

                        return (
                          <div
                            key={uniqueTaskId}
                            className={`flex items-center gap-4 px-5 py-3 hover:brightness-95 transition-all ${
                              index % 2 === 0 ? "bg-white" : "bg-slate-50/70"
                            }`}
                            style={{ borderLeft: `3px solid ${getStatusBorderColor(tarefa.status)}` }}
                          >
                            {/* ID */}
                            <div className="flex items-center justify-center bg-blue-50 rounded px-2 py-0.5 shrink-0">
                              <span className="text-[11px] text-blue-600 font-bold">#{uniqueTaskId}</span>
                            </div>

                            {/* Main info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                <span className={`text-sm font-semibold ${isOverdue ? "text-red-600" : "text-slate-900"}`}>{tarefa.nome}</span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium border border-slate-200">{selectedProduct.nome}</span>
                              </div>
                              <div className="flex items-center gap-2.5 text-[11px] text-slate-400 flex-wrap">
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  <span className="font-medium text-slate-600">{tarefa.executor}</span>
                                </span>
                                <span>·</span>
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  <span className="font-medium text-slate-600">{tarefa.lider}</span>
                                </span>
                                {tarefa.prazo && (
                                  <>
                                    <span>·</span>
                                    <span className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      <span className="font-medium text-slate-600">{tarefa.prazo}</span>
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Status pill + eye */}
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[9px] text-slate-400 font-mono">#{uniqueTaskId}</span>
                              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border ${getStatusBadgeColor(tarefa.status)}`}>
                                <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${getStatusDotClass(tarefa.status)}`} />
                                {tarefa.status}
                              </div>
                              <button
                                className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                title="Visualizar Tarefa"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                        <CheckSquare className="h-7 w-7 opacity-40" />
                      </div>
                      <p className="text-sm font-medium text-slate-500">Nenhuma tarefa cadastrada</p>
                      <p className="text-xs text-slate-400 mt-1">Este produto ainda não possui tarefas associadas.</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Add File Dialog */}
      <Dialog open={showAddFileDialog} onOpenChange={setShowAddFileDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Arquivo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome do Arquivo</label>
              <Input
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="Digite o nome do arquivo"
              />
            </div>
            <Button className="w-full bg-transparent" variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Selecionar Arquivo
            </Button>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" className="flex-1 bg-transparent" onClick={() => setShowAddFileDialog(false)}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={handleAddFile}>
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edited Edit Credential Dialog */}
      <Dialog open={showEditCredentialDialog} onOpenChange={setShowEditCredentialDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Credencial</DialogTitle>
          </DialogHeader>
          {editingCredential && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Título</label>
                <Input
                  value={editingCredential.title}
                  onChange={(e) => setEditingCredential({ ...editingCredential, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">URL</label>
                <Input
                  value={editingCredential.url}
                  onChange={(e) => setEditingCredential({ ...editingCredential, url: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Usuário</label>
                <Input
                  value={editingCredential.username}
                  onChange={(e) => setEditingCredential({ ...editingCredential, username: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Senha</label>
                <div className="flex items-center gap-2">
                  <Input
                    type={editPasswordVisible ? "text" : "password"}
                    value={editingCredential.password}
                    onChange={(e) => setEditingCredential({ ...editingCredential, password: e.target.value })}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-9 w-9 p-0"
                    onClick={() => setEditPasswordVisible(!editPasswordVisible)}
                  >
                    {editPasswordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Confirmar Senha</label>
                <div className="flex items-center gap-2">
                  <Input
                    type={editPasswordVisible ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="flex-1"
                    placeholder="Digite a senha novamente"
                  />
                </div>
                {confirmPassword && confirmPassword !== editingCredential.password && (
                  <p className="text-xs text-red-600">As senhas não coincidem</p>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 bg-transparent"
              onClick={() => {
                setShowEditCredentialDialog(false)
                setEditPasswordVisible(false) // Reset visibility
                setConfirmPassword("") // Reset confirmation
              }}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1"
              onClick={handleSaveCredential}
              disabled={confirmPassword !== editingCredential?.password}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteCredentialDialog} onOpenChange={setShowDeleteCredentialDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Credencial</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-4">
            Tem certeza que deseja excluir esta credencial? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 bg-transparent"
              onClick={() => setShowDeleteCredentialDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1 bg-red-600 hover:bg-red-700"
              onClick={() => editingCredential && handleDeleteCredential(editingCredential.id)}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credential Details Sheet - Used for sharing management */}
      <Sheet open={showShareCredential} onOpenChange={setShowShareCredential}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto p-0">
          <SheetHeader className="px-6 py-4 border-b bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500">
            <SheetTitle className="text-white">
              <div className="flex items-center gap-3">
                <Share2 className="h-5 w-5" />
                <div>
                  <div className="text-lg font-semibold">Compartilhamento</div>
                  <div className="text-sm font-normal text-blue-50">{selectedCredential?.title}</div>
                </div>
              </div>
            </SheetTitle>
          </SheetHeader>

          {selectedCredential && (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">Usuários com Acesso</h3>
                  <span className="text-xs text-gray-500">{selectedCredential.sharedWith.length} usuários</span>
                </div>
                <div className="space-y-2">
                  {selectedCredential.sharedWith.map((user: any, idx: number) => {
                    const userName = typeof user === "string" ? user : user.name
                    const permission =
                      typeof user === "string"
                        ? "Pode visualizar"
                        : user.permission === "edit"
                          ? "Pode editar"
                          : "Pode visualizar"
                    const expiresAt = typeof user === "string" ? null : user.expiresAt
                    const isExpired = expiresAt && new Date(expiresAt) < new Date()

                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 flex-1">
                          <div className="h-7 w-7 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                            <span className="text-[10px] font-semibold text-white">
                              {userName
                                .split(" ")
                                .map((n: string) => n[0])
                                .join("")}
                            </span>
                          </div>
                          <div className="flex flex-col flex-1 min-w-0">
                            <span className="text-xs font-medium">{userName}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-gray-500">{permission}</span>
                              {expiresAt && (
                                <>
                                  <span className="text-[10px] text-gray-400">•</span>
                                  <span
                                    className={`text-[10px] ${isExpired ? "text-red-600 font-medium" : "text-gray-500"}`}
                                  >
                                    {isExpired
                                      ? "Expirado"
                                      : `Expira em ${new Date(expiresAt).toLocaleDateString("pt-BR")}`}
                                  </span>
                                </>
                              )}
                              {!expiresAt && (
                                <>
                                  <span className="text-[10px] text-gray-400">•</span>
                                  <span className="text-[10px] text-green-600">Sem expiração</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => {
                            toast({
                              title: "Acesso removido",
                              description: `${userName} não tem mais acesso a esta credencial.`,
                            })
                            setSelectedCredential({
                              ...selectedCredential,
                              sharedWith: selectedCredential.sharedWith.filter((_: any, i: number) => i !== idx),
                            })
                            // Also remove from the main list
                            setMockCredentials((prev: any[]) =>
                              prev.map((cred: any) =>
                                cred.id === selectedCredential.id
                                  ? {
                                      ...cred,
                                      sharedWith: cred.sharedWith.filter(
                                        (sharedUser: any) =>
                                          (typeof sharedUser === "string" ? sharedUser : sharedUser.name) !== userName,
                                      ),
                                    }
                                  : cred,
                              ),
                            )
                          }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="border-t pt-6 space-y-4">
                <div className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-blue-600" />
                  <h3 className="text-sm font-semibold text-gray-900">Adicionar Novo Acesso</h3>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700">
                      Usuário da Plataforma <span className="text-red-500">*</span>
                    </label>
                    <Select value={newAccessUser} onValueChange={setNewAccessUser}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Selecione um usuário" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="select-user" disabled>
                          Selecione um usuário
                        </SelectItem>
                        <SelectItem value="joao">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center">
                              <span className="text-[10px] text-white font-semibold">JS</span>
                            </div>
                            <span>João Silva</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="maria">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-purple-500 flex items-center justify-center">
                              <span className="text-[10px] text-white font-semibold">MS</span>
                            </div>
                            <span>Maria Santos</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="carlos">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center">
                              <span className="text-[10px] text-white font-semibold">CL</span>
                            </div>
                            <span>Carlos Lima</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="fernanda">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-pink-500 flex items-center justify-center">
                              <span className="text-[10px] text-white font-semibold">FD</span>
                            </div>
                            <span>Fernanda Dias</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="beatriz">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-orange-500 flex items-center justify-center">
                              <span className="text-[10px] text-white font-semibold">BS</span>
                            </div>
                            <span>Beatriz Souza</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="ricardo">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-indigo-500 flex items-center justify-center">
                              <span className="text-[10px] text-white font-semibold">RA</span>
                            </div>
                            <span>Ricardo Alves</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-700">
                        Permissão <span className="text-red-500">*</span>
                      </label>
                      <Select value={newAccessPermission} onValueChange={setNewAccessPermission}>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="view">
                            <div className="flex items-center gap-2">
                              <Eye className="h-3.5 w-3.5 text-gray-500" />
                              <span>Visualizar</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="edit">
                            <div className="flex items-center gap-2">
                              <Edit2 className="h-3.5 w-3.5 text-gray-500" />
                              <span>Editar</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-700">
                        Expira em {hasExpiration && <span className="text-red-500">*</span>}
                      </label>
                      <Input
                        type="date"
                        className={`h-9 text-sm ${!hasExpiration ? "bg-gray-100" : ""}`}
                        value={newAccessExpiration}
                        onChange={(e) => setNewAccessExpiration(e.target.value)}
                        disabled={!hasExpiration}
                        min={new Date().toISOString().split("T")[0]}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2.5 bg-blue-50 rounded-lg border border-blue-200">
                    <input
                      type="checkbox"
                      id="has-expiration"
                      checked={hasExpiration}
                      onChange={(e) => {
                        setHasExpiration(e.target.checked)
                        if (!e.target.checked) {
                          setNewAccessExpiration("")
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="has-expiration" className="text-xs text-gray-700 cursor-pointer">
                      {hasExpiration ? "Acesso com data de expiração" : "Acesso permanente (sem expiração)"}
                    </label>
                  </div>

                  <Button
                    className="w-full h-9 text-sm bg-blue-600 hover:bg-blue-700"
                    onClick={handleAddUserAccess}
                    disabled={newAccessUser === "select-user"}
                  >
                    <UserPlus className="h-3.5 w-3.5 mr-2" />
                    Adicionar Acesso
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={showInvoiceDetails} onOpenChange={setShowInvoiceDetails}>
        <SheetContent side="right" className="w-full sm:max-w-4xl p-0 flex flex-col">
          {selectedInvoice && (
            <>
              {/* Header with gradient */}
              <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold">Detalhes da Fatura</h2>
                      <p className="text-sm text-white/90">{selectedInvoice.month}</p>
                    </div>
                  </div>
                  <Badge
                    className={`${selectedInvoice.status === "PAGO" ? "bg-green-500" : "bg-yellow-500"} text-white`}
                  >
                    {selectedInvoice.status}
                  </Badge>
                </div>

                {/* Main value display */}
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mt-4">
                  <p className="text-sm text-white/80 mb-1">Valor Total</p>
                  <p className="text-3xl font-bold">R$ {selectedInvoice.valor.toFixed(2).replace(".", ",")}</p>
                  {selectedInvoice.desconto > 0 && (
                    <div className="mt-2 flex items-center gap-2 text-sm">
                      <span className="text-white/70 line-through">
                        R$ {selectedInvoice.valorOriginal.toFixed(2).replace(".", ",")}
                      </span>
                      <Badge className="bg-green-500/80 text-white text-xs">
                        -{selectedInvoice.descontoPercentual.toFixed(1)}% desconto
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              {/* Content with scroll */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Payment Information */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    Informações de Pagamento
                  </h3>
                  <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Agência</p>
                      <p className="text-sm font-medium">{selectedInvoice.agencia}</p>
                      <p className="text-xs text-muted-foreground">ID: {selectedInvoice.agenciaId}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Cliente</p>
                      <p className="text-sm font-medium">{selectedInvoice.cliente}</p>
                      <p className="text-xs text-muted-foreground">ID: {selectedInvoice.clienteId}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Forma de Pagamento</p>
                      <p className="text-sm font-medium">{selectedInvoice.formaPagamento}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Competência</p>
                      <p className="text-sm font-medium">{selectedInvoice.competencia}</p>
                    </div>
                  </div>
                </div>

                {/* Dates */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    Datas
                  </h3>
                  <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Data de Cobrança</p>
                      <p className="text-sm font-medium">{selectedInvoice.dataCobran}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Data de Pagamento</p>
                      <p className="text-sm font-medium">{selectedInvoice.dataPagamento || "Aguardando pagamento"}</p>
                    </div>
                  </div>
                </div>

                {/* Products */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Package className="h-4 w-4 text-blue-600" />
                    Produtos/Serviços Incluídos
                  </h3>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="text-xs">Produto</TableHead>
                          <TableHead className="text-xs text-center">Qtd</TableHead>
                          <TableHead className="text-xs text-right">Valor Unit.</TableHead>
                          <TableHead className="text-xs text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedInvoice.produtos.map((produto: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell className="text-xs font-medium">{produto.nome}</TableCell>
                            <TableCell className="text-xs text-center">{produto.quantidade}</TableCell>
                            <TableCell className="text-xs text-right">
                              R$ {produto.valorUnitario.toFixed(2).replace(".", ",")}
                            </TableCell>
                            <TableCell className="text-xs font-semibold text-right">
                              R$ {produto.valorTotal.toFixed(2).replace(".", ",")}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Summary */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-blue-600" />
                    Resumo Financeiro
                  </h3>
                  <div className="border rounded-lg p-4 space-y-2 bg-muted/20">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium">
                        R$ {selectedInvoice.valorOriginal.toFixed(2).replace(".", ",")}
                      </span>
                    </div>
                    {selectedInvoice.desconto > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Desconto ({selectedInvoice.descontoPercentual.toFixed(1)}%)</span>
                        <span className="font-medium">-R$ {selectedInvoice.desconto.toFixed(2).replace(".", ",")}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-base font-bold pt-2 border-t">
                      <span>Total</span>
                      <span className="text-blue-600">R$ {selectedInvoice.valor.toFixed(2).replace(".", ",")}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer with action */}
              <div className="border-t p-4 bg-muted/30">
                <Button className="w-full" onClick={() => handleDownloadInvoicePDF(selectedInvoice)}>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar PDF da Fatura
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Dados do Projeto — save confirmation */}
      <ConfirmationDialog
        open={showDadosProjSaveConfirm}
        onClose={() => setShowDadosProjSaveConfirm(false)}
        onConfirm={handleDadosProjSave}
        title="Salvar alterações?"
        message={<>Tem certeza que deseja salvar as alterações nos dados do projeto? Esta ação irá atualizar as informações.</>}
        confirmText="Sim, salvar"
        cancelText="Voltar edição"
        destructive={false}
      />

      {/* Dados do Projeto — cancel confirmation */}
      <ConfirmationDialog
        open={showDadosProjCancelConfirm}
        onClose={() => setShowDadosProjCancelConfirm(false)}
        onConfirm={() => { setIsDadosProjEditMode(false); setShowDadosProjCancelConfirm(false) }}
        title="Descartar alterações?"
        message={<>Tem certeza que deseja cancelar? Todas as alterações nos dados do projeto serão descartadas.</>}
        confirmText="Sim, descartar"
        cancelText="Voltar edição"
        destructive={true}
      />
    </>
  )
}
