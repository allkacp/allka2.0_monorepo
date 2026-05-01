// @ts-nocheck
import type React from "react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  FolderKanban,
  Mail,
  Calendar,
  DollarSign,
  User,
  AlertCircle,
  Check,
  Camera,
  ZoomIn,
  Trash2,
  Crosshair,
  UserPlus,
  Search,
  Building2,
  ShoppingBag,
  Package,
  X as XIcon,
  Save,
  Eye,
  ArrowLeft,
  CreditCard,
  Percent,
  TrendingUp,
  ShoppingCart,
  Plus,
  Send,
  UserCheck,
  FileDown,
  Loader2,
  ChevronRight,
} from "lucide-react";
import type { MockClientItem, MockCompanyItem } from "@/lib/mock-companies";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { CompanyCreateSlidePanel } from "@/components/company-create-slide-panel";
import { UserCreateSlidePanel } from "@/components/user-create-slide-panel";
import { useProjects } from "@/hooks/useProjects";
import {
  exportProposalPDF,
  parseBrandGradient,
  type ProposalData,
} from "@/lib/proposal-export";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { ButtonLoader } from "@/components/ui/loading";
import { useSidebar } from "@/contexts/sidebar-context";
import { ModalBrandHeader } from "@/components/ui/modal-brand-header";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
  ProductCatalogView,
  type CatalogSelectedProduct,
} from "@/components/product-catalog-view";
import { CheckoutFlow } from "@/components/checkout-flow";
import type { CheckoutData } from "@/components/checkout-flow";
import {
  SendApprovalModal,
  type ApprovalContact,
  type SendApprovalOptions,
} from "@/components/send-approval-modal";

// ── Project status types & config ─────────────────────────────────────────────
type ProjectStatus =
  | "draft"
  | "pending-approval"
  | "awaiting-payment"
  | "planning"
  | "in-progress"
  | "paused"
  | "completed"
  | "canceled";

const PROJECT_STATUS_CONFIG: Record<
  ProjectStatus,
  {
    label: string;
    color: string;
    dot: string;
    btn: string;
    btnSelected: string;
  }
> = {
  draft: {
    label: "Rascunho",
    dot: "bg-slate-400",
    color: "bg-slate-100 text-slate-700",
    btn: "bg-slate-100 text-slate-700 hover:bg-slate-200",
    btnSelected: "bg-slate-500 text-white shadow-md scale-105",
  },
  "pending-approval": {
    label: "Ag. Aprovação",
    dot: "bg-amber-500",
    color: "bg-amber-100 text-amber-800",
    btn: "bg-amber-50 text-amber-700 hover:bg-amber-100",
    btnSelected: "bg-amber-500 text-white shadow-md scale-105",
  },
  "awaiting-payment": {
    label: "Ag. Pagamento",
    dot: "bg-cyan-500",
    color: "bg-cyan-100 text-cyan-800",
    btn: "bg-cyan-50 text-cyan-700 hover:bg-cyan-100",
    btnSelected: "bg-cyan-500 text-white shadow-md scale-105",
  },
  planning: {
    label: "Planejamento",
    dot: "bg-orange-500",
    color: "bg-orange-100 text-orange-800",
    btn: "bg-orange-50 text-orange-700 hover:bg-orange-100",
    btnSelected: "bg-orange-500 text-white shadow-md scale-105",
  },
  "in-progress": {
    label: "Em Andamento",
    dot: "bg-blue-500",
    color: "bg-blue-100 text-blue-800",
    btn: "bg-blue-50 text-blue-700 hover:bg-blue-100",
    btnSelected: "bg-blue-500 text-white shadow-md scale-105",
  },
  paused: {
    label: "Pausado",
    dot: "bg-amber-500",
    color: "bg-amber-100 text-amber-800",
    btn: "bg-amber-50 text-amber-700 hover:bg-amber-100",
    btnSelected: "bg-amber-500 text-white shadow-md scale-105",
  },
  completed: {
    label: "Concluído",
    dot: "bg-emerald-500",
    color: "bg-emerald-100 text-emerald-800",
    btn: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    btnSelected: "bg-emerald-500 text-white shadow-md scale-105",
  },
  canceled: {
    label: "Cancelado",
    dot: "bg-red-500",
    color: "bg-red-100 text-red-800",
    btn: "bg-red-50 text-red-700 hover:bg-red-100",
    btnSelected: "bg-red-500 text-white shadow-md scale-105",
  },
};

const STATUS_OPTIONS = Object.entries(PROJECT_STATUS_CONFIG) as [
  ProjectStatus,
  (typeof PROJECT_STATUS_CONFIG)[ProjectStatus],
][];

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
];

// ── Props ──────────────────────────────────────────────────────────────────────
interface ProjectCreateNewPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (project: any) => void;
  /** Optional: pre-fill all fields (for Clone mode) */
  initialData?: Partial<{
    nome: string;
    tipo: string;
    agencia: string;
    cliente: string;
    clienteCnpj: string;
    consultor: string;
    emailConsultor: string;
    dataInicio: string;
    prazo: string;
    orcamento: string;
    permitePortfolio: boolean;
    sincronizadoBitrix: boolean;
    descricao: string;
    status: ProjectStatus;
  }>;
  cloneMode?: boolean;
  /** When set, empresa field is shown as read-only with this name (company-modal mode) */
  companyName?: string;
  /** When set, empresa field is shown as read-only and maps to this id */
  companyId?: string | number;
  /** When true, empresa field becomes a dropdown (admin-projetos mode) */
  allowCompanySelect?: boolean;
  /** Resume a draft: pre-load these products into the catalog step */
  draftProducts?: CatalogSelectedProduct[];
  draftProductQuantities?: Record<string, number>;
  draftCommissions?: Record<string, number>;
  /** Full commission objects from basket — hydrates productCommissionData */
  draftCommissionData?: Record<
    string,
    {
      tipoComissao: "PERCENTUAL" | "VALOR_FIXO";
      percentualComissao: number;
      valorComissao: number;
      pagador: "AGENCIA" | "CLIENTE";
    }
  >;
  /** The backend project ID of the draft being resumed */
  draftProjectId?: string | number;
  /** If true, skip straight to checkout step */
  resumeToCheckout?: boolean;
}

interface FormData {
  nome: string;
  tipo: string;
  agencia: string;
  cliente: string;
  clienteCnpj: string;
  consultor: string;
  emailConsultor: string;
  dataInicio: string;
  prazo: string;
  orcamento: string;
  permitePortfolio: boolean;
  sincronizadoBitrix: boolean;
  descricao: string;
  status: ProjectStatus;
}

interface FormErrors {
  [key: string]: string;
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
};

