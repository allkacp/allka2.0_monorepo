// @ts-nocheck
import { CopyLinkButton } from "@/components/copy-link-button";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Label } from "@/components/ui/label";
import React from "react";
import { useToast } from "@/components/ui/use-toast";
import { createPortal } from "react-dom";
import { useState, useRef } from "react";
import { useItemsPerPage } from "@/lib/use-items-per-page";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
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
  ShieldCheck,
  KeyRound,
  RefreshCw,
  Play,
  Pause,
  Lock,
  ArrowRight,
  History,
  ScrollText,
  ChevronLeft,
  ChevronRight,
  Search,
  ChevronDown,
  FolderOpen,
} from "lucide-react";
import { ModalBrandHeader } from "@/components/ui/modal-brand-header";
import { useSidebar } from "@/contexts/sidebar-context";
import { useAccountType } from "@/contexts/account-type-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { apiClient } from "@/lib/api-client";
import { TarefaDetailDrawer } from "@/components/tarefa-detail-drawer";
import { TaskLaunchDrawer } from "@/components/task-launch-drawer";
import {
  buildProposalData,
  exportProposalPDF,
  processCustomDocx,
  customDocxToPDF,
  generateTemplateModel,
  parseBrandGradient,
  downloadBlob,
  PROPOSAL_PLACEHOLDERS,
  PROPOSAL_LOOP_PLACEHOLDERS,
} from "@/lib/proposal-export";

interface Project {
  id: number;
  name: string;
  client: string;
  company: string;
  type: string;
  status: string;
  progress: number;
  budget: number;
  spent: number;
  startDate: string;
  deadline: string;
  team: number;
  nomades: string[];
}

interface ProjectManagementModalProps {
  project: Project | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "view" | "edit" | "create";
  /** Tab to open when the modal mounts/opens. Defaults to "dashboard" */
  initialTab?: string;
  onEdit?: () => void;
  onClone?: () => void;
  onExport?: () => void;
  onSave?: (project: any) => void;
  onCancel?: () => void;
  /** Called when user clicks "Continuar Projeto" inside a locked tab (draft) */
  onContinueDraft?: () => void;
  /** Called when user clicks "Ir para Pagamento" inside a locked tab (awaiting-payment) */
  onGoToPayment?: () => void;
}

const STATUS_LABEL_MAP: Record<string, { label: string; cls: string }> = {
  "awaiting-payment": {
    label: "Ag. Pagamento",
    cls: "bg-amber-500 text-white",
  },
  "in-progress": { label: "Em Andamento", cls: "bg-blue-500 text-white" },
  completed: { label: "Concluído", cls: "bg-emerald-500 text-white" },
  negotiation: { label: "Negociação", cls: "bg-slate-500 text-white" },
  draft: { label: "Rascunho", cls: "bg-slate-400 text-white" },
  planning: { label: "Planejamento", cls: "bg-orange-500 text-white" },
  paused: { label: "Pausado", cls: "bg-slate-400 text-white" },
  cancelled: { label: "Cancelado", cls: "bg-red-500 text-white" },
  canceled: { label: "Cancelado", cls: "bg-red-500 text-white" },
  active: { label: "Ativo", cls: "bg-emerald-500 text-white" },
  overdue: { label: "Atrasado", cls: "bg-red-400 text-white" },
};

