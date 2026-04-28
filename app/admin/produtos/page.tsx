// @ts-nocheck
import { SheetFooter } from "@/components/ui/sheet";

import type React from "react";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  Package,
  Plus,
  Edit,
  Trash2,
  Eye,
  ListChecks,
  Clock,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  FileQuestion,
  CheckCircle2,
  ArrowRight,
  Layers,
  DollarSign,
  TrendingUp,
  Calculator,
  X,
  Lock,
  ImageIcon,
  FileText,
  Link,
  Copy,
  Grid3x3,
  LayoutList,
  SlidersHorizontal,
  Pencil,
  Power,
  BarChart3,
  Filter,
  GripVertical,
  FlaskConical,
  ShieldCheck,
  Trophy,
  Link2,
  Route,
  PartyPopper,
  PlayCircle,
  Eye as EyePreview,
  ClipboardCheck,
  AlertTriangle,
  Info,
  LayoutTemplate,
  BookOpen,
  Users,
} from "lucide-react";
import { CircuitoPreHabilitacaoModal } from "@/components/circuito-pre-habilitacao-modal";
import { QualificationChecklistPanel } from "@/components/qualification-checklist-panel";
import { ProductNomadsTab } from "@/components/admin/product-nomads-tab";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
// Removed: import ImportTaskTemplateModal from "@/components/import-task-template-modal"
import { Switch } from "@/components/ui/switch"; // Import Switch
import { ConfirmationDialog } from "@/components/confirmation-dialog"; // Import ConfirmationDialog
// Removed: import { ProductSheet } from "@/components/admin/product-sheet"
// Removed: import { QuestionnaireSheet } from "@/components/admin/questionnaire-sheet"
// Removed: import { PricingCalculatorModal } from "@/components/admin/pricing-calculator-modal"
import { useToast } from "@/hooks/use-toast";
import { ItemsPerPageSelect } from "@/components/items-per-page-select";
import { useProducts } from "@/lib/contexts/product-context";
import { useSidebar } from "@/contexts/sidebar-context";
import { ModalBrandHeader } from "@/components/ui/modal-brand-header";
import { useSpecialties } from "@/lib/contexts/specialty-context";
import type { Task } from "@/types/product"; // Assuming Task type is defined in types/product
import { formatCurrency } from "@/lib/utils";
import PageHeader from "@/components/page-header";

type Question = {
  id: string;
  question: string;
  type: "text" | "multiline" | "select" | "multiselect" | "file";
  required: boolean;
  aiAssisted: boolean;
  allowsAttachment: boolean;
  exampleAnswer?: string;
  options?: string[]; // Added options for select/multiselect types
};

interface TaskStep {
  id: string;
  name: string;
  description: string;
  specialty: string; // This should likely be specialtyId to link to the specialties context
  leader: string;
  area: string;
  estimatedHours: number;
  order: number;
  canRunInParallel: boolean;
  experienceLevel?: string;
  // Added from existing code
  calculatedCost: number;
}

// Removed redeclaration of Task interface
// interface Task {
//   id: string
//   code: string // Auto-generated
//   name: string
//   specialty: string
//   executionTime: number // in hours
//   executionDeadline: number // in hours
//   deliveryDeadline: number // in hours
//   adjustmentDeadline: number // in hours
//   approvalDeadline: number // in hours
//   automaticValue: number
//   order: number
//   canRunInParallel: boolean

//   // New fields from design
//   attentionText: string
//   pop: string // Standard Operating Procedure
//   complementaryFiles: string[]
//   verificationItems: string[]

//   // Configuration checkboxes
//   keepNextStepWithNomadLeader: boolean
//   delegateToLeader: boolean
//   liberateAfterSend: boolean
//   requireFinalFiles: boolean
//   isInternalStep: boolean
//   concludeOnRejection: boolean
//   hideFromClient: boolean
//   hasVariations: boolean
//   noConditions: boolean
//   showAccess: boolean
//   hideInProducts: boolean
//   dontCountDeadline: boolean
//   dontCountValue: boolean
//   hasAdditionals: boolean

//   steps: TaskStep[]
//   // Added from existing code
//   description?: string
//   calculatedCost: number
//   // Added for task dependency
//   dependencies: string[]

//   // New fields for template import
//   isLinkedToTemplate?: boolean
//   templateId?: string | null
//   // Added for task import
//   canExecuteInParallel?: boolean // Renamed from canRunInParallel for consistency in import logic
// }

// Added type for Product to ensure consistency
type Product = {
  id: string;
  name: string;
  description: string | undefined;
  category: string;
  isActive: boolean;
  tasks: Task[];
  createdAt: string;
  updatedAt: string;
  totalTasksCost: number;
  qualificationFee: number;
  subtotal: number;
  taxes: number;
  operationalFee: number;
  partnerCommission: number;
  finalPrice: number;
  price: number;
  deliveryDays: number;
  productImagePreview?: string;
  deliveryVideoUrl?: string;
  presentation?: string;
  benefits?: string;
  information?: string;
  descriptionAttention?: string;
  summaryDescription?: string;
  includedItems?: string[];
  notIncludedItems?: string[];
  complementaryProducts?: string[];
  requestAttention?: string;
  oneTimeContract?: string;
  monthlyContract?: string;
  previousContracts?: string;
  status: string;
  associatedTaskModels?: string[];
  recurrence?: string;
  subcategories?: string[];
  tags?: string[];
  questions?: Question[];
  additionalImages?: string[];
  variations?: Array<{
    id: string;
    name: string;
    description?: string;
    price: number;
    priceModifier?: number;
    deadlineDays?: number;
    scopeDescription?: string;
    features?: string[];
    sortOrder?: number;
    isActive?: boolean;
  }>;
  addOns?: Array<{
    id: string;
    name: string;
    price: number;
    category: "creative_type" | "extra";
  }>;
  questionnaire?: {
    title: string;
    description: string;
    questions: Question[];
  };
  // Add other fields from Product type if they exist
};

// Define Questionnaire type as it was undeclared
type Questionnaire = {
  title: string;
  description: string;
  questions: Question[];
};

// Mock default tax rates, assuming these are defined elsewhere or constants
const DEFAULT_TAX_RATES = {
  QUALIFICATION_FEE: 0.15, // 15%
  TAXES: 0.05, // 5%
  OPERATIONAL_FEE: 0.03, // 3%
};

