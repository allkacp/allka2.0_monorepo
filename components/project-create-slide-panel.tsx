// @ts-nocheck
import type React from "react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Project, Client } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useClients } from "@/hooks/useClients";
import { useUsers } from "@/hooks/useUsers";
import { apiClient } from "@/lib/api-client";
import {
  X,
  Upload,
  UserPlus,
  ShoppingCart,
  Search,
  Star,
  Clock,
  Palette,
  Code,
  TrendingUp,
  Megaphone,
  Video,
  FileText,
  Package,
  Check,
  Minus,
  Plus,
  Briefcase,
  Building2,
  Lock,
  Key,
  Globe,
  Trash2,
  Edit,
  CreditCard,
  UserIcon,
  RefreshCw,
  Eye,
  FileEdit,
  Grid3x3,
  Grid2x2,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/contexts/sidebar-context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useProducts } from "@/lib/contexts/product-context";
import { CheckoutFlow, type CheckoutData } from "@/components/checkout-flow";
import type { CartItem } from "@/contexts/cart-context";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProductSelectionModal from "./product-selection-modal"; // Added import
import { Sheet, SheetContent } from "@/components/ui/sheet"; // Added Sheet import
import { ModalBrandHeader } from "@/components/ui/modal-brand-header";
import { ClientCreateSlidePanel } from "@/components/client-create-slide-panel";
import { CompanyCreateSlidePanel } from "@/components/company-create-slide-panel";
import { UserCreateSlidePanel } from "@/components/user-create-slide-panel";
import { useCompanies, type ApiCompany } from "@/hooks/useCompanies";

interface ProjectCreateSlidePanelProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (project: Project) => void;
  initialData?: Project;
  payerType?: "agency" | "company" | "nomad";
  /** Pre-selected products coming from the standalone catalog page */
  initialProducts?: any[];
  initialProductQuantities?: Record<string, number>;
  /** Pre-populate the client/company when opened from empresa context */
  preselectedCompanyId?: string;
  preselectedCompanyName?: string;
}

interface FormData {
  name: string;
  description: string;
  client_id: string;
  manager_id: string;
  company_id: string;
  status:
    | "planning"
    | "active"
    | "on_hold"
    | "completed"
    | "cancelled"
    | "awaiting_payment"
    | "paid";
  start_date: string;
  end_date: string;
  budget: string;
  image: string;
}

interface FormErrors {
  name?: string;
  client_id?: string;
  manager_id?: string;
}