function getProjectStatusBadge(status: string) {
  const entry = STATUS_LABEL_MAP[status] ?? {
    label: status,
    cls: "bg-slate-300 text-slate-700",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold border-0 ${entry.cls}`}
    >
      {entry.label}
    </span>
  );
}

export function ProjectManagementModal({
  project,
  open,
  onOpenChange,
  mode,
  initialTab,
  onEdit,
  onClone,
  onExport,
  onSave,
  onCancel,
  onContinueDraft,
  onGoToPayment,
}: ProjectManagementModalProps) {
  const { toast } = useToast();
  const { sidebarWidth, sidebarSettings, agencyProfile } = useSidebar();
  const { accountType } = useAccountType();
  const canSeeNomadNames = accountType === "admin";

  // Avatar / crop state
  const [avatar, setAvatar] = useState<string | null>(null);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [originalRawSrc, setOriginalRawSrc] = useState<string | null>(null);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [isDraggingCrop, setIsDraggingCrop] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const cropImgRef = React.useRef<HTMLImageElement>(null);
  const CROP_SIZE = 192;

  const handleAvatarClick = () => {
    if (avatar) {
      setShowAvatarMenu((p) => !p);
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleCropConfirm = () => {
    const img = cropImgRef.current;
    if (!img) return;
    const canvas = document.createElement("canvas");
    canvas.width = CROP_SIZE;
    canvas.height = CROP_SIZE;
    const ctx = canvas.getContext("2d")!;
    ctx.beginPath();
    ctx.arc(CROP_SIZE / 2, CROP_SIZE / 2, CROP_SIZE / 2, 0, Math.PI * 2);
    ctx.clip();
    const fitScale = Math.min(
      CROP_SIZE / img.naturalWidth,
      CROP_SIZE / img.naturalHeight,
    );
    const drawW = img.naturalWidth * fitScale * cropZoom;
    const drawH = img.naturalHeight * fitScale * cropZoom;
    const dx = CROP_SIZE / 2 + cropOffset.x - drawW / 2;
    const dy = CROP_SIZE / 2 + cropOffset.y - drawH / 2;
    ctx.drawImage(img, dx, dy, drawW, drawH);
    setAvatar(canvas.toDataURL("image/jpeg", 0.92));
    setCropOpen(false);
    setRawImageSrc(null);
  };

  const [selectedFile, setSelectedFile] = useState<any>(null);

  // Header color / theme
  const [headerBg, setHeaderBg] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [customHeaderColor, setCustomHeaderColor] = useState("#1e293b");

  const HEADER_PRESETS = [
    {
      label: "Padrão",
      value: null,
      preview: "linear-gradient(135deg,#000 0%,#1a2a6f 45%,#c81a7f 100%)",
    },
    {
      label: "Azul",
      value: "#1e3a8a",
      preview: "linear-gradient(135deg,#1e3a8a 0%,#2563eb 100%)",
    },
    {
      label: "Roxo",
      value: "#6d28d9",
      preview: "linear-gradient(135deg,#6d28d9 0%,#a855f7 100%)",
    },
  ];

  // Dados do Projeto tab
  const [dadosProjOpenAccordions, setDadosProjOpenAccordions] = useState<
    string[]
  >(["info"]);
  const [isDadosProjEditMode, setIsDadosProjEditMode] = useState(false);
  const [isSavingDados, setIsSavingDados] = useState(false);
  const [showDadosProjSaveConfirm, setShowDadosProjSaveConfirm] =
    useState(false);
  const [showDadosProjCancelConfirm, setShowDadosProjCancelConfirm] =
    useState(false);
  const [dadosProjForm, setDadosProjForm] = useState({
    nomeProjeto: project?.name || "Novo Projeto",
    situacao: project?.status || "Ag. Pagamento",
    agencia: project?.agency || "Lamego Academy",
    consultor: project?.consultant || "Equipe Lamego",
    emailConsultor: project?.consultantEmail || "contato@lamego.com.vc",
    cliente: project?.client || "Florescer",
    dataCriacao: project?.createdDate || project?.created_at || "19/02/2025",
    permitePortfolio: project?.portfolioPermission ?? false,
    sincronizadoBitrix: project?.bitrixSync ?? false,
    lifecycle: (project?.lifecycle === "mensal" ? "Mensal" : "Avulso") as
      | "Avulso"
      | "Mensal",
    isAtivo: project?.isActive ?? true,
    diaCobranca: project?.billingConfig?.billingDay ?? 15,
    dataInicioCobranca: project?.billingConfig?.billingStartDate ?? "",
    descricao:
      project?.description ||
      "Projeto de hospedagem e cuidados para idosos da empresa Florescer. Inclui desenvolvimento de website institucional, sistema de gestão de pacientes, e materiais de marketing digital para divulgação dos serviços.",
  });

  const DADOS_PROJECT_ACCORDIONS = [
    "info",
    "descricao",
    ...(dadosProjForm.lifecycle === "Mensal" ? ["ciclo"] : []),
  ];

  // ── Proposal export state ──────────────────────────────────────────────────
  const [showCustomDocDialog, setShowCustomDocDialog] = useState(false);
  const [customDocFile, setCustomDocFile] = useState<File | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [customDocDragOver, setCustomDocDragOver] = useState(false);

  // Gate tabs for projects that haven't been paid yet
  const isUnpaid =
    project?.status === "draft" || project?.status === "awaiting-payment";
  React.useEffect(() => {
    if (project) {
      setDadosProjForm({
        nomeProjeto: project.name || "Novo Projeto",
        situacao: project.status || "Ag. Pagamento",
        agencia: project.agency || "Lamego Academy",
        consultor: project.consultant || "Equipe Lamego",
        emailConsultor: project.consultantEmail || "contato@lamego.com.vc",
        cliente: project.client || "Florescer",
        dataCriacao: project.createdDate || project.created_at || "19/02/2025",
        permitePortfolio: project.portfolioPermission ?? false,
        sincronizadoBitrix: project.bitrixSync ?? false,
        lifecycle: (project.lifecycle === "mensal" ? "Mensal" : "Avulso") as
          | "Avulso"
          | "Mensal",
        isAtivo: project.isActive ?? true,
        diaCobranca: project.billingConfig?.billingDay ?? 15,
        dataInicioCobranca: project.billingConfig?.billingStartDate ?? "",
        descricao: project.description || "",
      });
    }
  }, [project?.id]);

  // ── Fetch products + tasks from the API ────────────────────────────────────
  const fetchModalData = React.useCallback(async () => {
    if (!project?.id) return;
    setLoadingModalData(true);
    try {
      const res = await apiClient.getProjectProducts({
        project_id: String(project.id),
      });
      const items: any[] = res?.data ?? [];
      const paymentsRes = await apiClient.getPayments({
        project_id: String(project.id),
      });
      const paymentRows: any[] = Array.isArray(paymentsRes?.data)
        ? paymentsRes.data
        : [];

      const statusMap: Record<string, string> = {
        PARA_LANCAMENTO: "Para lançamento",
        EM_LANCAMENTO: "Para lançamento",
        AGUARDANDO_INFORMACOES: "Para lançamento",
        LIBERADA_PARA_EXECUCAO: "Em Execução",
        EM_EXECUCAO: "Contratado/Pago",
        AGUARDANDO_APROVACAO: "Para Aprovação",
        CONCLUIDA: "Aprovada",
        ENTREGUE: "Entregue",
        CANCELADA: "Atrasada",
      };

      const fmtDate = (iso: string | null | undefined, fallback = "—") => {
        if (!iso) return fallback;
        const d = new Date(iso);
        return isNaN(d.getTime()) ? fallback : d.toLocaleDateString("pt-BR");
      };

      let tarefaCounter = 0;
      const produtos = items.map((pp: any, idx: number) => {
        const tasks: any[] = pp.tasks ?? [];

        // ── Per-status counters (tasks only, never stages) ──────────────────
        const paraLancamento = tasks.filter((t: any) =>
          [
            "PARA_LANCAMENTO",
            "EM_LANCAMENTO",
            "AGUARDANDO_INFORMACOES",
          ].includes(t.status),
        ).length;
        const emExecucao = tasks.filter((t: any) =>
          ["LIBERADA_PARA_EXECUCAO", "EM_EXECUCAO", "EM_REVISAO"].includes(
            t.status,
          ),
        ).length;
        const paraAprovacao = tasks.filter((t: any) =>
          ["EM_APROVACAO", "AGUARDANDO_APROVACAO"].includes(t.status),
        ).length;
        const concluidas = tasks.filter(
          (t: any) => t.status === "CONCLUIDA" || t.status === "ENTREGUE",
        ).length;
        const totais = tasks.length;
        // Expected = number of active catalog task models linked to this product
        const esperadas = pp.product?.task_links?.length ?? 0;

        const progresso =
          totais > 0 ? Math.round((concluidas / totais) * 100) : 0;

        let status = "Para lançamento";
        if (
          tasks.some(
            (t: any) =>
              t.status === "EM_EXECUCAO" ||
              t.status === "LIBERADA_PARA_EXECUCAO",
          )
        )
          status = "Em Execução";
        else if (concluidas === totais && totais > 0) status = "Aprovada";
        else if (tasks.some((t: any) => t.status === "ENTREGUE"))
          status = "Entregue";
        else if (tasks.some((t: any) => t.status === "AGUARDANDO_APROVACAO"))
          status = "Para Aprovação";

        return {
          id: idx + 1,
          nome: pp.product?.name ?? "—",
          tipo: pp.product?.category ?? "—",
          progresso,
          status,
          dataContratacao: fmtDate(pp.created_at, "01/01/2000"),
          dataEntrega: fmtDate(pp.due_date),
          tarefasConcluidas: concluidas,
          tarefasTotais: totais,
          tarefasParaLancamento: paraLancamento,
          tarefasEmExecucao: emExecucao,
          tarefasParaAprovacao: paraAprovacao,
          tarefasEsperadas: esperadas,
          tarefas: tasks.map((t: any, tidx: number) => {
            tarefaCounter++;
            const mappedStatus = statusMap[t.status] ?? t.status;
            // For PARA_LANCAMENTO tasks, use lancamento_expires_at as the deadline
            const prazoDate =
              t.status === "PARA_LANCAMENTO" && t.lancamento_expires_at
                ? t.lancamento_expires_at
                : t.due_date;
            return {
              id: tidx + 1,
              taskDbId: t.id,
              // Use task_code from DB (globally unique, set at creation).
              // Fall back to sequential counter only if the API returns no code (legacy data).
              tarefaCode:
                t.task_code ?? "T" + String(tarefaCounter).padStart(6, "0"),
              nome: t.title ?? "—",
              status: mappedStatus,
              prazo: fmtDate(prazoDate),
              lancamentoExpiresAt: t.lancamento_expires_at ?? null,
              executor: "",
              lider: "",
              rawStatus: t.status,
              etapas: (t.stages ?? []).map((s: any) => ({
                id: s.id,
                titulo: s.titulo,
                descricao: s.descricao ?? "",
                ordem: s.ordem,
                status: s.status,
                dependeAnterior: s.depende_da_etapa_anterior ?? false,
              })),
            };
          }),
        };
      });

      setMockData((prev: any) => ({ ...prev, produtos }));
      setMockInvoices(
        paymentRows.map((payment: any, index: number) => ({
          id: payment.id || String(index + 1),
          status: payment.status || "PAGO",
          month: payment.paid_at
            ? new Date(payment.paid_at).toLocaleDateString("pt-BR", {
                month: "long",
                year: "numeric",
              })
            : "—",
          descricao: payment.notes || "Pagamento do projeto",
          valor: Number(payment.amount ?? 0),
          valorOriginal: Number(payment.amount ?? 0),
          desconto: 0,
          descontoPercentual: 0,
          agencia: project.agency || "—",
          agenciaId: project.agency_id || null,
          cliente: project.client?.name || project.client || "—",
          clienteId: project.client_id || null,
          formaPagamento: payment.payment_method || "CARTAO_TESTE",
          competencia: payment.paid_at
            ? new Date(payment.paid_at).toLocaleDateString("pt-BR", {
                month: "2-digit",
                year: "numeric",
              })
            : "—",
          dataCobran: payment.paid_at || null,
          dataPagamento: payment.paid_at || null,
          produtos: [],
        })),
      );
    } catch (err) {
      console.error("[ProjectManagementModal] fetchModalData error:", err);
      setMockInvoices([]);
    } finally {
      setLoadingModalData(false);
    }
  }, [project?.id]);

  React.useEffect(() => {
    if (open && project?.id) fetchModalData();
    if (!open)
      setMockData({ produtos: [], tarefas: [], timeline: [], kanban: {} });
    if (!open) { setMockInvoices([]); setBillingPayments([]); setBillingSummary(null); }
    if (!open) setProjectFilesData(null);
    if (!open) { setMockCredentials([]); setCredentialsSummary(null); }
    if (!open) setDashboardData(null);
  }, [open, project?.id]);

  const handleDadosProjSave = async () => {
    setIsSavingDados(true);
    await new Promise((r) => setTimeout(r, 800));
    setIsSavingDados(false);
    setIsDadosProjEditMode(false);
    setShowDadosProjSaveConfirm(false);
  };
  const [productSortBy, setProductSortBy] = useState<string>("nome");
  const [productSortOrder, setProductSortOrder] = useState<"asc" | "desc">(
    "asc",
  );
  const [productStatusFilter, setProductStatusFilter] = useState<string>("all");
  const [productTypeFilter, setProductTypeFilter] = useState<string>("all");
  const [productPercentageFilter, setProductPercentageFilter] =
    useState<string>("all");
  const [showProductFilters, setShowProductFilters] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [showProductTasksModal, setShowProductTasksModal] = useState(false);

  const [approvedFileTypeFilter, setApprovedFileTypeFilter] = useState("all");
  const [approvedFileSortOrder, setApprovedFileSortOrder] = useState("recent");
  const [showAddFileDialog, setShowAddFileDialog] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const projectFileInputRef = React.useRef<HTMLInputElement>(null);
  const [selectedProjectFile, setSelectedProjectFile] = useState<File | null>(null);
  const [activeFileTab, setActiveFileTab] = useState<"iniciais" | "aprovados">(
    "iniciais",
  );
  const [newFileName, setNewFileName] = useState("");
  const [editedProject, setEditedProject] = useState<Partial<Project> | null>(
    null,
  );
  const [editedProducts, setEditedProducts] = useState<any[]>([]);

  // Initialize edited data when switching to edit mode
  React.useEffect(() => {
    if (mode === "edit" && project) {
      setEditedProject({ ...project });
      setEditedProducts(project.products || []);
      setIsDadosProjEditMode(true);
    }
  }, [mode, project]);
  const [showEditCredentialDialog, setShowEditCredentialDialog] =
    useState(false);
  const [showDeleteCredentialDialog, setShowDeleteCredentialDialog] =
    useState(false);
  const [editingCredential, setEditingCredential] = useState<any>(null);
  const [fileSortOrder, setFileSortOrder] = useState<
    "recent" | "oldest" | "name" | "size"
  >("recent"); // Added fileSortOrder

  const [editPasswordVisible, setEditPasswordVisible] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");

  // Added state for new user access form
  const [newAccessUser, setNewAccessUser] = useState("select-user");
  const [newAccessPermission, setNewAccessPermission] = useState("view");
  const [newAccessExpiration, setNewAccessExpiration] = useState("");
  const [hasExpiration, setHasExpiration] = useState(true);

  // Added state for share credential sheet
  const [showShareCredential, setShowShareCredential] = useState(false);
  const [showAddCredentialDialog, setShowAddCredentialDialog] = useState(false);
  const [newCredentialForm, setNewCredentialForm] = useState({
    title: "",
    url: "",
    username: "",
    password: "",
    confirmPassword: "",
    category: "Website",
  });
  const [newCredentialPasswordVisible, setNewCredentialPasswordVisible] =
    useState(false);
  const [newCredentialConfirmVisible, setNewCredentialConfirmVisible] =
    useState(false);

  const [taskStatusFilter, setTaskStatusFilter] = useState<string>("all");
  const [taskProductFilter, setTaskProductFilter] = useState<string>("all");
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());
  const [taskDrawerOpen, setTaskDrawerOpen] = useState(false);
  const [taskDrawerTask, setTaskDrawerTask] = useState<any>(null);
  const [launchDrawerOpen, setLaunchDrawerOpen] = useState(false);
  const [launchDrawerTask, setLaunchDrawerTask] = useState<any>(null);
  const [taskDateFilter, setTaskDateFilter] = useState<string>("");
  const [taskSortBy, setTaskSortBy] = useState<string>("produto");
  const [taskSortOrder, setTaskSortOrder] = useState<"asc" | "desc">("asc");
  const [showTaskFilters, setShowTaskFilters] = useState(false);
  const [tasksViewMode, setTasksViewMode] = useState<"list" | "kanban">("list");

  const [tasksCurrentPage, setTasksCurrentPage] = useState(1);
  const [tasksPerPage, setTasksPerPage] = useItemsPerPage("pm-modal-tasks", 10);
  const [taskSearchTerm, setTaskSearchTerm] = useState("");
  // Removed duplicate: const [showProductFilters, setShowProductFilters] = useState(false)

  // Product tasks modal filters
  const [productTaskSearchTerm, setProductTaskSearchTerm] = useState("");
  const [productTaskSortBy, setProductTaskSortBy] = useState("nome");
  const [productTaskSortOrder, setProductTaskSortOrder] = useState<
    "asc" | "desc"
  >("asc");
  const [productTaskShowFilters, setProductTaskShowFilters] = useState(false);
  const [productTaskViewMode, setProductTaskViewMode] = useState<
    "list" | "kanban"
  >("list");
  const [productTaskCurrentPage, setProductTaskCurrentPage] = useState(1);
  const [productTaskPerPage, setProductTaskPerPage] = useItemsPerPage("pm-modal-product-tasks", 10);

  // Credentials state — lazy loaded on "cofre" tab
  const [mockCredentials, setMockCredentials] = useState<any[]>([]);
  const [credentialsLoading, setCredentialsLoading] = useState(false);
  const [credentialsSummary, setCredentialsSummary] = useState<any>(null);

  // Controlled active tab — resets to initialTab when modal opens
  const [activeModalTab, setActiveModalTab] = useState(
    initialTab ?? "dashboard",
  );
  React.useEffect(() => {
    if (open) setActiveModalTab(initialTab ?? "dashboard");
  }, [open, project?.id, initialTab]);

  // Project log state
  const [logEntries, setLogEntries] = useState<any[]>([]);
  const [logLoading, setLogLoading] = useState(false);
  React.useEffect(() => {
    if (activeModalTab === "log" && project?.id) {
      setLogLoading(true);
      apiClient
        .getProjectLog(project.id)
        .then((res: any) =>
          setLogEntries(Array.isArray(res?.data) ? res.data : []),
        )
        .catch(() => setLogEntries([]))
        .finally(() => setLogLoading(false));
    }
  }, [activeModalTab, project?.id]);

  // Project files state
  const [projectFilesData, setProjectFilesData] = useState<any>(null);
  const [projectFilesLoading, setProjectFilesLoading] = useState(false);
  React.useEffect(() => {
    if (activeModalTab === "arquivos" && project?.id) {
      setProjectFilesLoading(true);
      setProjectFilesData(null);
      apiClient
        .getProjectFiles(String(project.id))
        .then((res: any) => setProjectFilesData(res ?? {}))
        .catch(() => setProjectFilesData({ _error: true }))
        .finally(() => setProjectFilesLoading(false));
    }
  }, [activeModalTab, project?.id]);

  // Project dashboard lazy load
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  React.useEffect(() => {
    if (activeModalTab === "dashboard" && project?.id) {
      setDashboardData(null);
      setDashboardLoading(true);
      apiClient
        .getProjectDashboard(String(project.id))
        .then((res: any) => setDashboardData(res ?? null))
        .catch(() => setDashboardData(null))
        .finally(() => setDashboardLoading(false));
    }
  }, [activeModalTab, project?.id]);

  // Project billing lazy load
  React.useEffect(() => {
    if (activeModalTab === "faturamento" && project?.id) {
      setBillingLoading(true);
      apiClient
        .getProjectBilling(String(project.id))
        .then((res: any) => {
          setMockInvoices(Array.isArray(res?.invoices) ? res.invoices : []);
          setBillingPayments(Array.isArray(res?.payments) ? res.payments : []);
          setBillingSummary(res?.summary ?? null);
        })
        .catch(() => {
          setMockInvoices([]);
          setBillingPayments([]);
          setBillingSummary(null);
        })
        .finally(() => setBillingLoading(false));
    }
  }, [activeModalTab, project?.id]);

  // Project credentials lazy load
  React.useEffect(() => {
    if (activeModalTab === "cofre" && project?.id) {
      setCredentialsLoading(true);
      apiClient
        .getProjectCredentials(String(project.id))
        .then((res: any) => {
          setMockCredentials(Array.isArray(res?.credentials) ? res.credentials : []);
          setCredentialsSummary(res?.summary ?? null);
        })
        .catch(() => {
          setMockCredentials([]);
          setCredentialsSummary(null);
        })
        .finally(() => setCredentialsLoading(false));
    }
  }, [activeModalTab, project?.id]);

  const isReadOnly = mode === "view";

  const [mockData, setMockData] = useState<any>({
    produtos: [],
    tarefas: [],
    timeline: [],
    kanban: {},
  });
  const [loadingModalData, setLoadingModalData] = useState(false);

  const [selectedCredential, setSelectedCredential] = useState<any>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<{
    [key: number]: boolean;
  }>({});

  const [defaultPaymentMethod, setDefaultPaymentMethod] =
    useState<string>("carteira");
  const [savedCards, setSavedCards] = useState<any[]>([]);
  const [walletBalance] = useState(0);
  const [allkoinBalance] = useState(0);
  const [allkoinExchangeRate] = useState(1.0);
  const [showInvoiceDetails, setShowInvoiceDetails] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [showReativarDialog, setShowReativarDialog] = useState(false);
  const [showAvulsoReativarAlert, setShowAvulsoReativarAlert] = useState(false);

  const [mockInvoices, setMockInvoices] = useState<any[]>([]);
  const [billingPayments, setBillingPayments] = useState<any[]>([]);
  const [billingSummary, setBillingSummary] = useState<any>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [faturamentoSubTab, setFaturamentoSubTab] = useState<
    "faturas" | "formas-pagamento"
  >("faturas");

  const handleDownloadInvoicePDF = (invoice: any) => {
    toast({
      title: "Download iniciado",
      description: `Gerando PDF da fatura ${invoice.month}...`,
    });
    // In a real app, this would generate and download a PDF
  };

  const togglePasswordVisibility = (id: number) => {
    setVisiblePasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string, label = "Item") => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: `${label} copiado para a área de transferência.`,
      duration: 2000,
    });
  };

  const getProgressColor = (progress: number) => {
    if (progress === 100) return "bg-gradient-to-r from-blue-400 to-blue-500";
    if (progress >= 75) return "bg-gradient-to-r from-emerald-400 to-green-500";
    if (progress >= 50) return "bg-gradient-to-r from-teal-400 to-emerald-400";
    if (progress >= 25) return "bg-gradient-to-r from-amber-400 to-yellow-400";
    if (progress === 0) return "bg-slate-200";
    return "bg-gradient-to-r from-orange-400 to-amber-400";
  };

  const getProgressTextColor = (progress: number) => {
    if (progress === 100) return "text-blue-700";
    if (progress >= 75) return "text-emerald-700";
    if (progress >= 50) return "text-teal-700";
    if (progress >= 25) return "text-amber-700";
    if (progress === 0) return "text-slate-400";
    return "text-orange-700";
  };

  const getProgressBgColor = (progress: number) => {
    if (progress >= 70) return "bg-gradient-to-r from-green-50 to-emerald-50";
    if (progress >= 30) return "bg-gradient-to-r from-yellow-50 to-amber-50";
    return "bg-gradient-to-r from-orange-50 to-red-50";
  };

  const fontSizeClasses = {
    sm: "text-xs",
    base: "text-sm",
    lg: "text-base",
  };

  const getFaviconUrl = (url: string) => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    } catch {
      return null;
    }
  };

  const getInitials = (title: string) => {
    return title.substring(0, 2).toUpperCase();
  };

  const handleDeleteCredential = (credentialId: string) => {
    if (!project?.id) return;
    apiClient
      .deleteProjectCredential(String(project.id), credentialId)
      .then(() => {
        setMockCredentials((prev) => prev.filter((c) => c.id !== credentialId));
        setShowDeleteCredentialDialog(false);
        toast({ title: "Credencial arquivada", description: "Credencial movida para o histórico." });
      })
      .catch(() => toast({ title: "Erro", description: "Não foi possível excluir a credencial.", variant: "destructive" }));
  };

  const handleEditCredential = (credential: any) => {
    setEditingCredential({ ...credential, password: credential.password_demo ?? "" });
    setShowEditCredentialDialog(true);
  };

  const handleSaveCredential = () => {
    if (!project?.id || !editingCredential) return;
    const payload: Record<string, any> = {
      title: editingCredential.title,
      url: editingCredential.url,
      username: editingCredential.username,
      category: editingCredential.category,
      notes: editingCredential.notes,
    };
    if (editingCredential.password) payload.password_demo = editingCredential.password;
    apiClient
      .updateProjectCredential(String(project.id), editingCredential.id, payload)
      .then((updated: any) => {
        setMockCredentials((prev) =>
          prev.map((c) => (c.id === editingCredential.id ? { ...c, ...updated } : c)),
        );
        setShowEditCredentialDialog(false);
        setEditPasswordVisible(false);
        setConfirmPassword("");
        toast({ title: "Credencial atualizada" });
      })
      .catch(() => toast({ title: "Erro", description: "Não foi possível salvar as alterações.", variant: "destructive" }));
  };

  const handleAddFile = () => {
    if (!selectedProjectFile && !newFileName.trim()) return;
    // TODO: Implement actual upload to backend
    toast({ title: "Arquivo adicionado", description: selectedProjectFile?.name ?? newFileName });
    setNewFileName("");
    setSelectedProjectFile(null);
    setShowAddFileDialog(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      setRawImageSrc(src);
      setOriginalRawSrc(src);
      setCropZoom(1);
      setCropOffset({ x: 0, y: 0 });
      setCropOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleAddUserAccess = () => {
    if (newAccessUser === "select-user" || !selectedCredential) {
      toast({
        title: "Erro",
        description: "Por favor, selecione um usuário.",
        variant: "destructive",
      });
      return;
    }

    if (hasExpiration && !newAccessExpiration) {
      toast({
        title: "Erro",
        description:
          "Por favor, defina uma data de expiração ou desmarque a opção.",
        variant: "destructive",
      });
      return;
    }

    const userNames: Record<string, string> = {
      joao: "João Silva",
      maria: "Maria Santos",
      carlos: "Carlos Lima",
      fernanda: "Fernanda Dias",
      beatriz: "Beatriz Souza",
      ricardo: "Ricardo Alves",
    };

    const userName = userNames[newAccessUser];

    const alreadyHasAccess = selectedCredential.sharedWith.some(
      (user: any) => (typeof user === "string" ? user : user.name) === userName,
    );

    if (alreadyHasAccess) {
      toast({
        title: "Aviso",
        description: `${userName} já possui acesso a esta credencial.`,
        variant: "destructive",
      });
      return;
    }

    const expirationDate =
      hasExpiration && newAccessExpiration ? newAccessExpiration : null;

    const updatedSharedWith = [
      ...selectedCredential.sharedWith,
      {
        name: userName,
        permission: newAccessPermission,
        expiresAt: expirationDate,
      },
    ];

    setSelectedCredential({
      ...selectedCredential,
      sharedWith: updatedSharedWith,
    });

    setMockCredentials((prev: any[]) =>
      prev.map((cred: any) =>
        cred.id === selectedCredential.id
          ? { ...cred, sharedWith: updatedSharedWith }
          : cred,
      ),
    );

    // Reset form
    setNewAccessUser("select-user");
    setNewAccessPermission("view");
    setNewAccessExpiration("");
    setHasExpiration(true);

    toast({
      title: "✓ Compartilhado!",
      description: expirationDate
        ? `${userName} agora tem acesso até ${new Date(expirationDate).toLocaleDateString("pt-BR")}.`
        : `${userName} agora tem acesso permanente a esta credencial.`,
    });
  };

  const getSortedAndFilteredProducts = () => {
    let filtered = [...mockData.produtos];

    // Filter by percentage
    if (productPercentageFilter === "0-25") {
      filtered = filtered.filter((p) => p.progresso >= 0 && p.progresso < 25);
    } else if (productPercentageFilter === "25-50") {
      filtered = filtered.filter((p) => p.progresso >= 25 && p.progresso < 50);
    } else if (productPercentageFilter === "50-75") {
      filtered = filtered.filter((p) => p.progresso >= 50 && p.progresso < 75);
    } else if (productPercentageFilter === "75-100") {
      filtered = filtered.filter(
        (p) => p.progresso >= 75 && p.progresso <= 100,
      );
    } else if (productPercentageFilter === "concluido") {
      filtered = filtered.filter((p) => p.progresso === 100);
    }

    // Filter by status
    if (productStatusFilter !== "all") {
      filtered = filtered.filter((p) => p.status === productStatusFilter);
    }

    // Filter by type
    if (productTypeFilter !== "all") {
      filtered = filtered.filter((p) => p.tipo === productTypeFilter);
    }

    filtered.sort((a, b) => {
      let comparison = 0;
      if (productSortBy === "nome") {
        comparison = a.nome.localeCompare(b.nome);
      } else if (productSortBy === "progresso") {
        comparison = a.progresso - b.progresso;
      } else if (productSortBy === "dataContratacao") {
        comparison =
          new Date(a.dataContratacao.split("/").reverse().join("-")).getTime() -
          new Date(b.dataContratacao.split("/").reverse().join("-")).getTime();
      } else if (productSortBy === "dataEntrega") {
        comparison =
          new Date(a.dataEntrega.split("/").reverse().join("-")).getTime() -
          new Date(b.dataEntrega.split("/").reverse().join("-")).getTime();
      }
      return productSortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  };

  const toggleSortOrder = () => {
    setProductSortOrder(productSortOrder === "asc" ? "desc" : "asc");
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "Para lançamento":
        return "bg-orange-100 text-orange-700 border-orange-200";
      case "Aprovada":
        return "bg-green-100 text-green-700 border-green-200";
      case "Em Execução":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "Para Aprovação":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "Entregue":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "Atrasada":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getStatusBorderColor = (status: string) => {
    switch (status) {
      case "Para lançamento":
        return "#f97316";
      case "Aprovada":
        return "#10b981";
      case "Em Execução":
        return "#3b82f6";
      case "Para Aprovação":
        return "#f59e0b";
      case "Entregue":
        return "#a855f7";
      case "Atrasada":
        return "#ef4444";
      default:
        return "#9ca3af";
    }
  };

  const getStatusDotClass = (status: string) => {
    switch (status) {
      case "Para lançamento":
        return "bg-orange-400";
      case "Aprovada":
        return "bg-emerald-500";
      case "Em Execução":
        return "bg-blue-500";
      case "Para Aprovação":
        return "bg-amber-400";
      case "Entregue":
        return "bg-purple-500";
      case "Atrasada":
        return "bg-red-500 animate-pulse";
      default:
        return "bg-slate-400";
    }
  };

  const getHeaderStyle = () => {
    if (!headerBg) return undefined;
    return { background: headerBg };
  };

  const openTaskDrawer = (tarefa: any) => {
    // Build minimal object matching TarefaDetailDrawer's expected shape.
    // The component self-fetches stages/briefing/attachments via tarefa.id.
    setTaskDrawerTask({
      id: tarefa.taskDbId,
      title: tarefa.nome,
      code_snapshot: tarefa.tarefaCode,
      task_code: tarefa.tarefaCode,
      status: tarefa.rawStatus ?? "PARA_LANCAMENTO",
      priority: tarefa.priority ?? "medium",
      due_date: null,
      lancamento_expires_at: tarefa.lancamentoExpiresAt ?? null,
      project: project
        ? {
            id: String(project.id),
            title: project.name,
            client: { name: project.client },
          }
        : null,
      project_product: { product_name_snapshot: tarefa.produtoNome },
    });
    setTaskDrawerOpen(true);
  };

  const openLaunchDrawer = (tarefa: any) => {
    // Open the TaskLaunchDrawer for tasks in PARA_LANCAMENTO or EM_LANCAMENTO
    setLaunchDrawerTask({
      id: tarefa.taskDbId,
      title: tarefa.nome,
      code_snapshot: tarefa.tarefaCode,
      task_code: tarefa.tarefaCode,
      status: tarefa.rawStatus ?? "PARA_LANCAMENTO",
      priority: tarefa.priority ?? "medium",
      due_date: null,
      lancamento_expires_at: tarefa.lancamentoExpiresAt ?? null,
      project: project
        ? {
            id: String(project.id),
            title: project.name,
            client: { name: project.client },
          }
        : null,
      project_product: { product_name_snapshot: tarefa.produtoNome },
    });
    setLaunchDrawerOpen(true);
  };

  /** Returns a badge label + className for PARA_LANCAMENTO expiry, or null for other statuses */
  const getLancamentoExpiryBadge = (
    tarefa: any,
  ): { label: string; className: string } | null => {
    if (tarefa.status !== "Para lançamento" || !tarefa.lancamentoExpiresAt)
      return null;
    const diff = new Date(tarefa.lancamentoExpiresAt).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days < 0)
      return {
        label: "Lançamento expirado",
        className: "bg-red-100 text-red-700 border-red-200",
      };
    if (days <= 5)
      return {
        label: `Expira em ${days}d`,
        className: "bg-amber-100 text-amber-700 border-amber-200",
      };
    return {
      label: `Vence em ${days}d`,
      className: "bg-orange-100 text-orange-600 border-orange-200",
    };
  };

  const getAllTasks = () => {
    const allTasks: any[] = [];
    mockData.produtos.forEach((produto) => {
      produto.tarefas.forEach((tarefa: any) => {
        allTasks.push({
          ...tarefa,
          produtoId: produto.id,
          produtoNome: produto.nome,
          uniqueId: produto.id * 1000 + tarefa.id,
        });
      });
    });
    return allTasks;
  };

  const getFilteredAndSortedTasks = () => {
    let tasks = getAllTasks();

    // Apply status filter
    if (taskStatusFilter !== "all") {
      tasks = tasks.filter((task) => task.status === taskStatusFilter);
    }

    // Apply product filter
    if (taskProductFilter !== "all") {
      tasks = tasks.filter(
        (task) => task.produtoId === Number.parseInt(taskProductFilter),
      );
    }

    // Apply date filter
    if (taskDateFilter) {
      tasks = tasks.filter((task) => task.prazo === taskDateFilter);
    }

    // Apply search
    if (taskSearchTerm) {
      const s = taskSearchTerm.toLowerCase();
      tasks = tasks.filter(
        (task) =>
          task.nome.toLowerCase().includes(s) ||
          String(task.uniqueId).toLowerCase().includes(s),
      );
    }

    // Apply sorting
    tasks.sort((a, b) => {
      let comparison = 0;

      switch (taskSortBy) {
        case "produto":
          comparison = a.produtoNome.localeCompare(b.produtoNome);
          break;
        case "nome":
          comparison = a.nome.localeCompare(b.nome);
          break;
        case "status":
          comparison = a.status.localeCompare(b.status);
          break;
        case "prazo":
          const dateA = new Date(a.prazo.split("/").reverse().join("-"));
          const dateB = new Date(b.prazo.split("/").reverse().join("-"));
          comparison = dateA.getTime() - dateB.getTime();
          break;
        case "executor":
          comparison = a.executor.localeCompare(b.executor);
          break;
        case "lider":
          comparison = a.lider.localeCompare(b.lider);
          break;
      }

      return taskSortOrder === "asc" ? comparison : -comparison;
    });

    return tasks;
  };

  const getPaginatedTasks = () => {
    const filteredTasks = getFilteredAndSortedTasks();
    const startIndex = (tasksCurrentPage - 1) * tasksPerPage;
    const endIndex = startIndex + tasksPerPage;
    return filteredTasks.slice(startIndex, endIndex);
  };

  const getTotalTaskPages = () => {
    return Math.ceil(getFilteredAndSortedTasks().length / tasksPerPage);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          hideOverlay={true}
          className="p-0 flex flex-col gap-0 !w-auto !max-w-none overflow-hidden"
          style={{
            left: `${sidebarWidth}px`,
            width: `calc(100vw - ${sidebarWidth}px)`,
            maxWidth: `calc(100vw - ${sidebarWidth}px)`,
          }}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <div className="relative flex flex-col h-full overflow-hidden">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* Brand Header */}
            <ModalBrandHeader
              onClose={() => onOpenChange(false)}
              headerStyle={getHeaderStyle()}
              right={
                <div className="flex items-center gap-2 flex-shrink-0">
                  {getProjectStatusBadge(
                    project?.status ?? dadosProjForm.situacao,
                  )}
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
                  {isDadosProjEditMode ? (
                    <>
                      <button
                        onClick={() => setShowDadosProjSaveConfirm(true)}
                        disabled={isSavingDados}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-500/30 hover:bg-green-500/40 text-white text-[10px] font-medium transition-colors border border-green-400/40 disabled:opacity-50"
                      >
                        {isSavingDados ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Save className="h-3 w-3" />
                        )}
                        {isSavingDados ? "Salvando..." : "Salvar"}
                      </button>
                      <button
                        onClick={() => setShowDadosProjCancelConfirm(true)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[10px] font-medium transition-colors border border-white/20"
                      >
                        <XCircle className="h-3 w-3" />
                        Cancelar
                      </button>
                    </>
                  ) : (
                    project && (
                      <>
                        <CopyLinkButton />
                        <button
                          onClick={onClone}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[10px] font-medium transition-colors border border-white/20"
                        >
                          <Copy className="h-3 w-3" />
                          Clonar
                        </button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[10px] font-medium transition-colors border border-white/20">
                              <FileText className="h-3 w-3" />
                              Exportar Proposta
                              <ChevronDown className="h-2.5 w-2.5 ml-0.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem
                              onClick={async () => {
                                if (!project) return;
                                setIsExportingPdf(true);
                                try {
                                  const brandCfg = {
                                    gradient: parseBrandGradient(
                                      sidebarSettings.backgroundColor,
                                    ),
                                    logoUrl:
                                      sidebarSettings.sidebarLogo ||
                                      agencyProfile.logo ||
                                      "/images/logob.png",
                                    agencyName:
                                      agencyProfile.name || "Lamego Teste Agency",
                                  };
                                  const proposalData = buildProposalData(
                                    mockData,
                                    dadosProjForm,
                                    project,
                                  );
                                  await exportProposalPDF(
                                    proposalData,
                                    brandCfg,
                                    `proposta_${(dadosProjForm.agencia || project?.name || "projeto").replace(/\s+/g, "_")}.pdf`,
                                  );
                                } finally {
                                  setIsExportingPdf(false);
                                }
                              }}
                              disabled={isExportingPdf}
                            >
                              <FileText className="h-3.5 w-3.5 mr-2" />
                              {isExportingPdf
                                ? "Gerando PDF..."
                                : "Documento Padrão (PDF)"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setCustomDocFile(null);
                                setShowCustomDocDialog(true);
                              }}
                            >
                              <Upload className="h-3.5 w-3.5 mr-2" />
                              Documento Personalizado
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        {project.status !== "cancelled" &&
                          project.status !== "canceled" && (
                            <button
                              onClick={onCancel}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-[10px] font-medium transition-colors border border-red-400/30"
                            >
                              <Ban className="h-3 w-3" />
                              Cancelar
                            </button>
                          )}
                      </>
                    )
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
                      <img
                        src={avatar}
                        alt="projeto"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-500">
                        <FolderKanban className="h-7 w-7 text-white" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                      <Camera className="h-4 w-4 text-white" />
                      <span className="text-[9px] text-white/90 font-medium mt-0.5">
                        {avatar ? "Editar" : "Foto"}
                      </span>
                    </div>
                  </button>

                  {/* Project Info */}
                  <div className="flex-1 min-w-0">
                    {isDadosProjEditMode ? (
                      <input
                        value={dadosProjForm.nomeProjeto}
                        onChange={(e) =>
                          setDadosProjForm((f) => ({
                            ...f,
                            nomeProjeto: e.target.value,
                          }))
                        }
                        className="w-full bg-white/15 border border-white/40 rounded-md px-2 py-1 text-white font-bold text-base placeholder-white/50 focus:outline-none focus:border-white/70"
                        placeholder="Nome do projeto"
                      />
                    ) : (
                      <h2 className="text-white font-bold text-base truncate">
                        {dadosProjForm.nomeProjeto}
                      </h2>
                    )}
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-white/70 text-xs flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {dadosProjForm.agencia}
                      </span>
                      <span className="text-white/70 text-xs flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {dadosProjForm.cliente}
                      </span>
                      <span className="text-white/70 text-xs flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {dadosProjForm.dataCriacao}
                      </span>
                    </div>
                    {/* Ativo/Inativo + Lifecycle badges */}
                    <div className="flex items-center gap-1.5 mt-1.5">
                      {isDadosProjEditMode &&
                      dadosProjForm.situacao !== "Cancelado" ? (
                        <button
                          type="button"
                          onClick={() =>
                            setDadosProjForm((f) => ({
                              ...f,
                              isAtivo: !f.isAtivo,
                            }))
                          }
                          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors border ${
                            dadosProjForm.isAtivo
                              ? "bg-emerald-500/30 border-emerald-400/50 text-white"
                              : "bg-white/10 border-white/20 text-white/60"
                          }`}
                        >
                          <div
                            className={`h-1.5 w-1.5 rounded-full ${dadosProjForm.isAtivo ? "bg-emerald-300" : "bg-white/40"}`}
                          />
                          {dadosProjForm.isAtivo ? "Ativo" : "Inativo"}
                        </button>
                      ) : (
                        <span
                          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            dadosProjForm.situacao === "Cancelado" ||
                            !dadosProjForm.isAtivo
                              ? "bg-white/10 border-white/20 text-white/60"
                              : "bg-emerald-500/30 border-emerald-400/50 text-white"
                          }`}
                        >
                          <div
                            className={`h-1.5 w-1.5 rounded-full ${dadosProjForm.situacao === "Cancelado" || !dadosProjForm.isAtivo ? "bg-white/40" : "bg-emerald-300"}`}
                          />
                          {dadosProjForm.situacao === "Cancelado"
                            ? "Cancelado"
                            : dadosProjForm.isAtivo
                              ? "Ativo"
                              : "Inativo"}
                        </span>
                      )}
                      <span
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          dadosProjForm.lifecycle === "Mensal"
                            ? "bg-violet-500/30 border-violet-400/40 text-white"
                            : "bg-white/10 border-white/20 text-white/70"
                        }`}
                      >
                        {dadosProjForm.lifecycle === "Mensal" && (
                          <RefreshCw className="h-2.5 w-2.5" />
                        )}
                        {dadosProjForm.lifecycle}
                      </span>
                    </div>
                  </div>
                </div>
              }
            />

            {/* Header color picker */}
            {showColorPicker && (
              <>
                <div
                  className="absolute inset-0 z-40"
                  onClick={() => setShowColorPicker(false)}
                />
                <div
                  className="absolute z-50 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4"
                  style={{ top: 108, right: 16, width: 300 }}
                >
                  <p className="text-xs font-semibold text-gray-700 mb-3">
                    Cor do cabeçalho
                  </p>
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {HEADER_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        title={preset.label}
                        onClick={() => {
                          setHeaderBg(preset.value);
                          setShowColorPicker(false);
                        }}
                        className={`relative h-10 rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${
                          headerBg === preset.value
                            ? "border-blue-500 ring-2 ring-blue-300"
                            : "border-transparent"
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
                    <label className="text-xs text-gray-500 flex-shrink-0">
                      Cor sólida:
                    </label>
                    <input
                      type="color"
                      value={customHeaderColor}
                      onChange={(e) => setCustomHeaderColor(e.target.value)}
                      className="h-7 w-10 rounded border border-gray-200 cursor-pointer"
                    />
                    <button
                      onClick={() => {
                        setHeaderBg(customHeaderColor);
                        setShowColorPicker(false);
                      }}
                      className="flex-1 px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs text-gray-700 font-medium transition-colors"
                    >
                      Aplicar
                    </button>
                    {headerBg && (
                      <button
                        onClick={() => {
                          setHeaderBg(null);
                          setShowColorPicker(false);
                        }}
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
                <div
                  className="absolute inset-0 z-40"
                  onClick={() => setShowAvatarMenu(false)}
                />
                <div
                  className="absolute z-50 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden min-w-[172px]"
                  style={{ top: 108, left: 22 }}
                >
                  <button
                    onClick={() => {
                      setShowAvatarMenu(false);
                      setTimeout(() => fileInputRef.current?.click(), 10);
                    }}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Camera className="h-3.5 w-3.5 text-gray-400" />
                    Nova foto
                  </button>
                  {originalRawSrc && (
                    <button
                      onClick={() => {
                        setShowAvatarMenu(false);
                        setRawImageSrc(originalRawSrc);
                        setCropZoom(1);
                        setCropOffset({ x: 0, y: 0 });
                        setCropOpen(true);
                      }}
                      className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-100"
                    >
                      <ZoomIn className="h-3.5 w-3.5 text-gray-400" />
                      Reposicionar
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowAvatarMenu(false);
                      setAvatar(null);
                      setOriginalRawSrc(null);
                    }}
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
                  <p className="text-white text-sm font-semibold">
                    Ajustar foto do projeto
                  </p>
                  <p className="text-white/50 text-xs mt-0.5">
                    Arraste para reposicionar · use o zoom para ajustar
                  </p>
                </div>
                <div className="flex-1 flex items-center justify-center overflow-hidden">
                  <div
                    className="relative flex-shrink-0"
                    style={{ width: CROP_SIZE, height: CROP_SIZE }}
                    onMouseDown={(e) => {
                      setIsDraggingCrop(true);
                      setDragStart({
                        x: e.clientX - cropOffset.x,
                        y: e.clientY - cropOffset.y,
                      });
                    }}
                    onMouseMove={(e) => {
                      if (!isDraggingCrop) return;
                      setCropOffset({
                        x: e.clientX - dragStart.x,
                        y: e.clientY - dragStart.y,
                      });
                    }}
                    onMouseUp={() => setIsDraggingCrop(false)}
                    onMouseLeave={() => setIsDraggingCrop(false)}
                  >
                    <img
                      ref={cropImgRef}
                      src={rawImageSrc}
                      alt="crop"
                      draggable={false}
                      style={{
                        transform: `translate(${cropOffset.x}px,${cropOffset.y}px) scale(${cropZoom})`,
                        transformOrigin: "center",
                        userSelect: "none",
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        opacity: 0.35,
                      }}
                    />
                    <div
                      className="absolute inset-0 overflow-hidden"
                      style={{
                        clipPath: `circle(${CROP_SIZE / 2}px at 50% 50%)`,
                        pointerEvents: "none",
                      }}
                    >
                      <img
                        src={rawImageSrc}
                        alt="crop-bright"
                        draggable={false}
                        style={{
                          transform: `translate(${cropOffset.x}px,${cropOffset.y}px) scale(${cropZoom})`,
                          transformOrigin: "center",
                          userSelect: "none",
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                        }}
                      />
                    </div>
                    <div
                      className="absolute inset-0 rounded-full border-2 border-white/60 pointer-events-none"
                      style={{ borderRadius: "50%" }}
                    />
                  </div>
                </div>
                <div className="flex-shrink-0 px-6 pb-3 space-y-3">
                  <div className="flex items-center gap-3">
                    <Camera className="h-4 w-4 text-white/60 flex-shrink-0" />
                    <input
                      type="range"
                      min={0.1}
                      max={3}
                      step={0.01}
                      value={cropZoom}
                      onChange={(e) => setCropZoom(parseFloat(e.target.value))}
                      className="flex-1 accent-white"
                    />
                    <button
                      onClick={() => setCropOffset({ x: 0, y: 0 })}
                      className="h-7 w-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors flex-shrink-0"
                      title="Centralizar"
                    >
                      <Crosshair className="h-4 w-4 text-white" />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setCropOpen(false);
                        setRawImageSrc(null);
                      }}
                      className="flex-1 h-9 rounded-lg border border-white/20 text-white/70 text-sm hover:bg-white/10 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleCropConfirm}
                      className="flex-1 h-9 rounded-lg btn-brand text-sm font-semibold transition-colors"
                    >
                      Usar esta foto
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tabs + Content */}
            <div className="flex-1 flex flex-col bg-white dark:bg-background overflow-hidden">
              <Tabs
                value={activeModalTab}
                onValueChange={setActiveModalTab}
                className="w-full flex flex-col h-full"
              >
                <div className="flex-shrink-0 bg-white dark:bg-background px-[50px] pt-0 pb-[10px] overflow-x-auto">
                  <TabsList className="grid w-max grid-cols-8 gap-1 bg-transparent p-0 h-auto">
                    <TabsTrigger
                      value="dashboard"
                      className="px-4 py-2 text-xs font-medium rounded-lg border border-transparent data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 data-[state=active]:border-blue-300 hover:bg-slate-100"
                    >
                      Dashboard
                    </TabsTrigger>
                    <TabsTrigger
                      value="descricao"
                      className="px-4 py-2 text-xs font-medium rounded-lg border border-transparent data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 data-[state=active]:border-blue-300 hover:bg-slate-100"
                    >
                      Dados do Projeto
                    </TabsTrigger>
                    <TabsTrigger
                      value="produtos"
                      className="px-4 py-2 text-xs font-medium rounded-lg border border-transparent data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 data-[state=active]:border-blue-300 hover:bg-slate-100"
                    >
                      Produtos
                    </TabsTrigger>
                    <TabsTrigger
                      value="tarefas"
                      className="px-4 py-2 text-xs font-medium rounded-lg border border-transparent data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 data-[state=active]:border-blue-300 hover:bg-slate-100"
                    >
                      Tarefas
                    </TabsTrigger>
                    <TabsTrigger
                      value="arquivos"
                      className="px-4 py-2 text-xs font-medium rounded-lg border border-transparent data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 data-[state=active]:border-blue-300 hover:bg-slate-100"
                    >
                      Arquivos
                    </TabsTrigger>
                    <TabsTrigger
                      value="cofre"
                      className="px-4 py-2 text-xs font-medium rounded-lg border border-transparent data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 data-[state=active]:border-blue-300 hover:bg-slate-100"
                    >
                      Cofre
                    </TabsTrigger>
                    <TabsTrigger
                      value="faturamento"
                      className="px-4 py-2 text-xs font-medium rounded-lg border border-transparent data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 data-[state=active]:border-blue-300 hover:bg-slate-100"
                    >
                      Faturamento
                    </TabsTrigger>
                    <TabsTrigger
                      value="log"
                      className="px-4 py-2 text-xs font-medium rounded-lg border border-transparent data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 data-[state=active]:border-blue-300 hover:bg-slate-100"
                    >
                      Log
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent
                  value="dashboard"
                  className="p-0 m-0 flex-1 overflow-y-auto bg-slate-100"
                >
                  <div className="px-[50px] py-[25px] space-y-4">
                    {/* Dashboard loading */}
                    {dashboardLoading && (
                      <div className="flex items-center justify-center py-16">
                        <div className="h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}

                    {!dashboardLoading && <>
                    {/* Summary banner */}
                    <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm">
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shrink-0">
                        <Activity className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-700 mb-0.5">
                          Status do Projeto
                        </p>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          {dashboardData
                            ? `${dashboardData.tasks.completionPct}% das tarefas concluídas · ${dashboardData.billing?.paidCount ?? 0}/${dashboardData.billing?.totalCount ?? 0} faturas pagas · ${dashboardData.attention} item(s) requerendo atenção`
                            : "Carregando dados do projeto..."}
                        </p>
                      </div>
                    </div>

                    {/* KPI row – 4 compact stat cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      {/* Faturado */}
                      <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl px-4 py-3 text-white shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
                            Faturado
                          </span>
                          <DollarSign className="w-3.5 h-3.5 opacity-70" />
                        </div>
                        <p className="text-xl font-bold leading-tight">
                          {dashboardData?.billing?.total != null
                            ? `R$ ${dashboardData.billing.total.toLocaleString("pt-BR")}`
                            : "R$ 0"}
                        </p>
                        <p className="text-[10px] opacity-75 mt-0.5 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          {dashboardData?.billing?.paidCount ?? 0} fatura(s) quitada(s)
                        </p>
                      </div>
                      {/* Tarefas */}
                      <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl px-4 py-3 text-white shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
                            Tarefas
                          </span>
                          <CheckCircle2 className="w-3.5 h-3.5 opacity-70" />
                        </div>
                        <p className="text-2xl font-bold leading-tight">
                          {dashboardData?.tasks?.done ?? 0}
                          <span className="text-base font-semibold opacity-70">/{dashboardData?.tasks?.total ?? 0}</span>
                        </p>
                        <p className="text-[10px] opacity-75 mt-0.5 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          {dashboardData?.tasks?.completionPct ?? 0}% concluídas
                        </p>
                      </div>
                      {/* Faturas */}
                      <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl px-4 py-3 text-white shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
                            Faturas
                          </span>
                          <CreditCard className="w-3.5 h-3.5 opacity-70" />
                        </div>
                        <p className="text-2xl font-bold leading-tight">
                          {dashboardData?.billing?.paidCount ?? 0}
                          <span className="text-base font-semibold opacity-70">/{dashboardData?.billing?.totalCount ?? 0}</span>
                        </p>
                        <p className="text-[10px] opacity-75 mt-0.5">
                          {(dashboardData?.billing?.overdueCount ?? 0) > 0
                            ? `${dashboardData.billing.overdueCount} em atraso`
                            : "sem atrasos"}
                        </p>
                      </div>
                      {/* Atenção */}
                      <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-xl px-4 py-3 text-white shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
                            Atenção
                          </span>
                          <AlertTriangle className="w-3.5 h-3.5 opacity-70" />
                        </div>
                        <p className="text-2xl font-bold leading-tight">{dashboardData?.attention ?? 0}</p>
                        <p className="text-[10px] opacity-75 mt-0.5">
                          {(dashboardData?.attention ?? 0) > 0 ? "item(s) crítico(s)" : "nenhuma atenção necessária"}
                        </p>
                      </div>
                    </div>
                    </>}

                    {/* Middle row – task status + billing distribution */}
                    {!dashboardLoading && <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {/* Tarefas por Status */}
                      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs font-semibold text-slate-700">
                            Tarefas por Status
                          </p>
                          <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
                        </div>
                        <div className="space-y-2.5">
                          {[
                            {
                              label: "Concluídas",
                              value: dashboardData?.tasks?.done ?? 0,
                              total: dashboardData?.tasks?.total ?? 1,
                              color: "bg-emerald-500",
                              text: "text-emerald-600",
                            },
                            {
                              label: "Em Andamento",
                              value: dashboardData?.tasks?.inProgress ?? 0,
                              total: dashboardData?.tasks?.total ?? 1,
                              color: "bg-blue-500",
                              text: "text-blue-600",
                            },
                            {
                              label: "Aguardando",
                              value: dashboardData?.tasks?.waiting ?? 0,
                              total: dashboardData?.tasks?.total ?? 1,
                              color: "bg-amber-400",
                              text: "text-amber-600",
                            },
                            {
                              label: "Canceladas",
                              value: dashboardData?.tasks?.cancelled ?? 0,
                              total: dashboardData?.tasks?.total ?? 1,
                              color: "bg-red-500",
                              text: "text-red-500",
                            },
                          ].map((s) => (
                            <div key={s.label}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[11px] text-slate-500">
                                  {s.label}
                                </span>
                                <span className={`text-[11px] font-semibold ${s.text}`}>
                                  {s.value}
                                </span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-1.5">
                                <div
                                  className={`${s.color} h-1.5 rounded-full`}
                                  style={{ width: s.total > 0 ? `${(s.value / s.total) * 100}%` : "0%" }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Distribuição de Faturas */}
                      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs font-semibold text-slate-700">
                            Distribuição de Faturas
                          </p>
                          <Wallet className="w-3.5 h-3.5 text-emerald-500" />
                        </div>
                        {(() => {
                          const total = dashboardData?.billing?.total ?? 0;
                          const paid = dashboardData?.billing?.paid ?? 0;
                          const pending = dashboardData?.billing?.pending ?? 0;
                          const overdue = dashboardData?.billing?.overdue ?? 0;
                          const bars = [
                            { label: "Pago", amount: paid, count: dashboardData?.billing?.paidCount ?? 0, color: "bg-emerald-500", text: "text-emerald-600" },
                            { label: "Pendente", amount: pending, count: dashboardData?.billing?.pendingCount ?? 0, color: "bg-amber-400", text: "text-amber-600" },
                            { label: "Em atraso", amount: overdue, count: dashboardData?.billing?.overdueCount ?? 0, color: "bg-red-500", text: "text-red-600" },
                          ];
                          return (
                            <div className="space-y-2.5">
                              {bars.map((b) => (
                                <div key={b.label}>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-[11px] text-slate-500">{b.label} ({b.count})</span>
                                    <span className={`text-[11px] font-semibold ${b.text}`}>
                                      R$ {b.amount.toLocaleString("pt-BR")}
                                    </span>
                                  </div>
                                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                                    <div
                                      className={`${b.color} h-1.5 rounded-full`}
                                      style={{ width: total > 0 ? `${(b.amount / total) * 100}%` : "0%" }}
                                    />
                                  </div>
                                </div>
                              ))}
                              {total === 0 && (
                                <p className="text-[11px] text-slate-400 text-center py-4">Sem faturas registradas</p>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>}

                    {/* Recent Activity */}
                    {!dashboardLoading && <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                      <p className="text-xs font-semibold text-slate-700 mb-3">
                        Atividades Recentes
                      </p>
                      {dashboardData?.recentActivities?.length > 0 ? (
                        <div className="space-y-2">
                          {dashboardData.recentActivities.map((a: any) => (
                            <div key={a.id} className="flex items-center gap-2 text-xs text-slate-500">
                              {a.type === "invoice_paid"
                                ? <DollarSign className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                : <CheckCircle2 className="h-3.5 w-3.5 text-violet-500 shrink-0" />}
                              <span className="flex-1 truncate">{a.label}</span>
                              <span className="text-slate-400 text-[10px] shrink-0">{new Date(a.at).toLocaleDateString("pt-BR")}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="px-2 py-8 text-center text-slate-400 text-xs">
                          Nenhuma atividade registrada ainda.
                        </div>
                      )}
                    </div>}
                  </div>
                </TabsContent>

                <TabsContent
                  value="descricao"
                  className="p-0 m-0 flex-1 overflow-y-auto bg-slate-200"
                >
                  <div className="px-[50px] pt-[25px] pb-[80px] space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-2">
                      <h3 className="text-sm font-semibold text-slate-900">
                        Dados do Projeto
                      </h3>
                      <div className="flex items-center gap-2">
                        {/* Expandir toggle */}
                        <button
                          onClick={() => {
                            const allOpen = DADOS_PROJECT_ACCORDIONS.every(
                              (a) => dadosProjOpenAccordions.includes(a),
                            );
                            setDadosProjOpenAccordions(
                              allOpen ? [] : DADOS_PROJECT_ACCORDIONS,
                            );
                          }}
                          className="flex items-center gap-2 group"
                        >
                          <span className="text-xs text-slate-500 group-hover:text-slate-700 transition-colors select-none">
                            {DADOS_PROJECT_ACCORDIONS.every((a) =>
                              dadosProjOpenAccordions.includes(a),
                            )
                              ? "Fechar"
                              : "Expandir"}
                          </span>
                          <div
                            className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${DADOS_PROJECT_ACCORDIONS.every((a) => dadosProjOpenAccordions.includes(a)) ? "bg-blue-600" : "bg-slate-300"}`}
                          >
                            <div
                              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${DADOS_PROJECT_ACCORDIONS.every((a) => dadosProjOpenAccordions.includes(a)) ? "translate-x-4" : "translate-x-0.5"}`}
                            />
                          </div>
                        </button>
                        {!isDadosProjEditMode ? (
                          <Button
                            onClick={() => setIsDadosProjEditMode(true)}
                            size="sm"
                            className="btn-brand"
                          >
                            <Edit2 className="h-4 w-4 mr-2" />
                            Editar
                          </Button>
                        ) : (
                          <div className="flex gap-2">
                            <Button
                              onClick={() => setShowDadosProjSaveConfirm(true)}
                              size="sm"
                              disabled={isSavingDados}
                              className="btn-brand"
                            >
                              {isSavingDados ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Save className="h-4 w-4 mr-2" />
                              )}
                              {isSavingDados ? "Salvando..." : "Salvar"}
                            </Button>
                            <Button
                              onClick={() =>
                                setShowDadosProjCancelConfirm(true)
                              }
                              size="sm"
                              variant="outline"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Cancelar
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    <Accordion
                      type="multiple"
                      value={dadosProjOpenAccordions}
                      onValueChange={setDadosProjOpenAccordions}
                      className="space-y-2"
                    >
                      {/* Informações do Projeto */}
                      <AccordionItem
                        value="info"
                        className="border border-slate-200/80 rounded-xl overflow-hidden shadow-sm"
                      >
                        <AccordionTrigger className="px-4 py-3 bg-white hover:bg-slate-50 [&[data-state=open]]:bg-slate-50 text-xs">
                          <div className="flex items-center gap-2">
                            <FolderKanban className="h-4 w-4 text-blue-600" />
                            <span className="font-semibold text-slate-800">
                              Informações do Projeto
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-3 py-3 border-t border-slate-100 bg-slate-50/30">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                            <div className="bg-slate-100/70 rounded-lg px-2.5 py-2 col-span-2">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                                Situação
                              </p>
                              {isDadosProjEditMode ? (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${{ Rascunho: "bg-slate-400", "Ag. Pagamento": "bg-cyan-500", Planejamento: "bg-orange-500", "Em Andamento": "bg-blue-500", Pausado: "bg-amber-400", Concluído: "bg-emerald-500", Cancelado: "bg-red-500" }[dadosProjForm.situacao] ?? "bg-slate-400"}`}
                                    />
                                    <p className="text-sm font-semibold text-slate-800">
                                      {dadosProjForm.situacao}
                                    </p>
                                  </div>
                                  {dadosProjForm.situacao === "Cancelado" ? (
                                    <div className="flex items-center gap-1.5 text-red-500 text-xs">
                                      <Ban className="h-3.5 w-3.5 flex-shrink-0" />
                                      <span>
                                        Projeto cancelado — status não pode ser
                                        alterado
                                      </span>
                                    </div>
                                  ) : dadosProjForm.situacao === "Concluído" ? (
                                    <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                                      <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0" />
                                      <span>
                                        Projeto concluído — status não pode ser
                                        alterado
                                      </span>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="flex items-center gap-1.5 text-indigo-600 text-xs">
                                        <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0" />
                                        <span>
                                          Controlado pelo sistema · ações
                                          administrativas:
                                        </span>
                                      </div>
                                      <div className="flex flex-wrap gap-1.5">
                                        {dadosProjForm.situacao ===
                                          "Pausado" && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setDadosProjForm((f) => ({
                                                ...f,
                                                situacao: "Em Andamento",
                                              }))
                                            }
                                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-blue-300 bg-white text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
                                          >
                                            <Play className="h-3 w-3" /> Retomar
                                          </button>
                                        )}
                                        {(dadosProjForm.situacao ===
                                          "Em Andamento" ||
                                          dadosProjForm.situacao ===
                                            "Planejamento") && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setDadosProjForm((f) => ({
                                                ...f,
                                                situacao: "Pausado",
                                              }))
                                            }
                                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-xs font-semibold text-amber-600 hover:bg-amber-50 transition-colors"
                                          >
                                            <Pause className="h-3 w-3" /> Pausar
                                          </button>
                                        )}
                                        {dadosProjForm.situacao !==
                                          "Rascunho" && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setDadosProjForm((f) => ({
                                                ...f,
                                                situacao: "Cancelado",
                                                isAtivo: false,
                                              }))
                                            }
                                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-300 bg-white text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                                          >
                                            <Ban className="h-3 w-3" /> Cancelar
                                            projeto
                                          </button>
                                        )}
                                      </div>
                                    </>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <div
                                    className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${{ Rascunho: "bg-slate-400", "Ag. Pagamento": "bg-cyan-500", Planejamento: "bg-orange-500", "Em Andamento": "bg-blue-500", Pausado: "bg-amber-400", Concluído: "bg-emerald-500", Cancelado: "bg-red-500" }[dadosProjForm.situacao] ?? "bg-slate-400"}`}
                                  />
                                  <p className="text-sm font-semibold text-slate-800">
                                    {dadosProjForm.situacao}
                                  </p>
                                </div>
                              )}
                            </div>
                            <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                                Empresa
                              </p>
                              {isDadosProjEditMode ? (
                                <Input
                                  value={dadosProjForm.agencia}
                                  onChange={(e) =>
                                    setDadosProjForm((f) => ({
                                      ...f,
                                      agencia: e.target.value,
                                    }))
                                  }
                                  className="h-8 text-sm border-slate-300"
                                />
                              ) : (
                                <p className="text-sm font-semibold text-slate-800">
                                  {dadosProjForm.agencia}
                                </p>
                              )}
                            </div>
                            <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                                Consultor Responsável
                              </p>
                              {isDadosProjEditMode ? (
                                <Input
                                  value={dadosProjForm.consultor}
                                  onChange={(e) =>
                                    setDadosProjForm((f) => ({
                                      ...f,
                                      consultor: e.target.value,
                                    }))
                                  }
                                  className="h-8 text-sm border-slate-300"
                                />
                              ) : (
                                <p className="text-sm font-semibold text-slate-800">
                                  {dadosProjForm.consultor}
                                </p>
                              )}
                            </div>
                            <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                                E-mail do Consultor
                              </p>
                              {isDadosProjEditMode ? (
                                <Input
                                  value={dadosProjForm.emailConsultor}
                                  onChange={(e) =>
                                    setDadosProjForm((f) => ({
                                      ...f,
                                      emailConsultor: e.target.value,
                                    }))
                                  }
                                  className="h-8 text-sm border-slate-300"
                                />
                              ) : (
                                <p className="text-sm font-semibold text-blue-600">
                                  {dadosProjForm.emailConsultor}
                                </p>
                              )}
                            </div>
                            <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                                Cliente
                              </p>
                              {isDadosProjEditMode ? (
                                <Input
                                  value={dadosProjForm.cliente}
                                  onChange={(e) =>
                                    setDadosProjForm((f) => ({
                                      ...f,
                                      cliente: e.target.value,
                                    }))
                                  }
                                  className="h-8 text-sm border-slate-300"
                                />
                              ) : (
                                <p className="text-sm font-semibold text-slate-800">
                                  {dadosProjForm.cliente}
                                </p>
                              )}
                            </div>
                            <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                                Data de Criação
                              </p>
                              <p className="text-sm font-semibold text-slate-800">
                                {dadosProjForm.dataCriacao}
                              </p>
                            </div>
                            <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                                Permite Portfólio
                              </p>
                              {isDadosProjEditMode ? (
                                <button
                                  onClick={() =>
                                    setDadosProjForm((f) => ({
                                      ...f,
                                      permitePortfolio: !f.permitePortfolio,
                                    }))
                                  }
                                  className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${dadosProjForm.permitePortfolio ? "bg-blue-600" : "bg-slate-300"}`}
                                >
                                  <div
                                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${dadosProjForm.permitePortfolio ? "translate-x-4" : "translate-x-0.5"}`}
                                  />
                                </button>
                              ) : (
                                <p
                                  className={`text-sm font-semibold ${dadosProjForm.permitePortfolio ? "text-emerald-600" : "text-slate-400"}`}
                                >
                                  {dadosProjForm.permitePortfolio
                                    ? "Permitido"
                                    : "Não permitido"}
                                </p>
                              )}
                            </div>
                            <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                                Bitrix
                              </p>
                              {isDadosProjEditMode ? (
                                <button
                                  onClick={() =>
                                    setDadosProjForm((f) => ({
                                      ...f,
                                      sincronizadoBitrix: !f.sincronizadoBitrix,
                                    }))
                                  }
                                  className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${dadosProjForm.sincronizadoBitrix ? "bg-blue-600" : "bg-slate-300"}`}
                                >
                                  <div
                                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${dadosProjForm.sincronizadoBitrix ? "translate-x-4" : "translate-x-0.5"}`}
                                  />
                                </button>
                              ) : (
                                <p
                                  className={`text-sm font-semibold ${dadosProjForm.sincronizadoBitrix ? "text-emerald-600" : "text-slate-400"}`}
                                >
                                  {dadosProjForm.sincronizadoBitrix
                                    ? "Sincronizado"
                                    : "Não sincronizado"}
                                </p>
                              )}
                            </div>
                            {/* Tipo de Projeto */}
                            <div className="bg-slate-100/70 rounded-lg px-2.5 py-2 col-span-2">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                                Tipo de Projeto
                              </p>
                              {isDadosProjEditMode ? (
                                <div className="flex gap-2">
                                  {(["Avulso", "Mensal"] as const).map((lc) => (
                                    <button
                                      key={lc}
                                      type="button"
                                      onClick={() =>
                                        setDadosProjForm((f) => ({
                                          ...f,
                                          lifecycle: lc,
                                        }))
                                      }
                                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                                        dadosProjForm.lifecycle === lc
                                          ? "bg-violet-600 text-white border-violet-600"
                                          : "bg-white border-slate-300 text-slate-600 hover:border-violet-400"
                                      }`}
                                    >
                                      {lc === "Mensal" && (
                                        <RefreshCw className="h-3 w-3" />
                                      )}
                                      {lc}
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  {dadosProjForm.lifecycle === "Mensal" && (
                                    <RefreshCw className="h-3.5 w-3.5 text-violet-600" />
                                  )}
                                  <p className="text-sm font-semibold text-slate-800">
                                    {dadosProjForm.lifecycle}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      {/* Ciclo de Cobrança — Mensal only */}
                      {dadosProjForm.lifecycle === "Mensal" && (
                        <AccordionItem
                          value="ciclo"
                          className="border border-slate-200/80 rounded-xl overflow-hidden shadow-sm"
                        >
                          <AccordionTrigger className="px-4 py-3 bg-white hover:bg-slate-50 [&[data-state=open]]:bg-slate-50 text-xs">
                            <div className="flex items-center gap-2">
                              <RefreshCw className="h-4 w-4 text-violet-600" />
                              <span className="font-semibold text-slate-800">
                                Ciclo de Cobrança
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-3 py-3 border-t border-slate-100 bg-slate-50/30">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                              <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                                  Dia mensal de cobrança
                                </p>
                                {isDadosProjEditMode ? (
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="number"
                                      min={1}
                                      max={28}
                                      value={dadosProjForm.diaCobranca}
                                      onChange={(e) =>
                                        setDadosProjForm((f) => ({
                                          ...f,
                                          diaCobranca: Math.min(
                                            28,
                                            Math.max(
                                              1,
                                              parseInt(e.target.value) || 1,
                                            ),
                                          ),
                                        }))
                                      }
                                      className="h-8 w-20 text-sm border-slate-300"
                                    />
                                    <span className="text-xs text-slate-500">
                                      de cada mês
                                    </span>
                                  </div>
                                ) : (
                                  <p className="text-sm font-semibold text-slate-800">
                                    Todo dia {dadosProjForm.diaCobranca}
                                  </p>
                                )}
                              </div>
                              <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                                  Início do primeiro ciclo
                                </p>
                                {isDadosProjEditMode ? (
                                  <Input
                                    type="date"
                                    value={dadosProjForm.dataInicioCobranca}
                                    onChange={(e) =>
                                      setDadosProjForm((f) => ({
                                        ...f,
                                        dataInicioCobranca: e.target.value,
                                      }))
                                    }
                                    className="h-8 text-sm border-slate-300"
                                  />
                                ) : (
                                  <p className="text-sm font-semibold text-slate-800">
                                    {dadosProjForm.dataInicioCobranca
                                      ? new Date(
                                          dadosProjForm.dataInicioCobranca,
                                        ).toLocaleDateString("pt-BR")
                                      : "—"}
                                  </p>
                                )}
                              </div>
                              <div className="bg-slate-100/70 rounded-lg px-2.5 py-2 col-span-2">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                                  Próxima cobrança prevista
                                </p>
                                {(() => {
                                  const today = new Date();
                                  const day = dadosProjForm.diaCobranca || 15;
                                  const next = new Date(today);
                                  if (today.getDate() >= day)
                                    next.setMonth(next.getMonth() + 1);
                                  next.setDate(day);
                                  return (
                                    <p className="text-sm font-semibold text-violet-700">
                                      {next.toLocaleDateString("pt-BR", {
                                        day: "2-digit",
                                        month: "2-digit",
                                        year: "numeric",
                                      })}
                                    </p>
                                  );
                                })()}
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      )}

                      {/* Descrição */}
                      <AccordionItem
                        value="descricao"
                        className="border border-slate-200/80 rounded-xl overflow-hidden shadow-sm"
                      >
                        <AccordionTrigger className="px-4 py-3 bg-white hover:bg-slate-50 [&[data-state=open]]:bg-slate-50 text-xs">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-violet-600" />
                            <span className="font-semibold text-slate-800">
                              Descrição
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-3 py-3 border-t border-slate-100 bg-slate-50/30">
                          <RichTextEditor
                            value={dadosProjForm.descricao}
                            onChange={(val) =>
                              setDadosProjForm((f) => ({
                                ...f,
                                descricao: val,
                              }))
                            }
                            editable={isDadosProjEditMode}
                            placeholder="Descreva o projeto..."
                            minHeight="160px"
                          />
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                </TabsContent>

                <TabsContent
                  value="produtos"
                  className="p-0 m-0 flex-1 overflow-y-auto bg-slate-200"
                >
                  {isUnpaid ? (
                    <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-5 px-8">
                      <div className="h-16 w-16 rounded-2xl bg-slate-100 border-2 border-slate-200 flex items-center justify-center">
                        <Lock className="h-8 w-8 text-slate-400" />
                      </div>
                      <div className="text-center max-w-sm">
                        <p className="text-sm font-semibold text-slate-700 mb-1">
                          Produtos bloqueados
                        </p>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Os produtos e tarefas serão ativados após a
                          confirmação do pagamento.
                        </p>
                      </div>
                      {project?.status === "awaiting-payment" &&
                        onGoToPayment && (
                          <button
                            onClick={() => {
                              onOpenChange(false);
                              onGoToPayment();
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition-colors"
                          >
                            <CreditCard className="h-3.5 w-3.5" />
                            Ir para Pagamento
                          </button>
                        )}
                      {project?.status === "draft" && onContinueDraft && (
                        <button
                          onClick={() => {
                            onOpenChange(false);
                            onContinueDraft();
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg transition-colors"
                        >
                          Continuar Projeto
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="px-[50px] pt-[25px] pb-[80px] space-y-4">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-slate-900">
                          Produtos Contratados
                        </h3>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={() => {
                              const allTarefas = mockData.produtos.flatMap(
                                (p: any) => p.tarefas || [],
                              );
                              const isCompleted =
                                dadosProjForm.situacao === "completed" ||
                                dadosProjForm.situacao === "Concluído";
                              const allDone =
                                allTarefas.length > 0 &&
                                allTarefas.every(
                                  (t: any) =>
                                    t.status === "Entregue" ||
                                    t.status === "Aprovada",
                                );
                              if (
                                dadosProjForm.lifecycle === "Avulso" &&
                                (isCompleted || allDone)
                              ) {
                                setShowAvulsoReativarAlert(true);
                              } else {
                                toast({
                                  description: "Seleção de produtos em breve!",
                                });
                              }
                            }}
                          >
                            <Plus className="h-3.5 w-3.5 mr-1.5" />
                            Adicionar Produto
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className={`h-8 text-xs border-slate-300 bg-white hover:bg-slate-50 ${showProductFilters ? "border-blue-400 text-blue-600" : ""}`}
                            onClick={() =>
                              setShowProductFilters(!showProductFilters)
                            }
                          >
                            <Filter className="h-3.5 w-3.5 mr-1.5" />
                            Filtros
                          </Button>
                          <Select
                            value={productSortBy}
                            onValueChange={setProductSortBy}
                          >
                            <SelectTrigger className="h-8 w-[175px] text-xs border-slate-300 bg-white">
                              <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="nome">
                                Ordem Alfabética
                              </SelectItem>
                              <SelectItem value="progresso">
                                Ordem de %
                              </SelectItem>
                              <SelectItem value="dataContratacao">
                                Data Contratação
                              </SelectItem>
                              <SelectItem value="dataEntrega">
                                Data Entrega
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0 border-slate-300 bg-white hover:bg-slate-50"
                            onClick={toggleSortOrder}
                            title={
                              productSortOrder === "asc"
                                ? "Ordem Crescente"
                                : "Ordem Decrescente"
                            }
                          >
                            {productSortOrder === "asc" ? (
                              <ArrowUp className="h-3.5 w-3.5" />
                            ) : (
                              <ArrowDown className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Filter panel */}
                      {showProductFilters && (
                        <div className="p-4 border border-slate-200/80 rounded-xl bg-white shadow-sm space-y-3">
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 block">
                                Porcentagem
                              </label>
                              <Select
                                value={productPercentageFilter}
                                onValueChange={setProductPercentageFilter}
                              >
                                <SelectTrigger className="h-8 text-xs border-slate-300">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">Todos</SelectItem>
                                  <SelectItem value="0-25">0% – 25%</SelectItem>
                                  <SelectItem value="25-50">
                                    25% – 50%
                                  </SelectItem>
                                  <SelectItem value="50-75">
                                    50% – 75%
                                  </SelectItem>
                                  <SelectItem value="75-100">
                                    75% – 100%
                                  </SelectItem>
                                  <SelectItem value="concluido">
                                    Concluído (100%)
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 block">
                                Status
                              </label>
                              <Select
                                value={productStatusFilter}
                                onValueChange={setProductStatusFilter}
                              >
                                <SelectTrigger className="h-8 text-xs border-slate-300">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">Todos</SelectItem>
                                  <SelectItem value="Não Iniciado">
                                    Não Iniciado
                                  </SelectItem>
                                  <SelectItem value="Planejamento">
                                    Planejamento
                                  </SelectItem>
                                  <SelectItem value="Em Desenvolvimento">
                                    Em Desenvolvimento
                                  </SelectItem>
                                  <SelectItem value="Em Andamento">
                                    Em Andamento
                                  </SelectItem>
                                  <SelectItem value="Concluído">
                                    Concluído
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 block">
                                Tipo
                              </label>
                              <Select
                                value={productTypeFilter}
                                onValueChange={setProductTypeFilter}
                              >
                                <SelectTrigger className="h-8 text-xs border-slate-300">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">Todos</SelectItem>
                                  <SelectItem value="Avulso">Avulso</SelectItem>
                                  <SelectItem value="Mensal">Mensal</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="flex justify-end">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-slate-500"
                              onClick={() => {
                                setProductPercentageFilter("all");
                                setProductStatusFilter("all");
                                setProductTypeFilter("all");
                              }}
                            >
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
                            <div
                              className={`absolute left-0 top-0 bottom-0 w-1 ${getProgressColor(produto.progresso)} opacity-80`}
                            />

                            {/* Content */}
                            <div className="relative flex items-center gap-4 px-4 py-3 pl-5">
                              {/* Progress ring / percentage */}
                              <div className="shrink-0 flex flex-col items-center justify-center w-12">
                                <span
                                  className={`text-lg font-black leading-none ${getProgressTextColor(produto.progresso)}`}
                                >
                                  {produto.progresso}%
                                </span>
                                <span className="text-[9px] text-slate-400 font-medium tracking-wide mt-0.5">
                                  progresso
                                </span>
                              </div>

                              {/* Divider */}
                              <div className="w-px h-10 bg-slate-200 shrink-0" />

                              {/* Main info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-bold text-sm text-slate-800 truncate">
                                    {produto.nome}
                                  </h4>
                                  <span
                                    className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${
                                      produto.tipo === "Mensal"
                                        ? "bg-violet-100 text-violet-700"
                                        : "bg-blue-100 text-blue-700"
                                    }`}
                                  >
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
                                  {/* Task status breakdown */}
                                  {produto.tarefasTotais === 0 ? (
                                    <span className="italic text-slate-400">
                                      {produto.tarefasEsperadas > 0
                                        ? `Produto ainda não gerou tarefas. (${produto.tarefasEsperadas} modelo${produto.tarefasEsperadas > 1 ? "s" : ""} disponível${produto.tarefasEsperadas > 1 ? "s" : ""})`
                                        : "Produto ainda não gerou tarefas."}
                                    </span>
                                  ) : (
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {produto.tarefasParaLancamento > 0 && (
                                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-semibold">
                                          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                                          {produto.tarefasParaLancamento} p/
                                          lançamento
                                        </span>
                                      )}
                                      {produto.tarefasEmExecucao > 0 && (
                                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-semibold">
                                          <span className="h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0" />
                                          {produto.tarefasEmExecucao} em
                                          execução
                                        </span>
                                      )}
                                      {produto.tarefasParaAprovacao > 0 && (
                                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-[10px] font-semibold">
                                          <span className="h-1.5 w-1.5 rounded-full bg-orange-400 shrink-0" />
                                          {produto.tarefasParaAprovacao} p/
                                          aprovação
                                        </span>
                                      )}
                                      {produto.tarefasConcluidas > 0 && (
                                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-semibold">
                                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                                          {produto.tarefasConcluidas} concluída
                                          {produto.tarefasConcluidas > 1
                                            ? "s"
                                            : ""}
                                        </span>
                                      )}
                                      <span className="text-[10px] text-slate-400">
                                        ({produto.tarefasTotais} criada
                                        {produto.tarefasTotais > 1 ? "s" : ""}
                                        {produto.tarefasEsperadas > 0
                                          ? ` / ${produto.tarefasEsperadas} esperada${produto.tarefasEsperadas > 1 ? "s" : ""}`
                                          : ""}
                                        )
                                      </span>
                                    </div>
                                  )}
                                  <span className="text-slate-300">•</span>
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    Contratação:{" "}
                                    <span className="font-medium">
                                      {produto.dataContratacao}
                                    </span>
                                  </span>
                                  <span className="text-slate-300">•</span>
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    Entrega:{" "}
                                    <span className="font-medium">
                                      {produto.dataEntrega}
                                    </span>
                                  </span>
                                </div>
                              </div>

                              {/* Actions */}
                              <button
                                className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border border-slate-200 bg-white hover:bg-slate-50 hover:border-blue-300 text-slate-400 hover:text-blue-600 transition-all"
                                onClick={() => {
                                  setSelectedProduct(produto);
                                  setShowProductTasksModal(true);
                                }}
                                title="Ver tarefas"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {getSortedAndFilteredProducts().length === 0 &&
                        (loadingModalData ? (
                          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                            <Loader2 className="h-6 w-6 animate-spin mb-2" />
                            <p className="text-xs">Carregando produtos...</p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center mb-3">
                              <Package className="h-5 w-5 text-slate-400" />
                            </div>
                            <p className="text-sm font-medium text-slate-600">
                              Nenhum produto encontrado
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                              Tente alterar os filtros selecionados
                            </p>
                          </div>
                        ))}
                    </div>
                  )}
                </TabsContent>

                {/* Arquivos */}
                <TabsContent
                  value="arquivos"
                  className="p-0 m-0 flex-1 overflow-y-auto bg-slate-200"
                >
                  <div className="px-[50px] pt-[25px] pb-[80px] space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-1">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">
                          Arquivos do Projeto
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Todos os arquivos vinculados às tarefas deste projeto
                        </p>
                      </div>
                      <button
                        onClick={() => setShowAddFileDialog(true)}
                        className="flex items-center gap-2 h-8 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold shadow-sm shadow-blue-200 transition-all"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        Adicionar Arquivo
                      </button>
                    </div>

                    {/* Loading state */}
                    {projectFilesLoading && (
                      <div className="flex items-center justify-center py-16">
                        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                      </div>
                    )}

                    {/* Error state */}
                    {!projectFilesLoading && projectFilesData?._error && (
                      <div className="border border-red-200 rounded-xl bg-white px-4 py-10 text-center text-red-400 text-xs">
                        Erro ao carregar arquivos. Tente novamente.
                      </div>
                    )}

                    {/* Data loaded */}
                    {!projectFilesLoading && projectFilesData && !projectFilesData._error && (() => {
                      const pf = projectFilesData;
                      const summary = pf.summary ?? { total: 0, initial: 0, internal: 0, deliveries: 0, approved: 0 };
                      const groups: { key: string; label: string; icon: any; files: any[]; emptyLabel: string }[] = [
                        { key: "iniciais", label: "Referências", icon: FolderOpen, files: pf.initialFiles ?? [], emptyLabel: "Nenhum arquivo de referência." },
                        { key: "internos", label: "Arquivos Internos", icon: FileText, files: pf.internalFiles ?? [], emptyLabel: "Nenhum arquivo interno." },
                        { key: "entregas", label: "Entregáveis", icon: File, files: pf.deliveries ?? [], emptyLabel: "Nenhum entregável enviado." },
                        { key: "aprovados", label: "Aprovados", icon: CheckCircle, files: pf.approvedFiles ?? [], emptyLabel: "Nenhum arquivo aprovado ainda." },
                      ];

                      const formatSize = (bytes: number | null) => {
                        if (!bytes) return null;
                        if (bytes < 1024) return `${bytes} B`;
                        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
                        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
                      };

                      const taskStatusLabel: Record<string, string> = {
                        PARA_LANCAMENTO: "Para Lançamento", EM_LANCAMENTO: "Em Lançamento",
                        LIBERADA_PARA_EXECUCAO: "Liberada", EM_EXECUCAO: "Em Execução",
                        EM_REVISAO: "Em Revisão", EM_APROVACAO: "Em Aprovação",
                        CONCLUIDA: "Concluída", CANCELADA: "Cancelada",
                      };

                      return (
                        <>
                          {/* Summary pills */}
                          <div className="flex items-center gap-2 flex-wrap">
                            {[
                              { label: "Total", value: summary.total, color: "slate" },
                              { label: "Referências", value: summary.initial, color: "blue" },
                              { label: "Internos", value: summary.internal, color: "violet" },
                              { label: "Entregáveis", value: summary.deliveries, color: "amber" },
                              { label: "Aprovados", value: summary.approved, color: "emerald" },
                            ].map((pill) => (
                              <div key={pill.label} className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm">
                                <span className="text-xs font-medium text-slate-500">{pill.label}</span>
                                <span className="text-sm font-bold text-slate-900">{pill.value}</span>
                              </div>
                            ))}
                          </div>

                          {/* File groups */}
                          {groups.map((group) => (
                            <div key={group.key} className="border border-slate-200/80 rounded-xl overflow-hidden shadow-sm bg-white">
                              <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50">
                                <group.icon className="h-3.5 w-3.5 text-slate-500" />
                                <span className="text-xs font-semibold text-slate-700">{group.label}</span>
                                <span className="ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-500">
                                  {group.files.length}
                                </span>
                              </div>

                              {group.files.length === 0 ? (
                                <div className="px-4 py-8 text-center text-slate-400 text-xs">
                                  {group.emptyLabel}
                                </div>
                              ) : (
                                <ul className="divide-y divide-slate-100">
                                  {group.files.map((file: any) => (
                                    <li key={file.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors group">
                                      <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                                        <FileText className="h-4 w-4 text-slate-400" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-slate-800 truncate">{file.name}</p>
                                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                          {file.task?.title && (
                                            <span className="text-[10px] text-slate-400 truncate max-w-[160px]">
                                              {file.task.title}
                                            </span>
                                          )}
                                          {file.task?.status && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">
                                              {taskStatusLabel[file.task.status] ?? file.task.status}
                                            </span>
                                          )}
                                          {file.product?.name && (
                                            <span className="text-[10px] text-blue-500 truncate max-w-[140px]">
                                              {file.product.name}
                                            </span>
                                          )}
                                          {formatSize(file.size) && (
                                            <span className="text-[10px] text-slate-300">
                                              {formatSize(file.size)}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      {file.isApproved && (
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600 font-semibold shrink-0">
                                          Aprovado
                                        </span>
                                      )}
                                      <a
                                        href={file.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="h-7 w-7 rounded-lg bg-slate-100 hover:bg-blue-100 flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100 transition-all"
                                        title="Abrir arquivo"
                                      >
                                        <ExternalLink className="h-3.5 w-3.5 text-slate-500 hover:text-blue-600" />
                                      </a>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
                        </>
                      );
                    })()}

                    {/* Not yet loaded */}
                    {!projectFilesLoading && !projectFilesData && (
                      <div className="border border-slate-200/80 rounded-xl overflow-hidden shadow-sm bg-white px-4 py-10 text-center text-slate-400 text-xs">
                        Abra esta aba para carregar os arquivos do projeto.
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent
                  value="cofre"
                  className="p-0 m-0 flex-1 overflow-y-auto bg-slate-200"
                >
                  <div className="px-[50px] pt-[25px] pb-[80px] space-y-4">
                    {/* Loading */}
                    {credentialsLoading && (
                      <div className="flex items-center justify-center py-16">
                        <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                    {/* Demo banner */}
                    {!credentialsLoading && mockCredentials.some((c) => c.is_demo) && (
                      <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-amber-700 text-xs font-medium">
                        <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
                        Estas credenciais são dados de demonstração. Não contêm senhas reais.
                      </div>
                    )}
                    {/* Stats bar */}
                    {!credentialsLoading && <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-2">
                        <div className="h-6 w-6 rounded-md bg-indigo-100 flex items-center justify-center">
                          <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
                        </div>
                        <span className="text-xs font-semibold text-slate-600">
                          Total
                        </span>
                        <span className="text-sm font-bold text-slate-900">
                          {mockCredentials.length}
                        </span>
                      </div>
                      {Array.from(
                        new Set(mockCredentials.map((c: any) => c.category)),
                      ).map((cat: any) => (
                        <div
                          key={cat}
                          className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-2"
                        >
                          <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
                          <span className="text-xs font-semibold text-slate-500">
                            {cat}
                          </span>
                          <span className="text-sm font-bold text-blue-600">
                            {
                              mockCredentials.filter(
                                (c: any) => c.category === cat,
                              ).length
                            }
                          </span>
                        </div>
                      ))}
                      <div className="ml-auto">
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 h-9 gap-2"
                          onClick={() => setShowAddCredentialDialog(true)}
                        >
                          <Plus className="h-4 w-4" />
                          Adicionar senha ao cofre
                        </Button>
                      </div>
                    </div>}

                    {/* Main card */}
                    {!credentialsLoading && <div className="border border-slate-200/70 shadow-sm overflow-hidden rounded-xl bg-white">
                      <div className="divide-y divide-slate-100">
                        {mockCredentials.map((credential: any) => (
                          <div
                            key={credential.id}
                            className="px-5 py-3.5 hover:bg-slate-50/60 transition-colors group"
                          >
                            <div className="flex items-center gap-4">
                              {/* Icon */}
                              <div className="relative flex-shrink-0">
                                {getFaviconUrl(credential.url) ? (
                                  <img
                                    src={getFaviconUrl(credential.url) || ""}
                                    alt={credential.title}
                                    className="w-9 h-9 rounded-xl border border-slate-200"
                                    onError={(e) => {
                                      e.currentTarget.style.display = "none";
                                      (
                                        e.currentTarget
                                          .nextElementSibling as HTMLElement
                                      )?.classList.remove("hidden");
                                    }}
                                  />
                                ) : null}
                                <div
                                  className={`w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-sm ${getFaviconUrl(credential.url) ? "hidden" : ""}`}
                                >
                                  {getInitials(credential.title)}
                                </div>
                              </div>

                              {/* Title + category */}
                              <div className="w-40 flex-shrink-0">
                                <p className="text-sm font-semibold text-slate-800 truncate">
                                  {credential.title}
                                </p>
                                <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 mt-0.5">
                                  {credential.category}
                                </span>
                              </div>

                              {/* Fields */}
                              <div className="flex-1 grid grid-cols-3 gap-2.5">
                                {/* URL */}
                                <div className="flex items-center gap-1.5 bg-slate-50 rounded-lg px-2.5 py-1.5 border border-slate-200/70 min-w-0">
                                  <span className="text-[9px] font-bold text-slate-400 shrink-0 uppercase tracking-wider">
                                    URL
                                  </span>
                                  <Input
                                    value={credential.url}
                                    readOnly
                                    className="h-5 text-[11px] bg-transparent border-0 p-0 focus-visible:ring-0 truncate min-w-0"
                                  />
                                  <div className="flex gap-0.5 shrink-0">
                                    <button
                                      onClick={() =>
                                        copyToClipboard(credential.url, "Link")
                                      }
                                      className="h-5 w-5 flex items-center justify-center rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
                                    >
                                      <Copy className="h-2.5 w-2.5" />
                                    </button>
                                    <button
                                      onClick={() =>
                                        window.open(credential.url, "_blank")
                                      }
                                      className="h-5 w-5 flex items-center justify-center rounded hover:bg-slate-200 text-slate-400 hover:text-blue-600 transition-colors"
                                    >
                                      <ExternalLink className="h-2.5 w-2.5" />
                                    </button>
                                  </div>
                                </div>

                                {/* Username */}
                                <div className="flex items-center gap-1.5 bg-slate-50 rounded-lg px-2.5 py-1.5 border border-slate-200/70 min-w-0">
                                  <span className="text-[9px] font-bold text-slate-400 shrink-0 uppercase tracking-wider">
                                    Usuário
                                  </span>
                                  <Input
                                    value={credential.username}
                                    readOnly
                                    className="h-5 text-[11px] bg-transparent border-0 p-0 focus-visible:ring-0 truncate min-w-0"
                                  />
                                  <button
                                    onClick={() =>
                                      copyToClipboard(
                                        credential.username,
                                        "Usuário",
                                      )
                                    }
                                    className="h-5 w-5 flex items-center justify-center rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors shrink-0"
                                  >
                                    <Copy className="h-2.5 w-2.5" />
                                  </button>
                                </div>

                                {/* Password */}
                                <div className="flex items-center gap-1.5 bg-slate-50 rounded-lg px-2.5 py-1.5 border border-slate-200/70 min-w-0">
                                  <span className="text-[9px] font-bold text-slate-400 shrink-0 uppercase tracking-wider">
                                    Senha
                                  </span>
                                  <Input
                                    type={
                                      visiblePasswords[credential.id]
                                        ? "text"
                                        : "password"
                                    }
                                    value={credential.password_demo ?? ""}
                                    readOnly
                                    className="h-5 text-[11px] bg-transparent border-0 p-0 focus-visible:ring-0 truncate min-w-0"
                                  />
                                  <div className="flex gap-0.5 shrink-0">
                                    <button
                                      onClick={() =>
                                        togglePasswordVisibility(credential.id)
                                      }
                                      className="h-5 w-5 flex items-center justify-center rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
                                    >
                                      {visiblePasswords[credential.id] ? (
                                        <EyeOff className="h-2.5 w-2.5" />
                                      ) : (
                                        <Eye className="h-2.5 w-2.5" />
                                      )}
                                    </button>
                                    <button
                                      onClick={() =>
                                        copyToClipboard(
                                          credential.password_demo ?? "",
                                          "Senha",
                                        )
                                      }
                                      className="h-5 w-5 flex items-center justify-center rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
                                    >
                                      <Copy className="h-2.5 w-2.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Status badges + shared avatars + actions */}
                              <div className="flex items-center gap-3 shrink-0">
                                {/* Status badge */}
                                {credential.status === "shared" && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                                    <Share2 className="h-2.5 w-2.5" /> Compartilhado
                                  </span>
                                )}
                                {credential.status === "rotation_required" && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                                    <RefreshCw className="h-2.5 w-2.5" /> Rotacionar
                                  </span>
                                )}
                                {credential.status === "archived" && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                                    Arquivado
                                  </span>
                                )}
                                {credential.status === "expired" && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                                    Expirado
                                  </span>
                                )}
                                {/* Shared nomad avatar */}
                                <div className="flex items-center -space-x-1.5">
                                  {credential.shared_with_nomad_id && (
                                    <div
                                      title={credential.shared_with_nomad_id}
                                      className="h-6 w-6 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 border-2 border-white flex items-center justify-center"
                                    >
                                      <span className="text-[8px] font-bold text-white">N</span>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => {
                                      setSelectedCredential(credential);
                                      setShowShareCredential(true);
                                    }}
                                    className="h-7 w-7 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-blue-50 text-slate-500 hover:text-blue-600 transition-colors"
                                    title="Compartilhar"
                                  >
                                    <Share2 className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleEditCredential(credential)
                                    }
                                    className="h-7 w-7 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 transition-colors"
                                    title="Editar"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingCredential(credential);
                                      setShowDeleteCredentialDialog(true);
                                    }}
                                    className="h-7 w-7 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                                    title="Excluir"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        {mockCredentials.length === 0 && (
                          <div className="py-16 text-center">
                            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                              <ShieldCheck className="h-6 w-6 text-slate-400" />
                            </div>
                            <p className="text-sm font-medium text-slate-500">
                              Nenhuma credencial salva
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                              Clique em "Adicionar senha ao cofre" para começar
                            </p>
                          </div>
                        )}
                      </div>
                    </div>}
                  </div>
                </TabsContent>

                {/* Tarefas */}
                <TabsContent
                  value="tarefas"
                  className="p-0 m-0 flex-1 overflow-y-auto bg-slate-200"
                >
                  {isUnpaid ? (
                    <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-5 px-8">
                      <div className="h-16 w-16 rounded-2xl bg-slate-100 border-2 border-slate-200 flex items-center justify-center">
                        <Lock className="h-8 w-8 text-slate-400" />
                      </div>
                      <div className="text-center max-w-sm">
                        <p className="text-sm font-semibold text-slate-700 mb-1">
                          Tarefas bloqueadas
                        </p>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          As tarefas serão criadas e ativadas após a confirmação
                          do pagamento.
                        </p>
                      </div>
                      {project?.status === "awaiting-payment" &&
                        onGoToPayment && (
                          <button
                            onClick={() => {
                              onOpenChange(false);
                              onGoToPayment();
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition-colors"
                          >
                            <CreditCard className="h-3.5 w-3.5" />
                            Ir para Pagamento
                          </button>
                        )}
                      {project?.status === "draft" && onContinueDraft && (
                        <button
                          onClick={() => {
                            onOpenChange(false);
                            onContinueDraft();
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg transition-colors"
                        >
                          Continuar Projeto
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="px-[50px] pt-[25px] pb-[80px] space-y-4">
                      {/* ── Stats bar ── */}
                      {(() => {
                        const allTasks = getAllTasks();
                        const stats = {
                          total: allTasks.length,
                          lancamento: allTasks.filter(
                            (t) => t.status === "Para lançamento",
                          ).length,
                          execucao: allTasks.filter(
                            (t) => t.status === "Em Execução",
                          ).length,
                          aprovada: allTasks.filter(
                            (t) => t.status === "Aprovada",
                          ).length,
                          aprovacao: allTasks.filter(
                            (t) => t.status === "Para Aprovação",
                          ).length,
                          entregue: allTasks.filter(
                            (t) => t.status === "Entregue",
                          ).length,
                          atrasada: allTasks.filter(
                            (t) => t.status === "Atrasada",
                          ).length,
                        };
                        return (
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-2">
                              <div className="h-6 w-6 rounded-md bg-indigo-100 flex items-center justify-center">
                                <CheckSquare className="h-3.5 w-3.5 text-indigo-600" />
                              </div>
                              <span className="text-xs font-semibold text-slate-600">
                                Total
                              </span>
                              <span className="text-sm font-bold text-slate-900">
                                {stats.total}
                              </span>
                            </div>
                            {stats.lancamento > 0 && (
                              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-2">
                                <div className="h-2 w-2 rounded-full bg-orange-400 flex-shrink-0" />
                                <span className="text-xs font-semibold text-slate-500">
                                  Para lançamento
                                </span>
                                <span className="text-sm font-bold text-orange-500">
                                  {stats.lancamento}
                                </span>
                              </div>
                            )}
                            {stats.execucao > 0 && (
                              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-2">
                                <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
                                <span className="text-xs font-semibold text-slate-500">
                                  Em Execução
                                </span>
                                <span className="text-sm font-bold text-blue-600">
                                  {stats.execucao}
                                </span>
                              </div>
                            )}
                            {stats.aprovada > 0 && (
                              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-2">
                                <div className="h-2 w-2 rounded-full bg-emerald-500 flex-shrink-0" />
                                <span className="text-xs font-semibold text-slate-500">
                                  Aprovadas
                                </span>
                                <span className="text-sm font-bold text-emerald-600">
                                  {stats.aprovada}
                                </span>
                              </div>
                            )}
                            {stats.aprovacao > 0 && (
                              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-2">
                                <div className="h-2 w-2 rounded-full bg-amber-400 flex-shrink-0" />
                                <span className="text-xs font-semibold text-slate-500">
                                  Para Aprovação
                                </span>
                                <span className="text-sm font-bold text-amber-500">
                                  {stats.aprovacao}
                                </span>
                              </div>
                            )}
                            {stats.entregue > 0 && (
                              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-2">
                                <div className="h-2 w-2 rounded-full bg-purple-500 flex-shrink-0" />
                                <span className="text-xs font-semibold text-slate-500">
                                  Entregues
                                </span>
                                <span className="text-sm font-bold text-purple-600">
                                  {stats.entregue}
                                </span>
                              </div>
                            )}
                            {stats.atrasada > 0 && (
                              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-2">
                                <div className="h-2 w-2 rounded-full bg-red-400 flex-shrink-0" />
                                <span className="text-xs font-semibold text-slate-500">
                                  Atrasadas
                                </span>
                                <span className="text-sm font-bold text-red-500">
                                  {stats.atrasada}
                                </span>
                              </div>
                            )}
                          </div>
                        );
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
                              onChange={(e) => {
                                setTaskSearchTerm(e.target.value);
                                setTasksCurrentPage(1);
                              }}
                              className="w-full pl-9 pr-3 h-9 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                            />
                          </div>

                          {/* Lista / Kanban toggle */}
                          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden flex-shrink-0">
                            <button
                              onClick={() => setTasksViewMode("list")}
                              className={`flex items-center gap-1.5 h-9 px-3 text-xs font-medium transition-colors ${
                                tasksViewMode === "list"
                                  ? "bg-slate-900 text-white"
                                  : "bg-white text-slate-600 hover:bg-slate-50"
                              }`}
                            >
                              <List className="h-3.5 w-3.5" />
                              Lista
                            </button>
                            <button
                              onClick={() => setTasksViewMode("kanban")}
                              className={`flex items-center gap-1.5 h-9 px-3 text-xs font-medium transition-colors border-l border-slate-200 ${
                                tasksViewMode === "kanban"
                                  ? "bg-slate-900 text-white"
                                  : "bg-white text-slate-600 hover:bg-slate-50"
                              }`}
                            >
                              <LayoutGrid className="h-3.5 w-3.5" />
                              Kanban
                            </button>
                          </div>

                          {/* Items per page + count */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Select
                              value={tasksPerPage.toString()}
                              onValueChange={(v) => {
                                setTasksPerPage(parseInt(v));
                                setTasksCurrentPage(1);
                              }}
                            >
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
                              de{" "}
                              <span className="font-semibold text-slate-600">
                                {getFilteredAndSortedTasks().length}
                              </span>{" "}
                              tarefa
                              {getFilteredAndSortedTasks().length !== 1
                                ? "s"
                                : ""}
                            </span>
                          </div>

                          {/* Filtros */}
                          <button
                            onClick={() => setShowTaskFilters(!showTaskFilters)}
                            className={`flex items-center gap-1.5 h-9 px-3.5 text-xs font-medium rounded-lg border transition-colors flex-shrink-0 ${
                              showTaskFilters
                                ? "border-blue-400 bg-blue-50 text-blue-700"
                                : "border-slate-200 text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            <Filter className="h-3.5 w-3.5" />
                            Filtros
                          </button>

                          {/* Pagination */}
                          <div className="flex items-center gap-0.5 flex-shrink-0">
                            <button
                              onClick={() =>
                                setTasksCurrentPage((p) => Math.max(1, p - 1))
                              }
                              disabled={tasksCurrentPage === 1}
                              className="h-7 w-7 flex items-center justify-center rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                            >
                              <ChevronDown className="h-3.5 w-3.5 rotate-90" />
                            </button>
                            {(() => {
                              const totalPages = getTotalTaskPages() || 1;
                              const pages: (number | string)[] = [];
                              if (totalPages <= 7) {
                                for (let i = 1; i <= totalPages; i++)
                                  pages.push(i);
                              } else {
                                pages.push(1);
                                if (tasksCurrentPage > 3) pages.push("...");
                                for (
                                  let i = Math.max(2, tasksCurrentPage - 1);
                                  i <=
                                  Math.min(
                                    totalPages - 1,
                                    tasksCurrentPage + 1,
                                  );
                                  i++
                                )
                                  pages.push(i);
                                if (tasksCurrentPage < totalPages - 2)
                                  pages.push("...");
                                pages.push(totalPages);
                              }
                              return pages.map((page, idx) =>
                                page === "..." ? (
                                  <span
                                    key={idx}
                                    className="text-xs text-slate-300 px-0.5"
                                  >
                                    ·
                                  </span>
                                ) : (
                                  <button
                                    key={idx}
                                    onClick={() =>
                                      setTasksCurrentPage(Number(page))
                                    }
                                    className={`h-7 w-7 flex items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                                      page === tasksCurrentPage
                                        ? "bg-blue-500 text-white shadow-sm"
                                        : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                                    }`}
                                  >
                                    {page}
                                  </button>
                                ),
                              );
                            })()}
                            <button
                              onClick={() =>
                                setTasksCurrentPage((p) =>
                                  Math.min(getTotalTaskPages(), p + 1),
                                )
                              }
                              disabled={
                                tasksCurrentPage === getTotalTaskPages() ||
                                getTotalTaskPages() === 0
                              }
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
                                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 block">
                                  Status
                                </label>
                                <Select
                                  value={taskStatusFilter}
                                  onValueChange={setTaskStatusFilter}
                                >
                                  <SelectTrigger className="h-8 text-xs border-slate-200">
                                    <SelectValue placeholder="Todos" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    <SelectItem value="Para lançamento">
                                      Para lançamento
                                    </SelectItem>
                                    <SelectItem value="Em Execução">
                                      Em Execução
                                    </SelectItem>
                                    <SelectItem value="Aprovada">
                                      Aprovada
                                    </SelectItem>
                                    <SelectItem value="Para Aprovação">
                                      Para Aprovação
                                    </SelectItem>
                                    <SelectItem value="Entregue">
                                      Entregue
                                    </SelectItem>
                                    <SelectItem value="Atrasada">
                                      Atrasada
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 block">
                                  Produto
                                </label>
                                <Select
                                  value={taskProductFilter}
                                  onValueChange={setTaskProductFilter}
                                >
                                  <SelectTrigger className="h-8 text-xs border-slate-200">
                                    <SelectValue placeholder="Todos" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    {mockData.produtos.map((produto) => (
                                      <SelectItem
                                        key={produto.id}
                                        value={produto.id.toString()}
                                      >
                                        {produto.nome}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 block">
                                  Ordenar por
                                </label>
                                <div className="flex gap-1.5">
                                  <Select
                                    value={taskSortBy}
                                    onValueChange={setTaskSortBy}
                                  >
                                    <SelectTrigger className="h-8 text-xs flex-1 border-slate-200">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="produto">
                                        Produto
                                      </SelectItem>
                                      <SelectItem value="nome">Nome</SelectItem>
                                      <SelectItem value="status">
                                        Status
                                      </SelectItem>
                                      <SelectItem value="prazo">
                                        Prazo
                                      </SelectItem>
                                      <SelectItem value="executor">
                                        Executor
                                      </SelectItem>
                                      <SelectItem value="lider">
                                        Líder
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <button
                                    onClick={() =>
                                      setTaskSortOrder(
                                        taskSortOrder === "asc"
                                          ? "desc"
                                          : "asc",
                                      )
                                    }
                                    className="h-8 w-8 flex items-center justify-center border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-slate-500"
                                  >
                                    {taskSortOrder === "asc" ? (
                                      <ArrowUp className="h-3.5 w-3.5" />
                                    ) : (
                                      <ArrowDown className="h-3.5 w-3.5" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                            <div className="flex justify-end mt-2">
                              <button
                                onClick={() => {
                                  setTaskStatusFilter("all");
                                  setTaskProductFilter("all");
                                  setTaskDateFilter("");
                                  setTaskSortBy("produto");
                                  setTaskSortOrder("asc");
                                  setTaskSearchTerm("");
                                }}
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
                                <div key={tarefa.uniqueId}>
                                  <div
                                    className={`flex items-center gap-4 px-5 py-3 transition-all ${
                                      idx % 2 === 0
                                        ? "bg-white hover:bg-slate-50"
                                        : "bg-slate-200/50 hover:bg-slate-200/70"
                                    }`}
                                    style={{
                                      borderLeft: `3px solid ${getStatusBorderColor(tarefa.status)}`,
                                    }}
                                  >
                                    {/* T-Code */}
                                    <div className="flex items-center justify-center bg-blue-50 rounded-lg px-2.5 py-1 shrink-0 border border-blue-100">
                                      <span className="text-[11px] text-blue-600 font-bold font-mono tracking-wider">
                                        {tarefa.tarefaCode ??
                                          `#${tarefa.uniqueId}`}
                                      </span>
                                    </div>

                                    {/* Main info */}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                        <span
                                          className={`text-sm font-semibold ${tarefa.status === "Atrasada" ? "text-red-600" : "text-slate-900"}`}
                                        >
                                          {tarefa.nome}
                                        </span>
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium border border-slate-200 shrink-0">
                                          {tarefa.produtoNome}
                                        </span>
                                        {tarefa.etapas?.length > 0 && (
                                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 font-medium border border-violet-200 shrink-0">
                                            {tarefa.etapas.length} etapa
                                            {tarefa.etapas.length !== 1
                                              ? "s"
                                              : ""}
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2.5 text-[11px] text-slate-400 flex-wrap">
                                        <span className="flex items-center gap-1">
                                          <Calendar className="h-3 w-3" />
                                          <span className="font-medium text-slate-600">
                                            {tarefa.prazo}
                                          </span>
                                        </span>
                                        {(() => {
                                          const expiry =
                                            getLancamentoExpiryBadge(tarefa);
                                          return expiry ? (
                                            <span
                                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${expiry.className}`}
                                            >
                                              {expiry.label}
                                            </span>
                                          ) : null;
                                        })()}
                                      </div>
                                    </div>

                                    {/* Status pill + expand + eye */}
                                    <div className="flex items-center gap-2 shrink-0">
                                      {tarefa.status === "Para lançamento" ? (
                                        <button
                                          onClick={() => openLaunchDrawer(tarefa)}
                                          title={tarefa.rawStatus === "EM_LANCAMENTO" || tarefa.rawStatus === "AGUARDANDO_INFORMACOES" ? "Clique para continuar o lançamento" : "Clique para lançar a tarefa"}
                                          className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border cursor-pointer hover:opacity-80 hover:ring-2 hover:ring-orange-300 transition-all ${getStatusBadgeColor(tarefa.status)}`}
                                        >
                                          <span
                                            className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${getStatusDotClass(tarefa.status)}`}
                                          />
                                          {tarefa.status}
                                        </button>
                                      ) : (
                                        <div
                                          className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border ${getStatusBadgeColor(tarefa.status)}`}
                                        >
                                          <span
                                            className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${getStatusDotClass(tarefa.status)}`}
                                          />
                                          {tarefa.status}
                                        </div>
                                      )}
                                      {tarefa.etapas?.length > 0 && (
                                        <button
                                          onClick={() =>
                                            setExpandedTasks((prev) => {
                                              const next = new Set(prev);
                                              next.has(tarefa.uniqueId)
                                                ? next.delete(tarefa.uniqueId)
                                                : next.add(tarefa.uniqueId);
                                              return next;
                                            })
                                          }
                                          className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                                          title={
                                            expandedTasks.has(tarefa.uniqueId)
                                              ? "Ocultar etapas"
                                              : "Ver etapas"
                                          }
                                        >
                                          {expandedTasks.has(
                                            tarefa.uniqueId,
                                          ) ? (
                                            <ChevronDown className="h-3.5 w-3.5" />
                                          ) : (
                                            <ChevronRight className="h-3.5 w-3.5" />
                                          )}
                                        </button>
                                      )}
                                      <button
                                        onClick={() => openTaskDrawer(tarefa)}
                                        className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                        title="Visualizar detalhes da tarefa"
                                      >
                                        <Eye className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Etapas expandíveis */}
                                  {expandedTasks.has(tarefa.uniqueId) &&
                                    tarefa.etapas?.length > 0 && (
                                      <div
                                        className="border-t border-slate-100"
                                        style={{
                                          borderLeft: `3px solid ${getStatusBorderColor(tarefa.status)}`,
                                        }}
                                      >
                                        {tarefa.etapas.map(
                                          (etapa: any, etapaIdx: number) => {
                                            const etapaStatusColor: Record<
                                              string,
                                              string
                                            > = {
                                              PENDENTE:
                                                "text-slate-400 bg-slate-50 border-slate-200",
                                              EM_ANDAMENTO:
                                                "text-blue-600 bg-blue-50 border-blue-200",
                                              CONCLUIDA:
                                                "text-emerald-600 bg-emerald-50 border-emerald-200",
                                              BLOQUEADA:
                                                "text-red-500 bg-red-50 border-red-200",
                                            };
                                            const etapaStatusLabel: Record<
                                              string,
                                              string
                                            > = {
                                              PENDENTE: "Pendente",
                                              EM_ANDAMENTO: "Em andamento",
                                              CONCLUIDA: "Concluída",
                                              BLOQUEADA: "Bloqueada",
                                            };
                                            return (
                                              <div
                                                key={etapa.id}
                                                className={`flex items-start gap-3 pl-14 pr-5 py-2.5 border-b border-slate-100/70 last:border-b-0 ${etapa.status === "CONCLUIDA" ? "bg-emerald-50/30" : "bg-slate-50/80"}`}
                                              >
                                                <span className="text-[10px] font-bold text-slate-400 w-5 text-center shrink-0 mt-0.5">
                                                  {etapaIdx + 1}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                  <span className="text-xs text-slate-700 font-medium">
                                                    {etapa.titulo}
                                                  </span>
                                                  {etapa.dependeAnterior &&
                                                    etapaIdx > 0 && (
                                                      <span className="ml-2 inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200 font-medium">
                                                        <svg
                                                          className="h-2 w-2"
                                                          viewBox="0 0 16 16"
                                                          fill="currentColor"
                                                        >
                                                          <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zM7 4a1 1 0 0 1 2 0v4a1 1 0 0 1-2 0V4zm1 8a1.25 1.25 0 1 1 0-2.5A1.25 1.25 0 0 1 8 12z" />
                                                        </svg>
                                                        Aguarda anterior
                                                      </span>
                                                    )}
                                                  {etapa.descricao && (
                                                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                                                      {etapa.descricao}
                                                    </p>
                                                  )}
                                                </div>
                                                <span
                                                  className={`text-[10px] px-2 py-0.5 rounded-full border font-medium shrink-0 ${etapaStatusColor[etapa.status] ?? "text-slate-400 bg-slate-50 border-slate-200"}`}
                                                >
                                                  {etapaStatusLabel[
                                                    etapa.status
                                                  ] ?? etapa.status}
                                                </span>
                                              </div>
                                            );
                                          },
                                        )}
                                      </div>
                                    )}
                                </div>
                              ))
                            ) : (
                              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                                {loadingModalData ? (
                                  <>
                                    <Loader2 className="h-6 w-6 animate-spin mb-2" />
                                    <p className="text-xs">
                                      Carregando tarefas...
                                    </p>
                                  </>
                                ) : (
                                  <>
                                    <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                                      <CheckSquare className="h-7 w-7 opacity-40" />
                                    </div>
                                    <p className="text-sm font-medium text-slate-500">
                                      Nenhuma tarefa encontrada
                                    </p>
                                    <p className="text-xs text-slate-400 mt-1">
                                      Tente ajustar os filtros ou a busca
                                    </p>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex gap-3 overflow-x-auto px-5 pb-4 pt-4">
                            {[
                              "Para lançamento",
                              "Em Execução",
                              "Para Aprovação",
                              "Aprovada",
                              "Entregue",
                              "Atrasada",
                            ].map((status) => {
                              const statusTasks =
                                getFilteredAndSortedTasks().filter(
                                  (t) => t.status === status,
                                );
                              const columnColor = getStatusBorderColor(status);
                              return (
                                <div
                                  key={status}
                                  className="flex-shrink-0 w-64"
                                >
                                  <div
                                    className="rounded-t-xl p-2.5 mb-2"
                                    style={{
                                      background: `linear-gradient(135deg, ${columnColor}15, ${columnColor}30)`,
                                      borderBottom: `3px solid ${columnColor}`,
                                    }}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-1.5">
                                        <span
                                          className={`h-2 w-2 rounded-full ${getStatusDotClass(status)}`}
                                        />
                                        <span
                                          className="font-semibold text-xs"
                                          style={{ color: columnColor }}
                                        >
                                          {status}
                                        </span>
                                      </div>
                                      <span
                                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-full border"
                                        style={{
                                          borderColor: columnColor,
                                          color: columnColor,
                                        }}
                                      >
                                        {statusTasks.length}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                                    {statusTasks.length > 0 ? (
                                      statusTasks.map((tarefa) => (
                                        <div
                                          key={tarefa.uniqueId}
                                          className="bg-white rounded-lg p-2.5 shadow-sm border-l-4 hover:shadow-md transition-all"
                                          style={{
                                            borderLeftColor: columnColor,
                                          }}
                                        >
                                          <div className="flex items-center justify-between gap-1 mb-1.5">
                                            <div className="flex items-center justify-center bg-blue-50 rounded px-1.5 py-0.5">
                                              <span className="text-[9px] text-blue-600 font-bold">
                                                #{tarefa.uniqueId}
                                              </span>
                                            </div>
                                            <button className="h-5 w-5 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-colors">
                                              <Eye className="h-3 w-3" />
                                            </button>
                                          </div>
                                          <p className="font-semibold text-xs text-slate-800 line-clamp-2 mb-1.5">
                                            {tarefa.nome}
                                          </p>
                                          <span className="inline-block text-[9px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 mb-1.5">
                                            {tarefa.produtoNome}
                                          </span>
                                          <div className="space-y-0.5 text-[9px] text-slate-400 pt-1.5 border-t border-slate-100">
                                            <div className="flex items-center gap-1">
                                              <User className="h-2.5 w-2.5" />
                                              <span className="font-medium text-slate-600">
                                                {canSeeNomadNames
                                                  ? tarefa.executor
                                                  : "Nômade"}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                              <Users className="h-2.5 w-2.5" />
                                              <span className="font-medium text-slate-600">
                                                {canSeeNomadNames
                                                  ? tarefa.lider
                                                  : "Equipe Allka"}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                              <Calendar className="h-2.5 w-2.5" />
                                              <span className="font-medium text-slate-600">
                                                {tarefa.prazo}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      ))
                                    ) : (
                                      <div className="flex items-center justify-center h-20 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                                        <p className="text-[10px] text-slate-400">
                                          Sem tarefas
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* Faturamento */}
                <TabsContent
                  value="faturamento"
                  className="p-0 m-0 flex-1 overflow-y-auto"
                >
                  {isUnpaid ? (
                    <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-5 px-8">
                      <div className="h-16 w-16 rounded-2xl bg-slate-100 border-2 border-slate-200 flex items-center justify-center">
                        <Lock className="h-8 w-8 text-slate-400" />
                      </div>
                      <div className="text-center max-w-sm">
                        <p className="text-sm font-semibold text-slate-700 mb-1">
                          Faturamento bloqueado
                        </p>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          As faturas e cobranças serão geradas após a
                          confirmação do pagamento.
                        </p>
                      </div>
                      {project?.status === "awaiting-payment" &&
                        onGoToPayment && (
                          <button
                            onClick={() => {
                              onOpenChange(false);
                              onGoToPayment();
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition-colors"
                          >
                            <CreditCard className="h-3.5 w-3.5" />
                            Ir para Pagamento
                          </button>
                        )}
                      {project?.status === "draft" && onContinueDraft && (
                        <button
                          onClick={() => {
                            onOpenChange(false);
                            onContinueDraft();
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg transition-colors"
                        >
                          Continuar Projeto
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col h-full">
                      {/* Sub-tab toggle bar */}
                      <div className="flex border-b border-slate-200 bg-white px-6 pt-3 shrink-0">
                        <button
                          onClick={() => setFaturamentoSubTab("faturas")}
                          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all mr-2 ${
                            faturamentoSubTab === "faturas"
                              ? "border-blue-500 text-blue-600"
                              : "border-transparent text-slate-500 hover:text-slate-700"
                          }`}
                        >
                          <FileText className="h-3.5 w-3.5" />
                          Faturas
                          <span
                            className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${faturamentoSubTab === "faturas" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}
                          >
                            {mockInvoices.length}
                          </span>
                        </button>
                        <button
                          onClick={() =>
                            setFaturamentoSubTab("formas-pagamento")
                          }
                          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
                            faturamentoSubTab === "formas-pagamento"
                              ? "border-blue-500 text-blue-600"
                              : "border-transparent text-slate-500 hover:text-slate-700"
                          }`}
                        >
                          <CreditCard className="h-3.5 w-3.5" />
                          Formas de Pagamento
                        </button>
                      </div>

                      {/* ── Faturas sub-tab ─────────────────────────────────── */}
                      {faturamentoSubTab === "faturas" && (
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                          {/* MENSAL: billing info card */}
                          {dadosProjForm.lifecycle === "Mensal" &&
                            (() => {
                              const overdueInvoices = mockInvoices.filter(
                                (inv: any) => inv.status === "overdue" || inv.status === "pending",
                              );
                              const today = new Date();
                              const billingDay =
                                dadosProjForm.diaCobranca || 15;
                              const nextDate = new Date(
                                today.getFullYear(),
                                today.getMonth() +
                                  (today.getDate() >= billingDay ? 1 : 0),
                                billingDay,
                              );
                              const nextBillingStr =
                                nextDate.toLocaleDateString("pt-BR");
                              return (
                                <>
                                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                                    <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                                    <div className="flex-1">
                                      <p className="text-sm font-semibold text-blue-900">
                                        Plano Mensal
                                      </p>
                                      <div className="grid grid-cols-2 gap-3 mt-2">
                                        <div>
                                          <p className="text-[10px] text-blue-600 uppercase font-semibold">
                                            Dia de Cobrança
                                          </p>
                                          <p className="text-sm font-bold text-blue-900">
                                            Dia {billingDay}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-[10px] text-blue-600 uppercase font-semibold">
                                            Próxima Cobrança
                                          </p>
                                          <p className="text-sm font-bold text-blue-900">
                                            {nextBillingStr}
                                          </p>
                                        </div>
                                      </div>
                                      <p className="text-xs text-blue-700 mt-2 opacity-80">
                                        Projetos mensais possuem data de
                                        cobrança fixa. O não pagamento até a
                                        data da próxima cobrança resultará no
                                        cancelamento automático do projeto.
                                      </p>
                                    </div>
                                  </div>
                                  {overdueInvoices.length > 0 && (
                                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                                      <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                                      <div className="flex-1">
                                        <p className="text-sm font-semibold text-red-800">
                                          ⚠️ {overdueInvoices.length} fatura(s)
                                          em aberto
                                        </p>
                                        <p className="text-xs text-red-700 mt-0.5">
                                          O projeto será cancelado
                                          automaticamente antes da próxima
                                          cobrança caso não seja regularizado.
                                          Para reativar após o cancelamento,
                                          pague as faturas em aberto ou clone o
                                          projeto.
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                </>
                              );
                            })()}

                          {/* Cancelled project: reactivation banner */}
                          {(project?.status === "cancelled" ||
                            project?.status === "canceled") && (
                            <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-center justify-between gap-4">
                              <div className="flex items-start gap-3">
                                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                                <div>
                                  <p className="text-sm font-semibold text-amber-900">
                                    Projeto cancelado por inadimplência
                                  </p>
                                  <p className="text-xs text-amber-700 mt-0.5">
                                    Pague as faturas em aberto para reativar, ou
                                    crie um novo projeto com base neste.
                                  </p>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                className="bg-amber-500 hover:bg-amber-600 text-white shrink-0"
                                onClick={() => setShowReativarDialog(true)}
                              >
                                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                                Reativar Projeto
                              </Button>
                            </div>
                          )}

                          {/* AVULSO: all tasks completed banner */}
                          {dadosProjForm.lifecycle === "Avulso" &&
                            (() => {
                              const allTarefas = mockData.produtos.flatMap(
                                (p: any) => p.tarefas || [],
                              );
                              const allTasksDone =
                                allTarefas.length > 0 &&
                                allTarefas.every(
                                  (t: any) =>
                                    t.status === "Entregue" ||
                                    t.status === "Aprovada",
                                );
                              if (!allTasksDone) return null;
                              return (
                                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
                                  <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                                  <div>
                                    <p className="text-sm font-semibold text-emerald-800">
                                      Projeto Concluído — Projeto Avulso
                                    </p>
                                    <p className="text-xs text-emerald-700 mt-0.5">
                                      Todas as tarefas foram entregues. Este
                                      projeto foi marcado como{" "}
                                      <strong>Concluído</strong>. Para reativar
                                      e manter o histórico em um só lugar,
                                      acesse a aba Produtos e adicione novos
                                      itens.
                                    </p>
                                  </div>
                                </div>
                              );
                            })()}

                          {/* Summary Cards */}
                          <div className="grid grid-cols-3 gap-4 pb-4 border-b">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">
                                Última Forma de Pagamento
                              </p>
                              <p className="text-sm font-semibold">Carteira</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">
                                Último Pagamento
                              </p>
                              <p className="text-sm font-semibold">
                                15/10/2025
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">
                                Próxima Cobrança
                              </p>
                              <p className="text-sm font-semibold">
                                15/11/2025
                              </p>
                            </div>
                          </div>

                          {/* Billing loading */}
                          {billingLoading && (
                            <div className="flex items-center justify-center py-8">
                              <div className="h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                          )}

                          {/* Summary pills */}
                          {!billingLoading && billingSummary && (
                            <div className="flex flex-wrap gap-2">
                              <div className="flex items-center gap-1.5 bg-slate-100 rounded-lg px-3 py-1.5">
                                <span className="text-xs text-slate-500">Total</span>
                                <span className="text-sm font-bold text-slate-900">
                                  R$ {(billingSummary.totalAmount ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
                                <span className="text-xs text-green-600">Pago</span>
                                <span className="text-sm font-bold text-green-700">
                                  R$ {(billingSummary.paidAmount ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                              {(billingSummary.pendingAmount ?? 0) > 0 && (
                                <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                                  <span className="text-xs text-amber-600">Pendente</span>
                                  <span className="text-sm font-bold text-amber-700">
                                    R$ {billingSummary.pendingAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                              )}
                              {(billingSummary.overdueAmount ?? 0) > 0 && (
                                <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
                                  <span className="text-xs text-red-600">Em atraso</span>
                                  <span className="text-sm font-bold text-red-700">
                                    R$ {billingSummary.overdueAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Invoices table */}
                          {!billingLoading && <div>
                            <h3 className="text-sm font-semibold mb-2">
                              Faturas
                            </h3>
                            <p className="text-xs text-muted-foreground mb-3">
                              {mockInvoices.length} registro(s) encontrados.
                            </p>
                            <div className="border rounded-lg overflow-hidden">
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-muted/50">
                                    <TableHead className="text-xs font-semibold">
                                      SITUAÇÃO
                                    </TableHead>
                                    <TableHead className="text-xs font-semibold">
                                      FATURA
                                    </TableHead>
                                    <TableHead className="text-xs font-semibold">
                                      DESCRIÇÃO
                                    </TableHead>
                                    <TableHead className="text-xs font-semibold">
                                      VENCIMENTO
                                    </TableHead>
                                    <TableHead className="text-xs font-semibold">
                                      VALOR
                                    </TableHead>
                                    <TableHead className="text-xs font-semibold text-right">
                                      AÇÕES
                                    </TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {mockInvoices.map((invoice) => {
                                    const statusLabel = invoice.status === "paid" ? "Pago" : invoice.status === "overdue" ? "Atrasado" : invoice.status === "cancelled" ? "Cancelado" : "Pendente";
                                    const statusClass = invoice.status === "paid" ? "bg-green-500 hover:bg-green-600" : invoice.status === "overdue" ? "bg-red-500 hover:bg-red-600" : invoice.status === "cancelled" ? "bg-slate-400 hover:bg-slate-500" : "bg-yellow-500 hover:bg-yellow-600";
                                    return (
                                    <TableRow
                                      key={invoice.id}
                                      className="hover:bg-muted/30"
                                    >
                                      <TableCell className="py-2">
                                        <Badge className={`${statusClass} text-white text-xs`}>
                                          {statusLabel}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="text-xs font-medium">
                                        {invoice.invoice_number ?? invoice.id.slice(-8).toUpperCase()}
                                      </TableCell>
                                      <TableCell className="text-xs max-w-[180px] truncate">
                                        {invoice.description ?? "—"}
                                      </TableCell>
                                      <TableCell className="text-xs">
                                        {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString("pt-BR") : "—"}
                                      </TableCell>
                                      <TableCell className="text-xs font-semibold">
                                        R$ {(invoice.amount ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 w-7 p-0 bg-blue-100 hover:bg-blue-200"
                                            onClick={() => {
                                              setSelectedInvoice(invoice);
                                              setShowInvoiceDetails(true);
                                            }}
                                          >
                                            <Eye className="h-3.5 w-3.5 text-blue-700" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 w-7 p-0 bg-yellow-100 hover:bg-yellow-200"
                                            onClick={() =>
                                              handleDownloadInvoicePDF(invoice)
                                            }
                                          >
                                            <Download className="h-3.5 w-3.5 text-yellow-700" />
                                          </Button>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                    );
                                  })}
                                  {mockInvoices.length === 0 && (
                                    <TableRow>
                                      <TableCell colSpan={6} className="text-center text-xs text-slate-400 py-8">
                                        Nenhuma fatura encontrada para este projeto.
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </TableBody>
                              </Table>
                            </div>
                          </div>}
                        </div>
                      )}

                      {/* ── Formas de Pagamento sub-tab ─────────────────────── */}
                      {faturamentoSubTab === "formas-pagamento" && (
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                          <h3 className="text-lg font-semibold">
                            Formas de Pagamento
                          </h3>

                          {/* Info Banner */}
                          <Card className="p-4 bg-blue-50 border-blue-200">
                            <div className="flex items-start gap-3">
                              <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <h4 className="font-semibold text-sm text-blue-900 mb-1">
                                  Forma de faturamento padrão
                                </h4>
                                <p className="text-xs text-blue-800">
                                  Selecione abaixo qual deverá ser a forma de
                                  faturamento padrão caso a forma de faturamento
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
                                  <div className="font-medium text-xs">
                                    CARTÃO DE CRÉDITO
                                  </div>
                                  {savedCards.find((c) => c.isDefault) && (
                                    <div className="text-[10px] text-gray-500 mt-0.5">
                                      {
                                        savedCards.find((c) => c.isDefault)
                                          ?.number
                                      }{" "}
                                      •{" "}
                                      {
                                        savedCards.find((c) => c.isDefault)
                                          ?.name
                                      }
                                    </div>
                                  )}
                                </div>
                              </div>
                              <input
                                type="radio"
                                name="payment-method"
                                value="cartao"
                                checked={defaultPaymentMethod === "cartao"}
                                onChange={(e) =>
                                  setDefaultPaymentMethod(e.target.value)
                                }
                                className="w-4 h-4"
                              />
                            </label>

                            {defaultPaymentMethod === "cartao" && (
                              <Card className="p-4 ml-11 bg-gray-50 border-gray-200">
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-xs font-semibold text-gray-700">
                                      Cartões Salvos
                                    </h4>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-xs bg-transparent"
                                    >
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
                                          <div className="text-xs font-medium">
                                            {card.number}
                                          </div>
                                          <div className="text-[10px] text-gray-500">
                                            {card.name} • Exp: {card.expiry}
                                          </div>
                                        </div>
                                        {card.isDefault && (
                                          <Badge className="bg-blue-100 text-blue-700 text-[9px] px-1.5 py-0">
                                            Padrão
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="flex gap-1">
                                        {!card.isDefault && (
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 w-6 p-0"
                                            onClick={() => {
                                              setSavedCards(
                                                savedCards.map((c) => ({
                                                  ...c,
                                                  isDefault: c.id === card.id,
                                                })),
                                              );
                                              toast({
                                                description:
                                                  "Cartão definido como padrão",
                                              });
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
                                            setSavedCards(
                                              savedCards.filter(
                                                (c) => c.id !== card.id,
                                              ),
                                            );
                                            toast({
                                              description: "Cartão removido",
                                            });
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
                                  <div className="font-medium text-xs">
                                    CARTEIRA
                                  </div>
                                  <div className="text-[10px] text-gray-500 mt-0.5">
                                    Saldo: R${" "}
                                    {walletBalance.toLocaleString("pt-BR", {
                                      minimumFractionDigits: 2,
                                    })}
                                  </div>
                                </div>
                              </div>
                              <input
                                type="radio"
                                name="payment-method"
                                value="carteira"
                                checked={defaultPaymentMethod === "carteira"}
                                onChange={(e) =>
                                  setDefaultPaymentMethod(e.target.value)
                                }
                                className="w-4 h-4"
                              />
                            </label>

                            {defaultPaymentMethod === "carteira" && (
                              <Card className="p-4 ml-11 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="text-xs text-green-700 mb-1">
                                      Saldo Disponível
                                    </div>
                                    <div className="text-2xl font-bold text-green-900">
                                      R${" "}
                                      {walletBalance.toLocaleString("pt-BR", {
                                        minimumFractionDigits: 2,
                                      })}
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
                                  <div className="font-medium text-xs">
                                    BOLETO
                                  </div>
                                  <div className="text-[10px] text-gray-500 mt-0.5">
                                    Pagamento via código de barras
                                  </div>
                                </div>
                              </div>
                              <input
                                type="radio"
                                name="payment-method"
                                value="boleto"
                                checked={defaultPaymentMethod === "boleto"}
                                onChange={(e) =>
                                  setDefaultPaymentMethod(e.target.value)
                                }
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
                                  <div className="text-[10px] text-gray-500 mt-0.5">
                                    Transferência instantânea
                                  </div>
                                </div>
                              </div>
                              <input
                                type="radio"
                                name="payment-method"
                                value="pix"
                                checked={defaultPaymentMethod === "pix"}
                                onChange={(e) =>
                                  setDefaultPaymentMethod(e.target.value)
                                }
                                className="w-4 h-4"
                              />
                            </label>

                            {/* Allkoin */}
                            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors relative overflow-hidden">
                              <div className="flex items-center gap-2.5 flex-1">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 via-blue-600 to-blue-800 flex items-center justify-center shadow-lg">
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                    className="h-5 w-5 text-white"
                                  >
                                    <path d="M12 2C11.5 2 11 2.19 10.59 2.59L8 5.17L5.41 2.59C5 2.19 4.5 2 4 2C2.9 2 2 2.9 2 4C2 4.5 2.19 5 2.59 5.41L4 6.83V9C4 10.1 4.9 11 6 11H7L6 13L4 14C3.45 14 3 14.45 3 15V17C3 17.55 3.45 18 4 18H6V20C6 21.1 6.9 22 8 22H16C17.1 22 18 21.1 18 20V18H20C20.55 18 21 17.55 21 17V15C21 14.45 20.55 14 20 14L18 13L17 11H18C19.1 11 20 10.1 20 9V6.83L21.41 5.41C21.81 5 22 4.5 22 4C22 2.9 21.1 2 20 2C19.5 2 19 2.19 18.59 2.59L16 5.17L13.41 2.59C13 2.19 12.5 2 12 2M12 6C12.55 6 13 6.45 13 7S12.55 8 12 8 11 7.55 11 7 11.45 6 12 6M9 9C9.55 9 10 9.45 10 10S9.55 11 9 11 8 10.55 8 10 8.45 9 9 9M15 9C15.55 9 16 9.45 16 10S15.55 11 15 11 14 10.55 14 10 14.45 9 15 9Z" />
                                  </svg>
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-xs">
                                      ALLKOIN
                                    </span>
                                    <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-[9px] px-1.5 py-0">
                                      Novo
                                    </Badge>
                                  </div>
                                  <div className="text-[10px] text-gray-500 mt-0.5">
                                    {allkoinBalance.toLocaleString("pt-BR", {
                                      minimumFractionDigits: 2,
                                    })}{" "}
                                    AK • 1 AK = R${" "}
                                    {allkoinExchangeRate.toFixed(2)}
                                  </div>
                                </div>
                              </div>
                              <input
                                type="radio"
                                name="payment-method"
                                value="allkoin"
                                checked={defaultPaymentMethod === "allkoin"}
                                onChange={(e) =>
                                  setDefaultPaymentMethod(e.target.value)
                                }
                                className="w-4 h-4"
                              />
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>

                {/* ─── Log / Histórico ───────────────────────────────────────── */}
                <TabsContent
                  value="log"
                  className="p-0 m-0 flex-1 overflow-y-auto bg-slate-100"
                >
                  <div className="px-[50px] py-[25px] space-y-4">
                    {/* Header */}
                    <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm">
                      <div
                        className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{
                          background:
                            "linear-gradient(135deg, #2558FF 0%, #6E2C96 55%, #A61E86 100%)",
                        }}
                      >
                        <History className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-700 mb-0.5">
                          Histórico do Projeto
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Todas as ações e alterações registradas neste projeto
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-slate-500 hover:text-slate-700"
                        onClick={() => {
                          setLogLoading(true);
                          apiClient
                            .getProjectLog(project.id)
                            .then((res: any) =>
                              setLogEntries(
                                Array.isArray(res?.data) ? res.data : [],
                              ),
                            )
                            .catch(() => setLogEntries([]))
                            .finally(() => setLogLoading(false));
                        }}
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Atualizar
                      </Button>
                    </div>

                    {/* Timeline */}
                    {logLoading ? (
                      <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-6 h-6 text-blue-400 animate-spin mr-2" />
                        <span className="text-sm text-slate-400">
                          Carregando histórico...
                        </span>
                      </div>
                    ) : logEntries.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                        <ScrollText className="w-10 h-10 mb-3 opacity-30" />
                        <p className="text-sm font-medium">
                          Nenhum evento registrado
                        </p>
                        <p className="text-xs mt-1">
                          As ações do projeto aparecerão aqui
                        </p>
                      </div>
                    ) : (
                      <div className="relative">
                        {/* vertical timeline line */}
                        <div className="absolute left-[19px] top-3 bottom-3 w-0.5 bg-slate-200 rounded-full" />
                        <div className="space-y-3">
                          {logEntries.map((entry: any, idx: number) => {
                            // Dot color per event type
                            const eventColors: Record<string, string> = {
                              CRIADO: "bg-emerald-500",
                              RASCUNHO_SALVO: "bg-slate-400",
                              STATUS_ALTERADO: "bg-blue-500",
                              CHECKOUT_INICIADO: "bg-amber-500",
                              PAGAMENTO_APROVADO: "bg-emerald-500",
                              TAREFAS_GERADAS: "bg-purple-500",
                              PRODUTO_ADICIONADO: "bg-indigo-400",
                              PRODUTO_REMOVIDO: "bg-rose-400",
                              COMISSAO_ALTERADA: "bg-orange-400",
                              CLIENTE_ALTERADO: "bg-teal-500",
                              ATUALIZADO: "bg-slate-400",
                              CANCELADO: "bg-rose-500",
                              CONCLUIDO: "bg-emerald-600",
                            };
                            const dotColor =
                              eventColors[entry.event] ?? "bg-slate-300";

                            // Human-readable event label
                            const eventLabels: Record<string, string> = {
                              CRIADO: "Projeto criado",
                              RASCUNHO_SALVO: "Rascunho salvo",
                              STATUS_ALTERADO: "Status alterado",
                              CHECKOUT_INICIADO: "Checkout iniciado",
                              PAGAMENTO_APROVADO: "Pagamento aprovado",
                              TAREFAS_GERADAS: "Tarefas geradas",
                              PRODUTO_ADICIONADO: "Produto adicionado",
                              PRODUTO_REMOVIDO: "Produto removido",
                              COMISSAO_ALTERADA: "Comissão alterada",
                              CLIENTE_ALTERADO: "Cliente/empresa alterado",
                              ATUALIZADO: "Dados atualizados",
                              CANCELADO: "Projeto cancelado",
                              CONCLUIDO: "Projeto concluído",
                            };
                            const label =
                              eventLabels[entry.event] ?? entry.event;

                            // Format datetime
                            let dateStr = "";
                            try {
                              const d = new Date(entry.created_at);
                              dateStr =
                                d.toLocaleDateString("pt-BR") +
                                " às " +
                                d.toLocaleTimeString("pt-BR", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                });
                            } catch {
                              dateStr = entry.created_at ?? "";
                            }

                            // Parse meta
                            let meta: Record<string, any> = {};
                            try {
                              meta = entry.meta ? JSON.parse(entry.meta) : {};
                            } catch {
                              meta = {};
                            }

                            return (
                              <div
                                key={entry.id ?? idx}
                                className="flex items-start gap-3 pl-0"
                              >
                                {/* Dot */}
                                <div
                                  className={`relative z-10 mt-1 h-[10px] w-[10px] rounded-full shrink-0 ml-[14px] ring-2 ring-white ${dotColor}`}
                                />
                                {/* Card */}
                                <div className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
                                  <div className="flex items-start justify-between gap-2 flex-wrap">
                                    <span className="text-xs font-semibold text-slate-700">
                                      {label}
                                    </span>
                                    <span className="text-[10px] text-slate-400 whitespace-nowrap">
                                      {dateStr}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-500 mt-0.5">
                                    {entry.description}
                                  </p>
                                  {entry.actor_name && (
                                    <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                                      <User className="w-2.5 h-2.5" />
                                      {entry.actor_name}
                                    </p>
                                  )}
                                  {/* Meta pills */}
                                  {Object.keys(meta).length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                      {meta.from !== undefined &&
                                        meta.to !== undefined && (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] rounded-full">
                                            <span className="text-rose-400">
                                              {meta.from}
                                            </span>
                                            <ArrowRight className="w-2.5 h-2.5 text-slate-300" />
                                            <span className="text-emerald-500">
                                              {meta.to}
                                            </span>
                                          </span>
                                        )}
                                      {meta.amount !== undefined && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] rounded-full font-medium">
                                          R${" "}
                                          {Number(meta.amount).toLocaleString(
                                            "pt-BR",
                                            { minimumFractionDigits: 2 },
                                          )}
                                        </span>
                                      )}
                                      {meta.generated !== undefined && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-600 text-[10px] rounded-full">
                                          {meta.generated} gerada(s)
                                        </span>
                                      )}
                                      {meta.skipped !== undefined &&
                                        meta.skipped > 0 && (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] rounded-full">
                                            {meta.skipped} ignorada(s)
                                          </span>
                                        )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Product Tasks Modal */}
      <Sheet
        open={showProductTasksModal}
        onOpenChange={setShowProductTasksModal}
      >
        <SheetContent
          side="right"
          className="left-[var(--sidebar-width,64px)] w-[calc(100vw-var(--sidebar-width,64px))] sm:max-w-[calc(100vw-var(--sidebar-width,64px))] h-full p-0 flex flex-col overflow-hidden"
        >
          {/* Header */}
          <SheetHeader className="shrink-0 px-8 py-5 min-h-[100px] flex items-center bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 text-white border-b border-white/10 shadow-lg">
            {selectedProduct && (
              <div className="flex items-start justify-between gap-6">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                      <Package className="h-4 w-4 text-white/80" />
                    </div>
                    <SheetTitle className="text-lg text-white font-bold leading-tight">
                      {selectedProduct.nome}
                    </SheetTitle>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                        selectedProduct.tipo === "Mensal"
                          ? "bg-violet-500/30 text-violet-200"
                          : "bg-blue-500/30 text-blue-200"
                      }`}
                    >
                      {selectedProduct.tipo}
                    </span>
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center gap-4 pl-11">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-2xl font-black ${getProgressTextColor(selectedProduct.progresso)} drop-shadow-sm`}
                        style={{ filter: "brightness(1.4)" }}
                      >
                        {selectedProduct.progresso}%
                      </span>
                      <span className="text-[10px] text-white/50 font-medium">
                        concluído
                      </span>
                    </div>
                    <div className="w-px h-5 bg-white/20" />
                    {selectedProduct.tarefasTotais === 0 ? (
                      <span className="text-xs text-white/50 italic">
                        Sem tarefas geradas
                      </span>
                    ) : (
                      <span className="text-xs text-white/70">
                        <span className="font-semibold text-white">
                          {selectedProduct.tarefasConcluidas}
                        </span>
                        /{selectedProduct.tarefasTotais} concluídas
                        {selectedProduct.tarefasParaLancamento > 0 && (
                          <span className="ml-2 text-amber-300">
                            {selectedProduct.tarefasParaLancamento} p/
                            lançamento
                          </span>
                        )}
                        {selectedProduct.tarefasEmExecucao > 0 && (
                          <span className="ml-2 text-blue-300">
                            {selectedProduct.tarefasEmExecucao} em execução
                          </span>
                        )}
                      </span>
                    )}
                    <div className="w-px h-5 bg-white/20" />
                    <span className="text-xs text-white/70">
                      <span className="font-semibold text-white">
                        {selectedProduct.tarefasTotais -
                          selectedProduct.tarefasConcluidas}
                      </span>{" "}
                      pendentes
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
            <div className="px-[50px] pt-[25px] pb-[80px] space-y-4">
              {selectedProduct &&
                (() => {
                  const allProdTasks: any[] = selectedProduct.tarefas || [];

                  // Stats
                  const ptStats = {
                    total: allProdTasks.length,
                    lancamento: allProdTasks.filter(
                      (t: any) => t.status === "Para lançamento",
                    ).length,
                    execucao: allProdTasks.filter(
                      (t: any) => t.status === "Em Execução",
                    ).length,
                    aprovada: allProdTasks.filter(
                      (t: any) => t.status === "Aprovada",
                    ).length,
                    aprovacao: allProdTasks.filter(
                      (t: any) => t.status === "Para Aprovação",
                    ).length,
                    entregue: allProdTasks.filter(
                      (t: any) => t.status === "Entregue",
                    ).length,
                    atrasada: allProdTasks.filter(
                      (t: any) => t.status === "Atrasada",
                    ).length,
                  };

                  // Filter + search
                  let filtered = allProdTasks.filter((t: any) => {
                    const term = productTaskSearchTerm.toLowerCase();
                    const uniqueId = String(selectedProduct.id * 1000 + t.id);
                    const matchSearch =
                      !term ||
                      t.nome?.toLowerCase().includes(term) ||
                      uniqueId.includes(term);
                    const matchStatus =
                      productTaskStatusFilter === "all" ||
                      t.status === productTaskStatusFilter;
                    return matchSearch && matchStatus;
                  });

                  // Sort
                  filtered = [...filtered].sort((a: any, b: any) => {
                    let cmp = 0;
                    if (productTaskSortBy === "nome")
                      cmp = (a.nome || "").localeCompare(b.nome || "");
                    else if (productTaskSortBy === "status")
                      cmp = (a.status || "").localeCompare(b.status || "");
                    else if (productTaskSortBy === "prazo")
                      cmp = (a.prazo || "").localeCompare(b.prazo || "");
                    return productTaskSortOrder === "asc" ? cmp : -cmp;
                  });

                  const totalFiltered = filtered.length;
                  const totalPtPages = Math.max(
                    1,
                    Math.ceil(totalFiltered / productTaskPerPage),
                  );
                  const safePage = Math.min(
                    productTaskCurrentPage,
                    totalPtPages,
                  );
                  const paginated = filtered.slice(
                    (safePage - 1) * productTaskPerPage,
                    safePage * productTaskPerPage,
                  );

                  return (
                    <>
                      {/* ── Stats bar ── */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-2">
                          <div className="h-6 w-6 rounded-md bg-indigo-100 flex items-center justify-center">
                            <CheckSquare className="h-3.5 w-3.5 text-indigo-600" />
                          </div>
                          <span className="text-xs font-semibold text-slate-600">
                            Total
                          </span>
                          <span className="text-sm font-bold text-slate-900">
                            {ptStats.total}
                          </span>
                        </div>
                        {ptStats.lancamento > 0 && (
                          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-2">
                            <div className="h-2 w-2 rounded-full bg-orange-400 flex-shrink-0" />
                            <span className="text-xs font-semibold text-slate-500">
                              Para lançamento
                            </span>
                            <span className="text-sm font-bold text-orange-500">
                              {ptStats.lancamento}
                            </span>
                          </div>
                        )}
                        {ptStats.execucao > 0 && (
                          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-2">
                            <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
                            <span className="text-xs font-semibold text-slate-500">
                              Em Execução
                            </span>
                            <span className="text-sm font-bold text-blue-600">
                              {ptStats.execucao}
                            </span>
                          </div>
                        )}
                        {ptStats.aprovada > 0 && (
                          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-2">
                            <div className="h-2 w-2 rounded-full bg-emerald-500 flex-shrink-0" />
                            <span className="text-xs font-semibold text-slate-500">
                              Aprovadas
                            </span>
                            <span className="text-sm font-bold text-emerald-600">
                              {ptStats.aprovada}
                            </span>
                          </div>
                        )}
                        {ptStats.aprovacao > 0 && (
                          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-2">
                            <div className="h-2 w-2 rounded-full bg-amber-400 flex-shrink-0" />
                            <span className="text-xs font-semibold text-slate-500">
                              Para Aprovação
                            </span>
                            <span className="text-sm font-bold text-amber-500">
                              {ptStats.aprovacao}
                            </span>
                          </div>
                        )}
                        {ptStats.entregue > 0 && (
                          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-2">
                            <div className="h-2 w-2 rounded-full bg-purple-500 flex-shrink-0" />
                            <span className="text-xs font-semibold text-slate-500">
                              Entregues
                            </span>
                            <span className="text-sm font-bold text-purple-600">
                              {ptStats.entregue}
                            </span>
                          </div>
                        )}
                        {ptStats.atrasada > 0 && (
                          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-2">
                            <div className="h-2 w-2 rounded-full bg-red-400 flex-shrink-0" />
                            <span className="text-xs font-semibold text-slate-500">
                              Atrasadas
                            </span>
                            <span className="text-sm font-bold text-red-500">
                              {ptStats.atrasada}
                            </span>
                          </div>
                        )}
                      </div>

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
                              value={productTaskSearchTerm}
                              onChange={(e) => {
                                setProductTaskSearchTerm(e.target.value);
                                setProductTaskCurrentPage(1);
                              }}
                              className="w-full pl-9 pr-3 h-9 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                            />
                          </div>

                          {/* Lista / Kanban toggle */}
                          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden flex-shrink-0">
                            <button
                              onClick={() => setProductTaskViewMode("list")}
                              className={`flex items-center gap-1.5 h-9 px-3 text-xs font-medium transition-colors ${
                                productTaskViewMode === "list"
                                  ? "bg-slate-900 text-white"
                                  : "bg-white text-slate-600 hover:bg-slate-50"
                              }`}
                            >
                              <List className="h-3.5 w-3.5" />
                              Lista
                            </button>
                            <button
                              onClick={() => setProductTaskViewMode("kanban")}
                              className={`flex items-center gap-1.5 h-9 px-3 text-xs font-medium transition-colors border-l border-slate-200 ${
                                productTaskViewMode === "kanban"
                                  ? "bg-slate-900 text-white"
                                  : "bg-white text-slate-600 hover:bg-slate-50"
                              }`}
                            >
                              <LayoutGrid className="h-3.5 w-3.5" />
                              Kanban
                            </button>
                          </div>

                          {/* Items per page + count */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Select
                              value={productTaskPerPage.toString()}
                              onValueChange={(v) => {
                                setProductTaskPerPage(parseInt(v));
                                setProductTaskCurrentPage(1);
                              }}
                            >
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
                              de{" "}
                              <span className="font-semibold text-slate-600">
                                {totalFiltered}
                              </span>{" "}
                              tarefa{totalFiltered !== 1 ? "s" : ""}
                            </span>
                          </div>

                          {/* Filtros */}
                          <button
                            onClick={() =>
                              setProductTaskShowFilters(!productTaskShowFilters)
                            }
                            className={`flex items-center gap-1.5 h-9 px-3.5 text-xs font-medium rounded-lg border transition-colors flex-shrink-0 ${
                              productTaskShowFilters
                                ? "border-blue-400 bg-blue-50 text-blue-700"
                                : "border-slate-200 text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            <Filter className="h-3.5 w-3.5" />
                            Filtros
                          </button>

                          {/* Pagination */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() =>
                                setProductTaskCurrentPage((p) =>
                                  Math.max(1, p - 1),
                                )
                              }
                              disabled={safePage <= 1}
                              className="h-7 w-7 flex items-center justify-center rounded border border-slate-200 bg-white text-slate-400 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed text-xs"
                            >
                              <ChevronLeft className="h-3.5 w-3.5" />
                            </button>
                            {Array.from(
                              { length: Math.min(totalPtPages, 5) },
                              (_, i) => {
                                const start = Math.max(1, safePage - 2);
                                const pg = start + i;
                                if (pg > totalPtPages) return null;
                                return (
                                  <button
                                    key={pg}
                                    onClick={() =>
                                      setProductTaskCurrentPage(pg)
                                    }
                                    className={`h-7 w-7 flex items-center justify-center rounded text-xs font-medium transition-colors ${
                                      pg === safePage
                                        ? "bg-blue-600 text-white border border-blue-600"
                                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                    }`}
                                  >
                                    {pg}
                                  </button>
                                );
                              },
                            )}
                            {totalPtPages > 5 &&
                              safePage < totalPtPages - 2 && (
                                <>
                                  <span className="text-xs text-slate-400 px-1">
                                    ·
                                  </span>
                                  <button
                                    onClick={() =>
                                      setProductTaskCurrentPage(totalPtPages)
                                    }
                                    className="h-7 w-7 flex items-center justify-center rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-xs font-medium"
                                  >
                                    {totalPtPages}
                                  </button>
                                </>
                              )}
                            <button
                              onClick={() =>
                                setProductTaskCurrentPage((p) =>
                                  Math.min(totalPtPages, p + 1),
                                )
                              }
                              disabled={safePage >= totalPtPages}
                              className="h-7 w-7 flex items-center justify-center rounded border border-slate-200 bg-white text-slate-400 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed text-xs"
                            >
                              <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* ── Filter panel ── */}
                        {productTaskShowFilters && (
                          <div className="px-5 py-4 border-b border-slate-200/70 bg-white flex flex-wrap items-end gap-4">
                            <div className="flex flex-col gap-1">
                              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                                Status
                              </label>
                              <Select
                                value={productTaskStatusFilter}
                                onValueChange={(v) => {
                                  setProductTaskStatusFilter(v);
                                  setProductTaskCurrentPage(1);
                                }}
                              >
                                <SelectTrigger className="h-8 w-40 text-xs border-slate-200">
                                  <SelectValue placeholder="Todos" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">Todos</SelectItem>
                                  <SelectItem value="Para lançamento">
                                    Para lançamento
                                  </SelectItem>
                                  <SelectItem value="Em Execução">
                                    Em Execução
                                  </SelectItem>
                                  <SelectItem value="Aprovada">
                                    Aprovada
                                  </SelectItem>
                                  <SelectItem value="Para Aprovação">
                                    Para Aprovação
                                  </SelectItem>
                                  <SelectItem value="Entregue">
                                    Entregue
                                  </SelectItem>
                                  <SelectItem value="Atrasada">
                                    Atrasada
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                                Ordenar por
                              </label>
                              <div className="flex items-center gap-1">
                                <Select
                                  value={productTaskSortBy}
                                  onValueChange={setProductTaskSortBy}
                                >
                                  <SelectTrigger className="h-8 w-36 text-xs border-slate-200">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="nome">Nome</SelectItem>
                                    <SelectItem value="status">
                                      Status
                                    </SelectItem>
                                    <SelectItem value="prazo">Prazo</SelectItem>
                                  </SelectContent>
                                </Select>
                                <button
                                  onClick={() =>
                                    setProductTaskSortOrder((o) =>
                                      o === "asc" ? "desc" : "asc",
                                    )
                                  }
                                  className="h-8 w-8 flex items-center justify-center rounded border border-slate-200 hover:bg-slate-50 text-slate-500"
                                  title={
                                    productTaskSortOrder === "asc"
                                      ? "Crescente"
                                      : "Decrescente"
                                  }
                                >
                                  {productTaskSortOrder === "asc" ? "↑" : "↓"}
                                </button>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setProductTaskStatusFilter("all");
                                setProductTaskSortBy("nome");
                                setProductTaskSortOrder("asc");
                                setProductTaskSearchTerm("");
                                setProductTaskCurrentPage(1);
                              }}
                              className="h-8 px-3 text-xs font-medium rounded border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
                            >
                              Limpar Filtros
                            </button>
                          </div>
                        )}

                        {/* ── List view ── */}
                        {productTaskViewMode === "list" && (
                          <>
                            {paginated.length > 0 ? (
                              paginated.map((tarefa: any, index: number) => {
                                const uniqueTaskId =
                                  selectedProduct.id * 1000 + tarefa.id;
                                const isOverdue = tarefa.status === "Atrasada";
                                return (
                                  <div
                                    key={uniqueTaskId}
                                    className={`flex items-center gap-4 px-5 py-3 hover:brightness-95 transition-all ${
                                      index % 2 === 0
                                        ? "bg-white"
                                        : "bg-slate-50/70"
                                    }`}
                                    style={{
                                      borderLeft: `3px solid ${getStatusBorderColor(tarefa.status)}`,
                                    }}
                                  >
                                    <div className="flex items-center justify-center bg-blue-50 rounded px-2 py-0.5 shrink-0">
                                      <span className="text-[11px] text-blue-600 font-bold">
                                        #{uniqueTaskId}
                                      </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                        <span
                                          className={`text-sm font-semibold ${isOverdue ? "text-red-600" : "text-slate-900"}`}
                                        >
                                          {tarefa.nome}
                                        </span>
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium border border-slate-200">
                                          {selectedProduct.nome}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2.5 text-[11px] text-slate-400 flex-wrap">
                                        <span className="flex items-center gap-1">
                                          <User className="h-3 w-3" />
                                          <span className="font-medium text-slate-600">
                                            {canSeeNomadNames
                                              ? tarefa.executor
                                              : "Nômade"}
                                          </span>
                                        </span>
                                        <span>·</span>
                                        <span className="flex items-center gap-1">
                                          <Users className="h-3 w-3" />
                                          <span className="font-medium text-slate-600">
                                            {canSeeNomadNames
                                              ? tarefa.lider
                                              : "Equipe Allka"}
                                          </span>
                                        </span>
                                        {tarefa.prazo && (
                                          <>
                                            <span>·</span>
                                            <span className="flex items-center gap-1">
                                              <Calendar className="h-3 w-3" />
                                              <span className="font-medium text-slate-600">
                                                {tarefa.prazo}
                                              </span>
                                            </span>
                                          </>
                                        )}
                                        {(() => {
                                          const expiry =
                                            getLancamentoExpiryBadge(tarefa);
                                          return expiry ? (
                                            <span
                                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${expiry.className}`}
                                            >
                                              {expiry.label}
                                            </span>
                                          ) : null;
                                        })()}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="text-[9px] text-slate-400 font-mono">
                                        #{uniqueTaskId}
                                      </span>
                                      <div
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border ${getStatusBadgeColor(tarefa.status)}`}
                                      >
                                        <span
                                          className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${getStatusDotClass(tarefa.status)}`}
                                        />
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
                                );
                              })
                            ) : (
                              <div className="flex flex-col items-center justify-center py-16 text-center">
                                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                                  <CheckSquare className="h-7 w-7 opacity-40" />
                                </div>
                                <p className="text-sm font-medium text-slate-500">
                                  Nenhuma tarefa encontrada
                                </p>
                                <p className="text-xs text-slate-400 mt-1">
                                  Tente ajustar os filtros ou a busca.
                                </p>
                              </div>
                            )}
                          </>
                        )}

                        {/* ── Kanban view ── */}
                        {productTaskViewMode === "kanban" && (
                          <div className="p-5 overflow-x-auto">
                            <div className="flex gap-4 min-w-max">
                              {[
                                "Para lançamento",
                                "Em Execução",
                                "Para Aprovação",
                                "Aprovada",
                                "Entregue",
                                "Atrasada",
                              ].map((col) => {
                                const colTasks = filtered.filter(
                                  (t: any) => t.status === col,
                                );
                                const colColors: Record<string, string> = {
                                  "Para lançamento":
                                    "from-orange-50 to-orange-100/50 border-orange-200",
                                  "Em Execução":
                                    "from-blue-50 to-blue-100/50 border-blue-200",
                                  "Para Aprovação":
                                    "from-amber-50 to-amber-100/50 border-amber-200",
                                  Aprovada:
                                    "from-emerald-50 to-emerald-100/50 border-emerald-200",
                                  Entregue:
                                    "from-purple-50 to-purple-100/50 border-purple-200",
                                  Atrasada:
                                    "from-red-50 to-red-100/50 border-red-200",
                                };
                                return (
                                  <div key={col} className="w-64 flex-shrink-0">
                                    <div
                                      className={`flex items-center justify-between mb-2 px-3 py-2 rounded-lg bg-gradient-to-br ${colColors[col]} border`}
                                    >
                                      <span className="text-xs font-bold text-slate-700">
                                        {col}
                                      </span>
                                      <span className="text-xs font-bold text-slate-500">
                                        {colTasks.length}
                                      </span>
                                    </div>
                                    <div className="space-y-2">
                                      {colTasks.map((tarefa: any) => {
                                        const uniqueTaskId =
                                          selectedProduct.id * 1000 + tarefa.id;
                                        return (
                                          <div
                                            key={uniqueTaskId}
                                            className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm hover:shadow-md transition-shadow"
                                            style={{
                                              borderLeft: `3px solid ${getStatusBorderColor(tarefa.status)}`,
                                            }}
                                          >
                                            <div className="flex items-center gap-1.5 mb-1">
                                              <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded">
                                                #{uniqueTaskId}
                                              </span>
                                            </div>
                                            <p className="text-xs font-semibold text-slate-800 mb-1.5 leading-tight">
                                              {tarefa.nome}
                                            </p>
                                            <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                              <User className="h-2.5 w-2.5" />
                                              <span>
                                                {canSeeNomadNames
                                                  ? tarefa.executor
                                                  : "Nômade"}
                                              </span>
                                            </div>
                                            {tarefa.prazo && (
                                              <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                                                <Calendar className="h-2.5 w-2.5" />
                                                <span>{tarefa.prazo}</span>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                      {colTasks.length === 0 && (
                                        <div className="text-center py-6 text-[11px] text-slate-400 border border-dashed border-slate-200 rounded-lg">
                                          Sem tarefas
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
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
            <input
              ref={projectFileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setSelectedProjectFile(f);
                if (f) setNewFileName(f.name);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => projectFileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50 transition-colors px-4 py-6 text-sm text-slate-500 hover:text-blue-600"
            >
              <Upload className="h-4 w-4" />
              {selectedProjectFile ? selectedProjectFile.name : "Clique para selecionar um arquivo"}
            </button>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Nome exibido</label>
              <Input
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="Nome do arquivo (opcional)"
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 bg-transparent"
              onClick={() => { setShowAddFileDialog(false); setSelectedProjectFile(null); setNewFileName(""); }}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1"
              disabled={!selectedProjectFile && !newFileName.trim()}
              onClick={handleAddFile}
            >
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Credential Dialog */}
      <Dialog
        open={showAddCredentialDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddCredentialDialog(false);
            setNewCredentialForm({ title: "", url: "", username: "", password: "", confirmPassword: "", category: "Website" });
            setNewCredentialPasswordVisible(false);
            setNewCredentialConfirmVisible(false);
          }
        }}
      >
        <DialogContent showCloseButton={false} className="p-0 overflow-hidden max-w-lg">
            <div>
              {/* Brand header */}
              <div className="app-brand-header px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <KeyRound className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-white font-bold text-base">
                      Adicionar senha ao cofre
                    </h2>
                    <p className="text-white/70 text-xs mt-0.5">
                      Armazene credenciais com segurança
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowAddCredentialDialog(false);
                      setNewCredentialForm({ title: "", url: "", username: "", password: "", confirmPassword: "", category: "Website" });
                      setNewCredentialPasswordVisible(false);
                      setNewCredentialConfirmVisible(false);
                    }}
                    className="h-8 w-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    <X className="h-4 w-4 text-white" />
                  </button>
                </div>
              </div>
              {/* Form */}
              <div className="px-6 py-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      Título *
                    </label>
                    <Input
                      placeholder="Ex: Admin WordPress"
                      value={newCredentialForm.title}
                      onChange={(e) =>
                        setNewCredentialForm((f) => ({
                          ...f,
                          title: e.target.value,
                        }))
                      }
                      className="h-9 text-sm border-slate-300"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      Categoria
                    </label>
                    <Select
                      value={newCredentialForm.category}
                      onValueChange={(v) =>
                        setNewCredentialForm((f) => ({ ...f, category: v }))
                      }
                    >
                      <SelectTrigger className="h-9 text-sm border-slate-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[
                          "Website",
                          "Infraestrutura",
                          "Marketing",
                          "Analytics",
                          "Social",
                          "Email",
                          "Outros",
                        ].map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    URL
                  </label>
                  <Input
                    placeholder="https://exemplo.com"
                    value={newCredentialForm.url}
                    onChange={(e) =>
                      setNewCredentialForm((f) => ({
                        ...f,
                        url: e.target.value,
                      }))
                    }
                    className="h-9 text-sm border-slate-300"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    Usuário / E-mail *
                  </label>
                  <Input
                    placeholder="usuario@exemplo.com"
                    value={newCredentialForm.username}
                    onChange={(e) =>
                      setNewCredentialForm((f) => ({
                        ...f,
                        username: e.target.value,
                      }))
                    }
                    className="h-9 text-sm border-slate-300"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      Senha *
                    </label>
                    <div className="relative">
                      <Input
                        type={
                          newCredentialPasswordVisible ? "text" : "password"
                        }
                        placeholder="••••••••"
                        value={newCredentialForm.password}
                        onChange={(e) =>
                          setNewCredentialForm((f) => ({
                            ...f,
                            password: e.target.value,
                          }))
                        }
                        className="h-9 text-sm border-slate-300 pr-9"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setNewCredentialPasswordVisible((v) => !v)
                        }
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {newCredentialPasswordVisible ? (
                          <EyeOff className="h-3.5 w-3.5" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      Confirmar Senha *
                    </label>
                    <div className="relative">
                      <Input
                        type={newCredentialConfirmVisible ? "text" : "password"}
                        placeholder="••••••••"
                        value={newCredentialForm.confirmPassword}
                        onChange={(e) =>
                          setNewCredentialForm((f) => ({
                            ...f,
                            confirmPassword: e.target.value,
                          }))
                        }
                        className={`h-9 text-sm pr-9 ${newCredentialForm.confirmPassword && newCredentialForm.confirmPassword !== newCredentialForm.password ? "border-red-400" : "border-slate-300"}`}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setNewCredentialConfirmVisible((v) => !v)
                        }
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {newCredentialConfirmVisible ? (
                          <EyeOff className="h-3.5 w-3.5" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                    {newCredentialForm.confirmPassword &&
                      newCredentialForm.confirmPassword !==
                        newCredentialForm.password && (
                        <p className="text-[10px] text-red-500 mt-0.5">
                          Senhas não coincidem
                        </p>
                      )}
                  </div>
                </div>
              </div>
              {/* Footer */}
              <div className="flex gap-2 px-6 pb-5">
                <Button
                  variant="outline"
                  className="flex-1 h-9"
                  onClick={() => {
                    setShowAddCredentialDialog(false);
                    setNewCredentialForm({
                      title: "",
                      url: "",
                      username: "",
                      password: "",
                      confirmPassword: "",
                      category: "Website",
                    });
                    setNewCredentialPasswordVisible(false);
                    setNewCredentialConfirmVisible(false);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 h-9"
                  style={{
                    background:
                      "linear-gradient(135deg,#000 0%,#1a2a6f 45%,#c81a7f 100%)",
                  }}
                  disabled={
                    !newCredentialForm.title ||
                    !newCredentialForm.username ||
                    !newCredentialForm.password ||
                    newCredentialForm.password !==
                      newCredentialForm.confirmPassword
                  }
                  onClick={() => {
                    if (!project?.id) return;
                    apiClient
                      .createProjectCredential(String(project.id), {
                        title: newCredentialForm.title,
                        url: newCredentialForm.url,
                        username: newCredentialForm.username,
                        password_demo: newCredentialForm.password,
                        category: newCredentialForm.category,
                        is_demo: false,
                      })
                      .then((created: any) => {
                        setMockCredentials((prev) => [...prev, created]);
                        setShowAddCredentialDialog(false);
                        setNewCredentialForm({ title: "", url: "", username: "", password: "", confirmPassword: "", category: "Website" });
                        setNewCredentialPasswordVisible(false);
                        setNewCredentialConfirmVisible(false);
                        toast({ title: "Credencial adicionada", description: `"${newCredentialForm.title}" foi salva no cofre.` });
                      })
                      .catch(() => toast({ title: "Erro", description: "Não foi possível salvar a credencial.", variant: "destructive" }));
                  }}
                >
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Salvar no cofre
                </Button>
              </div>
            </div>
        </DialogContent>
      </Dialog>

      {/* Edit Credential Dialog */}
      <Dialog
        open={showEditCredentialDialog}
        onOpenChange={(open) => { if (!open) { setShowEditCredentialDialog(false); setEditPasswordVisible(false); setConfirmPassword(""); } }}
      >
        <DialogContent showCloseButton={false} className="p-0 overflow-hidden max-w-lg">
            <div>
              <div className="app-brand-header px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <Edit className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-white font-bold text-base">
                      Editar credencial
                    </h2>
                    <p className="text-white/70 text-xs mt-0.5">
                      {editingCredential?.title}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowEditCredentialDialog(false);
                      setEditPasswordVisible(false);
                      setConfirmPassword("");
                    }}
                    className="h-8 w-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    <X className="h-4 w-4 text-white" />
                  </button>
                </div>
              </div>
              {editingCredential && (
                <div className="px-6 py-5 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                        Título *
                      </label>
                      <Input
                        value={editingCredential.title}
                        onChange={(e) =>
                          setEditingCredential({
                            ...editingCredential,
                            title: e.target.value,
                          })
                        }
                        className="h-9 text-sm border-slate-300"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                        Categoria
                      </label>
                      <Select
                        value={editingCredential.category}
                        onValueChange={(v) =>
                          setEditingCredential({
                            ...editingCredential,
                            category: v,
                          })
                        }
                      >
                        <SelectTrigger className="h-9 text-sm border-slate-300">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[
                            "Website",
                            "Infraestrutura",
                            "Marketing",
                            "Analytics",
                            "Social",
                            "Email",
                            "Outros",
                          ].map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      URL
                    </label>
                    <Input
                      value={editingCredential.url}
                      onChange={(e) =>
                        setEditingCredential({
                          ...editingCredential,
                          url: e.target.value,
                        })
                      }
                      className="h-9 text-sm border-slate-300"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      Usuário / E-mail
                    </label>
                    <Input
                      value={editingCredential.username}
                      onChange={(e) =>
                        setEditingCredential({
                          ...editingCredential,
                          username: e.target.value,
                        })
                      }
                      className="h-9 text-sm border-slate-300"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                        Nova Senha
                      </label>
                      <div className="relative">
                        <Input
                          type={editPasswordVisible ? "text" : "password"}
                          value={editingCredential.password}
                          onChange={(e) =>
                            setEditingCredential({
                              ...editingCredential,
                              password: e.target.value,
                            })
                          }
                          className="h-9 text-sm border-slate-300 pr-9"
                        />
                        <button
                          type="button"
                          onClick={() => setEditPasswordVisible((v) => !v)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {editPasswordVisible ? (
                            <EyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                        Confirmar Senha
                      </label>
                      <div className="relative">
                        <Input
                          type={editPasswordVisible ? "text" : "password"}
                          placeholder="Confirmar"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className={`h-9 text-sm pr-9 ${confirmPassword && confirmPassword !== editingCredential.password ? "border-red-400" : "border-slate-300"}`}
                        />
                      </div>
                      {confirmPassword &&
                        confirmPassword !== editingCredential.password && (
                          <p className="text-[10px] text-red-500">
                            Senhas não coincidem
                          </p>
                        )}
                    </div>
                  </div>
                </div>
              )}
              <div className="flex gap-2 px-6 pb-5">
                <Button
                  variant="outline"
                  className="flex-1 h-9"
                  onClick={() => {
                    setShowEditCredentialDialog(false);
                    setEditPasswordVisible(false);
                    setConfirmPassword("");
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 h-9"
                  style={{
                    background:
                      "linear-gradient(135deg,#000 0%,#1a2a6f 45%,#c81a7f 100%)",
                  }}
                  onClick={handleSaveCredential}
                  disabled={
                    !!confirmPassword &&
                    confirmPassword !== editingCredential?.password
                  }
                >
                  <Save className="h-4 w-4 mr-2" />
                  Salvar alterações
                </Button>
              </div>
            </div>
        </DialogContent>
      </Dialog>

      {/* Delete Credential Dialog */}
      <Dialog
        open={showDeleteCredentialDialog}
        onOpenChange={(open) => { if (!open) setShowDeleteCredentialDialog(false); }}
      >
        <DialogContent showCloseButton={false} className="p-0 overflow-hidden max-w-sm">
            <div>
              <div className="app-brand-header px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <Trash2 className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-white font-bold text-base">
                      Excluir credencial
                    </h2>
                    <p className="text-white/70 text-xs mt-0.5">
                      {editingCredential?.title}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowDeleteCredentialDialog(false)}
                    className="h-8 w-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    <X className="h-4 w-4 text-white" />
                  </button>
                </div>
              </div>
              <div className="px-6 py-5">
                <p className="text-sm text-slate-600">
                  Tem certeza que deseja excluir esta credencial? Esta ação não
                  pode ser desfeita.
                </p>
              </div>
              <div className="flex gap-2 px-6 pb-5">
                <Button
                  variant="outline"
                  className="flex-1 h-9"
                  onClick={() => setShowDeleteCredentialDialog(false)}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 h-9 bg-red-600 hover:bg-red-700"
                  onClick={() =>
                    editingCredential &&
                    handleDeleteCredential(editingCredential.id)
                  }
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </Button>
              </div>
            </div>
        </DialogContent>
      </Dialog>

      {/* Credential Details Sheet - Used for sharing management */}
      <Sheet open={showShareCredential} onOpenChange={setShowShareCredential}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl overflow-y-auto p-0"
        >
          <SheetHeader className="px-6 py-4 min-h-[100px] flex items-center border-b bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500">
            <SheetTitle className="text-white">
              <div className="flex items-center gap-3">
                <Share2 className="h-5 w-5" />
                <div>
                  <div className="text-lg font-semibold">Compartilhamento</div>
                  <div className="text-sm font-normal text-blue-50">
                    {selectedCredential?.title}
                  </div>
                </div>
              </div>
            </SheetTitle>
          </SheetHeader>

          {selectedCredential && (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Acesso compartilhado
                  </h3>
                  <span className="text-xs text-gray-500">
                    {selectedCredential.shared_with_nomad_id ? "1 nômade" : "Nenhum acesso ativo"}
                  </span>
                </div>
                <div className="space-y-2">
                  {selectedCredential.shared_with_nomad_id ? (
                    <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-2.5 flex-1">
                        <div className="h-7 w-7 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] font-semibold text-white">N</span>
                        </div>
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="text-xs font-medium">{selectedCredential.shared_with_nomad_id}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-500">Nômade · Pode visualizar</span>
                            {selectedCredential.shared_until && (
                              <>
                                <span className="text-[10px] text-gray-400">•</span>
                                <span className={`text-[10px] ${new Date(selectedCredential.shared_until) < new Date() ? "text-red-600 font-medium" : "text-gray-500"}`}>
                                  {new Date(selectedCredential.shared_until) < new Date()
                                    ? "Expirado"
                                    : `Expira em ${new Date(selectedCredential.shared_until).toLocaleDateString("pt-BR")}`}
                                </span>
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
                          if (!project?.id) return;
                          apiClient
                            .revokeProjectCredential(String(project.id), selectedCredential.id)
                            .then((updated: any) => {
                              setMockCredentials((prev: any[]) =>
                                prev.map((c) => c.id === selectedCredential.id ? { ...c, ...updated } : c),
                              );
                              setSelectedCredential({ ...selectedCredential, shared_with_nomad_id: null, shared_until: null, status: "active" });
                              toast({ title: "Acesso revogado" });
                            })
                            .catch(() => toast({ title: "Erro ao revogar acesso", variant: "destructive" } as any));
                        }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 py-4 text-center">Nenhum acesso compartilhado no momento.</p>
                  )}
                </div>
              </div>

              <div className="border-t pt-6 space-y-4">
                <div className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-blue-600" />
                  <h3 className="text-sm font-semibold text-gray-900">
                    Adicionar Novo Acesso
                  </h3>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700">
                      Usuário da Plataforma{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <Select
                      value={newAccessUser}
                      onValueChange={setNewAccessUser}
                    >
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
                              <span className="text-[10px] text-white font-semibold">
                                JS
                              </span>
                            </div>
                            <span>João Silva</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="maria">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-purple-500 flex items-center justify-center">
                              <span className="text-[10px] text-white font-semibold">
                                MS
                              </span>
                            </div>
                            <span>Maria Santos</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="carlos">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center">
                              <span className="text-[10px] text-white font-semibold">
                                CL
                              </span>
                            </div>
                            <span>Carlos Lima</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="fernanda">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-pink-500 flex items-center justify-center">
                              <span className="text-[10px] text-white font-semibold">
                                FD
                              </span>
                            </div>
                            <span>Fernanda Dias</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="beatriz">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-orange-500 flex items-center justify-center">
                              <span className="text-[10px] text-white font-semibold">
                                BS
                              </span>
                            </div>
                            <span>Beatriz Souza</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="ricardo">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-indigo-500 flex items-center justify-center">
                              <span className="text-[10px] text-white font-semibold">
                                RA
                              </span>
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
                      <Select
                        value={newAccessPermission}
                        onValueChange={setNewAccessPermission}
                      >
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
                        Expira em{" "}
                        {hasExpiration && (
                          <span className="text-red-500">*</span>
                        )}
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
                        setHasExpiration(e.target.checked);
                        if (!e.target.checked) {
                          setNewAccessExpiration("");
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label
                      htmlFor="has-expiration"
                      className="text-xs text-gray-700 cursor-pointer"
                    >
                      {hasExpiration
                        ? "Acesso com data de expiração"
                        : "Acesso permanente (sem expiração)"}
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
        <SheetContent
          side="right"
          className="w-full sm:max-w-4xl p-0 flex flex-col"
        >
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
                      <p className="text-sm text-white/90">
                        {selectedInvoice.month}
                      </p>
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
                  <p className="text-3xl font-bold">
                    R$ {selectedInvoice.valor.toFixed(2).replace(".", ",")}
                  </p>
                  {selectedInvoice.desconto > 0 && (
                    <div className="mt-2 flex items-center gap-2 text-sm">
                      <span className="text-white/70 line-through">
                        R${" "}
                        {selectedInvoice.valorOriginal
                          .toFixed(2)
                          .replace(".", ",")}
                      </span>
                      <Badge className="bg-green-500/80 text-white text-xs">
                        -{selectedInvoice.descontoPercentual.toFixed(1)}%
                        desconto
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
                      <p className="text-xs text-muted-foreground mb-1">
                        Agência
                      </p>
                      <p className="text-sm font-medium">
                        {selectedInvoice.agencia}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ID: {selectedInvoice.agenciaId}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Cliente
                      </p>
                      <p className="text-sm font-medium">
                        {selectedInvoice.cliente}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ID: {selectedInvoice.clienteId}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Forma de Pagamento
                      </p>
                      <p className="text-sm font-medium">
                        {selectedInvoice.formaPagamento}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Competência
                      </p>
                      <p className="text-sm font-medium">
                        {selectedInvoice.competencia}
                      </p>
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
                      <p className="text-xs text-muted-foreground mb-1">
                        Data de Cobrança
                      </p>
                      <p className="text-sm font-medium">
                        {selectedInvoice.dataCobran}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Data de Pagamento
                      </p>
                      <p className="text-sm font-medium">
                        {selectedInvoice.dataPagamento ||
                          "Aguardando pagamento"}
                      </p>
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
                          <TableHead className="text-xs text-center">
                            Qtd
                          </TableHead>
                          <TableHead className="text-xs text-right">
                            Valor Unit.
                          </TableHead>
                          <TableHead className="text-xs text-right">
                            Total
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedInvoice.produtos.map(
                          (produto: any, idx: number) => (
                            <TableRow key={idx}>
                              <TableCell className="text-xs font-medium">
                                {produto.nome}
                              </TableCell>
                              <TableCell className="text-xs text-center">
                                {produto.quantidade}
                              </TableCell>
                              <TableCell className="text-xs text-right">
                                R${" "}
                                {produto.valorUnitario
                                  .toFixed(2)
                                  .replace(".", ",")}
                              </TableCell>
                              <TableCell className="text-xs font-semibold text-right">
                                R${" "}
                                {produto.valorTotal
                                  .toFixed(2)
                                  .replace(".", ",")}
                              </TableCell>
                            </TableRow>
                          ),
                        )}
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
                        R${" "}
                        {selectedInvoice.valorOriginal
                          .toFixed(2)
                          .replace(".", ",")}
                      </span>
                    </div>
                    {selectedInvoice.desconto > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>
                          Desconto (
                          {selectedInvoice.descontoPercentual.toFixed(1)}%)
                        </span>
                        <span className="font-medium">
                          -R${" "}
                          {selectedInvoice.desconto
                            .toFixed(2)
                            .replace(".", ",")}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-base font-bold pt-2 border-t">
                      <span>Total</span>
                      <span className="text-blue-600">
                        R$ {selectedInvoice.valor.toFixed(2).replace(".", ",")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer with action */}
              <div className="border-t p-4 bg-muted/30">
                <Button
                  className="w-full"
                  onClick={() => handleDownloadInvoicePDF(selectedInvoice)}
                >
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
        message={
          <>
            Tem certeza que deseja salvar as alterações nos dados do projeto?
            Esta ação irá atualizar as informações.
          </>
        }
        confirmText="Sim, salvar"
        cancelText="Voltar edição"
        destructive={false}
      />

      {/* Dados do Projeto — cancel confirmation */}
      <ConfirmationDialog
        open={showDadosProjCancelConfirm}
        onClose={() => setShowDadosProjCancelConfirm(false)}
        onConfirm={() => {
          setIsDadosProjEditMode(false);
          setShowDadosProjCancelConfirm(false);
        }}
        title="Descartar alterações?"
        message={
          <>
            Tem certeza que deseja cancelar? Todas as alterações nos dados do
            projeto serão descartadas.
          </>
        }
        confirmText="Sim, descartar"
        cancelText="Voltar edição"
        destructive={true}
      />

      {/* Reativar Projeto Dialog (MENSAL cancelled) */}
      <Dialog open={showReativarDialog} onOpenChange={setShowReativarDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-amber-600" />
              Reativar Projeto
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-slate-600">
              Para reativar o projeto, é necessário quitar as faturas em aberto:
            </p>
            {(() => {
              const overdueInvoices = mockInvoices.filter(
                (inv: any) => inv.status !== "PAGO",
              );
              const overdueTotal = overdueInvoices.reduce(
                (acc: number, inv: any) => acc + inv.valor,
                0,
              );
              const currentMonthAmount =
                overdueInvoices[overdueInvoices.length - 1]?.valor || 890;
              return (
                <div className="bg-slate-50 rounded-lg p-4 space-y-2 border">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Fatura(s) vencida(s)</span>
                    <span className="font-semibold text-red-600">
                      R$ {overdueTotal.toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Competência atual</span>
                    <span className="font-semibold">
                      R$ {currentMonthAmount.toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-bold border-t pt-2">
                    <span>Total a pagar</span>
                    <span className="text-blue-600">
                      R${" "}
                      {(overdueTotal + currentMonthAmount)
                        .toFixed(2)
                        .replace(".", ",")}
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowReativarDialog(false);
                onClone?.();
              }}
            >
              <Copy className="h-3.5 w-3.5 mr-1.5" />
              Clonar Projeto
            </Button>
            <Button
              size="sm"
              className="bg-amber-500 hover:bg-amber-600 text-white"
              onClick={() => {
                setShowReativarDialog(false);
                toast({
                  title: "✅ Projeto Reativado",
                  description:
                    "Pagamento processado. O projeto voltou a ficar ativo.",
                });
              }}
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Pagar e Reativar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AVULSO Reativar Alert */}
      <Dialog
        open={showAvulsoReativarAlert}
        onOpenChange={setShowAvulsoReativarAlert}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reativar Projeto Avulso?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 py-2">
            Este projeto está <strong>Concluído</strong>. Deseja reativá-lo
            adicionando novos itens? Todo o histórico será preservado em um
            único lugar.
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAvulsoReativarAlert(false)}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              className="btn-brand"
              onClick={() => {
                setShowAvulsoReativarAlert(false);
                toast({
                  title: "✅ Projeto Reativado",
                  description: "Adicione novos produtos para continuar.",
                });
              }}
            >
              Reativar e Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Custom Document Dialog ─────────────────────────────────────────── */}
      <Dialog open={showCustomDocDialog} onOpenChange={setShowCustomDocDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-violet-600" />
              Documento Personalizado
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Upload area */}
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">
                Template Word (.docx)
              </p>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setCustomDocDragOver(true);
                }}
                onDragLeave={() => setCustomDocDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setCustomDocDragOver(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f && f.name.endsWith(".docx")) setCustomDocFile(f);
                }}
                onClick={() =>
                  document.getElementById("custom-doc-input")?.click()
                }
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                  customDocDragOver
                    ? "border-violet-400 bg-violet-50"
                    : customDocFile
                      ? "border-emerald-400 bg-emerald-50"
                      : "border-slate-200 hover:border-violet-300 hover:bg-slate-50"
                }`}
              >
                <input
                  id="custom-doc-input"
                  type="file"
                  accept=".docx"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setCustomDocFile(f);
                  }}
                />
                {customDocFile ? (
                  <div className="flex items-center justify-center gap-2 text-emerald-700">
                    <File className="h-5 w-5" />
                    <span className="font-medium text-sm">
                      {customDocFile.name}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCustomDocFile(null);
                      }}
                      className="ml-1 text-emerald-500 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="text-slate-400">
                    <Upload className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-medium">
                      Arraste um arquivo .docx ou clique para selecionar
                    </p>
                    <p className="text-xs mt-1">
                      Somente arquivos Word (.docx)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Download template model */}
            <div className="flex items-center justify-between p-3 bg-violet-50 rounded-lg border border-violet-100">
              <div>
                <p className="text-sm font-medium text-violet-800">
                  Não tem um template?
                </p>
                <p className="text-xs text-violet-600 mt-0.5">
                  Baixe nosso modelo com todos os códigos documentados
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-violet-300 text-violet-700 hover:bg-violet-100 shrink-0"
                onClick={() => generateTemplateModel()}
              >
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Baixar Modelo
              </Button>
            </div>

            {/* Placeholders reference */}
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2">
                Códigos disponíveis
              </p>
              <div className="rounded-lg border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 grid grid-cols-[auto_1fr] gap-0 text-[10px] font-semibold text-slate-500 uppercase tracking-wide px-3 py-2 border-b border-slate-200">
                  <span className="w-44">Código</span>
                  <span>Descrição</span>
                </div>
                <div className="divide-y divide-slate-100 max-h-44 overflow-y-auto">
                  {PROPOSAL_PLACEHOLDERS.map((ph) => (
                    <div
                      key={ph.code}
                      className="grid grid-cols-[auto_1fr] gap-0 px-3 py-2 hover:bg-slate-50 text-xs"
                    >
                      <code className="w-44 font-mono text-violet-700 text-[11px]">
                        {ph.code}
                      </code>
                      <span className="text-slate-600">{ph.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Loop placeholders reference */}
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-1">
                Loop de produtos
              </p>
              <p className="text-xs text-slate-500 mb-2">
                Tudo entre{" "}
                <code className="font-mono text-violet-700">
                  {"{#produtos}"}
                </code>{" "}
                e{" "}
                <code className="font-mono text-violet-700">
                  {"{/produtos}"}
                </code>{" "}
                se repete para cada produto do projeto.
              </p>
              <div className="rounded-lg border border-slate-200 overflow-hidden">
                <div className="divide-y divide-slate-100">
                  {PROPOSAL_LOOP_PLACEHOLDERS.map((ph) => (
                    <div
                      key={ph.code}
                      className="grid grid-cols-[auto_1fr] gap-0 px-3 py-2 hover:bg-slate-50 text-xs"
                    >
                      <code className="w-44 font-mono text-emerald-700 text-[11px]">
                        {ph.code}
                      </code>
                      <span className="text-slate-600">{ph.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 mt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCustomDocDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!customDocFile || isExportingDocx}
              onClick={async () => {
                if (!customDocFile || !project) return;
                setIsExportingDocx(true);
                try {
                  const data = buildProposalData(
                    mockData,
                    dadosProjForm,
                    project,
                  );
                  const blob = await processCustomDocx(customDocFile, data);
                  downloadBlob(
                    blob,
                    `proposta_${(dadosProjForm.agencia || project.name || "projeto").replace(/\s+/g, "_")}.docx`,
                  );
                } finally {
                  setIsExportingDocx(false);
                }
              }}
            >
              <File className="h-3.5 w-3.5 mr-1.5" />
              {isExportingDocx ? "Gerando..." : "Baixar .docx"}
            </Button>
            <Button
              size="sm"
              className="btn-brand"
              disabled={!customDocFile || isExportingPdf}
              onClick={async () => {
                if (!customDocFile || !project) return;
                setIsExportingPdf(true);
                try {
                  const data = buildProposalData(
                    mockData,
                    dadosProjForm,
                    project,
                  );
                  const blob = await processCustomDocx(customDocFile, data);
                  await customDocxToPDF(
                    blob,
                    `proposta_${(dadosProjForm.agencia || project.name || "projeto").replace(/\s+/g, "_")}_personalizada.pdf`,
                  );
                } finally {
                  setIsExportingPdf(false);
                }
              }}
            >
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              {isExportingPdf ? "Gerando PDF..." : "Baixar como PDF"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Task Detail Drawer ─────────────────────────────────────────────── */}
      {/* Full-width drawer (sidebar → right edge) with tabs: dados, briefing,  */}
      {/* etapas, comentários, aprovação, hist. entrega, hist. status, acessos, anexos */}
      <TarefaDetailDrawer
        tarefa={taskDrawerTask}
        open={taskDrawerOpen}
        onClose={() => setTaskDrawerOpen(false)}
        onStatusChange={() => {}}
        updatingId={null}
        onLaunch={(t) => {
          setTaskDrawerOpen(false);
          setLaunchDrawerTask(t);
          setLaunchDrawerOpen(true);
        }}
      />

      {/* ── Task Launch Drawer ─────────────────────────────────────────────── */}
      {launchDrawerOpen && launchDrawerTask && (
        <TaskLaunchDrawer
          task={launchDrawerTask}
          onClose={() => {
            setLaunchDrawerOpen(false);
            setLaunchDrawerTask(null);
          }}
          onReleased={(taskId) => {
            setLaunchDrawerOpen(false);
            setLaunchDrawerTask(null);
            // Refresh project data so the task list reflects the new status
            fetchModalData();
          }}
          onTaskUpdated={(updatedTask) => {
            setLaunchDrawerTask(updatedTask);
          }}
        />
      )}
    </>
  );
}