export default function AdminProdutosPage() {
  const { products, addProduct, updateProduct, deleteProduct } = useProducts();
  const { specialties } = useSpecialties();
  const { toast } = useToast();
  const { sidebarWidth } = useSidebar();

  // Filters and view mode state
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategories, setFilterCategories] = useState<string[]>([]);
  const [filterAreas, setFilterAreas] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Advanced filter modal
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [savedFilters, setSavedFilters] = useState<
    Array<{ id: string; name: string; filters: any }>
  >([]);
  const [selectedFilterId, setSelectedFilterId] = useState<string | null>(null);
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [filterNameInput, setFilterNameInput] = useState("");
  const [editingFilterId, setEditingFilterId] = useState<string | null>(null);
  const [editingFilterName, setEditingFilterName] = useState("");
  const [draggingFilterId, setDraggingFilterId] = useState<string | null>(null);
  const [dragOverFilterId, setDragOverFilterId] = useState<string | null>(null);
  const [showFieldPicker, setShowFieldPicker] = useState(false);
  const [visibleFields, setVisibleFields] = useState([
    "categoria",
    "area",
    "status",
    "ordenar",
  ]);
  const headerHeight = 64;
  const footerHeight = 40;

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProductSheetOpen, setIsProductSheetOpen] = useState(false); // Renamed from isCreateOpen
  const [isViewSheetOpen, setIsViewSheetOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false); // New state for view modal
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isQuestionnaireModalOpen, setIsQuestionnaireModalOpen] =
    useState(false);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedQuestionnaire, setSelectedQuestionnaire] =
    useState<Questionnaire | null>(null);
  // Circuito Pré-Habilitação — preview admin
  const [selectedCircuitTest, setSelectedCircuitTest] = useState<any>(null);
  const [isCircuitPreviewOpen, setIsCircuitPreviewOpen] = useState(false);

  const [importMode, setImportMode] = useState<"linked" | "copy" | null>(null);
  const [selectedTemplateToImport, setSelectedTemplateToImport] =
    useState<any>(null);
  const [showImportModeDialog, setShowImportModeDialog] = useState(false);
  const [showImportTemplateModal, setShowImportTemplateModal] = useState(false);
  const [availableTemplates, setAvailableTemplates] = useState<any[]>([]);

  const [showScheduling, setShowScheduling] = useState(false);
  const [activationDate, setActivationDate] = useState("");
  const [deactivationDate, setDeactivationDate] = useState("");

  const [customTagInput, setCustomTagInput] = useState("");
  const [priceEditPassword, setPriceEditPassword] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const [additionalImages, setAdditionalImages] = useState<string[]>([]);
  const [portfolioImages, setPortfolioImages] = useState<
    Array<{
      id: string;
      url: string;
      title?: string;
      description?: string;
      isMain: boolean;
      sortOrder: number;
    }>
  >([]);
  const [productQuestions, setProductQuestions] = useState<Question[]>([]);
  const [productTasks, setProductTasks] = useState<Task[]>([]); // State to hold tasks for the product form

  const [isEnhancingWithAI, setIsEnhancingWithAI] = useState(false);
  const [currentFieldEnhancing, setCurrentFieldEnhancing] = useState<
    string | null
  >(null);

  const [productVariations, setProductVariations] = useState<
    Array<{
      id: string;
      name: string;
      description?: string;
      price: number;
      priceModifier?: number;
      deadlineDays?: number;
      scopeDescription?: string;
      features?: string[];
      sortOrder?: number;
      isActive?: boolean;
    }>
  >([]);

  const [productAddOns, setProductAddOns] = useState<
    Array<{
      id: string;
      name: string;
      price: number;
      category: "creative_type" | "extra";
    }>
  >([]);

  const [toggleConfirmation, setToggleConfirmation] = useState<{
    product: Product | null;
    newStatus: boolean;
  }>({ product: null, newStatus: false });

  // Mock formData for the updates, this would typically be managed by a form context or hook
  const [productFormData, setProductFormData] = useState<{
    [key: string]: any;
    productId: string;
    name: string;
    category: string;
    subcategories: string[];
    tags: string[];
    recurrence: string;
    price: string;
    deliveryDays: string;
    isActive: boolean;
    productImage: File | null;
    productImagePreview: string;
    presentation: string;
    deliveryVideoUrl: string;
    benefits: string;
    information: string;
    descriptionAttention: string;
    summaryDescription: string;
    includedItems: string[];
    notIncludedItems: string[];
    complementaryProducts: string[];
    requestAttention: string;
    oneTimeContract: string;
    monthlyContract: string;
    previousContracts: string;
    status: string;
    associatedTaskModels: string[];
    description: string;
    mainImage: string;
    videoUrl: string;
    deadline: string;
    questionnaire: Array<{
      id: string;
      question: string;
      type: string;
      required: boolean;
    }>;
    tasks: Task[];
    excludedItems: string[];
  }>({
    productId: "",
    name: "",
    category: "",
    subcategories: [],
    tags: [],
    recurrence: "",
    price: "",
    deliveryDays: "",
    isActive: true,
    productImage: null,
    productImagePreview: "",
    presentation: "",
    deliveryVideoUrl: "",
    benefits: "",
    information: "",
    descriptionAttention: "",
    summaryDescription: "",
    includedItems: [],
    notIncludedItems: [],
    complementaryProducts: [],
    requestAttention: "",
    oneTimeContract: "",
    monthlyContract: "",
    previousContracts: "",
    status: "Ativo",
    associatedTaskModels: [],
    // Fields from updates for editing
    description: "",
    mainImage: "",
    videoUrl: "",
    deadline: "",
    // Questionnaire and Tasks fields
    questionnaire: [],
    tasks: [],
    excludedItems: [],
  });

  const availableTags = [
    "Pauta",
    "Assuntos para posts",
    "Temas para posts",
    "Conteúdo para posts",
    "Temas para blogs",
    "Assuntos para blogs",
    "Conteúdos para blogs",
    "Temas para vídeos",
    "Assuntos para vídeos",
    "Conteúdos para vídeos",
  ];

  const availableSubcategories = [
    "Social Media",
    "Blog",
    "Vídeo",
    "E-mail Marketing",
    "SEO",
    "Copywriting",
  ];

  // Normalize products to ensure arrays are never undefined
  const safeProducts = (products || []).map((p) => ({
    ...p,
    tasks: (p.tasks || []).map((t) => ({
      ...t,
      steps: t.steps || [],
      dependencies: t.dependencies || [],
    })),
  }));

  const filteredProducts = safeProducts
    .filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.description &&
          product.description.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesArea =
        filterAreas.length === 0 ||
        (product.tasks || []).some((task) =>
          (task.steps || []).some((step) => filterAreas.includes(step.area)),
        );

      const matchesCategory =
        filterCategories.length === 0 ||
        filterCategories.includes(product.category);

      const matchesStatus =
        filterStatus === "all" ||
        (filterStatus === "active" && product.isActive) ||
        (filterStatus === "inactive" && !product.isActive);

      return matchesSearch && matchesArea && matchesCategory && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "price-asc":
          return (a.finalPrice || 0) - (b.finalPrice || 0);
        case "price-desc":
          return (b.finalPrice || 0) - (a.finalPrice || 0);
        case "id":
          return a.id.localeCompare(b.id);
        default:
          return 0;
      }
    });

  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const totalPages = Math.ceil(filteredProducts.length / pageSize);

  const getPageNumbers = () => {
    const maxVisible = 5;
    const halfVisible = Math.floor(maxVisible / 2);
    const pages: (number | string)[] = [];
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= halfVisible + 1) {
        for (let i = 1; i <= maxVisible - 1; i++) pages.push(i);
        if (totalPages > maxVisible) pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - halfVisible) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - (maxVisible - 2); i <= totalPages; i++)
          pages.push(i);
      } else {
        pages.push(1);
        pages.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      }
    }
    return pages;
  };

  const uniqueAreas = Array.from(
    new Set(
      safeProducts.flatMap((p) =>
        (p.tasks || []).flatMap((t) => (t.steps || []).map((s) => s.area)),
      ),
    ),
  ).filter(Boolean);

  const uniqueCategories = Array.from(
    new Set(safeProducts.map((p) => p.category)),
  );

  const getTotalHours = (product: Product) => {
    return (product.tasks || []).reduce((total, task) => {
      return (
        total +
        (task.steps || []).reduce(
          (taskTotal, step) => taskTotal + step.estimatedHours,
          0,
        )
      );
    }, 0);
  };

  // Updated badge colors for dependency statuses
  const getDependencyBadgeColor = (dependencies: string[]) => {
    if (dependencies.length === 0) return "bg-gray-100 text-gray-800";
    if (dependencies.length === 1) return "bg-yellow-100 text-yellow-800";
    return "bg-orange-100 text-orange-800";
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setProductFormData({
      name: product.name || "",
      presentation: (product as any).presentation || "",
      benefits: (product as any).benefits || "",
      information: (product as any).information || "",
      description: product.description || "",
      category: product.category || "",
      subcategories: (product as any).subcategories || [],
      price: product.finalPrice?.toString() || "0",
      deliveryDays: (product as any).deliveryDays?.toString() || "0",
      productImage: null,
      productImagePreview:
        (product as any).productImagePreview || (product as any).image || "",
      deliveryVideoUrl: (product as any).deliveryVideoUrl || "",
      tags: (product as any).tags || [],
      productId: product.id,
      recurrence: (product as any).recurrence || "",
      complementaryProducts: (product as any).complementaryProducts || [],
      requestAttention: (product as any).requestAttention || "",
      oneTimeContract: (product as any).oneTimeContract || "",
      monthlyContract: (product as any).monthlyContract || "",
      previousContracts: (product as any).previousContracts || "",
      status: product.isActive ? "Ativo" : "Inativo",
      associatedTaskModels: (product as any).associatedTaskModels || [],
      // Update formData for questionnaire and tasks
      questionnaire: (product as any).questionnaire?.questions || [], // Ensure accessing questions array
      tasks: product.tasks || [], // Use tasks from the product object
      includedItems: (product as any).includedItems || [],
      notIncludedItems: (product as any).notIncludedItems || [],
      excludedItems: (product as any).excludedItems || [],
    });
    setAdditionalImages((product as any).additionalImages || []);
    // Load rich portfolio images; fall back to building from demonstrations URLs
    const existingPortfolio = (product as any).portfolioImages as
      | Array<{
          id: string;
          url: string;
          title?: string;
          description?: string;
          isMain: boolean;
          sortOrder: number;
        }>
      | undefined;
    if (existingPortfolio && existingPortfolio.length > 0) {
      setPortfolioImages(existingPortfolio);
    } else {
      const demoUrls: string[] = (product as any).demonstrations || [];
      setPortfolioImages(
        demoUrls.map((url, i) => ({
          id: `img-${i}-${Date.now()}`,
          url,
          title: "",
          description: "",
          isMain: i === 0,
          sortOrder: i,
        })),
      );
    }
    setProductQuestions((product as any).questions || []);
    setProductVariations(product.variations || []);
    setProductAddOns(product.addOns || []);
    setProductTasks(product.tasks || []); // Set tasks for the product form
    setIsProductSheetOpen(true);
  };

  const handleViewProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsViewSheetOpen(true);
  };

  const handleDeleteProduct = async (productId: string) => {
    // Implement deletion logic here, e.g., show a confirmation dialog
    if (
      !confirm(
        "Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.",
      )
    )
      return;

    try {
      await deleteProduct(productId);
      // Optionally show a success message
      toast({
        title: "Sucesso",
        description: "Produto excluído com sucesso!",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao excluir produto",
        variant: "destructive",
      });
    }
  };

  const calculateAutomaticPrice = () => {
    const tasksTotal = (productFormData.tasks || []).reduce((total, task) => {
      return total + (task.automaticValue || 0);
    }, 0);

    return tasksTotal;
  };

  const calculateStepValue = (specialtyId: string, hours: number): number => {
    if (!specialtyId || !hours) return 0;

    const specialty = specialties.find(
      (s) => s.id.toString() === specialtyId.toString(),
    );
    if (!specialty) return 0;

    // Use the highest level (senior) rate as specified
    const seniorRate = specialty.rates.senior;
    return seniorRate * hours;
  };

  const calculateTaskValue = (steps: TaskStep[]): number => {
    if (!steps || steps.length === 0) return 0;

    return steps.reduce((total, step) => {
      const stepValue = calculateStepValue(
        step.specialty,
        step.estimatedHours || 0,
      );
      return total + stepValue;
    }, 0);
  };

  const handleAIEnhance = async (fieldName: string, currentText: string) => {
    setIsEnhancingWithAI(true);
    setCurrentFieldEnhancing(fieldName);

    // Simulate AI processing
    setTimeout(() => {
      const enhancedText = `${currentText}\n\n[Texto melhorado pela IA: Conteúdo expandido com melhor estrutura e clareza.]`;

      setProductFormData({
        ...productFormData,
        [fieldName]: enhancedText,
      });

      setIsEnhancingWithAI(false);
      setCurrentFieldEnhancing(null);
    }, 2000);
  };

  // ── ID generator ────────────────────────────────────────────────────────
  const CATEGORY_SIGLA: Record<string, string> = {
    // Web
    Web: "WEB",
    "Desenvolvimento Web": "WEB",
    Desenvolvimento: "WEB",
    "Loja Virtual": "WEB",
    // Design
    "Design Gráfico": "DES",
    "Design e Audiovisual": "DES",
    Design: "DES",
    // Social Media
    "Social Media": "SOC",
    "Mídias e Conteúdo": "SOC",
    Conteúdo: "SOC",
    // Ads / Tráfego
    "Tráfego Pago": "ADS",
    Tráfego: "ADS",
    "Marketing Digital": "ADS",
    Marketing: "ADS",
    // Branding
    Branding: "BRD",
    // Vídeo
    Vídeo: "VID",
    Audiovisual: "VID",
    "Vídeo e Audiovisual": "VID",
    "Produção Audiovisual": "VID",
    // Automação
    Automação: "AUT",
    // SEO
    SEO: "SE",
    // CRM
    CRM: "CRM",
    Relacionamento: "CRM",
    // Consultoria fallback
    Consultoria: "CON",
  };

  const generateProductId = (category: string): string => {
    const sigla = CATEGORY_SIGLA[category] || "PROD";
    const prefix = `${sigla}-`;
    const existing = (products || []).filter((p) => p.id.startsWith(prefix));
    const maxNum = existing.reduce((max, p) => {
      const num = parseInt(p.id.replace(prefix, ""), 10);
      return isNaN(num) ? max : Math.max(max, num);
    }, 0);
    return `${prefix}${String(maxNum + 1).padStart(4, "0")}`;
  };

  const handleCreateProduct = () => {
    if (!productFormData.name.trim()) {
      alert("Por favor, preencha o nome do produto");
      return;
    }

    if (!productFormData.category.trim()) {
      alert("Por favor, selecione uma categoria");
      return;
    }

    const generatedId = generateProductId(productFormData.category);
    const newProductWithDefaults = {
      id: generatedId,
      name: productFormData.name,
      description:
        productFormData.summaryDescription || productFormData.benefits,
      category: productFormData.category,
      isActive: productFormData.isActive,
      tasks: productTasks, // This should be populated if tasks are managed within the product form
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalTasksCost: 0,
      qualificationFee: 0,
      subtotal: 0,
      taxes: 0,
      operationalFee: 0,
      partnerCommission: 0,
      finalPrice:
        Number.parseFloat(productFormData.price) || calculateAutomaticPrice(),
      variations: productVariations,
      addOns: productAddOns,
      // Populate other Product fields as needed from productFormData
      price: Number.parseFloat(productFormData.price) || 0,
      deliveryDays: Number.parseInt(productFormData.deliveryDays) || 0,
      image: productFormData.productImagePreview,
      productImagePreview: productFormData.productImagePreview,
      deliveryVideoUrl: productFormData.deliveryVideoUrl,
      presentation: productFormData.presentation,
      benefits: productFormData.benefits,
      information: productFormData.information,
      descriptionAttention: productFormData.descriptionAttention,
      summaryDescription: productFormData.summaryDescription,
      includedItems: productFormData.includedItems,
      notIncludedItems: productFormData.notIncludedItems,
      complementaryProducts: productFormData.complementaryProducts,
      requestAttention: productFormData.requestAttention,
      oneTimeContract: productFormData.oneTimeContract,
      monthlyContract: productFormData.monthlyContract,
      previousContracts: productFormData.previousContracts,
      status: productFormData.status,
      associatedTaskModels: productFormData.associatedTaskModels,
      recurrence: productFormData.recurrence,
      subcategories: productFormData.subcategories,
      tags: productFormData.tags,
      questions: productQuestions,
      additionalImages: additionalImages,
      portfolioImages: portfolioImages,
      demonstrations: portfolioImages.map((img) => img.url).filter(Boolean),
      // Questionnaire should be part of the product data if managed
      questionnaire: {
        title: "Questionário do Produto", // Placeholder title
        description: "Respostas do cliente para configurar o produto.", // Placeholder description
        questions: productQuestions,
      },
    };

    addProduct(newProductWithDefaults);

    resetProductForm();
    setIsProductSheetOpen(false);
  };

  const resetProductForm = () => {
    setProductFormData({
      productId: "",
      name: "",
      category: "",
      subcategories: [],
      tags: [],
      recurrence: "",
      price: "",
      deliveryDays: "",
      isActive: true,
      productImage: null,
      productImagePreview: "",
      presentation: "",
      deliveryVideoUrl: "",
      benefits: "",
      information: "",
      descriptionAttention: "",
      summaryDescription: "",
      includedItems: [],
      notIncludedItems: [],
      complementaryProducts: [],
      requestAttention: "",
      oneTimeContract: "",
      monthlyContract: "",
      previousContracts: "",
      status: "Ativo",
      associatedTaskModels: [],
      // Resetting fields added for editing
      description: "",
      mainImage: "",
      videoUrl: "",
      deadline: "",
      // Resetting questionnaire and tasks
      questionnaire: [],
      tasks: [],
      excludedItems: [],
    });
    setAdditionalImages([]);
    setPortfolioImages([]);
    setProductQuestions([]);
    setCustomTagInput("");
    // Resetting customization options
    setProductVariations([]);
    setProductAddOns([]);
    setProductTasks([]); // Reset tasks
  };

  const handleOpenProductSheet = () => {
    resetProductForm();
    setSelectedProduct(null); // Ensure we are in create mode
    setIsProductSheetOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProductFormData({
        ...productFormData,
        productImage: file,
        productImagePreview: URL.createObjectURL(file),
      });
    }
  };

  const handleAdditionalImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = e.target.files;
    if (files) {
      const newImages = Array.from(files).map((file) =>
        URL.createObjectURL(file),
      );
      setAdditionalImages([...additionalImages, ...newImages]);
    }
  };

  const removeAdditionalImage = (index: number) => {
    setAdditionalImages(additionalImages.filter((_, i) => i !== index));
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && customTagInput.trim()) {
      e.preventDefault();
      if (!productFormData.tags.includes(customTagInput.trim())) {
        setProductFormData({
          ...productFormData,
          tags: [...productFormData.tags, customTagInput.trim()],
        });
      }
      setCustomTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setProductFormData({
      ...productFormData,
      tags: productFormData.tags.filter((t) => t !== tag),
    });
  };

  const toggleSubcategory = (subcategory: string) => {
    setProductFormData({
      ...productFormData,
      subcategories: productFormData.subcategories.includes(subcategory)
        ? productFormData.subcategories.filter((s) => s !== subcategory)
        : [...productFormData.subcategories, subcategory],
    });
  };

  const handleEditPrice = () => {
    setShowPasswordModal(true);
  };

  const handlePasswordSubmit = () => {
    if (priceEditPassword === "123") {
      setShowPasswordModal(false);
      setPriceEditPassword("");
      // Price input is now editable
      const priceInput = document.querySelector(
        'input[value*="R$"]',
      ) as HTMLInputElement;
      if (priceInput) {
        priceInput.removeAttribute("readOnly");
        priceInput.classList.remove("bg-green-50", "dark:bg-green-950/20");
        priceInput.classList.add("bg-white", "dark:bg-background");
        priceInput.focus();
      }
    } else {
      alert("Senha incorreta!");
      setPriceEditPassword("");
    }
  };

  const addQuestion = () => {
    const newQuestion: Question = {
      id: `q-${Date.now()}`,
      question: "",
      type: "text",
      required: false,
      aiAssisted: false,
      allowsAttachment: false,
      options: [], // Initialize options
    };
    setProductQuestions([...productQuestions, newQuestion]);
  };

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setProductQuestions(
      productQuestions.map((q) => (q.id === id ? { ...q, ...updates } : q)),
    );
  };

  const removeQuestion = (id: string) => {
    setProductQuestions(productQuestions.filter((q) => q.id !== id));
  };

  const addVariation = () => {
    const newVariation = {
      id: `var-${Date.now()}`,
      name: "",
      description: "",
      price: 0,
      priceModifier: 0,
      deadlineDays: undefined,
      scopeDescription: "",
      features: [],
      sortOrder: productVariations.length + 1,
      isActive: true,
    };
    setProductVariations([...productVariations, newVariation]);
  };

  const updateVariation = (
    id: string,
    updates: Partial<(typeof productVariations)[0]>,
  ) => {
    setProductVariations(
      productVariations.map((v) => (v.id === id ? { ...v, ...updates } : v)),
    );
  };

  const removeVariation = (id: string) => {
    setProductVariations(productVariations.filter((v) => v.id !== id));
  };

  const addAddOn = () => {
    const newAddOn = {
      id: `addon-${Date.now()}`,
      name: "",
      price: 0,
      category: "extra" as const,
    };
    setProductAddOns([...productAddOns, newAddOn]);
  };

  const updateAddOn = (
    id: string,
    updates: Partial<(typeof productAddOns)[0]>,
  ) => {
    setProductAddOns(
      productAddOns.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    );
  };

  const removeAddOn = (id: string) => {
    setProductAddOns(productAddOns.filter((a) => a.id !== id));
  };

  const handleSaveProduct = () => {
    if (selectedProduct) {
      // Edit existing product
      updateProduct(selectedProduct.id, {
        // Pass selectedProduct.id to updateProduct
        ...selectedProduct, // Start with existing selected product
        ...productFormData, // Override with form data
        price: Number.parseFloat(productFormData.price),
        deliveryDays: Number.parseInt(productFormData.deliveryDays), // Changed from deadline to deliveryDays
        additionalImages,
        portfolioImages,
        demonstrations: portfolioImages.map((img) => img.url).filter(Boolean),
        questions: productQuestions,
        variations: productVariations,
        addOns: productAddOns,
        tasks: productTasks, // Use the tasks from the form state
        // Ensure other necessary fields are updated as well
        name: productFormData.name,
        presentation: productFormData.presentation,
        benefits: productFormData.benefits,
        information: productFormData.information,
        description: productFormData.description,
        category: productFormData.category,
        subcategories: productFormData.subcategories,
        image: productFormData.productImagePreview,
        productImagePreview: productFormData.productImagePreview,
        deliveryVideoUrl: productFormData.deliveryVideoUrl,
        tags: productFormData.tags,
        recurrence: productFormData.recurrence,
        complementaryProducts: productFormData.complementaryProducts,
        requestAttention: productFormData.requestAttention,
        oneTimeContract: productFormData.oneTimeContract,
        monthlyContract: productFormData.monthlyContract,
        previousContracts: productFormData.previousContracts,
        status: productFormData.status,
        associatedTaskModels: productFormData.associatedTaskModels,
        isActive: productFormData.isActive, // Assuming isActive is part of productFormData
        // Include questionnaire and tasks from form state
        questionnaire: {
          title: "Questionário do Produto", // Placeholder title
          description: "Respostas do cliente para configurar o produto.", // Placeholder description
          questions: productQuestions,
        },
        excludedItems: productFormData.excludedItems,
        updatedAt: new Date().toISOString(),
      });
      toast({
        title: "Sucesso",
        description: "Produto atualizado com sucesso!",
      });
    } else {
      // Create new product
      // Call handleCreateProduct which already has the logic for new products
      handleCreateProduct();
      toast({
        title: "Sucesso",
        description: "Produto criado com sucesso!",
      });
    }
    setIsProductSheetOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setSelectedProduct(null);
    setProductFormData({
      productId: "",
      name: "",
      category: "",
      subcategories: [],
      tags: [],
      recurrence: "",
      price: "",
      deliveryDays: "",
      isActive: true,
      productImage: null,
      productImagePreview: "",
      presentation: "",
      deliveryVideoUrl: "",
      benefits: "",
      information: "",
      descriptionAttention: "",
      summaryDescription: "",
      includedItems: [],
      notIncludedItems: [],
      complementaryProducts: [],
      requestAttention: "",
      oneTimeContract: "",
      monthlyContract: "",
      previousContracts: "",
      status: "Ativo",
      associatedTaskModels: [],
      // Fields from updates for editing
      description: "",
      mainImage: "",
      videoUrl: "",
      deadline: "",
      // Resetting questionnaire and tasks
      questionnaire: [],
      tasks: [],
      excludedItems: [],
    });
    setAdditionalImages([]);
    setPortfolioImages([]);
    setProductQuestions([]);
    setProductVariations([]);
    setProductAddOns([]);
    setProductTasks([]); // Reset tasks as well
  };

  const handleSaveDraft = () => {
    if (!productFormData.name.trim()) {
      alert("Por favor, preencha pelo menos o nome do produto");
      return;
    }

    const generatedId = generateProductId(
      productFormData.category || "Sem categoria",
    );

    const draftProduct: Product = {
      id: generatedId,
      name: productFormData.name,
      description:
        productFormData.summaryDescription ||
        productFormData.benefits ||
        "Rascunho",
      category: productFormData.category || "Sem categoria",
      isActive: false,
      tasks: [], // Drafts might not have tasks yet, or they could be saved separately
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalTasksCost: 0,
      qualificationFee: 0,
      subtotal: 0,
      taxes: 0,
      operationalFee: 0,
      partnerCommission: 0,
      finalPrice: Number.parseFloat(productFormData.price) || 0,
      // Populate other fields as needed for draft
      price: Number.parseFloat(productFormData.price) || 0,
      deliveryDays: Number.parseInt(productFormData.deliveryDays) || 0,
      image: productFormData.productImagePreview,
      productImagePreview: productFormData.productImagePreview,
      deliveryVideoUrl: productFormData.deliveryVideoUrl,
      presentation: productFormData.presentation,
      benefits: productFormData.benefits,
      information: productFormData.information,
      descriptionAttention: productFormData.descriptionAttention,
      summaryDescription: productFormData.summaryDescription,
      includedItems: productFormData.includedItems,
      notIncludedItems: productFormData.notIncludedItems,
      complementaryProducts: productFormData.complementaryProducts,
      requestAttention: productFormData.requestAttention,
      oneTimeContract: productFormData.oneTimeContract,
      monthlyContract: productFormData.monthlyContract,
      previousContracts: productFormData.previousContracts,
      status: "Inativo", // Drafts are typically inactive
      associatedTaskModels: productFormData.associatedTaskModels,
      recurrence: productFormData.recurrence,
      subcategories: productFormData.subcategories,
      tags: productFormData.tags,
      questions: productQuestions,
      additionalImages: additionalImages,
      portfolioImages: portfolioImages,
      demonstrations: portfolioImages.map((img) => img.url).filter(Boolean),
      variations: productVariations,
      addOns: productAddOns,
      questionnaire: {
        title: "Rascunho Questionário",
        description: "Questionário para configurar o produto.",
        questions: productQuestions,
      },
    };

    addProduct(draftProduct);
    resetProductForm();
    setIsProductSheetOpen(false);
  };

  const handleScheduleLaunch = () => {
    if (!activationDate) {
      alert("Por favor, defina a data de ativação");
      return;
    }

    // Here you would likely want to call handleSaveProduct() first,
    // then potentially set the activation/deactivation dates on the product
    // or queue it for a scheduled activation.
    // For now, we'll assume handleCreateProduct or handleUpdateProduct is called within handleSaveProduct.
    handleSaveProduct(); // Ensure product is saved first

    // Then handle scheduling logic
    // ... (actual scheduling logic would go here)

    setShowScheduling(false);
    setActivationDate("");
    setDeactivationDate("");
  };

  const handleImportTemplate = (template: any) => {
    setSelectedTemplateToImport(template);
    setShowImportModeDialog(true);
    setShowImportTemplateModal(false);
  };

  // Updated confirmImportTemplate to use productFormData for tasks
  const confirmImportTemplate = (mode: "linked" | "copy") => {
    if (!selectedTemplateToImport) return;

    const newTask: Task = {
      id: Date.now().toString(),
      code:
        mode === "linked"
          ? selectedTemplateToImport.id
          : `AUTO-GERADO-${Date.now()}`,
      name: selectedTemplateToImport.name,
      specialty: selectedTemplateToImport.category || "",
      executionTime: selectedTemplateToImport.estimated_hours || 0,
      executionDeadline: 0,
      deliveryDeadline: 0,
      adjustmentDeadline: 0,
      approvalDeadline: 0,
      automaticValue: selectedTemplateToImport.base_price || 0,
      order: (productFormData.tasks || []).length + 1,
      canRunInParallel: false, // Default value
      attentionText: "",
      pop: "",
      complementaryFiles: [],
      verificationItems: [],
      isLinkedToTemplate: mode === "linked",
      templateId: mode === "linked" ? selectedTemplateToImport.id : null,
      steps: [],
      description: selectedTemplateToImport.description || "",
      calculatedCost: 0,
      dependencies: [],
      keepNextStepWithNomadLeader: false,
      delegateToLeader: false,
      liberateAfterSend: false,
      requireFinalFiles: false,
      isInternalStep: false,
      concludeOnRejection: false,
      hideFromClient: false,
      hasVariations: false,
      noConditions: false,
      showAccess: false,
      hideInProducts: false,
      dontCountDeadline: false,
      dontCountValue: false,
      hasAdditionals: false,
      // For linked tasks, we need to map steps from the template
      // For copied tasks, steps will be initially empty and can be added
      ...(mode === "linked" && { steps: selectedTemplateToImport.steps || [] }),
    };

    setProductFormData({
      ...productFormData,
      tasks: [...(productFormData.tasks || []), newTask],
    });

    setShowImportModeDialog(false);
    setSelectedTemplateToImport(null);
  };

  // Renamed to toggleConfirmation for clarity
  const handleToggleProductStatus = (product: Product, newStatus: boolean) => {
    setToggleConfirmation({ product, newStatus });
  };

  const confirmToggleStatus = async () => {
    if (!toggleConfirmation.product) return;

    try {
      // Call updateProduct with (id, product) signature
      await updateProduct(toggleConfirmation.product.id, {
        ...toggleConfirmation.product,
        isActive: toggleConfirmation.newStatus,
        updatedAt: new Date().toISOString(),
      });

      toast({
        title: "Sucesso",
        description: `Produto ${toggleConfirmation.newStatus ? "ativado" : "desativado"} com sucesso`,
      });
    } catch (error) {
      console.error("Toggle error:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar status do produto",
        variant: "destructive",
      });
    } finally {
      setToggleConfirmation({ product: null, newStatus: false });
    }
  };

  // Calculate active filters count for display
  const activeFiltersCount = [
    filterCategories.length > 0,
    filterAreas.length > 0,
    filterStatus !== "all",
    sortBy !== "name",
  ].filter(Boolean).length;

  return (
    <div className="flex-1 space-y-3">
      <PageHeader
        title="Cadastro de Produtos"
        description="Cadastre, edite e organize os produtos e serviços da plataforma"
        actions={
          <Button
            onClick={handleOpenProductSheet}
            size="sm"
            className="btn-brand border-0"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Novo Produto
          </Button>
        }
      />

      {/* ── Stats Bar ── */}
      <TooltipProvider>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-4 px-5 py-4 rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-950/30 cursor-default">
                <div className="h-11 w-11 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm shrink-0">
                  <Package className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Produtos
                  </p>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-400 leading-tight">
                    {safeProducts.length}
                  </p>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Total de produtos cadastrados na plataforma</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-4 px-5 py-4 rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/30 cursor-default">
                <div className="h-11 w-11 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm shrink-0">
                  <ListChecks className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Tarefas
                  </p>
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 leading-tight">
                    {safeProducts.reduce(
                      (sum, p) => sum + (p.tasks || []).length,
                      0,
                    )}
                  </p>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Total de tarefas vinculadas a todos os produtos</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-4 px-5 py-4 rounded-xl border border-violet-100 dark:border-violet-900/40 bg-violet-50 dark:bg-violet-950/30 cursor-default">
                <div className="h-11 w-11 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm shrink-0">
                  <Clock className="h-5 w-5 text-violet-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Horas Est.
                  </p>
                  <p className="text-2xl font-bold text-violet-700 dark:text-violet-400 leading-tight">
                    {safeProducts.reduce((sum, p) => sum + getTotalHours(p), 0)}
                    h
                  </p>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Soma das horas estimadas de execução de todos os produtos</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-4 px-5 py-4 rounded-xl border border-orange-100 dark:border-orange-900/40 bg-orange-50 dark:bg-orange-950/30 cursor-default">
                <div className="h-11 w-11 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm shrink-0">
                  <TrendingUp className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Receita
                  </p>
                  <p className="text-xl font-bold text-orange-700 dark:text-orange-400 leading-tight">
                    {formatCurrency(
                      safeProducts.reduce(
                        (sum, p) => sum + (p.finalPrice || 0),
                        0,
                      ),
                    )}
                  </p>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Soma dos preços finais de todos os produtos cadastrados</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>

      <Card className="border border-slate-200/70 dark:border-slate-700/60 shadow-sm overflow-hidden">
        {/* Top Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200/70 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-900/30 flex-wrap">
          {/* Search */}
          <div className="flex-1 relative min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar produtos..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 h-9 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg focus-visible:ring-blue-500 w-full"
            />
          </div>

          {/* Items per page + count */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <ItemsPerPageSelect
              value={pageSize.toString()}
              onValueChange={(value) => {
                setPageSize(Number(value));
                setCurrentPage(1);
              }}
              variant="top"
            />
            <span className="text-xs text-slate-400 whitespace-nowrap">
              {filteredProducts.length !== safeProducts.length ? (
                <>
                  de{" "}
                  <span className="font-semibold text-blue-500">
                    {filteredProducts.length}
                  </span>{" "}
                  de {safeProducts.length} produto
                  {safeProducts.length !== 1 ? "s" : ""}
                </>
              ) : (
                <>
                  de{" "}
                  <span className="font-semibold text-slate-600 dark:text-slate-300">
                    {safeProducts.length}
                  </span>{" "}
                  produto{safeProducts.length !== 1 ? "s" : ""}
                </>
              )}
            </span>
          </div>

          {/* Filters button */}
          <Button
            onClick={() => setIsFilterModalOpen(true)}
            variant="outline"
            size="sm"
            className={`h-9 gap-2 px-3.5 text-xs flex-shrink-0 ${activeFiltersCount > 0 ? "bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-400" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filtros
            {activeFiltersCount > 0 && (
              <span className="ml-0.5 flex items-center justify-center h-4 w-4 rounded-full bg-blue-500 text-white text-[10px] font-bold">
                {activeFiltersCount}
              </span>
            )}
          </Button>

          {/* View toggle */}
          <TooltipProvider>
            <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`h-9 w-9 flex items-center justify-center transition-colors ${viewMode === "grid" ? "bg-blue-500 text-white" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
                  >
                    <Grid3x3 className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Visualizar como grade de cards</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`h-9 w-9 flex items-center justify-center transition-colors border-l border-slate-200 dark:border-slate-700 ${viewMode === "list" ? "bg-blue-500 text-white" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
                  >
                    <LayoutList className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Visualizar como lista compacta</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>

          {/* Pagination top */}
          {totalPages > 1 && (
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="h-7 w-7 flex items-center justify-center rounded-full text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              {getPageNumbers().map((page, index) =>
                page === "..." ? (
                  <span key={index} className="text-xs text-slate-300 px-0.5">
                    ·
                  </span>
                ) : (
                  <button
                    key={index}
                    onClick={() => setCurrentPage(Number(page))}
                    className={`h-7 w-7 flex items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                      page === currentPage
                        ? "bg-blue-500 text-white shadow-sm shadow-blue-200 dark:shadow-blue-900/40"
                        : "text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {page}
                  </button>
                ),
              )}
              <button
                onClick={() =>
                  setCurrentPage(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage === totalPages}
                className="h-7 w-7 flex items-center justify-center rounded-full text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Products content */}
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <div className="h-20 w-20 rounded-2xl bg-linear-to-br from-blue-100 to-purple-100 flex items-center justify-center mb-5 shadow-sm">
              <Package className="h-9 w-9 text-blue-500" />
            </div>
            <h3 className="text-base font-semibold mb-1.5">
              Nenhum produto encontrado
            </h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md text-sm leading-relaxed">
              {searchTerm || activeFiltersCount > 0
                ? "Tente ajustar os filtros ou busca para encontrar o que procura."
                : "Comece criando seu primeiro produto para gerenciar seu catálogo."}
            </p>
            {!(searchTerm || activeFiltersCount > 0) && (
              <Button
                onClick={handleOpenProductSheet}
                className="btn-brand gap-2"
              >
                <Plus className="h-4 w-4" />
                Criar Primeiro Produto
              </Button>
            )}
          </div>
        ) : viewMode === "list" ? (
          /* ── LIST VIEW ── */
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {paginatedProducts.map((product) => (
              <div
                key={product.id}
                className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group"
              >
                {/* Icon / Image */}
                <div className="relative shrink-0">
                  {product.productImagePreview || (product as any).image ? (
                    <img
                      src={
                        product.productImagePreview || (product as any).image
                      }
                      alt={product.name}
                      className="h-12 w-12 rounded-xl object-cover border shadow-sm"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-xl bg-linear-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-sm">
                      <Package className="h-5 w-5 text-white" />
                    </div>
                  )}
                  <div
                    className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background ${
                      product.isActive ? "bg-emerald-500" : "bg-slate-300"
                    }`}
                  />
                </div>

                {/* Name + description */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[15px] font-semibold truncate leading-tight">
                      {product.name}
                    </p>
                    <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 bg-muted px-2 py-0.5 rounded tracking-wider shrink-0">
                      {product.id}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {product.description || "Sem descrição"}
                  </p>
                </div>

                {/* Category badge */}
                <Badge
                  variant="secondary"
                  className="text-xs font-normal px-2 py-0.5 shrink-0 hidden sm:flex"
                >
                  {product.category}
                </Badge>

                {/* Tasks + hours */}
                <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                  <span className="flex items-center gap-1">
                    <ListChecks className="h-3.5 w-3.5" />
                    {(product.tasks || []).length} tarefas
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {getTotalHours(product)}h
                  </span>
                </div>

                {/* Price */}
                <span className="text-[15px] font-bold text-emerald-600 shrink-0 min-w-[90px] text-right">
                  {formatCurrency(product.finalPrice || 0)}
                </span>

                {/* Switch */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <Switch
                    checked={product.isActive}
                    onCheckedChange={(checked) =>
                      handleToggleProductStatus(product, checked)
                    }
                    className="data-[state=checked]:bg-emerald-500"
                  />
                  <span
                    className={`text-xs font-medium hidden lg:block ${product.isActive ? "text-emerald-600" : "text-slate-400"}`}
                  >
                    {product.isActive ? "Ativo" : "Inativo"}
                  </span>
                </div>

                {/* Actions */}
                <TooltipProvider>
                  <div className="flex gap-0.5 shrink-0">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewProduct(product)}
                          className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Ver detalhes</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditProduct(product)}
                          className="h-8 w-8 hover:bg-amber-50 hover:text-amber-600"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Editar produto</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TooltipProvider>
              </div>
            ))}
          </div>
        ) : (
          /* ── GRID VIEW ── */
          <div className="p-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-4">
              {paginatedProducts.map((product) => (
                <Card
                  key={product.id}
                  className={`group relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 border ${
                    product.isActive
                      ? "border-slate-200/80 dark:border-slate-700/60"
                      : "border-slate-200/80 dark:border-slate-700/60 opacity-80"
                  }`}
                >
                  {/* Cover image area */}
                  <div className="relative h-32 overflow-hidden">
                    {product.productImagePreview || (product as any).image ? (
                      <img
                        src={
                          product.productImagePreview || (product as any).image
                        }
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-linear-to-br from-slate-700 via-slate-800 to-slate-900 flex items-center justify-center">
                        <Package className="h-12 w-12 text-white/15" />
                      </div>
                    )}
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-linear-to-t from-black/65 via-black/10 to-transparent" />
                    {/* Top: ID + Status */}
                    <div className="absolute top-2.5 left-3 right-3 flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold bg-black/50 backdrop-blur-sm text-white/90 px-2 py-0.5 rounded-md tracking-wide border border-white/10">
                        {product.id}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm border ${
                          product.isActive
                            ? "bg-emerald-500/85 text-white border-emerald-400/30"
                            : "bg-slate-600/75 text-white/80 border-white/10"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${product.isActive ? "bg-white" : "bg-white/50"}`}
                        />
                        {product.isActive ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                    {/* Bottom: recurrence + price */}
                    <div className="absolute bottom-2.5 left-3 right-3 flex items-end justify-between">
                      {(product as any).recurrence && (
                        <span className="text-[10px] font-medium bg-black/45 backdrop-blur-sm text-white/80 px-2 py-0.5 rounded-md">
                          {(product as any).recurrence}
                        </span>
                      )}
                      <span className="ml-auto text-sm font-bold bg-black/50 backdrop-blur-sm text-white px-2.5 py-1 rounded-lg border border-white/10">
                        {formatCurrency(product.finalPrice || 0)}
                      </span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="px-4 pt-3.5 pb-3">
                    <h3 className="font-semibold text-[15px] leading-snug truncate text-slate-900 dark:text-slate-100">
                      {product.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                      {(product as any).summaryDescription ||
                        product.description ||
                        "Sem descrição"}
                    </p>
                    <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-medium px-2 py-0.5"
                      >
                        {product.category}
                      </Badge>
                      {((product as any).tags || [])
                        .slice(0, 2)
                        .map((tag: string) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="text-[10px] font-normal px-2 py-0.5 text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-400"
                          >
                            {tag}
                          </Badge>
                        ))}
                    </div>
                  </div>

                  {/* Stats grid */}
                  <TooltipProvider>
                    <div className="grid grid-cols-3 border-t border-slate-100 dark:border-slate-800 divide-x divide-slate-100 dark:divide-slate-800">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="py-3 px-2 text-center cursor-default">
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-none">
                              {(product.tasks || []).length}
                            </p>
                            <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mt-1">
                              Tarefas
                            </p>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Tarefas de execução vinculadas a este produto</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="py-3 px-2 text-center cursor-default">
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-none">
                              {getTotalHours(product)}h
                            </p>
                            <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mt-1">
                              Horas Est.
                            </p>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            Total de horas estimadas para entregar este produto
                          </p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="py-3 px-2 text-center cursor-default">
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-none">
                              {(product as any).deliveryDays
                                ? `${(product as any).deliveryDays}d`
                                : "—"}
                            </p>
                            <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mt-1">
                              Entrega
                            </p>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Prazo de entrega do produto em dias corridos</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </TooltipProvider>

                  {/* Actions row */}
                  <TooltipProvider>
                    <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/20">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-2 cursor-pointer">
                            <Switch
                              checked={product.isActive}
                              onCheckedChange={(checked) =>
                                handleToggleProductStatus(product, checked)
                              }
                              className="data-[state=checked]:bg-emerald-500 scale-90"
                            />
                            <span
                              className={`text-xs font-medium ${product.isActive ? "text-emerald-600" : "text-slate-400"}`}
                            >
                              {product.isActive ? "Ativo" : "Inativo"}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            {product.isActive
                              ? "Clique para desativar o produto"
                              : "Clique para ativar o produto"}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                      <div className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewProduct(product)}
                              className="h-8 px-3 text-xs gap-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Ver
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Ver todos os detalhes do produto</p>
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditProduct(product)}
                              className="h-8 px-3 text-xs gap-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Editar
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Abrir formulário de edição</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </TooltipProvider>

                  {/* Tasks Accordion */}
                  <div className="px-4 pb-3 border-t">
                    <Accordion type="single" collapsible>
                      <AccordionItem value="tasks" className="border-0">
                        <AccordionTrigger className="py-2 hover:no-underline text-xs font-medium text-muted-foreground hover:text-foreground">
                          <div className="flex items-center gap-1.5">
                            <Layers className="h-3.5 w-3.5" />
                            Tarefas e etapas ({(product.tasks || []).length})
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-0">
                          <div className="space-y-2 pt-1">
                            {(product.tasks || []).map((task, index) => (
                              <div
                                key={task.id}
                                className="border rounded-lg p-3 space-y-2 bg-muted/20"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex-shrink-0">
                                        {index + 1}
                                      </span>
                                      <h4 className="font-medium text-sm">
                                        {task.name}
                                      </h4>
                                      {task.canRunInParallel && (
                                        <Badge
                                          variant="outline"
                                          className="text-xs"
                                        >
                                          Paralela
                                        </Badge>
                                      )}
                                      {task.taskCategory && (
                                        <Badge
                                          variant="outline"
                                          className="text-xs text-violet-600 border-violet-200 bg-violet-50 dark:bg-violet-950/30 dark:border-violet-800 dark:text-violet-400"
                                        >
                                          {task.taskCategory}
                                        </Badge>
                                      )}
                                      <Badge className="text-xs bg-emerald-100 text-emerald-800 border-0">
                                        {formatCurrency(task.calculatedCost)}
                                      </Badge>
                                    </div>
                                    {task.objective && (
                                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mt-1 ml-7 leading-snug">
                                        🎯 {task.objective}
                                      </p>
                                    )}
                                    {task.description && (
                                      <p className="text-xs text-muted-foreground mt-0.5 ml-7 line-clamp-2">
                                        {task.description}
                                      </p>
                                    )}
                                    {(task.condition ||
                                      task.requiresAccess !== undefined) && (
                                      <div className="flex items-center gap-2 mt-1.5 ml-7 flex-wrap">
                                        {task.condition && (
                                          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800">
                                            Condição: {task.condition}
                                          </span>
                                        )}
                                        {task.requiresAccess !== undefined && (
                                          <span
                                            className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md border ${task.requiresAccess ? "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800" : "bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"}`}
                                          >
                                            {task.requiresAccess
                                              ? "🔐 Requer acessos"
                                              : "✓ Sem acessos externos"}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                    {(task.executionRules || []).length > 0 && (
                                      <div className="mt-2 ml-7 p-2 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                                        <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                                          Regras de execução
                                        </p>
                                        <ul className="space-y-0.5">
                                          {(task.executionRules || []).map(
                                            (rule, rIdx) => (
                                              <li
                                                key={rIdx}
                                                className="text-[11px] text-slate-600 dark:text-slate-300 flex items-start gap-1.5"
                                              >
                                                <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-slate-400 flex-shrink-0" />
                                                {rule}
                                              </li>
                                            ),
                                          )}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedTask(task);
                                      setIsTaskModalOpen(true);
                                    }}
                                    className="h-7 w-7 p-0 flex-shrink-0"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                  </Button>
                                </div>

                                {(task.dependencies || []).length > 0 && (
                                  <div className="flex items-center gap-2 ml-7">
                                    <Badge
                                      className={`text-xs ${getDependencyBadgeColor(task.dependencies)}`}
                                    >
                                      Depende de {task.dependencies.length}{" "}
                                      tarefa(s)
                                    </Badge>
                                  </div>
                                )}

                                <div className="ml-7 space-y-1">
                                  {(task.steps || []).map((step) => {
                                    const specialty = specialties.find(
                                      (s) => s.id === step.specialty,
                                    );
                                    return (
                                      <div
                                        key={step.id}
                                        className="flex flex-col gap-1 p-2 bg-background rounded-md border text-xs"
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                            <span className="font-semibold text-muted-foreground flex-shrink-0">
                                              {step.order}.
                                            </span>
                                            <span className="truncate">
                                              {step.name}
                                            </span>
                                            {specialty && (
                                              <Badge
                                                variant="outline"
                                                className="text-xs flex-shrink-0"
                                              >
                                                {specialty.name}
                                              </Badge>
                                            )}
                                            {step.experienceLevel && (
                                              <Badge
                                                variant="secondary"
                                                className="text-xs flex-shrink-0"
                                              >
                                                {step.experienceLevel}
                                              </Badge>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-2 flex-shrink-0">
                                            <span className="text-muted-foreground">
                                              {step.estimatedHours}h
                                            </span>
                                            <span className="font-semibold text-emerald-600">
                                              {formatCurrency(
                                                step.calculatedCost,
                                              )}
                                            </span>
                                          </div>
                                        </div>
                                        {step.internalGuidance && (
                                          <p className="text-[11px] text-muted-foreground pl-4 italic border-l-2 border-slate-200 dark:border-slate-700 ml-1">
                                            {step.internalGuidance}
                                          </p>
                                        )}
                                        {step.levelRates && (
                                          <div className="flex items-center gap-2 pl-4 mt-0.5 flex-wrap">
                                            {Object.entries(
                                              step.levelRates,
                                            ).map(([lvl, val]) => (
                                              <span
                                                key={lvl}
                                                className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                                              >
                                                {lvl}: {formatCurrency(val)}/h
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>

                                {task.questionnaire && (
                                  <div className="ml-7 pt-1">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-xs bg-transparent h-7 gap-1"
                                      onClick={() => {
                                        setSelectedQuestionnaire(
                                          task.questionnaire,
                                        );
                                        setIsQuestionnaireModalOpen(true);
                                      }}
                                    >
                                      <FileQuestion className="h-3 w-3" />
                                      Questionário (
                                      {task.questionnaire.questions.length}{" "}
                                      perguntas)
                                      <ArrowRight className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>

                  {/* Stages Accordion */}
                  {((product as any).stages || []).length > 0 && (
                    <div className="px-4 pb-3 border-t">
                      <Accordion type="single" collapsible>
                        <AccordionItem value="stages" className="border-0">
                          <AccordionTrigger className="py-2 hover:no-underline text-xs font-medium text-muted-foreground hover:text-foreground">
                            <div className="flex items-center gap-1.5">
                              <Layers className="h-3.5 w-3.5" />
                              Etapas de execução (
                              {((product as any).stages || []).length})
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pb-0">
                            <div className="space-y-1.5 pt-1">
                              {((product as any).stages || []).map(
                                (stage: any) => (
                                  <div
                                    key={stage.id}
                                    className={`rounded-lg border p-3 space-y-2 ${stage.isInternal ? "bg-slate-50 dark:bg-slate-800/60 border-dashed" : "bg-muted/20"}`}
                                  >
                                    {/* Stage header */}
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
                                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 text-xs font-bold flex-shrink-0">
                                          {stage.number}
                                        </span>
                                        <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex-shrink-0">
                                          {stage.code}
                                        </span>
                                        <h4 className="font-medium text-sm leading-tight">
                                          {stage.name}
                                        </h4>
                                        {stage.isInternal && (
                                          <Badge
                                            variant="outline"
                                            className="text-[10px] border-slate-300 text-slate-500 dark:text-slate-400 flex-shrink-0"
                                          >
                                            Interna
                                          </Badge>
                                        )}
                                        <Badge
                                          variant="outline"
                                          className="text-[10px] border-violet-200 bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:border-violet-800 dark:text-violet-400 flex-shrink-0"
                                        >
                                          {stage.category}
                                        </Badge>
                                        <Badge className="text-[10px] bg-emerald-100 text-emerald-800 border-0 flex-shrink-0">
                                          {formatCurrency(stage.value)}
                                        </Badge>
                                      </div>
                                    </div>

                                    {/* Stage description */}
                                    {stage.description && (
                                      <p className="text-xs text-muted-foreground ml-7 line-clamp-2">
                                        {stage.description}
                                      </p>
                                    )}

                                    {/* Stage metrics */}
                                    <div className="flex items-center gap-3 ml-7 flex-wrap">
                                      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                        <Clock className="h-3 w-3" />
                                        {stage.executionHours}h execução
                                      </span>
                                      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                        <ChevronRight className="h-3 w-3" />
                                        Entrega em {stage.deliveryDeadlineDays}d
                                      </span>
                                      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                        <Package className="h-3 w-3" />
                                        Limite: {stage.itemLimit}
                                      </span>
                                    </div>

                                    {/* Flags */}
                                    <div className="flex items-center gap-1.5 ml-7 flex-wrap">
                                      {stage.viewAccesses && (
                                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800">
                                          🔐 Visualiza acessos
                                        </span>
                                      )}
                                      {stage.keepSameNomad && (
                                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-800">
                                          👤 Mesmo nômade
                                        </span>
                                      )}
                                      {stage.delegateToLeader && (
                                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800">
                                          🎯 Delegar ao líder
                                        </span>
                                      )}
                                      {stage.requiresFinalFiles && (
                                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800">
                                          📎 Requer arquivos finais
                                        </span>
                                      )}
                                      {stage.hideInProducts && (
                                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
                                          👁 Oculto no catálogo
                                        </span>
                                      )}
                                    </div>

                                    {/* Internal guidance */}
                                    {stage.internalGuidance && (
                                      <div className="ml-7 p-2 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                                        <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">
                                          Orientação interna
                                        </p>
                                        <p className="text-[11px] text-slate-600 dark:text-slate-300 italic">
                                          {stage.internalGuidance}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                ),
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Pagination */}
        {filteredProducts.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20">
            <div className="flex items-center gap-2">
              <ItemsPerPageSelect
                value={pageSize.toString()}
                onValueChange={(value) => {
                  setPageSize(Number(value));
                  setCurrentPage(1);
                }}
                variant="bottom"
              />
              <span className="text-xs text-slate-400">
                de {filteredProducts.length} produto
                {filteredProducts.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="h-7 w-7 flex items-center justify-center rounded-full text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              {getPageNumbers().map((page, index) =>
                page === "..." ? (
                  <span key={index} className="text-xs text-slate-300 px-0.5">
                    ·
                  </span>
                ) : (
                  <button
                    key={index}
                    onClick={() => setCurrentPage(Number(page))}
                    className={`h-7 w-7 flex items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                      page === currentPage
                        ? "bg-blue-500 text-white shadow-sm shadow-blue-200 dark:shadow-blue-900/40"
                        : "text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {page}
                  </button>
                ),
              )}
              <button
                onClick={() =>
                  setCurrentPage(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage === totalPages}
                className="h-7 w-7 flex items-center justify-center rounded-full text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Advanced Filters Modal */}
      {isFilterModalOpen &&
        (() => {
          const allFilterFields = [
            { id: "categoria", label: "Categoria", section: "produto" },
            { id: "area", label: "Área", section: "produto" },
            { id: "status", label: "Status", section: "produto" },
            { id: "ordenar", label: "Ordenar por", section: "produto" },
          ];
          const has = (id: string) => visibleFields.includes(id);
          const handleDrop = (targetId: string) => {
            if (!draggingFilterId || draggingFilterId === targetId) return;
            const from = savedFilters.findIndex(
              (f) => f.id === draggingFilterId,
            );
            const to = savedFilters.findIndex((f) => f.id === targetId);
            if (from === -1 || to === -1) return;
            const reordered = [...savedFilters];
            const [moved] = reordered.splice(from, 1);
            reordered.splice(to, 0, moved);
            setSavedFilters(reordered);
            setDraggingFilterId(null);
            setDragOverFilterId(null);
          };
          const clearFilters = () => {
            setFilterCategories([]);
            setFilterAreas([]);
            setFilterStatus("all");
            setSortBy("name");
            setCurrentPage(1);
          };
          const applyAndClose = () => {
            setCurrentPage(1);
            setIsFilterModalOpen(false);
            setShowFieldPicker(false);
          };
          return (
            <div
              className="fixed z-50 flex items-center justify-center p-4 bg-black/25 backdrop-blur-[3px]"
              style={{
                left: sidebarWidth,
                top: headerHeight,
                bottom: footerHeight,
                right: 0,
              }}
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setIsFilterModalOpen(false);
                  setSelectedFilterId(null);
                  setShowFieldPicker(false);
                }
              }}
            >
              <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-[820px] max-h-[82vh] border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in duration-200 flex flex-col overflow-hidden">
                {/* Header */}
                <ModalBrandHeader
                  title="Filtros Avançados"
                  subtitle="Configure e aplique filtros"
                  icon={<Filter />}
                  onClose={() => {
                    setIsFilterModalOpen(false);
                    setSelectedFilterId(null);
                    setShowFieldPicker(false);
                  }}
                />

                {/* Body */}
                <div className="flex flex-1 overflow-hidden min-h-0">
                  {/* Left — Saved Filters */}
                  <div className="w-44 border-r border-slate-200 dark:border-slate-700 flex-shrink-0 bg-slate-50 dark:bg-slate-800/50 flex flex-col overflow-hidden">
                    <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-3 pt-3 pb-2 flex items-center gap-1 flex-shrink-0">
                      <Filter className="h-3 w-3" /> Filtros Salvos
                    </p>
                    <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-1">
                      {savedFilters.length === 0 ? (
                        <div className="text-center py-8">
                          <Filter className="h-6 w-6 mx-auto text-slate-300 dark:text-slate-600 mb-1.5" />
                          <p className="text-[10px] text-slate-400 dark:text-slate-500">
                            Nenhum filtro salvo
                          </p>
                        </div>
                      ) : (
                        savedFilters.map((filter) => (
                          <div
                            key={filter.id}
                            draggable
                            onDragStart={() => setDraggingFilterId(filter.id)}
                            onDragOver={(e) => {
                              e.preventDefault();
                              setDragOverFilterId(filter.id);
                            }}
                            onDrop={() => handleDrop(filter.id)}
                            onDragEnd={() => {
                              setDraggingFilterId(null);
                              setDragOverFilterId(null);
                            }}
                            onClick={() => {
                              if (editingFilterId) return;
                              setFilterCategories(
                                filter.filters.filterCategories || [],
                              );
                              setFilterAreas(filter.filters.filterAreas || []);
                              setFilterStatus(
                                filter.filters.filterStatus || "all",
                              );
                              setSortBy(filter.filters.sortBy || "name");
                              setSelectedFilterId(filter.id);
                            }}
                            className={`group relative flex items-center gap-1 p-2 rounded-lg border text-[11px] cursor-pointer transition-all select-none ${
                              dragOverFilterId === filter.id &&
                              draggingFilterId !== filter.id
                                ? "border-blue-400 bg-blue-50 dark:bg-blue-950/30"
                                : draggingFilterId === filter.id
                                  ? "opacity-40"
                                  : selectedFilterId === filter.id
                                    ? "bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 font-semibold"
                                    : "bg-white dark:bg-slate-700/40 border-slate-200 dark:border-slate-600/50 text-slate-700 dark:text-slate-300 hover:border-blue-300"
                            }`}
                          >
                            <GripVertical className="h-3 w-3 text-slate-300 dark:text-slate-600 flex-shrink-0 cursor-grab" />
                            {editingFilterId === filter.id ? (
                              <input
                                autoFocus
                                type="text"
                                value={editingFilterName}
                                onChange={(e) =>
                                  setEditingFilterName(e.target.value)
                                }
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => {
                                  e.stopPropagation();
                                  if (
                                    e.key === "Enter" &&
                                    editingFilterName.trim()
                                  ) {
                                    setSavedFilters(
                                      savedFilters.map((f) =>
                                        f.id === filter.id
                                          ? {
                                              ...f,
                                              name: editingFilterName.trim(),
                                            }
                                          : f,
                                      ),
                                    );
                                    setEditingFilterId(null);
                                  } else if (e.key === "Escape")
                                    setEditingFilterId(null);
                                }}
                                onBlur={() => {
                                  if (editingFilterName.trim())
                                    setSavedFilters(
                                      savedFilters.map((f) =>
                                        f.id === filter.id
                                          ? {
                                              ...f,
                                              name: editingFilterName.trim(),
                                            }
                                          : f,
                                      ),
                                    );
                                  setEditingFilterId(null);
                                }}
                                className="flex-1 min-w-0 text-[11px] bg-white dark:bg-slate-700 border border-blue-400 rounded px-1 py-0 outline-none focus:ring-1 focus:ring-blue-400"
                              />
                            ) : (
                              <span className="flex-1 truncate">
                                {filter.name}
                              </span>
                            )}
                            {editingFilterId !== filter.id && (
                              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity flex-shrink-0">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingFilterId(filter.id);
                                    setEditingFilterName(filter.name);
                                  }}
                                  className="p-0.5 rounded hover:bg-blue-100 hover:text-blue-500 text-slate-400"
                                >
                                  <Pencil className="h-2.5 w-2.5" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSavedFilters(
                                      savedFilters.filter(
                                        (f) => f.id !== filter.id,
                                      ),
                                    );
                                    if (selectedFilterId === filter.id)
                                      setSelectedFilterId(null);
                                  }}
                                  className="p-0.5 rounded hover:bg-red-100 hover:text-red-500 text-slate-400"
                                >
                                  <X className="h-2.5 w-2.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Right — Filter Fields */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-5">
                    {/* Add field button */}
                    <div className="flex items-center justify-between">
                      <div className="relative">
                        <button
                          onClick={() => setShowFieldPicker(!showFieldPicker)}
                          className="text-[11px] font-medium text-blue-500 hover:text-blue-700 flex items-center gap-1 transition-colors"
                        >
                          <Plus className="h-3 w-3" /> Adicionar campo
                          <span className="ml-1 text-slate-400">
                            {visibleFields.length} campos ativos
                          </span>
                        </button>
                        {showFieldPicker && (
                          <div className="absolute top-6 left-0 z-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-2 w-44 space-y-0.5">
                            {allFilterFields.map((f) => (
                              <label
                                key={f.id}
                                className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-[11px] transition-colors ${visibleFields.includes(f.id) ? "bg-blue-50 dark:bg-blue-900/20" : "hover:bg-slate-50 dark:hover:bg-slate-700/40"}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={visibleFields.includes(f.id)}
                                  onChange={() =>
                                    setVisibleFields((v) =>
                                      v.includes(f.id)
                                        ? v.filter((x) => x !== f.id)
                                        : [...v, f.id],
                                    )
                                  }
                                  className="accent-blue-500"
                                />
                                <span className="text-slate-700 dark:text-slate-300">
                                  {f.label}
                                </span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* CATEGORIA */}
                    {has("categoria") && (
                      <div>
                        <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                          Categoria
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {uniqueCategories.map((cat) => (
                            <button
                              key={cat}
                              onClick={() => {
                                setFilterCategories((prev) =>
                                  prev.includes(cat)
                                    ? prev.filter((x) => x !== cat)
                                    : [...prev, cat],
                                );
                              }}
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${filterCategories.includes(cat) ? "bg-blue-500 text-white border-blue-500" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-blue-300"}`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ÁREA */}
                    {has("area") && (
                      <div>
                        <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                          Área
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {uniqueAreas.length === 0 ? (
                            <p className="text-[11px] text-slate-400">
                              Nenhuma área cadastrada ainda
                            </p>
                          ) : (
                            uniqueAreas.map((area) => (
                              <button
                                key={area}
                                onClick={() => {
                                  setFilterAreas((prev) =>
                                    prev.includes(area)
                                      ? prev.filter((x) => x !== area)
                                      : [...prev, area],
                                  );
                                }}
                                className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${filterAreas.includes(area) ? "bg-violet-500 text-white border-violet-500" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-violet-300"}`}
                              >
                                {area}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    {/* STATUS */}
                    {has("status") && (
                      <div>
                        <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                          Status
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { v: "all", l: "Todos" },
                            { v: "active", l: "Ativo" },
                            { v: "inactive", l: "Inativo" },
                          ].map(({ v, l }) => (
                            <button
                              key={v}
                              onClick={() => {
                                setFilterStatus(v);
                              }}
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${
                                filterStatus === v
                                  ? v === "active"
                                    ? "bg-emerald-500 text-white border-emerald-500"
                                    : v === "inactive"
                                      ? "bg-red-500 text-white border-red-500"
                                      : "bg-blue-500 text-white border-blue-500"
                                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-blue-300"
                              }`}
                            >
                              {l}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ORDENAR POR */}
                    {has("ordenar") && (
                      <div>
                        <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                          Ordenar por
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { v: "name", l: "Nome (A-Z)" },
                            { v: "price-asc", l: "Preço ↑" },
                            { v: "price-desc", l: "Preço ↓" },
                            { v: "id", l: "ID" },
                          ].map(({ v, l }) => (
                            <button
                              key={v}
                              onClick={() => setSortBy(v)}
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${sortBy === v ? "bg-slate-700 text-white border-slate-700" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-slate-400"}`}
                            >
                              {l}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 flex-shrink-0">
                  <button
                    onClick={clearFilters}
                    className="text-[11px] text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1"
                  >
                    <X className="h-3 w-3" /> Limpar filtros
                  </button>
                  <div className="flex items-center gap-2">
                    {showSaveInput ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          autoFocus
                          type="text"
                          value={filterNameInput}
                          onChange={(e) => setFilterNameInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && filterNameInput.trim()) {
                              const newId = `filter-${Date.now()}`;
                              setSavedFilters([
                                ...savedFilters,
                                {
                                  id: newId,
                                  name: filterNameInput.trim(),
                                  filters: {
                                    filterCategories,
                                    filterAreas,
                                    filterStatus,
                                    sortBy,
                                  },
                                },
                              ]);
                              setSelectedFilterId(newId);
                              setShowSaveInput(false);
                              setFilterNameInput("");
                            }
                            if (e.key === "Escape") {
                              setShowSaveInput(false);
                              setFilterNameInput("");
                            }
                          }}
                          placeholder={`Filtro ${savedFilters.length + 1}`}
                          className="h-7 px-2 rounded-md text-[11px] border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-400 w-36"
                        />
                        <button
                          disabled={!filterNameInput.trim()}
                          onClick={() => {
                            const newId = `filter-${Date.now()}`;
                            setSavedFilters([
                              ...savedFilters,
                              {
                                id: newId,
                                name: filterNameInput.trim(),
                                filters: {
                                  filterCategories,
                                  filterAreas,
                                  filterStatus,
                                  sortBy,
                                },
                              },
                            ]);
                            setSelectedFilterId(newId);
                            setShowSaveInput(false);
                            setFilterNameInput("");
                          }}
                          className="h-7 px-3 rounded-md text-[11px] font-medium bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-40 text-white transition-all shadow-sm"
                        >
                          OK
                        </button>
                        <button
                          onClick={() => {
                            setShowSaveInput(false);
                            setFilterNameInput("");
                          }}
                          className="h-7 w-7 flex items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-500 hover:border-red-300 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setFilterNameInput(
                            `Filtro ${savedFilters.length + 1}`,
                          );
                          setShowSaveInput(true);
                        }}
                        className="h-7 px-3 rounded-md text-[11px] font-medium bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white transition-all shadow-sm"
                      >
                        Salvar filtro
                      </button>
                    )}
                    <div className="w-px h-5 bg-slate-200 dark:bg-slate-700" />
                    <button
                      onClick={() => {
                        setIsFilterModalOpen(false);
                        setShowFieldPicker(false);
                      }}
                      className="h-7 px-3 rounded-md text-[11px] font-medium border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={applyAndClose}
                      className="h-7 px-4 rounded-md text-[11px] font-semibold btn-brand transition-all shadow-sm"
                    >
                      Aplicar Filtros
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

      {/* ConfirmationDialog for toggling product status */}
      <ConfirmationDialog
        open={toggleConfirmation.product !== null}
        onClose={() =>
          setToggleConfirmation({ product: null, newStatus: false })
        }
        onConfirm={confirmToggleStatus}
        title={
          toggleConfirmation.newStatus ? "Ativar Produto" : "Desativar Produto"
        }
        message={
          toggleConfirmation.newStatus
            ? `Tem certeza que deseja ativar o produto "${toggleConfirmation.product?.name}"? Ele ficará visível para os clientes.`
            : `Tem certeza que deseja desativar o produto "${toggleConfirmation.product?.name}"? Ele não ficará mais visível para os clientes.`
        }
        confirmText={toggleConfirmation.newStatus ? "Ativar" : "Desativar"}
        destructive={!toggleConfirmation.newStatus}
      />

      {/* ProductSheet, QuestionnaireSheet, and PricingCalculatorModal are now inline below */}

      <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Editar Preço Manualmente
            </DialogTitle>
            <DialogDescription>
              Digite a senha de administrador para editar o preço do produto
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Senha</Label>
              <Input
                type="password"
                placeholder="Digite a senha"
                value={priceEditPassword}
                onChange={(e) => setPriceEditPassword(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              O preço é calculado automaticamente com base nas tarefas,
              especialidades e custos. Apenas administradores podem editá-lo
              manualmente.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPasswordModal(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handlePasswordSubmit}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pricing Sheet */}
      <Sheet open={isPricingModalOpen} onOpenChange={setIsPricingModalOpen}>
        <SheetContent
          side="right"
          className="p-0 flex flex-col"
          style={{
            left: `${sidebarWidth}px`,
            width: `calc(100vw - ${sidebarWidth}px)`,
          }}
        >
          <ModalBrandHeader
            title="Cálculo Detalhado"
            subtitle={
              selectedProduct
                ? selectedProduct.name
                : "Breakdown de preço do produto"
            }
            icon={<Calculator />}
          />

          {selectedProduct && (
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-6 space-y-6">
                {/* Hero price card */}
                <div className="app-brand-header rounded-xl p-5 text-white shadow-lg">
                  <p className="text-xs font-medium uppercase tracking-widest opacity-70 mb-1">
                    Preço Final do Produto
                  </p>
                  <p className="text-4xl font-bold">
                    {formatCurrency(selectedProduct.finalPrice)}
                  </p>
                  <div className="flex items-center gap-4 mt-3 text-sm opacity-80">
                    <span>{(selectedProduct.tasks || []).length} tarefas</span>
                    <span>·</span>
                    <span>
                      {(selectedProduct.tasks || []).reduce(
                        (s, t) =>
                          s +
                          (t.steps || []).reduce(
                            (ss, st) => ss + (st.estimatedHours || 0),
                            0,
                          ),
                        0,
                      )}
                      h estimadas
                    </span>
                    <span>·</span>
                    <span>
                      Custo base{" "}
                      {formatCurrency(selectedProduct.totalTasksCost)}
                    </span>
                  </div>
                </div>

                {/* Tasks & Steps breakdown */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Custos por Tarefa e Etapa
                  </h3>
                  {(selectedProduct.tasks || []).map((task, taskIndex) => (
                    <div
                      key={task.id}
                      className="border rounded-xl overflow-hidden"
                    >
                      <div className="flex items-center justify-between px-4 py-3 bg-muted/40">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                            {task.order || taskIndex + 1}
                          </span>
                          <span className="font-medium text-sm">
                            {task.name}
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-green-600">
                          {formatCurrency(task.calculatedCost)}
                        </span>
                      </div>
                      <div className="divide-y">
                        {(task.steps || []).map((step) => {
                          const specialty = specialties.find(
                            (s) => s.id === step.specialty,
                          );
                          const hourlyRate =
                            specialty && step.experienceLevel
                              ? specialty.rates[step.experienceLevel]
                              : 0;
                          return (
                            <div
                              key={step.id}
                              className="flex items-center justify-between px-4 py-2.5 text-sm"
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0 mr-4">
                                <span className="text-xs text-muted-foreground w-5 shrink-0">
                                  {step.order}.
                                </span>
                                <span className="truncate">{step.name}</span>
                                {specialty && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs shrink-0"
                                  >
                                    {specialty.name}
                                  </Badge>
                                )}
                                {step.experienceLevel && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs shrink-0"
                                  >
                                    {step.experienceLevel}
                                  </Badge>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                                {step.estimatedHours}h ×{" "}
                                {formatCurrency(hourlyRate)} ={" "}
                                <span className="font-semibold text-foreground">
                                  {formatCurrency(step.calculatedCost)}
                                </span>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Price composition */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Composição do Preço
                  </h3>
                  <div className="border rounded-xl overflow-hidden divide-y">
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                        <span className="text-sm">
                          Custo das Tarefas (Nômades)
                        </span>
                      </div>
                      <span className="text-sm font-semibold">
                        {formatCurrency(selectedProduct.totalTasksCost)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3 bg-yellow-50/60 dark:bg-yellow-950/20">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 shrink-0" />
                        <span className="text-sm">Taxa de Qualificação</span>
                        <Badge variant="outline" className="text-xs">
                          {(DEFAULT_TAX_RATES.QUALIFICATION_FEE * 100).toFixed(
                            0,
                          )}
                          %
                        </Badge>
                      </div>
                      <span className="text-sm font-semibold">
                        {formatCurrency(selectedProduct.qualificationFee)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3 bg-muted/30">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0" />
                        <span className="text-sm font-semibold">Subtotal</span>
                      </div>
                      <span className="text-sm font-bold">
                        {formatCurrency(selectedProduct.subtotal)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0" />
                        <span className="text-sm">Impostos</span>
                        <Badge variant="outline" className="text-xs">
                          {(DEFAULT_TAX_RATES.TAXES * 100).toFixed(0)}%
                        </Badge>
                      </div>
                      <span className="text-sm font-semibold">
                        {formatCurrency(selectedProduct.taxes)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0" />
                        <span className="text-sm">Taxa Operacional</span>
                        <Badge variant="outline" className="text-xs">
                          {(DEFAULT_TAX_RATES.OPERATIONAL_FEE * 100).toFixed(0)}
                          %
                        </Badge>
                      </div>
                      <span className="text-sm font-semibold">
                        {formatCurrency(selectedProduct.operationalFee)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-4 bg-green-50 dark:bg-green-950/30">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="font-bold text-green-700 dark:text-green-400">
                          Preço Final
                        </span>
                      </div>
                      <span className="text-xl font-bold text-green-600">
                        {formatCurrency(selectedProduct.finalPrice)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}

          <div className="flex-shrink-0 px-6 py-4 border-t bg-muted/20 flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsPricingModalOpen(false)}
            >
              Fechar
            </Button>
            <Button
              size="sm"
              className="ml-auto btn-brand"
              onClick={() => {
                setIsPricingModalOpen(false);
                if (selectedProduct) openProductSheet(selectedProduct);
              }}
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar Produto
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Task Detail Sheet */}
      <Sheet open={isTaskModalOpen} onOpenChange={setIsTaskModalOpen}>
        <SheetContent
          side="right"
          className="p-0 flex flex-col"
          style={{
            left: `${sidebarWidth}px`,
            width: `calc(100vw - ${sidebarWidth}px)`,
          }}
        >
          <ModalBrandHeader
            title="Detalhes da Tarefa"
            subtitle={
              selectedTask
                ? selectedTask.name
                : "Informações completas sobre a tarefa"
            }
            icon={<ListChecks />}
          />

          {selectedTask && (
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-6 space-y-6">
                {/* Hero card */}
                <div className="app-brand-header rounded-xl p-5 text-white shadow-lg">
                  <p className="text-xs font-medium uppercase tracking-widest opacity-70 mb-1">
                    Custo da Tarefa
                  </p>
                  <p className="text-3xl font-bold">
                    {formatCurrency(selectedTask.calculatedCost)}
                  </p>
                  <div className="flex items-center gap-3 mt-3 flex-wrap">
                    <span className="text-xs font-medium bg-white/15 px-2.5 py-1 rounded-full">
                      {selectedTask.steps.length} etapa
                      {selectedTask.steps.length !== 1 ? "s" : ""}
                    </span>
                    <span className="text-xs font-medium bg-white/15 px-2.5 py-1 rounded-full">
                      {selectedTask.steps.reduce(
                        (s, st) => s + (st.estimatedHours || 0),
                        0,
                      )}
                      h estimadas
                    </span>
                    {selectedTask.canRunInParallel && (
                      <span className="text-xs font-medium bg-white/15 px-2.5 py-1 rounded-full">
                        Execução Paralela
                      </span>
                    )}
                  </div>
                </div>

                {/* Meta */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-card">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                      Etapas
                    </p>
                    <p className="font-bold text-lg text-slate-800 dark:text-slate-100 leading-tight">
                      {selectedTask.steps.length}
                    </p>
                  </div>
                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-card">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                      Horas Est.
                    </p>
                    <p className="font-bold text-lg text-slate-800 dark:text-slate-100 leading-tight">
                      {selectedTask.steps.reduce(
                        (s, st) => s + (st.estimatedHours || 0),
                        0,
                      )}
                      h
                    </p>
                  </div>
                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-card">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                      Paralela
                    </p>
                    <p
                      className={`font-bold text-sm leading-tight ${selectedTask.canRunInParallel ? "text-violet-600" : "text-slate-400"}`}
                    >
                      {selectedTask.canRunInParallel ? "Sim" : "Não"}
                    </p>
                  </div>
                </div>

                {selectedTask.dependencies &&
                  selectedTask.dependencies.length > 0 && (
                    <div className="flex items-start gap-3 border border-amber-200 dark:border-amber-800/40 rounded-xl p-4 bg-amber-50/60 dark:bg-amber-950/20">
                      <div className="h-7 w-7 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0 mt-0.5">
                        <ListChecks className="h-3.5 w-3.5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                          Dependências
                        </p>
                        <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                          Esta tarefa só pode iniciar após a conclusão de{" "}
                          <strong>{selectedTask.dependencies.length}</strong>{" "}
                          tarefa
                          {selectedTask.dependencies.length !== 1 ? "s" : ""}{" "}
                          anterior
                          {selectedTask.dependencies.length !== 1 ? "es" : ""}.
                        </p>
                      </div>
                    </div>
                  )}

                {/* Steps */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      Etapas da Tarefa
                    </h3>
                    {selectedTask.steps.length > 0 && (
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-100 dark:bg-blue-900/40 px-1.5 py-0.5 rounded-full">
                        {selectedTask.steps.length}
                      </span>
                    )}
                  </div>

                  {selectedTask.steps.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-400">
                      <Layers className="h-8 w-8 mb-2 text-slate-200 dark:text-slate-700" />
                      <p className="text-xs font-medium">
                        Nenhuma etapa cadastrada
                      </p>
                      <p className="text-[10px] mt-0.5">
                        Acesse "Gerenciar Etapas" para adicionar
                      </p>
                    </div>
                  ) : (
                    <div className="relative">
                      {/* Linha vertical de timeline */}
                      {selectedTask.steps.length > 1 && (
                        <div className="absolute left-4 top-9 bottom-9 w-0.5 bg-slate-200 dark:bg-slate-700 z-0" />
                      )}
                      <div className="space-y-3 relative z-10">
                        {selectedTask.steps.map((step, si) => {
                          const specialty = specialties.find(
                            (s) => s.id === step.specialty,
                          );
                          const hourlyRate =
                            specialty && step.experienceLevel
                              ? specialty.rates[step.experienceLevel]
                              : 0;
                          return (
                            <div key={step.id} className="flex gap-3">
                              {/* Número da etapa */}
                              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-blue-500 text-white font-bold text-sm shrink-0 shadow-sm z-10">
                                {step.order || si + 1}
                              </div>
                              {/* Card da etapa */}
                              <div className="flex-1 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 bg-card shadow-sm">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm text-slate-800 dark:text-slate-100 leading-snug">
                                      {step.name}
                                    </p>
                                    {step.description && (
                                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                        {step.description}
                                      </p>
                                    )}
                                  </div>
                                  <div className="text-right shrink-0">
                                    <p className="text-sm font-bold text-emerald-600 leading-tight">
                                      {formatCurrency(step.calculatedCost)}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                      {step.estimatedHours}h estimadas
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 mt-3 flex-wrap">
                                  {specialty && (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] px-2 py-0.5"
                                    >
                                      {specialty.name}
                                    </Badge>
                                  )}
                                  {step.experienceLevel && (
                                    <Badge
                                      variant="secondary"
                                      className="text-[10px] px-2 py-0.5"
                                    >
                                      {step.experienceLevel}
                                    </Badge>
                                  )}
                                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-slate-50 dark:bg-slate-800/60 px-2 py-0.5 rounded-full border border-slate-100 dark:border-slate-700">
                                    <Clock className="h-2.5 w-2.5" />
                                    <span>
                                      {step.estimatedHours}h ×{" "}
                                      {formatCurrency(hourlyRate)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {selectedTask.questionnaire && (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50/60 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-700">
                      <FileQuestion className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Questionário Associado
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedQuestionnaire(selectedTask.questionnaire);
                          setIsQuestionnaireModalOpen(true);
                        }}
                        className="ml-auto h-7 text-xs gap-1 px-2.5"
                      >
                        Ver Completo
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="p-4 bg-card">
                      <p className="font-semibold text-sm text-slate-800 dark:text-slate-100">
                        {selectedTask.questionnaire.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {selectedTask.questionnaire.description}
                      </p>
                      <div className="flex items-center gap-2 mt-3">
                        <Badge variant="secondary" className="text-xs">
                          {selectedTask.questionnaire.questions.length} pergunta
                          {selectedTask.questionnaire.questions.length !== 1
                            ? "s"
                            : ""}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

          <div className="flex-shrink-0 px-6 py-4 border-t bg-muted/20 flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsTaskModalOpen(false)}
            >
              Fechar
            </Button>
            <Button size="sm" className="ml-auto btn-brand">
              <Edit className="h-4 w-4 mr-2" />
              Editar Tarefa
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Questionnaire Sheet */}
      <Sheet
        open={isQuestionnaireModalOpen}
        onOpenChange={setIsQuestionnaireModalOpen}
      >
        <SheetContent
          side="right"
          className="p-0 flex flex-col"
          style={{
            left: `${sidebarWidth}px`,
            width: `calc(100vw - ${sidebarWidth}px)`,
          }}
        >
          <ModalBrandHeader
            title="Questionário"
            subtitle={
              selectedQuestionnaire
                ? selectedQuestionnaire.title
                : "Para cliente / agência"
            }
            icon={<FileQuestion />}
          />

          {selectedQuestionnaire && (
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-6 space-y-6">
                {/* Hero */}
                <div className="app-brand-header rounded-xl p-5 text-white shadow-lg">
                  <p className="text-xs font-medium uppercase tracking-widest opacity-70 mb-1">
                    Questionário pré-tarefa
                  </p>
                  <p className="text-xl font-bold">
                    {selectedQuestionnaire.title}
                  </p>
                  {selectedQuestionnaire.description && (
                    <p className="text-sm opacity-80 mt-1">
                      {selectedQuestionnaire.description}
                    </p>
                  )}
                  <div className="mt-3 text-sm opacity-80">
                    {selectedQuestionnaire.questions.length} perguntas
                  </div>
                </div>

                {/* Questions */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Perguntas
                  </h3>
                  {selectedQuestionnaire.questions.map((question, index) => (
                    <div key={question.id} className="border rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-purple-100 text-purple-700 text-xs font-bold shrink-0 mt-0.5">
                          {index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium text-sm">
                              {question.question}
                            </p>
                            {question.required && (
                              <Badge
                                variant="destructive"
                                className="text-xs shrink-0"
                              >
                                Obrigatória
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {question.type === "text" && "Texto curto"}
                              {question.type === "multiline" && "Texto longo"}
                              {question.type === "select" && "Seleção única"}
                              {question.type === "multiselect" &&
                                "Múltipla escolha"}
                              {question.type === "file" && "Upload de arquivo"}
                            </Badge>
                            {question.aiAssisted && (
                              <Badge className="text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                                <Sparkles className="h-3 w-3 mr-1" />
                                IA Assistida
                              </Badge>
                            )}
                          </div>
                          {question.options && question.options.length > 0 && (
                            <div className="mt-3 pl-3 border-l-2 border-muted space-y-1">
                              <p className="text-xs text-muted-foreground mb-1">
                                Opções:
                              </p>
                              {question.options.map((option, optIndex) => (
                                <div
                                  key={optIndex}
                                  className="flex items-center gap-2 text-sm"
                                >
                                  <CheckCircle2 className="h-3 w-3 text-muted-foreground shrink-0" />
                                  <span>{option}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollArea>
          )}

          <div className="flex-shrink-0 px-6 py-4 border-t bg-muted/20 flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsQuestionnaireModalOpen(false)}
            >
              Fechar
            </Button>
            <Button size="sm" className="ml-auto btn-brand">
              <Edit className="h-4 w-4 mr-2" />
              Editar Questionário
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* <ImportTaskTemplateModal
        open={showImportTemplateModal}
        onClose={() => setShowImportTemplateModal(false)}
        onImport={handleImportTemplate}
      /> */}

      {/* Modernized import mode dialog with better styling and layout */}
      <Dialog
        open={showImportModeDialog}
        onOpenChange={setShowImportModeDialog}
      >
        <DialogContent className="max-w-lg p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30">
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
                <FileText className="h-4 w-4 text-white" />
              </div>
              Como deseja importar o modelo?
            </DialogTitle>
            <DialogDescription>
              Escolha se deseja vincular ao modelo original ou criar uma cópia
              independente
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 space-y-3">
            <button
              onClick={() => {
                setImportMode("linked");
                setShowImportModeDialog(false);
                if (selectedTemplateToImport) {
                  // Import as linked
                  const newTask: Task = {
                    id: Date.now().toString(),
                    name: selectedTemplateToImport.name,
                    description: selectedTemplateToImport.description,
                    templateId: selectedTemplateToImport.id,
                    isLinkedToTemplate: true,
                    order: (productFormData.tasks || []).length + 1,
                    canRunInParallel: false, // Default value from Task interface
                    // Replicate other fields from template if needed, or fetch them
                    steps: selectedTemplateToImport.steps || [], // Assuming steps are part of template
                    // Add other default Task properties here if they are not in selectedTemplateToImport
                    code:
                      selectedTemplateToImport.code ||
                      `LINKED-${selectedTemplateToImport.id}`,
                    specialty: selectedTemplateToImport.specialty || "",
                    executionTime: selectedTemplateToImport.executionTime || 0,
                    executionDeadline:
                      selectedTemplateToImport.executionDeadline || 0,
                    deliveryDeadline:
                      selectedTemplateToImport.deliveryDeadline || 0,
                    adjustmentDeadline:
                      selectedTemplateToImport.adjustmentDeadline || 0,
                    approvalDeadline:
                      selectedTemplateToImport.approvalDeadline || 0,
                    automaticValue:
                      selectedTemplateToImport.automaticValue || 0,
                    attentionText: selectedTemplateToImport.attentionText || "",
                    pop: selectedTemplateToImport.pop || "",
                    complementaryFiles:
                      selectedTemplateToImport.complementaryFiles || [],
                    verificationItems:
                      selectedTemplateToImport.verificationItems || [],
                    keepNextStepWithNomadLeader:
                      selectedTemplateToImport.keepNextStepWithNomadLeader ||
                      false,
                    delegateToLeader:
                      selectedTemplateToImport.delegateToLeader || false,
                    liberateAfterSend:
                      selectedTemplateToImport.liberateAfterSend || false,
                    requireFinalFiles:
                      selectedTemplateToImport.requireFinalFiles || false,
                    isInternalStep:
                      selectedTemplateToImport.isInternalStep || false,
                    concludeOnRejection:
                      selectedTemplateToImport.concludeOnRejection || false,
                    hideFromClient:
                      selectedTemplateToImport.hideFromClient || false,
                    hasVariations:
                      selectedTemplateToImport.hasVariations || false,
                    noConditions:
                      selectedTemplateToImport.noConditions || false,
                    showAccess: selectedTemplateToImport.showAccess || false,
                    hideInProducts:
                      selectedTemplateToImport.hideInProducts || false,
                    dontCountDeadline:
                      selectedTemplateToImport.dontCountDeadline || false,
                    dontCountValue:
                      selectedTemplateToImport.dontCountValue || false,
                    hasAdditionals:
                      selectedTemplateToImport.hasAdditionals || false,
                    calculatedCost:
                      selectedTemplateToImport.calculatedCost || 0,
                    dependencies: selectedTemplateToImport.dependencies || [],
                  };
                  setProductFormData({
                    ...productFormData,
                    tasks: [...(productFormData.tasks || []), newTask],
                  });
                  setSelectedTemplateToImport(null);
                }
              }}
              className="w-full p-4 rounded-lg border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all group text-left"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                  <Link className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-1">
                    Vincular ao Modelo Original
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    As alterações feitas no modelo original serão refletidas
                    automaticamente neste produto
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => {
                setImportMode("copy");
                setShowImportModeDialog(false);
                if (selectedTemplateToImport) {
                  // Import as copy
                  const newTask: Task = {
                    id: Date.now().toString(),
                    name: `${selectedTemplateToImport.name} (Cópia)`,
                    description: selectedTemplateToImport.description,
                    templateId: null, // No template link for copy
                    isLinkedToTemplate: false,
                    order: (productFormData.tasks || []).length + 1,
                    canRunInParallel:
                      selectedTemplateToImport.canRunInParallel || false, // Use existing default or template value
                    // Replicate other fields from template if needed, or set defaults
                    steps: selectedTemplateToImport.steps || [], // Copy steps as well
                    code: `COPY-${Date.now().toString().slice(-6)}`, // Auto-generated code for copy
                    specialty: selectedTemplateToImport.specialty || "",
                    executionTime: selectedTemplateToImport.executionTime || 0,
                    executionDeadline:
                      selectedTemplateToImport.executionDeadline || 0,
                    deliveryDeadline:
                      selectedTemplateToImport.deliveryDeadline || 0,
                    adjustmentDeadline:
                      selectedTemplateToImport.adjustmentDeadline || 0,
                    approvalDeadline:
                      selectedTemplateToImport.approvalDeadline || 0,
                    automaticValue:
                      selectedTemplateToImport.automaticValue || 0,
                    attentionText: selectedTemplateToImport.attentionText || "",
                    pop: selectedTemplateToImport.pop || "",
                    complementaryFiles:
                      selectedTemplateToImport.complementaryFiles || [],
                    verificationItems:
                      selectedTemplateToImport.verificationItems || [],
                    keepNextStepWithNomadLeader:
                      selectedTemplateToImport.keepNextStepWithNomadLeader ||
                      false,
                    delegateToLeader:
                      selectedTemplateToImport.delegateToLeader || false,
                    liberateAfterSend:
                      selectedTemplateToImport.liberateAfterSend || false,
                    requireFinalFiles:
                      selectedTemplateToImport.requireFinalFiles || false,
                    isInternalStep:
                      selectedTemplateToImport.isInternalStep || false,
                    concludeOnRejection:
                      selectedTemplateToImport.concludeOnRejection || false,
                    hideFromClient:
                      selectedTemplateToImport.hideFromClient || false,
                    hasVariations:
                      selectedTemplateToImport.hasVariations || false,
                    noConditions:
                      selectedTemplateToImport.noConditions || false,
                    showAccess: selectedTemplateToImport.showAccess || false,
                    hideInProducts:
                      selectedTemplateToImport.hideInProducts || false,
                    dontCountDeadline:
                      selectedTemplateToImport.dontCountDeadline || false,
                    dontCountValue:
                      selectedTemplateToImport.dontCountValue || false,
                    hasAdditionals:
                      selectedTemplateToImport.hasAdditionals || false,
                    calculatedCost:
                      selectedTemplateToImport.calculatedCost || 0,
                    dependencies: selectedTemplateToImport.dependencies || [],
                  };
                  setProductFormData({
                    ...productFormData,
                    tasks: [...(productFormData.tasks || []), newTask],
                  });
                  setSelectedTemplateToImport(null);
                }
              }}
              className="w-full p-4 rounded-lg border-2 border-purple-200 hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-all group text-left"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50 transition-colors">
                  <Copy className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-1">
                    Criar Cópia Independente
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Criar uma cópia que pode ser editada livremente sem afetar o
                    modelo original
                  </p>
                </div>
              </div>
            </button>
          </div>

          <div className="flex justify-end px-6 py-4 border-t">
            <Button
              variant="ghost"
              onClick={() => setShowImportModeDialog(false)}
            >
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sheet: View product (read-only) */}
      <Sheet open={isViewSheetOpen} onOpenChange={setIsViewSheetOpen}>
        <SheetContent
          side="right"
          className="p-0 flex flex-col"
          style={{
            left: `${sidebarWidth}px`,
            width: `calc(100vw - ${sidebarWidth}px)`,
          }}
        >
          {selectedProduct && (
            <>
              <ModalBrandHeader
                title={selectedProduct.name}
                subtitle={`${selectedProduct.category}${selectedProduct.recurrence ? ` · ${selectedProduct.recurrence}` : ""} · ${formatCurrency(selectedProduct.finalPrice || 0)}`}
                icon={<Package />}
              />

              <div className="flex-1 overflow-auto">
                <Tabs defaultValue="overview" className="space-y-0">
                  {/* Sticky tab navigation */}
                  <div className="sticky top-0 z-10 bg-background border-b border-slate-200 dark:border-slate-700 px-5">
                    <TabsList className="bg-transparent p-0 h-10 border-0 rounded-none gap-0 w-full justify-start">
                      <TabsTrigger
                        value="overview"
                        className="relative h-10 px-4 rounded-none bg-transparent border-0 shadow-none text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1.5 after:absolute after:bottom-0 after:inset-x-0 after:h-0.5 after:bg-blue-500 after:scale-x-0 data-[state=active]:after:scale-x-100 after:transition-transform"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Visão Geral
                      </TabsTrigger>
                      <TabsTrigger
                        value="tasks"
                        className="relative h-10 px-4 rounded-none bg-transparent border-0 shadow-none text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1.5 after:absolute after:bottom-0 after:inset-x-0 after:h-0.5 after:bg-blue-500 after:scale-x-0 data-[state=active]:after:scale-x-100 after:transition-transform"
                      >
                        <Layers className="h-3.5 w-3.5" />
                        Tarefas
                        {(selectedProduct.tasks || []).length > 0 && (
                          <span className="ml-0.5 h-4 min-w-4 px-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold flex items-center justify-center">
                            {(selectedProduct.tasks || []).length}
                          </span>
                        )}
                      </TabsTrigger>
                      <TabsTrigger
                        value="pricing"
                        className="relative h-10 px-4 rounded-none bg-transparent border-0 shadow-none text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1.5 after:absolute after:bottom-0 after:inset-x-0 after:h-0.5 after:bg-blue-500 after:scale-x-0 data-[state=active]:after:scale-x-100 after:transition-transform"
                      >
                        <DollarSign className="h-3.5 w-3.5" />
                        Preços
                      </TabsTrigger>
                      <TabsTrigger
                        value="questionnaire"
                        className="relative h-10 px-4 rounded-none bg-transparent border-0 shadow-none text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1.5 after:absolute after:bottom-0 after:inset-x-0 after:h-0.5 after:bg-blue-500 after:scale-x-0 data-[state=active]:after:scale-x-100 after:transition-transform"
                      >
                        <FileQuestion className="h-3.5 w-3.5" />
                        Questionário
                      </TabsTrigger>
                      <TabsTrigger
                        value="nomad-tests"
                        className="relative h-10 px-4 rounded-none bg-transparent border-0 shadow-none text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1.5 after:absolute after:bottom-0 after:inset-x-0 after:h-0.5 after:bg-blue-500 after:scale-x-0 data-[state=active]:after:scale-x-100 after:transition-transform"
                      >
                        <FlaskConical className="h-3.5 w-3.5" />
                        Testes
                        {((selectedProduct as any).nomadTests || []).filter(
                          (t: any) => t.isActive,
                        ).length > 0 && (
                          <span className="ml-0.5 h-4 min-w-4 px-1 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 text-[10px] font-bold flex items-center justify-center">
                            {
                              (
                                (selectedProduct as any).nomadTests || []
                              ).filter((t: any) => t.isActive).length
                            }
                          </span>
                        )}
                      </TabsTrigger>
                      <TabsTrigger
                        value="circuito"
                        className="relative h-10 px-4 rounded-none bg-transparent border-0 shadow-none text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1.5 after:absolute after:bottom-0 after:inset-x-0 after:h-0.5 after:bg-blue-500 after:scale-x-0 data-[state=active]:after:scale-x-100 after:transition-transform"
                      >
                        <Route className="h-3.5 w-3.5" />
                        Circuito
                      </TabsTrigger>
                      <TabsTrigger
                        value="checklist"
                        className="relative h-10 px-4 rounded-none bg-transparent border-0 shadow-none text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1.5 after:absolute after:bottom-0 after:inset-x-0 after:h-0.5 after:bg-blue-500 after:scale-x-0 data-[state=active]:after:scale-x-100 after:transition-transform"
                      >
                        <ClipboardCheck className="h-3.5 w-3.5" />
                        Checklist
                        {((selectedProduct as any).nomadTests || []).filter(
                          (t: any) => t.qualificationChecklist,
                        ).length > 0 && (
                          <span className="ml-0.5 h-4 min-w-4 px-1 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400 text-[10px] font-bold flex items-center justify-center">
                            {
                              (
                                (selectedProduct as any).nomadTests || []
                              ).filter((t: any) => t.qualificationChecklist)
                                .length
                            }
                          </span>
                        )}
                      </TabsTrigger>
                      <TabsTrigger
                        value="apresentacao"
                        className="relative h-10 px-4 rounded-none bg-transparent border-0 shadow-none text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1.5 after:absolute after:bottom-0 after:inset-x-0 after:h-0.5 after:bg-blue-500 after:scale-x-0 data-[state=active]:after:scale-x-100 after:transition-transform"
                      >
                        <LayoutTemplate className="h-3.5 w-3.5" />
                        Apresentação
                        {(selectedProduct as any).presentation ? (
                          <span className="ml-0.5 h-4 min-w-4 px-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold flex items-center justify-center">
                            ✓
                          </span>
                        ) : (
                          <span className="ml-0.5 h-4 min-w-4 px-1 rounded-full bg-slate-100 text-slate-400 text-[10px] font-bold flex items-center justify-center">
                            !
                          </span>
                        )}
                      </TabsTrigger>
                      <TabsTrigger
                        value="nomades-habilitados"
                        className="relative h-10 px-4 rounded-none bg-transparent border-0 shadow-none text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1.5 after:absolute after:bottom-0 after:inset-x-0 after:h-0.5 after:bg-blue-500 after:scale-x-0 data-[state=active]:after:scale-x-100 after:transition-transform"
                      >
                        <Users className="h-3.5 w-3.5" />
                        Nômades e Desempenho
                      </TabsTrigger>
                    </TabsList>
                  </div>
                  <div className="p-5">
                    {/* ── VISÃO GERAL ── */}
                    <TabsContent value="overview" className="space-y-4 mt-0">
                      {/* ── Image + gallery (side by side) + metrics ── */}
                      <div className="flex gap-3">
                        {/* Left: square main image */}
                        <div
                          className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm bg-gradient-to-br from-blue-500 to-violet-600 shrink-0"
                          style={{ width: 160, height: 160 }}
                        >
                          <img
                            src={
                              selectedProduct.productImagePreview ||
                              (selectedProduct as any).image ||
                              ""
                            }
                            alt={selectedProduct.name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                          {/* Status pill */}
                          <div className="absolute top-2 left-2">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold backdrop-blur-sm ${selectedProduct.isActive ? "bg-emerald-500/90 text-white" : "bg-red-500/90 text-white"}`}
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-white/80 inline-block" />
                              {selectedProduct.isActive ? "Ativo" : "Inativo"}
                            </span>
                          </div>
                          {/* Price overlay bottom */}
                          <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5">
                            <p className="text-white font-bold text-xs drop-shadow">
                              {formatCurrency(selectedProduct.finalPrice || 0)}
                            </p>
                          </div>
                        </div>

                        {/* Right: gallery thumbnails (vertical) + metrics */}
                        <div className="flex-1 flex flex-col gap-2 min-w-0">
                          {/* Gallery column — real portfolio images */}
                          <div className="flex gap-1.5 flex-wrap">
                            {(() => {
                              const coverUrl =
                                selectedProduct.productImagePreview ||
                                (selectedProduct as any).image ||
                                "";
                              const portfolioUrls: string[] = (
                                (selectedProduct as any).portfolioImages || []
                              )
                                .map((img: any) => img.url)
                                .filter(Boolean);
                              const demoUrls: string[] = (
                                (selectedProduct as any).demonstrations || []
                              ).filter(Boolean);
                              const allUrls =
                                portfolioUrls.length > 0
                                  ? portfolioUrls
                                  : demoUrls.length > 0
                                    ? demoUrls
                                    : coverUrl
                                      ? [coverUrl]
                                      : [];
                              const displayUrls = allUrls.slice(0, 4);
                              return displayUrls.map((url, i) => (
                                <div
                                  key={i}
                                  className={`shrink-0 h-[44px] w-[44px] rounded-lg overflow-hidden shadow-sm cursor-pointer transition-all ${i === 0 ? "border-2 border-blue-500" : "border border-slate-200 dark:border-slate-700 hover:border-blue-400 opacity-80 hover:opacity-100"}`}
                                >
                                  <img
                                    src={url}
                                    alt={`Imagem ${i + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ));
                            })()}
                            <button
                              onClick={() => {
                                setIsViewSheetOpen(false);
                                handleEditProduct(selectedProduct);
                              }}
                              className="shrink-0 h-[44px] w-[44px] rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 flex flex-col items-center justify-center gap-0.5 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-colors text-slate-400 hover:text-blue-500"
                              title="Gerenciar imagens"
                            >
                              <ImageIcon className="h-3.5 w-3.5" />
                              <span className="text-[9px] font-medium leading-none">
                                + foto
                              </span>
                            </button>
                          </div>

                          {/* Compact metrics */}
                          <div className="grid grid-cols-3 gap-1.5 flex-1">
                            <div className="border rounded-lg p-2 text-center bg-slate-50/80 dark:bg-slate-800/50 flex flex-col justify-center">
                              <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
                                Preço
                              </p>
                              <p className="font-bold text-emerald-600 text-xs leading-tight">
                                {formatCurrency(
                                  selectedProduct.finalPrice || 0,
                                )}
                              </p>
                            </div>
                            <div className="border rounded-lg p-2 text-center bg-slate-50/80 dark:bg-slate-800/50 flex flex-col justify-center">
                              <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
                                Recorrência
                              </p>
                              <p className="font-semibold text-xs leading-tight">
                                {selectedProduct.recurrence || "—"}
                              </p>
                            </div>
                            <div className="border rounded-lg p-2 text-center bg-slate-50/80 dark:bg-slate-800/50 flex flex-col justify-center">
                              <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
                                Prazo
                              </p>
                              <p className="font-semibold text-xs leading-tight">
                                {selectedProduct.deliveryDays
                                  ? `${selectedProduct.deliveryDays}d`
                                  : "—"}
                              </p>
                            </div>
                          </div>

                          {/* Category + tags inline */}
                          <div className="flex flex-wrap gap-1">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              {selectedProduct.category}
                            </span>
                            {(selectedProduct.tags || [])
                              .slice(0, 3)
                              .map((tag) => (
                                <span
                                  key={tag}
                                  className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                                >
                                  {tag}
                                </span>
                              ))}
                          </div>
                        </div>
                      </div>

                      {/* Summary description */}
                      {selectedProduct.summaryDescription && (
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Descrição
                          </p>
                          <p className="text-sm text-foreground leading-relaxed">
                            {selectedProduct.summaryDescription}
                          </p>
                        </div>
                      )}

                      {/* Benefits */}
                      {selectedProduct.benefits && (
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Benefícios
                          </p>
                          <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                            {selectedProduct.benefits}
                          </p>
                        </div>
                      )}

                      {/* Subcategories */}
                      {(selectedProduct.subcategories || []).length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Subcategorias
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {(selectedProduct.subcategories || []).map(
                              (sub) => (
                                <Badge
                                  key={sub}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {sub}
                                </Badge>
                              ),
                            )}
                          </div>
                        </div>
                      )}

                      {/* Included / Not included */}
                      <div className="grid grid-cols-2 gap-3">
                        {(selectedProduct.includedItems || []).length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              Incluso
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {(selectedProduct.includedItems || []).map(
                                (item, i) => (
                                  <Badge
                                    key={i}
                                    className="text-xs bg-emerald-100 text-emerald-800 border-0"
                                  >
                                    {item}
                                  </Badge>
                                ),
                              )}
                            </div>
                          </div>
                        )}
                        {(selectedProduct.notIncludedItems || []).length >
                          0 && (
                          <div className="space-y-1.5">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              Não incluso
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {(selectedProduct.notIncludedItems || []).map(
                                (item, i) => (
                                  <Badge
                                    key={i}
                                    className="text-xs bg-red-100 text-red-800 border-0"
                                  >
                                    {item}
                                  </Badge>
                                ),
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Request attention */}
                      {selectedProduct.requestAttention && (
                        <div className="border border-amber-200 bg-amber-50 dark:bg-amber-950/20 rounded-xl p-4">
                          <p className="text-xs font-semibold text-amber-700 mb-1 uppercase tracking-wide">
                            O que solicitar ao cliente
                          </p>
                          <p className="text-sm text-amber-900 dark:text-amber-200 leading-relaxed whitespace-pre-line">
                            {selectedProduct.requestAttention}
                          </p>
                        </div>
                      )}
                    </TabsContent>

                    {/* ── TAREFAS ── */}
                    <TabsContent value="tasks" className="space-y-3 mt-3">
                      {(selectedProduct.tasks || []).length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                          <Layers className="h-10 w-10 text-muted-foreground/40 mb-3" />
                          <p className="text-sm text-muted-foreground">
                            Nenhuma tarefa cadastrada para este produto.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {[...(selectedProduct.tasks || [])]
                            .sort((a, b) => (a.order || 0) - (b.order || 0))
                            .map((task, idx) => (
                              <div
                                key={task.id}
                                className="border rounded-xl overflow-hidden"
                              >
                                <div className="flex items-start gap-3 px-4 py-3 bg-muted/30">
                                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-xs shrink-0 mt-0.5">
                                    {task.order || idx + 1}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="font-semibold text-sm">
                                        {task.name}
                                      </p>
                                      <Badge
                                        variant={
                                          task.canRunInParallel
                                            ? "outline"
                                            : "secondary"
                                        }
                                        className="text-xs"
                                      >
                                        {task.canRunInParallel
                                          ? "Paralela"
                                          : "Sequencial"}
                                      </Badge>
                                      {(task.dependencies || []).length > 0 && (
                                        <Badge
                                          className={`text-xs ${getDependencyBadgeColor(task.dependencies)}`}
                                        >
                                          {task.dependencies.length} dep.
                                        </Badge>
                                      )}
                                      <span className="text-xs font-semibold text-emerald-600 ml-auto">
                                        {formatCurrency(task.calculatedCost)}
                                      </span>
                                    </div>
                                    {task.description && (
                                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                        {task.description}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                {(task.steps || []).length > 0 && (
                                  <div className="divide-y px-4">
                                    {(task.steps || []).map((step) => {
                                      const specialty = specialties.find(
                                        (s) => s.id === step.specialty,
                                      );
                                      return (
                                        <div
                                          key={step.id}
                                          className="flex items-center justify-between py-2.5 text-xs"
                                        >
                                          <div className="flex items-center gap-2 flex-1 min-w-0 mr-3">
                                            <span className="text-muted-foreground w-4 shrink-0">
                                              {step.order}.
                                            </span>
                                            <span className="truncate">
                                              {step.name}
                                            </span>
                                            {specialty && (
                                              <Badge
                                                variant="outline"
                                                className="text-xs shrink-0"
                                              >
                                                {specialty.name}
                                              </Badge>
                                            )}
                                            {step.experienceLevel && (
                                              <Badge
                                                variant="secondary"
                                                className="text-xs shrink-0"
                                              >
                                                {step.experienceLevel}
                                              </Badge>
                                            )}
                                          </div>
                                          <span className="text-muted-foreground shrink-0">
                                            {step.estimatedHours}h
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            ))}
                        </div>
                      )}
                    </TabsContent>

                    {/* ── PREÇOS ── */}
                    <TabsContent value="pricing" className="space-y-4 mt-3">
                      {/* Variations */}
                      {(selectedProduct.variations || []).length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Variações
                          </p>
                          <div className="border rounded-xl overflow-hidden divide-y">
                            <div className="grid grid-cols-3 px-4 py-2 bg-muted/40 text-xs font-semibold text-muted-foreground">
                              <span>Variação</span>
                              <span className="text-center">Prazo</span>
                              <span className="text-right">Preço</span>
                            </div>
                            {(selectedProduct.variations || []).map((v) => (
                              <div
                                key={v.id}
                                className="grid grid-cols-3 px-4 py-2.5 text-sm"
                              >
                                <span>{v.name || "—"}</span>
                                <span className="text-center text-muted-foreground">
                                  {v.deadlineDays ? `${v.deadlineDays}d` : "—"}
                                </span>
                                <span className="text-right font-semibold text-emerald-600">
                                  {formatCurrency(v.price)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Add-ons — creative_type */}
                      {(selectedProduct.addOns || []).filter(
                        (a) => a.category === "creative_type",
                      ).length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Add-ons · Tipo Criativo
                          </p>
                          <div className="border rounded-xl overflow-hidden divide-y">
                            {(selectedProduct.addOns || [])
                              .filter((a) => a.category === "creative_type")
                              .map((addon) => (
                                <div
                                  key={addon.id}
                                  className="flex items-center justify-between px-4 py-2.5 text-sm"
                                >
                                  <span>{addon.name}</span>
                                  <span className="font-semibold text-emerald-600">
                                    {formatCurrency(addon.price)}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Add-ons — extra */}
                      {(selectedProduct.addOns || []).filter(
                        (a) => a.category === "extra",
                      ).length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Add-ons · Extra
                          </p>
                          <div className="border rounded-xl overflow-hidden divide-y">
                            {(selectedProduct.addOns || [])
                              .filter((a) => a.category === "extra")
                              .map((addon) => (
                                <div
                                  key={addon.id}
                                  className="flex items-center justify-between px-4 py-2.5 text-sm"
                                >
                                  <span>{addon.name}</span>
                                  <span className="font-semibold text-emerald-600">
                                    {formatCurrency(addon.price)}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {(selectedProduct.variations || []).length === 0 &&
                        (selectedProduct.addOns || []).length === 0 && (
                          <div className="flex flex-col items-center justify-center py-16 text-center">
                            <DollarSign className="h-10 w-10 text-muted-foreground/40 mb-3" />
                            <p className="text-sm text-muted-foreground">
                              Nenhuma variação ou add-on cadastrado.
                            </p>
                          </div>
                        )}
                    </TabsContent>

                    {/* ── QUESTIONÁRIO ── */}
                    <TabsContent
                      value="questionnaire"
                      className="space-y-3 mt-3"
                    >
                      {(() => {
                        const questionnaire = (selectedProduct as any)
                          .questionnaire;
                        const questions: any[] =
                          questionnaire?.questions ||
                          (selectedProduct as any).questions ||
                          [];

                        if (questions.length === 0) {
                          return (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                              <FileQuestion className="h-10 w-10 text-muted-foreground/40 mb-3" />
                              <p className="text-sm font-medium text-muted-foreground">
                                Nenhuma pergunta cadastrada neste questionário.
                              </p>
                              <p className="text-xs text-muted-foreground/70 mt-1">
                                O questionário de briefing é preenchido pelo
                                cliente no momento da contratação.
                              </p>
                            </div>
                          );
                        }

                        // ── Cabeçalho do questionário (metadados) ─────────────────
                        const header = questionnaire && (
                          <div className="rounded-xl border bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border-purple-100 dark:border-purple-800/30 p-4 space-y-2">
                            <div className="flex items-start gap-3">
                              <div className="h-8 w-8 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center shrink-0">
                                <FileQuestion className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm">
                                  {questionnaire.title}
                                </p>
                                {questionnaire.description && (
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {questionnaire.description}
                                  </p>
                                )}
                              </div>
                              <div className="flex flex-col items-end gap-1 shrink-0">
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-700">
                                  {questions.length} perguntas
                                </span>
                                {questionnaire.briefingTitle && (
                                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-700 flex items-center gap-1">
                                    <Sparkles className="h-3 w-3" />
                                    AI-ready
                                  </span>
                                )}
                              </div>
                            </div>
                            {questionnaire.briefingInstructions && (
                              <div className="flex items-start gap-2 text-xs text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-700 rounded-lg px-3 py-2 mt-1">
                                <Sparkles className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                <span>
                                  <strong>Instrução IA:</strong>{" "}
                                  {questionnaire.briefingInstructions}
                                </span>
                              </div>
                            )}
                          </div>
                        );

                        // ── Agrupar por seção ──────────────────────────────────────
                        const sections: Record<string, any[]> = {};
                        const NO_SECTION = "__geral__";
                        for (const q of questions) {
                          const key = q.section || NO_SECTION;
                          if (!sections[key]) sections[key] = [];
                          sections[key].push(q);
                        }
                        const sectionKeys = Object.keys(sections);
                        const hasMultipleSections = sectionKeys.some(
                          (k) => k !== NO_SECTION,
                        );

                        let globalIndex = 0;

                        return (
                          <div className="space-y-4">
                            {header}

                            {sectionKeys.map((sectionKey) => {
                              const sectionQuestions = sections[sectionKey];
                              return (
                                <div key={sectionKey} className="space-y-2">
                                  {/* Cabeçalho da seção */}
                                  {hasMultipleSections &&
                                    sectionKey !== NO_SECTION && (
                                      <div className="flex items-center gap-2 pt-1">
                                        <div className="h-px flex-1 bg-border" />
                                        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2">
                                          {sectionKey}
                                        </span>
                                        <div className="h-px flex-1 bg-border" />
                                      </div>
                                    )}

                                  {/* Perguntas da seção */}
                                  {sectionQuestions.map((question: any) => {
                                    globalIndex += 1;
                                    const idx = globalIndex;
                                    const TYPE_LABELS: Record<string, string> =
                                      {
                                        text: "Texto curto",
                                        multiline: "Texto longo",
                                        select: "Seleção única",
                                        multiselect: "Múltipla escolha",
                                        file: "Upload de arquivo",
                                      };
                                    return (
                                      <div
                                        key={question.id}
                                        className="border rounded-xl overflow-hidden"
                                      >
                                        {/* Linha principal */}
                                        <div className="flex items-start gap-3 p-4">
                                          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400 text-xs font-bold shrink-0 mt-0.5">
                                            {idx}
                                          </span>
                                          <div className="flex-1 min-w-0 space-y-2">
                                            {/* Texto da pergunta + obrigatória */}
                                            <div className="flex items-start justify-between gap-2">
                                              <p className="font-medium text-sm">
                                                {question.question}
                                              </p>
                                              {question.required && (
                                                <Badge
                                                  variant="destructive"
                                                  className="text-[10px] shrink-0"
                                                >
                                                  Obrigatória
                                                </Badge>
                                              )}
                                            </div>

                                            {/* Hint / placeholder */}
                                            {question.placeholder && (
                                              <p className="text-xs text-muted-foreground/80 italic">
                                                Ex: {question.placeholder}
                                              </p>
                                            )}

                                            {/* Badges: tipo + AI assistida + briefingKey */}
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                              <Badge
                                                variant="outline"
                                                className="text-[10px] px-1.5"
                                              >
                                                {TYPE_LABELS[question.type] ??
                                                  question.type}
                                              </Badge>
                                              {question.aiAssisted && (
                                                <Badge className="text-[10px] px-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
                                                  <Sparkles className="h-2.5 w-2.5 mr-1" />
                                                  IA Assistida
                                                </Badge>
                                              )}
                                              {question.briefingKey && (
                                                <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                                  {question.briefingKey}
                                                </span>
                                              )}
                                            </div>

                                            {/* Warning */}
                                            {question.warning && (
                                              <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2">
                                                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                                <span>{question.warning}</span>
                                              </div>
                                            )}

                                            {/* aiContext (info sutil para admins) */}
                                            {question.aiContext && (
                                              <div className="flex items-start gap-2 text-[11px] text-blue-600 dark:text-blue-400">
                                                <Info className="h-3 w-3 shrink-0 mt-0.5" />
                                                <span className="text-muted-foreground">
                                                  {question.aiContext}
                                                </span>
                                              </div>
                                            )}

                                            {/* Opções */}
                                            {(question.options || []).length >
                                              0 && (
                                              <div className="pl-3 border-l-2 border-muted space-y-1">
                                                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
                                                  Opções:
                                                </p>
                                                {(question.options || []).map(
                                                  (
                                                    option: string,
                                                    optIdx: number,
                                                  ) => (
                                                    <div
                                                      key={optIdx}
                                                      className="flex items-center gap-2 text-xs"
                                                    >
                                                      <CheckCircle2 className="h-3 w-3 text-muted-foreground shrink-0" />
                                                      <span>{option}</span>
                                                    </div>
                                                  ),
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </TabsContent>

                    {/* ── TESTES DOS NÔMADES ── */}
                    <TabsContent value="nomad-tests" className="space-y-4 mt-3">
                      {(() => {
                        const nomadTests =
                          (selectedProduct as any).nomadTests || [];
                        if (nomadTests.length === 0) {
                          return (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                              <FlaskConical className="h-10 w-10 text-muted-foreground/40 mb-3" />
                              <p className="text-sm font-medium text-muted-foreground">
                                Nenhum teste cadastrado.
                              </p>
                              <p className="text-xs text-muted-foreground/70 mt-1">
                                Adicione testes práticos para habilitar nômades
                                neste produto.
                              </p>
                            </div>
                          );
                        }

                        // Agrupar testes por tarefa vinculada
                        const grouped: Record<
                          string,
                          { taskName: string; tests: any[] }
                        > = {};
                        for (const t of nomadTests) {
                          const key = t.linkedTaskId || "geral";
                          if (!grouped[key])
                            grouped[key] = {
                              taskName: t.linkedTaskName || key,
                              tests: [],
                            };
                          grouped[key].tests.push(t);
                        }

                        return (
                          <div className="space-y-6">
                            {Object.entries(grouped).map(([taskId, group]) => (
                              <div key={taskId} className="space-y-3">
                                {/* Cabeçalho do grupo */}
                                <div className="flex items-center gap-2">
                                  <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide px-2">
                                    {group.taskName}
                                  </span>
                                  <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                                </div>

                                {group.tests.map((test: any) => (
                                  <div
                                    key={test.id}
                                    className="border rounded-xl overflow-hidden"
                                  >
                                    {/* Cabeçalho do teste */}
                                    <div className="flex items-start gap-3 p-4 bg-muted/30">
                                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 shrink-0">
                                        <FlaskConical className="h-4 w-4" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="text-[10px] font-mono text-muted-foreground">
                                            {test.code}
                                          </span>
                                          <span
                                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                              test.isActive
                                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                                                : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                                            }`}
                                          >
                                            <span
                                              className={`h-1.5 w-1.5 rounded-full inline-block ${test.isActive ? "bg-emerald-500" : "bg-slate-400"}`}
                                            />
                                            {test.isActive
                                              ? "Ativo"
                                              : "Inativo"}
                                          </span>
                                        </div>
                                        <p className="font-semibold text-sm mt-0.5">
                                          {test.name}
                                        </p>
                                        {test.description && (
                                          <p className="text-xs text-muted-foreground mt-0.5">
                                            {test.description}
                                          </p>
                                        )}
                                        {/* Métricas */}
                                        <div className="flex items-center gap-3 mt-2 flex-wrap text-xs text-muted-foreground">
                                          <span className="flex items-center gap-1">
                                            <Trophy className="h-3 w-3 text-amber-500" />
                                            Aprovação:{" "}
                                            <strong className="text-foreground">
                                              {test.passingScore}%
                                            </strong>
                                          </span>
                                          {test.timeLimit && (
                                            <span className="flex items-center gap-1">
                                              <Clock className="h-3 w-3" />
                                              Limite:{" "}
                                              <strong className="text-foreground">
                                                {test.timeLimit} min
                                              </strong>
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Briefing fake */}
                                    {(test.fakeClientName ||
                                      test.fakeObjective) && (
                                      <div className="px-4 py-3 border-t bg-amber-50/60 dark:bg-amber-950/20 space-y-2">
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                                          Briefing do Teste (dados fictícios)
                                        </p>
                                        {test.fakeClientName && (
                                          <div className="flex gap-1.5 text-xs">
                                            <span className="text-muted-foreground shrink-0">
                                              Cliente:
                                            </span>
                                            <span className="font-medium">
                                              {test.fakeClientName}
                                            </span>
                                          </div>
                                        )}
                                        {test.fakeObjective && (
                                          <div className="flex gap-1.5 text-xs">
                                            <span className="text-muted-foreground shrink-0">
                                              Objetivo:
                                            </span>
                                            <span>{test.fakeObjective}</span>
                                          </div>
                                        )}
                                        {test.fakeContext && (
                                          <div className="flex gap-1.5 text-xs">
                                            <span className="text-muted-foreground shrink-0">
                                              Contexto:
                                            </span>
                                            <span>{test.fakeContext}</span>
                                          </div>
                                        )}
                                        {(test.fakeDeliverables || []).length >
                                          0 && (
                                          <div className="text-xs">
                                            <span className="text-muted-foreground">
                                              Entregáveis esperados:
                                            </span>
                                            <ul className="mt-1 space-y-0.5 pl-3">
                                              {test.fakeDeliverables.map(
                                                (d: string, i: number) => (
                                                  <li
                                                    key={i}
                                                    className="flex items-start gap-1.5"
                                                  >
                                                    <span className="text-amber-500 shrink-0 mt-0.5">
                                                      ·
                                                    </span>
                                                    <span>{d}</span>
                                                  </li>
                                                ),
                                              )}
                                            </ul>
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {/* Critérios de avaliação */}
                                    {(test.evaluationCriteria || []).length >
                                      0 && (
                                      <div className="px-4 py-3 border-t space-y-1.5">
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                          Critérios de Avaliação
                                        </p>
                                        {test.evaluationCriteria.map(
                                          (c: string, i: number) => (
                                            <div
                                              key={i}
                                              className="flex items-start gap-2 text-xs"
                                            >
                                              <ShieldCheck className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
                                              <span>{c}</span>
                                            </div>
                                          ),
                                        )}
                                      </div>
                                    )}

                                    {/* Habilitar Outras Tarefas */}
                                    {(test.enablesAdditionalTasks || [])
                                      .length > 0 && (
                                      <div className="px-4 py-3 border-t bg-emerald-50/50 dark:bg-emerald-950/20 space-y-2">
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                                          <Link2 className="h-3 w-3" />
                                          Habilita Outras Tarefas ao Passar
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                          {test.enablesAdditionalTasks.map(
                                            (ref: any) => (
                                              <span
                                                key={ref.taskId}
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-xs font-medium border border-emerald-200 dark:border-emerald-700"
                                              >
                                                <CheckCircle2 className="h-3 w-3" />
                                                {ref.taskName}
                                              </span>
                                            ),
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ))}

                            {/* CTA para novo teste */}
                            <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-sm text-muted-foreground hover:border-violet-400 hover:text-violet-600 dark:hover:border-violet-500 dark:hover:text-violet-400 transition-colors">
                              <Plus className="h-4 w-4" />
                              Adicionar Novo Teste
                            </button>
                          </div>
                        );
                      })()}
                    </TabsContent>

                    {/* ── CIRCUITO PRÉ-HABILITAÇÃO ── */}
                    <TabsContent value="circuito" className="space-y-4 mt-3">
                      {(() => {
                        const nomadTests = (
                          (selectedProduct as any).nomadTests || []
                        ).filter((t: any) => t.preCircuit);
                        const allTests =
                          (selectedProduct as any).nomadTests || [];

                        if (allTests.length === 0) {
                          return (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                              <Route className="h-10 w-10 text-muted-foreground/40 mb-3" />
                              <p className="text-sm font-medium text-muted-foreground">
                                Nenhum teste cadastrado.
                              </p>
                              <p className="text-xs text-muted-foreground/70 mt-1">
                                Cadastre testes na aba "Testes" para configurar
                                os circuitos.
                              </p>
                            </div>
                          );
                        }

                        if (nomadTests.length === 0) {
                          return (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                              <Route className="h-10 w-10 text-muted-foreground/40 mb-3" />
                              <p className="text-sm font-medium text-muted-foreground">
                                Nenhum circuito configurado.
                              </p>
                              <p className="text-xs text-muted-foreground/70 mt-1">
                                {allTests.length} teste(s) cadastrado(s), mas
                                sem conteúdo de circuito definido.
                              </p>
                            </div>
                          );
                        }

                        const STEP_DEFS = [
                          {
                            key: "welcome",
                            label: "Boas-vindas",
                            Icon: PartyPopper,
                            color: "text-violet-600",
                            bg: "bg-violet-100 dark:bg-violet-900/40",
                          },
                          {
                            key: "about",
                            label: "Sobre o Teste",
                            Icon: BookOpen,
                            color: "text-blue-600",
                            bg: "bg-blue-100 dark:bg-blue-900/40",
                          },
                          {
                            key: "video",
                            label: "Vídeo",
                            Icon: PlayCircle,
                            color: "text-red-600",
                            bg: "bg-red-100 dark:bg-red-900/40",
                          },
                          {
                            key: "rules",
                            label: "Regras",
                            Icon: ListChecks,
                            color: "text-amber-600",
                            bg: "bg-amber-100 dark:bg-amber-900/40",
                          },
                          {
                            key: "confirm",
                            label: "Confirmar",
                            Icon: CheckCircle2,
                            color: "text-emerald-600",
                            bg: "bg-emerald-100 dark:bg-emerald-900/40",
                          },
                        ];

                        return (
                          <div className="space-y-6">
                            {nomadTests.map((test: any) => {
                              const pc = test.preCircuit;
                              const stepData = [
                                {
                                  key: "welcome",
                                  title: pc.welcomeTitle || "—",
                                  preview: pc.welcomeSubtitle,
                                  count: (pc.welcomeHighlights || []).length,
                                  unit: "destaques",
                                },
                                {
                                  key: "about",
                                  title: "Sobre o Teste",
                                  preview: pc.aboutDescription,
                                  count: (pc.aboutWhatToExpect || []).length,
                                  unit: "ações",
                                },
                                {
                                  key: "video",
                                  title: pc.videoTitle || "Vídeo",
                                  preview: pc.videoDescription,
                                  count: pc.videoUrl ? 1 : 0,
                                  unit: "vídeo",
                                },
                                {
                                  key: "rules",
                                  title: "Regras de Execução",
                                  preview: (pc.rules || [])[0],
                                  count: (pc.rules || []).length,
                                  unit: "regras",
                                },
                                {
                                  key: "confirm",
                                  title: "Confirmar Início",
                                  preview: null,
                                  count: (pc.confirmChecklist || []).length,
                                  unit: "itens",
                                },
                              ];
                              return (
                                <div
                                  key={test.id}
                                  className="rounded-xl border overflow-hidden"
                                >
                                  {/* Cabeçalho do teste */}
                                  <div className="flex items-start gap-3 p-4 bg-muted/30 border-b">
                                    <div className="h-8 w-8 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center shrink-0">
                                      <FlaskConical className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-semibold text-sm">
                                        {test.name}
                                      </p>
                                      <p className="text-xs text-muted-foreground mt-0.5">
                                        {test.linkedTaskName} · {test.code}
                                      </p>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="gap-1.5 text-xs shrink-0"
                                      onClick={() => {
                                        setSelectedCircuitTest(test);
                                        setIsCircuitPreviewOpen(true);
                                      }}
                                    >
                                      <EyePreview className="h-3.5 w-3.5" />
                                      Simular
                                    </Button>
                                  </div>

                                  {/* Stepper das 5 etapas */}
                                  <div className="divide-y">
                                    {STEP_DEFS.map((def, i) => {
                                      const sd = stepData[i];
                                      const Icon = def.Icon;
                                      return (
                                        <div
                                          key={def.key}
                                          className="flex items-start gap-3 px-4 py-3 hover:bg-muted/20 transition-colors"
                                        >
                                          {/* Número e ícone */}
                                          <div className="flex items-center gap-2 shrink-0 w-32">
                                            <span className="flex items-center justify-center h-5 w-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 text-[10px] font-bold">
                                              {i + 1}
                                            </span>
                                            <div
                                              className={`h-7 w-7 rounded-lg ${def.bg} flex items-center justify-center`}
                                            >
                                              <Icon
                                                className={`h-3.5 w-3.5 ${def.color}`}
                                              />
                                            </div>
                                            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                              {def.label}
                                            </span>
                                          </div>
                                          {/* Conteúdo resumido */}
                                          <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold truncate">
                                              {sd.title}
                                            </p>
                                            {sd.preview && (
                                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                                {sd.preview}
                                              </p>
                                            )}
                                          </div>
                                          {/* Badge de quantidade */}
                                          {sd.count > 0 && (
                                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground shrink-0">
                                              {sd.count} {sd.unit}
                                            </span>
                                          )}
                                          {def.key === "video" &&
                                            sd.count === 0 && (
                                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 shrink-0">
                                                sem vídeo
                                              </span>
                                            )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </TabsContent>

                    {/* ── CHECKLIST DE QUALIFICAÇÃO ── */}
                    <TabsContent value="checklist" className="space-y-4 mt-3">
                      {(() => {
                        const allTests =
                          (selectedProduct as any).nomadTests || [];
                        const testsWithCL = allTests.filter(
                          (t: any) => t.qualificationChecklist,
                        );
                        const testsWithout = allTests.filter(
                          (t: any) => !t.qualificationChecklist,
                        );

                        if (allTests.length === 0) {
                          return (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                              <ClipboardCheck className="h-10 w-10 text-muted-foreground/40 mb-3" />
                              <p className="text-sm font-medium text-muted-foreground">
                                Nenhum teste cadastrado.
                              </p>
                              <p className="text-xs text-muted-foreground/70 mt-1">
                                Cadastre testes na aba "Testes" para configurar
                                os checklists de qualificação.
                              </p>
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-6">
                            {/* Testes sem checklist configurado */}
                            {testsWithout.length > 0 && (
                              <div className="rounded-xl border border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/10 p-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                                    {testsWithout.length} teste(s) sem checklist
                                    configurado
                                  </p>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {testsWithout.map((t: any) => (
                                    <span
                                      key={t.id}
                                      className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700"
                                    >
                                      {t.code} · {t.name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Testes com checklist configurado */}
                            {testsWithCL.map((test: any) => {
                              const cl = test.qualificationChecklist;
                              const totalItems = cl.sections.reduce(
                                (a: number, s: any) => a + s.items.length,
                                0,
                              );
                              const requiredItems = cl.sections
                                .flatMap((s: any) => s.items)
                                .filter((i: any) => i.isRequired).length;

                              return (
                                <div
                                  key={test.id}
                                  className="rounded-xl border overflow-hidden"
                                >
                                  {/* Cabeçalho */}
                                  <div className="flex items-start gap-3 p-4 bg-muted/30 border-b">
                                    <div className="h-8 w-8 rounded-lg bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center shrink-0">
                                      <ClipboardCheck className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-semibold text-sm">
                                        {test.name}
                                      </p>
                                      <p className="text-xs text-muted-foreground mt-0.5">
                                        {test.code} · Checklist:{" "}
                                        {cl.sections.length} seções ·{" "}
                                        {totalItems} itens
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      {/* Badges de regras automáticas */}
                                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700">
                                        Mín {cl.passingScore}%
                                      </span>
                                      {cl.autoApproveAbove != null && (
                                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-700">
                                          Auto ≥{cl.autoApproveAbove}%
                                        </span>
                                      )}
                                      {requiredItems > 0 && (
                                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-700">
                                          {requiredItems} obrig.
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Seções e itens em modo read-only */}
                                  <div className="p-4">
                                    <ScrollArea className="max-h-[400px] pr-2">
                                      <QualificationChecklistPanel
                                        checklist={cl}
                                        readOnly={true}
                                      />
                                    </ScrollArea>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </TabsContent>

                    {/* ── APRESENTAÇÃO ── */}
                    <TabsContent
                      value="apresentacao"
                      className="space-y-4 mt-3"
                    >
                      {(() => {
                        const pres = (selectedProduct as any).presentation;
                        if (!pres) {
                          return (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                              <LayoutTemplate className="h-10 w-10 text-muted-foreground/40 mb-3" />
                              <p className="text-sm font-medium text-muted-foreground">
                                Apresentação pública não configurada.
                              </p>
                              <p className="text-xs text-muted-foreground/70 mt-1">
                                Adicione o campo{" "}
                                <code className="font-mono bg-muted px-1 rounded">
                                  presentation
                                </code>{" "}
                                no seed do produto para exibir informações no
                                catálogo.
                              </p>
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-5">
                            {/* Tagline */}
                            {pres.tagline && (
                              <div className="rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border border-blue-100 dark:border-blue-900/40 p-4">
                                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">
                                  Tagline
                                </p>
                                <p className="text-sm font-medium">
                                  {pres.tagline}
                                </p>
                              </div>
                            )}

                            {/* Highlights */}
                            {pres.highlights?.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                                  Destaques
                                </p>
                                <div className="space-y-1.5">
                                  {pres.highlights.map(
                                    (h: string, i: number) => (
                                      <div
                                        key={i}
                                        className="flex items-start gap-2 text-sm"
                                      >
                                        <span className="h-4 w-4 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                                          ✓
                                        </span>
                                        <span>{h}</span>
                                      </div>
                                    ),
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Para quem */}
                            {pres.targetAudience?.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                                  Para quem é
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {pres.targetAudience.map(
                                    (t: string, i: number) => (
                                      <span
                                        key={i}
                                        className="text-xs font-medium px-2.5 py-1 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-800"
                                      >
                                        {t}
                                      </span>
                                    ),
                                  )}
                                </div>
                              </div>
                            )}

                            {/* O que está incluído */}
                            {pres.whatIsIncluded?.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                                  O que está incluído
                                </p>
                                <div className="space-y-2">
                                  {pres.whatIsIncluded.map(
                                    (item: any, i: number) => (
                                      <div
                                        key={i}
                                        className="flex items-start gap-3 rounded-lg border p-3 bg-muted/20"
                                      >
                                        <span className="h-5 w-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                                          {i + 1}
                                        </span>
                                        <div>
                                          <p className="text-sm font-semibold">
                                            {item.title}
                                          </p>
                                          {item.description && (
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                              {item.description}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    ),
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Entregas */}
                            {pres.deliverables?.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                                  Entregas / Entregáveis
                                </p>
                                <div className="space-y-1">
                                  {pres.deliverables.map(
                                    (d: string, i: number) => (
                                      <div
                                        key={i}
                                        className="flex items-start gap-2 text-sm text-muted-foreground"
                                      >
                                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-teal-500 shrink-0" />
                                        {d}
                                      </div>
                                    ),
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Não incluído */}
                            {pres.notIncluded?.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                                  Não incluído
                                </p>
                                <div className="space-y-1">
                                  {pres.notIncluded.map(
                                    (d: string, i: number) => (
                                      <div
                                        key={i}
                                        className="flex items-start gap-2 text-sm text-muted-foreground"
                                      >
                                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />
                                        {d}
                                      </div>
                                    ),
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Pré-requisitos */}
                            {pres.requirements?.length > 0 && (
                              <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-4">
                                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-2">
                                  Pré-requisitos do cliente
                                </p>
                                <div className="space-y-1">
                                  {pres.requirements.map(
                                    (r: string, i: number) => (
                                      <div
                                        key={i}
                                        className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-300"
                                      >
                                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                                        {r}
                                      </div>
                                    ),
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Como contratar */}
                            {pres.howToRequest?.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                                  Como contratar ({pres.howToRequest.length}{" "}
                                  etapas)
                                </p>
                                <div className="space-y-2">
                                  {pres.howToRequest.map(
                                    (s: any, i: number) => (
                                      <div
                                        key={i}
                                        className="flex items-start gap-2.5 text-sm"
                                      >
                                        <span className="h-5 w-5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                                          {i + 1}
                                        </span>
                                        <div>
                                          <p className="font-medium">
                                            {s.step}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            {s.description}
                                          </p>
                                        </div>
                                      </div>
                                    ),
                                  )}
                                </div>
                              </div>
                            )}

                            {/* FAQ */}
                            {pres.faq?.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                                  FAQ ({pres.faq.length} perguntas)
                                </p>
                                <div className="space-y-2">
                                  {pres.faq.map((f: any, i: number) => (
                                    <div
                                      key={i}
                                      className="rounded-lg border p-3 bg-muted/10"
                                    >
                                      <p className="text-sm font-semibold">
                                        {f.question}
                                      </p>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {f.answer}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </TabsContent>
                  </div>
                </Tabs>
              </div>

              {/* Always-visible footer with product summary */}
              <div className="shrink-0 border-t bg-background">
                {/* Data strip */}
                <div className="flex items-center gap-2 px-5 py-2 border-b border-slate-100 dark:border-slate-800 flex-wrap">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      selectedProduct.isActive
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full inline-block ${
                        selectedProduct.isActive
                          ? "bg-emerald-500"
                          : "bg-red-500"
                      }`}
                    />
                    {selectedProduct.isActive ? "Ativo" : "Inativo"}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {selectedProduct.category}
                  </span>
                  <div className="h-3 w-px bg-slate-200 dark:bg-slate-700" />
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(selectedProduct.finalPrice || 0)}
                  </span>
                  {selectedProduct.recurrence && (
                    <>
                      <div className="h-3 w-px bg-slate-200 dark:bg-slate-700" />
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {selectedProduct.recurrence}
                      </span>
                    </>
                  )}
                  {selectedProduct.deliveryDays && (
                    <>
                      <div className="h-3 w-px bg-slate-200 dark:bg-slate-700" />
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {selectedProduct.deliveryDays} dias
                      </span>
                    </>
                  )}
                  {(selectedProduct.tasks || []).length > 0 && (
                    <>
                      <div className="h-3 w-px bg-slate-200 dark:bg-slate-700" />
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {(selectedProduct.tasks || []).length} tarefa
                        {(selectedProduct.tasks || []).length !== 1 ? "s" : ""}
                      </span>
                    </>
                  )}
                </div>
                {/* Action buttons */}
                <div className="flex items-center justify-between px-5 py-2.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsViewSheetOpen(false)}
                  >
                    Fechar
                  </Button>
                  <Button
                    size="sm"
                    className="btn-brand border-0"
                    onClick={() => {
                      setIsViewSheetOpen(false);
                      handleEditProduct(selectedProduct);
                    }}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Editar Produto
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Circuito Pré-Habilitação — Preview Admin */}
      <CircuitoPreHabilitacaoModal
        test={selectedCircuitTest}
        open={isCircuitPreviewOpen}
        onOpenChange={setIsCircuitPreviewOpen}
        previewMode={true}
      />

      {/* Sheet for creating/editing products */}
      <Sheet open={isProductSheetOpen} onOpenChange={setIsProductSheetOpen}>
        <SheetContent
          side="right"
          className="p-0 flex flex-col"
          style={{
            left: `${sidebarWidth}px`,
            width: `calc(100vw - ${sidebarWidth}px)`,
          }}
        >
          <ModalBrandHeader
            title={
              productFormData.name ||
              (selectedProduct ? "Editar Produto" : "Novo Produto")
            }
            subtitle={
              selectedProduct
                ? `Editando • ${productFormData.category || selectedProduct.category || ""}`
                : "Cadastro de novo produto"
            }
            icon={<Package />}
            onClose={() => setIsProductSheetOpen(false)}
          />

          <div className="flex-1 overflow-auto">
            <div className="p-6">
              <Tabs defaultValue="info" className="space-y-3">
                <div className="-mx-6 px-6 sticky top-0 z-10 bg-background border-b border-slate-200 dark:border-slate-700">
                  <TooltipProvider>
                    <TabsList className="w-full justify-start bg-transparent p-0 rounded-none gap-0 h-auto border-0 flex-wrap">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <TabsTrigger
                            value="info"
                            className="relative h-10 px-4 rounded-none bg-transparent border-0 shadow-none text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1.5 after:absolute after:bottom-0 after:inset-x-0 after:h-0.5 after:bg-blue-500 after:scale-x-0 data-[state=active]:after:scale-x-100 after:transition-transform"
                          >
                            <Package className="h-3.5 w-3.5" />
                            Informações
                          </TabsTrigger>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            Nome, ID, categoria, preço, imagem de capa e galeria
                          </p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <TabsTrigger
                            value="apresentacao"
                            className="relative h-10 px-4 rounded-none bg-transparent border-0 shadow-none text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1.5 after:absolute after:bottom-0 after:inset-x-0 after:h-0.5 after:bg-blue-500 after:scale-x-0 data-[state=active]:after:scale-x-100 after:transition-transform"
                          >
                            <ImageIcon className="h-3.5 w-3.5" />
                            Apresentação
                          </TabsTrigger>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            Vídeo, texto de apresentação, benefícios e
                            informações complementares
                          </p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <TabsTrigger
                            value="descricao"
                            className="relative h-10 px-4 rounded-none bg-transparent border-0 shadow-none text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1.5 after:absolute after:bottom-0 after:inset-x-0 after:h-0.5 after:bg-blue-500 after:scale-x-0 data-[state=active]:after:scale-x-100 after:transition-transform"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            Descrição
                          </TabsTrigger>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            Textos detalhados, resumo, atenções e itens
                            inclusos/excluídos
                          </p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <TabsTrigger
                            value="solicitar"
                            className="relative h-10 px-4 rounded-none bg-transparent border-0 shadow-none text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1.5 after:absolute after:bottom-0 after:inset-x-0 after:h-0.5 after:bg-blue-500 after:scale-x-0 data-[state=active]:after:scale-x-100 after:transition-transform"
                          >
                            <ListChecks className="h-3.5 w-3.5" />
                            Solicitação
                          </TabsTrigger>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            Briefing, contratos e o que solicitar ao cliente na
                            contratação
                          </p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <TabsTrigger
                            value="tarefas"
                            className="relative h-10 px-4 rounded-none bg-transparent border-0 shadow-none text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1.5 after:absolute after:bottom-0 after:inset-x-0 after:h-0.5 after:bg-blue-500 after:scale-x-0 data-[state=active]:after:scale-x-100 after:transition-transform"
                          >
                            <Layers className="h-3.5 w-3.5" />
                            Tarefas
                          </TabsTrigger>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            Tarefas e etapas de execução vinculadas a este
                            produto
                          </p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <TabsTrigger
                            value="customizacao"
                            className="relative h-10 px-4 rounded-none bg-transparent border-0 shadow-none text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1.5 after:absolute after:bottom-0 after:inset-x-0 after:h-0.5 after:bg-blue-500 after:scale-x-0 data-[state=active]:after:scale-x-100 after:transition-transform"
                          >
                            <SlidersHorizontal className="h-3.5 w-3.5" />
                            Opções
                          </TabsTrigger>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            Variações de escopo e add-ons disponíveis para este
                            produto
                          </p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <TabsTrigger
                            value="questionario"
                            className="relative h-10 px-4 rounded-none bg-transparent border-0 shadow-none text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1.5 after:absolute after:bottom-0 after:inset-x-0 after:h-0.5 after:bg-blue-500 after:scale-x-0 data-[state=active]:after:scale-x-100 after:transition-transform"
                          >
                            <FileQuestion className="h-3.5 w-3.5" />
                            Questionário
                          </TabsTrigger>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            Perguntas enviadas ao cliente ao contratar este
                            produto
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TabsList>
                  </TooltipProvider>
                </div>

                <TabsContent value="info" className="space-y-3 mt-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5 bg-card p-3 rounded-lg border">
                      <TooltipProvider>
                        <Label className="text-xs font-semibold flex items-center gap-1">
                          ID do Produto
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3 w-3 text-slate-400 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                Gerado automaticamente com base na categoria
                                escolhida
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </Label>
                      </TooltipProvider>
                      <Input
                        value={
                          productFormData.productId ||
                          selectedProduct?.id ||
                          `PROD-${Date.now().toString().slice(-6)}`
                        }
                        readOnly
                        className="text-xs bg-muted"
                      />
                    </div>

                    <div className="col-span-2 space-y-1.5 bg-card p-3 rounded-lg border">
                      <Label className="text-xs font-semibold">
                        Nome do Produto <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        placeholder="Ex: Pauta de Conteúdo com 20 temas"
                        value={productFormData.name}
                        onChange={(e) =>
                          setProductFormData({
                            ...productFormData,
                            name: e.target.value,
                          })
                        }
                        className="text-xs"
                      />
                    </div>
                  </div>

                  {/* ── Cover Image ── */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40">
                      <ImageIcon className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Imagem de Capa
                      </span>
                      <span className="text-[10px] text-slate-400 hidden sm:block">
                        · aparece no catálogo e nos cards de produto
                      </span>
                      {productFormData.productImagePreview && (
                        <button
                          type="button"
                          onClick={() =>
                            setProductFormData({
                              ...productFormData,
                              productImagePreview: "",
                            })
                          }
                          className="ml-auto flex items-center gap-1 text-[11px] font-medium text-red-500 hover:text-red-700 transition-colors px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30"
                        >
                          <X className="h-3 w-3" /> Remover
                        </button>
                      )}
                    </div>
                    <div className="bg-card">
                      {/* Large preview */}
                      <div className="relative w-full h-40 bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        {productFormData.productImagePreview ? (
                          <>
                            <img
                              src={productFormData.productImagePreview}
                              alt="Capa do produto"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display =
                                  "none";
                              }}
                            />
                            <div className="absolute inset-0 bg-linear-to-t from-black/30 via-transparent to-transparent pointer-events-none" />
                            <div className="absolute bottom-2 left-3">
                              <span className="text-[10px] font-semibold text-white/90 bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm">
                                Imagem de capa ativa
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                            <div className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg w-full h-full">
                              <ImageIcon className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                              <p className="text-xs text-slate-400 font-medium">
                                Nenhuma imagem de capa
                              </p>
                              <p className="text-[10px] text-slate-400">
                                Cole o caminho abaixo para visualizar
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                      {/* URL input */}
                      <div className="px-4 py-3 space-y-1.5 border-t border-slate-100 dark:border-slate-700/60">
                        <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                          Caminho / URL da imagem
                        </label>
                        <Input
                          placeholder="/images/products/meu-produto.svg ou https://…"
                          value={productFormData.productImagePreview}
                          onChange={(e) =>
                            setProductFormData({
                              ...productFormData,
                              productImagePreview: e.target.value,
                            })
                          }
                          className="text-xs h-8 font-mono"
                        />
                        <p className="text-[10px] text-muted-foreground">
                          Tamanho recomendado: <strong>800 × 500 px</strong> ·
                          formatos aceitos: JPG, PNG, SVG, WebP
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ── Portfolio / Gallery ── */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40">
                      <Grid3x3 className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Portfólio / Galeria
                      </span>
                      {portfolioImages.length > 0 && (
                        <span className="text-[10px] font-semibold text-violet-600 bg-violet-100 dark:bg-violet-900/40 px-1.5 py-0.5 rounded-full">
                          {portfolioImages.length}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 hidden sm:block">
                        · exibido no drawer de detalhes
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setPortfolioImages([
                            ...portfolioImages,
                            {
                              id: `img-${Date.now()}`,
                              url: "",
                              title: "",
                              description: "",
                              isMain: portfolioImages.length === 0,
                              sortOrder: portfolioImages.length,
                            },
                          ]);
                        }}
                        className="ml-auto flex items-center gap-1 text-[11px] font-medium text-violet-600 hover:text-violet-700 transition-colors px-2.5 py-1 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-950/30 border border-violet-200 dark:border-violet-800"
                      >
                        <Plus className="h-3 w-3" /> Adicionar
                      </button>
                    </div>

                    {portfolioImages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center px-4 bg-card">
                        <div className="h-14 w-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                          <Grid3x3 className="h-6 w-6 text-slate-300 dark:text-slate-600" />
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                          Nenhuma imagem no portfólio
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Adicione imagens para exibir na galeria do produto
                        </p>
                      </div>
                    ) : (
                      <div className="p-3 space-y-2 bg-card">
                        {/* Grid de thumbnails */}
                        <div className="grid grid-cols-3 gap-2">
                          {portfolioImages.map((img, idx) => (
                            <div
                              key={img.id}
                              className={`group relative rounded-xl overflow-hidden border-2 transition-all cursor-default ${
                                img.isMain
                                  ? "border-blue-500 shadow-md shadow-blue-100 dark:shadow-blue-900/20"
                                  : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                              }`}
                            >
                              {/* Thumbnail */}
                              <div className="h-24 bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                {img.url ? (
                                  <img
                                    src={img.url}
                                    alt={img.title || `Imagem ${idx + 1}`}
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    onError={(e) => {
                                      (
                                        e.target as HTMLImageElement
                                      ).style.display = "none";
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                                    <ImageIcon className="h-5 w-5 text-slate-300 dark:text-slate-600" />
                                    <span className="text-[9px] text-slate-400">
                                      sem URL
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Hover overlay — ações */}
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/55 transition-all duration-200 flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (idx === 0) return;
                                    const updated = [...portfolioImages];
                                    [updated[idx - 1], updated[idx]] = [
                                      updated[idx],
                                      updated[idx - 1],
                                    ];
                                    setPortfolioImages(
                                      updated.map((item, i) => ({
                                        ...item,
                                        sortOrder: i,
                                      })),
                                    );
                                  }}
                                  disabled={idx === 0}
                                  className="h-7 w-7 rounded-lg bg-white/90 text-slate-700 flex items-center justify-center text-xs font-bold hover:bg-white disabled:opacity-25 shadow-sm transition-colors"
                                  title="Mover para esquerda"
                                >
                                  ←
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPortfolioImages(
                                      portfolioImages.filter(
                                        (_, i) => i !== idx,
                                      ),
                                    )
                                  }
                                  className="h-7 w-7 rounded-lg bg-red-500 text-white flex items-center justify-center hover:bg-red-600 shadow-sm transition-colors"
                                  title="Remover"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (idx === portfolioImages.length - 1)
                                      return;
                                    const updated = [...portfolioImages];
                                    [updated[idx], updated[idx + 1]] = [
                                      updated[idx + 1],
                                      updated[idx],
                                    ];
                                    setPortfolioImages(
                                      updated.map((item, i) => ({
                                        ...item,
                                        sortOrder: i,
                                      })),
                                    );
                                  }}
                                  disabled={idx === portfolioImages.length - 1}
                                  className="h-7 w-7 rounded-lg bg-white/90 text-slate-700 flex items-center justify-center text-xs font-bold hover:bg-white disabled:opacity-25 shadow-sm transition-colors"
                                  title="Mover para direita"
                                >
                                  →
                                </button>
                              </div>

                              {/* Badges fixas */}
                              <div className="absolute top-1.5 left-1.5 pointer-events-none">
                                {img.isMain ? (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500 text-white shadow-sm">
                                    ★ Destaque
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-black/50 text-white backdrop-blur-sm">
                                    {idx + 1}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Separador */}
                        <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />

                        {/* Lista compacta de campos por imagem */}
                        <div className="space-y-2">
                          {portfolioImages.map((img, idx) => (
                            <div
                              key={img.id}
                              className={`rounded-lg border p-2.5 space-y-1.5 transition-all ${
                                img.isMain
                                  ? "border-blue-200 dark:border-blue-800/40 bg-blue-50/40 dark:bg-blue-950/10"
                                  : "border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/20"
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-semibold text-muted-foreground">
                                  Imagem {idx + 1}
                                  {img.isMain ? " · Destaque" : ""}
                                </span>
                                {!img.isMain && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPortfolioImages(
                                        portfolioImages.map((item, i) => ({
                                          ...item,
                                          isMain: i === idx,
                                        })),
                                      )
                                    }
                                    className="ml-auto text-[10px] font-medium text-blue-600 hover:text-blue-800 px-1.5 py-0.5 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                                  >
                                    Definir como destaque
                                  </button>
                                )}
                              </div>
                              <Input
                                placeholder="URL /images/products/… ou https://…"
                                value={img.url}
                                onChange={(e) => {
                                  const updated = [...portfolioImages];
                                  updated[idx] = {
                                    ...updated[idx],
                                    url: e.target.value,
                                  };
                                  setPortfolioImages(updated);
                                }}
                                className="text-[11px] h-7 px-2 font-mono"
                              />
                              <Input
                                placeholder="Título (opcional)"
                                value={img.title || ""}
                                onChange={(e) => {
                                  const updated = [...portfolioImages];
                                  updated[idx] = {
                                    ...updated[idx],
                                    title: e.target.value,
                                  };
                                  setPortfolioImages(updated);
                                }}
                                className="text-[11px] h-7 px-2"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── Classificação e Preço ── */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50/60 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-700">
                      <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Classificação e Preço
                      </span>
                    </div>
                    <div className="p-4 grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">
                          Categoria <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={productFormData.category}
                          onValueChange={(value) =>
                            setProductFormData({
                              ...productFormData,
                              category: value,
                            })
                          }
                        >
                          <SelectTrigger className="text-xs h-8">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Mídias e Conteúdo">
                              Mídias e Conteúdo
                            </SelectItem>
                            <SelectItem value="Design">Design</SelectItem>
                            <SelectItem value="Desenvolvimento">
                              Desenvolvimento
                            </SelectItem>
                            <SelectItem value="Marketing">Marketing</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <TooltipProvider>
                          <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            Recorrência
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3 w-3 text-slate-400 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  Avulso = cobrado por pedido · Mensal =
                                  assinatura
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </Label>
                        </TooltipProvider>
                        <Select
                          value={productFormData.recurrence}
                          onValueChange={(value) =>
                            setProductFormData({
                              ...productFormData,
                              recurrence: value,
                            })
                          }
                        >
                          <SelectTrigger className="text-xs h-8">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Avulso">Avulso</SelectItem>
                            <SelectItem value="Mensal">Mensal</SelectItem>
                            <SelectItem value="Avulso e Mensal">
                              Avulso e Mensal
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <TooltipProvider>
                          <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            Preço (Calculado){" "}
                            <span className="text-red-500">*</span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3 w-3 text-slate-400 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  Calculado automaticamente pelas tarefas. Use
                                  “Editar” para ajuste manual com senha.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </Label>
                        </TooltipProvider>
                        <div className="flex gap-2">
                          <Input
                            placeholder="R$ 0,00"
                            value={
                              productFormData.price ||
                              formatCurrency(calculateAutomaticPrice())
                            }
                            readOnly
                            className="text-xs h-8 bg-emerald-50 dark:bg-emerald-950/20 font-semibold text-emerald-700 dark:text-emerald-400"
                          />
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={handleEditPrice}
                                  className="h-8 px-2 bg-transparent shrink-0"
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  Editar preço manualmente (requer senha de
                                  administrador)
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <TooltipProvider>
                          <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            Dias de Entrega{" "}
                            <span className="text-red-500">*</span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3 w-3 text-slate-400 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  Prazo máximo de entrega em dias corridos após
                                  o início da execução
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </Label>
                        </TooltipProvider>
                        <Input
                          type="number"
                          placeholder="Ex: 5"
                          value={productFormData.deliveryDays}
                          onChange={(e) =>
                            setProductFormData({
                              ...productFormData,
                              deliveryDays: e.target.value,
                            })
                          }
                          className="text-xs h-8"
                          min="0"
                        />
                      </div>
                    </div>
                  </div>

                  {/* ── Tags & Subcategorias ── */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50/60 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-700">
                      <Filter className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Tags e Subcategorias
                      </span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3.5 w-3.5 text-slate-400 cursor-help ml-0.5" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              Ajudam na busca, filtragem e organização do
                              catálogo
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">
                          Tags
                        </Label>
                        <div className="flex flex-wrap gap-2 p-2 rounded-lg bg-muted/30 border border-slate-200 dark:border-slate-700 min-h-[36px]">
                          {productFormData.tags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="outline"
                              className="text-xs font-normal cursor-pointer group"
                            >
                              {tag}
                              <button
                                onClick={() => removeTag(tag)}
                                className="ml-1.5 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                          <Input
                            value={customTagInput}
                            onChange={(e) => setCustomTagInput(e.target.value)}
                            onKeyDown={handleTagInputKeyDown}
                            placeholder="Adicionar tag..."
                            className="h-6 w-auto text-xs border-0 bg-transparent flex-grow p-0 focus-visible:ring-0 shadow-none min-w-[100px]"
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Pressione Enter para adicionar.
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">
                          Subcategorias
                        </Label>
                        <div className="flex flex-wrap gap-2 p-2 rounded-lg bg-muted/30 border border-slate-200 dark:border-slate-700 min-h-[36px]">
                          {productFormData.subcategories.map((subcategory) => (
                            <Badge
                              key={subcategory}
                              variant="secondary"
                              className="text-xs font-normal cursor-pointer group"
                            >
                              {subcategory}
                              <button
                                onClick={() => toggleSubcategory(subcategory)}
                                className="ml-1.5 text-white/80 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-1 pt-1">
                          {availableSubcategories
                            .filter(
                              (sub) =>
                                !productFormData.subcategories.includes(sub),
                            )
                            .map((sub) => (
                              <Button
                                key={sub}
                                variant="outline"
                                size="sm"
                                onClick={() => toggleSubcategory(sub)}
                                className="text-xs h-7"
                              >
                                {sub}
                              </Button>
                            ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="apresentacao" className="space-y-3 mt-3">
                  {/* Mídia */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50/60 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-700">
                      <PlayCircle className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Mídia e Texto
                      </span>
                      <span className="text-[10px] text-slate-400 hidden sm:block">
                        · exibido na página do produto para o cliente
                      </span>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">
                          Vídeo de Apresentação (URL){" "}
                          <span className="text-red-500">*</span>
                        </Label>
                        <div className="flex items-center gap-2">
                          <Link className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <Input
                            placeholder="https://www.youtube.com/watch?v=..."
                            value={productFormData.deliveryVideoUrl}
                            onChange={(e) =>
                              setProductFormData({
                                ...productFormData,
                                deliveryVideoUrl: e.target.value,
                              })
                            }
                            className="text-xs"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">
                          Texto de Apresentação
                        </Label>
                        <Textarea
                          placeholder="Descreva o que o produto faz e seus principais benefícios."
                          value={productFormData.presentation}
                          onChange={(e) =>
                            setProductFormData({
                              ...productFormData,
                              presentation: e.target.value,
                            })
                          }
                          className="text-xs min-h-[100px]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Benefícios */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50/60 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-700">
                      <Trophy className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Benefícios e Informações
                      </span>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">
                          Benefícios Chave
                        </Label>
                        <Textarea
                          placeholder="Liste os principais benefícios do produto para o cliente."
                          value={productFormData.benefits}
                          onChange={(e) =>
                            setProductFormData({
                              ...productFormData,
                              benefits: e.target.value,
                            })
                          }
                          className="text-xs min-h-[100px]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">
                          Informações Adicionais
                        </Label>
                        <Textarea
                          placeholder="Informações técnicas ou de uso que não se encaixam em outras seções."
                          value={productFormData.information}
                          onChange={(e) =>
                            setProductFormData({
                              ...productFormData,
                              information: e.target.value,
                            })
                          }
                          className="text-xs min-h-[100px]"
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="descricao" className="space-y-3 mt-3">
                  {/* Textos */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50/60 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-700">
                      <FileText className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Textos de Descrição
                      </span>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">
                          Descrição Detalhada{" "}
                          <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                          placeholder="Uma descrição completa do produto, incluindo escopo, objetivos e o que o cliente receberá."
                          value={productFormData.description}
                          onChange={(e) =>
                            setProductFormData({
                              ...productFormData,
                              description: e.target.value,
                            })
                          }
                          className="text-xs min-h-[150px]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">
                          Resumo da Descrição
                        </Label>
                        <Textarea
                          placeholder="Um resumo conciso para listagens rápidas ou prévias."
                          value={productFormData.summaryDescription}
                          onChange={(e) =>
                            setProductFormData({
                              ...productFormData,
                              summaryDescription: e.target.value,
                            })
                          }
                          className="text-xs min-h-[80px]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                          <AlertTriangle className="h-3 w-3 text-amber-500" />
                          Atenção na Descrição
                        </Label>
                        <Textarea
                          placeholder="Qualquer informação importante que o cliente deve saber antes de comprar."
                          value={productFormData.descriptionAttention}
                          onChange={(e) =>
                            setProductFormData({
                              ...productFormData,
                              descriptionAttention: e.target.value,
                            })
                          }
                          className="text-xs min-h-[80px]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Itens */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50/60 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-700">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Itens Inclusos e Excluídos
                      </span>
                      <span className="text-[10px] text-slate-400 hidden sm:block">
                        · pressione Enter para adicionar
                      </span>
                    </div>
                    <div className="p-4 grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          ✓ Incluso
                        </Label>
                        <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 min-h-[40px]">
                          {productFormData.includedItems.map((item, index) => (
                            <Badge
                              key={index}
                              className="text-xs font-normal bg-emerald-100 text-emerald-800 border-0 cursor-pointer group"
                            >
                              {item}
                              <button
                                onClick={() =>
                                  setProductFormData({
                                    ...productFormData,
                                    includedItems:
                                      productFormData.includedItems.filter(
                                        (_, i) => i !== index,
                                      ),
                                  })
                                }
                                className="ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                          <Input
                            placeholder="Adicionar..."
                            onKeyDown={(e) => {
                              if (
                                e.key === "Enter" &&
                                e.currentTarget.value.trim()
                              ) {
                                e.preventDefault();
                                setProductFormData({
                                  ...productFormData,
                                  includedItems: [
                                    ...productFormData.includedItems,
                                    e.currentTarget.value.trim(),
                                  ],
                                });
                                e.currentTarget.value = "";
                              }
                            }}
                            className="h-6 w-auto text-xs border-0 bg-transparent flex-grow p-0 focus-visible:ring-0 shadow-none min-w-[80px]"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-red-500">
                          ✕ Não incluso
                        </Label>
                        <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40 min-h-[40px]">
                          {productFormData.notIncludedItems.map(
                            (item, index) => (
                              <Badge
                                key={index}
                                className="text-xs font-normal bg-red-100 text-red-800 border-0 cursor-pointer group"
                              >
                                {item}
                                <button
                                  onClick={() =>
                                    setProductFormData({
                                      ...productFormData,
                                      notIncludedItems:
                                        productFormData.notIncludedItems.filter(
                                          (_, i) => i !== index,
                                        ),
                                    })
                                  }
                                  className="ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ),
                          )}
                          <Input
                            placeholder="Adicionar..."
                            onKeyDown={(e) => {
                              if (
                                e.key === "Enter" &&
                                e.currentTarget.value.trim()
                              ) {
                                e.preventDefault();
                                setProductFormData({
                                  ...productFormData,
                                  notIncludedItems: [
                                    ...productFormData.notIncludedItems,
                                    e.currentTarget.value.trim(),
                                  ],
                                });
                                e.currentTarget.value = "";
                              }
                            }}
                            className="h-6 w-auto text-xs border-0 bg-transparent flex-grow p-0 focus-visible:ring-0 shadow-none min-w-[80px]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="solicitar" className="space-y-3 mt-3">
                  {/* Briefing */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50/60 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-700">
                      <ClipboardCheck className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Briefing do Cliente
                      </span>
                      <span className="text-[10px] text-slate-400 hidden sm:block">
                        · o que o cliente deve enviar ao contratar
                      </span>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">
                          O que solicitar para o cliente?
                        </Label>
                        <Textarea
                          placeholder="Ex: Arquivo com o logo em vetor, Briefing detalhado, etc."
                          value={productFormData.requestAttention}
                          onChange={(e) =>
                            setProductFormData({
                              ...productFormData,
                              requestAttention: e.target.value,
                            })
                          }
                          className="text-xs min-h-[100px]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">
                          Itens Excluídos
                        </Label>
                        <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-muted/30 border border-slate-200 dark:border-slate-700 min-h-[36px]">
                          {productFormData.excludedItems.map((item, index) => (
                            <Badge
                              key={index}
                              variant="outline"
                              className="text-xs font-normal cursor-pointer group"
                            >
                              {item}
                              <button
                                onClick={() =>
                                  setProductFormData({
                                    ...productFormData,
                                    excludedItems:
                                      productFormData.excludedItems.filter(
                                        (_, i) => i !== index,
                                      ),
                                  })
                                }
                                className="ml-1.5 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                          <Input
                            placeholder="Adicionar item excluído..."
                            onKeyDown={(e) => {
                              if (
                                e.key === "Enter" &&
                                e.currentTarget.value.trim()
                              ) {
                                e.preventDefault();
                                setProductFormData({
                                  ...productFormData,
                                  excludedItems: [
                                    ...productFormData.excludedItems,
                                    e.currentTarget.value.trim(),
                                  ],
                                });
                                e.currentTarget.value = "";
                              }
                            }}
                            className="h-6 w-auto text-xs border-0 bg-transparent flex-grow p-0 focus-visible:ring-0 shadow-none min-w-[100px]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contratos */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50/60 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-700">
                      <FileText className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Contratos e Termos
                      </span>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">
                          Contrato de Pagamento Único
                        </Label>
                        <Textarea
                          placeholder="Termos específicos para pagamentos únicos."
                          value={productFormData.oneTimeContract}
                          onChange={(e) =>
                            setProductFormData({
                              ...productFormData,
                              oneTimeContract: e.target.value,
                            })
                          }
                          className="text-xs min-h-[80px]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">
                          Contrato Mensal
                        </Label>
                        <Textarea
                          placeholder="Termos específicos para contratos mensais."
                          value={productFormData.monthlyContract}
                          onChange={(e) =>
                            setProductFormData({
                              ...productFormData,
                              monthlyContract: e.target.value,
                            })
                          }
                          className="text-xs min-h-[80px]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">
                          Contratos Anteriores
                        </Label>
                        <Textarea
                          placeholder="Informações sobre contratos prévios que este produto pode substituir ou complementar."
                          value={productFormData.previousContracts}
                          onChange={(e) =>
                            setProductFormData({
                              ...productFormData,
                              previousContracts: e.target.value,
                            })
                          }
                          className="text-xs min-h-[80px]"
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="tarefas" className="space-y-4 mt-3">
                  {/* ── Cabeçalho + Stats ── */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50/60 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-700">
                      <Layers className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Tarefas do Produto
                      </span>
                      {productFormData.tasks.length > 0 && (
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-100 dark:bg-blue-900/40 px-1.5 py-0.5 rounded-full">
                          {productFormData.tasks.length}
                        </span>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowImportTemplateModal(true)}
                        className="ml-auto gap-1 text-xs h-7 px-2.5 bg-transparent"
                      >
                        <FileText className="h-3 w-3" />
                        Importar Modelo
                      </Button>
                    </div>
                    {productFormData.tasks.length > 0 && (
                      <div className="grid grid-cols-3 divide-x divide-slate-100 dark:divide-slate-800 bg-card">
                        <div className="px-4 py-2.5 text-center">
                          <p className="text-base font-bold text-slate-700 dark:text-slate-200 leading-tight">
                            {productFormData.tasks.length}
                          </p>
                          <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">
                            Tarefas
                          </p>
                        </div>
                        <div className="px-4 py-2.5 text-center">
                          <p className="text-base font-bold text-slate-700 dark:text-slate-200 leading-tight">
                            {productFormData.tasks.reduce(
                              (s, t) => s + (t.steps || []).length,
                              0,
                            )}
                          </p>
                          <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">
                            Etapas
                          </p>
                        </div>
                        <div className="px-4 py-2.5 text-center">
                          <p className="text-sm font-bold text-emerald-600 leading-tight">
                            {formatCurrency(
                              productFormData.tasks.reduce(
                                (s, t) => s + (t.calculatedCost || 0),
                                0,
                              ),
                            )}
                          </p>
                          <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">
                            Custo Total
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── Estado vazio ── */}
                  {productFormData.tasks.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-900/20">
                      <Layers className="h-10 w-10 text-slate-200 dark:text-slate-700 mb-3" />
                      <p className="text-sm font-medium text-slate-500">
                        Nenhuma tarefa cadastrada
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Adicione tarefas ou importe de um modelo
                      </p>
                    </div>
                  )}

                  {/* ── Lista de Tarefas ── */}
                  <Accordion type="multiple" className="space-y-2">
                    {productFormData.tasks.map((task, taskIndex) => (
                      <AccordionItem
                        key={task.id}
                        value={task.id}
                        className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden p-0 bg-card"
                      >
                        <AccordionTrigger className="hover:no-underline px-4 py-3.5 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100/80 dark:hover:bg-slate-800/70 transition-colors [&[data-state=open]]:border-b [&[data-state=open]]:border-slate-200 dark:[&[data-state=open]]:border-slate-700 [&[data-state=open]]:bg-blue-50/40 dark:[&[data-state=open]]:bg-blue-950/10">
                          <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                            <span className="flex items-center justify-center h-7 w-7 rounded-full bg-blue-500 text-white text-xs font-bold shrink-0 shadow-sm">
                              {taskIndex + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate leading-snug">
                                {task.name}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="text-[10px] text-muted-foreground">
                                  {(task.steps || []).length} etapa
                                  {(task.steps || []).length !== 1 ? "s" : ""}
                                </span>
                                {(task.steps || []).length > 0 && (
                                  <>
                                    <span className="text-[10px] text-muted-foreground">
                                      ·
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                      {(task.steps || []).reduce(
                                        (s, st) => s + (st.estimatedHours || 0),
                                        0,
                                      )}
                                      h est.
                                    </span>
                                  </>
                                )}
                                {task.canRunInParallel && (
                                  <Badge className="text-[9px] px-1.5 h-4 bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 border-0">
                                    Paralela
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <Badge className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400 border-0 shrink-0">
                              {formatCurrency(task.calculatedCost)}
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="p-4 space-y-4 bg-card">
                            {/* Preview das etapas */}
                            {(task.steps || []).length > 0 && (
                              <div className="rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700 overflow-hidden">
                                <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 dark:border-slate-700">
                                  <ListChecks className="h-3 w-3 text-blue-500 shrink-0" />
                                  <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                    {(task.steps || []).length} Etapa
                                    {(task.steps || []).length !== 1 ? "s" : ""}
                                  </p>
                                  <span className="ml-auto text-[10px] text-muted-foreground">
                                    {(task.steps || []).reduce(
                                      (s, st) => s + (st.estimatedHours || 0),
                                      0,
                                    )}
                                    h ·{" "}
                                    {formatCurrency(
                                      (task.steps || []).reduce(
                                        (s, st) => s + (st.calculatedCost || 0),
                                        0,
                                      ),
                                    )}
                                  </span>
                                </div>
                                <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
                                  {(task.steps || []).map((step, si) => (
                                    <div
                                      key={step.id}
                                      className="flex items-center gap-2.5 px-3 py-2"
                                    >
                                      <span className="flex items-center justify-center h-5 w-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 text-[9px] font-bold shrink-0">
                                        {si + 1}
                                      </span>
                                      <span className="text-xs text-slate-700 dark:text-slate-300 flex-1 truncate font-medium">
                                        {step.name}
                                      </span>
                                      <span className="text-[10px] text-muted-foreground shrink-0">
                                        {step.estimatedHours}h
                                      </span>
                                      <span className="text-[10px] font-semibold text-emerald-600 shrink-0 min-w-14 text-right">
                                        {formatCurrency(step.calculatedCost)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Campos */}
                            <div className="grid grid-cols-4 gap-3">
                              <div className="space-y-1.5 col-span-3">
                                <Label className="text-xs font-semibold">
                                  Nome da Tarefa
                                </Label>
                                <Input
                                  value={task.name}
                                  onChange={(e) =>
                                    setProductFormData({
                                      ...productFormData,
                                      tasks: productFormData.tasks.map(
                                        (t, idx) =>
                                          idx === taskIndex
                                            ? { ...t, name: e.target.value }
                                            : t,
                                      ),
                                    })
                                  }
                                  className="text-xs h-8"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">
                                  Ordem
                                </Label>
                                <Input
                                  type="number"
                                  value={task.order}
                                  onChange={(e) =>
                                    setProductFormData({
                                      ...productFormData,
                                      tasks: productFormData.tasks.map(
                                        (t, idx) =>
                                          idx === taskIndex
                                            ? {
                                                ...t,
                                                order: Number.parseInt(
                                                  e.target.value,
                                                ),
                                              }
                                            : t,
                                      ),
                                    })
                                  }
                                  className="text-xs h-8"
                                />
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold">
                                Descrição
                              </Label>
                              <Textarea
                                value={task.description}
                                onChange={(e) =>
                                  setProductFormData({
                                    ...productFormData,
                                    tasks: productFormData.tasks.map(
                                      (t, idx) =>
                                        idx === taskIndex
                                          ? {
                                              ...t,
                                              description: e.target.value,
                                            }
                                          : t,
                                    ),
                                  })
                                }
                                className="text-xs min-h-[72px]"
                                placeholder="Descreva o objetivo desta tarefa..."
                              />
                            </div>

                            <div className="flex items-center gap-5 flex-wrap p-3 bg-slate-50/60 dark:bg-slate-800/30 rounded-lg border border-slate-100 dark:border-slate-700">
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={task.canRunInParallel}
                                  onCheckedChange={(checked) =>
                                    setProductFormData({
                                      ...productFormData,
                                      tasks: productFormData.tasks.map(
                                        (t, idx) =>
                                          idx === taskIndex
                                            ? {
                                                ...t,
                                                canRunInParallel: checked,
                                              }
                                            : t,
                                      ),
                                    })
                                  }
                                />
                                <Label className="text-xs font-medium">
                                  Pode rodar em paralelo
                                </Label>
                              </div>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={task.isLinkedToTemplate || false}
                                  onCheckedChange={(checked) =>
                                    setProductFormData({
                                      ...productFormData,
                                      tasks: productFormData.tasks.map(
                                        (t, idx) =>
                                          idx === taskIndex
                                            ? {
                                                ...t,
                                                isLinkedToTemplate: checked,
                                              }
                                            : t,
                                      ),
                                    })
                                  }
                                />
                                <Label className="text-xs font-medium">
                                  Vinculado a Modelo
                                </Label>
                              </div>
                            </div>

                            {/* Rodapé de ações */}
                            <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setProductFormData({
                                    ...productFormData,
                                    tasks: productFormData.tasks.filter(
                                      (_, idx) => idx !== taskIndex,
                                    ),
                                  })
                                }
                                className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 gap-1.5"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Remover Tarefa
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedTask(task);
                                  setIsTaskModalOpen(true);
                                }}
                                className="text-xs gap-1.5"
                              >
                                <Layers className="h-3.5 w-3.5" />
                                Gerenciar Etapas
                              </Button>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>

                  <Button
                    variant="outline"
                    className="w-full h-10 text-xs gap-1.5 bg-transparent border-dashed hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 hover:text-blue-600 transition-colors"
                    onClick={() => {
                      // Add new task with default values
                      setProductFormData({
                        ...productFormData,
                        tasks: [
                          ...productFormData.tasks,
                          {
                            id: Date.now().toString(),
                            name: `Nova Tarefa ${productFormData.tasks.length + 1}`,
                            description: "",
                            specialty: "",
                            executionTime: 0,
                            executionDeadline: 0,
                            deliveryDeadline: 0,
                            adjustmentDeadline: 0,
                            approvalDeadline: 0,
                            automaticValue: 0,
                            order: productFormData.tasks.length + 1,
                            canRunInParallel: false,
                            steps: [],
                            calculatedCost: 0,
                            dependencies: [],
                            // Add other default task properties
                            code: "",
                            attentionText: "",
                            pop: "",
                            complementaryFiles: [],
                            verificationItems: [],
                            keepNextStepWithNomadLeader: false,
                            delegateToLeader: false,
                            liberateAfterSend: false,
                            requireFinalFiles: false,
                            isInternalStep: false,
                            concludeOnRejection: false,
                            hideFromClient: false,
                            hasVariations: false,
                            noConditions: false,
                            showAccess: false,
                            hideInProducts: false,
                            dontCountDeadline: false,
                            dontCountValue: false,
                            hasAdditionals: false,
                          },
                        ],
                      });
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Adicionar Nova Tarefa
                  </Button>
                </TabsContent>

                <TabsContent value="customizacao" className="space-y-3 mt-3">
                  {/* Variações */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50/60 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-700">
                      <Layers className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Variações do Produto
                      </span>
                      {productVariations.length > 0 && (
                        <span className="text-[10px] font-semibold text-blue-600 bg-blue-100 dark:bg-blue-900/40 px-1.5 py-0.5 rounded-full">
                          {productVariations.length}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 hidden sm:block ml-1">
                        · cada variação pode ter preço e prazo distintos
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={addVariation}
                        className="ml-auto text-xs gap-1 h-7 px-2.5 bg-transparent"
                      >
                        <Plus className="h-3 w-3" /> Adicionar
                      </Button>
                    </div>
                    {productVariations.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center px-4 bg-card">
                        <Layers className="h-8 w-8 text-slate-200 dark:text-slate-700 mb-2" />
                        <p className="text-xs text-slate-500 font-medium">
                          Nenhuma variação cadastrada
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Adicione variações para oferecer planos distintos
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 dark:divide-slate-800 bg-card">
                        {productVariations.map((variation, index) => (
                          <div key={variation.id} className="p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                Variação {index + 1}
                              </span>
                              <button
                                onClick={() => removeVariation(variation.id)}
                                className="h-6 w-6 flex items-center justify-center rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1.5 col-span-2">
                                <Label className="text-xs font-medium text-muted-foreground">
                                  Nome da Variação
                                </Label>
                                <Input
                                  value={variation.name}
                                  onChange={(e) =>
                                    updateVariation(variation.id, {
                                      name: e.target.value,
                                    })
                                  }
                                  placeholder="Ex: Até 2 campanhas"
                                  className="text-xs h-8"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs font-medium text-muted-foreground">
                                  Preço (R$)
                                </Label>
                                <Input
                                  type="number"
                                  value={variation.price}
                                  onChange={(e) =>
                                    updateVariation(variation.id, {
                                      price:
                                        Number.parseFloat(e.target.value) || 0,
                                    })
                                  }
                                  className="text-xs h-8"
                                  min="0"
                                  step="0.01"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs font-medium text-muted-foreground">
                                  Prazo (dias)
                                </Label>
                                <Input
                                  type="number"
                                  value={variation.deadlineDays ?? ""}
                                  onChange={(e) =>
                                    updateVariation(variation.id, {
                                      deadlineDays: e.target.value
                                        ? Number.parseInt(e.target.value)
                                        : undefined,
                                    })
                                  }
                                  placeholder="Ex: 80"
                                  className="text-xs h-8"
                                  min="0"
                                />
                              </div>
                              <div className="space-y-1.5 col-span-2">
                                <Label className="text-xs font-medium text-muted-foreground">
                                  Escopo / Entrega
                                </Label>
                                <Input
                                  value={variation.scopeDescription ?? ""}
                                  onChange={(e) =>
                                    updateVariation(variation.id, {
                                      scopeDescription: e.target.value,
                                    })
                                  }
                                  placeholder="Ex: Gerencia até 2 campanhas simultâneas"
                                  className="text-xs h-8"
                                />
                              </div>
                              <div className="space-y-1.5 col-span-2">
                                <Label className="text-xs font-medium text-muted-foreground">
                                  Descrição complementar
                                </Label>
                                <Input
                                  value={variation.description ?? ""}
                                  onChange={(e) =>
                                    updateVariation(variation.id, {
                                      description: e.target.value,
                                    })
                                  }
                                  placeholder="Indicado para negócios com..."
                                  className="text-xs h-8"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add-ons */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50/60 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-700">
                      <Plus className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Add-ons
                      </span>
                      {productAddOns.length > 0 && (
                        <span className="text-[10px] font-semibold text-violet-600 bg-violet-100 dark:bg-violet-900/40 px-1.5 py-0.5 rounded-full">
                          {productAddOns.length}
                        </span>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={addAddOn}
                        className="ml-auto text-xs gap-1 h-7 px-2.5 bg-transparent"
                      >
                        <Plus className="h-3 w-3" /> Adicionar
                      </Button>
                    </div>
                    {productAddOns.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center px-4 bg-card">
                        <DollarSign className="h-8 w-8 text-slate-200 dark:text-slate-700 mb-2" />
                        <p className="text-xs text-slate-500 font-medium">
                          Nenhum add-on cadastrado
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 dark:divide-slate-800 bg-card">
                        {productAddOns.map((addOn, index) => (
                          <div
                            key={addOn.id}
                            className="grid grid-cols-4 gap-3 p-3 items-end"
                          >
                            <div className="space-y-1.5 col-span-2">
                              <Label className="text-xs font-medium text-muted-foreground">
                                Nome
                              </Label>
                              <Input
                                value={addOn.name}
                                onChange={(e) =>
                                  updateAddOn(addOn.id, {
                                    name: e.target.value,
                                  })
                                }
                                className="text-xs h-8"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium text-muted-foreground">
                                Preço
                              </Label>
                              <Input
                                type="number"
                                value={addOn.price}
                                onChange={(e) =>
                                  updateAddOn(addOn.id, {
                                    price:
                                      Number.parseFloat(e.target.value) || 0,
                                  })
                                }
                                className="text-xs h-8"
                              />
                            </div>
                            <div className="flex items-end gap-2">
                              <div className="space-y-1.5 flex-1">
                                <Label className="text-xs font-medium text-muted-foreground">
                                  Tipo
                                </Label>
                                <Select
                                  value={addOn.category}
                                  onValueChange={(value) =>
                                    updateAddOn(addOn.id, {
                                      category: value as
                                        | "creative_type"
                                        | "extra",
                                    })
                                  }
                                >
                                  <SelectTrigger className="text-xs h-8">
                                    <SelectValue placeholder="Selecione" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="creative_type">
                                      Tipo Criativo
                                    </SelectItem>
                                    <SelectItem value="extra">Extra</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <button
                                onClick={() => removeAddOn(addOn.id)}
                                className="h-8 w-8 flex items-center justify-center rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shrink-0"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="questionario" className="space-y-3 mt-3">
                  {/* Metadados do questionário */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50/60 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-700">
                      <FileQuestion className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Configuração do Questionário
                      </span>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">
                          Título do Questionário
                        </Label>
                        <Input
                          value={productFormData.questionnaire.title}
                          onChange={(e) =>
                            setProductFormData({
                              ...productFormData,
                              questionnaire: {
                                ...productFormData.questionnaire,
                                title: e.target.value,
                              },
                            })
                          }
                          className="text-xs h-8"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">
                          Descrição do Questionário
                        </Label>
                        <Textarea
                          value={productFormData.questionnaire.description}
                          onChange={(e) =>
                            setProductFormData({
                              ...productFormData,
                              questionnaire: {
                                ...productFormData.questionnaire,
                                description: e.target.value,
                              },
                            })
                          }
                          className="text-xs min-h-[60px]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Perguntas */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50/60 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-700">
                      <ListChecks className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Perguntas
                      </span>
                      {productQuestions.length > 0 && (
                        <span className="text-[10px] font-semibold text-blue-600 bg-blue-100 dark:bg-blue-900/40 px-1.5 py-0.5 rounded-full">
                          {productQuestions.length}
                        </span>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={addQuestion}
                        className="ml-auto text-xs gap-1 h-7 px-2.5 bg-transparent"
                      >
                        <Plus className="h-3 w-3" /> Adicionar
                      </Button>
                    </div>
                    {productQuestions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center px-4 bg-card">
                        <FileQuestion className="h-8 w-8 text-slate-200 dark:text-slate-700 mb-2" />
                        <p className="text-xs text-slate-500 font-medium">
                          Nenhuma pergunta cadastrada
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Adicione perguntas para o briefing do cliente
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 dark:divide-slate-800 bg-card">
                        {productQuestions.map((question, index) => (
                          <div key={question.id} className="p-4 space-y-3">
                            <div className="flex items-start gap-3">
                              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-400 text-xs font-bold shrink-0 mt-0.5">
                                {index + 1}
                              </span>
                              <div className="flex-1 space-y-1.5">
                                <Label className="text-xs font-medium text-muted-foreground">
                                  Pergunta
                                </Label>
                                <Input
                                  value={question.question}
                                  onChange={(e) =>
                                    updateQuestion(question.id, {
                                      question: e.target.value,
                                    })
                                  }
                                  className="text-xs h-8"
                                />
                              </div>
                              <button
                                onClick={() => removeQuestion(question.id)}
                                className="h-6 w-6 flex items-center justify-center rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors mt-5 shrink-0"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <div className="grid grid-cols-3 gap-3 pl-9">
                              <div className="space-y-1.5">
                                <Label className="text-xs font-medium text-muted-foreground">
                                  Tipo de Resposta
                                </Label>
                                <Select
                                  value={question.type}
                                  onValueChange={(value) =>
                                    updateQuestion(question.id, {
                                      type: value as Question["type"],
                                    })
                                  }
                                >
                                  <SelectTrigger className="text-xs h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="text">
                                      Texto Curto
                                    </SelectItem>
                                    <SelectItem value="multiline">
                                      Texto Longo
                                    </SelectItem>
                                    <SelectItem value="select">
                                      Seleção Única
                                    </SelectItem>
                                    <SelectItem value="multiselect">
                                      Múltipla Escolha
                                    </SelectItem>
                                    <SelectItem value="file">
                                      Upload de Arquivo
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs font-medium text-muted-foreground">
                                  Opções (para seleção)
                                </Label>
                                <Input
                                  value={question.options?.join(", ")}
                                  onChange={(e) =>
                                    updateQuestion(question.id, {
                                      options: e.target.value
                                        .split(",")
                                        .map((o) => o.trim())
                                        .filter((o) => o),
                                    })
                                  }
                                  placeholder="Opção1, Opção2, ..."
                                  className="text-xs h-8 disabled:opacity-40"
                                  disabled={
                                    question.type !== "select" &&
                                    question.type !== "multiselect"
                                  }
                                />
                              </div>
                              <div className="space-y-1.5 flex items-end">
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={question.required}
                                    onCheckedChange={(checked) =>
                                      updateQuestion(question.id, {
                                        required: checked,
                                      })
                                    }
                                  />
                                  <Label className="text-xs font-medium">
                                    Obrigatória
                                  </Label>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 pl-9">
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={question.aiAssisted}
                                  onCheckedChange={(checked) =>
                                    updateQuestion(question.id, {
                                      aiAssisted: checked,
                                    })
                                  }
                                />
                                <Label className="text-xs font-medium text-muted-foreground">
                                  IA Assistida
                                </Label>
                              </div>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={question.allowsAttachment}
                                  onCheckedChange={(checked) =>
                                    updateQuestion(question.id, {
                                      allowsAttachment: checked,
                                    })
                                  }
                                />
                                <Label className="text-xs font-medium text-muted-foreground">
                                  Permite Anexo
                                </Label>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* ── NÔMADES E DESEMPENHO — admin only (rota já protegida) ── */}
                <TabsContent value="nomades-habilitados" className="space-y-3 mt-3">
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50/60 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-700">
                      <Users className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Nômades Habilitados e Desempenho
                      </span>
                      <span className="text-[10px] text-slate-400 hidden sm:block">
                        · visível apenas para administradores
                      </span>
                    </div>
                    <div className="p-4">
                      <ProductNomadsTab productId={selectedProduct?.id ?? ""} />
                    </div>
                  </div>
                </TabsContent>

              </Tabs>
            </div>
          </div>

          <SheetFooter className="flex-shrink-0 px-6 py-4 border-t bg-muted/20 flex-row items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={resetForm}
              className="gap-1.5 text-xs"
            >
              <X className="h-3.5 w-3.5" />
              Cancelar
            </Button>
            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveDraft}
                className="gap-1.5 text-xs"
              >
                <FileText className="h-3.5 w-3.5" />
                Rascunho
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleScheduleLaunch}
                className="gap-1.5 text-xs"
              >
                <Clock className="h-3.5 w-3.5" />
                Agendar
              </Button>
              <Button
                size="sm"
                onClick={handleSaveProduct}
                className="btn-brand gap-1.5 text-xs"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Salvar Produto
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
