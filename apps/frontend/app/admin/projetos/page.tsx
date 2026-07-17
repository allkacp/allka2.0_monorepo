// @ts-nocheck
import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useItemsPerPage } from "@/lib/use-items-per-page";
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useSorting, SortableHeader } from "@/hooks/useSorting";
import { ButtonLoader, PageLoader } from "@/components/ui/loading";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { ExportButton } from "@/components/export-button";
import { PinToTrayButton } from "@/components/pin-to-tray-button";
import {
  STANDARD_SHELL_PANEL_CLASS,
  StandardPageBanner,
} from "@/components/standard-page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ProjectWizardSlidePanel from "@/components/project-wizard-slide-panel";
import { ProjectCreateNewPanel } from "@/components/project-create-new-panel";
import { AdvancedDateFilter } from "@/components/advanced-date-filter";
import { ItemsPerPageSelect } from "@/components/items-per-page-select";
import { SlidePanel } from "@/components/slide-panel";
import { IconToolbarButton } from "@/components/icon-toolbar-button";
import { useTableScrollSync } from "@/hooks/useTableScrollSync";
import {
  exportToCSV,
  exportToExcel,
  exportToPDF,
  type ProjectData,
} from "@/lib/export-utils";
import type { DateRange } from "react-day-picker";
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
  LayoutDashboard,
  Calendar,
  Flag,
  Settings,
  BarChart3,
  Settings2,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Hash,
  Trash2,
  Save,
  Download,
  ImageDown,
  CheckCircle,
  Lock,
  CreditCard,
  ArrowRight,
  Link2,
} from "lucide-react";
import { ProjectManagementModal } from "@/components/project-management-modal";
import { ProjectViewSlidePanel } from "@/components/project-view-slide-panel";
import { useSidebar } from "@/contexts/sidebar-context";
import { useAppFrameMetrics } from "@/hooks/useAppFrameMetrics";
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
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProjects } from "@/hooks/useProjects";
import { apiClient } from "@/lib/api-client";
import { adaptApiProject, type FrontendProject } from "@/lib/project-adapter";
import {
  ALLKA_BADGE_CLASS,
  PROJECT_STATUS_VARIANT,
} from "@/components/allka-badge";

interface ProjectsPageViewProps {
  scope?: "admin" | "agency";
  agencyName?: string;
  initialSearch?: string;
}

