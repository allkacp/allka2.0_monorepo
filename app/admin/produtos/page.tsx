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
} from "lucide-react";
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
    label: string;
    quantity: number;
    priceModifier: number;
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
  const [savedFilters, setSavedFilters] = useState<Array<{id: string; name: string; filters: any}>>([]);
  const [selectedFilterId, setSelectedFilterId] = useState<string | null>(null);
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [filterNameInput, setFilterNameInput] = useState("");
  const [editingFilterId, setEditingFilterId] = useState<string | null>(null);
  const [editingFilterName, setEditingFilterName] = useState("");
  const [draggingFilterId, setDraggingFilterId] = useState<string | null>(null);
  const [dragOverFilterId, setDragOverFilterId] = useState<string | null>(null);
  const [showFieldPicker, setShowFieldPicker] = useState(false);
  const [visibleFields, setVisibleFields] = useState(["categoria", "area", "status", "ordenar"]);
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
  const [productQuestions, setProductQuestions] = useState<Question[]>([]);
  const [productTasks, setProductTasks] = useState<Task[]>([]); // State to hold tasks for the product form

  const [isEnhancingWithAI, setIsEnhancingWithAI] = useState(false);
  const [currentFieldEnhancing, setCurrentFieldEnhancing] = useState<
    string | null
  >(null);

  const [productVariations, setProductVariations] = useState<
    Array<{
      id: string;
      label: string;
      quantity: number;
      priceModifier: number;
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
        filterCategories.length === 0 || filterCategories.includes(product.category);

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
        for (let i = totalPages - (maxVisible - 2); i <= totalPages; i++) pages.push(i);
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
      productImagePreview: (product as any).productImagePreview || "",
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

  const handleCreateProduct = () => {
    if (!productFormData.name.trim()) {
      alert("Por favor, preencha o nome do produto");
      return;
    }

    if (!productFormData.category.trim()) {
      alert("Por favor, selecione uma categoria");
      return;
    }

    const generatedId = `PROD-${Date.now().toString().slice(-6)}`;

    const newProductWithDefaults: Product = {
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
      label: "",
      quantity: 1,
      priceModifier: 0,
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

    const generatedId = `PROD-${Date.now().toString().slice(-6)}`;

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
        title={
          <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Produtos
          </span>
        }
        description="Gerencie seu catálogo de produtos e serviços"
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

      <Accordion type="single" collapsible className="mb-1">
        <AccordionItem
          value="stats"
          className="border rounded-lg bg-blue-50 border-blue-200"
        >
          <AccordionTrigger className="text-sm font-semibold hover:no-underline px-4 py-3 hover:bg-slate-50 rounded-t-lg transition-colors">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <span className="text-blue-900">Estatísticas de Produtos</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2 px-4 pb-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs opacity-90">Total de Produtos</p>
                      <p className="text-2xl font-bold mt-0.5">
                        {safeProducts.length}
                      </p>
                    </div>
                    <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center">
                      <Package className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs opacity-90">Total de Tarefas</p>
                      <p className="text-2xl font-bold mt-0.5">
                        {safeProducts.reduce(
                          (sum, p) => sum + (p.tasks || []).length,
                          0,
                        )}
                      </p>
                    </div>
                    <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center">
                      <ListChecks className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs opacity-90">Horas Estimadas</p>
                      <p className="text-2xl font-bold mt-0.5">
                        {safeProducts.reduce(
                          (sum, p) => sum + getTotalHours(p),
                          0,
                        )}
                        h
                      </p>
                    </div>
                    <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center">
                      <Clock className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs opacity-90">Receita Total</p>
                      <p className="text-2xl font-bold mt-0.5">
                        {formatCurrency(
                          safeProducts.reduce(
                            (sum, p) => sum + (p.finalPrice || 0),
                            0,
                          ),
                        )}
                      </p>
                    </div>
                    <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Card className="border border-slate-200/70 dark:border-slate-700/60 shadow-sm overflow-hidden">
        {/* Top Bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200/70 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-900/30 flex-wrap">
          {/* Search */}
          <div className="flex-1 relative min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar produtos..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="pl-9 h-9 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg focus-visible:ring-blue-500 w-full"
            />
          </div>

          {/* Items per page + count */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <ItemsPerPageSelect
              value={pageSize.toString()}
              onValueChange={(value) => { setPageSize(Number(value)); setCurrentPage(1); }}
              variant="top"
            />
            <span className="text-xs text-slate-400 whitespace-nowrap">
              {filteredProducts.length !== safeProducts.length ? (
                <>de <span className="font-semibold text-blue-500">{filteredProducts.length}</span> de {safeProducts.length} produto{safeProducts.length !== 1 ? "s" : ""}</>
              ) : (
                <>de <span className="font-semibold text-slate-600 dark:text-slate-300">{safeProducts.length}</span> produto{safeProducts.length !== 1 ? "s" : ""}</>
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
          <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden flex-shrink-0">
            <button
              onClick={() => setViewMode("grid")}
              className={`h-9 w-9 flex items-center justify-center transition-colors ${viewMode === "grid" ? "bg-blue-500 text-white" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
              title="Visualização em grade"
            >
              <Grid3x3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`h-9 w-9 flex items-center justify-center transition-colors border-l border-slate-200 dark:border-slate-700 ${viewMode === "list" ? "bg-blue-500 text-white" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
              title="Visualização em lista"
            >
              <LayoutList className="h-4 w-4" />
            </button>
          </div>

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
                  <span key={index} className="text-xs text-slate-300 px-0.5">·</span>
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
                )
              )}
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
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
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center mb-4">
              <Package className="h-8 w-8 text-blue-500" />
            </div>
            <h3 className="text-base font-semibold mb-1">Nenhum produto encontrado</h3>
            <p className="text-muted-foreground text-center mb-5 max-w-md text-sm">
              {searchTerm || activeFiltersCount > 0
                ? "Tente ajustar os filtros ou busca para encontrar o que procura."
                : "Comece criando seu primeiro produto para gerenciar seu catálogo."}
            </p>
            {!(searchTerm || activeFiltersCount > 0) && (
              <Button onClick={handleOpenProductSheet} className="btn-brand gap-2">
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
                className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group"
              >
                {/* Icon / Image */}
                <div className="relative flex-shrink-0">
                  {product.productImagePreview ? (
                    <img
                      src={product.productImagePreview}
                      alt={product.name}
                      className="h-10 w-10 rounded-lg object-cover border shadow-sm"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-sm">
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
                  <p className="text-sm font-semibold truncate leading-tight">{product.name}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {product.description || "Sem descrição"}
                  </p>
                </div>

                {/* Category badge */}
                <Badge variant="secondary" className="text-xs font-normal px-2 py-0.5 flex-shrink-0 hidden sm:flex">
                  {product.category}
                </Badge>

                {/* Tasks + hours */}
                <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground flex-shrink-0">
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
                <span className="text-sm font-bold text-emerald-600 flex-shrink-0 min-w-[90px] text-right">
                  {formatCurrency(product.finalPrice || 0)}
                </span>

                {/* Switch */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Switch
                    checked={product.isActive}
                    onCheckedChange={(checked) => handleToggleProductStatus(product, checked)}
                    className="data-[state=checked]:bg-emerald-500"
                  />
                  <span className={`text-xs font-medium hidden lg:block ${product.isActive ? "text-emerald-600" : "text-slate-400"}`}>
                    {product.isActive ? "Ativo" : "Inativo"}
                  </span>
                </div>

                {/* Actions */}
                <TooltipProvider>
                  <div className="flex gap-0.5 flex-shrink-0">
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
                      <TooltipContent><p>Ver detalhes</p></TooltipContent>
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
                      <TooltipContent><p>Editar produto</p></TooltipContent>
                    </Tooltip>
                  </div>
                </TooltipProvider>
              </div>
            ))}
          </div>
        ) : (
          /* ── GRID VIEW ── */
          <div className="p-4">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">

              {paginatedProducts.map((product) => (
            <Card
              key={product.id}
              className="group hover:shadow-lg transition-all duration-200 overflow-hidden border-border/60"
            >
              {/* Main Info */}
              <div className="p-4">
                <div className="flex items-start gap-3">
                  {/* Icon / Image */}
                  <div className="relative flex-shrink-0">
                    {product.productImagePreview ? (
                      <img
                        src={product.productImagePreview}
                        alt={product.name}
                        className="h-14 w-14 rounded-xl object-cover border shadow-sm"
                      />
                    ) : (
                      <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-sm">
                        <Package className="h-7 w-7 text-white" />
                      </div>
                    )}
                    <div
                      className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-background ${
                        product.isActive ? "bg-emerald-500" : "bg-slate-300"
                      }`}
                    />
                  </div>

                  {/* Name + Description + Badges */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-sm leading-tight truncate">
                          {product.name}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {product.description || "Sem descrição"}
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <span className="text-base font-bold text-emerald-600">
                          {formatCurrency(product.finalPrice || 0)}
                        </span>
                        {(product as any).recurrence && (
                          <p className="text-xs text-muted-foreground">
                            {(product as any).recurrence}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <Badge
                        variant="secondary"
                        className="text-xs font-normal px-2 py-0.5"
                      >
                        {product.category}
                      </Badge>
                      {((product as any).subcategories || [])
                        .slice(0, 2)
                        .map((sub: string) => (
                          <Badge
                            key={sub}
                            variant="outline"
                            className="text-xs font-normal px-2 py-0.5"
                          >
                            {sub}
                          </Badge>
                        ))}
                      {((product as any).tags || [])
                        .slice(0, 1)
                        .map((tag: string) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="text-xs font-normal px-2 py-0.5 text-blue-600 border-blue-200 bg-blue-50"
                          >
                            {tag}
                          </Badge>
                        ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats strip */}
              <div className="flex items-center gap-4 px-4 py-2 bg-muted/30 border-t border-b text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <ListChecks className="h-3.5 w-3.5" />
                  <span>{(product.tasks || []).length} tarefas</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{getTotalHours(product)}h</span>
                </div>
                {(product as any).deliveryDays ? (
                  <div className="flex items-center gap-1.5">
                    <ChevronRight className="h-3.5 w-3.5" />
                    <span>{(product as any).deliveryDays}d entrega</span>
                  </div>
                ) : null}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedProduct(product);
                    setIsPricingModalOpen(true);
                  }}
                  className="ml-auto h-6 text-xs gap-1 text-muted-foreground hover:text-foreground px-2"
                >
                  <Calculator className="h-3 w-3" />
                  Ver Cálculo
                </Button>
              </div>

              {/* Actions row */}
              <div className="flex items-center justify-between px-4 py-2">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={product.isActive}
                    onCheckedChange={(checked) =>
                      handleToggleProductStatus(product, checked)
                    }
                    className="data-[state=checked]:bg-emerald-500"
                  />
                  <span
                    className={`text-xs font-medium ${product.isActive ? "text-emerald-600" : "text-slate-400"}`}
                  >
                    {product.isActive ? "Ativo" : "Inativo"}
                  </span>
                </div>
                <TooltipProvider>
                  <div className="flex gap-0.5">
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
                                  <Badge className="text-xs bg-emerald-100 text-emerald-800 border-0">
                                    {formatCurrency(task.calculatedCost)}
                                  </Badge>
                                </div>
                                {task.description && (
                                  <p className="text-xs text-muted-foreground mt-0.5 ml-7 line-clamp-1">
                                    {task.description}
                                  </p>
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
                                    className="flex items-center justify-between p-2 bg-background rounded-md border text-xs"
                                  >
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
                                        {formatCurrency(step.calculatedCost)}
                                      </span>
                                    </div>
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
                onValueChange={(value) => { setPageSize(Number(value)); setCurrentPage(1); }}
                variant="bottom"
              />
              <span className="text-xs text-slate-400">
                de {filteredProducts.length} produto{filteredProducts.length !== 1 ? "s" : ""}
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
                  <span key={index} className="text-xs text-slate-300 px-0.5">·</span>
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
                )
              )}
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
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
      {isFilterModalOpen && (() => {
        const allFilterFields = [
          { id: "categoria", label: "Categoria",   section: "produto" },
          { id: "area",      label: "Área",         section: "produto" },
          { id: "status",    label: "Status",       section: "produto" },
          { id: "ordenar",   label: "Ordenar por",  section: "produto" },
        ];
        const has = (id: string) => visibleFields.includes(id);
        const handleDrop = (targetId: string) => {
          if (!draggingFilterId || draggingFilterId === targetId) return;
          const from = savedFilters.findIndex(f => f.id === draggingFilterId);
          const to   = savedFilters.findIndex(f => f.id === targetId);
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
            style={{ left: sidebarWidth, top: headerHeight, bottom: footerHeight, right: 0 }}
            onClick={(e) => { if (e.target === e.currentTarget) { setIsFilterModalOpen(false); setSelectedFilterId(null); setShowFieldPicker(false); } }}
          >
            <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-[820px] max-h-[82vh] border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in duration-200 flex flex-col overflow-hidden">

              {/* Header */}
              <ModalBrandHeader
                title="Filtros Avançados"
                subtitle="Configure e aplique filtros"
                icon={<Filter />}
                onClose={() => { setIsFilterModalOpen(false); setSelectedFilterId(null); setShowFieldPicker(false); }}
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
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">Nenhum filtro salvo</p>
                      </div>
                    ) : (
                      savedFilters.map((filter) => (
                        <div
                          key={filter.id}
                          draggable
                          onDragStart={() => setDraggingFilterId(filter.id)}
                          onDragOver={(e) => { e.preventDefault(); setDragOverFilterId(filter.id); }}
                          onDrop={() => handleDrop(filter.id)}
                          onDragEnd={() => { setDraggingFilterId(null); setDragOverFilterId(null); }}
                          onClick={() => {
                            if (editingFilterId) return;
                            setFilterCategories(filter.filters.filterCategories || []);
                            setFilterAreas(filter.filters.filterAreas || []);
                            setFilterStatus(filter.filters.filterStatus || "all");
                            setSortBy(filter.filters.sortBy || "name");
                            setSelectedFilterId(filter.id);
                          }}
                          className={`group relative flex items-center gap-1 p-2 rounded-lg border text-[11px] cursor-pointer transition-all select-none ${
                            dragOverFilterId === filter.id && draggingFilterId !== filter.id ? "border-blue-400 bg-blue-50 dark:bg-blue-950/30" :
                            draggingFilterId === filter.id ? "opacity-40" :
                            selectedFilterId === filter.id
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
                              onChange={(e) => setEditingFilterName(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => {
                                e.stopPropagation();
                                if (e.key === "Enter" && editingFilterName.trim()) {
                                  setSavedFilters(savedFilters.map(f => f.id === filter.id ? { ...f, name: editingFilterName.trim() } : f));
                                  setEditingFilterId(null);
                                } else if (e.key === "Escape") setEditingFilterId(null);
                              }}
                              onBlur={() => {
                                if (editingFilterName.trim())
                                  setSavedFilters(savedFilters.map(f => f.id === filter.id ? { ...f, name: editingFilterName.trim() } : f));
                                setEditingFilterId(null);
                              }}
                              className="flex-1 min-w-0 text-[11px] bg-white dark:bg-slate-700 border border-blue-400 rounded px-1 py-0 outline-none focus:ring-1 focus:ring-blue-400"
                            />
                          ) : (
                            <span className="flex-1 truncate">{filter.name}</span>
                          )}
                          {editingFilterId !== filter.id && (
                            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity flex-shrink-0">
                              <button onClick={(e) => { e.stopPropagation(); setEditingFilterId(filter.id); setEditingFilterName(filter.name); }} className="p-0.5 rounded hover:bg-blue-100 hover:text-blue-500 text-slate-400">
                                <Pencil className="h-2.5 w-2.5" />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); setSavedFilters(savedFilters.filter(f => f.id !== filter.id)); if (selectedFilterId === filter.id) setSelectedFilterId(null); }} className="p-0.5 rounded hover:bg-red-100 hover:text-red-500 text-slate-400">
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
                        <span className="ml-1 text-slate-400">{visibleFields.length} campos ativos</span>
                      </button>
                      {showFieldPicker && (
                        <div className="absolute top-6 left-0 z-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-2 w-44 space-y-0.5">
                          {allFilterFields.map(f => (
                            <label key={f.id} className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-[11px] transition-colors ${ visibleFields.includes(f.id) ? "bg-blue-50 dark:bg-blue-900/20" : "hover:bg-slate-50 dark:hover:bg-slate-700/40" }`}>
                              <input type="checkbox" checked={visibleFields.includes(f.id)} onChange={() => setVisibleFields(v => v.includes(f.id) ? v.filter(x => x !== f.id) : [...v, f.id])} className="accent-blue-500" />
                              <span className="text-slate-700 dark:text-slate-300">{f.label}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* CATEGORIA */}
                  {has("categoria") && (
                    <div>
                      <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Categoria</p>
                      <div className="flex flex-wrap gap-1.5">
                        {uniqueCategories.map((cat) => (
                          <button
                            key={cat}
                            onClick={() => { setFilterCategories(prev => prev.includes(cat) ? prev.filter(x => x !== cat) : [...prev, cat]); }}
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${ filterCategories.includes(cat) ? "bg-blue-500 text-white border-blue-500" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-blue-300" }`}
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
                      <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Área</p>
                      <div className="flex flex-wrap gap-1.5">
                        {uniqueAreas.length === 0 ? (
                          <p className="text-[11px] text-slate-400">Nenhuma área cadastrada ainda</p>
                        ) : uniqueAreas.map((area) => (
                          <button
                            key={area}
                            onClick={() => { setFilterAreas(prev => prev.includes(area) ? prev.filter(x => x !== area) : [...prev, area]); }}
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${ filterAreas.includes(area) ? "bg-violet-500 text-white border-violet-500" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-violet-300" }`}
                          >
                            {area}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* STATUS */}
                  {has("status") && (
                    <div>
                      <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Status</p>
                      <div className="flex flex-wrap gap-1.5">
                        {[{v:"all",l:"Todos"},{v:"active",l:"Ativo"},{v:"inactive",l:"Inativo"}].map(({v,l}) => (
                          <button
                            key={v}
                            onClick={() => { setFilterStatus(v); }}
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${
                              filterStatus === v
                                ? (v === "active" ? "bg-emerald-500 text-white border-emerald-500" : v === "inactive" ? "bg-red-500 text-white border-red-500" : "bg-blue-500 text-white border-blue-500")
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
                      <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Ordenar por</p>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          {v:"name",l:"Nome (A-Z)"},
                          {v:"price-asc",l:"Preço ↑"},
                          {v:"price-desc",l:"Preço ↓"},
                          {v:"id",l:"ID"},
                        ].map(({v,l}) => (
                          <button
                            key={v}
                            onClick={() => setSortBy(v)}
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${ sortBy === v ? "bg-slate-700 text-white border-slate-700" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-slate-400" }`}
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
                            setSavedFilters([...savedFilters, { id: newId, name: filterNameInput.trim(), filters: { filterCategories, filterAreas, filterStatus, sortBy } }]);
                            setSelectedFilterId(newId); setShowSaveInput(false); setFilterNameInput("");
                          }
                          if (e.key === "Escape") { setShowSaveInput(false); setFilterNameInput(""); }
                        }}
                        placeholder={`Filtro ${savedFilters.length + 1}`}
                        className="h-7 px-2 rounded-md text-[11px] border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-400 w-36"
                      />
                      <button
                        disabled={!filterNameInput.trim()}
                        onClick={() => {
                          const newId = `filter-${Date.now()}`;
                          setSavedFilters([...savedFilters, { id: newId, name: filterNameInput.trim(), filters: { filterCategories, filterAreas, filterStatus, sortBy } }]);
                          setSelectedFilterId(newId); setShowSaveInput(false); setFilterNameInput("");
                        }}
                        className="h-7 px-3 rounded-md text-[11px] font-medium bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-40 text-white transition-all shadow-sm"
                      >OK</button>
                      <button onClick={() => { setShowSaveInput(false); setFilterNameInput(""); }} className="h-7 w-7 flex items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-500 hover:border-red-300 transition-colors">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setFilterNameInput(`Filtro ${savedFilters.length + 1}`); setShowSaveInput(true); }}
                      className="h-7 px-3 rounded-md text-[11px] font-medium bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white transition-all shadow-sm"
                    >
                      Salvar filtro
                    </button>
                  )}
                  <div className="w-px h-5 bg-slate-200 dark:bg-slate-700" />
                  <button
                    onClick={() => { setIsFilterModalOpen(false); setShowFieldPicker(false); }}
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
                  <div className="flex items-center gap-4 mt-3 text-sm opacity-80">
                    <span>{selectedTask.steps.length} etapas</span>
                    <span>·</span>
                    <span>
                      {selectedTask.steps.reduce(
                        (s, st) => s + (st.estimatedHours || 0),
                        0,
                      )}
                      h estimadas
                    </span>
                    {selectedTask.canRunInParallel && (
                      <>
                        <span>·</span>
                        <span>Paralela</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Meta */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="border rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">
                      Execução Paralela
                    </p>
                    <p className="font-semibold text-sm">
                      {selectedTask.canRunInParallel ? "Sim" : "Não"}
                    </p>
                  </div>
                  <div className="border rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">
                      Total de Horas
                    </p>
                    <p className="font-semibold text-sm">
                      {selectedTask.steps.reduce(
                        (s, st) => s + (st.estimatedHours || 0),
                        0,
                      )}
                      h
                    </p>
                  </div>
                </div>

                {selectedTask.dependencies &&
                  selectedTask.dependencies.length > 0 && (
                    <div className="border rounded-xl p-4 bg-amber-50/50 dark:bg-amber-950/20">
                      <p className="text-sm font-semibold mb-1">Dependências</p>
                      <p className="text-sm text-muted-foreground">
                        Esta tarefa depende da conclusão de{" "}
                        {selectedTask.dependencies.length} tarefa(s)
                        anterior(es)
                      </p>
                    </div>
                  )}

                {/* Steps */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Etapas da Tarefa
                  </h3>
                  <div className="space-y-2">
                    {selectedTask.steps.map((step) => {
                      const specialty = specialties.find(
                        (s) => s.id === step.specialty,
                      );
                      const hourlyRate =
                        specialty && step.experienceLevel
                          ? specialty.rates[step.experienceLevel]
                          : 0;
                      return (
                        <div key={step.id} className="border rounded-xl p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-xs shrink-0 mt-0.5">
                              {step.order}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm">
                                {step.name}
                              </p>
                              {step.description && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {step.description}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                {specialty && (
                                  <Badge variant="outline" className="text-xs">
                                    {specialty.name}
                                  </Badge>
                                )}
                                {step.experienceLevel && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {step.experienceLevel}
                                  </Badge>
                                )}
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  <span>{step.estimatedHours}h</span>
                                </div>
                                <span className="text-xs font-semibold text-green-600">
                                  {step.estimatedHours}h ×{" "}
                                  {formatCurrency(hourlyRate)} ={" "}
                                  {formatCurrency(step.calculatedCost)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {selectedTask.questionnaire && (
                  <div className="border rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold">
                        Questionário Associado
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedQuestionnaire(selectedTask.questionnaire);
                          setIsQuestionnaireModalOpen(true);
                        }}
                      >
                        Ver Completo
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                    <div className="bg-muted/40 rounded-lg p-3">
                      <p className="font-medium text-sm">
                        {selectedTask.questionnaire.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {selectedTask.questionnaire.description}
                      </p>
                      <Badge variant="secondary" className="mt-2 text-xs">
                        {selectedTask.questionnaire.questions.length} perguntas
                      </Badge>
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
                    </TabsList>
                  </div>
                  <div className="p-5">

                    {/* ── VISÃO GERAL ── */}
                    <TabsContent value="overview" className="space-y-4 mt-0">

                      {/* ── Image + gallery (side by side) + metrics ── */}
                      <div className="flex gap-3">
                        {/* Left: square main image */}
                        <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm bg-gradient-to-br from-blue-500 to-violet-600 shrink-0" style={{ width: 160, height: 160 }}>
                          <img
                            src={
                              selectedProduct.productImagePreview ||
                              `https://picsum.photos/seed/${encodeURIComponent(selectedProduct.name)}/400/400`
                            }
                            alt={selectedProduct.name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                          {/* Status pill */}
                          <div className="absolute top-2 left-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold backdrop-blur-sm ${selectedProduct.isActive ? "bg-emerald-500/90 text-white" : "bg-red-500/90 text-white"}`}>
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
                          {/* Gallery column */}
                          <div className="flex gap-1.5">
                            {[0, 1, 2, 3].map((i) => (
                              i === 0 ? (
                                <div key={i} className="shrink-0 h-[44px] w-[44px] rounded-lg overflow-hidden border-2 border-blue-500 shadow-sm cursor-pointer">
                                  <img
                                    src={selectedProduct.productImagePreview || `https://picsum.photos/seed/${encodeURIComponent(selectedProduct.name)}/200/200`}
                                    alt="Principal"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div key={i} className="shrink-0 h-[44px] w-[44px] rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-blue-400 transition-colors opacity-80 hover:opacity-100">
                                  <img
                                    src={`https://picsum.photos/seed/${encodeURIComponent(selectedProduct.name)}g${i}/200/200`}
                                    alt={`Imagem ${i + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              )
                            ))}
                            <button
                              onClick={() => { setIsViewSheetOpen(false); handleEditProduct(selectedProduct); }}
                              className="shrink-0 h-[44px] w-[44px] rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 flex flex-col items-center justify-center gap-0.5 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-colors text-slate-400 hover:text-blue-500"
                              title="Gerenciar imagens"
                            >
                              <ImageIcon className="h-3.5 w-3.5" />
                              <span className="text-[9px] font-medium leading-none">+ foto</span>
                            </button>
                          </div>

                          {/* Compact metrics */}
                          <div className="grid grid-cols-3 gap-1.5 flex-1">
                            <div className="border rounded-lg p-2 text-center bg-slate-50/80 dark:bg-slate-800/50 flex flex-col justify-center">
                              <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Preço</p>
                              <p className="font-bold text-emerald-600 text-xs leading-tight">{formatCurrency(selectedProduct.finalPrice || 0)}</p>
                            </div>
                            <div className="border rounded-lg p-2 text-center bg-slate-50/80 dark:bg-slate-800/50 flex flex-col justify-center">
                              <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Recorrência</p>
                              <p className="font-semibold text-xs leading-tight">{selectedProduct.recurrence || "—"}</p>
                            </div>
                            <div className="border rounded-lg p-2 text-center bg-slate-50/80 dark:bg-slate-800/50 flex flex-col justify-center">
                              <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Prazo</p>
                              <p className="font-semibold text-xs leading-tight">{selectedProduct.deliveryDays ? `${selectedProduct.deliveryDays}d` : "—"}</p>
                            </div>
                          </div>

                          {/* Category + tags inline */}
                          <div className="flex flex-wrap gap-1">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              {selectedProduct.category}
                            </span>
                            {(selectedProduct.tags || []).slice(0, 3).map(tag => (
                              <span key={tag} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
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
                              <span>Opção</span>
                              <span className="text-center">Qtd.</span>
                              <span className="text-right">+ Preço</span>
                            </div>
                            {(selectedProduct.variations || []).map((v) => (
                              <div
                                key={v.id}
                                className="grid grid-cols-3 px-4 py-2.5 text-sm"
                              >
                                <span>{v.label || "—"}</span>
                                <span className="text-center">
                                  {v.quantity}
                                </span>
                                <span className="text-right font-semibold text-emerald-600">
                                  {v.priceModifier >= 0 ? "+" : ""}
                                  {formatCurrency(v.priceModifier)}
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
                        const questions =
                          selectedProduct.questionnaire?.questions ||
                          selectedProduct.questions ||
                          [];
                        if (questions.length === 0) {
                          return (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                              <FileQuestion className="h-10 w-10 text-muted-foreground/40 mb-3" />
                              <p className="text-sm text-muted-foreground">
                                Nenhuma pergunta cadastrada neste questionário.
                              </p>
                            </div>
                          );
                        }
                        return (
                          <div className="space-y-3">
                            {questions.map((question, index) => (
                              <div
                                key={question.id}
                                className="border rounded-xl p-4"
                              >
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
                                      <Badge
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        {question.type === "text" &&
                                          "Texto curto"}
                                        {question.type === "multiline" &&
                                          "Texto longo"}
                                        {question.type === "select" &&
                                          "Seleção única"}
                                        {question.type === "multiselect" &&
                                          "Múltipla escolha"}
                                        {question.type === "file" &&
                                          "Upload de arquivo"}
                                      </Badge>
                                      {question.aiAssisted && (
                                        <Badge className="text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                                          <Sparkles className="h-3 w-3 mr-1" />
                                          IA Assistida
                                        </Badge>
                                      )}
                                    </div>
                                    {(question.options || []).length > 0 && (
                                      <div className="mt-3 pl-3 border-l-2 border-muted space-y-1">
                                        <p className="text-xs text-muted-foreground mb-1">
                                          Opções:
                                        </p>
                                        {(question.options || []).map(
                                          (option, optIndex) => (
                                            <div
                                              key={optIndex}
                                              className="flex items-center gap-2 text-sm"
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
                            ))}
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
                        selectedProduct.isActive ? "bg-emerald-500" : "bg-red-500"
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
                      <span className="text-xs text-slate-500 dark:text-slate-400">{selectedProduct.recurrence}</span>
                    </>
                  )}
                  {selectedProduct.deliveryDays && (
                    <>
                      <div className="h-3 w-px bg-slate-200 dark:bg-slate-700" />
                      <span className="text-xs text-slate-500 dark:text-slate-400">{selectedProduct.deliveryDays} dias</span>
                    </>
                  )}
                  {(selectedProduct.tasks || []).length > 0 && (
                    <>
                      <div className="h-3 w-px bg-slate-200 dark:bg-slate-700" />
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {(selectedProduct.tasks || []).length} tarefa{(selectedProduct.tasks || []).length !== 1 ? "s" : ""}
                      </span>
                    </>
                  )}
                </div>
                {/* Action buttons */}
                <div className="flex items-center justify-between px-5 py-2.5">
                  <Button variant="ghost" size="sm" onClick={() => setIsViewSheetOpen(false)}>
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
                <TabsList className="w-full justify-start bg-muted/30 p-1 border rounded-xl gap-0.5 flex-wrap h-auto">
                  <TabsTrigger
                    value="info"
                    className="data-[state=active]:bg-white dark:data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-blue-600 rounded-lg text-xs gap-1.5 px-3 py-2"
                  >
                    <Package className="h-3.5 w-3.5" />
                    Informações
                  </TabsTrigger>
                  <TabsTrigger
                    value="apresentacao"
                    className="data-[state=active]:bg-white dark:data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-blue-600 rounded-lg text-xs gap-1.5 px-3 py-2"
                  >
                    <ImageIcon className="h-3.5 w-3.5" />
                    Apresentação
                  </TabsTrigger>
                  <TabsTrigger
                    value="descricao"
                    className="data-[state=active]:bg-white dark:data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-blue-600 rounded-lg text-xs gap-1.5 px-3 py-2"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Descrição
                  </TabsTrigger>
                  <TabsTrigger
                    value="solicitar"
                    className="data-[state=active]:bg-white dark:data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-blue-600 rounded-lg text-xs gap-1.5 px-3 py-2"
                  >
                    <ListChecks className="h-3.5 w-3.5" />
                    Solicitação
                  </TabsTrigger>
                  <TabsTrigger
                    value="tarefas"
                    className="data-[state=active]:bg-white dark:data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-blue-600 rounded-lg text-xs gap-1.5 px-3 py-2"
                  >
                    <Layers className="h-3.5 w-3.5" />
                    Tarefas
                  </TabsTrigger>
                  <TabsTrigger
                    value="customizacao"
                    className="data-[state=active]:bg-white dark:data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-blue-600 rounded-lg text-xs gap-1.5 px-3 py-2"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    Opções
                  </TabsTrigger>
                  <TabsTrigger
                    value="questionario"
                    className="data-[state=active]:bg-white dark:data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-blue-600 rounded-lg text-xs gap-1.5 px-3 py-2"
                  >
                    <FileQuestion className="h-3.5 w-3.5" />
                    Questionário
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="space-y-3 mt-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5 bg-card p-3 rounded-lg border">
                      <Label className="text-xs font-semibold">
                        ID do Produto
                      </Label>
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

                  <div className="space-y-1.5 bg-card p-3 rounded-lg border">
                    <Label className="text-xs font-semibold">
                      Imagens do Produto
                    </Label>
                    <div className="grid grid-cols-6 gap-2">
                      {/* Main image */}
                      <div className="relative w-full aspect-square rounded-lg border-2 border-dashed border-blue-300 flex items-center justify-center bg-blue-50 dark:bg-blue-950/30 overflow-hidden hover:border-blue-500 transition-colors">
                        {productFormData.productImagePreview ||
                        selectedProduct?.productImagePreview ? (
                          <>
                            <img
                              src={
                                productFormData.productImagePreview ||
                                selectedProduct?.productImagePreview ||
                                "/placeholder.svg" ||
                                "/placeholder.svg"
                              }
                              alt="Preview"
                              className="w-full h-full object-cover"
                            />
                            <Badge className="absolute top-1 left-1 text-xs">
                              Principal
                            </Badge>
                          </>
                        ) : (
                          <label className="cursor-pointer w-full h-full flex items-center justify-center">
                            <ImageIcon className="h-8 w-8 text-blue-400" />
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>

                      {/* Additional images */}
                      {additionalImages.map((img, index) => (
                        <div
                          key={index}
                          className="relative w-full aspect-square rounded-lg border overflow-hidden group"
                        >
                          <img
                            src={img || "/placeholder.svg"}
                            alt={`Adicional ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            onClick={() => removeAdditionalImage(index)}
                            className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}

                      {/* Add more images button */}
                      {additionalImages.length < 5 && (
                        <label className="w-full aspect-square rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors">
                          <Plus className="h-6 w-6 text-gray-400" />
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleAdditionalImageUpload}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Adicione até 6 imagens. A primeira será a principal.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5 bg-card p-3 rounded-lg border">
                      <Label className="text-xs font-semibold">
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

                    <div className="space-y-1.5 bg-card p-3 rounded-lg border">
                      <Label className="text-xs font-semibold">
                        Recorrência
                      </Label>
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
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5 bg-card p-3 rounded-lg border">
                      <Label className="text-xs font-semibold">
                        Preço (Calculado){" "}
                        <span className="text-red-500">*</span>
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="R$ 0,00"
                          value={
                            productFormData.price ||
                            formatCurrency(calculateAutomaticPrice())
                          }
                          readOnly
                          className="text-xs h-8 bg-green-50 dark:bg-green-950/20 font-semibold"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleEditPrice}
                          className="h-8 px-2 bg-transparent"
                          title="Editar preço
manual"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-1.5 bg-card p-3 rounded-lg border">
                      <Label className="text-xs font-semibold">
                        Dias de Entrega <span className="text-red-500">*</span>
                      </Label>
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

                  <div className="space-y-1.5 bg-card p-3 rounded-lg border">
                    <Label className="text-xs font-semibold">Tags</Label>
                    <div className="flex flex-wrap gap-2">
                      {productFormData.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="text-xs font-normal cursor-pointer group"
                        >
                          {tag}
                          <button
                            onClick={() => removeTag(tag)}
                            className="ml-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
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
                        className="h-7 w-auto text-xs border-dashed flex-grow"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Pressione Enter para adicionar tags.
                    </p>
                  </div>

                  <div className="space-y-1.5 bg-card p-3 rounded-lg border">
                    <Label className="text-xs font-semibold">
                      Subcategorias
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {productFormData.subcategories.map((subcategory) => (
                        <Badge
                          key={subcategory}
                          variant="secondary"
                          className="text-xs font-normal cursor-pointer group"
                        >
                          {subcategory}
                          <button
                            onClick={() => toggleSubcategory(subcategory)}
                            className="ml-2 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {availableSubcategories
                        .filter(
                          (sub) => !productFormData.subcategories.includes(sub),
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
                </TabsContent>

                <TabsContent value="apresentacao" className="space-y-3 mt-3">
                  <div className="space-y-1.5 bg-card p-3 rounded-lg border">
                    <Label className="text-xs font-semibold">
                      Vídeo de Apresentação (URL)
                      <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      placeholder="Ex: https://www.youtube.com/watch?v=..."
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

                  <div className="space-y-1.5 bg-card p-3 rounded-lg border">
                    <Label className="text-xs font-semibold">
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

                  <div className="space-y-1.5 bg-card p-3 rounded-lg border">
                    <Label className="text-xs font-semibold">
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

                  <div className="space-y-1.5 bg-card p-3 rounded-lg border">
                    <Label className="text-xs font-semibold">
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
                </TabsContent>

                <TabsContent value="descricao" className="space-y-3 mt-3">
                  <div className="space-y-1.5 bg-card p-3 rounded-lg border">
                    <Label className="text-xs font-semibold">
                      Descrição Detalhada
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

                  <div className="space-y-1.5 bg-card p-3 rounded-lg border">
                    <Label className="text-xs font-semibold">
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
                      className="text-xs min-h-[100px]"
                    />
                  </div>

                  <div className="space-y-1.5 bg-card p-3 rounded-lg border">
                    <Label className="text-xs font-semibold">
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
                      className="text-xs min-h-[100px]"
                    />
                  </div>

                  <div className="space-y-1.5 bg-card p-3 rounded-lg border">
                    <Label className="text-xs font-semibold">
                      Itens Inclusos
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {productFormData.includedItems.map((item, index) => (
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
                                includedItems:
                                  productFormData.includedItems.filter(
                                    (_, i) => i !== index,
                                  ),
                              })
                            }
                            className="ml-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                      <Input
                        placeholder="Adicionar item incluso..."
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
                        className="h-7 w-auto text-xs border-dashed flex-grow"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 bg-card p-3 rounded-lg border">
                    <Label className="text-xs font-semibold">
                      Itens Não Inclusos
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {productFormData.notIncludedItems.map((item, index) => (
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
                                notIncludedItems:
                                  productFormData.notIncludedItems.filter(
                                    (_, i) => i !== index,
                                  ),
                              })
                            }
                            className="ml-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                      <Input
                        placeholder="Adicionar item não incluso..."
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
                        className="h-7 w-auto text-xs border-dashed flex-grow"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="solicitar" className="space-y-3 mt-3">
                  <div className="space-y-1.5 bg-card p-3 rounded-lg border">
                    <Label className="text-xs font-semibold">
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

                  <div className="space-y-1.5 bg-card p-3 rounded-lg border">
                    <Label className="text-xs font-semibold">
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
                      className="text-xs min-h-[100px]"
                    />
                  </div>

                  <div className="space-y-1.5 bg-card p-3 rounded-lg border">
                    <Label className="text-xs font-semibold">
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
                      className="text-xs min-h-[100px]"
                    />
                  </div>

                  <div className="space-y-1.5 bg-card p-3 rounded-lg border">
                    <Label className="text-xs font-semibold">
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
                      className="text-xs min-h-[100px]"
                    />
                  </div>

                  <div className="space-y-1.5 bg-card p-3 rounded-lg border">
                    <Label className="text-xs font-semibold">
                      Itens Excluídos
                    </Label>
                    <div className="flex flex-wrap gap-2">
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
                            className="ml-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
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
                        className="h-7 w-auto text-xs border-dashed flex-grow"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="tarefas" className="space-y-3 mt-3">
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowImportTemplateModal(true)}
                      className="gap-1 text-xs"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Importar Tarefa de Modelo
                    </Button>
                  </div>

                  <Accordion type="multiple" className="space-y-2">
                    {productFormData.tasks.map((task, taskIndex) => (
                      <AccordionItem
                        key={task.id}
                        value={task.id}
                        className="border rounded-lg px-4 py-2"
                      >
                        <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                          <div className="flex items-center gap-2">
                            <Layers className="h-4 w-4" />
                            {task.name}
                            <Badge className="text-xs bg-green-100 text-green-800">
                              {formatCurrency(task.calculatedCost)}
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="pt-3 space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="space-y-1.5 flex-1">
                                <Label className="text-xs font-medium">
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
                                <Label className="text-xs font-medium">
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
                                  className="text-xs h-8 w-20"
                                />
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium">
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
                                className="text-xs min-h-[80px]"
                              />
                            </div>
                            <div className="flex gap-4">
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
                                  checked={task.isLinkedToTemplate || false} // Handle undefined
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
                            <div className="flex justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedTask(task);
                                  setIsTaskModalOpen(true);
                                }}
                                className="text-xs"
                              >
                                Gerenciar Etapas e Questionário
                              </Button>
                            </div>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() =>
                                setProductFormData({
                                  ...productFormData,
                                  tasks: productFormData.tasks.filter(
                                    (_, idx) => idx !== taskIndex,
                                  ),
                                })
                              }
                              className="text-xs"
                            >
                              Remover Tarefa
                            </Button>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>

                  <Button
                    variant="outline"
                    className="w-full h-9 text-xs gap-1 bg-transparent"
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
                  <div className="space-y-4">
                    <Label className="text-sm font-semibold">
                      Variações do Produto
                    </Label>
                    {productVariations.map((variation, index) => (
                      <div
                        key={variation.id}
                        className="grid grid-cols-4 gap-3 p-3 border rounded-lg"
                      >
                        <div className="space-y-1.5 col-span-2">
                          <Label className="text-xs font-medium">
                            Opção de Variação
                          </Label>
                          <Input
                            value={variation.label}
                            onChange={(e) =>
                              updateVariation(variation.id, {
                                label: e.target.value,
                              })
                            }
                            className="text-xs h-8"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">
                            Quantidade
                          </Label>
                          <Input
                            type="number"
                            value={variation.quantity}
                            onChange={(e) =>
                              updateVariation(variation.id, {
                                quantity: Number.parseInt(e.target.value) || 0,
                              })
                            }
                            className="text-xs h-8"
                            min="0"
                          />
                        </div>
                        <div className="space-y-1.5 flex flex-col justify-end">
                          <Input
                            type="number"
                            value={variation.priceModifier}
                            onChange={(e) =>
                              updateVariation(variation.id, {
                                priceModifier:
                                  Number.parseFloat(e.target.value) || 0,
                              })
                            }
                            className="text-xs h-8"
                            placeholder="+/- Preço"
                          />
                        </div>
                        <button
                          onClick={() => removeVariation(variation.id)}
                          className="text-red-500 self-center justify-self-end"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addVariation}
                      className="text-xs gap-1 bg-transparent"
                    >
                      <Plus className="h-3 w-3" />
                      Adicionar Variação
                    </Button>
                  </div>

                  <div className="space-y-4 mt-6">
                    <Label className="text-sm font-semibold">Add-ons</Label>
                    {productAddOns.map((addOn, index) => (
                      <div
                        key={addOn.id}
                        className="grid grid-cols-4 gap-3 p-3 border rounded-lg"
                      >
                        <div className="space-y-1.5 col-span-2">
                          <Label className="text-xs font-medium">
                            Nome do Add-on
                          </Label>
                          <Input
                            value={addOn.name}
                            onChange={(e) =>
                              updateAddOn(addOn.id, { name: e.target.value })
                            }
                            className="text-xs h-8"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Preço</Label>
                          <Input
                            type="number"
                            value={addOn.price}
                            onChange={(e) =>
                              updateAddOn(addOn.id, {
                                price: Number.parseFloat(e.target.value) || 0,
                              })
                            }
                            className="text-xs h-8"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">
                            Categoria
                          </Label>
                          <Select
                            value={addOn.category}
                            onValueChange={(value) =>
                              updateAddOn(addOn.id, {
                                category: value as "creative_type" | "extra",
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
                          className="text-red-500 self-center justify-self-end"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addAddOn}
                      className="text-xs gap-1 bg-transparent"
                    >
                      <Plus className="h-3 w-3" />
                      Adicionar Add-on
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="questionario" className="space-y-3 mt-3">
                  <Label className="text-sm font-semibold">
                    Configure o Questionário
                  </Label>
                  <div className="space-y-1.5 bg-card p-3 rounded-lg border">
                    <Label className="text-xs font-medium">
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
                  <div className="space-y-1.5 bg-card p-3 rounded-lg border">
                    <Label className="text-xs font-medium">
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
                      className="text-xs min-h-[80px]"
                    />
                  </div>

                  <div className="space-y-4 mt-4">
                    <Label className="text-sm font-semibold">Perguntas</Label>
                    {productQuestions.map((question, index) => (
                      <div
                        key={question.id}
                        className="p-4 border rounded-lg space-y-3"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-purple-100 text-purple-700 text-sm font-bold flex-shrink-0">
                              {index + 1}
                            </span>
                            <div className="space-y-1.5 flex-1">
                              <Label className="text-xs font-medium">
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
                          </div>
                          <button
                            onClick={() => removeQuestion(question.id)}
                            className="text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium">
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
                            <Label className="text-xs font-medium">
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
                              className="text-xs h-8 disabled:opacity-50 disabled:cursor-not-allowed"
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

                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={question.aiAssisted}
                              onCheckedChange={(checked) =>
                                updateQuestion(question.id, {
                                  aiAssisted: checked,
                                })
                              }
                            />
                            <Label className="text-xs font-medium">
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
                            <Label className="text-xs font-medium">
                              Permite Anexo
                            </Label>
                          </div>
                        </div>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addQuestion}
                      className="text-xs gap-1 bg-transparent"
                    >
                      <Plus className="h-3 w-3" />
                      Adicionar Pergunta
                    </Button>
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