export function ProjectCreateSlidePanel({
  open,
  onClose,
  onSubmit,
  initialData,
  payerType,
  initialProducts,
  initialProductQuantities,
  preselectedCompanyId,
  preselectedCompanyName,
}: ProjectCreateSlidePanelProps) {
  const { toast } = useToast();
  const { sidebarWidth } = useSidebar();
  const navigate = useNavigate();
  const { products } = useProducts();
  const { companies: apiCompanies, refetch: refetchCompanies } = useCompanies();
  const { clients: apiClients, refetch: refetchClients } = useClients();
  const { users: apiUsers, refetch: refetchUsers } = useUsers();
  const [loading, setLoading] = useState(false);
  const [projectCreated, setProjectCreated] = useState(false);
  const [createdProject, setCreatedProject] = useState<Project | null>(null);
  const [showCatalog, setShowCatalog] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);

  const [errors, setErrors] = useState<FormErrors>({});

  const [showCreateClient, setShowCreateClient] = useState(false);
  const [showCreateManager, setShowCreateManager] = useState(false);
  const [showCreateCompany, setShowCreateCompany] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    client_id: "",
    manager_id: "",
    company_id: "",
    status: "planning",
    start_date: "",
    end_date: "",
    budget: "",
    image: "",
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [gridLayout, setGridLayout] = useState<3 | 4 | 6>(3);

  const [showCheckout, setShowCheckout] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [showDraftConfirm, setShowDraftConfirm] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [productQuantities, setProductQuantities] = useState<
    Record<string, number>
  >({});

  const [customizationModal, setCustomizationModal] = useState(false);
  const [productToCustomize, setProductToCustomize] = useState<any>(null);
  const [selectedQuantity, setSelectedQuantity] = useState("1");
  const [selectedCreativeType, setSelectedCreativeType] = useState("estatica");
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);

  const [clientMode, setClientMode] = useState<"existing" | "new">("existing");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [newClient, setNewClient] = useState<Client | null>(null);

  // State for product catalog filtering
  const [productSearch, setProductSearch] = useState("");
  const [productCategory, setProductCategory] = useState("Todos");
  const [activeTab, setActiveTab] = useState("info");
  const [formLifecycle, setFormLifecycle] = useState<
    "Avulso" | "Mensal" | "Outro"
  >("Avulso");
  const [formBillingDay, setFormBillingDay] = useState<number>(15);
  const [customProjectType, setCustomProjectType] = useState("");

  const [showProductModal, setShowProductModal] = useState(false);

  const [vaultCredentials, setVaultCredentials] = useState<
    Array<{
      id: string;
      title: string;
      url: string;
      username: string;
      password: string;
      notes?: string;
    }>
  >(initialData?.vault || []);

  // Maps productId → projectProductId after linking (used to update commission after checkout)
  const [linkedProductIds, setLinkedProductIds] = useState<
    Record<string, string>
  >({});

  const [paymentCards, setPaymentCards] = useState<
    Array<{
      id: string;
      cardNumber: string;
      cardHolder: string;
      expiryDate: string;
      cvv: string;
      isPrimary: boolean;
    }>
  >(
    initialData?.paymentCards || [
      {
        id: "1",
        cardNumber: "4111 1111 1111 1111",
        cardHolder: "João Silva",
        expiryDate: "12/25",
        cvv: "123",
        isPrimary: true,
      },
      {
        id: "2",
        cardNumber: "5555 5555 5555 4444",
        cardHolder: "Maria Santos",
        expiryDate: "06/26",
        cvv: "456",
        isPrimary: false,
      },
    ],
  );

  const [showVaultDialog, setShowVaultDialog] = useState(false);
  const [showCardDialog, setShowCardDialog] = useState(false);
  const [editingCredential, setEditingCredential] = useState<any>(null);
  const [editingCard, setEditingCard] = useState<any>(null);

  const tabs = ["info", "description", "products", "files", "vault", "payment"];
  const tabLabels: Record<string, string> = {
    info: "Informações",
    description: "Descrição",
    products: "Produtos",
    files: "Arquivos",
    vault: "Cofre",
    payment: "Pagamento",
  };

  const currentTabIndex = tabs.indexOf(activeTab);
  const isFirstTab = currentTabIndex === 0;
  const isLastTab = currentTabIndex === tabs.length - 1;

  const handleNext = () => {
    if (!isLastTab) {
      setActiveTab(tabs[currentTabIndex + 1]);
    }
  };

  const handlePrevious = () => {
    if (!isFirstTab) {
      setActiveTab(tabs[currentTabIndex - 1]);
    }
  };

  const handleSaveDraft = async () => {
    setShowDraftConfirm(true);
  };

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || "",
        description: initialData.description || "",
        client_id: initialData.client_id?.toString() || "",
        manager_id: initialData.manager_id?.toString() || "",
        status: initialData.status || "planning",
        start_date: initialData.start_date || "",
        end_date: initialData.end_date || "",
        budget: initialData.budget?.toString() || "",
        image: initialData.image || "",
      });
      // Initialize vault and payment states if initialData exists
      setVaultCredentials(initialData.vault || []);
      setPaymentCards(initialData.paymentCards || []);
    } else {
      setFormData({
        name: "",
        description: "",
        client_id: "",
        manager_id: "",
        status: "planning",
        start_date: "",
        end_date: "",
        budget: "",
        image: "",
      });
      // Reset vault and payment states for new project
      setVaultCredentials([]);
      setPaymentCards([
        {
          id: "1",
          cardNumber: "4111 1111 1111 1111",
          cardHolder: "João Silva",
          expiryDate: "12/25",
          cvv: "123",
          isPrimary: true,
        },
        {
          id: "2",
          cardNumber: "5555 5555 5555 4444",
          cardHolder: "Maria Santos",
          expiryDate: "06/26",
          cvv: "456",
          isPrimary: false,
        },
      ]);
    }
    setErrors({});
  }, [initialData, open]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Nome do projeto é obrigatório";
    }

    if (!formData.client_id) {
      newErrors.client_id = "Cliente é obrigatório";
    }

    // manager_id is optional — stored as consultant string in backend

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // ── Normalise lifecycle to the lowercase values the backend expects
      const lifecycleNorm: "avulso" | "mensal" =
        formLifecycle === "Mensal" ? "mensal" : "avulso";

      const projectData = {
        // Backend uses `title`, not `name`
        title: formData.name,
        description: formData.description,
        // client_id is a string FK to Company in the backend schema
        client_id: formData.client_id || undefined,
        // manager is stored as consultant (string) — no FK in backend
        consultant: formData.manager_id || undefined,
        // Project starts as draft; status moves to "awaiting-payment" only
        // when the user explicitly proceeds to checkout.
        status: "draft",
        lifecycle: lifecycleNorm,
        type:
          customProjectType ||
          (formLifecycle !== "Avulso" && formLifecycle !== "Mensal"
            ? formLifecycle
            : undefined),
        value: calculateTotal(),
        billing_day: formLifecycle === "Mensal" ? formBillingDay : undefined,
        start_date: formData.start_date || undefined,
        end_date: formData.end_date || undefined,
        budget: formData.budget
          ? Number.parseFloat(formData.budget)
          : undefined,
      };

      let result: Project;
      if (initialData) {
        result = { ...initialData, ...projectData, id: initialData.id };
        toast({
          title: "Sucesso",
          description: "Projeto atualizado com sucesso",
        });
        onSubmit(result);
        onClose();
      } else {
        // Persist to API — must succeed to get a real UUID for payment
        let apiResult: any = null;
        try {
          apiResult = await apiClient.createProject(projectData);
        } catch (apiErr) {
          console.error("[createProject] API error:", apiErr);
          // Fall back to a local object (payment won't work, but UX continues)
        }
        result = apiResult ?? {
          id: `local_${Date.now()}`,
          ...projectData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setCreatedProject(result);
        setProjectCreated(true);

        // ── Link selected products to the newly-created project ────────────
        const newLinkedIds: Record<string, string> = {};
        if (
          result?.id &&
          !String(result.id).startsWith("local_") &&
          selectedProducts.length > 0
        ) {
          const pagadorDefault =
            payerType === "company" ? "CLIENTE" : "AGENCIA";
          for (const product of selectedProducts) {
            const qty = productQuantities[product.id] || product.quantity || 1;
            try {
              const linked: any = await apiClient.linkProductToProject({
                project_id: String(result.id),
                product_id: String(product.id),
                recurrence_snapshot: lifecycleNorm,
                preco_final_cliente_snapshot: (product.finalPrice || 0) * qty,
                comissao_snapshot: 0, // updated after checkout with real commission
                pagador_snapshot: pagadorDefault,
              });
              const ppId = linked?.project_product?.id ?? linked?.id ?? null;
              if (ppId) newLinkedIds[product.id] = ppId;
            } catch (linkErr: any) {
              // 409 = already linked (idempotent) — ignore
              if (linkErr?.status !== 409) {
                console.warn(
                  `[linkProduct] Falha ao vincular produto ${product.id}:`,
                  linkErr,
                );
              }
            }
          }
        }
        setLinkedProductIds(newLinkedIds);

        if (selectedProducts.length > 0) {
          toast({
            title: "Projeto criado!",
            description: "Revise os produtos e finalize a contratação.",
          });
          setShowCart(true);
        } else {
          toast({
            title: "Projeto criado!",
            description: "Agora selecione os produtos que deseja contratar.",
          });
          setShowCatalog(true);
        }
      }
    } catch (error) {
      console.error("Error creating project:", error);
      toast({
        title: "Erro",
        description: `Falha ao ${initialData ? "atualizar" : "criar"} projeto`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateField("image", reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClientCreated = (client: any) => {
    refetchClients();
    updateField("client_id", (client.id ?? "").toString());
    setNewClient(client);
    setClientMode("new");
    setShowCreateClient(false);
    toast({ title: "Sucesso", description: "Cliente criado com sucesso" });
  };

  const handleManagerCreated = (user: any) => {
    refetchUsers();
    updateField("manager_id", (user.id ?? "").toString());
    setShowCreateManager(false);
    toast({ title: "Sucesso", description: "Gerente criado com sucesso" });
  };

  const handleCompanyCreated = (company: any) => {
    refetchCompanies();
    updateField("company_id", company.id?.toString() ?? "");
    setShowCreateCompany(false);
    toast({ title: "Sucesso", description: "Empresa criada com sucesso" });
  };

  const handleContinueToProducts = () => {
    setShowCatalog(true);
  };

  const categoryIcons: Record<string, any> = {
    "Mídias e Conteúdo": Megaphone,
    "Design Gráfico": Palette,
    Desenvolvimento: Code,
    Marketing: TrendingUp,
    Conteúdo: FileText,
    Vídeo: Video,
  };

  const allCategories = Array.from(new Set(products.map((p) => p.category)));

  const categories = [
    {
      id: "all",
      name: "Todos",
      icon: ShoppingCart,
      count: products.filter((p) => p.isActive).length,
    },
    ...allCategories.map((cat) => ({
      id: cat.toLowerCase().replace(/\s+/g, "-"),
      name: cat,
      icon: categoryIcons[cat] || Package,
      count: products.filter((p) => p.category === cat && p.isActive).length,
    })),
  ];

  const filteredProducts = products.filter((product) => {
    if (!product.isActive) return false;
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" ||
      product.category.toLowerCase().replace(/\s+/g, "-") === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const formatCurrency = (value: number | undefined | null) => {
    if (value === undefined || value === null) return "R$ 0,00";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const handleAddProductToProject = (product: any) => {
    const existingProduct = selectedProducts.find((p) => p.id === product.id);
    if (!existingProduct) {
      setSelectedProducts((prev) => [
        ...prev,
        { ...product, quantity: 1, customizations: {} },
      ]);
      setProductQuantities((prev) => ({ ...prev, [product.id]: 1 }));
      toast({
        title: "Produto Adicionado",
        description: `${product.name} foi adicionado ao projeto`,
      });
    } else {
      handleIncreaseQuantity(product.id);
    }
  };

  const handleRemoveProductFromProject = (productId: string) => {
    setSelectedProducts((prev) => prev.filter((p) => p.id !== productId));
    setProductQuantities((prev) => {
      const newState = { ...prev };
      delete newState[productId];
      return newState;
    });
  };

  const handleIncreaseQuantity = (productId: string) => {
    setProductQuantities((prev) => {
      const currentQty = prev[productId] || 1;
      return { ...prev, [productId]: currentQty + 1 };
    });
    setSelectedProducts((prev) =>
      prev.map((p) =>
        p.id === productId ? { ...p, quantity: (p.quantity || 1) + 1 } : p,
      ),
    );
  };

  const handleDecreaseQuantity = (productId: string) => {
    const currentQty = productQuantities[productId] || 1;
    if (currentQty > 1) {
      setProductQuantities((prev) => ({
        ...prev,
        [productId]: currentQty - 1, // Corrected: Use productId as key
      }));
      setSelectedProducts((prev) =>
        prev.map((p) =>
          p.id === productId ? { ...p, quantity: currentQty - 1 } : p,
        ),
      );
    } else {
      handleRemoveProductFromProject(productId);
    }
  };

  const handleCustomizeProduct = (product: any) => {
    setProductToCustomize(product);
    setSelectedQuantity("1");
    setSelectedCreativeType("estatica");
    setSelectedExtras([]);
    setCustomizationModal(true);
  };

  const handleContinueToCheckout = async () => {
    if (selectedProducts.length === 0) {
      toast({
        title: "Atenção",
        description: "Adicione pelo menos um produto antes de continuar",
        variant: "destructive",
      });
      return;
    }
    // Update project status to "awaiting-payment" now that the user is
    // actively proceeding to checkout.
    if (createdProject?.id && !String(createdProject.id).startsWith("local_")) {
      try {
        await apiClient.updateProject(String(createdProject.id), {
          status: "awaiting-payment",
        });
      } catch {
        // non-fatal — status will be corrected by fakeSandboxCheckout
      }
    }
    setShowCheckout(true);
  };

  const handleCheckoutComplete = async (checkoutData: CheckoutData) => {
    // ── Update each project-product with final commission + pagador ────────
    const commRate: number = checkoutData.commissionRate ?? 0;
    const pagador = checkoutData.payerMode === "client" ? "CLIENTE" : "AGENCIA";

    for (const [productId, ppId] of Object.entries(linkedProductIds)) {
      const product = selectedProducts.find((p) => p.id === productId);
      if (!product || !ppId) continue;
      const qty = productQuantities[productId] || product.quantity || 1;
      const basePrice = (product.finalPrice || 0) * qty;
      const clientPrice = basePrice * (1 + commRate / 100);
      try {
        await apiClient.updateProjectProduct(ppId, {
          preco_final_cliente_snapshot: clientPrice,
          comissao_snapshot: commRate,
          pagador_snapshot: pagador,
        });
      } catch {
        // non-fatal — commercial snapshot update failed
      }
    }

    const finalProject = {
      ...createdProject!,
      // Backend sets project to "in-progress" after fake payment
      status: "in-progress",
      products: selectedProducts,
      checkoutData,
    };

    toast({
      title: "✅ Contratação Concluída!",
      description: "Pagamento aprovado. Projeto contratado com sucesso.",
    });

    onSubmit(finalProject);
    onClose();
    setShowCatalog(false);
    setShowCheckout(false);
    setSelectedProducts([]);
  };

  const generateTasksFromProducts = (products: any[]) => {
    // Auto-generate tasks and stages based on contracted products
    return products.map((product, index) => ({
      id: `task-${product.id}-${Date.now()}`, // Unique ID
      productId: product.id,
      productName: product.name,
      title: `Entrega: ${product.name}`,
      description: product.description,
      status: "pending",
      priority: "high",
      stages: [
        {
          id: `stage-1-${index}-${Date.now()}`,
          name: "Briefing e Planejamento",
          status: "pending",
          order: 1,
        },
        {
          id: `stage-2-${index}-${Date.now()}`,
          name: "Desenvolvimento",
          status: "pending",
          order: 2,
        },
        {
          id: `stage-3-${index}-${Date.now()}`,
          name: "Revisão",
          status: "pending",
          order: 3,
        },
        {
          id: `stage-4-${index}-${Date.now()}`,
          name: "Entrega Final",
          status: "pending",
          order: 4,
        },
      ],
    }));
  };

  const convertProductsToCartItems = (): CartItem[] => {
    return selectedProducts.map((product) => ({
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
        category: product.category,
        basePrice: product.basePrice || product.finalPrice,
        finalPrice: product.finalPrice,
        image: product.image,
        isActive: true,
        deliveryDays: product.deliveryDays,
        customizations: [], // This seems to be a placeholder, needs actual customization mapping
      },
      quantity: product.quantity || 1,
      customization: product.customizations || {},
    }));
  };

  const handleFinishAndClose = () => {
    if (createdProject) {
      const projectWithProducts = {
        ...createdProject,
        products: selectedProducts,
      };
      onSubmit(projectWithProducts);
    }
    onClose();
    setShowCatalog(false);
    setSelectedProducts([]);
  };

  const getGridClasses = () => {
    switch (gridLayout) {
      case 3:
        return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
      case 4:
        return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";
      case 6:
        return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6";
      default:
        return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
    }
  };

  const getCategoryIcon = (category: string) => {
    return categoryIcons[category] || Package;
  };

  const handleViewProject = (project: Project) => {
    navigate(`/projects/${project.id}`);
  };

  useEffect(() => {
    if (!open) {
      setProjectCreated(false);
      setCreatedProject(null);
      setLinkedProductIds({});
      setShowCatalog(false);
      setShowCheckout(false);
      setShowDraftConfirm(false);
      setShowReview(false);
      // Always reset cart state on close — basket items are loaded fresh on open
      setShowCart(false);
      setSelectedProducts([]);
      setProductQuantities({});
      setClientMode("existing");
      setSelectedClient(null);
      setNewClient(null);
      setActiveTab("info"); // Reset active tab
      setProductSearch(""); // Reset search term
      setProductCategory("Todos"); // Reset category filter
      // Reset product modal state
      setShowProductModal(false);
      // Reset vault and card dialog states
      setShowVaultDialog(false);
      setShowCardDialog(false);
      setEditingCredential(null);
      setEditingCard(null);
    }
  }, [open]);

  // Load basket / pre-selected products when the panel opens
  // NOTE: intentionally NOT listing initialProducts in deps — we only want to
  // capture the current basket snapshot at the moment the panel is opened.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (open && initialProducts && initialProducts.length > 0) {
      setSelectedProducts(initialProducts);
      setProductQuantities(initialProductQuantities || {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // When a preselected company is provided (empresa context), auto-populate client fields
  useEffect(() => {
    if (open && preselectedCompanyId) {
      const preClient = {
        id: preselectedCompanyId,
        name: preselectedCompanyName || "",
        email: "",
      } as any;
      setSelectedClient(preClient);
      setClientMode("existing");
      setFormData((prev) => ({
        ...prev,
        client_id: String(preselectedCompanyId),
      }));
    }
  }, [open, preselectedCompanyId, preselectedCompanyName]);

  const calculateCustomTotal = () => {
    let total = productToCustomize ? productToCustomize.finalPrice : 0;

    // These values seem hardcoded and might need adjustment based on actual product pricing logic
    if (selectedQuantity === "2") total += 235.87;
    if (selectedQuantity === "4") total += 471.74;
    if (selectedQuantity === "8") total += 943.48;

    if (selectedCreativeType === "carrossel") total += 50;
    if (selectedCreativeType === "motion") total += 100;

    if (selectedExtras.includes("expressa")) total += 75.5;
    if (selectedExtras.includes("fonte")) total += 45;
    if (selectedExtras.includes("revisoes")) total += 60;

    return total;
  };

  const toggleExtra = (extra: string) => {
    if (selectedExtras.includes(extra)) {
      setSelectedExtras((prev) => prev.filter((e) => e !== extra));
    } else {
      setSelectedExtras((prev) => [...prev, extra]);
    }
  };

  const handleAddToCart = (product: any) => {
    const quantity = Number.parseInt(selectedQuantity);
    const creativeType = selectedCreativeType;
    const extras = selectedExtras;

    // Map customizations to the product structure
    const customizations = {
      creativeType,
      extras,
      // Add other relevant customization data if needed
    };

    const existingProduct = selectedProducts.find((p) => p.id === product.id);

    if (!existingProduct) {
      setSelectedProducts((prev) => [
        ...prev,
        {
          ...product,
          quantity: quantity,
          customizations: customizations,
        },
      ]);
      setProductQuantities((prev) => ({ ...prev, [product.id]: quantity }));

      toast({
        title: "Produto Adicionado",
        description: `${product.name} foi adicionado ao projeto`,
      });
    } else {
      // If product already exists, update its quantity and customizations
      setSelectedProducts((prev) =>
        prev.map((p) =>
          p.id === product.id
            ? { ...p, quantity: quantity, customizations: customizations }
            : p,
        ),
      );
      setProductQuantities((prev) => ({ ...prev, [product.id]: quantity }));
      toast({
        title: "Produto Atualizado",
        description: `${product.name} teve suas personalizações e quantidade atualizadas`,
      });
    }
  };

  const calculateTotal = () => {
    return selectedProducts.reduce((sum, product) => {
      const price = product.finalPrice || 0;
      const quantity = product.quantity || 1;
      return sum + price * quantity;
    }, 0);
  };

  // Filtered products for the catalog
  const filteredCatalogProducts = products.filter((product) => {
    if (!product.isActive) return false;
    const matchesSearch =
      product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      product.description.toLowerCase().includes(productSearch.toLowerCase());
    const matchesCategory =
      productCategory === "Todos" || product.category === productCategory;
    return matchesSearch && matchesCategory;
  });

  const handleProductsFromModal = (newProds: any[]) => {
    const merged = [...selectedProducts];
    newProds.forEach((p) => {
      if (!merged.find((sp) => sp.id === p.id)) {
        merged.push({
          ...p,
          quantity: p.quantity || 1,
          customizations: p.customizations || {},
        });
      }
    });
    setSelectedProducts(merged);
    const newQtys = { ...productQuantities };
    newProds.forEach((p) => {
      if (!(p.id in newQtys)) newQtys[p.id] = p.quantity || 1;
    });
    setProductQuantities(newQtys);
    setShowCatalog(false);
    setShowCart(true);
  };

  const handleConfirmDraft = async () => {
    setLoading(true);
    try {
      const lifecycleNorm: "avulso" | "mensal" =
        formLifecycle === "Mensal" ? "mensal" : "avulso";

      const draftData = {
        title: formData.name,
        description: formData.description,
        client_id: formData.client_id || undefined,
        consultant: formData.manager_id || undefined,
        status: "draft" as const,
        lifecycle: lifecycleNorm,
        value: calculateTotal(),
        start_date: formData.start_date || undefined,
        end_date: formData.end_date || undefined,
        budget: formData.budget
          ? Number.parseFloat(formData.budget)
          : undefined,
      };

      const created = await apiClient.createProject(draftData);

      toast({
        title: "Rascunho Salvo",
        description: "O projeto foi salvo como rascunho.",
      });
      onSubmit(created as any);
      setShowDraftConfirm(false);
      onClose();
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível salvar o rascunho. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddCredential = (credential: any) => {
    if (editingCredential) {
      setVaultCredentials(
        vaultCredentials.map((c) =>
          c.id === editingCredential.id ? { ...credential, id: c.id } : c,
        ),
      );
    } else {
      setVaultCredentials([
        ...vaultCredentials,
        { ...credential, id: Date.now().toString() },
      ]);
    }
    setShowVaultDialog(false);
    setEditingCredential(null);
  };

  const handleDeleteCredential = (id: string) => {
    setVaultCredentials(vaultCredentials.filter((c) => c.id !== id));
  };

  const handleAddCard = (card: any) => {
    if (editingCard) {
      setPaymentCards(
        paymentCards.map((c) =>
          c.id === editingCard.id ? { ...card, id: c.id } : c,
        ),
      );
    } else {
      setPaymentCards([
        ...paymentCards,
        { ...card, id: Date.now().toString() },
      ]);
    }
    setShowCardDialog(false);
    setEditingCard(null);
  };

  const handleDeleteCard = (id: string) => {
    setPaymentCards(paymentCards.filter((c) => c.id !== id));
  };

  const handleSetPrimaryCard = (id: string) => {
    setPaymentCards(
      paymentCards.map((c) => ({ ...c, isPrimary: c.id === id })),
    );
  };

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]); // Assuming this state is needed for files tab

  return (
    <>
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent
          side="right"
          className="!w-auto !max-w-none p-0 border-0"
          hideOverlay={true}
          onInteractOutside={(e) => {
            if (showCheckout) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (showCheckout) e.preventDefault();
          }}
          style={{
            width: `calc(100vw - ${sidebarWidth}px)`,
            maxWidth: `calc(100vw - ${sidebarWidth}px)`,
          }}
        >
          <div
            className={cn(
              "h-full bg-white dark:bg-background shadow-2xl flex flex-col border-l border-gray-200 dark:border-border",
            )}
          >
            {showCheckout ? (
              <>
                <ModalBrandHeader
                  title="Finalizar Contratação"
                  subtitle="Complete o pedido dos produtos"
                  icon={<Check />}
                  onClose={onClose}
                />

                <div className="flex-1 min-h-0 overflow-y-auto">
                  <CheckoutFlow
                    items={convertProductsToCartItems()}
                    onBack={() => setShowCheckout(false)}
                    onComplete={handleCheckoutComplete}
                    preselectedClient={
                      clientMode === "existing" ? selectedClient : newClient
                    }
                    preselectedProject={createdProject}
                    payerType={payerType}
                    projectId={createdProject?.id}
                  />
                </div>
              </>
            ) : showCatalog ? (
              <>
                {/* Catalog Header */}
                <ModalBrandHeader
                  title="Selecionar Produtos"
                  subtitle={`${selectedProducts.length} produto${selectedProducts.length !== 1 ? "s" : ""} selecionado${selectedProducts.length !== 1 ? "s" : ""}`}
                  icon={<ShoppingCart />}
                  onClose={() => setShowCatalog(false)}
                />

                <div className="flex-1 min-h-0 overflow-y-auto">
                  <div className="p-4 space-y-4">
                    {/* Search + grid toggle */}
                    <div className="flex gap-3">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Buscar produtos..."
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          className="pl-9 h-9"
                        />
                      </div>
                      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 shrink-0">
                        {([3, 4] as const).map((n) => (
                          <Button
                            key={n}
                            size="sm"
                            variant={gridLayout === n ? "default" : "ghost"}
                            className="h-7 w-7 p-0"
                            onClick={() => setGridLayout(n)}
                          >
                            {n === 3 ? (
                              <Grid3x3 className="h-3.5 w-3.5" />
                            ) : (
                              <Grid2x2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Category pills */}
                    <div className="flex gap-2 flex-wrap">
                      {[
                        {
                          id: "Todos",
                          label: "Todos",
                          count: products.filter((p) => p.isActive).length,
                        },
                        ...Array.from(
                          new Set(
                            products
                              .filter((p) => p.isActive)
                              .map((p) => p.category),
                          ),
                        ).map((cat) => ({
                          id: cat,
                          label: cat,
                          count: products.filter(
                            (p) => p.isActive && p.category === cat,
                          ).length,
                        })),
                      ].map(({ id, label, count }) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setProductCategory(id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                            productCategory === id
                              ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-sm"
                              : "bg-white border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600"
                          }`}
                        >
                          {label}
                          <span
                            className={`text-[10px] ${productCategory === id ? "opacity-80" : "text-slate-400"}`}
                          >
                            ({count})
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Products Grid */}
                    <div
                      className={`grid gap-3 ${gridLayout === 3 ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"}`}
                    >
                      {filteredCatalogProducts.map((product) => {
                        const isSelected = !!selectedProducts.find(
                          (p) => p.id === product.id,
                        );
                        const quantity = productQuantities[product.id] || 1;
                        const CategoryIcon = getCategoryIcon(product.category);
                        return (
                          <Card
                            key={product.id}
                            className={cn(
                              "border-0 shadow-sm hover:shadow-md transition-all duration-200 group bg-white flex flex-col overflow-hidden",
                              isSelected && "ring-2 ring-green-500",
                            )}
                          >
                            <div className="relative h-36 bg-gradient-to-br from-blue-50 to-purple-50 overflow-hidden">
                              {product.image ? (
                                <img
                                  src={product.image || "/placeholder.svg"}
                                  alt={product.name}
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                />
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="bg-gradient-to-r from-blue-100 to-purple-100 p-6 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                                    <CategoryIcon className="h-12 w-12 text-blue-600" />
                                  </div>
                                </div>
                              )}
                              {isSelected && (
                                <Badge className="absolute top-2 right-2 bg-green-500 text-white text-[10px]">
                                  <Check className="h-2.5 w-2.5 mr-0.5" />
                                  Adicionado
                                </Badge>
                              )}
                            </div>

                            <CardHeader className="pb-2 pt-3 px-3">
                              <CardTitle className="text-xs group-hover:text-blue-600 transition-colors line-clamp-2">
                                {product.name}
                              </CardTitle>
                            </CardHeader>

                            <CardContent className="space-y-2 flex-1 flex flex-col px-3 pb-3">
                              <p className="text-[10px] text-gray-500 line-clamp-2">
                                {product.description}
                              </p>

                              <div className="flex items-center justify-between text-[10px]">
                                <div className="flex items-center gap-0.5 text-yellow-500">
                                  <Star className="h-2.5 w-2.5 fill-current" />
                                  <span className="font-medium text-gray-900">
                                    5.0
                                  </span>
                                </div>
                                {product.deliveryDays && (
                                  <div className="flex items-center gap-0.5 text-gray-500">
                                    <Clock className="h-2.5 w-2.5" />
                                    <span>{product.deliveryDays}d</span>
                                  </div>
                                )}
                              </div>

                              <div className="pt-2 border-t mt-auto space-y-1.5">
                                <p className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                                  {formatCurrency(
                                    product.finalPrice *
                                      (isSelected ? quantity : 1),
                                  )}
                                </p>

                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full text-[10px] h-6 bg-transparent"
                                  onClick={() =>
                                    handleCustomizeProduct(product)
                                  }
                                >
                                  <Palette className="h-2.5 w-2.5 mr-1" />{" "}
                                  Personalizar
                                </Button>

                                {isSelected ? (
                                  <>
                                    <div className="flex items-center justify-between gap-1">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-6 px-1.5 bg-transparent"
                                        onClick={() =>
                                          handleDecreaseQuantity(product.id)
                                        }
                                      >
                                        <Minus className="h-2.5 w-2.5" />
                                      </Button>
                                      <span className="text-xs font-semibold">
                                        {quantity}
                                      </span>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-6 px-1.5 bg-transparent"
                                        onClick={() =>
                                          handleIncreaseQuantity(product.id)
                                        }
                                      >
                                        <Plus className="h-2.5 w-2.5" />
                                      </Button>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="w-full text-[10px] h-6 text-red-600 hover:bg-red-50 border-red-200 bg-transparent"
                                      onClick={() =>
                                        handleRemoveProductFromProject(
                                          product.id,
                                        )
                                      }
                                    >
                                      <Minus className="h-2.5 w-2.5 mr-1" />{" "}
                                      Remover
                                    </Button>
                                  </>
                                ) : (
                                  <Button
                                    size="sm"
                                    className="w-full h-6 text-[10px] btn-brand"
                                    onClick={() =>
                                      handleAddProductToProject(product)
                                    }
                                  >
                                    <Plus className="h-2.5 w-2.5 mr-1" />{" "}
                                    Adicionar
                                  </Button>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>

                    {filteredCatalogProducts.length === 0 && (
                      <div className="text-center py-12 text-gray-400 text-sm">
                        Nenhum produto encontrado
                      </div>
                    )}
                  </div>
                </div>

                {/* Catalog Footer */}
                <div className="border-t border-gray-200 dark:border-gray-800 p-4 bg-gray-50 dark:bg-gray-900/50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Total selecionado:
                    </span>
                    <span className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                      {formatCurrency(calculateTotal())}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowCatalog(false)}
                      className="flex-1 h-9 text-xs"
                    >
                      ← Voltar ao formulário
                    </Button>
                    <Button
                      onClick={() => {
                        setShowCatalog(false);
                        setShowCart(true);
                      }}
                      disabled={selectedProducts.length === 0}
                      className="flex-1 h-9 text-xs bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                    >
                      <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
                      Ver Carrinho ({selectedProducts.length})
                    </Button>
                  </div>
                </div>
              </>
            ) : showCart ? (
              <>
                {/* Cart View Header */}
                <ModalBrandHeader
                  title="Carrinho do Projeto"
                  subtitle={`${selectedProducts.length} produto${selectedProducts.length !== 1 ? "s" : ""} · ${formData.name}`}
                  icon={<ShoppingCart />}
                  right={
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowCart(false);
                        setShowCatalog(true);
                      }}
                      className="text-xs text-white hover:bg-white/20"
                    >
                      ← Adicionar mais
                    </Button>
                  }
                  onClose={onClose}
                />

                {/* Cart Content */}
                <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
                  {selectedProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                        <ShoppingCart className="h-7 w-7 text-slate-400" />
                      </div>
                      <p className="text-slate-600 font-medium">
                        Carrinho vazio
                      </p>
                      <p className="text-slate-400 text-sm mt-1">
                        Adicione produtos para continuar
                      </p>
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => {
                          setShowCart(false);
                          setShowCatalog(true);
                        }}
                      >
                        Ver catálogo
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedProducts.map((product) => {
                        const qty =
                          productQuantities[product.id] ||
                          product.quantity ||
                          1;
                        const lineTotal = (product.finalPrice || 0) * qty;
                        return (
                          <div
                            key={product.id}
                            className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-start gap-3"
                          >
                            {/* Icon */}
                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center shrink-0 border border-slate-100">
                              {product.image ? (
                                <img
                                  src={product.image}
                                  alt={product.name}
                                  className="w-full h-full object-cover rounded-lg"
                                />
                              ) : (
                                <Package className="h-5 w-5 text-blue-500" />
                              )}
                            </div>
                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-900 line-clamp-1">
                                {product.name}
                              </p>
                              <p className="text-xs text-slate-400 mt-0.5">
                                {product.category}
                              </p>
                              <p className="text-xs text-slate-500 mt-1">
                                Unit.: {formatCurrency(product.finalPrice || 0)}
                              </p>
                            </div>
                            {/* Qty + price + remove */}
                            <div className="flex flex-col items-end gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  handleRemoveProductFromProject(product.id)
                                }
                                className="text-red-400 hover:text-red-600 transition-colors"
                                title="Remover"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                              <div className="flex items-center gap-1 border border-slate-200 rounded-lg overflow-hidden">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDecreaseQuantity(product.id)
                                  }
                                  className="w-7 h-7 flex items-center justify-center hover:bg-slate-100 text-slate-600"
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                                <span className="w-8 text-center text-sm font-semibold text-slate-900">
                                  {qty}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleIncreaseQuantity(product.id)
                                  }
                                  className="w-7 h-7 flex items-center justify-center hover:bg-slate-100 text-slate-600"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                              <p className="text-sm font-bold text-slate-900">
                                {formatCurrency(lineTotal)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Price Summary */}
                  {selectedProducts.length > 0 && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                      <p className="text-sm font-semibold text-slate-700">
                        Resumo do Pedido
                      </p>
                      <div className="space-y-2">
                        {selectedProducts.map((p) => {
                          const qty =
                            productQuantities[p.id] || p.quantity || 1;
                          return (
                            <div
                              key={p.id}
                              className="flex justify-between text-xs text-slate-600"
                            >
                              <span className="truncate flex-1 pr-2">
                                {p.name} × {qty}
                              </span>
                              <span className="shrink-0">
                                {formatCurrency((p.finalPrice || 0) * qty)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="border-t border-slate-200 pt-2 space-y-1">
                        {formLifecycle === "Mensal" ? (
                          <>
                            <div className="flex justify-between text-xs text-slate-500">
                              <span>Tipo de cobrança</span>
                              <span className="font-medium text-blue-600">
                                Recorrente Mensal
                              </span>
                            </div>
                            <div className="flex justify-between text-xs text-slate-500">
                              <span>Dia de cobrança</span>
                              <span>Dia {formBillingDay}</span>
                            </div>
                          </>
                        ) : (
                          <div className="flex justify-between text-xs text-slate-500">
                            <span>Tipo</span>
                            <span className="font-medium text-slate-700">
                              Pagamento Único
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between text-base font-bold text-slate-900 pt-1">
                          <span>Total</span>
                          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                            {formatCurrency(calculateTotal())}
                            {formLifecycle === "Mensal" && (
                              <span className="text-xs font-normal text-slate-500">
                                /mês
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Cart Footer */}
                <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-2">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSaveDraft}
                      className="flex-1 h-9 text-xs"
                    >
                      <Edit className="h-3.5 w-3.5 mr-1.5" />
                      Salvar Rascunho
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowReview(true)}
                      disabled={selectedProducts.length === 0}
                      className="flex-1 h-9 text-xs border-blue-300 text-blue-700 hover:bg-blue-50"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1.5" />
                      Revisar Pedido
                    </Button>
                  </div>
                  <Button
                    onClick={handleContinueToCheckout}
                    disabled={selectedProducts.length === 0}
                    className="w-full h-10 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Ir para Checkout ({selectedProducts.length})
                  </Button>
                </div>
              </>
            ) : (
              <>
                {/* Main Form - Made header compact */}
                <ModalBrandHeader
                  title="Criar Novo Projeto"
                  subtitle="Preencha as informações do projeto"
                  icon={<Briefcase />}
                  onClose={onClose}
                />

                {/* Basket preview banner — visible when items are pre-loaded from the basket */}
                {selectedProducts.length > 0 && (
                  <div className="shrink-0 mx-4 mt-3 rounded-xl border border-indigo-200 dark:border-indigo-700/40 bg-indigo-50 dark:bg-indigo-900/20 px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <ShoppingCart className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 truncate">
                        {selectedProducts.length} produto
                        {selectedProducts.length !== 1 ? "s" : ""} na cesta
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowCart(true)}
                      className="shrink-0 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 flex items-center gap-1 transition-colors"
                    >
                      Ver itens
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                )}

                {/* Tabs - Made compact */}
                <Tabs
                  value={activeTab}
                  onValueChange={setActiveTab}
                  className="flex-1 flex flex-col min-h-0"
                >
                  <div className="w-full bg-gradient-to-r from-slate-100 to-slate-200 px-4 pt-2 relative">
                    <TabsList className="w-full justify-start bg-transparent h-auto p-0 gap-1">
                      {tabs.map((tab, index) => (
                        <TabsTrigger
                          key={tab}
                          value={tab}
                          className="relative px-6 py-3 text-sm font-semibold transition-all data-[state=active]:text-white data-[state=inactive]:text-slate-600 rounded-t-lg overflow-hidden group"
                          style={{
                            background:
                              activeTab === tab
                                ? "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #3b82f6 100%)"
                                : "linear-gradient(to bottom, #f1f5f9 0%, #e2e8f0 100%)",
                            transform:
                              activeTab === tab
                                ? "translateY(0)"
                                : "translateY(2px)",
                            boxShadow:
                              activeTab === tab
                                ? "0 -2px 8px rgba(59, 130, 246, 0.3), inset 0 -1px 0 rgba(255,255,255,0.3)"
                                : "0 1px 3px rgba(0,0,0,0.1)",
                            clipPath:
                              "polygon(8% 0%, 100% 0%, 92% 100%, 0% 100%)",
                            marginLeft: index > 0 ? "-12px" : "0",
                            zIndex:
                              activeTab === tab ? 10 : tabs.length - index,
                          }}
                        >
                          <span className="relative z-10">
                            {tabLabels[tab]}
                          </span>
                          {activeTab === tab && (
                            <div
                              className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-50"
                              style={{
                                clipPath:
                                  "polygon(0 0, 100% 0, 100% 50%, 0 100%)",
                              }}
                            />
                          )}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto">
                    <div className="p-4 space-y-4">
                      <TabsContent value="info" className="mt-0 space-y-4">
                        {/* Image Upload Card */}
                        <Card className="border-2 border-blue-200 dark:border-blue-800 hover:border-blue-400 transition-colors bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-blue-950 dark:via-purple-950 dark:to-pink-950">
                          <CardContent className="p-4">
                            <Label className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2 block flex items-center gap-2">
                              <Upload className="h-4 w-4" />
                              Imagem do Projeto
                            </Label>
                            <div className="flex items-center gap-4">
                              <Avatar className="h-24 w-24 border-3 border-white dark:border-gray-800 shadow-lg">
                                <AvatarImage
                                  src={formData.image || "/placeholder.svg"}
                                  alt="Project"
                                />
                                <AvatarFallback className="bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900">
                                  <Upload className="h-10 w-10 text-blue-600 dark:text-blue-400" />
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <Input
                                  id="image-upload"
                                  type="file"
                                  accept="image/*"
                                  onChange={handleImageUpload}
                                  className="cursor-pointer h-9 text-sm bg-white dark:bg-gray-900"
                                />
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                  PNG, JPG até 5MB
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Basic Information */}
                        <Card className="border-2 border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-green-950 dark:via-emerald-950 dark:to-teal-950">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base font-semibold flex items-center gap-2 text-green-900 dark:text-green-100">
                              <Briefcase className="h-5 w-5 text-green-600 dark:text-green-400" />
                              Informações Básicas
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="space-y-1.5">
                              <Label
                                htmlFor="name"
                                className="text-xs font-semibold text-green-900 dark:text-green-100"
                              >
                                Nome do Projeto{" "}
                                <span className="text-red-500">*</span>
                              </Label>
                              <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) =>
                                  updateField("name", e.target.value)
                                }
                                className="h-9 bg-white dark:bg-gray-900 border-green-200 dark:border-green-800"
                                placeholder="Ex: Website Institucional"
                              />
                              {errors.name && (
                                <p className="text-xs text-red-500 font-medium">
                                  {errors.name}
                                </p>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <Label
                                  htmlFor="start_date"
                                  className="text-xs font-semibold text-green-900 dark:text-green-100"
                                >
                                  Data de Início
                                </Label>
                                <Input
                                  id="start_date"
                                  type="date"
                                  value={formData.start_date}
                                  onChange={(e) =>
                                    updateField("start_date", e.target.value)
                                  }
                                  className="h-9 bg-white dark:bg-gray-900 border-green-200 dark:border-green-800"
                                />
                              </div>

                              <div className="space-y-1.5">
                                <Label
                                  htmlFor="end_date"
                                  className="text-xs font-semibold text-green-900 dark:text-green-100"
                                >
                                  Data de Término
                                </Label>
                                <Input
                                  id="end_date"
                                  type="date"
                                  value={formData.end_date}
                                  onChange={(e) =>
                                    updateField("end_date", e.target.value)
                                  }
                                  className="h-9 bg-white dark:bg-gray-900 border-green-200 dark:border-green-800"
                                />
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <Label
                                htmlFor="budget"
                                className="text-xs font-semibold text-green-900 dark:text-green-100"
                              >
                                Orçamento
                              </Label>
                              <Input
                                id="budget"
                                type="number"
                                value={formData.budget}
                                onChange={(e) =>
                                  updateField("budget", e.target.value)
                                }
                                className="h-9 bg-white dark:bg-gray-900 border-green-200 dark:border-green-800"
                                placeholder="R$ 0,00"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold text-green-900 dark:text-green-100">
                                Tipo de Projeto
                              </Label>
                              <div className="flex gap-2">
                                {(["Avulso", "Mensal", "Outro"] as const).map(
                                  (lc) => (
                                    <button
                                      key={lc}
                                      type="button"
                                      onClick={() => setFormLifecycle(lc)}
                                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                                        formLifecycle === lc
                                          ? "bg-violet-600 text-white border-violet-600"
                                          : "bg-white border-slate-300 text-slate-600 hover:border-violet-400"
                                      }`}
                                    >
                                      {lc === "Mensal" && (
                                        <RefreshCw className="h-3 w-3" />
                                      )}
                                      {lc}
                                    </button>
                                  ),
                                )}
                              </div>
                            </div>
                            {formLifecycle === "Outro" && (
                              <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-green-900 dark:text-green-100">
                                  Nome do tipo personalizado
                                </Label>
                                <Input
                                  type="text"
                                  value={customProjectType}
                                  onChange={(e) =>
                                    setCustomProjectType(e.target.value)
                                  }
                                  placeholder="Ex: Consultoria, Implantação..."
                                  className="h-9 bg-white dark:bg-gray-900 border-green-200 dark:border-green-800"
                                />
                              </div>
                            )}
                            {formLifecycle === "Mensal" && (
                              <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-green-900 dark:text-green-100">
                                  Dia mensal de cobrança
                                </Label>
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    min={1}
                                    max={28}
                                    value={formBillingDay}
                                    onChange={(e) =>
                                      setFormBillingDay(
                                        Math.min(
                                          28,
                                          Math.max(
                                            1,
                                            parseInt(e.target.value) || 1,
                                          ),
                                        ),
                                      )
                                    }
                                    className="h-9 w-20 bg-white dark:bg-gray-900 border-green-200 dark:border-green-800"
                                  />
                                  <span className="text-xs text-slate-500">
                                    de cada mês
                                  </span>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>

                        {/* Empresa Card */}
                        <Card className="border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50 dark:from-blue-950 dark:via-sky-950 dark:to-cyan-950">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base font-semibold flex items-center gap-2 text-blue-900 dark:text-blue-100">
                              <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                              Empresa
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold flex items-center gap-1 text-blue-900 dark:text-blue-100">
                                Selecione a Empresa
                              </Label>
                              <div className="flex gap-2">
                                <SearchableSelect
                                  items={apiCompanies.map((c) => ({
                                    value: c.id,
                                    label: c.name,
                                    sublabel: c.cnpj || c.email || undefined,
                                  }))}
                                  value={formData.company_id}
                                  onValueChange={(value) =>
                                    updateField("company_id", value)
                                  }
                                  placeholder="Pesquisar empresa..."
                                  searchPlaceholder="Digite para buscar..."
                                  emptyMessage="Nenhuma empresa encontrada."
                                  className="flex-1 border-blue-200 dark:border-blue-800"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() => setShowCreateCompany(true)}
                                  className="h-9 w-9 shrink-0 border-blue-200 dark:border-blue-800"
                                  title="Adicionar nova empresa"
                                >
                                  <Plus className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Client Card */}
                        <Card className="border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 dark:from-purple-950 dark:via-pink-950 dark:to-rose-950">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base font-semibold flex items-center gap-2 text-purple-900 dark:text-purple-100">
                              <UserPlus className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                              Cliente
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="space-y-1.5">
                              <Label
                                htmlFor="client_id"
                                className="text-xs font-semibold flex items-center gap-1 text-purple-900 dark:text-purple-100"
                              >
                                Selecione o Cliente{" "}
                                <span className="text-red-500">*</span>
                              </Label>
                              <div className="flex gap-2">
                                <SearchableSelect
                                  items={apiClients.map((c) => ({
                                    value: c.id?.toString() ?? "",
                                    label: c.name,
                                    sublabel: c.email || undefined,
                                  }))}
                                  value={formData.client_id}
                                  onValueChange={(value) => {
                                    updateField("client_id", value);
                                    const client = apiClients.find(
                                      (c) => c.id?.toString() === value,
                                    );
                                    if (client) {
                                      setSelectedClient(client as any);
                                      setClientMode("existing");
                                    }
                                  }}
                                  placeholder="Pesquisar cliente..."
                                  searchPlaceholder="Digite para buscar..."
                                  emptyMessage="Nenhum cliente encontrado."
                                  className="flex-1 border-purple-200 dark:border-purple-800"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() => setShowCreateClient(true)}
                                  className="h-9 w-9 shrink-0 border-purple-200 dark:border-purple-800"
                                  title="Adicionar novo cliente"
                                >
                                  <Plus className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                </Button>
                              </div>
                              {errors.client_id && (
                                <p className="text-xs text-red-500 font-medium">
                                  {errors.client_id}
                                </p>
                              )}
                            </div>

                            <div className="space-y-1.5">
                              <Label
                                htmlFor="manager_id"
                                className="text-xs font-semibold flex items-center gap-1 text-purple-900 dark:text-purple-100"
                              >
                                Gerente do Projeto{" "}
                                <span className="text-red-500">*</span>
                              </Label>
                              <div className="flex gap-2">
                                <SearchableSelect
                                  items={apiUsers.map((u) => ({
                                    value: u.id?.toString() ?? "",
                                    label: u.name,
                                    sublabel: u.email || undefined,
                                  }))}
                                  value={formData.manager_id}
                                  onValueChange={(value) =>
                                    updateField("manager_id", value)
                                  }
                                  placeholder="Pesquisar gerente..."
                                  searchPlaceholder="Digite para buscar..."
                                  emptyMessage="Nenhum gerente encontrado."
                                  className="flex-1 border-purple-200 dark:border-purple-800"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() => setShowCreateManager(true)}
                                  className="h-9 w-9 shrink-0 border-purple-200 dark:border-purple-800"
                                  title="Adicionar novo gerente"
                                >
                                  <Plus className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                </Button>
                              </div>
                              {errors.manager_id && (
                                <p className="text-xs text-red-500 font-medium">
                                  {errors.manager_id}
                                </p>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </TabsContent>

                      <TabsContent
                        value="description"
                        className="mt-0 space-y-4"
                      >
                        <Card className="border-2 border-orange-200 dark:border-orange-800 bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 dark:from-orange-950 dark:via-amber-950 dark:to-yellow-950">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base font-semibold flex items-center gap-2 text-orange-900 dark:text-orange-100">
                              <FileText className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                              Descrição do Projeto
                            </CardTitle>
                            <p className="text-xs text-orange-700 dark:text-orange-300">
                              Detalhe os objetivos e requisitos do projeto
                            </p>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="space-y-1.5">
                              <Label
                                htmlFor="description"
                                className="text-xs font-semibold text-orange-900 dark:text-orange-100"
                              >
                                Descrição Completa
                              </Label>
                              <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) =>
                                  updateField("description", e.target.value)
                                }
                                className="min-h-[120px] resize-y bg-white dark:bg-gray-900 border-orange-200 dark:border-orange-800"
                                placeholder="Descreva os detalhes, objetivos e requisitos do projeto..."
                              />
                            </div>

                            <div className="space-y-1.5">
                              <Label
                                htmlFor="goals"
                                className="text-xs font-semibold text-orange-900 dark:text-orange-100"
                              >
                                Objetivos Principais
                              </Label>
                              <Textarea
                                id="goals"
                                className="min-h-[80px] resize-y bg-white dark:bg-gray-900 border-orange-200 dark:border-orange-800"
                                placeholder="Liste os principais objetivos a serem alcançados..."
                              />
                            </div>

                            <div className="space-y-1.5">
                              <Label
                                htmlFor="target"
                                className="text-xs font-semibold text-orange-900 dark:text-orange-100"
                              >
                                Público-Alvo
                              </Label>
                              <Input
                                id="target"
                                className="h-9 bg-white dark:bg-gray-900 border-orange-200 dark:border-orange-800"
                                placeholder="Ex: Empresas de tecnologia, profissionais de 25-40 anos..."
                              />
                            </div>

                            <div className="space-y-1.5">
                              <Label
                                htmlFor="competitors"
                                className="text-xs font-semibold text-orange-900 dark:text-orange-100"
                              >
                                Referências / Concorrentes
                              </Label>
                              <Textarea
                                id="competitors"
                                className="min-h-[60px] resize-y bg-white dark:bg-gray-900 border-orange-200 dark:border-orange-800"
                                placeholder="Mencione sites, marcas ou projetos de referência..."
                              />
                            </div>
                          </CardContent>
                        </Card>
                      </TabsContent>

                      <TabsContent value="products" className="mt-0 space-y-3">
                        <Card className="border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 dark:from-purple-950 dark:via-pink-950 dark:to-rose-950">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <ShoppingCart className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                <CardTitle className="text-base">
                                  Produtos e Serviços
                                </CardTitle>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setShowProductModal(true)}
                                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0"
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Adicionar Produtos
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {selectedProducts.length === 0 ? (
                              <div className="text-center py-12 border-2 border-dashed border-purple-300 dark:border-purple-700 rounded-lg bg-white/50 dark:bg-gray-900/50">
                                <ShoppingCart className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                  Nenhum produto adicionado ainda
                                </p>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setShowProductModal(true)}
                                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0"
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Adicionar Primeiro Produto
                                </Button>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {selectedProducts.map((product) => {
                                  const quantity =
                                    productQuantities[product.id] || 1;
                                  return (
                                    <Card
                                      key={product.id}
                                      className="border border-purple-200 bg-white dark:bg-gray-800"
                                    >
                                      <CardContent className="p-4">
                                        <div className="flex items-start gap-3">
                                          <div className="h-16 w-16 rounded-lg bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 flex items-center justify-center flex-shrink-0">
                                            {product.image ? (
                                              <img
                                                src={
                                                  product.image ||
                                                  "/placeholder.svg"
                                                }
                                                alt={product.name}
                                                className="h-full w-full object-cover rounded-lg"
                                              />
                                            ) : (
                                              <Package className="h-8 w-8 text-purple-600" />
                                            )}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-1">
                                              {product.name}
                                            </h4>
                                            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                                              {product.description}
                                            </p>
                                            <div className="flex items-center gap-4 mt-2">
                                              <div className="flex items-center gap-2">
                                                <Button
                                                  type="button"
                                                  size="sm"
                                                  variant="outline"
                                                  className="h-7 w-7 p-0 bg-transparent"
                                                  onClick={() =>
                                                    handleDecreaseQuantity(
                                                      product.id,
                                                    )
                                                  }
                                                >
                                                  <Minus className="h-3 w-3" />
                                                </Button>
                                                <span className="text-sm font-semibold w-8 text-center">
                                                  {quantity}
                                                </span>
                                                <Button
                                                  type="button"
                                                  size="sm"
                                                  variant="outline"
                                                  className="h-7 w-7 p-0 bg-transparent"
                                                  onClick={() =>
                                                    handleIncreaseQuantity(
                                                      product.id,
                                                    )
                                                  }
                                                >
                                                  <Plus className="h-3 w-3" />
                                                </Button>
                                              </div>
                                              <div className="text-sm font-bold text-purple-600 dark:text-purple-400">
                                                {formatCurrency(
                                                  product.finalPrice * quantity,
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                            onClick={() =>
                                              handleRemoveProductFromProject(
                                                product.id,
                                              )
                                            }
                                          >
                                            <X className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  );
                                })}
                                <div className="flex items-center justify-between pt-4 border-t border-purple-200 dark:border-purple-800">
                                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                    Total dos Produtos:
                                  </span>
                                  <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                                    {formatCurrency(calculateTotal())}
                                  </span>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </TabsContent>

                      <TabsContent value="files" className="mt-0 space-y-3">
                        <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-xl p-6 border border-blue-200/50">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                              <Upload className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <h3 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                Arquivos do Projeto
                              </h3>
                              <p className="text-xs text-gray-600">
                                Faça upload de documentos, imagens e arquivos
                                relacionados
                              </p>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="border-2 border-dashed border-blue-300 rounded-xl p-12 text-center bg-white/50 hover:bg-white/80 hover:border-blue-400 transition-all cursor-pointer group">
                              <div className="flex flex-col items-center gap-3">
                                <div className="p-4 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full group-hover:scale-110 transition-transform">
                                  <Upload className="h-8 w-8 text-blue-600" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-gray-700 mb-1">
                                    Clique para fazer upload ou arraste arquivos
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Suporta PDF, DOC, PNG, JPG (máx. 50MB)
                                  </p>
                                </div>
                              </div>
                            </div>

                            {selectedFiles && selectedFiles.length > 0 && (
                              <div className="bg-white rounded-lg p-4 space-y-2">
                                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                                  Arquivos Anexados ({selectedFiles.length})
                                </h4>
                                {selectedFiles.map((file, index) => (
                                  <div
                                    key={index}
                                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                  >
                                    <div className="flex items-center gap-3">
                                      <FileText className="h-5 w-5 text-blue-600" />
                                      <div>
                                        <p className="text-sm font-medium text-gray-900">
                                          {file.name}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                          {(file.size / 1024).toFixed(2)} KB
                                        </p>
                                      </div>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="vault" className="mt-0 space-y-3">
                        <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 rounded-xl p-6 border border-emerald-200/50">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg">
                                <Lock className="h-5 w-5 text-white" />
                              </div>
                              <div>
                                <h3 className="text-lg font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                                  Cofre de Credenciais
                                </h3>
                                <p className="text-xs text-gray-600">
                                  Armazene acessos e senhas com segurança
                                </p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => {
                                setEditingCredential(null);
                                setShowVaultDialog(true);
                              }}
                              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Novo Acesso
                            </Button>
                          </div>

                          <div className="space-y-3">
                            {vaultCredentials.length === 0 ? (
                              <div className="bg-white/50 rounded-lg p-12 text-center border-2 border-dashed border-emerald-200">
                                <Lock className="h-12 w-12 text-emerald-300 mx-auto mb-3" />
                                <p className="text-sm text-gray-600 mb-1">
                                  Nenhuma credencial cadastrada
                                </p>
                                <p className="text-xs text-gray-500">
                                  Adicione acessos para gerenciar no projeto
                                </p>
                              </div>
                            ) : (
                              vaultCredentials.map((credential) => (
                                <div
                                  key={credential.id}
                                  className="bg-white rounded-lg p-4 border border-emerald-100 hover:border-emerald-300 hover:shadow-md transition-all"
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-3 flex-1">
                                      <div className="p-2 bg-emerald-100 rounded-lg">
                                        <Key className="h-4 w-4 text-emerald-600" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-semibold text-gray-900 mb-1">
                                          {credential.title}
                                        </h4>
                                        <div className="space-y-1">
                                          <p className="text-xs text-gray-600 flex items-center gap-2">
                                            <Globe className="h-3 w-3" />
                                            {credential.url}
                                          </p>
                                          <p className="text-xs text-gray-600 flex items-center gap-2">
                                            <UserIcon className="h-3 w-3" />{" "}
                                            {/* Updated to use UserIcon */}
                                            {credential.username}
                                          </p>
                                          <p className="text-xs text-gray-600 flex items-center gap-2">
                                            <Lock className="h-3 w-3" />
                                            ••••••••
                                          </p>
                                          {credential.notes && (
                                            <p className="text-xs text-gray-500 mt-2">
                                              {credential.notes}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          setEditingCredential(credential);
                                          setShowVaultDialog(true);
                                        }}
                                        className="h-8 w-8 p-0 hover:bg-emerald-50 hover:text-emerald-700"
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() =>
                                          handleDeleteCredential(credential.id)
                                        }
                                        className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-700"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="payment" className="mt-0 space-y-3">
                        <div className="bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 rounded-xl p-6 border border-violet-200/50">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-lg">
                                <CreditCard className="h-5 w-5 text-white" />
                              </div>
                              <div>
                                <h3 className="text-lg font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                                  Formas de Pagamento
                                </h3>
                                <p className="text-xs text-gray-600">
                                  Gerencie os cartões de crédito do projeto
                                </p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => {
                                setEditingCard(null);
                                setShowCardDialog(true);
                              }}
                              className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white"
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Adicionar Cartão
                            </Button>
                          </div>

                          <div className="grid gap-4">
                            {paymentCards.map((card) => (
                              <div
                                key={card.id}
                                className={`relative bg-gradient-to-br from-gray-900 to-gray-700 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all ${
                                  card.isPrimary
                                    ? "ring-2 ring-violet-500 ring-offset-2"
                                    : ""
                                }`}
                              >
                                {card.isPrimary && (
                                  <div className="absolute top-3 right-3">
                                    <span className="bg-violet-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
                                      Principal
                                    </span>
                                  </div>
                                )}
                                <div className="flex items-start justify-between mb-6">
                                  <div>
                                    <p className="text-xs text-gray-400 mb-1">
                                      Número do Cartão
                                    </p>
                                    <p className="text-lg font-mono tracking-wider">
                                      {card.cardNumber}
                                    </p>
                                  </div>
                                  <CreditCard className="h-8 w-8 text-gray-400" />
                                </div>
                                <div className="flex items-end justify-between">
                                  <div className="space-y-2">
                                    <div>
                                      <p className="text-xs text-gray-400">
                                        Titular
                                      </p>
                                      <p className="text-sm font-semibold">
                                        {card.cardHolder}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right space-y-2">
                                    <div>
                                      <p className="text-xs text-gray-400">
                                        Validade
                                      </p>
                                      <p className="text-sm font-semibold">
                                        {card.expiryDate}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-600">
                                  {!card.isPrimary && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() =>
                                        handleSetPrimaryCard(card.id)
                                      }
                                      className="text-white hover:bg-white/10 text-xs h-7"
                                    >
                                      Tornar Principal
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setEditingCard(card);
                                      setShowCardDialog(true);
                                    }}
                                    className="text-white hover:bg-white/10 text-xs h-7"
                                  >
                                    <Edit className="h-3 w-3 mr-1" />
                                    Editar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeleteCard(card.id)}
                                    className="text-red-400 hover:bg-red-500/10 text-xs h-7"
                                  >
                                    <Trash2 className="h-3 w-3 mr-1" />
                                    Remover
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </TabsContent>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 dark:border-gray-800 p-4 bg-gray-50 dark:bg-gray-900/50 shrink-0">
                    <div className="flex gap-2 justify-between">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={handlePrevious}
                          disabled={isFirstTab}
                          className="h-9 bg-transparent"
                        >
                          Voltar
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        {isLastTab ? (
                          <>
                            <Button
                              variant="outline"
                              onClick={handleSaveDraft}
                              className="h-9 bg-transparent"
                            >
                              Salvar Rascunho
                            </Button>
                            <Button
                              onClick={handleSubmit}
                              className="h-9 btn-brand"
                            >
                              Criar Projeto
                            </Button>
                          </>
                        ) : (
                          <Button
                            onClick={handleNext}
                            className="h-9 btn-brand"
                          >
                            Próximo
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </Tabs>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <ClientCreateSlidePanel
        open={showCreateClient}
        onClose={() => setShowCreateClient(false)}
        onClientCreated={handleClientCreated}
      />

      <UserCreateSlidePanel
        open={showCreateManager}
        onClose={() => setShowCreateManager(false)}
        onUserCreated={handleManagerCreated}
      />

      <CompanyCreateSlidePanel
        open={showCreateCompany}
        onOpenChange={setShowCreateCompany}
        onCreate={handleCompanyCreated}
      />

      <Dialog open={customizationModal} onOpenChange={setCustomizationModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Personalizar Produto</DialogTitle>
            <DialogDescription>{productToCustomize?.name}</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Quantity Selection */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                Quantidade de Criativos
              </Label>
              <RadioGroup
                value={selectedQuantity}
                onValueChange={setSelectedQuantity}
              >
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="1" id="qty-1" />
                  <Label htmlFor="qty-1" className="flex-1 cursor-pointer">
                    1 Criativo -{" "}
                    {formatCurrency(productToCustomize?.finalPrice || 0)}
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="2" id="qty-2" />
                  <Label htmlFor="qty-2" className="flex-1 cursor-pointer">
                    2 Criativos -{" "}
                    {formatCurrency(
                      (productToCustomize?.finalPrice || 0) + 235.87,
                    )}
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="4" id="qty-4" />
                  <Label htmlFor="qty-4" className="flex-1 cursor-pointer">
                    4 Criativos -{" "}
                    {formatCurrency(
                      (productToCustomize?.finalPrice || 0) + 471.74,
                    )}
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="8" id="qty-8" />
                  <Label htmlFor="qty-8" className="flex-1 cursor-pointer">
                    8 Criativos -{" "}
                    {formatCurrency(
                      (productToCustomize?.finalPrice || 0) + 943.48,
                    )}
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Creative Type */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                Tipo de Criativo
              </Label>
              <RadioGroup
                value={selectedCreativeType}
                onValueChange={setSelectedCreativeType}
              >
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="estatica" id="type-static" />
                  <Label
                    htmlFor="type-static"
                    className="flex-1 cursor-pointer"
                  >
                    Criativo Estático - Incluído
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="carrossel" id="type-carousel" />
                  <Label
                    htmlFor="type-carousel"
                    className="flex-1 cursor-pointer"
                  >
                    Carrossel - +{formatCurrency(50)}
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="motion" id="type-motion" />
                  <Label
                    htmlFor="type-motion"
                    className="flex-1 cursor-pointer"
                  >
                    Motion/Vídeo - +{formatCurrency(100)}
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Extras */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                Extras Opcionais
              </Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <Checkbox
                    id="extra-express"
                    checked={selectedExtras.includes("expressa")}
                    onCheckedChange={() => toggleExtra("expressa")}
                  />
                  <Label
                    htmlFor="extra-express"
                    className="flex-1 cursor-pointer"
                  >
                    Entrega Expressa (48h) - +{formatCurrency(75.5)}
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <Checkbox
                    id="extra-font"
                    checked={selectedExtras.includes("fonte")}
                    onCheckedChange={() => toggleExtra("fonte")}
                  />
                  <Label htmlFor="extra-font" className="flex-1 cursor-pointer">
                    Fonte Premium - +{formatCurrency(45)}
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <Checkbox
                    id="extra-revisions"
                    checked={selectedExtras.includes("revisoes")}
                    onCheckedChange={() => toggleExtra("revisoes")}
                  />
                  <Label
                    htmlFor="extra-revisions"
                    className="flex-1 cursor-pointer"
                  >
                    Revisões Ilimitadas - +{formatCurrency(60)}
                  </Label>
                </div>
              </div>
            </div>

            {/* Total */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between text-lg font-bold">
                <span>Total:</span>
                <span className="text-2xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {formatCurrency(calculateCustomTotal())}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => setCustomizationModal(false)}
            >
              Cancelar
            </Button>
            <Button
              className="btn-brand"
              onClick={() => {
                if (productToCustomize) {
                  handleAddToCart(productToCustomize);
                }
                setCustomizationModal(false);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar ao Projeto
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ProductSelectionModal
        open={showProductModal}
        onClose={() => setShowProductModal(false)}
        onAddProducts={handleProductsFromModal}
        selectedProductIds={selectedProducts.map((p) => p.id)}
      />

      <Dialog open={showVaultDialog} onOpenChange={setShowVaultDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCredential ? "Editar Credencial" : "Nova Credencial"}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleAddCredential({
                title: formData.get("title"),
                url: formData.get("url"),
                username: formData.get("username"),
                password: formData.get("password"),
                notes: formData.get("notes"),
              });
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="title" className="text-xs">
                Título *
              </Label>
              <Input
                id="title"
                name="title"
                defaultValue={editingCredential?.title}
                placeholder="Ex: Painel Admin"
                required
                className="h-9"
              />
            </div>
            <div>
              <Label htmlFor="url" className="text-xs">
                URL/Link
              </Label>
              <Input
                id="url"
                name="url"
                type="url"
                defaultValue={editingCredential?.url}
                placeholder="https://exemplo.com"
                className="h-9"
              />
            </div>
            <div>
              <Label htmlFor="username" className="text-xs">
                Usuário/Email *
              </Label>
              <Input
                id="username"
                name="username"
                defaultValue={editingCredential?.username}
                placeholder="usuario@exemplo.com"
                required
                className="h-9"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-xs">
                Senha *
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                defaultValue={editingCredential?.password}
                placeholder="••••••••"
                required
                className="h-9"
              />
            </div>
            <div>
              <Label htmlFor="notes" className="text-xs">
                Observações
              </Label>
              <Textarea
                id="notes"
                name="notes"
                defaultValue={editingCredential?.notes}
                placeholder="Informações adicionais..."
                rows={3}
                className="resize-none text-sm"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowVaultDialog(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
              >
                {editingCredential ? "Salvar" : "Adicionar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showCardDialog} onOpenChange={setShowCardDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCard ? "Editar Cartão" : "Adicionar Cartão"}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleAddCard({
                cardNumber: formData.get("cardNumber"),
                cardHolder: formData.get("cardHolder"),
                expiryDate: formData.get("expiryDate"),
                cvv: formData.get("cvv"),
                isPrimary: false,
              });
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="cardNumber" className="text-xs">
                Número do Cartão *
              </Label>
              <Input
                id="cardNumber"
                name="cardNumber"
                defaultValue={editingCard?.cardNumber}
                placeholder="0000 0000 0000 0000"
                maxLength={19}
                required
                className="h-9 font-mono"
              />
            </div>
            <div>
              <Label htmlFor="cardHolder" className="text-xs">
                Nome do Titular *
              </Label>
              <Input
                id="cardHolder"
                name="cardHolder"
                defaultValue={editingCard?.cardHolder}
                placeholder="Nome como no cartão"
                required
                className="h-9"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="expiryDate" className="text-xs">
                  Validade *
                </Label>
                <Input
                  id="expiryDate"
                  name="expiryDate"
                  defaultValue={editingCard?.expiryDate}
                  placeholder="MM/AA"
                  maxLength={5}
                  required
                  className="h-9 font-mono"
                />
              </div>
              <div>
                <Label htmlFor="cvv" className="text-xs">
                  CVV *
                </Label>
                <Input
                  id="cvv"
                  name="cvv"
                  type="password"
                  defaultValue={editingCard?.cvv}
                  placeholder="•••"
                  maxLength={4}
                  required
                  className="h-9 font-mono"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCardDialog(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700"
              >
                {editingCard ? "Salvar" : "Adicionar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Draft Confirmation Dialog */}
      <Dialog open={showDraftConfirm} onOpenChange={setShowDraftConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Salvar como Rascunho?</DialogTitle>
            <DialogDescription>
              O projeto <strong>"{formData.name || "Novo Projeto"}"</strong>{" "}
              será salvo com os {selectedProducts.length} produto
              {selectedProducts.length !== 1 ? "s" : ""} selecionado
              {selectedProducts.length !== 1 ? "s" : ""}. Você pode continuar
              depois.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowDraftConfirm(false)}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-black text-white"
              onClick={handleConfirmDraft}
            >
              <FileEdit className="h-4 w-4 mr-2" />
              Confirmar Rascunho
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Order Review Modal */}
      <Dialog open={showReview} onOpenChange={setShowReview}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-600" />
              Revisão do Pedido
            </DialogTitle>
            <DialogDescription>
              Confirme todos os detalhes antes de finalizar
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Project info */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Dados do Projeto
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                <div>
                  <p className="text-xs text-slate-400">Projeto</p>
                  <p className="font-medium text-slate-900 truncate">
                    {formData.name || ""}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Tipo</p>
                  <p className="font-medium text-slate-900">{formLifecycle}</p>
                </div>
                {formData.client_id && (
                  <div>
                    <p className="text-xs text-slate-400">Cliente</p>
                    <p className="font-medium text-slate-900 truncate">
                      {apiClients.find(
                        (c) => String(c.id) === formData.client_id,
                      )?.name || ""}
                    </p>
                  </div>
                )}
                {formData.start_date && (
                  <div>
                    <p className="text-xs text-slate-400">Início</p>
                    <p className="font-medium text-slate-900">
                      {new Date(
                        formData.start_date + "T00:00:00",
                      ).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Products list */}
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Produtos Selecionados ({selectedProducts.length})
                </p>
              </div>
              <div className="divide-y divide-slate-100">
                {selectedProducts.map((product) => {
                  const qty =
                    productQuantities[product.id] || product.quantity || 1;
                  const lineTotal = (product.finalPrice || 0) * qty;
                  return (
                    <div
                      key={product.id}
                      className="flex items-center justify-between px-4 py-3 gap-2"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {product.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {product.category} · Qtd: {qty}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-slate-900">
                          {formatCurrency(lineTotal)}
                        </p>
                        <p className="text-xs text-slate-400">
                          unit. {formatCurrency(product.finalPrice || 0)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {selectedProducts.length === 0 && (
                  <p className="px-4 py-6 text-center text-sm text-slate-400">
                    Nenhum produto adicionado
                  </p>
                )}
              </div>
            </div>

            {/* Financial summary */}
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-2.5">
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                Resumo Financeiro
              </p>
              <div className="space-y-1.5">
                {selectedProducts.map((p) => {
                  const qty = productQuantities[p.id] || p.quantity || 1;
                  return (
                    <div
                      key={p.id}
                      className="flex justify-between text-xs text-slate-600"
                    >
                      <span className="truncate flex-1 pr-2">
                        {p.name} × {qty}
                      </span>
                      <span>{formatCurrency((p.finalPrice || 0) * qty)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-blue-200 pt-2 space-y-1.5">
                {formLifecycle === "Mensal" ? (
                  <>
                    <div className="flex justify-between text-xs text-blue-700">
                      <span>Cobranças mensais</span>
                      <span className="font-medium">
                        Dia {formBillingDay} de cada mês
                      </span>
                    </div>
                    <div className="flex justify-between text-base font-bold text-blue-900">
                      <span>Total/mês</span>
                      <span>{formatCurrency(calculateTotal())}/mês</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between text-xs text-blue-700">
                      <span>Tipo de pagamento</span>
                      <span className="font-medium">Pagamento Único</span>
                    </div>
                    <div className="flex justify-between text-base font-bold text-blue-900">
                      <span>Total</span>
                      <span>{formatCurrency(calculateTotal())}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowReview(false)}
            >
              ← Voltar ao Carrinho
            </Button>
            <Button
              disabled={selectedProducts.length === 0}
              className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
              onClick={() => {
                setShowReview(false);
                handleContinueToCheckout();
              }}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Confirmar e ir ao Checkout
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ProjectCreateSlidePanel;