export default function AdminProjetosPage({
  scope = "admin",
  agencyName,
  initialSearch = "",
}: ProjectsPageViewProps = {}) {
  const {
    projects: apiProjects,
    loading: projectsLoading,
    error: projectsError,
    refetch: refetchProjects,
    setProjects: setApiProjects,
  } = useProjects(scope === "agency" && agencyName ? { agencyName } : {});
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterPaymentStatus, setFilterPaymentStatus] = useState("all");
  const [filterCompany, setFilterCompany] = useState("all");
  const [filterAgency, setFilterAgency] = useState("all");
  const [filterValueRange, setFilterValueRange] = useState("all");
  const [filterDateRange, setFilterDateRange] = useState("all");
  const [filterFromLead, setFilterFromLead] = useState("all");
  const [filterConsultant, setFilterConsultant] = useState("all");
  const [filterPriceMin, setFilterPriceMin] = useState("");
  const [filterPriceMax, setFilterPriceMax] = useState("");
  const [filterTasksMin, setFilterTasksMin] = useState("");
  const [filterTasksMax, setFilterTasksMax] = useState("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedProject, setSelectedProject] =
    useState<FrontendProject | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"view" | "edit" | "create">(
    "view",
  );
  const [initialProjectTab, setInitialProjectTab] =
    useState<string>("dashboard");
  const [showWizard, setShowWizard] = useState(false);
  const [showProjectCreate, setShowProjectCreate] = useState(false);
  const [projectCreateData, setProjectCreateData] = useState<any>(null);
  // Draft-resume state for ProjectCreateNewPanel
  const [draftPanelProducts, setDraftPanelProducts] = useState<any[]>([]);
  const [draftPanelQuantities, setDraftPanelQuantities] = useState<
    Record<string, number>
  >({});
  const [draftPanelCommissions, setDraftPanelCommissions] = useState<
    Record<string, number>
  >({});
  const [draftPanelProjectId, setDraftPanelProjectId] = useState<
    string | number | undefined
  >(undefined);
  const [draftResumeToCheckout, setDraftResumeToCheckout] = useState(false);
  const [viewMode, setViewMode] = useState<"accordion" | "kanban" | "planner">(
    "accordion",
  );
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useItemsPerPage("admin-projetos", 10);
  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [pendingPanelSearch, setPendingPanelSearch] = useState("");
  const [projectToClone, setProjectToClone] = useState<FrontendProject | null>(
    null,
  );
  const [cloneProjectName, setCloneProjectName] = useState("");
  const [cloneOptions, setCloneOptions] = useState({
    team: true,
    products: true,
    vault: true,
    financial: false,
  });
  const [showCancelWizard, setShowCancelWizard] = useState(false);
  const [projectToCancel, setProjectToCancel] =
    useState<FrontendProject | null>(null);
  const [cancelStep, setCancelStep] = useState<1 | 2 | 3>(1);
  const [cancelReason, setCancelReason] = useState("");

  // ── New state: table + filters ──────────────────────────────────────────
  const [viewPanelOpen, setViewPanelOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [showFieldPicker, setShowFieldPicker] = useState(false);
  const [visibleFields, setVisibleFields] = useState<string[]>([
    "buscar",
    "empresa",
    "agencia",
    "consultor",
    "status",
    "tipo",
    "origem",
    "pagamento",
    "preco",
    "tarefas",
  ]);
  const [colConfigOpen, setColConfigOpen] = useState(false);
  const [savedFilters, setSavedFilters] = useState<
    Array<{ id: string; name: string; filters: any }>
  >([]);
  const [activeFilterId, setActiveFilterId] = useState<string | null>(null);
  const [filterDragIdx, setFilterDragIdx] = useState<number | null>(null);
  const [filterDragOverIdx, setFilterDragOverIdx] = useState<number | null>(
    null,
  );
  const [savedFilterName, setSavedFilterName] = useState("");
  const [isSavingFilter, setIsSavingFilter] = useState(false);
  const [isCancellingProject, setIsCancellingProject] = useState(false);

  // column visibility
  const ALL_COLS = [
    "id",
    "name",
    "client",
    "owner",
    "agency",
    "type",
    "status",
    "progress",
    "budget",
    "team",
    "created",
  ];
  const COL_LABELS: Record<string, string> = {
    id: "#",
    name: "Projeto",
    client: "Cliente",
    owner: "Conta responsável",
    agency: "Empresa",
    type: "Tipo",
    status: "Status",
    progress: "Progresso",
    budget: "Orçamento",
    team: "Equipe",
    created: "Criação",
  };
  const COL_INFO: Record<string, string> = {
    id: "Código sequencial do projeto.",
    name: "Nome do projeto e consultor/agência responsável.",
    client: "Empresa cliente vinculada ao projeto.",
    owner: "Conta (company/agency/partner) dona do projeto.",
    agency: "Empresa, agência ou nômade associado ao projeto.",
    type: "Tipo/categoria do projeto.",
    status: "Etapa atual do projeto no fluxo comercial.",
    progress: "Percentual de conclusão das tarefas do projeto.",
    budget: "Valor orçado/contratado do projeto.",
    team: "Quantidade de pessoas alocadas no projeto.",
    created: "Data em que o projeto foi criado.",
  };
  const [visibleCols, setVisibleCols] = useState<string[]>(ALL_COLS);
  const {
    tableScrollRef,
    topScrollRef,
    bottomScrollRef,
    handleTopBarScroll,
    handleTableScroll,
    handleBottomBarScroll,
    hasHorizontalOverflow,
  } = useTableScrollSync([projectsLoading, visibleCols.length]);

  // column widths (resizable)
  const DEFAULT_COL_WIDTHS: Record<string, number> = {
    id: 90,
    name: 240,
    client: 160,
    owner: 160,
    agency: 140,
    type: 130,
    status: 140,
    progress: 110,
    budget: 110,
    team: 70,
    created: 100,
  };
  const [colWidths, setColWidths] =
    useState<Record<string, number>>(DEFAULT_COL_WIDTHS);
  const dragState = useRef<{
    col: string;
    startX: number;
    startW: number;
  } | null>(null);

  // sidebar / header measurements for filter modal
  const { sidebarWidth } = useSidebar();
  const { headerHeight, footerHeight } = useAppFrameMetrics();
  

  useEffect(() => {
    if (!showPendingModal) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowPendingModal(false);
        setPendingPanelSearch("");
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [showPendingModal]);

  const { toast } = useToast();
  const pageRef = useRef<HTMLDivElement>(null);
  const projectRouteBase =
    scope === "agency" ? "/agency/projetos" : "/admin/projetos";

  // ── Vínculo (escopo novo agency_id/company_id/partner_id) — exclusivo do Admin ──
  const [linkPanelOpen, setLinkPanelOpen] = useState(false);
  const [linkPanelProject, setLinkPanelProject] = useState<FrontendProject | null>(null);
  const [linkForm, setLinkForm] = useState<{ type: "none" | "agency" | "company" | "partner"; id: string }>({ type: "none", id: "" });
  const [linkSaving, setLinkSaving] = useState(false);
  const [linkError, setLinkError] = useState("");
  const [linkOptions, setLinkOptions] = useState<{
    agency: { id: string; name: string }[];
    company: { id: string; name: string }[];
    partner: { id: string; name: string }[];
  }>({ agency: [], company: [], partner: [] });

  useEffect(() => {
    if (scope !== "admin") return;
    (async () => {
      try {
        const [ag, co, pa] = await Promise.all([
          apiClient.getAgencies({ limit: "200" }),
          apiClient.getCompanies({ limit: "200" }),
          apiClient.getPartners({ limit: "200" }),
        ]);
        setLinkOptions({
          agency: ((ag as any).data || []).map((a: any) => ({ id: a.id, name: a.name })),
          company: ((co as any).data || []).map((c: any) => ({ id: c.id, name: c.name })),
          partner: ((pa as any).data || []).map((p: any) => ({ id: p.id, name: p.user?.name || p.user?.email || p.id })),
        });
      } catch (err) {
        console.error("[AdminProjetos] Failed to load link options:", err);
      }
    })();
  }, [scope]);

  const currentLinkOptions =
    linkForm.type === "agency" ? linkOptions.agency : linkForm.type === "company" ? linkOptions.company : linkForm.type === "partner" ? linkOptions.partner : [];

  function openLinkPanel(project: FrontendProject) {
    setLinkPanelProject(project);
    setLinkForm({
      type: (project.ownerType as any) || "none",
      id: project.ownerId || "",
    });
    setLinkError("");
    setLinkPanelOpen(true);
  }

  async function saveLink() {
    if (!linkPanelProject) return;
    if (linkForm.type !== "none" && !linkForm.id) {
      setLinkError("Selecione qual Agency/Company/Partner este projeto pertence, ou marque \"Sem vínculo\"");
      return;
    }
    setLinkSaving(true);
    setLinkError("");
    try {
      const payload =
        linkForm.type === "agency"
          ? { agency_id: linkForm.id }
          : linkForm.type === "company"
            ? { company_id: linkForm.id }
            : linkForm.type === "partner"
              ? { partner_id: linkForm.id }
              : {};
      await apiClient.updateProjectLink(linkPanelProject.id, payload);
      toast({ title: "Vínculo atualizado com sucesso!" });
      setLinkPanelOpen(false);
      refetchProjects();
    } catch (err: any) {
      setLinkError(err?.message ?? "Erro ao atualizar vínculo");
    } finally {
      setLinkSaving(false);
    }
  }

  const [kanbanColumns, setKanbanColumns] = useState([
    { id: "draft", label: "Rascunho", color: "bg-gray-800", count: 0 },
    {
      id: "pending-approval",
      label: "Ag. Aprovação",
      color: "bg-amber-500",
      count: 0,
    },
    {
      id: "negotiation",
      label: "Negociação",
      color: "bg-yellow-500",
      count: 0,
    },
    {
      id: "awaiting-payment",
      label: "Aguardando Pagamento",
      color: "bg-orange-500",
      count: 0,
    },
    { id: "planning", label: "Planejamento", color: "bg-blue-500", count: 0 },
    {
      id: "in-progress",
      label: "Em Andamento",
      color: "bg-purple-500",
      count: 0,
    },
    { id: "completed", label: "Concluído", color: "bg-green-500", count: 0 },
    { id: "cancelled", label: "Cancelado", color: "bg-red-500", count: 0 },
  ]);

  const [projectsData, setProjectsData] = useState<FrontendProject[]>([]);
  const {
    sortKey,
    sortDir,
    handleSort,
    sortData,
    columnFilters,
    toggleColumnFilter,
    clearColumnFilter,
  } = useSorting<FrontendProject>();

  // Sync API data into local state when loaded (including empty array)
  useEffect(() => {
    setProjectsData(apiProjects);
  }, [apiProjects]);

  const [showColumnDialog, setShowColumnDialog] = useState(false);
  const [editingColumn, setEditingColumn] = useState<any>(null);
  const [newColumnName, setNewColumnName] = useState("");
  const [newColumnColor, setNewColumnColor] = useState("bg-blue-500");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<"column" | "card" | null>(null);
  const [showDeleteColumnDialog, setShowDeleteColumnDialog] = useState(false);
  const [columnToDelete, setColumnToDelete] = useState<string | null>(null);
  const [targetColumnForItems, setTargetColumnForItems] = useState<string>("");

  // ── Planejador state ─────────────────────────────────────────────────────
  const [plannerColumns, setPlannerColumns] = useState([
    { id: "backlog", label: "Backlog", color: "bg-slate-500" },
    { id: "todo", label: "A Fazer", color: "bg-sky-500" },
    { id: "doing", label: "Em Andamento", color: "bg-violet-500" },
    { id: "review", label: "Em Revisão", color: "bg-amber-500" },
    { id: "done", label: "Concluído", color: "bg-emerald-500" },
  ]);

  type PlannerCardType = {
    id: string;
    columnId: string;
    title: string;
    description: string;
    priority: "low" | "medium" | "high" | "urgent";
    dueDate: string;
    projectId: number | null;
  };

  const [plannerCards, setPlannerCards] = useState<PlannerCardType[]>([
    {
      id: "pc-1",
      columnId: "todo",
      title: "Briefing com cliente",
      description: "Alinhar expectativas e escopo",
      priority: "high",
      dueDate: "2026-03-12",
      projectId: 1,
    },
    {
      id: "pc-2",
      columnId: "todo",
      title: "Montar proposta comercial",
      description: "",
      priority: "medium",
      dueDate: "2026-03-15",
      projectId: null,
    },
    {
      id: "pc-3",
      columnId: "doing",
      title: "Criar identidade visual",
      description: "Logotipo, paleta, tipografia",
      priority: "high",
      dueDate: "2026-03-20",
      projectId: 2,
    },
    {
      id: "pc-4",
      columnId: "doing",
      title: "Desenvolver landing page",
      description: "",
      priority: "urgent",
      dueDate: "2026-03-18",
      projectId: 3,
    },
    {
      id: "pc-5",
      columnId: "review",
      title: "Revisão de conteúdo SEO",
      description: "Textos, metas, headings",
      priority: "medium",
      dueDate: "2026-03-22",
      projectId: null,
    },
    {
      id: "pc-6",
      columnId: "done",
      title: "Configurar Google Analytics",
      description: "",
      priority: "low",
      dueDate: "2026-03-05",
      projectId: 4,
    },
    {
      id: "pc-7",
      columnId: "backlog",
      title: "Pesquisa de concorrentes",
      description: "Análise SWOT e benchmarking",
      priority: "low",
      dueDate: "",
      projectId: null,
    },
  ]);

  const [plannerActiveId, setPlannerActiveId] = useState<string | null>(null);
  const [plannerActiveType, setPlannerActiveType] = useState<
    "column" | "card" | null
  >(null);
  const [showPlannerColumnDialog, setShowPlannerColumnDialog] = useState(false);
  const [editingPlannerColumn, setEditingPlannerColumn] = useState<any>(null);
  const [newPlannerColumnName, setNewPlannerColumnName] = useState("");
  const [newPlannerColumnColor, setNewPlannerColumnColor] =
    useState("bg-blue-500");
  const [showPlannerCardDialog, setShowPlannerCardDialog] = useState(false);
  const [editingPlannerCard, setEditingPlannerCard] =
    useState<PlannerCardType | null>(null);
  const [newCardColumnId, setNewCardColumnId] = useState<string>("");
  const [newCardTitle, setNewCardTitle] = useState("");
  const [newCardDesc, setNewCardDesc] = useState("");
  const [newCardPriority, setNewCardPriority] = useState<
    "low" | "medium" | "high" | "urgent"
  >("medium");
  const [newCardDue, setNewCardDue] = useState("");
  const [newCardProjectId, setNewCardProjectId] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  // Helper function to check if a date is within the selected range
  const isDateInRange = (dateStr: string) => {
    if (!dateRange?.from || !dateRange?.to) return true;
    try {
      // Parse DD/MM/YYYY format
      const [day, month, year] = dateStr.split("/").map(Number);
      const date = new Date(year, month - 1, day);
      return date >= dateRange.from && date <= dateRange.to;
    } catch {
      return true;
    }
  };

  // Get unique companies and agencies for filters
  const uniqueCompanies = useMemo(() => {
    return Array.from(new Set(projectsData.map((p) => p.client))).sort();
  }, [projectsData]);

  const uniqueAgencies = useMemo(() => {
    return Array.from(new Set(projectsData.map((p) => p.agency))).sort();
  }, [projectsData]);

  const uniqueConsultants = useMemo(() => {
    return Array.from(new Set(projectsData.map((p) => p.consultant))).sort();
  }, [projectsData]);

  const uniqueProjectStatuses = useMemo(() => {
    return Array.from(new Set(projectsData.map((p) => p.status))).sort();
  }, [projectsData]);

  const SORTABLE_COLUMN_CONFIG: Record<
    string,
    {
      field: keyof FrontendProject;
      type: "text" | "number" | "date" | "status";
      filterValues?: string[];
    }
  > = {
    id: { field: "id", type: "number" },
    name: { field: "name", type: "text" },
    client: { field: "client", type: "text" },
    agency: { field: "agency", type: "text" },
    type: { field: "type", type: "text" },
    status: { field: "status", type: "status", filterValues: uniqueProjectStatuses },
    progress: { field: "progress", type: "number" },
    budget: { field: "budget", type: "number" },
    team: { field: "team", type: "number" },
    created: { field: "createdDate", type: "date" },
  };

  const allFilterFields = [
    { id: "buscar", label: "Buscar por nome" },
    { id: "empresa", label: "Empresa / Cliente" },
    { id: "agencia", label: "Empresa" },
    { id: "consultor", label: "Responsável / Consultor" },
    { id: "status", label: "Status" },
    { id: "tipo", label: "Tipo" },
    { id: "origem", label: "Origem (Lead)" },
    { id: "pagamento", label: "Pagamento" },
    { id: "preco", label: "Faixa de Valor (R$)" },
    { id: "tarefas", label: "Volume de Tarefas" },
  ];

  // Filter projects based on all active filters
  const filteredProjects = useMemo(() => {
    return projectsData.filter((project) => {
      const matchesSearch =
        searchTerm === "" ||
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.agency.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        filterStatus === "all" || project.status === filterStatus;
      const matchesType = filterType === "all" || project.type === filterType;
      const matchesCompany =
        filterCompany === "all" || project.client === filterCompany;
      const matchesAgency =
        filterAgency === "all" || project.agency === filterAgency;

      const matchesValueRange =
        filterValueRange === "all" ||
        (filterValueRange === "0-5000" && project.value <= 5000) ||
        (filterValueRange === "5000-15000" &&
          project.value > 5000 &&
          project.value <= 15000) ||
        (filterValueRange === "15000-50000" &&
          project.value > 15000 &&
          project.value <= 50000) ||
        (filterValueRange === "50000+" && project.value > 50000);

      const priceMin = filterPriceMin !== "" ? Number(filterPriceMin) : null;
      const priceMax = filterPriceMax !== "" ? Number(filterPriceMax) : null;
      const matchesPriceRange =
        (priceMin === null || project.value >= priceMin) &&
        (priceMax === null || project.value <= priceMax);

      const tasksMin = filterTasksMin !== "" ? Number(filterTasksMin) : null;
      const tasksMax = filterTasksMax !== "" ? Number(filterTasksMax) : null;
      const matchesTasksRange =
        (tasksMin === null || (project.tasks ?? 0) >= tasksMin) &&
        (tasksMax === null || (project.tasks ?? 0) <= tasksMax);

      const matchesConsultant =
        filterConsultant === "all" || project.consultant === filterConsultant;

      const matchesPaymentStatus =
        filterPaymentStatus === "all" ||
        (filterPaymentStatus === "paid" && !project.overdue) ||
        (filterPaymentStatus === "overdue" && project.overdue);

      const matchesFromLead =
        filterFromLead === "all" ||
        (filterFromLead === "lead" && project.fromLead) ||
        (filterFromLead === "non-lead" && !project.fromLead);

      const matchesDateRange = isDateInRange(project.createdDate);

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
      );
    });
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
  ]);

  // Clear all filters
  const clearAllFilters = () => {
    setSearchTerm("");
    setFilterStatus("all");
    setFilterType("all");
    setFilterPaymentStatus("all");
    setFilterCompany("all");
    setFilterAgency("all");
    setFilterValueRange("all");
    setFilterDateRange("all");
    setFilterFromLead("all");
    setFilterConsultant("all");
    setFilterPriceMin("");
    setFilterPriceMax("");
    setFilterTasksMin("");
    setFilterTasksMax("");
    setCurrentPage(1);
  };

  // Calculate pagination
  const totalProjects = filteredProjects.length;
  const totalPages = Math.ceil(totalProjects / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const sortedProjects = useMemo(() => sortData(filteredProjects), [sortData, filteredProjects]);
  const paginatedProjects = sortedProjects.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

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
  ];

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);

    // Determine if dragging a column or a card
    if (kanbanColumns.find((col) => col.id === active.id)) {
      setActiveType("column");
    } else {
      setActiveType("card");
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      setActiveType(null);
      return;
    }

    if (activeType === "column") {
      // Reordering columns
      if (active.id !== over.id) {
        setKanbanColumns((columns) => {
          const oldIndex = columns.findIndex((col) => col.id === active.id);
          const newIndex = columns.findIndex((col) => col.id === over.id);
          return arrayMove(columns, oldIndex, newIndex);
        });
      }
    } else if (activeType === "card") {
      const projectId = Number(active.id);
      // Se o over.id é um número, significa que caiu sobre outro card, então pegamos o status do projeto
      let targetColumnId: string;

      if (typeof over.id === "number") {
        // Caiu sobre outro card, pegar a coluna desse card
        const targetProject = projectsData.find((p) => p.id === over.id);
        targetColumnId = targetProject?.status || String(over.id);
      } else {
        // Caiu diretamente na coluna
        targetColumnId = String(over.id);
      }

      setProjectsData((currentProjects) => {
        const updatedProjects = currentProjects.map((project) =>
          project.id === projectId
            ? { ...project, status: targetColumnId }
            : project,
        );
        return updatedProjects;
      });
    }

    setActiveId(null);
    setActiveType(null);
  };

  const handleAddColumn = () => {
    setEditingColumn(null);
    setNewColumnName("");
    setNewColumnColor("bg-blue-500");
    setShowColumnDialog(true);
  };

  const handleEditColumn = (column: any) => {
    setEditingColumn(column);
    setNewColumnName(column.label);
    setNewColumnColor(column.color);
    setShowColumnDialog(true);
  };

  const handleSaveColumn = () => {
    if (!newColumnName.trim()) return;

    if (editingColumn) {
      // Edit existing column
      setKanbanColumns((columns) =>
        columns.map((col) =>
          col.id === editingColumn.id
            ? { ...col, label: newColumnName, color: newColumnColor }
            : col,
        ),
      );
    } else {
      // Add new column
      const newId = newColumnName.toLowerCase().replace(/\s+/g, "-");
      setKanbanColumns((columns) => [
        ...columns,
        { id: newId, label: newColumnName, color: newColumnColor, count: 0 },
      ]);
    }

    setShowColumnDialog(false);
    setEditingColumn(null);
    setNewColumnName("");
    setNewColumnColor("bg-blue-500");
  };

  const handleDeleteColumn = (columnId: string) => {
    setColumnToDelete(columnId);
    const itemsInColumn = projectsData.filter((p) => p.status === columnId);
    if (itemsInColumn.length > 0) {
      // Se houver itens, precisa selecionar coluna destino
      const otherColumns = kanbanColumns.filter((col) => col.id !== columnId);
      if (otherColumns.length > 0) {
        setTargetColumnForItems(otherColumns[0].id);
      }
    }
    setShowDeleteColumnDialog(true);
  };

  const confirmDeleteColumn = () => {
    if (!columnToDelete) return;

    const itemsInColumn = projectsData.filter(
      (p) => p.status === columnToDelete,
    );

    // Move os itens para a coluna destino se houver itens
    if (itemsInColumn.length > 0 && targetColumnForItems) {
      setProjectsData((projects) =>
        projects.map((p) =>
          p.status === columnToDelete
            ? { ...p, status: targetColumnForItems }
            : p,
        ),
      );
    }

    // Remove a coluna
    setKanbanColumns((columns) =>
      columns.filter((col) => col.id !== columnToDelete),
    );

    // Fecha o dialog e limpa os estados
    setShowDeleteColumnDialog(false);
    setColumnToDelete(null);
    setTargetColumnForItems("");
  };

  // ── Planejador handlers ──────────────────────────────────────────────────
  const handlePlannerDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setPlannerActiveId(active.id as string);
    setPlannerActiveType(
      plannerColumns.find((c) => c.id === active.id) ? "column" : "card",
    );
  };

  const handlePlannerDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) {
      setPlannerActiveId(null);
      setPlannerActiveType(null);
      return;
    }
    if (plannerActiveType === "column") {
      if (active.id !== over.id) {
        setPlannerColumns((cols) => {
          const oi = cols.findIndex((c) => c.id === active.id);
          const ni = cols.findIndex((c) => c.id === over.id);
          return arrayMove(cols, oi, ni);
        });
      }
    } else {
      const targetCol = plannerColumns.find((c) => c.id === over.id);
      if (targetCol) {
        setPlannerCards((cards) =>
          cards.map((c) =>
            c.id === active.id ? { ...c, columnId: targetCol.id } : c,
          ),
        );
      } else {
        const overCard = plannerCards.find((c) => c.id === over.id);
        if (overCard) {
          setPlannerCards((cards) => {
            const updated = cards.map((c) =>
              c.id === active.id ? { ...c, columnId: overCard.columnId } : c,
            );
            const oi = updated.findIndex((c) => c.id === active.id);
            const ni = updated.findIndex((c) => c.id === over.id);
            return arrayMove(updated, oi, ni);
          });
        }
      }
    }
    setPlannerActiveId(null);
    setPlannerActiveType(null);
  };

  const handleAddPlannerColumn = () => {
    setEditingPlannerColumn(null);
    setNewPlannerColumnName("");
    setNewPlannerColumnColor("bg-blue-500");
    setShowPlannerColumnDialog(true);
  };

  const handleEditPlannerColumn = (col: any) => {
    setEditingPlannerColumn(col);
    setNewPlannerColumnName(col.label);
    setNewPlannerColumnColor(col.color);
    setShowPlannerColumnDialog(true);
  };

  const handleSavePlannerColumn = () => {
    if (!newPlannerColumnName.trim()) return;
    if (editingPlannerColumn) {
      setPlannerColumns((cols) =>
        cols.map((c) =>
          c.id === editingPlannerColumn.id
            ? {
                ...c,
                label: newPlannerColumnName,
                color: newPlannerColumnColor,
              }
            : c,
        ),
      );
    } else {
      setPlannerColumns((cols) => [
        ...cols,
        {
          id: "pcol-" + Date.now(),
          label: newPlannerColumnName,
          color: newPlannerColumnColor,
        },
      ]);
    }
    setShowPlannerColumnDialog(false);
    setEditingPlannerColumn(null);
    setNewPlannerColumnName("");
    setNewPlannerColumnColor("bg-blue-500");
  };

  const handleDeletePlannerColumn = (colId: string) => {
    if (!confirm("Excluir esta coluna e todos os seus cartões?")) return;
    setPlannerCards((cards) => cards.filter((c) => c.columnId !== colId));
    setPlannerColumns((cols) => cols.filter((c) => c.id !== colId));
  };

  const handleAddPlannerCard = (columnId: string) => {
    setEditingPlannerCard(null);
    setNewCardColumnId(columnId);
    setNewCardTitle("");
    setNewCardDesc("");
    setNewCardPriority("medium");
    setNewCardDue("");
    setNewCardProjectId(null);
    setShowPlannerCardDialog(true);
  };

  const handleEditPlannerCard = (card: PlannerCardType) => {
    setEditingPlannerCard(card);
    setNewCardColumnId(card.columnId);
    setNewCardTitle(card.title);
    setNewCardDesc(card.description);
    setNewCardPriority(card.priority);
    setNewCardDue(card.dueDate);
    setNewCardProjectId(card.projectId);
    setShowPlannerCardDialog(true);
  };

  const handleSavePlannerCard = () => {
    if (!newCardTitle.trim()) return;
    if (editingPlannerCard) {
      setPlannerCards((cards) =>
        cards.map((c) =>
          c.id === editingPlannerCard.id
            ? {
                ...c,
                columnId: newCardColumnId,
                title: newCardTitle,
                description: newCardDesc,
                priority: newCardPriority,
                dueDate: newCardDue,
                projectId: newCardProjectId,
              }
            : c,
        ),
      );
    } else {
      setPlannerCards((cards) => [
        ...cards,
        {
          id: "pcard-" + Date.now(),
          columnId: newCardColumnId,
          title: newCardTitle,
          description: newCardDesc,
          priority: newCardPriority,
          dueDate: newCardDue,
          projectId: newCardProjectId,
        },
      ]);
    }
    setShowPlannerCardDialog(false);
    setEditingPlannerCard(null);
  };

  const handleDeletePlannerCard = (cardId: string) => {
    setPlannerCards((cards) => cards.filter((c) => c.id !== cardId));
  };

  const handleExport = (format: "csv" | "excel" | "pdf") => {
    // Filter projects by date range
    const exportProjects = projectsData.filter((p) =>
      isDateInRange(p.createdDate),
    );

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
    }));

    // Export based on format
    if (format === "csv") {
      exportToCSV(
        exportData,
        dateRange || { from: new Date(), to: new Date() },
      );
    } else if (format === "excel") {
      exportToExcel(
        exportData,
        dateRange || { from: new Date(), to: new Date() },
      );
    } else if (format === "pdf") {
      exportToPDF(
        exportData,
        dateRange || { from: new Date(), to: new Date() },
      );
    }
  };

  // Calculate stats dynamically based on date range and lead filter
  const stats = useMemo(() => {
    const statsFilteredProjects = projectsData.filter((p) => {
      if (!isDateInRange(p.createdDate)) return false;
      if (filterFromLead === "lead") return p.fromLead === true;
      if (filterFromLead === "non-lead") return p.fromLead !== true;
      return true;
    });

    const totalProjects = statsFilteredProjects.length;
    const completedProjects = statsFilteredProjects.filter(
      (p) => p.status === "completed",
    ).length;
    const activeProjects = statsFilteredProjects.filter(
      (p) => p.status === "in-progress",
    ).length;
    const draftProjects = statsFilteredProjects.filter(
      (p) => p.status === "draft",
    ).length;
    const negotiationProjects = statsFilteredProjects.filter(
      (p) => p.status === "negotiation",
    ).length;
    const churnProjects = statsFilteredProjects.filter(
      (p) => p.status === "cancelled",
    ).length;
    const awaitingPaymentProjects = statsFilteredProjects.filter(
      (p) => p.status === "awaiting-payment",
    ).length;
    const overdueProjects = statsFilteredProjects.filter(
      (p) => p.overdue,
    ).length;

    // Calculate revenue metrics based on filtered projects
    const totalRevenue = statsFilteredProjects.reduce(
      (sum, p) => sum + p.budget,
      0,
    );
    const totalSpent = statsFilteredProjects.reduce(
      (sum, p) => sum + p.spent,
      0,
    );
    const awaitingPaymentValue = statsFilteredProjects
      .filter((p) => p.status === "awaiting-payment")
      .reduce((sum, p) => sum + p.budget, 0);
    const churnValue = statsFilteredProjects
      .filter((p) => p.status === "cancelled")
      .reduce((sum, p) => sum + p.value, 0);
    const draftValue = statsFilteredProjects
      .filter((p) => p.status === "draft")
      .reduce((sum, p) => sum + p.value, 0);
    const negotiationValue = statsFilteredProjects
      .filter((p) => p.status === "negotiation")
      .reduce((sum, p) => sum + p.value, 0);
    const overdueValue = statsFilteredProjects
      .filter((p) => p.overdue)
      .reduce((sum, p) => sum + (p.budget - p.spent), 0);

    // Calculate MRR: total revenue of active/in-progress projects divided by period months
    const activeRevenue = statsFilteredProjects
      .filter((p) => p.status === "in-progress")
      .reduce((sum, p) => sum + p.budget, 0);
    const periodMonths =
      dateRange?.from && dateRange?.to
        ? Math.max(
            1,
            Math.ceil(
              (dateRange.to.getTime() - dateRange.from.getTime()) /
                (1000 * 60 * 60 * 24),
            ) / 30,
          )
        : 1;
    const mrr = Math.round(activeRevenue / periodMonths);

    // Calculate growth percentages
    const mrrGrowth =
      totalProjects > 0
        ? ((activeProjects / totalProjects) * 100).toFixed(1)
        : 0;
    // avulsosAtivos: projects without a linked client company (truly one-off)
    const avulsosAtivos = statsFilteredProjects.filter(
      (p) => !p.companyId || p.companyId === "" || p.companyId === 0,
    ).length;
    const avulsosGrowth =
      totalProjects > 0
        ? ((avulsosAtivos / totalProjects) * 100).toFixed(1)
        : 0;
    const churnRate =
      totalProjects > 0
        ? ((churnProjects / totalProjects) * 100).toFixed(1)
        : 0;
    const churnGrowth =
      churnProjects > 0
        ? ((churnProjects / (totalProjects || 1)) * 100).toFixed(1)
        : 0;
    const revenueGrowth =
      totalRevenue > 0 ? ((totalSpent / totalRevenue) * 100).toFixed(1) : 0;
    const companyProjects = statsFilteredProjects.filter(
      (p) => p.type.includes("Web") || p.type.includes("Mobile"),
    ).length;
    const companyGrowth = (
      (companyProjects / (totalProjects || 1)) *
      100
    ).toFixed(1);
    const agencyProjects = statsFilteredProjects.filter((p) =>
      p.type.includes("Marketing"),
    ).length;
    const agencyGrowth = (
      (agencyProjects / (totalProjects || 1)) *
      100
    ).toFixed(1);
    const squadProjects = statsFilteredProjects.filter((p) =>
      p.type.includes("Desenvolvimento"),
    ).length;
    const squadGrowth = ((squadProjects / (totalProjects || 1)) * 100).toFixed(
      1,
    );
    const draftGrowth =
      draftProjects > 0
        ? ((draftValue / (totalRevenue || 1)) * 100).toFixed(1)
        : 0;
    const negotiationGrowth =
      negotiationProjects > 0
        ? ((negotiationValue / (totalRevenue || 1)) * 100).toFixed(1)
        : 0;
    const awaitingPaymentGrowth =
      awaitingPaymentProjects > 0
        ? ((awaitingPaymentValue / (totalRevenue || 1)) * 100).toFixed(1)
        : 0;
    const overdueGrowth =
      overdueProjects > 0
        ? ((overdueValue / (totalRevenue || 1)) * -100).toFixed(1)
        : 0;
    const projection30Days = Math.round(mrr * 1.15); // 15% growth projection

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
      sparklines: {
        projects: [
          Math.max(0, totalProjects - 4),
          Math.max(0, totalProjects - 3),
          Math.max(0, totalProjects - 2),
          Math.max(0, totalProjects - 1),
          totalProjects,
          Math.max(0, totalProjects - 1),
          totalProjects + 1,
          totalProjects + 2,
          totalProjects,
        ].map((v) => ({ v })),
        mrr: [
          Math.round((mrr * 0.45) / 1000),
          Math.round((mrr * 0.55) / 1000),
          Math.round((mrr * 0.63) / 1000),
          Math.round((mrr * 0.7) / 1000),
          Math.round((mrr * 0.78) / 1000),
          Math.round((mrr * 0.85) / 1000),
          Math.round((mrr * 0.92) / 1000),
          Math.round((mrr * 0.97) / 1000),
          Math.round(mrr / 1000),
        ].map((v) => ({ v })),
        avulsos: [
          Math.max(0, Math.round(avulsosAtivos * 0.6)),
          Math.max(0, Math.round(avulsosAtivos * 0.7)),
          Math.max(0, Math.round(avulsosAtivos * 0.65)),
          Math.max(0, Math.round(avulsosAtivos * 0.85)),
          Math.max(0, Math.round(avulsosAtivos)),
          Math.max(0, Math.round(avulsosAtivos * 0.9)),
          Math.max(0, Math.round(avulsosAtivos)),
        ].map((v) => ({ v })),
        churn: Array.from({ length: 9 }, (_, i) => ({
          v: i === 8 ? churnProjects : Math.max(0, churnProjects - (8 - i)),
        })),
        revenue: [
          Math.round((totalRevenue * 0.4) / 1000),
          Math.round((totalRevenue * 0.52) / 1000),
          Math.round((totalRevenue * 0.59) / 1000),
          Math.round((totalRevenue * 0.67) / 1000),
          Math.round((totalRevenue * 0.76) / 1000),
          Math.round((totalRevenue * 0.84) / 1000),
          Math.round((totalRevenue * 0.91) / 1000),
          Math.round((totalRevenue * 0.96) / 1000),
          Math.round(totalRevenue / 1000),
        ].map((v) => ({ v })),
        overdue: Array.from({ length: 9 }, (_, i) => ({
          v: Math.max(0, overdueProjects + (i < 5 ? 5 - i : 0)),
        })),
      },
    };
  }, [projectsData, dateRange, filterFromLead]);

  const navigate = useNavigate();
  const { projectId: urlProjectId } = useParams<{ projectId?: string }>();
  const [searchParams] = useSearchParams();

  const handleEditProject = (project: FrontendProject) => {
    setSelectedProject(project);
    setModalMode("edit");
    setModalOpen(true);
    navigate(`${projectRouteBase}/${project.id}`, { replace: true });
  };

  const handleViewProject = (project: FrontendProject) => {
    setSelectedProject(project);
    setModalMode("view");
    setModalOpen(true);
    if (project.id)
      navigate(`${projectRouteBase}/${project.id}`, { replace: true });
  };

  // ── Deep-link: open project from URL param or legacy location.state ────────
  const location = useLocation();
  const [_deepLinkHandled, setDeepLinkHandled] = useState(false);

  useEffect(() => {
    // Priority 1: URL param /admin/projetos/:projectId
    if (urlProjectId) {
      const tab = searchParams.get("tab") ?? "dashboard";
      setInitialProjectTab(tab);
      apiClient
        .getProject(urlProjectId)
        .then((raw: any) => {
          const full = adaptApiProject(raw);
          setInitialProjectTab(tab);
          setSelectedProject(full);
          setModalMode("view");
          setModalOpen(true);
        })
        .catch(() => {
          setSelectedProject({
            id: urlProjectId,
            name: "Projeto",
          } as FrontendProject);
          setModalMode("view");
          setModalOpen(true);
        });
      return;
    }

    // Priority 2: legacy navigation state (from basket drawer / checkout)
    const state = location.state as any;
    if (!state?.openProjectId) return;
    const projectId = state.openProjectId;
    const tab = state.openProjectTab ?? "dashboard";
    window.history.replaceState({}, "");
    setInitialProjectTab(tab);
    apiClient
      .getProject(projectId)
      .then((raw: any) => {
        const full = adaptApiProject(raw);
        setInitialProjectTab(tab);
        handleViewProject(full);
        navigate(
          `${projectRouteBase}/${projectId}${tab !== "dashboard" ? `?tab=${tab}` : ""}`,
          { replace: true },
        );
      })
      .catch(() => {
        handleViewProject({ id: projectId } as FrontendProject);
        navigate(`${projectRouteBase}/${projectId}`, { replace: true });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlProjectId, location.state]);

  const handleCloneProject = (project: FrontendProject) => {
    setProjectToClone(project);
    setCloneProjectName(`(copy) ${project.name}`);
    setCloneOptions({
      team: true,
      products: true,
      vault: true,
      financial: false,
    });
    setShowCloneDialog(true);
  };

  const handleSaveProjectChanges = async (updatedProject: FrontendProject) => {
    try {
      await apiClient.updateProject(updatedProject.id, {
        title: updatedProject.name,
        description: updatedProject.description || undefined,
        status: updatedProject.status,
        type: updatedProject.type || undefined,
        value: updatedProject.value || 0,
        budget: updatedProject.budget || 0,
        spent: updatedProject.spent || 0,
        progress: updatedProject.progress || 0,
        agency: updatedProject.agency || undefined,
        consultant: updatedProject.consultant || undefined,
        consultant_email: updatedProject.consultantEmail || undefined,
        team_size: updatedProject.team || 0,
        portfolio_permission: updatedProject.portfolioPermission || false,
        bitrix_sync: updatedProject.bitrixSync || false,
      });
      toast({
        title: "Projeto atualizado",
        description: "As alterações foram salvas com sucesso.",
      });
      refetchProjects();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message || "Não foi possível salvar.",
        variant: "destructive",
      });
    }
    setSelectedProject(updatedProject);
    setModalMode("view");
  };

  const handleStartCancelProject = (project: FrontendProject) => {
    setProjectToCancel(project);
    setCancelStep(1);
    setCancelReason("");
    setShowCancelWizard(true);
  };

  const handleConfirmCancel = async () => {
    if (!projectToCancel) return;
    setIsCancellingProject(true);
    try {
      await apiClient.updateProject(projectToCancel.id, {
        status: "cancelled",
      });

      toast({
        title: "Projeto Cancelado",
        description:
          "O projeto foi cancelado e as cobranças futuras foram suspensas.",
      });
      refetchProjects();
    } catch (error: any) {
      toast({
        title: "Erro ao cancelar",
        description: error.message || "Não foi possível cancelar o projeto.",
        variant: "destructive",
      });
    }

    setSelectedProject(null);
    setModalOpen(false);
    setShowCancelWizard(false);
    setProjectToCancel(null);
    setIsCancellingProject(false);
    setCancelReason("");
    setCancelStep(1);
  };

  const handleConfirmCloneAndOpen = () => {
    if (!projectToClone || !cloneProjectName.trim()) return;

    // Map mock project fields → FormData Portuguese field names
    const cloneData: any = {
      nome: cloneProjectName,
      cliente: projectToClone.client,
      clienteCnpj: projectToClone.clientCNPJ ?? "",
      agencia: projectToClone.agency,
      tipo: projectToClone.type,
      dataInicio: projectToClone.startDate ?? "",
      prazo: projectToClone.deadline ?? projectToClone.endDate ?? "",
      descricao: projectToClone.description ?? "",
      status: "draft",
      permitePortfolio: projectToClone.portfolioPermission ?? false,
      sincronizadoBitrix: projectToClone.bitrixSync ?? false,
    };

    if (cloneOptions.team) {
      cloneData.consultor = projectToClone.consultant ?? "";
      cloneData.emailConsultor = projectToClone.consultantEmail ?? "";
    }

    if (cloneOptions.financial) {
      cloneData.orcamento = String(projectToClone.budget ?? "");
    }

    setShowCloneDialog(false);
    setProjectToClone(null);
    setCloneProjectName("");
    setProjectCreateData(cloneData);
    setShowProjectCreate(true);
  };

  const handleCreateProject = () => {
    setShowWizard(true);
  };

  const handleSkipWizard = () => {
    setShowWizard(false);
    setProjectCreateData(null);
    setShowProjectCreate(true);
  };

  const loadDraftFromStorage = (project: FrontendProject) => {
    try {
      const raw = localStorage.getItem(`allka-draft-${project.id}`);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return null;
  };

  const handleContinueDraft = (project: FrontendProject) => {
    const draft = loadDraftFromStorage(project);
    const linkedProducts = Array.isArray((project as any).products)
      ? (project as any).products
      : [];
    if (draft) {
      setProjectCreateData(draft.formData ?? null);
      setDraftPanelProducts(draft.selectedProducts ?? []);
      setDraftPanelQuantities(draft.productQuantities ?? {});
      setDraftPanelCommissions(draft.productCommissions ?? {});
      setDraftPanelProjectId(draft.projectId ?? project.id);
      setDraftResumeToCheckout(false);
    } else {
      setProjectCreateData({
        nome: project.name,
        tipo: project.type,
        cliente: project.client,
        status: project.status,
      });
      setDraftPanelProducts(linkedProducts);
      setDraftPanelQuantities(
        linkedProducts.reduce((acc: Record<string, number>, item: any) => {
          acc[String(item.product_id ?? item.id)] = item.quantity ?? 1;
          return acc;
        }, {}),
      );
      setDraftPanelCommissions(
        linkedProducts.reduce((acc: Record<string, number>, item: any) => {
          acc[String(item.product_id ?? item.id)] =
            item.comissao_snapshot ?? 0;
          return acc;
        }, {}),
      );
      setDraftPanelProjectId(project.id);
      setDraftResumeToCheckout(false);
    }
    setShowProjectCreate(true);
  };

  const handleGoToPayment = (project: FrontendProject) => {
    const draft = loadDraftFromStorage(project);
    if (draft) {
      setProjectCreateData(draft.formData ?? null);
      setDraftPanelProducts(draft.selectedProducts ?? []);
      setDraftPanelQuantities(draft.productQuantities ?? {});
      setDraftPanelCommissions(draft.productCommissions ?? {});
      setDraftPanelProjectId(draft.projectId ?? project.id);
    } else {
      setProjectCreateData({
        nome: project.name,
        tipo: project.type,
        cliente: project.client,
        status: project.status,
      });
      setDraftPanelProducts([]);
      setDraftPanelQuantities({});
      setDraftPanelCommissions({});
      setDraftPanelProjectId(project.id);
    }
    setDraftResumeToCheckout(true);
    setShowProjectCreate(true);
  };

  // column resize
  const onResizeMouseDown = useCallback(
    (col: string, e: React.MouseEvent) => {
      e.preventDefault();
      dragState.current = {
        col,
        startX: e.clientX,
        startW: colWidths[col] ?? DEFAULT_COL_WIDTHS[col],
      };
      const onMove = (ev: MouseEvent) => {
        if (!dragState.current) return;
        const { col: dragCol, startX: dragStartX, startW: dragStartW } = dragState.current;
        const delta = ev.clientX - dragStartX;
        setColWidths((prev) => ({
          ...prev,
          [dragCol]: Math.max(60, dragStartW + delta),
        }));
      };
      const onUp = () => {
        dragState.current = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [colWidths],
  );

  const getPageNumbers = () => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  const [pageJumpValue, setPageJumpValue] = useState("");
  const commitPageJump = () => {
    const n = parseInt(pageJumpValue, 10);
    if (!isNaN(n) && n >= 1 && n <= totalPages) setCurrentPage(n);
    setPageJumpValue("");
  };

  const PaginationControls = () => (
    <div className="flex items-center gap-0.5 flex-shrink-0">
      <button
        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        title="Página anterior"
        className="h-7 w-7 flex items-center justify-center rounded-full text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>
      {getPageNumbers().map((pg, i) =>
        pg === "..." ? (
          <span key={`dots-${i}`} className="text-xs text-slate-300 px-0.5">·</span>
        ) : (
          <button
            key={i}
            onClick={() => setCurrentPage(Number(pg))}
            title={pg === currentPage ? "Página atual" : `Ir para a página ${pg}`}
            className={`h-7 w-7 flex items-center justify-center rounded-full text-xs font-bold transition-colors ${
              pg === currentPage
                ? "text-white shadow-[0_6px_14px_rgba(110,44,150,0.25)]"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400"
            }`}
            style={pg === currentPage ? { background: "linear-gradient(135deg, #111A4D 0%, #6E2C96 55%, #D92293 100%)" } : undefined}
          >
            {pg}
          </button>
        ),
      )}
      <button
        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages || totalPages === 0}
        title="Próxima página"
        className="h-7 w-7 flex items-center justify-center rounded-full text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
      <TooltipProvider delayDuration={400}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 flex-shrink-0 ml-1.5 pl-1.5 border-l border-slate-200 dark:border-slate-700">
              <input
                type="number"
                min={1}
                max={totalPages}
                value={pageJumpValue}
                onChange={(e) => setPageJumpValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") commitPageJump(); }}
                placeholder="Pág."
                aria-label="Ir para a página"
                className="h-7 w-14 text-xs text-center rounded-[8px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button
                onClick={commitPageJump}
                disabled={!pageJumpValue}
                className="group relative h-7 px-2.5 rounded-[8px] text-xs font-medium border border-slate-200 dark:border-slate-700 hover:border-transparent overflow-hidden disabled:opacity-40 disabled:pointer-events-none transition-all"
              >
                <span
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{ background: "linear-gradient(135deg,#000000 0%,#1a2a6f 45%,#c81a7f 100%)" }}
                />
                <span className="relative z-10 text-[#7d1b6a] dark:text-[#c07ab0] group-hover:text-white transition-colors">Ir</span>
              </button>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom">Ir diretamente para uma página</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );

  const CountText = ({ side = "bottom" as "top" | "bottom" }) => (
    <TooltipProvider delayDuration={400}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-xs text-slate-400 whitespace-nowrap cursor-default">
            {filteredProjects.length !== projectsData.length ? (
              <>
                de{" "}
                <span className="font-semibold text-blue-500">{filteredProjects.length}</span>{" "}
                de {projectsData.length} projeto{projectsData.length !== 1 ? "s" : ""}
              </>
            ) : (
              <>
                de{" "}
                <span className="font-semibold text-slate-600 dark:text-slate-300">{projectsData.length}</span>{" "}
                projeto{projectsData.length !== 1 ? "s" : ""}
              </>
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent side={side} sideOffset={6}>
          Intervalo de projetos exibido nesta página, do total encontrado
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

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
  ].filter(Boolean).length;

  const handleCreateWithAI = () => {
    setShowWizard(false);

    const aiGeneratedData = {
      name: "Projeto E-commerce Completo",
      client: "TechStore Brasil",
      company: "empresa1",
      type: "company",
      description:
        "Desenvolvimento de plataforma e-commerce completa com integração de pagamentos, gestão de estoque e painel administrativo.\n\nObjetivos:\n- Sistema de catálogo de produtos\n- Carrinho de compras e checkout\n- Integração com gateway de pagamento\n- Painel administrativo completo\n- Gestão de pedidos e logística",
      startDate: new Date().toISOString().split("T")[0],
      deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      budget: 45000,
      products: [
        { id: "1", name: "Website E-commerce", value: 25000, type: "avulso" },
        {
          id: "2",
          name: "Painel Administrativo",
          value: 15000,
          type: "avulso",
        },
        { id: "3", name: "Integração Pagamentos", value: 5000, type: "avulso" },
      ],
      files: [],
      vaultPassword: "",
      paymentMethod: "cartao",
    };

    setProjectCreateData(aiGeneratedData);
    setShowProjectCreate(true);
  };

  const getStatusBadge = (status: string) => {
    const LABELS: Record<string, string> = {
      "pending-approval": "Ag. Aprovação",
      "awaiting-payment": "Aguard. Pagamento",
      "in-progress": "Em Andamento",
      completed: "Concluído",
      planning: "Planejamento",
      draft: "Rascunho",
      negotiation: "Negociação",
      cancelled: "Cancelado",
    };
    const ICONS: Record<string, any> = {
      "pending-approval": Clock,
      "awaiting-payment": Clock,
      "in-progress": Zap,
      completed: CheckCircle,
      planning: Flag,
      draft: FileText,
      negotiation: AlertTriangle,
      cancelled: XCircle,
    };
    const variant = PROJECT_STATUS_VARIANT[status];
    const label = LABELS[status] ?? status;
    const Icon = ICONS[status];
    if (variant) {
      const cls = ALLKA_BADGE_CLASS[variant];
      return (
        <span
          className={`allka-badge allka-badge-${cls ? cls.replace("allka-badge-", "") : variant.replace("projeto-", "allka-badge-projeto-")}`}
        >
          {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
          {label}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-400 text-white whitespace-nowrap">
        {status}
      </span>
    );
  };

  if (projectsLoading) {
    return <PageLoader text="Carregando projetos…" />;
  }

  if (projectsError) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3 p-5 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-sm">
              Não foi possível carregar os projetos
            </p>
            <p className="text-xs mt-0.5 text-red-500">{projectsError}</p>
          </div>
          <button
            onClick={refetchProjects}
            className="shrink-0 text-xs font-medium underline hover:no-underline"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={STANDARD_SHELL_PANEL_CLASS}>
    <div className="h-full min-h-0 flex flex-col" ref={pageRef}>
      <div className="shrink-0 -mb-[11px]">
      <StandardPageBanner
        icon={FolderOpen}
        title="Gestão de Projetos"
        description="Centralize, acompanhe e otimize todos os seus projetos em um só lugar."
        actions={
          <>
            <div className="bg-white rounded-lg">
              <ExportButton pageRef={pageRef} filename="projetos" />
            </div>
            <PinToTrayButton id="page-projetos" label="Gestão de Projetos" icon={FolderOpen} path="/admin/projetos" />
            <TooltipProvider delayDuration={400}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setShowProjectCreate(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/70 text-white bg-white/10 hover:bg-white/20 transition-colors text-xs font-semibold whitespace-nowrap"
                  >
                    <Plus className="h-3.5 w-3.5 shrink-0" />
                    Novo Projeto
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={6}>Criar novo projeto</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </>
        }
      />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="space-y-5">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-200 bg-gradient-to-br from-blue-500 to-blue-700 dark:from-blue-800 dark:to-blue-950 border-2 border-blue-300/70 dark:border-blue-800/70 px-3 pt-2 pb-1.5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-white/70 leading-tight">
              Total de Projetos
            </p>
            <div className="bg-white/20 rounded-md p-1">
              <FolderOpen className="h-4 w-4 text-white" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white leading-none">
            {stats.totalProjects}
          </p>
        </div>
        <div className="relative rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-200 bg-gradient-to-br from-emerald-500 to-teal-600 dark:from-emerald-800 dark:to-teal-900 border-2 border-emerald-300/70 dark:border-emerald-800/70 px-3 pt-2 pb-1.5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-white/70 leading-tight">
              Em Andamento
            </p>
            <div className="bg-white/20 rounded-md p-1">
              <Zap className="h-4 w-4 text-white" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white leading-none">
            {stats.activeProjects}
          </p>
        </div>
        <div className="relative rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-200 bg-gradient-to-br from-violet-500 to-purple-700 dark:from-violet-800 dark:to-purple-950 border-2 border-violet-300/70 dark:border-violet-800/70 px-3 pt-2 pb-1.5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-white/70 leading-tight">
              Concluídos
            </p>
            <div className="bg-white/20 rounded-md p-1">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white leading-none">
            {stats.completedProjects}
          </p>
        </div>
        <div className="relative rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-200 bg-gradient-to-br from-orange-500 to-rose-600 dark:from-orange-800 dark:to-rose-900 border-2 border-orange-300/70 dark:border-orange-800/70 px-3 pt-2 pb-1.5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-white/70 leading-tight">
              MRR
            </p>
            <div className="bg-white/20 rounded-md p-1">
              <DollarSign className="h-4 w-4 text-white" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white leading-none">
            R$ {(stats.mrr / 1000).toFixed(0)}k
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <Accordion type="single" collapsible className="mb-1">
          <AccordionItem
            value="stats"
            className="border rounded-lg bg-blue-50 border-blue-200"
          >
            <AccordionTrigger className="text-sm font-semibold hover:no-underline px-4 py-3 hover:bg-slate-50 rounded-t-lg transition-colors">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                <span className="text-blue-900">Estatísticas e Métricas</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 px-4 pb-4">
              {/* Period filter */}
              <div className="mb-4">
                <AdvancedDateFilter
                  dateRange={dateRange}
                  onDateChange={setDateRange}
                  leadFilter={filterFromLead}
                  onLeadFilterChange={setFilterFromLead}
                  onExport={handleExport}
                  onReset={() => {
                    setDateRange(undefined);
                  }}
                  isLoading={false}
                />
              </div>

              {/* ── Row 1: 4 KPI cards ── */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-2">
                {/* Projetos Totais */}
                <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-blue-500 to-blue-700 px-4 py-3.5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-white/60 mb-0.5">
                        Projetos Totais
                      </p>
                      <p className="text-[2rem] font-black text-white leading-none">
                        {stats.totalProjects}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 text-white/70 text-[11px]">
                        <span className="bg-white/20 rounded px-1.5 py-0.5">
                          {stats.activeProjects} ativos
                        </span>
                        <span className="bg-white/20 rounded px-1.5 py-0.5">
                          {stats.completedProjects} concl.
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 ml-2 shrink-0">
                      <div className="bg-white/20 rounded-lg p-1.5">
                        <FolderOpen className="h-4 w-4 text-white" />
                      </div>
                      <div className="w-16 h-8">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={stats.sparklines.projects}
                            margin={{ top: 1, right: 0, left: 0, bottom: 1 }}
                          >
                            <Area
                              type="monotone"
                              dataKey="v"
                              stroke="rgba(255,255,255,0.8)"
                              strokeWidth={1.5}
                              fill="rgba(255,255,255,0.15)"
                              dot={false}
                              isAnimationActive={false}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>

                {/* MRR */}
                <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 px-4 py-3.5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-white/60 mb-0.5">
                        MRR
                      </p>
                      <p className="text-[2rem] font-black text-white leading-none">
                        R${(stats.mrr / 1000).toFixed(0)}k
                      </p>
                      <div className="flex items-center gap-1 mt-1.5">
                        <Zap className="h-3 w-3 text-white/80" />
                        <span className="text-xs font-bold text-white/80">
                          {stats.activeProjects} em andamento
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 ml-2 shrink-0">
                      <div className="bg-white/20 rounded-lg p-1.5">
                        <Repeat className="h-4 w-4 text-white" />
                      </div>
                      <div className="w-16 h-8">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={stats.sparklines.mrr}
                            margin={{ top: 1, right: 0, left: 0, bottom: 1 }}
                          >
                            <Area
                              type="monotone"
                              dataKey="v"
                              stroke="rgba(255,255,255,0.8)"
                              strokeWidth={1.5}
                              fill="rgba(255,255,255,0.15)"
                              dot={false}
                              isAnimationActive={false}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Avulsos Ativos */}
                <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-violet-500 to-purple-700 px-4 py-3.5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-white/60 mb-0.5">
                        Avulsos Ativos
                      </p>
                      <p className="text-[2rem] font-black text-white leading-none">
                        {stats.avulsosAtivos}
                      </p>
                      <div className="flex items-center gap-1 mt-1.5">
                        <ArrowDownRight className="h-3 w-3 text-white/80" />
                        <span className="text-xs font-bold text-white/80">
                          {stats.avulsosGrowth}%
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 ml-2 shrink-0">
                      <div className="bg-white/20 rounded-lg p-1.5">
                        <Clock className="h-4 w-4 text-white" />
                      </div>
                      <div className="w-16 h-8">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={stats.sparklines.avulsos}
                            margin={{ top: 1, right: 0, left: 0, bottom: 1 }}
                          >
                            <Area
                              type="monotone"
                              dataKey="v"
                              stroke="rgba(255,255,255,0.8)"
                              strokeWidth={1.5}
                              fill="rgba(255,255,255,0.15)"
                              dot={false}
                              isAnimationActive={false}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Churn */}
                <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-red-500 to-red-700 px-4 py-3.5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-white/60 mb-0.5">
                        Churn
                      </p>
                      <p className="text-[2rem] font-black text-white leading-none">
                        {stats.churnProjects}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 text-white/70 text-[11px]">
                        <span>{stats.churnRate}%</span>
                        <span>•</span>
                        <span>R$ {(stats.churnValue / 1000).toFixed(0)}k</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 ml-2 shrink-0">
                      <div className="bg-white/20 rounded-lg p-1.5">
                        <XCircle className="h-4 w-4 text-white" />
                      </div>
                      <div className="w-16 h-8">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={stats.sparklines.churn}
                            margin={{ top: 1, right: 0, left: 0, bottom: 1 }}
                          >
                            <Area
                              type="monotone"
                              dataKey="v"
                              stroke="rgba(255,255,255,0.8)"
                              strokeWidth={1.5}
                              fill="rgba(255,255,255,0.15)"
                              dot={false}
                              isAnimationActive={false}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Row 2: 4 cards ── */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-2">
                {/* Inadimplência */}
                <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-rose-500 to-rose-700 px-4 py-3.5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-white/60 mb-0.5">
                        Inadimplência
                      </p>
                      <p className="text-[2rem] font-black text-white leading-none">
                        {stats.overdueProjects}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 text-white/70 text-[11px]">
                        <span>
                          R$ {(stats.overdueValue / 1000).toFixed(0)}k
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-0.5">
                          <ArrowDownRight className="h-3 w-3" />
                          {Math.abs(stats.overdueGrowth)}%
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 ml-2 shrink-0">
                      <div className="bg-white/20 rounded-lg p-1.5">
                        <AlertTriangle className="h-4 w-4 text-white" />
                      </div>
                      <div className="w-16 h-8">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={stats.sparklines.overdue}
                            margin={{ top: 1, right: 0, left: 0, bottom: 1 }}
                          >
                            <Area
                              type="monotone"
                              dataKey="v"
                              stroke="rgba(255,255,255,0.8)"
                              strokeWidth={1.5}
                              fill="rgba(255,255,255,0.15)"
                              dot={false}
                              isAnimationActive={false}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Receitas */}
                <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-emerald-500 to-emerald-700 px-4 py-3.5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-white/60 mb-0.5">
                        Receitas
                      </p>
                      <p className="text-[2rem] font-black text-white leading-none">
                        R${(stats.totalRevenue / 1000).toFixed(0)}k
                      </p>
                      <div className="flex items-center gap-1 mt-1.5">
                        <ArrowUpRight className="h-3 w-3 text-white/80" />
                        <span className="text-xs font-bold text-white/80">
                          +{stats.revenueGrowth}%
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 ml-2 shrink-0">
                      <div className="bg-white/20 rounded-lg p-1.5">
                        <DollarSign className="h-4 w-4 text-white" />
                      </div>
                      <div className="w-16 h-8">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={stats.sparklines.revenue}
                            margin={{ top: 1, right: 0, left: 0, bottom: 1 }}
                          >
                            <Area
                              type="monotone"
                              dataKey="v"
                              stroke="rgba(255,255,255,0.8)"
                              strokeWidth={1.5}
                              fill="rgba(255,255,255,0.15)"
                              dot={false}
                              isAnimationActive={false}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tipos de Projetos */}
                <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-indigo-500 to-indigo-700 px-4 py-3.5">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-white/60">
                      Tipos de Projetos
                    </p>
                    <div className="bg-white/20 rounded-lg p-1.5">
                      <Briefcase className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {[
                      {
                        label: "Company",
                        count: stats.companyProjects,
                        growth: stats.companyGrowth,
                        icon: Building2,
                      },
                      {
                        label: "Agency",
                        count: stats.agencyProjects,
                        growth: stats.agencyGrowth,
                        icon: Users,
                      },
                      {
                        label: "Squad",
                        count: stats.squadProjects,
                        growth: stats.squadGrowth,
                        icon: Zap,
                      },
                    ].map(({ label, count, growth, icon: Icon }) => (
                      <div
                        key={label}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-1.5">
                          <Icon className="h-3 w-3 text-white/70" />
                          <span className="text-xs font-medium text-white">
                            {label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">
                            {count}
                          </span>
                          <span className="text-[10px] text-white/70 flex items-center gap-0.5">
                            <ArrowUpRight className="h-2.5 w-2.5" />
                            {growth}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Negócios em Potencial */}
                <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-amber-500 to-orange-600 px-4 py-3.5">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-white/60">
                      Negócios Potencial
                    </p>
                    <div className="bg-white/20 rounded-lg p-1.5">
                      <TrendingUp className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {[
                      {
                        label: "Rascunho",
                        value: stats.draftValue,
                        growth: stats.draftGrowth,
                      },
                      {
                        label: "Negociação",
                        value: stats.negotiationValue,
                        growth: stats.negotiationGrowth,
                      },
                      {
                        label: "Ag. Pagamento",
                        value: stats.awaitingPaymentValue,
                        growth: stats.awaitingPaymentGrowth,
                      },
                    ].map(({ label, value, growth }) => (
                      <div
                        key={label}
                        className="flex items-center justify-between"
                      >
                        <span className="text-xs font-medium text-white">
                          {label}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">
                            R$ {(value / 1000).toFixed(0)}k
                          </span>
                          <span className="text-[10px] text-white/70 flex items-center gap-0.5">
                            <ArrowUpRight className="h-2.5 w-2.5" />
                            {growth}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* ── Draft / Awaiting-Payment Banner (compact) ── */}
        {(() => {
          const pendingProjects = projectsData.filter(
            (p) =>
              p.status === "draft" ||
              p.status === "awaiting-payment" ||
              p.status === "pending-approval",
          );
          if (pendingProjects.length === 0) return null;

          const PREVIEW_LIMIT = 3;
          const previewItems = pendingProjects.slice(0, PREVIEW_LIMIT);

          const statusLabel = (s: string) =>
            s === "awaiting-payment" ? "Ag. Pagamento"
            : s === "pending-approval" ? "Ag. Aprovação"
            : "Rascunho";

          const statusBadge = (s: string) =>
            s === "awaiting-payment"
              ? "bg-cyan-50 text-cyan-700 border-cyan-200"
              : s === "pending-approval"
              ? "bg-amber-50 text-amber-700 border-amber-200"
              : "bg-slate-50 text-slate-600 border-slate-200";

          const avatarGradient = (s: string) =>
            s === "awaiting-payment"
              ? "linear-gradient(135deg,#0891b2,#6d28d9)"
              : s === "pending-approval"
              ? "linear-gradient(135deg,#d97706,#b45309)"
              : "linear-gradient(135deg,#475569,#94a3b8)";

          const filteredPending = pendingProjects.filter((p) => {
            if (!pendingPanelSearch) return true;
            const q = pendingPanelSearch.toLowerCase();
            return (
              p.name?.toLowerCase().includes(q) ||
              p.client?.toLowerCase().includes(q)
            );
          });

          return (
            <>
              {/* ── Compact banner ── */}
              <div className="rounded-xl border border-amber-200/80 bg-gradient-to-r from-amber-50/90 to-white px-4 py-3 shadow-sm">
                {/* Header row */}
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0 shadow-sm">
                    <AlertTriangle className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-amber-900 leading-tight">
                      {pendingProjects.length === 1 ? "1 projeto pendente" : `${pendingProjects.length} projetos pendentes`}
                    </p>
                    <p className="text-[11px] text-amber-600/80">Precisam de ação para avançar</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {pendingProjects.length > PREVIEW_LIMIT && (
                      <span className="text-[11px] font-medium text-amber-600">
                        +{pendingProjects.length - PREVIEW_LIMIT} restantes
                      </span>
                    )}
                    <button
                      onClick={() => setShowPendingModal(true)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:text-amber-900 bg-amber-100/80 hover:bg-amber-200 px-3 py-1.5 rounded-lg border border-amber-200 transition-colors"
                    >
                      Ver todos ({pendingProjects.length})
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* Compact cards – 3 em linha */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {previewItems.map((project) => (
                    <div
                      key={project.id}
                      className="flex flex-col gap-2 bg-white rounded-lg border border-slate-100 px-3 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] min-w-0"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="h-7 w-7 rounded-md flex items-center justify-center shrink-0 text-white text-[11px] font-bold"
                          style={{ background: avatarGradient(project.status) }}
                        >
                          {(project.name ?? "P")[0].toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-800 truncate leading-tight">{project.name}</p>
                          <p className="text-[10px] text-slate-500 truncate">{project.client}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusBadge(project.status)}`}>
                          {statusLabel(project.status)}
                        </span>
                        {project.status === "draft" ? (
                          <Button size="sm" className="h-6 px-2.5 text-[11px] bg-violet-600 hover:bg-violet-700 text-white shrink-0" onClick={() => handleContinueDraft(project)}>
                            Continuar
                          </Button>
                        ) : project.status === "pending-approval" ? (
                          <Button size="sm" className="h-6 px-2.5 text-[11px] bg-amber-500 hover:bg-amber-600 text-white shrink-0" onClick={() => handleGoToPayment(project)}>
                            Aprovar
                          </Button>
                        ) : (
                          <Button size="sm" className="h-6 px-2.5 text-[11px] bg-cyan-600 hover:bg-cyan-700 text-white shrink-0" onClick={() => handleGoToPayment(project)}>
                            Pagar
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Slide-over: todos os projetos pendentes ── */}
              {showPendingModal && (
                <div
                  className="fixed right-0 flex flex-col z-[80] shadow-2xl border-l border-border animate-in slide-in-from-right duration-300 ease-out overflow-hidden bg-background"
                  style={{ left: `${sidebarWidth - 2}px`, top: `${headerHeight - 1}px`, bottom: `${footerHeight - 1}px` }}
                >
                  {/* Panel header — gradiente da sidebar */}
                  <div
                    className="shrink-0 px-6 pt-6 pb-4"
                    style={{ background: "linear-gradient(to bottom, #0b1336 0%, #12205e 28%, #2d1a6e 52%, #7d1b6a 78%, #c81a7f 100%)" }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
                          <AlertTriangle className="h-5 w-5 text-amber-300" />
                        </div>
                        <div>
                          <h2 className="text-base font-bold text-white">Projetos pendentes</h2>
                          <p className="text-xs text-white/55 mt-0.5">
                            {pendingProjects.length === 1 ? "1 projeto precisa" : `${pendingProjects.length} projetos precisam`} de ação
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => { setShowPendingModal(false); setPendingPanelSearch(""); }}
                        className="h-8 w-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors shrink-0 mt-0.5"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-xs text-white/40 mb-4 leading-relaxed">
                      Projetos em rascunho, aguardando pagamento ou aprovação precisam de ação para avançar.
                    </p>
                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/35 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Buscar por nome ou cliente..."
                        value={pendingPanelSearch}
                        onChange={(e) => setPendingPanelSearch(e.target.value)}
                        className="w-full h-9 pl-9 pr-3 bg-white/10 border border-white/15 rounded-lg text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-white/35 focus:bg-white/15 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Panel body — branco */}
                  <div className="flex-1 overflow-y-auto bg-white">
                    {filteredPending.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                        <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                          <Search className="h-5 w-5 text-slate-400" />
                        </div>
                        <p className="text-sm font-medium text-slate-600">Nenhum resultado</p>
                        <p className="text-xs text-slate-400 mt-1">Tente um nome ou cliente diferente</p>
                      </div>
                    ) : (
                      <div className="p-4 flex flex-col gap-2">
                        {filteredPending.map((project) => (
                          <div
                            key={project.id}
                            className="flex items-center gap-3 bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3 hover:border-slate-200 hover:shadow-md transition-all"
                          >
                            <div
                              className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 text-white text-sm font-bold shadow-sm"
                              style={{ background: avatarGradient(project.status) }}
                            >
                              {(project.name ?? "P")[0].toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-slate-800 truncate">{project.name}</p>
                              <p className="text-xs text-slate-500 truncate">{project.client}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border hidden sm:inline-flex ${statusBadge(project.status)}`}>
                                {statusLabel(project.status)}
                              </span>
                              {project.status === "draft" ? (
                                <Button
                                  size="sm"
                                  className="h-8 px-3 text-xs bg-violet-600 hover:bg-violet-700 text-white"
                                  onClick={() => { setShowPendingModal(false); setPendingPanelSearch(""); handleContinueDraft(project); }}
                                >
                                  Continuar <ArrowRight className="h-3 w-3 ml-1" />
                                </Button>
                              ) : project.status === "pending-approval" ? (
                                <Button
                                  size="sm"
                                  className="h-8 px-3 text-xs bg-amber-500 hover:bg-amber-600 text-white"
                                  onClick={() => { setShowPendingModal(false); setPendingPanelSearch(""); handleGoToPayment(project); }}
                                >
                                  Aprovar <ArrowRight className="h-3 w-3 ml-1" />
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  className="h-8 px-3 text-xs bg-cyan-600 hover:bg-cyan-700 text-white"
                                  onClick={() => { setShowPendingModal(false); setPendingPanelSearch(""); handleGoToPayment(project); }}
                                >
                                  Pagar Agora <CreditCard className="h-3 w-3 ml-1" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Panel footer — branco */}
                  <div className="shrink-0 border-t border-slate-100 px-5 py-3 bg-slate-50">
                    <p className="text-xs text-slate-400 text-center">
                      {filteredPending.length === pendingProjects.length
                        ? `${pendingProjects.length} projeto${pendingProjects.length !== 1 ? "s" : ""} pendente${pendingProjects.length !== 1 ? "s" : ""}`
                        : `${filteredPending.length} de ${pendingProjects.length} projetos pendentes`}
                    </p>
                  </div>
                </div>
              )}
            </>
          );
        })()}

        {/* ── View toggle ── */}
        {viewMode === "accordion" ? (
          <>
            <div className="bg-white dark:bg-slate-900 border border-[#e8edf5] dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
              {/* Row 1 — view mode tabs + search + icon toolbar buttons */}
              <div className="flex items-center gap-2 flex-wrap px-[18px] py-3">
                <div className="inline-flex rounded-lg bg-muted p-1 shrink-0">
                  <Button
                    size="sm"
                    variant={viewMode === "accordion" ? "default" : "ghost"}
                    onClick={() => setViewMode("accordion")}
                    className={`h-7 px-2.5 rounded-md transition-all text-xs ${
                      viewMode === "accordion"
                        ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-sm"
                        : "hover:bg-background"
                    }`}
                  >
                    <List className="h-3 w-3 mr-1" />
                    Lista
                  </Button>
                  <Button
                    size="sm"
                    variant={viewMode === "kanban" ? "default" : "ghost"}
                    onClick={() => setViewMode("kanban")}
                    className={`h-7 px-2.5 rounded-md transition-all text-xs ${
                      viewMode === "kanban"
                        ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-sm"
                        : "hover:bg-background"
                    }`}
                  >
                    <LayoutGrid className="h-3 w-3 mr-1" />
                    Kanban
                  </Button>
                  <Button
                    size="sm"
                    variant={viewMode === "planner" ? "default" : "ghost"}
                    onClick={() => setViewMode("planner")}
                    className={`h-7 px-2.5 rounded-md transition-all text-xs ${
                      viewMode === "planner"
                        ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-sm"
                        : "hover:bg-background"
                    }`}
                  >
                    <LayoutDashboard className="h-3 w-3 mr-1" />
                    Planejador
                  </Button>
                </div>

                <div className="relative flex-1 min-w-[220px] max-w-sm">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar projeto, cliente..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-8 h-9 text-sm w-full"
                  />
                </div>

                <div className="ml-auto flex items-center gap-2">
                  <IconToolbarButton
                    icon={Filter}
                    tooltip={activeFilterCount > 0 ? `Filtros (${activeFilterCount} ativos)` : "Filtros"}
                    onClick={() => setIsFilterModalOpen(true)}
                  />
                  <IconToolbarButton
                    icon={Settings2}
                    tooltip="Configurar colunas"
                    onClick={() => setColConfigOpen(true)}
                  />
                </div>
                <SlidePanel
                  open={colConfigOpen}
                  onClose={() => setColConfigOpen(false)}
                  title="Configurar colunas"
                  subtitle="Escolha quais colunas aparecem na tabela"
                  widthMode="full"
                >
                  <div className="p-5 flex-1 overflow-y-auto space-y-2">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Colunas visíveis
                      </p>
                      <button
                        onClick={() => setVisibleCols(ALL_COLS)}
                        className="text-[10px] text-blue-600 hover:underline"
                      >
                        Mostrar todas
                      </button>
                    </div>
                    {ALL_COLS.map((col) => (
                      <label
                        key={col}
                        className="flex items-center gap-2 text-sm cursor-pointer py-1"
                      >
                        <Checkbox
                          checked={visibleCols.includes(col)}
                          onCheckedChange={(checked) => {
                            setVisibleCols((prev) =>
                              checked
                                ? [...prev, col]
                                : prev.filter((c) => c !== col),
                            );
                          }}
                          className="h-3.5 w-3.5"
                        />
                        {COL_LABELS[col]}
                      </label>
                    ))}
                  </div>
                </SlidePanel>
              </div>

              {/* Row 2 — items-per-page + count + scrollbar mirror + numbered pagination */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-[18px] py-2 border-y border-[#e8edf5] dark:border-slate-800 bg-white dark:bg-slate-900/30">
                <div className="flex items-center gap-3">
                  <ItemsPerPageSelect
                    value={itemsPerPage.toString()}
                    onValueChange={(v) => {
                      setItemsPerPage(Number(v));
                      setCurrentPage(1);
                    }}
                    variant="top"
                  />
                  <CountText side="bottom" />
                </div>

                {hasHorizontalOverflow && (
                  <div
                    ref={topScrollRef}
                    onScroll={handleTopBarScroll}
                    title="Arraste para rolar a tabela na horizontal e ver as colunas que não couberem na tela"
                    className="hidden md:block flex-1 min-w-[80px] overflow-x-scroll allka-table-scroll self-center"
                    style={{ height: 12 }}
                  >
                    <div style={{ minWidth: 1400, height: 1 }} />
                  </div>
                )}

                {totalPages > 1 && <PaginationControls />}
              </div>

              {/* ── Table ── */}
              <div
                ref={tableScrollRef}
                onScroll={handleTableScroll}
                className="overflow-x-auto allka-table-scroll-body"
              >
                <table
                  className="w-full text-xs"
                  style={{
                    tableLayout: "fixed",
                    minWidth: visibleCols.reduce(
                      (acc, col) => acc + (colWidths[col] ?? 120),
                      80,
                    ),
                  }}
                >
                  <colgroup>
                    {/* actions col — pinned left */}
                    <col style={{ width: 99 }} />
                    {visibleCols.map((col) => (
                      <col
                        key={col}
                        style={{
                          width:
                            colWidths[col] ?? DEFAULT_COL_WIDTHS[col] ?? 120,
                        }}
                      />
                    ))}
                  </colgroup>
                  <thead>
                    <tr className="border-b border-slate-200/60 dark:border-slate-700/60">
                      <th
                        className="py-3.5 px-2 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.04em] text-center"
                        style={{
                          position: "sticky",
                          left: 0,
                          top: 0,
                          zIndex: 3,
                          minWidth: 99,
                          background: "var(--table-head)",
                          boxShadow: "0 1px 0 rgba(148,163,184,0.22)",
                          borderRight: "1px solid rgba(100,116,139,0.18)",
                        }}
                      >
                        Ações
                      </th>
                      {visibleCols.map((col) => {
                        const headerConfig = SORTABLE_COLUMN_CONFIG[col];

                        return (
                          <th
                            key={col}
                            className="py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none relative"
                            style={{
                              paddingLeft: 20,
                              paddingRight: 20,
                              textAlign: "left",
                              borderRight: "1px solid rgba(148,163,184,0.25)",
                              position: "sticky",
                              top: 0,
                              zIndex: 2,
                              background: "var(--table-head)",
                              boxShadow: "0 1px 0 rgba(148,163,184,0.3)",
                            }}
                          >
                            <div className="inline-flex items-center gap-1">
                              {headerConfig ? (
                                <SortableHeader
                                  label={COL_LABELS[col]}
                                  field={String(headerConfig.field)}
                                  type={headerConfig.type}
                                  sortKey={sortKey ? String(sortKey) : null}
                                  sortDir={sortDir}
                                  onSort={handleSort}
                                  columnFilters={headerConfig.filterValues ? columnFilters : undefined}
                                  onFilter={headerConfig.filterValues ? toggleColumnFilter : undefined}
                                  onClearFilter={headerConfig.filterValues ? clearColumnFilter : undefined}
                                  filterValues={headerConfig.filterValues}
                                />
                              ) : (
                                COL_LABELS[col]
                              )}
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-slate-300 dark:text-slate-600 cursor-help text-[10px]">ⓘ</span>
                                  </TooltipTrigger>
                                  <TooltipContent className="text-xs max-w-[200px]">{COL_INFO[col]}</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <span
                              className="absolute top-0 right-0 h-full w-2.5 flex items-center justify-center cursor-col-resize z-10 group"
                              style={{ transform: "translateX(50%)" }}
                              onMouseDown={(e) => onResizeMouseDown(col, e)}
                            >
                              <span className="h-4 w-px bg-slate-300 group-hover:bg-blue-400 transition-colors" />
                            </span>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedProjects.length === 0 ? (
                      <tr>
                        <td
                          colSpan={visibleCols.length + 1}
                          className="py-12 text-center text-slate-400"
                        >
                          <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
                          <p className="text-sm font-medium">
                            Nenhum projeto encontrado
                          </p>
                          {activeFilterCount > 0 && (
                            <button
                              onClick={clearAllFilters}
                              className="mt-2 text-xs text-blue-600 hover:underline"
                            >
                              Limpar filtros
                            </button>
                          )}
                        </td>
                      </tr>
                    ) : (
                      paginatedProjects.map((project, rowIdx) => (
                        <TooltipProvider key={project.id} delayDuration={300}>
                          <tr
                            className={`group transition-colors cursor-pointer ${
                              rowIdx % 2 === 0
                                ? "bg-[#F1F4F9] dark:bg-[oklch(0.14_0.026_258)] hover:bg-[#D9E1ED] dark:hover:bg-[oklch(0.21_0.024_258)]"
                                : "bg-[#DCE3EE] dark:bg-[oklch(0.185_0.024_258)] hover:bg-[#C7D2E3] dark:hover:bg-[oklch(0.21_0.024_258)]"
                            }`}
                            onClick={() => handleViewProject(project)}
                          >
                            {/* Actions — pinned left, matching admin/empresas */}
                            <td
                              className={`px-2 py-2 transition-colors ${
                                rowIdx % 2 === 0
                                  ? "bg-[#ECEFF4] group-hover:bg-[#D9E1ED] dark:bg-[oklch(0.14_0.026_258)] dark:group-hover:bg-[oklch(0.21_0.024_258)]"
                                  : "bg-[#D6DCE8] group-hover:bg-[#C7D2E3] dark:bg-[oklch(0.185_0.024_258)] dark:group-hover:bg-[oklch(0.21_0.024_258)]"
                              }`}
                              style={{
                                position: "sticky",
                                left: 0,
                                zIndex: 1,
                                minWidth: 99,
                                borderRight: "1px solid rgba(100,116,139,0.18)",
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center justify-center gap-1">
                                {project.status === "draft" ? (
                                  <>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() =>
                                            handleContinueDraft(project)
                                          }
                                          className="h-[26px] w-[26px] rounded-[8px] bg-white dark:bg-slate-800 border border-[#e8edf5] dark:border-slate-700 text-violet-500 dark:text-slate-500 shadow-[0_4px_10px_rgba(15,23,42,0.06)] hover:bg-gradient-to-br hover:from-[#2558FF] hover:via-[#6E2C96] hover:to-[#D92293] hover:text-white dark:hover:text-[#0a1628] hover:border-transparent hover:shadow-[0_8px_18px_rgba(15,23,42,0.18)] hover:-translate-y-px transition-all duration-150"
                                        >
                                          <ArrowRight className="h-3.5 w-3.5" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent className="text-xs">
                                        Continuar rascunho
                                      </TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() =>
                                            handleStartCancelProject(project)
                                          }
                                          className="h-[26px] w-[26px] rounded-[8px] bg-white dark:bg-slate-800 border border-[#e8edf5] dark:border-slate-700 text-red-500 dark:text-red-400 shadow-[0_4px_10px_rgba(15,23,42,0.06)] hover:bg-red-600 hover:text-white hover:border-transparent hover:shadow-[0_8px_18px_rgba(220,38,38,0.25)] hover:-translate-y-px transition-all duration-150"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent className="text-xs">
                                        Descartar
                                      </TooltipContent>
                                    </Tooltip>
                                  </>
                                ) : project.status === "awaiting-payment" ? (
                                  <>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() =>
                                            handleGoToPayment(project)
                                          }
                                          className="h-[26px] w-[26px] rounded-[8px] bg-white dark:bg-slate-800 border border-[#e8edf5] dark:border-slate-700 text-amber-500 dark:text-slate-500 shadow-[0_4px_10px_rgba(15,23,42,0.06)] hover:bg-gradient-to-br hover:from-[#2558FF] hover:via-[#6E2C96] hover:to-[#D92293] hover:text-white dark:hover:text-[#0a1628] hover:border-transparent hover:shadow-[0_8px_18px_rgba(15,23,42,0.18)] hover:-translate-y-px transition-all duration-150"
                                        >
                                          <CreditCard className="h-3.5 w-3.5" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent className="text-xs">
                                        Ir para Pagamento
                                      </TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() =>
                                            handleViewProject(project)
                                          }
                                          className="h-[26px] w-[26px] rounded-[8px] bg-white dark:bg-slate-800 border border-[#e8edf5] dark:border-slate-700 text-blue-500 dark:text-slate-500 shadow-[0_4px_10px_rgba(15,23,42,0.06)] hover:bg-gradient-to-br hover:from-[#2558FF] hover:via-[#6E2C96] hover:to-[#D92293] hover:text-white dark:hover:text-[#0a1628] hover:border-transparent hover:shadow-[0_8px_18px_rgba(15,23,42,0.18)] hover:-translate-y-px transition-all duration-150"
                                        >
                                          <Eye className="h-3.5 w-3.5" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent className="text-xs">
                                        Visualizar
                                      </TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() =>
                                            handleStartCancelProject(project)
                                          }
                                          className="h-[26px] w-[26px] rounded-[8px] bg-white dark:bg-slate-800 border border-[#e8edf5] dark:border-slate-700 text-red-500 dark:text-red-400 shadow-[0_4px_10px_rgba(15,23,42,0.06)] hover:bg-red-600 hover:text-white hover:border-transparent hover:shadow-[0_8px_18px_rgba(220,38,38,0.25)] hover:-translate-y-px transition-all duration-150"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent className="text-xs">
                                        Cancelar
                                      </TooltipContent>
                                    </Tooltip>
                                  </>
                                ) : (
                                  <>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() =>
                                            handleViewProject(project)
                                          }
                                          className="h-[26px] w-[26px] rounded-[8px] bg-white dark:bg-slate-800 border border-[#e8edf5] dark:border-slate-700 text-blue-500 dark:text-slate-500 shadow-[0_4px_10px_rgba(15,23,42,0.06)] hover:bg-gradient-to-br hover:from-[#2558FF] hover:via-[#6E2C96] hover:to-[#D92293] hover:text-white dark:hover:text-[#0a1628] hover:border-transparent hover:shadow-[0_8px_18px_rgba(15,23,42,0.18)] hover:-translate-y-px transition-all duration-150"
                                        >
                                          <Eye className="h-3.5 w-3.5" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent className="text-xs">
                                        Visualizar
                                      </TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() =>
                                            handleCloneProject(project)
                                          }
                                          className="h-[26px] w-[26px] rounded-[8px] bg-white dark:bg-slate-800 border border-[#e8edf5] dark:border-slate-700 text-emerald-500 dark:text-slate-500 shadow-[0_4px_10px_rgba(15,23,42,0.06)] hover:bg-gradient-to-br hover:from-[#2558FF] hover:via-[#6E2C96] hover:to-[#D92293] hover:text-white dark:hover:text-[#0a1628] hover:border-transparent hover:shadow-[0_8px_18px_rgba(15,23,42,0.18)] hover:-translate-y-px transition-all duration-150"
                                        >
                                          <Copy className="h-3.5 w-3.5" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent className="text-xs">
                                        Duplicar
                                      </TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() =>
                                            handleStartCancelProject(project)
                                          }
                                          className="h-[26px] w-[26px] rounded-[8px] bg-white dark:bg-slate-800 border border-[#e8edf5] dark:border-slate-700 text-red-500 dark:text-red-400 shadow-[0_4px_10px_rgba(15,23,42,0.06)] hover:bg-red-600 hover:text-white hover:border-transparent hover:shadow-[0_8px_18px_rgba(220,38,38,0.25)] hover:-translate-y-px transition-all duration-150"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent className="text-xs">
                                        Cancelar
                                      </TooltipContent>
                                    </Tooltip>
                                  </>
                                )}
                              </div>
                            </td>

                            {/* ID */}
                            {visibleCols.includes("id") && (
                              <td
                                className="px-5 py-3.5"
                                style={{
                                  borderRight:
                                    "1px solid rgba(148,163,184,0.15)",
                                  overflow: "hidden",
                                }}
                              >
                                <span className="font-mono text-[11px] text-slate-400 tracking-wide">
                                  proj_{String(project.seq ?? "?????").padStart(5, "0")}
                                </span>
                              </td>
                            )}

                            {/* Projeto */}
                            {visibleCols.includes("name") && (
                              <td
                                className="px-5 py-3.5"
                                style={{
                                  borderRight:
                                    "1px solid rgba(148,163,184,0.15)",
                                  overflow: "hidden",
                                }}
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                                    style={{
                                      background:
                                        "linear-gradient(135deg, #3b82f6, #6366f1)",
                                    }}
                                  >
                                    {project.name
                                      .trim()
                                      .split(" ")
                                      .slice(0, 2)
                                      .map((w) => w[0])
                                      .join("")
                                      .toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <p className="font-semibold text-sm text-slate-900 truncate">
                                        {project.name}
                                      </p>
                                      {project.hasOwner === false && (
                                        <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">
                                          Sem responsável
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-slate-400 truncate">
                                      {project.consultant || project.agency || "—"}
                                    </p>
                                  </div>
                                </div>
                              </td>
                            )}

                            {/* Cliente */}
                            {visibleCols.includes("client") && (
                              <td
                                className="px-5 py-3.5"
                                style={{
                                  borderRight:
                                    "1px solid rgba(148,163,184,0.15)",
                                  overflow: "hidden",
                                }}
                              >
                                <div className="flex items-center gap-1.5">
                                  <Building2 className="h-3 w-3 text-slate-400 shrink-0" />
                                  <span className="text-xs text-blue-600 font-medium truncate">
                                    {project.client}
                                  </span>
                                </div>
                              </td>
                            )}

                            {/* Conta responsável */}
                            {visibleCols.includes("owner") && (
                              <td
                                className="px-5 py-3.5"
                                style={{
                                  borderRight:
                                    "1px solid rgba(148,163,184,0.15)",
                                  overflow: "hidden",
                                }}
                              >
                                <div className="flex items-center gap-1.5">
                                  <div className="flex flex-col gap-0.5 min-w-0">
                                    <span className="text-xs text-slate-700 font-medium truncate">
                                      {project.ownerName || "—"}
                                    </span>
                                    {project.ownerType && (
                                      <span
                                        className={`inline-flex w-fit items-center px-1.5 py-0.5 rounded text-[9px] font-bold leading-none uppercase tracking-wide ${
                                          project.ownerType === "agency"
                                            ? "bg-orange-100 text-orange-700"
                                            : project.ownerType === "partner"
                                              ? "bg-purple-100 text-purple-700"
                                              : "bg-blue-100 text-blue-700"
                                        }`}
                                      >
                                        {project.ownerType === "agency"
                                          ? "Agency"
                                          : project.ownerType === "partner"
                                            ? "Partner"
                                            : "Company"}
                                      </span>
                                    )}
                                    {!project.ownerType && (
                                      <span className="inline-flex w-fit items-center px-1.5 py-0.5 rounded text-[9px] font-bold leading-none bg-amber-100 text-amber-700">
                                        Sem dono
                                      </span>
                                    )}
                                  </div>
                                  {scope === "admin" && (
                                    <TooltipProvider delayDuration={400}>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              openLinkPanel(project);
                                            }}
                                            className="shrink-0 h-5 w-5 flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-gradient-to-br hover:from-[#2558FF] hover:via-[#6E2C96] hover:to-[#D92293] transition-all"
                                          >
                                            <Link2 className="h-3 w-3" />
                                          </button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="text-xs">Alterar vínculo</TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>
                              </td>
                            )}

                            {/* Empresa (agency/company/nomad) */}
                            {visibleCols.includes("agency") && (
                              <td
                                className="px-5 py-3.5"
                                style={{
                                  borderRight:
                                    "1px solid rgba(148,163,184,0.15)",
                                  overflow: "hidden",
                                }}
                              >
                                <div className="flex items-center gap-1.5">
                                  <Briefcase className="h-3 w-3 text-slate-400 shrink-0" />
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-xs text-slate-600 truncate">
                                      {project.agency}
                                    </span>
                                    {project.companyType && (
                                      <span
                                        className={`mt-0.5 inline-flex w-fit items-center px-1.5 py-0.5 rounded text-[10px] font-medium leading-none ${
                                          project.companyType === "agency"
                                            ? "bg-orange-100 text-orange-700"
                                            : project.companyType === "nomad"
                                              ? "bg-teal-100 text-teal-700"
                                              : "bg-blue-100 text-blue-700"
                                        }`}
                                      >
                                        {project.companyType === "agency"
                                          ? "Agency"
                                          : project.companyType === "nomad"
                                            ? "Nomad"
                                            : "Company"}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>
                            )}

                            {/* Tipo */}
                            {visibleCols.includes("type") && (
                              <td
                                className="px-5 py-3.5"
                                style={{
                                  borderRight:
                                    "1px solid rgba(148,163,184,0.15)",
                                  overflow: "hidden",
                                }}
                              >
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border bg-slate-50 text-slate-700 border-slate-200 whitespace-nowrap">
                                  {project.type}
                                </span>
                              </td>
                            )}

                            {/* Status */}
                            {visibleCols.includes("status") && (
                              <td
                                className="px-5 py-3.5"
                                style={{
                                  borderRight:
                                    "1px solid rgba(148,163,184,0.15)",
                                  overflow: "hidden",
                                }}
                              >
                                {getStatusBadge(project.status)}
                              </td>
                            )}

                            {/* Progresso */}
                            {visibleCols.includes("progress") && (
                              <td
                                className="px-5 py-3.5"
                                style={{
                                  borderRight:
                                    "1px solid rgba(148,163,184,0.15)",
                                  overflow: "hidden",
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-1.5 rounded-full bg-slate-200 min-w-[40px]">
                                    <div
                                      className="h-1.5 rounded-full bg-blue-500"
                                      style={{ width: `${project.progress}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] font-bold text-slate-500 shrink-0 w-7 text-right">
                                    {project.progress}%
                                  </span>
                                </div>
                              </td>
                            )}

                            {/* Orçamento */}
                            {visibleCols.includes("budget") && (
                              <td
                                className="px-5 py-3.5"
                                style={{
                                  borderRight:
                                    "1px solid rgba(148,163,184,0.15)",
                                  overflow: "hidden",
                                }}
                              >
                                <div className="flex items-center gap-1.5">
                                  <DollarSign className="h-3 w-3 text-slate-400 shrink-0" />
                                  <span className="text-xs font-semibold text-slate-900">
                                    R$ {project.budget.toLocaleString("pt-BR")}
                                  </span>
                                </div>
                              </td>
                            )}

                            {/* Equipe */}
                            {visibleCols.includes("team") && (
                              <td
                                className="px-5 py-3.5"
                                style={{
                                  borderRight:
                                    "1px solid rgba(148,163,184,0.15)",
                                  overflow: "hidden",
                                }}
                              >
                                <div className="flex items-center gap-1.5">
                                  <Users className="h-3 w-3 text-slate-400 shrink-0" />
                                  <span className="text-xs text-slate-600">
                                    {project.team}
                                  </span>
                                </div>
                              </td>
                            )}

                            {/* Criação */}
                            {visibleCols.includes("created") && (
                              <td
                                className="px-5 py-3.5"
                                style={{
                                  borderRight:
                                    "1px solid rgba(148,163,184,0.15)",
                                  overflow: "hidden",
                                }}
                              >
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-1.5 cursor-default">
                                      <Calendar className="h-3 w-3 text-slate-400 shrink-0" />
                                      <span className="text-xs text-slate-500">
                                        {project.createdDate}
                                      </span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent className="text-xs max-w-[240px]">
                                    {(() => {
                                      try {
                                        const d = new Date(
                                          project.createdAt || "",
                                        );
                                        return `Criado em ${d.toLocaleDateString("pt-BR")} às ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
                                      } catch {
                                        return project.createdDate || "–";
                                      }
                                    })()}
                                  </TooltipContent>
                                </Tooltip>
                              </td>
                            )}

                          </tr>
                        </TooltipProvider>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Row 3 — bottom mirror of row 2 */}
              {filteredProjects.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 px-[18px] py-2 border-t border-[#e8edf5] dark:border-slate-800 bg-white dark:bg-slate-900/20">
                  <div className="flex items-center gap-3">
                    <ItemsPerPageSelect
                      value={itemsPerPage.toString()}
                      onValueChange={(v) => {
                        setItemsPerPage(Number(v));
                        setCurrentPage(1);
                      }}
                      variant="bottom"
                    />
                    <CountText side="top" />
                  </div>

                  {hasHorizontalOverflow && (
                    <div
                      ref={bottomScrollRef}
                      onScroll={handleBottomBarScroll}
                      title="Arraste para rolar a tabela na horizontal e ver as colunas que não couberem na tela"
                      className="hidden md:block flex-1 min-w-[80px] overflow-x-scroll allka-table-scroll self-center"
                      style={{ height: 12 }}
                    >
                      <div style={{ minWidth: 1400, height: 1 }} />
                    </div>
                  )}

                  {totalPages > 1 && <PaginationControls />}
                </div>
              )}
            </div>

            {/* ── Advanced Filters Modal ── */}
            {isFilterModalOpen && (
              <div
                data-slot="sheet-content"
                data-state="open"
                className="fixed right-0 z-70 bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=open]:fade-in-0 duration-300"
                style={{
                  left: sidebarWidth - 2,
                  top: headerHeight - 1,
                  bottom: footerHeight - 1,
                  width: `calc(100vw - ${sidebarWidth - 2}px)`,
                }}
              >
                <div className="bg-white w-full h-full flex flex-col overflow-hidden">
                  {/* Modal header */}
                  <div className="app-brand-header relative flex-shrink-0 px-5 min-h-[72px] flex items-center">
                    <div className="flex-1">
                      <h2 className="text-white font-bold text-base">
                        Filtros Avançados
                      </h2>
                      <p className="text-blue-200 text-xs mt-0.5">
                        Configure os filtros para refinar os resultados
                      </p>
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
                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                          Filtros Salvos
                        </p>
                      </div>
                      <div className="flex-1 overflow-y-auto py-1">
                        {savedFilters.length === 0 ? (
                          <p className="text-[11px] text-slate-400 text-center py-4 px-2">
                            Nenhum filtro salvo
                          </p>
                        ) : (
                          savedFilters.map((sf, idx) => (
                            <div
                              key={sf.id}
                              draggable
                              onDragStart={() => setFilterDragIdx(idx)}
                              onDragOver={(e) => {
                                e.preventDefault();
                                setFilterDragOverIdx(idx);
                              }}
                              onDrop={() => {
                                if (
                                  filterDragIdx === null ||
                                  filterDragIdx === idx
                                )
                                  return;
                                const arr = [...savedFilters];
                                const [item] = arr.splice(filterDragIdx, 1);
                                arr.splice(idx, 0, item);
                                setSavedFilters(arr);
                                setFilterDragIdx(null);
                                setFilterDragOverIdx(null);
                              }}
                              onDragEnd={() => {
                                setFilterDragIdx(null);
                                setFilterDragOverIdx(null);
                              }}
                              className={`flex items-center gap-1.5 px-2.5 py-2 mx-1 rounded-lg mb-0.5 cursor-pointer text-xs transition-colors ${
                                activeFilterId === sf.id
                                  ? "bg-blue-100 text-blue-700 font-semibold"
                                  : "hover:bg-slate-100 text-slate-600"
                              } ${filterDragOverIdx === idx ? "ring-1 ring-blue-300" : ""}`}
                              onClick={() => {
                                setActiveFilterId(sf.id);
                                // Apply saved filter
                                const f = sf.filters;
                                if (f.status !== undefined)
                                  setFilterStatus(f.status);
                                if (f.type !== undefined) setFilterType(f.type);
                                if (f.company !== undefined)
                                  setFilterCompany(f.company);
                                if (f.agency !== undefined)
                                  setFilterAgency(f.agency);
                                if (f.valueRange !== undefined)
                                  setFilterValueRange(f.valueRange);
                                if (f.paymentStatus !== undefined)
                                  setFilterPaymentStatus(f.paymentStatus);
                                if (f.fromLead !== undefined)
                                  setFilterFromLead(f.fromLead);
                                if (f.consultant !== undefined)
                                  setFilterConsultant(f.consultant);
                                if (f.priceMin !== undefined)
                                  setFilterPriceMin(f.priceMin);
                                if (f.priceMax !== undefined)
                                  setFilterPriceMax(f.priceMax);
                                if (f.tasksMin !== undefined)
                                  setFilterTasksMin(f.tasksMin);
                                if (f.tasksMax !== undefined)
                                  setFilterTasksMax(f.tasksMax);
                              }}
                            >
                              <GripVertical className="h-3 w-3 text-slate-300 flex-shrink-0" />
                              <span className="flex-1 truncate">{sf.name}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSavedFilters((prev) =>
                                    prev.filter((s) => s.id !== sf.id),
                                  );
                                  if (activeFilterId === sf.id)
                                    setActiveFilterId(null);
                                }}
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
                              onChange={(e) =>
                                setSavedFilterName(e.target.value)
                              }
                              placeholder="Nome do filtro"
                              className="h-7 text-xs"
                              autoFocus
                              onKeyDown={(e) => {
                                if (
                                  e.key === "Enter" &&
                                  savedFilterName.trim()
                                ) {
                                  const newFilter = {
                                    id: Date.now().toString(),
                                    name: savedFilterName,
                                    filters: {
                                      status: filterStatus,
                                      type: filterType,
                                      company: filterCompany,
                                      agency: filterAgency,
                                      valueRange: filterValueRange,
                                      paymentStatus: filterPaymentStatus,
                                      fromLead: filterFromLead,
                                      consultant: filterConsultant,
                                      priceMin: filterPriceMin,
                                      priceMax: filterPriceMax,
                                      tasksMin: filterTasksMin,
                                      tasksMax: filterTasksMax,
                                    },
                                  };
                                  setSavedFilters((prev) => [
                                    ...prev,
                                    newFilter,
                                  ]);
                                  setSavedFilterName("");
                                  setIsSavingFilter(false);
                                }
                              }}
                            />
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                className="flex-1 h-6 text-[10px] btn-brand"
                                onClick={() => {
                                  if (!savedFilterName.trim()) return;
                                  const newFilter = {
                                    id: Date.now().toString(),
                                    name: savedFilterName,
                                    filters: {
                                      status: filterStatus,
                                      type: filterType,
                                      company: filterCompany,
                                      agency: filterAgency,
                                      valueRange: filterValueRange,
                                      paymentStatus: filterPaymentStatus,
                                      fromLead: filterFromLead,
                                      consultant: filterConsultant,
                                      priceMin: filterPriceMin,
                                      priceMax: filterPriceMax,
                                      tasksMin: filterTasksMin,
                                      tasksMax: filterTasksMax,
                                    },
                                  };
                                  setSavedFilters((prev) => [
                                    ...prev,
                                    newFilter,
                                  ]);
                                  setSavedFilterName("");
                                  setIsSavingFilter(false);
                                }}
                              >
                                <Save className="h-2.5 w-2.5 mr-1" />
                                Salvar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-[10px]"
                                onClick={() => {
                                  setIsSavingFilter(false);
                                  setSavedFilterName("");
                                }}
                              >
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
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                              Campos disponíveis
                            </p>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() =>
                                  setVisibleFields(
                                    allFilterFields.map((f) => f.id),
                                  )
                                }
                                className="text-[11px] text-blue-500 hover:text-blue-700 font-medium transition-colors"
                              >
                                Selecionar todos
                              </button>
                              <button
                                onClick={() => setVisibleFields([])}
                                className="text-[11px] text-slate-400 hover:text-red-500 transition-colors"
                              >
                                Limpar
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                            {allFilterFields.map((field) => {
                              const checked = visibleFields.includes(field.id);
                              return (
                                <label
                                  key={field.id}
                                  className="flex items-center gap-2 py-1 cursor-pointer group"
                                >
                                  <div
                                    onClick={() =>
                                      setVisibleFields(
                                        checked
                                          ? visibleFields.filter(
                                              (f) => f !== field.id,
                                            )
                                          : [...visibleFields, field.id],
                                      )
                                    }
                                    className={`w-4 h-4 rounded flex items-center justify-center border-2 transition-colors flex-shrink-0 ${
                                      checked
                                        ? "bg-blue-500 border-blue-500"
                                        : "border-slate-300 dark:border-slate-600 group-hover:border-blue-400"
                                    }`}
                                  >
                                    {checked && (
                                      <svg
                                        viewBox="0 0 10 8"
                                        className="w-2.5 h-2.5 text-white fill-none stroke-current stroke-[2]"
                                      >
                                        <path
                                          d="M1 4l3 3 5-6"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        />
                                      </svg>
                                    )}
                                  </div>
                                  <span className="text-[12px] text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors select-none">
                                    {field.label}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <button
                              onClick={() =>
                                setVisibleFields(
                                  allFilterFields.map((f) => f.id),
                                )
                              }
                              className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                            >
                              Recuperar campos padrão
                            </button>
                            <button
                              onClick={() => setShowFieldPicker(false)}
                              className="h-7 px-3 rounded-md text-[11px] font-medium btn-brand"
                            >
                              Confirmar
                            </button>
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
                          <span className="text-[11px] text-slate-400">
                            {visibleFields.length} campo
                            {visibleFields.length !== 1 ? "s" : ""} ativo
                            {visibleFields.length !== 1 ? "s" : ""}
                          </span>
                        )}
                        {showFieldPicker && (
                          <button
                            onClick={() => setShowFieldPicker(false)}
                            className="ml-auto text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Filter fields (scrollable) */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {/* Identificação */}
                        {["buscar", "empresa", "agencia", "consultor"].some(
                          (id) => visibleFields.includes(id),
                        ) && (
                          <div>
                            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
                              Identificação
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                              {visibleFields.includes("buscar") && (
                                <div>
                                  <label className="text-xs text-slate-500 mb-1 block">
                                    Buscar
                                  </label>
                                  <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                    <Input
                                      value={searchTerm}
                                      onChange={(e) =>
                                        setSearchTerm(e.target.value)
                                      }
                                      placeholder="Projeto, cliente..."
                                      className="pl-8 h-8 text-xs"
                                    />
                                  </div>
                                </div>
                              )}
                              {visibleFields.includes("empresa") && (
                                <div>
                                  <label className="text-xs text-slate-500 mb-1 block">
                                    Empresa / Cliente
                                  </label>
                                  <select
                                    value={filterCompany}
                                    onChange={(e) =>
                                      setFilterCompany(e.target.value)
                                    }
                                    className="w-full h-8 px-2 py-1 text-xs border border-slate-200 rounded-md bg-white"
                                  >
                                    <option value="all">Todos</option>
                                    {uniqueCompanies.map((c) => (
                                      <option key={c} value={c}>
                                        {c}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}
                              {visibleFields.includes("agencia") && (
                                <div>
                                  <label className="text-xs text-slate-500 mb-1 block">
                                    Agência
                                  </label>
                                  <select
                                    value={filterAgency}
                                    onChange={(e) =>
                                      setFilterAgency(e.target.value)
                                    }
                                    className="w-full h-8 px-2 py-1 text-xs border border-slate-200 rounded-md bg-white"
                                  >
                                    <option value="all">Todas</option>
                                    {uniqueAgencies.map((a) => (
                                      <option key={a} value={a}>
                                        {a}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}
                              {visibleFields.includes("consultor") && (
                                <div className="col-span-2">
                                  <label className="text-xs text-slate-500 mb-1 block">
                                    Responsável / Consultor
                                  </label>
                                  <select
                                    value={filterConsultant}
                                    onChange={(e) =>
                                      setFilterConsultant(e.target.value)
                                    }
                                    className="w-full h-8 px-2 py-1 text-xs border border-slate-200 rounded-md bg-white"
                                  >
                                    <option value="all">
                                      Todos os responsáveis
                                    </option>
                                    {uniqueConsultants.map((c) => (
                                      <option key={c} value={c}>
                                        {c}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Tipo e Status */}
                        {["status", "tipo"].some((id) =>
                          visibleFields.includes(id),
                        ) && (
                          <div>
                            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
                              Tipo · Status
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                              {visibleFields.includes("status") && (
                                <div>
                                  <label className="text-xs text-slate-500 mb-1 block">
                                    Status
                                  </label>
                                  <div className="flex flex-wrap gap-1.5">
                                    {[
                                      { value: "all", label: "Todos" },
                                      { value: "draft", label: "Rascunho" },
                                      {
                                        value: "pending-approval",
                                        label: "Ag. Aprovação",
                                      },
                                      {
                                        value: "negotiation",
                                        label: "Negociação",
                                      },
                                      {
                                        value: "awaiting-payment",
                                        label: "Ag. Pagto",
                                      },
                                      {
                                        value: "planning",
                                        label: "Planejamento",
                                      },
                                      {
                                        value: "in-progress",
                                        label: "Em Andamento",
                                      },
                                      {
                                        value: "completed",
                                        label: "Concluído",
                                      },
                                      {
                                        value: "cancelled",
                                        label: "Cancelado",
                                      },
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
                                  <label className="text-xs text-slate-500 mb-1 block">
                                    Tipo
                                  </label>
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
                        {["origem", "pagamento"].some((id) =>
                          visibleFields.includes(id),
                        ) && (
                          <div>
                            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
                              Lead · Pagamento
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                              {visibleFields.includes("origem") && (
                                <div>
                                  <label className="text-xs text-slate-500 mb-1 block">
                                    Origem
                                  </label>
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
                                  <label className="text-xs text-slate-500 mb-1 block">
                                    Pagamento
                                  </label>
                                  <div className="flex gap-1.5">
                                    {[
                                      { value: "all", label: "Todos" },
                                      { value: "paid", label: "Em dia" },
                                      {
                                        value: "overdue",
                                        label: "Inadimplente",
                                      },
                                    ].map(({ value, label }) => (
                                      <button
                                        key={value}
                                        onClick={() =>
                                          setFilterPaymentStatus(value)
                                        }
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
                            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
                              Faixa de Valor (R$)
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-xs text-slate-500 mb-1 block">
                                  Valor mínimo
                                </label>
                                <div className="relative">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-medium">
                                    R$
                                  </span>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={filterPriceMin}
                                    onChange={(e) =>
                                      setFilterPriceMin(e.target.value)
                                    }
                                    placeholder="0"
                                    className="pl-7 h-8 text-xs"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="text-xs text-slate-500 mb-1 block">
                                  Valor máximo
                                </label>
                                <div className="relative">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-medium">
                                    R$
                                  </span>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={filterPriceMax}
                                    onChange={(e) =>
                                      setFilterPriceMax(e.target.value)
                                    }
                                    placeholder="sem limite"
                                    className="pl-7 h-8 text-xs"
                                  />
                                </div>
                              </div>
                            </div>
                            {(filterPriceMin !== "" ||
                              filterPriceMax !== "") && (
                              <div className="mt-1.5 flex items-center justify-between">
                                <p className="text-[10px] text-slate-400">
                                  {filterPriceMin !== "" &&
                                  filterPriceMax !== ""
                                    ? `R$ ${Number(filterPriceMin).toLocaleString("pt-BR")} – R$ ${Number(filterPriceMax).toLocaleString("pt-BR")}`
                                    : filterPriceMin !== ""
                                      ? `A partir de R$ ${Number(filterPriceMin).toLocaleString("pt-BR")}`
                                      : `Até R$ ${Number(filterPriceMax).toLocaleString("pt-BR")}`}
                                </p>
                                <button
                                  onClick={() => {
                                    setFilterPriceMin("");
                                    setFilterPriceMax("");
                                  }}
                                  className="text-[10px] text-red-400 hover:underline"
                                >
                                  Limpar
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Volume de Tarefas */}
                        {visibleFields.includes("tarefas") && (
                          <div>
                            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
                              Volume de Tarefas
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-xs text-slate-500 mb-1 block">
                                  Mínimo de tarefas
                                </label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={filterTasksMin}
                                  onChange={(e) =>
                                    setFilterTasksMin(e.target.value)
                                  }
                                  placeholder="0"
                                  className="h-8 text-xs"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-slate-500 mb-1 block">
                                  Máximo de tarefas
                                </label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={filterTasksMax}
                                  onChange={(e) =>
                                    setFilterTasksMax(e.target.value)
                                  }
                                  placeholder="sem limite"
                                  className="h-8 text-xs"
                                />
                              </div>
                            </div>
                            {(filterTasksMin !== "" ||
                              filterTasksMax !== "") && (
                              <div className="mt-1.5 flex items-center justify-between">
                                <p className="text-[10px] text-slate-400">
                                  {filterTasksMin !== "" &&
                                  filterTasksMax !== ""
                                    ? `${filterTasksMin} – ${filterTasksMax} tarefas`
                                    : filterTasksMin !== ""
                                      ? `A partir de ${filterTasksMin} tarefas`
                                      : `Até ${filterTasksMax} tarefas`}
                                </p>
                                <button
                                  onClick={() => {
                                    setFilterTasksMin("");
                                    setFilterTasksMax("");
                                  }}
                                  className="text-[10px] text-red-400 hover:underline"
                                >
                                  Limpar
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {visibleFields.length === 0 && (
                          <div className="flex flex-col items-center justify-center py-10 text-center">
                            <p className="text-xs text-slate-400">
                              Nenhum campo ativo.
                              <br />
                              Clique em{" "}
                              <span className="text-blue-500">
                                + Adicionar campo
                              </span>{" "}
                              para configurar.
                            </p>
                          </div>
                        )}

                        {/* Results count */}
                        <div className="pt-2 border-t border-slate-100">
                          <p className="text-xs text-slate-500">
                            <span className="font-semibold text-slate-900">
                              {filteredProjects.length}
                            </span>{" "}
                            projeto{filteredProjects.length !== 1 ? "s" : ""}{" "}
                            encontrado{filteredProjects.length !== 1 ? "s" : ""}
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
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => setIsFilterModalOpen(false)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 text-xs btn-brand"
                        onClick={() => {
                          setCurrentPage(1);
                          setIsFilterModalOpen(false);
                        }}
                      >
                        Aplicar Filtros
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 overflow-auto flex flex-col">
            {/* Toolbar for kanban/planner views */}
            <Card className="border border-slate-200/70 shadow-sm overflow-hidden mb-3 shrink-0">
              <div className="flex items-center gap-3 px-5 py-3.5 bg-slate-50/60">
                {/* View mode tabs */}
                <div className="inline-flex rounded-lg bg-muted p-1 shrink-0">
                  <Button
                    size="sm"
                    variant={viewMode === "accordion" ? "default" : "ghost"}
                    onClick={() => setViewMode("accordion")}
                    className={`h-7 px-2.5 rounded-md transition-all text-xs ${
                      viewMode === "accordion"
                        ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-sm"
                        : "hover:bg-background"
                    }`}
                  >
                    <List className="h-3 w-3 mr-1" />
                    Lista
                  </Button>
                  <Button
                    size="sm"
                    variant={viewMode === "kanban" ? "default" : "ghost"}
                    onClick={() => setViewMode("kanban")}
                    className={`h-7 px-2.5 rounded-md transition-all text-xs ${
                      viewMode === "kanban"
                        ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-sm"
                        : "hover:bg-background"
                    }`}
                  >
                    <LayoutGrid className="h-3 w-3 mr-1" />
                    Kanban
                  </Button>
                  <Button
                    size="sm"
                    variant={viewMode === "planner" ? "default" : "ghost"}
                    onClick={() => setViewMode("planner")}
                    className={`h-7 px-2.5 rounded-md transition-all text-xs ${
                      viewMode === "planner"
                        ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-sm"
                        : "hover:bg-background"
                    }`}
                  >
                    <LayoutDashboard className="h-3 w-3 mr-1" />
                    Planejador
                  </Button>
                </div>
                {viewMode === "kanban" && (
                  <Button
                    onClick={handleAddColumn}
                    size="sm"
                    className="h-7 text-xs px-2.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-sm"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Nova Coluna
                  </Button>
                )}
                {viewMode === "planner" && (
                  <Button
                    onClick={handleAddPlannerColumn}
                    size="sm"
                    className="h-7 text-xs px-2.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-sm"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Nova Coluna
                  </Button>
                )}
              </div>
            </Card>

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
                          projects={filteredProjects.filter(
                            (p) => p.status === column.id,
                          )}
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
                              {
                                kanbanColumns.find((col) => col.id === activeId)
                                  ?.label
                              }
                            </h3>
                          </div>
                        )}
                      </div>
                    )}
                    {activeId && activeType === "card" && (
                      <div className="w-52 opacity-80">
                        <Card className="p-2 bg-white border-2 border-blue-500">
                          <div className="text-xs font-semibold">
                            Movendo projeto...
                          </div>
                        </Card>
                      </div>
                    )}
                  </DragOverlay>
                </DndContext>

                {/* Column Create/Edit Dialog */}
                <Dialog
                  open={showColumnDialog}
                  onOpenChange={setShowColumnDialog}
                >
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>
                        {editingColumn ? "Editar Coluna" : "Nova Coluna"}
                      </DialogTitle>
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
                                newColumnColor === color.value
                                  ? "ring-2 ring-offset-2 ring-black"
                                  : ""
                              }`}
                              title={color.label}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setShowColumnDialog(false)}
                      >
                        Cancelar
                      </Button>
                      <Button onClick={handleSaveColumn}>Salvar</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog
                  open={showDeleteColumnDialog}
                  onOpenChange={setShowDeleteColumnDialog}
                >
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Excluir Coluna</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <p className="text-sm text-muted-foreground">
                        Tem certeza que deseja excluir esta coluna?
                      </p>

                      {columnToDelete &&
                        projectsData.filter((p) => p.status === columnToDelete)
                          .length > 0 && (
                          <div className="space-y-3">
                            <div className="rounded-md bg-yellow-50 p-3 border border-yellow-200">
                              <p className="text-sm text-yellow-800">
                                Esta coluna contém{" "}
                                {
                                  projectsData.filter(
                                    (p) => p.status === columnToDelete,
                                  ).length
                                }{" "}
                                projeto(s). Selecione para qual coluna os
                                projetos serão movidos:
                              </p>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="target-column">
                                Mover projetos para:
                              </Label>
                              <select
                                id="target-column"
                                value={targetColumnForItems}
                                onChange={(e) =>
                                  setTargetColumnForItems(e.target.value)
                                }
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
                          setShowDeleteColumnDialog(false);
                          setColumnToDelete(null);
                          setTargetColumnForItems("");
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={confirmDeleteColumn}
                        disabled={
                          columnToDelete &&
                          projectsData.filter(
                            (p) => p.status === columnToDelete,
                          ).length > 0 &&
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

            {/* ── Planejador view ── */}
            {viewMode === "planner" && (
              <div className="py-2 pb-0">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handlePlannerDragStart}
                  onDragEnd={handlePlannerDragEnd}
                >
                  <div className="flex gap-2 overflow-x-auto">
                    <SortableContext
                      items={plannerColumns.map((c) => c.id)}
                      strategy={horizontalListSortingStrategy}
                    >
                      {plannerColumns.map((col) => (
                        <PlannerColumn
                          key={col.id}
                          column={col}
                          cards={plannerCards.filter(
                            (c) => c.columnId === col.id,
                          )}
                          projects={projectsData}
                          onEdit={() => handleEditPlannerColumn(col)}
                          onDelete={() => handleDeletePlannerColumn(col.id)}
                          onAddCard={() => handleAddPlannerCard(col.id)}
                          onEditCard={handleEditPlannerCard}
                          onDeleteCard={handleDeletePlannerCard}
                        />
                      ))}
                    </SortableContext>
                  </div>
                  <DragOverlay>
                    {plannerActiveId && plannerActiveType === "column" && (
                      <div className="w-56 opacity-80">
                        {plannerColumns.find(
                          (c) => c.id === plannerActiveId,
                        ) && (
                          <div
                            className={`${plannerColumns.find((c) => c.id === plannerActiveId)?.color} text-white rounded-t-lg px-3 py-2`}
                          >
                            <h3 className="font-bold text-xs">
                              {
                                plannerColumns.find(
                                  (c) => c.id === plannerActiveId,
                                )?.label
                              }
                            </h3>
                          </div>
                        )}
                      </div>
                    )}
                    {plannerActiveId && plannerActiveType === "card" && (
                      <div className="w-56 opacity-80">
                        <Card className="p-2 bg-white border-2 border-violet-500">
                          <div className="text-xs font-semibold">
                            {
                              plannerCards.find((c) => c.id === plannerActiveId)
                                ?.title
                            }
                          </div>
                        </Card>
                      </div>
                    )}
                  </DragOverlay>
                </DndContext>

                {/* Planner — column dialog */}
                <Dialog
                  open={showPlannerColumnDialog}
                  onOpenChange={setShowPlannerColumnDialog}
                >
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>
                        {editingPlannerColumn ? "Editar Coluna" : "Nova Coluna"}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Nome da Coluna</Label>
                        <Input
                          value={newPlannerColumnName}
                          onChange={(e) =>
                            setNewPlannerColumnName(e.target.value)
                          }
                          placeholder="Ex: Em Aprovação"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Cor</Label>
                        <div className="grid grid-cols-5 gap-2">
                          {availableColors.map((c) => (
                            <button
                              key={c.value}
                              onClick={() => setNewPlannerColumnColor(c.value)}
                              className={`h-10 rounded-md ${c.value} ${newPlannerColumnColor === c.value ? "ring-2 ring-offset-2 ring-black" : ""}`}
                              title={c.label}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setShowPlannerColumnDialog(false)}
                      >
                        Cancelar
                      </Button>
                      <Button onClick={handleSavePlannerColumn}>Salvar</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Planner — card dialog */}
                <Dialog
                  open={showPlannerCardDialog}
                  onOpenChange={setShowPlannerCardDialog}
                >
                  <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle>
                        {editingPlannerCard ? "Editar Cartão" : "Novo Cartão"}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                      <div className="space-y-2">
                        <Label>Título *</Label>
                        <Input
                          value={newCardTitle}
                          onChange={(e) => setNewCardTitle(e.target.value)}
                          placeholder="O que precisa ser feito?"
                          autoFocus
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Descrição</Label>
                        <textarea
                          value={newCardDesc}
                          onChange={(e) => setNewCardDesc(e.target.value)}
                          placeholder="Detalhes adicionais..."
                          rows={2}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Prioridade</Label>
                          <div className="flex flex-wrap gap-1.5">
                            {(["low", "medium", "high", "urgent"] as const).map(
                              (p) => {
                                const cfg = {
                                  low: {
                                    label: "Baixa",
                                    cls: "bg-slate-200 text-slate-700 border-slate-300",
                                  },
                                  medium: {
                                    label: "Média",
                                    cls: "bg-blue-100 text-blue-700 border-blue-300",
                                  },
                                  high: {
                                    label: "Alta",
                                    cls: "bg-amber-100 text-amber-700 border-amber-300",
                                  },
                                  urgent: {
                                    label: "Urgente",
                                    cls: "bg-red-100 text-red-700 border-red-300",
                                  },
                                };
                                const active = {
                                  low: "bg-slate-500 text-white border-slate-500",
                                  medium:
                                    "bg-blue-500 text-white border-blue-500",
                                  high: "bg-amber-500 text-white border-amber-500",
                                  urgent:
                                    "bg-red-500 text-white border-red-500",
                                };
                                return (
                                  <button
                                    key={p}
                                    onClick={() => setNewCardPriority(p)}
                                    className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${newCardPriority === p ? active[p] : cfg[p].cls}`}
                                  >
                                    {cfg[p].label}
                                  </button>
                                );
                              },
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Data Limite</Label>
                          <Input
                            type="date"
                            value={newCardDue}
                            onChange={(e) => setNewCardDue(e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Coluna</Label>
                        <select
                          value={newCardColumnId}
                          onChange={(e) => setNewCardColumnId(e.target.value)}
                          className="w-full h-9 px-2 text-sm border border-input rounded-md bg-background"
                        >
                          {plannerColumns.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>
                          Vincular a Projeto{" "}
                          <span className="text-slate-400 font-normal">
                            (opcional)
                          </span>
                        </Label>
                        <select
                          value={newCardProjectId ?? ""}
                          onChange={(e) =>
                            setNewCardProjectId(
                              e.target.value ? Number(e.target.value) : null,
                            )
                          }
                          className="w-full h-9 px-2 text-sm border border-input rounded-md bg-background"
                        >
                          <option value="">Nenhum</option>
                          {projectsData.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <DialogFooter>
                      {editingPlannerCard && (
                        <Button
                          variant="destructive"
                          className="mr-auto"
                          onClick={() => {
                            handleDeletePlannerCard(editingPlannerCard.id);
                            setShowPlannerCardDialog(false);
                          }}
                        >
                          Excluir
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        onClick={() => setShowPlannerCardDialog(false)}
                      >
                        Cancelar
                      </Button>
                      <Button onClick={handleSavePlannerCard}>Salvar</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        )}

        <SlidePanel
          open={showCloneDialog}
          onClose={() => {
            setShowCloneDialog(false);
            setProjectToClone(null);
            setCloneProjectName("");
          }}
          title="Duplicar Projeto"
          subtitle="Selecione o que deseja incluir na cópia"
          widthMode="full"
          footer={
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowCloneDialog(false);
                  setProjectToClone(null);
                  setCloneProjectName("");
                }}
                className="h-8 px-4 text-xs"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmCloneAndOpen}
                disabled={!cloneProjectName.trim()}
                className="h-8 px-4 text-xs btn-brand"
              >
                <Copy className="h-3.5 w-3.5 mr-1.5" />
                Abrir para Editar
              </Button>
            </div>
          }
        >
            <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">
              {/* Name field */}
              <div>
                <Label
                  htmlFor="clone-name"
                  className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 block"
                >
                  Nome do Novo Projeto
                </Label>
                <Input
                  id="clone-name"
                  value={cloneProjectName}
                  onChange={(e) => setCloneProjectName(e.target.value)}
                  placeholder="Nome do projeto duplicado"
                  className="h-9 text-sm"
                />
              </div>

              {/* Options */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                  O que clonar
                </p>
                <div className="space-y-2">
                  {/* Dados do projeto - locked */}
                  <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3 opacity-70">
                    <div className="mt-0.5 h-4 w-4 rounded border-2 border-emerald-500 bg-emerald-500 flex items-center justify-center shrink-0">
                      <CheckCircle className="h-2.5 w-2.5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">
                        Dados do Projeto
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Cliente, agência, tipo, datas e descrição — sempre
                        incluídos
                      </p>
                    </div>
                  </div>

                  {/* Equipe */}
                  <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-3.5 py-3 cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/30 transition-colors">
                    <Checkbox
                      checked={cloneOptions.team}
                      onCheckedChange={(v) =>
                        setCloneOptions((o) => ({ ...o, team: !!v }))
                      }
                      className="mt-0.5 border-slate-300 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-700">
                        Equipe / Usuários
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Consultor responsável, nômades e membros da equipe
                      </p>
                    </div>
                  </label>

                  {/* Produtos */}
                  <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-3.5 py-3 cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/30 transition-colors">
                    <Checkbox
                      checked={cloneOptions.products}
                      onCheckedChange={(v) =>
                        setCloneOptions((o) => ({ ...o, products: !!v }))
                      }
                      className="mt-0.5 border-slate-300 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-700">
                        Produtos
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Lista de produtos disponíveis (dados de contratação
                        serão resetados)
                      </p>
                    </div>
                  </label>

                  {/* Cofre */}
                  <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-3.5 py-3 cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/30 transition-colors">
                    <Checkbox
                      checked={cloneOptions.vault}
                      onCheckedChange={(v) =>
                        setCloneOptions((o) => ({ ...o, vault: !!v }))
                      }
                      className="mt-0.5 border-slate-300 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-700">
                        Arquivos e Senhas (Cofre)
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Credenciais e cartões de pagamento — pode remover antes
                        de salvar
                      </p>
                    </div>
                  </label>

                  {/* Orçamento */}
                  <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-3.5 py-3 cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/30 transition-colors">
                    <Checkbox
                      checked={cloneOptions.financial}
                      onCheckedChange={(v) =>
                        setCloneOptions((o) => ({ ...o, financial: !!v }))
                      }
                      className="mt-0.5 border-slate-300 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-700">
                        Orçamento
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Valor e orçamento do projeto (gastos serão zerados)
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Info note */}
              <div className="flex gap-2.5 rounded-lg bg-blue-50 border border-blue-100 px-3.5 py-3">
                <AlertTriangle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 leading-relaxed">
                  O projeto será aberto para revisão antes de ser salvo. Você
                  poderá editar e remover qualquer informação na tela de
                  criação.
                </p>
              </div>
            </div>
        </SlidePanel>

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
                    <p className="text-sm text-yellow-900 font-medium mb-2">
                      Tem certeza que deseja cancelar este projeto?
                    </p>
                    <p className="text-sm text-yellow-800">
                      <strong>Projeto:</strong> {projectToCancel?.name}
                    </p>
                  </div>
                  <p className="text-sm text-gray-600">
                    Ao cancelar, todas as cobranças futuras serão suspensas e o
                    projeto será marcado como inativo.
                  </p>
                  <p className="text-sm text-gray-700 font-medium">
                    Por que você quer cancelar este projeto?
                  </p>
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
                      setShowCancelWizard(false);
                      setProjectToCancel(null);
                      setCancelReason("");
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
                    <p className="text-sm text-blue-900 font-medium">
                      Antes de cancelar, saiba que você pode:
                    </p>
                    <ul className="text-sm text-blue-800 space-y-2">
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 font-bold">•</span>
                        <span>
                          <strong>Pausar o projeto</strong> temporariamente sem
                          cancelar
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 font-bold">•</span>
                        <span>
                          <strong>Ajustar o orçamento</strong> para melhor se
                          adequar às suas necessidades
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 font-bold">•</span>
                        <span>
                          <strong>Conversar com nosso time</strong> sobre
                          alternativas
                        </span>
                      </li>
                    </ul>
                  </div>
                  <p className="text-sm text-gray-600">
                    Tem certeza que quer cancelar mesmo? Esta ação não pode ser
                    desfeita.
                  </p>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCancelWizard(false);
                      setProjectToCancel(null);
                      setCancelReason("");
                      setCancelStep(1);
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
                    <p className="text-sm text-red-900 font-medium mb-2">
                      Atenção!
                    </p>
                    <p className="text-sm text-red-800">
                      Você está prestes a cancelar{" "}
                      <strong>{projectToCancel?.name}</strong>.
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
                      setShowCancelWizard(false);
                      setProjectToCancel(null);
                      setCancelReason("");
                      setCancelStep(1);
                    }}
                    disabled={isCancellingProject}
                  >
                    Cancelar Operação
                  </Button>
                  <Button
                    onClick={handleConfirmCancel}
                    className="bg-red-600 hover:bg-red-700"
                    disabled={isCancellingProject}
                  >
                    {isCancellingProject ? (
                      <ButtonLoader text="Cancelando…" />
                    ) : (
                      "Confirmar Cancelamento"
                    )}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
        <ProjectManagementModal
          project={selectedProject}
          open={modalOpen}
          onOpenChange={(open) => {
            setModalOpen(open);
            if (!open) navigate(projectRouteBase, { replace: true });
          }}
          mode={modalMode}
          initialTab={initialProjectTab}
          onEdit={() => {
            setModalMode("edit");
          }}
          onClone={() => handleCloneProject(selectedProject)}
          onExport={() => {}}
          onSave={handleSaveProjectChanges}
          onCancel={() => handleStartCancelProject(selectedProject)}
          onContinueDraft={
            selectedProject
              ? () => {
                  setModalOpen(false);
                  handleContinueDraft(selectedProject);
                }
              : undefined
          }
          onGoToPayment={
            selectedProject
              ? () => {
                  setModalOpen(false);
                  handleGoToPayment(selectedProject);
                }
              : undefined
          }
        />
        <ProjectWizardSlidePanel
          open={showWizard}
          onClose={() => setShowWizard(false)}
          onSkip={handleSkipWizard}
          onCreateWithAI={handleCreateWithAI}
        />
        <ProjectCreateNewPanel
          open={showProjectCreate}
          onOpenChange={(v) => {
            setShowProjectCreate(v);
            if (!v) {
              setProjectCreateData(null);
              setDraftPanelProducts([]);
              setDraftPanelQuantities({});
              setDraftPanelCommissions({});
              setDraftPanelProjectId(undefined);
              setDraftResumeToCheckout(false);
            }
          }}
          initialData={projectCreateData}
          cloneMode={!!projectCreateData && !draftPanelProjectId}
          allowCompanySelect={scope === "admin" && !projectCreateData}
          agencyName={scope === "agency" ? agencyName : undefined}
          companyName={scope === "agency" ? agencyName : undefined}
          draftProducts={
            draftPanelProducts.length > 0 ? draftPanelProducts : undefined
          }
          draftProductQuantities={
            draftPanelProducts.length > 0 ? draftPanelQuantities : undefined
          }
          draftCommissions={
            draftPanelProducts.length > 0 ? draftPanelCommissions : undefined
          }
          draftProjectId={draftPanelProjectId}
          resumeToCheckout={draftResumeToCheckout}
          onCreate={async (project) => {
            refetchProjects();
            if (project?.id) {
              setShowProjectCreate(false);
              const openTab = project.openTab ?? "dashboard";
              setInitialProjectTab(openTab);
              const tabParam = openTab !== "dashboard" ? `?tab=${openTab}` : "";
              try {
                const raw: any = await apiClient.getProject(project.id);
                const full = adaptApiProject(raw);
                setInitialProjectTab(openTab);
                setSelectedProject(full);
                setModalMode("view");
                setModalOpen(true);
                navigate(`${projectRouteBase}/${project.id}${tabParam}`, {
                  replace: true,
                });
              } catch {
                setInitialProjectTab(openTab);
                setSelectedProject(project as FrontendProject);
                setModalMode("view");
                setModalOpen(true);
                navigate(`${projectRouteBase}/${project.id}${tabParam}`, {
                  replace: true,
                });
              }
            }
          }}
        />

        {/* Alterar vínculo (agency_id/company_id/partner_id) — exclusivo do Admin */}
        {scope === "admin" && (
          <SlidePanel
            open={linkPanelOpen}
            onClose={() => { if (!linkSaving) setLinkPanelOpen(false); }}
            title="Alterar vínculo"
            subtitle={linkPanelProject ? linkPanelProject.name : undefined}
            widthMode="full"
            footer={
              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" onClick={() => setLinkPanelOpen(false)} disabled={linkSaving}>
                  Cancelar
                </Button>
                <Button onClick={saveLink} disabled={linkSaving} className="btn-brand">
                  {linkSaving ? "Salvando..." : "Salvar vínculo"}
                </Button>
              </div>
            }
          >
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="space-y-2">
                <Label>Este projeto pertence a</Label>
                <Select
                  value={linkForm.type}
                  onValueChange={(v: "none" | "agency" | "company" | "partner") => setLinkForm({ type: v, id: "" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem vínculo</SelectItem>
                    <SelectItem value="agency">Agency</SelectItem>
                    <SelectItem value="company">Company</SelectItem>
                    <SelectItem value="partner">Partner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {linkForm.type !== "none" && (
                <div className="space-y-2">
                  <Label>
                    {linkForm.type === "agency" ? "Qual Agency" : linkForm.type === "company" ? "Qual Company" : "Qual Partner"}
                  </Label>
                  <Select value={linkForm.id} onValueChange={(v) => setLinkForm({ ...linkForm, id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {currentLinkOptions.map((o) => (
                        <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {linkError && <p className="text-xs text-red-600">{linkError}</p>}
            </div>
          </SlidePanel>
        )}
      </div>
    </div>
    </div>
    </div>
    </div>
  );
}

function KanbanColumn({
  column,
  projects,
  onEdit,
  onDelete,
  onViewProject,
  onEditProject,
}: {
  column: any;
  projects: any[];
  onEdit: () => void;
  onDelete: () => void;
  onViewProject: (project: any) => void;
  onEditProject: (project: any) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
  });

  const { setNodeRef: setDroppableRef } = useDroppable({
    id: column.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const totalValue = projects.reduce((sum, p) => sum + p.budget, 0);

  // console.log(`[v0] Column ${column.id} has ${projects.length} projects`)

  return (
    <div ref={setNodeRef} style={style} className="w-52 flex-shrink-0">
      <div
        className={`${column.color} text-white rounded-t-lg px-3 py-2 h-[60px] flex flex-col justify-between`}
        {...attributes}
        {...listeners}
      >
        <div className="flex items-center justify-between mb-0.5">
          <h3 className="font-bold text-xs uppercase tracking-wide cursor-move line-clamp-2">
            {column.label}
          </h3>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="hover:bg-white/20 rounded p-0.5 transition-colors"
            >
              <Settings className="h-3 w-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm("Tem certeza que deseja remover esta coluna?")) {
                  onDelete();
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
          <SortableContext
            items={projects.map((p) => p.id.toString())}
            strategy={verticalListSortingStrategy}
          >
            {projects.length === 0 ? (
              <div className="text-center text-gray-400 text-xs py-4">
                Arraste projetos aqui
              </div>
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
  );
}

function KanbanCard({
  project,
  column,
  onViewProject,
  onEditProject,
}: {
  project: any;
  column: any;
  onViewProject: (project: any) => void;
  onEditProject: (project: any) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: project.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="p-2 hover:shadow-lg transition-all cursor-move bg-white border-l-4"
    >
      <h4 className="font-semibold text-xs mb-1.5 line-clamp-2">
        {project.name}
      </h4>

      <div className="space-y-1 text-[10px] text-gray-600 mb-2">
        <div className="flex items-center gap-1">
          <Building2 className="h-2.5 w-2.5 text-gray-400" />
          <span className="font-medium text-blue-600 truncate">
            {project.client}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <DollarSign className="h-2.5 w-2.5 text-gray-400" />
            <span className="font-semibold">
              R$ {(project.budget / 1000).toFixed(0)}k
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-10 bg-gray-200 rounded-full h-1">
              <div
                className="bg-blue-600 h-1 rounded-full"
                style={{ width: `${project.progress}%` }}
              />
            </div>
            <span className="text-[9px] font-semibold">
              {project.progress}%
            </span>
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
              e.stopPropagation();
              onViewProject(project);
            }}
          >
            <Eye className="h-2.5 w-2.5 text-blue-600" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 hover:bg-purple-50"
            onClick={(e) => {
              e.stopPropagation();
              onEditProject(project);
            }}
          >
            <Edit className="h-2.5 w-2.5 text-purple-600" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PLANEJADOR components
// ─────────────────────────────────────────────────────────────────────────────

const PRIORITY_CFG = {
  low: {
    label: "Baixa",
    dot: "bg-slate-400",
    pill: "bg-slate-100 text-slate-600",
    border: "#94a3b8",
  },
  medium: {
    label: "Média",
    dot: "bg-blue-500",
    pill: "bg-blue-100 text-blue-700",
    border: "#3b82f6",
  },
  high: {
    label: "Alta",
    dot: "bg-amber-500",
    pill: "bg-amber-100 text-amber-700",
    border: "#f59e0b",
  },
  urgent: {
    label: "Urgente",
    dot: "bg-red-500",
    pill: "bg-red-100 text-red-700",
    border: "#ef4444",
  },
};

function PlannerColumn({
  column,
  cards,
  projects,
  onEdit,
  onDelete,
  onAddCard,
  onEditCard,
  onDeleteCard,
}: {
  column: any;
  cards: any[];
  projects: any[];
  onEdit: () => void;
  onDelete: () => void;
  onAddCard: () => void;
  onEditCard: (card: any) => void;
  onDeleteCard: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id });
  const { setNodeRef: setDropRef } = useDroppable({ id: column.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="w-56 flex-shrink-0">
      {/* Column header */}
      <div
        className={`${column.color} text-white rounded-t-lg px-3 py-2 flex items-center justify-between`}
        {...attributes}
        {...listeners}
      >
        <div className="flex items-center gap-1.5 cursor-move min-w-0">
          <h3 className="font-bold text-xs uppercase tracking-wide truncate">
            {column.label}
          </h3>
          <span className="text-[10px] opacity-80 flex-shrink-0">
            ({cards.length})
          </span>
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="hover:bg-white/20 rounded p-0.5 transition-colors"
          >
            <Settings className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="hover:bg-white/20 rounded p-0.5 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Cards drop zone */}
      <div
        ref={setDropRef}
        className="bg-slate-50 rounded-b-lg p-2 min-h-[300px] max-h-[calc(100vh-430px)] overflow-y-auto space-y-1.5"
      >
        <SortableContext
          items={cards.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {cards.length === 0 ? (
            <div className="text-center text-slate-400 text-xs py-6">
              Arraste cartões aqui
            </div>
          ) : (
            cards.map((card) => (
              <PlannerCard
                key={card.id}
                card={card}
                projects={projects}
                onEdit={() => onEditCard(card)}
                onDelete={() => onDeleteCard(card.id)}
              />
            ))
          )}
        </SortableContext>

        {/* Inline add button */}
        <button
          onClick={onAddCard}
          className="w-full mt-1 text-[11px] text-slate-400 hover:text-slate-700 hover:bg-slate-200 flex items-center gap-1 rounded-md px-2 py-1.5 transition-colors"
        >
          <Plus className="h-3 w-3" /> Adicionar cartão
        </button>
      </div>
    </div>
  );
}

function PlannerCard({
  card,
  projects,
  onEdit,
  onDelete,
}: {
  card: any;
  projects: any[];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });
  const cfg =
    PRIORITY_CFG[card.priority as keyof typeof PRIORITY_CFG] ??
    PRIORITY_CFG.medium;
  const linkedProject = card.projectId
    ? projects.find((p) => p.id === card.projectId)
    : null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = card.dueDate ? new Date(card.dueDate) : null;
  const isOverdue = due && due < today;

  const cardStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    borderLeftColor: cfg.border,
  };

  return (
    <Card
      ref={setNodeRef}
      style={cardStyle}
      {...attributes}
      {...listeners}
      className="p-2 bg-white hover:shadow-md transition-all cursor-move border-l-[3px] group"
    >
      {/* Priority + delete */}
      <div className="flex items-start justify-between gap-1 mb-1">
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${cfg.pill}`}
        >
          {cfg.label}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="opacity-0 group-hover:opacity-100 h-4 w-4 flex items-center justify-center rounded hover:bg-red-100 text-slate-300 hover:text-red-500 transition-all flex-shrink-0"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      </div>

      {/* Title */}
      <h4
        className="text-[11px] font-semibold text-slate-800 leading-tight mb-1.5 line-clamp-2 cursor-pointer hover:text-blue-600 transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
      >
        {card.title}
      </h4>

      {/* Description preview */}
      {card.description && (
        <p className="text-[10px] text-slate-400 mb-1.5 line-clamp-1">
          {card.description}
        </p>
      )}

      {/* Footer: due date + project link */}
      <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100">
        {due ? (
          <span
            className={`flex items-center gap-0.5 text-[10px] font-medium ${isOverdue ? "text-red-500" : "text-slate-500"}`}
          >
            <Calendar className="h-2.5 w-2.5" />
            {due.toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "short",
            })}
          </span>
        ) : (
          <span />
        )}
        {linkedProject && (
          <span
            className="text-[10px] text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded truncate max-w-[90px]"
            title={linkedProject.name}
          >
            {linkedProject.name}
          </span>
        )}
      </div>
    </Card>
  );
}
