// @ts-nocheck
import type React from "react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Project, Client } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
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
  Lock,
  Key,
  Globe,
  Trash2,
  Edit,
  CreditCard,
  UserIcon,
  RefreshCw,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useSidebar } from "@/contexts/sidebar-context"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useProducts } from "@/lib/contexts/product-context"
import { CheckoutFlow, type CheckoutData } from "@/components/checkout-flow"
import type { CartItem } from "@/contexts/cart-context"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ProductSelectionModal from "./product-selection-modal" // Added import
import { Sheet, SheetContent } from "@/components/ui/sheet" // Added Sheet import

interface ProjectCreateSlidePanelProps {
  open: boolean
  onClose: () => void
  onSubmit: (project: Project) => void
  initialData?: Project
}

interface FormData {
  name: string
  description: string
  client_id: string
  manager_id: string
  status: "planning" | "active" | "on_hold" | "completed" | "cancelled" | "awaiting_payment" | "paid"
  start_date: string
  end_date: string
  budget: string
  image: string
}

interface FormErrors {
  name?: string
  client_id?: string
  manager_id?: string
}

// Define the User interface explicitly
interface User {
  id: number
  name: string
  email: string
  role: string
  created_at: string
}

export function ProjectCreateSlidePanel({ open, onClose, onSubmit, initialData }: ProjectCreateSlidePanelProps) {
  const { toast } = useToast()
  const { sidebarWidth } = useSidebar()
  const navigate = useNavigate()
  const { products } = useProducts()
  const [loading, setLoading] = useState(false)
  const [projectCreated, setProjectCreated] = useState(false)
  const [createdProject, setCreatedProject] = useState<Project | null>(null)
  const [showCatalog, setShowCatalog] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState<any[]>([])

  const [clients, setClients] = useState<Client[]>([
    { id: 1, name: "Tech Solutions LTDA", email: "contato@techsolutions.com", created_at: "2024-01-15" },
    { id: 2, name: "Digital Marketing Pro", email: "info@digitalmarketingpro.com", created_at: "2024-02-20" },
    { id: 3, name: "E-commerce Brasil", email: "comercial@ecommercebrasil.com", created_at: "2024-03-10" },
  ])

  const [users, setUsers] = useState<User[]>([
    { id: 1, name: "João Silva", email: "joao.silva@empresa.com", role: "manager", created_at: "2024-01-01" },
    { id: 2, name: "Maria Santos", email: "maria.santos@empresa.com", role: "manager", created_at: "2024-01-05" },
    { id: 3, name: "Pedro Costa", email: "pedro.costa@empresa.com", role: "manager", created_at: "2024-01-10" },
  ])
  const [errors, setErrors] = useState<FormErrors>({})

  const [showCreateClient, setShowCreateClient] = useState(false)
  const [showCreateManager, setShowCreateManager] = useState(false)
  const [newClientName, setNewClientName] = useState("")
  const [newClientEmail, setNewClientEmail] = useState("")
  const [newManagerName, setNewManagerName] = useState("")
  const [newManagerEmail, setNewManagerEmail] = useState("")

  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    client_id: "",
    manager_id: "",
    status: "planning",
    start_date: "",
    end_date: "",
    budget: "",
    image: "",
  })

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [gridLayout, setGridLayout] = useState<3 | 4 | 6>(3)

  const [showCheckout, setShowCheckout] = useState(false)
  const [productQuantities, setProductQuantities] = useState<Record<string, number>>({})

  const [customizationModal, setCustomizationModal] = useState(false)
  const [productToCustomize, setProductToCustomize] = useState<any>(null)
  const [selectedQuantity, setSelectedQuantity] = useState("1")
  const [selectedCreativeType, setSelectedCreativeType] = useState("estatica")
  const [selectedExtras, setSelectedExtras] = useState<string[]>([])

  const [clientMode, setClientMode] = useState<"existing" | "new">("existing")
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [newClient, setNewClient] = useState<Client | null>(null)

  // State for product catalog filtering
  const [productSearch, setProductSearch] = useState("")
  const [productCategory, setProductCategory] = useState("Todos")
  const [activeTab, setActiveTab] = useState("info")
  const [formLifecycle, setFormLifecycle] = useState<"Avulso" | "Mensal">("Avulso")
  const [formBillingDay, setFormBillingDay] = useState<number>(15)

  const [showProductModal, setShowProductModal] = useState(false)

  const [vaultCredentials, setVaultCredentials] = useState<
    Array<{
      id: string
      title: string
      url: string
      username: string
      password: string
      notes?: string
    }>
  >(initialData?.vault || [])

  const [paymentCards, setPaymentCards] = useState<
    Array<{
      id: string
      cardNumber: string
      cardHolder: string
      expiryDate: string
      cvv: string
      isPrimary: boolean
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
  )

  const [showVaultDialog, setShowVaultDialog] = useState(false)
  const [showCardDialog, setShowCardDialog] = useState(false)
  const [editingCredential, setEditingCredential] = useState<any>(null)
  const [editingCard, setEditingCard] = useState<any>(null)

  const tabs = ["info", "description", "products", "files", "vault", "payment"]
  const tabLabels: Record<string, string> = {
    info: "Informações",
    description: "Descrição",
    products: "Produtos",
    files: "Arquivos",
    vault: "Cofre",
    payment: "Pagamento",
  }

  const currentTabIndex = tabs.indexOf(activeTab)
  const isFirstTab = currentTabIndex === 0
  const isLastTab = currentTabIndex === tabs.length - 1

  const handleNext = () => {
    if (!isLastTab) {
      setActiveTab(tabs[currentTabIndex + 1])
    }
  }

  const handlePrevious = () => {
    if (!isFirstTab) {
      setActiveTab(tabs[currentTabIndex - 1])
    }
  }

  const handleSaveDraft = async () => {
    const draftProject = {
      ...formData,
      status: "draft" as const,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    toast({
      title: "Rascunho Salvo",
      description: "O projeto foi salvo como rascunho",
    })
    onSubmit(draftProject as any)
    onClose()
  }

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
      })
      // Initialize vault and payment states if initialData exists
      setVaultCredentials(initialData.vault || [])
      setPaymentCards(initialData.paymentCards || [])
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
      })
      // Reset vault and payment states for new project
      setVaultCredentials([])
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
      ])
    }
    setErrors({})
  }, [initialData, open])

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = "Nome do projeto é obrigatório"
    }

    if (!formData.client_id) {
      newErrors.client_id = "Cliente é obrigatório"
    }

    if (!formData.manager_id) {
      newErrors.manager_id = "Gerente é obrigatório"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    console.log("[v0] Form submitted with data:", formData)

    if (!validateForm()) {
      console.log("[v0] Validation failed:", errors)
      return
    }

    console.log("[v0] Validation passed, creating project...")
    setLoading(true)

    try {
      const projectData = {
        name: formData.name,
        description: formData.description,
        client_id: Number.parseInt(formData.client_id),
        manager_id: Number.parseInt(formData.manager_id),
        status: "awaiting-payment" as any,
        lifecycle: formLifecycle,
        billingConfig: formLifecycle === "Mensal" ? { billingDay: formBillingDay } : undefined,
        start_date: formData.start_date || undefined,
        end_date: formData.end_date || undefined,
        budget: formData.budget ? Number.parseFloat(formData.budget) : undefined,
        image: formData.image,
        // Include vault and payment data in project data
        vault: vaultCredentials,
        paymentCards: paymentCards.filter((card) => card.isPrimary), // Only save the primary card or selected cards
      }

      console.log("[v0] Project data prepared:", projectData)

      let result: Project
      if (initialData) {
        result = { ...initialData, ...projectData, id: initialData.id }
        console.log("[v0] Project updated:", result)
        toast({
          title: "Sucesso",
          description: "Projeto atualizado com sucesso",
        })
        onSubmit(result)
        onClose()
      } else {
        result = {
          id: Date.now(),
          ...projectData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        console.log("[v0] Project created:", result)
        setCreatedProject(result)
        setProjectCreated(true)
        toast({
          title: "Sucesso",
          description: "Projeto criado com sucesso",
        })
        onSubmit(result)
      }
    } catch (error) {
      console.error("[v0] Error creating project:", error)
      toast({
        title: "Erro",
        description: `Falha ao ${initialData ? "atualizar" : "criar"} projeto`,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        updateField("image", reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCreateClient = async () => {
    if (!newClientName.trim() || !newClientEmail.trim()) {
      toast({
        title: "Erro",
        description: "Nome e email são obrigatórios",
        variant: "destructive",
      })
      return
    }

    const newClientData: Omit<Client, "created_at"> = {
      id: clients.length + 1,
      name: newClientName,
      email: newClientEmail,
    }

    const newClient: Client = {
      ...newClientData,
      created_at: new Date().toISOString(),
    }

    setClients([...clients, newClient])
    updateField("client_id", newClient.id.toString())
    setNewClient(newClient)
    setClientMode("new")
    setShowCreateClient(false)
    setNewClientName("")
    setNewClientEmail("")
    toast({
      title: "Sucesso",
      description: "Cliente criado com sucesso",
    })
  }

  const handleCreateManager = async () => {
    if (!newManagerName.trim() || !newManagerEmail.trim()) {
      toast({
        title: "Erro",
        description: "Nome e email são obrigatórios",
        variant: "destructive",
      })
      return
    }

    const newManagerData: Omit<User, "created_at" | "role"> = {
      id: users.length + 1,
      name: newManagerName,
      email: newManagerEmail,
    }

    const newManager: User = {
      ...newManagerData,
      role: "manager",
      created_at: new Date().toISOString(),
    }

    setUsers([...users, newManager])
    updateField("manager_id", newManager.id.toString())
    setShowCreateManager(false)
    setNewManagerName("")
    setNewManagerEmail("")
    toast({
      title: "Sucesso",
      description: "Gerente criado com sucesso",
    })
  }

  const handleContinueToProducts = () => {
    setShowCatalog(true)
  }

  const categoryIcons: Record<string, any> = {
    "Mídias e Conteúdo": Megaphone,
    "Design Gráfico": Palette,
    Desenvolvimento: Code,
    Marketing: TrendingUp,
    Conteúdo: FileText,
    Vídeo: Video,
  }

  const allCategories = Array.from(new Set(products.map((p) => p.category)))

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
  ]

  const filteredProducts = products.filter((product) => {
    if (!product.isActive) return false
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory =
      selectedCategory === "all" || product.category.toLowerCase().replace(/\s+/g, "-") === selectedCategory
    return matchesSearch && matchesCategory
  })

  const formatCurrency = (value: number | undefined | null) => {
    if (value === undefined || value === null) return "R$ 0,00"
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  const handleAddProductToProject = (product: any) => {
    const existingProduct = selectedProducts.find((p) => p.id === product.id)
    if (!existingProduct) {
      setSelectedProducts((prev) => [...prev, { ...product, quantity: 1, customizations: {} }])
      setProductQuantities((prev) => ({ ...prev, [product.id]: 1 }))
      toast({
        title: "Produto Adicionado",
        description: `${product.name} foi adicionado ao projeto`,
      })
    } else {
      handleIncreaseQuantity(product.id)
    }
  }

  const handleRemoveProductFromProject = (productId: string) => {
    setSelectedProducts((prev) => prev.filter((p) => p.id !== productId))
    setProductQuantities((prev) => {
      const newState = { ...prev }
      delete newState[productId]
      return newState
    })
  }

  const handleIncreaseQuantity = (productId: string) => {
    setProductQuantities((prev) => {
      const currentQty = prev[productId] || 1
      return { ...prev, [productId]: currentQty + 1 }
    })
    setSelectedProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, quantity: (p.quantity || 1) + 1 } : p)))
  }

  const handleDecreaseQuantity = (productId: string) => {
    const currentQty = productQuantities[productId] || 1
    if (currentQty > 1) {
      setProductQuantities((prev) => ({
        ...prev,
        [productId]: currentQty - 1, // Corrected: Use productId as key
      }))
      setSelectedProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, quantity: currentQty - 1 } : p)))
    } else {
      handleRemoveProductFromProject(productId)
    }
  }

  const handleCustomizeProduct = (product: any) => {
    setProductToCustomize(product)
    setSelectedQuantity("1")
    setSelectedCreativeType("estatica")
    setSelectedExtras([])
    setCustomizationModal(true)
  }

  const handleContinueToCheckout = () => {
    if (selectedProducts.length === 0) {
      toast({
        title: "Atenção",
        description: "Adicione pelo menos um produto antes de continuar",
        variant: "destructive",
      })
      return
    }
    setShowCheckout(true)
  }

  const handleCheckoutComplete = (checkoutData: CheckoutData) => {
    console.log("[v0] Checkout completed:", checkoutData)

    // Create project with "awaiting_payment" status
    const finalProject = {
      ...createdProject!, // This should be guaranteed to be non-null if we reached here after creation
      status: "awaiting_payment",
      products: selectedProducts,
      checkoutData,
    }

    toast({
      title: "Contratação Finalizada!",
      description: "Aguardando confirmação de pagamento...",
    })

    // Simulate payment confirmation after 3 seconds
    setTimeout(() => {
      const paidProject = {
        ...finalProject,
        status: "paid",
        // Auto-generate tasks and stages from products
        tasks: generateTasksFromProducts(selectedProducts),
      }

      onSubmit(paidProject)
      toast({
        title: "Pagamento Confirmado!",
        description: "Tarefas e etapas foram criadas automaticamente",
      })

      onClose()
      setShowCatalog(false)
      setShowCheckout(false)
      setSelectedProducts([])
    }, 3000)
  }

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
        { id: `stage-1-${index}-${Date.now()}`, name: "Briefing e Planejamento", status: "pending", order: 1 },
        { id: `stage-2-${index}-${Date.now()}`, name: "Desenvolvimento", status: "pending", order: 2 },
        { id: `stage-3-${index}-${Date.now()}`, name: "Revisão", status: "pending", order: 3 },
        { id: `stage-4-${index}-${Date.now()}`, name: "Entrega Final", status: "pending", order: 4 },
      ],
    }))
  }

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
    }))
  }

  const handleFinishAndClose = () => {
    if (createdProject) {
      const projectWithProducts = {
        ...createdProject,
        products: selectedProducts,
      }
      onSubmit(projectWithProducts)
    }
    onClose()
    setShowCatalog(false)
    setSelectedProducts([])
  }

  const getGridClasses = () => {
    switch (gridLayout) {
      case 3:
        return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
      case 4:
        return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
      case 6:
        return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
      default:
        return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
    }
  }

  const getCategoryIcon = (category: string) => {
    return categoryIcons[category] || Package
  }

  const handleViewProject = (project: Project) => {
    navigate(`/projects/${project.id}`)
  }

  useEffect(() => {
    if (!open) {
      setProjectCreated(false)
      setCreatedProject(null)
      setShowCatalog(false)
      setShowCheckout(false)
      setSelectedProducts([])
      setProductQuantities({})
      setClientMode("existing")
      setSelectedClient(null)
      setNewClient(null)
      setActiveTab("info") // Reset active tab
      setProductSearch("") // Reset search term
      setProductCategory("Todos") // Reset category filter
      // Reset product modal state
      setShowProductModal(false)
      // Reset vault and card dialog states
      setShowVaultDialog(false)
      setShowCardDialog(false)
      setEditingCredential(null)
      setEditingCard(null)
    }
  }, [open])

  const calculateCustomTotal = () => {
    let total = productToCustomize ? productToCustomize.finalPrice : 0

    // These values seem hardcoded and might need adjustment based on actual product pricing logic
    if (selectedQuantity === "2") total += 235.87
    if (selectedQuantity === "4") total += 471.74
    if (selectedQuantity === "8") total += 943.48

    if (selectedCreativeType === "carrossel") total += 50
    if (selectedCreativeType === "motion") total += 100

    if (selectedExtras.includes("expressa")) total += 75.5
    if (selectedExtras.includes("fonte")) total += 45
    if (selectedExtras.includes("revisoes")) total += 60

    return total
  }

  const toggleExtra = (extra: string) => {
    if (selectedExtras.includes(extra)) {
      setSelectedExtras((prev) => prev.filter((e) => e !== extra))
    } else {
      setSelectedExtras((prev) => [...prev, extra])
    }
  }

  const handleAddToCart = (product: any) => {
    const quantity = Number.parseInt(selectedQuantity)
    const creativeType = selectedCreativeType
    const extras = selectedExtras

    // Map customizations to the product structure
    const customizations = {
      creativeType,
      extras,
      // Add other relevant customization data if needed
    }

    const existingProduct = selectedProducts.find((p) => p.id === product.id)

    if (!existingProduct) {
      setSelectedProducts((prev) => [
        ...prev,
        {
          ...product,
          quantity: quantity,
          customizations: customizations,
        },
      ])
      setProductQuantities((prev) => ({ ...prev, [product.id]: quantity }))

      toast({
        title: "Produto Adicionado",
        description: `${product.name} foi adicionado ao projeto`,
      })
    } else {
      // If product already exists, update its quantity and customizations
      setSelectedProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, quantity: quantity, customizations: customizations } : p)),
      )
      setProductQuantities((prev) => ({ ...prev, [product.id]: quantity }))
      toast({
        title: "Produto Atualizado",
        description: `${product.name} teve suas personalizações e quantidade atualizadas`,
      })
    }
  }

  const calculateTotal = () => {
    return selectedProducts.reduce((sum, product) => {
      const price = product.finalPrice || 0
      const quantity = product.quantity || 1
      return sum + price * quantity
    }, 0)
  }

  // Filtered products for the catalog
  const filteredCatalogProducts = products.filter((product) => {
    if (!product.isActive) return false
    const matchesSearch =
      product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      product.description.toLowerCase().includes(productSearch.toLowerCase())
    const matchesCategory = productCategory === "Todos" || product.category === productCategory
    return matchesSearch && matchesCategory
  })

  const handleAddProductsFromModal = (products: any[]) => {
    const newProducts = products.filter((p) => !selectedProducts.find((sp) => sp.id === p.id))
    setSelectedProducts([...selectedProducts, ...newProducts])
    newProducts.forEach((p) => {
      if (!(p.id in productQuantities)) {
        productQuantities[p.id] = 1
      }
    })
  }

  const handleAddCredential = (credential: any) => {
    if (editingCredential) {
      setVaultCredentials(
        vaultCredentials.map((c) => (c.id === editingCredential.id ? { ...credential, id: c.id } : c)),
      )
    } else {
      setVaultCredentials([...vaultCredentials, { ...credential, id: Date.now().toString() }])
    }
    setShowVaultDialog(false)
    setEditingCredential(null)
  }

  const handleDeleteCredential = (id: string) => {
    setVaultCredentials(vaultCredentials.filter((c) => c.id !== id))
  }

  const handleAddCard = (card: any) => {
    if (editingCard) {
      setPaymentCards(paymentCards.map((c) => (c.id === editingCard.id ? { ...card, id: c.id } : c)))
    } else {
      setPaymentCards([...paymentCards, { ...card, id: Date.now().toString() }])
    }
    setShowCardDialog(false)
    setEditingCard(null)
  }

  const handleDeleteCard = (id: string) => {
    setPaymentCards(paymentCards.filter((c) => c.id !== id))
  }

  const handleSetPrimaryCard = (id: string) => {
    setPaymentCards(paymentCards.map((c) => ({ ...c, isPrimary: c.id === id })))
  }

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]) // Assuming this state is needed for files tab

  return (
    <>
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent
          side="right"
          className="!w-auto !max-w-none p-0 border-0"
          hideOverlay={true}
          style={{
            width: `calc(100vw - ${sidebarWidth}px)`,
            maxWidth: `calc(100vw - ${sidebarWidth}px)`,
          }}
        >
          {console.log("[v0] ProjectCreateSlidePanel sidebarWidth:", sidebarWidth)}
          <div
            className={cn(
              "h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-gray-200 dark:border-gray-800",
            )}
          >
            {showCheckout ? (
              <>
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-green-50/50 via-emerald-50/30 to-teal-50/50 dark:from-green-950/20 dark:via-emerald-950/10 dark:to-teal-950/20">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg shadow-lg">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white">Finalizar Contratação</h2>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Complete o pedido dos produtos</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="shrink-0 h-8 w-8 hover:bg-white/50 dark:hover:bg-gray-800"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto">
                  <CheckoutFlow
                    items={convertProductsToCartItems()}
                    onBack={() => setShowCheckout(false)}
                    onComplete={handleCheckoutComplete}
                    preselectedClient={clientMode === "existing" ? selectedClient : newClient}
                    preselectedProject={createdProject}
                  />
                </div>
              </>
            ) : showCatalog ? (
              <>
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-purple-50/50 via-blue-50/30 to-pink-50/50 dark:from-purple-950/20 dark:via-blue-950/10 dark:to-pink-950/20">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg shadow-lg">
                      <ShoppingCart className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white">Contratar Produtos</h2>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {selectedProducts.length} produto{selectedProducts.length !== 1 ? "s" : ""} selecionado
                        {selectedProducts.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowCatalog(false)}
                    className="shrink-0 h-8 w-8 hover:bg-white/50 dark:hover:bg-gray-800"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto">
                  <div className="p-4 space-y-4">
                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Buscar produtos..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className="pl-9 h-9"
                      />
                    </div>

                    {/* Category Filter - Made compact */}
                    <div className="flex gap-2 flex-wrap">
                      {["Todos", "Design", "Desenvolvimento", "Marketing", "Consultoria"].map((cat) => (
                        <Button
                          key={cat}
                          variant={productCategory === cat ? "default" : "outline"}
                          size="sm"
                          onClick={() => setProductCategory(cat)}
                          className="h-7 text-xs"
                        >
                          {cat}
                        </Button>
                      ))}
                    </div>

                    {/* Products Grid - Made more compact */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {filteredCatalogProducts.map((product) => {
                        const selectedProduct = selectedProducts.find((p) => p.id === product.id)
                        const isSelected = !!selectedProduct
                        const quantity = productQuantities[product.id] || 1
                        const CategoryIcon = getCategoryIcon(product.category)

                        return (
                          <Card
                            key={product.id}
                            className={cn(
                              "border-0 shadow-sm hover:shadow-md transition-all duration-200 group bg-white flex flex-col overflow-hidden",
                              isSelected && "ring-2 ring-green-500",
                            )}
                          >
                            <div className="relative h-48 bg-gradient-to-br from-blue-50 to-purple-50 overflow-hidden">
                              {product.image ? (
                                <img
                                  src={product.image || "/placeholder.svg"}
                                  alt={product.name}
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                />
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="bg-gradient-to-r from-blue-100 to-purple-100 p-8 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                                    <CategoryIcon className="h-16 w-16 text-blue-600" />
                                  </div>
                                </div>
                              )}
                              {isSelected && (
                                <Badge className="absolute top-3 right-3 bg-green-500 text-white">
                                  <Check className="h-3 w-3 mr-1" />
                                  Adicionado
                                </Badge>
                              )}
                            </div>

                            <CardHeader className="pb-3">
                              <CardTitle className="text-sm group-hover:text-blue-600 transition-colors line-clamp-2">
                                {product.name}
                              </CardTitle>
                            </CardHeader>

                            <CardContent className="space-y-3 flex-1 flex flex-col">
                              <p className="text-xs text-gray-600 line-clamp-2">{product.description}</p>

                              <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                                <div className="flex items-center space-x-1 text-yellow-500">
                                  <Star className="h-3 w-3 fill-current" />
                                  <span className="font-medium text-gray-900">5.0</span>
                                </div>
                                {product.deliveryDays && (
                                  <div className="flex items-center space-x-1 text-gray-600">
                                    <Clock className="h-3 w-3" />
                                    <span>{product.deliveryDays} dias</span>
                                  </div>
                                )}
                              </div>

                              <div className="pt-3 border-t mt-auto space-y-2">
                                <p className="text-xs text-gray-500 mb-1">Preço final</p>
                                <p className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                                  {formatCurrency(product.finalPrice * (isSelected ? quantity : 1))}
                                </p>

                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full text-xs mb-2 bg-transparent"
                                  onClick={() => handleCustomizeProduct(product)}
                                >
                                  <Palette className="h-3 w-3 mr-1" />
                                  Personalizar
                                </Button>

                                {isSelected ? (
                                  <>
                                    <div className="flex items-center justify-between gap-2 mb-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 px-2 bg-transparent"
                                        onClick={() => handleDecreaseQuantity(product.id)}
                                      >
                                        <Minus className="h-3 w-3" />
                                      </Button>
                                      <span className="text-sm font-semibold px-3">{quantity}</span>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 px-2 bg-transparent"
                                        onClick={() => handleIncreaseQuantity(product.id)}
                                      >
                                        <Plus className="h-3 w-3" />
                                      </Button>
                                    </div>

                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="w-full text-red-600 hover:bg-red-50 border-red-200 text-xs bg-transparent"
                                      onClick={() => handleRemoveProductFromProject(product.id)}
                                    >
                                      <Minus className="h-3 w-3 mr-1" />
                                      Remover do Projeto
                                    </Button>
                                  </>
                                ) : (
                                  <Button
                                    size="sm"
                                    className="w-full btn-brand"
                                    onClick={() => handleAddProductToProject(product)}
                                  >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Adicionar ao Projeto
                                  </Button>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Footer - Made compact */}
                <div className="border-t border-gray-200 dark:border-gray-800 p-4 bg-gray-50 dark:bg-gray-900/50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Selecionado:</span>
                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                      {formatCurrency(calculateTotal())}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowCatalog(false)} className="flex-1 h-9">
                      Voltar
                    </Button>
                    <Button
                      onClick={handleContinueToCheckout}
                      disabled={selectedProducts.length === 0}
                      className="flex-1 h-9 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    >
                      Continuar ({selectedProducts.length})
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Main Form - Made header compact */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-blue-50/50 via-purple-50/30 to-pink-50/50 dark:from-blue-950/20 dark:via-purple-950/10 dark:to-pink-950/20">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg shadow-lg">
                      <Briefcase className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white">Criar Novo Projeto</h2>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Preencha as informações do projeto</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="shrink-0 h-8 w-8 hover:bg-white/50 dark:hover:bg-gray-800"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Tabs - Made compact */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
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
                            transform: activeTab === tab ? "translateY(0)" : "translateY(2px)",
                            boxShadow:
                              activeTab === tab
                                ? "0 -2px 8px rgba(59, 130, 246, 0.3), inset 0 -1px 0 rgba(255,255,255,0.3)"
                                : "0 1px 3px rgba(0,0,0,0.1)",
                            clipPath: "polygon(8% 0%, 100% 0%, 92% 100%, 0% 100%)",
                            marginLeft: index > 0 ? "-12px" : "0",
                            zIndex: activeTab === tab ? 10 : tabs.length - index,
                          }}
                        >
                          <span className="relative z-10">{tabLabels[tab]}</span>
                          {activeTab === tab && (
                            <div
                              className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-50"
                              style={{ clipPath: "polygon(0 0, 100% 0, 100% 50%, 0 100%)" }}
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
                                <AvatarImage src={formData.image || "/placeholder.svg"} alt="Project" />
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
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">PNG, JPG até 5MB</p>
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
                                Nome do Projeto <span className="text-red-500">*</span>
                              </Label>
                              <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => updateField("name", e.target.value)}
                                className="h-9 bg-white dark:bg-gray-900 border-green-200 dark:border-green-800"
                                placeholder="Ex: Website Institucional"
                              />
                              {errors.name && <p className="text-xs text-red-500 font-medium">{errors.name}</p>}
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
                                  onChange={(e) => updateField("start_date", e.target.value)}
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
                                  onChange={(e) => updateField("end_date", e.target.value)}
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
                                onChange={(e) => updateField("budget", e.target.value)}
                                className="h-9 bg-white dark:bg-gray-900 border-green-200 dark:border-green-800"
                                placeholder="R$ 0,00"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold text-green-900 dark:text-green-100">
                                Tipo de Projeto
                              </Label>
                              <div className="flex gap-2">
                                {(["Avulso", "Mensal"] as const).map((lc) => (
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
                                    {lc === "Mensal" && <RefreshCw className="h-3 w-3" />}
                                    {lc}
                                  </button>
                                ))}
                              </div>
                            </div>
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
                                    onChange={e => setFormBillingDay(Math.min(28, Math.max(1, parseInt(e.target.value) || 1)))}
                                    className="h-9 w-20 bg-white dark:bg-gray-900 border-green-200 dark:border-green-800"
                                  />
                                  <span className="text-xs text-slate-500">de cada mês</span>
                                </div>
                              </div>
                            )}
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
                                Selecione o Cliente <span className="text-red-500">*</span>
                              </Label>
                              <div className="flex gap-2">
                                <Select
                                  value={formData.client_id}
                                  onValueChange={(value) => {
                                    updateField("client_id", value)
                                    const client = clients.find((c) => c.id.toString() === value)
                                    if (client) {
                                      setSelectedClient(client)
                                      setClientMode("existing")
                                    }
                                  }}
                                >
                                  <SelectTrigger className="flex-1 h-9 bg-white dark:bg-gray-900 border-purple-200 dark:border-purple-800">
                                    <SelectValue placeholder="Selecione um cliente" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {clients.map((client) => (
                                      <SelectItem key={client.id} value={client.id.toString()}>
                                        {client.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() => setShowCreateClient(true)}
                                  className="h-9 w-9 shrink-0 border-purple-200 dark:border-purple-800"
                                >
                                  <UserPlus className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                </Button>
                              </div>
                              {errors.client_id && (
                                <p className="text-xs text-red-500 font-medium">{errors.client_id}</p>
                              )}
                            </div>

                            <div className="space-y-1.5">
                              <Label
                                htmlFor="manager_id"
                                className="text-xs font-semibold flex items-center gap-1 text-purple-900 dark:text-purple-100"
                              >
                                Gerente do Projeto <span className="text-red-500">*</span>
                              </Label>
                              <div className="flex gap-2">
                                <Select
                                  value={formData.manager_id}
                                  onValueChange={(value) => updateField("manager_id", value)}
                                >
                                  <SelectTrigger className="flex-1 h-9 bg-white dark:bg-gray-900 border-purple-200 dark:border-purple-800">
                                    <SelectValue placeholder="Selecione um gerente" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {users.map((user) => (
                                      <SelectItem key={user.id} value={user.id.toString()}>
                                        {user.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() => setShowCreateManager(true)}
                                  className="h-9 w-9 shrink-0 border-purple-200 dark:border-purple-800"
                                >
                                  <UserPlus className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                </Button>
                              </div>
                              {errors.manager_id && (
                                <p className="text-xs text-red-500 font-medium">{errors.manager_id}</p>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </TabsContent>

                      <TabsContent value="description" className="mt-0 space-y-4">
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
                                onChange={(e) => updateField("description", e.target.value)}
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
                                <CardTitle className="text-base">Produtos e Serviços</CardTitle>
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
                                  const quantity = productQuantities[product.id] || 1
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
                                                src={product.image || "/placeholder.svg"}
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
                                                  onClick={() => handleDecreaseQuantity(product.id)}
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
                                                  onClick={() => handleIncreaseQuantity(product.id)}
                                                >
                                                  <Plus className="h-3 w-3" />
                                                </Button>
                                              </div>
                                              <div className="text-sm font-bold text-purple-600 dark:text-purple-400">
                                                {formatCurrency(product.finalPrice * quantity)}
                                              </div>
                                            </div>
                                          </div>
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => handleRemoveProductFromProject(product.id)}
                                          >
                                            <X className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  )
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
                                Faça upload de documentos, imagens e arquivos relacionados
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
                                  <p className="text-xs text-gray-500">Suporta PDF, DOC, PNG, JPG (máx. 50MB)</p>
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
                                        <p className="text-sm font-medium text-gray-900">{file.name}</p>
                                        <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
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
                                <p className="text-xs text-gray-600">Armazene acessos e senhas com segurança</p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => {
                                setEditingCredential(null)
                                setShowVaultDialog(true)
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
                                <p className="text-sm text-gray-600 mb-1">Nenhuma credencial cadastrada</p>
                                <p className="text-xs text-gray-500">Adicione acessos para gerenciar no projeto</p>
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
                                        <h4 className="text-sm font-semibold text-gray-900 mb-1">{credential.title}</h4>
                                        <div className="space-y-1">
                                          <p className="text-xs text-gray-600 flex items-center gap-2">
                                            <Globe className="h-3 w-3" />
                                            {credential.url}
                                          </p>
                                          <p className="text-xs text-gray-600 flex items-center gap-2">
                                            <UserIcon className="h-3 w-3" /> {/* Updated to use UserIcon */}
                                            {credential.username}
                                          </p>
                                          <p className="text-xs text-gray-600 flex items-center gap-2">
                                            <Lock className="h-3 w-3" />
                                            ••••••••
                                          </p>
                                          {credential.notes && (
                                            <p className="text-xs text-gray-500 mt-2">{credential.notes}</p>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          setEditingCredential(credential)
                                          setShowVaultDialog(true)
                                        }}
                                        className="h-8 w-8 p-0 hover:bg-emerald-50 hover:text-emerald-700"
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleDeleteCredential(credential.id)}
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
                                <p className="text-xs text-gray-600">Gerencie os cartões de crédito do projeto</p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => {
                                setEditingCard(null)
                                setShowCardDialog(true)
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
                                  card.isPrimary ? "ring-2 ring-violet-500 ring-offset-2" : ""
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
                                    <p className="text-xs text-gray-400 mb-1">Número do Cartão</p>
                                    <p className="text-lg font-mono tracking-wider">{card.cardNumber}</p>
                                  </div>
                                  <CreditCard className="h-8 w-8 text-gray-400" />
                                </div>
                                <div className="flex items-end justify-between">
                                  <div className="space-y-2">
                                    <div>
                                      <p className="text-xs text-gray-400">Titular</p>
                                      <p className="text-sm font-semibold">{card.cardHolder}</p>
                                    </div>
                                  </div>
                                  <div className="text-right space-y-2">
                                    <div>
                                      <p className="text-xs text-gray-400">Validade</p>
                                      <p className="text-sm font-semibold">{card.expiryDate}</p>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-600">
                                  {!card.isPrimary && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleSetPrimaryCard(card.id)}
                                      className="text-white hover:bg-white/10 text-xs h-7"
                                    >
                                      Tornar Principal
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setEditingCard(card)
                                      setShowCardDialog(true)
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

                  <div className="border-t border-gray-200 dark:border-gray-800 p-4 bg-gray-50 dark:bg-gray-900/50">
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
                            <Button variant="outline" onClick={handleSaveDraft} className="h-9 bg-transparent">
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

      <Dialog open={showCreateClient} onOpenChange={setShowCreateClient}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Novo Cliente</DialogTitle>
            <DialogDescription>Preencha os dados do novo cliente</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-client-name">Nome do Cliente *</Label>
              <Input
                id="new-client-name"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                placeholder="Ex: Empresa ABC"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-client-email">Email *</Label>
              <Input
                id="new-client-email"
                type="email"
                value={newClientEmail}
                onChange={(e) => setNewClientEmail(e.target.value)}
                placeholder="contato@empresa.com"
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setShowCreateClient(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateClient}>Criar Cliente</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateManager} onOpenChange={setShowCreateManager}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Novo Gerente</DialogTitle>
            <DialogDescription>Preencha os dados do novo gerente</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-manager-name">Nome do Gerente *</Label>
              <Input
                id="new-manager-name"
                value={newManagerName}
                onChange={(e) => setNewManagerName(e.target.value)}
                placeholder="Ex: João Silva"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-manager-email">Email *</Label>
              <Input
                id="new-manager-email"
                type="email"
                value={newManagerEmail}
                onChange={(e) => setNewManagerEmail(e.target.value)}
                placeholder="joao@empresa.com"
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setShowCreateManager(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateManager}>Criar Gerente</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={customizationModal} onOpenChange={setCustomizationModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Personalizar Produto</DialogTitle>
            <DialogDescription>{productToCustomize?.name}</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Quantity Selection */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Quantidade de Criativos</Label>
              <RadioGroup value={selectedQuantity} onValueChange={setSelectedQuantity}>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="1" id="qty-1" />
                  <Label htmlFor="qty-1" className="flex-1 cursor-pointer">
                    1 Criativo - {formatCurrency(productToCustomize?.finalPrice || 0)}
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="2" id="qty-2" />
                  <Label htmlFor="qty-2" className="flex-1 cursor-pointer">
                    2 Criativos - {formatCurrency((productToCustomize?.finalPrice || 0) + 235.87)}
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="4" id="qty-4" />
                  <Label htmlFor="qty-4" className="flex-1 cursor-pointer">
                    4 Criativos - {formatCurrency((productToCustomize?.finalPrice || 0) + 471.74)}
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="8" id="qty-8" />
                  <Label htmlFor="qty-8" className="flex-1 cursor-pointer">
                    8 Criativos - {formatCurrency((productToCustomize?.finalPrice || 0) + 943.48)}
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Creative Type */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Tipo de Criativo</Label>
              <RadioGroup value={selectedCreativeType} onValueChange={setSelectedCreativeType}>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="estatica" id="type-static" />
                  <Label htmlFor="type-static" className="flex-1 cursor-pointer">
                    Criativo Estático - Incluído
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="carrossel" id="type-carousel" />
                  <Label htmlFor="type-carousel" className="flex-1 cursor-pointer">
                    Carrossel - +{formatCurrency(50)}
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="motion" id="type-motion" />
                  <Label htmlFor="type-motion" className="flex-1 cursor-pointer">
                    Motion/Vídeo - +{formatCurrency(100)}
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Extras */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Extras Opcionais</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <Checkbox
                    id="extra-express"
                    checked={selectedExtras.includes("expressa")}
                    onCheckedChange={() => toggleExtra("expressa")}
                  />
                  <Label htmlFor="extra-express" className="flex-1 cursor-pointer">
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
                  <Label htmlFor="extra-revisions" className="flex-1 cursor-pointer">
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
            <Button variant="outline" onClick={() => setCustomizationModal(false)}>
              Cancelar
            </Button>
            <Button
              className="btn-brand"
              onClick={() => {
                if (productToCustomize) {
                  handleAddToCart(productToCustomize)
                }
                setCustomizationModal(false)
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
        onAddProducts={handleAddProductsFromModal}
        selectedProductIds={selectedProducts.map((p) => p.id)}
      />

      <Dialog open={showVaultDialog} onOpenChange={setShowVaultDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCredential ? "Editar Credencial" : "Nova Credencial"}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.currentTarget)
              handleAddCredential({
                title: formData.get("title"),
                url: formData.get("url"),
                username: formData.get("username"),
                password: formData.get("password"),
                notes: formData.get("notes"),
              })
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
              <Button type="button" variant="outline" onClick={() => setShowVaultDialog(false)} className="flex-1">
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
            <DialogTitle>{editingCard ? "Editar Cartão" : "Adicionar Cartão"}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.currentTarget)
              handleAddCard({
                cardNumber: formData.get("cardNumber"),
                cardHolder: formData.get("cardHolder"),
                expiryDate: formData.get("expiryDate"),
                cvv: formData.get("cvv"),
                isPrimary: false,
              })
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
              <Button type="button" variant="outline" onClick={() => setShowCardDialog(false)} className="flex-1">
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
    </>
  )
}

export default ProjectCreateSlidePanel
