// @ts-nocheck
import { useState, useMemo, useRef, useCallback, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import ProjectWizardSlidePanel from "@/components/project-wizard-slide-panel"
import ProjectCreateSlidePanel from "@/components/project-create-slide-panel"
import { AdvancedDateFilter } from "@/components/advanced-date-filter"
import { ItemsPerPageSelect } from "@/components/items-per-page-select"
import { exportToCSV, exportToExcel, exportToPDF, type ProjectData } from "@/lib/export-utils"
import type { DateRange } from "react-day-picker"
import {
  Search,
  FolderOpen,
  TrendingUp,
  DollarSign,
  Plus,
  Copy,
  FileText,
  Edit,
  Pencil,
  Ban,
  ExternalLink,
  Eye,
  Repeat,
  Clock,
  XCircle,
  AlertTriangle,
  Building2,
  Users,
  Zap,
  Briefcase,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  X,
  List,
  LayoutGrid,
  Settings,
  BarChart3,
  Cog,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Hash,
  Trash2,
  Save,
} from "lucide-react"
import { ProjectManagementModal } from "@/components/project-management-modal"
import { ProjectViewSlidePanel } from "@/components/project-view-slide-panel"
import { useSidebar } from "@/contexts/sidebar-context"
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"

const mockProjects = [
  {
    id: 1,
    name: "Hospedagem Florescer Idosos",
    client: "Florescer",
    clientCNPJ: "12.345.678/0001-90",
    agency: "Lamego Academy",
    consultant: "Equipe Lamego",
    consultantEmail: "contato@lamego.com.vc",
    type: "Marketing Digital",
    status: "awaiting-payment",
    progress: 65,
    budget: 15000,
    spent: 9750,
    createdDate: "19/02/2025",
    startDate: "2024-01-15",
    deadline: "2024-03-30",
    team: 5,
    nomades: ["Ana Santos", "Carlos Lima"],
    bitrixSync: false,
    portfolioPermission: false,
    overdue: false,
    value: 15000,
    fromLead: true,
    tasks: 12,
  },
  {
    id: 2,
    name: "Redesign Website Startup ABC",
    client: "Startup ABC",
    clientCNPJ: "98.765.432/0001-10",
    agency: "Design Studio",
    consultant: "Maria Designer",
    consultantEmail: "maria@designstudio.com",
    type: "Desenvolvimento Web",
    status: "in-progress",
    progress: 45,
    budget: 25000,
    spent: 11250,
    createdDate: "15/01/2025",
    startDate: "2024-02-01",
    deadline: "2024-05-15",
    team: 3,
    nomades: ["Maria Silva", "João Dev"],
    bitrixSync: true,
    portfolioPermission: true,
    overdue: false,
    value: 25000,
    fromLead: false,
    tasks: 18,
  },
  {
    id: 3,
    name: "Identidade Visual FoodCorp",
    client: "FoodCorp",
    clientCNPJ: "11.222.333/0001-44",
    agency: "Creative Partners",
    consultant: "Pedro Criativo",
    consultantEmail: "pedro@creative.com",
    type: "Design",
    status: "completed",
    progress: 100,
    budget: 8000,
    spent: 7800,
    createdDate: "10/12/2024",
    startDate: "2023-12-10",
    deadline: "2024-01-20",
    team: 2,
    nomades: ["Ana Santos"],
    bitrixSync: true,
    portfolioPermission: false,
    overdue: false,
    value: 8000,
    fromLead: true,
    tasks: 7,
  },
  {
    id: 4,
    name: "Campanha Lançamento Produto XYZ",
    client: "Tech Innovations",
    clientCNPJ: "22.333.444/0001-55",
    agency: "Marketing Pro",
    consultant: "Lucas Marketing",
    consultantEmail: "lucas@marketingpro.com",
    type: "Marketing Digital",
    status: "negotiation",
    progress: 20,
    budget: 32000,
    spent: 6400,
    createdDate: "05/02/2025",
    startDate: "2024-03-01",
    deadline: "2024-06-30",
    team: 4,
    nomades: ["Carlos Lima", "Ana Santos"],
    bitrixSync: true,
    portfolioPermission: true,
    overdue: false,
    value: 32000,
    fromLead: true,
    tasks: 25,
  },
  {
    id: 5,
    name: "E-commerce Loja Virtual Fashion Style Boutique",
    client: "Fashion Style",
    clientCNPJ: "33.444.555/0001-66",
    agency: "WebDev Solutions",
    consultant: "Fernanda Tech",
    consultantEmail: "fernanda@webdev.com",
    type: "E-commerce",
    status: "draft",
    progress: 5,
    budget: 45000,
    spent: 2250,
    createdDate: "01/02/2025",
    startDate: "2024-04-01",
    deadline: "2024-08-15",
    team: 6,
    nomades: ["João Dev", "Maria Silva", "Pedro Criativo"],
    bitrixSync: false,
    portfolioPermission: false,
    overdue: false,
    value: 45000,
    fromLead: false,
    tasks: 20,
  },
  {
    id: 6,
    name: "App Mobile Delivery Express",
    client: "Delivery Express",
    clientCNPJ: "44.555.666/0001-77",
    agency: "Mobile Masters",
    consultant: "Ricardo Apps",
    consultantEmail: "ricardo@mobilemasters.com",
    type: "Desenvolvimento Mobile",
    status: "in-progress",
    progress: 70,
    budget: 62000,
    spent: 43400,
    createdDate: "20/12/2024",
    startDate: "2023-11-15",
    deadline: "2024-04-30",
    team: 7,
    nomades: ["Ana Santos", "João Dev", "Carlos Lima"],
    bitrixSync: true,
    portfolioPermission: true,
    overdue: false,
    value: 62000,
    fromLead: true,
    tasks: 38,
  },
  {
    id: 7,
    name: "Sistema CRM Empresarial",
    client: "Corporação Global",
    clientCNPJ: "55.666.777/0001-88",
    agency: "Enterprise Software",
    consultant: "Beatriz Systems",
    consultantEmail: "beatriz@enterprise.com",
    type: "Desenvolvimento Web",
    status: "awaiting-payment",
    progress: 90,
    budget: 78000,
    spent: 70200,
    createdDate: "15/11/2024",
    startDate: "2023-10-01",
    deadline: "2024-02-28",
    team: 8,
    nomades: ["Maria Silva", "Pedro Criativo", "João Dev"],
    bitrixSync: true,
    portfolioPermission: false,
    overdue: true,
    value: 78000,
    fromLead: false,
    tasks: 45,
  },
  {
    id: 8,
    name: "Consultoria SEO Avançada",
    client: "Digital Ventures",
    clientCNPJ: "66.777.888/0001-99",
    agency: "SEO Masters",
    consultant: "Gabriel SEO",
    consultantEmail: "gabriel@seomasters.com",
    type: "Consultoria",
    status: "in-progress",
    progress: 15,
    budget: 18000,
    spent: 2700,
    createdDate: "10/02/2025",
    startDate: "2024-03-15",
    deadline: "2024-05-30",
    team: 2,
    nomades: ["Ana Santos"],
    bitrixSync: false,
    portfolioPermission: true,
    overdue: false,
    value: 18000,
    fromLead: true,
    tasks: 10,
  },
  {
    id: 9,
    name: "Plataforma de Cursos Online",
    client: "EduTech Brasil",
    clientCNPJ: "77.888.999/0001-01",
    agency: "Learning Solutions",
    consultant: "Amanda Educação",
    consultantEmail: "amanda@learning.com",
    type: "Desenvolvimento Web",
    status: "in-progress",
    progress: 55,
    budget: 48000,
    spent: 26400,
    createdDate: "25/01/2025",
    startDate: "2024-02-10",
    deadline: "2024-06-20",
    team: 5,
    nomades: ["João Dev", "Maria Silva"],
    bitrixSync: true,
    portfolioPermission: true,
    overdue: false,
    value: 48000,
    fromLead: true,
    tasks: 30,
  },
  {
    id: 10,
    name: "App Fitness Tracker Premium",
    client: "Health & Wellness Co",
    clientCNPJ: "88.999.000/0001-12",
    agency: "Fitness Apps",
    consultant: "Roberto Health",
    consultantEmail: "roberto@fitnessapps.com",
    type: "Desenvolvimento Mobile",
    status: "in-progress",
    progress: 38,
    budget: 35000,
    spent: 13300,
    createdDate: "18/01/2025",
    startDate: "2024-01-25",
    deadline: "2024-05-05",
    team: 4,
    nomades: ["Carlos Lima", "Ana Santos"],
    bitrixSync: true,
    portfolioPermission: false,
    overdue: false,
    value: 35000,
    fromLead: false,
    tasks: 22,
  },
  {
    id: 11,
    name: "Sistema de Gestão Hospitalar",
    client: "Hospital São Lucas",
    clientCNPJ: "99.000.111/0001-23",
    agency: "Healthcare Systems",
    consultant: "Dra. Patricia Tech",
    consultantEmail: "patricia@healthcare.com",
    type: "Desenvolvimento Web",
    status: "in-progress",
    progress: 72,
    budget: 95000,
    spent: 68400,
    createdDate: "05/12/2024",
    startDate: "2023-11-01",
    deadline: "2024-04-15",
    team: 9,
    nomades: ["João Dev", "Maria Silva", "Pedro Criativo"],
    bitrixSync: true,
    portfolioPermission: true,
    overdue: false,
    value: 95000,
    fromLead: true,
    tasks: 56,
  },
  {
    id: 12,
    name: "Portal de Notícias Regional",
    client: "Jornal Cidade Nova",
    clientCNPJ: "00.111.222/0001-34",
    agency: "Media Digital",
    consultant: "Juliana Jornalismo",
    consultantEmail: "juliana@mediadigital.com",
    type: "Desenvolvimento Web",
    status: "in-progress",
    progress: 50,
    budget: 28000,
    spent: 14000,
    createdDate: "12/01/2025",
    startDate: "2024-02-05",
    deadline: "2024-05-25",
    team: 3,
    nomades: ["Ana Santos"],
    bitrixSync: false,
    portfolioPermission: true,
    overdue: false,
    value: 28000,
    fromLead: true,
    tasks: 16,
  },
]

const initialProjects = mockProjects

export default function AdminProjetosPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterType, setFilterType] = useState("all")
  const [filterPaymentStatus, setFilterPaymentStatus] = useState("all")
  const [filterCompany, setFilterCompany] = useState("all")
  const [filterAgency, setFilterAgency] = useState("all")
  const [filterValueRange, setFilterValueRange] = useState("all")
  const [filterDateRange, setFilterDateRange] = useState("all")
  const [filterFromLead, setFilterFromLead] = useState("all")
  const [filterConsultant, setFilterConsultant] = useState("all")
  const [filterPriceMin, setFilterPriceMin] = useState("")
  const [filterPriceMax, setFilterPriceMax] = useState("")
  const [filterTasksMin, setFilterTasksMin] = useState("")
  const [filterTasksMax, setFilterTasksMax] = useState("")
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [selectedProject, setSelectedProject] = useState<(typeof mockProjects)[0] | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<"view" | "edit" | "create">("view")
  const [showWizard, setShowWizard] = useState(false)
  const [showProjectCreate, setShowProjectCreate] = useState(false)
  const [projectCreateData, setProjectCreateData] = useState<any>(null)
  const [viewMode, setViewMode] = useState<"accordion" | "kanban">("accordion")
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const [showCloneDialog, setShowCloneDialog] = useState(false)
  const [projectToClone, setProjectToClone] = useState<(typeof mockProjects)[0] | null>(null)
  const [cloneProjectName, setCloneProjectName] = useState("")
  const [cloneAndEdit, setCloneAndEdit] = useState(false)
  const [showCancelWizard, setShowCancelWizard] = useState(false)
  const [projectToCancel, setProjectToCancel] = useState<(typeof mockProjects)[0] | null>(null)
  const [cancelStep, setCancelStep] = useState<1 | 2 | 3>(1)
  const [cancelReason, setCancelReason] = useState("")

  // ── New state: table + filters ──────────────────────────────────────────
  const [viewPanelOpen, setViewPanelOpen] = useState(false)
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
  const [showFieldPicker, setShowFieldPicker] = useState(false)
  const [visibleFields, setVisibleFields] = useState<string[]>(["buscar","empresa","agencia","consultor","status","tipo","origem","pagamento","preco","tarefas"])
  const [colConfigOpen, setColConfigOpen] = useState(false)
  const [savedFilters, setSavedFilters] = useState<Array<{ id: string; name: string; filters: any }>>([])
  const [activeFilterId, setActiveFilterId] = useState<string | null>(null)
  const [filterDragIdx, setFilterDragIdx] = useState<number | null>(null)
  const [filterDragOverIdx, setFilterDragOverIdx] = useState<number | null>(null)
  const [savedFilterName, setSavedFilterName] = useState("")
  const [isSavingFilter, setIsSavingFilter] = useState(false)

  // column visibility
  const ALL_COLS = ["id", "name", "client", "agency", "type", "status", "progress", "budget", "team", "created"]
  const COL_LABELS: Record<string, string> = {
    id: "#",
    name: "Projeto",
    client: "Cliente",
    agency: "Agência",
    type: "Tipo",
    status: "Status",
    progress: "Progresso",
    budget: "Orçamento",
    team: "Equipe",
    created: "Criação",
  }
  const [visibleCols, setVisibleCols] = useState<string[]>(ALL_COLS)

  // column widths (resizable)
  const DEFAULT_COL_WIDTHS: Record<string, number> = {
    id: 50, name: 240, client: 160, agency: 140, type: 130, status: 140, progress: 110, budget: 110, team: 70, created: 100,
  }
  const [colWidths, setColWidths] = useState<Record<string, number>>(DEFAULT_COL_WIDTHS)
  const dragState = useRef<{ col: string; startX: number; startW: number } | null>(null)

  // sidebar / header measurements for filter modal
  const { sidebarWidth } = useSidebar()
  const [headerHeight, setHeaderHeight] = useState(64)
  const [footerHeight, setFooterHeight] = useState(0)
  useEffect(() => {
    const header = document.querySelector("header")
    const footer = document.querySelector("footer")
    if (header) setHeaderHeight(header.getBoundingClientRect().height)
    if (footer) setFooterHeight(footer.getBoundingClientRect().height)
  }, [])

  const { toast } = useToast()

  const [kanbanColumns, setKanbanColumns] = useState([
    { id: "draft", label: "Rascunho", color: "bg-gray-800", count: 0 },
    { id: "negotiation", label: "Negociação", color: "bg-yellow-500", count: 0 },
    { id: "awaiting-payment", label: "Aguardando Pagamento", color: "bg-orange-500", count: 0 },
    { id: "planning", label: "Planejamento", color: "bg-blue-500", count: 0 },
    { id: "in-progress", label: "Em Andamento", color: "bg-purple-500", count: 0 },
    { id: "completed", label: "Concluído", color: "bg-green-500", count: 0 },
    { id: "cancelled", color: "bg-red-500", count: 0 },
  ])

  const [projectsData, setProjectsData] = useState(initialProjects)

  const [showColumnDialog, setShowColumnDialog] = useState(false)
  const [editingColumn, setEditingColumn] = useState<any>(null)
  const [newColumnName, setNewColumnName] = useState("")
  const [newColumnColor, setNewColumnColor] = useState("bg-blue-500")
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeType, setActiveType] = useState<"column" | "card" | null>(null)
  const [showDeleteColumnDialog, setShowDeleteColumnDialog] = useState(false)
  const [columnToDelete, setColumnToDelete] = useState<string | null>(null)
  const [targetColumnForItems, setTargetColumnForItems] = useState<string>("")

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  )

  // Helper function to check if a date is within the selected range
  const isDateInRange = (dateStr: string) => {
    if (!dateRange?.from || !dateRange?.to) return true
    try {
      // Parse DD/MM/YYYY format
      const [day, month, year] = dateStr.split("/").map(Number)
      const date = new Date(year, month - 1, day)
      return date >= dateRange.from && date <= dateRange.to
    } catch {
      return true
    }
  }

  // Get unique companies and agencies for filters
  const uniqueCompanies = useMemo(() => {
    return Array.from(new Set(mockProjects.map((p) => p.client))).sort()
  }, [])

  const uniqueAgencies = useMemo(() => {
    return Array.from(new Set(mockProjects.map((p) => p.agency))).sort()
  }, [])

  const uniqueConsultants = useMemo(() => {
    return Array.from(new Set(mockProjects.map((p) => p.consultant))).sort()
  }, [])

  const allFilterFields = [
    { id: "buscar",    label: "Buscar por nome" },
    { id: "empresa",   label: "Empresa / Cliente" },
    { id: "agencia",   label: "Agência" },
    { id: "consultor", label: "Responsável / Consultor" },
    { id: "status",    label: "Status" },
    { id: "tipo",      label: "Tipo" },
    { id: "origem",    label: "Origem (Lead)" },
    { id: "pagamento", label: "Pagamento" },
    { id: "preco",     label: "Faixa de Valor (R$)" },
    { id: "tarefas",   label: "Volume de Tarefas" },
  ]

  // Filter projects based on all active filters
  const filteredProjects = useMemo(() => {
    return projectsData.filter((project) => {
      const matchesSearch =
        searchTerm === "" ||
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.agency.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = filterStatus === "all" || project.status === filterStatus
      const matchesType = filterType === "all" || project.type === filterType
      const matchesCompany = filterCompany === "all" || project.client === filterCompany
      const matchesAgency = filterAgency === "all" || project.agency === filterAgency

      const matchesValueRange =
        filterValueRange === "all" ||
        (filterValueRange === "0-5000" && project.value <= 5000) ||
        (filterValueRange === "5000-15000" && project.value > 5000 && project.value <= 15000) ||
        (filterValueRange === "15000-50000" && project.value > 15000 && project.value <= 50000) ||
        (filterValueRange === "50000+" && project.value > 50000)

      const priceMin = filterPriceMin !== "" ? Number(filterPriceMin) : null
      const priceMax = filterPriceMax !== "" ? Number(filterPriceMax) : null
      const matchesPriceRange =
        (priceMin === null || project.value >= priceMin) &&
        (priceMax === null || project.value <= priceMax)

      const tasksMin = filterTasksMin !== "" ? Number(filterTasksMin) : null
      const tasksMax = filterTasksMax !== "" ? Number(filterTasksMax) : null
      const matchesTasksRange =
        (tasksMin === null || (project.tasks ?? 0) >= tasksMin) &&
        (tasksMax === null || (project.tasks ?? 0) <= tasksMax)

      const matchesConsultant = filterConsultant === "all" || project.consultant === filterConsultant

      const matchesPaymentStatus =
        filterPaymentStatus === "all" ||
        (filterPaymentStatus === "paid" && !project.overdue) ||
        (filterPaymentStatus === "overdue" && project.overdue)

      const matchesFromLead =
        filterFromLead === "all" ||
        (filterFromLead === "lead" && project.fromLead) ||
        (filterFromLead === "non-lead" && !project.fromLead)

      const matchesDateRange = isDateInRange(project.createdDate)

      return (
        matchesSearch &&
        matchesStatus &&
        matchesType &&
        matchesCompany &&
        matchesAgency &&
        matchesValueRange &&
        matchesPriceRange &&
        matchesTasksRange &&
        matchesConsultant &&
        matchesPaymentStatus &&
        matchesFromLead &&
        matchesDateRange
      )
    })
  }, [
    projectsData,
    searchTerm,
    filterStatus,
    filterType,
    filterCompany,
    filterAgency,
    filterValueRange,
    filterPaymentStatus,
    filterFromLead,
    filterConsultant,
    filterPriceMin,
    filterPriceMax,
    filterTasksMin,
    filterTasksMax,
    dateRange,
  ])

  // Clear all filters
  const clearAllFilters = () => {
    setSearchTerm("")
    setFilterStatus("all")
    setFilterType("all")
    setFilterPaymentStatus("all")
    setFilterCompany("all")
    setFilterAgency("all")
    setFilterValueRange("all")
    setFilterDateRange("all")
    setFilterFromLead("all")
    setFilterConsultant("all")
    setFilterPriceMin("")
    setFilterPriceMax("")
    setFilterTasksMin("")
    setFilterTasksMax("")
    setCurrentPage(1)
  }

  // Calculate pagination
  const totalProjects = filteredProjects.length
  const totalPages = Math.ceil(totalProjects / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedProjects = filteredProjects.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value)
    setCurrentPage(1)
  }

  const availableColors = [
    { label: "Cinza", value: "bg-gray-800" },
    { label: "Vermelho", value: "bg-red-500" },
    { label: "Laranja", value: "bg-orange-500" },
    { label: "Amarelo", value: "bg-yellow-500" },
    { label: "Verde", value: "bg-green-500" },
    { label: "Azul", value: "bg-blue-500" },
    { label: "Roxo", value: "bg-purple-500" },
    { label: "Rosa", value: "bg-pink-500" },
    { label: "Indigo", value: "bg-indigo-500" },
    { label: "Teal", value: "bg-teal-500" },
  ]

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    setActiveId(active.id as string)

    // Determine if dragging a column or a card
    if (kanbanColumns.find((col) => col.id === active.id)) {
      setActiveType("column")
    } else {
      setActiveType("card")
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) {
      setActiveId(null)
      setActiveType(null)
      return
    }

    if (activeType === "column") {
      // Reordering columns
      if (active.id !== over.id) {
        setKanbanColumns((columns) => {
          const oldIndex = columns.findIndex((col) => col.id === active.id)
          const newIndex = columns.findIndex((col) => col.id === over.id)
          return arrayMove(columns, oldIndex, newIndex)
        })
      }
    } else if (activeType === "card") {
      const projectId = Number(active.id)
      // Se o over.id é um número, significa que caiu sobre outro card, então pegamos o status do projeto
      let targetColumnId: string

      if (typeof over.id === "number") {
        // Caiu sobre outro card, pegar a coluna desse card
        const targetProject = projectsData.find((p) => p.id === over.id)
        targetColumnId = targetProject?.status || String(over.id)
      } else {
        // Caiu diretamente na coluna
        targetColumnId = String(over.id)
      }

      console.log(`[v0] Moving project ${projectId} to column ${targetColumnId}`)

      setProjectsData((currentProjects) => {
        const updatedProjects = currentProjects.map((project) =>
          project.id === projectId ? { ...project, status: targetColumnId } : project,
        )
        console.log(
          "[v0] Updated projects:",
          updatedProjects.filter((p) => p.id === projectId),
        )
        return updatedProjects
      })
    }

    setActiveId(null)
    setActiveType(null)
  }

  const handleAddColumn = () => {
    setEditingColumn(null)
    setNewColumnName("")
    setNewColumnColor("bg-blue-500")
    setShowColumnDialog(true)
  }

  const handleEditColumn = (column: any) => {
    setEditingColumn(column)
    setNewColumnName(column.label)
    setNewColumnColor(column.color)
    setShowColumnDialog(true)
  }

  const handleSaveColumn = () => {
    if (!newColumnName.trim()) return

    if (editingColumn) {
      // Edit existing column
      setKanbanColumns((columns) =>
        columns.map((col) =>
          col.id === editingColumn.id ? { ...col, label: newColumnName, color: newColumnColor } : col,
        ),
      )
    } else {
      // Add new column
      const newId = newColumnName.toLowerCase().replace(/\s+/g, "-")
      setKanbanColumns((columns) => [...columns, { id: newId, label: newColumnName, color: newColumnColor, count: 0 }])
    }

    setShowColumnDialog(false)
    setEditingColumn(null)
    setNewColumnName("")
    setNewColumnColor("bg-blue-500")
  }

  const handleDeleteColumn = (columnId: string) => {
    setColumnToDelete(columnId)
    const itemsInColumn = projectsData.filter((p) => p.status === columnId)
    if (itemsInColumn.length > 0) {
      // Se houver itens, precisa selecionar coluna destino
      const otherColumns = kanbanColumns.filter((col) => col.id !== columnId)
      if (otherColumns.length > 0) {
        setTargetColumnForItems(otherColumns[0].id)
      }
    }
    setShowDeleteColumnDialog(true)
  }

  const confirmDeleteColumn = () => {
    if (!columnToDelete) return

    const itemsInColumn = projectsData.filter((p) => p.status === columnToDelete)

    // Move os itens para a coluna destino se houver itens
    if (itemsInColumn.length > 0 && targetColumnForItems) {
      setProjectsData((projects) =>
        projects.map((p) => (p.status === columnToDelete ? { ...p, status: targetColumnForItems } : p)),
      )
    }

    // Remove a coluna
    setKanbanColumns((columns) => columns.filter((col) => col.id !== columnToDelete))

    // Fecha o dialog e limpa os estados
    setShowDeleteColumnDialog(false)
    setColumnToDelete(null)
    setTargetColumnForItems("")
  }

  const handleExport = (format: "csv" | "excel" | "pdf") => {
    // Filter projects by date range
    const exportProjects = mockProjects.filter((p) => isDateInRange(p.createdDate))

    // Convert to export format
    const exportData: ProjectData[] = exportProjects.map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      type: p.type,
      budget: p.budget,
      spent: p.spent,
      company: p.company,
      agency: p.agency,
      createdDate: p.createdDate,
      dueDate: p.dueDate,
      progress: p.progress,
    }))

    // Export based on format
    if (format === "csv") {
      exportToCSV(exportData, dateRange || { from: new Date(), to: new Date() })
    } else if (format === "excel") {
      exportToExcel(exportData, dateRange || { from: new Date(), to: new Date() })
    } else if (format === "pdf") {
      exportToPDF(exportData, dateRange || { from: new Date(), to: new Date() })
    }
  }

  // Calculate stats dynamically based on date range
  const stats = useMemo(() => {
    const statsFilteredProjects = mockProjects.filter((p) => isDateInRange(p.createdDate))

    const totalProjects = statsFilteredProjects.length
    const completedProjects = statsFilteredProjects.filter((p) => p.status === "completed").length
    const activeProjects = statsFilteredProjects.filter((p) => p.status === "in-progress").length
    const draftProjects = statsFilteredProjects.filter((p) => p.status === "draft").length
    const negotiationProjects = statsFilteredProjects.filter((p) => p.status === "negotiation").length
    const churnProjects = statsFilteredProjects.filter((p) => p.status === "cancelled").length
    const awaitingPaymentProjects = statsFilteredProjects.filter((p) => p.status === "awaiting-payment").length
    const overdueProjects = statsFilteredProjects.filter((p) => p.overdue).length

    // Calculate revenue metrics based on filtered projects
    const totalRevenue = statsFilteredProjects.reduce((sum, p) => sum + p.budget, 0)
    const totalSpent = statsFilteredProjects.reduce((sum, p) => sum + p.spent, 0)
    const awaitingPaymentValue = statsFilteredProjects
      .filter((p) => p.status === "awaiting-payment")
      .reduce((sum, p) => sum + p.budget, 0)
    const churnValue = statsFilteredProjects.filter((p) => p.status === "cancelled").reduce((sum, p) => sum + p.value, 0)
    const draftValue = statsFilteredProjects.filter((p) => p.status === "draft").reduce((sum, p) => sum + p.value, 0)
    const negotiationValue = statsFilteredProjects.filter((p) => p.status === "negotiation").reduce((sum, p) => sum + p.value, 0)
    const overdueValue = statsFilteredProjects.filter((p) => p.overdue).reduce((sum, p) => sum + (p.budget - p.spent), 0)

    // Calculate MRR (Monthly Recurring Revenue) based on active projects
    const mrr = Math.round((totalRevenue / (dateRange?.from && dateRange?.to
      ? Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) / 30
      : 1)) || 45000)

    // Calculate growth percentages
    const mrrGrowth = totalProjects > 0 ? ((activeProjects / totalProjects) * 100).toFixed(1) : 0
    const avulsosAtivos = totalProjects * 0.5 // Approximate avulsos
    const avulsosGrowth = totalProjects > 0 ? ((avulsosAtivos / totalProjects) * 10).toFixed(1) : 0
    const churnRate = totalProjects > 0 ? ((churnProjects / totalProjects) * 100).toFixed(1) : 0
    const churnGrowth = churnProjects > 0 ? ((churnProjects / (totalProjects || 1)) * 100).toFixed(1) : 0
    const revenueGrowth = totalRevenue > 0 ? ((totalSpent / totalRevenue) * 100).toFixed(1) : 0
    const companyProjects = statsFilteredProjects.filter((p) => p.type.includes("Web") || p.type.includes("Mobile")).length
    const companyGrowth = ((companyProjects / (totalProjects || 1)) * 100).toFixed(1)
    const agencyProjects = statsFilteredProjects.filter((p) => p.type.includes("Marketing")).length
    const agencyGrowth = ((agencyProjects / (totalProjects || 1)) * 100).toFixed(1)
    const squadProjects = statsFilteredProjects.filter((p) => p.type.includes("Desenvolvimento")).length
    const squadGrowth = ((squadProjects / (totalProjects || 1)) * 100).toFixed(1)
    const draftGrowth = draftProjects > 0 ? ((draftValue / (totalRevenue || 1)) * 100).toFixed(1) : 0
    const negotiationGrowth = negotiationProjects > 0 ? ((negotiationValue / (totalRevenue || 1)) * 100).toFixed(1) : 0
    const awaitingPaymentGrowth = awaitingPaymentProjects > 0 ? ((awaitingPaymentValue / (totalRevenue || 1)) * 100).toFixed(1) : 0
    const overdueGrowth = overdueProjects > 0 ? ((overdueValue / (totalRevenue || 1)) * -100).toFixed(1) : 0
    const projection30Days = Math.round(mrr * 1.15) // 15% growth projection

    return {
      totalProjects,
      draftProjects,
      negotiationProjects,
      completedProjects,
      activeProjects,
      mrr,
      mrrGrowth: Number(mrrGrowth),
      avulsosAtivos: Math.round(avulsosAtivos),
      avulsosGrowth: Number(avulsosGrowth),
      churnProjects,
      churnValue,
      churnRate: Number(churnRate),
      churnGrowth: Number(churnGrowth),
      totalRevenue,
      overdueValue,
      projection30Days,
      revenueGrowth: Number(revenueGrowth),
      companyProjects,
      companyGrowth: Number(companyGrowth),
      agencyProjects,
      agencyGrowth: Number(agencyGrowth),
      squadProjects,
      squadGrowth: Number(squadGrowth),
      draftValue,
      draftGrowth: Number(draftGrowth),
      negotiationValue,
      negotiationGrowth: Number(negotiationGrowth),
      awaitingPayment: awaitingPaymentProjects,
      awaitingPaymentValue,
      awaitingPaymentGrowth: Number(awaitingPaymentGrowth),
      overdueProjects,
      overdueGrowth: Number(overdueGrowth),
    }
  }, [dateRange])

  const handleEditProject = (project: (typeof mockProjects)[0]) => {
    setSelectedProject(project)
    setModalMode("edit")
    setModalOpen(true)
  }

  const handleViewProject = (project: (typeof mockProjects)[0]) => {
    setSelectedProject(project)
    setViewPanelOpen(true)
  }

  const handleCloneProject = (project: (typeof mockProjects)[0]) => {
    setProjectToClone(project)
    setCloneProjectName(`${project.name} (Clone)`)
    setCloneAndEdit(false)
    setShowCloneDialog(true)
  }

  const handleSaveProjectChanges = (updatedProject: (typeof mockProjects)[0]) => {
    setProjectsData((prevProjects) =>
      prevProjects.map((p) =>
        p.id === updatedProject.id ? updatedProject : p
      )
    )
    setSelectedProject(updatedProject)
    setModalMode("view")
    console.log("[v0] Projeto salvo com sucesso:", updatedProject.name)
  }

  const handleStartCancelProject = (project: (typeof mockProjects)[0]) => {
    setProjectToCancel(project)
    setCancelStep(1)
    setCancelReason("")
    setShowCancelWizard(true)
  }

  const handleConfirmCancel = () => {
    if (!projectToCancel) return

    const cancelledProject = {
      ...projectToCancel,
      status: "cancelled" as const,
      situacao: "Cancelado",
    }

    setProjectsData((prevProjects) =>
      prevProjects.map((p) =>
        p.id === projectToCancel.id ? cancelledProject : p
      )
    )

    setSelectedProject(null)
    setModalOpen(false)
    setShowCancelWizard(false)
    setProjectToCancel(null)
    setCancelReason("")
    setCancelStep(1)

    toast({
      title: "Projeto Cancelado",
      description: "O projeto foi cancelado e as cobranças futuras foram suspensas.",
    })
  }

  const handleConfirmClone = () => {
    if (!projectToClone || !cloneProjectName.trim()) {
      alert("Por favor, insira um nome para o projeto clonado")
      return
    }

    // Criar o novo projeto clonado
    const clonedProject = {
      ...projectToClone,
      id: Math.max(...projectsData.map(p => p.id)) + 1,
      name: cloneProjectName,
      createdDate: new Date().toLocaleDateString("pt-BR"),
      // Resetar dados de produtos contratados
      products: projectToClone.products?.map((product: any) => ({
        ...product,
        contracted: false,
        contractedDate: null,
        contractedValue: 0,
        contractedQuantity: 0,
      })) || [],
      // Resetar orçamento e gastos
      budget: 0,
      spent: 0,
      progress: 0,
    }

    // Adicionar ao estado de projetos
    setProjectsData([...projectsData, clonedProject])
    setShowCloneDialog(false)
    setProjectToClone(null)
    setCloneProjectName("")

    // Se usuário quer editar logo, abrir para edição
    if (cloneAndEdit) {
      setSelectedProject(clonedProject)
      setModalMode("edit")
      setModalOpen(true)
    }
  }

  const handleCreateProject = () => {
    setShowWizard(true)
  }

  const handleSkipWizard = () => {
    setShowWizard(false)
    setProjectCreateData(null)
    setShowProjectCreate(true)
  }

  // column resize
  const onResizeMouseDown = useCallback((col: string, e: React.MouseEvent) => {
    e.preventDefault()
    dragState.current = { col, startX: e.clientX, startW: colWidths[col] ?? DEFAULT_COL_WIDTHS[col] }
    const onMove = (ev: MouseEvent) => {
      if (!dragState.current) return
      const delta = ev.clientX - dragState.current.startX
      setColWidths((prev) => ({ ...prev, [dragState.current!.col]: Math.max(60, dragState.current!.startW + delta) }))
    }
    const onUp = () => {
      dragState.current = null
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
  }, [colWidths])

  const getPageNumbers = () => {
    const pages: (number | "...")[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (currentPage > 3) pages.push("...")
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)
      for (let i = start; i <= end; i++) pages.push(i)
      if (currentPage < totalPages - 2) pages.push("...")
      pages.push(totalPages)
    }
    return pages
  }

  const activeFilterCount = [
    filterStatus !== "all",
    filterType !== "all",
    filterPaymentStatus !== "all",
    filterCompany !== "all",
    filterAgency !== "all",
    filterValueRange !== "all",
    filterFromLead !== "all",
    filterConsultant !== "all",
    filterPriceMin !== "",
    filterPriceMax !== "",
    filterTasksMin !== "",
    filterTasksMax !== "",
    !!dateRange?.from,
  ].filter(Boolean).length

  const handleCreateWithAI = () => {
    setShowWizard(false)

    const aiGeneratedData = {
      name: "Projeto E-commerce Completo",
      client: "TechStore Brasil",
      company: "empresa1",
      type: "company",
      description:
        "Desenvolvimento de plataforma e-commerce completa com integração de pagamentos, gestão de estoque e painel administrativo.\n\nObjetivos:\n- Sistema de catálogo de produtos\n- Carrinho de compras e checkout\n- Integração com gateway de pagamento\n- Painel administrativo completo\n- Gestão de pedidos e logística",
      startDate: new Date().toISOString().split("T")[0],
      deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      budget: 45000,
      products: [
        { id: "1", name: "Website E-commerce", value: 25000, type: "avulso" },
        { id: "2", name: "Painel Administrativo", value: 15000, type: "avulso" },
        { id: "3", name: "Integração Pagamentos", value: 5000, type: "avulso" },
      ],
      files: [],
      vaultPassword: "",
      paymentMethod: "cartao",
    }

    setProjectCreateData(aiGeneratedData)
    setShowProjectCreate(true)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "awaiting-payment":
        return <Badge className="bg-cyan-500 text-white text-[10px] px-2 py-0.5">AGUARDANDO PAGAMENTO</Badge>
      case "in-progress":
        return <Badge className="bg-blue-500 text-white text-[10px] px-2 py-0.5">EM ANDAMENTO</Badge>
      case "completed":
        return <Badge className="bg-green-500 text-white text-[10px] px-2 py-0.5">CONCLUÍDO</Badge>
      case "planning":
        return <Badge className="bg-orange-500 text-white text-[10px] px-2 py-0.5">PLANEJAMENTO</Badge>
      default:
        return <Badge className="bg-gray-500 text-white text-[10px] px-2 py-0.5">{status}</Badge>
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Gestão de Projetos
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Centralize, acompanhe e otimize todos os seus projetos em um só lugar.</p>
        </div>
        <Button
          onClick={() => setShowProjectCreate(true)}
          className="btn-brand shadow-lg"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Projeto
        </Button>
      </div>

      <div className="space-y-3">
        <Accordion type="single" collapsible className="mb-1">
          <AccordionItem value="stats" className="border rounded-lg bg-blue-50 border-blue-200">
            <AccordionTrigger className="text-sm font-semibold hover:no-underline px-4 py-3 hover:bg-slate-50 rounded-t-lg transition-colors">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                <span className="text-blue-900">Estatísticas e Métricas</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 px-4 pb-3">
              <div className="mb-6">
                <AdvancedDateFilter
                  dateRange={dateRange}
                  onDateChange={setDateRange}
                  leadFilter={filterFromLead}
                  onLeadFilterChange={setFilterFromLead}
                  onExport={handleExport}
                  onReset={() => {
                    setDateRange(undefined)
                  }}
                  isLoading={false}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mb-1">
                <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-xs opacity-90">Projetos Totais</p>
                        <p className="text-2xl font-bold mt-0.5">{stats.totalProjects}</p>
                      </div>
                      <FolderOpen className="h-7 w-7 opacity-80" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-white/20">
                      <div>
                        <p className="text-[10px] opacity-75">Rascunho</p>
                        <p className="text-sm font-semibold">{stats.draftProjects}</p>
                      </div>
                      <div>
                        <p className="text-[10px] opacity-75">Negociação</p>
                        <p className="text-sm font-semibold">{stats.negotiationProjects}</p>
                      </div>
                      <div>
                        <p className="text-[10px] opacity-75">Concluídos</p>
                        <p className="text-sm font-semibold">{stats.completedProjects}</p>
                      </div>
                      <div>
                        <p className="text-[10px] opacity-75">Ativos</p>
                        <p className="text-sm font-semibold">{stats.activeProjects}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs opacity-90">MRR</p>
                        <p className="text-2xl font-bold mt-0.5">R$ {(stats.mrr / 1000).toFixed(0)}k</p>
                        <div className="flex items-center gap-1 mt-1">
                          <ArrowUpRight className="h-3 w-3" />
                          <span className="text-xs font-semibold">+{stats.mrrGrowth}%</span>
                        </div>
                      </div>
                      <Repeat className="h-7 w-7 opacity-80" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs opacity-90">Avulsos Ativos</p>
                        <p className="text-2xl font-bold mt-0.5">{stats.avulsosAtivos}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <ArrowDownRight className="h-3 w-3" />
                          <span className="text-xs font-semibold">{stats.avulsosGrowth}%</span>
                        </div>
                      </div>
                      <Clock className="h-7 w-7 opacity-80" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white border-0">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs opacity-90">Churn</p>
                        <p className="text-2xl font-bold mt-0.5">{stats.churnProjects}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs">
                          <span>{stats.churnRate}%</span>
                          <span>•</span>
                          <span>R$ {(stats.churnValue / 1000).toFixed(0)}k</span>
                        </div>
                      </div>
                      <XCircle className="h-7 w-7 opacity-80" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <Card className="bg-gradient-to-br from-rose-500 to-rose-600 text-white border-0">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs opacity-90">Inadimplência</p>
                        <p className="text-2xl font-bold mt-0.5">{stats.overdueProjects}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs">
                          <span>R$ {(stats.overdueValue / 1000).toFixed(0)}k</span>
                          <span>•</span>
                          <span className="flex items-center gap-0.5">
                            <ArrowDownRight className="h-3 w-3" />
                            {Math.abs(stats.overdueGrowth)}%
                          </span>
                        </div>
                      </div>
                      <AlertTriangle className="h-7 w-7 opacity-80" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-xs opacity-90">Receitas</p>
                        <p className="text-2xl font-bold mt-0.5">R$ {(stats.totalRevenue / 1000).toFixed(0)}k</p>
                        <div className="flex items-center gap-1 mt-1">
                          <ArrowUpRight className="h-3 w-3" />
                          <span className="text-xs font-semibold">+{stats.revenueGrowth}%</span>
                        </div>
                      </div>
                      <DollarSign className="h-7 w-7 opacity-80" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/20">
                      <div>
                        <p className="text-[10px] opacity-75">Inadimplência</p>
                        <p className="text-sm font-semibold">R$ {(stats.overdueValue / 1000).toFixed(0)}k</p>
                      </div>
                      <div>
                        <p className="text-[10px] opacity-75">Projeção 30d</p>
                        <p className="text-sm font-semibold">R$ {(stats.projection30Days / 1000).toFixed(0)}k</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-0">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-xs opacity-90">Tipos de Projetos</p>
                      </div>
                      <Briefcase className="h-7 w-7 opacity-80" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          <span className="text-sm">Company</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{stats.companyProjects}</span>
                          <span className="text-xs flex items-center gap-0.5">
                            <ArrowUpRight className="h-3 w-3" />
                            {stats.companyGrowth}%
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span className="text-sm">Agency</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{stats.agencyProjects}</span>
                          <span className="text-xs flex items-center gap-0.5">
                            <ArrowUpRight className="h-3 w-3" />
                            {stats.agencyGrowth}%
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4" />
                          <span className="text-sm">Squad</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{stats.squadProjects}</span>
                          <span className="text-xs flex items-center gap-0.5">
                            <ArrowUpRight className="h-3 w-3" />
                            {stats.squadGrowth}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-0">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-xs opacity-90">Negócios em Potencial</p>
                      </div>
                      <TrendingUp className="h-7 w-7 opacity-80" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs">Rascunho</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">R$ {(stats.draftValue / 1000).toFixed(0)}k</span>
                          <span className="text-[10px] flex items-center gap-0.5">
                            <ArrowUpRight className="h-2.5 w-2.5" />
                            {stats.draftGrowth}%
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs">Negociação</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">
                            R$ {(stats.negotiationValue / 1000).toFixed(0)}k
                          </span>
                          <span className="text-[10px] flex items-center gap-0.5">
                            <ArrowUpRight className="h-2.5 w-2.5" />
                            {stats.negotiationGrowth}%
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs">Ag. Pagamento</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">
                            R$ {(stats.awaitingPaymentValue / 1000).toFixed(0)}k
                          </span>
                          <span className="text-[10px] flex items-center gap-0.5">
                            <ArrowUpRight className="h-2.5 w-2.5" />
                            {stats.awaitingPaymentGrowth}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>


        {/* ── View toggle ── */}
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg bg-muted p-1">
              <Button
                size="sm"
                variant={viewMode === "accordion" ? "default" : "ghost"}
                onClick={() => setViewMode("accordion")}
                className={`h-8 rounded-md transition-all ${
                  viewMode === "accordion"
                    ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-sm"
                    : "hover:bg-background"
                }`}
              >
                <List className="h-3.5 w-3.5 mr-1.5" />
                Lista
              </Button>
              <Button
                size="sm"
                variant={viewMode === "kanban" ? "default" : "ghost"}
                onClick={() => setViewMode("kanban")}
                className={`h-8 rounded-md transition-all ${
                  viewMode === "kanban"
                    ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-sm"
                    : "hover:bg-background"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5 mr-1.5" />
                Kanban
              </Button>
            </div>
            {viewMode === "kanban" && (
              <Button
                onClick={handleAddColumn}
                size="sm"
                className="h-8 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-sm"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Nova Coluna
              </Button>
            )}
          </div>
        </div>

        {viewMode === "accordion" ? (
          <>
          <Card className="overflow-hidden">
            {/* ── Toolbar ── */}
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-100 bg-white flex-wrap">
              {/* Search */}
              <div className="relative flex-1 min-w-[180px] max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Buscar projeto, cliente..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
                  className="pl-8 h-8 text-xs border-slate-200"
                />
              </div>

              <ItemsPerPageSelect
                value={itemsPerPage}
                onChange={(v) => { setItemsPerPage(v); setCurrentPage(1) }}
              />

              <span className="text-xs text-slate-500 whitespace-nowrap">
                {filteredProjects.length} projeto{filteredProjects.length !== 1 ? "s" : ""}
              </span>

              {/* Filter button */}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsFilterModalOpen(true)}
                className={`h-8 gap-1.5 text-xs ${activeFilterCount > 0 ? "border-blue-400 bg-blue-50 text-blue-700" : ""}`}
              >
                <Filter className="h-3.5 w-3.5" />
                Filtros
                {activeFilterCount > 0 && (
                  <span className="ml-1 bg-blue-600 text-white rounded-full text-[10px] h-4 w-4 flex items-center justify-center font-bold">
                    {activeFilterCount}
                  </span>
                )}
              </Button>

              {/* Column config */}
              <Popover open={colConfigOpen} onOpenChange={setColConfigOpen}>
                <PopoverTrigger asChild>
                  <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                    <Cog className="h-3.5 w-3.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-52 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-slate-700">Colunas visíveis</p>
                    <button
                      onClick={() => setVisibleCols(ALL_COLS)}
                      className="text-[10px] text-blue-600 hover:underline"
                    >
                      Mostrar todas
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {ALL_COLS.map((col) => (
                      <label key={col} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={visibleCols.includes(col)}
                          onCheckedChange={(checked) => {
                            setVisibleCols((prev) =>
                              checked ? [...prev, col] : prev.filter((c) => c !== col)
                            )
                          }}
                          className="h-3.5 w-3.5"
                        />
                        <span className="text-xs text-slate-600">{COL_LABELS[col]}</span>
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Pagination (top) */}
              <div className="ml-auto flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                {getPageNumbers().map((pg, i) =>
                  pg === "..." ? (
                    <span key={`dots-${i}`} className="text-xs text-slate-400 px-1">…</span>
                  ) : (
                    <Button
                      key={pg}
                      size="sm"
                      variant={currentPage === pg ? "default" : "outline"}
                      className={`h-8 w-8 p-0 text-xs ${currentPage === pg ? "btn-brand" : ""}`}
                      onClick={() => setCurrentPage(pg as number)}
                    >
                      {pg}
                    </Button>
                  )
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0"
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* ── Table ── */}
            <div className="overflow-x-auto">
              <table
                className="w-full text-xs"
                style={{ tableLayout: "fixed", minWidth: visibleCols.reduce((acc, col) => acc + (colWidths[col] ?? 120), 80) }}
              >
                <colgroup>
                  {visibleCols.map((col) => (
                    <col key={col} style={{ width: colWidths[col] ?? DEFAULT_COL_WIDTHS[col] ?? 120 }} />
                  ))}
                  {/* actions col */}
                  <col style={{ width: 100 }} />
                </colgroup>
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    {visibleCols.map((col) => (
                      <th
                        key={col}
                        className="relative px-3 py-2.5 text-left text-[11px] font-semibold text-slate-600 uppercase tracking-wider select-none whitespace-nowrap overflow-hidden"
                      >
                        <span className="block truncate pr-3">{COL_LABELS[col]}</span>
                        <span
                          className="absolute right-0 top-0 bottom-0 w-3 cursor-col-resize flex items-center justify-center hover:bg-slate-200/60 group"
                          onMouseDown={(e) => onResizeMouseDown(col, e)}
                        >
                          <span className="w-px h-4 bg-slate-300 group-hover:bg-slate-500" />
                        </span>
                      </th>
                    ))}
                    <th className="sticky right-0 bg-slate-50 px-3 py-2.5 text-left text-[11px] font-semibold text-slate-600 uppercase tracking-wider z-10 border-l border-slate-200 w-[100px]">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedProjects.length === 0 ? (
                    <tr>
                      <td colSpan={visibleCols.length + 1} className="py-12 text-center text-slate-400">
                        <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm font-medium">Nenhum projeto encontrado</p>
                        {activeFilterCount > 0 && (
                          <button onClick={clearAllFilters} className="mt-2 text-xs text-blue-600 hover:underline">
                            Limpar filtros
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    paginatedProjects.map((project, rowIdx) => (
                      <TooltipProvider key={project.id} delayDuration={300}>
                        <tr
                          className={`border-b border-slate-100 hover:bg-blue-50/40 transition-colors cursor-pointer ${rowIdx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}
                          onClick={() => handleViewProject(project)}
                        >
                          {visibleCols.includes("id") && (
                            <td className="px-3 py-2.5 font-mono text-slate-400 overflow-hidden">
                              <span className="block truncate">#{project.id}</span>
                            </td>
                          )}
                          {visibleCols.includes("name") && (
                            <td className="px-3 py-2.5 overflow-hidden">
                              <span className="block truncate font-semibold text-slate-900">{project.name}</span>
                            </td>
                          )}
                          {visibleCols.includes("client") && (
                            <td className="px-3 py-2.5 overflow-hidden">
                              <span className="block truncate text-blue-600 font-medium">{project.client}</span>
                            </td>
                          )}
                          {visibleCols.includes("agency") && (
                            <td className="px-3 py-2.5 overflow-hidden">
                              <span className="block truncate text-slate-600">{project.agency}</span>
                            </td>
                          )}
                          {visibleCols.includes("type") && (
                            <td className="px-3 py-2.5 overflow-hidden">
                              <span className="block truncate text-slate-500">{project.type}</span>
                            </td>
                          )}
                          {visibleCols.includes("status") && (
                            <td className="px-3 py-2.5">
                              {getStatusBadge(project.status)}
                            </td>
                          )}
                          {visibleCols.includes("progress") && (
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-1.5">
                                <div className="flex-1 h-1.5 rounded-full bg-slate-200 min-w-[40px]">
                                  <div
                                    className="h-1.5 rounded-full bg-blue-500"
                                    style={{ width: `${project.progress}%` }}
                                  />
                                </div>
                                <span className="text-[10px] font-bold text-slate-600 flex-shrink-0">{project.progress}%</span>
                              </div>
                            </td>
                          )}
                          {visibleCols.includes("budget") && (
                            <td className="px-3 py-2.5 overflow-hidden">
                              <span className="block truncate font-semibold text-slate-900">
                                R$ {project.budget.toLocaleString("pt-BR")}
                              </span>
                            </td>
                          )}
                          {visibleCols.includes("team") && (
                            <td className="px-3 py-2.5 text-center text-slate-600">
                              {project.team}
                            </td>
                          )}
                          {visibleCols.includes("created") && (
                            <td className="px-3 py-2.5 overflow-hidden">
                              <span className="block truncate text-slate-500">{project.createdDate}</span>
                            </td>
                          )}

                          {/* Actions — sticky */}
                          <td
                            className="sticky right-0 bg-inherit px-2 py-2.5 border-l border-slate-100 z-10 w-[100px]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center gap-0.5">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                                    onClick={() => handleViewProject(project)}
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">Visualizar</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 text-slate-400 hover:text-violet-600 hover:bg-violet-50"
                                    onClick={() => handleEditProject(project)}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">Editar</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50"
                                    onClick={() => handleStartCancelProject(project)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">Cancelar</TooltipContent>
                              </Tooltip>
                            </div>
                          </td>
                        </tr>
                      </TooltipProvider>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* ── Bottom bar ── */}
            <div className="flex items-center justify-between px-3 py-2 border-t border-slate-100 bg-slate-50">
              <ItemsPerPageSelect
                value={itemsPerPage}
                onChange={(v) => { setItemsPerPage(v); setCurrentPage(1) }}
                variant="bottom"
              />
              <span className="text-xs text-slate-500">
                {startIndex + 1}–{Math.min(endIndex, totalProjects)} de {totalProjects}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 w-7 p-0"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                {getPageNumbers().map((pg, i) =>
                  pg === "..." ? (
                    <span key={`dots2-${i}`} className="text-xs text-slate-400 px-1">…</span>
                  ) : (
                    <Button
                      key={pg}
                      size="sm"
                      variant={currentPage === pg ? "default" : "outline"}
                      className={`h-7 w-7 p-0 text-xs ${currentPage === pg ? "btn-brand" : ""}`}
                      onClick={() => setCurrentPage(pg as number)}
                    >
                      {pg}
                    </Button>
                  )
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 w-7 p-0"
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </Card>

          {/* ── Advanced Filters Modal ── */}
          {isFilterModalOpen && (
            <div
              className="fixed z-50 flex items-center justify-center p-4 bg-black/25 backdrop-blur-[3px]"
              style={{ left: sidebarWidth, top: headerHeight, bottom: footerHeight, right: 0 }}
              onClick={(e) => { if (e.target === e.currentTarget) setIsFilterModalOpen(false) }}
            >
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-[820px] max-h-[82vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Modal header */}
                <div className="app-brand-header relative flex-shrink-0 px-5 min-h-[72px] flex items-center">
                  <div className="flex-1">
                    <h2 className="text-white font-bold text-base">Filtros Avançados</h2>
                    <p className="text-blue-200 text-xs mt-0.5">Configure os filtros para refinar os resultados</p>
                  </div>
                  <button
                    onClick={() => setIsFilterModalOpen(false)}
                    className="absolute right-4 top-4 rounded-lg p-1.5 hover:bg-white/20 transition-colors"
                  >
                    <X className="h-5 w-5 text-white" />
                  </button>
                </div>

                {/* Modal body */}
                <div className="flex flex-1 min-h-0">
                  {/* Left: Saved filters */}
                  <div className="w-44 flex-shrink-0 border-r border-slate-100 flex flex-col bg-slate-50">
                    <div className="px-3 py-2.5 border-b border-slate-100">
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Filtros Salvos</p>
                    </div>
                    <div className="flex-1 overflow-y-auto py-1">
                      {savedFilters.length === 0 ? (
                        <p className="text-[11px] text-slate-400 text-center py-4 px-2">Nenhum filtro salvo</p>
                      ) : (
                        savedFilters.map((sf, idx) => (
                          <div
                            key={sf.id}
                            draggable
                            onDragStart={() => setFilterDragIdx(idx)}
                            onDragOver={(e) => { e.preventDefault(); setFilterDragOverIdx(idx) }}
                            onDrop={() => {
                              if (filterDragIdx === null || filterDragIdx === idx) return
                              const arr = [...savedFilters]
                              const [item] = arr.splice(filterDragIdx, 1)
                              arr.splice(idx, 0, item)
                              setSavedFilters(arr)
                              setFilterDragIdx(null)
                              setFilterDragOverIdx(null)
                            }}
                            onDragEnd={() => { setFilterDragIdx(null); setFilterDragOverIdx(null) }}
                            className={`flex items-center gap-1.5 px-2.5 py-2 mx-1 rounded-lg mb-0.5 cursor-pointer text-xs transition-colors ${
                              activeFilterId === sf.id
                                ? "bg-blue-100 text-blue-700 font-semibold"
                                : "hover:bg-slate-100 text-slate-600"
                            } ${filterDragOverIdx === idx ? "ring-1 ring-blue-300" : ""}`}
                            onClick={() => {
                              setActiveFilterId(sf.id)
                              // Apply saved filter
                              const f = sf.filters
                              if (f.status !== undefined) setFilterStatus(f.status)
                              if (f.type !== undefined) setFilterType(f.type)
                              if (f.company !== undefined) setFilterCompany(f.company)
                              if (f.agency !== undefined) setFilterAgency(f.agency)
                              if (f.valueRange !== undefined) setFilterValueRange(f.valueRange)
                              if (f.paymentStatus !== undefined) setFilterPaymentStatus(f.paymentStatus)
                              if (f.fromLead !== undefined) setFilterFromLead(f.fromLead)
                              if (f.consultant !== undefined) setFilterConsultant(f.consultant)
                              if (f.priceMin !== undefined) setFilterPriceMin(f.priceMin)
                              if (f.priceMax !== undefined) setFilterPriceMax(f.priceMax)
                              if (f.tasksMin !== undefined) setFilterTasksMin(f.tasksMin)
                              if (f.tasksMax !== undefined) setFilterTasksMax(f.tasksMax)
                            }}
                          >
                            <GripVertical className="h-3 w-3 text-slate-300 flex-shrink-0" />
                            <span className="flex-1 truncate">{sf.name}</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); setSavedFilters((prev) => prev.filter((s) => s.id !== sf.id)); if (activeFilterId === sf.id) setActiveFilterId(null) }}
                              className="h-4 w-4 flex items-center justify-center rounded hover:bg-red-100 text-slate-300 hover:text-red-500 flex-shrink-0"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                    {/* Save filter */}
                    <div className="p-2 border-t border-slate-100">
                      {isSavingFilter ? (
                        <div className="space-y-1.5">
                          <Input
                            value={savedFilterName}
                            onChange={(e) => setSavedFilterName(e.target.value)}
                            placeholder="Nome do filtro"
                            className="h-7 text-xs"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && savedFilterName.trim()) {
                                const newFilter = {
                                  id: Date.now().toString(),
                                  name: savedFilterName,
                                  filters: { status: filterStatus, type: filterType, company: filterCompany, agency: filterAgency, valueRange: filterValueRange, paymentStatus: filterPaymentStatus, fromLead: filterFromLead, consultant: filterConsultant, priceMin: filterPriceMin, priceMax: filterPriceMax, tasksMin: filterTasksMin, tasksMax: filterTasksMax },
                                }
                                setSavedFilters((prev) => [...prev, newFilter])
                                setSavedFilterName("")
                                setIsSavingFilter(false)
                              }
                            }}
                          />
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              className="flex-1 h-6 text-[10px] btn-brand"
                              onClick={() => {
                                if (!savedFilterName.trim()) return
                                const newFilter = {
                                  id: Date.now().toString(),
                                  name: savedFilterName,
                                  filters: { status: filterStatus, type: filterType, company: filterCompany, agency: filterAgency, valueRange: filterValueRange, paymentStatus: filterPaymentStatus, fromLead: filterFromLead, consultant: filterConsultant, priceMin: filterPriceMin, priceMax: filterPriceMax, tasksMin: filterTasksMin, tasksMax: filterTasksMax },
                                }
                                setSavedFilters((prev) => [...prev, newFilter])
                                setSavedFilterName("")
                                setIsSavingFilter(false)
                              }}
                            >
                              <Save className="h-2.5 w-2.5 mr-1" />
                              Salvar
                            </Button>
                            <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => { setIsSavingFilter(false); setSavedFilterName("") }}>
                              <X className="h-2.5 w-2.5" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full h-7 text-[10px] text-slate-500"
                          onClick={() => setIsSavingFilter(true)}
                        >
                          + Salvar filtro atual
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Right: filter fields */}
                  <div className="flex-1 min-h-0 flex flex-col relative">

                    {/* Field-picker dropdown */}
                    {showFieldPicker && (
                      <div
                        className="absolute top-10 left-3 z-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-4 w-[520px] animate-in fade-in zoom-in-95 duration-150"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Campos disponíveis</p>
                          <div className="flex items-center gap-3">
                            <button onClick={() => setVisibleFields(allFilterFields.map(f => f.id))} className="text-[11px] text-blue-500 hover:text-blue-700 font-medium transition-colors">Selecionar todos</button>
                            <button onClick={() => setVisibleFields([])} className="text-[11px] text-slate-400 hover:text-red-500 transition-colors">Limpar</button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                          {allFilterFields.map(field => {
                            const checked = visibleFields.includes(field.id)
                            return (
                              <label key={field.id} className="flex items-center gap-2 py-1 cursor-pointer group">
                                <div
                                  onClick={() => setVisibleFields(checked ? visibleFields.filter(f => f !== field.id) : [...visibleFields, field.id])}
                                  className={`w-4 h-4 rounded flex items-center justify-center border-2 transition-colors flex-shrink-0 ${
                                    checked ? "bg-blue-500 border-blue-500" : "border-slate-300 dark:border-slate-600 group-hover:border-blue-400"
                                  }`}
                                >
                                  {checked && (
                                    <svg viewBox="0 0 10 8" className="w-2.5 h-2.5 text-white fill-none stroke-current stroke-[2]">
                                      <path d="M1 4l3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  )}
                                </div>
                                <span className="text-[12px] text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors select-none">{field.label}</span>
                              </label>
                            )
                          })}
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                          <button
                            onClick={() => setVisibleFields(allFilterFields.map(f => f.id))}
                            className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                          >Recuperar campos padrão</button>
                          <button
                            onClick={() => setShowFieldPicker(false)}
                            className="h-7 px-3 rounded-md text-[11px] font-medium btn-brand"
                          >Confirmar</button>
                        </div>
                      </div>
                    )}

                    {/* "Adicionar campo" link bar */}
                    <div className="flex items-center gap-3 px-4 pt-2.5 pb-2 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
                      <button
                        onClick={() => setShowFieldPicker(!showFieldPicker)}
                        className={`text-[12px] font-medium transition-colors ${showFieldPicker ? "text-blue-600" : "text-blue-500 hover:text-blue-700"}`}
                      >
                        + Adicionar campo
                      </button>
                      {visibleFields.length > 0 && (
                        <span className="text-[11px] text-slate-400">{visibleFields.length} campo{visibleFields.length !== 1 ? "s" : ""} ativo{visibleFields.length !== 1 ? "s" : ""}</span>
                      )}
                      {showFieldPicker && (
                        <button onClick={() => setShowFieldPicker(false)} className="ml-auto text-slate-400 hover:text-slate-600 transition-colors">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Filter fields (scrollable) */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Identificação */}
                    {["buscar","empresa","agencia","consultor"].some(id => visibleFields.includes(id)) && (
                    <div>
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Identificação</p>
                      <div className="grid grid-cols-2 gap-2">
                        {visibleFields.includes("buscar") && (
                        <div>
                          <label className="text-xs text-slate-500 mb-1 block">Buscar</label>
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <Input
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              placeholder="Projeto, cliente..."
                              className="pl-8 h-8 text-xs"
                            />
                          </div>
                        </div>
                        )}
                        {visibleFields.includes("empresa") && (
                        <div>
                          <label className="text-xs text-slate-500 mb-1 block">Empresa / Cliente</label>
                          <select
                            value={filterCompany}
                            onChange={(e) => setFilterCompany(e.target.value)}
                            className="w-full h-8 px-2 py-1 text-xs border border-slate-200 rounded-md bg-white"
                          >
                            <option value="all">Todos</option>
                            {uniqueCompanies.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        )}
                        {visibleFields.includes("agencia") && (
                        <div>
                          <label className="text-xs text-slate-500 mb-1 block">Agência</label>
                          <select
                            value={filterAgency}
                            onChange={(e) => setFilterAgency(e.target.value)}
                            className="w-full h-8 px-2 py-1 text-xs border border-slate-200 rounded-md bg-white"
                          >
                            <option value="all">Todas</option>
                            {uniqueAgencies.map((a) => <option key={a} value={a}>{a}</option>)}
                          </select>
                        </div>
                        )}
                        {visibleFields.includes("consultor") && (
                        <div className="col-span-2">
                          <label className="text-xs text-slate-500 mb-1 block">Responsável / Consultor</label>
                          <select
                            value={filterConsultant}
                            onChange={(e) => setFilterConsultant(e.target.value)}
                            className="w-full h-8 px-2 py-1 text-xs border border-slate-200 rounded-md bg-white"
                          >
                            <option value="all">Todos os responsáveis</option>
                            {uniqueConsultants.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        )}
                      </div>
                    </div>
                    )}

                    {/* Tipo e Status */}
                    {["status","tipo"].some(id => visibleFields.includes(id)) && (
                    <div>
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Tipo · Status</p>
                      <div className="grid grid-cols-2 gap-2">
                        {visibleFields.includes("status") && (
                        <div>
                          <label className="text-xs text-slate-500 mb-1 block">Status</label>
                          <div className="flex flex-wrap gap-1.5">
                            {[
                              { value: "all", label: "Todos" },
                              { value: "draft", label: "Rascunho" },
                              { value: "negotiation", label: "Negociação" },
                              { value: "awaiting-payment", label: "Ag. Pagto" },
                              { value: "planning", label: "Planejamento" },
                              { value: "in-progress", label: "Em Andamento" },
                              { value: "completed", label: "Concluído" },
                              { value: "cancelled", label: "Cancelado" },
                            ].map(({ value, label }) => (
                              <button
                                key={value}
                                onClick={() => setFilterStatus(value)}
                                className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                                  filterStatus === value
                                    ? "bg-blue-600 text-white border-blue-600"
                                    : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                                }`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                        )}
                        {visibleFields.includes("tipo") && (
                        <div>
                          <label className="text-xs text-slate-500 mb-1 block">Tipo</label>
                          <div className="flex flex-wrap gap-1.5">
                            {[
                              { value: "all", label: "Todos" },
                              { value: "recurring", label: "MRR" },
                              { value: "one-time", label: "Avulso" },
                            ].map(({ value, label }) => (
                              <button
                                key={value}
                                onClick={() => setFilterType(value)}
                                className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                                  filterType === value
                                    ? "bg-blue-600 text-white border-blue-600"
                                    : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                                }`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                        )}
                      </div>
                    </div>

                    )}
                    {/* Lead e Pagamento */}
                    {["origem","pagamento"].some(id => visibleFields.includes(id)) && (
                    <div>
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Lead · Pagamento</p>
                      <div className="grid grid-cols-2 gap-2">
                        {visibleFields.includes("origem") && (
                        <div>
                          <label className="text-xs text-slate-500 mb-1 block">Origem</label>
                          <div className="flex gap-1.5">
                            {[
                              { value: "all", label: "Todos" },
                              { value: "lead", label: "De Lead" },
                              { value: "non-lead", label: "Outros" },
                            ].map(({ value, label }) => (
                              <button
                                key={value}
                                onClick={() => setFilterFromLead(value)}
                                className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                                  filterFromLead === value
                                    ? "bg-amber-500 text-white border-amber-500"
                                    : "bg-white text-slate-600 border-slate-200 hover:border-amber-300"
                                }`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                        )}
                        {visibleFields.includes("pagamento") && (
                        <div>
                          <label className="text-xs text-slate-500 mb-1 block">Pagamento</label>
                          <div className="flex gap-1.5">
                            {[
                              { value: "all", label: "Todos" },
                              { value: "paid", label: "Em dia" },
                              { value: "overdue", label: "Inadimplente" },
                            ].map(({ value, label }) => (
                              <button
                                key={value}
                                onClick={() => setFilterPaymentStatus(value)}
                                className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                                  filterPaymentStatus === value
                                    ? "bg-blue-600 text-white border-blue-600"
                                    : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                                }`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                        )}
                      </div>
                    </div>
                    )}

                    {/* Valores */}
                    {visibleFields.includes("preco") && (
                    <div>
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Faixa de Valor (R$)</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-slate-500 mb-1 block">Valor mínimo</label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-medium">R$</span>
                            <Input
                              type="number"
                              min="0"
                              value={filterPriceMin}
                              onChange={(e) => setFilterPriceMin(e.target.value)}
                              placeholder="0"
                              className="pl-7 h-8 text-xs"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-slate-500 mb-1 block">Valor máximo</label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-medium">R$</span>
                            <Input
                              type="number"
                              min="0"
                              value={filterPriceMax}
                              onChange={(e) => setFilterPriceMax(e.target.value)}
                              placeholder="sem limite"
                              className="pl-7 h-8 text-xs"
                            />
                          </div>
                        </div>
                      </div>
                      {(filterPriceMin !== "" || filterPriceMax !== "") && (
                        <div className="mt-1.5 flex items-center justify-between">
                          <p className="text-[10px] text-slate-400">
                            {filterPriceMin !== "" && filterPriceMax !== ""
                              ? `R$ ${Number(filterPriceMin).toLocaleString("pt-BR")} – R$ ${Number(filterPriceMax).toLocaleString("pt-BR")}`
                              : filterPriceMin !== ""
                              ? `A partir de R$ ${Number(filterPriceMin).toLocaleString("pt-BR")}`
                              : `Até R$ ${Number(filterPriceMax).toLocaleString("pt-BR")}`
                            }
                          </p>
                          <button onClick={() => { setFilterPriceMin(""); setFilterPriceMax("") }} className="text-[10px] text-red-400 hover:underline">Limpar</button>
                        </div>
                      )}
                    </div>
                    )}

                    {/* Volume de Tarefas */}
                    {visibleFields.includes("tarefas") && (
                    <div>
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Volume de Tarefas</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-slate-500 mb-1 block">Mínimo de tarefas</label>
                          <Input
                            type="number"
                            min="0"
                            value={filterTasksMin}
                            onChange={(e) => setFilterTasksMin(e.target.value)}
                            placeholder="0"
                            className="h-8 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-500 mb-1 block">Máximo de tarefas</label>
                          <Input
                            type="number"
                            min="0"
                            value={filterTasksMax}
                            onChange={(e) => setFilterTasksMax(e.target.value)}
                            placeholder="sem limite"
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                      {(filterTasksMin !== "" || filterTasksMax !== "") && (
                        <div className="mt-1.5 flex items-center justify-between">
                          <p className="text-[10px] text-slate-400">
                            {filterTasksMin !== "" && filterTasksMax !== ""
                              ? `${filterTasksMin} – ${filterTasksMax} tarefas`
                              : filterTasksMin !== ""
                              ? `A partir de ${filterTasksMin} tarefas`
                              : `Até ${filterTasksMax} tarefas`
                            }
                          </p>
                          <button onClick={() => { setFilterTasksMin(""); setFilterTasksMax("") }} className="text-[10px] text-red-400 hover:underline">Limpar</button>
                        </div>
                      )}
                    </div>
                    )}

                    {visibleFields.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <p className="text-xs text-slate-400">Nenhum campo ativo.<br/>Clique em <span className="text-blue-500">+ Adicionar campo</span> para configurar.</p>
                      </div>
                    )}

                    {/* Results count */}
                    <div className="pt-2 border-t border-slate-100">
                      <p className="text-xs text-slate-500">
                        <span className="font-semibold text-slate-900">{filteredProjects.length}</span> projeto{filteredProjects.length !== 1 ? "s" : ""} encontrado{filteredProjects.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  </div>
                </div>

                {/* Modal footer */}
                <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-slate-100 bg-slate-50 flex-shrink-0">
                  <button
                    onClick={clearAllFilters}
                    className="text-xs text-slate-500 hover:text-slate-700 hover:underline"
                  >
                    Limpar filtros
                  </button>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setIsFilterModalOpen(false)}>
                      Cancelar
                    </Button>
                    <Button size="sm" className="h-8 text-xs btn-brand" onClick={() => { setCurrentPage(1); setIsFilterModalOpen(false) }}>
                      Aplicar Filtros
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          </>
        ) : (
          <div className="flex-1 overflow-auto">
            {viewMode === "kanban" && (
              <div className="py-2 pb-0">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <div className="flex gap-2 overflow-x-auto">
                    <SortableContext
                      items={kanbanColumns.map((col) => col.id)}
                      strategy={horizontalListSortingStrategy}
                    >
                      {kanbanColumns.map((column) => (
                        <KanbanColumn
                          key={column.id}
                          column={column}
                          projects={filteredProjects.filter((p) => p.status === column.id)}
                          onEdit={() => handleEditColumn(column)}
                          onDelete={() => handleDeleteColumn(column.id)}
                          onViewProject={handleViewProject}
                          onEditProject={handleEditProject}
                        />
                      ))}
                    </SortableContext>
                  </div>

                  <DragOverlay>
                    {activeId && activeType === "column" && (
                      <div className="w-52 opacity-80">
                        {kanbanColumns.find((col) => col.id === activeId) && (
                          <div
                            className={`${kanbanColumns.find((col) => col.id === activeId)?.color} text-white rounded-t-lg px-3 py-2`}
                          >
                            <h3 className="font-bold text-xs">
                              {kanbanColumns.find((col) => col.id === activeId)?.label}
                            </h3>
                          </div>
                        )}
                      </div>
                    )}
                    {activeId && activeType === "card" && (
                      <div className="w-52 opacity-80">
                        <Card className="p-2 bg-white border-2 border-blue-500">
                          <div className="text-xs font-semibold">Movendo projeto...</div>
                        </Card>
                      </div>
                    )}
                  </DragOverlay>
                </DndContext>

                {/* Column Create/Edit Dialog */}
                <Dialog open={showColumnDialog} onOpenChange={setShowColumnDialog}>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>{editingColumn ? "Editar Coluna" : "Nova Coluna"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="column-name">Nome da Coluna</Label>
                        <Input
                          id="column-name"
                          value={newColumnName}
                          onChange={(e) => setNewColumnName(e.target.value)}
                          placeholder="Ex: Em Aprovação"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Cor da Coluna</Label>
                        <div className="grid grid-cols-5 gap-2">
                          {availableColors.map((color) => (
                            <button
                              key={color.value}
                              onClick={() => setNewColumnColor(color.value)}
                              className={`h-10 rounded-md ${color.value} ${
                                newColumnColor === color.value ? "ring-2 ring-offset-2 ring-black" : ""
                              }`}
                              title={color.label}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowColumnDialog(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleSaveColumn}>Salvar</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={showDeleteColumnDialog} onOpenChange={setShowDeleteColumnDialog}>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Excluir Coluna</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <p className="text-sm text-muted-foreground">Tem certeza que deseja excluir esta coluna?</p>

                      {columnToDelete && projectsData.filter((p) => p.status === columnToDelete).length > 0 && (
                        <div className="space-y-3">
                          <div className="rounded-md bg-yellow-50 p-3 border border-yellow-200">
                            <p className="text-sm text-yellow-800">
                              Esta coluna contém {projectsData.filter((p) => p.status === columnToDelete).length}{" "}
                              projeto(s). Selecione para qual coluna os projetos serão movidos:
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="target-column">Mover projetos para:</Label>
                            <select
                              id="target-column"
                              value={targetColumnForItems}
                              onChange={(e) => setTargetColumnForItems(e.target.value)}
                              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                              {kanbanColumns
                                .filter((col) => col.id !== columnToDelete)
                                .map((col) => (
                                  <option key={col.id} value={col.id}>
                                    {col.label}
                                  </option>
                                ))}
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowDeleteColumnDialog(false)
                          setColumnToDelete(null)
                          setTargetColumnForItems("")
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={confirmDeleteColumn}
                        disabled={
                          columnToDelete &&
                          projectsData.filter((p) => p.status === columnToDelete).length > 0 &&
                          !targetColumnForItems
                        }
                      >
                        Excluir
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        )}

        <Dialog open={showCloneDialog} onOpenChange={setShowCloneDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Clonar Projeto</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Tem certeza que deseja clonar este projeto?</p>
                <p className="text-sm text-gray-600 mb-4">
                  <strong>Projeto original:</strong> {projectToClone?.name}
                </p>
                <div className="bg-blue-50 border border-blue-200 p-3 rounded text-sm text-gray-700 mb-4">
                  <p className="font-medium mb-2">O que será clonado:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Informações do cliente e agência</li>
                    <li>Equipe e nômades designados</li>
                    <li>Tarefas e configurações</li>
                    <li><strong>Produtos disponíveis para contratar (sem dados de contratação anterior)</strong></li>
                  </ul>
                </div>
              </div>
              <div>
                <Label htmlFor="clone-name" className="text-sm font-medium mb-2 block">
                  Nome do Projeto Clonado
                </Label>
                <Input
                  id="clone-name"
                  value={cloneProjectName}
                  onChange={(e) => setCloneProjectName(e.target.value)}
                  placeholder="Digite o nome do novo projeto"
                  className="w-full"
                />
              </div>
              <div className="flex items-start gap-2 bg-green-50 p-3 rounded">
                <input
                  type="checkbox"
                  id="clone-and-edit"
                  checked={cloneAndEdit}
                  onChange={(e) => setCloneAndEdit(e.target.checked)}
                  className="rounded mt-1"
                />
                <label htmlFor="clone-and-edit" className="text-sm text-gray-700 cursor-pointer">
                  Desejo editar o projeto clonado e escolher/contratar produtos após a criação
                </label>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCloneDialog(false)
                  setProjectToClone(null)
                  setCloneProjectName("")
                }}
              >
                Cancelar
              </Button>
              <Button onClick={handleConfirmClone} className="btn-brand">
                Clonar Projeto
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Cancel Project Wizard */}
        <Dialog open={showCancelWizard} onOpenChange={setShowCancelWizard}>
          <DialogContent className="sm:max-w-md">
            {cancelStep === 1 && (
              <>
                <DialogHeader>
                  <DialogTitle>Cancelar Projeto</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                    <p className="text-sm text-yellow-900 font-medium mb-2">Tem certeza que deseja cancelar este projeto?</p>
                    <p className="text-sm text-yellow-800">
                      <strong>Projeto:</strong> {projectToCancel?.name}
                    </p>
                  </div>
                  <p className="text-sm text-gray-600">
                    Ao cancelar, todas as cobranças futuras serão suspensas e o projeto será marcado como inativo.
                  </p>
                  <p className="text-sm text-gray-700 font-medium">Por que você quer cancelar este projeto?</p>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Nos ajude a entender o motivo (opcional)"
                    className="w-full h-20 p-3 border border-gray-300 rounded-lg text-sm resize-none"
                  />
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCancelWizard(false)
                      setProjectToCancel(null)
                      setCancelReason("")
                    }}
                  >
                    Desistir
                  </Button>
                  <Button
                    onClick={() => setCancelStep(2)}
                    className="bg-orange-500 hover:bg-orange-600"
                  >
                    Continuar Cancelamento
                  </Button>
                </DialogFooter>
              </>
            )}

            {cancelStep === 2 && (
              <>
                <DialogHeader>
                  <DialogTitle>Esperamos que continue conosco!</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg space-y-3">
                    <p className="text-sm text-blue-900 font-medium">Antes de cancelar, saiba que você pode:</p>
                    <ul className="text-sm text-blue-800 space-y-2">
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 font-bold">•</span>
                        <span><strong>Pausar o projeto</strong> temporariamente sem cancelar</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 font-bold">•</span>
                        <span><strong>Ajustar o orçamento</strong> para melhor se adequar às suas necessidades</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 font-bold">•</span>
                        <span><strong>Conversar com nosso time</strong> sobre alternativas</span>
                      </li>
                    </ul>
                  </div>
                  <p className="text-sm text-gray-600">
                    Tem certeza que quer cancelar mesmo? Esta ação não pode ser desfeita.
                  </p>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCancelWizard(false)
                      setProjectToCancel(null)
                      setCancelReason("")
                      setCancelStep(1)
                    }}
                  >
                    Desistir do Cancelamento
                  </Button>
                  <Button
                    onClick={() => setCancelStep(3)}
                    className="bg-orange-500 hover:bg-orange-600"
                  >
                    Continuar Cancelamento
                  </Button>
                </DialogFooter>
              </>
            )}

            {cancelStep === 3 && (
              <>
                <DialogHeader>
                  <DialogTitle>Última chance para reconsiderar</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                    <p className="text-sm text-red-900 font-medium mb-2">Atenção!</p>
                    <p className="text-sm text-red-800">
                      Você está prestes a cancelar <strong>{projectToCancel?.name}</strong>.
                    </p>
                    <p className="text-sm text-red-800 mt-2">
                      Isso resultará em:
                    </p>
                    <ul className="text-sm text-red-800 mt-2 space-y-1 ml-4">
                      <li>• Suspensão de todas as cobranças futuras</li>
                      <li>• Projeto marcado como inativo</li>
                      <li>• Não será mais possível contratar produtos</li>
                    </ul>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCancelWizard(false)
                      setProjectToCancel(null)
                      setCancelReason("")
                      setCancelStep(1)
                    }}
                  >
                    Cancelar Operação
                  </Button>
                  <Button
                    onClick={handleConfirmCancel}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Confirmar Cancelamento
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
        {/* View slide-panel */}
        <ProjectViewSlidePanel
          open={viewPanelOpen}
          project={selectedProject}
          onClose={() => setViewPanelOpen(false)}
          onEdit={() => {
            setViewPanelOpen(false)
            handleEditProject(selectedProject)
          }}
          onClone={() => {
            setViewPanelOpen(false)
            handleCloneProject(selectedProject)
          }}
          onExport={() => console.log("Export:", selectedProject?.name)}
          onCancel={() => {
            setViewPanelOpen(false)
            handleStartCancelProject(selectedProject)
          }}
        />
        <ProjectManagementModal
          project={selectedProject}
          open={modalOpen}
          onOpenChange={setModalOpen}
          mode={modalMode}
          onEdit={() => {
            setModalMode("edit")
          }}
          onClone={() => handleCloneProject(selectedProject)}
          onExport={() => {
            console.log("Exportando proposta para:", selectedProject?.name)
          }}
          onSave={handleSaveProjectChanges}
          onCancel={() => handleStartCancelProject(selectedProject)}
        />
        <ProjectWizardSlidePanel
          open={showWizard}
          onClose={() => setShowWizard(false)}
          onSkip={handleSkipWizard}
          onCreateWithAI={handleCreateWithAI}
        />
        <ProjectCreateSlidePanel
          open={showProjectCreate}
          onClose={() => {
            setShowProjectCreate(false)
            setProjectCreateData(null)
          }}
          initialData={projectCreateData}
        />
      </div>
    </div>
  )
}

function KanbanColumn({
  column,
  projects,
  onEdit,
  onDelete,
  onViewProject,
  onEditProject,
}: {
  column: any
  projects: any[]
  onEdit: () => void
  onDelete: () => void
  onViewProject: (project: any) => void
  onEditProject: (project: any) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column.id,
  })

  const { setNodeRef: setDroppableRef } = useDroppable({
    id: column.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const totalValue = projects.reduce((sum, p) => sum + p.budget, 0)

  // console.log(`[v0] Column ${column.id} has ${projects.length} projects`)

  return (
    <div ref={setNodeRef} style={style} className="w-52 flex-shrink-0">
      <div
        className={`${column.color} text-white rounded-t-lg px-3 py-2 h-[60px] flex flex-col justify-between`}
        {...attributes}
        {...listeners}
      >
        <div className="flex items-center justify-between mb-0.5">
          <h3 className="font-bold text-xs uppercase tracking-wide cursor-move line-clamp-2">{column.label}</h3>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
              className="hover:bg-white/20 rounded p-0.5 transition-colors"
            >
              <Settings className="h-3 w-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (confirm("Tem certeza que deseja remover esta coluna?")) {
                  onDelete()
                }
              }}
              className="hover:bg-white/20 rounded p-0.5 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between text-[10px] opacity-90">
          <span>({projects.length})</span>
          <span>R$ {totalValue.toLocaleString("pt-BR")}</span>
        </div>
      </div>

      <div
        ref={setDroppableRef}
        className="bg-gray-50 rounded-b-lg p-2 min-h-[350px] max-h-[calc(100vh-420px)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
      >
        <div className="space-y-1.5">
          <SortableContext items={projects.map((p) => p.id.toString())} strategy={verticalListSortingStrategy}>
            {projects.length === 0 ? (
              <div className="text-center text-gray-400 text-xs py-4">Arraste projetos aqui</div>
            ) : (
              projects.map((project) => (
                <KanbanCard
                  key={project.id}
                  project={project}
                  column={column}
                  onViewProject={onViewProject}
                  onEditProject={onEditProject}
                />
              ))
            )}
          </SortableContext>
        </div>
      </div>
    </div>
  )
}

function KanbanCard({
  project,
  column,
  onViewProject,
  onEditProject,
}: {
  project: any
  column: any
  onViewProject: (project: any) => void
  onEditProject: (project: any) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: project.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="p-2 hover:shadow-lg transition-all cursor-move bg-white border-l-4"
    >
      <h4 className="font-semibold text-xs mb-1.5 line-clamp-2">{project.name}</h4>

      <div className="space-y-1 text-[10px] text-gray-600 mb-2">
        <div className="flex items-center gap-1">
          <Building2 className="h-2.5 w-2.5 text-gray-400" />
          <span className="font-medium text-blue-600 truncate">{project.client}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <DollarSign className="h-2.5 w-2.5 text-gray-400" />
            <span className="font-semibold">R$ {(project.budget / 1000).toFixed(0)}k</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-10 bg-gray-200 rounded-full h-1">
              <div className="bg-blue-600 h-1 rounded-full" style={{ width: `${project.progress}%` }} />
            </div>
            <span className="text-[9px] font-semibold">{project.progress}%</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1.5 border-t">
        <div className="flex -space-x-1.5">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-[9px] text-white font-semibold border-2 border-white">
            {project.client.charAt(0)}
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 hover:bg-blue-50"
            onClick={(e) => {
              e.stopPropagation()
              onViewProject(project)
            }}
          >
            <Eye className="h-2.5 w-2.5 text-blue-600" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 hover:bg-purple-50"
            onClick={(e) => {
              e.stopPropagation()
              onEditProject(project)
            }}
          >
            <Edit className="h-2.5 w-2.5 text-purple-600" />
          </Button>
        </div>
      </div>
    </Card>
  )
}