// ── Component ──────────────────────────────────────────────────────────────────
export function ProjectCreateNewPanel({
  open,
  onOpenChange,
  onCreate,
  initialData,
  cloneMode = false,
  companyName,
  companyId: companyIdProp,
  allowCompanySelect = false,
  draftProducts,
  draftProductQuantities,
  draftCommissions,
  draftCommissionData,
  draftProjectId,
  resumeToCheckout,
}: ProjectCreateNewPanelProps) {
  const { toast } = useToast();
  const { sidebarWidth, sidebarSettings } = useSidebar();
  const [loading, setLoading] = useState(false);
  /** Tracks which footer action triggered loading, so each button shows its own label. */
  const [loadingAction, setLoadingAction] = useState<"draft" | "submit" | null>(
    null,
  );
  const [exportingPDF, setExportingPDF] = useState(false);
  const [savedDraftId, setSavedDraftId] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const ALL_ACCORDIONS = [
    "dados",
    "responsavel",
    "datas",
    "orcamento",
    "config",
  ];
  const [openAccordions, setOpenAccordions] = useState<string[]>(["dados"]);
  const [isClosing, setIsClosing] = useState(false);

  // Company-scoping state (string | null — Company.id is a CUID string)
  const [resolvedCompanyId, setResolvedCompanyId] = useState<string | null>(
    companyIdProp != null ? String(companyIdProp) : null,
  );
  const [resolvedCompanyName, setResolvedCompanyName] = useState<string>(
    companyName ?? "",
  );

  // New-client inline form state
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [localClients, setLocalClients] = useState<MockClientItem[]>([]);

  // Consultant state — fetched from API per company
  const [localConsultants, setLocalConsultants] = useState<
    { id: string; name: string; email: string; role: string }[]
  >([]);
  const [loadingConsultants, setLoadingConsultants] = useState(false);
  const [showCreateConsultant, setShowCreateConsultant] = useState(false);

  // Custom project types added inline
  const [localProjectTypes, setLocalProjectTypes] = useState<string[]>([]);
  const [showNewTypeForm, setShowNewTypeForm] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");

  // Company creation
  const [showCreateCompany, setShowCreateCompany] = useState(false);
  // (localCompanies defined above with the API companies state)

  // Project name uniqueness
  const { projects: existingProjects } = useProjects();
  const existingProjectNames = existingProjects.map((p) =>
    p.name.toLowerCase(),
  );
  const [warnings, setWarnings] = useState<Record<string, string>>({});

  // Company data from API — lazy-loaded when panel opens
  const [apiCompanies, setApiCompanies] = useState<MockCompanyItem[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [companiesError, setCompaniesError] = useState<string | null>(null);
  // Custom companies added inline (after "Cadastrar empresa")
  const [localCompanies, setLocalCompanies] = useState<MockCompanyItem[]>([]);

  // Products catalog + cart state
  const [showProductsStep, setShowProductsStep] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<
    CatalogSelectedProduct[]
  >([]);
  const [productQuantities, setProductQuantities] = useState<
    Record<string, number>
  >({});
  const [productCommissions, setProductCommissions] = useState<
    Record<string, number>
  >({});
  const [productCommissionData, setProductCommissionData] = useState<
    Record<
      string,
      {
        tipoComissao: "PERCENTUAL" | "VALOR_FIXO";
        percentualComissao: number;
        valorComissao: number;
        pagador: "AGENCIA" | "CLIENTE";
      }
    >
  >({});
  const [showEditProducts, setShowEditProducts] = useState(false);
  const [activeReviewTab, setActiveReviewTab] = useState<
    "resumo" | "comissoes"
  >("resumo");
  const [showNextStepModal, setShowNextStepModal] = useState(false);
  const [showSendApprovalModal, setShowSendApprovalModal] = useState(false);
  // Tracks whether the Review was opened from the project-form (via NextStepModal)
  // vs. from inside the Products catalog. Used to restore the correct screen on close.
  const [reviewFromForm, setReviewFromForm] = useState(false);

  // Avatar / crop states
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [originalRawSrc, setOriginalRawSrc] = useState<string | null>(null);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cropImgRef = useRef<HTMLImageElement>(null);
  const CROP_SIZE = 192;

  const buildFormFromInitial = (): FormData => ({
    ...EMPTY_FORM,
    ...(initialData ?? {}),
  });

  const [formData, setFormData] = useState<FormData>(buildFormFromInitial);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      onOpenChange(false);
    }, 420);
  };

  // Reset closing flag once the parent confirms close
  useEffect(() => {
    if (!open) setIsClosing(false);
  }, [open]);

  // Sync when panel opens / initialData changes
  useEffect(() => {
    if (open) {
      setFormData(buildFormFromInitial());
      setErrors({});
      setSubmitAttempted(false);
      setAvatarPreview(null);
      setOriginalRawSrc(null);
      setRawImageSrc(null);
      setCropOpen(false);
      setShowAvatarMenu(false);
      setOpenAccordions(["dados"]);
      // Reset company-scoping
      setResolvedCompanyId(
        companyIdProp != null ? String(companyIdProp) : null,
      );
      setResolvedCompanyName(companyName ?? "");
      setLocalClients([]);
      setLocalCompanies([]);
      setApiCompanies([]);
      setLoadingCompanies(false);
      setCompaniesError(null);
      setShowNewClientForm(false);
      setNewClientName("");
      setNewClientEmail("");
      setLocalConsultants([]);
      setShowCreateConsultant(false);
      setShowProductsStep(false);
      setShowReview(false);
      setShowCheckout(false);
      setSelectedProducts([]);
      setProductQuantities({});
      setProductCommissions({});
      setProductCommissionData({});
      setShowEditProducts(false);
      setActiveReviewTab("resumo");
      setShowNextStepModal(false);
      setReviewFromForm(false);
      setSavedDraftId(draftProjectId ? String(draftProjectId) : null);
      // Hydrate from draft props if resuming
      if (draftProducts && draftProducts.length > 0) {
        setSelectedProducts(draftProducts);
        setProductQuantities(draftProductQuantities ?? {});
        setProductCommissions(draftCommissions ?? {});
        setProductCommissionData(draftCommissionData ?? {});
        // Only auto-jump to products step when resuming an existing draft (has projectId).
        // Basket items (no projectId) stay on the main form so the user fills project details first.
        if (draftProjectId) {
          setShowProductsStep(true);
        }
      }
      if (resumeToCheckout) {
        setShowProductsStep(true);
        setShowCheckout(true);
      }
    }
  }, [open]);

  // Fetch companies lazily when panel opens (and allowCompanySelect is on)
  // ESC closes the Review overlay and returns to the correct previous screen
  useEffect(() => {
    if (!showReview) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowReview(false);
        if (reviewFromForm) {
          setShowProductsStep(false);
          setReviewFromForm(false);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showReview, reviewFromForm]);

  // Runs once on open; company state is fully reset in useEffect([open]) above
  // so this effect only runs when `open` truly transitions false→true.
  useEffect(() => {
    if (!open || !allowCompanySelect) return;
    // Only fetch if list is still empty (reset in the open-sync effect above)
    let cancelled = false;
    setLoadingCompanies(true);
    setCompaniesError(null);
    apiClient
      .getCompanies({ limit: "1000" })
      .then((res: any) => {
        if (cancelled) return;
        const data: any[] = res.data || (Array.isArray(res) ? res : []);
        setApiCompanies(
          data.map((c: any) => ({ id: String(c.id), name: c.name })),
        );
      })
      .catch(() => {
        if (!cancelled)
          setCompaniesError("Não foi possível carregar empresas.");
      })
      .finally(() => {
        if (!cancelled) setLoadingCompanies(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, allowCompanySelect]);

  // Fetch consultants whenever the resolved company changes
  // Guard: only run when panel is open and resolvedCompanyId has stabilised.
  // Also populates the "Cliente" dropdown from the same company users
  // (each Company.user is both a possible client contact AND consultant).
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLocalConsultants([]);
    const filters: Record<string, string> = { limit: "500" };
    if (resolvedCompanyId) filters.company_id = resolvedCompanyId;
    setLoadingConsultants(true);
    apiClient
      .getUsers(filters)
      .then((res: any) => {
        if (cancelled) return;
        const data: any[] = res.data || (Array.isArray(res) ? res : []);
        const activeUsers = data.filter((u) => u.is_active !== false);

        setLocalConsultants(
          activeUsers.map((u) => ({
            id: String(u.id),
            name: u.name,
            email: u.email || "",
            role: u.role || "",
          })),
        );

        // Populate the client dropdown with the same company users.
        // Only auto-fill when a company is actually selected so generic
        // (no-company) opens don't leak global users into the list.
        if (resolvedCompanyId) {
          const clientItems: MockClientItem[] = activeUsers.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email || "",
          }));
          setLocalClients(clientItems);

          // If exactly one client → auto-select it
          if (clientItems.length === 1) {
            const only = clientItems[0];
            setFormData((prev) => ({
              ...prev,
              cliente: only.name,
              clienteCnpj: prev.clienteCnpj,
            }));
          }
        }
      })
      .catch(() => {
        if (!cancelled) setLocalConsultants([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingConsultants(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, resolvedCompanyId]);

  // ── Helpers ──
  const updateField = <K extends keyof FormData>(
    field: K,
    value: FormData[K],
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as string])
      setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validateForm = (): boolean => {
    const e: FormErrors = {};
    if (!formData.nome.trim()) e.nome = "Nome do projeto é obrigatório";
    if (!formData.tipo) e.tipo = "Tipo é obrigatório";
    // Empresa required only when allowCompanySelect is true (must pick one)
    if (allowCompanySelect && !resolvedCompanyId)
      e.agencia = "Empresa é obrigatória";
    if (!formData.agencia.trim() && !allowCompanySelect && !companyName)
      e.agencia = "Empresa é obrigatória";
    if (!formData.cliente.trim()) e.cliente = "Cliente é obrigatório";
    if (!formData.consultor.trim()) e.consultor = "Consultor é obrigatório";
    if (!formData.emailConsultor.trim()) {
      e.emailConsultor = "E-mail é obrigatório";
    } else if (!/\S+@\S+\.\S+/.test(formData.emailConsultor)) {
      e.emailConsultor = "E-mail inválido";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      setSubmitAttempted(true);
      return;
    }
    setShowNextStepModal(true);
  };

  const buildProject = (
    status: string,
    products?: { name: string; price: number; qty: number }[],
  ) => ({
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
    budget:
      parseFloat(
        formData.orcamento.replace(/[^\d.,]/g, "").replace(",", "."),
      ) || 0,
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
    value:
      parseFloat(
        formData.orcamento.replace(/[^\d.,]/g, "").replace(",", "."),
      ) || 0,
  });

  const confirmSubmit = async (
    status: string,
    products?: { name: string; price: number; qty: number }[],
  ) => {
    const isDraft = status === "draft";
    setLoading(true);
    if (!isDraft) {
      setShowProductsStep(false);
      setShowReview(false);
      setShowCheckout(false);
    }
    try {
      const toISODate = (d: string | undefined): string | undefined => {
        if (!d) return undefined;
        if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return `${d}T00:00:00.000Z`;
        return d;
      };
      const budgetValue =
        parseFloat(
          formData.orcamento.replace(/[^\d.,]/g, "").replace(",", "."),
        ) || 0;
      const payload: any = {
        title: formData.nome,
        type: formData.tipo || undefined,
        agency: resolvedCompanyName || formData.agencia || undefined,
        consultant: formData.consultor || undefined,
        consultant_email: formData.emailConsultor || undefined,
        start_date: toISODate(formData.dataInicio),
        end_date: toISODate(formData.prazo),
        budget: budgetValue,
        value: budgetValue,
        portfolio_permission: formData.permitePortfolio,
        bitrix_sync: formData.sincronizadoBitrix,
        description: formData.descricao || undefined,
        status,
        lifecycle: "avulso",
        client_id: resolvedCompanyId ?? undefined,
      };
      const existingId =
        savedDraftId ?? (draftProjectId ? String(draftProjectId) : null);
      let created: any;
      if (isDraft && existingId) {
        created = await apiClient.updateProject(existingId, payload);
      } else {
        created = await apiClient.createProject(payload);
        if (isDraft) setSavedDraftId(String(created?.id));
      }
      if (
        status === "draft" ||
        status === "awaiting-payment" ||
        status === "pending-approval"
      ) {
        const storageKey = `allka-draft-${created?.id ?? existingId ?? Date.now()}`;
        try {
          localStorage.setItem(
            storageKey,
            JSON.stringify({
              formData,
              selectedProducts,
              productQuantities,
              productCommissions,
              productCommissionData,
              projectId: created?.id,
              status,
            }),
          );
        } catch (_) {
          /* quota exceeded – ignore */
        }
      }
      if (isDraft) {
        toast({
          title: "Rascunho salvo",
          description: "Rascunho salvo com sucesso.",
          variant: "success",
        });
      } else {
        const description =
          status === "pending-approval"
            ? "Projeto enviado para aprovação."
            : cloneMode
              ? "Projeto clonado com sucesso!"
              : "Projeto criado com sucesso!";
        toast({ title: "Sucesso", description, variant: "success" });
        onCreate(created);
        handleClose();
      }
    } catch (err: any) {
      console.error("[confirmSubmit]", err);
      toast({
        title: "Erro ao salvar projeto",
        description: isDraft
          ? "Não foi possível salvar o rascunho. Verifique os dados e tente novamente."
          : status === "pending-approval"
            ? "Não foi possível enviar para aprovação."
            : "Falha ao criar o projeto. Verifique os dados e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setLoadingAction(null);
    }
  };

  // ── Format helper ──
  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // ── Product cart handlers ──
  const handleAddProduct = (product: any) => {
    const id = String(product.id);
    setSelectedProducts((prev) => {
      if (prev.find((p) => String(p.id) === id)) return prev;
      return [...prev, { ...product, id, quantity: 1 }];
    });
    setProductQuantities((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  };

  const handleRemoveProduct = (productId: string) => {
    setSelectedProducts((prev) =>
      prev.filter((p) => String(p.id) !== productId),
    );
    setProductQuantities((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  };

  const handleIncreaseProduct = (productId: string) => {
    setProductQuantities((prev) => ({
      ...prev,
      [productId]: (prev[productId] || 1) + 1,
    }));
    setSelectedProducts((prev) =>
      prev.map((p) =>
        String(p.id) === productId
          ? { ...p, quantity: (p.quantity || 1) + 1 }
          : p,
      ),
    );
  };

  const handleDecreaseProduct = (productId: string) => {
    const currentQty = productQuantities[productId] || 1;
    if (currentQty <= 1) {
      handleRemoveProduct(productId);
    } else {
      setProductQuantities((prev) => ({
        ...prev,
        [productId]: prev[productId] - 1,
      }));
      setSelectedProducts((prev) =>
        prev.map((p) =>
          String(p.id) === productId ? { ...p, quantity: p.quantity - 1 } : p,
        ),
      );
    }
  };

  const calculateTotal = () =>
    selectedProducts.reduce((sum, p) => {
      const qty = productQuantities[String(p.id)] || p.quantity || 1;
      return sum + p.finalPrice * qty;
    }, 0);

  // Returns the reason the "Enviar para Aprovação" action is blocked, or null
  // if everything is ready. Used to show inline hints near the button.
  const approvalBlockReason: string | null = (() => {
    if (!formData.nome?.trim()) return "Informe o nome do projeto.";
    if (!resolvedCompanyId && !formData.agencia?.trim())
      return "Selecione uma empresa.";
    if (!formData.cliente?.trim()) return "Selecione um cliente.";
    if (selectedProducts.length === 0) return "Adicione pelo menos um produto.";
    return null;
  })();

  // Returns the reason draft saving is blocked, or null when ready.
  // Only the project name is required for a draft — all other fields are optional.
  const draftBlockReason: string | null = formData.nome?.trim()
    ? null
    : "Informe pelo menos o nome do projeto.";

  // Export PDF requires at least one product and a project name.
  const exportBlockReason: string | null = (() => {
    if (!formData.nome?.trim()) return "Informe o nome do projeto.";
    if (selectedProducts.length === 0) return "Adicione pelo menos um produto.";
    return null;
  })();

  // Checkout requires name + at least one product.
  const checkoutBlockReason: string | null = (() => {
    if (!formData.nome?.trim()) return "Informe o nome do projeto.";
    if (selectedProducts.length === 0) return "Adicione pelo menos um produto.";
    return null;
  })();

  const handleSaveForApproval = () => {
    if (!formData.nome.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Informe o nome do projeto para enviar para aprovação.",
        variant: "destructive",
      });
      return;
    }
    if (selectedProducts.length === 0) {
      toast({
        title: "Adicione produtos",
        description:
          "O projeto precisa ter pelo menos um produto antes de enviar para aprovação.",
        variant: "destructive",
      });
      return;
    }
    const products = selectedProducts.map((p) => {
      const id = String(p.id);
      const qty = productQuantities[id] || p.quantity || 1;
      const c = getProductCommission(id);
      const commValue = calcProductCommissionValue(id, p.finalPrice, qty);
      const clientUnitPrice =
        c.pagador === "CLIENTE" ? p.finalPrice + commValue / qty : p.finalPrice;
      return { name: p.name, price: clientUnitPrice, qty };
    });
    confirmSubmit("pending-approval", products);
  };

  // Opens the Send Approval modal after full validation. Auto-saves as draft
  // if the project hasn't been persisted yet.
  const handleOpenSendApproval = async () => {
    if (!formData.nome.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Informe o nome do projeto para enviar para aprovação.",
        variant: "destructive",
      });
      return;
    }
    if (!resolvedCompanyId && !formData.agencia?.trim()) {
      toast({
        title: "Empresa não selecionada",
        description: "Selecione uma empresa antes de enviar para aprovação.",
        variant: "destructive",
      });
      return;
    }
    if (!formData.cliente?.trim()) {
      toast({
        title: "Cliente não selecionado",
        description: "Selecione um cliente para enviar para aprovação.",
        variant: "destructive",
      });
      return;
    }
    if (selectedProducts.length === 0) {
      toast({
        title: "Adicione produtos",
        description:
          "Adicione pelo menos um produto antes de enviar para aprovação.",
        variant: "destructive",
      });
      return;
    }
    // Auto-save as draft if the project hasn't been saved yet
    if (!savedDraftId) {
      try {
        setLoading(true);
        const budgetValue =
          parseFloat(
            formData.orcamento.replace(/[^\d.,]/g, "").replace(",", "."),
          ) || 0;
        const toISODate = (d: string | undefined): string | undefined => {
          if (!d) return undefined;
          if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return `${d}T00:00:00.000Z`;
          return d;
        };
        const draftPayload: any = {
          title: formData.nome,
          type: formData.tipo || undefined,
          agency: resolvedCompanyName || formData.agencia || undefined,
          consultant: formData.consultor || undefined,
          consultant_email: formData.emailConsultor || undefined,
          start_date: toISODate(formData.dataInicio),
          end_date: toISODate(formData.prazo),
          budget: budgetValue,
          value: budgetValue,
          portfolio_permission: formData.permitePortfolio,
          bitrix_sync: formData.sincronizadoBitrix,
          description: formData.descricao || undefined,
          status: "draft",
          lifecycle: "avulso",
          client_id: resolvedCompanyId ?? undefined,
        };
        const created = await apiClient.createProject(draftPayload);
        if (created?.id) setSavedDraftId(String(created.id));
      } catch (_) {
        // Non-fatal: continue to modal even if draft save fails
      } finally {
        setLoading(false);
      }
    }
    setShowNextStepModal(false);
    setShowSendApprovalModal(true);
  };

  // Called when user confirms "Enviar agora" in the modal
  const handleConfirmSendApproval = (opts: SendApprovalOptions) => {
    // Save send log to localStorage (best-effort)
    try {
      const logEntry = {
        projectName: formData.nome,
        projectId: savedDraftId ?? null,
        sentAt: new Date().toISOString(),
        channels: opts.channels,
        recipientMode: opts.recipientMode,
        recipients: opts.selectedContactIds,
        message: opts.message,
      };
      localStorage.setItem(
        `allka-approval-send-${Date.now()}`,
        JSON.stringify(logEntry),
      );
    } catch (_) {}
    setShowSendApprovalModal(false);
    handleSaveForApproval();
  };

  // Save draft of send configuration (channels + message + recipients)
  const handleSaveApprovalDraft = (opts: SendApprovalOptions) => {
    try {
      localStorage.setItem(
        `allka-approval-draft-${formData.nome}`,
        JSON.stringify(opts),
      );
      toast({
        title: "Rascunho de envio salvo",
        description: "Configurações de envio salvas localmente.",
        variant: "success",
      });
    } catch (_) {}
  };

  const handleSaveDraftNow = () => {
    if (!formData.nome.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Informe o nome do projeto para salvar o rascunho.",
        variant: "destructive",
      });
      return;
    }
    const products = selectedProducts.map((p) => ({
      name: p.name,
      price: p.finalPrice,
      qty: productQuantities[String(p.id)] || p.quantity || 1,
    }));
    setLoadingAction("draft");
    confirmSubmit("draft", products);
  };

  const handleOpenReview = () => {
    setActiveReviewTab("resumo");
    setReviewFromForm(false); // opened from inside the catalog
    setShowReview(true);
  };

  // Closes the Review and returns to the correct previous screen:
  // - if opened from the project form (via NextStepModal) → collapse the
  //   products panel too so the user lands back on the form.
  // - if opened from inside the catalog → just hide the review overlay.
  const handleCloseReview = () => {
    setShowReview(false);
    if (reviewFromForm) {
      setShowProductsStep(false);
      setReviewFromForm(false);
    }
  };

  const handleExportPresentation = async () => {
    setExportingPDF(true);
    try {
      // Proposal uses client-facing prices (base + commission for CLIENTE products)
      const produtos = selectedProducts.map((p) => {
        const id = String(p.id);
        const qty = productQuantities[id] || p.quantity || 1;
        const c = getProductCommission(id);
        const commValue = calcProductCommissionValue(id, p.finalPrice, qty);
        // CLIENTE: client pays base + commission; AGENCIA: client sees base price
        const unit =
          c.pagador === "CLIENTE"
            ? p.finalPrice + commValue / qty
            : p.finalPrice;
        const total = unit * qty;
        return {
          PRODUTO_NOME: p.name,
          ...(p.code ? { PRODUTO_CODIGO: p.code } : {}),
          ...(p.category ? { PRODUTO_CATEGORIA: p.category } : {}),
          ...(p.recurrence ? { PRODUTO_RECORRENCIA: p.recurrence } : {}),
          ...(p.deliveryDays
            ? { PRODUTO_PRAZO: `${p.deliveryDays} dias` }
            : {}),
          // Short description — prefer summaryDescription, fall back to truncated description
          ...(() => {
            const raw: string | undefined =
              p.summaryDescription || p.description;
            if (!raw) return {};
            const desc = raw.length > 200 ? raw.substring(0, 197) + "…" : raw;
            return { PRODUTO_DESCRICAO: desc };
          })(),
          // What is included — up to 5 bullet points, client-visible only
          ...(() => {
            const items: string[] = [];
            const incl = p.presentation?.whatIsIncluded;
            if (Array.isArray(incl) && incl.length > 0) {
              incl.slice(0, 5).forEach((item: any) => {
                if (item?.title) items.push(item.title);
              });
            } else if (
              Array.isArray(p.baseFeatures) &&
              p.baseFeatures.length > 0
            ) {
              p.baseFeatures.slice(0, 5).forEach((f: string) => items.push(f));
            }
            return items.length > 0 ? { PRODUTO_INCLUSOS: items } : {};
          })(),
          PRODUTO_QTD: qty,
          PRODUTO_VALOR_UNIT: unit.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          }),
          PRODUTO_VALOR_TOTAL: total.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          }),
        };
      });
      // Total shown to client = sum of all client-facing product totals
      const totalValue = calculateClientPayTotal() + calculateAgencyPayTotal();
      const effectiveCompanyName =
        resolvedCompanyName || formData.agencia || companyName || "";
      const proposalData: ProposalData = {
        PROJETO_NOME: formData.nome || "Projeto sem nome",
        PROJETO_TIPO: formData.tipo || "",
        PROJETO_STATUS: "Rascunho",
        PROJETO_DESCRICAO: formData.descricao || "",
        CLIENTE_NOME: formData.cliente || "",
        EMPRESA_NOME: effectiveCompanyName,
        CONSULTOR_NOME: formData.consultor || "",
        CONSULTOR_EMAIL: formData.emailConsultor || "",
        DATA_CRIACAO:
          formData.dataInicio || new Date().toLocaleDateString("pt-BR"),
        DATA_ENTREGA: formData.prazo || "",
        PROPOSTA_DATA: new Date().toLocaleDateString("pt-BR"),
        TOTAL_VALOR: totalValue.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        }),
        produtos,
      };
      const brandConfig = {
        gradient: parseBrandGradient(sidebarSettings?.backgroundColor || ""),
        logoUrl: sidebarSettings?.logoUrl || "/images/logob.png",
        agencyName: effectiveCompanyName || "Allka",
      };
      const filename = `proposta-${(formData.nome || "projeto").replace(/\s+/g, "-").toLowerCase()}.pdf`;
      await exportProposalPDF(proposalData, brandConfig, filename);
      toast({
        title: "PDF gerado!",
        description: "A proposta foi baixada com sucesso.",
        variant: "success",
      });
    } catch {
      toast({
        title: "Erro ao exportar",
        description: "Não foi possível gerar o PDF.",
        variant: "destructive",
      });
    } finally {
      setExportingPDF(false);
    }
  };

  // ── Commission helpers ──
  const getProductCommission = (id: string) =>
    productCommissionData[id] ?? {
      tipoComissao: "PERCENTUAL" as const,
      percentualComissao: productCommissions[id] || 0,
      valorComissao: 0,
      pagador: "CLIENTE" as const,
    };

  const calcProductCommissionValue = (
    id: string,
    basePrice: number,
    qty: number,
  ) => {
    const c = getProductCommission(id);
    return c.tipoComissao === "PERCENTUAL"
      ? (basePrice * qty * c.percentualComissao) / 100
      : c.valorComissao * qty;
  };

  const calculateAgencyPayTotal = () =>
    selectedProducts.reduce((sum, p) => {
      const id = String(p.id);
      const qty = productQuantities[id] || p.quantity || 1;
      const c = getProductCommission(id);
      return c.pagador === "AGENCIA" ? sum + p.finalPrice * qty : sum;
    }, 0);

  const calculateClientPayTotal = () =>
    selectedProducts.reduce((sum, p) => {
      const id = String(p.id);
      const qty = productQuantities[id] || p.quantity || 1;
      const c = getProductCommission(id);
      if (c.pagador !== "CLIENTE") return sum;
      return (
        sum +
        p.finalPrice * qty +
        calcProductCommissionValue(id, p.finalPrice, qty)
      );
    }, 0);

  const calculateCommissionTotal = () =>
    selectedProducts.reduce((sum, p) => {
      const id = String(p.id);
      const qty = productQuantities[id] || p.quantity || 1;
      return sum + calcProductCommissionValue(id, p.finalPrice, qty);
    }, 0);

  const calculateClientTotal = () => calculateClientPayTotal();

  const getWeightedCommissionRate = () => {
    const total = calculateTotal();
    if (total === 0) return 0;
    return (calculateCommissionTotal() / total) * 100;
  };

  const buildPreselectedClient = () => ({
    name: formData.cliente,
    email: formData.emailConsultor,
    phone: "",
    company: formData.clienteCnpj || formData.cliente,
  });

  const convertProductsToCartItems = () =>
    selectedProducts.map((p) => {
      const id = String(p.id);
      const qty = productQuantities[id] || p.quantity || 1;
      const c = getProductCommission(id);
      const commValue = calcProductCommissionValue(id, p.finalPrice, qty);
      // Checkout uses client-facing price: CLIENTE pays base+commission, AGENCIA pays base
      const checkoutPrice =
        c.pagador === "CLIENTE" ? p.finalPrice + commValue / qty : p.finalPrice;
      return {
        id,
        product: {
          id,
          name: p.name,
          description: p.description || "",
          shortDescription: p.description || "",
          category: p.category || "",
          tags: [],
          basePrice: checkoutPrice,
          complexity: "basic" as const,
          visibility: {
            company: true,
            agency: true,
            partner: true,
            inHouse: true,
          },
          variations: [],
          addons: [],
          stats: { contractCount: 0, averageRating: 0, completionTime: "" },
          demonstrations: [],
          image: p.image || "",
        },
        quantity: qty,
      };
    });

  const handleCheckoutComplete = (_data: CheckoutData) => {
    const products = selectedProducts.map((p) => {
      const id = String(p.id);
      const qty = productQuantities[id] || p.quantity || 1;
      const c = getProductCommission(id);
      const commValue = calcProductCommissionValue(id, p.finalPrice, qty);
      const clientUnitPrice =
        c.pagador === "CLIENTE" ? p.finalPrice + commValue / qty : p.finalPrice;
      return { name: p.name, price: clientUnitPrice, qty };
    });
    confirmSubmit("awaiting-payment", products);
  };

  // ── Avatar handlers ──
  const handleAvatarClick = () => {
    if (avatarPreview) setShowAvatarMenu((p) => !p);
    else fileInputRef.current?.click();
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
    setAvatarPreview(canvas.toDataURL("image/jpeg", 0.92));
    setCropOpen(false);
    setRawImageSrc(null);
  };

  // ── Error counts ──
  const sectionErrors = {
    dados: [errors.nome, errors.tipo, errors.agencia, errors.cliente].filter(
      Boolean,
    ).length,
    responsavel: [errors.consultor, errors.emailConsultor].filter(Boolean)
      .length,
  };
  const totalErrors = Object.values(sectionErrors).reduce((a, b) => a + b, 0);

  const panelWidth = `calc(100vw - ${sidebarWidth}px)`;

  if (!open && !isClosing) return null;

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
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Header */}
          <ModalBrandHeader
            title={
              formData.nome || (cloneMode ? "Clonar Projeto" : "Novo Projeto")
            }
            subtitle={
              cloneMode
                ? "Clonar projeto existente"
                : "Configure os dados do projeto"
            }
            left={
              <button
                onClick={handleAvatarClick}
                className="relative h-20 w-20 rounded-full bg-white/15 border-2 border-white/30 flex-shrink-0 group overflow-hidden hover:border-white/60 transition-all"
              >
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-600 to-violet-600">
                  <FolderKanban className="h-7 w-7 text-white/70" />
                </div>
                {avatarPreview && (
                  <img
                    src={avatarPreview}
                    alt="logo"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                  <Camera className="h-5 w-5 text-white" />
                  <span className="text-[9px] text-white/90 font-medium mt-0.5">
                    {avatarPreview ? "Editar" : "Foto"}
                  </span>
                </div>
              </button>
            }
            onClose={handleClose}
          />

          {/* Avatar menu */}
          {showAvatarMenu && avatarPreview && (
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
                    setAvatarPreview(null);
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
                  Ajustar imagem do projeto
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
                    setIsDragging(true);
                    setDragStart({
                      x: e.clientX - cropOffset.x,
                      y: e.clientY - cropOffset.y,
                    });
                  }}
                  onMouseMove={(e) => {
                    if (!isDragging) return;
                    setCropOffset({
                      x: e.clientX - dragStart.x,
                      y: e.clientY - dragStart.y,
                    });
                  }}
                  onMouseUp={() => setIsDragging(false)}
                  onMouseLeave={() => setIsDragging(false)}
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

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-[50px] py-[50px] bg-slate-200 dark:bg-background">
            {/* Validation warning */}
            {submitAttempted && totalErrors > 0 && (
              <div className="mb-4 flex items-center gap-2.5 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                <p className="text-xs text-red-700 font-medium">
                  {totalErrors === 1
                    ? "Falta 1 campo obrigatório"
                    : `Faltam ${totalErrors} campos obrigatórios`}
                </p>
              </div>
            )}

            {/* Expand/Collapse toggle */}
            <div className="flex items-center justify-end pb-3">
              <button
                onClick={() =>
                  setOpenAccordions(
                    ALL_ACCORDIONS.every((a) => openAccordions.includes(a))
                      ? []
                      : ALL_ACCORDIONS,
                  )
                }
                className="flex items-center gap-2 group"
              >
                <span className="text-xs text-slate-500 group-hover:text-slate-700 transition-colors select-none">
                  {ALL_ACCORDIONS.every((a) => openAccordions.includes(a))
                    ? "Fechar"
                    : "Expandir"}
                </span>
                <div
                  className={cn(
                    "relative w-9 h-5 rounded-full transition-colors duration-200",
                    ALL_ACCORDIONS.every((a) => openAccordions.includes(a))
                      ? "bg-blue-600"
                      : "bg-slate-300",
                  )}
                >
                  <div
                    className={cn(
                      "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200",
                      ALL_ACCORDIONS.every((a) => openAccordions.includes(a))
                        ? "translate-x-4"
                        : "translate-x-0.5",
                    )}
                  />
                </div>
              </button>
            </div>

            <Accordion
              type="multiple"
              value={openAccordions}
              onValueChange={setOpenAccordions}
              className="space-y-2"
            >
              {/* ── SEÇÃO 1: DADOS DO PROJETO ── */}
              <AccordionItem
                value="dados"
                className={cn(
                  "border rounded-lg overflow-hidden",
                  sectionErrors.dados > 0
                    ? "border-red-300"
                    : "border-slate-200",
                )}
              >
                <AccordionTrigger
                  className={cn(
                    "px-3 py-2 text-xs font-semibold",
                    sectionErrors.dados > 0
                      ? "bg-red-50 hover:bg-red-100"
                      : "bg-white hover:bg-slate-50",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Badge className="bg-blue-100 text-blue-700">1</Badge>
                    Dados do Projeto
                    {sectionErrors.dados > 0 && (
                      <span className="ml-1 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">
                        {sectionErrors.dados}
                      </span>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="border-t bg-white px-3 py-3">
                    <div className="grid grid-cols-2 gap-3">
                      {/* Nome */}
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs font-medium text-slate-600">
                          Nome do Projeto *
                        </Label>
                        <Input
                          placeholder="Ex: Website Institucional Florescer"
                          value={formData.nome}
                          onChange={(e) => {
                            updateField("nome", e.target.value);
                            if (warnings.nome)
                              setWarnings((prev) => ({ ...prev, nome: "" }));
                          }}
                          onBlur={() => {
                            if (
                              formData.nome.trim() &&
                              existingProjectNames.includes(
                                formData.nome.trim().toLowerCase(),
                              )
                            ) {
                              setWarnings((prev) => ({
                                ...prev,
                                nome: "Este nome já está em uso",
                              }));
                            } else {
                              setWarnings((prev) => ({ ...prev, nome: "" }));
                            }
                          }}
                          className={cn(
                            "h-8 text-xs",
                            errors.nome && "border-red-400",
                            !errors.nome && warnings.nome && "border-amber-400",
                          )}
                        />
                        {errors.nome && (
                          <p className="text-xs text-red-500">{errors.nome}</p>
                        )}
                        {!errors.nome && warnings.nome && (
                          <p className="text-xs text-amber-600">
                            {warnings.nome}
                          </p>
                        )}
                      </div>

                      {/* Tipo */}
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs font-medium text-slate-600">
                          Tipo de Projeto *
                        </Label>
                        {!showNewTypeForm ? (
                          <SearchableSelect
                            items={[...PROJECT_TYPES, ...localProjectTypes].map(
                              (t) => ({ value: t, label: t }),
                            )}
                            value={formData.tipo}
                            onValueChange={(v) => updateField("tipo", v)}
                            placeholder="Selecione o tipo"
                            searchPlaceholder="Pesquisar tipo..."
                            emptyMessage="Nenhum tipo encontrado."
                            className={cn(
                              "h-8 text-xs",
                              errors.tipo && "border-red-400",
                            )}
                            onAddNew={() => setShowNewTypeForm(true)}
                            addNewLabel="Adicionar tipo"
                          />
                        ) : (
                          <div className="space-y-1.5 p-2.5 bg-violet-50 rounded-lg border border-violet-200">
                            <p className="text-[10px] font-semibold text-violet-700 uppercase tracking-wider">
                              Novo tipo
                            </p>
                            <Input
                              placeholder="Nome do tipo *"
                              value={newTypeName}
                              onChange={(e) => setNewTypeName(e.target.value)}
                              className="h-7 text-xs"
                            />
                            <div className="flex gap-1.5 pt-0.5">
                              <button
                                type="button"
                                onClick={() => {
                                  if (!newTypeName.trim()) return;
                                  setLocalProjectTypes((prev) => [
                                    ...prev,
                                    newTypeName.trim(),
                                  ]);
                                  updateField("tipo", newTypeName.trim());
                                  setNewTypeName("");
                                  setShowNewTypeForm(false);
                                }}
                                className="flex-1 h-7 rounded-md btn-brand text-xs font-semibold"
                              >
                                Adicionar
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowNewTypeForm(false);
                                  setNewTypeName("");
                                }}
                                className="h-7 w-7 flex items-center justify-center rounded-md border border-slate-200 bg-white text-slate-400 hover:bg-slate-50"
                              >
                                <XIcon className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        )}
                        {errors.tipo && (
                          <p className="text-xs text-red-500">{errors.tipo}</p>
                        )}
                      </div>

                      {/* Empresa */}
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs font-medium text-slate-600">
                          Empresa *
                        </Label>
                        {companyName ? (
                          <div className="flex items-center gap-2 h-8 px-2.5 bg-slate-100 rounded-md border border-slate-200">
                            <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="text-xs font-semibold text-slate-700 truncate">
                              {companyName}
                            </span>
                          </div>
                        ) : allowCompanySelect ? (
                          <SearchableSelect
                            items={[...apiCompanies, ...localCompanies].map(
                              (c) => ({
                                value: String(c.id),
                                label: c.name,
                              }),
                            )}
                            value={resolvedCompanyId ?? ""}
                            onValueChange={(v) => {
                              const allCos = [
                                ...apiCompanies,
                                ...localCompanies,
                              ];
                              const co = allCos.find((c) => String(c.id) === v);
                              setResolvedCompanyId(v || null);
                              setResolvedCompanyName(co?.name ?? "");
                              updateField("agencia", co?.name ?? "");
                              updateField("cliente", "");
                              updateField("clienteCnpj", "");
                              updateField("consultor", "");
                              updateField("emailConsultor", "");
                              setLocalClients([]);
                            }}
                            placeholder="Pesquisar empresa..."
                            searchPlaceholder="Digite para buscar..."
                            emptyMessage="Nenhuma empresa encontrada."
                            loading={loadingCompanies}
                            loadingMessage="Carregando empresas..."
                            errorMessage={companiesError ?? undefined}
                            className={cn(
                              "h-8 text-xs",
                              errors.agencia && "border-red-400",
                            )}
                            onAddNew={() => setShowCreateCompany(true)}
                            addNewLabel="Cadastrar empresa"
                          />
                        ) : (
                          <Input
                            placeholder="Nome da empresa"
                            value={formData.agencia}
                            onChange={(e) => {
                              updateField("agencia", e.target.value);
                              setResolvedCompanyName(e.target.value);
                            }}
                            className={cn(
                              "h-8 text-xs",
                              errors.agencia && "border-red-400",
                            )}
                          />
                        )}
                        {errors.agencia && (
                          <p className="text-xs text-red-500">
                            {errors.agencia}
                          </p>
                        )}
                      </div>

                      {/* Cliente */}
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs font-medium text-slate-600">
                          Cliente *
                        </Label>
                        {resolvedCompanyId ? (
                          <>
                            {!showNewClientForm ? (
                              <SearchableSelect
                                items={[...localClients].map((c) => ({
                                  value: c.name,
                                  label: c.name,
                                  sublabel: c.cnpj || c.email || undefined,
                                }))}
                                value={formData.cliente}
                                onValueChange={(v) => {
                                  const cl = localClients.find(
                                    (c) => c.name === v,
                                  );
                                  updateField("cliente", v);
                                  if (cl?.cnpj)
                                    updateField("clienteCnpj", cl.cnpj);
                                }}
                                placeholder="Pesquisar cliente..."
                                searchPlaceholder="Digite para buscar..."
                                emptyMessage="Nenhum cliente encontrado."
                                className={cn(
                                  "h-8 text-xs",
                                  errors.cliente && "border-red-400",
                                )}
                                onAddNew={() => setShowNewClientForm(true)}
                                addNewLabel="Novo cliente"
                              />
                            ) : (
                              <div className="space-y-1.5 p-2.5 bg-violet-50 rounded-lg border border-violet-200">
                                <p className="text-[10px] font-semibold text-violet-700 uppercase tracking-wider">
                                  Novo cliente
                                </p>
                                <Input
                                  placeholder="Nome do cliente *"
                                  value={newClientName}
                                  onChange={(e) =>
                                    setNewClientName(e.target.value)
                                  }
                                  className="h-7 text-xs"
                                />
                                <Input
                                  placeholder="E-mail"
                                  value={newClientEmail}
                                  onChange={(e) =>
                                    setNewClientEmail(e.target.value)
                                  }
                                  className="h-7 text-xs"
                                />
                                <div className="flex gap-1.5 pt-0.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!newClientName.trim()) return;
                                      const nc: MockClientItem = {
                                        id: Date.now(),
                                        name: newClientName.trim(),
                                        email: newClientEmail.trim(),
                                      };
                                      setLocalClients((prev) => [...prev, nc]);
                                      updateField("cliente", nc.name);
                                      setNewClientName("");
                                      setNewClientEmail("");
                                      setShowNewClientForm(false);
                                    }}
                                    className="flex-1 h-7 rounded-md btn-brand text-xs font-semibold"
                                  >
                                    Adicionar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setShowNewClientForm(false)}
                                    className="h-7 w-7 flex items-center justify-center rounded-md border border-slate-200 bg-white text-slate-400 hover:bg-slate-50"
                                  >
                                    <XIcon className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <Input
                            placeholder={
                              allowCompanySelect
                                ? "Selecione uma empresa primeiro"
                                : "Nome do cliente"
                            }
                            disabled={allowCompanySelect && !resolvedCompanyId}
                            value={formData.cliente}
                            onChange={(e) =>
                              updateField("cliente", e.target.value)
                            }
                            className={cn(
                              "h-8 text-xs",
                              errors.cliente && "border-red-400",
                            )}
                          />
                        )}
                        {errors.cliente && (
                          <p className="text-xs text-red-500">
                            {errors.cliente}
                          </p>
                        )}
                      </div>

                      {/* CNPJ do cliente */}
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs font-medium text-slate-600">
                          CNPJ do Cliente
                        </Label>
                        <Input
                          placeholder="00.000.000/0001-00"
                          value={formData.clienteCnpj}
                          onChange={(e) =>
                            updateField("clienteCnpj", e.target.value)
                          }
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* ── SEÇÃO 2: RESPONSÁVEL ── */}
              <AccordionItem
                value="responsavel"
                className={cn(
                  "border rounded-lg overflow-hidden",
                  sectionErrors.responsavel > 0
                    ? "border-red-300"
                    : "border-slate-200",
                )}
              >
                <AccordionTrigger
                  className={cn(
                    "px-3 py-2 text-xs font-semibold",
                    sectionErrors.responsavel > 0
                      ? "bg-red-50 hover:bg-red-100"
                      : "bg-white hover:bg-slate-50",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-100 text-green-700">2</Badge>
                    Responsável
                    {sectionErrors.responsavel > 0 && (
                      <span className="ml-1 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">
                        {sectionErrors.responsavel}
                      </span>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="border-t bg-white px-3 py-3 grid grid-cols-2 gap-3">
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs font-medium text-slate-600">
                        Consultor Responsável *
                      </Label>
                      <div className="flex gap-1.5">
                        <div className="flex-1 min-w-0">
                          {loadingConsultants ? (
                            <div className="h-8 flex items-center px-3 rounded-md border border-slate-200 bg-slate-50 text-xs text-slate-400 gap-2">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Carregando consultores...
                            </div>
                          ) : localConsultants.length > 0 ? (
                            <SearchableSelect
                              items={localConsultants.map((u) => ({
                                value: u.name,
                                label: u.name,
                                sublabel: u.role || u.email,
                              }))}
                              value={formData.consultor}
                              onValueChange={(v) => {
                                const u = localConsultants.find(
                                  (u) => u.name === v,
                                );
                                updateField("consultor", v);
                                if (u?.email)
                                  updateField("emailConsultor", u.email);
                              }}
                              placeholder="Pesquisar consultor..."
                              searchPlaceholder="Digite para buscar..."
                              emptyMessage="Nenhum consultor encontrado."
                              className={cn(
                                "h-8 text-xs",
                                errors.consultor && "border-red-400",
                              )}
                            />
                          ) : (
                            <div className="relative">
                              <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                              <Input
                                placeholder={
                                  resolvedCompanyId
                                    ? "Nenhum consultor cadastrado nesta empresa"
                                    : "Nome do consultor"
                                }
                                value={formData.consultor}
                                onChange={(e) =>
                                  updateField("consultor", e.target.value)
                                }
                                className={cn(
                                  "h-8 text-xs pl-8",
                                  errors.consultor && "border-red-400",
                                )}
                              />
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          title="Adicionar novo consultor"
                          onClick={() => setShowCreateConsultant(true)}
                          className="h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-md border border-slate-200 bg-white hover:bg-slate-50 hover:border-indigo-300 text-slate-500 hover:text-indigo-600 transition-colors"
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {resolvedCompanyId &&
                        !loadingConsultants &&
                        localConsultants.length === 0 && (
                          <p className="text-xs text-amber-600 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3 flex-shrink-0" />
                            Nenhum consultor ativo nesta empresa. Use o botão{" "}
                            <UserPlus className="h-3 w-3 inline mx-0.5" /> para
                            cadastrar.
                          </p>
                        )}
                      {errors.consultor && (
                        <p className="text-xs text-red-500">
                          {errors.consultor}
                        </p>
                      )}
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs font-medium text-slate-600">
                        E-mail do Consultor *
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                        <Input
                          type="email"
                          placeholder="consultor@agencia.com"
                          value={formData.emailConsultor}
                          onChange={(e) =>
                            updateField("emailConsultor", e.target.value)
                          }
                          className={cn(
                            "h-8 text-xs pl-8",
                            errors.emailConsultor && "border-red-400",
                          )}
                        />
                      </div>
                      {errors.emailConsultor && (
                        <p className="text-xs text-red-500">
                          {errors.emailConsultor}
                        </p>
                      )}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* ── SEÇÃO 3: DATAS ── */}
              <AccordionItem
                value="datas"
                className="border border-slate-200 rounded-lg overflow-hidden"
              >
                <AccordionTrigger className="px-3 py-2 bg-white hover:bg-slate-50 text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-purple-100 text-purple-700">3</Badge>
                    Datas
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="border-t bg-white px-3 py-3 grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-slate-600">
                        Data de Início
                      </Label>
                      <div className="relative">
                        <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                        <Input
                          type="date"
                          value={formData.dataInicio}
                          onChange={(e) =>
                            updateField("dataInicio", e.target.value)
                          }
                          className="h-8 text-xs pl-8"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-slate-600">
                        Prazo / Entrega
                      </Label>
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
              <AccordionItem
                value="orcamento"
                className="border border-slate-200 rounded-lg overflow-hidden"
              >
                <AccordionTrigger className="px-3 py-2 bg-white hover:bg-slate-50 text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-orange-100 text-orange-700">4</Badge>
                    Orçamento
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="border-t bg-white px-3 py-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-slate-600">
                        Valor do Projeto (R$)
                      </Label>
                      <div className="relative">
                        <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                        <Input
                          placeholder="0,00"
                          value={formData.orcamento}
                          onChange={(e) =>
                            updateField("orcamento", e.target.value)
                          }
                          className="h-8 text-xs pl-8"
                        />
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* ── SEÇÃO 5: CONFIGURAÇÕES ── */}
              <AccordionItem
                value="config"
                className="border border-slate-200 rounded-lg overflow-hidden"
              >
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
                          <p className="text-xs font-semibold text-slate-700">
                            Permite Portfólio
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Exibir em portfólio público
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            updateField(
                              "permitePortfolio",
                              !formData.permitePortfolio,
                            )
                          }
                          className={cn(
                            "relative w-9 h-5 rounded-full transition-colors duration-200 flex-shrink-0",
                            formData.permitePortfolio
                              ? "bg-blue-600"
                              : "bg-slate-300",
                          )}
                        >
                          <div
                            className={cn(
                              "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200",
                              formData.permitePortfolio
                                ? "translate-x-4"
                                : "translate-x-0.5",
                            )}
                          />
                        </button>
                      </label>
                      <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
                        <div>
                          <p className="text-xs font-semibold text-slate-700">
                            Sincronizar Bitrix
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Integrar com Bitrix24
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            updateField(
                              "sincronizadoBitrix",
                              !formData.sincronizadoBitrix,
                            )
                          }
                          className={cn(
                            "relative w-9 h-5 rounded-full transition-colors duration-200 flex-shrink-0",
                            formData.sincronizadoBitrix
                              ? "bg-blue-600"
                              : "bg-slate-300",
                          )}
                        >
                          <div
                            className={cn(
                              "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200",
                              formData.sincronizadoBitrix
                                ? "translate-x-4"
                                : "translate-x-0.5",
                            )}
                          />
                        </button>
                      </label>
                    </div>

                    {/* Descrição */}
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-slate-600">
                        Descrição do Projeto
                      </Label>
                      <Textarea
                        placeholder="Descreva os objetivos e escopo do projeto..."
                        value={formData.descricao}
                        onChange={(e) =>
                          updateField("descricao", e.target.value)
                        }
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
                  Este projeto é uma cópia do original. Ajuste os dados conforme
                  necessário antes de confirmar.
                </p>
              </div>
            )}
            {!cloneMode && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                <p className="text-xs text-blue-700">
                  O projeto será criado e ficará disponível na listagem de
                  projetos desta empresa.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-start gap-2 sm:gap-3 px-[25px] py-[15px] border-t bg-gray-50 flex-shrink-0">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <div className="flex flex-col items-end gap-1">
              <Button
                variant="outline"
                onClick={handleSaveDraftNow}
                disabled={loading}
                className="gap-1.5 w-full sm:w-auto"
              >
                {loadingAction === "draft" ? (
                  <ButtonLoader text="Salvando..." />
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Salvar Rascunho
                  </>
                )}
              </Button>
              {draftBlockReason && (
                <p className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  {draftBlockReason}
                </p>
              )}
            </div>
            <Button
              className="btn-brand w-full sm:w-auto"
              onClick={handleSubmit}
              disabled={loading}
            >
              {cloneMode ? "Clonar Projeto" : "Próximo"}
            </Button>
          </div>
        </div>
      </div>

      {/* Decision Modal after "Próximo" */}
      <AlertDialog
        open={showNextStepModal}
        onOpenChange={(v) => {
          setShowNextStepModal(v);
          if (!v) setLoadingAction((prev) => (prev === "submit" ? null : prev));
        }}
      >
        <AlertDialogContent className="max-w-lg p-0 overflow-hidden border-0 shadow-2xl rounded-2xl">
          {/* ── Header com gradiente Allka ── */}
          <div
            className="relative px-6 pt-6 pb-5 overflow-hidden"
            style={{
              background:
                "var(--app-brand-gradient, linear-gradient(135deg, #000000 0%, #1a2a6f 45%, #c81a7f 100%))",
            }}
          >
            {/* Glow blobs */}
            <div className="absolute -top-8 -right-8 w-40 h-40 bg-purple-400/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-6 left-1/3 w-32 h-32 bg-blue-400/15 rounded-full blur-3xl pointer-events-none" />

            <div className="relative flex items-start gap-3">
              <div className="p-2.5 bg-white/15 backdrop-blur-sm rounded-xl border border-white/20 shrink-0 mt-0.5">
                <FolderKanban className="h-5 w-5 text-white" />
              </div>
              <div>
                <AlertDialogTitle className="text-base font-bold text-white leading-tight">
                  O que deseja fazer?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-xs text-white/60 mt-0.5">
                  Escolha como deseja prosseguir com o projeto.
                </AlertDialogDescription>
              </div>
            </div>
          </div>

          {/* ── Action cards ── */}
          <div className="px-4 py-4 flex flex-col gap-2 bg-white dark:bg-[#0f1117]">
            {/* Revisar Projeto — só mostra se já há produtos */}
            {selectedProducts.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setShowNextStepModal(false);
                  setShowProductsStep(true);
                  setActiveReviewTab("resumo");
                  setReviewFromForm(true); // remember origin so X returns to form
                  setShowReview(true);
                }}
                className="group w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-violet-200 dark:border-violet-800/50 bg-violet-50 dark:bg-violet-900/15 hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-all text-left"
              >
                <div className="shrink-0 w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Eye className="h-4.5 w-4.5 text-violet-600 dark:text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-violet-700 dark:text-violet-300 leading-tight">
                    Revisar Projeto
                    <span className="ml-1.5 text-[11px] font-normal text-violet-500/80">
                      ({selectedProducts.length}{" "}
                      {selectedProducts.length === 1 ? "item" : "itens"})
                    </span>
                  </p>
                  <p className="text-xs text-slate-500 dark:text-white/40 mt-0.5 leading-snug">
                    Ver resumo, exportar proposta ou enviar para aprovação
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-violet-400 shrink-0 opacity-0 group-hover:opacity-70 -translate-x-1 group-hover:translate-x-0 transition-all" />
              </button>
            )}

            {/* Ver/Editar Produtos */}
            <button
              type="button"
              onClick={() => {
                setShowNextStepModal(false);
                setShowProductsStep(true);
                // Open directly on the selected-products review, not the full catalog
                if (selectedProducts.length > 0) setShowEditProducts(true);
              }}
              className="group w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-100 dark:border-white/8 bg-slate-50 dark:bg-white/3 hover:bg-slate-100 dark:hover:bg-white/6 hover:border-slate-200 dark:hover:border-white/12 transition-all text-left"
            >
              <div className="shrink-0 w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                <ShoppingCart className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-white leading-tight">
                  {selectedProducts.length > 0
                    ? `Ver/Editar Produtos (${selectedProducts.length} selecionado${selectedProducts.length !== 1 ? "s" : ""})`
                    : "Adicionar Produtos"}
                </p>
                <p className="text-xs text-slate-500 dark:text-white/40 mt-0.5 leading-snug">
                  {selectedProducts.length > 0
                    ? "Gerenciar produtos e serviços do projeto"
                    : "Selecionar produtos e serviços para o projeto"}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400 shrink-0 opacity-0 group-hover:opacity-70 -translate-x-1 group-hover:translate-x-0 transition-all" />
            </button>

            {/* Enviar para Aprovação */}
            <div className="flex flex-col gap-1">
              <button
                type="button"
                disabled={loading || !!approvalBlockReason}
                onClick={handleOpenSendApproval}
                className="group w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-100 dark:border-amber-800/40 bg-amber-50/60 dark:bg-amber-900/10 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:border-amber-200 dark:hover:border-amber-700/50 transition-all text-left disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <div className="shrink-0 w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                  {loading ? (
                    <Loader2 className="h-4.5 w-4.5 text-amber-500 animate-spin" />
                  ) : (
                    <Send className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 leading-tight">
                    Enviar para Aprovação do Cliente
                  </p>
                  <p className="text-xs text-slate-500 dark:text-white/40 mt-0.5 leading-snug">
                    Salvar para apresentação e aprovação antes do pagamento
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-amber-400 shrink-0 opacity-0 group-hover:opacity-70 -translate-x-1 group-hover:translate-x-0 transition-all" />
              </button>
              {approvalBlockReason && (
                <div className="flex items-center gap-1.5 px-2 py-1">
                  <AlertCircle className="h-3 w-3 text-amber-500 shrink-0" />
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 leading-snug">
                    {approvalBlockReason}
                  </p>
                </div>
              )}
            </div>

            {/* Exportar Proposta */}
            <div className="flex flex-col gap-1">
              <button
                type="button"
                disabled={exportingPDF || !!exportBlockReason}
                onClick={() => {
                  setShowNextStepModal(false);
                  handleExportPresentation();
                }}
                className="group w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-sky-100 dark:border-sky-800/40 bg-sky-50/60 dark:bg-sky-900/10 hover:bg-sky-50 dark:hover:bg-sky-900/20 hover:border-sky-200 dark:hover:border-sky-700/50 transition-all text-left disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <div className="shrink-0 w-9 h-9 rounded-lg bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                  {exportingPDF ? (
                    <Loader2 className="h-4.5 w-4.5 text-sky-500 animate-spin" />
                  ) : (
                    <FileDown className="h-4.5 w-4.5 text-sky-600 dark:text-sky-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-sky-700 dark:text-sky-400 leading-tight">
                    {exportingPDF
                      ? "Gerando PDF..."
                      : "Exportar Proposta (PDF)"}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-white/40 mt-0.5 leading-snug">
                    Baixar ficha de apresentação com produtos e valores
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-sky-400 shrink-0 opacity-0 group-hover:opacity-70 -translate-x-1 group-hover:translate-x-0 transition-all" />
              </button>
              {exportBlockReason && !exportingPDF && (
                <div className="flex items-center gap-1.5 px-2 py-1">
                  <AlertCircle className="h-3 w-3 text-sky-400 shrink-0" />
                  <p className="text-[11px] text-sky-600 dark:text-sky-400 leading-snug">
                    {exportBlockReason}
                  </p>
                </div>
              )}
            </div>

            {/* Salvar Rascunho */}
            <div className="flex flex-col gap-1">
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  setShowNextStepModal(false);
                  handleSaveDraftNow();
                }}
                className="group w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-100 dark:border-white/8 bg-white dark:bg-white/3 hover:bg-slate-50 dark:hover:bg-white/5 hover:border-slate-200 dark:hover:border-white/12 transition-all text-left disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <div className="shrink-0 w-9 h-9 rounded-lg bg-slate-100 dark:bg-white/8 flex items-center justify-center group-hover:scale-105 transition-transform">
                  {loadingAction === "draft" ? (
                    <Loader2 className="h-4.5 w-4.5 text-slate-400 animate-spin" />
                  ) : (
                    <Save className="h-4.5 w-4.5 text-slate-500 dark:text-white/50" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700 dark:text-white/80 leading-tight">
                    {loadingAction === "draft"
                      ? "Salvando..."
                      : "Salvar Rascunho"}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-white/40 mt-0.5 leading-snug">
                    Salvar projeto como rascunho e continuar depois
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 shrink-0 opacity-0 group-hover:opacity-70 -translate-x-1 group-hover:translate-x-0 transition-all" />
              </button>
              {draftBlockReason && (
                <div className="flex items-center gap-1.5 px-2 py-1">
                  <AlertCircle className="h-3 w-3 text-amber-500 shrink-0" />
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 leading-snug">
                    {draftBlockReason}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="px-4 pb-4 bg-white dark:bg-[#0f1117]">
            <AlertDialogCancel className="w-full h-8 rounded-lg text-xs font-semibold text-slate-500 dark:text-white/40 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/8 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
              Cancelar
            </AlertDialogCancel>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Catalog/Products Step */}
      {showProductsStep && !showCheckout && (
        <div
          className="fixed top-0 z-[60] h-[calc(100%-25px)] bg-white flex flex-col border-l border-gray-200 shadow-2xl"
          style={{ left: `${sidebarWidth}px`, right: 0 }}
        >
          {/* Header */}
          <div
            className="relative shrink-0 px-6 py-4 overflow-hidden flex items-center justify-between"
            style={{
              background:
                "var(--app-brand-gradient, linear-gradient(135deg, #000000 0%, #1a2a6f 45%, #c81a7f 100%))",
            }}
          >
            {/* decorative blobs */}
            <div className="absolute -top-6 -right-6 w-36 h-36 bg-purple-400/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-4 left-1/3 w-28 h-28 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white/15 border border-white/20 backdrop-blur-sm">
                <Package className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-white leading-tight">
                  Selecionar Produtos
                </p>
                <p className="text-xs text-white/55 mt-0.5">
                  {formData.nome || "Novo Projeto"}
                </p>
              </div>
            </div>
            <div className="relative flex items-center gap-2">
              {selectedProducts.length > 0 && (
                <button
                  onClick={() => setShowEditProducts(true)}
                  className="h-8 px-3 flex items-center gap-1.5 rounded-lg bg-white/12 border border-white/20 text-white text-xs font-medium hover:bg-white/22 transition-all"
                >
                  <ShoppingCart className="h-3.5 w-3.5" />
                  <span className="tabular-nums">
                    {selectedProducts.length}
                  </span>
                  selecionado{selectedProducts.length !== 1 ? "s" : ""}
                </button>
              )}
              <button
                onClick={handleSaveDraftNow}
                disabled={loading}
                title={draftBlockReason ?? undefined}
                className="h-8 px-3 flex items-center gap-1.5 rounded-lg bg-white/12 border border-white/20 text-white text-xs font-medium hover:bg-white/22 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loadingAction === "draft" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                {loadingAction === "draft" ? "Salvando..." : "Salvar Rascunho"}
              </button>
              <button
                onClick={() => setShowProductsStep(false)}
                className="h-8 w-8 flex items-center justify-center rounded-lg bg-white/12 border border-white/20 text-white/60 hover:bg-white/22 hover:text-white transition-all"
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
            <div className="absolute inset-0 z-10 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div
                className="bg-white rounded-2xl shadow-2xl w-full max-h-[calc(100%-32px)] flex flex-col overflow-hidden"
                style={{ maxWidth: "960px" }}
              >
                {/* ── Review Header ── */}
                <div
                  className="relative shrink-0 px-6 pt-5 pb-0 overflow-hidden"
                  style={{
                    background:
                      "var(--app-brand-gradient, linear-gradient(135deg, #000000 0%, #1a2a6f 45%, #c81a7f 100%))",
                  }}
                >
                  {/* decorative blobs */}
                  <div className="absolute -top-10 -right-10 w-48 h-48 bg-purple-400/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute -bottom-8 left-1/4 w-36 h-36 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />

                  <div className="relative flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-white/15 border border-white/20 backdrop-blur-sm">
                        <Eye className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-white leading-tight">
                          Revisão do Projeto
                        </h2>
                        <p className="text-xs text-white/55 mt-0.5">
                          {formData.nome
                            ? `"${formData.nome}" — confira antes do checkout`
                            : "Confira os detalhes antes de prosseguir"}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleCloseReview}
                      className="h-8 w-8 flex items-center justify-center rounded-lg bg-white/12 border border-white/20 text-white/60 hover:bg-white/22 hover:text-white transition-all"
                    >
                      <XIcon className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Tabs — attached to header bottom */}
                  <div className="relative flex gap-0.5">
                    {(["resumo", "comissoes"] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveReviewTab(tab)}
                        className={cn(
                          "relative flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold transition-all rounded-t-lg",
                          activeReviewTab === tab
                            ? "bg-slate-50 text-violet-700 shadow-sm"
                            : "text-white/65 hover:text-white hover:bg-white/10",
                        )}
                      >
                        {tab === "resumo" ? (
                          <Eye className="h-3.5 w-3.5" />
                        ) : (
                          <Percent className="h-3.5 w-3.5" />
                        )}
                        {tab === "resumo" ? "Resumo" : "Comissões"}
                        {tab === "comissoes" &&
                          calculateCommissionTotal() > 0 && (
                            <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-bold leading-none">
                              +{formatCurrency(calculateCommissionTotal())}
                            </span>
                          )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── Scrollable Content ── */}
                <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-slate-50/80">
                  {/* ── TAB: RESUMO ── */}
                  {activeReviewTab === "resumo" && (
                    <>
                      {/* Project Info */}
                      <div className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                        <div className="px-4 py-2.5 border-b border-slate-50 flex items-center gap-2">
                          <div className="w-1 h-3.5 rounded-full bg-linear-to-b from-[#2558FF] to-[#6E2C96]" />
                          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                            Dados do Projeto
                          </p>
                        </div>
                        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
                          {[
                            { label: "Nome", value: formData.nome },
                            { label: "Tipo", value: formData.tipo },
                            { label: "Cliente", value: formData.cliente },
                            {
                              label: "Empresa",
                              value: resolvedCompanyName || formData.agencia,
                            },
                            ...(formData.dataInicio
                              ? [
                                  {
                                    label: "Início",
                                    value: formData.dataInicio,
                                  },
                                ]
                              : []),
                            ...(formData.prazo
                              ? [{ label: "Prazo", value: formData.prazo }]
                              : []),
                          ].map(({ label, value }) => (
                            <div key={label}>
                              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-0.5">
                                {label}
                              </p>
                              <p className="text-sm font-semibold text-slate-800 truncate">
                                {value || "—"}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Products list */}
                      {selectedProducts.length > 0 ? (
                        <div className="rounded-xl border border-slate-100 overflow-hidden bg-white shadow-sm">
                          <div className="px-4 py-2.5 border-b border-slate-50 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-1 h-3.5 rounded-full bg-linear-to-b from-[#6E2C96] to-[#A61E86]" />
                              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                                Produtos Selecionados
                              </p>
                            </div>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[11px] font-bold">
                              {selectedProducts.length}{" "}
                              {selectedProducts.length === 1 ? "item" : "itens"}
                            </span>
                          </div>
                          <div className="divide-y divide-slate-50">
                            {selectedProducts.map((product) => {
                              const id = String(product.id);
                              const qty =
                                productQuantities[id] || product.quantity || 1;
                              const baseTotal = product.finalPrice * qty;
                              const comm = getProductCommission(id);
                              const commVal = calcProductCommissionValue(
                                id,
                                product.finalPrice,
                                qty,
                              );
                              const clientTotal =
                                comm.pagador === "CLIENTE"
                                  ? baseTotal + commVal
                                  : baseTotal;
                              return (
                                <div
                                  key={id}
                                  className="flex items-center justify-between px-4 py-3 hover:bg-slate-50/80 transition-colors group"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="h-9 w-9 rounded-lg bg-linear-to-br from-violet-50 to-indigo-50 border border-violet-100 flex items-center justify-center shrink-0 overflow-hidden">
                                      {product.image ? (
                                        <img
                                          src={product.image}
                                          alt={product.name}
                                          className="h-full w-full object-cover"
                                        />
                                      ) : (
                                        <Package className="h-4 w-4 text-violet-400" />
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-sm font-semibold text-slate-800 truncate">
                                        {product.name}
                                      </p>
                                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                        {product.category && (
                                          <span className="text-[11px] text-slate-400">
                                            {product.category}
                                          </span>
                                        )}
                                        <span className="text-slate-200 text-xs select-none">
                                          ·
                                        </span>
                                        <span className="text-[11px] text-slate-400">
                                          Qtd:{" "}
                                          <strong className="text-slate-600">
                                            {qty}
                                          </strong>
                                        </span>
                                        {comm.pagador === "AGENCIA" && (
                                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-[10px] font-semibold">
                                            Agência paga
                                          </span>
                                        )}
                                        {comm.pagador === "CLIENTE" &&
                                          commVal > 0 && (
                                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-semibold">
                                              <TrendingUp className="h-2.5 w-2.5" />
                                              +{formatCurrency(commVal)}
                                            </span>
                                          )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-right shrink-0 ml-4">
                                    <p className="text-sm font-bold text-slate-800">
                                      {formatCurrency(baseTotal)}
                                    </p>
                                    {commVal > 0 && (
                                      <p className="text-[11px] text-emerald-600 font-semibold">
                                        Cliente: {formatCurrency(clientTotal)}
                                      </p>
                                    )}
                                    <p className="text-[11px] text-slate-400">
                                      unit. {formatCurrency(product.finalPrice)}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-slate-200 p-10 text-center bg-white">
                          <Package className="h-9 w-9 mx-auto mb-2 text-slate-200" />
                          <p className="text-sm font-medium text-slate-400">
                            Nenhum produto adicionado
                          </p>
                          <p className="text-xs text-slate-300 mt-0.5">
                            Volte para adicionar produtos ao projeto
                          </p>
                        </div>
                      )}

                      {/* Financial Summary */}
                      {selectedProducts.length > 0 && (
                        <div className="rounded-xl overflow-hidden border border-indigo-100 shadow-sm">
                          <div
                            className="px-4 py-3 flex items-center gap-2"
                            style={{
                              background:
                                "linear-gradient(135deg, #2558FF 0%, #6E2C96 55%, #A61E86 100%)",
                            }}
                          >
                            <DollarSign className="h-4 w-4 text-white/80" />
                            <p className="text-xs font-bold text-white uppercase tracking-widest">
                              Resumo Financeiro
                            </p>
                          </div>
                          <div className="p-4 space-y-1.5 bg-white">
                            {selectedProducts.map((p) => {
                              const id = String(p.id);
                              const qty =
                                productQuantities[id] || p.quantity || 1;
                              return (
                                <div
                                  key={id}
                                  className="flex items-center justify-between text-xs text-slate-600"
                                >
                                  <span className="truncate mr-2 text-slate-500">
                                    {p.name}{" "}
                                    <span className="text-slate-300">×</span>{" "}
                                    {qty}
                                  </span>
                                  <span className="font-semibold text-slate-700 shrink-0">
                                    {formatCurrency(p.finalPrice * qty)}
                                  </span>
                                </div>
                              );
                            })}
                            {calculateCommissionTotal() > 0 && (
                              <div className="flex items-center justify-between text-xs text-emerald-600 border-t border-slate-100 pt-2 mt-1">
                                <span className="flex items-center gap-1">
                                  <TrendingUp className="h-3 w-3" />
                                  Comissões
                                </span>
                                <span className="font-bold">
                                  +{formatCurrency(calculateCommissionTotal())}
                                </span>
                              </div>
                            )}
                            <div className="pt-2 mt-1 border-t border-slate-100 space-y-1.5">
                              {calculateCommissionTotal() > 0 && (
                                <div className="flex items-center justify-between text-xs text-slate-500">
                                  <span>Total Agência</span>
                                  <span className="font-semibold text-slate-700">
                                    {formatCurrency(calculateTotal())}
                                  </span>
                                </div>
                              )}
                              <div className="flex items-center justify-between pt-1">
                                <span className="text-sm font-bold text-slate-700">
                                  {calculateCommissionTotal() > 0
                                    ? "Total Cliente"
                                    : "Total Geral"}
                                </span>
                                <span
                                  className="text-xl font-extrabold"
                                  style={{
                                    background:
                                      "linear-gradient(135deg, #2558FF 0%, #A61E86 100%)",
                                    WebkitBackgroundClip: "text",
                                    WebkitTextFillColor: "transparent",
                                    backgroundClip: "text",
                                  }}
                                >
                                  {formatCurrency(calculateClientTotal())}
                                </span>
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
                          <Percent className="h-9 w-9 mx-auto mb-2 text-slate-200" />
                          <p className="text-sm font-medium text-slate-400">
                            Nenhum produto para configurar comissão
                          </p>
                        </div>
                      ) : (
                        <>
                          <p className="text-xs text-slate-500 px-0.5">
                            Defina a porcentagem de comissão por produto. O
                            valor será adicionado ao preço cobrado do cliente.
                          </p>

                          {/* Per-product commission rows */}
                          <div className="rounded-xl border border-slate-100 overflow-hidden bg-white shadow-sm">
                            <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/80">
                              <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                <span className="col-span-4">Produto</span>
                                <span className="col-span-2 text-right">
                                  Custo
                                </span>
                                <span className="col-span-2 text-center">
                                  Com. %
                                </span>
                                <span className="col-span-2 text-right">
                                  Valor Com.
                                </span>
                                <span className="col-span-2 text-right">
                                  Preço Cliente
                                </span>
                              </div>
                            </div>
                            <div className="divide-y divide-slate-50">
                              {selectedProducts.map((product) => {
                                const id = String(product.id);
                                const qty =
                                  productQuantities[id] ||
                                  product.quantity ||
                                  1;
                                const baseCost = product.finalPrice * qty;
                                const comm = getProductCommission(id);
                                const commissionValue =
                                  calcProductCommissionValue(
                                    id,
                                    product.finalPrice,
                                    qty,
                                  );
                                const clientPrice =
                                  comm.pagador === "CLIENTE"
                                    ? baseCost + commissionValue
                                    : baseCost;
                                return (
                                  <div
                                    key={id}
                                    className="grid grid-cols-12 gap-2 items-center px-4 py-3 hover:bg-slate-50/80 transition-colors"
                                  >
                                    <div className="col-span-4 flex items-center gap-2 min-w-0">
                                      <div className="h-7 w-7 rounded-lg bg-linear-to-br from-violet-50 to-indigo-50 border border-violet-100 flex items-center justify-center shrink-0">
                                        <Package className="h-3.5 w-3.5 text-violet-400" />
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-xs font-semibold text-slate-800 truncate">
                                          {product.name}
                                        </p>
                                        <p className="text-[10px] text-slate-400">
                                          Qtd: {qty}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="col-span-2 text-right">
                                      <p className="text-xs font-semibold text-slate-700">
                                        {formatCurrency(baseCost)}
                                      </p>
                                    </div>
                                    <div className="col-span-2 flex items-center justify-center">
                                      <div className="relative w-full max-w-18">
                                        <input
                                          type="number"
                                          min={0}
                                          max={200}
                                          step={0.5}
                                          value={
                                            comm.tipoComissao === "PERCENTUAL"
                                              ? comm.percentualComissao || ""
                                              : comm.valorComissao || ""
                                          }
                                          placeholder="0"
                                          onChange={(e) => {
                                            const v =
                                              parseFloat(e.target.value) || 0;
                                            const field =
                                              comm.tipoComissao === "PERCENTUAL"
                                                ? "percentualComissao"
                                                : "valorComissao";
                                            setProductCommissionData(
                                              (prev) => ({
                                                ...prev,
                                                [id]: {
                                                  ...getProductCommission(id),
                                                  [field]: v,
                                                },
                                              }),
                                            );
                                            if (
                                              comm.tipoComissao === "PERCENTUAL"
                                            ) {
                                              setProductCommissions((prev) => ({
                                                ...prev,
                                                [id]: v,
                                              }));
                                            }
                                          }}
                                          className="w-full h-7 text-xs text-center rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:border-violet-400 focus:bg-white transition-colors pr-4"
                                        />
                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">
                                          {comm.tipoComissao === "PERCENTUAL"
                                            ? "%"
                                            : "R$"}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="col-span-2 text-right">
                                      <p
                                        className={cn(
                                          "text-xs font-semibold",
                                          commissionValue > 0
                                            ? "text-emerald-600"
                                            : "text-slate-300",
                                        )}
                                      >
                                        {commissionValue > 0
                                          ? formatCurrency(commissionValue)
                                          : "—"}
                                      </p>
                                    </div>
                                    <div className="col-span-2 text-right">
                                      <p className="text-xs font-bold text-slate-800">
                                        {formatCurrency(clientPrice)}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Commission Summary */}
                          <div className="rounded-xl overflow-hidden border border-emerald-100 shadow-sm">
                            <div className="px-4 py-3 flex items-center gap-2 bg-linear-to-r from-emerald-600 to-teal-600">
                              <TrendingUp className="h-4 w-4 text-white" />
                              <p className="text-xs font-bold text-white uppercase tracking-widest">
                                Resumo de Comissões
                              </p>
                            </div>
                            <div className="p-4 bg-white space-y-2">
                              <div className="flex items-center justify-between text-xs text-slate-500">
                                <span>Total Custo (Agência)</span>
                                <span className="font-semibold text-slate-700">
                                  {formatCurrency(calculateTotal())}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-xs text-emerald-600">
                                <span className="flex items-center gap-1">
                                  <TrendingUp className="h-3 w-3" />
                                  Total Comissões
                                </span>
                                <span className="font-bold">
                                  +{formatCurrency(calculateCommissionTotal())}
                                </span>
                              </div>
                              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                                <span className="text-sm font-bold text-slate-800">
                                  Total Cliente
                                </span>
                                <span className="text-lg font-extrabold text-emerald-600">
                                  {formatCurrency(calculateClientTotal())}
                                </span>
                              </div>
                              {calculateCommissionTotal() > 0 && (
                                <div className="flex items-center justify-between text-xs text-slate-400 pt-0.5">
                                  <span>Margem média</span>
                                  <span className="font-semibold text-emerald-500">
                                    {(
                                      (calculateCommissionTotal() /
                                        calculateTotal()) *
                                      100
                                    ).toFixed(1)}
                                    %
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

                {/* ── Footer Actions ── */}
                <div className="shrink-0 border-t border-slate-100 bg-white px-5 py-3">
                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    {/* Left: secondary actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => setShowEditProducts(true)}
                        className="h-8 px-3 flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-all"
                      >
                        <Package className="h-3.5 w-3.5" />
                        Editar Produtos
                      </button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportPresentation}
                        disabled={exportingPDF || !!exportBlockReason}
                        title={
                          !exportingPDF && exportBlockReason
                            ? exportBlockReason
                            : undefined
                        }
                        className="h-8 text-xs gap-1.5 border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 disabled:opacity-40"
                      >
                        {exportingPDF ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <FileDown className="h-3.5 w-3.5" />
                        )}
                        <span className="hidden sm:inline">
                          {exportingPDF ? "Gerando..." : "Exportar PDF"}
                        </span>
                      </Button>
                    </div>

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Right: primary actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSaveDraftNow}
                        disabled={loading}
                        title={draftBlockReason ?? undefined}
                        className="h-8 text-xs gap-1.5 border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                      >
                        {loadingAction === "draft" ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Save className="h-3.5 w-3.5" />
                        )}
                        <span className="hidden sm:inline">
                          {loadingAction === "draft"
                            ? "Salvando..."
                            : "Rascunho"}
                        </span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleOpenSendApproval}
                        disabled={loading || !!approvalBlockReason}
                        title={approvalBlockReason ?? undefined}
                        className="h-8 text-xs gap-1.5 border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:border-amber-300 disabled:opacity-40"
                      >
                        {loading && !loadingAction ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Send className="h-3.5 w-3.5" />
                        )}
                        <span className="hidden sm:inline">
                          Enviar Aprovação
                        </span>
                        <span className="sm:hidden">Aprovação</span>
                      </Button>
                      <button
                        disabled={!!checkoutBlockReason}
                        title={checkoutBlockReason ?? undefined}
                        onClick={() => {
                          setShowReview(false);
                          setShowCheckout(true);
                        }}
                        className="h-8 px-4 flex items-center gap-1.5 text-xs font-bold text-white rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.97]"
                        style={{
                          background:
                            "linear-gradient(135deg, #1a2a6f 0%, #c81a7f 100%)",
                        }}
                      >
                        <CreditCard className="h-3.5 w-3.5" />
                        Confirmar e ir ao Checkout
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Edit Products Overlay ── */}
          {showEditProducts && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 p-4">
              <div
                className="bg-white rounded-2xl shadow-2xl w-full max-h-[calc(100%-32px)] flex flex-col overflow-hidden"
                style={{ maxWidth: "920px" }}
              >
                {/* Header */}
                <div
                  className="shrink-0 px-6 py-5"
                  style={{
                    background:
                      "linear-gradient(135deg, #2558FF 0%, #6E2C96 55%, #A61E86 100%)",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center">
                        <Package className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-white">
                          Editar Produtos
                        </h2>
                        <p className="text-xs text-white/70">
                          {selectedProducts.length}{" "}
                          {selectedProducts.length === 1
                            ? "produto"
                            : "produtos"}{" "}
                          &middot; {formData.nome || "Novo Projeto"}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowEditProducts(false)}
                      className="h-8 w-8 flex items-center justify-center rounded-lg bg-white/10 border border-white/30 text-white/70 hover:bg-white/25 hover:text-white transition-colors"
                    >
                      <XIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Product cards */}
                <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-slate-50">
                  {selectedProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <Package className="h-12 w-12 text-slate-200 mb-3" />
                      <p className="text-sm text-slate-400 mb-1">
                        Nenhum produto adicionado ainda.
                      </p>
                      <p className="text-xs text-slate-400 mb-4">
                        Use o catálogo para encontrar e adicionar produtos a
                        este projeto.
                      </p>
                      <button
                        onClick={() => setShowEditProducts(false)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Ir ao catálogo de produtos
                      </button>
                    </div>
                  ) : (
                    selectedProducts.map((product) => {
                      const id = String(product.id);
                      const qty =
                        productQuantities[id] || product.quantity || 1;
                      const commission = getProductCommission(id);
                      const commissionValue = calcProductCommissionValue(
                        id,
                        product.finalPrice,
                        qty,
                      );
                      const finalClientPrice =
                        commission.pagador === "CLIENTE"
                          ? product.finalPrice * qty + commissionValue
                          : product.finalPrice * qty;
                      return (
                        <div
                          key={id}
                          className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm"
                        >
                          {/* Product info row */}
                          <div className="flex items-start gap-4 p-4">
                            {/* Thumbnail */}
                            <div className="h-16 w-16 rounded-xl overflow-hidden shrink-0 flex items-center justify-center bg-linear-to-br from-indigo-50 to-violet-100">
                              {product.image ? (
                                <img
                                  src={product.image}
                                  alt={product.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <Package className="h-7 w-7 text-indigo-300" />
                              )}
                            </div>
                            {/* Details */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  {(product as any).code && (
                                    <span className="inline-block text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded mb-1">
                                      {(product as any).code}
                                    </span>
                                  )}
                                  <p className="text-sm font-semibold text-slate-800 leading-tight">
                                    {product.name}
                                  </p>
                                  {(product as any).variation && (
                                    <p className="text-xs text-indigo-600 mt-0.5 font-medium">
                                      Variação: {(product as any).variation}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                    {product.category && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold">
                                        {product.category}
                                      </span>
                                    )}
                                    {(product as any).recurrence && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 text-[10px] font-semibold border border-amber-100">
                                        {(product as any).recurrence}
                                      </span>
                                    )}
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-50 text-slate-500 text-[10px] border border-slate-100">
                                      Qtd: {qty}
                                    </span>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleRemoveProduct(id)}
                                  className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors shrink-0"
                                  title="Remover produto"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Commission row */}
                          <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3">
                            <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
                              {/* Preço base */}
                              <div>
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                                  Preço Base
                                </p>
                                <p className="text-sm font-bold text-slate-800">
                                  {formatCurrency(product.finalPrice * qty)}
                                </p>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  unit. {formatCurrency(product.finalPrice)} ×{" "}
                                  {qty}
                                </p>
                              </div>

                              {/* Comissão */}
                              <div>
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                                  Comissão
                                </p>
                                <div className="flex items-center gap-1.5">
                                  <select
                                    value={commission.tipoComissao}
                                    onChange={(e) => {
                                      const tipo = e.target.value as
                                        | "PERCENTUAL"
                                        | "VALOR_FIXO";
                                      setProductCommissionData((prev) => ({
                                        ...prev,
                                        [id]: {
                                          ...getProductCommission(id),
                                          tipoComissao: tipo,
                                        },
                                      }));
                                    }}
                                    className="h-7 px-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-indigo-400 cursor-pointer"
                                  >
                                    <option value="PERCENTUAL">%</option>
                                    <option value="VALOR_FIXO">R$</option>
                                  </select>
                                  <input
                                    type="number"
                                    min={0}
                                    step={
                                      commission.tipoComissao === "PERCENTUAL"
                                        ? 0.5
                                        : 1
                                    }
                                    value={
                                      commission.tipoComissao === "PERCENTUAL"
                                        ? commission.percentualComissao || ""
                                        : commission.valorComissao || ""
                                    }
                                    placeholder="0"
                                    onChange={(e) => {
                                      const v = parseFloat(e.target.value) || 0;
                                      const field =
                                        commission.tipoComissao === "PERCENTUAL"
                                          ? "percentualComissao"
                                          : "valorComissao";
                                      setProductCommissionData((prev) => ({
                                        ...prev,
                                        [id]: {
                                          ...getProductCommission(id),
                                          [field]: v,
                                        },
                                      }));
                                      if (
                                        commission.tipoComissao === "PERCENTUAL"
                                      ) {
                                        setProductCommissions((prev) => ({
                                          ...prev,
                                          [id]: v,
                                        }));
                                      }
                                    }}
                                    className="w-20 h-7 px-2 text-xs text-center rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-indigo-400"
                                  />
                                </div>
                                {commissionValue > 0 && (
                                  <p className="text-[10px] text-emerald-600 font-semibold mt-1">
                                    +{formatCurrency(commissionValue)}
                                  </p>
                                )}
                              </div>

                              {/* Pagador */}
                              <div>
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                                  Pagador
                                </p>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() =>
                                      setProductCommissionData((prev) => ({
                                        ...prev,
                                        [id]: {
                                          ...getProductCommission(id),
                                          pagador: "AGENCIA",
                                        },
                                      }))
                                    }
                                    className={cn(
                                      "h-7 px-2.5 text-xs font-semibold rounded-lg border transition-all",
                                      commission.pagador === "AGENCIA"
                                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                        : "bg-white text-slate-500 border-slate-200 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600",
                                    )}
                                  >
                                    Agência
                                  </button>
                                  <button
                                    onClick={() =>
                                      setProductCommissionData((prev) => ({
                                        ...prev,
                                        [id]: {
                                          ...getProductCommission(id),
                                          pagador: "CLIENTE",
                                        },
                                      }))
                                    }
                                    className={cn(
                                      "h-7 px-2.5 text-xs font-semibold rounded-lg border transition-all",
                                      commission.pagador === "CLIENTE"
                                        ? "bg-violet-600 text-white border-violet-600 shadow-sm"
                                        : "bg-white text-slate-500 border-slate-200 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-600",
                                    )}
                                  >
                                    Cliente
                                  </button>
                                </div>
                                {commission.pagador === "AGENCIA" && (
                                  <p className="text-[10px] text-blue-500 mt-1">
                                    Agência absorve o custo
                                  </p>
                                )}
                              </div>

                              {/* Preço final */}
                              <div>
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                                  {commission.pagador === "CLIENTE"
                                    ? "Cobrado do Cliente"
                                    : "Custo Agência"}
                                </p>
                                <p
                                  className={cn(
                                    "text-sm font-bold",
                                    commission.pagador === "CLIENTE"
                                      ? "text-violet-700"
                                      : "text-blue-700",
                                  )}
                                >
                                  {formatCurrency(finalClientPrice)}
                                </p>
                                {commission.pagador === "AGENCIA" && (
                                  <p className="text-[10px] text-slate-400 mt-0.5">
                                    Cliente não vê este valor
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Summary + Footer */}
                <div className="shrink-0 border-t border-slate-200 bg-white px-6 py-4 space-y-4">
                  {selectedProducts.length > 0 && (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                          Base Total
                        </p>
                        <p className="text-base font-bold text-slate-800 mt-0.5">
                          {formatCurrency(calculateTotal())}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {selectedProducts.length}{" "}
                          {selectedProducts.length === 1
                            ? "produto"
                            : "produtos"}
                        </p>
                      </div>
                      <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3">
                        <p className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wider">
                          Total Comissão
                        </p>
                        <p className="text-base font-bold text-emerald-700 mt-0.5">
                          +{formatCurrency(calculateCommissionTotal())}
                        </p>
                        <p className="text-[10px] text-emerald-400 mt-0.5">
                          Margem estimada
                        </p>
                      </div>
                      <div className="rounded-xl bg-violet-50 border border-violet-100 p-3">
                        <p className="text-[10px] font-semibold text-violet-500 uppercase tracking-wider">
                          Total Cliente
                        </p>
                        <p className="text-base font-bold text-violet-700 mt-0.5">
                          {formatCurrency(calculateClientPayTotal())}
                        </p>
                        <p className="text-[10px] text-violet-400 mt-0.5">
                          O que o cliente paga
                        </p>
                      </div>
                      <div className="rounded-xl bg-blue-50 border border-blue-100 p-3">
                        <p className="text-[10px] font-semibold text-blue-500 uppercase tracking-wider">
                          Total Agência
                        </p>
                        <p className="text-base font-bold text-blue-700 mt-0.5">
                          {formatCurrency(calculateAgencyPayTotal())}
                        </p>
                        <p className="text-[10px] text-blue-400 mt-0.5">
                          Absorvido pela agência
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setShowEditProducts(false)}
                      className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      Adicionar mais produtos
                    </button>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowEditProducts(false);
                          setShowProductsStep(false);
                        }}
                        className="gap-1.5 border-slate-300 text-slate-600 hover:bg-slate-50"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Aplicar e Fechar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          setShowEditProducts(false);
                          setShowProductsStep(false);
                          if (!showReview) handleOpenReview();
                        }}
                        className="gap-1.5 text-white border-none"
                        style={{
                          background:
                            "linear-gradient(135deg, #2558FF 0%, #6E2C96 55%, #A61E86 100%)",
                        }}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Continuar Revisão
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Checkout Step */}
      {showCheckout && (
        <div
          className="fixed top-0 z-[70] h-[calc(100%-25px)] bg-white flex flex-col border-l border-gray-200 shadow-2xl overflow-hidden"
          style={{ left: `${sidebarWidth}px`, right: 0 }}
        >
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
          const allExisting = [...apiCompanies, ...localCompanies];
          const dupByName = allExisting.some(
            (c) => c.name.toLowerCase() === (company.name || "").toLowerCase(),
          );
          if (dupByName) {
            toast({
              title: "Empresa duplicada",
              description: "Já existe uma empresa com este nome.",
              variant: "destructive",
            });
            return;
          }
          const newCo: MockCompanyItem = {
            id: company.id ? String(company.id) : String(Date.now()),
            name: company.name,
          };
          setLocalCompanies((prev) => [...prev, newCo]);
          setResolvedCompanyId(String(newCo.id));
          setResolvedCompanyName(newCo.name);
          updateField("agencia", newCo.name);
          updateField("cliente", "");
          updateField("clienteCnpj", "");
          updateField("consultor", "");
          updateField("emailConsultor", "");
          setLocalClients([]);
          setShowCreateCompany(false);
        }}
      />

      {/* Consultant creation panel */}
      <UserCreateSlidePanel
        open={showCreateConsultant}
        onClose={() => setShowCreateConsultant(false)}
        onUserCreated={(user: any) => {
          updateField("consultor", user.name || "");
          updateField("emailConsultor", user.email || "");
          // refresh local consultants list
          const filters: Record<string, string> = { limit: "500" };
          if (resolvedCompanyId) filters.company_id = String(resolvedCompanyId);
          apiClient
            .getUsers(filters)
            .then((res: any) => {
              const data: any[] = res.data || (Array.isArray(res) ? res : []);
              setLocalConsultants(
                data
                  .filter((u) => u.is_active !== false)
                  .map((u) => ({
                    id: String(u.id),
                    name: u.name,
                    email: u.email || "",
                    role: u.role || "",
                  })),
              );
            })
            .catch(() => {});
          setShowCreateConsultant(false);
        }}
        companyId={resolvedCompanyId ?? undefined}
        companyName={resolvedCompanyName || companyName}
      />

      {/* ── Send Approval Modal ── */}
      <SendApprovalModal
        open={showSendApprovalModal}
        onOpenChange={setShowSendApprovalModal}
        projectName={formData.nome}
        productCount={selectedProducts.length}
        totalFormatted={formatCurrency(calculateTotal())}
        clientName={formData.cliente}
        companyName={resolvedCompanyName || formData.agencia}
        contacts={(() => {
          // Build contacts list: dedup by id, mark primary from formData.cliente
          const seen = new Set<string>();
          const list: ApprovalContact[] = localClients
            .filter((c) => {
              const key = String(c.id);
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            })
            .map((c) => ({
              id: String(c.id),
              name: c.name,
              email: c.email || null,
              phone: null,
              isPrimary: c.name === formData.cliente,
            }));
          // If no contacts found but client name is set, add synthetic
          if (list.length === 0 && formData.cliente.trim()) {
            list.push({
              id: "synthetic-primary",
              name: formData.cliente,
              email: null,
              phone: null,
              isPrimary: true,
            });
          }
          // Ensure primary is first
          list.sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0));
          return list;
        })()}
        onSend={handleConfirmSendApproval}
        onSaveDraft={handleSaveApprovalDraft}
        sending={loading}
      />
    </>
  );
}
